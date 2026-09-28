# Proposal: the designer suite for the plants prototype (designer's-day lens)

Written 2026-09-27 against `repos/trade-imports-plants-prototype` on
`feat/NO_JIRA-designer-prototyping`. Source evidence: the analysis taxonomy (recent =
since 2026-06-27), `notes/plants-sets.md`, `notes/plants-verify.md`,
`notes/reusable-assets.md`, `PROTOTYPE.md` and `overrides.json`. `analysis.md` itself
was never written to disk (the Write tool refused it), so this proposal works from the
taxonomy relayed in the task.

## 1. The designer's day this suite is built around

The old prototype's designer works in weekly sessions. Each session is one big drop,
followed by 1 or 2 fix-ups within minutes, published by pushing to `main`. The unit of
work is "make this page look and read like the Figma file, with realistic data in it,
and let people see it". The suite is built to make that loop as short as possible on a
codebase that is closer to the real service:

```
"I want X on this page"
   │  CLAUDE.md sends the request to the right skill (plain-English trigger phrases)
   ▼
Is it safe to edit here?      npm run where -- <path>   → your release / real team / never
   │  If not, the designer is offered their own design release (start-a-release)
   ▼
Make the change               change-the-words · match-the-design · change-the-journey ·
   │                          example-data · shared-features · research-session
   ▼
See it                        see-it: running prototype, a direct link to an example
   │                          stopped at that page, and a note that saving loses data
   ▼
Show it                       npm run show: a gallery of screenshots of the affected pages
   │                          (start state, error state, phone width, beside the Figma
   │                          frame), plus an optional video of the whole walk
   ▼
Share it / undo it            share-my-change: format, quick check, commit message
                              written from the diff, pull request with the gallery,
                              "undo my last change", and a handover note for the real
                              plants-frontend team
```

Each skill ends with the same two runnable, visible steps:

1. `npm run check -- <set>`: the quick check. Formatting, the Welsh check and the set
   boot check, with every failure explained in plain English.
2. `npm run show -- <set> --pages <slugs>`: opens a gallery page the designer can look at
   and send to someone.

Each skill also ends with the same handover route to the real team: share-my-change in
"hand over to the real team" mode.

## 2. Decisions I made (flagged, not gated)

| Decision | Choice | Why |
|---|---|---|
| Where designer edits live | In a **design release**: a set the designer owns, made with `new:set --from high-risk-plants` and listed in `ours`. Edits to high-risk-plants happen only when the change is going to the real team. | Only `ours` is safe from the weekly sync. Edits anywhere else survive only until upstream touches the same lines, then need a person to resolve (plants-sets.md §3–4). |
| package.json | **Touch it.** It is already `patched` (it carries `new:set` and `sync:upstream`). Add one block of designer scripts after `sync:upstream`, and update the `why`. | Designers run npm scripts, not `node scripts/...`. The change only adds lines in one place, so it rarely conflicts. The alternative (tell designers to type `node scripts/show/index.js`) is worse for them and breaks the "wrap node runs in npm scripts" rule. |
| Welsh in the designer's own releases | Welsh copy stays in step key by key. A new or changed string gets `'[Welsh needed] <English>'` in `copy.cy.js`, and the handover note lists every one. | Keeps the key shapes and the "Welsh differs from English" rule intact, so the copy ports to the real journey cleanly. Designers are not asked to write Welsh. |
| Tests in design releases | The copied engineering tests and FIT specs are **not copied**. The release is checked by the platform checks, the set boot check and `npm run show`. | About 50 copied tests fail by construction and 18 specs are run by vitest by mistake (plants-sets.md §2). A frozen design snapshot does not need the real journey's test suite. |
| Bespoke styling | **No set-level stylesheet in v1.** match-the-design translates each style request into GOV.UK or MoJ macros and utilities. What cannot be translated goes into the release's `design-notes.md` and the handover. | A set stylesheet would need a patched `webpack.config.js` entry, which is a real trade-off. Flagged for Sam as a follow-up (section 5). |
| "Research mode" (validation off) | One commit inside the research release relaxes the chosen rules, and each change is logged in `research.md`. Turning realistic errors back on is `git revert` of that commit. | Reversible and inspectable, and it never touches the shared engine. A global switch in the validation library would be an upstream change and a hack. |
| Screenshots | A prototype-owned `scripts/show/` that drives its own server on port 3203 with Playwright. It does **not** depend on tim, and does not use the `journeys` project. | Designers do not have the workspace. It needs its own server so screenshots are deterministic and the designer's `:3103` data is left alone. |
| Cursor | Add a thin `AGENTS.md` that points at `CLAUDE.md`, and keep skills in `.claude/skills/` (Cursor discovers them). | The old prototype's designer works in Cursor. |
| `.claude/settings.json` | Update `settings-proposal.json`: take the file into **ours** (not `deleted`), with no hooks and an allowlist for the designer commands. | A designer's Claude Code needs an allowlist, or it asks for permission on every command. The allowlist has to survive the sync. |

