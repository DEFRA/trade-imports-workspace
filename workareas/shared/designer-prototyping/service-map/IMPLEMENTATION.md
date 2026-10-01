# Service map: implementation guide

The service map is an auto-generated, deterministic page showing the journey's structure: every page as a card with its walkthrough picture, the arrows between pages with branch conditions in plain words, obligations each page fulfils, and which pages are shown under which circumstances.

Built from the same journey engine and obligation model the prototype runs — never by parsing source — it publishes at the same address as the demo page (`service-map/<set>/` on `main`, `reports/pr-<n>/service-map/<set>/` on a branch).

## What a designer sees

When a designer asks "how do the pages connect", "show me the service map", "what happens if they say no", or any variation, the prototype skill routes to `references/show-my-change.md`, "Show the service map" section.

The section gives them:
1. A JSON dump of the graph if they want to answer branch questions in words, without opening a browser
2. A local command to open the page: `designer:service-map -- --set <set-id> --no-open`
3. Links to the published map on main or a pull request
4. A note about pages with no walkthrough picture, and how to add examples

## Repo structure

### Prototype repo (`repos/trade-imports-plants-prototype/`)

Code (`scripts/reports/service-map/` and `scripts/designer/service-map/`):

- `install-set.js`: generic installer that mirrors the route composition, importing set files by path, tolerating optional ones
- `states.js`: decision variables, routing vs field decisions, answer state enumeration, condition minimising
- `probe-scope.js`: recording proxy for opaque page/section gates; fixed-phrase wording for common reads
- `titles.js`: titles from copy (page controller or hub), value labels, lane and row names, fallback to humanised ids
- `graph.js`: the JSON generator — pages, edges, obligations, proofs (dependency graph, reachability)
- `screens.js`: walkthrough report → best picture per page, placeholders, "add an example" messages
- `layout.js`: SVG layout — lanes as columns, cards stacked in flow order, edges as orthogonal paths
- `render.js`, `template.njk`, `service-map.scss`: the HTML page, govuk-frontend macros, compiled Sass
- `cli.js`: `reports:service-map` entry point for CI
- `*.test.js`: Vitest tests pinning behaviour — graph edges, determinism, installer drift guard, screens

Designer commands:

- `scripts/designer/service-map/cli.js`: `designer:service-map` local builder

Related changes:

- `scripts/designer/show/targets.js`: exported `ALIASES` (reused, not copied)
- `scripts/designer/walkthrough/run.js`: builds maps after demo site; added to `DEFAULT_DEPS`
- `scripts/designer/handoff/`: includes map link and affected pages' conditions in story/brief
- `scripts/reports/demo/`: per-set map link in demo page and PR comment
- `.github/workflows/check-pull-request.yml`: build step and canary (design release) step
- `package.json`: `designer:service-map` and `reports:service-map` scripts
- `overrides.json`: extended explanation for prototype-owned scripts

Prototype docs:

- `PROTOTYPE.md`, "Walkthroughs": one line mentioning auto-generated map
- `docs/designers/seeing-your-change.md`: "The service map" section
- `docs/designers/design-releases.md`: every release gets a map
- `docs/designers/sharing-and-handing-off.md`: map links in hand-off sections
- `docs/designers/glossary.md`: service map definition
- `scripts/reports/service-map/README.md`: maintainer guide

### Workspace (`~/git/defra/trade-imports-workspace/`)

Skill routing and docs:

- `.claude/skills/prototype/SKILL.md`: updated description to mention service map
- `.claude/skills/prototype/references/ROUTING.md`: Phrases table links to `show-my-change.md` "Show the service map"; Outcomes table (demo row) mentions map links
- `.claude/skills/prototype/references/show-my-change.md`: section "Show the service map" with full walkthrough

## How it works, in brief

The generator installs a set's journey in-process:

1. Imports each set's files from known paths, tolerating optional ones (e.g. first-pass `RUN_STEPS` may not exist in a design release)
2. Configures the same seams the real composition root does: obligations, dispatch, flow, scope evaluator
3. For each answer state that matters (enumerated from obligation gate metadata):
   - Calls `nextRunTarget`, `nextInSection`, `rowEntry` — the real navigation
   - Records edges and their conditions
   - Asks which pages are shown (`pageGatePasses`)
4. Minimises conditions per decision (drops decisions that do not change the target)
5. Reads page titles from copy, value labels, walkthrough pictures
6. Writes deterministic JSON (`service-map.json`)
7. Renders an SVG diagram (lanes as columns, cards and edges) and an HTML page with a list-view fallback

All state is keyed by set ID, so one CI process can install and map every release in one pass.

## Determinism

The JSON holds only facts derived from source: no timestamps, paths, or picture URLs. Picture URLs are content hashes. Every array has defined order (pages in flow order, edges by `(from, kind, to)`, obligations by manifest order). Objects built with fixed key order, written with `JSON.stringify(graph, null, 2) + '\n'`.

A test confirms two builds produce byte-identical output (tested at prototype level in `graph.test.js`, `layout.test.js`, `render.test.js`).

## Why not tim

Tim is the workspace CLI. The map must import the prototype's set modules, engine seams and govuk-frontend, run on the prototype's pinned Node version, and run in CI where tim is not installed. Designers already use `npm --prefix ... run designer:*`.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Opaque closures mask intent | Scope probe labels common reads (`readyForCheckYourAnswers`, `has()`, `answered()`); others stay visibly "a rule in the page's code" |
| State explosion (too many branches) | Refuse over 256 states with a plain message naming the decisions |
| Walkthrough redirects confuse the picture | Heading check: drop a picture if its heading does not match the page's title from copy |
| Field decisions (like `category`) clutter the diagram | Drawn as page-level detail, not arrows — keeps diagram readable, matches how `gates.js` decides reachability |

---

## Timeline and branches

- Both repos on `feat/NO_JIRA-service-map` (workspace stack does not run the prototype, so branch names need only match for the stack; they do not here)
- Prototype implementation complete, tested, determinism proved
- Workspace skill integration complete
- Ready to commit

See `design.md` (sections 6–8) for ownership split and code-side changes.
