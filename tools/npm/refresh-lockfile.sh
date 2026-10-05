#!/bin/bash
# Refresh one repo's transitive dependencies within their existing
# ranges, and commit the new lockfile if the repo still passes.
#
# Usage:
#   refresh-lockfile.sh --run-id TICKET --repo REPO [--repo-path PATH]
#
# ncu (phase 1) only looks at direct dependencies, so a fixed transitive
# release (fast-uri, @grpc/grpc-js, brace-expansion...) never arrives
# through the per-package upgrades. This runs `npm update`, which
# rewrites package-lock.json only (package.json ranges stay as they
# are), then checks the repo:
#
#   npm test        (skipped for trade-imports-ins-tests, which has no unit suite)
#   npm run lint    (where the repo has a lint script)
#   audit-baseline.sh   (repos with audit-ci.jsonc)
#
# and commits "Refresh transitive dependencies". On any failure, or if
# npm update touched package.json, it restores package.json and
# package-lock.json from HEAD, reinstalls, and reports.
#
# Prints one JSON line:
#   {repo, status: committed|no_change|rolled_back, commit, reason, log}
#
# Exit codes:
#   0  committed, or nothing to refresh
#   1  rolled back (see reason)
#   2  usage error, or the tree was not clean to start with

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
LOG="$STATE_DIR/refresh-lockfile.${REPO}.log"
: >"$LOG"

result() {
    local status="$1" commit="$2" reason="$3"
    jq -nc --arg repo "$REPO" --arg status "$status" --arg commit "$commit" --arg reason "$reason" --arg log "$LOG" \
        '{repo: $repo, status: $status,
          commit: (if $commit == "" then null else $commit end),
          reason: (if $reason == "" then null else $reason end),
          log: $log}'
}

if [[ -n $(git -C "$REPO_PATH" status --porcelain -uno) ]]; then
    echo "Uncommitted changes in $REPO_PATH. Commit or stash first." >&2
    exit 2
fi

# Run a command in the repo, on the Node version its .nvmrc names.
in_repo() {
    (
        cd "$REPO_PATH"
        export NVM_DIR="$HOME/.nvm"
        if [[ -s "$NVM_DIR/nvm.sh" ]]; then
            set +u
            # shellcheck disable=SC1091
            . "$NVM_DIR/nvm.sh"
            nvm use >/dev/null 2>&1 || true
            set -u
        fi
        "$@"
    ) >>"$LOG" 2>&1
}

has_script() {
    jq -e --arg s "$1" '.scripts[$s] != null' "$REPO_PATH/package.json" >/dev/null
}

rollback() {
    local reason="$1"
    git -C "$REPO_PATH" checkout HEAD -- package.json package-lock.json
    in_repo npm install || true
    result rolled_back "" "$reason"
    exit 1
}

echo "== npm update" >>"$LOG"
in_repo npm update || rollback "npm update failed"

# npm update must leave package.json alone; a change there is not a
# lockfile refresh.
if ! git -C "$REPO_PATH" diff --quiet -- package.json; then
    rollback "npm update changed package.json; expected a lockfile-only change"
fi

if git -C "$REPO_PATH" diff --quiet -- package-lock.json; then
    result no_change "" ""
    exit 0
fi

if [[ "$REPO" != "trade-imports-ins-tests" ]] && has_script test; then
    echo "== npm test" >>"$LOG"
    in_repo npm test || rollback "npm test failed after npm update"
fi

if has_script lint; then
    echo "== npm run lint" >>"$LOG"
    in_repo npm run lint || rollback "npm run lint failed after npm update"
fi

if [[ -f "$REPO_PATH/$AUDIT_CONFIG_FILE" ]]; then
    echo "== audit-baseline.sh" >>"$LOG"
    "$SCRIPT_DIR/audit-baseline.sh" --run-id "$RUN_ID" --repo "$REPO" --repo-path "$REPO_PATH" \
        --label refresh-lockfile >>"$LOG" 2>&1 || rollback "audit red after npm update (see $STATE_DIR/audit.${REPO}.refresh-lockfile.summary.json)"
fi

git -C "$REPO_PATH" add package-lock.json
echo "== git commit" >>"$LOG"
if ! git -C "$REPO_PATH" commit -m "Refresh transitive dependencies

npm update within the existing package.json ranges." >>"$LOG" 2>&1; then
    rollback "commit refused (pre-commit hook); see the log"
fi

result committed "$(git -C "$REPO_PATH" rev-parse --short HEAD)" ""
