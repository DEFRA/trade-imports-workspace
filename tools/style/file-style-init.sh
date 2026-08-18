#!/bin/bash
# Initialise a per-file style review JSON placeholder.
# Usage: file-style-init.sh EUDPA-X --repo R --file F --commit SHA --pr N --mode M
# Idempotent: overwrites any existing file at the placeholder path.
# Prints the absolute path of the created file.

set -e

TICKET=""; REPO=""; FILE=""; COMMIT=""; PR=""; MODE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --repo) REPO="$2"; shift 2 ;;
        --file) FILE="$2"; shift 2 ;;
        --commit) COMMIT="$2"; shift 2 ;;
        --pr) PR="$2"; shift 2 ;;
        --mode) MODE="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in TICKET REPO FILE COMMIT PR MODE; do
    [[ -z "${!v}" ]] && { echo "Missing $v" >&2; exit 1; }
done

case "$MODE" in
    FRESH|REFRESH|MERGE_RESOLVED) ;;
    *) echo "Invalid mode: $MODE (must be FRESH|REFRESH|MERGE_RESOLVED)" >&2; exit 1 ;;
esac

encoded="${FILE//\//_}"
out="$HOME/git/defra/trade-imports-workspace/workareas/code-style-reviews/$TICKET/file-reviews/$REPO/$encoded.style.json"

mkdir -p "$(dirname "$out")"

jq -n \
    --arg file "$FILE" \
    --arg repo "$REPO" \
    --arg commit "$COMMIT" \
    --argjson pr "$PR" \
    --arg mode "$MODE" \
    '{
        file: $file,
        repo: $repo,
        commit: $commit,
        pr: $pr,
        mode: $mode,
        reviewed_at: null,
        verdict: null,
        verdict_reason: null,
        todos: []
    }' > "$out.tmp" && mv "$out.tmp" "$out"

echo "$out"
