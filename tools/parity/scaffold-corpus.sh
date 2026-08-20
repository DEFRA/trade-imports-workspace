#!/bin/bash
# Turn a finished interview into a corpus: the entry, the workarea, the contract.
#
# Usage:
#   scaffold-corpus.sh --run-id <EUDPA-X> [--dry-run]
#
# Reads workareas/parity-setup/<run>/setup.json and writes:
#
#   tools/parity/corpora.json        a new entry under .corpora.<corpus>
#   <workarea>/specs/<side>/         where each side's capture specs live
#   <workarea>/findings/             one file per finding, later
#   <workarea>/FINDING-CONTRACT.md   seeded, with six sections marked to write
#   <workarea>/specs/package.json    so the specs are CommonJS
#
# Everything derivable is derived. The interview asks only for what cannot be:
# where each checkout is, which port it serves on, how to start it, which side
# is the requirements side, and whether that side is signed off.

set -e

WS="$HOME/git/defra/trade-imports-workspace"
CORPORA="$WS/tools/parity/corpora.json"
TEMPLATE="$WS/tools/parity/templates/FINDING-CONTRACT.template.md"

RUN_ID=""
DRY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --dry-run) DRY=true; shift ;;
        -h|--help) sed -n '2,20p' "$0" >&2; exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$RUN_ID" ]] && { echo "Missing --run-id" >&2; exit 1; }

SETUP="$WS/workareas/parity-setup/$RUN_ID/setup.json"
[[ -f "$SETUP" ]] || { echo "No interview at $SETUP. Run the interview first." >&2; exit 1; }

a() { jq -r "$1" "$SETUP"; }
aj() { jq -c "$1" "$SETUP"; }

CORPUS=$(a '.answers.corpus // ""')
DESCRIPTION=$(a '.answers.description // ""')
WORKAREA=$(a '.answers.workarea // ""')
SIGNED_OFF=$(a '.answers.signedOff')

for pair in "corpus:$CORPUS" "description:$DESCRIPTION" "workarea:$WORKAREA"; do
    if [[ -z "${pair#*:}" ]]; then
        echo "The interview has no answer for ${pair%%:*}." >&2
        exit 1
    fi
done
[[ "$SIGNED_OFF" == "null" ]] && { echo "The interview has no answer for signedOff. It decides the band taxonomy, and the taxonomy is what a hundred findings get sorted by." >&2; exit 1; }

if jq -e --arg c "$CORPUS" '.corpora[$c]' "$CORPORA" > /dev/null 2>&1; then
    echo "corpora.json already has an entry for \"$CORPUS\". Refusing to overwrite it — a corpus entry is what every path in a comparison resolves through." >&2
    exit 1
fi

SIDE_IDS=$(jq -r '.answers.sides | keys[]' "$SETUP")
[[ -z "$SIDE_IDS" ]] && { echo "The interview names no sides." >&2; exit 1; }

REQUIREMENTS=$(jq -r '.answers.sides | to_entries[] | select(.value.role == "requirements") | .key' "$SETUP")
IMPLEMENTATION=$(jq -r '.answers.sides | to_entries[] | select(.value.role == "implementation") | .key' "$SETUP")

if [[ $(echo "$REQUIREMENTS" | grep -c .) -ne 1 ]]; then
    echo "Exactly one side must have role \"requirements\" — it is the side the others are judged against. Found: ${REQUIREMENTS:-none}" >&2
    exit 1
fi
if [[ -z "$IMPLEMENTATION" ]]; then
    echo "No side has role \"implementation\"." >&2
    exit 1
fi

# The workspace stack owns these. tim uses whatever is already listening on a
# side's baseURL rather than starting a second copy, so a capture on one of
# these photographs the container instead of the run you started — and says
# nothing about having done so. On the DR1 run this cost a port move; here it
# costs one refusal at setup.
STACK_PORTS="3000 3001 3007 3100 3200"
for side in $SIDE_IDS; do
    url=$(jq -r --arg s "$side" '.answers.sides[$s].app.baseURL // ""' "$SETUP")
    [[ -z "$url" ]] && { echo "Side \"$side\" has no app.baseURL." >&2; exit 1; }
    port="${url##*:}"
    port="${port%%/*}"
    for owned in $STACK_PORTS; do
        if [[ "$port" == "$owned" ]]; then
            echo "Side \"$side\" is on port $port, which the workspace stack owns." >&2
            echo "tim photographs whatever is already listening rather than starting a second copy, so with the stack up this captures the container and says nothing about having done so. Pick a port the stack does not own." >&2
            exit 1
        fi
    done
done

RUN_DIR="workareas/journey-builder/$RUN_ID"

