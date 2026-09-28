# Designer suite for the plants prototype: final plan

Written 2026-09-27 by the judge step. Target: `repos/trade-imports-plants-prototype` on
`feat/NO_JIRA-designer-prototyping` (HEAD `aeb1617`). Every path below is repo-relative to
that repo unless it says otherwise.

Inputs: the three proposals in `design/` (designer-experience "DX", agentic-workflows "AW",
sync-and-fidelity "SF"), `notes/usage.md` (with the critic addendum), the batch notes
`notes/old.md` and `notes/b01.md` to `b10.md`, and `notes/plants-*.md` plus
`notes/reusable-assets.md`. `analysis.md` was never written to disk (the Write tool refused
it in the analysis phase). The taxonomy the proposals relay (below) and `usage.md` stand in
for it.

## 1. The evidence the plan is built on

The old prototype (GB-notification-service) has one designer committing whole sessions
straight to `main`: one big commit, then 1 or 2 fix-ups within the hour. Recent means since
2026-06-27 (49 designer commits). Counts are "recent / older" commits that contain that kind
of change. A commit usually contains several kinds.

| Change type | Recent / older | Example commits |
|---|---|---|
| Styling and layout (Sass, grid, spacing) | 30 / 12 | `9abc06e`, `6d3dd1e`, `7467690` |
| Wording sweeps (headings, labels, hints, captions) | 28 / 5 | `8283340`, `903344e`, `f622600`, `077c2f0`, `fcf7d7f` |
| Example (fixture) data | 20 / 4 | `a79a15f`, `dc8dcc6`, `a0e46bd` |
| Common-capability sub-flows (address book, transporters, templates, amend, copy, delete) | 17 / 0 | `b75ce0a`, `c93fe37`, `dc8dcc6`, `7661d29`, `a0e46bd` |
| Dashboards and lists | 16 / 1 | `9aabc14`, `d4af0df`, `6d3dd1e`, `7da4f70`, `7467690` |
| Journey flow (order, branching) | 10 / 4 | `9abc06e`, `4377980`, `33f5836`, `c149d7b`, `268f070` |
| New pages | 10 / 4 | `c93fe37`, `268f070` |
| Check your answers | 10 / 2 | `9abc06e`, `c149d7b`, `cb13efb`, `8283340` |
| Validation off and on for research | 10 / 1 | `9abc06e`, `9038927`, `a0aaf28` then `cb13efb`, `91507cb` |
| The same change by hand in 2 to 4 releases | 8 / 0 | `8283340`, `a0e46bd` |
| Custom client JS | 8 / 4 | `dc8dcc6`, `1fe0fb5` |
| Header, navigation, home page | 6 / 2 | `8845358`, `7467690` |
| Task list (hub) | 6 / 3 | `4377980`, `3bf1a9b` |
| Reverts | 5 / 1 | `50afa9e` |
| Confirmation page variants | 4 / 0 | `c149d7b`, `a0e46bd`, `50afa9e` |
| New release or research variant | 3 / 1 | `2191e30`, `6d3dd1e`, `c442009` |
| Jump to a mid-journey state | 2 / 1 | `1f84c10` |
| Demo walkthrough video | 1 / 0 | `5700f2b`, `85ea76c` |

Critic findings that shape the plan (usage.md addendum):

- PROTOTYPE.md is wrong that the sync pull request "merges itself". A person merges every
  sync PR. An edit outside `ours` is on borrowed time, not silently lost.
- Welsh cannot be reviewed in the browser (every call site resolves `en`).
- Editing a file restarts the server and wipes the in-memory examples.
- Links to seeded examples break on every restart, because references are freshly minted.
- Only `main` deploys (`publish-branch.yml` is deleted), so work in progress cannot be
  shared before merge.
- Most recent designer work (address book, templates, transporters, service home) has no
  plants equivalent. The suite must offer "fake it in a release you own".
- The designer needs "save my work" more than anything else: format, fast check, a commit
  message written from the diff, branch and PR.

## 2. Scores

Scored 1 (weak) to 5 (strong). Weights reflect the brief: coverage in proportion to real
frequency matters most, then sync safety and designer usability, then verifiability, then
feasibility and hand-off.

| Criterion (weight) | DX | AW | SF |
|---|---|---|---|
| Coverage of recent change types, by frequency (25%) | 5 | 5 | 4 |
| Sync safety (20%) | 4 | 5 | 5 |
| Designer usability (20%) | 5 | 4 | 3 |
| Verifiability (15%) | 4 | 5 | 4 |
| Feasibility in this codebase (10%) | 4 | 3 | 3 |
| Hand-off to the real team (10%) | 3 | 4 | 5 |
| **Weighted** | **4.35** | **4.50** | **4.00** |

Why:

- **DX** has the best designer-facing language, the clearest "where / change / see / show /
  share" loop, the best Welsh policy, the Figma-reference gallery and the most honest
  follow-ups. Its sync safety is advice only (no hook, no frozen releases). Its hand-over
  lists "equivalent files" but produces no patch a developer can apply.
- **AW** has the strongest structure: guard rails built first, a namespaced `designer:*`
  script family, tiered checks, a `release-render` test that proves every release boots in
  `npm test`, a FIT walk per release, "before" screenshots without touching the working
  tree, a `port-kit-page` workflow for the old prototype's pages, a consistency test for the
  suite itself, and a single `MODELS` constant for workflow model choice. Weak points: its
  research mode swaps a release's validator imports at runtime (invasive, hard to see), and
  it leans on a hook that only exists once Sam applies settings.
- **SF** has the best hand-off (reverse id/UUID transform, a `git apply --check`-verified
  patch, an upstream drift report, a test-impact list, "cannot ship as-is" detection), the
  best chooser (tags by release purpose), a CI canary that proves forking stays viable, and
  the design-session workflow. It is heaviest for a designer (`--purpose` required,
  `proto:*` names, many flags) and has the most feasibility risk (UUID map inside
  `transformContent`, records persistence).

**Spine: AW.** Grafts: DX's designer language, loop, Welsh policy, reference-image gallery,
docs set, AGENTS.md and research commit-and-revert; SF's hand-off engine, chooser tags, CI
canary, failure catalogue, organisation examples, persistence for releases and the
design-session workflow.

## 3. Conflicts and how they are resolved

| # | Conflict | Ruling | Why |
|---|---|---|---|
| 1 | Script names: `where`/`check`/`show` (DX), `designer:*` (AW), `proto:*` (SF) | **`designer:*`** | A prefix upstream will never use, so the patched `package.json` never collides with an upstream script. One allowlist pattern (`npm run designer:*`). Designers mostly say words; Claude types the command. |
| 2 | Adding scripts to `package.json` | **Yes: one contiguous block straight after the `new:set` line** | `package.json` is already `patched` for `new:set` and `sync:upstream`. One hunk next to a prototype-only line is the lowest-conflict place. No dependency changes, so `package-lock.json` keeps only its name lines. The dead `fit:start:workspace` line is **left alone** (AW wanted it removed): removing an upstream line creates a second hunk for no designer benefit. |
| 3 | Output folder: `.show/` (DX, needs `.gitignore` patch), `.designer/` (SF, needs patch), `.cache/designer/` (AW) | **`.cache/designer/`** | `.cache` is already in `.gitignore`, so no new patched file. |
| 4 | Where the parties/ports/countries overlay hooks in: the already-patched `services/*/index.js` (DX, AW) or new patches to `stub/*.js` (SF) | **The `index.js` seams** | They are already patched with a `why`. One extra line each; no new divergence. |
| 5 | Research mode: runtime wrapper and `modes.json` (AW) or one commit that is reverted afterwards (DX, SF) | **One commit, reverted afterwards** | Visible in the diff, logged in `sets/<id>/research-mode.md`, needs no runtime switch in the engine and cannot leak into other sets. The chooser shows a "Research mode on" tag when that file exists (AW's tag, SF's mechanism). |
| 6 | Tests in a release | **Not copied** (all three agree) | About 50 copied tests fail by construction and 18 FIT specs are run by vitest by mistake (`plants-sets.md` §2). Releases are protected by prototype-owned generic checks instead. |
| 7 | Guard hook on Edit/Write | **Build the script, propose the setting** | The hook script is built and tested (AW, SF). Settings are Sam's, so the hook is written to `settings-proposal.json`. Nothing in any skill depends on the hook: every skill runs its own ownership step first. |
| 8 | Where hand-over output lives: inside the release (DX), `handoffs/**` committed (AW), gitignored `.designer/` (SF) | **`handoffs/<yyyy-mm-dd>-<slug>/`, committed, ours** | A committed brief can be linked from a PR and read by the real team without running anything. Screenshots in it are capped at 2 MB. |
| 9 | Hand-over mechanism: equivalent-files note (DX), `release-diff` plus `handoff/*` branch (AW), reverse transform plus upstream-bound mode (SF) | **SF's engine inside AW's shape** | `designer:handoff` builds the brief and a reverse-transformed `upstream.patch` checked with `git apply --check`, plus drift and test-impact reports. The upstream-bound branch (`handoff/<slug>`) is the second route for changes that must carry the real tests. |
| 10 | UUID mapping for the reverse transform | **`release.json` records `uuidMap`** | `new:set` reports its UUID substitutions. Fallback if that breaks `transform.test.js`: pair UUIDs by file and position in a second pass (SF risk list). |
| 11 | Frozen releases | **Yes** (AW, SF) | "Freeze DR2, keep working in DR2.1" is the designer's core habit (`c442009`). `release.json` `frozen: true`; skills refuse to edit it; the hook blocks it. |
| 12 | Data lost on every restart | **Persist releases' records in development; stable example links everywhere** | SF's write-through store for releases fixes "my walk vanished when I saved". Stable example links (`/examples/<set>/<example>`) fix broken research links for every set, including high-risk-plants. |
| 13 | How `show` reaches a page | **Playwright library API; POST fixture steps through a request context sharing cookies, then screenshot** (SF) | Faster than replaying the UI (DX) and the same route the seed uses. Never a `*.spec.js` file under `scripts/`: vitest's default include would run it as a unit test. |
| 14 | Mobile width: 375 (AW) or 320 (DX) | **320** | The WCAG 2.2 reflow width. |
| 15 | Bespoke Sass and client JS | **None in v1** (all three) | Toolbox only. What cannot be built goes in `sets/<id>/design-gaps.md` and travels with the hand-over. A set-level stylesheet seam is a follow-up for Sam. |
| 16 | The IPAFFS lookalike need (critic B8: variants side by side with non-GOV.UK chips) | **Stated position: build the closest GOV.UK version and log the gap** | Honest to the fidelity goal. `designer:show --compare` gives the side-by-side view. |
| 17 | Workflows on hosts without the Workflow tool (Cursor) | **Every workflow's skill also describes the steps run one after another** (AW) | Workflows are an accelerator, not a dependency. |
| 18 | Skill names | **Designer words** (DX, SF), plus `port-a-kit-page` (AW) | Names are what designers see in `/` menus. |

