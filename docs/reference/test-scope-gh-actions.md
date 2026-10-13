# Test scope: GitHub Actions

**Runs on every PR and on a schedule, in GitHub Actions. Configured in each repo's `e2e-tests.yml` (`workspace-e2e-tests.yml` in `trade-imports-ins-tests`), and for the scheduled run in `trade-imports-ins-tests`' `scheduled-security-scan.yml`.**

Which domain(s) (`animals`, `animals-admin`, `ins`, `plants` — the top-level
directories under `tests/` in `trade-imports-ins-tests`) each repo's PR-triggered
e2e run covers, and the [scheduled runs](#scheduled-runs). Each repo's own
`.github/workflows/e2e-tests.yml` sets this via the `suites:` input it passes to
the shared reusable workflow (`.github/workflows/e2e-tests.yml` in this repo).
The input is a list of domain paths; leaving it empty runs every domain. For the
runs the CDP Portal triggers instead, see [Test scope: CDP](test-scope-cdp.md).

## On every PR

Every repo below that calls the shared workflow also runs the k6 smoke run from
`trade-imports-performance-tests`, in a job of its own beside the e2e shards. A
breached threshold fails the repo's e2e check. The smoke run is not scoped by
domain, so it is not in the tables.

### Specific domains

These set `suites:` explicitly, so adding a new domain means editing each
list that should include it. A repo runs a domain when a change in it can break
that domain's specs: because it feeds the domain's data, is used by its pages,
or its specs drive it.

`✓` means the domain runs on the repo's PRs today. `TODO` means built, but not
yet run on the repo's PRs: add it now. `PLANNED` means not built yet: add it to
the repo's PRs once it is. Neither `TODO` nor `PLANNED` is in the repo's
workflow yet, so neither runs today. `✓ (PLANNED)` is the exception: it already
runs, ahead of a link that isn't built yet.

| Repo | animals | animals-admin | ins | plants | Notes |
|---|:-:|:-:|:-:|:-:|---|
| address-book | ✓ | | ✓ | TODO | Used by all three frontends. Address specs exist for animals, ins and plants; plants' sit inside its journey specs, not an `address-book/` folder. Plants is a TODO: add it so those specs run on address-book PRs. |
| animals-admin | ✓ | ✓ | | | Acts on animals notifications, and its specs create them through the animals frontend, so both domains run. |
| animals-backend | ✓ | ✓ | ✓ | | Owns the animals notifications. The frontend, admin and the `ins` aggregate (fed through SNS) all depend on it, so all three run. Not `plants`: separate backend. |
| animals-frontend | ✓ | ✓ | | | Admin's specs create their notifications through this frontend, so admin runs. Not `ins`: its aggregate spec drives the same journey that `animals` already covers, and what it checks (the aggregate document) is fed by the backend. |
| ins-backend | | | ✓ | | Builds the read model behind the dashboard from journey events. Aggregate specs live in `ins` and drive the journeys that publish events, so `ins` covers them. Animals does today; plants will once its outbox is built. |
| ins-frontend | TODO | | ✓ | PLANNED | Dashboard and address-book UI. The animals journey hands off to its add-address page, so animals is a TODO. Plants is PLANNED: it only links to the address book today, and its handoff isn't built yet. |
| plants-backend | | | ✓ (PLANNED) | ✓ | Owns the plants notifications. `ins` already runs, but plants-backend publishes no events yet, so nothing in `ins` exercises it. It becomes useful once the planned outbox feeds the INS aggregate. |
| plants-frontend | | | | ✓ | Its own journey only. |

### Every domain

These pass no `suites:` input, so they run every domain, including any domain
added later.

Each could later be narrowed to only the specs that matter to it, by selecting
on a tag instead of a domain (for example, only the auth specs for
defra-id-stub). We aren't doing that now, because test run time isn't a
concern.

| Repo | animals | animals-admin | ins | plants | Notes |
|---|:-:|:-:|:-:|:-:|---|
| dynamics-gateway | ✓ | ✓ | ✓ | ✓ | Shared event router to Azure Service Bus. Only animals publishes events today, but any journey may use it, so every domain runs. |
| defra-id-stub | ✓ | ✓ | ✓ | ✓ | Sign-in for all four UIs, so every domain's auth depends on it. |
| reference-data | ✓ | ✓ | ✓ | ✓ | Countries and ports of entry for the animals, plants and ins frontends, so every domain runs. |
| stub | ✓ | ✓ | ✓ | ✓ | Fake trade-platform token and MDM data that other services depend on, so any domain can be affected. |
| ins-tests | ✓ | ✓ | ✓ | ✓ | Holds the tests, so a change to any domain's tests runs against every domain. |

## Scheduled runs

`trade-imports-ins-tests` also runs the active security scan on a schedule, not
tied to any PR. It uses the bare `security:active` profile, so it covers every
domain. It runs only the `@active` specs, which are the ones under each
domain's `security/` directory; the PR runs exclude them. CDP cannot run this
profile, which is why it lives here and not in
[Test scope: CDP](test-scope-cdp.md).

| Profile | Environment | Domains | Schedule |
|---|---|---|---|
| `security:active` | docker-compose stack, `main` images | all | 01:00 UTC, Monday to Friday |

Times are in the zone the schedule is set in: UTC here, Europe/London on CDP.
In summer, 01:00 UTC is 02:00 in London.

## Repos that run no ins-tests domain on a PR

- **performance-tests** — no ins-tests domains. Its own PRs run lint, format and unit tests, and the k6 smoke run (`smoke.yml`) against the workspace stack.
- **schemas** — a library of shared schema definitions, not a service; no e2e workflow.
- **plants-prototype** — deployed, but outside the Docker stack, with no e2e workflow.

## Keeping this up to date

Nothing keeps this doc in sync with the workflows. Update it when:

- a repo's `suites:` value changes,
- a new repo gets its own e2e run,
- `scheduled-security-scan.yml`'s schedule changes.

The runs the CDP Portal triggers are configured separately, in the portal, and
recorded in [Test scope: CDP](test-scope-cdp.md). Nothing keeps the two docs in
sync with each other automatically.
