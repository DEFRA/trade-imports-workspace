# Reusable assets for the designer suite

Inventory of what already exists in the workspace (and in the prototype
repo itself) that a designer-facing suite of skills, docs and workflows on
`trade-imports-plants-prototype` could adapt. Written 2026-09-27 against
the prototype on `feat/NO_JIRA-designer-prototyping` (HEAD `aeb1617`).

Designers will have **only the prototype repo**, never the workspace. So
"port" always means copy-and-adapt into the prototype repo, and anything
ported must be listed in `overrides.json` `ours` or the weekly sync robot
will overwrite or conflict it (see §4).

## 1. The hard constraint first: the sync robot and `overrides.json`

- `npm run sync:upstream` (`scripts/sync-upstream/*`, cron Monday 04:00 in
  `.github/workflows/sync-upstream.yml`) merges `upstream/main`
  (plants-frontend) into the prototype, deletes every path in `deleted`,
  keeps every path in `ours` as the prototype's own, and expects `patched`
  files to carry one small deliberate diff each.
- Anything NOT in `ours` belongs to plants-frontend. A new
  `.claude/skills/...`, `CLAUDE.md`, `.claude/rules/...` or
  `.claude/workflows/...` in the prototype **must be added to `ours`** or
  the next Monday PR either drops it or lands as `needs-person`.
- **Existing defect worth fixing in the suite:** `.claude/settings.json`
  in the prototype (not in `ours`, not in `patched`) still wires three
  hooks — `PreToolUse(Read)` and `UserPromptSubmit` to
  `.claude/hooks/sonar-secrets/build-scripts/*.sh`, and `Stop` to
  `.claude/sonar-analyze.sh` — but `overrides.json` `deleted` removes
  `.claude/hooks/sonar-secrets/**` and `.claude/sonar-analyze.sh`, and
  `find .claude` confirms only `settings.json` survives. A designer who
  opens Claude Code in this repo gets a failing hook on every prompt and
  every Read. The fix is a prototype-owned `settings.json` (in `ours`)
  with those hooks removed. This session's guard forbids editing
  `.claude/settings*.json`, so write the proposal to
  `workareas/shared/designer-prototyping/settings-proposal.json` for Sam.
- `.claude/` in the prototype has no `CLAUDE.md`, no skills, no rules, no
  workflows today. Everything designer-facing is greenfield.

## 2. Inventory: workspace assets

