#!/bin/bash
# Dispatch the npm-upgrade workflow for one ticket.
#
# Usage:
#   start-upgrade.sh EUDPA-XXXXX --phase 0|1|2|3 [--repo R ...] [--strategy LEVEL]
#                    [--branch NAME] [--allowlist-owner NAME --expiry-days N]
#
# --branch NAME refuses to run unless every requested repo is checked
# out on NAME (the ticket's shared cross-repo branch). A requested repo
# with no package.json (a Java service, say) is skipped with a warning.
#
# Phase semantics (no FRESH/RESUME dual-state — every invocation is
# fresh; consumers idempotently merge into prior packages.{repo}.json):
#
#   --phase 0  Run `audit-baseline.sh` for every requested repo and
#              append the result to {run-id}/phase0.json. Exits 1 if
#              any repo's audit is red or has an allowlisted advisory
#              that now has a fix (fixable_allowlisted).
#
#   --phase 1  Refuses to start unless the last phase 0 run covered
#              every requested repo, at its current HEAD, and was
#              green. Then runs `discover-upgrades.sh` for every requested repo,
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

REPOS_MANIFEST="$SCRIPT_DIR/../../repos.json"

# The default repo set is whichever roster entries carry
# `npmUpgradeDefault`. Override per run with --repo.
DEFAULT_REPOS=()
while IFS= read -r repo; do
    DEFAULT_REPOS+=("$repo")
done < <(jq -r '.repos[] | select(.npmUpgradeDefault) | .name' "$REPOS_MANIFEST")

TICKET=""
PHASE=""
STRATEGY="latest"
BRANCH=""
REPOS=()
# Passed to the phase 2 runners, so a new advisory with no fixed
# version is allowlisted rather than failing the upgrade.
ALLOWLIST_ARGS=()

usage() {
    cat <<EOF >&2
Usage: $0 EUDPA-XXXXX --phase 0|1|2|3 [--repo R [--repo R ...]] [--strategy latest|minor|patch]
          [--branch NAME] [--allowlist-owner NAME --expiry-days N]

Without --repo, runs against every repo flagged npmUpgradeDefault in the
workspace roster, repos.json. With --branch, refuses to run unless every
repo is checked out on that branch. --allowlist-owner and --expiry-days
let phase 2 allowlist a new advisory that has no fixed version.
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --phase) PHASE="$2"; shift 2 ;;
        --repo) REPOS+=("$2"); shift 2 ;;
        --strategy) STRATEGY="$2"; shift 2 ;;
        --branch) BRANCH="$2"; shift 2 ;;
        --allowlist-owner|--expiry-days) ALLOWLIST_ARGS+=("$1" "$2"); shift 2 ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$TICKET" ]] && usage
[[ -z "$PHASE" ]] && usage

[[ "${#REPOS[@]}" -eq 0 ]] && REPOS=("${DEFAULT_REPOS[@]}")

WORKSPACE_BASE="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$TICKET"
REPO_BASE="$HOME/git/defra/trade-imports-workspace/repos"

# Drop repos that cannot take an npm upgrade. A missing checkout, or a
# repo with no package.json (a Java service flagged by mistake), is a
# warning rather than an abort, so the rest of the roster still runs.
NPM_REPOS=()
for repo in "${REPOS[@]}"; do
    if [[ ! -d "$REPO_BASE/$repo" ]]; then
        echo "Repo dir missing, skipping: $REPO_BASE/$repo" >&2
        continue
    fi
    if [[ ! -f "$REPO_BASE/$repo/package.json" ]]; then
        echo "No package.json in $repo, skipping (not an npm repo)" >&2
        continue
    fi
    NPM_REPOS+=("$repo")
done
REPOS=()
[[ "${#NPM_REPOS[@]}" -gt 0 ]] && REPOS=("${NPM_REPOS[@]}")

# Every repo must sit on the ticket's shared branch, or the stack's
# cross-repo branch pickup breaks (CLAUDE.md rule 2).
if [[ -n "$BRANCH" ]]; then
    OFF_BRANCH=()
    for repo in "${REPOS[@]}"; do
        current=$(git -C "$REPO_BASE/$repo" branch --show-current)
        [[ "$current" != "$BRANCH" ]] && OFF_BRANCH+=("$repo (on '${current:-detached HEAD}')")
    done
    if [[ "${#OFF_BRANCH[@]}" -gt 0 ]]; then
        echo "Refusing to run: these repos are not on $BRANCH:" >&2
        printf '  %s\n' "${OFF_BRANCH[@]}" >&2
        exit 1
    fi
