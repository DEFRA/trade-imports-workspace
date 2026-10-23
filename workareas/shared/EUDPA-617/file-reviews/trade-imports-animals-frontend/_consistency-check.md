# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-617
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-reference-data, trade-imports-stub, trade-imports-workspace
**PR:** #422 | **Commit:** 89ae5d4

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `GET /commodities?search=&page=&size=` → `{total,page,size,groups:[{code,species:[{latinName,commonName}]}]}` | reference-data ✅ (`CommoditiesController`, `CommoditySearchResponse`), ins-tests ✅ (`reference-data-api-client.ts`) | ✅ `services/commodities/client.js` `fetchCommodities` | CONSISTENT |
| `POST /commodities/species-check` `{lines:[{code,latinName}]}` → `{missing:[…]}` | reference-data ✅ (`SpeciesCheckRequest`/`Response`) | ✅ `client.js` `checkSpecies`, `species-check.js` reads `.missing` | CONSISTENT |
| A line is CN code + Latin name, value `code\|latinName` | ins-tests ✅ (`speciesCheckboxValue`), workspace spec ✅, gbn-ag doc ✅ | ✅ `selection/line-key.js`, `speciesLatinName` obligation | CONSISTENT |
| Page size of one search = 10 | ins-tests ✅ `PICKER_PAGE_SIZE = 10`, spec REQ-COMMODITY-SELECT-011 ✅ | ✅ `matching.js:3` `SEARCH_PAGE_SIZE = 10` | CONSISTENT |
| Minimum search length | reference-data `MINIMUM_SEARCH_LENGTH = 2`, stub `MINIMUM_QUERY_LENGTH = 2` | `matching.js:1` `MIN_SEARCH_LENGTH = 3` | DIFFERS (documented as intentional in workspace `docs/repos/trade-imports-reference-data.md`; three names for one rule) |
| `commonName` may be null | ins-tests ✅ `commonName: string \| null`; reference-data passes MDM nulls through; this repo's own `services.md` says "a line's common name is optional" | ❌ `search.js:10` JSDoc types it `commonName: string` | INCONSISTENT |
| Stub data matches reference-data's response | stub `mdmProductSpeciesResponses.json` for 0101, 0102, 01061900, 01063300 | ✅ `fixtures/commodities.json` species lists for those four codes match the stub exactly (Latin and common names) | CONSISTENT |
| Species-check coverage in stub data | stub species fixture holds only 0101, 0102, 01061900, 01063300 | frontend stub (stub mode) checks against all 26 codes in `fixtures/commodities.json` | DIFFERS (see Missing Changes) |
| Germinal filter | reference-data filters `isGerminal` codes; stub flags 05111000, 05119985 | frontend fixture holds no germinal codes, so nothing to filter; `rules.js` `PACKAGE_COUNT_CODES` still lists `05111000`, `05119985` | NOTE: those two entries can never match a line the picker offers |

## Missing Changes

- **Docker-stack submission vs frontend stub mode.** In stub mode `species-check.js` accepts any line whose code and Latin name are in `fixtures/commodities.json` (26 codes). In the docker stack the same check goes to reference-data → `trade-imports-stub`, whose `mdmProductSpeciesResponses.json` holds only 0101, 0102, 01061900 and 01063300. Every other code answers an empty page, so `SpeciesCheckService` reports the line missing and the review refuses to continue (REQ-CYA-014). A tester who searches the saved term `010` (45 rows: pigs 0103, sheep 010410, poultry and others) and submits is refused in the stack but not in stub mode. The fix belongs in the stub (add species pages for every code the saved searches return). It is cross-referenced here because the two stubs disagree.

## Unique Changes

