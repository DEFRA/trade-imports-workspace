#!/bin/bash
# Prepare a code-style review workspace for a local branch — no Jira
# ticket, no GitHub PR.
#
# Usage: ./prepare-style-local.sh REPO BRANCH [--files F1,F2,...] [--json]
#
# Creates workareas/code-style-reviews/local/REPO/BRANCH/ with:
#   - .style-meta.json (state for other scripts)
#   - file-reviews/{repo}/{safe_path}.style.json placeholders
#   - style-rules.{repo}.{topic}.md per-(repo,topic) rules bundles
#
# Piggybacks on the matching local review workspace at
# workareas/reviews/local/REPO/BRANCH/ for the changed-file list — runs
# prepare-review-local.sh first if that workspace is missing. The file
# list is never a PR diff: it's `git diff --name-only <merge-base>...HEAD`
# plus staged/unstaged files (see prepare-review-local.sh), or the
# caller's own --files list when given.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ROOT="$HOME/git/defra/trade-imports-workspace"
PREPARE_REVIEW_LOCAL="$ROOT/tools/review/prepare-review-local.sh"
FILE_STYLE_INIT="$SCRIPT_DIR/file-style-init.sh"
BAKE_BUNDLE="$SCRIPT_DIR/bake-rules-bundle.sh"
FILE_TOPICS="$SCRIPT_DIR/file-topics.sh"

REPO=""
BRANCH=""
FILES_OVERRIDE=""
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --files) FILES_OVERRIDE="$2"; shift 2 ;;
        --json) JSON_OUTPUT=true; shift ;;
        -*) echo "Unknown option: $1" >&2; exit 1 ;;
        *)
            if [[ -z "$REPO" ]]; then
                REPO="$1"
            elif [[ -z "$BRANCH" ]]; then
                BRANCH="$1"
            else
                echo "Unexpected argument: $1" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

if [[ -z "$REPO" ]] || [[ -z "$BRANCH" ]]; then
    echo "Usage: $0 REPO BRANCH [--files F1,F2,...] [--json]" >&2
    exit 1
fi

REVIEW_ID="local/$REPO/$BRANCH"
REVIEW_DIR="$ROOT/workareas/reviews/$REVIEW_ID"
REVIEW_META="$REVIEW_DIR/.review-meta.json"
STYLE_DIR="$ROOT/workareas/code-style-reviews/$REVIEW_ID"
STYLE_META="$STYLE_DIR/.style-meta.json"
REPO_DIR="$ROOT/repos/$REPO"

log() {
    # `if/fi`, not `[[ ]] && echo` — the latter's own false-test exit status
    # becomes this function's exit status, which trips `set -e` at the call
    # site (a bare `log "..."` statement) on every call once --json is on.
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo "$1"
    fi
}

# ---- Step 1: ensure the matching local review workspace exists ----------
# Always re-run it — local mode has no ticket/PR boundary, so the
# changed-file list is recomputed from git (or --files) fresh every time.

log "Preparing local review workspace (changed-file discovery)..."
review_local_args=("$REPO" "$BRANCH")
[[ -n "$FILES_OVERRIDE" ]] && review_local_args+=(--files "$FILES_OVERRIDE")
"$PREPARE_REVIEW_LOCAL" "${review_local_args[@]}" >&2

[[ -f "$REVIEW_META" ]] || { echo "prepare-review-local.sh did not produce $REVIEW_META" >&2; exit 1; }

# ---- Step 2: create style workspace --------------------------------------

log "Creating code-style workspace..."
mkdir -p "$STYLE_DIR/file-reviews"

# ---- Step 3: discover reviewable source files from .review-meta.json ----
# A file is reviewable iff file-topics.sh maps it to >= 1 topic.

log "Discovering reviewable source files..."
source_files_json="[]"
total_source=0
head_sha=$(jq -r '.head' "$REVIEW_META")

