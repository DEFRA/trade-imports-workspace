#!/bin/bash
# Prepare review workspace for a JIRA ticket or branch
# Usage: ./prepare-review.sh EUDPA-XXXXX [--json]
#        ./prepare-review.sh --branch <branch-name> --desc "Description" [--repos repo1,repo2] [--json]
#
# Creates reviews/<id>/ with:
#   - ticket.md (ticket details, comments, confluence refs)
#   - repos/ (cloned at merge commits)
#   - .review-meta.json (state for other scripts)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
TICKET=""
BRANCH=""
DESC=""
REPOS=""
JSON_OUTPUT=false
NO_TICKET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --branch)
            BRANCH="$2"
            NO_TICKET=true
            shift 2
            ;;
        --desc)
            DESC="$2"
            shift 2
            ;;
        --repos)
            REPOS="$2"
            shift 2
            ;;
        -*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            TICKET="$1"
            shift
            ;;
    esac
done

if [[ -z "$TICKET" ]] && [[ -z "$BRANCH" ]]; then
    echo "Usage: ./prepare-review.sh EUDPA-XXXXX [--json]"
    echo "       ./prepare-review.sh --branch <branch-name> --desc \"Description\" [--repos repo1,repo2] [--json]"
    echo ""
    echo "Creates a review workspace with ticket context and cloned repos."
    echo ""
    echo "Options:"
    echo "  --branch   Branch name to search for PRs (no-ticket mode)"
    echo "  --desc     Description for the review (required with --branch)"
    echo "  --repos    Comma-separated list of repos to search (optional)"
    echo "  --json     Output JSON format"
    exit 1
fi

# Determine review directory name
if [[ "$NO_TICKET" == "true" ]]; then
    # Sanitize branch name for directory: remove feature/ prefix, replace / with -
    REVIEW_ID=$(echo "$BRANCH" | sed 's|^feature/||' | tr '/' '-')
    if [[ -z "$DESC" ]]; then
        DESC="Branch review: $BRANCH"
    fi
else
    REVIEW_ID="$TICKET"
fi

REVIEW_DIR="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$REVIEW_ID"

# Helper for output
log() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo "$1"
    fi
}

error() {
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        echo "{\"error\": \"$1\"}"
    else
        echo "Error: $1" >&2
    fi
    exit 1
}

# Check dependencies
command -v jq >/dev/null 2>&1 || error "jq is required"
command -v gh >/dev/null 2>&1 || error "GitHub CLI (gh) is required"

# Create directory structure
log "Creating review workspace..."
mkdir -p "$REVIEW_DIR/repos"
mkdir -p "$REVIEW_DIR/file-reviews"

if [[ "$NO_TICKET" == "true" ]]; then
    # No-ticket mode: skip JIRA, create simple ticket.md
    log "No-ticket mode: using branch $BRANCH"
    ticket_key="$REVIEW_ID"
    ticket_summary="$DESC"
    ticket_type="Branch Review"

    # Write simplified ticket.md
    log "Writing ticket.md..."
    cat > "$REVIEW_DIR/ticket.md" << EOF
# $REVIEW_ID

## Description

$DESC

## Branch

