# EUDPA-296 — the frontend items still open

Written 2026-10-22, **rewritten 2026-10-23**. The frontend's 135 items are now
112 Done, 15 Merged, 3 Won't Fix, 2 Auto-Resolved and **3 open**. All three need
a decision rather than effort, and the analysis behind each is here because it
cost real work to establish and should not be redone.

`#61` and `#126`, which this file used to carry, are **done** — see the
handover beside this file for what landed.

Everything below is in `trade-imports-animals-frontend` unless said otherwise.

## #133 — the crumb and concurrency token crossing to cdp-uploader

**The finding is real.** `template.njk:65-66` put `crumb` and
`concurrencyToken` as hidden inputs in the one form on the page, and the add
button's `formaction` sends that form to cdp-uploader, which keeps every
submitted text field and returns them from its status endpoint. A token whose
purpose is to be known only to this service and the trader's session is stored
by another service and travels back through a second hop.

**Both remedies the item offers are blocked**, and this was checked against the
code rather than assumed:

- The page has **one** form because the add button reaches cdp-uploader by
  `formaction`, not by its own form. Continue needs the document fields —
  `post` → `continuesADocument` → `answersADocument(payload)`, which is item
  #130's fix: a part-filled document must not be discarded in silence. Remove
  needs the crumb and the token.
- An HTML control belongs to exactly one form, including via the `form`
  attribute. So the document fields cannot be in both an add form and a page
  form.
- **Move the crumb out** → Remove and Continue lose CSRF protection without
  JavaScript.
- **Move the document fields into an add-only form** → #130 regresses for a
  no-JS user: a typed-but-not-added document reaches Continue nowhere.
- **Mirror hidden copies between two forms** → needs JavaScript to sync, which
  progressive enhancement forbids relying on. On a fresh render `values` is
  empty, so a server-rendered mirror cannot carry what the trader just typed.
