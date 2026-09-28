# T7 confirmation page, revert, hand off — round 3 (confirmation run)

- Suite HEAD: `a15770a fix: act on designer suite review` on `feat/NO_JIRA-designer-prototyping`
- Trial branch: `feat/NO_JIRA-designer-prototyping-trial-t7-confirmation-revert-handoff-r3`
- Outcome: **partial**. Every success criterion was met on the final branch. But I only got there by working around one blocker in the suite, and by departing from the skill's literal undo route.
- Nothing was pushed. No PR was opened. No stash entries were left. I ended on the suite branch with a clean tree.

## Trial branch history

```
f9e0885 Hand-off brief: Rename Consignment parties to Consignment addresses
ee1eda8 plants-wip: rename 'Consignment parties' to 'Consignment addresses' on 4 pages; Welsh needed
15b107e Revert "plants-wip: add a 'What happens next' section to confirmation; Welsh needed"
94963c7 plants-wip: add a 'What happens next' section to confirmation; Welsh needed
413d915 Start design release plants-wip from high-risk-plants
```

## What happened, step by step

1. **Read CLAUDE.md and PROTOTYPE.md.** The routing is clear. The confirmation panel goes to `change-the-journey`, using the `confirmation-variant` recipe. It does not go to `match-the-design`, which is what the plan table says for T7.
2. **No working release existed.** Rule 9 says to make `plants-working` without asking. `new:set` worked and `designer:format` worked. **Then `designer:check --full` FAILED** in `scripts/designer/suite.test.js` › "every real-service file a designer file names by path exists". Six designer docs and workflow tests name example paths under `src/server/app/sets/plants-working/...`, for example `design-gaps.md`, `x/template.njk` and `docs/fidelity-transporter-type.md`. The test's `namesAnExampleSet` exemption only applies while no set with that id exists. As soon as a designer makes `plants-working`, the exact id that CLAUDE.md, change-the-journey and change-the-words all tell them to use, those example paths count as promises and the test fails. The pre-commit hook runs the same test, so **the release cannot be saved**. The check told me "Not caused by your change: tell the maintainer". That is honest, but it leaves a designer stuck on the first step of every skill.
   - Getting unstuck: `designer:release -- retire plants-working` cleanly removed the unsaved release. It printed "It is still in git history", which is wrong because the release was never saved. I then made the release as `plants-wip` instead, and the full check and save went through (413d915).
3. **Confirmation panel (change-the-journey, confirmation-variant).** Step 2b is good. The picture showed the reference number is already in a green `govukPanel`, and routes.md says so too. So the only part left was "What happens next". I copied the recipe's snippet verbatim: English copy, Welsh with `[Welsh needed]`, and `govuk-heading-m` plus `govuk-body` paragraphs in the template. The quick, full and `--before` show steps all passed. I opened both pictures. Before: the panel, then the body and the links. After: the same, with a "What happens next" h2 and two paragraphs above the links. The panel was not touched, so the change uses `govukPanel` only.
4. **"Undo that, go back to how it was."** Taken literally, change-the-journey hands this to share-my-change "Unsaved edits", which runs `git stash push --include-untracked`. That does **not** give the revert commit that the T7 criteria require, and my run rules said to stash nothing. So I saved the change first with share-my-change Share, skipping the second full check because the skill allows it (94963c7). Then I followed "The last saved change": `git revert --no-edit HEAD` gave 15b107e and a clean tree, with no history rewritten. Verify: the quick check passed. `designer:show --before-commit HEAD~1` pictured "now" without the section and "before" with it. I opened both.
5. **"Send the Consignment addresses wording to the real team."** hand-off step 4 found the words were never made in this release (`designer:words find` returned 0). CLAUDE.md "Hand off a change that was never made" says to make it first. I followed change-the-words:
   - The find listed 3 strings on 4 pages plus 1 comment. That is 5 pages or fewer, so no sweep was needed. I edited English and Welsh together and updated the comment.
   - Step 5 asks for a content note when the group no longer fits its contents. The group holds identification numbers and contact details. To confirm that I had to read `hub/controller.js` `GROUPS`, which is JavaScript a designer cannot read. I logged a `design-gaps.md` row in the shape the skill gives.
   - The quick check, the `--before` show and the full check all passed. I saved it as ee1eda8. I opened the task list, consignor and check-your-answers pictures, and all show "Consignment addresses".
