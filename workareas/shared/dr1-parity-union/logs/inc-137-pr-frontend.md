## What this changes

Design release 1 lets a trader drop a document onto the page and shows which file is chosen. The frontend offered only the browser's own file button — a bare `input.govuk-file-upload` with no drop target, no service-owned "Choose file" button and no announcement of the chosen filename.

This turns on govuk-frontend's JavaScript-enhanced file upload for the documents control, so the trader gets the drop zone Design release 1 hand-built in the prototype. The design-system component already ships the behaviour (drop zone, "Choose file" button, "or drop file", a polite live region naming the chosen file, and an error style on the zone itself), so nothing is hand-rolled.

- `template.njk` asks `govukFileUpload` for `javascript: true` and passes the service's own copy for the choose-file button, the "or drop file" instruction, the "No file chosen" status and the drag enter/leave announcements.
- The documents client bundle runs `createAll(FileUpload)` before anything else reads the DOM, because the component renames the input and puts a button in front of it.
- The oversize-validation client modules now resolve the *control* (the drop-zone button, which carries the field id and the `aria-describedby` state) separately from the *file input* (which carries the error class), via a new `control.js`.
- The shared FIT journey helper and the documents specs target the file input directly, since the enhanced markup hides it behind the button.
- New `drop-zone.fit.spec.js` pins the zone, the live region naming the chosen file, the drag-and-drop path and the error style on the zone.

The unenhanced input stays behind the component as the no-JavaScript fallback.

## Increment

Increment `inc-137` of **EUDPA-514**, from the DR1 parity backlog.

## Cross-repo

This increment also touches **DEFRA/trade-imports-animals-tests**, on the same branch name — the accompanying-documents page object follows the enhanced markup, targeting the file input rather than the label (which now resolves the drop-zone button).

**Merge order: tests first, then this frontend PR.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. There is no backend change in this increment.

Both PRs must be green (and approved, where the gate is on) before either merges.

## Open questions carried forward

Two pieces of coverage are deferred rather than fixed here, and are recorded on the increment:

1. The clear-previous-client-errors path (`oversize-validation/submit.js`) is only reachable on a second submit after a client-side oversize error, and no current test shape reaches it cheaply. Pinning it properly wants the repo's first jsdom unit-test lane, which is a wider decision than this increment.
2. The no-JavaScript fallback is asserted only in a JS-enabled context today. A genuine JS-off case needs a no-JavaScript variant of the shared journey helper (country of origin currently goes through the JS-only type-ahead), which is outside this increment's blast radius.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
