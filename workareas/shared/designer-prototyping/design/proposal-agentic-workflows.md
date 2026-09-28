# Designer suite for the plants prototype: agentic-workflows proposal

Written 2026-09-27. Lens: **agent leverage**. Skills and Claude Code workflows do the heavy, multi-file
lifting (make a design release, re-create a Prototype Kit page in real components, sweep wording in
English and Welsh, screenshot every page I changed, prepare a hand-off for the dev team). Strong,
mechanical guard rails stop agents from breaking files that belong to the real service.

Target repo: `trade-imports-plants-prototype` (branch `feat/NO_JIRA-designer-prototyping`). Every
path below is repo-relative. Designers have only this repo: nothing may depend on the workspace,
`tim` or `tools/`.

Inputs: the analysis taxonomy (18 change types, recent-weighted), `notes/plants-*.md`,
`notes/reusable-assets.md`, `PROTOTYPE.md`, `overrides.json`, `package.json`.

## 1. The shape of the suite

The designer talks in design terms. The agent turns each request into one of 12 skills, which run
scripts to do the fixed steps and use agents only where judgement is needed:

| The designer says | Skill | How often it came up (recent) |
|---|---|---|
| "make this look like the Figma", "use a card here", "wider column" | `look-and-layout` | styling 30 |
| "re-create this Prototype Kit page", "port the GB notification page for X" | `port-kit-page` (workflow) | styling + new pages |
| "change the wording", "rename X everywhere", "update the hint" | `change-wording` (+ sweep workflow) | wording 28 |
| "add an example that is late / deleted / at the arrival page", "add a party" | `example-data` | fixture data 20, deep links 2 |
| "fake a transporter lookup", "add status tabs to the dashboard", "templates" | `fake-a-service` | common capabilities 17, dashboards 16 |
| "start a new release", "freeze DR3", "carry this change to DR2", "retire DR1" | `design-release` | releases 3, fan-out 8 |
| "add a page", "move a page", "only ask this for potatoes", "regroup the task list" | `journey-change` | flow 10, CYA 10, pages 10, hub 6, confirmation 4 |
| "turn validation off for research", "set up the research round" | `research-round` | validation 10 |
| "run the prototype", "it won't start" | `start-prototype` | every session |
| "did I break anything?" | `check-my-change` | every session |
| "show me what changed", "screenshot my pages", "make a video" | `show-my-change` | every session, demo 1 |
| "save my work", "make a PR", "undo that" | `ship-my-change` | every session, reverts 5 |
| "send this to the dev team", "make this real" | `hand-off` (workflow) | the route into plants-frontend |

Every skill:

1. **Starts with an ownership gate.** `npm run designer:where -- <paths>` says, in plain English,
   whether each file is yours (a design release), carries a prototype patch, or belongs to the real
   service. If it belongs to the real service, the skill offers to make the change in a design
   release (the default) or to prepare it for the real service through `hand-off`. It never edits in
   place on a normal branch.
2. **Ends with a verification step the designer runs and sees**: `npm run designer:check -- --quick`
   (a plain-English pass or fail list), then `npm run designer:show` (before and after screenshots of
   the affected pages at desktop and mobile width, the error state, and the walk video, in one HTML
   page that opens by itself), then the `http://localhost:3103/<set>/...` URLs to click.
3. **Ends with a hand-off line**: "If this should become part of the real service, say 'hand this
   off' and I will prepare it for the plants-frontend team."

## 2. Decisions made (flagged, not gated)

1. **Designer work lives in design releases, never in `high-risk-plants`.** A release is a set made
   by `new:set --from high-risk-plants`, and its files are `ours`. Editing `high-risk-plants` happens
   only on a `handoff/*` branch built by the `hand-off` workflow, whose output is meant for
   plants-frontend.
2. **Releases carry no engineering tests.** `new:set` stops copying `*.test.js`, `*.fit.spec.js`,
   `fit/`, `spec/` and `docs/` when the source is not `sample-journey`. This removes the "copy is a
   test contract" friction for designers: a wording change in a release touches 2 files, not 5. The
   release is protected by prototype-owned generic checks instead: copy shape parity for every
   release, a render check of every page, and a FIT walk for every release.
3. **Welsh policy.** Designers never invent Welsh. When a release's English changes and no Welsh is
   given, the `cy` leaf becomes `'[Welsh needed] <English>'`. The key shape and function arity stay
   identical, so the shape check passes. `hand-off` lists every marker for translation.
