# Trial t7-confirmation-revert-handoff, round 1

Branch: `feat/NO_JIRA-designer-prototyping-trial-t7-confirmation-revert-handoff-r1` (in trade-imports-plants-prototype, from `feat/NO_JIRA-designer-prototyping`)
Outcome: **success, with friction.** All four success criteria were met. Two of them were only met because I stepped outside what the skills literally say (see F1 and F2).

## What I asked (as the designer)

1. "Put the reference number in a green panel on the confirmation page with a 'What happens next' section under it."
2. (After seeing it) "Actually, undo that, go back to how it was."
3. "The 'Consignment addresses' wording is agreed: send it to the real plants team."

## Commits on the trial branch

```
aae1f69 trial(t7-confirmation-revert-handoff): Hand-off brief: Rename Consignment parties to Consignment addresses
e8cf541 plants-working: rename 'Consignment parties' to 'Consignment addresses' on 4 pages; Welsh needed
33285a3 Revert "plants-working: add a 'What happens next' section under the panel on confirmation; Welsh needed"
05b6655 plants-working: add a 'What happens next' section under the panel on confirmation; Welsh needed
3b2fc37 Start design release plants-working from high-risk-plants
```

Every commit passed the pre-commit hook. I never used `--no-verify`. Nothing was pushed: the `upstream` push address reads `DISABLED`, and I never ran `git push`.

## Steps taken

1. Read CLAUDE.md and PROTOTYPE.md. The routing table sends "change the confirmation page" to `change-the-journey`. "Green panel" also fits `match-the-design`. I picked `change-the-journey`, which led to the `confirmation-variant` recipe.
2. `designer:release -- list` showed no design release at all: only high-risk-plants and sample-journey. I followed `design-release` section B:
   - `new:set -- plants-working --from high-risk-plants --describe ... --purpose working`
   - `format`, then `designer:check --full`: everything passed, 3050 unit tests
   - `designer:show --pages all`: 15 pages, no accessibility findings
   - committed as 3b2fc37
3. Looked at the starting confirmation screenshot. **The reference number is already in a green `govukPanel`.** Only the "What happens next" section was new work.
4. Ran `designer:where` on the three confirmation files. It first said "Outside this prototype" (see F3). With absolute paths it said "Yours".
5. Followed the recipe's "Add a section" steps exactly:
   - added `whatHappensNext` to `copy.en.js` and `copy.cy.js`, with `[Welsh needed]` in the Welsh
   - added an `h2.govuk-heading-m` plus a paragraph loop straight under `govukPanel` in `template.njk`
   - left the panel as the existing `govukPanel`, with no custom classes and no Sass
6. Checks: `designer:check --full` passed, and `--walk` passed ("Every journey walked to the end").
7. Show: `designer:show --pages confirmation --before`, gallery `.cache/designer/show/plants-working/2026-09-28T01-24-17/`. I opened both PNGs:
   - **before:** panel, then body text
   - **after:** panel, then "What happens next" (h2) and two paragraphs, then body text
   - no accessibility findings
8. Saved the change (05b6655, recipe line `confirmation-variant`, "Welsh needed: 3 strings").
9. Undo, following `share-my-change` "The last saved change":
   - `git log -1`, then `git revert --no-edit HEAD`, which made 33285a3
   - `status --porcelain` was empty, and the newest `log -2` line starts with `Revert`
   - `designer:check` passed, and I read the new screenshot: the page matches the original
   - no reset, amend or rebase was used
10. Hand-off:
    - The dry run said "0 files in upstream.patch", because no "Consignment addresses" change existed yet (see F2).
    - So I used `change-the-words`: `designer:words find "Consignment parties"` found 3 strings on 4 pages (hub group, check your answers heading, section caption). I edited English and Welsh together and put in `[Welsh needed]`.
    - `--quick` check passed, then `designer:show --pages changed --before`. I read hub and consignor-select: both now say "Consignment addresses".
    - `--full` check passed, then saved as e8cf541.
11. `hand-off` route 1:
    - dry run: 6 files, applies cleanly, 3 Welsh, 8 pinned test places
    - `designer:show --compare high-risk-plants` on the 4 pages
    - `designer:handoff --title ... --why ...`, then read brief.md and the screenshots
    - removed a rationale sentence I had made up
    - I checked `git apply --check handoffs/2026-09-28-consignment-addresses/upstream.patch` against the tree myself: exit 0. The patch touches only `src/server/app/sets/high-risk-plants/...` copy files; the confirmation change and its revert cancel out and are not in it.
    - `format`, then committed the folder as aae1f69.
12. Switched back to `feat/NO_JIRA-designer-prototyping`. `status --short` is clean.

The hand-off folder is `repos/trade-imports-plants-prototype/handoffs/2026-09-28-consignment-addresses/` on the trial branch:

- brief.md
- brief.jira.txt
- report.json
- upstream.patch
- 4 screenshots: hub and notification-view, each as `now` and `compare`

The brief lists the 3 Welsh strings needed. It lists 8 test lines that still expect the old words, in `consignor-select/controller.test.js`, `identification-numbers/controller.test.js`, `hub/copy/copy.test.js` and `section-captions/copy/copy.test.js`.

## Screenshots

