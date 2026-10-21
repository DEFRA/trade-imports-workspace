#!/bin/bash
# Fetch, check out the base, pull, then check out <type>/<ticket>-<slug>
# in one repo. Running it again checks out the same branch.
#
# Usage: setup-branch.sh EUDPA-XXXXX|NO_JIRA --repo REPO --slug SLUG
#                        [--type feat|fix|chore] [--base BRANCH] [--json]
#
# --type defaults to feat. The ticket is kept as given.

set -e

USAGE="Usage: $0 EUDPA-XXXXX|NO_JIRA --repo REPO --slug SLUG [--type feat|fix|chore] [--base BRANCH] [--json]"

TICKET=""
REPO=""
SLUG=""
TYPE="feat"
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
        --type)
            TYPE="$2"
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
            sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        EUDPA-*|NO_JIRA)
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
    echo "$USAGE" >&2
    exit 1
fi

case "$TYPE" in
    feat|fix|chore) ;;
    *)
        echo "--type must be feat, fix or chore, not \"$TYPE\"." >&2
        exit 1
        ;;
esac

REPO_DIR="$HOME/git/defra/trade-imports-workspace/repos/$REPO"
if [[ ! -d "$REPO_DIR/.git" ]]; then
    echo "Error: repo not found or not a git checkout: $REPO_DIR" >&2
    exit 1
fi

BRANCH="${TYPE}/${TICKET}-${SLUG}"

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