| Asset (workspace path) | What it is | Verdict | How to adapt |
|---|---|---|---|
| `.claude/skills/frontend-change/SKILL.md` | Routes one change to the repo's own recipe docs (add-a-field / add-a-page / add-a-section / add-a-collection / change an obligation / change the journey flow), baseline guard, recipe-verbatim implementation, 5-rung verification ladder, self-repair budget of 3, one increment then stop. Steps 1–4 are entirely repo-local. | **PORT (Steps 1–4), DROP Step 5** | Copy into `.claude/skills/<name>/SKILL.md` in the prototype. Replace every `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` with the repo root and `sets/live-animals` with `sets/<set-id>` (an input; default `high-risk-plants`). Ladder becomes `npm run test:high-risk-plants` → `npm test` → `npm run lint` → `npm run test:fit:features` → `npm run test:fit:journeys`, run from the repo cwd (no `--prefix`). Drop Step 5 (openspec spec sync), `references/SPEC_SYNC.md` and `tools/frontend-change/openspec-validate.sh` entirely — `openspec/` lives in the workspace and designers have no spec root. Re-word for a designer audience: the skill body speaks to an agent, but the trigger phrases and the Completion output should read as GDS plain English. |
| `.claude/skills/frontend-change/decisions.md` | The CREATE-interview record (prose state, no dispatcher, no fan-out). | Leave behind; write a fresh one for the prototype skill. | — |
| `.claude/skills/journey-builder/` | Digest → spec → backlog → build loop with worktrees, spec gate, decisions ledger, `tools/journey-builder/*.sh` (24 scripts). | **LEAVE BEHIND** | Built for a developer programme against Jira runs, workspace worktrees and the Behaviour Spec. Far too heavy for a designer iterating one page. The one idea to keep: *serial increments over shared files* (registry, flow, hub, CYA) — a designer skill must do one page/field per invocation. |
| `.claude/skills/requirements-pipeline/` (SKILL.md header, `workflow/increment-build-loop.js`) | Sources → `backlog.json` → build loop, Claude or Codex executor, args contract. | **LEAVE BEHIND as a whole; borrow the args contract** | The `// >>> args-contract` block (`parseArgs` / `requireKeys` / `logResolvedConfig`, byte-identical, no defaults) from `.claude/workflows/README.md` is the right skeleton for any `.claude/workflows/*.js` the prototype ships. The DISTIL idea ("compare two built things → backlog") is useful for a later "design release parity" skill but not for the first suite. |
| `tim/src/capture/*` (`config.js`, `inventory.js`, `fit-run.js`, `traces.js`, `coverage.js`, `run.js`; CLI in `tim/src/commands/capture/index.js`) | `tim capture <workarea> --app <name>`: runs an app's own FIT suite with `--trace on --reporter=list --output <tmp>`, copies every `trace.zip` under `workareas/<wa>/traces/<app>/<sha>/`, imports the set's `flow.js` `sections` export as the page inventory, and uses the Playwright trace CLI (`trace open` / `trace requests --grep <url-regex>`) to say which pages each trace reached. Writes `manifest.json` + `coverage.json`. Six zod-validated modules, all behaviourally tested. | **PORT the logic, not tim** | tim is workspace-only. Re-home the six modules as `scripts/capture/*.js` in the prototype (an npm script `capture` — the repo already has a `capture:high-risk-plants` script, but that is a different thing, see §3). Changes: `repo` is the repo root, not `workspaceRoot/repos/x`; `flow` is `src/server/app/sets/<set>/journeys/linear/flow/flow.js` (verified: exports `sections` as `[{id, pages:[{id, slug}]}]`, which is exactly the shape `inventory.js` validates); `pagePath` is `/<set>/notifications/{journeyId}/{slug}`; output goes under a gitignored `captures/<set>/<sha>/`. The `journeys` Playwright project already records `video: 'on'`, `trace: 'on'`, slowMo 600 — so the capture gives designers the old prototype's `journey-demo` video deliverable for free. `zod` is not a prototype dependency; either add it as a devDependency (upstream-owned `package.json` is `patched`, so a dependency diff is allowed but must be declared) or replace the schemas with hand checks. |
| `.claude/skills/playwright-trace/` | How to read a trace from the CLI (actions, requests, console, screenshots). | **PORT** | Small, repo-agnostic. Copy as a reference the capture skill cites so a designer can ask "show me what the walk saw on the arrival page". |
| `docs/best-practices/gds/` (`components.md` 104 lines, `patterns.md` 90, `styles.md` 131, `accessibility.md` 118, `service-design.md` 144, `language.md` 110, `writing.md` 32) | Skill-facing summaries of the Design System components, patterns, styles, WCAG 2.2 AA target, service manual, and the GOV.UK style guide (plain English, active voice, sentence case, dates, contractions, inclusive language). | **PORT all but `writing.md`** | Copy to `.claude/rules/` or `docs/gds/` in the prototype. `writing.md` is Jira-ticket-specific — leave it. These are the natural content of a "copy sweep" skill's guard rails and an `.njk`-scoped rule. |
| `.claude/rules/gds.md` (paths `**/*.njk`), `.claude/rules/copy.md` (paths `**/copy.en.js`, `**/copy.cy.js`), `.claude/rules/playwright.md`, `.claude/rules/node.md` | Path-scoped rules with `paths:` frontmatter that Claude Code loads natively by glob (memory: `.claude/rules/ paths:-glob is native`). `copy.md` already explains the `copy-convention` / `copy-parity` tests and "change `en` and `cy` together" — exactly what a designer changing wording needs to know. | **PORT `gds.md` and `copy.md`; adapt `playwright.md`; drop `node.md`** | Rewrite the `~/git/defra/trade-imports-workspace/docs/best-practices/...` references to the in-repo copies. `playwright.md` points at the tests repo's `npm run test:docker-compose`; the prototype's runner is `npm run test:fit:features`. `node.md` is developer-facing and references files (hapi.md, pino) designers never touch. |
| `docs/best-practices/node/govuk-frontend.md`, `nunjucks.md` | Nunjucks/govuk-frontend macro conventions. | **PORT** (as the reference `gds.md` cites) | Read them before copying; they are the "stay in the govuk-frontend toolbox" rule in practical form, which §6 of `usage.md` says is the main way the old prototype drifted (176 bespoke `.app-*` selectors). |
| `docs/best-practices/playwright/BEST_PRACTICES.md` | Specs read like HTML, raw locators, auto-waiting, no sleeps. | **PORT (trimmed)** | Only the sections the recipes' "Playwright feature test" paragraphs assume. |
| `docs/agent-skills.md` | Skill folder shape (frontmatter `name` = folder name, `description` = WHAT + WHEN + triggers), SKILL.md under ~500 lines, `references/` for on-demand prose, Bash call hygiene (one command per call, no `&&`/`|`/`cd`). | **PORT the conventions, not the file** | The path-resolution section is workspace-specific (`~/git/defra/trade-imports-workspace`). In the prototype every path is repo-relative, which is simpler. Keep the one-command-per-call rule: a designer's Claude Code has no allowlist tuned yet, so compound commands mean permission prompts. |
| `docs/best-practices/skills/patterns.md`, `anti-patterns.md`, `scaffold-template.md` | The 8-pattern checklist skill-creator applies. | **Use while building, don't ship** | Apply when authoring the suite (prose vs JSON state, dispatcher only if >2 setup steps, no fan-out for single-page changes). Designers do not need it in-repo. |
| `.claude/workflows/README.md`, `args-canary.js` | Workflow scripts launched by `scriptPath`, args contract, canary proving args delivery. | **PORT the contract block; consider one canary** | Only if the suite ships a workflow (e.g. "capture every set after a change"). Memory: `Workflow({name})` runs a stale snapshot — always `scriptPath`. |
| `workareas/shared/designer-prototyping/notes/usage.md`, `anatomy.md` | This run's own analysis of the old GB-notification-service prototype: what designers actually do (copy sweeps across duplicated views, dashboard iterations, address book, fixture data, new version = copy a folder), commit-to-main with one-line messages, Cursor + AI, stakeholder URL + recorded video. | **The requirements source** | §8 of `usage.md` is the design brief for the suite: (1) copy/content sweep + fixture tweak is the dominant unit of work; (2) "freeze a release, keep working" must be replaced by sets (`npm run new:set -- <id> --from high-risk-plants`); (3) generate branch/commit/PR for the designer rather than expecting branch discipline; (4) the captured render is the deliverable; (5) govuk toolbox as a suggestion not a block. |
| `workareas/shared/plants-prototype/PLAN.md` §5 "For designers", `HANDOVER.md` | The increment plan that produced PROTOTYPE.md, the chooser, `new:set`, seeded data. Items 1–4 landed (`2682b0f`); item 5 "richer stub data: bigger address book, realistic organisations" did not. | **Read; the open item is a candidate increment** | Also records `npx --yes npm@11.6.2 ci` (ambient npm 11.17 refuses the lockfile) and "run exactly one instance — stub data is in memory". |
| `docs/repos/trade-imports-plants-prototype.md` | Workspace repo page — written before the clone existed, says "Unclear from code" throughout. | Stale; out of scope for the designer suite (workspace-side). | Note for Sam: rewrite from PROTOTYPE.md. |

