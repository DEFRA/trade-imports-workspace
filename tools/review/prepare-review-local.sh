#!/bin/bash
# Prepare a review workspace for a local branch — no Jira ticket, no GitHub
# PR, no `gh` call of any kind.
#
# Usage: ./prepare-review-local.sh REPO BRANCH [--files F1,F2,...] [--json]
#
# REPO is a folder name under repos/ (e.g. trade-imports-plants-prototype).
# BRANCH is the branch being reviewed.
#
# The changed-file list is git's own view of the branch:
#   - committed changes since the merge-base with origin/main (falling back
#     to main when there is no origin/main), via
#     `git diff --name-only <merge-base>...<branch>`
#   - plus, when BRANCH is REPO's currently checked-out branch, anything
#     staged or unstaged in the working tree
#
# --files overrides discovery entirely: pass a comma-separated list of
# paths (relative to REPO) and git is never consulted for the file list.
# A calling skill uses this to scope a check to exactly the files one
# request touched, rather than the whole branch's drift.
#
# Creates workareas/reviews/local/REPO/BRANCH/ with:
#   - branch.md          (what's being reviewed — no ticket, no PR)
#   - .review-meta.json  (`"local": true`; state for other scripts)
#   - best-practices/{repo}.md (detected technologies' best-practice bundle,
#                               via the same detect-tech.sh ticket mode uses)
#   - file-reviews/{repo}/{safe_path}.review.json placeholders
#
# Idempotent — local mode has no ticket/PR boundary to refresh against, so
# "refresh" is just "run this again": a file with a verdict already set is
# left alone; the changed-file list is always recomputed (or re-read from
# --files) fresh.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$HOME/git/defra/trade-imports-workspace"
DETECT_TECH="$SCRIPT_DIR/detect-tech.sh"

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

REPO_DIR="$ROOT/repos/$REPO"
[[ -d "$REPO_DIR/.git" ]] || { echo "Not a git repo: $REPO_DIR" >&2; exit 1; }

git -C "$REPO_DIR" rev-parse --verify --quiet "$BRANCH" >/dev/null 2>&1 || {
    echo "Branch not found in $REPO: $BRANCH" >&2
    exit 1
}

log() {
    # `if/fi`, not `[[ ]] && echo` — the latter's own false-test exit status
    # becomes this function's exit status, which trips `set -e` at the call
    # site (a bare `log "..."` statement) on every call once --json is on.
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo "$1"
    fi
}

REVIEW_ID="local/$REPO/$BRANCH"
REVIEW_DIR="$ROOT/workareas/reviews/$REVIEW_ID"
mkdir -p "$REVIEW_DIR/file-reviews/$REPO"

log "Local review workspace: $REVIEW_DIR"

# ---- Step 1: changed files — from git, or the caller's own list ---------

merge_base=""
if [[ -z "$FILES_OVERRIDE" ]]; then
    merge_base=$(git -C "$REPO_DIR" merge-base origin/main "$BRANCH" 2>/dev/null) \
        || merge_base=$(git -C "$REPO_DIR" merge-base main "$BRANCH" 2>/dev/null) \
        || { echo "Can't find a merge-base with origin/main or main for $BRANCH in $REPO" >&2; exit 1; }

    committed=$(git -C "$REPO_DIR" diff --name-only "$merge_base...$BRANCH")

    current_branch=$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)
    staged=""
    unstaged=""
    if [[ "$current_branch" == "$BRANCH" ]]; then
        staged=$(git -C "$REPO_DIR" diff --name-only --cached)
        unstaged=$(git -C "$REPO_DIR" diff --name-only)
    else
        log "Note: $REPO's checked-out branch is $current_branch, not $BRANCH — reviewing committed changes only (no working-tree diff)."
    fi

    files_json=$(printf '%s\n%s\n%s\n' "$committed" "$staged" "$unstaged" | sed '/^$/d' | sort -u | jq -Rn '[inputs | select(length > 0)]')
else
    files_json=$(echo "$FILES_OVERRIDE" | tr ',' '\n' | sed '/^$/d' | sort -u | jq -Rn '[inputs | select(length > 0)]')
fi

total_files=$(echo "$files_json" | jq 'length')

log "Changed files ($total_files):"
echo "$files_json" | jq -r '.[]' | while IFS= read -r f; do log "  $f"; done

