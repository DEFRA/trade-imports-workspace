#!/bin/bash
# Mark a version as implemented (done). Atomic (> tmp && mv).
# Helper-as-last-action: invoke ONLY after the commit lands.
#
# Usage:
#   version-mark-implemented.sh --run-id EUDPA-X --repo R --version V [--commit SHA]
#
# Omit --commit only for noop versions (no commit was made).

set -e

RUN_ID=""
REPO=""
VERSION=""
COMMIT_SHA=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --version) VERSION="$2"; shift 2 ;;
        --commit) COMMIT_SHA="$2"; shift 2 ;;
        -h|--help)
            cat <<EOF
Usage: $0 --run-id EUDPA-X --repo R --version V [--commit SHA]
EOF
            exit 0
            ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in RUN_ID REPO VERSION; do
    [[ -z "${!v}" ]] && { echo "Missing --${v,,}" >&2; exit 1; }
done

target="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades/$RUN_ID/$REPO/versions.${REPO}.json"
[[ -f "$target" ]] || { echo "Versions file not found: $target" >&2; exit 1; }

exists=$(jq --arg v "$VERSION" '[.versions[] | select(.version == $v)] | length' "$target")
[[ "$exists" -eq 0 ]] && { echo "Version $VERSION not found in $target" >&2; exit 1; }

now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq \
    --arg version "$VERSION" \
    --arg sha "$COMMIT_SHA" \
    --arg now "$now" \
    '.versions |= map(
        if .version == $version then
            .implementation_status = "done"
            | .implemented_at = $now
            | .commit_sha = (if $sha == "" then null else $sha end)
            | .failure_reason = null
        else . end
    )' \
    "$target" > "$target.tmp" && mv "$target.tmp" "$target"

echo "Marked $REPO@$VERSION as done${COMMIT_SHA:+ (commit $COMMIT_SHA)}"
