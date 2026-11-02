# DR2.1 reference lists and MDM: integration state, stubs and what unblocks

Read-only research, 9 October 2026. Every repo read was on `main`.

> **Evidence (9 October, 08:18 UTC).** The first draft rested on a stub commit message. It is now checked against
> captures of reference-data in CDP test, which is backed by real MDM (`captures/`, compared in `captures/comparison.json`).
> CDP dev refused the developer key (403). The local stack was down, so the stub side is the stub fixtures run through
> reference-data's mapping.
>
> | Endpoint | Real (CDP test) | Stub | Verdict |
> |---|---|---|---|
> | `/ports-of-entry` | 78 ports | same 78 codes and names | Matches. Only `GB MID` "Port of Middlesbrough" differs: real uses non-breaking spaces, which also changes its sort position. The duplicates (Pembroke, Sheerness) and misspellings (`Teestort`, `TILBURY`, `Portsmouth  Port`) **are in the real data** |
> | `/countries?blocks=GBNAG_SPS_EX` | 31 (EU-27, IS, LI, NO, CH) | same 31, same subdivisions and order | Matches |
> | `/countries` (unfiltered) | 249 | 31 | **Wrong.** 218 codes are missing from the stub, including GG, JE, IM, GI and IC. Crown Dependencies are in real MDM, but not in the SPS block |
>
> reference-data passes on only code, name and subdivisions. MDM's `independent` flag, its blocks and any extra port
> fields (type, animal approval) are dropped before we can see them, so they remain unverified.
>
> **Stub changes this supports:** add the 218 missing countries to `countriesResponse.json`, outside the SPS block. Make
> `CountriesController` honour `blocks`. Put the non-breaking spaces back in `GB MID`. Leave the SPS countries and the
> port duplicates and misspellings as they are. The `independent` values for added countries can only be guessed until
> someone with gateway access captures MDM's raw shape.

## Summary

- **Countries and ports of entry both already come from real MDM.** The real MDM is used in CDP test only. CDP dev and the local stack get them from `trade-imports-stub`. Every list in the blocked rows goes through reference-data. The frontends hold none of these lists in code.
- **Two of the four blocked rows rest on a wrong premise.** inc-008 and inc-082 say "the hard-coded list is not edited". There is no hard-coded list. The "32 sovereign states" the traces saw is the stub's hand-built 31 countries plus the UK. It is not what MDM returns.
- **2 rows unblock fully now (inc-008, inc-082). 2 rows split into a part to build now and a remainder (inc-006, inc-007).** The remainder is one question to the MDM team: does the port record carry its type and whether it is approved for animals? req-149 and req-304 wait on that answer. req-302 and req-303 are MDM's data, not code. Move them to the MDM content report, as req-026 to req-030 already were.
- **Stub tidy-up, in one line:** recapture the stub's countries from MDM TST, because it is hand-built, says no country is independent and has only one block's worth of countries. Then refresh the frontends' copied fixtures, replace the INS frontend's 4 hand-typed countries, and delete the dead config and test lists.
- Nothing in the backlog waits behind the four rows. Building them is pure gain.

## 1. Rows, requirements and conflicts waiting on MDM

| Row | Status | Theme (wave) | Requirements | List it needs | dependsOn | Rows waiting behind it |
|---|---|---|---|---|---|---|
| inc-006 | blocked | reference-lists (1) | req-147, req-149 | Destination country (transhipment and transit). Port of exit (transit and temporary admission) | none | none |
| inc-007 | blocked | reference-lists (1) | req-302, req-303, req-304, req-370 | Port of entry (content, spelling, airport-then-seaport order). Transit countries | none | none |
| inc-008 | blocked | reference-lists (1) | req-432 | Private transporter's country | none | none |
| inc-082 | blocked | address-book (4) | req-644 | INS journey add page, manual-entry Country | inc-078 | none |

