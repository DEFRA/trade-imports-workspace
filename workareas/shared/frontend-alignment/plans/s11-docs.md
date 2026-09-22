# s11-docs — write app/docs and the feature recipes for ins

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit/Write tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (checked out, level with `origin`, clean tree, HEAD `9d1e58a`).

Reference files (Read tool paths under `/Users/samfarrington/git/defra/trade-imports-workspace/`):

- `repos/trade-imports-plants-frontend/src/server/app/docs/README.md` — the docs index: a two-sentence statement of
  what `src/server/app/` is, then link lists under `## … guides` / `## Recipes` headings. ins's index takes this
  shape (N1).
- `repos/trade-imports-plants-frontend/src/server/app/docs/architecture.md` — layer-by-layer description, each with
  the files that compose it as relative markdown links, closing with `## Enforced boundaries` that lists what
  Dependency Cruiser forbids. ins's architecture doc takes this shape (N2).
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/features.md` — feature anatomy:
  what a feature folder holds, then one `##` per concern (page identity, controllers, copy and templates, bindings,
  registration, client JavaScript, tests), each citing the implemented file. ins's features doc takes this shape (N3).
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-page.md` — the recipe:
  `## Read these files first` naming the smallest complete page, numbered `## 1.` … `## N.` steps, the Playwright and
  accessibility sections, `## N. Run every check` with a fenced command block and the sentence that defines green.
  ins's recipe takes this shape (N4).
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/services.md` and
  `repos/trade-imports-plants-frontend/src/server/app/docs/services.md` — the run-mode paragraph ("It is one
  service-wide switch, `STUB_MODE`, which also decides how a trader signs in …") and the per-service bullet list with
  the operations each exposes. ins's services doc takes both (N5).
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/testing.md` and
  `repos/trade-imports-plants-frontend/src/server/app/docs/testing.md` — the unit/browser/deployed split, the
  "Browser-test projects" paragraph, the port sentence ("The Playwright default port is 3003, which is also the port
  the workspace stack serves this frontend on. Pass `PORT=3053` when the stack is up."), the "Required checks"
  block and the sentence that defines green. ins's testing doc takes these (N6).
- `repos/trade-imports-plants-frontend/README.md` — the repo README shape (E1): one paragraph on what the service is,
  links to the app docs, `## Current state`, a contents list, then Requirements → caching → Redis → Local development
  (with "The ones you will use most") → Auth → Docker → Local stack → SonarCloud → Licence.

The workspace conventions the implementor is held to (Read tool paths under
`/Users/samfarrington/git/defra/trade-imports-workspace/`): `docs/best-practices/node/code-style.md` (§15 — prose
explains **why**, names explain **what**), `docs/best-practices/node/hapi.md` (§2 route objects, §3 params validation,
§10 `server.inject`), `docs/best-practices/node/nunjucks.md` (§3 inheritance, §17 the `errorMessage: errors.x and
{ text: errors.x }` idiom) and `docs/best-practices/node/testing/frontend.md` (test philosophy — behaviour, not
implementation). The docs this stage writes describe code that already follows those; nothing in them may
contradict them (for example, do not tell a reader to mock `global.fetch` — ins mocks at the network boundary with
nock).

Baseline (s10's landed ladder on `9d1e58a`, `logs/s10-build-tooling-ins-test.log` / `-test-fit.log`): unit suite
**55 files / 494 tests** green, `format:check` clean, `lint` clean, Playwright **50/50** green. Expected after this
stage: **unchanged** — 55 files / 494 tests; no `.js`, `.njk` or `.json` file changes. Playwright is not re-run
(no source change; CI's FIT job runs it on the PR).

What this stage does: writes six markdown files under `src/server/app/docs/` describing the application layout as it
is at `9d1e58a`, rewrites the repo `README.md` in plants' README shape, and deletes the CDP-template boilerplate the
README stops describing (the unused `compose.yml` + `compose/` directory and three placeholder `README.md` stubs).
7 files are created or rewritten, 7 are deleted, nothing moves.

---

## 0. Decisions (made here so the implementor never has to choose)

| #   | Question the brief left open                                                                                                                                                                         | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Plants splits its docs into platform (`app/docs/`) and set (`sets/<set>/docs/`). ins has no set.                                                                                                     | **One flat folder, `src/server/app/docs/`, six files**: `README.md`, `architecture.md`, `features.md`, `add-a-page.md`, `services.md`, `testing.md`. The set-guide docs (features, add-a-page, services, testing) are written in the set-guide voice with ins's own features as the worked examples; the platform docs (README, architecture) in the platform voice. No `sets/`, no `decisions.md`, `validation.md`, `test-ownership.md`, `limits.md`, `lighthouse.md` — the brief names six and each of those either has no ins subject or folds into one of the six (D5, D6).                                                                                                                       |
| D2  | Which README sections are "CDP template boilerplate that no longer applies".                                                                                                                         | **Dropped**: the "Core delivery platform Node.js Frontend Template" line; `## Proxy` (ins has no `setup-proxy.js` and no `ProxyAgent`/`setGlobalDispatcher` anywhere under `src/` — grep at planning time; plants keeps the section because plants has the helper); `### Docker Compose` (the compose file goes, D3); `### Update dependencies` (ncu); `#### Windows prettier issue`; `### Dependabot` (plants' README omits it; `.github/dependabot.yml` stays). **Kept, rewritten in plants' words**: Requirements, Server-side caching, Redis, Local development, Auth, Docker, SonarCloud, Licence. **Kept as ins-only**: a two-line `### Git hooks` naming `npm run setup:husky` (ins has no `postinstall`, so the hook is opt-in; the old README's `npm run git:hooks` names a script that does not exist). |
| D3  | `compose.yml` and `compose/` (`aws.env`, `floci/start.d/10-setup-resources.sh`, `mongo/10-init.js`) are the CDP template's local environment: a `your-frontend` on port 3000, Floci, Mongo — none of which ins uses. | **Deleted (§1).** Neither journey tracks a compose file; the README's "Local stack" section points at the workspace stack instead, as plants' does. Safe: nothing in the ins repo outside the README names them (`grep -rln compose` hits only `README.md`, `compose.yml` and the `compose()` validator sources), and nothing in the workspace's `docker/`, `scripts/`, `tim/src` or the tests repo references `trade-imports-ins-frontend/compose`, `aws.env` or `10-setup-resources` (grep at planning time). The workspace's `dev.compose.yml` builds ins from its `Dockerfile` and bind-mounts `src/` only.                                                                                          |
| D4  | Three CDP placeholder READMEs: `src/server/common/README.md` ("For common work that is Server specific"), `src/client/common/README.md`, `src/server/common/templates/partials/README.md`.           | **Deleted (§1).** Neither journey has them (`git ls-files '*.md'` in both). `src/client/common/helpers/.gitkeep` stays — plants tracks the same file. Deleting the partials README empties `src/server/common/templates/partials/`; `webpack.config.js` lists that directory as a Sass load path, which plants also lists without the directory existing — Dart Sass tolerates a missing load path (s09 proved the same for `common/components`). `npm test`'s `pretest` build proves it again here.                                                                                                                                                                                              |
| D5  | Plants has a platform `validation.md`; ins now carries `lib/validate` (s08).                                                                                                                         | **No seventh file.** Validation is a `## Validation` section in `features.md` (the library surface, `validate()`'s `{ value, errors }` contract, the field-name = input id = error key rule, `requiredEmail` as ins's one addition to the ported library) and step 4 of `add-a-page.md`.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D6  | Plants has `test-ownership.md` for the cross-repo split.                                                                                                                                             | **Folded into `testing.md`'s `## Deployed end-to-end tests`**, with the facts as they are: the shared tests repo `DEFRA/trade-imports-animals-tests` has an `ins` Playwright project (`tests/e2e/features/ins/*.spec.ts`, `tests/security/ins/address-book.spec.ts`), run against the workspace stack or CDP; ins has no delegating `e2e-tests.yml` (animals does); `check-pull-request.yml`'s two jobs — `pr-validator` and `FIT Tests` — are the PR checks; same branch name across repos.                                                                                                                                                                                                              |
| D7  | How much of the journey shape to mention.                                                                                                                                                            | **Every comparison with the journey frontends lives in one section, `architecture.md` → `## How this differs from the journey frontends`**, and nowhere else. It lists: no set, no journey, no obligation model, no engine/bridge/flow/analysis, no `configure*` seams, no `dispatchPages`, no `prime()` (countries are fetched per request), page controllers named `controller.js` not `<page>.controller.js`, stub-or-real chosen per call, one shared fit fixture (`address-form.js`) rather than per-spec axe calls, Joi still imported by `lib/validate/validators.js` and `address-id-params.js` although not declared. §6E greps the other five docs for journey vocabulary and expects nothing. |
| D8  | Voice and tense.                                                                                                                                                                                     | **Present tense, describing `9d1e58a` as it is.** No programme stage ids (`s01`…`s13`), no "was moved", "renamed from", "formerly", "previously", "migrated" — §6D greps for them. Rationale is stated as the reason the code is shaped this way, not as history. Plain English, GDS style: short sentences, active voice, second person in the recipe ("Create…", "Run…").                                                                                                                                                                                                                                                                                                                              |
| D9  | Links.                                                                                                                                                                                               | **Relative markdown links to real files, exactly as plants writes them** (`[`kit.js`](../shared/kit.js)`). From `src/server/app/docs/`: `../` reaches `src/server/app/`, `../../` reaches `src/server/`, `../../../` reaches `src/`, `../../../../` reaches the repo root. Every link target must exist; §6B lists them and proves it with `ls`. External links only to `https://github.com/DEFRA/trade-imports-workspace` and `https://github.com/DEFRA/trade-imports-animals-tests`.                                                                                                                                                                                                                 |
| D10 | Prettier.                                                                                                                                                                                            | The `format:check` glob `**/*.{js,cjs,md,json,…}` covers every markdown file in the repo, so the docs must be prettier-clean. **Wrap prose by hand at 80 columns** as plants does (prettier's `proseWrap` is `preserve`, so it will not wrap for you but will normalise tables, list markers and fences). Run `npm run format` once after the last file is written and before the ladder.                                                                                                                                                                                                                                                                                                                 |
| D11 | Ports and commands in the README.                                                                                                                                                                    | `npm run dev` serves on **3002** (`config.js` default). Playwright default **3002**, `test:fit:ci` uses **3052**. Docker run lines use `-p 3002:3002 -e PORT=3002` with one sentence saying the image's `ARG PORT` defaults to 3000. Workspace stack exclusion is `-e ins-frontend` (`docker/stack/AGENTS.md`'s valid names).                                                                                                                                                                                                                                                                                                                                                                       |
| D12 | The Welsh copy.                                                                                                                                                                                      | `features.md`'s copy section states, in these words, that **every `copy.cy.js` is machine-draft Welsh awaiting Welsh Language Standards sign-off, and that no locale toggle exists so every call site resolves `en`** — the header line each `copy.cy.js` carries and the `copyFor` doc comment say the same.                                                                                                                                                                                                                                                                                                                                                                                       |
| D13 | The workspace.                                                                                                                                                                                       | **Nothing under the workspace root changes** except this plan, the stage notes and the logs. The README links to the workspace repo URL, as plants' does.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

---

## 1. Moves — every file that moves or is deleted

Nothing moves. Deletions (all via `git rm`, one call each, from the repo root
`~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`):

| From (`repos/trade-imports-ins-frontend/`)          | To  | Why                                                                                    |
| --------------------------------------------------- | --- | -------------------------------------------------------------------------------------- |
| `compose.yml`                                       | —   | CDP template local environment (`your-frontend`, Floci, Mongo); ins uses none of it (D3) |
| `compose/aws.env`                                   | —   | only read by `compose.yml`                                                             |
| `compose/floci/start.d/10-setup-resources.sh`       | —   | only mounted by `compose.yml`                                                          |
| `compose/mongo/10-init.js`                          | —   | only mounted by `compose.yml`; ins has no Mongo                                        |
| `src/server/common/README.md`                       | —   | CDP placeholder; neither journey has it (D4)                                           |
| `src/client/common/README.md`                       | —   | CDP placeholder; neither journey has it (D4)                                           |
| `src/server/common/templates/partials/README.md`    | —   | CDP placeholder; neither journey has it (D4)                                           |

Bash: `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend rm compose.yml` and
`git -C … rm -r compose` (the recursive form is `git rm -r`, never `rm -r`), then one `git rm` per README.

No test file moves or is deleted.

---

## 2. Edits — every file that changes content

### E1 `README.md` (repo root) — rewrite in plants' README shape

Write the whole file; the current one is the CDP template with an auth section bolted on. Keep the three SonarCloud
badge lines verbatim (project key `DEFRA_trade-imports-ins-frontend`). Then, in this order:

1. **Opening paragraph** (imitating plants' lines 7–11): what the service is — the Import Notification Service front
   door: a notification dashboard and an organisation's address book, signed in through Defra ID. It is a plain Hapi
   + Nunjucks application: one `src/server/app/` with the pages under `features/`, the HTTP clients under
   `services/`, and the page kit under `shared/`. No obligation platform, no journey.
2. Two links: `[Application documentation](src/server/app/docs/README.md)` and
   `[Add a page](src/server/app/docs/add-a-page.md)`.
3. `## Current state` — the served surface: `/` (dashboard: lists, searches by reference and sorts an
   organisation's notifications; each row links to the animals frontend, which owns the notification), `/address-book`
   with `add`, `{id}`, `{id}/edit`, `{id}/delete`, plus `/auth/*`, `/signout`, `/health`. Link to
   `src/server/app/docs/README.md#the-served-surface`. One sentence: deployed end-to-end tests live in the shared
   tests repository `trade-imports-animals-tests` as its `ins` Playwright project — see
   `src/server/app/docs/testing.md#deployed-end-to-end-tests`.
4. Contents list (plants lines 33–42 shape): Requirements, Server-side caching, Redis, Local development,
   Auth, Docker, SonarCloud, Licence.
5. `## Requirements` / `### Node.js` — plants lines 46–56 verbatim with the repo name swapped: Node 24 (`.nvmrc` is
   `v24.14.1`) and npm 11.6.2 pinned by `packageManager`; `nvm use`. Add one sentence and a fenced
   `npm run install:pinned-npm` block: it runs `npm install` under the pinned npm (via `scripts/npm-version.js`) so
   the lockfile a developer regenerates matches the one CI and the Dockerfile install with.
6. `## Server-side caching` and `## Redis` — plants lines 58–73 verbatim.
7. `## Local development` — `### Setup` (`npm install`), `### Git hooks` (D2: "The pre-commit hook is opt-in:
   `npm run setup:husky` installs it; it runs `npm run git:pre-commit-hook` — audit, format check, lint and the unit
   suite."), `### Development` (`npm run dev` — webpack `--watch` beside nodemon, "It serves on port 3002.";
   `npm run dev:debug` for the inspector; `.env` at the repo root is read by nodemon's `--env-file-if-exists`),
   `### Production` (`npm start`, builds the client first), `### Npm scripts` with plants' "The ones you will use
   most" fenced block adapted to ins:

   ```bash
   npm test                        # builds the client, then the full Vitest suite with coverage
   npm run test:watch              # Vitest in watch mode, no build, no coverage
   npm run test:fit                # both Playwright projects, stub-backed, port 3002
   npm run test:fit:smoke          # the one whole-service smoke spec under fit/
   PORT=3052 npm run test:fit:features   # the co-located feature specs
   npm run lint                    # JS, stylesheet and dependency-cruiser
   npm run format
   npm run build:frontend          # one webpack build into .public/
   npm run fit:start:workspace     # the workspace-backed start, see below
   ```

   Then plants' two paragraphs (lines 144–154) adapted: `fit:start:workspace` chains
   `scripts/check-workspace-stack.js` ahead of `fit:start`, probing `/health` on the INS backend (8090), the address
   book (8089) and reference data (8086) and refusing to start when any is down; plain `fit:start` is what the
   Playwright web server runs. `lint:arch` runs Dependency Cruiser over `src/server/app` and enforces the four rules
   in `.dependency-cruiser.cjs` (link to `src/server/app/docs/architecture.md#enforced-boundaries`).
8. `## AUTHENTICATION (trade-imports-defra-id-stub)` — the current README's section (lines 94–116) with the
   workspace URL corrected to `https://github.com/DEFRA/trade-imports-workspace` (it says `…-animals-workspace`
   today) and "create an env file" made concrete: "create `.env` at the repo root (read by `npm run dev`)".
   Keep the five `DEFRA_ID_*` lines and the `STUB_MODE=true` paragraph verbatim.
9. `## Docker` — plants lines 180–213 with the image name `trade-imports-ins-frontend` and D11's run lines:
   `docker run -p 3002:3002 -e PORT=3002 trade-imports-ins-frontend:development` (and the production twin), preceded
   by: "The image's `ARG PORT` defaults to 3000; pass `PORT` to serve on the service's port."
10. `### Local stack` — plants lines 215–232 verbatim with `-e ins-frontend`.
11. `## SonarCloud` and `## Licence` — plants lines 244–259 verbatim.

No `## Lighthouse` section (ins has none). No `## Proxy` (D2).

---

## 3. New files — full intent, and the reference file to imitate

All six live in `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/docs/`.
Every path named below was verified to exist at `9d1e58a`; cite it as a relative link (D9). Facts in **bold** are
load-bearing and must appear.

### N1 `README.md` — imitate plants' `app/docs/README.md`

- Title `# Application documentation`. Opening: `src/server/app/` is the whole application — the pages a trader
  sees, the clients that reach the services behind them, and the kit the pages share. **There is no platform/set
  split**: `features/` sits one level down from `app/`, and `routes.js` registers what `features/index.js` exports.
- `## The served surface` — the nine application routes exactly as
  [`routes.test.js`](../routes.test.js) pins them (`GET /`, `GET /address-book`, `GET|POST /address-book/add`,
  `GET /address-book/{id}`, `GET|POST /address-book/{id}/edit`, `GET|POST /address-book/{id}/delete`), every one
  behind the `session` auth strategy, every `{id}` validated by
  [`address-id-params.js`](../features/address-book/address-id-params.js) as a 24-hex Mongo ObjectId (a mismatch
  is a 404). The chassis adds `/health`, `/auth/*` (or `/auth/stub-sign-in` in stub mode), `/signout` and
  `/public/*`. The dashboard's row links leave the service for the animals frontend
  (`TRADE_IMPORTS_ANIMALS_FRONTEND_URL`), which owns the notification.
- `## Guides` — Architecture, Feature anatomy, Services, Testing. `## Recipes` — Add a page.
- One closing paragraph: read [`features.md`](features.md) before adding a page; the copy convention tests and the
  route list test are the guards that catch a half-finished page.

### N2 `architecture.md` — imitate plants' `app/docs/architecture.md`

- Title `# Architecture: chassis and application`. Opening: two parts, one boundary, enforced by Dependency Cruiser in
  [`.dependency-cruiser.cjs`](../../../../.dependency-cruiser.cjs).
- `## The chassis` — everything outside `src/server/app/`: [`src/server/server.js`](../../server.js) builds the
  Hapi server and registers logging, tracing, metrics, secure context, pulse, the session cache, Nunjucks, Scooter,
  CSP, CSRF, Cookie, Bell, the auth plugin (or the stub sign-in routes when `isStubMode()`), then
  [`router.js`](../../router.js); `router.js` registers `health`, then — only when `auth.enabled` — the application
  plugin and `signout`, then static files. [`src/plugins/auth.js`](../../../plugins/auth.js) (session strategy,
  Bell/Defra ID, the stub-mode short circuit), [`src/plugins/csrf.js`](../../../plugins/csrf.js),
  [`src/auth/`](../../../auth/) (token verification, permissions, safe redirects),
  [`src/config/config.js`](../../../config/config.js) (convict; validated strict at boot),
  [`src/config/nunjucks/`](../../../config/nunjucks/nunjucks.js), [`src/server/common/`](../../common/) (helpers,
  `constants/status-codes.js`, `services/mode.js`, `test-helpers/`), `src/server/auth/`, `health/`, `signout/`.
  **The error page**: [`common/helpers/errors.js`](../../common/helpers/errors.js)'s `catchAll` renders
  `shared/error` through `kit.base()` with the status-keyed message from `sharedCopy.errorPage`. **The unauthorised
  page**: [`app/auth/unauthorised.njk`](../auth/unauthorised.njk) is the one view outside `features/`, rendered by
  the chassis's auth controller with `base(sharedCopy.unauthorised.title)`.
- `## The application` — [`routes.js`](../routes.js) is the composition point: a Hapi plugin named
  `import-notification-service` whose `register` calls `server.route(allRoutes)`, and **the only production module
  outside `features/` that imports `features/**`**. [`features/index.js`](../features/index.js) imports each
  feature's controller namespace and spreads `routes` into `allRoutes` — nothing else (no dispatch table, no
  bindings). The four directories: `features/` (one folder per feature — `dashboard/`, `address-book/`),
  `services/` (one folder per upstream — `address-book/`, `countries/`, `ins-backend/`, each `index.js` +
  `client.js` + `stub.js`), `shared/` (`kit.js`, `paths.js`, `copy.js`, `copy-leaves.js`, `copy.en.js`,
  `copy.cy.js`, `layout.njk`, `error.njk`, `error-summary.njk`), `lib/` (`http-client.js`, `http-status.js`,
  `validate/`). Plus the two convention tests beside `routes.js`:
  [`copy-convention.test.js`](../copy-convention.test.js) and [`copy-parity.test.js`](../copy-parity.test.js).
- `## Run mode` — one paragraph: [`isStubMode()`](../../common/services/mode.js) reads `STUB_MODE` and refuses it
  in production; **it switches the data and the sign-in together** — a stub run serves in-memory data from each
  service's `stub.js` and signs its own session at `/auth/stub-sign-in`; a real run uses the HTTP clients and Defra
  ID. Each service barrel asks `isStubMode()` **per call**, so a test can flip the mode with `config.set`.
- `## Templates` — Nunjucks roots configured in [`nunjucks.js`](../../../config/nunjucks/nunjucks.js): the
  govuk-frontend dist, `src/server/app` (resolves `shared/layout.njk`, `shared/error-summary.njk`,
  `shared/error.njk`, `auth/unauthorised.njk`) and `src/server/app/features` (resolves feature views);
  `src/server/common/components` is also listed and is empty. Vision's `path` is `['server/app',
  'server/app/features']`, so **a feature view name is its path under `features/` without the extension**:
  `dashboard/template`, `address-book/add/template`. Every page template `{% extends "shared/layout.njk" %}` and
  fills `{% block journeyContent %}`. [`context.js`](../../../config/nunjucks/context/context.js) supplies
  `assetPath`, `getAssetPath()` (from webpack's `.public/assets-manifest.json`), `dashboardUrl`, `addressBookUrl`,
  `activeNavigationItem`, `userSession` and `crumb` to every render.
- `## Client assets` — webpack ([`webpack.config.js`](../../../../webpack.config.js)) builds
  `src/client/javascripts/application.js` and `src/client/stylesheets/application.scss` into `.public/`, copies
  govuk-frontend's assets to `/public/assets`, and writes the manifest `getAssetPath()` reads. `npm run
  build:frontend` once; `npm run dev` watches. **A missing webpack entry is a silent 404** — the template renders,
  the bundle does not.
- `## Enforced boundaries` — Dependency Cruiser scans `src/server/app` (tests, fit specs, `fit/` folders and `.njk`
  excluded). Its four error-level rules: **`feature-isolation`** (a feature never imports a sibling feature),
  **`routes-is-the-gateway`** (only `routes.js` imports `features/` from outside `features/`),
  **`shared-and-lib-are-leaves`** (`shared/` and `lib/` import nothing from `features/` or `services/`),
  **`no-circular`**. `.dependency-cruiser-known-violations.json` is empty, so `npm run lint:arch` is green on the
  rules themselves; `npm run depcruise:graph` draws `ins-arch.svg` (needs Graphviz). Close with plants' sentence:
  "Tests may compose real layers, but production code cannot use test exemptions."
- `## How this differs from the journey frontends` — D7's list, one bullet each, present tense ("ins has no…",
  "countries are fetched per request rather than primed at boot"). This is the **only** place any of the words
  obligation, set, journey, engine, bridge, flow, dispatch, binding, `configure*`, `prime` may appear in the docs.

### N3 `features.md` — imitate plants' set `features.md`

- Title `# Feature anatomy`. Opening (plants lines 3–6 adapted): `src/server/app/features/` holds one folder per
  feature; each is a vertical slice of paths, controllers, copy, templates, view models and tests, and
  [`features/index.js`](../features/index.js) is the barrel whose `allRoutes` spreads every feature's routes.
- `## Two shapes` — **`dashboard/`** is the single-page shape: `controller.js`, `template.njk`,
  `controller.test.js`, `copy/`, `view-model/list.js` (+ test), `fit/dashboard.fit.spec.js`.
  **`address-book/`** is the multi-page group: one folder per page (`list/`, `add/`, `view/`, `edit/`,
  `delete/`) each holding `controller.js`, `template.njk` and `controller.test.js`; group-wide modules at the
  root — [`fields.js`](../features/address-book/fields.js) (`FIELD_RULES`, `FIELDS`, `formValuesOf`,
  `addressRules(countryCodes)`), [`address-countries.js`](../features/address-book/address-countries.js) (GB
  first; throws when reference data is empty; `buildCountrySelectItems`; `resolveCountryCodeFromSearchTerm`),
  [`address-id-params.js`](../features/address-book/address-id-params.js) (`addressIdParams`,
  `addressIdRouteOptions`), [`stored-address.js`](../features/address-book/stored-address.js) (`loadStoredAddress`
  404s a tombstoned record; `boomFor` maps client errors to Boom), [`success-banner.js`](../features/address-book/success-banner.js)
  (yar-backed, read-once); one shared `copy/` pair; `view-model/list.js`; and `fit/` with five specs plus the
  fixtures `address-form.js` and `seed-address.js`.
- `## Paths` — [`shared/paths.js`](../shared/paths.js) is the **only module that writes a URL**. Each public URL
  has a builder (`dashboardPath()`, `addressBookPath()`, `addressAddPath()`, `addressPath(id)`,
  `addressEditPath(id)`, `addressDeletePath(id)`) and each parameterised one a `*RoutePath()` twin with the Hapi
  `{id}` placeholder; ids are `encodeURIComponent`ed. Controllers pass a `*RoutePath()` to `kit.pageRoutes` and put
  every href the template needs into the view model (`listHref`, `addHref`, `editHref`, `deleteHref`, `backLink`
  through `kit.base`). [`paths.test.js`](../shared/paths.test.js) pins every public URL as a test;
  [`routes.test.js`](../routes.test.js) pins the exact route list.
- `## The page kit` — [`shared/kit.js`](../shared/kit.js): **`base(title, { backLink, recoverableError })`** returns
  `{ layout, pageTitle, backLink, sharedCopy, recoverableError, contentColumnClass }` (two-thirds column by
  default; a page that lays out a table overrides `contentColumnClass: kit.surfaceClass('display')`);
  **`pageRoutes(path, { get, post }, options = routeOptions)`** emits the GET and, when `post` is given, the POST
  (`routeOptions` is `{ auth: 'session' }`; the `{id}` pages pass `addressIdRouteOptions`);
  **`errorSummary(errors)`** turns a `{ field: message }` map into the govukErrorSummary model or `null`;
  **`requireOrganisationId(request)`** throws `Boom.forbidden` when the session carries none; `sharedCopy` is the
  resolved chrome copy; `fieldError` is exported and unused (templates read the map directly, below).
- `## Controllers` — the shape every ins controller takes, citing
  [`add/controller.js`](../features/address-book/add/controller.js): module-level `logger`, `view`, `copy`; a
  `buildView(h, model)` helper spreading `kit.base(...)` and adding `copy`, `errors`, `errorSummary:
  kit.errorSummary(errors)`; bare `get`/`post` arrows; `HTTP_STATUS_*` constants from
  [`lib/http-status.js`](../lib/http-status.js); POST reads `request.payload`, honours `cancel`, validates,
  calls the service, sets the success banner, redirects; a service failure logs once (`logger.error({ err, orgId },
  '…')`) and re-renders with `recoverableError: true` and status 500 (the layout renders the banner); a 400 from the
  address book re-renders with `mapApiErrorsToFormErrors(err.body)`; `export const routes = kit.pageRoutes(...)`.
  The `{id}` pages load through `loadStoredAddress` and throw `boomFor(err, () => logger.error(...))`.
- `## Copy and templates` — the copy pair rule in full: a templated feature owns `copy/copy.en.js`,
  `copy/copy.cy.js` and `copy/copy.test.js`; both export `copy`; a leaf is a non-empty string or a
  string-returning function (parameterised copy, e.g. `successBanner.added(name)`); `cy` must have the **same
  paths, leaf kinds and function arities** as `en`, and every string leaf must differ from its English unless
  listed in `copy-parity.test.js`'s `IDENTICAL_ALLOWLIST` (empty); no copy file may sit at a feature root. The
  controller resolves `const copy = copyFor({ en, cy })` from [`shared/copy.js`](../shared/copy.js) and passes it
  to the view. Shared chrome copy (`layout`, `unauthorised`, `errorSummary`, `recoverableError`, `errorPage`) and
  `validatorDefaults` live in [`shared/copy.en.js`](../shared/copy.en.js) / `copy.cy.js` and reach every view as
  `sharedCopy`. D12's Welsh sentence. Templates: `{% extends "shared/layout.njk" %}`, macros imported at the top,
  `{% block journeyContent %}`, `{% include "shared/error-summary.njk" %}` above the `<h1>`, a hidden `crumb`
  input in every form, fields rendered with govuk macros, `errorMessage: errors.field and { text: errors.field }`,
  **input `name`, `id` and error-map key identical** so the summary link focuses the control. Stay inside the
  govuk-frontend toolbox.
- `## Validation` (D5) — [`lib/validate/index.js`](../lib/validate/index.js) exports `validate(schema, payload)` →
  `{ value, errors }` (`errors` null on success, else `{ field: firstMessage }`), `compose` and the named
  factories (`requiredMaxText`, `maxText`, `requiredOneOf`, `requiredEmail`, dates, times…); messages come from the
  feature's copy (`errors.<field>.required/maxLength/format`) with `validatorDefaults` as fallbacks; build a
  service-backed rule (`requiredOneOf('countryCode', codes, …)`) inside POST from the countries just fetched;
  persist `value`, never the raw payload — `formValuesOf(payload)` is validated so only the nine address fields
  reach the API. `address-id-params.js` stays on Joi because Hapi's `validate.params` takes a Joi schema.
- `## Client JavaScript` — plants lines 111–120 adapted: [`src/client/javascripts/application.js`](../../../client/javascripts/application.js)
  initialises the govuk components and `address-book-success-banner.js`; a page needing more adds a named `entry`
  to `webpack.config.js` and loads it with `getAssetPath('<entry>.js')`. "Build config is load-bearing."
- `## Tests` — one paragraph pointing at [testing.md](testing.md): controller, copy and view-model tests sit beside
  the feature; browser specs are `*.fit.spec.js` in the feature's `fit/` folder and run in the Playwright
  `features` project; every feature spec includes initial-render and error-state axe checks.

### N4 `add-a-page.md` — imitate plants' set `add-a-page.md`

- Title `# How to add a page`. Opening: "Use this recipe for one new page. Run every command from the repo root.
  All other paths are relative to `src/server/app/`."
- `## Read these files first` — **`features/address-book/add` is the smallest complete page**: one form, one
  service call, one template, both copy bundles, one controller test and one feature spec. List with links:
  `features/address-book/add/controller.js`, `add/template.njk`, `add/controller.test.js`,
  `features/address-book/fit/add.fit.spec.js`, `fit/address-form.js`, `features/address-book/copy/copy.en.js`,
  `copy.cy.js`, `copy.test.js`, `features/address-book/fields.js`, `shared/paths.js`, `shared/kit.js`,
  `features/index.js`, `routes.test.js`. Add plants' warning adapted: these files take the same shape as the
  journey frontends' pages but never import from them; read the files above, not the journey paths.
- `## 1. Name the path` — add a builder to `shared/paths.js` (and a `*RoutePath()` twin if parameterised); add its
  case to `shared/paths.test.js`; the URL appears nowhere else.
- `## 2. Create the feature folder` — the tree (plants lines 50–62 adapted): for a new feature
  `features/<name>/{controller.js, controller.test.js, template.njk, copy/{copy.en.js, copy.cy.js, copy.test.js},
  fit/<name>.fit.spec.js}`; for a page joining `address-book`, a `features/address-book/<page>/` folder with
  `controller.js`, `template.njk`, `controller.test.js`, its spec in the group's `fit/`, its strings in the group's
  `copy/`. Create both locale bundles and their test as soon as the template exists — link to
  `features.md#copy-and-templates`.
- `## 3. Write the controller` — the shape from `features.md#controllers`, as steps: import the service barrel,
  `HTTP_STATUS_*`, `validate`, `kit`, `copyFor`, the path builders, `createLogger`; resolve `copy`; `buildView`;
  GET renders; POST: read the payload, honour `cancel`, validate with `lib/validate`, re-render raw values with 400
  on error, call the service, set the success banner, redirect; a thrown service error logs once and re-renders
  with `recoverableError: true` and 500; `export const routes = kit.pageRoutes(<path>(), { get, post })`. Use
  explicit Hapi route objects only when the page needs more than a GET/POST pair. A page under `/address-book/{id}`
  passes `addressIdRouteOptions` and loads through `loadStoredAddress` + `boomFor`.
- `## 4. Add copy and the Nunjucks view` — copy rule pointer; template rules from `features.md`; view name =
  `<feature>/<page>/template`; run `npm test` and fix the local copy test, `copy-convention.test.js` and
  `copy-parity.test.js` before continuing.
- `## 5. Register the routes` — import the controller namespace in `features/index.js`, spread `routes` into
  `allRoutes`; **`routes.test.js` lists every route and must gain the new ones** — the test is the guard that a
  page is registered exactly once.
- `## 6. Reach a service` — use the barrel under `services/<name>/index.js`; a new upstream gets `index.js` +
  `client.js` + `stub.js` in the shape [services.md](services.md) describes, and the stub must serve enough for the
  feature spec.
- `## 7. Register client JavaScript when needed` — plants lines 280–290 adapted (entry under
  `src/client/javascripts/`, named `entry` in `webpack.config.js`, `getAssetPath('<entry>.js')`).
- `## 8. Add unit tests` — `controller.test.js` in the shape of `add/controller.test.js`: `vi.mock` of
  `get-oidc-config.js`, `describe.sequential`, `runInRealMode()`, `createServer()` + `initialize()` in `beforeAll`,
  `server.stop({ timeout: 0 })`, `config.set('csrf.enabled', false)` and `serveCountries(...)` in `beforeEach`,
  `server.inject` with `auth: sessionAuth('<unique id>')`, nock scopes from `real-mode.js` for every upstream call,
  `scope.isDone()`; cover GET render, every validation rule's message, raw values preserved on 400, the exact API
  body on success and the redirect, the API 400 re-render, the upstream 5xx → 500 + banner, cancel. Extend the
  feature's `copy.test.js`. Assert English literals — a literal pin catches copy drift.
- `## Playwright feature test` — plants lines 318–341 adapted: `features/<name>/fit/<name>.fit.spec.js` or the
  group's `fit/`; `import { signIn } from '<relative>/fit/sign-in.js'`; **every test signs in with its own
  organisation id** (`stub-org-<page>-<case>`, with `crypto.randomUUID()` when the test writes) because the
  address-book stub keys its data by organisation — `-empty` and `-paginated` suffixes select the empty and
  30-record seeds, anything else one seed at `SEED_ADDRESS_ID`; raw role/label/copy locators; auto-waiting; no
  sleeps, no page objects; `getByRole('link', { name: 'Back', exact: true })` — the phase banner's "feedback" link
  also matches "Back" without `exact`. Cover: initial render, happy-path save and redirect, each validation rule
  (via `expectErrorFocusOn`), preserved values, cancel/back navigation.
- `## Accessibility test` — `expectNoSeriousOrCriticalAxeViolations(page, name)` from `address-form.js` on the
  initial render and on the validation-error state (`await expect(page.getByRole('alert')).toBeVisible()` first);
  tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`; serious or critical fails.
- `## 9. Run every check`:

  ```bash
  npm run format:check
  npm run lint
  npm test
  npm run test:fit
  ```

  plus plants' green sentence ("Green means every command exits with code 0, Vitest has no failed tests,
  Playwright has no failed specs, and lint has no errors.") and: "Pass `PORT=3052` to `npm run test:fit` when the
  workspace stack is serving this frontend on 3002."

### N5 `services.md` — imitate plants' two `services.md`

- Title `# Services`. Opening: `src/server/app/services/` holds one folder per upstream, each with the same three
  files — **`index.js`** the barrel a feature imports, **`client.js`** the HTTP client, **`stub.js`** the in-memory
  stand-in — and nothing imports `client.js` or `stub.js` from outside its folder.
- `## Run mode` — plants' platform paragraph (lines 6–15) adapted, plus: the barrel chooses **per call**
  (`isStubMode() ? stub : client`), no priming at boot, so a reference-data outage does not stop the server
  starting and a test can switch modes with `config.set('stubMode', …)`.
- `## The three services` — one `###` each:
  - **address-book** ([`index.js`](../services/address-book/index.js)): `listAddresses(orgId, { page, q,
    countryCode })`, `createAddress(orgId, body)`, `getAddress(orgId, id)`, `updateAddress(orgId, id, body)`,
    `deleteAddress(orgId, id)`, plus `mapApiErrorsToFormErrors(problemBody)` (first message per field) and
    `isValidationFailure(err)` (a 400 carrying `errors`). The [client](../services/address-book/client.js) sends
    the organisation as the `Trade-Imports-Organisation-Id` header **and** in the path (the address book runs no
    in-service authentication and trusts that header — it must always come from the session), the trace id under
    the configured `tracing.header`, **refuses a missing organisation** rather than asking for `undefined`, raises
    a 400 as a validation failure with the problem body, and everything else through `throwOnError`. The
    [stub](../services/address-book/stub.js) keeps a `Map` per organisation, seeded by the id's suffix (`-empty`,
    `-paginated` → 30, otherwise `Stub Farm 1` at `000000000000000000000001`), and mints 24-hex ids because the
    `{id}` routes validate an ObjectId.
  - **countries** ([`index.js`](../services/countries/index.js)): `getCountries(blocks)` — the reference-data
    `/countries` list, or the stub's `COUNTRIES`. A failure is thrown, not logged; the caller logs with context.
    Feature-side, [`address-countries.js`](../features/address-book/address-countries.js) puts GB first and throws
    on an empty list.
  - **ins-backend** ([`index.js`](../services/ins-backend/index.js)): `listNotifications({ page, sort,
    referenceNumber })` — the aggregated notifications the dashboard lists; the stub holds four, one soft-deleted
    and never returned; the dashboard is not scoped to an organisation.
- `## Configuration` — a table of convict key → env var → default: `tradeImportsAddressBookApi.baseUrl` /
  `TRADE_IMPORTS_ADDRESS_BOOK_URL` / `http://localhost:8089`; `tradeImportsReferenceDataApi.baseUrl` /
  `TRADE_IMPORTS_REFERENCE_DATA_URL` / `http://localhost:8086`; `tradeImportsInsBackendApi.baseUrl` /
  `TRADE_IMPORTS_INS_BACKEND_URL` / `http://localhost:8090`; `tradeImportsAnimalsFrontend.baseUrl` /
  `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` / `http://localhost:3000` — the last is **browser-visible** (the dashboard's
  row links), so under the workspace stack it stays `localhost` while the three API URLs use
  `host.docker.internal`.
- `## Shared HTTP helpers` — [`lib/http-client.js`](../lib/http-client.js): `throwOnError(response)` (attaches
  `status`, `statusText`, `body`; message from `detail`/`message`/`title`/statusText), `parseProblemBody`,
  `errorMessageFromBody`; [`lib/http-status.js`](../lib/http-status.js): the three constants controllers use.
- `## Testing a service` — pointer to [testing.md](testing.md#service-tests): every client is tested against nock at
  its base URL under `runInRealMode()`; every stub under `refuseOutboundHttp()`.
- `## Out of scope` — plants' closing adapted: no document upload, no outbox, no event publishing; the notification
  itself is owned by the journey frontend the dashboard links to.

### N6 `testing.md` — imitate plants' two `testing.md`

- Title `# Testing`. "Run commands from the repository root."
- `## Unit suite` — `npm test` builds the client (`pretest`) then runs Vitest with coverage; `npm run test:watch`
  neither. [`vitest.config.js`](../../../../vitest.config.js): globals, Node environment, `TZ=UTC`,
  **`STUB_MODE=true` for the whole suite** — a test that needs the HTTP clients opts into real mode itself. Tests
  sit beside their subject. Convention checks: [`routes.test.js`](../routes.test.js) (the exact route list, session
  auth on every route, `addressIdParams` on every `{id}` route), [`copy-convention.test.js`](../copy-convention.test.js),
  [`copy-parity.test.js`](../copy-parity.test.js), [`shared/paths.test.js`](../shared/paths.test.js),
  [`shared/kit.test.js`](../shared/kit.test.js), [`shared/layout.test.js`](../shared/layout.test.js) (service
  navigation, phase banner, back link, banner, title prefix, surfaces, assets, footer).
- `## Controller tests` — the pattern, citing [`add/controller.test.js`](../features/address-book/add/controller.test.js)
  and the helpers in [`common/test-helpers/`](../../common/test-helpers/): `real-mode.js` (`runInRealMode()`,
  `refuseOutboundHttp()`, `addressBookApi()`, `referenceDataApi()`, `insBackendApi()`, `serveCountries(list)`),
  `mock-auth.js` (`sessionAuth(sessionId, overrides)`, `mockOidcConfig`), `test-server.js`. **Mock at the network
  boundary**: nock answers the HTTP calls the real clients make; no `vi.mock` of a service barrel, no `global.fetch`
  mock. The real server boots (`createServer()` + `initialize()`), `server.inject` with a session, assertions on
  status, redirect location, rendered HTML literals and `scope.isDone()`. CSRF is switched off per test with
  `config.set('csrf.enabled', false)`. Each `sessionAuth` id is unique per test.
- `## Service tests` — `services/<name>/<name>.test.js` under `runInRealMode()`: request path, query, organisation
  and trace headers (`getTraceId` mocked with a hoisted `vi.fn`), parsed body, the 400 problem shape, the refusal
  without an organisation; an `in stub mode` describe under `refuseOutboundHttp()` pins the seeds the fit specs
  depend on; `ins-backend/stub.test.js` covers the dashboard stub.
- `## Browser tests` — plants' "Browser-test projects" adapted: two Playwright projects in
  [`playwright.config.js`](../../../../playwright.config.js), both frontend integration tests ("fit") — the real
  server and browser, every external integration stubbed: **`smoke`** runs [`fit/smoke.fit.spec.js`](../../../../fit/smoke.fit.spec.js)
  (sign in → dashboard → address book → add → view → delete, then axe; it names headings and buttons through the
  copy modules); **`features`** runs `src/server/app/features/**/*.fit.spec.js` (six specs, English literals). The
  `webServer` boots `npm run fit:start` with `STUB_MODE=true`, so no other service runs. **Default port 3002 — the
  port the workspace stack serves this frontend on — so pass `PORT=3052` when the stack is up; `npm run test:fit:ci`
  does.** `npm run playwright:install` once (Chromium). Helpers: [`fit/sign-in.js`](../../../../fit/sign-in.js)
  (`signIn(page, { organisationId })` → `/auth/stub-sign-in`), [`address-form.js`](../features/address-book/fit/address-form.js)
  (labels, `validAddress`, `fillValidAddress`, `expectErrorFocusOn`, the two validation tables,
  `expectNoSeriousOrCriticalAxeViolations`), [`seed-address.js`](../features/address-book/fit/seed-address.js).
  The organisation-id isolation rule and the `-empty`/`-paginated` convention. Locator rules (no sleeps, no page
  objects, `exact: true` on "Back"). On failure read `test-results/<spec>/error-context.md` and the HTML report in
  `playwright-report/`. `npm run fit:start:workspace` starts the app against the workspace stack after
  `scripts/check-workspace-stack.js` confirms the three upstreams answer `/health`.
- `## Deployed end-to-end tests` — D6's facts, in plants' voice (its set `testing.md` lines 50–56 and
  `test-ownership.md` lines 26–51 adapted): what belongs there (needs the published image and the other services),
  what belongs here (anything Vitest or a fit spec can prove), the same-branch-name rule, and that ins has no
  delegating `e2e-tests.yml` so a PR shows unit/format/lint/coverage and the FIT job only — "say so plainly rather
  than implying E2E ran".
- `## Architecture and formatting` — plants' platform section (lines 33–39): `npm run lint` = JS + stylesheet +
  Dependency Cruiser; `npm run format` / `format:check`.
- `## Required checks for a change` — the same four-command block as N4 §9 and the green sentence.

---

## 4. Imports — the rule for rewriting imports this stage disturbs

None. No JavaScript, Nunjucks or JSON file changes. The only "imports" are markdown links (D9).

---

## 5. Tests — which move, which change, which are new, and what each pins

None move, none change, none are new. The ladder proves the suite is untouched: **55 files / 494 tests**, the
same numbers as `logs/s10-build-tooling-ins-test.log`. `npm test`'s `pretest` webpack build also proves D4 (the
missing partials directory on the Sass load path is tolerated).

---

## 6. Invariants to prove

Run each from the repo root; write outputs to `~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/`
and read each log once.

**A. Public URL surface unchanged (invariant 1).** No source changes, so:
`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached --name-status > …/logs/s11-docs-name-status.log`
must list exactly: `M README.md`, `A src/server/app/docs/README.md`, `A …/architecture.md`, `A …/features.md`,
`A …/add-a-page.md`, `A …/services.md`, `A …/testing.md`, and `D` for the seven paths in §1 — 14 entries, nothing
with a `.js`, `.njk`, `.json` or `.scss` extension. `routes.test.js` runs in the ladder and pins the nine routes.

**B. Every relative link resolves (D9).**
`grep -rno "]([^)h][^)]*)" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/docs ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/README.md > …/logs/s11-docs-links.log`
(every link whose target does not start with `h`, i.e. every non-`https` link). Read the log once; for each
distinct target, resolve it against the linking file's directory and strip any `#fragment`; then prove the set
exists with **one** `ls -d <path> <path> …` call per doc file (a missing path makes `ls` exit non-zero and name
it). Fragments must match a heading in the target file — check every fragment this plan names
(`#the-served-surface`, `#enforced-boundaries`, `#copy-and-templates`, `#controllers`,
`#deployed-end-to-end-tests`, `#service-tests`) by reading the target's headings.

**C. Prettier-clean (D10).** `format:check` is a ladder rung; the docs are inside its glob. Run `npm run format`
first (via `~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo trade-imports-ins-frontend run format`)
and confirm `git diff --cached --stat` afterwards touches only the files in A.

**D. No history language, no stage ids (D8, invariant 6).**
`grep -rniE "\bs(0[1-9]|1[0-3])-|moved from|renamed from|formerly|previously|migrat|programme" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/docs ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/README.md > …/logs/s11-docs-history-words.log`
must be empty.

**E. Journey vocabulary confined to one section (D7).**
`grep -rliE "obligation|dispatchPages|configure[A-Z]|bindings?|sets/|journeys/|prime\(\)|engine/|bridge/" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/docs > …/logs/s11-docs-journey-words.log`
must list `architecture.md` only. Then `grep -n` the same pattern in `architecture.md` and confirm every hit sits
under `## How this differs from the journey frontends` (line numbers after that heading). Note the README's
opening paragraph says "No obligation platform, no journey" — the README is outside this grep's path on purpose;
that one sentence is allowed.

**F. Facts match the code.** Read once and compare against the doc that cites it: `routes.test.js`'s route list
(N1), `kit.js`'s `base` return keys and `pageRoutes` signature (N3), `paths.js`'s export names (N3),
`.dependency-cruiser.cjs`'s four rule names (N2), `playwright.config.js`'s project names and port (N6),
`package.json`'s script names used in E1/N4/N6 (`install:pinned-npm`, `fit:start:workspace`, `test:fit:smoke`,
`test:fit:features`, `test:fit:ci`, `lint:arch`, `depcruise:graph`, `setup:husky`, `playwright:install`),
`config.js`'s four base-URL env vars and defaults (N5), `stub.js`'s seed conventions (N5).

**G. Deletions are safe (D3, D4).**
`grep -rln "compose" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.public --exclude-dir=coverage > …/logs/s11-docs-compose-refs.log`
must list only the `compose()` validator sources (`lib/validate/{validators,index,validate.test}.js`,
`features/address-book/fields.js`, `features/address-book/view-model/list.test.js`, `shared/copy.en.js`) — no
`.yml`, no `README.md`. Then
`grep -rn "ins-frontend/compose\|10-setup-resources\|common/README\|partials/README" ~/git/defra/trade-imports-workspace/docker ~/git/defra/trade-imports-workspace/scripts ~/git/defra/trade-imports-workspace/tim/src ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests --include="*.yml" --include="*.sh" --include="*.js" --include="*.ts" --include="*.md"`
must return nothing.

**H. Unit suite unchanged (invariant 3).** The ladder's test log ends `Test Files  55 passed (55)` /
`Tests  494 passed (494)`.

**I. Invariant 4 (no cross-repo import).** Unchanged from s10's proof: the only `trade-imports-animals` mention
in `src/` is the pre-existing doc comment in `features/dashboard/view-model/list.js`; the docs may name the animals
frontend as the owner of a notification (that is a runtime link, not an import).

---

## 7. Out of scope — leave alone even though it is tempting

- `src/config/nunjucks/nunjucks.js`'s empty `common/components` root and `webpack.config.js`'s two Sass load paths
  for directories that no longer exist — describe them (N2), do not remove them; plants carries the same entries.
- `Dockerfile`'s `ARG PORT=3000` (s12), `publish.yml`'s concurrency typo (s12), the `postinstall`/husky question
  (s10 open question) — the README documents what is, not what should be.
- The phantom Joi import in `lib/validate/validators.js` and `address-id-params.js` — named in N2's differences
  section, not fixed (s12/s13 handoff from s08).
- `sonar-project.properties`, `.sonarlint/`, `.github/dependabot.yml`, `.husky/pre-commit`, `nodemon.json`,
  `.npmignore` — untouched.
- The workspace: no `docs/reference/` note, no `CLAUDE.md` change, no `docker/stack/AGENTS.md` change (D13).
- The Welsh copy: document its status (D12), do not translate or edit it.
- Test files: none are edited, even where a doc would read better with a renamed `describe`.
- The tests repo and its `ins` project: described (D6), not edited.
- `src/client/common/helpers/.gitkeep`: stays (plants tracks it).