## 3. Coverage against the recent change types

| Change type (recent count) | Served by |
|---|---|
| Styling and layout (30) | match-the-design, show (Figma frame beside the screenshot) |
| Wording sweeps (28) | change-the-words (+ copy-sweep workflow, `npm run words`) |
| Example data (20) | example-data (seed for any set, new example states, parties overlay) |
| Common-capability sub-flows (17) | shared-features (prototype-services seam and recipes) |
| Dashboards and lists (16) | shared-features (records view, filters, tabs, counts, overall home) |
| Journey flow (10), new pages (10), check answers (10), hub (6), confirmation (4) | change-the-journey |
| Validation on or off (10) | research-session |
| Cross-release fan-out (8) | start-a-release ("copy this change to release Y") and share-my-change (handover) |
| New release or research variant (3, blocked today) | start-a-release + `new:set` fixes |
| Custom client JS (8) | match-the-design (the components we already have) |
| Navigation chrome (6) | match-the-design explains it is a real-team change and routes it to the handover |
| Reverts (5) | share-my-change "undo my last change" |
| Jump to a mid-journey state (2) | see-it + example-data (a direct link to an example stopped at page X) |
| Demo walkthrough (1) | show `--video` |

## 4. Deliverables

Twelve deliverables. Each lists the paths it owns, and no path appears in two
deliverables. Every new path goes into `overrides.json` `ours`, done by the integration
deliverable.

### D1 `designer-suite-integration` (integration)
Owns `CLAUDE.md`, `AGENTS.md`, `PROTOTYPE.md`, `overrides.json`, `package.json`,
`.gitignore`.

- **CLAUDE.md** (under 150 lines, speaks to the agent; the designer never has to read it):
  - **Who you are working with.** Designers who know HTML, Nunjucks and the GOV.UK Design
    System, and use git lightly. Write to them in GDS plain English, with no jargon. Say
    "your release", not "set plugin".
  - **Load-bearing rules:**
    1. Before any edit, run `npm run where -- <path>` and follow its verdict. Outside
       `ours`, offer "work in your own release" (start-a-release) or "this is for the
       real team" (share-my-change handover).
    2. Change `copy.en.js` and `copy.cy.js` together.
    3. Stay in the GOV.UK toolbox: no new Sass or JS bundles.
    4. Make one change, then run check and show.
    5. Never run `npm install` or bare `npm ci`. The only install is
       `npx --yes npm@11.6.2 ci`.
    6. One Bash command per call, run from the repo root.
    7. Never edit `.claude/settings.json`, `src/client/**`, `webpack.config.js`,
       `vitest.config.js`, the engine, model, flow, shared, services or lib folders, or
       `layout.njk`, unless the change is going to the real team.
    8. Never push to main or force-push. Changes reach main through a pull request.
  - **Routing table** (trigger phrase → skill) for all ten skills.
  - A glossary pointer to `docs/designers/glossary.md`.
- **AGENTS.md**: three lines pointing Cursor and other agents at `CLAUDE.md`.
- **PROTOTYPE.md** rewrite, keeping its existing content:
  - Fix the wrong sentence "the pull request merges itself". Nobody auto-merges, and a
    person merges every sync pull request.
  - Soften "the sync overwrites" to the honest rule: an edit outside ours is on borrowed
    time, and the week it breaks, a person has to fix it.
  - Add "Working with Claude Code", which lists what you can ask for as plain sentences.
  - Add "Your own design releases".
  - Add "Saving a file clears the example data (click Reset)".
  - Add "Seeing and showing your change", covering `npm run show`.
  - Add "Welsh in your releases", covering `[Welsh needed]`.
  - Add a link to `docs/designers/`.
- **overrides.json**:
  - Add to ours:
    - `CLAUDE.md`, `AGENTS.md`, `.claude/skills/**`, `.claude/rules/**`,
      `.claude/workflows/**`, `docs/designers/**`
    - `scripts/designer/**`, `scripts/show/**`, `scripts/copy/**`, `scripts/research/**`,
      `scripts/preview/**`
    - `src/server/prototype-services/**`, `src/server/prototype-data/**`
    - `.claude/settings.json` (once Sam applies the proposal)
  - Update the `why` on each patched entry that D4 extends:
    - `package.json`: the designer scripts.
    - `.gitignore`: `.show/`.
    - `src/server/app/services/address-book/index.js`, `ports/index.js` and
      `countries/index.js`: they also merge `src/server/prototype-data` overlays.
