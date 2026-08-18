#!/bin/bash
# Discover govuk-frontend versions between current and target, create upgrade workspace.
# Usage: ./discover-versions.sh <repo-path> --run-id TICKET [options]
#
# Seeds versions.{repo}.json with one entry per intermediate semver between
# current and target. Caches the upstream CHANGELOG.md.
#
# Options:
#   --run-id TICKET        Run ID / Jira ticket (e.g. EUDPA-20578) [required]
#   --target VERSION       Target govuk-frontend version (default: latest stable)
#   --json                 Output JSON format instead of human-readable
#   --force                Force re-run (re-fetch changelog, reseed JSON)
#   --help                 Show help message

set -e

REPO_PATH=""
RUN_ID=""
TARGET_VERSION=""
JSON_OUTPUT=false
WORKSPACE_BASE="$HOME/git/defra/trade-imports-workspace/workareas/govuk-upgrades"
FORCE=false

CHANGELOG_URL="https://raw.githubusercontent.com/alphagov/govuk-frontend/main/CHANGELOG.md"

show_help() {
    cat << EOF
Discover govuk-frontend versions and create upgrade workspace

Usage: ./discover-versions.sh <repo-path> --run-id TICKET [options]

Positional:
  <repo-path>            Path to Node.js repository

Options:
  --run-id TICKET        Run ID / Jira ticket (e.g. EUDPA-20578) [required]
  --target VERSION       Target govuk-frontend version (default: latest stable)
  --json                 Output JSON format instead of human-readable
  --force                Force re-run (re-fetch changelog, reseed JSON)
  --help                 Show this help message

Schema:
  workareas/govuk-upgrades/{run-id}/{repo}/versions.{repo}.json
  See .claude/skills/govuk-upgrade/assets/version-state-schema.md.

Environment:
  Requires: jq, curl, npm
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help) show_help ;;
        --run-id) RUN_ID="$2"; shift 2 ;;
        --target) TARGET_VERSION="$2"; shift 2 ;;
        --json) JSON_OUTPUT=true; shift ;;
        --force) FORCE=true; shift ;;
        -*)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
        *)
            if [[ -z "$REPO_PATH" ]]; then
                REPO_PATH="$1"
            else
                echo "Error: Too many positional arguments"
                exit 1
            fi
            shift
            ;;
    esac
done

log() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo "$1"
    fi
}

error() {
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        echo "{\"error\": \"$1\"}"
    else
        echo "Error: $1" >&2
    fi
    exit 1
}

[[ -z "$RUN_ID" ]] && error "--run-id TICKET is required (e.g. --run-id EUDPA-12345)"
[[ -z "$REPO_PATH" ]] && error "Repository path is required. Use --help for usage information"

if [[ ! "$RUN_ID" =~ ^[A-Z]+-[0-9]+$ ]]; then
    echo "Warning: --run-id '$RUN_ID' does not match expected Jira ticket format (e.g. PROJ-123)" >&2
fi

command -v jq >/dev/null 2>&1 || error "jq is required for JSON processing"
command -v curl >/dev/null 2>&1 || error "curl is required"
command -v npm >/dev/null 2>&1 || error "npm is required"

[[ ! -d "$REPO_PATH" ]] && error "Repository path does not exist: $REPO_PATH"
REPO_PATH=$(cd "$REPO_PATH" && pwd)

PACKAGE_JSON="$REPO_PATH/package.json"
[[ ! -f "$PACKAGE_JSON" ]] && error "No package.json found in $REPO_PATH"

REPO_NAME=$(basename "$REPO_PATH")

# Read raw constraint, split prefix and bare version.
CURRENT_RAW=$(jq -r '.dependencies["govuk-frontend"] // .devDependencies["govuk-frontend"] // empty' "$PACKAGE_JSON")
[[ -z "$CURRENT_RAW" ]] && error "govuk-frontend not found in dependencies or devDependencies in $PACKAGE_JSON"

# Split prefix (leading non-digits) from bare version.
ORIGINAL_PREFIX=$(printf '%s' "$CURRENT_RAW" | sed -n 's/^\([^0-9]*\).*/\1/p')
CURRENT=$(printf '%s' "$CURRENT_RAW" | sed 's/^[^0-9]*//')

