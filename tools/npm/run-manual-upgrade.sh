#!/bin/bash
# Driver for one manual-classification upgrade.
#
# Usage:
#   run-manual-upgrade.sh --run-id TICKET --repo REPO --package PKG
#                         [--allowlist-owner NAME --expiry-days N]
#                         [--repo-path PATH]
#
# --repo-path upgrades that checkout instead of repos/<repo>.
#
# Mirrors upgrade-one-package.sh but for the manual side, including its
# audit gate (repos with audit-ci.jsonc): new advisories with no fixed
# version are allowlisted in the same commit (needs --allowlist-owner
# and --expiry-days); an advisory with a fix, or a commit the repo's
# pre-commit hook refuses, rolls back package.json, package-lock.json
# and audit-ci.jsonc and marks the package failed. This script
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
# shellcheck source=audit-lib.sh
source "$SCRIPT_DIR/audit-lib.sh"

RUN_ID=""
REPO_NAME=""
PACKAGE=""
ALLOWLIST_OWNER=""
EXPIRY_DAYS=""
REPO_PATH=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO_NAME="$2"; shift 2 ;;
        --package) PACKAGE="$2"; shift 2 ;;
        --allowlist-owner) ALLOWLIST_OWNER="$2"; shift 2 ;;
        --expiry-days) EXPIRY_DAYS="$2"; shift 2 ;;
        --repo-path) REPO_PATH="$2"; shift 2 ;;
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

REPO_PATH="${REPO_PATH:-$HOME/git/defra/trade-imports-workspace/repos/$REPO_NAME}"
[[ -d "$REPO_PATH" ]] || { echo "Repo not found: $REPO_PATH" >&2; exit 2; }
# Resolve symlinks so npm doesn't rewrite the lockfile relative to the
# workspace symlink. `cd && pwd -P` is POSIX, works on macOS and Linux
# without needing realpath/readlink -f.
REPO_PATH=$(cd "$REPO_PATH" && pwd -P)

# Tests-repo has no unit-test suite. Skip the per-package npm-test
# gating; the WALKER runs `npm run test:docker-compose` once at end of batch.
SKIP_NPM_TEST=0
[[ "$REPO_NAME" == "trade-imports-ins-tests" ]] && SKIP_NPM_TEST=1

# Repos that have adopted audit-ci get the audit gate.
HAS_AUDIT=0
[[ -f "$REPO_PATH/$AUDIT_CONFIG_FILE" ]] && HAS_AUDIT=1

# Files a rollback restores from HEAD, audit-ci.jsonc included.
ROLLBACK_FILES=(package.json package-lock.json)
if git -C "$REPO_PATH" ls-files --error-unmatch "$AUDIT_CONFIG_FILE" >/dev/null 2>&1; then
    ROLLBACK_FILES+=("$AUDIT_CONFIG_FILE")
fi
AUDIT_GATE_ALLOWLISTED=()

# Logs live in the run's per-repo state directory, not fixed /tmp paths.
PKG_SAFE="${PACKAGE//[^A-Za-z0-9._-]/_}"
LOG_DIR="$(audit_state_dir "$RUN_ID" "$REPO_NAME")/logs"
mkdir -p "$LOG_DIR"
BASELINE_AUDIT_LOG="$LOG_DIR/baseline-audit-manual.$PKG_SAFE-$TARGET.log"
COMMIT_LOG="$LOG_DIR/commit-manual.$PKG_SAFE-$TARGET.log"

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

