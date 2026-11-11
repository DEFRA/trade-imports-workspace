# Code Review: EUDPA-777

**Ticket:** Remove the commodity type from the live animals journey and from what we send on  
**Reviewer:** Cursor Agent  
**Date:** 2026-11-11  
**Verdict:** PASS WITH NOTES

Workarea: `workareas/reviews/EUDPA-777/` (68 files across 6 PRs).

## Summary

The PR set removes the silent `commodityType` / `typeOfCommodity` / GBN-AG `typeCode` path end-to-end for live animals, with schema documentation aligned to PIMS (no new schema version). Pinned clones show no leftover `commodityType`, `typeOfCommodity`, or journey-sourced `typeCode` in ticket-scope code. Cross-repo consistency is **CONSISTENT**.

One **Major** doc fix on the backend copy mapper; two **Minor** optional schema doc polish items.

**Bundle hygiene:** **address-book** [#24](https://github.com/DEFRA/trade-imports-address-book/pull/24) implements **EUDPA-674** (Mongo trace `comment`), not this Story — SAFE but exclude from EUDPA-777 merge sign-off. Merged **workspace** [#222](https://github.com/DEFRA/trade-imports-workspace/pull/222) is **`tim jira update`** used to rewrite the ticket text; it does not satisfy product ACs.

## Repositories Analyzed

| Repository | PR | Commit reviewed | Files | Repo verdict | Review |
|------------|-----|-----------------|-------|--------------|--------|
| trade-imports-animals-frontend | [#470](https://github.com/DEFRA/trade-imports-animals-frontend/pull/470) | `54a60d09` | 30 | SAFE | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-animals-backend | [#124](https://github.com/DEFRA/trade-imports-animals-backend/pull/124) | `a156d8ad` | 10 | NEEDS ATTENTION | [review.trade-imports-animals-backend.md](review.trade-imports-animals-backend.md) |
| trade-imports-ins-tests | [#94](https://github.com/DEFRA/trade-imports-ins-tests/pull/94) | `c49635f3` | 4 | SAFE | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-schemas | [#71](https://github.com/DEFRA/trade-imports-schemas/pull/71) | `4331b68d` | 3 | SAFE (Minor notes) | [review.trade-imports-schemas.md](review.trade-imports-schemas.md) |
| trade-imports-address-book | [#24](https://github.com/DEFRA/trade-imports-address-book/pull/24) | `8f9601ce` | 14 | SAFE (orthogonal) | [review.trade-imports-address-book.md](review.trade-imports-address-book.md) |
| trade-imports-workspace | [#222](https://github.com/DEFRA/trade-imports-workspace/pull/222) merged | `0ffc3d7a` | 7 | SAFE (orthogonal) | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check

| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | No type asked, derived or stored in live animals journey | Yes | Table, obligation, silent stamp, mapper paths removed in frontend PR |
| 2 | Notification carries no `typeOfCommodity` | Yes | Mapper + models updated; ins-tests models aligned |
| 3 | GBN-AG trade lines carry no `typeCode` from notification | Yes | `TradeLineItem` population removed; tests updated |
| 4 | Legacy stored type still reads/submits | Yes | `NotificationIT` shed-on-save path (known frontend draft gap per ticket comment) |
| 5 | Domestic/Game table and tests deleted | Yes | No matches in review clones |
| 6 | Schemas mapping row corrected | Yes | Body updated; heading polish optional (item #1 schemas) |
| 7 | Germinal `typeCode` + samples unchanged | Yes | Field retained; samples untouched per ticket |
| 8 | `validate-schemas` / `validate-samples` | Not run in review | Rely on schemas CI |
| 9 | PIMS confirmation | N/A | Pre-evidenced in ticket |

## Open Items (walker not run)

| # | Repo | Sev | Issue |
|---|------|-----|-------|
| 1 | animals-backend | Major | `NotificationCopyMapper` class Javadoc still mentions commodity "type" on copy |
| 1 | schemas | Minor | `pims-data-mapping.md` "Type selection" heading |
| 2 | schemas | Minor | `gbn-ag-data-dictionary.md` `urlId` row wording |

## Next steps

- **Fix:** `implement review EUDPA-777` (or triage with `walk review EUDPA-777`)
- **Re-check:** `refresh review EUDPA-777` after new commits
