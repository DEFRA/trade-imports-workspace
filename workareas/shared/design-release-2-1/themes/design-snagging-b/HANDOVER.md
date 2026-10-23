# Design snagging B: laptop B build handover (22 October 2026)

Laptop B builds the last five design snagging rows, so laptop A can finish the documents-first rows and stop for
Sam's review.

- **Laptop A** builds inc-213 (consignment addresses), inc-223 (the upload documents tidy) and inc-218 (Back links) on
  `feat/EUDPA-720-design-release-2-1-design-snagging`, then stops. Sam reviews and merges that branch: animals frontend
  #421, plants frontend #113, tests #42.
- **Laptop B** builds the five rows below on `feat/EUDPA-720-design-release-2-1-design-snagging-b`. After Sam merges
  laptop A's branch, this branch becomes the pull request for the rest of design snagging: animals frontend #423, plants
  frontend #114, tests #47 (draft).
- The five rows moved here on 22 October with `tim backlog split --rows --to design-snagging-b`. Each was held for
  Sam's review in laptop A's backlog. The hold is lifted here: each row is todo, and its note says why it moved.
- On 21 October this theme's earlier rows went back to laptop A, after laptop B timed out on inc-210. That attempt
  landed nothing.

Rows, in build order:

| Row | What | Waits for | Merges in first |
|---|---|---|---|
| inc-217 | Declaration and Notification submitted pages | nothing | laptop A's branch, in all three repos |
| inc-214 | Identification details | nothing | |
| inc-216 | Check your answers: no red bar on a missing answer | nothing | |
| inc-219 | CPH number | nothing | |
| inc-221 | Final tidy | inc-214, inc-216, inc-217, inc-219 here; inc-213, inc-223, inc-218 on laptop A | laptop A's branch `origin/feat/EUDPA-720-design-release-2-1-design-snagging`, in all three repos (frontend, plantsfrontend, tests); nothing is merged to main yet |

- inc-217 goes first because it touches all three repos, so one merge brings laptop A's work into each.
- inc-221 waits until laptop A's three rows are done. It merges laptop A's branch
  `origin/feat/EUDPA-720-design-release-2-1-design-snagging` into all three repos, so it builds on laptop A's finished work. Nothing is merged to main yet.
- inc-221's last note names a patch to apply. It is in laptop A's workarea:
  `../design-snagging/leftovers/2026-10-22-plants-party-edit.patch`.

Paste the block below into a fresh Claude Code session on laptop B, opened at the workspace root.

````
Build the Design Release 2.1 design snagging B rows end to end, on one branch, and stop before anything merges: Sam does a technical review first. Use the requirements-pipeline skill's BUILD phase (branch lifecycle). Follow workareas/shared/design-release-2-1/themes/HOW-TO-BUILD.md ("Design snagging B") and these steps in order.

