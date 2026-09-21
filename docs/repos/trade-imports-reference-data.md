# trade-imports-reference-data

**Repo:** DEFRA/trade-imports-reference-data

## Purpose

REST microservice that serves reference data (countries and ports of entry) to the Trade Imports frontends. It fetches the data from MDM (Master Data Management), caches it in memory and returns a simplified, sorted view. Per ADR 0002 it is a shared service for several reference-data domains until one grows large enough to be extracted.

## Responsibilities

**Owns**
- The public read API: `GET /countries` (optional `blocks` query parameter) and `GET /ports-of-entry`, both returned sorted by name.
- Adaptation of MDM payloads to the service's own `Country` and `PortOfEntry` shapes.
- Business rules applied to MDM countries: GB (`effectiveAlpha2`) is removed, and when `blocks` is given only countries whose block of that name has `includeCountry` true are kept.
- Caching of MDM responses (Caffeine caches `MDM_COUNTRIES_CACHE` and `MDM_POE_CACHE`, TTL `CACHE_MDM_TTL_MINUTES`, default 60; empty results are not cached).
- MDM authentication: obtains and refreshes a client-credentials bearer token before MDM calls, and sends the subscription key and `system=GBNAG`.

**Does not own**
- The source of truth for the data: that is MDM. This service holds no reference data of its own; MongoDB is configured but no repository is used in `src/main`.
- Commodity codes and BCPs beyond ports of entry: ADR 0002 lists commodity codes as planned, not implemented.
- Notification, address or user data (see the backend, address-book and ins-backend services).
- Authentication of its own callers: no inbound auth was found in the controllers.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-animals-frontend | REST (`TRADE_IMPORTS_REFERENCE_DATA_URL`, default `http://localhost:8086`) | Countries (`services/countries/client.js`); the stack waits for this service before starting the frontend. |
| Inbound | trade-imports-ins-frontend, trade-imports-plants-frontend | REST (same config key) | Configured with the base URL; the compose files say countries and ports are primed at boot. Exact endpoints per consumer not checked. |
| Outbound | MDM (real, or `trade-imports-stub` locally) | REST via Feign, `GET /mdm/geo/countries`, `GET /mdm/trade/bcp/poes` | Source data. Header `Ocp-Apim-Subscription-Key`. URL from `MDM_SERVICE_URL`. |
| Outbound | Trade platform token endpoint (real, or the stub) | REST via Feign, OAuth2 client credentials, form POST | Bearer token for MDM. URL from `TRADE_PLATFORM_AUTH_URL`. |
| Outbound (config only) | MongoDB | Spring Data Mongo | Configured; no use in code found. |
| Outbound | CloudWatch EMF agent | Embedded metrics | Metrics. |

No use of this service by `trade-imports-animals-backend` was found in its `application.yml`.

## Stack

- **Runtime:** Java 25
- **Framework:** Spring Boot (web, actuator, validation, AOP, cache) with Spring Cloud OpenFeign
- **Build tool:** Maven
- **API docs:** SpringDoc OpenAPI
- **Caching:** Caffeine (in-memory)
- **Logging:** Logback with Elastic ECS format; AWS embedded metrics
- **Tests:** JUnit 5 with Testcontainers (no mocks, per README); JaCoCo minimum 65%
- **Health:** `GET /health`

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| MDM API and trade platform auth | Upstream data and tokens; `trade-imports-stub` locally |
| MongoDB | Configured (`MONGO_URI`); stack waits for it. Use in code unclear. |
| CloudWatch EMF endpoint | Metrics |

## How to run

```bash
mvn spring-boot:run          # port 8086; needs MongoDB and an MDM source (the stub on 8087 by default)
```

Workspace stack: `./scripts/stack/run-stack.sh` (service in the `backend` profile, `docker/stack/backend.compose.yml`). Use `-e reference-data` to run it from your IDE instead. The stack sets `MDM_SERVICE_URL` and `TRADE_PLATFORM_AUTH_URL` to the stub and waits for the stub to be healthy (optional).

Port: **8086**
