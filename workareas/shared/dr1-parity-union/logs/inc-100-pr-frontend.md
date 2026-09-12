# EUDPA-579 — identifiers stop gating submission

Increment `inc-100`, ticket EUDPA-579, from the DR1 parity backlog.
Frontend-only: no sibling repo change, no backend or tests-repo PR.

## The problem

A trader could not submit a notification until every animal on every commodity
line carried an identifier record. The unit-record obligation demanded one
record per animal — `fulfilmentIndexCountEquals` against `numberOfAnimals` — that
group is the whole of the `animalIdentification` task row, and readiness gates
the submit. A consignment of two hundred salmon needed two hundred records
before the service would take the notification.

## The rule we are matching

Design release 1's own submit gate says: "Animal identifiers are optional unless
multiple species are selected, in which case at least one identifier is required
per species." So the per-animal count is replaced by a multi-species condition
rather than dropped outright. The per-record rule stays — a saved animal must
still carry at least one of the six identifiers.

## What changed

- `model/obligations/helpers/more-than-one.js` (new) — `moreThanOne`, a combinator
  that stands another gate down unless it admits more than one entry. It carries
  `combinator` metadata rather than `gateType`, because the reachability prover
  cannot synthesise a witness for "more than one passed".
- `model/obligations/helpers/index.js` — export it, documented as a combinator
  rather than a gate.
- `sets/live-animals/obligations/sections/commodities/identifiers.js` — drop
  `fulfilmentIndexCountEquals` from the unit-record `requires`, and carry the
  condition as `floorAppliesToParent: moreThanOne(allowListed(...))`, so the
  empty-collection floor bites only on a consignment with more than one
  identified commodity line.
- `bridge/status/completeness/invariants.js` — honour `floorAppliesToParent`: a
  parent outside the gate's decision satisfies the floor with no records. Absent
  the key, every parent is asked, as before.
- `docs/cardinality.md`, `model/obligations/README.md` — document the new key and
  the combinator.

## Tests

Invariants, helpers, state-queries, task-rows, status, hub copy, hub FIT,
coverage, fulfilments, commodities and the journey FIT all cover both sides: a
single-species consignment submitting with no identifiers, and a multi-species
one still being asked for one record per line.

## Notes

The number of animals a line declares is still shown as progress on the
identification page and on Check your answers; it no longer gates submission.

No backend change is needed — the animals backend's submit transition rejects on
status, never on content.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
