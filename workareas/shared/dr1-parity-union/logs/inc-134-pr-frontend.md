## What this changes

The documents page listed only two file requirements above the upload control — the 10 MB size limit and the accepted file types. Nothing on the page said how many documents a notification may hold, so a trader learned the limit only by reaching it and being refused after they had already chosen a file.

This adds a third bullet to the file-requirements hint stating the maximum number of documents. The count is read from the same obligation value the "too many documents" error message reads, so the hint and the error can never disagree, and the sentence follows the cap if its value changes.

## Changes

- `documents/copy/copy.en.js` — new hint bullet copy, taking the document count as a value
- `documents/view-model/render.js` — passes the obligation's document count into the copy
- `documents/template.njk` — renders the third bullet in the file-requirements list
- `documents/copy/copy.cy.js` — Welsh key parity
- `controller.test.js`, `copy.test.js`, `upload.fit.spec.js` — cover the new bullet and the value it reads

## Parity finding

Design release 1 states the count as one of the requirements in the hint above the upload control, alongside the size and the file types (`app/views/upload-documents.html:168`). The frontend hint had two bullets and no count (`documents/template.njk:43-48`).

## Increment

- Increment: `inc-134` (corpus `dr1c`, slice `documents`)
- Ticket: EUDPA-521
- Scope: frontend only. The tests repo was branched for this increment but needed no changes, so there is no sibling PR and no cross-repo merge order applies.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
