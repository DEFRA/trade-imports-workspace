# Accompanying documents: build handover (22 October 2026, re-analysed 26 October)

The accompanying documents theme is ready to build. Paste the block at the foot of this file into a fresh Claude Code
session opened at the workspace root.

- **Ticket:** [EUDPA-724](https://eaflood.atlassian.net/browse/EUDPA-724), a stub under epic EUDPA-328 (Catch up
  frontend with prototype), relates to EUDPA-691. Status In Dev since 26 October (see the prep section below). Filled in per domain once the loop drains.
- **Branch:** `feat/EUDPA-724-design-release-2-1-documents`, the same name in every repo the theme touches, **the
  workspace included** — its openspec changes go on that branch too, not on a `NO_JIRA` workspace branch as design
  snagging did. Cut from `main` in each repo.
- **Repos:** animals frontend, tests, workspace. The animals backend is no longer in the theme (see the re-analysis
  below). Plants has no documents page, so plants is not in this theme.
- **Rows:** 8, of which 5 are `todo`:
  - inc-031, Upload documents opens as soon as the origin is answered — now test-and-spec work only
  - inc-034, the page returns the trader to where they came from
  - inc-037, the document type list drops Health certificate (replaces inc-033)
  - inc-038, a document still being scanned no longer holds the trader (replaces inc-035)
  - inc-039, the spec states the file size and reference rules the service now applies (workspace only)

  and 3 are set aside: inc-033 and inc-035 `merged-into` the rows above, inc-036 `dropped`.

## What the 26 October re-analysis changed, and why

Three things moved under the theme between the 22 October split and now: Sam's 26 October ruling on Save and return,
the design snagging merge, and EUDPA-296, which rebuilt the document upload to post the file straight to the upload
service. Each row was re-read against `main` in the animals frontend, the animals backend, the tests repo and
`openspec/`.

- **inc-036 (files up to 50MB) is done, and the blocker is gone rather than lifted.** The frontend's limit is 50MB
  and the page says so. The browser now posts the file to `/upload-and-scan` on the frontend's own domain, and CDP's
  managed nginx gives that location `client_max_body_size 2304M` on every service, proxied straight to cdp-uploader.
  So the ~10 MB cap on normal routes never applies, no platform request is needed, and **EUDPA-518 is not on this
  path**. All four criteria are proved by tests already on `main`. Dropped, with the commit recorded.
- **Half of inc-033 is done.** EUDPA-296 replaced the old upload request with a claim, and both ends now accept
  `^[A-Za-z0-9 ./-]*$` up to a hundred characters, so `ITAHC-001` and `GB/HC 2026 01` go through. Only the document
  type list is left, as inc-037 — and because the backend keeps `HEALTH_CERTIFICATE` on purpose, the backend drops
  out of the theme altogether.
- **inc-035 split three ways.** Its scan half is inc-038. Its Save and return half is **no longer this theme's**:
  Sam, 26 October, ruled that Save and return to overview makes exactly the same checks as Save and continue on
  every page, replacing c-211 and c-313, with "No page is an exception. Upload documents follows the same rule" —
  built for every page as **inc-232 in `themes/design-snagging-followups`**, which carries this theme's documents
  criteria verbatim. Its remaining criterion was withdrawn: it asked Save and continue to save a typed-in document,
  which EUDPA-296 made impossible on purpose (a Save and continue post carries no file; the page refuses a typed-in
  document and asks for the add action, as openspec REQ-DOCS-016 now requires).
- **inc-031 is already true on main.** Every overview task row is linked from the moment a notification is started
  and none reads "Cannot start yet"; the only section gate is the review's. What is left is a test that opens the
  page with the origin and nothing else answered, and an openspec requirement — the spec says nothing today about
  when the page can be opened.
- **inc-034 lost two of its three pieces.** Save and continue already returns to the review page from a Change link,
  and the change context already survives Save and add another and Remove. The Back link is still hard-coded to the
  overview, and an amendment reached without `?change=1` still returns to the overview.
- **inc-039 is new**, raised by the re-analysis rather than by a source: the spec still states the limit as 10MB and
  says nothing about the reference's characters. Workspace only; the tests that prove it already exist.
- The theme envelope's Save-and-return invariant has been rewritten to the 26 October rule, `workspace` added to its
  repos (and to `build-args.json`), and `touches` brought up to date.

## Prep already done (26 October) — start at step 4

Steps 1 to 3 of the paste-in prompt are complete and pushed. A session picking this up goes straight to the
build launch. Nothing below needs repeating.

