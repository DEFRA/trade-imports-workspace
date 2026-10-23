# EUDPA-296 — the frontend items, all closed

Written 2026-10-22, rewritten 2026-10-23 when the owner closed the scope, and
**closed out 2026-10-23**: `#136` and `#58`, the last two items on the ticket,
both landed. **No item is open in any repo** — `review-counts.sh EUDPA-296`
reads 250 Fix+Done, 39 Merged, 15 Won't Fix, 2 Auto-Resolved, 1 Discuss+Done.

| Item | Commit | What landed |
|---|---|---|
| `#136` | `a291e389` | The page says the document was not saved to the notification instead of claiming the answers were saved, carries the handle that takes the upload on again, and holds Continue back until the notification lists every document the service has taken on |
| `#58` | `4b221a52` | A session is opened per page view, not per render: a render reuses the one the page is already showing, carried in the refresh link and a hidden form field, looked up on the notification rather than trusted from the handle |

Both are **committed but not pushed** at the time of writing, so the PR's E2E
cascade has not run on them. Verified locally: 3179 unit (up from 3153),
474 FIT (`PORT=3050 npm run test:fit -- --project=features`), lint and
`format:check` clean, and the frontend SonarCloud gate run by hand against
PR 424 — **PASSED**. Every new assertion was proved by an invert-red probe.
The dev-mode stack E2E could not be run from that session: the permission
system refused the stack bring-up.

`#61` and `#126`, which this file used to carry, are **done** — see the
handover beside this file for what landed. Every repo is pushed and all five
PRs were green at the stop, the E2E included.

`#133` and `#125` are **Won't Fix** — neither is functional. Their analysis is
kept below unchanged, because it cost real work to establish and a re-review
should meet the reasoning rather than redo it, **not** because either is still
open. `#136` is written up in the handover and in its item.

Everything below is in `trade-imports-animals-frontend` unless said otherwise.

## #133 — the crumb and concurrency token crossing to cdp-uploader (WONT FIX)

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

## #58 — unclaimed upload sessions and orphaned S3 objects (DONE, `4b221a52`)

**What was already fixed.** The backend's own upload session has a 24h TTL, so
a registration the browser never returns with expires.

**What landed.** `handlers/open-upload-session.js` became
`handlers/add-form-session.js`: it reuses the session the page view is already
showing where the request carries its handle, and opens one otherwise. The
handle travels under one key, `uploadSession` — in the refresh link's query
(`contracts/upload-session.js` `OPEN_SESSION_KEY`, used by
`view-model/refresh.js`) and in a hidden field on the form, so a GET re-render
and a POST re-render both reuse. It is looked up with
`findByCorrelationId({ journeyId, correlationId })`, which is journey-scoped, so
a handle another notification opened reaches nothing and the page view opens its
own. A page view carrying no handle always opens its own session, which is how
two concurrent adds are kept from sharing one handle. An unreadable lookup logs
at warn and opens a new session rather than failing the page. The reasoning is
in the repo beside the code, in `sets/live-animals/docs/add-a-collection.md`.

**The one corner it does not cover,** recorded rather than hidden: a trader who
uses the browser's Back button onto a page whose session has since been
consumed, and then clicks refresh, keeps the consumed session where the old
code would have opened a fresh one. Their add is refused by the upload service
and recovers on a reload. Closing it needs single-use tracking of a session,
which means server-side state the page does not have.

**Out of scope, and not reachable from here.** cdp-uploader's own session state
and the S3 objects from abandoned uploads are not cleaned up by that TTL, and we
cannot reach them: we open a session through its API and never learn its storage
keys for an upload that was never claimed. If it matters, ask the platform team
what cdp-uploader does with an initiated-but-never-completed session. Do not
build something here that cannot reach it.

## #125 — the document-size cap’s other homes (WONT FIX)

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
- **The frontend is cross-repo coupled to `ins-tests` by behaviour, not only by
  strings.** Three times on this ticket: the `'Save and add another'` rename,
  the per-reason scan tag breaking `documents-scan-lifecycle.spec.ts`, and
  #131's add control becoming `aria-disabled` at the document cap, which left
  `documents-limits.spec.ts` clicking a dead button for two minutes. Only the
  first two are strings. Unit, FIT and `tim spec lint` passed through all three.
  Known hard-coded couplings:
  `ins-tests/page-objects/animals/accompanying-documents-page.ts` has
  `'Save and add another'` in a `getByRole` name, and
  `resources/file-upload/constants.ts` has the 50MB figure and the oversize
  message. **Before pushing a frontend change, grep `ins-tests` for any message,
  status code, response shape or control state you altered.**
- **A branch behind `main` fails the E2E for unrelated reasons.** `ins-tests`
  was 10 commits behind and `workspace` 14, which failed `address-book-delete`
  on four consecutive runs while every other branch passed. Check with
  `git -C <repo> rev-list --left-right --count origin/main...HEAD` before
  diagnosing an E2E failure; `git diff origin/main...HEAD` hides it, because
  three dots compare against the merge base.
- **Nothing validates the coverage `test` field** in `openspec/coverage/`. Rows
  have been stale and marked `full` while `tim spec lint` passed throughout.
- **The pre-commit hook runs `format:check && lint && npm test`** (~90s), so
  batch items by file cluster rather than committing one at a time.
- **The pre-push SonarCloud hook does not fire — run the gate by hand.** It did
  not run on any of the eight pushes on 23 Oct. The earlier theory here, that
  `npm ci` fails on a Node below the pinned 24.21.0 in the harness environment,
  does not fit: a failing gate would have blocked the push, and these returned
  in seconds. The hook is not being invoked at all. The gate commands are in the
  handover under "Running the Sonar gates by hand"; both passed when run
  directly. Pushing from a session is fine, but the gate is yours to run until
  the `PreToolUse(Bash)` matcher is fixed.
- **Never regenerate the frontend lock file.** Standing instruction. And
  `npm --prefix … ci` is not equivalent to an in-directory `npm ci`, so prove
  nothing about lock health from it.
- **`toStrictEqual` does not catch an undefined property.** It treats a key
  present-and-undefined as present, so it cannot assert absence. Assert the
  property: `expect(read.rejectionReason).toBeUndefined()`.
- **~40 files hold a local copy of `getHandlerOf`**, now promoted to
  `engine/test-support.js`. Sweeping them is a separate chore.
