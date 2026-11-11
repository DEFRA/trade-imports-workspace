# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-777
**All repos in scope:** trade-imports-animals-frontend, trade-imports-animals-backend, trade-imports-ins-tests, trade-imports-schemas, trade-imports-address-book, trade-imports-workspace
**PR:** #94 | **Commit:** c49635f3

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Remove `typeOfCommodity` from notification document model | frontend ✅, backend ✅ | ✅ `notification-document.ts` and API `CommodityComplement` | CONSISTENT |
| E2E persistence asserts no commodity type on stored notification | frontend ✅, backend ✅ | ✅ `persistence-notification.spec.ts` full `commodities` shape without type | CONSISTENT |
| GBN-AG `typeCode` not asserted for animals commodity type | backend ✅ | ✅ (no animals spec asserted journey-sourced type before) | CONSISTENT |

## Missing Changes

*None identified.* Ticket scoped this repo to model tidy and any specs reading `typeOfCommodity`; neither field nor spec references remain in the pinned clone.

## Unique Changes

`commodityNames` typing change (`as const` → `Readonly<Record<string, string>>`) — local test helper, unrelated to commodity type removal; not suspicious.

Persistence spec refactor to `toEqual` on full `commodities` array — strengthens round-trip checks without `typeOfCommodity`.

## Naming and Reuse

*None identified.* `typeCode` matches elsewhere in the repo (document types, package types, animal-identifier types) were left alone per ticket — no collision with removed commodity type.

## Statements Made Untrue

*None identified (searched: `typeOfCommodity`, `commodityType`).*

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Test domain models and the persistence E2E align with frontend and backend removal of `typeOfCommodity`.
