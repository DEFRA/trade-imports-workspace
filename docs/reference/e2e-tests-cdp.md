# E2E tests: CDP

**Runs after a deployment and on a schedule, from the CDP Portal. Configured in the portal, not in any repo.**

Which test suites, and which domain(s) of each, the CDP Portal runs, and the
[scheduled runs](#scheduled-runs). Each run is one `PROFILE` of the
`trade-imports-ins-tests` test suite: `default` (the e2e suite), `a11y`,
`dynamics` or `security`, run for every domain, or `<domain>:<suite>` (for
example `animals:e2e`) for one. The profiles are described in the
[`trade-imports-ins-tests` README](../../repos/trade-imports-ins-tests/README.md#running-tests-via-cdp-portal).
For the runs that happen on every PR instead, see [E2E tests: GitHub Actions](e2e-tests-gh-actions.md).

## After a deployment

Every run below happens in both `dev` and `test`, unless a section says
otherwise. No service runs `a11y` or `security` on deployment; those run on a
schedule.

### Specific domains

Each tick is one `<domain>:e2e` run, for example `ins:e2e` and `animals:e2e`
for address-book. Adding a domain means adding its run in the portal for each
service that should have it.

`✓` means the domain runs after deployment today.

A service's deployment runs its whole family. Every tick covers fewer specs here
than in [GitHub Actions](e2e-tests-gh-actions.md#pull-requests), because
specs that need the compose stack don't run on CDP (see
[What does not run on CDP](#what-does-not-run-on-cdp)).

#### INS services

These run ins, animals and plants.

| Repo | ins | animals | animals-admin | plants | Notes |
|---|:-:|:-:|:-:|:-:|---|
| address-book | ✓ | ✓ | | ✓ | plants: its frontend uses it, and its specs aren't compose-only<br>**Skips:** animals-admin: no link |
| ins-backend | ✓ | ✓ | | ✓ | animals, plants: journeys publish the events it stores<br>**Skips:** animals-admin: none read from it (see Details) |
| ins-frontend | ✓ | ✓ | | ✓ | animals, plants: journey handoff<br>**Skips:** animals-admin: no link |

#### Animals services

These run ins, animals and animals-admin.

| Repo | ins | animals | animals-admin | plants | Notes |
|---|:-:|:-:|:-:|:-:|---|
| animals-admin | ✓ | ✓ | ✓ | | ins: replay only (see Details)<br>**Skips:** plants: separate journey |
| animals-backend | ✓ | ✓ | ✓ | | ins: the aggregate is fed through SNS<br>**Skips:** plants: separate journey |
| animals-frontend | ✓ | ✓ | ✓ | | ins: animals services<br>**Skips:** plants: separate journey |

#### Plants services

These run ins and plants.

| Repo | ins | animals | animals-admin | plants | Notes |
|---|:-:|:-:|:-:|:-:|---|
| plants-backend | ✓ | | | ✓ | ins: aggregate (see Details)<br>**Skips:** animals, animals-admin: separate journey |
| plants-frontend | ✓ | | | ✓ | ins: plants services<br>**Skips:** animals, animals-admin: separate journey |

**Details**

- **animals-admin:** its only route into INS is replaying a notification's
  events. ins-backend ignores events it already has, so `ins` is a family check,
  not a close coupling.
- **ins-backend:** admin only reaches it by replaying events that it already
  handles.
- **plants-backend:** its outbox feeds the ins aggregate.

### Every domain

These run the bare `default` (e2e) profile, so they cover every domain, including any
domain added later.

| Repo | ins | animals | animals-admin | plants | Notes |
|---|:-:|:-:|:-:|:-:|---|
| dynamics-gateway | ✓ | ✓ | ✓ | ✓ | Shared event router to Azure Service Bus. Only animals publishes events today, but any journey may use it. |
| defra-id-stub | ✓ | ✓ | ✓ | ✓ | Sign-in for all four UIs. |
| reference-data | ✓ | ✓ | ✓ | ✓ | Countries and ports of entry for the animals, plants and ins frontends. |
| stub | ✓ | ✓ | ✓ | ✓ | Fake trade-platform token and MDM data that other services depend on. |

These match the [GitHub Actions table](e2e-tests-gh-actions.md#shared-stack-repos),
less the compose-only specs.

### Dynamics checks, in `test` only

These run `<domain>:dynamics`, in addition to the e2e runs above.

| Repo | animals |
|---|:-:|
| animals-backend | ✓ |
| animals-frontend | ✓ |

A repo that appears in none of these tables has no recorded deployment run.

### What does not run on CDP

Specs tagged `@compose`, and the `@mongodb` specs that skip themselves outside
the compose stack, do not run on CDP. That includes most of the `animals-admin`
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

## Before a production release

Before a production release, check that the latest `default` run on `test`
passed against the release candidate. It runs every domain, so it verifies the
release candidate across all the services. If that run predates the release
candidate's deployment to `test`, start one by hand.

This is done by hand, not as part of every deployment, so the broad check
happens at the moment that matters without every `dev` and `test` deployment
running several domains and failing more often. The deployment runs above stay
limited to each service's own related domains.

`default` runs every domain in one run, so it covers any service's related
domains. The compose-only specs still don't run on CDP (see
[What does not run on CDP](#what-does-not-run-on-cdp)).

A follow-up idea is to run only the release candidate's own family of services
(see [Family runs](#family-runs) below).

### Family runs

`TO DISCUSS`: a proposal, not agreed. A family run would keep an unrelated domain
from blocking the release. Today a `PROFILE` takes one domain or all of them, so
these profiles don't exist yet and would need adding to
`trade-imports-ins-tests`.

| Family | PROFILE (all three suites) | One suite only | Domains |
|---|---|---|---|
| Animals | `animals-family` | `animals-family:e2e`, `:a11y`, `:security`, `:dynamics` | ins, animals, animals-admin |
| Plants | `plants-family` | `plants-family:e2e`, `:a11y`, `:security`, `:dynamics` | ins, plants. `plants-admin` too, once that domain exists. |
| INS | `ins-family` | `ins-family:e2e`, `:a11y`, `:security` | ins, animals, plants |

`animals-family` runs all three suites for the family: e2e, a11y and security. To
run one suite only, add it after a colon, for example `animals-family:e2e`.
`plants-family` and `ins-family` work the same way.

## Keeping this up to date

This doc is read from the CDP Portal by hand, not from a file in a repo, so
nothing keeps it in sync. Update it when:

- a service's runs change (**CDP Portal > Services > *service* > Automations >
  Test Runs > Automatic Test Runs**),
- the `trade-imports-ins-tests` test suite's schedule changes.

The runs that happen on every PR are configured separately and recorded in
[E2E tests: GitHub Actions](e2e-tests-gh-actions.md). Nothing keeps the two
docs in sync with each other automatically.
