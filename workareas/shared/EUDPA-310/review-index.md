# Code Review: EUDPA-310

**Ticket:** Define a Defra-managed codelist for GBN-AG document types and send it on GBN-AG events
**Reviewer:** Cursor Agent
**Date:** 2026-10-07
**Verdict:** PASS WITH NOTES

## Summary

EUDPA-310 closes the long-standing gap where `exchangedDocument.referenceDocument` was always `null` despite accompanying documents being collected and persisted. The implementation populates one entry per virus-scanned document on every GBN-AG outbox event, with `typeCode` from the fourteen-type codelist, `urlId` pinned to the Defra list, and date-only `issueDateTime`. The schemas work landed in [trade-imports-schemas#59](https://github.com/DEFRA/trade-imports-schemas/pull/59) (merged); four service PRs remain open and are internally consistent.

## Repositories Analyzed

| Repository | PR | Head commit | Files | Verdict | Review |
|------------|-----|-------------|-------|---------|--------|
| trade-imports-schemas | [#59](https://github.com/DEFRA/trade-imports-schemas/pull/59) (merged) | `6903b90` | 13 | SAFE | *(merged — reviewed against `main`)* |
| trade-imports-animals-backend | [#101](https://github.com/DEFRA/trade-imports-animals-backend/pull/101) | `ed6ba7b` | 9 | SAFE | [review.trade-imports-animals-backend.md](review.trade-imports-animals-backend.md) |
| trade-imports-animals-frontend | [#380](https://github.com/DEFRA/trade-imports-animals-frontend/pull/380) | `e338bd9` | 5 | SAFE | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-dynamics-gateway | [#24](https://github.com/DEFRA/trade-imports-dynamics-gateway/pull/24) | `4eb7071` | 7 | SAFE | [review.trade-imports-dynamics-gateway.md](review.trade-imports-dynamics-gateway.md) |
| trade-imports-ins-tests | [#5](https://github.com/DEFRA/trade-imports-ins-tests/pull/5) | `8c589a2` | 3 | SAFE | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-workspace (`openspec/`) | branch `feat/EUDPA-310-document-type-codelist` | `eff8690` | — | — | No PR in set; spec commits present on workspace branch |

## Acceptance Criteria Check

| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | Codelist file with fourteen entries, code/label/description only | ✅ | Merged in schemas #59 |
| 2 | All codes strings; 916 for "Other" only | ✅ | Backend switch exhaustive; codelist wording correct post-#59 |
| 3 | Core `ReferencedDocument.urlId` optional; validate-schemas passes | ✅ | Merged in schemas #59 |
| 4 | GBN-AG profile requires `typeCode` + `urlId` with `const` | ✅ | Merged in schemas #59 |
| 5 | Samples carry codelist `urlId`; validate-samples passes | ✅ | Merged in schemas #59 |
| 6 | All fourteen types selectable in frontend | ✅ | `HEALTH_CERTIFICATE` restored in #380 |
| 7 | Every GBN-AG event carries scanned `referenceDocument[]` | ✅ | Shared `OutboxService` path; unit + IT coverage |
| 8 | Pending/rejected scans excluded | ✅ | `ScanStatus.COMPLETE` filter; IT proves REJECTED omitted |
| 9 | No documents → key omitted | ✅ | `@JsonInclude(NON_NULL)` + E2E assertion |
| 10 | PIMS v0.2.0 forwards typeCode/identifier/issueDateTime | ✅ | Gateway tests assert `urlId` stripped |
| 11 | `pims-data-mapping.md` updated | ✅ | Merged in schemas #59 |
| — | `openspec/` behaviour spec | ⚠️ | Commits on workspace branch; raise/merge workspace PR with service PRs |

## Test Coverage Assessment

- **Unit tests:** Strong — parameterized codelist mapping (`GbnAgMapperTest`), `OutboxServiceTest` wiring, gateway mapper tests
- **Integration tests:** `NotificationIT` proves COMPLETE-only filtering including REJECTED mutation probe
- **E2E tests:** New Mongo outbox assertion for uploaded document; no-document path omits key
- **Gap:** E2E only exercises `NotificationSubmitted` (see item #1 in ins-tests review)

## Configuration & Environment

- **New Environment Variables:** None
- **Database Changes:** New repository query method only (`findAllByNotificationReferenceNumberAndScanStatusOrderByCreatedAsc`)

## Risk Matrix

| Category | Risk Level |
|----------|------------|
| Correctness | Low |
| Code Quality | Low |
| Security | Low |
| Test Coverage | Low–Medium |

## Conclusion

The PR set correctly implements EUDPA-310 end-to-end. The core backend change is well-structured: scan filtering at outbox-write time, exhaustive type-to-code mapping, and null-not-empty semantics. One minor E2E coverage note remains (non-submit event types). Merge order: schemas already on `main`; then backend → gateway → frontend → ins-tests, with workspace `openspec/` PR alongside.

**Next:** `walk review EUDPA-310` to triage item #1.
