# trade-imports-animals-admin

**Repo:** DEFRA/trade-imports-animals-admin

## Purpose

Internal admin interface for the trade imports animals service. It lets internal users list and delete notifications, replay a notification's outbox events and manage the dynamics gateway's dead-letter queue. Built on the same Hapi and GOV.UK Frontend stack as the user-facing frontend.

| Page | What it does |
|------|--------------|
| `/notifications` | Lists notification reference numbers, and deletes the ones you choose |
| `/outbox-events` | Lists one notification's outbox events. `POST /outbox-events/replay` replays them |
| `/dlq-events` | The "DLQ process" page: lists the messages on the gateway's dead-letter queue, and replays all or deletes all of them |
| `/about` | About page |
| `/auth/*` | Sign-in and sign-out through Defra ID (`DEFRA_ID_*` settings, switched on by `AUTH_ENABLED`) |

## Stack

- **Runtime:** Node.js 26.13.1 (`engines` and `.nvmrc`)
- **Web framework:** Hapi
- **Templating:** Nunjucks
- **Frontend build:** Webpack (bundles JS and SCSS)
- **UI:** GOV.UK Frontend design system
- **Auth:** OIDC / JWT via Hapi Bell + Hapi JWT
- **Session:** Redis (Catbox, with in-memory fallback)
- **Logging:** Pino (ECS-formatted, Defra CDP observability)
- **Unit tests:** Vitest
- **Linting:** ESLint (neostandard), Stylelint

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| Redis | Distributed session cache |
| trade-imports-animals-backend (`TRADE_IMPORTS_ANIMALS_BACKEND_URL`, default `localhost:8085`) | Notification reference numbers, outbox events, replay and delete |
| trade-imports-dynamics-gateway (`TRADE_IMPORTS_DYNAMICS_GATEWAY_URL`, default `localhost:8088`) | The dead-letter queue: `/dlq/notifications`, `/replay-all` and `/delete-all` |
| Defra ID (OIDC) | Authentication |

Every call that changes data (delete, replay, replay-all, delete-all) sends the shared admin secret in the `Trade-Imports-Animals-Admin-Secret` header (`TRADE_IMPORTS_ANIMALS_ADMIN_SECRET`). The read calls do not.

## How to run

```bash
npm install
npm run dev        # starts webpack watcher + nodemon, port 3001
```

`npm run dev` sets `PORT=3001`. The config default and the Docker image use port 3000.

Docker:
```bash
# Development image
docker build --target development -t trade-imports-animals-admin:dev .
docker run -p 3000:3000 trade-imports-animals-admin:dev
```
