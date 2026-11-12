# trade-imports-routing-proxy

**Repo:** DEFRA/trade-imports-routing-proxy

## Purpose

The public entry point for the Import Notification Service (INS). It will serve the public INS URLs and forward each request to the INS service the path addresses, for example `/gbn-ag/...` to the animals journey frontend and `/auth/...` to the INS front door, setting `X-Forwarded-Prefix` on the way. See [02 INS Auth: Scenario 0](https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6619005520).

Today it is a skeleton from the CDP Node.js frontend template, enough to show the service is up (EUDPA-797). Forwarding and auth come in follow-up tickets.

## Responsibilities

- Serve the template's pages: home at `/`, `/about`, and `/cookies`, where a user views and saves their cookie settings.
- Serve `/health`, and static files under `/public` and `/favicon.ico`.
- Not yet: forward requests to other INS services, or take part in sign-in.

## Integrations

None yet. It will forward to `trade-imports-ins-frontend` and the journey frontends.

## Stack

- **Runtime:** Node.js
- **Web framework:** Hapi
- **Templating:** Nunjucks
- **UI:** GOV.UK Frontend design system
- **Session:** Catbox, in Redis or in memory as `SESSION_CACHE_ENGINE` chooses (Redis by default in production, memory otherwise)
- **Logging:** Pino (ECS-formatted, Defra CDP observability)
- **Unit tests:** Vitest

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| Redis | Session cache. The workspace stack sets `SESSION_CACHE_ENGINE=redis`, so the proxy connects to Redis when it starts there |

## How to run

In the workspace stack it listens on port 3004 (`routing-proxy` label for `-e`).

```bash
npm install
npm run dev        # port 3000 unless PORT is set
```

Docker:
```bash
docker build --target development -t trade-imports-routing-proxy:dev .
docker run -p 3000:3000 trade-imports-routing-proxy:dev
```
