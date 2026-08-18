#!/bin/bash
# Build the four refresh work-lists (A/B/C/D) for an EUDPA review in one shot.
# Replaces the per-repo bash one-liners that REVIEWER.md previously asked the
# agent to reconstruct on the fly for R1, R2.6, R2.7, and R3.
#
# Usage:
#   scope.sh EUDPA-XXXXX [--repo R] [--no-pull] [--write-snapshot] [--human]
#
# By default outputs JSON to stdout. With --human, prints a readable summary.
# The persona owns prompt rendering; this script just classifies files into
# Lists A (changed), B (open items in unchanged files), C (merge-resolved),
# and D (coverage gaps).
#
# `prior_sha` per repo is the current_commit of the most recent re_review snapshot
# (the last time scope recorded HEAD for this repo). Falls back to `.prs[].commit`
# on the first refresh. If prior_sha == today's HEAD, the repo has not changed
# since the last refresh and its lists will be empty.
#
# With --write-snapshot, after computing the lists, append a snapshot to
# `.review-meta.json#re_reviews[]` recording (reviewed=prior_sha, current=HEAD).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PULL_SH="$SCRIPT_DIR/pull-repos.sh"
MERGE_SH="$SCRIPT_DIR/list-merge-resolved.sh"
GAPS_SH="$SCRIPT_DIR/list-coverage-gaps.sh"
ITEMS_SH="$HOME/git/defra/trade-imports-workspace/tools/review/review-items.sh"

TICKET=""
REPO_FILTER=""
DO_PULL=true
WRITE_SNAPSHOT=false
HUMAN=false

usage() {
    cat <<EOF >&2
Usage: $0 EUDPA-XXXXX [--repo REPO] [--no-pull] [--write-snapshot] [--human]

  --repo R           Limit to one repo
  --no-pull          Skip the git pull step
  --write-snapshot   Append a re_review snapshot to .review-meta.json after computing
  --human            Print a human-readable summary instead of JSON
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO_FILTER="$2"; shift 2 ;;
        --no-pull) DO_PULL=false; shift ;;
        --write-snapshot) WRITE_SNAPSHOT=true; shift ;;
        --human) HUMAN=true; shift ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage

REVIEW_DIR="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"
META_FILE="$REVIEW_DIR/.review-meta.json"
[[ -f "$META_FILE" ]] || { echo "Meta file not found: $META_FILE" >&2; exit 1; }

# ---- Step 1: pull -------------------------------------------------------

if [[ "$DO_PULL" == "true" ]]; then
    if ! pull_args=( "$TICKET" ); then :; fi
    [[ -n "$REPO_FILTER" ]] && pull_args+=( --repo "$REPO_FILTER" )
    "$PULL_SH" "${pull_args[@]}" >&2 || { echo "Pull failed" >&2; exit 1; }
fi

# ---- Step 2: per-repo: prior_sha, current_sha, changed files -----------

# Read items table once (TSV)
items_tsv=$("$ITEMS_SH" "$TICKET")

# Iterate repos from prs[]
repos=()
while IFS= read -r repo; do repos+=( "$repo" ); done < <(jq -r '.prs[].repo' "$META_FILE" | sort -u)

repos_json="[]"
total_a=0; total_b=0; total_c=0; total_d=0

