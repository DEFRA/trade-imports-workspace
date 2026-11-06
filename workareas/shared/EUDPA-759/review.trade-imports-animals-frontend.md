# Review — trade-imports-animals-frontend (PR #454)

**Verdict:** PASS WITH NOTES

## Summary

Removes overview return controls on the origin page by passing `showReturnControls: false` into `saveActions`. Docs, controller tests, FIT, and opening-run tests are updated so hub-exit behaviour is tested on pages that still offer it (commodity selection mid-run) and validation stays on the POST path for Save and continue.

## Positive observations

- Minimal product change using the existing save-actions macro.
- Controller tests refactored rather than deleted: blank region code on submit covered without `exit: 'hub'`.
- Security audit green on PR via joi 18.3.1 + `hapi-pulse` override (helps **main**, which still fails audit).

## Test coverage

- FIT + unit + ins-tests E2E/visual aligned with openspec updates.
- `opening-run.test.js` correctly relocates mid-run hub save probe.

## Repository verdict

PASS WITH NOTES — one Minor scope note on bundled dependency bumps.
