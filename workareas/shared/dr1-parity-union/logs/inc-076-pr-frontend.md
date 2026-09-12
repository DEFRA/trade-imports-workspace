## What this changes

Check your answers never showed the exit answers — destination country, exit date and port of exit — so a trader could not see or change them from the review page. The reason-for-import card built only four rows (Certified for, Includes unweaned animals, Reason for import, Purpose in the market), and the check-answers copy had no key for any of the three.

Design release 1 lists each of them under the reason for import, chosen by the reason.

## How

- `view-model/cards/consignment/additional-animal-details.js` — adds a row per exit answer, each shown on the same condition that puts its question to the trader, and each with a Change link back to the page that collects it:
  - **Destination country** — for a transit, transhipment or onward-travel consignment
  - **Exit date** and **Port of exit** — for a temporary admission of horses
- `view-model/applicability.js` — a scope predicate per answer, so a row appears exactly when its question was asked.
- `copy/copy.en.js`, `copy/copy.cy.js` — the row labels.
- `check-answers.test.js`, `check-answers.fit.spec.js` — cover each row appearing, and staying away when its reason was not chosen.

No backend or contract change: the obligations in `src/server/app/sets/live-animals/obligations/sections/import-reason.js` already carry the conditions, so this is a view-model and copy change inside the check-answers feature.

## Out of scope

Design release 1 also shows an "Exit border control post" row for a transit. The frontend collects no such answer anywhere — that is a missing field on the reason-for-import page, not a missing row here, and is tracked separately.

## Repos

Frontend only. The tests repo was branched for this increment but needed no change, so it has no PR.

Increment: `inc-076`
Ticket: EUDPA-578

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
