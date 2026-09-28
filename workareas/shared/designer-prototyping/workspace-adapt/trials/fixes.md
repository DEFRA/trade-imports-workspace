# Fixes from the four workspace-first trials

Date: 28 September 2026. Both repos on `feat/NO_JIRA-designer-prototyping`
(checked before any edit). Nothing committed. The trial reports are beside
this file (`T1-change-and-ticket.md`, `T2-new-service.md`, `T3-vague.md`,
`T4-make-it-real.md`).

Coverage: every blocker (2 distinct) and every major (13 distinct, plus
M14, which is B1 again) is fixed. The one part left is choosing the value of
`handOff.parentEpic`, which is Sam's call. All 19 minor rows are fixed,
except the T4 Validation table's stray `range.start` row, which is only
partly fixed (see "Not done"). Everything below was checked against the
code before it was changed.

## Blockers

| # | Problem | Fix | Where |
|---|---|---|---|
| B1 (T1, T2, T3, T4) | A fresh `new:set plants-working --from high-risk-plants` failed `designer:check --full` and the pre-commit hook: 18 false copy-usage errors (`commodities/list` and `commodities/details` read `copyFor(...).list` and `.details` from the shared `commodities/copy/`), and `post-handler-validates` flagged the payload-free POSTs in cancel-amend, dashboard and delete-notification. | Cherry-picked trial commit `7c5027b` (`--no-commit`, so it sits staged, not committed). I took it over `59791c8` because its bundle path follows any depth (`list/sub` gives `list.sub`), not just one folder, and its failing test still saves a payload. copy-usage now resolves a template in a subfolder of a shared copy folder against its own branch. The ESLint rule only checks handlers that read `payload`. Both have tests. CI's release canary now runs `designer:format`, then `designer:check -- --set plants-working --full` (the quick checks plus format:check, lint and npm test), in place of bare lint and test. The old canary never ran copy-usage, so it could not catch this. | prototype: `src/server/prototype-checks/copy-usage{,.test}.js`, `scripts/designer/eslint-rules/post-handler-validates{,.test}.js`, `.github/workflows/check-pull-request.yml` |
| B2 (T2) | Conventions-pass layer 2 could not run: `tools/style/prepare-style-local.sh` and `tools/review/prepare-review-local.sh` were mode 100644. | `git update-index --chmod=+x` on both (staged). The working-tree `chmod +x` was blocked by the guard-bash hook ("write-then-execute guard"), so Sam runs `! chmod +x tools/style/prepare-style-local.sh tools/review/prepare-review-local.sh` once, or the mode arrives with the next commit and checkout. No new allow rule is needed: `Bash(~/git/defra/trade-imports-workspace/tools/**)` already covers `start-style.sh --local` by its tilde path (settings-proposal.md, section (g)). conventions-pass.md now gives the exact tilde-path calls, bans the `bash <script>` workaround, and has an inline, no-subagent checklist (code-style, hapi, jsdoc, service shape, copy) for a session with no Task tool or a script that fails to start. | workspace: `tools/{style,review}/prepare-*-local.sh` (mode), `.claude/skills/prototype/references/conventions-pass.md`, `workareas/.../settings-proposal.md` |

Verified: with a fresh `plants-working` release and all prototype changes in
place, `designer:check -- --set plants-working --full` passes (see
"Verification").

## Majors

