# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-713
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-backend, trade-imports-plants-frontend
**PR:** #461 | **Commit:** a535ca5

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Records adapter sends `Trade-Imports-Organisation-Id` from `currentOrganisationId()` (`records/real/http/headers.js`), throws outside test when none | plants-frontend ✅ (same code); animals-backend requires it ✅ | ✅ Present | CONSISTENT |
| `withOrganisationId(organisationIdOf(request), …)` around route handlers (`set-context.js` `contextualMethod`) and the `onPreHandler` entry guard | plants-frontend ✅ | ✅ Present | CONSISTENT |
| `getFulfilment` treats 403 as "not found" (returns `undefined`) | plants-frontend ✅ | ✅ Present | CONSISTENT |
| `auth/controller.js` stores `currentRelationshipId: profile.organisationId` on the session | plants-frontend ✅ | ✅ Present | CONSISTENT |
| `organisationIdOf` falls back to `credentials.currentRelationshipId` | plants-frontend ✅ (inline) | ✅ via new `sessionOrganisationId(credentials)` | INCONSISTENT shape (see Naming and Reuse) |
| `buildActor` organisation rule | plants-frontend: inline `credentials.organisationId ?? credentials.currentRelationshipId` | ✅ `sessionOrganisationId(credentials)` | INCONSISTENT shape — same rule, written twice in plants |
| Test helper to bind an organisation | plants-frontend: `bindOrganisationId` only | `enterOrganisationIdForTests` + `@deprecated` alias `bindOrganisationId`; every caller in this PR uses the deprecated alias | INCONSISTENT |
| `journeyRequest` in `engine/test-support.js` binds the organisation | plants-frontend ❌ unchanged (relies on the `NODE_ENV === 'test'` fallback in `headers.js`) | ✅ Present | INCONSISTENT (twin drift) |
| `actor-helpers.test.js` covers `organisationId` winning over `currentRelationshipId` | plants-frontend ❌ no new test (its `actor-helpers.js` changed the same way) | ✅ Present | CONSISTENT here; gap in plants |
| Lighthouse `seed-notification.js` refuses to create when the dashboard did not render (line 268) | plants-frontend ❌ `scripts/lighthouse/seed-notification.js:59-61` unchanged | ✅ Present | INCONSISTENT (twin drift; plants seeding hits the same now-scoped dashboard) |
| `HTTP_STATUS_FORBIDDEN` in `lib/http-status.js` | plants-frontend `HTTP_FORBIDDEN` in `records/real/config.js` | ✅ | CONSISTENT — each follows its repo's existing home and naming for `NOT_FOUND` |

## Missing Changes

*None against the backend.* Every call the backend now requires the header on is sent with it.

## Unique Changes

- **Document uploads now send the organisation header** (`services/document-uploads/real.js`, all seven calls). Plants has no document uploads — expected. Two side effects worth a look:
  - Four of those calls (`claim`, `scanStatus`, `remove`, `streamFile`) go to `/document-uploads/{upload-id}…`, which the animals-backend neither requires the header on nor scopes. See the animals-backend check.
  - `headers()` always adds `Content-Type: application/json`, so GET and DELETE calls that used `traceHeaders()` with no content type now send one. Harmless to Spring, but it is a behaviour change hidden in a rename.
- `scripts/lighthouse/seed-notification.js` guard — see table; mirror it in plants.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/server/app/services/persistence/records/real/http/headers.js:4` and `src/server/app/services/address-book/client.js:9` | `ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'` declared twice in one repo (also a third time in `scripts/lighthouse/seed-address-book.js:8`, a standalone script). | One constant for the header across `src/`. | Declare it once next to `traceHeaders` in `services/http/trace-headers.js` (or an `organisation-headers.js` beside it) and import it in both clients. |
| `src/server/app/services/document-uploads/real.js:4` | The document-uploads service imports `headers` from the records adapter's private `persistence/records/real/http/headers.js`. The organisation header is now a cross-service concern living inside one adapter. | A shared helper for "trace + organisation headers" lives where both services can own it. | Move the organisation-aware builder to `services/http/` and have both `records/real/http/headers.js` and `document-uploads/real.js` import it. |
| `src/server/common/helpers/organisation-id.js:31-36` | `enterOrganisationIdForTests` and `bindOrganisationId` are two names for one function; the "new" name has no callers and the `@deprecated` one is used by every test in this PR (`test-support.js:164`, `journey.test.js`, `real.requests.test.js`, `headers.test.js`, `organisation-id.test.js`). Plants has only `bindOrganisationId`. | One name, the same in both twins. | Keep `bindOrganisationId` (matches plants and every caller) and delete `enterOrganisationIdForTests`, or rename all callers in both twins. |
| `src/server/common/helpers/organisation-id.js:6` `sessionOrganisationId` vs plants `actor-helpers.js:12-13` | Same rule (`organisationId ?? currentRelationshipId`) is a named helper here and inlined twice in plants. | The twins share one shape. | Port `sessionOrganisationId` to plants-frontend. |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/server/app/docs/persistence.md:100-102` | "The backend stores parties as they are and hands them back the same way, so the records adapter never sends the reader's organisation to it. The organisation is the address book's business, not the backend's." | `headers()` sends `Trade-Imports-Organisation-Id` on every records call; the backend stores it as the owner and scopes every read and write by it; a 403 on fulfilments is read as "not found". | Doc states the new behaviour. | Replace with: "Every records call carries the signed-in organisation in `Trade-Imports-Organisation-Id`. The backend stores it as the owner on create and answers another organisation's notification as not found (403 on the fulfilments read, which the adapter treats as not found)." |
| `src/server/common/helpers/organisation-id.js:15-19` (JSDoc of `organisationIdOf`) | "The one place this value is read. It is forwarded to … the address book directly, and the backend, which passes it on to the address book in turn…" | It is also read by `sessionOrganisationId` from `buildActor` (not via a request), and the backend now owns and enforces it on notifications rather than only passing it on. | JSDoc states the new behaviour. | "The one place … for a request" and "…the backend, which scopes notifications on it and passes it on to the address book." |
| `src/server/app/docs/services.md` (address-book bullet, lines 68-72) | Describes the "organisation header … always from the signed-in session; a read without one is refused" only for the address book. | The notifications backend and document-upload calls follow the same rule now. | Not untrue, but incomplete — optional: add a matching bullet for the records adapter. | — |
| `openspec/specs/live-animals/` (workspace) | No requirement for organisation-scoped notifications. | Behaviour exists. | Requirement + coverage links (spec-catchup). | — |

*Searched (`src/server/app/docs/*.md`, `src/server/app/sets/live-animals/docs/*.md`, `README.md`, `AGENTS.md`, JSDoc, test titles, `dev-tools/`): `organisation`, `Trade-Imports-Organisation-Id`, `without the organisation`, `never sends`, `traceHeaders`, `currentRelationshipId`. The old test titles ("…without the organisation", "Should not send the reader's organisation…") were renamed in the diff.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 6 (stale `persistence.md` paragraph; stale `organisationIdOf` JSDoc; header constant declared twice; document uploads reaching into the records adapter for headers; two names for the test binder; twin drift with plants on `sessionOrganisationId`, `test-support`, lighthouse guard)
**Summary:** Behaviour matches plants-frontend, but a doc paragraph now says the opposite of what the code does and the shared helpers have diverged from their twin.
