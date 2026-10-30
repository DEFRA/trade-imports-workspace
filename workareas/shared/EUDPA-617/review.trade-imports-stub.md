# Repository Review: trade-imports-stub

**PR:** #29
**Commit reviewed:** 8f1d6ebde0df9ab2bb510b729e086c6598fb5e34
**Files Changed:** 9

## Summary
Test-helper tidy-up: one source of caller headers, and the response matcher moved to its own class. Both partly fixed items from 29 Oct are finished.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/stubs/mdm/product/ProductController.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/integration/FaultsIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/integration/LatencyProfilesIT.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/MdmStubMvc.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/MdmStubRequests.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/MdmStubResponseMatchers.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/countries/CountriesControllerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/poe/PortsOfEntryControllerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/product/ProductControllerTest.java` | SAFE | 0 | 0 | 0 |

## Positive Observations
The header literal and the second key value are gone from src, and the rename is complete.

## Test Coverage
- Unit tests: No new behaviour.
- Integration tests: Not run in this review; CI is green.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** Test code only, with one duplication item.

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/test/java/uk/gov/defra/trade/imports/integration/LatencyProfilesIT.java | 32 | Major | duplication | The PR rewrites one call as the same five-line restTemplate.exchange of /mdm/geo/countries with mdmCallerHeaders() in two tests here (lines 32-36 and 78-82), while FaultsIT.getFrom (FaultsIT.java:149-150, reached through getCountries) makes the same call. Moving the header into mdmCallerHeaders() left the request itself copied in two IT classes. | one helper owns the MDM countries GET made by LatencyProfilesIT and FaultsIT, and the local copies are gone. | add getCountries() to IntegrationBase, taking the TestRestTemplate or sharing it there, call it from both classes and delete FaultsIT's own copy. |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