| # | Problem | Fix | Where |
|---|---|---|---|
| M1 (T1, T3) | The one-branch rule ("on main make design/\*; on any other branch stay on it") put designer work on a maintainer's `feat/` branch. | New rule, the same in every place: **stay only on a `design/*` branch (or `handoff/*` for the upstream-bound route); from any other branch (`main`, `feat/*`, `chore/*`, trial) make `design/<release>-<slug>` first**, from `main` or from the current branch when `main` lacks the suite, said in one line. The design-session workflow now creates the branch from any non-design branch too. | workspace: `SKILL.md` (new rule 11), `ROUTING.md` "Branches", `share-my-change.md`, `change-the-words.md`, `change-the-journey.md`, `design-release.md`, `workflow/design-session.js`; prototype: `AGENTS.md` "Branches" |
| M2 (T1) | AGENTS.md said there are no `handoff/*` branches; ROUTING.md, change-the-words.md, `designer:handoff` and guard-edit all use them. | Kept `handoff/*` (the patch machinery depends on it) and put it back in AGENTS.md, scoped to the upstream-bound route: the real journey is changed only to make a checked `upstream.patch`, never merged, and the real build still happens in plants-frontend on `feat/…`. ownership.md says the same. Maintainer branches are `chore/*` everywhere (the workspace naming rule); the skill's `maintain/*` wording is gone. | prototype: `AGENTS.md`, `.claude/rules/ownership.md`; workspace: `SKILL.md`, `ROUTING.md`, `share-my-change.md`, `build-it-for-real.md` |
| M3 (T1, T4) | raise-the-story.md stopped before the dry run whenever a story placeholder remained, so a designer never saw the plan. | The dry run always runs (it sends nothing). Placeholders and a missing epic are asked for in the same message as the plan, with the yes; only `--confirm` is blocked while a placeholder remains. hand-off.md step 4 now carries on to raise-the-story when a ticket was asked for, rather than stopping. | workspace: `raise-the-story.md`, `hand-off.md` |
| M4 (T1) | `tim jira epics` failed with "Jira returned 410". | Confirmed the cause: Atlassian removed `/rest/api/{2,3}/search` (`tools/jira/search.sh` already uses `/rest/api/3/search/jql`). `listOpenEpics` now calls `/rest/api/3/search/jql?…&fields=summary&maxResults=100`. The nock tests are updated. **Verified live**: `tim jira epics --json` returns 24 open EUDPA epics. raise-the-story.md says what to do if it fails again. `handOff.parentEpic` stays `null`: see "Not done". | workspace: `tim/src/clients/jira-client{,.test}.js` |
| M5 (T3) | No designer marker, and a vague "the dashboard" in a bare workspace session could go to frontend-change. | The workspace CLAUDE.md already has the `prototype` row. It now adds a rule: with no `CLAUDE.local.md` marker, a request that names only a page several services have gets one question (the prototype, or which service?). ROUTING.md step 0 says the same and offers `tim prototype setup` once the answer is the prototype. | workspace: `CLAUDE.md`, `ROUTING.md` |
| M6 (T3) | "How every change ends" used `designer:show --before`, which a release with no saved commit cannot do. | New step 0: take a plain picture before the first edit. Use `--before` only when `git log -1 -- src/server/app/sets/<id>` shows a commit. The worked example's `--before` is gone too. | workspace: `ROUTING.md`, `fake-a-service.md` |
| M7 (T2) | AGENTS.md and ownership.md said a prototype-owned service folder could be changed "only through the service scaffold", but the scaffold has no change verb. | A new service is made only by `designer:service -- new`. An existing one is edited in place through fake-a-service.md, with its shape, `contract.json` and test kept in step. fake-a-service.md now says this under "What is there already". | prototype: `AGENTS.md` rule 6, `.claude/rules/ownership.md`, `.claude/rules/designer-sets.md`; workspace: `fake-a-service.md` |
| M8 (T2) | Worked example 1 stored `{ transporterId }` with an `owned-parties.js` lookup, against its own "a copy is the default" guidance, and kept the empty-Continue refusal against "an optional page has no error state". | Rewritten. The answer is a copy made by `transporterAnswerOf(chosen)`, which keeps the id only to tick the row again. Check your answers needs no new file: `partiesFor` already shows a saved answer with no `addressId` as it is, so the only change is `'transporter'` in its field list (checked in `check-answers/controller.js`). The required and optional rules are now explicit: when optional, a blank Continue moves on and a choice not in the list is refused. | workspace: `fake-a-service/fake-a-service.md` |
| M9 (T2) | Worked example 1 left out `RUN_STEPS` and the happy-path steps, and check-my-change blamed the maintainer for the walk failure that followed. | New "Put the page in the walk" section: `run.js` `RUN_STEPS` (shape checked in `flow/run.js`), plus a step in every happy-path scenario (the `{slug, fields}` shape, a starter id, and `"fields": {}` for an optional page that is skipped). check-my-change.md now treats a walk that reached the wrong page as the designer's change (a missing RUN_STEPS or happy-path step), and a fresh release failing on unchanged files as the maintainer's. | workspace: `fake-a-service.md`, `check-my-change.md` |
| M10 (T4) | build-it-for-real.md had no step for a design with no hand-off yet. | New first section: with no hand-off folder, go to hand-off.md first (it makes the change, saves it and writes the folder), then come back, and say so in one line. | workspace: `build-it-for-real.md` |
| M11 (T4) | Worked example 2 failed the prototype's own lint: save-as-template never called `validate()`, and `/templates/{templateId}/use` had no Joi params. | The POST now uses `requiredMaxText` with `validate()` from `lib/validate` (signatures checked), and the copy gains an `errors.tooLong` string. The route gets a `template-id-params.js` of the same shape as `transporter-id-params.js` and ins-frontend's `address-id-params.js`, with a `failAction` that throws `Boom.notFound()`. The pattern matches the ids `idFromName` makes in `services/templates/stub.js`. | workspace: `fake-a-service.md` |
| M12 (T4) | `designer:handoff`'s Tech Notes had no backend or platform conventions and named the branch for plants-frontend only. A re-run overwrote any hand edits. | `brief.js` now adds, whenever a service names an owner backend, a "Backend house conventions" line (java/ and rest-api best-practices, noun endpoint, records with null guards, ITs under `mvn verify`, plants-backend's `notification` package as the exemplar) and a "Platform" line (a cdp-app-config entry drafted for the product owner). The Branch line always names every repo the story reaches, plus the workspace for openspec ("the same name in each"), and says "the backend repo once its owner is agreed" when the owner is `new-api` or `ins`. Tests cover the frontend-only, new-api and plants-backend cases. | prototype: `scripts/designer/handoff/brief{,.test}.js` |
| M13 (T4) | house-conventions.md had no backend rung. | New "Backend (owner repo)" and "Platform config" sections, all paths checked: java/modern-java, spring-boot, spring-data-mongodb, testing/, openapi-springdoc, rest-api, the plants-backend `notification` package, the address-book contract, and `cdp-app-config-draft.md` as the worked example. build-it-for-real's C2 distil request now names them. | workspace: `house-conventions.md`, `build-it-for-real.md` |
| M14 (T4) | Trial fix `59791c8` lived only on a trial branch. | Covered by B1 (the equivalent `7c5027b` is staged on the feature branch). | — |

