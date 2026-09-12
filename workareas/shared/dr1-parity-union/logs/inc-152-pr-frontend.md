## What this changes

Check your answers printed the single placeholder **"Not provided"** for every empty value, so a trader could not tell a question that genuinely does not apply from an answer that is still owed.

Design release 1 draws those two cases differently. This splits them and decides per card:

- **An empty value on a finished card reads "Not applicable".** `notApplicableCell` in the check-answers view-model builds that cell and stamps `empty: true`, so emptiness is marked structurally rather than inferred from the rendered text — a trader who types "Not applicable" into a free-text answer keeps their own words.
- **An empty value inside a card that still has answers outstanding gets no text at all.** `blankEmptyValues` in `incomplete-cards.js` rewrites every flagged row of an errored card to `missingCell`, which draws the missing style and leaves only a visually hidden "Missing" for a screen reader. Required or optional makes no difference: the card is unfinished, so nothing in it is settled business.

`dateText` now returns `null` for a blank date instead of the placeholder, so the empty date reaches `row` unmarked and `row` places the placeholder — one place decides, not two.

A new `_summary-list-missing.scss` component carries the missing style, and the English and Welsh copy files carry the two new strings.

## Scope

Frontend only. The tests repo was branched for this increment but needed no change, so it has no PR — nothing to sequence against, and this can merge on its own once green.

## Verification

Unit and functional-integration specs for check-answers updated and passing (`check-answers.test.js`, `check-answers.fit.spec.js`, `copy.cy.js`).

Increment inc-152 · EUDPA-584

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
