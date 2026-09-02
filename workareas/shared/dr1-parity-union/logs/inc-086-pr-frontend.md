## What and why

The inset under the "What are you importing?" heading on the commodity page read, in full:

> Each health certificate requires a separate notification.

A user reading only that could reasonably conclude that a consignment needing no health certificate needs no notification. Design release 1 closes that reading off with a second sentence stating the obligation explicitly.

## What changed

- `copy.en.js` — replaced the inset copy with Design release 1's two-sentence wording: "A separate notification is required for each health certificate. Consignments that do not require a health certificate must still be notified."
- `copy.cy.js` — the same replacement in Welsh.
- `copy.test.js` — added a copy test asserting both sentences are present in English and the obligation sentence in Welsh.

The whole string was replaced rather than appended to, because Design release 1 also inverts the first sentence's construction (notification first, certificate second) against the frontend's (certificate first).

## Scope

Frontend only. `trade-imports-animals-tests` was branched for this increment but needed no change, so it has no PR and there is no cross-repo merge ordering to observe here.

## Traceability

- Increment: `inc-086` (parity corpus `dr1c`, slice `commodities`)
- Ticket: EUDPA-375
- Evidence: `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js:6` against `app/views/what-are-you-importing.html:41-44`
