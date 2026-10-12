# Repository Review: trade-imports-animals-frontend

**PR:** #395
**Commit:** ffa1146c619bd11ad42a9ec77b2c8024a9034547
**Files Changed:** 11

## Summary
Converts the three remaining plain selects on the "Main reason for import" page (`transitPortOfExit`, `transitDestinationCountry`, `temporaryAdmissionPortOfExit`) to the shared `appAccessibleAutocomplete` component, drops `DIVIDER_OPTION` from the import-reason item builders, adds the "No ports found" / "No countries found" copy in English and Welsh, and reskins the component's indicator from a dropdown arrow to a magnifying-glass icon. The production change is small and matches the ticket; the open points are one unconverted select that shares the changed list, and tests that do not prove everything the acceptance criteria name.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `fit/live-animals-journey.js` | SAFE | 0 | 0 | 2 |
| `scripts/lighthouse/seed-notification.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/check-answers.fit.spec.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/import-reason/controller.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.cy.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.en.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.test.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/import-reason/import-reason.fit.spec.js` | NEEDS ATTENTION | 0 | 3 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/import-reason/template.njk` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/origin/origin.fit.spec.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/common/components/accessible-autocomplete/accessible-autocomplete.scss` | SAFE | 0 | 0 | 2 |

## Positive Observations
- The three fields the ticket names are converted with the same parameters as the existing origin and port-of-entry call sites, so the page follows the established pattern.
- `DIVIDER_OPTION` is removed from both `countryItems()` and `portItems()` as the tech notes ask, and no references remain under `src`.
- Copy matches AC8 and AC11 exactly, has Welsh parity, and reuses the wording already used on the origin and transport pages.
- The macro still renders a native select, so the no-JS fallback holds; a no-JS fit test covers the transit fields.
- The fit specs move from `.selectOption()` to `.fill()` against the visible input with code assertions on `select#<id>-select`, as AC14 asks.
- The icon uses the prototype's viewBox, is `pointer-events: none` behind the input, and the existing CSP already allows `data:` images.

## Test Coverage
- Unit tests: Partial. `copy.test.js` pins the port list without the divider but not the country list (item 4).
- Integration tests (fit): Partial. Transit fields are covered for whole list, filtering, no results and no-JS. Gaps: the country filter test cannot fail (item 5); the temporary admission port has no whole-list, no-results or no-JS case (item 6); "change the selection" and "change or clear the search term" are untested (item 7); the AC15 icon test does not prove the icon is painted or stacked behind the input (item 9).

## Consistency
From `file-reviews/trade-imports-animals-frontend/_consistency-check.md`:
- `transhipmentDestinationCountry` stays a plain `govukSelect` fed by the same `countryItems()`, so it loses its divider and the new controller comment is untrue for it (items 3 and 8 — the same issue seen from the controller and the template; one decision settles both).
- The Behaviour Spec is not synced: `openspec/specs/live-animals/journey-pages/import-reason/spec.md` has no requirement for search, the no-results messages or the no-JS fallback, and its `coverage.json` has no entries for the new tests. The workspace repo has no EUDPA-635 branch and is not in this PR set, so there is no item for it here.
- `import-reason.fit.spec.js` adds three local choose-helpers that duplicate the new shared `chooseAutocompleteByLabel`.
- AC15 is asserted on the origin field only, though the SCSS change reskins every field using the component.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** The production change is a like-for-like swap onto a component already live on three pages; the risk is in unproven test claims and one scope decision, not in a known defect.

