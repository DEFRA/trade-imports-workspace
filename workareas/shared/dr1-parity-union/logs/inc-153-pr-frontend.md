## What and why

Increment **inc-153** — ticket **EUDPA-589**.

After submitting, the frontend never told the trader what was still outstanding. The confirmation page went straight from the green panel to "Transporting the consignment", so a trader who submitted a notification with no health certificate attached was told nothing about it. Documents are optional for submission — the documents group carries only a cap, no floor and no required-one-of — so that state is reachable, and the submitted page was the last place the service could have said so.

Design release 1 heads the submitted page with "Before the consignment is imported" and lists the documents and identifiers still owed. This adds that section between the declaration date and the transport guidance: a heading, the line "You still need to:", and one bullet per outstanding item, rendered only when there is at least one.

## Changes

All under `src/server/app/journeys/linear/features/confirmation/`:

- `outstanding.js` — new `outstandingItems(answers, evaluation)`, returning the documents bullet when the documents collection is empty.
- `controller.js` — pulls answers and evaluation from state and passes `outstandingItems` to the view.
- `template.njk` — renders the heading, intro and bullet list behind a length guard, so the section disappears when nothing is outstanding.
- `copy.en.js` / `copy.cy.js` — the heading, intro and documents bullet.
- `controller.test.js`, `template.test.js`, `confirmation.fit.spec.js` — cover both the empty and non-empty cases and the rendered markup.

## Known gap, deliberately left

Design release 1 carries a second bullet, for animal identifiers. It is not built here: it waits on the identifier-completeness decision (inc-103), which is still open. `outstandingItems` returns a list and the template iterates it, so that bullet is one copy key plus one condition once the ruling lands. The open question is recorded against inc-153 in the parity backlog.

## Scope

Frontend only. The increment branched the tests repo as well, but nothing there needed changing, so no sibling PR and no merge-order constraint.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
