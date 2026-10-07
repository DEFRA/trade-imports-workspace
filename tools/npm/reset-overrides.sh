#!/bin/bash
# Remove every npm override from one repo, then put back only the ones
# a failing audit, test, lint or build proves are still needed.
#
# Usage:
#   reset-overrides.sh --run-id TICKET --repo REPO [--repo-path PATH]
#
# 1. Saves the repo's package.json "overrides", flattened one entry per
#    leaf (lighthouse/., lighthouse/ws, puppeteer-core/ws), to
#      workareas/npm-upgrades/{run-id}/{repo}/overrides.{repo}.json
#    as [{path, key_path, value, status, reason, evidence}].
# 2. Makes a throwaway git worktree of HEAD under that workarea and does
#    every trial there, so the repo checkout (and a pre-commit hook such
#    as animals-admin's) never sees a red state, and no other script's
#    `git checkout` rollback can undo the trial.
# 3. Each trial: write the overrides being tried, `npm install`,
#    `npm update`, audit-baseline.sh, `npm test` (not for
#    trade-imports-ins-tests), `npm run lint`, and `npm run
#    build:frontend` where those scripts exist.
# 4. With no overrides at all: if every check passes, every override is
#    removed. Otherwise:
#    - each failing advisory (at the audit threshold) puts back every
#      override on its package (audit-direct) or on a package its npm
#      `effects` chain reaches (audit-path: lighthouse for extract-zip),
#      with the GHSA as the reason. An advisory no override reaches
#      stops the run: allowlist it or fix it by hand, then run again.
#    - a failing test, lint or build puts overrides back one at a time,
#      in their original order, until it passes (reason: the check;
#      evidence: the end of its log).
#    - then every audit-path or check override, except the last one put
#      back for a check, is tried out again and stays only if the run
#      fails without it.
# 5. Copies package.json and package-lock.json back to the repo, runs
#    `npm install` there, and commits "Remove overrides" with a table of
#    kept overrides in the body. Advisories below the audit threshold
#    in the final tree are listed for information (D6: only high and
#    above justify an override).
#
# Prints one JSON line:
#   {repo, status: committed|no_overrides|unchanged|stopped, commit,
#    kept: [...], removed: [...], below_threshold: [...], reason, worktree}
#
# Exit codes:
#   0  committed, no overrides, or nothing to change
#   1  stopped: see reason (the worktree is kept for inspection)
#   2  usage error, or the repo tree was not clean

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=audit-lib.sh
source "$SCRIPT_DIR/audit-lib.sh"

RUN_ID=""
REPO=""
REPO_PATH_OVERRIDE=""

usage() {
    echo "Usage: $0 --run-id TICKET --repo REPO [--repo-path PATH]" >&2
    exit 2
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --repo-path) REPO_PATH_OVERRIDE="$2"; shift 2 ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$RUN_ID" ]] && usage
[[ -z "$REPO" ]] && usage

REPO_PATH=$(audit_resolve_repo_path "$REPO" "$REPO_PATH_OVERRIDE") || exit 2
STATE_DIR=$(audit_state_dir "$RUN_ID" "$REPO")
mkdir -p "$STATE_DIR"
STATE_FILE="$STATE_DIR/overrides.${REPO}.json"
WORKTREE="$STATE_DIR/override-trial"
LOG_DIR="$STATE_DIR/override-trial-logs"
mkdir -p "$LOG_DIR"

if [[ -n $(git -C "$REPO_PATH" status --porcelain -uno) ]]; then
    echo "Uncommitted changes in $REPO_PATH. Commit or stash first." >&2
    exit 2
fi

ORIGINAL_PACKAGE_JSON=$(git -C "$REPO_PATH" show HEAD:package.json)

