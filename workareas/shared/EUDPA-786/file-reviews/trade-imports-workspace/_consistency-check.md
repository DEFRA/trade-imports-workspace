# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-786
**All repos in scope:** trade-imports-animals-frontend, trade-imports-performance-tests, trade-imports-stub, trade-imports-workspace
**PR:** #244 | **Commit:** 29ac79f

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Fit test retitled "shows Bison bison among 7 species under a searched 0102 code" | animals-frontend `search.fit.spec.js:404` ✅ | ✅ `openspec/coverage/live-animals/journey-pages/commodity-selection/coverage.json:67` | CONSISTENT |
| Catreus fit test ("offers a species the reference data holds no common name for…") removed | animals-frontend removes it ✅ | ✅ link removed from SCN-COMMODITY-SELECT-003-E; the probed unit test keeps the scenario `full` | CONSISTENT |
| Other changed frontend tests keep their titles (`finds cattle…`, `lists 0102 species in species-label order`, `Should list every species under a code searched for…`, `Should list every species of a code found by its code, a page at a time`) | animals-frontend ✅ | ✅ coverage links still resolve by title | CONSISTENT |
| Docs that describe the stub's MDM data (`docs/repos/trade-imports-stub.md`, `docs/repos/trade-imports-reference-data.md`) | stub recapture changes that data ✅ | ❌ not updated | INCONSISTENT — see Statements Made Untrue |

`commodity-selection` spec carries no `Maturity`/`Signed off` marks, so the coverage edit does not trip the signed-off rule.

## Missing Changes

- `docs/repos/trade-imports-stub.md` and `docs/repos/trade-imports-reference-data.md` describe the stub's saved MDM captures and the germinal gap the release closed. The stub recapture makes several of their statements untrue (table below). The ticket's recommendation is "Update the docs that describe the old search results"; these are such docs, and this PR is the workspace's place to fix them.

## Unique Changes

*None identified.* The coverage edit is the follow-through from the frontend test changes.

## Naming and Reuse

