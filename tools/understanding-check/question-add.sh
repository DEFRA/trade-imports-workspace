#!/bin/bash
# Append a question to questions.json. Enforces:
#   - all 8 required fields present,
#   - total ≤ 12,
#   - rubric.PASS/PARTIAL contain a categorical verb ("names", "identifies",
#     "explains", "describes", "cites", "distinguishes", "contrasts",
#     "enumerates"), not hedged phrasing.
#
# Usage:
#   question-add.sh EUDPA-XXXXX \
#       --category <enum> \
#       --prompt "..." \
#       --anchor-file FILE --anchor-lines LINES \
#       --expected-concepts "c1,c2,c3" \
#       --rubric-pass "..." \
#       --rubric-partial "..." \
#       --rubric-fail "..."
#
# Prints the assigned id (Q1, Q2, ...).

set -e

TICKET=""; CATEGORY=""; PROMPT=""
ANCHOR_FILE=""; ANCHOR_LINES=""
CONCEPTS=""
RUBRIC_PASS=""; RUBRIC_PARTIAL=""; RUBRIC_FAIL=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --category) CATEGORY="$2"; shift 2 ;;
        --prompt) PROMPT="$2"; shift 2 ;;
        --anchor-file) ANCHOR_FILE="$2"; shift 2 ;;
        --anchor-lines) ANCHOR_LINES="$2"; shift 2 ;;
        --expected-concepts) CONCEPTS="$2"; shift 2 ;;
        --rubric-pass) RUBRIC_PASS="$2"; shift 2 ;;
        --rubric-partial) RUBRIC_PARTIAL="$2"; shift 2 ;;
        --rubric-fail) RUBRIC_FAIL="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in TICKET CATEGORY PROMPT ANCHOR_FILE ANCHOR_LINES CONCEPTS RUBRIC_PASS RUBRIC_PARTIAL RUBRIC_FAIL; do
    [[ -z "${!v}" ]] && { echo "Error: missing required arg $v" >&2; exit 1; }
done

case "$CATEGORY" in
    architecture|implementation|scenario|debugging|test-coverage|operability|security) ;;
    *) echo "Error: invalid --category '$CATEGORY'" >&2; exit 1 ;;
esac

# Categorical-rubric gate: PASS and PARTIAL must contain one of the
# allowlisted verbs. Anti-pattern: "demonstrates good understanding",
# "shows", "appears to know".
categorical_re='\b(names|identifies|explains|describes|cites|distinguishes|contrasts|enumerates)\b'
if ! echo "$RUBRIC_PASS" | grep -Eiq "$categorical_re"; then
    echo "Error: --rubric-pass must contain one of: names | identifies | explains | describes | cites | distinguishes | contrasts | enumerates" >&2
    echo "Got: '$RUBRIC_PASS'" >&2
    exit 1
fi
if ! echo "$RUBRIC_PARTIAL" | grep -Eiq "$categorical_re"; then
    echo "Error: --rubric-partial must contain one of: names | identifies | explains | describes | cites | distinguishes | contrasts | enumerates" >&2
    echo "Got: '$RUBRIC_PARTIAL'" >&2
    exit 1
fi

CHECK_DIR="$HOME/git/defra/trade-imports-workspace/workareas/understanding-checks/$TICKET"
target="$CHECK_DIR/questions.json"

if [[ ! -f "$target" ]]; then
    [[ -d "$CHECK_DIR" ]] || { echo "Error: $CHECK_DIR not found — run prepare-check.sh first" >&2; exit 1; }
    generated_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    jq -n \
        --arg ticket "$TICKET" \
        --arg generated_at "$generated_at" \
        '{ ticket: $ticket, generated_at: $generated_at, questions: [] }' > "$target"
fi

current_count=$(jq '.questions | length' "$target")
if [[ "$current_count" -ge 12 ]]; then
    echo "Error: question cap (12) already reached" >&2
    exit 1
fi

next_num=$((current_count + 1))
next_id="Q$next_num"

# Build expectedConcepts array from comma-separated string.
concepts_json=$(jq -n --arg s "$CONCEPTS" '$s | split(",") | map(select(length>0)) | map(. | sub("^\\s+"; "") | sub("\\s+$"; ""))')

jq \
    --arg id "$next_id" \
    --arg category "$CATEGORY" \
    --arg prompt "$PROMPT" \
    --arg anchor_file "$ANCHOR_FILE" \
    --arg anchor_lines "$ANCHOR_LINES" \
    --argjson concepts "$concepts_json" \
    --arg pass "$RUBRIC_PASS" \
    --arg partial "$RUBRIC_PARTIAL" \
    --arg fail "$RUBRIC_FAIL" \
    '.questions += [{
        id: $id,
        category: $category,
        prompt: $prompt,
        anchorEvidence: { file: $anchor_file, lines: $anchor_lines },
        expectedConcepts: $concepts,
        rubric: { PASS: $pass, PARTIAL: $partial, FAIL: $fail }
    }]' \
    "$target" > "$target.tmp"
mv "$target.tmp" "$target"

echo "$next_id"
