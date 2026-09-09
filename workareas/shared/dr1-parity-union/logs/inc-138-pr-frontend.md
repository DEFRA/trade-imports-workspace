## What this changes

Raises the accepted document upload size on the live-animals documents page from
10 MB to 50MB, so the page matches Design release 1, and settles the unit label on
the unspaced `50MB` form that DR1 uses.

`MAX_FILE_SIZE_MB` moves from 10 to 50 in
`src/server/app/sets/live-animals/journeys/linear/features/documents/upload-config.js`.
Everything derived from it moves with it:

- `MAX_FILE_SIZE_BYTES` — 50,000,000
- `MAX_PAYLOAD_BYTES` — 50,001,024 (the route's own payload cap, kept just above the
  file limit so an oversize post is answered rather than silently dropped)
- the browser-side `data-max-file-size` attribute rendered onto the form
- the oversize error message, now "The selected file must be smaller than 50MB"

The code comment that recorded 10 MB as a choice made against the CDP nginx 10 MiB
ingress cap is replaced with the standing requirement that the ingress cap must
allow at least `MAX_PAYLOAD_BYTES`.

Unit tests in `controller.test.js` and `upload-config.test.js` follow the number.

## Before this is deployed

Two things are recorded against the ticket rather than fixed here, because no code in
this repo can settle them:

1. **Ingress cap (blocking).** The CDP nginx request-body cap in front of this service
   must be confirmed at >= 50,001,024 bytes. Until it is, a file between 10 MiB and
   50MB passes both the browser and the server check and is then killed by the ingress,
   giving the trader a platform 413 page and losing the metadata they typed —
   `handleOversizePayload` is an `onPreResponse` extension and never runs for a request
   that never reaches hapi. If the cap cannot be raised, hold this merge and split the
   increment so only the unit/label correction lands.
2. **Heap headroom.** The POST route still buffers the whole upload in the Node heap
   (roughly three resident copies per in-flight upload), so the cost per upload rises
   5x. Sizing the container or moving to a streaming multipart output is its own
   increment.

The backend half of the dependency is already met:
`trade-imports-animals-backend` sets `spring.servlet.multipart.max-file-size: 50MB`,
`max-request-size: 51MB` and `cdp.uploader.max-file-size: 52428800`, so no backend
change is in this increment.

## Sibling PR and merge order

This increment also changes **DEFRA/trade-imports-animals-tests** on the same branch
name (`feat/EUDPA-518-the-frontend-rejects-any-document-over-1`), where the E2E suite
tracks the same number: `TEN_MB_BYTES` becomes `MAX_FILE_SIZE_BYTES`,
`ABOVE_PAYLOAD_CAP_BYTES` is derived from it rather than pinned to a literal, and the
boundary spec imports the shared oversize message instead of repeating it.

**Merge the tests PR first, then this one.** CDP runs the tests repo's suite against
the deployed frontend, so a frontend merged ahead of its own test fixes is exercised by
stale specs and CDP goes red. Both PRs must be green before either merges.

Increment: `inc-138`
Ticket: EUDPA-518

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
