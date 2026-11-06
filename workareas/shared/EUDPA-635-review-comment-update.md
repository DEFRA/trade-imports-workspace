# Code review handoff — EUDPA-635

**Verdict:** CONCERNS → **addressed** (awaiting re-review)
**Reviewer:** @amieljemei
**Handoff branch:** `chore/EUDPA-635` (workspace repo)

**Implementation update (2026-10-12):** All items below fixed on `feat/EUDPA-635-accessible-autocomplete` in commit [`ec443f27`](https://github.com/DEFRA/trade-imports-animals-frontend/commit/ec443f27).

## Repository: `trade-imports-animals-frontend`

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | fit/live-animals-journey.js | 206 | Minor | flakiness | chooseAutocompleteByLabel probes el.tagName without the waitForLoadState('domcontentloaded') that chooseCountryOfOrigin and addTransitCountry in this file use and document; called mid-load, the probe can read the not-yet-enhanced SELECT and then selectOption runs against the enhanced input. Today's three callers in check-answers.fit.spec.js are safe only because they follow an awaited page.goto. | Add await page.waitForLoadState('domcontentloaded') before resolving the field, as the two sibling helpers do, so the exported helper is safe for any caller. | Fix | Done | ec443f27 |
| 2 | fit/live-animals-journey.js | 203 | Minor | test-design | chooseAutocompleteByLabel ignores label whenever inputId is passed, and all three callers pass both, so the getByLabel branch the name and comment describe is never exercised and every real use resolves the field by a raw #id selector instead of a semantic locator. | Scope the label lookup to the reveal instead of switching to an id (e.g. accept an optional scope locator and call scope.getByLabel(label, { exact: true })), or drop the unused label from id-addressed calls and rename the helper so the signature matches what it does. | Fix | Done | ec443f27 — `getByLabel` within form group scoped by `inputId` |
| 3 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/controller.js | 41 | Major | correctness | countryItems() drops DIVIDER_OPTION for every consumer, but template.njk line 34-41 still renders transhipmentDestinationCountry as a plain scroll-only govukSelect from the same countryItems - so that unconverted select silently loses its divider row, and the new comment ('The lists feed type-aheads that enhance these selects') is untrue for it; the ticket's own rationale is that a scroll-only list needs the divider. | Either convert transhipmentDestinationCountry to appAccessibleAutocomplete too (matches the story's 'wherever the journey asks for a country', add a fit test), or keep a divider-bearing list for that one select; then make the comment match what the lists actually feed. | Fix | Done | ec443f27 — transhipment field converted in template.njk |
| 4 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.test.js | 134 | Major | test-coverage | The PR drops DIVIDER_OPTION from both countryItems() and portItems() in controller.js, but only the port list is pinned (portItems.slice(1) toEqual ports.list()); countryItems is asserted at index 0 only, so reinstating the divider row in the destination-country list would pass every test in the feature. | Add the sibling assertion: expect(result.view.context.countryItems.slice(1)).toEqual(await countries.originCountries()), importing services/countries/index.js. | Fix | Done | ec443f27 |
| 5 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/import-reason.fit.spec.js | 476 | Major | test-quality | 'filters countries as the user types' (AC9) only asserts the Ireland option is visible after fill('ire'); the whole-list test at line 464 shows that is already true with no filtering, so this test still passes if filtering is broken (the port twin at line 447 does assert toHaveCount(1)). | Assert the narrowed list as the port test and origin.fit.spec.js do: expect page.getByRole('option') toHaveCount of the fixture countries whose name contains 'ire' (or a unique query with toHaveCount(1)), or assert a non-matching country option has count 0. | Fix | Done | ec443f27 — `toHaveCount(irelandMatches.length)` |
| 6 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/import-reason.fit.spec.js | 430 | Major | test-coverage | AC8, AC12 and AC13 name the temporary admission (horses) port of exit, but the type-ahead describe (beforeEach checks only 'transit') and the no-JS test (line 495) drive only the transit fields; temporaryAdmissionPortOfExit has its own template config (showAllValues, noResults) and is only ever exercised by fill-and-pick, so a missing 'No ports found' message, whole-list-on-focus or no-JS submit on that field would go unnoticed. | Add temporaryAdmissionHorses cases for whole list on focus and copy.port.noResults against temporaryAdmissionPortInput, and extend the no-JS test (or add one) to selectOption on select#temporaryAdmissionPortOfExit and assert the code persists. | Fix | Done | ec443f27 — new describe + no-JS transhipment/temp-admission |
| 7 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/import-reason.fit.spec.js | 330 | Major | test-coverage | AC7 and AC10 'I should be able to change the selection' (and AC8/AC11 'change or clear the search term') have no test: every case picks one option once, so the wrapper's onConfirm path that clears the select then re-selects (accessible-autocomplete.js onConfirmFor) is never exercised with a second choice or a cleared input on these three fields. | Add a case that picks a port (and a country), then picks a different one and asserts both the visible input label and the hidden -select code now hold the second choice; and one that types a no-match term, replaces it with a matching term and asserts the option is offered again. | Fix | Done | ec443f27 |
| 8 | src/server/app/sets/live-animals/journeys/linear/features/import-reason/template.njk | 34 | Major | consistency | transhipmentDestinationCountry is left as a plain govukSelect while transitDestinationCountry, the same 'Destination country' question fed by the same countryItems on the same page, becomes appAccessibleAutocomplete; this PR's controller change also drops DIVIDER_OPTION from the shared countryItems() on the grounds that the lists 'feed type-aheads', so the one remaining scroll-only select loses its divider and the controller comment is untrue for it. The ticket names only three fields, so this may be a deliberate scope limit, but the user story says 'wherever the journey asks for a country or a port'. | Convert transhipmentDestinationCountry to appAccessibleAutocomplete with autocomplete: { showAllValues: true, noResults: copy.country.noResults } (then drop the unused govukSelect import and update the transhipment fit test to the input/-select pair), or confirm with the ticket owner that it is out of scope and correct the controller comment. | Fix | Done | ec443f27 |
| 9 | src/server/app/sets/live-animals/journeys/linear/features/origin/origin.fit.spec.js | 444 | Major | test-quality | AC15 test 'paints the search icon behind the interactive input' does not prove an icon is painted or that it is behind the input: searchIconPainted only checks the wrapper ::after content is not 'none' (passes with the background image removed), and inputIsTopHit cannot fail because elementsFromPoint never returns a pseudo-element and the ::after is pointer-events:none, so it passes whatever the ::after z-index is. The old test proved the stacking with the real arrow element in the hit stack; that proof was lost in the rewrite. | Assert the ::after computed styles that carry the behaviour: backgroundImage contains 'data:image/svg+xml' (the magnifying glass), zIndex is '-1' and pointerEvents is 'none', alongside the existing arrowHidden/wrapperZIndex checks; rename or drop inputIsTopHit if it is kept only as a click-through check. | Fix | Done | ec443f27 |
| 10 | src/server/common/components/accessible-autocomplete/accessible-autocomplete.scss | 27 | Minor | robustness | Search icon ::after is painted on every .autocomplete__wrapper, but the 35px right padding that keeps text clear of it comes only from upstream .autocomplete__input--show-all-values; the macro still supports showAllValues false, where the input has 5px padding and typed text runs underneath the icon (the upstream arrow was only rendered when showAllValues was on). | Set padding-right: 35px on .autocomplete__input in this file so the clearance travels with the icon, or scope the ::after to wrappers containing .autocomplete__input--show-all-values via :has(). | Fix | Done | ec443f27 |
| 11 | src/server/common/components/accessible-autocomplete/accessible-autocomplete.scss | 17 | Minor | gds-styles | Icon stroke colour is hard-coded twice as the hex %230b0c0c inside the data URI rather than derived from the GOV.UK Sass palette, so it will not follow a govuk-frontend palette change. | Build the data URI from the palette, e.g. interpolate the text colour (string.slice of the govuk text colour value, prefixed with %23) into the stroke attributes instead of the literal hex. | Fix | Done | ec443f27 — `govuk-colour('black')` in data URI (compile-time hex) |

## Action this review

**Option A — walk it in Claude Code (recommended):**

```bash
# Branch-scoped fetch — a bare `fetch origin` would also pull the
# workspace repo's gh-pages (~1 GiB).
git -C ~/git/defra/trade-imports-workspace fetch origin "+refs/heads/chore/EUDPA-635:refs/remotes/origin/chore/EUDPA-635"
git -C ~/git/defra/trade-imports-workspace checkout chore/EUDPA-635
```

Then in a Claude Code session opened at the workspace:

```
walk review EUDPA-635
implement review EUDPA-635
```

The shared `items.{repo}.json` lives on this branch — your dispositions
write back to the same file, so push your commits to `chore/EUDPA-635` to keep
the state in sync. The implementor will offer to clean up the local +
remote branch when it finishes.

**Option B — action manually:** read the items table above and apply
each fix in your PR branch directly. No checkout needed.

---

_Generated by the `review` skill (EUDPA-635). Branch lifecycle is owned
by the implementor — it offers cleanup on completion._

_Updated by Cursor (2026-10-12): dispositions/status/notes for commit ec443f27._
