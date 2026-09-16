## EUDPA-607 — inc-041 (DR1 parity, hub slice)

The live-animals hub now uses Design release 1's two-word status vocabulary:
**Complete** in green where a task is finished, **To do** in blue everywhere else.
It previously used four words — `Completed`, `In progress`, `Not yet started` and
an untagged grey `Optional`. This PR follows the reduced vocabulary in the E2E
suite: the two specs that assert on a finished hub row now expect `Complete`
rather than `Completed`.

### What changed

- `tests/e2e/features/reason-purpose-scope.spec.ts` — three assertions on the
  reason row.
- `tests/e2e/features/transit-means-scope.spec.ts` — one assertion on the
  transit-countries row, and the comment above it.

No other behaviour is asserted differently; only the status word moves.

### Cross-repo

The behaviour change itself lives in **DEFRA/trade-imports-animals-frontend** on
the same branch (PR
[#353](https://github.com/DEFRA/trade-imports-animals-frontend/pull/353)), which
reduces the hub copy and the controller's status mapping to the two DR1 states.

**Merge order: this tests PR first, then the frontend PR.** CDP runs this suite
against the deployed frontend, so merging the frontend ahead of its own spec
updates would exercise it with stale assertions and turn CDP red. Both PRs must
be green (and approved, where the gate is on) before either merges.

- Increment: `inc-041`
- Ticket: EUDPA-607
