# EUDPA-296 review — where it got to

Handover for a re-review. Written 2026-10-22, **last updated 2026-10-23** after
a session that closed the errorCode thread (backend #104, frontend #135, #134,
#126) and #61, pushed every repo, and drove all five PRs to green. The review
itself lives in `workareas/reviews/EUDPA-296/` (gitignored), so this file carries
what a later session needs and the item files carry the detail while they
survive.

## Read this first

**One Critical is open: #136**, raised 23 Oct. The original ten are all closed —
#126 was reopened as Critical that day because the premise it had been closed on
was false, and is now Done on evidence with the owner's wording decision
recorded below. #136 is new, found while remediating rather than by the review's
own pass, and is the only user-facing defect left.

The PASS comments posted on the five PRs are **stale and now wrong** — they state
Critical 0 open. Re-post them once #136 and #58 land:
`share-review.sh EUDPA-296 --comment-only --summary` regenerates them from the
item files.

**Everything is pushed and every PR check is green.** Nothing is waiting on a
hand-push.

**The scope is now closed: two items left, both in the frontend.** The owner
reviewed the remaining eleven on 23 Oct against one test — is it functional —
and ruled that only the two that are get done:

| Item | Repo | What | Why it is in scope |
|---|---|---|---|
| **#136** | frontend | **Critical, new.** A claimed document can be left off the notification while the page says the answers were saved, and Continue carries the journey on without it | a false statement to the trader and the two repos disagreeing about the notification |
| **#58** | frontend | A session and a backend registration minted on every render, including each no-JS refresh tick, leaving orphaned cdp-uploader sessions and unreferenced S3 objects | a real resource leak |

**Everything else is Won't Fix**, each with its evidence kept in the item so a
re-review does not reopen it: frontend #133 and #125; backend #7, #15, #19 and
#32; ins-tests #8, #16, #17 and #20. The reasoning is per-item below under
"Closed by owner decision". Do not re-raise them.

**The pre-push SonarCloud hook does not fire.** It did not run on any of the
eight pushes this session — a push that should take minutes (`npm ci && npm test
&& sonar-scanner`) returned in seconds. The earlier theory in this file, that
the harness environment's Node is below the pinned 24.21.0 and `npm ci` fails,
does not fit: a failing gate would have *blocked* the push. The hook is not
being invoked at all. Worth checking the `PreToolUse(Bash)` matcher in
`.claude/settings.json`; it is not protecting pushes today. **Until it is, run
the gate by hand** — see "Running the Sonar gates by hand" below.

## What the latest session did

Eight commits across four repos, every one gated by its repo's own hook
(frontend: `format:check && lint && npm test`, ~90s), so each landed with the
full suite green.

| Commit | Repo | Items |
|---|---|---|
| `f35567d` | backend | 104 |
| `07d3a56a` | frontend | 135 |
| `3f388b77` | frontend | 134 |
| `0ef7c287` | frontend | 126, 61 |
| `d0fee85` | ins-tests | the E2E that proves 126 end to end |
| `6ee6ece` | ins-tests | the E2E that #131's fix had made stale |
| `df98f08` | ins-tests | merge of `origin/main` — the branch was 10 behind |
| `92f6f315` | workspace | merge of `origin/main` — the branch was 14 behind |

Plus, in this workspace repo: `openspec` REQ-DOCS-007 corrected and
SCN-DOCS-007-C added, with their coverage rows.

**Verification at the stop:** backend `mvn verify` green at surefire 545 /
failsafe 167. Frontend 3153 unit (up from 3106) + 474 FIT, `lint` and
`format:check` clean. Every assertion added or changed was proved by an
invert-red probe; the probes are named in each item's note. Both SonarCloud
quality gates run by hand and **passed**. All five PRs green, the E2E included,
on `workflow_run`-triggered runs that wrote their checks back properly.

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
| `animals-backend` | 103 | 86 | 0 | 12 | 6 | complete |
| `animals-frontend` | 136 | 112 | **2** | 15 + 2 auto | 5 | #136 and #58 — the only work left on the ticket |
| `ins-tests` | 20 | 11 | 0 | 4 | 5 | complete |
| `performance-tests` | 10 | 8 | 0 | 2 | 0 | complete |
| `workspace` | 37 | 30 | 0 | 6 | 1 | complete |

`review-items.sh` is trustworthy here: every item carries its disposition and,
where it was done, its commit hash.

Open PRs, **all green at the stop**: frontend #424, backend #114, ins-tests #49,
performance-tests #24, workspace #141.

| PR | Checks |
|---|---|
| frontend #424 | E2E, FIT, Lighthouse, SonarCloud, PR checks, Security audit, 3 publish jobs |
| backend #114 | E2E, SonarCloud, CDP coverage scan, PR checks, 3 publish jobs |
| ins-tests #49 | E2E, PR checks, Security audit, 3 publish jobs |
| workspace #141 | build, 3 e2e shards, smoke, merge-reports, deploy-report |
| performance-tests #24 | lint/unit, LocalStack image run, Security audit, smoke |

## Running the Sonar gates by hand

Needed while the pre-push hook is not firing. Coverage must be fresh first —
the frontend's `npm test` writes `coverage/lcov.info`, and `sonar-scanner` only
reads it, so run the suite before the scanner or it measures stale coverage.

```bash
# frontend, PR-scoped (--json gets the PR number: gh pr view <branch> --repo ... )
sonar-scanner "-Dsonar.token=$SONAR_TOKEN" \
  -Dsonar.host.url=https://sonarcloud.io -Dsonar.organization=defra \
  -Dsonar.projectKey=DEFRA_trade-imports-animals-frontend \
  -Dsonar.qualitygate.wait=true \
  -Dsonar.pullrequest.key=424 \
  -Dsonar.pullrequest.branch=feat/EUDPA-296-direct-to-uploader-upload \
  -Dsonar.pullrequest.base=main

# backend — one reactor build; needs Docker for the Testcontainers ITs
mvn -q clean verify sonar:sonar "-Dsonar.token=$SONAR_TOKEN" \
  -Dsonar.host.url=https://sonarcloud.io -Dsonar.organization=defra \
  -Dsonar.projectKey=DEFRA_trade-imports-animals-backend \
  -Dsonar.qualitygate.wait=true -Dsonar.pullrequest.key=114 \
  -Dsonar.pullrequest.branch=feat/EUDPA-296-direct-to-uploader-upload \
  -Dsonar.pullrequest.base=main
```

`-q` hides the scanner's own `QUALITY GATE STATUS` line, so judge the Maven run
by its exit code — `-Dsonar.qualitygate.wait=true` fails the build on a red
gate — or read the PR's SonarCloud check. Only `animals-frontend` and
`animals-backend` carry `sonar-project.properties`; `ins-tests`,
`performance-tests` and this repo have no gate to run.

## What is left, and why

Two items, both in `animals-frontend`. Nothing else is in scope.

### frontend #136 — a claimed document can go missing while the page says it saved

**Critical, and the only user-facing defect left.** Raised 23 Oct on the owner's
instruction; it was found while remediating and had no item of its own.

`claimReturnedUpload` wraps the append in `kit.recoverableSave`. When the claim
has already succeeded and `state.appendEntry` then fails, the failure branch logs
*"Took on the returned upload but could not save the document"* and returns
`renderTakeOnFailure(request, h, pageState, EMPTY_FORM)`. Three things follow:

- the backend holds the document with `claimed=true`, so `OutboxService` will
  submit it;
- the notification does not list it, because the append is what would have added
  it;
- `layout.njk` renders "Sorry, there is a problem with the service. **Your
  answers on this page have been saved.** Try again in a few minutes." — untrue
  on this path, and `EMPTY_FORM` means the typed answers are not even
  redisplayed. The only working retry is a browser reload, which nothing on the
  page suggests.

And `leavePage` gates only on `isStillSettling(pageState.documents)`. The
document is absent from that collection, so **nothing holds Continue back** and
the trader proceeds with a claimed-but-unlisted document. The two repos then
disagree about what the notification contains.

This sits above item #115, whose Must was satisfied by wrapping the append in
`recoverableSave` with a logged failure — that made the failure visible to
support but left the trader misinformed and the journey continuable.

### frontend #58 — the resource leak, scoped to the half we own

Every render of the page mints an upload session and registers a backend record
that nothing removes. `get` calls `addFormTarget`, the refusal path calls it
again, and so does `finishTheDocument`; each runs
`handlers/open-upload-session.js`, which POSTs cdp-uploader `/initiate` and then
creates a PENDING record keyed on a correlation id the browser will never return
with. The no-JS refresh link re-GETs the page on every tick while a scan
settles, up to `MAX_POLL_ATTEMPTS`, so one document's scan leaves a run of
orphan registrations and unreferenced S3 objects behind.

**In scope:** reuse the session already open for the page view. Reuse must not
let two concurrent adds share one correlation handle — the handle is what scopes
an upload to a notification, and that scoping is the one rule that matters
because the handle arrives from the browser.

**Out of scope:** cdp-uploader's own session state and the objects from
abandoned uploads. The backend's 24h TTL covers only its own session, and we
cannot reach cdp-uploader's storage keys for an upload that was never claimed.
If it matters, it is an ask to the platform team, not work in this repo.

## Closed by owner decision — do not re-raise

Ruled out on 23 Oct against one test: is it functional. Each item keeps its full
evidence so a re-review meets the reasoning rather than the smell.

| Item | Repo | Why not |
|---|---|---|
| #133 | frontend | Security hygiene, not a defect. Bounded exposure — session-bound crumb, staleness token, cdp-uploader inside the same trust boundary. Both stated remedies are blocked by the page having one form; the proper fix (hold typed answers in our own session keyed by `correlationId`) is a design change for its own ticket. |
| #125 | frontend | Test reach and test brittleness, not a product defect. The in-repo half is done. |
| #7 | backend | **We do not care about the pre-existing documents in the test environments.** The mechanism is real — `private boolean claimed = false` is a primitive, so a document written before the field existed reads `false`, and the outbox filters `ClaimedIsTrue`, so it never ships. Production population is empty while the service is not live. |
| #15 / #19 | backend | API shape, and they contradict each other — #15 wants the route under `/notifications/{ref}/`, #19 wants the verb out of the URL. The route works. One cross-repo decision if ever revisited, not two review items. |
| #32 | backend | Configurability, not behaviour. The 24h TTL works. Attempted and reverted: `@Indexed(expireAfter)` does not resolve property placeholders and broke the whole Spring context. |
| #8, #16, #17, #20 | ins-tests | Test structure. The suite is green and proves what it claims. #20's stated means is additionally not implementable — see its note. |

Two findings recorded earlier also stay unactioned, both non-functional: nothing
validates the coverage `test` field in `openspec/coverage/` (a tooling gap — a
row can cite a deleted test and still read `full`), and ~40 files hold a local
copy of `getHandlerOf` now promoted to `engine/test-support.js` (a chore).

## Merge order matters, and the E2E now proves why

Two ins-tests specs only pass with their service counterparts deployed:

- `d0fee85` expects "Virus found", which needs **both** the backend `errorCode`
  change (`f35567d`) and the frontend tag change (`0ef7c287`). Against a frontend
  without the backend change the tag reads "Rejected".
- `6ee6ece` expects the add control to be shut at the document cap, which needs
  the frontend's #131 fix (`f6cb7ee4`).

**Merge the backend first, or the whole set together.** Merging ins-tests ahead
of the services turns both specs red on `main`.

`documents-scan-lifecycle` passing in the green runs is the only evidence that
the refusal reason survives the whole path — cdp-uploader's own scan of a real
EICAR file, the callback, the stored document, the document API and the page.
Unit and FIT both run against stand-ins, so neither can prove it.

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
9. **A sixteenth document was scanned and stored before the claim refused it.**
   The add control stayed live at the fifteen-document cap, so a trader's file
   went to S3 to be turned away on the return leg: a wasted upload and an object
   nothing references. Fixed in `f6cb7ee4`; the ins-tests spec that still drove
   the old behaviour was fixed in `6ee6ece`.

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
- **Cross-repo behaviour coupling, not just strings.** A copy change in the
  frontend broke an ins-tests spec while unit, FIT and `tim spec lint` all
  passed. It happened three times on this ticket: the "Save and add another"
  rename, the per-reason scan tag, and #131 closing the add control at the
  document cap — that last one is not a string at all, it is a control becoming
  `aria-disabled`, and the spec sat clicking it for two minutes. Nothing short
  of the E2E that runs the repos together could see any of them. **If a fix
  changes a message, a status code, a response shape, or whether a control is
  operable, grep the ins-tests repo before you push.**
- **A branch that has fallen behind `main` fails the E2E for reasons that are
  nothing to do with your change.** `address-book-delete` failed on four
  consecutive runs of this branch while every other branch passed, because
  ins-tests was 10 commits behind and carried pre-EUDPA-708 specs against an
  `ins-frontend:latest` that had shipped the delete page. The workspace repo was
  14 behind for the same reason. **Check before trusting an E2E verdict:**
  `git -C <repo> rev-list --left-right --count origin/main...HEAD` — the left
  number is how far behind you are. Merge `main` in rather than diagnosing the
  symptom. Note `git diff origin/main...HEAD` (three dots) hides this: it
  compares against the merge base, so files main has moved on show no
  difference. Use `HEAD..origin/main` to see what you are missing.
- **The behaviour spec can encode a false premise.** REQ-DOCS-007 stated "the
  upload service reports a rejection as a message in its own wording and no
  code … and MUST NOT name a cause" as a requirement. It was a mistaken belief
  about an external service, written down as a rule. When a spec explains *why*
  a limitation exists, check the limitation.
- **Stale branch images.** An E2E can log `Tests image: branch (...)` and still
  run yesterday's bytes, because the tag is overwritten when the later build
  finishes. Compare the publish completion time with the stack's pull time.
- **Do not re-trigger an E2E with `workflow_dispatch`. Wait, or re-run the
  publish.** Learned the hard way this session, at the cost of two wasted stack
  runs:
  - `e2e-tests.yml` declares `concurrency: group: e2e-${branch}` with
    `cancel-in-progress: true`, scoped per repo. A manual dispatch therefore
    **cancels the legitimate `workflow_run` cascade** that the publish had
    already started — the very run that was about to refresh the PR check.
  - `pending-status` and `report-status` are gated on
    `github.event.workflow_run.event == 'pull_request'`, so a dispatched run
    never writes its result back. The tests pass and the PR still shows the old
    failure.
  - A manual dispatch **on this workspace repo** also sets `MANUAL=true` in
    `scripts/ci/resolve-scope.sh`, which then reads the `suites`/`tags` inputs
    instead of `config/e2e-tests-pr-scope.json`. Dispatch with neither and
    `Resolve test scope` fails in every shard before a test runs.
  - **The right move:** let the push's own cascade finish. If a check really is
    stale, `gh run rerun <publish-run-id>` on *Publish Branch Image* — it keeps
    the original `pull_request` event, so the cascade fires with full context and
    `report-status` updates the check. Verified on one repo before the other two.
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

Nothing is waiting on a decision any more. Two items of code, then merge.

1. **#136** — the claimed-but-unlisted document and the untrue banner. Critical
   and user-facing; do this first. Both halves matter: say something true on
   that path, and stop Continue proceeding past a claimed upload the collection
   does not hold.
2. **#58** — reuse the session already open for the page view, so a scan does
   not leave a run of orphan registrations behind. Keep the correlation handle
   per-add.
3. **Re-post the PR summaries** once both land:
   `share-review.sh EUDPA-296 --comment-only --summary`. They currently state
   Critical 0 open, which #136 makes false.
4. **Merge in the order above**, or the set together.

Both are in `animals-frontend` and both touch the documents controller, so they
batch into one commit cluster — the pre-commit hook runs the full suite, so that
is the cheaper shape.

Before a re-review, a short re-verification, in this order — it is cheaper than
diagnosing a red E2E backwards:

1. `git -C <repo> rev-list --left-right --count origin/main...HEAD` in all five
   repos. Anything behind gets `main` merged in first.
2. The frontend's `npm test` and `PORT=3050 npm run test:fit -- --project=features`.
3. The two Sonar gates by hand (see above), while the pre-push hook is dead.
4. Let the push's own E2E cascade run. Do not dispatch it.

Batch any further commits: the frontend's pre-commit hook runs the full
3150-test suite (~90s), so group by file cluster rather than committing per item.

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
