#!/bin/bash
# Post a code review to its PR(s) as a comment — optionally with a
# workspace handoff branch so the PR owner can walk the review.
#
# Usage:
#   share-review.sh EUDPA-XXXXX [--repo <name>] [--pr <number>] [--comment-only]
#                   [--summary] [--branch <name>] [--dry-run] [--json]
#
# What it does:
#   1. Reads .review-meta.json for in-scope PRs (narrowed by --repo and/or
#      --pr — PR numbers repeat across repos, so pass both to pin one PR).
#   2. Rsyncs workareas/reviews/EUDPA-X/ → workareas/shared/EUDPA-X/,
#      excluding heavy artefacts (repos/, .diffs/) so the handoff
#      branch stays small.
#   3. Creates / updates a chore/EUDPA-X branch on the workspace repo
#      (default name; override with --branch).
#   4. Commits the shared/ tree, pushes the branch.
#   5. Renders one markdown comment body per PR in scope (verdict +
#      that PR's repo items table + next steps) and posts each via
#      tools/github/pr-comment.sh.
#   6. Emits a summary block on stdout (or JSON with --json).
#
# --comment-only skips steps 2-4: no shared/ tree, no branch, no push, and
# no dirty-workspace check. Use it for PRs you authored — the review state
# is already on your machine, so there is nobody to hand it off to.
#
# --summary posts counts in place of the full item table: the verdict, a
# status and severity breakdown for that repo, and where the detail lives.
# GitHub caps a comment at 65536 characters and the full table passes that
# at a few hundred items, so a large review cannot be posted without it.
# It is also the readable choice for announcing an outcome rather than
# handing over work. Every body is size-checked before it is posted either
# way, so an over-long comment fails here with the figures rather than at
# the API.
#
# --dry-run skips git mutations and the comment POST; instead it renders
# the comment bodies (one per PR) to /tmp and reports where they landed.
#
# Branch name is derived as: chore/EUDPA-X (no suffix). Other scripts
# (BATCH_IMPLEMENTOR cleanup) MUST derive their branch shape from the
# same convention.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"

TICKET=""
REPO_FILTER=""
PR_FILTER=""
BRANCH_OVERRIDE=""
COMMENT_ONLY=0
DRY_RUN=0
JSON=0
SUMMARY=0

# What GitHub accepts in one issue-comment body.
GITHUB_COMMENT_LIMIT=65536

usage() {
    cat >&2 <<EOF
Usage: $0 EUDPA-XXXXX [--repo R] [--pr N] [--comment-only] [--summary]
                      [--branch B] [--dry-run] [--json]

  --repo R         Only PRs in this repo. PR numbers repeat across repos,
                   so pass --repo and --pr together to pin one PR.
  --pr N           Only this PR number.
  --comment-only   Post the comment with no handoff branch. For PRs you
                   authored: the review state is already on your machine,
                   so there is nobody to hand it off to.
  --summary        Post counts in place of the full item table — the
                   verdict, a status and severity breakdown for that repo,
                   and where the detail lives. GitHub caps a comment at
                   $GITHUB_COMMENT_LIMIT characters and the full table
                   passes that at a few hundred items, so a large review
                   needs this. Also the readable choice for announcing an
                   outcome rather than handing over work.
  --branch B       Handoff branch name (default chore/EUDPA-XXXXX).
  --dry-run        Render the bodies to /tmp; no git mutations, no POST.
  --json           Emit a JSON summary on stdout.
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --repo) REPO_FILTER="$2"; shift 2 ;;
        --pr) PR_FILTER="$2"; shift 2 ;;
        --comment-only) COMMENT_ONLY=1; shift ;;
        --summary) SUMMARY=1; shift ;;
        --branch) BRANCH_OVERRIDE="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        --json) JSON=1; shift ;;
        -h|--help) usage ;;
        *) echo "Unknown arg: $1" >&2; usage ;;
    esac
done

[[ -z "$TICKET" ]] && usage

review_dir="$WORKSPACE/workareas/reviews/$TICKET"
meta="$review_dir/.review-meta.json"
[[ -f "$meta" ]] || { echo "No .review-meta.json at $meta" >&2; exit 1; }

BRANCH="${BRANCH_OVERRIDE:-chore/$TICKET}"

if [[ "$COMMENT_ONLY" == "1" ]]; then
    MODE="comment-only"
else
    MODE="handoff"
fi

# ---------- Step 1: determine PRs in scope ----------

prs_json=$(jq -c '.prs' "$meta")
if [[ -n "$REPO_FILTER" ]]; then
    prs_json=$(echo "$prs_json" | jq --arg repo "$REPO_FILTER" '[.[] | select(.repo == $repo)]')
