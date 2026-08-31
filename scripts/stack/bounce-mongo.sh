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

# Why this is a retry loop and not one `up --force-recreate` (EUDPA-358).
#
# Roughly one reseed in five, the new mongo container died on startup with
# mongod's own error:
#
#   "msg":"Error setting up listener","attr":{"error":{"code":9001,
#     "codeName":"SocketException","errmsg":"setup bind :: caused by ::
#     Address already in use"}}
#   "msg":"Shutting down","attr":{"exitCode":48}
#
# That is NOT the outgoing container holding the published host port, which is
# what an earlier revision of this comment claimed. database.compose.yml
# publishes 27017 from a bridge network, so every container gets its own
# network namespace and no outgoing container can occupy the incoming one's
# in-container 27017. A genuine host-side clash also looks nothing like the
# above: the daemon refuses the container with "Bind for 0.0.0.0:27017 failed:
# port is already allocated", and mongod never starts at all.
#
# The collision is INSIDE the new container, and it is the mongo image's own
# entrypoint racing itself. On a fresh /data/db, docker-entrypoint.sh in
# mongo:7.0 seeds before it serves:
#
#   mongod --bind_ip 127.0.0.1 --port 27017 ... --fork   # temporary instance
#   ...                                                  # runs initdb.d/*.js
#   mongod ... --shutdown
#   exec mongod --replSet rs0 --bind_ip_all              # the real one
#
# The entrypoint only strips --replSet from that temporary instance when
# MONGO_INITDB_ROOT_USERNAME and MONGO_INITDB_ROOT_PASSWORD are both set, and
# we set neither. So the temporary instance is a replica-set member,
# scripts/mongodb/10-database-setup.js calls rs.initiate() and blocks until it
# is primary, and the instance is therefore a PRIMARY when it is asked to shut
# down. Standing down and closing connections is exactly the shutdown that can
# outlive `--shutdown` returning. When it does, the exec'd real mongod binds
# 27017 a moment too early and exits 48.
#
# Three consequences shape everything below:
#
#   * It happens only on a fresh volume, because that is the only time the
#     entrypoint runs a temporary instance at all. That is why it bites
#     reseeds and nothing else.
#   * It is platform-independent. Nothing about it is macOS or Docker Desktop.
#   * Nothing outside the container can prevent it. RETRYING THE `up` IS THE
#     FIX, and is the only load-bearing part of this script. Do not tidy the
#     loop away as belt-and-braces; it is the belt.
#
# The other two steps are useful but are NOT prevention, and must not be
# mistaken for it:
#
#   1. `rm --stop --force --volumes` makes the wipe deliberate and synchronous
#      instead of a side effect of --renew-anon-volumes. A reseed that quietly
#      failed to wipe is a worse bug than a slow one.
#   2. `wait_for_port_release` fails fast on a GENUINE foreign holder of the
#      published port — a brew-services mongod, a second stack. On a normal run
#      it finds the port free immediately and does nothing for the race above.
#
# The published host port is load-bearing for three callers and cannot be
# dropped:
#   repos/trade-imports-animals-tests/playwright.docker-compose.config.ts
#   repos/trade-imports-animals-tests/bin/update-visual-baselines-linux.sh
#   docker/stack/shared.env

# Must match the host side of database.compose.yml's `ports:` mapping. Only the
# foreign-holder diagnostic reads it, so drift degrades that check rather than
# breaking a reseed.
MONGO_HOST_PORT="${MONGO_HOST_PORT:-27017}"
PORT_RELEASE_TIMEOUT_SECONDS="${MONGO_PORT_RELEASE_TIMEOUT_SECONDS:-30}"

# At the observed 1-in-5 failure rate, and with attempts independent (every
# retry wipes the volume, so the race is drawn afresh), the odds of all six
# failing are 0.2^6 — about 6 in 100,000 per reseed. Three attempts would blow
# a ten-reseed soak roughly once in every 13 soaks, which is inside the range
# the acceptance criteria have to survive.
UP_ATTEMPTS="${MONGO_UP_ATTEMPTS:-6}"

