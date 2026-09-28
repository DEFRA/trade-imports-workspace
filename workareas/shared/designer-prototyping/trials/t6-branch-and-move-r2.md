# Trial t6-branch-and-move, round 2

Branch: `feat/NO_JIRA-designer-prototyping-trial-t6-branch-and-move-r2` (from `feat/NO_JIRA-designer-prototyping`)

## What I asked

"On arrival details, ask 'Is the consignment arriving in more than one vehicle?'. If yes, show a new page asking how many vehicles. And move place of destination so it comes before the consignor."

## Outcome

- **Branch: works.** A Yes/No question on arrival details. Yes goes to a new "How many vehicles is the consignment arriving in?" page (2 to 99). No skips it, because `numberOfVehicles` has an `applyTo: equalsGate(moreThanOneVehicle, 'yes', …)` gate. Check your answers shows both rows for Yes, and only the Yes/No row for No (`scopedRows(['numberOfVehicles'])`). The examples check reached 5 of 5 examples, the walk took `plantsForPlantingTwoVehicles` through to confirmation, and the full check passed (3105 unit tests).
- **Move: already true, so nothing changed.** Following SKILL.md step 2b, `designer:release -- orders` shows place of destination before the consignor in the first pass (6 vs 7), in the Continue sections, in the task list (group 2 vs group 3), and on check your answers (the arrival section card comes before the parties section card). The skill says to change nothing and show the proof. That is what I did.
- **Trial success criterion 2 cannot be met as written.** "The move updates flow.js, RUN_STEPS, task rows and every page-id place" assumes a move is needed. In this codebase the order was already the one asked for, and both the skill and move-a-page say "If a page is already where the designer wants it, say so and change nothing." The trial brief is wrong here, not the skill. The old-prototype commits show the design came from a journey where the order was different.
- Commits on the trial branch:
  1. `b0c434c` a maintainer fix to a test helper (see blocker F1)
  2. `fe5ecb1` "Start design release plants-working from high-risk-plants"
  3. `812fab9` the change (`Recipe: add-a-branch`)
- The checkout is back on `feat/NO_JIRA-designer-prototyping` and clean.

## Steps taken

1. Read CLAUDE.md and PROTOTYPE.md. Routed to `change-the-journey`: CLAUDE.md "A branch plus a move … `change-the-journey`, part by part in one run".
2. Step 1: only `high-risk-plants` and `sample-journey` existed, so I followed `design-release` section B: `new:set plants-working`, `designer:format`, `designer:check --full`. **It failed** (F1).
3. Diagnosed F1, fixed the test helper, committed it on its own (the hook passed), then committed the release (the hook passed).
4. Step 2: routes.md sent me to add-a-branch (which includes the question) and to move-a-page. The add-a-branch worked example is word for word my request, which was a great help.
5. Step 2b: `designer:show --pages arrival-details,notification-view` and `designer:release -- orders …`. The move already held.
6. Step 3: read add-a-branch, move-a-page, page-id-places, add-a-page (real-service recipe), `arrival.js`, the arrival-details and arrival-status features, the flow files and the check your answers view model.
7. Step 4: `designer:where` on 9 paths. All said "Yours".
8. Step 5: quick check. Green.
9. Step 6: made 2 UUIDs with `uuidgen`, grepped them (no match), then added the obligations, the exports, the bindings, the field, the rule, the radios and copy (en, and cy with `[Welsh needed]`), and the new `number-of-vehicles` feature (page, controller, template, evaluation, copy). I registered it in `features/index.js`, `features/evaluation.js`, `flow.js`, `run.js`, `task-rows.js` and `section-captions`. I added the check your answers rows and copy, added `"moreThanOneVehicle": "no"` to all 5 arrival-details steps, added the `plantsForPlantingTwoVehicles` scenario, ran `designer:examples -- init`, and added the `draft-two-vehicles` example. Then `designer:format`.
10. Step 7: examples check (5/5 reached), `--walk` (passed), `designer:show … --each-example --errors --before` (35 pictures), `examples -- links`, and `orders` again.
11. Committed, switched back, confirmed the checkout is clean.

No `*.test.js` or `*.fit.spec.js` files were created in the release. (The only test-infrastructure file touched was the maintainer fix in `scripts/`, in its own commit.)

## Screenshots

