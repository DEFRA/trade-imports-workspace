## What this changes

The declaration page showed three bare headings, a four-item list and two closing
sentences, with no supporting text under any heading. A trader ticking the box was
affirming four compressed phrases, with no statement of when the responsibility starts
or which regulation it sits under. The first heading stood alone, and the second carried
the whole responsibility statement in one long line.

Design release 1 gives each statement a heading **and** a body. This adopts that wording
whole. It is a legal statement the trader is asked to affirm, so it is taken as written
rather than approximated — as it stood, the frontend committed the trader to less than
Design release 1 asks for.

- The first heading gains the sentence "I am complying with the requirements of
  Regulation (EU) 2017/625 including on animal health and welfare."
- The second heading shortens to "I confirm I am responsible for this consignment." and
  gains the sentence saying when responsibility begins, plus its two bullets: cleared
  official checks at the border, and reached the Place of Destination as stated on the
  health certificate or notification.
- The four accountability items take Design release 1's wider wording, covering
  arrangements and costs rather than only the acts.
- The Welsh copy beside it gains the matching wording throughout.
- The template renders a paragraph under each of the first two headings, and a bulleted
  list under the second.

The two closing sentences and the checkbox label were already word-for-word Design
release 1's, so they do not move. The declaration date on the page is a volatile value
that neither side compares.

## Tests

- The copy unit test asserts the new paragraphs and the responsibility bullets.
- The declaration fit spec asserts the same. Its heading lookup becomes exact, so the
  shortened second heading does not also match the longer strings.

## Files

- `src/server/app/journeys/linear/features/declaration/copy/copy.en.js`
- `src/server/app/journeys/linear/features/declaration/copy/copy.cy.js`
- `src/server/app/journeys/linear/features/declaration/copy/copy.test.js`
- `src/server/app/journeys/linear/features/declaration/declaration.fit.spec.js`
- `src/server/app/journeys/linear/features/declaration/template.njk`

## Scope

Increment `inc-148` of the DR1 parity union backlog. Frontend only — the tests repo was
branched for this increment but needed no change, so it has no PR.

EUDPA-588

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
