#!/bin/bash
# Start a code-style review — detects FRESH vs REFRESH and dispatches
# to the appropriate first-step setup script.
#
# Usage: start-style.sh EUDPA-XXXXX [extra args forwarded to setup]
#        start-style.sh --local REPO BRANCH [--files F1,F2,...] [--json]
#
# FRESH (no prior style review): runs prepare-style.sh.
# REFRESH (.style-meta.json exists): runs refresh/scope.sh --write-snapshot.
#
# --local (a branch key instead of a ticket — "style review this branch",
# or the programmatic `REPO:BRANCH` form) skips Jira and GitHub entirely:
# it always runs prepare-style-local.sh, which recomputes the changed-file
# list from git (or the caller's own --files) fresh every call — local
# mode has no ticket/PR boundary to refresh against, so re-running IS the
# refresh. State lands under workareas/code-style-reviews/local/REPO/BRANCH/.
#
# Prints `MODE: FRESH` or `MODE: REFRESH` on the first line so the
# caller can branch without re-detecting.
#
# Note: IMPLEMENT and WALK are separate top-level skill triggers — they
# do NOT route through this dispatcher. See SKILL.md "Workflow modes".

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${1:-}" == "--local" ]]; then
    shift
    echo "MODE: FRESH"
    echo
    exec "$SCRIPT_DIR/prepare-style-local.sh" "$@"
fi

TICKET="${1:-}"
shift || true

if [[ -z "$TICKET" ]] || [[ "$TICKET" == "-h" ]] || [[ "$TICKET" == "--help" ]]; then
    echo "Usage: $0 EUDPA-XXXXX [extra args forwarded to the setup script]" >&2
    echo "       $0 --local REPO BRANCH [--files F1,F2,...] [--json]" >&2
    exit 1
fi

STYLE_META="$HOME/git/defra/trade-imports-workspace/workareas/code-style-reviews/$TICKET/.style-meta.json"

if [[ -f "$STYLE_META" ]]; then
    echo "MODE: REFRESH"
    echo
    exec "$SCRIPT_DIR/refresh/scope.sh" "$TICKET" --write-snapshot "$@"
else
    echo "MODE: FRESH"
    echo
    exec "$SCRIPT_DIR/prepare-style.sh" "$TICKET" "$@"
fi
