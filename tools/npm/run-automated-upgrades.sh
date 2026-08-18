#!/bin/bash
# Run automated upgrades for one repo, driven entirely off
# packages.{repo}.json. Loops through every package where
# classification == "auto" and implementation_status is null or
# "todo", calling upgrade-one-package.sh per package.
#
# Usage:
#   run-automated-upgrades.sh <repo-name> --run-id TICKET

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_help() {
    cat << EOF
Run automated upgrades for one repo (Phase 2).

Usage: ./run-automated-upgrades.sh <repo-name> --run-id TICKET

What it does:
  1. Pre-flight: git status clean.
  2. Loops every auto-classified, not-yet-attempted package:
     - upgrade-one-package.sh installs, tests, commits, or
       rolls back + demotes to manual on failure.
  3. Cascade failure (rollback also fails) stops the loop.
  4. Final per-repo summary.

State: ~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/packages.{repo}.json

Rollback safety:
  - Each upgrade is committed separately, locally only.
  - Failed upgrades are reverted and their classification flipped to
    "manual" with demoted_from_auto=true.
  - Cascade detection stops the loop if rollback itself fails.
EOF
    exit 0
}

REPO_NAME=""
RUN_ID=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h) show_help ;;
        --run-id) RUN_ID="$2"; shift 2 ;;
        --no-discover|--discover) shift ;;  # legacy no-ops; we read JSON
        *)
            if [[ -z "$REPO_NAME" ]]; then
                REPO_NAME="$1"; shift
            else
                echo "Unknown arg: $1" >&2; exit 1
            fi
            ;;
    esac
done

[[ -z "$REPO_NAME" ]] && { echo "Missing repo-name" >&2; exit 1; }
[[ -z "$RUN_ID" ]] && { echo "--run-id required" >&2; exit 1; }

if [[ ! "$RUN_ID" =~ ^[A-Z]+-[0-9]+$ ]]; then
    echo "Warning: --run-id '$RUN_ID' does not match Jira-ticket format" >&2
fi

PKGS_FILE="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$RUN_ID/$REPO_NAME/packages.${REPO_NAME}.json"
[[ -f "$PKGS_FILE" ]] || { echo "Packages file not found: $PKGS_FILE" >&2; exit 1; }

REPO_PATH="$HOME/git/defra/trade-imports-workspace/repos/$REPO_NAME"
[[ -d "$REPO_PATH" ]] || { echo "Repo not found: $REPO_PATH" >&2; exit 1; }

echo "==========================================="
echo "Automated NPM Upgrades — $REPO_NAME"
echo "==========================================="

# Pre-flight: clean git tree.
if [[ -n $(git -C "$REPO_PATH" status --porcelain -uno) ]]; then
    echo "Error: Repository has uncommitted changes" >&2
    git -C "$REPO_PATH" status --short -uno >&2
    echo "Commit or stash before running automated upgrades." >&2
    exit 1
fi
echo "✓ Git status clean"
echo

# Initial backlog: every auto package with pending status.
list_pending() {
    "$SCRIPT_DIR/packages-list.sh" \
        --run-id "$RUN_ID" --repo "$REPO_NAME" \
        --classification auto --status pending --json
}

initial_count=$(list_pending | jq 'length')
if [[ "$initial_count" -eq 0 ]]; then
    echo "No auto-classified packages awaiting upgrade in $REPO_NAME."
    exit 0
fi

echo "Processing $initial_count package(s) sequentially..."
echo

PROCESSED=0
SUCCESS=0
FAILED=0

while true; do
    next_pkg=$(list_pending | jq -r 'first.package // empty')
    [[ -z "$next_pkg" ]] && break

    ((PROCESSED++))
    echo "=== Package $PROCESSED/$initial_count ==="

    if "$SCRIPT_DIR/upgrade-one-package.sh" --run-id "$RUN_ID" --repo "$REPO_NAME" --package "$next_pkg"; then
        # Check whether it succeeded or controlled-failed.
        latest=$("$SCRIPT_DIR/packages-list.sh" \
            --run-id "$RUN_ID" --repo "$REPO_NAME" --package "$next_pkg" --json | jq -r '.[0].implementation_status')
        if [[ "$latest" == "done" ]]; then
            ((SUCCESS++))
            echo "✓ Success"
        else
            ((FAILED++))
            echo "✗ Failed (demoted to manual)"
        fi
    else
        EXIT_CODE=$?
        if [[ $EXIT_CODE -eq 1 ]]; then
            echo "✗ CRITICAL: Cascade failure — stopping" >&2
            exit 1
        fi
        ((FAILED++))
        echo "✗ Failed (unexpected exit $EXIT_CODE)"
    fi

    echo
done

echo "==========================================="
echo "Automated upgrades complete for $REPO_NAME"
echo "==========================================="
echo
echo "  Processed: $PROCESSED"
echo "  ✅ Success: $SUCCESS"
echo "  ❌ Failed:  $FAILED"
echo

# Tests-repo end-of-batch gate: per-package npm test is skipped (the
# tests repo has no unit suite — it IS the E2E suite). If any
# upgrades landed, run the standard test:docker-compose script once
# now as the integration gate (full Playwright suite against the
# running docker-compose stack the operator brought up separately).
# A failure here doesn't roll back individual upgrades — the operator
# needs to investigate, since the failure could be in any of $SUCCESS
# packages.
if [[ "$REPO_NAME" == "trade-imports-animals-tests" ]] && [[ $SUCCESS -gt 0 ]]; then
    echo "==========================================="
    echo "End-of-batch E2E gate (npm run test:docker-compose)"
    echo "==========================================="
    E2E_LOG="/tmp/test-docker-compose-$(date +%Y%m%d-%H%M%S).log"
    if npm --prefix "$REPO_PATH" run test:docker-compose > "$E2E_LOG" 2>&1; then
        echo "✓ test:docker-compose pass — $SUCCESS upgrade(s) integration-verified"
    else
        echo "✗ test:docker-compose FAILED after $SUCCESS upgrade(s)" >&2
        echo "  Log: $E2E_LOG" >&2
        echo "  Read structured failures: $REPO_PATH/test-results/*/error-context.md" >&2
        echo "  Upgrades are committed — operator must investigate which one caused the regression." >&2
    fi
    echo
fi

"$SCRIPT_DIR/packages-counts.sh" --run-id "$RUN_ID" --repo "$REPO_NAME"

echo
echo "==========================================="
echo "Next Steps"
echo "==========================================="
echo

if [[ $SUCCESS -gt 0 ]]; then
    echo "✅ Review successful upgrades:"
    echo "   git -C ~/git/defra/trade-imports-workspace/repos/$REPO_NAME log --oneline -$SUCCESS"
    echo "   npm --prefix ~/git/defra/trade-imports-workspace/repos/$REPO_NAME test"
    echo
fi

if [[ $FAILED -gt 0 ]]; then
    echo "❌ Failed packages auto-demoted to classification=manual:"
    echo "   ~/git/defra/trade-imports-workspace/tools/npm/packages-list.sh --run-id $RUN_ID --repo $REPO_NAME --status failed"
    echo
fi

if [[ $SUCCESS -gt 0 ]]; then
    echo "🚀 Push when ready:"
    echo "   git -C ~/git/defra/trade-imports-workspace/repos/$REPO_NAME push origin <branch-name>"
    echo
fi

echo "📊 Overall status:"
echo "   ~/git/defra/trade-imports-workspace/tools/npm/packages-counts.sh --run-id $RUN_ID"
