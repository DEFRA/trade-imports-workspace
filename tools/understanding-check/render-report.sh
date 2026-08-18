#!/bin/bash
# Render the understanding-check report.
#
# Usage:
#   render-report.sh EUDPA-XXXXX           # full report → report.md
#   render-report.sh EUDPA-XXXXX --preview # plan-gate preview → stdout
#
# Full report has 10 sections (see assets/verdict-rule.md). Preview
# contains only the header + analysis summary + question set (no
# transcript, no verdict, no PR comment).

set -e

TICKET=""; PREVIEW=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --preview) PREVIEW=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$TICKET" ]] && { echo "Usage: $0 EUDPA-XXXXX [--preview]" >&2; exit 1; }

CHECK_DIR="$HOME/git/defra/trade-imports-workspace/workareas/understanding-checks/$TICKET"
meta="$CHECK_DIR/.interview-meta.json"
questions="$CHECK_DIR/questions.json"

[[ -f "$meta" ]] || { echo "Error: $meta not found" >&2; exit 1; }

if [[ "$PREVIEW" == "true" ]]; then
    [[ -f "$questions" ]] || { echo "Error: $questions not found — generate questions first" >&2; exit 1; }
    summary=$(jq -r '.summary // ""' "$meta")
    echo "# Understanding check — preview (plan gate)"
    echo
    echo "**Ticket:** $TICKET — $summary"
    echo
    echo "## Per-repo analysis summary"
    echo
    for analysis in "$CHECK_DIR"/analysis.*.json; do
        [[ -f "$analysis" ]] || continue
        repo=$(jq -r '.repo' "$analysis")
        echo "### $repo"
        jq -r '
            "- keyDesignDecisions: \(.keyDesignDecisions | length)",
            "- edgeCases: \(.edgeCases | length)",
            "- failureModes: \(.failureModes | length)",
            "- securityRisks: \(.securityRisks | length)",
            "- dataOrApiChanges: \(.dataOrApiChanges | length)",
            "- testCoverageNotes: \(.testCoverageNotes | length)",
            "- aiSuspectedRegions: \(.aiSuspectedRegions | length)"
        ' "$analysis"
        echo
    done
    echo "## Question set ($(jq '.questions | length' "$questions") questions)"
    echo
    jq -r '
        .questions[] |
        "### \(.id) — [\(.category)]\n\n" +
        "**Prompt:** \(.prompt)\n\n" +
        "**Anchor:** `\(.anchorEvidence.file):\(.anchorEvidence.lines)`\n\n" +
        "**Expected concepts:** \(.expectedConcepts | join(", "))\n\n" +
        "**Rubric**\n" +
        "- PASS: \(.rubric.PASS)\n" +
        "- PARTIAL: \(.rubric.PARTIAL)\n" +
        "- FAIL: \(.rubric.FAIL)\n"
    ' "$questions"
    exit 0
fi

# --- Full report ---
transcript="$CHECK_DIR/transcript.json"
out="$CHECK_DIR/report.md"

[[ -f "$transcript" ]] || { echo "Error: $transcript not found — finish the interview first" >&2; exit 1; }

verdict=$(jq -r '.verdict // "(not finalised)"' "$meta")
verdict_reason=$(jq -r '.verdict_reason // ""' "$meta")
exit_code=$(jq -r '.exit_code // "?"' "$meta")
summary=$(jq -r '.summary // ""' "$meta")
created_at=$(jq -r '.created_at // ""' "$meta")
completed_at=$(jq -r '.completed_at // ""' "$meta")

