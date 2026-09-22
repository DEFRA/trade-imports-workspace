# trade-imports-defra-id-stub

**Repo:** DEFRA/trade-imports-defra-id-stub

## Purpose

Stub of the Defra Identity (Defra ID, Azure B2C style OIDC) sign-in service for Trade Imports. It exists because neither the official Defra ID stub nor the CDP one supports the `signupsigninsfi` policy used here, which signs in with a CRN and password and changes the content of the default token. The README describes it as a work in progress.

## Responsibilities

**Owns**
- OIDC provider behaviour for the `b2c_1a_cui_cpdev_signupsigninsfi` policy: well-known configuration, authorise, token (authorisation code and refresh token), JWKS keys and sign-out.
- CRN and password login (password from `AUTH_PASSWORD`, default in the compose file `Password123`), and the organisation picker (`/organisations`).
- Signed JWT generation consistent with the policy (access token lifetime 24 hours) and short-lived SSO sessions (README: one hour, extended on re-authentication).
- The test identities: `src/data/mock.json` people and organisations, or an override via `AUTH_OVERRIDE` / `AUTH_OVERRIDE_FILE` (`example.data.json` shows the format).

**Does not own**
- Real user, organisation or relationship data; nothing here is authoritative.
- Authorisation decisions in consuming services, which validate the token themselves.
- Fidelity to the real service: organisation selection is marked "TODO" in the README (a picker route exists in code, so treat the extent as unclear).

**Also present:** optional Entra ID protection (`ENTRA_ENABLED`, default false) guarding an `/s3` admin UI for the data files kept in S3 (`AWS_S3_ENABLED`). This supports editing the stub's data; deployment use is unclear from code.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-animals-frontend, trade-imports-animals-admin, trade-imports-ins-frontend, trade-imports-plants-frontend | OIDC (browser redirects plus server-side token and JWKS calls) | Sign-in. Each has `DEFRA_ID_*` config; the frontend default is `http://localhost:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration`. Per-service usage beyond config was not checked for admin, ins and plants. |
| Outbound | Redis | ioredis (catbox) | Session cache when `REDIS_HOST` is set; otherwise not used (default host is null). Single-instance fallback is implied by `USE_SINGLE_INSTANCE_CACHE`. |
| Outbound (optional) | AWS S3 (Floci locally) | AWS SDK v3 | Dataset files for the `/s3` admin routes, when `AWS_S3_ENABLED`. |
| Outbound (optional) | Microsoft Entra ID | OIDC (Bell) | Only when `ENTRA_ENABLED`; protects the `/s3` routes. |

## Stack

- **Runtime:** Node.js (>= 24.12)
- **Framework:** Hapi 21 (`@hapi/jwt`, `cookie`, `bell`, `yar`), Nunjucks and govuk-frontend views
- **Build tool:** npm, webpack (front-end assets)
- **Config:** convict
- **Logging:** pino with ECS format
- **Tests:** Vitest with coverage
- **Lint:** ESLint (neostandard), Prettier

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| None required locally | Runs standalone with mock data and in-process sessions |
| Redis | Optional session cache |
| S3 (Floci) | Optional data files |

## How to run

```bash
npm ci
npm run build:frontend
npm run dev                  # port 3007 (override with PORT)
```

Docker: `docker run -p 3007:3007 defradigital/trade-imports-defra-id-stub`. Workspace stack (`stubs` profile, `docker/stack/stubs.compose.yml`) runs it with `SECURE_COOKIE=false` and `WELL_KNOWN_HOST_OVERRIDE=http://localhost:3007`. Consumers in the stack use `host.docker.internal:3007` for the well-known URL.

Port: **3007**
