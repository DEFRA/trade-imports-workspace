# Trial t5-research-round, round 2

**Request (as a high-risk plants designer):** "Research on Thursday. Participants must be able to get past arrival details and identification numbers without errors, and I need a sheet with a link to where each of the three tasks starts. After the session, switch errors back on and change the arrival date error to 'Enter the date the consignment will arrive'."

**Branch:** `feat/NO_JIRA-designer-prototyping-trial-t5-research-round-r2` (from `feat/NO_JIRA-designer-prototyping`)
**Outcome:** success, once a blocker in the tooling's own tests was fixed. Every success criterion was met.
**Skills followed:** `research-session`, which calls `design-release`, `example-data`, `share-my-change` and `change-the-words`.

## Commits on the trial branch

| Commit | What |
| --- | --- |
| 59e86da | Fix: the `remount` tooling test failed as soon as any design release existed (blocker, see F1) |
| b706844 | Start design release plants-research-arrival-202610 from high-risk-plants |
| 935cbf2 | Three task examples (`task-1-potatoes`, `task-2-plants`, `task-3-wood`) plus `research-session.json` |
| d981938 | `Research mode on for plants-research-arrival-202610` (made by `designer:research -- on`) |
| 226c5e0 | Revert of d981938 (made by `designer:research -- off`) |
| 6aa12cc | Start design release plants-working from plants-research-arrival-202610 |
| 1936ac6 | plants-working: arrival date error changed to "Enter the date the consignment will arrive"; Welsh needed |

## Steps taken

1. Read CLAUDE.md and PROTOTYPE.md. The routing table sent me straight to `research-session`, and the trigger words matched well.
2. `designer:release -- list` showed no research release. Following `design-release` B, I ran `new:set -- plants-research-arrival-202610 --from high-risk-plants --purpose research`, then `designer:format`, then `designer:check --full`. **The check FAILED** on `scripts/designer/release/remount.test.js` and said "Not caused by your change: tell the maintainer. It still has to be fixed before anything can be saved." (F1)
3. I fixed the test helper (`test-repo.js` now unmounts the live releases in its throwaway repo), committed that on its own, then saved the release as the skill says.
4. Step 2 of the skill: the designer asked for "three tasks" without naming them, so I proposed them from `designer:examples -- fixtures`: one each for potatoes, plants and wood. Arrival details asks different questions of each (potatoes also get a time and a place of landing), and so does identification numbers (producer and crop, supplier, consignment). All three stop on arrival details, and each task then carries on through identification numbers.
5. `designer:examples -- init`, then I added 3 entries with `through: 'arrival-details'`. `designer:examples -- check` said 7 of 7 reached. `links` printed stable links.
6. I wrote `research-session.json`. I left the deployed address out because nobody knows it, and the sheet says so.
7. Saved with share-my-change. The full check **failed on lint** (`sonarjs/no-duplicate-string`: `'arrival-details'` appears 3 times). I fixed it with a constant. (F3)
8. Step 3, research mode: `status` said off. I relaxed the rules in the release's arrival-details controller (date `requiredDateTextInRange` became `dateTextInRange`, time `requiredTime` became `optionalText`, place of landing `requiredOneOf` became `oneOf`) and in its identification-numbers controller (`requiredMaxText` became `maxText`). The reference's reading of "let them get past arrival details" says to relax every required rule on the page, and I did. I wrote `research-mode.md` with 4 rows. Full check passed. `designer:research -- on` made commit d981938 cleanly.
9. Step 4: `designer:research -- sheet` wrote `.cache/designer/research/plants-research-arrival-202610/sheet.html`. I read it: 3 tasks, each with a local stable link, the errors switched off, sign-in, Reset and a checklist.
10. Verify: `designer:check` passed. `designer:show --pages arrival-details,identification-numbers,chooser --examples task-1-potatoes,task-2-plants,task-3-wood --errors` printed "Note on arrival-details: Sending this page empty moved on…" and the same note for identification-numbers, so there was no error picture. The chooser shows **Research** + **Research mode on**. Each task picture is the empty arrival details page.
11. After the session: `designer:research -- off` made revert 226c5e0. Re-running the same show gives error pictures for both pages again, and the chooser shows only **Research**.
12. The wording change: `research-session` ("After the sessions" 3) and `change-the-words` step 1.4 both say post-round changes go in a working release, not the research release. There was none, so I made `plants-working` from the research release (`--from plants-research-arrival-202610 --purpose working`) and saved it. `designer:words -- find "Enter the arrival date"` found 1 string. I changed the English, and the Welsh to `'[Welsh needed] Enter the date the consignment will arrive'`. The quick check passed and flagged 1 piece of Welsh needed. `designer:show --pages arrival-details,notification-view --before --errors` shows the new message in the summary and beside the field. Full check passed, and I saved it.
13. Switched back to `feat/NO_JIRA-designer-prototyping`. `git status --short` is clean.

