# s10-build-tooling — align the build and dev tooling

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit/Write tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (checked out, level with `origin`, clean tree, HEAD `f97c721`).

Reference files (Read tool paths under `/Users/samfarrington/git/defra/trade-imports-workspace/`; Bash paths under
`~/git/defra/trade-imports-workspace/`):

- `repos/trade-imports-plants-frontend/webpack.config.js` — **animals' file minus its journey-only `documents` entry**
  (the only difference between the two, verified with `diff` at planning time). Copied byte-for-byte (N1).
- `repos/trade-imports-plants-frontend/postcss.config.js` — byte-identical to animals'. Copied (N2).
- `repos/trade-imports-plants-frontend/babel.config.cjs` — byte-identical to animals' **and to ins's today**. Nothing
  to do; §6J proves it.
- `repos/trade-imports-plants-frontend/package.json` — the scripts and the devDependency pins (E1). Plants' and
  animals' differ only in the journey-named scripts (`test:live-animals` / `test:high-risk-plants`, the
  `depcruise:graph` output name, `fit:start:workspace`, `--pass-with-no-tests`, the CI port); plants is the
  reference throughout (D1).
- `repos/trade-imports-plants-frontend/Dockerfile` — byte-identical to animals' except `ARG PORT`. The two
  npm-align blocks come across (E9).
- `repos/trade-imports-plants-frontend/scripts/npm-version.js` — byte-identical to animals'. Copied with one comment
  line changed (N3).
- `repos/trade-imports-plants-frontend/.github/workflows/check-pull-request.yml` — the "Align npm with the version
  pinned in package.json" step and its comment (E10–E12).
- `repos/trade-imports-plants-frontend/.dependency-cruiser.cjs` — byte-identical to animals'. Its L1–L4 rules are
  journey-only; ins takes the **shape** (rule objects, `options`) with the brief's four rules (N5).
- `repos/trade-imports-plants-frontend/playwright.config.js` — the two-project shape (E8).
- `repos/trade-imports-plants-frontend/fit/sign-in.js` — copied verbatim (N7); `fit/journey-smoke.fit.spec.js` —
  the shape of the smoke spec (N8).
- `repos/trade-imports-plants-frontend/scripts/check-workspace-stack.js` — the shape of N4.
- `repos/trade-imports-plants-frontend/src/config/nunjucks/context/context.js` lines 10–15 and 63–66 — the
  webpack manifest read and `getAssetPath` (E2); `context.test.js` — the describe names and the
  `/public/javascripts/application.js` expectation (E3).
- `repos/trade-imports-plants-frontend/src/server/app/shared/layout.njk` lines 21–24 and 131 — no `headIcons`
  override, `getAssetPath('stylesheets/application.scss')` and `getAssetPath('application.js')` (E4).
- `repos/trade-imports-plants-frontend/src/client/stylesheets/_govuk-frontend.scss` — `$moj-assets-path:
  "/public/assets/"`; ins's own file keeps its `pkg:` forward and takes the same assets path (E6, D9).

Baseline (s09's landed ladder on `f97c721`, `logs/s09-layout-ins-test.log` / `logs/s09-layout-ins-test-fit.log`):
unit suite **55 files / 492 tests** green, `format:check` clean, `lint` clean, Playwright **49/49** green. Expected
after this stage: **55 files / 494 tests**, Playwright **50/50** (49 in the `features` project + 1 in `smoke`).

What this stage does: replaces the Vite client build with the journeys' webpack pipeline (`webpack.config.js`,
`postcss.config.js`, the `assets-manifest.json` read in `context.js`, the manifest keys in the layout, the govuk
assets served from `/public/assets`); pins npm at `11.6.2` through `packageManager` and installs that pin in the
Dockerfile and every workflow that runs `npm ci`, regenerating `package-lock.json` under it; adds dependency-cruiser
with four rules and `lint:arch`; adds `scripts/check-workspace-stack.js`; and splits Playwright into a root `fit/`
smoke project and a `features` project. Lighthouse is not touched (D15). 3 files are deleted, 8 are created, 20 are
edited in place.

---

## 0. Decisions (made here so the implementor never has to choose)

