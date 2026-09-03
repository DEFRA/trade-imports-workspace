## What this changes

Increment **inc-091** of the DR1 parity backlog — ticket **EUDPA-379**.

The **Selected commodities** table on the consignment-details page now lists each chosen
species of a commodity on commodity code **01061900** as its own row, named by the species
common name, with a **Remove** that takes out that species only and leaves the rest of the
commodity in place. Every other commodity keeps the commodity-level row and the
whole-commodity **Remove** it has today.

### Why

Design release 1 branches on commodity code 01061900 before anything else and renders one
row per chosen species there (`app/routes.js:626-645`, against `app/routes.js:672-682` for
every other commodity). The frontend collapsed the commodity lines to their distinct
commodity names, so a user who had chosen two species under one 01061900 commodity had no
way to drop one of them from this page. The store already held one line per species — only
the page collapsed them — so this is a change to the table and to what **Remove** submits,
not to the store.

## How

- new `view-model/selected-rows.js` builds the rows, branching on commodity code `01061900`
  to emit one row per species and otherwise one row per commodity
- `view-model/groups.js` and `lines.js` feed the new builder; the table partial and
  `consignment-details.njk` render per-species rows and their own remove control
- new `remove/actions.js` parses the submitted remove action; `remove/post-remove.js`
  removes a single species line for the per-species case and every line of the commodity
  otherwise
- `services/commodities/index.js` exposes the species common-name lookup the rows are
  named from

## Tests

- unit tests for `selected-rows` and for the commodities service
- controller tests covering the per-species rows and single-species removal
- fit coverage for the per-species rows and single-species removal

## Scope

Frontend only. The increment branched `trade-imports-animals-tests` under the same branch
name but changed nothing in it, so no PR is raised there and no merge ordering applies.

## Open question left for the service team

The stub still gives each 01061900 commodity a single species whose common name matches the
commodity name, so the multi-species case is seeded directly into the store in tests rather
than driven through the search page. Whether the stub should model a multi-species 01061900
commodity, and whether Cat/Dog should adopt Design release 1's "Domestic cat"/"Domestic
dog", is left to the service team — it is a fixture change with cross-file and cross-repo
blast radius (commodity search labels and counts here, species labels the tests repo
drives), and it becomes moot if the catalogue moves to the reference-data API.

## Banding note

The two parity runs banded this differently: run C as `frontend-work` (buildable today
against the current stub, which is the band carried here and the one this PR implements),
run A as `needs-backend` (holding the table behind a reference-data API). The ruling on
that band is recorded on the increment.