## 3. Inventory: what the prototype repo already owns

Everything here is in `overrides.json` `ours` unless stated, so it is
safe to build on.

| Asset (prototype path) | What it is | Use in the suite |
|---|---|---|
| `PROTOTYPE.md` | The designer guide: run (`npx --yes npm@11.6.2 ci`, `npm run dev`, :3103, dev sign-in), deployed sign-in via Defra ID stub, example data shared by everyone, sets, the chooser, reset, adding a set, where to edit (templates `.njk`, copy `copy.en.js`/`copy.cy.js`, logic in `controller.js`/`flow.js`), weekly sync, how a change reaches the real service, what never to edit. | The suite's front door. Add a "Working with Claude Code" section that lists the skills by trigger phrase. Its "Where to edit pages" paragraph is the seed of the copy-change skill. |
| `overrides.json` | `deleted` / `ours` / `patched` lists driving the sync robot. | Every suite file must be added to `ours`. A skill that creates files should say so. |
| `scripts/new-set/*` (`npm run new:set -- <id> [--from <set>]`) | Copies a set folder, renames TEMPLATES/cookie names/ids, registers the mount and adds it to `overrides.json`. Tested (`cli.test.js`, `names.test.js`, `transform.test.js`). | The replacement for the old prototype's copy-a-views-folder versioning. A "start a design release" skill wraps it: `--from high-risk-plants` for a fork of the real journey, default `sample-journey` for a blank one, then a description in `src/server/prototype-sets/descriptions.js`. |
| `src/server/prototype-sets/` (chooser at `/`, `descriptions.js`, `/reset/{setId}`) | Lists every mounted set with a description and a reset button. | Stakeholder-facing index, the analogue of the old `index.html` cards. Descriptions are a hand-maintained map — the set skill should add the entry. |
| `src/server/prototype-seed/*` (`scenarios.js`, `seed-high-risk-plants.js`, `adopt-known-journeys.js`) | Seeds four example notifications (draft just started, draft midway, submitted, submitted then amended) by replaying the real journey from `flow/fixtures/happy-path.json`, on first visit. | The analogue of the old prototype's `app/data/dashboard-notifications.js`. A "change the example data" skill edits `scenarios.js` (labels, which happy path, how far, submit/amend) — never a hand-written record, because the seed replays the journey and cannot describe a consignment it would reject. `PROTOTYPE_SEED=false` turns it off (the Playwright webServer does). |
| `src/server/app/sets/high-risk-plants/docs/*.md` | Recipes: `add-a-field.md` (obligation → binding → controller → copy + markup → CYA row → mapper → webpack entry → tests → Playwright → axe → run every check), `add-a-page.md`, `add-a-section.md`, `add-a-collection.md`; guides: `obligation-model.md`, `features.md`, `journey-flow-and-gates.md`, `services.md`, `limits.md`, `testing.md`, `lighthouse.md`; `README.md` with the exemplar table (commodity-type / arrival-details / commodities / commodities list+details). | Upstream-owned (NOT in `ours`) — the frontend-change port reads them, never edits them. These are the "recipes as scripts" the ported skill routes to. `testing.md` is the ladder in the repo's own words (`npm run test:high-risk-plants`, `npm test`, `PORT=3053 npm run test:fit:features`, `npm run lint`, plus `test:fit:journeys` for whole-journey changes). |
| `src/server/app/docs/*.md` | Platform guides (architecture L1–L4, engine, flow-and-gates, scope-and-wipe, validation, persistence, cardinality, testing, `add-a-set.md`). | Upstream-owned. The "general change" route reads these. `add-a-set.md` is the developer form of what `new:set` automates. |
| `playwright.config.js` (patched) | `journeys` project: `fit/**/*.fit.spec.js`, `video: 'on'`, `trace: 'on'`, slowMo 600 (`DEMO_SLOWMO=0` in `test:fit`); `features` project: co-located `*.fit.spec.js`, `trace: 'retain-on-failure'`. webServer runs `npm run fit:start` with `STUB_MODE=true PROTOTYPE_SEED=false`; default port 3003. | The recorded-walk deliverable already exists. The ported capture should run the `journeys` project for video and both for coverage. Port note: `PORT=3053` is only needed when the workspace stack is up, which a designer never has — default is fine. |
| `fit/journey-smoke.fit.spec.js`, `fit/sets-chooser.fit.spec.js`, `fit/seed-fields.js`, `fit/sign-in.js` | Five mural happy paths dashboard → confirmation; chooser boot check; shared sign-in. | The traces the capture reads. `sets-chooser.fit.spec.js` is the model for a per-set boot check the sync robot already runs. |
| `src/server/app/services/_capture/capture.js` (`npm run capture:high-risk-plants`) | **Not a screenshot/trace capture.** Fetches `/countries`, `/countries?blocks=GBNAG_SPS_EX`, `/ports-of-entry` from a running reference-data service (:8086) into `_capture/fixtures/*.json`. | Upstream-owned developer tool. Name collision to avoid: call the ported trace capture something else (`capture:walk`, `record`). Do not surface it to designers — it needs a service they do not run. |
| `.claude/settings.json` | Sonar hooks pointing at deleted scripts (see §1). | Replace via `settings-proposal.json`. |
| `.github/workflows/sync-upstream.yml`, `check-pull-request.yml`, `publish.yml` | Weekly sync + PR; PR checks; CDP publish. Sonar step skips without `SONAR_TOKEN` (deliberate, PLAN §6). | If the suite generates a PR for a designer, `check-pull-request.yml` is what runs on it. |

