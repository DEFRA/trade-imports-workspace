# Code Review: EUDPA-306

**Ticket:** Unified dashboard showing notifications across journeys
**Reviewer:** Claude Code Agent
**Date:** 2026-09-08
**Verdict:** FAIL
**Scope:** EUDPA-306 only. OpenAPI, test-style, convict format, and EUDPA-358 Mongo retry are Won't Fix. Required changes are dashboard AC, firehose correctness, and stack INS-backend URL.

## Summary
INS frontend and backend deliver an unscoped unified dashboard over the aggregated store, and animals-backend now emits create/edit/delete firehose events for freshness. Merge is blocked by unescaped `referenceNumber` HTML (XSS) on the dashboard table. Remaining in-ticket work: 400 handling for invalid page, Mongo indexes, compose `TRADE_IMPORTS_INS_BACKEND_URL`, AMEND-phase `versionId`, and tests that pin AC1 columns, pagination, exact-match search, and AC5 empty list.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-backend | #83 | 0ba65961acc9f612158eba8e7e7fc15d66a14961 | 18 | NEEDS ATTENTION | [review.trade-imports-animals-backend.md](review.trade-imports-animals-backend.md) |
| trade-imports-ins-backend | #7 | c4c70e7f766295bdaf516aa784e4528b96439627 | 10 | NEEDS ATTENTION | [review.trade-imports-ins-backend.md](review.trade-imports-ins-backend.md) |
| trade-imports-ins-frontend | #25 | df4190f8340f859a610e9620518b475c13e79713 | 13 | RISKY | [review.trade-imports-ins-frontend.md](review.trade-imports-ins-frontend.md) |
| trade-imports-workspace | #15 | b3abe18c19bbc5f2535896a688ff9128abcbd4df | 4 | NEEDS ATTENTION | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| AC1 | See notifications with identifying columns | Partial | Backend and UI implement the list; tests mostly assert reference/status only; commodity often unseeded |
| AC2 | Appear regardless of journey | Yes | Status denylist (exclude DELETED); no journey allowlist |
| AC3 | Open in owning journey frontend | Yes | Animals-only deep links as scoped for this release |
| AC4 | Exact complete-reference search | Partial | Implemented; prefix/substring not locked by tests |
| AC5 | No match shows "No notifications found" and empty list | Partial | Copy is tested; empty results list is not |
| AC6 | Empty store shows start-new empty state | Yes | Covered in controller tests |
| AC7 | Recent edits reflected on reload | Partial | Create/edit/delete now emit outbox events; AMEND-phase Edited omits versionId |

## Test Coverage Assessment
- **Unit Tests:** Partial
- **Integration Tests:** Partial

## Configuration & Environment
- **New Environment Variables:** `TRADE_IMPORTS_INS_BACKEND_URL`, `TRADE_IMPORTS_ANIMALS_FRONTEND_URL`; `notification.list.page-size` (default 25). Compose still omits `TRADE_IMPORTS_INS_BACKEND_URL` on INS frontend.
- **Database Changes:** New compound index `aggregate_event_type` on animals outbox. INS aggregated list queries have no matching indexes.

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Medium |
| Code Quality | Medium |
| Security | High |
| Test Coverage | Medium |

## Conclusion
Do not merge the open INS PRs until the dashboard XSS is fixed. In-ticket follow-ups: firehose `versionId` on post-submit edits, `ConstraintViolationException` as 400, query indexes, compose INS backend URL, table caption, and the AC1/pagination/search test gaps. Style and adjacent-ticket nits are Won't Fix. Full item lists are in each `review.{repo}.md`.
