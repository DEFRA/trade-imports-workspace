#!/bin/bash
# Checks that the review agents, their instruction files and routing.json
# agree.
#
# Usage: bash tools/review/review-agents.test.sh
#
# For every review type with an agent: the agent's definition exists under
# .claude/agents/, names itself, has only the Bash, Read and Write tools
# and a model, and the type's instruction files exist with _core.md first.
# Exits 0 when every check passes, 1 otherwise.

set -u

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
ROUTING="$WORKSPACE/.claude/skills/review/assets/routing.json"
AGENTS_DIR="$WORKSPACE/.claude/agents"
TYPES_DIR="$WORKSPACE/.claude/skills/review/references/types"

failures=0

check() {
    local what="$1" got="$2" want="$3"
    if [[ "$got" == "$want" ]]; then
        echo "  ok    $what"
    else
        echo "  FAIL  $what: wanted '$want', got '$got'"
        failures=$((failures + 1))
    fi
}

frontmatter() {
    sed -n '2,/^---$/p' "$1" | grep -E "^$2:" | sed -E "s/^$2: *//"
}

check_agent() {
    local agent="$1" file="$AGENTS_DIR/$1.md"
    check "$agent: definition exists" "$([[ -f "$file" ]] && echo yes || echo no)" "yes"
    [[ -f "$file" ]] || return
    check "$agent: names itself" "$(frontmatter "$file" name)" "$agent"
    check "$agent: has only Bash, Read and Write" "$(frontmatter "$file" tools)" "Bash, Read, Write"
    check "$agent: sets a model" \
        "$(frontmatter "$file" model | grep -cE '^(sonnet|haiku|opus)$')" "1"
}

echo "review agents"

while IFS= read -r type; do
    agent=$(jq -r --arg type "$type" '.reviewTypes[$type].agent' "$ROUTING")
    check_agent "$agent"
    check "$type: core instructions come first" \
        "$(jq -r --arg type "$type" '.reviewTypes[$type].instructions[0]' "$ROUTING")" "_core.md"
    while IFS= read -r instructions; do
        check "$type: $instructions exists" \
            "$([[ -f "$TYPES_DIR/$instructions" ]] && echo yes || echo no)" "yes"
    done < <(jq -r --arg type "$type" '.reviewTypes[$type].instructions[]' "$ROUTING")
done < <(jq -r '.reviewTypes | to_entries[] | select(.value.agent != null) | .key' "$ROUTING")

check_agent "review-consistency"

if [[ $failures -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "all checks passed"
