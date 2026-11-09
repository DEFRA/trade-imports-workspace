#!/bin/bash
# Canonical, shared copy — referenced by every repo's .claude/settings.json via
# its absolute $HOME path (see docs/agent-onboarding.md / CLAUDE.md's tools/
# convention), not duplicated per repo. Edit this one file to change the
# check for all repos at once.
#
# PreToolUse(Bash) hook: before a `git push` is allowed to run, do a full
# local build + test + SonarCloud analysis (the same scanner CI uses — NOT
# the server-side "Agentic Analysis"/Vortex feature, which this org's
# SonarCloud plan does not have licensed) and block the push if the quality
# gate fails.
#
# Runs as ONE build, not two: for Java, `mvn clean verify sonar:sonar` is a
# single Maven invocation — clean/compile/test and the sonar:sonar goal all
# run in the same reactor build, reusing the same compiled classes and
# JaCoCo output; it does not compile or test twice. For Node, `npm test`
# produces coverage once and `sonar-scanner` only statically analyses
# source + that existing coverage file afterwards — it does not re-run the
# test suite.
#
# Requires SONAR_TOKEN in the environment (a SonarCloud personal token). If
# it isn't set, or `jq`/`gh` aren't available, the check is skipped rather
# than blocking — a missing local prerequisite should not stop you from
# pushing; CI is still the authoritative gate either way.
#
# Runs with cwd = the repo you're pushing from (Claude Code hooks run in the
# calling project's directory), so the relative checks below (pom.xml,
# package.json, sonar-project.properties) resolve against that repo, not
# this script's own location.

COMMAND=$(jq -r '.tool_input.command // empty' 2>/dev/null)

# Plain substring match, not a regex: bash's `[[ == *pattern* ]]` glob match
# matches across newlines, so this correctly catches `git push` on any line
# of a multi-line command (e.g. `cd ...\ngit push`), which is how these are
# usually issued. An earlier regex-based version anchored on start-of-string
# or a `;`/`&`/`|` separator only, so it silently never matched a `git push`
# on its own line after a newline — the common case — and separately had a
# portability bug in its escaped `\(` alternative. Accepting the rare false
# positive (e.g. an `echo` that merely mentions "git push") is the right
# trade-off: it costs one unnecessary local check, whereas a false negative
# means this hook silently never protects a real push.
if [[ "$COMMAND" != *"git push"* ]]; then
  exit 0
fi

if [ -z "$SONAR_TOKEN" ]; then
  echo "SONAR_TOKEN not set — skipping local Sonar pre-push check (CI will still run it)." >&2
  echo "" >&2
  echo "To enable this check locally:" >&2
  echo "  1. Generate a personal token at https://sonarcloud.io/account/security" >&2
  echo "  2. Add it to your shell profile, e.g. in ~/.zshrc:" >&2
  echo "       export SONAR_TOKEN=<token>" >&2
  echo "  3. Restart your terminal (or run: source ~/.zshrc)" >&2
  exit 0
fi

if ! command -v jq &> /dev/null; then
  exit 0
fi

if [ ! -f sonar-project.properties ]; then
  exit 0
fi

PROJECT_KEY=$(grep -E '^sonar\.projectKey=' sonar-project.properties | cut -d= -f2-)
if [ -z "$PROJECT_KEY" ]; then
  exit 0
fi

BRANCH=$(git branch --show-current 2>/dev/null)
PR_ARGS=()
PR_NUMBER=""
if command -v gh &> /dev/null; then
  PR_JSON=$(gh pr view --json number,baseRefName 2>/dev/null)
  if [ -n "$PR_JSON" ]; then
    PR_NUMBER=$(echo "$PR_JSON" | jq -r '.number')
    PR_BASE=$(echo "$PR_JSON" | jq -r '.baseRefName')
    PR_ARGS=(
      "-Dsonar.pullrequest.key=$PR_NUMBER"
      "-Dsonar.pullrequest.branch=$BRANCH"
      "-Dsonar.pullrequest.base=$PR_BASE"
    )
  fi
fi

