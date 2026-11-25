# Code Review: EUDPA-776

**Ticket:** Remove the contact address page from the live animals journey
**Reviewer:** Claude Code Agent
**Date:** 2026-11-20
**Verdict:** NEEDS MORE WORK (refresh 2026-11-25)
**Last Updated:** 2026-11-25. All 8 PRs were refreshed at their current heads: backend 88a3e6c, animals-frontend be02547, gateway 96cdd78, ins-frontend ace0aa7, ins-tests 5cdbcb0, perf-tests fadea7a, schemas 7371fd2, workspace 9950666. trade-imports-address-book #29 (b0a8ef9) was added to the set and reviewed for the first time. Workspace #339 (review tooling) is not part of this ticket and is left out. The per-item checks are in `.verify/`, and the cross-repo Branch check is in `.verify/branch-removal.md`.
**Notes:** Removing the Branch address is now consistent in code across every repo: address-book #29, the INS frontend, ins-tests, perf-tests, the animals frontend, and the spec and coverage. After #29 the service cannot read addresses already stored with BRANCH_ADDRESS: unfiltered lists return 500, which breaks the animals and plants party pickers, and get, update and delete of those records return 500. Decided: stored addresses are transient and test-only, and deleting them before the deploy would not hold, because the old code keeps writing BRANCH_ADDRESS until the new code is out. So deploy #29 to dev and test, accept those 500s for a short while, then delete every address in each environment, in the database, since the API cannot delete those records after #29. Deploy ins-frontend #88 and the ins-tests and perf-tests seed changes no later than #29, so nothing writes BRANCH_ADDRESS after the delete. #29's description must say this as its deploy step, in place of "No data migration" (address-book #8). The Data Fields v4 Confluence page update is a manual step and was not checked.

