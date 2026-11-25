# Code Review: EUDPA-776

**Ticket:** Remove the contact address page from the live animals journey
**Reviewer:** Claude Code Agent
**Date:** 2026-11-20
**Verdict:** NEEDS MORE WORK (refresh 2026-11-24)
**Last Updated:** 2026-11-24 (all 8 PRs refreshed: backend 8caabc8, animals-frontend ed23c57, gateway 37e1f1a, ins-frontend dd902ca, ins-tests 3e1d02a, perf-tests 60c0dcd, schemas d4d2b80, workspace 467f401). Per-item checks are in `.verify/`.
**Notes:** The EUDPA-805 reverts are gone. The ins-frontend, ins-tests and perf-tests PRs remove the Branch address type, as the ticket's acceptance criterion asks ("The address book has no branch address"). On main only the live animals contact page uses it: plants' contact picker asks for no role, and germinal products has no contact page. The removal is not finished: the address-book service, which has no PR in the set, still has BRANCH_ADDRESS, and the spec and coverage still describe Branch. Add a trade-imports-address-book PR on feat/EUDPA-776-remove-contact-address (workspace #32), and drop Branch from the plants stub seed data. The Data Fields v4 Confluence page update is a manual step and was not checked.

## Summary
The contact address page, its obligation, the `consignment` party and the GBN-AG `issuer` are removed cleanly from the frontend, the backend and the gateway, and the gateway adds a PIMS v0.4.0 stream. Three things block merge:
- `gbn-ag-v1.schema.json` still inherits `issuer` from the core schema, so that criterion is not met.
- A bad rebase in three PRs (workspace, ins-frontend, ins-tests) reverts unrelated main content: specs, germinal products tests and amend tests.
- Several coverage links point at deleted or renamed tests.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-backend | #133 | b73a5d0 (head) | 10 | NEEDS ATTENTION | [review.trade-imports-animals-backend.md](review.trade-imports-animals-backend.md) |
| trade-imports-animals-frontend | #487 | 714a8f5 (head, refreshed 2026-11-23; first reviewed 08f4558) | 101 | RISKY | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-dynamics-gateway | #35 | 9e3e3ac (head) | 48 | NEEDS ATTENTION | [review.trade-imports-dynamics-gateway.md](review.trade-imports-dynamics-gateway.md) |
| trade-imports-ins-frontend | #88 | f2c6e6a (head) | 7 | RISKY | [review.trade-imports-ins-frontend.md](review.trade-imports-ins-frontend.md) |
| trade-imports-ins-tests | #115 | 47d3968 (head) | 28 | NEEDS ATTENTION | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-performance-tests | #47 | 5c90936 (head) | 6 | NEEDS ATTENTION | [review.trade-imports-performance-tests.md](review.trade-imports-performance-tests.md) |
| trade-imports-schemas | #73 | 8de0f3b (head) | 6 | RISKY | [review.trade-imports-schemas.md](review.trade-imports-schemas.md) |
| trade-imports-workspace | #274 | ef8ad11 (head) | 20 | RISKY | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | No contact address page; opening sequence goes straight to check your answers | Yes | `features/contact/` deleted; `flow.js` puts review after consignment-parties |
| 2 | Overview and check your answers show no contact address row | Yes | Exact positive lists in check-answers tests; visual baselines updated |
| 3 | Old contact address URL no longer serves the page | Yes, untested | Routes are removed, but no test in the PR set proves the old URL is not served (ins-tests #6, #21) |
| 4 | New notification saves no `consignment` party; no `contactAddress` obligation | Yes | Field removed from `NotificationBase` and the mapper. No backend test proves a save carrying `consignment` is accepted and not stored (backend #4) |
| 5 | `gbn-ag-v1.schema.json` and data dictionary have no `exchangedDocument.issuer` | **No** | Profile still inherits `issuer` through `allOf` → core `CertificatePayload`; the dictionary was hand-edited and its generator puts `issuer` back (schemas #1, #2) |
| 6 | GBN-AG event for a submitted notification has no `issuer` | Yes | Record field removed. The test proves it only on an empty draft (backend #9) |
| 7 | PIMS v0.4.0 published with no `issuer`, with a changes doc | Partial | Schema and changes doc are correct; there is no v0.4.0 sample for CI to validate (schemas #5) |
| 8 | Gateway sends v0.4.0 alongside earlier versions, and no PIMS message carries `issuer` | Yes, weakly tested | Listener wired. `mapToV4` is never called directly, and the IT checks only metadata (gateway #9, #28) |
| 9 | `pims-data-mapping.md` says `issuer` not sent from v0.4.0 | Partial | The Person responsible entry is updated, but the Contact Address section is still untrue (schemas #3) |
| 10 | Address book has no branch address; no consignment contact add-address controls | Partial | Contact handshake and controls removed, and the INS frontend, tests and perf-tests no longer have the Branch type or tab. The address-book service still has BRANCH_ADDRESS, and the spec and coverage still describe Branch (workspace #17, #27, #32). Plants does not use the Branch role |
| 11 | Data Fields v4 Confluence page updated | Not verified | Outside the PR set |
| 12 | openspec live-animals specs match the journey without the page | **No** | Contact-specific edits are right, but the PR reverts REQ-ADDR-017/018, REQ-INS-ADDR-048 and REQ-FLOW-003/018 from main. The rewritten picker spec contradicts the code, and REQ-FLOW-018 contradicts REQ-CPH-006 (workspace #23). Coverage links point at deleted or renamed tests (workspace #6, #10, #20, #24) |
| 13 | ins-tests e2e/a11y pass; `dynamics/notification-data.spec.ts` asserts no `issuer` | Partial | Suites updated. The `issuer` check is in `animals-admin/outbox-event-notification.spec.ts:94` as `toBeUndefined()`, not in `notification-data.spec.ts`. Unrelated amend and CPH tests were deleted (ins-tests #26) |

## Test Coverage Assessment
- **Unit Tests:** Partial. Frontend and backend are adequate. In the gateway, the V4 tests are copies and `mapToV4` is untested. In ins-frontend, the germinal products tests are deleted.
- **Integration Tests:** Partial. There is no backend IT for an incoming `consignment`, the gateway IT checks only v0.4.0 metadata, and e2e lost unrelated amend and CPH coverage.

## Configuration & Environment
- **New Environment Variables:** None
- **Database Changes:** None (existing drafts keep a `consignment` field that is no longer read; no migration, per the ticket)

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | High |
| Code Quality | Medium |
| Security | Low |
| Test Coverage | High |

## Conclusion
The contact page removal itself is complete and correct in the running services, and the v0.4.0 schema and gateway stream are right in shape. Before merge:
- Fix the GBN-AG schema inheritance.
- Redo the workspace, ins-frontend and ins-tests changes on top of current main, so they stop reverting EUDPA-805 content.
- Repair the broken coverage links.

The remaining items are leftovers, naming and stale docs; full lists are in each `review.{repo}.md`.