## Screenshots

- Research mode on, chooser with the "Research mode on" tag: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-research-arrival-202610/2026-09-28T03-22-02/chooser--now--page--desktop.png`
- Research mode on, task starting pages: `…/2026-09-28T03-22-02/example_task-1-potatoes--now--page--desktop.png`, `example_task-2-plants…`, `example_task-3-wood…`
- Research mode on, no error state (only the plain page exists): `…/2026-09-28T03-22-02/arrival-details--now--page--desktop.png`, `identification-numbers--now--page--desktop.png`
- After off, errors back: `…/plants-research-arrival-202610/2026-09-28T03-24-51/identification-numbers--now--errors--desktop.png`, `arrival-details--now--errors--desktop.png`, `chooser--now--page--desktop.png` (tag gone)
- New error message: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T03-24-29/arrival-details--now--errors--desktop.png` (before: `arrival-details--before--errors--desktop.png`)
- Sheet: `repos/trade-imports-plants-prototype/.cache/designer/research/plants-research-arrival-202610/sheet.html`

## Friction

### F1 BLOCKER: no design release can be saved (tooling test broken)
`design-release` B step 6: "Check it boots and passes every check". Right after `new:set`, the full check fails `scripts/designer/release/remount.test.js > Should change nothing when every release is mounted`. It expects `removed: []` but gets "unmounted plants-research-arrival-202610: its folder is gone". The cause: `makeTestRepo()` copies the live `prototype-sets/index.js`, `descriptions.js` and `overrides.json`, which now name the new release, but copies only the high-risk-plants and sample-journey folders. `remount` then sees the new release's folder as gone. The same test fails in the pre-commit hook, so **every "Start design release" commit is refused**, and so is every later save while any release exists. This came in with "fix: act on designer trial round 1" (9d83243). A designer is told "Not caused by your change: tell the maintainer" and can do nothing.
**My fix (commit 59e86da):** call `remountReleases({ repoRoot })` in `makeTestRepo()` before the first commit, so the throwaway repo starts with only the two built-in sets. All 645 designer and new-set tests pass, and so does the full suite (3105 tests, then 3109 with 2 releases).
**Suggested:** keep that fix. Add a CI canary that runs the whole unit suite *after* `new:set` (the existing PR canary evidently does not run `scripts/designer/release`), or at least the release tests.

### F2 MAJOR: the post-session wording change goes in a release the designer did not ask for
The request was "after the session, switch errors back on and change the arrival date error". Taken literally that means the research release. `research-session` "After the sessions" 3 and `change-the-words` step 1.4 say that goes in a working release, "the one this research release was made from (`from`)" (here high-risk-plants, which cannot be edited) "or a new one made from this research release". `change-the-words` 1.3 says instead to make `plants-working` *from the real journey*. The two skills disagree on `--from`. I followed research-session (from the research release). The designer now has a whole second release (another ~150-file commit, plus a slower restart) just to change one string, and will not find the new message in the research release they are used to.
**Suggested:** decide one route and state it the same way in both skills. Tell the designer in one line, before acting, where the change will land and why. Consider allowing a small post-round copy change in the research release once research mode is off, which is "the next working release" in all but name.