fi

PHASE0_FILE="$WORKSPACE_BASE/phase0.json"

phase0() {
    mkdir -p "$WORKSPACE_BASE"

    local ran_at label per_repo='[]' red=()
    ran_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    label="phase0-$(date -u +"%Y%m%dT%H%M%SZ")"

    for repo in "${REPOS[@]}"; do
        echo "Auditing $repo..." >&2
        local summary code=0 head
        summary=$("$SCRIPT_DIR/audit-baseline.sh" --run-id "$TICKET" --repo "$repo" --label "$label") || code=$?
        if [[ "$code" -eq 2 ]] || ! jq -e . >/dev/null 2>&1 <<<"$summary"; then
            summary=$(jq -nc --arg repo "$repo" '{repo: $repo, green: false, error: "audit-baseline.sh could not run the audit"}')
        fi
        head=$(git -C "$REPO_BASE/$repo" rev-parse HEAD)
        [[ "$code" -ne 0 ]] && red+=("$repo")
        per_repo=$(jq -nc \
            --argjson p "$per_repo" \
            --argjson s "$summary" \
            --arg head "$head" \
            --argjson code "$code" \
            '$p + [$s + {head: $head, exit_code: $code}]')
    done

    local record
    record=$(jq -n \
        --arg ran_at "$ran_at" \
        --arg label "$label" \
        --arg branch "$BRANCH" \
        --argjson per_repo "$per_repo" \
        --argjson red "$(printf '%s\n' "${red[@]}" | jq -R 'select(. != "")' | jq -s .)" \
        '{ran_at: $ran_at, label: $label, branch: $branch,
          green: ($red | length == 0), red: $red,
          repos: ($per_repo | map(.repo)), per_repo: $per_repo}')

    [[ -f "$PHASE0_FILE" ]] || echo '{"runs": []}' >"$PHASE0_FILE"
    jq --argjson r "$record" '.runs += [$r]' "$PHASE0_FILE" >"$PHASE0_FILE.tmp"
    mv "$PHASE0_FILE.tmp" "$PHASE0_FILE"

    echo "$record"
    if [[ "${#red[@]}" -gt 0 ]]; then
        echo "Phase 0 RED: ${red[*]}. Clear the failing or fixable_allowlisted advisories first." >&2
        return 1
    fi
    echo "Phase 0 green for ${#REPOS[@]} repo(s)." >&2
}

# Phase 1 builds on a green audit: the last phase 0 run must cover
# every requested repo at its current HEAD and be green.
require_green_phase0() {
    if [[ ! -f "$PHASE0_FILE" ]]; then
        echo "Refusing phase 1: no phase 0 run for $TICKET. Run --phase 0 first." >&2
        exit 1
    fi
    local last problems=()
    last=$(jq -c '.runs | last' "$PHASE0_FILE")
    for repo in "${REPOS[@]}"; do
        local row head
        row=$(jq -c --arg r "$repo" '.per_repo[] | select(.repo == $r)' <<<"$last")
        head=$(git -C "$REPO_BASE/$repo" rev-parse HEAD)
        if [[ -z "$row" ]]; then
            problems+=("$repo: not in the last phase 0 run")
        elif [[ "$(jq -r '.exit_code' <<<"$row")" != "0" ]]; then
            problems+=("$repo: red in the last phase 0 run")
        elif [[ "$(jq -r '.head' <<<"$row")" != "$head" ]]; then
            problems+=("$repo: HEAD has moved since the last phase 0 run")
        fi
    done
    if [[ "${#problems[@]}" -gt 0 ]]; then
        echo "Refusing phase 1 until a green phase 0 run covers these repos:" >&2
        printf '  %s\n' "${problems[@]}" >&2
        exit 1
    fi
}

phase1() {
    require_green_phase0
    mkdir -p "$WORKSPACE_BASE"

    # Discover each repo. Each call writes packages.{repo}.json
    # idempotently (merges with prior state).
    for repo in "${REPOS[@]}"; do
        local repo_path="$REPO_BASE/$repo"
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
                ${ALLOWLIST_ARGS[@]+"${ALLOWLIST_ARGS[@]}"} \
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
    0) phase0 ;;
    1) phase1 ;;
    2) phase2 ;;
    3) phase3 ;;
    *) echo "Invalid --phase: $PHASE" >&2; usage ;;
esac
