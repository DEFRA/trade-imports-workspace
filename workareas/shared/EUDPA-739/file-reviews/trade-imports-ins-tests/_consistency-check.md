# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-739
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #85 | **Commit:** b3a7a46

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Remove `transporters/select` page artefacts | animals-frontend deletes page ✅; workspace retargets coverage ✅ | ✅ Deletes page object, `toTransporterSelection`, e2e spec, journey doc note | CONSISTENT |
| Cascade delete of select-page tests | frontend deletes unit/fit/parity coverage of the page ✅ | ✅ Deletes `tests/animals/e2e/pages/transporter-selection.spec.ts` | CONSISTENT |
| Openspec coverage notes no longer cite select-page tests | workspace updates notes that pointed at deleted fit/e2e wording ✅ | N/A (coverage owned by workspace) | CONSISTENT |

Matches Martyn Nevers' ticket comment (delete the three named artefacts). No config, dependency, feature-flag or twin-frontend patterns apply.

## Missing Changes

*None identified.* Frontend owns the page deletion; workspace owns openspec coverage rewrites.

## Unique Changes

- Deletes animals journey helper / page object / e2e that only opened the orphaned URL — intentional; required by ticket comment and out of scope for the frontend PR's own files.
- Docs note under `docs/animals-journey.md` for `toTransporterSelection` removed — intentional; documents the deleted helper.

## Naming and Reuse

*None identified.* `transporterSelection` / `toTransporterSelection` / `AnimalsTransporterSelectionPage` removed consistently with frontend's `transportersSelect` removal; no dual name left behind.

## Statements Made Untrue

*None identified (searched: `transporters/select`, `transporters-select`, `transportersSelect`, `transporterSelection`, `toTransporterSelection`, `transporter-selection`, `Search for an approved commercial transporter`, `commercial transporter register`, `approved commercial`, `select and details`, `type/select`). Checked `docs/`, flows, page-objects, test titles; no remaining hits in this repo.*

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Test-repo cascade matches the frontend page removal and the ticket comment; no stale references remain.
