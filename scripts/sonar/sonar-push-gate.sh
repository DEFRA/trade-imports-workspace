#!/bin/bash
#
# sonar-push-gate.sh — PreToolUse(Bash) hook, registered at the WORKSPACE ROOT.
#
# Why this lives here and not only in each repo's own .claude/settings.json:
# Claude Code loads hook config from the single project root the session was
# launched against ($CLAUDE_PROJECT_DIR) — it does not re-scan for nested
# .claude/settings.json files inside subdirectories reached via `cd` in a
# Bash tool call. A session rooted at this workspace (the normal
# `cd repos/<name> && git push` workflow) never sees a repo's own
# .claude/settings.json, so a PreToolUse(Bash) hook installed only there is
# dead weight for that workflow. This root-level hook is what actually fires;
# it reads the hook JSON's `.cwd` (the real shell cwd for the Bash call,
# which persists across calls in a session) to work out which repo the
# `git push` is running in, then dispatches to the one canonical,
# already-working script — unmodified — with that repo as its cwd.
#
# (A repo's own .claude/settings.json PreToolUse(Bash) entry still matters
# for the OTHER supported workflow — launching `claude` fresh with cwd
# already inside that repo, per CLAUDE.md's "cd repos/X, then use claude
# as normal" — where the repo itself is $CLAUDE_PROJECT_DIR. Both paths
# point at the same tools/sonar/sonar-push-check.sh, so there is one
# canonical check, just two ways to reach it depending on where the
# session's project root is.)
#
# Deliberately separate from sonar-record-push.sh / sonar-check-pending.sh —
# those manage the ASYNC, non-blocking surfacing of CI's own SonarCloud scan
# results on a PR after the fact. This hook is the SYNCHRONOUS, blocking
# local check that must complete (and pass) before the push is allowed to
# leave the machine at all.
#
# Detection + target-directory resolution (2026-09-18 hardening): the naive
# version of this script trusted the hook JSON's `.cwd` as "the repo being
# pushed" and only matched the literal substring "git push". Both assumptions
# broke on `git -C <path> push` — a routine way to push a repo without
# actually `cd`-ing there first (used constantly when driving several repos
# from a workspace-rooted session): the command has no "git push" substring
# (there's a `-C <path>` in between "git" and "push"), and even if it did,
# `.cwd` is the shell's real pwd, which has nothing to do with `<path>`.
# Confirmed by direct testing: a forced-failure edit to the canonical script,
# triggered via `git -C <repo> push`, silently never fired — the push went
# through as if the check didn't exist. The same forced-failure edit,
# triggered via a real `cd <repo>` + plain `git push`, correctly blocked the
# push and surfaced the failure back to the calling agent.
#
# is_git_push() below still matches on the plain substring first (handles
# plain `git push`, `git push origin <branch>`, `git push -u ...`, and a
# `git push` on its own line of a multi-line command), then falls back to a
# whitespace-tolerant pattern for `git <flags...> push` (covers `-C <path>`,
# `-c key=val`, `--work-tree=<path>`, etc. — anything between "git" and
# "push" that isn't itself whitespace). Loose on purpose, matching the
# canonical script's own stated trade-off: a false positive here just costs
# one unnecessary local check; a false negative silently unprotects a real
# push. Written with [[:space:]] classes only (no `.` wildcard), so it stays
# newline-safe for multi-line commands, same reasoning as the canonical
# script's own comment on why it isn't a naive regex.
#
# resolve_target_dir() then figures out which repo that push actually
# targets: if the command has a `-C <path>` (or `--git-dir=`/`--work-tree=`
# form), that path wins over `.cwd`; either way, the result is normalized to
# the git repo's toplevel via `git rev-parse --show-toplevel`, so running
# from a subdirectory of a repo (not just its root) also resolves correctly.
#
# Known, deliberate non-goal: a single multi-line Bash call of the form
# `cd <path>\ngit push` (cd and push as separate statements in ONE tool
# call). The hook fires before any of that command's lines execute, so
# `.cwd` at hook-fire time is always the shell's PREVIOUS directory, never
# `<path>` — parsing out "the last cd before the push" reliably is a much
# harder problem (multiple cds, quoting, relative paths compounding) than
# `-C`, and this pattern is already discouraged elsewhere in this workspace's
# guardrails (prefer one command per Bash call). Not handled here; a plain
# `git push` after a real, separate `cd` remains the one fully-supported way
# to push from a different directory than the one you started in.

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)

is_git_push() {
  local cmd="$1"
  [[ "$cmd" == *"git push"* ]] && return 0
  [[ "$cmd" =~ (^|[^A-Za-z0-9_./-])git([[:space:]]+[^[:space:]]+)*[[:space:]]+push([[:space:]]|$) ]] && return 0
  return 1
}

is_git_push "$COMMAND" || exit 0

[ -n "$CWD" ] && [ -d "$CWD" ] || exit 0

CHECK_SCRIPT="$HOME/git/defra/trade-imports-workspace/tools/sonar/sonar-push-check.sh"
[ -f "$CHECK_SCRIPT" ] || exit 0

resolve_target_dir() {
  local cmd="$1" cwd="$2" dir="$2"

  if [[ "$cmd" =~ git[[:space:]]+-C[[:space:]]+([^[:space:]]+) ]]; then
    dir="${BASH_REMATCH[1]}"
  elif [[ "$cmd" =~ --(git-dir|work-tree)=([^[:space:]]+) ]]; then
    dir="${BASH_REMATCH[2]}"
  fi

  # Strip a wrapping quote if the path was quoted in the original command.
  dir="${dir%\"}"; dir="${dir#\"}"
  dir="${dir%\'}"; dir="${dir#\'}"

  case "$dir" in
    '~/'*) dir="$HOME/${dir#\~/}" ;;
    /*) ;; # already absolute
    *) dir="$cwd/$dir" ;;
  esac

  # Normalize to the repo's toplevel — handles both a `-C`/CWD that points
  # partway into a repo, and a plain push run from a subdirectory of one.
  local top
  top=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) && dir="$top"

  printf '%s' "$dir"
}

TARGET_DIR=$(resolve_target_dir "$COMMAND" "$CWD")
[ -n "$TARGET_DIR" ] && [ -d "$TARGET_DIR" ] || exit 0

cd "$TARGET_DIR" || exit 0

# Re-feed the hook JSON the canonical script expects, but with
# .tool_input.command normalized to a literal "git push": the canonical
# script does its OWN independent (deliberately simple, unmodified) "git
# push" substring check on that field, so an original command matched only
# by is_git_push()'s looser `-C`-tolerant pattern above (e.g. `git -C <path>
# push`) would otherwise fail the canonical script's stricter check and
# silently exit 0 right after this script did the work of correctly
# resolving it. The canonical script never uses .tool_input.command for
# anything else, so this substitution is safe.
printf '%s' "$INPUT" | jq '.tool_input.command = "git push"' | bash "$CHECK_SCRIPT"
exit $?
