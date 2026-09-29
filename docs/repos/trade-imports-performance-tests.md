# trade-imports-performance-tests

**Repo:** DEFRA/trade-imports-performance-tests

## Purpose

k6 performance-test suites for the trade imports services — a CDP performance-test
suite. CDP builds the repo into a Docker image; the CDP Portal runs that image,
which runs one k6 suite and publishes the report to S3 so the Portal can show it.

## Layout

| Path | What it holds |
|---|---|
| `src/suites/` | One k6 script per suite, named `<suite>.k6.js` |
| `src/config/` | Plain JavaScript modules shared by suites, with their unit tests (`*.test.js`) |
| `entrypoint.sh` | What the image runs: one suite, then the S3 upload |
| `Dockerfile` | The image CDP runs, based on `grafana/k6` with the AWS CLI added |
| `compose.yml` | Local runs: LocalStack for S3 and `target`, a stand-in service with `/health` |
| `compose/` | LocalStack set-up and the stand-in service's nginx config |
| `.github/workflows/` | Pull request checks, and the CDP publish on merge to `main` |

Suites import shared modules with relative paths. k6 and Vitest both load them, so
they stay free of Node-only and k6-only APIs; a suite passes k6's `__ENV` in
rather than a shared module reading it directly.

## Responsibilities

- One k6 suite per performance-test type (load, soak, spike, burst, etc.) against
  the trade imports services.
- Shared config (service URL resolution) that both k6 and Vitest can load.
- Publishing the k6 web-dashboard report and summary to the CDP Portal via S3.

## Integrations

| Direction | Other side | How | What |
|---|---|---|---|
| Outbound | The services under test (INS frontend, journey frontends, reference-data, dynamics-gateway, stub, defra-id-stub) | HTTP | The traffic a suite generates |
| Outbound | S3 (or LocalStack locally) | AWS CLI, via `entrypoint.sh` | The k6 report (`index.html`, `summary.json`) |
| Inbound | CDP Portal | Docker image | Runs a suite on demand, reading `ENVIRONMENT` and `RESULTS_OUTPUT_S3_PATH` |

## Stack

- **Runtime:** k6 (`grafana/k6` image), plus Node.js tooling (lint, format, unit tests)
- **Test framework:** k6 for the suites; Vitest for the shared config's unit tests
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
npm test                  # Vitest unit tests for src/config/ — does not run k6
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

Run against the workspace stack (`tim docker dev`, started first). This is the
suite's e2e rung in the build loop's gate (`e2e-k6` in `gates.json`, `run:
test:docker-compose`):

```bash
npm run test:docker-compose
```

This runs `health-check.k6.js` against the INS frontend's `/health` on host
port 3002 through `host.docker.internal`, forcing `ENVIRONMENT=local` and a
service-URL override so it can never reach a CDP environment. It prints k6's
summary, uploads nothing, and exits with k6's exit code — a breached threshold
or a stack that isn't running exits 99.

```bash
npm run k6:down   # tear down this repo's containers only, not the workspace stack
```

## Run in CDP

Merging to `main` publishes the image; it runs from the CDP Portal, which sets:

| Variable | Purpose |
|---|---|
| `ENVIRONMENT` | The environment to test, e.g. `perf-test`. Suites build service URLs from it |
| `RESULTS_OUTPUT_S3_PATH` | Where the report goes. The run fails if it is not set |
| `TEST_SUITE` | The suite to run, a file name under `src/suites/` without `.k6.js`. Defaults to `health-check` |

Without a `<SERVICE_NAME>_URL` override, a service's URL is
`https://<service-name>.<ENVIRONMENT>.cdp-int.defra.cloud`.

The image writes `index.html` (the k6 web-dashboard report the Portal shows) and
`summary.json` (k6's end-of-test summary) to `RESULTS_OUTPUT_S3_PATH`. It exits
with k6's exit code — so a failed threshold (code 99) fails the run, though the
report is published first — or exits 1 if `RESULTS_OUTPUT_S3_PATH` isn't set,
the suite doesn't exist, the report wasn't written, or the upload failed.

## Its place in the build loop

`gates.json` gives this repo four rungs: `format` (`format:check`), `lint`
(`lint`), `unit` (`test`), and `e2e-k6` (`test:docker-compose`). The `e2e-k6`
rung also gates `trade-imports-stub`, `trade-imports-defra-id-stub`,
`trade-imports-ins-frontend`, `trade-imports-animals-frontend`,
`trade-imports-plants-frontend`, `trade-imports-reference-data` and
`trade-imports-dynamics-gateway` — a change to any of those runs this suite's
`health-check` k6 script against the workspace stack as part of their own gate,
not just this repo's.

## Why `dockerStack` is null

This repo has no service in the workspace Docker stack — there is nothing to
run continuously; it is a test client that starts, runs one suite against
whatever stack is already up, and exits. `repos.json` sets `dockerStack: null`,
the same shape as `trade-imports-schemas` and `trade-imports-plants-prototype`.
