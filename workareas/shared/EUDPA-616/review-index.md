# Code Review: EUDPA-616

**Ticket:** Add a search type-ahead for choosing commodities, reusable across the journey
**Reviewer:** Claude Code Agent
**Date:** 2026-11-12
**Verdict:** CONCERNS

## Summary
The PR set adds a reusable multi-select search component and uses it so the commodity search refreshes in place as the trader types. The no-JS server flow stays as the fallback. The behaviour works and is broadly well tested. Before merge it needs two client-script bugs fixed (focus theft after a late refresh, and a latched native-submit flag after bfcache Back), plus a few accessibility gaps, and the spec's ordering wording must match the code. Several design points need a designer's or ticket owner's ruling.

trade-imports-ins-frontend #71 (EUDPA-711, merged) was matched by the PR search by mistake and has been left out of scope. Its placeholders are parked under `_excluded-ins-frontend-pr71/`.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-frontend | #474 | c36899e | 30 | NEEDS ATTENTION | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-ins-tests | #96 | ac17fd0 | 3 | NEEDS ATTENTION | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-workspace | #240 | 396e7c3 | 2 | NEEDS ATTENTION | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | Typing shows matching commodities live, no full reload | Yes | Results route + `multi-select-search.js`. The fit test's "without leaving the page" URL check cannot fail (frontend #23). |
| 2 | Results grouped by commodity, matched text emphasised, as prototype | Partly | Grouped and bolded. The heading says "Cow (0102)" where the prototype says "Cattle (0102)", and the selected panel shows the code alone where the prototype shows name and code (frontend #18). The chip/dropdown styling vs the GOV.UK toolbox needs a designer call (frontend #62). |
| 3 | Polite live region announces the result count | Yes | "1 result available" vs the prototype's "1 results available" is open with the designer (frontend #60). The Welsh variants are untested (frontend #20). |
| 4 | Multiple selections persist across searches; summary panel with Clear all | Yes | Two chip Remove buttons can share an accessible name (frontend #28), and the chip X disappears in forced-colours mode (frontend #45). After bfcache Back the page can go dead (frontend #4). |
| 5 | With JS disabled, the page works exactly as today | Partly | The no-JS path still works, but it gains an "Update selected" button and Latin-name-only chips with no ruling on the ticket (workspace #9). |
| 6 | Component lives outside the commodities feature for reuse | Yes | Under `src/client/javascripts/components/` and `src/server/common/components/multi-select-search/`. One SCSS variable name still says "species" (frontend #49). |
| 7 | Existing commodity fit specs pass with JS and still cover no-JS | Yes | There is a `javaScriptEnabled: false` describe block. |
| Spec | `openspec/` update represents the change accurately | No | REQ-015's title and SCN-015-A say heading order while the body and the code use code order (workspace #8, Critical). Five unit coverage links are marked full but cannot prove their Thens (workspace #1). SCN-004-D's fallback is unprobed (workspace #2). |

## Test Coverage Assessment
- **Unit Tests:** Partial. The controller and view-models are good. The client suite misses its fallback and guard branches, and the Welsh announcement is untested.
- **Integration Tests:** Present. Fit and e2e cover both paths. The ins-tests heading regex is too loose to catch a wrong name (ins-tests #9).

## Configuration & Environment
- **New Environment Variables:** None
- **Database Changes:** None

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Medium |
| Code Quality | Medium |
| Security | Low |
| Test Coverage | Low |

## Conclusion
Fix the client-script focus and bfcache bugs and the accessibility gaps, and bring the spec's REQ-015 wording in line with code order across all three repos. The designer and ticket owner need to rule on the no-JS Update selected button, the chip and hover design, the commodity name ("Cow" vs "Cattle") and the result-count wording. Full item lists are in each `review.{repo}.md`.
