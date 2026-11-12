# Code Review: EUDPA-786

**Ticket:** Bring the stub and tests in line with MDM's GBNAG product API changes
**Reviewer:** Claude Code Agent
**Date:** 2026-11-12
**Verdict:** CONCERNS

## Summary
The recaptured stub data, the frontend fixture, the tests and the performance-tests README all agree with each other and with the ticket, checked with `jq` over every row, and CI is green on all four PRs. The concerns are prose the PRs left alone: docs in the frontend and the workspace still describe the pre-release capture (no `Canis familiaris`, TST not flagging `isGerminal`, old counts and species), and one frontend test asserts only hand-copied counts. The ticket's last AC (MDM told about the data problems, answers noted) has no evidence on the ticket yet.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-stub | #34 | d0f331d | 3 | SAFE | [review.trade-imports-stub.md](review.trade-imports-stub.md) |
| trade-imports-animals-frontend | #475 | f3fa008 | 4 | NEEDS ATTENTION | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-performance-tests | #34 | cb768d2 | 1 | SAFE | [review.trade-imports-performance-tests.md](review.trade-imports-performance-tests.md) |
| trade-imports-workspace | #244 | 29ac79f | 1 | NEEDS ATTENTION | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | Stub's saved MDM product responses captured from TST after the GBNAG release | Yes | All three files carry the release's fields (`speciesId`, `taxonomy.order`, `productTypes`) and data changes (germinal flags, goat emptied). |
| 2 | Stub answers `/commodities/01051111/species` with Gallus gallus (Chicken); `ProductControllerTest` passes | Yes | `01051111` holds one species, Gallus gallus, `totalElements` 1. Stub PR checks green. |
| 3 | Frontend fixture lists the same codes, Latin names and common names as the stub's `010` search; unit and fit tests pass | Yes | `jq` equality: 25 codes, 160 species, same order. Unit, FIT (3 shards) green. |
| 4 | Full animals e2e suite passes against the stack running the recaptured stub | Yes (CI) | E2E checks green on the stub, frontend and workspace PRs. Not re-run locally by the reviewer. |
| 5 | Performance-tests README describes the Bos taurus search as MDM answers it now | Yes | Matches the stub: `0102`, `05111000`, `05119985`, both germinal codes flagged. |
| 6 | MDM told about Pholidota taxonomy order and asked about goat (`010420`); answers noted on the ticket | No evidence | The ticket has no comments. Also worth adding to that report: `04071919` (hatching eggs) is still `isGerminal: false`. |

Spec check (workspace PR touches `openspec/`): the coverage change matches the frontend tests exactly. SCN-COMMODITY-SELECT-003-C is renamed to the "7 species" test; SCN-COMMODITY-SELECT-003-E drops the deleted Catreus fit link and stays `full` on its unit test. `tim spec diff --signed-off` reports nothing for the workspace range, and no signed-off-linked test in the frontend PR is changed.

## Test Coverage Assessment
- **Unit Tests:** Present. Updated in step with the fixture; one test asserts only counts (frontend #1).
- **Integration Tests:** Present. FIT and E2E green. SCN-COMMODITY-SELECT-003-E is no longer reachable through the stack because no species in the new data lacks a common name (workspace #1).

## Configuration & Environment
- **New Environment Variables:** None
- **Database Changes:** None

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Low |
| Code Quality | Medium |
| Security | Low |
| Test Coverage | Low |

## Conclusion
Safe in behaviour: data and tests are in step and green. Before merge, correct the stale docs (frontend `services.md`, workspace `docs/repos/trade-imports-stub.md` and `trade-imports-reference-data.md`), preferably by removing the hand-copied capture details so the next recapture cannot make them false again, and record the MDM contact on the ticket. Full item lists are in each `review.{repo}.md`.
