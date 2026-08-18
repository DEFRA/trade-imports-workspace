#!/bin/bash
# List packages across packages.{repo}.json files for a run, with filters.
#
# Usage:
#   packages-list.sh --run-id TICKET \
#                    [--repo REPO] \
#                    [--package PKG] \
#                    [--classification pending|auto|manual] \
#                    [--risk LOW|MEDIUM|HIGH] \
#                    [--status pending|todo|inprogress|done|failed] \
#                    [--filter pending|auto|manual]    # alias for --classification \
#                    [--json]
#
# TSV columns:
#   repo \t package \t current \t target \t upgrade_type \t dep_type \t
#   classification \t risk \t implementation_status \t commit_sha \t
#   failure_reason

set -e

RUN_ID=""
REPO_FILTER=""
PKG_FILTER=""
CLASSIFICATION_FILTER=""
RISK_FILTER=""
STATUS_FILTER=""
JSON=0

usage() {
    cat <<EOF >&2
Usage: $0 --run-id TICKET [--repo REPO] [--package PKG] \\
    [--classification pending|auto|manual] [--risk LOW|MEDIUM|HIGH] \\
    [--status pending|todo|inprogress|done|failed] [--json]
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO_FILTER="$2"; shift 2 ;;
        --package) PKG_FILTER="$2"; shift 2 ;;
        --classification) CLASSIFICATION_FILTER="$2"; shift 2 ;;
        --filter) CLASSIFICATION_FILTER="$2"; shift 2 ;;
        --risk) RISK_FILTER="$2"; shift 2 ;;
        --status) STATUS_FILTER="$2"; shift 2 ;;
        --json) JSON=1; shift ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$RUN_ID" ]] && usage

BASE="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$RUN_ID"
[[ -d "$BASE" ]] || { [[ "$JSON" == "1" ]] && echo "[]" && exit 0; echo "Run dir not found: $BASE" >&2; exit 1; }

# Collect packages.*.json files.
files=()
if [[ -n "$REPO_FILTER" ]]; then
    f="$BASE/$REPO_FILTER/packages.${REPO_FILTER}.json"
    [[ -f "$f" ]] && files+=("$f")
else
    while IFS= read -r f; do files+=("$f"); done < <(find "$BASE" -mindepth 2 -maxdepth 2 -name 'packages.*.json' | sort)
fi

if [[ ${#files[@]} -eq 0 ]]; then
    [[ "$JSON" == "1" ]] && echo "[]" && exit 0
    exit 0
fi

# Build classification matcher: "pending" → null; otherwise literal.
cls_arg="$CLASSIFICATION_FILTER"
case "$cls_arg" in
    ""|pending|auto|manual) ;;
    *) echo "Invalid --classification: $cls_arg" >&2; exit 1 ;;
esac

stat_arg="$STATUS_FILTER"
case "$stat_arg" in
    ""|pending|todo|inprogress|done|failed) ;;
    *) echo "Invalid --status: $stat_arg" >&2; exit 1 ;;
esac

risk_arg="$RISK_FILTER"
case "$risk_arg" in
    ""|LOW|MEDIUM|HIGH) ;;
    *) echo "Invalid --risk: $risk_arg" >&2; exit 1 ;;
esac

filtered=$(jq -s \
    --arg cls "$cls_arg" \
    --arg stat "$stat_arg" \
    --arg risk "$risk_arg" \
    --arg pkg "$PKG_FILTER" \
    '
    [ .[] as $f | $f.packages[] | . + {repo: $f.repo} ]
    | map(select(
        ($cls == "" or
            ($cls == "pending" and .classification == null) or
            (.classification == $cls)) and
        ($stat == "" or
            ($stat == "pending" and (.implementation_status == null or .implementation_status == "todo")) or
            (.implementation_status == $stat)) and
        ($risk == "" or .risk == $risk) and
        ($pkg == "" or .package == $pkg)
      ))
    ' "${files[@]}")

if [[ "$JSON" == "1" ]]; then
    echo "$filtered"
else
    echo "$filtered" | jq -r '.[] |
        [
            .repo,
            .package,
            .current,
            .target,
            .upgrade_type,
            .dependency_type,
            (.classification // "pending"),
            (.risk // ""),
            (.implementation_status // "pending"),
            (.commit_sha // ""),
            (.failure_reason // "")
        ] | @tsv'
fi
