# EUDPA-296 review — where it got to

Handover for a re-review. Written 2026-10-22, **last updated 2026-10-23** after
a session that closed the errorCode thread (backend #104, frontend #135, #134,
#126) and #61. The review itself lives in `workareas/reviews/EUDPA-296/`
(gitignored), so this file carries what a later session needs and the item files
carry the detail while they survive.

## Read this first

**All ten Criticals are closed again.** Frontend #126 was reopened as Critical
on 23 Oct because the premise it had been closed on was false; it is now Done
on evidence, with the owner's wording decision recorded below. The PASS comments
posted on the five PRs are **stale** — re-post them once #133, #58 and #125 are
settled: `share-review.sh EUDPA-296 --comment-only --summary` regenerates them
from the item files.

**One thing is unpushed and the push is yours**, not a session's: the frontend's
pre-push SonarCloud gate runs `npm ci` in the harness environment, which never
inherits a PATH we set, so it fails whenever the shell default Node is below the
pinned 24.21.0. Commit freely; push by hand.

## What the latest session did

Five commits across three repos, every one gated by its repo's own hook
(frontend: `format:check && lint && npm test`, ~90s), so each landed with the
full suite green.

| Commit | Repo | Items |
|---|---|---|
| `f35567d` | backend | 104 |
| `07d3a56a` | frontend | 135 |
| `3f388b77` | frontend | 134 |
| `0ef7c287` | frontend | 126, 61 |
| `d0fee85` | ins-tests | the E2E that proves 126 end to end |

Plus, in this workspace repo: `openspec` REQ-DOCS-007 corrected and
SCN-DOCS-007-C added, with their coverage rows.

**Verification at the stop:** backend `mvn verify` green at surefire 545 /
failsafe 167. Frontend 3153 unit (up from 3106) + 474 FIT, `lint` and
`format:check` clean. Every assertion added or changed was proved by an
invert-red probe; the probes are named in each item's note.

### The errorCode thread, closed

`DEFRA/cdp-uploader` declares **six** rejection codes in
`src/server/common/constants/file-errors.js` — `FILE_VIRUS`, `FILE_EMPTY`,
`FILE_TOO_LARGE`, `FILE_INVALID_TYPE`, `FILE_UPLOAD_FAILED`,
`FILE_DOWNLOAD_FAILED` — and sends the code beside its prose message. The
review had assumed otherwise, which made three of its conclusions wrong. All
four follow-ons are now done:

- **#104** — `errorCode` crosses the boundary: `CdpScanResultFile` →
  `UploadedFile` → `UploadedFileDto`, so the reason reaches the document API.
  The rejected-callback fixture now carries what cdp-uploader actually sends.
- **#135** — all six codes mapped, each to a message true of it. A file holding
  a virus was being told "The file could not be uploaded. Try again." It is now
  told it contains a virus. `form/errors.test.js` asserts the map covers exactly
  the declared codes, so a code added without a message fails a test.
- **#126** — **owner decision: a tag per reachable reason.** "Virus found",
  "Upload failed", "Download failed", each with its own screen-reader
  announcement in en and cy; a reason the page has no wording for stays
  "Rejected" rather than being named wrongly. Only reachable reasons got tags —
  a size or type refusal is stopped before the claim, so no unexercisable
  branch was added. The row carries a tag key beside the scan status, so the
  polled client rewrites the words by reason while the status still drives what
  the row offers.
- **#134** — the claim contract (`services/document-uploads/claim-contract.js`)
  is now read by both the page's validation and the stand-in claim, so those two
  cannot drift. Proved by loosening the shared pattern: the stub's test *and*
  three existing page-level tests go red.

**#61** is closed too. The stand-in gained the two shapes the plans file named
as the blocker — a zero-byte file is refused `FILE_EMPTY`, and a submission with
no file part carries back no file entry rather than a synthesised one — and
`driveClaimThroughUploadService` now drives the claim leg with nothing stood in
for.

## State by repo

| Repo | Items | Done | Open | Merged | Won't Fix | Notes |
|---|---|---|---|---|---|---|
| `animals-backend` | 103 | 86 | 4 | 12 | 2 | the 4 open are all *Discuss* |
| `animals-frontend` | 135 | 112 | 3 | 15 + 2 auto | 3 | 1 commit unpushed |
| `ins-tests` | 20 | 11 | 4 | 4 | 1 | the 4 open are deferred — see below |
| `performance-tests` | 10 | 8 | 0 | 2 | 0 | complete |
| `workspace` | 37 | 30 | 0 | 6 | 1 | complete |

Open PRs: frontend #424, backend #114, ins-tests #49, performance-tests #24,
workspace #141.

## What is left, and why

Three frontend items and eight *Discuss* items. **None is blocked on effort.**

### frontend #133 — the stated means does not work

The crumb and concurrency token are posted to cdp-uploader and read back from
its status endpoint. Both remedies the item offers are blocked by the page's own
shape, and this was checked rather than assumed:

- The page has **one** form, because the add button reaches cdp-uploader by
  `formaction`. Continue needs the document fields (item #130: a part-filled
  document must not be discarded in silence) and Remove needs the crumb and
  token.
- An HTML control belongs to exactly one form, so the document fields cannot sit
  in both an add form and a page form.
- Moving the crumb out leaves Remove and Continue unprotected without
  JavaScript. Moving the document fields into an add-only form regresses #130
  for a no-JS user. Mirroring hidden copies between two forms needs JavaScript,
  which progressive enhancement forbids relying on. A header-borne crumb
  (hapi crumb's `restful` mode) is JS-only for the same reason.

So the real choice is: **accept the exposure and record why** (the crumb is
session-bound, the token is a staleness check and not an authorisation one, and
cdp-uploader is a DEFRA platform service inside the same trust boundary), **or
change the architecture** so the typed answers are held in this service's own
session keyed by `correlationId` instead of round-tripped through cdp-uploader —
which would mean only the file crosses, and is a design change well beyond a
review fix. Needs a decision.

### frontend #58 — reopened, and partly not ours

The 24h TTL covers the backend's own upload session. cdp-uploader's session
state and the orphaned S3 objects from abandoned uploads are not cleaned up, and
that cleanup belongs to cdp-uploader rather than to this repo. Worth raising
with the platform team rather than fixing here.

### frontend #125 — one half needs the owner

The in-repo half is done. `repos/trade-imports-performance-tests/src/config/traffic.js`
caps `DOCUMENT_CAP_KILOBYTES` at `10_000`, so the perf suite cannot reach the
50 MB path; raising it to `50_000` is **a load-test design decision** (50 MB
bodies across many VUs has real cost). Left deliberately.

`repos/trade-imports-ins-tests/resources/file-upload/constants.ts` also
hard-codes the figure and the oversize message. The honest fix is for those
specs to read it off `form[data-max-file-size]`, which makes the frontend the
owner across the repo boundary. **This is the one that will actually break if
the cap moves.**

### ins-tests #8, #16, #17, #20 — deferred for want of a stack run

All four restructure or delete e2e specs. CI proving a new shape green does not
prove it can fail, and the invert-red probe needs local execution. The local
stack exhausted the disk even after reclaiming 38GB.

- **#20's stated means is not implementable.** Moving `documents-reject`'s
  distinct assertion into `documents-limits` cannot work: that assertion is
  `'You have not added any documents yet.'` and a document is already in the
  table by the time the boundary test refuses one. The genuinely distinct
  scenario is a refusal on the *first* document with an empty table. Its Must is
  sound; its means is not.
- **#16 must not be done before #20** or the work may be thrown away.

### backend #7, #15, #19, #32 — all *Discuss*

- **#7** (`claimed` backfill) — reopened: dev and test environments do hold
  documents that read `claimed=false` and stop shipping. The mechanism is real;
  the question is whether those environments matter enough to migrate.
- **#15 and #19 conflict with each other and both need the frontend.** #15 wants
  the claim route under `/notifications/{ref}/`; #19 wants the verb out of the
  URL. Both change the route the frontend calls at
  `services/document-uploads/real.js:41`. **Decide the claim endpoint's shape
  once, across both repos.**
- **#32** (upload-session retention in configuration) — attempted and reverted:
  `@Indexed(expireAfter)` does not resolve property placeholders. Untried
  alternative is the SpEL form `#{@someConfigBean.retention()}`, which Spring
  Data does document for that attribute. `UploadSessionRepositoryIT`'s TTL
  assertion would prove whether it resolved or silently dropped the index.

## Merge order now matters

`d0fee85` in ins-tests expects "Virus found". That only holds with **both** the
backend `errorCode` change (`f35567d`) and the frontend tag change (`0ef7c287`)
deployed. Against a frontend without the backend change the tag reads
"Rejected" and that spec fails. Merge the backend first, or the set together.

## Defects the review actually found

Worth knowing which findings were real, because a re-review will meet the same
code and should not re-litigate these.

1. **A document row per page view.** Registering an upload wrote an
   `AccompanyingDocument`, and the page opens a session every render, so one
   notification held three documents for one real file. Found by the workspace
   E2E, not by any unit or integration test. Fixed by splitting
   `document_upload_sessions` from `accompanying_documents`.
2. **The scan callback would have gone nowhere in a deployment.** The frontend
   read `CDP_UPLOADER_CALLBACK_URL` straight off `process.env` with a localhost
   default, bypassing `src/config/config.js` and its strict startup validation.
   An unset variable meant the file scanned and the result went to its own
   container's loopback — document pending for good, nothing failing at startup.
3. **Three stub-fidelity gaps.** The cdp-uploader stub judged file type by a
   three-extension deny-list standing in for an eight-MIME allow-list; it had no
   `payload.maxBytes`, so hapi's 1 MB default refused every document over 1 MB
   and the 50 MB flow was never exercised; and the document-uploads stub keyed
   sessions on the correlation handle alone, so a handle registered against one
   notification resolved from any other.
4. **An empty file was accepted and stored.**
5. **A null attachment type was saved rather than refused.** The page resolves
   it from the extension while cdp-uploader judges the declared MIME type.
6. **Every rejected document was called a virus** — and then, after the first
   fix, every one was called merely "Rejected" while the reason sat unread on
   the wire. Now named per reason.
7. **A file holding a virus was invited to re-upload itself.** Three of six
   refusal codes were mapped; `FILE_VIRUS` fell through to the retry message.
8. **The stand-in claim validated nothing**, which is why the document-reference
   mismatch survived every suite.

## Patterns to re-check, because they recurred

- **Tests that cannot fail.** Seven so far: a fit oversize test whose
  `removeAttribute` never disarmed the browser check; k6 tests whose selection
  stub returned `undefined` for every attribute; service tests asserting the
  fallback values the code would use anyway; a two-tab test with byte-identical
  fixtures; and `real.test.js`'s "Should answer the status alone for a rejected
  upload", which passed only because `toEqual` ignores an undefined property.
  Any new assertion here deserves an invert-red probe before it is trusted.
  Note `toStrictEqual` does **not** help: it treats a key present-and-undefined
  as present. Assert the property.
- **Cross-repo string coupling.** A copy change in the frontend broke an
  ins-tests spec while unit, FIT and `tim spec lint` all passed — and it
  happened again this session with the scan tag. Nothing short of the E2E that
  runs the repos together could see it. If a fix changes a message, status code
  or response shape, grep the other repos.
- **The behaviour spec can encode a false premise.** REQ-DOCS-007 stated "the
  upload service reports a rejection as a message in its own wording and no
  code … and MUST NOT name a cause" as a requirement. It was a mistaken belief
  about an external service, written down as a rule. When a spec explains *why*
  a limitation exists, check the limitation.
- **Stale branch images.** An E2E can log `Tests image: branch (...)` and still
  run yesterday's bytes, because the tag is overwritten when the later build
  finishes. Compare the publish completion time with the stack's pull time.
- **`npm test` does not run FIT**, and `coverage.json` cites FIT specs as its
  witnesses. CI runs FIT, so the pipeline is the gate, but a local green means
  less than it looks. FIT locally:
  `PORT=3050 npm run test:fit -- --project=features` (~3m for `features`).

## Deliberately not done, with reasons

- **AC4 and the journey-adoption vector — no ticket, by owner decision.**
  Ownership is one concern, not per-journey: keeping private data such as
  documents from being reached or copied across owners is covered by the
  authentication and authorisation work. Recorded on EUDPA-296 as comments
  934984 and 934989, and in the plan's D9. Do not raise it again.
- **workspace #37 (FIT witnesses outside the default command) — Won't Fix.** CI
  runs FIT, so the pipeline covers the risk; the remedy would slow every local
  run to buy feedback CI already gives.
- **backend #27** (null guards on `ClaimUploadRequest`) — **adding the guard
  makes the API worse, and two existing tests prove it.** Jackson constructs the
  record before bean validation, so `requireNonNull` throws first and the 400
  loses its field-level errors. Reverted.
- **Hooks are out of bounds.** The owner is considering moving pre-commit hooks
  to pre-push but has not decided. No item's fix may touch a hook, its config,
  or what either runs.
- **The frontend lock file is never regenerated.** Standing instruction. Also
  `npm --prefix … ci` is not equivalent to an in-directory `npm ci`, so do not
  conclude anything about lock health from it.
- **AC2 and AC5 are stale, not unmet.** AC2 asks for the removal of
  `data-max-file-size`/`data-oversize-error`, which
  `client/oversize-validation/submit.js` still needs. AC5 names spec files that
  no longer exist.

## Three things found while remediating that no item covers

- **The recoverable-save banner is untrue on the claim path.**
  `shared/copy.en.js` says "Your answers on this page have been saved" where
  they were not, and the only working retry is a browser reload that nothing on
  the page suggests; pressing Continue instead carries the journey on with a
  claimed-but-unlisted document. This sits above item 115's literal Must, so it
  needs a decision.
- **Nothing validates the coverage `test` field** in `openspec/coverage/`. Two
  rows in `upload-documents/coverage.json` were stale — one naming a test that
  no longer existed, marked `full` — and `tim spec lint` passed throughout. Both
  are fixed; the gap in the tooling is not. Worth its own item.
- **~40 files hold a local copy of `getHandlerOf`**, now promoted to
  `engine/test-support.js`. Sweeping them is a separate chore, deliberately not
  folded into this ticket.

## Where to pick up

1. **Push the frontend and this workspace repo**, then watch the E2E — checking
   the resolved image tags against their publish times before believing a
   verdict, and remembering the merge order above.
2. **Decide #133** (the crumb boundary — the analysis is above and in the item),
   **#125**'s perf-suite ceiling, and whether **#58**'s cdp-uploader cleanup is
   a platform-team ask.
3. **Settle the backend's claim-endpoint shape once** (#15 vs #19), since both
   change the route the frontend calls.
4. **The four ins-tests items need one local stack run**, not more analysis.
5. **Batch any further commits.** The frontend's pre-commit hook runs the full
   3150-test suite (~90s), so group by file cluster rather than committing per
   item.

---

# Appendix: the animals-backend code-quality run

Written by the session that worked `animals-backend` before the errorCode
thread. Its 33 open items at that stop were all test-suite code quality —
comments, naming, structure, duplication, test readability — plus four coverage
gaps (`#56`, `#61`, `#83`, `#63`). They have since been worked down to the four
*Discuss* items listed above.

**Findings from that run worth keeping:**

- **The claim and the scan callback raced by design.** Both did an unguarded
  read-modify-write on one document. Two arrivals in one read window either
  collided on the unique `correlationId` index — the scan 500s and the document
  sticks at PENDING, so it never reaches the outbox — or lost a save to
  `@Version`. Both are now `@Transactional`.
- **Deleting an upload did not end its session.** `deleteByUploadId` removed the
  document and left the session, so a scan callback arriving seconds later
  resolved that session and rebuilt the document the trader had deleted.
- **`ServiceUnavailableException` had no production thrower anywhere** — every
  throw lived in the deleted `CdpUploaderClient` — while its type, its 502
  handler branch and two tests asserting its message all still stood.
- **The compound index did not cover the query that reads it.** The outbox
  filters on `claimed` and sorts by `created`; the index held neither, so Mongo
  filtered and sorted in memory on the submit path.
- **Checkstyle here is minimal** (`config/checkstyle/code-quality.xml` has no
  UnusedImports, no Javadoc and no line-length rules), so dead imports and
  missing Javadoc will never fail the build. Any item of that kind has to be
  found by reading, not by the gate.
- **`DocumentType` has 14 constants** and neither `ClaimUploadRequest` nor
  `DocumentController` behaves differently per constant, which is what makes
  replacing an `@EnumSource` walk with one representative type safe rather than
  a loss of coverage.

**Scope call worth knowing.** `#16`'s path-variable validation was applied
**only to the endpoints this change adds or rewrites** (register's `ref`,
session's `ref` and `correlation-id`, claim's `upload-id`), not the pre-existing
ones. Constraining those would turn a 404 into a 400 on surface this ticket
never touched.
