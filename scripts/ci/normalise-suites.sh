#!/usr/bin/env bash
#
# Turns the e2e workflow's `suites` input into one Playwright path per line.
#
#   SUITES   space- and/or comma-separated test-suite paths under tests/, e.g.
#            "tests/ins/ tests/animals". A directory without a trailing slash
#            gets one; a single spec file is left alone.
#   PROJECT  deprecated alias for SUITES: domain names ("ins,animals"), mapped
#            to tests/<domain>/. Ignored when SUITES is also set.
#
# Positional arguments to `playwright test` are regexes matched against each
# file's path, so a bare `tests/animals` would also select tests/animals-admin/.
# The trailing slash keeps a domain's directory to itself.
#
# Empty input prints nothing, so the caller runs every test suite. An entry that
# does not start with tests/, contains `..`, or uses characters outside
# [A-Za-z0-9._/-] fails the run: the value reaches `docker run`.

set -euo pipefail

DOMAINS="animals animals-admin ins plants"

suites="${SUITES:-}"
project="${PROJECT:-}"

if [ -z "${suites//[[:space:],]/}" ] && [ -n "${project//[[:space:],]/}" ]; then
  echo "::warning::The 'project' input is deprecated; use 'suites' (for example 'tests/ins/ tests/animals/')." >&2
  entries=""
  for domain in ${project//,/ }; do
    case " $DOMAINS " in
      *" $domain "*) entries="$entries tests/$domain/" ;;
      *)
        echo "::error::Unknown domain '$domain' in 'project'. Use one of: $DOMAINS, or switch to 'suites'." >&2
        exit 1
        ;;
    esac
  done
  suites="$entries"
elif [ -n "${suites//[[:space:],]/}" ] && [ -n "${project//[[:space:],]/}" ]; then
  echo "::warning::Both 'suites' and the deprecated 'project' are set; ignoring 'project'." >&2
fi

seen=" "
for entry in ${suites//,/ }; do
  if [[ ! "$entry" =~ ^tests/[A-Za-z0-9._/-]+$ ]] || [[ "$entry" == *..* ]]; then
    echo "::error::Invalid suite '$entry'. Use a path under tests/ with only letters, digits, '.', '_', '-' and '/' (for example tests/animals/)." >&2
    exit 1
  fi
  last="${entry##*/}"
  if [ -n "$last" ] && [[ "$last" != *.* ]]; then
    entry="$entry/"
  fi
  case "$seen" in
    *" $entry "*) continue ;;
  esac
  seen="$seen$entry "
  printf '%s\n' "$entry"
done
