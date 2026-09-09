## What this changes

The accompanying-documents upload page's capacity validation message is being
reworded to match Design release 1: "You can add a maximum of {max} documents"
becomes "You can upload a maximum of {max} files". This updates the E2E
assertion in `tests/e2e/features/documents-limits.spec.ts` to expect the new
wording.

One line, in `maximumDocumentsMessage`. The limit itself (15) is unchanged — it
still comes from the frontend's own obligation; only the sentence around it
moves.

## Cross-repo

Increment `inc-143`, ticket **EUDPA-526**. This is a two-repo increment: the
sibling PR is on **DEFRA/trade-imports-animals-frontend**, on the same branch
`feat/EUDPA-526-four-of-the-upload-page-s-validation-mes`, changing four
validation messages in the English and Welsh copy files (`dateRequired`,
`dateInvalid`, `fileRequired` and `maxDocuments`).

**Merge order: this tests PR first, then the frontend PR.** CDP runs this
suite against the deployed frontend, so a frontend merged ahead of its own test
fixes would be exercised by stale specs and CDP would go red. Both PRs must be
green (and approved, where the gate is on) before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
