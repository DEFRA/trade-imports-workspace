#!/bin/bash
# Share a code review with the PR owner via a workspace handoff branch
# plus a PR comment.
#
# Usage:
#   share-review.sh EUDPA-XXXXX [--pr <number>] [--branch <name>] [--dry-run] [--json]
#
# What it does:
#   1. Reads .review-meta.json for in-scope PRs (or one PR if --pr).
#   2. Rsyncs workareas/reviews/EUDPA-X/ → workareas/shared/EUDPA-X/,
#      excluding heavy artefacts (repos/, .diffs/) so the handoff
#      branch stays small.
#   3. Creates / updates a chore/EUDPA-X-review-handoff branch on the
#      workspace repo (default name; override with --branch).
#   4. Commits the shared/ tree, pushes the branch.
#   5. Renders one markdown comment body per PR in scope (verdict +
#      that PR's repo items table + checkout instructions) and posts
#      each via tools/github/pr-comment.sh.
#   6. Emits a summary block on stdout (or JSON with --json).
#
# --dry-run skips git mutations and the comment POST; instead it renders
# the comment bodies (one per PR) to /tmp and reports where they landed.
#
# Branch name is derived as: chore/EUDPA-X (no suffix). Other scripts
# (BATCH_IMPLEMENTOR cleanup) MUST derive their branch shape from the
# same convention — see HANDOFF_BRANCH below.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"

TICKET=""
PR_FILTER=""
BRANCH_OVERRIDE=""
DRY_RUN=0
JSON=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --pr) PR_FILTER="$2"; shift 2 ;;
        --branch) BRANCH_OVERRIDE="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        --json) JSON=1; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$TICKET" ]] && { echo "Usage: $0 EUDPA-XXXXX [--pr N] [--branch B] [--dry-run] [--json]" >&2; exit 1; }

review_dir="$WORKSPACE/workareas/reviews/$TICKET"
meta="$review_dir/.review-meta.json"
[[ -f "$meta" ]] || { echo "No .review-meta.json at $meta" >&2; exit 1; }

BRANCH="${BRANCH_OVERRIDE:-chore/$TICKET}"

# ---------- Step 1: determine PRs in scope ----------

prs_json=$(jq -c '.prs' "$meta")
if [[ -n "$PR_FILTER" ]]; then
    prs_json=$(echo "$prs_json" | jq --arg pr "$PR_FILTER" '[.[] | select(.pr == ($pr | tonumber))]')
    if [[ "$(echo "$prs_json" | jq 'length')" == "0" ]]; then
        echo "PR $PR_FILTER not in .review-meta.json prs[]" >&2
        exit 1
    fi
fi

# ---------- Step 2: rsync shared/ tree ----------

shared_dir="$WORKSPACE/workareas/shared/$TICKET"
mkdir -p "$shared_dir"

if command -v rsync > /dev/null 2>&1; then
    rsync -a --delete \
        --exclude 'repos/' \
        --exclude '.diffs/' \
        "$review_dir/" "$shared_dir/"
else
    # cp fallback (no rsync on the box)
    rm -rf "$shared_dir"
    mkdir -p "$shared_dir"
    for entry in "$review_dir"/*; do
        name=$(basename "$entry")
        case "$name" in
            repos|.diffs) continue ;;
            *) cp -R "$entry" "$shared_dir/" ;;
        esac
    done
    # also copy dotfiles like .review-meta.json
    for entry in "$review_dir"/.[!.]*; do
        [[ -e "$entry" ]] || continue
        name=$(basename "$entry")
        case "$name" in
            .diffs) continue ;;
            *) cp -R "$entry" "$shared_dir/" ;;
        esac
    done
fi

# ---------- Step 3: render the comment bodies (one per PR) ----------

verdict=""
if [[ -f "$shared_dir/review-index.md" ]]; then
    verdict=$(grep -m1 '^\*\*Verdict:\*\*' "$shared_dir/review-index.md" | sed 's/^\*\*Verdict:\*\*[[:space:]]*//')
