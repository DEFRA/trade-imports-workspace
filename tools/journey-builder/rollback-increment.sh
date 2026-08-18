#!/bin/bash
# Hard-rollback the worktree's uncommitted changes after a failed increment,
# scoped to the paths an increment may touch, and mark it failed.
#
# Usage:
#   rollback-increment.sh EUDPA-X --increment inc-004 --reason "..."

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; INC=""; REASON=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --increment) INC="$2"; shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID INC REASON; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

WORKAREA="$WORKSPACE/workareas/journey-builder/$RUN_ID"
worktree="$(jq -r '.worktree' "$WORKAREA/.digest-meta.json")"

git -C "$worktree" checkout -- prototypes/standalone/live-animals prototypes/e2e package.json prototypes/standalone/index.js
git -C "$worktree" clean -fd -- prototypes/standalone/live-animals prototypes/e2e

"$WORKSPACE/tools/journey-builder/backlog-set-status.sh" "$RUN_ID" --increment "$INC" --status failed --reason "$REASON"
echo "$INC rolled back and marked failed"
