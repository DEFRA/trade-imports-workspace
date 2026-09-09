## What this changes

DR1 collects the CPH number as three boxes sized to its county, parish and holding
parts. The frontend took the whole number in one free-text field. This splits that
single field into three inputs — **County**, **Parish** and **Holding number** —
sized 2/3/4, each with a numeric input mode and its own maxlength, matching the
shape a county parish holding number actually takes.

- The controller joins the three parts back into the nine bare digits the backend
  already receives, so the wire contract does not move.
- Each part is validated for its own length, so an error names the part that is
  wrong rather than the whole number.
- The hint's second example taught a 3/3/3 grouping that no CPH number uses; it is
  corrected to "For example 12/345/6789" in both English and Welsh copy.
- Unit, copy, contract and fit tests are updated to match.

## Increment

Increment `inc-051` of the DR1 parity backlog. Ticket **EUDPA-532**.

## Sibling PR and merge order

This is a `both` increment. The sibling PR is on
**DEFRA/trade-imports-animals-tests**, same branch name, following the frontend's
new field names in the CPH page object, journey flow, seeded fixture, a11y specs
and the CPH e2e specs.

**Merge order: tests first, then this frontend PR.** CDP runs the tests repo's
suite against the deployed frontend, so a frontend merged ahead of its own test
changes would be exercised by stale specs that still fill a single CPH box, and
CDP would go red. Both PRs must be green (and approved, where the gate is on)
before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
