#!/bin/bash
# Derive backlog.json (typed, ordered increments) from journey-spec.json.
#
# Ordering (M0-gate ruling 2026-07-07: model-extension gates go LAST so M1
# churns unattended; a top-level collection lands without its nested
# unit-level identifiers):
#   1. one increment per spec page in section order, EXCEPT pages any of
#      whose directly-collected obligations (or their non-collection item
#      fields) carry modelGap — those are deferred to step 4. A collection
#      page whose gaps come only from NESTED collection members is included
#      here with deferredNested listing what to leave out.
#   2. remove-car-section per baseline car section (vendored obligations-v2
#      domain — see the target scope's PROVENANCE.md)
#   3. repoint-test-fixtures at the target domain
#   4. model-extension increments (gate: sam, born blocked), then the
#      deferred gap pages and one add-nested-collection per deferredNested
#   — all in one linear dependsOn chain (increments edit shared files).
#
# Milestones: origin page = M0; steps 1-3 = M1; step 4 = M2.
# Idempotent: status/commit preserved by CONTENT key (type + subject),
# not position — re-ordering must not resurrect or orphan statuses.
#
# Usage:
#   backlog-generate.sh EUDPA-X [--json]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; AS_JSON=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --json) AS_JSON=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-X [--json]" >&2; exit 1; }

WORKAREA="$WORKSPACE/workareas/journey-builder/$RUN_ID"
meta="$WORKAREA/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found" >&2; exit 1; }
spec="$(jq -r '.spec_dir' "$meta")/journey-spec.json"
target="$WORKAREA/backlog.json"

# Section ids in the vendored flow/flow.js belonging to the car domain.
CAR_SECTIONS='["email","about-you-and-your-vehicle","your-driving-and-cover","add-to-your-policy","named-driver","modifications","protected-ncd","get-your-quote"]'

existing='{"increments":[]}'
[[ -f "$target" ]] && existing=$(cat "$target")

