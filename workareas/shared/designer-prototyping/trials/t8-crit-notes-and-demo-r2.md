# Trial t8-crit-notes-and-demo, round 2

Branch: `feat/NO_JIRA-designer-prototyping-trial-t8-crit-notes-and-demo-r2` (from `feat/NO_JIRA-designer-prototyping`)

## What I asked

"The prototype won't start (port in use). When it's running, here are my notes from Friday's crit: 1) change the hint on origin to 'The country the plants were grown in', 2) add a draft example stopped at commodities, 3) make the task list's 'Arrival' group 'Arrival and transport'. Do them all, then record a walkthrough of the whole journey for Tuesday's show and tell, and show check your answers next to the real journey's."

## Outcome: partial success

All four parts landed, but only after I fixed a **blocker in the prototype's own test harness**. Without that fix, the pre-commit hook refused the first commit of any new design release. A real designer would have been stuck at step 1 of the design session.

Commits on the trial branch (oldest first):

| Commit | What |
|---|---|
| `b386578` | trial fix: the design release tests no longer fail once a release exists (see Blocker) |
| `e4155f1` | Start design release plants-working from high-risk-plants |
| `d4a7f5a` | plants-working: country hint is now 'The country the plants were grown in' on origin; Welsh needed |
| `000c6ba` | plants-working: add an example stopped at commodities |
| `dd2f064` | plants-working: 'Arrival and destination' is now 'Arrival and transport' on the task list and check your answers; Welsh needed |

The checkout is back on `feat/NO_JIRA-designer-prototyping` and `git status --short` is clean.

## Steps, in order

1. Read `CLAUDE.md` and `PROTOTYPE.md`. Routed "port in use" to `run-the-prototype`, and "notes from the crit" to the `design-session` workflow.
2. **run-the-prototype**:
   - `designer:preflight` printed: `In use - Port 3103: Port 3103 is in use by node (process 42381). It answers like the prototype...`. Good: it named the process.
   - The `ps` output shows this is a nodemon `npm run dev` from this same checkout, running for 2 days (PID 21842). Following step 3, I told the designer it was probably already running. I would have asked "Shall I stop the program on port 3103 (process N)...?", and as the designer I said no. Nothing was stopped.
   - `designer:preflight -- --wait` printed `The prototype is running: http://localhost:3103`.
   - `designer:examples -- links high-risk-plants` printed 9 links.
   - I did not run `npm run dev` in the background: it would only have hit EADDRINUSE. The existing server stayed up the whole time. Its child PID changed from 42381 to 394 because nodemon restarts on every git switch or commit, which the skill warns about.
3. **design-session**: the Workflow tool is not available to this subagent, so I followed the manual steps in `.claude/workflows/README.md`.
   - Step 1: the tree was clean. I was on a trial branch, so I stayed on it.
   - Step 2: there was no release. I ran `design-release` section B: `new:set -- plants-working --from high-risk-plants --purpose working --describe ...`, then `designer:format`, `git add -A` and commit. **The commit failed** (see Blocker). I fixed the harness, re-ran `designer:check --full` (passed) and committed the fix, then the release, separately.
   - Request 1 (`change-the-words`): `designer:words -- find "origin"`, then `designer:where` (Yours). Edited `country.hint` in en and cy (`[Welsh needed]`). The quick check passed. Staged with `git add -A -- <files>`.
   - Request 2 (`example-data`): `examples list` and `fixtures`, then `designer:where`, `examples init plants-working`. Added `draft-at-commodities` (`plantsForPlanting`, `through: 'commodities'`). `examples check` reported 5 of 5 Reached. The quick check passed. Staged.
   - Request 3 (`change-the-words`): `find "Arrival"` returned 26 strings. The task list has no group called "Arrival": it is `2. Arrival and destination`, the nearest match. Changed `hub groups.arrival-and-destination` and `check-answers sections.arrival` (the same group heading on check your answers), en and cy, and updated the code comments that quoted the old words. The quick check passed. Staged.
   - Step 4 show: `designer:show -- --set plants-working --pages changed,dashboard --examples draft-at-commodities --before` produced 10 pictures across 5 pages.
   - Step 5: the full check passed (3105 tests).
   - Step 6: three commits, one per request. For each one: `restore --staged`, `add -A -- <files>`, `diff --cached --name-only`, then commit. The pre-commit hook passed every time.
4. **show-my-change**: `designer:show -- --set plants-working --video --compare high-risk-plants` produced **0 pictures** (see friction F3). I re-ran with `--pages check-answers --video --compare high-risk-plants` and got `walk.webm` plus a check your answers pair.

## Pictures (all opened and read)

Session gallery: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T03-57-30/index.html`
- `origin--now--page--desktop.png`: the hint under "Country of origin" reads "The country the plants were grown in".
- `hub--now--page--desktop.png`: the group heading reads "2. Arrival and transport". Its rows are Arrival details and Place of destination.
- `notification-view--now--page--desktop.png`: the section heading reads "2. Arrival and transport".
- `example_draft-at-commodities--now--page--desktop.png`: "Commodities in the consignment" with a Picea (spruce) row, quantity 40.

Show and tell gallery: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T04-00-54/index.html`
- `walk.webm` (1.9 MB). I cannot watch video, so I have not checked what it shows.
- `notification-view--now--page--desktop.png` and `notification-view--compare--page--desktop.png`: the two are identical apart from "2. Arrival and transport" against the real journey's "2. Arrival and destination".

## Friction

### Blocker: the pre-commit hook fails once any design release exists

