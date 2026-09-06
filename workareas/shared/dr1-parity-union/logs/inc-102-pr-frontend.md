## What changed

Design release 1 names the two identification pages **"Identification details"** and **"Additional details"**. The frontend headed them "Animal identification details" and "Additional animal details" — DR1 carries the orientation in the section caption above the heading rather than repeating it in the heading itself.

Each page name lives once in its feature's copy file and feeds the `h1`, the last breadcrumb and the browser tab title together, so one string per page changes all three.

- `commodities/copy`: `identification.title` → "Identification details" (en) / "Manylion adnabod" (cy).
- `additional-details/copy`: `title` → "Additional details" (en) / "Manylion ychwanegol" (cy).
- The fallback identifier type happens to read "Identification details" too. It is now named once per locale as `FALLBACK_IDENTIFIER_LABEL` and shared by its list label and its field label, so a later change to the page name cannot silently drag the field label along with it.
- Copy unit tests and the fit specs assert the new names.

## Increment

Increment `inc-102` of the DR1 parity backlog — EUDPA-403.

## Sibling repo and merge order

This is a `both` increment. The sibling PR is in **DEFRA/trade-imports-animals-tests** on the same branch, updating the two E2E page objects that locate these pages by their `h1`.

**Merge the tests PR first, then this one.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs looking for the old headings, and CDP would go red. Both PRs must be green before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QU1nK61XsgdY25ueTiqM45
