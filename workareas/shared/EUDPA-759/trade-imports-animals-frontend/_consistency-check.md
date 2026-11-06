# Consistency check — trade-imports-animals-frontend (EUDPA-759)

## Ticket alignment

- **AC:** Origin page shows only "Save and continue" (no save/cancel return to overview) outside amendment.
- **Implementation:** `origin/template.njk` passes `showReturnControls: false` to `saveActions` — same mechanism as CPH/pickers per `page-design.md`.
- **Amend path:** Docs and openspec (workspace PR) state origin while amending keeps "Save and return" + "Save and continue" only; `showReturnControls: false` suppresses overview exits, not amend controls.

## Test migration

- Hub-exit controller tests removed; validation retained on `Save and continue` POST path plus new empty-suffix unit test (replaces hub-only blank-code test).
- `opening-run.test.js` moves mid-run `exit: 'hub'` probe from origin POST to commodity selection POST — consistent with origin no longer exposing hub exit.
- FIT replaces cancel-to-hub with `expectPageEndsWithPrimaryAlone`.

## Docs / openspec

- `page-design.md`, `journey-flow-and-gates.md`, `add-a-page.md` updated; workspace PR updates behaviour spec and coverage in step.

## Cross-repo

- ins-tests PR asserts form buttons/links on origin; visual snapshots updated.
- No backend or INS API changes required.

## Notes

- **package.json / lock:** Security-audit dependency fixes bundled — scope note only, not a functional mismatch.

**Consistency verdict:** Aligned.
