## What changed

Saved animals now read back as a `govukTable`, matching Design release 1, instead of a
`govuk-summary-list` whose value joined every filled identifier into one comma-separated
sentence.

- **Header row** naming every identifier the commodity declares — not just the ones the
  trader filled — so an empty cell shows which identifiers are still missing.
- **Row label** is the species and its number ("Bos taurus 1") rather than the positional
  "Animal 1", which previously headed the first row of every commodity line on the page.
- **One cell per identifier**, with the existing Remove action in the last cell.

### Files

- `identifier/summary.js` replaced by `identifier/table.js` — `identifierColumns` derives the
  columns from the line's scoped fields plus permanent address; `identifierCellText` reads one cell.
- New `_saved-animals-table.njk` macro, rendered by `_identification-card.njk`.
- `card/view-model.js` passes the columns and rows through.
- Copy gains a `table.*` group for the column headings and `animalRowNamed` for the row label;
  the now-unused `permanentAddressSummaryLabel` and `noIdentifier` are dropped.

No new data: the card view model already knew which identifiers apply to the line. This mirrors
the identifier table the check-answers page already renders
(`check-answers/view-model/cards/consignment/species/identifier-table.js`).

## Tests

`animal-identification.controller.test.js` and the `identification.fit.spec.js` fit spec are
updated to assert the column headings and individual cells.

## Merge order

This is a cross-repo increment. The sibling PR is in **DEFRA/trade-imports-animals-tests** on the
same branch, updating the E2E identifier specs whose `.govuk-summary-list__row` locators no longer
resolve.

**Merge the tests repo first, then this one.** CDP runs the tests repo's suite against the deployed
frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and
CDP would go red. Both PRs must be green (and approved, where the gate is on) before either merges.

---

Increment: `inc-104`
Ticket: [EUDPA-396](https://eafld.atlassian.net/browse/EUDPA-396)
