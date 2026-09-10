## What this changes

Design release 1 spells a postcode field the same way on every form that asks a
trader to type an address. The private transporter form was the odd one out,
labelling its sixth field **"Postal or zip code"**.

This relabels that field **"Postcode or Zip code"** in the transport copy, and
moves the two validation messages that quote the label with it:

- `Enter a postcode or Zip code`
- `Postcode or Zip code must be 12 characters or less`

An error that names the field by a different word sends the trader looking for a
field that is not on the page.

## What this does not change

The field itself, its width, its position on the form and its 12-character
validation rule are all unchanged. The identical change to the animals' permanent
address block lives in the commodities copy and is raised separately — the two
share no code.

## Files

- `src/server/app/journeys/linear/features/transport/copy/copy.en.js` — the label and the two messages
- `src/server/app/journeys/linear/features/transport/copy/copy.test.js` — copy unit assertions for the label and both messages
- `src/server/app/journeys/linear/features/transport/fit/transporters.fit.spec.js` — private-form validation tables updated to the new wording

## Scope

Frontend only. The tests repo was branched for this increment but needed no
change, so it has no PR.

Increment: `inc-117`
Ticket: [EUDPA-568](https://eafleetreporting.atlassian.net/browse/EUDPA-568)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
