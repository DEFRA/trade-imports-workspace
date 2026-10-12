#!/usr/bin/env bash
#
# Table test for normalise-suites.sh. Run: bash scripts/ci/normalise-suites.test.sh

set -uo pipefail

script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/normalise-suites.sh"
failures=0

# check <name> <SUITES> <PROJECT> <expected stdout, one path per line> <expected exit code>
check() {
  local name="$1" suites="$2" project="$3" expected="$4" code="$5"
  local actual status
  actual="$(SUITES="$suites" PROJECT="$project" bash "$script" 2>/dev/null)"
  status=$?
  if [ "$actual" != "$expected" ] || [ "$status" != "$code" ]; then
    echo "FAIL: $name"
    echo "  expected (exit $code): $(printf '%s' "$expected" | tr '\n' ' ')"
    echo "  actual   (exit $status): $(printf '%s' "$actual" | tr '\n' ' ')"
    failures=$((failures + 1))
  else
    echo "ok:   $name"
  fi
}

check "empty runs everything" "" "" "" 0
check "whitespace only" "   " "" "" 0
check "slash kept" "tests/animals/" "" "tests/animals/" 0
check "slash added" "tests/animals" "" "tests/animals/" 0
check "animals stays apart from animals-admin" "tests/animals tests/animals-admin" "" $'tests/animals/\ntests/animals-admin/' 0
check "comma separated" "tests/ins/,tests/animals" "" $'tests/ins/\ntests/animals/' 0
check "mixed commas and spaces" "tests/ins/ , tests/animals" "" $'tests/ins/\ntests/animals/' 0
check "suite directory" "tests/animals/e2e" "" "tests/animals/e2e/" 0
check "spec file left alone" "tests/animals/e2e/auth.spec.ts" "" "tests/animals/e2e/auth.spec.ts" 0
check "duplicates removed" "tests/ins tests/ins/" "" "tests/ins/" 0
check "not under tests/" "src/foo" "" "" 1
check "parent directory" "tests/../etc" "" "" 1
check "shell metacharacters" 'tests/ins;rm -rf /' "" "" 1
# shellcheck disable=SC2016 # the literal $( ) is the point of the case
check "command substitution" 'tests/$(id)' "" "" 1
check "deprecated project maps to paths" "" "ins,animals" $'tests/ins/\ntests/animals/' 0
check "deprecated project, spaces" "" "animals animals-admin" $'tests/animals/\ntests/animals-admin/' 0
check "deprecated project, unknown domain" "" "e2e" "" 1
check "suites wins over project" "tests/plants" "ins" "tests/plants/" 0

if [ "$failures" -gt 0 ]; then
  echo "$failures failure(s)"
  exit 1
fi
echo "all passed"
