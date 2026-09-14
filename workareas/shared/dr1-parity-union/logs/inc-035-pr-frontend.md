## What this changes

The hub listed **"Animal identification details"** from the moment a notification was
created — locked with *"Cannot start yet"*, before any commodity had been chosen and so
before it was known whether any animal needed an identifier at all. Design release 1
inserts that task only once a chosen commodity carries identifiers of its own, and leaves
it off the page until then.

Marking the row `conditional` alone does not achieve this. The row's part is the
`commodityLines` collection — a structural group that is in scope from creation — so its
status roll-up never reaches *Not applicable* and the row would still be drawn. The row
therefore carries its own applicability test: does any chosen commodity line select an
identified commodity, the same question the identification page already asks before
redirecting past itself. `rowStatus` returns *Not applicable* when that test answers no,
whatever the parts roll up to. `rowApplies` treats a row with no test as always
applicable, so every other row is unchanged.

## Files

- `src/server/app/sets/live-animals/journeys/linear/flow/task-rows.js` —
  `identifiesAnAnimal` applicability test, `conditional: true` and `applies` on the
  `animalIdentification` row, `rowApplies` gate in `rowStatus`.
- `src/server/app/sets/live-animals/journeys/linear/flow/task-rows.test.js`,
  `.../features/hub/hub.fit.spec.js`,
  `.../sections/commodities/fit/identification.fit.spec.js` — cover the row being absent
  with no commodities and present once a commodity needs identifiers.
- `src/server/app/sets/live-animals/docs/journey-flow-and-gates.md`,
  `.../docs/add-a-section.md` — document the per-row `applies` test alongside
  `conditional`.

## Increment

- Increment: `inc-035` (dr1 parity union), type `obligation-change`, domain `hub`.
- Ticket: **EUDPA-597**.
- Scope: this repo only. The increment branched `trade-imports-animals-tests` as well, but
  no change was needed there — that repo has no commits ahead of `main` and no PR.
