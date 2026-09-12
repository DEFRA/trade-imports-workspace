## What changed

Design release 1 calls the live-animals review page **"Review your notification"**. The frontend headed it "Check your answers". This renames it.

The one copy string carries the h1, the browser title and the breadcrumb, so the rename is a single value in the check-answers copy:

- `copy.en.js` — `title` becomes "Review your notification".
- `copy.cy.js` — the machine-draft Welsh moved alongside it.

Two Playwright fit specs asserted the old heading as a literal:

- `hub.fit.spec.js` now imports the check-answers copy and asserts against `checkAnswersCopy.title`, so the assertion follows the copy rather than duplicating it.
- `journey-smoke.fit.spec.js` asserts the new wording.

A stale comment naming "Check your answers" now names the review page.

## Increment and ticket

- Increment: **inc-159**
- Ticket: **EUDPA-585**

## Sibling repo and merge order

This is a cross-repo increment. The sibling is **DEFRA/trade-imports-animals-tests**, where the notification-view page object's h1 locator and four a11y `test.step` labels follow the same rename.

**Merge order: tests first, then this frontend PR.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by specs still waiting on a heading that no longer exists, and CDP would go red. Both PRs must be green — and approved — before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
