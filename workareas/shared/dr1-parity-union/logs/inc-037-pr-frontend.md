## What this changes

The hub task list divided a notification into different sections from Design release 1, and named five of its six section headings differently. This regroups and renames the hub's sections to match DR1.

- Keeps `1. About the consignment`.
- Renames `2. Commodity details` to `2. Description of the goods`.
- Renames `3. Movement` to `3. Transport and arrival`.
- Promotes documents to its own section, `4. Documents`.
- Splits the old `4. Addresses` into `5. Consignment parties` (roles and addresses) and `6. Contact address` (the consignment contact).
- Drops the `6. Check and submit` section, whose only row becomes a button.
- Adds the `Notification tasklist` heading above the sections.

## Where

- `src/server/app/journeys/linear/features/hub/controller.js` — the group list that drives the sections.
- `src/server/app/journeys/linear/features/hub/copy/copy.en.js` and `copy.cy.js` — the heading copy, English and Welsh.
- `src/server/app/journeys/linear/features/hub/template.njk` — renders the new list heading.
- `src/server/app/journeys/linear/features/hub/copy/copy.test.js` and `hub.fit.spec.js` — copy and fitness tests updated to match.

## Scope

Single repo. Nothing in the backend or the tests repo changed for this increment, so this is the only PR.

---

Increment: `inc-037`
Ticket: EUDPA-600
