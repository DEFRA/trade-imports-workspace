# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-310
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-tests (+ manual: trade-imports-schemas, workspace openspec)
**PR:** #5 | **Commit:** 8c589a26

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `GbnAgReferencedDocument` type shape | backend emitted JSON ✅ | ✅ Adds `urlId`, `issueDateTime`, `referenceDocument[]` on exchangedDocument | CONSISTENT |
| No `referenceDocument` when no uploads | backend ✅ | ✅ `not.toHaveProperty('referenceDocument')` on baseline journey | CONSISTENT |
| Scanned doc → coded entry on submit | backend ✅ | ✅ E2E uploads VHC, waits for scan, asserts Mongo outbox | CONSISTENT |
| `typeCode` `853` for VETERINARY_HEALTH_CERTIFICATE | backend switch ✅, codelist ✅ | ✅ Asserted (branch tip uses UNTDID urlId) | CONSISTENT |
| `urlId` provenance | backend ✅, schemas ✅ | ✅ `https://vocabulary.uncefact.org/DocumentCodeList` for UNTDID code 853 | CONSISTENT |
| Date-only `issueDateTime` | backend `issueDate()` ✅ | ✅ `'2026-01-03'` from `03/01/2026` input | CONSISTENT |
| Virus-scan wait before submit | backend filter ✅ | ✅ Waits for "Check completed" tag | CONSISTENT |
| All GBN-AG event types covered | ticket AC #7 | ❌ Only `NotificationSubmitted` tested | EXPECTED gap (test scope) |
| Openspec coverage links | workspace openspec ✅ | ✅ New E2E maps to REQ-EVENTS-003 | CONSISTENT |

*Note: cached PR diff shows always-Defra urlId; branch tip `a6f0f98` asserts UNTDID urlId for code 853, matching backend branch tip.*

## Missing Changes

- **Other GBN-AG event types** — ticket AC #7 requires the same referenceDocument behaviour on created, edited, amended, deleted, etc. Backend implements via shared `OutboxService.appendEvent`, but E2E only proves `NotificationSubmitted`. Not a cross-repo code inconsistency, but a test coverage gap relative to ticket AC.

## Unique Changes

- **`AnimalsJourney.submitNotificationWithDocument()`** — new journey helper: upload document, wait for virus scan, submit. Test infrastructure unique to ins-tests; enables end-to-end proof of backend outbox population.
- **`AccompanyingDocumentAnswer` type** — documents the contract between journey helper and page object (reference, issueDate, filePath, type code).

## Verdict

**Status:** CONSISTENT
**Issues:** 0 cross-repo inconsistencies found (1 test-coverage gap vs ticket AC on other event types)
**Summary:** E2E type model and assertions match backend emitted values at branch tip; baseline and document-upload scenarios align with omit-when-empty and scan-complete rules.
