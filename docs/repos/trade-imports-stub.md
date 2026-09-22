# trade-imports-stub

**Repo:** DEFRA/trade-imports-stub

## Purpose

Stub service that mocks responses from third-party integrations for the Trade Imports project. Today it imitates two upstream surfaces: the Defra Trade platform OAuth2 token endpoint and the MDM (Master Data Management) API for countries and ports of entry. It is available locally and on the shared CDP environments.

## Responsibilities

**Owns**
- Canned MDM responses, held as static JSON fixtures in `src/main/resources/responses/` (`countriesResponse.json`, `portsOfEntryResponse.json`).
- A fake OAuth2 token endpoint that always succeeds.

**Does not own**
- No real reference data, no business logic and no persistence. Mongo is configured (`MongoConfig`) but no repository or Mongo template is used in `src/main`; its runtime role is unclear from code.
- No filtering: `system` and `blocks` query parameters are accepted and ignored, and the `Ocp-Apim-Subscription-Key` header is required but its value is not checked. The real filtering (removing `GB`, applying `blocks`) happens in `trade-imports-reference-data`, not here.
- No stub of Defra ID sign-in (see `trade-imports-defra-id-stub`).

**Upstreams imitated**

| Endpoint | Imitates | Fidelity |
|----------|----------|----------|
| `POST /tenant/oauth2/v2.0/token` | Trade platform (Azure AD style) client-credentials token endpoint | Low. Ignores the form body and returns a `Token` with `expiresOn` (epoch millis, now plus 3600s) and the value `stub-token`. |
| `GET /mdm/geo/countries` | MDM geo countries API | Shape only. Returns the fixed country list, including per-country `blocks`, plus an `x-ms-middleware-request-id: stub-trace-id` header. |
| `GET /mdm/trade/bcp/poes` | MDM trade BCP/ports-of-entry API | Shape only. Returns a fixed `MdmPortsResponse`, plus the same trace header. |

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-reference-data | REST (Feign client) | Fetches an access token, then countries and ports of entry. Confirmed by its `MDM_SERVICE_URL` and `TRADE_PLATFORM_AUTH_URL` settings, which point at port 8087 by default and in the workspace stack. |
| Outbound | None found | - | The controllers serve fixtures and make no outbound calls. |
| Outbound (config only) | MongoDB | Spring Data Mongo | Configured in `application.yml` (database `trade-imports-stub`) and the stack waits for it to be healthy; no code path that uses it was found. |
| Outbound (config only) | CloudWatch EMF agent | Embedded metrics | Metrics publishing via `AWS_EMF_AGENT_ENDPOINT`. |

No other repo in the workspace was found calling this service.

## Stack

- **Runtime:** Java 25
- **Framework:** Spring Boot 3.5.5 (web, actuator, validation, AOP, cache), plus Spring Cloud OpenFeign and WebFlux (present in `pom.xml`)
- **Build tool:** Maven
- **API docs:** SpringDoc OpenAPI
- **Logging:** Logback with Elastic ECS format; AWS embedded metrics
- **Tests:** JUnit 5 with Testcontainers
- **Other dependencies in `pom.xml`:** Caffeine, jjwt, AWS SDK (STS, Cognito Identity); no use of them was found in the stub controllers
- **Health:** `GET /health` (actuator base path is `/`)

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| MongoDB | Configured (`MONGO_URI`, `MONGO_DATABASE`); the workspace stack makes the stub wait for it. Use in code unclear. |
| CloudWatch EMF endpoint | Metrics (local default `http://localhost:4566`, the Floci emulator) |

## How to run

```bash
mvn spring-boot:run          # port 8087; needs MongoDB reachable at MONGO_URI
```

Workspace stack (published image, `stubs` profile): `./scripts/stack/run-stack.sh` from the workspace root. Use `-d` to build from local source with hot reload (DevTools). The compose service is `trade-imports-stub` in `docker/stack/stubs.compose.yml`, with `SPRING_PROFILES_ACTIVE=local` (Mongo SSL off).

Port: **8087**