# Bands. Which taxonomy a comparison gets is decided by one thing: whether the
# requirements side is settled. A design still in flux needs a band meaning "we
# might not want this"; a signed-off one must not have one, because that
# question is closed and a band for it invites a negotiation nobody called.
REQ_LABEL=$(jq -r --arg s "$REQUIREMENTS" '.answers.sides[$s].label // $s' "$SETUP")
IMPL_LABEL=$(jq -r --arg s "$IMPLEMENTATION" '.answers.sides[$s].label // $s' "$SETUP")

CUSTOM_BANDS=$(aj '.answers.bands')
if [[ "$CUSTOM_BANDS" != "null" ]]; then
    BANDS="$CUSTOM_BANDS"
elif [[ "$SIGNED_OFF" == "true" ]]; then
    BANDS=$(jq -nc --arg impl "$IMPLEMENTATION" --arg req "$REQ_LABEL" --arg il "$IMPL_LABEL" '[
        {id: ($impl + "-work"), label: ($il + " work"),
         blurb: ($req + " is signed off, so a difference here is a fault in " + $il + " and the fix is in " + $il + ". Nothing has to happen first. Most findings belong in this band.")},
        {id: "needs-backend", label: "Needs backend",
         blurb: ($il + " cannot match " + $req + " until an API, contract or persistence change lands. The work is accepted; only the order is fixed.")},
        {id: "disputed", label: "Disputed",
         blurb: ("The finding may be wrong, or " + $req + " contradicts itself here. This is not about whether we want the design — " + $req + " is signed off, so that is settled.")}
    ]')
else
    BANDS=$(jq -nc --arg impl "$IMPLEMENTATION" --arg req "$REQ_LABEL" '[
        {id: ($impl + "-only"), label: "Buildable now",
         blurb: "No dependency on a ruling or on the backend. These can be scheduled today."},
        {id: "needs-design-decision", label: "Needs a decision",
         blurb: ("Blocked on a ruling, not on code. " + $req + " is still in flux, so a finding here has to earn its place. This is the section the report exists for.")},
        {id: "needs-backend", label: "Needs backend",
         blurb: "Blocked on an API or persistence change before the work can start."}
    ]')
fi

