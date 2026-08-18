#!/bin/bash
# Replace a question by id. Same field requirements as question-add.sh.
#
# Usage:
#   question-replace.sh EUDPA-XXXXX --id Q3 \
#       --category <enum> --prompt "..." \
#       --anchor-file FILE --anchor-lines LINES \
#       --expected-concepts "c1,c2" \
#       --rubric-pass "..." --rubric-partial "..." --rubric-fail "..."

set -e

TICKET=""; ID=""; CATEGORY=""; PROMPT=""
ANCHOR_FILE=""; ANCHOR_LINES=""
CONCEPTS=""
RUBRIC_PASS=""; RUBRIC_PARTIAL=""; RUBRIC_FAIL=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --id) ID="$2"; shift 2 ;;
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

for v in TICKET ID CATEGORY PROMPT ANCHOR_FILE ANCHOR_LINES CONCEPTS RUBRIC_PASS RUBRIC_PARTIAL RUBRIC_FAIL; do
    [[ -z "${!v}" ]] && { echo "Error: missing required arg $v" >&2; exit 1; }
done

case "$CATEGORY" in
    architecture|implementation|scenario|debugging|test-coverage|operability|security) ;;
    *) echo "Error: invalid --category '$CATEGORY'" >&2; exit 1 ;;
esac

categorical_re='\b(names|identifies|explains|describes|cites|distinguishes|contrasts|enumerates)\b'
if ! echo "$RUBRIC_PASS" | grep -Eiq "$categorical_re"; then
    echo "Error: --rubric-pass must contain a categorical verb (names|identifies|explains|describes|cites|distinguishes|contrasts|enumerates)" >&2
    exit 1
fi
if ! echo "$RUBRIC_PARTIAL" | grep -Eiq "$categorical_re"; then
    echo "Error: --rubric-partial must contain a categorical verb" >&2
    exit 1
fi

target="$HOME/git/defra/trade-imports-workspace/workareas/understanding-checks/$TICKET/questions.json"
[[ -f "$target" ]] || { echo "Error: $target not found" >&2; exit 1; }

found=$(jq --arg id "$ID" '.questions | map(.id == $id) | any' "$target")
if [[ "$found" != "true" ]]; then
    echo "Error: question $ID not found in $target" >&2
    exit 1
fi

concepts_json=$(jq -n --arg s "$CONCEPTS" '$s | split(",") | map(select(length>0)) | map(. | sub("^\\s+"; "") | sub("\\s+$"; ""))')

jq \
    --arg id "$ID" \
    --arg category "$CATEGORY" \
    --arg prompt "$PROMPT" \
    --arg anchor_file "$ANCHOR_FILE" \
    --arg anchor_lines "$ANCHOR_LINES" \
    --argjson concepts "$concepts_json" \
    --arg pass "$RUBRIC_PASS" \
    --arg partial "$RUBRIC_PARTIAL" \
    --arg fail "$RUBRIC_FAIL" \
    '.questions = (.questions | map(
        if .id == $id then
            {
                id: $id,
                category: $category,
                prompt: $prompt,
                anchorEvidence: { file: $anchor_file, lines: $anchor_lines },
                expectedConcepts: $concepts,
                rubric: { PASS: $pass, PARTIAL: $partial, FAIL: $fail }
            }
        else . end
    ))' \
    "$target" > "$target.tmp"
mv "$target.tmp" "$target"

echo "Replaced $ID."