## Summary
Tarun's fixes close most of the earlier review: 149 of the 167 open items are fixed, or moot because the code they were about has left the PR. All are marked Auto-Resolved. The earlier blockers are fixed: the GBN-AG schema inheritance, the bad rebase that reverted EUDPA-805 content, and the broken coverage links. The remaining blockers:
- Stored Branch addresses (address-book #8, new).
- The `notification-data.spec.ts` issuer check still reads an unfiltered event (ins-tests #39).
- REQ-FLOW-003 still drops a sentence from main (workspace #23).
- SCN-INS-ADDR-037-H claims full coverage of an update that no test proves (workspace #35).
- Item #32's loose ends.

Tarun posted no replies on any PR, and no commit message argues against an item.

## Repositories Analyzed
| Repository | PR | Commit reviewed | Open items | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-address-book | #29 | b0a8ef9 (new) | 4 (1 Critical) | RISKY | [review.trade-imports-address-book.md](review.trade-imports-address-book.md) |
| trade-imports-animals-backend | #133 | 88a3e6c | 2 | NEEDS ATTENTION | [review.trade-imports-animals-backend.md](review.trade-imports-animals-backend.md) |
| trade-imports-animals-frontend | #487 | be02547 | 5 | NEEDS ATTENTION | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-dynamics-gateway | #35 | 96cdd78 | 5 | NEEDS ATTENTION | [review.trade-imports-dynamics-gateway.md](review.trade-imports-dynamics-gateway.md) |
| trade-imports-ins-frontend | #88 | ace0aa7 | 1 | SAFE (one Major test-table nit) | [review.trade-imports-ins-frontend.md](review.trade-imports-ins-frontend.md) |
| trade-imports-ins-tests | #115 | 5cdbcb0 | 9 (1 Critical) | NEEDS ATTENTION | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-performance-tests | #47 | fadea7a | 1 Minor | SAFE | [review.trade-imports-performance-tests.md](review.trade-imports-performance-tests.md) |
| trade-imports-schemas | #73 | 7371fd2 | 6 | NEEDS ATTENTION | [review.trade-imports-schemas.md](review.trade-imports-schemas.md) |
| trade-imports-workspace | #274 | 9950666 | 12 (3 Critical) | RISKY | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | No contact address page; opening sequence goes straight to check your answers | Yes | Unchanged |
| 2 | Overview and check your answers show no contact address row | Yes | Unchanged |
| 3 | Old contact address URL no longer serves the page | Yes | ins-tests `addresses-read-only.spec.ts:76` asserts 404. No coverage link points at it (workspace #39) |
| 4 | New notification saves no `consignment` party; no `contactAddress` obligation | Yes | Backend IT now proves a save carrying `consignment` stores none (backend #4 fixed). Its CH assertion is weak (backend #14) |
| 5 | `gbn-ag-v1.schema.json` and data dictionary have no `exchangedDocument.issuer` | Yes | `"issuer": false`; the generator drops it and a test pins the table. The dictionary intro still says "who issued it" (schemas #15, Minor) |
| 6 | GBN-AG event for a submitted notification has no `issuer` | Yes | Backend #9 fixed. No openspec scenario states it (workspace #38) |
| 7 | PIMS v0.4.0 published with no `issuer`, with a changes doc | Yes | v0.4.0 sample added and validated in CI. The schema descriptions still narrate history (schemas #6) |
| 8 | Gateway sends v0.4.0 alongside earlier versions; no PIMS message carries `issuer` | Yes | `PimsPayloadMapperTest` proves no issuer in any version, v0.4.0 included |
| 9 | `pims-data-mapping.md` says `issuer` not sent from v0.4.0 | Yes | Contact Address section fixed (schemas #3) |
| 10 | Address book has no branch address; no consignment contact add-address controls | **Partial** | Code is consistent across all repos, address-book #29 included. Stored BRANCH_ADDRESS data is unhandled (address-book #8, Critical). docs/repos/trade-imports-address-book.md still says six roles (workspace #33). The plants-frontend stub outside the set still holds the role (workspace #34). No test names a refused BRANCH_ADDRESS (address-book #3, ins-tests #45), which is disputed: see #32 |
| 11 | Data Fields v4 Confluence page updated | Not verified | Outside the PR set |
| 12 | openspec live-animals specs match the journey without the page | **Partial** | The reverts are undone and Branch is gone from the ins spec. REQ-FLOW-003 still drops main's sentence (workspace #23). SCN-INS-ADDR-037-H claims full coverage but only creates are proven (workspace #35). Stale coverage notes (workspace #8, #36, #37, #39) |
| 13 | ins-tests e2e/a11y pass; `dynamics/notification-data.spec.ts` asserts no `issuer` | **Partial** | `notification-data.spec.ts:165-167` still reads the first outbox event unfiltered, with a subset key check (ins-tests #39, Critical). The a11y fixes were checked by reading only, not run |

## Test Coverage Assessment
- **Unit Tests:** Present. Gateway V4 is now covered through the shared mappers. A few titles and tables are weak (frontend #71, gateway #40 to #42).
- **Integration Tests:** Partial. No address-book IT covers stored-role data, and three `AddressListIT` assertions no longer discriminate. ins-tests `notification-data.spec.ts` is still unfiltered.

## Configuration & Environment
- **New Environment Variables:** None
- **Database Changes:** Stored BRANCH_ADDRESS addresses must be deleted, or tolerated, before address-book #29 deploys (address-book #8). Existing drafts with `consignment` need no migration, per the ticket.

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | High (stored Branch data) |
| Code Quality | Medium |
| Security | Low |
| Test Coverage | Medium |

## Conclusion
The contact-page removal and the issuer and v0.4.0 work are done. Before merge:
- Decide and carry out the stored-BRANCH_ADDRESS plan in #29.
- Fix the `notification-data.spec.ts` issuer check.
- Restore REQ-FLOW-003's sentence and correct SCN-INS-ADDR-037-H's coverage.
- Close #32's loose ends: the six-roles doc, the plants stub, and deploy order.

The full lists are in each `review.{repo}.md`.