## Repository Verdict
**Status:** NEEDS ATTENTION

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | fit/live-animals-journey.js | 206 | Minor | flakiness | chooseAutocompleteByLabel probes el.tagName without the waitForLoadState('domcontentloaded') that chooseCountryOfOrigin and addTransitCountry in this file use and document; called mid-load, the probe can read the not-yet-enhanced SELECT and then selectOption runs against the enhanced input. Today's three callers in check-answers.fit.spec.js are safe only because they follow an awaited page.goto. | Add await page.waitForLoadState('domcontentloaded') before resolving the field, as the two sibling helpers do, so the exported helper is safe for any caller. |  |  |  |
| 2 | fit/live-animals-journey.js | 203 | Minor | test-design | chooseAutocompleteByLabel ignores label whenever inputId is passed, and all three callers pass both, so the getByLabel branch the name and comment describe is never exercised and every real use resolves the field by a raw #id selector instead of a semantic locator. | Scope the label lookup to the reveal instead of switching to an id (e.g. accept an optional scope locator and call scope.getByLabel(label, { exact: true })), or drop the unused label from id-addressed calls and rename the helper so the signature matches what it does. |  |  |  |
| 3 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/controller.js | 41 | Major | correctness | countryItems() drops DIVIDER_OPTION for every consumer, but template.njk line 34-41 still renders transhipmentDestinationCountry as a plain scroll-only govukSelect from the same countryItems - so that unconverted select silently loses its divider row, and the new comment ('The lists feed type-aheads that enhance these selects') is untrue for it; the ticket's own rationale is that a scroll-only list needs the divider. | Either convert transhipmentDestinationCountry to appAccessibleAutocomplete too (matches the story's 'wherever the journey asks for a country', add a fit test), or keep a divider-bearing list for that one select; then make the comment match what the lists actually feed. |  |  |  |
| 4 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.test.js | 134 | Major | test-coverage | The PR drops DIVIDER_OPTION from both countryItems() and portItems() in controller.js, but only the port list is pinned (portItems.slice(1) toEqual ports.list()); countryItems is asserted at index 0 only, so reinstating the divider row in the destination-country list would pass every test in the feature. | Add the sibling assertion: expect(result.view.context.countryItems.slice(1)).toEqual(await countries.originCountries()), importing services/countries/index.js. |  |  |  |
| 5 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/import-reason.fit.spec.js | 476 | Major | test-quality | 'filters countries as the user types' (AC9) only asserts the Ireland option is visible after fill('ire'); the whole-list test at line 464 shows that is already true with no filtering, so this test still passes if filtering is broken (the port twin at line 447 does assert toHaveCount(1)). | Assert the narrowed list as the port test and origin.fit.spec.js do: expect page.getByRole('option') toHaveCount of the fixture countries whose name contains 'ire' (or a unique query with toHaveCount(1)), or assert a non-matching country option has count 0. |  |  |  |
| 6 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/import-reason.fit.spec.js | 430 | Major | test-coverage | AC8, AC12 and AC13 name the temporary admission (horses) port of exit, but the type-ahead describe (beforeEach checks only 'transit') and the no-JS test (line 495) drive only the transit fields; temporaryAdmissionPortOfExit has its own template config (showAllValues, noResults) and is only ever exercised by fill-and-pick, so a missing 'No ports found' message, whole-list-on-focus or no-JS submit on that field would go unnoticed. | Add temporaryAdmissionHorses cases for whole list on focus and copy.port.noResults against temporaryAdmissionPortInput, and extend the no-JS test (or add one) to selectOption on select#temporaryAdmissionPortOfExit and assert the code persists. |  |  |  |
| 7 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/import-reason.fit.spec.js | 330 | Major | test-coverage | AC7 and AC10 'I should be able to change the selection' (and AC8/AC11 'change or clear the search term') have no test: every case picks one option once, so the wrapper's onConfirm path that clears the select then re-selects (accessible-autocomplete.js onConfirmFor) is never exercised with a second choice or a cleared input on these three fields. | Add a case that picks a port (and a country), then picks a different one and asserts both the visible input label and the hidden -select code now hold the second choice; and one that types a no-match term, replaces it with a matching term and asserts the option is offered again. |  |  |  |
| 8 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/template.njk | 34 | Major | consistency | transhipmentDestinationCountry is left as a plain govukSelect while transitDestinationCountry, the same 'Destination country' question fed by the same countryItems on the same page, becomes appAccessibleAutocomplete; this PR's controller change also drops DIVIDER_OPTION from the shared countryItems() on the grounds that the lists 'feed type-aheads', so the one remaining scroll-only select loses its divider and the controller comment is untrue for it. The ticket names only three fields, so this may be a deliberate scope limit, but the user story says 'wherever the journey asks for a country or a port'. | Convert transhipmentDestinationCountry to appAccessibleAutocomplete with autocomplete: { showAllValues: true, noResults: copy.country.noResults } (then drop the unused govukSelect import and update the transhipment fit test to the input/-select pair), or confirm with the ticket owner that it is out of scope and correct the controller comment. |  |  |  |
| 9 | src/server/app/sets/live-animals/journeys/linear/features/origin/origin.fit.spec.js | 444 | Major | test-quality | AC15 test 'paints the search icon behind the interactive input' does not prove an icon is painted or that it is behind the input: searchIconPainted only checks the wrapper ::after content is not 'none' (passes with the background image removed), and inputIsTopHit cannot fail because elementsFromPoint never returns a pseudo-element and the ::after is pointer-events:none, so it passes whatever the ::after z-index is. The old test proved the stacking with the real arrow element in the hit stack; that proof was lost in the rewrite. | Assert the ::after computed styles that carry the behaviour: backgroundImage contains 'data:image/svg+xml' (the magnifying glass), zIndex is '-1' and pointerEvents is 'none', alongside the existing arrowHidden/wrapperZIndex checks; rename or drop inputIsTopHit if it is kept only as a click-through check. |  |  |  |
| 10 | src/server/common/components/accessible-autocomplete/accessible-autocomplete.scss | 27 | Minor | robustness | Search icon ::after is painted on every .autocomplete__wrapper, but the 35px right padding that keeps text clear of it comes only from upstream .autocomplete__input--show-all-values; the macro still supports showAllValues false, where the input has 5px padding and typed text runs underneath the icon (the upstream arrow was only rendered when showAllValues was on). | Set padding-right: 35px on .autocomplete__input in this file so the clearance travels with the icon, or scope the ::after to wrappers containing .autocomplete__input--show-all-values via :has(). |  |  |  |
| 11 | src/server/common/components/accessible-autocomplete/accessible-autocomplete.scss | 17 | Minor | gds-styles | Icon stroke colour is hard-coded twice as the hex %230b0c0c inside the data URI rather than derived from the GOV.UK Sass palette, so it will not follow a govuk-frontend palette change. | Build the data URI from the palette, e.g. interpolate the text colour (string.slice of the govuk text colour value, prefixed with %23) into the stroke attributes instead of the literal hex. |  |  |  |
