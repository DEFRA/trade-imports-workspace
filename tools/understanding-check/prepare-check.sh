#!/bin/bash
# Prepare an understanding-check workspace for a JIRA ticket.
# Usage: ./prepare-check.sh EUDPA-XXXXX [--json] [--max-diff-bytes N]
#
# - Fetches ticket via tools/jira/ticket.sh, writes ticket.md.
# - Finds PRs via tools/github/prs.sh, picks one per repo (open over merged;
#   most recent if multiple).
# - Caches each PR's diff at .diffs/<repo>.diff AFTER redaction (env vars,
#   API keys, PEM blocks, AWS keys, JWTs). Logs `redacted: N matches across
#   M files` to stderr — never the matched text.
# - Bakes per-repo best-practices bundle into best-practices/<repo>.md.
# - Seeds analysis.<repo>.json placeholders (verdict=null, sections empty).
# - Seeds .interview-meta.json with verdict=null and coverage_gaps=[].

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"

TICKET=""
JSON_OUTPUT=false
MAX_DIFF_BYTES=200000

while [[ $# -gt 0 ]]; do
    case $1 in
        --json) JSON_OUTPUT=true; shift ;;
        --max-diff-bytes) MAX_DIFF_BYTES="$2"; shift 2 ;;
        -*) echo "Unknown option: $1" >&2; exit 1 ;;
        *) TICKET="$1"; shift ;;
    esac
done

if [[ -z "$TICKET" ]]; then
    echo "Usage: $0 EUDPA-XXXXX [--json] [--max-diff-bytes N]" >&2
    exit 1
fi

CHECK_DIR="$WORKSPACE/workareas/understanding-checks/$TICKET"

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

command -v jq >/dev/null 2>&1 || error "jq is required"
command -v gh >/dev/null 2>&1 || error "GitHub CLI (gh) is required"

log "Creating understanding-check workspace..."
mkdir -p "$CHECK_DIR/.diffs"
mkdir -p "$CHECK_DIR/best-practices"

# --- Ticket fetch ---
log "Fetching ticket details..."
ticket_json=$("$WORKSPACE/tools/jira/ticket.sh" "$TICKET" json 2>/dev/null) || error "Failed to fetch ticket $TICKET"

ticket_key=$(echo "$ticket_json" | jq -r '.key')
ticket_summary=$(echo "$ticket_json" | jq -r '.fields.summary')
ticket_type=$(echo "$ticket_json" | jq -r '.fields.issuetype.name')
ticket_status=$(echo "$ticket_json" | jq -r '.fields.status.name')
ticket_description=$(echo "$ticket_json" | jq -r '.renderedFields.description // "No description"')

log "Writing ticket.md..."
cat > "$CHECK_DIR/ticket.md" << EOF
# $ticket_key: $ticket_summary

## Metadata
- **Type:** $ticket_type
- **Status:** $ticket_status

## Description

$ticket_description
EOF

# --- PR discovery ---
log "Finding PRs..."
prs_json=$("$WORKSPACE/tools/github/prs.sh" "$TICKET" json 2>/dev/null) || prs_json="[]"

if [[ "$prs_json" == "[]" ]] || [[ -z "$prs_json" ]]; then
    error "No PRs found for $TICKET — cannot run understanding-check"
fi