- `src/server/app/services/reference-data/request.js`: new shared `referenceDataUrl` and `requestReferenceData`; the countries and ports clients now use it. Intentional and in scope (same base URL and error shape for three callers).
- Platform-layer changes under `src/server/app/bridge/` and `src/server/app/model/obligations/helpers/` (`appliesForCommodity` → `appliesForGateValue`, new `anyNotInUnionOf`, `COMPLEMENT_GATE_TYPES`, `ENFORCED_AT_CONTINUE` `'commoditySelection'` → `'commodityCode'`). The twin `trade-imports-plants-frontend` runs the same platform and still has `appliesForCommodity` (`origin/main:src/server/app/bridge/applicability.js:45`) and no `anyNotInUnionOf`. Plants is not in this ticket, so this is twin drift to track, not a blocker.
- Large JSDoc and comment deletions in files touched (`bridge/applicability.js` header, `helpers/index.js` header, `synthesise.js` per-case comments). The helper-choice guidance moved into `src/server/app/docs/obligation-model.md`, which follows the house rule that rationale lives in docs.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/server/app/sets/live-animals/services/commodities/call-reference-data.js:13` | Third copy of the same "stub mode, else real call wrapped in `Boom.serverUnavailable('Reference data unavailable', { dataset })`" pattern, beside `services/countries/index.js:49`, `:144` and `services/ports/index.js:24`. The PR extracted the shared fetch into `services/reference-data/request.js` but put the shared 503 wrapper in the live-animals set. | One wrapper for every reference-data caller. | Move `callReferenceData` next to `request.js` (taking the dataset name) and have countries and ports use it. |
| `src/server/app/services/persistence/records/stub/marshal/list-item.js:17` | The stub list item now emits `commodity: { commodityCode }`, while the real backend list (see `real.amend-list.test.js`) emits `commodity: { name: '0102' }` for the same value. Two names for one field across the stub and real adapters. | One shape for the list row's commodity across both adapters. | Emit `{ name: commodityCode }` from the stub, as the real backend does. |
| `src/server/app/sets/live-animals/journeys/linear/features/dashboard/notification-helper.js:81` | `formatCommodity(commodity, nameForCode)`: the only production caller (`view-model/row/index.js:13`) no longer passes `nameForCode`; only the test does. | No parameter that only a test uses. | Drop `nameForCode` and its test case. |
| `src/server/app/sets/live-animals/services/commodities/search.js:10` | `commonName: string` in the JSDoc; MDM returns null for some species and ins-tests types it `string \| null`. | The contract states the nullable type. | `commonName: (string\|null)`. |
| `matching.js:1` (`MIN_SEARCH_LENGTH = 3`) vs reference-data `CommoditySearchService.MINIMUM_SEARCH_LENGTH = 2` vs stub `ProductController.MINIMUM_QUERY_LENGTH = 2` | Three names for the minimum-term rule, two values. The difference is deliberate (design asks for 3; reference-data mirrors MDM's 2) and documented in the workspace doc. | Nothing in this repo; noted for reviewers. | None. |
| `src/server/app/model/obligations/evaluator.test.js:680` | Title `'V4 — cow line triggers both packages and CPH gates'` kept while the body now uses `CATTLE_CODE`. | The title names what the test now does. | `'V4 — a 0102 line triggers both packages and CPH gates'`. |
| `src/server/app/sets/live-animals/journeys/linear/flow/opening-run.test.js:111`, `reachability-fixtures/seeds.js:128`, `flow-reachability.test.js:156-162`, `status.test.js:430` | `fishLineSeed`, variant id `'fish-line'` and `cowLine(...)` now hold 01063300 / Struthio (ostrich) and 0102 lines. The names decode commodities the picker no longer offers. | Names say what the data is. | `unidentifiedLineSeed` / `'unidentified-line'` (or `ostrich-line`); `cattleLine`. |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js:10` (and `copy.cy.js:18`) | "You can search by commodity name (for example, Cow), commodity code (0102), or species name (Bos taurus)." | There are no commodity names. MDM search matches species common names ("cattle"), codes and Latin names. This is user-facing hint text. | The copy states the new behaviour. | "…by common name (for example, cattle), commodity code (0102) or scientific name (Bos taurus)…" (agree wording with design; update the Welsh). |
| `src/server/app/sets/live-animals/docs/services.md:7-11` | Lists only `index.js` and `stub.js`; "provides commodity and species options, the Cow Domestic/Game type mapping". | Options come from reference-data (`search.js`, `client.js`, `species-check.js`); rules are in `rules.js`; the multi-type code is `0102`. | The doc states the new layout. | List the new files; say "the 0102 Domestic/Game mapping". |
| `src/server/app/sets/live-animals/docs/services.md:33-35` | "Every commodity in `PERMANENT_ADDRESS_COMMODITIES` must also be in `IDENTIFIED_COMMODITIES`… `index.test.js` pins this." | The constants are now `PERMANENT_ADDRESS_SPECIES` (Latin names) and `IDENTIFIED_CODES`; `index.test.js:128` pins "every permanent-address species MDM holds under an identified code". | States the new rule and names. | Rewrite with the new names and the species-under-identified-code rule. |
| `src/server/app/sets/live-animals/docs/services.md:37-38` | "Of the commodities offered, only cattle has them." | `UNWEANED_CODES = [0102, 0103]`: cattle and pigs. The spec says "cattle or pig". | States cattle and pigs. | "Only cattle (0102) and pigs (0103) have them." |
| `src/server/app/sets/live-animals/docs/services.md:40-41` | "`CPH_EXEMPT_COMMODITY_CODES` names the exemptions by code, not picker name" | The constant is `CPH_EXEMPT_CODES`, and there are no picker names. | The current name, with no picker-name contrast. | "`CPH_EXEMPT_CODES` names the exemptions:" |
| `src/server/app/sets/live-animals/docs/services.md:22-23, 28` | "a cow is asked for its ear tag first"; "A commodity with no identifiers, such as fish" | Rules are keyed by code (0102). Fish are not in MDM's gbnag data and are not offered. The spec now uses ostriches as the example. | An example the picker can offer. | "a 0102 line…"; "such as ostriches (01063300)". |
| `src/server/app/sets/live-animals/docs/limits.md:10-12` | "Species options, Cow Domestic/Game mapping and obligation allow-lists… are stub data in this application and do not prove compatibility with an external master-data source." | Species come from MDM through reference-data; only the rules are set data. | States the new source. | "Species come from MDM via reference-data; the rules in `rules.js` are set data and match MDM's spelling exactly." |
| `src/server/app/sets/live-animals/journeys/linear/flow/reachability-fixtures/seeds.js:73-83, 126-127` | "The base seed's single Cow line never scopes the Horse-gated `horseName`, the Cat/Dog-gated `permanentAddress`…"; "Fish is on none of the identifier allowlists" | Gates are by code (0101) and by species (`PERMANENT_ADDRESS_SPECIES`); the variant holds Struthio under 01063300. | The comment is gone or true. | Delete the stale sentences (house rule: delete, do not reword) and rename the variant. |
| `src/server/app/sets/live-animals/journeys/linear/flow/opening-run.test.js:109-110` | "A consignment of Atlantic salmon: Fish is on none of the identifier allowlists" | The data is 01063300 / Struthio. | The comment is gone. | Delete it; rename `fishLineSeed`. |
| `src/server/app/sets/live-animals/journeys/linear/flow/status.test.js:426-427` | "Fish is on none of the identifier allowlists, so a Cow-and-Fish consignment…" | The lines are 0102 and 01063300. | The comment is gone. | Delete it. |
| `src/server/app/sets/live-animals/journeys/linear/flow/flow-reachability.test.js:156-158` | "fish-line is the one variant… wrongly adding Fish to an…" | The variant holds an ostrich line. | The comment is gone, or the name says it. | Delete it; rename the variant. |
| `src/server/app/store-ops.test.js:270-271` | "gated on an unweaned-triggering commodity (Cow)" | The gate is `UNWEANED_CODES` (0102, 0103). | The comment is gone. | Delete it. |

*Searched: `commoditySelection`, `speciesSelection`, `COMMODITY_OPTIONS`, `COMMODITY_CODES`, `commodityCodeFor`, `commodityNameFor`, `speciesLabel`, `speciesFor`, `speciesListedIndividually`, `isCommoditySpecies`, `typeIdForSpecies`, `packageCountCommodities`, `PERMANENT_ADDRESS_COMMODITIES`, `IDENTIFIED_COMMODITIES`, `CPH_EXEMPT_COMMODITY_CODES`, `1148346`, `Cow|`, `\bcow\b`, `\bfish\b`, `picker name`, `stub.js`, `three characters` across docs, recipes, comments and test titles. The old field names are gone from code; the hits above are what remains.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 20 (1 cross-repo stub-coverage mismatch, 7 naming and reuse, 12 stale statements, one of them user-facing copy)
**Summary:** The frontend, reference-data and ins-tests contract lines up, and the frontend stub matches the MDM stub for the shared codes. But the search hint still says "commodity name (for example, Cow)", the set docs and several test comments and names still describe the removed Cow/Fish catalogue, and the 503 wrapper is a third copy instead of sitting beside the new shared `request.js`.
