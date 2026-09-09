## What this changes

Follow the frontend's newly enhanced file upload in the accompanying-documents page object.

The frontend now turns on govuk-frontend's JavaScript-enhanced file upload for the documents control, so a trader gets the drop zone Design release 1 asked for. The enhanced control hides the raw input inside a drop-zone wrapper and puts a button carrying the field's id in front of it, so `getByLabel('Upload a file')` now resolves the **button** rather than the input.

This targets the file input directly instead. The file still posts on that input, so nothing else about the flow changes.

- `page-objects/notification/accompanying-documents-page.ts` — 4 insertions, 1 deletion.

## Increment

Increment `inc-137` of **EUDPA-514**, from the DR1 parity backlog.

## Cross-repo

This increment also touches **DEFRA/trade-imports-animals-frontend**, on the same branch name — that is where the drop zone is turned on.

**Merge order: this tests PR first, then the frontend PR.** CDP runs this repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. There is no backend change in this increment.

Both PRs must be green (and approved, where the gate is on) before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
