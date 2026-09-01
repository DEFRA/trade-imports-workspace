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
# shellcheck source=lib/init-scripts.sh
source "$LIB_DIR/init-scripts.sh"

# Wipes the mongo volume and re-runs the init scripts.
#
# The retry loop is load-bearing (EUDPA-358). On a fresh volume the mongo image
# runs a temporary mongod over /docker-entrypoint-initdb.d before exec'ing the
# real one. We set no MONGO_INITDB_ROOT_* vars, so the entrypoint leaves
# --replSet on that temporary instance and it is PRIMARY when shut down;
# standing down can outlive `--shutdown` returning, and the real mongod then
# binds 27017 too early and exits 48. Fresh volumes only, any platform, and
# nothing outside the container can prevent it. Retrying is the fix.

MONGO_HOST_PORT="${MONGO_HOST_PORT:-27017}"
PORT_RELEASE_TIMEOUT_SECONDS="${MONGO_PORT_RELEASE_TIMEOUT_SECONDS:-30}"
UP_ATTEMPTS="${MONGO_UP_ATTEMPTS:-6}"
UP_WAIT_TIMEOUT_SECONDS="${MONGO_UP_WAIT_TIMEOUT_SECONDS:-90}"
RETRY_BACKOFF_SECONDS="${MONGO_RETRY_BACKOFF_SECONDS:-2}"
PRIMARY_TIMEOUT_SECONDS="${MONGO_PRIMARY_TIMEOUT_SECONDS:-60}"

# Logged by the entrypoint only when it ran the init scripts, i.e. only on a
# fresh volume.
INITDB_COMPLETE_MARKER='MongoDB init process complete'

mongo_compose() {
  docker compose "${COMPOSE_FILES[@]}" --profile database "$@"
}

mongosh_eval() {
  mongo_compose exec -T mongodb mongosh --quiet --eval "$1"
}

# /dev/tcp is a bash builtin, so this must not migrate into the tests repo's
# bin/database-reseed.sh, which is #!/bin/sh.
port_is_open() {
  (exec 3<>"/dev/tcp/127.0.0.1/$MONGO_HOST_PORT") 2>/dev/null
}

report_port_holder() {
  local holder
  holder="$(docker ps --format '{{.Names}} ({{.Image}})' --filter "publish=$MONGO_HOST_PORT" | head -1)"
  if [ -n "$holder" ]; then
    print_error "port $MONGO_HOST_PORT is published by container: $holder"
    print_error "  stop it, or run this against the stack that owns it"
  else
    print_error "something outside the stack is listening on 127.0.0.1:$MONGO_HOST_PORT"
    print_error "  macOS: lsof -nP -iTCP:$MONGO_HOST_PORT -sTCP:LISTEN"
    print_error "  Linux: ss -ltnp 'sport = :$MONGO_HOST_PORT'"
  fi
}

wait_for_port_release() {
  local waited=0
  while port_is_open; do
    if [ "$waited" -ge "$PORT_RELEASE_TIMEOUT_SECONDS" ]; then
      print_error "port $MONGO_HOST_PORT still in use after ${PORT_RELEASE_TIMEOUT_SECONDS}s"
      report_port_holder
      return 1
    fi
    sleep 1
    waited=$((waited + 1))
  done
}

remove_mongodb() {
  mongo_compose rm --stop --force --volumes mongodb >/dev/null
}

up_mongodb() {
  mongo_compose up --force-recreate --renew-anon-volumes --wait \
    --wait-timeout "$UP_WAIT_TIMEOUT_SECONDS" mongodb
}

start_mongodb_with_retries() {
  local attempt=1
  while true; do
    if up_mongodb; then
      return 0
    fi

    if [ "$attempt" -ge "$UP_ATTEMPTS" ]; then
      print_error "mongo failed to start after $UP_ATTEMPTS attempts"
      print_error "  the failed container is left in place on purpose, so read its logs"
      mongo_compose logs --no-color --tail 50 mongodb >&2 || true
      return 1
    fi

    # Greppable in CI logs.
    printf '%sMONGO_BOUNCE_RETRY attempt=%s%s\n' "$COLOUR_YELLOW" "$attempt" "$COLOUR_RESET" >&2
    mongo_compose logs --no-color --tail 50 mongodb >&2 || true

    remove_mongodb
    sleep $((attempt * RETRY_BACKOFF_SECONDS))
    wait_for_port_release

    attempt=$((attempt + 1))
  done
}

# The healthcheck passes as soon as the node has a replica-set config, which can
# be before the election. Reads against a non-primary fail, so wait for it.
wait_for_primary() {
  local waited=0 answer
  while [ "$waited" -lt "$PRIMARY_TIMEOUT_SECONDS" ]; do
    if answer="$(mongosh_eval 'db.hello().isWritablePrimary' 2>/dev/null)"; then
      if [ "$(printf '%s' "$answer" | tr -d '[:space:]')" = 'true' ]; then
        return 0
      fi
    fi
    sleep 1
    waited=$((waited + 1))
  done
  print_error "mongo did not become writable primary within ${PRIMARY_TIMEOUT_SECONDS}s"
  return 1
}

# A stale volume still carries the previous run's seed, so counting documents
# cannot prove a wipe. The entrypoint's marker can.
assert_volume_was_wiped() {
  local logs
  if ! logs="$(mongo_compose logs --no-color mongodb 2>/dev/null)"; then
    print_error "could not read the mongo container log to verify the reseed"
    return 1
  fi
  case "$logs" in
    *"$INITDB_COMPLETE_MARKER"*) return 0 ;;
  esac
  print_error "mongo started but its entrypoint never ran the init scripts"
  print_error "  the data volume was NOT wiped — this container carries stale data"
  return 1
}

# Asserts the document written by docker/stack/scripts/mongodb/10-database-setup.js.
assert_seeded() {
  local raw count
  if ! raw="$(mongosh_eval 'db.getSiblingDB("test").test.countDocuments()' 2>&1)"; then
    print_error "seed assertion could not query mongo:"
    print_error "  $raw"
    return 1
  fi
  count="$(printf '%s' "$raw" | tr -d '[:space:]')"
  case "$count" in
    '' | *[!0-9]*)
      print_error "seed assertion did not get a document count (got: '$count')"
      return 1
      ;;
  esac
  if [ "$count" -lt 1 ]; then
    print_error "mongo started but the init scripts did not seed test.test"
    return 1
  fi
  printf '%sSeed verified (test.test has %s document(s)).%s\n' "$COLOUR_GREEN" "$count" "$COLOUR_RESET"
}

main() {
  local branch="${1:-${STACK_BRANCH:-}}"
  stage_init_scripts "$branch"

  printf '%sBouncing mongo (wipes volume, re-runs init scripts)...%s\n' "$COLOUR_BOLD" "$COLOUR_RESET"

  remove_mongodb
  wait_for_port_release
  start_mongodb_with_retries
  wait_for_primary
  assert_volume_was_wiped
  assert_seeded
}

# Sourced by bounce-mongo.test.sh; only bounce when executed directly.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
