# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-616
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #96 | **Commit:** ac17fd0

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Chip label and Remove name use the Latin name alone | animals-frontend ✅ (`selected-summary.js`, `_results.njk`), workspace ✅ (REQ-008) | ✅ `speciesEntry`, `removeButtonFor` use `species.latinName`; `animal-identification.spec.ts` and `commodities.spec.ts` switched from `toContainText(speciesLabel(...))` | CONSISTENT |
| Group heading "Name (code)" or code alone | animals-frontend ✅ (`namedLegendFor`), workspace ✅ (SCN-004-D) | ✅ `commodityHeading(code)` regex `^(.+ \()?code\)?$` used by `commodityGroup`, `commodityGroups` and the ordering test | CONSISTENT |
| Results container `#commodity-search-results` | animals-frontend ✅ (`search.njk` `resultsId`) | ✅ `noResults` locator | CONSISTENT |
| Group order by code | workspace ✅ (REQ-015 body), animals-frontend ✅ (sorts by code) | ✅ test sorts `left.code.localeCompare(right.code)` | CONSISTENT in behaviour; title stale (below) |
| Coverage-linked e2e titles (`refuses the save with "Select a commodity"…`, `a saved unweaned-animals answer is cleared…`) | workspace coverage.json SCN-017-G/H | ✅ both titles exist (`commodities.spec.ts:160`, `additional-details-scope.spec.ts:30`) | CONSISTENT |

## Missing Changes

*None identified.* Every locator change follows a markup change in animals-frontend PR #474. The no-results locator is now scoped to `#commodity-search-results`, so it no longer also matches the hidden `role="status"` live region carrying the same "No results found" text. That is a needed change, not a missing one.

## Unique Changes

- `tests/animals/e2e/pages/commodities.spec.ts:~157` — adds `await expect(...errorSummaryLinks).toBeVisible()` after Save and return in the `beforeEach`, waiting for the save that follows Clear all to land. This matches the race fixed in the frontend (SCN-017-G) and is intentional.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|

*None identified.* `commodityHeading` (ins-tests) and the frontend fit helper `tickSpecies` (substring `getByRole('group', { name: commodityCode })`) find a group in two different ways, but they live in separate suites in separate repos, and both accept the new heading.

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `tests/animals/e2e/pages/commodities.spec.ts:43` | test title "lists reference-data's groups by commodity heading and each group's species by label, in that order" | The test (and the spec, REQ-015) orders groups by commodity code; the heading now reads "Name (code)", so "by commodity heading" no longer describes the order | States the new behaviour | "…groups by commodity code and each group's species by label…". The title is linked from workspace `coverage.json` 5 times (lines 50, 68, 101, 111, 455), so rename both in step. |
| `docs/animals-journey.md:66-68` | "ticks it inside the group for the species' own commodity code" | Still true, but the group is now named "Name (code)" and `commodityGroup` matches it by the `commodityHeading` regex. Advisory only | — | Optionally add one line that `commodityHeading` accepts the heading with or without a name, because the stub knows names for only some codes. |

*Searched: `speciesLabel`, `selectedSummary`, `Remove ${`, `getByRole('group'`, `toHaveAccessibleName(code`, `No results found`, `commodity heading`, `heading order`, across `tests/`, `page-objects/`, `docs/`, README/CLAUDE/AGENTS.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 (stale test title, linked from coverage) plus 1 advisory doc line
**Summary:** The locators line up with the frontend's new markup and the workspace spec. The ordering test's title still says "by commodity heading" while it, and the spec, now order by code.
