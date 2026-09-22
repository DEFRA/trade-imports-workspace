# EUDPA-573 — stale state on amend / reload

Investigation notes on what the animals and plants frontends do when a
submitted (or in-flight) notification is reloaded after the reference
data, the obligation model, or the validation logic itself has moved
on underneath it.

Shared engine code — every code reference below applies to both repos
unless called out.

## The three scenarios

1. **Stale reference-data value.** A stored code — country, port,
   commodity — is no longer in the reference-data payload (MDM
   re-release, retired port, dropped commodity). The obligation still
   exists.
2. **Model change.** The obligation model itself has moved: an
   obligation added, removed, or its `applyTo` gate reshaped, since the
   notification was last saved.
3. **Validation logic change.** A rule inside a controller or a
   shared validation helper has tightened since submit — a shorter
   max-length, a stricter regex, a narrower date range, a new
   cross-field consistency check. The stored value survives; the
   rule that judges it does not. Distinct from Scenario 2 because
   the manifest has not changed — this is code-only.

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

## Scenario 3 — validation logic change

Rules that live in the controller (max-length, regex, date range,
cross-field consistency) can move independently of the obligation
model. The manifest is unchanged; the rule is not.

| Change | Behaviour | User-visible? |
|---|---|---|
| Tightened rule (shorter max-length, stricter regex, narrower range) | Nothing checks the stored value on GET or Amend entry. The next POST that revisits the field is refused with the new rule's copy. | **No** until the trader re-opens the page. |
| Loosened rule | Stored value stays valid. | Safe. |
| Cross-field consistency rule added / tightened | A combination that was valid at submit may now fail. Only surfaces on re-POST that touches one of the fields. | **No** until the trader re-opens. |
| Error copy change | Stored value still valid; only the wording differs when validation fires. | Safe. |

Same silent-drift shape as Scenarios 1 and 2: the stored answer
carries forward; the rule that judged it has moved. The Amend flow
does not re-run every page's validation against every stored answer,
so a newly-invalid combination is only caught when the trader
happens to re-visit the affected page — or when the reject-on-submit
requirement below fires at finalise time.

Concrete live example: the arrival-date window on animals'
`port-of-entry` (`port-of-entry.controller.js:58-69`) is
`dateTextInRange('arrivalDateAtPort', { min: dateWindow.min, max:
dateWindow.max, … })`, where `arrivalWindow()` slides on today's
date (one week back, six months forward). A notification submitted
with arrival = today + 1 month whose trader Amends two months
later has an arrival date that is now a month in the past. The
rule is stable; its input drifts. Nothing re-runs the range check
on submit; the notification finalises with the stored out-of-window
date. A membership-only reject-on-submit loop would not catch it.
Same shape wherever a rule's bounds move because "now" moves —
so this class is not a hypothetical.

Trigger source: team-owned (deploy of the frontend that carries the
tightened rule); same shape as obligation-model changes. The
migration-job pattern in "Version pinning + migration" below fits —
the sweep runs the current rules against each stored payload and
stamps `needsAttention` on those that newly fail.

Scope of the fixes shipped so far: the six frontend-hardening
commits on `chore/EUDPA-573-origin-page-hardening` cover
ref-data-membership checks only. Extending the same "detect on GET,
surface an error, blank the value" pattern to arbitrary
validation-logic changes is a separate piece of work — likely a
generalisation of the pattern rather than one-off checks per
controller.

Test coverage: none dedicated. Rule tightening is caught only
incidentally, when a test seeds a specific pre-tightening value and
happens to POST it.

## Per-page behaviour on Amend — animals frontend

Concrete audit of every animals-frontend page that reads reference data,
and what each does when a stored value has since dropped out of the
current list. All rows share one shape: the page's `fields()` builds a
membership rule from the *current* reader list, so any stored value not
in the list is refused on POST. What varies is whether the stale value
survives into the GET render, and whether the POST rule blocks empty as
well as non-member.

| Page | Field(s) | Reader | GET render with stale stored value | POST rule | Empty allowed on POST? | Status |
|---|---|---|---|---|---|---|
| origin | `countryOfOrigin` | `countries.originCountries()` | Select has no matching `<option>` — widget renders as unselected (placeholder). Autocomplete input value blank. Prior code is not visible. | `oneOf('countryOfOrigin', countryValues, …)` | Yes — the origin controller's comment says empty on this page is OK because the obligations model keeps the row unfulfilled and CYA blocks submit (origin/controller.js:140–144). | Fixed on `chore/EUDPA-573-origin-page-hardening`. |
| import-reason | `destinationCountry` (transhipment / transit) | `countries.originCountries()` | Same as origin — select renders unselected. | `requiredOneOf(…)` | No — blocks empty with the standard error. | Fixed on `chore/EUDPA-573-origin-page-hardening`. |
| import-reason | `portOfExit` (transit / temp admission) | `ports.list()` | Select renders unselected. | `requiredOneOf(…)` | No. | Fixed on `chore/EUDPA-573-origin-page-hardening`. |
| transport / port-of-entry | `portOfEntry` | `ports.list()` | Select renders unselected. | `oneOf(…)` | Yes — page allows partial save, mandatory-ness lives in the obligation model. | Fixed on `chore/EUDPA-573-origin-page-hardening`. |
| transport / private-transporter-details | `country` (address block) | `countries.addressCountries()` | Select renders unselected. | `oneOf(…)` | Yes. | Fixed on `chore/EUDPA-573-origin-page-hardening`. |
| transport / transit-countries | `transitedCountries` (list) | `countries.originCountries()` | **Different shape** — the controller filters stored codes against the current list at render (`selected.filter(code => offered.has(code))`, transit-countries.controller.js:48–59). Stale codes vanish from the rendered chip list before the trader sees them. No banner. | Filtered-again membership check on POST | Yes — page allows an empty list. | Fixed on `chore/EUDPA-573-origin-page-hardening` (banner on GET; the filter and commit path are unchanged). |
| addresses / frozen-parties (display only) | party country label | `originLabel(code)` | Fallback: `originLabel(code) ?? code`. A stale code renders as the raw ISO code (e.g. "XY") with no label. No POST — display only. | n/a | n/a | Deferred — see below. |
| commodity-selection | commodity keys | set-owned `commodities/index.js` (static stub) | Filters stored keys against `commodityGroups()` at render. Stale keys are silently dropped from the rendered checkbox state. | Membership check on POST | Yes. | Deferred — see below. |

