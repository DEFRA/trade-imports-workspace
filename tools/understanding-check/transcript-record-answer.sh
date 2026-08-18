#!/bin/bash
# Record a developer's answer to a question. The answer comes from an
# external file (--answer-file) so multi-line content doesn't have to
# be shell-quoted.
#
# Usage:
#   transcript-record-answer.sh EUDPA-XXXXX \
#       --question-id Q3 \
#       --answer-file /tmp/ans.txt
#       [--skipped]
#
# If --skipped is passed (or the answer file is empty), the entry is
# marked skipped=true. The SCORER later auto-FAILs with
# missed_concepts=["skipped"].

set -e

TICKET=""; QID=""; ANSWER_FILE=""; SKIPPED=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --question-id) QID="$2"; shift 2 ;;
        --answer-file) ANSWER_FILE="$2"; shift 2 ;;
        --skipped) SKIPPED=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$TICKET" || -z "$QID" ]] && { echo "Usage: $0 EUDPA-XXXXX --question-id Q3 --answer-file FILE [--skipped]" >&2; exit 1; }

CHECK_DIR="$HOME/git/defra/trade-imports-workspace/workareas/understanding-checks/$TICKET"
questions="$CHECK_DIR/questions.json"
target="$CHECK_DIR/transcript.json"

[[ -f "$questions" ]] || { echo "Error: $questions not found" >&2; exit 1; }

q_exists=$(jq --arg id "$QID" '.questions | map(.id == $id) | any' "$questions")
if [[ "$q_exists" != "true" ]]; then
    echo "Error: question $QID does not exist in $questions" >&2
    exit 1
fi

if [[ ! -f "$target" ]]; then
    jq -n --arg ticket "$TICKET" '{ ticket: $ticket, entries: [] }' > "$target"
fi

answer_text=""
if [[ "$SKIPPED" == "false" ]]; then
    [[ -z "$ANSWER_FILE" ]] && { echo "Error: --answer-file required unless --skipped" >&2; exit 1; }
    [[ -f "$ANSWER_FILE" ]] || { echo "Error: $ANSWER_FILE not found" >&2; exit 1; }
    answer_text=$(cat "$ANSWER_FILE")
    if [[ -z "$answer_text" ]]; then
        SKIPPED=true
    fi
fi

answered_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq \
    --arg qid "$QID" \
    --arg answer "$answer_text" \
    --arg answered_at "$answered_at" \
    --argjson skipped "$([[ "$SKIPPED" == "true" ]] && echo true || echo false)" \
    '
    .entries = (
        # Drop any existing entry for this question id, then append fresh.
        (.entries | map(select(.question_id != $qid)))
        + [{
            question_id: $qid,
            answered_at: $answered_at,
            answer: $answer,
            skipped: $skipped,
            score: null
        }]
    )' \
    "$target" > "$target.tmp"
mv "$target.tmp" "$target"

if [[ "$SKIPPED" == "true" ]]; then
    echo "Recorded skip for $QID."
else
    echo "Recorded answer for $QID (${#answer_text} chars)."
fi
