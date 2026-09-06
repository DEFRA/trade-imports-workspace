## What changed

Follows the frontend rename of the two identification page headings to **"Identification details"** and **"Additional details"**, the names Design release 1 uses.

The E2E page objects located their `h1` by the old names — "Animal identification details" and "Additional animal details" — so they now look for the new ones.

- `page-objects/notification/animal-identification-page.ts`
- `page-objects/notification/additional-details-page.ts`

## Increment

Increment `inc-102` of the DR1 parity backlog — EUDPA-403.

## Sibling repo and merge order

This is a `both` increment. The sibling PR is in **DEFRA/trade-imports-animals-frontend** on the same branch, making the copy change these locators follow.

**Merge this PR first, then the frontend one.** CDP runs this suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs still looking for the old headings, and CDP would go red. Both PRs must be green before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QU1nK61XsgdY25ueTiqM45
