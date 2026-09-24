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

echo "Running local Sonar pre-push check for $PROJECT_KEY (this can take a few minutes)..." >&2

if [ -f pom.xml ]; then
  # Single combined invocation — see the "Runs as ONE build" note above.
  mvn -q clean verify sonar:sonar "${COMMON_ARGS[@]}" "${PR_ARGS[@]}" -DskipITs 1>&2
  RESULT=$?
elif [ -f package.json ]; then
  if ! command -v sonar-scanner &> /dev/null; then
    echo "sonar-scanner not installed — skipping local Sonar pre-push check (CI will still run it)" >&2
    exit 0
  fi
  npm ci 1>&2
  NPM_CI_RESULT=$?
  if [ $NPM_CI_RESULT -ne 0 ]; then
    echo "npm ci failed — push blocked" >&2
    exit 2
  fi
  npm test 1>&2
  TEST_RESULT=$?
  if [ $TEST_RESULT -ne 0 ]; then
    echo "npm test failed — push blocked" >&2
    exit 2
  fi
  # Static analysis only — does not re-run the tests that just produced coverage.
  sonar-scanner "${COMMON_ARGS[@]}" "${PR_ARGS[@]}" 1>&2
  RESULT=$?
else
  exit 0
fi

if [ $RESULT -ne 0 ]; then
  echo "" >&2
  echo "Local build/test/Sonar quality gate failed — push blocked. See https://sonarcloud.io/dashboard?id=${PROJECT_KEY}${PR_NUMBER:+&pullRequest=$PR_NUMBER}" >&2
  exit 2
fi

exit 0
