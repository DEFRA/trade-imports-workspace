## What changed

The frontend now renders saved animals as a `govukTable` — a column per identifier the commodity
declares, and a row keyed by species and number — instead of a `govuk-summary-list`. The five
`.govuk-summary-list__row` locators in the identifier specs therefore resolved to nothing.

- `page-objects/notification/animal-identification-page.ts` gains `savedAnimalRow` and
  `identifierColumn`.
- `tests/e2e/features/animal-identifiers-cap.spec.ts` and
  `tests/e2e/features/animal-identifiers-conditional.spec.ts` now assert the column headings and
  the individual cells, mirroring the frontend fit spec.

No change to what is being verified — the same saved-animal states, read from the new markup.

## Merge order

This is a cross-repo increment. The sibling PR is in **DEFRA/trade-imports-animals-frontend** on
the same branch, and holds the template and view-model change these specs target.

**Merge this PR first, then the frontend one.** CDP runs this suite against the deployed frontend,
so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would
go red. Both PRs must be green (and approved, where the gate is on) before either merges.

---

Increment: `inc-104`
Ticket: [EUDPA-396](https://eafld.atlassian.net/browse/EUDPA-396)
