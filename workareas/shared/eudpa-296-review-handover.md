# EUDPA-296 review — where it got to

Handover for a re-review. Written 2026-10-22, **updated the same day** after a
session that drained the frontend from 65 open items to 2 part-done. The review
itself lives in `workareas/reviews/EUDPA-296/` (gitignored), so this file
carries what a later session needs and the item files carry the detail while
they survive.

The two part-done items are written up in `eudpa-296-remaining-plans.md`
beside this file, with what remains and why it was left rather than guessed at.
Read it before reopening either: several of the review's stated means turned
out not to work, and that is recorded there.

## A second reviewer, 23 Oct — six items reopened or raised

An external review of the PR set found four defects this review missed,
and outgrew the reasoning on two it had closed. All six are in the item
files:

| Item | Repo | What |
|---|---|---|
| **#130** | frontend | Continue discards a part-filled document in silence when no type is chosen — `startsADocument` gates on an offered type, so a typed reference, date and file are dropped by `leavePage` |
| **#131** | frontend | The add form is still live at capacity, so a 16th file uploads to S3 and is only refused on the return leg |
| **#132** | frontend | The browser oversize check binds to the form's `submit` with no `event.submitter` check, so an oversize file blocks Continue and Remove too |
| **#133** | frontend | The CSRF crumb and the concurrency token are posted to cdp-uploader and read back from its status endpoint |
| **#58** | frontend | **Reopened.** The Won't Fix reasoning covered the backend session's 24h TTL only; cdp-uploader's own session state and orphaned S3 objects are not cleaned up |
| **#7** | backend | **Reopened.** Closed on "the service is not live, so the population is empty" — dev and test environments do hold documents, and they read `claimed=false` and stop shipping |

Three of their points were already recorded and need no new item: the
empty-form retry after a successful claim (the banner defect noted
below), the claim's missing ownership check (backend #15/#19, *Discuss*),
and the size cap's other homes (#125). Two need a decision rather than
code — whether dropping "virus" from the rejected tag is agreed product
wording, and the merge order. One could not be checked from here: three
nginx differences from CDP (`proxy_request_buffering off`, `Host $host`
rather than `$http_host`, and added `X-Forwarded-*`/`X-Real-IP`) are
confirmed present in our config, but `cdp-nginx-upstreams` is not cloned
locally so the comparison is unverified. The buffering one matters most —
it changes exactly the large-upload behaviour this ticket exists to
change, so the local stack may not prove what it appears to.

## State by repo

| Repo | Items | Done | Open | Merged | Won't Fix | Notes |
|---|---|---|---|---|---|---|
| `animals-backend` | 103 | 85 | 4 | 12 | 2 | pushed; the 4 open are all *Discuss* |
| `animals-frontend` | 129 | 107 | 2 part-done | 15 + 2 auto | 3 | **8 commits unpushed** |
| `ins-tests` | 20 | 11 | 4 | 4 | 1 | the 4 open are deferred — see below |
| `performance-tests` | 10 | 8 | 0 | 2 | 0 | complete |
| `workspace` | 37 | 30 | 0 | 6 | 1 | complete |

All ten Criticals are closed, and **every functional item across every repo is
closed.** What is left is:

- **frontend 61** — two of its three spies are gone and the claim leg now runs
  through the real registration and lookup; the session read remains stood in
  for, because the stand-in service cannot produce two of cdp-uploader's file
  entries.
- **frontend 125** — the in-repo half is done; the figure also lives in
  `trade-imports-performance-tests` and `trade-imports-ins-tests`, and raising
  the perf suite's ceiling is a load-test design call.
- **8 *Discuss* items** (4 backend, 4 ins-tests) blocked on decisions or on a
  local stack run, not on effort.

Open PRs: frontend #424, backend #114, ins-tests #49, performance-tests #24,
workspace #141.

## What the latest session did

Eight commits, each gated by the pre-commit hook
(`format:check && lint && npm test`), so every one landed with the full suite
green — 3106 tests at the end, up from 3102:

