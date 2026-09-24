# trade-imports-ins-frontend

**Repo:** DEFRA/trade-imports-ins-frontend

## Purpose

Import Notification Service (INS) front door: a Node.js/Hapi server-rendered web app (GOV.UK Frontend) providing Defra ID sign-in, a notifications dashboard and an organisation-scoped address-book UI. It is a backend-for-frontend (BFF): it holds the user session and calls the address-book, ins-backend and reference-data APIs on the user's behalf. The README is still the CDP frontend template text; this description is drawn from `src/`.

**Target direction (not yet in code):** the INS becomes the front door for all journeys. A trader answers routing questions here and is sent to the right journey, and capabilities shared across journeys (dashboard, address book) live in the INS. See [`architecture-overview.md`](architecture-overview.md#target-direction).

## Responsibilities

**Owns**

- Sign-in and sign-out via Defra ID (OIDC) using `@hapi/bell` and `@hapi/cookie`. The organisation id is read from `request.auth.credentials.organisationId`; `requireOrganisationId` returns 403 when it is missing.
- Server-side session (Catbox: Redis in production, memory otherwise), CSRF (crumb) and CSP.
- Pages: dashboard `/` (notification list, sort, reference-number search, pagination) and address book at `/address-book`, `/address-book/add`, `/address-book/{id}`, `/edit` and `/delete`. Routes are only registered when `auth.enabled` is true.
- Address form validation (`address-schema.js`) and mapping API problem responses to GOV.UK error summaries.
- A journey handshake: an address-book visit can carry `journeyType`, `notificationId`, `fulfilmentId` and `handshakeToken`. The only known journey type is `gbn-ag`; the return URL points at the animals frontend (`/notifications/{id}/address-return`).

**Does not own**

- Address data (address-book), notification data (aggregated read model in ins-backend) or country reference data (reference-data). It has no database.
- Notification creation or editing. Dashboard links deep-link to trade-imports-animals-frontend (`/notifications/{reference}`, or `.../notification-view` when SUBMITTED). Only one journey is supported; how other journeys will be told apart is Unclear from code.
- The address-book tenant check. This service must send the verified `Trade-Imports-Organisation-Id`; address-book trusts it.
- Organisation scoping of the dashboard: `ins-backend-client` sends no organisation header and lists all aggregated notifications (deliberate, per a code comment).
- Role and permission lookup: `src/auth/get-permissions.js` uses simulated RPS and Siti Agri calls, and no caller was found.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Outbound | trade-imports-address-book (`TRADE_IMPORTS_ADDRESS_BOOK_URL`, default :8089) | REST `/organisation/{orgId}/addresses`, header `Trade-Imports-Organisation-Id` | List, create, view, update, delete addresses |
| Outbound | trade-imports-ins-backend (`TRADE_IMPORTS_INS_BACKEND_URL`, default :8090) | REST `GET /notifications` (`page`, `sort`, `referenceNumber`) | Dashboard notification list |
| Outbound | trade-imports-reference-data (`TRADE_IMPORTS_REFERENCE_DATA_URL`, default :8086) | REST `GET /countries` | Country names and address country options |
| Outbound | Defra ID (trade-imports-defra-id-stub locally) | OIDC (`DEFRA_ID_OIDC_CONFIGURATION_URL`) | Sign-in, token refresh, sign-out |
| Outbound (browser redirect) | trade-imports-animals-frontend (`TRADE_IMPORTS_ANIMALS_FRONTEND_URL`) | Links and CSP form-action to its URLs | Start, resume or view a notification; return from the address handshake |
| Outbound | Redis | Catbox Redis | Session cache |
| Inbound | End users' browsers | HTTP | Dashboard and address-book pages |
| Inbound | animals-frontend (via browser redirect) | HTTP query parameters (handshake) | Send the user to choose or add an address |

API calls forward the tracing header (`x-cdp-request-id` by default). `INS_MODE=stub` swaps the address-book, ins-backend and countries clients for in-memory canned data with no network calls (default `real`). `AUTH_STUB_MODE` bypasses the OIDC round trip outside production.

## Stack

- **Runtime:** Node.js >= 24 (ES modules)
- **Framework:** Hapi 21, Nunjucks, govuk-frontend 6.2.0, Vite (asset build)
- **Config:** convict (`src/config/config.js`)
- **HTTP clients:** built-in `fetch` (undici; forward proxy supported)
- **Sessions/cache:** Catbox (Redis via ioredis, or memory), `@hapi/yar`
- **Logging/metrics:** pino (ECS format), `@defra/cdp-metrics`, `@defra/cdp-auditing`
- **Tests:** Vitest with coverage, nock; Playwright "fit" tests (`test:fit`) with axe accessibility checks

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| Redis | Session cache in production (`SESSION_CACHE_ENGINE`) |
| Defra ID / defra-id-stub | Identity provider |
| address-book, ins-backend, reference-data | Data APIs (see Integrations) |
| Floci, MongoDB | In the repo's template `compose.yml`; no use in this app's code (template leftover) |

## How to run

```bash
nvm use && npm install
npm run dev              # nodemon, memory session cache
npm test                 # Vitest
npm run test:fit         # Playwright
```

Standalone against the stub: set `DEFRA_ID_OIDC_CONFIGURATION_URL` and `DEFRA_ID_POLICY` (see README). Or set `INS_MODE=stub` and `AUTH_STUB_MODE=true` for no network dependencies.

Port: **3002** (config default `PORT`).
