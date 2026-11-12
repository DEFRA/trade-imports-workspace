# Repository Review: trade-imports-workspace

**PR:** #244
**Commit reviewed:** 29ac79f87741df181b3fb172a29c3c591eb371b1
**Files Changed:** 1

## Summary
Updates the commodity-selection coverage: renames the SCN-COMMODITY-SELECT-003-C fit link from "15 species" to "7 species", and drops the SCN-COMMODITY-SELECT-003-E fit link to the deleted Catreus test. The coverage edit tracks the frontend PR exactly, but two workspace docs this PR leaves alone still describe the pre-release captures.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `openspec/coverage/live-animals/journey-pages/commodity-selection/coverage.json` | SAFE | 0 | 0 | 1 |

## Positive Observations
- Coverage links move in the same change as the tests they name, and no other file under `openspec/` refers to the old or removed test titles.
- `tim spec diff --signed-off` over the PR range reports no signed-off scenario changes. The commodity-selection spec is at `detailing` maturity with no Signed off marks.

## Test Coverage
- Unit tests: n/a.
- Integration tests: workspace e2e (3 shards) and the smoke run are green.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** The coverage change is right; the open items are stale prose in `docs/repos/`, which mislead readers but break nothing.

SCN-COMMODITY-SELECT-003-E (a species with no common name is offered by its Latin name alone) can no longer be reached through the stack: no species in the recaptured stub or the frontend fixture lacks a common name. It stays `full` on the probed `species-label.test.js` unit test only (item #1).

Optional wording, not raised as items: `coverage.json:412` says `0106` matches "more than two hundred species" (now 129), and the probe note at `:429` mentions Bibos spp.

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | openspec/coverage/live-animals/journey-pages/commodity-selection/coverage.json | 85 | Minor | coverage-gap | SCN-COMMODITY-SELECT-003-E loses its only page-level witness: the fit link 'offers a species the reference data holds no common name for as its Latin name alone' is removed (correctly, as frontend PR 475 deletes the Catreus test and the recaptured fixture now holds no species with commonName null), leaving only species-label.test.js, which calls speciesLabel({ speciesLatinName }) with the common name absent, not null as reference data sends it. Nothing now checks that a null common name from the search response reaches the page as the Latin name alone. | SCN-COMMODITY-SELECT-003-E has a test that feeds a null common name, as reference data sends it, through the search path to the offered label, linked here. | add a case to search/selection/rows.test.js or search.controller.test.js with a stubbed row whose commonName is null and assert the checkbox label is the Latin name alone, then add that link beside the species-label unit link. | Fix | Done | frontend 010cbfd6, workspace e072e23f |
| 2 | docs/repos/trade-imports-stub.md | 28 | Major | comments | Says 'TST does not set isGerminal yet, so the fixture sets it to true for 05111000 and 05119985.' After the GBNAG release TST flags both isGerminal: true and the recaptured mdmProductCommoditiesResponses.json holds TST's answer as returned (the stub's README.md:91 already says so). | the row states the fixture holds TST's answers as returned, with TST flagging 05111000 and 05119985 germinal. | 'The saved commodity for each known code in codes, in the order asked, as TST returns it (TST flags 05111000 and 05119985 isGerminal: true).' | Merged | — | merged into #10 |
| 3 | docs/repos/trade-imports-reference-data.md | 64 | Major | comments | Says MDM does not yet set isGerminal on these codes in TST, so 05111000, 05119985 and other germinal codes still show in search results, and the stub flags them by hand. After the GBNAG release MDM sets the flag; TST and the stub agree and the filter drops them in both. | the bullet states that MDM flags them and reference-data leaves them out in TST and locally. | 'MDM flags 05111000 and 05119985 isGerminal: true (GBNAG release, EUDPA-786), so reference-data leaves them out in TST and against the stub alike.' | Merged | — | merged into #10 |
| 4 | docs/repos/trade-imports-reference-data.md | 50 | Major | comments | Says the 'cattle' capture has eight rows: five cattle species under 0102, then Bos taurus again under 01061900 and two germinal codes. The recaptured 'cattle' response has four: Bos taurus and Bos sp. under 0102, then Bos taurus under 05111000 and 05119985 (stub ProductControllerTest:59 asserts total 4). | the count and breakdown match the capture. | 'The capture has four: Bos taurus and Bos sp. under 0102, then Bos taurus under two germinal codes.' | Merged | — | merged into #11 |
| 5 | docs/repos/trade-imports-reference-data.md | 57 | Major | comments | Says "cat" also finds Felis, Catagonus and Catreus. The recaptured 'cat' response holds Felis catus, Catagonus spp., Panthera sp. and Bos taurus/Bos sp.; Catreus is in no stub capture. | Catreus is not named as a hit, and the examples are ones the capture returns. | '"cat" also finds Felis catus, Catagonus spp. and Panthera sp.' | Merged | — | merged into #11 |
| 6 | docs/repos/trade-imports-reference-data.md | 58 | Major | comments | Says "ca" returns 14 rows (Caiques, Cockatoos, Equus cabalus and others). The recaptured 'ca' response returns 6 rows (Dasyuromorphia, Equus cabalus, Equus cabalus*asinus, Otra Carnivora, Equus caballus, Rangifer spp.). | the count and examples match the capture. | '"ca" returns 6 rows (Equus cabalus, Rangifer spp. and others) but not cattle, goats or dogs.' | Merged | — | merged into #11 |
| 7 | docs/repos/trade-imports-reference-data.md | 59 | Major | comments | Says "Bos spp." finds nothing, although "Bos sp." and "Bibos spp." exist. Bibos spp. is gone from every capture, and the saved 'Bos spp.' response now returns one row (01061900 Boselaphus spp.). | the statement matches the capture. | '"Bos spp." does not find "Bos sp."; it matches only Boselaphus spp.' | Merged | — | merged into #11 |
| 8 | docs/repos/trade-imports-reference-data.md | 66 | Major | comments | Gives 'Bos taurus is under 0102 and 01061900. Each is a separate choice.' as the example of one species under two codes. The recaptured 'Bos taurus' response lists it under 0102, 05111000 and 05119985 only; 01061900 no longer lists it. | the example is one the capture still holds. | use Bison bison (0102 and germinal 05111000) or Felis catus (01061900 and germinal 05119985), and say the germinal one is filtered out. | Merged | — | merged into #11 |
| 9 | docs/repos/trade-imports-reference-data.md | 67 | Major | comments | Gives 'Animals' for Poephagus spp. as a placeholder common name and Equus cabalus*asinus as a species with no common name. Poephagus spp. is gone from every capture, Equus cabalus*asinus now has 'Hybrid (mule and hinny)', and no species in any stub capture or the frontend fixture has a null or empty common name. | the bullet matches the capture. | 'The recaptured stub holds no species without a common name; MDM TST had some before the GBNAG release (EUDPA-617).' | Merged | — | merged into #11 |
| 10 | docs/repos/trade-imports-reference-data.md | 64 | Major | duplication | One rule, 2 findings: #2, #3 — the fact 'does TST flag 05111000 and 05119985 isGerminal' has two homes in the workspace docs (trade-imports-stub.md:28 and trade-imports-reference-data.md:64), plus the stub's own README.md:91. Both workspace copies went stale together when MDM changed it. | one owner states whether MDM flags the germinal codes; every other place links to it or is deleted. | keep the statement in trade-imports-reference-data.md (it owns the germinal filter) and have the stub.md row say only that the fixture holds TST's answers as returned. | Fix | Done | workspace e072e23f, db18431b |
| 11 | docs/repos/trade-imports-reference-data.md | 50 | Major | duplication | One rule, 6 findings: #4, #5, #6, #7, #8, #9 — trade-imports-reference-data.md:50-67 hand-copies row counts, species names and common names out of the stub's saved MDM search responses. They are a second copy of mdmProductSearchResponses.json, and every MDM recapture makes them false at once, as this one did. | the doc's search examples have one owner, the stub's captured responses; the doc states only the matching rules (substring, case, one species under several codes, missing common names) and either cites the capture or uses examples a test pins. | rewrite :50-67 as rules without counts, naming the stub file as where the current answers live, and fix the six statements as part of that rewrite. | Fix | Done | workspace db18431b (rules kept, findings moved to docs/analysis/mdm-product-search.md) |

## Repository Verdict
**Status:** NEEDS ATTENTION
