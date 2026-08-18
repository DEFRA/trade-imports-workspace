#!/bin/bash
# Summary counts for packages.{repo}.json files in a run.
#
# Usage:
#   packages-counts.sh --run-id TICKET [--repo REPO] [--json]
#
# Counts by classification × implementation_status, plus a per-risk
# breakdown for the manual side. Suitable for the dispatcher gates
# and operator status reports.

set -e

RUN_ID=""
REPO_FILTER=""
JSON=0

usage() {
    echo "Usage: $0 --run-id TICKET [--repo REPO] [--json]" >&2
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO_FILTER="$2"; shift 2 ;;
        --json) JSON=1; shift ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$RUN_ID" ]] && usage

BASE="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$RUN_ID"
[[ -d "$BASE" ]] || { [[ "$JSON" == "1" ]] && echo '{"total":0,"by_classification":[],"by_status":[],"by_risk":[]}' && exit 0; echo "Run dir not found: $BASE" >&2; exit 1; }

files=()
if [[ -n "$REPO_FILTER" ]]; then
    f="$BASE/$REPO_FILTER/packages.${REPO_FILTER}.json"
    [[ -f "$f" ]] && files+=("$f")
else
    while IFS= read -r f; do files+=("$f"); done < <(find "$BASE" -mindepth 2 -maxdepth 2 -name 'packages.*.json' | sort)
fi

if [[ ${#files[@]} -eq 0 ]]; then
    if [[ "$JSON" == "1" ]]; then
        echo '{"total":0,"by_classification":[],"by_status":[],"by_risk":[]}'
    else
        echo "No packages.*.json files found for $RUN_ID${REPO_FILTER:+ (repo: $REPO_FILTER)}"
    fi
    exit 0
fi

summary=$(jq -s '
    [.[] as $f | $f.packages[] | . + {repo: $f.repo}] as $all
    | {
        total: ($all | length),
        by_classification:
            ($all | group_by(.classification // "pending")
                  | map({key: .[0].classification // "pending", count: length})
                  | sort_by(.key)),
        by_status:
            ($all | group_by(.implementation_status // "pending")
                  | map({key: .[0].implementation_status // "pending", count: length})
                  | sort_by(.key)),
        by_risk:
            ($all | map(select(.classification == "manual"))
                  | group_by(.risk // "UNKNOWN")
                  | map({key: .[0].risk // "UNKNOWN", count: length})
                  | sort_by(.key)),
        by_repo:
            ($all | group_by(.repo)
                  | map({
                      repo: .[0].repo,
                      total: length,
                      pending: ([.[] | select(.classification == null)] | length),
                      auto: ([.[] | select(.classification == "auto")] | length),
                      manual: ([.[] | select(.classification == "manual")] | length),
                      done: ([.[] | select(.implementation_status == "done")] | length),
                      failed: ([.[] | select(.implementation_status == "failed")] | length)
                    })
                  | sort_by(.repo))
    }
' "${files[@]}")

if [[ "$JSON" == "1" ]]; then
    echo "$summary"
else
    echo "NPM upgrade counts for $RUN_ID${REPO_FILTER:+ (repo: $REPO_FILTER)}:"
    echo
    echo "  Total packages: $(echo "$summary" | jq '.total')"
    echo
    echo "  Classification:"
    echo "$summary" | jq -r '.by_classification[] | "    \(.count)  \(.key)"'
    echo
    echo "  Implementation status:"
    echo "$summary" | jq -r '.by_status[] | "    \(.count)  \(.key)"'
    echo
    echo "  Manual upgrades by risk:"
    by_risk_count=$(echo "$summary" | jq '.by_risk | length')
    if [[ "$by_risk_count" -eq 0 ]]; then
        echo "    (none)"
    else
        echo "$summary" | jq -r '.by_risk[] | "    \(.count)  \(.key)"'
    fi
    echo
    echo "  By repo:"
    echo "$summary" | jq -r '.by_repo[] | "    \(.repo): total=\(.total)  pending=\(.pending)  auto=\(.auto)  manual=\(.manual)  done=\(.done)  failed=\(.failed)"'
fi
