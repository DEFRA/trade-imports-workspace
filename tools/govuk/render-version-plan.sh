#!/bin/bash
# Render a single version's upgrade plan as markdown from versions.{repo}.json.
# Read-only view — never the source of truth.
#
# Usage:
#   render-version-plan.sh --run-id EUDPA-X --repo R --version V

set -e

RUN_ID=""
REPO=""
VERSION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --version) VERSION="$2"; shift 2 ;;
        -h|--help)
            cat <<EOF
Usage: $0 --run-id EUDPA-X --repo R --version V
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

entry=$(jq --arg v "$VERSION" '.versions[] | select(.version == $v)' "$target")
[[ -z "$entry" ]] && { echo "Version $VERSION not found in $target" >&2; exit 1; }

classification=$(echo "$entry" | jq -r '.classification // "unplanned"')
summary=$(echo "$entry" | jq -r '.summary // ""')
classified_at=$(echo "$entry" | jq -r '.classified_at // ""')
impl_status=$(echo "$entry" | jq -r '.implementation_status // ""')
commit_sha=$(echo "$entry" | jq -r '.commit_sha // ""')
failure_reason=$(echo "$entry" | jq -r '.failure_reason // ""')

echo "# govuk-frontend v${VERSION} — Plan"
echo
echo "**Repository:** ${REPO}"
echo "**Classification:** ${classification}"
[[ -n "$summary" ]] && echo "**Summary:** ${summary}"
[[ -n "$classified_at" ]] && echo "**Classified at:** ${classified_at}"
if [[ -n "$impl_status" ]]; then
    echo "**Implementation:** ${impl_status}"
    [[ -n "$commit_sha" ]] && echo "**Commit:** \`${commit_sha}\`"
    [[ -n "$failure_reason" ]] && echo "**Failure reason:** ${failure_reason}"
fi
echo

changes_count=$(echo "$entry" | jq '.changes | length')

if [[ "$classification" == "todo" ]]; then
    echo "## Changes Required (${changes_count})"
    echo
    if [[ "$changes_count" -eq 0 ]]; then
        echo "_No changes recorded yet._"
    else
        echo "$entry" | jq -r '.changes[] | "### \(.file)\n\n**Why:** \(.why)\n\n**Change:** \(.change)\n"'
    fi
elif [[ "$classification" == "noop" ]]; then
    echo "## Assessment"
    echo
    echo "No code changes required for this repo at v${VERSION}."
else
    echo "_Not yet classified — VERSION_PLANNER has not processed this version._"
fi

echo
echo "## Changelog"
echo
changelog_file="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades/$RUN_ID/$REPO/version__${VERSION}.changelog.md"
if [[ -f "$changelog_file" ]]; then
    cat "$changelog_file"
else
    echo "_Pre-baked changelog section not found: ${changelog_file}_"
fi
