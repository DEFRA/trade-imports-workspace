## What this changes

Aligns the permanent address block on the animal identification card with the signed-off
Design release 1. Two labels disagreed with the design and the phone field had no hint:

| Field | Was | Now |
|---|---|---|
| Postcode | `Postal or zip code` | `Postcode or Zip code` |
| Phone | `Telephone number` | `Phone number` |
| Phone hint | *(none)* | `For international numbers include the country code` |

The hint is the part that changes what a trader types rather than only what they read — it is
wired through `aria-describedby` so a screen reader announces it with the input.

## Files touched

- `copy.en.js` / `copy.cy.js` — the two labels plus the new phone hint string
- `address/fields.js` and `_identification-card.njk` — render the hint on the phone input
- `copy.test.js` and `identification.fit.spec.js` — cover the new labels and the hint

## Scope

Permanent address block only. The private transporter form keeps its own copy of the same two
labels in the transport feature copy; that is a separate increment (inc-116) and is not touched
here.

## Provenance

- Increment: `inc-009` (dr1-parity-union backlog, `identification` slice)
- Ticket: EUDPA-405
- Evidence: frontend `copy.en.js:96-107` against prototype
  `app/views/partials/permanent-address-new-address-fields.html:62-96`

Single-repo increment — the tests repo was branched for this increment but has no commits, so
there is no sibling PR and no cross-repo merge ordering to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QU1nK61XsgdY25ueTiqM45
