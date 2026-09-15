## What broke

The E2E shard `e2e (2, 3)` on the frontend PR
[DEFRA/trade-imports-animals-frontend#342](https://github.com/DEFRA/trade-imports-animals-frontend/pull/342)
failed on `tests/e2e/pages/commodities.spec.ts:48` — "Commodity selection page ›
accepts and persists multiple commodity-species pairs found under different
queries" — on the first run and on retry 1:

```
Error: expect(locator).toContainText(expected) failed
Locator: locator('#commodity-selection')
Expected substring: "2 selected"
Error: element(s) not found
```

The captured `error-context.md` shows the page the test was on when it failed:
the notification **Overview**, not the commodity search page.

## Why

Frontend increment inc-033 (EUDPA-598) splits the consignment-details page out
of the "What are you importing?" task row into a hub task row of its own,
labelled "Commodity details". The page is therefore now reached from the hub,
and its back link returns to the overview instead of to the commodity search
page.

The spec still assumed the old flow: it clicked the consignment-details back
link and expected to land straight on the search page, so the selection panel
`#commodity-selection` was never on screen.

## What changed

`tests/e2e/pages/commodities.spec.ts` — after clicking the back link the test
now confirms it is on the overview and reopens the search page from the
"What are you importing?" row, which is the row that owns it. This is the same
route the frontend's own `search.fit.spec.js` takes after the same change.

The assertions themselves are untouched: the test still proves that both
commodity-species pairs survive the round trip, are listed under the running
count with no query, and are ticked again when their own query brings them back
on screen.

## Where it belongs

- Increment: `inc-033`
- Ticket: EUDPA-598
- Travels with: DEFRA/trade-imports-animals-frontend#342 (same branch name,
  cross-repo branch parity)
