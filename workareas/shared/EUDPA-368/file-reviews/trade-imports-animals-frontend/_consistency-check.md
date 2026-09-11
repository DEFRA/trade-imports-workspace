# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-368
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-animals-tests
**PR:** #300 | **Commit:** 68cb6bc

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `Origin.regionOfOriginCode` | backend ✅ (`Origin.java`), tests ✅ | ✅ Present (`origin.js` now reads `regionCode` obligation) | CONSISTENT |
| `purposeInInternalMarket`, `destinationCountry`, `portOfExit`, `exitDate` | backend ✅ (`NotificationBase.java`), tests ⚠️ domain model only | ✅ Present (`direct-fields.js`); AC-required gap-fixture assertions for all three of `destinationCountry`/`portOfExit`/`exitDate` added in `notification-mapper.test.js` | CONSISTENT (this repo); see tests repo gap |
| `meansOfTransport`, `transportIdentification`, `transportDocumentReference`, `transitedCountries` | backend: fields already existed on `Transport.java` (no diff needed) | ✅ Present (`transport.js`), with `unlessBlank` guard for the arrival-details page's `''`-on-unanswered behaviour | CONSISTENT |
| `Species.animalIdentifiers` (per-unit list) | backend ✅ (`AnimalIdentifier.java`), tests ✅ (`SpeciesEntry.animalIdentifiers`) | ✅ Present (`species-entry.js`), scalar `earTag`/`passport`/`microchip` deliberately kept first-unit-only alongside the new full list (commented rationale: an in-tree hop-2 GBN-AG mapper still reads the scalars) | CONSISTENT |
| `permanentAddress` journey→wire address translation | backend ✅ (`AnimalIdentifier.permanentAddress: ConsignmentParty`) | ✅ Present — new shared `to-wire-address.js` extracted from `party-inline.js` and reused by `species-entry.js`'s `permanentAddressFrom` | CONSISTENT |
| Contract test (`mapper-a-contract.test.js`) updated for new fields | — | ✅ Updated with `purposeInInternalMarket`, `regionOfOriginCode`, transport fields, `animalIdentifiers` | CONSISTENT |
| Characterisation fixture (`characterisation-oracles.json`) updated | — | ✅ Updated across three fixture cases | CONSISTENT |

## Missing Changes

*None identified.* This repo's diff covers every field in the ticket's scope list (region code, purpose-in-internal-market, destination country, port of exit, exit date, the 4 transport fields, the per-unit animal-identifier fields including the scalar-to-array `species-entry.js` fix) and extends `notification-mapper.test.js`'s gap fixture exactly as the ticket's last bullet requires.

## Unique Changes

- Extraction of `toWireAddress` out of `party-inline.js` into a new shared `services/address-book/to-wire-address.js` module (with its own test file), so `species-entry.js`'s `permanentAddressFrom` can reuse the same country-name→code translation for the one address path (`permanentAddress`) that bypasses `answerForInlineParty` and stores journey-shaped address fields directly. This is a frontend-internal refactor with no backend or tests-repo counterpart needed — the wire shape it produces is what the backend already expects via `ConsignmentParty`. Intentional and justified by the inline comment (avoids postcode/phone/email being silently dropped by the backend's unknown-property tolerance).
- `unlessBlank` guard in `transport.js` for the arrival-details page's `''`-for-unanswered behaviour — frontend-only concern, has a dedicated new test (`Mapper A — unanswered transport fields`), no backend counterpart needed since this is about what the frontend sends, not what the backend accepts.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found in this repo (1 cross-repo gap flagged against `trade-imports-animals-tests`, not this repo)
**Summary:** Every field the ticket scopes to this repo is wired, and the required gap-fixture assertions for `destinationCountry`/`portOfExit`/`exitDate` are present; the only related gap found in this analysis is in `trade-imports-animals-tests`'s e2e coverage, not here.