## 4. Claude Code features designers can use (and the suite should ship)

- **Project skills** — `.claude/skills/<name>/SKILL.md` with frontmatter
  `name` (must equal the folder) and `description` (what + when +
  trigger phrases). Auto-discovered when Claude Code is opened in the
  repo root. Cursor also reads `.claude/skills/` (docs/agent-skills.md
  "Cross-host discovery"), which matters because the old prototype's
  designer works in Cursor.
- **`CLAUDE.md`** at the repo root — always in context. The prototype has
  none. It should carry the load-bearing rules only (never edit outside
  `ours` unless sending the change upstream; one set per prototype;
  seeded data replays the journey; the ladder), and point at
  PROTOTYPE.md and the recipes rather than duplicate them.
- **`.claude/rules/*.md` with `paths:` frontmatter** — native
  glob-scoped rules. `gds.md` on `**/*.njk` and `copy.md` on
  `**/copy.{en,cy}.js` are the two that pay for themselves.
- **`.claude/workflows/*.js`** — deterministic multi-agent scripts, run
  by `scriptPath`, args contract with no defaults. Candidate: a
  "sweep" workflow that fans one copy change across every feature of a
  set and runs the ladder once.
- **Slash commands** — a skill is invoked by `/<name>`; the description's
  trigger phrases are what make "change the wording on the arrival page"
  route without the slash.
