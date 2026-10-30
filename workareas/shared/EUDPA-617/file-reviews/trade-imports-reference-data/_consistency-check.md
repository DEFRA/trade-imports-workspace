# Consistency Check: trade-imports-reference-data

**Ticket:** EUDPA-617
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-reference-data, trade-imports-stub, trade-imports-workspace
**PR:** #39 | **Commit:** 3d9426f

trade-imports-animals-backend#114 is an EUDPA-296 PR and is left out. Findings already in `file-reviews/trade-imports-reference-data/*.review.json` are not repeated. That includes the 1,234 species figure, which the README and the workspace page share.

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Branch `fix/EUDPA-617-review-followups` | animals-frontend ✅, ins-tests ✅, stub ✅, workspace ✅ | ✅ Present | CONSISTENT |
| Two kinds of MDM row, described for readers | workspace ✅ `docs/repos/trade-imports-reference-data.md`, stub page ✅ links to it | ✅ README "Commodity search" | CONSISTENT |
| Capture keys named in the docs | stub ✅ `cattle`, `Bos taurus`, `0102`, `01061900`, `010`, `ostrich` are all saved in `mdmProductSearchResponses.json` | ✅ README names the same keys | CONSISTENT |
| Size and page limits on `GET /commodities` | workspace ✅ states 1 to 100, default 100, page from 0 | ✅ `CommoditiesController.java:45-47` | CONSISTENT |
| 500 and 503 split | animals-frontend ✅ turns any failed answer into its own 503, so the split changes nothing a trader sees | ✅ README states the split | CONSISTENT |
| Coverage links to this repo's tests | workspace ✅ no link names a test this PR renamed | ✅ | CONSISTENT |

## Missing Changes

*None identified.* The workspace repo page says nothing about failure answers, so the new split leaves nothing there untrue.

## Unique Changes

`MdmErrorDecoder`, `fromMdm` and `TokenEndpointUnavailableException` are local to this service and within the follow-ups to the last review.

## Naming and Reuse

*None identified.* `MdmUnavailableException`, `handleMdmUnavailable`, the log line and the `@ApiResponse` now share one name. Test method names already said `throwsMdmUnavailable`.

## Statements Made Untrue

*None identified beyond the per-file reviews (searched: `MdmUnusableResponse`, `handleMdmUnusableResponseException`, `no usable answer`, `sent no usable`, `whenMdmRefusesTheCall`, `503` in the countries controller package and `src/main/resources`, and test titles describing an MDM failure, across `src/`, the README, and the workspace `docs/` and `openspec/`).*

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The old exception and wording are gone everywhere, and the docs agree with the stub captures and the frontend's handling, apart from what the per-file reviews already raise.
