# Accompanying documents: build handover (22 October 2026)

The accompanying documents theme builds on a second machine while design snagging finishes here. Paste the block below
into a fresh Claude Code session on that machine, opened at the workspace root.

- **Ticket:** [EUDPA-724](https://eaflood.atlassian.net/browse/EUDPA-724), a stub under epic EUDPA-328 (Catch up
  frontend with prototype), relates to EUDPA-691. Status Ready for Dev. Filled in per domain once the loop drains.
- **Branch:** `feat/EUDPA-724-design-release-2-1-documents`, cut from `main` once design snagging has merged.
- **Repos:** animals frontend, animals backend, tests. Plants has no documents page, so plants is not in this theme.
- **Rows:** 5. 4 ready, 1 blocked:
  - inc-031, Upload documents opens as soon as the origin is answered (first)
  - inc-033, document references accept punctuation, and the type list drops Health certificate (backend too)
  - inc-034, the page returns the trader to where they came from
  - inc-035, Save and continue stops waiting for virus scans, and Save and return keeps a typed-in document
  - inc-036, files up to 50MB: **blocked** until CDP raises its request size limit (EUDPA-518). The loop skips it.
- **Workspace branch:** this machine works on a short workspace branch, `feat/NO_JIRA-design-release-2-1-documents`,
  as laptop B did for design snagging. It merges back into `feat/NO_JIRA-design-release-2-1` at the end.

## What has to happen first

Sam reviews and merges the design snagging branch, `feat/EUDPA-720-design-release-2-1-design-snagging`, to `main` in
three repos. The design snagging build stops after its Back links row, inc-218, lands. The documents build starts only
once all three pull requests are merged:

