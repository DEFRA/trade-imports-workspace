# How the GB-notification-service prototype is used

Analysis of the read-only clone at
`workareas/designer-prototyping/GB-notification-service` (HEAD `fcf7d7f`,
2026-09-24). Recent = since 2026-06-27. Evidence is git history plus the
source tree; where something is inferred rather than observed it says so.
Raw logs behind the numbers are in `../logs/`.

## 1. What it is

- GOV.UK Prototype Kit 13.20.2, govuk-frontend 6.3.0 (rebrand on),
  `@ministryofjustice/frontend` 9 (date picker), `moment`. CommonJS,
  standard style (no semicolons). Node 24 in CI.
- The repo is four months old. First commit 2026-06-02 ("Initial commit",
  Matthew Solle, gmail address — org bootstrap, not a contributor). Every
  product commit is by one designer, MrMister-88 (Equal Experts email): 63 of
  74 commits. The other 10 are Sam's July `journey-demo` work plus one merge.
- Scale: `app/routes.js` is a single 13,001-line file with 92 route
  registrations and 64 version-flag branches (`isDesignRelease21SessionData`
  etc). `application.scss` is 9,666 lines. 166 tracked view files, 22
  client-side JS modules, 35 data modules under `app/data/`.
- No README (the kit's default README was deleted in the 2026-06-25
  rewrite), no Procfile, no `app.json`, no `.env` sample, no tests of the
  prototype itself. `.gitignore` covers `.cursor/`, `.vscode/`, `.idea/`.

## 2. The four versions and how they are mounted

The index page (`app/views/index.html`) is a menu of four cards, each with a
govukTag and a start button:

| Card | Tag | Mount | Views | Purpose stated on the card |
|---|---|---|---|---|
| Design release 1 | In design (purple) | root `/` | `app/views/*.html` | "the current design release journey at the root URLs. Use this for stable reference work." |
| Design release 2 | In design | `/design-release-2` | `app/views/design-release-2/` (32 views + 9 partials) | "A duplicate of Design release 1 for making changes without affecting the original version." |
| Design release 2.1 | In design | `/design-release-2.1` | `app/views/design-release-2.1/` (36 views + 15 partials) | "A duplicate of Design release 2 for making changes..." |
| Testing version | Testing (yellow) | `/testing` | `app/views/testing/` (24 views) | "A separate testing journey with CHEDA references and IPAFFS-style dashboard patterns." |

Mechanism (`app/lib/version-mount.js`, 364 lines): each version is a
**mirror mount**, not a fork. `createVersionMount` copies the root router's
stack under the base path, nests session data under a per-version key
(`_designRelease21`), shares two session keys across versions
(`addressBookAddedAddresses`, `submittedNotifications`), monkey-patches
`res.redirect` / `res.render` / `res.end` so redirects are prefixed and a
view resolves to the version folder **only if a same-named file exists
there**, otherwise falls through to the root view. The address book,
`/public`, `/plugin-assets` and `/manage-prototype` are deliberately
unprefixed. Route handlers branch on session flags to change behaviour.

History of the mechanism:

- 2026-07-15 `2191e30 testing version` (+3,870 lines): first version mount,
  hard-coded for `/testing` (`testing-version.js`, 335 lines).
- 2026-07-22 `6d3dd1e dashboard changes to design release 2` (+6,930):
  refactored into the generic `version-mount.js`; DR2 added.
- 2026-08-04 `c442009 germinals` (+5,693): DR2.1 added; germinal products
  journey; DR2 frozen as a copy.
- 2026-09-22 `7467690 new dashboard`: DR2.1 gets an overall dashboard
  (`dashboard-home.html`) with Live animals / Germinal products /
  **Plants, plant products or other objects** sections, plus a
  `notification-type` page whose normaliser knows `plants-for-planting`,
  `potatoes`, `wood-products`, `products-of-animal-origin`, `high-risk-food`.
  That is the prototype's first reach toward the plants journey.

