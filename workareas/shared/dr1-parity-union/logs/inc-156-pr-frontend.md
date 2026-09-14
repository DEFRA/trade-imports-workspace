## EUDPA-592 — remove the repeated declaration date from the confirmation page

Increment `inc-156` of the DR1 parity union backlog.

### The finding

The live-animals confirmation page repeats the declaration date immediately under the confirmation panel. Design release 1 shows that date only on the declaration page and never again, so the line is surplus on this screen.

### What changed

All under `src/server/app/journeys/linear/features/confirmation/`:

- `template.njk` — drop the "Date of declaration" paragraph under the panel, so the page runs straight from the reference panel into what the user has to do next.
- `copy/copy.en.js`, `copy/copy.cy.js` — drop the `dateOfDeclaration` label in both languages.
- `controller.js` — stop deriving and passing the formatted declaration date to the view.
- `controller.test.js`, `template.test.js`, `confirmation.fit.spec.js` — assert the line is absent and drop the assertions that required it.

No route, model or backend change; this is a view-and-copy removal plus its tests.

### Scope

Frontend only. The tests repo was branched for this increment but needed no change, so there is no sibling PR and no merge ordering to observe.

Ticket: EUDPA-592
