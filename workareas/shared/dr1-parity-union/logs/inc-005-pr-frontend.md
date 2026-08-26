## What this changes

The five address pickers — place of origin, consignor or exporter, consignee, importer and place of destination — caption themselves **"Consignment addresses"**. DR1 calls that section **"Consignment parties"**: the section is named after the people involved in the consignment rather than after their addresses, which is why the CPH page sits inside it.

This renames the caption string, in both locales:

- `src/server/app/sets/live-animals/journeys/linear/features/addresses/copy/copy.en.js` — `picker.caption` becomes `Consignment parties`
- `src/server/app/sets/live-animals/journeys/linear/features/addresses/copy/copy.cy.js` — the Welsh pair becomes `Partïon y llwyth`

The string is set once and rendered by `party-picker/party-picker.njk`, so one edit reaches all five pickers.

The hub's own `h1` is untouched. DR1 heads the addresses hub "Consignment addresses" too — only the caption above the heading changes.

## Tests

- `copy.test.js` — a table-driven test per locale asserting `picker.caption` equals the section name its hub carries (`sections.consignmentParties` from the `flow/section-captions` copy landed by inc-004), so the picker caption and the hub caption can no longer drift apart. A picker has no page id for `sectionCaptionOf` to resolve, which is why it holds its own copy of the section name; the test is what keeps that copy honest. Plus a test pinning the hub heading at "Consignment addresses".
- `fit/hub-picker.fit.spec.js` — the per-role picker test now asserts the caption's **placement**, not just its presence: `span.govuk-caption-l + h1.govuk-heading-l` must be the role heading, and the caption must read `copy.picker.caption`.

## Provenance

- Increment: `inc-005` (corpus `dr1`, slice `service-wide`, source `service-wide--picker-caption-wording.json`)
- Ticket: EUDPA-339
- Repo: frontend only — no sibling PR, so no cross-repo merge ordering applies.
- Travels with `inc-004` (merged as `797647cb`, PR #209), which added the section-caption slot and captions to the other 28 pages. This one corrects the wording on the five pages that already had a caption, and reuses the `sections.consignmentParties` string inc-004 introduced.

**Falsified by:** finding "Consignment addresses" used as a caption anywhere in DR1's root views, or finding "Consignment parties" already rendered above the `h1` on a frontend address picker. Neither holds — `app/views/consignment-address-select.html:41` carries "Consignment parties".