\`$BRANCH\`

## Acceptance Criteria

<!-- No ticket - define acceptance criteria manually -->

EOF
else
    # Standard mode: fetch from JIRA
    log "Fetching ticket details..."
    ticket_json=$("$HOME/git/defra/trade-imports-workspace/tools/jira/ticket.sh" "$TICKET" json 2>/dev/null) || error "Failed to fetch ticket $TICKET"

    # Extract ticket metadata
    ticket_key=$(echo "$ticket_json" | jq -r '.key')
    ticket_summary=$(echo "$ticket_json" | jq -r '.fields.summary')
    ticket_type=$(echo "$ticket_json" | jq -r '.fields.issuetype.name')
    ticket_status=$(echo "$ticket_json" | jq -r '.fields.status.name')
    ticket_priority=$(echo "$ticket_json" | jq -r '.fields.priority.name')
    ticket_assignee=$(echo "$ticket_json" | jq -r '.fields.assignee.displayName // "Unassigned"')
    ticket_parent=$(echo "$ticket_json" | jq -r '.fields.parent.key // "None"')
    ticket_labels=$(echo "$ticket_json" | jq -r '.fields.labels | join(", ")')
    ticket_description=$(echo "$ticket_json" | jq -r '.renderedFields.description // "No description"')

    # Fetch comments
    log "Fetching comments..."
    comments_json=$("$HOME/git/defra/trade-imports-workspace/tools/jira/comments.sh" "$TICKET" json 2>/dev/null) || comments_json="[]"
    comments_count=$(echo "$comments_json" | jq 'length')

    # Extract Confluence links from description
    log "Checking for Confluence links..."
    _atlassian_base="${JIRA_BASE_URL:?JIRA_BASE_URL is not set - see README.md}"
    confluence_links=$(echo "$ticket_description" | grep -oE "${_atlassian_base}/wiki/spaces/[^\"<>[:space:]]+" | sort -u || true)
    confluence_content=""

    if [[ -n "$confluence_links" ]]; then
        while IFS= read -r link; do
            [[ -z "$link" ]] && continue
            log "  Fetching: $link"
            page_content=$("$HOME/git/defra/trade-imports-workspace/tools/confluence/page.sh" "$link" 2>/dev/null) || continue
            confluence_content+="### $(echo "$page_content" | head -2 | tail -1 | sed 's/Title: //')"$'\n\n'
            confluence_content+="$page_content"$'\n\n'
        done <<< "$confluence_links"
    fi

    # Format comments for ticket.md
    comments_formatted=""
    if [[ "$comments_count" -gt 0 ]]; then
        comments_formatted=$(echo "$comments_json" | jq -r '.[] | "### \(.author.displayName) (\(.created | split("T")[0]))\n\(.body)\n"')
    fi

    # Write ticket.md
    log "Writing ticket.md..."
    cat > "$REVIEW_DIR/ticket.md" << EOF
# $ticket_key: $ticket_summary

## Metadata
- **Type:** $ticket_type
- **Status:** $ticket_status
- **Priority:** $ticket_priority
- **Labels:** $ticket_labels
- **Parent:** $ticket_parent
- **Assignee:** $ticket_assignee

## Description

$ticket_description

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments ($comments_count)

$comments_formatted

## Confluence References

$confluence_content
EOF
fi

# Find PRs
log "Finding PRs..."

if [[ "$NO_TICKET" == "true" ]]; then
    # Search by branch name
    if [[ -n "$REPOS" ]]; then
        # Search specific repos
        prs_json="[]"
        IFS=',' read -ra REPO_ARRAY <<< "$REPOS"
        for repo in "${REPO_ARRAY[@]}"; do
            repo=$(echo "$repo" | xargs)  # trim whitespace
            log "  Searching $repo..."
            pr_result=$(gh pr list --repo "DEFRA/$repo" --head "$BRANCH" --json number,title,url,state 2>/dev/null) || continue
            if [[ -n "$pr_result" ]] && [[ "$pr_result" != "[]" ]]; then
                # Add repository info
                pr_result=$(echo "$pr_result" | jq --arg repo "$repo" '[.[] | . + {repository: {name: $repo}}]')
                if [[ "$prs_json" == "[]" ]]; then
                    prs_json="$pr_result"
                else
                    prs_json=$(echo "$prs_json" "$pr_result" | jq -s 'add')
                fi
            fi
        done
    else
        # Search all DEFRA repos by branch name
        prs_json=$(gh search prs "head:$BRANCH" --owner DEFRA --json number,title,repository,url,state 2>/dev/null) || prs_json="[]"
    fi
else
    # Search by ticket ID
    prs_json=$("$HOME/git/defra/trade-imports-workspace/tools/github/prs.sh" "$TICKET" json 2>/dev/null) || prs_json="[]"
fi

if [[ "$prs_json" == "[]" ]] || [[ -z "$prs_json" ]]; then
    log "No PRs found"
    prs_json="[]"
fi

# Collapse multiple PRs per repo down to one:
#   1. If any are OPEN, drop the rest.
#   2. If still multiple, keep the most recently opened (createdAt desc).
# Pre-merge review intent is "review the current open delta"; merged
# siblings have already been through review.
prs_json=$(echo "$prs_json" | jq '
    group_by(.repository.name)
    | map(
        (map(select(.state == "OPEN"))) as $open
        | (if ($open | length) > 0 then $open else . end)
        | sort_by(.createdAt) | reverse | .[0:1]
      )
    | flatten
')

# Log the collapse decision so the operator sees what was filtered.
echo "$prs_json" | jq -r '.[] | "  Selected \(.repository.name)#\(.number) (\(.state), opened \(.createdAt))"' | while read -r line; do log "$line"; done

# Process all PRs (open or merged) for pre-merge review context.
# Clones run in parallel — one subshell per PR — and fetch only the
# target commit (--depth=1 of the specific SHA) to avoid pulling
# unrelated branches like gh-pages. Results land in per-task tmp files
# and are collated in PR-index order after wait so the log reads
# serially.
pr_count=$(echo "$prs_json" | jq 'length')
prep_tmpdir=$(mktemp -d)
trap 'rm -rf "$prep_tmpdir"' EXIT
prep_pids=()

for ((i=0; i<pr_count; i++)); do
    (
        pr_url=$(echo "$prs_json" | jq -r ".[$i].url")
        pr_number=$(echo "$prs_json" | jq -r ".[$i].number")
        pr_state=$(echo "$prs_json" | jq -r ".[$i].state")
        repo_name=$(echo "$prs_json" | jq -r ".[$i].repository.name")

        log "Processing $repo_name#$pr_number ($pr_state)..."

        pr_details=$("$HOME/git/defra/trade-imports-workspace/tools/github/pr-details.sh" "$repo_name" "$pr_number" json 2>/dev/null) || exit 0
        files_changed=$(echo "$pr_details" | jq -r '.files[].path' | wc -l | tr -d ' ')
        pr_merged_at=$(echo "$pr_details" | jq -r '.mergedAt // empty')

        if [[ -n "$pr_merged_at" ]] && [[ "$pr_merged_at" != "null" ]]; then
            target_commit=$(gh pr view "$pr_number" --repo "DEFRA/$repo_name" --json mergeCommit --jq '.mergeCommit.oid' 2>/dev/null)
            commit_type="merge"
        else
            target_commit=$(gh pr view "$pr_number" --repo "DEFRA/$repo_name" --json headRefOid --jq '.headRefOid' 2>/dev/null)
            commit_type="head"
        fi

        if [[ -z "$target_commit" ]] || [[ "$target_commit" == "null" ]]; then
            log "  Could not get target commit for $repo_name#$pr_number"
            exit 0
        fi

        # Shallow-fetch only the target SHA. `git init + remote add +
        # fetch --depth=1 <sha>` pulls a single commit with its trees +
        # blobs — no other branches, no history. GitHub serves this
        # because uploadpack.allowReachableSHA1InWant defaults on.
        # The fetch refspec is then pinned to the PR ref (light-remote.sh)
        # so a later bare `git fetch`/`pull` can't drag in gh-pages via
        # the default `+refs/heads/*` refspec.
        repo_dir="$REVIEW_DIR/repos/$repo_name"
        if [[ -d "$repo_dir" ]]; then
            log "  $repo_name: repo already present, fetching $target_commit..."
            (cd "$repo_dir" && \
                ( git cat-file -e "$target_commit^{commit}" 2>/dev/null \
                    || git fetch --quiet --depth=1 origin "$target_commit" ) && \
                git checkout --quiet "$target_commit") || {
                log "  Failed to checkout $target_commit in $repo_name"
                exit 0
            }
        else
            log "  $repo_name: shallow-cloning $target_commit ($commit_type)..."
            mkdir -p "$repo_dir"
            (cd "$repo_dir" && \
                git init --quiet && \
                git remote add origin "https://github.com/DEFRA/$repo_name.git" && \
                git fetch --quiet --depth=1 origin "$target_commit" && \
                git checkout --quiet "$target_commit") || {
                log "  Failed to shallow-clone $repo_name at $target_commit"
                rm -rf "$repo_dir"
                exit 0
            }
        fi

        if [[ -n "$pr_merged_at" ]] && [[ "$pr_merged_at" != "null" ]]; then
            bash "$HOME/git/defra/trade-imports-workspace/tools/git/light-remote.sh" --pr-only "$repo_dir" "$pr_number" --include-main > /dev/null || true
        else
            bash "$HOME/git/defra/trade-imports-workspace/tools/git/light-remote.sh" --pr-only "$repo_dir" "$pr_number" > /dev/null || true
        fi

        # Cache the full PR diff at a known path so consumers
        # (file-diff.sh, consistency review, orchestrator) read from
        # disk instead of each calling `gh pr diff` again.
        mkdir -p "$REVIEW_DIR/.diffs"
        gh pr diff "$pr_number" --repo "DEFRA/$repo_name" > "$REVIEW_DIR/.diffs/$repo_name.diff" 2>/dev/null || true

        tech_json=$("$SCRIPT_DIR/detect-tech.sh" "$repo_dir" 2>/dev/null) || tech_json='{"technologies":[],"best_practices":[]}'
        tech_list=$(echo "$tech_json" | jq -r '.technologies | join(", ")')

        printf '%s' "{\"repo\": \"$repo_name\", \"pr\": $pr_number, \"commit\": \"$target_commit\", \"state\": \"$pr_state\", \"files\": $files_changed, \"tech\": $tech_json}" > "$prep_tmpdir/$i.meta"
        echo "$repo_name" > "$prep_tmpdir/$i.cloned"

        if [[ -n "$tech_list" ]] && [[ "$tech_list" != "" ]]; then
            log "  ✓ $repo_name#$pr_number at ${target_commit:0:7} ($commit_type, $files_changed files) [$tech_list]"
        else
            log "  ✓ $repo_name#$pr_number at ${target_commit:0:7} ($commit_type, $files_changed files)"
        fi
    ) > "$prep_tmpdir/$i.log" 2>&1 &
    prep_pids+=($!)
