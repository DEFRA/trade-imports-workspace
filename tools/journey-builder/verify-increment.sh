#!/bin/bash
# Verify the live-animals prototype in the worktree: unit tests (+ lint,
# + prettier-check on the prototype dir). Exit code is the loop's signal.
# Output is written to a log; only the tail is echoed.
#
# --e2e adds the full Playwright suite (npm run test:prototype): the demo
# journeys AND the persistence-parity compare against Mongo. Parity needs the
# workspace stack up (scripts/stack/run-stack.sh); the suite says so and exits
# fast if it is down.
#
# Usage:
#   verify-increment.sh EUDPA-X [--e2e]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; E2E=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --e2e) E2E=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-X [--e2e]" >&2; exit 1; }

WORKAREA="$WORKSPACE/workareas/journey-builder/$RUN_ID"
meta="$WORKAREA/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found" >&2; exit 1; }
worktree_raw="$(jq -r '.worktree' "$meta")"
worktree="$(cd "$worktree_raw" && pwd -P)"   # canonical path: npm + symlinked workspace corrupts the lockfile
log="$WORKAREA/.verify.log"

fail() { tail -30 "$log"; echo "VERIFY FAIL: $1 (full log: $log)"; exit 1; }

echo "== verify $(date -u +%H:%M:%SZ) ==" > "$log"

npm run --prefix "$worktree" test:live-animals >> "$log" 2>&1 || fail "unit tests"
# eslint v9 flat config + prettier globs resolve from cwd, so run these from
# the worktree root, not by passing an absolute path from wherever the caller sits.
( cd "$worktree" && ./node_modules/.bin/prettier --check "prototypes/standalone/live-animals/**/*.{js,json,md}" ) >> "$log" 2>&1 || fail "prettier"
( cd "$worktree" && ./node_modules/.bin/eslint "prototypes/standalone/live-animals" ) >> "$log" 2>&1 || fail "eslint"

if [[ "$E2E" == true ]]; then
    # The WHOLE suite, unfiltered: both Playwright projects — the demo journeys
    # (stub server) and the persistence-parity compare against Mongo (real-mode
    # server, needs the workspace stack up). A filename filter here would skip
    # parity, which is how a persistence bug once hid behind two green suites.
    npm run --prefix "$worktree" test:prototype >> "$log" 2>&1 || fail "e2e"
fi

grep -E "Test Files|Tests " "$log" | head -4
echo "VERIFY OK"
