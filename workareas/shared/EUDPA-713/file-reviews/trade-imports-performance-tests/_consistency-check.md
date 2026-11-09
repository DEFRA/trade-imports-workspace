# Consistency Check: trade-imports-performance-tests

**Ticket:** EUDPA-713
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-backend, trade-imports-plants-frontend
**PR:** #32 | **Commit:** 69ff5eb

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Organisation id `'5900001'` for the default stub user (CRN 2100010101) | ins-tests `E2E_ORGANISATION_ID` ✅; both frontends' test default ✅ | ✅ `TRADER_ORGANISATION_ID` | CONSISTENT |
| Header `Trade-Imports-Organisation-Id` on direct backend calls | both backends require it on trader routes ✅ | ✅ `backendParams` (`journeys.js`), animals and plants readiness probes (`readiness.js`) | CONSISTENT |
| INS backend readiness probe without the header | ins-backend was not changed | ✅ `readBackend(...insBackend...)` unchanged | CONSISTENT (expected) |
| Header on `GET /notifications/{ref}/outbox-events` (`eventing.js` `confirmEventArrival`) | animals-backend's filter **excludes** `outbox-events` as an admin route | ⚠️ sends `traderOrganisationHeaders()` | Harmless but inconsistent — see Unique Changes |

## Missing Changes

*None identified.* Every backend route the k6 scripts call that now requires the header gets it.

## Unique Changes

- **`eventing.js` `confirmEventArrival` sends the trader header to `/notifications/{ref}/outbox-events`.** animals-backend's `TraderOrganisationHeaderFilter.shouldNotFilter` exempts that route and the controller does not bind the header, so it is ignored. Sending it suggests the route is scoped when the ticket says it stays unscoped. Drop the second argument to `readBody`, or leave a reason; the `readBody(url, headers = {})` parameter can then go too.
- `trader-organisation.test.js` — a vitest test for a three-line constant builder. Expected in this repo's style; not a cross-repo concern.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/config/trader-organisation.js:7` `TRADER_ORGANISATION_ID_HEADER` | Every other repo in this change names the same header `ORGANISATION_ID_HEADER` (both frontends' `headers.js`, both backends' filter, ins-tests `trader-api-headers.ts`). | Same name for the same header across the change, where nothing in the repo forces a prefix. | Rename to `ORGANISATION_ID_HEADER` (and `TRADER_ORGANISATION_ID` to `ORGANISATION_ID`, or keep the latter and match ins-tests' `E2E_ORGANISATION_ID`). Low priority. |
| `src/config/trader-organisation.js` vs `src/lib/address-book.js` | Checked for an existing organisation constant in the address-book helper: none (grep for `5900001`, `Trade-Imports-Organisation-Id` finds only the new file). No duplicate. | — | — |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `README.md:942` | "Every virtual user signs in as the one stubbed user, so all addresses are in one organisation: the heaviest case for the dashboard and address-book queries." | Still true — with scoping, one organisation holding every notification is still the heaviest case for the dashboard's `organisationId_status_*` index. | — | No change needed. |

*None stale (searched `README.md`, JSDoc and test titles for: `organisation`, `Trade-Imports-Organisation-Id`, `5900001`, `outbox-events`, `readiness`, `unscoped`).*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 2 (header sent to the unscoped `outbox-events` admin route; header constant named differently from every other repo)
**Summary:** The k6 scripts send the organisation everywhere the backends now need it; the only drift is a header sent to an admin route that ignores it and a constant name that differs from the rest of the change.
