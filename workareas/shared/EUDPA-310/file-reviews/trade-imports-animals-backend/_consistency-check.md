# Consistency Check: trade-imports-animals-backend

**Ticket:** EUDPA-310
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-tests (+ manual: trade-imports-schemas, workspace openspec)
**PR:** #101 | **Commit:** ed6ba7be

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `ReferencedDocument` field order (`typeCode`, `urlId`, `relationshipTypeCode`, `identifier`, `issueDateTime`) | dynamics-gateway ✅ | ✅ Present | CONSISTENT |
| 14 document-type codes from codelist | schemas ✅, frontend ✅ (14 enum values) | ✅ Exhaustive switch + parameterized test | CONSISTENT |
| `urlId` per code provenance (UNTDID vs Defra) | schemas ✅, ins-tests ✅, gateway fixture ✅ | ✅ UNTDID for numeric codes, Defra for `GBN*` | CONSISTENT |
| Virus-scan filter (`ScanStatus.COMPLETE` only) | ins-tests E2E ✅ | ✅ Repository query in `OutboxService` | CONSISTENT |
| Omit `referenceDocument` key when empty | ins-tests ✅, gateway v1 test ✅ | ✅ Returns `null`, `@JsonInclude(NON_NULL)` | CONSISTENT |
| Transport docs keep `urlId` null | gateway transport tests ✅ | ✅ `transportDocument()` unchanged | CONSISTENT |
| PIMS drops `urlId` on forward | gateway ✅ | N/A (source) | CONSISTENT |
| Codelist entry shape (code/label/description only) | schemas ❌ has `codeList` | N/A | INCONSISTENT vs ticket AC |
| Ticket AC: `urlId` always Defra codelist `$id` | ticket AC | ❌ Split by code family | INCONSISTENT vs ticket AC |

*Note: cached PR diff predates branch tip `e34373d`, which uses split `urlId` logic; branch tip aligns with schemas and E2E, not the always-Defra-urlId shape in the cached diff.*

## Missing Changes

*None identified in-repo.* Backend population of `referenceDocument` is the authoritative source for downstream repos and is present.

## Unique Changes

- **Outbox population logic** — `AccompanyingDocumentRepository.findAllByNotificationReferenceNumberAndScanStatusOrderByCreatedAsc` and wiring through `OutboxService` → `GbnAgEventDataMapper` → `ReferencedDocument.accompanyingDocument()`. Unique to backend; expected per ticket scope.
- **Exhaustive `DocumentType` → typeCode switch** — pins all 14 codes; compile-time guard when a type is added. Backend-only; peers consume emitted values rather than re-implementing the map.
- **`ReferencedDocument` gains `urlId` on transport constructor call** — inserts `null` urlId between typeCode and relationshipTypeCode; keeps field order aligned with gateway record.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 2 inconsistencies found (1 cross-repo vs ticket AC on codelist shape; 1 implementation vs ticket AC text on always-Defra `urlId`)
**Summary:** Backend codes, field order, scan filter, and split urlId logic align with schemas, gateway, and E2E at branch tip, but diverge from ticket AC wording on codelist entry shape and fixed Defra-only `urlId`.
