#!/bin/bash
# Verify the target in the worktree: unit tests, format check, lint. Exit code
# is the loop's signal. Output goes to a log; only the tail is echoed.
#
# --e2e adds the target's end-to-end suite. The frontend's fit suites self-host
# in stub mode and bind their own port, so no workspace stack is needed.
#
# What runs at each rung comes from the target profile (targets.json), not from
# this script. A target that omits a rung skips it.
#
# Usage:
#   verify-increment.sh EUDPA-X [--e2e] [--target <id>]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
source "$WORKSPACE/tools/journey-builder/target-profile.sh"

RUN_ID=""; E2E=false; TARGET_FLAG=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --e2e) E2E=true; shift ;;
        --target) TARGET_FLAG="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-X [--e2e] [--target <id>]" >&2; exit 1; }

load_target "$RUN_ID" "$TARGET_FLAG"

WORKAREA="$WORKSPACE/workareas/journey-builder/$RUN_ID"
meta="$WORKAREA/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found" >&2; exit 1; }
worktree_raw="$(jq -r '.worktree' "$meta")"
worktree="$(cd "$worktree_raw" && pwd -P)"   # canonical path: npm + symlinked workspace corrupts the lockfile
log="$WORKAREA/.verify.log"

fail() { tail -30 "$log"; echo "VERIFY FAIL: $1 (full log: $log)"; exit 1; }

run_rung() {
    local label="$1" script="$2"
    [[ -z "$script" ]] && return 0
    npm run --prefix "$worktree" "$script" >> "$log" 2>&1 || fail "$label"
}

echo "== verify $(date -u +%H:%M:%SZ) target=$TARGET_ID ==" > "$log"

run_rung "unit tests" "$TARGET_VERIFY_UNIT"
run_rung "format" "$TARGET_VERIFY_FORMAT"
run_rung "lint" "$TARGET_VERIFY_LINT"

if [[ "$E2E" == true ]]; then
    # The whole suite, unfiltered. A filename filter here is how a persistence
    # bug once hid behind two green suites.
    run_rung "e2e" "$TARGET_VERIFY_E2E"
fi

grep -E "Test Files|Tests " "$log" | head -4
echo "VERIFY OK"
