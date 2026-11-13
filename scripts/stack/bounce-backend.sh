#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STACK_DIR="$WORKSPACE_ROOT/docker/stack"
LIB_DIR="$SCRIPT_DIR/lib"

# shellcheck source=lib/colour.sh
source "$LIB_DIR/colour.sh"
# shellcheck source=lib/compose.sh
source "$LIB_DIR/compose.sh"

usage() {
  cat <<USAGE
Usage: $(basename "$0")

Recreates the trade-imports-animals-backend container on its own, without
its dependencies, and waits until it is healthy. Use it after a pom.xml or
dependency change, which hot reload does not pick up. Data is kept.

  -h, --help    Show this help.
USAGE
}

case "${1-}" in
  -h | --help)
    usage
    exit 0
    ;;
  "") ;;
  *)
    print_error "error: unexpected argument: $1"
    usage >&2
    exit 2
    ;;
esac

[ -f "$STACK_DIR/dev.compose.yml" ] && compose_files_add_dev
profile_args=()
for profile in "${ALL_PROFILES[@]}"; do
  profile_args+=(--profile "$profile")
done

printf '%sBouncing backend (force-recreate, no-deps)...%s\n' "$COLOUR_BOLD" "$COLOUR_RESET"
exec docker compose "${COMPOSE_FILES[@]}" "${profile_args[@]}" up --force-recreate --no-deps --wait trade-imports-animals-backend
