# Trial t2-freeze-and-carry, round 1

**Request:** "Freeze what we've got as Design release 2 so the developers have something stable, and give me a working copy to carry on in. Then carry last week's 'Consignment addresses' change into DR2 as well."

**Branch:** `feat/NO_JIRA-designer-prototyping-trial-t2-freeze-and-carry-r1` (prototype repo), commits:

- `c743120` Start design release plants-dr2 from high-risk-plants
- `2af1977` Merge of the t1 branch (brings in `plants-working` and last week's change `0f54597`)
- `937ac53` plants-dr2: rename 'Consignment parties' to 'Consignment addresses', carried from plants-working
- `197bf0d` Freeze design release plants-dr2; carry on in plants-dr2-1

I used the commit messages the skill prescribes, not the harness's `trial(t2-freeze-and-carry): …` prefix. The skill's wording won because I was following it literally.

**Outcome:** partial success. The freeze, the working copy and the carry all work, and every automated check is green. But I only got there by working around 3 real blockers, and the "never edit a frozen release" promise is enforced only by the agent following the rules, not by any tool.

## Steps taken

1. Read `CLAUDE.md` and `PROTOTYPE.md`. The routing table sends "freeze what we've got as design release 2" to `design-release`. Read `.claude/skills/design-release/SKILL.md` and `docs/designers/design-releases.md` as the skill says.
2. Section A: `designer:release -- list` showed only `high-risk-plants` and `sample-journey`. **There was no release to freeze.** "What we've got" had no referent.
3. Worked out the order. Taken literally, "freeze, then carry into DR2" is impossible: carry refuses a frozen target. I decided to start `plants-dr2`, carry the change into it, and only then freeze it. The working copy then inherits the change too.
4. Section B: `new:set -- plants-dr2 --from high-risk-plants --describe "Design release 2: …" --purpose working`, then `npm run format`, then `designer:check -- --set plants-dr2 --full` (all 8 checks passed, 3050 tests) and `designer:show -- --set plants-dr2 --pages all` (15 pages, axe clean). Committed.
5. Section D: `designer:release -- carry --from plants-working --to plants-dr2 --commit 0f54597` failed with `There is no release called "plants-working"`. Last week's release lived on another branch (the t1 trial branch).
6. Unstuck by merging the t1 branch in. The merge **conflicted in all 3 shared files** (`overrides.json`, `prototype-sets/index.js`, `prototype-sets/descriptions.js`). Each branch had added its own release at the same spot. I resolved them by hand, keeping both sides, then ran `npm run format` and committed.
7. Retried the carry and it worked: "Carried the change from "plants-working" into "plants-dr2"", 6 copy files, paths rewritten `plants-working` → `plants-dr2`. The diff is exactly the wording change plus `[Welsh needed]` markers. The change touched copy only, so there were no question ids to rewrite, and that part of the carry was not exercised.
8. `designer:check -- --set plants-dr2` passed ("3 pieces of text still need Welsh"). `designer:show -- --pages changed` took all 15 pages. I looked at the hub and identification-numbers pictures. The task list heading now reads "3. Consignment addresses", and so does the identification-numbers caption. Committed with the section D message.
9. Section C: `designer:release -- freeze plants-dr2 --as plants-dr2-1`. It worked, then `npm run format` and `designer:check -- --set plants-dr2-1 --full`. The check passed overall but flagged the freeze's own `release.json` change as "This is a frozen release" (see friction). Committed.
10. Refusal checks:
    - A carry into `plants-dr2` now refuses with: `"plants-dr2" is frozen, so nothing can be added to it. Carry the change into a working release instead, or make one from it: npm run designer:release -- freeze plants-dr2 --as <new-id>.`
    - `designer:where` with a full path says `This is a frozen release. Start a working release from it instead.`
    - A direct Edit to `plants-dr2/.../hub/copy/copy.en.js` **went through**. `designer:check --full` then said "everything passed. A commit made now will pass the pre-commit hook." I restored the file.
11. `designer:release -- list`: plants-dr2 shows **Frozen / yes**, plants-dr2-1 shows **Working release**, made from plants-dr2. `overrides.json` has both release lines in `ours`.
12. `npm run test:fit:journeys`: **23 passed**. It walks every example to confirmation in plants-dr2, plants-dr2-1 and plants-working. The chooser tests passed too: every set boots, and every tag is one of the allowed values.
13. Tried `npm run dev` to look at the chooser. It failed with `EADDRINUSE 0.0.0.0:3103` because something else already held the port, so I stopped it. I never saw the chooser.
14. Switched back to `feat/NO_JIRA-designer-prototyping`. The tree is clean.

## Success criteria

| Criterion | Result |
| --- | --- |
| plants-dr2 has `frozen: true`, a working release made from it exists, both are in `overrides.json` `ours` | Met. `plants-dr2` has frozen true. `plants-dr2-1` is working and made from plants-dr2. Both have their 2 lines. |
| Chooser shows the right tags, descriptions, dates and example links for every release | Partly shown. The list output and the chooser fit test are right, and `designer:examples links` gives 4 links per release. But I never saw the chooser: no tool photographs it and the dev port was taken. |
| Carry applies the wording with ids rewritten; a later edit to the frozen release is refused with the plain frozen sentence | The carry is met. Refusal works for the carry and for `designer:where`, **but a direct file edit is not refused** by any tool or check. |
| `designer:check --full` passes with 3 or more sets mounted, and `test:fit:journeys` walks every release | Met. 5 sets mounted, check green, 23 of 23 fit tests passed. |

## Screenshots

- Before (plants-dr2, freshly copied), hub shows "3. Consignment parties": `repos/trade-imports-plants-prototype/.cache/designer/show/plants-dr2/2026-09-28T00-25-45/hub--now--page--desktop.png`
- After the carry, hub shows "3. Consignment addresses": `repos/trade-imports-plants-prototype/.cache/designer/show/plants-dr2/2026-09-28T00-28-03/hub--now--page--desktop.png`
- After the carry, the identification-numbers caption reads "Consignment addresses": `.../2026-09-28T00-28-03/identification-numbers--now--page--desktop.png`
- Galleries: `.../plants-dr2/2026-09-28T00-25-45/index.html` and `.../plants-dr2/2026-09-28T00-28-03/index.html`

## Friction

### Blockers and majors

1. **MAJOR: nothing stops an edit to a frozen release.** The skill says "Never edit a frozen release … refuse any change to it". The Edit tool changed `plants-dr2` copy without complaint, because the hook in CLAUDE.md line 1 is not applied yet. `designer:check` shows only a yellow "Check" row, and its last line still says "everything passed. A commit made now will pass the pre-commit hook." The pre-commit hook has no frozen guard either. A designer's frozen DR2 can be changed and committed silently.
   - **Fix:** make a frozen-release edit a **Failed** row in designer:check, and add a unit or lint test that fails when files under a set whose `release.json` has `frozen: true` differ from the freeze commit. Or at least fail the pre-commit hook.
2. **MAJOR: carry needs the source release on the current branch.** "Last week's change" was a commit on another design branch, and carry answered `There is no release called "plants-working"`. Section D never says the source release must be present, or what to do when it is not. The commit already holds everything carry needs.
   - **Fix:** let `carry --commit` work from the commit's own paths or its `release.json` at that commit. Failing that, the error should say "plants-working is on branch X: merge it first" and section D should include a step for it.
3. **MAJOR: merging two designers' release branches always conflicts.** `new:set` appends at the same spot in `overrides.json`, `prototype-sets/index.js` and `descriptions.js`, so any 2 branches that each start a release will clash. A designer cannot resolve 3 JS/JSON conflicts. The skill says "Only the tools touch the shared files … Never edit those by hand", yet a hand edit was the only way through.
   - **Fix:** generate the mount list and descriptions from `sets/*/release.json` (or one file per release) so nothing is appended to shared files. Alternatively, give `designer:release` a `resolve` or `remount` command that rebuilds all 3 from the folders on disk.
4. **MAJOR: section C does not handle "freeze and also add change X to it".** Section C step 1 says "If the work is not in a release yet, start one first (section B) with the frozen name". It does not say to hold off freezing until every carry into it is done. Doing C step 2 first and then D makes the carry refuse. "Freeze then carry into DR2" is a very natural thing for a designer to say.
   - **Fix:** add a line to C: "If the designer also wants changes in the frozen release, carry them (section D) before step 2."

### Minors

5. **The freeze trips its own frozen warning.** Straight after `freeze`, `designer:check -- --set plants-dr2-1 --full` shows `Check  Whose files you changed … src/server/app/sets/plants-dr2/release.json: This is a frozen release. Start a working release from it instead.` A designer would think something went wrong.
   - **Fix:** ignore the `frozen: false→true` change to `release.json` in the frozen check, or report it as "you froze plants-dr2" in green.
6. **The refusal message points the wrong way.** It says "make one from it: npm run designer:release -- freeze plants-dr2 --as <new-id>", which re-freezes an already frozen release. It does not mention that `plants-dr2-1` already exists.
   - **Fix:** name the existing working release made from it ("carry it into plants-dr2-1 instead"). The docs also say "copy it into that release's working copy".
7. **The frozen `release.json` keeps `"purpose": "working"`.** It has `frozen: true`, but anyone reading `purpose` gets the wrong answer.
   - **Fix:** set `purpose: "frozen"` on freeze.
8. **`freeze --as` takes no description.** The working copy's chooser line becomes "Copy of plants-dr2 made 27 September 2026".
   - **Fix:** accept `--describe` on freeze, and have section C ask for one.
9. **Dates are in UTC.** At 00:28 BST on 28 September the list and the description say "27 September 2026", which a UK designer working late would see as a wrong date.
   - **Fix:** format dates in Europe/London.
10. **The display name is "Plants dr2".** `new:set` title-cases the id ("under Plants dr2"), not "Design release 2".
    - **Fix:** a `--name` option, or derive "Design release 2" from `dr<n>`.
11. **`designer:where` answers wrongly for a relative path under `npm --prefix`.** It said `Outside this prototype: the weekly update does not cover it.` for a file inside the frozen release. The path is resolved from the caller's folder, not the repo. With the full path it answers correctly.
    - **Fix:** resolve relative paths against the repo root, or refuse paths that fall outside it with "run this from the prototype folder".
12. **There is no way for Claude to see the chooser.** The Verify section says "The chooser … shows the release's tag … description and links", and CLAUDE.md says "Never claim a visual result you have not looked at". `designer:show` only takes `--set` pages, so the chooser cannot be photographed. The chooser fit test only checks each tag against a list of allowed values, not that plants-dr2 is Frozen.
    - **Fix:** a `designer:show -- --chooser` option, and a fit assertion that frozen releases carry the Frozen tag.
13. **The dev server failed on a busy port.** `npm run dev` crashed with `EADDRINUSE 3103`, and the inspector port 9229 was also taken. The skill does not route to `run-the-prototype` for this.
    - **Fix:** have design-release's verify step call `run-the-prototype`'s port check first.
14. **`npm run format` output is too long.** It prints 77 to 102 KB of "(unchanged)" lines each time, and every commit prints about 30 to 50 KB of coverage table. That wastes agent context and scares designers.
    - **Fix:** use `prettier --write --log-level warn` in the designer path, and drop coverage from the hook, or make it quiet.
15. **`--pages changed` photographed all 15 pages** for a 6-file copy change, and there was no before/after unless `--before` is given. It is fine, but "changed" misleads.
    - **Fix:** map a changed caption file to the pages that use it, or say "this change touches every page, taking all 15".
16. **The designer:check summary contradicts itself.** "150 files changed: 150 yours." sits on a yellow Check row, and the result line says "everything passed".
    - **Fix:** make the headline reflect any Check rows.

## Time-wasters

- The t1 merge and resolving 3 conflicts by hand: the single biggest detour. A designer alone would be stuck here.
- Working out whether "carry into DR2" should happen before or after the freeze: the skill is silent.
- Four full pre-commit runs (about 30 s each, with huge output), plus 3 full checks.
- Trying to view the chooser: no tool for it, and the dev port was taken.
