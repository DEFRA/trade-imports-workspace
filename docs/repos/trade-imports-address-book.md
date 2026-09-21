# trade-imports-address-book

**Repo:** DEFRA/trade-imports-address-book

## Purpose

Org-scoped address book API for EUDP Live Animals (EUDPA-58). Each organisation owns a flat list of addresses (the Standard Address Block). Addresses are created, listed, searched, updated and soft-deleted over REST. Per the workspace repo map, it is the system of record for Standard Address Block records.

## Responsibilities

**Owns**

- The `addresses` collection in the `trade-imports-address-book` MongoDB database (name, address lines, town/city, county, postcode, `countryCode`, phone, email, status, audit timestamps).
- CRUD, search (`q`, `countryCode`) and 1-based pagination (server-set page size, default 25) for addresses, all scoped by organisation id.
- Soft delete: a delete flips internal `status` to `DELETED`; tombstones stay fetchable by id with `deleted: true` and are excluded from lists.
- The locked OpenAPI contract (`docs/openapi/api-contract.locked.yaml`, `operators.yml`), checked on every `mvn verify`.

**Does not own**

- Authentication. There is no Spring Security layer and no JWT or API key validation. The caller (CDP ingress or a BFF such as ins-frontend) must authenticate the user, strip any client-supplied `Trade-Imports-Organisation-Id` and set it from the verified session. Network policy must block direct access.
- Country display names. `countryCode` is stored as a 2-character ISO code exactly as supplied; names come from reference-data or the frontend.
- Any UI, and any consumption of addresses by notification journeys (Unclear from code: no caller other than the header contract is referenced in this repo).

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | ins-frontend (named in README as an example BFF caller) | REST, `/organisation/{orgId}/addresses`, header `Trade-Imports-Organisation-Id` | Address-book UI reads and writes addresses |
| Inbound | Any other trusted caller behind CDP ingress | REST | Same API; no per-caller identity is checked |
| Outbound | MongoDB | Spring Data MongoDB | Persist addresses (`addresses` collection, compound index `org_status_created`) |
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

Workspace stack: `./scripts/stack/run-stack.sh` (`--profile database --profile infrastructure` for its dependencies only).

Port: **8089**. Health: `GET /health`. Swagger UI at `/swagger-ui.html` under the `local` profile.
