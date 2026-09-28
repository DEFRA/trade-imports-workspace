# Designer prototyping: handover

Written 28 September 2026, at the end of the unattended run.

**What this was:** we studied how designers really use the old Heroku prototype (GB-notification-service), then built a set of Claude Code skills, scripts, workflows and docs so a designer can work on the plants prototype (`repos/trade-imports-plants-prototype`) instead. The plants prototype is a copy of the real plants frontend running on stubs, so what designers build is much closer to the real service.

**Where it is:** branch `feat/NO_JIRA-designer-prototyping` in `repos/trade-imports-plants-prototype`. 5 commits, 336 files, about 50,000 lines added (roughly half scripts and tests under `scripts/designer/`, the rest skills, workflows, docs and prototype-owned services). Nothing is pushed and no pull request is open.

**Headline:** the suite is built and its unit tests pass (3,234 tests; lint, format and the chooser FIT spec clean). All 8 trials worked in round 2 after a shared blocker was fixed. A round 3 confirmation (T1 content pass, T7 confirmation, undo and hand off) against the finished branch found a second blocker and a data-loss bug, both now fixed in `abae120`. See "Round 3" below.

## Round 3: confirmation on the finished branch

Added after the main run, to close "Decisions for you" item 1.

- **Blocker, fixed:** creating the default release `plants-working` (what the suite tells every designer to do) failed `scripts/designer/suite.test.js`, so the pre-commit hook blocked every save. The test now treats any non-real set path as an example. A regression test covers it, and the PR canary job now makes `plants-working` itself, so the same break would fail CI.
- **Data loss, fixed:** `designer:release retire` deleted a never-saved release and then claimed it was "still in git history". It now refuses, and needs `--discard` to throw away unsaved work.
- **Undo, made consistent:** "undo that" on unsaved work used a hidden `git stash`. It now saves, then adds a revert commit, both through `designer:save`.
- Nine minor fixes as well. Full list: [trials/fixes-r3.md](trials/fixes-r3.md). Reports: [t1-content-pass-r3.md](trials/t1-content-pass-r3.md), [t7-confirmation-revert-handoff-r3.md](trials/t7-confirmation-revert-handoff-r3.md).
- The fixer re-ran the exact blocker state (made `plants-working`, ran `designer:check --full`) and it passed, but no designer-persona trial has run after `abae120`.

[analysis.md](analysis.md) now exists (written from the notes in round 3).

## 1. What the old prototype analysis found

The full write-up is [analysis.md](analysis.md). The sources it was built from are:

- [notes/usage.md](notes/usage.md): how the old prototype is built and used, with a critic's addendum
- [plan.md](plan.md), section 1: the change-type table
- [notes/old.md](notes/old.md) and [notes/b01.md](notes/b01.md) to [notes/b10.md](notes/b10.md): the per-batch commit notes

Headline numbers:

- 74 commits in 4 months. 63 are by one designer, who commits whole sessions straight to `main`: one big commit, then 1 or 2 fix-ups within the hour.
- 49 designer commits in the last 3 months (since 27 June 2026). The analysis weighted these over older work.
- One 13,001-line `routes.js` and a 9,666-line stylesheet. There are four copies of the journey (Design release 1, 2, 2.1 and a testing version), so a change that crosses them is made by hand up to 4 times.

The most common kinds of change in the last 3 months (count of commits containing that kind, recent / older):

| Change | Recent / older |
|---|---|
| Styling and layout | 30 / 12 |
| Wording sweeps (headings, labels, hints, captions) | 28 / 5 |
| Example data | 20 / 4 |
| Common capabilities (address book, transporters, templates, amend, copy, delete) | 17 / 0 |
| Dashboards and lists | 16 / 1 |
| Journey flow, new pages, check your answers | 10 each |
| Validation switched off and on for research | 10 / 1 |
| The same change by hand in 2 to 4 releases | 8 / 0 |

