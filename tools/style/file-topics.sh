#!/bin/bash
# file-topics.sh — map a file path to its additive best-practices topic list.
#
# PURE function of the PATH STRING plus the routing data below: no other
# filesystem access, deterministic, so it is trivially testable. Both
# discovery (prepare-style.sh) and the rules baker (bake-rules-bundle.sh) —
# via prepare-style.sh — call it as the single source of truth for the
# file-type -> topic mapping WITHIN the pipeline.
#
# The mapping itself lives in
# .claude/skills/code-style/assets/routing.json (`fileTopics`), read below
# with jq. This mirrors the same extension/path mapping that EUDPA-275
# hand-aligned into .claude/rules/. The two copies are intentionally
# separate: the .claude/rules/ path-scoped injection and this pipeline
# router are different mechanisms and do not share files.
#
# Usage:   file-topics.sh <path>
# Output:  zero or more topic names, one per line, in canonical order:
#            java  node  gds  playwright  k6
#          Prints nothing (exit 0) when the path maps to no topic.
#
# ADDITIVE: a single path can map to multiple topics.
#   - A Playwright spec (which may be .ts) additively gets `node` too, because
#     specs are JS/TS source and the node style rules apply.
#   - A k6 script named *.k6.js additively gets `node` too (it is JavaScript).

set -uo pipefail

path="${1:-}"
if [[ -z "$path" ]]; then
    echo "Usage: $0 <path>" >&2
    exit 1
fi

ROUTING="$HOME/git/defra/trade-imports-workspace/.claude/skills/code-style/assets/routing.json"
if [[ ! -f "$ROUTING" ]]; then
    echo "Can't read routing data: $ROUTING" >&2
    exit 1
fi
if ! jq -e '.fileTopics and .topics' "$ROUTING" >/dev/null 2>&1; then
    echo "$ROUTING is not valid routing data" >&2
    exit 1
fi

# Bash 3.2 (macOS /bin/bash) has no associative arrays, so matched topics are
# collected in a space-padded string, then filtered against the routing
# file's own topic order.
matched=""
while IFS=$'\t' read -r pattern topic; do
    if [[ "$path" == $pattern ]]; then
        matched="$matched $topic"
    fi
done < <(jq -r '.fileTopics[] | .patterns[] as $p | .topics[] as $t | [$p, $t] | @tsv' "$ROUTING")

jq -r --arg matched " $matched " '
  .topics
  | keys_unsorted[] as $topic
  | select(($matched | index(" " + $topic + " ")) != null)
  | $topic
' "$ROUTING"
