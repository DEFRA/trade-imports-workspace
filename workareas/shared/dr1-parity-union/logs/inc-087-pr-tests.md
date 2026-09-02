## What broke

The E2E suite went red on the frontend PR for EUDPA-373
(DEFRA/trade-imports-animals-frontend#228, increment `inc-087`). Two of
three shards failed — 14 tests on shard 3, 25 on shard 1 — every one of
them on the same call:

```
Error: locator.check: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('checkbox', { name: 'Bos taurus' })
    at page-objects/notification/commodity-selection-page.ts:19
    at Journey.answerCommodity (flows/journey.ts:89)
    at Journey.unlockSections (flows/journey.ts:120)
```

`unlockSections()` is the first step of nearly every journey, so the
failure fanned out well past the commodity page: transited countries,
transporter, admin notifications, outbox events, the INS aggregated
notification store and more.

## Why

EUDPA-373 replaces the printed tick-box list on "What are you importing?"
with a search. The page now lists nothing of its own accord — results
appear only once a query of at least three characters has been submitted
(`MIN_SEARCH_LENGTH`, `search/matching.js`). `selectSpecies` was ticking a
checkbox straight off the loaded page, and that checkbox no longer exists
until the species has been searched for.

This is a test-side catch-up, not a defect in the frontend change.

## What changed

- **`page-objects/notification/commodity-selection-page.ts`** — adds
  `searchBox`, `searchButton`, `selectionPanel` and `clearAll` locators
  and a `search(query)` action. `selectSpecies` now searches for each
  name before ticking it, mirroring `fit/live-animals-journey.js:180-190`
  in the frontend repo. Ticks made under an earlier query ride back with
  the form as hidden `selection` values, so they survive the next search.
- **`tests/e2e/pages/commodities.spec.ts`** — the printed-checklist
  assertions are replaced by the behaviour the page became: nothing
  listed on load, nothing under three characters, matching species
  grouped under their commodity heading, a no-results message, the
  running "N selected" count with Clear all, and pairs found under
  different queries persisted across a save and a return. Net wider
  coverage than before, not narrower.
- **`tests/e2e/features/reference-strip.spec.ts`** — waits for the search
  box rather than a species tick box to confirm the commodity page loaded.

No test was weakened, skipped or deleted, and no check was disabled.

## Verified

`npm run typecheck`, `npm run lint` and `prettier --check` clean, then
against the workspace stack running the branch-tagged frontend image
(`run-stack.sh -b feat/EUDPA-373-frontend-asks-what-is-being-imported-by`):

- `tests/e2e/pages/commodities.spec.ts` — 7 passed
- `reference-strip`, `cph-scope`, `animal-identifiers-conditional`,
  `animal-identifiers-cap`, `additional-details-scope`,
  `transited-countries`, `transporter`, `transporter-selection` —
  15 passed

## Belongs to

Increment `inc-087` / **EUDPA-373**. Pairs with
DEFRA/trade-imports-animals-frontend#228 — same branch name, cross-repo
branch parity. Merge alongside it.