## 4. The designer's loop

```
"I want X on this page"
   │  CLAUDE.md routes the request to a skill by its plain-English trigger phrases
   ▼
Whose file is it?        npm run designer:where -- <paths>
   │                     yours · shared on purpose · belongs to the real service · removed
   │                     If it belongs to the real service: "do it in your design release"
   │                     (default) or "prepare it for the real team" (hand-off)
   ▼
Make the change          change-the-words · match-the-design · port-a-kit-page ·
   │                     change-the-journey · example-data · fake-a-service ·
   │                     research-session · design-release
   ▼
Check it                 npm run designer:check -- --set <id>      (plain-English pass/fail)
   ▼
See it and show it       the running prototype at a stable example link, and
   │                     npm run designer:show -- --set <id>        (gallery: before/after,
   │                     error state, phone width, Figma frame beside it, axe, video)
   ▼
Share it or undo it      share-my-change: branch, commit message from the diff, PR
   ▼
Make it real             hand-off: brief + patch + screenshots for plants-frontend
```

Every skill ends with the same three things:

1. `npm run designer:check -- --set <id>` and its plain-English result.
2. `npm run designer:show -- --set <id>` and the gallery path, plus the
   `http://localhost:3103/<set>/...` links to click. The skill reads the key PNGs itself and
   never claims a visual result it has not looked at.
3. The hand-off line: "If this should become part of the real service, say 'hand this to
   the real team' and I will prepare a brief and a patch for the plants-frontend team."

## 5. Coverage

| Change type (recent) | Skill | Share of recent work |
|---|---|---|
| Styling and layout (30) | `match-the-design` (and `port-a-kit-page`) | highest |
| Wording sweeps (28) | `change-the-words` (+ `wording-sweep` workflow) | |
| Example data (20), jump to a state (2) | `example-data` | |
| Common capabilities (17), dashboards (16) | `fake-a-service` | |
| Flow (10), pages (10), check answers (10), hub (6), confirmation (4) | `change-the-journey` | |
| Validation off and on (10) | `research-session` | |
| Same change in several releases (8), new release (3) | `design-release` | |
| Custom client JS (8), header and navigation (6) | `match-the-design` (toolbox answer or a logged gap, handed off) | |
| Reverts (5) | `share-my-change` (undo) | |
| Demo walkthrough (1) | `show-my-change` (`--video`) | |
| Every session | `run-the-prototype`, `check-my-change`, `show-my-change`, `share-my-change` | |
| Make it real | `hand-off` | |
| Weekly omnibus session (the old "feedback updates", `4377980`) | `design-session` workflow | |

## 6. Deliverables

Twelve deliverables. `owns_paths` are disjoint. Only D1 touches `PROTOTYPE.md`, `CLAUDE.md`,
`AGENTS.md`, `overrides.json` and `package.json`. Every other deliverable lists the `ours`
globs, `patched` entries and npm scripts it needs, and D1 applies them.

Shared rules for every deliverable's builder:

- Designers have only this repo. No path, command or doc may mention the workspace, `tim`,
  `tools/`, `openspec` or `~/git/defra`.
- Everything a designer reads is GDS plain English: short sentences, active voice, no
  unexplained terms beyond `docs/designers/glossary.md`.
- Scripts are plain ESM with no new dependencies. Allowed packages are those already
  installed: `@playwright/test`, `@axe-core/playwright`, `cheerio`, `nunjucks`,
  `govuk-frontend`, `@ministryofjustice/frontend`, `accessible-autocomplete`.
- Unit tests are vitest, named `*.test.js`, so `npm test` picks them up with no config
  change. Never name a file `*.spec.js` outside `fit/`.
- Every new `.js` file must be imported by something or be an entry point that
  dependency-cruiser does not scan (`lint:arch` only scans `src/server/app`). Confirm
  `npm run lint` shows no `no-orphans` error.
- One Bash command per call in every skill's instructions. Install only with
  `npx --yes npm@11.6.2 ci`; never `npm install` or bare `npm ci`. Never `--no-verify`,
  never force-push, never push without asking.
- Every SKILL.md has frontmatter `name` equal to its folder and a `description` that
  contains "Use when", trigger phrases and "NOT for". Each ends with check, show and the
  hand-off line.
- Skill output rules: say "your design release", not "set plugin"; say what changed on
  which pages; give links.

### D1 `designer-suite-integration` (integration)

**Owns:** `CLAUDE.md`, `AGENTS.md`, `PROTOTYPE.md`, `overrides.json`, `package.json`,
`docs/designers/README.md`, `scripts/designer/suite.test.js`, `.claude/workflows/README.md`,
`.claude/workflows/design-session.js`, `.claude/workflows/args-contract.test.js`

Build last.

- **CLAUDE.md** (at most 150 lines, speaks to the agent):
  - Who you are working with: interaction and content designers who know HTML, Nunjucks and
    the GOV.UK Design System, use git lightly and are not JS architects. Reply in GDS plain
    English.
  - What this repo is: a copy of the real plants frontend, stub data, sets, design
    releases, the weekly sync. Five lines. Point at `PROTOTYPE.md` and `docs/designers/`.
  - Load-bearing rules:
    1. Before any edit, run `npm run designer:where -- <paths>` and follow it. If a file
       belongs to the real service, offer "do it in your design release" (default) or
       "prepare it for the real team" (`hand-off`). Never edit it in place on a `design/*`
       branch.
    2. Never edit a frozen release.
    3. Change `copy.en.js` and `copy.cy.js` together. With no Welsh given, write
       `'[Welsh needed] <English>'`.
    4. Stay in the GOV.UK toolbox: macros and `govuk-*`/`moj-*` classes only. No Sass,
       inline styles, new client JS or webpack entries. Log gaps in `design-gaps.md`.
    5. Example data is made by replaying real pages, never written as records.
    6. One change per request, then check, show and the hand-off line.
    7. Install only with `npx --yes npm@11.6.2 ci`. One Bash command per call.
    8. Never `--no-verify`, never force-push, never push or open a PR without asking.
    9. Never edit `.claude/settings.json`, `src/client/**`, `webpack.config.js`,
       `vitest.config.js`, `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**`
       or `shared/layout.njk`, except on a `handoff/*` or `maintain/*` branch.
  - Routing table: every skill, at least 3 trigger phrases each, plus the 4 workflows.
  - Branches: `design/<set>-<slug>` for designer work, `handoff/<slug>` for upstream-bound
    work, `maintain/<slug>` for maintainers.
  - The first line says: "If Claude Code reports a missing hook script, the settings
    proposal has not been applied yet. It is harmless; tell Sam."
- **AGENTS.md**: about 10 lines pointing Cursor and other agents at `CLAUDE.md` and
  `.claude/skills/`.
- **PROTOTYPE.md** rewrite, keeping its existing sections:
  - Correct the sync section: no pull request merges itself; a person merges every sync
    PR. An edit outside `ours` survives until upstream changes the same lines, then lands
    on a person as `needs-person`.
  - Add "Working with Claude Code": a table of what you want to do, what to say, and the
    skill that does it.
  - Add "Your design releases": snapshot, working, frozen and research releases; retire;
    Welsh in a release is placeholder-checked, not parity-checked.
  - Add "Your data and example links": saving a file restarts the prototype; releases keep
    their data in development; examples come back with Reset; stable example links.
  - Add "Checking, showing and sharing a change", and "Making a change real".
  - Setup: run `npm run playwright:install` once; what to do if port 3103 is in use.
  - Replace "Ask if you're not sure" with pointers to the skills and `docs/designers/`.
