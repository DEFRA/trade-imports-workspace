## What this changes

Design release 1 parity increment **inc-049**, ticket **EUDPA-527**.

A trader currently meets three spellings of one term across two pages. The CPH page is headed
`County Parish Holding (CPH)` — a title-cased noun phrase that doubles as the input's label — while
the consignment addresses hub calls the same thing `County Parish Holding number (CPH)`, and check
your answers repeats that third spelling again.

Design release 1 words it consistently and in lower case, and makes the page heading an instruction
rather than a label. This PR aligns the frontend with that everywhere the term appears.

## The changes

- **CPH page** — headed `Add the county parish holding number (CPH)` as its own `h1`, with the input
  beneath it labelled `CPH number` using a small label, so the heading is no longer the field label.
- **Consignment addresses hub** — the row and its hint read `County parish holding (CPH) number` and
  the matching lower-case hint sentence.
- **Check your answers** — the row reads `County parish holding (CPH) number`.

Welsh copy follows the same wording. The copy tests, the addresses and check-answers controller
tests, the `cph-number` fit spec and the journey fit fixture are updated to match.

Files touched: the `cph-number`, `addresses` and `check-answers` copy files (`copy.en.js` and
`copy.cy.js`), the `cph-number` template, their tests, and `fit/live-animals-journey.js`.

## Scope

Frontend only. The tests repo was branched for this increment but needed no changes, so there is no
sibling PR and no cross-repo merge ordering to observe here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
