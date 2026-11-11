# Repository Review: trade-imports-animals-backend

**PR:** #124  
**Commit reviewed:** `a156d8ad964e6b78c1b73d94d0ee41db6be77b82`  
**Files Changed:** 10

## Summary

Removes `typeOfCommodity` from domain types and stops mapping it to GBN-AG `typeCode` on trade line items. Copy, GBN-AG, controller, service and integration tests are updated consistently with the ticket.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/Commodity.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapper.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/Species.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/TradeLineItem.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationContentMapperTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapperTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgMapperTest.java` | SAFE | 0 | 0 | 0 |

## Positive Observations

- Legacy shed-on-save behaviour covered in `NotificationIT` per agreed limitation.
- GBN-AG mapper tests assert omission of `typeCode` rather than null cattle values.

## Test Coverage

- Unit tests: mapper and service layers updated
- Integration tests: persistence/submit path for legacy `typeOfCommodity`

## Risk Assessment

**Overall Risk:** Low  
**Rationale:** Behavioural change matches ticket; single documentation drift on copy mapper.

## Items

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapper.java | 9 | Major | comments | Class Javadoc still lists commodity "type" among fields kept on copy after typeOfCommodity was removed from mapCommoditiesForCopy. | the class Javadoc describes only commodity identity fields the mapper still copies. | change the keeps list to "name, commodity code and description" and drop "type". |  |  |  |

## Repository Verdict

**Status:** NEEDS ATTENTION
