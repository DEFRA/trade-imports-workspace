# Code Review: EUDPA-669

**Ticket:** Save commodity name, code and type for each commodity on a notification  
**Reviewer:** Cursor Agent  
**Date:** 2026-10-26  
**Last Updated:** 2026-10-26  
**Verdict:** **PASS** (refresh)

## Summary

The PR set persists `commodities[]` with per-entry name, CN code, MDM `description`, and species `commonName`; GBN-AG trade lines use those fields; legacy `commodity` reads via `NotificationCommodities`. List/dashboard paths are aligned (`NotificationView` exposes `commodities`, frontend `commodityFieldForListRow`, INS upsert reads GBN-AG `description[0]` then `commonName`). Prior review items are addressed on branch, including the INS `commonName`-only unit test (`459760e`). **ins-tests** [#55](https://github.com/DEFRA/trade-imports-ins-tests/pull/55) adds Mongo persistence coverage for `commodities[]` (single- and Cow+Cat multi-commodity).

## Repositories Analyzed

| Repository | PR | Commit reviewed | Files | Verdict | Review |
|------------|-----|-----------------|-------|---------|--------|
| trade-imports-animals-frontend | [#432](https://github.com/DEFRA/trade-imports-animals-frontend/pull/432) | `57aa13e3` | 17 | SAFE | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-animals-backend | [#115](https://github.com/DEFRA/trade-imports-animals-backend/pull/115) | `253bbda0` | 17 | SAFE | [review.trade-imports-animals-backend.md](review.trade-imports-animals-backend.md) |
| trade-imports-ins-backend | [#27](https://github.com/DEFRA/trade-imports-ins-backend/pull/27) | `459760e6` | 2 | SAFE | [review.trade-imports-ins-backend.md](review.trade-imports-ins-backend.md) |
| trade-imports-ins-tests | [#55](https://github.com/DEFRA/trade-imports-ins-tests/pull/55) | `0686f455` | 5 | SAFE | *(supplemental — see below)* |

**Branch:** `fix/EUDPA-669-commodity-name-code-type` (same name across repos)

## Refresh summary (2026-10-26)

- **Previous verdict:** PASS WITH NOTES → **New verdict:** PASS  
- **Files re-reviewed:** 1 (`NotificationUpsertServiceTest.java`)  
- **Todo items resolved:** 1 / 1 (INS item #1 Fix+Done verified)  
- **New issues found:** 0  

## Acceptance Criteria Check

| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | `commodities[]` with name, code, type per commodity on save | ✅ | Mapper + backend model + stub descriptions |
| 2 | Multi-commodity (e.g. Cow + Cat) correct on each line / GBN-AG | ✅ | `GbnAgMapperTest` + mapper tests + ins-tests persistence |
| 3 | Mixed types on one commodity → type on species | ✅ | Mapper test for Game+Domestic on Cow |
| 4 | Legacy `commodity` read without migration | ✅ | `NotificationCommodities` |
| 5 | Identifiers remain on `species` | ✅ | Unchanged |
| 6 | Dashboard / list shows commodity after save | ✅ | `NotificationView` + list marshal + INS upsert |

## Test Coverage Assessment

- **Unit tests:** Present and updated (animals-backend, animals-frontend, ins-backend)
- **E2E / persistence:** ins-tests PR #55 — `persistence-notification.spec.ts` asserts `commodities[]`; new `persistence-multi-commodity.spec.ts` for Cow+Cat
- **Characterisation:** Oracles regenerated on frontend
- **Merge:** ins-tests PR is mergeable on `main` after rebase (`0686f455`)

## trade-imports-ins-tests (#55) — supplemental notes

Reviewed at PR diff (not in original `prepare-review` clone). Journey helpers (`submitNotificationWithCowAndCat`) align with main’s `NotificationAnswers` / `ALL_ANSWERS`. Types in `notification-document.ts` match the new Mongo shape.

| Severity | Note |
|----------|------|
| Minor | `persistence-multi-commodity.spec.ts` uses `if (!cow \|\| !cat) return` after `expect(...).toBeDefined()` — redundant; dropping the early returns would avoid a vacuous pass if someone removes the expects. |
| Minor | Cat ID values (`UK-CAT-1`, microchip) are hardcoded in `answerCowAndCatIdentification` — acceptable for one journey helper; extract only if reused elsewhere. |

No blockers for merge.

## Configuration & Environment

- **New Environment Variables:** None
- **Database Changes:** `commodities[]` on notification subdocument; legacy `commodity` cleared on save

## Risk Matrix

| Category | Risk Level |
|----------|------------|
| Correctness | Low |
| Code Quality | Low |
| Security | Low |
| Test Coverage | Low |

## Conclusion

**Approved for merge** across the four PRs once CI is green. Stub MDM descriptions remain until live reference-data lookup (EUDPA-617) is wired at save — already understood scope. E2E persistence specs need the compose stack on the **669** frontend/backend branch images.

**Artifacts:** `workareas/reviews/EUDPA-669/` (`items.*.json`, `file-reviews/`). Use `walk review EUDPA-669` to triage any item dispositions.
