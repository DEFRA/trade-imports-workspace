## What this changes

DR1 draws the document being added, and the button that saves it, inside a bordered
group headed "File upload". The frontend ran the whole upload page as one flat column
— the document fields, "Save and add another", the saved-documents table, then
Continue and the page-level save actions — with no heading, border or container
between them. "Save and add another" and Continue read as two buttons in the same
list, so nothing on the page told the user that the first acts on the fields above it
and the second leaves the page.

The reference, date of issue and file fields, the "Save and add another" button and
the saved-documents table now sit inside a bordered group headed "File upload", drawn
with the govuk-frontend summary card rather than a bespoke panel. The group is
labelled from its own `h2` via `aria-labelledby`, so the grouping is announced as well
as drawn. The page-level Continue, Save and return to hub, and Cancel and return to
hub stay outside the border, below it.

Reading order is unchanged — fields, add button, table — and no behaviour changes.
This is layout and one heading.

The heading is new user-facing copy, added to the feature's English copy and to the
machine-draft Welsh alongside it.

## Files

- `src/server/app/journeys/linear/features/documents/template.njk` — the summary-card
  grouping and `aria-labelledby`
- `src/server/app/journeys/linear/features/documents/copy/copy.en.js` and
  `copy.cy.js` — the "File upload" heading
- `src/server/app/journeys/linear/features/documents/fit/upload.fit.spec.js` — two new
  fit specs

## Tests

Two new fit specs cover the grouping: one over the empty page, asserting the fields
and the add button fall inside the region and Continue does not; one over the
populated page, asserting the saved row stays inside the same group with the page
actions outside it.

## Increment

Increment `inc-139`, ticket EUDPA-510. Frontend only — the tests repo was branched for
this increment but needed no changes, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
