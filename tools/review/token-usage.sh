#!/bin/bash
# Token use of one Claude Code session and every subagent it spawned, read
# from the session's transcripts. Built to measure a review run, but works
# for any session.
#
# Usage:
#   token-usage.sh SESSION_ID [--by-agent] [--json] [--projects-root DIR]
#
#   SESSION_ID         the session's id (the transcript file name without .jsonl)
#   --by-agent         also list each agent: its description, model, calls and tokens
#   --json             print JSON instead of text
#   --projects-root    where transcripts live (default ~/.claude/projects)
#
# Reads <root>/*/SESSION_ID.jsonl and <root>/*/SESSION_ID/subagents/*.jsonl.
# One model response can span several transcript lines with the same message
# id; each response is counted once, from its last line.
#
# Figures per agent:
#   calls        model responses
#   input        uncached input tokens
#   cache_write  input tokens written to the prompt cache
#   cache_read   input tokens read from the prompt cache
#   output       output tokens
#   peak         largest context sent in one call (input + cache_write + cache_read)

set -euo pipefail

SESSION=""
BY_AGENT=false
JSON_OUTPUT=false
ROOT="$HOME/.claude/projects"

usage() {
    sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
    exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --by-agent) BY_AGENT=true; shift ;;
        --json) JSON_OUTPUT=true; shift ;;
        --projects-root) ROOT="$2"; shift 2 ;;
        -h|--help) usage 0 ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) SESSION="$1"; shift ;;
    esac
done

[[ -z "$SESSION" ]] && usage

main_file=$(find "$ROOT" -mindepth 2 -maxdepth 2 -name "$SESSION.jsonl" | head -n 1)
[[ -n "$main_file" ]] || { echo "No transcript for session $SESSION under $ROOT" >&2; exit 1; }
sub_dir="$(dirname "$main_file")/$SESSION/subagents"

# One JSON object per transcript: its label and summed usage.
summarise() {
    local file="$1" label="$2"
    jq -s --arg label "$label" '
        [ .[] | select(.type == "assistant" and .message.usage != null
                       and .message.model != "<synthetic>")
              | { id: .message.id, model: .message.model, u: .message.usage } ]
        | group_by(.id) | map(last)
        | {
            agent: $label,
            model: (map(.model) | unique | join(",")),
            calls: length,
            input: (map(.u.input_tokens // 0) | add // 0),
            cache_write: (map(.u.cache_creation_input_tokens // 0) | add // 0),
            cache_read: (map(.u.cache_read_input_tokens // 0) | add // 0),
            output: (map(.u.output_tokens // 0) | add // 0),
            peak: (map((.u.input_tokens // 0) + (.u.cache_creation_input_tokens // 0)
                       + (.u.cache_read_input_tokens // 0)) | max // 0)
          }' "$file"
}

agents=$(
    summarise "$main_file" "main session"
    if [[ -d "$sub_dir" ]]; then
        for f in "$sub_dir"/*.jsonl; do
            [[ -e "$f" ]] || continue
            meta="${f%.jsonl}.meta.json"
            label=$(basename "$f" .jsonl)
            if [[ -f "${f%.jsonl}.forked-skill.json" ]]; then
                label="skill (forked context)"
            elif [[ -f "$meta" ]]; then
                label=$(jq -r '.description // empty' "$meta")
                [[ -n "$label" ]] || label=$(basename "$f" .jsonl)
            fi
            summarise "$f" "$label"
        done
    fi
)

report=$(jq -s --arg session "$SESSION" '
    def total: .input + .cache_write + .cache_read + .output;
    {
      session: $session,
      agents: (map(. + { total: total }) | sort_by(-.total)),
      totals: {
        agents: length,
        calls: (map(.calls) | add),
        input: (map(.input) | add),
        cache_write: (map(.cache_write) | add),
        cache_read: (map(.cache_read) | add),
        output: (map(.output) | add),
        total: (map(total) | add),
        peak: (map(.peak) | max)
      }
    }' <<< "$agents")

if [[ "$JSON_OUTPUT" == true ]]; then
    echo "$report"
    exit 0
fi

jq -r --argjson by_agent "$BY_AGENT" '
    def n: tostring | until(test("^[0-9]{1,3}(,|$)"); sub("(?<a>[0-9])(?<b>[0-9]{3})(?<c>,|$)"; "\(.a),\(.b)\(.c)"));
    .totals as $t
    | "Session \(.session)",
      "Agents:       \($t.agents | n) (including the main session)",
      "Model calls:  \($t.calls | n)",
      "Input:        \($t.input | n)",
      "Cache write:  \($t.cache_write | n)",
      "Cache read:   \($t.cache_read | n)",
      "Output:       \($t.output | n)",
      "Total:        \($t.total | n)",
      "Peak context: \($t.peak | n) (largest single call)",
      ( if $by_agent then
          "",
          "total\tpeak\tcalls\tmodel\tagent",
          ( .agents[] | "\(.total | n)\t\(.peak | n)\t\(.calls)\t\(.model)\t\(.agent)" )
        else empty end )
' <<< "$report"