| # | Question the brief left open | Decision |
|---|---|---|
| D1 | "Port … from animals"; the direction rule says plants where they differ. | **Plants is the reference for every ported file.** `webpack.config.js` differs from animals' only by animals' journey-only `documents` entry (`../server/app/sets/live-animals/…/documents/client/index.js`), which must not come to ins; `postcss.config.js`, `babel.config.cjs`, `scripts/npm-version.js`, `.dependency-cruiser.cjs` and `fit/sign-in.js` are byte-identical in the two journeys; the Dockerfile differs only by `ARG PORT`. §6J diffs every ported file against plants'. |
| D2 | Invariant 6 says comments are removed aggressively; the reference config files carry explanatory comments. | **Files ported verbatim keep their comments** (`webpack.config.js`, `postcss.config.js`, `scripts/npm-version.js`, `fit/sign-in.js`, the Dockerfile blocks, the workflow step comment). The point of the port is a file that diffs empty against plants'; stripping comments would make every future cross-repo diff noisy. Invariant 6 applies to what this stage **writes for ins**: `context.js`, `.dependency-cruiser.cjs`, `check-workspace-stack.js`, the smoke spec, the tests — none carries a what-comment, a migration comment or a rename comment (§6G). The one comment edited in a ported file is `npm-version.js`'s consumer list (N3), which must be true for ins. |
| D3 | "Regenerate package-lock.json under the pinned npm" — the ambient npm is 11.17.0 (`npm --version` at planning time), `npm install -g` is on the deny list, the implementor may not run bare `npx`, and `tools/npm/npm-in-repo.sh` runs whatever npm is ambient. A lockfile written by 11.17.0 is rejected by `npm ci` under 11.6.2 (plants' first PR went red on exactly this — `Missing: … from lock file`). | **`package.json` gains one ins-only script, `install:pinned-npm`: `npx --yes "$(node scripts/npm-version.js)" install`** (E1). It reads the pin from the same helper the Dockerfile and CI read, so there is one source of truth; `npm run` sets the cwd to the repo, so the inner `npm install` writes `package-lock.json` and `node_modules` there under 11.6.2. The implementor runs it through the committed wrapper — `~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo trade-imports-ins-frontend run install:pinned-npm` — which is allowlisted and hook-clean (`run`, not `install`, after `--prefix`). Neither journey has this script; it is recorded as an s12 backport candidate (the memory that documents the 11.6.2 route names this exact gap). Not chosen: extending `npm-in-repo.sh` (the guard hook refuses to run a tools script that is not committed at HEAD, and the implementor does not commit), and a global install (denied). |
| D4 | Which dependency versions. | **Plants' pins, exactly** (E1): `@babel/preset-env` 7.29.2 → 8.0.2, `autoprefixer` 10.5.4, `babel-loader` 10.1.1, `clean-webpack-plugin` 4.0.0, `copy-webpack-plugin` 14.0.0, `dependency-cruiser` 16.10.4, `postcss-load-config` 6.0.1, `postcss-loader` 8.2.1, `sass-embedded` 1.99.0 → 1.100.0, `sass-loader` 17.0.0, `source-map-loader` 5.0.0, `terser-webpack-plugin` 5.6.1, `webpack` 5.109.2, `webpack-assets-manifest` 6.5.2, `webpack-cli` 7.2.2; in `dependencies`, `cssnano` 7.1.5 → 8.0.2 and `cssnano-preset-default` 7.0.13 → 8.0.2 (they were unused under Vite; `postcss.config.js` uses them now — kept in `dependencies` as plants keeps them). Removed: `vite` 8.0.16 and **`vitest-fetch-mock`** — its only importer is `.vite/setup-files.js`, which nothing loads (`vitest.config.js` has no `setupFiles`; grep at planning time) and which installs a `global.fetch` mock that invariant 8 forbids; the file goes with it (§1). `vite` stays in the tree as vitest's own dependency; that is the journeys' state too (their `overrides` pin it for that reason — not copied, ins's `overrides` block is untouched). `@defra/hapi-connect`, `nock`, `prettier` 3.8.2, `vitest`/`@vitest/coverage-v8` 4.1.8, `eslint` 9.39.2 stay at ins's versions — not this stage's. No `@lhci/cli`, `puppeteer`, `testcontainers`, `eslint-plugin-sonarjs`, `jsdom`, `@ministryofjustice/frontend`, `accessible-autocomplete` (journey-only or Lighthouse, D15). |
| D5 | Which plants scripts come across. | **Come:** `build:frontend`, `frontend:watch`, `dev` / `dev:debug` (`run-p frontend:watch server:…`, keeping ins's `AWS_EMF_ENVIRONMENT=Local`), `fit:start:workspace`, `check:workspace-stack`, `test:fit:smoke` (plants' `test:fit:journeys` renamed, D6), `test:fit:features`, `test:fit:ci` (port 3052, D6), `lint` with `lint:arch`, `lint:arch`, `depcruise:baseline`, `depcruise:graph` (output `ins-arch.svg`; needs graphviz, do not run it), `pretest`. **Stay as ins has them:** `server:watch` / `server:debug` (ins's targeted `--watch ./src/server --watch ./src/config --env-file-if-exists=.env` already leaves `src/client` to webpack — the same effect `nodemon.json`'s ignore list gives the journeys), `test` / `test:watch` (`AWS_EMF_ENVIRONMENT=Local`; no `--exclude ./tests/**` because ins has no `tests/`), `test:fit` without the journeys' `DEMO_SLOWMO=0 DEMO_PACE_MS=0` (journey demo recording) and without `--pass-with-no-tests` (ins has specs in both projects; the flag would mask a wrong `testDir` silently), `security-audit` at `critical`, `git:pre-commit-hook` with its audit, `start` (`node .`, not `--use-strict` — a runtime flag, not build tooling). **Not added:** `postinstall: npm run setup:husky` — it would activate `.husky/pre-commit` on every developer clone (ins's `.git/config` has no `hooksPath` today) and the orchestrator's commit would then run audit + format + lint + the unit suite, with `--no-verify` hook-denied; that is a programme-level choice, recorded as an open question, not a tooling port. |
| D6 | The Playwright split. Animals' root project is `journeys` (`fit/journey-smoke.fit.spec.js`, slowMo 600, video and trace always on, for demo recordings). | **Root project `smoke`, `testMatch: '**/smoke.fit.spec.js'`, `testDir: './fit'`; `features` project over `./src/server/app/features` `**/*.fit.spec.js`.** No slowMo, `video: 'off'`, `trace: 'retain-on-failure'` on both — the demo recording is journey machinery. **Default port 3002 (the service port, as animals' 3000 and plants' 3003), CI port 3052** (animals 3050, plants 3053; ins's old default was 3050). Timeouts stay ins's (60 s test, 10 s expect, 10/15 s action/navigation) — plants' 240 s is sized for a whole journey. `fullyParallel: true`, reporter, `webServer` unchanged. The one smoke test is a trader's whole path through the service — sign in, dashboard, address book, add, view, delete — with an axe check at the end (N8). |
| D7 | Where `signIn` lives. Today it is exported from `features/address-book/fit/address-form.js`, and the dashboard spec imports it from there — a cross-feature import in test code. Plants keeps `signIn` in `fit/sign-in.js` and every feature spec imports it from the root. | **`fit/sign-in.js` is plants' file verbatim (N7); `address-form.js` drops `signIn` (E13); all six feature specs and the smoke spec import it from `fit/` (E14–E19).** `expectNoSeriousOrCriticalAxeViolations` stays in `address-form.js` and the dashboard spec keeps importing it from there — plants inlines an `AxeBuilder` call per spec and ins's helper is the better shape; moving it is not this stage's business (recorded for s12/s13). The dependency-cruiser excludes `/fit/` and `\.fit\.spec\.js$`, so neither import is in the cruised graph (D11). |
| D8 | Strings in the smoke spec. ins's six feature specs assert English literals (s07 D19); plants' smoke spec imports the copy modules. | **The smoke spec follows its reference: it imports `copy.en.js` from `shared/`, `features/dashboard/` and `features/address-book/`** and names every heading, link and button through them. The six feature specs keep their literals — untouched apart from the `signIn` import (E14–E19). |
| D9 | The `headIcons` block and the assets path. ins's layout overrides `headIcons` with five `getAssetPath("node_modules/govuk-frontend/…")` lookups (Vite emitted hashed copies via `src/client/assets.html`); plants' layout has no `headIcons` block, so govuk's template links `{{ assetPath }}/images/favicon.ico` etc., and `context.js` already supplies `assetPath: '/public/assets'`; webpack's `CopyPlugin` copies `govuk-frontend/dist/govuk/assets` (fonts, images, `manifest.json`) to `.public/assets`. | **The `headIcons` block goes (E4); the icons come from `assetPath`** — the context key is already there, unchanged. **`_govuk-frontend.scss` sets `$govuk-assets-path: '/public/assets/'`** (E6): the webpack SCSS rule is `asset/resource` over `postcss-loader` + `sass-loader` with no `css-loader`, so `url()` values are emitted verbatim and must be browser-resolvable — the journeys' MoJ wrapper sets the same path. No `url()` anywhere in ins's own stylesheets (grep at planning time). `src/client/assets.html` and `vite.config.js` go (§1). `themeColor` was read only by the deleted block. |
| D10 | `context.js`. | **Only the manifest lines change** (E2): `.public/assets-manifest.json`, `webpackManifest`, `webpackManifest?.[asset]` (no `.file`), the log message. The function stays synchronous over `request.auth.credentials` (s09 D7). After this the file is animals'/plants' apart from s09's named differences (§6I). |
| D11 | The dependency-cruiser rules. | **Four rules, the brief's, in plants' rule shape** (N5): `feature-isolation` (a feature never imports a sibling — capture-group form of plants' `set-isolation`), `routes-is-the-gateway` (only `app/routes.js` imports `features/` from outside `features/`; `features/index.js` is inside), `shared-and-lib-are-leaves` (`shared/` and `lib/` import nothing from `features/` or `services/`), `no-circular`. **No `no-orphans` rule** — the brief names four, and in ins it would only warn about the fit helpers and `copy-leaves.js` (imported by an excluded test). `exclude.path`: `\.test\.js$`, `\.fit\.spec\.js$`, `/fit/`, `\.njk$` — tests and Playwright helpers may compose across features. `lint:arch` runs with `--ignore-known`, which needs `.dependency-cruiser-known-violations.json` to exist, so `npm run depcruise:baseline` generates it once and it is committed **empty** (`[]`, §6H) — the same file plants tracks. `doNotFollow`, `enhancedResolveOptions`, `cache` verbatim from plants; `collapsePattern` names ins's four app directories. |
| D12 | What `check-workspace-stack.js` probes. Animals probes its one backend's `/notifications`. | **ins probes `/health` on its three upstreams in parallel** — `trade-imports-ins-backend` (8090), `trade-imports-address-book` (8089), `trade-imports-reference-data` (8086), each overridable by the env var `config.js` already names — and lists every one that did not answer (N4). All three expose `/health` (`HealthCheckFilter.java` in each; the stack's compose healthchecks hit it). Any HTTP response proves reachability; only a transport error means the stack is down, as in animals. |
| D13 | Which workflows get the npm-align step. Plants has it in `check-pull-request.yml` (three jobs), `publish.yml` and `lighthouse.yml`; the brief names `check-pull-request.yml`. | **Every ins workflow that runs `npm ci`**: `check-pull-request.yml` (both jobs, E10), `publish.yml` (E11), `publish-hotfix.yml` (E12) — a lockfile written by 11.6.2 fails `npm ci` on the runner's bundled npm otherwise, and the header of `npm-version.js` names its consumers (N3). The step and its comment are plants' verbatim. ins's action versions (`actions/checkout@v6`, `setup-node@v6`) stay — dependabot's, not this stage's. The `$${{ github.workflow }}` typo and `queue: max` in ins's `publish.yml` concurrency block stay too (s12). |
| D14 | Dockerfile. | **ins's file with plants' two blocks inserted** (E9): `COPY … scripts/npm-version.js ./scripts/` + the root-run `npm install --global "$(node scripts/npm-version.js)"` in the development stage, and the same install before `npm ci --omit=dev` in the production stage. `PARENT_VERSION=3.0.5-node24.14.1` (ins's, newer than the journeys' `2.10.1-node24.11.1`) and `ARG PORT=3000` stay (the stack sets `PORT=3002`; the ARG is not this stage's). |
| D15 | Lighthouse. | **Skipped** — no `@lhci/cli`, `puppeteer`, `lighthouserc.cjs`, `scripts/lighthouse/`, `.github/workflows/lighthouse.yml`. Open question recorded on the stage. |
| D16 | Tests. | **`context.test.js` is renamed to webpack and its asset expectation becomes the manifest lookup** (E3) — today the test passes because `viteManifest?.[asset]?.file` is `undefined` and falls back to the raw key; now it exercises the lookup. **`layout.test.js` gains a `describe('assets')` with two tests** (E5) pinning the two manifest keys and the icons-from-`assetPath` — a wrong key loads no CSS and no fit spec would notice (stub pages render without it). **No unit test for `scripts/npm-version.js` or `check-workspace-stack.js`** — neither journey has one; both are top-level side-effect scripts (`process.exit`), and CI plus the Docker build exercise `npm-version.js` on every PR. The smoke spec is the new Playwright test (N8). |
| D17 | Format. | Run `npm run format` once after every edit and generation (it formats `package.json`, the new `.cjs`/`.js` files and the generated `.dependency-cruiser-known-violations.json`) and before the ladder. SCSS, `.njk`, `.yml` and the Dockerfile are outside prettier's globs; `lint:scss` covers the SCSS. |
| D18 | `.public/` holds Vite output (`.public/.vite/`, `.public/src/client/assets.html`, hashed files). | Nothing to do: `.public` is gitignored and `CleanWebpackPlugin` empties it on the first `build:frontend`. |

---

## 1. Moves — every file that moves or is deleted

| From (`~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/`) | To | Why |
|---|---|---|
| `vite.config.js` | deleted | brief |
| `src/client/assets.html` | deleted | brief, D9 |
| `.vite/setup-files.js` | deleted (the `.vite/` directory goes with it — git tracks no empty directories) | D4 |
| `signIn` in `src/server/app/features/address-book/fit/address-form.js` | `fit/sign-in.js` (N7; the function, not the file) | D7 |

Commands (one per Bash call; `git rm` so the index is right first time):

```
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend rm vite.config.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend rm src/client/assets.html
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend rm .vite/setup-files.js
```

Nothing in `docker/`, `compose.yml`, `nodemon.json`, `eslint.config.js`, `stylelint.config.js`,
`sonar-project.properties`, `.dockerignore`, `.prettierignore` or `README.md` names a deleted path (grep at planning
time; `.github/dependabot.yml` names `vitest` and `webpack`, both still present).

---

## 2. Order of work

Do it in this order — several steps depend on the install having happened:

1. §1 deletes.
2. E1 (`package.json`, full content).
3. N1, N2, N3, N5, N7 (the ported files), then N4 and N8 (the written files).
4. Install under the pin (D3), to a log, and read the log once:
   `~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo trade-imports-ins-frontend run install:pinned-npm > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s10-build-tooling-install.log 2>&1`
   Expected: `npx` fetches `npm@11.6.2`, then a normal install log ending `added … packages` (or `changed`), no
   `ERESOLVE`, no `EUSAGE`. §6C checks the lockfile.
5. E2–E19.
6. Generate the dependency-cruiser baseline (N6):
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run depcruise:baseline > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s10-build-tooling-depcruise-baseline.log 2>&1`
   then Read `.dependency-cruiser-known-violations.json` — it must be `[]` (§6H). If it is not, the rules found a
   real violation: fix the import, do not commit a baseline that hides it.
7. `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format > …/logs/s10-build-tooling-format.log 2>&1`
8. The ladder (§6, last block), then the §6 checks, then `git add -A` and stop (§9).

---

## 3. Edits — every file whose content changes

### E1 — `package.json` — full content

```json
{
  "name": "trade-imports-ins-frontend",
  "version": "0.0.0",
  "description": "CDP Frontend Template",
  "sideEffects": false,
  "main": "src/index.js",
  "type": "module",
  "engines": {
    "node": ">=24",
    "npm": ">=11.6.2"
  },
  "packageManager": "npm@11.6.2",
  "scripts": {
    "build:frontend": "NODE_ENV=production webpack",
    "dev": "AWS_EMF_ENVIRONMENT=Local run-p frontend:watch server:watch",
    "dev:debug": "AWS_EMF_ENVIRONMENT=Local run-p frontend:watch server:debug",
    "docker:dev": "npm run dev",
    "fit:start": "NODE_ENV=development node .",
    "fit:start:workspace": "npm run check:workspace-stack && npm run fit:start",
    "check:workspace-stack": "node scripts/check-workspace-stack.js",
    "install:pinned-npm": "npx --yes \"$(node scripts/npm-version.js)\" install",
    "test:fit": "npm run build:frontend && playwright test",
    "test:fit:smoke": "npm run test:fit -- --project=smoke",
    "test:fit:features": "npm run test:fit -- --project=features",
    "test:fit:ci": "PORT=3052 npm run test:fit -- --retries=2 --forbid-only --global-timeout=900000 --reporter=list,html,github",
    "playwright:install": "playwright install --with-deps chromium",
    "format": "prettier --write \"src/**/*.js\" \"**/*.{js,cjs,md,json,config.js,test.js}\"",
    "format:check": "prettier --check \"src/**/*.js\" \"**/*.{js,cjs,md,json,config.js,test.js}\"",
    "frontend:watch": "NODE_ENV=development webpack --watch",
    "git:pre-commit-hook": "npm run security-audit && npm run format:check && npm run lint && npm test",
    "lint": "run-s lint:js lint:scss lint:arch",
    "lint:js": "eslint .",
    "lint:js:fix": "eslint . --fix",
    "lint:scss": "stylelint \"src/**/*.scss\" --cache --cache-location .cache/stylelint --cache-strategy content --color --ignore-path .gitignore",
    "lint:arch": "depcruise src/server/app --config .dependency-cruiser.cjs --ignore-known --output-type err-long --cache",
    "depcruise:baseline": "depcruise src/server/app --config .dependency-cruiser.cjs --output-type baseline > .dependency-cruiser-known-violations.json",
    "depcruise:graph": "depcruise src/server/app --config .dependency-cruiser.cjs --output-type archi | dot -T svg > ins-arch.svg",
    "pretest": "npm run build:frontend",
    "test": "AWS_EMF_ENVIRONMENT=Local TZ=UTC vitest run --coverage",
    "test:watch": "AWS_EMF_ENVIRONMENT=Local TZ=UTC vitest",
    "security-audit": "npm audit --audit-level=critical",
    "server:watch": "nodemon --inspect=0.0.0.0 --ext js,json --legacy-watch --watch ./src/server --watch ./src/config --env-file-if-exists=.env ./src",
    "server:debug": "nodemon --inspect-brk=0.0.0.0 --ext js,json --legacy-watch --watch ./src/server --watch ./src/config --env-file-if-exists=.env ./src",
    "prestart": "npm run build:frontend",
    "start": "NODE_ENV=production node .",
    "setup:husky": "node -e \"try { (await import('husky')).default() } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e }\" --input-type module"
  },
  "author": "Defra DDTS",
  "license": "OGL-UK-3.0",
  "dependencies": {
    "@defra/cdp-auditing": "0.6.1",
    "@defra/cdp-metrics": "0.6.0",
    "@defra/hapi-secure-context": "0.4.0",
    "@defra/hapi-tracing": "1.30.0",
    "@elastic/ecs-pino-format": "1.5.0",
    "@hapi/bell": "^13.1.0",
    "@hapi/catbox-memory": "6.0.2",
    "@hapi/catbox-redis": "7.0.2",
    "@hapi/cookie": "^12.0.1",
    "@hapi/crumb": "^9.0.1",
    "@hapi/hapi": "21.4.9",
    "@hapi/inert": "7.1.2",
    "@hapi/jwt": "^3.2.3",
    "@hapi/scooter": "8.0.0",
    "@hapi/vision": "7.0.3",
    "@hapi/wreck": "^18.1.0",
    "@hapi/yar": "11.0.3",
    "blankie": "5.0.0",
    "convict": "6.2.5",
    "convict-format-with-validator": "6.2.0",
    "cssnano": "8.0.2",
    "cssnano-preset-default": "8.0.2",
    "date-fns": "4.1.0",
    "govuk-frontend": "6.2.0",
    "hapi-pino": "13.0.0",
    "hapi-pulse": "3.0.0",
    "ioredis": "5.8.2",
    "lodash": "4.18.1",
    "nunjucks": "3.2.4",
    "pino": "10.3.1",
    "pino-pretty": "13.1.3"
  },
  "devDependencies": {
    "@axe-core/playwright": "4.12.1",
    "@babel/preset-env": "8.0.2",
    "@defra/hapi-connect": "1.0.1",
    "@playwright/test": "1.61.0",
    "@vitest/coverage-v8": "4.1.8",
    "autoprefixer": "10.5.4",
    "babel-loader": "10.1.1",
    "cheerio": "1.2.0",
    "clean-webpack-plugin": "4.0.0",
    "copy-webpack-plugin": "14.0.0",
    "dependency-cruiser": "16.10.4",
    "eslint": "9.39.2",
    "husky": "9.1.7",
    "neostandard": "0.13.0",
    "nock": "^14.0.1",
    "nodemon": "3.1.14",
    "npm-run-all": "4.1.5",
    "postcss-load-config": "6.0.1",
    "postcss-loader": "8.2.1",
    "prettier": "3.8.2",
    "sass-embedded": "1.100.0",
    "sass-loader": "17.0.0",
    "source-map-loader": "5.0.0",
    "stylelint": "16.26.1",
    "stylelint-config-gds": "2.0.0",
    "terser-webpack-plugin": "5.6.1",
    "vitest": "4.1.8",
    "webpack": "5.109.2",
    "webpack-assets-manifest": "6.5.2",
    "webpack-cli": "7.2.2"
  },
  "overrides": {
    "brace-expansion": "5.0.8",
    "minimatch": "10.2.4"
  }
}
```

Differences from today's file, so nothing else is touched by accident: `engines.npm` and `packageManager` added;
`build:frontend`, `dev`, `dev:debug`, `test:fit`, `test:fit:ci`, `lint` changed; `fit:start:workspace`,
`check:workspace-stack`, `install:pinned-npm`, `test:fit:smoke`, `test:fit:features`, `frontend:watch`, `lint:arch`,
`depcruise:baseline`, `depcruise:graph`, `pretest` added; `cssnano` and `cssnano-preset-default` bumped;
`@babel/preset-env` and `sass-embedded` bumped; twelve webpack-toolchain devDependencies added; `vite` and
`vitest-fetch-mock` removed. Every other line is byte-for-byte today's (D5).

### E2 — `src/config/nunjucks/context/context.js` — full content

```js
import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '../../config.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'
import {
  addressBookPath,
  dashboardPath,
  inAddressBookSection,
  inDashboardSection
} from '../../../server/app/shared/paths.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

let webpackManifest

/**
 * Which service-navigation item the current request sits under, so the layout
 * can mark it active. Section-wide, not page-wide: every address-book page is
 * inside the address book's section of the service, which is why the answer
 * for `/address-book/123/edit` is still `addressBook`.
 *
 * @param {string} [requestPath] - the request path.
 * @returns {string|null} the id of the active navigation item, or null when the
 * request is under none of them.
 */
export function activeNavigationItem(requestPath = '') {
  if (inDashboardSection(requestPath)) {
    return 'dashboard'
  }
  if (inAddressBookSection(requestPath)) {
    return 'addressBook'
  }
  return null
}

export function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    }
  }

  const authData = request.auth?.isAuthenticated
    ? request.auth.credentials
    : null

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    authEnabled: config.get('auth.enabled'),
    activeNavigationItem: activeNavigationItem(request.path),
    dashboardUrl: dashboardPath(),
    addressBookUrl: addressBookPath(),
    userSession: authData
      ? {
          isAuthenticated: true,
          displayName: authData.name || authData.email || 'User',
          email: authData.email
        }
      : {
          isAuthenticated: false
        },
    getAssetPath(asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
    },
    crumb: request.plugins?.crumb ?? request.state?.crumb ?? ''
  }
}
```

Five lines differ from today's: the manifest filename, `let webpackManifest`, the `if`, the assignment, the log
message, and the two `getAssetPath` lines (plants lines 10–15 and 63–66, minus `?.file`). Everything else is s09's.

### E3 — `src/config/nunjucks/context/context.test.js` — five hunks

1. Line 54: `describe('When Vite manifest file read succeeds', () => {` →
   `describe('When webpack manifest file read succeeds', () => {`
2. Lines 99–101 (`'With valid asset path'`): the expectation becomes
   ```js
          expect(contextResult.getAssetPath('application.js')).toBe(
            '/public/javascripts/application.js'
          )
   ```
3. Line 114: `describe('When Vite manifest file read fails', () => {` →
   `describe('When webpack manifest file read fails', () => {`
4. Lines 127–130: the test becomes
   ```js
      test('Should log that the Webpack Manifest file is not available', () => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Webpack assets-manifest.json not found'
        )
      })
   ```
5. Line 139: `describe('Vite manifest file cache', () => {` → `describe('Webpack manifest file cache', () => {`

The mocked manifest JSON (`"application.js": "javascripts/application.js"`, `"stylesheets/application.scss":
"stylesheets/application.css"`) is already webpack-shaped in both places — untouched. 14 tests, unchanged count.

### E4 — `src/server/app/shared/layout.njk` — three hunks

1. Delete lines 19–26 — the whole `{% block headIcons %} … {% endblock %}` block **and the blank line after it**, so
   `{% set manageAccountUrl = "#" %}` is followed by one blank line and then `{% block head %}` (plants lines
   19–21).
2. Line 29: `<link href="{{ getAssetPath('src/client/stylesheets/application.scss') }}" rel="stylesheet">` →
   `<link href="{{ getAssetPath('stylesheets/application.scss') }}" rel="stylesheet">`
3. Line 131: `<script type="module" src="{{ getAssetPath('src/client/javascripts/application.js') }}"></script>` →
   `<script type="module" src="{{ getAssetPath('application.js') }}"></script>`

After this the file differs from plants' only by s09's named hunks (§6I).

### E5 — `src/server/app/shared/layout.test.js` — append one describe

Insert after the `describe('content column width by surface', …)` block and before `describe('kit surfaces', …)`:

```js
describe('assets', () => {
  it('Should link the stylesheet and the script by their webpack manifest keys', () => {
    const $ = load(renderLayout(signedIn))

    expect($('link[rel="stylesheet"]').attr('href')).toBe(
      '/assets/stylesheets/application.scss'
    )
    expect($('script[type="module"]').attr('src')).toBe(
      '/assets/application.js'
    )
  })

  it('Should take the icons from the asset path', () => {
    const $ = load(renderLayout(signedIn, { assetPath: '/public/assets' }))

    expect($('link[rel="icon"][sizes="48x48"]').attr('href')).toBe(
      '/public/assets/images/favicon.ico'
    )
    expect($('link[rel="manifest"]').attr('href')).toBe(
      '/public/assets/manifest.json'
    )
  })
})
```

`renderLayout`'s `getAssetPath: (asset) => \`/assets/${asset}\`` is unchanged — the first test pins the **keys** the
layout passes to it. 24 → 26 tests.

### E6 — `src/client/stylesheets/_govuk-frontend.scss` — full content

```scss
@forward 'pkg:govuk-frontend' with (
  $govuk-assets-path: '/public/assets/',
  $govuk-global-styles: true
);
```

(`sass-loader` 17 resolves the `pkg:` scheme itself — plants' `@forward "pkg:govuk-frontend"` builds under the same
loader; verified in `node_modules/sass-loader/dist/esm/utils.js` `IS_PKG_SCHEME`.)

### E7 — `vitest.config.js` — one line

Line 12: `exclude: [...configDefaults.exclude, '**/*.fit.spec.js'],` →
`exclude: [...configDefaults.exclude, 'fit/**', '**/*.fit.spec.js'],`

(Plants excludes `fit/**` the same way. `fit/sign-in.js` is not a test, but the directory is Playwright's; the
coverage `include: ['src/**/*.js']` already keeps it out of coverage.)

### E8 — `playwright.config.js` — full content

```js
import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the service smoke and the feature coverage (address
 * book, dashboard). Fully self-contained - STUB_MODE=true is set for the
 * webServer below, which serves stub data and skips the Defra ID OIDC
 * exchange, so no other service needs to be running.
 */
const port = Number(process.env.PORT ?? 3002)

export default defineConfig({
  testDir: './fit',
  testMatch: '**/*.fit.spec.js',
  fullyParallel: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'smoke',
      testMatch: '**/smoke.fit.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        video: 'off',
        trace: 'retain-on-failure'
      }
    },
    {
      name: 'features',
      testDir: './src/server/app/features',
      testMatch: '**/*.fit.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        video: 'off',
        trace: 'retain-on-failure'
      }
    }
  ],
  webServer: [
    {
      command: 'npm run fit:start',
      url: `http://localhost:${port}/health`,
      env: { PORT: String(port), STUB_MODE: 'true' },
      timeout: 60_000,
      reuseExistingServer: false
    }
  ]
})
```

### E9 — `Dockerfile` — full content

```dockerfile
ARG PARENT_VERSION=3.0.5-node24.14.1
ARG PORT=3000
ARG PORT_DEBUG=9229

FROM defradigital/node-development:${PARENT_VERSION} AS development
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node-development:${PARENT_VERSION}

ENV TZ="Europe/London"

ARG PORT
ARG PORT_DEBUG
ENV PORT=${PORT}
EXPOSE ${PORT} ${PORT_DEBUG}

COPY --chown=node:node --chmod=755 package*.json ./
COPY --chown=node:node --chmod=755 scripts/npm-version.js ./scripts/

# Same pin as the GitHub Actions workflows: the npm that installs must be the
# npm that generated package-lock.json, otherwise the resolved tree differs and
# `npm ci` rejects the lockfile. Take it from `packageManager` rather than
# inheriting whatever npm PARENT_VERSION's Node happens to bundle, so a base
# image bump cannot silently reintroduce the mismatch. The helper validates the
# field and strips any Corepack integrity suffix, so a malformed pin fails the
# build instead of installing the wrong npm.
#
# Root is needed to write the global prefix; the cache is redirected so this
# root-run install cannot leave root-owned files in the node user's npm cache.
USER root
RUN npm_config_cache=/tmp/npm-root-cache \
    npm install --global "$(node scripts/npm-version.js)"
USER node

RUN npm install
COPY --chown=node:node --chmod=755 . .
RUN npm run build:frontend

CMD [ "npm", "run", "docker:dev" ]

FROM development AS production_build

ENV NODE_ENV=production

RUN npm run build:frontend

FROM defradigital/node:${PARENT_VERSION} AS production
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node:${PARENT_VERSION}

ENV TZ="Europe/London"

# Add curl to template.
# CDP PLATFORM HEALTHCHECK REQUIREMENT
USER root
RUN apk add --no-cache curl
USER node

COPY --from=production_build /home/node/package*.json ./
COPY --from=production_build /home/node/scripts/npm-version.js ./scripts/
COPY --from=production_build /home/node/src ./src/
COPY --from=production_build /home/node/.public/ ./.public/

# See the development stage: `npm ci` must run on the npm named in
# `packageManager`, not the one the base image ships with.
USER root
RUN npm_config_cache=/tmp/npm-root-cache \
    npm install --global "$(node scripts/npm-version.js)"
USER node

RUN npm ci --omit=dev

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD [ "node", "src" ]
```

(`diff` against plants' Dockerfile must show only the `ARG PARENT_VERSION` and `ARG PORT` lines — §6J.)

### E10 — `.github/workflows/check-pull-request.yml` — full content

```yaml
name: Check Pull Request

on:
  schedule:
    - cron: '0 7 * * 1'
  pull_request:
    branches:
      - main
    types:
      - opened
      - reopened
      - synchronize
      - ready_for_review

jobs:
  pr-validator:
    name: Run Pull Request Checks
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Test code and Create Test Coverage Reports
        uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
          cache: npm

      # The npm that installs must be the npm that generated package-lock.json:
      # different npms resolve some transitive trees differently, and `npm ci`
      # then rejects a lockfile generated by the other one. Take the version
      # from `packageManager` rather than inheriting whatever npm the Node
      # version happens to bundle. The helper validates the field and strips any
      # Corepack integrity suffix, so a malformed pin fails the step instead of
      # installing the wrong npm.
      - name: Align npm with the version pinned in package.json
        run: npm install --global "$(node scripts/npm-version.js)"

      - name: Install dependencies
        run: npm ci

      - run: |
          npm run build:frontend
          npm run format:check
          npm run lint
          npm test

      - name: Security audit
        run: npm run security-audit

      - name: Test Docker Image Build
        run: |
          set +e
          docker build --no-cache --tag trade-imports-ins-frontend .
          exit $?

#      - name: SonarCloud Scan
#        if: github.actor != 'dependabot[bot]'
#        uses: SonarSource/sonarqube-scan-action@master
#        env:
#          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  # The frontend owns two Playwright projects — `smoke` and `features` — which
  # boot the app themselves with STUB_MODE=true: stub data and a locally signed
  # session in place of the Defra ID round-trip, auth still enforced (see
  # src/server/auth/stub-sign-in.js), so they need no workspace stack. Kept out
  # of pr-validator so a browser run does not sit in front of the rest of the
  # PR checks.
  playwright:
    name: FIT Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Node
        uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Align npm with the version pinned in package.json
        run: npm install --global "$(node scripts/npm-version.js)"

      - name: Install dependencies
        run: npm ci

      # Chromium only: both projects use devices['Desktop Chrome'].
      - name: Install the Playwright browser
        run: npm run playwright:install

      - name: Run the frontend-owned Playwright suites
        run: npm run test:fit:ci

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: ins-frontend-playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 14
```

Changes from today's file: the align step (with plants' comment) in `pr-validator`; the align step, the Chromium
comment and plants' step names in `playwright`; the `playwright` job comment reworded to name ins's two projects.
Action versions, the inline security audit and the commented SonarCloud block stay as they are (D13).

### E11 — `.github/workflows/publish.yml` — one insert

After the `- name: Test code and Create Test Coverage Reports` / `uses: actions/setup-node@v6` / `with:` block
(line 35, `cache: npm`) and before `- run: |` (line 36), insert:

```yaml
      # See check-pull-request.yml: `npm ci` rejects a lockfile generated by a
      # different npm, so install the version pinned in `packageManager` first.
      - name: Align npm with the version pinned in package.json
        run: npm install --global "$(node scripts/npm-version.js)"

```

(plants `publish.yml` lines 35–39, verbatim.) Nothing else in the file changes.

### E12 — `.github/workflows/publish-hotfix.yml` — one insert

The same four lines plus blank, inserted after line 29 (`cache: npm`) and before line 30 (`- run: |`).

### E13 — `src/server/app/features/address-book/fit/address-form.js` — delete `signIn`

Delete lines 36–45 — the doc comment `/** Signs in via the stub-auth route … */`, the `export async function
signIn(…) { … }` and the blank line after it — so `export const validAddress = { … }` is followed by one blank line
and then `export async function expectNoSeriousOrCriticalAxeViolations`. Nothing else changes.

### E14 — `src/server/app/features/address-book/fit/add.fit.spec.js` — imports

Lines 3–13 become:

```js
import {
  NAME_LABEL,
  expectErrorFocusOn,
  expectNoSeriousOrCriticalAxeViolations,
  fieldLabels,
  fillValidAddress,
  maxLengthValidations,
  requiredValidations,
  validAddress
} from './address-form.js'
import { signIn } from '../../../../../../fit/sign-in.js'
```

### E15 — `src/server/app/features/address-book/fit/delete.fit.spec.js` — imports

Lines 3–7 become:

```js
import { expectNoSeriousOrCriticalAxeViolations } from './address-form.js'
import { SEED_ADDRESS_ID, SEED_ADDRESS_NAME } from './seed-address.js'
import { signIn } from '../../../../../../fit/sign-in.js'
```

### E16 — `src/server/app/features/address-book/fit/edit.fit.spec.js` — imports

Its `from './address-form.js'` named-import list loses `signIn` (keep the rest in their existing order), and
`import { signIn } from '../../../../../../fit/sign-in.js'` is added as the last import line before the first blank
line after the imports. Read the file first; it has the same shape as `add.fit.spec.js`.

### E17 — `src/server/app/features/address-book/fit/list.fit.spec.js` — imports

Lines 3–6 become:

```js
import { expectNoSeriousOrCriticalAxeViolations } from './address-form.js'
import { signIn } from '../../../../../../fit/sign-in.js'
```

### E18 — `src/server/app/features/address-book/fit/view.fit.spec.js` — imports

Lines 3–7 become:

```js
import { expectNoSeriousOrCriticalAxeViolations } from './address-form.js'
import { SEED_ADDRESS_ID, SEED_ADDRESS_NAME } from './seed-address.js'
import { signIn } from '../../../../../../fit/sign-in.js'
```

### E19 — `src/server/app/features/dashboard/fit/dashboard.fit.spec.js` — imports

Lines 3–6 become:

```js
import { expectNoSeriousOrCriticalAxeViolations } from '../../address-book/fit/address-form.js'
import { signIn } from '../../../../../../fit/sign-in.js'
```

(Six `..` from `src/server/app/features/<feature>/fit/` reach the repo root: `address-book`/`dashboard` →
`features` → `app` → `server` → `src` → root. Plants' dashboard spec uses the same idiom at nine levels.)

---

## 4. New files — full intent, and the reference file to imitate

Copy the verbatim ones with `cat` and a redirection — one Bash call each, no pipe:

```
cat ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/webpack.config.js > ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/webpack.config.js
cat ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/postcss.config.js > ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/postcss.config.js
cat ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/scripts/npm-version.js > ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/scripts/npm-version.js
cat ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/fit/sign-in.js > ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/fit/sign-in.js
```

(`scripts/` and `fit/` do not exist yet; a redirection does not create directories. Create each with the Write tool
first — write N4 before the `npm-version.js` copy and N8 before the `sign-in.js` copy — or the `cat` fails with
"No such file or directory".)

### N1 — `webpack.config.js` — plants verbatim (D1)

Single `application` entry (`./javascripts/application.js` + `./stylesheets/application.scss`), `.public` output
under `/public/`, ESM output, babel through `babel.config.cjs`, SCSS as `asset/resource` through postcss + sass with
`loadPaths` naming `src/client/stylesheets` (where `_govuk-frontend.scss` lives — `@use "govuk-frontend"` in
`application.scss` resolves there) plus two `src/server/common/…` paths that do not exist in ins (Dart Sass skips a
missing load path, s09 D20 — keep them for byte-identity), fonts/images as `asset/resource`, Terser in production,
`CleanWebpackPlugin`, `WebpackAssetsManifest` (writes `.public/assets-manifest.json` keyed `application.js` and
`stylesheets/application.scss`), `CopyPlugin` copying `govuk-frontend/dist/govuk/assets` to `.public/assets`,
`target: 'browserslist:javascripts'` (ins's `.browserslistrc` has the `[javascripts]` section).

### N2 — `postcss.config.js` — plants verbatim

`autoprefixer({ env: 'stylesheets' })` and `cssnano` with the default preset for the `stylesheets` browserslist env.

### N3 — `scripts/npm-version.js` — plants verbatim, one comment line

After the copy, edit line 14–15 of the header comment:

```
 * Consumed by .github/workflows/{check-pull-request,publish,publish-hotfix,
 * lighthouse}.yml and by both install stages of the Dockerfile.
```

becomes

```
 * Consumed by .github/workflows/{check-pull-request,publish,publish-hotfix}.yml,
 * by both install stages of the Dockerfile and by `npm run install:pinned-npm`.
```

Nothing else changes (§6J diffs it).

### N4 — `scripts/check-workspace-stack.js` — written (D12; shape from plants')

```js
/**
 * Checks that the workspace services ins talks to are reachable before a
 * workspace-backed E2E run.
 *
 * Exit 1 means the stack is down.
 */
const probeTimeoutMs = 5_000

const services = [
  {
    name: 'trade-imports-ins-backend',
    url: process.env.TRADE_IMPORTS_INS_BACKEND_URL ?? 'http://localhost:8090'
  },
  {
    name: 'trade-imports-address-book',
    url: process.env.TRADE_IMPORTS_ADDRESS_BOOK_URL ?? 'http://localhost:8089'
  },
  {
    name: 'trade-imports-reference-data',
    url:
      process.env.TRADE_IMPORTS_REFERENCE_DATA_URL ?? 'http://localhost:8086'
  }
]

const isReachable = ({ url }) =>
  fetch(`${url}/health`, { signal: AbortSignal.timeout(probeTimeoutMs) })
    .then(() => true)
    .catch(() => false)

const reachability = await Promise.all(services.map(isReachable))
const unreachable = services.filter((service, index) => !reachability[index])

if (unreachable.length > 0) {
  process.stderr.write(
    [
      '',
      'The E2E workspace stack check failed — these services did not answer:',
      ...unreachable.map(({ name, url }) => `  ${name}  ${url}/health`),
      '',
      '  Start it:  scripts/stack/run-stack.sh   (from the trade-imports-workspace)',
      '',
      'Start the backends, Mongo and Redis before running workspace-backed E2E checks.',
      ''
    ].join('\n')
  )
  process.exit(1)
}
```

The three env names and defaults are `config.js`'s (`tradeImportsInsBackendApi`, `tradeImportsAddressBookApi`,
`tradeImportsReferenceDataApi`). Do not run it — it is wired to `check:workspace-stack` and `fit:start:workspace`;
`lint:js` proves it parses.

### N5 — `.dependency-cruiser.cjs` — written (D11; shape from plants')

```js
const APP = 'src/server/app'

module.exports = {
  forbidden: [
    {
      name: 'feature-isolation',
      comment:
        'A feature is self-contained and cannot import a sibling feature; capture groups keep this future-proof.',
      severity: 'error',
      from: { path: `^${APP}/features/([^/]+)/` },
      to: {
        path: `^${APP}/features/`,
        pathNot: `^${APP}/features/$1/`
      }
    },
    {
      name: 'routes-is-the-gateway',
      comment:
        'routes.js is the sole composition point allowed to import features/ from outside a feature.',
      severity: 'error',
      from: {
        path: `^${APP}/`,
        pathNot: [`^${APP}/features/`, `^${APP}/routes\\.js$`]
      },
      to: { path: `^${APP}/features/` }
    },
    {
      name: 'shared-and-lib-are-leaves',
      comment:
        'shared/ and lib/ are consumed by features and services and depend on neither.',
      severity: 'error',
      from: { path: `^${APP}/(shared|lib)/` },
      to: { path: `^${APP}/(features|services)/` }
    },
    {
      name: 'no-circular',
      comment: 'Cycles are forbidden throughout the application architecture.',
      severity: 'error',
      from: { path: `^${APP}/` },
      to: { circular: true }
    }
  ],

  options: {
    doNotFollow: { path: 'node_modules' },

    exclude: {
      path: ['\\.test\\.js$', '\\.fit\\.spec\\.js$', '/fit/', '\\.njk$']
    },

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },

    reporterOptions: {
      dot: {
        collapsePattern: `${APP}/(features|services|lib|shared)`
      },
      archi: {
        collapsePattern: `${APP}/(features|services|lib|shared)`
      }
    },

    cache: { strategy: 'metadata' }
  }
}
```

Why it passes today (checked against every non-test import under `src/server/app` at planning time): features
import `../../shared/*`, `../../lib/*`, `../../services/*/index.js`, `../../../common/helpers/*` and their own
files; `features/index.js` imports the six controllers (inside `features/`, so `routes-is-the-gateway` ignores it);
`routes.js` imports `./features/index.js`; `shared/kit.js` imports `../../common/helpers/organisation-id.js` and
its siblings; `lib/validate/validators.js` imports `../../shared/copy*.js` (lib → shared, allowed); services import
`../../lib/*` and `../../../common/services/mode.js`. The only cross-feature import in the tree is the dashboard fit
spec's axe helper (D7), excluded. `--ignore-known` reads `.dependency-cruiser-known-violations.json` (N6).

### N6 — `.dependency-cruiser-known-violations.json` — generated

Produced by step 6 of §2 (`npm run depcruise:baseline`). Expected content after `npm run format`: `[]`. Committed,
as plants commits its own.

### N7 — `fit/sign-in.js` — plants verbatim

`signIn(page, { organisationId = 'stub-org-1' } = {})` → `page.goto('/auth/stub-sign-in?organisationId=…')`. The
same function ins's `address-form.js` had, same comment (it names `server/auth/stub-sign-in.js`, which ins has).

### N8 — `fit/smoke.fit.spec.js` — written (D6, D8; shape from plants' `fit/journey-smoke.fit.spec.js`)

```js
import { expect, test } from '@playwright/test'

import { signIn } from './sign-in.js'
import {
  expectNoSeriousOrCriticalAxeViolations,
  fillValidAddress,
  validAddress
} from '../src/server/app/features/address-book/fit/address-form.js'
import { copy as sharedCopy } from '../src/server/app/shared/copy.en.js'
import { copy as dashboardCopy } from '../src/server/app/features/dashboard/copy/copy.en.js'
import { copy as addressBookCopy } from '../src/server/app/features/address-book/copy/copy.en.js'

test('a trader signs in, sees the dashboard, and adds, views and deletes an address', async ({
  page
}) => {
  await signIn(page, {
    organisationId: `stub-org-smoke-${crypto.randomUUID()}`
  })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: dashboardCopy.title })
  ).toBeVisible()

  await page
    .getByRole('link', {
      name: sharedCopy.layout.serviceNavigation.addressBook,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(/\/address-book$/)
  await expect(
    page.getByRole('heading', { level: 1, name: addressBookCopy.list.title })
  ).toBeVisible()

  await page.getByRole('button', { name: addressBookCopy.list.add }).click()
  await expect(page).toHaveURL(/\/address-book\/add$/)
  await fillValidAddress(page)
  await page.getByRole('button', { name: addressBookCopy.add.save }).click()
  await expect(page).toHaveURL(/\/address-book$/)
  await expect(
    page.getByText(addressBookCopy.successBanner.added(validAddress.name))
  ).toBeVisible()

  await page
    .getByRole('link', {
      name: `${addressBookCopy.list.table.view} ${validAddress.name}`
    })
    .click()
  await expect(
    page.getByRole('heading', { level: 1, name: validAddress.name })
  ).toBeVisible()

  await page.getByRole('button', { name: addressBookCopy.view.delete }).click()
  await expect(page).toHaveURL(/\/address-book\/[^/]+\/delete$/)
  await page
    .getByRole('button', { name: addressBookCopy.delete.confirm })
    .click()
  await expect(page).toHaveURL(/\/address-book$/)
  await expect(
    page.getByText(addressBookCopy.successBanner.deleted(validAddress.name))
  ).toBeVisible()
  await expect(
    page.getByRole('link', {
      name: `${addressBookCopy.list.table.view} ${validAddress.name}`
    })
  ).toHaveCount(0)

  await expectNoSeriousOrCriticalAxeViolations(
    page,
    'address book after the smoke run'
  )
})
```

Every locator is one the feature specs already use against the same pages (`View <name>` links, the `Delete` and
`Yes, delete this address` buttons, the two banners); the org id is unique per run because deleting mutates the
stub's per-organisation store (the delete spec's own reasoning). `exact: true` on the Address book link because the
phase banner's "give your feedback by email" link taught s09 what substring matching does.

---

## 5. Imports — the rule for rewriting the imports this stage disturbs

- **`signIn`**: every importer switches to `fit/sign-in.js` by relative path — six `..` from a feature's `fit/`
  directory (E14–E19), `./sign-in.js` from the smoke spec (N8). `address-form.js` keeps every other export.
- **The smoke spec** reaches into `src/` with `../src/server/app/…` — plants' idiom for its root `fit/`.
- **`context.js`**: no specifier changes; only the manifest path string (E2).
- **Nothing under `src/` imports `webpack`, `vite`, `postcss` or `dependency-cruiser`** — they are build-time only.
  `grep -rn "from 'vite\|from 'webpack" …/src` must return nothing (§6B).
- New files import in the workspace order the existing files use: package imports first, then relative, one blank
  line between the two groups.

---

## 6. Tests — which move, which change, which are new, and what each pins

### Moved (0) · Deleted (0 test files; `.vite/setup-files.js` was setup, never loaded)

### Changed in place

| File | Change | Pins |
|---|---|---|
| `config/nunjucks/context/context.test.js` (E3) | 0 (14 → 14) | the manifest is `assets-manifest.json`; `getAssetPath('application.js')` resolves through it to `/public/javascripts/application.js`; an unknown key passes through; the missing-manifest log line names the webpack file; the manifest is read once |
| `shared/layout.test.js` (E5) | +2 (24 → 26) | the layout asks `getAssetPath` for exactly `stylesheets/application.scss` and `application.js`; the favicon and web-app manifest come from `assetPath`, not from a manifest lookup |
| six `*.fit.spec.js` (E14–E19) | 0 | unchanged assertions; `signIn` now comes from `fit/sign-in.js` |

### New

| File | Tests | Pins |
|---|---|---|
| `fit/smoke.fit.spec.js` (N8) | 1 (Playwright, `smoke` project) | the whole service in one pass — stub sign-in, dashboard heading, service navigation to the address book, add → success banner → view → delete → success banner, and no serious/critical axe violation at the end |

### Unchanged but load-bearing (listed so nobody "fixes" them)

- `shared/layout.test.js`'s `renderLayout` fixture (`getAssetPath: (asset) => \`/assets/${asset}\``) — E5 pins the keys
  it receives; do not make the fixture read a manifest.
- `common/helpers/serve-static-files.test.js` — `/favicon.ico` → 204, unchanged (the route is still there).
- `app/routes.test.js`, `shared/paths.test.js` — the URL surface (§7A).
- `copy-convention.test.js`, `copy-parity.test.js` — walk `src/server/app`; the root `fit/` is outside their scope.

### Arithmetic

| | Files | Tests |
|---|---|---|
| Baseline (s09) | 55 | 492 |
| `layout.test.js` 24 → 26 | | +2 |
| **Expected** | **55** | **494** |

Playwright: **50** (49 in `features`, 1 in `smoke`).

---

## 7. Invariants to prove — and the check that proves each held

Run every command from the workspace root in one Bash call each; write long output to
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s10-build-tooling-<name>.log` and read
it once.

**A. Public URL surface unchanged (invariant 1).** No route file changes.
`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached --stat -- src/server/app/routes.js src/server/app/features/index.js src/server/app/shared/paths.js src/server/router.js src/server/auth src/server/health src/server/signout`
→ empty. `app/routes.test.js` and `paths.test.js` green in the ladder.

**B. No stale names.**
`grep -rnw "vite\|Vite\|viteManifest\|viteAssetPath\|assets.html\|themeColor\|headIcons" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src`
→ nothing (`-w` keeps `vitest` out; `lib/validate/calendar.js`'s "vitest forces TZ=UTC" comment and
`test-helpers/real-mode.js`'s "(vitest.config.js)" are `vitest`, not `vite`). Then
`grep -n "\"vite\"\|vitest-fetch-mock\|vite build" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/package.json`
→ nothing. Then
`ls ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/vite.config.js ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/.vite ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/client/assets.html`
→ three "No such file or directory". Then `grep -rn "signIn" …/src/server/app/features/address-book/fit/address-form.js`
→ nothing.

**C. The lockfile was written by the pin and carries the new tree.**
`grep -n "\"vite\": \"8.0.16\"\|\"vitest-fetch-mock\"" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/package-lock.json`
→ nothing;
`grep -c "\"node_modules/webpack\"\|\"node_modules/dependency-cruiser\"\|\"node_modules/sass-loader\"\|\"node_modules/webpack-assets-manifest\"" …/package-lock.json`
→ `4`; `grep -n "\"lockfileVersion\"" …/package-lock.json` → `3`; the install log (§2 step 4) shows `npx` resolving
`npm@11.6.2` and no `EUSAGE`/`ERESOLVE`. `git -C … diff --cached --stat -- package-lock.json` is large — expected;
that is the regeneration.

**D. The build serves what the layout asks for.** After the ladder's `build:frontend`:
`ls ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/.public` → `assets`, `assets-manifest.json`,
`javascripts`, `stylesheets` (no `.vite`, no `src`);
`jq 'keys' ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/.public/assets-manifest.json` includes
`"application.js"` and `"stylesheets/application.scss"`;
`ls ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/.public/assets` → `fonts`, `images`,
`manifest.json`;
`grep -c "/public/assets/fonts/" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/.public/stylesheets/application.*.min.css`
→ a number ≥ 1 (the `$govuk-assets-path` of E6 reached the CSS; the production build names the file with a hash, the
glob expands to it).

**E. The Playwright split.** The `test:fit` log (ladder) lists tests under `[smoke]` and `[features]` and ends
`50 passed`. `grep -c "\[smoke\]" …/logs/s10-build-tooling-test-fit.log` → `1`.

**F. No cross-repo import (invariant 4).**
`grep -rn "from '.*trade-imports-\(animals\|plants\)\|require(.*trade-imports-\(animals\|plants\)" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/fit ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/scripts ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/webpack.config.js ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/.dependency-cruiser.cjs`
→ nothing. (A bare `grep -rn "trade-imports-\(animals\|plants\)"` over the same paths returns exactly one line, `src/server/app/features/dashboard/view-model/list.js:97` — a pre-existing doc comment naming animals' `journeyId` route, prose not an import, not touched by this stage; that is why the proof anchors on import lines.)

**G. No migration comments (invariant 6).**
`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached -- . ':!package-lock.json' > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s10-build-tooling-full-diff.log`
then `grep -n "^+.*\(renamed\|moved from\|migrat\|previously\|formerly\|no longer\|used to\|was vite\|from vite\)" …/logs/s10-build-tooling-full-diff.log`
→ nothing.

**H. The architecture rules pass with an empty baseline.**
`cat ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/.dependency-cruiser-known-violations.json`
→ `[]`. `lint` (ladder) is green, and its log shows `lint:arch` ran (`no dependency violations found`).

**I. The layout is plants' apart from s09's named differences.**
`diff ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/shared/layout.njk ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/shared/layout.njk > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s10-build-tooling-layout-vs-plants.diff`
(exit 1 expected). Read it once. The only hunks: (1) the `{% set %}` block — `homeUrl` line, `signOutUrl` value, the
placeholder comment and the `addressBookUrl` line; (2) the two navigation `href`s, the address-book `active:` line
and `serviceUrl: dashboardUrl`; (3) the removed `staleActionRejected` block. **No `headIcons` hunk and no
`getAssetPath` hunk** — those were s09's D2 and are closed here. Anything else is a miss. Same for `context.js`
against plants': the manifest lines now match; the remaining hunks are s09 D5–D8 (`activeNavigationItem` body and
doc example, the synchronous `authData`, no `staleActionRejected`, `dashboardUrl`/`addressBookUrl`/`crumb`,
`catch {` without a binding).

**J. Ported files are byte-identical to plants'.** Each `diff` → empty (exit 0):
`diff ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/webpack.config.js ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/webpack.config.js`;
same for `postcss.config.js`, `babel.config.cjs`, `fit/sign-in.js`. Then
`diff …/plants-frontend/scripts/npm-version.js …/ins-frontend/scripts/npm-version.js` → only the two comment lines of
N3; `diff …/plants-frontend/Dockerfile …/ins-frontend/Dockerfile` → only the `ARG PARENT_VERSION` and `ARG PORT`
lines.

**K. The diff-stat is exactly this stage.**
`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached --name-status > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s10-build-tooling-name-status.log`
→ 3 `D` (`vite.config.js`, `src/client/assets.html`, `.vite/setup-files.js`); 8 `A` (`webpack.config.js`,
`postcss.config.js`, `scripts/npm-version.js`, `scripts/check-workspace-stack.js`, `.dependency-cruiser.cjs`,
`.dependency-cruiser-known-violations.json`, `fit/sign-in.js`, `fit/smoke.fit.spec.js`); 20 `M` (`package.json`,
`package-lock.json`, `Dockerfile`, `.github/workflows/{check-pull-request,publish,publish-hotfix}.yml`,
`playwright.config.js`, `vitest.config.js`, `src/config/nunjucks/context/{context.js,context.test.js}`,
`src/server/app/shared/{layout.njk,layout.test.js}`, `src/client/stylesheets/_govuk-frontend.scss`,
`src/server/app/features/address-book/fit/{address-form.js,add,delete,edit,list,view}` (the five `.fit.spec.js`),
`src/server/app/features/dashboard/fit/dashboard.fit.spec.js`). No `R`. `babel.config.cjs` must **not** appear.

**Ladder** (each to a log, read once, in this order — `build:frontend` first because `test` and `test:fit` rebuild
and a webpack error is clearest on its own):
1. `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run build:frontend > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s10-build-tooling-build.log 2>&1`
   — ends with webpack's `compiled successfully` line and no `ERROR`.
2. `… run format:check > …/logs/s10-build-tooling-format-check.log 2>&1` — clean (if red, `run format` once and
   re-check; never hand-format).
3. `… run lint > …/logs/s10-build-tooling-lint.log 2>&1` — `lint:js`, `lint:scss`, `lint:arch` all clean.
4. `… run test > …/logs/s10-build-tooling-test.log 2>&1` — expect `Test Files  55 passed (55)` / `Tests  494 passed
   (494)`.
5. `… run test:fit > …/logs/s10-build-tooling-test-fit.log 2>&1` — expect `50 passed`. On a failure read
   `test-results/*/error-context.md`, not the tail of the log.

---

## 8. Out of scope — leave alone even though it is tempting

- **Lighthouse** — no `@lhci/cli`, `puppeteer`, `lighthouserc.cjs`, `scripts/lighthouse/`, `lighthouse` scripts,
  `.github/workflows/lighthouse.yml` (D15; open question on the stage).
- **`postinstall: npm run setup:husky`** — not added (D5; open question on the stage). `setup:husky` and
  `.husky/pre-commit` stay as they are.
- **`eslint.config.js`** — plants' `eslint-plugin-sonarjs` block and the fit-spec browser globals are hardening
  (s12), not build tooling. ins's config lints the new root files as it is.
- **`sonar-project.properties`**, **`.github/dependabot.yml`**, **`.gitignore`**, **`.dockerignore`**,
  **`.prettierignore`**, **`nodemon.json`**, **`.nvmrc`** (`v24.14.1`), **`.browserslistrc`** — untouched; each already
  covers the new files or differs from plants' for reasons outside this stage.
- **`README.md`** — s11 writes the docs (it will need `install:pinned-npm`, `fit:start:workspace`, the two Playwright
  projects and the webpack scripts). Do not touch it here.
- **`server:watch` / `server:debug`, `test`, `start`, `security-audit`, `git:pre-commit-hook`** — ins's versions
  stay (D5).
- **`overrides`** — ins's two entries stay; plants' `vite`/`esbuild`/`lighthouse`/`puppeteer-core` overrides are for
  packages ins does not have.
- **`src/client/javascripts/application.js`, `application.scss`, every other stylesheet** — the webpack entry reads
  them as they are; only `_govuk-frontend.scss` changes (E6).
- **The `.public/` contents** — generated (D18).
- **`context.js` beyond the manifest lines** and **`layout.njk` beyond E4** — s09's shape stays.
- **`expectNoSeriousOrCriticalAxeViolations`** stays in `address-form.js`; the dashboard spec's cross-feature import
  of it stays (D7).
- **The Dockerfile's `ARG PORT=3000`** and **`publish.yml`'s `$${{ github.workflow }}` / `queue: max`** — s12.
- **The tests repo** — it reaches ins by URL; nothing it asserts changes (no route, heading or copy changes here).
- **The workspace repo** (`docker/stack/*`, `tools/`) — the dev overlay builds ins's `development` stage and runs
  `docker:dev`, which is `npm run dev` → `run-p frontend:watch server:watch`; webpack's `watchOptions.poll` works on
  the bind mount as it does for the journeys. No workspace file changes.

---

## 9. Behaviour changes (named, per invariant 2)

None on any URL a trader visits: every page renders the same markup with the same copy. The ways the service is
built, developed and tested change:

1. **The client is built by webpack, not Vite.** `.public/` now holds `javascripts/application.<hash>.min.js`,
   `stylesheets/application.<hash>.min.css`, `assets/{fonts,images,manifest.json}` and `assets-manifest.json`;
   the layout links `/public/stylesheets/application.<hash>.min.css` and `/public/javascripts/application.<hash>.min.js`
   (were `/public/assets/applicationCss-<hash>.css` and `/public/assets/application-<hash>.js`).
2. **The favicon, mask icon, apple-touch icon and web-app manifest are served from `/public/assets/images/…` and
   `/public/assets/manifest.json`** (govuk's default `headIcons`, over `assetPath`) instead of Vite-hashed copies;
   govuk-frontend's fonts load from `/public/assets/fonts/` (were `/public/assets/<name>-<hash>.woff2`).
3. **npm is pinned at 11.6.2** (`packageManager`, `engines.npm`); the Dockerfile and the three workflows install it
   before `npm ci`; `package-lock.json` is regenerated under it; `npm run install:pinned-npm` does the same on a
   developer machine.
4. **`npm run dev` runs webpack in watch mode alongside nodemon** (was nodemon only — under Vite a client change
   needed a manual `build:frontend`).
5. **`npm run lint` also runs `lint:arch`** — the four dependency-cruiser rules of D11 fail the lint on a
   cross-feature import, a non-`routes.js` import of `features/`, a `shared/`/`lib/` import of `features/` or
   `services/`, or a cycle.
6. **`npm test` builds the client first** (`pretest`).
7. **Playwright runs two projects** — `smoke` (root `fit/`, one test) and `features` (the six feature specs) — on
   **port 3002 by default and 3052 in CI** (was one project on 3050); `test:fit:smoke` and `test:fit:features` run
   one; `test:fit:ci` has the journeys' 15-minute global timeout (was 5).
8. **`npm run fit:start:workspace`** refuses to start when ins-backend, address-book or reference-data do not answer
   `/health`.
9. **`cssnano`/`cssnano-preset-default` 8, `@babel/preset-env` 8, `sass-embedded` 1.100.0**; `vite` is no longer a
   direct dependency; `vitest-fetch-mock` is gone.

---

## 10. Commit

Stage everything (`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend add -A`) and stop; the
reviewer/orchestrator commits. Suggested message, for the orchestrator: `refactor(alignment): s10-build-tooling —
move the client build to webpack, pin npm, add dependency-cruiser and split Playwright`.
