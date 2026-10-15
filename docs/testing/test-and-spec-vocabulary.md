# Test and spec vocabulary

What the words mean across the test repo (`trade-imports-ins-tests`), the Behaviour Spec (`openspec/`), the PR scope in GitHub Actions and the CDP Portal runs.

| Term | Meaning | Example |
|---|---|---|
| Domain | A user-facing application and the tests that describe what its users see. One per frontend | `animals`, `animals-admin`, `ins`, `plants` |
| Test type | A kind of test within a domain, in its own directory | `e2e`, `a11y`, `security` |
| Suite | A group of specs you run together, selected by path: a domain's directory, or one test type within it | `tests/animals/`, `tests/animals/e2e/` |
| Profile | What a CDP Portal run executes, set as `PROFILE` and read by `entrypoint.sh`: a bare profile for every domain, or `<domain>:<suite>` for one. The part after the colon is called a suite there, though it names a profile, not a path | `default`, `dynamics`, `animals:e2e` |
| Type tag | Marks which test type a spec belongs to. Kept in step with the directory by `npm run lint` | `@a11y`, `@active` |
| Service tag | Names a service whose pull request should also run the spec, from any domain or test type | `@ins-backend` |
| Capability | One folder under `openspec/specs/` holding one `spec.md` | `live-animals/addresses` |
| Spec prefix | The top-level `openspec/specs/` folder that groups capabilities. OpenSpec's own docs call this grouping a domain | `live-animals` |

A domain's tests live in `tests/<domain>/`, and a test type in `tests/<domain>/<type>/`. A path always ends in `/`, so `tests/animals/` does not also match `tests/animals-admin/`.

`@dynamics` is a tag, not a test type. Its specs sit inside `e2e/` (for example `tests/animals/e2e/journeys/dynamics/`) and the `dynamics` profile runs them. Pull-request runs exclude them, like `@a11y` and `@active`.

## Why tests are grouped by domain

The e2e tests describe what a user sees, so each lives with the frontend that shows it: `animals` is animals-frontend, `animals-admin` is the admin app, `ins` is ins-frontend and `plants` is plants-frontend. Backends and the core services have no tests of their own; they are tested through the frontends that use them. So a service's runs cover the domains of the frontends that use it. Within a domain, tests are split by test type.

## Domain to spec prefix

The test domain and the spec prefix cover the same ground under two names.

| Test domain | Spec prefix |
|---|---|
| `animals` | `live-animals` |
| `animals-admin` | `admin` |
| `ins` | `ins` |
| `plants` | `plants` |

The spec prefixes are not renamed: the area codes in [`openspec/coverage/AREAS.md`](../../openspec/coverage/AREAS.md) are keyed on them and never regenerated.

## Other uses of the word suite

- The CDP Portal calls the whole `trade-imports-ins-tests` repo a test suite. `entrypoint.sh` and the Portal write a profile as `<domain>:<suite>`, where the suite is `e2e`, `a11y`, `security`, `security:active` or `dynamics`. It is a profile name, not a path: `e2e` runs the `default` profile, and `dynamics` is not a test type. See [E2E tests: CDP](e2e-tests-cdp.md).
- Playwright's JSON reporter uses `suites` for `describe` blocks. The tag lint reads these, which is why its types say `Suite`.

## Where each is used

- Which suites and service tags a pull request runs: [E2E tests: GitHub Actions](e2e-tests-gh-actions.md).
- How the test repo is laid out: the [`trade-imports-ins-tests` README](../../repos/trade-imports-ins-tests/README.md#domains-test-suites-and-projects).
- Reading and writing specs: [OpenSpec](../reference/openspec.md).