| Commit | Repo | Items |
|---|---|---|
| `1338f02c` | frontend | 52, 53, 54, 56, 59, 60, 111 |
| `51917362` | workspace | the last part of backend 52 |
| `3bc55e20` | frontend | 62, 64, 65, 66, 67, 80, 82, 87, 112, 113 |
| `e5458fe6` | frontend | 71, 88, 89, 91, 92, 97, 100, 106, 107, 124 |
| `14843778` | frontend | 1, 3, 44, 101, 102, 104, 105, 123 |
| `4d6dcf95` | frontend | 114, 118, 120, 121, 122 |
| `b5e8c3e3` | frontend | 74, 75, 76 (+ 125 in-repo) |
| `1d59dcf3` | frontend | 129 |

Every assertion added or changed was proved by an invert-red probe, and the
documents FIT suite (39 tests) was run locally — so the stub and template
changes are verified, not assumed. The documents controller's statement
coverage went from 88.8% to 98.2% on the way, because item 129's two branches
had no test of any kind before.

Backend 52 is now **complete**: `CDP_UPLOADER_BASE_URL` is gone from
`docker/stack/backend.compose.yml`, where it bound to nothing once the
backend's uploader client went. That item's note in the backend file still
reads "one part outstanding" — the note is stale, the work is done.

Four items turned out to be **already fixed** by earlier commits on this
branch, because the review snapshot (10:19) predates them: frontend 78
(`fd744982`), 98 and 99 (`96403789`, `cc9d151a`), and 115 (`414f1dbd`, which
wrapped the claim path's append in `kit.recoverableSave` with a logged failure,
and recorded its own mutation probe in the commit message). **Do not re-raise
these.**

Two genuine defects were found while remediating, neither an open item:

- **A stale coverage link.**
  `openspec/coverage/live-animals/journey-pages/upload-documents/coverage.json`
  links `"file validation: an oversize file past the browser check is refused
  on receipt"` as `full` — a test that no longer exists. It proves no tool
  validates the coverage `test` field. Worth its own item.
- **The recoverable-save banner is untrue on the claim path.**
  `shared/copy.en.js` says "Your answers on this page have been saved" where
  they were not, and the only working retry is a browser reload that nothing
  on the page suggests; pressing Continue instead carries the journey on with a
  claimed-but-unlisted document. This sits above item 115's literal Must, so it
  needs a decision — see the plans file.

## Defects the review actually found

Worth knowing which findings were real, because a re-review will meet the same
code and should not re-litigate these.

1. **A document row per page view.** Registering an upload wrote an
   `AccompanyingDocument`, and the page opens a session every render, so one
   notification held three documents for one real file. Found by the workspace
   E2E, not by any unit or integration test. Fixed by splitting
   `document_upload_sessions` from `accompanying_documents`; a document is now
   written by whichever of the claim and the scan callback arrives first.
2. **The scan callback would have gone nowhere in a deployment.** The frontend
   read `CDP_UPLOADER_CALLBACK_URL` straight off `process.env` with a localhost
   default, bypassing `src/config/config.js` and its strict startup validation.
   cdp-uploader resolves that callback itself, so an unset variable meant the
   file scanned and the result went to its own container's loopback — document
   pending for good, nothing failing at startup.
3. **Three stub-fidelity gaps.** The cdp-uploader stub judged file type by a
   three-extension deny-list standing in for an eight-MIME allow-list (a GIF was
   taken in a stub run and refused for real); it had no `payload.maxBytes`, so
   hapi's 1 MB default refused every document over 1 MB and the 50 MB flow was
   never exercised in any stub or FIT run; and the document-uploads stub keyed
   sessions on the correlation handle alone, so a handle registered against one
   notification resolved from any other — the one rule that matters, since the
   handle arrives from the browser.
4. **An empty file was accepted and stored.** The refusal moved from code this
   repo owned to an assumption that cdp-uploader emits `FILE_EMPTY`.
5. **A null attachment type was saved rather than refused.** The page resolves
   it from the extension while cdp-uploader judges the declared MIME type, so a
   file with an accepted type and no extension satisfied the service and stored
   a null that later blocks the whole collection.
6. **Every rejected document was called a virus.** cdp-uploader reports a
   post-scan rejection as prose with no code, so the page could not know the
   cause and said "Virus found" regardless — including to a screen reader.

## Patterns to re-check, because they recurred