- **Hooks in `.claude/settings.json`** — the one thing the suite must
  *remove* (the dead Sonar hooks). A `PreToolUse(Edit|Write)` guard that
  refuses edits to files outside `overrides.json` `ours`/`patched`
  unless the user says the change is going upstream is the only hook
  worth adding, and it is a settings change, so it goes in the proposal
  file.

## 5. Recommendation

Port, in this order of value:

1. **frontend-change Steps 1–4** as the recipe-following skill, with
   the set as an input and the ladder from `testing.md`. Drop Step 5.
2. **A copy-sweep skill** — new, not ported: edit `copy.en.js` and
   `copy.cy.js` together across the features of a set, run
   `npm run test:high-risk-plants` (copy-parity/convention) then
   `test:fit:features`. This is the dominant unit of work in `usage.md`
   §5 and has no workspace equivalent because the workspace never needed
   one.
3. **tim capture's six modules** as `scripts/capture/`, output to a
   gitignored folder, reading the set's `flow.js`. Keep the
   playwright-trace reference beside it.
4. **GDS best-practice files + `gds.md`/`copy.md` rules** into the repo.
5. **A "start a design release" skill** wrapping `npm run new:set` plus
   the description map — the replacement for copy-the-folder versioning.
6. **An "example data" skill** over `prototype-seed/scenarios.js`, and the
   unlanded PLAN §5.5 item (bigger address book, realistic organisations)
   as its first increment.
7. **CLAUDE.md, a PROTOTYPE.md section, `overrides.json` `ours` entries
   for all of the above, and `settings-proposal.json`** removing the dead
   hooks.

Leave behind: journey-builder, requirements-pipeline (bar the args
contract block), openspec/spec sync, `tools/*.sh`, tim itself,
`docs/best-practices/gds/writing.md`, `.claude/rules/node.md`, the
Jira/GitHub/Confluence tooling, and anything that needs
`~/git/defra/trade-imports-workspace` to exist.