semver_gt() {
    local a b a1 a2 a3 b1 b2 b3
    a=$(printf '%s' "$1" | sed 's/^[^0-9]*//')
    b=$(printf '%s' "$2" | sed 's/^[^0-9]*//')
    IFS='.' read -r a1 a2 a3 <<< "$a"
    IFS='.' read -r b1 b2 b3 <<< "$b"
    a3="${a3:-0}"; b3="${b3:-0}"
    [[ "$a1" -gt "$b1" ]] && return 0
    [[ "$a1" -lt "$b1" ]] && return 1
    [[ "$a2" -gt "$b2" ]] && return 0
    [[ "$a2" -lt "$b2" ]] && return 1
    [[ "$a3" -gt "$b3" ]] && return 0
    return 1
}

log "Current govuk-frontend version: $CURRENT (constraint: ${CURRENT_RAW})"

if [[ -z "$TARGET_VERSION" ]]; then
    log "Fetching latest govuk-frontend version from npm..."
    TARGET_VERSION=$(npm view govuk-frontend dist-tags.latest 2>/dev/null) || error "Failed to fetch latest version from npm"
fi
TARGET=$(printf '%s' "$TARGET_VERSION" | sed 's/^[^0-9]*//')

log "Target govuk-frontend version: $TARGET"

WORKSPACE_DIR="$WORKSPACE_BASE/$RUN_ID/$REPO_NAME"
mkdir -p "$WORKSPACE_DIR"
STATE_FILE="$WORKSPACE_DIR/versions.${REPO_NAME}.json"
CHANGELOG_FILE="$WORKSPACE_DIR/CHANGELOG.md"

if ! semver_gt "$TARGET" "$CURRENT"; then
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        echo "{\"status\": \"up-to-date\", \"current\": \"$CURRENT\", \"target\": \"$TARGET\", \"versions\": []}"
    else
        echo "Already up to date: govuk-frontend $CURRENT (target: $TARGET)"
    fi
    exit 0
fi

log "Fetching version list from npm..."
ALL_VERSIONS_JSON=$(npm view govuk-frontend versions --json 2>/dev/null) || error "Failed to fetch version list from npm"

VERSIONS_TO_PROCESS=()
while IFS= read -r version; do
    [[ -z "$version" ]] && continue
    [[ "$version" == *"-"* ]] && continue
    semver_gt "$version" "$CURRENT" || continue
    semver_gt "$version" "$TARGET" && continue
    VERSIONS_TO_PROCESS+=("$version")
done < <(echo "$ALL_VERSIONS_JSON" | jq -r '.[]')

IFS=$'\n' sorted_versions=($(printf '%s\n' "${VERSIONS_TO_PROCESS[@]}" | sort -V))
unset IFS

VERSION_COUNT="${#sorted_versions[@]}"

if [[ "$VERSION_COUNT" -eq 0 ]]; then
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        echo "{\"status\": \"no-versions\", \"current\": \"$CURRENT\", \"target\": \"$TARGET\", \"versions\": []}"
    else
        echo "No stable versions found between $CURRENT and $TARGET"
    fi
    exit 0
fi

log "Found $VERSION_COUNT versions to process"

# Cache CHANGELOG.md. Refresh automatically if the cached file doesn't
# contain the target version's section (i.e. we're targeting a release
# newer than the cache).
needs_changelog_refresh=false
if [[ ! -f "$CHANGELOG_FILE" ]] || [[ "$FORCE" == "true" ]]; then
    needs_changelog_refresh=true
elif ! grep -q "^## v${TARGET}\([[:space:](]\|\$\)" "$CHANGELOG_FILE"; then
    log "Cached CHANGELOG.md is missing v${TARGET} — refreshing"
    needs_changelog_refresh=true
fi

if [[ "$needs_changelog_refresh" == "true" ]]; then
    log "Fetching CHANGELOG.md from GitHub..."
    curl -sf "$CHANGELOG_URL" -o "$CHANGELOG_FILE" || error "Failed to fetch CHANGELOG.md from $CHANGELOG_URL"
    log "Cached: $CHANGELOG_FILE"
else
    log "Using cached CHANGELOG.md"
fi

# Prune per-version artifacts whose version is no longer in the
# (current, target] window. This catches re-runs with a lower --target
# (or with intermediate versions yanked from npm).
keep_list=" ${sorted_versions[*]} "
while IFS= read -r stale; do
    bare=$(basename "$stale" .changelog.md | sed 's/^version__//')
    if [[ "$keep_list" != *" $bare "* ]]; then
        rm -f "$stale"
        log "  Pruned stale changelog cache: version__${bare}.changelog.md"
    fi
done < <(find "$WORKSPACE_DIR" -maxdepth 1 -name 'version__*.changelog.md')

