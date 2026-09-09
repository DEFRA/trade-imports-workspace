## What this changes

Tracks the document upload size limit that moves from 10 MB to 50MB in
**DEFRA/trade-imports-animals-frontend** for this increment, so the E2E suite exercises
the limit actually in force rather than a pinned literal.

- `resources/file-upload/constants.ts` — `TEN_MB_BYTES` becomes `MAX_FILE_SIZE_BYTES`,
  and `ABOVE_PAYLOAD_CAP_BYTES` is derived from it rather than pinned to a literal, so
  the next change to the limit does not need a second edit here. The comment recording
  the old 10 MiB CDP nginx ingress ceiling goes with it.
- `tests/e2e/features/documents-limits.spec.ts` — the boundary spec imports the shared
  oversize message instead of repeating the wording, so the spec cannot drift from the
  frontend's copy.

No new test cases; the existing boundary coverage now moves with the limit.

## Sibling PR and merge order

This increment also changes **DEFRA/trade-imports-animals-frontend** on the same branch
name (`feat/EUDPA-518-the-frontend-rejects-any-document-over-1`), where
`MAX_FILE_SIZE_MB` goes from 10 to 50 and carries `MAX_FILE_SIZE_BYTES`,
`MAX_PAYLOAD_BYTES`, the browser-side `data-max-file-size` attribute and the oversize
error message with it.

**Merge this PR first, then the frontend one.** CDP runs this repo's suite against the
deployed frontend, so a frontend merged ahead of its own test fixes is exercised by
stale specs and CDP goes red. Both PRs must be green before either merges.

## Before the frontend side is deployed

Recorded against the ticket, not fixed in either repo: the CDP nginx request-body cap in
front of the frontend must be confirmed at >= 50,001,024 bytes. This repo held one of
the two pieces of evidence that it has not been — the old
`ABOVE_PAYLOAD_CAP_BYTES` comment documenting the 10 MiB ceiling. If the cap cannot be
raised, hold both merges and split the increment so only the unit/label correction lands.

Increment: `inc-138`
Ticket: EUDPA-518

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
