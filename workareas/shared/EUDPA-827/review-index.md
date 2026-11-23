# Code Review: EUDPA-827

**Ticket:** Party pickers in animals and plants show every saved address on one page
**Reviewer:** Claude Code Agent
**Date:** 2026-11-23
**Verdict:** CONCERNS
**Notes:** Merge the four PRs together: the workspace coverage links cite an ins-tests test title that PR #138 has not renamed yet.

## Summary
Both frontends now page their party pickers at eight, with GOV.UK pagination, a "Selected address" line and paging links that carry the search and the chosen address. The specs and Design Release 2.1 sources are updated to match. The behaviour meets the acceptance criteria in animals. Plants drops the trail from its paging links, so the way back is lost. Across the set, several coverage links and test titles claim more than the tests prove, and four links point at a test title that does not exist.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-frontend | #510 | c5ec124 (head) | 20 | NEEDS ATTENTION | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-plants-frontend | #164 | ad743ba (head) | 19 | RISKY | [review.trade-imports-plants-frontend.md](review.trade-imports-plants-frontend.md) |
| trade-imports-ins-tests | #138 | 9c67c82 (head) | 5 | RISKY | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-workspace | #332 | d74e5b6 (head) | 17 | RISKY | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | A picker with more than 8 addresses shows the first 8 and GOV.UK pagination, in either journey | Yes | Code meets it in both frontends. Plants coverage marks it full from consignor (8) and place of destination (6) runs that never page (workspace #36). |
| 2 | On another page the search text stays, results stay filtered, and the chosen address stays chosen | Partly | Animals meets it. A newly ticked address carries over only with JavaScript on (animals #14, plants #4). Plants paging links drop the trail (plants #12, Critical). No test searches and then pages in plants, or in an animals browser test (animals #36, plants #16, workspace #4, ins-tests #11). |
| 3 | 8 or fewer shows no pagination | Yes | Tested at the template and view-model level in both frontends. |
| 4 | Every page holds only the role's addresses or role-less ones | Partly | Code is right. Tests check other roles' addresses are left out on one page only (animals #9, plants #17, workspace #17). |
| 5 | Specs and coverage say the pickers page, each scenario linked to a test that proves it | No | Four links cite an ins-tests title that does not exist (workspace #1, #2; ins-tests #8). Specs measure the count and threshold against the role's whole list, not the addresses found (workspace #34). Spec says the "Selected address" line shows only on reopening (workspace #35). |
| 6 | Design Release 2.1 sources record paging so a re-distil keeps it | Partly | Ruling, requirements, conflicts and backlog are updated, but `reconciled.json` still holds the old req-594/req-595 (workspace #19), and c-094 has no position from the new ruling (workspace #21). |

## Test Coverage Assessment
- **Unit Tests:** Partial. Animals is broad but has several overclaiming titles. Plants has no tests for the POST page rules, the ellipsis or the search term in links.
- **Integration Tests:** Partial. The animals fit spec and ins-tests e2e cover paging. Plants fit proves paging only for consignment contact, and plants has no paging e2e.

## Configuration & Environment
- **New Environment Variables:** None
- **Database Changes:** None

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Medium |
| Code Quality | Medium |
| Security | Low |
| Test Coverage | High |

## Conclusion
The paging itself is sound and consistent between the twins. Before merge, plants must carry the trail on its paging links. The ins-tests retitle must land so the coverage links resolve. The specs and coverage must state the count rule and the paging proof accurately. Full todo lists are in each `review.{repo}.md`.
