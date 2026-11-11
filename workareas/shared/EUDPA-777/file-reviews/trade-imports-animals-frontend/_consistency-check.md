# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-777
**All repos in scope:** trade-imports-animals-frontend, trade-imports-animals-backend, trade-imports-ins-tests, trade-imports-schemas, trade-imports-address-book, trade-imports-workspace
**PR:** #470 | **Commit:** 54a60d09

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Remove journey `commodityType` (obligation, seed, fulfilment) | — (frontend-only) | ✅ Removed | CONSISTENT |
| Remove `typeOfCommodity` from notification payload | backend ✅, ins-tests ✅ | ✅ Mapper no longer sets it | CONSISTENT |
| Delete Domestic/Game table and `typeIdFor` / `typeTextForId` | — (frontend-only) | ✅ Deleted | CONSISTENT |
| GBN-AG trade line omits `typeCode` | backend ✅ (stops populating) | ✅ Not mapped | CONSISTENT |
| Schema/docs: `typeCode` not journey-sourced | schemas ✅ | N/A | CONSISTENT |

## Missing Changes

*None identified.* Ticket scope for this repo is fully covered; `openspec/` had no live-animals type scenarios (per ticket).

## Unique Changes

Removal of `commodityType` obligation `22071829-2a3b-4e5f-8cde-28f9a0b1c2d4`, characterisation oracle entries, and `type-text-for-line.js` — all frontend-only and intentional per ticket.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| Journey → API → GBN-AG | Was `commodityType` → `typeOfCommodity` → `typeCode`; all three layers drop the concept in this PR set | One name per concept end to end | ✅ Removed at each layer consistently |

*No dual naming left in this repo (searched pinned clone).*

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|

*None identified (searched: `commodityType`, `typeOfCommodity`, `typeTextForLine`, `typeIdFor`, `TYPES_BY_CODE`, `Domestic`, `Game`, `22071829-2a3b`).* `persistence.md` and `sets/live-animals/docs/services.md` were updated in the diff.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Frontend removes derivation, storage and mapping of commodity type in line with backend and tests repo changes.