*None identified.*

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `docs/repos/trade-imports-stub.md:28` | "TST does not set `isGerminal` yet, so the fixture sets it to `true` for `05111000` and `05119985`." | TST now sets `isGerminal: true` on both, and the recaptured `mdmProductCommoditiesResponses.json` holds TST's answer as returned (stub `README.md:91` already says so). | The row states the fixture holds TST's answers as returned. | "The saved commodity for each known code in `codes`, in the order asked, as TST returns it (TST flags `05111000` and `05119985` `isGerminal: true`)." |
| `docs/repos/trade-imports-reference-data.md:64` | "MDM does not yet set `isGerminal` on these codes in TST, so 05111000, 05119985 and other germinal codes still show in search results until MDM populates the flag. `trade-imports-stub` flags them…" | MDM's GBNAG release sets the flag; TST and the stub agree, and the filter now drops them in both. | The bullet states that MDM flags them and the filter leaves them out in TST and locally. | Replace with "MDM flags 05111000 and 05119985 `isGerminal: true` (GBNAG release, EUDPA-786), so reference-data leaves them out in TST and against the stub alike." |
| `docs/repos/trade-imports-reference-data.md:50` | "`cattle` … The capture has eight: five cattle species under 0102, then Bos taurus again under 01061900 and two germinal codes." | The `cattle` capture has four rows: Bos taurus and Bos sp. under 0102, then Bos taurus under 05111000 and 05119985 (stub `ProductControllerTest:59` asserts total 4). | The count and breakdown match the capture. | "The capture has four: Bos taurus and Bos sp. under 0102, then Bos taurus under two germinal codes." |
| `docs/repos/trade-imports-reference-data.md:57` | "\"cat\" also finds Felis, Catagonus and Catreus." | The `cat` capture holds Felis catus, Catagonus spp., Panthera sp. and Bos taurus/Bos sp.; no Catreus anywhere in the stub. | Catreus is not named as a hit. | "…\"cat\" also finds Felis catus, Catagonus spp. and Panthera sp." |
| `docs/repos/trade-imports-reference-data.md:58` | "\"ca\" returns 14 rows (Caiques, Cockatoos, Equus cabalus and others)" | The `ca` capture returns 6 rows (Dasyuromorphia, Equus cabalus, Equus cabalus*asinus, Otra Carnivora, Equus caballus, Rangifer spp.). | The count and examples match the capture. | "\"ca\" returns 6 rows (Equus cabalus, Rangifer spp. and others) but not cattle, goats or dogs." |
| `docs/repos/trade-imports-reference-data.md:59` | "\"Bos spp.\" finds nothing, although \"Bos sp.\" and \"Bibos spp.\" exist." | Bibos spp. is gone from every capture, and the saved `Bos spp.` response now returns one row (`01061900` Boselaphus spp.). | The statement matches the capture. | "\"Bos spp.\" does not find \"Bos sp.\"; it matches only Boselaphus spp." |
| `docs/repos/trade-imports-reference-data.md:66` | "Bos taurus is under 0102 and 01061900. Each is a separate choice." | The `Bos taurus` capture lists it under 0102, 05111000 and 05119985 only; 01061900 no longer lists it. | Give an example that still holds. | Use Felis catus or Canis familiaris (01061900 and germinal 05119985), or Bison bison (0102 and 05111000), and say the germinal one is filtered out. |
| `docs/repos/trade-imports-reference-data.md:67` | "\"Animals\" for Poephagus spp." as a placeholder common name, and "Equus cabalus*asinus" as a species with no common name. | Poephagus spp. is gone from every capture; Equus cabalus*asinus now has the common name "Hybrid (mule and hinny)". | The bullet matches the capture. | Every example is now false: Catagonus spp. is "Chacoan peccaries", Babyrousa is "Babirusas", Equus cabalus*asinus is "Hybrid (mule and hinny)", Poephagus spp. is gone. No species in any stub capture (or the frontend fixture) has a null or empty common name. Say so: "The recaptured stub holds no species without a common name; MDM TST had some before the GBNAG release (EUDPA-617)." |

Note for the reviewer (not a Must): SCN-COMMODITY-SELECT-003-E ("A species the reference data holds no common name for is offered by its Latin name alone") can no longer be reached through the stack at all — no species in the recaptured stub or the frontend fixture lacks a common name. That is why the Catreus fit test went. The scenario stays `full` on the probed `species-label.test.js` unit test; the ins-tests e2e and frontend fit layers can no longer cover it unless a test-only fixture row is added.

Optional, not a Must: `openspec/coverage/live-animals/journey-pages/commodity-selection/coverage.json:412` and `:429` — notes say `0106` matches "more than two hundred species" (the frontend fixture now has 129 under 0106; the test still asserts the 100 cap, so the claim "more than a hundred" holds) and a probe "expected Bibos spp." first under 0102 (a historical probe record; Bibos is gone). Worth refreshing the wording when next touched.

Searched: `isGerminal`, `germinal`, `05111000`, `05119985`, `Catreus`, `Bibos`, `Novibos`, `Ovibos`, `Poephagus`, `Elephas`, `Loxodonta`, `Bison bonasus`, `15 species`, `010420`, `Capra`, `Canis familiaris`, `two hundred` across `docs/**`, `openspec/specs/**`, `openspec/coverage/**`, `README.md`, `CLAUDE.md`. `openspec/specs/live-animals/journey-obligations/commodity-selection/spec.md:33,62` name `010420` (goats) in rules from the data-fields spec, not MDM data — still true.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 8 inconsistencies found (1 in `docs/repos/trade-imports-stub.md`, 7 in `docs/repos/trade-imports-reference-data.md`)
**Summary:** The coverage edit tracks the frontend test changes exactly, but the workspace's stub and reference-data pages still describe the pre-release captures and the "TST doesn't set isGerminal yet" gap that this ticket closes.
