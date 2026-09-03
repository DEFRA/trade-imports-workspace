## What this changes

Relabels the per-commodity package count on the consignment details page from
**"Number of packages (optional)"** to **"Number of packages (when required)"**, to match
Design release 1.

`(optional)` is the GOV.UK convention for a field the user may always skip, so the current
label tells the user the count never matters. Design release 1's wording says instead that
there are circumstances in which the count has to be given.

## The change

- **English copy** — `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js`: packages label.
- **Welsh copy** — the `copy.cy.js` beside it: `"Nifer y pecynnau (pan fo angen)"`.
- **Playwright specs** that select the field by its label: the shared live-animals journey
  helper (`fit/live-animals-journey.js`), the additional-details fit spec and the hub fit spec.
- **Test cover for the label** — added an accessible-name assertion on the packages input in
  the commodities consignment-details fit spec, and pulled the repeated `numberOfPackages-0`
  selector into a named constant.

## What it does not settle

Neither side validates the box for live animals today. Design release 1 has a package-count
validator, but it returns early for anything that is not a germinal product, and a
live-animals user cannot create a germinal line — so no user meets a package-count error on
either side. The wording is therefore the only place the user is told anything about when the
count matters. If "when required" turns out to mean a rule rather than a hint, that rule is
separate work and Design release 1 does not state it.

## Scope

- Increment: `inc-089`
- Ticket: [EUDPA-392](https://eaflood.atlassian.net/browse/EUDPA-392)
- Repos: frontend only. The increment branched the tests repo as well, but nothing changed
  there — the spec edits live in the frontend repo's own `fit/` suites — so there is no
  sibling PR and no merge ordering to observe.
