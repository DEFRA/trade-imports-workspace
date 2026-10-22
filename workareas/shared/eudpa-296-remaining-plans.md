# EUDPA-296 — plans for the 19 frontend items still open

Written 2026-10-22 by the session that drained 48 open frontend items to 19.
Each entry is a planning pass already done against the code as it stands after
`e5458fe6`, so the next session should not re-derive them. Where a plan found
the item's own stated means unworkable, that is recorded rather than worked
round.

Everything below is in `trade-imports-animals-frontend` unless said otherwise.

## The keystone: #123, and the four items that depend on it

`#123` wants one shared helper to own driving a handler and seeding the
returning-from-upload state. Its stated means ("extend `driveHandler` with
whatever the local copies added") is misleading: the local copies added
**nothing** — `change-context.test.js` and `save-actions.test.js` hold strict
subsets of `driveHandler`. What is actually needed is a seam, because the
journeyId is minted *inside* `driveHandler` while the upload registration has
to key on it (`services/document-uploads/stub.js` keys `${journeyId}/${correlationId}`).

Three additive pieces, in this order:

1. **`engine/test-support.js`** — add an optional `journeyId` option:
   `const journey = journeyId ? { journeyId } : await store.create()`. Every
   later line already reads `journey.journeyId`. **60 files import this
   module; none breaks** — no existing caller passes a top-level `journeyId`
   (the only `journeyId:` keys are nested under `params:`).
2. **`engine/test-support.js`** — add `getHandlerOf` and
   `getHandlerEndingWith`, mirroring the POST twins. `getHandlerOf` must stay
   path-free: `declaration/test-support.js` exports a route with no `path`.
   This is also `#3`'s fix (the contract suite picks the GET by declaration
   order, so reordering the routes hands it `getStatus`).
3. **`services/cdp-uploader/stub.js`** — extract `recordSubmittedUpload(uploadId, payload)`
   from `takeUpload`, so a test can record a submitted form against an opened
   session without a spy. The `sessions` map is module-private, so there is no
   other way. Note this touches a file `server.js` loads in stub mode, not a
   test-only file.
4. **New `documents/test-support.js`** (feature-local, following
   `features/declaration/test-support.js`) owning `submitUploadForJourney` and
   `driveReturnFromUpload`. Putting the correlation-handle concept in
   `engine/test-support.js` would drag `services/cdp-uploader`,
   `services/document-uploads` and the documents contracts into the engine
   harness — recommended against.

Then `#1` and `#3` (`contract.test.js`), `#44` (`change-context.test.js`) fall
out as consequences: spies on the repo's own service modules go, the local
`drive()`/`drivePost()` copies go, and the order-dependent GET lookups go.

One behaviour delta to know: the local `drive` called `stubH()` with no
request; `driveHandler` calls `stubH(request)`, so `h.request` becomes
defined. Traced — `kit.base` only reads it inside its `amending && request`
branch, no test in those files amends, and none of the three features reads
`h.request`. Safe.

## #61 — the claim leg's spies (currently the only partial)

**Unblocked by #123's `journeyId` seam.** With it, `documents/controller.test.js`
can register an upload against the real journey and drop the
`findByCorrelationId` and `claim` spies entirely — which also makes the
journey scoping real rather than a lookup that always misses.

**Two cases cannot be driven through the stub, and that is a stub-fidelity
limit, not an oversight:**

- `errorCode: 'FILE_EMPTY'` — the cdp-uploader stub never emits it. This is
  the assumption the review recorded as defect 4.
- an absent `file` key — the stub always synthesises an entry.

Adding either to the stub is a behaviour change to the one suite that cannot
be proven locally (**`npm test` does not run FIT**), so it was deliberately
not done. Those two tests keep supplying their own form. The rest of the leg
can move to the stub.

Also: the stub mints a UUID in `open()`, so any assertion on the literal
`uploadId: 'upload-session-1'` must read the returned id instead. And
`claimError` has no stub seam (`claim` is `async () => undefined` and cannot
throw), so the `takeOnFailed` path keeps one spy.

## Cluster A — shared app-level duplication

**Apply in order #114 → #121 → #120 → #122.**

