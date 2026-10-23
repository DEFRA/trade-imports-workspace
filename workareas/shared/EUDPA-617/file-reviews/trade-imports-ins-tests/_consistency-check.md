# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-617
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-reference-data, trade-imports-stub, trade-imports-workspace
**PR:** #45 | **Commit:** 1cee8e8

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `GET /commodities?search=&size=` response `groups[].code`, `species[].latinName/commonName` | reference-data ✅ `CommoditySearchResponse`/`CommodityGroup`/`CommoditySpecies`; frontend ✅ `client.js` | ✅ `adapters/http/reference-data-api-client.ts` | CONSISTENT |
| `commonName` nullable | reference-data passes MDM nulls; frontend `services.md` says optional | ✅ `commonName: string \| null` | CONSISTENT (the frontend JSDoc is the odd one out) |
| Checkbox value `code\|latinName` | frontend ✅ `selection/line-key.js` | ✅ `speciesCheckboxValue` | CONSISTENT |
| Picker page size 10 | frontend ✅ `matching.js:3` `SEARCH_PAGE_SIZE = 10` | ✅ `PICKER_PAGE_SIZE = 10` | CONSISTENT |
| Minimum search length 3 (UI) | frontend ✅ `MIN_SEARCH_LENGTH = 3`; spec "fewer than three characters" | ✅ `commodities.spec.ts:74` "lists nothing for a query shorter than three characters" | CONSISTENT |
| Every `searchTerm` or query used is a saved stub term | stub saved terms: `cattle`, `cat`, `ca`, `catt`, `Bos taurus`, `bos tau`, `tau`, `010`, `0102`, `01061900`, `domestic cat`, `dog`, `ferret`, `horse`, `donkey`, `cow`, `fish`, `Bison bison`, `Bos spp.`, `Bubalus bubalis`, `ostrich` | ✅ `Bos taurus`, `horse`, `domestic cat`, `ostrich`, `0102`, `cattle`; `zzz` relies on the unsaved-term empty page | CONSISTENT |
| Each line's code and Latin name is listed by its saved term (after germinal filtering) | stub `Bos taurus` → 0102 ✅; `horse` → 0101 `Equus cabalus` ✅ (`Equus caballus` only under germinal 05119985); `domestic cat` → 01061900 `Felis catus` ✅; `ostrich` → 01063300 `Struthio` ✅ | ✅ `commodity-lines.ts` | CONSISTENT |
| Species check passes for every line a spec submits | stub species fixture covers 0101, 0102, 01061900, 01063300 | ✅ the four lines used are exactly those codes | CONSISTENT (but brittle, see Unique Changes) |
| `TRADE_IMPORTS_REFERENCE_DATA_URL` | frontend default `http://localhost:8086` ✅ | ✅ `playwright.docker-compose.config.ts` default 8086, `playwright.config.ts` CDP URL | CONSISTENT |

## Missing Changes

*None identified.* `bin/update-visual-baselines-linux.sh` remaps every service URL the `@visual` run touches. Reference-data is used only by `hub-groups-and-cya-rows.spec.ts`, which is not `@visual`, so it needs no remap.

## Unique Changes

- New `ReferenceDataApiClient` and `referenceDataApi` fixture, so `hub-groups-and-cya-rows.spec.ts` reads the expected common name from reference-data instead of a copy. In scope.
- The four `commodityLines` are the only codes the stack can submit, because the MDM stub holds species pages for only those four (see the stub check). A new line under any other code will pass search but be refused at the review. Worth a sentence in the README's new "Commodity lines in the animals specs" section, or (better) a fix in the stub.
- Comment and JSDoc deletions outside the commodity change: `config/service-base-urls.ts` (the shared `x-api-key` note on `getDeveloperApiKey`), `domain/animals/constants/journey-options.ts` (`JourneyOptions` JSDoc), `domain/animals/fixtures/seeded-journey.ts` (parity note with `api-seed-parity.spec.ts`, party-name note, hub-post note), `flows/animals/journey.ts` and `flows/animals/seeded-journey.ts` (many rationale comments), `page-objects/animals/commodity-selection-page.ts`. The reference-data PR's Javadoc deletions follow the same pattern. The house comment rule allows them, but two of the deleted notes were load-bearing for maintainers and were not moved into the README: "Answers must stay in step with `flows/animals/journey.ts`; `api-seed-parity.spec.ts` compares the two" and "The empty hub post is what advances past the pickers".

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `adapters/http/reference-data-api-client.ts:17` `PICKER_PAGE_SIZE = 10` | A copy of the frontend's `SEARCH_PAGE_SIZE`. A copy is unavoidable across repos, but the name differs (`PICKER_PAGE_SIZE` vs `SEARCH_PAGE_SIZE`). | Nothing required. | Optionally match the frontend name. |
| `domain/animals/constants/commodity-lines.ts:9` `latinName: 'Equus cabalus'` | MDM's misspelling, matched on purpose (the stub and the frontend fixture both use it). Not a finding; noted so a reviewer does not "fix" it. | None. | None. |

## Statements Made Untrue

*None identified (searched: `selectSpecies`, `commodityCodes`, `commoditySpecies`, `commodityTypes`, `Cow|`, `1148346`, `'Cow'`, `speciesSelection`, `three characters`, `Equus caballus`, `Bos taurus` in README.md, docs/, AGENTS.md, page objects, flows and test titles).* The deleted page-object JSDoc ("results only appear once a query of at least three characters") was the only statement about search length, and the spec title at `commodities.spec.ts:74` still states the current rule.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found (2 notes)
**Summary:** The tests' reference-data client, commodity lines and saved search terms match reference-data's contract, the frontend's checkbox values and the stub's saved responses. The one risk is that the stack can submit only the four codes the stub holds species pages for.
