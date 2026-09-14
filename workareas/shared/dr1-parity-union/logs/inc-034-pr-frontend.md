## EUDPA-596 — The hub hides the animal and package totals until a commodity has been added

Increment `inc-034` of the `dr1-parity-union` backlog.

### The parity gap

The live-animals hub suppressed the "Your commodities" summary entirely until the
notification held at least one commodity line. Design release 1 shows the two totals
panels from the first visit, both reading zero.

### What changed

- `src/server/app/journeys/linear/features/hub/controller.js` — `buildCommodityTotals`
  no longer returns `null` for an empty commodity collection. It returns the two panels
  with both totals reading zero.
- `src/server/app/journeys/linear/features/hub/template.njk` — the guard around the
  summary block is removed, so the panels render unconditionally, directly under the
  page heading.
- `src/server/app/journeys/linear/features/hub/copy/copy.test.js` and
  `src/server/app/journeys/linear/features/hub/hub.fit.spec.js` — cover the zero-state
  panels alongside the populated ones.

### Scope

Frontend only. The increment branched the tests repo as well, but nothing in the E2E
suite needed changing, so no PR is raised there — no backend or contract change is
involved, and this PR merges on its own.

Ticket: EUDPA-596
