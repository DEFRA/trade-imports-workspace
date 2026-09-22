# trade-imports-plants-backend

**Repo:** DEFRA/trade-imports-plants-backend

## Purpose

REST API microservice behind the high-risk plants import notification journey. It stores notifications in MongoDB and exposes them over an OpenAPI-documented HTTP API consumed by the plants frontend. It is a CDP-platform Spring Boot service, modelled on the animals backend but much smaller.

## Responsibilities

Owns:
- The notification aggregate (`NotificationAggregate`): status (`DRAFT`, `SUBMITTED`, `AMEND`, `DELETED`), concurrency token, created/updated/submitted timestamps, `expireAt`, the notification content, fulfilments, and submitted baselines used for amend.
- Reference number generation (`ReferenceNumberGenerator`; the latest commit adds an agreed plants type-code prefix).
- Notification lifecycle: save, replace content, copy, submit, amend, cancel-amend, soft-delete, hard-delete, list, fulfilment view.
- An audit trail of bulk deletions (`audit` collection).
- An optional scheduled sweep that deletes app-created notifications whose `expireAt` has passed (`notification.ttl.sweep.enabled`, off by default; ShedLock over Mongo).

Does NOT own:
- Journey UI, validation copy or flow: the plants frontend does.
- Reference data, addresses, identity.
- Outbound publishing: no outbox, no GBN-AG event publishing and no PIMS routing exist yet, and unlike the animals backend, no SQS, SNS or S3 code is present. This is a gap to close, not the intended end state: an outbox is planned for the plants backend, on the same pattern as the animals backend (see [`architecture-overview.md`](architecture-overview.md#known-gaps-and-inconsistencies)).
- Authentication: no auth or JWT dependency is in `pom.xml` and no security config was found. Unclear from code whether access control relies on the platform network.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-plants-frontend | REST, port 8091, `/notifications` (POST, PUT `/{ref}`, `/{ref}/copy`, `/submit`, `/amend`, `/cancel-amend`, `/soft-delete`, GET list, GET `/{ref}/fulfilments`, GET `/reference-numbers`, DELETE) | Notification CRUD and lifecycle |
| Inbound | trade-imports-animals-tests | HTTP via workspace stack | End-to-end tests |
| Outbound | MongoDB | Spring Data, database `trade-imports-plants-backend` | `notifications` aggregate and `audit` collections |
| Outbound | CloudWatch (EMF) | AWS embedded metrics to `AWS_EMF_AGENT_ENDPOINT` | Metrics |
| Outbound | AWS STS | AWS SDK v2 client bean in `AwsConfig` | Credentials; other usage Unclear from code |

OpenFeign is a dependency (with a logging config) but no Feign client was found in the source.

## Stack

- **Runtime:** Java 25, Spring Boot 3.5.5
- **Build tool:** Maven
- **API style:** REST (SpringDoc / OpenAPI)
- **Database:** MongoDB (Spring Data, transactions with commit retry)
- **Scheduling:** ShedLock (Mongo provider)
- **Mapping:** MapStruct, Lombok
- **Logging:** Logback, Elastic ECS; CDP request tracing (`x-cdp-request-id`)
- **Tests:** JUnit 5, Testcontainers (real MongoDB); Failsafe integration tests (`mvn verify`)
- **Coverage:** JaCoCo

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| MongoDB | Primary data store |
| Floci | AWS emulation in local compose (S3, SQS listed in README; not used by the code found) |
| Redis | Listed in compose; no use found in code |
| CloudWatch | Metrics |

## How to run

```bash
mvn spring-boot:run          # requires MongoDB
mvn verify                   # includes integration tests; mvn test skips them
docker compose --profile infra up -d       # MongoDB, Redis, Floci
docker compose --profile services up --build -d
```

Port: **8091**. Workspace stack service: `plants-backend`.
