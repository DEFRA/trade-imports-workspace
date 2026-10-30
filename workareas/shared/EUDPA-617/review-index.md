# Code Review: EUDPA-617

**Ticket:** Integrate early-access MDM commodity API into live animals frontend
**Reviewer:** Claude Code Agent
**Date:** 2026-10-30
**Verdict:** CONCERNS

## Summary
Re-review of the five open follow-up PRs, taking ami-nav's walk notes and ticket comments into account. The fixes are in and no functional regression was found. Two things stop this merging as it stands: the species check does not reflect Monica's 29 Oct reply, and the REQ-CYA-014 ID clash with PR 155 was closed for a reason that is not true.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-frontend | #449 | d4174c8 | 27 | NEEDS ATTENTION | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-ins-tests | #73 | ada7a3e | 8 | NEEDS ATTENTION | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-reference-data | #39 | 3d9426f | 18 | NEEDS ATTENTION | [review.trade-imports-reference-data.md](review.trade-imports-reference-data.md) |
| trade-imports-stub | #29 | 8f1d6eb | 9 | NEEDS ATTENTION | [review.trade-imports-stub.md](review.trade-imports-stub.md) |
| trade-imports-workspace | #188 | 18d2c42 | 7 | NEEDS ATTENTION | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

trade-imports-animals-backend#114 was picked up by mistake. It is EUDPA-296 and was not reviewed. `.review-meta.json` still lists it, so `verify-coverage.sh` reports 69 of 119: the 69 in scope are all reviewed, and the 50 pending are all #114.

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | Search by common name | Yes | Covered in spec and tests; not re-run here |
| 2 | Search by commodity code | Yes | Spec SCN-COMMODITY-SELECT-003-C now bounded to 100 species |
| 3 | Search by Latin name | Yes | 003-D's `full` strength is overstated (workspace #4) |
| 4 | Unsupported behaviour documented | Yes | `docs/repos/trade-imports-reference-data.md:55-58` |
| 5 | Gaps fed back to the MDM team | Not verifiable | Ticket comments list them; the reply is not in the repos |
| 6 | Stubs updated | Yes, with a limit | 28 Oct comment lists codes with no species page. Won't Fix, dev and Docker only |

Spec against AC: REQ-CYA-014 goes beyond the listed AC, but it conflicts with the 29 Oct ticket reply (frontend #16, #17; workspace #5, #6).

## Test Coverage Assessment
- **Unit Tests:** Partial. Gaps: dropped connection on four MDM calls, token endpoint 500.
- **Integration Tests:** Present. SCN-CYA-014-C has no test that continues an amendment (workspace #3).

## Configuration & Environment
- **New Environment Variables:** None
- **Database Changes:** None

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Medium |
| Code Quality | Medium |
| Security | Low |
| Test Coverage | Medium |

## Conclusion
Settle the species-check questions with Monica and the REQ-CYA-014 numbering with PR 155 before merge. The rest is ordinary follow-up. Two items reverse our own 29 Oct advice: frontend #18 (the `logRefusal` wording) and ins-tests #1 (`enterDetailsHeadingText`). Questions outside these diffs: is the 15 Oct MDM-down fallback, which is not in reference-data, moved to another ticket, and did Rhyss get an answer on `mdmProductCommoditiesResponses.json`?
