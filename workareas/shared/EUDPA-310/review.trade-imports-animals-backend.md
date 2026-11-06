# Repository Review: trade-imports-animals-backend

**PR:** [#101](https://github.com/DEFRA/trade-imports-animals-backend/pull/101)
**Commit:** `ed6ba7b`
**Files Changed:** 9

## Summary

Populates `exchangedDocument.referenceDocument[]` on every GBN-AG outbox event from virus-scanned accompanying documents. `OutboxService` reads `ScanStatus.COMPLETE` documents inside the outbox write; `ReferencedDocument` maps all fourteen `DocumentType` values to codelist codes with a fixed Defra `urlId`.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `AccompanyingDocumentRepository.java` | SAFE | 0 | 0 | 0 |
| `OutboxService.java` | SAFE | 0 | 0 | 0 |
| `ExchangedDocument.java` | SAFE | 0 | 0 | 0 |
| `GbnAgEventData.java` | SAFE | 0 | 0 | 0 |
| `GbnAgEventDataMapper.java` | SAFE | 0 | 0 | 0 |
| `ReferencedDocument.java` | SAFE | 0 | 0 | 0 |
| `NotificationIT.java` | SAFE | 0 | 0 | 0 |
| `OutboxServiceTest.java` | SAFE | 0 | 0 | 0 |
| `GbnAgMapperTest.java` | SAFE | 0 | 0 | 0 |

## Positive Observations

- Addresses the root cause Ian identified in the ticket comment: `referenceDocument` was hardcoded `null`.
- Scan filtering at write time keeps event payload consistent with document state.
- Exhaustive `DocumentType` switch enforces compile-time coverage when types are added.
- `NotificationIT` mutation probe for REJECTED documents is a strong AC #8 guard.

## Test Coverage

- **Unit tests:** `GbnAgMapperTest` pins every type code and `urlId`; `OutboxServiceTest` verifies repository wiring.
- **Integration tests:** Submit flow with COMPLETE + PENDING + REJECTED documents.

## Risk Assessment

**Overall Risk:** Low
**Rationale:** Focused change on existing outbox path with thorough test coverage.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|

## Repository Verdict

**Status:** SAFE
