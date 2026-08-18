#!/bin/bash
# List govuk-frontend version planning status from versions.{repo}.json.
# Usage: ./list-plans.sh --run-id TICKET [--repo REPO_NAME] [--filter F] [--sort-semver] [--json]

set -e

RUN_ID=""
REPO_FILTER=""
FILTER=""
SORT_SEMVER=false
JSON_OUTPUT=false

show_help() {
    cat << EOF
List govuk-frontend version planning status

Usage: ./list-plans.sh --run-id TICKET [options]

Options:
  --run-id TICKET        Run ID / Jira ticket (e.g. EUDPA-20578) [required]
  --repo REPO_NAME       Only show specific repo
  --filter F             unplanned|todo|noop|done|failed|pending
  --sort-semver          Sort version listings ascending by semver
  --json                 Output JSON format
  --help                 Show this help message

Filter semantics:
  unplanned  classification == null
  todo       classification == "todo" && implementation_status == null
  noop       classification == "noop"
  done       implementation_status == "done"
  failed     implementation_status == "failed"
  pending    implementation_status == null
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help) show_help ;;
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO_FILTER="$2"; shift 2 ;;
        --filter) FILTER="$2"; shift 2 ;;
        --sort-semver) SORT_SEMVER=true; shift ;;
        --json) JSON_OUTPUT=true; shift ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

error() {
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        echo "{\"error\": \"$1\"}"
    else
        echo "Error: $1" >&2
    fi
    exit 1
}

[[ -z "$RUN_ID" ]] && error "--run-id TICKET is required"

case "$FILTER" in
    ""|unplanned|todo|noop|done|failed|pending) ;;
    *) error "Invalid --filter: $FILTER" ;;
esac

WORKSPACE_BASE="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades/$RUN_ID"

if [[ ! -d "$WORKSPACE_BASE" ]]; then
    error "Workspace not found: $WORKSPACE_BASE. Run discover-versions.sh first."
fi

# Compose jq filter expression for one version entry given $FILTER.
jq_pred=""
case "$FILTER" in
    unplanned) jq_pred='select(.classification == null)' ;;
    todo)      jq_pred='select(.classification == "todo" and .implementation_status == null)' ;;
    noop)      jq_pred='select(.classification == "noop")' ;;
    done)      jq_pred='select(.implementation_status == "done")' ;;
    failed)    jq_pred='select(.implementation_status == "failed")' ;;
    pending)   jq_pred='select(.implementation_status == null)' ;;
    "")        jq_pred='.' ;;
esac

state_files=()
if [[ -n "$REPO_FILTER" ]]; then
    f="$WORKSPACE_BASE/$REPO_FILTER/versions.${REPO_FILTER}.json"
    [[ -f "$f" ]] && state_files+=("$f")
else
    while IFS= read -r f; do state_files+=("$f"); done < <(find "$WORKSPACE_BASE" -maxdepth 3 -name 'versions.*.json' | sort)
fi

[[ ${#state_files[@]} -eq 0 ]] && error "No versions.{repo}.json found under $WORKSPACE_BASE"

total_unplanned=0
total_todo=0
total_noop=0
total_done=0
total_failed=0

if [[ "$JSON_OUTPUT" == "true" ]]; then
    repo_objs=()
fi

for state_file in "${state_files[@]}"; do
    repo=$(jq -r '.repo' "$state_file")
    current=$(jq -r '.current_version' "$state_file")
    target=$(jq -r '.target_version' "$state_file")

    matched=$(jq -c "[.versions[] | $jq_pred]" "$state_file")
    # Sort by semver when requested (use Python-style version key in jq sort_by ints).
    if [[ "$SORT_SEMVER" == "true" ]]; then
        matched=$(echo "$matched" | jq '
            sort_by(
                .version | split(".") | map(tonumber? // 0) + [0,0,0] | .[0:3]
            )
        ')
    fi

    unplanned=$(jq '[.versions[] | select(.classification == null)] | length' "$state_file")
    todo=$(jq '[.versions[] | select(.classification == "todo" and .implementation_status == null)] | length' "$state_file")
    noop=$(jq '[.versions[] | select(.classification == "noop")] | length' "$state_file")
    done_count=$(jq '[.versions[] | select(.implementation_status == "done")] | length' "$state_file")
    failed=$(jq '[.versions[] | select(.implementation_status == "failed")] | length' "$state_file")

    ((total_unplanned+=unplanned))
    ((total_todo+=todo))
    ((total_noop+=noop))
    ((total_done+=done_count))
    ((total_failed+=failed))

    if [[ "$JSON_OUTPUT" == "true" ]]; then
        repo_obj=$(jq -n \
            --arg repo "$repo" \
            --arg current "$current" \
            --arg target "$target" \
            --argjson unplanned "$unplanned" \
            --argjson todo "$todo" \
            --argjson noop "$noop" \
            --argjson done "$done_count" \
            --argjson failed "$failed" \
            --argjson matched "$matched" \
            '{repo: $repo, current: $current, target: $target,
              counts: {unplanned: $unplanned, todo: $todo, noop: $noop, done: $done, failed: $failed},
              versions: $matched}')
        repo_objs+=("$repo_obj")
    else
        echo ""
        printf "%s  (%s → %s)\n" "$repo" "$current" "$target"
        printf "  Unplanned: %3d  Todo: %3d  Noop: %3d  Done: %3d  Failed: %3d\n" \
            "$unplanned" "$todo" "$noop" "$done_count" "$failed"
        version_list=$(echo "$matched" | jq -r '.[] | .version')
        if [[ -n "$version_list" ]]; then
            if [[ -n "$FILTER" ]]; then
                echo "  Versions ($FILTER):"
            else
                echo "  Versions:"
            fi
            echo "$version_list" | sed 's/^/    /'
        fi
    fi
done

if [[ "$JSON_OUTPUT" == "true" ]]; then
    printf '%s\n' "${repo_objs[@]}" | jq -s \
        --arg run_id "$RUN_ID" \
        --argjson unplanned "$total_unplanned" \
        --argjson todo "$total_todo" \
        --argjson noop "$total_noop" \
        --argjson done "$total_done" \
        --argjson failed "$total_failed" \
        '{run_id: $run_id, repos: .,
          summary: {unplanned: $unplanned, todo: $todo, noop: $noop, done: $done, failed: $failed}}'
else
    echo ""
    echo "=== Summary ==="
    echo "  Unplanned:         $total_unplanned"
    echo "  Todo (changes):    $total_todo"
    echo "  Noop (no changes): $total_noop"
    echo "  Done:              $total_done"
    echo "  Failed:            $total_failed"
fi