Consequence that matters for tooling: **a cross-cutting change is applied by
hand to up to four copies of the same view.** Commit `8283340` (2026-09-10)
makes the identical edit (drop h3 subheadings, rename "Consignment parties"
to "Consignment addresses") in `review-notification.html` in root, testing,
design-release-2 and design-release-2.1. `a0e46bd` (08-26) touches
`notification-status.html` in three partial folders. There is no shared
macro layer between versions; each release is a snapshot that diverges.

## 3. Who uses it and for what

Inferred from index copy, view names, commit messages and the workspace docs.

1. **The designer, daily.** Cursor is the editor (`.cursor/` gitignored from
   the first real commit on 2026-06-24). The 2026-06-25 "New version" commit
   (+4,790/-6,885, 70 files) rewrote the whole app in one go, deleted the
   README and introduced the JS autocompletes and data modules; the
   version-mount middleware (WeakSet cycle guard, `Object.defineProperty`
   accessors, router-stack copying) arrived complete in one commit. That
   sophistication, alongside commit messages such as "updates", "text",
   "new", "6786", is the signature of AI-assisted authoring in an editor,
   committed by a designer who is not a developer.
2. **User research.** The "Testing version" is a research build: CHEDA-style
   reference `GB.2026.7963913 - CHEDA`, IPAFFS-style header without service
   nav, service name "Import of products, animals, food and feed service",
   a dashboard with "Clone a certificate" and keyword/commodity search
   mirroring IPAFFS. Built 2026-07-15 (14:19), fixes at 16:25 the same day
   and 01:30 the next morning — a same-day burst that reads as preparing for
   a research session. Since 2026-07-17 the testing views are only touched
   when a cross-version content sweep lands.
