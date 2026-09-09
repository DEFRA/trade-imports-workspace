## What changed

DR1 asks the trader to choose a document type before saving an accompanying document. The frontend never asked — it guessed the type by token-matching the uploaded filename against the document-types enum, falling back to `OTHER`. Upload `scan001.pdf` and you got `OTHER`; rename the same file `itahc.pdf` and you got `ITAHC`, with no way to see or correct the guess (the only row actions are View file and Remove).

This increment gives the field a surface:

- **New `Document type` select** on the accompanying-documents upload form, between the document reference and the date of issue, bound to the existing mandatory `accompanyingDocumentType` obligation.
- Options come from a new `documents/contracts/document-type-options.js` list — DR1's thirteen types, in DR1's order, opening on a `Select one` placeholder.
- **Validation**: leaving it unchosen fails with `Select a document type`, ordered into the error summary ahead of the date of issue and the file.
- **`deriveDocumentTypeFromFilename` and its test are retired** — the trader picks the type now, so the controller no longer guesses it.
- Two copy alignments travel with the field: ITAHC is spelled out as `Intra Trade Animal Health Certificate (ITAHC)`, and `HEALTH_CERTIFICATE` — which DR1 does not offer a design-release user — is dropped from the option list.

Unit tests, copy tests and the documents fit specs are updated to match.

## Increment

- Increment `inc-136` of **EUDPA-512** (parity corpus `dr1`, slice `documents`, band `frontend-work`).

## Sibling repo and merge order

This is a cross-repo increment. The sibling PR is on **DEFRA/trade-imports-animals-tests**, same branch name, following the new select through the E2E page object and the persistence round-trip.

**Merge order: tests first, then this frontend PR.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. Both PRs must be green (and approved) before either merges.

## Follow-up raised separately

The merged-error-summary ordering idiom is now hand-rolled in four places across the repo. Not fixed here — the new code follows the existing house pattern rather than departing from it inside an add-field increment. The remedy is a shared `orderedErrors(order, errors)` helper in `shared/kit.js` repointing all four call sites, which is a standalone refactor ticket.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
