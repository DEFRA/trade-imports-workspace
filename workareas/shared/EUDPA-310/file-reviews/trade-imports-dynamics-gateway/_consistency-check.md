# Consistency Check: trade-imports-dynamics-gateway

**Ticket:** EUDPA-310
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-tests (+ manual: trade-imports-schemas, workspace openspec)
**PR:** #24 | **Commit:** 4eb70718

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `ReferencedDocument` record field order | backend ✅ | ✅ `typeCode`, `urlId`, `relationshipTypeCode`, `identifier`, `issueDateTime` | CONSISTENT |
| Accept inbound `urlId` on GBN-AG events | backend emits ✅ | ✅ Record extended; `@JsonIgnoreProperties(ignoreUnknown = false)` unchanged | CONSISTENT |
| Drop `urlId` when mapping to PIMS v0.2.0 | ticket AC #10 | ✅ `PimsCommonMapperV2.mapReferencedDocument` maps only typeCode/identifier/issueDateTime | CONSISTENT |
| Fixture matches backend payload shape | backend samples ✅ | ✅ `notification-submitted-from-backend.json` adds referenceDocument with split urlIds | CONSISTENT |
| PIMS v2 carries referenceDocument entries | backend populates ✅ | ✅ `PimsPayloadMapperTest.mapToV2` asserts two entries | CONSISTENT |
| PIMS v1 still omits referenceDocument | ticket scope | ✅ v1 test asserts key absent | CONSISTENT |
| Transport doc `urlId` null | backend ✅ | ✅ `PimsTransportMapperV2Test` updated | CONSISTENT |

## Missing Changes

*None identified.* Gateway role is accept-and-forward; no mapper logic changes beyond test and inbound type alignment were required.

## Unique Changes

- **`ReferencedDocument` urlId field** — additive inbound field on the GBN-AG event model; intentionally not forwarded to PIMS (documented in `PimsPayloadMapperTest` comments). Scope-appropriate for gateway.
- **Integration fixture update** — `notification-submitted-from-backend.json` gains two referenceDocument entries mirroring backend mapper test data (ITAHC/856 + LOA/GBN1). Gateway-only test asset.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Gateway ReferencedDocument shape matches backend field order, accepts urlId inbound, and correctly strips it for PIMS v0.2.0 while forwarding typeCode, identifier, and issueDateTime.