4. **No bespoke Sass.** The suite changes "match the design" into GOV.UK macros, utilities and
   layout options. Anything the toolbox cannot express goes in the release's `design-gaps.md`, and
   `hand-off` carries it to the dev team. `src/client/**`, `shared/layout.njk` and webpack are never
   touched.
5. **`package.json` gets `designer:*` scripts.** It is already `patched` for the same reason
   (`new:set`, `sync:upstream`). One npm entry per tool gives designers one command each and gives
   the settings allowlist one pattern (`npm run designer:*`). The `why` is updated. No new
   dependencies: `zod` is not added, and ported code uses hand-written checks.
6. **Show output goes to `.cache/designer/`**, which `.gitignore` already covers, so `.gitignore`
   is not patched.
7. **"Before" screenshots come from `git archive HEAD` exported to `.cache/designer/base-<sha>/`**,
   with `node_modules` symlinked. This avoids `git stash`, and the designer's working tree is never
   touched.
8. **Stub overlays go into the four `services/*/index.js` seams that are already patched**, not
   into new patched stub files. This adds one line per file, not new divergences.
9. **`.claude/settings.json` becomes `ours`.** This replaces the earlier "add it to `deleted`"
   proposal, because the suite needs a permission allowlist and a guard hook. The content goes in
   `settings-proposal.json` for Sam to apply, because agents may not edit settings. Until Sam applies
   it, the guard rails are the rules, CLAUDE.md and the skill gates.
10. **Branch names.** A designer's work goes on `design/<set>-<slug>`, and a hand-off on
    `handoff/<slug>`. Maintainers (Sam) use `maintain/<slug>`, where the guard hook allows edits to
    upstream files.
11. **Model tiers in workflows.** Each workflow script has one `MODELS` constant
    (`runner` for fixed command-running steps, `builder` for file edits, `judge` for planning and
    fidelity review). This is the single place to point steps at Fable or another model.
12. **Workflows are optional acceleration.** Each workflow's SKILL.md also describes the same steps
    run one after another by the main agent, for hosts without the Workflow tool (Cursor).

## 3. Deliverables

Paths are disjoint. The integration deliverable alone owns `PROTOTYPE.md`, `CLAUDE.md`,
`AGENTS.md`, `overrides.json` and `package.json`. Other deliverables list the `ours` globs,
`patched` entries and npm scripts they need, and integration applies them.

### D1. designer-suite-integration (integration)

**Owns:** `PROTOTYPE.md`, `CLAUDE.md`, `AGENTS.md`, `overrides.json`, `package.json`,
`docs/designers/README.md`, `scripts/sync-upstream/designer-suite.test.js`

- **CLAUDE.md** (at most about 150 lines, always in context):
  - Who uses this repo and why.
  - The load-bearing rules:
    - Check ownership before any edit (`npm run designer:where`).
    - The never-edit list.
    - Wording lives in copy files; change en and cy together, with the `[Welsh needed]` marker when
      no Welsh is given.
    - Stay in the GOV.UK toolbox.
    - One change per request.
    - Examples replay real routes.
    - Install only with `npx --yes npm@11.6.2 ci`, never `npm install`.
    - One Bash command per call.
    - Every change ends with check, show and the hand-off line.
  - A routing table from phrase to skill.
  - A glossary: set, design release, example, upstream, weekly sync, hand-off, `needs-person`.
  - Pointers to `docs/designers/` and the upstream recipe docs, which are read-only.
- **AGENTS.md**: about 10 lines pointing other agents (Cursor) at CLAUDE.md and `.claude/skills/`.
- **PROTOTYPE.md**:
  - Add "Working with Claude Code", with a table of what you want to do, what to say and the skill
    that does it.
  - Correct the sync section: no PR merges itself; outside `ours` is a 3-way merge that lands on a
    person.
  - Say that releases are snapshots and their Welsh is not parity-checked.
  - Say that data is lost on every restart, and that you pin an example to keep a state.
  - Describe the check, show and ship loop.
  - Setup notes: run `npm run playwright:install` once; what to do if port 3103 is in use.
