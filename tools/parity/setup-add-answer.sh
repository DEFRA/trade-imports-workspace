#!/bin/bash
# Atomically write one interview answer into a comparison's setup.json.
#
# Usage:
#   setup-add-answer.sh --run-id <EUDPA-X> --field <dotted-path> --value '<json>'
#
# Examples:
#   --field corpus       --value '"dr3"'
#   --field description  --value '"The live-animals frontend against Design release 3."'
#   --field signedOff    --value 'true'
#   --field sides.frontend.app.baseURL --value '"http://localhost:3005"'
#   --field sides.frontend.app.env     --value '{"STUB_MODE":"true"}'
#
# Value is parsed as JSON — quote strings, leave booleans and objects bare.
# One answer per call, written through a temp file, so an interview that is
# interrupted resumes from what was already answered rather than from nothing.

set -e

RUN_ID=""
FIELD=""
VALUE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --field) FIELD="$2"; shift 2 ;;
        --value) VALUE="$2"; shift 2 ;;
        -h|--help) sed -n '2,18p' "$0" >&2; exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in RUN_ID FIELD VALUE; do
    [[ -z "${!v}" ]] && { echo "Missing $v" >&2; exit 1; }
done

case "$RUN_ID" in
    EUDPA-*) ;;
    *) echo "Run id must start EUDPA- : $RUN_ID" >&2; exit 1 ;;
esac

WS="$HOME/git/defra/trade-imports-workspace"
dir="$WS/workareas/parity-setup/$RUN_ID"
target="$dir/setup.json"

mkdir -p "$dir"
if [[ ! -f "$target" ]]; then
    jq -n --arg run "$RUN_ID" --arg now "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        '{run_id: $run, started_at: $now, scaffolded_at: null, answers: {}}' > "$target.tmp"
    mv "$target.tmp" "$target"
fi

IFS='.' read -r -a parts <<<"$FIELD"
path=".answers"
for p in "${parts[@]}"; do
    path="$path[\"$p\"]"
done

if ! jq -e --argjson v "$VALUE" "$path = \$v" "$target" > "$target.tmp"; then
    rm -f "$target.tmp"
    echo "jq failed — is VALUE valid JSON? VALUE=$VALUE" >&2
    exit 1
fi
mv "$target.tmp" "$target"

echo "$FIELD recorded in $target"