for repo in "${repos[@]}"; do
    [[ -n "$REPO_FILTER" && "$repo" != "$REPO_FILTER" ]] && continue

    repo_dir="$REVIEW_DIR/repos/$repo"
    [[ -d "$repo_dir/.git" ]] || { echo "Skipping $repo: not cloned" >&2; continue; }

    # A repo can carry more than one PR (follow-up PRs raised mid-review);
    # the latest PR is the reference point, gaps are checked across all.
    pr_number=$(jq -r --arg r "$repo" '[.prs[] | select(.repo==$r) | .pr] | max' "$META_FILE")
    original_sha=$(jq -r --arg r "$repo" '[.prs[] | select(.repo==$r)] | max_by(.pr) | .commit' "$META_FILE")
    all_pr_numbers=$(jq -r --arg r "$repo" '.prs[] | select(.repo==$r) | .pr' "$META_FILE")
    current_sha=$(git -C "$repo_dir" rev-parse HEAD)

    # prior_sha = the most recent re_review snapshot's current_commit for this repo
    # (i.e. where the last refresh saw HEAD). Falls back to prs[].commit on first
    # refresh. If prior_sha == today's HEAD, the diff is empty — no changes.
    prior_sha=$(jq -r --arg r "$repo" '
        ((.re_reviews // [])
            | map(.changes[]? | select(.repo == $r))
            | last
            | .current_commit) // empty
    ' "$META_FILE")
    [[ -z "$prior_sha" ]] && prior_sha="$original_sha"

    # Changed files
    if [[ "$prior_sha" == "$current_sha" ]]; then
        changed_files=""
        no_changes=true
    else
        changed_files=$(git -C "$repo_dir" diff --name-only "$prior_sha..$current_sha" 2>/dev/null || true)
        no_changes=false
    fi

    # Merge-resolved files (TSV: merge_sha\tfile)
    if [[ "$no_changes" == "true" ]]; then
        merge_resolved=""
    else
        merge_resolved=$("$MERGE_SH" "$repo_dir" "$prior_sha" "$current_sha" --tsv || true)
    fi

    # Coverage gaps — across every PR recorded for this repo
    coverage_gaps=$(
        for pn in $all_pr_numbers; do
            "$GAPS_SH" "$REVIEW_DIR" "$repo" "$pn" --tsv 2>/dev/null || true
        done | sort -u
    )

    # ---- Build Lists ------------------------------------------------------
    # List C — merge-resolved
    list_c_json=$(printf '%s\n' "$merge_resolved" | jq -Rn --arg prior "$prior_sha" --arg cur "$current_sha" '
        [inputs | select(length > 0) | split("\t")
            | {file: .[1], merge_sha: .[0], old_sha: $prior, new_sha: $cur}]
    ')

    # List A — changed files minus merge-resolved files
    merge_files=$(printf '%s' "$merge_resolved" | awk -F'\t' '{print $2}' | sort -u)
    list_a_files=$(comm -23 <(printf '%s\n' "$changed_files" | sort -u | grep -v '^$' || true) \
                            <(printf '%s\n' "$merge_files" | grep -v '^$' || true) || true)
    list_a_json=$(printf '%s\n' "$list_a_files" | jq -Rn --arg prior "$prior_sha" --arg cur "$current_sha" '
        [inputs | select(length > 0) | {file: ., old_sha: $prior, new_sha: $cur}]
    ')

    # List D — coverage gaps
    list_d_json=$(printf '%s\n' "$coverage_gaps" | jq -Rn '[inputs | select(length > 0) | {file: .}]')

    # List B — items pending OR (Fix/Discuss + Not Done) AND file not in changed_files
    list_b_json=$(printf '%s' "$items_tsv" \
        | awk -F'\t' -v REPO="$repo" '$1 == REPO { print }' \
        | awk -F'\t' '
            BEGIN { OFS="\t" }
            {
                disp = $9
                stat = $10
                if (disp == "" || ((disp == "Fix" || disp == "Discuss") && stat == "Not Done")) {
                    print $0
                }
            }' \
        | jq -Rn --argjson changed "$(printf '%s\n' "$changed_files" | jq -Rn '[inputs | select(length>0)]')" '
            [inputs | select(length > 0) | split("\t") |
                {repo: .[0], id: (.[1] | tonumber? // .[1]), file: .[2], line: .[3],
                 severity: .[4], category: .[5], issue: .[6], fix: .[7],
                 disposition: .[8], status: .[9], notes: .[10]}
            ] | map(select(.file as $f | ($changed | index($f)) == null))
        ')

    a_count=$(jq 'length' <<<"$list_a_json")
    b_count=$(jq 'length' <<<"$list_b_json")
    c_count=$(jq 'length' <<<"$list_c_json")
    d_count=$(jq 'length' <<<"$list_d_json")
    total_a=$((total_a + a_count))
    total_b=$((total_b + b_count))
    total_c=$((total_c + c_count))
    total_d=$((total_d + d_count))

    repo_obj=$(jq -n \
        --arg repo "$repo" \
        --argjson pr "$pr_number" \
        --arg prior "$prior_sha" \
        --arg current "$current_sha" \
        --argjson no_changes "$no_changes" \
        --argjson a "$list_a_json" \
        --argjson b "$list_b_json" \
        --argjson c "$list_c_json" \
        --argjson d "$list_d_json" '
        {
            repo: $repo, pr: $pr, prior_sha: $prior, current_sha: $current,
            no_changes: $no_changes,
            lists: {A: $a, B: $b, C: $c, D: $d}
        }')

    repos_json=$(jq --argjson r "$repo_obj" '. + [$r]' <<<"$repos_json")
done

# ---- Step 3: assemble output -------------------------------------------

generated=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
output=$(jq -n \
    --arg ticket "$TICKET" \
    --arg generated "$generated" \
    --argjson repos "$repos_json" \
    --argjson totals "$(jq -n --argjson a "$total_a" --argjson b "$total_b" --argjson c "$total_c" --argjson d "$total_d" '{list_a: $a, list_b: $b, list_c: $c, list_d: $d}')" '
    {ticket: $ticket, generated: $generated, totals: $totals, repos: $repos}')

# ---- Step 4: optionally write snapshot ----------------------------------

if [[ "$WRITE_SNAPSHOT" == "true" ]]; then
    snap=$(jq -n \
        --arg ts "$generated" \
        --argjson repos "$repos_json" '
        {
            re_review_started: $ts,
            changes: ($repos | map({
                repo: .repo, pr: .pr,
                reviewed_commit: .prior_sha,
                current_commit: .current_sha,
                changed: (.no_changes | not),
                file_count: ((.lists.A | length) + (.lists.C | length) + (.lists.D | length))
            }))
        }')
    tmp=$(mktemp)
    jq --argjson s "$snap" '.re_review = $s | .re_reviews = ((.re_reviews // []) + [$s])' "$META_FILE" > "$tmp"
    mv "$tmp" "$META_FILE"

    # Reset per-file `.review.json` todos for files about to be re-reviewed
    # (Lists A and C). Without this, REFRESH reviewers that find nothing new
    # leave the prior FRESH todos in place; the reconciler then re-appends
    # them as duplicates of the items already in items.{repo}.json.
    # List D files have no .review.json yet (they ARE the coverage gap) so
    # nothing to clear.
    while IFS=$'\t' read -r repo file; do
        [[ -z "$repo" || -z "$file" ]] && continue
        underscored=${file//\//_}
        rj="$REVIEW_DIR/file-reviews/$repo/${underscored}.review.json"
        [[ -f "$rj" ]] || continue
        tmp=$(mktemp)
        jq '.todos = []' "$rj" > "$tmp" && mv "$tmp" "$rj"
    done < <(jq -r '.repos[] | .repo as $r | (.lists.A + .lists.C)[] | [$r, .file] | @tsv' <<<"$output")
fi

# ---- Step 5: emit -------------------------------------------------------

if [[ "$HUMAN" == "true" ]]; then
    echo "Refresh scope for $TICKET (generated $generated)"
    echo "  Totals:  A=$total_a (changed)  B=$total_b (open inline)  C=$total_c (merge)  D=$total_d (gaps)"
    echo
    jq -r '.repos[] | "  \(.repo): A=\(.lists.A|length)  B=\(.lists.B|length)  C=\(.lists.C|length)  D=\(.lists.D|length)  prior=\(.prior_sha[0:7])..current=\(.current_sha[0:7])"' <<<"$output"
else
    echo "$output"
fi