- **overrides.json**:
  - Add to `ours`: `CLAUDE.md`, `AGENTS.md`, `.claude/skills/**`, `.claude/rules/**`,
    `.claude/workflows/**`, `docs/designers/**`, `scripts/designer/**`,
    `src/server/prototype-checks/**`, `src/server/prototype-data/**`,
    `src/server/prototype-services/**`, `src/server/prototype-research/**`,
    `fit/designer-sets.fit.spec.js`, `handoffs/**`.
  - Update the patched `why` for `package.json`, and for the address-book, countries and ports
    `index.js` seams (the overlay line from D8).
- **package.json scripts**:
  - `designer:where` → `scripts/designer/ownership/cli.js`
  - `designer:check` → `scripts/designer/check/cli.js`
  - `designer:show` → `scripts/designer/show/cli.js`
  - `designer:find-text` → `scripts/designer/copy/cli.js`
  - `designer:examples` → `src/server/prototype-seed/cli/index.js` (owned by D8)
  - `designer:release-diff` → `scripts/designer/release-diff/cli.js`
  - `designer:research` → `scripts/designer/research/cli.js`
  - `designer:ship` → `scripts/designer/ship/cli.js`
  - Also remove the dead `fit:start:workspace` and `check:workspace-stack` entries, whose script is
    in `deleted`.
- **designer-suite.test.js** (vitest):
  - Every file under the suite globs classifies as `ours` through `scripts/sync-upstream/rules.js`.
  - Every `.claude/skills/<name>/SKILL.md` has frontmatter `name` equal to the folder name, and a
    description containing "Use when" and "NOT for".
  - Every skill appears in the CLAUDE.md routing table and in PROTOTYPE.md.
  - Every `designer:*` script target exists.
- **Workspace side (not in the repo):** rewrite
  `workareas/shared/designer-prototyping/settings-proposal.json`:
  - No Sonar hooks.
  - `permissions.allow` for `npm run designer:*`, `npm run dev`, `npm run format`,
    `npm run test:*`, `npm run new:set*`, `npm run playwright:install`, `git status|diff|log|add|commit|switch|revert|stash`,
    and `gh pr create|view`.
  - A `PreToolUse` hook on Edit, Write and NotebookEdit running
    `node scripts/designer/hooks/guard-edit.js`.
  - The overrides change: put `.claude/settings.json` into `ours`.
- Build this last, then run `npm test` and `npm run lint`.

### D2. sync-guard-rails

**Owns:** `.claude/rules/**`, `scripts/designer/ownership/**`, `scripts/designer/hooks/**`,
`docs/designers/where-to-edit.md`

- `ownership/index.js` has `classify(path)`, which reuses `scripts/sync-upstream/rules.js` and
  `overrides.json`. It returns `{ owner: 'yours'|'prototype-patch'|'real-service'|'removed', setId,
  isRelease, frozen, advice }`.
- `cli.js` supports `designer:where -- <paths…>`, `--changed` (everything in `git status`) and
  `--json`. Each result is one plain-English sentence plus the next step.
- `hooks/guard-edit.js` reads the PreToolUse JSON from stdin and decides by path and current branch:
  - Allow `ours` paths, except a release whose `release.json` says `"frozen": true`, which is
    blocked with "DR2 is frozen. Make a new working release from it".
  - Allow anything on `handoff/*` or `maintain/*` branches.
  - Warn but allow `patched` paths.
  - Block everything else with exit 2. The message names the file, says who owns it, and offers
    "make this change in your design release" or "hand it off".
  - Never block reads.
- `.claude/rules/` uses native `paths:` globs:
  - `ownership.md`: upstream-owned globs (`sets/high-risk-plants/**`, `routes-high-risk-plants.js`,
    `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**`, `src/client/**`,
    `webpack.config.js`, `vitest.config.js`). It says stop, and route to a release or to `hand-off`.
  - `gds.md` (`**/*.njk`):
    - Use macros only, and no inline style or custom classes other than `govuk-*` and `moj-*`.
    - No literal strings: all text comes from copy.
    - Keep `name`, `id` and the error key identical.
    - Call `sectionCaption` directly above the h1.
  - `copy.md` (`**/copy/copy.*.js`):
    - Change en and cy together, and keep function arity.
    - Use the `[Welsh needed]` marker in releases.
    - Never edit pinned tests except on `handoff/*`.
  - `designer-sets.md` (`src/server/app/sets/**`, `src/server/app/routes-*.js`):
    - A set may not import another set (the `set-isolation` rule).
    - Keep the `TEMPLATES` root.
    - When adding a required field, update the release's `happy-path.json`.
  - `prototype-seed.md`: examples always replay real routes.
