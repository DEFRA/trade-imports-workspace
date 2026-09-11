# Repository Review: trade-imports-animals-tests

**PR:** #187
**Commit:** b23e6d00728669a023508fcf8eacce02ef663b1b
**Files Changed:** 4

## Summary
This PR keeps the tests repo's domain models (`domain/models/api/notification.ts`,
`domain/models/db/notification-document.ts`) in step with the backend/frontend
field additions, and extends two e2e specs to assert the new fields reach the
persisted document: `frontend-seed-context.spec.ts` (one-line addition for the
empty-`regionOfOriginCode` seeded case) and
`persistence-notification.spec.ts` (assertions for `regionOfOriginCode`,
`purposeInInternalMarket`, the four transport fields, and `animalIdentifiers`).

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `domain/models/api/notification.ts` | RISKY | 1 | 0 | 0 |
| `domain/models/db/notification-document.ts` | RISKY | 1 | 0 | 0 |
| `tests/e2e/features/admin/frontend-seed-context.spec.ts` | SAFE | 0 | 0 | 0 |
| `tests/e2e/journeys/persistence/persistence-notification.spec.ts` | SAFE | 0 | 0 | 0 |

(Critical counts above are de-duplicated — the aggregator's raw per-file JSON
counted a `file-review-add-item.sh` double-write against each of these two
files; the duplicate item in each was marked `Won't Fix` in `items.json`,
see Items below.)

## Positive Observations
- `persistence-notification.spec.ts`'s new assertions trace every expected
  value back through the actual journey fixture (`flows/journey.ts`) rather
  than asserting an arbitrary literal — e.g. `FR-75` is shown to come from
  country `FR` + region-code fill `'75'`, and `transitedCountries` ordering
  is shown to follow `addCountry()` call order.
- `frontend-seed-context.spec.ts`'s new assertion correctly asserts an
  *empty* `regionOfOriginCode` for its scenario (region-code requirement
  answered `no`), complementing the positive-value assertion in
  `persistence-notification.spec.ts` rather than duplicating it.

## Test Coverage
- Domain-model typing: present for every field in the ticket's scope list,
  including the pre-existing `microchip` scalar kept in step on `SpeciesEntry`.
- E2E persistence coverage: present for `regionOfOriginCode`,
  `purposeInInternalMarket`, and all four transport fields, but **absent**
  for `destinationCountry`, `portOfExit`, and `exitDate` — the consistency
  review flags this as the one cross-repo gap in this ticket (see below).
  These are the same three fields the ticket's own AC calls out as needing
  extra guarding, because the pre-existing frontend fixture didn't
  previously catch their absence either.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** The Critical findings mirror the same cross-repo AC gap already flagged in the backend and frontend repos (`AnimalIdentifier`/`StoredAnimalIdentifier` missing `identificationDetails`/`description`) — a real gap, but not something unique to this repo's own code. The e2e coverage gap for `destinationCountry`/`portOfExit`/`exitDate` is worth a quick check with the author (deliberate scoping vs. oversight) but is low risk on its own, since domain typing and backend/frontend wiring are all already in place and unit-tested.

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | domain/models/api/notification.ts | 55 | Critical | ac-gap | AnimalIdentifier only adds tattoo/horseName/permanentAddress of the 5 per-unit fields the AC requires (tattoo, horse name, identification details, description, permanent address) — animalIdentifierIdentificationDetails and animalIdentifierDescription have no slot, so tests can never assert either reaches the aggregate. | Add identificationDetails and description (or the equivalent wire names used by the frontend/backend PRs for this ticket) to AnimalIdentifier so the AC's full per-unit field set is representable. | Won't Fix | — | Won't Fix — these fields were removed as part of EUDPA-500, so it looks like the ticket hadn't caught up with that change. |
| 2 | domain/models/api/notification.ts | 55 | Critical | ac-gap | AnimalIdentifier only adds tattoo/horseName/permanentAddress of the 5 per-unit fields the AC requires (tattoo, horse name, identification details, description, permanent address) — animalIdentifierIdentificationDetails and animalIdentifierDescription have no slot, so tests can never assert either reaches the aggregate. | Add identificationDetails and description (or the equivalent wire names used by the frontend/backend PRs for this ticket) to AnimalIdentifier so the AC's full per-unit field set is representable. | Won't Fix | — | Duplicate of item 1 (file-review-add-item.sh double-write noted by the reviewing agent) |
| 3 | domain/models/db/notification-document.ts | 28 | Critical | missing-field | StoredAnimalIdentifier omits animalIdentifierIdentificationDetails and animalIdentifierDescription — AC requires all 5 per-unit identifier fields (tattoo, horse name, identification details, description, permanent address) reach the aggregate, but only 3 are modelled here; the same 2 fields are also missing from the companion frontend (PR 300) and backend (PR 94) AnimalIdentifier types, so this is a cross-repo gap, not just a test-type oversight | Add identificationDetails and description to StoredAnimalIdentifier (and flag the same gap in the companion frontend/backend PRs' AnimalIdentifier types) so the round-trip type and assertions can cover all 5 AC fields | Won't Fix | — | Won't Fix — these fields were removed as part of EUDPA-500, so it looks like the ticket hadn't caught up with that change. |
| 4 | domain/models/db/notification-document.ts | 28 | Critical | missing-field | StoredAnimalIdentifier omits animalIdentifierIdentificationDetails and animalIdentifierDescription - AC requires all 5 per-unit identifier fields (tattoo, horse name, identification details, description, permanent address) but only 3 are modelled; same 2 fields are missing from the companion frontend PR 300 and backend PR 94 AnimalIdentifier types too | Add identificationDetails and description to StoredAnimalIdentifier and flag the same gap upstream in the frontend/backend PRs' AnimalIdentifier types | Won't Fix | — | Duplicate of item 3 (file-review-add-item.sh double-write noted by the reviewing agent) |

## Repository Verdict
**Status:** NEEDS ATTENTION
