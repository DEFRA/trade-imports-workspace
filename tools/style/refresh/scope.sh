#!/bin/bash
# Build the four refresh work-lists (A/B/C/D) for an EUDPA code-style review
# in one shot, filtered to reviewable source files (any path that file-topics.sh
# maps to >= 1 topic). Mirrors review-side scope.sh but writes snapshots to
# .style-meta.json#re_reviews[] and reuses review-side helpers for git plumbing
# (the cloned repos live under workareas/reviews/$TICKET/repos regardless of
# which review surface is being refreshed).
#
# Usage:
#   scope.sh EUDPA-XXXXX [--repo R] [--no-pull] [--write-snapshot] [--human]
#
# JSON output to stdout (default). With --human, prints a readable summary.
#
# Lists:
#   A — changed source files (re-review with file reviewer)
#   B — items in items.{repo}.json that are open AND in unchanged files
#   C — source files merge-resolved in window
#   D — source files in PR with no `.style.json` (coverage gap)
#
# `prior_sha` per repo = current_commit of the most recent .style-meta.json
# re_reviews snapshot. Falls back to .review-meta.json#prs[].commit on the
# first refresh (the PR commit at original review time). If prior_sha == HEAD,
# all lists are empty.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

REVIEW_REFRESH_DIR="$HOME/git/defra/trade-imports-workspace/tools/review/refresh"
PULL_SH="$REVIEW_REFRESH_DIR/pull-repos.sh"
MERGE_SH="$REVIEW_REFRESH_DIR/list-merge-resolved.sh"
FILE_TOPICS="$SCRIPT_DIR/../file-topics.sh"

TICKET=""
REPO_FILTER=""
DO_PULL=true
WRITE_SNAPSHOT=false
HUMAN=false
JSON_OUT=""

usage() {
    cat <<EOF >&2
Usage: $0 EUDPA-XXXXX [--repo REPO] [--no-pull] [--write-snapshot] [--human] [--json-out FILE]

  --repo R           Limit to one repo
  --no-pull          Skip the git pull step
  --write-snapshot   Append a re_review snapshot to .style-meta.json after computing
  --human            Print a human-readable summary to stdout (default: JSON)
  --json-out FILE    Always write the full JSON output to FILE, regardless of stdout mode.
                     Use this with --write-snapshot --human to capture lists in one call
                     (re-running scope.sh would see the just-written snapshot and report empty).
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO_FILTER="$2"; shift 2 ;;
        --no-pull) DO_PULL=false; shift ;;
        --write-snapshot) WRITE_SNAPSHOT=true; shift ;;
        --human) HUMAN=true; shift ;;
        --json-out) JSON_OUT="$2"; shift 2 ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage

REVIEW_DIR="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"
STYLE_DIR="$HOME/git/defra/trade-imports-workspace/workareas/code-style-reviews/$TICKET"
REVIEW_META="$REVIEW_DIR/.review-meta.json"
STYLE_META="$STYLE_DIR/.style-meta.json"
[[ -f "$STYLE_META" ]] || { echo "Style meta not found: $STYLE_META" >&2; exit 1; }
[[ -f "$REVIEW_META" ]] || { echo "Review meta not found: $REVIEW_META (cloned repos live there)" >&2; exit 1; }

# ---- Step 1: pull -------------------------------------------------------

if [[ "$DO_PULL" == "true" ]]; then
    pull_args=( "$TICKET" )
    [[ -n "$REPO_FILTER" ]] && pull_args+=( --repo "$REPO_FILTER" )
    "$PULL_SH" "${pull_args[@]}" >&2 || { echo "Pull failed" >&2; exit 1; }
fi

# ---- Step 2: per-repo scope --------------------------------------------

# Discover repos: union of .style-meta.json#source_files[].repo and
# .review-meta.json#prs[].repo (style metadata is the source of truth for which
# repos have reviewable coverage, but PR/commit comes from review meta).
repos=()
while IFS= read -r repo; do repos+=( "$repo" ); done < <(jq -r '.source_files[].repo' "$STYLE_META" | sort -u)

