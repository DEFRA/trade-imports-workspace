#!/bin/bash
# Append a {file, why, change} entry to a version's changes[].
# Atomic (> tmp && mv).
#
# Usage:
#   version-add-change.sh --run-id EUDPA-X --repo R --version V \
#       --file PATH --why "..." --change "..."

set -e

RUN_ID=""
REPO=""
VERSION=""
FILE=""
WHY=""
CHANGE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --version) VERSION="$2"; shift 2 ;;
        --file) FILE="$2"; shift 2 ;;
        --why) WHY="$2"; shift 2 ;;
        --change) CHANGE="$2"; shift 2 ;;
        -h|--help)
            cat <<EOF
Usage: $0 --run-id EUDPA-X --repo R --version V --file PATH --why "..." --change "..."
EOF
            exit 0
            ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in RUN_ID REPO VERSION FILE WHY CHANGE; do
    [[ -z "${!v}" ]] && { echo "Missing --${v,,}" >&2; exit 1; }
done

target="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades/$RUN_ID/$REPO/versions.${REPO}.json"
[[ -f "$target" ]] || { echo "Versions file not found: $target" >&2; exit 1; }

exists=$(jq --arg v "$VERSION" '[.versions[] | select(.version == $v)] | length' "$target")
[[ "$exists" -eq 0 ]] && { echo "Version $VERSION not found in $target" >&2; exit 1; }

jq \
    --arg version "$VERSION" \
    --arg file "$FILE" \
    --arg why "$WHY" \
    --arg change "$CHANGE" \
    '.versions |= map(
        if .version == $version then
            .changes += [{file: $file, why: $why, change: $change}]
        else . end
    )' \
    "$target" > "$target.tmp" && mv "$target.tmp" "$target"

echo "Added change for $REPO@$VERSION: $FILE"
