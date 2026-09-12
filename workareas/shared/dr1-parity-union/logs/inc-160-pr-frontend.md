# EUDPA-587 — declaration checkbox error message

Increment **inc-160** of the DR1 parity union backlog. Frontend only — the tests repo was branched
for this increment but needed no change, so there is no sibling PR to sequence against.

## What was wrong

Submitting the declaration page with the box unticked raised **"Confirm that the information is true
and correct before submitting"**. That sentence points at the accuracy of the answers, but the
checkbox does not ask the trader to vouch for their answers — it asks them to confirm they have read
the declaration above it and will comply with it. The error named the wrong act.

Design release 1 says **"Confirm that you have reviewed and comply with this declaration"**, which
names what the box actually confirms. This adopts that wording.

## What changed

- `copy.en.js` — `declarationRequired` becomes "Confirm that you have reviewed and comply with this
  declaration".
- `copy.cy.js` — the Welsh copy beside it gains the matching wording.
- `controller.test.js` — the declaration controller unit test expects the new string.
- `declaration.fit.spec.js` — now also asserts the inline message under the checkbox, not just the
  error summary link.

One string feeds both places the message appears — the error summary link and the inline message
under the control — so both move together. The rest of the error state was already right: the same
"There is a problem" summary, the same anchor to the checkbox, the same inline message under the
same control.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