# ---- Step 2: branch.md ---------------------------------------------------

cat > "$REVIEW_DIR/branch.md" << EOF
# $REPO:$BRANCH (local review)

No Jira ticket, no GitHub PR — this reviews the working branch directly.

## Merge base with main

\`${merge_base:-n/a — file list supplied by the caller}\`

## Acceptance criteria

<!-- No ticket — define acceptance criteria manually, or skip if exploratory. -->
EOF

# ---- Step 3: detect technologies + bake best-practices bundle -----------

log ""
log "Detecting technologies..."
tech_json=$("$DETECT_TECH" "$REPO_DIR" 2>/dev/null) || tech_json='{"technologies":[],"best_practices":[]}'

mkdir -p "$REVIEW_DIR/best-practices"
out="$REVIEW_DIR/best-practices/$REPO.md"
{
    echo "# Best practices applicable to $REPO"
    echo
    echo "Concatenated from \`docs/best-practices/\` at prepare-review-local time."
    echo "Apply these standards when reviewing files in this repo."
    echo "$tech_json" | jq -r '.best_practices[]' | while IFS= read -r path; do
        [[ -z "$path" ]] && continue
        src="$ROOT/$path"
        if [[ -f "$src" ]]; then
            echo
            echo "---"
            echo
            echo "## Source: \`$path\`"
            echo
            cat "$src"
        else
            echo
            echo "---"
            echo
            echo "## Source: \`$path\` (missing — check detect-tech.sh)"
        fi
    done
} > "$out"

# ---- Step 4: .review-meta.json -------------------------------------------

now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
head_sha=$(git -C "$REPO_DIR" rev-parse "$BRANCH")
jq -n \
    --arg id "$REVIEW_ID" \
    --arg repo "$REPO" \
    --arg branch "$BRANCH" \
    --arg mergeBase "${merge_base:-}" \
    --arg head "$head_sha" \
    --arg created "$now" \
    --argjson files "$files_json" \
    --argjson tech "$tech_json" \
    '{id: $id, local: true, repo: $repo, branch: $branch, mergeBase: (if $mergeBase == "" then null else $mergeBase end), head: $head, created: $created, files: $files, tech: $tech}' \
    > "$REVIEW_DIR/.review-meta.json.tmp"
mv "$REVIEW_DIR/.review-meta.json.tmp" "$REVIEW_DIR/.review-meta.json"

# ---- Step 5: per-file review placeholders --------------------------------

created_files=0
while IFS= read -r filepath; do
    [[ -z "$filepath" ]] && continue
    safe_path=$(echo "$filepath" | tr '/' '_')
    review_file="$REVIEW_DIR/file-reviews/$REPO/${safe_path}.review.json"

    if [[ -f "$review_file" ]] && [[ "$(jq -r '.verdict // "null"' "$review_file" 2>/dev/null)" != "null" ]]; then
        continue
    fi

    "$SCRIPT_DIR/file-review-init.sh" "$REVIEW_ID" \
        --repo "$REPO" --file "$filepath" --commit "$head_sha" --mode FRESH > /dev/null
    created_files=$((created_files + 1))
    log "  Created: $REPO/$filepath"
done < <(echo "$files_json" | jq -r '.[]')

# ---- Step 6: per-repo consistency stub -----------------------------------

review_stub="$REVIEW_DIR/review.${REPO}.md"
[[ -f "$review_stub" ]] || touch "$review_stub"
stub="$REVIEW_DIR/file-reviews/$REPO/_consistency-check.md"
[[ -f "$stub" ]] || touch "$stub"

# ---- Output ---------------------------------------------------------------

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$REVIEW_DIR/.review-meta.json"
else
    echo ""
    echo "=== Local Review Workspace Ready ==="
    echo "Repo: $REPO"
    echo "Branch: $BRANCH"
    echo "Directory: $REVIEW_DIR"
    echo ""
    echo "Created:"
    echo "  ✓ branch.md"
    echo "  ✓ .review-meta.json"
    echo "  ✓ best-practices/$REPO.md"
    echo "  ✓ file-reviews/ ($created_files files)"
    echo ""
    if [[ "$total_files" -eq 0 ]]; then
        echo "Note: no changed files found — nothing to review."
    else
        echo "Next: review each file, then run tools/review/verify-coverage.sh $REVIEW_ID"
    fi
fi
