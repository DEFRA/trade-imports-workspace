#!/bin/bash
# Commit the worktree's current changes as one increment and mark it done.
# Refuses if verify-increment.sh has not just passed (caller runs it first —
# this script re-runs the unit suite as a cheap belt-and-braces).
#
# Two arms, because an increment touches two repos: the Behaviour Spec that
# frontend-change wrote into the run's WORKSPACE worktree (openspec/specs,
# openspec/coverage — WORKSPACE_COMMIT_PATHS), and the code in the TARGET
# worktree (TARGET_COMMIT_PATHS).
#
# Workspace first, deliberately. That arm is prose with no hooks and
# effectively no failure modes; the target arm runs the unit suite and can
# fail. Committing the cheap one first means a target-arm failure leaves a
# spec commit that rollback-increment.sh resets cleanly, where the reverse
# would leave a committed code change with no spec and nothing to undo it.
# The two commits are not atomic — accept the window, keep it recoverable.
#
# An arm with nothing staged is a SKIP, not an error: an increment that
# legitimately changes no observable behaviour writes no spec (frontend-change
# step 5.1a), and must not fail for it. The target arm keeps the original
# nothing-staged guard, because an increment with no code change is a bug.
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
ws_worktree="$(jq -r '.workspace_worktree // empty' "$WORKAREA/.digest-meta.json")"

TRAILER="Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"

# --- Arm 1: the Behaviour Spec, in the workspace worktree -----------------
spec_sha=""
if [[ -n "$ws_worktree" && -d "$ws_worktree" ]]; then
    git -C "$ws_worktree" add "${WORKSPACE_COMMIT_PATHS[@]}"
    if git -C "$ws_worktree" diff --cached --quiet; then
        echo "$INC: no spec change to commit"
    else
        git -C "$ws_worktree" commit -m "docs($RUN_ID): $TARGET_ID $INC spec — $SUMMARY

$TRAILER"
        spec_sha=$(git -C "$ws_worktree" rev-parse HEAD)
        echo "$INC spec committed as $spec_sha"
    fi
else
    # A run prepared before EUDPA-574 has no workspace worktree. Say so
    # rather than silently skipping the spec side.
    echo "$INC: no workspace worktree in .digest-meta.json — spec not committed" >&2
fi

# --- Arm 2: the code, in the target worktree ------------------------------
git -C "$worktree" add "${TARGET_COMMIT_PATHS[@]}"

if git -C "$worktree" diff --cached --quiet; then
    echo "Error: nothing staged for $INC" >&2
    exit 1
fi

git -C "$worktree" commit -m "feat($RUN_ID): $TARGET_ID $INC — $SUMMARY

$TRAILER"

sha=$(git -C "$worktree" rev-parse HEAD)
"$WORKSPACE/tools/journey-builder/backlog-set-status.sh" "$RUN_ID" --increment "$INC" \
    --status done --commit "$sha" --spec-commit "$spec_sha"
echo "$INC committed as $sha"
