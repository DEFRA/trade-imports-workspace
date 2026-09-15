## What this changes

Design release 1 keeps the notification hub compact. Nine of its ten task rows are a bare link with a status tag beside it, and only **Roles and addresses** carries a sentence underneath. The frontend hinted all eleven rows, roughly doubling the height of the page, and its roles-and-addresses hint named five parties where the design names four.

This increment brings the hub into line with the design:

- Removed the hint from the ten rows that should not have one, in both locale bundles (`copy.en.js`, `copy.cy.js`).
- Reworded the surviving roles-and-addresses hint to "Consignor or Exporter, Consignee, Importer and Place of Destination". This is a change of content, not only of phrasing — the place of origin is no longer named.
- The hub controller now omits the hint slot entirely for a row whose copy carries no hint, rather than building an empty one.
- Added copy unit tests pinning the single hinted row and its wording, and a fit spec asserting exactly one `govuk-task-list__hint` on the rendered hub.
- Updated the `add-a-section` guide so new task rows are documented as hintless.

## Evidence

- Frontend before: `src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.en.js:26-79` — eleven hints.
- Design release 1: `app/routes.js:5820-5826` — one hint, on the roles-and-addresses row.
- Falsifier: a count of hint elements in the captured DOM — one on the design side, eleven on the frontend side before this change.

## Scope

Frontend only. The tests repo was branched for this increment but needed no change, so it has no PR.

---

Increment `inc-039`, ticket EUDPA-605.
