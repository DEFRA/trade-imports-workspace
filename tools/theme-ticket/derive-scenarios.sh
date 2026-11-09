#!/bin/bash
# Derive a theme's scenarios, spec files and rows, split by domain.
#
# Usage: ./derive-scenarios.sh --workarea <path under workareas/> --theme <id> [--branch <name>] [--link-branch <name>] [--out <file>] [--workspace <dir>]
#
# --workspace defaults to ~/git/defra/trade-imports-workspace. A scenario the theme
# added and a later commit renamed keeps its id and counts, read as it is now. One
# whose id no current spec holds was removed: it is named in warnings, not counted.
#
# --branch is the ref the commits are read from; --link-branch is the ref the spec
# links point at, and defaults to --branch. They differ once a theme has merged: a
# squashed pull request leaves main one commit scoped by the Jira key and none
# scoped by the theme slug, so there is no footprint on main to judge a review
# commit against. Read the theme branch and link to main instead — the scenarios
# are the same either way, because a merge moves commits without rewriting specs.
#
# Prints JSON on stdout, or writes it to --out. Exits non-zero, with the reason
# on stderr, when no commits match the theme, when a spec area has no domain
# mapping, or when the per-domain scenario counts do not sum to the theme total.
#
# Examples:
#   ./derive-scenarios.sh --workarea shared/design-release-2-1 --theme journey-foundation
#   ./derive-scenarios.sh --workarea shared/design-release-2-1 --theme origin-page --out /tmp/origin.json
#   ./derive-scenarios.sh --workarea shared/design-release-2-1 --theme transporters \
#       --branch feat/EUDPA-781-design-release-2-1-transporters --link-branch main

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
    # Write through a temporary file: redirecting straight to --out truncates the
    # previous derivation before node runs, so a failed derive destroyed it.
    TMP="$(mktemp "${TMPDIR:-/tmp}/derive-scenarios.XXXXXX")"
    trap 'rm -f "$TMP"' EXIT
    node "$HERE/derive-scenarios.mjs" "${PASS[@]}" > "$TMP"
    mv "$TMP" "$OUT"
    trap - EXIT
    echo "Wrote $OUT"
else
    node "$HERE/derive-scenarios.mjs" "${PASS[@]}"
fi
