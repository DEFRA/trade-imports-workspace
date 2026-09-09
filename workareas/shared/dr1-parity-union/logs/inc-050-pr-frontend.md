## What this changes

The CPH number page had no help content at all — a heading, a hint, an input and the buttons. A trader who does not know what a CPH number is, or does not know they have one, had nothing on the page to work from.

This adds a collapsed `govukDetails` expander between the heading and the input, summarised **"What is a CPH number?"**, holding two paragraphs:

- what a county parish holding number is,
- where a trader can find theirs.

It is collapsed by default, so it costs nothing to a trader who already knows.

## How

- `template.njk` — the `govukDetails` call, above the input.
- `copy.en.js` / `copy.cy.js` — new `help` entries for the summary and both paragraphs.
- `copy.test.js` — the copy files stay in step, English and Welsh.
- `cph-number.fit.spec.js` — the expander's presence, its summary text and its body are asserted on the rendered page.

## One deliberate omission

In DR1 the second paragraph ends in a link to the GOV.UK holding-details page, but DR1's own `href` is a placeholder (`#`) — the destination has not been identified. The increment allowed shipping the paragraph without the link, naming APHA documents only, and that is what this does. Adding the real destination is left for when that page is known.

## Increment

- Increment: `inc-050`
- Ticket: [EUDPA-531](https://eaflood.atlassian.net/browse/EUDPA-531)
- Corpus: `dr1`, slice `addresses`
- Screens: `fe-cph-number` vs `dr1-cph-number`

Frontend only — the tests repo was branched for this increment but needed no change, so there is no sibling PR and no cross-repo merge ordering to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
