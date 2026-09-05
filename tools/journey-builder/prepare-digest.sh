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
source "$WORKSPACE/tools/journey-builder/target-profile.sh"

RUN_ID=""; REFETCH=false; AS_JSON=false; TARGET_FLAG=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --refetch) REFETCH=true; shift ;;
        --json) AS_JSON=true; shift ;;
        --target) TARGET_FLAG="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-XXXXX [--refetch] [--json] [--target <id>]" >&2; exit 1; }

load_target "$RUN_ID" "$TARGET_FLAG"
FRONTEND_REPO="$TARGET_REPO"

[[ -n "$TARGET_JOURNEY_ID" ]] || { echo "Error: target '$TARGET_ID' declares no journeyId" >&2; exit 1; }
[[ -n "$TARGET_SPEC_BRANCH_SUFFIX" ]] || { echo "Error: target '$TARGET_ID' declares no specBranchSuffix" >&2; exit 1; }
[[ "$(jq 'length' <<<"$TARGET_SOURCES")" -gt 0 ]] || { echo "Error: target '$TARGET_ID' declares no sources" >&2; exit 1; }

WORKAREA="$WORKSPACE/workareas/journey-builder/$RUN_ID"
SOURCES_DIR="$WORKAREA/.sources"
WORKTREE="$WORKAREA/frontend-worktree"
SPEC_BRANCH="spike/$RUN_ID-$TARGET_SPEC_BRANCH_SUFFIX"
SPEC_DIR="$WORKTREE/$TARGET_SPEC_DIR"

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
# Driven by the target's sources[]. A `code` source is read live by the
# extractor at the pinned base sha, so there is nothing to cache; a `pending`
# source has nothing to fetch yet.
while IFS=$'\t' read -r s_id s_type s_ref; do
    case "$s_type" in
        confluence)
            if [[ ! -f "$SOURCES_DIR/$s_id.page.json" || "$REFETCH" == true ]]; then
                "$WORKSPACE/tools/confluence/page.sh" "$s_ref" json \
                    > "$SOURCES_DIR/$s_id.page.json"
                # Content lives in body.view — body.storage is empty on some pages.
                jq -r '.body.view.value' "$SOURCES_DIR/$s_id.page.json" \
                    > "$SOURCES_DIR/$s_id.body.html"
            fi
            ;;
        canvas)
            if [[ ! -f "$SOURCES_DIR/$s_id.canvas" || "$REFETCH" == true ]]; then
                [[ -f "$FRONTEND_REPO/$s_ref" ]] || {
                    echo "Error: canvas source '$s_id' expects $FRONTEND_REPO/$s_ref, which does not exist" >&2
                    exit 1
                }
                cp "$FRONTEND_REPO/$s_ref" "$SOURCES_DIR/$s_id.canvas"
            fi
            ;;
        code|pending) ;;
        *) echo "Error: source '$s_id' has unknown type '$s_type'" >&2; exit 1 ;;
    esac
done < <(jq -r '.[] | select(.pending != true) | [.id, .type, (.ref // "")] | @tsv' <<<"$TARGET_SOURCES")

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
# A `code` source's ref is pinned to the base sha so the extract records
# exactly which tree it read. `pending` sources get no placeholder — they are
# declared in the spec so a later hand-filled extract has somewhere to belong.
while IFS=$'\t' read -r s_id s_type s_ref; do
    if [[ "$s_type" == "code" ]]; then
        seed_extract "$s_id" "$s_type" "$s_ref@$BASE_SHA"
    else
        seed_extract "$s_id" "$s_type" "$s_ref"
    fi
done < <(jq -r '.[] | select(.pending != true) | [.id, .type, (.ref // "")] | @tsv' <<<"$TARGET_SOURCES")

# --- Seed the canonical spec skeleton in the worktree ----------------------
mkdir -p "$SPEC_DIR/fixtures"
if [[ ! -f "$SPEC_DIR/journey-spec.json" ]]; then
    jq -n --arg at "$FETCHED_AT" --arg sha "$BASE_SHA" \
        --arg journey "$TARGET_JOURNEY_ID" --argjson sources "$TARGET_SOURCES" \
        '{
            specVersion: 1,
            journey: $journey,
            sources: [ $sources[]
                | if .pending == true
                  then { id, type, ref: null, fetchedAt: null, status: "pending" }
                  else { id, type,
                         ref: (if .type == "code" then (.ref + "@" + $sha) else .ref end),
                         fetchedAt: $at, status: "extracting" }
                  end ],
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
# `target` is what lets a later script resolve the same profile without the
# --target flag — load_target reads it back from here.
jq -n \
    --arg run_id "$RUN_ID" --arg worktree "$WORKTREE" --arg spec_dir "$SPEC_DIR" \
    --arg branch "$SPEC_BRANCH" --arg base_branch "$BASE_BRANCH" --arg base_sha "$BASE_SHA" \
    --arg at "$FETCHED_AT" --arg target "$TARGET_ID" --argjson sources "$TARGET_SOURCES" \
    '{
        run_id: $run_id,
        mode: "digest",
        target: $target,
        worktree: $worktree,
        spec_dir: $spec_dir,
        spec_branch: $branch,
        base_branch: $base_branch,
        base_sha: $base_sha,
        prepared_at: $at,
        sources: [ $sources[] | select(.pending != true) | .id ]
    }' > "$WORKAREA/.digest-meta.json"

if [[ "$AS_JSON" == true ]]; then
    cat "$WORKAREA/.digest-meta.json"
else
    active_ids=$(jq -r '[ .[] | select(.pending != true) | .id ] | join(", ")' <<<"$TARGET_SOURCES")
    echo "Workarea:   $WORKAREA"
    echo "Target:     $TARGET_ID ($TARGET_REPO)"
    echo "Worktree:   $WORKTREE ($SPEC_BRANCH off $BASE_BRANCH@${BASE_SHA:0:8})"
    echo "Spec dir:   $SPEC_DIR"
    echo "Sources:    $active_ids"
    while IFS=$'\t' read -r s_id s_type; do
        case "$s_type" in
            confluence) echo "  $s_id: $(wc -c < "$SOURCES_DIR/$s_id.body.html" | tr -d ' ') bytes html" ;;
            canvas)     echo "  $s_id: cached" ;;
            code)       echo "  $s_id: read live at ${BASE_SHA:0:8}" ;;
        esac
    done < <(jq -r '.[] | select(.pending != true) | [.id, .type] | @tsv' <<<"$TARGET_SOURCES")
    echo "Extracts:   seeded for $active_ids"
fi
