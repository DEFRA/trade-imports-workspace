## EUDPA-367 — origin page question labels at the medium size

Increment **inc-078** of the DR1 parity backlog.

**Finding:** the frontend set the origin page's three question labels smaller than Design release 1 does, and rendered the internal-reference one at body weight so it did not read as a question.

The origin page asks three questions under one `h1`, but gave them three different weights:

- the country of origin label was at the small size,
- the region-of-origin fieldset legend was at the small size,
- the internal reference label carried no size class at all, so it rendered in ordinary body text — the same size as its own hint — and read as a sentence rather than a question.

Design release 1 sets all three at 24px/700 (`app-eu-heading-m`, equivalent to the govuk medium size).

### Changes

All in the live-animals linear origin feature (`src/server/app/journeys/linear/features/origin`):

- **`template.njk`** — `govuk-label--s` → `govuk-label--m` on the country of origin autocomplete label; `govuk-fieldset__legend--s` → `govuk-fieldset__legend--m` on the region-of-origin radios legend; added `govuk-label--m` to the internal reference input label.
- **`origin.fit.spec.js`** — new test asserting all three labels carry the medium size class. The class is the whole of the behaviour here, so it is asserted directly rather than through a rendered role.

### Out of scope

The revealed region-of-origin code label is a separate difference on the same page and is picked up by **inc-079**, so it is not touched here.

### Repos

Frontend only. The increment branched the tests repo as well, but changed nothing in it, so no PR was raised there and there is no merge ordering to observe.