- **The backend is out of the data as well as the prose.** `backlog.json`'s envelope `repos` and
  `build-args.json` both listed `backend` while the re-analysis above said it had left the theme, which would
  have had the loop branch a fourth repo and open a carry-only draft PR for it. Dropped from both in
  `0ffcf51b`. inc-033 keeps `backend` in its own `repos`: the row is `merged-into` and its record stands.
  `themes/HOW-TO-BUILD.md`'s "Accompanying documents" section was pre-re-analysis on four points (5 rows with
  4 ready, inc-036 blocked on EUDPA-518, the backend in the branch set, the workspace on its own `NO_JIRA`
  branch) and is rewritten to match this file.
- **Branches:** `feat/EUDPA-724-design-release-2-1-documents` cut from current `origin/main` and pushed in the
  animals frontend, the tests repo and this workspace repo. The two service branches carry one empty
  `chore(EUDPA-724): open the documents theme branch` commit, as the design snagging branch did, because a
  pull request needs a commit. `tim workspace branch` reports exactly those two repos on the branch and every
  other on `main`.
- **Draft pull requests,** all titled "EUDPA-724: Design Release 2.1 accompanying documents", bodies saying
  the work is loop-built and not for merge until Sam's technical review:
  - [animals frontend #435](https://github.com/DEFRA/trade-imports-animals-frontend/pull/435)
  - [tests #58](https://github.com/DEFRA/trade-imports-ins-tests/pull/58)
  - [workspace #161](https://github.com/DEFRA/trade-imports-workspace/pull/161)
- **EUDPA-724 is In Dev** (theme-ticket START flow, run 26 October). On this board that status is reached by
  the transition named `In Progress`, not `In Dev` — `tim jira transition EUDPA-724 "In Dev"` resolves it.
  The description is deliberately untouched and still describes the pre-re-analysis theme; the WRITE flow
  rewrites it once the loop drains.
- **Stack:** a hand-started `trade-imports-mongodb-1` container had been up four days with no lease, which the
  loop treats as somebody else's and refuses. Taken down; `tim docker lease status` reports the stack down and
  unleased.
- **Checks:** `tim backlog check shared/design-release-2-1/themes/documents` passes (8 increments, 5 todo,
  2 merged-into, 1 dropped) and `tim backlog next` is inc-031.

**Known blocker, 26 October: the `Workflow` launch cannot be approved.** The prep above is finished, but the
build never started. Launching `workflow/increment-build-loop.js` raises a permission dialog that offers no way
to say yes — only a way to decline — so the run was rejected twice with identical args. What is established:

- `/config`'s **Dynamic workflow size** was already on throughout, and was never changed. It is not the cause,
  and raising it is not the fix.
- `Workflow` is in neither the `allow` nor the `deny` list of `.claude/settings.json`, so the project's
  permission file is not the cause either.
- The session that tried had been initialised with a workflow size guideline of *medium* ("keep workflows under
  15 agents") in its own system context, which does not agree with the `/config` value the user reports. That
  mismatch is the one hard datapoint; whether it is the cause is unknown.

Do not work round it. The loop's guard rails forbid building a row outside the loop, so hand-building inc-031
is not a fallback. Report the dialog as a harness problem, and launch from step 4 once it can be approved.

## What has to happen first — satisfied

Sam's design snagging branch is merged to `main` in all three repos
([animals frontend #421](https://github.com/DEFRA/trade-imports-animals-frontend/pull/421),
[plants frontend #113](https://github.com/DEFRA/trade-imports-plants-frontend/pull/113),
[tests #42](https://github.com/DEFRA/trade-imports-ins-tests/pull/42)), and design snagging inc-223, the documents
page tidy, is `done`. Journey foundation inc-001 and inc-002, which inc-034 waits on, are both `done`. Nothing
outside the theme holds the build up.

## Shared code, and the one clash to watch

- **This theme owns `features/documents`.** The design snagging rows still to come on the other machine
  (identification details, the review page, the declaration, the CPH number, a final tidy) do not touch it.
- **inc-034 extends the animals kit.** inc-218 put `runBackLink` in `shared/kit.js`; inc-034 extends it for the
  review and amend cases and must not write a second Back-target rule. `frontend:src/server/app/shared/kit.js` is
  now in the theme's `touches` because of it.
- **inc-038 and inc-232 both change what leaving Upload documents checks.** inc-038 changes the scan branch of
  `leavePage`, inc-232 the hub-exit branch, and inc-232 lives on another branch in another theme. Whichever lands
  second updates the other's tests, so Save and return inherits the same rule: a document still scanning holds
  neither button, a rejected one holds both. Say in the report which order it happened in.

````
Build the Design Release 2.1 accompanying documents theme end to end, on one branch, and stop before anything merges: Sam does a technical review first. Use the requirements-pipeline skill's BUILD phase (branch lifecycle) and the theme-ticket skill's START, WRITE and MERGE flows around it, as the design snagging theme did. Follow workareas/shared/design-release-2-1/themes/HOW-TO-BUILD.md ("Accompanying documents") and these steps in order.

1. Prepare the workspace
   - Pull the workspace repo on main, then cut feat/EUDPA-724-design-release-2-1-documents from it, push it, and stay on it. This theme's backlog, its tickets and every openspec change from this build go there. The workspace is one of the theme's build repos now, on the same branch name as the rest.
   - Backlog: workareas/shared/design-release-2-1/themes/documents/backlog.json (5 todo of 8). Run `tim backlog check shared/design-release-2-1/themes/documents` and `tim backlog next shared/design-release-2-1/themes/documents` (expect inc-031).
   - Read workareas/shared/design-release-2-1/PROGRAMME-NOTES.md if it exists, and LAYERS-PLAN.md.
   - Stack: `tim docker lease status`. Never break anyone else's lease; ask Sam if someone holds it.
   - Remind Sam to raise Dynamic workflow size in /config.

2. Branch and draft PRs
   - In each repo of the backlog's repos (animals frontend, tests, workspace): fetch, cut feat/EUDPA-724-design-release-2-1-documents from origin/main, push it, and open a draft PR against main titled "EUDPA-724: Design Release 2.1 accompanying documents". The body links the ticket and says "Built by the increment build loop. Not for merge until Sam's technical review."
   - `tim workspace branch feat/EUDPA-724-design-release-2-1-documents` so the checkouts match.

3. Start (theme-ticket START flow): "the build loop is starting on documents". EUDPA-724 → In Dev.

4. Build: one Workflow launch of the increment build loop by scriptPath (.claude/skills/requirements-pipeline/workflow/increment-build-loop.js), lifecycle branch, every Jira key null. The args are in workareas/shared/design-release-2-1/themes/documents/build-args.json: workarea shared/design-release-2-1/themes/documents · branch feat/EUDPA-724-design-release-2-1-documents · lifecycle branch · scope design-release-2-1-documents · executor claude · planOnly false · repos copied from `jq '.repos'` of this backlog (frontend, tests, workspace) · models {} · increments null · stopAfter "all" · requireApproval null · approvalWaitMinutes null · jiraProject/epic/jiraInDevStatus/jiraDoneStatus/jiraBoard null.
   - The loop pushes to the branch and never merges. On any stop, archive the run (`tim build runs archive <runId>`, then `report`), sweep for DEFERRED items (BUILD.md 3b), commit and push this backlog.json, and relaunch with the same args. Never stop the build for one row: on a stop caused by a refused command, a platform or access problem, or anything else outside the code, relaunch at once; if the same row stops twice, park it (BUILD.md 3d) and relaunch. Only a code defect that blocks every remaining row waits for Sam (ruling, 20 Oct).
   - inc-031 is test-and-spec work: the behaviour is already on main. Do not build a gate for it. Its row notes say what is left.
   - inc-034 extends runBackLink in the animals kit; it does not write a second Back-target rule.
   - inc-038 and inc-232 (themes/design-snagging-followups, another machine) both change what leaving Upload documents checks. Read inc-038's last note before building it, and say in the report which landed first.
   - inc-039 changes only openspec. Expect no service-repo change in it.

5. Business tickets (theme-ticket WRITE flow), once the loop drains: "write the business tickets for documents". The stub EUDPA-724 becomes the live animals ticket. Status In Dev. Every ticket must say the work is not merged yet.

6. Stop. Don't merge, un-draft or approve anything. Report to Sam: rows landed as N of 5 (P%), the PR links per repo, CI state, the ticket keys and scenario counts per domain, and anything parked or deferred, plus the run's five most expensive and five slowest stages. Then print the BUILD.md handover block.

7. After Sam merges this theme (theme-ticket MERGE flow): "documents has merged". Regenerate against main and move the tickets to Deskcheck.

Context: the theme's rows came from the Design Release 2.1 distil (workareas/shared/design-release-2-1/report.md); Sam's 9 October rulings accepted inc-031 to inc-035, and his 26 October ruling on Save and return (workareas/shared/design-release-2-1/sources/ruling-sam-2026-10-26.md) moved the Save and return work to inc-232 in themes/design-snagging-followups. inc-032 moved to design snagging inc-215 on 19 October. The 26 October re-analysis against main is summarised above and recorded in the rows' own notes.
````
