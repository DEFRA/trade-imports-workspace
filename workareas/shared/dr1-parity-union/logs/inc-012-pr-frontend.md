## What this changes

Increment `inc-012`, ticket EUDPA-522, from the DR1 parity backlog.

Almost every journey page ends with a primary button reading **"Save and continue"** — that is what the shared `save-actions.njk` macro renders when a page passes no primary of its own. The accompanying-documents page and the consignment addresses hub each passed their own primary labelled just **"Continue"**, so both offered a button that does not say it saves sitting immediately to the left of a secondary "Save and return to hub".

Design release 1 reads "Save and continue" on both of those pages, and reserves a bare "Continue" for the two pages at the end of the journey where there is nothing left to save.

## The change

- Removes the per-feature `continueButton` copy key from the **documents** and **addresses** features (`copy.en.js` and `copy.cy.js`).
- The **addresses** template drops its `primary` argument entirely and falls through to the macro's default.
- The **documents** template keeps its `primary` override — it also carries `name="action"` and `value="continue"`, which the post dispatcher branches on — and now takes its text from the shared `saveAndContinue` key, so there is one source for the label.

## Deliberately untouched

Check your answers and the declaration are **not** renamed. Design release 1 reads "Continue" on those pages too, so the two sides already agree and renaming would introduce a difference that does not exist today.

## Tests and docs

- Copy unit tests for both features drop the removed key.
- Fit specs for the documents upload and scan-status pages, and for the addresses hub picker, assert the primary now reads "Save and continue".
- The journey smoke spec and its journey helper follow the new label.
- `docs/journey-flow-and-gates.md` is updated to match.

## Scope

Frontend only. The tests repo was branched for this increment but needed no changes, so there is no sibling PR and no cross-repo merge ordering to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