- **package.json**: one additive block after `sync:upstream`, in this order:

  | Script | Runs | Provided by |
  |---|---|---|
  | `where` | `node scripts/designer/where.js` | D2 |
  | `check` | `node scripts/designer/check.js` | D2 |
  | `words` | `node scripts/copy/find.js` | D6 |
  | `words:check` | `node scripts/copy/parity.js` | D6 |
  | `show` | `node scripts/show/index.js` | D11 |
  | `examples` | `node scripts/preview/examples.js` | D10 |
  | `preview:free-port` | `node scripts/preview/free-port.js` | D10 |
  | `research:sheet` | `node scripts/research/sheet.js` | D9 |

  Leave the upstream scripts untouched. Regenerate nothing in `package-lock.json`, because
  no dependency changes.
- **.gitignore**: add `.show/` (the gallery output). Declare it in patched.
- **Workarea side** (not in the repo): rewrite
  `workareas/shared/designer-prototyping/settings-proposal.json` so `.claude/settings.json`
  goes in ours. Its content has no hooks, plus an allow list:
  - `npm run dev|check|show|where|words|words:check|examples|research:sheet|new:set|format|lint|test:high-risk-plants|test:fit:journeys|playwright:install`
  - `npx --yes npm@11.6.2 ci`
  - `git status|diff|log|add|commit|switch|revert|restore|stash list`
  - `gh pr create|view`

  Deny list: `git push --force*`, `git push origin main`.
- **Acceptance:**
  - `overrides.test.js` passes: ours and patched do not overlap, and every patched path
    exists.
  - `npm run format:check` passes.
  - Every script in the new block resolves to a file that exists.
  - `grep -rn "trade-imports-workspace\|tim " CLAUDE.md PROTOTYPE.md docs/designers .claude`
    finds nothing.

### D2 `designer-foundations` (doc)
Owns `docs/designers/**`, `.claude/rules/sync-safety.md`, `scripts/designer/**`.

- **`scripts/designer/where.js`** (`npm run where -- <path> [<path>...]`)
  - Classifies each path with the same `classifyPath` rules the sync robot uses (it
    imports `scripts/sync-upstream/rules.js` and does not re-implement them). It prints
    one plain line per path, one of:
    - "Yours: safe to change, the weekly update never touches it."
    - "Shared with the real service, changed on purpose here (patched): change with
      care."
    - "Belongs to the real service: your change will clash with the weekly update. Make
      it in your own release, or hand it to the real team."
    - "Removed by the weekly update: never edit."
  - `--json` for skills. Exit code 0 always, because the result is advice, not a gate.
- **`scripts/designer/check.js`** (`npm run check -- <set> [--full]`)
  - Tier 1, the default, a few seconds:
    1. `prettier --write` over the changed files.
    2. `words:check` (D6) for the set.
    3. eslint on the changed .js files.
    4. A boot check: import the router in stub mode, mount it, assert the set's first
       page answers 200.
    5. If the set is high-risk-plants, `test:high-risk-plants`.
  - `--full` adds `npm run lint` and `npm test`, which is what the pre-commit hook will
    run.
  - A **translator** maps known failure text to one plain sentence and the fix. It covers:
    - `copy-parity`, `copy-convention` and `contract` failures
    - `no-orphans`
    - `Obligations collected by no page`, `owned by no feature` and `obligation-purity`
    - `EADDRINUSE`
    - the Prettier diff
    - `Executable doesn't exist`
  - Raw output goes to `.show/logs/check-<time>.log`, and the path is printed.
- **`docs/designers/`**: GDS plain English, one page per task:
  - `README.md` (start here)
  - `your-first-hour.md`: install, run, sign in, reset, your first release, your first
    word change, show it
  - `where-changes-go.md`: the `where` verdicts with pictures of the folder tree
  - `a-weekly-session.md`: the loop in section 1
  - `glossary.md`: set, release, example data, check, show, handover, sync, needs-person
  - `troubleshooting.md`: the ten errors from plants-verify §6, each with its fix
  - `asking-claude.md`: example requests that work well, grouped by change type, in
    proportion to the taxonomy
- **`.claude/rules/sync-safety.md`**: `paths:` covers `src/server/app/sets/high-risk-plants/**`,
  `src/server/app/routes-high-risk-plants.js`, `src/client/**`, `src/server/app/shared/**`
  and `src/server/app/{engine,model,flow,lib,services,bridge}/**`. It says: stop, run
  `npm run where`, and offer the two routes.
- **Acceptance:**
  - Unit tests for `where.js` (one path of each class) and for the translator (one
    fixture per known failure).
  - `npm run where -- src/server/app/sets/high-risk-plants/set.js` prints the "belongs to
    the real service" line.
  - `npm run check -- sample-journey` passes on a clean tree.
  - Every doc passes a plain-English read: sentences under 25 words, and no unexplained
    terms beyond the glossary.

### D3 `start-a-release` (skill)
Owns `.claude/skills/start-a-release/**`, `scripts/new-set/**`, `src/server/prototype-sets/**`.

- **Triggers:**
  - "start a new release", "freeze this release", "make a copy of the journey to work on"
  - "new research version"
  - "copy this change to release X"
  - "retire release X", "which releases are there"

  **NOT for:** changing pages inside a release (the other skills), or example data
  (example-data).
