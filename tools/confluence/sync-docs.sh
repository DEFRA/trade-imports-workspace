#!/bin/bash
#
# sync-docs.sh
#
# Syncs a Confluence folder tree to local Markdown files.
# Re-runnable — overwrites existing files on each run.
#
# Default root: https://eaflood.atlassian.net/wiki/spaces/EUDP/folder/6447269328
#
# Usage: ./sync-docs.sh [--dry-run] [--root-id ID]
#
# Environment variables required:
#   JIRA_USER      - Atlassian account email
#   JIRA_TOKEN     - Atlassian API token
#   JIRA_BASE_URL  - e.g. https://eaflood.atlassian.net
#

set -euo pipefail

# ── Constants ──────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_FOLDER_ID="6447269328"
OUTPUT_DIR="$HOME/git/defra/trade-imports-workspace/docs/confluence"
INDEX_FILE="$OUTPUT_DIR/_index.md"
BASE_URL="${JIRA_BASE_URL:?JIRA_BASE_URL is not set}/wiki"
DRY_RUN=false
TOTAL_PAGES=0
PAGE_ID=""

# ── Argument parsing ───────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --root-id)
      ROOT_FOLDER_ID="${2:?--root-id requires a value}"
      shift 2
      ;;
    --page-id)
      PAGE_ID="${2:?--page-id requires a value}"
      shift 2
      ;;
    -h|--help)
      echo "Usage: ./sync-docs.sh [--dry-run] [--root-id ID] [--page-id ID]"
      echo ""
      echo "Options:"
      echo "  --dry-run       Print what would be synced without writing files"
      echo "  --root-id ID    Confluence folder/page ID to use as root (default: 6447269328)"
      echo "  --page-id ID    Refresh just this one page, in place, and stop."
      echo "                  Much faster than a full tree walk when you are"
      echo "                  iterating on a single page. The page must already"
      echo "                  have been synced once so its path is known."
      exit 0
      ;;
    *)
      echo "Error: Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# ── Validation ─────────────────────────────────────────────────────────────────

validate_env() {
  local missing=false
  [[ -z "${JIRA_USER:-}" ]]     && echo "Error: JIRA_USER not set"     >&2 && missing=true
  [[ -z "${JIRA_TOKEN:-}" ]]    && echo "Error: JIRA_TOKEN not set"    >&2 && missing=true
  [[ -z "${JIRA_BASE_URL:-}" ]] && echo "Error: JIRA_BASE_URL not set" >&2 && missing=true
  [[ "$missing" == "true" ]] && exit 1

  if ! command -v node &>/dev/null; then
    echo "Error: node is required but not found in PATH" >&2
    exit 1
  fi
  if ! command -v jq &>/dev/null; then
    echo "Error: jq is required but not found in PATH" >&2
    exit 1
  fi
}

# ── API helpers ────────────────────────────────────────────────────────────────

confluence_get() {
  local path="$1"
  curl -s -u "${JIRA_USER}:${JIRA_TOKEN}" \
    -H "Accept: application/json" \
    "${BASE_URL}/${path}"
}

check_api_error() {
  local response="$1"
  local context="$2"
  if echo "$response" | jq -e '.statusCode' > /dev/null 2>&1; then
    local msg
    msg=$(echo "$response" | jq -r '.message // "Unknown API error"')
    echo "Error [$context]: $msg" >&2
    exit 1
  fi
}

# ── Slug generation ────────────────────────────────────────────────────────────

title_to_slug() {
  local title="$1"
  echo "$title" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/&/ and /g' \
    | sed 's/[^a-z0-9]/-/g' \
    | sed 's/--*/-/g' \
    | sed 's/^-//; s/-$//'
}

# ── HTML → Markdown ────────────────────────────────────────────────────────────

html_to_md() {
  local html="$1"
  echo "$html" | node "$SCRIPT_DIR/html_to_md.js"
}

# ── Pagination helper: fetch all results from a paginated /child/* endpoint ────
# Returns a JSON array.

get_paginated_children() {
  local endpoint="$1"  # full path after BASE_URL, e.g. rest/api/content/123/child/page
  local all_results="[]"
  local start=0
  local limit=50

  while true; do
    local response page_results page_count

    response=$(confluence_get "${endpoint}?limit=${limit}&start=${start}")
    check_api_error "$response" "fetch $endpoint"
    page_results=$(echo "$response" | jq '.results // []')

    page_count=$(echo "$page_results" | jq 'length')
    all_results=$(printf '%s\n%s' "$all_results" "$page_results" | jq -s 'add')

    [[ "$page_count" -lt "$limit" ]] && break
    start=$((start + page_count))
    sleep 0.05
  done

  echo "$all_results"
}

