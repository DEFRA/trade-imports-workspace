# Repository Review: trade-imports-animals-frontend

**PR:** #300
**Commit:** 68cb6bc9010549efa074e06aa08545e6e111886d
**Files Changed:** 10

## Summary
This PR wires every field the ticket scopes to the frontend mapper:
`origin.regionOfOriginCode`, `purposeInInternalMarket`, `destinationCountry`,
`portOfExit`, `exitDate`, the four `transport.js` fields
(`meansOfTransport`/`transportIdentification`/`transportDocumentReference`/
`transitedCountries`), and the per-unit animal-identifier scalar-to-array fix
in `species-entry.js`. It also extracts a shared `to-wire-address.js` module
(with its own test) out of `party-inline.js` so `species-entry.js`'s new
`permanentAddress` mapping can reuse the same journey→wire address
translation, and extends `notification-mapper.test.js`'s gap-documentation
fixture for `destinationCountry`/`portOfExit`/`exitDate` exactly as the
ticket's last scope bullet and AC require.

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/server/app/services/address-book/to-wire-address.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/address-book/to-wire-address.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/services/persistence/records/mapper-a-contract.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/mapper-a/sections/direct-fields.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/mapper-a/sections/origin.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/mapper-a/sections/transport.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/notification-mapper.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/shared/lines/species-entry.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-inline.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/fixtures/characterisation-oracles.json` | RISKY | 1 | 0 | 0 |

## Positive Observations
- `species-entry.js`'s new `animalIdentifierFrom` and `permanentAddressFrom`
  are exercised by a genuinely new `notification-mapper.test.js` describe
  block covering multi-unit fixtures, not just a happy-path retrofit.
- The `to-wire-address.js` extraction is a real improvement, not just a
  refactor for its own sake — the shared module preserves unrecognised
  ISO-alpha-2 country codes on the round trip via a fallback the old inline
  `party-inline.js` version silently dropped.
- `transport.js`'s new `unlessBlank` guard is backed by an inline comment
  explaining exactly which frontend validators allow a blank save
  (`meansOfTransport` uses the permissive `oneOf`, not `requiredOneOf`,
  despite being marked mandatory), and has its own dedicated test block.

## Test Coverage
- Unit tests: Present and thorough — `notification-mapper.test.js`,
  `mapper-a-contract.test.js`, and `to-wire-address.test.js` all extended/added
  with specific `toEqual`/`toBe` assertions (per
  `docs/best-practices/node/testing/frontend.md`), not loose mock-interaction
  checks.
- Integration/characterisation tests: Present, but with the gap below — the
  `characterisation-oracles.json` fixture's per-unit animal-identifier
  coverage stops at 4 of the 6 modelled fields and covers none of the two
  AC-required fallback fields (`identificationDetails`/`description`), because
  those two fields have no obligation or mapper wiring anywhere in this repo
  (confirmed via repo-wide grep).

## Risk Assessment
**Overall Risk:** Low
**Rationale:** All in-scope wiring for this PR's actual diff is correct, tested, and consistent with the backend/tests repos; the one Critical finding is a genuine AC gap (2 of 5 per-unit identifier fields have no obligation/mapper home anywhere in the frontend) rather than a defect in the code that was written.

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/server/app/services/address-book/to-wire-address.test.js | 5 | Minor | naming | describe block uses 'toWireAddress' rather than the '#functionName' convention the testing best-practices doc specifies for pure-function unit tests | Rename to describe('#toWireAddress', ...) |  |  |  |
| 2 | src/server/app/sets/live-animals/journeys/linear/fixtures/characterisation-oracles.json | 808 | Critical | broken-ac | The 'comprehensive' scenario's animalIdentifiers array (and its input fixture at ~656-674) exercises only 4 of the 6 per-unit identifier fields the mapper now maps (microchip, passport, tattoo, earTag, horseName, permanentAddress) and none of the two AC-required fallback fields animalIdentifierIdentificationDetails / animalIdentifierDescription — a repo-wide grep finds no obligation of either name anywhere in src/server/app, so AC 'Each per-unit identifier field (tattoo, horse name, identification details, description, permanent address) reaches the aggregate when entered' is unimplemented, not just untested. | Either add the missing animalIdentifierIdentificationDetails/animalIdentifierDescription obligations + mapper wiring (in identifiers.js / species-entry.js) and extend this fixture's animalIdentifiers units to cover them, or split this AC point into a follow-up ticket and note the gap in EUDPA-368's description/AC. |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
