# Code Review: EUDPA-617

**Ticket:** Integrate early-access MDM commodity API into live animals frontend
**Reviewer:** Claude Code Agent
**Date:** 2026-10-23
**Verdict:** FAIL

## Summary
The integration path is built end to end: frontend → reference-data → MDM, with stubs in both the frontend and trade-imports-stub, ins-tests specs and spec updates. The contracts line up across all five repos. But the change sends the CN code as the commodity name to PIMS and the INS dashboard, and it encodes three rules that differ from the ticket's recorded decisions or settle questions the ticket still has open: the permanent address by species alone, a ten-result cap, and how a removed species is treated. There is also a large volume of house-rule findings (comments, duplicated test fixtures, naming).

Scope note: GitHub search also returned trade-imports-animals-backend#114. That PR is EUDPA-296 work (direct-to-uploader upload), so it was moved out of scope. No backend PR exists for EUDPA-617.

## Repositories Analyzed
| Repository | PR | Commit reviewed | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-frontend | #422 | 89ae5d4 | 154 | RISKY | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-ins-tests | #45 | 1cee8e8 | 30 | RISKY | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-reference-data | #36 | c8a8ee2 | 29 | NEEDS ATTENTION | [review.trade-imports-reference-data.md](review.trade-imports-reference-data.md) |
| trade-imports-stub | #26 | 60be5df | 10 | NEEDS ATTENTION | [review.trade-imports-stub.md](review.trade-imports-stub.md) |
| trade-imports-workspace | #135 | f7d977c | 15 | RISKY | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | Search returns results for a common name ("cattle") | Yes | Proven by the frontend fit specs, ins-tests `commodities.spec.ts` and the reference-data IT. |
| 2 | Search returns results for a commodity code ("0102") | Partial | Results are returned, but `SEARCH_PAGE_SIZE = 10` shows 10 of the 15 species under 0102, with no sign more exist. The ticket's 15 Oct decision is up to 100 (frontend #289, workspace #16). |
| 3 | Search returns results for a Latin name ("Bos taurus") | Yes | Covered by fit and E2E specs. |
| 4 | Unsupported search behaviour is documented | Yes | `docs/repos/trade-imports-reference-data.md` lists partial matching, the 25-row cap and duplicate species. One claim there ("cat" finds Bos taurus through "Aurochs") is wrong (workspace #4). |
| 5 | API gaps fed back to the MDM team | Not verifiable from code | The ticket comments (30 Sep, 14 Oct) record the follow-ups. The doc's "need to go back to the MDM team" line has no record of where they went (workspace #7). |
| 6a | Reference data stub updated for docker compose | Partial | Product endpoints are added, but species pages are saved for only 4 codes. Any other offered code (pig, donkey) is refused at check your answers on the stack (stub #13). |
| 6b | Frontend stub data matches the reference-data response | Partial | The shape and grouping match. But `total` means matching species in the frontend stub and MDM rows in reference-data (reference-data CommoditySearchResponse item). The fixture is hand-built rather than captured (frontend stub.js item). The line fixtures used in unit tests store `speciesLatinName` as an array the service never returns (frontend #290). |
| Spec | Behaviour-spec changes describe the agreed behaviour | **No (Critical)** | REQ-OB-COMMODITY-006 keys the permanent address on species alone, but decision 5 says code 01061900 plus species (workspace #12, frontend #288). REQ-COMMODITY-SELECT-011 sets a 10-result cap against the agreed 100 (workspace #16). REQ-CYA-014 makes the open "removed species" question a MUST (workspace #14). |

## Test Coverage Assessment
- **Unit Tests:** Present. Broad updates, but many fixtures no longer match the stored line shape, and several titles claim more than they prove.
- **Integration Tests:** Present. The reference-data WireMock ITs and the frontend FIT specs. Two E2E specs absorbed the commodity-name change (ins-tests #6, #21).

## Configuration & Environment
- **New Environment Variables:** ins-tests reads a reference-data base URL (local default `localhost:8086`, CDP service URL). The frontend reuses `TRADE_IMPORTS_REFERENCE_DATA_URL`, read directly rather than through the existing convict key (frontend request.js item).
- **Database Changes:** None. The notification answer keys are renamed (`commoditySelection` → `commodityCode`, `speciesSelection` → `speciesLatinName`, plus `commonName`). I found no migration for drafts saved under the old keys. Confirm how existing drafts behave: frontend #3 notes that a draft holding only `commoditySelection` shows the CPH row on check your answers.

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | High |
| Code Quality | High |
| Security | Low |
| Test Coverage | Medium |

## Conclusion
FAIL. Before merge:
- Decide on the ticket what `commodity.name` and the PIMS commonName and description carry (frontend #287).
- Bring the permanent-address rule and the result cap into line with the recorded decisions, in code and spec (#288, #289).
- Fix `GAME_SPECIES` to MDM's spelling (frontend #273).
- Capture species pages for every code the stub offers (stub #13).
- Make an empty MDM answer distinguishable from a real empty one (reference-data #43).

Full item lists are in each `review.{repo}.md`.
