#!/usr/bin/env bash
#
# Tests for bounce-mongo.sh against a stubbed `docker` on PATH. No daemon, no
# stack, no mongo. Run: ./scripts/stack/bounce-mongo.test.sh
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBJECT="$SCRIPT_DIR/bounce-mongo.sh"

STUB_DIR="$(mktemp -d)"
trap 'rm -rf "$STUB_DIR"' EXIT

tests_run=0
tests_failed=0

# The stub. Scenario is driven entirely by STUB_* environment variables so each
# test can set up its own world without touching the filesystem.
cat >"$STUB_DIR/docker" <<'STUB'
#!/usr/bin/env bash
# Stubbed docker. Recognises the five shapes bounce-mongo.sh actually invokes.

if [ "${1:-}" = 'ps' ]; then
  printf '%s' "${STUB_PS_OUTPUT:-}"
  exit 0
fi

subcommand=''
for arg in "$@"; do
  case "$arg" in
    up | rm | logs | exec)
      subcommand="$arg"
      break
      ;;
  esac
done

case "$subcommand" in
  up)
    attempts_file="${STUB_STATE_DIR}/up-attempts"
    attempts=0
    [ -f "$attempts_file" ] && attempts="$(cat "$attempts_file")"
    attempts=$((attempts + 1))
    printf '%s' "$attempts" >"$attempts_file"
    if [ "$attempts" -le "${STUB_UP_FAILURES:-0}" ]; then
      echo "stub: mongodb exited (48)" >&2
      exit 1
    fi
    exit 0
    ;;
  rm)
    exit 0
    ;;
  logs)
    # STUB_LOGS_AFTER withholds the marker until the Nth call, standing in for
    # the entrypoint's output not having reached `compose logs` yet.
    if [ -n "${STUB_LOGS_AFTER:-}" ]; then
      calls_file="${STUB_STATE_DIR}/logs-calls"
      calls=0
      [ -f "$calls_file" ] && calls="$(cat "$calls_file")"
      calls=$((calls + 1))
      printf '%s' "$calls" >"$calls_file"
      if [ "$calls" -lt "$STUB_LOGS_AFTER" ]; then
        printf 'Waiting for connections\n'
        exit 0
      fi
    fi
    printf '%s\n' "${STUB_LOGS:-}"
    exit 0
    ;;
  exec)
    js="${!#}"
    case "$js" in
      *isWritablePrimary*)
        printf '%s\n' "${STUB_PRIMARY:-true}"
        exit "${STUB_PRIMARY_STATUS:-0}"
        ;;
      *countDocuments*)
        printf '%s\n' "${STUB_COUNT:-1}"
        exit "${STUB_COUNT_STATUS:-0}"
        ;;
    esac
    exit 0
    ;;
esac
exit 0
STUB
chmod +x "$STUB_DIR/docker"

PATH="$STUB_DIR:$PATH"
export PATH

# Harness
fail() {
  tests_failed=$((tests_failed + 1))
  printf '  FAIL: %s\n' "$1" >&2
}

start_case() {
  tests_run=$((tests_run + 1))
  printf '• %s\n' "$1"
  STUB_STATE_DIR="$(mktemp -d "$STUB_DIR/case.XXXXXX")"
  export STUB_STATE_DIR
  unset STUB_UP_FAILURES STUB_LOGS STUB_COUNT STUB_COUNT_STATUS \
    STUB_PRIMARY STUB_PRIMARY_STATUS STUB_PS_OUTPUT STUB_LOGS_AFTER
  # Reset anything a previous case tuned, so no case inherits another's world.
  UP_ATTEMPTS="${DEFAULT_UP_ATTEMPTS:-6}"
}

up_attempt_count() {
  if [ -f "$STUB_STATE_DIR/up-attempts" ]; then
    cat "$STUB_STATE_DIR/up-attempts"
  else
    printf '0'
  fi
}

# Source the subject in a subshell-free way. bounce-mongo.sh guards its own
# main, so sourcing gets the functions and none of the behaviour.
# A high, unused port keeps the /dev/tcp probe instant and independent of
# whatever is really running on the machine.
export MONGO_HOST_PORT=59117
export MONGO_RETRY_BACKOFF_SECONDS=0
export MONGO_PORT_RELEASE_TIMEOUT_SECONDS=2
export MONGO_PRIMARY_TIMEOUT_SECONDS=2
export MONGO_MARKER_TIMEOUT_SECONDS=3
export NO_COLOR=1
# shellcheck source=bounce-mongo.sh
source "$SUBJECT"

# The subject sets `set -e` for its own run, and sourcing applies that to this
# shell too. Most cases here deliberately drive a function to a non-zero
# return, so turn it back off or the harness dies on its first red case.
set +e

# The shipped retry budget, read from a pristine subshell. Cases below assign
# UP_ATTEMPTS to exercise loop mechanics, and those assignments would otherwise
# leak into the assertion about the default and make it vacuous.
DEFAULT_UP_ATTEMPTS="$(
  unset UP_ATTEMPTS MONGO_UP_ATTEMPTS
  # shellcheck source=bounce-mongo.sh
  source "$SUBJECT"
  printf '%s' "$UP_ATTEMPTS"
)"

# start_mongodb_with_retries
start_case 'a clean start runs up exactly once and does not retry'
output="$(start_mongodb_with_retries 2>&1)"
status=$?
[ "$status" -eq 0 ] || fail "expected success, got $status"
[ "$(up_attempt_count)" = '1' ] || fail "expected 1 up, got $(up_attempt_count)"
case "$output" in *MONGO_BOUNCE_RETRY*) fail 'retried a start that succeeded' ;; esac

