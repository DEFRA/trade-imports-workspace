## What this changes

Increment **inc-084** (ticket **EUDPA-391**) of the DR1 parity backlog — the tests-repo
half.

The frontend headed the quantities page **"Consignment details"**; Design release 1 heads
the same page **"Commodity details"**. The frontend PR renames the page. This PR follows
that rename in the E2E suite:

- The consignment-details page object now waits on the **"Commodity details"** `h1`.
- The two a11y journey specs (initial state and filled state) are updated to match the
  page's new name.
- The e2e page spec is updated to match.

Assertions only — no new specs, no fixture or seed-data changes.

## Files

- `page-objects/notification/consignment-details-page.ts`
- `tests/a11y/notification-journey-initial-state.spec.ts`
- `tests/a11y/notification-journey-filled-state.spec.ts`
- `tests/e2e/pages/consignment-details.spec.ts`

## Sibling PR and merge order

This increment spans two repos. The sibling PR is on
**DEFRA/trade-imports-animals-frontend**, same branch name
(`feat/EUDPA-391-frontend-heads-the-quantities-page-consi`), carrying the copy change that
renames the page.

**Merge order: this tests PR first, then the frontend PR.** CDP runs this suite against
the deployed frontend, so if the frontend merged first it would be exercised by specs
still waiting on the old "Consignment details" heading and CDP would go red. Both PRs
must be green — and approved — before either one merges.
