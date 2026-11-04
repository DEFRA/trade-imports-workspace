# Repository Review: trade-imports-animals-frontend

**PR:** #462
**Commit reviewed:** 84f091097ca9039dadfa76fc8bbcd658deb1a975
**Files Changed:** 24

## Summary
Removes the orphaned `transporters/select` page end-to-end: feature folder, route/page registration, EN/CY copy, section caption, and the `party` / `commercialParties` service helpers that only that page used. Call sites (contract, flow, fit, lighthouse seed) now go through the transporter list or the commercial add form. One design-doc bullet still names the removed page.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `scripts/lighthouse/seed-notification.js` | SAFE | 0 | 0 | 0 |
| `scripts/lighthouse/seed-notification.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/contract.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/transporters/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/transporters/transporters.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/docs/page-design.md` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/request-view.parity.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/section-caption.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.cy.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/fit/transporters.fit.spec.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/page.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/transporters-select/transporters-select.controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/transporters-select/transporters-select.controller.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/transporters-select/transporters-select.njk` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/flow/dispatch.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/flow/flow-reachability.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/flow/opening-run.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/flow/run.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/flow/section-captions/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/flow/section-captions/section-captions.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/flow/simulate.test.js` | SAFE | 0 | 0 | 0 |

## Positive Observations
- Deletion is thorough across registration, copy, captions, helpers and tests — no leftover `transportersSelect` wiring.
- Lighthouse commercial seed was re-pointed to the list with a unit test proving the new post.
- Out-of-scope commercial add / private / list pages were left alone.

## Test Coverage
- Unit tests: Present — controller test deleted with the page; service, copy, caption, contract and flow tests updated.
- Integration tests: Present — fit tests that opened the page by address removed; remaining transport fit suite retained.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** Functional removal is complete; the only open item is a stale design-doc phrase.

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/server/app/sets/live-animals/docs/page-design.md | 66 | Major | comments | The amend-ending bullet still names 'the transporter add, select and details pages' after the neighbouring bullet dropped 'select' for the removed transporters/select page, so the design doc still claims that orphaned page exists. | page-design.md does not name the removed transporters/select page in any transporter page list. | change the parenthetical on the add-another amend bullet to 'the transporter add and details pages', matching the updated primary-alone bullet. |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
