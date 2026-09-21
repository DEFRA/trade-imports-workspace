#!/bin/bash
# Detect technologies used in a repository
# Usage: ./detect-tech.sh <repo-path>
#
# Outputs JSON with detected technologies and relevant best practices paths
# Example: {"technologies":["springboot","k6"],"best_practices":["docs/best-practices/k6/BEST_PRACTICES.md"]}

set -e

REPO_PATH="${1:-}"

if [[ -z "$REPO_PATH" ]] || [[ ! -d "$REPO_PATH" ]]; then
    echo '{"technologies":[],"best_practices":[]}'
    exit 0
fi

technologies=()
best_practices=()

ROUTING="$HOME/git/defra/trade-imports-workspace/.claude/skills/review/assets/routing.json"
if [[ ! -f "$ROUTING" ]]; then
    echo "Can't read routing data: $ROUTING" >&2
    exit 1
fi
if ! jq -e '.technologies and .manifestDirs' "$ROUTING" >/dev/null 2>&1; then
    echo "$ROUTING is not valid routing data" >&2
    exit 1
fi

# Helper to check if file contains pattern (checks root and each manifestDirs
# folder, read from the routing data)
file_contains() {
    local file="$1"
    local pattern="$2"

    # Check root
    [[ -f "$REPO_PATH/$file" ]] && grep -qE "$pattern" "$REPO_PATH/$file" 2>/dev/null && return 0

    # Check each manifest subdirectory
    while IFS= read -r subdir; do
        [[ -f "$REPO_PATH/$subdir/$file" ]] && grep -qE "$pattern" "$REPO_PATH/$subdir/$file" 2>/dev/null && return 0
    done < <(jq -r '.manifestDirs[]' "$ROUTING")

    return 1
}

# Helper to check if file exists at root or a manifest subdirectory
file_exists() {
    local file="$1"
    [[ -f "$REPO_PATH/$file" ]] && return 0
    while IFS= read -r subdir; do
        [[ -f "$REPO_PATH/$subdir/$file" ]] && return 0
    done < <(jq -r '.manifestDirs[]' "$ROUTING")
    return 1
}

# Helper to check if any file matches glob and contains pattern
any_file_contains() {
    local glob="$1"
    local pattern="$2"
    grep -rqE --include="$glob" "$pattern" "$REPO_PATH" 2>/dev/null
}

# Recursively evaluate one condition object (fileContains / fileExists /
# anyFileContains / dirExists / anyOf / allOf), read from the routing data.
eval_condition() {
    local cond="$1"
    # Fixed priority order, matching the JS reader
    # (tim/src/backlog/standards/review-routing.js's evalCondition) — a
    # condition object is meant to carry one key, but if it ever carried
    # more than one, both readers must pick the same one.
    if jq -e 'has("fileContains")' <<<"$cond" >/dev/null; then
        file_contains "$(jq -r '.fileContains.file' <<<"$cond")" "$(jq -r '.fileContains.pattern' <<<"$cond")"
    elif jq -e 'has("fileExists")' <<<"$cond" >/dev/null; then
        file_exists "$(jq -r '.fileExists' <<<"$cond")"
    elif jq -e 'has("anyFileContains")' <<<"$cond" >/dev/null; then
        any_file_contains "$(jq -r '.anyFileContains.glob' <<<"$cond")" "$(jq -r '.anyFileContains.pattern' <<<"$cond")"
    elif jq -e 'has("dirExists")' <<<"$cond" >/dev/null; then
        [[ -d "$REPO_PATH/$(jq -r '.dirExists' <<<"$cond")" ]]
    elif jq -e 'has("anyOf")' <<<"$cond" >/dev/null; then
        local sub
        while IFS= read -r sub; do
            eval_condition "$sub" && return 0
        done < <(jq -c '.anyOf[]' <<<"$cond")
        return 1
    elif jq -e 'has("allOf")' <<<"$cond" >/dev/null; then
        local sub
        while IFS= read -r sub; do
            eval_condition "$sub" || return 1
        done < <(jq -c '.allOf[]' <<<"$cond")
        return 0
    else
        return 1
    fi
}

# ============================================
# Run detections (technologies[], in routing-data order)
# ============================================

while IFS= read -r tech; do
    name=$(jq -r '.name' <<<"$tech")
    requires=$(jq -r '.requires // empty' <<<"$tech")
    if [[ -n "$requires" ]]; then
        already=false
        for detected in "${technologies[@]}"; do
            [[ "$detected" == "$requires" ]] && already=true
        done
        [[ "$already" == true ]] || continue
    fi
    if eval_condition "$(jq -c '.when' <<<"$tech")"; then
        technologies+=("$name")
        while IFS= read -r bp; do
            best_practices+=("$bp")
        done < <(jq -r '.bestPractice[]' <<<"$tech")
    fi
done < <(jq -c '.technologies[]' "$ROUTING")

# ============================================
# Output JSON
# ============================================

# Build JSON arrays
tech_json=$(printf '%s\n' "${technologies[@]}" | jq -R . | jq -s .)
bp_json=$(printf '%s\n' "${best_practices[@]}" | jq -R . | jq -s .)

# Handle empty arrays
[[ ${#technologies[@]} -eq 0 ]] && tech_json="[]"
[[ ${#best_practices[@]} -eq 0 ]] && bp_json="[]"

echo "{\"technologies\":$tech_json,\"best_practices\":$bp_json}"
