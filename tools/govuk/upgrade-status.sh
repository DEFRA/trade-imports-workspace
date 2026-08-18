#!/bin/bash
# Combined govuk-frontend upgrade status (planning + implementation) from versions.{repo}.json.
# Usage: ./upgrade-status.sh --run-id TICKET [--repo R] [--filter F] [--sort-semver] [--json]
#
# Same filter vocabulary as list-plans.sh.

set -e

RUN_ID=""
REPO_FILTER=""
FILTER=""
SORT_SEMVER=false
JSON_OUTPUT=false

show_help() {
    cat << EOF
Combined govuk-frontend upgrade status (planning + implementation)

Usage: ./upgrade-status.sh --run-id TICKET [options]

Options:
  --run-id TICKET        Run ID / Jira ticket (e.g. EUDPA-20578) [required]
  --repo REPO_NAME       Only show specific repo
  --filter F             unplanned|todo|noop|done|failed|pending
  --sort-semver          Sort version listings ascending by semver
  --json                 Output JSON format
  --help                 Show this help message
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

# Delegate to list-plans.sh — `upgrade-status` is a synonym preserved for
# Phase 3's combined-view ergonomics. They share one implementation.
args=(--run-id "$RUN_ID")
[[ -n "$REPO_FILTER" ]] && args+=(--repo "$REPO_FILTER")
[[ -n "$FILTER" ]] && args+=(--filter "$FILTER")
[[ "$SORT_SEMVER" == "true" ]] && args+=(--sort-semver)
[[ "$JSON_OUTPUT" == "true" ]] && args+=(--json)

exec "$HOME/git/defra/trade-imports-workspace/tools/govuk/list-plans.sh" "${args[@]}"