- **Tests that cannot fail.** Six so far, four of them mine: a fit oversize test
  whose `removeAttribute` never disarmed the browser check (it reads the limit
  once at module load); k6 tests whose selection stub returned `undefined` for
  every attribute; service tests asserting the fallback values the code would
  use anyway, so they passed whether configuration was read or ignored; a
  two-tab test with byte-identical fixtures for both tabs. Any new assertion
  here deserves an invert-red probe before it is trusted.
- **Cross-repo string coupling.** A copy change in the frontend broke an
  ins-tests spec while unit, FIT and `tim spec lint` all passed. Nothing short
  of the E2E that runs the repos together could see it. If a fix changes a
  message, status code or response shape, grep the other repos.
- **Stale branch images.** An E2E can log `Tests image: branch (...)` and still
  run yesterday's bytes, because the tag is overwritten when the later build
  finishes. Compare the publish completion time with the stack's pull time; the
  tag alone proves nothing.
- **`npm test` does not run FIT**, and `coverage.json` cites FIT specs as its
  witnesses. CI runs FIT, so the pipeline is the gate, but a local green means
  less than it looks.

## Deliberately not done, with reasons

- **ins-tests #8, #16, #17, #20 — deferred for want of a stack run.** All four
  restructure or delete e2e specs. CI proving a new shape green does not prove
  it can fail, and the invert-red probe needs local execution. The local stack
  exhausted the disk even after reclaiming 38GB.
  - **#20's stated means is not implementable**: moving `documents-reject`'s
    distinct assertion into `documents-limits` cannot work, because that
    assertion is `'You have not added any documents yet.'` and a document is
    already in the table by the time the boundary test refuses one. The
    genuinely distinct scenario is a refusal on the *first* document with an
    empty table. Its Must is still sound; its means is not.
  - **#16 must not be done before #20** or the work may be thrown away.
- **AC4 and the journey-adoption vector — no ticket, by owner decision.**
  Ownership is one concern, not per-journey: keeping private data such as
  documents from being reached or copied across owners is covered by the
  authentication and authorisation work. Recorded on EUDPA-296 as comments
  934984 and 934989, and in the plan's D9. Do not raise it again.
- **The `claimed` backfill — Won't Fix, no live data.** The mechanism is real
  (an absent boolean reads `false` and `OutboxService` filters `ClaimedIsTrue`)
  but the population does not exist. A field added to an outbox filter *after*
  launch will need its own backfill; that precedent is recorded in the backend's
  `design-notes.md` beside the `claimed` bullet.
- **workspace #37 (FIT witnesses outside the default command) — Won't Fix.** CI
  runs FIT, so the pipeline covers the risk; the remedy would slow every local
  run to buy feedback CI already gives. The three instances are kept in the item
  as evidence.
- **Hooks are out of bounds.** The owner is considering moving pre-commit hooks
  to pre-push but has not decided. No item's fix may touch a hook, its config,
  or what either runs.
- **AC2 and AC5 are stale, not unmet.** AC2 asks for the removal of
  `data-max-file-size`/`data-oversize-error`, which `client/oversize-validation/
  submit.js` still needs. AC5 names spec files that no longer exist. Do not
  treat either as a gap.

## What is unpushed

`animals-frontend` has 5 commits unpushed — `14843778`, `4d6dcf95`,
`b5e8c3e3`, `1d59dcf3` and whatever follows. Everything up to and including
`e5458fe6` is pushed, as is the workspace repo's `51917362`. The workspace repo
has the two `openspec/coverage/` row fixes and this handover unpushed.
`animals-backend`, `ins-tests` and `performance-tests` are all pushed.

The frontend's pre-push SonarCloud gate runs `npm ci`, which fails on a node
below the pinned 24.21.0 and blocks the push — nvm's default has been set to
24.21.0, but a session started before that still inherits the old PATH. Budget
for the gate: it runs `npm ci && npm test` then `sonar-scanner`.

## Where to pick up

1. **Push the frontend and the workspace**, then watch the E2E — checking the
   resolved image tags against their publish times before believing a verdict.
   This is the only thing standing between the review and a merge-ready PR set.