- Tests cover `classify` and the hook on sample stdin, across all four owners, the frozen case and
  both branch cases.

### D3. check-my-change

**Owns:** `.claude/skills/check-my-change/**`, `scripts/designer/check/**`,
`src/server/prototype-checks/**`, `docs/designers/checks.md`

- `designer:check -- [--quick|--standard|--journeys] [--set <id>] [--json]`:
  - **quick** (seconds):
    - `npm run format`
    - ownership report of the changed paths
    - vitest on `src/server/prototype-checks` plus the set's own tests, if it has any
  - **standard** (what the pre-commit hook runs): adds `npm run lint` and `npm test`.
  - **journeys**: adds `npm run test:fit:journeys`.
  - Output: a pass or fail table in plain English, with the full log at
    `.cache/designer/check/<timestamp>.log`.
- `explanations.js` is a catalogue of failure signatures, each with a plain-English explanation, a
  fix and the skill that fixes it. It covers:
  - copy-parity, copy-convention and `contract.test`
  - `no-orphans` and `set-isolation`
  - `obligation-purity`, "collected by no page", "owned by no feature" and "import its obligation
    object from the manifest"
  - "Seeding … failed at <slug>: 400"
  - `EADDRINUSE`, "Executable doesn't exist" and Prettier diffs
  - a missing webpack entry
  - Failures in untouched upstream files are reported honestly as "not caused by your change",
    routed to the maintainer, and never dismissed.
- `prototype-checks/`:
  - `copy-shape.test.js`: en and cy key trees and function arities match for every release. Also
    counts `[Welsh needed]` markers.
  - `release-render.test.js`: for every mounted release, boot the server in process, seed it, and
    GET every `flow.js` page of a seeded draft with `server.inject`. Each must return 200 and not the
    error template.
- The SKILL picks the tier by what changed. It explains each failure and offers the fixing skill.
  It self-repairs at most 3 times.

### D4. see-and-show

**Owns:** `.claude/skills/start-prototype/**`, `.claude/skills/show-my-change/**`,
`scripts/designer/show/**`, `fit/designer-sets.fit.spec.js`,
`docs/designers/seeing-your-change.md`

- **start-prototype**:
  1. Preflight: Node version against `.nvmrc`; `node_modules` present, otherwise
     `npx --yes npm@11.6.2 ci`; port 3103 free, otherwise say "it is probably already running" and
     give the URL.
  2. Run `npm run dev` in the background and wait for the "Server started" line.
  3. Print the URLs for the chooser, each set and each example.
  4. Explain Reset and the data loss on restart.
  5. Run `playwright:install` once if needed.
- **show-my-change**: `designer:show -- --set <id> [--pages auto|all|<slugs>] [--before] [--no-video]`:
  1. **Diff to pages.** Take changed and untracked files, find the feature folder, and map it to
     page ids and slugs through the set's `flow.js` `sections`. The inventory idea is ported from
     tim capture. Shared copy or layout means all pages. Hub, dashboard, check answers and
     confirmation are handled specially.
  2. **Render.**
     - Boot `fit:start` on a free port with `STUB_MODE=true` and `PROTOTYPE_SEED=true`.
     - Drive it with `@playwright/test`'s library API: stub sign-in, then walk the set's fixture to
       each page.
     - Screenshot each page full-page at 1280 and 375 widths, in 3 states: initial, error (submit
       empty) and filled.
     - Run axe with the package the FIT specs already use.
     - Record the walk as video.
  3. **Before.** With `--before`, render again from `git archive HEAD` in
     `.cache/designer/base-<sha>/` (cached by sha).
  4. **Present.** Write `.cache/designer/show/<timestamp>/index.html`: before and after side by
     side per page and state, axe results, the video, the changed files and the page URLs. Then
     `open` it. Also list pages no walk reached ("coverage", as in tim capture).
- `fit/designer-sets.fit.spec.js`: for every release with a `happy-path.json`, walk each scenario
  to confirmation, with axe on every page. It runs in the `journeys` project, so every PR artifact
  carries a walk video per release.
- `references/playwright-trace.md` (inside the skill) is ported from the workspace skill.
- Tests: the diff-to-pages mapping, run against fixture diffs. `git status` must be the same before
  and after a show run.

### D5. change-wording

**Owns:** `.claude/skills/change-wording/**`, `.claude/workflows/wording-sweep.js`,
`scripts/designer/copy/**`, `docs/designers/changing-wording.md`

