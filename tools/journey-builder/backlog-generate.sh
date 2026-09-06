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
#   2. remove-car-section per section in the target's backlogTail.removeSections
#      (the vendored obligations-v2 car domain — see the target scope's
#      PROVENANCE.md). Empty for a greenfield set, which has nothing vendored.
#   3. repoint-test-fixtures, only when the target sets
#      backlogTail.repointTestFixtures
#   4. model-extension increments (gate: sam, born blocked), then the
#      deferred gap pages and one add-nested-collection per deferredNested
#   5. declared extras from <spec_dir>/backlog-extras.json, spliced in at
#      their anchors before numbering. These are the increments a run needs
#      that no spec page can yield — repo hygiene, restored tests, E2E
#      coverage in another repo. Declaring them beside journey-spec.json puts
#      them on the spec branch, reviewed at the spec gate, and makes them
#      re-derivable, so they no longer have to be hand-edited into
#      backlog.json where the "lost" check below would block every
#      regeneration. Anchors resolve in file order: start, end, before/after
#      page:<pageId> (an entry sub-page resolves to the collection increment
#      that folds it in), before/after key:<extraKey> (an extra declared
#      earlier in the file). type is fix, e2e, chore or restore — kept small
#      so the build loop's dispatch stays predictable; widen it here and in
#      backlog-add-extra.sh together.
#   — all in one linear dependsOn chain (increments edit shared files).
#
# Milestones: origin page = M0; steps 1-3 = M1; step 4 = M2. An extra takes
# its declared milestone, else that of the increment it anchors to (M1 at
# start/end).
# Idempotent: status/commit preserved by CONTENT key (type + subject; an
# extra's subject is its key), not position — re-ordering must not resurrect
# or orphan statuses.
#
# Usage:
#   backlog-generate.sh EUDPA-X [--json] [--force] [--dry-run] [--target <id>]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
source "$WORKSPACE/tools/journey-builder/target-profile.sh"

RUN_ID=""; AS_JSON=false; TARGET_FLAG=""; FORCE=false; DRY_RUN=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --json) AS_JSON=true; shift ;;
        --force) FORCE=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --target) TARGET_FLAG="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-X [--json] [--force] [--dry-run] [--target <id>]" >&2; exit 1; }

load_target "$RUN_ID" "$TARGET_FLAG"

WORKAREA="$WORKSPACE/workareas/journey-builder/$RUN_ID"
meta="$WORKAREA/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found" >&2; exit 1; }
spec_dir="$(jq -r '.spec_dir // empty' "$meta")"
[[ -n "$spec_dir" ]] || { echo "Error: $meta has no spec_dir — this run is not spec-driven; its backlog is hand-authored" >&2; exit 1; }
spec="$spec_dir/journey-spec.json"
[[ -f "$spec" ]] || { echo "Error: $spec not found" >&2; exit 1; }
target="$WORKAREA/backlog.json"

# A dry run must leave the workarea untouched, so its scratch output cannot
# sit beside the real backlog the way the normal temp does. The normal temp
# is per-call, so concurrent generators cannot rename over each other, and
# in the target's directory so the mv stays an atomic rename.
if [[ "$DRY_RUN" == true ]]; then
    out="$(mktemp "${TMPDIR:-/tmp}/backlog-generate.XXXXXX")"
else
    out="$(mktemp "$target.XXXXXX")"
fi

# A failed jq (a missing or unreadable spec, say) would otherwise leave the
# half-written temp beside the real backlog. mv consumes it on success, so the
# cleanup is a no-op then.
trap 'rm -f "$out"' EXIT

existing='{"increments":[]}'
[[ -f "$target" ]] && existing=$(cat "$target")

