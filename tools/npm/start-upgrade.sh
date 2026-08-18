#!/bin/bash
# Dispatch the npm-upgrade workflow for one ticket.
#
# Usage:
#   start-upgrade.sh EUDPA-XXXXX --phase 1|2|3 [--repo R ...] [--strategy LEVEL]
#
# Phase semantics (no FRESH/RESUME dual-state — every invocation is
# fresh; consumers idempotently merge into prior packages.{repo}.json):
#
#   --phase 1  Run `discover-upgrades.sh` for every requested repo,
#              then emit a JSON manifest on stdout listing every
#              package that still has classification=null. The caller
#              fans out one PACKAGE_PLANNER subagent per manifest
#              entry. After workers finish, the caller runs
#              `verify-classification-coverage.sh` as the gate.
#
#   --phase 2  Spawn `run-automated-upgrades.sh` per repo in
#              parallel (background tasks), aggregate exit codes,
#              emit a JSON status summary on stdout. Cascade-failure
#              (exit 1 from any repo runner) propagates back.
#
#   --phase 3  Emit a JSON handoff manifest of every manual (or
#              failed-auto) package — the WALKER consumes it.
#
# All cross-phase state lives in
# `~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/packages.{repo}.json`.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DEFAULT_REPOS=(
    trade-imports-animals-frontend
    trade-imports-animals-backend
    trade-imports-animals-tests
    trade-imports-animals-admin
)

TICKET=""
PHASE=""
STRATEGY="latest"
REPOS=()

usage() {
    cat <<EOF >&2
Usage: $0 EUDPA-XXXXX --phase 1|2|3 [--repo R [--repo R ...]] [--strategy latest|minor|patch]

Without --repo, runs against all 4 EUDP Live Animals Node repos.
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --phase) PHASE="$2"; shift 2 ;;
        --repo) REPOS+=("$2"); shift 2 ;;
        --strategy) STRATEGY="$2"; shift 2 ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$TICKET" ]] && usage
[[ -z "$PHASE" ]] && usage

[[ "${#REPOS[@]}" -eq 0 ]] && REPOS=("${DEFAULT_REPOS[@]}")

WORKSPACE_BASE="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$TICKET"
REPO_BASE="$HOME/git/defra/trade-imports-workspace/repos"

phase1() {
    mkdir -p "$WORKSPACE_BASE"

    # Discover each repo. Each call writes packages.{repo}.json
    # idempotently (merges with prior state).
    for repo in "${REPOS[@]}"; do
        local repo_path="$REPO_BASE/$repo"
        if [[ ! -d "$repo_path" ]]; then
            echo "Repo dir missing, skipping: $repo_path" >&2
            continue
        fi
        echo "Discovering $repo..." >&2
        "$SCRIPT_DIR/discover-upgrades.sh" \
            "$repo_path" \
            --run-id "$TICKET" \
            --strategy "$STRATEGY" \
            >/dev/null
    done

    # Per-repo best-practices bundle (one file per repo). Cheap and
    # depends only on local files.
    if [[ -x "$SCRIPT_DIR/bake-best-practices.sh" ]]; then
        for repo in "${REPOS[@]}"; do
            "$SCRIPT_DIR/bake-best-practices.sh" --run-id "$TICKET" --repo "$repo" \
                >/dev/null 2>&1 || true
        done
    fi

    # Per-package pre-bake (best-effort; sets context_baked +
    # context_missing on each package row). Worker hydrates missing
    # pieces via WebFetch / Grep at spawn time.
    if [[ -x "$SCRIPT_DIR/prebake-context.sh" ]]; then
        echo "Pre-baking per-package context..." >&2
        for repo in "${REPOS[@]}"; do
            local pkgs_file="$WORKSPACE_BASE/$repo/packages.${repo}.json"
            [[ -f "$pkgs_file" ]] || continue
            while IFS= read -r pkg; do
                [[ -z "$pkg" ]] && continue
                "$SCRIPT_DIR/prebake-context.sh" \
                    --run-id "$TICKET" \
                    --repo "$repo" \
                    --package "$pkg" \
                    >/dev/null 2>&1 || true
            done < <(jq -r '.packages[] | select(.classification == null) | .package' "$pkgs_file")
        done
    fi

    # Emit the spawn manifest. One JSON object per line: each is a
    # complete PACKAGE_PLANNER spawn task.
    echo "MANIFEST_BEGIN"
    for repo in "${REPOS[@]}"; do
        local pkgs_file="$WORKSPACE_BASE/$repo/packages.${repo}.json"
        [[ -f "$pkgs_file" ]] || continue
        jq -c \
            --arg ticket "$TICKET" \
            --arg repo "$repo" \
            '.packages[]
             | select(.classification == null)
             | {
                 ticket: $ticket,
                 repo: $repo,
                 package: .package,
                 current: .current,
                 target: .target,
                 upgrade_type: .upgrade_type,
                 dependency_type: .dependency_type,
                 context_baked: .context_baked,
                 context_missing: .context_missing
               }' "$pkgs_file"
    done
    echo "MANIFEST_END"

    echo >&2
    echo "Phase 1 setup complete. Spawn one PACKAGE_PLANNER per MANIFEST entry," >&2
    echo "then run: ~/git/defra/trade-imports-workspace/tools/npm/verify-classification-coverage.sh --run-id $TICKET" >&2
}