# One row per leaf override. key_path is the jq path for rebuilding the
# block; path is its readable form. A scoped package name keeps its "/".
jq '[.overrides // {} | paths(scalars) as $p
     | {path: ($p | join("/")), key_path: $p, value: getpath($p),
        status: "pending", reason: null, evidence: null}]' \
    <<<"$ORIGINAL_PACKAGE_JSON" >"$STATE_FILE"

TOTAL=$(jq 'length' "$STATE_FILE")

output() {
    local status="$1" commit="$2" reason="$3" below="${4:-[]}"
    jq -nc \
        --arg repo "$REPO" --arg status "$status" --arg commit "$commit" \
        --arg reason "$reason" --arg worktree "$WORKTREE" \
        --argjson below "$below" \
        --slurpfile rows "$STATE_FILE" '
        {repo: $repo, status: $status,
         commit: (if $commit == "" then null else $commit end),
         kept: ($rows[0] | map(select(.status == "kept") | {path, value, kept_for, reason})),
         removed: ($rows[0] | map(select(.status == "removed") | .path)),
         below_threshold: $below,
         reason: (if $reason == "" then null else $reason end),
         worktree: (if $status == "stopped" then $worktree else null end)}'
}

if [[ "$TOTAL" -eq 0 ]]; then
    output no_overrides "" ""
    exit 0
fi

# The package an override pins: the leaf name, or its parent for ".".
# lighthouse/. -> lighthouse, lighthouse/ws -> ws, brace-expansion -> brace-expansion
override_target_jq='(.key_path | if last == "." then .[-2] else last end)'

set_rows() {
    # set_rows <jq filter over the rows array>
    jq "$@" "$STATE_FILE" >"$STATE_FILE.tmp"
    mv "$STATE_FILE.tmp" "$STATE_FILE"
}

# --- worktree ----------------------------------------------------------

if [[ -e "$WORKTREE" ]]; then
    git -C "$REPO_PATH" worktree remove --force "$WORKTREE" 2>/dev/null || true
fi
git -C "$REPO_PATH" worktree prune
if ! git -C "$REPO_PATH" worktree add --detach "$WORKTREE" HEAD >"$LOG_DIR/worktree.log" 2>&1; then
    echo "Could not create the trial worktree at $WORKTREE; see $LOG_DIR/worktree.log" >&2
    exit 2
fi
WORKTREE=$(cd "$WORKTREE" && pwd -P)

remove_worktree() {
    git -C "$REPO_PATH" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
}

# Run a command in a directory, on the Node version its .nvmrc names.
run_in() {
    local dir="$1"; shift
    (
        cd "$dir"
        export NVM_DIR="$HOME/.nvm"
        if [[ -s "$NVM_DIR/nvm.sh" ]]; then
            set +u
            # shellcheck disable=SC1091
            . "$NVM_DIR/nvm.sh"
            nvm use >/dev/null 2>&1 || true
            set -u
        fi
        "$@"
    )
}

has_script() {
    jq -e --arg s "$1" '.scripts[$s] != null' <<<"$ORIGINAL_PACKAGE_JSON" >/dev/null
}

# Write the worktree's package.json with only the kept/trial overrides.
write_overrides() {
    local keep_json="$1"
    jq --argjson keep "$keep_json" '
        if ($keep | length) == 0 then del(.overrides)
        else .overrides = (reduce $keep[] as $o ({}; setpath($o.key_path; $o.value)))
        end' <<<"$ORIGINAL_PACKAGE_JSON" >"$WORKTREE/package.json"
}

TRIAL=0
TRIAL_AUDIT_FAILING='[]'
TRIAL_FAILED_CHECK=""
TRIAL_LOG=""
TRIAL_SUMMARY=""