- `designer:find-text -- "<text>" [--set] [--json]`:
  - Walks the copy modules with a dynamic ESM import. For every matching leaf (string, or function
    source) it reports: set, feature, key path, file:line, and the en and cy values.
  - Also reports pinned occurrences in `copy.test.js`, `controller.test.js`,
    `section-captions.test.js` and `*.fit.spec.js`, and literal strings in `.njk` files (flagged as
    "should be copy").
- The SKILL:
  1. Ownership gate.
  2. Find the text.
  3. Show a plan table (page, key, old → new), confirmed once when the sweep covers more than one
     page.
  4. Edit en; edit cy with the designer's Welsh or the `[Welsh needed]` marker.
  5. Keep function arity.
  6. Give GOV.UK style-guide suggestions (`docs/designers/gov-uk/language.md`), which never
     override the designer's words.
  7. Run `check --quick` and `show`, then give the hand-off line.
- **wording-sweep.js** workflow:
  - args (no defaults; the args-contract block is copied byte-identical):
    `{ set, sweeps:[{find, replace, scope}], welsh:'mark'|'given', welshText }`.
  - Phases: locate (runner: `find-text --json`) → plan (judge: groups edits by file and flags
    function leaves) → edit (builder agents in parallel, one per feature folder, so file sets are
    disjoint) → verify (runner: `check --quick`, repaired by a builder at most 3 times) → show
    (runner).
  - Returns a change table.

### D6. look-and-layout (+ port-kit-page)

**Owns:** `.claude/skills/look-and-layout/**`, `.claude/skills/port-kit-page/**`,
`.claude/workflows/port-kit-page.js`, `docs/designers/gov-uk/**`

- **look-and-layout** turns intent into macros, `govuk-!-*` utilities, the grid,
  `contentColumnClass` and `kit.surfaceClass('display')`.
  - `references/component-catalogue.md` lists every govuk-frontend 6.x macro with this repo's import
    line. It lists MoJ and accessible-autocomplete only if they are installed (verify against
    package.json).
  - `references/nearest-equivalent.md` maps the old prototype's bespoke patterns:
    - custom select → `govukSelect` or accessible-autocomplete
    - tabs → `govukTabs`
    - modal → a confirm page
    - cards → summary-list card
    - filter panel → details plus checkboxes
    - glance counts → summary cards or tags
    - sticky bars → none
  - Things the toolbox cannot do go in the release's `design-gaps.md`.
  - It never writes CSS, a style attribute or a webpack entry.
- **port-kit-page**: the input is an old Prototype Kit `.html` view path, a Heroku URL, a screenshot
  or pasted HTML, plus the target release and where the page sits. The `port-kit-page.js` workflow:
  1. **Inventory** (judge): headings, components, strings, fields, conditional reveals, `.app-*`
     classes and links, recorded as JSON. Classify the page as static, data-collecting or list.
  2. **Build** (builder): template and copy pair (with the Welsh marker). Register the page through
     the matching `journey-change` or `fake-a-service` recipe.
  3. **Check** (runner).
  4. **Show** (runner): also screenshots the original when a URL is given.
  5. **Fidelity review** (judge): compare the two sets of screenshots and list each difference as
     matched, nearest GOV.UK equivalent, or design gap.
- `docs/designers/gov-uk/`: ported workspace GDS best practice (components, patterns, styles,
  accessibility, language), with workspace references removed. Also `templates-in-this-prototype.md`
  (layout, `sectionCaption`, `saveActions`, crumb, error summary).
- A fixture kit page is kept in the skill's `references/examples/`, for acceptance.

### D7. journey-change

**Owns:** `.claude/skills/journey-change/**`, `docs/designers/recipes/**`

- Port Steps 1 to 4 of the workspace `frontend-change` (route, baseline, recipe verbatim, ladder):
  - The set is an input, and must be a release unless on `handoff/*`.
  - Paths are repo-relative.
  - Drop the openspec step.
  - It reads the upstream recipes (add-a-field, add-a-page, add-a-section, add-a-collection,
    obligation model, journey-flow-and-gates) read-only, applied with the release's id.
- New designer recipes in `docs/designers/recipes/`: static-page (the `sample-journey` welcome
  pattern, `collects: []`), move-a-page, add-a-branch (`applyTo` helpers; the engine clears the
  answer), hub-groups-and-rows, check-answers-cards, confirmation-variant, confirm-then-delete,
  success-banner, validation-rules (the `lib/validate` factories).
  - Each has: when to use it, the files in a release, the steps, what you will see, how to verify
    it, and hand-off notes.
