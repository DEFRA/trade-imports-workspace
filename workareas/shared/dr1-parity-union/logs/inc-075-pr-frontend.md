## EUDPA-491 — exit-question error wording (inc-075)

Design release 1 writes the exit-question error messages with the indefinite article, and does not repeat the field name in the unreadable-date message. The frontend wrote "the" in two of them and named the field again in the third. This brings all three into line, in English and Welsh.

### What changed

Three error strings in the import-reason copy files:

| key | before | after |
|---|---|---|
| `countryRequired` | Select **the** destination country | Select **a** destination country |
| `portRequired` | Select **the** port of exit | Select **a** port of exit |
| `dateInvalid` | Enter a real **exit** date | Enter a real date |

Welsh carries the same sense by dropping the definite article rather than adding one:

- `Dewiswch y wlad gyrchfan` → `Dewiswch wlad gyrchfan`
- `Dewiswch y porthladd ymadael` → `Dewiswch borthladd ymadael`
- `Rhowch ddyddiad ymadael go iawn` → `Rhowch ddyddiad go iawn`

### Why

The indefinite article is the GDS wording for a choice the user has yet to make; the definite article implied the service already knew which one was meant. The unreadable-date message repeated a field name that is already the legend and the label directly above it.

Both sides are symmetrical about enforcement here — each requires both selects at the point of submit — so only the wording differed.

### Tests

Two copy tests added, locking the new strings on both the English and Welsh sides.

### Files

- `src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.en.js`
- `src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.cy.js`
- `src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.test.js`

### Scope

Frontend only. The increment branched the tests repo as well, but nothing in the E2E suite needed changing, so there is no sibling PR and no merge ordering to observe.

Increment: `inc-075`
Ticket: EUDPA-491

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
