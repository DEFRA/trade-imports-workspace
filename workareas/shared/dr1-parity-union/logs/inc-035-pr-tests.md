## What broke

The E2E suite went red on frontend PR
[DEFRA/trade-imports-animals-frontend#341](https://github.com/DEFRA/trade-imports-animals-frontend/pull/341):

```
tests/e2e/features/hub-groups-and-cya-rows.spec.ts:6
  the hub groups its tasks under the six numbered group headings
  expect(locator('ul.app-task-list').nth(1)).toContainText('Animal identification details')
  Timeout 5000ms — the list held only "Additional commodity details … Cannot start yet"
```

That failure is the frontend change landing, not a defect. EUDPA-597 (increment
inc-035 of the DR1 parity union) makes the hub's identification task conditional
on a chosen commodity actually carrying identifiers, so on a newly created
notification the row is off the page rather than drawn locked with "Cannot start
yet" — which is what Design release 1 does. The spec still pinned the row under
group 2 on a fresh notification, so it asserted the behaviour the increment
removed.

## What changed

`tests/e2e/features/hub-groups-and-cya-rows.spec.ts` only:

- group 2 now pins just "Additional commodity details";
- a positive assertion that the identification row is **absent** while nothing
  has been chosen, so the new behaviour is pinned rather than merely unpinned;
- the comment listing the conditional rows (exit details, transit countries) now
  names identification too.

Nothing was skipped, deleted or weakened. Presence of the row once a commodity
needs identifiers stays covered by `animal-identifiers-conditional.spec.ts` here
and by `hub.fit.spec.js` in the frontend, which covers both directions.

## Verified

- `npm run typecheck` — clean
- `npm run lint` — clean
- frontend `hub.fit.spec.js` — 12 passed, including "when no commodity is chosen,
  the animal identification row is absent" and "when a commodity carrying
  identifiers is chosen, the animal identification row appears"

## Belongs to

Increment inc-035 (dr1 parity union), ticket EUDPA-597. Travels with frontend PR
#341 — same branch name, cross-repo branch parity.
