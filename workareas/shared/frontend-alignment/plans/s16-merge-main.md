# s16-merge-main — pull main into the alignment branch and analyse what moved

Ruling (Sam, 16 September 2026): main has moved under these repos since the alignment was built; analyse the
changes on main since the initial work and pull them in, as a dedicated item at the front of the queue. Question 27
(the workspace branch behind main) closes with it; question 13's countries evidence comes out of it. The ruling is
settled; this plan carries it out and nothing else.

| key | role | Bash path | Read/Edit path |
|---|---|---|---|
| animals | **merges `origin/main`** (ten commits) | `~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-animals-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-animals-frontend` |
| tests | **merges `origin/main`** (five commits) | `~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-animals-tests` | `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-animals-tests` |
| ins | main not moved — **fetch, log, note, nothing else** | `~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-ins-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-ins-frontend` |
| plants | main not moved — **fetch, log, note, nothing else** | `~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-plants-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-plants-frontend` |
| workspace | stages.json, this plan, logs; **no merge here** (already level with main, see D9) | `~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace` | `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace` |

Branch: `feat/NO_JIRA-frontend-alignment`, checked out and level with `origin` in every clone (planner verified
`git status --short --branch` shows no ahead/behind in all four). Never touch anything under
`~/git/defra/trade-imports-workspace/repos/` — those are Sam's live checkouts.

Pinned SHAs at planning time (16 September 2026, after `fetch origin` in every clone):

| repo | branch HEAD | `origin/main` | merge base | `git log --oneline HEAD..origin/main` |
|---|---|---|---|---|
| animals | `b9b2d6b1` | `38d4cf59` | `0033bcf6` | ten commits (§Classification) |
| tests | `60692b8` | `864e246` | `10c4379` | five commits (§Classification) |
| ins | `da05f1f` | `2c96cbcc` | — | empty: `origin/main` is already an ancestor of HEAD |
| plants | `cf01b98a` | `b6ac0e39` | — | empty: `origin/main` is already an ancestor of HEAD |
| workspace | `0d6b8805` | level | — | empty; `merge-base --is-ancestor 79064207 HEAD` exits 0 |

Ladder: **animals** `format:check`, `lint`, `test`. **tests** `typecheck`, `lint`, `format:check` — never its `test`
script (needs a deployed environment; the workspace E2E at land proves it). Rollback is `git stash push -u` only;
an unwanted merge commit is undone with `git -C <repo> reset --merge ORIG_HEAD` (not `--hard`) — but see D3: the
preview is clean, so this should never be needed.

## Baseline — read this before step 0

All six ladder scripts were run by the planner on the branch heads above, each to a log, each exit 0:

| log (under `logs/`) | result |
|---|---|
| `s16-merge-main-baseline-animals-format-check.log` | "All matched files use Prettier code style!" |
| `s16-merge-main-baseline-animals-lint.log` | eslint clean, stylelint clean, depcruise "no dependency violations found (499 modules, 1580 dependencies cruised)", "3 known violations ignored" |
| `s16-merge-main-baseline-animals-test.log` | **Test Files 179 passed, 2 skipped (181); Tests 2239 passed, 8 skipped (2247)**; coverage 91.08% statements |
| `s16-merge-main-baseline-tests-typecheck.log` | `tsc --noEmit` clean |
| `s16-merge-main-baseline-tests-lint.log` | `eslint .` clean |
| `s16-merge-main-baseline-tests-format-check.log` | "All matched files use Prettier code style!" |
| `s16-merge-main-baseline-workspace-ci-runs.log` | workspace PR 47 E2E: last four runs `success` (latest 35073631134, 2026-09-16T08:24:49Z); the two `failure` rows are the pre-Floci-fix runs |

Both clones have `node_modules/`; neither main brings a `package.json` or lockfile change (planner diffed
`package.json package-lock.json` between the merge base and `origin/main` in both repos: empty), so **no install is
needed after the merge**.

## 0. Decisions

