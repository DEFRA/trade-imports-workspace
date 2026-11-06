# Repository Review: trade-imports-animals-backend

**PR:** #115  
**Commit reviewed:** `253bbda0f3ba86a4b7689dd915a4b58093120e69`  
**Files Changed:** 17

## Summary

`CommodityComplement` gains `description`; `Species` gains `commonName`; save path writes `commodities[]` and clears legacy `commodity`; GBN-AG `TradeLineItem` maps description and common name; list projection exposes `commodities` on `NotificationView`.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/CommodityComplement.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationBase.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationCommodities.java` | SAFE | 0 | 0 | 1 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationContentMapper.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapper.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java` | SAFE | 0 | 1 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationView.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationViewData.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/Species.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/ConsignmentItem.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/SpecifiedConsignment.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/TradeLineItem.java` | SAFE | 0 | 0 | 1 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationCommoditiesTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapperTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgMapperTest.java` | SAFE | 0 | 0 | 0 |

## Positive Observations

- `NotificationCommodities` keeps legacy reads explicit without a migration.
- GBN-AG mapping changes are backed by `GbnAgMapperTest`.
- List projection change is minimal (SpEL + DTO field).

## Test Coverage

- **Unit tests:** Updated across notification and outbox packages.
- **Integration tests:** Existing IT suite should be run in CI.

## Risk Assessment

**Overall Risk:** Low  
**Rationale:** Two optional documentation items; no blocking correctness gaps.

## Items

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationCommodities.java | 24 | Minor | comments | Legacy expand uses single root name for every complement; old multi-commodity data stays wrong until resave. | maintainers know legacy multi-commodity under one root name is best-effort. | one-line class Javadoc on fromLegacyCommodity. |  |  |  |
| 2 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java | 481 | Major | structure | Save clears legacy commodity when commodities[] is set but GET /notifications list projection was not updated in this PR. | paginated notification list returns enough commodity display data for the new shape. | add commodities to NotificationView SpEL accessors and NotificationViewData; verify OpenAPI/list contract if locked. | Auto-Resolved | — | NotificationView/NotificationViewData expose commodities |
| 3 | src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/TradeLineItem.java | 68 | Minor | correctness | CN classification still falls back to typeOfCommodity when commodityCode is blank (legacy data). | behaviour is intentional for legacy reads. | short comment on classificationOf fallback; optional GbnAgMapperTest for legacy complement without code. |  |  |  |

## Repository Verdict

**SAFE** — two minor documentation suggestions only.
