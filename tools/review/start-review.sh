#!/bin/bash
# Start a review — detects FRESH vs REFRESH and dispatches to the
# appropriate first-step setup script.
#
# Usage: start-review.sh EUDPA-XXXXX [--json]
#        start-review.sh --local REPO BRANCH [--files F1,F2,...] [--json]
#
# FRESH (no prior review): runs prepare-review.sh.
# REFRESH (review-index.md exists): runs refresh/scope.sh --write-snapshot.
#
# --local (a branch key instead of a ticket — "review this branch", or the
# programmatic `REPO:BRANCH` form) skips Jira and GitHub entirely: it always
# runs prepare-review-local.sh, which recomputes the changed-file list from
# git (or the caller's own --files) fresh every call — local mode has no
# ticket/PR boundary to refresh against, so re-running IS the refresh.
# State lands under workareas/reviews/local/REPO/BRANCH/.
#
# Prints `MODE: FRESH` or `MODE: REFRESH` on the first line so the
# caller can branch without re-detecting.

set -e

ROOT="$HOME/git/defra/trade-imports-workspace"

if [[ "${1:-}" == "--local" ]]; then
    shift
    echo "MODE: FRESH"
    echo
    exec "$ROOT/tools/review/prepare-review-local.sh" "$@"
fi

TICKET="${1:-}"
shift || true

if [[ -z "$TICKET" ]] || [[ "$TICKET" == "-h" ]] || [[ "$TICKET" == "--help" ]]; then
    echo "Usage: $0 EUDPA-XXXXX [extra args forwarded to the setup script]" >&2
    echo "       $0 --local REPO BRANCH [--files F1,F2,...] [--json]" >&2
    exit 1
fi

REVIEW_DIR="$ROOT/workareas/reviews/$TICKET"

if [[ -f "$REVIEW_DIR/review-index.md" ]]; then
    echo "MODE: REFRESH"
    echo
    exec "$ROOT/tools/review/refresh/scope.sh" "$TICKET" --write-snapshot "$@"
else
    echo "MODE: FRESH"
    echo
    exec "$ROOT/tools/review/prepare-review.sh" "$TICKET" "$@"
fi