jq -n \
    --slurpfile s "$spec" \
    --argjson carSections "$CAR_SECTIONS" \
    --argjson existing "$existing" \
    --arg run_id "$RUN_ID" \
    '
    $s[0] as $spec
    | ($spec.obligations | map({key: .id, value: .}) | from_entries) as $byId
    | def obs($ids): [ $ids[] | $byId[.] | select(. != null) ];
    def directGaps($ids):
        [ obs($ids)[]
          | .modelGap // empty,
            ( (.item // [])[] | $byId[.] | select(. != null and .kind != "collection") | .modelGap // empty )
        ] | unique;
    def nestedGapCollections($ids):
        [ obs($ids)[] | (.item // [])[] | $byId[.]
          | select(. != null and .kind == "collection")
          | select(
              (.modelGap != null)
              or ([ (.item // [])[] | $byId[.] | select(. != null) | .modelGap ] | any(. != null)) )
          | .id
        ] | unique;
    def allGaps($ids):
        [ obs($ids)[]
          | .modelGap // empty,
            ( (.item // [])[] | $byId[.] | select(. != null)
              | .modelGap // empty,
                ( (.item // [])[] | $byId[.] | select(. != null) | .modelGap // empty ) )
        ] | unique;

    # A section containing a collection page folds its empty-collects sibling
    # pages into that increment as entryPages (they are the collection entry
    # sub-pages — e.g. the select / details / identification pages under the
    # parent collection); they are not independent increments.
    [ $spec.sections[] as $sec
      | ([ $sec.pages[] | select([ obs(.collects)[] | select(.kind == "collection") ] | length > 0) ]) as $collPages
      | ([ $sec.pages[] | select(.collects == []) | {id, slug, title} ]) as $emptyPages
      | $sec.pages[]
      | . as $pg
      | if ($collPages | length) > 0 and ([ obs($pg.collects)[] | select(.kind == "collection") ] | length) > 0
          then {section: $sec.id, page: $pg, entryPages: $emptyPages}
        elif ($collPages | length) > 0 and ($pg.collects == [])
          then empty
        else {section: $sec.id, page: $pg, entryPages: []} end
    ] as $pages
    | [ $pages[]
        | . as $p
        | (directGaps($p.page.collects)) as $direct
        | (nestedGapCollections($p.page.collects)) as $nested
        | { type: (if (obs($p.page.collects) | any(.kind == "collection")) then "add-collection" else "add-page" end),
            section: $p.section, page: $p.page.id, slug: $p.page.slug,
            obligations: $p.page.collects,
            directGaps: $direct, deferredNested: $nested }
          + (if ($p.entryPages | length) > 0 then {entryPages: $p.entryPages} else {} end)
      ] as $pageIncs

    # step 1: gap-free pages (nested-only gaps ride along with a deferral note)
    | [ $pageIncs[] | select(.directGaps | length == 0)
        | { type, section, page, slug, obligations,
            milestone: (if .section == "origin" then "M0" else "M1" end) }
          + (if (.entryPages // [] | length) > 0 then { entryPages } else {} end)
          + (if (.deferredNested | length) > 0
             then { deferredNested, note: ("Implement WITHOUT nested collection(s) " + (.deferredNested | join(", ")) + " — they arrive in M2 behind the model-extension gate. Entry sub-pages that exist only for the deferred collection also wait for M2.") }
             else {} end)
      ] as $step1

    # step 4: extensions + deferred pages + deferred nested collections
    | ( [ $pageIncs[] | select(.directGaps | length > 0) ] ) as $gapPages
    | ( [ ($gapPages[] | .directGaps[]),
          ($pageIncs[] | .deferredNested[] as $n | allGaps([$n])[] )
        ] | unique ) as $gaps
    | ( [ $gaps[] | {type: "model-extension", gap: ., milestone: "M2", gate: "sam"} ] ) as $extensions
    | ( [ $gapPages[] | {type, section, page, slug, obligations, milestone: "M2"} ] ) as $deferredPages
    | ( [ $pageIncs[] | . as $p | .deferredNested[]
          | {type: "add-nested-collection", collection: ., page: $p.page, section: $p.section, milestone: "M2"} ] | unique ) as $nestedIncs

    | ( $step1
        + [ $carSections[] | {type: "remove-car-section", section: ., milestone: "M1"} ]
        + [ {type: "repoint-test-fixtures", milestone: "M1",
             detail: "Re-point engine/test-support fixtures and root model tests at the target domain per PROVENANCE.md."} ]
        + $extensions + $deferredPages + $nestedIncs )

    # number + linear chain + preserve status by content key
    | def ckey: "\(.type):\(.page // .gap // .collection // .section // "tail")";
    to_entries
    | map(
        (.key + 1) as $n
        | ("inc-" + ($n | tostring | if length < 3 then ("0" * (3 - length)) + . else . end)) as $id
        | .value
        + { id: $id,
            dependsOn: (if .key == 0 then [] else ["inc-" + (($n - 1) | tostring | if length < 3 then ("0" * (3 - length)) + . else . end)] end) }
        | . as $inc
        | (first($existing.increments[]? | select((. | "\(.type):\(.page // .gap // .collection // .section // "tail")") == ($inc | ckey))) // null) as $prev
        | . + { status: ($prev.status // "todo"), commit: ($prev.commit // null), failure_reason: ($prev.failure_reason // null) }
        | if (.gate == "sam" and .status == "todo") then .status = "blocked" else . end
      )
    | { schema_version: 1, run_id: $run_id, increments: . }
    ' > "$target.tmp" && mv "$target.tmp" "$target"

if [[ "$AS_JSON" == true ]]; then
    cat "$target"
else
    jq -r '.increments | group_by(.milestone) | map("\(.[0].milestone): \(length) increments") | join(", ")' "$target"
    jq -r '.increments[] | "\(.id) [\(.milestone)] \(.type) \(.page // .collection // .section // .gap // "") (\(.status))"' "$target"
fi
