# trade-imports-reference-data

**Repo:** DEFRA/trade-imports-reference-data

## Purpose

REST microservice that serves reference data (countries, ports of entry and live-animal commodities) to the Trade Imports frontends. It fetches the data from MDM (Master Data Management), caches it in memory and returns a simplified, sorted view. Per ADR 0002 it is a shared service for several reference-data domains until one grows large enough to be extracted.

## Responsibilities

**Owns**
- The public read API: `GET /countries` (optional `blocks` query parameter) and `GET /ports-of-entry`, both returned sorted by name.
- Adaptation of MDM payloads to the service's own `Country` and `PortOfEntry` shapes.
- Business rules applied to MDM countries: GB (`effectiveAlpha2`) is removed, and when `blocks` is given only countries whose block of that name has `includeCountry` true are kept.
- Commodity search, `GET /commodities?search=&page=&size=` (size capped at 100): passes the term to MDM's product search over the `gbnag` dataset, keeps only codes in CN chapter 01 (live animals), and groups the species by code with at most `size` species in all. A term under two characters returns nothing without calling MDM. Not cached.
- Species check, `POST /commodities/species-check`: given draft lines of code and Latin name, returns the lines whose species MDM no longer lists under that code. Not cached.
- Caching of MDM responses (Caffeine caches `MDM_COUNTRIES_CACHE` and `MDM_POE_CACHE`, TTL `CACHE_MDM_TTL_MINUTES`, default 60; empty results are not cached).
- MDM authentication: obtains and refreshes a client-credentials bearer token before MDM calls, and sends the subscription key and `system=GBNAG`.

**Does not own**
- The source of truth for the data: that is MDM. This service holds no reference data of its own; MongoDB is configured but no repository is used in `src/main`.
- BCPs beyond ports of entry.
- How a search term matches: that is MDM's product search (see [MDM commodity search behaviour](#mdm-commodity-search-behaviour)).
- Notification, address or user data (see the backend, address-book and ins-backend services).
- Authentication of its own callers: no inbound auth was found in the controllers.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-animals-frontend | REST (`TRADE_IMPORTS_REFERENCE_DATA_URL`, default `http://localhost:8086`) | Countries (`services/countries/client.js`), commodity search and species check (`sets/live-animals/services/commodities/client.js`); the stack waits for this service before starting the frontend. |
| Inbound | trade-imports-ins-frontend, trade-imports-plants-frontend | REST (same config key) | Configured with the base URL; the compose files say countries and ports are primed at boot. Exact endpoints per consumer not checked. |
| Outbound | MDM (real, or `trade-imports-stub` locally) | REST via Feign, `GET /mdm/geo/countries`, `GET /mdm/trade/bcp/poes`, `GET /mdm/trade/product/search`, `GET /mdm/trade/product/commodities`, `GET /mdm/trade/product/commodities/{code}/species` | Source data. Header `Ocp-Apim-Subscription-Key`. URL from `MDM_SERVICE_URL`. |
| Outbound | Trade platform token endpoint (real, or the stub) | REST via Feign, OAuth2 client credentials, form POST | Bearer token for MDM. URL from `TRADE_PLATFORM_AUTH_URL`. |
| Outbound (config only) | MongoDB | Spring Data Mongo | Configured; no use in code found. |
| Outbound | CloudWatch EMF agent | Embedded metrics | Metrics. |

No use of this service by `trade-imports-animals-backend` was found in its `application.yml`.

## MDM commodity search behaviour

MDM's product search is an early-access API built on ITAHC data from TRACES. What follows was observed in TST in October 2026, from the responses saved in `trade-imports-stub` (`src/main/resources/responses/mdmProductSearchResponses.json`). Re-check it against TST before relying on it, as MDM may change it.

**What a search matches**

- **Common name**: "cattle" finds Bos taurus, Bos, Bibos spp., Bos sp. and Novibos spp. under 0102. It searches every common name a species has, not only the first: "cat" finds Bos taurus through its second name, "Aurochs".
- **Commodity code**: "0102" returns one commodity row holding all 15 of its species; "010" returns 45 rows. A code search is a prefix match.
- **Latin name**: "Bos taurus" finds Bos taurus under each code it sits under.
- **Commodity description**: "ostrich" returns the 01063300 commodity row ("Ostriches; emus") as well as the Struthio species, so Rhea, Emu and Cassowaries come back too.

**Partial terms**

- A term matches the start of a word: "cat" and "catt" find cattle; "tau" and "bos tau" find Bos taurus. "cat" also finds Felis, Catagonus and Catreus.
- Two-character terms are not consistent: "ca" returns 14 rows (Caiques, Cockatoos, Equus cabalus and others) but not cattle, goats (Capra) or dogs (Canis). Reference-data needs at least two characters and the frontend asks for three, so this only affects other callers.
- Punctuation must match exactly: "Bos spp." finds nothing, although "Bos sp." and "Bibos spp." exist.

**What comes back**

- Codes outside the live-animal chapter: the `gbnag` dataset lists species under animal-product codes too, such as 05111000 (bovine semen) and 05119985. A search for "cattle" returns Bos taurus under both. Reference-data drops every code outside chapter 01, so a page can hold fewer species than `size`, and `total` still counts the dropped rows.
- The same species under several live-animal codes: Bos taurus is under 0102 and 01061900. Each is a separate choice.
- Some species have no common name (Catagonus, Equus cabalus*asinus) and some carry placeholder ones ("Animals" for Poephagus spp., "Pig-deer?" for Babyrousa).
- Results come back in MDM's order, with no sort option. Species and commodity rows are mixed on one page, and a commodity row counts as one result however many species it holds.

These gaps were found during EUDPA-617 and need to go back to the MDM team.

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
