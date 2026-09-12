## What changed

The Arrival details card on **Check your answers** labelled its row "Means of transport", while the question that collects the answer is labelled in full, "Means of transport to the port of entry". Check your answers is the one page where a trader reads their answers back without the question beside them, so the shortened label dropped the part that says which leg of the journey the answer is about.

Design release 1 uses the same words in both places. This restores that: the review row now carries the question's full wording.

- `rows.meansOfTransport` in the check-answers English copy becomes "Means of transport to the port of entry".
- The Welsh copy beside it gains the matching "i'r porthladd mynediad".
- The check-answers unit test looks the row up under its new label.

The string is used only by the Arrival details card, and the question page already carried Design release 1's wording, so nothing else moves.

## Files

- `src/server/app/journeys/linear/features/check-answers/copy/copy.en.js`
- `src/server/app/journeys/linear/features/check-answers/copy/copy.cy.js`
- `src/server/app/journeys/linear/features/check-answers/check-answers.test.js`

## Sibling PR and merge order

This increment also touches **DEFRA/trade-imports-animals-tests**, which updates the CYA-row assertion in `hub-groups-and-cya-rows.spec.ts` to look the row up under its new label.

**Merge order: tests first, then this frontend PR.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. Both PRs must be green (and approved) before either merges.

## Increment

Increment `inc-151` of the DR1 parity union backlog.

Ticket: EUDPA-586

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
