#!/bin/bash
# Atomically write one interview answer into decisions.json.
#
# Usage:
#   interview-add-answer.sh --run-id <name> --field <dotted-path> --value '<json>'
#
# Examples:
#   --field purpose --value '"Scaffold workspace skills end-to-end."'
#   --field state_shape --value '"json"'
#   --field dispatcher --value 'true'
#   --field fanout.enabled --value 'true'
#   --field fanout.workers --value '["AUDITOR"]'
#   --field triggers.phrases --value '["scaffold skill","skill-create"]'
#
# Value is parsed as JSON — quote strings, leave booleans/arrays bare.
# Mutation is atomic (jq -> tmp -> mv).

set -e

RUN_ID=""
FIELD=""
VALUE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --field) FIELD="$2"; shift 2 ;;
        --value) VALUE="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,18p' "$0" >&2
            exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in RUN_ID FIELD VALUE; do
    [[ -z "${!v}" ]] && { echo "Missing $v" >&2; exit 1; }
done

case "$RUN_ID" in
    *[!a-z0-9-]*|-*|"")
        echo "Invalid run-id (must match ^[a-z0-9-]+$): $RUN_ID" >&2
        exit 1 ;;
esac

target="$HOME/git/defra/trade-imports-workspace/workareas/skill-creator/$RUN_ID/decisions.json"
[[ -f "$target" ]] || { echo "No decisions.json at $target — run start-skill-creator.sh first" >&2; exit 1; }

# Build the jq path expression from a dotted field (e.g. fanout.enabled
# -> .answers.fanout.enabled). Each segment becomes a quoted key.
IFS='.' read -r -a parts <<<"$FIELD"
path=".answers"
for p in "${parts[@]}"; do
    path="$path[\"$p\"]"
done

if ! jq -e --argjson v "$VALUE" "$path = \$v" "$target" > "$target.tmp"; then
    rm -f "$target.tmp"
    echo "jq failed — invalid JSON value? VALUE=$VALUE" >&2
    exit 1
fi
mv "$target.tmp" "$target"
