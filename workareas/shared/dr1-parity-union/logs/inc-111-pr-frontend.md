## What this changes

"Does the consignment contain any unweaned animals?" is currently rendered — and made mandatory — whenever any commodity line is a Cow **or a Horse**. Design release 1 asks that question only where a selected commodity carries unweaned options, and in DR1's catalogue that is cattle and pigs alone. Someone importing horses only is asked a question DR1 never asks, and cannot continue without answering it.

- Dropped `Horse` from `UNWEANED_ANIMAL_COMMODITIES` in the live-animals commodities stub (`src/server/app/sets/live-animals/services/commodities/stub.js`), so the question no longer appears for a horses-only consignment.
- Rewrote the stale prose in the commodities aggregates obligation (`src/server/app/sets/live-animals/obligations/sections/commodities/aggregates.js`). The old header comment and mandatory-reason recorded the V4 intent as equines, cattle, pigs, sheep and goats, contradicting DR1 on three of the five. Both now defer to the commodities service for which commodities qualify rather than naming a list of their own.
- The existing scope purge already clears the answer when the question falls out of scope, so no separate cleanup was needed.

Pig is on DR1's list but is not a commodity this frontend can express yet — it is not in `COMMODITY_OPTIONS` at all — so it joins the allowlist when the commodity catalogue is filled out, which is owned separately by the `commodities--catalogue-is-a-five-entry-stub` finding.

## Tests

- `whitelists.test.js` — allowlist coverage updated.
- `additional-details.fit.spec.js` — a horses-only consignment is not asked the unweaned question.
- `check-answers.test.js` and the linear characterisation oracles updated to match.

## Provenance

- Increment `inc-111`, corpus `dr1-parity-union`, slice `identification`.
- Ticket: EUDPA-509.
- Frontend-only increment. The tests repo was branched for this increment but needed no change, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
