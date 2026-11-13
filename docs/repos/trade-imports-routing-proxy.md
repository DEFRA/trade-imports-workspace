# trade-imports-routing-proxy

**Repo:** DEFRA/trade-imports-routing-proxy

## Purpose

The public entry point for the Import Notification Service (INS). It will serve the public INS URLs and forward each request to the INS service the path addresses, for example `/gbn-ag/...` to the animals journey frontend and `/auth/...` to the INS front door, setting `X-Forwarded-Prefix` on the way. See [02 INS Auth: Scenario 0](https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6619005520).

Today it is built from the CDP Node.js frontend template, plus a Defra ID sign-in that shows what the sign-in returned. The sign-in is a spike (EUDPA-801): it finds out how sign-in works in a deployed INS service. Forwarding comes in follow-up tickets.

## Responsibilities

- Serve the template's pages: home at `/`, `/about`, and `/cookies`, where a user views and saves their cookie settings.
- Serve `/health`, and static files under `/public` and `/favicon.ico`.
- Sign a user in with Defra ID:
  - `/auth/sign-in` sends the browser to the identity provider.
  - `/auth/sign-in-oidc` is the callback. It checks the ID token's signature against the provider's published keys, then keeps a description of the sign-in in the session.
  - `/auth/signed-in` shows every ID token claim, the access token's claims when it is a different token, and the token response's expiry, scope and whether a refresh token came back. It never shows the tokens. With no sign-in in the session, it starts one.
- Every other page is public. The sign-in does not refresh tokens, sign out or switch organisation.
- The token's audience is not checked: the Defra ID stub signs every token with a random one.
- Not yet: forward requests to other INS services, or pass the user's identity to them.

## Integrations

| Service | How |
|---------|-----|
| Defra ID (the `trade-imports-defra-id-stub` locally) | OIDC through `@hapi/bell`: discovery at start-up, then authorisation, token exchange and the published signing keys |

It will forward to `trade-imports-ins-frontend` and the journey frontends.

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
| Defra ID | Sign-in. The proxy fetches the discovery document at start-up and does not start without it. Config: `DEFRA_ID_OIDC_CONFIGURATION_URL`, `DEFRA_ID_CLIENT_ID`, `DEFRA_ID_CLIENT_SECRET`, `DEFRA_ID_SERVICE_ID`, `DEFRA_ID_POLICY`, `DEFRA_ID_REDIRECT_URL` |

## How to run

In the workspace stack it listens on port 3004 (`routing-proxy` label for `-e`) and signs in against the Defra ID stub. Open `http://localhost:3004`, choose **Sign in**, and use Government Gateway user ID `2100010101` with password `Password123`.

```bash
npm install
npm run dev        # port 3000 unless PORT is set
```

Docker:
```bash
docker build --target development -t trade-imports-routing-proxy:dev .
docker run -p 3000:3000 trade-imports-routing-proxy:dev
```
