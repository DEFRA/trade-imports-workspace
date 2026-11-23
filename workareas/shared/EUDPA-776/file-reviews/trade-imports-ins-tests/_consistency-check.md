# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-776
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-schemas, trade-imports-workspace
**PR:** #115 | **Commit:** 47d3968

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Contact page removed from the animals journey | animals-frontend ✅, perf-tests ✅ | ✅ `contact-address-page.ts`, `contact-address.spec.ts` deleted; flows, a11y and journey specs updated | CONSISTENT |
| Seed "opening run tail" after transporters | animals-frontend `OPENING_RUN_TAIL`, perf-tests `openingRunFromTransporter` / `'opening-run-from-transporter'` | `openingRunTailSteps()` (`flows/animals/seed-form-steps.ts:164`) | NAMING DRIFT |
| Event carries no `issuer` | backend ✅, gateway ✅ | ✅ asserted in `tests/animals-admin/e2e/features/outbox-event-notification.spec.ts:94`; ❌ `domain/animals/models/db/outbox-event-document.ts:54` still types `issuer?: GbnAgTradeParty` | PARTIAL |
| Notification stores no `consignment` party | backend ✅ (`NotificationBase.consignment` removed) | ❌ `domain/animals/models/db/notification-document.ts:93` still types `consignment?: StoredParty` | INCONSISTENT |
| Hub groups now five | animals-frontend assertion ✅ but title ❌ "six" | assertion ✅ (5 headings, 5 lists) but title ❌ "six numbered group headings" (`hub-groups-and-cya-rows.spec.ts:7`) | INCONSISTENT |
| Coverage links to tests this PR deletes or renames | workspace coverage ❌ (see below) | — | INCONSISTENT (fix in workspace) |

## Missing Changes

- Ticket AC: "`dynamics/notification-data.spec.ts` asserts the event has no `issuer`." The PR asserts it in `tests/animals-admin/e2e/features/outbox-event-notification.spec.ts:94` (the GBN-AG outbox event) and leaves `tests/animals/e2e/journeys/dynamics/notification-data.spec.ts` unchanged. Nothing checks that no PIMS message (v0.3.0 or v0.4.0) the gateway forwards carries `issuer`, which is the gateway half of the AC. Either assert it on the forwarded message or record in the PR why the outbox assertion is enough.

## Unique Changes

- **`tests/animals/e2e/features/amend-endings.spec.ts` deletes unrelated tests (Must: restore).** Removed with the contact cases: "while amending, the permanent address page ends with Save and continue alone", "…Cancel amend opens the cancel amendment confirmation page from the permanent address page", and the whole "…Cancel amend … from the CPH number page and the contact address page" test, which also drops the CPH number half. `CAT_ANSWERS` import removed with them. The permanent address page and CPH page are still in the journey (`flow/flow.js` `consignment-parties: [cphNumberPage, permanentAddressPage, addressesPage]`), and workspace `origin/main` `openspec/coverage/live-animals/journey-flow/coverage.json` links the permanent-address tests. Keep the permanent-address tests and keep the CPH half of the Cancel amend test, removing only the contact lines. These tests and the `cph-scope` wording below both came from `a9978e79 EUDPA-805: Design Release 2.1 — consignment parties (#114)`; the workspace and ins-frontend PRs revert EUDPA-805 content the same way, so this looks like one bad rebase across three repos.
- **`tests/animals/e2e/features/cph-scope.spec.ts:30` title rewritten away from main's wording.** Main reads "a saved CPH number shows in its slashed county/parish/holding form on the addresses page…"; this PR changes it to "shows as 12/345/6789 on the addresses page…" alongside the needed "reaches check your answers". The display wording change is not part of EUDPA-776 and drags the workspace coverage with it (below). Keep main's "slashed county/parish/holding form" and change only the ending.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `flows/animals/seed-form-steps.ts:164` vs animals-frontend `scripts/lighthouse/seed-notification.js:161` vs perf-tests `src/k6/live-animals.js:169-196` | Same "post accompanying documents then addresses after transport" tail under three names: `openingRunTailSteps()`, `OPENING_RUN_TAIL`, `openingRunFromTransporter`. Here: `{ slug: 'accompanying-documents', form: {} }, { slug: 'addresses', form: {} }`; frontend: `{ slug: 'accompanying-documents', fields: {} }, { slug: 'addresses', fields: {} }`. | One name | Keep "opening run tail" here and in the frontend; rename perf-tests to match |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `tests/animals/e2e/features/hub-groups-and-cya-rows.spec.ts:7` | "the hub groups its tasks under the six numbered group headings" | Five headings asserted. | Title states five | "…under the five numbered group headings…" (and the workspace SCN-OVERVIEW-011-A, SCN-CAPTIONS-003-A links) |
| `domain/animals/models/db/notification-document.ts:93` | `consignment?: StoredParty` | The backend no longer stores it. | Field gone | Delete it |
| `domain/animals/models/db/outbox-event-document.ts:54` | `issuer?: GbnAgTradeParty` | The event has no `issuer`; `outbox-event-notification.spec.ts:94` asserts it is undefined. | Field gone | Delete it (the `toBeUndefined()` check still compiles via the index access, or assert `not.toHaveProperty('issuer')`) |

Workspace coverage links that point at what this PR deleted or renamed (fix in the workspace PR, listed here so both sides land together):

| Coverage entry | Links to | State at this commit |
|----------------|----------|----------------------|
| `live-animals/journey-pages/check-your-answers` SCN-CYA-007-A | `tests/animals/e2e/pages/notification-view-states.spec.ts` "an unanswered contact address keeps the trader on the review after Continue…" | Deleted by this PR |
| `live-animals/journey-flow` SCN-FLOW-003-D | `cph-scope.spec.ts` "a saved CPH number shows as 123456789 on the addresses page…" | No such title (head reads "12/345/6789"; main reads "slashed county/parish/holding form") |
| `live-animals/journey-pages/overview` SCN-OVERVIEW-011-A, `live-animals/journey-section-captions` SCN-CAPTIONS-003-A | "…six numbered group headings…" | Title exists but is false |

*Searched: `contactAddress`, `contact address`, `consignment/contact`, `AnimalsContactAddressPage`, `BRANCH_ADDRESS`, `issuer`, `consignment?:`, `six numbered`, `0.3.0`, `0.4.0` in `tests/`, `flows/`, `domain/`, `page-objects/`, `README.md` (plants and INS address-book hits are out of scope and correct).*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 10 inconsistencies found
**Summary:** The contact page removal matches the frontend and perf-tests, but `amend-endings.spec.ts` deletes unrelated permanent-address and CPH Cancel amend tests, `cph-scope` changes main's title wording, the hub title still says six, two DB model types keep the removed `consignment` and `issuer`, and the AC's `notification-data.spec.ts` assertion lives elsewhere.
