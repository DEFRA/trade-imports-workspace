# EUDPA-338 — section caption above each page heading

Increment `inc-004` of the DR1 parity backlog (`workareas/shared/dr1-parity-union`), ticket **EUDPA-338**.
Single-repo increment: `trade-imports-animals-frontend` only. No sibling repo, so no cross-repo merge ordering applies.

## The parity finding

Design release 1 puts a short grey caption above the `h1` on 35 of its 40 captured screens, naming the section of the notification the page belongs to — for example "Consignment parties" above "Add the county parish holding number (CPH)" (`app/views/cph-number.html:31-34`).

The frontend gives 28 of its 33 captured pages no caption at all. The CPH page opens straight into its heading (`src/server/app/sets/live-animals/journeys/linear/features/cph-number/template.njk:11-23`). The only five that carry one are the address pickers, which render "Consignment addresses" from their own template.

A user part-way through a long notification cannot tell from the page which part of the notification they are in.

## What changed

**A caption is now journey data, not page copy.** The new `flow/section-captions/` module owns which section each page belongs to and what that section is called, so the caption is derived from where the page sits in the journey rather than hard-coded once per page:

- `flow/section-captions/index.js` — `captionSections`, one entry per section listing its pages, plus `sectionCaptionOf(pageId)`.
- `flow/section-captions/copy/copy.en.js` and `copy.cy.js` — the eight section names: Dashboard, About the consignment, Commodity details, Consignment parties, Movement, Transport and arrival, Add a new transporter, Documents.
- `shared/section-caption.njk` — the shared partial that renders the caption, exposed through `shared/kit.js`.

**Twenty-one page templates** now render the caption above their heading, each getting the string from the section map rather than choosing one for itself. Their controllers pass the page id through to the view model.

**Seven pages stay deliberately bare**, matching DR1: overview, check-your-answers, contact address, declaration and confirmation have DR1 counterparts that carry no caption; delete-notification and cancel-amend have no DR1 counterpart at all. The rule is documented in the `captionSections` doc comment so a future page is not captioned by accident.

This changes no question and no answer. It is a heading-pattern change only.

The five address pickers keep their existing "Consignment addresses" caption. That text names the wrong section and is corrected separately in `inc-005`, which travels with this increment.

## Tests

- `flow/section-captions/section-captions.test.js` — every journey page is either mapped to a section or explicitly listed as bare, so a new page cannot silently fall through.
- `flow/section-captions/copy/copy.test.js` — English and Welsh copy keys match.
- `shared/section-caption.test.js` — the partial's markup.
- `features/section-caption.test.js` — per-page view-model coverage of the 21 captioned pages and the bare ones.
- `features/section-caption.fit.spec.js` — the caption renders between the status strip and the `h1` in the real DOM.
- `copy-parity.test.js` and `journey-flow.test.js` extended for the new copy bundle and flow module.

## Docs

`docs/flow-and-gates.md`, `sets/live-animals/docs/add-a-page.md` and `sets/live-animals/docs/journey-flow-and-gates.md` now tell whoever adds a page how to put it in a caption section, or how to record that it is deliberately bare.

## Deferred — needs a design and accessibility decision

On five pages the `h1` is produced inside the form (`cph-number` renders the label as the heading; `import-reason`, `import-purpose`, `transporters` and `transporters-select` render the legend as the heading). This increment emits the caption immediately before `<form>` on those five, so it sits outside the fieldset and outside the form group. Two verified consequences:

1. On an error render, `govuk-form-group--error` indents the group by 15px and draws the red bar, so the heading shifts right while the caption stays flush at the content edge — the two visibly misalign.
2. Because the caption is outside the fieldset, a screen reader announcing the legend as focus enters the radio group reads the question with no section name, so the added context reaches sighted users only.

GOV.UK's own guidance is the opposite — `govuk-frontend`'s `_typography.mixin.scss` reads "Captions to be used inside headings". The fix is to build the legend/label `html` with the caption inside it and pass `isPageHeading: true`.

It is deferred rather than done here because it is not a like-for-like markup swap: moving the caption inside the heading changes the heading's accessible name (for example from "Reason for import" to "About the consignment Reason for import"), which breaks the `getByRole('heading', { name: copy.legend })` locators used across the existing fit specs and changes the DOM order this increment's falsification clause is measured against.

**Action:** decide with design and accessibility whether the caption goes inside the legend/label heading on those five pages (GDS-correct; needs the fit-spec locators reworked and the parity corpus re-captured) or stays a sibling before the form (current shape; needs the error-state misalignment accepted or a spacing rule added). Either way the placement assertion in `section-caption.fit.spec.js` for the legend-heading page must be updated to match.

## Falsified by

Finding a caption rendered above the `h1` on a frontend journey page other than the five address pickers — any element carrying caption text between the status strip and the `h1` in the 33 captured DOMs.
