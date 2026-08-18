#!/bin/bash
# Start an understanding-check — detects FRESH vs RESUME and dispatches
# to the appropriate first step.
#
# Usage: start-check.sh EUDPA-XXXXX [--json]
#
# FRESH (no prior state): runs prepare-check.sh.
# RESUME (.interview-meta.json exists): prints the state and lets the
#   parent session jump to the next pending step.
#
# Prints `MODE: FRESH` or `MODE: RESUME` on the first line.

set -e

TICKET="${1:-}"
shift || true

if [[ -z "$TICKET" ]] || [[ "$TICKET" == "-h" ]] || [[ "$TICKET" == "--help" ]]; then
    echo "Usage: $0 EUDPA-XXXXX [--json]" >&2
    exit 1
fi

CHECK_DIR="$HOME/git/defra/trade-imports-workspace/workareas/understanding-checks/$TICKET"
META="$CHECK_DIR/.interview-meta.json"

if [[ -f "$META" ]]; then
    echo "MODE: RESUME"
    echo
    echo "Existing run found at: $CHECK_DIR"
    echo "Meta:"
    cat "$META"
    echo
    echo "Inspect the directory and resume from the next pending step (see SKILL.md Step 0)."
    exit 0
fi

echo "MODE: FRESH"
echo
exec "$HOME/git/defra/trade-imports-workspace/tools/understanding-check/prepare-check.sh" "$TICKET" "$@"
