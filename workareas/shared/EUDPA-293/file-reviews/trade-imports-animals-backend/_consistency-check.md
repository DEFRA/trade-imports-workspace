# Consistency Check: trade-imports-animals-backend

**Ticket:** EUDPA-293
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-animals-tests
**PR:** #84 | **Commit:** 6d0eca4

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Role set covered by the deleted-address check (`consignor`, `consignee`, `importer`, `destination`/`placeOfDestination`) | frontend: `outstanding-parties.js` checks the same four party ids (`placeOfDestination` mapped to backend's `destination` via the pre-existing `role: 'destination'` field in `parties.js`) | `ConsignmentPartyResolver` walks the same four roles (`CONSIGNOR`, `CONSIGNEE`, `IMPORTER`, `DESTINATION`) | CONSISTENT |
| "Report every affected role, not just the first" behaviour | frontend: `outstandingPartyErrors` / error summary lists every outstanding role (not just one) | `UnresolvableConsignmentPartyException` now carries a `Map` of every unresolved role instead of failing fast on the first (this PR's core change) | CONSISTENT |
| Backend is authoritative gate, frontend is UX only | Ticket tech notes explicitly state this; frontend PR relies on the read-path sanitiser + `outstandingPartyErrors`, not on this exception, to block Continue | This PR implements the authoritative 400 rejection on submit, independent of the frontend | CONSISTENT |
| E2E coverage of AC2 (`a direct API call` rejection) | tests repo's new Playwright spec only drives the flow through the frontend UI (AC1/AC3); it does not call the backend submit endpoint directly with a deleted-address reference | This repo's own `NotificationIT` already covers the direct-API case thoroughly (single deleted role, multiple deleted roles) | Likely CONSISTENT — see note under Missing Changes for the tests repo |

*No config/env-var, dependency-bump, or feature-flag patterns are introduced by this change.*

## Missing Changes

*None identified.* Backend test coverage (unit `ConsignmentPartyResolverTest`, `GlobalExceptionHandlerTest`, and integration `NotificationIT`) is thorough and self-contained for AC2.

## Unique Changes

- The `UnresolvableConsignmentPartyException` → `ProblemDetail` mapping (with a new `https://api.cdp.defra.cloud/problems/unresolvable-consignment-party` type URI and an `errors` map keyed by role) is backend-only, as expected — it's the wire contract the frontend already relies on for AC2 being authoritative, but AC1/AC3 (this ticket's frontend scope) do not consume this response shape directly; the frontend detects deleted addresses itself via the address-book resolve path, not by parsing this error. This split matches the ticket's tech notes ("Both are journey behaviour... only the address book itself is shared") — not suspicious.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The backend PR implements the authoritative AC2 submit-time gate independently and consistently with the frontend's AC1/AC3 UX gate, using the same four-role vocabulary; the only cross-repo gap worth a second look is that the tests repo's new E2E spec doesn't independently exercise a raw API submit against a deleted address, but that scenario is already well covered by this repo's own integration tests.
