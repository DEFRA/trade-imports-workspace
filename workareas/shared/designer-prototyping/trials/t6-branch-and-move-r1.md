# Trial t6-branch-and-move, round 1

**Request:** "On arrival details, ask 'Is the consignment arriving in more than one vehicle?'. If yes, show a new page asking how many vehicles. And move place of destination so it comes before the consignor."

**Branch:** `feat/NO_JIRA-designer-prototyping-trial-t6-branch-and-move-r1` (2 commits: `2ab0777` start release, `2af33c3` the branch change)
**Outcome:** partial. The branch works and passed every check. The move was a no-op (the recipe says to change nothing when the page is already in place). The gallery cannot show both branches side by side.

## Steps taken

1. Read `CLAUDE.md` and `PROTOTYPE.md`. Routed to `change-the-journey`.
2. Skill step 1: `designer:release -- list` showed only `high-risk-plants` and `sample-journey`. **There is no working release.** The skill does not cover this case (friction 1). Switched to the `design-release` skill, section B.
3. `new:set -- plants-working --from high-risk-plants --describe ... --purpose working`, then `format`, then `designer:check --full` (all green, 3050 tests), then `designer:show --pages all` (15 pictures), then committed "Start design release plants-working from high-risk-plants". The pre-commit hook passed.
4. `routes.md` sends a question that decides whether a later page shows to **add-a-branch**. The move goes to **move-a-page**. The skill says "one change per run", so I did two runs one after the other, the way a designer would ask for them.
5. Run 1 (add-a-branch):
   - Read the recipe, `add-a-page.md`, `obligations/sections/arrival.js`, and the arrival-details and arrival-status features.
   - `designer:where` with relative paths said every file was **"Outside this prototype"** (friction 2). Absolute paths said "Yours".
   - Starting point: the full check from step 3 was already green.
   - Made two UUIDs with `uuidgen` and searched `src/` to confirm neither was already used. The recipe does not say how to make a UUID (friction 3).
   - Added the obligations `moreThanOneVehicle` and `numberOfVehicles`. The second has `applyTo: equalsGate(moreThanOneVehicle, 'yes', …)`. Exported both and added both to `obligations`.
   - Added the bindings in `arrival-details/evaluation.js` and in a new `number-of-vehicles/evaluation.js`, and registered the new one in `features/evaluation.js`.
   - arrival-details: added a `MORE_THAN_ONE_VEHICLE` field, added it to `collects`, added a `requiredOneOf` rule, added it to `valuesFrom`, and rendered it as inline `govukRadios`. Added the words to the English copy and `[Welsh needed]` versions to the Welsh copy.
   - New `number-of-vehicles` feature: `page.js`, `controller.js` (copied from arrival-status, using `requiredIntegerInRange` 2–99), `template.njk` (`govukInput`, numeric, width-2, `showReturnControls = false`) and both copy files.
   - Registered the page in `features/index.js` (`dispatchPages` and `allRoutes`), `flow.js` (arrival section), `run.js` (step straight after arrival-details), `task-rows.js` (arrival row) and `section-captions` (arrival).
   - Check your answers: added `answerRow('moreThanOneVehicle', copy.yesNoLabels[…])` and `...scopedRows(['numberOfVehicles'])`. Added the labels and `yesNoLabels` in English and Welsh.
   - `happy-path.json`: added `"moreThanOneVehicle": "no"` to all 5 arrival-details steps. Added a new scenario, `plantsForPlantingTwoVehicles`, which answers Yes and fills a number-of-vehicles step with 2.
   - `format` → `designer:check --full` PASS (12 Welsh strings waiting) → `designer:examples -- check` 4/4 reached → `designer:check --walk` PASS. The log shows `plantsForPlantingTwoVehicles … reaches confirmation`, so both branches were walked.
   - `designer:show --pages arrival-details,number-of-vehicles,notification-view --errors` produced 5 pictures. I opened all of them.
   - `designer:examples -- links` gave 4 links, none of them on the Yes branch.
6. Run 2 (move-a-page): searched the release for `consignorPage` / `'consignor-select'` / `consignors/select` / `placeOfDestinationPage` / `destinations/select`. Place of destination **already comes before the consignor** in all four orders:
   - RUN_STEPS: step 6 against step 7
   - flow sections: `destination` before `parties`
   - task list: group 2 against group 3
   - check your answers: the destination card is in the arrival section, the consignor card in the parties section
   - `happy-path.json` step order agrees

   The recipe says: "If a page is already where the designer wants it, say so and change nothing." I changed nothing.
7. Committed with the "Recipe: add-a-branch" line, switched back to `feat/NO_JIRA-designer-prototyping`, and confirmed `status --short` was clean. I never started the dev server: `designer:show` starts its own private copy on port 3203.

## Pictures

