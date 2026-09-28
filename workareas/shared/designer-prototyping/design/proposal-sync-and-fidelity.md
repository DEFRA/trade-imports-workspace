# Designer suite for the plants prototype: sync safety and fidelity

Written 2026-09-27 for Sam and the build agents. This proposal is for
`trade-imports-plants-prototype` on `feat/NO_JIRA-designer-prototyping` (HEAD `aeb1617`).

**The lens.** Designers work in **design releases**: sets they own, made with `new:set`,
which the weekly sync never touches. Each release keeps the real flow engine, the real
GOV.UK and MoJ components, the real validators and the stub services. Anything a
designer cannot build that way is logged as a gap, so it is never faked with bespoke CSS.
Every change can be turned into a brief and a patch for the plants-frontend team.

**Sources.** The taxonomy in the task (18 change types, weighted to the 49 commits since
27 June), `notes/plants-sets.md`, `plants-data.md`, `plants-pages.md`,
`plants-verify.md` and `reusable-assets.md`. `analysis.md` is not on disk: the Write
tool refused it, so the taxonomy was taken from the task text.

---

## 1. Principles every deliverable follows

1. **Ownership is checked before anything is edited.** Every skill starts by working out
   who owns each path it plans to touch, using `scripts/designer/lib/ownership.js`. That
   module wraps `classifyPath` from `scripts/sync-upstream/rules.js`, so the rule is the
   same one the sync robot applies. The answer is one of three:
   - `ours`: edit freely.
   - declared `patched`: edit with care and update the `why`.
   - upstream: stop. Offer "work in your own design release" or "prepare this for the
     real service".
2. **The real journey (`high-risk-plants`) is for reading, not editing.** It is the
   live reference and it changes every week. A designer edits it only in
   *upstream-bound mode*: on a branch that is never merged into the prototype's `main`,
   which only produces a patch for plants-frontend.
3. **A design release is a snapshot.** `new:set -- <id> --from high-risk-plants` copies
   the journey on the day it is run and records where it came from in `release.json`.
   After that it never receives upstream changes, which is exactly what the old
   prototype's "freeze a release, keep working" gave the designer.
4. **Fidelity comes before convenience.** The suite uses GOV.UK and MoJ macros and
   utility classes, real obligations, real validators, and example data made by
   replaying the real routes. It never adds bespoke Sass, inline styles or new client JS.
   When a design cannot be built that way, the skill builds the closest real option and
   records the gap in the release's `design-gaps.md`, which goes into the handoff.
5. **Every skill ends in something the designer can see.** That means `npm run
   proto:show`, which produces screenshots of the affected pages before and after the
   change, the error state and a walkthrough video. Every skill also ends by saying how
   the change reaches the real service (`npm run proto:handoff`).
6. **Designers have only this repo.** Nothing depends on the workspace, tim or `tools/`.
   Scripts run as `npm run proto:*`, one command per Bash call.
7. **One change, then show it, then stop.** This matches the designer's rhythm of one
   big drop followed by fix-ups, but in small, reversible commits.

## 2. How the old prototype's change types map onto the suite

Commit counts are recent / older.

| Change type (recent / older) | Where it lives in a release | Skill or tool |
|---|---|---|
| Styling and layout (30 / 12) | `sets/<id>/**/template.njk`: macros and utility classes only | `match-the-design` |
| Wording sweeps (28 / 5) | `copy.en.js` and `copy.cy.js` in the release | `change-wording`, and the `wording-sweep` workflow |
| Example data (20 / 4) | `prototype-seed/scenarios/<id>.js`, `prototype-seed/fixtures/`, `prototype-data/<id>/` | `example-data` |
| Common-capability sub-flows (17 / 0) | `prototype-services/<name>/` plus pages in the release | `fake-a-service` |
| Dashboards and lists (16 / 1) | The release's dashboard, plus the `prototype-services/records` adapter | `fake-a-service` (dashboard recipes) |
| Journey flow (10 / 4), new pages (10 / 4), check your answers (10 / 2), hub (6 / 3), confirmation (4 / 0) | The release's features, `flow.js`, `task-rows.js`, obligations | `change-the-journey` |
| Validation on or off (10 / 1) | One commit in the release that relaxes rules; switching back is a revert | `change-the-journey` (research mode) |
| New release or research variant (3 forks, 1 older) | `new:set` from high-risk-plants | `design-release` |
| Cross-release fan-out (8 / 0) | A copy between two owned releases | `design-release` (port a change) |
| Custom client JS (8 / 4) | Not in a release. A catalogue of the components already allowed, then a gap entry | `match-the-design` |
| Navigation and layout chrome (6 / 2) | Upstream-owned (`shared/layout.njk`). Logged as a gap and handed off | `match-the-design` |
| Reverts (5 / 1) | `git revert` inside the release | `check-and-share` (undo) |
| Jump to a mid-journey state (2 / 1) | A scenario with `through: '<slug>'` | `example-data` |
| Demo walkthrough (1 / 0) | The walk video from `proto:show` | `show-my-change` |

Change types that disappear, because the engine works them out: version-prefix leaks,
repeated completeness rules, reset whitelists and alias layers.

## 3. Deliverables

The build order follows the dependencies:

1. `designer-integration` (the shared library comes first)
2. `records-adapter`, the part of `fake-a-service` that `design-release` injects
3. `design-release`
4. `example-data`
5. `show-my-change`
6. `check-and-share`
7. `send-to-real-service`
8. `change-wording`, `match-the-design` and `change-the-journey`
9. the rest of `fake-a-service`
10. `designer-workflows`

### D1. designer-integration (integration)

**Owns:**

- `CLAUDE.md`
- `PROTOTYPE.md`
- `overrides.json`
- `package.json` and `package-lock.json` (the name lines only; no dependency changes)
- `.gitignore`
- `.claude/rules/upstream-owned.md`
- `scripts/designer/lib/**`
- `docs/designers/README.md`

