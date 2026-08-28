## What this changes

Increment **inc-079** of the Design release 1 parity backlog, ticket **EUDPA-355**.

> Design release 1 fills in the country's code as a fixed prefix and asks only for the rest of the region of origin code; Frontend makes the user type the whole code inside five characters.

On the origin page, answering **Yes** to "Is the region of origin known?" used to reveal one plain five-character box labelled "Region of origin code", hinted "For example, FR-75". The user typed the whole code — country part included — and the five-character cap applied to the whole string. For a consignment from France that leaves two characters once `FR-` is typed, so any region code longer than two characters could not be entered at all (`IE-DUB` needs six).

This PR splits the field the way Design release 1 does:

- The **two-letter country prefix is derived** from the country the user has already chosen and rendered as a `govuk-input` prefix beside the code box, so the user cannot get the prefix wrong.
- The user types **only the part after the prefix**, and the five-character cap now applies to that part (`regionOfOriginCodeSuffix`) rather than to the whole code — which is what makes the longer regional codes enterable.
- The field is relabelled **"Enter the region of origin code"** and the worked example replaced with the hint **"Enter up to 5 characters."**.
- **What is stored is still the joined value**, so nothing downstream has to learn about two fields: the suffix is upper-cased and joined to the prefix with a hyphen, matching Design release 1 (`app/routes.js:9239`, `:9246-9251`). Typing `75` with France chosen records `FR-75`; Frontend previously only trimmed the box.

## Files

| File | Change |
|---|---|
| `origin/controller.js` | prefix derivation, suffix collection, uppercase-and-join normalisation, cap moved to `regionOfOriginCodeSuffix` |
| `origin/template.njk` | `govuk-input` prefix beside the code box |
| `origin/copy/copy.en.js`, `copy.cy.js` | new label, hint and error copy |
| `origin/controller.test.js` | unit cover for prefix derivation, suffix cap and the join |
| `origin/origin.fit.spec.js`, `check-answers/check-answers.fit.spec.js` | functional cover for the split field and the stored joined value |
| `src/server/app/contract.test.js`, `fit/live-animals-journey.js` | control name updated to the split field |

## Reference data

No new reference data. Frontend already holds the two-letter code as the value of every country option (`origin/controller.js:57-61`), and the prefix is derived from that value — the route that does **not** ride on the Design release 1 country-label-keyed prefix table, and so does not depend on the country-list increment.

## Scope

Frontend repo only — no backend or tests-repo changes, so no cross-repo merge ordering applies.

## Known follow-up (deferred, recorded on the increment)

The prefix is rendered **server-side only**. On a first visit, before the page is submitted, the chosen country is not yet in the stored answers, so no prefix is shown and the user sees a bare box; the correct prefix appears on the error re-render and the stored value is always right. Design release 1 writes the prefix from client-side JS the moment a country is chosen. Making that live needs a new progressive-enhancement component under `src/client/javascripts/components/`, a decision on what the prefix box shows before a country is picked (`govukInput` cannot render an empty prefix), and a decision on the no-JS behaviour — and it is tied to inc-077, which may replace the country control itself. Left for design to settle and to land with inc-077.

Ticket: EUDPA-355
