#!/usr/bin/env bash
# Checks that every stack script answers -h and --help with its usage and
# exit 0, and touches nothing on the way. A fake `docker` first on PATH
# records any call, so a script that reaches Docker before its help fails
# here instead of stopping a real stack.
#
#   bash scripts/stack/help.test.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

fake_bin="$(mktemp -d)"
trap 'rm -rf "$fake_bin"' EXIT
docker_calls="$fake_bin/docker-calls"
cat >"$fake_bin/docker" <<EOF
#!/usr/bin/env bash
echo "docker \$*" >>"$docker_calls"
exit 1
EOF
chmod +x "$fake_bin/docker"

failures=0

fail() {
  printf 'FAIL: %s\n' "$*"
  failures=$((failures + 1))
}

# expect_help <script> <text the help must contain> <args...>
expect_help() {
  local script="$1" expected="$2" output status
  shift 2
  rm -f "$docker_calls"
  status=0
  output="$(PATH="$fake_bin:$PATH" bash "$SCRIPT_DIR/$script" "$@" 2>&1)" || status=$?
  if [ "$status" -ne 0 ]; then
    fail "$script $* exited $status, not 0"
  elif [[ "$output" != *"$expected"* ]]; then
    fail "$script $* did not print '$expected'"
  elif [ -e "$docker_calls" ]; then
    fail "$script $* called docker: $(cat "$docker_calls")"
  else
    printf 'ok: %s %s\n' "$script" "$*"
  fi
}

for flag in -h --help; do
  expect_help run-stack.sh "Usage: run-stack.sh" "$flag"
  expect_help stop-stack.sh "Usage: stop-stack.sh" "$flag"
  expect_help bounce-backend.sh "Usage: bounce-backend.sh" "$flag"
  expect_help dev-service.sh "Usage: dev-service.sh" "$flag"
  expect_help restart-stack.sh "wipes" "$flag"
  expect_help restart-stack.sh "Usage: run-stack.sh" "$flag"
done

# Help given after other flags still stops before anything runs.
expect_help restart-stack.sh "Usage: restart-stack.sh" -d --help
expect_help run-stack.sh "Usage: run-stack.sh" -d --help
expect_help stop-stack.sh "Usage: stop-stack.sh" --timeout 1 --help

# An argument bounce-backend.sh does not take is refused before Docker.
rm -f "$docker_calls"
status=0
PATH="$fake_bin:$PATH" bash "$SCRIPT_DIR/bounce-backend.sh" --bogus >/dev/null 2>&1 || status=$?
if [ "$status" -ne 2 ] || [ -e "$docker_calls" ]; then
  fail "bounce-backend.sh --bogus should exit 2 without calling docker"
else
  printf 'ok: bounce-backend.sh --bogus is refused\n'
fi

if [ "$failures" -gt 0 ]; then
  printf '%d failed\n' "$failures"
  exit 1
fi
printf 'all passed\n'
