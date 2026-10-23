# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-617
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-reference-data, trade-imports-stub, trade-imports-workspace
**PR:** #135 | **Commit:** f7d977c

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| reference-data endpoints `GET /commodities`, `POST /commodities/species-check` | reference-data ✅ `CommoditiesController` | ✅ `docs/repos/trade-imports-reference-data.md:15-16` | CONSISTENT |
| Size cap 100, minimum length 2, germinal filter on `isGerminal`, not cached | reference-data ✅ `CommoditySearchService` (`MAXIMUM_PAGE_SIZE = 100`, `MINIMUM_SEARCH_LENGTH = 2`) | ✅ same | CONSISTENT |
| "the frontend asks for three" | frontend ✅ `MIN_SEARCH_LENGTH = 3` | ✅ `trade-imports-reference-data.md` § Partial terms; spec "fewer than three characters" | CONSISTENT |
| `total` counts dropped germinal rows | reference-data ✅ (`total` = MDM `totalElements`) | ✅ § What comes back | CONSISTENT |
| MDM stub paths (search, commodities, commodities/{code}/species) and germinal fixture codes | stub ✅ `ProductController`, README | ✅ `docs/repos/trade-imports-stub.md`, `architecture-overview.md` | CONSISTENT |
| Observed MDM behaviour (`cattle`, `cat`, `ca` 14 rows, `0102` one row with 15 species, `010` 45 rows, `Bos spp.` nothing) | stub saved responses ✅ (`cattle` 8, `ca` 14, `0102` 1, `010` 45, `Bos spp.` 0) | ✅ § MDM commodity search behaviour | CONSISTENT |
| Line identity = CN code + Latin name, no MDM id | frontend ✅, ins-tests ✅ | ✅ `gbn-ag-field-lineage.md`, specs | CONSISTENT |
| `TradeLineItem.commonName` and the list commodity = CN code | frontend ✅ `mapper-a/commodity.js` `name: lines[0].commodityCode`; `real.amend-list.test.js` `commodity: { name: '0102' }` | ✅ `gbn-ag-field-lineage.md` | CONSISTENT |
| Unweaned asked for cattle **or pig** | frontend ✅ `UNWEANED_CODES = [0102, 0103]` | ✅ commodity-selection obligations spec | CONSISTENT (the frontend's own `services.md` still says cattle only) |
| Permanent address by species, genus Felis excluded | frontend ✅ `PERMANENT_ADDRESS_SPECIES` | ✅ spec SCN-OB-COMMODITY-006-B | CONSISTENT |
| Draft species re-checked at review, not on amend | frontend ✅ `check-answers/refusal.js`; reference-data ✅ `SpeciesCheckService` | ✅ REQ-CYA-014 | CONSISTENT |
| One search lists at most 10 species | frontend ✅ `SEARCH_PAGE_SIZE = 10`; ins-tests ✅ `PICKER_PAGE_SIZE = 10` | ✅ REQ-COMMODITY-SELECT-011 | CONSISTENT |

## Missing Changes

- `docs/repos/trade-imports-animals-frontend.md` § Infrastructure dependencies lists Redis, MongoDB, Backend API, AWS and Defra ID, but not reference-data. The frontend now calls reference-data for commodity search and the submission species check, as well as for countries and ports as before. The omission predates this change, but this change makes reference-data a dependency of the submit path. Low.

## Unique Changes

- `docs/analysis/gbn-ag-field-lineage.md` is updated. Point-in-time analysis docs are not normally kept current, but updating this one is reasonable: its open-question list names the species id and `commonName` gaps this change alters. `docs/analysis/reference-data-resilience.md` still lists only countries and ports, which is expected for a snapshot, so it is not a finding.

## Naming and Reuse

*None identified.* The docs use the same outward names as the code (`latinName`, `commonName`, `code`, `isGerminal`, `species-check`).

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `docs/repos/trade-imports-reference-data.md:7` | "serves reference data (countries, ports of entry and live-animal commodities)… It fetches the data from MDM, caches it in memory and returns a simplified, sorted view." | Commodity search and species check are not cached (the same page says "Not cached" at :15-16), and results come back in MDM's order, not sorted (§ What comes back). The purpose line now contradicts the responsibilities below it. | The purpose line is true for all three domains. | "…caches countries and ports in memory and returns them sorted by name; commodity searches pass through to MDM uncached, in MDM's order." |
| `docs/repos/trade-imports-reference-data.md:12` | "The public read API: `GET /countries`… and `GET /ports-of-entry`" | The public API also has `GET /commodities` and `POST /commodities/species-check` (listed two bullets later). | One statement of the public API. | "The public read API for countries and ports: …", or fold the commodity endpoints into this bullet. |
| `.claude/skills/prototype/references/fake-a-service/dashboard-filters-and-tabs.md:30` | "`commodityLines[0].commoditySelection`" as the field the real list marshaller reads | Still true for the plants frontend it describes (`trade-imports-plants-frontend` `list-item.js` still reads `commoditySelection`); animals has renamed the field to `commodityCode`. | Nothing now, because the statement is about plants. Recheck if the platform rename is carried to plants. | None. |

*Searched: `commoditySelection`, `speciesSelection`, `COMMODITY_OPTIONS`, `COMMODITY_CODES`, `1148346`, `Cow|`, `commodities/stub.js`, `selectSpecies`, `commodity-codes.ts`, `commodity-species.ts`, `\bfish\b`, `\bCow\b`, `common name followed`, `naming that commodity`, `picker name`, `three characters`, `/mdm/trade/bcp/poes` across docs/, openspec/specs/, .claude/, tools/ and tim/src.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 2 stale statements (both in `docs/repos/trade-imports-reference-data.md`) plus 1 low missing doc row
**Summary:** The docs and Behaviour Spec match what reference-data, the stub, the frontend and the tests now do, except that the reference-data page's purpose and public-API lines still describe a cached, sorted, countries-and-ports-only service.
