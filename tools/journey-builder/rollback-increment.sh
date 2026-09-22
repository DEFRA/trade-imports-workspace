#!/bin/bash
# Hard-rollback a failed increment, scoped to the paths an increment may
# touch, and mark it failed.
#
# Two arms, matching commit-increment.sh's two. The workspace arm is the
# reason decision 1 of EUDPA-574 was reopened: without it, a rolled-back
# increment undoes the code and KEEPS the spec describing it, leaving a
# spec.md asserting behaviour that exists in no repo. That is worse than the
# drift the sync exists to stop, because it validates green.
#
# The workspace arm does two things, in this order:
#   1. revert an uncommitted, possibly PARTIAL write — the failure mode a
#      frontend-change spec-sync halt actually produces, and the likeliest one;
#   2. reset the increment's own spec commit, if HEAD is it.
#
# Step 2 matches on the sha backlog.json recorded at commit time, never on a
# commit message. A rollback invoked twice, or invoked after someone committed
# by hand in that worktree, must be a no-op rather than eat an unrelated commit.
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
ws_worktree="$(jq -r '.workspace_worktree // empty' "$WORKAREA/.digest-meta.json")"

# --- Arm 1: the Behaviour Spec, in the workspace worktree -----------------
if [[ -n "$ws_worktree" && -d "$ws_worktree" ]]; then
    # checkout -- fails on a path with no committed version yet (a brand-new
    # capability directory), which is exactly the case clean -fd handles.
    git -C "$ws_worktree" checkout -- "${WORKSPACE_COMMIT_PATHS[@]}" 2>/dev/null || true
    git -C "$ws_worktree" clean -fd -- "${WORKSPACE_COMMIT_PATHS[@]}"

    spec_sha="$(jq -r --arg id "$INC" \
        '.increments[] | select(.id == $id) | .spec_commit // empty' \
        "$WORKAREA/backlog.json")"
    if [[ -n "$spec_sha" ]]; then
        head_sha=$(git -C "$ws_worktree" rev-parse HEAD)
        if [[ "$head_sha" == "$spec_sha" ]]; then
            git -C "$ws_worktree" reset --hard HEAD~1
            echo "$INC spec commit $spec_sha reset"
        else
            echo "$INC: HEAD is not this increment's spec commit — left alone"
        fi
    fi
fi

# --- Arm 2: the code, in the target worktree ------------------------------
git -C "$worktree" checkout -- "${TARGET_COMMIT_PATHS[@]}"
git -C "$worktree" clean -fd -- "${TARGET_COMMIT_PATHS[@]}"

"$WORKSPACE/tools/journey-builder/backlog-set-status.sh" "$RUN_ID" --increment "$INC" --status failed --reason "$REASON"
echo "$INC rolled back and marked failed"
