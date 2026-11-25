# trade-imports-animals-frontend

**Repo:** DEFRA/trade-imports-animals-frontend

## Purpose

User-facing web application where traders create and submit live animal import notifications. Users sign in through Defra ID (OIDC).

The journey runs on a shared obligation and journey platform in `src/server/app/`. The platform evaluates an obligation set, holds the notification's state and runs the journey flow. The live animals set (`src/server/app/sets/live-animals/`) supplies the pages and rules, and is mounted under `/live-animals`. `src/server/app/docs/README.md` explains the platform's layers and how to add a set.

## Stack

- **Runtime:** Node.js 26.13.1 (`engines` and `.nvmrc`; Docker parent image `3.2.8-node26.13.1`)
- **Web framework:** Hapi
- **Templating:** Nunjucks
- **Frontend build:** Webpack (bundles JS and SCSS)
- **UI:** GOV.UK Frontend design system
- **Auth:** OIDC / JWT via Hapi Bell + Hapi JWT
- **Session:** Redis (Catbox, with in-memory fallback)
- **HTTP client:** Hapi Wreck
- **Logging:** Pino (ECS-formatted, Defra CDP observability)
- **Unit tests:** Vitest
- **E2E tests:** Playwright (the `animals` domain in the `trade-imports-ins-tests` repo)
- **Linting:** ESLint (neostandard), Stylelint

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| Redis | Distributed session cache |
| Backend API | Stores notifications; the frontend has no database of its own |
| cdp-uploader | Accompanying document uploads and virus scanning |
| Defra ID (OIDC) | Authentication |

The frontend does not use MongoDB, S3 or SQS directly. The backend and cdp-uploader do.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | Browser users | HTTP, port 3000 | Serves the journey pages |
| Outbound | trade-imports-animals-backend | REST (`/notifications`), `TRADE_IMPORTS_ANIMALS_BACKEND_URL`, default `localhost:8085`; org id sent as `Trade-Imports-Organisation-Id` | Persist and read notifications and fulfilments |
| Outbound | trade-imports-reference-data | REST, `TRADE_IMPORTS_REFERENCE_DATA_URL`, default `localhost:8086` | Countries, commodities and other reference lists |
| Outbound | trade-imports-address-book | REST, `TRADE_IMPORTS_ADDRESS_BOOK_URL`, default `localhost:8089` | Addresses for the party pickers, and transporters (`src/server/app/services/transporters`) |
| Outbound | cdp-uploader | REST, `CDP_UPLOADER_BASE_URL`, default `localhost:7337` | Opens an upload session for an accompanying document. cdp-uploader posts the scan result to the backend's `/document-uploads/pending/scan-results` (`CDP_UPLOADER_CALLBACK_URL`) |
| Outbound | Defra ID (OIDC; trade-imports-defra-id-stub locally) | OIDC via Hapi Bell / cookie / JWT | Sign-in and sign-out |
| Outbound | Redis | Catbox | Session cache (memory fallback) |

## Browser links with the INS frontend

The animals frontend builds every INS frontend URL from one setting, `tradeImportsInsFrontend.baseUrl` (`TRADE_IMPORTS_INS_FRONTEND_URL`). The INS frontend builds every animals frontend URL from `TRADE_IMPORTS_ANIMALS_FRONTEND_URL`. Every link is a browser redirect or an anchor, never a service-to-service call.

| Direction | Path | Carries | Purpose |
|-----------|------|---------|---------|
| Animals to INS | `/address-book` | Nothing | The service navigation's Address book item |
| Animals to INS | `/address-book/add` | `journey-type`, `notification-id`, `fulfilment-id`, `handshake-token` | The address handshake: the user picks or adds an address |
| Animals to INS | `/address-book/{addressId}` | `return` (the picker's `/live-animals` path, with its search, page, chosen address and change marker) | A party picker row's View link. Not offered with `STUB_MODE`, when no INS frontend runs, and neither is the picker's add-address button |
| Animals to INS | `/notification-type` | `notification-id`, `current-notification-type` | The live animals origin page's Back link, when the run began at the start entry |
| INS to animals | `/live-animals/start` | Nothing | The type question's Live animals choice |
| INS to animals | `/live-animals/notifications/{reference}/origin` | Nothing | The type question with Live animals kept for that notification |
| INS to animals | `/live-animals/notifications/{reference}`, or `.../notification-view` when SUBMITTED | Nothing | A dashboard row |
| INS to animals | `/live-animals/notifications/{notification-id}/address-return` | `fulfilment-id`, `handshake-token` (when one was sent), `addressId` and `landing` (when set) | The return from the address handshake |
| INS to animals | A URL on the configured animals origin, or a `/live-animals` path resolved against it | Whatever the URL holds | The `return` query an address-book page honours, except when the INS frontend runs with `STUB_MODE` |

The Dashboard item and the service name in the animals service navigation stay inside the animals frontend.

## How to run

```bash
npm install
npm run dev        # starts webpack watcher + nodemon, port 3000
```

The repo has no compose file. From the workspace root, `tim docker up` starts the whole stack, and `tim docker dev` builds it from local source. To run this frontend with `npm run dev` against the rest of the stack, leave it out with `tim docker dev -e frontend`.