- **#114** (an uploader call counted as a journey-backend call) — real on the
  rule; the item's numeric framing overstates it. The perf repo's
  `backendCallsPerPage: 1` is a *planning constant* read once to size a
  session path, asserts nothing, and a documents GET already made more than
  one backend call before this PR. Fix: move `services/cdp-uploader/real.js`
  off `backendFetch` onto `measureExternalCall` with
  `{ dependency: 'cdp-uploader', operation: 'initiate' | 'status' }`.
  **The `!response.ok` check must sit inside the measured thunk** —
  `measureExternalCall` records `failed` only when its callback throws, and a
  non-ok `fetch` resolves, so checking outside would publish every uploader
  503 as a success. Deliberately no `interfaceId`: there is no metric-contract
  doc in this repo and no SYN id assigned to the upload service; invent one
  only if the interface catalogue assigns it. Needs **one new test** asserting
  the `/call-counts` bucket (`backendCalls: 0`,
  `externalCalls: {'cdp-uploader': {status: 1}}`) — invert by putting
  `backendFetch` back.
  Also add a `console.log` spy to `cdp-uploader/real.test.js`'s existing
  `beforeEach`, or the EMF flush makes the suite noisy.
- **#118** (the `backendFetch` doc comment no longer matches its callers) —
  **zero edits; discharged entirely by #114.** Once the uploader is off
  `backendFetch`, every remaining caller is a journey-backend call and the
  comment is true as written. It cannot be closed independently: rewording it
  would make it describe a caller, which the house rules forbid outright.
  Mark it resolved-by-#114.
- **#121** (the client HTTP preamble written three times) — real for the two
  new clients; the item's "the pre-existing client preamble they were copied
  from" names a single source that does not exist. It is two places with
  different shapes (`persistence/records/real/` returns a `BackendRequestError`;
  `address-book/client.js` adds an org header). Extract
  `services/http/trace-headers.js` with `traceHeaders(contentType)` and
  `failedResponse(action, response)`, reading the header name from
  `config.get('tracing.header')` rather than a fourth hand-rolled
  `process.env.TRACING_HEADER ?? 'x-cdp-request-id'`.
  **Keep `failedResponse` a plain `Error`.** Converging it on
  `BackendRequestError` would mark every upload-service failure recoverable
  (`kit.recoverableSave` branches on that marker). Traced as behaviour-neutral
  today, but it is a semantic change outside this item — raise separately.
- **#120** (404 declared in many places under two names) — real, and the item
  **under-counts: six sites under three names, not four**. It misses
  `services/persistence/records/real/config.js`. Point them all at
  `app/lib/http-status.js`'s `HTTP_STATUS_NOT_FOUND`. Leave
  `cdp-uploader/stub.test.js`'s own literal — a test asserting against the
  production constant is tautological.
  Caveat worth flagging, not fixing here: the repo has two owners of the whole
  HTTP-status vocabulary (`common/constants/status-codes.js` and
  `app/lib/http-status.js`). Collapsing them is a separate repo-wide change.
- **#122** (the uploader's file-error vocabulary declared twice) — real. New
  `services/cdp-uploader/file-error-codes.js` exporting `FILE_EMPTY`,
  `FILE_TOO_LARGE`, `FILE_INVALID_TYPE`; read by both `stub.js` and
  `documents/form/errors.js`. **Do not route either side through
  `services/cdp-uploader/index.js`** — the barrel imports `stub.js`, so that
  would be a cycle, and `no-circular` is error-severity in dependency-cruiser.
  Leave every string literal in the tests alone: they are the independent pin
  on the wire contract. The mutation probe **is** this item's evidence — change
  `FILE_TOO_LARGE` to `'FILE_OVERSIZE'` and both `stub.test.js` and
  `controller.test.js` go red, which is the two-sided failure that was
  impossible before.

## Cluster G — the FIT spec (#74, #75, #76)

Every line number in these three items is **~+23 off**; the spec moved.

- **#74** — real on the title, **wrong on its premise**. It calls the second
  act-and-assert cycle redundant with the saved-row test; it is not. The
  behaviour spec owns the sequence as one scenario
  (`openspec/.../upload-documents/spec.md` SCN-DOCS-016-A) and
  `openspec/coverage/.../coverage.json` links this exact test to it as `full`.
  Deleting the second cycle drops that to partial. **Recommended: retitle
  only** — zero assertion change — and update the coverage row's `test` field
  to match (a workspace-repo edit, same branch name).
- **#75** — real. Swap the hand-rolled one-field preservation check for the
  local `expectPreservedMetadata` helper. **This adds two assertions** (type
  and date-of-issue values on a path that never asserted them). Invert by
  rendering the type and date as empty from `refuseUnaddedDocument` — the two
  new assertions must go red while the error-summary and reference ones stay
  green.
- **#76** — real; **one cited fact is wrong and it makes the fix easier**.
  There is no comment at `controller.js:219-223` to deduplicate against — do
  not go looking for it. The rule's canonical home is already
  `spec.md` REQ-DOCS-016, so both comments are straight deletions.

