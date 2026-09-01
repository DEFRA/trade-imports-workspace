## What this changes

Country of origin was a `govukSelect`: no way to type, one long alphabetical list to
scroll, and a disabled row of dashes acting as a divider rule under the placeholder.
Design release 1 lets the user type and offers matches as they go.

This swaps the select for the shared accessible-autocomplete component, which enhances
the same select into a type-ahead and degrades to that select when JavaScript is off — so
the fallback stays a real control rather than DR1's bare text input, which the service
cannot ship.

- The control keeps its `id`, `name` and label.
- It gains a "Start typing to search for a country." hint and a "No countries found"
  message, and shows all values on focus.
- Because the list is now searchable rather than scrolled, the divider rule under the
  placeholder is dropped from the country items in the origin controller.
- Welsh copy is updated alongside the English.
- The origin and journey feature-integration specs are updated to drive the autocomplete.

## Files

| File | Change |
|---|---|
| `.../features/origin/template.njk` | select → accessible autocomplete |
| `.../features/origin/controller.js` | divider row removed from the country items |
| `.../features/origin/copy/copy.en.js`, `copy.cy.js` | hint + no-results copy |
| `.../features/origin/origin.fit.spec.js` | autocomplete-driven coverage |
| `.../features/origin/controller.test.js` | country items without the divider |
| `fit/live-animals-journey.js`, `notification-actions.fit.spec.js` | journey helper drives the type-ahead |

## Provenance

Increment `inc-077` of the DR1 parity backlog. Ticket: **EUDPA-362**.

Frontend-only increment — the tests repo was branched for this increment but needed no
changes, so it has no PR. No merge ordering to observe.
