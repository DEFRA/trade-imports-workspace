# Consistency Check: trade-imports-animals-backend

**Ticket:** EUDPA-777
**All repos in scope:** trade-imports-animals-frontend, trade-imports-animals-backend, trade-imports-ins-tests, trade-imports-schemas, trade-imports-address-book, trade-imports-workspace
**PR:** #124 | **Commit:** a156d8ad

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Remove `typeOfCommodity` from stored notification model | frontend ✅ (mapper), ins-tests ✅ (TS types) | ✅ `Commodity` / `Species` fields removed | CONSISTENT |
| GBN-AG trade line omits `typeCode` / `urlId` | frontend ✅, schemas ✅ (docs) | ✅ `TradeLineItem` no longer carries or populates them | CONSISTENT |
| Legacy notifications with stored type still submit | frontend ⚠️ (not covered — agreed gap per ticket comment) | ✅ `NotificationIT.putAndSubmit_shouldSucceedAndShedTypeOfCommodity_*` | CONSISTENT (asymmetric test coverage only) |
| Schema docs: live animals do not send `typeCode` | schemas ✅ | N/A (implementation matches) | CONSISTENT |

## Missing Changes

*None identified.* No peer repo still expects `typeOfCommodity` on the animals API surface.

## Unique Changes

`NotificationIT` legacy shed test and removal of `typeCodeFor` precedence — backend-only; matches ticket AC for cattle and in-flight Mongo documents.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `typeOfCommodity` vs GBN-AG `typeCode` | Both removed from the live-animals path; Java record no longer models `urlId` on trade lines (live animals never sent a codelist URL) | Align with schema optional fields | ✅ Omission on wire, not a second name |

*No dual naming left in this repo (searched pinned clone).*

## Statements Made Untrue

*None identified (searched: `typeOfCommodity`, `typeCodeFor`, `commodityType`, `typeCode`, `Domestic`, `Game`).*

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Backend drops storage and GBN-AG mapping of commodity type in step with the frontend and ins-tests model tidy.
