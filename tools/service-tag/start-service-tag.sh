#!/bin/bash
# Gather everything the service-tag skill needs before it touches a file:
# each repo's branch and uncommitted files, the services in the PR scope
# file (default skipped), each one's direct dependents read from the stack's
# compose wiring, the service-tag map the lint reads, and any places where
# the map and the scope file disagree.
#
# Usage:
#   start-service-tag.sh [--service <name>]
#
# --service  one service, short (address-book) or full (trade-imports-address-book).
#            Omit to cover every entry in the scope file except `default`.
#
# Prints `MODE: READY`, then one JSON object: repos, entries, tag_map, alignment.
# Each entry's `dependents` are the services that call it directly (a
# TRADE_IMPORTS_<NAME>_URL in their compose environment), with the domains each
# runs by path. Event links (SNS/SQS) are not URLs, so they are not here.
# Read-only — changes nothing.

set -e

SERVICE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --service) SERVICE="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,17p' "$0" >&2
            exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

ws="$HOME/git/defra/trade-imports-workspace"
tests="$ws/repos/trade-imports-ins-tests"
scope_path="config/e2e-tests-pr-scope.json"
scope_file="$ws/$scope_path"

[[ -f "$scope_file" ]] || { echo "No scope file at $scope_file" >&2; exit 1; }
[[ -d "$tests" ]] || { echo "No ins-tests clone at $tests" >&2; exit 1; }

short="${SERVICE#trade-imports-}"

repo_json() {
    local dir="$1" name="$2"
    local branch dirty
    branch="$(git -C "$dir" branch --show-current)"
    dirty="$(git -C "$dir" status --porcelain | jq -R . | jq -s .)"
    jq -n --arg name "$name" --arg path "$dir" --arg branch "$branch" --argjson dirty "$dirty" \
        '{name: $name, path: $path, branch: $branch, uncommitted: $dirty}'
}

ws_json="$(repo_json "$ws" workspace)"
tests_json="$(repo_json "$tests" ins-tests)"

tag_map="$(npm --prefix "$tests" exec --no -- tsx -e "import { SERVICE_TAG_DOMAINS } from '$tests/config/service-tags'; console.log(JSON.stringify(SERVICE_TAG_DOMAINS));")"

# Direct calls between services: a service block's TRADE_IMPORTS_<NAME>_URL
# environment entry names the service it calls. `_BASE_URL` is a service's own address.
edge_awk='
/^  [a-z0-9-]+:[ ]*$/ { svc = $1; sub(/:$/, "", svc); next }
svc != "" && /^[ ]+- TRADE_IMPORTS_[A-Z_]+_URL=/ {
  name = $2; sub(/=.*/, "", name)
  if (name ~ /_BASE_URL$/) next
  sub(/^TRADE_IMPORTS_/, "", name); sub(/_URL$/, "", name)
  target = tolower(name); gsub(/_/, "-", target)
  print svc " trade-imports-" target
}'
edges="$(awk "$edge_awk" "$ws"/docker/stack/*.compose.yml | jq -R 'split(" ") | {from: .[0], to: .[1]}' | jq -s 'unique')"

echo "MODE: READY"

jq -n \
    --slurpfile scope "$scope_file" \
    --argjson map "$tag_map" \
    --argjson edges "$edges" \
    --argjson ws "$ws_json" \
    --argjson tests "$tests_json" \
    --arg scope_path "$scope_path" \
    --arg short "$short" '
  def suffix: ltrimstr("trade-imports-");
  def domains_of: [ (.suites // [])[] | select(startswith("tests/")) | split("/")[1] ] | unique;
  def nested: [ (.suites // [])[] | select(startswith("tests/") and ((split("/") | length) > 3)) ];

  ($scope[0] | to_entries | map(select(.key != "default"))
     | map(select($short == "" or (.key | suffix) == $short))) as $entries
  | {
      scope_path: $scope_path,
      repos: [$ws, $tests],
      entries: [ $entries[] | . as $e | {
        service: $e.key,
        expected_tag: ("@" + ($e.key | suffix)),
        suites: ($e.value.suites // []),
        tags: ($e.value.tags // []),
        domains_run_by_path: ($e.value | domains_of),
        dependents: ([ $edges[] | select(.to == $e.key) | .from ] | unique
          | map(. as $d | {service: $d, domains: (($scope[0][$d] // {}) | domains_of)}))
      } ],
      tag_map: $map,
      alignment: (
        [ $entries[] | . as $e | ("@" + ($e.key | suffix)) as $want
          | ($e.value | domains_of) as $doms
          | ($e.value | nested) as $nest
          | ( ($e.value.tags // [])[] | select(. != $want)
              | {service: $e.key, kind: "unexpected-tag-name", detail: ("scope entry lists " + . + ", expected " + $want)} ),
            ( ($e.value.tags // [])[] | select($map[.] == null)
              | {service: $e.key, kind: "tag-missing-from-map", detail: (. + " is in the scope file but not in SERVICE_TAG_DOMAINS")} ),
            ( ($e.value.tags // [])[] | select($map[.] != null) | . as $t
              | select(($map[$t] | sort) != $doms)
              | {service: $e.key, kind: "domains-differ", detail: ($t + " map domains " + ($map[$t] | tostring) + " differ from the domains the entry runs by path " + ($doms | tostring))} ),
            ( select(($nest | length) > 0)
              | {service: $e.key, kind: "nested-suite", detail: ("suite below a domain " + ($nest | tostring) + "; the lint matches by domain")} )
        ]
        + [ $map | keys[] | . as $t
            | select(($short == "" ) and ([ $scope[0] | keys[] | select(. != "default") | ("@" + suffix) ] | index($t) | not))
            | {service: null, kind: "map-tag-without-entry", detail: ($t + " is in SERVICE_TAG_DOMAINS but no scope entry matches it")} ]
      )
    }'
