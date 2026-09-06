## What changed

Design release 1 puts a **Change number of animals** link in the header bar of every
species panel on the animal identification page, beside the counter that tells the
trader how many animals they are being held to. The frontend had no such link — a
trader who had miscounted had to leave through the hub or the breadcrumb, find the
consignment details row, and come back. It bites harder than it looks, because the
frontend enforces the count in both directions: reducing the number afterwards is
refused outright with "You have N identifier records for X but entered M animals",
which tells a trader the number is wrong and gives them nowhere to go.

Each identification card now renders that link in its heading area, pointing at the
consignment details route:

- `_identification-card.njk` — the link in the card heading, with a visually hidden
  card title so the repeated link text stays distinguishable for screen-reader users.
- `animal-identification.controller.js` — passes the consignment details target into
  `buildCard`.
- `card/view-model.js` — carries the target on the card view model.
- `copy/copy.en.js`, `copy/copy.cy.js` — the new copy in English and Welsh.

Matching Design release 1 needs nothing more than the bare href: its link carries no
species id, no query and no return parameter, so the trader lands on consignment
details with all the counts on it. Carrying a change context so they return to the
identification page afterwards would be an improvement on Design release 1 rather
than parity with it, and is left to be decided separately.

## Tests

- `animal-identification.controller.test.js` — the target is built and passed through.
- `copy/copy.test.js` — the new copy key in both languages.
- `fit/identification.fit.spec.js` — the link renders on each card and points at the
  consignment details route.

## Increment

Increment `inc-098`, ticket EUDPA-401, from the DR1 parity union backlog.
Frontend only — the tests repo was branched for this increment but needed no change,
so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QU1nK61XsgdY25ueTiqM45