Conflicts behind them: c-026 (destination), c-027 (port of exit), c-048 (ports and transit), c-054 and c-transporters-004 (private transporter), c-107 and c-177 (INS Country select). They all rest on one ruling: "DR1's MDM judgement (Rhys, 2026-09-07): list content is master reference data, deferred to MDM".

Rows that mention MDM but are not blocked on it: inc-012, inc-016 (reference-data serves no commodity list, req-065), inc-037, inc-040 (the UK default and ordering are built now, c-054), inc-062 and inc-078 (the placeholder is built now). Already out of scope as an MDM content report: req-026 to req-030 (contents of the origin list).

Requirements recording the integration that already exists (adopted, `delta: exists`): req-025, req-060 to req-064, req-300, req-301 and req-1235.

## 2. What the real integration is

| List | Reference-data endpoint | MDM call | Fields kept | Real MDM in CDP? |
|---|---|---|---|---|
| Countries (origin, destination, transit, private transporter) | `GET /countries?blocks=GBNAG_SPS_EX` | `GET /mdm/geo/countries?system=GBNAG&blocks=…` (`MdmClient.java:20-25`) | code (`effectiveAlpha2`), name (`effectiveAlias`), subDivisions (`Country.java:21-25`). GB is always removed, and the block filter is applied in the service (`MdmService.java:48-59`) | Yes, in CDP test |
| Countries, unfiltered (address book) | `GET /countries` | same, with no block | same | Yes, in CDP test |
| Ports of entry (entry and exit) | `GET /ports-of-entry` | `GET /mdm/trade/bcp/poes?system=GBNAG` (`MdmClient.java:27-31`) | code and name only (`MdmPortOfEntry.java:14-16`, `PortOfEntry.java:15-16`). Any other field MDM sends is dropped | Yes, in CDP test |
| Destination-only, exit-only, animal-approved or port-type lists | none | none | — | No |

The token comes from a Trade Platform client-credentials grant, with the subscription key `Ocp-Apim-Subscription-Key`. Results are cached for 60 minutes and empty results are not cached (`MdmService.java:22,35`; `application.yml:5-7,113-118`).

**Where `MDM_SERVICE_URL` points in each environment**

| Environment | MDM target | Source |
|---|---|---|
| Local stack | `trade-imports-stub` on `:8087` | `docker/stack/backend.compose.yml:94-95` |
| CDP dev | `trade-imports-stub.dev.cdp-int.defra.cloud` (stub, token too) | `cdp-app-config/services/trade-imports-reference-data/dev/…env:4,9` |
| CDP test | **real MDM** `tst-internal-gateway.trade.azure.defra.cloud`, with a real Entra token | `…/test/…env:4,9` |
| perf-test, ext-test, prod, infra-dev, management | not set, so it falls back to `http://localhost:8087` (`application.yml:115`) | env files hold only the header comment |

The local `cdp-app-config` clone was last updated on 28 September.

**History.** The countries integration is EUDPA-38, then EUDPA-193 (cache), EUDPA-212 (new MDM API) and EUDPA-613 (subdivisions, latest). Ports are EUDPA-154 (Done). EUDPA-190 "Consume Port of Entry data from MDM" is an empty epic, still To Do, priority Lowest. The work was done under EUDPA-154, so EUDPA-190 can be closed or used as the parent for the port-attribute work. EUDPA-154's tech notes say the TST port data is "plants poe data and some test data for now as we're still working on finalising what's needed for live animals". **The live-animal port content is still being finalised by MDM.** That is the one part of the blocker that is real.

## 3. Who calls what

