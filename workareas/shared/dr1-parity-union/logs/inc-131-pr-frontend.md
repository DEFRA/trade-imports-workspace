## What changed

The private transporter details form ran its nine questions as one unbroken run — name, address line 1, address line 2, town or city, county, postal or zip code, country, telephone number, email address — with nothing to mark where the address stopped and the contact details started, and it asked for the telephone number before the email address.

This increment:

- breaks the form after the country field with a second-level heading reading **"Enter contact details"**;
- swaps the two fields under that heading so the **email address comes before the phone number**;
- reorders the controller's error reporting to match, so the error summary follows the new order of the fields on the page.

The fields themselves and their validation are unchanged.

Design release 1 splits its commercial transporter form the same way, so this is how it presents a transporter's contact details generally.

Two labels on this form also differ from Design release 1 — the phone one and the postcode one. Both are raised separately and are out of scope here.

## Files

- `.../transport/copy/copy.en.js`, `copy.cy.js`, `copy.test.js` — the new heading copy, both languages, with a test.
- `.../transport/private-transporter-details/private-transporter-details.njk` — the heading and the field order.
- `.../private-transporter-details.controller.js` and its test — error order follows the field order.
- `.../transport/fit/transporters.fit.spec.js` — a fit test covering the heading and the new order.

## Increment

- Increment: `inc-131`
- Ticket: [EUDPA-566](https://eaflood.atlassian.net/browse/EUDPA-566)
- Repos: frontend only. The tests repo was branched for this increment but needed no change, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
