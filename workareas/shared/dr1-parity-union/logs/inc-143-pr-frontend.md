## What this changes

Four of the accompanying-documents upload page's validation messages were worded
differently from Design release 1's. This brings them into line, in both the
English and Welsh copy files:

| Key | Before | After |
|---|---|---|
| `dateRequired` | Enter the date of issue | Enter a date of issue |
| `dateInvalid` | Enter a real date of issue | Enter a real date |
| `fileRequired` | Select a file to upload | Upload a document |
| `maxDocuments` | You can add a maximum of {max} documents | You can upload a maximum of {max} files |

Each string serves both the error summary and the field-level message, so one
edit each fixes both places. The maximum itself is still derived from the
obligation — only the wording changes here. The frontend's own extra validation
messages, which have no DR1 counterpart, keep their current wording.

Unit tests that asserted the previous strings are updated to match.

## Files

- `src/server/app/journeys/linear/features/documents/copy/copy.en.js`
- `src/server/app/journeys/linear/features/documents/copy/copy.cy.js`
- `src/server/app/journeys/linear/features/documents/copy/copy.test.js`
- `src/server/app/journeys/linear/features/documents/controller.test.js`

## Cross-repo

Increment `inc-143`, ticket **EUDPA-526**. This is a two-repo increment: the
sibling PR is on **DEFRA/trade-imports-animals-tests**, on the same branch
`feat/EUDPA-526-four-of-the-upload-page-s-validation-mes`, updating the E2E
assertion for the `maxDocuments` wording.

**Merge order: tests first, then this frontend PR.** CDP runs the tests repo's
suite against the deployed frontend, so a frontend merged ahead of its own test
fixes would be exercised by stale specs and CDP would go red. Both PRs must be
green (and approved, where the gate is on) before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
