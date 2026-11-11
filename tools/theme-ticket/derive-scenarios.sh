#!/bin/bash
# Derive a theme's scenarios, spec files and rows, split by domain.
#
# Usage: ./derive-scenarios.sh --workarea <path under workareas/> --theme <id> [--branch <name>] [--commits-from <ref>] [--out <file>] [--workspace <dir>]
#
# --branch is the branch the spec links point at. --commits-from is where the
# theme's row commits are read, and defaults to --branch. Pass the theme branch
# after a squash merge, when main holds one commit and the links belong on main.
# A backlog whose rows carry no theme is one theme: every row is read.
#
# --workspace defaults to ~/git/defra/trade-imports-workspace. A scenario the theme
# added and a later commit renamed keeps its id and counts, read as it is now. One
# whose id no current spec holds was removed: it is named in warnings, not counted.
#
# Prints JSON on stdout, or writes it to --out. Exits non-zero, with the reason
# on stderr, when no commits match the theme, when a spec area has no domain
# mapping, or when the per-domain scenario counts do not sum to the theme total.
#
# Examples:
#   ./derive-scenarios.sh --workarea shared/design-release-2-1 --theme journey-foundation
#   ./derive-scenarios.sh --workarea shared/design-release-2-1 --theme origin-page --out /tmp/origin.json

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
    node "$HERE/derive-scenarios.mjs" "${PASS[@]}" > "$OUT"
    echo "Wrote $OUT"
else
    node "$HERE/derive-scenarios.mjs" "${PASS[@]}"
fi
