## What changed

The commodity search page offered species as bare Latin binomials, so a trader who does not read Latin could not tell the tick boxes apart. Each species is now labelled with its common name first and the scientific name in brackets after it — for example `African buffalo (Syncerus spp.)`.

- adds `species-label.js`, the single place a species label is composed. When the catalogue holds no common name for a species it falls back to the parent commodity name, so a label is never empty and never shows a bare binomial by accident.
- uses it from the tick-box options (`commodity-groups`) and from the selected species summary, so both surfaces read the same way.
- carries `commonName` through the commodities stub catalogue.
- covers the new label in unit, controller and fit specs.

## Files

- `src/server/app/features/commodities/search/view-model/species-label.js` (new)
- `src/server/app/features/commodities/search/view-model/species-label.test.js` (new)
- `src/server/app/features/commodities/search/view-model/commodity-groups.js`
- `src/server/app/features/commodities/search/view-model/selected-summary.js`
- `src/server/app/features/commodities/fit/search.fit.spec.js`
- `src/server/app/features/commodities/search/search.controller.test.js`
- `src/server/app/sets/live-animals/services/commodities/stub.js`

## Provenance

- Increment: `inc-090` (DR1 parity union backlog)
- Ticket: EUDPA-376
- Scope: frontend only. The tests repo was branched for this increment but needed no change, so it has no PR.
