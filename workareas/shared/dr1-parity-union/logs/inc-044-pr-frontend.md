## What this changes

Increment **inc-044**, ticket **EUDPA-493** (dr1 parity corpus, `hub` slice).

A new notification used to run through seven questions and then drop the user on the
hub. `RUN_STEPS` ended at the additional animal details page, so "Save and continue"
there returned the hub path, and the four sections still to answer — transport,
documents, addresses and the consignment contact — were each started from a task row
and each ended back on the task list.

Design release 1 has one sequence and runs it end to end: origin through to the review
and declaration, with the hub as somewhere a user chooses to go rather than somewhere
the journey puts them.

This change carries the run on past the additional animal details in Design release 1's
order:

- port of entry, transit countries, transporters (both branch pages), documents,
  addresses, CPH number, consignment contact, then the review page.
- The review step uses its own target that opens the review page only once every task
  row is ready, and otherwise falls through to the hub — so an incomplete notification
  still lands on the task list rather than on a review it cannot show.
- Every other step keeps its existing gate, so a step that does not apply is skipped
  exactly as before.
- The hub stays reachable throughout via the secondary "Save and return to overview"
  button, which was already on every page. Nothing new was added to get back to it.

## Files

- `src/server/app/sets/live-animals/journeys/linear/flow/run.js` — the extended run and
  the review target.
- `src/server/app/sets/live-animals/journeys/linear/flow/run.test.js`,
  `.../flow/opening-run.test.js` — unit cover for the new tail and the review
  fall-through.
- `fit/live-animals-journey.js`, `fit/journey-smoke.fit.spec.js`,
  `src/server/app/sets/live-animals/features/cph-number/cph-number.fit.spec.js` — the
  FIT journey helper and specs follow the sequence through to the review page instead of
  re-entering from the hub.
- `src/server/app/sets/live-animals/docs/*` — journey-flow, add-a-page and add-a-section
  docs updated to match.

## Scope

Frontend only. The tests repo was branched for this increment but needed no changes, so
there is no sibling PR to sequence against.

Not the same change as unlocking the hub's rows (inc-032): that decides what a user can
start from the task list, this decides whether they are sent to the task list at all.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
