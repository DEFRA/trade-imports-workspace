## What changed

The transporters page listed each saved transporter as a radio whose label was the
transporter's name and whose hint ran the address lines together with commas and
tacked the approval number on after an em dash. Name, address and approval number
were the only facts shown, nothing was aligned into columns, and nothing told the
user whether a transporter was approved.

Design release 1 lists the same transporters in a table with headed columns that
also carry the transporter's type and its approval status. This change makes the
frontend match it.

- New `rows.js` builds the table rows from the saved transporter records.
- The transporters controller and template render the table instead of the run-on
  radio hint; the selection radio moves into a leading column.
- The transporters service records carry a type (Commercial or Private) and an
  approval status alongside the existing id, name, approval number and address.
- The Status column renders as a GOV.UK tag — green for Approved, pink for New.
- English copy, copy tests, controller tests, service tests and the transport fit
  spec are updated to the new table.

Selecting a transporter and continuing is unchanged: the selected transporter still
reaches the journey state as before.

Design release 1's "View details" link is deliberately out of scope — where that
link goes is the address-book slice's question, so the columns land here and the
link waits until that is settled. The Type column only distinguishes anything once
the list carries both commercial and private transporters, which is inc-123.

## Scope

Frontend only. The tests repo was branched for this increment but needed no change,
so it has no PR — the fit spec covering the new table lives in the frontend repo.

## Source

- Increment: `inc-122` from the `shared/dr1-parity-union` backlog
- Ticket: EUDPA-562
- Screens: `fe-transporter-commercial` and `dr1-transporter`

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
