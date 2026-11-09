#!/bin/bash
# Render a domain's acceptance criteria from a derivation, in Jira wiki markup.
#
# Usage: ./render-criteria.sh <derived.json> <groups.json> <domain> [--out <file>]
#
# The criteria must read exactly as the behaviour specification does, so this
# prints each scenario's steps from the derivation rather than leaving them to be
# retyped. The grouping file carries the one judgement a person makes — which
# scenarios the domain's ticket cites, and under which h4 heading:
#
#   { "<domain>": [ { "title": "The transporter list",
#                     "scenarios": ["SCN-TRANSPORTER-005-A"],
#                     "note": "It also applies to ..." } ] }
#
# Exits non-zero when a grouping names a scenario the derivation does not hold,
# or one the derivation recorded as missing from the current spec. Prints to
# stderr how many of the domain's scenarios were cited and names those left out,
# so curation stays a decision someone can read back.
#
# Example:
#   ./render-criteria.sh ../../workareas/shared/design-release-2-1/tickets/derived.json \
#       groups.json ins --out /tmp/ac-ins.txt

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

OUT=""
PASS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --out)
            OUT="$2"
            shift 2
            ;;
        -h|--help)
            grep '^#' "${BASH_SOURCE[0]}" | cut -c3-
            exit 0
            ;;
        *)
            PASS+=("$1")
            shift
            ;;
    esac
done

if [[ -n "$OUT" ]]; then
    # Through a temporary file, so a failed render leaves the last one intact.
    TMP="$(mktemp "${TMPDIR:-/tmp}/render-criteria.XXXXXX")"
    trap 'rm -f "$TMP"' EXIT
    node "$HERE/render-criteria.mjs" "${PASS[@]}" > "$TMP"
    mv "$TMP" "$OUT"
    trap - EXIT
    echo "Wrote $OUT"
else
    node "$HERE/render-criteria.mjs" "${PASS[@]}"
fi