- **A header-borne crumb** (hapi crumb's `restful` mode, `X-CSRF-Token`) → JS-only
  for the same reason.
- **A crumb in the `formaction` query string** → puts a CSRF token in a URL,
  where it lands in logs, referrers and history. Worse, not better.

**So the decision is one of two things:**

1. **Accept it and record why.** The crumb is session-bound; the concurrency
   token is a staleness check, not an authorisation one; and cdp-uploader is a
   DEFRA platform service inside the same trust boundary rather than a third
   party. Write that in the repo's `docs/` beside the form, so the next reader
   meets the reasoning rather than the smell.
2. **Change the architecture.** Hold the typed answers in this service's own
   session keyed by `correlationId` instead of round-tripping them through
   cdp-uploader, so only the file crosses. That also removes the reliance on
   cdp-uploader storing arbitrary text for us. It needs the add action to reach
   our server before the browser posts the file, which one form submit cannot do
   without JavaScript — so it is a real design change, well beyond a review fix,
   and probably its own ticket.

Note the same problem covers `retryRemoveIndex` and `retryRemoveUploadId`, which
are rendered on the recoverable-save path and cross the boundary too.

## #58 — unclaimed upload sessions and orphaned S3 objects

**What is fixed.** The backend's own upload session has a 24h TTL, so a
registration the browser never returns with expires.

**What remains is not this repo's.** cdp-uploader's own session state and the S3
objects from abandoned uploads are not cleaned up by that TTL, and neither is
reachable from here — we open a session through its API and never learn its
storage keys for an upload that was never claimed. The honest next step is to
ask the platform team what cdp-uploader does with an initiated-but-never-
completed session, rather than to build something here that cannot reach it.

A second, cheaper half **is** ours and is worth weighing: the page mints a
session on every render, including each tick of the no-JS refresh link
(`MAX_POLL_ATTEMPTS`), so one document's scan leaves a run of sessions behind.
Reusing the session already open for the page view would cut the volume sharply
without needing anything from cdp-uploader. That is a change to
`handlers/open-upload-session.js` and the `get` path, and it needs care: the
correlation handle is what scopes an upload to a notification, so reuse must not
let two concurrent adds share one handle.

## #125 — the document-size cap's other homes

**What landed.** `sets/live-animals/docs/page-design.md` no longer restates
50 MB; it names `MAX_FILE_SIZE_MB` in
`journeys/linear/features/documents/upload-config.js` as the owner. In this repo
`upload-config.js` was already the single declaration and all five consumers
derive from it, so there was no code change to make.

**What remains, and it cannot be done from this repo.**

- `repos/trade-imports-performance-tests/src/config/traffic.js` —
  `DOCUMENT_CAP_KILOBYTES = 10_000` is a validator ceiling on the document size
  the perf suite may request, so the suite cannot reach the 50 MB path at all.
  Raising it to `50_000` is the stated fix, **but it is a load-test design
  decision** — 50 MB bodies across many VUs has real cost — so it wants the
  owner's call, not a quiet edit.
- `repos/trade-imports-ins-tests/resources/file-upload/constants.ts` hard-codes
  both `50 * DECIMAL_BYTES_PER_MB` and the oversize message, consumed by
  `documents-limits.spec.ts`, `documents-reject.spec.ts` and
  `documents-large-uploads.spec.ts`. The honest fix is for those specs to read
  the figure off the page the service renders (`form[data-max-file-size]`, set by
  `template.njk`), which makes the frontend the owner across the repo boundary.
  **This was not in the planners' original map** — it is the one that will
  actually break if the cap moves, and it does not run under `npm test`.

**Two of the item's own sub-claims are wrong and should be pushed back on rather
than reconciled:**

- The nginx `10M`/`2304M` figures in
  `docker/stack/config/nginx/animals-frontend.conf` are the CDP platform's
  ingress body-size caps, reproduced from `DEFRA/cdp-nginx-upstreams` with the
  source cited in the file. They are a different quantity from the document cap
  and are not this repo's to own.
- The backend's deleted `CDP_UPLOADER_MAX_FILE_SIZE` is not a lost home: it went
  with the whole uploader plumbing, because the backend no longer opens the
  session.

**The item's stated means does not work at all.** A convict key read from
`upload-config.js` breaks `npm run build:frontend`: that module is in the
browser bundle (`webpack.config.js` → `client/index.js` →
`client/oversize-validation/submit.js`), and `src/config/config.js` pulls
`convict`, `node:path` and `node:url`, which webpack 5 does not polyfill.
Tree-shaking does not save it — `MAX_FILE_SIZE_BYTES` is the default parameter
of the one export the client uses. Verify by adding the import and building.

## Standing hazards for whoever picks this up

- **`npm test` does not run FIT**, but FIT runs locally:
  `PORT=3050 npm run test:fit -- --project=features` (~3m for the whole
  `features` project). Anything touching `services/cdp-uploader/stub.js`,
  `services/document-uploads/stub.js`, `upload-config.js`, copy strings or the
  documents template should run it.
- **Copy strings are cross-repo coupled.** It has now bitten twice on this
  ticket: a frontend copy change broke an `ins-tests` spec while unit, FIT and
  `tim spec lint` all passed, and the per-reason scan tag broke
  `documents-scan-lifecycle.spec.ts` the same way.
  `ins-tests/page-objects/animals/accompanying-documents-page.ts` hard-codes
  `'Save and add another'` in a `getByRole` name, and
  `resources/file-upload/constants.ts` hard-codes the oversize message.
- **Nothing validates the coverage `test` field** in `openspec/coverage/`. Rows
  have been stale and marked `full` while `tim spec lint` passed throughout.
- **The pre-commit hook runs `format:check && lint && npm test`** (~90s), so
  batch items by file cluster rather than committing one at a time.
- **Do not push the frontend from a session.** The pre-push SonarCloud gate runs
  `npm ci` in the harness environment, which never inherits a PATH we set, so it
  fails whenever the shell default Node is below the pinned 24.21.0.
- **Never regenerate the frontend lock file.** Standing instruction. And
  `npm --prefix … ci` is not equivalent to an in-directory `npm ci`, so prove
  nothing about lock health from it.
- **`toStrictEqual` does not catch an undefined property.** It treats a key
  present-and-undefined as present, so it cannot assert absence. Assert the
  property: `expect(read.rejectionReason).toBeUndefined()`.
- **~40 files hold a local copy of `getHandlerOf`**, now promoted to
  `engine/test-support.js`. Sweeping them is a separate chore.
