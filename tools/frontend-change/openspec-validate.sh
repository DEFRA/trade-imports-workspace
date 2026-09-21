#!/bin/bash
# Validate one or more Behaviour Spec capabilities with the OpenSpec CLI.
#
# frontend-change calls this at the end of its spec-sync step, once per
# capability it wrote. A non-zero exit is a halt, not a warning.
#
# Two reasons this is a script and not the bare npx line in skill prose:
#   - npx is not allowlisted in .claude/settings.json, so a bare call
#     prompts on every increment; tools/frontend-change/* already is.
#   - it pins the working directory to the workspace root instead of
#     relying on the CLI's upward search from wherever the caller stands.
#
# The @latest pin follows docs/reference/openspec.md — same package,
# same resolution, for everyone.
#
# Only openspec/specs/ is validated. coverage.json has no CLI validator:
# the OpenSpec root does not resolve against openspec/coverage/, which is
# workspace-owned. frontend-change's own coverage self-check is its gate.
#
# Usage:
#   openspec-validate.sh <capability-path> [<capability-path> ...]
#
# Example:
#   openspec-validate.sh live-animals/journey-pages/consignment-addresses

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
OPENSPEC="npx --yes @fission-ai/openspec@latest"

if [[ $# -eq 0 ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'
    [[ $# -eq 0 ]] && exit 1
    exit 0
fi

failures=0

for capability in "$@"; do
    spec="$WORKSPACE/openspec/specs/$capability/spec.md"
    if [[ ! -f "$spec" ]]; then
        echo "FAIL  $capability — no spec.md at openspec/specs/$capability/"
        failures=$((failures + 1))
        continue
    fi

    # --strict is the point: it is what turns a shape warning into a
    # failure. Without it a malformed requirement validates clean.
    output=$( cd "$WORKSPACE" && $OPENSPEC validate "$capability" --strict 2>&1 ) && status=0 || status=$?

    if [[ "$status" -eq 0 ]]; then
        echo "OK    $capability"
    else
        echo "FAIL  $capability"
        echo "$output" | sed 's/^/      /'
        failures=$((failures + 1))
    fi
done

noun="capabilities"
[[ $# -eq 1 ]] && noun="capability"

if [[ "$failures" -gt 0 ]]; then
    echo "FAIL: $failures of $# $noun did not validate"
    exit 1
fi
echo "OK: $# $noun validated"
