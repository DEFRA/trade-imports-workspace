#!/bin/bash
# The phase ledger for a whole comparison, so a run that stops can be picked up.
#
# Usage:
#   phase.sh <run-id> status
#   phase.sh <run-id> start <phase>
#   phase.sh <run-id> done  <phase> --note "what was produced"
#   phase.sh <run-id> gate  <phase>
#   phase.sh <run-id> reset <phase> --note "why"
#
# A comparison is a long run made of agent passes, and an agent pass is the one
# thing in this workspace that cannot be re-derived cheaply. So which passes
# have happened is written down rather than inferred from what is on disk: half
# a slice's findings on disk look exactly like a finished slice.
#
# `gate` is the part that earns its keep. Two orderings in this pipeline are not
# style: an authoring agent spawned before the slicing is proven writes findings
# nobody owns, and an ingest run before the verification freezes the prose
# permanently over whatever was there. Both were held by reading order alone.
#
# Exit codes: 0 satisfied, 1 not satisfied or bad usage.

set -e

WS="$HOME/git/defra/trade-imports-workspace"
SETUPS_DIR="$WS/workareas/parity-setup"

# phase|needs (comma separated)|what it is
PHASES="
setup||The corpus exists: an entry in corpora.json, a workarea, and a finding contract written for this comparison
heads|setup|Where every application stood when the run began, recorded so a mid-run commit is visible rather than discovered afterwards
enumerate|setup|Each side's screens listed statically from its own source, by a per-corpus enumerate.cjs
specs|enumerate|Playwright specs that drive each side and photograph every screen they reach
capture|specs|Both sides photographed, and coverage reporting nothing missing and nothing unexplained
pair|capture|pairs.cjs: which screen answers which, with the one-sided lists beside it
carryover|pair|The previous corpus triaged, if there is one: carries, retired, changed or recheck per finding
slice|pair|The service cut into slices, proven so that every captured screen is owned by exactly one
author|slice,carryover|One authoring agent per slice, each writing findings to the contract
verify|author|A different agent per slice, asking only whether each finding is correct, and recording that it looked
dedupe|verify|The whole corpus read at once for duplicates that no per-slice verifier can see
states|verify|The states the findings were guessing at, photographed in one serial pass
ingest|verify,dedupe|backlog.json assembled. This freezes every finding's detail permanently
report|ingest|Anchors, crops, citations, evidence, meta, the rendered page, and the checks over it
"

usage() {
    sed -n '2,20p' "$0" >&2
    exit 1
}

RUN_ID="${1:-}"
ACTION="${2:-}"
PHASE="${3:-}"
NOTE=""

[[ -z "$RUN_ID" || -z "$ACTION" ]] && usage

shift 2 || true
[[ -n "$PHASE" ]] && shift || true
while [[ $# -gt 0 ]]; do
    case "$1" in
        --note) NOTE="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

case "$RUN_ID" in
    *[!A-Za-z0-9._-]*|"") echo "Invalid run id: $RUN_ID" >&2; exit 1 ;;
esac

LEDGER="$SETUPS_DIR/$RUN_ID/pipeline.json"

phase_field() { echo "$PHASES" | grep "^$1|" | cut -d'|' -f"$2"; }
phase_known() { echo "$PHASES" | grep -q "^$1|"; }
phase_list()  { echo "$PHASES" | grep -v '^$' | cut -d'|' -f1; }

ensure_ledger() {
    mkdir -p "$(dirname "$LEDGER")"
    if [[ ! -f "$LEDGER" ]]; then
        jq -n --arg run "$RUN_ID" --arg now "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
            '{run_id: $run, started_at: $now, phases: {}}' > "$LEDGER.tmp"
        mv "$LEDGER.tmp" "$LEDGER"
    fi
}

state_of() {
    [[ -f "$LEDGER" ]] || { echo "todo"; return; }
    jq -r --arg p "$1" '.phases[$p].state // "todo"' "$LEDGER"
}

set_state() {
    ensure_ledger
    jq --arg p "$1" --arg s "$2" --arg n "$3" --arg now "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        '.phases[$p] = ((.phases[$p] // {}) + {state: $s, at: $now} + (if $n == "" then {} else {note: $n} end))' \
        "$LEDGER" > "$LEDGER.tmp"
    mv "$LEDGER.tmp" "$LEDGER"
}

# Every prerequisite that is not done, as a list. A phase with no unmet
# prerequisite is safe to start; anything else names what to do first rather
# than saying no.
unmet() {
    local needs
    needs=$(phase_field "$1" 2)
    [[ -z "$needs" ]] && return 0
    local missing=""
    IFS=',' read -r -a parts <<<"$needs"
    for need in "${parts[@]}"; do
        [[ "$(state_of "$need")" == "done" ]] || missing="$missing $need"
    done
    echo "${missing# }"
}

case "$ACTION" in
    status)
        echo "Run: $RUN_ID"
        if [[ -f "$LEDGER" ]]; then
            echo "Ledger: $LEDGER"
        else
            echo "Ledger: none yet — nothing in this run has been recorded."
        fi
        echo
        next=""
        while read -r phase; do
            [[ -z "$phase" ]] && continue
            state=$(state_of "$phase")
            note=$([[ -f "$LEDGER" ]] && jq -r --arg p "$phase" '.phases[$p].note // ""' "$LEDGER" || echo "")
            printf '  %-11s %-12s %s\n' "$phase" "$state" "$note"
            if [[ -z "$next" && "$state" != "done" ]]; then
                blocked=$(unmet "$phase")
                [[ -z "$blocked" ]] && next="$phase"
            fi
        done <<<"$(phase_list)"
        echo
        if [[ -n "$next" ]]; then
            echo "Next: $next — $(phase_field "$next" 3)"
        else
            echo "Every phase is done. The report is built; nobody has read a single finding in it."
        fi
        ;;

    start|done|reset)
        [[ -z "$PHASE" ]] && usage
        phase_known "$PHASE" || { echo "Unknown phase: $PHASE" >&2; exit 1; }
        if [[ "$ACTION" == "done" ]]; then
            blocked=$(unmet "$PHASE")
            if [[ -n "$blocked" ]]; then
                echo "Cannot mark $PHASE done while these have not happened:$blocked" >&2
                exit 1
            fi
            [[ -z "$NOTE" ]] && { echo "--note is required on done. A phase recorded with no note is worth very little a week later." >&2; exit 1; }
        fi
        case "$ACTION" in
            start) set_state "$PHASE" "running" "$NOTE" ;;
            done)  set_state "$PHASE" "done" "$NOTE" ;;
            reset) set_state "$PHASE" "todo" "$NOTE" ;;
        esac
        echo "$PHASE: $([[ "$ACTION" == "reset" ]] && echo todo || echo "$ACTION")"
        ;;

    gate)
        [[ -z "$PHASE" ]] && usage
        phase_known "$PHASE" || { echo "Unknown phase: $PHASE" >&2; exit 1; }
        blocked=$(unmet "$PHASE")
        if [[ -n "$blocked" ]]; then
            echo "$PHASE is not safe to start. These have not happened:$blocked" >&2
            for need in $blocked; do
                echo "  $need — $(phase_field "$need" 3)" >&2
            done
            exit 1
        fi
        echo "$PHASE is safe to start."
        ;;

    *)
        usage
        ;;
esac
