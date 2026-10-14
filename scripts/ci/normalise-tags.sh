#!/usr/bin/env bash
#
# Turns the e2e workflow's `tags` input into one Playwright --grep pattern.
#
#   TAGS   space- and/or comma-separated tags, e.g. "@ins-backend @gateway".
#
# The pattern is the tags joined by `|`, as --grep-invert does for the excluded
# tags. Empty input prints nothing, so the caller runs no tag selection. An
# entry that is not an @ followed by letters, digits, '_' or '-' fails the run:
# the value reaches `docker run` and is read as a regex.

set -euo pipefail

seen=" "
alternatives=""
for entry in ${TAGS//,/ }; do
  if [[ ! "$entry" =~ ^@[A-Za-z0-9_-]+$ ]]; then
    echo "::error::Invalid tag '$entry'. Use @ followed by letters, digits, '_' or '-' (for example @ins-backend)." >&2
    exit 1
  fi
  case "$seen" in
    *" $entry "*) continue ;;
  esac
  seen="$seen$entry "
  alternatives="${alternatives:+$alternatives|}$entry"
done

if [ -n "$alternatives" ]; then
  printf '%s\n' "$alternatives"
fi
