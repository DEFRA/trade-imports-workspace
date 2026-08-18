#!/bin/bash
# Aggregate per-file .review.json files for a repo.
#
# Usage:
#   aggregate-file-reviews.sh EUDPA-XXXXX --repo REPO [--section file-summary|items|both] [--json] [--write-items]
#
# Default (no --write-items): emits pasteable markdown to stdout.
# With --write-items: also writes items.{repo}.json (the canonical
#                     consolidated items file consumed by walker etc).
#                     IDs in items.{repo}.json are globally renumbered
#                     across the repo's files; previously-set disposition
#                     / status / notes are NOT preserved — only call
#                     --write-items during initial FRESH population.
#
# Sections:
#   --section file-summary  → File Analysis Summary table (verdicts + counts per file)
#   --section items         → ## Items table (rendered via render-items.sh)
#   --section both          → both, separated by a blank line (default)
#
# --json overrides --section and emits the raw combined JSON instead.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TICKET=""
REPO=""
SECTION="both"
JSON=0
WRITE_ITEMS=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --repo) REPO="$2"; shift 2 ;;
        --section) SECTION="$2"; shift 2 ;;
        --json) JSON=1; shift ;;
        --write-items) WRITE_ITEMS=1; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$TICKET" ]] && { echo "Missing ticket" >&2; exit 1; }
[[ -z "$REPO" ]] && { echo "Missing --repo" >&2; exit 1; }

review_dir="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"
dir="$review_dir/file-reviews/$REPO"
[[ -d "$dir" ]] || { echo "No review dir: $dir" >&2; exit 1; }

files=()
while IFS= read -r f; do files+=("$f"); done < <(find "$dir" -maxdepth 1 -name '*.review.json' | sort)

[[ ${#files[@]} -eq 0 ]] && { echo "No .review.json files in $dir" >&2; exit 1; }

# Per-file rollup: file → verdict + severity counts + todos
combined=$(jq -s '
    [.[] | {
        file: .file,
        verdict: .verdict,
        critical: ([.todos[] | select(.severity == "Critical")] | length),
        major: ([.todos[] | select(.severity == "Major")] | length),
        minor: ([.todos[] | select(.severity == "Minor")] | length),
        todos: .todos
    }] | sort_by(.file)
' "${files[@]}")

if [[ "$WRITE_ITEMS" == "1" ]]; then
    items_file="$review_dir/items.${REPO}.json"
    echo "$combined" | jq \
        --arg ticket "$TICKET" \
        --arg repo "$REPO" \
        '{
            ticket: $ticket,
            repo: $repo,
            items: (
                [ .[] as $f | $f.todos[] | . + {file: $f.file} ]
                | to_entries
                | map(.value + {
                    id: (.key + 1),
                    disposition: null,
                    status: null,
                    notes: null
                  })
            )
        }' > "$items_file.tmp" && mv "$items_file.tmp" "$items_file"

    # Stamp reconciled_at on every reviewed .review.json — refresh
    # reconcile uses (reviewed_at > reconciled_at) to detect work
    # done since this FRESH-time accounting.
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    for f in "${files[@]}"; do
        reviewed_at=$(jq -r '.reviewed_at // ""' "$f")
        [[ -z "$reviewed_at" ]] && continue
        jq --arg t "$now" '. + {reconciled_at: $t}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
    done
fi

if [[ "$JSON" == "1" ]]; then
    echo "$combined"
    exit 0
fi

emit_file_summary() {
    echo "## File Analysis Summary"
    echo
    echo "| File | Verdict | Critical | Major | Minor |"
    echo "|------|---------|----------|-------|-------|"
    echo "$combined" | jq -r '
        def render_verdict:
            if . == "SAFE" then "SAFE"
            elif . == "NEEDS_ATTENTION" then "NEEDS ATTENTION"
            elif . == "RISKY" then "RISKY"
            else "—" end;
        .[] | "| `\(.file)` | \(.verdict | render_verdict) | \(.critical) | \(.major) | \(.minor) |"
    '
}

emit_items() {
    echo "## Items"
    echo
    if [[ "$WRITE_ITEMS" == "1" ]] || [[ -f "$review_dir/items.${REPO}.json" ]]; then
        # Prefer the canonical items.{repo}.json if it exists.
        "$SCRIPT_DIR/render-items.sh" "$TICKET" --repo "$REPO"
    else
        # Fallback: render directly from per-file todos (one-shot, no
        # disposition/status — the caller hasn't written items.json yet).
        echo "| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |"
        echo "|---|------|------|----------|----------|-------|-----|-------------|--------|-------|"
        echo "$combined" | jq -r '
            def esc: . | tostring | gsub("\\|"; "\\|");
            [ .[] as $f | $f.todos[] | . + {file: $f.file} ]
            | to_entries
            | .[]
            | "| \(.key + 1) | \(.value.file | esc) | \(.value.line) | \(.value.severity) | \(.value.category | esc) | \(.value.issue | esc) | \(.value.fix | esc) |  |  |  |"
        '
    fi
}

case "$SECTION" in
    file-summary) emit_file_summary ;;
    items) emit_items ;;
    both) emit_file_summary; echo; emit_items ;;
    *) echo "Unknown --section: $SECTION" >&2; exit 1 ;;
esac
