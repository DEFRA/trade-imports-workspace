#!/bin/bash
# Forwards the workspace-root pre-push hook to `tim sonar push-check --hook`,
# run from the workspace clone that holds this script.
#
# Kept only until .claude/settings.json calls tim itself. Delete it then.

workspace=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
[ -f "$workspace/tim/src/cli.js" ] && [ -d "$workspace/tim/node_modules" ] || exit 0
command -v node > /dev/null 2>&1 || exit 0

exec node "$workspace/tim/src/cli.js" sonar push-check --hook
