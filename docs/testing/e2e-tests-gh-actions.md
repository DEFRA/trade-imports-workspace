# E2E tests: GitHub Actions

This page describes how GitHub Actions picks the e2e tests for a pull request, and the scheduled runs in `trade-imports-ins-tests`. What each repo runs is in [`config/e2e-tests-pr-scope.json`](../../config/e2e-tests-pr-scope.json), not here.

For the runs the CDP Portal triggers, see [E2E tests: CDP](e2e-tests-cdp.md). For what domain, suite and service tag mean, see [Test and spec vocabulary](test-and-spec-vocabulary.md).

## Pull requests

Only a repo that calls [`.github/workflows/e2e-tests.yml`](../../.github/workflows/e2e-tests.yml) gets ins-tests e2e tests on its pull requests. [Repos that do not call it](#repos-that-do-not-call-the-workflow) run none. A PR run is e2e only: it excludes specs carrying `@a11y`, `@active` or `@dynamics`.

For a repo that does, the workflow takes its entry from the scope file and runs it. An entry has two lists:

- `suites`: paths under `tests/` to run, in one command. A suite is a domain's directory (`tests/animals/`) or a test type within it (`tests/animals/e2e/`).
- `tags`: service tags. Tests from any domain carrying one of these run in a second command, after the suites.

Both commands are sharded three ways, and each shard runs both.

```json
"trade-imports-animals-backend": {
  "suites": ["tests/animals/", "tests/animals-admin/"],
  "tags": ["@animals-backend"]
}
```

This runs the animals and animals-admin suites, then any other spec tagged `@animals-backend`.

### What an entry can do

- **Several suites**: list as many paths as needed.
- **Nested suites**: a path can go below a domain, such as `tests/animals/e2e/`.
- **Several tags**: list them, and one command runs every spec carrying any of them.
- **Everything**: `"suites": ["all"]`. It stands alone and cannot be combined with tags, since it already runs every test.
- **Tags only**: set `tags` and leave `suites` out or empty (`"suites": []`). Only the tagged tests run, and a shard with none passes.
- **No entry**: a repo missing from the file uses `default`, which runs everything. An entry whose suites and tags are both empty or missing fails the run, such as `{ "suites": [], "tags": [] }` or `{}`.
- **Manual runs**: a manual run of the workflow in the workspace repo takes its suites and tags from the run inputs instead of the scope file, under the same rules.

A service runs its own suite plus the specs carrying its tag. A missing tag loses extra coverage, never the service's own suite.

A deployment on CDP runs a whole [family](e2e-tests-cdp.md#families) of domains; a PR runs only the domains in its entry, plus tagged specs, to keep PR feedback fast.

`npm run lint` in `trade-imports-ins-tests` fails a spec that carries a service's tag when it sits in a domain that service already runs by path.

### Repos that run everything

These repos use the `default` entry, which runs every suite. If pull-request run time grows too long, a tag could narrow them instead.

| Repo | Why | Future consideration |
|---|---|---|
| dynamics-gateway | Forwards notification events from the stack to Azure Service Bus; only animals publishes today, but any journey may use it. | `@gateway` (to add) — event routing and admin outbox/replay specs. |
| defra-id-stub | OIDC sign-in stub; all four UIs depend on it. | `@auth` (exists) — sign-in specs in each domain. |
| reference-data | Shared countries and ports; multiple frontends read it. | `@reference-data` (to add) — specs that load countries or ports of entry. |
| stub | Stub for upstream trade-platform and MDM; stack-wide. | `@trade-platform` (to add) — specs that call this repo's trade-platform or MDM endpoints. |
| workspace | Holds the shared e2e workflow and Docker Compose stack. | `@smoke` (exists) — a cheap "stack + front doors" signal (Compose up, minimal journey per domain); not the full e2e suite. |
| ins-tests | Playwright e2e testing suite; holds every domain's specs. | Narrow by changed paths under `tests/` (shared code still runs everything). |

### Repos that do not call the workflow

These repos do not call the workflow, so their pull requests run no ins-tests e2e tests. Having no entry means "run everything" only for a repo that does call it. They still run their own checks, such as unit tests, lint and the SonarCloud scan, where they have them.

| Repo | Why |
|---|---|
| schemas | Shared JSON Schema and JSON-LD contracts, consumed by several services (such as animals-backend and dynamics-gateway). |
| performance-tests | Performance testing suite, separate from the ins-tests Playwright e2e. |
| plants-prototype | Designer prototype, outside the Docker stack. |

### Tagging specs for a service

The `service-tag` skill tags the specs in other domains that a service's pull request should also run, and keeps each entry's `tags` in `config/e2e-tests-pr-scope.json` in step. Ask for "tag specs for `<service>`", or `service-tag` for every entry except `default`. It skips the `default` entry, so the future tags in [Repos that run everything](#repos-that-run-everything) aren't covered.

It reads which services call the service directly from the stack's compose wiring, searches those callers' domains (minus the ones the service already runs by path) for specs that use the service's fixtures, and tags only the ones that exercise it. It skips specs carrying `@a11y`, `@active` or `@dynamics`, which the PR run filters out. How a spec reaches each service, the links the wiring can't show, and the specs ruled out are in [`service-decisions.md`](../../.claude/skills/service-tag/references/service-decisions.md). At the start it asks whether to leave changes unstaged, commit, or branch first, and it never pushes.

## Scheduled runs

### Security tests

`trade-imports-ins-tests` runs the active security scan on a schedule, not on a pull request. It uses the bare `security:active` profile, so it covers every domain. It runs only the `@active` specs, under each domain's `security/` directory. Pull-request runs exclude them. CDP cannot run this profile.

| Profile | Environment | Domains | Schedule |
|---|---|---|---|
| `security:active` | docker-compose stack, `main` images | all | 01:00 UTC, Monday to Friday |

Times are in the zone the schedule is set in: UTC here, Europe/London on CDP. In summer, 01:00 UTC is 02:00 in London.

## Keeping this up to date

Change `config/e2e-tests-pr-scope.json` when scope changes, and the skill's `service-decisions.md` when a service's fixtures or decisions change. This page describes the approach, so it needs updating only when the approach changes. The CDP Portal is configured separately, in [E2E tests: CDP](e2e-tests-cdp.md). Nothing keeps the two docs in sync.
