## EUDPA-608 — the way back to the exit questions for temporary admission of horses

Increment `inc-042` of the DR1 parity backlog.

### The problem

A trader importing horses under temporary admission must give a port of exit and an exit date. Both are compulsory under that reason. Once they have answered them and moved on, the hub is their only way back to change an answer — and the parity finding recorded the hub offering no way back: the old "Exit details" row rendered as plain text with "Cannot start yet" beside it, because the row's gate was decided by the first of its three pages alone, and that first page (destination country) is out of scope under this reason.

Design release 1 does not have an exit-details task at all. It asks port of exit and exit date under "Main reason for import", so that row carries the return route and is always a link.

### What this changes

Test-only. It adds regression cover to the hub copy tests for the temporary-admission case, so the return route cannot quietly disappear again:

- `src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.test.js` — a new `#hubHandler — the way back to the exit questions` block asserting that the "Main reason for import" row links to the import-reason page while the exit date is still owing, that it still links once both exit questions are answered, and that no row on that hub renders without a way in.

The third assertion is the general one: it walks every row the hub renders under this reason and fails if any of them lacks a href, which is the shape the original defect took.

### Scope

One repo. Nothing in the tests repo changed for this increment, so no sibling PR — the branch exists there but carries no commits.