- **docs/designers/README.md**: the index of every designer doc (owned by the other
  deliverables), in the order of the loop, with "Start here: your first hour".
- **overrides.json**:
  - `ours` gains: `CLAUDE.md`, `AGENTS.md`, `.claude/skills/**`, `.claude/rules/**`,
    `.claude/workflows/**`, `docs/designers/**`, `scripts/designer/**`,
    `src/server/prototype-checks/**`, `src/server/prototype-data/**`,
    `src/server/prototype-services/**`, `fit/designer-sets.fit.spec.js`, `handoffs/**`.
  - `patched`: update the `why` for `package.json` (the `designer:*` block),
    `src/server/app/services/{address-book,ports,countries}/index.js` (they also merge the
    `src/server/prototype-data` overlay rows after the stub rows) and
    `src/server/app/co-residency.test.js` (the chooser's `/examples/{setId}/{example}` joins
    the root surface).
  - Keep `scripts/new-set/**`, `src/server/prototype-seed/**`, `src/server/prototype-sets/**`
    and the sets-index globs as they are.
- **package.json**: one block straight after `"new:set"`:

  | Script | Runs | From |
  |---|---|---|
  | `designer:where` | `node scripts/designer/where/cli.js` | D2 |
  | `designer:check` | `node scripts/designer/check/cli.js` | D3 |
  | `designer:preflight` | `node scripts/designer/preflight/cli.js` | D4 |
  | `designer:show` | `node scripts/designer/show/cli.js` | D4 |
  | `designer:release` | `node scripts/designer/release/cli.js` | D5 |
  | `designer:examples` | `node src/server/prototype-seed/cli/index.js` | D6 |
  | `designer:words` | `node scripts/designer/words/cli.js` | D7 |
  | `designer:research` | `node scripts/designer/research/cli.js` | D11 |
  | `designer:handoff` | `node scripts/designer/handoff/cli.js` | D12 |

- **scripts/designer/suite.test.js** (vitest):
  - Every file under the suite globs classifies as `ours` through
    `scripts/sync-upstream/rules.js`.
  - Every `.claude/skills/<name>/SKILL.md` has `name` equal to its folder and a description
    containing "Use when" and "NOT for".
  - Every skill appears in the CLAUDE.md routing table and in PROTOTYPE.md.
  - Every `designer:*` script points at a file that exists.
  - No file under `CLAUDE.md`, `AGENTS.md`, `PROTOTYPE.md`, `docs/designers/`, `.claude/`
    mentions `trade-imports-workspace`, `tim `, `tools/` or `openspec`.
