## What changed

The accompanying-documents cap rises from 10 to 15, so the frontend matches Design release 1.

Design release 1 allows fifteen documents (`MAX_UPLOADED_DOCUMENTS` at `app/routes.js:9025`); the frontend allowed ten. The cap is a single obligation constant on the documents group — `maxEntries` in `src/server/app/sets/live-animals/obligations/sections/documents.js` — and the page, the submit guard and the error message all read it from there, so changing that one value is the whole behavioural change. The error copy already interpolates the number, so a trader who chooses a sixteenth file now sees "You can add a maximum of 15 documents" with no copy edit.

Alongside it:

- the obligation file's own header comment, which described the group as 0..10, now says 0..15
- `src/server/app/sets/live-animals/docs/limits.md` is updated to match
- the tests that asserted the old cap (obligations evaluator, documents controller, linear-flow status) are updated with it

## What this deliberately does not do

- **Stating the limit on the page before a trader chooses a file** is a separate change, tracked as inc-134. The frontend still teaches the limit only by refusing at it.
- **Whether the capacity message keeps the word "documents" or takes Design release 1's "files"** is settled by inc-143, not here.

## Scope

Single repo — `trade-imports-animals-frontend`. The cap is a frontend obligation constant with no counterpart on the wire: no other service is told the number, so there is no backend or tests-repo companion PR for this increment. The tests repo was branched for the increment but had nothing to change.

Increment: inc-135
Ticket: EUDPA-516

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
