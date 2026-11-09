# Code Review: EUDPA-713

**Ticket:** Store and enforce the owning organisation on every live animals notification
**Reviewer:** Claude Code Agent
**Date:** 2026-11-09
**Last Updated:** 2026-11-09 (refresh: backend cleanup removed)
**Verdict:** CONCERNS

## Summary
Both backends now store the owning organisation and filter every trader read and write by it, so the core of the ticket works. These problems remain before merge:
- Four animals document routes that take an upload id have no organisation check.
- The outbox Actor still takes its organisation from the request body.
- Many of the new tests cannot fail, because the frontends fall back to a fixed organisation under `NODE_ENV=test`.
- The cross-organisation end-to-end specs never run on a pull request.

The plants PRs apply the animals rule without delegation, though the ticket says plants needs its own ticket that handles delegation.

## Repositories Analyzed
| Repository | PR | Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-backend | #122 | f4c6b8c | 16 | NEEDS ATTENTION | [review.trade-imports-animals-backend.md](review.trade-imports-animals-backend.md) |
| trade-imports-animals-frontend | #461 | a535ca5 | 16 | NEEDS ATTENTION | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-ins-tests | #83 | 864a95e | 15 | NEEDS ATTENTION | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-performance-tests | #32 | 69ff5eb | 5 | NEEDS ATTENTION | [review.trade-imports-performance-tests.md](review.trade-imports-performance-tests.md) |
| trade-imports-plants-backend | #16 | 423e638 | 10 | NEEDS ATTENTION | [review.trade-imports-plants-backend.md](review.trade-imports-plants-backend.md) |
| trade-imports-plants-frontend | #139 | baffe54 | 12 | NEEDS ATTENTION | [review.trade-imports-plants-frontend.md](review.trade-imports-plants-frontend.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | The owner is stored on create, taken from `currentRelationshipId` and never from the body | Partial | The aggregate's owner comes from the header. But `resolveActor` still copies `actor.organisationId` from the body into the outbox event, which the tech notes forbid. The frontends prefer `organisationId` over `currentRelationshipId`; both hold the same value today. |
| 2 | The dashboard list, with or without a reference number, returns only the caller's notifications | Met | The finders filter by organisation. The integration test covers only the list with a reference number. |
| 3 | Another organisation's notification returns 404 on read, replace, copy, submit, amend, cancel-amend and soft-delete | Met (code) / Partial (tests) | Cancel-amend has no cross-organisation test in either backend. |
| 4 | Another organisation's fulfilments: the backend returns 403 and logs it, and the frontend shows 404 | Met | Each refusal is logged twice in the backend, and since the refresh the 404 path for other trader routes is logged twice as well (animals #58, plants #43). The frontend logs nothing when it turns the 403 into a 404. |
| 5 | A copy belongs to the caller's organisation | Met | Tested in animals, not in plants. |
| 6 | A request with no organisation ID is rejected | Met | The filter returns 400. The plants test passes without the filter, and nothing tests the list without the header. |
| 7 | Notifications stored without an organisation ID are deleted | N/A | No longer applicable. The cleanup was removed from both backends at the user's request, because every existing notification is test data with a TTL. The related items are closed. |
| 8 | An index on `organisationId`, `status` and the sort fields | Met | The compound indexes are present. A redundant single-field index was added, and no test checks the indexes. |
| 9 | Tests show organisation A cannot see or change B's notification | Partial | The backend integration tests show it. The end-to-end specs are tagged `@active`, so no pull request runs them, and the animals spec checks only the fulfilments 403. Document routes are not covered. |
| — | The document routes are scoped by organisation (implied by AC 9) | Not met | Claim, get, delete and file download by upload id do no organisation check. |

**Behaviour spec:** no PR in the set touches `openspec/`. Neither `openspec/specs/live-animals/` nor `openspec/specs/plants/` has a requirement for organisation scoping. The workspace branch `feat/EUDPA-713-organisation-scoped-notifications` exists but has no PR. The ZAP fix to `docker/stack/security.compose.yml` and the `docs/repos/` updates belong on that branch too.

## Test Coverage Assessment
- **Unit tests: partial.** In the frontends, the `NODE_ENV=test` fallback and the `enterWith` binder mean most organisation tests cannot fail. In the backends, tests stub the access check to do nothing and send the same organisation in the header and the body.
- **Integration tests: partial.** The backend integration tests cover the main cases. They miss cancel-amend, the indexes and the document routes, and the end-to-end specs run on no pull request.

## Configuration & Environment
- **New environment variables:** `TRADE_IMPORTS_PLANTS_BACKEND_URL` in the tests repo, and `ZAP_TRADE_IMPORTS_PLANTS_BACKEND_URL`. The second is set on CDP but missing from the workspace's `docker/stack/security.compose.yml`.
- **New HTTP header:** `Trade-Imports-Organisation-Id` is now required on trader routes in both backends.
- **Database changes:**
  - a new `organisationId` field
  - compound indexes `organisationId_status_created` (both backends) and `organisationId_status_arrivalDate` (animals)

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Medium |
| Code Quality | Medium |
| Security | Medium |
| Test Coverage | High |

## Conclusion
The organisation scoping of notifications is sound in both backends, and the frontends send the session's organisation correctly. Before merge:
1. Scope the document routes that take an upload id.
2. Stop taking the Actor's organisation from the request body.
3. Remove the test-only organisation fallback from the frontends so their tests can fail.
4. Move the cross-organisation specs to where pull requests run them.

The plants PRs should either take on delegation or move to their own ticket, as the tech notes say. Full item lists are in each `review.{repo}.md`.
