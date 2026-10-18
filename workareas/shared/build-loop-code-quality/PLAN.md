# Code-quality factory changes: plan and progress

Branch: `chore/NO_JIRA-code-quality-factory` (workspace + 12 repos, each from `origin/main`, 2026-10-18). Not merged — Sam merges.

Peer work parked to make the workspace switch: `git stash list` entry "parked 2026-10-18 by code-quality session…" (docs/repos notes, stub doc, delivery-maturity implementation.md). Restore on `feat/NO_JIRA-design-release-2-1` with `git stash apply`. Staged peer edits to `docs/repos/trade-imports-{ins-frontend,performance-tests,reference-data}.md` and `workareas/shared/ins-performance-testing/*` were carried across untouched and are never committed here.

## Workflows

| # | Workflow | Covers (report-v2 §6 / memory audit) | Status |
|---|---|---|---|
| 1 | Rules, docs and skills | §6.3 rules file; §6.5 guides; §6.7 review and code-style skills; DISTIL briefs; openspec config; frontend-change; memory PROMOTE + conflicts | todo |
| 2 | Build loop and tim | §6.1 verifier/judge split; §6.2 plan contract + plan review; §6.7 loop reviewers; §6.8 CI fixer, fixer re-review, theme-end lens; §6.4 probe + duplication rung; standards `repoDocs` | todo |
| 3 | Service repos | §6.4 lint per repo; §6.6 recipes, repo notes, exemplars; §6.9 one-off clean-up (items on `main`); ins-tests AGENTS.md | todo |
| 4 | Memory | back up, delete promoted/duplicate/stale, move personal to `~/.claude/CLAUDE.md`, turn auto memory off | todo |
| 5 | Verify | tim tests, every repo's tests, E2E on the stack, a planOnly dry run of the new loop, independent review of all diffs against the house rules | todo |

## Decisions made without Sam (flag on return)

- Workspace branch based on `origin/main` (its factory files equal the design-release branch's).
- Memory conflicts resolved in the memory's favour except where the audit marks it stale.
- One-off clean-up covers code on `main` only; items that exist only on design-release branches are left to the layer reviews, which now run with the flipped verifier.
- The security finding held in memory is drafted as a ticket in the workarea, not raised in Jira.