Gallery: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T01-17-37/index.html`
- `arrival-details--now--page--desktop.png`: the Yes/No radios sit below place of landing. This is the **potato** scenario, so the time and landing fields show too.
- `arrival-details--now--errors--desktop.png`: all 4 errors, including "Select yes if the consignment is arriving in more than one vehicle".
- `number-of-vehicles--now--page--desktop.png` and `--errors--`: the "Arrival" caption, the heading as the label, and the required error. The "Save and return" buttons are hidden, as the recipe intends.
- `notification-view--now--page--desktop.png`: the "Arriving in more than one vehicle? No" row. **No Yes-branch check your answers is shown.**

Starting gallery (before the change): `.cache/designer/show/plants-working/2026-09-28T01-12-19/index.html`

## Friction

1. **major: change-the-journey step 1 has no route for "no working release exists".** "If not, run `npm run designer:release -- list` and pick the working release changed most recently." Nothing handles zero releases. A literal agent would stall here, or be tempted to edit high-risk-plants. Fix: "If there is no working release, run design-release section B first (suggest `plants-working`), then come back."
2. **major (for agents): `designer:where` resolves relative paths against the caller's cwd (INIT_CWD), not the repo.** When run with `npm --prefix`, every release file comes back "Outside this prototype: the weekly update does not cover it", which is wrong and alarming. It should resolve against the repo root, or say "that path is not inside this repo — did you mean …?".
3. **minor: "A new obligation gets a new random UUID"** does not say how to make one. `uuidgen` works on a Mac. The case (existing ids are lower case) is also not stated. Fix: name the command, or add `designer:uuid`.
4. **blocker for the success criteria: `designer:show` photographs each page once, from the *first* scenario that reaches it.** In `targets.js`, `firstReaches` keys a Map by slug. So the gallery cannot show "both branches side by side". notification-view comes from warePotatoes (No), and arrival-details also comes from a potato scenario rather than plants. There is no `--scenario`/`--example` flag. Fix: when a page is reached by several scenarios whose answers differ on that page (or when `--branches` is passed), capture it once per scenario and label each picture with the scenario name.
5. **major: no Yes-branch example link.** add-a-branch step 7 admits the four chooser examples are built from the first four scenarios, which all answer No, so "a link straight to the Yes branch" needs a separate example-data run. A designer sharing a branch wants both links at once. Fix: have the recipe add the example in the same run, or have `designer:examples` offer a scenario-to-link helper.
6. **major: "Answer No skips and clears the page" is never proved.** The walk takes each scenario forward to confirmation. Nothing changes Yes to No and checks that `numberOfVehicles` is purged and its check your answers row disappears. The recipe's "What you will see" claims it, but the ladder never exercises it. Fix: a `--walk` probe per `applyTo` gate (answer the gate, then flip it, then assert the dependent answer is gone).
7. **major: the trial's move request is already true in the journey.** The move-a-page worked example is the opposite swap and states the current order. A designer bringing old-prototype intent would be confused. The skill handled it correctly ("say so and change nothing"), but gave no easy way to show the designer that the order is already right. The pages-all gallery shows it only implicitly. Fix: `designer:check --order <pageA>,<pageB>`, or print the four orders.
8. **minor: "One change per run"** clashes with a normal compound designer request (branch plus move). The skill says to list the rest, which pushes a second prompt onto the designer. The `design-session` workflow exists but the skill does not point to it. Fix: when the request has 2 or 3 parts, offer design-session, or loop within the skill.
9. **minor: `npm run format` prints about 78 KB (every file, "unchanged").** It floods the agent's context on every run. Fix: `prettier --write --log-level warn`, or a `format:quiet` script.
10. **minor: `--walk` re-runs the whole full check (lint plus 3050 tests, about 40 s) straight after step 1 ran it.** The ladder says to run `--full` and then `--walk`, so the same work runs twice. Fix: `--walk` alone should only walk, or the ladder should say "`--walk` includes `--full`".
11. **minor: the gate question lands at the bottom of arrival-details, after the potato-only fields.** The recipe says "a Yes or No question below the date", which is only true for plants and wood. Not a bug, but the recipe's description is wrong for potatoes.
12. **minor: Welsh.** The skill says to use `[Welsh needed]` for "Yes" and "No". Existing check-answers Welsh already has "Ydy"/"Nac ydy" style labels, which could be reused. The check reports 12 Welsh strings waiting, which is fine.
13. **minor: the design-release skill says to commit the start, but change-the-journey says "Do not commit".** This is inconsistent about who saves. It was harmless here.

## Did the change work?

- Branch: **yes.** The full check passed, examples reached 4/4, and the walk passed with both the No and Yes scenarios reaching confirmation. The pictures show the question, its error, the new page and its error, and the check your answers row. `applyTo` gating is in place. Clearing on No is **not verified** (see friction 6).
- Move: **no change needed.** The page is already in the requested order. No flow, run or task-row edits were made.
- No test or spec files were created in the release (the full check's ownership line says every file changed is yours, and I added none).

## Time-wasters

- `designer:where` giving "Outside this prototype" for every path.
- Finding out after the show run that the gallery cannot hold two scenarios, then reading `targets.js` to confirm it.
- Running the full check twice (`--full` then `--walk`) and running the pre-commit hook twice.