# The realistic failure exits the container within seconds, so this is a
# ceiling for a hung start rather than the normal path. Six attempts at this
# timeout stay well inside e2e-tests.yml's 30-minute job budget.
UP_WAIT_TIMEOUT_SECONDS="${MONGO_UP_WAIT_TIMEOUT_SECONDS:-90}"
RETRY_BACKOFF_SECONDS="${MONGO_RETRY_BACKOFF_SECONDS:-2}"
PRIMARY_TIMEOUT_SECONDS="${MONGO_PRIMARY_TIMEOUT_SECONDS:-60}"

# Printed by the mongo entrypoint only when it actually ran a temporary
# instance over /docker-entrypoint-initdb.d — that is, only on a fresh volume.
INITDB_COMPLETE_MARKER='MongoDB init process complete'

mongo_compose() {
  docker compose "${COMPOSE_FILES[@]}" --profile database "$@"
}

mongosh_eval() {
  mongo_compose exec -T mongodb mongosh --quiet --eval "$1"
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
      print_error "  the failed container is left in place on purpose so its logs"
      print_error "  can be read; the stack has no working database until this"
      print_error "  script is rerun or the stack is restarted"
      mongo_compose logs --no-color --tail 50 mongodb >&2 || true
      return 1
    fi

    # Distinctive marker so CI logs can be searched for this race:
    #   gh run view <id> --log | grep MONGO_BOUNCE_RETRY
    printf '%sMONGO_BOUNCE_RETRY attempt=%s%s\n' "$COLOUR_YELLOW" "$attempt" "$COLOUR_RESET" >&2
    mongo_compose logs --no-color --tail 50 mongodb >&2 || true

    remove_mongodb
    sleep $((attempt * RETRY_BACKOFF_SECONDS))
    wait_for_port_release

    attempt=$((attempt + 1))
  done
}

# `up --wait` only waits for the healthcheck, and database.compose.yml's
# healthcheck is `try { rs.status().ok } catch(e) { rs.initiate(...).ok }`,
# which stops throwing as soon as the node has a replica-set config — so it can
# pass while the node is still STARTUP2 or SECONDARY after the real mongod
# takes over from the entrypoint's temporary instance. A read against a
# non-primary on a direct connection fails with NotPrimaryNoSecondaryOk, so
# wait for the election before asserting anything.
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

# `--wait` proves the healthcheck passed. It does not prove the anonymous
# volume was renewed and the init scripts re-ran, which is the entire point of
# a reseed. Counting seed documents cannot prove it either: a stale volume
# still carries the previous run's seed document, so a count would pass on
# exactly the state it is supposed to reject. The entrypoint's own marker is
# the only direct evidence that the volume really was fresh.
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
  print_error "  (no '$INITDB_COMPLETE_MARKER' in the container log)"
  print_error "  the data volume was NOT wiped — this container carries stale data"
  return 1
}

# Second post-condition: the init scripts ran (asserted above) AND the seed
# fixtures actually applied. This asserts the document written by
# docker/stack/scripts/mongodb/10-database-setup.js — a deliberate coupling: if
# that script stops inserting into test.test, update this assertion to match.
assert_seeded() {
  local raw count
  # Captured on its own line, and guarded, because `set -e` would otherwise
  # abort the script on a failing assignment and leave nothing but raw mongosh
  # stderr for the reader.
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
  # Branch ref matches run-stack.sh's convention: a CI reseed sparse-fetches the
  # active branch's fixtures, not the default branch's. Empty falls back to the
  # default branch inside stage_init_scripts. Locally repos/ is used regardless.
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

# Sourced by bounce-mongo.test.sh, which exercises the functions above against
# a stubbed `docker` on PATH. Only bounce when executed directly.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
