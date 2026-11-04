# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-739
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #210 | **Commit:** 21a5a9d

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Remove `transporters/select` page artefacts | animals-frontend ✅; ins-tests ✅ | N/A (no page code here) | CONSISTENT |
| Coverage / notes stop citing the select page | frontend deletes fit test "commercial transporter selection saves and persists"; ins-tests deletes select e2e | ✅ Retargets SCN-FLOW-002-A / SCN-FLOW-003-B notes to list / add-form / type/commercial/private | CONSISTENT |

No config, dependency, feature-flag or structural twin patterns apply. Historical hits under `workareas/shared/` (programme caches) are out of ticket scope and not living Behaviour Spec / recipes.

## Missing Changes

*None identified.* Page and e2e deletions correctly live in the other two repos; this PR only needed coverage-note alignment.

## Unique Changes

- Single-file openspec coverage note rewrites in `openspec/coverage/live-animals/journey-flow/coverage.json` — intentional; workspace owns Behaviour Spec coverage. Spec scenario bodies themselves did not name the select page.

## Naming and Reuse

*None identified.* Notes now say `type/commercial/private`, list save, and commercial add-form — aligned with remaining frontend/ins-tests surfaces, not a second name for the removed page.

## Statements Made Untrue

*None identified (searched in `openspec/`: `transporters/select`, `transporters-select`, `transportersSelect`, `transporterSelection`, `toTransporterSelection`, `transporter-selection`, `Search for an approved commercial transporter`, `commercial select`, `type/select/private`, `commercial transporter selection saves`). Coverage notes in this PR's tree no longer use the old wording; living specs under `openspec/specs/` had no select-page statements. Also searched workspace `docs/best-practices/` — no hits.*

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Openspec coverage notes were updated to match the deleted select-page tests; no further cross-repo gaps for this ticket.
