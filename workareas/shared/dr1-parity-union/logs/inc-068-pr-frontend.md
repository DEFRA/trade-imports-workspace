## What this changes

Increment **inc-068** of the DR1 parity union backlog (ticket **EUDPA-470**).

The three follow-up questions revealed under the import reason — destination country, port of exit and exit date — each carried a line of grey guidance that Design release 1 does not have. DR1 asks destination country and port of exit with a bare label, and gives the exit date a worked example and nothing else.

- Removed the destination-country hint and the port-of-exit hint from the import-reason copy (`copy.en.js` and `copy.cy.js`) and from the four select components in `template.njk` that rendered them.
- Cut the exit-date hint back to its worked example, `For example, 27/3/2026`, dropping the leading sentence of explanation. The example stays because DR1 shows it too.
- The port-of-exit sentence "Exit and entry share the same port list" also had to go on its own merits: it becomes untrue once the exit port list is narrowed to animal border control posts.

## Why the hints go now

Once the questions sit under the reason they answer (the reveal move, inc-067), the reason's own hint is the explanation. Repeating it under the field is the duplication DR1 avoids.

## Tests

- Copy tests assert the three hints are gone and that the exit-date worked example remains.
- The import-reason fit spec no longer expects hint elements on those controls.

## Scope

Frontend only. `trade-imports-animals-tests` was branched for this increment but needed no change, so it has no PR.

EUDPA-470

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
