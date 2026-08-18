#!/bin/bash
# Discover outdated npm dependencies and create upgrade workspace
# Usage: ./discover-upgrades.sh <repo-path> --run-id TICKET [options]
#
# Creates zero-byte marker files for each outdated dependency.
# Agents can then process these files in parallel to research migration paths.
#
# Options:
#   --run-id TICKET        Run ID / Jira ticket (e.g. EUDPA-20578) [required]
#   --strategy LEVEL       Upgrade strategy: latest|minor|patch (default: latest)
#   --json                 Output JSON format instead of human-readable
#   --workspace-dir DIR    Custom workspace directory (default: npm-upgrades/)
#   --force                Force re-discovery (recreate workspace)
#   --help                 Show help message

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Defaults
REPO_PATH=""
RUN_ID=""
STRATEGY="latest"
JSON_OUTPUT=false
WORKSPACE_BASE="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades"
FORCE=false

show_help() {
    cat << EOF
Discover outdated npm dependencies and create upgrade workspace

Usage: ./discover-upgrades.sh <repo-path> --run-id TICKET [options]

Positional:
  <repo-path>            Path to Node.js repository

Options:
  --run-id TICKET        Run ID / Jira ticket (e.g. EUDPA-20578) [required]
  --strategy LEVEL       Upgrade strategy: latest|minor|patch (default: latest)
  --json                 Output JSON format instead of human-readable
  --workspace-dir DIR    Custom workspace directory (default: npm-upgrades/)
  --force                Force re-discovery (recreate workspace)
  --help                 Show this help message

Examples:
  ./discover-upgrades.sh ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend --run-id EUDPA-20578
  ./discover-upgrades.sh ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend --run-id EUDPA-20578 --strategy minor
  ./discover-upgrades.sh ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend --run-id EUDPA-20578 --json

Environment:
  Requires: npm-check-updates (ncu), jq
  Install: npm install -g npm-check-updates
EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)
            show_help
            ;;
        --run-id)
            RUN_ID="$2"
            shift 2
            ;;
        --strategy)
            STRATEGY="$2"
            shift 2
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --workspace-dir)
            WORKSPACE_BASE="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
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
                echo "Use --help for usage information"
                exit 1
            fi
            shift
            ;;
    esac
done

# Helper for output
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

# Validate required arguments
if [[ -z "$RUN_ID" ]]; then
    error "--run-id TICKET is required (e.g. --run-id EUDPA-12345)"
fi

if [[ -z "$REPO_PATH" ]]; then
    error "Repository path is required. Use --help for usage information"
fi

# Warn if RUN_ID doesn't look like a Jira ticket
if [[ ! "$RUN_ID" =~ ^[A-Z]+-[0-9]+$ ]]; then
    echo "Warning: --run-id '$RUN_ID' does not match expected Jira ticket format (e.g. PROJ-123)" >&2
fi

# Validate strategy
case "$STRATEGY" in
    latest|minor|patch) ;;
    *)
        error "Invalid strategy '$STRATEGY'. Must be latest, minor, or patch"
        ;;
esac

# Check dependencies
command -v ncu >/dev/null 2>&1 || error "npm-check-updates (ncu) is required. Install: npm install -g npm-check-updates"
command -v jq >/dev/null 2>&1 || error "jq is required for JSON processing"

# Validate repository
if [[ ! -d "$REPO_PATH" ]]; then
    error "Repository path does not exist: $REPO_PATH"
fi
REPO_PATH=$(cd "$REPO_PATH" && pwd)  # Convert to absolute path

PACKAGE_JSON="$REPO_PATH/package.json"
if [[ ! -f "$PACKAGE_JSON" ]]; then
    error "No package.json found in $REPO_PATH"
fi

# Extract repository name from path
# If the directory name is generic (service, app, src), use parent directory
REPO_NAME=$(basename "$REPO_PATH")
if [[ "$REPO_NAME" == "service" ]] || [[ "$REPO_NAME" == "app" ]] || [[ "$REPO_NAME" == "src" ]]; then
    # Use parent directory name instead
    REPO_NAME=$(basename "$(dirname "$REPO_PATH")")
fi

