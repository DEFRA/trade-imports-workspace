#!/bin/bash
# Upgrade a single npm package — JSON-state-aware version.
#
# Usage:
#   upgrade-one-package.sh --run-id TICKET --repo REPO --package PKG
#
# All state lives in
# ~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/packages.{repo}.json
#
# Flow:
#   1. Mark the package inprogress.
#   2. nvm use.
#   3. Baseline test — if fails, mark failed (repo issue, not demoted).
#   4. npm install package@target.
#      - install fails → demote to manual, mark failed, exit 0.
#   5. npm test.
#      - tests fail → rollback. If rollback also fails → cascade,
#        mark failed, exit 1. Otherwise demote to manual, mark
#        failed, exit 0.
#   6. git commit. Mark done with commit_sha. Exit 0.
#
# Tests-repo exception (trade-imports-animals-tests):
# Steps 3 and 5 are SKIPPED. The tests repo has no unit-test suite
# (it IS the test suite — a Playwright runner against the live stack).
# Per-package installs commit straight through; the orchestrating
# runner (run-automated-upgrades.sh) runs `npm run test:docker-compose` ONCE
# after all upgrades land, as the end-of-batch integration gate.
#
# Exit codes:
#   0  → success OR controlled failure (demoted to manual)
#   1  → cascade failure (rollback failed, repo in inconsistent state)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RUN_ID=""
REPO_NAME=""
PACKAGE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO_NAME="$2"; shift 2 ;;
        --package) PACKAGE="$2"; shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 2 ;;
    esac
done

[[ -z "$RUN_ID" ]] && { echo "--run-id required" >&2; exit 2; }
[[ -z "$REPO_NAME" ]] && { echo "--repo required" >&2; exit 2; }
[[ -z "$PACKAGE" ]] && { echo "--package required" >&2; exit 2; }

PKGS_FILE="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$RUN_ID/$REPO_NAME/packages.${REPO_NAME}.json"
[[ -f "$PKGS_FILE" ]] || { echo "Packages file not found: $PKGS_FILE" >&2; exit 2; }

row=$(jq -c --arg p "$PACKAGE" '.packages[] | select(.package == $p)' "$PKGS_FILE")
[[ -z "$row" ]] && { echo "Package $PACKAGE not in $PKGS_FILE" >&2; exit 2; }

CURRENT=$(echo "$row" | jq -r '.current')
TARGET=$(echo "$row" | jq -r '.target')
CLASSIFICATION=$(echo "$row" | jq -r '.classification // "null"')

REPO_PATH="$HOME/git/defra/trade-imports-workspace/repos/$REPO_NAME"
[[ -d "$REPO_PATH" ]] || { echo "Repo not found: $REPO_PATH" >&2; exit 2; }
# Resolve symlinks so npm doesn't rewrite the lockfile relative to the
# workspace symlink. `cd && pwd -P` is POSIX, works on macOS and Linux
# without needing realpath/readlink -f.
REPO_PATH=$(cd "$REPO_PATH" && pwd -P)

# Tests-repo has no unit-test suite — it IS the E2E suite. Skip the
# per-package npm-test gating; run-automated-upgrades.sh runs
# `npm run test:docker-compose` once at the end of the batch instead.
SKIP_NPM_TEST=0
[[ "$REPO_NAME" == "trade-imports-animals-tests" ]] && SKIP_NPM_TEST=1

echo "========================================="
echo "Package: $PACKAGE | $CURRENT → $TARGET | classification: $CLASSIFICATION"
[[ "$SKIP_NPM_TEST" == "1" ]] && echo "(tests repo — npm test gating skipped; test:docker-compose runs at end of batch)"
echo "========================================="

set_status() {
    local status="$1"; shift
    "$SCRIPT_DIR/packages-set-status.sh" \
        --run-id "$RUN_ID" --repo "$REPO_NAME" --package "$PACKAGE" \
        --status "$status" "$@" >/dev/null
}

demote_to_manual() {
    local reason="$1"
    "$SCRIPT_DIR/packages-set-classification.sh" \
        --run-id "$RUN_ID" --repo "$REPO_NAME" --package "$PACKAGE" \
        --classification manual \
        --risk MEDIUM \
        --safe-for-automation false \
        --rationale "Auto-demoted: $reason" \
        --demoted-from-auto true \
        >/dev/null
}

# Step 1: claim it
set_status inprogress

# Step 2: nvm
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"
(cd "$REPO_PATH"; nvm use) >/dev/null 2>&1 || true

echo "✓ nvm use OK"

# Step 3: baseline test (skipped for tests repo)
if [[ "$SKIP_NPM_TEST" == "0" ]]; then
    echo "Running baseline tests..."
    if ! npm --prefix "$REPO_PATH" test >/tmp/baseline.log 2>&1; then
        echo "ERROR: Baseline tests failed (repo issue, not upgrade)"
        set_status failed --failure-reason "Baseline tests failed before upgrade; repo issue, not package-specific"
        exit 0
    fi
    echo "✓ Baseline pass"
fi

# Step 4: install
echo "Upgrading..."
if ! npm --prefix "$REPO_PATH" install "$PACKAGE@$TARGET" >/tmp/install.log 2>&1; then
    echo "ERROR: npm install failed"
    demote_to_manual "npm install failed — likely peer dependency conflict"
    set_status failed --failure-reason "npm install $PACKAGE@$TARGET failed (peer conflict likely)"
    exit 0
fi
echo "✓ Installed"

# Step 5: test after upgrade (skipped for tests repo — see top-of-file)
if [[ "$SKIP_NPM_TEST" == "0" ]]; then
    echo "Testing upgraded package..."
    if ! npm --prefix "$REPO_PATH" test >/tmp/upgrade.log 2>&1; then
        echo "ERROR: Tests failed after upgrade — rolling back"
        git -C "$REPO_PATH" checkout package.json package-lock.json
        npm --prefix "$REPO_PATH" install >/dev/null 2>&1

        echo "Verifying rollback..."
        if npm --prefix "$REPO_PATH" test >/tmp/rollback-verify.log 2>&1; then
            echo "✓ Rollback successful"
            demote_to_manual "Tests fail after upgrade; requires investigation"
            set_status failed --failure-reason "Tests failed after upgrade to $TARGET; rolled back; demoted to manual"
            exit 0
        else
            echo "✗ CRITICAL: Tests still failing after rollback — cascade failure"
            set_status failed --failure-reason "CASCADE: tests still failing after rollback. Previous upgrade may have broken something. Manual intervention required."
            exit 1
        fi
    fi
    echo "✓ Tests pass"
fi

# Step 6: commit
git -C "$REPO_PATH" add package.json package-lock.json

if git -C "$REPO_PATH" diff --cached --quiet; then
    echo "⚠ No changes — package already at target version"
    set_status done --commit-sha ""
    echo "SUCCESS: $PACKAGE already at $TARGET (no commit needed)"
    exit 0
fi

git -C "$REPO_PATH" commit -m "Upgrade $PACKAGE $CURRENT → $TARGET

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

COMMIT_SHA=$(git -C "$REPO_PATH" rev-parse --short HEAD)
echo "✓ Committed: $COMMIT_SHA"

set_status done --commit-sha "$COMMIT_SHA"

echo "========================================="
echo "SUCCESS: $PACKAGE $CURRENT → $TARGET ($COMMIT_SHA)"
echo "========================================="
