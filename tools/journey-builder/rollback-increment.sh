#!/bin/bash
# Hard-rollback the worktree's uncommitted changes after a failed increment,
# scoped to the paths an increment may touch, and mark it failed.
#
# Usage:
#   rollback-increment.sh EUDPA-X --increment inc-004 --reason "..."

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
source "$WORKSPACE/tools/journey-builder/target-profile.sh"

RUN_ID=""; INC=""; REASON=""; TARGET_FLAG=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --increment) INC="$2"; shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        --target) TARGET_FLAG="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID INC REASON; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

load_target "$RUN_ID" "$TARGET_FLAG"

WORKAREA="$WORKSPACE/workareas/journey-builder/$RUN_ID"
worktree="$(jq -r '.worktree' "$WORKAREA/.digest-meta.json")"

git -C "$worktree" checkout -- "${TARGET_COMMIT_PATHS[@]}"
git -C "$worktree" clean -fd -- "${TARGET_COMMIT_PATHS[@]}"

"$WORKSPACE/tools/journey-builder/backlog-set-status.sh" "$RUN_ID" --increment "$INC" --status failed --reason "$REASON"
echo "$INC rolled back and marked failed"