{
    echo "# Understanding check — $TICKET"
    echo
    echo "## 1. Header"
    echo
    echo "- **Ticket:** $TICKET — $summary"
    echo "- **Run started:** $created_at"
    echo "- **Run finished:** $completed_at"
    echo "- **PRs:**"
    jq -r '.prs[] | "  - \(.repo)#\(.pr) (\(.state), commit \(.commit[0:7]))"' "$meta"
    echo

    echo "## 2. Ticket summary"
    echo
    # First non-metadata paragraph from ticket.md, fall back to summary.
    if [[ -f "$CHECK_DIR/ticket.md" ]]; then
        awk '/^## Description/{flag=1; next} /^## /{flag=0} flag' "$CHECK_DIR/ticket.md" | head -n 20
    else
        echo "$summary"
    fi
    echo

    echo "## 3. Change summary"
    echo
    for analysis in "$CHECK_DIR"/analysis.*.json; do
        [[ -f "$analysis" ]] || continue
        repo=$(jq -r '.repo' "$analysis")
        echo "### $repo"
        echo
        jq -r '"**What:** \(.changeSummary // "(missing)")\n\n**Why:** \(.whyItChanged // "(missing)")"' "$analysis"
        echo
    done

    echo "## 4. Merge recommendation"
    echo
    echo "- **Verdict:** \`$verdict\`"
    echo "- **Exit code:** $exit_code"
    echo "- **Deciding rule:** $verdict_reason"
    echo

    echo "## 5. Per-question table"
    echo
    echo "| ID | Category | Verdict | Rubric clause | Gap |"
    echo "|---|---|---|---|---|"
    jq -n \
        --slurpfile q "$questions" \
        --slurpfile t "$transcript" \
        -r '
        ($q[0].questions | map({key: .id, value: {category: .category, prompt: .prompt}}) | from_entries) as $byId
        | $t[0].entries[] |
        "| \(.question_id) | \($byId[.question_id].category) | \(.score.verdict // "PENDING") | \(.score.rubric_match // "" | gsub("\\|"; "\\\\|")) | \((.score.missed_concepts // []) | join(", ") | gsub("\\|"; "\\\\|")) |"
        '
    echo

    echo "## 6. Full transcript"
    echo
    jq -n \
        --slurpfile q "$questions" \
        --slurpfile t "$transcript" \
        -r '
        ($q[0].questions | map({key: .id, value: .}) | from_entries) as $byId
        | $t[0].entries[] |
        "### \(.question_id) — [\($byId[.question_id].category)]\n\n" +
        "**Prompt:** \($byId[.question_id].prompt)\n\n" +
        "**Anchor:** `\($byId[.question_id].anchorEvidence.file):\($byId[.question_id].anchorEvidence.lines)`\n\n" +
        "**Developer answer:**\n\n```\n\(.answer)\n```\n\n" +
        "**Score:**\n\n```json\n\(.score | tojson)\n```\n"
        '
    echo

    echo "## 7. Gaps in understanding"
    echo
    jq -r '
        [.entries[].score.missed_concepts // [] | .[]]
        | unique
        | map("- \(.)")
        | .[]
    ' "$transcript"
    echo

    echo "## 8. Suggested follow-up learning"
    echo
    jq -n \
        --slurpfile q "$questions" \
        --slurpfile t "$transcript" \
        -r '
        ($q[0].questions | map({key: .id, value: .}) | from_entries) as $byId
        | $t[0].entries
        | map(select(.score.follow_up != null and .score.follow_up != ""))
        | map("- (\($byId[.question_id].anchorEvidence.file):\($byId[.question_id].anchorEvidence.lines)) \(.score.follow_up)")
        | .[]
        '
    echo

    echo "## 9. Coverage gaps"
    echo
    redactions=$(jq -r '.redaction_summary.matches // 0' "$meta")
    redacted_files=$(jq -r '.redaction_summary.files // 0' "$meta")
    echo "Redacted $redactions match(es) across $redacted_files file(s) at prepare time (matched substrings never logged)."
    echo
    jq -r '.coverage_gaps[]? | "- \(.)"' "$meta"
    echo

    echo "## 10. Paste-ready PR comment"
    echo
    echo "\`\`\`markdown"
    echo "**Understanding check — $TICKET**"
    echo
    echo "Verdict: \`$verdict\` ($verdict_reason)"
    echo
    pass_count=$(jq '[.entries[] | select(.score.verdict == "PASS")] | length' "$transcript")
    partial_count=$(jq '[.entries[] | select(.score.verdict == "PARTIAL")] | length' "$transcript")
    fail_count=$(jq '[.entries[] | select(.score.verdict == "FAIL")] | length' "$transcript")
    echo "Counts: PASS=$pass_count, PARTIAL=$partial_count, FAIL=$fail_count"
    echo
    gaps=$(jq -r '[.entries[].score.missed_concepts // [] | .[]] | unique | join(", ")' "$transcript")
    if [[ -n "$gaps" ]] && [[ "$gaps" != "" ]]; then
        echo "Author concept gaps to revisit: $gaps"
        echo
    fi
    echo "_This score is a coaching signal, not a gate. Reviewer judgement overrides._"
    echo "\`\`\`"
} > "$out"

echo "Wrote: $out"
