# EUDPA-573 — stale state on amend / reload

Investigation notes on what the animals and plants frontends do when a
submitted (or in-flight) notification is reloaded after either the
reference data or the obligation model has moved on underneath it.

Shared engine code — every code reference below applies to both repos
unless called out.

## The two scenarios

1. **Stale reference-data value.** A stored code — country, port,
   commodity — is no longer in the reference-data payload (MDM
   re-release, retired port, dropped commodity). The obligation still
   exists.
2. **Model change.** The obligation model itself has moved: an
   obligation added, removed, or its `applyTo` gate reshaped, since the
   notification was last saved.

## Where the trader lands on Amend

The dashboard row's Amend button POSTs to `/notifications/{id}/amend`
(`sets/.../dashboard/view-model/row/actions.js:47`, route wired at
`dashboard/controller.js:121`). The handler runs `amendJourney()`
(`engine/journey.js:141`), which flips the record SUBMITTED → AMEND via
`records.amend()`. It then redirects to `hubPath(id)` — the **numbered
task list**, not check-your-answers.

The task list is thus the first surface where any staleness could be
signalled.

## How the task list judges completeness

`sectionStatus` / `rowStatus` reduce to `partSatisfied`
(`bridge/status/completeness/index.js:106`). For a top-level scalar that
ends at `singletonFulfilled`
(`bridge/status/completeness/leaf.js:29-34`):

```js
export const singletonFulfilled = (name, answers, state) => {
  const obligation = obligationFor(name)
  return obligation
    ? !isBlankValue(state.fulfilments?.[obligation.id])
    : isAnswered(answers[name])
}
```

That is a presence-of-non-blank test on the fulfilment map. Nothing
cross-checks the value against reference data.

## Scenario 1 — stale reference value

- No semantic validation. `dropUnrecognisedFulfilments`
  (`evaluator/index.js:61`) only drops fulfilments whose obligation id
  is gone from the manifest; `purgeStorage`
  (`purge-storage.js:51-80`) only drops apply-to-derived entries whose
  gate no longer authorises them. Neither looks at whether the value
  itself resolves against reference data.
- **Task list still shows every section as Completed.**
  `readyForCheckYourAnswers` (`flow/section-status.js:11-15`) also
  passes, so the Review row unlocks.
- The stale value only surfaces if the trader chooses to re-open the
  page. `originLabel(code)` returns `undefined` for an unknown code and
  the origin POST re-runs `membershipRule` — but AMEND doesn't force
  the trader through the pages, so a notification with an invalid code
  can be re-submitted.
- **Address-book party refs are the exception**, but through a
  different mechanism: the sanitiser
  (`withoutUnresolvedPartyRefs`) drops the party from `answers` on
  read, and the check-answers controller runs
  `outstandingPartyErrors(source, parties)` against parties fetched
  live from address-book
  (`check-answers/controller.js:27-42, 44-92`). Hub row still shows
  Completed while CYA shows the party error — hub and CYA disagree on
  the same journey.

Test coverage: only the address-book party path is exercised
(`check-answers.test.js:1151-1160`). No dedicated test for stale
country/port/commodity codes.

## Scenario 2 — model change

| Change | Behaviour | User-visible? |
|---|---|---|
| New obligation, mandatory + in-scope | Row falls to NOT_STARTED / IN_PROGRESS; section rolls up the same. Review row locks. | Yes — task list highlights it. |
| New obligation, optional + in-scope | Row shows OPTIONAL. Doesn't block Review. | Muted but visible. |
| New obligation inside an existing collection | Per-record satisfaction rolls up, section flips to IN_PROGRESS. | Yes. |
| Obligation removed from manifest | `dropUnrecognisedFulfilments` silently drops the fulfilment. | **No.** |
| `applyTo` gate reshaped so a stored answer is no longer authorised | `purgeStorage` drops it at the next evaluation. | **No.** |