## Minors

| # | Problem | Fix |
|---|---|---|
| m1 (T1) | `designer:handoff` did not list ruling c-002, whose `specChanges` quote the replaced hint. | New `rulingNotesFor` in `build.js` reads each `rulings.json` hit in `specImpact` and names the ruling whose `specChanges` quote the old words, with its target and the first sentence of its resolution. It goes in `report.rulingNotes`, and the brief shows it as "Standing ruling c-002 chose the words this change replaces…" under "What cannot ship". Deliberately **not** in `rulingConflicts`: that list sends the brief down the C2 requirements-pipeline route, which is wrong for a two-string wording change. hand-off.md tells the agent to name the ruling to the designer. Tested. |
| m2 (T1) | change-the-words.md did not cover a hint keyed by state. | New rule: change the states whose situation matches the designer's words, and say in one line which states were left unchanged. |
| m3 (T1, T2) | `tim backlog standards --files a,b` read the comma-joined value as one path. | `--files` now splits on commas as well as repeating. Help text updated. New behavioural test. conventions-pass.md shows the repeated form. |
| m4 (T1, T3) | Layer 2 ran the full code-style fan-out even for a words-only or template-only change. | conventions-pass.md "When layer 2 runs": for string values only, the copy rule and gds/language.md; for templates only, the nunjucks, govuk-frontend and gds/components guides and templates.md; for any other `.js`, the full layer 2. |
| m5 (T1, T2, T4) | The GOV.UK wording note flagged "Great Britain" as Title Case. | `gds-wording.js` now ignores proper nouns (UK nations, Great Britain, Northern Ireland, United Kingdom, European Union, Welsh, English, Defra, GOV.UK, days, months) when it counts capitals. Tested both ways: Great Britain passes, while "Import Plants To Northern Ireland" is still flagged. The canary run's two notes are gone. |
| m6 (T1) | `designer:words find` printed a bare `npm run designer:show`. | It now prints the tilde `npm --prefix ~/git/…/trade-imports-plants-prototype run designer:show` form. |
| m7 (T1) | copy.md's date example did not suit a date-picker text input. | The example now follows the input: "27 3 2026" for the three-box date input, "27/3/2026" for a single box or the date picker. |
| m8 (T1) | The workspace gds/ docs had no hint-text guidance. | New "Hint Text" section in `docs/best-practices/gds/language.md`: how to answer, not a restatement; one sentence, no links; examples that match the input; hints keyed by state; proper nouns. |
| m9 (T1) | The brief's "Welsh needed" gave the same line for two keys with the same words. | `findWelshMarkers` gives each leaf its own line (a line already given to one leaf is not given to another). Tested. |
| m10 (T2) | example-data.md forbade editing `happy-path.json` and `services/*/stub*` outright. | Scoped: `happy-path.json` is never edited just to make an example, never in `high-risk-plants`, but must change in a release when its journey changes. Stub rows are forbidden only for real services; a prototype-owned `stub.js` is the release's to change. |
| m11 (T2) | The sample-journey saved-transporters copy said "Enter the country" for a select and had no messages for its `maxText` rules. | "Select the country", and an `errors.tooLong.*` group ("… must be N characters or less"), with `[Welsh needed]` pairs, passed as each `maxText` message in `fields.js`. |
| m12 (T3) | `release retire --discard` refused a never-saved release whose files a failed save left staged. | `retire` now judges "never saved" by the last commit (`isCommitted`, via `ls-tree HEAD`), not the index. For such a release it removes the files with `git rm --cached -f` and resets the three shared files' index entries. Tested: a staged, never-saved release is discarded to a clean tree. |
| m13 (T3) | A new release got 4 examples and no late one. | `defaultExamples` adds a "Submitted late" example (`submitted-late`) whenever the happy path has a fixture marked `"late": true`. A copy of high-risk-plants now gets the real journey's first five examples, including the Late tag. The existing "first N examples match" test covers it. docs/designers/example-data.md updated. |
| m14 (T4) | house-conventions.md said the real plants clients read `process.env`, but services.md lists the convict key `tradeImportsPlantsBackendApi.baseUrl`. | Both confirmed (docs line 60; `persistence/records/real/config.js` reads the env var). The entry now names both, says the code and the docs disagree, and tells every hand-off to name both and leave the choice to the real team. |
| m15 (T4) | prepare-handoff had no by-hand path, and its plan step refused a brief-only hand-off. | build-it-for-real.md has "With no Workflow tool: the same plan by hand" (6 read-only steps). The plan step now accepts a brief-only hand-off for C2 and refuses it only for an explicit C1. |
| m16 (T4) | build-it-for-real said the workspace is never switched, but branch parity needs the same name there. | One rule: the workspace takes the same branch name when the developer applies `openspec.patch`, never under a designer session. The generated Branch line now names the workspace too (M12). |
| m17 (T4) | `tim workspace branch <new> --dry-run` refused a branch that exists nowhere. | Under `--dry-run`, a full branch name found in no repo is a planned branch. The result has `planned: true`, and each cloned repo shows `would-create` with the default branch it would be made from (not-cloned repos are `skipped`). Without `--dry-run`, and for a bare ticket reference, it is still not-found. Two new behavioural tests. |
| m18 (T4) | raise-the-story step 1 stopped before the dry run. | Covered by M3. |
| m19 (T4) | The brief's Validation table listed `TEMPLATE_ID_PATTERN` as a rule. | `validationCallsIn` no longer matches a validator name straight after a dot, so `Joi.string().pattern(X)` is not read as the `lib/validate` `pattern` factory. Tested. |

