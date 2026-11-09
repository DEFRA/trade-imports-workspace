# inc-025 plan: every live animals journey-flow and journey-pages scenario left partial is proven by a probed test

| Repo | Path | Branch | HEAD |
| --- | --- | --- | --- |
| frontend | `repos/trade-imports-animals-frontend` | `feat/EUDPA-774-save-and-continue-through-journey` | `51e8e88f` |
| tests | `repos/trade-imports-ins-tests` | `feat/EUDPA-774-save-and-continue-through-journey` | `886f900` |
| workspace (openspec coverage and backlog notes only, committed by the orchestrator) | `.` | `feat/EUDPA-774-save-and-continue-through-journey` | `984a4f59` |

Shorthands: `A:` = `repos/trade-imports-animals-frontend/`, `T:` = `repos/trade-imports-ins-tests/`,
`alin` = `A:src/server/app/sets/live-animals/journeys/linear`, `cov` = `openspec/coverage/live-animals`.

Set and spec namespace: frontend `sets/live-animals` → `live-animals/`. This row is `kind: test`: it changes no production
file, page, copy or flow, so it is not routed through frontend-change. Section 8 still applies (coverage links and strengths).

Stack state at plan time: `tim docker lease status` — up, 20 containers healthy, dev mode, leased to `ibl-20261109T231330Z`,
animals frontend, plants frontend and tests repo on this branch. The INS frontend and address book are up, so the address book
round trip e2e can run.

---

## 0. Decisions

1. **The work set is the scenarios `tim spec gaps --partial` lists under `live-animals/journey-flow` and
   `live-animals/journey-pages/*` at plan time: 28 flow and 111 pages (139).** They are exactly the ones inc-024's notes list
   as partial (flow list and both pages lists). The 7 `none` scenarios (ARRIVAL-007-F, CYA-006-B, CYA-008-C,
   COMMODITY-SELECT-010-A, ORIGIN-013-G, OVERVIEW-013-A, OVERVIEW-013-B) are not in inc-024's notes and are out of scope
   (section 7 follow-up). Rejected: widening to them — the row names the inc-024 list.
2. **Baselines (criterion 5).** Full scenarios across `cov/journey-flow/coverage.json` and `cov/journey-pages/*/coverage.json`:
   this branch before the row (`984a4f59`) **399** (none 7, partial 139, 545 in all); workspace `origin/main` at `462314c`
   **478** (none 10, partial 60, 548 in all). Main moved since inc-024 (`a8a2cad1` → `462314c`, adding transporter and CYA
   coverage), so 478 is the bar, not inc-024's figure. The row needs at least 79 of the 139 upgraded; the plan aims at all
   139 and names any left. The implementor writes the Probes line into inc-025's `notes`: "Full live-animals journey-flow +
   journey-pages scenarios 399 -> N (origin/main 462314c: 478)".
3. **One probe per production owner, run against every test that owner should turn red.** A scenario is upgraded only when a
   linked test went red with its owner line inverted and green once restored, through `tim build probe` (which also checks the
   file is put back byte for byte). Probes are grouped by owner (section 4 families F1–F11), so one inversion proves every
   link it turns red, and each link's `notes` names the probe's log. Probe logs go to
   `workareas/shared/eudpa-774/logs/inc-025-probe-<owner>-<case>/` via `--logs`.
4. **End-to-end and browser links are probed against the leased dev-mode stack with `--reload-url http://localhost:3000/health`**
   (criterion 2). The stack serves the animals frontend from `A:src` and restarts on a change; the probe waits for the
   restart before each run. No E2E link is left partial for needing the stack, a rebuild or the gate. While an E2E probe has
   a frontend file inverted, nothing else runs against the stack: probes are strictly serial, one at a time, and each is
   followed by the next only after its JSON reports `greenAfterRestore`. A run where the service did not restart
   (`redWhenInverted: null`) is rerun, never counted.
