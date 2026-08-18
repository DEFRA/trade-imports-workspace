#!/bin/bash
# Driver for one manual-classification upgrade.
#
# Usage:
#   run-manual-upgrade.sh --run-id TICKET --repo REPO --package PKG
#
# Mirrors upgrade-one-package.sh but for the manual side. This script
# is the install + test + commit + rollback frame ONLY — it does not
# make source-level code changes. For real manual upgrades that need
# code edits, spawn a MANUAL_UPGRADE_IMPLEMENTOR subagent instead.
#
# Useful when:
#   - the manual classification was conservative ("major bump but no
#     usages in src/") and the upgrade actually goes through cleanly.
#   - the operator wants the WALKER to retry an auto-demoted package
#     after an unrelated repo fix.

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

REPO_PATH="$HOME/git/defra/trade-imports-workspace/repos/$REPO_NAME"
[[ -d "$REPO_PATH" ]] || { echo "Repo not found: $REPO_PATH" >&2; exit 2; }
# Resolve symlinks so npm doesn't rewrite the lockfile relative to the
# workspace symlink. `cd && pwd -P` is POSIX, works on macOS and Linux
# without needing realpath/readlink -f.
REPO_PATH=$(cd "$REPO_PATH" && pwd -P)

# Tests-repo has no unit-test suite. Skip the per-package npm-test
# gating; the WALKER runs `npm run test:docker-compose` once at end of batch.
SKIP_NPM_TEST=0
[[ "$REPO_NAME" == "trade-imports-animals-tests" ]] && SKIP_NPM_TEST=1

echo "========================================="
echo "Manual upgrade: $PACKAGE | $CURRENT → $TARGET (repo: $REPO_NAME)"
[[ "$SKIP_NPM_TEST" == "1" ]] && echo "(tests repo — npm test gating skipped; walker runs test:docker-compose at end of batch)"
echo "========================================="

set_status() {
    local status="$1"; shift
    "$SCRIPT_DIR/packages-set-status.sh" \
        --run-id "$RUN_ID" --repo "$REPO_NAME" --package "$PACKAGE" \
        --status "$status" "$@" >/dev/null
}

set_status inprogress

# Pre-flight: clean tree.
if [[ -n $(git -C "$REPO_PATH" status --porcelain -uno) ]]; then
    echo "ERROR: uncommitted changes in $REPO_PATH" >&2
    set_status failed --failure-reason "Pre-flight: repository had uncommitted changes"
    exit 2
fi

# Baseline test (skipped for tests repo).
if [[ "$SKIP_NPM_TEST" == "0" ]]; then
    echo "Running baseline tests..."
    if ! npm --prefix "$REPO_PATH" test >/tmp/baseline-manual.log 2>&1; then
        echo "ERROR: Baseline tests failed (repo issue)"
        set_status failed --failure-reason "Baseline tests failed before upgrade; repo issue"
        exit 0
    fi
    echo "✓ Baseline pass"
fi

# Install.
echo "Installing $PACKAGE@$TARGET..."
if ! npm --prefix "$REPO_PATH" install "$PACKAGE@$TARGET" >/tmp/install-manual.log 2>&1; then
    echo "ERROR: npm install failed"
    set_status failed --failure-reason "npm install $PACKAGE@$TARGET failed"
    exit 0
fi
echo "✓ Installed"

# Test (skipped for tests repo — walker runs test:docker-compose at end of batch).
if [[ "$SKIP_NPM_TEST" == "0" ]]; then
    echo "Testing..."
    if ! npm --prefix "$REPO_PATH" test >/tmp/upgrade-manual.log 2>&1; then
        echo "ERROR: Tests failed — rolling back"
        git -C "$REPO_PATH" checkout package.json package-lock.json
        npm --prefix "$REPO_PATH" install >/dev/null 2>&1

        if npm --prefix "$REPO_PATH" test >/tmp/rollback-verify-manual.log 2>&1; then
            echo "✓ Rollback OK — manual code changes needed (spawn MANUAL_UPGRADE_IMPLEMENTOR)"
            set_status failed --failure-reason "Install succeeded but tests fail — manual code changes required"
            exit 0
        else
            echo "✗ CASCADE: rollback also failed"
            set_status failed --failure-reason "CASCADE: rollback failed after manual upgrade; manual intervention required"
            exit 1
        fi
    fi
    echo "✓ Tests pass"
fi

# Commit.
git -C "$REPO_PATH" add package.json package-lock.json

if git -C "$REPO_PATH" diff --cached --quiet; then
    echo "⚠ No changes — package already at target version"
    set_status done --commit-sha ""
    echo "SUCCESS: $PACKAGE already at $TARGET"
    exit 0
fi

git -C "$REPO_PATH" commit -m "Upgrade $PACKAGE $CURRENT → $TARGET

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

COMMIT_SHA=$(git -C "$REPO_PATH" rev-parse --short HEAD)
echo "✓ Committed: $COMMIT_SHA"
set_status done --commit-sha "$COMMIT_SHA"

echo "========================================="
echo "SUCCESS: $PACKAGE $CURRENT → $TARGET ($COMMIT_SHA)"
echo "========================================="