| # | Decision |
|---|---|
| D1 | **Two repos merge, two do not.** ins and plants print nothing for `HEAD..origin/main` — record "main not moved" in notes (with the SHAs) and do nothing else there. animals and tests merge. The implementor re-runs the fetch and the log in every repo at implement time; if ins or plants has moved by then, STOP and report — do not merge an unplanned repo. |
| D2 | **Merge order: animals first, then tests.** The tests repo's five commits follow the hub renames animals' commits make (EUDPA-606/607, the DR1 hub rows); the workspace E2E at land needs both branch images rebuilt, and animals' CI is the slower one. Order only matters for the E2E; the two merges are independent at file level. |
| D3 | **No conflicts are expected — the planner proved it.** `git merge-tree --write-tree --messages HEAD origin/main` printed only a tree OID in both repos (`f1dd3ab8…` animals, `a1387c1f…` tests) and no `CONFLICT` line. The file sets are disjoint: animals' alignment diff since the merge base is 16 files (all under `src/auth`, `src/config`, `src/plugins`, `src/server/auth`, `src/server/app/{auth,shared,copy-convention.test.js}`); main's 62 files touch none of them. tests' alignment diff is one file (`tests/security/ins/address-book.spec.ts`); main's 18 files do not include it. So §2 "Edits" is the merge itself and nothing hand-written. |
| D4 | **If git reports a conflict anyway** (it will not on the pinned SHAs; it could only if main moves again before implement), resolve so main's behaviour and the alignment's file layout and helper names both survive; never drop a main hunk; record `file — choice` in notes for every resolved file. Then STOP after the merge commit and report the resolutions before the ladder, so the parent can judge them. |
| D5 | **The merge commit is the stage's one commit.** Made with `git merge --no-ff origin/main -F <message file>` exactly as the brief says. Anything the ladder then needs (it should need nothing — see D7) is **staged, not committed**; the orchestrator commits it at land, as in s15 step 10. |
| D6 | **Message files are written with the Write tool before the merge**, one per repo, under `logs/`: `logs/s16-merge-main-commit-animals.txt` and `logs/s16-merge-main-commit-tests.txt`. Subject, body and trailer are given verbatim in §2A and §2B. Copy them exactly; prettier does not touch `logs/`. |
| D7 | **Semantic conflicts the planner checked and cleared.** (a) main's `errors.test.js` calls `config.set('stubMode', false)` — the alignment's `strict-boolean` convict format accepts a real boolean and `config.set` does not validate; the alignment's `config.js` still has `stubMode` (line 270). (b) main's new route in `errors.test.js` is `options: { auth: false }`, the same as the existing `/test/programming-error` route, so the alignment's auth plugin does not intercept it. (c) The alignment's `copy-convention.test.js` pins `sharedCopy` keys (`layout`, `unauthorised`, …); main's copy changes are all under `sets/live-animals/…/hub/copy/`, not `shared/`. (d) The alignment exported `sharedCopy` from `kit.js`; main's hub controller does not touch `kit.js`. (e) main's `routes.js` change only removes the three prime imports and the `if (!isStubMode())` block; the alignment never touched `routes.js`. (f) `@hapi/boom`, which main's `countries/index.js` and `ports/index.js` now import, is not declared in any of the three frontends' `package.json` (it hoists through `@hapi/hapi`); animals already imports it in `src/server/app/engine/journey.js`, it is installed in the clone (`node_modules/@hapi/boom/package.json` exists), and main's own CI is green with it. It is the same phantom class as `joi` (question 22) — noted for the countries stage, not fixed here. (g) `.dependency-cruiser-known-violations.json` is untouched by main; main's `routes.js` only removes imports, so `lint:arch` cannot gain a violation. |
| D8 | **Question 13 evidence is written into notes now (planner) and re-affirmed by the implementor after the merge** by quoting the post-merge `git -C animals show HEAD:src/server/app/services/countries/index.js` head (the `ensureLoaded` export) — the note text is in §6D. The countries stage ports main's shape; this stage changes no ins or plants source. |
| D9 | **Question 27 needs no merge in the workspace repo.** The workspace clone's branch prints nothing for `HEAD..origin/main` (the only fetch delta was `gh-pages`), already contains `79064207 fix(stack): probe floci's health without curl (#46)` (`git merge-base --is-ancestor 79064207 HEAD` exits 0 — merged as `fb80f548`), and PR 47's E2E is green on its last four runs. The stage records this in notes; the report refresh closes the question. The workspace repo is not in this stage's `repos` list and is not touched by the implementor beyond stages.json and logs. |
| D10 | **The stage's ladder for the tests repo is the brief's, not the stage's `ladder` array.** The array (`format:check`, `lint`, `test`) is the frontend ladder; for the tests repo run `typecheck`, `lint`, `format:check` and never `test`. |
| D11 | **No `format` run before `format:check`.** Nothing is hand-edited, main is prettier-clean on its own CI, and the merge is textual. If `format:check` is red after the merge, run `npm --prefix <repo> run format`, read `git status --short`, and report the file list — do not commit (D5). |

## Classification of every main commit

### animals — ten commits (`0033bcf6..38d4cf59`), 62 files, +1103/−552

Chassis surfaces per the brief: `src/auth`, `src/plugins`, `src/server/common`, `src/server/auth`, `src/config`,
`src/server/router.js`, `package.json`. `src/server/app/routes.js` is the live-animals plugin (app-level, not
chassis) but the brief names it, so it is called out.

| commit | subject | class | files that matter |
|---|---|---|---|
| `ab5cf60e` #345 | hub divides a notification into different sections from DR1 | journey | `sets/…/hub/{controller.js, copy/copy.en.js, copy/copy.cy.js, copy/copy.test.js, hub.fit.spec.js, template.njk}` |
| `9591d58e` #347 | hub lists animal identification after additional details | journey | `sets/…/hub/{controller.js, copy/copy.test.js, hub.fit.spec.js}` |
| `401f9011` #346 | EUDPA-575 store address country as ISO code, drop mapper reverse lookup | app services + journey | `services/address-book/{client.js, to-wire-address.js, to-wire-address.test.js}`, `services/persistence/records/notification-mapper/notification-mapper.test.js`, `sets/…/transport/private-transporter-details/…controller.js`, `sets/…/fixtures/{characterisation-corpus.js, characterisation-oracles.json}` |
| `c2e8c681` #348 | EUDPA-575 mark reference-data readers async, no behaviour change | app services + journey | `services/{address-book/client.js, countries/index.js, ports/index.js, run-mode.test.js, transporters/transporters.test.js}` and 24 journey files that now `await` the readers |
| `fb3615e3` #349 | EUDPA-575 load reference data on first read, not at startup | **chassis + app services** | chassis: `src/server/common/constants/status-codes.js` (+`serviceUnavailable: 503`), `src/server/common/helpers/errors.test.js` (+1 route, +1 test proving the 503 page). app: `src/server/app/routes.js` (boot priming removed), `services/countries/index.js`, `services/ports/index.js`, `services/run-mode.test.js` (+lazy-load tests), `services/address-book/address-book.test.js` (mocks the countries reader), `services/persistence/records/real/real.amend-list.test.js`, two journey controller tests |
| `3ec5eae4` #350 | hub has no "Review and submit" button; review is a locked task row | journey + docs | `fit/{journey-smoke.fit.spec.js, live-animals-journey.js}`, `sets/live-animals/docs/{add-a-section.md, journey-flow-and-gates.md}`, hub controller/copy/template/fit, eight feature fit specs |
| `9d46213a` #351 | one hint on one hub row, worded as DR1 | journey + docs | `sets/live-animals/docs/add-a-section.md`, hub controller/copy/fit |
| `a0c970a8` #352 | six hub task rows relabelled (EUDPA-606) | journey | `fit/*`, four documents fit specs, hub copy |
| `fed3b548` #353 | EUDPA-607 hub task status is Complete or To do only | journey | hub controller/copy/fit, four feature fit specs |
| `38d4cf59` #354 | Exit details row has no link (test) | journey test | `sets/…/hub/copy/copy.test.js` |

**Chassis files main changed that the alignment branch also changed since the merge base: none.** Alignment's 16
files: `src/auth/get-safe-redirect.js`, `src/auth/get-safe-redirect.test.js`, `src/auth/refresh-tokens.js`,
`src/auth/refresh-tokens.test.js`, `src/config/config.js`, `src/config/config.test.js`, `src/plugins/auth.js`,
`src/plugins/auth.test.js`, `src/server/app/auth/unauthorised.njk`, `src/server/app/auth/unauthorised.test.js`,
`src/server/app/copy-convention.test.js`, `src/server/app/shared/copy.cy.js`, `src/server/app/shared/copy.en.js`,
`src/server/app/shared/kit.js`, `src/server/auth/controller.js`, `src/server/auth/controller.test.js`. Main's 62
files contain none of them. The only chassis files main touched are `status-codes.js` and `errors.test.js`, which
the alignment never edited in animals (they are the question 25 and question 12 files for ins, untouched here).

### tests — five commits (`10c4379..864e246`), 18 files, +143/−58

| commit | subject | class | files |
|---|---|---|---|
| `853c9ac` #228 | read the hub's sections off the DR1 tasklist | test code | `tests/e2e/features/hub-groups-and-cya-rows.spec.ts` |
| `3ceb957` #212 | EUDPA-369 assert the newly mapped GBN-AG event fields | test code + domain model | `domain/models/db/outbox-event-document.ts` (+42: region of origin, CPH, transited countries, transport document, per-species trade line), `tests/e2e/features/admin/outbox-event-notification.spec.ts` (+30) |
| `18034d7` #229 | review is a locked task row, no "Review and submit" button | test code | `flows/journey.ts`, `page-objects/notification/overview-page.ts`, three a11y specs, `addresses-live-link`, `addresses-submit-freeze`, `amend-resubmit`, `hub-groups-and-cya-rows` |
| `d539d35` #230 | EUDPA-606 follow the six renamed hub task rows | test code | `flows/journey.ts`, two a11y specs, six e2e feature specs, `tests/security/frontend-conditional-pages.spec.ts` |
| `864e246` #231 | DR1 hub task status is Complete or To do only | test code | `tests/e2e/features/{reason-purpose-scope, transit-means-scope}.spec.ts` |

No chassis: `package.json`, lockfile, `tsconfig.json`, eslint config, both Playwright configs and `.github/` are
untouched (planner diffed them: empty). **Files main changed that the alignment also changed: none** — the
alignment's one file is `tests/security/ins/address-book.spec.ts`.

## 1. Moves

None. The merge renames nothing (both `--name-status` listings are all `M`).

## 2. Edits

Nothing is hand-edited. The two "edits" are the merge commits, each with a message file.

### 2A. animals — message file, then merge

Write `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s16-merge-main-commit-animals.txt`
with exactly this content (the trailer is the two lines every alignment commit carries, e.g. `11217d64`):

```
chore(alignment): merge main into the alignment branch

Ten commits from main since the last merge (0033bcf6):

- 38d4cf59 test(parity-dr1): Exit details hub row has no link (#354)
- fed3b548 EUDPA-607 hub task status is Complete or To do only (#353)
- a0c970a8 feat(parity-dr1): six hub task rows relabelled to DR1 (#352)
- 9d46213a feat(parity-dr1): one hint on one hub row, worded as DR1 (#351)
- 3ec5eae4 feat(parity-dr1): review is a locked hub task row, no
  "Review and submit" button (#350)
- fb3615e3 feat(EUDPA-575): load reference data on first read, not at
  startup (#349)
- c2e8c681 refactor(EUDPA-575): mark reference-data readers async (#348)
- 401f9011 refactor(EUDPA-575): store address country as ISO code (#346)
- 9591d58e feat(parity-dr1): animal identification hub row before
  additional details (#347)
- ab5cf60e feat(parity-dr1): DR1 hub sections and headings (#345)

Chassis surfaces main touched: status-codes.js gains serviceUnavailable
and errors.test.js proves the 503 page; app/routes.js no longer primes
countries and ports at boot. None of the sixteen files the alignment
changed since the merge base is among main's sixty-two, so the merge is
clean and every main hunk lands as main wrote it.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012yTqNbopC6utUE3M1TKrj6
```

Then, one Bash call:

`git -C ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-animals-frontend merge --no-ff origin/main -F ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s16-merge-main-commit-animals.txt > ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s16-merge-main-animals-merge.log 2>&1`

Read the log once. Expected: "Merge made by the 'ort' strategy." followed by the 62-file stat ending
`62 files changed, 1103 insertions(+), 552 deletions(-)`. Anything containing `CONFLICT` → D4.

### 2B. tests — message file, then merge

Write `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s16-merge-main-commit-tests.txt`:

```
chore(alignment): merge main into the alignment branch

Five commits from main since the branch was cut (10c4379):

- 864e246 feat(parity-dr1): DR1 hub task status is Complete or To do
  only (#231)
- d539d35 test(e2e): EUDPA-606 follow the six renamed hub task rows
  (#230)
- 18034d7 feat(parity-dr1): review is a locked hub task row, no "Review
  and submit" button (#229)
- 3ceb957 test(e2e): EUDPA-369 assert the newly mapped fields on the
  submitted GBN-AG event (#212)
- 853c9ac test(e2e): read the hub's sections off the DR1 tasklist (#228)

All test code: the DR1 hub specs, page objects and journey flow, and the
outbox event model. Main did not touch the one file the alignment
changed (tests/security/ins/address-book.spec.ts), so the merge is
clean.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012yTqNbopC6utUE3M1TKrj6
```

Then:

`git -C ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-animals-tests merge --no-ff origin/main -F ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s16-merge-main-commit-tests.txt > ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s16-merge-main-tests-merge.log 2>&1`

Expected: "Merge made by the 'ort' strategy." and `18 files changed, 143 insertions(+), 58 deletions(-)`.

### 2C. ins and plants — fetch, log, note

`git -C <clone> fetch origin` then `git -C <clone> log --oneline HEAD..origin/main`. Expected empty in both.
Append to the stage's `notes` (Edit tool on stages.json, keep it valid, `jq empty` after):
`"ins: main not moved — origin/main 2c96cbcc is an ancestor of branch HEAD da05f1f; nothing merged, nothing touched."`
and
`"plants: main not moved — origin/main b6ac0e39 is an ancestor of branch HEAD cf01b98a; nothing merged, nothing touched."`
(substitute the SHAs `git rev-parse HEAD origin/main` prints if they differ). If either log is non-empty: STOP, report
the commits, merge nothing (D1).

## 3. New files

None in any repo. The two message files and the logs live under the workspace's `workareas/shared/frontend-alignment/logs/`.

## 4. Imports

No import is rewritten. main's `routes.js` hunk removes three imports (`isStubMode`, `countries`, `ports`); the
merge applies it as-is. Do not "tidy" any import in either repo.

## 5. Tests

Nothing is written or moved by hand. Tests arriving from main, all landing verbatim:

| repo | file | what it pins |
|---|---|---|
| animals | `src/server/app/services/run-mode.test.js` | countries and ports: self-load on first read, fetch once across readers, retry after a failed load, `Boom.serverUnavailable` (503) shape, stub-mode short-circuit; mode resolution from `STUB_MODE` |
| animals | `src/server/common/helpers/errors.test.js` | a route that reads `countries.originLabel` in real mode with no fetch stubbed renders the shared error page as **503** with `>503</h1>` |
| animals | `src/server/app/services/address-book/address-book.test.js` | address-book tests mock `../countries/index.js` (`ensureLoaded`, `originLabel`) so they never trigger a countries load |
| animals | hub `copy.test.js`, `hub.fit.spec.js`, and the feature fit specs | DR1 hub sections, row order, labels, hint, locked review row, two-state status |
| animals | `to-wire-address.test.js`, `notification-mapper.test.js`, fixtures | address country stored as ISO code |
| tests | `tests/e2e/features/admin/outbox-event-notification.spec.ts` + `domain/models/db/outbox-event-document.ts` | EUDPA-369 GBN-AG event fields |
| tests | hub/journey specs, `flows/journey.ts`, `overview-page.ts`, a11y and security specs | the DR1 hub as the animals commits above render it |

Expected after the merge: animals `test` **0 failed**; the passed count exceeds the baseline 2239 (main adds tests
in `run-mode.test.js`, `errors.test.js`, `address-book.test.js`, `real.amend-list.test.js`, hub `copy.test.js`);
record the exact "Tests N passed" line in notes. tests repo: `typecheck`, `lint`, `format:check` all clean.

## 6. Invariants to prove

**6A. The merge is a true two-parent merge with main's tree intact (invariant 3, D3).**
- `git -C <animals> log -1 --format='%P'` prints `b9b2d6b12950ecf0243e275ec2790fddeda925e5 38d4cf594d6345543513c480bdc4970e9d82a80c`.
- `git -C <tests> log -1 --format='%P'` prints `60692b89218a116920191357594958e7050c6a94 864e246a0da3d2950075026900dd80151844ab5b`.
- `git -C <animals> diff --name-only origin/main` prints **exactly the 16 alignment files** listed under
  §Classification and nothing else — every main hunk survived unchanged.
- `git -C <tests> diff --name-only origin/main` prints exactly `tests/security/ins/address-book.spec.ts`.
- `grep -rln '^<<<<<<< ' <animals>/src` and `grep -rln '^<<<<<<< ' <tests>/tests` print nothing (no markers).
- `git -C <animals> status --short` and `git -C <tests> status --short` are empty after the merge (nothing left
  unstaged; if D11 had to run `format`, the changed files are staged and listed in notes instead).

**6B. Untouched repos stay untouched (invariant 1, the ins URL surface; the brief's "do not touch ins or plants").**
`git -C <ins> rev-parse HEAD` is still `da05f1fdb2cbea98829f894542d4c19768fe197b` and `status --short` is empty;
`git -C <plants> rev-parse HEAD` is still `cf01b98a689130c86d1e6ed922fcfda2a218a694` and `status --short` is empty.

**6C. main's behaviour is present in the merged animals tree (invariant 2 — the behaviour change this stage names).**
- `grep -n "serviceUnavailable" <animals>/src/server/common/constants/status-codes.js` prints `  serviceUnavailable: 503`.
- `grep -n "ensureLoaded" <animals>/src/server/app/services/countries/index.js` prints the export and four `await ensureLoaded()` lines.
- `grep -n "prime" <animals>/src/server/app/routes.js` prints nothing.
- `grep -c "vi.mock(" <animals>/src/server/app/services/address-book/address-book.test.js` prints `1` (main's countries mock, present).

**6D. Question 13 evidence recorded (the brief's "Notes must record").** After the merge, append this note verbatim
(one JSON string; keep the line breaks out):

`"Q13 evidence (post-merge, animals HEAD <sha>): animals main (EUDPA-575, fb3615e3) — services/countries/index.js and services/ports/index.js each hold a module-scope `loaded` flag and export ensureLoaded(); every reader (originLabel, originCountries, addressCountries, countryCodeOf; ports list, label) is async and awaits ensureLoaded() before reading; ensureLoaded returns at once when isStubMode() or loaded, otherwise fetches (fetchCountries(['GBNAG_SPS_EX']) / fetchPortsOfEntry()), sets loaded = true on success, and on failure leaves loaded false so the next read retries and throws Boom.serverUnavailable('Reference data unavailable', { dataset, cause }), which catchAll renders as the shared error page with 503 (status-codes.js gained serviceUnavailable: 503; errors.test.js proves the page). app/routes.js no longer imports isStubMode, countries or ports and no longer primes at boot, so an MDM outage at boot no longer stops the pod. Proven by run-mode.test.js (self-load, fetch-once, retry, 503 shape, stub short-circuit) and address-book.test.js mocks the reader. plants (cf01b98a): services/countries/index.js exports prime() with synchronous readers; app/routes.js awaits countries.prime() and ports.prime() at plugin register inside if (!isStubMode()) — boot fails when MDM is down. ins (da05f1f): services/countries/index.js exports getCountries(blocks) = isStubMode() ? COUNTRIES : fetchCountries(blocks) — a fetch on every call, no cache, no Boom; readers are features/address-book/address-countries.js getAddressFormCountries() (throws 'Country reference data is unavailable' on an empty list) and features/dashboard/controller.js; nock-tested in countries.test.js through common/test-helpers/real-mode.js. The countries stage ports main's shape (ensureLoaded + loaded flag + Boom.serverUnavailable, no boot prime) to ins and plants; ins will also need serviceUnavailable: 503 in status-codes.js (question 25's file) and a nock-based equivalent of run-mode.test.js; @hapi/boom is undeclared in all three package.json files and hoists through @hapi/hapi (same class as joi, question 22)."`

**6E. Question 27 recorded.** Append verbatim:

`"Q27: the workspace branch is level with origin/main (git log HEAD..origin/main empty on 16 September) and already carries 79064207 fix(stack): probe floci's health without curl (#46) via merge fb80f548 (git merge-base --is-ancestor 79064207 HEAD exits 0). PR 47's E2E is green on its last four runs (latest 35073631134, 2026-09-16T08:24:49Z; the two failures are pre-fix). No merge in the workspace repo; the report refresh closes question 27."`

**6F. Ladder green (invariant 3)** — §8. Record the animals "Tests N passed" line and the three clean tests-repo
results in notes.

**6G. No new shared package, no cross-repo import, no journey machinery into ins (invariants 4, direction).** Nothing
is added by hand; 6B proves ins is untouched.

## 7. Out of scope — leave alone even though it is close

- **Question 13 itself** — porting `ensureLoaded` to ins or plants. This stage records the evidence (6D) and stops.
  Do not edit `plants/src/server/app/routes.js`, `plants/src/server/app/services/countries/`,
  `ins/src/server/app/services/countries/`, or any `status-codes.js` outside the merge.
- **Question 25** — `status-codes.js` naming (`redirectFound`, `payloadTooLarge`) and ins's missing
  `serviceUnavailable`. The animals file gains `serviceUnavailable` only because main wrote it.
- **Question 22** — `@hapi/boom` and `joi` undeclared. Do not add either to any `package.json`.
- **Question 12** — `errors.js` copy; main's `errors.test.js` addition lands as written.
- **The workspace repo's own branch** — no merge, no push; D9.
- **The tests repo's `test` script** — never run it; the workspace E2E at land proves the specs.
- **animals `test:fit`** — not in this stage's ladder; main's fit changes are proven by animals' own CI on PR #339
  after land.
- **Comments in main's hunks** (the `ensureLoaded` doc comments, the `address-book.test.js` header comment) — invariant 6
  applies to what the alignment writes, not to main's code taken by merge. Leave them.
- The `repos/` checkouts — never.

## 8. Ladder and landing

One command per Bash call; tilde paths; output to a log under
`~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace/workareas/shared/frontend-alignment/logs/`
read once with the Read tool.

1. In all four clones: `git -C <clone> fetch origin`, then `git -C <clone> log --oneline HEAD..origin/main`. Confirm
   ins and plants are empty (→ §2C notes) and animals/tests match §Classification exactly (ten and five commits,
   heads `38d4cf59` and `864e246`). If any differs, STOP and report.
2. `git -C <animals> status --short` and `git -C <tests> status --short` must be empty before merging. If not,
   `git -C <repo> stash push -u` and report what was stashed.
3. Write the two message files (§2A, §2B) with the Write tool.
4. Merge animals (§2A). Read `s16-merge-main-animals-merge.log`.
5. Merge tests (§2B). Read `s16-merge-main-tests-merge.log`.
6. Run 6A and 6B now, before any ladder.
7. animals ladder, each to its own log:
   - `npm --prefix ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-animals-frontend run format:check > …/logs/s16-merge-main-animals-format-check.log 2>&1`
   - `… run lint > …/logs/s16-merge-main-animals-lint.log 2>&1`
   - `… run test > …/logs/s16-merge-main-animals-test.log 2>&1` (the `pretest` webpack build runs first; allow the
     600000 ms timeout) — expect 0 failed and more than 2239 passed.
8. tests ladder:
   - `npm --prefix ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-animals-tests run typecheck > …/logs/s16-merge-main-tests-typecheck.log 2>&1`
   - `… run lint > …/logs/s16-merge-main-tests-lint.log 2>&1`
   - `… run format:check > …/logs/s16-merge-main-tests-format-check.log 2>&1`
9. Run 6C. Append the 6D and 6E notes plus the ladder results to `notes` in stages.json; `jq empty` it.
10. Stop. Nothing to stage — the merge commits are the deliverable; land pushes them. If D11 had to run `format`,
    `git -C <repo> add <files>` and say so.

## Behaviour changes (for the stage notes and the report)

All arrive from main by merge; the alignment authored none of them.

1. **animals: reference data loads on first read, not at boot.** Countries and ports readers self-load; the first
   read fetches, a failed load retries on the next read, stub mode never fetches; the live-animals plugin no longer
   primes at register, so the pod starts while MDM is down and only pages that read reference data fail.
2. **animals: a reference-data load failure is a 503 page**, rendered by `catchAll` from `Boom.serverUnavailable`
   (`statusCodes.serviceUnavailable` is new), where a boot-time prime failure used to stop the server.
3. **animals: address country is stored as the ISO code**; the mapper's reverse lookup is gone.
4. **animals hub (DR1 parity #345–#354, EUDPA-606/607):** DR1 sections and headings, identification row before
   additional details, six rows relabelled, one hint on one row, review is a locked task row instead of a
   "Review and submit" button, and task status is two-state (Complete / To do).
5. **tests: the E2E suite follows the DR1 hub** (sections, row names, locked review row, two-state status) and
   asserts the EUDPA-369 GBN-AG fields on the submitted event.
6. ins, plants: no change.