### Deferred rows

Two rows above are deferred rather than fixed. Both are legitimate
concerns, but the trigger for change is not the same as the six
MDM-backed reader fields we did fix — the deferral is about *when*
the fix has to land, not *whether* it is needed.

- **addresses / frozen-parties (display only).** The party rows on
  this page are captured at submit and rendered read-only — the
  design intent is that the trader sees exactly what they submitted,
  and further changes go via a new amendment flow rather than in-
  place. Surfacing a stale-country annotation on a frozen field
  would conflict with that design. If the trader needs to act on a
  changed party country, the CTA belongs on the outer notification
  surface (per the INS frontend attention plan below), not on the
  frozen party display. Revisit when the INS attention work
  crystallises the surface.
- **commodity-selection.** The commodity list is set-owned
  (`sets/live-animals/services/commodities/`) — a static list under
  our own control, not fetched from MDM. Changes to it are team-
  controlled and would be coordinated with a manifest / release
  change. If we ever bump the list we can plan a migration or a
  specific banner as part of that change; deferring until then
  avoids designing against a hazard we own the timing of.

Five practical takeaways:

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

4. **CYA renders "Not applicable" for a stale country — not the raw
   code the dashboard renders.** The row builder in
   `sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/import-details.js:26-27`
   passes `(await countries.originLabel(answers.countryOfOrigin)) ?? ''`
   into `row(...)`; the empty string flows through `valueText`, which
   returns `copy.notApplicable` ("Not applicable") for any blank value
   (`check-answers/view-model/rows/value-text.js:16-19`,
   `check-answers/copy/copy.en.js:5`). This differs from the plants
   CYA — plants' `answerRow` default-parameter fallback lands the raw
   ISO code in the same row (see the plants section below). Consequence:
   on animals a single stale country code produces four different
   renderings across the trader's surfaces — dashboard card → raw code,
   hub row → Completed, origin page → unselected select with no message,
   CYA row → "Not applicable". The placeholder is the same string used
   on finished cards for legitimately blank rows, so a trader cannot
   tell a stale answer from an intentionally-omitted one.

5. **Region-code cascade — a saved answer flips from valid to invalid
   without the trader touching the field.** The stored
   `regionOfOriginCode` is the whole code (`AT-123`). The suffix input
   on the origin page is derived by stripping the country prefix from
   the whole code on GET (`origin/controller.js:104-112`, `suffixOf`
   at 78-83). While the stored country is still `AT`,
   `suffixOf('AT', 'AT-123')` returns `'123'` (3 chars) and the suffix
   rule `requiredMaxText(REGION_CODE_SUFFIX_FIELD, 5, …)` passes
   (`controller.js:126-136`). Once the country goes stale (or is
   wiped), the stored `AT-123` no longer starts with the current
   prefix, so the whole value flows into the suffix input; the same
   rule now measures `AT-123` (6 chars) and fails with "Region of
   origin code must be 5 characters or less". The diagnostic message
   names the region code, not the stale country — the trader sees a
   length error against a value they never touched, and no cue linking
   it to the origin dropdown. Same shape wherever a stored answer is
   decomposed on render against another stored answer that has since
   drifted (prefix, gate, joined identifier).

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

| Page | Field(s) | Reader | GET render with stale stored value | POST rule | Empty allowed on POST? | Status |
|---|---|---|---|---|---|---|
| origin | `countryOfOrigin` | `countries.originCountries()` | Select has no matching option; renders unselected. Prior code isn't visible. (origin/controller.js:137) | `requiredOneOf('countryOfOrigin', await countryValues(), …)` — origin/controller.js:70–77 | No. Empty rejected with `copy.errors.countryRequired`. | Fixed on `chore/EUDPA-573-plants-origin-page-hardening`. |
| arrival-details | `proposedPlaceOfLanding` (potato-conditional) | `ports.list()` | Select renders unselected when out of the current list. | `requiredOneOf(PROPOSED_PLACE_OF_LANDING, await portCodes(), …)` (arrival-details/controller.js:93–100) — **rule only applies when `asksForPotatoDetails(scope)` is true**. | No when the rule applies. If scope changes so it doesn't apply, the field is no longer collected here. | Fixed on `chore/EUDPA-573-plants-origin-page-hardening` (scope-aware; nothing surfaced under a non-potato commodity). |
| consignor-select | address-book party (id) | address-book, not ref-data | Pre-selects the stored id if the address still exists; falls back to the picker. | `chosenFor()` verifies the id resolves against address-book. | Handled by the picker; not a ref-data path. | Deferred — see below. |
| consignment-contact-select | address-book party (id) | address-book | Same shape as consignor-select. | Same. | Same. | Deferred — see below. |
| place-of-destination | address-book party (id) | address-book | Same shape. | Same. | Same. | Deferred — see below. |
| check-answers (display) | `originLabel(code)` + `ports.label(code)` | both | Falls through to `undefined` on an unknown code (no `?? code` fallback in check-answers view-model — check-answers/view-model/index.js:111–116). Label renders empty. | n/a — display only | n/a | Deferred — see below. |
| dashboard row (display) | `originLabel(journey.originCountryCode)` | countries | Falls back to raw code: `originLabel ?? journey.originCountryCode ?? ''` (dashboard/view-model/row/index.js:18–27). | n/a | n/a | Deferred — see below. |

