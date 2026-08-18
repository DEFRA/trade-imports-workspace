#!/bin/bash
# Pre-flight for the IMPLEMENT phase — assert plan exists, re-validate
# detect-tech per repo (in case repos shifted since plan time), cache the
# PR diff if a prior PR for the ticket exists, emit .implement-meta.json.
#
# Usage: prepare-implement.sh EUDPA-XXXXX [--repo REPO] [--json]
#
# Reads workareas/ticket-planning/EUDPA-XXXXX/{plan.md,.plan-meta.json}.
# Writes workareas/ticket-planning/EUDPA-XXXXX/.implement-meta.json plus
# (if PRs exist) .diffs/<repo>.diff.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"

TICKET=""
REPO_FILTER=""
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --repo)
            REPO_FILTER="$2"
            shift 2
            ;;
        -h|--help)
            sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        EUDPA-*)
            TICKET="$1"
            shift
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

if [[ -z "$TICKET" ]]; then
    echo "Usage: $0 EUDPA-XXXXX [--repo REPO] [--json]" >&2
    exit 1
fi

command -v jq >/dev/null 2>&1 || { echo "Error: jq is required" >&2; exit 1; }

PLAN_DIR="$WORKSPACE/workareas/ticket-planning/$TICKET"
PLAN_FILE="$PLAN_DIR/plan.md"

if [[ ! -f "$PLAN_FILE" ]]; then
    echo "Error: plan not found at $PLAN_FILE — run PLANNER first" >&2
    exit 1
fi

log() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo "$1"
    fi
}

log "Plan present: $PLAN_FILE"

# Re-validate detect-tech per repo. Prefer .plan-meta.json's repo list;
# fall back to --repo filter alone if meta is missing.
plan_meta="$PLAN_DIR/.plan-meta.json"
repo_list=()
if [[ -f "$plan_meta" ]]; then
    while IFS= read -r r; do
        [[ -z "$r" ]] && continue
        repo_list+=("$r")
    done < <(jq -r '.repos[]?.repo // empty' "$plan_meta")
fi

if [[ -n "$REPO_FILTER" ]]; then
    repo_list=("$REPO_FILTER")
fi

revalidated="[]"
revalidated_arr=()
if [[ ${#repo_list[@]} -gt 0 ]]; then
    log ""
    log "Re-validating detect-tech per repo..."
    for repo in "${repo_list[@]}"; do
        repo_dir="$WORKSPACE/repos/$repo"
        if [[ ! -d "$repo_dir" ]]; then
            log "  ! $repo: repo not found at $repo_dir — skipping"
            continue
        fi
        tech_json=$("$WORKSPACE/tools/review/detect-tech.sh" "$repo_dir" 2>/dev/null) || tech_json='{"technologies":[],"best_practices":[]}'
        tech_list=$(echo "$tech_json" | jq -r '.technologies | join(", ")')
        log "  ✓ $repo [$tech_list]"
        revalidated_arr+=("$(jq -n --arg repo "$repo" --argjson tech "$tech_json" '{repo: $repo, tech: $tech}')")
    done
    if [[ ${#revalidated_arr[@]} -gt 0 ]]; then
        revalidated=$(printf '%s\n' "${revalidated_arr[@]}" | jq -s '.')
    fi
fi

# Cache PR diff if any prior PR exists for the ticket.
log ""
log "Checking for prior PRs..."
prs_json=$("$WORKSPACE/tools/github/prs.sh" "$TICKET" json 2>/dev/null) || prs_json="[]"
if [[ "$prs_json" == "[]" ]] || [[ -z "$prs_json" ]]; then
    log "  No prior PRs found"
    prs_json="[]"
fi

diffs_meta="[]"
diffs_arr=()
pr_count=$(echo "$prs_json" | jq 'length')
if [[ "$pr_count" -gt 0 ]]; then
    mkdir -p "$PLAN_DIR/.diffs"
    for ((i=0; i<pr_count; i++)); do
        pr_number=$(echo "$prs_json" | jq -r ".[$i].number")
        pr_state=$(echo "$prs_json" | jq -r ".[$i].state")
        repo_name=$(echo "$prs_json" | jq -r ".[$i].repository.name")
        diff_path="$PLAN_DIR/.diffs/${repo_name}.diff"
        log "  Caching diff: $repo_name#$pr_number ($pr_state) → .diffs/${repo_name}.diff"
        gh pr diff "$pr_number" --repo "DEFRA/$repo_name" > "$diff_path" 2>/dev/null || true
        diffs_arr+=("$(jq -n \
            --arg repo "$repo_name" \
            --argjson pr "$pr_number" \
            --arg state "$pr_state" \
            --arg path ".diffs/${repo_name}.diff" \
            '{repo: $repo, pr: $pr, state: $state, diff: $path}')")
    done
    diffs_meta=$(printf '%s\n' "${diffs_arr[@]}" | jq -s '.')
fi

cat > "$PLAN_DIR/.implement-meta.json" << EOF
{
    "ticket": "$TICKET",
    "plan": "plan.md",
    "validated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "repos": $revalidated,
    "diffs": $diffs_meta
}
EOF

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$PLAN_DIR/.implement-meta.json"
else
    echo ""
    echo "=== Implement Pre-flight Ready ==="
    echo "Ticket: $TICKET"
    echo "Plan: $PLAN_FILE"
    echo "Directory: $PLAN_DIR"
    echo ""
    echo "Created:"
    echo "  ✓ .implement-meta.json"
    if [[ "$pr_count" -gt 0 ]]; then
        echo "  ✓ .diffs/{repo}.diff ($pr_count PR(s))"
    fi
    echo ""
    echo "Next: IMPLEMENTOR persona reads plan + .implement-meta.json + best-practices/{repo}.md"
fi
