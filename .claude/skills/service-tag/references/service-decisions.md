# Service decisions

What the skill cannot work out from the stack's wiring, the specs or the scope file.
The skill proposes edits to this file at the end of a run; otherwise change it here by hand.

## Which domains to search

For a service X, the specs that should carry its tag are in the domains of the services
that **call X directly**. The dispatcher reads those from the stack's compose wiring
(`docker/stack/*.compose.yml`): a service that has `TRADE_IMPORTS_<X>_URL` in its
environment calls X, and its domains come from its own scope entry. Direct callers only —
a caller of a caller is not related.

That wiring cannot show the links below, so they are added by hand. Search these domains
as well:

| Service | Also exercised from | Why |
|---|---|---|
| animals-backend | ins | Its events feed the ins aggregate, over an SNS topic and SQS queue, not a URL. |
| animals-frontend | animals-admin | Admin specs seed notifications through the animals frontend's forms. |
| animals-admin | animals | An animals spec can submit a notification and look it up in the admin app. |

**Pending** — not built yet, so there is nothing to search. Add a row above when it ships:
plants-backend feeding the ins aggregate once its outbox publishes events.

## How a spec reaches a service

The fixtures are defined in `trade-imports-ins-tests/fixtures/ui.ts`. A spec that uses
one is a **candidate**, not a verdict — the evidence rules in `SKILL.md` decide.
Setup-only use (seeding data, signing in) is not related.

| Service | Direct: fixtures and pages | Indirect |
|---|---|---|
| address-book | `addressBookApi`; the address-book pages under `insPages` | |
| ins-frontend | `insPages` | |
| ins-backend | `MongoDbClient` on database `trade-imports-ins-backend` | The INS dashboard (`insPages.dashboard`) shows its aggregate |
| animals-frontend | `animalsPages`, `animalsJourney`, `animalsNotificationActions`, `animalsSeededJourney`, `frontendForms` | |
| animals-admin | `animalsAdminPages`, `animalsAdminNavigation` | |
| animals-backend | `notificationApi`; `MongoDbClient` on database `trade-imports-animals-backend` | Its events feed the ins aggregate: ins specs that submit in the animals journey and then read the aggregate |
| plants-frontend | `plantsPages`, `plantsJourney` | |
| plants-backend | none of its own | Reached through `plantsPages` and `plantsJourney` |

Not a signal for any service: `pages` (shared helpers), `journeyContext`, `externalRequest`.

A service in the scope file with no row here: stop and ask the user for its fixtures.

## Ruled out

Specs that match a service's fixtures but were judged unrelated, so they are not raised
again. Each carries a **Revisit if** condition the skill re-checks on every run against the
spec. A condition that is now true is proposed for removal; it is never applied silently.

| Services | Spec | Reason and revisit |
|---|---|---|
| animals-frontend, ins-frontend, plants-frontend | `ins/e2e/features/cross-service-sessions.spec.ts` | Uses each frontend's pages only to check that a sign-in session survives. **Revisit if:** the spec asserts anything beyond the sessions. |

## Settled

Findings from earlier runs, kept so they are not re-argued.

- **animals-admin and animals:** only `animals/e2e/features/admin-visibility.spec.ts`
  drives the admin app from an animals journey. The admin domain's own specs seed through
  the animals frontend, which is the animals-frontend link, not animals-admin's.
- **animals-backend and ins:** the two ins specs tagged before this skill existed
  (`aggregated-notification`, `notification-dashboard-navigation`) were re-judged and kept.
