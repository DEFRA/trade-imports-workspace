#!/bin/bash
# Apply one intermediate version of a govuk-frontend upgrade to a repo.
#
# Usage:
#   apply-version.sh --run-id EUDPA-XXXX --repo R --version V [--final]
#
# Assumes the LLM has already edited the source files implied by the
# version's plan (per versions.{repo}.json). This helper does the
# mechanical surround:
#   - update package.json govuk-frontend constraint
#   - npm install
#   - npm test (output redirected to /tmp/govuk-test-{repo}-{version}-{ts}.txt)
#   - on success: git add -A, commit, mark implemented (LAST action)
#   - on failure: mark failed with reason, exit non-zero
#
# Intermediate noop versions (classification == "noop", not the final
# target) are short-circuited: no package.json mutation, no install, no
# test, no commit — just a version-mark-implemented.sh call. The final
# target version always bumps package.json and commits, even when noop,
# so the upgrade actually lands in the manifest.

set -e

RUN_ID=""
REPO=""
VERSION=""
FINAL=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --version) VERSION="$2"; shift 2 ;;
        --final) FINAL=true; shift ;;
        -h|--help)
            cat <<EOF
Usage: $0 --run-id EUDPA-XXXX --repo R --version V [--final]
EOF
            exit 0
            ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in RUN_ID REPO VERSION; do
    [[ -z "${!v}" ]] && { echo "Missing --${v,,}" >&2; exit 1; }
done

TOOLS="$HOME/git/defra/trade-imports-workspace/tools/govuk"
REPO_DIR="$HOME/git/defra/trade-imports-workspace/repos/$REPO"
[[ -d "$REPO_DIR/.git" ]] || { echo "Not a git repo: $REPO_DIR" >&2; exit 1; }

# `npm --prefix` through the trade-imports-workspace symlink
# corrupts the lockfile (npm resolves the prefix oddly and writes a
# package-lock.json that `npm ci` later rejects as out of sync). Resolve
# REPO_DIR to its real, non-symlinked path for all npm operations. Git
# operations can stay on REPO_DIR — git follows the symlink fine.
REPO_DIR_REAL=$(cd "$REPO_DIR" && pwd -P)

STATE_FILE="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades/$RUN_ID/$REPO/versions.${REPO}.json"
[[ -f "$STATE_FILE" ]] || { echo "Versions file not found: $STATE_FILE" >&2; exit 1; }

entry=$(jq --arg v "$VERSION" '.versions[] | select(.version == $v)' "$STATE_FILE")
[[ -z "$entry" ]] && { echo "Version $VERSION not found in $STATE_FILE" >&2; exit 1; }

classification=$(echo "$entry" | jq -r '.classification // "null"')
impl_status=$(echo "$entry" | jq -r '.implementation_status // "null"')
target_version=$(jq -r '.target_version' "$STATE_FILE")
prefix=$(jq -r '.original_constraint_prefix // ""' "$STATE_FILE")

if [[ "$classification" == "null" ]]; then
    echo "Version $VERSION is unplanned (classification null) — run Phase 2 first." >&2
    exit 1
fi

if [[ "$impl_status" == "done" ]]; then
    echo "Version $VERSION already done." >&2
    exit 0
fi

# Auto-detect "final" if the version matches the target.
if [[ "$VERSION" == "$target_version" ]]; then
    FINAL=true
fi

# Intermediate noop versions are short-circuited (no per-version commit
# needed). The final target version always bumps package.json even when
# noop, otherwise the upgrade never lands in the manifest.
if [[ "$classification" == "noop" && "$FINAL" != "true" ]]; then
    echo "Version $VERSION classified as noop — recording completion without commit."
    "$TOOLS/version-mark-implemented.sh" --run-id "$RUN_ID" --repo "$REPO" --version "$VERSION"
    exit 0
fi

# Mutate package.json govuk-frontend constraint.
PKG="$REPO_DIR/package.json"
[[ -f "$PKG" ]] || { echo "No package.json at $PKG" >&2; exit 1; }

if [[ "$FINAL" == "true" ]]; then
    new_constraint="${prefix}${VERSION}"
else
    new_constraint="$VERSION"
fi

echo "Setting govuk-frontend = \"$new_constraint\" in $REPO/package.json"
jq --arg v "$new_constraint" '
    if (.dependencies // {}) | has("govuk-frontend") then
        .dependencies["govuk-frontend"] = $v
    elif (.devDependencies // {}) | has("govuk-frontend") then
        .devDependencies["govuk-frontend"] = $v
    else . end
' "$PKG" > "$PKG.tmp"
mv "$PKG.tmp" "$PKG"

# npm install.
echo "Running npm install..."
ts=$(date -u +"%Y%m%dT%H%M%SZ")
install_log="/tmp/govuk-install-${REPO}-${VERSION}-${ts}.txt"
if ! npm --prefix "$REPO_DIR_REAL" install >"$install_log" 2>&1; then
    reason="npm install failed — see $install_log"
    echo "$reason" >&2
    "$TOOLS/version-mark-failed.sh" --run-id "$RUN_ID" --repo "$REPO" --version "$VERSION" --reason "$reason"
    exit 1
fi
echo "  install log: $install_log"

# npm test (unit only — Decision 3).
echo "Running npm test..."
test_log="/tmp/govuk-test-${REPO}-${VERSION}-${ts}.txt"
if ! npm --prefix "$REPO_DIR_REAL" test >"$test_log" 2>&1; then
    reason="npm test failed — see $test_log"
    echo "$reason" >&2
    "$TOOLS/version-mark-failed.sh" --run-id "$RUN_ID" --repo "$REPO" --version "$VERSION" --reason "$reason"
    exit 1
fi
echo "  test log: $test_log"

# Stage everything in the repo. The feature branch should contain no
# unrelated work — this is a govuk-upgrade-only branch by convention.
git -C "$REPO_DIR" add -A

# Commit.
commit_msg="chore($RUN_ID): upgrade govuk-frontend to $VERSION"
git -C "$REPO_DIR" commit -m "$commit_msg"
commit_sha=$(git -C "$REPO_DIR" rev-parse HEAD)

# Helper-as-last-action: only mark done once the commit lands.
"$TOOLS/version-mark-implemented.sh" --run-id "$RUN_ID" --repo "$REPO" --version "$VERSION" --commit "$commit_sha"

echo
echo "=== APPLIED v$VERSION ($REPO) ==="
echo "Commit: $commit_sha"
echo "Constraint: $new_constraint"
[[ "$FINAL" == "true" ]] && echo "(final target — restored prefix '$prefix')"
