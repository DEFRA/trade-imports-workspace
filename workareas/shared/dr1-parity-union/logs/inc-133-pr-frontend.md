Increment `inc-133` from the `shared/dr1-parity-union` backlog. Ticket EUDPA-519.

## The problem

A trader who filled in the add-a-document form — reference, date of issue, file — and pressed the primary green **Continue** button lost all of it without being told. The fields do post, but the post dispatcher in `src/server/app/sets/live-animals/journeys/linear/features/documents/controller.js` read the payload only for the add and remove actions; every other action reloaded page state and redirected. The trader arrived at the next page with nothing attached and no message.

Design release 1 treats a part-filled form as an intention to attach: it either saves the document or keeps the trader on the page and says what is missing.

## What changed

Continue now finishes the document instead of discarding it.

- A part-filled form is recognised by the chosen document type — the same signal Design release 1 uses, and the one field a trader cannot fill in by accident. `startsADocument` added to `form/payload.js`.
- Such a post is routed through the existing `postAdd` path, so it either saves and returns the trader to the page ready for the next document, or re-renders with the field errors that say what is missing. No new validation and no new copy.
- The redirect after a save became an injected `afterSave` callback, so the add and continue paths can land differently. The old fall-through moved into `leavePage`, which keeps the still-settling check that holds Continue back while a file is being scanned.
- The exit to the overview still leaves a part-filled form behind, as Design release 1 does. "Save and return to hub" is unchanged.

## Tests

- Controller unit tests cover both Continue outcomes (saves and moves on; re-renders with errors) and the untouched-form pass-through.
- The upload fit spec covers the same two outcomes end to end.
- `add-a-collection.md` notes the pattern for the next collection that needs it.

## Repos

Frontend only. The tests repo was branched for this increment but needed no change, so there is no sibling PR and no cross-repo merge ordering to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
