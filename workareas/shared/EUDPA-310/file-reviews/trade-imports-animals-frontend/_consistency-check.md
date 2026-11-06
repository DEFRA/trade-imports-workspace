# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-310
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-tests (+ manual: trade-imports-schemas, workspace openspec)
**PR:** #380 | **Commit:** e338bd93

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| 14 selectable document types | backend `DocumentType` enum ✅ (14), schemas codelist ✅ (14) | ✅ `offeredDocumentTypes()` returns full service list | CONSISTENT |
| `HEALTH_CERTIFICATE` offered to traders | ticket AC #6 | ✅ Removed `NOT_OFFERED` filter | CONSISTENT |
| Document type enum codes match backend | backend ✅ | ✅ Same 14 codes in `stub.js` / `DocumentType` | CONSISTENT |
| E2E uploads `VETERINARY_HEALTH_CERTIFICATE` | ins-tests ✅ | ✅ Type available in select | CONSISTENT |
| Serve types from schemas codelist | schemas codelist exists | ❌ Still reads `stub.js` fixture | EXPECTED (EUDPA-430) |
| `referenceDocument` / GBN-AG event population | backend ✅ | N/A (frontend scope) | EXPECTED |
| Openspec REQ-DOCS-013 (fourteen types) | workspace openspec ✅ | ✅ Matches | CONSISTENT |

## Missing Changes

*None identified.* Frontend scope for EUDPA-310 is limited to offering all fourteen types; no backend or gateway changes are expected here.

## Unique Changes

- **`document-type-options.js`** — drops design-release-1 exclusion of `HEALTH_CERTIFICATE`; now offers all service-backed types. Intentional per ticket AC #6.
- **Test updates** — controller, fit, and validate tests updated from thirteen to fourteen types; tamper test uses `NOT_A_DOCUMENT_TYPE` instead of the previously excluded real type. Frontend-only test alignment.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Frontend now exposes all fourteen document types matching backend enum and schemas codelist labels; fixture-backed list remains (EUDPA-430) but values align.
