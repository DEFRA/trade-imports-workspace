## What broke

The frontend PR for EUDPA-524
([DEFRA/trade-imports-animals-frontend#290](https://github.com/DEFRA/trade-imports-animals-frontend/pull/290))
renames the two shared virus-check status tags on the accompanying-documents
table to Design release 1's wording:

- `PENDING` — "Checking" becomes "Scanning for virus"
- `COMPLETE` — "Safe" becomes "Check completed"

Each tag also gains a visually hidden "Virus check status for {reference}"
prefix. "Virus found" and "Unknown" are unchanged.

Seven E2E specs in this repo still asserted the old words, so the workspace
E2E run against the frontend branch image timed out on every scan-status
assertion — for example
`expect(documentRow(ref)).toContainText('Safe')` against a row reading
"Virus check status for PWCAP…Check completed".

## What changed

Assertions and the two test titles that name the states, updated to the new
wording. No assertion was weakened, skipped or removed.

- `tests/e2e/features/documents-limits.spec.ts`
- `tests/e2e/features/documents-refresh-no-js.spec.ts`
- `tests/e2e/features/documents-scan-lifecycle.spec.ts`
- `tests/e2e/features/promoted-documents.spec.ts`
- `tests/e2e/journeys/persistence/persistence-accompanying-document.spec.ts`
- `tests/security/frontend-documents.spec.ts`

## Belongs to

- Increment `inc-142`, corpus `dr1-parity-union`
- Ticket EUDPA-524
- Pairs with DEFRA/trade-imports-animals-frontend#290 — same branch name, so
  the workspace E2E run picks up both branch images together.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
