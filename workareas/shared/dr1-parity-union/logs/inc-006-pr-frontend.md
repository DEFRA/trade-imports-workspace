## EUDPA-394 — increment inc-006

The save and cancel controls at the foot of every journey page sent the user back to "the hub". Design release 1 calls the same page the **overview**, and "hub" was only ever the internal name for the task list — it appeared nowhere else on screen.

### What changed

- `src/server/app/shared/copy.en.js` — `"Save and return to hub"` → `"Save and return to overview"`, `"Cancel and return to hub"` → `"Cancel and return to overview"`.
- `src/server/app/shared/copy.cy.js` — the Welsh pair translated to match (`"i'r trosolwg"`).
- `src/server/app/shared/save-actions.njk` — the macro comment restated, and it now records that "hub" is the internal name for the page headed "Overview".
- `src/server/app/shared/copy.test.js` — a regression test pinning both English labels, plus one holding the Welsh keys in step with the English.
- Specs and fit tests that locate these two controls by their visible text updated, along with the two `add-a-page` / `add-a-section` recipe docs that quote them.

The keys `saveAndReturnToHub` and `cancelAndReturnToHub` are unchanged — only the strings are user-visible. The three controls and their order do not move. The primary button's label is out of scope: each page passes its own rather than reading these shared keys.

### Sibling PR and merge order

This increment also touches **DEFRA/trade-imports-animals-tests**, where `tests/e2e/features/task-page-exits.spec.ts` locates both controls by their visible text.

Merge order: **tests first, then this frontend PR.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. Both PRs must be green (and approved, where the gate is on) before either merges.