phase2() {
    # Fold any leftover PACKAGE_PLANNER classification fragments into
    # the canonical packages.{repo}.json before reading state.
    "$SCRIPT_DIR/packages-aggregate-classifications.sh" --run-id "$TICKET" >&2 || true

    # Pre-flight: any auto packages left to run?
    local auto_pending
    auto_pending=$("$SCRIPT_DIR/packages-list.sh" \
        --run-id "$TICKET" \
        --classification auto \
        --status pending \
        --json | jq 'length')

    if [[ "$auto_pending" -eq 0 ]]; then
        echo '{"status":"nothing_to_do","cascade_failures":[],"per_repo":[]}'
        echo "No auto-classified packages awaiting upgrade." >&2
        return 0
    fi

    # Fan out per-repo runners. Run sequentially per repo (so the
    # internal --no-discover / sequential-package loop is honoured),
    # but each repo runs in parallel via background subshells.
    local tmpdir
    tmpdir=$(mktemp -d)
    trap "rm -rf $tmpdir" RETURN

    local pids=()
    for repo in "${REPOS[@]}"; do
        # Skip repos that have no auto packages.
        local pkgs_file="$WORKSPACE_BASE/$repo/packages.${repo}.json"
        [[ -f "$pkgs_file" ]] || continue
        local repo_auto
        repo_auto=$(jq '[.packages[] | select(.classification=="auto" and (.implementation_status == null or .implementation_status == "todo"))] | length' "$pkgs_file")
        [[ "$repo_auto" -eq 0 ]] && continue

        (
            "$SCRIPT_DIR/run-automated-upgrades.sh" "$repo" --run-id "$TICKET" \
                >"$tmpdir/$repo.log" 2>&1
            echo "$?" > "$tmpdir/$repo.exit"
        ) &
        pids+=("$!:$repo")
    done

    # Reap.
    local cascade=()
    local per_repo='[]'
    for entry in "${pids[@]}"; do
        local pid="${entry%%:*}"
        local repo="${entry#*:}"
        wait "$pid" || true
        local code
        code=$(cat "$tmpdir/$repo.exit" 2>/dev/null || echo "127")
        if [[ "$code" == "1" ]]; then
            cascade+=("$repo")
        fi
        per_repo=$(jq -nc \
            --argjson p "$per_repo" \
            --arg repo "$repo" \
            --argjson code "$code" \
            '$p + [{repo: $repo, exit_code: $code}]')
    done

    local status="ok"
    [[ "${#cascade[@]}" -gt 0 ]] && status="cascade_failure"

    jq -nc \
        --arg status "$status" \
        --argjson cascade "$(printf '%s\n' "${cascade[@]}" | jq -R . | jq -s .)" \
        --argjson per_repo "$per_repo" \
        '{status: $status, cascade_failures: $cascade, per_repo: $per_repo}'

    [[ "${#cascade[@]}" -gt 0 ]] && return 1 || return 0
}

phase3() {
    # Defensive aggregate in case Phase 1 verify wasn't the last gate.
    "$SCRIPT_DIR/packages-aggregate-classifications.sh" --run-id "$TICKET" >&2 || true

    # Emit the handoff manifest: every manual package (regardless of
    # status) plus any auto that ended up failed (these have already
    # been demoted to manual by upgrade-one-package, but the safety
    # net is cheap).
    local manual_json failed_json
    manual_json=$("$SCRIPT_DIR/packages-list.sh" \
        --run-id "$TICKET" \
        --classification manual \
        --json)
    failed_json=$("$SCRIPT_DIR/packages-list.sh" \
        --run-id "$TICKET" \
        --classification auto \
        --status failed \
        --json)

    jq -n \
        --argjson manual "$manual_json" \
        --argjson failed_auto "$failed_json" \
        '{
            ticket: "'"$TICKET"'",
            manual_count: ($manual | length),
            failed_auto_count: ($failed_auto | length),
            packages: ($manual + $failed_auto)
        }'

    echo >&2
    echo "Phase 3 manifest emitted. Spawn the WALKER to triage:" >&2
    echo "  Follow ~/git/defra/trade-imports-workspace/.claude/skills/npm-upgrade/references/WALKER.md (run-id $TICKET)" >&2
}

case "$PHASE" in
    1) phase1 ;;
    2) phase2 ;;
    3) phase3 ;;
    *) echo "Invalid --phase: $PHASE" >&2; usage ;;
esac