fi
if [[ -n "$PR_FILTER" ]]; then
    prs_json=$(echo "$prs_json" | jq --arg pr "$PR_FILTER" '[.[] | select(.pr == ($pr | tonumber))]')
fi
if [[ "$(echo "$prs_json" | jq 'length')" == "0" ]]; then
    echo "No PR matching${REPO_FILTER:+ repo $REPO_FILTER}${PR_FILTER:+ PR $PR_FILTER} in .review-meta.json prs[]" >&2
    exit 1
fi

# ---------- Step 2: rsync shared/ tree (handoff only) ----------

shared_dir="$WORKSPACE/workareas/shared/$TICKET"

if [[ "$COMMENT_ONLY" == "1" ]]; then
    artefact_dir="$review_dir"
else
    artefact_dir="$shared_dir"
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
fi

# ---------- Step 3: render the comment bodies (one per PR) ----------

verdict=""
if [[ -f "$artefact_dir/review-index.md" ]]; then
    verdict=$(grep -m1 '^\*\*Verdict:\*\*' "$artefact_dir/review-index.md" | sed 's/^\*\*Verdict:\*\*[[:space:]]*//')
fi

reviewer=$("$WORKSPACE/tools/github/whoami.sh" 2>/dev/null || echo "(unknown)")

# Counts for one repo's items, in place of the full table. Status and
# severity are reported separately because an item's severity says how
# much it mattered and its status says what became of it; one table
# cannot be read for both.
render_item_counts() {
    local items_file="$1"

    echo "| Status | Items |"
    echo "|---|---|"
    jq -r '
        [.items[] | (.status // "—") + " / " + (.disposition // "none")]
        | group_by(.) | map({k: .[0], n: length}) | sort_by(-.n)
        | .[] | "| \(.k) | \(.n) |"
    ' "$items_file"
    echo
    echo "| Severity | Open | Total |"
    echo "|---|---|---|"
    jq -r '
        [.items[]] as $all
        | ["Critical", "Major", "Minor"]
        | map(. as $sev | {
            sev: $sev,
            open: ([$all[] | select(.severity == $sev and .status == "Not Done")] | length),
            total: ([$all[] | select(.severity == $sev)] | length)
          })
        | .[] | select(.total > 0) | "| \(.sev) | \(.open) | \(.total) |"
    ' "$items_file"
    echo
    echo "_$(jq -r '.items | length' "$items_file") items in this repo. Each one, with its issue, what it must satisfy and the commit that closed it, is in \`$(basename "$items_file")\`._"
}

pr_repos=()
pr_nums=()
pr_bodies=()

while IFS=$'\t' read -r repo pr; do
    body_tmp=$(mktemp -t "share-review-$TICKET-pr$pr-XXXXXX.md")

    {
        if [[ "$COMMENT_ONLY" == "1" ]]; then
            echo "# Code review — $TICKET"
        else
            echo "# Code review handoff — $TICKET"
        fi
        echo
        if [[ -n "$verdict" ]]; then
            echo "**Verdict:** $verdict"
        fi
        echo "**Reviewer:** @$reviewer"
        # Name the commit the findings were raised against, so a reader can
        # tell what the verdict covers when the head has since moved.
        reviewed_sha=$(echo "$prs_json" | jq -r --arg repo "$repo" \
            'first(.[] | select(.repo == $repo) | .commit) // "" | .[0:8]')
        if [[ -n "$reviewed_sha" ]]; then
            echo "**Reviewed at:** \`$reviewed_sha\`"
        fi
        if [[ "$COMMENT_ONLY" == "0" ]]; then
            echo "**Handoff branch:** \`$BRANCH\` (workspace repo)"
        fi
        echo

        # This PR's repo items table (only renders if items.{repo}.json
        # exists, which it should after FRESH Step 5).
        items_file="$artefact_dir/items.${repo}.json"
        review_md="$artefact_dir/review.${repo}.md"

        echo "## Repository: \`$repo\`"
        echo

        if [[ -f "$items_file" && "$SUMMARY" == "1" ]]; then
            render_item_counts "$items_file"
            echo
        elif [[ -f "$items_file" ]]; then
            "$SCRIPT_DIR/render-items.sh" "$TICKET" --repo "$repo" 2>/dev/null || true
            echo
        elif [[ -f "$review_md" && "$COMMENT_ONLY" == "1" ]]; then
            echo "_See \`workareas/reviews/$TICKET/$(basename "$review_md")\` in the reviewer's workspace._"
            echo
        elif [[ -f "$review_md" ]]; then
            echo "_See \`$(basename "$review_md")\` on the handoff branch._"
            echo
        fi

        if [[ "$COMMENT_ONLY" == "1" ]]; then
            # A summary announces an outcome, so what it asks for depends
            # on whether anything is still open. The full table is always
            # a request to triage.
            open_count=""
            if [[ "$SUMMARY" == "1" && -f "$items_file" ]]; then
                open_count=$(jq -r '[.items[] | select(.status == "Not Done")] | length' "$items_file")
            fi

            echo "## Action this review"
            echo
            if [[ -n "$open_count" && "$open_count" == "0" ]]; then
                cat <<EOF
Nothing is open in this repo. The review state lives in
\`workareas/reviews/$TICKET/\` in the reviewer's workspace, with every
item's disposition and the commit that closed it.
EOF
            else
                [[ -n "$open_count" ]] && echo "$open_count item(s) remain open in this repo." && echo
                cat <<EOF
The review state lives in \`workareas/reviews/$TICKET/\` in the
reviewer's workspace. Triage and apply it from a Claude Code session
opened there:

\`\`\`
walk review $TICKET
implement review $TICKET
\`\`\`
EOF
            fi
            cat <<EOF

---

_Generated by the \`review\` skill ($TICKET)._
EOF
        else
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
        fi
    } > "$body_tmp"

    body_size=$(wc -c < "$body_tmp" | tr -d '[:space:]')
    if (( body_size > GITHUB_COMMENT_LIMIT )); then
        echo "Comment body for $repo#$pr is $body_size characters; GitHub accepts $GITHUB_COMMENT_LIMIT." >&2
        if [[ "$SUMMARY" == "1" ]]; then
            echo "Already summarising. Shorten the verdict in review-index.md, or post the detail as an attachment on the ticket." >&2
        else
            echo "Re-run with --summary to post counts instead of the full item table." >&2
        fi
        echo "Rendered body left at: $body_tmp" >&2
        exit 1
    fi

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

if [[ "$COMMENT_ONLY" == "1" ]]; then
    branch_json="null"
else
    branch_json=$(jq -n --arg branch "$BRANCH" '$branch')
fi

# ---------- Step 4: git mutations + comment POST ----------

if [[ "$DRY_RUN" == "1" ]]; then
    if [[ "$JSON" == "1" ]]; then
        jq -n \
            --arg ticket "$TICKET" \
            --arg mode "$MODE" \
            --argjson branch "$branch_json" \
            --argjson body_files "$body_files_json" \
            --argjson prs "$prs_json" \
            '{dry_run: true, ticket: $ticket, mode: $mode, branch: $branch, body_files: $body_files, prs: $prs}'
    else
        echo "DRY RUN — no git mutations, no PR comment posted."
        echo "Ticket:        $TICKET"
        echo "Mode:          $MODE"
        if [[ "$COMMENT_ONLY" == "0" ]]; then
            echo "Handoff branch: $BRANCH"
        fi
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

if [[ "$COMMENT_ONLY" == "0" ]]; then
    # Abort if the workspace is dirty outside workareas/shared/ so the
    # branch checkout can't lose unrelated work.
    # -uall: without it, an entirely-untracked workareas/shared/ tree collapses
    # to a single "?? workareas/" line that the exclusion patterns can't match.
    dirty=$(git -C "$WORKSPACE" status --porcelain -uall | grep -v '^?? workareas/shared/' | grep -v '^.M workareas/shared/' | grep -v 'workareas/shared/' || true)
    if [[ -n "$dirty" ]]; then
        echo "Workspace has uncommitted changes outside workareas/shared/:" >&2
        echo "$dirty" >&2
        echo "Commit or stash before running share-review.sh, or pass --comment-only to post without a handoff branch." >&2
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
fi

# Post each PR its own comment body.
posted=()
for i in "${!pr_repos[@]}"; do
    url=$("$WORKSPACE/tools/github/pr-comment.sh" "${pr_repos[$i]}" "${pr_nums[$i]}" --body-file "${pr_bodies[$i]}")
    posted+=("${pr_repos[$i]}#${pr_nums[$i]} → $url")
done

if [[ "$JSON" == "1" ]]; then
    jq -n \
        --arg ticket "$TICKET" \
        --arg mode "$MODE" \
        --argjson branch "$branch_json" \
        --argjson prs "$prs_json" \
        --argjson body_files "$body_files_json" \
        --argjson posted "$(printf '%s\n' "${posted[@]}" | jq -R . | jq -s .)" \
        '{dry_run: false, ticket: $ticket, mode: $mode, branch: $branch, prs: $prs, posted: $posted, body_files: $body_files}'
else
    if [[ "$COMMENT_ONLY" == "1" ]]; then
        echo "Review posted for $TICKET."
    else
        echo "Handoff complete for $TICKET."
    fi
    echo
    if [[ "$COMMENT_ONLY" == "0" ]]; then
        echo "Branch:        $BRANCH (pushed to origin)"
    fi
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