0. Prepare
   - Pull the workspace repo on feat/NO_JIRA-design-release-2-1. Then reset the short workspace branch feat/NO_JIRA-design-release-2-1-snagging-b to it (or delete and recreate it from it), and stay on it: this backlog and every openspec change from this build go there, never on feat/NO_JIRA-design-release-2-1 directly. Its old commit 0522a447 only records yesterday's failed attempt, so it is safe to drop.
   - Discard any leftover local stashes or patches from yesterday's failed inc-210 attempt, in the workspace and in the three service repos. Nothing from it is needed.
   - Backlog: workareas/shared/design-release-2-1/themes/design-snagging-b/backlog.json (5 todo). Run `tim backlog check shared/design-release-2-1/themes/design-snagging-b` and `tim backlog next shared/design-release-2-1/themes/design-snagging-b` (expect inc-217, the declaration and Notification submitted pages).
   - Rows in order: inc-217 (declaration and Notification submitted), inc-214 (identification details), inc-216 (check your answers without the red bar), inc-219 (CPH number), inc-221 (final tidy; waits for the other four and for laptop A's inc-213, inc-223 and inc-218).
   - Read workareas/shared/design-release-2-1/PROGRAMME-NOTES.md if it exists, and LAYERS-PLAN.md.
   - Stack: `tim docker lease status`. Never break anyone else's lease; ask Sam if someone holds it.
   - Remind Sam to raise Dynamic workflow size in /config.

1. Branch and draft PRs
   - `tim workspace branch feat/EUDPA-720-design-release-2-1-design-snagging-b` so the animals frontend, plants frontend and tests checkouts are on it. Pull each from origin.
   - Check the draft PRs against main are still open: animals frontend #423, plants frontend #114, ins-tests #47 (`tim github prs EUDPA-720`). If a branch or PR is missing, stop and tell Sam which: don't cut it from main.
   - The branch was cut from laptop A's branch after inc-204 and is far behind it. The first row, inc-217, merges origin/feat/EUDPA-720-design-release-2-1-design-snagging into all three repos before it builds (its `merge` field).

2. Build: one Workflow launch of the increment build loop by scriptPath (.claude/skills/requirements-pipeline/workflow/increment-build-loop.js, never by name), lifecycle branch, every Jira key null:
   workarea shared/design-release-2-1/themes/design-snagging-b · branch feat/EUDPA-720-design-release-2-1-design-snagging-b · lifecycle branch · scope design-release-2-1-design-snagging · executor claude · planOnly false · repos copied from `jq '.repos'` of this backlog (frontend, plantsfrontend, tests) · models {} · increments null · stopAfter "all" · requireApproval null · approvalWaitMinutes null · jiraProject/epic/jiraInDevStatus/jiraDoneStatus/jiraBoard null.
   - Check the merge happened: once inc-217 is pushed, `git -C repos/<repo> merge-base --is-ancestor origin/feat/EUDPA-720-design-release-2-1-design-snagging HEAD` must succeed in the animals frontend, the plants frontend and the tests repo. A relaunch that resumes an already-pushed row skips the merge, so check after every relaunch too. If it is missing, merge it by hand, run that repo's tests, push, and tell Sam.
   - The loop pushes to the branch and never merges. On any stop, archive the run (`tim build runs archive <runId>`, then `report`), sweep for DEFERRED items (BUILD.md 3b), commit and push this backlog.json on feat/NO_JIRA-design-release-2-1-snagging-b, and relaunch with the same args. Never stop the build for one row: on a stop caused by a refused command, a platform or access problem, or anything else outside the code, relaunch at once; if the same row stops twice, park it (BUILD.md 3d) and relaunch. Only a code defect that blocks every remaining row waits for Sam (ruling, 20 Oct).
   - Timeouts: yesterday laptop B timed out in the animals FIT suite (900 seconds) and in an ins-tests pagination spec. If either comes back, tell Sam: don't raise a timeout yourself.
   - After each landed row, commit and push this backlog.json on feat/NO_JIRA-design-release-2-1-snagging-b, then merge feat/NO_JIRA-design-release-2-1 into it, so both laptops see each other's state.
   - After each landed row, retake that row's "screens to retake" screenshots and compare them with workareas/shared/design-release-2-1/snagging/screens/prototype/. Report mismatches; don't fix by hand.
   - Before inc-221 builds, check laptop A's inc-213, inc-223 and inc-218 are done and pushed to `origin/feat/EUDPA-720-design-release-2-1-design-snagging`. inc-221 merges that branch into all three repos (frontend, plantsfrontend, tests); nothing is merged to main yet. If laptop A's rows are not pushed, stop before inc-221 and tell Sam.

3. Hand back
   - Once the loop drains, commit and push this backlog.json and any openspec changes on feat/NO_JIRA-design-release-2-1-snagging-b, then merge that branch into feat/NO_JIRA-design-release-2-1 and push.
   - Business tickets: the theme-ticket WRITE flow runs once for the whole design snagging theme. Don't run the theme-ticket skill on laptop B.

4. Stop. Never merge, un-draft or approve a pull request. After Sam merges laptop A's branch, this branch becomes the PR for the rest of design snagging. Report to Sam: rows landed as N of 5 (P%), the PR links per repo, CI state, whether laptop A's branch merged in cleanly, anything parked, deferred or mismatched against the prototype, and the run's five most expensive and five slowest stages. Then print the BUILD.md handover block.

Context: decisions and evidence are in workareas/shared/design-release-2-1/snagging/ (discussion.md, review.json; the summary page is https://claude.ai/artifact/GLHDRhbGkXYnu41ZiDTdmR). Laptop A's handover is workareas/shared/design-release-2-1/themes/design-snagging/HANDOVER.md.
````
