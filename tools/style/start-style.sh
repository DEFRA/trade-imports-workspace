#!/bin/bash
# Start a code-style review — detects FRESH vs REFRESH and dispatches
# to the appropriate first-step setup script.
#
# Usage: start-style.sh EUDPA-XXXXX [extra args forwarded to setup]
#
# FRESH (no prior style review): runs prepare-style.sh.
# REFRESH (.style-meta.json exists): runs refresh/scope.sh --write-snapshot.
#
# Prints `MODE: FRESH` or `MODE: REFRESH` on the first line so the
# caller can branch without re-detecting.
#
# Note: IMPLEMENT and WALK are separate top-level skill triggers — they
# do NOT route through this dispatcher. See SKILL.md "Workflow modes".

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TICKET="${1:-}"
shift || true

if [[ -z "$TICKET" ]] || [[ "$TICKET" == "-h" ]] || [[ "$TICKET" == "--help" ]]; then
    echo "Usage: $0 EUDPA-XXXXX [extra args forwarded to the setup script]" >&2
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
