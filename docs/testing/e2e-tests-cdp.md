# E2E tests: CDP

**Runs after a deployment and on a schedule, from the CDP Portal. Configured in the portal, not in any repo.**

This page records the runs the CDP Portal triggers after each deployment and on a
[schedule](#scheduled-runs). Each run is one `PROFILE` of the
`trade-imports-ins-tests` test suite: `default` (the e2e suite), `a11y`,
`dynamics` or `security`, run for every domain, or `<domain>:<suite>` (for
example `animals:e2e`) for one. The profiles are described in the
[`trade-imports-ins-tests` README](../../repos/trade-imports-ins-tests/README.md#running-tests-via-cdp-portal).
For the runs that happen on every PR instead, see [E2E tests: GitHub Actions](e2e-tests-gh-actions.md).

## After a deployment

### Runs by service

Each entry is one `PROFILE` run, for example `ins:e2e`. The columns are Portal
environments. `dev` and `test` run the same e2e runs, and `test` adds a11y for each
frontend and the Dynamics checks; "as dev" means the same runs as `dev`. `perf-test`
and `pre` have none recorded yet.

Security runs only on a [schedule](#scheduled-runs), not after a deployment. Adding a
domain means adding its run in the portal for each service that should have it. A repo
that appears in none of these tables has no recorded deployment run.

#### Families

A service's deployment runs the domains of the journey it serves (the
[frontends that use it](test-and-spec-vocabulary.md#why-tests-are-grouped-by-domain),
and the admin app where there is one), plus `ins`, which every journey feeds. Together
these are its family. Domains outside the family don't run, so an unrelated journey
can't fail the deployment.

| Family | Domains | Services |
|---|---|---|
| Animals | ins, animals, animals-admin | animals-admin, animals-backend, animals-frontend |
| Plants | ins, plants | plants-backend, plants-frontend |
| INS | ins, animals, plants | address-book, ins-backend, ins-frontend |

The INS services serve every journey, so their family has every journey's domain.
It leaves out animals-admin, which only the animals services link to.

The [core services](#core-services), below, have no family.

#### INS family

| Repo | dev | test | perf-test | pre |
|---|---|---|---|---|
| address-book | `ins:e2e`, `animals:e2e`, `plants:e2e` | as dev | | |
| ins-backend | `ins:e2e`, `animals:e2e`, `plants:e2e` | as dev | | |
| ins-frontend | `ins:e2e`, `animals:e2e`, `plants:e2e` | as dev, plus `ins:a11y (TODO)` | | |

#### Animals family

| Repo | dev | test | perf-test | pre |
|---|---|---|---|---|
| animals-admin | `ins:e2e`, `animals:e2e`, `animals-admin:e2e` | as dev, plus `animals-admin:a11y` | | |
| animals-backend | `ins:e2e`, `animals:e2e`, `animals-admin:e2e` | as dev, plus `animals:dynamics` | | |
| animals-frontend | `ins:e2e`, `animals:e2e`, `animals-admin:e2e` | as dev, plus `animals:a11y`, `animals:dynamics` | | |

#### Plants family

| Repo | dev | test | perf-test | pre |
|---|---|---|---|---|
| plants-backend | `ins:e2e`, `plants:e2e` | as dev, plus `plants:dynamics (TODO)` | | |
| plants-frontend | `ins:e2e`, `plants:e2e` | as dev, plus `plants:a11y (TODO)`, `plants:dynamics (TODO)` | | |

#### Core services

Core services have no family. They serve every journey, so nothing is left out: they
run every domain through the bare `default` profile, which also covers any domain added
later.

| Repo | dev | test | perf-test | pre |
|---|---|---|---|---|
| dynamics-gateway | `default` | as dev, plus `dynamics` | | |
| defra-id-stub | `default` | as dev | | |
| reference-data | `default` | as dev | | |
| stub | `default` | as dev | | |

[GitHub Actions](e2e-tests-gh-actions.md#repos-that-run-everything) runs the e2e tests
for these four on every PR too, plus the workspace and ins-tests repos, with the
compose-only specs included. The `dynamics` run doesn't run on PRs.

### What does not run on CDP

Every e2e run covers fewer specs here than in
[GitHub Actions](e2e-tests-gh-actions.md#pull-requests), because specs tagged
`@compose`, and the `@mongodb` specs that skip themselves outside the compose stack,
do not run on CDP. That includes most of the `animals-admin`
specs (the `outbox-event-*` specs, DLQ events, the seed specs), the aggregated-notification
and cross-service-sessions specs under `ins`, the animals add-address handshake
and address-book navigation, and the promoted and persistence specs under
`animals`. The `plants` domain has none. The outbox and aggregate flow is
therefore covered in GitHub Actions only, so a wider domain list on CDP does not
add coverage for it.

The `security:active` profile is not supported on CDP, so no run uses it. It
runs on a schedule in GitHub Actions instead (see
[E2E tests: GitHub Actions](e2e-tests-gh-actions.md#scheduled-runs)).

## Scheduled runs

The `trade-imports-ins-tests` suite also runs on a schedule, not tied to any
service's deployment. Each run uses a bare profile, so it covers every domain.
They run in order: the full e2e run first, then accessibility, then the ZAP scan
last, because it is the heaviest.

| Profile | Environment | Domains | Schedule |
|---|---|---|---|
| `default` (e2e) | test | all | 01:00, Monday to Friday (Europe/London) |
| `a11y` | test | all | 02:00, Monday to Friday (Europe/London) |
| `security` | test | all | 03:00, Monday to Friday (Europe/London) |

The `security` run is not a separate set of specs: it runs the ordinary e2e
specs through a passive ZAP scan. The `@active` specs under each domain's
`security/` directory are excluded, and run in GitHub Actions instead.

Times are in the zone the schedule is set in: Europe/London here, UTC in
GitHub Actions. In summer, 01:00 UTC is 02:00 in London.

## Family profiles `PROPOSED`

A family profile runs every suite for a
[family](#families) in one run: e2e, a11y, dynamics and security. A service would need
one run, such as `animals-family`, instead of a run per domain and suite (`ins:e2e`,
`animals:e2e`, `animals-admin:e2e`, `animals:a11y` and so on). These profiles don't
exist yet and would need adding to `trade-imports-ins-tests`.

| | Separate runs (today) | One family profile |
|---|---|---|
| Runs per service | one per domain and suite | one |
| Resources | each run has its own 4 vCPU and 8 GB (8 vCPU and 16 GB on Large) | the whole family shares one |
| Speed | the domains run in parallel, so feedback is faster | the domains share one run, so it takes longer |
| Result to check | one per domain and suite | one for the family |

Separate runs suit deployments, where fast feedback matters. A family profile suits
a manual or release check, where one result for the family matters more than speed,
and an unrelated domain can't block it. The profiles would be `animals-family`,
`plants-family` and `ins-family`. They would run only on `test`, because the Dynamics
checks need the Dynamics environment.

## A new service shows "service not found"

A new frontend's first deployment can start cleanly and still serve nginx's
"service not found" page to every request, so every run against it fails. The
signs: the app logs show it started, the load balancer logs show an upstream
time of `0.000`, and the only requests reaching it are for
`/nginx-error-assets/...`. The routing for a service is generated from its
tenant config, not at deployment, so the first deployment can land before its
route exists.

Redeploy the service in the CDP Portal before you debug the app. To check
whether a service is deployed to an environment at all, read
`DEFRA/cdp-app-deployments/environments/<env>/{public,protected}/<service>.json`
with `gh api`. No file means it was never deployed. Read only: never write to
CDP platform repos (`CLAUDE.md` rule 3).

## Keeping this up to date

This doc is read from the CDP Portal by hand, not from a file in a repo, so
nothing keeps it in sync. Update it when:

- a service's runs change (**CDP Portal > Services > *service* > Automations >
  Test Runs > Automatic Test Runs**),
- the `trade-imports-ins-tests` test suite's schedule changes.

The runs that happen on every PR are configured separately and recorded in
[E2E tests: GitHub Actions](e2e-tests-gh-actions.md). Nothing keeps the two
docs in sync with each other automatically.
