#!/bin/bash
# Behaviour tests for derive-scenarios.mjs.
#
# Usage: ~/git/defra/trade-imports-workspace/tools/theme-ticket/derive-scenarios.test.sh
#
# Each test builds a throwaway workspace git repo with a theme backlog and a spec,
# runs derive-scenarios against it with --workspace, and checks its JSON.
# Exits 0 when every test passes.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

node --test "$HERE/derive-scenarios.test.mjs"
