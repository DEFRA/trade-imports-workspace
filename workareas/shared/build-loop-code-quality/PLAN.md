# Code-quality factory changes: plan and progress

Branch: `chore/NO_JIRA-code-quality-factory` (workspace + 12 repos, each from `origin/main`, 2026-10-18). Not merged — Sam merges.

Peer work parked to make the workspace switch: `git stash list` entry "parked 2026-10-18 by code-quality session…" (docs/repos notes, stub doc, delivery-maturity implementation.md). Restore on `feat/NO_JIRA-design-release-2-1` with `git stash apply`. Staged peer edits to `docs/repos/trade-imports-{ins-frontend,performance-tests,reference-data}.md`, `tmp/getCountries-GBNAG.json` and `workareas/shared/ins-performance-testing/*` were carried across untouched and are never committed here.

## Pull requests

All 12 PRs are open, ready for review and green. None is merged or approved. Merge the workspace PR first: the others point to the rules it adds.

Open for Sam (detail in Needs Sam 29–33):

- Review and merge the 12 PRs, workspace #127 first, as a squash merge (Needs Sam 31, 32).
- Add the workspace PR link to the other 11 PR bodies, and correct one line of the ins-frontend #58 body (Needs Sam 30).
- Decide how the performance smoke judges response times (Needs Sam 29).

