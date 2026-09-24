# Suite table

One journey set at a time. `catch-up` / `cover` / `catch-up and cover`
with no set name runs all four, one at a time, each following the table
below.

| Set | Set name | Spec prefix | Local suite | E2E |
|---|---|---|---|---|
| Live animals | `animals` | `live-animals/` | `trade-imports-animals-frontend`: `npm run test:fit` | `trade-imports-animals-tests`: `tests/e2e/features/` and `tests/e2e/pages/`, except `plants/`, `ins/`, `admin/` |
| High-risk plants | `plants` | `plants/` | `trade-imports-plants-frontend`: `npm run test:fit` | `trade-imports-animals-tests`: `tests/e2e/features/plants/` |
| Import Notification Service | `ins` | `ins/` | `trade-imports-ins-frontend`: `npm run test:fit` | `trade-imports-animals-tests`: `tests/e2e/features/ins/` |
| Admin | `admin` | `admin/` | `trade-imports-animals-admin`: `npm test` (vitest — there is no fit suite) | `trade-imports-animals-tests`: `tests/e2e/features/admin/` and `tests/e2e/pages/admin/` |

## Docker / OrbStack

Every set's E2E leg needs Docker Desktop or OrbStack running, then the
stack:

```
tim docker dev
```

The local suite (fit, or admin's vitest) does not need the daemon.

If Docker/OrbStack is down and this pass will run the E2E leg — always,
on catch-up; on cover, only when the gap's proposed test is E2E — **stop
and ask the human to start it**. Never start Docker/OrbStack yourself
from the skill.

## Report reuse

A reused report is only valid when it was taken from the exact code this
run will judge against. Before reusing a same-day report, compare its
recorded SHAs to the current ones:

```
git rev-parse HEAD
git -C repos/<local-suite-repo> rev-parse HEAD
git -C repos/trade-imports-animals-tests rev-parse HEAD
```

(only the repos this set's suite touches). If every SHA matches what an
earlier run today recorded in that run's `shas.json`, reuse its pass/fail
output instead of re-running. Any mismatch — or no run yet today — means
run the full suite again, never `--only-changed`: a dated folder alone is
not enough to trust a report.

## Run directory

- Catch-up: `~/git/defra/trade-imports-workspace/workareas/spec-catchup/<YYYY-MM-DD>-<set>/`
- Cover: `~/git/defra/trade-imports-workspace/workareas/spec-cover/<YYYY-MM-DD>-<set>/`

Each holds `shas.json` (the SHAs the report was taken from), any
`judge-*.json` written by fanned-out workers, and Playwright
report/notes for that run. Don't write those files directly under the
skill's `workareas/<skill>/` — always inside the dated, set-scoped
subfolder.