repos_json="[]"
total_a=0; total_b=0; total_c=0; total_d=0

for repo in "${repos[@]}"; do
    [[ -n "$REPO_FILTER" && "$repo" != "$REPO_FILTER" ]] && continue

    repo_dir="$REVIEW_DIR/repos/$repo"
    [[ -d "$repo_dir/.git" ]] || { echo "Skipping $repo: not cloned at $repo_dir" >&2; continue; }

    # A repo can carry more than one PR (follow-up PRs raised mid-review);
    # use the latest as the reference point.
    pr_number=$(jq -r --arg r "$repo" '[.prs[] | select(.repo==$r) | .pr] | max' "$REVIEW_META")
    original_sha=$(jq -r --arg r "$repo" '[.prs[] | select(.repo==$r)] | max_by(.pr) | .commit' "$REVIEW_META")
    current_sha=$(git -C "$repo_dir" rev-parse HEAD)

    # prior_sha for this repo:
    #   1. .style-meta.json#re_reviews — style's own snapshot history
    #   2. .review-meta.json#re_reviews — fall back to the regular-review history
    #      (style and review share repo clones; the last time *any* refresh saw
    #      HEAD is a sane baseline)
    #   3. .review-meta.json#prs[].commit — original PR commit
    prior_sha=$(jq -r --arg r "$repo" '
        ((.re_reviews // [])
            | map(.changes[]? | select(.repo == $r))
            | last
            | .current_commit) // empty
    ' "$STYLE_META")
    if [[ -z "$prior_sha" ]]; then
        prior_sha=$(jq -r --arg r "$repo" '
            ((.re_reviews // [])
                | map(.changes[]? | select(.repo == $r))
                | last
                | .current_commit) // empty
        ' "$REVIEW_META")
    fi
    [[ -z "$prior_sha" ]] && prior_sha="$original_sha"

    # Changed files
    if [[ "$prior_sha" == "$current_sha" ]]; then
        changed_files=""
        no_changes=true
    else
        changed_files=$(git -C "$repo_dir" diff --name-only "$prior_sha..$current_sha" 2>/dev/null || true)
        no_changes=false
    fi

    # Filter to mapped source files only (>= 1 topic via file-topics.sh)
    changed_source=""
    while IFS= read -r cf; do
        [[ -z "$cf" ]] && continue
        [[ -n "$("$FILE_TOPICS" "$cf")" ]] || continue
        changed_source="${changed_source}${cf}"$'\n'
    done <<<"$changed_files"

    # Merge-resolved (mapped source only, filter from full output)
    if [[ "$no_changes" == "true" ]]; then
        merge_resolved_source=""
    else
        merge_resolved_full=$("$MERGE_SH" "$repo_dir" "$prior_sha" "$current_sha" --tsv || true)
        merge_resolved_source=""
        while IFS= read -r mrow; do
            [[ -z "$mrow" ]] && continue
            mfile="${mrow#*$'\t'}"
            [[ -z "$mfile" ]] && continue
            [[ -n "$("$FILE_TOPICS" "$mfile")" ]] || continue
            merge_resolved_source="${merge_resolved_source}${mrow}"$'\n'
        done <<<"$merge_resolved_full"
    fi

    # Coverage gaps: PR source files lacking a `.style.json`. Inline check (no
    # equivalent of list-coverage-gaps.sh — review uses .review.json, style uses
    # .style.json under file-reviews/{repo}/).
    coverage_gaps=""
    if pr_files=$(gh pr view "$pr_number" --repo "DEFRA/$repo" --json files --jq '.files[].path' 2>/dev/null); then
        while IFS= read -r f; do
            [[ -z "$f" ]] && continue
            [[ -n "$("$FILE_TOPICS" "$f")" ]] || continue
            underscored=${f//\//_}
            json_file="$STYLE_DIR/file-reviews/$repo/${underscored}.style.json"
            if [[ ! -f "$json_file" ]] || [[ "$(jq -r '.verdict // "null"' "$json_file" 2>/dev/null)" == "null" ]]; then
                coverage_gaps="${coverage_gaps}${f}"$'\n'
            fi
        done <<<"$pr_files"
    else
        echo "Warning: failed to fetch PR files for DEFRA/$repo #$pr_number" >&2
    fi

    # ---- Build Lists ------------------------------------------------------

    # Pre-build the per-repo items array (from canonical items.{repo}.json)
    # so List A and List C entries can carry `prior_items` inline.
    items_file="$STYLE_DIR/items.${repo}.json"
    if [[ -f "$items_file" ]]; then
        repo_items_json=$(jq --arg repo "$repo" '
            [.items[] | . + {repo: $repo}]
        ' "$items_file")
    else
        repo_items_json="[]"
    fi

    # List C — merge-resolved source files (with prior items per file)
    list_c_json=$(printf '%s\n' "$merge_resolved_source" \
        | jq -Rn --arg prior "$prior_sha" --arg cur "$current_sha" --argjson items "$repo_items_json" '
            [inputs | select(length > 0) | split("\t")
                | . as $row
                | {file: $row[1], merge_sha: $row[0], old_sha: $prior, new_sha: $cur,
                   prior_items: [$items[] | select(.file == $row[1])]}]
        ')

    # List A — changed source files minus merge-resolved (with prior items per file)
    merge_files=$(printf '%s' "$merge_resolved_source" | awk -F'\t' '{print $2}' | sort -u)
    list_a_files=$(comm -23 <(printf '%s\n' "$changed_source" | sort -u | grep -v '^$' || true) \
                            <(printf '%s\n' "$merge_files" | grep -v '^$' || true) || true)
    list_a_json=$(printf '%s\n' "$list_a_files" \
        | jq -Rn --arg prior "$prior_sha" --arg cur "$current_sha" --argjson items "$repo_items_json" '
            [inputs | select(length > 0) | . as $f
                | {file: $f, old_sha: $prior, new_sha: $cur,
                   prior_items: [$items[] | select(.file == $f)]}]
        ')

    # List D — coverage gaps (source files lacking a .style.json verdict)
    # No prior_items by definition — these are first-time reviews of files
    # already in the PR but never covered.
    list_d_json=$(printf '%s' "$coverage_gaps" | jq -Rn '[inputs | select(length > 0) | {file: .}]')

    # List B — items pending OR (Fix/Discuss + Not Done) AND file not in changed_files
    changed_files_json=$(printf '%s\n' "$changed_files" | jq -Rn '[inputs | select(length>0)]')
    list_b_json=$(echo "$repo_items_json" | jq --argjson changed "$changed_files_json" '
        map(select(
            (
                ((.disposition // "") == "") or
                (((.disposition == "Fix") or (.disposition == "Discuss")) and ((.status // "") == "Not Done"))
            )
            and (.file as $f | ($changed | index($f)) == null)
        ))')

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

# ---- Step 4: optionally write snapshot ---------------------------------

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
    jq --argjson s "$snap" '.re_review = $s | .re_reviews = ((.re_reviews // []) + [$s])' "$STYLE_META" > "$tmp"
    mv "$tmp" "$STYLE_META"
fi

# ---- Step 5: emit ------------------------------------------------------

# Always write JSON to --json-out target if provided, regardless of stdout mode.
if [[ -n "$JSON_OUT" ]]; then
    printf '%s\n' "$output" > "$JSON_OUT"
fi

if [[ "$HUMAN" == "true" ]]; then
    echo "Style refresh scope for $TICKET (generated $generated)"
    echo "  Totals:  A=$total_a (changed source)  B=$total_b (open inline)  C=$total_c (merge)  D=$total_d (gaps)"
    echo
    jq -r '.repos[] | "  \(.repo): A=\(.lists.A|length)  B=\(.lists.B|length)  C=\(.lists.C|length)  D=\(.lists.D|length)  prior=\(.prior_sha[0:7])..current=\(.current_sha[0:7])"' <<<"$output"
else
    echo "$output"
fi