**What it builds:**

- **`overrides.json` `ours`** gains these globs:
  - `CLAUDE.md`, `.claude/skills/**`, `.claude/rules/**`, `.claude/workflows/**`
  - `docs/designers/**`, `scripts/designer/**`
  - `src/server/prototype-data/**`, `src/server/prototype-services/**`
  - `.github/workflows/check-pull-request.yml` is already listed
- **`overrides.json` `patched`** gains entries, each with a `why`:
  - the three stub-seam files from D4 (`services/address-book/stub/index.js`,
    `services/ports/stub.js`, `services/countries/stub.js`): "appends prototype-owned
    rows for the active set from src/server/prototype-data; the upstream rows are
    untouched"
  - `.gitignore`: gains `.designer/`
  - an updated `why` for `package.json`, covering the `proto:*` scripts
- **`package.json` decision.** Add the scripts as one block placed straight after
  `new:set`, which is already the prototype's own line, so every prototype diff sits in
  a single hunk:
  - `proto:check`: `node scripts/designer/check/index.js`
  - `proto:show`: `node scripts/designer/show/index.js`
  - `proto:handoff`: `node scripts/designer/handoff/index.js`
  - `proto:whose`: `node scripts/designer/lib/whose-cli.js`
  - `proto:retire-set`: `node scripts/new-set/retire.js`

  Why: designers and their Claude Code both run `npm run`. Calling `node` directly
  triggers permission prompts and is harder to remember. `package.json` is already
  `patched`, and placing the block next to `new:set` keeps the risk of a conflict to one
  hunk that upstream never edits. Dependencies are not changed: the suite uses only
  packages already installed (`@playwright/test`, `@axe-core/playwright`, `cheerio`,
  `nunjucks`), so `package-lock.json` keeps only its name-line divergence.
- **`scripts/designer/lib/`** is plain ESM with no new dependencies. It is tested with
  vitest, and the tests are picked up by the existing `npm test` include, so nothing else
  is needed.
  - `ownership.js`
    - `ownerOf(path)` returns `'ours' | 'patched' | 'upstream' | 'deleted'`. It
      reads `overrides.json` and uses `classifyPath`, `matchesAnyGlob` and the literal
      `patched` list, so `'patched'` means "declared", not "anything else".
    - `explainOwner(path)` gives one plain-English sentence and the safe alternative.
  - `sets.js`
    - `listSets()` reads `src/server/app/sets/*/set.js`.
    - `setDir(id)`.
    - `releaseInfo(id)` reads `sets/<id>/release.json`, or returns
      `{ kind: 'real-journey' }` for `high-risk-plants` and `{ kind: 'placeholder' }` for
      `sample-journey`.
    - `setOfPath(path)`.
    - `defaultSet()` returns the most recently changed release with purpose `working`,
      or `null`.
  - `flow.js`
    - `pagesOf(setId)` dynamically imports `sets/<id>/journeys/linear/flow/flow.js` and
      returns `[{ sectionId, id, slug, feature }]`.
    - `featureOfPath(path)`.
    - `pagesForChangedPaths(paths)`: shared copy or layout means every page, and
      anything outside a set means none.
  - `whose-cli.js`: `npm run proto:whose -- <path...>` prints a table of paths and
    owners with the safe alternative. Skills and the proposed hook use it.
- **`.claude/rules/upstream-owned.md`** loads natively through its `paths:` frontmatter:
  - `src/server/app/sets/high-risk-plants/**`
  - `src/server/app/routes-high-risk-plants.js`
  - `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**`
  - `src/client/**`
  - `webpack.config.js`, `vitest.config.js`

  The rule says: "This file belongs to plants-frontend. The Monday sync merges over it.
  Edit it only in upstream-bound mode (see `send-to-real-service`). Otherwise do the
  change in a design release."
- **`CLAUDE.md`** (under 150 lines) is always loaded. It contains:
  - who the reader is (a designer)
  - GDS plain English in every reply
  - the ownership rule and `proto:whose`
  - a routing table from designer phrases to the 10 skills and 2 workflows
  - the release model in 5 lines
  - the commands: `npx --yes npm@11.6.2 ci`, never bare `npm ci` or `npm install`
  - one command per Bash call
  - never `--no-verify`, never force-push, never push without asking
  - what not to do: bespoke Sass or client JS, edits to `high-risk-plants` outside
    upstream-bound mode, and data written straight to the store

  It points at `PROTOTYPE.md` and `docs/designers/README.md` rather than repeating them.
- **`PROTOTYPE.md` rewrite**, keeping the existing sections:
  - Add "Working with Claude Code": the skills by what you want to do.
  - Add "Design releases": snapshot, purposes (frozen, working, research), retire.
    Welsh in a release is placeholder-checked, not parity-checked.
  - Correct the sync section. The robot never merges a PR itself: a person merges every
    sync PR. An edit outside `ours` is on borrowed time and becomes `needs-person`.
  - Add "Your data resets when the server restarts", and the design-release persistence
    from D8.
  - Add the ladder a designer can run: `proto:check`, `proto:show`, and what the
    pre-commit hook runs.
  - Replace "Ask if you're not sure" with pointers to the skills.
- **`docs/designers/README.md`** is the index of the per-topic designer guides that the
  other deliverables own.
