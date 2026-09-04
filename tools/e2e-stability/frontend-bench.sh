#!/usr/bin/env bash
# Time a fixed slice of the E2E suite against one stack configuration, so two
# configurations can be compared on the same work.
#
#   tools/e2e-stability/frontend-bench.sh <label> <workers> <mode> [VAR=value ...]
#
#     mode = image   published :latest images (linux/amd64, so Rosetta-translated)
#     mode = dev     built from repos/ (native arm64 on Apple silicon)
#
# Every VAR=value is exported before the stack starts, so it reaches the
# containers through compose. Use it for FRONTEND_REPLICAS and for the
# frontend's own knobs, e.g.
#
#   frontend-bench.sh cache-on 8 dev FRONTEND_REPLICAS=1 NUNJUCKS_NO_CACHE=false NUNJUCKS_WATCH=false
#
# Results land in workareas/shared/e2e-stability/bench/<label>/ with the same
# per-container CPU and memory sampling run-once.sh does, plus the per-test
# durations of the slice.
set -uo pipefail

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
HERE="$WORKSPACE/tools/e2e-stability"
OUT_ROOT="$WORKSPACE/workareas/shared/e2e-stability/bench"
TESTS="$WORKSPACE/repos/trade-imports-animals-tests"

LABEL="${1:?label required}"
WORKERS="${2:?workers required}"
MODE="${3:?mode required: image | dev}"
shift 3

OUT="$OUT_ROOT/$LABEL"
rm -rf "$OUT"
mkdir -p "$OUT"

# The slice: the journey specs whose latency is the thing under investigation,
# plus a page spec as a cheap control. Fixed so every configuration does
# identical work.
SLICE='Notification persistence|CPH number page|Declaration page|Addresses picker'

{
  echo "label=$LABEL"
  echo "workers=$WORKERS"
  echo "mode=$MODE"
  echo "slice=$SLICE"
  echo "vars=$*"
  echo "started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} >"$OUT/env.txt"

for assignment in "$@"; do
  export "${assignment?}"
  echo "exported $assignment" >>"$OUT/env.txt"
done

# ---- stack ------------------------------------------------------------------
"$WORKSPACE/scripts/stack/stop-stack.sh" >"$OUT/stack.log" 2>&1
if [ "$MODE" = "dev" ]; then
  "$WORKSPACE/scripts/stack/run-stack.sh" --dev >>"$OUT/stack.log" 2>&1
else
  "$WORKSPACE/scripts/stack/run-stack.sh" >>"$OUT/stack.log" 2>&1
fi
echo "stack_exit=$?" >>"$OUT/env.txt"

docker ps --format '{{.Names}}	{{.Image}}	{{.Status}}' >"$OUT/containers-before.txt"

# Prove the knobs actually reached the container rather than assuming they did.
docker inspect "$(docker ps --format '{{.Names}}' | grep -m1 'animals-frontend-1$')" \
  --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
  | grep -E 'NODE_ENV|NUNJUCKS|LOG_FORMAT' >"$OUT/frontend-env.txt"

# ---- sampler ----------------------------------------------------------------
(
  while true; do
    ts=$(date -u +%H:%M:%S)
    docker stats --no-stream \
      --format "$ts	{{.Name}}	{{.CPUPerc}}	{{.MemUsage}}	{{.MemPerc}}" 2>/dev/null
    sleep 3
  done
) >"$OUT/stats.tsv" 2>/dev/null &
STATS_PID=$!
trap 'kill "$STATS_PID" 2>/dev/null' EXIT

# ---- the slice --------------------------------------------------------------
cd "$TESTS" || exit 1
START=$(date +%s)
PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/report.json" \
  npm run test:docker-compose -- \
  --workers="$WORKERS" \
  --retries=0 \
  --grep="$SLICE" \
  --reporter=list,json \
  >"$OUT/run.log" 2>&1
EXIT=$?
END=$(date +%s)

kill "$STATS_PID" 2>/dev/null
trap - EXIT

{
  echo "exit=$EXIT"
  echo "wall_seconds=$((END - START))"
  echo "finished_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} >>"$OUT/env.txt"

node "$HERE/bench-summarise.mjs" "$OUT" >"$OUT/summary.json"
cat "$OUT/summary.json"
