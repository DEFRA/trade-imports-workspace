#!/bin/bash
# Set an increment's status (todo|inprogress|done|failed|blocked|dropped).
# done accepts --commit SHA; failed requires --reason. Marking failed
# auto-blocks direct dependents.
#
# Usage:
#   backlog-set-status.sh EUDPA-X --increment inc-004 --status done [--commit SHA]
#   backlog-set-status.sh EUDPA-X --increment inc-004 --status failed --reason "..."

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; INC=""; STATUS=""; COMMIT=""; REASON=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --increment) INC="$2"; shift 2 ;;
        --status) STATUS="$2"; shift 2 ;;
        --commit) COMMIT="$2"; shift 2 ;;
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

jq --arg id "$INC" --arg status "$STATUS" --arg commit "$COMMIT" --arg reason "$REASON" \
    '.increments |= map(
        if .id == $id then
            .status = $status
            | .commit = (if $commit == "" then .commit else $commit end)
            | .failure_reason = (if $status == "failed" then $reason else null end)
        elif ($status == "failed" and (.dependsOn | index($id)) != null and .status == "todo") then
            .status = "blocked" | .failure_reason = ("blocked by failed " + $id)
        else . end
    )' "$target" > "$target.tmp" && mv "$target.tmp" "$target"

echo "$INC -> $STATUS"
