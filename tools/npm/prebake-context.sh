#!/bin/bash
# Pre-bake per-package context for the PACKAGE_PLANNER worker.
# Best-effort: anything that can't be resolved deterministically is
# marked partial/false on the package row so the worker hydrates it
# via WebFetch / Grep at spawn time.
#
# Usage:
#   prebake-context.sh --run-id TICKET --repo REPO --package PKG
#
# Writes:
#   workareas/npm-upgrades/{run}/{repo}/.context/{normalized-pkg}/
#     ├── package-meta.json   — always written (cheap, from packages.{repo}.json)
#     ├── usages.txt          — Grep over repos/{repo}/src for import/require
#     ├── changelog.md        — best-effort fetch (curl off npm registry)
#     └── migration.md        — best-effort (only if discoverable from changelog text)
#
# Updates the package row's context_baked + context_missing fields
# via in-place jq (atomic).
#
# IMPORTANT: do NOT fail the script on fetch errors. Silent best-effort
# is the contract. The worker is still expected to be able to hunt
# changelogs from unconventional places.

set -e

RUN_ID=""
REPO=""
PACKAGE=""

usage() {
    echo "Usage: $0 --run-id TICKET --repo REPO --package PKG" >&2
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --package) PACKAGE="$2"; shift 2 ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$RUN_ID" ]] && usage
[[ -z "$REPO" ]] && usage
[[ -z "$PACKAGE" ]] && usage

WORKSPACE_DIR="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$RUN_ID/$REPO"
PKGS_FILE="$WORKSPACE_DIR/packages.${REPO}.json"
[[ -f "$PKGS_FILE" ]] || { echo "Packages file not found: $PKGS_FILE" >&2; exit 1; }

# Normalize package name for filesystem (replace / with __).
NORMALIZED="${PACKAGE//\//__}"
CTX_DIR="$WORKSPACE_DIR/.context/$NORMALIZED"
mkdir -p "$CTX_DIR"

# Extract row.
row=$(jq -c --arg p "$PACKAGE" '.packages[] | select(.package == $p)' "$PKGS_FILE")
[[ -z "$row" ]] && { echo "Package not found: $PACKAGE" >&2; exit 1; }

CURRENT=$(echo "$row" | jq -r '.current')
TARGET=$(echo "$row" | jq -r '.target')
UPGRADE_TYPE=$(echo "$row" | jq -r '.upgrade_type')
DEP_TYPE=$(echo "$row" | jq -r '.dependency_type')

missing=()

# --- package-meta.json (always; just a per-package projection) ---
jq -nc \
    --arg pkg "$PACKAGE" \
    --arg cur "$CURRENT" \
    --arg tgt "$TARGET" \
    --arg ut "$UPGRADE_TYPE" \
    --arg dt "$DEP_TYPE" \
    '{package:$pkg, current:$cur, target:$tgt, upgrade_type:$ut, dependency_type:$dt}' \
    > "$CTX_DIR/package-meta.json.tmp"
mv "$CTX_DIR/package-meta.json.tmp" "$CTX_DIR/package-meta.json"

# --- usages.txt (grep over repos/{repo}/src) ---
REPO_SRC="$HOME/git/defra/trade-imports-workspace/repos/$REPO/src"
USAGES_TMP="$CTX_DIR/usages.txt.tmp"
{
    if [[ -d "$REPO_SRC" ]]; then
        # `grep -rn` matches both `from 'pkg'` and `require('pkg')`.
        # Escape regex meta in the package name (slash in scoped names
        # is fine, but a leading @ is literal).
        ESCAPED=$(printf '%s' "$PACKAGE" | sed 's/[.[\*^$/]/\\&/g')
        grep -rn -E "from ['\"]${ESCAPED}(/|['\"])|require\(['\"]${ESCAPED}(/|['\"])" "$REPO_SRC" 2>/dev/null || true
    else
        echo "# repo src dir not found: $REPO_SRC"
    fi
} > "$USAGES_TMP"
mv "$USAGES_TMP" "$CTX_DIR/usages.txt"

# Whether usages.txt has any hits (a 0-byte file still counts as
# "baked" — it tells the worker "no direct usage").
if [[ ! -d "$REPO_SRC" ]]; then
    missing+=("usages")
fi

# --- changelog.md (best-effort; resolve via npm registry repository.url) ---
CHANGELOG_OK=0
CHANGELOG_TMP="$CTX_DIR/changelog.md.tmp"
if command -v curl >/dev/null 2>&1; then
    # Get the registry record (silent fail).
    NPM_META=$(curl -fsSL --max-time 8 "https://registry.npmjs.org/${PACKAGE}" 2>/dev/null || true)
    if [[ -n "$NPM_META" ]]; then
        REPO_URL=$(echo "$NPM_META" | jq -r '.repository.url // .repository // empty' 2>/dev/null | sed -E 's#^git\+##; s#^git://#https://#; s#\.git$##; s#^ssh://git@#https://#')
        if [[ -n "$REPO_URL" ]] && [[ "$REPO_URL" =~ github.com ]]; then
            # Best-effort: try the conventional changelog locations on main + master.
            REPO_PATH_PART=$(echo "$REPO_URL" | sed -E 's#https?://github.com/##; s#/$##')
            for branch in main master; do
                for name in CHANGELOG.md HISTORY.md changelog.md History.md CHANGES.md; do
                    URL="https://raw.githubusercontent.com/$REPO_PATH_PART/$branch/$name"
                    if BODY=$(curl -fsSL --max-time 8 "$URL" 2>/dev/null); then
                        {
                            echo "# Changelog for $PACKAGE"
                            echo
                            echo "Source: $URL"
                            echo
                            echo "---"
                            echo
                            echo "$BODY"
                        } > "$CHANGELOG_TMP"
                        mv "$CHANGELOG_TMP" "$CTX_DIR/changelog.md"
                        CHANGELOG_OK=1
                        break 2
                    fi
                done
            done
        fi
    fi
fi
if [[ "$CHANGELOG_OK" == "0" ]]; then
    missing+=("changelog")
    rm -f "$CHANGELOG_TMP"
fi

# --- migration.md placeholder ---
# We don't attempt to auto-resolve migration guides — too unconventional.
# Worker hydrates this via WebFetch.
missing+=("migration_guide")

# --- Update context_baked + context_missing on the row ---
if [[ "${#missing[@]}" -eq 0 ]]; then
    baked_json='true'
    missing_json='[]'
elif [[ "$CHANGELOG_OK" == "1" ]] || [[ -s "$CTX_DIR/usages.txt" ]]; then
    baked_json='"partial"'
    missing_json=$(printf '%s\n' "${missing[@]}" | jq -R . | jq -s .)
else
    baked_json='false'
    missing_json=$(printf '%s\n' "${missing[@]}" | jq -R . | jq -s .)
fi

jq \
    --arg p "$PACKAGE" \
    --argjson baked "$baked_json" \
    --argjson missing "$missing_json" \
    '.packages |= map(
        if .package == $p then
            .context_baked = $baked | .context_missing = $missing
        else . end
    )' "$PKGS_FILE" > "$PKGS_FILE.tmp" && mv "$PKGS_FILE.tmp" "$PKGS_FILE"

echo "Baked context for $PACKAGE in $REPO ($CTX_DIR)" >&2