What shaped the suite:

- Designers need "save my work" more than anything: tidy, check, a commit message written from the change, a branch and a pull request.
- Most recent work (address book, templates, transporters, service home) has no plants equivalent yet. So the suite lets designers fake a service inside a release they own, flagged "needs a real service".
- `PROTOTYPE.md` wrongly said the weekly sync pull request merges itself. A person merges every one. This is now corrected.
- Welsh cannot be checked in the browser, editing a file restarts the server and loses the examples, and only `main` deploys.

## 2. What the suite contains

All paths are in `repos/trade-imports-plants-prototype`. The full design is in [plan.md](plan.md), sections 4 to 6.

### Instructions for the agent and the designer

- `CLAUDE.md`: rules for Claude when working with designers, and which skill to use for what the designer says
- `AGENTS.md`: points Cursor and other assistants at `CLAUDE.md` and the skills
- `PROTOTYPE.md`: the designer's guide, rewritten (sync corrected, working with Claude Code, releases, data, sharing, getting it merged, Cursor)
- `docs/designers/`: 14 guides plus `recipes/` and `gov-uk/`. Start at `docs/designers/README.md` and `your-first-hour.md`
- `.claude/rules/`: 5 rules that load for copy, templates, sets, example data and files the real service owns

### Skills (`.claude/skills/<name>/SKILL.md`)

- `run-the-prototype`: checks the computer, starts it, prints the example links
- `design-release`: start, freeze, carry changes between and retire design releases
- `change-the-words`: finds every place a phrase lives and changes English and Welsh together
- `match-the-design`: rebuilds a layout from a Figma frame with GOV.UK parts, and logs what cannot be matched
- `port-a-kit-page`: rebuilds a page from the old Prototype Kit prototype, with a fidelity table
- `change-the-journey`: adds questions, pages and branches, and moves pages, by following the repo's recipes
- `example-data`: example notifications, parties, ports and countries, with links that survive a restart
- `fake-a-service`: transporters, templates, address book, copy as new, dashboard tabs, filters and counts
- `research-session`: a research release, errors off in one commit that can be reverted, and a sheet with one link per task
- `check-my-change`: runs the right check and explains each failure in plain words
- `show-my-change`: a picture gallery with before and after, error states, phone width, a Figma frame beside it, accessibility results and video
- `share-my-change`: save, branch, pull request, check on a merge, and safe undo
- `hand-off`: a brief, screenshots, a Jira-ready text and a checked patch for the plants-frontend team

### Workflows (`.claude/workflows/`)

- `design-session.js`: works through a list of crit or feedback notes, one commit per note
- `wording-sweep.js`: a wording change across more than 5 pages, or a pasted content document
- `port-kit-page.js`: a whole Prototype Kit page port
- `prepare-handoff.js`: a change for the real service, with its tests, on a `handoff/<slug>` branch
- `README.md`: how to launch them, and the steps to follow by hand on hosts without the Workflow tool

Each workflow has a `MODELS` setting at the top: haiku for runners, sonnet for builders, opus for the judge.

### Scripts (`npm run designer:*`, code in `scripts/designer/`)

`where` (whose file is it), `check`, `preflight`, `show`, `release`, `examples`, `words`, `research`, `handoff`, `kit` (find and copy an old Kit page), `save` (commit with the hook output sent to a log), `format`, `fresh` (run without keeping data). There are also:

- `scripts/designer/hooks/guard-edit.js`: blocks edits to real-service files and frozen releases. It is not switched on yet (see "Decisions for you", item 2)
- `scripts/designer/prototype.json`: the deployed address (empty for now) and who to hand work to
- `src/server/prototype-services/`: records that survive a restart, derived dashboard columns, and fake transporters, templates and address book
- `src/server/prototype-seed/` and `src/server/prototype-data/`: example data for any set, plus extra parties, ports and countries
- `handoffs/`: where hand-off briefs are committed
- `new:set` now makes design releases without copied tests, and records `release.json`
- The chooser shows tags, the date and source, and example links
- A CI canary makes a throwaway release on every pull request

