#!/usr/bin/env bash
# Re-derive summary.json from artefacts already on disk, without re-running anything.
#
#   tools/e2e-stability/resummarise.sh            # every run
#   tools/e2e-stability/resummarise.sh w16-02 ...  # named runs
#
# Use this after changing summarise.mjs: the raw capture (report.json, stats.tsv,
# host.tsv, container logs) is the record, and summary.json is only a derivation of
# it, so a fixed derivation should be reapplied rather than re-measured.
set -uo pipefail

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
HERE="$WORKSPACE/tools/e2e-stability"
RUNS="$WORKSPACE/workareas/shared/e2e-stability/runs"

if [ "$#" -gt 0 ]; then
  targets=("$@")
else
  targets=()
  for dir in "$RUNS"/*/; do
    [ -d "$dir" ] && targets+=("$(basename "$dir")")
  done
fi

failed=0
for label in "${targets[@]}"; do
  out="$RUNS/$label"
  if [ ! -d "$out" ]; then
    echo "skip $label — no such run directory"
    failed=1
    continue
  fi
  if node "$HERE/summarise.mjs" "$out" >"$out/summary.json.new" 2>"$out/summary.err"; then
    mv "$out/summary.json.new" "$out/summary.json"
    rm -f "$out/summary.err"
    echo "ok   $label"
  else
    rm -f "$out/summary.json.new"
    echo "FAIL $label — see $out/summary.err"
    failed=1
  fi
done

exit "$failed"