fi

reviewer=$("$WORKSPACE/tools/github/whoami.sh" 2>/dev/null || echo "(unknown)")

pr_repos=()
pr_nums=()
pr_bodies=()

while IFS=$'\t' read -r repo pr; do
    body_tmp=$(mktemp -t "share-review-$TICKET-pr$pr-XXXXXX.md")

    {
        echo "# Code review handoff — $TICKET"
        echo
        if [[ -n "$verdict" ]]; then
            echo "**Verdict:** $verdict"
        fi
        echo "**Reviewer:** @$reviewer"
        echo "**Handoff branch:** \`$BRANCH\` (workspace repo)"
        echo

        # This PR's repo items table (only renders if items.{repo}.json
        # exists, which it should after FRESH Step 5).
        items_file="$shared_dir/items.${repo}.json"
        review_md="$shared_dir/review.${repo}.md"

        echo "## Repository: \`$repo\`"
        echo

        if [[ -f "$items_file" ]]; then
            "$SCRIPT_DIR/render-items.sh" "$TICKET" --repo "$repo" 2>/dev/null || true
            echo
        elif [[ -f "$review_md" ]]; then
            echo "_See \`$(basename "$review_md")\` on the handoff branch._"
            echo
        fi

        cat <<EOF
## Action this review

**Option A — walk it in Claude Code (recommended):**

\`\`\`bash
# Branch-scoped fetch — a bare \`fetch origin\` would also pull the
# workspace repo's gh-pages (~1 GiB).
git -C ~/git/defra/trade-imports-workspace fetch origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
git -C ~/git/defra/trade-imports-workspace checkout $BRANCH
\`\`\`

Then in a Claude Code session opened at the workspace:

\`\`\`
walk review $TICKET
implement review $TICKET
\`\`\`

The shared \`items.{repo}.json\` lives on this branch — your dispositions
write back to the same file, so push your commits to \`$BRANCH\` to keep
the state in sync. The implementor will offer to clean up the local +
remote branch when it finishes.

**Option B — action manually:** read the items table above and apply
each fix in your PR branch directly. No checkout needed.

---

_Generated by the \`review\` skill ($TICKET). Branch lifecycle is owned
by the implementor — it offers cleanup on completion._
EOF
    } > "$body_tmp"

    pr_repos+=("$repo")
    pr_nums+=("$pr")
    pr_bodies+=("$body_tmp")
done < <(echo "$prs_json" | jq -r '.[] | "\(.repo)\t\(.pr)"')

body_files_json="[]"
for i in "${!pr_repos[@]}"; do
    body_files_json=$(echo "$body_files_json" | jq \
        --arg repo "${pr_repos[$i]}" \
        --argjson pr "${pr_nums[$i]}" \
        --arg file "${pr_bodies[$i]}" \
        '. + [{repo: $repo, pr: $pr, file: $file}]')
done

# ---------- Step 4: git mutations + comment POST ----------

if [[ "$DRY_RUN" == "1" ]]; then
    if [[ "$JSON" == "1" ]]; then
        jq -n \
            --arg ticket "$TICKET" \
            --arg branch "$BRANCH" \
            --argjson body_files "$body_files_json" \
            --argjson prs "$prs_json" \
            '{dry_run: true, ticket: $ticket, branch: $branch, body_files: $body_files, prs: $prs}'
    else
        echo "DRY RUN — no git mutations, no PR comment posted."
        echo "Ticket:        $TICKET"
        echo "Handoff branch: $BRANCH"
        echo "PRs in scope:  $(echo "$prs_json" | jq -r '[.[] | "\(.repo)#\(.pr)"] | join(", ")')"
        echo "Reviewer:      $reviewer"
        echo "Rendered bodies:"
        for i in "${!pr_repos[@]}"; do
            echo "  - ${pr_repos[$i]}#${pr_nums[$i]} → ${pr_bodies[$i]}"
        done
        echo
        echo "Inspect a body with: cat <file>"
    fi
    exit 0
fi

# Stash any unrelated working changes so the checkout doesn't lose them.
# We don't go that far here — just abort if the workspace is dirty
# outside workareas/shared/.
# -uall: without it, an entirely-untracked workareas/shared/ tree collapses
# to a single "?? workareas/" line that the exclusion patterns can't match.
dirty=$(git -C "$WORKSPACE" status --porcelain -uall | grep -v '^?? workareas/shared/' | grep -v '^.M workareas/shared/' | grep -v 'workareas/shared/' || true)
if [[ -n "$dirty" ]]; then
    echo "Workspace has uncommitted changes outside workareas/shared/:" >&2
    echo "$dirty" >&2
    echo "Commit or stash before running share-review.sh." >&2
    exit 1
fi

current_branch=$(git -C "$WORKSPACE" rev-parse --abbrev-ref HEAD)

# Branch may already exist (re-share). The freshly-rsynced shared tree is
# untracked on the current branch but tracked on an existing handoff
# branch, so a plain checkout refuses to overwrite it — park the payload,
# switch, then restore it over the branch's older copy.
shared_tmp=$(mktemp -d -t "share-review-$TICKET")
mv "$shared_dir" "$shared_tmp/payload"
if git -C "$WORKSPACE" show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git -C "$WORKSPACE" checkout "$BRANCH"
elif git -C "$WORKSPACE" show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
    # A colleague already shared this review. Branching from the current
    # HEAD instead would diverge from their handoff branch, and the push
    # below is not forced — it would be rejected after the artefacts are
    # already committed, leaving the workspace on the handoff branch.
    git -C "$WORKSPACE" checkout -b "$BRANCH" --track "origin/$BRANCH"
else
    git -C "$WORKSPACE" checkout -b "$BRANCH"
fi
rm -rf "$shared_dir"
mv "$shared_tmp/payload" "$shared_dir"
rmdir "$shared_tmp"

git -C "$WORKSPACE" add "workareas/shared/$TICKET"

if git -C "$WORKSPACE" diff --cached --quiet; then
    echo "No changes to commit on $BRANCH (artefacts already up to date)."
else
    git -C "$WORKSPACE" commit -m "review($TICKET): handoff artefacts

Posted by tools/review/share-review.sh."
fi

git -C "$WORKSPACE" push -u origin "$BRANCH"

# Return the workspace to wherever it was.
git -C "$WORKSPACE" checkout "$current_branch"

# Post each PR its own comment body.
posted=()
for i in "${!pr_repos[@]}"; do
    url=$("$WORKSPACE/tools/github/pr-comment.sh" "${pr_repos[$i]}" "${pr_nums[$i]}" --body-file "${pr_bodies[$i]}")
    posted+=("${pr_repos[$i]}#${pr_nums[$i]} → $url")
done

if [[ "$JSON" == "1" ]]; then
    jq -n \
        --arg ticket "$TICKET" \
        --arg branch "$BRANCH" \
        --argjson prs "$prs_json" \
        --argjson body_files "$body_files_json" \
        --argjson posted "$(printf '%s\n' "${posted[@]}" | jq -R . | jq -s .)" \
        '{dry_run: false, ticket: $ticket, branch: $branch, prs: $prs, posted: $posted, body_files: $body_files}'
else
    echo "Handoff complete for $TICKET."
    echo
    echo "Branch:        $BRANCH (pushed to origin)"
    echo "Reviewer:      $reviewer"
    echo "Comments posted:"
    for line in "${posted[@]}"; do
        echo "  - $line"
    done
    echo
    echo "Bodies archived at:"
    for i in "${!pr_repos[@]}"; do
        echo "  - ${pr_repos[$i]}#${pr_nums[$i]} → ${pr_bodies[$i]}"
    done
fi
