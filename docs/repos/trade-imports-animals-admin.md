# trade-imports-animals-admin

**Repo:** DEFRA/trade-imports-animals-admin

## Purpose

Internal admin interface for the trade imports animals service. Server-side rendered web application giving internal users visibility and management capability over import notifications and related data. Built on the same Hapi/GOV.UK Frontend stack as the user-facing frontend.

## Stack

- **Runtime:** Node.js
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
| Backend API | Data source for all admin views |
| Defra ID (OIDC) | Authentication |

## How to run

```bash
npm install
npm run dev        # starts webpack watcher + nodemon, port 3000
```

Docker:
```bash
# Development image
docker build --target development -t trade-imports-animals-admin:dev .
docker run -p 3000:3000 trade-imports-animals-admin:dev
```
