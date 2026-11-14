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
