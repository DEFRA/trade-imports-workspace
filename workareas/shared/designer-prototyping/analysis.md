# How designers use the old prototype, and what that means for the plants prototype

Written 28 September 2026. This consolidates the analysis notes in `notes/` (`usage.md` with its critic addendum, `anatomy.md`, `old.md`, `b01.md` to `b10.md`, `plants-pages.md`, `plants-data.md`, `plants-sets.md`, `plants-verify.md`, `reusable-assets.md`), the change-type table in `plan.md` section 1 and the headline in `README.md` section 1. It adds nothing that is not in those files. Where a note corrected an earlier claim, the corrected figure is used here.

Source: a read-only clone of `GB-notification-service` (GOV.UK Prototype Kit 13.20.2, deployed to Heroku) at HEAD `fcf7d7f`, 24 September 2026. "Recent" means since 27 June 2026, the last 3 months. Recent work carries more weight than older work throughout.

Headline numbers:

- 74 commits in 4 months. 63 are by one designer, who commits straight to `main`.
- 49 designer commits in the recent window (58 non-merge commits in total; 9 are Sam's Playwright demo work).
- One 13,001-line `app/routes.js` (508 helper functions, 92 routes, 172 version-flag checks) and one 9,666-line `application.scss`. 170 view templates.
- Four copies of the journey: Design release 1 (root), Design release 2, Design release 2.1 and a Testing version. A change that crosses them is made by hand up to 4 times.

## 1. How the old prototype is used, and the designer's working rhythm

### Who uses it and for what

1. **The designer, daily.** One person, working in Cursor with an AI assistant. The code shows it: the version-mount middleware, the autocompletes and the address generators arrived complete in single commits, next to commit messages such as "updates", "text", "new" and "6786". The designer is comfortable with Nunjucks macros, session data and `app/data` fixtures, and with asking the assistant for substantial code. They do not use branches, pull requests, tests or refactoring.
2. **User research.** The Testing version is a research build: a CHEDA-style reference, an IPAFFS-style header and dashboard, "Clone a certificate". It was built in one afternoon (15 July, 14:19), fixed at 16:25 and again at 01:30 the next morning. Since then it is only touched when a content sweep crosses every version.
3. **Design releases shown to stakeholders and handed to developers.** Design release 1 is the signed-off definition the frontend team builds against ("where the frontend differs from DR1 the frontend is wrong"). Design release 2 and 2.1 are the next releases in design. The card copy on the index page says it plainly: "Use this for stable reference work" and "A duplicate ... for making changes without affecting the original version". Freeze one release, keep working in the next.
4. **Stakeholders by recorded video.** Sam's `journey-demo/` is a Playwright suite whose product is the video and HTML report, recorded in CI on every push to `main`. It covers Design release 1 only and has not followed the prototype since July. The designer keeps it compiling: on 24 September they fixed three fixture values after "Airplane" and "Railway" became "Air" and "Rail".
5. **Deploy.** Nothing in the repo names Heroku. The standard recipe applies: every push to `main` deploys, and stakeholders are sent the `/index` URL to pick a card.

### How versions work

Each version is a mirror mount, not a fork (`app/lib/version-mount.js`, 364 lines). The root router's routes are copied under a prefix such as `/design-release-2.1`. Session data is nested under a per-version key, with the address book and submitted notifications shared. `res.render` is patched so a view resolves to the version folder only if a same-named file exists there, otherwise it falls through to the root view. Behaviour differences are threaded through the shared `routes.js` as `is<Version>SessionData()` branches.

So a new version costs: copy the views folder, search-and-replace the prefix in every hard-coded `action` and `href`, copy a 50-line lib file, add one mount line and one index card. The four creations (25 June rebuild in place, 15 July testing, 22 July DR2, 4 August DR2.1) all followed that recipe, and none of it is documented in the repo.

The cost comes later. Roughly 85% of each page is byte-identical to its sibling once the prefix is normalised, so a content fix to a shared field is applied 3 or 4 times by hand. The 10 September "content changes" commit made the same edit to `review-notification.html` in root, testing, DR2 and DR2.1. The `testing/` copy has already drifted: it received copy tweaks but not behaviour changes.

### The working rhythm

- **Two phases.** July was bursts of 4 to 6 commits a day (2, 6, 7, 10, 15, 22 July) building DR1 fixes, the address book, transporters, the dashboard, then the Testing version and DR2. From August it is one session a week (4 and 17 and 26 August, 3 and 10 and 16 and 22 and 24 September), each 1 to 3 commits.
- **Session shape.** One large commit (300 to 5,700 insertions) at the start of the day or late evening, then one or two small fix-ups within 10 to 60 minutes ("text update", "content changes", "validation"). The fix-ups are what the browser showed after deploy: a wrapped column, a truncated button label, a missed template copy, a broken keystroke committed in the GitHub web editor and reverted six minutes later.
- **Messages carry no intent.** One line, lower case, no body, no ticket id. "text" added a page and two routes. "germinals" also delivered delete, drafts, re-submit and a customs reference block. Nine commits use the GitHub web-editor default ("Update routes.js"). Any tool that wants to know what changed has to read the diff.
- **Straight to `main`.** One branch has ever existed besides `main` (Sam's). The single designer merge is a pull-before-push, not a feature merge. No tags, no releases, no CI for the prototype itself.
- **Feedback loops.** "feedback updates" (10 July, 29 files) and "reverted back to confirmation page" (10 September) show changes driven by review, with one explicit reversal in three months. Reverts are done by hand, not `git revert`, and the dead SCSS stays behind.
- **Placeholder first, content second.** New pages ship with `href="#"`, controls that look like they work but do not, and scaffold copy ("Description goes here......"). A follow-up commit hours later writes the real content. Filters are presentational first and only start filtering when a research session needs them.
- **Validation off for research, on for realism.** Guards and validators are hollowed out (bodies replaced with `return { errors: {}, errorList: [] }`) before a research round and switched back on afterwards. Monday adds date-range validation, Tuesday removes it along with everything else.
- **Realistic data is design work.** `app/data/*.js` is edited in most commits: Romanian and Irish farms, 8 curated dashboard rows instead of 30 generated ones, a fully specified horse template, "Republic of Ireland" not "Ireland". The reference-number format is treated as a design decision.
- **Bespoke over toolbox.** 176 of the 178 top-level selectors in the stylesheet are `.app-*`. Tabs, modals, checkboxes and filter panels are re-implemented in SCSS and vanilla JS rather than taken from govuk-frontend. The IPAFFS lookalike deliberately steps outside GOV.UK so research can compare old against new.

## 2. Change taxonomy

Counts are recent / older commits that contain that kind of change. A commit usually contains several kinds. Difficulty is for someone who knows HTML, Nunjucks and the GOV.UK Design System but not the plants architecture, on the scale from `plants-pages.md`: 1 = edit a file by pattern-matching, 2 = edit copy bundles and keep a test in step, 3 = touch a controller by copying a neighbour, 4 = needs the obligation model or flow gates, 5 = needs the engine contract.

| Change type | Recent / older | Example commits | How it is done in the Kit | How it is done in plants | Difficulty | Gap the suite had to close |
|---|---|---|---|---|---|---|
| Styling and layout (Sass, grid, spacing) | 30 / 12 | `9abc06e`, `6d3dd1e`, `7467690` | A new `.app-<page>-*` BEM block appended to one `application.scss`, pixel widths and hex colours copied from Figma, tuned in a follow-up commit | Edit `template.njk`; `govuk-*` and `moj-*` classes only; no Sass, no inline styles (CSP blocks them); `contentColumnClass` for width | 1 (2 when the macro needs new controller data) | No set-level stylesheet seam; anything the toolbox cannot do must be logged as a design gap and handed off |
| Wording sweeps (headings, labels, hints, captions) | 28 / 5 | `8283340`, `903344e`, `f622600`, `077c2f0`, `fcf7d7f` | Strings live inline in `.html` views, in `routes.js` card titles and in data files, so one label sits in 3 or more places and is chased by hand across 2 to 4 version copies | `copy.en.js` and `copy.cy.js` together; in the real journey also `copy.test.js` (14 of 16 features pin English) and `controller.test.js` (13 of 16); `copy-parity` fails on a missing or identical Welsh leaf | 2 | Welsh cannot be reviewed in the browser (every call site resolves `en`); a rename needs a test rewrite twice the size of the copy change; nothing said which tests would object |
| Example (fixture) data | 20 / 4 | `a79a15f`, `dc8dcc6`, `a0e46bd` | Hand-written `app/data/*.js` arrays, padded or generated for realism, plus index arithmetic in route handlers (`index % 6 === 3` means Plants) | `prototype-seed/scenarios.js` replays `happy-path.json` steps through the real routes on first visit; never a hand-written record | 2 | The seeder knew only submit and amend (no late, deleted, copied, cancelled-amend or second-organisation example); fixtures were upstream-owned; links to examples broke on every restart because references are freshly minted |
| Common-capability sub-flows (address book, transporters, templates, amend, copy, delete) | 17 / 0 | `b75ce0a`, `c93fe37`, `dc8dcc6`, `7661d29`, `a0e46bd` | New views plus 100 to 1,700 lines in `routes.js`; session arrays as the database (`addedTransporters.unshift`), a flash message set then deleted, `?from=` return markers | Address book is a separate service (the header link goes nowhere); no templates; transporters and upload removed upstream on purpose; amend, cancel-amend and delete exist; `copy()` exists in the stub store but has no page | 4 to 5 | Most recent designer work has no plants equivalent; the suite had to offer "fake a service in a release you own" and say so |
| Dashboards and lists | 16 / 1 | `9aabc14`, `d4af0df`, `6d3dd1e`, `7da4f70`, `7467690` | The dashboard view rewritten per version (three layouts in one afternoon on 17 July); counts hard-coded in the handler; filters read but not applied | `dashboard/template.njk` `detailRows` and `copy.table.*` for columns; `toRow` in the view-model for a new value; the stub list takes only reference, sort and page | 1 to 2 for columns, 3 for a new value or sort | No status, commodity or date filter; a filter needs a set-local records adapter; a real bug leaves Commodity and Arrival blank on the real dashboard |
| Journey flow (order, branching) | 10 / 4 | `9abc06e`, `4377980`, `33f5836`, `c149d7b`, `268f070` | Edit `res.redirect` string literals in each POST, or the `getJourneySteps` array; contact address moved three times in three days | Reorder: `flow.js` pages array and `RUN_STEPS`; move between sections: also `task-rows.js`, hub `GROUPS`, captions; branch on an answer: an `applyTo` gate on the obligation, then `scope.has()` and `scopedRows` | 2 to 3 for a move, 4 for a branch | No "move a page" or "add a branch" recipe; the same page id is registered in up to five places, each with a test; the hardest common request |
| New pages | 10 / 4 | `c93fe37`, `268f070` | One `.html` view plus a GET/POST pair and helpers in `routes.js` | The add-a-page recipe: a 9-file feature folder plus model, flow, hub, captions, contract and check-answers, 20 to 25 files | 4 to 5 (a static guidance page is easier but has no recipe) | The recipes assume every page collects data; the smallest static example (`sample-journey` welcome, 28 lines) is not pointed at |
| Check your answers (review page) | 10 / 2 | `9abc06e`, `c149d7b`, `cb13efb`, `8283340` | `review-notification.html` in all four versions plus the view-model in `routes.js`; card titles in the route so one change reaches journey, read-only and template reviews | `check-answers/view-model/index.js` section builders plus the check-answers copy pair; the template loops `govukSummaryList` and needs no change | 3 | Labels for coded values are async and pre-resolved, a trap for copying a neighbour |
| Validation switched off and on for research | 10 / 1 | `9abc06e`, `9038927`, `a0aaf28` (off); `cb13efb`, `91507cb` (on) | Hollow out validator bodies and entry guards, restore them later | No research mode; save-time rules are Joi in the controller, submit-time rules are obligation `status`; the entry guard is always on | 3 to 4, in two systems | Nothing let a designer relax validation for a round and put it back |
| The same change by hand in 2 to 4 releases | 8 / 0 | `8283340`, `a0e46bd` | `cp -r` then edit each copy; partials save one edit, pages cost two to four | A design release is a snapshot set and never receives upstream changes; no carry between sets existed | n/a | A carry tool and a freeze marker |
| Custom client JS | 8 / 4 | `dc8dcc6`, `1fe0fb5` | Vanilla modules bound by `data-module`, registered in `application.js`; bespoke autocompletes, modals, copy buttons | `src/client/**` is upstream-owned; a new bundle needs a webpack entry or 404s silently | n/a in a release | Toolbox only; the nearest GOV.UK or MoJ equivalent, or a logged gap |
| Header, service navigation, home page | 6 / 2 | `8845358`, `7467690` | `layouts/main.html` forked three ways on version flags, the nav array duplicated each time | `shared/layout.njk` is upstream-owned and shared by every set | n/a | Always a hand-off, never an in-release change |
| Task list (hub) | 6 / 3 | `4377980`, `3bf1a9b` | `getNotificationHubViewModel` in `routes.js`; section names and every page's caption edited in a sweep | Hub `GROUPS`, hub copy pair, `task-rows.js` for a new row; captions are a separate per-page decision with their own test | 2 to 3 | Captions, rows and groups are three lists to keep in step |
| Reverts | 5 / 1 | `50afa9e` | Re-edit the files by hand; the dead SCSS stays | `git revert` of one commit | 1 | Undo needed to be safe and one step |
| Confirmation page variants | 4 / 0 | `c149d7b`, `a0e46bd`, `50afa9e` | `notification-submitted.html` edited in two versions; a three-step tracker added then hand-reverted | `confirmation/template.njk` (21 lines) plus copy | 1 to 2, 3 for a new dynamic value | None beyond copy and Welsh |
| New release or research variant | 3 / 1 | `2191e30`, `6d3dd1e`, `c442009` | Copy the views folder, a 50-line lib file, a mount line, an index card | `npm run new:set -- <id> --from high-risk-plants`, which was not viable: ~50 copied tests fail on set context, 18 FIT specs run under vitest, no seed, 1 MB of spec ballast | 1 to run, 4 to make first-class | The route a designer most wants was the least finished |
| Jump to a mid-journey state | 2 / 1 | `1f84c10` | A `/prototype/<page>` route that writes a canned session and redirects, then the link is hidden | A seed scenario with `through: '<slug>'` | 2 | Stable links to the example a scenario stopped at |
| Demo walkthrough video | 1 / 0 | `5700f2b`, `85ea76c` | Sam's `journey-demo/` Playwright suite, video and report as a CI artefact | The `journeys` FIT project already records video and trace at slow motion 600 ms | 1 | Nothing joined "the files I changed" to "the pages that render them" |

Two more findings from the critic that shape the rows above:

- **Vocabulary and reference-format decisions** (CHEDA or GBN-AG, "Submission complete" becoming Submitted or Completed, Air/Rail/Road/Sea with an alias map) are design decisions in the Kit. In plants, changing an option value breaks `happy-path.json`, and with it the seed and the journey smoke test.
- **Copying the incumbent service as a baseline** (the IPAFFS lookalike with non-GOV.UK chips) is a real "variants side by side" need, and it clashes with the toolbox-only rule. The suite's stated position: build the closest GOV.UK version, log the gap, and use `designer:show --compare` for the side-by-side view.

## 3. Where plants is better and worse for designers

### Better

- **What designers build is much closer to the real service.** The prototype is a copy of the plants frontend on stubs: same templates, engine, validation and reference numbers (`GBN-HRP-26-...` matches the backend). In the Kit, developers found code citations were "mostly noise" and re-captured the render every week because both codebases moved.
- **Example data cannot lie.** The seed replays the real journey through the real routes, so it cannot describe a consignment the service would refuse. The Kit's data files and index arithmetic made dashboards that disagreed with their own detail pages.
- **Templates are short and macro-driven.** Commodity type is 38 lines, the hub 22, confirmation 21. They extend a shared layout, and layout and copy edits hot-reload.
- **Versions are cheap where the Kit was expensive.** A set gets its own route prefix, cookie names and session for free. In the Kit every version was another `is<Version>` branch in a 13,000-line file and another hand-copied `href`.
- **Tests catch what the browser would not.** Boot guards, copy parity, the contract test and axe on every feature page (initial and error state) mean a half-registered page or an inaccessible change fails before it is shown.
- **The walkthrough video is already recorded.** Every PR's Playwright artefact carries a video and trace per journey; the Kit needed a separate suite that then fell behind.
- **Upstream improvements arrive weekly.** The sync brings plants-frontend's changes into the real journey; a Kit release never received anything it did not copy by hand.
- **Deploy is by pipeline.** Push to `main`, checks run, an image is published to CDP; every set rides the same deploy, so a release is live at `/<release-id>` when its PR merges.

### Worse

- **Save is painful.** The pre-commit hook runs Prettier check, three lints, a production webpack build and the full vitest suite on every commit; the first failure is usually a Prettier diff. The Kit designer committed whole sessions with one-word messages and nothing stood in the way.
- **Copy is a test contract.** In the real journey one hint change is three files plus the Welsh, and a rename needed a test rewrite twice the size of the copy change. `AWAITING THE COPY PASS` headers show rewording is expected, yet the tests pin the current English.
- **Welsh is mandatory and invisible.** Parity is machine-checked, but no locale switch is wired, so Welsh cannot be reviewed in the browser.
- **The model is in the way of a field or a page.** A field is 13 to 15 files and needs UUIDs, bindings and dispatch; a page is 20 to 25. The recipes are complete and accurate but written for an engineer, and had drifted (four hub rows in the docs, seven in the code; "the set owns no test files" against 51 test files).
- **Boot guards, not red tests.** `assertObligationPurity`, "Obligations collected by no page" and "owned by no feature" stop `npm run dev` starting. The messages name concepts (binding, manifest identity), not files.
- **Saving a file loses the walk.** Every nodemon restart empties the in-memory store; the next visit reseeds, but the notification in progress is gone. Reset clears a set for every user at once, so concurrent research sessions collide.
- **Only `main` deploys.** `publish-branch.yml` is deleted, so work in progress cannot be shared before merge. The Kit designer shared by pushing to `main`, which the plants pipeline rightly forbids.
- **Most recent designer work falls outside plants.** Address book, templates, transporters, upload and a cross-commodity service home all belong elsewhere or were removed on purpose.
- **No research mode.** Validation and the entry guard are always on.
- **`--from high-risk-plants` was unfinished.** Six config files name `high-risk-plants` literally, so a copy of the real journey got no convention checks, no Playwright discovery and no seed.
- **Claude Code opened in the repo reported a missing hook on every prompt.** `.claude/settings.json` was plants-frontend's copy, wiring three Sonar hooks that `overrides.json` deletes.

## 4. Sync safety and design releases as sets

### What the weekly sync does

`npm run sync:upstream` runs at 04:00 every Monday. It merges `upstream/main` (plants-frontend) into the prototype, then classifies every changed path against `overrides.json`, first match wins:

| Rule | Action |
|---|---|
| matches a `deleted` glob | `git rm`; upstream's file never comes back |
| matches an `ours` glob | `git checkout HEAD -- path`; upstream's version is discarded entirely |
| anything else, including `patched` | left as git merged it; a clean merge stands, a conflict keeps its markers |

It then runs `npm ci`, `lint`, `npm test` and `npm run test:fit` (the set boot check) and opens a PR: ready on green, a draft labelled `needs-person` on any conflict or failure.

Two corrections the critic made, now carried into `PROTOTYPE.md`:

- **No sync PR merges itself.** `createPullRequest` is a bare `gh pr create` with no `--auto` and no merge step, and a PR opened with the workflow's `GITHUB_TOKEN` does not start the PR-check workflow. A person merges every one.
- **"The sync will overwrite anything you change" is not literally what happens.** An edit to an upstream-owned file is 3-way merged. It survives until upstream touches the same lines, then lands on a person as `needs-person`. So edits outside `ours` are on borrowed time, not silently lost.

`patched` is documentation, not a rule: `classifyPath` returns `patched` for every non-deleted, non-ours path whether or not it is listed. There is no test that the set of files differing from upstream equals `ours` plus `patched`, so undeclared drift only shows up as a surprise conflict later.

### Why editing `high-risk-plants` in place is wrong as a way of working

Everything under `src/server/app/sets/high-risk-plants/**` and `routes-high-risk-plants.js` is upstream's. A copy tweak survives until upstream edits the same lines. A new feature folder survives, but every barrel and flow edit needed to register it is a conflict magnet, because upstream edits those exact files when it adds pages. The change is in the deployed prototype but not in the real service, and if it is later raised upstream the next sync brings the same change back and the local copy conflicts with itself unless byte-identical. Acceptable for a one-off experiment discarded within the week; wrong otherwise.

### A design release is a set

A design release is a designer-owned copy of the journey, mounted as its own set under `/<release-id>`, that may diverge indefinitely and is never merged back. It is the plants answer to the Kit's freeze-and-copy habit, and it is sync-proof the moment it is scaffolded, because `new:set` appends its two globs to `ours`.

What the analysis found it needed, all on the prototype's own side:

1. **Do not copy tests.** About 50 copied `*.test.js` files fail because two sets are mounted and `soleSetId()` is undefined; 18 copied `*.fit.spec.js` files are run by vitest by mistake. A release does not need the engineering suite of the journey it forked; the platform tripwires (`no-set-singletons`, `co-residency`, the chooser FIT spec) still prove it boots.
2. **Seed data per set.** Parameterise `prototype-seed/` so any set with a `happy-path.json` gets examples.
3. **Trim ballast.** Skip `spec/` (1 MB of digest JSON) and `docs/`; link to the source set's docs instead.
4. **Write the description and a `release.json`** (`id`, `from`, `fromCommit`, `upstreamCommit`, `purpose`, `frozen`, `uuidMap`) so the chooser can show tags and a hand-off can rename ids back.
5. **A regression test** that scaffolds `--from high-risk-plants` into a temp tree and boots it. A CI canary does the same on every PR.

Viability: each release is about 1.2 MB of `journeys/` plus small model and services; four or five is nothing, dozens would slow `npm run dev`. Route prefixes and cookies are free and never collide. Welsh in a release is placeholder-checked, not parity-checked, a deliberate loosening the guide states. A release never receives upstream improvements; to pick them up, start a fresh release and carry the design changes across. Every push to `main` publishes one image, so a release is live as soon as its PR merges.

### Design releases as sets, in the designer's terms

- **Working release**: where the designer works.
- **Frozen release**: `release.json` `frozen: true`; skills refuse to edit it and the guard hook blocks it. "Freeze DR2, keep working in DR2.1" (`c442009`) is the designer's core habit.
- **Research release**: errors switched off in one commit that is reverted afterwards, logged in `sets/<id>/research-mode.md`; the chooser shows a "Research mode on" tag while that file exists.
- **Carry**: take the change inside `sets/<a>/`, rewrite ids and UUIDs through both `uuidMap`s, apply to `sets/<b>/` with `git apply --3way`. Refuses a frozen target and `high-risk-plants` (which goes to hand-off instead).
- **Retire**: `git rm -r` the folder and routes file, remove the mount lines, description, `ours` globs and seed scenario.

The ownership question a designer must ask before every edit has four answers: yours (in `ours`), shared on purpose (declared in `patched`, change with care and say why), belongs to the real service (make it in your release or hand it off), or removed by the weekly update (never edit).

## 5. The needs the suite had to meet, ranked

The critic's ranking, checked against the plants source, with the skill that answers each (from `plan.md` section 5 and `README.md` section 2). The plan weighted "save my work" as the single change that makes plants usable for this designer.

1. **Change content in English and Welsh together, with an en/cy report.** The dominant recent unit of work (28 recent commits) and the one plants makes hardest. The report is the only way to review Welsh until a language switch is wired upstream. Answered by `change-the-words`, `designer:words find` and `report`, and the `wording-sweep` workflow for more than 5 pages.
2. **"Save my work."** Format, run the fast check, write the commit message from the diff, make the branch and open the PR. The designer commits to `main` with one-word messages; plants runs the full ladder on pre-commit and protects `main`. Answered by `share-my-change` and `designer:save`.
3. **Screenshots per page, plus the existing FIT video.** The old designer worked from Figma and Mural; plants produced only video and traces for 5 smoke paths. Needed a prototype-owned picture of every page, initial and error state, desktop and 320 px, before and after, with a Figma frame beside it. Answered by `show-my-change` and `designer:show`.
4. **Prepare a research session.** Reset, check, stable example links (`/examples/<set>/<example>`) that survive a restart, and a task sheet. Answered by `research-session` and the stable links in the chooser.
5. **Finish the fork or variant of a design release.** The freeze-and-copy habit needed `new:set --from high-risk-plants` to work, plus freeze, carry and retire. Answered by `design-release` and the `new:set` changes.
6. **Hand a change to the real frontend team.** A change in a release has renamed paths, ids and UUIDs; a change to `high-risk-plants` fights the Monday sync. Needed a brief, screenshots, a Jira-ready text and a patch with ids renamed back, checked with `git apply --check`, plus a flag for model changes. Developers use captures and a plain statement of intent, not prototype code. Answered by `hand-off` and `designer:handoff`.
7. **Flow and branching changes, routed to the recipes.** Reorder, move between sections, branch on an answer, add a page. The hardest common request. Answered by `change-the-journey`, a port of steps 1 to 4 of the workspace `frontend-change` skill.
8. **Research mode, off by default.** Validation relaxed for a round in one revertable commit. Part of `research-session`.

Alongside these: fix `PROTOTYPE.md`'s auto-merge sentence, state the common-capability gap in the guide and offer "fake a service in a release you own" (`fake-a-service`), explain up front that saving a file loses the walk, replace the dead Sonar hooks with a prototype-owned `settings.json`, and make every skill check ownership before it edits.

## 6. Timeline by batch

One line per batch of the old prototype's history. The pre-window batch is included for context and carries lower weight.

| Batch | Dates | Commits | What happened | Note |
|---|---|---|---|---|
| old | 2 to 26 Jun | 14 (13 designer) | A full live-animals journey landed twice: "v1" in one drop on 3 June with `node_modules` committed, then a "New version" rebuild around a notification hub on 25 June, with the review, declaration, documents and addresses tail re-added the same evening. Figma node ids in the Sass disappear from here on. | [notes/old.md](notes/old.md) |
| b01 | 2 Jul | 4 | "updates to v1": journey reordered, multi-commodity model, transit and transhipment reveals, div-based summary tables instead of `govukTable`, review page re-sectioned, guards switched off. Three fix-ups the same day. | [notes/b01.md](notes/b01.md) |
| b02 | 6 Jul | 5 | Address book lands in the morning (500 generated lookup addresses, 24 padded rows); the dashboard lands in the afternoon with Figma-exported SVG icons and 32 hand-curated notifications replacing generated ones within four minutes. | [notes/b02.md](notes/b02.md) |
| b03 | 7 to 8 Jul | 7 | Dashboard filter panel filled in; add-a-transporter, view-an-address and add-a-contact-address flows built by cloning the address-book pattern; the same custom select recipe pasted into the SCSS three times. | [notes/b03.md](notes/b03.md) |
| b04 | 10 to 14 Jul | 7 | "feedback updates" (29 files) introduces the linear `getJourneySteps` engine; contact address moves three times in three days; Monday adds arrival-date validation, Tuesday purges almost all validation for a research round. | [notes/b04.md](notes/b04.md) |
| b05 | 15 to 16 Jul | 12 (3 designer) | The Testing version: 24 views copied under `/testing` with a 335-line mount that clones the router stack and nests the session. Real validation switched on at 01:30 the next morning. Sam's Playwright `journey-demo` and its CI land alongside. | [notes/b05.md](notes/b05.md) |
| b06 | 17 to 22 Jul | 6 | The testing dashboard rewritten twice in 47 minutes into an IPAFFS lookalike with bespoke tags; Design release 2 born on 22 July (+6,930 lines) with the generic `version-mount.js`, a task-led dashboard and a review page with status variants; copy pass and a templates page the same afternoon. | [notes/b06.md](notes/b06.md) |
| b07 | 23 Jul to 4 Aug | 4 | "new address book, templates and amend" (seven changes in one commit: category tabs, usage checkboxes, NI lookup, working templates, copy-as-new, amend modal, form-actions partial); "germinals" forks Design release 2.1 and adds germinal products, delete, drafts and re-submit. | [notes/b07.md](notes/b07.md) |
| b08 | 17 to 26 Aug | 3 | In-journey add-address page with multi-role addresses; address-book URLs made version-aware after prefix leaks; templates become create-by-walking-the-journey with per-section change links; drafts persist automatically; the submitted page splits into started and submitted. One edit made in all four `roles-and-addresses.html` copies. | [notes/b08.md](notes/b08.md) |
| b09 | 3 to 16 Sep | 7 | A content sweep ("&" to "and", shorter buttons, ITAHC wording) across about 30 strings; a version-gated label made universal a week later; the confirmation-page tracker hand-reverted; review page flattened in all four versions; germinal products simplified and given real validation. | [notes/b09.md](notes/b09.md) |
| b10 | 22 to 24 Sep | 3 | "new dashboard": an overall service home with Live animals, Germinal products and a placeholder Plants section, and a "What are you importing?" page that scopes the journey; then Air/Rail/Road/Sea with an alias map, plants-pilot commodity options, a shared delete-confirmation pattern, and the Playwright fixture kept in step. | [notes/b10.md](notes/b10.md) |

The direction of travel in the last batch matters: within two days the old prototype moved from "Live animals and germinal products" to a service home with a plants section and plants-pilot radios (plants for planting, potatoes, wood products). The designer was already prototyping the cross-journey front door that `trade-imports-ins-frontend` and `trade-imports-plants-frontend` are building for real, which is the strongest argument for pointing designers at the plants prototype.
