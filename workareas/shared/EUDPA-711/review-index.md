# Code Review: EUDPA-711

**Ticket:** Design Release 2.1: address book — addresses have a type and uses, with category tabs and a type filter
**Reviewer:** Claude Code Agent
**Date:** 2026-11-05
**Verdict:** CONCERNS

## Summary
Across seven PRs, the build delivers type-first adding, roles on every address, three category tabs with a Type column, the Type (role) filter, search by role, and landing on the type's tab after adding. The behaviour is correct and well covered by unit, integration, fit and e2e tests. One Critical item: the ticket says the API stores and requires an address type, while the spec and the code store roles only and derive the type from them. The ticket or the spec must change so they agree. One reachable 500 and one flaky pager need fixing. The rest is naming, duplication and test-readability debt: 179 open items after 34 shared-root merges.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-address-book | #20 | b18192a8 | 55 | NEEDS ATTENTION | [review.trade-imports-address-book.md](review.trade-imports-address-book.md) |
| trade-imports-animals-frontend | #460 | 5c2797a9 | 1 | SAFE | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-ins-frontend | #71 | 77fa2908 | 96 | NEEDS ATTENTION | [review.trade-imports-ins-frontend.md](review.trade-imports-ins-frontend.md) |
| trade-imports-ins-tests | #77 | 29887c34 | 67 | NEEDS ATTENTION | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-performance-tests | #27 | ed4724a3 | 16 | NEEDS ATTENTION | [review.trade-imports-performance-tests.md](review.trade-imports-performance-tests.md) |
| trade-imports-plants-frontend | #132 | 8475f4f0 | 1 | SAFE | [review.trade-imports-plants-frontend.md](review.trade-imports-plants-frontend.md) |
| trade-imports-workspace | #196 | ed9e3c48 | 16 | RISKY | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | The address book record carries the address's type and what it can be used for (inc-059) | Partial | Roles are stored and required. No type is stored: it is derived from the roles, and a posted `addressType` is ignored. The spec (REQ-INS-ADDR-037, SCN-037-J) follows the code and contradicts the ticket's "stores an address's type and uses, and requires both". Critical: workspace #4. |
| 2 | Three category tabs with a Type column (inc-067) | Yes | MoJ sub-navigation tabs; an unknown tab falls back to Origin and Consignor. |
| 3 | Type filter within a tab, search by type, tab and page links keep the filters (inc-068) | Yes | `role`/`searchRole` from the frontend to the API. The security spec never sends the new `role` parameter through ZAP (ins-tests #44). |
| 4 | Adding an address starts by choosing its type (inc-061) | Yes | New type page. Its h1 is repeated in a hidden legend (ins-frontend #24). |
| 5 | Saving with uses, landing on the type's tab, edit keeps type and uses, API requires a type and at least one use (inc-070) | Partial | Roles are required and kept on edit, and the trader lands on the tab. The API requires roles, not a type (same root as #1). The roles error shows only after the field errors are fixed (ins-frontend #17). |
| 6 | Destination, Consignee or Importer and Branch entered by hand with a fixed UK country (inc-071) | Yes | The frontend fixes the country. The API enforces GB only for receiving roles, so Branch is UK-only in the UI but not in the API, by spec. Edit offers every country (raised as a designer question, not an item). |
| 7 | A new address from a notification can also be saved for the other roles on its side, Welsh for this ticket's pages (inc-079) | Yes | Welsh drafts present and parity-tested. A session handshake with an unlisted fulfilment id gives a 500 (ins-frontend #86). The legend wording for Destination and Branch differs between the ticket and the spec (workspace #6, snag S-09). |

## Test Coverage Assessment
- **Unit Tests:** Present. A minority of titles over-claim or cannot fail.
- **Integration Tests:** Present (address-book ITs, ins-frontend fit, ins-tests e2e, a11y and security). Gaps: the handshake session path, a receiving role with a blank country, and `role` under ZAP.

## Configuration & Environment
- **New Environment Variables:** None.
- **Database Changes:** New `roles` array on address documents. No migration: test-environment addresses expire after 7 days, and an address saved before this change shows on no tab (workspace deferred.md).

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Medium |
| Code Quality | Medium |
| Security | Low |
| Test Coverage | Low |

## Conclusion
Settle the type-versus-roles question first: record the 5 November ruling and update the ticket, or store the type. Then fix the handshake 500 (ins-frontend #86), the add-form error ordering (#17) and the ins-tests pager race (#51). The naming and duplication owners (#71-#79 in address-book, #84-#98 in ins-frontend, #51-#58 in ins-tests) are best done as one pass per repo. Full item lists are in each `review.{repo}.md`.