2. **Decide the two part-done items** (`eudpa-296-remaining-plans.md`): whether
   to teach the cdp-uploader stand-in the two file entries #61's last spy
   covers, and whether the perf suite's document ceiling should rise so it can
   reach the 50 MB path. Both are judgement calls, not outstanding work.
3. **Three things found while remediating that no item covers**, listed above:
   the recoverable-save banner that is untrue on the claim path, the
   `trade-imports-ins-tests` constants file that will break if the cap moves,
   and the fact that nothing validates the coverage `test` field.
4. **Batch any further commits.** The pre-commit hook runs the full 3100-test
   suite (~90s), so group by file cluster rather than committing per item.
   FIT is not in that suite but runs locally in ~40s:
   `PORT=3050 npm run test:fit -- --project=features`.

---

# Appendix: the animals-backend code-quality run

Written by the session that worked `animals-backend` after the handover above.
The repo split was: this session owned `animals-backend` alone; everything
else was the other session's. Nothing here was pushed.

## Commits (all unpushed)

| Commit | Items | What |
|---|---|---|
| `6c8ea09` | 5 | `docs/design-notes.md` — four statements that were untrue |
| `46c4d17` | 14 | the byte-proxy teardown's dead machinery |
| `577ea1d` | 12 | scan-result parsing bound through the request's own mapper |
| `b5ae6af` | 26 | the document records and service |

Baseline before any of it: `mvn verify` green at surefire 546 / failsafe 161.

## Defects, as opposed to tidying

- **The claim and the scan callback raced by design.** Both did an unguarded
  read-modify-write on one document. Two arrivals in one read window either
  collided on the unique `correlationId` index — the scan 500s and the
  document sticks at PENDING, so it never reaches the outbox — or lost a save
  to `@Version`. Both are now `@Transactional`, so the repo's existing
  commit-retrying transaction manager resolves it.
- **Deleting an upload did not end its session.** `deleteByUploadId` removed
  the document and left the session, so a scan callback arriving seconds later
  resolved that session and rebuilt the document the trader had deleted. The
  sibling delete path already cleared both.
- **`ServiceUnavailableException` had no production thrower anywhere** — every
  throw lived in the deleted `CdpUploaderClient` — while its type, its 502
  handler branch and two tests asserting `cdp-uploader returned an error
  response: HTTP 503` all still stood.
- **The compound index did not cover the query that reads it.** The outbox
  filters on `claimed` and sorts by `created`; the index held neither, so
  Mongo filtered and sorted in memory on the submit path.

## Won't Fix, with the evidence

- **`#27`** (null guards on `ClaimUploadRequest`) — **adding the guard makes
  the API worse, and two existing tests prove it.** I implemented the compact
  constructor the Must asked for; `DocumentControllerTest$Claim.shouldReturn400_whenDocumentTypeIsNull`
  and `...whenDateOfIssueIsNull` failed with `No value at JSON path
  $.errors.documentType`. Jackson constructs the record from the body *before*
  bean validation, so `requireNonNull` throws first and the 400 loses its
  field-level errors: a client is told nothing instead of being told which
  field. Reverted. `#28`'s per-component Javadoc was kept and is done.
- **`#7`** (no backfill for `claimed`) — closed on population, not analysis.
  The mechanism is real and was verified (absent boolean reads false,
  `OutboxService` filters `ClaimedIsTrue`, no migration tooling in the repo),
  but the service is not live so the population a backfill would touch is
  empty. The no-backfill precedent is recorded in `design-notes.md` so the
  absence of a migration reads as a fact about the moment, not a rule.
  Carried separately as `#103`, which is done.

## Left because it needs a decision

- **`#32`** (upload-session retention in configuration) — **attempted and
  reverted.** `document.upload-session.retention` in `application.yml` plus
  `@Indexed(expireAfter = "${...}")` made the whole Spring context fail to
  start, every IT with it: `'${document.upload-session.retention}' is not a
  valid duration — cannot detect any known style`. `@Indexed(expireAfter)`
  does **not** resolve property placeholders; the index resolver parses the
  attribute as a Duration literal. Reverted to a constant, renamed
  `SESSION_RETENTION_PERIOD` per `#31` (done) with the 24h reason in
  `design-notes.md`. Untried alternative: the SpEL form
  `#{@someConfigBean.retention()}`, which Spring Data does document for this
  attribute. `UploadSessionRepositoryIT.created_shouldCarryATtlIndex_...`
  (added in `b5ae6af`) asserts the resolved `expireAfterSeconds`, so it would
  prove whether the SpEL resolved rather than silently dropping the index.
