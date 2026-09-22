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

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)

# Same plain-substring match as the canonical script — see its own comment
# for why (catches `git push` on any line of a multi-line command).
[[ "$COMMAND" == *"git push"* ]] || exit 0

[ -n "$CWD" ] && [ -d "$CWD" ] || exit 0

CHECK_SCRIPT="$HOME/git/defra/trade-imports-workspace/tools/sonar/sonar-push-check.sh"
[ -f "$CHECK_SCRIPT" ] || exit 0

cd "$CWD" || exit 0

# Re-feed the same hook JSON the canonical script expects on its own stdin —
# we already consumed stdin above to read COMMAND/CWD.
printf '%s' "$INPUT" | bash "$CHECK_SCRIPT"
exit $?
