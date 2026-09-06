#!/bin/bash
# Write one increment's plan — the fields increment-build-loop.js and the
# batch orchestrator read — into backlog.json, validated, through a temp
# file. A planner never hand-edits the backlog: this is the only way the
# planned fields get in, and backlog-generate.sh preserves them by content
# key on every regeneration.
#
# The plan is a JSON object in a file. Its keys:
#   sizeGuess          S | M | L. Required — the orchestrator withholds any
#                      increment whose sizeGuess is null, so this is what
#                      makes an increment buildable
#   filesToTouch       [{path, action, what}], at least one. path is
#                      repo-relative; action is create | edit | delete;
#                      what is one line
#   acceptanceCriteria [string], at least one
#   verification       [string], at least one — the ladder in order, as the
#                      exact Bash commands the loop's verifier runs
#   openQuestions      [string]; may be empty
#   kind               fix | chore | docs | refactor | test | feature. Names
#                      the branch prefix the loop cuts (fix/, chore/, feat/).
#                      Defaults from the increment's type
#   implementorSkill   the skill that implements it. Required for add-page
#                      and add-collection
#   recipe             what the implementor reads first — recipe docs and the
#                      exemplar to mirror. Optional
#   notes              free text the implementor inherits. Optional
#   title              required for a page increment. An extra's title is the
#                      spec's: leave it out, or repeat it exactly, and change
#                      it with backlog-set-extra.sh
#   repo               frontend | backend | tests | both — derived by the
#                      generator. Leave it out, or repeat it exactly
#
# A done increment cannot be re-planned; a failed or blocked one can.
#
# Usage:
#   backlog-plan-increment.sh EUDPA-X --increment inc-004 --plan <plan.json>

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; INC=""; PLAN=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --increment) INC="$2"; shift 2 ;;
        --plan) PLAN="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID INC PLAN; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done
[[ -f "$PLAN" ]] || { echo "Error: plan file $PLAN not found" >&2; exit 1; }
jq empty "$PLAN" 2>/dev/null || { echo "Error: $PLAN is not valid JSON" >&2; exit 1; }

target="$WORKSPACE/workareas/journey-builder/$RUN_ID/backlog.json"
[[ -f "$target" ]] || { echo "Error: $target not found — run backlog-generate.sh first" >&2; exit 1; }

current=$(jq --arg id "$INC" '[.increments[] | select(.id == $id)] | first // empty' "$target")
[[ -n "$current" ]] || { echo "Error: increment '$INC' not found" >&2; exit 1; }