# Determine workspace directory
WORKSPACE_DIR="$WORKSPACE_BASE/$RUN_ID/$REPO_NAME"
META_FILE="$WORKSPACE_DIR/.upgrades-meta.json"

# Check if workspace exists
if [[ -d "$WORKSPACE_DIR" ]] && [[ "$FORCE" == "false" ]]; then
    MODE="update"
    log "Updating existing workspace: $WORKSPACE_DIR"
else
    MODE="create"
    log "Creating workspace: $WORKSPACE_DIR"
    mkdir -p "$WORKSPACE_DIR"
fi

# Run ncu to discover outdated dependencies
log "Discovering outdated dependencies..."

# Run ncu and capture output (use a subshell, not `cd && cmd`).
NCU_OUTPUT=$((cd "$REPO_PATH"; ncu --jsonUpgraded --target "$STRATEGY") 2>&1) || {
    error "Failed to run npm-check-updates: $NCU_OUTPUT"
}

# Check if there are any upgrades
if [[ -z "$NCU_OUTPUT" ]] || [[ "$NCU_OUTPUT" == "{}" ]]; then
    log "No outdated dependencies found"
    NCU_OUTPUT="{}"
fi

# Initialise canonical packages.{REPO_NAME}.json from the ncu JSON.
# packages-init.sh handles upgrade_type / dependency_type / atomic
# writes and merges with any prior state so re-runs don't clobber
# PACKAGE_PLANNER classifications.
log "Writing packages.${REPO_NAME}.json..."

NCU_VERSION_STR="$(ncu --version 2>/dev/null || echo 'unknown')"

"$SCRIPT_DIR/packages-init.sh" \
    --run-id "$RUN_ID" \
    --repo "$REPO_NAME" \
    --repo-path "$REPO_PATH" \
    --strategy "$STRATEGY" \
    --ncu-version "$NCU_VERSION_STR" \
    --ncu-json "$NCU_OUTPUT" \
    >/dev/null

# Pull counts from the canonical file for the discovery report.
PACKAGES_FILE="$WORKSPACE_DIR/packages.${REPO_NAME}.json"
total_count=$(jq '.packages | length' "$PACKAGES_FILE")
major_count=$(jq '[.packages[] | select(.upgrade_type=="major")] | length' "$PACKAGES_FILE")
minor_count=$(jq '[.packages[] | select(.upgrade_type=="minor")] | length' "$PACKAGES_FILE")
patch_count=$(jq '[.packages[] | select(.upgrade_type=="patch")] | length' "$PACKAGES_FILE")
dep_count=$(jq '[.packages[] | select(.dependency_type=="dependencies")] | length' "$PACKAGES_FILE")
devdep_count=$(jq '[.packages[] | select(.dependency_type=="devDependencies")] | length' "$PACKAGES_FILE")
pending_count=$(jq '[.packages[] | select(.classification==null)] | length' "$PACKAGES_FILE")
completed_count=$(( total_count - pending_count ))
created_count=$pending_count
skipped_count=$completed_count

# Write the thin discovery header (consumers that still read this are
# being migrated to packages.{repo}.json — keep it minimal).
cat > "$META_FILE" << EOF
{
    "repo_name": "$REPO_NAME",
    "repo_path": "$REPO_PATH",
    "workspace_dir": "$WORKSPACE_DIR",
    "last_discovered": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "ncu_version": "$NCU_VERSION_STR",
    "upgrade_strategy": "$STRATEGY",
    "packages_file": "packages.${REPO_NAME}.json",
    "total_upgrades": $total_count
}
EOF

# Output summary
if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$PACKAGES_FILE"
else
    echo ""
    echo "=== NPM Upgrade Discovery Complete ==="
    echo "Repository: $REPO_NAME"
    echo "Workspace: $WORKSPACE_DIR"
    echo "State: $PACKAGES_FILE"
    echo ""
    echo "Total packages: $total_count"
    echo "  Major: $major_count"
    echo "  Minor: $minor_count"
    echo "  Patch: $patch_count"
    echo ""
    echo "Classification:"
    echo "  Pending: $pending_count"
    echo "  Already classified: $completed_count"
    echo ""
    echo "Next: spawn PACKAGE_PLANNER subagents for the $pending_count pending packages."
fi