Test coverage: only obligation *removal* is tested
(`evaluator.test.js:173-176` — "unrecognised obligation ids are
dropped (tolerate-and-amend)"). Reshaped gates untested.

## Per-page behaviour on Amend — animals frontend

Concrete audit of every animals-frontend page that reads reference data,
and what each does when a stored value has since dropped out of the
current list. All rows share one shape: the page's `fields()` builds a
membership rule from the *current* reader list, so any stored value not
in the list is refused on POST. What varies is whether the stale value
survives into the GET render, and whether the POST rule blocks empty as
well as non-member.

| Page | Field(s) | Reader | GET render with stale stored value | POST rule | Empty allowed on POST? |
|---|---|---|---|---|---|
| origin | `countryOfOrigin` | `countries.originCountries()` | Select has no matching `<option>` — widget renders as unselected (placeholder). Autocomplete input value blank. Prior code is not visible. | `oneOf('countryOfOrigin', countryValues, …)` | Yes — the origin controller's comment says empty on this page is OK because the obligations model keeps the row unfulfilled and CYA blocks submit (origin/controller.js:140–144). |
| import-reason | `destinationCountry` (transhipment / transit) | `countries.originCountries()` | Same as origin — select renders unselected. | `requiredOneOf(…)` | No — blocks empty with the standard error. |
| import-reason | `portOfExit` (transit / temp admission) | `ports.list()` | Select renders unselected. | `requiredOneOf(…)` | No. |
| transport / port-of-entry | `portOfEntry` | `ports.list()` | Select renders unselected. | `oneOf(…)` | Yes — page allows partial save, mandatory-ness lives in the obligation model. |
| transport / private-transporter-details | `country` (address block) | `countries.addressCountries()` | Select renders unselected. | `oneOf(…)` | Yes. |
| transport / transit-countries | `transitedCountries` (list) | `countries.originCountries()` | **Different shape** — the controller filters stored codes against the current list at render (`selected.filter(code => offered.has(code))`, transit-countries.controller.js:48–59). Stale codes vanish from the rendered chip list before the trader sees them. No banner. | Filtered-again membership check on POST | Yes — page allows an empty list. |
| addresses / frozen-parties (display only) | party country label | `originLabel(code)` | Fallback: `originLabel(code) ?? code`. A stale code renders as the raw ISO code (e.g. "XY") with no label. No POST — display only. | n/a | n/a |
| commodity-selection | commodity keys | set-owned `commodities/index.js` (static stub) | Filters stored keys against `commodityGroups()` at render. Stale keys are silently dropped from the rendered checkbox state. | Membership check on POST | Yes. |

Three practical takeaways:

1. **Nothing silently accepts a stale value on POST.** Every membership
   rule reads the current reader list, so a stored `XY` cannot survive
   a Save and continue.

2. **What survives is silence on GET.** On the select-backed pages
   (origin, import-reason, port-of-entry, private-transporter) the
   stale code simply isn't shown as selected — the trader sees an
   unselected field with no explanation of why their previous answer
   is gone. On the list-backed pages (transit-countries, commodity
   selection) the stale codes disappear from the rendered list
   entirely, also with no explanation.

3. **The `oneOf`-vs-`requiredOneOf` split matters on Amend.** On the
   `oneOf` pages the trader can click Save and continue on the empty
   field and the previous stored value is overwritten with `''`
   (`answersFrom(values)` on origin — origin/controller.js:94–102). The
   obligation model then marks the row unfulfilled on the hub and CYA,
   so submission is still blocked, but the trader's original answer is
   gone from the record without them ever seeing it. On `requiredOneOf`
   pages (both import-reason fields) the empty POST is refused, so the
   original answer is still overwritten with `''` in the same
   `answersFrom` build — but the trader can't leave the page without
   picking something, so no through-flow data loss.

Combined with the hub-level finding earlier — every section still
shows Completed on entry — the failure mode on Amend is:

1. Trader lands on the task list; every row shows Completed.
2. They pick the section they want to change, or navigate directly to
   the affected page.
3. They see an unselected field / a shortened list, with no message.
4. If they Save and continue without acting, on an `oneOf` page they
   have quietly wiped the answer; on a `requiredOneOf` page they are
   held on the page.
5. Either way, when they return to the hub the row now shows Not yet
   started — but only for pages they visited.
6. Pages they didn't visit still show Completed on the hub, and their
   invalid stored value goes forward to submit unless CYA catches it.

## Per-page behaviour on Amend — plants frontend

Same audit, on the plants set (`sets/high-risk-plants`). Fewer pages
touch reference data than on animals — origin (country), arrival-details
(port, potato-conditional), plus three address-book pickers that don't
themselves collect a country. The check-answers view-model and the
dashboard row are the only display-side readers.

| Page | Field(s) | Reader | GET render with stale stored value | POST rule | Empty allowed on POST? |
|---|---|---|---|---|---|
| origin | `countryOfOrigin` | `countries.originCountries()` | Select has no matching option; renders unselected. Prior code isn't visible. (origin/controller.js:137) | `requiredOneOf('countryOfOrigin', await countryValues(), …)` — origin/controller.js:70–77 | No. Empty rejected with `copy.errors.countryRequired`. |
| arrival-details | `proposedPlaceOfLanding` (potato-conditional) | `ports.list()` | Select renders unselected when out of the current list. | `requiredOneOf(PROPOSED_PLACE_OF_LANDING, await portCodes(), …)` (arrival-details/controller.js:93–100) — **rule only applies when `asksForPotatoDetails(scope)` is true**. | No when the rule applies. If scope changes so it doesn't apply, the field is no longer collected here. |
| consignor-select | address-book party (id) | address-book, not ref-data | Pre-selects the stored id if the address still exists; falls back to the picker. | `chosenFor()` verifies the id resolves against address-book. | Handled by the picker; not a ref-data path. |
| consignment-contact-select | address-book party (id) | address-book | Same shape as consignor-select. | Same. | Same. |
| place-of-destination | address-book party (id) | address-book | Same shape. | Same. | Same. |
| check-answers (display) | `originLabel(code)` + `ports.label(code)` | both | Falls through to `undefined` on an unknown code (no `?? code` fallback in check-answers view-model — check-answers/view-model/index.js:111–116). Label renders empty. | n/a — display only | n/a |
| dashboard row (display) | `originLabel(journey.originCountryCode)` | countries | Falls back to raw code: `originLabel ?? journey.originCountryCode ?? ''` (dashboard/view-model/row/index.js:18–27). | n/a | n/a |

Not present on plants:

- No transit-countries analogue — plants has no chip-list page that
  filters stale entries at render.
- No user-visible commodity picker over reference data — the commodity
  taxonomy is set-owned (`sets/high-risk-plants/services/commodities`)
  and can only change with a redeploy.
- No private-transporter form or transhipment-country page.

Four practical takeaways, contrasting with the animals audit:

1. **Plants is stricter on POST.** Both collect fields (`countryOfOrigin`,
   potato `proposedPlaceOfLanding`) use `requiredOneOf`, so a trader on
   Amend cannot wipe the stored answer with an empty Save and continue —
   the through-flow data-loss risk described in the animals audit does
   not exist on plants for these fields.

2. **Silent-on-GET is still there.** Same as animals — the stored stale
   code isn't shown as selected in the widget, and the trader sees an
   unselected field with no explanation. No banner, no "your previous
   answer 'XY' is no longer offered."

3. **Model-change interaction on the potato page.** The port rule is
   gated by `asksForPotatoDetails(scope)`. If the scope-in-caller flags
   for potatoes change between save and amend, the port question can
   disappear from the arrival-details page entirely — even if a
   `proposedPlaceOfLanding` value is still in the record. The value
   would remain in storage until an evaluation with the new gate
   purges it (Scenario 2).

4. **CYA and the dashboard both fall back to the raw ISO code.**
   Initial reading of the CYA view-model suggested it renders the
   country row empty. That was wrong. `originCountryLabel` is
   undefined for a stale code, but the CYA `answerRow(field, value)`
   helper uses a default-parameter fallback — `value = answers[field]`
   — that kicks in when `undefined` is passed explicitly. So the row
   value falls through to `answers.countryOfOrigin` = the raw code,
   matching the dashboard. Pinned by the test
   `check-answers/controller.test.js` — "Should render the raw ISO
   code in the origin row when the stored country is no longer
   offered by the origin block". The trader sees the same "ZZ" on
   both surfaces; neither warns that the code is no longer offered.

## Coverage added by this investigation (plants)

Three level-1 pinning tests, each targeting a specific claim above.
All three pass against the plants tip of main.

- `sets/high-risk-plants/journeys/linear/features/origin/controller.test.js`
  — describe `GET origin — amend with a stored country the reader no
  longer offers`. Two tests: the stale code survives into
  `values.countryOfOrigin` so it renders in the field, and the same
  code is absent from `countryItems` so the select renders unselected.
- `sets/high-risk-plants/journeys/linear/features/hub/controller.test.js`
  — added test "Should still complete the origin row when the stored
  country is no longer offered by the origin block". Locks in the
  load-bearing claim: the completeness roll-up is a presence check on
  the fulfilment map and does not cross-check ref data.
- `sets/high-risk-plants/journeys/linear/features/check-answers/controller.test.js`
  — added test "Should render the raw ISO code in the origin row when
  the stored country is no longer offered by the origin block". Pins
  the actual CYA behaviour (a subtle default-parameter fallback in
  `answerRow` means undefined labels fall through to the raw code,
  matching the dashboard).

The dashboard-side claim (raw ISO code on unknown label) was already
pinned by
`dashboard/view-model/row/index.test.js:31-35` — "Should fall back
to the raw code for an origin the country list does not name". No new
test needed there.

Next candidates — not yet written:

- Plants port scenario, potato-conditional gate: seed
  `proposedPlaceOfLanding: 'GB ZZZ'` and assert the hub row still
  shows Completed (arrival-details roll-up) and the port item list on
  the arrival-details page does not include it. Then a second
  variation where `commodityType` is not potatoes and the port
  question is off-scope entirely — assert the value sits inert.
- Purge of an unrecognised obligation id, end-to-end. Seed an
  answer at a key that does not correspond to a manifest obligation
  and assert (a) the engine's `evaluate()` returns without it in
  `fulfilments`, (b) the row still shows Completed if the collection
  it lived on was otherwise complete, and (c) no user-facing warning
  fires on hub/CYA.

## Cross-view divergence: dashboard vs notification journey

The dashboard row reads flat, projected fields directly off the
persisted record — no sanitiser, no purge
(`sets/.../dashboard/view-model/row/index.js`):

- `journey.reference`, `journey.status`, `journey.originCountryCode`,
  `journey.commodity`, `journey.arrivalDate`, `journey.consignorName`,
  `journey.createdAt`, `journey.submittedAt`.
- `originLabel(code) ?? code ?? ''` falls back to the raw code if the
  label lookup fails, so a stale country code renders as its code.

The notification journey reads via `state.get() → engine/read.js:74 →
answersForRead()`, which runs the sanitiser and the evaluator.

Consequences:

- **Deleted address-book party** — dashboard card shows the trader's
  original consignor name; CYA flags an outstanding party error; hub
  row still marks the section Completed. Three surfaces, three
  answers.
- **Vanished reference-data code** — both surfaces fall back to the
  raw code display-wise. Hub still Completed.
- **Purged obligation** — dashboard still shows the flat fields it
  extracted at submit-time; amend journey has silently lost the
  fulfilment.

No reconciliation runs across the two surfaces.

## Recommendation options for surfacing silent drops

1. **Purge-time diagnostic on the evaluation** — `dropUnrecognisedFulfilments`
   and `purgeStorage` record what they removed (obligation id, prior
   fulfilmentIndex, prior value if cheap) on `evaluation.purged`. CYA
   renders a banner naming each dropped answer; hub adds a badge next
   to Review. Fits the vocabulary sweep in EUDPA-377 —
   `evaluation.purged` slots alongside `impl.fulfilmentIndexes`.
2. **Model-version stamp** — persist an obligation-model version
   alongside the record on submit; on reload compare it and force the
   trader through CYA with a one-time "The rules have changed since
   you last submitted — please re-check your answers" banner. Coarser
   than option 1, but doesn't need per-fulfilment tracking. Needs a
   version field on the manifest and the persisted record.

Option 1 is truer to what happened; option 2 is easier to build.

## Testing and walk-example strategy

The engine is a pure function of `(state, model,
reference-data-snapshot-at-read-time)`. Neither the model nor the
reference data has to actually change to reproduce the failure modes
above — planting a state document whose shape reflects an older model
or an older reference-data snapshot is enough. Two levels worth
building, cheapest first.

### Level 1 — vitest / fit in the frontend repos

No stack. Construct a state POJO whose `fulfilments` and `answers` are
what a hypothetical older submit would have produced, run it through
the engine and the row/section-status code, and assert.

The engine already has one such test — `evaluator.test.js:173-176`
("unrecognised obligation ids are dropped (tolerate-and-amend)").
Extend the pattern to:

- **Stale country code.** Mock `countries.originCountries()` (or point
  the countries reader at a stub payload without `'XY'`). Plant
  `state.fulfilments.countryOfOrigin = 'XY'`. Assert:
  - `singletonFulfilled('countryOfOrigin', …)` returns true (row still
    Completed on the hub).
  - The origin controller's GET fit spec renders the select with no
    matching `<option>` (widget unselected).
  - `originLabel('XY')` returns undefined.
  - The check-answers view-model card renders an empty label for the
    country.
- **Stale port code.** Same shape against `ports.list()`. Plants adds
  a second twist: flip `asksForPotatoDetails(scope)` between save and
  reload and assert the field is no longer collected on the
  arrival-details page, but the value is still in storage.
- **Reshaped applyTo gate.** Plant a fulfilment attached to a
  fulfilmentIndex the reshaped gate no longer authorises. Assert
  `purgeStorage` drops it (post-EUDPA-377 name:
  `impl.fulfilmentIndexes`). Once we add a `evaluation.purged`
  diagnostic (recommendation option 1), assert that it surfaces the
  drop.

Fast, deterministic, no stack. These pin the concrete claims made
above (hub still shows Completed, CYA/dashboard divergence, the
plants-only potato-gate wrinkle).

### Level 2 — walk-example E2E in the tests repo

Full stack, slower, but produces a script a human can watch. The
tests repo already writes directly to Mongo for the outbox specs —
see `MongoDbClient` in
`repos/trade-imports-animals-tests/adapters/db/mongodb-client.ts` and
its use in `tests/e2e/features/admin/outbox-event-notification.spec.ts:39-58`.
Same pattern:

1. Submit a real notification end-to-end via Playwright.
2. Snapshot its persisted document from Mongo.
3. Mutate one field — change a stored country code to a value the
   stub doesn't offer; or point a fulfilment at an obligation id that
   isn't in the current manifest; or attach a fulfilment to a
   fulfilmentIndex whose applyTo gate would reject it. Write it back.
4. Sign in, click Amend on the dashboard card, walk each affected
   page.
5. Assert: hub row still Completed; opening the origin page shows an
   unselected select; CYA card shows the label empty; dashboard card
   still shows the raw ISO code.

Structure the walk with explicit stops (a `test.step` per page) so
the script is diagnostic, not just pass/fail — a stakeholder can
follow the trader's view step by step.

### Watch-outs

- **Schema drift.** Hand-crafted fixtures decay. Best done as a
  factory that reads a live submitted notification and mutates one
  field, so the shape tracks the backend automatically. A fixture
  literal will silently stop testing what it thought it tested when
  the persisted-state shape moves.
- **Converge-purge runs on first read.** Some fabricated scenarios
  (unknown obligation id, unauthorised fulfilmentIndex) get purged
  before the trader sees Amend. That is the point — the purge is
  exactly what we want to demonstrate. Structure the assertions
  around "was it there in Mongo before, and is it gone from the
  render after" rather than expecting to observe the stale value in
  the rendered page.
- **Reference-data isolation.** Stub mode seeds
  `services/countries/stub.js` with a fixed `COUNTRY_LABELS`. Level 1
  can mock the reader directly; level 2 has to pick a code that is
  *not* in the seeded stub as its "stale" value, or accept a small
  patch to the stub that adds one at test-time only.
- **Auth on the direct-write path.** Mongo direct write bypasses
  backend auth, which is fine for setup. Amend then flows through the
  frontend's HTTP path to the backend, which does re-check auth. So
  the fixture user must be the notification's owning organisation.

## Open questions

- Is losing a submitted answer on amend acceptable, or must the
  trader see it before it disappears?
- If we surface it, is a banner on CYA enough, or should the hub
  itself flag the section that lost an answer?
- Should dashboard rows read through the sanitiser/purge path so the
  three surfaces (dashboard, hub, CYA) agree? Or is the dashboard's
  role explicitly "what the trader last submitted"?

## Key file references

- `sets/.../dashboard/view-model/row/actions.js` — Amend button
- `sets/.../dashboard/view-model/row/index.js` — dashboard row read path
- `sets/.../dashboard/controller.js:121` — POST /amend route
- `engine/journey.js:141` — `amendJourney`, SUBMITTED → AMEND
- `engine/read.js:74` — `answersForRead`, sanitiser entry point
- `flow/section-status.js:8-15` — `sectionStatus`, `readyForCheckYourAnswers`
- `bridge/status/index.js:87-99` — `statusOf`
- `bridge/status/completeness/index.js:106` — `partSatisfied`
- `bridge/status/completeness/leaf.js:29-34` — `singletonFulfilled`
- `model/obligations/evaluator/converge-purge.js` — fix-point purge loop
- `model/obligations/evaluator/purge/drop-unrecognised-fulfilments.js`
- `model/obligations/evaluator/purge-storage.js:51-80`
- `sets/.../check-answers/controller.js:27-92` — party sanitiser + `outstandingPartyErrors`
- `evaluator.test.js:173-176` — the only test covering silent obligation drop
- `check-answers.test.js:1151-1160` — sanitiser test for deleted address-book party
