# EUDPA-366 — show the draft status and notification reference from the first page

Increment `inc-008` of the DR1 parity union backlog. Ticket: EUDPA-366.

## What the parity finding said

The status strip — a blue **Draft** tag plus the notification reference — sits above the
page heading on 29 of the 33 captured frontend screens. Origin of the import was the one
journey page without it: on a brand-new notification the page showed the heading with
nothing above it, so a user starting a notification could not see its reference until they
had saved the first page.

DR1 shows the strip on its origin page unconditionally, exactly as on every later page.

## What changed

- `src/server/app/sets/live-animals/journeys/linear/features/origin/controller.js`
  — dropped the committed-answers guard, so the journey is passed to `kit.base` directly
  rather than through `journeyIfStarted`. The Draft tag and the reference are now drawn
  from the first request.
  `backLinkFor` deliberately stays on the committed-answers test, so a fresh
  notification's back link still goes to the dashboard rather than the hub.
- `src/server/app/sets/live-animals/journeys/linear/features/journey-strip.test.js`
  — unit tests updated to assert the strip renders on a fresh origin page, including the
  real-mode fresh-draft case, which also pins the dashboard back link.
- `src/server/app/sets/live-animals/journeys/linear/features/origin/origin.fit.spec.js`
  — new fit spec proving the strip shows the draft status and the reference before any
  answer is saved.

Nothing else needed to move: the tag and reference already come from
`src/server/app/shared/kit.js`, which needs only the journey, and the reference exists
before the page is first drawn — starting a notification creates the record on the backend
and the user arrives on the origin page redirected under that reference.

## Scope

Frontend only. The tests repo was branched for this increment but has no changes, so it
carries no PR.
