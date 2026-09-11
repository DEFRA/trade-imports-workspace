## What and why

Check your answers dropped the whole Documents section when nothing had been
uploaded, so a trader with no documents saw no mention of documents on the page
they are told to check before submitting, and had no route to the upload page
from the review. Documents are optional, so this is the ordinary case rather
than an edge one.

Design release 1 gives documents a permanent section of its own, with an
"Uploaded documents" card carrying a Change link to the upload page. The section
is not conditional: with nothing uploaded the card still stands, empty, under
its heading and with its Change link.

## What changed

All in `src/server/app/sets/live-animals/journeys/linear/features/check-answers`:

- `view-model/cards/documents.js` — drop the early return on an empty
  collection and render the Uploaded documents card in an empty state, keeping
  its Change link to the upload page.
- `view-model/sections/documents.js` — drop the early return that suppressed
  the section when the card was null, so the section is always built.
- `view-model/index.js` — always append the Documents section rather than only
  when it exists.
- `template.njk` and copy (`copy.en.js`, `copy.cy.js`) — the empty-state text
  for the card.
- `check-answers.test.js` and `check-answers.fit.spec.js` — cover the empty
  case: the heading, the card and the Change link are all present with nothing
  uploaded.

No new answers, no obligation change, and the upload page it links to already
exists.

## Scope

- Increment: `inc-149`
- Ticket: EUDPA-577
- Single repo. The tests repo was branched for this increment but needed no
  change, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