`design-release` step 8 says `git commit -m "Start design release <release-id> from high-risk-plants"` and "The pre-commit checks run". The hook failed:

```
FAIL scripts/designer/release/remount.test.js > remount > Should change nothing when every release is mounted
+   "removed": [ "unmounted plants-working: its folder is gone", ... ]
```

- **Cause:** `scripts/designer/release/test-repo.js` `makeTestRepo` copies the checkout's `overrides.json` and `prototype-sets/{index,descriptions}.js`, which now name `plants-working`. It copies only the `high-risk-plants` and `sample-journey` folders, so `remount` sees a mounted release with no folder.
- **Effect:** every designer's first release commit fails. So does every later commit, because the mount files keep naming the release.
- **Misleading message:** `designer:check` says "Not caused by your change: tell the maintainer". That is wrong: making the release caused it. A designer would stop there and wait for a maintainer.
- **My fix (commit `b386578`):** after the throwaway repo's first commit, `makeTestRepo` runs `remountReleases` and commits again if it removed anything.
- **A first attempt failed:** copying every set folder broke `list.test.js`, which pins the exact set list.
- **The fix is only on the trial branch.** The base branch still has the bug. Apply it to `feat/NO_JIRA-designer-prototyping`.
- **Question:** round 1 ran on this branch too. Either it never committed a release, or the harness regressed since. It is worth adding a canary test that commits a release through the hook.

### F1 (major): "three changes" versus "four or more"

CLAUDE.md rule 6 says: "For four or more changes, use the `design-session` workflow". The workflows table says `design-session` is for "here are my notes from the crit". Three crit notes fit both. I used design-session because of the crit trigger. Make the trigger one rule, not two.

### F2 (minor): finding a hint by its page

`change-the-words` step 2 finds words only by the text they contain. "The hint on origin" does not contain the word origin (it is "Start typing to search for a country."), so the find listed 5 other strings and not the hint. I had to open `copy.en.js` myself.
- **Suggestion:** `designer:words -- page origin`, which lists every string on a page.

### F3 (major): `--compare` with nothing changed pictures nothing

The show-my-change table says "compare with the real journey" means add `--compare high-risk-plants`. After the session commits there are no unsaved changes, so the default pages (the changed pages) are empty. `designer:show --video --compare high-risk-plants` printed "Taking pictures of 0 page(s)", with no warning and no hint to add `--pages`.
- The skill's own table entry ("None of your changes show on a page" means ask which pages or use `--pages all`) never triggered, because the tool did not print it.
- **Suggestion:** when `--compare` has no pages, default to `--pages changed-since-release`, or at least print the "None of your changes show" line.

### F4 (minor): misleading accessibility headline

The session show printed "Accessibility: serious problems on example:draft-at-commodities". The problems (no title, no lang) are on the **before** picture, which is a bare 404 page, because the example did not exist before. The new page itself had no problems.
- **Suggestion:** skip axe on a before page that returned 404, or say "on the before picture".

### F5 (minor): renaming a group that does not exist

The task list has no group called "Arrival". CLAUDE.md "Requests that fit two skills" does not cover this case. Only the design-session classifier prompt covers it ("route it to the nearest match and say which").
- I renamed "2. Arrival and destination" to "2. Arrival and transport". The group still holds arrival details and **place of destination**, with nothing about transport. Following step 5, I flagged this as a note for the content designer.
- I also renamed the matching check your answers heading, because the skill's own "Consignment parties" example treats the two as one phrase. The skill does not say whether "the task list's group" means the check your answers heading too. A literal reading would change the task list only and leave the two headings out of step.

### F6 (minor): new style rule versus designer's words

Request 1's new hint explains what the question means, not how to answer it. `.claude/rules/copy.md` says "Hint text explains how to answer, not what the question means". The hint also drops "Start typing to search", the cue that the box is an autocomplete. Following the skill, I kept the designer's words and flagged this once.

### F7 (minor): the manual design-session has no guard against an existing working release

This matters for repeat runs. It was not a problem here.

### F8 (minor): the example "stopped at commodities" already partly held

The default `draft-just-started` already stops on `commodities/details`. CLAUDE.md says "check whether it is already true". It is ambiguous whether "commodities" means `commodities/details` or the `commodities` list page. I chose the list page (`through: 'commodities'`), which is new, and labelled it plainly.

### F9 (minor): commit output

The commit's pre-commit output is hundreds of lines. Sending it to `.cache/designer/commit.log` worked well, but a failed commit returns only "Exit code 1". The skill should say "then read the end of the log", as CLAUDE.md does.

## Time-wasters

- Diagnosing the harness bug and one wrong fix attempt: about 5 tool calls and 2 test runs.
- The empty `--compare` run: one wasted recording, about 30 seconds.
- Hunting for the origin hint by text search.

## Success criteria

| Criterion | Result |
|---|---|
| Names the process on 3103 and asks before stopping it; the dev server runs and example links print | Yes. Named process 42381. Did not stop it: the dev server was already running and I kept it. Links printed for high-risk-plants and plants-working. |
| design-session lands 3 separate commits and one session gallery | Yes, **after the blocker fix**: d4a7f5a, 000c6ba, dd2f064. Gallery at `2026-09-28T03-57-30`. |
| `designer:show --video --compare high-risk-plants` gives walk.webm and a check your answers pair | Only with `--pages check-answers` added. The literal command gave a video and 0 pictures. |
| The dev server on 3103 is undisturbed and git status is clean | Yes. Nodemon kept serving (restarted by file watch only). The status is clean on the base branch. |