# Pre-bake per-version CHANGELOG sections so VERSION_PLANNER can Read
# one file per spawn.
for version in "${sorted_versions[@]}"; do
    out="$WORKSPACE_DIR/version__${version}.changelog.md"
    if [[ -f "$out" && "$FORCE" != "true" ]]; then
        continue
    fi
    section=$(awk "
        /^## v${version}([[:space:](]|\$)/ { found=1; next }
        found && /^## v/ { exit }
        found { print }
    " "$CHANGELOG_FILE")
    if [[ -z "$section" ]]; then
        log "  WARN: no CHANGELOG section found for v${version}"
        continue
    fi
    {
        echo "## govuk-frontend v${version} — Changelog"
        echo
        echo "$section"
    } > "$out.tmp" && mv "$out.tmp" "$out"
done

# Pre-bake the per-repo best-practices bundle. Concatenates the
# docs/best-practices/ files listed in SKILL.md "load when the
# changelog warrants" so VERSION_PLANNER can Read one file.
BP_OUT="$WORKSPACE_DIR/best-practices.md"
if [[ ! -f "$BP_OUT" || "$FORCE" == "true" ]]; then
    BP_SOURCES=(
        "docs/best-practices/node/govuk-frontend.md"
        "docs/best-practices/gds/components.md"
        "docs/best-practices/gds/patterns.md"
        "docs/best-practices/gds/accessibility.md"
        "docs/best-practices/gds/styles.md"
    )
    {
        echo "# Best practices applicable to ${REPO_NAME} (govuk-frontend upgrade)"
        echo
        echo "Concatenated at Phase 1. Apply these standards when planning changes."
        for path in "${BP_SOURCES[@]}"; do
            src="$HOME/git/defra/trade-imports-workspace/$path"
            echo
            echo "---"
            echo
            echo "## Source: \`$path\`"
            echo
            if [[ -f "$src" ]]; then
                cat "$src"
            else
                echo "_(missing — file not found at \`$src\`)_"
            fi
        done
    } > "$BP_OUT.tmp" && mv "$BP_OUT.tmp" "$BP_OUT"
    log "Cached: $BP_OUT"
fi

# Build versions JSON, preserving any per-version state already present
# in the existing file (classification, implementation_status, etc.).
now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sorted_versions_json=$(printf '%s\n' "${sorted_versions[@]}" | jq -R . | jq -s .)

if [[ -f "$STATE_FILE" && "$FORCE" != "true" ]]; then
    prior_versions=$(jq '.versions' "$STATE_FILE")
    created_at=$(jq -r '.created_at // empty' "$STATE_FILE")
    [[ -z "$created_at" ]] && created_at="$now"
else
    prior_versions='[]'
    created_at="$now"
fi

new_versions=$(jq -n \
    --argjson sorted "$sorted_versions_json" \
    --argjson prior "$prior_versions" \
    '[
        $sorted[] as $v
        | ($prior | map(select(.version == $v)) | .[0]) as $existing
        | if $existing != null then
            $existing
          else
            {
                version: $v,
                classification: null,
                classified_at: null,
                implementation_status: null,
                implemented_at: null,
                commit_sha: null,
                failure_reason: null,
                changelog_path: ("version__" + $v + ".changelog.md"),
                summary: null,
                changes: []
            }
          end
    ]')

jq -n \
    --arg ticket "$RUN_ID" \
    --arg repo "$REPO_NAME" \
    --arg current "$CURRENT" \
    --arg target "$TARGET" \
    --arg prefix "$ORIGINAL_PREFIX" \
    --arg created_at "$created_at" \
    --arg last_discovered_at "$now" \
    --argjson versions "$new_versions" \
    '{
        ticket: $ticket,
        repo: $repo,
        package: "govuk-frontend",
        current_version: $current,
        target_version: $target,
        original_constraint_prefix: $prefix,
        created_at: $created_at,
        last_discovered_at: $last_discovered_at,
        versions: $versions
    }' > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$STATE_FILE"
else
    echo ""
    echo "=== govuk-frontend Version Discovery Complete ==="
    echo "Repository:  $REPO_NAME"
    echo "Upgrade:     $CURRENT → $TARGET  (constraint prefix: '${ORIGINAL_PREFIX}')"
    echo "Versions:    $VERSION_COUNT intermediate versions"
    echo "State:       $STATE_FILE"
    echo ""
    echo "Versions:"
    for v in "${sorted_versions[@]}"; do
        echo "  $v"
    done
    echo ""
    echo "Next: Phase 2 spawns VERSION_PLANNER workers per pending version"
fi
