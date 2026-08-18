#!/bin/bash
# Mark a version as failed. Atomic (> tmp && mv).
#
# Usage:
#   version-mark-failed.sh --run-id EUDPA-X --repo R --version V --reason "..."

set -e

RUN_ID=""
REPO=""
VERSION=""
REASON=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --version) VERSION="$2"; shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        -h|--help)
            cat <<EOF
Usage: $0 --run-id EUDPA-X --repo R --version V --reason "..."
EOF
            exit 0
            ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in RUN_ID REPO VERSION REASON; do
    [[ -z "${!v}" ]] && { echo "Missing --${v,,}" >&2; exit 1; }
done

target="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades/$RUN_ID/$REPO/versions.${REPO}.json"
[[ -f "$target" ]] || { echo "Versions file not found: $target" >&2; exit 1; }

exists=$(jq --arg v "$VERSION" '[.versions[] | select(.version == $v)] | length' "$target")
[[ "$exists" -eq 0 ]] && { echo "Version $VERSION not found in $target" >&2; exit 1; }

now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq \
    --arg version "$VERSION" \
    --arg reason "$REASON" \
    --arg now "$now" \
    '.versions |= map(
        if .version == $version then
            .implementation_status = "failed"
            | .implemented_at = $now
            | .failure_reason = $reason
        else . end
    )' \
    "$target" > "$target.tmp" && mv "$target.tmp" "$target"

echo "Marked $REPO@$VERSION as failed: $REASON"
