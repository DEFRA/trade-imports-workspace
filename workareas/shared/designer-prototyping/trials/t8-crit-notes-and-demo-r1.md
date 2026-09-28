# Trial t8-crit-notes-and-demo, round 1

Branch: `feat/NO_JIRA-designer-prototyping-trial-t8-crit-notes-and-demo-r1` (from `feat/NO_JIRA-designer-prototyping`, base `0fd3934`)

## What I asked

"The prototype won't start (port in use). When it's running, here are my notes from Friday's crit: 1) change the hint on origin to 'The country the plants were grown in', 2) add a draft example stopped at commodities, 3) make the task list's 'Arrival' group 'Arrival and transport'. Do them all, then record a walkthrough of the whole journey for Tuesday's show and tell, and show check your answers next to the real journey's."

## Outcome

**Partial success.** All three crit notes landed as three separate commits in a new working release. There is one session gallery, and the walkthrough video and the check your answers pair were made. Two things went wrong on the way. With no human watching, the `design-session` workflow would not have finished (see B1 and B2). I got through only by working around it by hand.

| Criterion | Result |
|---|---|
| run-the-prototype names the process on 3103 and asks before stopping it | Met. The preflight said "in use by node (process 9345). It answers like the prototype... Nothing has been stopped." I stopped nothing. |
| Dev server starts, example links print | Met. The server was already running, so the skill (step 3) went straight to step 5. `designer:examples -- links high-risk-plants` printed 9 links. |
| design-session lands 3 separate commits (or parks one) plus one gallery | Met, but by hand. I had no Workflow tool, so I followed the README's steps for hosts without it. Commits `e75d8b7`, `99c069e`, `f7622b3`. Gallery `.cache/designer/show/plants-working/2026-09-28T01-36-05/index.html`. |
| `designer:show --video --compare high-risk-plants` gives walk.webm and a check your answers pair | Met. `.cache/designer/show/plants-working/2026-09-28T01-38-39/walk.webm` (1.9 MB), plus `notification-view--now/compare--page--desktop.png`. |
| Server on 3103 undisturbed; git status clean apart from the commits | Met, but nodemon restarted the server on every save or git operation. Its process id went 9345, then 28422, then 12301. |

## Steps taken

