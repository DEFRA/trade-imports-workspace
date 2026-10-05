# Code Review: EUDPA-644

**Ticket:** Add 7-day TTL to addresses in non-prod environments
**Reviewer:** Claude Code Agent
**Date:** 2026-10-05
**Verdict:** CONCERNS

## Summary
The implementation meets every acceptance criterion and is prod-safe by default: addresses get `expireAt` on create only outside prod with days configured, and a Mongo TTL index removes them only where expiry is enabled and the environment is not prod. One Major test gap remains: no test binds `address-book.ttl.environment` through Spring, so the code-level prod guard could be silently disabled by a mis-keyed property. Six Minor items cover guard hardening, test quality and a stale address-book README. Merge order matters: the ins-tests PR should not land ahead of the other two, because CDP cleanup then depends on the TTL being deployed.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| cdp-app-config | #4747 | 1bd5fbb | 4 | SAFE | [review.cdp-app-config.md](review.cdp-app-config.md) |
| trade-imports-address-book | #10 | 23ad6aa | 12 | NEEDS ATTENTION | [review.trade-imports-address-book.md](review.trade-imports-address-book.md) |
| trade-imports-ins-tests | #10 | 9e8a179 | 6 | SAFE | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | Address created in dev/test/perf-test/ext-test removed roughly 7 days after creation | Yes | `stampExpiry` + TTL index; cdp-app-config sets both flags in the four environments; `AddressExpiryIT` proves removal against real Mongo |
| 2 | Prod never auto-removed, two independent safeguards | Yes | Stamping needs `days` set and not prod; index needs `expiry.enabled=true` and not prod. `isProd()` fails open on blank or padded values (item 1, Minor) |
| 3 | Existing addresses not deleted on deploy | Yes | No back-fill; TTL monitor skips documents without `expireAt`; covered by `AddressExpiryIT` |
| 4 | Test shows prod-configured environment never marks addresses | Partial | Unit tests use hand-built `AddressTtlConfig(7, "prod")`; no test binds the `environment` property (item 3, Major) |
| 5 | TTL duration via config property | Yes | `address-book.ttl.days` / `ADDRESS_TTL_DAYS`, `@Positive` |
| 6 | E2E tests stop cleanup-only soft-deletes; behaviour deletes stay | Yes | Teardown, tracking and purge tooling removed; behaviour deletes kept |

## Test Coverage Assessment
- **Unit Tests:** Partial (property binding of `environment` untested)
- **Integration Tests:** Present

## Configuration & Environment
- **New Environment Variables:** `ADDRESS_TTL_DAYS`, `ADDRESS_TTL_EXPIRY_ENABLED` (set in dev, test, perf-test, ext-test only). The guard also reads the existing `ENVIRONMENT`.
- **Database Changes:** new nullable `expireAt` field on `addresses`; TTL index `address_expire_at_ttl` (`expireAfterSeconds: 0`) in non-prod where enabled.

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Low |
| Code Quality | Low |
| Security | Low |
| Test Coverage | Medium |

## Conclusion
Production code is sound across all three PRs. Close the property-binding test gap (item 3) before merge and consider hardening `isProd()` (item 1). Full item details are in `review.trade-imports-address-book.md`; the other two repos have no items.
