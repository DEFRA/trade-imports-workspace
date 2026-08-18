#!/bin/bash
# Gate before finalize-verdict.sh. Exit non-zero if:
#   - Any question has no answer recorded.
#   - Any answered question has no score.
#   - Any analysis finding is missing evidence (shouldn't happen — the
#     helpers reject these — but a defence-in-depth check).
#   - No analysis files exist for any of the meta.prs[].repo names.
#
# Usage: verify-coverage.sh EUDPA-XXXXX [--json]

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

errors=()

[[ -f "$meta" ]] || errors+=("meta file missing: $meta")
[[ -f "$questions" ]] || errors+=("questions.json missing")
[[ -f "$transcript" ]] || errors+=("transcript.json missing")

if [[ ${#errors[@]} -eq 0 ]]; then
    # Every meta.prs[].repo must have an analysis.<repo>.json with verdict=complete.
    repos=$(jq -r '.prs[].repo' "$meta")
    while IFS= read -r repo; do
        [[ -z "$repo" ]] && continue
        analysis="$CHECK_DIR/analysis.$repo.json"
        if [[ ! -f "$analysis" ]]; then
            errors+=("analysis missing for repo: $repo")
            continue
        fi
        v=$(jq -r '.verdict // "null"' "$analysis")
        if [[ "$v" != "complete" ]]; then
            errors+=("analysis verdict not complete: $repo")
        fi
        # Defence-in-depth: any finding lacking evidence.
        missing_ev=$(jq '
            [keyDesignDecisions, edgeCases, failureModes, securityRisks, dataOrApiChanges, testCoverageNotes, aiSuspectedRegions]
            | flatten
            | map(select(.evidence == null or .evidence.file == null or .evidence.file == "" or .evidence.lines == null or .evidence.lines == ""))
            | length
        ' "$analysis")
        if [[ "$missing_ev" -gt 0 ]]; then
            errors+=("$missing_ev finding(s) without evidence in $repo")
        fi
    done <<< "$repos"

    # Every question must have an answered, scored entry.
    pending=$(jq -n \
        --slurpfile q "$questions" \
        --slurpfile t "$transcript" \
        '
        ($q[0].questions | map(.id)) as $qids
        | ($t[0].entries | map(.question_id)) as $aids
        | ($qids - $aids) as $unanswered
        | ($t[0].entries | map(select(.score == null) | .question_id)) as $unscored
        | { unanswered: $unanswered, unscored: $unscored }
        ')
    unanswered_count=$(echo "$pending" | jq '.unanswered | length')
    unscored_count=$(echo "$pending" | jq '.unscored | length')
    if [[ "$unanswered_count" -gt 0 ]]; then
        ua=$(echo "$pending" | jq -r '.unanswered | join(",")')
        errors+=("unanswered questions: $ua")
    fi
    if [[ "$unscored_count" -gt 0 ]]; then
        us=$(echo "$pending" | jq -r '.unscored | join(",")')
        errors+=("unscored answers: $us")
    fi
fi

if [[ "$JSON_OUT" == "true" ]]; then
    jq -n --argjson errors "$(printf '%s\n' "${errors[@]:-}" | jq -R . | jq -s '. - [""]')" \
        '{ ok: ($errors | length == 0), errors: $errors }'
else
    if [[ ${#errors[@]} -eq 0 ]]; then
        echo "Coverage OK for $TICKET"
    else
        echo "Coverage gaps:" >&2
        for e in "${errors[@]}"; do echo "  - $e" >&2; done
    fi
fi

[[ ${#errors[@]} -eq 0 ]] || exit 1
