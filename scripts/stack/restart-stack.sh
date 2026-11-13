#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$SCRIPT_DIR/lib"

# shellcheck source=lib/colour.sh
source "$LIB_DIR/colour.sh"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [run-stack.sh flags]

Stops the stack with stop-stack.sh, which removes its containers and wipes
its volumes, so every database and queue starts empty. Then starts it again
with run-stack.sh, passing on every flag given here.

run-stack.sh's flags:

USAGE
  "$SCRIPT_DIR/run-stack.sh" --help
}

# Help is answered before anything stops. run-stack.sh answers --help too,
# but only after stop-stack.sh has already torn the stack down.
for arg in "$@"; do
  case "$arg" in
    --) break ;;
    -h | --help)
      usage
      exit 0
      ;;
  esac
done

printf '%sRestarting stack...%s\n' "$COLOUR_BOLD" "$COLOUR_RESET"
"$SCRIPT_DIR/stop-stack.sh" || true
exec "$SCRIPT_DIR/run-stack.sh" "$@"