# trial <rows to keep, JSON array>. Sets TRIAL_AUDIT_FAILING (advisory
# rows at the threshold that fail), TRIAL_FAILED_CHECK (first failing
# check name, or empty) and TRIAL_LOG. Returns 0 when all green.
trial() {
    local keep_json="$1"
    TRIAL=$((TRIAL + 1))
    TRIAL_LOG="$LOG_DIR/trial-$TRIAL.log"
    TRIAL_AUDIT_FAILING='[]'
    TRIAL_FAILED_CHECK=""
    : >"$TRIAL_LOG"
    echo "Trial $TRIAL: keeping $(jq -r 'map(.path) | if length == 0 then "no overrides" else join(", ") end' <<<"$keep_json")" >&2

    write_overrides "$keep_json"

    echo "== npm install" >>"$TRIAL_LOG"
    run_in "$WORKTREE" npm install >>"$TRIAL_LOG" 2>&1 || { TRIAL_FAILED_CHECK="npm install"; return 1; }
    echo "== npm update" >>"$TRIAL_LOG"
    run_in "$WORKTREE" npm update >>"$TRIAL_LOG" 2>&1 || { TRIAL_FAILED_CHECK="npm update"; return 1; }

    if [[ -f "$WORKTREE/$AUDIT_CONFIG_FILE" ]]; then
        echo "== audit-baseline.sh" >>"$TRIAL_LOG"
        local code=0
        TRIAL_SUMMARY=$("$SCRIPT_DIR/audit-baseline.sh" --run-id "$RUN_ID" --repo "$REPO" \
            --repo-path "$WORKTREE" --label "override-trial-$TRIAL" 2>>"$TRIAL_LOG") || code=$?
        echo "$TRIAL_SUMMARY" >>"$TRIAL_LOG"
        if [[ "$code" -eq 2 ]]; then
            # Not a verdict on these overrides (registry offline, say):
            # stop now rather than put overrides back on a failure they
            # cannot fix, or keep one in the minimise pass.
            TRIAL_FAILED_CHECK="audit (could not run)"
            stop "the audit could not run in trial $TRIAL (registry offline, or audit-ci not installed?); see $TRIAL_LOG, then run again"
        fi
        # Each failing advisory, with every package it affects: its own
        # package plus everything npm's `effects` chain reaches from it.
        # An override on any of those (lighthouse for extract-zip, say)
        # may be what keeps the advisory out.
        local snapshot
        snapshot=$(jq -r '.snapshot' <<<"$TRIAL_SUMMARY")
        TRIAL_AUDIT_FAILING=$(jq -c --slurpfile report "$snapshot" '
            def reach($v; $seen):
              ([$seen[] | ($v[.].effects // [])[]] | unique) as $next
              | if ($next - $seen | length) == 0 then $seen else reach($v; ($seen + $next) | unique) end;
            ($report[0].vulnerabilities // {}) as $v
            | .failing as $f
            | .advisories
            | map(select(.ghsa as $g | any($f[]; . == $g)) | . + {affected: reach($v; [.package])})' <<<"$TRIAL_SUMMARY")
        if [[ "$(jq 'length' <<<"$TRIAL_AUDIT_FAILING")" -gt 0 ]]; then
            TRIAL_FAILED_CHECK="audit"
            return 1
        fi
    fi

    # Build first, as CI does: a repo whose .npmrc sets ignore-scripts=true
    # never runs pretest, so its tests would find no built assets.
    local check
    for check in build:frontend test lint; do
        [[ "$check" == "test" && "$REPO" == "trade-imports-ins-tests" ]] && continue
        has_script "$check" || continue
        echo "== npm run $check" >>"$TRIAL_LOG"
        if ! run_in "$WORKTREE" npm run "$check" >>"$TRIAL_LOG" 2>&1; then
            TRIAL_FAILED_CHECK="npm run $check"
            return 1
        fi
    done
    return 0
}

stop() {
    local reason="$1"
    set_rows 'map(if .status == "pending" then .status = "undecided" else . end)'
    output stopped "" "$reason"
    exit 1
}

excerpt() {
    tail -n 15 "$TRIAL_LOG" | cut -c1-200
}

# --- trials --------------------------------------------------------------

ALL_ROWS=$(jq -c '.' "$STATE_FILE")
# The overrides put back so far, each with kept_for (audit-direct: it
# pins the advisory's own package; audit-path: it pins a package the
# advisory reaches; check: a test, lint or build needed it), reason and
# evidence.
KEEP='[]'
PASSED=0

# Trial 1: no overrides at all.
trial "$KEEP" && PASSED=1

# Advisories first: each failing GHSA puts back every override on its
# package or on a package its effects reach.
guard=0
while [[ "$PASSED" -eq 0 && "$TRIAL_FAILED_CHECK" == "audit" ]]; do
    guard=$((guard + 1))
    [[ "$guard" -gt "$TOTAL" ]] && stop "audit still red after putting back every override that reaches a failing advisory"
    evidence="$(excerpt)"
    unmapped=$(jq -r --argjson rows "$ALL_ROWS" --argjson keep "$KEEP" "
        map(. as \$a | select(any(\$rows[] | select(.path as \$p | any(\$keep[]; .path == \$p) | not);
                                  ($override_target_jq) as \$t | any(\$a.affected[]; . == \$t)) | not)
            | .ghsa) | join(\", \")" <<<"$TRIAL_AUDIT_FAILING")
    if [[ -n "$unmapped" ]]; then
        stop "audit red on $unmapped with no override left that reaches it; fix or allowlist it, then run again"
    fi
    additions=$(jq -c --argjson rows "$ALL_ROWS" --argjson keep "$KEEP" --arg evidence "$evidence" "
        [ .[] as \$a | \$rows[]
          | select(.path as \$p | any(\$keep[]; .path == \$p) | not)
          | ($override_target_jq) as \$t
          | select(any(\$a.affected[]; . == \$t))
          | . + {kept_for: (if \$t == \$a.package then \"audit-direct\" else \"audit-path\" end),
                 reason: (\"\(\$a.ghsa) (\(\$a.package), \(\$a.severity)) fails the audit without it\"
                          + (if \$t == \$a.package then \"\" else \"; this override pins \(\$t), which depends on it\" end)),
                 evidence: \$evidence} ]
        | group_by(.path)
        | map(.[0] + {kept_for: (if any(.[]; .kept_for == \"audit-direct\") then \"audit-direct\" else \"audit-path\" end),
                      reason: (map(.reason) | unique | join(\" / \"))})" <<<"$TRIAL_AUDIT_FAILING")
    KEEP=$(jq -c --argjson add "$additions" '. + $add' <<<"$KEEP")
    trial "$KEEP" && PASSED=1
done

# Then test, lint and build: put overrides back one at a time, in
# their original order, until the check passes.
while [[ "$PASSED" -eq 0 ]]; do
    if [[ "$TRIAL_FAILED_CHECK" == "audit" ]]; then
        stop "audit went red while putting overrides back for a failing check; see $TRIAL_LOG"
    fi
    failed_check="$TRIAL_FAILED_CHECK"
    evidence="$(excerpt)"
    next=$(jq -c --argjson keep "$KEEP" 'map(select(.path as $p | any($keep[]; .path == $p) | not)) | first // empty' <<<"$ALL_ROWS")
    [[ -z "$next" ]] && stop "$failed_check still fails with every override back; not an override problem (see $TRIAL_LOG)"
    KEEP=$(jq -c --argjson n "$next" --arg check "$failed_check" --arg evidence "$evidence" \
        '. + [$n + {kept_for: "check", reason: "\($check) fails without it", evidence: $evidence}]' <<<"$KEEP")
    trial "$KEEP" && PASSED=1
done

# Minimise: an override kept because a package it pins depends on a
# failing advisory, or put back for a failing check, stays only if the
# run fails without it. The last one put back for a check is what
# turned it green, so it stays without a retry. Overrides on the
# advisory's own package (audit-direct) stay as they are.
LAST_CHECK=$(jq -r 'map(select(.kept_for == "check")) | last | .path // ""' <<<"$KEEP")
WORKTREE_ON_KEEP=1
for encoded in $(jq -r --arg last "$LAST_CHECK" \
    'map(select((.kept_for == "audit-path" or .kept_for == "check") and .path != $last)) | reverse | .[].path | @base64' <<<"$KEEP"); do
    path=$(base64 --decode <<<"$encoded")
    without=$(jq -c --arg p "$path" 'map(select(.path != $p))' <<<"$KEEP")
    if trial "$without"; then
        KEEP="$without"
        WORKTREE_ON_KEEP=1
    else
        WORKTREE_ON_KEEP=0
    fi
done
if [[ "$WORKTREE_ON_KEEP" -eq 0 ]]; then
    trial "$KEEP" || stop "the final set of overrides no longer passes ($TRIAL_FAILED_CHECK); see $TRIAL_LOG"
fi

set_rows --argjson keep "$KEEP" '
    map(.path as $p | ($keep | map(select(.path == $p)) | first) as $k
      | if $k then .status = "kept" | .kept_for = $k.kept_for | .reason = $k.reason | .evidence = $k.evidence
        else .status = "removed" end)'

# Advisories below the threshold in the final tree, for the PR (D6).
BELOW='[]'
if [[ -f "$WORKTREE/$AUDIT_CONFIG_FILE" ]]; then
    SNAPSHOT="$STATE_DIR/audit.${REPO}.override-trial-${TRIAL}.json"
    if [[ -f "$SNAPSHOT" ]]; then
        THRESHOLD=$(jq "$AUDIT_JQ_THRESHOLD" "$WORKTREE/$AUDIT_CONFIG_FILE")
        BELOW=$(jq -c --argjson t "$THRESHOLD" "$AUDIT_JQ_ADVISORIES | map(select(.severity_rank < \$t) | {ghsa, package, severity, title})" "$SNAPSHOT")
    fi
fi

# --- copy back and commit ---------------------------------------------------

cp "$WORKTREE/package.json" "$REPO_PATH/package.json"
cp "$WORKTREE/package-lock.json" "$REPO_PATH/package-lock.json"
# The worktree goes only once the commit lands, so a stop below still
# leaves it for inspection, as the header promises.

if git -C "$REPO_PATH" diff --quiet -- package.json package-lock.json; then
    remove_worktree
    output unchanged "" "" "$BELOW"
    exit 0
fi

if ! run_in "$REPO_PATH" npm install >"$LOG_DIR/copy-back-install.log" 2>&1; then
    git -C "$REPO_PATH" checkout HEAD -- package.json package-lock.json
    run_in "$REPO_PATH" npm install >/dev/null 2>&1 || true
    stop "npm install in the repo failed after copying the trial back; see $LOG_DIR/copy-back-install.log"
fi

KEPT_TABLE=$(jq -r '
    map(select(.status == "kept"))
    | if length == 0 then "No override is still needed."
      else (["Kept overrides:", "", "| Override | Value | Reason |", "|---|---|---|"]
            + map("| \(.path) | \(.value) | \(.reason // "kept") |")) | join("\n")
      end' "$STATE_FILE")
REMOVED_LIST=$(jq -r 'map(select(.status == "removed") | .path) | if length == 0 then "none" else join(", ") end' "$STATE_FILE")

git -C "$REPO_PATH" add package.json package-lock.json
if ! git -C "$REPO_PATH" commit -m "Remove overrides

Removed: $REMOVED_LIST

$KEPT_TABLE" >"$LOG_DIR/commit.log" 2>&1; then
    git -C "$REPO_PATH" checkout HEAD -- package.json package-lock.json
    run_in "$REPO_PATH" npm install >/dev/null 2>&1 || true
    stop "commit refused (pre-commit hook); see $LOG_DIR/commit.log"
fi

remove_worktree
output committed "$(git -C "$REPO_PATH" rev-parse --short HEAD)" "" "$BELOW"