3. **Design releases shown to stakeholders and handed to developers.** DR1
   is the signed-off definition (`dr1-parity/HANDOVER.md`: "DR1 is the
   signed-off visual definition of the application ... where the frontend
   differs from DR1 the frontend is wrong"). DR2 (07-22) and DR2.1 (08-04)
   are the next releases in design. The card copy "Use this for stable
   reference work" and the freeze-and-copy pattern exist precisely so the
   dev team has a stable target while design moves on.
4. **Non-technical stakeholders via recorded video.** Sam's `journey-demo/`
   (07-15/16, 9 commits, PR #1) is a Playwright suite whose deliverable is
   the video and HTML report. GitHub Actions records four walks on every
   push to `main` and uploads the report as a 30-day artefact. It drives DR1
   only. The designer has kept it alive minimally: `fcf7d7f` (09-24) fixed
   three data values after "Airplane"/"Railway" became "Air"/"Rail". The
   README carries a paste-ready prompt for handing updates to a coding
   agent — the only agent-facing documentation in the repo.
5. **Deploy.** Nothing in the repo says Heroku: no Procfile, `app.json`,
   pipeline config or app name. The package scripts are the kit defaults
   (`dev`, `serve`, `start`), so the standard Heroku recipe applies
   (`npm start` = `govuk-prototype-kit start`, production mode, `PASSWORD`
   config var set on the app, not in git). The journey-demo README notes
   that production mode force-redirects to HTTPS and uses secure-only
   cookies, which is why the demo boots with `npm run dev`. The prototype
   kit's `usage-data-config.json` is gitignored. Treat the Heroku app as a
   push-to-deploy of `main` — every commit lands there.

## 4. Commit cadence and quality

58 non-merge commits since 2026-06-27, 49 by the designer.

- **Two phases.** July: 42 commits, bursts of 4-6 per day on 07-02, 07-06,
  07-07, 07-10, 07-15, 07-22 — DR1 fixes, address book, transporters,
  dashboard, then testing version and DR2. August onward: one session per
  week (08-04, 08-17, 08-26, 09-03, 09-10, 09-16, 09-22, 09-24), each 1-3
  commits.
- **Session shape.** A large commit (300-5,700 insertions) followed within
  10-60 minutes by one or two small fix-ups ("text update", "content
  changes", "validation"). Big commits land at start of day (08:17, 09:01,
  10:44) or late evening (22:23, 01:30), i.e. a day's work committed as one
  unit. Weekdays only; heaviest Tue-Thu.
- **Feedback loops.** `4377980 feedback updates` (07-10, 29 files) and
  `50afa9e reverted back to confirmation page` (09-10) show changes driven
  by review, with one explicit reversal.
- **Messages.** One line, lower case, no body, no ticket ids. Vocabulary is
  the feature name or "updates"/"fixes"/"text". Nine commits use the GitHub
  web-editor default ("Update routes.js", "Update index.html", "Create
  .DS_Store"), so some edits are made in the browser. Sam's nine commits are
  the only ones with bodies, `Co-Authored-By` trailers and CI rationale.
- **Branches and PRs.** One branch ever besides `main`
  (`feat/playwright-demo-flow`, Sam's, merged as PR #1). The designer
  commits straight to `main`; the single designer merge (`9d55dda`) is a
  pull-before-push merge of origin/main, not a feature merge. No tags, no
  releases, no CI for the prototype itself.

## 5. What kind of work is done (recent, by frequency)

From `logs/recent-name-status.txt`:

1. **Content and copy sweeps** across versions — headings, labels, section
   names, hint text (`8283340`, `903344e`, `077c2f0`, `b9795ab`, `fcf7d7f`).
2. **Dashboard iterations** — five distinct "new dashboard"/"dashboard
   changes" commits (07-06, 07-17, 07-22, 08-04, 09-22): tabs, cards,
   search, date-range input, per-notification-type dashboards.
3. **Address book** — add/lookup/manual address, usage categories, branch
   and destination uses, per-section use groups (07-06/07, 07-23, 08-17,
   08-26, 09-24 delete-address).
4. **New journey variants** — germinal products (08-04, 09-16), templates
   (create/view/delete), amend and cancel-amend modals, copy-as-new, delete
   notification.
5. **Fixture data** — `app/data/*.js` edited in most commits: dashboard
   notifications, templates, commodities, identifiers, import reasons.
6. **Client-side JS** — bespoke autocompletes (`country-search`,
   `commodity-search`, `transporter-search`), modals, copy buttons,
   auto-dismiss banners, tab scroll. Not govuk-frontend components; parity
   docs note "the prototype builds its spine screens from bespoke `app-*`
   markup, not govuk-task-list / govuk-summary-list".
7. **Sass** — `application.scss` changes in 30 of 49 designer commits; it
   is the one file touched almost every session.

## 6. How the real frontend team consumes it

The workspace treats the prototype as the requirements source and has
industrialised reading it (`workareas/shared/dr1-parity`, `dr1b-parity`,
`dr1c-parity`, `dr21-parity`, `parity-automation`, `tools/parity`,
`.claude/skills/parity`):

- Both sides are booted (kit in dev mode on port 3010; frontend on the
  stack's `:3100` test target), walked by Playwright, reduced to page models
  with a shared extractor, paired screen-to-screen and diffed. Findings carry
  `file:line` on both sides and are verified by a second agent briefed to
  refute them. DR2.1 run: 97 increments; DR1 run: 133 findings, 113 of them
  accepted work without a ruling.
- Rules the team has learned about the prototype, worth carrying into any
  designer tooling:
  - DR1 is the **root** mount; release folders override only some views, so
    a DR2.1 finding is not automatically true of DR1.
  - Conditional reveals hide questions with no view file of their own
    (`buildImportReasonItems`, `routes.js:8778`).
  - The page model lies in both directions (fabricated hints, collapsed
    fieldsets, `caption: null` on every prototype screen because it uses its
    own class); read the rendered DOM.
  - The kit's nodemon bounces mid-compile; wrap first navigation in
    `toPass({ timeout: 240_000 })`. `selectedSpecies`/`transitCountries`
    seed as the literal `"[]"`.
  - The address book is copied under every base even though hrefs are
    unprefixed — earlier runs wrongly excluded it from scope.
- The plants digest (`high-risk-plants-digest/HANDOVER.md`) lists the
  prototype as a secondary source and finds it "near-empty on plants" —
  consistent with plants appearing only on the 09-22 overall dashboard.
- Frictions recorded on the consuming side: prototype-side code citations
  are "mostly noise" (throwaway code); one prototype view can serve several
  frontend pages; every corpus has to be re-captured because "both codebases
  move weekly"; only a statement from the designer can settle questions such
  as whether delete/amend are DR1 or DR2 features.

## 7. Designer workflow and skill profile (inference)

- Works alone, in Cursor with an AI assistant, on `main`, committing whole
  sessions at once with minimal messages; occasionally edits in the GitHub
  web UI. Comfortable with the kit's conventions (Nunjucks macros, session
  data, `app/data` fixtures) and with asking the assistant for substantial
  code (the version mount, autocompletes, modals) but not with branches,
  PRs, tests, CI or refactoring: 13k-line `routes.js`, 9.7k-line Sass,
  four copies of each view, changes replicated by hand.
- Optimises for **speed to a clickable screen** and for **freezing a
  release** so stakeholders and developers can keep pointing at a stable
  URL while design continues. The versioning mechanism is the designer's
  answer to "don't break DR1 while I work on DR2" and is the single most
  important convention to preserve or replace in any new prototype tooling.
- Feedback arrives from research sessions and stakeholder reviews and is
  applied as same-day copy tweaks; a reversal happened once in three months.
- Does not use the Playwright demo as a working tool; kept it compiling with
  a three-line data fix two months after it was written. Any designer-facing
  automation therefore needs to be invisible when it passes and to explain
  itself in plain English when it fails.

## 8. Implications for designer skills on the plants prototype

Derived directly from sections 2-7; these are observations to design
against, not a plan.

1. The dominant recent unit of work is a **copy/content sweep across many
   pages** followed by a **fixture data tweak**; a skill that makes those two
   cheap and verifiable covers most sessions.
2. The second unit is **"new dashboard" / new page variant** built by
   duplicating an existing view; the plants prototype's shared journey
   platform should replace copy-the-folder versioning with something that
   still gives a stable "release" URL and a "working" URL.
3. Designers commit to `main` with one-line messages and no PRs; the tooling
   must not depend on branch discipline it cannot enforce, but can generate
   the branch, message and PR for them.
4. The prototype's value to developers is the **captured render** (DOM,
   screenshot, page model), not the code; a skill that produces that
   capture on every change removes the re-capture cost the parity runs pay
   today and gives the designer a shareable artefact like the journey-demo
   video.
5. Bespoke `app-*` components are where the prototype drifts from GOV.UK;
   a govuk-frontend-toolbox guard rail (already a workspace rule) is worth
   surfacing to designers as a suggestion, not a block.
6. Plants coverage in the old prototype is one dashboard section and one
   radio option; there is nothing to port, so plants skills should start
   from the plants frontend's own recipes plus the address book, dashboard,
   templates and amend patterns the designer has iterated on most.

## Critic addendum

Written by the completeness critic on 2026-09-27. It is filed here because
`analysis.md` did not exist yet and the harness would not create it. The
synthesis step should carry this section into `analysis.md`. Claims in the
other notes that were simply wrong have been corrected in those notes
(`plants-verify.md` §4d, `plants-sets.md` §3, `plants-pages.md` §6,
`anatomy.md` §10).

### A. How it was checked

`logs/critic-log.txt` is `git log --since=2026-06-27 --shortstat`. It lists
58 non-merge commits (49 by the designer, 9 by samfarrington) and 2 merges.
The 8 largest by insertions, each re-read with `git show --stat`:

- `6d3dd1e`, 22 Jul, +6930 (b06)
- `c442009`, 4 Aug, +5693 (b07)
- `dc8dcc6`, 23 Jul, +4027 (b07)
- `2191e30`, 15 Jul, +3870 (b05)
- `b75ce0a`, 6 Jul, +2601 (b02)
- `9abc06e`, 2 Jul, +2246 (b01)
- `a0e46bd`, 26 Aug, +1724 (b08)
- `7661d29`, 17 Aug, +1675 (b08)

Each commit lists the same files its batch note describes, and every kind
of change in them is recorded somewhere in the batch notes. The gaps are in
this file's roll-up (§5, §8), which drops or blurs the types in section B.

### B. Change types the roll-up missed or merged wrongly

1. **Journey re-sequencing and branching**:
   - page order redesigned (`9abc06e`)
   - contact address moved three times in three days (`4377980`, `33f5836`, `c149d7b`)
   - conditional additional-details page (`268f070`)
   - a first question that scopes the journey (`7467690`)

   In plants this is `flow.js`, `task-rows.js`, `RUN_STEPS` and hub `GROUPS`; branching is an obligation `applyTo` gate. It is the hardest common request.
2. **Switching validation off and on for research rounds.** Validators and guards were hollowed out in `9abc06e`, `9038927` and `a0aaf28`, and switched back on in `cb13efb` and `91507cb`. Plants has no "research mode": validation and the entry guard are always on.
3. **Review page (check your answers) restructuring** as its own type, not a content sweep: `9abc06e`, `6d3dd1e`, `c149d7b`, `cb13efb`, `8283340`, `fcf7d7f`.
4. **Confirmation-page variants and a hand-made revert** (`c149d7b`, then `a0e46bd`, then the `50afa9e` rollback).
5. **The notification lifecycle**: submit then dashboard, read-only view, copy as new, amend or cancel amend, delete, drafts, templates. Plants has amend, cancel-amend and delete, and `copy()` in the stub store. It has **no copy-as-new page and no templates**.
6. **Vocabulary and reference-format decisions**: CHEDA or GBN-AG, "Submission complete" becoming Submitted or Completed, Air/Rail/Road/Sea with an alias map. In plants, changing an option value breaks `happy-path.json`, and therefore the seed and journey-smoke tests.
7. **Header, service navigation and home page** (`9abc06e`, `b75ce0a`, `8845358`, `6d3dd1e`, `7467690`). In plants these live in upstream-owned `shared/layout.njk`.
8. **Copying the incumbent service as a baseline.** The `d4af0df` IPAFFS lookalike used non-GOV.UK `.app-ipaffs-tag` chips so research could compare old against new. This is a real "variants side by side" need, and it clashes with the govuk-toolbox-only rule. The suite needs a stated position.
9. **Consolidation into partials and version-path fixes** (`dc8dcc6`, `fcf7d7f`, `491b392`).
10. **Placeholder-first building.** New pages ship with `href="#"`, controls that look like they work but do not, and scaffold copy. In plants, copy-parity (an English string identical in Welsh fails) and pinned `copy.test.js` strings turn this red at every step unless a designer set is excused from them.

### C. Plants claims corrected in place

- **Sync PR "auto-merges" or "merges itself".** This was wrong in `plants-verify.md` and `plants-sets.md`, and **PROTOTYPE.md itself is wrong**. `scripts/sync-upstream/git.js#createPullRequest` is a bare `gh pr create` with no `--auto` and no merge step. A PR opened with the workflow's `GITHUB_TOKEN` does not start `check-pull-request.yml`. Someone has to merge every sync PR.
- **`capture:high-risk-plants` as "screenshots".** This was wrong in `plants-pages.md` §6. It fetches reference-data JSON from `:8086`.
- **"55 designer commits"** (`anatomy.md`). The correct figure is 49.
- **Confirmed in the source:**
  - port 3103 (`config.js:61`)
  - the pre-commit hook runs `format:check && lint && npm test`
  - `test:high-risk-plants` skips the parity, convention and contract tests
  - vitest, copy-parity, copy-convention, the Playwright `features` project and `fit/set-base.js` all name `high-risk-plants` literally
  - the dead Sonar hooks in `.claude/settings.json`
  - 13 stub address-book rows
  - 4 seed scenarios
  - the FIT webServer runs on `PORT ?? 3003` with `PROTOTYPE_SEED=false`

### D. Designer needs missed (checked in the plants source)

1. **Reviewing Welsh content: not possible in the browser.** `src/server/app/shared/copy.js` says every call site resolves `en` because no locale toggle is wired yet, and that `copy.cy.js` is machine-draft Welsh awaiting translator sign-off. Two options:
   - a static en/cy side-by-side report generated from the copy modules (no code change)
   - a locale override raised upstream
2. **Variants side by side.** Old: four release cards plus an IPAFFS lookalike. Plants varies only whole sets, and `--from high-risk-plants` is unfinished. Nothing lets a designer vary one page inside a set, and nothing produces a comparison page of the same slug in two sets.
3. **Resetting between research sessions.**
   - Old: resets were per browser session, and each version had its own namespace.
   - Plants: the data is shared, and Reset clears a set for everyone. Concurrent research sessions collide.
   - The production session cache is `redis` (`config.js:146`), but the records store is a `Map` inside each process. With more than one CDP instance, the shared examples and reset only hold per instance.
4. **Shareable links.**
   - Only `main` publishes (`publish-branch.yml` is deleted), so work in progress cannot be shared before merge.
   - Deep links to a notification do work across users (`engine/journey.js#currentJourney` adopts any loadable `journeyId`), but ids are freshly minted reference numbers (`records/stub/lifecycle/create.js`). Every restart or reset breaks links to seeded examples. Stable seeded ids are needed.
   - Whether CDP deploys the prototype is Sam's platform config and was not checked.
5. **Screenshots for Mural and Figma.** The old designer worked from Figma (node ids in the Sass, SVG exports, a Cursor Figma plugin). Plants produces only FIT video and traces for 5 smoke paths, and `tim capture` is workspace-only. Needed: a prototype-owned "PNG of every page" script over `flow.js` slugs, covering initial and error states at desktop and mobile widths.
6. **Handing a change to the real frontend team.** A change in a designer set has renamed paths, ids and UUIDs, so it cannot be applied upstream as-is. A change made to `high-risk-plants` directly fights the Monday sync. Needed: a hand-off skill that produces a patch or PR description against plants-frontend, with ids renamed back, the recipe step behind each hunk, screenshots, and a flag for model changes. The parity runs already showed that prototype code citations are "mostly noise"; developers use captures plus a plain statement of intent.
7. **Most recent designer work falls outside plants.** The common capabilities have no plants equivalent:
   - address book CRUD: a separate service in plants; the header link goes nowhere
   - templates: none
   - transporters and document upload: removed on purpose upstream
   - a service home across commodity types: belongs to ins-frontend

   The suite should say so and offer "fake a page or service in a designer-owned set" (`plants-data.md` §6d).
8. **Edits wipe the data.** Every nodemon restart empties the store, so saving a template or copy file loses the walk in progress. This must be explained up front.
9. **"Save my work".** The designer commits to `main` with one-word messages. Plants runs the full ladder on pre-commit and protects `main` with PR checks. A skill that formats, runs the fast rung, writes the message from the diff, and opens the branch and PR is the single change that makes plants usable for this designer.

### E. Suggested priority

1. content change, English and Welsh together, plus the en/cy report
2. "save my work"
3. screenshots per page, plus the existing FIT video
4. "prepare a research session" (reset, check, stable ids)
5. finish fork or variant of a design release
6. hand-off to plants-frontend
7. flow and branching change, routed to the recipes
8. research mode (validation relaxed), off by default

Also fix PROTOTYPE.md's auto-merge sentence and state the common-capability gap in the guide.