- `references/page-id-places.md`: every place a page id is registered.
- Rules: one change per run; update the release's `happy-path.json` and run
  `designer:examples -- check` when a required field changes; self-repair at most 3 times; finish
  with check and show.

### D8. example-data

**Owns:** `.claude/skills/example-data/**`, `src/server/prototype-seed/**`,
`src/server/prototype-data/**`, `src/server/app/services/address-book/index.js`,
`src/server/app/services/countries/index.js`, `src/server/app/services/ports/index.js`,
`docs/designers/example-data.md`

- **Seed per set.**
  - `SEEDERS` covers every mounted set with `journeys/linear/flow/fixtures/happy-path.json`.
  - `seed-set.js` takes `SET_BASE` from the set.
  - Scenarios live in `prototype-seed/scenarios/<set-id>.js`, and `initScenarios(from, to)` is
    called by D10.
- **Actions.** Existing: submit, amend. New: `late`, `delete`, `copy` and `cancelAmend` (through the
  real feature routes), `stopAt` a slug, and `organisation` (seed as a different stub organisation).
- **Prototype fixtures.** `prototype-seed/fixtures/<set>/<name>.json` is layered over the set's
  fixture.
- **Overlays.** `prototype-data/{parties.js,ports-extra.json,countries-extra.json}`, merged by one
  line in each already-patched seam. Note that the origin constraints still apply.
- **`src/server/prototype-seed/cli/`**, run as `designer:examples`:
  - `list <set>`: labels, states and the page each example stops at.
  - `check <set>`: seed in process and report each example as reached, or as "failed at <slug>"
    with the validation messages.
  - `listSeeded(setId)`: exported for the chooser (D10).
- The SKILL turns "an example that is late and at the arrival page" into a scenario or fixture,
  using field names from the release's fixture and controllers. It runs `check`, then show (the
  dashboard and the example's page).

### D9. fake-a-service (common capabilities and dashboards)

**Owns:** `.claude/skills/fake-a-service/**`, `src/server/prototype-services/**`,
`docs/designers/services-and-dashboards/**`

- Module shape: `prototype-services/<name>/{index.js,data.json,README.md}`, following the
  address-book search contract `{ results, total, page, totalPages, pageSize }`.
- Two exemplars, with tests:
  - `records-view`: wraps the upstream stub `list` with status, commodity and late filters, tabs,
    and counts per status. A release points at it through `configureRecords` in its gateway.
  - `transporters`: a search, paginate and select lookup.
- Recipes:
  - fake-a-service
  - dashboard-filters-and-tabs
  - at-a-glance-counts
  - service-home-above-sets (a release made from `sample-journey` with a "What are you importing?"
    question linking to the sets)
  - picker-like-address-book
  - save-as-template
- The builder must prove that `lint:arch` accepts a release importing `prototype-services`.
  Otherwise, inject the module through the gateway.

### D10. design-release

**Owns:** `.claude/skills/design-release/**`, `scripts/new-set/**`, `src/server/prototype-sets/**`,
`src/server/sets-index/**`, `src/server/app/sets-index/**`, `scripts/designer/release-diff/**`,
`docs/designers/design-releases.md`

- **Changes to `new:set`:**
  - Skip tests, specs, `fit/`, `spec/` and `docs/` for any source other than `sample-journey`, and
    write a `docs/README.md` that points at the source set's docs.
  - Write `release.json`: `{ id, from, fromCommit, upstreamCommit|null, createdAt, purpose, frozen,
    uuidMap }`.
  - `--description` writes the `descriptions.js` entry. The test then requires every mounted set to
    have a description.
  - Call `initScenarios`.
  - `--from` accepts any release, which is how you freeze.
  - `--frozen` marks the new release as frozen.
  - `remove-set.js` retires a release with `git rm -r`, unmounts it, and removes its globs,
    description and scenarios.
  - Fix the stale "replace welcome" message.
  - Add a regression test that scaffolds from `high-risk-plants` into a temp directory and boots it.
- **Chooser:** show when a release was made and what from, a Frozen tag, a "Research mode on" tag
  (from D11), and example links (`listSeeded`).
