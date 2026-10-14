# E2E tests: GitHub Actions

This page sets out the tests GitHub Actions runs for each repo, and the scheduled runs in `trade-imports-ins-tests`.

For the runs the CDP Portal triggers, see [E2E tests: CDP](e2e-tests-cdp.md). For what domain, suite and service tag mean, see [Test and spec terms](test-and-spec-terms.md).

## Pull requests

[`.github/workflows/e2e-tests.yml`](../../.github/workflows/e2e-tests.yml) reads [`scripts/ci/e2e-tests-pr-scope.json`](../../scripts/ci/e2e-tests-pr-scope.json) and runs what the calling repo's entry says. That file is what selects the tests. An entry has two lists:

- `suites`: the suites to run, each a path under `tests/`: a domain's directory (`tests/animals/`) or one test type within it (`tests/animals/e2e/`). `"all"` runs every suite and stands alone.
- `tags`: service tags. Tests carrying one run from any domain, as a second command after the suites, in every shard.

A repo with no entry uses `default`, which runs everything. An entry with neither list fails the run. A repo that does not call the workflow has no entry on purpose, and shows `none` below.

A service runs its own domain's suite, plus any spec from another domain that carries its service tag. The tag only adds coverage: a spec missing its tag loses extra coverage, never the service's own suite. `npm run lint` in `trade-imports-ins-tests` fails a spec that carries the tag of the domain it sits in, because that domain already runs by path.

### Manual runs

Running the workflow by hand from the workspace repo's Actions tab uses its own inputs instead of the scope file: `suites` (for example `tests/animals/` or `tests/animals/e2e/`; default `all`) and `tags` (for example `@ins-backend`). Clear `suites` to run only the tagged tests. A manual run started from a service repo uses that repo's scope entry.

### Service repos

What runs comes from the scope file. **Links** says why a repo's pull request should also run other domains' specs, so those specs can be tagged. Tagged today: `@animals-backend` on two `ins` specs. No other service tag matches a spec yet.

| Repo | Suites | Tag | Links |
|---|---|---|---|
| address-book | `tests/ins/` | `@address-book` | **animals, plants** — their frontends use the address book. |
| ins-backend | `tests/ins/` | `@ins-backend` | **animals, plants** — not needed: ins already drives the animals journey, and plants publishes no events yet. |
| ins-frontend | `tests/ins/` | `@ins-frontend` | **animals** — the journey hands off to add-address.<br>**plants** — will hand off to add-address (not yet built). |
| animals-admin | `tests/animals-admin/` | `@animals-admin` | **animals** — admin specs create notifications through animals-frontend.<br>**ins** — not needed: replay only republishes events, and ins-backend's handling is covered there. |
| animals-backend | `tests/animals/`, `tests/animals-admin/` | `@animals-backend` | **ins** — events from this backend feed the ins aggregate. |
| animals-frontend | `tests/animals/` | `@animals-frontend` | **animals-admin** — admin specs seed notifications through this frontend.<br>**ins** — not needed: the aggregate is fed by animals-backend. |
| plants-backend | `tests/plants/` | `@plants-backend` | **ins** — will mirror animals-backend once its outbox ships. |
| plants-frontend | `tests/plants/` | `@plants-frontend` | **ins** — not needed yet: the aggregate will be fed by plants-backend. |

### Shared stack repos

Shared across journey services. They use the `default` entry, which runs every domain on a pull request; if that becomes too slow, see **Future consideration** in each row's **Notes** for tag-based scope instead. `none` means the repo runs no ins-tests domain (shared contract or tooling only).

| Repo | Suites | Notes |
|---|---|---|
| dynamics-gateway | all | Forwards notification events from the stack to Azure Service Bus; only animals publishes today, but any journey may use it.<br>**Future consideration:** `@gateway` (to add) — event routing and admin outbox/replay specs. |
| defra-id-stub | all | OIDC sign-in stub; all four UIs depend on it.<br>**Future consideration:** `@auth` — sign-in specs in each domain. |
| reference-data | all | Shared countries and ports; multiple frontends read it.<br>**Future consideration:** `@reference-data` (to add) — specs that load countries or ports of entry. |
| schemas | none | Shared JSON Schema and JSON-LD contracts; consumed by multiple services (e.g. animals-backend, dynamics-gateway). |
| stub | all | Stub for upstream trade-platform and MDM; stack-wide.<br>**Future consideration:** `@trade-platform` (to add) — specs that call this repo's trade-platform or MDM endpoints. |
| workspace | all | Workspace for the service repos (holds the shared e2e workflow and Docker Compose stack).<br>**Future consideration:** `@smoke` — a cheap "stack + front doors" signal (Compose up, minimal journey per domain); not the full e2e suite. |

### Test repos

| Repo | Suites | Notes |
|---|---|---|
| ins-tests | all | Playwright e2e testing suite; holds every domain's specs.<br>**Future consideration:** if pull-request run time grows too long, narrow by changed paths under `tests/` (shared code still runs `all`). |
| performance-tests | none | Performance testing suite; separate from ins-tests Playwright e2e. |

### Prototype repos

| Repo | Suites | Notes |
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

Change `scripts/ci/e2e-tests-pr-scope.json` and the matching table rows when scope or couplings change (**Suites**, **Tag** and **Links** for service repos, **Notes** for shared stack and test repos). When narrowing ships, update **Suites**, rewrite **Notes**, and drop or replace **Future consideration:**. The CDP Portal is configured separately, in [E2E tests: CDP](e2e-tests-cdp.md). Nothing keeps the two docs in sync.
