# trade-imports-plants-backend

**Repo:** DEFRA/trade-imports-plants-backend

## Purpose

REST API microservice behind the high-risk plants import notification journey. It stores notifications in MongoDB and exposes them over an OpenAPI-documented HTTP API consumed by the plants frontend. It is a CDP-platform Spring Boot service, modelled on the animals backend but much smaller.

## Responsibilities

Owns:
- The notification aggregate (`NotificationAggregate`): status (`DRAFT`, `SUBMITTED`, `AMEND`, `DELETED`), concurrency token, created/updated/submitted timestamps, `expireAt`, the notification content, fulfilments, and submitted baselines used for amend.
- Reference number generation (`ReferenceNumberGenerator`): `GBN-HRP-<yy>-<XXXXXX>`, where `<yy>` is the two-digit year and `<XXXXXX>` is 6 random Crockford base32 characters. Controllers check path references against `REFERENCE_NUMBER_PATTERN`.
- Notification lifecycle: save, replace content, copy, submit, amend, cancel-amend, soft-delete, hard-delete, list, fulfilment view.
- An audit trail of bulk deletions (`audit` collection).
- Optional non-prod expiry: a Mongo TTL index removes app-created notifications whose `expireAt` has passed (`notification.ttl.expiry.enabled`, off by default).

Does NOT own:
- Journey UI, validation copy or flow: the plants frontend does.
- Reference data, addresses, identity.
- Outbound publishing: no outbox, no GBN-AG event publishing and no PIMS routing exist yet, and unlike the animals backend, no SQS, SNS or S3 code is present. This is a gap to close, not the intended end state: an outbox is planned for the plants backend, on the same pattern as the animals backend (see [`architecture-overview.md`](architecture-overview.md#known-gaps-and-inconsistencies)).
- Authentication: no auth or JWT dependency is in `pom.xml`. Trader notification routes trust the caller's `Trade-Imports-Organisation-Id` header for tenant scoping (400 when missing or blank); `GET /notifications/reference-numbers` and bulk `DELETE /notifications` are unscoped admin routes.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-plants-frontend | REST, port 8091, `/notifications` (trader routes require `Trade-Imports-Organisation-Id`; unscoped: GET `/reference-numbers`, bulk DELETE) | Notification CRUD and lifecycle |
| Inbound | trade-imports-ins-tests | HTTP via workspace stack | End-to-end tests (the `plants` domain) |
| Outbound | MongoDB | Spring Data, database `trade-imports-plants-backend` | `notification` (the `NotificationAggregate`) and `audit` collections |
| Outbound | CloudWatch (EMF) | AWS embedded metrics to `AWS_EMF_AGENT_ENDPOINT` | Metrics |
| Outbound | AWS STS | AWS SDK v2 client bean in `AwsConfig` | Credentials; other usage Unclear from code |

OpenFeign is a dependency (with a logging config) but no Feign client was found in the source.

## Stack

- **Runtime:** Java 25, Spring Boot 3.5.5
- **Build tool:** Maven
- **API style:** REST (SpringDoc / OpenAPI)
- **Database:** MongoDB (Spring Data, transactions with commit retry)
- **Mapping:** MapStruct, Lombok
- **Logging:** Logback, Elastic ECS; CDP request tracing (`x-cdp-request-id`)
- **Tests:** JUnit 5, Testcontainers (real MongoDB); Failsafe integration tests (`mvn verify`)
- **Coverage:** JaCoCo

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| MongoDB | Primary data store |
| Floci | AWS emulation in local compose. Its set-up script (`compose/floci/start.d/10-setup-resources.sh`) creates no resources, and the code uses no S3 or SQS |
| CloudWatch | Metrics |

## How to run

```bash
docker compose up -d mongodb floci                     # infrastructure only
mvn spring-boot:run -Dspring-boot.run.profiles=local   # against that local MongoDB
mvn verify                                             # includes integration tests; mvn test skips them
docker compose up --build -d                           # infrastructure and the service
```

`compose.yml` has three services, `floci`, `mongodb` and `trade-imports-plants-backend`, and no profiles. The default profile turns on MongoDB SSL (`spring.data.mongodb.ssl.enabled: true`), so a local run needs the `local` profile, which turns it off. `docker/dev-run.sh` passes it too.

Port: **8091**. Workspace stack service: `plants-backend`.
