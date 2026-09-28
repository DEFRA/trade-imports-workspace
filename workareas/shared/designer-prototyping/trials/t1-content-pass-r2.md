# Trial t1-content-pass, round 2

**Outcome:** partial. The wording change and its save work, and the hook passed first time on the wording commit. But a blocker in the prototype's own test suite stopped the first save (starting the release). I got past it by fixing a tooling test, which a real designer could not do. The pull request was not opened because this trial run forbids pushing.

## What I asked

> "In my working release, rename 'Consignment parties' to 'Consignment addresses' everywhere it appears: the caption above each page, the task list and check your answers. On check your answers, drop the extra subheadings; the card titles say enough. I haven't got the Welsh yet. Then save it and open a pull request."

## Branches and commits

- Trial branch: `feat/NO_JIRA-designer-prototyping-trial-t1-content-pass-r2`
  - `be12a2c` trial(t1-content-pass): keep the design-release test repo free of the real repo's releases (tooling fix, see F1)
  - `89b58f4` Start design release plants-working from high-risk-plants (150 files, as design-release B.8 says)
  - `88f64b2` plants-working: rename 'Consignment parties' to 'Consignment addresses' on 4 pages; Welsh needed
- Designer branch made by share-my-change step 3: `design/plants-working-consignment-addresses`. I renamed it to `design/plants-working-consignment-addresses-t1r2` so the next trial can use the plain name. The trial branch was fast-forwarded to it, so both point at `88f64b2`.
- The checkout is back on `feat/NO_JIRA-designer-prototyping`, and `git status --short` is clean.

## Steps taken

