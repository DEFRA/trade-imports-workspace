#!/bin/bash
# Work out where a comparison should pick up.
#
# Usage:
#   start-comparison.sh                 # what comparisons exist, and what is half-built
#   start-comparison.sh <run-id>        # where this one stands
#
# Emits MODE: COMPARE, then one JSON line.
#
# The parent branches on `resume_at`. Every phase after the first is an agent
# pass costing real money and real wall-clock, so a run that stopped after the
# captures has to pick up at the pairing rather than photographing everything
# again. What this cannot do is tell you a phase was done *badly*; it reports
# what was recorded, and `tim parity slices`, `yield`, `duplicates` and `heads`
# are what report the quality of it.

set -e

WS="$HOME/git/defra/trade-imports-workspace"
CORPORA="$WS/tools/parity/corpora.json"
SETUPS_DIR="$WS/workareas/parity-setup"
PHASE="$WS/tools/parity/phase.sh"

mkdir -p "$SETUPS_DIR"

[[ -f "$CORPORA" ]] || { echo "Can't find $CORPORA." >&2; exit 1; }

RUN_ID="${1:-}"

# No run id: say what already exists rather than guessing which the person
# meant. A comparison resolved to the wrong corpus reports on somebody else's
# evidence as though it were yours.
if [[ -z "$RUN_ID" ]]; then
    known=$(jq -c '[.corpora | to_entries[] | {corpus: .key, run_id: .value.runId, description: .value.description}]' "$CORPORA")
    setups="[]"
    if compgen -G "$SETUPS_DIR/*/setup.json" > /dev/null; then
        setups=$(jq -sc '[.[] | {run_id: .run_id, corpus: .answers.corpus, scaffolded: (.scaffolded_at != null)}]' "$SETUPS_DIR"/*/setup.json)
    fi
    echo "MODE: COMPARE"
    jq -nc --argjson known "$known" --argjson setups "$setups" \
        '{run_id: null, resume_at: "choose", known: $known, setups: $setups}'
    exit 0
fi

case "$RUN_ID" in
    EUDPA-*) ;;
    *)
        echo "Run id must start EUDPA- : $RUN_ID" >&2
        echo "tools/parity/next-decision.sh and rule-decision.sh match EUDPA-* as a glob, so anything else breaks them silently later." >&2
        exit 1 ;;
esac

corpus=$(jq -r --arg run "$RUN_ID" '(.corpora | to_entries[] | select(.value.runId == $run) | .key) // ""' "$CORPORA")
setup="$SETUPS_DIR/$RUN_ID/setup.json"

if [[ -n "$corpus" ]]; then
    exists=true
    workarea=$(jq -r --arg c "$corpus" '.corpora[$c].workarea' "$CORPORA")
else
    exists=false
    workarea=""
    corpus=$([[ -f "$setup" ]] && jq -r '.answers.corpus // ""' "$setup" || echo "")
fi

# The ledger is the record of which agent passes have run. Where there is none
# and no corpus either, this is a comparison nobody has started.
resume_at=$("$PHASE" "$RUN_ID" status | sed -n 's/^Next: \([a-z]*\) .*/\1/p')
[[ -z "$resume_at" ]] && resume_at="done"
if [[ "$exists" == "false" ]]; then
    resume_at="setup"
fi

ledger="$SETUPS_DIR/$RUN_ID/pipeline.json"

echo "MODE: COMPARE"
jq -nc \
    --arg run "$RUN_ID" \
    --arg corpus "$corpus" \
    --argjson exists "$exists" \
    --arg workarea "$workarea" \
    --arg setup "$setup" \
    --arg ledger "$ledger" \
    --arg resume "$resume_at" \
    '{
        run_id: $run,
        corpus: (if $corpus == "" then null else $corpus end),
        corpus_exists: $exists,
        workarea: (if $workarea == "" then null else $workarea end),
        setup_path: $setup,
        ledger_path: $ledger,
        resume_at: $resume
    }'
