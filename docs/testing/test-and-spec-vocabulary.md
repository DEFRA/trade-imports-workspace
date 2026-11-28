# Test and spec vocabulary

What the words mean across the test repo (`trade-imports-ins-tests`), the Behaviour Spec (`openspec/`), the PR scope in GitHub Actions and the CDP Portal runs.

| Term | Meaning | Example |
|---|---|---|
| Domain | A user-facing application and the tests that describe what its users see, and the unit of what the stack must start. One per frontend, plus one where some of a frontend's specs reach a service the rest do not | `animals`, `animals-admin`, `animals-dlq`, `ins`, `plants` |
| Test type | A kind of test within a domain, in its own directory | `e2e`, `a11y`, `security` |
| Suite | A group of specs you run together, selected by path: a domain's directory, or one test type within it | `tests/animals/`, `tests/animals/e2e/` |
| Profile | What a CDP Portal run executes, set as `PROFILE` and read by `entrypoint.sh`: a bare profile for every domain, or `<domain>:<suite>` for one. The part after the colon is called a suite there, though it names a profile, not a path | `e2e`, `dynamics`, `animals:e2e` |
| Type tag | Marks which test type a spec belongs to. Kept in step with the directory by `npm run lint` | `@a11y`, `@active` |
| Service tag | Names a service whose pull request should also run the spec, from any domain or test type | `@ins-backend` |
| Capability | One folder under `openspec/specs/` holding one `spec.md` | `live-animals/addresses` |
| Spec prefix | The top-level `openspec/specs/` folder that groups capabilities. OpenSpec's own docs call this grouping a domain | `live-animals` |

A domain's tests live in `tests/<domain>/`, and a test type in `tests/<domain>/<type>/`. A path always ends in `/`, so `tests/animals/` does not also match `tests/animals-admin/`.

`@dynamics` is a tag, not a test type. Its specs sit inside `e2e/` (for example `tests/animals/e2e/journeys/dynamics/`) and the `dynamics` profile runs them. Pull-request runs exclude them, like `@a11y` and `@active`.

## Why tests are grouped by domain

The e2e tests describe what a user sees, so each lives with the frontend that shows it: `animals` is animals-frontend, `animals-admin` is the admin app, `ins` is ins-frontend and `plants` is plants-frontend. Backends and the core services have no tests of their own; they are tested through the frontends that use them. So a service's runs cover the domains of the frontends that use it. Within a domain, tests are split by test type.

A domain is also the unit of what the stack must start (`DOMAIN_SERVICES` in `tim/src/stack/definition.js`), so specs that reach a service the rest of their frontend's specs do not get a domain of their own. `animals-dlq` is the admin app's two DLQ specs: the DLQ page calls the dynamics gateway, and with it the Service Bus emulator, mssql and toxiproxy, which no other admin spec touches. Keeping them in `animals-admin` meant every row that merely touched the animals backend started those four, because the backend owns the admin suites.

## Adding a domain

A domain's name is held in several places, and a spec under a folder no
registry knows fails at collection, before any test runs. All of these, in
one change:

| Where | What |
|---|---|
| `trade-imports-ins-tests` | `DOMAINS` in `utils/playwright/domain-base-urls.ts`, and because that type keys them: the base-URL maps in `playwright.config.ts` and `playwright.docker-compose.config.ts` |
| `trade-imports-ins-tests` | `AUTH_TARGETS` in `fixtures/auth-state.ts` — a worker mints a session per domain and looks it up by name |
| `trade-imports-ins-tests` | `ZAP_SCOPE_CONTEXTS` in `config/zap.ts`, for any `:security:active` script that sets `ZAP_SCOPE` |
| `trade-imports-ins-tests` | `test:docker-compose:<domain>` in `package.json`, which `tim docker domain verify` runs |
| workspace | `DOMAIN_SERVICES` in `tim/src/stack/definition.js`, then prove it with `tim docker domain verify <domain> --against-full` |
| workspace | `config/e2e-tests-pr-scope.json`, so the repos that own the specs run them on their pull requests |
| workspace | the coverage links in `openspec/coverage/**` for any spec that moved, the roster in `CLAUDE.md`, and the tables here |

`npm run lint` in the tests repo is eslint plus the suite-tag check: it does
**not** typecheck. Run `npm run typecheck` as well, because `tsc --noEmit` is
what rejects a base-URL map missing a domain. Adding `animals-dlq` without it
took an E2E run on every pull request red.

## Domain to spec prefix

The test domain and the spec prefix cover the same ground under two names.

| Test domain | Spec prefix |
|---|---|
| `animals` | `live-animals` |
| `animals-admin` | `admin` |
| `animals-dlq` | `admin` |
| `ins` | `ins` |
| `plants` | `plants` |

The spec prefixes are not renamed: the area codes in [`openspec/coverage/AREAS.md`](../../openspec/coverage/AREAS.md) are keyed on them and never regenerated.

## Other uses of the word suite

- The CDP Portal calls the whole `trade-imports-ins-tests` repo a test suite. `entrypoint.sh` and the Portal write a profile as `<domain>:<suite>`, where the suite is `e2e`, `a11y`, `security`, `security:active` or `dynamics`. It is a profile name, not a path: `default` or a blank `PROFILE` runs `e2e`, and `dynamics` is not a test type. See [E2E tests: CDP](e2e-tests-cdp.md).
- Playwright's JSON reporter uses `suites` for `describe` blocks. The tag lint reads these, which is why its types say `Suite`.

## Where each is used

- Which suites and service tags a pull request runs: [E2E tests: GitHub Actions](e2e-tests-gh-actions.md).
- How the test repo is laid out: the [`trade-imports-ins-tests` README](../../repos/trade-imports-ins-tests/README.md#domains-test-suites-and-projects).
- Reading and writing specs: [OpenSpec](../reference/openspec.md).
