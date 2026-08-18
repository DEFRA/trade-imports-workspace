#!/bin/bash
# Print PASS / PARTIAL / FAIL counts (overall and by category).
# Used as a diagnostic and as input to finalize-verdict.sh.
#
# Usage: counts.sh EUDPA-XXXXX [--json]

set -e

TICKET=""; JSON_OUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --json) JSON_OUT=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$TICKET" ]] && { echo "Usage: $0 EUDPA-XXXXX [--json]" >&2; exit 1; }

CHECK_DIR="$HOME/git/defra/trade-imports-workspace/workareas/understanding-checks/$TICKET"
questions="$CHECK_DIR/questions.json"
transcript="$CHECK_DIR/transcript.json"
meta="$CHECK_DIR/.interview-meta.json"

for f in "$questions" "$transcript" "$meta"; do
    [[ -f "$f" ]] || { echo "Error: $f not found" >&2; exit 1; }
done

# Build a category-by-id lookup from questions.json, then count.
result=$(jq -n \
    --slurpfile q "$questions" \
    --slurpfile t "$transcript" \
    --slurpfile m "$meta" \
    '
    ($q[0].questions | map({ key: .id, value: .category }) | from_entries) as $cat
    | $t[0].entries as $entries
    | ($entries | map(.score.verdict // "PENDING")) as $verdicts
    | {
        total: ($entries | length),
        PASS:    ($verdicts | map(select(. == "PASS"))    | length),
        PARTIAL: ($verdicts | map(select(. == "PARTIAL")) | length),
        FAIL:    ($verdicts | map(select(. == "FAIL"))    | length),
        PENDING: ($verdicts | map(select(. == "PENDING")) | length),
        security_fails: (
            $entries
            | map(select(.score.verdict == "FAIL" and $cat[.question_id] == "security"))
            | length
        ),
        coverage_gaps: ($m[0].coverage_gaps | length),
        by_category: (
            $entries
            | map({ category: $cat[.question_id], verdict: (.score.verdict // "PENDING") })
            | group_by(.category)
            | map({
                key: .[0].category,
                value: {
                    PASS:    map(select(.verdict == "PASS"))    | length,
                    PARTIAL: map(select(.verdict == "PARTIAL")) | length,
                    FAIL:    map(select(.verdict == "FAIL"))    | length,
                    PENDING: map(select(.verdict == "PENDING")) | length
                }
            })
            | from_entries
        )
    }
    ')

if [[ "$JSON_OUT" == "true" ]]; then
    echo "$result"
else
    echo "Counts for $TICKET:"
    echo "$result" | jq -r '
        "  Total:    \(.total)",
        "  PASS:     \(.PASS)",
        "  PARTIAL:  \(.PARTIAL)",
        "  FAIL:     \(.FAIL)",
        "  PENDING:  \(.PENDING)",
        "  Security FAILs:  \(.security_fails)",
        "  Coverage gaps:   \(.coverage_gaps)",
        "",
        "By category:",
        (.by_category | to_entries[] | "  \(.key): PASS=\(.value.PASS) PARTIAL=\(.value.PARTIAL) FAIL=\(.value.FAIL) PENDING=\(.value.PENDING)")
    '
fi
