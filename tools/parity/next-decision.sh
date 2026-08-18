#!/bin/bash
# Pop the next undecided increment for a given gate, newest-blocking-first.
#
# A gated increment is born blocked so the build loop never pops it. This is the
# other half of that: it walks the gated items so they can be ruled on, one at a
# time, with the evidence in front of you.
#
# Usage:
#   next-decision.sh EUDPA-X [--gate sam] [--domain germinal-products] [--json]
#
# Exits 3 when nothing is left to rule on for that gate.

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; GATE="sam"; DOMAIN=""; AS_JSON=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --gate) GATE="$2"; shift 2 ;;
        --domain) DOMAIN="$2"; shift 2 ;;
        --json) AS_JSON=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-X [--gate sam] [--domain D] [--json]" >&2; exit 1; }

target="$WORKSPACE/workareas/journey-builder/$RUN_ID/backlog.json"
[[ -f "$target" ]] || { echo "Error: $target not found" >&2; exit 1; }

next=$(jq --arg gate "$GATE" --arg domain "$DOMAIN" '
    [ .increments[]
      | select(.status == "blocked")
      | select(.gate == $gate)
      | select(.decision == null or (.decision | not))
      | select($domain == "" or .domain == $domain)
    ] | first // empty' "$target")

if [[ -z "$next" ]]; then
    echo "No undecided '$GATE' increments left${DOMAIN:+ in domain $DOMAIN}." >&2
    exit 3
fi

if [[ "$AS_JSON" == true ]]; then
    echo "$next"
    exit 0
fi

# Human-readable: the point of the walker is to make a ruling cheap, so lead with
# what the decision actually turns on rather than the full record.
jq -r '
    "\(.id)  [\(.domain)]  \(.type)\n" +
    "\n\(.title)\n" +
    "\n" + (.detail // "") + "\n" +
    (if ((.notes // []) | length) > 0 then
        "\nSINCE THE CORPUS WAS CAPTURED:\n"
        + ((.notes | map("  - \(.note)  [\(.at)]")) | join("\n")) + "\n"
     else "" end) +
    "\nFrontend:  \(.evidence.frontend)" +
    "\nPrototype: \(.evidence.prototype)" +
    "\nScreens:   \((.screens // []) | join(", "))" +
    "\nConfidence: \(.confidence)"
' <<<"$next"

remaining=$(jq --arg gate "$GATE" --arg domain "$DOMAIN" '
    [ .increments[]
      | select(.status == "blocked") | select(.gate == $gate)
      | select(.decision == null or (.decision | not))
      | select($domain == "" or .domain == $domain)
    ] | length' "$target")

echo ""
echo "— $remaining left to rule on${DOMAIN:+ in $DOMAIN} —"
