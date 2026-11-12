# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-616
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #240 | **Commit:** 396e7c3

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| REQ-004 / SCN-004-D: heading reads "Name (code)" | animals-frontend ✅ (`namedLegendFor`, `labels.test.js`), ins-tests ✅ (`commodityHeading`) | ✅ | CONSISTENT |
| REQ-008 / SCN-008-A: chips show Latin name alone; Remove named for it | animals-frontend ✅, ins-tests ✅ | ✅ | CONSISTENT |
| SCN-008-F: no-JS "Update selected" | animals-frontend ✅ (`_results.njk`, copy en/cy, fit test) | ✅ | CONSISTENT |
| REQ-017 A–K: JS refresh in place | animals-frontend ✅ (module, results route, tests) | ✅ | CONSISTENT |
| Coverage links point at test titles that exist | animals-frontend ✅ (every new fit/unit title found verbatim), ins-tests ✅ (`commodities.spec.ts:160`, `additional-details-scope.spec.ts:30`) | ✅ | CONSISTENT |
| REQ-015 group order "by commodity code" | animals-frontend ✅ (behaviour), ins-tests ✅ (behaviour) | ⚠ body changed; requirement title, SCN-015-A and coverage names/notes still say "heading" | INCONSISTENT (below) |

## Missing Changes

*None identified.* The spec and coverage changes cover every behaviour change in animals-frontend PR #474, and every locator change in ins-tests PR #96 has a spec home (REQ-004, REQ-008, REQ-017). `openspec/specs/.../commodity-selection/spec.md` has no `**Maturity**` or `**Signed off**` lines, so `signed-off-pages.md` does not apply.

## Unique Changes

*None identified.* The PR touches only the commodity-selection spec and coverage, both in scope.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|

*None identified.* The spec uses "tally" throughout for the panel, as it did before. The frontend docs use other words for it, which is recorded in the animals-frontend check.

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `openspec/specs/live-animals/journey-pages/commodity-selection/spec.md:308` | Requirement title "Search results are listed in order: commodity heading, then species label" | The body (changed in this PR) says groups are in order of their commodity **code**; the heading now reads "Name (code)", so heading order ≠ code order | States the new behaviour | "…in order: commodity code, then species label" (and the matching `name` in coverage.json:447) |
| `openspec/specs/live-animals/journey-pages/commodity-selection/spec.md:316` (SCN-015-A THEN) | "…and the commodity groups are in heading order" | Groups are in code order | States the new behaviour | "…in commodity-code order" |
| `openspec/coverage/live-animals/journey-pages/commodity-selection/coverage.json:455` (and the same test at 50, 68, 101, 111) | notes "checks the page lists reference-data's groups in commodity-heading order"; linked test title "…groups by commodity heading…" | The ins-tests test sorts by code; the title should change there (see ins-tests check) and these links in step | States the new behaviour | Update the notes to "code order" and the `test` string once ins-tests renames the title |
| `openspec/coverage/.../coverage.json:458` | links `result-order.test.js` "Should return commodity codes given out of order sorted into commodity-heading order" | Code order; frontend title to change (see animals-frontend check) | States the new behaviour | Update the link in step with the frontend rename |

*Searched: `selected panel`, `species' label`, `tally.*label`, `order of their heading`, `commodity heading`, `heading order`, `commodity-heading`, `heading of their commodity code`, across `openspec/specs/**` and the commodity-selection `coverage.json`. No other spec outside commodity-selection states the old chip label or heading.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 4 (all the REQ-015 heading → code wording)
**Summary:** The spec and coverage match both service PRs. REQ-015's body moved to "commodity code" order, but its title, SCN-015-A, and the linked coverage names and notes still say "heading".