**None of these can be proven by `npm test`.** FIT is self-contained though
(`STUB_MODE=true` webServer), so run
`PORT=3050 npm run test:fit -- --project=features --grep "document upload continue"`.
Use `PORT=3050`: `reuseExistingServer: false` means a dev server on 3000
breaks the run.

**Separate live defect found here, not an open item:**
`openspec/coverage/live-animals/journey-pages/upload-documents/coverage.json`
still links `"file validation: an oversize file past the browser check is
refused on receipt"` as `full` — a test that no longer exists (the
un-failable `removeAttribute` version was removed in `d007be82`/`b3a966ac`).
It proves no tool validates coverage `test` fields. Worth its own item.

## Cluster H leftovers — #101, #102, #104, #105

- **#101** — real. `kit.js` reads `concurrencyToken` back from the persisted
  record; it is not minted per render, so the comment is half false and it
  contradicts the correct comment already above `contextFor`. Replace both with
  a named helper `withoutKeysThatChangePerSave`, true of both keys.
- **#102** — real. `expect(removal.after.documents ?? []).toHaveLength(0)`
  passes for absent, `undefined` and `[]`, and with one seeded document cannot
  tell "removed the named entry" from "cleared the collection". Seed two and
  assert the survivor by reference.
- **#104** — real; the two set-up blocks are character-for-character
  identical. Hoist to module scope.
- **#105** — real, and worse than stated: `enforcedAt` appears **nowhere** in
  the app (`grep -rn enforcedAt src/ docs/` finds only this comment and one
  test title), and the comment's last clause is false against its own test.
  Straight deletion; the hoisted `reasonPrerequisites` name says what is true.

## #125 — the document-size cap has many homes

**Real as duplication, but its map is wrong in two places and its stated means
does not work.**

- **The stated means is impossible.** A convict key read from
  `upload-config.js` breaks `npm run build:frontend`: that module is in the
  browser bundle (`webpack.config.js` → `client/index.js` →
  `client/oversize-validation/submit.js`), and `src/config/config.js` pulls
  `convict`, `node:path` and `node:url`, which webpack 5 does not polyfill.
  Tree-shaking does not save it — `MAX_FILE_SIZE_BYTES` is the default
  parameter of the one export the client uses.
- **The nginx figures are not the document cap.** `10M`/`2304M` in
  `docker/stack/config/nginx/animals-frontend.conf` are the CDP platform's
  ingress body-size caps, reproduced from `DEFRA/cdp-nginx-upstreams` with the
  source cited in the file. Recommend pushing back rather than "reconciling".
- **The backend "loss" is not a loss.** The deleted
  `CDP_UPLOADER_MAX_FILE_SIZE` went with the whole uploader plumbing, because
  the backend no longer opens the session. Nothing there needs the figure.
- **A sixth home the item missed, and it is the dangerous one:**
  `repos/trade-imports-ins-tests/resources/file-upload/constants.ts` hard-codes
  both `50 * DECIMAL_BYTES_PER_MB` and the oversize message, consumed by three
  specs. Any cap or copy change breaks them, and they do not run under
  `npm test`.
- **What to actually do now:** in-repo, make
  `sets/live-animals/docs/page-design.md` cite `MAX_FILE_SIZE_MB` as the owner
  instead of restating 50 MB. `upload-config.js` is already the single
  declaration and all five consumers derive from it, so there is no code edit.
  Then the perf repo's `DOCUMENT_CAP_KILOBYTES = 10_000` → `50_000`, and
  ideally have the ins-tests specs read the figure off `form[data-max-file-size]`
  rather than hard-code it. Cannot be closed from this repo alone.

## Standing hazards for whoever picks this up

- **`npm test` does not run FIT.** Anything touching
  `services/cdp-uploader/stub.js`, `upload-config.js`, copy strings or the
  documents template needs a separate FIT run before pushing.
- **Copy strings are cross-repo coupled.** A copy change in this repo has
  already broken an `ins-tests` spec on this ticket while unit, FIT and
  `tim spec lint` all passed. `ins-tests/page-objects/animals/accompanying-documents-page.ts`
  hard-codes `'Save and add another'` in a `getByRole` name — #124's change
  kept the rendered string byte-identical, so it is safe, but check before
  pushing anything that touches it.
- **The pre-commit hook runs `format:check && lint && npm test`** (~90s). Batch
  items by file cluster; one commit per batch, not per item.
- **~40 files hold a local copy of `getHandlerOf`.** Promoting it (item #123,
  piece 2) does not oblige a 40-file sweep in this ticket; that is a separate
  chore. Do not bury the review items under it.
