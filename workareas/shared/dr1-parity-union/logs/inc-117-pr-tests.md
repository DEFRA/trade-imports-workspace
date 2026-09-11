Follows the private transporter postcode relabel in the E2E locators.

**Increment:** inc-117
**Ticket:** EUDPA-568

## What changed

The frontend relabels the private transporter's postcode field from "Postal or zip code" to "Postcode or Zip code", matching how Design release 1 spells that field on every form asking a trader to type an address. Two Playwright locators still select the field by the old label, so the suite would fail against the renamed page.

Both move to the new label:

- `page-objects/notification/private-transporter-page.ts` — the fill in the private transporter page object
- `tests/e2e/features/private-transporter-scope.spec.ts` — the inline fill in the private transporter scope spec

No test intent changes: the same field, filled from the same fixture value, selected by the label the page now shows.

## Sibling PR and merge order

This increment spans two repos. The frontend change lives in DEFRA/trade-imports-animals-frontend#316.

**Merge this tests PR first, then the frontend PR.** CDP runs this suite against the deployed frontend, so a frontend merged ahead of its own locator updates would be exercised by stale specs selecting a label the page no longer shows, and CDP would go red. Both PRs must be green before either merges — half an increment on `main` does not auto-revert.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
