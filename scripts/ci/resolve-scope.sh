#!/usr/bin/env bash
#
# Forwards to `tim ci scope`. The e2e-tests.yml on main, which every service
# repo calls, checks out this branch and runs this path. Delete once the
# workspace pull request for chore/NO_JIRA-bash-to-tim has merged.

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ ! -d "$root/tim/node_modules" ]; then
  (cd "$root/tim" && npm ci --no-audit --no-fund >&2)
fi
TIM_NO_AUTO_PULL=1 exec node "$root/tim/src/cli.js" ci scope --workspace "$root" "$@"