- [animals frontend #421](https://github.com/DEFRA/trade-imports-animals-frontend/pull/421)
- [plants frontend #113](https://github.com/DEFRA/trade-imports-plants-frontend/pull/113)
- [tests #42](https://github.com/DEFRA/trade-imports-ins-tests/pull/42)

## Shared code with the rest of design snagging

- **Design snagging rows still to come** after that merge, on the snagging side: identification details, the review
  page (check answers), the declaration, the CPH number, and a final tidy. They may touch shared code such as the kit,
  flow and copy. None of them touches `features/documents`, which this theme owns.
- **The documents page tidy, design snagging inc-223, edits `features/documents`.** It is ordered to land before the
  Back links row, so it should be on `main` with the merge. The prompt checks that.
- **inc-034 builds on inc-218's Back-link helper.** inc-218 puts `runBackLink` in the animals kit (`runBackTarget` is
  the same seam). inc-034 extends it for the review and amend cases. It must not write a second Back-target rule. The
  row's notes say so too.

````
Build the Design Release 2.1 accompanying documents theme end to end, on one branch, and stop before anything merges: Sam does a technical review first. Use the requirements-pipeline skill's BUILD phase (branch lifecycle) and the theme-ticket skill's START, WRITE and MERGE flows around it, as the design snagging theme did. Follow workareas/shared/design-release-2-1/themes/HOW-TO-BUILD.md ("Accompanying documents") and these steps in order.

0. Wait for design snagging
   - Don't start until Sam has merged the design snagging branch, feat/EUDPA-720-design-release-2-1-design-snagging, to main in the animals frontend, the plants frontend and the tests repo. Check all three are merged: `gh pr view 421 --repo DEFRA/trade-imports-animals-frontend --json state,mergedAt`, `gh pr view 113 --repo DEFRA/trade-imports-plants-frontend --json state,mergedAt` and `gh pr view 42 --repo DEFRA/trade-imports-ins-tests --json state,mergedAt`. If any is not MERGED, stop and tell Sam which.
   - Check design snagging inc-223, the documents page tidy, is done in workareas/shared/design-release-2-1/themes/design-snagging/backlog.json. It edits features/documents. If it is not done, stop and ask Sam: this theme owns that folder.

1. Prepare the workspace
   - Pull the workspace repo on feat/NO_JIRA-design-release-2-1. Then cut a short workspace branch from it, feat/NO_JIRA-design-release-2-1-documents, push it, and stay on it. This theme's backlog, its tickets and every openspec change from this build go there, never on feat/NO_JIRA-design-release-2-1 directly: the design snagging machine is still writing to that branch.
   - Before every launch and after every landed row: merge origin/feat/NO_JIRA-design-release-2-1 into the short branch (pull), commit this theme's backlog.json, then push.
   - Backlog: workareas/shared/design-release-2-1/themes/documents/backlog.json (4 todo, 1 blocked). Run `tim backlog check shared/design-release-2-1/themes/documents` and `tim backlog next shared/design-release-2-1/themes/documents` (expect inc-031, opening Upload documents once the origin is answered).
   - Read workareas/shared/design-release-2-1/PROGRAMME-NOTES.md if it exists, and LAYERS-PLAN.md.
   - Stack: `tim docker lease status`. Never break anyone else's lease; ask Sam if someone holds it.
   - Remind Sam to raise Dynamic workflow size in /config.

2. Branch and draft PRs
   - In each repo of the backlog's repos (animals frontend, animals backend, tests): fetch, cut feat/EUDPA-724-design-release-2-1-documents from origin/main, push it, and open a draft PR against main titled "EUDPA-724: Design Release 2.1 accompanying documents". The body links the ticket and says "Built by the increment build loop. Not for merge until Sam's technical review."
   - `tim workspace branch feat/EUDPA-724-design-release-2-1-documents` so the checkouts match.

3. Start (theme-ticket START flow): "the build loop is starting on documents". EUDPA-724 → In Dev.

4. Build: one Workflow launch of the increment build loop by scriptPath (.claude/skills/requirements-pipeline/workflow/increment-build-loop.js), lifecycle branch, every Jira key null. The args are in workareas/shared/design-release-2-1/themes/documents/build-args.json:
   workarea shared/design-release-2-1/themes/documents · branch feat/EUDPA-724-design-release-2-1-documents · lifecycle branch · scope design-release-2-1-documents · executor claude · planOnly false · repos copied from `jq '.repos'` of this backlog (frontend, backend, tests) · models {} · increments null · stopAfter "all" · requireApproval null · approvalWaitMinutes null · jiraProject/epic/jiraInDevStatus/jiraDoneStatus/jiraBoard null.
   - The loop pushes to the branch and never merges. On any stop, archive the run (`tim build runs archive <runId>`, then `report`), sweep for DEFERRED items (BUILD.md 3b), commit and push this backlog.json on the short workspace branch, and relaunch with the same args. Never stop the build for one row: on a stop caused by a refused command, a platform or access problem, or anything else outside the code, relaunch at once; if the same row stops twice, park it (BUILD.md 3d) and relaunch. Only a code defect that blocks every remaining row waits for Sam (ruling, 20 Oct).
   - inc-036 (files up to 50MB) stays blocked on CDP's request size limit (EUDPA-518). Don't build it or unblock it.
   - inc-034 (return to where the trader came from) builds on the runBackLink helper design snagging's Back links row, inc-218, put on main. It extends that helper; it does not write a second Back-target rule.
   - Design snagging rows still to come on the other machine may touch shared code: identification details, the review page (check answers), the declaration, the CPH number and a final tidy. This theme owns features/documents; those rows don't touch it. If a row here needs to change shared kit, flow or copy code, keep the change small and say so in the report, so Sam can watch for a clash.

5. Business tickets (theme-ticket WRITE flow), once the loop drains: "write the business tickets for documents". The stub EUDPA-724 becomes the live animals ticket. Status In Dev. Every ticket must say the work is not merged yet.

6. Hand back the workspace branch: commit and push this backlog.json, the tickets and any openspec changes on feat/NO_JIRA-design-release-2-1-documents, then merge it into feat/NO_JIRA-design-release-2-1 and push.

7. Stop. Don't merge, un-draft or approve anything. Report to Sam: rows landed as N of 4 (P%), with inc-036 named as blocked and kept out of the percentage, the PR links per repo, CI state, the ticket keys and scenario counts per domain, and anything parked or deferred, plus the run's five most expensive and five slowest stages. Then print the BUILD.md handover block.

8. After Sam merges this theme (theme-ticket MERGE flow): "documents has merged". Regenerate against main and move the tickets to Deskcheck.

Context: the theme's rows came from the Design Release 2.1 distil (workareas/shared/design-release-2-1/report.md); Sam's 9 October rulings accepted inc-031 to inc-035 and kept inc-036 blocked. inc-032 moved to design snagging inc-215 on 19 October. Design snagging's handover is workareas/shared/design-release-2-1/themes/design-snagging/HANDOVER.md.
````