- **Settings.** Rewrite
  `workareas/shared/designer-prototyping/settings-proposal.json` for Sam; agents may not
  edit `.claude/settings.json`. The proposed prototype-owned `.claude/settings.json`:
  - `hooks`: remove the three dead Sonar hooks, and add a `PreToolUse` `Edit|Write`
    hook that runs `node scripts/designer/lib/guard-hook.js`. The hook blocks writes to
    upstream-owned paths unless the branch starts `upstream/`, and explains why. The
    guard script is also built here, under `lib/`.
  - `permissions.allow`:
    - `Bash(npm run proto:*)`, `Bash(npm run dev)`, `Bash(npm run format)`,
      `Bash(npm run new:set:*)`, `Bash(npm run test:high-risk-plants)`, `Bash(npm test)`,
      `Bash(npm run lint)`, `Bash(npm run test:fit:*)`
    - `Bash(git status)`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git add:*)`,
      `Bash(git commit:*)`, `Bash(git switch:*)`, `Bash(git revert:*)`
  - `overrides.json`: add `.claude/settings.json` to `ours`, applied by Sam at the same
    time.

**Acceptance:**

- `npm test` passes, including new tests for `ownership.js`, `sets.js`, `flow.js` and
  `guard-hook.js`.
- `node scripts/sync-upstream/...`'s `overrides.test.js` passes: every literal patched
  path exists and nothing overlaps `ours`.
- `npm run proto:whose -- src/server/app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.en.js`
  prints "upstream" with the safe alternative.
- `CLAUDE.md` routes each of the 10 skills by at least 2 trigger phrases.
- `PROTOTYPE.md` no longer says the sync PR "merges itself".
- `settings-proposal.json` holds the full proposed file.

### D2. design-release (script)

**Owns:**

- `scripts/new-set/**`
- `src/server/prototype-sets/**`
- `src/server/sets-index/**`
- `src/server/app/sets-index/**`
- `fit/sets-chooser.fit.spec.js`
- `.github/workflows/check-pull-request.yml`
- `.claude/skills/design-release/**`
- `docs/designers/design-releases.md`

**What it builds:** `new:set --from high-risk-plants` becomes first-class. This is the
most important unblock, because freezing a release is the designer's core habit.

- **`new:set` changes:**
  - New flags:
    - `--purpose frozen|working|research`, required when `--from` is not
      `sample-journey`
    - `--describe "<blurb>"`
    - `--from <any set>`, so a release can fork another release
  - When the template is not `sample-journey`, skip these paths and list them in the
    output:
    - `**/*.test.js`, `**/*.fit.spec.js`, `**/fit/**`
    - `journeys/linear/test-support.js`, plus any file only tests import (confirm with
      `npm run lint`, which must report no `no-orphans` errors)
    - `spec/**`, `docs/**`
  - Keep `flow/fixtures/happy-path.json`, which the seed and show tools use.
  - Write `sets/<id>/release.json`:
    ```
    { id, forkedFrom, forkedAt, upstreamCommit, purpose, description, uuidMap }
    ```
    - `upstreamCommit` is `git rev-parse HEAD` together with `git merge-base HEAD upstream/main`.
    - `uuidMap` maps each new UUID to the old one. `transformContent` is changed to
      report its UUID substitutions, and D7 needs the map to reverse the copy.
  - Add the description to `descriptions.js`.
  - Inject the `prototype-services/records` adapter (D8) into the new
    `routes-<id>.js`: `configureRecords(SET_ID, designerRecords(SET_ID, records))`.
    This gives the release data that survives restarts and gives dashboards a place for
    filters.
  - Print correct next steps. The stale "replace `features/welcome/`" message is dropped
    for non-sample templates.
- **`scripts/new-set/retire.js`** (`npm run proto:retire-set -- <id>`):
  - Refuses `high-risk-plants` and `sample-journey`.
  - Removes the set with `git rm -r` on the folder and `routes-<id>.js`, then removes the
    mount lines, the two `ours` globs, the description and
    `prototype-seed/scenarios/<id>.js` if it exists.
  - Prints the list of what it removed.
- **`scripts/new-set/port.js`**: `node scripts/new-set/port.js --from <set> --to <set> --feature <name>`,
  wrapped by the skill.
  - Copies one feature folder, or the copy bundles alone with `--copy-only`, from one
    owned release to another. It applies the id transform and reuses the UUID map, so
    obligations stay consistent.
  - Refuses when the target is `high-risk-plants`.
  - This replaces the old habit of making the same edit by hand in 2 to 4 releases.
- **Chooser:**
  - The set row shows a GOV.UK tag:
    - "Real journey, updates weekly" for high-risk-plants
    - "Frozen, <date>", "Working release, forked <date>" or "Research, <date>" from
      `release.json`
    - "Placeholder" for sample-journey
  - It also shows the description and a "Forked from … on …" summary line.
  - Order: real journey first, then working releases, research and frozen, newest first
    within each group.
- **`descriptions.test.js`** fails when a mounted set has no description.
- **`fit/sets-chooser.fit.spec.js`** asserts the tag text for every set.
- **`check-pull-request.yml`** gains a "release canary" step after the unit tests:
  - `npm run new:set -- ci-release-canary --from high-risk-plants --purpose working --describe canary`
  - `npm test`
  - `npx playwright test fit/sets-chooser.fit.spec.js`
  - `git checkout -- . && git clean -fd`, in the CI job only

  This proves that every PR keeps forking viable.
- **Skill `design-release`.** Triggers: "start a new design release", "freeze this
  release", "fork the journey", "make a research version", "new version of the
  prototype", "retire release", "copy this change to <release>". NOT for editing pages
  (use `change-*`) or example data (`example-data`).
  - Steps:
    1. Ask for the purpose and a plain name. Derive a kebab-case id with a `plants-`
       prefix, for example `plants-dr3-working`.
    2. Run `npm run new:set`, then `npm run format`.
    3. Run `npm run proto:check -- --set <id> --level full`.
    4. Run `npm run proto:show -- --set <id> --pages all --baseline` to record the
       starting point.
    5. Commit "Start design release <id> from high-risk-plants".
  - Freezing the working release means forking it to a new working release and marking
    the old one `frozen` in `release.json`. The frozen one is never edited again, and
    the skill refuses to edit a frozen release.
  - Retire and port flows as above.
  - Guard rail: never fork into, or edit, high-risk-plants.
  - Verification: the chooser screenshot plus the full-journey baseline gallery.
  - Handoff line: "A release is a sketchbook. To make part of it real, say 'send this to
    the real service'."

**Acceptance:**

- These new tests pass:
  - `cli.test.js` covers the flags.
  - `copy-set.test.js` covers the skip list and the UUID map.
  - `retire.test.js` and `port.test.js` run against a temp tree.
- A manual scaffold of `--from high-risk-plants` passes `npm run lint` (no orphans),
  `npm test` (no "2 sets are mounted" failures) and `npm run test:fit:journeys`.
  After the scaffold, `release.json` exists with a UUID map covering every obligation.
- The chooser shows tags.
- Retiring the scaffold leaves `git status` clean apart from the deletions and no stray
  globs in `overrides.json`.

### D3. example-data (script)

**Owns:**

- `src/server/prototype-seed/**`
- `src/server/prototype-data/**`
- `src/server/app/services/address-book/stub/index.js` (patched)
- `src/server/app/services/ports/stub.js` (patched)
- `src/server/app/services/countries/stub.js` (patched)
- `.claude/skills/example-data/**`
- `docs/designers/example-data.md`

**What it builds.** Covers fixture data (20 recent commits) and jumping to a
mid-journey state (2).

- **Seeding works for any set.**
  - `seederFor(setId)` looks in this order:
    1. `prototype-seed/scenarios/<setId>.js`
    2. the default four scenarios, when the set has
       `journeys/linear/flow/fixtures/happy-path.json`
    3. none
  - `seed-set.js` is `seed-high-risk-plants.js` with `SET_BASE` taken from the set's
    `set.js`.
  - `scenarios.js` becomes `scenarios/high-risk-plants.js`.
- **A richer scenario grammar**, validated at load time with plain-English errors:
  ```
  { label, fixture: '<name>' | { file: 'fixtures/<f>.json', name },
    through?: '<slug>', answers?: { '<slug>': { field: value } },
    submit?, amend?, cancelAmend?, delete?, copy?, organisationId? }
  ```
  - `answers` changes individual fields from the fixture, so a designer can vary the
    consignor or the port without writing a new fixture.
  - `submit`, `amend`, `cancelAmend`, `delete` and `copy` post the real feature routes.
    Before building, read `delete-notification`, `cancel-amend`, and the copy route's
    controller to find the slugs.
  - `through` stops at a page, which gives a deep link for research.
  - Examples that must be possible: submitted late (from `warePotatoesLate`), deleted,
    copied, amendment cancelled, and "another organisation".
- **Plain-English failures.** When a replayed step does not redirect, the seeder reads
  the GOV.UK error summary from the response and throws "Example '<label>' stopped at
  <slug>: the page said '<message>'". The seed never writes to the store directly.
- **Organisations.**
  - `adopt-known-journeys.js` only adopts examples whose `organisationId` (default: the
    shared example organisation) matches the session's organisation, or examples with no
    organisation. This fixes the unscoped listing for multi-organisation examples.
  - The docs give the sign-in link `/auth/stub-sign-in?organisationId=<org>`.
- **`prototype-seed/fixtures/`** holds prototype-owned consignment shapes. It starts
  with one extra fixture copied from `happy-path.json`, to show the shape.
- **Reference-data overlay (prototype-data).**
  - Files: `src/server/prototype-data/{_all,<set-id>}/{parties,ports,countries}.json`,
    and `index.js` exporting `extraParties()`, `extraPorts()` and `extraCountries()`.
    These read the active set from `shared/set-context.js`; check the exported name
    before building.
  - The three stub seams each gain one line appending the overlay rows. Upstream rows
    stay first and untouched. Each seam is listed as patched by D1.
  - Rows are checked against the stub grammar (the party row format, and a port `code`
    shaped like `GB XXX`).
  - Fidelity note in the docs: an extra country is offered but still refused for
    constrained commodities (`ORIGIN_CONSTRAINTS`, upstream). "This is how the real
    service behaves."
- **Skill `example-data`.** Triggers: "add an example notification", "show a late
  notification", "I need a draft stopped at the origin page", "add a trader/consignor",
  "add a port", "example data for research", "reset the data". NOT for changing what a
  page asks (use `change-the-journey`).
  - Steps:
    1. Resolve the set and check ownership. For high-risk-plants, edits go only in
       `prototype-seed/scenarios/high-risk-plants.js` and the overlay, which are ours.
    2. Edit the scenarios or overlay.
    3. Run `npm run proto:check -- --set <id>`, which includes a seed dry-run: the check
       boots the server and runs every scenario.
    4. Run `proto:show` for the dashboard and the page at `through`.
    5. Tell the designer how to reset from the chooser.
  - Handoff: if the example should exist in the real service's test data, D7 turns the
    scenario into an `happy-path.json` proposal.

**Acceptance:**

- Unit tests cover the scenario validation, `seederFor` resolution, the late, delete,
  copy and cancel-amend scenarios (run through `server.inject` against the real routes),
  the organisation-scoped adoption, and the overlay append order.
- A forked release is seeded on first visit and after reset.
- `fit/sets-chooser.fit.spec.js` still passes.
- `overrides.test.js` passes with the three new patched entries.

### D4. change-wording (skill)

**Owns:**

- `.claude/skills/change-wording/**`
- `.claude/rules/copy.md`
- `docs/designers/wording.md`

**What it builds.** Covers wording sweeps (28 recent commits), the most frequent kind of
change after styling.

- **Triggers:** "change the wording", "reword", "change the hint/label/error message",
  "rename X to Y everywhere", "content changes", "update the content on the <page>
  page". NOT for layout (`match-the-design`) or for adding a new question
  (`change-the-journey`).
- **Steps:**
  1. **Resolve the set.** The default is `defaultSet()`. If the target is
     high-risk-plants, offer (a) "do it in your working release" (recommended) or (b)
     upstream-bound mode.
  2. **Find every home of the string** with `grep -rn` across the set:
     - `features/*/copy/copy.en.js`
     - `flow/section-captions/copy`
     - the hub copy
     - the check-your-answers labels, which import other features' copy
     - the `shared/copy.en.js` chrome, which is upstream. For chrome, stop and log a
       gap, because chrome is shared by every set.

     List where each match appears before editing.
  3. **Edit English and Welsh together.**
     - Keep the key tree identical and keep function arity.
     - Welsh supplied by the designer is used as given.
     - Otherwise, in a release, write `'[Welsh needed] ' + <English>`. The check lists
       these, and the handoff counts them.
     - In upstream-bound mode, the change cannot be finished without Welsh. Mark it
       "needs translation" in the handoff and use the placeholder on the branch only.
  4. **Upstream-bound mode only:**
     - Update the pinned literals in `copy.test.js`, `controller.test.js` and the
       section-captions test (`grep` for the old string).
     - Run `npm run test:high-risk-plants`, then `npm test`, which includes
       `copy-parity`.
  5. **Check and show.** Run `npm run format`, `npm run proto:check -- --set <id>`,
     then `npm run proto:show -- --set <id> --pages changed`.
  6. **Report** in GDS plain English: the pages changed, before and after, and the
     Welsh still needed.
- **Handoff:** "Say 'send this wording to the real service' to create a brief with the
  test updates the team will need."
- **`.claude/rules/copy.md`** (paths `**/copy/copy.en.js`, `**/copy/copy.cy.js`) is
  ported from the workspace rule:
  - change English and Welsh together
  - keep the key and arity parity
  - no empty strings
  - the GOV.UK style guide essentials: sentence case, plain English, active voice, no
    "please", dates as "27 September 2026", number formats
- **`docs/designers/wording.md`** covers where wording lives and why Welsh matters.

**Acceptance:**

- A dry run on a scaffolded release changes one hint in English and Welsh with no test
  changes, and `proto:check` passes.
- An upstream-bound dry run on high-risk-plants updates `copy.test.js` pins and
  `npm test` passes.
- A shared-chrome request is refused with a gap entry and an explanation.

### D5. match-the-design (skill)

**Owns:**

- `.claude/skills/match-the-design/**`
- `.claude/rules/templates.md`
- `docs/designers/gov-uk-toolbox.md`

**What it builds.** Covers styling and layout (30 recent commits), the most frequent
change, plus custom widgets (8) and navigation chrome (6).

- **Triggers:** "make it look like the design", "match the Figma", "change the layout",
  "move this above", "make it a table/summary list/cards/tabs", "spacing", "make it
  bold", "add an inset/warning", "custom component". NOT for wording
  (`change-wording`).
- **Input:** a description, or a screenshot path, which the skill reads with the Read
  tool.
- **Steps:**
  1. Resolve the set and check ownership.
  2. **Identify each element** in the design and map it using `gov-uk-toolbox.md`:
     - GOV.UK Frontend 6 macros and their options (`classes`, `attributes`,
       `headingLevel`, `isPageHeading`, `fieldset.legend.classes`, `inputmode`,
       widths)
     - MoJ Frontend 10 components (check each is registered in
       `src/client/javascripts`)
     - accessible-autocomplete
     - the grid (`govuk-grid-row` and column classes)
     - spacing, typography and width override classes (`govuk-!-margin-*`,
       `govuk-!-font-weight-bold`, `govuk-!-width-*`)
  3. **Edit only the template**, plus copy for any new text. That means no Sass, no
     inline `style`, no new `<script>` and no webpack entries.
  4. **Log anything that cannot be matched** in `sets/<id>/design-gaps.md`: the page,
     what the design wants, the closest option built, and why (with a screenshot link).
     Navigation and header changes always go here, because `layout.njk` is upstream and
     shared.
  5. Run `proto:check`, then `proto:show --pages changed`. The show also runs axe, and
     any new violations are reported in plain English.
- **Handoff:** the gaps file travels with D7's brief as "design asks for the real
  service".
- **`.claude/rules/templates.md`** (paths `src/server/app/sets/**/*.njk`):
  - macros before raw HTML
  - no hard-coded visible strings; copy comes from the bundles
  - keep the `crumb` and `concurrencyToken` inputs, `sectionCaption`, one `h1`, and the
    error summary include
  - in high-risk-plants, do not change roles or labels that the FIT locators use unless
    in upstream-bound mode
- **`docs/designers/gov-uk-toolbox.md`** is a catalogue of what is wired in this repo,
  generated by reading `src/client` and the installed packages, not from memory. It
  includes a "common Figma asks and the GOV.UK answer" table: cards become summary cards,
  a custom select becomes `govukSelect` or autocomplete, tabs become `govukTabs`, a modal
  becomes a separate confirm page, a filter panel becomes the MoJ filter.

**Acceptance:**

- Dry run: "put the reference number in a summary card on the confirmation page" is
  built with macros only.
- A request for a bespoke colour is logged as a gap, and the closest option is built.
- `npm run lint:scss` is unchanged.
- The rule file loads when a `.njk` file is edited.

### D6. change-the-journey (skill)

**Owns:**

- `.claude/skills/change-the-journey/**`
- `docs/designers/journey-changes.md`

**What it builds.** A port of steps 1 to 4 of the workspace `frontend-change` skill,
with the set as an input. It covers journey flow (10), new pages (10), check your
answers (10), validation (10), hub (6) and confirmation pages (4).

- **Triggers:** "add a question/field", "add a page", "add a section", "add a list of
  things", "move a page", "only show this page if…", "change the task list", "reorder
  check your answers", "change the confirmation page", "add a guidance/interstitial
  page", "turn validation off for research", "switch validation back on". NOT for
  wording only, layout only, or data.
- **Routing table** in `SKILL.md` maps each request to either:
  - an upstream recipe, read from `src/server/app/sets/high-risk-plants/docs/*.md` with
    the set id substituted (releases do not carry `docs/`): `add-a-field`, `add-a-page`,
    `add-a-section`, `add-a-collection`, `journey-flow-and-gates`
  - a skill-owned reference in `references/`:
    - `static-page.md`: a `collects: []` page, modelled on the sample-journey welcome
    - `move-a-page.md`: `flow.js`, `run.js` `RUN_STEPS`, task rows, and the up to 5
      places a page id is registered
    - `add-a-branch.md`: an `applyTo` gate; the engine skips the page and clears the
      answer
    - `regroup-task-list.md`: hub `GROUPS`, task rows, captions
    - `check-your-answers.md`: `answerRow`, `scopedRows` order and labels
    - `confirmation-variant.md`
    - `research-mode.md`
- **Release mode:**
  - Follow the recipe verbatim but skip steps that create `*.test.js` or
    `*.fit.spec.js`.
  - Boot guards still apply: `obligation-purity`, "collected by no page", "owned by no
    feature". The skill translates each one using D9's translator.
- **Upstream-bound mode:** the full recipe, including tests and the ladder from
  `sets/high-risk-plants/docs/testing.md`.
- **Research mode** is one commit titled "Research mode on for <id>". It relaxes the
  save rules in the chosen controllers' `fields()` and submit requirements in the
  release, and lists every rule it relaxed in `sets/<id>/research-mode.md`.
  Switching back is `git revert` of that commit, found by title. The skill refuses
  research mode on high-risk-plants.
- **One change per run,** with a self-repair budget of 3. After that, stop and explain.
- **Verification:**
  - `proto:check --level full`, which boots the server
  - `proto:show --pages changed` in both the first-view and error states
  - for flow changes, `proto:show --pages all`, so the walk proves the new order and
    the branch skip
- **Handoff:** D7, with the recipe name recorded in the commit message, so the team
  knows which recipe was used.

**Acceptance:**

- Dry runs on a scaffolded release all boot with `proto:check --level full` green and
  the walk showing the new order:
  - add a yes/no question on the origin page
  - move arrival before origin
  - hide a page behind a branch
  - add a static guidance page
  - research mode on, then off
- Refuses high-risk-plants without upstream-bound mode.

### D7. send-to-real-service (script)

**Owns:**

- `scripts/designer/handoff/**`
- `.claude/skills/send-to-real-service/**`
- `docs/designers/sending-to-plants-frontend.md`

**What it builds:** the fidelity lens's exit path.

- **`npm run proto:handoff -- --set <release> [--features a,b|--all]`** writes to
  `.designer/handoff/<release>/<date>/`:
  1. **`changes.patch`.** Takes the release's files, reverse-transforms them (id to
     `forkedFrom`, the camel and sentence forms, and the UUIDs through the reversed
     `uuidMap`), then diffs them against current `sets/high-risk-plants`. The patch is
     written in `git apply` format against plants-frontend paths, which are identical
     in both repos.
  2. **A drift report.** Lists the high-risk-plants files that changed upstream since
     `upstreamCommit`, using `git log <upstreamCommit>..HEAD -- <path>`. These are
     marked "the real journey has moved on here, so the team will need to merge".
  3. **A test-impact list.** Every old string still pinned in `high-risk-plants`
     `*.test.js` and `*.fit.spec.js`, found by grep, which the team will need to
     update.
  4. **The things that cannot ship as they are:**
     - imports from `prototype-services` or `prototype-data`, marked "needs a real
       service"
     - `[Welsh needed]` placeholders
     - the entries in `design-gaps.md`
     - relaxed rules from `research-mode.md`
  5. **`brief.md`** in GDS plain English, one section per page, using the `proto:show`
     before and after screenshots and the walk video, ready to paste into a Jira story.
- **Upstream-bound mode** is the other path. The skill:
  1. Creates a branch `upstream/<slug>` from `main`.
  2. Lets the change skills edit high-risk-plants with the full recipe and tests.
  3. Runs the full ladder.
  4. Writes the patch with `git diff main -- <upstream paths>` and the same brief.
  5. Tells the designer never to merge this branch into the prototype. Once the team
     merges it upstream, Monday's sync brings it in.
- **Skill.** Triggers: "send this to the real service", "hand this to the developers",
  "make this real", "raise this with plants-frontend", "prepare for upstream". NOT for
  publishing the prototype (`check-and-share`).
  - Steps: choose the path (from a release, or upstream-bound), run the script, read
    the brief back to the designer, and explain the two ways it can land: (a) give the
    brief and patch to the plants-frontend team, or (b) a developer applies the patch
    in a plants-frontend clone and raises the PR.
  - The skill never pushes to plants-frontend. The upstream push URL is `DISABLED` on
    purpose.

**Acceptance:**

- Unit tests cover the reverse transform with a UUID map, test-impact detection and
  prototype-services detection.
- End-to-end: scaffold a release, change one hint and one template, run
  `proto:handoff`, and check that `git apply --check` of the patch succeeds against
  current high-risk-plants in a scratch copy.
- The brief lists the Welsh placeholder and the pinned test.

### D8. fake-a-service (script)

**Owns:**

- `src/server/prototype-services/**`
- `.claude/skills/fake-a-service/**`
- `docs/designers/faking-services.md`

**What it builds.** Covers common-capability sub-flows (17) and dashboards and lists
(16).

- **`prototype-services/records/`:** `designerRecords(setId, records, opts)` wraps the
  upstream stub records store. D2 injects it into every new release.
  - **Persistence (development only).** Write-through to
    `.designer/data/<setId>.json`, restored on boot. Stub sessions are kept in cookies,
    so the dashboard survives a nodemon restart. This removes "my data vanished when I
    saved a template" for releases.
  - **`list` extensions:** optional `status`, `commodity`, `dateFrom`, `dateTo`, `tab`
    filters, and a `counts()` method for the numbers shown at a glance. Upstream
    `list()` keeps its contract.
  - **Placement:** build in `src/server/prototype-services/`. If `lint:arch` or the
    set-isolation rules refuse imports from `routes-<id>.js`, move to
    `src/server/app/prototype-services/` (also ours) and record the decision in the
    docs.
- **The service pattern:**
  - `prototype-services/<name>/{index.js, data.json, index.test.js}`, with the shape
    `search(orgId, { query, page })` returning
    `{ results, total, page, totalPages, pageSize }`, copied from the address-book
    picker.
  - Worked examples:
    - `transporters` (removed upstream on purpose, so it is faked here)
    - `templates` (save a notification as a template, and start from one)
- **Skill `fake-a-service`.** Triggers: "add a transporter lookup", "add templates",
  "add a filter/tabs to the dashboard", "show counts", "a success banner after…",
  "confirm before deleting", "return to where I came from", "an overall home page
  across commodities". NOT for data the stubs already serve (`example-data`).
- **References:**
  - `dashboard-filters.md`: read query parameters in the release's dashboard
    controller, pass them to `designerRecords`, and use MoJ filter or
    `govukTabs` markup
  - `success-banner.md`: the flash pattern the dashboard's "deleted" banner already
    uses
  - `confirm-then-act.md`: modelled on `delete-notification`
  - `return-to.md`: how the engine's return targets work, in place of `?from=`
  - `overall-home.md`: a release page above the journey, plus the chooser link
  - `fake-service.md`: the pattern above
- **Guard rail:** every fake is named in the handoff as "needs a real service", and D7
  detects it automatically.
- **Verification:** `proto:check --level full`, then `proto:show` on the pages that use
  the fake, in the empty, filtered and error states.

**Acceptance:**

- Unit tests cover persistence round-trips, the filters and counts, and the
  transporters and templates services.
- In a scaffolded release, a dashboard status filter works end to end in `proto:show`.
- Data survives a server restart in `npm run dev`.
- High-risk-plants behaviour is unchanged: `npm run test:fit:journeys` is green.

### D9. check-and-share (script)

**Owns:**

- `scripts/designer/check/**`
- `.claude/skills/check-and-share/**`
- `.claude/skills/run-the-prototype/**`
- `docs/designers/checking-and-sharing.md`

**What it builds.** Covers reverts (5), the git help the designer needs every session,
and running the prototype.

- **`npm run proto:check -- --set <id> [--level quick|full|walk]`:**
  - **`quick`**, in seconds:
    - `format:check` on changed files
    - an ownership report on `git diff --name-only` and untracked files (upstream edits
      flagged)
    - set-scoped copy parity: the key tree, function arity, empty leaves, and the
      `[Welsh needed]` list
    - a template check: every `.njk` in the set compiles with nunjucks, and its copy
      keys exist
    - for high-risk-plants, `vitest run` on the set
  - **`full`:** `quick`, plus boot the server once with `fit:start` on port 3203, sign
    in, and GET every page in `flow.js` for a seeded example (every page must return
    200 or 302), plus a seed dry-run, plus `npm run lint` and `npm test`. This is what
    the pre-commit hook runs, so the commit will not fail.
  - **`walk`:** `full`, plus `test:fit:journeys` and the chooser spec.
  - **Failure translator** (`translate.js`, table-driven and unit-tested). It maps each
    of these to a plain-English cause and fix:
    - Prettier diffs
    - `copy-parity` and `copy-convention` failures
    - `obligation-purity`
    - "collected by no page" and "owned by no feature"
    - "must import its obligation object"
    - `no-orphans`
    - `EADDRINUSE`
    - Playwright "Executable doesn't exist" (run `npm run playwright:install`)
    - "No set context … 2 sets are mounted"
    - a webpack 404

    The script prints a JSON summary with `--json`, so skills can parse it.
- **Skill `check-and-share`.** Triggers: "check my changes", "is it ready", "share
  this", "save my work", "commit", "make a pull request", "publish", "undo my last
  change", "throw away what I just did". NOT for making changes.
  - **Branching.** If on `main`, create `design/<set>/<slug>`.
  - **Before committing:** `npm run format`, then `proto:check --level full`.
  - **Commit** with a message generated from the diff in plain English, for example
    "plants-dr3-working: reword the origin hint; add a late example". There is never an
    empty or one-word message.
  - **Ask before pushing.** Then `gh pr create` with a body listing:
    - the set and its purpose
    - the pages changed
    - the `proto:show` gallery summary
    - the ownership report
    - Welsh still needed
    - the design gaps
    - a "Send to the real service?" line
    - a note that the FIT artifact `frontend-playwright-report` holds the walk video
      once checks finish
  - **After merge,** `main` deploys to the shared prototype.
  - **Undo:**
    - Uncommitted: show the diff and `git restore` the named files after confirmation.
    - Committed: `git revert <sha>` of the last commit touching the set. Never reset or
      force-push.
- **Skill `run-the-prototype`.** Triggers: "run the prototype", "start it", "open the
  prototype", "it won't start", "port in use".
  - Checks `node_modules` exists; if not, runs `npx --yes npm@11.6.2 ci`.
  - Starts `npm run dev` in the background and waits for the start line.
  - Prints `http://localhost:3103/` and the set URL.
  - Explains the dev sign-in, "Reset this prototype's data", the data loss on restart
    for high-risk-plants (releases persist, see D8), and how to sign in as another
    organisation.
  - On `EADDRINUSE`, finds the owning process with `lsof -i :3103` and asks before
    stopping it.

**Acceptance:**

- `translate.test.js` covers every signature above.
- `proto:check --level quick` runs in under 30 seconds on a clean release.
- `--level full` on a release with a deliberately missing Welsh key fails with the
  plain-English fix.
- A dry-run commit passes the husky hook first time after `--level full`.
- Undo reverts only the named commit.

### D10. show-my-change (script)

**Owns:**

- `scripts/designer/show/**`
- `.claude/skills/show-my-change/**`
- `docs/designers/seeing-your-change.md`

**What it builds.** "See it and show it": the designer fixes something after every
session, and reviewers need a walkthrough. This is a port of the logic in
`tim/src/capture`, with no tim and no zod.

- **`npm run proto:show -- --set <id> [--pages changed|all|<slug,…>] [--baseline] [--compare <set>]`:**
  - It uses its own config, `scripts/designer/show/playwright.show.config.js`. This
    config is ours, so the patched `playwright.config.js` is not touched. It sets:
    - webServer `npm run fit:start` on port 3203
    - `STUB_MODE=true`, `PROTOTYPE_SEED=true`, `DEMO_SLOWMO=600`
    - video and trace on
  - **`walk.spec.js`:**
    1. Signs in with the same query as `fit/sign-in.js`.
    2. For the set's `happy-path.json` scenarios, uses Playwright `request` (sharing
       cookies with the page) to post each fixture step, with the crumb, as the seed
       does.
    3. At each page in the list, screenshots the first view at full page size.
    4. Submits the empty form and screenshots the error state when the response
       re-renders with an error summary.
    5. Runs `@axe-core/playwright` (WCAG 2.2 AA tags, as in the journey smoke spec).
    6. Also captures the dashboard with seeded data, check your answers and the
       confirmation page.
  - **Pages to capture:** `changed` uses `pagesForChangedPaths` (D1) on
    `git diff HEAD` plus untracked files.
  - **Output:** `.designer/show/<set>/<timestamp>/`, holding PNGs, `walk.webm`,
    `axe.json` and `index.html`. The index is a static gallery styled with GOV.UK
    classes, showing before and after pairs when a baseline exists, the axe findings in
    plain English, and a coverage note for any changed page the walk did not reach
    ("add it to the example's route").
  - `--baseline` writes to `baseline/`, which the change skills call before their first
    edit.
  - `--compare` pairs the same slugs across two sets. This covers the old parity use:
    this release against the real journey.
  - The latest run is also linked as `.designer/show/<set>/latest`.
- **Skill `show-my-change`.** Triggers: "show me", "screenshot", "what does it look
  like", "before and after", "record a walkthrough", "compare with the real journey",
  "make a review pack".
  - Runs the script.
  - Reads the key PNGs with the Read tool and describes the differences in plain
    English.
  - Gives the path of `index.html` to open in the browser.
  - Never claims a visual result it has not looked at.

**Acceptance:**

- Unit tests cover mapping changed paths to pages and building the gallery.
- On a scaffolded release, `--pages all` produces a screenshot for every `flow.js`
  page reached, plus error states and a video.
- A one-hint change with `--baseline` beforehand produces a before and after pair.
- `--compare high-risk-plants` pairs pages.
- The run does not disturb a running `npm run dev` on 3103.

### D11. designer-workflows (workflow)

**Owns:** `.claude/workflows/**`.

**What it builds:**

- **`README.md`** covers how a designer launches a workflow ("run the design session
  workflow"), always by `scriptPath`, and the args contract.
- **`wording-sweep.js`.** Args: `{ set, instruction, welsh: 'placeholder'|'provided',
  welshText: object|null }`.
  1. **Phase 1:** one agent finds the matching features with `grep` and returns a JSON
     list.
  2. **Phase 2:** at most 6 parallel agents, one per feature folder. Each edits only
     that folder's `copy.en.js` and `copy.cy.js`, following `change-wording`'s rules.
     This is mechanical work, so pick a cheap model.
  3. **Phase 3:** one verifier runs `npm run format`, `proto:check --level full` and
     `proto:show --pages changed`, then writes a summary.

  The workflow refuses high-risk-plants.
- **`design-session.js`.** Args: `{ set, requests: string[] }`, taken from a designer's
  session notes. It reproduces the weekly omnibus session, but safely.
  1. **Phase 1:** one agent classifies each request to a skill and its target pages.
  2. **Phase 2:** serial, one request at a time. An agent follows the named skill's
     `SKILL.md` on the set, then `proto:check` runs. A failure gets one repair attempt,
     then the request is parked.
  3. **Phase 3:** `proto:show --pages all` against the session baseline, and a plain
     summary of what landed and what was parked.

  The workflow commits each landed request separately, using `check-and-share`'s
  message rules, and never pushes.
- Every script carries the args-contract block (`parseArgs` / `requireKeys` /
  `logResolvedConfig`), copied byte-identical from the workspace, with no defaults. A
  small `contract.test.js` next to the scripts checks this under vitest, so it runs with
  `npm test`.

**Acceptance:**

- `contract.test.js` passes.
- A run with a missing key stops before any agent.
- A 3-request dry session on a scaffolded release produces 3 commits or parked entries,
  and a gallery.

## 4. What is deliberately left out

- **Bespoke Sass and client JS in releases.** Fidelity matters more here, and requests
  that need them are logged as gaps. This can be revisited if the gaps log shows the
  same ask many times.
- **Editing high-risk-plants in place** outside upstream-bound mode. It creates
  `needs-person` sync weeks and confusion about where the truth lives.
- **Pulling upstream changes into a release.** A release is a snapshot. To pick up
  upstream changes, fork a fresh release and use `port.js` for the design changes.
- **A preview per branch.** `publish-branch.yml` is deleted, and CDP config is Sam's.
  The gallery and the PR's FIT artifact stand in for a preview.
- **Workspace tooling** (tim, openspec, journey-builder).

## 5. Risks to check during the build

- **`lint:arch`.** The dependency-cruiser rules may refuse
  `routes-<id>.js → prototype-services`. The fallback location is in D8.
- **`no-orphans`** once tests are skipped from a release. D2's acceptance runs lint.
- **The exported name of the active-set accessor** in `shared/set-context.js`, used by
  D3's overlay.
- **Whether `transformContent` can report its UUID map** without breaking
  `transform.test.js`. The fallback is a second pass that pairs UUIDs by file and
  position.
- **The size of the husky pre-commit run** on a designer laptop. D9 runs `--level full`
  first so the hook is not a surprise.
- **Sam applies the settings proposal.** Until then, Claude Code in the repo hits the
  dead-hook errors. `CLAUDE.md` says so at the top.
