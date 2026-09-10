## What broke

The frontend PR for this increment
([animals-frontend#306](https://github.com/DEFRA/trade-imports-animals-frontend/pull/306))
reverses the transporter task: the section now opens on one list of every
transporter the trader can use — commercial and private together — and asks
"What type of transporter will move the animals?" only behind an "Add a
transporter" button, as the first step of adding a record that is not listed.

The E2E suite still answered the type question as the first transporter step,
so every journey that walks through transport stalled on a page that no longer
asks that question. All three E2E shards went red — 24 failures on shard 1
alone, including every declaration submit, because the transporter answer never
landed and the notification was never complete enough to submit.

## What changed

Followed the frontend through, nothing weakened or skipped:

- `TransporterPage` is now the list — heading "Transporter details", a radio per
  record, and an `addTransporter` button (the govuk button macro renders its
  href as `role=button`).
- `TransporterAddPage` is new: the type question, at `transporters/add`.
- `PrivateTransporterPage` moves to `transporters/add/private`.
- `Journey.toTransporterSelection` reaches the commercial register through the
  add route; `answerTransport` and `reachTransporterFromHub` pick a row off the
  list instead of answering a type.
- The seeded-journey fixture posts one transporter pick rather than a type and
  then a register choice, so the seeded and browser journeys still agree — this
  is what the shard-3 contract assertion on
  `transport.transporter.approvalNumber` was failing on.
- `tests/e2e/pages/transporter.spec.ts` now covers the list (both kinds of
  transporter on it, nothing checked on load, a pick saves and returns to the
  overview); `tests/e2e/pages/transporter-add.spec.ts` covers the type question
  where it now lives.
- The a11y and security specs walk the same new route.

`npm run typecheck`, `npm run lint` and `npm run format:check` are all clean.

## Where it belongs

Increment inc-123 of the DR1 parity backlog, ticket EUDPA-551. Merges with
[animals-frontend#306](https://github.com/DEFRA/trade-imports-animals-frontend/pull/306);
same branch name in both repos so the workspace stack picks up the
branch-tagged tests image.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
