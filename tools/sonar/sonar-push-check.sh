#!/bin/bash
# Forwards the repo-rooted pre-push hook to `tim sonar push-check --hook`,
# run from the workspace clone that holds this script.
#
# Kept only because each Sonar-integrated repo's .claude/settings.json, on
# main and on open branches, still names this path. Delete it once none do.
#
# This hook ran in the repo it checks, so a hook call without a `cwd` (a
# manual run) is given the current folder, as the Bash it replaces used.

workspace=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
[ -f "$workspace/tim/src/cli.js" ] && [ -d "$workspace/tim/node_modules" ] || exit 0
command -v node > /dev/null 2>&1 || exit 0

input=$(cat)
if command -v jq > /dev/null 2>&1; then
  input=$(printf '%s' "$input" | jq -c --arg cwd "$PWD" '.cwd //= $cwd' 2> /dev/null || printf '%s' "$input")
fi

printf '%s' "$input" | node "$workspace/tim/src/cli.js" sonar push-check --hook