| List | Consumer (file:line) | Env var / base URL | Local stack target | CDP target | Stub used? |
|---|---|---|---|---|---|
| Origin countries (SPS block, with subdivisions) | animals FE `services/countries/index.js:44` → `client.js:1-2,4-26` | `TRADE_IMPORTS_REFERENCE_DATA_URL` read straight from `process.env` | reference-data → trade-imports-stub | dev: reference-data → stub. test: reference-data → real MDM | Stack: yes (trade-imports-stub). Unit and fit tests: `STUB_MODE` reads the `_capture` fixtures (`countries/stub.js:1-9`) |
| Destination country (import reason) | animals FE `import-reason/controller.js:40-44` (`originCountries`, no subdivisions) | same | same | same | same |
| Transit countries | animals FE `transit-countries.controller.js:41` (`originCountries`, no subdivisions) | same | same | same | same |
| Private transporter country | animals FE `private-transporter-details.controller.js:85,107` → `addressCountries` (`countries/index.js:114-117`): UK plus the SPS block, by name | same | same | same | same. **Not hard-coded** |
| Address-book countries (party edit, frozen parties, invalid parties) | animals FE `countries/index.js:121-147` (unfiltered `/countries`) | same | same | same | same |
| Port of entry and port of exit | animals FE `port-of-entry.controller.js:36`, `import-reason/controller.js:47-54` → `ports/index.js:16-29` → `ports/client.js:1-5` | same | reference-data → stub | dev: stub. test: real MDM | Stack: yes. Unit and fit tests: `_capture/fixtures/ports-of-entry.json` |
| INS address book and journey-add Country | INS FE `address-book/address-countries.js:7-19` → `services/countries/index.js:9-27` → `client.js:5-9` (unfiltered) | `tradeImportsReferenceDataApi.baseUrl` (`config.js:394-399`) | reference-data → stub | dev: stub. test: real MDM | Stack: yes. `STUB_MODE`: **4 hand-typed countries** (`services/countries/stub.js:1-6`), not a capture |
| INS dashboard country names | INS FE `dashboard/controller.js:94` | same | same | same | same |
| Plants origin countries and ports | plants FE `services/countries/index.js:21`, `services/ports/client.js` | `process.env` | reference-data → stub | dev: stub. test: real MDM | Stack: yes. Its `countries-origin.json` fixture has **0 subdivisions** (stale) |
| Anything in a backend | none: no Java service calls reference-data | — | — | — | — |

The stub controllers are all called in the stack and CDP dev, so **there are no dead stub endpoints**. These are dead or stale:

- **Dead config key.** `tradeImportsReferenceDataApi.baseUrl` in the animals FE (`src/config/config.js:394-399`) and the plants FE (`config.js:391-396`) is documented in `docs/services.md` but no code reads it. The clients read `process.env` directly.
- **Stale capture tag.** `_capture/capture.js:17-24` (animals) tags ports-of-entry "expected — endpoint not built". The endpoint was built under EUDPA-154.
- **Stale fixture.** The animals FE `_capture/fixtures/countries.json` is the unfiltered list, captured 7 August, before subdivisions existed (none of its 31 records has them). The plants FE `countries-origin.json` also has none. Only the animals FE `countries-origin.json` (1 October, 9 subdivisions) is current.
- **Dead test list.** The tests repo's `domain/animals/constants/country-codes.ts:36-200` has 164 rest-of-world entries (`row`). They are used only in type aliases (`:205,209`) and appear in no spec.
- **Stale stack comments.** `docker/stack/frontend.compose.yml` says the INS and plants frontends "prime countries at boot … exit(1)". Since EUDPA-575 the frontends load on first read.

Lists the frontend serves itself, which are not master reference data and not in these rows: means of transport, overland means and transporter types (`services/transport-reference/stub.js`), certification purposes, document types and the commodity catalogue. That fits req-065: no new lists move into reference data.

## 4. How the stub compares with real MDM

