## What changed

The hint under **"What are the animals certified for?"** on the additional details page read:

> You'll find this on the health certificate.

A trader importing live animals is holding several certificates, so that line did not say which document to read the sixteen certification purposes off. It also used a contraction the rest of the service avoids.

The hint now reads:

> This information can be found on the ITAHC.

That is the wording Design release 1 uses on its equivalent page (`app/views/additional-animal-details.html:52-55`). The ITAHC — the Intra Trade Animal Health Certificate — is the document the certification purposes are copied off, and it is the same document the service's upload-documents guidance already names.

### Files

- `src/server/app/sets/live-animals/journeys/linear/features/additional-details/copy/copy.en.js` — the hint string.
- `src/server/app/sets/live-animals/journeys/linear/features/additional-details/copy/copy.cy.js` — the Welsh sibling updated to match, naming the same document.
- `src/server/app/sets/live-animals/journeys/linear/features/additional-details/copy/copy.test.js` — a copy test pinning the English string and checking the Welsh one names the same document.

## Scope

Single repo. The increment branched the tests repo as well but changed nothing in it, so no tests-repo PR accompanies this one.

Two other differences on the same page are raised separately and neither blocks this change: the page heading (`identification--page-headings-name-the-animal`) and the size of the two question labels (`identification--certification-questions-set-small`).

## Provenance

Increment `inc-097`, ticket EUDPA-495, from the DR1 parity backlog (`identification` slice, `identification--certified-for-hint`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
