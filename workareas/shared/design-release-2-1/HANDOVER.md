# Design Release 2.1 parity: handover

8 October 2026. Branch `feat/NO_JIRA-design-release-2-1` in the workspace repo, not pushed. Every service repo is on
latest `main` and untouched. The workspace stack is up from `tim docker dev`, with some extra notifications left by a
screenshot run.

## The ask (Sam, 7 October)

Use the requirements-pipeline skill to DISTIL a backlog that brings the real services up to Design Release 2.1 (DR2.1) of
the GB notification service prototype (`~/git/defra/defra-design/GB-notification-service`, pinned at `04a073b`).

- **Precedence.** The prototype wins by default. Only a DR1 judgement on the same difference, or a real constraint the
  prototype cannot express (persistence, validation, auth, cross-service), overrides it.
- **DR1 parity backlog.** Not a source of requirements. Use it only to settle a clash. It was copied from `6688fd8e` into
  `sources/dr1-parity-union/`.
- **Questions.** Keep them to a minimum, and publish them as a web page with screenshots of both sides.
- **Themes.** Draw them by the code each one touches, so they can be built in parallel. Split into one backlog per theme
  with a tested tim command. Sam has ruled: **split only after the questions are answered and the re-distil lands.**

The verbatim ruling is `sources/ruling-sam-2026-10-07.md`. The goal and repos are in `sources.json`.

## Where it stands

| Thing | State |
|---|---|
| Sources | 17 in `sources.json`. 16 are extracted and verified (about 16,000 claims). `repo:stub` was added afterwards and is still pending |
| Requirements | 1,681 (464 new, 467 change, 750 already exist, 116 out of scope) in `distil/requirements.json` |
| Conflicts | 210: 208 settled by precedence, 2 open questions (c-217, c-218) |
| Backlog | 172 increments (157 todo, 13 blocked, 2 dropped) in 14 themes over 7 waves, in `backlog.json`. `tim backlog check` and `tim distil coverage` pass |
| Report | `report.md`, saved unchanged from the run |
| Theme summaries | `theme-summaries.json`. Page: https://claude.ai/artifact/FHJCGEJ8jm7zs9mLXT4YBw |
| Decision page for the call | https://claude.ai/artifact/ChnyYcakTW2GfgG7Jx23wH (3 questions, prototype and real screenshots side by side) |
| Split | Not run. `tim backlog split shared/design-release-2-1 --json` is a dry run; add `--write` only after the re-distil |

### The 3 questions on the decision page (each has a default)

1. **c-217: address search in each environment.** Default: the stub locally, the real lookup in CDP dev, and switched
   off elsewhere until the lookup is set up there.
2. **c-218: the commercial transporter's Northern Ireland search.** Default: the same lookup filtered to BT postcodes,
   with stub data added to `trade-imports-stub`.
3. **When an animal counts as identified (DR1 inc-103, deferred to the design authority; V4 says "at least one").**
   Default: one identifier is enough to submit, every identifier is needed for Complete, and missing ones are flagged on
   confirmation and the dashboard. The pipeline left this blocked (inc-147, req-905/906/908/931/940). The page adds the
   default.

## Known issues to work through with Sam

- **Germinal products should probably be a set of its own.** The goal was widened to cover germinal products after the
  run. The backlog treats them as a category inside the live-animals journey: inc-016, 017, 024, 052, 053, 099, 105,
  141, 161, and inc-148 still leaves them off the type question. The animals frontend is organised as sets
  (`src/server/app/sets/live-animals/...`), so germinal products is likely a new sibling set with its own journey,
  obligations and dashboard section, not branches inside live-animals. Research the frontend's set architecture and
  `docs/`, then decide how the backlog should model it (likely its own theme or themes). req-1668, which puts germinal
  products out of scope, and the germinal blockers (req-979, req-1736, req-1737, req-1738) all need revisiting.
- **inc-002 contradicts itself.** Two criteria disagree on whether "Roles and addresses" saved from the overview goes
  back to the overview or on to the CPH number page.
- **The report's own consistency notes** (`reportIssues` from the run):
  - stale openQuestions on inc-128, inc-132, inc-134, inc-146 and inc-157 to inc-162;
  - area-local conflict ids (c-transporters-001, c-address-book-add-and-edit-007) cited on inc-042, inc-061, inc-062
    and inc-070;
  - c-152's challenge verdict was "blocked", but it is recorded as precedence.
- **Waves are pessimistic.** They are built at theme level: at most 3 themes run at once, over 7 steps. Rows carry their
  own cross-theme dependencies (`externalDependsOn` after the split), so real parallelism is higher. Sam was offered a
  "can start when" view per theme.
- **A dependency outside the repos.** The documents theme's URL change breaks the performance-tests repo's documents
  script, and that repo is not in the backlog.
- **Not yet proven end to end.** The two tim fixes in `da74f02e` (the trace viewer's Playwright version, and
  deterministic relays) landed after the run began.

## Next steps, in order

1. Talk the questions and the issues above through with Sam. Record every answer, including "keep the default", as
   `sources/ruling-sam-<date>.md`, in the format in DISTIL.md section 6. Put its id first in `precedence`.
2. Settle the germinal-products modelling. Update `goal`, and the repos or scope if needed, in `sources.json`.
3. Re-distil:
   `Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/distil.js", args: { workspace: "~/git/defra/trade-imports-workspace", workarea: "shared/design-release-2-1", only: null, tim: "tim", models: {}, verifyChunk: 60 } })`.
   Only new or changed sources are re-extracted, and every id is kept. Save `report.md` from `result.report`.
4. `tim backlog check` and `tim distil coverage` must pass. Then run
   `tim backlog split shared/design-release-2-1 --write --json`, which writes `themes/<id>/backlog.json` plus
   `themes/themes.json`, with branches `feat/NO_JIRA-design-release-2-1-<theme>`.
5. Regenerate the theme-summary page from the re-distilled backlog. The workflow script is in session history: one
   agent per theme, a schema'd summary, rendered with `data.js`.

## What changed in the factory (all committed on this branch)

- `tim backlog split`, themes and `externalDependsOn` (22661cc1). Split timing rule (faa4e17b).
- **Deep extract is now the only extract path** (a1b31620): characterise, then partition, then one Opus agent per part,
  then a tim merge. Opus by default, `verifyChunk` 60, and `tim distil reset`.
- **Reconcile by area, a question challenge and themes by feature folder** (da74f02e). Also `tim distil areas`,
  `merge-reconcile`, `challenge`, `reset --stage reconcile`, and coverage now fails when a source backs nothing.
- Tim test suite: 2,781 tests pass.

## Practical notes

- Bare `node` and `curl` are denied. Run node through npm scripts. `jq` is fine.
- Four `docs/repos/*.md` files are staged by someone else. Never commit them: use path-limited commits.
- Traces, videos and screenshots are gitignored, and can be regenerated with `sources/REAL-RUNS.md`,
  `prototype-specs/README.md` and `question-evidence/`.
- Wide Opus fan-out has hit the session limit once. Resume with `resumeFromRunId` and the same args.
