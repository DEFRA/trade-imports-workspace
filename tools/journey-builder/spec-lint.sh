#!/bin/bash
# Validate journey-spec.json + conflicts.json. This is the spec-level
# pre-flight of the prototype's boot guards: the coverage rule here is the
# same one flow/dispatch.js will assert at boot once code exists.
#
# Checks:
#   - both files parse
#   - obligation ids unique and path-safe (^[a-zA-Z][a-zA-Z0-9]*$)
#   - every activatedBy.obligation resolves; no activatedBy cycles
#   - collection item[] members resolve to obligations
#   - section/page ids and slugs unique; page.collects entries resolve
#   - coverage: every obligation is collected by exactly one page, OR is a
#     member of exactly one collection's item[], OR is system/renderOnly
#   - obligation conflicts[] ids exist in conflicts.json
#   - every `decision` a conflict or behaviour points at exists in
#     decisions.json (absent ledger = empty ledger)
#   - advisory: conflicts resolved without a decision id; decisions whose
#     subject no longer exists
#
# --format rewrites both files through jq (2-space indent) for stable diffs.
#
# Usage:
#   spec-lint.sh EUDPA-X [--format]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; FORMAT=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --format) FORMAT=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-X [--format]" >&2; exit 1; }

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec_dir="$(jq -r '.spec_dir' "$meta")"
spec="$spec_dir/journey-spec.json"
conflicts="$spec_dir/conflicts.json"
decisions="$spec_dir/decisions.json"

errors=0
fail() { echo "ERROR: $1"; errors=$((errors + 1)); }
warn() { echo "WARN:  $1"; }

jq -e . "$spec" > /dev/null || { echo "ERROR: $spec is not valid JSON"; exit 1; }
jq -e . "$conflicts" > /dev/null || { echo "ERROR: $conflicts is not valid JSON"; exit 1; }
# The ledger only exists once a ruling has been recorded; before that an
# empty one is the truth, not an error.
ledger='{"schema_version":1,"decisions":[]}'
if [[ -f "$decisions" ]]; then
    jq -e . "$decisions" > /dev/null || { echo "ERROR: $decisions is not valid JSON"; exit 1; }
    ledger=$(cat "$decisions")
fi

if [[ "$FORMAT" == true ]]; then
    # Each call writes through its own temp files: concurrent callers sharing
    # one temp name rename over each other and drop items. Same directory keeps
    # the mv an atomic rename; the trap clears the temps if jq fails.
    spec_tmp="$(mktemp "$spec.XXXXXX")"
    conflicts_tmp="$(mktemp "$conflicts.XXXXXX")"
    trap 'rm -f "$spec_tmp" "$conflicts_tmp"' EXIT
    jq '.' "$spec" > "$spec_tmp"
    mv "$spec_tmp" "$spec"
    jq '.' "$conflicts" > "$conflicts_tmp"
    mv "$conflicts_tmp" "$conflicts"
    # The spec lives in the frontend repo, whose pre-commit hook runs
    # prettier --check; finish with prettier so the two formatters agree.
    # Prettier resolves its config from the cwd, not from the file's path, so
    # it must run from the worktree on worktree-relative paths — invoked from
    # elsewhere it formats with no config and the hook rejects the result.
    # The hook checks every JSON under the repo, so the optional files beside
    # the spec go through the same pass when they exist.
    worktree_root="$(jq -r '.worktree' "$meta")"
    if [[ -x "$worktree_root/node_modules/.bin/prettier" ]]; then
        rel_spec_dir="${spec_dir#"$worktree_root"/}"
        format_paths=("$rel_spec_dir/journey-spec.json" "$rel_spec_dir/conflicts.json")
        for optional in decisions.json backlog-extras.json fixtures/happy-path.json; do
            [[ -f "$spec_dir/$optional" ]] && format_paths+=("$rel_spec_dir/$optional")
        done
        ( cd "$worktree_root" && node_modules/.bin/prettier --log-level warn --write "${format_paths[@]}" )
    fi