1. Read `CLAUDE.md` and `PROTOTYPE.md`. Routing: "Words and layout" means `change-the-words`, then `match-the-design`, then `share-my-change`.
2. change-the-words step 1: ran `git status`, then `designer:release -- list`. Only `high-risk-plants` and `sample-journey` exist, so rule 9 applies: start `plants-working`.
3. design-release section B: `new:set -- plants-working --from high-risk-plants --describe ... --purpose working`, then `designer:format` ("already tidy"), then `designer:check --full`. **It FAILED** on `scripts/designer/release/remount.test.js` (F1).
4. Read the failing test. `designer:where` said the fixture is "Yours". Fixed `scripts/designer/release/test-repo.js` so the scratch repo calls `remountReleases` after copying. The full check went green (3105 tests). Saved the fix as its own commit.
5. design-release B.8: staged the 5 paths and committed with `> .cache/designer/commit.log 2>&1`. The hook passed.
6. change-the-words step 1 (again): `designer:where` on set.js said "Yours".
7. Step 2: `designer:words -- find "Consignment parties" --set plants-working` found 3 strings on 4 pages (consignor-select, identification-numbers, hub, notification-view) and 0 template lines.
8. Read `section-captions/index.js` and the hub `GROUPS`. **Place of destination is not in the Consignment parties caption section.** It has its own "Destination" caption and sits in task list group 2 (see F4).
9. Step 5: read `.claude/rules/copy.md`. No style problems. Content note: group 3 holds consignor, identification numbers and contact, so "addresses" over "Identification numbers" is a stretch. This is a note for the content designer, not a change.
10. Step 6: edited 3 English and 3 Welsh strings. Numbered strings became `'[Welsh needed] 3. Consignment addresses'`, as the skill says ("for the whole string"). I also updated the hub copy comment that quoted the old words.
11. match-the-design, steps 1 and 3: found the `notification-view` template (`designer:where` said "Yours"). The template has h1, one h2 per numbered section, and summary cards with h3 titles. There are no other subheadings. The old prototype commit `8283340` shows the "extra subheadings" were h3 lines between the section h2 and each card, and it kept the numbered h2s. So this part was **already done**, and I changed nothing.
12. change-the-words step 8: `designer:check --quick` passed ("3 pieces of text still need Welsh"). Then `designer:show --pages notification-view,hub,consignors/select,identification-numbers --before`. I opened 5 PNGs.
13. share-my-change: `status --porcelain`, `designer:where -- --changed` (6 yours), then `switch -c design/plants-working-consignment-addresses`, `designer:format`, `designer:check --full` (all passed), staged 6 files, committed with a log redirect. **The hook passed first time** (254 files, 3105 tests).
14. share-my-change step 6: did NOT push or run `gh pr create` (the trial's guard rails forbid it). Wrote the PR body to `.cache/designer/share/pr-body.md`, with Welsh needed listing all 3 keys.

## Does the change work?

Yes, for everything the journey really has:

- Consignor or exporter: the caption reads "Consignment addresses" (before: "Consignment parties").
- Identification numbers: the caption reads "Consignment addresses" (before and after both checked).
- Task list: group 3 reads "3. Consignment addresses".
- Check your answers: the section 3 heading reads "3. Consignment addresses". No extra subheadings exist.
- en and cy key trees match ("17 copy folders match"). There are 3 `[Welsh needed]` markers.
- `designer:where --changed` showed only "Yours" for the wording commit, and the commit touches only `sets/plants-working/**`.
- Accessibility (axe): no problems.

Against the success criteria:
- Criterion 3 says the gallery shows the new caption on the **place-of-destination** page. It does not, and it should not: that page's caption is "Destination" in the real journey. The criterion is wrong, not the change (F4).
- Criterion 1: Welsh keys hold `'[Welsh needed] 3. Consignment addresses'` for the two numbered strings, not the bare `'[Welsh needed] Consignment addresses'`. That is what the skill says to do.

## Screenshots

Gallery: `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T02-28-25/index.html`
- `consignors-select--before--page--desktop.png` / `consignors-select--now--page--desktop.png`
- `identification-numbers--before--page--desktop.png` / `identification-numbers--now--page--desktop.png`
- `hub--before--page--desktop.png` / `hub--now--page--desktop.png`
- `notification-view--before--page--desktop.png` / `notification-view--now--page--desktop.png`

PR body: `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.cache/designer/share/pr-body.md`

## Friction

### F1 (blocker): the first save of any new design release fails the pre-commit hook
design-release B.6 `designer:check --full` failed:
`FAIL scripts/designer/release/remount.test.js > remount > Should change nothing when every release is mounted`, which received `removed: ["unmounted plants-working: its folder is gone", ...]`.
`test-repo.js` copies the real repo's `overrides.json` and `src/server/prototype-sets/{index,descriptions}.js` into a scratch repo, but only the `high-risk-plants` and `sample-journey` folders. So as soon as the working tree holds any design release, the scratch repo mounts a release with no folder, and `remount` removes it. Every designer's first save fails. So does every later save on a branch that has a release.
The check's own advice was: "Not caused by your change: tell the maintainer. It still has to be fixed before anything can be saved." A real designer would be stuck at their first step.
**What I did:** added `remountReleases({ repoRoot })` in `makeTestRepo` after copying (commit `be12a2c`, trial branch only). **The base branch `feat/NO_JIRA-designer-prototyping` still has the bug**, so every later trial will hit it until this fix, or a better one, lands there. The Canary on every PR ("makes a throwaway release") should have caught it, but that test runs in CI where no release exists.

### F2 (major): share-my-change always makes a new `design/*` branch, which conflicts with the trial or any feature branch
share-my-change step 3: "On `main` (or any branch that is not `design/*`, `handoff/*` or `maintain/*`): make a new branch named `design/<set-id>-<slug>`". But design-release B.3 says "On any other branch that does not start with `handoff/`, stay on it", and it had already saved the release on the feat branch. The result is the release commit on one branch and the change on a second branch built on top of it. The PR from `design/...` would carry the 150-file release commit and my tooling fix as well. The skills should agree on one rule: design-release B.3 should also move off a non-`design/*` branch before it saves the release.

### F3 (major): change-the-words step 4 asks for confirmation even when the designer said "everywhere"
"If the change spans more than one page, ask once: 'This changes <n> strings on <m> pages. Go ahead?'" The designer said "everywhere" and named all three places, and CLAUDE.md rule 6 says "Never make the designer ask again for a part they already asked for". Headless, I treated the request as the yes. The skill should say an explicit "everywhere" (or listing each place) counts as the go-ahead.

### F4 (major): the task, and possibly designers, assume place of destination is in "Consignment parties"
The find report shows the caption only on consignor-select and identification-numbers, and `section-captions/index.js` puts `placeOfDestinationPage` under `destination`. The skill says nothing about checking that the pages a designer expects are the pages the find reports. When the two lists differ, the skill should tell the designer in one line ("place of destination has its own 'Destination' caption; moving it is change-the-journey"). I have put that in this report.

### F5 (minor): `designer:words find` ignores code comments that quote the words
The skill says change "any code comment in those files that quotes the old words". The hub `copy.en.js` comment on lines 18 and 19 splits "Consignment / parties" across lines, and the find did not list it. I found it only by reading the file. The find could report comment hits separately.

### F6 (minor): the numbered-string Welsh marker disagrees with the success criteria
The skill says `[Welsh needed] <the new English>` "for the whole string", which gives `[Welsh needed] 3. Consignment addresses`. The criterion expects `[Welsh needed] Consignment addresses`. Pick one and state it with a numbered example in the skill.

### F7 (minor): page names differ across tools
`designer:show` calls the task list `hub`, `designer:examples` says `?page=task-list`, and check your answers is `notification-view` in both. share-my-change's example uses `task-list`. A designer cannot guess these. The find report prints them, which helps, but one name per page would be better.

### F8 (minor): the identification numbers picture shows empty boxes on a completed notification
In `identification-numbers--now--page--desktop.png` (GBN-HRP-26-JYTDF9) every box is empty. The same notification's check your answers shows P123 and C123, and the task list says Completed. Either the page does not prefill, or the gallery visits a different state. A designer reviewing words would think their answers were lost.

### F9 (minor): the check your answers example has no Consignor card
The notification-view picture shows section 3 with only the Identification numbers and Contact cards, and the task list group 3 shows no Consignor row, for a potatoes example. If consignor is conditional, fine. But a designer renaming "Consignment addresses" never sees the one address-like card in that section.

### F10 (minor): the skills' own commit commands are awkward headless
The commit's log redirect (`> .cache/designer/commit.log 2>&1`) works, but the guard rails I was given ban most shell features, so it is not obvious a redirect is allowed. My first attempt also used a made-up flag (my error, one wasted call). The hook prints a coverage table of about 300 lines when it is not redirected.

## Time-wasters

- F1 cost the most: reading the failing test and fixture, fixing it, and rerunning the full check (about 3 minutes of checks).
- The full check ran 3 times (release start, after the fix, before the save), plus 2 hook runs. share-my-change says to skip the rerun only when "no file has changed since", which was never true here, so each run was needed. Still, about 5 full-suite runs for a 3-string wording change is heavy.
