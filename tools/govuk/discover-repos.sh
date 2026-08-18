#!/bin/bash
# Detect which repos in repos/ consume govuk-frontend and write a
# run-level metadata file at workareas/govuk-upgrades/{run-id}/.run-meta.json.
#
# Usage:
#   discover-repos.sh --run-id EUDPA-X [--branch chore/EUDPA-X] [--target VERSION] [--json]

set -e

RUN_ID=""
BRANCH=""
TARGET_VERSION=""
JSON_OUTPUT=false

show_help() {
    cat <<EOF
Detect in-scope repos for a govuk-frontend upgrade run.

Usage: $0 --run-id EUDPA-X [--branch chore/EUDPA-X] [--target VERSION] [--json]

A repo is in scope iff its package.json has govuk-frontend listed in
dependencies or devDependencies.

Writes:
  workareas/govuk-upgrades/{run-id}/.run-meta.json
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help) show_help ;;
        --run-id) RUN_ID="$2"; shift 2 ;;
        --branch) BRANCH="$2"; shift 2 ;;
        --target) TARGET_VERSION="$2"; shift 2 ;;
        --json) JSON_OUTPUT=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$RUN_ID" ]] && { echo "--run-id required" >&2; exit 1; }

REPOS_DIR="$HOME/git/defra/trade-imports-workspace/repos"
[[ -d "$REPOS_DIR" ]] || { echo "Repos dir not found: $REPOS_DIR" >&2; exit 1; }

# Find every package.json in repos/* (depth 2 — one per repo).
repos=()
while IFS= read -r pj; do
    repo=$(basename "$(dirname "$pj")")
    has_govuk=$(jq -r '
        ((.dependencies // {}) + (.devDependencies // {}))
        | has("govuk-frontend")
    ' "$pj")
    [[ "$has_govuk" == "true" ]] && repos+=("$repo")
done < <(find "$REPOS_DIR" -maxdepth 2 -mindepth 2 -name package.json | sort)

WORKSPACE_DIR="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades/$RUN_ID"
mkdir -p "$WORKSPACE_DIR"
META_FILE="$WORKSPACE_DIR/.run-meta.json"

now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
repos_json=$(printf '%s\n' "${repos[@]}" | jq -R . | jq -s .)

jq -n \
    --arg ticket "$RUN_ID" \
    --arg branch "$BRANCH" \
    --arg target "$TARGET_VERSION" \
    --arg now "$now" \
    --argjson repos "$repos_json" \
    '{
        ticket: $ticket,
        branch: (if $branch == "" then null else $branch end),
        target_version: (if $target == "" then null else $target end),
        repos: $repos,
        discovered_at: $now
    }' > "$META_FILE.tmp" && mv "$META_FILE.tmp" "$META_FILE"

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$META_FILE"
else
    echo "Discovered ${#repos[@]} repo(s) consuming govuk-frontend:"
    for r in "${repos[@]}"; do
        echo "  $r"
    done
    echo ""
    echo "Wrote: $META_FILE"
fi