- **`scripts/new-set` fixes** (plants-sets.md §5). When `--from` is not `sample-journey`:
  - Skip `**/*.test.js`, `**/*.fit.spec.js`, `**/fit/**`, `spec/` and `docs/`, and
    write a one-line `docs/README.md` that links to the source set's docs.
  - Add `--describe "<blurb>"`, which appends to `prototype-sets/descriptions.js`. Without
    it, write a dated placeholder blurb such as "Copy of high-risk-plants made
    2026-09-27".
  - Write `sets/<id>/release.json` with `{ from, fromCommit, createdAt, purpose }`.
  - Print designer next steps in plain English: the URL, reset, and show.
  - Fix the "replace welcome/" message for non-sample templates.
  - Add a regression test that scaffolds `--from high-risk-plants` into a temp tree and
    asserts that no tests or specs were copied, the blurb exists, and the ids were
    rewritten.
  - Add a boot test in `prototype-sets/` proving a second full journey mounts and its
    first page returns 200.
- **Skill steps:**
  1. Ask for, or infer, the purpose: stable reference, working copy, or research round.
  2. Suggest a readable id, such as `plants-dr2`, `plants-working` or
     `research-arrival-oct`.
  3. Run `npm run new:set -- <id> --from high-risk-plants --describe "..."`.
  4. Run `npm run format`, then `npm run check -- <id>`.
  5. Run `npm run show -- <id> --pages dashboard,hub,check-answers`.
  6. Say what the designer now owns: "Everything in `sets/<id>/` is yours. It is a
     snapshot of the real journey today, and it will not pick up the real team's later
     changes."
- **Copy this change to release Y** (the old cross-release fan-out, 8 recent commits):
  - Take the diff of a commit or of the working tree inside `sets/<X>/`.
  - Rewrite the set id in paths and content, then apply it to `sets/<Y>/`.
  - Show both releases side by side.
  - Refuse Y = high-risk-plants and send the designer to the handover instead.
- **Retire**:
  - `git rm -r` the release folder and `routes-<id>.js`.
  - Remove the mount lines from `prototype-sets/index.js` and the blurb.
  - The two ours globs are removed through the integration file. The skill tells the
    designer the exact lines, because overrides.json is D1's file. At run time the skill
    edits them itself: the ownership split only applies to the build.
- **Verification**:
  - The chooser at `http://localhost:3103/` lists the release with its blurb.
  - `npm run show -- <id>` gallery.
  - `npm run where -- src/server/app/sets/<id>/x` says "Yours".
- **Handover**: a release never flows upstream. Individual changes are handed over with
  share-my-change.

### D4 `example-data` (skill)
Owns `.claude/skills/example-data/**`, `src/server/prototype-seed/**`,
`src/server/prototype-data/**`, and the three patched service seams
`src/server/app/services/address-book/index.js`, `src/server/app/services/ports/index.js`
and `src/server/app/services/countries/index.js`.

- **Seeding for any set:**
  - `SEEDERS` becomes "every mounted set whose tree has
    `journeys/linear/flow/fixtures/happy-path.json`".
  - `seed-high-risk-plants.js` becomes `seed-set.js`, which takes the `SET_BASE` from the
    set.
  - Scenarios move to `prototype-seed/scenarios/<set-id>.js`. The default is today's
    four, and a missing file falls back to the default.
- **New scenario kinds** (the recent needs). Each is driven through the real routes,
  never written as a record:
  - `stopAt: '<slug>'` (exists)
  - `submit`, `amend` (exist)
  - `delete` (via delete-notification)
  - `cancelAmend` (via cancel-amend)
  - `copy` (if the set has copy)
  - `late`: arrival date in the past, set through the arrival-details step values
  - `organisation: 'stub-org-2'`: a second organisation, to show scoping
  - `label` shown in logs
