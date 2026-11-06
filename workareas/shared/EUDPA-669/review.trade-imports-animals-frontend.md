# Repository Review: trade-imports-animals-frontend

**PR:** #432  
**Commit reviewed:** `57aa13e37137817a1fabab53774d412174a98500`  
**Files Changed:** 17

## Summary

Mapper A emits `commodities[]` with name, `commodityCode`, stubbed MDM `description`, type rules, and species including `commonName`. Commodity reference facade, grouping helpers, list marshalling, and characterisation oracles are updated. Prior list-projection gap is resolved on this branch.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `scripts/regenerate-mapper-a-oracles.mjs` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/mapper-a-contract.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/commodity-field-for-list-row.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/commodity-reference.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/mapper-a/commodity.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/mapper-a/sections/notification.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/notification-mapper.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/services/persistence/records/notification-mapper/shared/lines/group-by-commodity.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/shared/lines/species-entry.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/shared/lines/species-lines.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/shared/lines/type-text-for-line.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/real/marshal/list-item.js` | SAFE | 0 | 1 | 0 |
| `src/server/app/services/persistence/records/real/marshal/list-item.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/real/real.requests.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/fixtures/characterisation-oracles.json` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/services/commodities/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/services/commodities/stub.js` | SAFE | 0 | 0 | 0 |

## Positive Observations

- Clear separation of list label (`commodityFieldForListRow`) from persistence mapper.
- Mixed-type handling and multi-commodity grouping are well tested.
- Stub `COMMODITY_DESCRIPTIONS` documents the future reference-data contract.

## Test Coverage

- **Unit tests:** Strong — mapper, contract, list marshal, real adapter.
- **Integration tests:** No new FIT/E2E in this repo; run ins-tests animals domain after merge.

## Risk Assessment

**Overall Risk:** Low  
**Rationale:** Save and list paths are covered; descriptions are stubbed until live MDM lookup.

## Items

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/server/app/services/persistence/records/notification-mapper/notification-mapper.test.js | 167 | Minor | coverage-gap | No test for mixed commodity types on one selection (type on species, not entry). | AC for Game+Domestic on same Cow is covered by a mapper test asserting species[].typeOfCommodity. | add one grouped-lines variant with two types under Cow. | Auto-Resolved | — | Mixed-type mapper test on branch |
| 2 | src/server/app/services/persistence/records/real/marshal/list-item.js | 15 | Major | correctness | Dashboard list reads commodities from GET /notifications but backend list projection still exposes only legacy commodity. | list rows show commodity label after save when Mongo holds commodities[] and commodity is null. | extend NotificationView/NotificationViewData to expose commodities (or a derived label) and keep commodityFieldForListRow; add an integration test on list marshal. | Auto-Resolved | — | NotificationView commodities + list-item.test |

## Repository Verdict

**SAFE** — no open fix items.