# The sides, with every derived path derived rather than asked for.
SIDES=$(jq -c --arg wa "$WORKAREA" --arg run "$RUN_ID" '
    [.answers.sides | to_entries[] | .key as $id | .value |
     {
        id: $id,
        label: (.label // $id),
        role: .role,
        column: (.column // (if .role == "requirements" then "right" else "left" end)),
        repo: (.repo // $id),
        paragraphLabels: (.paragraphLabels // [(.label // $id)]),
        screenPrefix: (.screenPrefix // ($id[0:2] + "-")),
        captureDir: ($wa + "/capture/" + $id),
        modelDir: ($wa + "/capture/model/" + $id),
        htmlDir: ($wa + "/capture/html/" + $id),
        evidenceRoot: ($wa + "/evidence"),
        screensDir: null,
        app: .app,
        captureCommand: ("tim parity capture " + $run + " --side " + $id),
        traceDirs: []
     }
     + (if .sourcePath then {sourcePath: .sourcePath} else {} end)
    ]' "$SETUP")

REPOS=$(aj '.answers.repos')
[[ "$REPOS" == "null" ]] && { echo "The interview names no repos. Every side needs one, and a finding on the implementation side routinely cites a third." >&2; exit 1; }

PINS=$(aj '.answers.pins // {}')
if [[ "$PINS" == "{}" ]]; then
    PINS=$(jq -c '[.answers.repos | keys[] | {key: ., value: {ref: "HEAD", why: "Photograph the latest of every side, and re-verify a finding written against older markup rather than re-pinning it."}}] | from_entries' "$SETUP")
fi

REPO_BY_SIDE=$(jq -c '[.answers.sides | to_entries[] | {key: .key, value: (.value.repo // .key)}] | from_entries' "$SETUP")
UPSTREAM=$(a '.answers.upstreamCorpus // ""')

ENTRY=$(jq -n \
    --arg description "$DESCRIPTION" \
    --arg run "$RUN_ID" \
    --arg dir "$RUN_DIR" \
    --arg wa "$WORKAREA" \
    --argjson bands "$BANDS" \
    --argjson sides "$SIDES" \
    --argjson repos "$REPOS" \
    --argjson pins "$PINS" \
    --argjson repoBySide "$REPO_BY_SIDE" \
    '{
        description: $description,
        runId: $run,
        backlog: ($dir + "/backlog.json"),
        deferred: ($dir + "/deferred.json"),
        meta: ($dir + "/.corpus-meta.json"),
        evidence: ($dir + "/evidence.json"),
        reportDir: ($dir + "/report"),
        workarea: $wa,
        pairingModule: ($wa + "/pairs.cjs"),
        enumeratorModule: ($wa + "/enumerate.cjs"),
        _verificationComment: [
            "Refuse a first ingest of any finding no verifier recorded looking at.",
            "A correction leaves a trace when it fires and the non-firing case",
            "leaves none, so without the record nothing distinguishes a verifier",
            "that found nothing from one that looked at nothing — and ingest",
            "freezes detail permanently, so the record has to exist first."
        ],
        requireVerification: true,
        bands: $bands,
        sides: $sides,
        repos: $repos,
        repoBySideDefault: $repoBySide,
        pins: $pins,
        captures: {},
        baselines: {},
        captureCitationRoots: [{prefix: "capture/", kind: "capture", side: null}]
    }')

if [[ -n "$UPSTREAM" ]]; then
    upstream_backlog=$(jq -r --arg c "$UPSTREAM" '.corpora[$c].backlog // ""' "$CORPORA")
    [[ -n "$upstream_backlog" ]] && ENTRY=$(echo "$ENTRY" | jq -c --arg u "$upstream_backlog" '. + {upstreamFindings: $u}')
fi

if [[ "$DRY" == "true" ]]; then
    echo "Would add .corpora.$CORPUS :"
    echo "$ENTRY" | jq .
    echo
    echo "Would create:"
    for side in $SIDE_IDS; do echo "  $WS/$WORKAREA/specs/$side/"; done
    echo "  $WS/$WORKAREA/findings/"
    echo "  $WS/$WORKAREA/FINDING-CONTRACT.md"
    exit 0
fi

# The workarea first, the corpus entry last. A corpus entry is what every path
# in a comparison resolves through, so one pointing at a workarea that was never
# finished is worse than no entry at all: every later command reports a missing
# file rather than a setup that stopped half way.
mkdir -p "$WS/$WORKAREA/findings" "$WS/$WORKAREA/evidence"
for side in $SIDE_IDS; do
    mkdir -p "$WS/$WORKAREA/specs/$side"
done

# Capture specs are ES modules. Node decides that from the nearest package.json
# and workareas/ has none, so without this file a spec's import statement is a
# syntax error rather than an import — and every spec opens with one, plus a
# top-level `await import(...)` for the recorder, which cannot be CommonJS at
# all.
#
# Not to be confused with enumerate.cjs and pairs.cjs, which ARE CommonJS. They
# carry the .cjs extension for exactly that reason and are unaffected by this.
#
# Deliberately not a package: no name, no version, no dependencies. A spec
# imports one thing, the recorder, by the absolute path tim puts in the capture
# context — so there is nothing here to install and nothing to resolve.
cat > "$WS/$WORKAREA/specs/package.json" <<'EOF'
{
  "_comment": [
    "Capture specs are ES modules. Node decides that from the nearest",
    "package.json, and workareas/ has none, so without this file a spec's",
    "import statement is a syntax error rather than an import.",
    "",
    "It is deliberately not a package: no name, no version, no dependencies.",
    "A spec imports exactly one thing, the recorder, and it imports it by the",
    "absolute path tim puts in the capture context — so there is nothing here",
    "to install and nothing to resolve."
  ],
  "type": "module"
}
EOF

# The contract, seeded. Six sections are marked and are wrong until somebody
# writes them for this comparison.
band_table=$(echo "$BANDS" | jq -r '["| band | what it means |", "|---|---|"] + [.[] | "| `" + .id + "` | " + .blurb + " |"] | .[]')
first_band=$(echo "$BANDS" | jq -r '.[0].id')
impl_prefix=$(echo "$SIDES" | jq -r --arg s "$IMPLEMENTATION" '.[] | select(.id == $s) | .screenPrefix')
req_prefix=$(echo "$SIDES" | jq -r --arg s "$REQUIREMENTS" '.[] | select(.id == $s) | .screenPrefix')
impl_repo=$(echo "$REPO_BY_SIDE" | jq -r --arg s "$IMPLEMENTATION" '.[$s]')
req_repo=$(echo "$REPO_BY_SIDE" | jq -r --arg s "$REQUIREMENTS" '.[$s]')
impl_checkout=$(echo "$REPOS" | jq -r --arg r "$impl_repo" '.[$r].localPath // .[$r].localPathAbsolute // "the implementation checkout"')
req_checkout=$(echo "$REPOS" | jq -r --arg r "$req_repo" '.[$r].localPath // .[$r].localPathAbsolute // "the requirements checkout"')
impl_root=$(echo "$REPOS" | jq -r --arg r "$impl_repo" '[.[$r].pathRoots[]? | select(.impliedPrefix) | .impliedPrefix] | first // "src/"' | sed 's:/$::')
req_root=$(echo "$REPOS" | jq -r --arg r "$req_repo" '[.[$r].pathRoots[]? | select(.impliedPrefix) | .impliedPrefix] | first // "app/"' | sed 's:/$::')

if [[ "$SIGNED_OFF" == "true" ]]; then
    disposition_heading="Findings are born as work"
    disposition_body="There is no ruling to wait for. $REQ_LABEL is settled. A finding is accepted work the moment it is written and verified.

The only thing that can block a finding is doubt about whether the finding is
**correct** — never doubt about whether the change is **wanted**."
else
    disposition_heading="Findings have to earn their place"
    disposition_body="$REQ_LABEL is still in flux, so a finding is a proposal rather than accepted work. Two questions are open about every one of them: is it correct, and do we want it.

The second is a person's to answer, in a walk over the report. Do not answer it
in the finding. State the difference and what it would cost, and let the ruling
be made where it is recorded."
fi

render_template() {
    # Substitution by sed, one placeholder at a time, because every value here
    # is a short single-line string chosen by the interview.
    sed \
        -e "s|{{CORPUS}}|$CORPUS|g" \
        -e "s|{{CORPUS_TITLE}}|$(echo "$CORPUS" | tr '[:lower:]' '[:upper:]')|g" \
        -e "s|{{WORKAREA}}|$WORKAREA|g" \
        -e "s|{{REQUIREMENTS_LABEL}}|$REQ_LABEL|g" \
        -e "s|{{IMPLEMENTATION_LABEL}}|$IMPL_LABEL|g" \
        -e "s|{{IMPLEMENTATION_PREFIX}}|$impl_prefix|g" \
        -e "s|{{REQUIREMENTS_PREFIX}}|$req_prefix|g" \
        -e "s|{{IMPLEMENTATION_CHECKOUT}}|$impl_checkout|g" \
        -e "s|{{REQUIREMENTS_CHECKOUT}}|$req_checkout|g" \
        -e "s|{{IMPLEMENTATION_EVIDENCE_ROOT}}|$impl_root|g" \
        -e "s|{{REQUIREMENTS_EVIDENCE_ROOT}}|$req_root|g" \
        -e "s|{{FIRST_BAND}}|$first_band|g" \
        -e "s|{{EXAMPLE_SLICE}}|documents|g" \
        -e "s|{{DISPOSITION_HEADING}}|$disposition_heading|g" \
        "$TEMPLATE"
}

contract="$WS/$WORKAREA/FINDING-CONTRACT.md"
render_template > "$contract.tmp"

# The two multi-line values are read in from files rather than passed as
# strings. A newline in a sed expression or an awk -v assignment is an error,
# and the band table is one line per band by construction.
table_file="$contract.table"
body_file="$contract.body"
printf '%s\n' "$band_table" > "$table_file"
printf '%s\n' "$disposition_body" > "$body_file"

sed \
    -e "/{{BAND_TABLE}}/r $table_file" -e "/{{BAND_TABLE}}/d" \
    -e "/{{DISPOSITION_BODY}}/r $body_file" -e "/{{DISPOSITION_BODY}}/d" \
    "$contract.tmp" > "$contract"

rm -f "$contract.tmp" "$table_file" "$body_file"

jq --arg c "$CORPUS" --argjson e "$ENTRY" '.corpora[$c] = $e' "$CORPORA" > "$CORPORA.tmp"
mv "$CORPORA.tmp" "$CORPORA"

jq --arg now "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" '.scaffolded_at = $now' "$SETUP" > "$SETUP.tmp"
mv "$SETUP.tmp" "$SETUP"

cat <<EOF
Corpus "$CORPUS" scaffolded for run $RUN_ID.

  tools/parity/corpora.json          entry added under .corpora.$CORPUS
  $WORKAREA/FINDING-CONTRACT.md      seeded — SIX SECTIONS ARE MARKED AND WRONG
  $WORKAREA/specs/<side>/            $(echo "$SIDE_IDS" | tr '\n' ' ')
  $WORKAREA/findings/                empty until the authoring pass

requireVerification is on for this corpus, so an ingest refuses any finding no
verifier recorded looking at.

Next, in order:
  1. Write the six marked sections of FINDING-CONTRACT.md. Nothing may be
     spawned until it is finished — it is what stops ten agents producing ten
     dialects of one backlog.
  2. tim parity heads $RUN_ID --write
  3. Write $WORKAREA/enumerate.cjs, one enumerator per side.
EOF
