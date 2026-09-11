## What

The consignment contact page previously loaded the organisation's entire
address book into one flat radio list. It now uses the same searchable,
five-row paged picker surface as the destination and consignor pages.

- Search and pagination query the address-book service one page at a time.
- A newly ticked address survives GET pagination, and the selected-address
  inset represents a choice whose row is off-screen.
- The contact-specific copied answer shape and allowed blank save are
  unchanged.
- Invalid or deleted address-book records are still refused, with the inline
  error associated to the radio controls.
- The contact page remains deliberately bare, without a section caption.

## Sibling PR

The plants E2E page object and journeys are in
[DEFRA/trade-imports-animals-tests #203](https://github.com/DEFRA/trade-imports-animals-tests/pull/203).
Merge the two PRs together.

## Verification

The unit, format, lint and FIT ladder is green (227 FIT tests). The plants E2E
project is green (64 tests), and the full cross-service E2E suite is green
(257 passed, 1 skipped) against the verified source-mounted development stack.

Snagging increment `snag-003` (`workareas/shared/plants-snagging`). No Jira
ticket by design.

Generated with OpenAI Codex.
