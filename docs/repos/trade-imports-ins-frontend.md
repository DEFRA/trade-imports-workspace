# trade-imports-ins-frontend

**Repo:** DEFRA/trade-imports-ins-frontend

## Purpose

Import Notification Service (INS) front door: a Node.js/Hapi server-rendered web app (GOV.UK Frontend) providing Defra ID sign-in, a notifications dashboard and an organisation-scoped address-book UI. It is a backend-for-frontend (BFF): it holds the user session and calls the address-book, ins-backend and reference-data APIs on the user's behalf.

**Target direction (not yet in code):** the INS becomes the front door for all journeys. A trader answers routing questions here and is sent to the right journey, and capabilities shared across journeys (dashboard, address book) live in the INS. See [`architecture-overview.md`](architecture-overview.md#target-direction).

## Responsibilities

**Owns**

- Sign-in and sign-out via Defra ID (OIDC) using `@hapi/bell` and `@hapi/cookie`. The organisation id is read from `request.auth.credentials.organisationId`; `requireOrganisationId` returns 403 when it is missing.
- A hidden test sign-in through the real Defra ID (IDM) in CP-Dev, which shows what IDM returns and never signs anyone in to the service. Its routes (`/auth/idm/sign-in`, `/auth/idm/go-to-defra-id`, `/auth/callback`, `/auth/idm/signed-in`, `/auth/signed-out`) are registered whatever `auth.enabled` is, only when `IDM_OIDC_CONFIGURATION_URL` and the IDM client settings are set and IDM discovery succeeds at start-up. No page of the service links to them.
- Server-side session (Catbox: Redis in production, memory otherwise), CSRF (crumb) and CSP.
- Pages: dashboard `/` (notification list, sort, reference-number search, pagination, and a Create new button that opens the type question at `/notification-type`), the "What are you importing?" question at `/notification-type`, and address book at `/address-book`, `/address-book/add/address-type` (choose an address type), `/address-book/add`, `/address-book/{id}`, `/edit` and `/delete`. The address book list has three tabs, one per address type (Origin and Consignor; Destination, Consignee and Importer; Branch), and a Type filter that narrows the selected tab to one role. The add form asks what the address can be used for (`roles`), offering the roles of the chosen address type. An address type is this frontend's grouping of roles: it is worked out from an address's roles and never sent to the address book. Transporters have their own pages: `/address-book/add/transporter` (choose private or commercial), `/address-book/add/transporter/private`, `/address-book/add/transporter/commercial`, and `/address-book/transporter/{id}`, `/edit` and `/delete`. Routes are only registered when `auth.enabled` is true.
- An address lookup spike page, `/address-lookup-spike`, registered only when the CDP environment is `dev` or `local`. It calls the ins-backend's `GET /address-lookup` (`services/address-lookup/client.js`).
- The "What are you importing?" question offers no germinal products choice until the germinal products set has a start page in the animals service.
- Address form validation (`features/address-book/fields.js`, built on `lib/validate/`) and mapping API problem responses to GOV.UK error summaries.
- A journey handshake: an address-book visit can carry the query or form keys `journey-type`, `notification-id`, `fulfilment-id` and `handshake-token`. The known journey types are `gbn-ag` and `gbn-ag-germinal-products`. The return URL points at the animals frontend: for `gbn-ag`, the live-animals set, `/live-animals/notifications/{notification-id}/address-return?fulfilment-id={fulfilment-id}`, and for `gbn-ag-germinal-products` the same path under `/germinal-products`. It adds `handshake-token` when one was sent (`journey-registry.js`). On the add page, Save adds `addressId` and `landing=select` or `landing=return`; Cancel adds `landing=cancel`, except for the consignment contact, whose cancel adds no landing; the back link adds no landing (`add.controller.js`).
- Organisation-scoped dashboard reads: on every `GET /notifications` the service client sends the verified session's organisation in `Trade-Imports-Organisation-Id`. The ins-backend filters by that header and refuses a request without one.

**Does not own**

- Address data (address-book), notification data (aggregated read model in ins-backend) or country reference data (reference-data). It has no database.
- Notification creation or editing. Dashboard links deep-link to trade-imports-animals-frontend (`/live-animals/notifications/{reference}`, or `.../notification-view` when SUBMITTED). The dashboard rows link to live animals notifications only, because the ins-backend read model aggregates only the animals backend's events.
- The address-book tenant check. This service must send the verified `Trade-Imports-Organisation-Id`; address-book trusts it.
- Role and permission lookup: `src/auth/get-permissions.js` uses simulated RPS and Siti Agri calls. The sign-in controller (`src/server/auth/controller.js`) calls it.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Outbound | trade-imports-address-book (`TRADE_IMPORTS_ADDRESS_BOOK_URL`, default :8089) | REST `/organisation/{orgId}/addresses`, header `Trade-Imports-Organisation-Id` | List, create, view, update, delete addresses |
| Outbound | trade-imports-address-book | REST `/organisation/{orgId}/transporters`, header `Trade-Imports-Organisation-Id` (`services/transporters`) | List, create, view, update, delete transporters |
| Outbound | trade-imports-ins-backend (`TRADE_IMPORTS_INS_BACKEND_URL`, default :8090) | REST `GET /notifications` (`page`, `sort`, `referenceNumber`), header `Trade-Imports-Organisation-Id` | Dashboard notification list |
| Outbound | trade-imports-ins-backend | REST `GET /address-lookup` (dev and local only) | The address lookup spike page |
| Outbound | trade-imports-reference-data (`TRADE_IMPORTS_REFERENCE_DATA_URL`, default :8086) | REST `GET /countries` | Country names and address country options |
| Outbound | Defra ID (trade-imports-defra-id-stub locally) | OIDC (`DEFRA_ID_OIDC_CONFIGURATION_URL`) | Sign-in, token refresh, sign-out; the CSP form-action allows the browser-facing Defra ID origin |
| Outbound | Defra ID IDM in CP-Dev (`IDM_OIDC_CONFIGURATION_URL`, optional) | OIDC: discovery, JWKS and token exchange, metric dependency `idm` | The hidden test sign-in at `/auth/idm/sign-in`, which never signs anyone in to the service |
| Outbound (browser redirect) | trade-imports-animals-frontend (`TRADE_IMPORTS_ANIMALS_FRONTEND_URL`) | Links and CSP form-action to its URLs | Start a live animals notification from the type question; return to a live animals notification's origin page from the type question; resume or view a notification; return from the address handshake; follow an address-book page's honoured `return` query to an animals frontend page, given as a URL on that origin or as a `/live-animals` path resolved against this setting |
| Outbound (browser redirect) | trade-imports-plants-frontend (`TRADE_IMPORTS_PLANTS_FRONTEND_URL`) | Redirect to its start entry | Start a high-risk plants notification from the type question |
| Outbound | Redis | Catbox Redis | Session cache |
| Inbound | End users' browsers | HTTP | Dashboard and address-book pages |
| Inbound | animals-frontend (via browser link) | HTTP GET `/address-book` | The animals service navigation's Address book item |
| Inbound | animals-frontend (via browser redirect) | HTTP query parameters (handshake) | Send the user to choose or add an address |
| Inbound | animals-frontend (via browser redirect) | HTTP query parameters (`notification-id`, `current-notification-type`) on `/notification-type` | The origin page's Back link sends the user to the type question, which picks the notification back up with its type pre-selected |

API calls forward the tracing header (`x-cdp-request-id` by default). `STUB_MODE=true` swaps the address-book, transporter, ins-backend and countries clients for stub data, and signs its own session in place of the Defra ID OIDC exchange. Auth is still enforced. The setting is ignored in production.

## Stack

- **Runtime:** Node.js >= 26.13.1 (ES modules)
- **Framework:** Hapi 21, Nunjucks, govuk-frontend 6.6.0, webpack 5 (asset build, `build:frontend`)
- **Config:** convict (`src/config/config.js`)
- **HTTP clients:** built-in `fetch` (undici; forward proxy supported)
- **Sessions/cache:** Catbox (Redis via ioredis, or memory), `@hapi/yar`
- **Logging/metrics:** pino (ECS format), `@defra/cdp-metrics`
- **Tests:** Vitest with coverage, nock; Playwright "fit" tests (`test:fit`) with axe accessibility checks

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| Redis | Session cache in production (`SESSION_CACHE_ENGINE`) |
| Defra ID / defra-id-stub | Identity provider |
| address-book, ins-backend, reference-data | Data APIs (see Integrations) |

## How to run

```bash
nvm use && npm install
npm run dev              # nodemon, memory session cache
npm test                 # Vitest
npm run test:fit         # Playwright
```

Standalone against the stub: set `DEFRA_ID_OIDC_CONFIGURATION_URL` and `DEFRA_ID_POLICY` (see README). Or set `STUB_MODE=true` for no network dependencies. `npm run test:fit` sets it for its own web server.

Port: **3002** (config default `PORT`).
