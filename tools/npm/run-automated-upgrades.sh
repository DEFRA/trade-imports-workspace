#!/bin/bash
# Run automated upgrades for one repo, driven entirely off
# packages.{repo}.json. Loops through every package where
# classification == "auto" and implementation_status is null or
# "todo", calling upgrade-one-package.sh per package.
#
# Usage:
#   run-automated-upgrades.sh <repo-name> --run-id TICKET [--allowlist-owner NAME --expiry-days N]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_help() {
    cat << EOF
Run automated upgrades for one repo (Phase 2).

Usage: ./run-automated-upgrades.sh <repo-name> --run-id TICKET [--allowlist-owner NAME --expiry-days N]

What it does:
  1. Pre-flight: git status clean.
  2. Loops every auto-classified, not-yet-attempted package:
     - upgrade-one-package.sh installs, tests, audits, commits, or
       rolls back + demotes to manual on failure.
  3. Cascade failure (rollback also fails) stops the loop.
  4. refresh-lockfile.sh: npm update within the existing ranges, then
     test, lint, audit and commit (or roll back and report).
  5. trade-imports-ins-tests only: npm run test:docker-compose once.
  6. Final per-repo summary.

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
# Passed through to upgrade-one-package.sh, so a new advisory with no
# fixed version is allowlisted rather than failing the upgrade.
ALLOWLIST_ARGS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h) show_help ;;
        --run-id) RUN_ID="$2"; shift 2 ;;
        --allowlist-owner|--expiry-days) ALLOWLIST_ARGS+=("$1" "$2"); shift 2 ;;
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
else
    echo "Processing $initial_count package(s) sequentially..."
fi
echo

# Counters use $((x + 1)): `((x++))` returns status 1 when x is 0,
# which stops the script under set -e.
PROCESSED=0
SUCCESS=0
FAILED=0

while [[ "$initial_count" -gt 0 ]]; do
    next_pkg=$(list_pending | jq -r 'first.package // empty')
    [[ -z "$next_pkg" ]] && break

    PROCESSED=$((PROCESSED + 1))
    echo "=== Package $PROCESSED/$initial_count ==="

    if "$SCRIPT_DIR/upgrade-one-package.sh" --run-id "$RUN_ID" --repo "$REPO_NAME" --package "$next_pkg" ${ALLOWLIST_ARGS[@]+"${ALLOWLIST_ARGS[@]}"}; then
        # Check whether it succeeded or controlled-failed.
        latest=$("$SCRIPT_DIR/packages-list.sh" \
            --run-id "$RUN_ID" --repo "$REPO_NAME" --package "$next_pkg" --json | jq -r '.[0].implementation_status')
        if [[ "$latest" == "done" ]]; then
            SUCCESS=$((SUCCESS + 1))
            echo "✓ Success"
        else
            FAILED=$((FAILED + 1))
            echo "✗ Failed (demoted to manual)"
        fi
    else
        EXIT_CODE=$?
        if [[ $EXIT_CODE -eq 1 ]]; then
            echo "✗ CRITICAL: Cascade failure — stopping" >&2
            exit 1
        fi
        FAILED=$((FAILED + 1))
        echo "✗ Failed (unexpected exit $EXIT_CODE)"
    fi

    echo
done

# End-of-batch lockfile refresh: ncu never looks at transitive
# dependencies, so take their fixed releases within the existing
# ranges now. A failure rolls the refresh back and is reported; the
# package upgrades above stay committed.
echo "==========================================="
echo "End-of-batch lockfile refresh"
echo "==========================================="
REFRESHED=0
REFRESH_RESULT=$("$SCRIPT_DIR/refresh-lockfile.sh" --run-id "$RUN_ID" --repo "$REPO_NAME") || true
echo "$REFRESH_RESULT"
[[ "$(jq -r '.status // empty' <<<"$REFRESH_RESULT" 2>/dev/null)" == "committed" ]] && REFRESHED=1
echo

echo "==========================================="
echo "Automated upgrades complete for $REPO_NAME"
echo "==========================================="
echo
echo "  Processed: $PROCESSED"
echo "  ✅ Success: $SUCCESS"
echo "  ❌ Failed:  $FAILED"
echo "  Lockfile refresh: $(jq -r '.status // "error"' <<<"$REFRESH_RESULT" 2>/dev/null || echo error)"
echo

# Tests-repo end-of-batch gate: per-package npm test is skipped (the
# tests repo has no unit suite — it IS the E2E suite). If any
# upgrades landed, run the standard test:docker-compose script once
# now as the integration gate (full Playwright suite against the
# running docker-compose stack the operator brought up separately).
# A failure here doesn't roll back individual upgrades — the operator
# needs to investigate, since the failure could be in any of $SUCCESS
# packages.
if [[ "$REPO_NAME" == "trade-imports-ins-tests" ]] && [[ $SUCCESS -gt 0 || $REFRESHED -eq 1 ]]; then
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
