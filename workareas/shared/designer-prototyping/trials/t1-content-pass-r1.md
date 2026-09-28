# Trial t1-content-pass, round 1

**Request (as the designer):** "In my working release, rename 'Consignment parties' to 'Consignment addresses' everywhere it appears: the caption above each page, the task list and check your answers. On check your answers, drop the extra subheadings; the card titles say enough. I haven't got the Welsh yet. Then save it and open a pull request."

**Trial branch:** `feat/NO_JIRA-designer-prototyping-trial-t1-content-pass-r1` (in trade-imports-plants-prototype)
**Outcome:** partial. The rename works and is verified in pictures. The whole flow ran without a single check failure, and the pre-commit hook passed first time on both commits. Three things are marked partial:

- The "drop the subheadings" part was a no-op. The plants check your answers page has no subheadings above its cards.
- The work is not on a `design/*` branch, because the trial fixed the branch name.
- No pull request was opened, because the trial guard rails forbid it. The pull request body was drafted.

## Commits

| Commit | Message | Files |
|---|---|---|
| `5f2ac28` | Start design release plants-working from high-risk-plants | 149: the release folder, `routes-plants-working.js`, `prototype-sets/index.js`, `prototype-sets/descriptions.js`, `overrides.json` |
| `0f54597` | trial(t1-content-pass): plants-working: rename 'Consignment parties' to 'Consignment addresses' on 4 pages; Welsh needed | 6 copy files, all under `sets/plants-working/` |

## Steps taken

1. Read `CLAUDE.md` and `PROTOTYPE.md`. The routing table matched `change-the-words`, for "rename X to Y everywhere".
2. change-the-words step 1: ran `git status`, then `designer:release -- list`. **There is no working release.** Only `high-risk-plants` and `sample-journey` exist, on every branch. The designer said "my working release".
3. The skill says "If they have none, offer `design-release` to make one." Because the run is headless, I made one: design-release section B made `plants-working` with `new:set`. Then I ran:
   - `npm run format`
   - `designer:check --full`, which passed: 149 files, all mine, and 3050 unit tests
   - `designer:show --pages all`, which gave 15 pictures
   Then I staged the 5 paths and committed. The hook passed.
4. change-the-words step 1 again: `designer:where -- src/server/app/sets/plants-working/set.js` said **"Outside this prototype: the weekly update does not cover it."** It should have said "Yours". Cause: `scripts/designer/where/cli.js:72` resolves paths against `process.env.INIT_CWD`, which is the folder `npm` was started from, not the prototype folder. With the full path it said "Yours".
5. Step 2: `designer:words -- find "Consignment parties" --set plants-working --json`. It found 3 copy strings: `sections.parties` on check-answers, `groups.consignment-parties` on the hub, and `sections.consignmentParties` in section-captions, which appears on consignor-select and identification-numbers. There were no template literals, no shared chrome and no pinned tests. The find was accurate and fast.
6. Read the old prototype commit `8283340` to find out what "extra subheadings" meant. It removed the `<h3 class="…subsection-heading">` lines above each card and kept the numbered `h2` section headings, including "N. Consignment addresses". The plants `check-answers/template.njk` has only the numbered `h2`s and `govukSummaryList` card titles (h3, inside the card). **There are no subheadings to drop.** Removing the numbered `h2`s would also remove the heading the designer had just asked to rename. I made no template change.
7. Step 3 (shared chrome): nothing to do. Step 4 (plan): 3 strings on 4 pages. The skill says ask "Go ahead?". The designer had already listed exactly these places, so I went ahead. Step 5 (style): no issues.
8. Ran `designer:where` on all 6 copy files (full paths): 6 yours. Step 6: edited 3 English strings and 3 Welsh strings. The Welsh became `'[Welsh needed] Consignment addresses'` and `'[Welsh needed] 3. Consignment addresses'`. The skill says "the new Welsh is `[Welsh needed] <the new English>` for the whole string", so the "3. " sits after the marker.
9. Step 8: `designer:check --quick` passed, with "3 pieces of text still need Welsh". `designer:show --pages changed` took pictures of **all 15 pages**, not only the 4 that changed, and no before pictures. I ran it again with `--pages consignors/select,identification-numbers,hub,check-answers --before` and got 8 pictures. I opened all 4 "now" pictures.
10. Step 9: `designer:words -- report plants-working` found 439 strings, 3 of them marked `[Welsh needed]`.
11. share-my-change:
    - Ran `git status --porcelain` and `designer:where -- --changed`: 6 yours. With `--changed`, repo-relative paths work.
    - Kept the trial branch. The skill would have made `design/plants-working-consignment-addresses`.
    - Ran `npm run format`, then `designer:check --full`, which passed.
    - Staged 6 files by name. `git commit` passed the hook first time.
