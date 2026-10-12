# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-635
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests
**PR:** #395 | **Commit:** ffa1146

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Branch name `feat/EUDPA-635-accessible-autocomplete` (CLAUDE.md rule 2, cross-repo parity) | trade-imports-ins-tests ✅ | ✅ Same name | CONSISTENT |
| `.selectOption()` on `transitPortOfExit` / `transitDestinationCountry` / `temporaryAdmissionPortOfExit` replaced with click + fill + pick option (AC14) | trade-imports-ins-tests ✅ (page object `chooseEnhancedSelect`) | ✅ `import-reason.fit.spec.js`, `check-answers.fit.spec.js`, `fit/live-animals-journey.js` | CONSISTENT |
| JS / no-JS dual path (probe `tagName === 'SELECT'`, fall back to `selectOption`) | trade-imports-ins-tests ✅ (`import-reason-page.ts`) | ✅ `chooseAutocompleteByLabel` in `fit/live-animals-journey.js`; dedicated `javaScriptEnabled: false` describe in `import-reason.fit.spec.js` | CONSISTENT |
| Enhanced-select id contract (`#<id>` = combobox input, `select#<id>-select` = hidden code carrier) | trade-imports-ins-tests ✅ (`hiddenSelect()`) | ✅ `transitPortHidden` etc. in `import-reason.fit.spec.js` | CONSISTENT |
| `DIVIDER_OPTION` row removed from `portItems()` / `countryItems()` — option indices shift by one | trade-imports-ins-tests ❌ still picks `{ index: 2 }` | ✅ Removed; own tests re-based (`slice(2)` → `slice(1)` in `copy.test.js` and `import-reason.fit.spec.js`) | INCONSISTENT (gap is in the tests repo — see that repo's check) |
| AC15 search-icon reskin of the shared component (affects origin, arrival details, transited countries, import reason) | trade-imports-ins-tests ⚠️ linux visual baseline regenerated, darwin baseline not | ✅ `accessible-autocomplete.scss` + `origin.fit.spec.js` paint-stack test | INCONSISTENT (gap is in the tests repo) |
| Type-ahead behaviour tests (whole list on focus, filter, no-results copy — AC6–AC13) | trade-imports-ins-tests ❌ none (only drives the fields to get past the page) | ✅ `import-reason port and country type-ahead` describe | CONSISTENT (expected — FIT owns page behaviour, E2E owns the walk) |
| Behaviour Spec (`openspec/specs/live-animals/journey-pages/import-reason/spec.md` in the workspace repo) | n/a — workspace repo is not in `.review-meta.json` and has no `*EUDPA-635*` branch | New FIT tests added with no matching requirement | INCONSISTENT (out-of-scope repo; see Missing Changes) |
| Dependency bumps / config / env vars / feature flags | none in either repo | none | CONSISTENT (none introduced) |

## Missing Changes

1. **Behaviour Spec not synced (workspace `openspec/`, low–medium).** The ticket's
   tech notes point at REQ-ORIGIN-002 to REQ-ORIGIN-006 as the agreed search
   behaviour. `openspec/specs/live-animals/journey-pages/import-reason/spec.md`
   contains no requirement for search, type-ahead, the "No ports found" /
   "No countries found" messages or the no-JS fallback (grep for
   `search|type-ahead|autocomplete|No ports|select` returns nothing), and
   `openspec/coverage/live-animals/journey-pages/import-reason/coverage.json` has
   no entry for the six new tests in the `import-reason port and country
   type-ahead` describe or the `without JavaScript` describe. There is no
   `EUDPA-635` branch in the workspace repo. The `frontend-change` recipe expects
   the spec and coverage entries to follow the increment; the origin page has
   them, import-reason does not. Existing coverage links still resolve — the test
   titles they cite (`asks transit for the port of exit and then the destination
   country`, `refuses an unanswered reveal, links to the field and keeps the
   reveal open`, etc.) are unchanged.

2. **Nothing owed to this repo from the tests repo.** Every change in
   trade-imports-ins-tests#19 is a consumer-side adaptation of what this PR
   introduces.

## Unique Changes

1. **`transhipmentDestinationCountry` loses its divider but stays a plain select
   (suspicious, low).** `countryItems()` in
   `import-reason/controller.js` feeds two fields; this PR converts one of them
   (`transitDestinationCountry`) but `template.njk:34-41` still renders `transhipmentDestinationCountry` with
   `govukSelect` and `items: countryItems`. That field is now a scroll-only
   list without the divider rule, which is exactly the case the new controller
   comment says needs one ("a scroll-only list needed a divider rule under the
   placeholder, a searchable one does not"), and the comment's claim that "the
   lists feed type-aheads that enhance these selects" is not true for it. The
   ticket names only three fields, so leaving it as a select is in scope — but
   the page now mixes a searchable and a non-searchable "Destination country"
   under the same label, and neither repo's tests notice (the tests repo never
   drives `transhipmentDestinationCountry`). Either convert it too or record the
   decision.

2. **AC15 is asserted on one field only (intentional, note).** The SCSS change
   is global to `.autocomplete__wrapper`, so port of entry, transited countries
   and the three import-reason fields are reskinned too. Only
   `origin.fit.spec.js` asserts the icon, and the tests repo holds a visual
   baseline for origin only. Acceptable for a shared stylesheet, but the other
   four fields named in AC15 have no direct evidence in either repo.

3. **Four near-identical "choose from autocomplete" helpers (note).**
   `chooseAutocompleteByLabel` (new, shared, JS/no-JS aware) sits beside
   `chooseTransitPort`, `chooseTransitCountry` and
   `chooseTemporaryAdmissionPort` in `import-reason.fit.spec.js`, which repeat
   the same three steps without the no-JS branch. The tests repo solved the same
   problem with one private `chooseEnhancedSelect`. Not a defect; the shared
   helper could serve all three.

4. **Temporary-admission port has no type-ahead behaviour test (note).** The new
   describe checks whole-list / filter / no-results on the transit port and
   transit country only, and the no-JS test covers the two transit fields only.
   `temporaryAdmissionPortOfExit` is covered for select-and-persist. AC6, AC8,
   AC12 and AC13 name "transit or temporary admission"; the tests repo does not
   make up the difference.

5. **`scripts/lighthouse/seed-notification.js` comment-only change — consistent.**
   `firstListedOption` selects `option[value]:not([value=""])`; the divider had
   `value: ''`, so the seeded value is unchanged by its removal. No behavioural
   drift against the tests repo's seeding.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 2 inconsistencies found (Behaviour Spec/coverage not synced in the workspace repo; `transhipmentDestinationCountry` left as a divider-less plain select sharing `countryItems`) — plus 2 cross-repo gaps that land in trade-imports-ins-tests (index drift, darwin baseline)
**Summary:** Branch names, the enhanced-select id contract and the JS/no-JS test pattern line up with the tests repo; the gaps are the un-synced import-reason Behaviour Spec and one sibling field that shares the changed list builder but was not converted.
