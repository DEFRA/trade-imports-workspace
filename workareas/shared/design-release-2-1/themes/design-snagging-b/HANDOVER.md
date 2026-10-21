# Design snagging B: laptop B build handover (21 October 2026)

Six design snagging rows moved here so laptop B builds them while laptop A builds the rest of the theme. Laptop A's
merge row, inc-222, brings this branch back into the design snagging branch once all six are done here. Nothing from
this branch merges to `main` on its own.

Paste the block below into a fresh Claude Code session on laptop B, opened at the workspace root.

````
Build the Design Release 2.1 design snagging B rows end to end, on one branch, and stop before anything merges: laptop A merges this branch into the design snagging branch, and Sam does a technical review first. Use the requirements-pipeline skill's BUILD phase (branch lifecycle). Follow workareas/shared/design-release-2-1/themes/HOW-TO-BUILD.md ("Design snagging B") and these steps in order.

0. Prepare
   - Pull the workspace repo on feat/NO_JIRA-design-release-2-1. Then cut a short workspace branch from it, feat/NO_JIRA-design-release-2-1-snagging-b, and stay on it: this backlog and every openspec change from this build go there, never on feat/NO_JIRA-design-release-2-1 directly.
   - Backlog: workareas/shared/design-release-2-1/themes/design-snagging-b/backlog.json (6 todo). Run `tim backlog check shared/design-release-2-1/themes/design-snagging-b` and `tim backlog next shared/design-release-2-1/themes/design-snagging-b` (expect inc-210, the search box with the joined blue icon button on the party pickers).
   - Rows: inc-210 (search icon button on the party pickers and transporter list), inc-212 (party picker layout, waits on inc-210), inc-213 (consignment addresses), inc-219 (CPH number), inc-214 (identification details), inc-217 (declaration and Notification submitted).
   - Read workareas/shared/design-release-2-1/PROGRAMME-NOTES.md if it exists, and LAYERS-PLAN.md.
   - Stack: `tim docker lease status`. Never break anyone else's lease; ask Sam if someone holds it.
   - Remind Sam to raise Dynamic workflow size in /config.

1. Branch and draft PRs
   - `tim workspace branch feat/EUDPA-720-design-release-2-1-design-snagging-b` so the animals frontend, plants frontend and tests checkouts are on it.
   - Check the branch exists on origin in all three repos, and that each has a draft PR against main (`tim github prs EUDPA-720`). The branch is cut from the design snagging branch's tip (feat/EUDPA-720-design-release-2-1-design-snagging), after inc-204 landed. If the branch or a draft PR is missing in any repo, stop and tell Sam which: don't cut it from main.

2. Build: one Workflow launch of the increment build loop by scriptPath (.claude/skills/requirements-pipeline/workflow/increment-build-loop.js, never by name), lifecycle branch, every Jira key null:
   workarea shared/design-release-2-1/themes/design-snagging-b · branch feat/EUDPA-720-design-release-2-1-design-snagging-b · lifecycle branch · scope design-release-2-1-design-snagging · executor claude · planOnly false · repos copied from `jq '.repos'` of this backlog (frontend, plantsfrontend, tests) · models {} · increments null · stopAfter "all" · requireApproval null · approvalWaitMinutes null · jiraProject/epic/jiraInDevStatus/jiraDoneStatus/jiraBoard null.
   - The loop pushes to the branch and never merges. On any stop, archive the run (`tim build runs archive <runId>`, then `report`), sweep for DEFERRED items (BUILD.md 3b), commit and push this backlog.json on feat/NO_JIRA-design-release-2-1-snagging-b, and relaunch with the same args. Never stop the build for one row: on a stop caused by a refused command, a platform or access problem, or anything else outside the code, relaunch at once; if the same row stops twice, park it (BUILD.md 3d) and relaunch. Only a code defect that blocks every remaining row waits for Sam (ruling, 20 Oct).
   - After each landed row, commit and push this backlog.json on feat/NO_JIRA-design-release-2-1-snagging-b, so laptop A's merge row sees it done once laptop A pulls.
   - After each landed row, retake that row's "screens to retake" screenshots and compare them with workareas/shared/design-release-2-1/snagging/screens/prototype/. Report mismatches; don't fix by hand.

3. Hand back
   - Once the loop drains, commit and push this backlog.json and any openspec changes on feat/NO_JIRA-design-release-2-1-snagging-b, then merge that branch into feat/NO_JIRA-design-release-2-1 and push. That is what lets laptop A's merge row, inc-222, see all six rows done.
   - Business tickets are written once for the whole theme, on laptop A, after inc-222. Don't run the theme-ticket skill here.

4. Stop. Never merge, un-draft or approve a pull request. Report to Sam: rows landed as N of 6 (P%), the PR links per repo, CI state, anything parked, deferred or mismatched against the prototype, and the run's five most expensive and five slowest stages. Then print the BUILD.md handover block.

Context: decisions and evidence are in workareas/shared/design-release-2-1/snagging/ (discussion.md, review.json; the summary page is https://claude.ai/artifact/GLHDRhbGkXYnu41ZiDTdmR). Laptop A's handover is workareas/shared/design-release-2-1/themes/design-snagging/HANDOVER.md.
````
