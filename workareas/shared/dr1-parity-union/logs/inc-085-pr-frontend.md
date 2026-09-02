## EUDPA-374 — inc-085

Parity increment `inc-085` (DR1 union backlog, slice `commodities`). Frontend only — no sibling repo, nothing to sequence.

### The problem

Opening the **Help with commodity codes** details on the commodity search page revealed a single sentence — "Commodity codes are used to classify goods for import and export." — and nothing else. It was passed to `govukDetails` as plain `text`, so it could not carry a link. A user who does not know their commodity code was told what one is and left with no way to find one.

### The change

The details now renders Design release 1's three paragraphs as HTML:

1. "Commodity codes are internationally recognised reference numbers."
2. "A commodity code describes a specific product when importing or exporting goods."
3. "You can look up commodity codes using the [Trade Tariff tool](https://www.gov.uk/trade-tariff) (opens in a new tab)."

The lookup link opens in a new tab (`target="_blank"`, `rel="noreferrer noopener"`) with the "(opens in a new tab)" suffix.

### Files

- `copy/copy.en.js`, `copy/copy.cy.js` — the single `help.text` string becomes `reference`, `describes`, `lookupPrefix`, `lookupLink` and `lookupHref`, so both locales carry the paragraphs and the link text.
- `search/search.njk` — builds the details body in a `{% set %}` block and passes it as `html` rather than `text`.
- `src/server/app/copy-parity.test.js` — allowlists `commodities:search.help.lookupHref` as a deliberately identical gov.uk URL across locales.
- `copy/copy.test.js` — asserts both locales point the lookup at the Trade Tariff URL.
- `fit/search.fit.spec.js` — opens the details and asserts the paragraphs, the link `href`, `target` and `rel`; the axe scan now opens the details first so the new content is scanned.

### Verification

Unit and fit suites for the commodities feature, copy-parity and the axe scan all run green locally before the push.
