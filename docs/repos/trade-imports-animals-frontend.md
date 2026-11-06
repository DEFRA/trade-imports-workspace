# trade-imports-animals-frontend

**Repo:** DEFRA/trade-imports-animals-frontend

## Purpose

User-facing web application that guides users through a multi-step form wizard for declaring animal/commodity imports into the UK. Steps cover origin, commodity selection, reason for import, and associated details. Requires authentication via Defra ID (OIDC).

## Stack

- **Runtime:** Node.js
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
| MongoDB | Data store (accessed via backend API) |
| Backend API | All business logic; frontend is a thin UI layer |
| AWS (S3, SQS) | File/message handling via backend; floci in dev |
| Defra ID (OIDC) | Authentication |

## Browser links with the INS frontend

The animals frontend builds every INS frontend URL from one setting, `tradeImportsInsFrontend.baseUrl` (`TRADE_IMPORTS_INS_FRONTEND_URL`). The INS frontend builds every animals frontend URL from `TRADE_IMPORTS_ANIMALS_FRONTEND_URL`. Every link is a browser redirect or an anchor, never a service-to-service call.

| Direction | Path | Carries | Purpose |
|-----------|------|---------|---------|
| Animals to INS | `/address-book` | Nothing | The service navigation's Address book item |
| Animals to INS | `/address-book/add` | `journey-type`, `notification-id`, `fulfilment-id`, `handshake-token` | The address handshake: the user picks or adds an address |
| Animals to INS | `/notification-type` | `notification-id`, `current-notification-type` | The live animals origin page's Back link, when the run began at the start entry |
| INS to animals | `/live-animals/start` | Nothing | The type question's Live animals choice |
| INS to animals | `/germinal-products/start` | Nothing | The type question's Germinal products choice |
| INS to animals | `/live-animals/notifications/{reference}/origin` | Nothing | The type question with Live animals kept for that notification |
| INS to animals | `/live-animals/notifications/{reference}`, or `.../notification-view` when SUBMITTED | Nothing | A dashboard row |
| INS to animals | `/live-animals/notifications/{notification-id}/address-return` | `fulfilment-id`, `handshake-token` (when one was sent), `addressId` and `landing` (when set) | The return from the address handshake |
| INS to animals | A page on the configured animals origin | Whatever the URL holds | The `return` query an address-book page honours |

The animals frontend serves no germinal products set, so `/germinal-products/start` has no page behind it. The Dashboard item and the service name in the animals service navigation stay inside the animals frontend.

## How to run

```bash
npm install
npm run dev        # starts webpack watcher + nodemon, port 3000
```

Docker:
```bash
docker compose up --build -d
```
