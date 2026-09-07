## What this changes

Increment **inc-069**, ticket **EUDPA-473** — *The frontend hub carries an "Exit details" task DR1 does not have.*

Design release 1's hub shows three tasks in "About the consignment" and no exit task. Destination country, port of exit and exit date are asked under the reason for import and count towards the **Main reason for import** row, so that row only reads *Completed* once the follow-up answers are in.

The production change that folds those questions into the import-reason row landed with **inc-067**, which moved them to conditional reveals and removed the pages and the conditional "Exit details" task row along with them. What was missing was cover holding that behaviour in place. This increment adds it to the hub copy tests:

- assert group 1 stays at three rows for a reason that opens both the port of exit and the exit date (temporary admission of horses) — the state the retired "Exit details" task used to appear in;
- assert the import-reason row's own status carries those questions — *In progress* while the exit date is still owed, *Completed* once it is answered — rather than a task of its own reporting them.

Shared status and row-title constants replace the literals the file repeated, so the new assertions read against the same names as the existing ones.

## Scope

Test-only. One file:

- `src/server/app/journeys/linear/features/hub/copy/copy.test.js`

No production source, no route, obligation or flow change — the behaviour under test already ships.

## Repos

Frontend only. The tests repo was branched for this increment but needed no change, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