## 3. Trial outcomes

Each trial acted out a real run of old-prototype commits as a designer's request. Two rounds ran, each followed by fixes. Round 2 is the latest, and ran against commit `9d83243` (after round 1's fixes, before round 2's).

**Every round 2 trial hit the same blocker.** Once any design release existed, the pre-commit hook failed (`scripts/designer/release/remount.test.js`), so a designer could not save anything. Each trial fixed it on its own branch to carry on. The fix is now on the suite branch (`9594776`), with a regression test, and was checked with a real release in the working tree.

| Trial | Outcome in round 2 | Report | Branch |
|---|---|---|---|
| T1 content pass (rename a section everywhere, Welsh to follow, save and open a PR) | **Partial.** The wording change and save worked. It was blocked at the first save until fixed. No PR was opened, because the trial did not allow pushing | [t1-content-pass-r2.md](trials/t1-content-pass-r2.md) | `feat/NO_JIRA-designer-prototyping-trial-t1-content-pass-r2` (also `design/plants-working-consignment-addresses-t1r2`) |
| T2 freeze and carry | **Success after the blocker fix.** Freeze, working copy, carry and the frozen refusal all worked. The journey tests passed 18 of 18 | [t2-freeze-and-carry-r2.md](trials/t2-freeze-and-carry-r2.md) | `feat/NO_JIRA-designer-prototyping-trial-t2-freeze-and-carry-r2` |
| T3 dashboard from a Figma frame | **Partial.** Tabs, counts, filters and examples worked. The Commodity and Arrival columns were blank because of a real plants-frontend bug. Since then, design releases work around it; the real journey is still blank. There was no real Figma PNG, only a stand-in | [t3-dashboard-r2.md](trials/t3-dashboard-r2.md) | `feat/NO_JIRA-designer-prototyping-trial-t3-dashboard-r2` |
| T4 transporter page from the old prototype | **Works after the blocker fix.** The hand-off patch applied, but the real service would not have started with it (it kept files that import left-out files). That is now fixed | [t4-transporter-page-r2.md](trials/t4-transporter-page-r2.md) | `feat/NO_JIRA-designer-prototyping-trial-t4-transporter-page-r2` |
| T5 research round and error message | **Success after the blocker fix.** Research mode on and off, the task sheet and the new error message all worked | [t5-research-round-r2.md](trials/t5-research-round-r2.md) | `feat/NO_JIRA-designer-prototyping-trial-t5-research-round-r2` |
| T6 new branch page and a move | **Branch works. The move was already true**, so nothing changed (the trial asked for an order the journey already has) | [t6-branch-and-move-r2.md](trials/t6-branch-and-move-r2.md) | `feat/NO_JIRA-designer-prototyping-trial-t6-branch-and-move-r2` |
| T7 confirmation page, undo, hand off | **Partial:** every criterion held, but only after the blocker fix. The patch applied to plants-frontend `upstream/main` too | [t7-confirmation-revert-handoff-r2.md](trials/t7-confirmation-revert-handoff-r2.md) | `feat/NO_JIRA-designer-prototyping-trial-t7-confirmation-revert-handoff-r2` |
| T8 crit notes and a demo video | **Partial.** Three commits landed after the blocker fix. `--video --compare` gave 0 pictures without `--pages` (now fixed). Nobody has watched `walk.webm` (the agent cannot view video) | [t8-crit-notes-and-demo-r2.md](trials/t8-crit-notes-and-demo-r2.md) | `feat/NO_JIRA-designer-prototyping-trial-t8-crit-notes-and-demo-r2` |

What was fixed after round 2 is in [trials/fixes-r2.md](trials/fixes-r2.md). Round 1 reports and fixes are beside them (`*-r1.md`, `fixes-r1.md`); their branches end `-r1`. Some things had tidy explanations but were not built:

