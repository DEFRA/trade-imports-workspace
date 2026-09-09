## EUDPA-524 — scan-status tag labels match Design release 1

Increment `inc-142` of the DR1 parity backlog. Frontend-only: the tests repo was branched
alongside but needed no change, so this is the increment's single PR.

### The difference

The Status column of the saved-documents table shows a tag per document. The frontend
labelled the two shared scan states "Checking" and "Safe"; Design release 1 labels the same
two states "Scanning for virus" and "Check completed". Design release 1 also puts visually
hidden text naming the document before each tag, so a screen-reader user hears which
document the status belongs to rather than a bare "Safe".

### What changed

- `copy.en.js` / `copy.cy.js` — `PENDING` becomes "Scanning for virus" and `COMPLETE`
  becomes "Check completed", in both the English and Welsh copy.
- `view-model/fragments/status.js` and `fragments/text.js` — add the visually hidden
  "Virus check status for {reference}" prefix ahead of each tag, and thread the document
  reference through `rows.js` so the prefix can name it.
- The client-side polling payload is generated from the same copy, so the live-updating tag
  picks the new words up with no separate edit.
- Tests updated alongside: `copy.test.js`, `controller.test.js`, the documents fit specs
  (`scan-status.fit.spec.js`, `upload.fit.spec.js`) and `journey-smoke.fit.spec.js`.

The frontend's two further states, "Virus found" and "Unknown", have no counterpart in
Design release 1 and are left alone.

Ticket: EUDPA-524
Increment: inc-142

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
