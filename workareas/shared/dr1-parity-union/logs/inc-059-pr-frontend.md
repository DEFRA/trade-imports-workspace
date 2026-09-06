## EUDPA-402 — permanent address guidance (increment inc-059)

Design release 1 puts three blocks above the permanent-address question. The frontend
carried one sentence: "A permanent address is required for this animal." It said the
address was needed, but not what a permanent address is, who checks it, or what happens
if a trader invents one.

### What changed

The identification card now renders, in this order:

- a `govukWarningText` carrying **"Providing a false address is an act of fraud"**
- a lead-in and two bullets defining a permanent address — where an animal
  "will permanently reside" and "can be checked by the Animal and Plant Health
  Agency (APHA)"
- the question as a heading, **"Where will their permanent address be?"**

Copy lands in `copy.en.js` with the matching Welsh sibling in `copy.cy.js`. No new data
and no new field — this is a copy and template change only.

### Files

- `src/server/app/sets/live-animals/journeys/linear/features/commodities/animal-identification/_identification-card.njk`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.cy.js`

### Tests

- `copy/copy.test.js` — asserts the new keys exist in both locales
- `fit/identification.fit.spec.js` — asserts the warning, the bullets and the question
  heading render on the card

### Scope

Frontend only. The tests repo was branched for this increment but needed no change, so
it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QU1nK61XsgdY25ueTiqM45
