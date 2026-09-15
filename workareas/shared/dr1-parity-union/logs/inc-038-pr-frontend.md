## What changed

The hub's "description of the goods" group listed **Additional commodity details** first and **Animal identification details** second. Design release 1 runs that section as commodity details, then identification details, then additional details — pointing a trader at identifying the animals before asking what they are certified for, which is also the order the opening run visits the two pages in.

This swaps the last two rows of the group so identification comes before additional details.

- `src/server/app/sets/live-animals/journeys/linear/features/hub/controller.js` — reorder the group's rows, with a comment saying why
- `src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.test.js` — assert the new row order for the group
- `src/server/app/sets/live-animals/journeys/linear/features/hub/hub.fit.spec.js` — add an overview test that reads the group's task list by its group id and checks all three titles in order

No page, route or obligation changes: both pages are already reachable in either order once the rows are unlocked.

## Evidence

- Frontend: `src/server/app/sets/live-animals/journeys/linear/features/hub/controller.js:38-41`
- Design release 1 prototype: `app/routes.js:5770-5788`

Captured screens: `fe-hub`, `fe-hub-part-answered`, `dr1-notification-hub-partly-complete`, `dr1-notification-hub`.

## Scope

Increment **inc-038**, ticket **EUDPA-602**, from the DR1 parity backlog.

Single repo — frontend only. The tests repo was branched for this increment but needed no changes, so it has no PR.

Related: inc-033 adds the missing commodity-details row to the same section. The two together leave the section in Design release 1's full order; this one lands independently of that and of the wider hub renaming in inc-037.
