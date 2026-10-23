# Consistency Check: trade-imports-stub

**Ticket:** EUDPA-617
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-reference-data, trade-imports-stub, trade-imports-workspace
**PR:** #26 | **Commit:** 60be5df

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `GET /mdm/trade/product/search` (`q`, `dataset`, `page`, `size`) | reference-data ✅ `MdmClient.searchProducts` | ✅ `ProductController.search` | CONSISTENT |
| `GET /mdm/trade/product/commodities?codes=` | reference-data ✅ `MdmClient.getCommodities` | ✅ `ProductController.getCommodities` | CONSISTENT |
| `GET /mdm/trade/product/commodities/{code}/species` | reference-data ✅ `MdmClient.getCommoditySpecies` (used by `SpeciesCheckService`) | ✅ `ProductController.getCommoditySpecies` | CONSISTENT |
| Saved search terms cover every term the tests search | ins-tests ✅ `Bos taurus`, `horse`, `domestic cat`, `ostrich`, `0102`, `cattle` (and `zzz` for no match) | ✅ all saved | CONSISTENT |
| Species pages cover every code the tests submit | ins-tests ✅ 0101, 0102, 01061900, 01063300 | ✅ exactly those four | CONSISTENT |
| Species data matches the frontend's stub fixture | frontend `fixtures/commodities.json` | ✅ 0101, 0102, 01061900 and 01063300 species and common names match exactly | CONSISTENT |
| Species pages cover every code the saved searches can return | frontend stub mode accepts all 26 codes in its fixture | ❌ only 4 codes. The saved `010` search returns 45 rows across about 26 codes, and `cow`, `donkey`, `Bison bison`, `Bubalus bubalis`, `dog` and `ferret` return other codes too | INCONSISTENT (see Missing Changes) |
| Germinal flag | reference-data filters on `isGerminal`; the workspace doc and spec describe it | ✅ the fixture sets `isGerminal: true` on 05111000 and 05119985 | CONSISTENT |
| Minimum `q` length 2 | reference-data `MINIMUM_SEARCH_LENGTH = 2` (never sends a shorter term) | ✅ `MINIMUM_QUERY_LENGTH = 2`, answers 400 | CONSISTENT |
| Trace header | reference-data logs `x-ms-middleware-request-id` | ✅ new `MdmStubResponses.withTraceHeader`, also adopted by the Countries and PoE controllers | CONSISTENT |
| Latency and fault paths | none | `application.yml` adds search and commodities; the species path is not covered (it is templated), and the README says so | CONSISTENT with its own README |

## Missing Changes

- **Species pages for every code a saved search returns.** `mdmProductSpeciesResponses.json` holds only 0101, 0102, 01061900 and 01063300, and "an unknown code answers an empty page". reference-data's `SpeciesCheckService` reads an empty page as "species no longer listed". So in the docker stack, a draft with a line under any other code (a pig from the saved `010` search, a donkey from `donkey`, a bison from `Bison bison`) is refused at the review. The frontend in stub mode accepts the same draft, because its fixture has all 26 codes. The ticket asks that the reference-data stub serve docker-compose environments, and the stack should not refuse a species its own search offered. Capture the species pages for every code in `mdmProductCommoditiesResponses.json` (the 26 live-animal codes the frontend fixture holds).

## Unique Changes

- `MdmStubResponses` is extracted and the Countries and PoE controllers are refactored onto it. Small and in scope: a third MDM controller needed the same header.
- Search returns the saved page only for `page == 0`; later pages are empty with the saved total. Per the ticket comments, real MDM ignores `page` (it stops at 25). reference-data asks only for page 0 today, so this is harmless.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/main/java/uk/gov/defra/trade/imports/stubs/mdm/product/ProductController.java:26` | `OCP_APIM_SUBSCRIPTION_KEY = "Ocp-Apim-Subscription-Key"` is declared a third time (also `CountriesController.java:20` and `PortsOfEntryController.java:18`). This PR created `MdmStubResponses` so the trace header is no longer declared per controller, but left the key constant duplicated and added a new copy. | One declaration shared by the MDM controllers. | Move it into `MdmStubResponses` (or a sibling `MdmHeaders`) and import it in all three. |
| `ProductController.java:31` `MINIMUM_QUERY_LENGTH` | reference-data calls the same rule `MINIMUM_SEARCH_LENGTH`. | Optional. | Rename it to `MINIMUM_SEARCH_LENGTH`. |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/main/resources/application.yml:122` | `interface-name: "MDM reference data through APIM: countries and border control posts"` | The `mdm` profile now also covers product search and commodities. | States the new scope. | `"MDM reference data through APIM: countries, border control posts and product (commodities)"`. |
| `README.md:16` | The `mdm` row lists `GET /mdm/geo/countries`, `GET /mdm/trade/bcp/poes`, `GET /mdm/trade/product/search` and `GET /mdm/trade/product/commodities` as the paths it stands in for | It also stands in for `GET /mdm/trade/product/commodities/{code}/species` (described at `README.md:82` and in the workspace doc). The fault table at `README.md:43` is right to leave it out. | The "stands in for" table lists every path. | Add the species path to the `README.md:16` row only. |

*Also searched: `countries and ports`, `two integrations`, and lists of `/mdm/trade/bcp/poes` paths in README.md, application.yml, and controller and test comments. "Two integrations" at `README.md:11` is still true (trade-token and mdm).*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 4 (1 missing species coverage, 1 duplicated constant, 2 stale statements)
**Summary:** The stub's paths and saved data match reference-data, the frontend fixture and every term the tests use. But it holds species pages for only four codes, so the stack refuses at review any other species its own saved searches offer.
