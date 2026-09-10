## What this changes

A user whose commercial transporter is not one of the two shipped fixture records had no way to record it. The commercial branch was select-only: a radio group over the fixture list, with a validator that rejected any other id, and no add route anywhere in `src/server`. Their only way through was to go back to the type question and declare the same firm as a private transporter — which lands the wrong transporter type on the notification, and no authorisation number.

This adds a **commercial transporter details** page, reached from the transporter list, matching Design release 1's add-commercial-transporter form:

- transporter authorisation number (asked first)
- name
- the six address fields
- country, locked to Northern Ireland
- email address and phone number

The Northern Ireland restriction is carried into the page itself and into the hint on the transporter type chooser.

The entered transporter is stored in the answer shape the frontend already uses for a *selected* commercial transporter — name, address and approval number — so **no contract outside the frontend changes**.

## Files

- new `commercial-transporter-details` page: controller, view, copy (en + cy), controller tests and a fit spec
- wired into the transport feature index, section captions and the page list
- `transporter-add` and `transporters-select` controllers route into the new page
- contract, opening-run, request-view parity and section-caption tests updated

## Scope

Frontend only. `trade-imports-animals-tests` was branched for this increment but needed no change, so it has no PR — nothing to order against, and no cross-repo merge sequencing applies here.

Increment: `inc-115`
Ticket: [EUDPA-560](https://eafleet.atlassian.net/browse/EUDPA-560)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
