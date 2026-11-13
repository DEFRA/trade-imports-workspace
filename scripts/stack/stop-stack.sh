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
Usage: $(basename "$0") [<docker compose down args>]

Stops the whole stack, every profile included, and removes its containers,
its volumes and any orphan containers. Every database and queue is wiped.
Anything given is passed on to \`docker compose ... down\`.

  -h, --help    Show this help.
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --) break ;;
    -h | --help)
      usage
      exit 0
      ;;
  esac
done

profile_args=()
for profile in "${ALL_PROFILES[@]}" "${OPT_IN_PROFILES[@]}"; do
  profile_args+=(--profile "$profile")
done

printf '%sTearing down stack...%s\n' "$COLOUR_BOLD" "$COLOUR_RESET"
exec docker compose "${COMPOSE_FILES[@]}" "${profile_args[@]}" down --volumes --remove-orphans "$@"
