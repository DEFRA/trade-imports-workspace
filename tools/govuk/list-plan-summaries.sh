#!/bin/bash
# Emit a walker-friendly summary row per pending version across all
# in-scope repos: repo, version, classification, change count, summary.
#
# Usage:
#   list-plan-summaries.sh --run-id EUDPA-X [--repo R] [--json]
#
# "Pending" means: classification != "noop" AND implementation_status == null.
# A version is "todo" → ready to apply (or discuss).
# A version is null → INCOMPLETE (Phase 2 didn't classify it). Surfaced
# with classification "unplanned" so the walker can default it to D.

set -e

RUN_ID=""
REPO_FILTER=""
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO_FILTER="$2"; shift 2 ;;
        --json) JSON_OUTPUT=true; shift ;;
        -h|--help)
            cat <<EOF
Usage: $0 --run-id EUDPA-X [--repo R] [--json]
EOF
            exit 0
            ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$RUN_ID" ]] && { echo "--run-id required" >&2; exit 1; }

WORKSPACE_BASE="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades/$RUN_ID"
[[ -d "$WORKSPACE_BASE" ]] || { echo "Workspace not found: $WORKSPACE_BASE" >&2; exit 1; }

state_files=()
if [[ -n "$REPO_FILTER" ]]; then
    f="$WORKSPACE_BASE/$REPO_FILTER/versions.${REPO_FILTER}.json"
    [[ -f "$f" ]] && state_files+=("$f")
else
    while IFS= read -r f; do state_files+=("$f"); done < <(find "$WORKSPACE_BASE" -maxdepth 3 -name 'versions.*.json' | sort)
fi

[[ ${#state_files[@]} -eq 0 ]] && exit 0

filtered=$(jq -s '
    [.[] as $f
        | $f.versions[]
        | select(.implementation_status == null and (.classification // "unplanned") != "noop")
        | {
            repo: $f.repo,
            version: .version,
            classification: (.classification // "unplanned"),
            change_count: (.changes | length),
            summary: (.summary // "")
        }
    ]
    | sort_by(
        .repo,
        (.version | split(".") | map(tonumber? // 0) + [0,0,0] | .[0:3])
    )
' "${state_files[@]}")

if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$filtered"
else
    echo "$filtered" | jq -r '.[] |
        [.repo, .version, .classification, (.change_count | tostring), .summary] | @tsv'
fi
