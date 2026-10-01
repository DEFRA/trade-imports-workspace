#!/usr/bin/env bash
# Rebuild or restart named services of a running dev-mode stack (the one
# `run-stack.sh -d` starts), with the same compose files and profiles, and
# wait until they report healthy again.
#
#   dev-service.sh rebuild <service>...   rebuild the image from local source
#                                          and recreate the container
#   dev-service.sh restart <service>...   restart the container as it is (it
#                                          keeps its id), for source changes
#                                          the bind mount already carries
#
# Only the named services are touched (--no-deps). Used by `tim build gate`
# when its holder already leases the stack.
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
  print_error "usage: dev-service.sh rebuild|restart <service>..."
}

[ $# -ge 2 ] || { usage; exit 2; }
action="$1"
shift

compose_files_add_dev
profile_args=()
for profile in "${ALL_PROFILES[@]}"; do
  profile_args+=(--profile "$profile")
done

case "$action" in
  rebuild)
    printf '%sRebuilding from local source:%s %s\n' "$COLOUR_BOLD" "$COLOUR_RESET" "$*"
    docker compose "${COMPOSE_FILES[@]}" "${profile_args[@]}" \
      up --build --no-deps --wait --detach "$@"
    ;;
  restart)
    printf '%sRestarting:%s %s\n' "$COLOUR_BOLD" "$COLOUR_RESET" "$*"
    docker compose "${COMPOSE_FILES[@]}" "${profile_args[@]}" restart "$@"
    # A restarted container's health starts again from "starting", so this
    # blocks until each one is healthy, without recreating it.
    docker compose "${COMPOSE_FILES[@]}" "${profile_args[@]}" \
      up --no-deps --no-recreate --wait --detach "$@"
    ;;
  *)
    usage
    exit 2
    ;;
esac
