# E2E tests: GitHub Actions

This page sets out the tests GitHub Actions runs for each repo, and the scheduled runs in `trade-imports-ins-tests`.

For the runs the CDP Portal triggers, see [E2E tests: CDP](e2e-tests-cdp.md).

> **Suggestion 1:** tag specs by the services they exercise (for example `@svc:ins-backend`, on the `describe` or the test) and have the workflow select by `--grep` on the PR's repo, instead of a hand-kept repo-to-domain file. Coupling then lives next to the test, new specs are picked up automatically, and the **Future consideration** tags (`@gateway`, `@auth` and so on) become one scheme. It needs a tagging pass and a convention, and tags can still drift; a lint rule requiring at least one service tag would help.
>
> **Suggestion 2:** a lighter variant of 1. Run a repo's own domain by path, then add only the specs from other domains tagged with that service. Tags then cover just the cross-domain links, and a missed tag only loses extra coverage, never the repo's own domain. Playwright ANDs a path with `--grep`, so resolve the tagged spec files first and pass them with the domain path.
>
> **Preferred: suggestion 2.** A missed tag only loses extra coverage, and far fewer tags are needed.

## Pull requests

[`.github/workflows/e2e-tests.yml`](../../.github/workflows/e2e-tests.yml) reads [`scripts/ci/e2e-tests-pr-scope.json`](../../scripts/ci/e2e-tests-pr-scope.json) and runs the domains for the calling repo. That file is what selects the tests. A list names the domains, each run as `tests/<name>/`.

A repo's pull request runs these tests only when its own workflow calls `.github/workflows/e2e-tests.yml`. A repo that does not call it has no entry in the scope file, on purpose, and shows `none` below.

A repo missing from `scripts/ci/e2e-tests-pr-scope.json` fails the run. So does a domain that does not exist. `"all"`, or an empty domain value, runs every domain.

### INS repos

| Repo | Domains | Links |
|---|---|---|
| address-book | ins, animals, plants | **ins** — ins frontend uses the address book.<br>**animals** — animals frontend uses the address book.<br>**plants** — plants frontend uses the address book. |
| ins-backend | ins | **ins** — this repo's domain.<br>**Not run: animals, plants** — ins already drives the animals journey; plants publishes no events yet. |
| ins-frontend | ins, animals, plants | **ins** — this repo's domain.<br>**animals** — animals journey hands off to add-address.<br>**plants** — plants journey will hand off to add-address (not yet built). |

### Animals repos

| Repo | Domains | Links |
|---|---|---|
| animals-admin | animals, animals-admin | **animals** — specs create notifications through animals-frontend.<br>**animals-admin** — this repo's domain.<br>**Not run: ins** — replay only republishes events; ins-backend's handling of them is covered on ins-backend. |
| animals-backend | ins, animals, animals-admin | **ins** — events from this backend feed the ins aggregate.<br>**animals** — this repo's domain.<br>**animals-admin** — admin reads animals notification data. |
| animals-frontend | animals, animals-admin | **animals** — this repo's domain.<br>**animals-admin** — admin specs seed notifications through this frontend.<br>**Not run: ins** — aggregate is fed by animals-backend; add-address handoff is covered on ins-frontend. |

### Plants repos

| Repo | Domains | Links |
|---|---|---|
| plants-backend | ins, plants | **ins** — will mirror animals-backend once its outbox ships.<br>**plants** — this repo's domain. |
| plants-frontend | plants | **plants** — this repo's domain.<br>**Not run: ins** — aggregate will be fed by plants-backend. |

### Shared stack repos

Shared across journey services. `"all"` in `scripts/ci/e2e-tests-pr-scope.json` runs every Playwright domain on a pull request; if that becomes too slow, see **Future consideration** in each row's **Notes** for tag-based scope instead. `none` means the repo runs no ins-tests domain (shared contract or tooling only).

| Repo | Domains | Notes |
|---|---|---|
| dynamics-gateway | all | Forwards notification events from the stack to Azure Service Bus; only animals publishes today, but any journey may use it.<br>**Future consideration:** `@gateway` (to add) — event routing and admin outbox/replay specs. |
| defra-id-stub | all | OIDC sign-in stub; all four UIs depend on it.<br>**Future consideration:** `@auth` — sign-in specs in each domain. |
| reference-data | all | Shared countries and ports; multiple frontends read it.<br>**Future consideration:** `@reference-data` (to add) — specs that load countries or ports of entry. |
| schemas | none | Shared JSON Schema and JSON-LD contracts; consumed by multiple services (e.g. animals-backend, dynamics-gateway). |
| stub | all | Stub for upstream trade-platform and MDM; stack-wide.<br>**Future consideration:** `@trade-platform` (to add) — specs that call this repo's trade-platform or MDM endpoints. |
| workspace | all | Workspace for the service repos (holds the shared e2e workflow and Docker Compose stack).<br>**Future consideration:** `@smoke` — a cheap "stack + front doors" signal (Compose up, minimal journey per domain); not the full e2e suite. |

### Test repos

| Repo | Domains | Notes |
|---|---|---|
| ins-tests | all | Playwright e2e testing suite; holds every domain's specs.<br>**Future consideration:** if pull-request run time grows too long, narrow by changed paths under `tests/` (shared code still runs `all`). |
| performance-tests | none | Performance testing suite; separate from ins-tests Playwright e2e. |

### Prototype repos

| Repo | Domains | Notes |
|---|---|---|
| plants-prototype | none | Designer prototype; outside the Docker stack. |

## Scheduled runs

### Security tests

`trade-imports-ins-tests` runs the active security scan on a schedule, not on a pull request. It uses the bare `security:active` profile, so it covers every domain. It runs only the `@active` specs, under each domain's `security/` directory. Pull-request runs exclude them. CDP cannot run this profile.

| Profile | Environment | Domains | Schedule |
|---|---|---|---|
| `security:active` | docker-compose stack, `main` images | all | 01:00 UTC, Monday to Friday |

Times are in the zone the schedule is set in: UTC here, Europe/London on CDP. In summer, 01:00 UTC is 02:00 in London.

## Keeping this up to date

Change `scripts/ci/e2e-tests-pr-scope.json` and the matching table rows when scope or couplings change (**Links** for domain repos, **Notes** for shared stack and test repos). When narrowing ships, update **Domains**, rewrite **Notes**, and drop or replace **Future consideration:**. The CDP Portal is configured separately, in [E2E tests: CDP](e2e-tests-cdp.md). Nothing keeps the two docs in sync.