### Deferred rows

Five rows above are deferred rather than fixed. The reasoning mirrors
the animals-frontend deferrals: the trigger for change or the surface
the change appears on sits outside this branch's scope.

- **Three address-book pickers (`consignor-select`,
  `consignment-contact-select`, `place-of-destination`).** These are
  not MDM-backed; they resolve against the address-book service, and
  the picker itself already handles the "party not found" case via
  `chosenFor()`. Stale-address-book behaviour is a different problem
  covered further down under "Address-book — the upstream stale-
  state surface", and belongs on the address-book side rather than
  every consumer.
- **check-answers (display only).** Display concern rather than an
  input handler. Fits the redesigned INS attention surface below
  more naturally than a one-off CYA banner. Revisit when the INS
  attention work crystallises.
- **dashboard row (display only).** Same reasoning as the animals
  dashboard row: the dashboards are being retired in favour of the
  INS frontend (per the meeting notes below). Any fix here has a
  lifespan tied to that migration.

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

## Address-book — the upstream stale-state surface

Every notification party (`consignor`, `placeOfOrigin`,
`placeOfDestination`, `consignee`, `importer`, `contactAddress`) points
at an address stored in the address-book service. The address record
itself carries a `countryCode` field, so the stale-state failure mode
above has a second locus that neither the animals nor plants notes
above have covered: **the address book itself**.

Consumer: the address-book UI lives in the INS frontend
(`repos/trade-imports-ins-frontend/src/server/address-book/`).

- Country reader — `address-book/address-countries.js:1-27` calls
  `countriesClient.getCountries(traceId)` (MDM), filters out `GB`, and
  builds select items for the address create/edit pages.
  `resolveCountryCodeFromSearchTerm(q, countries)`
  (`address-countries.js:39-47`) backs the autocomplete.
- Persistence — `address-schema.js:10, 46` requires a `countryCode` on
  every stored address; validated as a `Joi.string()` value with no
  membership check against the reader.

Consequences:

1. **Address already saved, country later dropped from MDM.** The
   record sits in address-book storage with the stale `countryCode`
   intact. On the edit page GET the select falls through to unselected
   (same shape as the animals origin page). No banner, no explanation.
2. **Downstream propagation.** Every notification that references
   that `addressId` inherits the stale country when the frontend
   fetches the party live. No amount of notification-side purge or
   validation catches it — the notification is faithful; the address
   is stale. A single address feeding N notifications gives N
   inherited failures.
3. **Cross-service coupling.** The reject-submit requirement above
   ("Membership re-check on submit") only fires against reference
   data the notification directly stores. Party country codes come in
   via the address-book lookup, not from the notification's own
   fulfilments, so a check on the notification's fulfilments alone
   would not catch this — the check either has to include live party
   country codes, or the address book has to run its own membership
   guard on read/write.

Follow-up work worth pinning:

- Audit the address-book edit/view/list templates for how they render
  a stale `countryCode` (raw code, empty label, "Not applicable"
  equivalent). Expected to mirror the animals CYA fallback pattern —
  worth confirming.
- Confirm whether the address-book service validates `countryCode`
  membership on write. `address-schema.js` looks permissive; if so, a
  newly-created address can already be born stale if MDM has drifted
  since the last frontend reload.
- Decide the reject-on-read policy for address-book: refuse to serve
  a party whose country is not in the current MDM list, refuse to
  save one, or surface the stale code with a diagnostic. Same
  three-option shape as the notification-side recommendations above.

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
- **Vanished reference-data code** — dashboard falls back to the raw
  code; hub still Completed. The CYA row diverges by set: animals
  renders "Not applicable" (`?? ''` collapses through `valueText` to
  `copy.notApplicable`, see the animals section above); plants falls
  back to the raw code (`answerRow` default-parameter, see the plants
  section). Three surfaces disagree on animals, two on plants.
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

## Requirement — reject submit for stored values that fail today's rules

Confirmed on the demo walk: with `country-stale` seeded on an animals
notification, clicking Submit succeeds and the record lands in the
SUBMITTED state with `countryOfOrigin='ZZ'` intact. Nothing on the
submit path re-checks membership of the stored value against the
current countries reader.

That is the load-bearing failure. Everything above about the
Amend-surface confusion — silent GET, "Not applicable" on CYA, the
region-code cascade — is a symptom of a state the record should never
have reached. The trader could notice on Amend, but noticing is
optional. The submit path is the boundary that has to close.

The check-your-answers page is the trader's last chance to catch a
stale document, and today it validates on neither GET (page load) nor
POST (submit button). The trader lands on CYA with an empty or
"Not applicable" row where a stale answer used to be, no error
banner, and clicking Submit sends the payload through unchallenged.
Related ticket: https://eaflood.atlassian.net/browse/EUDPA-295.

Requirements:

