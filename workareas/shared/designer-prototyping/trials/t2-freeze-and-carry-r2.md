# Trial t2-freeze-and-carry, round 2

Branch: `feat/NO_JIRA-designer-prototyping-trial-t2-freeze-and-carry-r2` (in `repos/trade-imports-plants-prototype`, 4 commits, not pushed). The checkout is back on `feat/NO_JIRA-designer-prototyping` and clean.

## What I asked

"Freeze what we've got as Design release 2 so the developers have something stable, and give me a working copy to carry on in. Then carry last week's 'Consignment addresses' change into DR2 as well."

## Outcome: success, after one maintainer-level fix

Every success criterion holds on the trial branch:

- `plants-dr2` has `release.json` with `purpose: frozen`, `frozen: true` and `frozenAt`. The working release `plants-dr2-1` was made from it. Both have their two lines in `overrides.json` `ours` (lines 60 to 63).
- The chooser shows the right things for every set. High risk plants is tagged "Real journey, updates weekly" with 9 example links. Plants dr2 1 is tagged "Working release", with my description, "Made from Plants dr2 on 28 September 2026" and 4 example links. Plants dr2 is tagged "Frozen", with its description, "Made from High risk plants on 28 September 2026" and 4 example links. Sample journey is tagged "Placeholder".
- The carry of `88f64b2` rewrote `sets/plants-working/` to `sets/plants-dr2/` and applied the change cleanly to 6 copy files. English says "Consignment addresses". The Welsh has `[Welsh needed]`. The words show on the hub, the check your answers page (notification-view) and the captions on consignors/select and identification-numbers. That change has no question ids, so the uuid rewrite was not exercised.
- After the freeze, a carry into `plants-dr2` is refused with: `"plants-dr2" is frozen, so nothing can be added to it. Carry it into "plants-dr2-1", the working release made from it, instead: carry --to plants-dr2-1. To have a change in a frozen release, carry it in before you freeze.` A hand edit to the frozen release fails `designer:check`, which says "plants-dr2 was frozen in 66e6825, so nothing in it may change". `designer:where` answers "This is a frozen release. Start a working release from it instead." I reverted that test edit.
- `designer:check --set plants-dr2-1 --full` passes with 4 sets mounted (3,109 unit tests). `npm run test:fit:journeys` passed 18 of 18. It walked all 5 example journeys to confirmation in both `plants-dr2` and `plants-dr2-1`.

**But it only worked because I fixed a test in `scripts/`.** Without that fix, the full check and the pre-commit hook fail as soon as any design release exists on disk, so a designer cannot save at all. See friction 1.

## Steps I took

1. Read `CLAUDE.md` and `PROTOTYPE.md`. Routed to `design-release` from the phrase "freeze what we've got as design release 2". Read its `SKILL.md` and `docs/designers/design-releases.md`, as the skill says to.
2. Ran `designer:release -- list`. Only `high-risk-plants` and `sample-journey` exist on this branch, so "what we've got" is not a release yet. Section C step 1 says: "If the work is not in a release yet, start one first (section B) with the frozen name".
3. Looked for last week's change with `git log --all --oneline -- src/server/app/sets/...` (filtered with `--grep`). There were **3 separate commits** with the same message, all dated today. I chose `88f64b2`, the newest, because it is on a `design/` branch.
4. Section B: `new:set -- plants-dr2 --from high-risk-plants --describe "Design release 2: frozen for the developers to build from" --purpose working`. I chose `working` on purpose so the carry could still go in (see friction 4). Then ran `designer:format`, which found nothing to tidy.
5. Ran `designer:check -- --set plants-dr2 --full`. **FAILED**: `scripts/designer/release/remount.test.js` "Should change nothing when every release is mounted". The check said "Not caused by your change: tell the maintainer. It still has to be fixed before anything can be saved."
6. Diagnosed and fixed it: `test-repo.js` copies the live `index.js`, `descriptions.js` and `overrides.json`, which now mount `plants-dr2`, but it does not copy that release's folder. So `remount` "removes" it. The fix: `makeTestRepo` now runs `remountReleases({ repoRoot })` before its first commit. I committed that as `c51abe4`. After that the full check passed with 3,105 tests.
7. Skipped section B step 7 (the starting gallery of every page). It is slow and not needed before a freeze. That is a deviation from the skill.
8. B step 8: staged exactly the 5 listed paths and committed "Start design release plants-dr2 from high-risk-plants" (`ba3708a`). The hook passed.
9. Section D: `carry --from plants-working --to plants-dr2 --commit 88f64b2`, which printed "Carried the change". Quick check passed. `designer:words -- find` listed 4 pages. `designer:show --pages notification-view,hub,consignors/select,identification-numbers --before` produced a gallery with 8 pictures and a clean accessibility check. I read the hub and identification-numbers pictures: the new heading and caption show. Committed as `31f6c37`.
10. Section C step 3: `freeze plants-dr2 --as plants-dr2-1 --describe "Working copy of design release 2: carry on designing here"`. Then `designer:format`, then `designer:check --set plants-dr2-1 --full`, which passed. Committed "Freeze design release plants-dr2; carry on in plants-dr2-1" (`66e6825`).
11. Section C step 6: pictured the chooser and read it (details in the outcome above).
12. Tested the refusals (carry into a frozen release, and a hand edit caught by the check), then reverted the hand edit.
13. Ran `test:fit:journeys` to a log: 18 passed. I did not need `npm run dev`, because `designer:show` starts its own private copy on port 3203.