12. Drafted the pull request body from `references/pr-body.md` to `.cache/designer/share/pr-body.md`. No push and no `gh pr create`, because the trial guard rails forbid them.
13. Switched back to `feat/NO_JIRA-designer-prototyping`. `git status --short` is clean.

## Does the change work?

Yes, for the rename. I checked each picture myself (`.cache/designer/show/plants-working/2026-09-28T00-20-30/`):

- `consignors-select--now--page--desktop.png`: the caption reads "Consignment addresses" above "Consignor or exporter".
- `identification-numbers--now--page--desktop.png`: the caption reads "Consignment addresses".
- `hub--now--page--desktop.png`: group 3 reads "3. Consignment addresses".
- `notification-view--now--page--desktop.png` (check your answers): the section heading reads "3. Consignment addresses".
- Before pictures are `*--before--*` in the same folder. Starting gallery: `.cache/designer/show/plants-working/2026-09-28T00-17-42/`.
- Welsh report: `.cache/designer/words/plants-working/index.html`.
- Pull request body: `.cache/designer/share/pr-body.md`.
- Accessibility: the automatic check found no problems.

(All paths are relative to the prototype repo, and all are gitignored under `.cache/`.)

Against the success criteria:

| Criterion | Result |
|---|---|
| Every English occurrence changes; Welsh marked; en/cy trees match | Met. 3 of 3 strings. `designer:check` says "17 copy folders match". The two numbered strings read `[Welsh needed] 3. Consignment addresses`, as the skill says. |
| Only `sets/<release>/` and `routes-<release>.js` change; `designer:where --changed` reports only Yours | Met for the change commit (6 files, 6 yours). Starting the release, which had to happen first, also changed `overrides.json` and 2 `prototype-sets` files, as a separate commit. |
| `designer:check` passes; gallery shows the new caption on consignor **and place of destination**, and the new check your answers heading | Partly met. **Place of destination has no "Consignment parties" caption to change.** Its caption is "Destination", from `section-captions/index.js`. The caption is on consignor and identification numbers, and both are verified. |
| Commit on `design/*`, message names change and pages, pull request body lists Welsh needed, hook passes first time | Partly met. The hook passed first time on both commits, the message names the change, and the pull request body lists the 3 Welsh strings. The branch is the trial branch, not `design/*`, and no pull request was opened. |

## Friction

1. **Blocker for the request as worded: no working release exists, and the skill only says "offer" one.** change-the-words step 1: "If they have none, offer `design-release` to make one." A designer who says "my working release" expects one to be there. Making one adds:
   - a 149-file commit
   - a full check (about 1 minute)
   - a 15-page gallery
   - a detour through a second skill

   The change-the-words skill has no "then come back to step 1" instruction. The design-release commit also touches `overrides.json` and `prototype-sets/*`, which would upset a "Yours only" check if the two were saved as one change.

2. **Major: `designer:where` gives a wrong ownership answer for repo-relative paths unless Claude Code was started inside the prototype folder.**
   - The skills tell you to run `npm run designer:where -- src/server/app/sets/<release>/set.js` and "Stop if it does not" say Yours.
   - When it is launched with `npm --prefix`, or from a parent folder (both common when Claude Code opens a workspace), it says "Outside this prototype".
   - Followed literally, the skill stops here.
   - Cause: `scripts/designer/where/cli.js:72` uses `process.env.INIT_CWD ?? process.cwd()`.
   - `--changed` is unaffected, because it gets its paths from git.

