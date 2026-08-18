#!/bin/bash
# Get a single file's hunks from a PR diff.
# Usage: ./file-diff.sh REPO PR_NUMBER FILE_PATH [--ticket EUDPA-X]
# Example: ./file-diff.sh trade-imports-animals-frontend 1234 src/server/router.js
#
# If --ticket is provided AND the workareas diff cache exists at
# $HOME/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-X/.diffs/REPO.diff,
# reads from there instead of hitting `gh pr diff`. With 100 parallel
# file-reviewers, this avoids hammering the GitHub API.
#
# Without --ticket (or if the cache is missing), falls back to
# `gh pr diff` over the network.
#
# Filters output to the `diff --git` block for the requested file,
# matching either side of the header so renamed files resolve by their
# old or new path. Exit 0 with empty output if the file is not in the
# diff.

set -e

REPO=""
PR_NUMBER=""
FILE_PATH=""
TICKET=""

POSITIONAL=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --ticket) TICKET="$2"; shift 2 ;;
        -*) echo "Unknown option: $1" >&2; exit 1 ;;
        *) POSITIONAL+=("$1"); shift ;;
    esac
done

REPO="${POSITIONAL[0]:-}"
PR_NUMBER="${POSITIONAL[1]:-}"
FILE_PATH="${POSITIONAL[2]:-}"

if [[ -z "$REPO" ]] || [[ -z "$PR_NUMBER" ]] || [[ -z "$FILE_PATH" ]]; then
    echo "Usage: ./file-diff.sh REPO PR_NUMBER FILE_PATH [--ticket EUDPA-X]" >&2
    echo "Example: ./file-diff.sh trade-imports-animals-frontend 1234 src/server/router.js --ticket EUDPA-134" >&2
    exit 1
fi

source_cmd=()
if [[ -n "$TICKET" ]]; then
    cache="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/.diffs/$REPO.diff"
    if [[ -s "$cache" ]]; then
        source_cmd=( cat "$cache" )
    fi
fi

if [[ ${#source_cmd[@]} -eq 0 ]]; then
    source_cmd=( gh pr diff "$PR_NUMBER" --repo "DEFRA/$REPO" )
fi

"${source_cmd[@]}" | awk -v f="$FILE_PATH" '
    /^diff --git / {
        # A rename carries a different path each side, so match either one.
        if (NF == 4)
            in_block = (substr($3, 3) == f || substr($4, 3) == f)
        else
            in_block = ($0 ~ ("a/" f "[[:space:]]") && $0 ~ ("b/" f "$"))
    }
    in_block { print }
'