## Pictures

- Carry gallery: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-dr2/2026-09-28T02-36-06/index.html` (hub, notification-view, consignors-select and identification-numbers, before and now)
- Chooser: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-dr2-1/2026-09-28T02-38-23/chooser--now--page--desktop.png`
- Logs: `workareas/shared/designer-prototyping/logs/t2r2-*.log`, and the fit run in `t2r2-fit-journeys.log`

## Friction

1. **BLOCKER: the full check and the pre-commit hook fail as soon as any design release exists.** `remount.test.js` "Should change nothing when every release is mounted" fails because `scripts/designer/release/test-repo.js` copies the live mount files but only the two fixed set folders. The check then tells the designer "Not caused by your change: tell the maintainer". That is wrong: making the release is what caused it. And the designer is stuck, because nothing can be saved, not even the release commit that skill B step 8 insists on. Round-1 trial branches must have hit the same thing (or had no release in the working tree). Fix: remount the copied files in `makeTestRepo`, which is what I committed in `c51abe4` on the trial branch. Port it to `feat/NO_JIRA-designer-prototyping`. The check's "not caused by your change" wording for a test under `scripts/designer/` also needs looking at.
2. **MAJOR: "last week's change" cannot be told apart.** `git log --all` shows 3 commits with the identical message `plants-working: rename 'Consignment parties' to 'Consignment addresses' on 4 pages; Welsh needed` (`88f64b2`, `e8cf541`, `0f54597`), plus a carried copy `937ac53`, all dated today. Skill D step 1 says only "find its commit". It gives no rule for choosing between duplicates and no advice to show the designer the candidates with dates and branches. I picked the newest one on a `design/` branch without asking. Suggestion: `designer:release -- changes <release> --all` should list candidate changes with their branch and date, and the skill should say to pick the newest and name it in the reply.
3. **MAJOR: the request says "freeze, then carry", but only the carry-before-freeze order works.** The skill handles this well in C step 2 ("Carry anything that should be in the frozen release first"). A literal reading of the designer's sentence ("Then carry … into DR2") would freeze first and then get refused. The skill's C step 2 example ("freeze DR2, with last week's change in it") does not match the more natural "then carry X in as well" wording, so it is easy to miss. Add "then carry X into DR2 as well" as a trigger phrase in C step 2.
4. **MINOR: which purpose to start with is unclear.** C step 1 says "start one first (section B) with the frozen name", but B step 1 maps "a snapshot for the developers" to `--purpose frozen`. If you start it as `frozen`, is it already `frozen: true`, and does the carry get refused? The skill does not say. I used `working`, then froze it. C step 1 should say "start it with `--purpose working`; the freeze step sets frozen".
5. **MINOR: C step 4 promises a message that never appears.** "The check reports the frozen release as 'You froze <release-id> in this change'". The full check on `plants-dr2-1` printed nothing of the kind: it just passed, with "150 files changed: 150 yours". Either the check should say it or the skill should drop the line.
6. **MINOR: the frozen release's description is fixed at start time.** The freeze updates only the new copy's `--describe`. If the designer had described DR2 as a working copy, the frozen entry would keep that wrong line on the chooser for ever, because `release.json` cannot be hand-edited and the release is now frozen. I avoided this by describing it as frozen up front. Suggestion: `freeze … --frozen-describe` or similar.
7. **MINOR: chooser names come from the ids.** They read "Plants dr2" and "Plants dr2 1", not "Design release 2". Developers opening the chooser will not know that "Plants dr2 1" is the working copy without reading the tag. A `--title` option would help.
8. **MINOR: the frozen check output reads awkwardly.** The quick check on a frozen edit says `1 file changed: 1 yours. 1 frozen release changed.` It calls the file "yours" and then fails it. The same problem is reported twice (once under "Pages open"). Nothing stopped the edit when it was made: the Edit tool wrote to a frozen release with no hook stopping it. The only guard is the later check and the pre-commit hook.
9. **MINOR: page names differ between tools.** `designer:words` prints "Shown on: consignor-select", but the `--pages` it suggests says `consignors/select`. The Welsh line shows `[Welsh needed] … [[Welsh needed]]`: a doubled marker that looks like an error.
10. **MINOR: saving follows the skill's commit messages, not the trial's.** The skill's fixed messages ("Start design release …", "Freeze design release …") were used for 3 of the 4 commits, as the skill says. Only the fixture fix uses the `trial(t2-freeze-and-carry):` prefix.

## Time-wasters

- Diagnosing the remount test failure (reading `remount.test.js`, `test-repo.js` and `remount.js`) was work no designer could do. Without it the run stops at step 5.
- Choosing between 3 identical "Consignment addresses" commits.
- The full check takes about 30 seconds, and the skill runs it twice (at start and at freeze), plus once more by the hook on each of 4 commits.
