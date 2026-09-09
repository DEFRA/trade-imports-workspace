## What this changes

The file-requirements hint on the upload-documents page told the trader the service
accepts "a PDF, DOC, DOCX, JPEG, PNG, XLS or XLSX" — seven types, with JPG missing.
A `.jpg` file was nevertheless accepted: it is in the allow-list and in the input's
`accept` attribute, which renders as `.pdf,.doc,.docx,.jpeg,.jpg,.png,.xls,.xlsx`.

JPG disappeared from the sentence because the label list was built from the accepted
MIME types and de-duplicated, and `.jpeg` and `.jpg` both map to `image/jpeg`, so the
second of the pair was dropped. The same truncated list was repeated back to the trader
in the file-type error message, so anyone whose file was refused for some other reason
read a list that did not include the extension they were holding.

The hint is now built from the extension list instead, so it reads
"PDF, DOC, DOCX, JPEG, JPG, PNG, XLS or XLSX" and matches what the input accepts.
Design release 1 lists both spellings (`app/views/upload-documents.html:167`).

Copy only — the allow-list and the `accept` attribute are unchanged, so nothing about
which files are accepted has moved.

## Files

- `src/server/app/sets/live-animals/journeys/linear/features/documents/upload-config.js`
- `src/server/app/sets/live-animals/journeys/linear/features/documents/upload-config.test.js`

## Tests

Updated the hint expectation, and added one that holds the hint in step with
`ACCEPT_ATTRIBUTE` so the two cannot drift apart again.

## Provenance

- Increment: `inc-141` (parity corpus `dr1c`, slice `documents`)
- Ticket: EUDPA-523
- Frontend only — the tests repo was branched for this increment but needed no change,
  so there is no sibling PR and no cross-repo merge ordering to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
