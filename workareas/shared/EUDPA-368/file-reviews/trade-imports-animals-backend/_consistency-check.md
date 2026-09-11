# Consistency Check: trade-imports-animals-backend

**Ticket:** EUDPA-368
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-animals-tests
**PR:** #94 | **Commit:** 308ec55

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `Origin.regionOfOriginCode` new field | frontend ✅ (`origin.js`), tests ✅ (`notification.ts`, `notification-document.ts`, e2e specs) | ✅ Present (`Origin.java`, `NotificationCopyMapper`, `NotificationService`) | CONSISTENT |
| `purposeInInternalMarket` new field | frontend ✅ (`direct-fields.js`), tests ✅ (domain models + persistence spec) | ✅ Present (`NotificationBase.java`, copy/service/controller) | CONSISTENT |
| `destinationCountry` new field | frontend ✅ (`direct-fields.js`, gap fixture), tests ⚠️ domain model only — no e2e assertion | ✅ Present (`NotificationBase.java`, copy/service/controller) | CONSISTENT (this repo); see tests repo gap |
| `portOfExit` new field | frontend ✅, tests ⚠️ domain model only — no e2e assertion | ✅ Present, and copy-mapper explicitly *retains* it (commented rationale) unlike the other reasonForImport-conditional fields | CONSISTENT (this repo); see tests repo gap |
| `exitDate` new field | frontend ✅, tests ⚠️ domain model only — no e2e assertion | ✅ Present, and copy-mapper explicitly *omits* it (reset on copy, like `arrivalDate`) | CONSISTENT (this repo); see tests repo gap |
| `Species.animalIdentifiers` (per-unit list) | frontend ✅ (`species-entry.js` builds full list), tests ✅ (`SpeciesEntry.animalIdentifiers`, `StoredAnimalIdentifier`) | ✅ Present (`AnimalIdentifier.java`, `Species.animalIdentifiers`), with controller test covering multi-unit round trip | CONSISTENT |
| `AnimalIdentifier.permanentAddress` typed as `ConsignmentParty` | frontend ✅ maps via `toWireAddress`/`permanentAddressFrom` to `name`/`phone`/`email`/`address` shape | ✅ Present, field typed `ConsignmentParty` | CONSISTENT |
| `meansOfTransport`, `transportIdentification`, `transportDocumentReference`, `transitedCountries` | frontend ✅ now wires these (`transport.js`) | N/A — per the ticket these `Transport.java` fields already existed; no backend change needed/shown in this diff | CONSISTENT (expected — backend was already the passthrough) |
| Test coverage for new fields | — | ✅ New `NotificationControllerTest` case + `NotificationCopyMapperTest` retain/omit cases + `Origin` constructor updated across all existing IT/unit tests | CONSISTENT |

## Missing Changes

*None identified.* Every field this repo needed to add has a corresponding home in the frontend mapper and (where relevant) the tests-repo domain types.

## Unique Changes

- `NotificationCopyMapper` carries deliberate, individually-commented retain/omit decisions for `portOfExit` (retained, unlike other logistics fields) and `exitDate` (omitted, like `arrivalDate`) — these are backend-only judgement calls with no frontend or tests-repo counterpart needed, since copy behaviour is entirely server-side. Intentional, well-documented, not suspicious.
- Broad mechanical test-file changes (`Origin` constructor now takes 4 args instead of 3) across many unrelated IT/unit test files — expected fallout of adding a field to a record-like constructor, not a scope concern.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found in this repo (1 cross-repo gap flagged against `trade-imports-animals-tests`, not this repo)
**Summary:** All backend model/mapper/service changes needed to support the ticket's field list are present and paired with frontend wiring and backend test coverage; the only gap identified in this analysis belongs to the tests repo's e2e assertions, not to this repo.