| Fixture | How it was made | Shape matches real? | Content matches real? | Problems |
|---|---|---|---|---|
| `trade-imports-stub/src/main/resources/responses/portsOfEntryResponse.json` (78 ports) | **Captured from MDM TST** (stub `2489a1f`, EUDPA-154) | Yes for the 3 fields the stub models. Unknown whether the real response has more (type, animal approval). The stub's `MdmPortOfEntry` would drop them anyway | Yes, as of the capture. TST holds plants and test data | Duplicates (`GB PED` and `GB PEM` Pembroke, `GBSHS` and `GB SHS` Sheerness). Misspellings (`Teestort`, `TILBURY`, `Portsmouth  Port`). These are **real MDM data**: report them to MDM, do not fix them in the stub |
| `…/responses/countriesResponse.json` (31 countries) | **Hand-built** (`3b0311c`; Switzerland added by hand, `d72518a`; subdivisions added, `fbed717`) | Field names yes | **No.** Every record has `independent: false`. Only the `GBNAG_SPS_EX` block is present. The stub ignores the `blocks` and `system` parameters (`stubs/mdm/countries/CountriesController.java:21-32`), so an unfiltered call returns the same 31 countries. Real MDM returns the full ISO list | The INS Country select and the animals FE address-book list show 31 countries plus the UK in the stack and CDP dev, but the full list in CDP test. DR2.1's "today the list holds 32 sovereign states" (c-107, req-644) describes the stub. Subdivisions cover only FR (6), PT (2) and ES (1). Whether MDM also has Ceuta, Melilla and the Crown Dependencies is unverified |

## 5. Recommendation for each row

Sam's ruling is that waiting on integration is not the answer. Most of these rows are not waiting on integration at all, because the integration exists. What they wait on is **content**, which belongs to MDM, plus **two port attributes**. Build the presentation now against reference-data as it is. Move content-only acceptance criteria to the MDM content report.

| Row | Call | What to build now | What stays with MDM |
|---|---|---|---|
| inc-006 (req-147) | **Unblock now** (country half) | Destination select offers reference-data's SPS-block countries **plus their subdivisions**, labelled "<territory> (<parent>)" with `originDisplayLabel` (`countries/index.js:80-92`), alphabetically. Same pattern as the origin page | Which countries are in the list (dropping EFTA, adding Crown Dependencies) is MDM content. Add it to the content report |
| inc-006 (req-149) | **Unblock after one MDM answer, then a stub change** | Nothing until the field is known | Ask MDM (the EUDPA-154 Swagger, `get_poes`): does a BCP port of entry carry an animals-approved or exit attribute? If yes: reference-data maps it and adds `GET /ports-of-entry?…` filtering, and the stub fixture carries it for DR2.1's ten exit BCPs. If no: this is genuinely blocked, because no stub can make up a contract field MDM will not send |
| inc-007 (req-370) | **Unblock now** | Transit search offers SPS-block countries plus subdivisions labelled "<territory> (<parent>)". Today it uses `originCountries` with no subdivisions (`transit-countries.controller.js:41`) | Dropping Iceland, Liechtenstein, Norway and Switzerland, and adding Crown Dependencies: MDM content |
| inc-007 (req-302, req-303) | **Not code: move to the MDM content report** | none. The pages already show what MDM serves | The duplicates and misspellings are in MDM TST data. Report them to MDM. Tests must not pin the misspellings |
| inc-007 (req-304) | **Same MDM question as req-149** | none | Port type (airport or seaport) has to come from MDM. Guessing it from "Airport" in the name is the kind of shortcut that should be avoided |
| inc-008 (req-432) | **Unblock now** | Correct the premise first: the list is UK plus the SPS block from reference-data, not hard-coded. Add subdivisions labelled with their parent. Check that the private transporter's name-to-code mapping (`countryCodeOf`, `countries/index.js:159-164`) and the backend's transporter record accept a subdivision code | Crown Dependencies and EFTA: MDM content |
| inc-082 (req-644) | **Unblock now** | Correct the premise: the INS list is reference-data's unfiltered `/countries`. In CDP test that is already the full MDM list, not 32 states. Add subdivisions (the address book stores the code given, presence-checked only, so `ES-CN` is accepted). Narrowing the shared address book (plants uses it too) to DR2.1's 42 is a separate decision, not a stub fix | Which entries are in DR2.1's 42: MDM content, or a block choice to ask MDM about |

