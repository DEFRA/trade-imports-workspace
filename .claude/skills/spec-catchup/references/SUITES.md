# Suite table

One journey set at a time. `catch-up` / `cover` / `catch-up and cover`
with no set name runs all four, one at a time, each following the table
below.

| Set | Set name | Spec prefix | Local suite | E2E project |
|---|---|---|---|---|
| Live animals | `animals` | `live-animals` | `trade-imports-animals-frontend`: `npm run test:fit` | `e2e` |
| High-risk plants | `plants` | `plants` | `trade-imports-plants-frontend`: `npm run test:fit` | `plants` |
| Import Notification Service | `ins` | `ins` | `trade-imports-ins-frontend`: `npm run test:fit` | `ins` |
| Admin | `admin` | `admin` | `trade-imports-animals-admin`: `npm test` (vitest — there is no fit suite) | `admin` |

`<prefix>` in every command below is the **Spec prefix** column exactly
as written — no trailing slash (`tim spec gaps --capability live-animals/`
throws `Can't find capability "live-animals/"`; drop the slash). The
**E2E project** column is what `--project=` takes in
`trade-imports-animals-tests`; note live-animals is the odd one out
(`e2e`, not `animals`).

A capability's spec prefix and its coverage links' E2E project don't
always match — e.g. `live-animals/notification-events`'s only links live
under `--project=admin` (the outbox-event specs), so a green
`--project=e2e` run alone never exercises them. If a report seems to
have skipped a capability's own tests, check its `coverage.json` `file`
paths against the project that would actually run them before trusting
the report.

## Docker / OrbStack

Every set's E2E leg needs Docker Desktop or OrbStack running, then the
stack:

```
tim docker up
```

Use `up` (published Dockerhub images) — this skill judges against what
`main` actually looks like, and `dev` builds from the local `repos/`
checkout, which can be stale relative to it. Reach for `dev` only when
deliberately verifying in-progress local changes.

The local suite (fit, or admin's vitest) does not need the daemon. When
the stack is up, its published frontend container holds the same host
port the fit suite's own webServer defaults to (animals: 3000, plants:
3003) — override `PORT` for the fit run (e.g. `PORT=3050` / `PORT=3053`);
each frontend repo's `playwright.config.js` already reads
`process.env.PORT`.

If Docker/OrbStack is down and this pass will run the E2E leg — always,
on catch-up; on cover, only when the gap's proposed test is E2E — **stop
and ask the human to start it**. Never start Docker/OrbStack yourself
from the skill.

## Traces

Run every leg this set has with full traces retained, not just on failure — this skill
judges scenarios off a **green** report, and the repos' own defaults
(`retain-on-failure`, `on-first-retry`) capture nothing when everything
passes:

```
npm run test:fit -- --trace=on          # skip for admin — it has no fit suite
npm run test:docker-compose -- --project=<this set's E2E project column> --trace=on
```

`--trace=on` overrides each repo's `playwright.config` for this invocation
only — never edit the checked-in configs for this. Traces land under
`test-results/<test>/trace.zip`; inspect with the `playwright-trace` skill.

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
