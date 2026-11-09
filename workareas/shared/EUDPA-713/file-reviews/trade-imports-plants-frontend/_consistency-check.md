# Consistency Check: trade-imports-plants-frontend

**Ticket:** EUDPA-713
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-backend, trade-imports-plants-frontend
**PR:** #139 | **Commit:** baffe54

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Records adapter sends `Trade-Imports-Organisation-Id` from `currentOrganisationId()`, throws outside test when none | animals-frontend ✅; plants-backend requires it ✅ | ✅ Present | CONSISTENT |
| `withOrganisationId(organisationIdOf(request), …)` in `set-context.js` and the `onPreHandler` guard in `routes-high-risk-plants.js` | animals-frontend ✅ | ✅ Present | CONSISTENT |
| `getFulfilment` treats 403 as "not found" | animals-frontend ✅ | ✅ Present (`HTTP_FORBIDDEN` in `records/real/config.js`, beside the repo's existing `HTTP_NOT_FOUND`) | CONSISTENT |
| `auth/controller.js` stores `currentRelationshipId` on the session | animals-frontend ✅ | ✅ Present | CONSISTENT |
| Named `sessionOrganisationId(credentials)` helper used by `organisationIdOf` and `buildActor` | animals-frontend ✅ | ❌ Rule inlined in `organisation-id.js:23` and again in `actor-helpers.js:12-13` | INCONSISTENT |
| `actor-helpers.test.js` covers `organisationId` winning over `currentRelationshipId` | animals-frontend ✅ | ❌ `actor-helpers.js` changed, no test added | INCONSISTENT |
| `journeyRequest` in `engine/test-support.js` binds the organisation | animals-frontend ✅ | ❌ Unchanged; tests lean on the `NODE_ENV === 'test'` fallback `'5900001'` in `headers.js` | INCONSISTENT |
| Test binder name | animals-frontend: `enterOrganisationIdForTests` + deprecated alias `bindOrganisationId` | `bindOrganisationId` only | INCONSISTENT (fix in animals: see that check) |
| Lighthouse `seed-notification.js` fails fast when the dashboard did not render | animals-frontend ✅ (line 268) | ❌ `scripts/lighthouse/seed-notification.js:59-61` unchanged | INCONSISTENT |
| `organisationIdOf` JSDoc last sentence | animals-frontend rewrote it | ❌ still "none of them may substitute a guess" while `headers.js` substitutes `'5900001'` under test | INCONSISTENT (see Statements Made Untrue) |

## Missing Changes

- `src/server/common/helpers/organisation-id.js` — add `sessionOrganisationId(credentials)` and use it from `organisationIdOf` and `actor-helpers.js`, as animals-frontend does, so the precedence rule lives once.
- `src/server/common/helpers/actor-helpers.test.js` — add the "organisationId wins over currentRelationshipId" case animals-frontend added.
- `src/server/app/engine/test-support.js` `journeyRequest` — bind `authenticatedCredentials.organisationId` as animals-frontend does, so engine tests do not depend on the production code's test-env fallback.
- `scripts/lighthouse/seed-notification.js:59-61` — the dashboard-status guard animals-frontend added: with scoping on, a session with no organisation now fails at the dashboard, and without the guard the error surfaces later as a confusing create failure.

## Unique Changes

- **Plants carries the change under EUDPA-713.** The ticket scopes live animals and says "Plants will have delegation, so its equivalent ticket must handle it." `buildActor` still forwards `onBehalfOfOrganisationId`, but the owner sent to the backend is always the caller's organisation. Intentional for this PR set, but delegation for plants is not handled; confirm the plants ticket still owns it.
- The repo's `records/real/http/headers.js` builds the trace header from `tracingHeader` in `config.js` rather than a shared `traceHeaders()`. Pre-existing twin difference, not introduced here.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/server/app/services/persistence/records/real/http/headers.js:5` and `src/server/app/services/address-book/client.js:26` | New `ORGANISATION_ID_HEADER` constant beside a bare `'Trade-Imports-Organisation-Id'` literal in the address-book client for the same header. | One constant. | Import the constant in `address-book/client.js` (or move it to a shared `services/http/` module and import it in both). |
| `src/server/common/helpers/organisation-id.js:23` and `src/server/common/helpers/actor-helpers.js:12-13` | `credentials.organisationId ?? credentials.currentRelationshipId` written twice. animals-frontend names it `sessionOrganisationId`. | One rule, one place, same name as the twin. | See Missing Changes. |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/server/common/helpers/organisation-id.js:7-11` (JSDoc of `organisationIdOf`) | "The one place this value is read. It is forwarded to … the address book directly, and the backend, which passes it on to the address book in turn…" | `actor-helpers.js` reads the same credentials fields itself; the plants backend now stores the value as the owner and scopes every notification by it. | JSDoc states the new behaviour. | Match the animals-frontend wording once it is corrected; name the backend as scoping notifications on it. |
| `src/server/common/helpers/organisation-id.js:15-16` | "Callers decide what that means for them; none of them may substitute a guess." | `records/real/http/headers.js` substitutes `'5900001'` when none is bound and `NODE_ENV === 'test'`. | Either the comment or the fallback goes. | Bind the organisation in `test-support.js` (Missing Changes) and drop the fallback from production code, so the sentence stays true; or reword it as animals-frontend did. |
| `docs/repos/trade-imports-plants-frontend.md:31` (workspace) | Outbound row to plants-backend: "REST (`/notifications`)" with no header, while the address-book row on line 33 names `Trade-Imports-Organisation-Id`. | Every notifications call sends the organisation header. | Row names the header. | Append "; org id sent as `Trade-Imports-Organisation-Id`". |
| `openspec/specs/plants/` (workspace) | No organisation-scoping requirement. | Behaviour exists. | Requirement + coverage links. | — |

*Searched (`src/server/app/docs/*.md`, `src/server/app/sets/high-risk-plants/docs/*.md`, `README.md`, `AGENTS.md`, JSDoc, test titles; workspace `docs/repos/`): `organisation`, `Trade-Imports-Organisation-Id`, `without the organisation`, `never sends`, `currentRelationshipId`, `substitute a guess`. The old test title "Should request the page asked for without the organisation" was renamed in the diff.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 7 (four twin changes missing from plants — `sessionOrganisationId`, actor test, `test-support` binding, lighthouse guard; header literal beside the new constant; stale `organisationIdOf` JSDoc in two places) plus 1 stale workspace doc row
**Summary:** Same runtime behaviour as animals-frontend, but several supporting changes made in the animals twin were not carried across, and the helper's JSDoc now contradicts the test-env fallback.