### F3 MAJOR: the skill's own recipe for 3 tasks breaks a lint rule
`research-session` step 2.2 says to add an example "**stopped at the task's starting page**". Three tasks that start on the same page give `through: 'arrival-details'` 3 times, and the full check fails `sonarjs/no-duplicate-string`. `example-data` warns about this only for the long `fixture` form ("The long form repeated on five examples breaks a code rule"), not for `through`. A designer would not know to reach for a JS constant.
**Suggested:** exempt `src/server/prototype-seed/scenarios/**` from `sonarjs/no-duplicate-string` (the data is meant to repeat), or have `init` write a `const TASK_START` pattern, or add a line to the example-data skill.

### F4 MINOR: `new:set --from <research release>` copies `research-session.json` into the working release
`plants-working` got the research release's `research-session.json`, which names examples (`task-1-potatoes`…) that plants-working does not have. I deleted it before saving. (`research-mode.md` would also be copied if research mode were on at the time.)
**Suggested:** leave out `research-session.json` and `research-mode.md` in `new:set` when the target purpose is not `research`.

### F5 MINOR: the `designer:research -- off` wording is back to front
Its output says "Errors are back for: - arrival-details: Leave the arrival date blank…". It reuses the "What participants can now do" column, so it reads as though leaving it blank is now an error message. The sheet does the same under "Errors switched off": "Participants will not see these errors" followed by "Leave the arrival date blank".
**Suggested:** use the "What the real service does" column for `off` and for the sheet ("Asks for the arrival date").

### F6 MINOR: `designer:words` says the error is "Also shown on: notification-view"
The arrival date *error* is never shown on check your answers. The find suggested `--pages arrival-details,notification-view`, and with `--errors` that gives a misleading "Note on notification-view: Sending this page empty moved on to the next page, so it has no error state" (it is a summary page). That is noise to check.
**Suggested:** leave `errors.*` keys out of `alsoOn`, and do not try to make an error state on pages without a form.

### F7 MINOR: the new wording contradicts part of the journey
"Enter the date the consignment will arrive" is also the required error for plants and wood that have *already arrived* (label "Date the consignment first arrived in Great Britain") and for potatoes ("If the potatoes have already arrived, enter the date they arrived"). `change-the-words` step 5 says to flag this once. I would tell the designer, but nothing in the tools spots it. Worth a note in step 5 that one error key can serve several date states.

### F8 MINOR: the sheet and gallery live in `.cache/`, which git ignores
The sheet cannot be saved or shared through a PR, and it vanishes with a clean. Research step 4 says "Give them the path so they can open or print it", which is fine locally but not for a team.
**Suggested:** offer `--out` or copy the sheet next to `research-session.json`. Or say plainly that it is a local file.

### F9 MINOR: small doc and CLI mismatches
- The CLAUDE.md commit advice is `git commit … > .cache/designer/commit.log`, a relative path that assumes the cwd is the repo. The guard rails here forbid `cd`, so I logged under the workarea.
- The skills say "Get onto the designer's branch (`design/*`)", while the trial required its own branch name. `share-my-change` step 3 would have created a new `design/*` branch, and I ignored that.
- `designer:format` said "Every file was already tidy" after I wrote `research-mode.md`. The following check's Prettier step then re-padded the table, so the file changed under me.
- Gallery folders are stamped `03-22` while the check logs say `02-21` for the same minute (different timezones in the file names).

### F10 OBSERVATION: task links proven to survive a fresh start, not a dev-server restart
Each `designer:show` run starts its own fresh copy of the prototype. All 3 `/examples/…/task-*` links landed on arrival details in two separate runs (before and after `off`), so the links survive a restart. I did not restart `npm run dev` by hand.

## Did the change work?
Yes.
- One `Research mode on for plants-research-arrival-202610` commit, logged in `research-mode.md`.
- The chooser showed "Research mode on".
- `--errors` showed no error state on arrival details or identification numbers.
- The sheet lists 3 stable task links, and each opened arrival details in fresh servers.
- `off` reverted the commit, the errors came back and the tag went.
- The new message shows in English, with `[Welsh needed]` in the Welsh, in the error-state picture of `plants-working`.

## Time-wasters
- F1 cost the most: I had to read the test fixture to see it was tooling, not the designer. A real designer would be dead in the water at the very first save.
- A full check plus a pre-commit run means each of the 5 saves ran the ~20-second unit suite twice. That is fine, but it adds up.
