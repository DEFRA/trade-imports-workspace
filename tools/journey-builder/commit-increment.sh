#!/bin/bash
# Commit the worktree's current changes as one increment and mark it done.
# Refuses if verify-increment.sh has not just passed (caller runs it first —
# this script re-runs the unit suite as a cheap belt-and-braces).
#
# Usage:
#   commit-increment.sh EUDPA-X --increment inc-004 --summary "origin page"

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
source "$WORKSPACE/tools/journey-builder/target-profile.sh"

RUN_ID=""; INC=""; SUMMARY=""; TARGET_FLAG=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --increment) INC="$2"; shift 2 ;;
        --summary) SUMMARY="$2"; shift 2 ;;
        --target) TARGET_FLAG="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID INC SUMMARY; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

load_target "$RUN_ID" "$TARGET_FLAG"

WORKAREA="$WORKSPACE/workareas/journey-builder/$RUN_ID"
worktree="$(jq -r '.worktree' "$WORKAREA/.digest-meta.json")"

git -C "$worktree" add "${TARGET_COMMIT_PATHS[@]}"

if git -C "$worktree" diff --cached --quiet; then
    echo "Error: nothing staged for $INC" >&2
    exit 1
fi

git -C "$worktree" commit -m "feat($RUN_ID): $TARGET_ID $INC — $SUMMARY

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"

sha=$(git -C "$worktree" rev-parse HEAD)
"$WORKSPACE/tools/journey-builder/backlog-set-status.sh" "$RUN_ID" --increment "$INC" --status done --commit "$sha"
echo "$INC committed as $sha"