- **`#15` and `#19` conflict with each other, and both need the frontend.**
  `#15` wants the claim route moved under `/notifications/{ref}/` for the
  parent-reference join; `#19` wants `PUT /document-uploads/{id}/document` to
  get the verb out of the URL. Both change the route the frontend calls at
  `services/document-uploads/real.js:41`. They cannot both be applied and
  neither can be applied from this repo alone. **Decide the claim endpoint's
  shape once, across both repos.**
- **`#13`** (document-reference rule) — needs the frontend *and* product
  input. The backend enforces `@Size(max = 100)` and
  `@Pattern("^[a-zA-Z0-9]*$")`; the page enforces only `maxText(..., 58)` with
  no character rule. So `AWB-2026-0001` passes the page and is 400'd by the
  claim endpoint, and the two maximums disagree, making the backend bound
  unreachable. The item itself asks to agree the real character set with the
  business, since hyphens and slashes appear in ITAHC and waybill references —
  widening the pattern without that just moves the guess.

## Outstanding in another repo

`docker/stack/backend.compose.yml:19` in `trade-imports-workspace` still sets
`CDP_UPLOADER_BASE_URL` on the backend service, which now binds to nothing.
It is the last part of `#52`; the in-repo half is done. Not actioned because
that file was outside this session's scope.

## Scope call worth knowing

`#16`'s path-variable validation was applied **only to the endpoints this
change adds or rewrites** (register's `ref`, session's `ref` and
`correlation-id`, claim's `upload-id`), not the pre-existing ones.
Constraining those would turn a 404 into a 400 on surface this ticket never
touched. The item's own scope names the same four.

## Stop point and what remains (animals-backend)

Stopped mid-run so the branch could be pushed with a clean tree. **Nothing
was left uncommitted.**

**Counts at the stop:** Done 52 · open 33 · Merged 12 · Won't Fix 2 ·
Discuss 4 · total 103. Every completed item carries its commit hash in the
item note, so the record stands without this session.

**Reverted, deliberately.** A fixer was part-way through the unit-test group
when the stop came. Four files were discarded rather than committed:
`UploadSessionFixtures.java` (new), and `DocumentControllerTest.java`,
`DocumentControllerTrailingSlashTest.java`, `DocumentServiceTest.java`
(modified). None of it had been mutation-probed and no build had been run
over it, so it was not safe to commit; a part-finished extraction costs
nothing to lose and a red gate costs more.

**How far that work had got, if someone restarts it.** Group B (`#50`, `#51`,
`#53`, `#73`–`#90`) was never opened. In Group A: `#55`, `#57`, `#58`, `#59`
and `#62` had been done but unverified; `#56` had two new over-cap tests
added but unprobed; `#60` had the fixtures extraction started; `#64` and
`#94`/`#65` were part-done. **Treat all of it as not done** — it is gone from
the tree.

**Two findings from that work worth keeping:**
- Checkstyle here is minimal (`config/checkstyle/code-quality.xml` has no
  UnusedImports, no Javadoc and no line-length rules), so dead imports and
  missing Javadoc will never fail the build. Any item of that kind has to be
  found by reading, not by the gate.
- `DocumentType` has 14 constants and neither `ClaimUploadRequest` nor
  `DocumentController` behaves differently per constant, which is what makes
  `#55`'s replacement of the `@EnumSource` walk with one representative type
  safe rather than a loss of coverage.

**The 33 open items are all test-suite code quality** — comments, naming,
structure, duplication, test-readability — plus four coverage gaps (`#56`,
`#61`, `#83`, and `#63`). Before writing anything for `#83` (two open
sessions on one notification), check `UploadSessionRepositoryIT` from
`b5ae6af`: it may already cover it.

**Record-keeping note.** Items were marked as they were completed, with the
commit hash in each note, so `review-items.sh` is trustworthy here. An
earlier version of this appendix was committed as `6418b937` on the workspace
branch before the no-commit preference was known; this section was appended
to the working file only.
