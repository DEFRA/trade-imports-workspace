# Consistency Check: trade-imports-animals-tests

**Ticket:** EUDPA-293
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-animals-tests
**PR:** #128 | **Commit:** 1808776

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Error-summary / party-error markup exercised by locators | frontend: `kit.errorSummary` (`govuk-error-summary`), `party-row.js`'s inline `govuk-error-message` value cell | `notification-view-page.ts` adds `errorSummary` and `partyRow`/`partyError` locators matching that exact markup | CONSISTENT |
| "Change" link on the address hub | frontend: `controller.js` hub row now renders `Change`/`Add` per party as before, with change-context appended | `addresses-page.ts` adds `changeParty(role)` locator (`getByRole('link', { name: 'Change' })`) alongside the existing `addParty` | CONSISTENT |
| Full AC1+AC3 round trip (delete → flag → replace → clear → submit) | frontend: implements the mechanism (sanitiser, outstanding-parties, change-context round trip); backend: rejects the submit if the flow were bypassed | New spec in `addresses-live-link.spec.ts` drives exactly this round trip end-to-end, including the final successful submission | CONSISTENT |
| AC2 direct-API rejection ("regardless of the frontend — e.g. a direct API call") | backend: `NotificationIT` already asserts a direct submit against a deleted-address reference is rejected with per-role errors (single and multi-role cases) | No new spec here calls the backend submit endpoint directly with a deleted-address reference; the only new coverage goes through the frontend UI | Possibly INCOMPLETE — see Missing Changes |

## Missing Changes

- **AC2 has no independent tests-repo coverage.** The ticket's AC2 explicitly frames the backend rejection as applying "regardless of the frontend - e.g. a direct API call", which reads as a scenario this repo (which owns cross-service/API-level E2E coverage) might reasonably be expected to assert directly against the backend, rather than only through the frontend flow (which necessarily also confirms AC2 indirectly, since a successful final submission proves the backend accepted a resolved reference, but never proves the backend *rejects* an unresolved one — that path is fully exercised by the frontend's own sanitiser/validation before a submit request with a deleted reference could ever reach the backend). This is backed by strong backend IT coverage already (`NotificationIT`), so this may be an accepted intentional split rather than a gap — flagging for confirmation rather than as a defect.

## Unique Changes

*None identified beyond the page-object locators and spec needed to exercise the frontend's new markup — no changes here are unexplained by the other two repos' work.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 inconsistency found (unconfirmed — may be intentional)
**Summary:** The new E2E spec thoroughly exercises AC1/AC3 (the frontend-mediated delete → flag → replace → clear → submit loop) and matches the frontend's new markup via new page-object locators, but adds no test that calls the backend submit endpoint directly with a deleted-address reference to independently prove AC2's "regardless of the frontend" rejection — that scenario is otherwise only covered by the backend repo's own integration tests.