# ── Get all direct children (pages + folders) of a page or folder ─────────────
# Returns a JSON array with objects that include a "type" field ("page"|"folder").

get_children() {
  local parent_id="$1"
  local pages folders

  pages=$(get_paginated_children "rest/api/content/${parent_id}/child/page")
  folders=$(get_paginated_children "rest/api/content/${parent_id}/child/folder")

  # Merge pages and folders into one sorted array (pages first, then folders)
  printf '%s\n%s' "$pages" "$folders" | jq -s 'add | map(select(. != null))'
}

# ── Fetch full page content ────────────────────────────────────────────────────

fetch_page_content() {
  local page_id="$1"
  local response
  response=$(confluence_get "rest/api/content/${page_id}?expand=body.export_view,version,space")
  check_api_error "$response" "fetch page $page_id"
  echo "$response"
}

# ── Write a page to disk ───────────────────────────────────────────────────────

write_page_file() {
  local page_json="$1"
  local output_path="$2"

  local page_id title version space_key updated page_url body_html body_md

  page_id=$(echo "$page_json"  | jq -r '.id')
  title=$(echo "$page_json"    | jq -r '.title')
  version=$(echo "$page_json"  | jq -r '.version.number')
  space_key=$(echo "$page_json"| jq -r '.space.key')
  updated=$(echo "$page_json"  | jq -r '.version.when')
  body_html=$(echo "$page_json"| jq -r '.body.export_view.value // ""')
  page_url="${JIRA_BASE_URL}/wiki/spaces/${space_key}/pages/${page_id}"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [dry-run] would write: ${output_path#$OUTPUT_DIR/}"
    return
  fi

  mkdir -p "$(dirname "$output_path")"

  body_md=$(html_to_md "$body_html")

  {
    printf -- '---\n'
    printf 'confluence-page-id: "%s"\n' "$page_id"
    printf 'title: "%s"\n'              "${title//\"/\\\"}"
    printf 'version: %s\n'             "$version"
    printf 'space: %s\n'               "$space_key"
    printf 'last-updated: "%s"\n'      "$updated"
    printf 'url: "%s"\n'               "$page_url"
    printf -- '---\n\n'
    printf '# %s\n\n' "$title"
    printf '%s\n' "$body_md"
  } > "$output_path"

  TOTAL_PAGES=$((TOTAL_PAGES + 1))
}

# ── Index management ───────────────────────────────────────────────────────────

init_index() {
  [[ "$DRY_RUN" == "true" ]] && return
  mkdir -p "$OUTPUT_DIR"
  {
    printf '# Confluence Docs\n\n'
    printf '> Synced from [EUDP Confluence](%s/wiki/spaces/EUDP/folder/%s) on %s\n\n' \
      "$JIRA_BASE_URL" "$ROOT_FOLDER_ID" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  } > "$INDEX_FILE"
}

append_index_entry() {
  local title="$1"
  local rel_path="$2"
  local depth="$3"
  [[ "$DRY_RUN" == "true" ]] && return
  local indent
  indent=$(printf '%*s' $((depth * 2)) '')
  printf '%s- [%s](%s)\n' "$indent" "$title" "$rel_path" >> "$INDEX_FILE"
}

# ── Recursive sync ─────────────────────────────────────────────────────────────
# Handles both "page" and "folder" Confluence content types.
#
# node_type: "root-folder" | "folder" | "page"
#   root-folder — root entry point: no content, children land directly in output_dir
#   folder      — sub-folder: no content, creates a directory, recurses into it
#   page        — regular page: fetches + writes content, may have children

sync_node() {
  local node_id="$1"
  local node_type="$2"   # root-folder | folder | page
  local output_dir="$3"
  local depth="$4"

  local indent
  indent=$(printf '%*s' $((depth * 2)) '')

  if [[ "$node_type" == "root-folder" || "$node_type" == "folder" ]]; then
    local label title slug node_dir children child_count

    if [[ "$node_type" == "root-folder" ]]; then
      label="[root-folder]"
      node_dir="$output_dir"
    else
      # Fetch folder title for directory name
      local folder_json
      folder_json=$(confluence_get "rest/api/content/${node_id}")
      check_api_error "$folder_json" "fetch folder $node_id"
      title=$(echo "$folder_json" | jq -r '.title')
      slug=$(title_to_slug "$title")
      node_dir="$output_dir/$slug"
      label="[folder] $title"
      [[ "$DRY_RUN" != "true" ]] && mkdir -p "$node_dir"
    fi

    echo "${indent}${label}"
    children=$(get_children "$node_id")
    child_count=$(echo "$children" | jq 'length')

    local i
    for i in $(seq 0 $((child_count - 1))); do
      local child_id child_type
      child_id=$(echo "$children" | jq -r ".[$i].id")
      child_type=$(echo "$children" | jq -r ".[$i].type")
      sleep 0.05
      sync_node "$child_id" "$child_type" "$node_dir" $((depth + 1))
    done
    return
  fi

  # ── Page node ────────────────────────────────────────────────────────────────

  local page_json title slug
  page_json=$(fetch_page_content "$node_id")
  title=$(echo "$page_json" | jq -r '.title')
  slug=$(title_to_slug "$title")

  # Check for child pages AND child folders
  local children child_count
  children=$(get_children "$node_id")
  child_count=$(echo "$children" | jq 'length')

  if [[ "$child_count" -eq 0 ]]; then
    # Leaf page → {slug}.md
    local output_path="$output_dir/${slug}.md"
    local rel_path="${output_path#$OUTPUT_DIR/}"
    echo "${indent}[page] $title"
    write_page_file "$page_json" "$output_path"
    append_index_entry "$title" "$rel_path" "$((depth - 1))"
  else
    # Parent page → {slug}/index.md, recurse for children
    local page_dir="$output_dir/$slug"
    local output_path="$page_dir/index.md"
    local rel_path="${output_path#$OUTPUT_DIR/}"
    echo "${indent}[section] $title (${child_count} children)"
    write_page_file "$page_json" "$output_path"
    append_index_entry "$title" "$rel_path" "$((depth - 1))"

    local i
    for i in $(seq 0 $((child_count - 1))); do
      local child_id child_type
      child_id=$(echo "$children" | jq -r ".[$i].id")
      child_type=$(echo "$children" | jq -r ".[$i].type")
      sleep 0.05
      sync_node "$child_id" "$child_type" "$page_dir" $((depth + 1))
    done
  fi
}

# ── Single-page refresh ────────────────────────────────────────────────────────
# Rewrites one already-synced page in place. Finding the existing file by its
# frontmatter page id means we inherit whatever nesting the full sync gave it,
# without having to resolve the folder ancestry ourselves.

sync_single_page() {
  local page_id="$1"
  local existing page_json title version

  existing=$(grep -rl --include='*.md' "^confluence-page-id: \"${page_id}\"$" "$OUTPUT_DIR" 2>/dev/null | head -1)

  if [[ -z "$existing" ]]; then
    echo "Error: no synced file found for page $page_id under $OUTPUT_DIR" >&2
    echo "Run a full sync first so its path is known: $0" >&2
    exit 1
  fi

  page_json=$(fetch_page_content "$page_id")
  title=$(echo "$page_json"   | jq -r '.title')
  version=$(echo "$page_json" | jq -r '.version.number')

  write_page_file "$page_json" "$existing"

  if [[ "$DRY_RUN" != "true" ]]; then
    echo "Synced '$title' (version $version) → ${existing#"$OUTPUT_DIR"/}"
  fi
}

# ── Main ───────────────────────────────────────────────────────────────────────

main() {
  validate_env

  if [[ -n "$PAGE_ID" ]]; then
    sync_single_page "$PAGE_ID"
    return
  fi

  echo "Syncing Confluence docs..."
  echo "  Root: ${JIRA_BASE_URL}/wiki/spaces/EUDP/folder/${ROOT_FOLDER_ID}"
  echo "  Output: $OUTPUT_DIR"
  [[ "$DRY_RUN" == "true" ]] && echo "  Mode: DRY RUN (no files written)"
  echo ""

  init_index
  sync_node "$ROOT_FOLDER_ID" "root-folder" "$OUTPUT_DIR" 0

  echo ""
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "Dry run complete."
  else
    echo "Done. $TOTAL_PAGES pages synced to $OUTPUT_DIR"
    echo "Index: $INDEX_FILE"
  fi
}

main "$@"
