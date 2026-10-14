#!/usr/bin/env bash
#
# Works out which suites and tags a pull request's e2e run covers, from
# e2e-tests-pr-scope.json, and prints them as `suites=` and `tags=` lines for
# $GITHUB_OUTPUT.
#
#   REPOSITORY   owner/name of the calling repo (github.repository)
#   MANUAL       "true" for a direct run of the workflow: SUITES and TAGS are
#                used instead of the scope file
#   SUITES, TAGS the workflow's inputs, read only when MANUAL is true
#
# A repo with no entry uses `default`. Suites and tags may be space- or
# comma-separated. Neither empty is an error: `all` is the only way to run
# every suite, and it stands alone. It prints empty suites and tags, which the
# test step reads as "everything". Tags alone run only the tagged tests.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="${REPOSITORY#*/}"

fail() {
  echo "::error::$1" >&2
  exit 1
}

# Prints a space- or comma-separated list with single spaces and no padding.
words() {
  local list
  read -r -a list <<< "${1//,/ }"
  echo "${list[*]:-}"
}

if [ "${MANUAL:-false}" = "true" ]; then
  where="the workflow inputs"
  scope_suites="$(words "$SUITES")"
  scope_tags="$(words "$TAGS")"
else
  scope_file="$here/e2e-tests-pr-scope.json"
  key="$(jq -r --arg repo "$repo" 'if has($repo) then $repo else "default" end' "$scope_file")"
  where="the $key entry in e2e-tests-pr-scope.json"
  entry="$(jq -c --arg key "$key" '.[$key] // empty' "$scope_file")"
  [ -n "$entry" ] || fail "No scope for $repo in e2e-tests-pr-scope.json, and no default entry."
  scope_suites="$(words "$(jq -r '(.suites // []) | join(" ")' <<< "$entry")")"
  scope_tags="$(words "$(jq -r '(.tags // []) | join(" ")' <<< "$entry")")"
fi

[ -n "$scope_suites$scope_tags" ] || fail "Neither suites nor tags are set in $where. Use \"all\" to run everything."
if [[ " $scope_suites " == *" all "* ]]; then
  [ "$scope_suites" = "all" ] || fail "\"all\" must be the only suite in $where."
  [ -z "$scope_tags" ] || fail "$where has tags as well as \"all\", which already runs every test."
  scope_suites=""
fi

echo "Test scope from $where: suites=${scope_suites:-all} tags=${scope_tags:-none}" >&2
printf 'suites=%s\ntags=%s\n' "$scope_suites" "$scope_tags"
