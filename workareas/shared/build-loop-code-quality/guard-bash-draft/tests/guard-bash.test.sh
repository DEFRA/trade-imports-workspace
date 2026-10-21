#!/bin/bash
set -u

HOOK=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
FAILURES=0
PASSES=0

decision_for() {
  local command=$1 cwd=$2 output
  output=$(jq -n --arg command "$command" --arg cwd "$cwd" '{tool_input:{command:$command},cwd:$cwd}' | bash "$HOOK")
  if [ -z "$output" ]; then
    printf 'allow'
  else
    printf '%s' "$output" | jq -r '.hookSpecificOutput.permissionDecision'
  fi
}

expect() {
  local wanted=$1 command=$2 cwd=${3:-$PWD} actual
  actual=$(decision_for "$command" "$cwd")
  if [ "$actual" = "$wanted" ]; then
    PASSES=$((PASSES + 1))
    printf 'ok    %-5s %s\n' "$wanted" "$command"
  else
    FAILURES=$((FAILURES + 1))
    printf 'FAIL  wanted %s, got %s: %s\n' "$wanted" "$actual" "$command"
  fi
}

SCRATCH=$(mktemp -d)
trap 'rm -rf "$SCRATCH"' EXIT

REPO=$SCRATCH/repo
REMOTE=$SCRATCH/remote.git
git init -q --bare "$REMOTE"
git init -q "$REPO"
git -C "$REPO" config user.email test@example.com
git -C "$REPO" config user.name test
printf '#!/bin/bash\necho committed\n' > "$REPO/committed.sh"
git -C "$REPO" add committed.sh
git -C "$REPO" commit -q -m "add committed script"
git -C "$REPO" remote add origin "$REMOTE"
git -C "$REPO" push -q origin HEAD:main
printf '#!/bin/bash\necho untracked\n' > "$REPO/untracked.sh"

echo "== chmod"
expect deny "chmod +x tools/x.sh"
expect deny "sudo chmod 755 x.sh"
expect deny "find . -name '*.sh' -exec chmod +x {} ;"
expect deny "ls | xargs chmod +x"

echo "== path-invoked executables"
expect allow "./committed.sh" "$REPO"
expect deny "./untracked.sh" "$REPO"
expect deny "echo \$(./untracked.sh)" "$REPO"

echo "== secret reads"
expect deny "jq . ~/.aws/credentials"
expect deny "grep token repo/.env"
expect allow "jq . package.json"

echo "== git commit guards"
expect deny "git commit --no-verify -m x"
expect deny "git commit --amend --no-edit" "$REPO"

echo "== foot-gun redirects"
expect deny "ls /Users/someone/git"
expect allow "ls ~/git"
expect deny "npx playwright test tests/a.spec.js"
expect deny "git status && git log"
expect allow "awk 'NR>=10 && NR<=20' file.txt"
expect deny "cd repos/x
git push"
expect allow "git -C repos/x push"

echo "== test run piped into a trimmer"
expect deny "npm test | tail -20"
expect deny "npm test 2>&1 | tail -40"
expect deny "npm --prefix ~/git/defra/trade-imports-workspace/repos/a run test:ci 2>&1 | tail"
expect deny "npm run test | grep FAIL"
expect deny "npm test|head"
expect deny "npm test |& tail"
expect deny "npx vitest run | grep -E 'FAIL|passed'"
expect deny "mvn -f ~/git/defra/trade-imports-workspace/repos/b/pom.xml verify | tail -50"
expect deny "./mvnw test | grep ERROR"
expect deny "npm --prefix x exec playwright test | tail"
expect allow "npm test > ~/git/defra/trade-imports-workspace/workareas/a/test.log 2>&1"
expect allow "mvn -f x/pom.xml verify > out.log 2>&1"
expect allow "npm run lint | tail"
expect allow "git log --oneline | head -5"
expect allow "cat test.log | grep FAIL"
expect allow "grep -c 'npm test | tail' notes.md"
expect allow "npm test || true"

printf '\n%d passed, %d failed\n' "$PASSES" "$FAILURES"
[ "$FAILURES" -eq 0 ]
