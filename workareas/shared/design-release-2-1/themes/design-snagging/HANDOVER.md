# Design snagging: build handover (20 October 2026)

Paste the block below into a fresh Claude Code session opened at the workspace root.

````
Build the Design Release 2.1 design snagging theme end to end, on one branch, and stop before anything merges: Sam does a technical review first. Use the requirements-pipeline skill's BUILD phase (branch lifecycle) and the theme-ticket skill around it. Follow workareas/shared/design-release-2-1/themes/HOW-TO-BUILD.md and these steps in order.

0. Prepare
   - Pull the workspace repo on feat/NO_JIRA-design-release-2-1. Backlog: workareas/shared/design-release-2-1/themes/design-snagging/backlog.json (17 todo, 2 merged-into). Run `tim backlog check shared/design-release-2-1/themes/design-snagging` and `tim backlog next` on it (expect inc-202, the type-ahead).
   - Read workareas/shared/design-release-2-1/PROGRAMME-NOTES.md if it exists, and LAYERS-PLAN.md.
   - Stack: `tim docker lease status`. If Sam's discussion session still holds it ("sam discussion session 20 Oct"), ask Sam before releasing it. Never break anyone else's lease. Also ask whether the prototypes on ports 3010 and 3103 can be stopped.
   - Remind Sam to raise Dynamic workflow size in /config.

1. Ticket (theme-ticket STUB flow)
   - Say "raise the theme stub" for design-snagging: one Story under epic EUDPA-328 (Catch up frontend with prototype), relates to EUDPA-691. Status Ready for Dev. Record it in workareas/shared/design-release-2-1/tickets/tickets.json under "stub".
   - Branch name: feat/<KEY>-design-release-2-1-design-snagging. Set the theme backlog envelope's `branch`, themes.json and HOW-TO-BUILD.md's design snagging section to it. Run tim backlog check, then commit and push the workspace (own paths only, never docs/repos/*.md or tmp/).

2. Branch and draft PRs
   - In each repo of the envelope's repos (animals frontend, plants frontend, tests): fetch, cut the branch from origin/main, push it, and open a draft PR against main titled "<KEY>: Design Release 2.1 design snagging". The body links the ticket and says "Built by the increment build loop. Not for merge until Sam's technical review."
   - The tests repo has an old local branch feat/NO_JIRA-design-release-2-1-design-snagging (throwaway capture specs). Don't build on it. Leave it.
   - `tim workspace branch <branch>` so the checkouts match.

3. Start (theme-ticket START flow): "the build loop is starting on design-snagging". Ticket → In Dev.

4. Build: one Workflow launch, lifecycle branch, every Jira key null:
   workarea shared/design-release-2-1/themes/design-snagging · branch <the new branch> · lifecycle branch · scope design-release-2-1-design-snagging · executor claude · planOnly false · repos copied from `jq '.repos'` of the theme backlog · models {} · increments null · stopAfter "all" · requireApproval null · approvalWaitMinutes null · jiraProject/epic/jiraInDevStatus/jiraDoneStatus/jiraBoard null.
   - The loop pushes to the branch and never merges. On any stop, archive the run (`tim build runs archive <runId>`, then `report`), sweep for DEFERRED items (BUILD.md 3b), commit and push the theme backlog.json, and relaunch with the same args. Never stop the build for one row: on a stop caused by a refused command, a platform or access problem, or anything else outside the code, relaunch at once; if the same row stops twice, park it (BUILD.md 3d) and relaunch. Only a code defect that blocks every remaining row waits for Sam (ruling, 20 Oct).
   - After each landed row, retake that row's "screens to retake" screenshots and compare them with workareas/shared/design-release-2-1/snagging/screens/prototype/. Report mismatches; don't fix by hand.

5. Business tickets (theme-ticket WRITE flow), once the loop drains: "write the business tickets for design-snagging".
   - One Story per domain with the open spec changes, acceptance criteria copied from openspec/: **live animals**, **high-risk plants**, and also a **common frontend** Story for behaviour both frontends share (the type-ahead, the search box with the icon button, the date picker, Back links), which the two domain tickets link to instead of repeating. The common ticket goes beyond the skill's default split (Sam asked for it): say so in the report. Check that the build-order page and tickets.json accept a "common" domain before recording it there. If they don't, add the mapping, or record it in tickets/README.md only, and flag it.
   - The stub becomes one of the domain tickets. Status In Dev. Every ticket must say the work is not merged yet.

6. Stop. Don't merge, un-draft or approve anything. Report to Sam: rows landed as N of 17 (P%), the PR links per repo, CI state, the ticket keys and scenario counts per domain, anything deferred or mismatched against the prototype, and the run's five most expensive and five slowest stages. Then print the BUILD.md handover block.

Context: decisions and evidence are in workareas/shared/design-release-2-1/snagging/ (discussion.md, review.json; the summary page is https://claude.ai/artifact/GLHDRhbGkXYnu41ZiDTdmR). Blocked items are not in this theme: the commodity search and list (MDM API EUDPA-617, type-ahead EUDPA-616), adding transit countries on pick (spike EUDPA-719), and the empty optional task status (with the designers).
````