while IFS= read -r filepath; do
    [[ -z "$filepath" ]] && continue

    topics=$("$FILE_TOPICS" "$filepath")
    [[ -z "$topics" ]] && continue
    topics_json=$(printf '%s\n' "$topics" | jq -Rn '[inputs | select(length > 0)]')

    entry=$(jq -nc \
        --arg repo "$REPO" \
        --arg path "$filepath" \
        --arg commit "$head_sha" \
        --argjson topics "$topics_json" \
        '{repo: $repo, path: $path, commit: $commit, topics: $topics}')
    source_files_json=$(jq --argjson e "$entry" '. + [$e]' <<<"$source_files_json")
    total_source=$((total_source + 1))
done < <(jq -r '.files[]' "$REVIEW_META")

if [[ "$total_source" -eq 0 ]]; then
    log "No reviewable source files found on this branch."
fi

# ---- Step 4: write .style-meta.json --------------------------------------

now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
jq -n \
    --arg id "$REVIEW_ID" \
    --arg repo "$REPO" \
    --arg branch "$BRANCH" \
    --arg created "$now" \
    --argjson source_files "$source_files_json" \
    '{id: $id, local: true, repo: $repo, branch: $branch, created: $created, source_files: $source_files}' > "$STYLE_META.tmp"
mv "$STYLE_META.tmp" "$STYLE_META"

# ---- Step 5: init per-file placeholders ----------------------------------

log "Creating per-file .style.json placeholders..."
created_files=0
while IFS= read -r entry; do
    [[ -z "$entry" ]] && continue
    repo=$(echo "$entry" | jq -r '.repo')
    path=$(echo "$entry" | jq -r '.path')
    commit=$(echo "$entry" | jq -r '.commit')

    encoded="${path//\//_}"
    placeholder="$STYLE_DIR/file-reviews/$repo/$encoded.style.json"

    if [[ -f "$placeholder" ]] && [[ "$(jq -r '.verdict // "null"' "$placeholder" 2>/dev/null)" != "null" ]]; then
        continue
    fi

    "$FILE_STYLE_INIT" "$REVIEW_ID" \
        --repo "$repo" --file "$path" --commit "$commit" --mode FRESH > /dev/null
    created_files=$((created_files + 1))
done < <(jq -c '.source_files[]' "$STYLE_META")

# ---- Step 6: bake per-(repo, topic) style-rules bundles ------------------
# REPO_DIR is passed through so a topic's `repoRelativeBestPractice`
# entries (e.g. hapi's src/server/app/docs/validation.md) resolve against
# this repo's real checkout when present.

log "Baking per-(repo, topic) style-rules bundles..."
bundles=()
while IFS= read -r pair; do
    [[ -z "$pair" ]] && continue
    repo="${pair%%$'\t'*}"
    topic="${pair##*$'\t'}"
    "$BAKE_BUNDLE" "$REVIEW_ID" "$repo" "$topic" "$REPO_DIR" > /dev/null
    bundles+=("style-rules.${repo}.${topic}.md")
done < <(jq -r '.source_files[] | .repo as $r | .topics[] | [$r, .] | @tsv' "$STYLE_META" | sort -u)

# ---- Output ---------------------------------------------------------------

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$STYLE_META"
else
    echo
    echo "=== Local Code-Style Workspace Ready ==="
    echo "Repo: $REPO"
    echo "Branch: $BRANCH"
    echo "Directory: $STYLE_DIR"
    echo
    echo "Created:"
    echo "  ✓ .style-meta.json"
    echo "  ✓ file-reviews/ ($created_files placeholders)"
    if [[ ${#bundles[@]} -gt 0 ]]; then
        for b in "${bundles[@]}"; do
            echo "  ✓ $b"
        done
    fi
    echo
    if [[ "$total_source" -eq 0 ]]; then
        echo "Note: no reviewable source files on this branch — no code-style review needed."
    else
        echo "Next: spawn STYLE_FILE_REVIEWER subagents (FRESH Step 4)."
    fi
fi
