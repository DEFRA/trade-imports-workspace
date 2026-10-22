# EUDPA-296 — the two frontend items still open

Written 2026-10-22. The review's 129 frontend items are now 107 Done, 15
Merged, 3 Won't Fix, 2 Auto-Resolved and **2 part-done**, both recorded here
with exactly what remains and why it was not finished rather than guessed at.

Everything below is in `trade-imports-animals-frontend` unless said otherwise.

## #61 — the claim leg's session read

**What landed.** Two of the three spies are gone. Each drive now opens a real
upload session, registers it against the journey it created, and lets the page
find it through the stub adapters, so `findByCorrelationId` and `claim` run for
real — including the notification scoping, which the spy had made untestable
(it missed because the spy always missed, not because the upload belonged
elsewhere). Breaking the stub's `register` turns 23 tests red; before this it
would have turned none.

**What remains.** The session `read` is still stood in for, because the
cdp-uploader stand-in cannot produce two of the file entries the real service
can:

- a rejection carrying `FILE_EMPTY` — the stand-in never emits it, which is
  the assumption the review recorded as defect 4;
- a form with no `file` entry at all — the stand-in always synthesises one.

**Why it was left.** Teaching the stand-in either shape changes behaviour the
FIT suite drives through a real browser, and **`npm test` does not run FIT**.
Closing the item that way would have shipped an unverifiable change to the one
suite CI gates. If someone does take it on: FIT *is* runnable locally —
`PORT=3050 npm run test:fit -- --project=features` — so the change can be
proven; use `PORT=3050` because `reuseExistingServer: false` means a dev server
on 3000 breaks the run. The 39 documents FIT tests pass as of `1d59dcf3`.

Also note `claimError` has no stub seam (`claim` is `async () => undefined` and
cannot throw), so the `takeOnFailed` path keeps one spy whatever happens to the
read.

## #125 — the document-size cap's other homes

**What landed.** `sets/live-animals/docs/page-design.md` no longer restates
50 MB; it names `MAX_FILE_SIZE_MB` in
`journeys/linear/features/documents/upload-config.js` as the owner. In this
repo `upload-config.js` was already the single declaration and all five
consumers derive from it, so there was no code change to make.

**What remains, and it cannot be done from this repo.**

- `repos/trade-imports-performance-tests/src/config/traffic.js` —
  `DOCUMENT_CAP_KILOBYTES = 10_000` is a validator ceiling on the document
  size the perf suite may request, so the suite cannot reach the 50 MB path at
  all. Raising it to `50_000` is the stated fix, **but it is a load-test design
  decision** — 50 MB bodies across many VUs has real cost — so it wants the
  owner's call, not a quiet edit. Left deliberately.
- `repos/trade-imports-ins-tests/resources/file-upload/constants.ts` hard-codes
  both `50 * DECIMAL_BYTES_PER_MB` and the oversize message, consumed by
  `documents-limits.spec.ts`, `documents-reject.spec.ts` and
  `documents-large-uploads.spec.ts`. The honest fix is for those specs to read
  the figure off the page the service renders (`form[data-max-file-size]`,
  set by `template.njk`), which makes the frontend the owner across the repo
  boundary. **This item was not in the planners' original map** — it is the
  one that will actually break if the cap moves, and it does not run under
  `npm test`.

**Two of the item's own sub-claims are wrong and should be pushed back on
rather than reconciled:**

- The nginx `10M`/`2304M` figures in `docker/stack/config/nginx/animals-frontend.conf`
  are the CDP platform's ingress body-size caps, reproduced from
  `DEFRA/cdp-nginx-upstreams` with the source cited in the file. They are a
  different quantity from the document cap and are not this repo's to own.
- The backend's deleted `CDP_UPLOADER_MAX_FILE_SIZE` is not a lost home: it
  went with the whole uploader plumbing, because the backend no longer opens
  the session. Nothing there needs the figure.

**The item's stated means does not work at all.** A convict key read from
`upload-config.js` breaks `npm run build:frontend`: that module is in the
browser bundle (`webpack.config.js` → `client/index.js` →
`client/oversize-validation/submit.js`), and `src/config/config.js` pulls
`convict`, `node:path` and `node:url`, which webpack 5 does not polyfill.
Tree-shaking does not save it — `MAX_FILE_SIZE_BYTES` is the default parameter
of the one export the client uses. Verify by adding the import and building.

## Standing hazards for whoever picks this up

- **`npm test` does not run FIT**, but FIT runs locally and fast
  (`PORT=3050 npm run test:fit -- --project=features`, ~40s for the documents
  specs). Anything touching `services/cdp-uploader/stub.js`, `upload-config.js`,
  copy strings or the documents template should run it.
- **Copy strings are cross-repo coupled.** A copy change in this repo already
  broke an `ins-tests` spec on this ticket while unit, FIT and `tim spec lint`
  all passed. `ins-tests/page-objects/animals/accompanying-documents-page.ts`
  hard-codes `'Save and add another'` in a `getByRole` name.
- **Nothing validates the coverage `test` field** in `openspec/coverage/`. Two
  rows in `upload-documents/coverage.json` were stale — one naming a test that
  no longer existed, marked `full` — and `tim spec lint` passed throughout.
  Both are fixed; the gap in the tooling is not.
- **The pre-commit hook runs `format:check && lint && npm test`** (~90s), so
  batch items by file cluster rather than committing one at a time.
- **~40 files hold a local copy of `getHandlerOf`**, now promoted to
  `engine/test-support.js`. Sweeping them is a separate chore, deliberately not
  folded into this ticket.