# No PR yet, so the analysis is branch-scoped — and it MUST say which branch.
# SonarCloud assigns an analysis carrying neither sonar.branch.name nor the
# sonar.pullrequest.* trio to the project's MAIN branch, so without this the
# first push of a new feature branch silently overwrites main's analysis with
# unmerged code. That leaves main's recorded quality state describing code that
# was never on main — the opposite of what this check exists to protect.
# Found while auditing branch-level gates across the eight integrated repos
# (EUDPA-618); see docs/analysis/sonarcloud-branch-gate-status.md.
if [ ${#PR_ARGS[@]} -eq 0 ]; then
  if [ -z "$BRANCH" ]; then
    # Detached HEAD: no PR to scope to and no branch name to send. Skipping is the
    # only safe option — running anyway is the overwrite described above, and
    # blocking the push over it would punish the user for CI's job.
    echo "Detached HEAD with no open PR — skipping local Sonar pre-push check," >&2
    echo "as an unnamed analysis would be recorded against main. CI still runs it." >&2
    exit 0
  fi
  PR_ARGS=("-Dsonar.branch.name=$BRANCH")
fi

COMMON_ARGS=(
  "-Dsonar.token=$SONAR_TOKEN"
  "-Dsonar.host.url=https://sonarcloud.io"
  "-Dsonar.organization=defra"
  "-Dsonar.projectKey=$PROJECT_KEY"
  "-Dsonar.qualitygate.wait=true"
)

# Leave the tree as we found it. The commands below drop analysis artefacts in
# the repo they run in: `sonar-scanner` writes .scannerwork/, `mvn sonar:sonar`
# writes .sonar/, and a repo's own `npm run lint` can write a
# dependency-cruiser cache. Only trade-imports-animals-frontend gitignores any
# of them, so without this the gate leaves every repo it checks with a dirty
# tree. That breaks anything downstream that asserts a clean tree — the
# increment build loop's baseline goes red before it edits a line — and risks
# the artefact being staged into a real commit by something that stages what is
# untracked.
#
# Removes ONLY untracked paths that appeared while this script ran: a path you
# already had is left alone, and a tracked file is never touched. `target/`,
# `node_modules/` and `.cache/` are gitignored in these repos, so they never
# show up here in the first place.
UNTRACKED_BEFORE=$(git -c core.quotePath=false status --porcelain 2>/dev/null | grep '^??' | cut -c4-)

cleanup_analysis_artefacts() {
  local after path
  after=$(git -c core.quotePath=false status --porcelain 2>/dev/null | grep '^??' | cut -c4-)
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    # Never step outside the repo, and never near git's own state, however the
    # path reached us.
    case "$path" in
      /* | *..* | .git | .git/*) continue ;;
    esac
    printf '%s\n' "$UNTRACKED_BEFORE" | grep -qxF -- "$path" && continue
    rm -rf -- "$path"
  done <<< "$after"
}

# On every exit path, so a blocked push cleans up as thoroughly as a passing one.
trap cleanup_analysis_artefacts EXIT

# This hook's stderr comes back to its caller as one message, and a Spring Boot
# `mvn clean verify` writes megabytes of it: 2.955 MB on
# trade-imports-address-book, whose integration tests log every request at
# DEBUG with a stack trace per handled exception. `mvn -q` cannot quiet that —
# it is the application's own logger, not Maven's. An agent that pushes such a
# repo therefore received more text than its whole context window held and died
# on the spot, so a gate that was right to block (two duplicated string
# literals) destroyed the work rather than naming what to fix.
#
# So each long command writes to a log instead, and only its tail comes back.
# `.cache/` is gitignored in these repos and already holds the prepush marker,
# so the log never dirties the tree and cleanup_analysis_artefacts never sees
# it. The tail is long enough to carry Maven's own ERROR block and the
# "QUALITY GATE STATUS" line that explains a Sonar refusal.
BUILD_LOG_DIR=.cache
BUILD_LOG=$BUILD_LOG_DIR/sonar-push-check.log
BUILD_LOG_TAIL_LINES=60

run_logged() {
  local result
  mkdir -p "$BUILD_LOG_DIR"
  "$@" > "$BUILD_LOG" 2>&1
  result=$?
  if [ $result -ne 0 ]; then
    echo "" >&2
    echo "Failed: $1. Last $BUILD_LOG_TAIL_LINES lines of $(pwd)/$BUILD_LOG:" >&2
    tail -n "$BUILD_LOG_TAIL_LINES" "$BUILD_LOG" >&2
    echo "" >&2
  fi
  return $result
}

echo "Running local Sonar pre-push check for $PROJECT_KEY (this can take a few minutes; needs Docker running for repos with Testcontainers-based integration tests)..." >&2

if [ -f pom.xml ]; then
  # Single combined invocation — see the "Runs as ONE build" note above.
  #
  # Deliberately does NOT pass -DskipITs (2026-09-18): an earlier version did,
  # to keep this fast and Docker-independent. Confirmed by direct testing on
  # trade-imports-address-book that this is a real correctness bug, not just
  # a speed/accuracy trade-off: several of these repos' *IT.java integration
  # tests are what actually exercise their configuration/bootstrap classes
  # (TrustStoreConfiguration, MongoConfig, ProxyConfig, ...) — skipping them
  # dropped address-book's measured line coverage from a genuine 82% to 59%,
  # pushing it under the shared 65% jacoco-check floor for a reason that had
  # nothing to do with the code actually being pushed. Running the full
  # `verify` (unit + integration tests) is slower and requires Docker for
  # any repo using Testcontainers, but it measures what jacoco-check and
  # (via mvn's normal lifecycle) sonar:sonar actually see — matching what
  # this check is meant to verify before a push leaves the machine.
  run_logged mvn -q clean verify sonar:sonar "${COMMON_ARGS[@]}" "${PR_ARGS[@]}"
  RESULT=$?
elif [ -f package.json ]; then
  if ! command -v sonar-scanner &> /dev/null; then
    echo "sonar-scanner not installed — skipping local Sonar pre-push check (CI will still run it)" >&2
    exit 0
  fi
  run_logged npm ci
  NPM_CI_RESULT=$?
  if [ $NPM_CI_RESULT -ne 0 ]; then
    echo "npm ci failed — push blocked" >&2
    exit 2
  fi
  # Cheapest checks first. These cost seconds; the build and suite below cost
  # minutes, and the scanner upload after them is a side effect on SonarCloud
  # that a lint-dirty branch should never have produced in the first place.
  # `npm ci` still has to come first, because format and lint need the
  # devDependencies it installs.
  #
  # `npm run --if-present` so repos without these scripts are unaffected —
  # this one script is shared by every Sonar-integrated repo.
  run_logged npm run --if-present format:check
  if [ $? -ne 0 ]; then
    echo "" >&2
    echo "Formatting check failed — push blocked. Fix it with:" >&2
    echo "  npm run format" >&2
    echo "then amend or add a commit." >&2
    exit 2
  fi

  run_logged npm run --if-present lint
  if [ $? -ne 0 ]; then
    echo "" >&2
    echo "Lint failed — push blocked. Auto-fixable problems:" >&2
    echo "  npm run lint:js:fix" >&2
    echo "then amend or add a commit." >&2
    exit 2
  fi

  run_logged npm test
  TEST_RESULT=$?
  if [ $TEST_RESULT -ne 0 ]; then
    echo "npm test failed — push blocked" >&2
    exit 2
  fi
  # Tell the repo's own git pre-push hook that this exact commit has already
  # passed the whole gate — format, lint and the suite — so it can skip
  # outright instead of repeating any of it. This hook runs BEFORE the `git
  # push` command, so the git hook fires afterwards and reads the marker we
  # leave here. Written only once all three have passed above.
  #
  # Only when the tree is clean: `npm test` above ran against the working
  # tree, so a dirty tree means what was tested is not what HEAD will push,
  # and the marker would be a lie. Falling back to testing twice is the safe
  # outcome. `.cache/` is gitignored in these repos.
  #
  # Harmless for repos with no pre-push hook yet — nothing reads the file.
  #
  # Clear our own leavings before that judgement, or they make it for us: a
  # repo whose `npm run lint` writes a dependency-cruiser cache (as
  # trade-imports-animals-frontend's does, to src/server/common/cache.json)
  # arrives here dirty for a reason that has nothing to do with HEAD, and the
  # marker is never written — so its git pre-push hook repeats the whole suite
  # every time. The EXIT trap cannot cover this: it fires after the check.
  cleanup_analysis_artefacts
  if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
    mkdir -p .cache && git rev-parse HEAD > .cache/prepush-verified
  fi
  # Static analysis only — does not re-run the tests that just produced coverage.
  run_logged sonar-scanner "${COMMON_ARGS[@]}" "${PR_ARGS[@]}"
  RESULT=$?
else
  exit 0
fi

if [ $RESULT -ne 0 ]; then
  echo "" >&2
  echo "Local build/test/Sonar quality gate failed — push blocked. See https://sonarcloud.io/dashboard?id=${PROJECT_KEY}${PR_NUMBER:+&pullRequest=$PR_NUMBER}" >&2
  echo "Which conditions it failed, and the issues behind them:" >&2
  echo "  tim sonar gate ${PROJECT_KEY#DEFRA_}${PR_NUMBER:+ --pull-request $PR_NUMBER} --json" >&2
  echo "  tim sonar issues ${PROJECT_KEY#DEFRA_}${PR_NUMBER:+ --pull-request $PR_NUMBER} --json" >&2
  exit 2
fi

exit 0
