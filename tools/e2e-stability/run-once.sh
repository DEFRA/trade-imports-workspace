#!/usr/bin/env bash
# One instrumented E2E run against the workspace docker-compose stack.
#
#   tools/e2e-stability/run-once.sh <label> <workers> [--restart-stack]
#
# Writes everything about the run to
# workareas/shared/e2e-stability/runs/<label>/:
#   summary.json      derived pass/fail/flaky/duration numbers
#   report.json       raw Playwright JSON report
#   run.log           full test stdout/stderr
#   stats.tsv         5s docker-stats samples taken across the run
#   host.tsv          5s host load / memory / chromium-process samples
#   containers.tsv    post-run OOMKilled + RestartCount + health per container
#   logs/             per-container log tail
#   test-results/     Playwright failure artefacts (traces, error-context.md)
set -uo pipefail

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
HERE="$WORKSPACE/tools/e2e-stability"
RUNS="$WORKSPACE/workareas/shared/e2e-stability/runs"
TESTS="$WORKSPACE/repos/trade-imports-animals-tests"

SCRIPT_START=$(date +%s)
LABEL="${1:?label required}"
WORKERS="${2:?workers required}"
RESTART="${3:-}"

OUT="$RUNS/$LABEL"
rm -rf "$OUT"
mkdir -p "$OUT/logs"

RESTART_EXIT=na
if [ "$RESTART" = "--restart-stack" ]; then
  {
    echo "== stopping stack =="
    "$WORKSPACE/scripts/stack/stop-stack.sh"
    echo "== starting stack =="
    "$WORKSPACE/scripts/stack/run-stack.sh"
  } >"$OUT/stack-restart.log" 2>&1
  RESTART_EXIT=$?
  echo "run-stack.sh exit=$RESTART_EXIT" >>"$OUT/stack-restart.log"
fi

# ---- pre-run environment snapshot -------------------------------------------
{
  echo "label=$LABEL"
  echo "workers=$WORKERS"
  echo "started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "host_ncpu=$(sysctl -n hw.ncpu)"
  echo "host_memsize=$(sysctl -n hw.memsize)"
  echo "docker_ncpu=$(docker info --format '{{.NCPU}}')"
  echo "docker_memtotal=$(docker info --format '{{.MemTotal}}')"
  echo "tests_head=$(git -C "$TESTS" rev-parse --short HEAD)"
  echo "restarted_stack=$([ "$RESTART" = '--restart-stack' ] && echo yes || echo no)"
  echo "stack_restart_exit=$RESTART_EXIT"
  echo "unhealthy_before=$(docker ps --format '{{.Names}} {{.Status}}' | grep -c unhealthy)"
} >"$OUT/env.txt"

docker ps --format '{{.Names}}	{{.Status}}' >"$OUT/containers-before.txt"

# Mongo grows across a long series of runs — the dashboard, search, sort and
# pagination specs all read a dataset that every prior run has added to, so the
# before/after counts separate "concurrency broke it" from "the data grew".
mongo_counts() {
  docker exec trade-imports-mongodb-1 mongosh --quiet --eval '
    db.getMongo().getDBNames().forEach(n => {
      if (["admin", "local", "config"].includes(n)) return;
      const d = db.getSiblingDB(n);
      d.getCollectionNames().forEach(c => print(n + "." + c + "=" + d.getCollection(c).countDocuments({})));
    })' 2>/dev/null
}
mongo_counts >"$OUT/mongo-before.txt"

# ---- background samplers ----------------------------------------------------
(
  while true; do
    ts=$(date -u +%H:%M:%S)
    docker stats --no-stream \
      --format "$ts	{{.Name}}	{{.CPUPerc}}	{{.MemUsage}}	{{.MemPerc}}	{{.NetIO}}	{{.BlockIO}}" 2>/dev/null
    sleep 5
  done
) >"$OUT/stats.tsv" 2>/dev/null &
STATS_PID=$!

(
  while true; do
    ts=$(date -u +%H:%M:%S)
    load=$(sysctl -n vm.loadavg | tr -d '{}' | awk '{print $1"|"$2"|"$3}')
    swapused=$(sysctl -n vm.swapusage | awk '{print $6}')
    chromium=$(pgrep -f 'Chromium|headless_shell' 2>/dev/null | wc -l | tr -d ' ')
    nodes=$(pgrep -x node 2>/dev/null | wc -l | tr -d ' ')
    compressed=$(vm_stat | awk '/Pages occupied by compressor/ {gsub(/\./,"",$NF); print $NF}')
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$ts" "$load" "$swapused" "$chromium" "$nodes" "0" "$compressed"
    sleep 5
  done
) >"$OUT/host.tsv" 2>/dev/null &
HOST_PID=$!

stop_samplers() {
  kill "$STATS_PID" "$HOST_PID" 2>/dev/null
  wait "$STATS_PID" 2>/dev/null
  wait "$HOST_PID" 2>/dev/null
}
trap stop_samplers EXIT

# ---- the run ----------------------------------------------------------------
cd "$TESTS" || exit 1
START=$(date +%s)
PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/report.json" \
  npm run test:docker-compose -- \
  --workers="$WORKERS" \
  --reporter=list,json \
  >"$OUT/run.log" 2>&1
EXIT=$?
END=$(date +%s)

stop_samplers
trap - EXIT

# ---- post-run capture -------------------------------------------------------
{
  echo "exit=$EXIT"
  echo "wall_seconds=$((END - START))"
  echo "finished_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} >>"$OUT/env.txt"

mongo_counts >"$OUT/mongo-after.txt"

[ -f "$TESTS/FAILED" ] && cp "$TESTS/FAILED" "$OUT/FAILED"
[ -d "$TESTS/test-results" ] && cp -R "$TESTS/test-results" "$OUT/test-results" 2>/dev/null

docker ps -a --format '{{.Names}}' | while read -r name; do
  docker inspect "$name" --format \
    "{{.Name}}	{{.State.Status}}	{{.State.OOMKilled}}	{{.RestartCount}}	{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}"
done >"$OUT/containers.tsv" 2>/dev/null

# --since this run rather than a fixed tail: a busy frontend writes far more than
# 500 lines in a two-minute suite, so a tail can end after the failure window it
# exists to explain. Cap the volume instead of the window.
docker ps --format '{{.Names}}' | while read -r name; do
  docker logs --since "$SCRIPT_START" --timestamps "$name" 2>&1 | tail -n 20000 >"$OUT/logs/$name.log"
done

node "$HERE/summarise.mjs" "$OUT" >"$OUT/summary.json"
cat "$OUT/summary.json"
