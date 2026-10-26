# trade-imports-stub

**Repo:** DEFRA/trade-imports-stub

## Purpose

Stub service that mocks responses from third-party integrations for the Trade Imports project. Today it imitates two upstream surfaces: the Defra Trade platform OAuth2 token endpoint and the MDM (Master Data Management) API for countries, ports of entry, product search, commodities and commodity species. It is available locally and on the shared CDP environments.

## Responsibilities

**Owns**
- Canned MDM responses, held as static JSON fixtures in `src/main/resources/responses/` (`countriesResponse.json`, `portsOfEntryResponse.json`, `mdmProductSearchResponses.json`, `mdmProductSpeciesResponses.json`, `mdmProductCommoditiesResponses.json`). The countries and ports files are MDM's own responses, captured once from MDM and served whole, with every value MDM masks left out rather than guessed; that capture came in with [DEFRA/trade-imports-stub#18](https://github.com/DEFRA/trade-imports-stub/pull/18), and `workareas/shared/design-release-2-1/mdm/regenerate/*.jq` rebuild them from the raw captures in `workareas/shared/design-release-2-1/mdm/captures/raw/`. The three product files were saved from TST in October 2026 with [DEFRA/trade-imports-stub#26](https://github.com/DEFRA/trade-imports-stub/pull/26); the only values changed are `isGerminal` on `05111000` and `05119985`, set to `true` by hand.
- A fake OAuth2 token endpoint that always succeeds.

**Does not own**
- No real reference data, no business logic and no persistence. Mongo is configured (`MongoConfig`) but no repository or Mongo template is used in `src/main`; its runtime role is unclear from code.
- Little filtering: the countries call keeps the records that carry the `blocks` block, whatever `includeCountry` says, which is what one capture of MDM showed. That capture holds the `GBNAG_SPS_EX` membership only, so any other block answers an empty list. `system` is accepted and ignored, and the `Ocp-Apim-Subscription-Key` header is required but its value is not checked. Removing `GB` happens in `trade-imports-reference-data`, not here.
- No stub of Defra ID sign-in (see `trade-imports-defra-id-stub`).

**Upstreams imitated**

| Endpoint | Imitates | Fidelity |
|----------|----------|----------|
| `POST /tenant/oauth2/v2.0/token` | Trade platform (Azure AD style) client-credentials token endpoint | Low. Ignores the form body and returns a `Token` with `expiresOn` (epoch millis, now plus 3600s) and the value `stub-token`. |
| `GET /mdm/geo/countries` | MDM geo countries API | One capture. Returns the records captured once from MDM, whole (all 250 countries unfiltered, 32 for `GBNAG_SPS_EX`, the only block captured), plus an `x-ms-middleware-request-id: stub-trace-id` header. Not checked against MDM since the capture. |
| `GET /mdm/trade/bcp/poes` | MDM trade BCP/ports-of-entry API | One capture. Returns the 78 port records captured once from MDM, whole, each with its `traffic`, address and status, plus the same trace header. Not checked against MDM since the capture. |
| `GET /mdm/trade/product/search` | MDM product search | Responses saved from MDM in TST, keyed by search term. A term not saved finds nothing, a later page is empty with the saved total, and a `q` shorter than two characters answers 400. |
| `GET /mdm/trade/product/commodities` | MDM commodities by code | The saved commodity for each known code in `codes`, in the order asked. TST does not set `isGerminal` yet, so the fixture sets it to `true` for `05111000` and `05119985`. |
| `GET /mdm/trade/product/commodities/{code}/species` | MDM species of one commodity | Responses saved from MDM in TST, one body per page. An unknown code answers an empty page. |

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-reference-data | REST (Feign client) | Fetches an access token, then countries, ports of entry, product search results, commodities and commodity species. Confirmed by its `MDM_SERVICE_URL` and `TRADE_PLATFORM_AUTH_URL` settings, which point at port 8087 by default and in the workspace stack. |
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