- **release-diff:** `designer:release-diff -- <set> [--against <set>] [--json]` finds the changes
  since the fork by comparing against `git show <fromCommit>:<source path>`, with the id transform
  and `uuidMap` reversed. It outputs per-file diffs and a patch retargeted at any set. D12 and
  "carry a change" use it.
- **SKILL modes:**
  - start a working release
  - freeze
  - carry a change to another release (`git apply --3way`)
  - retire
  - list releases
- Each mode ends with show on the chooser and the release dashboard.

### D11. research-round

**Owns:** `.claude/skills/research-round/**`, `src/server/prototype-research/**`,
`scripts/designer/research/**`, `docs/designers/research-rounds.md`

- `modes.json` (committed) holds a mode per set: `off`, `lenient` (blank answers pass) or `open`
  (all save errors are dropped). `researchModeFor(setId)` is exported for the chooser.
- `designer:research -- <set> on|off|status [--level]` refuses `high-risk-plants`.
  - On first use, it swaps the release's `lib/validate` imports for `prototype-research/validate.js`.
    This is idempotent and reversible.
  - The wrapper delegates to the real validator and, depending on the mode, drops errors and leaves
    blank fields uncommitted.
  - Submission completeness is unchanged, and the docs say so.
- The SKILL sets up a research round:
  1. Freeze or choose a release (D10).
  2. Set the mode.
  3. Seed participant-ready examples (D8).
  4. Walk it (show).
  5. Write a participant sheet: URLs, Defra ID stub users, Reset between participants.
- Test: with the mode on, a walk that leaves every answer blank reaches check answers. With it off,
  errors come back.

### D12. ship-and-hand-off

**Owns:** `.claude/skills/ship-my-change/**`, `.claude/skills/hand-off/**`,
`.claude/workflows/prepare-handoff.js`, `scripts/designer/ship/**`, `handoffs/**`,
`docs/designers/shipping-and-handing-off.md`

- **ship-my-change:**
  1. Move work off `main` onto `design/<set>-<slug>`.
  2. Run `check --standard`, so the pre-commit hook passes first time.
  3. Stage only the changed owned paths (never `-A`).
  4. Write the commit message from the diff in plain English.
  5. Commit.
  6. Push and run `gh pr create` only when the designer asks. The PR body lists the pages changed,
     the check results and the Playwright report artifact.
  - `designer:ship -- undo`: `git revert --no-edit` for a commit; for uncommitted work,
    `git stash push -u -m "undo …" -- <paths>`, which can be recovered. Never `reset --hard`.
- **hand-off** runs the `prepare-handoff.js` workflow with args
  `{ set, slug, scope, paths, includeDesignGaps }`:
  1. `release-diff` (runner).
  2. Triage (judge): sort each change into upstream-ready, needs a real service, design gap, or
     research-only.
  3. Create `handoff/<slug>` from `main`, apply the upstream-ready part to `sets/high-risk-plants`,
     and update the pinned tests, captions and specs (builder).
  4. Run the full ladder: `npm test`, lint and `test:fit:features` (runner, repaired by a builder at
     most 3 times).
  5. Run `designer:show --before` on `high-risk-plants` (runner).
  6. Write `handoffs/<slug>/`: README (what and why, pages, the en and cy table with the Welsh still
     needed, what was left out and why, how to apply), `upstream.patch` (paths are identical in
     plants-frontend) and screenshots (at most 2 MB).
  7. Switch back to the designer's branch.
  - It never pushes anywhere except `origin`, and only on request.

## 4. Build order

1. D2 guard rails
2. D3 check
3. D8 example data (per-set seed)
4. D10 releases (needs D8, D11)
5. D11 research: build its module before D10's chooser tag, or stub `researchModeFor`
6. D4 show
7. D5 wording
8. D7 journey
9. D6 look and port
10. D9 services
11. D12 ship and hand-off
12. D1 integration last, then `npm test`, `npm run lint`, `npm run test:fit:journeys` and one
    end-to-end dry run: make a release, change wording, show, then hand off.

## 5. Upstream drift to raise with plants-frontend (not the prototype's to fix)

- `testing.md` (both copies) says "no tests".
- `add-a-page.md` has stale counts: hub rows, `FLOW_ONLY_KEYS`, `RUN_STEPS`.
- `vitest.config.js` excludes a literal `high-risk-plants` path.
- `fit/set-base.js` is single-set.
- `engine/test-support.js#driveHandler` never enters a set context.
