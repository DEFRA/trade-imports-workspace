## EUDPA-599 — the frontend locks all but one hub task behind the answers before it

Increment: **inc-032** (dr1 parity union)
Ticket: **EUDPA-599**

### The finding

On the live-animals hub the frontend rendered a task row as plain text — not a link — whenever the first page in that row failed its prerequisites, and labelled it "Cannot start yet". Design release 1 links every task row unconditionally and has no locked state: a user can start any task on the notification in whatever order suits them.

### What changed

- Removed the hub's per-row gate check, so every row renders as a link from the moment the notification exists.
- Retired the "Cannot start yet" status the hub used for a blocked row.
- Updated the hub controller, its copy test, the hub fit spec and the task-rows test to the new unconditional-link behaviour.
- Updated `flow-and-gates.md`, `journey-flow-and-gates.md` and the `add-a-section` recipe so the docs describe gates as they now behave.

### What did not change

Conditional rows that are entirely out of scope for the notification are still dropped from the list rather than shown. Page-level entry guards are untouched — this is about how the hub presents a row, not about what a page does when it is entered directly.

### Scope

Frontend only. The tests repo was branched for this increment but needed no changes, so it has no PR.
