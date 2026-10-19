# Code-quality factory changes: plan and progress

Branch: `chore/NO_JIRA-code-quality-factory` (workspace + 12 repos, each from `origin/main`, 2026-10-18). Not merged — Sam merges.

Peer work parked to make the workspace switch: `git stash list` entry "parked 2026-10-18 by code-quality session…" (docs/repos notes, stub doc, delivery-maturity implementation.md). Restore on `feat/NO_JIRA-design-release-2-1` with `git stash apply`. Staged peer edits to `docs/repos/trade-imports-{ins-frontend,performance-tests,reference-data}.md` and `workareas/shared/ins-performance-testing/*` were carried across untouched and are never committed here.

## Workflows

| # | Workflow | Covers (report-v2 §6 / memory audit) | Status |
|---|---|---|---|
| 1 | Rules, docs and skills | §6.3 rules file; §6.5 guides; §6.7 review and code-style skills; DISTIL briefs; openspec config; frontend-change; memory PROMOTE + conflicts | done, committed (run `wf_96a824e0-799`) |
| 2 | Build loop and tim | §6.1 verifier/judge split; §6.2 plan contract + plan review; §6.7 loop reviewers; §6.8 CI fixer, fixer re-review, theme-end lens; §6.4 probe + duplication rung; standards `repoDocs` | done, committed (run `wf_e81dd711-de9`) |
| 3 | Service repos | §6.4 lint per repo; §6.6 recipes, repo notes, exemplars; §6.9 one-off clean-up (items on `main`); ins-tests AGENTS.md | done, committed in 11 repos (run `wf_7b18260a-f15`) |
| 4 | Memory | back up, delete promoted/duplicate/stale, move personal to `~/.claude/CLAUDE.md` | done (run `wf_4f1d4317-580`): 189 → 26 files, backup in `memory-backup-2026-10-19` beside the memory directory; links to deleted files now point at the committed rule or are removed |
| 5 | Verify | tim tests, every repo's tests, E2E on the stack, a planOnly dry run of the new loop, independent review of all diffs against the house rules | E2E green on the branch stack (350 passed) |

## Follow-ups landed after the workflows

- Proxy credentials are never logged when the proxy URL is malformed, in all 7 Java repos.
- Checkstyle config is copied into the build and dev-run images in all 7 Java repos; none skips the check.
- The Node lint plugin is one shape: `eslint-rules/code-quality.js`, byte-identical in animals-frontend, plants-frontend, ins-frontend, animals-admin and ins-tests. It flags "Ruled" (capital R) as a ruling reference and leaves ordinary English such as "ruled out" alone.

## In progress

- Plan-review calibration in the build loop.

## Decisions made without Sam (flag on return)

- Workspace branch based on `origin/main` (its factory files equal the design-release branch's).
- Memory conflicts resolved in the memory's favour except where the audit marks it stale.
- One-off clean-up covers code on `main` only; items that exist only on design-release branches are left to the layer reviews, which now run with the flipped verifier.
- The security finding held in memory is drafted as a ticket in the workarea, not raised in Jira.

## Needs Sam (protected files or team decisions)

- `.claude/settings.json` is protected by `guard-edits.sh`: add `"autoMemoryEnabled": false` by hand. It also still allows `repos/*/node_modules/.bin/*`, which conflicts with the new "format through npm run format" rule.
- `.claude/hooks/guard-bash.sh` is protected: install the drafted piped-test-run guard from `guard-bash-draft/` (36 tests included).
- Java exception handlers now log the throwable on 4xx warns (house rule), so every 404/409/validation failure writes a stack trace at WARN. Keep, or log ids at WARN and the throwable at DEBUG?
- ins-backend still logs the address search term (postcode or find text) at INFO, and the refusal body (up to 500 chars) at WARN; FederatedTokenConfig logs token claims at INFO with tests pinning it.
- ins-backend `main` needs required review (self-merged PR #21).
- animals-frontend: 175 baselined tracking-reference comments across 65 files in `eslint-suppressions.json`, mostly "Design release 1 …" rationale, need deleting or moving to docs; the platform layer still names the GBN-AG set in 8 baselined places.
- animals-frontend `services/transporters/records.js`: two commercial transporter records carry status APPROVED as a placeholder; the open question that comment held needs a home.
- Twin helpers: animals `chooseAutocompleteByLabel(page, { label })` vs plants `chooseAutocompleteOption(page, input, optionName)` — pick one name and signature.