1. **Membership re-check on submit.** Refuse submit when any stored
   fulfilment fails its current membership rule against reference data
   (countries, ports, commodities) — the same rule the page's POST
   already enforces. Applies whether or not the trader re-opened the
   affected page. On failure, return the trader to the offending
   page's Amend view with a plain message naming the field and the
   current stored value ("The country code saved is no longer offered
   — pick a country before submitting.").
2. **Party resolution on submit.** Refuse submit when any stored
   party addressId does not resolve against the current address-book.
   `outstandingPartyErrors` at
   `sets/.../check-answers/controller.js:27-92` already computes this
   for the CYA banner — reuse it as a submit-time gate, not a banner
   the trader can walk past.
3. **Purge as reject.** Refuse submit when
   `dropUnrecognisedFulfilments` or `purgeStorage` would remove any
   fulfilment on read. Silent purge is only safe when submit refuses
   the same document.

Contrast with the recommendation options above (surface silent drops
on render): those help the trader who re-opens the record; this
requirement closes the loop when they don't.

## Structural sketch — centralised per-page validation

The reject-on-submit requirement above scopes itself to three
bullets — membership re-check, party resolution, purge-as-reject.
The first is a tractable slice: a known set of ref-data-backed
fields, a per-field membership check against the current reader,
~50 lines in a `bridge/reject-stale-at-submit.js`. But it misses
everything else — length caps, date ranges, cross-field cascades,
any future rule tightening. Static analysis to enumerate "non-
membership rules we'd need at submit time" is fragile — the
arrival-date range under Scenario 3 is one example already present
in the animals code today, not a hypothetical.

The fuller shape: expose each page's validation as a re-runnable
hook, register it centrally, and call from every place that cares
(submit, CYA render, hub row status). Below is a structural sketch,
not committed — named so future work can reason about it.

### What each page exposes

A single addition per page controller:

```js
export const validateStoredAnswers = async (answers, scope) => {
  if (!isPageInScope(scope)) return {}
  const payload = payloadFromAnswers(answers, scope)
  const { errors } = validate(await fields(...), payload)
  return errorsKeyedByAnswer(errors)
}
```

Three pieces the hook owns internally:

- **Scope predicate.** The page's in-scope check under the current
  answers / scope. Import-reason under `reasonForImport === 'reEntry'`
  is a no-op; private-transporter under a commercial transporter is
  a no-op; port-of-entry is always in scope.
- **Inverse projection.** The mirror of the current
  `formValuesFromAnswers` (which projects stored answers into form
  values for GET prefill). The rules take a payload-shaped object;
  the hook reconstructs one. Most pages are trivial (payload keys
  match stored keys); origin has the region-code suffix mechanic
  and import-reason has the reveal-conditional keys, each still
  self-contained inside the hook.
- **Error re-keying.** Rules return errors keyed on form-field
  names; the hook translates them to stored answer names. 1:1 for
  most pages; N:1 for import-reason where two reveal fields both
  map to one stored `destinationCountry`.

### Central registry and runner

`sets/.../features/index.js` already imports every page module as
`dispatchPages`. Add `validateStoredAnswers` alongside the routes;
the registry gathers them the same way. A small aggregator in
`bridge/`:

```js
export const validateAllStored = async (answers, scope) => {
  const perPage = await Promise.all(
    PAGES_WITH_HOOKS.map(({ page, validateStoredAnswers }) =>
      validateStoredAnswers(answers, scope).then((errors) => ({
        page,
        errors
      }))
    )
  )
  return perPage.filter(({ errors }) => Object.keys(errors).length > 0)
}
```

Three consumption points, one aggregator:

- **Submit path.** `submitJourney` calls `validateAllStored`; if
  any errors, refuse the finalise and route the trader to the first
  offending page.
- **CYA render.** Decorate cards with per-answer "needs attention"
  markers, plus a summary banner naming affected sections.
- **Hub row status.** Downgrade a section's row from Completed to
  "Needs attention" when its page's hook returns errors, or add a
  badge — designer's call.

### Async IO and large-dataset readers

Some rules require remote calls, not an in-memory list membership
check. The most concrete case: **commodity codes.** Once un-stubbed
the commodity dataset is far too large to hold in memory, and the
type-ahead search API is prefix-oriented — not usable for "does
this exact stored code still resolve?". A different reader shape is
needed:

- `commodities.resolve(code) → Promise<{ known: boolean, ... }>` —
  a dedicated reverse-lookup on the ref-data-service, backed by an
  MDM lookup. Distinct from the type-ahead endpoint.
- The `validateStoredAnswers` hook is already async, so a reader
  that awaits a remote call needs no further plumbing at the hook
  level.
- **Batching matters.** A CYA render or a hub load that fans out
  N remote calls (one per stored code, one per notification the
  trader has open) is a real latency concern. Either the reader
  accepts a batch or the aggregator coalesces.
- **Caching per request.** The same code checked twice in the same
  render (e.g. across two consumer surfaces) should hit once. A
  request-scoped memo on the reader closes this.

### Migration path

Additive; no big-bang rewrite. Pick one simple page (port-of-entry)
and add the hook; add the registry-and-aggregator scaffolding wired
into submit only; expand page by page. Once every page has a hook,
wire the aggregator into CYA render and hub row status. Each step
is testable and reversible.

### Guardrail — no page forgotten

The concern that "a new rule lands on a page and no one remembers
to add it to the reject-on-submit registry" turns into a runtime
question: every page module in `dispatchPages` must either export
`validateStoredAnswers` or explicitly opt out. A boot-time
assertion (or a build-time lint) closes the loop and makes silent
misses impossible.

### Cost, honestly

Not trivial. Every page controller gains a small hook; existing
tests already cover the `fields()` factory but new tests cover the
hook's projection and error re-keying. Reveal-conditional and
cross-field pages (origin, import-reason) are more work than
scalar-field pages. Ballpark: a day per page, plus the registry,
the aggregator, and the async-batching design. Weeks, not hours.

Whether this is worth building depends on the "Current
recommendation" section below: if we ship what we have and defer
the auto-detect pipeline, we also defer this. It becomes worth
building when we hit a concrete Scenario 3 incident that the
membership loop cannot catch — arrival-date drift being the first
candidate that already lives in the animals code.

## Meeting notes — 2026-09-21 (tech lead + designer)

Direction-of-travel points from the meeting that reshape where the
recommendations above have to land.

1. **Animals and plants dashboards are on the way out.** Both are
   deprecated and will be removed once the INS frontend reaches
   feature parity. Any recommendation aimed at "the dashboard card"
   has a lifespan tied to that migration — worth landing on the INS
   frontend surface instead if it arrives before the migration
   completes.

2. **INS frontend is being redesigned as the attention surface.** It
   will highlight notifications that require the trader's attention.
   From the INS frontend the trader navigates to:
   - the task list (hub), for a notification not yet submitted;
   - the check-your-answers page, for a submitted notification.
   Both destinations will be amended to render a call-to-action or
   user prompt when something on the notification has changed or
   needs attention.

3. **Stale-state signals map naturally onto (2).** The failure modes
   audited above — silent GET on a stale country, "Not applicable"
   on CYA, cascade validation errors on region code, silent purge of
   an unrecognised obligation, deleted address-book party — are all
   flavours of "something on this notification has changed". They
   fit the redesigned INS frontend's attention model directly. Some
   findings above can therefore be **captured and deferred** until
   the INS frontend redesign lands, rather than layering one-off
   banners onto the current dashboards / CYA pages.

4. **Open: how the INS frontend learns that a notification needs
   attention.** The signals originate in systems the INS frontend
   does not own (MDM re-releases, obligation-manifest bumps per set,
   address-book deletes). Running the full sanitiser / purge /
   membership pass per notification on every dashboard load is not
   free, but a coarser stamp costs freshness or reason granularity.
   Discussion below.

## Attention signalling — trigger sources

Refining point (4) above: the signal that a notification needs
attention has three distinct triggers, each with a different owner
and a different amount of new work.

1. **Obligation model changes — team-owned.** Every manifest change
   ships in a set repo (animals-frontend, plants-frontend). We know
   when they happen because we make them. Detection available today
   without new infrastructure: stamp a manifest version on the
   notification at submit and compare on read; or bump a
   monotonically-incremented integer in CI on any change under
   `obligations/`.

2. **Ref-data changes — external, detected in the ref-data-service.**
   MDM re-releases are owned by external teams and we get no
   notification. The ref-data-service
   (`repos/trade-imports-reference-data`) is the single surface into
   MDM, so it is the natural change-detector. Current shape
   (`MdmService.java`, `CacheConfig.java:16, 32-45`): Caffeine cache
   per reader with `expireAfterWrite = 60 minutes` (env-configurable
   via `CACHE_MDM_TTL_MINUTES`). Cache purpose is rate-limiting MDM,
   not change detection (`CacheConfig.java:30-31`) — no previous
   payload snapshot, no diff, no event emission on refresh. To turn
   the ref-data-service into a change-detector: (a) snapshot the last
   payload per reader, (b) diff on refresh, (c) emit a change event
   per reader with the specific added/removed codes so consumers can
   re-evaluate only the affected notifications. Cadence: the
   `@Cacheable` path is lazy — it refreshes on first read after TTL
   and never for readers no consumer is hitting — so a scheduled poll
   (`@Scheduled(fixedRate = …)`) gives a predictable heartbeat, at
   the cost of one MDM call per reader per interval (which the
   current 60-minute TTL already implies as an upper bound).

3. **Address-book changes — service-owned.** Deletion or edit of a
   party is mediated by the address-book service, which is best
   placed to emit change events on write. Third leg the
   notification-side options above largely miss.

See "Target architecture — precompute + emit" below for how the
three triggers feed a single downstream flow to the INS frontend.

Open sub-questions:

- **Event granularity.** Diff-carrying per reader ("these codes
  dropped from `MDM_COUNTRIES_CACHE`") vs coarse ("reader R
  changed"). The diff makes each set's re-sweep targeted; coarse is
  easier to build but forces a full sweep on every emit.
- **Ref-data-service event transport.** Does the existing
  dynamics-gateway → ASB path (ADR-EUDP-001 Option B) fit, or does
  the ref-data-service need a direct producer?
- **Reader inventory.** Countries and ports today
  (`MDM_COUNTRIES_CACHE`, `MDM_POE_CACHE`); are there others each
  set uses (commodity codes, other MDM domains) that would need the
  same detection?
- **Migration ordering.** The reject-on-submit requirement above
  stands regardless — it guards the boundary rather than the
  display, so it does not depend on the attention-signalling work.
  Which lands first?

## Target architecture — precompute + emit

The end-to-end flow that keeps the existing event architecture's
one-directional grain (compute → event → downstream store →
downstream render). Preferred over sync RPC between the INS and set
frontends (see "Rejected" below).

1. **Trigger.** One of: manifest deploy in a set repo, ref-data
   change event from the ref-data-service (per the ref-data
   subsection above), address-book change event.
2. **Precompute.** The set frontend (animals, plants) sweeps
   affected submitted notifications and evaluates each fulfilments
   payload against the current model + ref-data + address-book.
   Produces per-notification `{ needsAttention: bool, flags: [{
   obligationId, reason, helperText }] }`. Model-aware compute stays
   where the model lives.
3. **Emit.** The set publishes a `NotificationAttentionChanged`
   event (or similar) with the reference and the flags. Same event
   backbone that carries notification data today.
4. **Consume.** INS backend consumes the event and stores the flags
   on its read model, same shape as other projected fields.
5. **Display.** INS frontend reads its own backend and renders the
   CTA / attention prompt on the list, hub row and CYA page. Zero
   cross-service RPC. INS never needs to know which readers fed
   which fields on which notification — that stays inside the set.

### Where does the emission originate?

**Decision: emission in the backend, compute in the frontend.** The
set frontend runs the sweep against the current model, then calls a
new backend endpoint (e.g. `POST /notifications/:ref/attention-flags`)
which stores the flags on the notification aggregate and emits the
`NotificationAttentionChanged` event. Compute in frontend, transport
in backend — preserves the existing "only backends emit events"
pattern and gives the notification aggregate a durable copy for audit
and re-emission.

Alternatives considered and rejected:

- **Frontend emits directly.** Would give the set frontend an
  event-publishing dependency (SDK, ASB producer client). Simplest
  data flow, but breaks the "only backends emit events" pattern.
- **Move the compute into the backend** (package the manifest as a
  shared library the backend imports). Cleanest architecturally, but
  couples releases: any change to the obligation model would require
  a lockstep frontend + backend deploy. The model changes often
  enough for that to be a real drag on delivery; keeping the model
  frontend-only preserves the set frontend's independent release
  cadence.

### Rejected — sweep-on-demand via INS → set frontend API

Considered and explicitly rejected: an INS-frontend HTTP call to the
set frontend (`GET /notifications/:ref/needs-attention`, or a bulk
variant) per row on list render. It would work — the set frontend
already has the engine loaded — and technically it is the smallest
patch. But it introduces a second communication grain (sync RPC,
downstream → upstream) alongside the event-driven upstream data
flow. Two transports, two failure models, two consistency stories,
in the same feature.

Not worth the tension for the latency saving. The precompute + emit
path above uses the existing grain and produces the same result on
the display side. Recorded here so future readers see the shape was
considered rather than overlooked.

## Alternative — MDM changes as a support activity

MDM owns the reference-data lifecycle; we do not. That framing points
at a lower-infrastructure alternative to the auto-detect target above:
treat each MDM change as a planned support activity we hear about out-
of-band, with the ref-data-service running a canary rather than a full
event pipeline.

### Additive vs subtractive changes

Not every MDM change affects existing notifications:

- **Additive changes** — a code appears in the current reader list
  that was not in the previous release. No stored answer is
  invalidated. Safe by construction; no attention signal needed.
- **Subtractive changes** — a code present in the previous release
  is absent from the current one. Every notification whose stored
  answer is that code is now stale in the frontend's meaning. This
  is the case the frontend hardening (above) protects against and
  the case attention signalling has to detect.
- **Amendments** — a code stays but its attributes change (rename,
  block membership, effective dates). May or may not affect stored
  answers depending on which attributes are read. Treat as
  subtractive when the changed attribute is one the frontend or
  notification reads.

"Subtractive" is the operative word — the concise opposite of
"additive" without the connotations "reductive" carries in general
English.

### The support-activity path

Trigger source: MDM comms tell us codes are dropping (or attributes
changing). Per change, we run a migration script that sweeps
affected submitted notifications, evaluates each fulfilments payload
against the current model, and stamps `needsAttention` with
per-change helper text tuned to the specific removal ("The country
XY is no longer available because ..."). The frontend hardening
already shipped in `chore/EUDPA-573-origin-page-hardening` is the
always-on safety net beneath.

Trade-offs against the auto-detect target:

- **Pro** — no snapshot / diff / emit infrastructure inside the
  ref-data-service; no event bus dependency; per-change reasoning
  can carry richer helper text than auto-detect naturally can.
- **Pro** — bounded work per change: only the migration script has
  to run, not a continuous detection loop.
- **Con** — depends on MDM's comms discipline. Silent removals slip
  past unnoticed; the frontend hardening is the only guard.
- **Con** — each change is a delivery event with a lead time; needs
  runbook + on-call awareness.
- **Con** — does not scale to address-book changes (trader-driven,
  no lead time available). Address-book still needs its own event-
  driven mechanism.

### Canary — belt-and-braces without the full pipeline

The ref-data-service can still run a snapshot-and-diff loop as a
**canary**: on refresh, compare the new payload to the previous
snapshot per reader; if any subtractive change is detected without a
matching comms notice, raise an alarm to us (a log line, a
metric, a page). Bounded work, high signal — no per-notification
sweep and no event bus, just a "did MDM change without telling us"
check.

Reasonable to build the canary regardless of whether we adopt the
support-activity path or the full auto-detect target. Under the
support-activity path it is the last line of defence; under the
auto-detect target it is the trigger.

**Caveat: snapshot-and-diff only works for readers that can hold the
whole list.** Countries and ports fit today — the whole payload
sits in the ref-data-service's Caffeine cache (60-minute TTL). The
commodity dataset does not: it is far too large to fetch in one
payload, and once un-stubbed the reader will only expose it as a
type-ahead search returning slices. Snapshot-and-diff cannot see a
whole-list drop that never lived in one place.

For large-dataset readers, detection has to shift shape:

- **Per-key verification against stored values.** Instead of "did
  the dataset change?", ask "does this specific stored code still
  resolve?" — once per stored code, on the notifications we care
  about. Each check is a bounded lookup against the upstream
  service. Scales with notifications, not with the catalogue. Fits
  both the migration-script pattern and an ad-hoc attention sweep.
- **Upstream change feed.** MDM (or the ref-data-service on our
  side) publishes deltas — codes added, removed, amended. Requires
  the upstream to offer one; not something we can build alone.
- **Dataset version stamp.** The upstream exposes an ETag / version
  / manifest hash; we only need to know it moved, not what changed,
  and combine with per-key verification when it does.

Implications for the frontend staleness helpers already shipped
(`isCountryStale(code)`, `isPortStale(code)`): these call the
reader's `list()` and check membership. Fine for countries and
ports; needs to become a per-key `resolve(code)` lookup once
commodities is un-stubbed. The reader API can present both idioms;
the predicate name and shape stay the same.

### Discovery questions before committing

- Who at MDM tells us about pending changes? In what channel? With
  what lead time?
- Historical cadence of country / port list changes — annually?
  Weekly? Ad-hoc?
- Are there ever emergency drops (sanctions, compliance) with zero
  comms?
- Does MDM's release process distinguish additive from subtractive
  changes explicitly, or would we have to compute the diff
  ourselves?
- What does MDM already publish about upcoming changes that we
  could tap into (release notes, change tickets, mailing list)?

If MDM comms are reliable and the cadence is low, the support-
activity path with the canary underneath is probably the right-sized
choice. If comms are unreliable, absent, or if the cadence is high
enough to swamp on-call, the full auto-detect target becomes worth
the infrastructure.

## Alternative — parent dashboard, per-set attention (needs discussion)

Both architectures above assume the INS frontend is *the* attention
surface: it ingests per-notification attention flags from every set
and renders CTAs on a unified list. A different shape is possible:

- INS is a lightweight **parent dashboard** — an index of the
  notification types the trader has in flight (e.g. "3 animals, 1
  plants"). Nothing more.
- Each set frontend keeps (or regains) its own per-notification
  dashboard. Attention flags, CTAs and stale-state signals live on
  the set-owned dashboard alongside the notification data and the
  model that judges it.
- INS links out to the animals dashboard, the plants dashboard, and
  so on.

Consequences to weigh:

- **Pro — CTA is much simpler.** The dashboard renders inside the
  set frontend, so it has the model, the ref-data readers, the
  address-book resolver and the copy in scope. No cross-set
  serialisation needed; the "compute → emit → INS ingest" pipeline
  either shrinks to a bare "notification-created" ping (for the
  index) or drops out entirely.
- **Pro — same pattern per set.** Each set owns its own attention
  story. Consistency across sets becomes convention rather than a
  shared payload contract.
- **Pro — reduces event fidelity pressure.** The concern that "the
  INS backend event pipeline carries too much per-notification
  detail" goes away if INS only needs an index.
- **Con — reverses the direction in the 2026-09-21 meeting notes.**
  Those notes deferred to INS as the attention surface and had the
  set-frontend dashboards being retired. This proposal keeps (or
  reinstates) them.
- **Con — navigation cost.** One extra click from the parent
  dashboard into the set-specific dashboard. Deep links from
  external systems (emails, other services) get slightly more
  complex — they either point at the set dashboard directly or
  bounce through INS.
- **Con — cross-set summarising is harder.** Anything that wants a
  unified "here is everything you need to look at" view needs to
  either federate or duplicate the per-set attention logic.

Open questions this framing surfaces:

- **What sits on the parent dashboard?** A count per notification
  type? A list with reference numbers and status but no per-answer
  attention detail? A federated attention count ("2 need attention")
  that requires each set to publish just that summary?
- **What events does INS still consume?** Likely "notification
  created / status changed" for the index, not the per-notification
  answer detail the auto-detect target requires.
- **Do the set backends still emit at the same fidelity?** If INS
  no longer needs the detail, other consumers might, so the payload
  shape is a separate question from the INS surface shape.
- **Where does the address-book upstream stale-state show up?**
  Per set (each set frontend can query address-book live for its
  own parties), same as it would under the target architecture.
- **How is the INS index kept fresh?** Same event backbone, thinner
  payload; or a scheduled pull.

Status: not yet agreed. Named as the preferred CTA shape in the
"Current recommendation" section below — needs a team discussion
because it reverses the 2026-09-21 meeting direction on retiring
the set-frontend dashboards.

## Current recommendation — ship what we have, defer the pipeline

The full precompute + emit pipeline (target architecture, above) is
substantial infrastructure — six discrete pieces (detection in
ref-data-service, event contract, set backend sweep, set frontend
attention compute, INS backend ingest, INS CTA render), each with
its own failure modes and evolution cost. It also bets against
unknowns: MDM's change cadence, whether comms arrive, whether the
trader population is large enough that the "re-open the record and
see the banner" path is provably insufficient. None of those
conditions are validated.

Recommended position:

1. **Frontend hardening (shipped).** Six pages on animals, two on
   plants, GET-only. Covers the trader who re-opens the record —
   the largest slice of the actual risk — with per-page logic
   living where the concern arises.
2. **Reject-on-submit (captured as a requirement above).** Closes
   the boundary for the trader who never re-opens the affected
   page. Each page's POST already runs the current-rule
   membership check; extend it to guard submit.
3. **Support-activity path (captured).** When MDM does change and
   comms arrive, a per-change migration script sweeps affected
   notifications. Volume bounded by change frequency, which is
   likely low. Uses the migration mechanism from "Version pinning
   + migration" below.
4. **Canary (captured, under support-activity).** Snapshot-and-diff
   loop on the small-list readers (countries, ports) to alarm on
   silent MDM changes. Bounded work; not a full detection
   pipeline.

Deferred: the full auto-detect target — precompute + emit + INS
ingest + INS render. It is captured in the target-architecture
section as the shape that would apply under conditions we have not
validated (silent frequent MDM changes; regulatory obligation to
proactively notify traders; population scale where the re-open path
is provably insufficient). Revisit if evidence for any of those
emerges.

If the CTA becomes a hard requirement, the recommended
implementation is the **parent-dashboard pattern** above rather
than the pipeline. Reasons:

- The set frontend already has the model, the ref-data readers,
  the address-book resolver and the copy in scope. Computing "does
  this notification need attention" is a local operation, not a
  cross-service one.
- All the APIs needed to validate a notification are in hand —
  the same code the current-model engine uses to render the hub,
  origin, CYA and every other page.
- The event pipeline shrinks. INS only needs "trader X has N
  notifications of type Y" for the index — no per-notification
  attention state to serialise across the boundary.
- Per-set CTAs stay authored where the concern arises. No shared
  payload contract for attention across sets; no coordinated
  deploys when one set adds a new concern.

Trade-offs to accept if we go this route: navigation cost (extra
click from INS to the set dashboard), cross-set summarising
becomes convention rather than a shared model, and it reverses
the 2026-09-21 meeting direction on retiring set-frontend
dashboards. That reversal is the discussion the parent-dashboard
section above still owes.

## Version pinning + migration — policy and mechanism

Two further options for handling obligation-model change, distinct in
kind from the trigger sources above. They combine rather than compete:
policy first, then mechanism for the cases the policy leaves in scope.

### Version pinning / grandfathering — policy

Support multiple obligation-model versions live simultaneously. A
notification submitted under model v1 keeps its v1 rules even after
v2 is released; only new submissions run against v2. Older records
never "need attention" for a v2 change.

Architectural implications:

- The animals frontend today runs a singleton manifest
  (`sets/live-animals/obligations/manifest.js`,
  `configureObligationSet`). Multi-version means loading and routing
  between versions per request. Cheap when versions differ by an
  obligation or two; harder when the schema shape moves.
- Persist a model-version stamp on the notification at submit.
- Maintain a version registry the frontend loads at boot (or on
  demand).
- Resolution: `runningModelFor(notification) → manifest_vN`.
- Retirement policy: N months since a version was current, below M
  live submissions, or never. Left unbounded, live-version count
  grows indefinitely.

Not every change is safe to grandfather — the "retroactive or not"
call is a business/product decision per release, not ours in
isolation. Rough split to expect:

- **Additive-only** (new optional obligation, new commodity value) —
  usually safe to grandfather.
- **Compliance tightening / bug fix** — retroactive by law, usually.
- **Removed obligation / reshaped `applyTo`** — case by case.

Scope: the policy fits the obligation model cleanly. Extending it to
other trigger sources is uneven:

- **Ref data** — grandfathering means snapshotting MDM per
  notification (storage cost per record) or maintaining a versioned
  MDM cache in the ref-data-service (viable but non-trivial).
- **Address book** — grandfathering does not apply; a deleted party
  is genuinely gone.

### Migration job on release — mechanism

For changes the policy above deems retroactive, run a migration once
per version bump. The job iterates SUBMITTED notifications, evaluates
each fulfilments payload against the new manifest, and stamps flags
on the record. Idempotent — a re-run lands on the same terminal
state.

Additions to the notification record:

- `appliedModelVersion` — the version this record's rules are
  evaluated against. Set at submit; bumped by the migration for
  retroactive changes.
- `needsAttentionFlags: [{ obligationId, reason, helperText }]` — per-
  obligation reasons the CTA can quote.
- Optional: `attentionComputedFor` — which model version the compute
  ran against, for staleness detection if a later change lands
  before the previous migration finishes.

Trigger options:

- Manifest-deploy CI hook — spawn the job after the frontend deploy
  succeeds.
- Manual invocation — team runs it as part of release ops (safer
  for the first releases).
- Continuous background heartbeat — belt-and-braces, catches missed
  triggers.

The migration mechanism is trigger-agnostic — the same sweep with
the same output shape can run against ref-data change events (from
the ref-data-service, per the earlier section) or address-book
change events, filtered to affected notifications by the event
payload.

### Layering — per-release decision

Per model change:

- Product marks it as **retroactive** or **grandfathered**.
- Grandfathered → notification keeps its `appliedModelVersion`;
  nothing migrates; INS shows no flag.
- Retroactive → the migration job bumps `appliedModelVersion` on
  affected notifications and stamps per-obligation flags; INS reads
  them.

Fit with the earlier trigger split:

- **Obligation model** — version pinning + migration together.
- **Ref-data** — migration only (version pinning only realistic if
  MDM is snapshottable).
- **Address book** — migration only (version pinning does not
  apply).

Open questions this layering surfaces:

- **Where does the "retroactive or grandfathered" decision live?** On
  the manifest change itself (a boolean per version bump), in release
  notes, or in a separate policy record read by the migration job?
- **What does "helper text" look like?** Freeform prose per flag,
  keyed to obligation id, versioned with the change that introduced
  it — inline in the flags array, or in a separate copy bundle keyed
  by change id?
- **When is the migration authoritative?** If a notification is
  amended after the migration stamps a flag, does the amend's own
  engine pass clear the flag automatically, or does it need an
  explicit re-sweep on save?
- **What triggers `appliedModelVersion` to advance without a
  migration?** A trader who submits an amend under v2 has presumably
  opted-in to v2; the record's applied version should probably
  advance at that point regardless of policy.

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
