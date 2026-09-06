#!/bin/bash
# Record a ruling in <spec_dir>/decisions.json AND apply it to its subject in
# the same call, so the ledger and the applied state cannot drift: a
# resolution stamped on a conflict without a ledger entry has no rationale
# on record, and a ledger entry without the stamp is a ruling nobody built.
#
# Subjects and the rulings each accepts:
#   conflict:<c-id>    resolve  — stamps resolution + resolvedBy on the
#                                 conflict (what spec-resolve-conflict.sh
#                                 does) and points its `decision` at the
#                                 new entry
#   behaviour:<id>     adopt | park | reject | keep-open — sets the
#                                 behaviour's status (adopted | parked |
#                                 rejected | open-question, as
#                                 spec-set-behaviour-status.sh would),
#                                 appends " | Ruling: <resolution>" to its
#                                 detail and points its `decision` at the
#                                 new entry
# Any other pairing is an error.
#
# A subject carries at most one current decision. To change a ruling, pass
# --supersedes <d-id>: the earlier entry flips to status "superseded" with
# supersededBy set, the new entry becomes current, and the subject is
# re-stamped. A decision may not supersede one for a different subject or one
# already superseded — the chain stays linear.
#
# --decided-at is required and never read from the clock, so a replayed
# session produces a byte-identical ledger (the same reproducibility rule
# backlog-generate.sh follows). --decided-by is panel or sam.
#
# Usage:
#   spec-add-decision.sh EUDPA-X --subject conflict:c-012 --ruling resolve \
#       --resolution "..." --rationale "..." --decided-by panel \
#       --decided-at 2026-09-06 [--dissent "..."] [--escalate] [--supersedes d-003]
#   spec-add-decision.sh EUDPA-X --subject behaviour:bulk-upload --ruling park \
#       --resolution "..." --rationale "..." --decided-by sam --decided-at 2026-09-06
# Prints the new decision id (d-NNN).

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; SUBJECT=""; RULING=""; RESOLUTION=""; RATIONALE=""; DECIDED_BY=""
DISSENT=""; ESCALATE=false; SUPERSEDES=""; DECIDED_AT=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --subject) SUBJECT="$2"; shift 2 ;;
        --ruling) RULING="$2"; shift 2 ;;
        --resolution) RESOLUTION="$2"; shift 2 ;;
        --rationale) RATIONALE="$2"; shift 2 ;;
        --decided-by) DECIDED_BY="$2"; shift 2 ;;
        --dissent) DISSENT="$2"; shift 2 ;;
        --escalate) ESCALATE=true; shift ;;
        --supersedes) SUPERSEDES="$2"; shift 2 ;;
        --decided-at) DECIDED_AT="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID SUBJECT RULING RESOLUTION RATIONALE DECIDED_BY DECIDED_AT; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done
case "$DECIDED_BY" in
    panel|sam) ;;
    *) echo "Error: --decided-by must be panel|sam" >&2; exit 1 ;;
esac
[[ "$DECIDED_AT" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "Error: --decided-at '$DECIDED_AT' must be a date (YYYY-MM-DD)" >&2; exit 1; }
[[ -z "$SUPERSEDES" || "$SUPERSEDES" =~ ^d-[0-9]{3,}$ ]] || { echo "Error: --supersedes '$SUPERSEDES' must be a decision id (d-NNN)" >&2; exit 1; }
[[ "$SUBJECT" =~ ^(conflict|behaviour):.+$ ]] || { echo "Error: --subject must be conflict:<id> or behaviour:<id>" >&2; exit 1; }
SUBJECT_KIND="${SUBJECT%%:*}"; SUBJECT_ID="${SUBJECT#*:}"

# The ruling vocabulary is per subject kind: a conflict is only ever
# resolved, a behaviour is adopted, parked, rejected or left open.
case "$SUBJECT_KIND:$RULING" in
    conflict:resolve) STATUS="" ;;
    behaviour:adopt) STATUS="adopted" ;;
    behaviour:park) STATUS="parked" ;;
    behaviour:reject) STATUS="rejected" ;;
    behaviour:keep-open) STATUS="open-question" ;;
    conflict:*) echo "Error: a conflict takes --ruling resolve, not '$RULING'" >&2; exit 1 ;;
    behaviour:*) echo "Error: a behaviour takes --ruling adopt|park|reject|keep-open, not '$RULING'" >&2; exit 1 ;;
esac

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec_dir="$(jq -r '.spec_dir // empty' "$meta")"
[[ -n "$spec_dir" && -d "$spec_dir" ]] || { echo "Error: $meta has no usable spec_dir — decisions live beside journey-spec.json" >&2; exit 1; }
ledger="$spec_dir/decisions.json"
[[ -f "$ledger" ]] || echo '{"schema_version":1,"decisions":[]}' > "$ledger"

