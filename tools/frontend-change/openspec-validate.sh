#!/bin/bash
# Validate one or more Behaviour Spec capabilities with the OpenSpec CLI.
#
# frontend-change calls this at the end of its spec-sync step, once per
# capability it wrote. A non-zero exit is a halt, not a warning.
#
# Two reasons this is a script and not the bare npx line in skill prose:
#   - npx is not allowlisted in .claude/settings.json, so a bare call
#     prompts on every increment; tools/frontend-change/* already is.
#   - it pins the working directory to a named checkout instead of
#     relying on the CLI's upward search from wherever the caller stands.
#
# --root is load-bearing, not a convenience. journey-builder writes the
# spec into the run's workspace worktree; without --root this would cd to
# the main checkout and validate ITS copy of the same capability — green
# against a file the increment never wrote, which is the exact class of
# false pass the validate step exists to stop. A root with no
# openspec/specs/ under it is rejected rather than walked up from.
#
# The @latest pin follows docs/reference/openspec.md — same package,
# same resolution, for everyone.
#
# Only openspec/specs/ is validated. coverage.json has no CLI validator:
# the OpenSpec root does not resolve against openspec/coverage/, which is
# workspace-owned. frontend-change's own coverage self-check is its gate.
#
# Usage:
#   openspec-validate.sh [--root <checkout>] <capability-path> [<capability-path> ...]
#
# Example:
#   openspec-validate.sh live-animals/journey-pages/consignment-addresses

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
OPENSPEC="npx --yes @fission-ai/openspec@latest"

# Print the header comment block and stop at the first line that is not a
# comment — a hardcoded line range silently starts leaking code the moment
# the header changes length.
usage() {
    awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"
}

ROOT="$WORKSPACE"
CAPABILITIES=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --root) ROOT="$2"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        -*) echo "Unknown arg: $1" >&2; usage >&2; exit 1 ;;
        *) CAPABILITIES+=("$1"); shift ;;
    esac
done

if [[ ${#CAPABILITIES[@]} -eq 0 ]]; then
    usage >&2
    exit 1
fi

if [[ ! -d "$ROOT/openspec/specs" ]]; then
    echo "Error: --root $ROOT has no openspec/specs/ — not a spec root" >&2
    exit 1
fi

failures=0

for capability in "${CAPABILITIES[@]}"; do
    spec="$ROOT/openspec/specs/$capability/spec.md"
    if [[ ! -f "$spec" ]]; then
        echo "FAIL  $capability — no spec.md at openspec/specs/$capability/"
        failures=$((failures + 1))
        continue
    fi

    # --strict is the point: it is what turns a shape warning into a
    # failure. Without it a malformed requirement validates clean.
    output=$( cd "$ROOT" && $OPENSPEC validate "$capability" --strict 2>&1 ) && status=0 || status=$?

    if [[ "$status" -eq 0 ]]; then
        echo "OK    $capability"
    else
        echo "FAIL  $capability"
        echo "$output" | sed 's/^/      /'
        failures=$((failures + 1))
    fi
done

count=${#CAPABILITIES[@]}
noun="capabilities"
[[ "$count" -eq 1 ]] && noun="capability"

echo "Root: $ROOT"
if [[ "$failures" -gt 0 ]]; then
    echo "FAIL: $failures of $count $noun did not validate"
    exit 1
fi
echo "OK: $count $noun validated"
