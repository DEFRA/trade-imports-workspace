# Consistency Check: trade-imports-animals-backend

**Ticket:** EUDPA-713
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-backend, trade-imports-plants-frontend
**PR:** #122 | **Commit:** 9cf4d45

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `Trade-Imports-Organisation-Id` header required on trader routes (`TraderOrganisationHeaderFilter`, 400 when missing) | plants-backend ✅; animals-frontend sends it ✅; ins-tests / perf-tests send it ✅ | ✅ Present | CONSISTENT |
| `organisationId` on `NotificationAggregate`, set once in `createNotification` | plants-backend ✅ | ✅ Present | CONSISTENT |
| Scoped reads `findByReferenceNumberAndOrganisationId` via `requireTraderNotification` | plants-backend ✅ | ✅ Present | CONSISTENT |
| Fulfilments read returns 403 (`ForbiddenException`) for another organisation, 404 when absent | plants-backend ✅; both frontends map 403 to "not found" ✅; ins-tests asserts 403 ✅ | ✅ Present | CONSISTENT |
| `OrganisationIdCleanup` deletes rows with no owner on `ApplicationReadyEvent` | plants-backend ✅ | ✅ Present | CONSISTENT |
| Compound index `organisationId_status_created` | plants-backend ✅ | ✅ Present (plus `organisationId_status_arrivalDate`) | CONSISTENT (plants sorts only on `created`, see `NotificationSort` in plants — expected) |
| Unscoped repository methods removed (`findFulfilmentsViewByReferenceNumber`, `findViewByReferenceNumberAndStatusIn`, `findAllViewByStatusIn`) | plants-backend ❌ keeps all three, now unused | ✅ Removed | CONSISTENT here; INCONSISTENT in plants |
| `organisationId` written on every mutation log line | plants-backend ✅ logs it on POST, PUT, copy, submit, amend, cancel-amend, soft-delete, fulfilments | ⚠️ only on `POST /notifications` (`NotificationController.post`); replace/copy/submit/amend/cancel-amend/soft-delete do not | INCONSISTENT (minor — MDC carries `organisationId` from the filter, so the field is in ECS output either way) |
| Copy owner asserted in tests (`assertCopiedNotificationDraft` checks `copy.getOrganisationId()`) | plants-backend ❌ not asserted | ✅ Present | CONSISTENT here |
| Unit test for the 403 branch (`findFulfilmentsView_shouldThrowForbidden_whenReferenceBelongsToAnotherOrganisation`) | plants-backend ❌ (IT only) | ✅ Present | CONSISTENT here |
| Test for `OrganisationIdCleanup` | plants-backend ❌ | ❌ Not found | CONSISTENT (both missing — AC "Notifications stored without an organisation ID are deleted" has no test in either backend) |
| Cross-organisation `cancel-amend` returns 404 | plants-backend ❌ not tested | ❌ not tested in `NotificationIT.organisationScope_shouldHideNotificationFromOtherOrganisation` | CONSISTENT gap (AC lists "cancelling an amendment") |
| `ForbiddenException` handler in `GlobalExceptionHandler` | plants-backend ✅ (returns `ProblemDetail`, literal `"traceId"` — follows that repo's existing handlers) | ✅ (returns `ResponseEntity`, `PROPERTY_TRACE_ID` — follows this repo's handlers) | CONSISTENT (each follows its own file's idiom) |

## Missing Changes

*None identified against the plants twin.* Every scoping change in plants-backend has its counterpart here.

## Unique Changes

- **Filter exclusions for `/notifications/{ref}/outbox-events` and `/notifications/{ref}/replay`** (`TraderOrganisationHeaderFilter.shouldNotFilter`). Intentional: these are admin routes the ticket names as out of scope, and plants-backend has no outbox. Checked on `trade-imports-animals-admin` `origin/main`: its `notification-client.js` calls only `reference-numbers`, `outbox-events`, `replay` and bulk `DELETE /notifications`, all excluded.
- **Document-upload routes scoped** (`DocumentController.register`, `session`, `list` call `notificationService.requireTraderAccess`). Plants has no document uploads, so expected. **Suspicious gap:** the routes keyed on upload id — `POST /document-uploads/{upload-id}/claim`, `GET /document-uploads/{upload-id}`, `DELETE /document-uploads/{upload-id}`, `GET /document-uploads/{upload-id}/file` — are not under `/notifications`, so the filter skips them and they do no organisation check. animals-frontend now sends the organisation header on all four (`services/document-uploads/real.js`), which suggests the author expected them to be scoped. An organisation that learns an upload id can still claim, read, stream or delete another organisation's document. The ticket names "party details" and consignments, not documents, so confirm scope with the author; if in scope, resolve the upload's notification ref and call `requireTraderAccess`.
- `existsByReferenceNumber` is used only by the 403 branch of `findFulfilmentsView` — same in plants. Expected.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `NotificationController.java:44` | One header, two names: `public static final String HEADER_ORGANISATION_ID = TraderOrganisationHeaderFilter.ORGANISATION_ID_HEADER;`. Callers split between them — `DocumentController` and `NotificationController` use `HEADER_ORGANISATION_ID`; `EcsLoggingIT` and `NotificationIT` use `TraderOrganisationHeaderFilter.ORGANISATION_ID_HEADER`. Plants-backend has the same alias. | One constant, one name, used everywhere. | Delete `HEADER_ORGANISATION_ID` and reference `TraderOrganisationHeaderFilter.ORGANISATION_ID_HEADER`, or move the header beside `HEADER_TRACE_ID`/`HEADER_USER_ID` and have the filter read it from there. Same change in plants-backend. |
| `TraderOrganisationHeaderFilter.java:27,69` | `REQUEST_ORGANISATION_ID` request attribute is set but never read anywhere in `src/main` (grep: only the declaration and the `setAttribute`). Controllers take the value again via `@RequestHeader`. Two carriers for one value, one of them dead. Same in plants-backend. | One carrier. | Drop the attribute (controllers already bind the header), or have controllers read the attribute and drop the `@RequestHeader` parameters. Same change in plants-backend. |
| `NotificationService.java` `requireTraderAccess` / `requireTraderNotification` | Public `requireTraderAccess` is a void wrapper around private `requireTraderNotification`. Plants has only `requireTraderNotification`. Not a twin mismatch (plants has no document controller) — noted only so the name pair stays deliberate. | — | — |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `trade-imports-animals-frontend/src/server/app/docs/persistence.md:100-102` (twin repo, about this service) | "The backend stores parties as they are and hands them back the same way, so the records adapter never sends the reader's organisation to it. The organisation is the address book's business, not the backend's." | The records adapter sends `Trade-Imports-Organisation-Id` on every call and this backend scopes every trader read and write by it. | Doc states the new behaviour. | Recorded as a finding in the animals-frontend consistency check. |
| `trade-imports-animals-frontend/src/server/common/helpers/organisation-id.js:15-17` (JSDoc) | "…the backend, which passes it on to the address book in turn — and those services treat it as the authenticated organisation…" | This backend now also stores it as the owner and filters every notification read by it. | JSDoc states the new behaviour. | Recorded in the animals-frontend check. |
| `openspec/specs/live-animals/` (workspace) | No requirement states that a trader sees and changes only their own organisation's notifications. | The behaviour now exists. | A Behaviour Spec requirement (dashboard list scoped; other organisation's notification is "not found") with coverage links to `NotificationIT.organisationScope_*` and the ins-tests spec. | Add under `live-animals/notification-dashboard` and `notification-lifecycle`. |

*Searched (this repo's `README.md`, `docs/*.md`, Javadoc, test titles): `findByReferenceNumber(`, `findFulfilmentsViewByReferenceNumber`, `findAllViewByStatusIn`, `findViewByReferenceNumberAndStatusIn`, `filters by status`, `organisation`, `Trade-Imports-Organisation-Id`, `GET /notifications`, `User-Id`. No stale statement inside this repo; `docs/design-notes.md` has no endpoint or access-control text.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 4 (aliased header constant; dead request attribute; upload-id document routes unscoped while the frontend sends the header; per-operation `organisationId` logging drifts from plants) plus 2 test gaps shared with plants (no cleanup test, no cross-org `cancel-amend` test)
**Summary:** Scoping matches the plants twin point for point; the findings are a duplicated header name, an unused request attribute, and document routes keyed on upload id that stay unscoped.
