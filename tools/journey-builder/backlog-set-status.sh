#!/bin/bash
# Set an increment's status (todo|inprogress|done|failed|blocked|dropped).
# done accepts --commit SHA and --spec-commit SHA; failed requires --reason.
# Marking failed auto-blocks direct dependents.
#
# An increment commits in up to two repos: the target repo (--commit) and,
# since EUDPA-574, the workspace's Behaviour Spec in the run's workspace
# worktree (--spec-commit). rollback-increment.sh matches on the recorded
# spec sha rather than on a commit message, so a rollback run twice — or run
# after someone committed by hand in that worktree — cannot eat an unrelated
# commit.
#
# Usage:
#   backlog-set-status.sh EUDPA-X --increment inc-004 --status done [--commit SHA] [--spec-commit SHA]
#   backlog-set-status.sh EUDPA-X --increment inc-004 --status failed --reason "..."

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; INC=""; STATUS=""; COMMIT=""; SPEC_COMMIT=""; SPEC_COMMIT_GIVEN=false; REASON=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --increment) INC="$2"; shift 2 ;;
        --status) STATUS="$2"; shift 2 ;;
        --commit) COMMIT="$2"; shift 2 ;;
        # Passing the flag EMPTY is meaningful and different from omitting
        # it: commit-increment.sh always passes it, and an empty value means
        # "this increment committed no spec" — an increment with no
        # observable behaviour change writes none. Preserving the previous
        # value there would leave a stale sha that rollback-increment.sh
        # later matches HEAD against, which is the exact confusion its sha
        # guard exists to prevent.
        --spec-commit) SPEC_COMMIT="$2"; SPEC_COMMIT_GIVEN=true; shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID INC STATUS; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done
case "$STATUS" in
    todo|inprogress|done|failed|blocked|dropped) ;;
    *) echo "Error: invalid status '$STATUS'" >&2; exit 1 ;;
esac
[[ "$STATUS" == "failed" && -z "$REASON" ]] && { echo "Error: failed requires --reason" >&2; exit 1; }

target="$WORKSPACE/workareas/journey-builder/$RUN_ID/backlog.json"
[[ -f "$target" ]] || { echo "Error: $target not found — run backlog-generate.sh first" >&2; exit 1; }

exists=$(jq --arg id "$INC" '[.increments[] | select(.id == $id)] | length' "$target")
[[ "$exists" -eq 0 ]] && { echo "Error: increment '$INC' not found" >&2; exit 1; }

# Each call writes through its own temp file: concurrent callers sharing one
# temp name rename over each other and drop items. Same directory keeps the
# mv an atomic rename; the trap clears the temp if jq fails.
tmp="$(mktemp "$target.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
jq --arg id "$INC" --arg status "$STATUS" --arg commit "$COMMIT" \
   --arg spec_commit "$SPEC_COMMIT" --argjson spec_given "$SPEC_COMMIT_GIVEN" \
   --arg reason "$REASON" \
    '.increments |= map(
        if .id == $id then
            .status = $status
            | .commit = (if $commit == "" then .commit else $commit end)
            | .spec_commit = (if $spec_given
                              then (if $spec_commit == "" then null else $spec_commit end)
                              else .spec_commit end)
            | .failure_reason = (if $status == "failed" then $reason else null end)
        elif ($status == "failed" and (.dependsOn | index($id)) != null and .status == "todo") then
            .status = "blocked" | .failure_reason = ("blocked by failed " + $id)
        else . end
    )' "$target" > "$tmp"
mv "$tmp" "$target"

echo "$INC -> $STATUS"
