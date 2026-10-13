# Suite table

One domain at a time. `catch-up` / `cover` / `catch-up and cover`
with no domain name runs every row in the table, one at a time, each
following the table below.

| Domain | Spec prefix | Local test suite | E2E suites path |
|---|---|---|---|
| `animals` | `live-animals` | `trade-imports-animals-frontend`: `npm run test:fit` | `tests/animals/` |
| `germinal` | `germinal-products` | `trade-imports-animals-frontend`: `npm run test:fit` | `tests/animals/` (provisional) |
| `plants` | `plants` | `trade-imports-plants-frontend`: `npm run test:fit` | `tests/plants/` |
| `ins` | `ins` | `trade-imports-ins-frontend`: `npm run test:fit` | `tests/ins/` |
| `animals-admin` | `admin` | `trade-imports-animals-admin`: `npm test` (vitest — there is no fit suite) | `tests/animals-admin/` |

A **domain** is a top-level directory under `tests/` in
`trade-imports-ins-tests`. A **spec prefix** is a Behaviour Spec path under
`openspec/specs/`, not a domain — the two only sometimes share a name
(`live-animals` is the `animals` domain's prefix, `admin` is
`animals-admin`'s). `germinal` is the one row that is not yet a domain:
see below.

Germinal products is a sibling set of live animals in the same frontend
repo (`sets/germinal-products`), built by the Design Release 2.1
programme. Until that build writes its first capability under
`openspec/specs/germinal-products/`, there is nothing to catch up or
cover, and `tim spec lint|gaps --capability germinal-products` exits 2
with `Can't find capability` — skip the set and say so. Germinal fit
specs appear in the `test:fit` report only once the repo's
`playwright.config.js` has a project covering `sets/germinal-products`
(today the `features` project covers `sets/live-animals` only). Until
then, skip the local-suite half for germinal and record that you did,
rather than judging against a report that cannot contain germinal specs
— an absent germinal spec there is not evidence that no test exists.
Once the project exists, judge only the germinal specs in the report.
`trade-imports-ins-tests` has no `tests/germinal/` domain yet; its E2E
specs are assumed to land under `tests/animals/`, beside the repo's other
animals specs, so filter that report to the germinal specs. When the tests
repo gives the set its own domain directory, replace `tests/animals/
(provisional)` with that path.

`<prefix>` in every command below is the **Spec prefix** column exactly
as written — no trailing slash (`tim spec gaps --capability live-animals/`
throws `Can't find capability "live-animals/"`; drop the slash). The
**E2E suites path** column is what `npm run test:docker-compose --` takes
as a positional argument in `trade-imports-ins-tests`: the domain's whole
test suite, `tests/<domain>/{e2e,a11y,security}/`. The trailing slash
matters — positional paths are regexes, so `tests/animals` would also match
`tests/animals-admin/`. The tests repo holds all four domains as
directories; one `chromium` Playwright project runs them.

A capability's spec prefix and its coverage links' domain don't
always match — e.g. `live-animals/notification-events`'s E2E links live
under `tests/animals-admin/` (the outbox-event specs), so a green
`tests/animals/` run alone never exercises them. If a report seems to
have skipped a capability's own tests, check its `coverage.json` `file`
paths against the domain directory that would actually run them before
trusting the report.

## Docker / OrbStack

Every domain's E2E leg needs Docker Desktop or OrbStack running, then the
stack:

```
tim docker up
```

Use `up` (published Dockerhub images) — this skill judges against what
`main` actually looks like, and `dev` builds from the local `repos/`
checkout, which can be stale relative to it. Reach for `dev` only when
deliberately verifying in-progress local changes.

The local test suite (fit, or animals-admin's vitest) does not need the
daemon. When the stack is up, its published frontend container holds the
same host port the fit suite's own webServer defaults to (animals: 3000,
plants: 3003) — override `PORT` for the fit run (e.g. `PORT=3050` /
`PORT=3053`); each frontend repo's `playwright.config.js` already reads
`process.env.PORT`.

If Docker/OrbStack is down and this pass will run the E2E leg — always,
on catch-up; on cover, only when the gap's proposed test is E2E — **stop
and ask the human to start it**. Never start Docker/OrbStack yourself
from the skill.

## Traces

Run every leg this domain has with full traces retained, not just on failure — this skill
judges scenarios off a **green** report, and the repos' own defaults
(`retain-on-failure`, `on-first-retry`) capture nothing when everything
passes:

```
npm run test:fit -- --trace=on          # skip for animals-admin — it has no fit suite (run in the local-test-suite repo)
npm run test:docker-compose -- <this domain's E2E suites path> --trace=on   # run in repos/trade-imports-ins-tests
```

`--trace=on` overrides each repo's `playwright.config` for this invocation
only — never edit the checked-in configs for this. Traces land under
`test-results/<test>/trace.zip`; inspect with the `playwright-trace` skill.

### Running more than one domain in the same pass

`trade-imports-ins-tests` is one repo holding all four domains as
directories, so its E2E leg is not tied to a single
domain the way each domain's own local test suite is. When this pass will judge
more than one domain — `catch-up` / `cover` / `catch-up and cover` with no
domain name, or any run covering several domains back to back — run the E2E
leg **once, for every domain together**, instead of once per domain:

```
npm run test:docker-compose -- --trace=on   # no path filter — all four domains in one run
```

Record its SHA once in a shared run directory —
`~/git/defra/trade-imports-workspace/workareas/spec-catchup/<date>-e2e-all/shas.json`
— and have every domain's own run directory point at it instead of
re-running the E2E leg. Each domain then judges only its own slice of
that one report (spec paths under `tests/<domain>/`; trace directories
start with `chromium-`, not the domain, so filter by spec path or test
title). Running a single domain on its own (`catch-up animals` alone)
still scopes the E2E leg to its path, `tests/<domain>/` — the batching
above is only a saving once more than one domain's E2E leg would
otherwise run in the same pass.

## Report reuse

A reused report is only valid when it was taken from the exact code this
run will judge against. Before reusing a same-day report, compare its
recorded SHAs to the current ones:

```
git rev-parse HEAD
git -C repos/<local-suite-repo> rev-parse HEAD
git -C repos/trade-imports-ins-tests rev-parse HEAD
```

(only the repos this domain's suites touch). If every SHA matches what an
earlier run today recorded in that run's `shas.json`, reuse its pass/fail
output instead of re-running. Any mismatch — or no run yet today — means
run the full suite again, never `--only-changed`: a dated folder alone is
not enough to trust a report.

## Run directory

- Catch-up: `~/git/defra/trade-imports-workspace/workareas/spec-catchup/<YYYY-MM-DD>-<domain>/`
- Cover: `~/git/defra/trade-imports-workspace/workareas/spec-cover/<YYYY-MM-DD>-<domain>/`

Each holds `shas.json` (the SHAs the report was taken from), any
`judge-*.json` written by fanned-out workers, and Playwright
report/notes for that run. Don't write those files directly under the
skill's `workareas/<skill>/` — always inside the dated, domain-scoped
subfolder.