6. **hand-off route 1.**
   - The `upstream` push address was already DISABLED. `git fetch upstream main` worked.
   - The dry run gave 6 patch files, 3 Welsh strings, 6 pinned tests, 16 spec quotes and 1 design gap.
   - I ran `--compare high-risk-plants` on notification-view, hub, consignors/select and identification-numbers, then wrote the folder with `--since 15b107e`. `--why` uses only the designer's words.
   - I read brief.md in full and opened the hub compare picture, which shows the real journey still says "Consignment parties".
   - `git apply --check --verbose upstream.patch` passes against high-risk-plants. The brief says it also applies to upstream/main.
   - After `designer:format` I saved it with designer:save (f9e0885). The route stopped there; I did not push and did not open a PR.

## Success criteria

| Criterion | Result |
|---|---|
| Panel change uses `govukPanel` only; show gives a before/after pair | Met. The panel already held, so only "What happens next" was added. Before/after pair taken and read. |
| Undo produces a revert commit and a clean tree; no history rewritten | Met, but only because I saved first. The skill's literal route for the scenario as worded (undo straight after seeing it, unsaved) is `git stash`, which gives no revert commit. |
| Hand-off folder has brief.md, brief.jira.txt, screenshots, upstream.patch passing `git apply --check`, pinned tests and Welsh needed; nothing pushed | Met. 8 screenshots, 6 pinned tests, 3 Welsh strings, 16 spec quotes, patch checked independently. |

## Friction (harsh)

1. **BLOCKER: `plants-working`, the default release id, breaks the suite's own self-test.** `scripts/designer/suite.test.js:222-252` exempts example paths only while the set is absent. Making `plants-working`, as rule 9 and three skills tell you to, fails `designer:check --full` and the pre-commit hook. Every save is blocked. Every trial or real designer who starts from an empty repo hits this on step 1. Fix: either exempt `plants-working` and `a-set` by name as documented example ids, or better, have the test ignore paths inside any `sets/<id>/` that is not `high-risk-plants` or `sample-journey`. Also add a canary test that runs `new:set plants-working` followed by the suite test.
2. **MAJOR: the undo route does not match the trial, and it stashes.** When "undo that" comes straight after an unsaved change, share-my-change uses `git stash push`. The plan's T7 criterion expects a revert commit. A stash is invisible to a designer, builds up over a session, and is the thing the harness forbids. Decide on one behaviour. Either change skills save before showing, so undo is always a revert, or T7's criterion accepts a stash. Right now the skill and the plan disagree.
3. **MAJOR: the plan and routing disagree about the skill.** The plan says T7 exercises `match-the-design`, but CLAUDE.md routes the panel to `change-the-journey` (confirmation-variant). The routing is right, so the plan should be updated.
4. **MINOR: `retire` on an unsaved release says "It is still in git history if you need it back".** That is false, because it never was in history. It also tells you to "Save the removal with one commit", but there is nothing to save.
5. **MINOR: the content-note row doesn't fit the design-gaps columns.** change-the-words step 5 says to write (page, "Content note", note, "Content designer to review", "None"). That puts the note in "Closest option built" and the action in "Why". The brief then renders it as "what the design wants: Content note; closest option built: The group …; why: Content designer to review", which reads badly for the real team.
6. **MINOR: confirming the content note needs JavaScript.** To know which rows sit under a task-list group, a designer has to read `hub/controller.js` `GROUPS`. `designer:words page task-list` or the find output could list each group's rows.
7. **MINOR: `designer:handoff` writes files that are not tidy.** `designer:format` then reformats brief.md and report.json. The generator should write prettier-clean output.
8. **MINOR: brief headings use internal names.** It says "Hub (hub)" and "Notification view (notification-view)" instead of "Task list" and "Check your answers", although the skills say to use "the task list" with designers.
9. **MINOR: reference numbers change between pictures.** Each show run makes a new reference number, so "before" and "now" differ in text that has nothing to do with the change. That is noise in a visual diff.
10. **MINOR: stray docs folder.** A new release carries `docs/README.md`, but routes.md says "A design release does not carry a `docs/` folder".
11. **NOTE: `git revert` bypasses `designer:save`.** The skill uses plain `git revert --no-edit HEAD`, so none of designer:save's log capture or check messaging applies. It worked here, but it is inconsistent with "use designer:save for every save".

## What worked well

- Step 2b ("check what already holds") correctly stopped a pointless panel rebuild.
- The confirmation-variant recipe snippet was usable verbatim.
- designer:check output is plain, specific and honest about blame.
- The hand-off brief is thorough: pinned tests, spec quotes, Welsh for the translator, and a clean-apply statement against both the prototype and upstream/main.
- Every save's pre-commit passed first time after a green full check, as the docs promise.