3. **Major: the request mixes a words change with a layout change, and the skills don't say how to handle that.** "Drop the extra subheadings" is template work, which is `match-the-design`. change-the-words says: "Never touch templates … (moving it is `match-the-design` work)". CLAUDE.md says "When a request fits two skills, pick the one for the main change and say which part another skill will do next", but gives no way to do both in one turn. In this case the plants page had no such subheadings, and finding that out meant reading old prototype history. A real designer would get either no change or a wrong change, where the numbered section headings are deleted.

4. **Major: the designer asked for a pull request; the skills let that happen only with a separate "yes".** share-my-change says "Ask: 'Shall I send this to GitHub and open a pull request…?' Only on a clear yes". CLAUDE.md rule 8 says "never push or open a pull request without asking". A designer who wrote "then … open a pull request" has already asked. The skill doesn't say whether that counts as the yes, so there is an extra round trip, or doubt about whether it counts. (In this trial the guard rails forbade it anyway.)

5. **Minor: `designer:show --pages changed` photographed all 15 pages, not the 4 whose words changed.** It took twice as long and filled the gallery with 11 unchanged pages. The skill's step 8 command also has no `--before`, so the designer gets no before-and-after pair unless they ask again.

6. **Minor: the page names for `--pages` don't match the picture names or the find output.** The find says `consignor-select`, the picture is `consignors-select--…`, and the flag takes `consignors/select`. Check your answers appears as `notification-view` in both the find output and the gallery, but the flag is `check-answers`. I guessed, and the guess worked.

7. **Minor: the skill's own example is wrong about "6 pages".** The skill, `commit-message.md` and CLAUDE.md all use "rename 'Consignment parties' to 'Consignment addresses' on 6 pages" as the example. The real count is 4. A literal copy would mislead. The skill's own plan table also lists `notification-view (check your answers)`, but the page is titled "Check your answers", and `notification-view` is internal.

8. **Minor: the commit message rules clash with a trial or team prefix, and the length cap is easily broken.** The "under 100 characters" rule is already at 96 characters for this example before any prefix.

9. **Minor: the full check and the pre-commit hook print a 300-line coverage table.** A designer sees pages of `% Stmts | % Branch` with no summary line saying "saved". The plain-English `designer:check` output is good by comparison.

10. **Minor: stale comment left in the copy.** `hub/copy/copy.en.js` still says "AWAITING THE COPY PASS — 'Arrival and destination' and 'Consignment parties' are new hub strings". The skill says change only the text inside quotes, so the comment now names a string that no longer exists.

11. **Minor: no example link opens a changed page directly.** `designer:examples -- links` gives 4 links: draft-just-started, draft-midway, submitted and amended. None lands on the consignor, the task list or check your answers. The pull request body's "Pages changed" links all have to say "open the task list, then…".

12. **Minor: the consignor page carries the caption but is not a task list row.** Group 3 on the task list has "Identification numbers" and "Contact address for consignment". "Consignor or exporter" is reached from somewhere else. So "Consignment addresses" now labels a group that holds no address page, except the contact address. That is a content-design issue a designer would want flagged. Neither skill mentions it.

13. **Environment (not the designer's fault): workspace rules loaded into the prototype session.** Because the session opened in the workspace, `.claude/rules/{gds,node,copy}.md` from the parent workspace auto-loaded. Their pointers (`docs/best-practices/...`) are outside the prototype. A designer running inside the prototype would not see these.

## Time-wasters

- Making the working release: new:set, format, full check (about 1 minute), a 15-page gallery (about 1 minute) and a commit with hook (about 30 seconds). That was about 4 minutes before the real work started.
- `npm run format` over the whole repo twice, printing about 80 KB of "(unchanged)" lines each time.
- The first `designer:show --pages changed` run shot 15 pages, then a second run was needed to get before-and-after.
- Working out the page names for `--pages`.
- Reading old prototype history to find out that "extra subheadings" doesn't apply here.
- The full check and the pre-commit hook run the same 3050 tests back to back. About 20 seconds each, and all of it is repeated.

## What worked well

- `designer:words find` was spot on. It gave exact files, lines, the Welsh files and lines, and the pages each string appears on.
- `designer:check` output is plain English and useful: "6 files changed: 6 yours", "3 pieces of text still need Welsh", and "A commit made now will pass the pre-commit hook", which proved true.
- `designer:show` needs no dev server, leaves port 3103 alone, and produced clean before-and-after pictures.
- The hook passed first time on both commits.
