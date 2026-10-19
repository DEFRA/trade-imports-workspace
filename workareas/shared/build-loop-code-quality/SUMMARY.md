# Code quality in built code: summary

Read this first. [PLAN.md](PLAN.md) is the working log and [report-v2.md](report-v2.md) the full investigation; you should not need either.

Branch `chore/NO_JIRA-code-quality-factory`, in the workspace and 12 repos. PRs are being raised and taken to green by a workflow, and the links will be added to PLAN.md. Nothing is merged.

## Your actions

| # | Action | My recommendation |
|---|---|---|
| A | Move your 15 personal memories into `~/.claude/CLAUDE.md`, then add `"autoMemoryEnabled": false` to `.claude/settings.json` (a protected file, so it needs you) | Do it. Memory is where rules went to hide |
| B | Install the guard-bash draft (`guard-bash-draft/`, then `npm run test:installed`) | Do it. Until then the docs say piped test runs are blocked and they are not |
| C | Review and merge the PRs | Merge the workspace PR first: it holds the rules every other repo points to |
| D | Turn on required review for ins-backend `main` (PR #21 was self-merged) | Do it |
| E | Raise the security ticket from the draft in your local `workareas/ticket-creation/` (kept out of this public repo) | Do it |

## Decisions, with a default

If you don't reply on a decision, I'll go with my default. Numbers match PLAN.md "Needs Sam".

| # | Question | Default |
|---|---|---|
| 4 | Every Java 400, 404 and 409 now logs a stack trace at WARN | Ids at WARN, stack trace at DEBUG |
| 5 | ins-backend logs search terms and token claims at INFO | Drop both to DEBUG and log ids only |
| 6 | Animals and plants log 5xx errors in different shapes | Use the plants shape, and add `journeyId` to animals |
| 7 | Gateway outbox events accept unknown fields | Leave as is. It's a behaviour change, so it needs its own ticket |
| 8 | A malformed certificate now stops startup | Keep it: failing fast is right |
| 9 | address-book checks the organisation twice | Keep one check, the filter |
| 10–12 | Helpers and functions with different names in different repos | Use the animals names, and use an outcome enum in both Java repos |
| 13 | ID patterns in the two linters differ | Widen both to cover `cv-NNN` and `AC3`, then clean what they flag |
| 14 | 3 lint baseline entries are left in animals-frontend | Raise a ticket for them |
| 15–16 | Stub latency ID, and Welsh "MACHINE-DRAFT" headers | Remove the ID in all three repos, and move the headers to `copy-status.md` |
| 17–19 | How strict the comment sweep is | Strict: delete them, and sweep the untouched files in a follow-up |
| 20 | Each repo's `AGENTS.md` repeats the house rules | Point to the rules file instead |
| 21–23 | Build-loop details | Limit the theme review to the theme's own commits, and leave the other two |
| 24–26 | Things not built: behaviour convention tests, a style check before push, Sonar in the loop | Raise the convention tests as a ticket, and drop the other two |
| 27–28 | ins-backend review, and the transporter placeholder | D above, and a backlog row |

## What was wrong

Comments were 21% of the issues, but only 1 of the 19 serious ones. The real causes were:

- **The plan was too strict.** The plan contract said "settle every choice… follow it verbatim", so the implementor copied names and comments out of the plan.
- **Code-quality findings were dismissed.** The verifier threw them out as "taste" or "out of scope".
- **Rules weren't where agents could see them.** They lived in memory or in a single prompt, workflow agents never saw them, and some guides taught the opposite.
- **Some writers had no review.** The fixer, the CI fixer and theme-end changes went unchecked.
- **No lint checked any of it.**

## What changed

- **House rules in one file.** [`.claude/rules/code-quality.md`](../../../.claude/rules/code-quality.md) is loaded by every session, skill and workflow.
- **Plans record decisions, not code.** They say what was decided, where code lives and who owns each rule, and contain no names or code. A plan review checks each plan before any code is written.
- **The verifier is split by kind of finding.** Functional findings are still refuted by default. Code-quality findings are fixed by default.
- **Every writer gets reviewed**, including the fixers.
- **Lint enforces the rules.** ESLint covers the 5 Node repos and Checkstyle the 7 Java repos, and a duplication check runs in the build loop.
- **The code has been tidied.** The sweep covered the branch's files. Memory went from 189 files to 26, and 2 real bugs were fixed: proxy credentials reaching the logs, and Java Docker builds failing.

## Proof

- **Tests:** E2E 350 passed and 0 failed. tim's 3151 tests are green, as is every repo's own suite.
- **Dry run:** the new loop planned a real job, stayed within its scope, and handed nine wider clean-ups back as follow-ups.
- **Not yet proven:** the new loop building and landing a full increment end to end. That's the next real run.