case "$SUBJECT_KIND" in
    conflict)
        subject_file="$spec_dir/conflicts.json"
        [[ -f "$subject_file" ]] || { echo "Error: $subject_file not found" >&2; exit 1; }
        exists=$(jq --arg id "$SUBJECT_ID" '[.conflicts[] | select(.id == $id)] | length' "$subject_file")
        ;;
    behaviour)
        subject_file="$spec_dir/journey-spec.json"
        [[ -f "$subject_file" ]] || { echo "Error: $subject_file not found" >&2; exit 1; }
        exists=$(jq --arg id "$SUBJECT_ID" '[.behaviours[] | select(.id == $id)] | length' "$subject_file")
        ;;
esac
[[ "$exists" -eq 0 ]] && { echo "Error: $SUBJECT_KIND '$SUBJECT_ID' not found in $subject_file" >&2; exit 1; }

# One current decision per subject: a second ruling must name the first, or
# the ledger would hold two live answers to one question.
current=$(jq -r --arg kind "$SUBJECT_KIND" --arg id "$SUBJECT_ID" \
    '[.decisions[] | select(.status == "current" and .subject.kind == $kind and .subject.id == $id) | .id] | join(", ")' "$ledger")
if [[ -n "$SUPERSEDES" ]]; then
    prior=$(jq -c --arg id "$SUPERSEDES" 'first(.decisions[] | select(.id == $id)) // empty' "$ledger")
    [[ -n "$prior" ]] || { echo "Error: --supersedes $SUPERSEDES not found in $ledger" >&2; exit 1; }
    prior_subject=$(jq -r '"\(.subject.kind):\(.subject.id)"' <<<"$prior")
    [[ "$prior_subject" == "$SUBJECT" ]] || { echo "Error: $SUPERSEDES rules $prior_subject, not $SUBJECT — a decision may only supersede one for the same subject" >&2; exit 1; }
    prior_status=$(jq -r '.status' <<<"$prior")
    [[ "$prior_status" == "current" ]] || { echo "Error: $SUPERSEDES is already $prior_status — supersede the current decision ($current) instead" >&2; exit 1; }
elif [[ -n "$current" ]]; then
    echo "Error: $SUBJECT is already ruled by $current — pass --supersedes $current to change the ruling" >&2; exit 1
fi

next=$(jq '(.decisions | map(.id | ltrimstr("d-") | tonumber) | max // 0) + 1' "$ledger")
new_id=$(printf "d-%03d" "$next")

entry=$(jq -n \
    --arg id "$new_id" --arg kind "$SUBJECT_KIND" --arg sid "$SUBJECT_ID" --arg ruling "$RULING" \
    --arg resolution "$RESOLUTION" --arg rationale "$RATIONALE" --arg by "$DECIDED_BY" \
    --arg dissent "$DISSENT" --argjson escalate "$ESCALATE" --arg supersedes "$SUPERSEDES" --arg at "$DECIDED_AT" \
    '{
        id: $id,
        subject: {kind: $kind, id: $sid},
        ruling: $ruling,
        resolution: $resolution,
        rationale: $rationale,
        decidedBy: $by,
        dissent: (if $dissent == "" then null else $dissent end),
        escalate: $escalate,
        supersedes: (if $supersedes == "" then null else $supersedes end),
        supersededBy: null,
        decidedAt: $at,
        status: "current"
    }')

# Both files are rendered to temps before either is renamed, so a jq failure
# on the second leaves neither written. Each call has its own temps:
# concurrent callers sharing one temp name rename over each other and drop
# items. Same directory keeps each mv an atomic rename; the trap clears the
# temps if jq fails.
ledger_tmp="$(mktemp "$ledger.XXXXXX")"
subject_tmp="$(mktemp "$subject_file.XXXXXX")"
trap 'rm -f "$ledger_tmp" "$subject_tmp"' EXIT

jq --argjson entry "$entry" --arg sup "$SUPERSEDES" --arg did "$new_id" \
    '.decisions |= (map(if $sup != "" and .id == $sup then .supersededBy = $did | .status = "superseded" else . end) + [$entry])' \
    "$ledger" > "$ledger_tmp"

case "$SUBJECT_KIND" in
    conflict)
        jq --arg id "$SUBJECT_ID" --arg res "$RESOLUTION" --arg by "$DECIDED_BY" --arg did "$new_id" \
            '.conflicts |= map(if .id == $id then .resolution = $res | .resolvedBy = $by | .decision = $did else . end)' \
            "$subject_file" > "$subject_tmp"
        ;;
    behaviour)
        jq --arg id "$SUBJECT_ID" --arg status "$STATUS" --arg note "Ruling: $RESOLUTION" --arg did "$new_id" \
            '.behaviours |= map(if .id == $id then .status = $status | .detail = (.detail + " | " + $note) | .decision = $did else . end)' \
            "$subject_file" > "$subject_tmp"
        ;;
esac

mv "$ledger_tmp" "$ledger"
mv "$subject_tmp" "$subject_file"

echo "$new_id"