done

# Wait for all PR tasks. Don't let set -e propagate a non-zero from any
# individual wait — failures are already reflected by missing $i.meta
# files, which we treat the same as `continue` did in the serial loop.
for pid in "${prep_pids[@]}"; do
    wait "$pid" 2>/dev/null || true
done

# Replay logs in PR-index order so the operator sees a stable sequence.
for ((i=0; i<pr_count; i++)); do
    [[ -f "$prep_tmpdir/$i.log" ]] && cat "$prep_tmpdir/$i.log"
done

# Collect results.
cloned_repos=()
meta_prs=()
for ((i=0; i<pr_count; i++)); do
    [[ -s "$prep_tmpdir/$i.meta" ]] && meta_prs+=("$(cat "$prep_tmpdir/$i.meta")")
    [[ -s "$prep_tmpdir/$i.cloned" ]] && cloned_repos+=("$(cat "$prep_tmpdir/$i.cloned")")
done

# Write meta file
meta_prs_json=$(printf '%s\n' "${meta_prs[@]}" | jq -s '.')

# Aggregate unique best practices across all repos
all_best_practices=$(echo "$meta_prs_json" | jq '[.[].tech.best_practices // [] | .[]] | unique')

cat > "$REVIEW_DIR/.review-meta.json" << EOF
{
    "id": "$REVIEW_ID",
    "ticket": "$TICKET",
    "branch": "$BRANCH",
    "created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "themes": ["code", "consistency"],
    "best_practices": $all_best_practices,
    "prs": $meta_prs_json
}
EOF