## Not done, and why

- **`handOff.parentEpic` in `scripts/designer/prototype.json` stays
  `null`.** `tim jira epics` works now, and it lists EUDPA-407 "High-risk
  plants import notification journey" and EUDPA-450 "Prototype working
  model for higher-fidelity prototypes". Which one takes a designer's
  stories is the plants team's call, as the trial itself said. Until then
  raise-the-story step 3 lists the epics and asks.
- **The dashboard `range.start` row in T4's Validation table** is only
  partly fixed. I could not reproduce it without T4's release. The dot-guard
  (m19) removes the Joi false positive. Any other stray row would come from
  a validator in a changed page's own sources, and the brief already marks
  unchanged rules as unchanged.
- **Why the old PR canary missed B1** is answered, not fixed separately:
  it ran only `lint` and `npm test`, and copy-usage runs only inside
  `designer:check`. The canary now runs `designer:check --full` (B1).

## Verification

- Prototype: made a fresh `plants-working` from `high-risk-plants` and ran
  `designer:format`, then `designer:check -- --set plants-working --full`,
  once after the cherry-pick and once with every prototype change. The
  result is under "Final runs" below. The throwaway release was then
  discarded (`git restore` plus `git clean` of its paths). The staged
  cherry-pick and every other edit stay uncommitted.
