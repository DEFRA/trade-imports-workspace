# trade-imports-plants-frontend

**Repo:** DEFRA/trade-imports-plants-frontend

## Purpose

User-facing web application for the high-risk plants import notification journey. It runs on the same obligation and journey platform as the live-animals frontend: a journey-agnostic engine under `src/server/app/`, with all journey content in one `high-risk-plants` set beneath it.

State: the workspace `CLAUDE.md` describes this repo as "set empty, awaiting requirements". The repo's own README contradicts that. It says the journey is implemented (dashboard, task-list hub, collecting pages, review and submission). Treat the README as the more recent source; the `sets/high-risk-plants/spec/` files show requirements are still being reconciled (`conflicts.json`, `decisions.json`).

## Responsibilities

Owns:
- The plants notification UI: pages, task list, validation, journey flow and gates, held in `src/server/app/sets/high-risk-plants/`.
- The generic engine, flow machinery and persistence ports in `src/server/app/` (shared design with the animals frontend, but copied, not a shared package).
- Sign-in session handling (Defra ID OIDC, or a locally signed session in `STUB_MODE`) and the Redis-backed session cache.
- The commodity vocabulary (`sets/high-risk-plants/services/commodities`).

Does NOT own:
- Notification persistence or reference numbers: the plants backend does.
- Country and port reference data: it reads these from reference-data.
- Saved addresses: it reads these from the address book.
- Document upload, outbox, event publishing and PIMS routing: explicitly out of scope for the plants alpha.
- The end-to-end Playwright suite: it lives in `trade-imports-animals-tests` (a fourth project alongside `e2e`, `admin`, `ins`).

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | Browser users | HTTP, port 3003 | Serves the journey pages |
| Outbound | trade-imports-plants-backend | REST (`/notifications`), `TRADE_IMPORTS_PLANTS_BACKEND_URL`, default `localhost:8091` | Persist and read notifications and fulfilments |
| Outbound | trade-imports-reference-data | REST (`/countries`, `/ports-of-entry`), `TRADE_IMPORTS_REFERENCE_DATA_URL`, default `localhost:8086` | Countries and ports, primed in real mode |
| Outbound | trade-imports-address-book | REST (`/organisation/{orgId}/addresses`), `TRADE_IMPORTS_ADDRESS_BOOK_URL`, default `localhost:8089`; org id sent as `Trade-Imports-Organisation-Id` | Address picker |
| Outbound | Defra ID (OIDC; trade-imports-defra-id-stub locally) | OIDC via Hapi Bell / cookie / JWT | Sign-in and sign-out |
| Outbound | Redis | Catbox | Session cache (memory fallback) |

## Stack

- **Runtime:** Node.js 24+, npm 11.6.2
- **Web framework:** Hapi (Nunjucks via Vision, Yar sessions, Crumb CSRF)
- **UI:** GOV.UK Frontend, MOJ frontend, accessible-autocomplete; Webpack build
- **Auth:** Defra ID OIDC (`@hapi/bell`, `@hapi/cookie`, `@hapi/jwt`)
- **HTTP client:** Hapi Wreck; `undici` `fetch` in the service clients
- **Config:** convict (`src/config/config.js`)
- **Unit tests:** Vitest; **FIT tests:** Playwright in `fit/`; Lighthouse audits
- **Linting:** ESLint, Stylelint, Prettier, dependency-cruiser (`lint:arch`)
- **Logging:** Pino, ECS format; CDP metrics, auditing and tracing packages

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| Redis | Distributed session cache |
| Plants backend | Notification persistence (real mode) |
| Reference data service | Countries and ports; a failed fetch at boot exits the process in the workspace stack |
| Address book | Organisation-scoped addresses |
| Defra ID (or its stub) | Authentication |

`STUB_MODE=true` swaps backend, reference data and address book for stub data and skips the OIDC exchange (refused in production).

## How to run

```bash
npm install
npm run dev        # webpack watcher + nodemon, port 3003
npm test           # builds frontend, then Vitest with coverage
npm run test:high-risk-plants
```

Docker: `docker build --target development --tag trade-imports-plants-frontend:development .`
Workspace stack service: `plants-frontend`, port 3003 (use `PORT=3053` for local Playwright when the stack is up).