**Count:** inc-008 and inc-082 unblock fully. inc-006 and inc-007 split. req-147 and req-370 build now. req-302 and req-303 leave the backlog as MDM content. req-149 and req-304 wait on one MDM contract question. That is 6 of the 8 requirements buildable or resolved now.

## 6. Stub and fixture tidy-up

| # | Repo | Change |
|---|---|---|
| 1 | trade-imports-stub | Recapture `countriesResponse.json` from MDM TST `GET /mdm/geo/countries?system=GBNAG` with no blocks, so it holds the full list with real `independent`, blocks and subdivisions. It must be MDM's shape, not reference-data's, so capture it from APIM, not from `trade-imports-reference-data.test`. Update `FileUtilsTest` counts |
| 2 | trade-imports-stub | Filter by `blocks` in `CountriesController` the way MDM does, so an unfiltered call and a block call differ as they do in real MDM |
| 3 | trade-imports-stub | Keep `portsOfEntryResponse.json` as captured. Recapture it, with any extra fields, once MDM finalises the live-animal port data. Add the field to `MdmPortOfEntry` only when MDM confirms it |
| 4 | trade-imports-reference-data | Only once MDM confirms the field (row 3): map the port type and animal approval into `PortOfEntry`, with a filter parameter. MongoDB is configured but unused (per `docs/repos/trade-imports-reference-data.md:19`). Removing it is optional |
| 5 | trade-imports-animals-frontend | Rerun `_capture/capture.js` after row 1, so all three fixtures are current, `countries.json` gains subdivisions and the full list. Delete the stale "endpoint not built" tag (`capture.js:17-24`). Point both clients at `config.get('tradeImportsReferenceDataApi.baseUrl')`, or delete the unused key |
| 6 | trade-imports-ins-frontend | Replace the 4 hand-typed `COUNTRIES` (`services/countries/stub.js`) with a captured fixture, as the animals FE does, so stub mode and the stack offer the same list |
| 7 | trade-imports-plants-frontend | Same recapture as row 5 (`countries-origin.json` has 0 subdivisions). Same dead config key |
| 8 | trade-imports-ins-tests | Derive `country-codes.ts` `eu` names from the recaptured fixture (for example `Netherlands (the)` may change). Delete the unused 164-entry `row` list |
| 9 | workspace | Correct the stale "primed at boot … exit(1)" comments in `docker/stack/frontend.compose.yml`. In `docs/repos/trade-imports-reference-data.md:28`, list the INS and plants frontends and ports as consumers |
| 10 | cdp-app-config (Sam to commit) | Note only: `MDM_SERVICE_URL` is unset outside dev and test. Before reference-data reaches perf-test or prod it needs the real gateway URL, or the stub's URL for perf-test |

**Where it belongs.** Put rows 1, 2, 5, 6 and 8 in the backlog as **one new row at the head of the `reference-lists` theme**. The rebuilt inc-006, inc-007 and inc-008 should depend on it, because the recapture changes the names and counts their E2E tests assert. inc-082 should depend on it too. Raise rows 3 and 4 and the MDM question as **one separate ticket** under EUDPA-190 (reuse the empty epic): "Port of entry type and animal approval from MDM". Rows 7, 9 and 10 sit outside the programme's repos: raise rows 7 and 9 as a small NO_JIRA chore. Row 10 is Sam's to make in cdp-app-config.

## Open points

- Does MDM's `get_poes` response already carry a port type or an animal-approval flag that reference-data drops? Unverified: the Swagger is on an internal host, and no raw TST response is kept in the workspace.
- Are Ceuta, Melilla, Guernsey, Jersey and the Isle of Man in MDM's `GBNAG_SPS_EX` block, or in any block? That decides whether DR2.1's lists are a block choice (a small code change) or new MDM content.
