#!/bin/bash
# Upgrade a single npm package — JSON-state-aware version.
#
# Usage:
#   upgrade-one-package.sh --run-id TICKET --repo REPO --package PKG
#                          [--allowlist-owner NAME --expiry-days N]
#                          [--repo-path PATH]
#
# --repo-path upgrades that checkout instead of repos/<repo> (a scratch
# clone, say, to try the flow without touching repos/).
#
# All state lives in
# ~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/packages.{repo}.json
#
# Flow:
#   1. Mark the package inprogress.
#   2. nvm use.
#   3. Baseline test — if fails, mark failed (repo issue, not demoted).
#      Baseline audit (repos with audit-ci.jsonc) — if red, mark
#      failed (repo issue, not demoted).
#   4. npm install package@target.
#      - install fails → demote to manual, mark failed, exit 0.
#   5. npm test.
#      - tests fail → rollback. If rollback also fails → cascade,
#        mark failed, exit 1. Otherwise demote to manual, mark
#        failed, exit 0.
#   5a. Audit (repos with audit-ci.jsonc), via audit_upgrade_gate.
#      - new advisories with no fixed version → allowlisted with
#        audit-allowlist-add.sh (needs --allowlist-owner and
#        --expiry-days); audit-ci.jsonc goes in the same commit.
#      - an advisory with a fix, or no owner to allowlist under →
#        rollback, demote to manual with the GHSA as the reason, exit 0.
#   6. git commit. Mark done with commit_sha. Exit 0.
#      - commit refused (a pre-commit hook, as in animals-admin) →
#        rollback, demote to manual, mark failed with the hook output,
#        exit 0.
#
# Rollback restores package.json, package-lock.json and audit-ci.jsonc
# from HEAD, so a half-written allowlist entry never survives.
#
# Tests-repo exception (trade-imports-ins-tests):
# Steps 3 and 5 are SKIPPED. The tests repo has no unit-test suite
# (it IS the test suite — a Playwright runner against the live stack).
# Per-package installs commit straight through; the orchestrating
# runner (run-automated-upgrades.sh) runs `npm run test:docker-compose` ONCE
# after all upgrades land, as the end-of-batch integration gate.
# The audit steps still run.
#
# Exit codes:
#   0  → success OR controlled failure (demoted to manual)
#   1  → cascade failure (rollback failed, repo in inconsistent state)

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
CLASSIFICATION=$(echo "$row" | jq -r '.classification // "null"')

REPO_PATH="${REPO_PATH:-$HOME/git/defra/trade-imports-workspace/repos/$REPO_NAME}"
[[ -d "$REPO_PATH" ]] || { echo "Repo not found: $REPO_PATH" >&2; exit 2; }
# Resolve symlinks so npm doesn't rewrite the lockfile relative to the
# workspace symlink. `cd && pwd -P` is POSIX, works on macOS and Linux
# without needing realpath/readlink -f.
REPO_PATH=$(cd "$REPO_PATH" && pwd -P)

# Tests-repo has no unit-test suite — it IS the E2E suite. Skip the
# per-package npm-test gating; run-automated-upgrades.sh runs
# `npm run test:docker-compose` once at the end of the batch instead.
SKIP_NPM_TEST=0
[[ "$REPO_NAME" == "trade-imports-ins-tests" ]] && SKIP_NPM_TEST=1

# Repos that have adopted audit-ci get the audit gate.
HAS_AUDIT=0
[[ -f "$REPO_PATH/$AUDIT_CONFIG_FILE" ]] && HAS_AUDIT=1

# Files a rollback restores from HEAD. audit-ci.jsonc is included so a
# half-written allowlist entry never survives a failed upgrade.
ROLLBACK_FILES=(package.json package-lock.json)
if git -C "$REPO_PATH" ls-files --error-unmatch "$AUDIT_CONFIG_FILE" >/dev/null 2>&1; then
    ROLLBACK_FILES+=("$AUDIT_CONFIG_FILE")
fi

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

# Put package.json, package-lock.json and audit-ci.jsonc back to HEAD
# (index and working tree), and node_modules back in step with them.
rollback() {
    git -C "$REPO_PATH" checkout HEAD -- "${ROLLBACK_FILES[@]}"
    npm --prefix "$REPO_PATH" install >/dev/null 2>&1
}

