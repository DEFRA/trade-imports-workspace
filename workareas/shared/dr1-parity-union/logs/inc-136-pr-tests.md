## What changed

Follows the frontend's new `Document type` select through the E2E suite.

- `page-objects/notification/accompanying-documents-page.ts` gains a `documentType` locator, and `fillDocument` now selects a type — defaulting to ITAHC — between the document reference and the date of issue.
- `persistence-accompanying-document.spec.ts` asserts the persisted `documentType` is the ITAHC the trader chose, rather than the `OTHER` the retired filename-derivation used to produce. Its docstring no longer describes the type as derived from the filename.

## Increment

- Increment `inc-136` of **EUDPA-512** (parity corpus `dr1`, slice `documents`).

## Sibling repo and merge order

This is a cross-repo increment. The sibling PR is on **DEFRA/trade-imports-animals-frontend**, same branch name, adding the `Document type` select to the accompanying-documents upload form and retiring `deriveDocumentTypeFromFilename`.

**Merge order: this tests PR first, then the frontend PR.** CDP runs this repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. Both PRs must be green (and approved) before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
