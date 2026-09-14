## EUDPA-598 — inc-033 (dr1 parity, hub slice)

Design release 1 gives the consignment details their own hub task with their own status. The frontend folded them into the "What are you importing?" row, so the hub could not show whether the numbers, packages and net weight had been entered — only whether the row as a whole was finished.

### What changed

- `flow/task-rows.js` — new **Commodity details** task row carrying the consignment-details page and the commodity-line parts that page collects. The commodities row keeps only the commodity selection, so each row derives its own status.
- Hub copy (`hub/copy/copy.en.js`, `hub/copy/copy.cy.js`) and `hub/controller.js` updated for the new row.
- `check-answers/view-model/incomplete-cards.js` and the consignment-details controller and template follow the re-split obligations.
- Tests updated: `task-rows.test.js`, `status.test.js`, `copy.test.js`, plus the hub, commodity-search and consignment-details fit specs.
- `docs/journey-flow-and-gates.md` updated to describe the two rows.

### Scope

Single repo — `trade-imports-animals-frontend`. No backend or tests-repo changes are part of this increment, so there is no sibling PR and no cross-repo merge ordering to observe.

### Open question (deferred, recorded on the increment)

Should the new **Commodity details** row be gated until a commodity line exists? `consignmentDetailsPage` carries no entry gate, so on a brand-new notification the hub renders a live "Not yet started" row whose link redirects to the commodity search page when there are no lines — two rows that both land on "What are you importing?". Design release 1 shows the row with a "To do" tag from the start, so matching that (row live, silent redirect), gating the row to "Cannot start yet", or explaining the redirect on the search page is a product/design call. Every option beyond the status quo adds a gate and changes hub row statuses for a fresh notification, widening this increment past the row split it exists for.

---

Increment: `inc-033` · Ticket: EUDPA-598 · Corpus: `dr1c`, slice `hub`