- **Named consignments**: `prototype-seed/fixtures/<set-id>/<name>.json` overlays step
  values on a base happy path (for example, "a potatoes consignment from Egypt with 12
  lines"), so designers never edit the upstream happy-path.json.
- **Parties, ports and countries overlay**: `src/server/prototype-data/{parties,ports,countries}.js`
  arrays, merged after the stub data by the three patched `index.js` seams. This is one
  extra line each, and D1 updates the `why`. The overlay is prototype-wide, like the
  stub.
- **Skill triggers:**
  - "add an example", "show a submitted/late/amended/deleted notification"
  - "an example stopped at the X page"
  - "more addresses in the address book", "add a port/country"
  - "fill the dashboard"

  **NOT for:** changing what a page asks (change-the-journey).
- **Steps:**
  1. Run `npm run where`.
  2. Edit the scenario or overlay.
  3. Run `npm run check -- <set>`.
  4. Tell the designer to press Reset on the chooser, then run `npm run examples -- <set>`
     (D10), which lists each example with its direct link.
  5. Run `npm run show -- <set> --pages dashboard`.
- **Guard rails:**
  - Examples must pass the real journey's rules. If the seed rejects a value, say which
    page refused it and why.
  - Never hand-write stored records.
- **Handover**: example data stays in the prototype. If the real team needs a new stub
  party, the handover note carries the overlay entry.
- **Acceptance:**
  - Seed tests cover each new kind and seeding a copied release.
  - A release made by D3 shows the four examples on first visit.
  - A late example renders its late state on the dashboard.

### D5 `match-the-design` (skill)
Owns `.claude/skills/match-the-design/**`, `.claude/rules/gds.md`.

- **Triggers:**
  - "make this page match the design/Figma"
  - "move/space/resize", "change the layout", "make it look like"
  - "add a tag/card/tabs/table/accordion"
  - "custom dropdown/widget"

  **NOT for:** wording (change-the-words) or page order (change-the-journey).
- **Inputs**: a page (slug, or URL on :3103) and a reference (a Figma frame exported as
  PNG, a screenshot, or a description).
- **Steps:**
  1. `npm run where` on the template.
  2. Run `npm run show -- <set> --pages <slug> --reference <slug>=<image>` to get
     before-and-reference side by side.
  3. List each visual difference as a row.
  4. Map each row using `references/figma-to-govuk.md`:
     - px to the `govuk-spacing` scale 0–9 and `govuk-!-margin/padding-*`
     - type size to `govuk-body-s|l` and `govuk-heading-*`
     - widths to `govuk-!-width-*` and the grid
     - colour to a tag colour or GOV.UK colour name only
  5. Map each component using `references/components-we-have.md`: an inventory of the
     govuk-frontend 6 macros and MoJ components actually installed, and those already
     used in the repo, each with the file that uses it as an example. The builder
     generates this from `node_modules/govuk-frontend/dist/govuk/components` and
     `@ministryofjustice/frontend`, and records the versions.
  6. Edit the `template.njk` only.
  7. Re-run show with the reference.
- **Things the toolbox cannot do** (bespoke colour, pixel offsets, a new widget): do not
  write Sass or JS. Add a row to `sets/<id>/design-notes.md` (what, why, the Figma frame,
  the closest GOV.UK option used), and say so in plain words.
- **Navigation and header changes**: explain that these are shared by every release and
  owned by the real service, and offer the handover.
- **`.claude/rules/gds.md`** (`paths: src/server/app/sets/**/*.njk`):
  - macros over raw HTML
  - utilities over classes
  - no inline styles (CSP blocks them anyway)
  - headings in order
  - caption above the heading
  - one h1
  - WCAG 2.2 AA reminders
- **references/**:
  - `figma-to-govuk.md`
  - `components-we-have.md`
  - `layout-patterns.md` (two-thirds, summary cards, task list, filter layout, dashboards)
  - `when-the-toolbox-says-no.md`
- **Acceptance:**
  - A dry run on a release set turns "reduce the gap under the heading to 10px and make
    the status blue" into `govuk-!-margin-bottom-2` plus `govuk-tag--blue`, with no
    `.scss` edited.
  - Show renders the reference beside the screenshot.
  - `npm run lint:scss` is untouched.
- **Handover**: share-my-change attaches the design notes and the gallery.

### D6 `change-the-words` (skill)
Owns `.claude/skills/change-the-words/**`, `.claude/rules/copy.md`, `scripts/copy/**`,
`.claude/workflows/copy-sweep.js`.

- **Triggers:**
  - "change the wording", "reword", "rename X to Y everywhere"
  - "change the hint/label/error message/button"
  - "apply these content changes", "content sweep", "fix the caption"

  **NOT for:** adding a question (change-the-journey).
- **`npm run words -- "<text>" [--set <id>]`** (`scripts/copy/find.js`):
  - Finds the text in every `copy.en.js` and `copy.cy.js`, templates, `view-model` files,
    hub, captions and check-your-answers bundles.
  - Prints one row per hit: page (slug from the set's flow.js), file, key, English and
    Welsh.
  - For high-risk-plants only, it also lists the tests and specs that pin the text.
  - `--json` for skills.
- **`npm run words:check -- <set>`** (`scripts/copy/parity.js`) checks the set's copy:
  - English and Welsh have the same key shape.
  - No Welsh leaf equals its English leaf.
  - No empty strings.
  - It counts `[Welsh needed]` markers and lists them.

  This closes the gap that `test:high-risk-plants` does not run the parity check.
- **Skill steps:**
  1. `npm run where`.
  2. `npm run words` to find every place the text lives.
  3. Show the designer the list, grouped by page, as a plain table. Use judgement (no
     question): exclude hits in other releases unless the designer said "everywhere".
  4. Edit the English. Put `'[Welsh needed] <new English>'` in the matching Welsh key,
     unless Welsh text was supplied.
  5. For high-risk-plants (changes going to the real team) also update `copy.test.js`,
     `controller.test.js` and specs that pin the old text.
  6. Check the result against the GOV.UK style guide rules in `.claude/rules/copy.md`:
     sentence case, no "please", active voice, dates, numbers, error-message patterns.
     Suggest fixes; do not force them.
  7. Run `npm run check -- <set>`.
  8. Run `npm run show -- <set> --pages <affected>` (error state included for error
     messages).
- **`.claude/workflows/copy-sweep.js`** runs when the change touches more than 5 pages or
  applies a pasted content document:
  - It follows the args contract (`set`, `changes` as a file of `{find, replace}` or a
    content doc path; no defaults).
  - Step 1 is deterministic (`words --json`).
  - Then one agent per feature folder (at most 6 at a time) edits en and cy only.
  - Then one agent runs check and show and writes a summary table: page, before, after.
  - Launch by scriptPath.
- **Acceptance:**
  - Unit tests for find and parity, using fixtures.
  - A dry run renaming "Place of destination" in a release updates en and cy, adds the
    Welsh marker, check passes, and the gallery shows the new text.
  - On high-risk-plants the same rename also updates the pinned tests and
    `test:high-risk-plants` passes.
- **Handover**: the handover note lists each changed key with its old and new English,
  and every `[Welsh needed]` key, for the content designer and translator.

### D7 `change-the-journey` (skill)
Owns `.claude/skills/change-the-journey/**`.

- This is a port of the workspace `frontend-change` Steps 1–4 (baseline, route, follow
  the recipe as written, run the ladder).
  - Take the set as an input.
  - Drop the openspec step and all workspace paths.
  - Write the output for designers.
- **Triggers:**
  - "add a question/field", "add a page", "add a guidance page", "move this page"
  - "only show this page when", "skip this page if"
  - "rename/regroup the task list"
  - "reorder check your answers", "change the confirmation page"
  - "add a list of things (add another)"

  **NOT for:** wording only, styling only, dashboards or shared features.
- **Route table** in `references/routes.md`, each route pointing at a recipe:
  - Upstream recipes, read only: add-a-field, add-a-page, add-a-section,
    add-a-collection, journey-flow-and-gates.
  - New skill references for the gaps: `move-a-page.md` (flow.js order, run.js
    RUN_STEPS, every place a page id is registered), `add-a-branch.md` (applyTo gate on
    the obligation, with worked example), `guidance-page.md` (`collects: []`, modelled on
    sample-journey welcome), `task-list.md` (hub GROUPS, task-rows, captions),
    `check-answers.md` (answerRow/scopedRows reorder and rename), `confirmation.md`.
- **The recipes refer to high-risk-plants.** The skill substitutes the designer's release
  id throughout, and notes where a recipe's file counts have drifted (add-a-page lists
  fewer files than exist).
- **Ladder:**
  - In a release: `npm run check -- <id>` (boot check catches half-registered pages),
    then `npm run show`.
  - For high-risk-plants (changes going to the real team): full ladder
    `test:high-risk-plants` → `npm test` → `lint` → `test:fit:features` →
    `test:fit:journeys`.
- **`references/errors-explained.md`** maps each boot refusal to the step that was missed.
- **One change per run, then stop.** The skill may repair itself up to 3 times, then
  explain in plain words and offer undo.
- **Acceptance:**
  - Dry runs in a D3 release:
    - add a yes/no question with a branch
    - move arrival-details after origin
    - add a guidance page
  - Each boots, check passes, and show renders the new pages. The branch dry run
    renders the page both with it and without it (via two examples).
- **Handover**: share-my-change produces the list of equivalent high-risk-plants files
  and the recipe used, so the real team can repeat it.

### D8 `shared-features` (skill)
Owns `.claude/skills/shared-features/**`, `src/server/prototype-services/**`,
`src/server/sets-index/**`.

- **Covers:** common-capability sub-flows (17 recent) and dashboards and lists (16
  recent).
- **Triggers:**
  - "templates", "saved transporters", "fake a service"
  - "confirm before deleting", "success message/banner", "come back to where I was"
  - "dashboard filters", "tabs", "counts"
  - "a home page across plants, animals and products"

  **NOT for:** changing a question (change-the-journey).
- **`src/server/prototype-services/`:**
  - `create-store.js`: an in-memory store per set with seed rows. It registers a clear
    hook so the chooser Reset clears it. `src/server/sets-index/reset-controller.js`
    calls `clearPrototypeServices(setId)`.
  - `records-view/`: wraps the set's records `list()` and adds filter by status, search
    by reference or party, tabs and counts. It is for dashboards in owned releases only.
  - Two worked services, `templates/` and `transporters/`, both removed upstream on
    purpose. They show the pattern.
- **references/** (recipes):
  - `fake-a-service.md`
  - `confirm-then-delete.md` (the existing delete-notification as the exemplar)
  - `success-banner.md` (govukNotificationBanner success, read-once flash)
  - `come-back-to-where-i-was.md` (the engine's return targets and the address-book
    picker as the exemplar)
  - `dashboard-filters-and-tabs.md` (MoJ filter layout, govukTabs, counts from
    records-view)
  - `service-home.md` (a new set from sample-journey that acts as the cross-commodity
    front door, with cards linking into other sets)
- **Guard rails:**
  - Only in releases the designer owns.
  - Never add a route to the root surface, because co-residency.test pins it.
  - Pages that read a prototype-service live in the release.
- **Verification**:
  - `npm run check -- <set>`.
  - Reset on the chooser clears the store.
  - `npm run show -- <set> --pages dashboard,<new pages>`, including the empty state and
    the filtered state.
- **Handover**: note that the real team would need a real service or API. The handover
  lists the data the fake stores, as a starting point for the API conversation.
- **Acceptance:**
  - Tests for create-store and records-view.
  - Reset test.
  - A dry run adds a status filter and counts to a release dashboard, and the gallery
    shows it.

### D9 `research-session` (skill)
Owns `.claude/skills/research-session/**`, `scripts/research/**`.

- **Triggers:**
  - "get ready for research", "research session", "user testing next week"
  - "let participants through", "turn errors off/on"
  - "reset between participants"

  **NOT for:** a permanent design change.
- **Steps:**
  1. Make or pick a research release (D3, id `research-<topic>-<yyyymm>`).
  2. Agree the tasks. For each task, add an example stopped at the starting page (D4
     scenario).
  3. Choose how errors behave:
     - **realistic** (default, no change)
     - **let participants through**: one commit titled "Research mode: let participants
       through" that relaxes the chosen save rules and any obligation requires in the
       owned release, each logged in `sets/<id>/research.md`
  4. Run `npm run research:sheet -- <set>`, which writes `.show/<set>/research-sheet.html`:
     - local and deployed URLs
     - how to sign in, and which test user
     - one link per task to its starting example
     - the reset instruction
     - a pre-session checklist (merged a day before, reset done, phone width checked)
  5. Remind the designer that the deployed site only updates when main updates.
     share-my-change must merge before the session.
- **Afterwards**: "turn errors back on" runs `git revert <research commit>`, found by its
  title.
- **Verification**:
  - `npm run check -- <set>`.
  - `npm run show -- <set> --pages <task starts> --errors`, proving errors do or do not
    show as chosen.
  - Open the sheet.
- **Handover**: research findings are not code. The skill offers to draft the findings
  as a change list for the next release.
- **Acceptance:**
  - Sheet generator test.
  - A dry run turns errors off on arrival-details in a release (the gallery shows no
    error state), and the revert restores it.

### D10 `see-it` (skill)
Owns `.claude/skills/see-it/**`, `scripts/preview/**`.

- **Triggers:**
  - "run the prototype", "start it", "open the X page"
  - "take me to an example at page X"
  - "it's not loading", "port in use", "where did my data go"
- **`scripts/preview/free-port.js`** (`npm run preview:free-port`): says whether :3103 is
  free and, if not, which process holds it. It never kills anything; the skill asks
  first.
- **`scripts/preview/examples.js`** (`npm run examples -- <set>`): reads the set's
  scenarios (D4) and prints each example's label, the page it stopped at, and how to
  reach it. Examples are made on first visit, so it prints the dashboard URL and the
  example label to click. With `--url` it lists live links by calling the running dev
  server's dashboard with a stub sign-in.
- **Skill steps:**
  1. Check the port.
  2. Start `npm run dev` in the background.
  3. Wait for "Server started" or an error in the log.
  4. Print `http://localhost:3103/<set>` and the page URL.
  5. Warn, once per session, that "saving any file restarts the prototype and clears
     example data, so press Reset on the chooser to bring the examples back".
  6. Handle first-run setup: `npx --yes npm@11.6.2 ci`, and `npm run playwright:install`
     for show.
- **Verification**: the page URL answers 200 (checked with the WebFetch-free local
  request the skill makes through `npm run examples -- <set> --url`).
- **Acceptance**:
  - free-port and examples tests.
  - From a cold clone, following `your-first-hour.md` with this skill reaches the
    dashboard with four examples.

### D11 `show-my-change` (script)
Owns `.claude/skills/show-my-change/**`, `scripts/show/**`.

- **`npm run show -- <set> [options]`:**

  | Option | What it does |
  |---|---|
  | `--pages a,b` | Pages to capture. The default is the pages affected by `git diff --name-only HEAD` plus untracked files, mapped through the set's `flow.js` sections, feature folder to slug. Shared or copy-bundle files mean every page. |
  | `--errors` | Also capture the error state: submit the empty form and capture it if an error summary appears. |
  | `--mobile` | Also capture at 320px. |
  | `--reference slug=image` | Put a design frame beside the screenshot. |
  | `--video` | Record the whole happy path at slowMo 600 into `walk.webm`. |
  | `--save-as <name>` | Save this run as a named baseline. |
  | `--compare <name>` | Show a baseline beside this run, with a before/after toggle. |

- **How it runs:**
  - Build client assets only if `.public/assets-manifest.json` is older than `src/client`.
  - Start its own server (`node .`, NODE_ENV=development, PORT=3203, STUB_MODE=true,
    PROTOTYPE_SEED=false) through `@playwright/test`'s library API with a Chromium launch.
    It never uses the designer's :3103.
  - Sign in via `/auth/stub-sign-in`.
  - For each page, reach it with real data: pick the first happy path in the set's
    `happy-path.json` that visits the slug, and replay the earlier steps through the UI
    using the fill logic in `fit/seed-fields.js` (imported read-only).
  - Capture a full-page screenshot, then the optional error, mobile and axe results.
    `@axe-core/playwright` is already a dependency, and axe findings are shown per page
    in plain words.
- **Output**: `.show/<set>/<timestamp>/` holds `index.html` (a GOV.UK-styled static
  gallery), `manifest.json` and the PNGs. `.show/<set>/latest` points at it. It prints
  the path, and prints "Pages no example reaches" for any slug no happy path visits.
- **The skill** ("show me", "screenshot", "record a walkthrough", "before and after",
  "compare with the Figma"):
  - Runs show.
  - Opens the gallery (reads the PNGs to describe them).
  - Offers the gallery for the pull request (share-my-change) and, where the Artifact
    tool exists, as a private page.
- **Acceptance:**
  - Unit tests for the diff → pages mapping, and for manifest and gallery generation from
    fixtures.
  - A real run on high-risk-plants `--pages arrival-details --errors --mobile` produces 3
    PNGs and an index.
  - A run on a D3 release works.
  - It does not disturb a running :3103.

### D12 `share-my-change` (skill)
Owns `.claude/skills/share-my-change/**`.

- **Triggers:**
  - "share this", "save my work", "publish", "make a pull request"
  - "undo my last change", "go back"
  - "hand this to the real team", "send this to the developers"
- **Share:**
  1. `git status`, then `git diff` summarised in plain words.
  2. If on main, create the branch `design/<release>-<slug>`.
  3. `npm run format`.
  4. `npm run check -- <set> --full`, so the pre-commit hook is certain to pass. Never
     use `--no-verify`.
  5. Commit with a message written from the diff (what changed, on which pages, and
     why), not "text" or "fixes".
  6. `gh pr create` with the gallery summary, and a note that the Playwright report
     artifact on the PR has the walkthrough video.
  7. Tell the designer that main deploys only after merge.
- **Undo** (plain-English choice of three):
  - Undo unsaved edits to one page: `git restore <files>` after listing them.
  - Undo the last saved change: `git revert HEAD`.
  - Undo a named change: find it by message and `git revert` it.

  Never reset or rewrite history.
- **Hand to the real team:**
  1. Write `src/server/app/sets/<id>/handovers/<yyyy-mm-dd>-<slug>.md` (inside the owned
     release, so it is ours). It holds:
     - what and why
     - pages affected, with gallery screenshots copied beside it
     - the equivalent high-risk-plants file for each changed file (the set id
       substituted)
     - copy changes with old and new English, plus Welsh needed
     - design notes (D5)
     - fake-service data shapes (D8)
     - the recipe used (D7)
     - a paste-ready pull request or ticket description
  2. Offer, but do not do, a branch on trade-imports-plants-frontend.
- **Verification**:
  - `gh pr view` shows the pull request.
  - The handover renders.
  - The gallery link works.
- **Acceptance:**
  - A dry run on a release with a copy change produces a commit that passes the hook,
    a pull request body, and a handover note that names the right high-risk-plants
    files.
  - Undo of the last change leaves a clean tree and a revert commit.

## 5. Follow-ups for Sam (not in this build)

1. **A set-level stylesheet seam.** A patched `webpack.config.js` entry for
   `src/client/prototype/<set>.scss` in ours. It is the only way the most frequent change
   type (styling) could go beyond the toolbox. Recommend deciding after a month of
   design-notes evidence.
2. **Preview per branch.** Only main deploys. `publish-branch.yml` is deleted in
   overrides. Restoring it would let designers see pull requests deployed, which is a CDP
   platform change and Sam's to make.
3. **Doc drift upstream.** Both `testing.md` files say "no tests exist", and the
   add-a-page counts are wrong. Fix these upstream so the sync carries them in.
4. **Apply `settings-proposal.json`** before the first designer session.
5. **A test that checks declared drift.** It would fail when a file differs from upstream
   but is not in ours or patched, so undeclared edits are caught before Monday.

## 6. Build order

1. D1 and D2 first (they hold the rules, the scripts block and `where`).
2. Then D4 (seed for any set).
3. Then D3 (releases boot with examples).
4. Then D11 and D10 (see and show). Every later deliverable verifies with these.
5. Then D6, D5, D7, D8, D9, D12.
