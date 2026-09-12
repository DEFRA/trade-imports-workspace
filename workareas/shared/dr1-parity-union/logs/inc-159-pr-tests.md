## What changed

The live-animals review page is being renamed from "Check your answers" to **"Review your notification"** to match Design release 1. This is the E2E side of that rename.

- `page-objects/notification/notification-view-page.ts` — the h1 locator now points at the new wording, so `open()` stops waiting on a heading that will never appear.
- `tests/a11y/notification-journey-filled-state.spec.ts`, `tests/a11y/notification-journey-initial-state.spec.ts`, `tests/a11y/notification-view-states.spec.ts` — four `test.step` labels reworded off the old name.

The plants page object deliberately keeps "Check your answers": the high-risk-plants frontend still heads its page that way.

## Increment and ticket

- Increment: **inc-159**
- Ticket: **EUDPA-585**

## Sibling repo and merge order

This is a cross-repo increment. The sibling is **DEFRA/trade-imports-animals-frontend**, which carries the rename itself (one copy string driving the h1, the browser title and the breadcrumb, plus two fit specs).

**Merge order: this tests PR first, then the frontend PR.** CDP runs this suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by specs still waiting on the old heading, and CDP would go red. Both PRs must be green — and approved — before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