# Put package.json, package-lock.json and audit-ci.jsonc back to HEAD,
# check the tests still pass, and mark the package failed. If the
# tests fail on the rolled-back tree, it is a cascade.
rollback_and_fail() {
    local reason="$1"
    git -C "$REPO_PATH" checkout HEAD -- "${ROLLBACK_FILES[@]}"
    npm --prefix "$REPO_PATH" install >/dev/null 2>&1
    [[ "${#AUDIT_GATE_ALLOWLISTED[@]}" -gt 0 ]] && audit_forget_entries "$RUN_ID" "$REPO_NAME" "${AUDIT_GATE_ALLOWLISTED[@]}"
    if [[ "$SKIP_NPM_TEST" == "0" ]] && ! npm --prefix "$REPO_PATH" test >/tmp/rollback-verify-manual.log 2>&1; then
        echo "✗ CASCADE: rollback also failed"
        set_status failed --failure-reason "CASCADE: rollback failed after manual upgrade; manual intervention required"
        exit 1
    fi
    echo "✓ Rollback OK"
    set_status failed --failure-reason "$reason"
    exit 0
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

# Baseline audit: red before the install is a repo issue.
if [[ "$HAS_AUDIT" == "1" ]]; then
    echo "Running baseline audit..."
    baseline_audit=0
    "$SCRIPT_DIR/audit-baseline.sh" --run-id "$RUN_ID" --repo "$REPO_NAME" --repo-path "$REPO_PATH" \
        --label "before-$PKG_SAFE-${TARGET}" >"$BASELINE_AUDIT_LOG" 2>&1 || baseline_audit=$?
    if [[ "$baseline_audit" -eq 1 ]]; then
        echo "ERROR: Baseline audit red (repo issue)"
        set_status failed --failure-reason "Audit red at baseline, before upgrade; repo issue. See $BASELINE_AUDIT_LOG"
        exit 0
    elif [[ "$baseline_audit" -ne 0 ]]; then
        echo "ERROR: Baseline audit could not run (repo or environment issue)"
        set_status failed --failure-reason "Audit could not run before upgrade (registry offline, or audit-ci not installed?); repo or environment issue. See $BASELINE_AUDIT_LOG"
        exit 0
    fi
    echo "✓ Baseline audit green"
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
        echo "ERROR: Tests failed — rolling back (manual code changes needed: spawn MANUAL_UPGRADE_IMPLEMENTOR)"
        rollback_and_fail "Install succeeded but tests fail — manual code changes required"
    fi
    echo "✓ Tests pass"
fi

# Audit after the upgrade.
if [[ "$HAS_AUDIT" == "1" ]]; then
    echo "Auditing upgraded tree..."
    gate=0
    audit_upgrade_gate "$RUN_ID" "$REPO_NAME" "$PACKAGE" "$TARGET" "$ALLOWLIST_OWNER" "$EXPIRY_DAYS" "$REPO_PATH" || gate=$?
    if [[ "$gate" -ne 0 ]]; then
        echo "ERROR: $AUDIT_GATE_REASON — rolling back"
        rollback_and_fail "$AUDIT_GATE_REASON; rolled back"
    fi
    if [[ "${#AUDIT_GATE_ALLOWLISTED[@]}" -gt 0 ]]; then
        echo "✓ Audit green after allowlisting ${AUDIT_GATE_ALLOWLISTED[*]} (no fixed version)"
    else
        echo "✓ Audit green"
    fi
fi

# Commit.
git -C "$REPO_PATH" add package.json package-lock.json
[[ "${#AUDIT_GATE_ALLOWLISTED[@]}" -gt 0 ]] && git -C "$REPO_PATH" add "$AUDIT_CONFIG_FILE"

if git -C "$REPO_PATH" diff --cached --quiet; then
    echo "⚠ No changes — package already at target version"
    set_status done --commit-sha ""
    echo "SUCCESS: $PACKAGE already at $TARGET"
    exit 0
fi

COMMIT_BODY=""
[[ "${#AUDIT_GATE_ALLOWLISTED[@]}" -gt 0 ]] && COMMIT_BODY="
Allowlist ${AUDIT_GATE_ALLOWLISTED[*]} in audit-ci.jsonc: no fixed version yet.
"

# A refused commit (a pre-commit hook, as in animals-admin) rolls back
# cleanly rather than leaving the row inprogress on a dirty tree.
if ! git -C "$REPO_PATH" commit -m "Upgrade $PACKAGE $CURRENT → $TARGET
$COMMIT_BODY
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>" >"$COMMIT_LOG" 2>&1; then
    echo "ERROR: commit refused — rolling back"
    rollback_and_fail "Commit refused after upgrade to $TARGET (pre-commit hook): $(tail -n 5 "$COMMIT_LOG" | tr '\n' ' ')(full output: $COMMIT_LOG)"
fi

COMMIT_SHA=$(git -C "$REPO_PATH" rev-parse --short HEAD)
echo "✓ Committed: $COMMIT_SHA"
set_status done --commit-sha "$COMMIT_SHA"

echo "========================================="
echo "SUCCESS: $PACKAGE $CURRENT → $TARGET ($COMMIT_SHA)"
echo "========================================="
