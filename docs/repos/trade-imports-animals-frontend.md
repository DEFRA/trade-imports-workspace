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
- **E2E tests:** Playwright (lives in the `trade-imports-animals-tests` repo)
- **Linting:** ESLint (neostandard), Stylelint

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| Redis | Distributed session cache |
| MongoDB | Data store (accessed via backend API) |
| Backend API | All business logic; frontend is a thin UI layer |
| AWS (S3, SQS) | File/message handling via backend; floci in dev |
| Defra ID (OIDC) | Authentication |

## How to run

```bash
npm install
npm run dev        # starts webpack watcher + nodemon, port 3000
```

Docker:
```bash
docker compose up --build -d
```