start_case 'a start that loses the race twice is retried and then succeeds'
export STUB_UP_FAILURES=2
output="$(start_mongodb_with_retries 2>&1)"
status=$?
# This is the regression test for the fix. Collapse the loop back to a single
# `up --force-recreate` and this case fails.
[ "$status" -eq 0 ] || fail "expected the retry to recover, got $status"
[ "$(up_attempt_count)" = '3' ] || fail "expected 3 ups, got $(up_attempt_count)"
retries="$(printf '%s\n' "$output" | grep -c 'MONGO_BOUNCE_RETRY')"
[ "$retries" -eq 2 ] || fail "expected 2 retry markers, got $retries"

start_case 'a start that never succeeds gives up after exactly UP_ATTEMPTS'
UP_ATTEMPTS=4
export STUB_UP_FAILURES=99
output="$(start_mongodb_with_retries 2>&1)"
status=$?
[ "$status" -eq 1 ] || fail "expected failure, got $status"
[ "$(up_attempt_count)" = '4' ] || fail "expected 4 ups, got $(up_attempt_count)"
case "$output" in
  *'left in place on purpose'*) ;;
  *) fail 'the give-up message does not say the container is left behind' ;;
esac

start_case 'the shipped retry budget survives the observed 1-in-5 failure rate'
# Guards the acceptance criterion rather than the code. Three attempts blows a
# ten-reseed soak about once in 13; six attempts about once in 26,000. Read
# from a pristine subshell, so tuning above cannot make this vacuous.
[ "$DEFAULT_UP_ATTEMPTS" -ge 5 ] ||
  fail "shipped UP_ATTEMPTS is $DEFAULT_UP_ATTEMPTS, too few for a 10-reseed soak"

start_case 'main wires the reseed through the retry loop, not a bare up'
# Without this, main could call up_mongodb directly and every case above would
# still pass, because they exercise start_mongodb_with_retries in isolation.
stage_init_scripts() { :; }
export STUB_UP_FAILURES=2
export STUB_LOGS='MongoDB init process complete; ready for start up.'
export STUB_COUNT=1
export STUB_PRIMARY=true
main >/dev/null 2>&1
status=$?
[ "$status" -eq 0 ] || fail "expected main to recover from the race, got $status"
[ "$(up_attempt_count)" = '3' ] || fail "expected 3 ups from main, got $(up_attempt_count)"

# assert_volume_was_wiped
start_case 'a fresh volume is recognised by the entrypoint marker'
export STUB_LOGS='MongoDB init process complete; ready for start up.'
assert_volume_was_wiped >/dev/null 2>&1 || fail 'a genuinely wiped volume was rejected'

start_case 'a stale volume is rejected even though it still holds seed data'
# The case the old document-count assertion could not catch: the previous
# run's seed document survives, so counting passes on exactly the broken state.
export STUB_LOGS='Waiting for connections'
export STUB_COUNT=1
output="$(assert_volume_was_wiped 2>&1)"
status=$?
[ "$status" -eq 1 ] || fail 'a stale volume was accepted'
case "$output" in
  *'was NOT wiped'*) ;;
  *) fail 'the stale-volume error does not name the problem' ;;
esac

start_case 'a marker that reaches the log late is waited for, not failed on'
# The regression this guards: reading the log once failed a CI shard on a
# database that had been wiped correctly, because the entrypoint's output had
# not reached `compose logs` yet. Drop the poll and this case fails.
export STUB_LOGS='MongoDB init process complete; ready for start up.'
export STUB_LOGS_AFTER=3
assert_volume_was_wiped >/dev/null 2>&1 ||
  fail 'a marker that appeared a moment later was treated as a stale volume'

# assert_seeded
start_case 'a seeded database passes'
export STUB_COUNT=3
assert_seeded >/dev/null 2>&1 || fail 'a seeded database was rejected'

start_case 'an empty seed collection fails'
export STUB_COUNT=0
assert_seeded >/dev/null 2>&1
[ $? -eq 1 ] || fail 'an unseeded database was accepted'

start_case 'a mongosh error is reported, not swallowed by set -e'
# Regression test for the unreachable error handling: the assignment used to
# carry the failure and abort the script before the friendly message ran.
export STUB_COUNT='MongoServerError: not primary and secondaryOk=false'
export STUB_COUNT_STATUS=1
output="$(assert_seeded 2>&1)"
status=$?
[ "$status" -eq 1 ] || fail "expected a handled failure, got $status"
case "$output" in
  *'could not query mongo'*) ;;
  *) fail 'a failing mongosh did not produce the readable error' ;;
esac
case "$output" in
  *'not primary'*) ;;
  *) fail 'the readable error drops the underlying mongosh message' ;;
esac

start_case 'non-numeric mongosh output is reported'
export STUB_COUNT='undefined'
output="$(assert_seeded 2>&1)"
status=$?
[ "$status" -eq 1 ] || fail "expected a handled failure, got $status"
case "$output" in
  *'did not get a document count'*) ;;
  *) fail 'junk output was not reported' ;;
esac

# wait_for_primary
start_case 'a writable primary is accepted'
export STUB_PRIMARY=true
wait_for_primary >/dev/null 2>&1 || fail 'a writable primary was rejected'

start_case 'a node still electing is waited out and then reported'
# The healthcheck passes while the node is STARTUP2/SECONDARY, so this is the
# window in which a direct read would have failed with NotPrimaryNoSecondaryOk.
export STUB_PRIMARY=false
output="$(wait_for_primary 2>&1)"
status=$?
[ "$status" -eq 1 ] || fail 'a non-primary node was accepted as ready'
case "$output" in
  *'writable primary'*) ;;
  *) fail 'the election timeout does not explain itself' ;;
esac

printf '\n%s case(s), %s failure(s)\n' "$tests_run" "$tests_failed"
[ "$tests_failed" -eq 0 ]
