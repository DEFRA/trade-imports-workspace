# Repository Review: trade-imports-ins-backend

**PR:** #27  
**Commit reviewed:** `9feb1aed2e0fd1001bc841efd9b064d38663e1e6`  
**Files Changed:** 2

## Summary

`NotificationUpsertService` sets the cross-journey dashboard `commodity` field from the first GBN-AG trade line `description[0]`, falling back to `commonName`. Unit test covers the description path.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/NotificationUpsertService.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/ins/backend/notification/NotificationUpsertServiceTest.java` | NEEDS ATTENTION | 0 | 0 | 1 |

## Positive Observations

- Fallback order matches GBN-AG field semantics from animals-backend mapper.
- Change is isolated to event upsert; version guard behaviour unchanged.

## Test Coverage

- **Unit tests:** Description path asserted; commonName-only path not yet covered.

## Risk Assessment

**Overall Risk:** Low  
**Rationale:** Small surface area; one minor test gap.

## Items

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/test/java/uk/gov/defra/trade/imports/ins/backend/notification/NotificationUpsertServiceTest.java | 206 | Minor | coverage-gap | No unit test asserts dashboard commodity falls back to commonName when description is absent. | upsert path that sets commodity from commonName only is covered by a test. | add upsert_shouldStoreDashboardCommodityFromCommonNameWhenDescriptionMissing mirroring the description test. |  |  |  |

## Repository Verdict

**NEEDS ATTENTION** — one minor test follow-up (non-blocking for merge).
