#!/usr/bin/env bash
#
# Forwards to `tim docker up`. The e2e-tests.yml on main, which every service
# repo calls, and the performance tests' smoke.yml on main check out this
# branch and run this path. Delete once the pull requests for
# chore/NO_JIRA-bash-to-tim have merged.

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ ! -d "$root/tim/node_modules" ]; then
  (cd "$root/tim" && npm ci --no-audit --no-fund >&2)
fi
TIM_NO_AUTO_PULL=1 exec node "$root/tim/src/cli.js" docker up --workspace "$root" "$@"