- **.claude/workflows/** shared pieces:
  - `README.md`: how to launch a workflow (always by `scriptPath`), the args contract, the
    `MODELS` constant, and the fallback (each workflow's skill describes the same steps run
    one after another, for hosts without the Workflow tool).
  - `design-session.js` (SF): args `{ set, requests: string[] }`, no defaults.
    1. One `judge` agent classifies each request to a skill and target pages, and refuses a
       frozen release or `high-risk-plants`.
    2. Serial, one request at a time: a `builder` agent follows the named skill's SKILL.md,
       then a `runner` runs `designer:check`. A failure gets one repair, then the request is
       parked with a plain reason.
    3. A `runner` runs `designer:show -- --set <set> --pages changed --before` for the
       session. A summary lists what landed, what was parked and why.
    4. Each landed request is committed separately with `share-my-change`'s message rules.
       It never pushes.
  - Every workflow script starts with a `MODELS` constant
    (`{ runner, builder, judge }`), the single place to point steps at Fable or any other
    model. Default: a small model for `runner`, a mid model for `builder`, the strongest
    for `judge`. The builder confirms which model names the Workflow tool accepts.
  - `args-contract.test.js`: every `.claude/workflows/*.js` carries the same args-contract
    block (`parseArgs`, `requireKeys`, `logResolvedConfig`, no defaults), and a missing key
    stops before any agent.
- **Settings proposal (workarea side, not in the repo):** rewrite
  `workareas/shared/designer-prototyping/settings-proposal.json`, replacing today's
  "add to deleted" idea:
  - `proposed_overrides_json_change`: add `.claude/settings.json` to `ours`.
  - `proposed_settings_json`:
    - No Sonar hooks.
    - A `PreToolUse` hook on `Edit|Write|NotebookEdit` running
      `node scripts/designer/hooks/guard-edit.js` (D2).
    - `permissions.allow`: `Bash(npm run designer:*)`, `Bash(npm run dev)`,
      `Bash(npm run format)`, `Bash(npm run lint)`, `Bash(npm test)`,
      `Bash(npm run test:high-risk-plants)`, `Bash(npm run test:fit:*)`,
      `Bash(npm run new:set:*)`, `Bash(npm run playwright:install)`,
      `Bash(npx --yes npm@11.6.2 ci)`, `Bash(git status)`, `Bash(git diff:*)`,
      `Bash(git log:*)`, `Bash(git show:*)`, `Bash(git add:*)`, `Bash(git commit:*)`,
      `Bash(git switch:*)`, `Bash(git revert:*)`, `Bash(git restore:*)`,
      `Bash(git stash list)`, `Bash(gh pr view:*)`.
    - `permissions.ask`: `Bash(git push:*)`, `Bash(gh pr create:*)`.
    - `permissions.deny`: `Bash(git push --force:*)`, `Bash(git push -f:*)`,
      `Bash(git reset --hard:*)`, `Bash(npm install:*)`.
- **Acceptance:**
  - `npm test` passes, including `suite.test.js`, `args-contract.test.js` and
    `scripts/sync-upstream/overrides.test.js`.
  - `npm run lint` and `npm run format:check` pass.
  - `npm run designer:where -- src/server/app/sets/high-risk-plants/set.js` prints the
    "belongs to the real service" line.
  - PROTOTYPE.md no longer says a sync PR merges itself.
  - A 3-request `design-session` dry run on a scaffolded release lands 3 commits or parked
    entries plus one gallery.

### D2 `sync-guard-rails` (script)

**Owns:** `scripts/designer/lib/**`, `scripts/designer/where/**`,
`scripts/designer/hooks/**`, `.claude/rules/ownership.md`, `.claude/rules/designer-sets.md`,
`docs/designers/where-changes-go.md`, `docs/designers/glossary.md`

Build first: every other deliverable imports `scripts/designer/lib/`.

- **`scripts/designer/lib/`** (shared library, tested):
  - `ownership.js`: `ownerOf(path)` returns `'yours' | 'shared-on-purpose' | 'real-service' |
    'removed'`, using `classifyPath` and `matchesAnyGlob` from
    `scripts/sync-upstream/rules.js` and the literal `patched` list, so "shared on purpose"
    means declared in `patched`, not "anything else". `explainOwner(path)` returns one
    plain sentence plus the safe alternative. Also returns `{ setId, isRelease, frozen }`.
  - `sets.js`: `listSets()` (from `src/server/app/sets/*/set.js`), `setDir(id)`,
    `releaseInfo(id)` (reads `sets/<id>/release.json`, or returns
    `{ kind: 'real-journey' }` for high-risk-plants and `{ kind: 'placeholder' }` for
    sample-journey), `setOfPath(path)`, `defaultSet()` (the most recently changed working
    release, or null).
  - `flow.js`: `pagesOf(setId)` (imports the set's `journeys/linear/flow/flow.js`
    `sections` export and returns `[{ sectionId, id, slug, feature }]`),
    `featureOfPath(path)`, `pagesForChangedPaths(paths)` (shared copy, captions or layout
    means every page of that set; hub, dashboard, check answers and confirmation are
    handled by name; outside a set means none).
  - `git.js`: thin wrappers over `git` with `execFile` (changed and untracked paths,
    current branch, rev-parse). No shell strings.
- **`designer:where -- <paths…> [--changed] [--json]`**: one line per path, one of:
  - "Yours: safe to change. The weekly update never touches it."
  - "Shared with the real service and changed on purpose here: change with care, and say
    why in overrides.json."
  - "Belongs to the real service: the weekly update will clash with your change. Make it
    in your design release, or hand it to the real team."
  - "Removed by the weekly update: never edit."
  - A frozen release gets: "This is a frozen release. Start a working release from it
    instead."
  - `--changed` reports every path in `git status`. Exit code 0 always: it is advice.
- **`scripts/designer/hooks/guard-edit.js`** (activated only when Sam applies the settings
  proposal): reads the PreToolUse JSON on stdin and decides by path and current branch:
  - allow `ours` paths, except a frozen release (block with the "frozen" sentence)
  - allow everything on `handoff/*` and `maintain/*` branches
  - allow `patched` paths with a warning on stderr
  - block anything else with exit code 2 and a message naming the file, its owner, and the
    two safe routes
  - never block reads, and fail open (exit 0) if it cannot parse its input
- **`.claude/rules/ownership.md`** (`paths:` the upstream-owned globs:
  `src/server/app/sets/high-risk-plants/**`, `src/server/app/routes-high-risk-plants.js`,
  `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**`, `src/client/**`,
  `webpack.config.js`, `vitest.config.js`, `fit/**`): "Stop. This belongs to the real
  plants service. Run `designer:where`, then do it in a design release or prepare it with
  `hand-off`."
- **`.claude/rules/designer-sets.md`** (`paths: src/server/app/sets/**`,
  `src/server/app/routes-*.js`): a set never imports another set (`set-isolation`); keep
  `TEMPLATES` and `SET_ID` as generated; when a required field changes, update the
  release's `flow/fixtures/happy-path.json`; never add a route at the server root.
- **docs:** `where-changes-go.md` (the four verdicts, a picture of the folder tree coloured
  by owner, what the weekly update really does, what "needs-person" means) and
  `glossary.md` (set, design release, working/frozen/research release, example, example
  link, check, show, gallery, hand-off, weekly update, upstream, `needs-person`, Welsh
  needed, design gap).
- **Acceptance:** tests for `ownerOf` (one path per owner, a frozen release, a declared
  patched path, an undeclared upstream path), `pagesForChangedPaths` (fixture diffs), and
  the hook (sample stdin for all four owners, frozen, both branch kinds, unparsable input).

### D3 `check-my-change` (skill + script)

**Owns:** `.claude/skills/check-my-change/**`, `scripts/designer/check/**`,
`src/server/prototype-checks/**`, `docs/designers/checks-and-errors.md`

- **`designer:check -- --set <id> [--quick|--full|--walk] [--json]`**:
  - **quick** (default, target under 30 seconds on a clean release):
    1. `prettier --write` on changed files (reported, not silent).
    2. The ownership report of changed paths (D2).
    3. Copy shape for the set: en and cy key trees and function arity match, no empty
       strings, no Welsh leaf equal to its English leaf unless it carries the
       `[Welsh needed]` marker; the markers are counted and listed.
    4. Every `.njk` in the set compiles with nunjucks.
    5. vitest on `src/server/prototype-checks` for this set, and for high-risk-plants,
       `test:high-risk-plants`.
  - **full**: quick, plus `npm run lint` and `npm test`: exactly what the pre-commit hook
    runs, so a commit after a green full never fails.
  - **walk**: full, plus `npm run test:fit:journeys` (the chooser spec and every release's
    walk from D4).
  - Output: a plain-English pass/fail table. The raw log goes to
    `.cache/designer/check/<timestamp>.log` and its path is printed.
- **`translate.js`**: a table of failure signatures, each with a plain cause, the fix, and
  the skill that fixes it. It covers: Prettier diffs; `copy-parity`, `copy-convention`,
  `contract.test`; `no-orphans`, `set-isolation`; `obligation-purity`, "collected by no
  page", "owned by no feature", "must import its obligation object"; "Example '<label>'
  stopped at <slug>"; `EADDRINUSE`; "Executable doesn't exist"; "No set context … 2 sets
  are mounted"; a webpack 404. Failures in files the change did not touch are reported as
  "not caused by your change: tell the maintainer", never hidden.
- **`src/server/prototype-checks/`**:
  - `copy-shape.test.js`: the copy-shape rules above for every release (high-risk-plants
    is already covered by upstream's parity tests).
  - `release-render.test.js`: for every mounted release, boot the server in process, seed
    one draft through the real routes, and `server.inject` a GET of every `flow.js` page.
    Each must answer 200 (or a designed redirect) and not the error template.
- **Skill `check-my-change`**: triggers "check my changes", "did I break anything", "is it
  ready", "why won't it start", "what does this error mean". NOT for making changes. Picks
  the tier from what changed (copy only: quick; templates: quick; flow or model: full;
  before sharing: full). Explains each failure, offers the fixing skill, self-repairs at
  most 3 times, then stops and explains.
- **docs:** `checks-and-errors.md`: the three tiers, what the pre-commit hook runs, and
  every translated error with its fix.
- **Acceptance:** `translate.test.js` has one fixture per signature; `--quick` on a clean
  release passes; a release with a missing Welsh key fails `--quick` with the plain fix;
  a commit made after a green `--full` passes the husky hook first time.

### D4 `see-and-show` (skills + script)

**Owns:** `.claude/skills/run-the-prototype/**`, `.claude/skills/show-my-change/**`,
`scripts/designer/show/**`, `scripts/designer/preflight/**`,
`fit/designer-sets.fit.spec.js`, `docs/designers/your-first-hour.md`,
`docs/designers/seeing-your-change.md`

- **`designer:preflight`**: Node version against `.nvmrc`; `node_modules` present; the
  Playwright Chromium present; port 3103 free, or which process holds it. It never kills
  anything.
- **Skill `run-the-prototype`**: triggers "run the prototype", "start it", "open the X
  page", "it won't start", "port in use", "where did my data go". Steps: preflight; if
  needed `npx --yes npm@11.6.2 ci` and `npm run playwright:install`; start `npm run dev` in
  the background and wait for the start line or an error; print the chooser, the set and
  the example links (`designer:examples -- links <set>`, D6). Explain once per session:
  saving a file restarts the prototype; releases keep their data in development;
  high-risk-plants examples come back with Reset; how to sign in as another organisation.
  If the port is in use, say "it is probably already running" and ask before stopping
  anything.
- **`designer:show -- --set <id> [options]`**:

  | Option | What it does |
  |---|---|
  | `--pages changed\|all\|<slugs>` | Default `changed`: `pagesForChangedPaths` over changed and untracked files. |
  | `--before` | Also render the committed version: `git archive HEAD` into `.cache/designer/base-<sha>/` with `node_modules` symlinked, built once and cached by sha. The working tree is never touched (no stash). |
  | `--errors` | Also submit each form empty and capture the error state when an error summary appears. |
  | `--mobile` | Also capture at 320 px wide. |
  | `--reference <slug>=<image>` | Put a Figma frame or screenshot beside that page. |
  | `--compare <set>` | Pair the same slugs from another set (for example this release against high-risk-plants). |
  | `--video` | Record the whole happy path at slow motion 600 ms into `walk.webm`. |
  | `--open` | Open the gallery in the browser when done. |

  - How it runs: build client assets only if `.public` is older than `src/client`; start
    its own server (`NODE_ENV=development`, `STUB_MODE=true`, `PROTOTYPE_SEED=false`) on a
    free port from 3203, never the designer's 3103; drive it with the `@playwright/test`
    library API (Chromium); sign in at `/auth/stub-sign-in`; reach each page by POSTing the
    set's `happy-path.json` steps with the crumb through a request context that shares the
    page's cookies (the same route the seed takes); screenshot full page; run
    `@axe-core/playwright` with the WCAG 2.2 AA tags; also capture the dashboard with data,
    check your answers and confirmation.
  - Output: `.cache/designer/show/<set>/<timestamp>/` with PNGs, `manifest.json`,
    `axe.json`, optional `walk.webm`, and `index.html`: a static gallery styled with GOV.UK
    classes showing before/after or reference pairs, states, axe findings in plain words,
    the changed files, the page links, and "Pages no example reaches (add them to the
    example's route)". `.cache/designer/show/<set>/latest` points at the newest run.
- **Skill `show-my-change`**: triggers "show me", "screenshot my pages", "what does it look
  like", "before and after", "compare with the Figma", "compare with the real journey",
  "record a walkthrough", "make a review pack". NOT for checking. Runs show, reads the key
  PNGs and describes differences in plain English, gives the gallery path, and offers the
  gallery for the PR (`share-my-change`). Where the host can publish a private page, it
  offers that too.
- **`fit/designer-sets.fit.spec.js`**: for every release with a `happy-path.json`, walk
  each scenario to confirmation with axe on every page. It sits in the `journeys` project
  (`fit/**/*.fit.spec.js`), so every PR's `frontend-playwright-report` artifact carries a
  walk video per release, and the sync robot's set boot check covers releases.
- **docs:** `your-first-hour.md` (install, run, sign in, reset, your first design release,
  your first word change, show it, share it) and `seeing-your-change.md` (show options,
  reading the gallery, the PR artifact video).
- **Acceptance:** tests for option parsing, manifest and gallery generation from fixtures;
  a real run on high-risk-plants `--pages arrival-details --errors --mobile` gives 3 PNGs
  and an index; a run on a scaffolded release works; `--before` after a one-hint change
  gives a before/after pair; `git status` is identical before and after a run; a running
  `npm run dev` on 3103 is undisturbed.

### D5 `design-release` (skill + script)

**Owns:** `.claude/skills/design-release/**`, `scripts/new-set/**`,
`scripts/designer/release/**`, `src/server/prototype-sets/**`, `src/server/sets-index/**`,
`src/server/app/sets-index/**`, `src/server/app/co-residency.test.js`,
`fit/sets-chooser.fit.spec.js`, `.github/workflows/check-pull-request.yml`,
`docs/designers/design-releases.md`

Build after D6 and D10 (it registers their pieces).

- **`new:set` changes** (all in `ours`):
  - When `--from` is not `sample-journey`, skip `**/*.test.js`, `**/*.fit.spec.js`,
    `**/fit/**`, `journeys/linear/test-support.js` and anything only tests import,
    `spec/**` and `docs/**`, and list what was skipped. Keep
    `flow/fixtures/happy-path.json`. Write a one-line `docs/README.md` that points at the
    source set's docs.
  - `--describe "<blurb>"` writes the `descriptions.js` entry; without it, a dated
    placeholder ("Copy of high-risk-plants made 27 September 2026").
    `descriptions.test.js` then fails for any mounted set with no description.
  - `--purpose working|frozen|research` (default `working`) and `--from <any set>`, so a
    release can be made from another release.
  - Write `sets/<id>/release.json`:
    `{ id, from, fromCommit, upstreamCommit, createdAt, purpose, frozen, description, uuidMap }`.
    `upstreamCommit` is `git merge-base HEAD upstream/main` when the remote exists, else
    null. `transformContent` reports its UUID substitutions for `uuidMap` (fallback: pair
    UUIDs by file and position).
  - Inject the D10 records adapter into the new `routes-<id>.js` when the template is not
    `sample-journey`.
  - Print plain next steps (the URL, Reset, `designer:show`); drop the stale "replace
    features/welcome" line for non-sample templates.
  - Regression test: scaffold `--from high-risk-plants` into a temp tree and assert no tests
    or specs copied, blurb and `release.json` exist, ids rewritten, and `uuidMap` covers
    every obligation.
- **`designer:release -- list|freeze|carry|retire`**:
  - `list`: id, purpose, made from, made on, frozen, research mode, number of design gaps.
  - `freeze <id> [--as <new-working-id>]`: marks `<id>` frozen and makes a new working
    release from it.
  - `carry --from <a> --to <b> [--commit <sha>|--working]`: takes the change inside
    `sets/<a>/`, rewrites ids (and UUIDs through both `uuidMap`s), and applies it to
    `sets/<b>/` with `git apply --3way`. Refuses a frozen target and `high-risk-plants`
    (sends the designer to `hand-off`).
  - `retire <id>`: refuses `high-risk-plants` and `sample-journey`; `git rm -r` the folder
    and `routes-<id>.js`; removes the mount lines, the description, the two `ours` globs,
    and `prototype-seed/scenarios/<id>.js`; prints what it removed. (It edits
    `overrides.json` at run time; ownership of that file only applies to the build.)
- **Chooser** (`sets-index`): each row shows a GOV.UK tag ("Real journey, updates
  weekly", "Working release", "Frozen", "Research", "Placeholder"), "Made from X on
  date", a "Research mode on" tag when `sets/<id>/research-mode.md` exists, and the set's
  example links (`listExamples(setId)` from D6). Order: real journey, working, research,
  frozen, newest first in each group.
- **Stable example links:** `GET /examples/{setId}/{example}` in `sets-index` resolves the
  example's current journey through D6's `findExample()` and redirects to the page it stopped
  at, seeding first if needed. Update `co-residency.test.js` (patched) to include it.
- **CI release canary** in `check-pull-request.yml` (ours), after the unit tests: scaffold
  `ci-release-canary --from high-risk-plants`, run `npm test` and the chooser spec, then
  discard in the CI job only. This proves on every PR that forking still works after the
  weekly sync.
- **Skill `design-release`**: triggers "start a new design release", "freeze this
  release", "make a working copy of the journey", "make a research version", "copy this
  change to release X", "retire release X", "which releases are there". NOT for editing
  pages (the change skills) or example data (`example-data`).
  1. Ask for, or infer, the purpose and a plain name; suggest an id with a `plants-` prefix
     (`plants-dr2`, `plants-working`, `plants-research-oct`).
  2. Run `npm run new:set -- <id> --from high-risk-plants --describe "…" --purpose …`,
     then `npm run format`.
  3. `designer:check -- --set <id> --full`.
  4. `designer:show -- --set <id> --pages all` as the release's starting gallery.
  5. Commit "Start design release <id> from high-risk-plants" (with `share-my-change`'s
     rules).
  6. Tell the designer: "Everything in `sets/<id>/` is yours. It is a snapshot of the real
     journey today and will not pick up the real team's later changes. To pick them up,
     start a fresh release and carry your changes across."
- **docs:** `design-releases.md`: purposes, freeze, carry, retire, keep live releases to
  a handful, what a snapshot means.
- **Acceptance:** `new:set` tests pass; a manual `--from high-risk-plants` scaffold passes
  `npm run lint` (no orphans), `npm test` (no "2 sets are mounted") and
  `npm run test:fit:journeys`; the chooser shows tags and example links; retire leaves
  `git status` with only the deletions and no stray globs; `carry` of a one-hint change
  between two releases applies cleanly.

### D6 `example-data` (skill + script)

**Owns:** `.claude/skills/example-data/**`, `src/server/prototype-seed/**`,
`src/server/prototype-data/**`, `src/server/app/services/address-book/index.js`,
`src/server/app/services/ports/index.js`, `src/server/app/services/countries/index.js`,
`.claude/rules/prototype-seed.md`, `docs/designers/example-data.md`

- **Seeding for any set:** `seederFor(setId)` looks for
  `prototype-seed/scenarios/<setId>.js`, then falls back to the default four scenarios when
  the set has `journeys/linear/flow/fixtures/happy-path.json`, else none.
  `seed-high-risk-plants.js` becomes `seed-set.js` taking `SET_BASE` from the set.
  `scenarios.js` becomes `scenarios/high-risk-plants.js`.
- **Scenario grammar**, checked at load with plain-English errors:
  `{ label, slug, fixture: '<name>' | { file, name }, through?: '<page slug>',
  answers?: { '<page slug>': { field: value } }, submit?, amend?, cancelAmend?, delete?,
  copy?, organisationId? }`.
  - `slug` is the stable example id used in example links.
  - `answers` overrides single fields over the fixture (vary the consignor or the port
    without a new fixture).
  - `submit`, `amend`, `cancelAmend`, `delete`, `copy` post the real feature routes (read
    `delete-notification`, `cancel-amend` and the copy route before building).
  - `through` stops at a page.
  - Kinds that must work: late (arrival date in the past, from the late fixture), deleted,
    copied, amendment cancelled, another organisation.
- **Plain failures:** when a replayed step does not redirect, read the GOV.UK error
  summary and throw "Example '<label>' stopped at <slug>: the page said '<message>'". The
  seed never writes to the store directly.
- **Organisations:** `adopt-known-journeys.js` adopts only examples whose `organisationId`
  (default the shared example organisation) matches the session's organisation. Docs give
  `/auth/stub-sign-in?organisationId=<org>`.
- **Named fixtures:** `prototype-seed/fixtures/<set>/<name>.json` layered over the set's
  happy path, so designers never edit an upstream fixture.
- **Overlay:** `src/server/prototype-data/{_all,<set-id>}/{parties,ports,countries}.json`
  and `index.js` exporting `extraParties()`, `extraPorts()`, `extraCountries()` for the
  active set (confirm the accessor name in `shared/set-context.js`). Each of the three
  already-patched `services/*/index.js` seams gains one line appending overlay rows after
  the stub rows. Rows are validated against the stub row shapes. The docs note that an
  extra country is still refused for constrained commodities, as in the real service.
- **`designer:examples -- list|check|links <set>`:** `list` labels, states and stop
  pages; `check` seeds in process and reports each example as reached or "stopped at";
  `links` prints each example's stable link. Exports `listExamples(setId)` and
  `findExample(setId, slug)` for D5.
- **`.claude/rules/prototype-seed.md`** (`paths: src/server/prototype-seed/**`,
  `src/server/prototype-data/**`): examples always replay real pages; field names come
  from the set's fixture and controllers; never hand-write records.
- **Skill `example-data`**: triggers "add an example", "show a late / submitted / amended /
  deleted / copied notification", "an example stopped at the X page", "a link straight to
  the X page", "more addresses in the address book", "add a trader / consignor / port /
  country", "fill the dashboard", "another organisation". NOT for changing what a page asks
  (`change-the-journey`). Steps: `designer:where`; edit scenario, fixture or overlay;
  `designer:examples -- check <set>`; `designer:check`; tell the designer to press Reset;
  `designer:show -- --pages dashboard,<stop page>`; print the example links. Hand-off: a
  new party or port the real team needs goes in the brief as test-data rows.
- **docs:** `example-data.md`.
- **Acceptance:** tests for grammar validation, `seederFor`, each new kind through
  `server.inject` on the real routes, organisation-scoped adoption, overlay order; a
  scaffolded release shows its examples on first visit and after Reset; a late example
  renders its late state on the dashboard; `overrides.test.js` passes.

### D7 `change-the-words` (skill + script + workflow)

**Owns:** `.claude/skills/change-the-words/**`, `.claude/rules/copy.md`,
`scripts/designer/words/**`, `.claude/workflows/wording-sweep.js`,
`docs/designers/wording-and-welsh.md`

- **`designer:words -- find "<text>" [--set <id>] [--json]`**: imports the copy modules and
  reports every matching leaf (string or function source): set, page (slug from
  `flow.js`), feature, key path, file:line, English and Welsh. Also: section captions, the
  hub, check-your-answers labels (which import other features' copy), shared chrome
  (flagged "shared by every set: this is a real-service change"), literal strings in
  `.njk` (flagged "should be copy"), and, for high-risk-plants only, the tests and specs
  that pin the text.
- **`designer:words -- report <set>`**: writes `.cache/designer/words/<set>/index.html`, a
  side-by-side English and Welsh table per page with `[Welsh needed]` highlighted. This is
  the only way to review Welsh until the real service wires a language switch.
- **Skill `change-the-words`**: triggers "change the wording", "reword", "rename X to Y
  everywhere", "change the hint / label / error message / button / caption", "apply these
  content changes", "content sweep", "show me the Welsh". NOT for adding a question
  (`change-the-journey`) or layout (`match-the-design`).
  1. Resolve the set (default `defaultSet()`); `designer:where`. For high-risk-plants,
     offer the working release (default) or the upstream-bound route.
  2. `designer:words -- find`.
  3. Show a plan table (page, key, old, new). Exclude other releases unless the designer
     said "everywhere". Confirm once only when the sweep spans more than one page.
  4. Edit English; edit Welsh with the designer's Welsh or the `[Welsh needed]` marker;
     keep key trees and function arity.
  5. Offer GOV.UK style-guide suggestions from `.claude/rules/copy.md`; never override the
     designer's words.
  6. Upstream-bound only: update pinned literals in `copy.test.js`, `controller.test.js`,
     the section-captions test and specs; run `test:high-risk-plants` then `npm test`.
  7. `designer:check`, then `designer:show -- --pages changed` (with `--errors` for error
     messages), then the hand-off line.
  - More than 5 pages, or a pasted content document: run `wording-sweep.js`.
- **`wording-sweep.js`**: args `{ set, sweeps: [{ find, replace, scope }], welsh:
  'mark'|'given', welshText }`, no defaults. Phases: locate (`runner`: `words find
  --json`) → plan (`judge`: group edits by feature folder, flag function leaves) → edit
  (`builder` agents in parallel, at most 6, one per feature folder, so file sets are
  disjoint, en and cy only) → verify (`runner`: `designer:check`, one `builder` repair
  loop, at most 3) → show (`runner`). Returns a table: page, before, after, Welsh needed.
  Refuses high-risk-plants and frozen releases.
- **`.claude/rules/copy.md`** (`paths: **/copy/copy.en.js`, `**/copy/copy.cy.js`): change
  en and cy together; keep key and arity parity; no empty strings; the marker in releases;
  GOV.UK style essentials (sentence case, plain English, active voice, no "please", dates
  as "27 September 2026", numbers, error-message patterns). Self-contained: no links out of
  the repo.
- **docs:** `wording-and-welsh.md`: where words live, why Welsh matters, the marker, the
  report.
- **Acceptance:** tests for find and report on fixtures; a dry run in a release renames
  "Consignment parties" in English and Welsh with the marker and `--quick` passes; an
  upstream-bound dry run on high-risk-plants updates the pinned tests and `npm test`
  passes; a shared-chrome request is refused with an explanation and a gap entry.

### D8 `match-the-design` (skills + workflow)

**Owns:** `.claude/skills/match-the-design/**`, `.claude/skills/port-a-kit-page/**`,
`.claude/workflows/port-kit-page.js`, `.claude/rules/templates.md`,
`docs/designers/gov-uk/**`

- **Skill `match-the-design`**: triggers "make this page match the design / Figma", "move
  this above", "change the spacing", "make it wider", "make it a table / summary list /
  cards / tabs", "add a tag / inset / warning", "custom dropdown", "change the header or
  navigation". NOT for wording (`change-the-words`) or page order (`change-the-journey`).
  - Input: a page (slug or `:3103` URL) and a reference (Figma PNG, screenshot, or words).
  1. `designer:where` on the template.
  2. `designer:show -- --pages <slug> --reference <slug>=<image>` for the starting pair.
  3. List every visible difference as a row.
  4. Map each row with `references/figma-to-govuk.md` (spacing to the `govuk-spacing` scale
     and `govuk-!-margin/padding-*`; type to `govuk-body-s|l` and `govuk-heading-*`; widths
     to `govuk-!-width-*` and the grid; colour only to a tag colour or GOV.UK colour) and
     `references/components-we-have.md`.
  5. Edit the template only, plus copy for new text.
  6. What the toolbox cannot do goes in `sets/<id>/design-gaps.md` (page, what the design
     wants, the closest option built, why, the frame). Header and navigation always go
     here: `layout.njk` is shared by every set and owned by the real service.
  7. Re-run show with the reference; report new axe findings in plain words; the hand-off
     line (gaps travel with the brief).
- **Skill `port-a-kit-page`**: triggers "re-create this page from the old prototype", "port
  the GB notification page for X", "build this Prototype Kit page here". Input: a Kit
  `.html` view (pasted or a path), a Heroku URL, or a screenshot; the target release; where
  it sits. Runs `port-kit-page.js` (or the same steps in turn):
  1. Inventory (`judge`): headings, components, strings, fields, conditional reveals,
     `.app-*` classes, links, recorded as JSON; classify the page as static,
     data-collecting or list.
  2. Build (`builder`): template and copy pair with the Welsh marker; register the page
     through `change-the-journey` (static or data-collecting) or `fake-a-service` (lists
     and lookups).
  3. Check (`runner`). 4. Show (`runner`, with the original as `--reference`).
  5. Fidelity review (`judge`): every difference is matched, nearest GOV.UK equivalent, or
     a design gap.
  - A fixture Kit page lives in `references/examples/` for acceptance.
- **`references/`** (in `match-the-design`): `figma-to-govuk.md`; `components-we-have.md`
  generated from the installed `govuk-frontend` and `@ministryofjustice/frontend`
  (with versions) and what `src/client` initialises, each with a file that already uses
  it; `layout-patterns.md` (two-thirds, summary cards, task list, MoJ filter layout,
  dashboards); `nearest-equivalent.md` (the old prototype's bespoke patterns: custom
  select → `govukSelect` or accessible-autocomplete; modal → confirm page; cards →
  summary card; filter panel → MoJ filter; glance counts → summary cards or tags; sticky
  bars → none; IPAFFS-style chips → tags plus a gap entry).
- **`.claude/rules/templates.md`** (`paths: src/server/app/sets/**/*.njk`): macros before
  raw HTML; no inline `style` (CSP blocks it); only `govuk-*`/`moj-*` classes; no literal
  visible strings; keep `crumb`, `concurrencyToken`, `sectionCaption` above the h1, one
  h1, headings in order, the error summary include; keep `name`, `id` and error keys
  identical; in high-risk-plants, do not change roles or labels FIT locators use.
- **`docs/designers/gov-uk/`**: components, patterns, styles, accessibility, language,
  service design (self-contained GDS summaries) and `templates-in-this-prototype.md`
  (layout, `sectionCaption`, `saveActions`, crumb, error summary).
- **Acceptance:** a dry run turns "reduce the gap under the heading to 10px and make the
  status blue" into `govuk-!-margin-bottom-2` and `govuk-tag--blue` with no `.scss`
  touched; a bespoke-colour ask is built as the closest option plus a gap row;
  `npm run lint:scss` is unchanged; the fixture Kit page ports to a release page that
  boots, with a fidelity table.

### D9 `change-the-journey` (skill)

**Owns:** `.claude/skills/change-the-journey/**`, `docs/designers/recipes/**`

- A port of steps 1 to 4 of the workspace `frontend-change` skill (route, baseline, recipe
  verbatim, ladder), with the set as an input, repo-relative paths, no spec step, and
  designer-facing output.
- Triggers: "add a question / field", "add a page", "add a guidance page", "add a list of
  things (add another)", "move this page", "only show this page when", "skip this page
  if", "regroup / rename the task list", "reorder check your answers", "change the
  confirmation page". NOT for wording only, layout only, dashboards and shared features,
  or research mode.
- Route table (`references/routes.md`) to either:
  - an upstream recipe, read-only from `src/server/app/sets/high-risk-plants/docs/`
    (releases do not carry `docs/`), with the release id substituted: add-a-field,
    add-a-page, add-a-section, add-a-collection, journey-flow-and-gates, obligation-model;
  - a designer recipe in `docs/designers/recipes/`: `guidance-page.md` (`collects: []`,
    modelled on the sample-journey welcome), `move-a-page.md` (flow.js, `RUN_STEPS`, task
    rows, every place a page id is registered), `add-a-branch.md` (an `applyTo` gate; the
    engine skips the page and clears the answer), `task-list.md` (hub `GROUPS`, rows,
    captions), `check-answers.md` (`answerRow`, `scopedRows` order and labels),
    `confirmation-variant.md`, `validation-rules.md` (the `lib/validate` factories and
    error messages). Each has: when to use it, the files in a release, steps, what you will
    see, how to check it, hand-off notes.
- `references/page-id-places.md` and `references/errors-explained.md` (each boot refusal
  mapped to the missed step, using D3's translator).
- Release mode: follow the recipe but skip steps that create `*.test.js` or
  `*.fit.spec.js`; boot guards still apply. When a required field changes, update the
  release's `happy-path.json` and run `designer:examples -- check`. Upstream-bound mode
  (on `handoff/*`): the full recipe with tests and the ladder from the set's
  `testing.md`.
- One change per run; self-repair at most 3 times, then explain and offer undo.
- Verify: `designer:check -- --full` (boots); `designer:show -- --pages changed --errors`;
  for flow changes `--pages all`, and for a branch, two examples (with and without) shown
  side by side.
- Hand-off: the recipe name goes in the commit message and the brief.
- **Acceptance:** in a scaffolded release, each boots with `--full` green and the walk
  shows the change: a yes/no question with a branch to a new page; moving
  place-of-destination before consignor; a guidance page; renaming a task-list group;
  refusal on high-risk-plants outside a `handoff/*` branch.

### D10 `fake-a-service` (skill + script)

**Owns:** `.claude/skills/fake-a-service/**`, `src/server/prototype-services/**`,
`docs/designers/services-and-dashboards.md`

- **`prototype-services/records/`**: `designerRecords(setId, records, opts)` wraps the
  upstream stub records store for releases (D5 injects it through `configureRecords` in
  the release gateway):
  - `list` gains optional `status`, `commodity`, `late`, `dateFrom`, `dateTo`, `tab`
    filters and `counts()`; the upstream `list()` contract is kept.
  - Development only: write-through to `.cache/designer/data/<setId>.json`, restored on
    boot, so a release's data survives a restart.
  - Placement risk: if `lint:arch` or `set-isolation` refuse the import from
    `routes-<id>.js`, move to `src/server/app/prototype-services/` (then that path goes in
    `ours` via D1) and record the decision in the docs. If persistence cannot be done
    without an upstream change, drop it and say so in PROTOTYPE.md; stable example links
    (D5/D6) still hold.
- **Service pattern:** `prototype-services/<name>/{index.js, data.json, index.test.js}` with
  `search(orgId, { query, page })` returning `{ results, total, page, totalPages, pageSize }`
  (the address-book picker's contract). Clear hook so Reset clears it. Worked examples:
  `transporters` (removed upstream on purpose) and `templates` (save a notification as a
  template; start from one).
- **Skill `fake-a-service`**: triggers "add a transporter lookup", "saved transporters",
  "templates", "fake a service", "add filters / tabs / counts to the dashboard", "a
  success banner after …", "confirm before deleting", "come back to where I was", "a home
  page across plants, animals and products". NOT for data the stubs already serve
  (`example-data`) or changing a question (`change-the-journey`).
  - References: `fake-a-service.md`, `dashboard-filters-and-tabs.md` (query parameters in
    the release's dashboard controller, MoJ filter or `govukTabs`, counts),
    `success-banner.md` (the dashboard's existing "deleted" flash), `confirm-then-act.md`
    (modelled on `delete-notification`), `come-back-to-where-i-was.md` (engine return
    targets and the address-book picker), `service-home.md` (a set made from
    sample-journey as a cross-commodity front door, linking to other sets; the real one
    belongs to ins-frontend, which the brief must say).
  - Guard rails: only in releases the designer owns; never a route at the server root;
    every fake is named in the brief as "needs a real service".
  - Verify: `designer:check -- --full`; Reset clears the fake;
    `designer:show -- --pages dashboard,<new pages>` in empty, filtered and error states.
- **docs:** `services-and-dashboards.md`.
- **Acceptance:** tests for the wrapper filters and counts, persistence round trip, clear
  hook, `transporters` and `templates`; a release dashboard status filter with counts works
  end to end in show; high-risk-plants behaviour unchanged (`test:fit:journeys` green).

### D11 `research-session` (skill + script)

**Owns:** `.claude/skills/research-session/**`, `scripts/designer/research/**`,
`docs/designers/research-sessions.md`

- Triggers: "get ready for research", "research session", "user testing next week", "let
  participants through", "turn errors off / on", "reset between participants", "print a
  sheet for the session". NOT for a permanent design change.
- Steps:
  1. Make or pick a research release (`design-release`, id `plants-research-<topic>-<yyyymm>`,
     purpose `research`).
  2. Agree the tasks. For each, add an example stopped at its starting page
     (`example-data`) so every task has a stable link.
  3. Choose how errors behave: realistic (default, no change), or "let participants
     through": one commit titled "Research mode on for <id>" that relaxes the chosen
     save rules in the release's controllers' `fields()` and submit requirements, each
     logged in `sets/<id>/research-mode.md`. Refuses high-risk-plants.
  4. `designer:research -- sheet <set>` writes `.cache/designer/research/<set>/sheet.html`:
     local and deployed URLs, how to sign in and which test users, one stable link per task,
     the Reset instruction, a checklist (merged the day before, deployed, Reset done, phone
     width checked, Welsh not needed).
  5. Remind the designer that the deployed prototype only updates after merge to `main`:
     share and merge before the session. Warn that Reset affects every participant on the
     same deployed prototype.
- Afterwards: `designer:research -- off <set>` finds the "Research mode on" commit by title
  and `git revert`s it, and removes the tag. It can also draft findings as a change list for
  the next working release.
- Verify: `designer:check`; `designer:show -- --pages <task starts> --errors` proves errors
  do or do not show as chosen; open the sheet.
- Hand-off: research-mode rules are listed as "cannot ship" by `designer:handoff`.
- **Acceptance:** sheet generator test; a dry run turns errors off on arrival-details in a
  release (show has no error state), and `off` restores them (error state back).

### D12 `share-and-hand-off` (skills + script + workflow)

**Owns:** `.claude/skills/share-my-change/**`, `.claude/skills/hand-off/**`,
`scripts/designer/handoff/**`, `.claude/workflows/prepare-handoff.js`, `handoffs/**`,
`docs/designers/sharing-and-handing-off.md`

- **Skill `share-my-change`**: triggers "save my work", "share this", "commit", "make a pull
  request", "publish", "undo my last change", "throw away what I just did", "go back".
  NOT for making changes or making them real (`hand-off`).
  - Share: `git status` and the diff summarised in plain words; if on `main`, switch to
    `design/<set>-<slug>`; `npm run format`; `designer:check -- --full`; stage only the
    changed owned paths (never `-A`); commit with a message written from the diff
    ("plants-working: rename 'Consignment parties' to 'Consignment addresses' on 6 pages;
    Welsh needed"). Ask before pushing. `gh pr create` with: set and purpose, pages
    changed, the gallery summary, the ownership report, Welsh needed, design gaps, a "make
    this real?" line, and a note that the `frontend-playwright-report` artifact has the
    walk video. Explain that `main` deploys only after merge.
  - Undo, three plain choices: unsaved edits to named files (`git restore` after listing
    them); the last saved change (`git revert --no-edit HEAD`); a named change (found by
    message, `git revert`). Never `reset --hard`, never rewrite history.
- **`designer:handoff -- --set <release> [--features a,b|--all] [--slug <slug>]`**
  writes `handoffs/<yyyy-mm-dd>-<slug>/`:
  1. `upstream.patch`: the release's changed files reverse-transformed (release id back to
     `from`, camel and sentence forms, UUIDs through the reversed `uuidMap`) and diffed
     against current `sets/high-risk-plants`, in `git apply` format against plants-frontend
     paths (identical in both repos). Checked with `git apply --check` in a scratch copy.
  2. Drift report: high-risk-plants files that changed since the release's
     `upstreamCommit` ("the real journey has moved on here; the team will need to merge").
  3. Test-impact list: every old string still pinned in high-risk-plants tests and specs.
  4. Cannot ship as-is: imports from `prototype-services`/`prototype-data` ("needs a real
     service", with the data shape as a starting point for the API conversation),
     `[Welsh needed]` markers, `design-gaps.md` rows, `research-mode.md` rules.
  5. `brief.md` in GDS plain English (what and why, one section per page with before/after
     screenshots, copy table old/new English, Welsh needed, recipe used, what was left out
     and why, how to apply) and `brief.jira.txt` (the same in Jira wiki markup, ready to
     paste into a story). Screenshots capped at 2 MB in total.
- **Skill `hand-off`**: triggers "hand this to the real team", "send this to the
  developers", "make this real", "raise this with plants-frontend". Two routes:
  - From a release (default): run `designer:handoff`, read the brief back, commit the
    hand-off folder on the designer's branch.
  - Upstream-bound: runs `prepare-handoff.js` (args `{ set, slug, scope, paths,
    includeDesignGaps }`): `release-diff`/handoff dry run (`runner`) → triage (`judge`:
    upstream-ready, needs a real service, design gap, research only) → on a new
    `handoff/<slug>` branch from `main`, apply the upstream-ready part to high-risk-plants
    and update pinned tests, captions and specs (`builder`) → full ladder `npm test`,
    `npm run lint`, `npm run test:fit:features` (`runner`, repaired by a `builder` at most
    3 times) → `designer:show -- --set high-risk-plants --before` → write the hand-off
    folder → switch back to the designer's branch. Never merge `handoff/*` into the
    prototype's `main`; once the real team merges it upstream, Monday's sync brings it in.
  - Never pushes to plants-frontend (its push URL is `DISABLED` on purpose). Explains the
    two ways it lands: give the brief and patch to the team, or a developer applies the
    patch in a plants-frontend clone and raises the PR.
- **docs:** `sharing-and-handing-off.md`.
- **Acceptance:** tests for the reverse transform with a UUID map, test-impact detection
  and prototype-services detection; end to end: scaffold a release, change one hint and one
  template, run `designer:handoff`, and `git apply --check` of the patch succeeds against
  current high-risk-plants in a scratch copy; the brief lists the Welsh marker and the
  pinned test; a share dry run commits through the husky hook first time; undo of the last
  change leaves a clean tree and a revert commit.

## 7. Build order

1. D2 guard rails (the shared library).
2. D3 check.
3. D6 example data (per-set seeding, `findExample`).
4. D10 fake a service (the records wrapper D5 injects).
5. D5 design release (needs D6 and D10).
6. D4 see and show.
7. D7 words, D8 design, D9 journey (independent of each other).
8. D11 research.
9. D12 share and hand-off.
10. D1 integration last, then `npm test`, `npm run lint`, `npm run test:fit:journeys`, and
    one end-to-end dry run: make a release, change wording, show, share (no push), hand off.

## 8. Trials

Each trial starts from the suite branch with nothing else changed. Where a trial needs a
working release, its first step makes one with `design-release`. Each is judged on what the
designer sees and on the repo afterwards, not on the agent's report.

| Trial | Re-enacts | Skills exercised |
|---|---|---|
| T1 content pass | `8283340`, `903344e`, `f622600`, `077c2f0`, `fcf7d7f` | change-the-words (+ wording-sweep), check, show, share |
| T2 freeze and carry | `c442009`, `6d3dd1e`, `2191e30`, `8283340` | design-release, show, check |
| T3 dashboard | `7467690`, `d4af0df`, `6d3dd1e`, `9aabc14`, `7da4f70` | fake-a-service, match-the-design, example-data, show |
| T4 transporter entity page | `c93fe37`, `b75ce0a`, `dc8dcc6`, `7661d29` | port-a-kit-page (+ workflow), fake-a-service, change-the-journey, check, show |
| T5 research round and error messages | `9abc06e`, `9038927`, `a0aaf28`, `cb13efb`, `91507cb` | research-session, example-data, change-the-words, check, show |
| T6 new page with a branch, and a move | `268f070`, `33f5836`, `c149d7b`, `4377980` | change-the-journey, example-data, check, show |
| T7 confirmation page, revert, hand off | `c149d7b`, `a0e46bd`, `50afa9e`, `8283340` | change-the-journey (confirmation-variant), share-my-change (undo), hand-off (+ prepare-handoff), check, show |
| T8 crit notes and a demo video | `4377980`, `5700f2b`, `85ea76c`, `fcf7d7f` | run-the-prototype, design-session workflow, show (`--video`, `--compare`), example-data links |

### T1 content pass
"In my working release, rename 'Consignment parties' to 'Consignment addresses' everywhere
it appears: the caption above each page, the task list and check your answers. On check your
answers, drop the extra subheadings; the card titles say enough. I haven't got the Welsh yet.
Then save it and open a pull request."
- Every English occurrence in the release changes; Welsh keys hold `[Welsh needed]
  Consignment addresses`; key trees match.
- No file outside `sets/<release>/` changes; `designer:where --changed` reports only "Yours".
- `designer:check` passes; the gallery shows the new caption on the consignor and
  identification-numbers pages (place of destination's caption is "Destination", so it does
  not change) and the new check-your-answers heading.
- The commit message names the change and pages; the PR body lists Welsh needed; the husky
  hook passes first time.

### T2 freeze and carry
"Freeze what we've got as Design release 2 so the developers have something stable, and
give me a working copy to carry on in. Then carry last week's 'Consignment addresses' change
into DR2 as well."
- `plants-dr2` exists with `release.json` `frozen: true`; a new working release made from it
  exists; the chooser shows the right tags, descriptions and dates.
- The carry applies the change to the target with ids rewritten; attempting to edit the
  frozen release is refused with the plain sentence.
- `designer:check -- --full` passes with 3+ sets mounted; `npm run test:fit:journeys` walks
  every release.

### T3 dashboard
"Make the dashboard in my working release look like this Figma frame (attached PNG): tabs
for Drafts, Submitted and Amended with a count on each, a status filter on the left, and the
reference number as the first column. Fill it with enough examples to look real, including
one that's late."
- Built with `govukTabs`, the MoJ filter layout and `govukTable`/tags only; no `.scss` or
  client JS changed; anything not matched is a row in `design-gaps.md`.
- Counts come from the records wrapper; examples (including a late one and an amended one)
  are made by replaying pages and appear on first visit and after Reset.
- The gallery shows the Figma frame beside the dashboard, plus the filtered and empty
  states.

### T4 transporter entity page
"After arrival details, add a 'Transporter' page like the one in the GB prototype: search
saved transporters, pick one from the list, or add a new one. Here's the old page's HTML."
- `port-a-kit-page` produces an inventory and a fidelity table (matched, nearest
  equivalent, gap); the bespoke autocomplete becomes accessible-autocomplete or a search
  form plus radios.
- A `transporters` fake service with the address-book search contract backs it; the page is
  registered with the add-a-page recipe in the release only.
- The release boots (`--full` green), the walk reaches the new page, and the brief-to-be
  flags "needs a real service".

### T5 research round and error messages
"Research on Thursday. Participants must be able to get past arrival details and
identification numbers without errors, and I need a sheet with a link to where each of the
three tasks starts. After the session, switch errors back on and change the arrival date
error to 'Enter the date the consignment will arrive'."
- One "Research mode on" commit in a research release, logged in `research-mode.md`; the
  chooser shows the tag; show with `--errors` shows no error state on those pages.
- The sheet lists three stable example links that open the right pages after a restart.
- `off` reverts the commit; the error state returns; the new error message is in English
  with the Welsh marker and appears in the gallery's error state.

### T6 new page with a branch, and a move
"On arrival details, ask 'Is the consignment arriving in more than one vehicle?'. If yes,
show a new page asking how many vehicles. And move place of destination so it comes before
the consignor."
- The add-a-field and add-a-branch recipes are followed in the release; the obligation is
  gated with `applyTo`; the engine skips and clears the page on "No".
- The move updates `flow.js`, `RUN_STEPS`, task rows and every page-id place; the walk
  shows the new order.
- The release's `happy-path.json` is updated; `designer:examples -- check` passes; the
  gallery shows both branches side by side (two examples) plus error states.

### T7 confirmation page, revert, hand off
"Put the reference number in a green panel on the confirmation page with a 'What happens
next' section under it." Then, after seeing it: "Actually, undo that, go back to how it
was." Then: "The 'Consignment addresses' wording is agreed: send it to the real plants team."
- The panel change uses `govukPanel` only; show gives a before/after pair.
- Undo produces a revert commit and a clean tree; no history is rewritten. The change was
  unsaved when "undo that" came, so `share-my-change` saves it first, then reverts it (both
  through `designer:save`); no stash.
- The hand-off folder has `brief.md`, `brief.jira.txt`, screenshots and an `upstream.patch`
  that passes `git apply --check` against high-risk-plants, and lists the pinned tests and
  the Welsh still needed. Nothing is pushed.

### T8 crit notes and a demo video
"The prototype won't start (port in use). When it's running, here are my notes from
Friday's crit: 1) change the hint on origin to 'The country the plants were grown in',
2) add a draft example stopped at commodities, 3) make the task list's 'Arrival' group
'Arrival and transport'. Do them all, then record a walkthrough of the whole journey for
Tuesday's show and tell, and show check your answers next to the real journey's."
- `run-the-prototype` names the process on 3103 and asks before stopping it; the dev
  server starts and the example links print.
- `design-session` lands the three requests as three commits (or parks one with a plain
  reason) in the working release, and produces one session gallery.
- `designer:show -- --video --compare high-risk-plants` produces `walk.webm` and a
  check-your-answers pair; the running dev server is undisturbed.

## 9. Follow-ups for Sam (outside this build)

1. Apply `settings-proposal.json` before the first designer session (removes the dead Sonar
   hooks, adds the allowlist and the guard hook, puts `.claude/settings.json` in `ours`).
2. A set-level stylesheet seam (a patched `webpack.config.js` entry for
   `src/client/prototype/<set>.scss`), decided after a month of `design-gaps.md` evidence.
3. Branch previews: `publish-branch.yml` is deleted and CDP config is yours.
4. Upstream drift to raise with plants-frontend: both `testing.md` files say "no tests";
   `add-a-page.md` counts are stale; `vitest.config.js` excludes a literal high-risk-plants
   path; `fit/set-base.js` is single-set; `engine/test-support.js#driveHandler` never
   enters a set context; no Welsh language switch.
5. A test that fails when a file differs from upstream but is in neither `ours` nor
   `patched`, so undeclared drift shows before Monday.
6. Several CDP instances would each hold their own in-memory examples and Reset.
