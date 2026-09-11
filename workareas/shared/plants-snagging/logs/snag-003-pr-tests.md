## What

The plants E2E coverage now drives the consignment contact page as a
searchable, five-row paged address-book picker.

- The page object targets each radio through its `Select {name}` accessible
  name and exposes the search, result count, pagination and selected-address
  surfaces.
- Contact coverage searches UUID-tagged records, pages to a later result,
  saves it and proves the copied contact remains selected on re-entry.
- Full-journey and review coverage searches for newly created addresses before
  selecting them, so the shared never-wiped address book cannot move them off
  the first page unexpectedly.
- Blank-save behaviour remains explicitly covered.

## Sibling PR

The picker implementation is in
[DEFRA/trade-imports-plants-frontend #66](https://github.com/DEFRA/trade-imports-plants-frontend/pull/66).
Merge the two PRs together.

## Verification

Typecheck, lint and formatting are green. The plants E2E project is green (64
tests), and the full cross-service E2E suite is green (257 passed, 1 skipped)
against the verified source-mounted development stack.

Snagging increment `snag-003` (`workareas/shared/plants-snagging`). No Jira
ticket by design.

Generated with OpenAI Codex.