- a way for `designer:show` to fill in a form (to prove Yes-then-No clears an answer, or the add-then-back trip)
- keeping the same example reference in before and after pictures
- one gallery for the frame, filtered and empty states together

No Workflow tool was available to the trial agents, so every workflow was tested only by following its manual steps. The workflow scripts have unit tests but have never run for real.

The code review of the whole suite and what was done about each finding is in [review-dispositions.md](review-dispositions.md). Its fixes are commit `a15770a`.

## 4. Decisions for you

1. **Done in round 3** (see above). Optional: one more designer-persona trial after `abae120`, or better, a real designer's first hour with `docs/designers/your-first-hour.md`.
2. **Apply the settings proposal.** The prototype's `.claude/settings.json` is plants-frontend's copy. It runs three Sonar hooks (`pretool-secrets.sh`, `prompt-secrets.sh`, `sonar-analyze.sh`) that `overrides.json` deletes, so Claude Code reports a missing hook script on every prompt, read and stop. The edit guard also never runs. The proposal replaces the file: no Sonar hooks, the edit guard, and an allowlist so designers are not asked to approve every step. It also adds `.claude/settings.json` to `ours`, so the weekly sync stops bringing plants-frontend's copy back. Apply it on a `maintain/` branch. `_how_to_apply` lists the notes to delete afterwards.
   - The copy in the repo is `scripts/designer/hooks/settings-proposal.json`. The workspace copy, [settings-proposal.json](settings-proposal.json), is the same.
   - One small tidy: it allowlists `npm run dev:fresh`, but the script is called `designer:fresh`. `Bash(npm run designer:*)` already covers it, so you can delete that line.
3. **The workflows' judge model.** It is `opus` by default. Fable (`claude-fable-5-1`) is set up only as a one-line switch, because designers' accounts may not have Fable and an unknown model would break every unattended run. Decide whether to make Fable the default.
4. **Who gets hand-offs.** `handoffs/README.md` and `prototype.json` name the EUDPA Jira project and the plants-frontend team's delivery lead or product owner. Confirm that wording, and add a team channel: none is recorded, so none was invented.
5. **The deployed address.** `scripts/designer/prototype.json` has `deployedUrl: null`, on the assumption the prototype is not deployed yet. Fill it in, and update `PROTOTYPE.md`, once CDP is live. Only `main` deploys, so designers cannot share work in progress until merged. Branch previews would need CDP config, which is yours.
6. **Raise with plants-frontend** (a real bug): the dashboard list reads `commodityLines[0].commoditySelection` and `arrivalDateAtPort`, but the plants pages save `commodityType` and `arrivalDate`. So Commodity and Arrival are blank on the real dashboard. The prototype works around it only in design releases.
7. **Later, once there is evidence:** a stylesheet for each set (a patched webpack entry), decided after about a month of `design-gaps.md` rows. Also: a test that fails when a file differs from upstream but is in neither `ours` nor `patched`. Other upstream drift is listed in [plan.md](plan.md) section 9.
8. **Merging.** When you are happy, push `feat/NO_JIRA-designer-prototyping` and raise the PR against the prototype's `main`. The trial branches are evidence only and are not for merging. You can delete them once you have read the reports.

## 5. Commits on `feat/NO_JIRA-designer-prototyping`

From `git log --oneline main..feat/NO_JIRA-designer-prototyping`:

```
a15770a fix: act on designer suite review
9594776 fix: act on designer trial round 2
9d83243 fix: act on designer trial round 1
0fd3934 feat: add the designer prototyping suite
```

The checkout is on that branch with a clean working tree.

## Other files in this folder

- [design/](design/): the three competing proposals the plan was judged from
- [notes/](notes/): the analysis notes, including `plants-*.md` on how the plants prototype works and `reusable-assets.md`
- `logs/`: raw command output from every phase
