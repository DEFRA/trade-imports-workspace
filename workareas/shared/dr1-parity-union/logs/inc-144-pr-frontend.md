## EUDPA-520 — tell the trader that ZIP files are not allowed, and why

Increment `inc-144` of the DR1 parity backlog. Frontend only — the tests repo was
branched for this increment but has no commits, so there is no sibling PR and no
cross-repo merge ordering to observe.

### The parity gap

The file-requirements hint under **"Your file must be:"** on the documents upload
page listed only a maximum size and the accepted file types. The word ZIP appeared
nowhere on the page.

A ZIP is in fact refused — the accepted types are an allow-list of eight extensions
in `upload-config.js`, applied both as the file input's `accept` attribute and as a
server-side check. But a trader who had zipped several certificates together to save
uploads found that out only *after* choosing the file, from a message that never says
ZIP and never gives a reason:

> The selected file must be a PDF, DOC, DOCX, JPEG, PNG, XLS or XLSX

Design release 1 states the rule and the reason up front, as a bullet in the same
hint list (`app/views/upload-documents.html:169`):

> ZIP files are not allowed for security reasons

### What changed

Copy only. The behaviour was already correct — the allow-list already excludes
archives — so nothing about which files are accepted has moved.

- `copy/copy.en.js`, `copy/copy.cy.js` — a new `noZipFiles` key carrying Design
  release 1's words.
- `template.njk` — renders it as a third bullet in the file-requirements hint list.

The bullet is on the page before the trader chooses a file, and stays on the error
state.

### Verification

- `copy/copy.test.js` — the copy key is present in both locales.
- `fit/upload.fit.spec.js` — two assertions: the bullet is visible on the initial
  page, and still visible after a disallowed file type has been rejected.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
