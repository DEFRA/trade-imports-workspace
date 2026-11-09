# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-713
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-backend, trade-imports-plants-frontend
**PR:** #83 | **Commit:** 864a95e

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `NotificationApiClient` sends `Trade-Imports-Organisation-Id` on every trader call (default `E2E_ORGANISATION_ID = '5900001'`) | both backends require it ✅; perf-tests sends `'5900001'` ✅; both frontends' stub sign-in uses `5900001` for CRN 2100010101 ✅ | ✅ Present | CONSISTENT |
| Cross-organisation fulfilments read → 403 | both backends ✅ | ✅ animals and plants specs | CONSISTENT |
| Cross-organisation list-by-reference → empty | both backends' ITs ✅ | plants spec ✅; **animals spec ❌** | INCONSISTENT |
| Cross-organisation replace / submit / amend / copy / soft-delete → 404 | both backends' ITs ✅ | plants spec ✅; **animals spec ❌** | INCONSISTENT |
| Cross-organisation `cancel-amend` → 404 | neither backend IT ❌ | ❌ neither spec | CONSISTENT gap (AC lists it) |
| Plants backend reachable (`TRADE_IMPORTS_PLANTS_BACKEND_URL` in both Playwright configs, `getPlantsBackendBaseUrl`) | workspace `docker/stack/frontend.compose.yml:189` uses `:8091` ✅ | ✅ `playwright.docker-compose.config.ts` defaults to `http://localhost:8091` | CONSISTENT |
| ZAP `plants-backend` context (`zap/automation-{passive,active,context}.yaml`, `entrypoint.sh` sets `ZAP_TRADE_IMPORTS_PLANTS_BACKEND_URL` on CDP) | workspace `docker/stack/security.compose.yml` sets every other `ZAP_TRADE_IMPORTS_*_URL` (lines 11-15) | ✅ plans and CDP entrypoint | **INCONSISTENT** — the local ZAP container is never given `ZAP_TRADE_IMPORTS_PLANTS_BACKEND_URL`, so locally the context URL stays the literal `${ZAP_TRADE_IMPORTS_PLANTS_BACKEND_URL}` |
| Per-domain ZAP scope | `config/zap.ts` `ZAP_SCOPE_CONTEXTS` maps `animals` → `['frontend', 'backend']`, `ins` → `['ins', 'address-book']` | ❌ no `plants` entry and no `test:docker-compose:plants:security[:active]` scripts in `package.json`, though `tests/plants/security/` now has a spec | INCONSISTENT |

## Missing Changes

- **Animals spec is thinner than its plants twin.** `tests/animals/security/backend/organisation-scoped-notifications.spec.ts` has one test (fulfilments 403). `tests/plants/security/backend/organisation-scoped-notifications.spec.ts` also proves the list-by-reference returns nothing and that amend, replace, submit, copy and soft-delete return 404. The ticket is about live animals, and its AC "Tests show that a user in organisation A cannot see or change a notification that belongs to organisation B" applies first to animals. Port the two plants tests (and its `expectStatus` helper) to the animals spec.
- **Workspace `docker/stack/security.compose.yml`** — add `ZAP_TRADE_IMPORTS_PLANTS_BACKEND_URL: ${ZAP_TRADE_IMPORTS_PLANTS_BACKEND_URL:-http://localhost:8091}` beside line 14. The tests repo cannot work locally without it; per workspace rule 2 the workspace change belongs in the same branch name.
- **`config/zap.ts` / `package.json`** — add `plants: ['plants-backend']` (plus any plants frontend context when one exists) and the `test:docker-compose:plants:security` / `:security:active` scripts, so the new plants security spec has a way to run in its domain like the other three.
- **`cancel-amend`** — add the cross-organisation 404 case to both specs (and to both backend ITs).

## Unique Changes

- **Two new fixtures nobody uses**: `fixtures/ui.ts:144` `plantsNotificationApi` and `fixtures/security.ts:20` `proxiedPlantsNotificationApi`. Both specs build `NotificationApiClient` by hand. Either use them (the plants spec's owner client is exactly `plantsNotificationApi`) or remove them.
- `zap/*` `plants-backend` context, `entrypoint.sh` — intentional so the plants backend is scanned; see the ZAP rows above for what is missing around it.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `tests/animals/security/backend/organisation-scoped-notifications.spec.ts:2` vs `tests/plants/security/backend/organisation-scoped-notifications.spec.ts:2` | Same constant imported from two homes: animals via the back-compat re-export `export { E2E_ORGANISATION_ID }` in `adapters/http/address-book-api-client.ts:8`, plants from `adapters/http/trader-api-headers.ts`. | One import path for the constant. | Import from `@adapters/http/trader-api-headers` in the animals spec; then drop the re-export if nothing else needs it. |
| Both specs, line 6-7 | `const OTHER_ORGANISATION_ID = '9999999'` declared in each spec. | Shared beside `E2E_ORGANISATION_ID`. | Export it from `trader-api-headers.ts`. |
| `adapters/http/trader-api-headers.ts` | File name says "trader API headers" but it holds an organisation id and header name also used by the address-book client, which is not a trader API. | Name says what it holds. | `organisation.ts` (or keep, and note the address book in its JSDoc). Low priority. |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `README.md:104` | Domains table: `plants` has "—" under security and security:active, and "A dash means the domain has no specs of that test type yet." | `tests/plants/security/backend/organisation-scoped-notifications.spec.ts` is a plants security spec. | Table states the new state (with the scripts added). | Add `test:docker-compose:plants:security` / `:security:active` and fill the row. |
| `docs/security.md:49-57` "What gets scanned" | Lists five services; no `trade-imports-plants-backend`. | The ZAP plans now have a `plants-backend` context. | Table lists it. | Add `| trade-imports-plants-backend | 8091 | plants-backend |`. |
| `docs/security.md:59` | "The two APIs are scanned all the same…" | Three APIs (animals backend, address book, plants backend). | Count is right. | "The three APIs…" |
| `docs/security.md:61` | "…the full actuator set … on the two Java services." | The plants-backend context excludes the same actuator set; three Java services. | Count is right. | "…on the three Java services." |
| `utils/playwright/with-service-base-urls.ts` (JSDoc) | Updated in the diff to name `TRADE_IMPORTS_PLANTS_BACKEND_URL`. | — | — | Already correct. |

*Searched (`README.md`, `docs/*.md`, `AGENTS.md`, `CLAUDE.md`, JSDoc, test titles; workspace `docker/stack/`): `E2E_ORGANISATION_ID`, `ORGANISATION_ID_HEADER`, `Trade-Imports-Organisation-Id`, `ZAP_TRADE_IMPORTS`, `ZAP_SCOPE`, `plants`, `two APIs`, `two Java`, `8091`.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 7 (animals spec thinner than plants; local ZAP env var missing in the workspace stack; no plants ZAP scope or scripts; two unused fixtures; constant imported from two homes; stale README row; stale `docs/security.md` table and counts)
**Summary:** The plants side is well covered, but the animals spec — the ticket's own domain — proves only the 403 read, and the new plants ZAP context is not wired into the local stack, the scope map or the docs.
