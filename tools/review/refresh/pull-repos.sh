#!/bin/bash
# Bring every repo in the review workspace up to date: pin the fetch
# refspec to the PR ref (plus main for merged PRs), fetch, and detach
# at the target ref. Review clones are read-only snapshots — detached
# HEAD is their normal state, and the pinned refspec keeps a fetch
# from dragging in gh-pages (multi-GB) via the default `+refs/heads/*`.
# Usage:
#   pull-repos.sh EUDPA-XXXXX [--repo REPO] [--json]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"

TICKET=""
REPO_FILTER=""
JSON_OUTPUT=false

usage() {
    echo "Usage: $0 EUDPA-XXXXX [--repo REPO] [--json]" >&2
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO_FILTER="$2"; shift 2 ;;
        --json) JSON_OUTPUT=true; shift ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage

REVIEW_DIR="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"
META_FILE="$REVIEW_DIR/.review-meta.json"
[[ -f "$META_FILE" ]] || { echo "Meta file not found: $META_FILE" >&2; exit 1; }

repos=$(jq -r '.prs[].repo' "$META_FILE" | sort -u)

results_json="[]"
overall_ok=true

for repo in $repos; do
    if [[ -n "$REPO_FILTER" ]] && [[ "$repo" != "$REPO_FILTER" ]]; then
        continue
    fi
    repo_dir="$REVIEW_DIR/repos/$repo"
    if [[ ! -d "$repo_dir/.git" ]]; then
        if [[ "$JSON_OUTPUT" == "false" ]]; then
            echo "  ⚠️  $repo — not cloned, skipping"
        fi
        results_json=$(jq --arg r "$repo" --arg s "skipped" --arg m "not cloned" '. + [{repo: $r, status: $s, message: $m}]' <<<"$results_json")
        continue
    fi

    pr_number=$(jq -r --arg r "$repo" '[.prs[] | select(.repo==$r) | .pr] | first // empty' "$META_FILE")
    pr_state=$(jq -r --arg r "$repo" '[.prs[] | select(.repo==$r) | .state] | first // "open"' "$META_FILE")
    if [[ -z "$pr_number" ]]; then
        overall_ok=false
        if [[ "$JSON_OUTPUT" == "false" ]]; then
            echo "  ❌ $repo — no PR number in $META_FILE"
        fi
        results_json=$(jq --arg r "$repo" --arg s "failed" --arg m "no PR number in meta" '. + [{repo: $r, status: $s, message: $m}]' <<<"$results_json")
        continue
    fi

    # Merged PRs: refs/pull/N/head is frozen; post-merge work lands on main.
    if [[ "$pr_state" == "merged" ]]; then
        bash "$WORKSPACE/tools/git/light-remote.sh" --pr-only "$repo_dir" "$pr_number" --include-main > /dev/null
        target_ref="refs/remotes/origin/main"
        deepen_ref="main"
    else
        bash "$WORKSPACE/tools/git/light-remote.sh" --pr-only "$repo_dir" "$pr_number" > /dev/null
        target_ref="refs/remotes/origin/pr-$pr_number"
        deepen_ref="refs/pull/$pr_number/head"
    fi

    if out=$(
        git -C "$repo_dir" fetch --quiet origin 2>&1 &&
        git -C "$repo_dir" checkout --quiet --detach "$target_ref" 2>&1
    ); then
        # Shallow clones: make sure the prior-review..HEAD window is
        # walkable, or scope.sh's diff silently produces an empty List A.
        prior_sha=$(jq -r --arg r "$repo" '[.re_reviews[]?.changes[]? | select(.repo==$r) | .current_commit] | last // empty' "$META_FILE")
        [[ -z "$prior_sha" ]] && prior_sha=$(jq -r --arg r "$repo" '[.prs[] | select(.repo==$r) | .commit] | first // empty' "$META_FILE")
        if [[ -n "$prior_sha" ]]; then
            git -C "$repo_dir" rev-list --quiet "$prior_sha..HEAD" -- 2>/dev/null \
                || git -C "$repo_dir" fetch --quiet --depth=200 origin "$deepen_ref" 2>/dev/null || true
        fi
        head_sha=$(git -C "$repo_dir" rev-parse HEAD)
        if [[ "$JSON_OUTPUT" == "false" ]]; then
            echo "  ✅ $repo — at ${head_sha:0:7}"
        fi
        results_json=$(jq --arg r "$repo" --arg s "ok" --arg h "$head_sha" '. + [{repo: $r, status: $s, head: $h}]' <<<"$results_json")
    else
        overall_ok=false
        if [[ "$JSON_OUTPUT" == "false" ]]; then
            echo "  ❌ $repo — fetch/detach failed: $out"
        fi
        msg_json=$(jq -nR --arg m "$out" '$m')
        results_json=$(jq --arg r "$repo" --arg s "failed" --argjson m "$msg_json" '. + [{repo: $r, status: $s, message: $m}]' <<<"$results_json")
    fi
done

if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$results_json"
fi

[[ "$overall_ok" == "true" ]] || exit 1