# Roll back a failure found after the install, then demote. If the
# tests no longer pass on the rolled-back tree, it is a cascade.
rollback_and_demote() {
    local demote_reason="$1" failure_reason="$2"
    rollback
    [[ "${#AUDIT_GATE_ALLOWLISTED[@]}" -gt 0 ]] && audit_forget_entries "$RUN_ID" "$REPO_NAME" "${AUDIT_GATE_ALLOWLISTED[@]}"
    if [[ "$SKIP_NPM_TEST" == "0" ]]; then
        echo "Verifying rollback..."
        if ! npm --prefix "$REPO_PATH" test >/tmp/rollback-verify.log 2>&1; then
            echo "✗ CRITICAL: Tests still failing after rollback — cascade failure"
            set_status failed --failure-reason "CASCADE: tests still failing after rollback. Previous upgrade may have broken something. Manual intervention required."
            exit 1
        fi
    fi
    echo "✓ Rollback successful"
    demote_to_manual "$demote_reason"
    set_status failed --failure-reason "$failure_reason"
    exit 0
}

AUDIT_GATE_ALLOWLISTED=()

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

# Step 3 (audit): a red audit before the install is a repo issue, so
# it must not be blamed on this package.
if [[ "$HAS_AUDIT" == "1" ]]; then
    echo "Running baseline audit..."
    if ! "$SCRIPT_DIR/audit-baseline.sh" --run-id "$RUN_ID" --repo "$REPO_NAME" --repo-path "$REPO_PATH" \
        --label "before-${PACKAGE//[^A-Za-z0-9._-]/_}-${TARGET}" >/tmp/baseline-audit.log 2>&1; then
        echo "ERROR: Baseline audit red (repo issue, not upgrade)"
        set_status failed --failure-reason "Audit red at baseline, before upgrade; repo issue, not package-specific. See /tmp/baseline-audit.log"
        exit 0
    fi
    echo "✓ Baseline audit green"
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
        rollback_and_demote "Tests fail after upgrade; requires investigation" \
            "Tests failed after upgrade to $TARGET; rolled back; demoted to manual"
    fi
    echo "✓ Tests pass"
fi

# Step 5a: audit after upgrade
if [[ "$HAS_AUDIT" == "1" ]]; then
    echo "Auditing upgraded tree..."
    gate=0
    audit_upgrade_gate "$RUN_ID" "$REPO_NAME" "$PACKAGE" "$TARGET" "$ALLOWLIST_OWNER" "$EXPIRY_DAYS" "$REPO_PATH" || gate=$?
    if [[ "$gate" -ne 0 ]]; then
        echo "ERROR: $AUDIT_GATE_REASON — rolling back"
        rollback_and_demote "$AUDIT_GATE_REASON" "$AUDIT_GATE_REASON; rolled back; demoted to manual"
    fi
    if [[ "${#AUDIT_GATE_ALLOWLISTED[@]}" -gt 0 ]]; then
        echo "✓ Audit green after allowlisting ${AUDIT_GATE_ALLOWLISTED[*]} (no fixed version)"
    else
        echo "✓ Audit green"
    fi
fi

# Step 6: commit
git -C "$REPO_PATH" add package.json package-lock.json
[[ "${#AUDIT_GATE_ALLOWLISTED[@]}" -gt 0 ]] && git -C "$REPO_PATH" add "$AUDIT_CONFIG_FILE"

if git -C "$REPO_PATH" diff --cached --quiet; then
    echo "⚠ No changes — package already at target version"
    set_status done --commit-sha ""
    echo "SUCCESS: $PACKAGE already at $TARGET (no commit needed)"
    exit 0
fi

COMMIT_BODY=""
[[ "${#AUDIT_GATE_ALLOWLISTED[@]}" -gt 0 ]] && COMMIT_BODY="
Allowlist ${AUDIT_GATE_ALLOWLISTED[*]} in audit-ci.jsonc: no fixed version yet.
"

# A refused commit (a pre-commit hook that runs the audit or the tests,
# as animals-admin's does) is a controlled failure, not a cascade.
if ! git -C "$REPO_PATH" commit -m "Upgrade $PACKAGE $CURRENT → $TARGET
$COMMIT_BODY
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>" >/tmp/commit.log 2>&1; then
    echo "ERROR: commit refused — rolling back"
    HOOK_OUTPUT=$(tail -n 5 /tmp/commit.log | tr '\n' ' ')
    rollback_and_demote "Commit refused by the repo's pre-commit hook" \
        "Commit refused after upgrade to $TARGET (pre-commit hook): $HOOK_OUTPUT; rolled back; demoted to manual"
fi

COMMIT_SHA=$(git -C "$REPO_PATH" rev-parse --short HEAD)
echo "✓ Committed: $COMMIT_SHA"

set_status done --commit-sha "$COMMIT_SHA"

echo "========================================="
echo "SUCCESS: $PACKAGE $CURRENT → $TARGET ($COMMIT_SHA)"
echo "========================================="
