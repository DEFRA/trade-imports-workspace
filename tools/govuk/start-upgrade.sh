#!/bin/bash
# Dispatcher for govuk-frontend upgrade runs.
#
# Usage:
#   start-upgrade.sh --ticket EUDPA-XXXX [--target VERSION]
#   start-upgrade.sh --branch <branch-name> [--target VERSION]
#
# With --ticket: branch is chore/EUDPA-XXXX (run-id == ticket).
# With --branch: branch is verbatim (run-id is derived from the branch
#   suffix if it starts with chore/EUDPA-XXXX, else the branch slug).
#
# Runs:
#   1. discover-repos.sh        → writes .run-meta.json (in-scope repos)
#   2. setup-branch.sh per repo → ensures every in-scope repo is on the branch
#   3. discover-versions.sh per repo → seeds versions.{repo}.json + pre-bakes
#   4. security pre-flight      → npm audit per repo, surface HIGH/CRITICAL
#
# Prints `PHASE: 1` on stdout so the caller can branch.

set -e

PROJECT_KEY="${JIRA_PROJECT_KEY:-EUDPA}"

TICKET=""
BRANCH=""
TARGET_VERSION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --ticket) TICKET="$2"; shift 2 ;;
        --branch) BRANCH="$2"; shift 2 ;;
        --target) TARGET_VERSION="$2"; shift 2 ;;
        -h|--help)
            cat <<EOF
Usage:
  $0 --ticket EUDPA-XXXX [--target VERSION]
  $0 --branch <branch-name> [--target VERSION]

If --ticket is given the branch is chore/EUDPA-XXXX. If --branch is given
the branch is used verbatim; a Jira ticket prefix is preferred (DevOps
ticket conventions: your project's DevOps parent epic, labels
DevOps+tech-improvement, priority Medium, type Task — see ticket-creator
skill).
EOF
            exit 0
            ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

if [[ -n "$TICKET" && -n "$BRANCH" ]]; then
    echo "Pass --ticket OR --branch, not both" >&2
    exit 1
fi

if [[ -z "$TICKET" && -z "$BRANCH" ]]; then
    echo "One of --ticket or --branch is required" >&2
    exit 1
fi

if [[ -n "$TICKET" ]]; then
    [[ "$TICKET" =~ ^${PROJECT_KEY}-[0-9]+$ ]] || {
        echo "--ticket must match ${PROJECT_KEY}-NNNN (got: $TICKET)" >&2
        exit 1
    }
    BRANCH="chore/$TICKET"
    RUN_ID="$TICKET"
else
    # Derive run-id from branch if it embeds a ticket; else use a slug.
    if [[ "$BRANCH" =~ (${PROJECT_KEY}-[0-9]+) ]]; then
        RUN_ID="${BASH_REMATCH[1]}"
    else
        RUN_ID=$(printf '%s' "$BRANCH" | tr '/' '_' | tr -c '[:alnum:]_-' '_')
    fi
fi

echo "PHASE: 1"
echo "Run ID: $RUN_ID"
echo "Branch: $BRANCH"
[[ -n "$TARGET_VERSION" ]] && echo "Target: $TARGET_VERSION"
echo

# Step 1: discover in-scope repos.
discover_args=(--run-id "$RUN_ID" --branch "$BRANCH")
[[ -n "$TARGET_VERSION" ]] && discover_args+=(--target "$TARGET_VERSION")
"$HOME/git/defra/trade-imports-workspace/tools/govuk/discover-repos.sh" "${discover_args[@]}"

META_FILE="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades/$RUN_ID/.run-meta.json"
REPOS=()
while IFS= read -r line; do
    REPOS+=("$line")
done < <(jq -r '.repos[]' "$META_FILE")

if [[ ${#REPOS[@]} -eq 0 ]]; then
    echo "No repos depend on govuk-frontend — nothing to do." >&2
    exit 0
fi

# Step 2: ensure each repo is on the branch.
echo
echo "Setting up branch $BRANCH on ${#REPOS[@]} repo(s)..."
for repo in "${REPOS[@]}"; do
    "$HOME/git/defra/trade-imports-workspace/tools/govuk/setup-branch.sh" --branch "$BRANCH" --repo "$repo"
done

# Step 3: discover versions per repo.
echo
echo "Discovering versions per repo..."
for repo in "${REPOS[@]}"; do
    repo_path="$HOME/git/defra/trade-imports-workspace/repos/$repo"
    dv_args=("$repo_path" --run-id "$RUN_ID")
    [[ -n "$TARGET_VERSION" ]] && dv_args+=(--target "$TARGET_VERSION")
    "$HOME/git/defra/trade-imports-workspace/tools/govuk/discover-versions.sh" "${dv_args[@]}"
done

echo
echo "=== START COMPLETE ==="
"$HOME/git/defra/trade-imports-workspace/tools/govuk/list-plans.sh" --run-id "$RUN_ID"

# Step 4: security pre-flight. Surface HIGH/CRITICAL npm advisories per
# repo before any upgrade work. Report-and-warn only — `npm audit fix`
# alone won't clear a direct-dep HIGH (e.g. undici), and `--force` makes
# breaking changes, so remediation is a deliberate operator decision
# (see the npm-upgrade skill), not something this dispatcher automates.
# A repo whose pre-commit hook runs `npm audit` (e.g. admin) will block
# the upgrade commit until its HIGH/CRITICAL advisories are cleared.
echo
echo "=== SECURITY PRE-FLIGHT (npm audit, HIGH/CRITICAL) ==="
preflight_flagged=0
for repo in "${REPOS[@]}"; do
    repo_path="$HOME/git/defra/trade-imports-workspace/repos/$repo"
    audit_json=$(npm --prefix "$repo_path" audit --json 2>/dev/null || true)
    high=$(printf '%s' "$audit_json" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo 0)
    critical=$(printf '%s' "$audit_json" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo 0)
    if [[ "${critical:-0}" -gt 0 || "${high:-0}" -gt 0 ]]; then
        echo "  [WARN] $repo: $critical critical, $high high — resolve before/alongside the upgrade"
        preflight_flagged=1
    else
        echo "  [ok]   $repo: no high/critical advisories"
    fi
done
if [[ "$preflight_flagged" -eq 1 ]]; then
    echo
    echo "  Clear flagged advisories before Phase 3 (direct-dep bump or an"
    echo "  'overrides' entry — see the npm-upgrade skill), or proceed knowing"
    echo "  the upgrade commit may be blocked by a repo's pre-commit audit."
fi

echo
echo "Next: Phase 2 — spawn VERSION_PLANNER per unplanned version (see PHASE_2_MANAGER.md)."