# Bake the per-repo applicable best-practices into a single file per
# repo so file-reviewers (and consistency reviewers) can Read once
# without invoking a helper or doing per-path filesystem walks.
log ""
log "Concatenating best-practices per repo..."
mkdir -p "$REVIEW_DIR/best-practices"
echo "$meta_prs_json" | jq -c '.[] | {repo, bps: (.tech.best_practices // [])}' \
| while IFS= read -r entry; do
    repo=$(echo "$entry" | jq -r '.repo')
    out="$REVIEW_DIR/best-practices/$repo.md"
    {
        echo "# Best practices applicable to $repo"
        echo
        echo "Concatenated from \`docs/best-practices/\` at prepare-review time."
        echo "Apply these standards when reviewing files in this repo."
        echo
        echo "$entry" | jq -r '.bps[]' | while IFS= read -r path; do
            [[ -z "$path" ]] && continue
            src="$HOME/git/defra/trade-imports-workspace/$path"
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
    log "  Created: best-practices/$repo.md"
done

# Create file review placeholders (JSON-canonical, schema in
# .claude/skills/review/assets/file-review-schema.md). Each placeholder
# starts with verdict=null and an empty todos array; the file-reviewer
# fills it via file-review-add-item.sh + file-review-set-verdict.sh.
log ""
log "Creating file review placeholders..."
total_files=0
created_files=0

prs_meta=$(jq -c '.prs[]' "$REVIEW_DIR/.review-meta.json")
while IFS= read -r pr_meta; do
    [[ -z "$pr_meta" ]] && continue
    repo=$(echo "$pr_meta" | jq -r '.repo')
    pr_number=$(echo "$pr_meta" | jq -r '.pr')
    commit=$(echo "$pr_meta" | jq -r '.commit')

    files=$("$HOME/git/defra/trade-imports-workspace/tools/github/pr-details.sh" "$repo" "$pr_number" files 2>/dev/null) || continue

    repo_review_dir="$REVIEW_DIR/file-reviews/$repo"
    mkdir -p "$repo_review_dir"

    while IFS= read -r filepath; do
        [[ -z "$filepath" ]] && continue
        ((total_files++))

        safe_path=$(echo "$filepath" | tr '/' '_')
        review_file="$repo_review_dir/${safe_path}.review.json"

        # Skip if already reviewed (verdict set).
        if [[ -f "$review_file" ]] && [[ "$(jq -r '.verdict // "null"' "$review_file" 2>/dev/null)" != "null" ]]; then
            continue
        fi

        "$SCRIPT_DIR/file-review-init.sh" "$REVIEW_ID" \
            --repo "$repo" --file "$filepath" --commit "$commit" \
            --pr "$pr_number" --mode FRESH > /dev/null
        ((created_files++))
        log "  Created: $repo/$filepath"
    done <<< "$files"
done <<< "$prs_meta"

# Create per-repo review and decisions stubs + consistency check stubs
log ""
log "Creating per-repo stubs..."
consistency_repos=()
for ((i=0; i<pr_count; i++)); do
    repo=$(echo "$prs_json" | jq -r ".[$i].repository.name")

    # Deduplicate
    already_seen=false
    for seen in "${consistency_repos[@]:-}"; do
        [[ "$seen" == "$repo" ]] && already_seen=true && break
    done
    [[ "$already_seen" == "true" ]] && continue

    consistency_repos+=("$repo")
    repo_review_dir="$REVIEW_DIR/file-reviews/$repo"
    mkdir -p "$repo_review_dir"

    # Per-repo review stub at ticket root (empty — agent fills it in Step 5)
    review_stub="$REVIEW_DIR/review.${repo}.md"
    if [[ ! -f "$review_stub" ]] || [[ ! -s "$review_stub" ]]; then
        touch "$review_stub"
        log "  Created: review.${repo}.md"
    fi

    stub="$repo_review_dir/_consistency-check.md"
    if [[ ! -f "$stub" ]] || [[ ! -s "$stub" ]]; then
        touch "$stub"
        log "  Created: $repo/_consistency-check.md"
    fi
done

# Output summary
if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$REVIEW_DIR/.review-meta.json"
else
    echo ""
    echo "=== Review Workspace Ready ==="
    if [[ "$NO_TICKET" == "true" ]]; then
        echo "Review: $REVIEW_ID"
        echo "Branch: $BRANCH"
    else
        echo "Ticket: $TICKET ($ticket_type)"
    fi
    echo "Summary: $ticket_summary"
    echo "Directory: $REVIEW_DIR"
    echo ""
    echo "Created:"
    echo "  ✓ ticket.md"
    echo "  ✓ .review-meta.json"
    if [[ ${#cloned_repos[@]} -gt 0 ]]; then
        for repo in "${cloned_repos[@]}"; do
            echo "  ✓ repos/$repo/"
        done
    fi
    echo "  ✓ file-reviews/ ($created_files files)"
    echo "  ✓ review.{repo}.md stubs (${#consistency_repos[@]} repos)"
    echo "  ✓ _consistency-check.md stubs (${#consistency_repos[@]} repos)"
    echo ""
    echo "Next: Review each file, then run ./verify-coverage.sh $REVIEW_ID"
fi
