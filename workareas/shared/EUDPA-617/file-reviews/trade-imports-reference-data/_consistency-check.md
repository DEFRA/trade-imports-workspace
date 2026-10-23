# Consistency Check: trade-imports-reference-data

**Ticket:** EUDPA-617
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-reference-data, trade-imports-stub, trade-imports-workspace
**PR:** #36 | **Commit:** c8a8ee2

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| MDM `GET /mdm/trade/product/search?q&dataset&page&size` | stub ✅ `ProductController.search` | ✅ `MdmClient.searchProducts` | CONSISTENT |
| MDM `GET /mdm/trade/product/commodities?codes&dataset` | stub ✅ `ProductController.getCommodities` | ✅ `MdmClient.getCommodities` | CONSISTENT |
| MDM `GET /mdm/trade/product/commodities/{code}/species?dataset&page&size` | stub ✅ `ProductController.getCommoditySpecies` | ✅ `MdmClient.getCommoditySpecies` | CONSISTENT |
| MDM row fields `resultType`, `speciesName`, `commonName`, `commodityCnCode`, `code`, `scientificNames`, `isGerminal` | stub fixtures ✅ (`mdmProductSearchResponses.json`, `mdmProductCommoditiesResponses.json`) | ✅ `MdmProductSearchResult`, `MdmCommodity`, `MdmSpecies` | CONSISTENT |
| Trace header `x-ms-middleware-request-id` | stub ✅ `MdmStubResponses.withTraceHeader` | ✅ `MdmService.logTraceId` on all three new calls | CONSISTENT |
| `GET /commodities` response shape | frontend ✅ `client.js` / `search.js`; ins-tests ✅ `reference-data-api-client.ts` | ✅ `CommoditySearchResponse(total, page, size, groups)` | CONSISTENT |
| `POST /commodities/species-check` shape | frontend ✅ `checkSpecies`, reads `.missing` | ✅ `SpeciesCheckRequest(lines)` / `SpeciesCheckResponse(missing)` | CONSISTENT |
| Germinal filter on `isGerminal` | stub ✅ fixture flags 05111000, 05119985; workspace doc ✅; spec SCN-COMMODITY-SELECT-003-B ✅ | ✅ `CommoditySearchService.germinalCodesAmong` | CONSISTENT |
| Minimum term length | stub `MINIMUM_QUERY_LENGTH = 2` (answers 400); frontend `MIN_SEARCH_LENGTH = 3` | `MINIMUM_SEARCH_LENGTH = 2` (returns empty, never calls MDM) | CONSISTENT in value with the stub; the frontend's 3 is a documented UI choice |
| Meaning of `total` | frontend stub: `total` = number of matching species (`stub.js` `matches.length`) | `total` = MDM `totalElements` (raw rows, including germinal rows it drops and duplicate species it collapses) | DIFFERS. The frontend does not read `total` today, so nothing breaks; the workspace doc states this repo's meaning |
| Stub latency and fault coverage of new MDM paths | stub `application.yml` lists `/mdm/trade/product/search` and `/mdm/trade/product/commodities`; the species path is templated and not covered | n/a | NOTE: fault drills cannot exercise `getCommoditySpecies` (the species check) |
| Metrics: `ExternalCall` and Feign mapping per MDM operation | none | ✅ `MDM_SEARCH_PRODUCTS`, `MDM_GET_COMMODITIES`, `MDM_GET_COMMODITY_SPECIES` and mappings; `everyFeignMethod_shouldBeMeasured` covers them | CONSISTENT |
| `LookupMetrics` lookup type per endpoint | none | ✅ `COMMODITY_SEARCH`, `SPECIES_CHECK` | CONSISTENT |

## Missing Changes

- **The repo README has no commodity section.** The stub updated its own README with the new paths and fixture behaviour. This repo documents its behaviour (germinal filter, size cap, minimum length, no caching, MDM quirks) only in the workspace's `docs/repos/trade-imports-reference-data.md`. The README has a "Ports of entry" section (`README.md:79`) but nothing for commodities. Low: the workspace page is the canonical place, but a one-line pointer from the README would keep it findable.
- **No metrics IT for the new operations.** `ExternalCallMetricsIT` has `getCountries_*` and `getPortsOfEntry_shouldRecordTheMdmCall` (`:161`), but nothing equivalent for `searchProducts`, `getCommodities` or `getCommoditySpecies`. The unit-level `everyFeignMethod_shouldBeMeasured` does cover the mapping. Low.

## Unique Changes

- `ExternalCallFeignCapability.java`: the class Javadoc is deleted. It explained why calls are timed at the transport and not in `MdmService`: the token fetch runs inside the MDM interceptor. `LookupMetrics.java`: the class Javadoc and the public `recordLookup` contract ("Never throws") are deleted. Neither deletion is in the ticket's scope. The house rule allows doc comments on public API and says rationale goes in docs, but the transport-timing rationale was not moved into `README.md` § Metrics. The ins-tests PR strips comments in the same way. Suggest restoring `recordLookup`'s contract line and moving the transport-timing reason into README § Metrics, or reverting both deletions.
- `SpeciesCheckService` and `CommoditySearchService` call MDM uncached on every request. This is intentional per the workspace doc ("Not cached").

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `CommoditySearchService.java` `MINIMUM_SEARCH_LENGTH` vs stub `ProductController.MINIMUM_QUERY_LENGTH` vs frontend `MIN_SEARCH_LENGTH` | Three names for one rule. Only the frontend's value (3) differs, and on purpose. | Nothing required in this repo. | Optionally align the stub's name with this one. |
| `CommodityLine.java` (`code`, `latinName`) and `CommoditySpecies.java` (`latinName`) vs `MdmSpecies.speciesName` | MDM's `speciesName` is mapped to `latinName` at the boundary. The frontend (`speciesLatinName`, `latinName`) and ins-tests (`latinName`) use the same outward name. | None. | Consistent; noted only. |
| `MdmService.java` `DATASET = "gbnag"` beside `SYSTEM = "GBNAG"` | Two constants with the same text in different case. They feed two different MDM parameters (`dataset` and `system`), so they are not duplicates. | None. | None. |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `README.md:87` | "Dependencies are not probed, because the MDM caches exist to limit how often the service calls MDM. `DependencyAvailable` is therefore the last real outcome… MDM responses are cached for `cache.mdm.ttl-minutes`…" | Commodity search and species check call MDM on every request, uncached; only countries and ports are cached. `DependencyAvailable` for MDM now moves with every search. | States which MDM calls are cached. | "Countries and ports are cached for `cache.mdm.ttl-minutes`; commodity search and species check are not, so `DependencyAvailable` for MDM reflects the latest search." |

*Also searched, with no further hits in README.md, AGENTS.md, Javadoc, comments and test titles: `countries and ports`, `ports of entry` (scope statements), `commodity codes … planned`, lists of MDM operations naming `getCountries`/`getPorts`, `MDM_COUNTRIES_CACHE`. `doc/adr/0002` still says commodity codes are planned, but an ADR is a point-in-time record, so it is not a finding.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 2 (1 stale README statement on caching, 1 out-of-scope Javadoc and rationale deletion) plus 2 low missing items
**Summary:** The MDM client matches the stub, and the public API matches the frontend and the tests. README § Metrics now overstates caching, and the unrelated Javadoc deletions drop a public contract and a rationale that was not moved to docs.
