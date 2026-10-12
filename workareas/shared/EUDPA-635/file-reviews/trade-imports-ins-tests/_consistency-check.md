# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-635
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests
**PR:** #19 | **Commit:** 2456cc8

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Branch name `feat/EUDPA-635-accessible-autocomplete` (CLAUDE.md rule 2, cross-repo parity) | trade-imports-animals-frontend ✅ | ✅ Same name | CONSISTENT |
| `.selectOption()` on the three converted fields replaced with click + fill + pick option (AC14) | trade-imports-animals-frontend ✅ | ✅ All 8 call sites across 3 specs moved to `selectTransitPortOfExitByIndex` / `selectTransitDestinationCountry` / `selectTemporaryAdmissionPortOfExitByIndex`; no remaining `.selectOption` on these fields | CONSISTENT |
| JS / no-JS dual path (probe `tagName === 'SELECT'`) | trade-imports-animals-frontend ✅ (`chooseAutocompleteByLabel`) | ✅ `chooseEnhancedSelect`, same shape as `origin-of-import-page.ts:40-53` and `transited-countries-page.ts` | CONSISTENT |
| Enhanced-select id contract (`#<id>` input, `select#<id>-select` hidden) | trade-imports-animals-frontend ✅ | ✅ `hiddenSelect()` | CONSISTENT |
| `DIVIDER_OPTION` removed — real options now start at index 1, not 2 | trade-imports-animals-frontend ✅ (`slice(2)` → `slice(1)` in two tests) | ❌ Still `{ index: 2 }` at 5 call sites | INCONSISTENT |
| AC15 search-icon reskin — visual baselines | trade-imports-animals-frontend ✅ (SCSS + FIT paint-stack test) | ⚠️ `origin-of-import-animals-linux.png` regenerated; `origin-of-import-animals-darwin.png` untouched | INCONSISTENT |
| Type-ahead behaviour tests (AC6–AC13) | trade-imports-animals-frontend ✅ FIT | ❌ none | CONSISTENT (expected — FIT owns page behaviour) |
| Dependency bumps / config / env vars / feature flags | none | none | CONSISTENT (none introduced) |

## Missing Changes

1. **Stale `index: 2` after the divider was dropped (suspicious, low).**
   Before the frontend PR the option list was `[placeholder, divider (disabled),
   first real option, …]`, so `{ index: 2 }` meant "the first real port". The
   frontend removes `DIVIDER_OPTION` from `portItems()`
   (`import-reason/controller.js`) and re-bases its own tests from `slice(2)` to
   `slice(1)`. This repo keeps `2`, which now silently means "the second port":
   - `tests/animals/a11y/notification-journey-conditional-pages.spec.ts:32, 45`
   - `tests/animals/e2e/features/reason-purpose-scope.spec.ts:30`
   - `tests/animals/security/frontend-conditional-pages.spec.ts:26, 36`

   The tests still pass (any valid port satisfies them), so this is drift, not a
   failure — but the magic number now encodes a layout that no longer exists, and
   the paired frontend change shows the intended re-base. Use `1`, or better,
   select by code as `selectTransitDestinationCountry('FR')` already does
   (the frontend FIT uses `GB DVR`). Note the hidden-path lookup
   `hidden.locator('option').nth(choice.index)` in `import-reason-page.ts`
   inherits the same assumption about the placeholder at index 0.

2. **macOS visual baseline not regenerated (suspicious, medium).**
   The AC15 reskin changes every `.autocomplete__wrapper`, and the PR updates
   `tests/animals/e2e/visual/origin-of-import.visual.spec.ts-snapshots/origin-of-import-animals-linux.png`
   only. `origin-of-import-animals-darwin.png` sits beside it and is unchanged.
   This repo's own README (line 289) says: "Each platform requires its own
   baseline — update both when visual changes are intentional"
   (`npm run test:visual:update:macos`). CI (linux) will be green; anyone running
   the visual spec on a Mac host will get a diff on the arrow-vs-magnifying-glass
   region.

## Unique Changes

1. **Old locator getters left behind (note).** `transitPortOfExit`,
   `transitDestinationCountry` and `temporaryAdmissionPortOfExit` getters
   (`page-objects/animals/import-reason-page.ts:30-44`) have no remaining callers
   after this PR — every spec now goes through the new `select…` methods. With
   JavaScript on they resolve to the combobox `<input>`, not a `<select>`, so a
   future `.selectOption()` on them would fail. The origin page object keeps its
   equivalent getter but documents the dual meaning in a comment
   (`origin-of-import-page.ts:21-28`); these three carry no such note. Remove
   them or add the same comment.

2. **Third private copy of the enhanced-select helper (note).** The same
   probe-then-fill routine now exists in `origin-of-import-page.ts`,
   `transited-countries-page.ts`, `import-reason-page.ts` and three plants page
   objects. Consistent in behaviour, intentional per page object so far; a shared
   helper on the base page would stop the copies drifting. Not introduced by this
   ticket alone.

3. **No coverage for `transhipmentDestinationCountry` (note, cross-repo).** The
   frontend leaves that field as a plain `govukSelect` while removing the divider
   from the list it shares. Nothing in this repo drives the transhipment reveal,
   so neither the mixed control types nor the divider loss on that field is
   exercised end to end. Raised against the frontend repo; no change needed here
   unless the frontend converts the field.

4. **No E2E for the temporary-admission type-ahead paths (expected).** The a11y
   and security specs drive `temporaryAdmissionPortOfExit` through the enhanced
   path, which is the only end-to-end evidence for that field; whole-list,
   filter and no-results (AC6, AC8, AC12) for it are untested in both repos. The
   gap belongs to the frontend FIT suite.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 2 inconsistencies found
**Summary:** The page object and all eight call sites follow the frontend's new control and the house enhanced-select pattern, but the port picks still use an index that assumed the removed divider row, and only the linux half of the origin visual baseline was regenerated.
