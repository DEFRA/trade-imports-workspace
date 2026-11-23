# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-827
**All repos in scope:** trade-imports-animals-frontend, trade-imports-plants-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #138 | **Commit:** 9c67c82

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `ADDRESSES_A_PAGE = 8` | animals-frontend ✅, plants-frontend ✅ | ✅ `page-objects/shared/address-picker-results.ts` | CONSISTENT (separate repo, own copy expected) |
| "Selected address: <name>" inset asserted | animals fit ✅, plants fit ✅ | ✅ `expectChosenAddressNamedAboveResults`, used in animals and plants specs | CONSISTENT |
| Paging e2e (search term and chosen address kept on page 2) | animals ✅ new test in `tests/animals/.../addresses-picker.spec.ts` | plants ❌ no paging e2e in `tests/plants/` | INCONSISTENT |
| Coverage links in workspace point at this repo's test titles | workspace coverage renames the animals e2e title in 4 places | ❌ title not renamed here | INCONSISTENT |

## Missing Changes

1. **Animals e2e title not renamed, so four workspace coverage links point at a test that does not exist.** `openspec/coverage/live-animals/addresses/coverage.json` (3 rows) and `openspec/coverage/live-animals/journey-pages/consignment-addresses/coverage.json` (1 row) now cite "the picker searches within the role, and the row ticked is the one that saves, named above the results on reopening and checked once its page is shown". This repo at 9c67c82 still has, at `tests/animals/e2e/features/address-book/addresses-picker.spec.ts:52`, "the picker searches within the role, lists every match on one page, and the row ticked is the one that saves, shown checked on reopening with nothing between the search box and the results heading". The body now asserts `PAGED_LIST_COUNT` and `expectChosenAddressNamedAboveResults`, so the old title is also untrue. Must: the title states what the test proves and matches the coverage link. One way: rename the test to the title the coverage already uses.
2. **No plants paging e2e.** The ticket's first two acceptance criteria say "in either journey"; the workspace marks SCN-PLANTS-ADDR-002-H partial because "the plants journey has no browser walk that pages a searched list". Must: the plants pickers' paging, search-carry and chosen-address-carry are proven end to end, or the gap is a conscious, recorded decision. One way: add a plants test beside the animals one (seed nine place-of-destination records behind one token, search, page 2, assert the box value, the count `Showing 1 out of 9 results` and the inset), then lift the coverage row to full.

## Unique Changes

- `PAGED_LIST_COUNT` (`/^Showing \d+ out of \d+ results$/`) replaces `WHOLE_LIST_COUNT` in the specs, since the shared org book grows across tests. Intentional.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `page-objects/shared/address-picker-results.ts:15` | `WHOLE_LIST_COUNT` is now exported but used nowhere in `tests/`, `flows/` or `page-objects/`. | Build only what is reachable. | Delete it. |
| `page-objects/shared/address-picker-results.ts:98` | `expectNothingBetweenSearchAndResults` is now used nowhere (every caller moved to `expectChosenAddressNamedAboveResults`). | Same. | Delete it; inline `textBetweenSearchAndResults` into the one remaining caller if it is then used once. |
| `tests/animals/e2e/features/address-book/addresses-picker.spec.ts` (new test, `Selected address: ${chosenName}` twice) vs `address-picker-results.ts` (`` `Selected address: ${name}` ``) | The inset wording is retyped in the spec beside a helper that already owns it. | Import a value that has a home. | Export a `selectedAddressText(name)` from `address-picker-results.ts` and use it in both places, or assert through `expectChosenAddressNamedAboveResults`. |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `tests/animals/e2e/features/address-book/addresses-picker.spec.ts:52` | "…lists every match on one page, … shown checked on reopening with nothing between the search box and the results heading" | Asserts a paged count and the chosen address named between the search box and the results. | Title states what it proves. | See Missing Changes 1. |
| `tests/plants/e2e/features/contact.spec.ts:21` | "searches the address book, lists every match on one page, and persists a row ticked, shown checked on reopening" | The contact picker pages at eight; this test searches to fewer than eight, so "on one page" is no longer a rule it proves. | Title states what it proves. | Drop "lists every match on one page" (e.g. "searches the address book, counts every match, and persists a row ticked…"), and update the two coverage rows in `openspec/coverage/plants/journey-pages/consignment-contact-select/coverage.json` that cite it. |

Searched (`tests/`, `page-objects/`, `flows/`): `on one page`, `one page`, `no pagination`, `nothing between`, `WHOLE_LIST_COUNT`, `expectNothingBetweenSearchAndResults`, and the new coverage title. Other "one page" hits are the dashboard and INS address book, unrelated.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 6 inconsistencies found
**Summary:** The animals e2e title was not renamed to the one the workspace coverage now cites (four broken links), plants has no paging e2e, two old helpers are left unused, and the plants contact test title still says "on one page".