- tim: `npm --prefix ~/git/defra/trade-imports-workspace/tim test` and
  `run lint`; see "Final runs". `tim jira epics --json` was checked live
  (read-only).
- Nothing was pushed, and no Jira ticket was created or changed. The real
  `trade-imports-plants-frontend` was only read.

### Final runs

- `designer:check -- --set plants-working --full` on a fresh release copied
  from high-risk-plants, with every prototype change in place: **all 12
  steps passed**, with 3,337 unit tests, 75 prototype checks and no wording
  notes (before the fix: 18 copy-usage errors and 4 lint errors).
  The first full run after the late-example change failed on
  `examples.test.js`, which pinned four defaults. That test now expects the
  fifth, and the re-run passed.
- `designer:check -- --set sample-journey --quick`: passed.
- `designer:release -- retire plants-working --discard` then threw the
  release away, which also exercised the m12 fix. `git status` afterwards
  shows only the intended changes, and `overrides.json` and the
  `prototype-sets` files are back as they were.
- tim: `npm test` passed all 151 files and 1,894 tests. `run lint` is
  clean, and `run format` reformatted `jira-client.test.js` only. The
  golden-routing test timed out once while the prototype check ran beside
  it; run on its own it passed in 17s, and the full suite then passed.
- `tim jira epics --json` (live, read-only): `ok: true`, 24 epics.

### What Sam still does by hand

1. `! chmod +x tools/style/prepare-style-local.sh tools/review/prepare-review-local.sh`
   (the execute bit is staged in git; the hook blocked the on-disk chmod).
2. Pick `handOff.parentEpic` (EUDPA-407 looks right for plants stories).
3. Commit: the prototype has the cherry-picked check fix staged, and the rest
   unstaged. Workspace rule 2: both repos stay on
   `feat/NO_JIRA-designer-prototyping`.
