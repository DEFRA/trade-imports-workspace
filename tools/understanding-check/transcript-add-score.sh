#!/bin/bash
# Append a score for one question. The SCORER persona MUST quote the
# rubric clause that decided the verdict in --rubric-match. If the
# scorer cannot quote a clause (passes "<unscorable>" or an empty
# string), the helper forces verdict=FAIL and missed_concepts=["unscorable"].
#
# Usage:
#   transcript-add-score.sh EUDPA-XXXXX \
#       --question-id Q3 \
#       --verdict <PASS|PARTIAL|FAIL> \
#       --rubric-match "<quoted clause>" \
#       --missed-concepts "tag1,tag2" \
#       --evidence-cited file:lines[,file:lines...] \
#       [--follow-up "..."]

set -e

TICKET=""; QID=""; VERDICT=""; RUBRIC_MATCH=""
MISSED=""; EVIDENCE=""; FOLLOW_UP=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --question-id) QID="$2"; shift 2 ;;
        --verdict) VERDICT="$2"; shift 2 ;;
        --rubric-match) RUBRIC_MATCH="$2"; shift 2 ;;
        --missed-concepts) MISSED="$2"; shift 2 ;;
        --evidence-cited) EVIDENCE="$2"; shift 2 ;;
        --follow-up) FOLLOW_UP="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in TICKET QID VERDICT EVIDENCE; do
    [[ -z "${!v}" ]] && { echo "Error: missing required arg $v" >&2; exit 1; }
done

case "$VERDICT" in PASS|PARTIAL|FAIL) ;; *) echo "Error: --verdict must be PASS|PARTIAL|FAIL" >&2; exit 1 ;; esac

CHECK_DIR="$HOME/git/defra/trade-imports-workspace/workareas/understanding-checks/$TICKET"
questions="$CHECK_DIR/questions.json"
target="$CHECK_DIR/transcript.json"

[[ -f "$questions" ]] || { echo "Error: $questions not found" >&2; exit 1; }
[[ -f "$target" ]] || { echo "Error: $target not found — record an answer first" >&2; exit 1; }

# Unscorable guard. If --rubric-match is empty, "<unscorable>", or doesn't
# share a 6+ char substring with any rubric clause, force FAIL/unscorable.
unscorable=false
if [[ -z "$RUBRIC_MATCH" ]] || [[ "$RUBRIC_MATCH" == "<unscorable>" ]]; then
    unscorable=true
fi

if [[ "$unscorable" == "false" ]]; then
    # Pull the question's rubric clauses and check the match overlaps one of them.
    rubric_clauses=$(jq --arg qid "$QID" -r '
        .questions
        | map(select(.id == $qid))
        | .[0].rubric
        | [.PASS, .PARTIAL, .FAIL]
        | .[]
    ' "$questions")

    # Strip whitespace from candidate and clauses for substring comparison.
    candidate=$(echo "$RUBRIC_MATCH" | tr -s '[:space:]' ' ' | sed -e 's/^ //' -e 's/ $//')
    cand_len=${#candidate}
    overlap=false
    if [[ "$cand_len" -ge 12 ]]; then
        while IFS= read -r clause; do
            [[ -z "$clause" ]] && continue
            clause_norm=$(echo "$clause" | tr -s '[:space:]' ' ' | sed -e 's/^ //' -e 's/ $//')
            # If clause_norm contains candidate as substring (after normalising),
            # OR candidate contains a 12+ char substring of clause_norm, it overlaps.
            if [[ "$clause_norm" == *"$candidate"* ]] || [[ "$candidate" == *"$clause_norm"* ]]; then
                overlap=true
                break
            fi
            # Fallback: 24-char rolling window comparison.
            for ((i=0; i+24<=${#clause_norm}; i+=4)); do
                window="${clause_norm:i:24}"
                if [[ "$candidate" == *"$window"* ]]; then
                    overlap=true
                    break
                fi
            done
            [[ "$overlap" == "true" ]] && break
        done <<< "$rubric_clauses"
    fi
    if [[ "$overlap" == "false" ]]; then
        echo "Warning: --rubric-match does not overlap any clause in $QID's rubric; recording as unscorable." >&2
        unscorable=true
    fi
fi

if [[ "$unscorable" == "true" ]]; then
    VERDICT="FAIL"
    RUBRIC_MATCH="<unscorable>"
    MISSED="unscorable"
fi

missed_json=$(jq -n --arg s "$MISSED" '$s | split(",") | map(select(length>0)) | map(. | sub("^\\s+"; "") | sub("\\s+$"; ""))')

# Parse "file1:lines1,file2:lines2,..." into [{file, lines}, ...].
evidence_json=$(node -e '
const s = process.argv[1] || "";
const out = s.split(",").map(x => x.trim()).filter(Boolean).map(p => {
    const i = p.lastIndexOf(":");
    return i < 0 ? null : { file: p.slice(0, i), lines: p.slice(i + 1) };
}).filter(Boolean);
process.stdout.write(JSON.stringify(out));
' "$EVIDENCE")

scored_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq \
    --arg qid "$QID" \
    --arg verdict "$VERDICT" \
    --arg rubric_match "$RUBRIC_MATCH" \
    --argjson missed "$missed_json" \
    --argjson evidence "$evidence_json" \
    --arg follow_up "$FOLLOW_UP" \
    --arg scored_at "$scored_at" \
    '
    .entries = (.entries | map(
        if .question_id == $qid then
            .score = {
                verdict: $verdict,
                rubric_match: $rubric_match,
                missed_concepts: $missed,
                evidence_cited: $evidence,
                follow_up: (if $follow_up == "" then null else $follow_up end),
                scored_at: $scored_at
            }
        else . end
    ))' \
    "$target" > "$target.tmp"
mv "$target.tmp" "$target"

# Also add an "unscorable" coverage gap to .interview-meta.json if needed.
if [[ "$RUBRIC_MATCH" == "<unscorable>" ]]; then
    meta="$CHECK_DIR/.interview-meta.json"
    if [[ -f "$meta" ]]; then
        jq --arg qid "$QID" '
            .coverage_gaps += [{ kind: "unscorable", question_id: $qid }]
        ' "$meta" > "$meta.tmp"
        mv "$meta.tmp" "$meta"
    fi
fi

echo "Scored $QID: $VERDICT"
