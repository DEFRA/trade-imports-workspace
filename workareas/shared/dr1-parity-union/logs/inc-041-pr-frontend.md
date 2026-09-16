## EUDPA-607 — inc-041 (DR1 parity, hub slice)

Design release 1 tags every hub task with one of two words: **Complete** in green
where the task is finished, **To do** in blue everywhere else. The frontend used
four — `Completed`, `In progress`, `Not yet started`, and `Optional` rendered as
plain grey text with no tag at all. This brings the hub's status vocabulary down
to DR1's two.

### What changed

- `src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.en.js`
  and `copy.cy.js` — the four status strings are replaced by two, `complete` and
  `toDo`.
- `src/server/app/sets/live-animals/journeys/linear/features/hub/controller.js` —
  `FULFILLED` maps to the green **Complete** tag; `OPTIONAL`, `IN_PROGRESS` and
  `NOT_STARTED` all map to the blue **To do** tag, which is also the fallback for
  an unrecognised status.
- Unit tests (`copy.test.js`) and the affected `.fit.spec.js` suites follow the
  new wording.

### What did not change

Only the words move. The tag classes are untouched — DR1's *To do* and *Complete*
carry the same `govuk-tag--blue` and `govuk-tag--green` the frontend already used
for its unstarted and finished states. The engine still tracks fulfilment,
progress and optionality, and those still drive what the review page asks for and
when the notification may be submitted; the hub simply stops showing the
distinction.

The blocked-row `Cannot start yet` presentation is a separate finding (inc-032)
and is untouched here.

### Cross-repo

This increment also touches **DEFRA/trade-imports-animals-tests** on the same
branch, where two E2E specs assert on a finished hub row and follow `Completed` →
`Complete`.

**Merge order: tests first, then this frontend PR.** CDP runs the tests repo's
suite against the deployed frontend, so a frontend merged ahead of its own spec
updates would be exercised by stale assertions and CDP would go red. Both PRs
must be green (and approved, where the gate is on) before either merges.

- Increment: `inc-041`
- Ticket: EUDPA-607
