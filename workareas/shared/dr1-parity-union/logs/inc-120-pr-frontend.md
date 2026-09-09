# EUDPA-538 — transport identification hint becomes a bulleted list

Increment: **inc-120** (dr1 parity corpus, `transport` slice)
Ticket: **EUDPA-538**

## The finding

The hint under "Transport identification" on the arrival details page was one
run-on sentence that separated its four alternatives with semicolons:

> To identify the means of transport, enter (one of the following): flight number; train number; road vehicle registration number; vessel name (for ferries, also the road vehicle registration number)

A reader had to parse the punctuation to see how many choices there were and
where the last one ended. Design release 1 sets the same content out as a
lead-in sentence followed by a bulleted list of four items.

## What changed

- `copy.en.js` / `copy.cy.js` — the transport identification hint is now a
  lead-in sentence plus a four-item list, in English and Welsh. The wording of
  the four items is unchanged.
- `port-of-entry.njk` — renders the hint as a lead-in paragraph followed by a
  `govuk-list govuk-list--bullet` list, instead of passing a bare string as the
  hint text.
- `arrival-transit.fit.spec.js` — asserts the list rendering.

## Scope

Frontend only. The tests repo was branched for this increment but needed no
changes, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
