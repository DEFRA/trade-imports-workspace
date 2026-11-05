#!/bin/bash
# Behaviour test for token-usage.sh.
#
# Usage: bash tools/review/token-usage.test.sh
#
# Builds throwaway transcripts (a main session, a forked skill and a
# reviewer subagent whose one response spans two lines) and checks that each
# response is counted once, labels come from the meta files, and the totals
# and peak are right. Exits 0 when every check passes, 1 otherwise.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/token-usage.sh"

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

root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT

session="s-1"
project="$root/proj"
subs="$project/$session/subagents"
mkdir -p "$subs"

response() {
    local id="$1" model="$2" input="$3" write="$4" read="$5" output="$6"
    printf '{"type":"assistant","message":{"id":"%s","model":"%s","usage":{"input_tokens":%s,"cache_creation_input_tokens":%s,"cache_read_input_tokens":%s,"output_tokens":%s}}}\n' \
        "$id" "$model" "$input" "$write" "$read" "$output"
}

{
    echo '{"type":"user","message":{"content":"review EUDPA-1"}}'
    response m1 claude-opus-5-5 10 100 0 5
    response x1 '<synthetic>' 999 999 999 999
} > "$project/$session.jsonl"

response f1 claude-opus-5-5 1 200 300 20 > "$subs/agent-fork.jsonl"
echo '{"skill":"review"}' > "$subs/agent-fork.forked-skill.json"
echo '{"description":"Review Foo.java"}' > "$subs/agent-fork.meta.json"

{
    response r1 claude-sonnet-5-5 2 1000 0 7
    response r1 claude-sonnet-5-5 2 1000 0 40
    response r2 claude-sonnet-5-5 3 50 1000 60
} > "$subs/agent-rev.jsonl"
echo '{"description":"Review Foo.java"}' > "$subs/agent-rev.meta.json"

echo "token-usage.sh"
json=$(bash "$TOOL" "$session" --json --projects-root "$root")

check "three agents" "$(jq '.totals.agents' <<< "$json")" "3"
check "split response counted once" "$(jq '.agents[] | select(.agent == "Review Foo.java") | .calls' <<< "$json")" "2"
check "split response keeps its last output figure" \
    "$(jq '.agents[] | select(.agent == "Review Foo.java") | .output' <<< "$json")" "100"
check "synthetic messages ignored" "$(jq '.agents[] | select(.agent == "main session") | .calls' <<< "$json")" "1"
check "forked skill labelled" "$(jq -r '[.agents[].agent] | index("skill (forked context)") != null' <<< "$json")" "true"
check "total input" "$(jq '.totals.input' <<< "$json")" "16"
check "total cache read" "$(jq '.totals.cache_read' <<< "$json")" "1300"
check "peak is the largest single call" "$(jq '.totals.peak' <<< "$json")" "1053"
check "grand total" "$(jq '.totals.total' <<< "$json")" "2791"

text=$(bash "$TOOL" "$session" --by-agent --projects-root "$root")
check "text names the reviewer" "$(grep -c 'Review Foo.java' <<< "$text")" "1"
check "text formats thousands" "$(grep -c '^Total:        2,791$' <<< "$text")" "1"

bash "$TOOL" missing --projects-root "$root" > /dev/null 2>&1
check "unknown session fails" "$?" "1"

if [[ $failures -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "all checks passed"
