## What this changes

Increment **inc-124**, ticket **EUDPA-558** — parity finding against Design release 1.

The transporter type chooser and the private transporter form did not match Design release 1. The frontend headed the type page with the question itself ("What type of transporter will move the animals?"), listed Commercial before Private, explained both options with its own hints, and gave no warning to search first. Design release 1 heads the page "Choose a transporter type", warns the trader to search before adding, puts Private first, and explains only Commercial.

### Type page (`transporter-add.njk`)

- `h1` is now **"Choose a transporter type"**, under the existing "Add a new transporter" caption.
- A warning sits between the heading and the radios: *"Before you add this transporter, please ensure you have already searched for it first."*
- The question stays as the radio group's legend but is now visually hidden, so a screen reader still announces it without a second heading competing with the `h1`.
- The "We will ask for the transporter's details next." hint is removed.
- Options are reversed: **Private transporter** first (relabelled from "Private", no hint), then **Commercial**, hinted *"This can only be a commercial transporter from Northern Ireland."*
- Both of the frontend's own explanatory hints on the two options are dropped.

### Private transporter form

- Heading changes from "Private transporter details" to **"Add private transporter"**.

Copy (`copy.en.js`), the copy contract test (`copy.cy.js`, `copy.test.js`) and the transporters fit spec are updated alongside.

## Sibling PR and merge order

This is a cross-repo increment. The sibling PR is in **DEFRA/trade-imports-animals-tests** on the same branch, updating the transporter page objects and the two scope specs to follow the renamed headings and the relabelled private radio.

**Merge order: tests first, then this frontend PR.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. Both PRs must be green before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