# Validate the extras file up front so a typo is reported by key rather than
# surfacing as a half-resolved anchor deep in the merge.
extras='{"schema_version":1,"increments":[]}'
extras_file="$spec_dir/backlog-extras.json"
if [[ -f "$extras_file" ]]; then
    problems=$(jq -r '
        def anchorOk:
            type == "object" and (
                (keys == ["start"] and .start == true)
                or (keys == ["end"] and .end == true)
                or ((keys == ["before"] or keys == ["after"])
                    and ((.before // .after) | type == "string" and test("^(page|key):.+$"))) );
        if .schema_version != 1 then "schema_version must be 1"
        elif (.increments | type) != "array" then "increments must be an array"
        else
            ( .increments | map(.key) | group_by(.) | map(select(length > 1) | "duplicate key \(.[0] | tojson)")[] ),
            ( .increments[]
              | . as $x
              | (.key // "") as $k
              | if ($k | type) != "string" or $k == "" then "an extra has no key"
                else
                  ( if (["fix", "e2e", "chore", "restore"] | index($x.type)) == null
                    then "extra \($k): type \($x.type | tojson) is not one of fix, e2e, chore, restore" else empty end ),
                  ( if (.title // "") == "" then "extra \($k): title is required" else empty end ),
                  ( if (.anchor | anchorOk | not)
                    then "extra \($k): anchor \(.anchor | tojson) must be {\"start\":true}, {\"end\":true}, or {\"before\"|\"after\": \"page:<pageId>\"|\"key:<extraKey>\"}" else empty end )
                end )
        end' "$extras_file")
    if [[ -n "$problems" ]]; then
        echo "Error: $extras_file is invalid:" >&2
        sed 's/^/  /' <<<"$problems" >&2
        exit 1
    fi
    extras=$(cat "$extras_file")
fi

jq -n \
    --slurpfile s "$spec" \
    --argjson removeSections "$TARGET_REMOVE_SECTIONS" \
    --argjson repointFixtures "$TARGET_REPOINT_FIXTURES" \
    --argjson extras "$extras" \
    --argjson existing "$existing" \
    --arg run_id "$RUN_ID" \
    --arg target_id "$TARGET_ID" \
    --arg target_repo "${TARGET_REPO#"$WORKSPACE"/}" \
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
        + [ $removeSections[] | {type: "remove-car-section", section: ., milestone: "M1"} ]
        + (if $repointFixtures
           then [ {type: "repoint-test-fixtures", milestone: "M1",
                   detail: "Re-point engine/test-support fixtures and root model tests at the target domain per PROVENANCE.md."} ]
           else [] end)
        + $extensions + $deferredPages + $nestedIncs )

    # step 5: splice each extra in at its anchor, in file order
    | reduce $extras.increments[] as $x (.;
        . as $list
        | $x.anchor as $a
        | (if $a.start then {at: 0, milestone: "M1"}
           elif $a.end then {at: ($list | length), milestone: "M1"}
           else
             (($a.before // $a.after) | capture("^(?<kind>page|key):(?<id>.+)$")) as $ref
             | ($list
                | map(if $ref.kind == "page"
                      then (.page == $ref.id or (((.entryPages // []) | map(.id) | index($ref.id)) != null))
                      else .key == $ref.id end)
                | index(true)) as $i
             | if $i == null
               then error("extra \($x.key): anchor \($a | tojson) does not resolve — no increment for \($ref.kind) \($ref.id | tojson)"
                          + (if $ref.kind == "key" then " (a key anchor must name an extra declared earlier in the file)" else "" end))
               else {at: (if $a.before then $i else $i + 1 end), milestone: $list[$i].milestone} end
           end) as $slot
        | $slot.at as $at
        | $list[:$at]
          + [ { type: $x.type, key: $x.key, repo: ($x.repo // $target_repo),
                title: $x.title, detail: ($x.detail // null),
                milestone: ($x.milestone // $slot.milestone), gate: ($x.gate // null) } ]
          + $list[$at:]
      )

    # number + linear chain + preserve status by content key
    | def ckey: "\(.type):\(.key // .page // .gap // .collection // .section // "tail")";
    to_entries
    | map(
        (.key + 1) as $n
        | ("inc-" + ($n | tostring | if length < 3 then ("0" * (3 - length)) + . else . end)) as $id
        | .value
        + { id: $id,
            dependsOn: (if .key == 0 then [] else ["inc-" + (($n - 1) | tostring | if length < 3 then ("0" * (3 - length)) + . else . end)] end) }
        | . as $inc
        | (first($existing.increments[]? | select(ckey == ($inc | ckey))) // null) as $prev
        | . + { status: ($prev.status // "todo"), commit: ($prev.commit // null), failure_reason: ($prev.failure_reason // null) }
        | if (.gate == "sam" and .status == "todo") then .status = "blocked" else . end
      )
    | { schema_version: 1, run_id: $run_id, target: $target_id, increments: . }
    ' > "$out"

# Refuse to drop increments this generator cannot re-derive. A backlog gets
# hand-extended (EUDPA-249 grew 67 increments from 35 derivable ones, several
# marked "not generator-derivable"), and the parity skill writes its findings
# backlog to this same filename. Regenerating over either silently destroys
# that work; status preservation by content key does not save an increment
# whose key the generator no longer emits.
if [[ -f "$target" && "$FORCE" != true ]]; then
    lost=$(jq -r --slurpfile new "$out" '
        def ckey: "\(.type):\(.key // .page // .gap // .collection // .section // "tail")";
        ($new[0].increments | map(ckey)) as $keys
        | [ .increments[]? | ckey as $k | select(($keys | index($k)) == null) | .id ]
        | join(", ")' "$target")
    if [[ -n "$lost" ]]; then
        rm -f "$out"
        echo "Error: regenerating $RUN_ID would drop increments the generator cannot re-derive:" >&2
        echo "  $lost" >&2
        echo "These are hand-authored, or were written by another skill — parity writes its" >&2
        echo "findings backlog to this same file. Regenerating destroys them and their rulings." >&2
        echo "Declare extras in $extras_file (backlog-add-extra.sh) to make yours re-derivable," >&2
        echo "or re-run with --force only once you are certain they are disposable." >&2
        exit 1
    fi
fi

print_backlog() {
    if [[ "$AS_JSON" == true ]]; then
        cat "$1"
    else
        jq -r '.increments | group_by(.milestone) | map("\(.[0].milestone): \(length) increments") | join(", ")' "$1"
        jq -r '.increments[] | "\(.id) [\(.milestone)] \(.type) \(.key // .page // .collection // .section // .gap // "") (\(.status))"' "$1"
    fi
}

if [[ "$DRY_RUN" == true ]]; then
    print_backlog "$out"
    exit 0
fi

mv "$out" "$target"
print_backlog "$target"