problems=$(jq -r --argjson inc "$current" '
    def is_string_list: type == "array" and all(.[]; type == "string" and length > 0);
    def kind_for($type):
        { "fix": "fix", "chore": "chore", "restore": "test", "e2e": "test",
          "add-page": "feature", "add-collection": "feature", "add-nested-collection": "feature",
          "model-extension": "feature", "remove-car-section": "chore", "repoint-test-fixtures": "test" }[$type] // "feature";
    if type != "object" then "the plan must be a JSON object"
    else
        ( (keys - ["title","repo","kind","sizeGuess","filesToTouch","acceptanceCriteria","verification","openQuestions","implementorSkill","recipe","notes"])
          | select(length > 0) | "unknown keys: " + join(", ") ),
        ( if $inc.status == "done" then "\($inc.id) is done — a landed increment is not re-planned" else empty end ),
        ( if (.sizeGuess | IN("S","M","L") | not) then "sizeGuess must be S, M or L" else empty end ),
        ( if (.filesToTouch | type) != "array" or (.filesToTouch | length) == 0
          then "filesToTouch must be a non-empty array"
          else ( .filesToTouch[]
                 | select((type != "object") or (.path | type) != "string" or (.path | length) == 0
                          or (.action | IN("create","edit","delete") | not) or ((.what // "") | type) != "string")
                 | "filesToTouch entry \(tojson) needs a repo-relative path, an action of create, edit or delete, and a one-line what" )
          end ),
        ( if (.acceptanceCriteria | is_string_list | not) or (.acceptanceCriteria | length) == 0
          then "acceptanceCriteria must be a non-empty array of strings" else empty end ),
        ( if (.verification | is_string_list | not) or (.verification | length) == 0
          then "verification must be a non-empty array of commands" else empty end ),
        ( if has("openQuestions") and (.openQuestions | is_string_list | not) and .openQuestions != []
          then "openQuestions must be an array of strings" else empty end ),
        ( if has("kind") and (.kind | IN("fix","chore","docs","refactor","test","feature") | not)
          then "kind must be fix, chore, docs, refactor, test or feature" else empty end ),
        ( if (["add-page","add-collection"] | index($inc.type)) != null and ((.implementorSkill // "") | length) == 0
          then "implementorSkill is required for a \($inc.type) increment" else empty end ),
        ( if has("implementorSkill") and ((.implementorSkill | type) != "string" or (.implementorSkill | length) == 0)
          then "implementorSkill must be a non-empty string" else empty end ),
        ( if has("recipe") and ((.recipe | type) != "string" or (.recipe | length) == 0)
          then "recipe must be a non-empty string" else empty end ),
        ( if has("notes") and ((.notes | type) != "string")
          then "notes must be a string" else empty end ),
        ( if has("repo") and .repo != $inc.repo
          then "repo is derived by the generator (\($inc.repo | tojson) here) — leave it out, or change the extra with backlog-set-extra.sh" else empty end ),
        ( if ($inc.key != null) and has("title") and .title != $inc.title
          then "an extra'"'"'s title is the spec'"'"'s (\($inc.title | tojson)) — leave it out, or change it with backlog-set-extra.sh" else empty end ),
        ( if ($inc.key == null) and (((.title // $inc.title // "") | length) == 0)
          then "title is required for a page increment" else empty end ),
        ( if has("title") and ((.title | type) != "string" or (.title | length) == 0 or (.title | length) > 100)
          then "title must be a non-empty string of at most 100 characters" else empty end )
    end' "$PLAN")
if [[ -n "$problems" ]]; then
    echo "Error: plan for $INC is invalid:" >&2
    sed 's/^/  /' <<<"$problems" >&2
    exit 1
fi

# Each call writes through its own temp file so concurrent planners cannot
# rename over each other. Same directory keeps the mv an atomic rename; the
# trap clears the temp if jq fails.
tmp="$(mktemp "$target.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
jq --arg id "$INC" --slurpfile plan "$PLAN" '
    def kind_for($type):
        { "fix": "fix", "chore": "chore", "restore": "test", "e2e": "test",
          "add-page": "feature", "add-collection": "feature", "add-nested-collection": "feature",
          "model-extension": "feature", "remove-car-section": "chore", "repoint-test-fixtures": "test" }[$type] // "feature";
    $plan[0] as $p
    | .increments |= map(
        if .id == $id then
            . + {
                title: ($p.title // .title),
                kind: ($p.kind // .kind // kind_for(.type)),
                sizeGuess: $p.sizeGuess,
                filesToTouch: ($p.filesToTouch | map({ path, action, what: (.what // "") })),
                acceptanceCriteria: $p.acceptanceCriteria,
                verification: $p.verification,
                openQuestions: ($p.openQuestions // []),
                implementorSkill: ($p.implementorSkill // .implementorSkill // null),
                recipe: ($p.recipe // .recipe // null),
                notes: ($p.notes // .notes // null)
            }
        else . end
    )' "$target" > "$tmp"
jq empty "$tmp"
mv "$tmp" "$target"

jq -r --arg id "$INC" '.increments[] | select(.id == $id)
    | "\(.id) planned: \(.title) — sizeGuess \(.sizeGuess), \(.filesToTouch | length) files, \(.acceptanceCriteria | length) criteria, \(.verification | length) rungs, \(.openQuestions | length) open questions"' "$target"