5. **`tim build probe` runs the command after `--` verbatim, so every probe command carries this machine's worker count**
   after the spec file (`--workers=3` for animals FIT and the tests repo's E2E), as inc-024 did (section 14).
6. **The per-page Back table links are relinked to each page's own test file and exact case.** Today 33 Back scenarios link
   `alin/test-support.js` "Should go to %s", which cannot say which page or which case witnesses which scenario, and
   `tim build probe --test-file` must name the file that registers the cases. Each Back scenario's link becomes the page's
   controller test file (the file that calls `itSendsBackToWhereTheTraderCameFrom`) with the case title as it runs: the
   "page Save and continue was pressed on" case for `…-A`, "Overview when opened from Overview" for `…-B`, "the review when
   opened from a Change link" for `…-C`. Rejected: keeping the shared-file link — it names no page, and no probe can be tied
   to it.
7. **The Overview-trail case needs its own shared probe.** Inverting a page's wiring so it drops the trail turns its
   "page before" and "review" cases red, but leaves the Overview case green, because the fallback is also Overview (inc-024's
   017-B / 018-B reason). So the Overview cases are proved by one shared probe of the overview start entry in
   `A:src/server/app/shared/trail.js:177` (Overview's place answering the Overview path), run against every page controller
   test, plus each page's wiring probe proving that page's Back reads the trail. A `…-B` scenario is full only when both went
   red then green.
8. **A link whose test cannot witness its scenario is replaced, and a scenario with no witness gets a test, in the layer that
   owns the behaviour (criterion 3).** Ownership: a page's Back href and redirect target → that page's controller unit test
   (vitest, `alin/features/**`); a walk across several pages, a browser behaviour (focus, announcement, JavaScript) or what a
   page shows → FIT under `alin/features/**/fit` with `A:fit/live-animals-journey.js` helpers; a behaviour that needs the real
   backend, reference data, the uploader or the INS address book → E2E in `T:tests/animals/e2e/**`. Section 4 names each new
   test by family. Where a Then is already asserted by a test not yet linked (for example amend-endings' current title), the
   link is retitled to the test as it is now.
9. **Stale links are corrected before probing.** Every linked test title is checked to exist in its file (section 5 grep);
   a link to a title that no longer exists is relinked to the test as it now reads. Found at plan time:
   SCN-FLOW-013-F links "Cancel and return to overview while amending opens Overview without saving, and the strip still shows
   Amend and Cancel amend"; the test now reads "Cancel and return to overview while amending opens Overview and keeps the saved
   value" (`T:tests/animals/e2e/features/amend-endings.spec.ts:72`).
10. **A scenario that still cannot be proven is named in inc-025's `notes` with the exact Then no test can witness and why**
    (criterion 4) — a reason about the behaviour (for example "no production line governs focus here: the browser keeps focus
    in a text box by default, so nothing can be inverted"), never a tooling reason (the stack, a rebuild, the gate, time).
    Expected candidates at plan time: SCN-CPH-009-A and SCN-CPH-009-B (no focus-moving script exists), SCN-DOCS-020-B (no
    production line conditions the page on later answers). The implementor first looks for an owner line to invert (the
    template's input attributes, the page's gate) before naming them.
11. **No production file changes.** If a probe or a new assertion shows the application disagrees with its scenario, the
    implementor leaves the behaviour alone, keeps the scenario partial and names it in the notes with the disagreement (that is
    spec-catchup or a new row).
12. **Claims checked against the tree.** (a) The leased stack is in dev mode and up (lease status above); `tim build probe`
    has `--reload-url` (`tim build probe --help`). (b) inc-024's notes say "about 40" flow and "about 150" pages; the live
    count is 28 + 111 — the notes list some scenario ids already full (SCN-FLOW-003-D, -003-I, -003-K, -010-A on plants, and
    some live animals ones upgraded since), so the live `tim spec gaps` list is the work set. (c) The Back table's Overview
    case cannot be proved by a trail inversion alone (decision 7), as inc-024 found.

## 1. Moves

None. No file moves or is deleted.

## 2. Edits

Every edit is a test, test helper or coverage file. Live animals frontend first (unit, then FIT), then the tests repo, then
coverage.

### Part A — live animals frontend tests

- Page controller test files that register the Back table (`alin/features/additional-details/controller.test.js`,
  `contact/controller.test.js`, `addresses/controller.test.js`, `import-reason/controller.test.js`,
  `documents/controller.test.js`, `commodities/search/search.controller.test.js`,
  `commodities/consignment-details/consignment-details.controller.test.js`,
  `commodities/animal-identification/animal-identification.controller.test.js`,
  `transport/port-of-entry/port-of-entry.controller.test.js`, `transport/transit-countries/transit-countries.controller.test.js`,
  `transport/transporters/transporters.controller.test.js`) — no change expected; they are the probe targets of family F1.
  Edit only where a probe stays green and the case does not assert the exact href (then make the assertion exact).
- `alin/test-support.js` — unchanged unless a probe shows a case that cannot witness its scenario; the Back table's case
  titles must keep saying what each asserts (they do now).
- Feature FIT specs gaining a walk or an assertion (family-by-family in section 4): `transport/fit/arrival-transit.fit.spec.js`
  (transport order walk; refused-save Overview re-open), `commodities/fit/consignment-details.fit.spec.js` (first-open empty
  fields; packages kept on Add another), `commodities/fit/identification.fit.spec.js` (new record empty; optional labels;
  Add another commodity round trip), `confirmation/confirmation.fit.spec.js` (imports email route),
  `documents/fit/upload.fit.spec.js` (sixteenth document refused, if the FIT uploader stub allows; else E2E),
  `import-reason/import-reason.fit.spec.js` (a reason that asks nothing more saved and reopened). Each walk proves the landing
  page through the landing table `LANDINGS` (`A:fit/live-animals-journey.js:758`) and `saveAndContinue`
  (`A:fit/live-animals-journey.js:1210`).
- `A:fit/live-animals-journey.js` — only when two specs need the same new set-up (section 11).

### Part B — tests repo

- `T:tests/animals/e2e/journeys/save-and-continue.spec.ts` — the contact-address and transit-countries tests assert the exact
  landing (review with its outstanding list; transporter list) and, for TRANSIT-COUNTRIES-003-B, a test that adds two countries
  and Save and continue, then reopens the page and reads them in order.
- `T:tests/animals/e2e/journeys/back.spec.ts` — the reverse walk (SCN-FLOW-018-D) Back from the review to Overview, every
  page's exact address and H1, if no existing test does it end to end; the transporter round trip and document upload round trip
  Back to the review (SCN-FLOW-018-E) if not already in `change-from-cya.spec.ts`.
- `T:tests/animals/e2e/features/change-from-cya.spec.ts` — the contact address card Change link → contact page → Save and
  continue → review (SCN-CYA-004-B); the documents Change link continued with Save and continue through to the review
  (SCN-CYA-004-C), through `expectSaveAndContinueWalk` (`T:page-objects/shared/journey-checks.ts:31`); the Change link round
  trips open from the review through `expectOpenFromReview` (`T:page-objects/shared/journey-checks.ts:51`).
- `T:tests/animals/e2e/features/amend-endings.spec.ts` — no change; links retitled (decision 9).
- Any other tests-repo spec only where section 4 names it.
- `T:flows/animals/journey.ts` — every new E2E walk (TRANSIT-COUNTRIES-003-B, CYA-004-B, SCN-FLOW-018-D) reaches its first page
  through an existing `to*` method there (`toTransitedCountries` `:623`, `toContactAddress` `:665`, `toReview` `:695`,
  `toArrivalDetails` `:604`), never through its own clicks. A walk sequence two tests share (for example adding transit
  countries then Save and continue, or the review-to-Overview reverse walk if a second test needs it) becomes a new `to*` method
  in that file and the local copies are deleted (section 11).

### Part C — workspace coverage and notes

- `cov/journey-flow/coverage.json`, `cov/journey-pages/*/coverage.json` — section 8.
- `workareas/shared/eudpa-774/backlog.json`, this row's `notes` — the Probes line (decision 2) and every scenario left partial with
  its exact Then and reason (decision 10).

## 3. New files

None expected. A new FIT spec file is allowed only where a page has no FIT spec for the family's walk; it follows the
neighbouring `transport/fit/arrival-transit.fit.spec.js` structure (imports from `A:fit/live-animals-journey.js`, one
`test.describe` per behaviour).

## 4. Tests

Each family: the owner line inverted (the production line whose removal turns the tests red), the tests that must go red, the
scenarios it upgrades, and any new test.

**F1 — each page's Back reads the trail** (owner: each page controller's `backLink` wiring, the one
`kit.trailBackLink(request)` call in each file listed in section 2 Part A; `documents/view-model/render.js:85`;
`commodities/search/search.controller.js:57`). Inversion: the wiring passes a request without its trail. Red: that page's
"page Save and continue was pressed on" and "review from a Change link" cases. Plus the shared probe of
`A:src/server/app/shared/trail.js:177` (Overview's place answers some other path) run against every one of those controller
test files: red on every "Overview when opened from Overview" case. Upgrades: ADDL-DETAILS-004-A/B/C, ARRIVAL-010-A/B/C,
COMMODITY-DETAILS-009-A/B/C, COMMODITY-SELECT-007-A/B/D, CONSIGN-ADDR-003-A/B/C, CONTACT-005-A/B/C, IDENT-018-A/B/C,
IMPORT-REASON-008-A/B/C, TRANSIT-COUNTRIES-007-A/B/C, TRANSPORTER-005-A/B/C, DOCS-002-C; with SCN-FLOW-018-B (Overview
case of arrival details through the trail.js probe, plus the arrival details wiring probe).

**F2 — the review's Back** (owner: `alin/features/check-answers/controller.js:79` and the branches above it that choose the
dashboard for a submitted or amend-cancelled view). Inversions: the trail read dropped; the submitted-view dashboard branch
swapped for the trail result. Red: `check-answers.test.js` Back cases; E2E `back.spec.ts` and `back-entry-points.spec.ts`
"after an amendment is cancelled", with `--reload-url`. Upgrades: CYA-003-A to 003-G, SCN-FLOW-018-C (with the change-from-cya
"Back from the reason for import" E2E under the import-reason wiring probe).

**F3 — the origin page's Back** (owner: `alin/features/origin/controller.js:58` and its fallback to where the notification was
started). Inversions: the fallback answers Overview always; the trail read dropped. Red: origin `controller.test.js` cases,
`origin.fit.spec.js` Back tests, `T:tests/animals/e2e/pages/origin.spec.ts` Back tests and the INS notification-type Back
test (`T:tests/ins/e2e/features/notification-type/notification-type.spec.ts`) with `--reload-url`. Upgrades: ORIGIN-013-A to
013-F and 013-H.

**F4 — CPH number** (owner: `alin/features/cph-number/controller.js:41` `hubEntryReturn` and its save redirect). Upgrades
CPH-006-A, CPH-006-C, CPH-007-B against `cph-number/controller.test.js`. CPH-008-A: the FIT JavaScript-off and E2E links,
probing the digits-keeping line in the CPH template or script. CPH-009-A/B: decision 10.

**F5 — transporter add pages** (owners: the Back and onward-redirect lines in `transport/transporter-add/*.controller.js`,
`private-transporter-details/*.controller.js`, `commercial-transporter-details/*.controller.js`). Red: their controller tests
and `transport/test-support.js` "Should carry the trail…" cases (relinked to the registering file, decision 6). Upgrades:
PRIVATE-TRANS-005-A/B, COMMERCIAL-TRANS-007-A, 008-A/B, TRANSPORTER-TYPE-005-A, TRANSPORTER-005-D. For 008-A/B and 005-B,
whose Then also says Upload documents' Back opens the transporter list, the link must assert both the landing and the trail it
carries; where it asserts only the landing, the test gains the trail assertion (exact href).

**F6 — What are you importing? returns to its opener** (owner: `commodities/search/search.controller.js` `readReturnMarker`
use and its return redirect). Inversions: the honoured return ignored; the trail not carried on the return. Red:
`search.controller.test.js` return cases, `consignment-details.fit.spec.js` Add another round trip, the E2E
`animal-identification.spec.ts` summary-row Change round trip with `--reload-url`. Upgrades: COMMODITY-SELECT-013-A to 013-F,
007-C, COMMODITY-DETAILS-007-B, IDENT-001-D, IDENT-001-E, IDENT-003-B (the FIT test gains the save on commodity selection and
the landing on identification details, so the return is witnessed).

**F7 — Save and continue goes to the next page** (owner: `A:src/server/app/flow/navigation.js:58` `nextStepLanding`'s step,
and `A:src/server/app/shared/kit.js:186-187` the review past the last step). Inversions: step two pages instead of one;
past the last step answer Overview instead of the review. Red: dispatch tests, the FIT walks, E2E `save-and-continue.spec.ts`,
`change-from-cya.spec.ts` walk (with `--reload-url`). Upgrades: SCN-FLOW-003-B, -C, -E, -F, -M, -N, -O, -013-C,
CONTACT-003-A, TRANSIT-COUNTRIES-003-A/B, DOCS-016-G, CYA-004-B, CYA-004-C. New tests:
- SCN-FLOW-001-B: a FIT walk in `arrival-transit.fit.spec.js` — arrival details by Road, Save and continue lands on transit
  countries, Save and continue lands on the transporter list, whose page offers "Add a transporter" and is not the type
  question (exact H1 and address at each step). Red under the step inversion.
- SCN-FLOW-003-C: a link to a test that saves What are you importing? and lands on Main import reason (the FIT
  `saveAndContinueToImportReason` users, or the E2E save-and-continue walk), replacing the species-lines unit link.
- SCN-FLOW-003-F: the documents add-another round trip then Save and continue to Roles and addresses — the
  `documents-save-buttons.spec.ts` or upload FIT test that does it, else a new FIT case in `upload.fit.spec.js`.
- CYA-004-B: a change-from-cya E2E test opening the contact address card's Change link, saving, and landing on the review.
- CYA-004-C: the documents Change link test continues with Save and continue through each later page to the review via the
  shared walk check.
- TRANSIT-COUNTRIES-003-B: E2E adds France and Belgium, Save and continue lands on the transporter list, reopening lists them in
  order.

**F8 — entry guard and prerequisite landing** (owners: `alin/flow/entry-guard.js` redirect and exemptions;
`A:src/server/app/flow/prerequisites.js` `earliestMissingAnswerPage`; `navigation.js:64-70` asking-page landing). Inversions:
the guard's redirect skipped; an exemption removed; the asking-page landing replaced by the unopened page. Red:
`entry-guard.test.js`, `dispatch.test.js`, `gates.test.js`, `transit-countries.controller.test.js` missing-answer cases, the
E2E "a draft with nothing saved, resumed from the dashboard" with `--reload-url`, the `arrival-transit.fit.spec.js` "by road with
only the country of origin saved" test. Upgrades: SCN-FLOW-005-A (its "Overview does not offer the later page" half through the
FIT test that reads Overview's rows), -008-A, -008-C, -008-D, -003-M, -003-O, TRANSIT-COUNTRIES-008-C, SCN-FLOW-017-A (the
dashboard FIT start entry and INS E2E under the start route's redirect inversion; its "saving continues to the next page" half
needs the walk to save origin and land on What are you importing? — added to the dashboard FIT test if absent).

**F9 — page endings while amending** (owner: `A:src/server/app/shared/save-actions.njk`). Inversions: the amend branch shows
a different control set; the Cancel link placed beside the buttons. Red: `amend-endings.test.js`, `shared/save-actions.test.js`,
E2E `amend-endings.spec.ts` with `--reload-url`. Upgrades: SCN-FLOW-004-F, -013-A, -013-D, -013-F (relinked, decision 9; owner
of "not saved" is the Cancel link's target and the absence of a save on that route: invert by making the cancel route save,
red when the reopened page shows the typed value), -014-B.

**F10 — trail mechanics across round trips** (owners: `shared/trail.js` `trailPlus` cap at `:152`, `carryTrail`, the
documents upload-return and transporter-add redirects, `alin/features/addresses/address-return/controller.js` landing).
Upgrades: SCN-FLOW-018-D (new or existing E2E reverse walk: each Back shows the earlier page in reverse, Overview from
arrival details; red under the `trailEntryHref` `trailBeneath` drop), -018-E (refresh, transporter, upload and refused-save
Back to the review; E2E back.spec and change-from-cya documents test, red under `carryTrail` returning the bare href),
-018-F (address-return controller test and `addresses-add-handshake.spec.ts` with `--reload-url`, plus Save and continue on to
Contact address — added to that E2E test if absent), -018-I (the cap test gains the Back-to-Overview assertion after the newest
40; red under the cap's slice change), -010-A, -010-B (journey-smoke collection test, red under the identification and
documents add-another redirect inversions), DOCS-002-B, DOCS-002-D.

**F11 — page content, validation and announcements** (each its own page's owner line):
- ARRIVAL-001-A: E2E `arrival-details.spec.ts` "leaves the arrival details unanswered" asserts port, means and date empty
  (exact values) — the title already claims it; red when the controller pre-fills a value.
- ARRIVAL-006-A/B/C and SCN-FLOW-004-G: port-of-entry controller's means rule; FIT and E2E with `--reload-url`; 006-C and
  004-G need the Overview re-open (To do, port empty) — the save-and-return E2E already does it.
- ARRIVAL-013-B: the persisted code per means; the persistence E2E covers Road only — extend to each option or link the
  controller unit test asserting each code, probing the option-to-code map.
- CYA-001-G: the review's means-of-transport row label owner; E2E hub-groups test with `--reload-url`.
- CYA-014-C: a check-answers controller test driving an amend Continue with an unlisted species to the declaration; probe the
  amend exemption in `check-answers/refusal.js`.
- COMMODITY-DETAILS-001-A, 007-A, 013-C, 013-D: consignment-details FIT (every field empty on first open for two species;
  packages kept) and a FIT or E2E case for the packages cap; probe the controller's cap and pre-fill.
- COMMODITY-SELECT-003-A/C: search FIT and commodities E2E, probe the label builder.
- CONFIRM-005-A: confirmation FIT asserts the import-notifications email link exactly; probe its template line.
- DECLARATION-006-D/F: declaration controller tests drive a change after the failed save and a refresh, probing the reviewed
  token comparison.
- IDENT-004-A, 008-A, 011-A, 021-C: identification FIT/E2E with exact field values, Overview naming the record, the two
  optional labels, and Enter saving.
- IMPORT-REASON-002-A, 004-A, 013-B: a reason that asks nothing more saved and reopened; port of exit list equal to the port of
  entry list as rendered on both pages; choosing Internal market again after transit clears the purpose.
- ORIGIN-022-A, 023-A/B/C: type-ahead E2E with `--reload-url`, probing the template's button class and the hint and
  announcement wiring.
- OVERVIEW-005-D, 012-B: Overview task row scope, poultry and transit E2E with `--reload-url`, probing the row's applicability
  rule.
- DOCS-003-A, 016-I, 020-B, 021-C: documents limit (a sixteenth refused), part-filled Save and add another, the spent-session
  return saving a second document and listing both.

**INTEGRATION PROOF**: every E2E link above, probed with `--reload-url` against the leased stack, and the gate's
`trade-imports-ins-tests` `e2e` rung, which runs every changed and new tests-repo spec against the real stack.

## 5. Invariants to prove

Criterion 1 and 4 (every listed scenario full, or named):
- `tim spec gaps --partial --capability live-animals/journey-flow --json` → every row is named in inc-025's notes with its
  exact Then and reason; expected 0 rows.
- `tim spec gaps --partial --capability live-animals/journey-pages --json` → every row is named in inc-025's notes; expected at
  most CPH-009-A, CPH-009-B and DOCS-020-B.
- `jq '.increments[] | select(.id=="inc-025") | .notes' ~/git/defra/trade-imports-workspace/workareas/shared/eudpa-774/backlog.json`
  → the Probes line and each scenario left partial with its Then and a behaviour reason (no "stack", "rebuild", "gate").

Criterion 2 (E2E probed on the dev-mode stack) — needs the workspace stack:
- `tim build probe trade-imports-animals-frontend src/server/app/sets/live-animals/journeys/linear/features/import-reason/controller.js --search "kit.trailBackLink(request)" --replace "kit.trailBackLink({ params: request.params, logger: request.logger })" --reload-url http://localhost:3000/health --json -- npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose -- tests/animals/e2e/features/change-from-cya.spec.ts --workers=3`
  → `redWhenInverted: true`, `greenAfterRestore: true`.
- `grep -rn "needs the stack\|stack needed\|serves the frontend as built\|not probed against the stack" ~/git/defra/trade-imports-workspace/openspec/coverage/live-animals/journey-flow ~/git/defra/trade-imports-workspace/openspec/coverage/live-animals/journey-pages`
  → no output.

Criterion 3 (relinked witnesses):
- `grep -rnE "\"file\": \"[^\"]*test-support\.js\"" ~/git/defra/trade-imports-workspace/openspec/coverage/live-animals/journey-flow ~/git/defra/trade-imports-workspace/openspec/coverage/live-animals/journey-pages`
  → no output (every Back and trail link, the transport add-page ones included, names the page's own registering test file).
  At plan time it lists 35 links: 33 to `journeys/linear/test-support.js` and 2 to
  `journeys/linear/features/transport/test-support.js`.
- `tim build probe trade-imports-animals-frontend src/server/app/shared/trail.js --search "[TRAIL_START.overview]: () => hubPath(journeyId)," --replace "[TRAIL_START.overview]: () => dashboardPath()," --test-file src/server/app/sets/live-animals/journeys/linear/features/additional-details/controller.test.js --json`
  → `redWhenInverted: true`, `greenAfterRestore: true` (the Overview case of a Back table).
- `tim build probe trade-imports-animals-frontend src/server/app/sets/live-animals/journeys/linear/features/additional-details/controller.js --search "kit.trailBackLink(request)" --replace "kit.trailBackLink({ params: request.params, logger: request.logger })" --test-file src/server/app/sets/live-animals/journeys/linear/features/additional-details/controller.test.js --json`
  → `redWhenInverted: true`, `greenAfterRestore: true`.
- `tim build probe trade-imports-animals-frontend src/server/app/flow/navigation.js --search ".slice(index + 1)" --replace ".slice(index + 2)" --json -- npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend run test:fit:ci -- src/server/app/sets/live-animals/journeys/linear/features/transport/fit/arrival-transit.fit.spec.js --workers=3`
  → `redWhenInverted: true`, `greenAfterRestore: true` (the transport-order walk).

Criterion 5 (count against main):
- `jq -s '[.[].requirements[].scenarios[] | select(.coverage=="full")] | length' ~/git/defra/trade-imports-workspace/openspec/coverage/live-animals/journey-flow/coverage.json ~/git/defra/trade-imports-workspace/openspec/coverage/live-animals/journey-pages/*/coverage.json`
  → at least 478 (origin/main `462314c`); before the row 399.

Criterion 6:
- `tim spec lint --capability live-animals --json` → exit 0, no findings.

Programme invariants: no production file changes, so the journey order, Back and amend invariants cannot move; the gate's unit,
FIT and E2E rungs stay green.

## 6. Increment-specific checks beyond the gate

- `grep -rn "Cancel and return to overview while amending opens Overview without saving" ~/git/defra/trade-imports-workspace/openspec/coverage/live-animals`
  → no output (the stale amend-endings link is relinked, decision 9).
- The section 5 probes, `jq`, `grep` and `tim spec` checks: no gate rung runs them.

## 7. Out of scope

- Every production file in the animals frontend (decision 11).
- The 7 `none` scenarios under these capabilities (decision 1).
- Plants coverage and the plants frontend (not this row's repos).
- `A:fit/live-animals-journey.js` `urlUnderBase`'s optional trail (inc-024 follow-up).
- Live-animals capabilities other than journey-flow and journey-pages.

Follow-ups:
- Cover the 7 live-animals journey-pages scenarios with no test: ARRIVAL-007-F, CYA-006-B, CYA-008-C, COMMODITY-SELECT-010-A, ORIGIN-013-G, OVERVIEW-013-A, OVERVIEW-013-B.
- Add a `tim spec lint` check that each coverage link's test title exists in its file, so a renamed test cannot leave a stale link (as SCN-FLOW-013-F's was).
- Probe and relink the plants journey-pages Back scenarios inc-024 left partial, the same way this row does for live animals.

## 8. Spec sync

Prefix: `live-animals/`. No spec text changes (no behaviour changes); coverage links and strengths only. No new capability, no
AREAS.md row.

- `cov/journey-flow/coverage.json`: REQ-FLOW-001 (SCN-FLOW-001-B), REQ-FLOW-003 (-B, -C, -E, -F, -M, -N, -O), REQ-FLOW-004 (-F,
  -G), REQ-FLOW-005 (-A), REQ-FLOW-008 (-A, -C, -D), REQ-FLOW-010 (-A, -B), REQ-FLOW-013 (-A, -C, -D, -F), REQ-FLOW-014 (-B),
  REQ-FLOW-017 (-A), REQ-FLOW-018 (-B, -C, -D, -E, -F, -I): each link probed set `strength: "full"` with notes naming the
  owner inverted and the log; new links for the new tests (section 4 F7, F8, F10); SCN-FLOW-013-F relinked.
- `cov/journey-pages/<page>/coverage.json` for additional-details, arrival-details, check-your-answers,
  commercial-transporter-details, commodity-details, commodity-selection, confirmation, consignment-addresses, contact-address,
  cph-number, declaration, identification-details, import-reason, origin-of-import, overview, private-transporter-details,
  transited-countries, transporter, transporter-type, upload-documents: every partial scenario listed in decision 1 — Back
  links relinked to the page's own test file and case (decision 6) and probed; other links probed or replaced per section 4.
- Requirement `coverage` rolls up from its scenarios; scenario `coverage` is full only through a full link covering every Then.
- Links whose probe did not go red then green stay `partial` with a note saying which Then is unwitnessed and why.

## 9. Homes

- Back cases: `alin/test-support.js:11-66` (`backCases`, `itSendsBackToWhereTheTraderCameFrom`), registered per page; unchanged.
- Transport add-page Back cases: `alin/features/transport/test-support.js`; unchanged.
- FIT walks: the feature's own `fit/*.fit.spec.js`, through `A:fit/live-animals-journey.js` (`LANDINGS` `:758`,
  `saveAndContinue` `:1210`, `openArrival` `:987`, `openTransit` `:1061`, `openTransporterList` `:1081`).
- E2E walks and checks: the existing specs named in section 2 Part B; each reaches its pages through the `to*` methods of
  `T:flows/animals/journey.ts` (`AnimalsJourney`, `:106`); walk checks through `expectSaveAndContinueWalk`
  (`T:page-objects/shared/journey-checks.ts:31`) and `expectOpenFromReview` (`T:page-objects/shared/journey-checks.ts:51`).
- Probe logs: the per-probe directories under `workareas/shared/eudpa-774/logs/` that decision 3 names.
- Probes line and partial reasons: this row's `notes` in `workareas/shared/eudpa-774/backlog.json`.

## 10. Rule owners

No rule is added or altered. The owners the probes witness: `shared/trail.js` (`trailBackLink`, `trailPlus`, `carryTrail`),
each page controller's Back wiring, `flow/navigation.js` `nextStepLanding`, `shared/kit.js` `nextTarget`,
`alin/flow/entry-guard.js`, `flow/prerequisites.js`, `shared/save-actions.njk`, `commodities/search/search.controller.js`
return marker, each page's validation.

## 11. Test support

- `A:fit/live-animals-journey.js` — gains a helper only when two FIT specs need the same new set-up (for example a transport
  walk from arrival to the transporter list used by the order walk and the reverse Back walk); any local copy is then deleted.
- `alin/test-support.js` and `alin/features/transport/test-support.js` — the existing Back tables, reused.
- `T:flows/animals/journey.ts` — where every new E2E walk reaches its pages: `toTransitedCountries` (`:623`) for
  TRANSIT-COUNTRIES-003-B, `toContactAddress` (`:665`) and `toReview` (`:695`) for CYA-004-B and CYA-004-C, `toArrivalDetails`
  (`:604`) and `toReview` (`:695`) for SCN-FLOW-018-D. A walk sequence two tests share becomes a `to*` method in this file and
  the spec-local copies are deleted, per `T:AGENTS.md` "Writing specs".
- `T:page-objects/shared/journey-checks.ts` — `expectSaveAndContinueWalk` (`:31`, the Save and continue walk check, reused for
  CYA-004-C and SCN-FLOW-018-D's forward leg) and `expectOpenFromReview` (`:51`, reused for the CYA-004-B and CYA-004-C Change
  link openings); `openReviewFromCompleteOverview` (`:15`) where a walk starts from a complete Overview.
- `T:fixtures/ui.ts` `openFreshSession` — reused for SCN-FLOW-003-N.

## 12. Docs this makes untrue

Grep run:
`grep -rn "itSendsBackToWhereTheTraderCameFrom\|test-support.js\|Should go to" ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/docs ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/docs ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests/README.md ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests/AGENTS.md`

- `A:src/server/app/sets/live-animals/docs/add-a-page.md:331, :367, :373` — describe the Back table helpers; still true (no
  helper changes).
- None made untrue.

## 13. Operability

None — the row changes tests, test helpers and coverage data; no production branch changes an outcome.

## 14. Departures from written rules

- The planner brief's CHECK COMMANDS line "Write no worker count into a plan" (workflow brief, not a committed file): the probe
  commands in section 5 and decision 5 carry `--workers=3` after the spec file, because `tim build probe` runs the command after
  `--` verbatim and the run's guard rails require every FIT or E2E command outside the gate to end with this machine's count.

## 15. Reachability

Everything built is used by this row's own tests and coverage links. Nothing waits on a later row.

## 16. Standards

The implementor reads each in full:
- `.claude/rules/code-quality.md`, `.claude/rules/node.md`, `.claude/rules/playwright.md`
- `docs/best-practices/node/code-style.md`, `docs/best-practices/node/testing/frontend.md`,
  `docs/best-practices/playwright/BEST_PRACTICES.md`, `docs/best-practices/doc-comments/BEST_PRACTICES.md`,
  `docs/best-practices/doc-comments/jsdoc.md`
- `repos/trade-imports-animals-frontend/src/server/app/docs/architecture.md`, `…/docs/flow-and-gates.md`, `…/docs/add-a-set.md`,
  `…/sets/live-animals/docs/README.md`, `features.md`, `journey-flow-and-gates.md`, `add-a-collection.md`, `add-a-field.md`,
  `add-a-page.md`, `add-a-section.md`
- `repos/trade-imports-ins-tests/CLAUDE.md`, `repos/trade-imports-ins-tests/AGENTS.md`
- `.claude/skills/spec-cover/SKILL.md` (probe method) and `openspec/config.yaml` (coverage conventions)
