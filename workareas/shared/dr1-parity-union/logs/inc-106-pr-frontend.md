## What this changes

DR1 asks for each commodity's identifiers in the order that commodity's own list gives. The frontend used one fixed order for every animal, because the order was a property of the service rather than of the commodity: the identification copy block declared passport, tattoo, ear tag and horse name in that sequence, and the card rendered whichever of them were in scope without resorting. So a cow was asked for its passport before its ear tag.

This moves the order onto the commodity:

- The commodity catalogue now carries an ordered identifier list per commodity (`COMMODITY_IDENTIFIERS`), read through a new `commodities.identifiersFor`.
- The animal identification card and the check-answers identifier columns render the boxes in that order.
- The copy block goes back to being a lookup of labels and hints, with no ordering role.

Applicability still decides whether a listed identifier renders, so the obligation model remains the one authority on what is in scope.

Cattle now reads **Ear tag** then **Passport**, and a horse reads **Microchip, Passport, Horse name**, matching DR1.

## Why now

The order has to be settled before the microchip field is added (inc-101): a single global order has nowhere to put a field that DR1 asks for first on some commodities and not at all on others.

## Files touched

- `src/server/app/sets/live-animals/services/commodities/` — `COMMODITY_IDENTIFIERS`, `identifiersFor`, stub data and tests
- `.../commodities/animal-identification/identifier/fields.js` — render in commodity order
- `.../commodities/animal-identification/animal-identification.controller.js` — pass the commodity through
- `.../check-answers/cards/consignment/species/identifier-columns.js`, `identifier-table.js`, `species-cards.js` — same order on check answers

## Verification

Unit and fit specs updated and passing (`identification.fit.spec.js`, `copy.test.js`, `commodities/index.test.js`, `animal-identification.controller.test.js`, `check-answers.test.js`).

## Increment

- Increment: `inc-106`
- Ticket: EUDPA-497
- Repos: frontend only. The tests repo was branched for this increment but needed no change, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
