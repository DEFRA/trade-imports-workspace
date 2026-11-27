# trade-imports-performance-tests

**Repo:** DEFRA/trade-imports-performance-tests

## Purpose

k6 performance-test suites for the trade imports services — a CDP performance-test
suite. CDP builds the repo into a Docker image; the CDP Portal runs that image,
which runs one k6 suite and publishes the report to S3 so the Portal can show it.

## Layout

| Path | What it holds |
|---|---|
| `src/suites/` | One k6 script per suite, named `<suite>.k6.js` (for example `smoke`, `health-check`, `sustained-peak`, `peak-day`, `background-volume`, `resilience`) |
| `src/config/` | Plain JavaScript modules shared by suites, such as service URLs and traffic rates, with their unit tests (`*.test.js`) |
| `src/lib/` | Pure helpers with their unit tests |
| `src/k6/` | k6-only modules: journeys, sessions, background volume, stub profiles and ceilings, design targets |
| `src/generator/`, `src/external-calls/` | The load generator verdict (did the k6 machine keep up, from `sample-generator.sh`'s samples), and the external call report |
| `scripts/` | `run-suite.sh` (runs one suite and writes its reports), `sample-generator.sh`, `external-call-report.sh` |
| `entrypoint.sh` | What the image runs: one suite through `scripts/run-suite.sh`, then the S3 upload |
| `Dockerfile` | The image CDP runs, based on `grafana/k6` with the AWS CLI added |
| `compose.yml` | Local runs: the k6 services for each kind of run, LocalStack for S3 and `target`, a stand-in service with `/health` |
| `compose/` | LocalStack set-up and the stand-in service's nginx config |
| `.github/workflows/` | Pull request checks, the smoke run (`smoke.yml`), and the CDP publish on merge to `main` |

Suites import shared modules with relative paths. k6 and Vitest both load the
modules in `src/config/` and `src/lib/`, so they stay free of Node-only and
k6-only APIs; a suite passes k6's `__ENV` in rather than a shared module
reading it directly.

## Responsibilities

- One k6 suite per performance-test type (smoke, load, soak, spike, burst,
  resilience and so on) against the trade imports services.
- Shared config (service URL resolution, traffic models) that both k6 and Vitest can load.
- Publishing the k6 reports to the CDP Portal via S3.

## Integrations

| Direction | Other side | How | What |
|---|---|---|---|
| Outbound | The services under test (INS frontend, journey frontends and backends, reference-data, address book, ins-backend, dynamics-gateway, stub, defra-id-stub) | HTTP | The traffic a suite generates |
| Outbound | trade-imports-stub | HTTP, `/latency-profiles` and `/faults` | Read and reset its latency, and inject faults |
| Outbound | CDP's protected gateway (`https://ephemeral-protected.api.<env>.cdp-int.defra.cloud/<service>`) | HTTP with `DEVELOPER_API_KEY` as `x-api-key` | Backend calls on a laptop-to-CDP run with `CDP_LOCAL=true` |
| Outbound | S3 (or LocalStack locally) | AWS CLI, via `entrypoint.sh` | Everything `run-suite.sh` writes to `reports/`, including `index.html` and `summary.json` |
| Inbound | CDP Portal | Docker image | Runs a suite on demand, reading `ENVIRONMENT` and `RESULTS_OUTPUT_S3_PATH` |
| Inbound | Other repos' workflows | `smoke.yml` as a reusable workflow (`workflow_call`) | The smoke run against the workspace stack |

## Stack

- **Runtime:** k6 (`grafana/k6` image), plus Node.js tooling (lint, format, unit tests)
- **Test framework:** k6 for the suites; Vitest for the unit tests of the shared modules
- **Linting:** ESLint (neostandard), Prettier

## Infrastructure dependencies

None to develop against — `npm test`, `npm run lint` and `npm run format:check`
need only Node. Running a suite needs Docker: either the `grafana/k6` image
alone, against LocalStack via `compose.yml`, or against the workspace Docker
stack.

## How to run

```bash
npm ci
npm run lint
npm run format:check
npm test                  # Vitest unit tests (src/**/*.test.js) — does not run k6
```

Run a suite from source, against the compose stand-in service:

```bash
npm run k6:local                                                    # health-check
npm run k6:local -- run --no-usage-report src/suites/<suite>.k6.js  # another suite
```

Run the image as CDP does — builds it, runs it against the stand-in service and
uploads the report to LocalStack's `test-results` bucket, exiting with the
image's exit code:

```bash
npm run k6:image
```

Run against the workspace stack. Start it first with `tim docker up`, not
`tim docker dev`: `dev` turns template caching off, so it measures something
other than CDP. This is also the suite's e2e rung in the build loop's gate
(`e2e-k6` in `gates.json`, `run: test:docker-compose`):

```bash
npm run test:docker-compose
```

This runs the compose service `k6-workspace`, which runs `src/suites/smoke.k6.js`
against the whole workspace stack through `host.docker.internal`. It first waits
for the stack to be ready: it signs in, and reads each journey backend,
reference data, the dashboard read model and the address book. It then drives
the `live-animals`, `high-risk-plants`, `ins-front-door` and `ins-address-book`
sessions together for a short smoke window. It forces `ENVIRONMENT=local`, so it
can never reach a CDP environment. It prints k6's summary, uploads nothing, and
exits with k6's exit code — a breached threshold exits 99. The repo README
describes the run in full.

Other scripts:

| Script | What it runs |
|---|---|
| `test:docker-compose:<shape>` | A design-target suite against the workspace stack, with reports in `reports/`. Shapes: `sustained-peak`, `p99-burst`, `average-load`, `spike-recovery`, `endurance`, `peak-day`, `combined`, `resilience` |
| `test:docker-compose:background-volume`, `:stub-ceilings`, `:smoke-reports` | The background volume suite, the stub ceilings run, and the smoke suite with reports |
| `k6:cdp`, `k6:cdp:dev`, `k6:cdp:test` | A suite from a laptop against CDP dev or test. Needs `CDP_LOCAL=true`, `DEVELOPER_API_KEY` and, where the stub's password differs, `CDP_AUTH_PASSWORD` |
| `k6:inspect`, `k6:inspect:<suite>` | `k6 inspect` on a suite, without running it |
| `k6:down` | Tears down this repo's containers only, not the workspace stack |

## Smoke run on pull requests

`check-pull-request.yml` calls `.github/workflows/smoke.yml` on every pull
request that is not a draft. It starts the workspace stack with
`tim docker up --branch <the PR branch>`, builds the image, and runs it with
`TEST_SUITE=smoke` and `STUB_PROFILE=zero-delay`. Other repos can call
`smoke.yml` as a reusable workflow.

## Run in CDP

Merging to `main` publishes the image; it runs from the CDP Portal, which sets:

| Variable | Purpose |
|---|---|
| `ENVIRONMENT` | The environment to test, e.g. `perf-test`. Suites build service URLs from it |
| `RESULTS_OUTPUT_S3_PATH` | Where the report goes. The run fails if it is not set |
| `TEST_SUITE` | The suite to run, a file name under `src/suites/` without `.k6.js`. Defaults to `smoke` in `dev` and `test`, and to `health-check` everywhere else |

Without a `<SERVICE_NAME>_URL` override, a service's URL is
`https://<service-name>.<ENVIRONMENT>.cdp-int.defra.cloud`.

The image runs the suite through `scripts/run-suite.sh` and copies everything
it writes to `reports/` to `RESULTS_OUTPUT_S3_PATH`, including `index.html`
(the k6 web-dashboard report the Portal shows) and `summary.json` (k6's
end-of-test summary). It exits with k6's exit code — so a failed threshold
(code 99) fails the run, though the report is published first — or exits 1 if
`RESULTS_OUTPUT_S3_PATH` isn't set, the suite doesn't exist, the report wasn't
written, or the upload failed.

## Its place in the build loop

`gates.json` gives this repo five rungs: `format` (`format:check`), `lint`
(`lint`), `duplication` (`tim build duplication`), `unit` (`test`), and `e2e-k6`
(`test:docker-compose`). The `e2e-k6` rung also gates `trade-imports-stub`,
`trade-imports-defra-id-stub`, `trade-imports-ins-frontend`,
`trade-imports-animals-frontend`, `trade-imports-plants-frontend`,
`trade-imports-reference-data`, `trade-imports-dynamics-gateway` and
`trade-imports-workspace` — a change to any of those runs this repo's smoke
suite against the workspace stack as part of their own gate, not just this
repo's. The gate runs it against a `--dev` stack, so its timings are not
production-like; the pull request smoke run is the production-like one.

## Why `dockerStack` is null

This repo has no service in the workspace Docker stack — there is nothing to
run continuously; it is a test client that starts, runs one suite against
whatever stack is already up, and exits. `repos.json` sets `dockerStack: null`,
the same shape as `trade-imports-schemas` and `trade-imports-plants-prototype`.
