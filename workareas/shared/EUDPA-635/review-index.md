# Code Review: EUDPA-635

**Ticket:** Add HMRC accessible-autocomplete wrapper
**Reviewer:** Claude Code Agent
**Date:** 2026-10-12
**Verdict:** CONCERNS

## Summary
The PR set converts the three remaining plain selects on the "Main reason for import" page to the shared accessible-autocomplete component, reskins the component's indicator as a search icon, and updates the fit and Playwright tests to drive the new control. The production change matches the ticket and no defect was found in the converted fields. There are no Critical findings; the concerns are one unconverted select that shares the changed list, several tests that do not prove what the acceptance criteria name, a stale macOS visual baseline, and a Behaviour Spec that has not been synced.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-frontend | #395 | ffa1146 (head, open) | 11 | NEEDS ATTENTION | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-ins-tests | #19 | 2456cc8 (head, open) | 5 | NEEDS ATTENTION | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| AC1-AC5 | Already-converted fields behave as before (verify only) | Yes | No change to their templates or controllers; the only shared change is the SCSS reskin. Not re-run as part of this review. |
| AC6 | Matching ports appear as you type (transit / temporary admission) | Partial | Proven for the transit port. The temporary admission port is only exercised by fill-and-pick (frontend item 6). |
| AC7 | Select a port; can change the selection | Partial | Selection and submitted code are tested. Changing the selection is not (frontend item 7). |
| AC8 | "No ports found" | Partial | Copy and test present for transit. No test on the temporary admission port (item 6); "change or clear the search term" untested (item 7). |
| AC9 | Matching countries appear as you type | Partial | Implemented, but the test passes even if filtering is broken (frontend item 5). |
| AC10 | Select a country; can change the selection | Partial | Selection tested; changing it is not (item 7). |
| AC11 | "No countries found" | Partial | Copy and test present; "change or clear the search term" untested (item 7). |
| AC12 | Whole list shown before typing | Partial | Tested for the transit fields; not for the temporary admission port (item 6). |
| AC13 | Works without JavaScript | Partial | Native select fallback kept; no-JS test covers the transit fields only (item 6). |
| AC14 | Import-reason tests updated for the new control | Yes | Fit specs and the tests repo moved from `.selectOption()` to `.fill()` / page-object helpers; no-JS path still covered. |
| AC15 | Search icon, not a dropdown triangle | Partial | Implemented in the shared SCSS and visible in the new linux baseline. The fit test does not prove the icon is painted or stacked behind the input (frontend item 9); the macOS baseline is stale (tests item 1). |

Outside the named ACs: `transhipmentDestinationCountry` is still a plain select but shares `countryItems()`, which lost its divider row (frontend items 3 and 8). The ticket names three fields only, so whether to convert it is a scope decision for the author.

Behaviour Spec: neither PR touches `openspec/`, and the workspace repo has no EUDPA-635 branch. `openspec/specs/live-animals/journey-pages/import-reason/spec.md` has no requirement for search, the no-results messages or the no-JS fallback, and its `coverage.json` has no entries for the new tests. The ticket points to REQ-ORIGIN-002 to 006 as the model. This is not tracked as an item because the workspace repo is not in the PR set.

## Test Coverage Assessment
- **Unit Tests:** Partial
- **Integration Tests:** Partial

## Configuration & Environment
- **New Environment Variables:** None
- **Database Changes:** None

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Low |
| Code Quality | Low |
| Security | Low |
| Test Coverage | Medium |

## Conclusion
The change is safe in production terms and consistent across the two repos, with matching branch names. Before merge, the author should decide the `transhipmentDestinationCountry` question, tighten the tests that cannot fail or leave named ACs unproven, and regenerate the macOS visual baseline. Full item lists are in each `review.{repo}.md` (11 items for the frontend, 1 for the tests repo).
