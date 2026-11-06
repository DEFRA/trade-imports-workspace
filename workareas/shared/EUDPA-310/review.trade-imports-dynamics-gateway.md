# Repository Review: trade-imports-dynamics-gateway

**PR:** [#24](https://github.com/DEFRA/trade-imports-dynamics-gateway/pull/24)
**Commit:** `4eb7071`
**Files Changed:** 7

## Summary

Adds `urlId` to the inbound `ReferencedDocument` record so the gateway can deserialize backend GBN-AG events. PIMS v0.2.0 mapping continues to forward `typeCode`, `identifier`, and `issueDateTime` only — `urlId` is accepted but not forwarded.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `ReferencedDocument.java` | SAFE | 0 | 0 | 0 |
| `PimsCommonMapperV2Test.java` | SAFE | 0 | 0 | 0 |
| `PimsEventMapperTest.java` | SAFE | 0 | 0 | 0 |
| `PimsEventMapperV2Test.java` | SAFE | 0 | 0 | 0 |
| `PimsPayloadMapperTest.java` | SAFE | 0 | 0 | 0 |
| `PimsTransportMapperV2Test.java` | SAFE | 0 | 0 | 0 |
| `notification-submitted-from-backend.json` | SAFE | 0 | 0 | 0 |

## Positive Observations

- Field order matches animals-backend record exactly.
- `PimsPayloadMapperTest` explicitly asserts `urlId` absent from PIMS output.
- Fixture uses realistic mixed codes (`856`, `GBN1`) with codelist `urlId`.

## Test Coverage

- **Unit tests:** All PIMS mapper test suites updated for five-arg `ReferencedDocument`.

## Risk Assessment

**Overall Risk:** Low
**Rationale:** Deserialization-only change; forwarding behaviour unchanged and tested.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|

## Repository Verdict

**Status:** SAFE
