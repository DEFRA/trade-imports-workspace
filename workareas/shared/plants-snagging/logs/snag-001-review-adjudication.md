# snag-001 review adjudication

## Scope reviewed

- `src/server/common/components/accessible-autocomplete/accessible-autocomplete.scss`
- `src/server/app/sets/high-risk-plants/journeys/linear/features/origin/origin.fit.spec.js`

## Independent review results

- Style reviewer: clean. The stylesheet uses GOV.UK mixins and tokens, and the FIT spec's component-internal selectors are justified by the computed-style and paint-order assertions.
- Code reviewer: clean, high confidence. The change preserves the upstream CSS, creates the required local stacking context, retains the 35px input padding and focus treatment, and mirrors the installed GOV.UK error border.
- Consistency reviewer: clean. The shared class-based rules cover origin, place of landing and genus, and the pre-change plants component is byte-identical to the animals component queued for the later port.

## Adversarial adjudication

No reviewer finding survived refutation because no reviewer raised a defect.

Two implementation-time plan corrections were retained and checked against correct browser output:

1. The dropdown arrow must participate in the paint stack beneath the transparent input; the input must remain the top interactive hit target. Requiring the arrow itself to be the top hit could never pass without breaking input interaction.
2. The installed GOV.UK Frontend version has no `$govuk-border-width-form-element-error` token. Its plain `.govuk-input--error` uses `$govuk-border-width-form-element`, so the enhanced input uses and tests that same token.

## Judgment

- Fix now: none.
- Defer: none.
- Reject: none.

The staged change is ready for the snag-001 verification ladder.

## Ladder repair

The first full-lint run found that the four new FIT cases had pushed the existing `origin feature` callback over the repository's 200-line function limit. The cases were moved unchanged into a focused `origin accessible-autocomplete styles` describe block. The second lint run passed; no assertion or production behaviour was weakened.
