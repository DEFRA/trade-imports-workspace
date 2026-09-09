## What this changes

Follows the frontend's split of the single CPH free-text field into three inputs —
**County**, **Parish** and **Holding number** — sized 2/3/4.

- The CPH page object now fills the three parts rather than one box.
- The journey flow, the seeded journey fixture, the a11y specs and the CPH e2e
  specs are updated to the new field names.

No behavioural change to what is asserted: the nine-digit value the backend
receives is unchanged, so this is a follow of the frontend's field names rather
than a new contract.

## Increment

Increment `inc-051` of the DR1 parity backlog. Ticket **EUDPA-532**.

## Sibling PR and merge order

This is a `both` increment. The sibling PR is on
**DEFRA/trade-imports-animals-frontend**, same branch name, which does the split
itself — template, controller, validation and copy.

**Merge order: this tests PR first, then the frontend PR.** CDP runs this repo's
suite against the deployed frontend, so a frontend merged ahead of its own test
changes would be exercised by stale specs that still fill a single CPH box, and
CDP would go red. Both PRs must be green (and approved, where the gate is on)
before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
