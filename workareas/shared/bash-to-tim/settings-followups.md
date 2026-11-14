# Settings follow-ups for Sam

Agents cannot edit permission config. Allowlist entries that name a
script a row has deleted are listed here, under the row's id. Remove them
from `.claude/settings.json` with:

```
node <scratchpad>/settings-remove-allow.mjs '<entry>' '<entry>'
```

then delete the row's section from this file and commit both.

## P35

None. No allowlist entry names `tools/skill-creator/`; the generic
`tools/**` entries and `Bash(tim:*)` cover what remains.

## P36

The row deletes every script in `tools/theme-ticket/`. Remove:

```
Bash(~/git/defra/trade-imports-workspace/tools/theme-ticket/*)
Bash(~/git/defra/trade-imports-workspace/tools/theme-ticket/*:*)
```

`Bash(tim:*)` covers `tim theme-ticket`.

## P40

None. No allowlist entry names `tools/understanding-check/`; the generic
`tools/**` entries and `Bash(tim:*)` cover what remains.

## P41

None. No allowlist entry names `tools/understanding-check/`; the generic
`tools/**` entries and `Bash(tim:*)` cover what remains.

## P42

None. No allowlist entry names `tools/understanding-check/`, and the
folder is now gone. `Bash(tim:*)` covers `tim understanding-check start`
and `prepare`; the skill's `gh search prs`, `gh pr view` and `gh pr diff`
calls need whatever `gh` permission the session already has.

## P43

None. No allowlist entry names `tools/govuk/list-plans.sh`,
`upgrade-status.sh`, `list-plan-summaries.sh` or
`render-version-plan.sh`; the generic `tools/**` entries cover the
scripts left in `tools/govuk/`, and `Bash(tim:*)` covers `tim govuk`.

## P44

None. No allowlist entry names `tools/govuk/version-classify.sh`,
`version-add-change.sh`, `version-mark-implemented.sh`,
`version-mark-failed.sh` or `apply-version.sh`; the generic `tools/**`
entries cover the scripts left in `tools/govuk/`, and `Bash(tim:*)` covers
`tim govuk classify`, `add-change`, `mark-done`, `mark-failed` and `apply`.

## P45

None. No allowlist entry names `tools/govuk/start-upgrade.sh`,
`discover-repos.sh`, `discover-versions.sh` or `setup-branch.sh`, and the
folder is now gone. `Bash(tim:*)` covers `tim govuk start`.

## P46

None. No allowlist entry names `tools/review/detect-tech.sh`, and
`Bash(tim:*)` covers `tim review detect-tech`.

## P31

None. No allowlist entry names `tools/ticket/setup-branch.sh`,
`prepare-plan.sh` or `prepare-implement.sh`, and the folder is now gone.
`Bash(tim:*)` covers `tim ticket branch`, `prepare-plan` and
`prepare-implement`; IMPLEMENTOR's `gh search prs` and `gh pr diff` calls
need whatever `gh` permission the session already has.

## P47

None. No allowlist entry names `file-review-init.sh`,
`file-review-add-item.sh`, `file-review-set-verdict.sh`, `review-items.sh`,
`review-counts.sh`, `review-add-item.sh`, `review-mark.sh` or
`review-set-status.sh`. `Bash(tim:*)` covers `tim review file` and
`tim review items`.

## P48

None to remove. No allowlist entry names `render-items.sh`,
`items-table.jq`, `aggregate-file-reviews.sh`, `verify-consistency.sh`,
`verify-style-coverage.sh`, `verify-coverage.sh` or
`refresh/reconcile.sh`. `Bash(tim:*)` covers the tim commands. The review
skill's Step 3 now runs
`gh api repos/DEFRA/{repo}/pulls/{pr}/files --paginate --slurp > ...`, which
only `Bash(gh api user:*)` is allowed today, so it prompts: consider
allowing `Bash(gh api repos/DEFRA/*/pulls/*/files:*)`.

## P49

None to remove. No allowlist entry names `pull-repos.sh`,
`list-merge-resolved.sh`, `list-coverage-gaps.sh`, `refresh/scope.sh` or
`file-diff.sh`; the generic `tools/**` rules (lines 63-64) still serve
other folders. `Bash(tim:*)` covers `tim review refresh` and
`tim review file-diff`. The review skill's Step 0 now also runs
`gh api repos/DEFRA/{repo}/pulls/{pr}/files --paginate --slurp > ...` on a
refresh, and FILE_REVIEWER/STYLE_FILE_REVIEWER fall back to
`gh pr diff {pr} --repo DEFRA/{repo} | tim review file-diff {file} --stdin`
when there is no cached diff: consider allowing
`Bash(gh api repos/DEFRA/*/pulls/*/files:*)` and `Bash(gh pr diff:*)`.

## P50

