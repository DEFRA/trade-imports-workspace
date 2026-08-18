#!/bin/bash
# Phase 1 dispatcher for the journey-builder digest mode.
# Seeds workareas/journey-builder/<run-id>/, creates the frontend worktree
# (child branch, so the main checkout other agents use is untouched),
# caches the requirement sources, seeds extract placeholders, and seeds
# the canonical spec skeleton inside the worktree.
#
# Idempotent — safe to re-run; existing extracts and spec are not clobbered
# unless --refetch is given (which only refreshes cached sources).
#
# Usage:
#   prepare-digest.sh EUDPA-XXXXX [--refetch] [--json]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
FRONTEND_REPO="$WORKSPACE/repos/trade-imports-animals-frontend"
CONFLUENCE_PAGE_ID="6497338582"
CANVAS_FILE="Notes from chat with interaction design.canvas"

RUN_ID=""; REFETCH=false; AS_JSON=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --refetch) REFETCH=true; shift ;;
        --json) AS_JSON=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-XXXXX [--refetch] [--json]" >&2; exit 1; }

WORKAREA="$WORKSPACE/workareas/journey-builder/$RUN_ID"
SOURCES_DIR="$WORKAREA/.sources"
WORKTREE="$WORKAREA/frontend-worktree"
SPEC_BRANCH="spike/$RUN_ID-live-animals-spec"
SPEC_DIR="$WORKTREE/prototypes/standalone/live-animals/spec"

mkdir -p "$SOURCES_DIR"

# --- Worktree (child branch off the repo's current branch) ---------------
BASE_BRANCH=$(git -C "$FRONTEND_REPO" rev-parse --abbrev-ref HEAD)
if [[ ! -d "$WORKTREE" ]]; then
    if git -C "$FRONTEND_REPO" show-ref --verify --quiet "refs/heads/$SPEC_BRANCH"; then
        git -C "$FRONTEND_REPO" worktree add "$WORKTREE" "$SPEC_BRANCH"
    else
        git -C "$FRONTEND_REPO" worktree add "$WORKTREE" -b "$SPEC_BRANCH" "$BASE_BRANCH"
    fi
fi
BASE_SHA=$(git -C "$FRONTEND_REPO" rev-parse "$BASE_BRANCH")

# --- Cache sources --------------------------------------------------------
if [[ ! -f "$SOURCES_DIR/confluence-v4.page.json" || "$REFETCH" == true ]]; then
    "$WORKSPACE/tools/confluence/page.sh" "$CONFLUENCE_PAGE_ID" json \
        > "$SOURCES_DIR/confluence-v4.page.json"
    # Content lives in body.view (body.storage is empty on this page).
    jq -r '.body.view.value' "$SOURCES_DIR/confluence-v4.page.json" \
        > "$SOURCES_DIR/confluence-v4.body.html"
fi
if [[ ! -f "$SOURCES_DIR/ixd-canvas.canvas" || "$REFETCH" == true ]]; then
    cp "$FRONTEND_REPO/$CANVAS_FILE" "$SOURCES_DIR/ixd-canvas.canvas"
fi

FETCHED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# --- Seed extract placeholders --------------------------------------------
seed_extract() {
    local source_id="$1" source_type="$2" source_ref="$3"
    local target="$WORKAREA/extract.$source_id.json"
    [[ -f "$target" ]] && return 0
    jq -n \
        --arg id "$source_id" --arg type "$source_type" --arg ref "$source_ref" \
        --arg at "$FETCHED_AT" \
        '{
            schema_version: 1,
            source: { id: $id, type: $type, ref: $ref, fetched_at: $at },
            status: "extracting",
            summary: null,
            fields: [],
            pages: [],
            behaviours: [],
            notes: []
        }' > "$target"
}
seed_extract "confluence-v4" "confluence" "$CONFLUENCE_PAGE_ID"
seed_extract "skeleton" "code" "src/server@$BASE_SHA"
seed_extract "ixd-canvas" "canvas" "$CANVAS_FILE"

# --- Seed the canonical spec skeleton in the worktree ----------------------
mkdir -p "$SPEC_DIR/fixtures"
if [[ ! -f "$SPEC_DIR/journey-spec.json" ]]; then
    jq -n --arg at "$FETCHED_AT" --arg sha "$BASE_SHA" --arg page "$CONFLUENCE_PAGE_ID" --arg canvas "$CANVAS_FILE" \
        '{
            specVersion: 1,
            journey: "live-animals-import-notification",
            sources: [
                { id: "confluence-v4", type: "confluence", ref: $page, fetchedAt: $at, status: "extracting" },
                { id: "skeleton", type: "code", ref: ("src/server@" + $sha), fetchedAt: $at, status: "extracting" },
                { id: "ixd-canvas", type: "canvas", ref: $canvas, fetchedAt: $at, status: "extracting" },
                { id: "figma", type: "figma", ref: null, fetchedAt: null, status: "pending" },
                { id: "heroku-prototype", type: "prototype", ref: null, fetchedAt: null, status: "pending" }
            ],
            behaviours: [],
            fieldGroups: {},
            sections: [],
            obligations: []
        }' > "$SPEC_DIR/journey-spec.json"
fi
if [[ ! -f "$SPEC_DIR/conflicts.json" ]]; then
    echo '{ "schema_version": 1, "conflicts": [] }' > "$SPEC_DIR/conflicts.json"
fi
if [[ ! -f "$SPEC_DIR/fixtures/happy-path.json" ]]; then
    echo '{ "schema_version": 1, "values": {} }' > "$SPEC_DIR/fixtures/happy-path.json"
fi

# --- Meta ------------------------------------------------------------------
jq -n \
    --arg run_id "$RUN_ID" --arg worktree "$WORKTREE" --arg spec_dir "$SPEC_DIR" \
    --arg branch "$SPEC_BRANCH" --arg base_branch "$BASE_BRANCH" --arg base_sha "$BASE_SHA" \
    --arg at "$FETCHED_AT" \
    '{
        run_id: $run_id,
        mode: "digest",
        worktree: $worktree,
        spec_dir: $spec_dir,
        spec_branch: $branch,
        base_branch: $base_branch,
        base_sha: $base_sha,
        prepared_at: $at,
        sources: ["confluence-v4", "skeleton", "ixd-canvas"]
    }' > "$WORKAREA/.digest-meta.json"

if [[ "$AS_JSON" == true ]]; then
    cat "$WORKAREA/.digest-meta.json"
else
    echo "Workarea:   $WORKAREA"
    echo "Worktree:   $WORKTREE ($SPEC_BRANCH off $BASE_BRANCH@${BASE_SHA:0:8})"
    echo "Spec dir:   $SPEC_DIR"
    echo "Sources cached: confluence-v4 ($(wc -c < "$SOURCES_DIR/confluence-v4.body.html" | tr -d ' ') bytes html), ixd-canvas, skeleton@${BASE_SHA:0:8}"
    echo "Extracts:   extract.{confluence-v4,skeleton,ixd-canvas}.json seeded"
fi
