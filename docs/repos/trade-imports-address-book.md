# trade-imports-address-book

**Repo:** DEFRA/trade-imports-address-book

## Purpose

Org-scoped address book API for EUDP Live Animals (EUDPA-58). Each organisation owns a flat list of addresses (the Standard Address Block) and a list of transporters. Both are created, listed, searched, updated and soft-deleted over REST. Per the workspace repo map, it is the system of record for Standard Address Block records.

## Responsibilities

**Owns**

- The `addresses` collection in the `trade-imports-address-book` MongoDB database (name, address lines, town/city, county, postcode, `countryCode`, `roles`, phone, email, status, audit timestamps). `roles` is required on create and update and holds at least one of the six roles. The service refuses roles from more than one group (place of origin and consignor; consignee, importer and place of destination; branch address). It stores no address type: that grouping is the INS frontend's.
- CRUD, list filtering and 1-based pagination, all scoped by organisation id. The list takes `q`, `countryCode`, `searchRole`, `role`, `page` and `pageSize`. The search group matches with OR: `q` over name, address lines, town or city, county and postcode, `countryCode` (repeatable) and `searchRole` (repeatable). `role` (repeatable) narrows that group (AND) to the addresses holding any of the given roles. `page` starts at 1, and `pageSize` runs from 1 to 100, default 25.
- The `transporters` collection and the routes under `/organisation/{orgId}/transporters` (create, list, fetch, update, soft delete), with the same organisation header and pagination as addresses. A transporter carries the Standard Address Block fields, a `type` of `PRIVATE` or `COMMERCIAL` and, for a commercial transporter only, an `approvalNumber`. A commercial transporter's `countryCode` must be `GB-NIR` (Northern Ireland). It holds no `roles`. The list takes `q` (which also searches `approvalNumber`), `countryCode`, `type` (narrows the list) and `searchType` (matches as part of the search), as well as `page` and `pageSize`. The repo README's "Transporters" section has the detail.
- Soft delete: a delete flips internal `status` to `DELETED`; tombstones stay fetchable by id with `deleted: true` and are excluded from lists.
- Address expiry outside production. With `ADDRESS_TTL_DAYS` set, each new address gets an internal `expireAt`. With `ADDRESS_TTL_EXPIRY_ENABLED=true`, a MongoDB TTL index removes addresses once it has passed. Neither happens when `ENVIRONMENT` is `prod`. See the README's "Address expiry" section.
- The locked OpenAPI contract (`docs/openapi/api-contract.locked.yaml`, `addresses.yml`), checked on every `mvn verify`.

**Does not own**

- Authentication. There is no Spring Security layer and no JWT or API key validation. The caller (CDP ingress or a BFF such as ins-frontend) must authenticate the user, strip any client-supplied `Trade-Imports-Organisation-Id` and set it from the verified session. Network policy must block direct access.
- Country display names. `countryCode` is stored as a 2-character ISO code exactly as supplied; names come from reference-data or the frontend.
- Any UI. The INS frontend's address book pages and the animals and plants frontends' journeys are the callers (see Integrations).

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-ins-frontend | REST, `/organisation/{orgId}/addresses` and `/transporters`, header `Trade-Imports-Organisation-Id` | Address-book UI reads and writes addresses and transporters |
| Inbound | trade-imports-animals-frontend | REST, `/addresses` and `/transporters` | The journey's address pickers and transporters |
| Inbound | trade-imports-plants-frontend | REST, `/addresses` | The journey's address pickers |
| Inbound | Any other trusted caller behind CDP ingress | REST | Same API; no per-caller identity is checked |
| Outbound | MongoDB | Spring Data MongoDB | Persist addresses (`addresses` collection, compound index `org_status_created`) and transporters (`transporters` collection) |
| Outbound | CloudWatch | AWS Embedded Metrics (EMF) | Publish metrics (Floci emulates it locally) |

No outbound HTTP calls to other services were found in `src/main`. The pom includes AWS SDK STS and Cognito Identity, but no code in this repo was seen using them for business calls (Unclear from code).

## Stack

- **Runtime:** Java 25 (Corretto recommended)
- **Framework:** Spring Boot 3.5.5 (web, data-mongodb, actuator, validation, AOP)
- **Build tool:** Maven
- **API style:** REST, JSON camelCase, RFC 9457 `application/problem+json` errors; SpringDoc OpenAPI (enabled only under the `local` profile)
- **Mapping:** MapStruct, Lombok
- **Database:** MongoDB
- **Logging/metrics:** Logback with Elastic ECS format; Micrometer and `aws-embedded-metrics`
- **Tests:** JUnit 5 + Testcontainers (real MongoDB, no mocks)
- **Coverage:** JaCoCo (65% minimum)

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| MongoDB 7 | Primary data store (`MONGO_URI`, `MONGO_DATABASE`) |
| Floci | Local AWS emulation (CloudWatch EMF endpoint); dev only |
| CDP ingress / network policy | Enforces the trusted-header boundary in deployed environments |

## How to run

```bash
docker compose up --build -d        # Floci, MongoDB and the service, hot reload
```

Natively (MongoDB running):
```bash
export SPRING_PROFILES_ACTIVE=local MONGO_URI=mongodb://localhost:27017
mvn spring-boot:run
```

Workspace stack: `tim docker up` (`--profile database --profile infrastructure` for its dependencies only).

Port: **8089**. Health: `GET /health`. Swagger UI at `/swagger-ui.html` under the `local` profile.
