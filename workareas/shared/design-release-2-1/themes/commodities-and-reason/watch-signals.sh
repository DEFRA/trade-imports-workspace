#!/usr/bin/env bash
# Gather the five progress signals for the commodities-and-reason build, plus
# the sixth (working-tree dirt), and print them in one block a watcher tick can
# diff against the previous tick.
#
# Elapsed times come from watch-anchors.conf, which holds fixed epochs. Never
# from a journal or transcript mtime: those are last-write times.
#
# Usage: bash workareas/shared/design-release-2-1/themes/commodities-and-reason/watch-signals.sh
set -uo pipefail

WS="$HOME/git/defra/trade-imports-workspace"
THEME="$WS/workareas/shared/design-release-2-1/themes/commodities-and-reason"
WORKAREA="shared/design-release-2-1/themes/commodities-and-reason"
PROJ="$HOME/.claude/projects/-Users-iangriffiths-EqualExperts-Defra-projects-eudp-trade-imports-workspace/a0991c32-4f56-4360-a974-26e9aafe8222"

# shellcheck source=/dev/null
. "$THEME/watch-anchors.conf"

now=$(date +%s)
hm() { printf '%dh %02dm' $(( $1 / 3600 )) $(( ($1 % 3600) / 60 )); }

echo "=== TIME ==="
echo "now                 $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "this run started    $RUN_START_HUMAN  (elapsed $(hm $(( now - RUN_START_EPOCH ))))"
echo "whole build started $BUILD_START_HUMAN  (elapsed $(hm $(( now - BUILD_START_EPOCH ))))"
echo "run id              $RUN_ID   task $TASK_ID   relaunches so far $RELAUNCHES"

echo
echo "=== SIGNAL 1: row statuses ==="
python3 - "$THEME/backlog.json" <<'PY'
import json, sys, collections
b = json.load(open(sys.argv[1]))
rows = b.get('increments') or b.get('rows') or []
c = collections.Counter(r.get('status') for r in rows)
print('counts: ' + ', '.join(f'{k}={v}' for k, v in sorted(c.items())))
for r in rows:
    if r.get('status') not in ('done', 'dropped'):
        print(f"  {r['id']:8} {r.get('status'):8} attempt={(r.get('attempt') or {}).get('stage', 'none')!s:12} {r.get('title','')[:68]}")
done = [r for r in rows if r.get('status') == 'done']
print(f"last done: {done[-1]['id'] if done else 'none'}" + (f" commit={done[-1].get('commit','?')}" if done else ''))
PY
echo "next buildable: $(cd "$WS" && tim backlog next "$WORKAREA" 2>&1 | tail -1)"

echo
echo "=== SIGNAL 2: commits ahead AND behind origin/main, per repo ==="
for r in trade-imports-animals-frontend trade-imports-ins-tests trade-imports-performance-tests; do
  git -C "$WS/repos/$r" fetch origin main --quiet 2>/dev/null
  br=$(git -C "$WS/repos/$r" branch --show-current)
  ahead=$(git -C "$WS/repos/$r" rev-list --count origin/main..HEAD 2>/dev/null)
  behind=$(git -C "$WS/repos/$r" rev-list --count HEAD..origin/main 2>/dev/null)
  head=$(git -C "$WS/repos/$r" rev-parse --short HEAD)
  printf '  %-34s %-38s head=%s ahead=%s behind=%s\n' "$r" "$br" "$head" "$ahead" "$behind"
done

echo
echo "=== SIGNAL 3: agents started vs result ==="
J="$PROJ/subagents/workflows/$RUN_ID/journal.jsonl"
if [ -f "$J" ]; then
  started=$(grep -c '"agent_start"' "$J" 2>/dev/null || echo 0)
  result=$(grep -c '"agent_result"' "$J" 2>/dev/null || echo 0)
  echo "  journal: started=$started result=$result  (in flight $(( started - result )))"
  echo "  last journal lines:"
  tail -3 "$J" | cut -c1-240 | sed 's/^/    /'
else
  echo "  no journal yet at $J"
fi

echo
echo "=== SIGNAL 4: newest transcript mtime ==="
find "$PROJ/subagents/workflows/$RUN_ID" -type f -print0 2>/dev/null \
  | xargs -0 stat -f '%Sm %N' -t '%Y-%m-%d %H:%M:%S' 2>/dev/null \
  | sort -r | head -3 | sed 's/^/  /'

echo
echo "=== SIGNAL 5: newest mtime under logs/ ==="
find "$THEME/logs" -type f -print0 2>/dev/null \
  | xargs -0 stat -f '%Sm %N' -t '%Y-%m-%d %H:%M:%S' 2>/dev/null \
  | sort -r | head -5 | sed 's|'"$THEME/"'||' | sed 's/^/  /'

echo
echo "=== SIGNAL 6: working-tree dirt ==="
for r in trade-imports-animals-frontend trade-imports-ins-tests trade-imports-performance-tests; do
  n=$(git -C "$WS/repos/$r" status --porcelain | wc -l | tr -d ' ')
  m=$([ -f "$WS/repos/$r/.git/MERGE_HEAD" ] && echo MERGE_HEAD || echo -)
  printf '  %-34s %3s files  %s\n' "$r" "$n" "$m"
done
printf '  %-34s %3s files\n' "workspace (this repo)" "$(git -C "$WS" status --porcelain | wc -l | tr -d ' ')"

echo
echo "=== STACK LEASE (e2e: ci — a lease means a guard regressed) ==="
(cd "$WS" && tim docker lease status 2>&1 | tail -3 | sed 's/^/  /')
