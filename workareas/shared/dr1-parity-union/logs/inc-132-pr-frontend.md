## What changed

The file field on the **Upload documents** page was labelled "Upload a file". That repeats the page heading and the "Save and add another" button as an instruction, rather than naming the thing being collected — out of step with the two fields above it, "Document reference" and "Date of issue", which both name their answer.

Design release 1 labels the same field **Attachment**: a noun, consistent with the other fields in the card, and the word DR1 uses for the file throughout the page. The service already shows an "Attachment type" row on check your answers.

- `copy.en.js` — `"Upload a file"` → `"Attachment"`
- `copy.cy.js` — `"Uwchlwytho ffeil"` → `"Atodiad"`. This also clears a collision, where the Welsh label and the Welsh file-upload section heading were both "Uwchlwytho ffeil".
- `copy.test.js` — new assertion covering the label in both languages.

Copy only. No behaviour change, no template change, no dependency.

## Scope

Single repo — `trade-imports-animals-frontend`. The tests repo was branched for this increment but needed no change, so it has no PR.

## Verification

The parity falsifier for this finding is "finding the frontend's file field labelled *Attachment* on the rendered page". The documents copy test now asserts exactly that label in `en` and `cy`.

---

Increment: `inc-132`
Ticket: [EUDPA-525](https://eaflood.atlassian.net/browse/EUDPA-525)
Corpus: `dr1` (Design release 1 parity), slice `documents`

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
