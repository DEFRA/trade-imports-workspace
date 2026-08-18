#!/bin/bash
#
# sonar-check-pending.sh <EventName> — UserPromptSubmit / SessionStart hook.
#
# For each pending check recorded by sonar-record-push.sh, does ONE non-blocking
# query (no sleeping): if SonarCloud has analyzed the pushed commit, surface any
# new BLOCKER/CRITICAL via additionalContext and clear it; if the PR is clean,
# clear it; if not analyzed yet, leave it pending (dropped after EXPIRY). This runs
# whenever you next submit a prompt or start a session, so findings appear shortly
# after CI's scan lands — without any long-lived background process.
#
# Fast + fail-open. Targets bash 3.2 (macOS stock).
#
# $1 = the hook event name (UserPromptSubmit | SessionStart), used in the output
# so additionalContext is attributed to the firing event.

EVENT="${1:-UserPromptSubmit}"
ROOT="${CLAUDE_PROJECT_DIR:-$HOME/git/defra/trade-imports-workspace}"
STATE_DIR="$ROOT/.sonar-checks" # must match sonar-record-push.sh
EXPIRY=2700 # 45 min — stop waiting on a SHA that never gets analyzed

command -v sonar >/dev/null 2>&1 || exit 0
command -v jq >/dev/null 2>&1 || exit 0
[ -d "$STATE_DIR" ] || exit 0

now=$(date +%s 2>/dev/null || echo 0)
report=""

for pf in "$STATE_DIR"/pending__*; do
  [ -f "$pf" ] || continue # no matches -> literal glob -> skip

  base=$(basename "$pf")
  rest="${base#pending__}"
  project="${rest%%__*}"
  sha="${rest##*__}"
  branch=$(sed -n '1p' "$pf" 2>/dev/null)
  pushed_at=$(sed -n '2p' "$pf" 2>/dev/null)

  pr_json=$(sonar api get "/api/project_pull_requests/list?project=${project}" 2>/dev/null)
  pr_key=$(printf '%s' "$pr_json" | jq -r --arg b "$branch" --arg sha "$sha" \
    'first(.pullRequests[]? | select(.branch == $b and .commit.sha == $sha) | .key) // empty' 2>/dev/null)

  if [ -n "$pr_key" ]; then
    issues=$(sonar list issues --project "$project" --pull-request "$pr_key" \
      --severities BLOCKER,CRITICAL --statuses OPEN,CONFIRMED --format json 2>/dev/null)
    lines=$(printf '%s' "$issues" | jq -r \
      '.issues[]? | "  [\(.severity)] \((.component // "") | sub("^[^:]*:"; "")):\(.textRange.startLine // .line // "?") \(.rule) — \(.message)"' \
      2>/dev/null)
    if [ -n "$lines" ]; then
      report="${report}${project} (PR #${pr_key}):
${lines}
"
    fi
    # Analyzed (clean or not) — mark seen so it is never re-surfaced, and clear.
    : >"$STATE_DIR/seen__${project}__${sha}" 2>/dev/null
    rm -f "$pf" 2>/dev/null
  else
    # Not analyzed yet — drop only if it has gone stale.
    if [ "${pushed_at:-0}" -gt 0 ] 2>/dev/null && [ "$now" -gt 0 ] 2>/dev/null; then
      [ "$((now - pushed_at))" -ge "$EXPIRY" ] && rm -f "$pf" 2>/dev/null
    fi
  fi
done

[ -n "$report" ] || exit 0

context="New BLOCKER/CRITICAL SonarCloud issues on your pushed PR(s) — fix before merge:
${report}"

jq -n --arg ev "$EVENT" --arg ctx "$context" \
  '{hookSpecificOutput: {hookEventName: $ev, additionalContext: $ctx}}'
exit 0
