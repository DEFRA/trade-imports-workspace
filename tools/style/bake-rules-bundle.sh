#!/bin/bash
# Concatenate the style-relevant best-practices files for one (repo, topic)
# into a single bundle, so per-file reviewers Read once instead of N times per
# parallel reviewer.
#
# Usage: bake-rules-bundle.sh EUDPA-XXXXX REPO TOPIC
#
# TOPIC is one of the topics emitted by file-topics.sh: node java gds playwright
# k6. The per-topic source list is read from
# .claude/skills/code-style/assets/routing.json (`topics.<TOPIC>.bestPractice`),
# the single place that maps a topic to its best-practices files.
#
# Writes to:
#   ~/git/defra/trade-imports-workspace/workareas/code-style-reviews/EUDPA-XXXXX/style-rules.{repo}.{topic}.md
#
# Per-repo (even though today's content is identical across repos) leaves room
# for per-repo divergence without changing the reviewer's prompt shape.

set -e

TICKET="${1:-}"
REPO="${2:-}"
TOPIC="${3:-}"

if [[ -z "$TICKET" ]] || [[ -z "$REPO" ]] || [[ -z "$TOPIC" ]]; then
    echo "Usage: $0 EUDPA-XXXXX REPO TOPIC" >&2
    exit 1
fi

ROOT="$HOME/git/defra/trade-imports-workspace"
STYLE_DIR="$ROOT/workareas/code-style-reviews/$TICKET"
out="$STYLE_DIR/style-rules.${REPO}.${TOPIC}.md"

mkdir -p "$STYLE_DIR"

ROUTING="$ROOT/.claude/skills/code-style/assets/routing.json"
if [[ ! -f "$ROUTING" ]]; then
    echo "Can't read routing data: $ROUTING" >&2
    exit 1
fi

# The per-topic source list is data (.claude/skills/code-style/assets/routing.json,
# topics.<TOPIC>.bestPractice), read here with jq. node is a HARD
# no-regression invariant: exactly the three files that key names, in order.
if ! jq -e --arg topic "$TOPIC" '.topics | has($topic)' "$ROUTING" >/dev/null; then
    hint=$(jq -r '.unknownTopicHint // empty' "$ROUTING")
    if [[ -z "$hint" ]]; then
        echo "$ROUTING is missing unknownTopicHint" >&2
        exit 1
    fi
    echo "Unknown topic: $TOPIC (expected $hint)" >&2
    exit 1
fi

sources=()
while IFS= read -r src; do
    sources+=("$src")
done < <(jq -r --arg topic "$TOPIC" '.topics[$topic].bestPractice[]' "$ROUTING")

{
    echo "# Style rules bundle for $REPO ($TOPIC)"
    echo
    echo "Concatenated from \`docs/best-practices/\` at prepare-style time."
    echo "All STYLE_FILE_REVIEWER workers reviewing a $TOPIC file for this"
    echo "ticket read this single bundle instead of the underlying files."
    for src in "${sources[@]}"; do
        path="$ROOT/$src"
        echo
        echo "---"
        echo
        if [[ -f "$path" ]]; then
            echo "## Source: \`$src\`"
            echo
            cat "$path"
        else
            echo "## Source: \`$src\` (missing)"
        fi
    done
} > "$out"

echo "$out"
