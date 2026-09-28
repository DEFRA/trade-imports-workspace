# How a designer runs, checks, shows and ships a change on the plants prototype

Repo: `repos/trade-imports-plants-prototype`, branch `feat/NO_JIRA-designer-prototyping`, HEAD `ac08607` (2026-09-25). Measured 2026-09-27 on Node v24.11.1 (repo pins `>=24`, `.nvmrc` present) and npm 11.17.0 (repo pins `packageManager` `npm@11.6.2` — see "Errors a designer will meet").

## 1. RUN — `npm run dev`

| Fact | Where it comes from |
|---|---|
| Port **3103** | `src/config/config.js:61` (patched from upstream's 3003, listed in `overrides.json` `patched`) |
| Sign-in: dev stub, no Defra ID needed | `src/prototype-defaults.js` sets `STUB_MODE=true` and `SESSION_CACHE_ENGINE=memory` unless already set; FIT and README both confirm auth is still enforced, only the OIDC round-trip is skipped |
| `npm run dev` = `run-p frontend:watch server:watch` | `package.json` |
| Server reload: **nodemon restarts the whole Hapi process** on any change to `./src` with ext `cjs,js,json,njk` (`nodemon.json`); ignores `*.test.*`, `src/client`, test-helpers | `nodemon.json`, `server:watch` uses `--legacy-watch` (polling) |
| Templates and copy: Nunjucks `watch` and `noCache` both default to `isDevelopment` (`config.js:321-334`), so a `.njk` edit is picked up by Nunjucks itself; but nodemon also restarts on `.njk`, so the effective experience is "save, wait ~2-4s for restart, refresh". Copy lives in `copy/copy.en.js` — a `.js` change, so it always goes through the nodemon restart. | `config.js`, `nodemon.json` |
| Client assets: `webpack --watch` (development mode, `inline-source-map`, poll 1000ms) rebuilds `src/client/**` SCSS/JS into `.public/` | `webpack.config.js` |
| No browser live-reload / HMR. Designer refreshes by hand. | — |
| Example data is seeded on first visit (not at start-up) into an in-memory JSON store; shared by every signed-in user; "Reset this prototype's data" at `/` (POST `/reset/{setId}`) wipes and reseeds one set | `PROTOTYPE.md`, `src/server/sets-index/reset-controller.js`, `src/server/prototype-seed/` |
| Memory store: restarting the process (every nodemon restart!) **loses all data** and the next visit re-seeds. A designer mid-journey who saves a template edit will find their in-progress notification gone. | `SESSION_CACHE_ENGINE=memory` + stub records store |
| Chooser at `/`; sets at `/high-risk-plants`, `/sample-journey`; `npm run new:set -- <id> [--from high-risk-plants]` scaffolds a set | `PROTOTYPE.md`, `scripts/new-set/` |

`npm start` runs production mode: needs a real Defra ID stub, so it is not a designer path locally (`PROTOTYPE.md` says so).

## 2. CHECK — the verification ladder and what each rung costs

### 2a. `npm run test:high-risk-plants` — MEASURED

Log: `workareas/shared/designer-prototyping/logs/plants-verify-test.log`.

```
Test Files  51 passed (51)
Tests       791 passed (791)
Duration    2.57s (transform 3.94s, setup 3.01s, import 28.20s, tests 837ms)
```

Wall clock for the whole npm invocation was well under a minute. No `pretest` (only the bare `test` script has one), so no webpack build. This is the rung a designer can realistically run after every change. **Both `docs/testing.md` and `sets/high-risk-plants/docs/testing.md` still say the set "owns no test files" / the FIT projects "match nothing today" — stale: 51 files and 18 co-located `*.fit.spec.js` exist.** Fix that doc drift as part of any designer docs work.

### 2b. `npm test`

`pretest` runs `NODE_ENV=production webpack` first, then `TZ=UTC vitest run --coverage --exclude ./tests/**`. Full platform suite with v8 coverage. Not timed here (not asked) — expect a couple of minutes including the production webpack build. This is what the **husky pre-commit hook runs on every commit** (see 4a). It also contains the convention checks a designer is most likely to break (see 2f).

### 2c. `npm run lint` = `lint:js` (eslint + neostandard + sonarjs) → `lint:scss` (stylelint-config-gds) → `lint:arch` (dependency-cruiser, 14 named rules incl. `no-orphans`, `no-circular`, `journey-isolation`, `set-isolation`, `sets-not-l1`).

`no-orphans` is the one a designer hits by accident: a new `.js` file that nothing imports yet fails lint. `--ignore-known` uses `.dependency-cruiser-known-violations.json` as a baseline.

### 2d. `npm run format` / `format:check` — Prettier over `src/**/*.js` and `**/*.{js,cjs,md,json,config.js,test.js}`. **Does not touch `.njk`** — template formatting is unchecked. Runs first in the pre-commit hook, so an unformatted copy file blocks the commit with a Prettier diff, which is fixable by `npm run format`.

### 2e. Playwright FIT — `npm run test:fit` / `test:fit:journeys` / `test:fit:features`

- `test:fit` first runs `build:frontend` (production webpack), then `playwright test --pass-with-no-tests` with `DEMO_SLOWMO=0 DEMO_PACE_MS=0`.
- `playwright.config.js` (patched, in `overrides.json`): `testDir ./fit`, two projects:
  - **`journeys`** — `fit/*.fit.spec.js`: `journey-smoke.fit.spec.js` (5 happy paths from `flow/fixtures/happy-path.json`, dashboard → confirmation, axe on confirmation) and `sets-chooser.fit.spec.js` (every set boots, CSS applied, no 4xx/console errors). `video: 'on'`, `trace: 'on'`, slowMo 600 unless `DEMO_SLOWMO` set.
  - **`features`** — 18 co-located specs under `sets/high-risk-plants/journeys/linear/features/**`. `trace: 'retain-on-failure'`, `video: 'off'`.
- `webServer`: `npm run fit:start` on `PORT` (default **3003**, not 3103) with `STUB_MODE=true PROTOTYPE_SEED=false`, `reuseExistingServer: false`. Default port 3003 collides with the workspace stack's plants-frontend; docs say `PORT=3053 npm run test:fit:features` when the stack is up. A designer has no stack, so bare `npm run test:fit` is fine.
- Sign-in in specs: `fit/sign-in.js` hits `/auth/stub-sign-in?organisationId=stub-org-1`.
- Timeouts: test 240s, expect 15s, action 15s. CI job has 20-minute budget with `--retries=2`.
- Browsers: this machine has chromium 1208–1243 installed under `~/Library/Caches/ms-playwright`; a fresh designer laptop needs `npm run playwright:install` (Chromium only). Without it Playwright fails at launch with "Executable doesn't exist ... run `npx playwright install`".
- Outputs (gitignored): `test-results/<spec>-<hash>/{trace.zip,video.webm}` and `playwright-report/index.html`. Seven result folders exist locally now: five journey-smoke runs and two sets-chooser runs, each with `trace.zip` + `video.webm`.

Not timed in this pass. Shape: production webpack build + Hapi boot + 5 slow-motion journeys with video + 2 chooser specs + 18 feature specs, `fullyParallel`. Realistically several minutes on a laptop; CI allows 20.

### 2f. Boot guards and convention tests a designer WILL trip (from `sets/high-risk-plants/docs/add-a-field.md` and `docs/testing.md`)

These are the real "errors they will meet" once they go past copy/template edits:

| Trip | Error text / effect | Where |
|---|---|---|
| Put a label/hint in the obligation model | server refuses to start (`obligation-purity.js`), not just a red test | boot |
| Add an obligation without a binding | `obligations owned by no feature` | `createFulfilmentRegistry` at boot / vitest setup |
| Add an obligation no page `collects` | `Obligations collected by no page` | `buildDispatch` |
| Import a copy of the obligation object | `must import its obligation object from the manifest` | registry identity check |
| Add English copy only | `copy-parity.test.js` fails (en/cy shape mismatch) — runs in `npm test`, not `test:high-risk-plants` | pre-commit |
| New feature folder with template but no `copy/copy.en.js`, `copy.cy.js`, `copy.test.js` | `copy-convention.test.js` fails | `npm test` |
| New field on a listed controller | `contract.test.js` case fails; unlisted controller silently uncovered | `npm test` |
| New client JS bundle without a webpack `entry` | template renders, bundle 404s silently | runtime |
| New `.js` file nothing imports | dependency-cruiser `no-orphans` | `npm run lint` |
| Edit a file not in `overrides.json` `ours` | works today, overwritten or conflicted by Monday's sync PR (`needs-person` label) | weekly robot |

### 2g. `capture:high-risk-plants` is NOT a screenshot tool

`package.json` `capture:high-risk-plants` runs `src/server/app/services/_capture/capture.js`, which **fetches reference-data fixtures** (`/countries`, `/countries?blocks=GBNAG_SPS_EX`, `/ports-of-entry`) from `TRADE_IMPORTS_REFERENCE_DATA_URL` (default `http://localhost:8086`) into `_capture/fixtures/*.json`. With no stack running it prints `FETCH FAILED` per target and exits 1. Not a designer command; belongs upstream (not in `ours`).

The screenshot-from-traces capability is the workspace's **`tim capture <workarea> --app <name>`** (`tim/src/capture/`):
- reads `workareas/<workarea>/capture.json` (`apps.<name>: { repo, fitScript, projects[], flow, pagePath ending in {slug} }`);
- imports the repo's flow module (`sections[].pages[].{id,slug}`) as the page inventory — for plants that is `src/server/app/sets/high-risk-plants/journeys/linear/flow/flow.js`;
- runs `npm run <fitScript> -- --trace on --reporter=list --output <tmp> --project=...` in the repo, copies `trace.zip`s to `workareas/<workarea>/traces/<app>/<sha>/`, writes `capture.json` manifest + `coverage.json` saying which pages the suite reached;
- refuses to overwrite an existing capture for the same sha.
- **No `capture.json` exists anywhere under `workareas/` today**, so nothing is wired for plants yet. Writing one (`repo: repos/trade-imports-plants-prototype`, `fitScript: test:fit`, `projects: ["journeys"]`, `flow: <flow.js above>`, `pagePath: /high-risk-plants/notifications/{journeyId}/{slug}`) is a one-file enabler.
- Traces then yield per-action screenshots via the `playwright-trace` skill / `npx playwright show-trace` — that is the raw material for a "show me my change" page.

## 3. SHOW — what a "show me my change" loop could look like

Today a designer has: `npm run dev` + a browser, and (if they know to look) `playwright-report/index.html` plus `video.webm` per journey after `npm run test:fit:journeys`. Nothing joins "the files I edited" to "the pages that render them".

Proposed loop (all pieces exist except the glue):

1. **Diff → pages.** `git diff --name-only` in the repo; map each changed path to a feature (`journeys/linear/features/<feature>/…`) and from `flow.js` to that feature's slug(s). Copy files under `shared/` or the layout map to "every page".
2. **Render.** Run the `journeys` FIT project (or a narrowed `--grep` on the affected feature specs) with `--trace on` via `tim capture` into a workarea, or `npm run test:fit:journeys` directly. Because the webServer boots with `PROTOTYPE_SEED=false` and `STUB_MODE=true`, this needs nothing running and does not disturb the designer's own `:3103` dev server (FIT uses `:3003`).
3. **Extract.** From each `trace.zip` take the last screenshot per navigation whose URL matches the affected slug — before/after pairs come from capturing at `HEAD` and at the working tree (tim keeps one folder per sha, so the "after" capture needs either a WIP commit or a dirty-tree marker).
4. **Present.** One HTML/Markdown walkthrough per change: changed page(s), initial state and validation-error state (the two states `add-a-field.md` says to check), plus the journey video link. The `journeys` project already records `video: 'on'` with slowMo 600 precisely so the recording is watchable — that is the walkthrough.
5. **Coverage gap.** `tim capture`'s `coverage.json` names pages the suite never reached; for a designer that reads as "your new page has no screenshot because no journey visits it yet — add it to `happy-path.json` or a feature spec".

Cheap first version: a `tim` subcommand or npm script that runs steps 1–3 and writes `workareas/shared/<set>/show/<sha>/index.html`. Everything it needs (trace reading, inventory from `flow.js`, page-slug matching) is already in `tim/src/capture/`.

## 4. SHIP

### 4a. Commit — husky pre-commit
`.husky/pre-commit` → `npm run git:pre-commit-hook` → `format:check && lint && npm test`. So **every commit** runs Prettier check, all three lints, a production webpack build and the full Vitest suite with coverage. On a designer laptop that is minutes per commit and the hook fails on the first Prettier diff. Options: run `npm run format` first (docs already suggest), or a designer-facing `commit` helper that formats then commits. `git commit --no-verify` bypasses it but then CI catches the same things.

The hook is installed by `postinstall` → `setup:husky`, so it only exists after `npm ci`/`npm install`.

### 4b. Pull request — `.github/workflows/check-pull-request.yml`
Three jobs on PRs to `main` (and Monday 07:00 cron):
- `pr-validator` (gating): align npm to `packageManager` via `scripts/npm-version.js`, `npm ci`, `build:frontend`, `format:check`, `lint`, `npm test`, Docker image build.
- `security-audit` (non-gating by design, separate job): `npm audit --audit-level=high`.
- `playwright` "FIT Tests" (20 min): `playwright:install`, `PORT=3053 npm run test:fit -- --retries=2 --forbid-only --global-timeout=900000 --reporter=list,html,github`; uploads `playwright-report/` + `test-results/` as artifact `frontend-playwright-report` (14 days). **This artifact already contains every journey's `video.webm` and `trace.zip` — a designer can download the walkthrough of their PR without running anything locally.**

### 4c. Deploy — `.github/workflows/publish.yml`
On push to `main`: `npm ci`, `build:frontend`, `npm test`, then `DEFRA/cdp-build-action/build@main` publishes the image; `publish-arm64` adds the arm64 tag via the workspace's reusable workflow. CDP then deploys the image per the platform's own config (`cdp-app-config`, which AI must not touch — Sam commits there). `publish-hotfix.yml` is manual (`workflow_dispatch`) with the same checks. Deployed prototype signs in via the Defra ID stub; data still stubbed (`isStubDataMode()` in `mode.js`, `production-run.test.js` covers it). There is no `publish-branch.yml` (deleted in `overrides.json`), so **no branch-tagged images**: a designer cannot see their PR deployed anywhere; only `main` deploys.

### 4d. The weekly sync robot (`sync-upstream.yml`, Monday 04:00 + manual)
`npm run sync:upstream -- --push --summary` merges `upstream/main`, applies `overrides.json` (`deleted` / `ours` / `patched`), then `scripts/sync-upstream/checks.js` runs `npx --yes npm@11.6.2 ci`, `npm run lint`, `npm test`, `npm run test:fit` (the "set boot check"), and opens a PR: ready (not draft) on green, else draft + `needs-person`. (Critic correction: nothing auto-merges. `scripts/sync-upstream/git.js#createPullRequest` runs `gh pr create` with no `--auto`/merge step, and a PR opened with the workflow's `GITHUB_TOKEN` does not trigger `check-pull-request.yml`, so a green sync PR sits open until a person merges it. PROTOTYPE.md's "most weeks, that pull request merges itself" is wrong.) Any designer edit outside `ours`/`patched` is at risk every Monday — the set folder `src/server/app/sets/high-risk-plants/**` is **upstream's**, so designer edits to the real journey's copy/templates are exactly the files the sync will fight over. Only `sample-journey` and anything made by `new:set` land in `ours` (`scripts/new-set/update-overrides.js`).

## 5. Which rungs a designer can realistically run

| Command | Designer-runnable? | Notes |
|---|---|---|
| `npx --yes npm@11.6.2 ci` then `npm run dev` | Yes | The only two commands `PROTOTYPE.md` asks for. |
| `npm run test:high-risk-plants` | Yes | ~3s of tests, sub-minute wall. Good "did I break it" check. |
| `npm run format` | Yes | Fixes rather than reports. |
| `npm run lint` | Mostly | Failures are developer-shaped (`no-orphans`, sonarjs); message quality is fine but the fix is not obvious. |
| `npm test` | Borderline | Minutes; failure output from `copy-parity`/`contract` tests needs translation into "add the Welsh line / add the contract row". |
| `npm run test:fit:journeys` | Yes, with `playwright:install` once | Produces the videos/traces — the most designer-valuable output. |
| `npm run test:fit:features` | Borderline | 18 specs, failures read as Playwright locator errors. |
| `git commit` | Painful | Pre-commit runs the full ladder; first failure is usually Prettier. |
| `npm run capture:high-risk-plants` | No | Needs reference-data on :8086; not a screenshot tool. |
| `tim capture` | Not yet | Needs a `capture.json`; then yes. |
| `npm start` | No | Needs Defra ID stub. |

## 6. Errors a designer will meet (concrete)

1. **npm version mismatch**: local npm is 11.17.0, lockfile generated by 11.6.2. `npm ci` may reject the lockfile; `PROTOTYPE.md` already routes round it with `npx --yes npm@11.6.2 ci`. Any skill must use that exact form, never bare `npm ci`/`npm install`.
2. **Port 3103 in use** (a previous `npm run dev` still running): Hapi `EADDRINUSE`; nodemon does not recover.
3. **Data vanishes on save**: memory store + nodemon restart on every `.njk`/`.js` save. Not an error message, just confusion. Reset button restores examples.
4. **Prettier pre-commit failure** on copy files — fixed by `npm run format`.
5. **`copy-parity` failure** when only `copy.en.js` changed — needs the same leaf in `copy.cy.js`.
6. **Boot refusals** (`obligation-purity`, `Obligations collected by no page`, `owned by no feature`) when they venture into the model — the server will not start, and the message names the obligation.
7. **Playwright "Executable doesn't exist"** before `npm run playwright:install`.
8. **Monday sync conflicts** on any edited upstream file — the PR is labelled `needs-person` and their change may be reverted on merge.
9. **Dependency-cruiser `no-orphans`** on a new helper file not yet imported.
10. Stale docs (`testing.md` x2 say "no tests exist") will mislead anyone reading before running.

## 7. Recommendations for the designer skills/workflows (input to the plan)

- **A `dev` skill**: start `npm run dev` in the background, tail for "Server started" / `EADDRINUSE`, print `http://localhost:3103/<set>`, remind about reset and data loss on restart.
- **A `check` skill (tiered)**: tier 1 `format` + `test:high-risk-plants` (seconds); tier 2 `lint` + `npm test` with a translator that maps `copy-parity`/`copy-convention`/`contract`/`no-orphans` failures to the recipe step that fixes them; tier 3 `test:fit:journeys`.
- **A `show` skill**: diff → affected slugs → FIT run with traces → screenshots (initial + error state) + video link → one walkthrough page in the workarea. Wire `capture.json` for `plants-prototype` first so `tim capture` does the run.
- **A `ship` skill**: `npm run format`, commit (let the hook run, or run the ladder first so the hook is a no-op), push, open PR, then fetch the `frontend-playwright-report` artifact link as the reviewer's walkthrough.
- **Guard rail in every skill**: before editing, check the path against `overrides.json` `ours`; if the file is upstream's, say so and offer `new:set --from high-risk-plants` so the designer works in a set they own — otherwise Monday's robot overwrites them.
- **Doc fixes**: the two `testing.md` files' "no tests exist" paragraphs; `PROTOTYPE.md` should mention `npm run test:high-risk-plants`, `npm run format`, the FIT videos, and the data-loss-on-save behaviour.