# Collapse multiple PRs per repo: prefer OPEN; tie-break by createdAt desc.
prs_json=$(echo "$prs_json" | jq '
    group_by(.repository.name)
    | map(
        (map(select(.state == "OPEN"))) as $open
        | (if ($open | length) > 0 then $open else . end)
        | sort_by(.createdAt) | reverse | .[0:1]
      )
    | flatten
')

# --- Diff cache + redaction ---
total_redactions=0
total_files_redacted=0
files_truncated=()
pr_count=$(echo "$prs_json" | jq 'length')
meta_prs=()

for ((i=0; i<pr_count; i++)); do
    pr_url=$(echo "$prs_json" | jq -r ".[$i].url")
    pr_number=$(echo "$prs_json" | jq -r ".[$i].number")
    pr_state=$(echo "$prs_json" | jq -r ".[$i].state")
    repo_name=$(echo "$prs_json" | jq -r ".[$i].repository.name")

    log "Processing $repo_name#$pr_number ($pr_state)..."

    # Capture the head SHA at prepare time so analysis is reproducible.
    head_sha=$(gh pr view "$pr_number" --repo "DEFRA/$repo_name" --json headRefOid --jq '.headRefOid' 2>/dev/null || echo "")

    raw_diff_tmp=$(mktemp)
    gh pr diff "$pr_number" --repo "DEFRA/$repo_name" > "$raw_diff_tmp" 2>/dev/null || {
        log "  Failed to fetch diff for $repo_name#$pr_number"
        rm -f "$raw_diff_tmp"
        continue
    }

    # Truncate to --max-diff-bytes if oversized (largest files first).
    truncated=false
    diff_size=$(wc -c < "$raw_diff_tmp" | tr -d ' ')
    if [[ "$diff_size" -gt "$MAX_DIFF_BYTES" ]]; then
        truncated=true
        files_truncated+=("$repo_name")
        head -c "$MAX_DIFF_BYTES" "$raw_diff_tmp" > "$raw_diff_tmp.head"
        mv "$raw_diff_tmp.head" "$raw_diff_tmp"
        log "  Truncated diff to $MAX_DIFF_BYTES bytes (coverage gap)"
    fi

    # Redact secrets BEFORE the diff lands on disk. Patterns:
    #   - KEY=VALUE-like assignments (token|secret|password|api_key|bearer|authorization)
    #   - sk-... / ghp_... / AKIA... / PEM blocks / JWT-shaped tokens
    redacted_tmp=$(mktemp)
    file_redactions=$(node "$SCRIPT_DIR/redact-diff.js" "$raw_diff_tmp" "$redacted_tmp" 2>/dev/null || echo "0")
    rm -f "$raw_diff_tmp"
    mv "$redacted_tmp" "$CHECK_DIR/.diffs/$repo_name.diff"

    if [[ "$file_redactions" -gt 0 ]]; then
        total_redactions=$((total_redactions + file_redactions))
        total_files_redacted=$((total_files_redacted + 1))
        log "  Redacted $file_redactions match(es) in $repo_name.diff"
    fi

    # Best-practices bundle: detect-tech is in tools/review (shared).
    if [[ -x "$WORKSPACE/tools/review/detect-tech.sh" ]] && [[ -d "$WORKSPACE/repos/$repo_name" ]]; then
        tech_json=$("$WORKSPACE/tools/review/detect-tech.sh" "$WORKSPACE/repos/$repo_name" 2>/dev/null || echo '{"best_practices":[]}')
    else
        tech_json='{"best_practices":[]}'
    fi

    {
        echo "# Best practices applicable to $repo_name"
        echo
        echo "Concatenated at prepare-check time. Read these before analysing the diff."
        echo
        echo "$tech_json" | jq -r '.best_practices[]?' | while IFS= read -r path; do
            [[ -z "$path" ]] && continue
            src="$WORKSPACE/$path"
            if [[ -f "$src" ]]; then
                echo
                echo "---"
                echo
                echo "## Source: \`$path\`"
                echo
                cat "$src"
            fi
        done
    } > "$CHECK_DIR/best-practices/$repo_name.md"

    # Seed analysis.<repo>.json placeholder.
    analysis_path="$CHECK_DIR/analysis.$repo_name.json"
    if [[ ! -f "$analysis_path" ]]; then
        jq -n \
            --arg repo "$repo_name" \
            --arg ticket "$ticket_key" \
            --argjson pr "$pr_number" \
            --arg commit "$head_sha" \
            '{
                repo: $repo,
                ticket: $ticket,
                pr: $pr,
                commit: $commit,
                verdict: null,
                completed_at: null,
                changeSummary: null,
                whyItChanged: null,
                keyDesignDecisions: [],
                edgeCases: [],
                failureModes: [],
                securityRisks: [],
                dataOrApiChanges: [],
                testCoverageNotes: [],
                aiSuspectedRegions: []
            }' > "$analysis_path"
    fi

    meta_prs+=("$(jq -n \
        --arg repo "$repo_name" \
        --argjson pr "$pr_number" \
        --arg state "$pr_state" \
        --arg commit "$head_sha" \
        --arg url "$pr_url" \
        --argjson truncated "$([[ "$truncated" == "true" ]] && echo true || echo false)" \
        '{repo: $repo, pr: $pr, state: $state, commit: $commit, url: $url, truncated: $truncated}'
    )")
done

if [[ "$total_redactions" -gt 0 ]]; then
    echo "redacted: $total_redactions matches across $total_files_redacted files" >&2
fi

# --- Meta file ---
created_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
meta_prs_json=$(printf '%s\n' "${meta_prs[@]}" | jq -s '.')

# Initial coverage_gaps[]: one entry per truncated diff.
coverage_gaps=$(jq -n --argjson files "$(printf '%s\n' "${files_truncated[@]:-}" | jq -R . | jq -s '. - [""]')" '
    [$files[] | {kind: "oversized_diff", repo: ., note: "diff truncated at --max-diff-bytes"}]
')

jq -n \
    --arg ticket "$ticket_key" \
    --arg summary "$ticket_summary" \
    --arg type "$ticket_type" \
    --arg status "$ticket_status" \
    --arg created "$created_at" \
    --argjson prs "$meta_prs_json" \
    --argjson redactions "$total_redactions" \
    --argjson redacted_files "$total_files_redacted" \
    --argjson coverage_gaps "$coverage_gaps" \
    '{
        ticket: $ticket,
        summary: $summary,
        type: $type,
        status: $status,
        created_at: $created,
        prs: $prs,
        verdict: null,
        verdict_reason: null,
        completed_at: null,
        redaction_summary: { matches: $redactions, files: $redacted_files },
        coverage_gaps: $coverage_gaps
    }' > "$CHECK_DIR/.interview-meta.json.tmp"
mv "$CHECK_DIR/.interview-meta.json.tmp" "$CHECK_DIR/.interview-meta.json"

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$CHECK_DIR/.interview-meta.json"
else
    echo
    echo "=== Understanding-check workspace ready ==="
    echo "Ticket: $ticket_key"
    echo "Summary: $ticket_summary"
    echo "Directory: $CHECK_DIR"
    echo
    echo "Created:"
    echo "  ✓ ticket.md"
    echo "  ✓ .interview-meta.json (verdict: null)"
    for ((i=0; i<pr_count; i++)); do
        repo_name=$(echo "$prs_json" | jq -r ".[$i].repository.name")
        echo "  ✓ .diffs/$repo_name.diff (redacted)"
        echo "  ✓ best-practices/$repo_name.md"
        echo "  ✓ analysis.$repo_name.json (placeholder)"
    done
    echo
    echo "Next: spawn one ANALYST per repo (see SKILL.md Step 2)."
fi
