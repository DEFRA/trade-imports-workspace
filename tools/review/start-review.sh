#!/bin/bash
# Start a review — detects FRESH vs REFRESH and dispatches to the
# appropriate first-step setup script.
#
# Usage: start-review.sh EUDPA-XXXXX [--json]
#
# FRESH (no prior review): runs prepare-review.sh.
# REFRESH (review-index.md exists): runs refresh/scope.sh --write-snapshot.
#
# Prints `MODE: FRESH` or `MODE: REFRESH` on the first line so the
# caller can branch without re-detecting.

set -e

TICKET="${1:-}"
shift || true

if [[ -z "$TICKET" ]] || [[ "$TICKET" == "-h" ]] || [[ "$TICKET" == "--help" ]]; then
    echo "Usage: $0 EUDPA-XXXXX [extra args forwarded to the setup script]" >&2
    exit 1
fi

REVIEW_DIR="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"

if [[ -f "$REVIEW_DIR/review-index.md" ]]; then
    echo "MODE: REFRESH"
    echo
    exec "$HOME/git/defra/trade-imports-workspace/tools/review/refresh/scope.sh" "$TICKET" --write-snapshot "$@"
else
    echo "MODE: FRESH"
    echo
    exec "$HOME/git/defra/trade-imports-workspace/tools/review/prepare-review.sh" "$TICKET" "$@"
fi
