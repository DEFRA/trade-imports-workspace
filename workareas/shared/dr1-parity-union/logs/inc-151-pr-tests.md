## What changed

The frontend's Arrival details card on **Check your answers** now labels its means-of-transport row with the question's full wording, "Means of transport to the port of entry", matching Design release 1 and the frontend's own question page.

This updates the CYA-row assertion in `tests/e2e/features/hub-groups-and-cya-rows.spec.ts` to look the row up under its new label, so the E2E suite tracks the frontend change rather than failing on the old short label.

## Files

- `tests/e2e/features/hub-groups-and-cya-rows.spec.ts`

## Sibling PR and merge order

This increment also touches **DEFRA/trade-imports-animals-frontend** (PR #327), which makes the copy change itself.

**Merge order: this tests PR first, then the frontend PR.** CDP runs this suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. Both PRs must be green (and approved) before either merges.

## Increment

Increment `inc-151` of the DR1 parity union backlog.

Ticket: EUDPA-586

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
