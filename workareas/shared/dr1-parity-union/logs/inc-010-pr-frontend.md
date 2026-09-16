## EUDPA-611 — the notification overview loses its back link

Parity increment **inc-010** (corpus `dr1`, band `frontend-work`, type `flow-change`), ticket **EUDPA-611**.

### What changed

The notification overview — the task list for a notification — was rendering a `Back` link pointing at the dashboard. The overview is the top of a notification rather than a step within it, so it has no back link in Design release 1, and the way out of it is the Dashboard item in the service navigation bar, which is on every page.

- `src/server/app/sets/live-animals/journeys/linear/features/hub/controller.js` — the hub controller no longer sets `backLink`.
- `.../features/hub/copy/copy.test.js` — copy test asserts the page renders no back link.
- `.../features/hub/hub.fit.spec.js` — fitness spec asserts the page renders no back link.

### Why

DR1's `app/views/notification-hub.html:9-16` renders the phase banner in `beforeContent` and nothing else, where every DR1 journey page adds a back link after it. Of DR1's 40 captured screens the six with no back link are the four dashboard states, the overview and the confirmation — every page that is a starting point rather than a step. The frontend matched on all of those except the overview, which was the sole page where the two sides disagreed.

The overview sets `breadcrumbs: false`, so the back link was its only route out; this increment is sequenced after the navigation work (inc-007) that puts a Dashboard item in the service navigation bar, so the page is not left stranded.

### Scope

Single-repo increment — frontend only. The tests repo was branched for this increment but needed no changes, so it has no PR.
