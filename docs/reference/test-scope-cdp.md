# Test scope: CDP

**Runs after a deployment and on a schedule, from the CDP Portal. Configured in the portal, not in any repo.**

Which test suites, and which domain(s) of each, the CDP Portal runs, and the
[scheduled runs](#scheduled-runs). Each run is one `PROFILE` of the
`trade-imports-ins-tests` test suite: `default` (the e2e suite), `a11y`,
`dynamics` or `security`, run for every domain, or `<domain>:<suite>` (for
example `animals:e2e`) for one. The profiles are described in the
[`trade-imports-ins-tests` README](../../repos/trade-imports-ins-tests/README.md#running-tests-via-cdp-portal).
For the runs that happen on every PR instead, see [Test scope: GitHub Actions](test-scope-gh-actions.md).

## After a deployment

Every run below happens in both `dev` and `test`, unless a section says
otherwise. No service runs `a11y` or `security` on deployment; those run on a
schedule.

### Specific domains

Each tick is one `<domain>:e2e` run, for example `ins:e2e` and `animals:e2e`
for address-book. Adding a domain means adding its run in the portal for each
service that should have it.

`✓` means the domain runs after deployment today. `TODO` means built, but not
yet run after deployment: add it now. `PLANNED` means not built yet: add it once
it is. Neither `TODO` nor `PLANNED` is set up in the portal yet, so neither runs
today. `✓ (PLANNED)` is the exception: it already runs, ahead of a link that
isn't built yet.

A row with no note has the same ticks as the
[GitHub Actions table](test-scope-gh-actions.md#specific-domains), where the
reasons are given. A note marks where CDP differs. Every tick covers fewer
specs here than in GitHub Actions, because specs that need the compose stack
don't run on CDP (see [What does not run on CDP](#what-does-not-run-on-cdp)).

| Repo | animals | animals-admin | ins | plants | Notes |
|---|:-:|:-:|:-:|:-:|---|
| address-book | ✓ | | ✓ | TODO | |
| animals-admin | ✓ | ✓ | | | |
| animals-backend | ✓ | ✓ | ✓ | | |
| animals-frontend | ✓ | ✓ | | | |
| ins-backend | | | ✓ | | |
| ins-frontend | | | ✓ | | Differs from GitHub Actions: the specs that cross ins-frontend and the animals frontend are compose-only, and a plants handoff spec probably will be too, so there's no animals or plants marker here. |
| plants-backend | | | ✓ (PLANNED) | ✓ | |
| plants-frontend | | | | ✓ | |

### Every domain

These run the bare `default` (e2e) profile, so they cover every domain, including any
domain added later.

| Repo | animals | animals-admin | ins | plants |
|---|:-:|:-:|:-:|:-:|
| dynamics-gateway | ✓ | ✓ | ✓ | ✓ |
| defra-id-stub | ✓ | ✓ | ✓ | ✓ |
| reference-data | ✓ | ✓ | ✓ | ✓ |
| stub | ✓ | ✓ | ✓ | ✓ |

These match the [GitHub Actions table](test-scope-gh-actions.md#every-domain),
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
[Test scope: GitHub Actions](test-scope-gh-actions.md#scheduled-runs)).

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
| Animals | `animals-family` | `animals-family:e2e`, `:a11y`, `:security`, `:dynamics` | animals, animals-admin, ins |
| Plants | `plants-family` | `plants-family:e2e`, `:a11y`, `:security`, `:dynamics` | plants, ins. `plants-admin` too, once that domain exists. |
| INS | `ins-family` | `default`, `a11y`, `security` | every domain |

`animals-family` runs all three suites for the family: e2e, a11y and security. To
run one suite only, add it after a colon, for example `animals-family:e2e`.
`plants-family` works the same way. The INS family covers every domain, so its
one-suite runs are the existing bare profiles.

## Keeping this up to date

This doc is read from the CDP Portal by hand, not from a file in a repo, so
nothing keeps it in sync. Update it when:

- a service's runs change (**CDP Portal > Services > *service* > Automations >
  Test Runs > Automatic Test Runs**),
- the `trade-imports-ins-tests` test suite's schedule changes.

The runs that happen on every PR are configured separately and recorded in
[Test scope: GitHub Actions](test-scope-gh-actions.md). Nothing keeps the two
docs in sync with each other automatically.
