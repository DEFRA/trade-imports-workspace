#!/bin/bash
# Apply the deterministic verdict rule (assets/verdict-rule.md) and stamp
# verdict + verdict_reason + completed_at + exit_code onto
# .interview-meta.json.
#
# Usage: finalize-verdict.sh EUDPA-XXXXX [--json]
#
# Exit codes (the skill's contract): 0 pass, 1 needs-review, 2 high-risk.

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
meta="$CHECK_DIR/.interview-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found" >&2; exit 1; }

counts_json=$("$HOME/git/defra/trade-imports-workspace/tools/understanding-check/counts.sh" "$TICKET" --json)

# Apply the rule, first match wins:
#   FAIL >= 3 OR security_fails >= 1 -> high-risk (2)
#   FAIL >= 1 OR PARTIAL >= 3        -> needs-review (1)
#   coverage_gaps >= 1               -> needs-review (1)
#   otherwise                        -> pass (0)
verdict_json=$(echo "$counts_json" | jq '
    . as $c
    | if ($c.FAIL >= 3 or $c.security_fails >= 1)
        then { verdict: "high-risk", exit: 2,
               reason: (if $c.security_fails >= 1
                        then "security-category FAIL (\($c.security_fails))"
                        else "FAIL count >= 3 (\($c.FAIL))" end) }
      elif ($c.FAIL >= 1 or $c.PARTIAL >= 3)
        then { verdict: "needs-review", exit: 1,
               reason: (if $c.FAIL >= 1
                        then "FAIL count \($c.FAIL)"
                        else "PARTIAL count \($c.PARTIAL) (>= 3)" end) }
      elif ($c.coverage_gaps >= 1)
        then { verdict: "needs-review", exit: 1,
               reason: "coverage gaps (\($c.coverage_gaps))" }
      else { verdict: "pass", exit: 0, reason: "no FAIL/PARTIAL threshold, no coverage gaps" }
      end
')

verdict=$(echo "$verdict_json" | jq -r '.verdict')
exit_code=$(echo "$verdict_json" | jq -r '.exit')
reason=$(echo "$verdict_json" | jq -r '.reason')

completed_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq \
    --arg verdict "$verdict" \
    --arg reason "$reason" \
    --argjson exit_code "$exit_code" \
    --arg completed_at "$completed_at" \
    --argjson counts "$counts_json" \
    '.verdict = $verdict
     | .verdict_reason = $reason
     | .exit_code = $exit_code
     | .completed_at = $completed_at
     | .counts = $counts' \
    "$meta" > "$meta.tmp"
mv "$meta.tmp" "$meta"

if [[ "$JSON_OUT" == "true" ]]; then
    echo "$verdict_json"
else
    echo "Verdict for $TICKET: $verdict (exit $exit_code)"
    echo "Reason: $reason"
    echo "Meta:   $meta"
fi

exit "$exit_code"