None to remove. No allowlist entry names `prepare-review.sh`,
`prepare-review-local.sh`, `start-review.sh`, `prs.sh` or
`pr-details.sh`; the generic `tools/**` rules (lines 63-64) still serve
other folders. `Bash(tim:*)` covers `tim review start` and
`tim review prepare`. The review skill's Step 1 now runs `gh` itself:
`gh search prs ... > .raw/prs.json`, `gh pr view ... > .raw/<repo>.json`
(already allowed by `Bash(gh pr view:*)`),
`gh api repos/DEFRA/<repo>/pulls/<n>/files --paginate --slurp > ...` and
`gh pr diff <n> --repo DEFRA/<repo> > .diffs/<repo>.diff`; the style
skill's fresh prepare script now calls `gh api .../files --paginate`.
Consider allowing `Bash(gh search prs:*)`, `Bash(gh pr diff:*)` and
`Bash(gh api repos/DEFRA/*/pulls/*/files:*)`.

## P52

None to remove. No allowlist entry names `style-items.sh`,
`style-counts.sh`, `render-items.sh`, `style-add-item.sh`, `style-mark.sh`,
`style-set-status.sh`, `file-style-add-item.sh`,
`file-style-set-verdict.sh`, `aggregate-file-reviews.sh`,
`refresh/reconcile.sh` or `items-table.jq` under `tools/style/`; the
generic `tools/**` rules still serve the style scripts left for P53.
`Bash(tim:*)` covers `tim style`.

## P53

None to remove. No allowlist entry names `start-style.sh`,
`prepare-style.sh`, `prepare-style-local.sh`, `file-style-init.sh`,
`file-topics.sh`, `bake-rules-bundle.sh` or `refresh/scope.sh` under
`tools/style/`, which is now gone; the generic `tools/**` rules (lines
63-64) still serve other folders. `Bash(tim:*)` covers `tim style start`,
`prepare`, `scope`, `topics`, `bundle` and `file init`. The code-style
skill's refresh now writes each PR's changed files with
`gh api repos/DEFRA/<repo>/pulls/<n>/files --paginate --slurp > ...`
first, as the review skill does.

## P39

None to remove. No allowlist entry names `ticket.sh`, `comments.sh`,
`add-comment.sh`, `transition-ticket.sh` or `search.sh` under
`tools/jira/`, which is now gone; the generic `tools/**` rules (lines
63-64) still serve other folders. `Bash(tim:*)` covers `tim jira ticket`,
`comments`, `comment`, `transition` and `search`.

## P54

None to remove. P54 adds tim library code only and deletes no script;
`sonar-check-pending.sh` and `sonar-record-push.sh` stay until P55.

## P55

No allowlist entry names the three scripts. The row could not finish:
`.claude/settings.json` is protected from agent edits, and its hooks still
call the Bash, so the scripts stay until the hooks switch. Change these
hook commands, keeping each `if`, `matcher` and `timeout`:

- PostToolUse (`if: Bash(git push*)`, timeout 10):
  `bash "$CLAUDE_PROJECT_DIR/scripts/sonar/sonar-record-push.sh"`
  becomes
  `TIM_NO_AUTO_PULL=1 node "$CLAUDE_PROJECT_DIR/tim/src/cli.js" --workspace "$CLAUDE_PROJECT_DIR" sonar pending record 2>/dev/null || true`
- UserPromptSubmit (timeout 15):
  `bash "$CLAUDE_PROJECT_DIR/scripts/sonar/sonar-check-pending.sh" UserPromptSubmit`
  becomes
  `TIM_NO_AUTO_PULL=1 node "$CLAUDE_PROJECT_DIR/tim/src/cli.js" --workspace "$CLAUDE_PROJECT_DIR" sonar pending check --event UserPromptSubmit 2>/dev/null || true`
- SessionStart (timeout 15):
  `bash "$CLAUDE_PROJECT_DIR/scripts/sonar/sonar-check-pending.sh" SessionStart`
  becomes
  `TIM_NO_AUTO_PULL=1 node "$CLAUDE_PROJECT_DIR/tim/src/cli.js" --workspace "$CLAUDE_PROJECT_DIR" sonar pending check --event SessionStart 2>/dev/null || true`
- SessionStart (timeout 30):
  `bash "$CLAUDE_PROJECT_DIR/scripts/sonar/sonar-remove-stale-mcp-containers.sh"`
  becomes
  `TIM_NO_AUTO_PULL=1 node "$CLAUDE_PROJECT_DIR/tim/src/cli.js" --workspace "$CLAUDE_PROJECT_DIR" sonar mcp-tidy 2>/dev/null || true`

Then, in one follow-up commit: delete the three scripts under
`scripts/sonar/` (the golden recording tests skip once they are gone), and
rewrite `docs/agent-onboarding.md`'s "Workspace-level hooks" section and its
line about the hooks under `scripts/sonar/` calling the `sonar` CLI to name
the tim commands and the hook JSON above.

## P37

None. No allowlist entry names `tools/confluence/sync-docs.sh`,
`html_to_md.js` or `clean-docs.sh`; `Bash(tim:*)` covers
`tim confluence sync`.

## P33

None. No allowlist entry names `tools/ticket-creator/check-capabilities.sh`
or `prepare-ticket-creation.sh`; `Bash(tim:*)` covers `tim capabilities check`
and `tim jira prereqs`.