- Starting confirmation: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T01-21-22/confirmation--now--page--desktop.png`
- Panel change, before and after: `.cache/designer/show/plants-working/2026-09-28T01-24-17/confirmation--before--page--desktop.png` and `confirmation--now--page--desktop.png`
- After the undo: `.cache/designer/show/plants-working/2026-09-28T01-25-27/confirmation--now--page--desktop.png`
- Wording: `.cache/designer/show/plants-working/2026-09-28T01-26-19/hub--now--page--desktop.png` and `consignors-select--now--page--desktop.png`
- Hand-off: `handoffs/2026-09-28-consignment-addresses/screenshots/*.png`

## Friction, harshest first

**F1 (major): the undo route depends on whether the change was saved, and the change skills tell Claude not to save.**
- `change-the-journey` step 8 says "Do not commit." So the natural flow is: change, show, "undo that". `share-my-change` would then take the "Unsaved edits" route (`git restore`), which leaves no revert commit and no trace in history.
- I only got a revert commit because I saved first.
- The skill says "Ask which of these three the designer means, unless it is obvious". Here it is ambiguous, and nothing tells Claude to prefer saving before showing.
- Fix: either make show/undo recommend "save before you show to others", or have the unsaved route also say plainly that nothing is kept in history.

**F2 (major): the hand-off assumes the change already exists.**
- "The 'Consignment addresses' wording is agreed: send it" names a change that was never made in any release.
- `hand-off` has no step for "the change the designer names is not in the release". The dry run wrote a perfectly happy empty brief: "0 files in upstream.patch. There is nothing to apply."
- Fix: make `designer:handoff` exit non-zero with a plain message when the patch is empty. Add a step to `hand-off`: "If the change is not in the release, make it first with the right skill (change-the-words), save it, then come back."

**F3 (major for agent or remote use, minor for a designer): `designer:where` resolves relative paths from `INIT_CWD`.**
- Run with `npm --prefix <repo> run designer:where -- src/...` from another folder, it reports "Outside this prototype: the weekly update does not cover it" for files that are the designer's own.
- A literal agent would have refused the edit here.
- Fix: resolve relative paths against the repo root when they do not exist under `INIT_CWD`, or say "cannot find this path" instead of "outside".

**F4 (major): no check that the request is already done.**
- The confirmation page already shows the reference in a green `govukPanel`. Neither `change-the-journey` nor the recipe says to look at the starting picture before editing. The recipe even says "The panel is always green".
- A literal agent could rebuild the panel for nothing.
- Fix: add "take a before picture and say which parts of the request are already true" as step 0.

**F5 (minor): two skills fit "green panel ... confirmation page" (`match-the-design` and `change-the-journey`).**
- CLAUDE.md says to pick one, but it is not clear-cut. The recipe hands pure layout to `match-the-design` and sections to itself. OK once you read it, but a guess at first.

**F6 (minor): the success criterion wants a before/after pair, but `change-the-journey` step 7.4 runs `designer:show --pages changed --errors`, which has no `--before`.**
- I added `--before` myself.
- Also, after an undo, `--before` compares against the revert commit, so before and after are identical. There is no way to show "the undone version beside now" without knowing to pass a commit.

**F7 (minor): no release existed, and `change-the-journey` step 1 only says "pick the working release changed most recently".**
- It does not say what to do when there is none. I inferred `design-release` from its refusal rules.
- `design-release` step 3 wants a `design/<id>-start` branch "if on main". On any other branch (like this trial branch) it says nothing.

**F8 (minor): `--walk` reruns the whole `--full` check, and `designer:check --full` then the pre-commit hook rerun the same 3050 tests.**
- Each commit reran the full suite about 3 times in a row. It is roughly a minute each, but wasted.

**F9 (minor): the pre-commit hook prints about 400 lines of coverage table even with `git commit -q`.** A designer would be alarmed, and an agent's context fills up.

**F10 (minor): `npm run format` prints every file in the repo (78 KB).** A designer only needs "tidied N files".

**F11 (minor): the "Tests that pin the old words" list has duplicates.**
- `hub/copy/copy.test.js` line 28 appears twice ("3. Partïon y llwyth" and "Partïon y llwyth"), and line 19 appears twice. The same happens in section-captions.
- The real list is 5 places, not 8.

**F12 (minor): the pages the caption change affects (consignor-select, identification-numbers) get no screenshots in the brief.**
- They were photographed, but only hub and notification-view were copied. They sit under "Across the journey" with no pictures.

**F13 (minor, a content risk): `change-the-words` replaces a real Welsh translation ("Partïon y llwyth") with `[Welsh needed] <English>`.**
- That is correct by the rules. But the brief does not show the old Welsh next to it, so the translator loses context. A "Old Welsh" column in the Welsh-needed list would help.

**F14 (minor): the `--why` prompt tempts invention.**
- The skill says to "Ask once what the change is for", but under "don't ask many questions" I wrote a rationale ("traders read 'parties' as legal jargon") that the designer never gave.
- I removed it by hand. The brief should mark agent-written reasons as unconfirmed.

**F15 (minor): the page names the gallery uses do not match the names it accepts.**
- The gallery files are named `consignors-select--...`, but `--pages consignor-select` is accepted, and so is the name `find` reports.

## Time-wasters

- Three full test runs per commit (F8).
- Working out why `designer:where` said "Outside" (F3).
- An empty hand-off dry run before realising the wording change had to be made first (F2).

## Does the change work?

Yes:

- **Panel section:** it used only the existing `govukPanel` plus `govuk-heading-m` and `govuk-body`. The before/after pair was viewed.
- **Undo:** a clean revert commit, no history rewritten, and the page was confirmed back to the original by screenshot.
- **Hand-off:** the folder is complete. `upstream.patch` passes `git apply --check` against high-risk-plants. The brief lists the Welsh needed and the pinned tests. Nothing was pushed.
