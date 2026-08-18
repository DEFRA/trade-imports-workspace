#!/bin/bash
# Set classification (todo|noop) on one version in versions.{repo}.json.
# Stamps classified_at. Atomic (> tmp && mv).
#
# Usage:
#   version-classify.sh --run-id EUDPA-X --repo R --version V --classification todo|noop [--summary "..."]

set -e

RUN_ID=""
REPO=""
VERSION=""
CLASSIFICATION=""
SUMMARY=""
SET_SUMMARY=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --version) VERSION="$2"; shift 2 ;;
        --classification) CLASSIFICATION="$2"; shift 2 ;;
        --summary) SUMMARY="$2"; SET_SUMMARY=1; shift 2 ;;
        -h|--help)
            cat <<EOF
Usage: $0 --run-id EUDPA-X --repo R --version V --classification todo|noop [--summary "..."]
EOF
            exit 0
            ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in RUN_ID REPO VERSION CLASSIFICATION; do
    [[ -z "${!v}" ]] && { echo "Missing --${v,,}" >&2; exit 1; }
done

case "$CLASSIFICATION" in
    todo|noop) ;;
    *) echo "Invalid --classification: $CLASSIFICATION (must be todo|noop)" >&2; exit 1 ;;
esac

target="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades/$RUN_ID/$REPO/versions.${REPO}.json"
[[ -f "$target" ]] || { echo "Versions file not found: $target — run discover-versions.sh first" >&2; exit 1; }

# Verify the version exists.
exists=$(jq --arg v "$VERSION" '[.versions[] | select(.version == $v)] | length' "$target")
[[ "$exists" -eq 0 ]] && { echo "Version $VERSION not found in $target" >&2; exit 1; }

now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [[ "$SET_SUMMARY" == "1" ]]; then
    jq \
        --arg version "$VERSION" \
        --arg classification "$CLASSIFICATION" \
        --arg summary "$SUMMARY" \
        --arg now "$now" \
        '.versions |= map(
            if .version == $version then
                .classification = $classification
                | .classified_at = $now
                | .summary = (if $summary == "" then null else $summary end)
                | (if $classification == "noop" then .changes = [] else . end)
            else . end
        )' \
        "$target" > "$target.tmp" && mv "$target.tmp" "$target"
else
    jq \
        --arg version "$VERSION" \
        --arg classification "$CLASSIFICATION" \
        --arg now "$now" \
        '.versions |= map(
            if .version == $version then
                .classification = $classification
                | .classified_at = $now
                | (if $classification == "noop" then .changes = [] else . end)
            else . end
        )' \
        "$target" > "$target.tmp" && mv "$target.tmp" "$target"
fi

echo "Classified $REPO@$VERSION as $CLASSIFICATION"