1. Read CLAUDE.md and PROTOTYPE.md. Routing: `run-the-prototype`, then `design-session` (CLAUDE.md "Workflows"), then `show-my-change`.
2. run-the-prototype step 1: `designer:preflight`. Node, Packages and Browser were OK, and port 3103 was "In use". Step 3 says to tell the designer it is probably already running, then go to step 5. I did not stop it.
3. Step 5: I had no working release, so I printed the links for `high-risk-plants`.
4. `design-session` needs a working release, and none existed. I followed design-release section B: `designer:release -- list`, then `new:set -- plants-working --from high-risk-plants --describe ... --purpose working`, `npm run format`, `designer:check --full` (passed, 3050 tests), `designer:show --pages all` (15 pictures), staged the five paths and committed `8413011 Start design release plants-working from high-risk-plants`.
5. There was no Workflow tool, so I followed `.claude/workflows/README.md`, "Hosts without the Workflow tool".
   - Request 1 (change-the-words): `designer:words find "Start typing to search for a country"` found 1 string on origin. I edited en and cy (`[Welsh needed]`). The quick check passed, and I staged the files.
   - Request 2 (example-data): `designer:examples list`, then `init plants-working`, then added `draft-stopped-at-commodities` with `through: 'commodities'`. `examples check` reached 5 of 5. The quick check passed. Staged.
   - Request 3 (change-the-journey, task-list recipe): `designer:words find "Arrival and destination"` found the hub group and the check your answers section. I renamed both, with Welsh marked. The **full check FAILED**: ESLint `sonarjs/no-duplicate-string` in `src/server/prototype-seed/scenarios/plants-working.js` (request 2's file, see B2). I fixed it by writing each fixture in the short form (`fixture: 'warePotatoes'`), as `high-risk-plants.js` does. The examples reached 5 of 5 again, and the full check passed.
6. Show: `designer:show --pages changed --before` pictured 3 pages (origin, hub, notification-view) with before and after. I opened all the "now" pictures. The hint reads "The country the plants were grown in". The task list and check your answers show "2. Arrival and transport".
7. Save: the README's step 5 commits the way `design-session.js` does, with `git commit -m ... -- <paths>`. **The pre-commit hook failed** (B1). I unstaged the other requests and committed each one from the index without a pathspec. All three commits passed the hook.
8. show-my-change: `designer:show --set plants-working --pages all --video --compare high-risk-plants` made 30 pictures, `walk.webm`, and found no accessibility problems. I opened `notification-view` now and compare: the real journey says "2. Arrival and destination" and mine says "2. Arrival and transport". Everything else matches. I also opened `dashboard--now`.
9. Final preflight: 3103 still answers (now process 12301). `git status` was clean.

## Friction

### B1 (blocker): design-session's commit step always fails the pre-commit hook

`design-session.js` commit(): ``3. Run: git commit -m "<first line>" -m "<body>" -- ${group.paths.join(' ')}``. The README's manual step 5 leads to the same command.

- A commit with a pathspec makes git run the hook with `GIT_INDEX_FILE=.git/next-index-NNNN.lock`.
- The hook's `npm test` includes git-driven tests: `scripts/designer/lib/git.test.js`, `sets.test.js`, `release/freeze.test.js` and `show/base-tree.test.js`. These inherit that variable and fail with `fatal: Unable to create '.../next-index-57672.lock.lock': File exists`. 13 or more tests failed.
- So every save in a session fails, and the workflow stops at "Saving stopped".
- **Fix:** commit from the index with no pathspec, because the workflow already stages each request. Or make the git-driven tests clear `GIT_INDEX_FILE` and `GIT_DIR` before they spawn git. Ideally do both.

### B2 (major): the example-data quick check lets a lint error through, and the next request pays for it

- `CHECK_LEVEL` gives `example-data: 'quick'`, and the quick check does not run ESLint.
- `designer:examples -- init` writes every example as `fixture: { file: 'happy-path', name: ... }`. Four copies of `'happy-path'` pass, but adding a fifth trips `sonarjs/no-duplicate-string`.
- The error only shows up in request 3's full check. `repair()` says "If the failure is in a file this request did not touch, change nothing". So the workflow would **park request 3** (the innocent one) and keep request 2.
- **Fix:** make `init` write the short form `fixture: '<name>'`. Also run lint in the quick check, or give example-data the full level.

### B3 (major): designer:where gives the wrong owner when npm is run from outside the repo

- `scripts/designer/where/cli.js:72` resolves paths against `process.env.INIT_CWD`.
- Run with `npm --prefix`, from a parent folder, or by any workflow agent whose cwd is not the repo, a relative path gets "Outside this prototype: the weekly update does not cover it." Every step says to stop unless the answer is "Yours", so classify would set `releaseOk=false`.
- I worked around it with full paths.
- **Fix:** resolve relative paths against the repo root, not the caller's folder. A designer starting Claude Code in the repo is fine; an orchestrator is not.

### M1 (major): design-session cannot run on the branch it was given, and cannot run without a release

- The prepare step: "Otherwise stop: ready is false and reason is 'A design session runs on main or on a design/ branch.'"
- The session is also refused on `high-risk-plants`. A new designer has no release, so the first crit session always needs design-release first. Nothing in CLAUDE.md's `design-session` line says so.
- **Fix:** make the workflow offer or create the working release when `set` does not exist. Mention it in CLAUDE.md.

### M2 (major): no Workflow tool, so the README's manual steps did the work

- The manual steps are good but thinner than the script. For example, they do not say how to keep each request aside (`git add`), how to put a parked request away, or how to group requests that share files.
- **Fix:** copy the stage, put-away and grouping rules into the README's manual steps.

### M3 (minor): the session gallery leaves out the new example

- `--pages changed` only pictures pages whose templates or copy changed. An example-data change produces no picture, so request 2 is not in the session gallery.
- The dashboard picture in the `--pages all` gallery shows only the notifications that show made itself (2 of them, with blank Commodity, Arrival and Consignor rows). It does not show the release's seeded examples, so the new example is not visible anywhere.
- example-data step 6 says to show `--pages dashboard,<stop page>`, but the workflow never does.
- **Fix:** when a scenario file changes, add `dashboard` and each new example's stop page to the session show, reached through the example itself.

### M4 (minor): 'Arrival' group is ambiguous

- The task list has no group called "Arrival". The nearest is "2. Arrival and destination", and its "Place of destination" row stays.
- I renamed it and am flagging it: "Arrival and transport" over a destination task may not be what the crit meant.
- Routing is split too. CLAUDE.md sends "rename the task list group" to change-the-journey, while change-the-words also claims "task list groups" and the recipe says both work. The two check at different levels (full versus quick).

### M5 (minor): stale process ids in the port advice

run-the-prototype step 3 says to `kill <pid>` the preflight named. nodemon restarts on every save and on every `git switch` or commit, and the id changed 3 times in this trial. Killing an old id would miss the server, or hit an unrelated process. Re-run preflight straight before asking.

### M6 (minor): small things

- "1 piece of text still need Welsh" should say "needs".
- The init file is written with JSON-style double quotes, which Prettier rewrites. Harmless, but noisy.
- The designer asked for "check your answers", but the picture is called `notification-view`. show-my-change lists `check-answers` as a page name, while the gallery file names use `notification-view`.
- The hint wording breaks the rule in `.claude/rules/copy.md`: "Hint text explains how to answer, not what the question means". I used the designer's words, as the rule says to.

## Time-wasters

- The pathspec commit failure produced about 20 KB of test output with no plain-English summary. The hook is not the designer check.
- Every commit runs the whole pre-commit suite: about 1 minute each, 4 in all.
- Investigating the `designer:where` "Outside this prototype" answer.

## Pictures

- Starting gallery: `.cache/designer/show/plants-working/2026-09-28T01-32-12/index.html`
- Session gallery, before and after: `.cache/designer/show/plants-working/2026-09-28T01-36-05/index.html` (`origin--now`, `hub--now`, `notification-view--now`, plus before pictures)
- Show and tell: `.cache/designer/show/plants-working/2026-09-28T01-38-39/index.html`, `walk.webm`, `notification-view--now--page--desktop.png` beside `notification-view--compare--page--desktop.png`

All paths are relative to `repos/trade-imports-plants-prototype/`. I did not watch the video.
