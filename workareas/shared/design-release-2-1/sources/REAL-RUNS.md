# Real-service trace runs, 7 October 2026

Every repo was on latest `main`. Each folder is a copy of the suite's `test-results/`, one `<test>/trace.zip` per test, with the Playwright JSON report as `report.json`.

| Folder | Repo at | Command | Passed | Failed | Flaky | Skipped |
|---|---|---|---|---|---|---|
| `traces-animals-fit/` | trade-imports-animals-frontend `4c2119da` | `npm run test:fit -- --trace on --reporter=json` (projects `journeys`, `features`; stub mode, no stack) | 455 | 0 | 0 | 0 |
| `traces-ins-fit/` | trade-imports-ins-frontend `406e300` | `npm run test:fit -- --trace on --reporter=json` (projects `smoke`, `features`; stub mode) | 50 | 0 | 0 | 0 |
| `traces-e2e/` | trade-imports-ins-tests `3c7ea8a`, stack from `tim docker dev` | `npm run test:docker-compose -- --project=animals --project=ins --trace on --reporter=json` | 181 | 0 | 2 | 6 |

## Flaky

Both passed on retry. Both are timeouts on a freshly built stack.

| Spec | Test | First-attempt error |
|---|---|---|
| `animals/e2e/pages/notification-dashboard.spec.ts` | copies a submitted notification from its searched dashboard card | Test timeout of 90000ms exceeded |
| `animals/e2e/pages/transited-countries.spec.ts` | transit countries are optional: continuing with none saves and goes on | Test timeout of 30000ms exceeded while running "beforeEach" hook |
