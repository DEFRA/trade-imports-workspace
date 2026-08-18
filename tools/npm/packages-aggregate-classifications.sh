#!/bin/bash
# Aggregate per-package classification fragments into the canonical
# packages.{repo}.json for one or all repos under a run.
#
# Fan-out PACKAGE_PLANNER workers each write a fragment at
#   workareas/npm-upgrades/{run-id}/{repo}/classifications/{pkg-norm}.json
# This script merges those fragments into the canonical packages.{repo}.json.
# Run from the parent (Phase 1 verify gate) after all planners return —
# never in parallel with the planners themselves.
#
# Usage:
#   packages-aggregate-classifications.sh --run-id TICKET [--repo REPO]
#
# Idempotent. Fragments overwrite matching fields in the canonical row;
# rows without a fragment are left untouched.

set -e

RUN_ID=""
REPO_FILTER=""

usage() {
    echo "Usage: $0 --run-id TICKET [--repo REPO]" >&2
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO_FILTER="$2"; shift 2 ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$RUN_ID" ]] && usage

BASE="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$RUN_ID"
[[ -d "$BASE" ]] || { echo "Run dir not found: $BASE" >&2; exit 1; }

repos=()
if [[ -n "$REPO_FILTER" ]]; then
    repos+=("$REPO_FILTER")
else
    while IFS= read -r d; do
        repos+=("$(basename "$d")")
    done < <(find "$BASE" -mindepth 1 -maxdepth 1 -type d | sort)
fi

merged_total=0
for repo in "${repos[@]}"; do
    target="$BASE/$repo/packages.${repo}.json"
    [[ -f "$target" ]] || continue
    fragments_dir="$BASE/$repo/classifications"
    [[ -d "$fragments_dir" ]] || continue

    fragment_files=()
    while IFS= read -r f; do fragment_files+=("$f"); done < <(find "$fragments_dir" -mindepth 1 -maxdepth 1 -name '*.json' | sort)
    [[ ${#fragment_files[@]} -eq 0 ]] && continue

    fragments_json=$(jq -s '.' "${fragment_files[@]}")

    tmp="$target.aggregate.tmp"
    jq --argjson frags "$fragments_json" '
        .packages |= map(
            . as $row
            | ($frags | map(select(.package == $row.package)) | .[0]) as $f
            | if $f == null then $row
              else
                $row
                | .classification = ($f.classification // .classification)
                | .risk = ($f.risk // .risk)
                | .safe_for_automation = (if $f | has("safe_for_automation") then $f.safe_for_automation else .safe_for_automation end)
                | .rationale = ($f.rationale // .rationale)
                | (if $f | has("files_affected") then .files_affected = $f.files_affected else . end)
                | (if $f | has("changes_required_summary") then .changes_required_summary = $f.changes_required_summary else . end)
                | (if $f | has("changelog_url") then .changelog_url = $f.changelog_url else . end)
                | (if $f | has("migration_guide_url") then .migration_guide_url = $f.migration_guide_url else . end)
                | (if $f | has("demoted_from_auto") then .demoted_from_auto = $f.demoted_from_auto else . end)
              end
        )' "$target" > "$tmp"
    mv "$tmp" "$target"

    merged=${#fragment_files[@]}
    merged_total=$((merged_total + merged))
    echo "Aggregated $merged classification(s) into $target"
done

echo "Total fragments merged: $merged_total"
