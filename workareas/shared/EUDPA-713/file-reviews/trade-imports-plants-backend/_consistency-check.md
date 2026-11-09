# Consistency Check: trade-imports-plants-backend

**Ticket:** EUDPA-713
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-backend, trade-imports-plants-frontend
**PR:** #16 | **Commit:** 0169caa

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `TraderOrganisationHeaderFilter` (400 when `Trade-Imports-Organisation-Id` is missing; MDC `organisationId`) | animals-backend ✅; plants-frontend sends it ✅; ins-tests / perf-tests send it ✅ | ✅ Present | CONSISTENT |
| `organisationId` on `NotificationAggregate`, set once in `createNotification` | animals-backend ✅ | ✅ Present | CONSISTENT |
| Scoped reads via `requireTraderNotification` → `findByReferenceNumberAndOrganisationId` | animals-backend ✅ | ✅ Present (renamed from `requireByReferenceNumber`) | CONSISTENT |
| Fulfilments 403 for another organisation, 404 when absent | animals-backend ✅; plants-frontend maps 403 to "not found" ✅ | ✅ Present | CONSISTENT |
| `OrganisationIdCleanup` on `ApplicationReadyEvent` | animals-backend ✅ | ✅ Present | CONSISTENT |
| Compound index on `organisationId` + `status` + sort field | animals-backend ✅ (`created` and `notification.transport.arrivalDate`) | ✅ `organisationId_status_created` only | CONSISTENT — `NotificationSort` here recognises only `createdAt`, so no arrival-date index is needed |
| Unscoped repository methods removed once every caller is scoped | animals-backend ✅ removed `findFulfilmentsViewByReferenceNumber`, `findViewByReferenceNumberAndStatusIn`, `findAllViewByStatusIn` | ❌ All three kept beside their scoped versions, and nothing in `src/main` or `src/test` calls them | INCONSISTENT |
| Copy owner asserted in tests | animals-backend ✅ `assertCopiedNotificationDraft` checks `copy.getOrganisationId()` | ❌ `NotificationServiceTest.copyNotification_shouldCreateAFreshDraftCarryingTheFulfilments` and `NotificationIT` never assert the copy's `organisationId` | INCONSISTENT — AC "A copy of a notification belongs to the caller's organisation" is unproven here |
| Unit test for the 403 branch of `findFulfilmentsView` | animals-backend ✅ `findFulfilmentsView_shouldThrowForbidden_whenReferenceBelongsToAnotherOrganisation` | ❌ covered only by `NotificationIT.organisationScope_shouldHideNotificationFromOtherOrganisation` | INCONSISTENT (minor) |
| Test for `OrganisationIdCleanup` | animals-backend ❌ | ❌ Not found | CONSISTENT gap (AC "Notifications stored without an organisation ID are deleted" untested in both) |
| Cross-organisation `cancel-amend` returns 404 | animals-backend ❌ | ❌ not in `organisationScope_shouldHideNotificationFromOtherOrganisation` | CONSISTENT gap (AC lists "cancelling an amendment") |
| `organisationId` on mutation log lines | animals-backend ⚠️ only on POST | ✅ every trader route | Drift is on the animals side |
| `ForbiddenException` + handler | animals-backend ✅ | ✅ Present (`ProblemDetail` return and literal `"traceId"` match this file's other handlers) | CONSISTENT |

## Missing Changes

- **Remove the now-unused unscoped finders** — `NotificationRepository.java:24` `findFulfilmentsViewByReferenceNumber`, `:29` `findViewByReferenceNumberAndStatusIn`, `:35` `findAllViewByStatusIn`. animals-backend deleted them in the same change. Leaving them invites a later caller to read across organisations; the Tech Notes say "Filter every repository read by organisation … rather than checking after the read". `findByReferenceNumber` stays: `PersistedTimestampZoneIT` and `NotificationIT` use it for unscoped fixture reads, as animals-backend does.
- **Assert the copy's owner** — add `assertThat(result.getOrganisationId()).isEqualTo(ORG_ID)` to `copyNotification_shouldCreateAFreshDraftCarryingTheFulfilments`, as animals-backend does in `assertCopiedNotificationDraft`.

## Unique Changes

- **Plants carries the change at all.** The ticket is "live animals"; its Tech Notes say "Plants will have delegation, so its equivalent ticket must handle it" and to ignore `onBehalfOfOrganisationId` for animals only. This PR scopes plants under EUDPA-713 with the animals rule (owner is the caller's organisation, no delegation). Intentional per the cross-repo PR set, but the plants delegation case is not handled; confirm the plants ticket still owns it, or record it here.
- No `outbox-events`/`replay` filter exclusions — plants has neither route. Expected.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `NotificationController.java:46` | One header, two names: `HEADER_ORGANISATION_ID = TraderOrganisationHeaderFilter.ORGANISATION_ID_HEADER`. Same alias in animals-backend. | One constant, one name. | Use `TraderOrganisationHeaderFilter.ORGANISATION_ID_HEADER` everywhere (or move it beside `HEADER_TRACE_ID`), in both backends together. |
| `TraderOrganisationHeaderFilter.java:27,60` | `REQUEST_ORGANISATION_ID` attribute is set and never read; controllers bind the header again. Same in animals-backend. | One carrier for the value. | Drop the attribute in both backends. |
| `NotificationRepository.java:24,29,35` | Scoped and unscoped finder for the same view side by side (`findAllViewByStatusIn` / `findAllViewByStatusInAndOrganisationId`). | One finder per read. | Delete the unscoped three (see Missing Changes). |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `docs/repos/trade-imports-plants-backend.md:22` (workspace) | "Authentication: no auth or JWT dependency … Unclear from code whether access control relies on the platform network." | Trader routes now require `Trade-Imports-Organisation-Id` (400 without it) and every notification read and write is scoped to it; the service trusts the header as the address book does. | Doc states the new behaviour. | Add a line: "Tenant scoping: trusts `Trade-Imports-Organisation-Id`; trader routes 400 without it; `GET /reference-numbers` and bulk `DELETE` are unscoped." |
| `docs/repos/trade-imports-plants-backend.md:28` (workspace) | Inbound row lists the routes with no header. | Every listed route except `GET /reference-numbers` and `DELETE` needs the organisation header. | Row names the header. | Append "header `Trade-Imports-Organisation-Id`" as the address-book rows do. |
| `openspec/specs/plants/` (workspace) | No requirement states organisation scoping of notifications. | Behaviour exists. | Requirement + coverage links. | Add under `plants/notification-dashboard` and `plants/notification-lifecycle`. |

*Searched (this repo's `README.md`, `docs/`, Javadoc, test titles; workspace `docs/repos/`, `openspec/specs/plants/`): `requireByReferenceNumber`, `findFulfilmentsViewByReferenceNumber`, `findAllViewByStatusIn`, `findViewByReferenceNumberAndStatusIn`, `organisation`, `Trade-Imports-Organisation-Id`, `Authentication`, `access control`. The repo has no README/docs text that the change contradicts; the rename `requireByReferenceNumber` → `requireTraderNotification` left no stale reference.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 5 (three unscoped finders kept where animals removed them; copy owner unasserted; no unit test for the 403 branch; aliased header constant; dead request attribute) plus 2 shared test gaps and 2 stale workspace doc lines
**Summary:** Matches the animals twin in behaviour, but keeps the unscoped repository finders animals deleted and does not prove a copy's owner.
