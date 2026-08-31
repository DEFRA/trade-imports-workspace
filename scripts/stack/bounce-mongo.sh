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

# Local dev aid for iterating on mongo structure: re-stage the init scripts then
# force-recreate the mongo volume so the next start reseeds from scratch.
#
# The re-stage exists so a reseed picks up locally edited seed fixtures. With no
# local edits under repos/ it adds nothing new; in CI (no repos/ checkout) it
# sparse-fetches the fixtures from GitHub — so the re-stage is never a literal
# no-op, just often a quiet one when run locally with an unchanged tree.
#
# Branch ref matches run-stack.sh's convention: a CI reseed sparse-fetches the
# active branch's fixtures, not the default branch's. Empty falls back to the
# default branch inside stage_init_scripts. Locally repos/ is used regardless.
branch="${1:-${STACK_BRANCH:-}}"
stage_init_scripts "$branch"

# Why this is a remove-wait-up-retry sequence and not one `up --force-recreate`
# (EUDPA-358):
#
# A bare `up --force-recreate` lets compose start the replacement container
# before the outgoing mongod has finished releasing the published host port.
# Roughly one reseed in five on macOS / Docker Desktop, the new container died
# on startup with mongod's own error, not a docker port-allocation error:
#
#   "msg":"Error setting up listener","attr":{"error":{"code":9001,
#     "codeName":"SocketException","errmsg":"setup bind :: caused by ::
#     Address already in use"}}
#   "msg":"Shutting down","attr":{"exitCode":48}
#
# Nothing held 27017 on the host afterwards and an immediate retry worked, so
# it is a shutdown/startup race rather than a real conflict. It has not been
# observed on the ubuntu-latest CI runners (see MONGO_BOUNCE_RETRY below —
# that marker is how we will find out if it happens there too). The treatment
# is the same either way, so nothing here depends on which mechanism it is:
#
#   1. `rm --stop --force --volumes` tears the old container AND its anonymous
#      data volumes down synchronously, which is the actual prevention. It also
#      makes the wipe deliberate instead of a side effect of --renew-anon-volumes.
#   2. Waiting for 27017 to go quiet separates the transient case from a real
#      conflict, so a genuine holder fails fast with an actionable message
#      instead of being retried pointlessly.
#   3. Retrying the `up` covers whatever residual raciness survives 1 and 2.
#
# Dropping the published host port would also cure it, but the port is
# load-bearing for three callers and cannot go:
#   repos/trade-imports-animals-tests/playwright.docker-compose.config.ts
#   repos/trade-imports-animals-tests/bin/update-visual-baselines-linux.sh
#   docker/stack/shared.env
MONGO_HOST_PORT="${MONGO_HOST_PORT:-27017}"
PORT_RELEASE_TIMEOUT_SECONDS=30
UP_ATTEMPTS=3

mongo_compose() {
  docker compose "${COMPOSE_FILES[@]}" --profile database "$@"
}

# Pure-bash TCP probe — no nc, lsof or ss — so it behaves identically on macOS
# (system bash 3.2, Docker Desktop) and on the ubuntu-latest CI runners.
# /dev/tcp is a bash builtin and is NOT available in sh, so this probe must
# stay in this script and never migrate into the tests repo's
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
    print_error "  a host mongod (brew services list) is the usual culprit"
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

# --force-recreate --renew-anon-volumes are kept as belt-and-braces: remove_mongodb
# has already deleted the container and its volumes, but a partially-failed rm
# must still yield a clean container rather than a reused dirty one.
up_mongodb() {
  mongo_compose up --force-recreate --renew-anon-volumes --wait --wait-timeout 180 mongodb
}

# `--wait` only proves the healthcheck passed. It does not prove the anonymous
# volume was really renewed and the init scripts re-ran, which is the whole
# point of a reseed. This asserts the seed document written by
# docker/stack/scripts/mongodb/10-database-setup.js — a deliberate coupling: if
# that script stops inserting into test.test, this assertion must be updated to
# match (or dropped, leaving the retry as the load-bearing part).
assert_seeded() {
  local count
  count="$(mongo_compose exec -T mongodb mongosh --quiet --eval 'db.getSiblingDB("test").test.countDocuments()' | tr -d '[:space:]')"
  case "$count" in
    '' | *[!0-9]*)
      print_error "seed assertion could not read a document count (got: '$count')"
      return 1
      ;;
  esac
  if [ "$count" -lt 1 ]; then
    print_error "mongo started but the init scripts did not seed test.test"
    return 1
  fi
  printf '%sSeed verified (test.test has %s document(s)).%s\n' "$COLOUR_GREEN" "$count" "$COLOUR_RESET"
}

printf '%sBouncing mongo (wipes volume, re-runs init scripts)...%s\n' "$COLOUR_BOLD" "$COLOUR_RESET"

remove_mongodb
wait_for_port_release

attempt=1
while true; do
  if up_mongodb; then
    break
  fi

  if [ "$attempt" -ge "$UP_ATTEMPTS" ]; then
    print_error "mongo failed to start after $UP_ATTEMPTS attempts"
    mongo_compose logs --no-color --tail 50 mongodb >&2 || true
    exit 1
  fi

  # Distinctive marker so CI logs can be searched for this race:
  #   gh run view <id> --log | grep MONGO_BOUNCE_RETRY
  printf '%sMONGO_BOUNCE_RETRY attempt=%s%s\n' "$COLOUR_YELLOW" "$attempt" "$COLOUR_RESET" >&2
  mongo_compose logs --no-color --tail 50 mongodb >&2 || true

  remove_mongodb
  sleep $((attempt * 2))
  wait_for_port_release

  attempt=$((attempt + 1))
done

assert_seeded
