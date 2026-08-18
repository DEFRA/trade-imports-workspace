#!/bin/bash
# Append a finding to analysis.<repo>.json. Evidence (file + lines) is
# mandatory; fields per section come via repeated --field name=value.
#
# Usage:
#   analysis-add-finding.sh EUDPA-XXXXX \
#       --repo R \
#       --section <keyDesignDecisions|edgeCases|failureModes|securityRisks|dataOrApiChanges|testCoverageNotes|aiSuspectedRegions> \
#       --evidence-file FILE \
#       --evidence-lines LINES \
#       --field KEY=VALUE [--field KEY=VALUE ...]
#
# Prints the new finding's id.

set -e

TICKET=""; REPO=""; SECTION=""; EV_FILE=""; EV_LINES=""
FIELD_KEYS=()
FIELD_VALS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --repo) REPO="$2"; shift 2 ;;
        --section) SECTION="$2"; shift 2 ;;
        --evidence-file) EV_FILE="$2"; shift 2 ;;
        --evidence-lines) EV_LINES="$2"; shift 2 ;;
        --field)
            key="${2%%=*}"
            val="${2#*=}"
            if [[ "$key" == "$2" ]]; then
                echo "Error: --field expects KEY=VALUE, got '$2'" >&2
                exit 1
            fi
            FIELD_KEYS+=("$key")
            FIELD_VALS+=("$val")
            shift 2
            ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in TICKET REPO SECTION EV_FILE EV_LINES; do
    [[ -z "${!v}" ]] && { echo "Error: missing required arg $v" >&2; exit 1; }
done

case "$SECTION" in
    keyDesignDecisions|edgeCases|failureModes|securityRisks|dataOrApiChanges|testCoverageNotes|aiSuspectedRegions) ;;
    *) echo "Error: invalid --section '$SECTION'" >&2; exit 1 ;;
esac

if [[ ${#FIELD_KEYS[@]} -eq 0 ]]; then
    echo "Error: at least one --field KEY=VALUE is required" >&2
    exit 1
fi

target="$HOME/git/defra/trade-imports-workspace/workareas/understanding-checks/$TICKET/analysis.$REPO.json"
[[ -f "$target" ]] || { echo "Error: $target not found — run prepare-check.sh first" >&2; exit 1; }

# Build the fields object from KEY=VALUE pairs.
fields_json="{}"
for i in "${!FIELD_KEYS[@]}"; do
    k="${FIELD_KEYS[$i]}"
    v="${FIELD_VALS[$i]}"
    fields_json=$(jq -n --argjson cur "$fields_json" --arg k "$k" --arg v "$v" '$cur + {($k): $v}')
done

next_id=$(jq --arg s "$SECTION" '(.[$s] | map(.id) | max // 0) + 1' "$target")

jq \
    --arg s "$SECTION" \
    --argjson id "$next_id" \
    --arg evfile "$EV_FILE" \
    --arg evlines "$EV_LINES" \
    --argjson fields "$fields_json" \
    '.[$s] += [
        ({ id: $id } + $fields + { evidence: { file: $evfile, lines: $evlines } })
    ]' \
    "$target" > "$target.tmp"
mv "$target.tmp" "$target"

echo "$next_id"
