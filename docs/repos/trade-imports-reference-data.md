# trade-imports-reference-data

**Repo:** DEFRA/trade-imports-reference-data

## Purpose

REST microservice that serves reference data (countries, ports of entry and live-animal commodities) to the Trade Imports frontends. It fetches the data from MDM (Master Data Management). Countries and ports of entry are cached in memory and returned as a simplified, sorted view; commodity search and the species check are not cached and come back in MDM's order. Per ADR 0002 it is a shared service for several reference-data domains until one grows large enough to be extracted.

## Responsibilities

**Owns**
- The public read API: `GET /countries` (optional `blocks` query parameter) and `GET /ports-of-entry`, both returned sorted by name.
- Adaptation of MDM payloads to the service's own `Country`, `PortOfEntry`, `CommodityGroup`, `CommoditySpecies`, `CommoditySearchResponse` and `SpeciesCheckResponse` shapes.
- Business rules applied to MDM countries: GB (`effectiveAlpha2`) is removed, and when `blocks` is given only countries whose block of that name has `includeCountry` true are kept.
- Commodity search, `GET /commodities?q=&page=&size=` (size from 1 to 100, defaulting to 100, and page from 0; any other value is refused with a 400): passes the term to MDM's product search over the `gbnag` dataset, leaves out every code MDM's commodities endpoint flags `isGerminal: true` (there is no CN chapter filter), and groups the species by code with at most `size` species in all. `total` is the non-germinal distinct species count from the MDM page. A term under two characters returns nothing without calling MDM. Not cached.
- Species check, `POST /commodities/species-check`: given draft lines of code and Latin name, returns the lines whose species MDM no longer lists under that code. A line with a missing code or Latin name is a 400 without calling MDM. Not cached.
- Caching of MDM responses (Caffeine caches `MDM_COUNTRIES_CACHE` and `MDM_POE_CACHE`, TTL `CACHE_MDM_TTL_MINUTES`, default 60; empty results are not cached).
- MDM authentication: obtains and refreshes a client-credentials bearer token before MDM calls, and sends the subscription key and `system=GBNAG` on geo and port calls, and `dataset=gbnag` (no `system`) on product calls.

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

**Two kinds of row**

MDM `/search` answers with `resultType` `species` or `commodity`, mixed on one page. A species row is one species under one code (`commodityCnCode`). A commodity row is one code, with its species nested as `scientificNames`, and counts as one result however many names it holds. The nested list on a commodity search row is not the full species catalogue: `01061900` nested 100 names on the search row when `GET /mdm/trade/product/commodities/01061900/species` holds 1,234. The captures that show this are the keys `cattle`, `Bos taurus`, `0102`, `01061900`, `010` and `ostrich` in `trade-imports-stub`'s `mdmProductSearchResponses.json`. Reference-data flattens both kinds of row into groups of Latin names, so the trader's page looks the same.

**What a search matches**

- **Species common name** (`cattle`): species rows. The capture has eight: five cattle species under 0102, then Bos taurus again under 01061900 and two germinal codes.
- **Latin name** (`Bos taurus`, `tau`): species rows. One row per code that lists that species.
- **Commodity code** (`0102`): one commodity row, species nested. A code is a prefix (`010` returns 45 commodity rows).
- **Commodity description** (`ostrich`, `horse`): mixed. Species rows plus a commodity row, so the nested species of that commodity come back too.

**Partial terms**

- A term matches the start of a word: "cat" and "catt" find cattle; "tau" and "bos tau" find Bos taurus. "cat" also finds Felis, Catagonus and Catreus.
- Two-character terms are not consistent: "ca" returns 14 rows (Caiques, Cockatoos, Equus cabalus and others) but not cattle, goats (Capra) or dogs (Canis). Reference-data needs at least two characters and the frontend asks for three, so this only affects other callers.
- Punctuation must match exactly: "Bos spp." finds nothing, although "Bos sp." and "Bibos spp." exist.

**What comes back**

- Germinal codes: the `gbnag` dataset lists species under germinal codes too, such as 05111000 (bovine semen) and 05119985. A search for "cattle" returns Bos taurus under both. Species rows carry no germinal flag, so reference-data asks `GET /mdm/trade/product/commodities` once, with every code on the page, and drops the codes it flags `isGerminal: true`. A page can then hold fewer species than `size`, and `total` is the non-germinal distinct species count from that MDM page.
- MDM does not yet set `isGerminal` on these codes in TST, so 05111000, 05119985 and other germinal codes still show in search results until MDM populates the flag. `trade-imports-stub` flags them, so the stack shows the filter working.
- MDM has proposed replacing `isGerminal` with a `germinal` object, present only on germinal codes. Reference-data checks the flag in one method, `CommoditySearchService.isGerminal`, so that change touches only its body (`germinal != null`).
- The same species under several live-animal codes: Bos taurus is under 0102 and 01061900. Each is a separate choice.
- Some species have no common name (Catagonus, Equus cabalus*asinus) and some carry placeholder ones ("Animals" for Poephagus spp., "Pig-deer?" for Babyrousa).
- Results come back in MDM's order, with no sort option.

The gaps found during EUDPA-617 are recorded as the MDM follow-ups on the EUDPA-617 ticket.

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
