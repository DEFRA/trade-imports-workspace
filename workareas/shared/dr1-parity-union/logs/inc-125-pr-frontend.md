## What this changes

A private transporter typed into `/transporters/private` lived only on the notification it was entered on. Nothing else read it, the next notification started blank, and a haulier moving the same animals every week retyped the same nine fields every week. DR1 keeps the record on the user's own transporter list and offers it again alongside the eight the service ships.

This increment gives an added transporter somewhere to live other than the notification, and joins it to the transporter list.

- **`services/transporters/register.js` (new)** — the transporters an organisation has added for itself, keyed on a folded name so re-entering a transporter corrects the record rather than adding a second row. Process-local, and stated as such in the module: durable storage is backend work this is waiting on. The pages only ask for `partiesFor` and `rememberTransporter`, so nothing outside this module changes when that lands.
- **`services/transporters/index.js`** — `partiesFor(orgId)` joins the added records, newest first, to the ones the service ships. An added record replaces a shipped one of the same name rather than sitting beside it.
- **`private-transporter-details.controller.js`** — on save, also keep the transporter for the organisation, as private and not yet approved.
- **`transporter-details-save.js`** — an optional `remember` arm, run only after the notification has taken the answer, so a failed save never leaves a transporter on the list that no notification names.
- **`transporters.controller.js`** — the list, its validation options and the selected-row match now read the per-organisation list per request rather than a set fixed at module load. The match folds case and spacing so a corrected spelling still resolves for an earlier notification.
- **`records.js`** — the comment saying a typed-in transporter joins no list no longer holds; reworded to point at the register.

## Tests

`transporters.test.js`, `transporters.controller.test.js`, `private-transporter-details.controller.test.js` and `transporters.fit.spec.js` cover the join, the newest-first order, the name-collision replacement, the per-organisation scoping, the unauthenticated no-op, and the remember-after-commit ordering.

## Scope

Increment **inc-125**, ticket **EUDPA-572**, DR1 parity corpus (`transport` slice).

Frontend only. The backend and tests repos were branched for this increment but neither needed a change, so neither has a PR. Durable per-organisation storage is the backend follow-up this register is a placeholder for; the seam is `partiesFor` / `rememberTransporter`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