Gallery: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T03-36-26/index.html`

- `arrival-details_plantsForPlantingTwoVehicles--now--page--desktop.png`: the new Yes/No question, inline radios
- `arrival-details_plantsForPlanting--now--errors--desktop.png`: the error summary plus "Select yes if the consignment is arriving in more than one vehicle"
- `number-of-vehicles--now--page--desktop.png` and `--now--errors--desktop.png`: the branch page, and its "Enter how many vehicles…" error
- `notification-view_plantsForPlantingTwoVehicles--now--page--desktop.png`: Yes plus "Number of vehicles 2"
- `notification-view_plantsForPlanting--now--page--desktop.png`: No, with no number row
- Starting pictures: `.cache/designer/show/plants-working/2026-09-28T03-31-37/`

## Friction

### F1: BLOCKER. A new design release cannot be saved; the pre-commit hook fails
- `design-release` B step 6 ("Check it boots and passes every check") and step 8 (commit) both fail on `scripts/designer/release/remount.test.js > Should change nothing when every release is mounted`.
- Cause: `scripts/designer/release/test-repo.js` copies the live `overrides.json` and `prototype-sets/{index,descriptions}.js` into a temp repo. Once a real release exists, those files name `plants-working`, but its folder is not copied. So `remount` reports "unmounted plants-working: its folder is gone".
- Effect: any designer's first action (start a release) cannot be committed without `--no-verify`. The check's message is honest ("Not caused by your change: tell the maintainer. It still has to be fixed before anything can be saved"), but the designer is stuck.
- What I did: added `remountReleases({ repoRoot })` in `makeTestRepo` before the first commit. This normalises the copied mount files to the folders that were copied. I committed it separately as a maintainer fix. The fix needs taking into `feat/NO_JIRA-designer-prototyping` (it is only on the trial branch). A better fix would be to copy the mount files from a pristine source, or to build them fresh.
- It went unnoticed because the base branch has no release, and the "canary" (a throwaway release) apparently doesn't run the unit tests with the release on disk.

### F2: MAJOR. routes.md contradicts SKILL.md on multi-part requests
- routes.md: "If a request mixes several of these ("add a question and move the page"), do the first one, finish it, and list the rest for the designer to ask for next."
- SKILL.md guard rail: "A request with two or three parts … is done part by part in this run … Never make the designer ask again for a part they already asked for." CLAUDE.md says the same.
- I followed SKILL.md/CLAUDE.md. A literal agent reading routes.md could stop after the branch.

### F3: MAJOR (for the trial design). The move was already true
- The skill handled this well: step 2b plus `orders` is exactly the right tool, and the output is clear. The trial's success criterion expects edits that would make the journey wrong. Fix: the trial brief should ask for the reverse move ("consignor before place of destination"), which is also move-a-page's own worked example.

### F4: MINOR. `--each-example` does not really show "both branches side by side" on the gate page
- add-a-branch "How to check it" 4: "`--each-example` takes arrival-details and check your answers once for every example, so the Yes and the No side sit side by side."
- The arrival-details pictures are of the page as first reached, with nothing selected. All 6 arrival-details pictures look identical apart from potato and plant fields. Only check your answers shows the two sides. It also pictures every happy-path fixture (6), not the chooser examples (5): 35 pictures for a 2-page change, and a designer has to wade through them.
- Suggestion: picture the gate page with the fixture's answers filled in, or picture only the fixtures that differ on the changed fields.

### F5: MINOR. Yes to No clearing needs a human in a browser
- add-a-branch: "Then ask the designer to try it once in the browser … The number of vehicles row must be gone." The recipe admits no check proves this. I did the two code checks it lists (`applyTo` gate present; `scopedRows` used). The browser step was not done (headless run). A `designer:show --flip moreThanOneVehicle=no`-style check, or a walk variant, would close this.

### F6: MINOR. Recipe gaps a designer would stumble on
- add-a-branch step 3 says to add `requiredOneOf(MORE_THAN_ONE_VEHICLE, ['yes','no'], …)`, but the arrival-details controller builds rules inside `fields(scope, bounds)` with potato-only rules spread in. Where the new rule goes (outside the potato conditional) is not stated. `valuesFrom` has the same problem: its potato fields are in a conditional spread.
- Step 3 says "render it with govukRadios", but arrival-details does not import `govukRadios`, and the recipe doesn't say to add the import. The template check would catch it, but a designer wouldn't know why.
- Step 4 says to validate with `requiredIntegerInRange('numberOfVehicles', { min: 2, max: 99, messages: { required: ..., invalid: ... } })`. It does not say the field is stored as a string ("2"), which matters for the fixture (`"numberOfVehicles": "2"`, which the recipe does give).
- Step 4 names `features/arrival-status/controller.js` as "the shortest complete controller to copy". It imports `timing-windows` and `statuses`, which have to be stripped out. Worth a clean, minimal template controller.
- Step 6 says "Follow [check-answers](check-answers.md)" and then gives all the specifics inline, so I skipped reading check-answers.md. That was fine, but the pointer adds reading for no gain.
- `.claude/rules/prototype-seed.md` rule 3: "Never edit a set's `happy-path.json` for an example". add-a-branch step 7 tells you to add a scenario to happy-path.json. The rule's qualifier ("in high-risk-plants") comes at the end of the sentence. It reads as a contradiction on first pass.

### F7: MINOR. Tooling output
- `git commit` prints the whole coverage table (hundreds of lines) unless it is redirected. CLAUDE.md warns about this, but `design-release` step 8's first `git commit` example does redirect, and the trial FINISH instruction doesn't. My first commit dumped about 300 lines.
- `designer:format` said "Every file was already tidy.", yet `copy.cy.js` was re-wrapped on disk around the same time (possibly an editor hook). This is confusing either way.
- The workspace-level `.claude/rules/*.md` (Node, GDS, copy) were injected because the prototype sits inside the workspace. A real designer's clone would not see them. That is harmless here, but it means these trials see more guidance than a designer would.

## Time-wasters

- F1 cost the most. I had to diagnose a failing unit test in `scripts/` before any design work could be saved. A real designer would have stopped at "tell the maintainer".
- Reading add-a-page.md (real-service recipe, 365 lines, mostly test steps and out-of-date counts) to get steps 1 to 6. The add-a-branch recipe already inlines almost everything needed.
- 35-picture gallery for a 2-page change.

## Hand-off notes
- The new questions have no backend home. There is no Welsh (13 `[Welsh needed]` strings).
- Recipe line for the brief: `Recipe: add-a-branch` (no move-a-page, because nothing moved).
