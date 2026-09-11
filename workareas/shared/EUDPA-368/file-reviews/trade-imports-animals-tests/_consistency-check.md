# Consistency Check: trade-imports-animals-tests

**Ticket:** EUDPA-368
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-animals-tests
**PR:** #187 | **Commit:** b23e6d0

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `Origin.regionOfOriginCode` | backend ✅, frontend ✅ | ✅ Present — `domain/models/api/notification.ts`, `domain/models/db/notification-document.ts`, and an e2e assertion in `persistence-notification.spec.ts` (`expect(notification.origin.regionOfOriginCode).toBe('FR-75')`) | CONSISTENT |
| `purposeInInternalMarket` | backend ✅, frontend ✅ | ✅ Present — domain model + e2e assertion (`expect(notification.purposeInInternalMarket).toBe('breeding')`) | CONSISTENT |
| `destinationCountry` | backend ✅ (`NotificationBase.java`, controller test), frontend ✅ (mapper wiring + gap-fixture assertion) | ⚠️ Domain model only (`notification.ts`, `notification-document.ts`) — **no e2e assertion** in `persistence-notification.spec.ts` | INCONSISTENT |
| `portOfExit` | backend ✅, frontend ✅ | ⚠️ Domain model only — **no e2e assertion** | INCONSISTENT |
| `exitDate` | backend ✅, frontend ✅ | ⚠️ Domain model only — **no e2e assertion** | INCONSISTENT |
| `meansOfTransport`, `transportIdentification`, `transportDocumentReference`, `transitedCountries` | backend: pre-existing; frontend ✅ now wires them | ✅ e2e assertions added for all four in `persistence-notification.spec.ts` | CONSISTENT |
| `Species.animalIdentifiers` (per-unit list) | backend ✅, frontend ✅ | ✅ Present — `AnimalIdentifier`/`StoredAnimalIdentifier` types added, plus e2e assertion `expect(species.animalIdentifiers).toEqual([{ earTag: ..., passport: '' }])` | CONSISTENT |
| `microchip` on `SpeciesEntry` | backend: pre-existing on `Species.java`; frontend: pre-existing scalar mapping | ✅ Type added to keep the domain model in step | CONSISTENT |
| `frontend-seed-context.spec.ts` updated for new origin field | — | ✅ `regionOfOriginCode: ''` added to the expected seeded doc | CONSISTENT |

## Missing Changes

- **`destinationCountry`, `portOfExit`, `exitDate` — no e2e round-trip assertion.** Both `NotificationBase.java` (backend) and `direct-fields.js` (frontend) now carry these three fields end to end, and the frontend's own `notification-mapper.test.js` gap fixture was extended per the ticket's explicit AC to guard them at the mapper-unit level. `tests/e2e/journeys/persistence/persistence-notification.spec.ts` was touched in this same PR to add e2e assertions for the sibling fields introduced by this ticket (`regionOfOriginCode`, `purposeInInternalMarket`, the four transport fields, `animalIdentifiers`) but stops short of asserting `destinationCountry`/`portOfExit`/`exitDate` reach the persisted document over the real API. The domain types (`notification.ts`, `notification-document.ts`) do already model all three fields, so the gap is specifically in e2e assertion coverage, not typing. Given the ticket's own AC calls out `destinationCountry`/`portOfExit`/`exitDate` as needing extra guarding (because the pre-existing frontend fixture didn't previously catch their absence), the same rationale for the mapper-unit test extension arguably applies to this repo's persistence e2e spec — worth confirming with the author whether it was scoped out deliberately (e.g. deferred to a follow-up assertion) or simply missed.

## Unique Changes

*None identified.* Every change in this repo's diff is either a domain-type addition mirroring a backend/frontend field or an e2e assertion for a field introduced elsewhere in this ticket.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 inconsistency found (missing e2e assertions for `destinationCountry`, `portOfExit`, `exitDate` in `persistence-notification.spec.ts`, despite domain types and sibling-field e2e coverage being present)
**Summary:** Domain-model typing is complete and consistent with backend/frontend, but e2e persistence-round-trip coverage was added for every new field in this ticket except `destinationCountry`, `portOfExit` and `exitDate` — the same three fields the ticket flagged as needing extra test guarding.
