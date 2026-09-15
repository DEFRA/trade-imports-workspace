## What broke

The frontend PR for EUDPA-600 (DEFRA/trade-imports-animals-frontend#345) regroups
and renames the hub's task-list sections to match Design release 1, and puts the
whole list under a new `Notification tasklist` heading. Because the list now has
a heading of its own, the section captions dropped from `h2` to `h3`.

`tests/e2e/features/hub-groups-and-cya-rows.spec.ts` still read the sections off
level-2 headings, so `getByRole('heading', { level: 2 })` resolved to
`Your commodities`, `Notification tasklist` and `Support links` and the first
assertion failed — on the first run and on retry #1 — in the frontend's E2E job
(workflow run 34961946676, shard 1/3).

## What changed

In `tests/e2e/features/hub-groups-and-cya-rows.spec.ts`, first test only:

- Assert the `Notification tasklist` level-2 heading on its own.
- Read the six section captions off `h3.govuk-heading-m`. The commodity-total
  labels are `h3`s as well, so the heading level alone no longer identifies a
  section caption; the caption class does.
- Expect the Design release 1 section names and order — `1. About the
  consignment`, `2. Description of the goods`, `3. Transport and arrival`,
  `4. Documents`, `5. Consignment parties`, `6. Contact address` — plus the
  unnumbered `Check and submit` section, which stays until the review becomes a
  button under the list (inc-036).
- Expect seven task lists rather than six, and move the per-group row
  assertions onto the new grouping: documents fourth, roles and addresses
  fifth, contact address sixth, check and submit seventh.

No assertion was weakened or removed — the section list is still pinned exactly,
with `toHaveText` rather than `toContainText`.

## Verification

- `npm run typecheck` — clean.
- `npm run lint` — clean.
- The equivalent frontend fitness spec
  (`src/server/app/sets/live-animals/journeys/linear/features/hub/hub.fit.spec.js`,
  the `@duplicated-in-frontend` twin) runs green against the frontend branch:
  18 passed, including "the task list is headed 'Notification tasklist' over the
  six numbered design sections in order, with the unnumbered review section last".

## Provenance

- Increment: `inc-037`
- Ticket: EUDPA-600
- Travels with: DEFRA/trade-imports-animals-frontend#345
