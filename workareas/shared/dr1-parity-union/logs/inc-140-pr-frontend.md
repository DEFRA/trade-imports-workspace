## What this changes

Increment **inc-140**, ticket **EUDPA-511**.

The upload-documents page went from the `h1` straight into the Document reference field. Nothing between them told the trader what to attach or why: no body copy, no list of document kinds, no expander and no link out to the GOV.UK guidance. The words ITAHC, invoice and certificate appeared nowhere on the page outside the saved-documents table, and the feature's copy file held no guidance keys at all, so there was nothing waiting to be switched on.

The page now opens with the three blocks Design release 1 states, above the form and in its reading order:

1. **Intro paragraph** — attach an ITAHC if the consignment requires one, it can be added later, upload everything before the consignment reaches the UK port, in English and all pages.
2. **"Other documents you may need to attach include:"** over its two bullets — import licences or authorisations, and commercial documents or invoices.
3. **A closed `govukDetails` expander**, "Check which additional documents you must upload", holding the two-column Consignment / Documents needed table with its three rows, and the link to the GOV.UK guidance, opened in a new tab.

The table is drawn with the govuk-frontend table component and carries a visually hidden caption, so the expander's content is announced as a named table rather than a bare grid.

The GOV.UK href is the clean guidance URL. Design release 1's link carries `_gl` cross-domain analytics parameters that capture one prototype session and cannot be carried across.

## Scope

Content only — no new field, no validation, no service call. The copy is new user-facing text, added to the feature's English copy with the machine draft Welsh alongside it, and the outbound URL is allowlisted as identical across locales in the copy-parity test.

## Tests

A new fit spec covers it: the guidance reads above the form, the additional-documents table stays behind a closed expander until it is opened, the GOV.UK link opens in a new tab, and the expanded guidance raises no serious or critical axe violations.

## Repos

Frontend only. The increment branched the tests repo as well, but changed nothing in it, so no PR is raised there and there is no merge ordering to observe.

## Files

- `src/server/app/sets/live-animals/journeys/linear/features/documents/template.njk`
- `src/server/app/sets/live-animals/journeys/linear/features/documents/copy/copy.en.js`
- `src/server/app/sets/live-animals/journeys/linear/features/documents/copy/copy.cy.js`
- `src/server/app/sets/live-animals/journeys/linear/features/documents/copy/copy.test.js`
- `src/server/app/sets/live-animals/journeys/linear/features/documents/fit/guidance.fit.spec.js`
- `src/server/app/copy-parity.test.js`

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