| Repo | PR | Status | Fix commits | Notes |
|---|---|---|---|---|
| trade-imports-workspace | [#127](https://github.com/DEFRA/trade-imports-workspace/pull/127) | green | `87cb7e51` | SUMMARY.md action E reworded so it names no private path. tim commits `f0685656` (`github rerun`), `45b813f8` (`run-log` for non-Actions checks) and `ba06dd8d` (`sonar issues`) came from the other PRs' fixes. No SonarCloud check |
| trade-imports-animals-frontend | [#416](https://github.com/DEFRA/trade-imports-animals-frontend/pull/416) | green | none | First run: SonarCloud scanner got a 403 before analysing, and the perf smoke stopped early on one slow plants save (2.35s of 3 samples). Both passed on re-run; the branch does not touch plants |
| trade-imports-plants-frontend | [#108](https://github.com/DEFRA/trade-imports-plants-frontend/pull/108) | green | `d055fcc` | Sonar gate failed: 2 unhandled metric-recorder promises left by `482b27f`. Fixed to match the animals twin (catch and log `{ err }`); probe red then green |
| trade-imports-ins-frontend | [#58](https://github.com/DEFRA/trade-imports-ins-frontend/pull/58) | green | `f506098` | Sonar gate failed: the same unhandled promise in `recordExternalCallInBackground`, left by `dbe3d52`. Fixed the same way |
| trade-imports-animals-admin | [#77](https://github.com/DEFRA/trade-imports-animals-admin/pull/77) | green | none | Green first run |
| trade-imports-ins-tests | [#39](https://github.com/DEFRA/trade-imports-ins-tests/pull/39) | green | none | Green first run. No SonarCloud check |
| trade-imports-animals-backend | [#112](https://github.com/DEFRA/trade-imports-animals-backend/pull/112) | green | none | Green first run |
| trade-imports-plants-backend | [#11](https://github.com/DEFRA/trade-imports-plants-backend/pull/11) | green | none | Green first run |
| trade-imports-ins-backend | [#25](https://github.com/DEFRA/trade-imports-ins-backend/pull/25) | green | none | Green first run. IT logs show an `EmfMetricsPublisher` "Namespace must include…" error because the IT profile sets no metrics namespace. Noise, not a failure |
| trade-imports-address-book | [#15](https://github.com/DEFRA/trade-imports-address-book/pull/15) | green | none in repo | SonarCloud scanner auth fault at "Load active rules" on first run; a re-run with the new `tim github rerun` passed |
| trade-imports-dynamics-gateway | [#30](https://github.com/DEFRA/trade-imports-dynamics-gateway/pull/30) | green | none | Green first run |
| trade-imports-reference-data | [#32](https://github.com/DEFRA/trade-imports-reference-data/pull/32) | green | none | Green first run |
| trade-imports-stub | [#24](https://github.com/DEFRA/trade-imports-stub/pull/24) | green | none | Green first run. No SonarCloud check |

SONAR_TOKEN is not set on this machine, so the pre-push hook skipped itself on every push; CI's SonarCloud gate stood in.

## Workflows

| # | Workflow | Covers (report-v2 §6 / memory audit) | Status |
|---|---|---|---|
| 1 | Rules, docs and skills | §6.3 rules file; §6.5 guides; §6.7 review and code-style skills; DISTIL briefs; openspec config; frontend-change; memory PROMOTE + conflicts | done, committed (run `wf_96a824e0-799`) |
| 2 | Build loop and tim | §6.1 verifier/judge split; §6.2 plan contract + plan review; §6.7 loop reviewers; §6.8 CI fixer, fixer re-review, theme-end lens; §6.4 probe + duplication rung; standards `repoDocs` | done, committed (run `wf_e81dd711-de9`) |
| 3 | Service repos | §6.4 lint per repo; §6.6 recipes, repo notes, exemplars; §6.9 one-off clean-up (items on `main`); ins-tests AGENTS.md | done, committed in 11 repos (run `wf_7b18260a-f15`) |
| 4 | Memory | back up, delete promoted/duplicate/stale, move personal to `~/.claude/CLAUDE.md` | done (run `wf_4f1d4317-580`): 189 → 26 files, backup in `memory-backup-2026-10-19` beside the memory directory |
| 5 | Verify | tim tests, every repo's tests, E2E on the stack, a planOnly dry run of the new loop, independent review of all diffs against the house rules | done |

### Workflow 5 status

- E2E on the committed branch, every repo clean: 350 passed, 0 failed, 0 flaky, 7 skipped by design (`logs/final-e2e-committed.txt`).
- tim: 200 files, 3151 tests passed; lint and format check clean (`logs/complete-tim-*-final.txt`).
- Independent review, 12 units, all committed (run `wf_0d732128-c9f`; the three units that returned early were finished in `wf_83af946d-f15`). animals-frontend's lint baseline is down from about 175 entries to 3, all real set-specific code in the platform layer (Needs Sam 14).
- planOnly dry runs on one real freeform row, "log refusals and redirects in three plants pages" (`dry-run/`):
  - run 1 (`wf_61cb5a95-2a5`): refused. The plan grew into a 14-page sweep and the plan review stopped it twice on line-level detail. Led to the calibration in `5bfda858`.
  - run 2 (`wf_58e22d9c-cc7`): stayed inside the row and returned ten follow-ups, but the plan lint refused it on a false positive. Fixed in `a327be58`.
  - run 3 (`wf_578245ef-600`): planned. The plan review raised five findings, the planner resolved all five, scope stayed inside the row, nine wider clean-ups came back as follow-ups (`dry-run/run3-planned.md`).

## Completeness against report-v2 §6 and the memory audit

| Item | State | Where | Why not, or what is left |
|---|---|---|---|
| §6.1 Verify and judge by finding kind | delivered | loop `FUNCTIONAL_CATEGORIES`/`CODE_QUALITY_CATEGORIES`, quote rule, `refutedFindings`; `FILE_REVIEWER.md`, code-style personas, `tools/review/finding-categories.sh` | — |
| §6.2 Decisions-and-owners plan, plan review, implementor may improve shape | delivered | loop plan sections 9–16, plan lint, plan review stage, `PLAN_CONTRACT_FOR_IMPLEMENTOR` | proven by planOnly dry run 3; not yet run through implement, review and land |
| §6.3 Rules where every session loads them | delivered, one part changed | `.claude/rules/code-quality.md`; `node.md`, `java.md`, `playwright.md`; feature-folders rule in both frontends' `architecture.md`; `docs/agent-skills.md` and `skills/patterns.md` make every code-writing prompt read the rules | No `workflow/lib/house-rules.js`: the loop embeds the block between `house-rules` markers and a contract test keeps it equal to the rules file; ad-hoc workflows are told to read the file |
| §6.4 Lint per repo, duplication rung, probe | delivered | `eslint-rules/code-quality.js` in 5 Node repos; Checkstyle `code-quality.xml` in 7 Java repos; `tim build duplication`; `tim build probe`; SPEC_SYNC "The red probe"; openspec config | Id patterns differ: Java catches `cv-NNN`, the Node plugin does not; neither catches `AC3` (Needs Sam) |
| §6.5 Guides | delivered | `code-style.md` §6/§15, doc-comments, `javadoc.md`, Java testing guides, `spring-data-mongodb.md`, `pino-logging.md` §4a, `spring-boot.md` §15, `frontend.md`, DISTIL `reconcile.md`/`consolidate.md`, `openspec/config.yaml` | — |
| §6.6 Recipes, repo notes, exemplars, ins-tests AGENTS.md | partly | Test support and Logging sections in both frontends' recipes; architecture notes (concurrency token, POST redirects, page title, backend clients, logging); `allowMissing` opt-in in `add-a-page.md`; ins-tests `AGENTS.md` and routing; `h` repo-wide; `chooseAutocompleteByLabel` exemplar; gateway `getMessage()` lines; animals-backend route logs carry the user id | Not built: the behaviour convention tests (blank POST with `exit=hub` against a strict-page list; review row-link exception list). "Rows carry no Change link" kept: it is true on `main`. Animals still has 15 inline axe checks on WCAG 2.0 tags only, where plants now has one helper on 2.0–2.2 |
| §6.7 Review, code-style and loop reviewers | delivered | `FILE_REVIEWER.md` naming, structure, logging, test truth; delete-first in both fixers; cheat-sheet rule 15; Must/One way columns; root-merge step in review `SKILL.md`; loop operability and duplication; consistency naming and reuse | — |
| §6.8 Unreviewed writers | partly | CI fixer gets the rules and a style review; theme engineering review; ins-backend coverage rule in `frontend.md` and now `java/testing/unit.md` | Sonar is not in the ladder: it conflicts with the committed rule that workflow agents never run sonar, and the push hook and CI still run it. No code-style Local step before an interactive push. ins-backend required review is Sam's |
| §6.9 One-off clean-up | partly | On `main`: dead `allowMissing` opt-ins, refusal and stale-save logs, address lookup body log, `ExternalCallMetrics` cause, `PortType` warning moved to `PortOfEntry` | Items that exist only on design-release branches (`section-status.js`, `change-link.js`, `holdsSilently`, `REMOVED_*`, `backend-fetch.js` retry, `OutstandingItem`) are left to the layer reviews, as decided. `formatDisplayMoment` pair not checked against plants |
| Memory conflicts 1–11 | delivered | `code-style.md` §10/§15, `frontend.md`, Playwright "When to seed" and "Test data is copied", `BUILD.md` `requireApproval: false` and step 3d park, "ours to fix" in BATCH_IMPLEMENTOR and code-style, `patterns.md` Grep/Glob/`.bin`/pipes, `CLAUDE.md` branches and worktrees | The pipe rule is in the docs but the hook that enforces it is not installed (Needs Sam) |
| Memory PROMOTE (92) | delivered | guides, skills, `CLAUDE.md`, `docker/stack/AGENTS.md`, `github-actions.md`, `architecture-overview.md`, ADR 0002, `tim jira assign`, ins-tests README | `docs/repos/trade-imports-animals-frontend.md` was not touched (another session's file); the pinned npm floor is in the repo README instead |
| Memory growth recommendations | partly | `CLAUDE.md` "Rules go in the repo, not memory"; memory cut from 189 to 26 files | `autoMemoryEnabled: false` needs a hand edit; the 15 personal memories are still in memory, not moved to `~/.claude/CLAUDE.md` (do that before turning auto memory off, or they stop loading); the memory-write deny hook was not built |

## Needs Sam

Protected files

1. `.claude/settings.json`: add `"autoMemoryEnabled": false`. It also still allows `repos/*/node_modules/.bin/*`, which conflicts with "format through npm run format". If you keep auto memory on instead, say whether you want the memory-write deny hook.
2. `.claude/hooks/guard-bash.sh`: install the draft from `guard-bash-draft/` (copy, then `npm run test:installed`; 36 tests). Until then `agent-onboarding.md` §6 and `agent-skills.md` say a piped test run is denied, which is not yet true. The draft now also differs in names and comments.
3. Should the piped-test-run deny match only a test command in command position? Today `ls tests/playwright | head` is denied too. Needs a hook change and tests.

Logging

4. Java 4xx warns now carry a stack trace for every 400, 404 and 409 (all Java repos). Keep, or ids at WARN and the throwable at DEBUG? The address-book validation 400 now logs only the rejected field names, with no throwable, because its message holds personal data.
5. ins-backend logs the address search term at INFO and the refusal body (up to 500 chars) at WARN; `FederatedTokenConfig` logs token claims at INFO, with tests pinning them. The ins-backend review also changed its TLS start-up logging.
6. Twin logging shape: animals `catchAll` logs the cause plus `dataset`, plants logs the error and now `journeyId`. Pick one, and add `journeyId` to animals 5xx logs.

Functional

7. Gateway outbox events: the code once claimed unknown fields fail, but Spring Boot's mapper ignores them in production; only unit tests with a plain `ObjectMapper` fail. Should they fail? If yes: `@JsonIgnoreProperties(ignoreUnknown = false)` or a strict reader, plus an IT through the Spring mapper.
8. `CertificateLoader` decodes base64 outside its try, so a malformed certificate stops startup instead of being skipped (as on `main`). Keep?
9. address-book enforces the path organisation twice (`IdentityHeaderFilter` and `OperatorController.authoriseOrg`); the second cannot fire. Defence in depth, or one owner?

Names and twins

10. Autocomplete helper: animals `chooseAutocompleteByLabel(page, { label })` vs plants `chooseAutocompleteOption(page, input, optionName)`. One name and signature.
11. plants `serverWideBase` vs animals `setlessBase`: one name.
12. `recordCall(call, elapsed, boolean failed)` in gateway and reference-data: an outcome enum, changed in both together. Which unit owns it?

Lint and ids

13. Widen the id patterns in step: the Node plugin misses `cv-NNN` (Java has it) and neither catches acceptance-criteria ids such as `AC3`. Changing the Node plugin means all 5 repos at once, then cleaning what it flags (three plants `cv-` ids in `services/address-book/`, ins-frontend `dashboard.fit.spec.js` titles).
14. animals-frontend `eslint-suppressions.json` is down to 3 entries, all the platform layer naming the GBN-AG set (`GBNAG_SPS_EX` in services/countries and _capture, the stub reference prefix). Clearing them means the set's configuration supplying both — a behaviour change with its own tests. Raise it? The comments that held open questions on inc-091, inc-137, inc-150 and inc-153 were deleted; check those are tracked in their backlogs.
15. The stub's `service-level-source` values (`Interim (c-011 default): §9.5 …`) are served by `/latency-profiles` and repeated in defra-id-stub and performance-tests. Remove the id in all three together?
16. `MACHINE-DRAFT Welsh` one-line headers in plants Welsh copy files: keep as a convention, or move to `copy-status.md`?

Scope of the sweep

17. Comments kept because they explain only the lines below: ins-tests paging set-up (`contact.spec.ts`, `destination.spec.ts`), the choice of Germany (`origin.spec.ts`), and the raw-document read in `persistence-notification.spec.ts`. The strict reading deletes them too.
18. Untouched files still carry history or regulation comments: plants specs `start`, `page-titles`, `addresses-picker`, `addresses-copied` in ins-tests; stub `StsSimulatorPortConfig`, `AddressLookupSimulatorController`, `EntraSimulatorController`, `StsSimulatorController` and its test; `ConflictException` and `NotFoundException` Javadocs in reference-data and stub. Sweep them in a follow-up?
19. plants-frontend: to give the shared helpers and axe check one owner, the review also edited specs this branch had not touched (helper copies only). Keep, or narrow?
20. Each Java and Node repo's `AGENTS.md` repeats the house rules, which can drift from `.claude/rules/code-quality.md`. Point to the file instead?

Build loop

21. The theme engineering review diffs `origin/main...HEAD`, so on a long-lived branch it re-reviews earlier themes. Keep, or limit it to the theme's own row commits?
22. Skim `workflow/README.md` "Why the script works as it does": 682 comment lines left the loop, and that section holds the reasons kept.
23. The `args-contract` marker's start line describes its test. Shortening it means changing every workflow script at once. Leave?

Not built (decide whether to raise)

24. Behaviour convention tests in both frontends: blank POST with `exit=hub` on every task-row page against an exported strict list, and a review row-link check against an exception list.
25. A code-style Local-mode step before an interactive or colleague push.
26. Sonar in the loop's ladder: not added, because the committed rule says workflow agents never run sonar.

Repo admin and open questions

27. ins-backend `main` needs required review (self-merged PR #21).
28. animals-frontend `services/transporters/records.js`: two commercial transporter records carry status APPROVED as a placeholder; the open question that comment held needs a home.

Pull requests

29. The performance smoke (run by every PR's E2E) stops on a p95 breach judged on 2 or 3 samples, so one slow request on a busy CI runner fails it. Options: a minimum sample count or a warm-up; stop early only on failed requests or checks and judge timings at the end; run the generator-trust check before the run can stop. Lives in trade-imports-performance-tests `src/config/thresholds.js` (`smokeThresholds`, `withAbort`).
30. PR bodies: the 11 repo PRs name the workspace by repo only; add https://github.com/DEFRA/trade-imports-workspace/pull/127. ins-frontend #58 says it "removes a catch in the metrics helper that could never run"; it now catches and logs a failed flush. tim cannot edit a PR body yet.
31. Squash-merge workspace #127 so the earlier wording in commit `5ffe47f8` stays off `main`; the branch keeps it until deleted after merge.
32. Merge order: workspace #127 first, then the 11 repo PRs.
33. Set `SONAR_TOKEN` locally if you want the pre-push gate to run rather than skip.

## Open follow-ups (no decision needed)

- animals-frontend: one axe helper in `fit/live-animals-journey.js` with the plants tags, replacing 15 inline checks on WCAG 2.0 tags only.
- `tools/review/refresh/reconcile.sh`: refreshing a review started before this branch fails to re-add an item whose category is not on the new list. Affects in-flight review data only.
- The fixer personas save a patch to `/tmp` before an E2E revert; a rename that reached a twin repo needs one patch per repo.

## Decisions made without Sam (flag on return)

- Workspace branch based on `origin/main` (its factory files equal the design-release branch's).
- Memory conflicts resolved in the memory's favour except where the audit marks it stale.
- One-off clean-up covers code on `main` only; items that exist only on design-release branches are left to the layer reviews, which now run with the flipped verifier.
- The security finding held in memory is drafted as a ticket in the workarea, not raised in Jira.
- No `workflow/lib/house-rules.js`: the loop's rules block is pinned to the rules file by a contract test instead.

## Follow-ups landed after the workflows

- Proxy credentials are never logged when the proxy URL is malformed, in all 7 Java repos.
- Checkstyle config is copied into the build and dev-run images in all 7 Java repos; none skips the check.
- The Node lint plugin is one shape: `eslint-rules/code-quality.js`, byte-identical in animals-frontend, plants-frontend, ins-frontend, animals-admin and ins-tests. It flags "Ruled" (capital R) as a ruling reference and leaves ordinary English such as "ruled out" alone.
- Plan-review calibration (`5bfda858`) and the plan lint quote fix (`a327be58`).
