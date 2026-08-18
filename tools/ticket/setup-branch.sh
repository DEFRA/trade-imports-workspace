#!/bin/bash
# Idempotent branch setup for one repo.
#
# Usage: setup-branch.sh EUDPA-XXXXX --repo REPO --slug SLUG [--base BRANCH] [--json]
#
# Does the four-step branch dance (fetch / checkout base / pull / checkout
# -b feature/EUDPA-X-<slug>) in one allowlisted dispatch so the parent
# session doesn't type four sequential `git -C` calls.
#
# Per feedback_keep_ticket_prefix_on_split_branches.md the EUDPA-* prefix
# is preserved verbatim — the helper never strips it.

set -e

TICKET=""
REPO=""
SLUG=""
BASE="main"
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo)
            REPO="$2"
            shift 2
            ;;
        --slug)
            SLUG="$2"
            shift 2
            ;;
        --base)
            BASE="$2"
            shift 2
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -h|--help)
            sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        EUDPA-*)
            TICKET="$1"
            shift
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

if [[ -z "$TICKET" ]] || [[ -z "$REPO" ]] || [[ -z "$SLUG" ]]; then
    echo "Usage: $0 EUDPA-XXXXX --repo REPO --slug SLUG [--base BRANCH]" >&2
    exit 1
fi

REPO_DIR="$HOME/git/defra/trade-imports-workspace/repos/$REPO"
if [[ ! -d "$REPO_DIR/.git" ]]; then
    echo "Error: repo not found or not a git checkout: $REPO_DIR" >&2
    exit 1
fi

BRANCH="feature/${TICKET}-${SLUG}"

log() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo "$1"
    fi
}

log "→ fetch origin ($REPO)"
git -C "$REPO_DIR" fetch --quiet origin

log "→ checkout $BASE"
git -C "$REPO_DIR" checkout --quiet "$BASE"

log "→ pull"
git -C "$REPO_DIR" pull --quiet --ff-only

if git -C "$REPO_DIR" show-ref --verify --quiet "refs/heads/$BRANCH"; then
    log "→ checkout existing $BRANCH"
    git -C "$REPO_DIR" checkout --quiet "$BRANCH"
elif git -C "$REPO_DIR" show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
    # Someone already pushed this branch. Without an explicit start point,
    # `checkout -b` would branch from $BASE and silently diverge from the
    # remote branch of the same name.
    log "→ checkout $BRANCH tracking origin/$BRANCH"
    git -C "$REPO_DIR" checkout --quiet -b "$BRANCH" --track "origin/$BRANCH"
else
    log "→ checkout -b $BRANCH"
    git -C "$REPO_DIR" checkout --quiet -b "$BRANCH"
fi

HEAD_SHA=$(git -C "$REPO_DIR" rev-parse HEAD)

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat <<EOF
{
    "ticket": "$TICKET",
    "repo": "$REPO",
    "branch": "$BRANCH",
    "base": "$BASE",
    "head": "$HEAD_SHA"
}
EOF
else
    echo ""
    echo "Branch ready: $BRANCH"
    echo "Repo: $REPO_DIR"
    echo "HEAD: $HEAD_SHA"
fi