fi

# --- obligation ids: unique + path-safe -----------------------------------
dupes=$(jq -r '.obligations | group_by(.id) | map(select(length > 1) | .[0].id) | .[]' "$spec")
[[ -n "$dupes" ]] && while read -r d; do fail "duplicate obligation id '$d'"; done <<< "$dupes"

bad_ids=$(jq -r '.obligations[].id | select(test("^[a-zA-Z][a-zA-Z0-9]*$") | not)' "$spec")
[[ -n "$bad_ids" ]] && while read -r b; do fail "obligation id '$b' is not path-safe"; done <<< "$bad_ids"

# --- reference resolution ---------------------------------------------------
unresolved_activated=$(jq -r '
    ([.obligations[].id]) as $ids
    | .obligations[]
    | select(.activatedBy != null)
    | select((.activatedBy.obligation as $ref | $ids | index($ref)) == null)
    | "\(.id) -> \(.activatedBy.obligation)"' "$spec")
[[ -n "$unresolved_activated" ]] && while read -r u; do fail "activatedBy does not resolve: $u"; done <<< "$unresolved_activated"

unresolved_items=$(jq -r '
    ([.obligations[].id]) as $ids
    | .obligations[]
    | select(.kind == "collection")
    | . as $c
    | ($c.item // [])[]
    | select(. as $m | ($ids | index($m)) == null)
    | "\($c.id).item -> \(.)"' "$spec")
[[ -n "$unresolved_items" ]] && while read -r u; do fail "collection item does not resolve: $u"; done <<< "$unresolved_items"

unresolved_collects=$(jq -r '
    ([.obligations[].id]) as $ids
    | .sections[].pages[]
    | . as $p
    | .collects[]
    | select(. as $c | ($ids | index($c)) == null)
    | "page \($p.id) collects unknown obligation \(.)"' "$spec")
[[ -n "$unresolved_collects" ]] && while read -r u; do fail "$u"; done <<< "$unresolved_collects"

# --- section/page uniqueness ------------------------------------------------
for expr in \
    '.sections | group_by(.id) | map(select(length > 1) | .[0].id) | .[] | "duplicate section id \(.)"' \
    '[.sections[].pages[]] | group_by(.id) | map(select(length > 1) | .[0].id) | .[] | "duplicate page id \(.)"' \
    '[.sections[].pages[]] | group_by(.slug) | map(select(length > 1) | .[0].slug) | .[] | "duplicate page slug \(.)"'; do
    out=$(jq -r "$expr" "$spec")
    [[ -n "$out" ]] && while read -r o; do fail "$o"; done <<< "$out"
done

# --- coverage (the boot-guard rule, pre-flighted) --------------------------
coverage=$(jq -r '
    ([.sections[].pages[].collects[]]) as $collected
    | ([.obligations[] | select(.kind == "collection") | (.item // [])[]]) as $item_members
    | .obligations[]
    | select((.system // false) or (.renderOnly // false) | not)
    | .id as $id
    | (($collected | map(select(. == $id)) | length) +
       ($item_members | map(select(. == $id)) | length)) as $n
    | if $n == 0 then "obligation \($id) is collected by no page and no collection item"
      elif $n > 1 then "obligation \($id) is collected \($n) times (must be exactly 1)"
      else empty end' "$spec")
[[ -n "$coverage" ]] && while read -r c; do fail "$c"; done <<< "$coverage"

# --- boolean facts must be real booleans ------------------------------------
string_bools=$(jq -r '
    [paths(type == "string" and (. == "true" or . == "false")) as $p
     | select($p[-1] | IN("wipeOnExit","composite","outOfScope","renderOnly","system","provisionalCopy","dynamicPerSpecies"))
     | $p | join(".")] | .[]' "$spec")
[[ -n "$string_bools" ]] && while read -r s; do fail "string boolean at $s (use --json, not --field)"; done <<< "$string_bools"

# --- activatedBy cycles -----------------------------------------------------
cycle=$(jq -r '
    def prune:
        . as $rem
        | ($rem | to_entries
           | map(select([.value[] | select(. as $d | $rem | has($d))] | length == 0) | .key)) as $removable
        | if ($removable | length) == 0 then $rem
          else ($rem | with_entries(select(.key as $k | ($removable | index($k)) == null))) | prune
          end;
    ([.obligations[] | {key: .id, value: (if .activatedBy then [.activatedBy.obligation] else [] end)}]
     | from_entries) | prune | keys | join(", ")' "$spec")
[[ -n "$cycle" ]] && fail "activatedBy cycle involving: $cycle"

# --- conflict refs ----------------------------------------------------------
unresolved_conflicts=$(jq -r --slurpfile c "$conflicts" '
    ([$c[0].conflicts[].id]) as $ids
    | .obligations[]
    | . as $o
    | (.conflicts // [])[]
    | select(. as $ref | ($ids | index($ref)) == null)
    | "obligation \($o.id) references unknown conflict \(.)"' "$spec")
[[ -n "$unresolved_conflicts" ]] && while read -r u; do fail "$u"; done <<< "$unresolved_conflicts"

# --- decision refs ----------------------------------------------------------
unresolved_decisions=$(jq -r --slurpfile c "$conflicts" --argjson ledger "$ledger" '
    ([$ledger.decisions[].id]) as $ids
    | ( $c[0].conflicts[] | select(.decision != null) | {kind: "conflict", id, decision} ),
      ( .behaviours[] | select(.decision != null) | {kind: "behaviour", id, decision} )
    | select(.decision as $ref | ($ids | index($ref)) == null)
    | "\(.kind) \(.id) references unknown decision \(.decision)"' "$spec")
[[ -n "$unresolved_decisions" ]] && while read -r u; do fail "$u"; done <<< "$unresolved_decisions"

# --- advisory ---------------------------------------------------------------
gaps=$(jq -r '[.obligations[] | select(.modelGap != null)] | length' "$spec")
[[ "$gaps" -gt 0 ]] && warn "$gaps obligation(s) carry modelGap markers (expected — they become gated model-extension increments)"
open=$(jq -r '[.conflicts[] | select(.resolution == null)] | length' "$conflicts")
[[ "$open" -gt 0 ]] && warn "$open unresolved conflict(s) (recorded, non-blocking)"
unledgered=$(jq -r '[.conflicts[] | select(.resolution != null and .decision == null)] | length' "$conflicts")
[[ "$unledgered" -gt 0 ]] && warn "$unledgered conflict(s) resolved without a decision id (no rationale on record — spec-add-decision.sh records one)"
orphaned=$(jq -r --slurpfile c "$conflicts" --argjson ledger "$ledger" '
    ([$c[0].conflicts[].id]) as $conflict_ids
    | ([.behaviours[].id]) as $behaviour_ids
    | [ $ledger.decisions[]
        | .subject as $s
        | select(
            ($s.kind == "conflict" and (($conflict_ids | index($s.id)) == null))
            or ($s.kind == "behaviour" and (($behaviour_ids | index($s.id)) == null))
            or ($s.kind != "conflict" and $s.kind != "behaviour")) ]
    | length' "$spec")
[[ "$orphaned" -gt 0 ]] && warn "$orphaned decision(s) whose subject no longer exists (ledger kept as history, non-blocking)"

counts=$(jq -r '"\(.obligations | length) obligations, \([.sections[].pages[]] | length) pages in \(.sections | length) sections, \(.behaviours | length) behaviours, \(.fieldGroups | keys | length) fieldGroups"' "$spec")

if [[ "$errors" -gt 0 ]]; then
    echo "FAIL: $errors error(s) — $counts"
    exit 1
fi
echo "OK: $counts"
