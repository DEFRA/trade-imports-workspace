# trade-imports-ins-backend

**Repo:** DEFRA/trade-imports-ins-backend

## Purpose

Aggregates notification events into a cross-journey read model for the Import Notification Service (INS). It consumes notification events from an SQS FIFO queue, upserts a flattened summary per notification into MongoDB, and serves a read-only REST query API used by the INS dashboard. In the `dev` and `local` profiles it also serves an address lookup for the INS frontend. The repo's `docs/architecture.md` describes notification upserts and the address lookup.

## Responsibilities

**Owns**

- The `notifications` collection in the `trade-imports-ins-backend` MongoDB database: one `AggregatedNotification` per aggregate id (`aggregateVersion`, `referenceNumber`, `organisationId`, `status`, `originCountry`, `originCountrySubdivisionCode`, `commodity`, `arrivalDate`, `lastUpdated`).
- Event ingestion: an SQS listener validates the message (FIFO message group id is the aggregate id, JSON body, known `eventType`) and upserts. The upsert is a single atomic operation that applies only when the incoming `aggregateVersion` is higher than the stored one, so out-of-order or redelivered events converge.
- Read API `GET /notifications` with `page` (1-based), `sort` (`arrivalDate` or `lastUpdated`, asc/desc; default `arrivalDate,desc`), exact `referenceNumber` match, and required header `Trade-Imports-Organisation-Id` (caller organisation; `TraderOrganisationHeaderFilter` refuses a request without it). Lists and reference searches return only that organisation's notifications. Notifications with status `DELETED` are excluded.
- Index maintenance at start-up (`AggregatedNotificationIndexMaintenance`): it drops the legacy `status_sort_fields` index, and deletes notifications that have no `organisationId` (`notification.delete-missing-organisation-id-at-startup`, default `true`).
- Retry versus dead-letter classification of bad messages (`SqsRetryableException`, `SqsNonRetryableException`).
- Address lookup, `dev` and `local` profiles only: `GET /address-lookup` (`AddressLookupController`) searches the DEFRA address lookup API by postcode or free text.

**Does not own**

- The notification source of truth or its event publication. Events originate elsewhere (see Integrations); this service only reads them, and its data is derived and read-only.
- Any write API for notifications. `AggregatedNotificationController` serves only `GET`.
- Inbound authentication. The pom has `spring-security-oauth2-client` and `spring-security-config`, but only for the outbound address lookup token chain. Web security is switched off (`spring.autoconfigure.exclude`, guarded by `NoWebSecurityIT`), so the service relies on the organisation header and network policy.
- Address data (address-book) and reference data.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | SQS FIFO queue `trade_imports_animals_eu_notifications_ins_backend.fifo` (`NOTIFICATION_SQS_QUEUE_URL`) | AWS SQS via Spring Cloud AWS `@SqsListener` | Receive notification lifecycle events (Created, Edited, Submitted, SubmissionAmended, AmendmentRequested, AmendmentCancelled, Deleted, SubmissionDeleted) |
| Inbound (upstream of the queue) | SNS FIFO topic `trade_imports_animals_eu_notifications.fifo`, subscribed to the queue with raw message delivery | SNS to SQS | Fan-out. trade-imports-animals-backend publishes its outbox events to this topic |
| Inbound | trade-imports-ins-frontend | REST `GET /notifications` | Dashboard notification list |
| Inbound | trade-imports-ins-frontend (dev and local only) | REST `GET /address-lookup` | The address lookup spike page |
| Outbound | MongoDB | Spring Data MongoDB / `MongoTemplate` | Upsert and query aggregated notifications |
| Outbound | AWS STS (dev and local only) | `GetWebIdentityToken` | Mints the JWT that Entra takes as a client assertion |
| Outbound | Microsoft Entra ID (dev and local only) | OAuth2 `client_credentials` with that assertion; no client secret | Access token for the address lookup |
| Outbound | DEFRA address lookup API (dev and local only) | `RestClient` (`AddressLookupClient`) with the bearer token | Address search |
| Outbound | CloudWatch | AWS Embedded Metrics (EMF) | Metrics, including the `notification.ins.sqs.messages` counter |

Locally, the address lookup, Entra and STS calls go to the trade-imports-stub simulators: 8087 for address lookup and Entra, 8098 for STS. Spring Cloud OpenFeign is in the pom but unused. The message body uses an `exchangedDocument` / `specifiedConsignment` structure (fields such as `notificationStatusCode`, `issueDateTime`, `originCountry`); the schema itself is not defined in this repo.

## Stack

- **Runtime:** Java 25
- **Framework:** Spring Boot 3.5.5 (web, data-mongodb, actuator, validation, AOP), virtual threads enabled
- **Messaging:** Spring Cloud AWS SQS starter
- **Build tool:** Maven
- **API style:** REST, SpringDoc OpenAPI
- **Database:** MongoDB (compound index `organisation_status_sort_fields`: `organisationId`, `status`, `arrivalDate` desc, `lastUpdated` desc)
- **Logging/metrics:** Logback with Elastic ECS format; Micrometer and `aws-embedded-metrics`
- **Tests:** JUnit 5. `IntegrationBase` starts MongoDB and Floci Testcontainers. The MockServer dependencies are in the pom, but no test uses them.
- **Coverage:** JaCoCo (65% minimum)

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| MongoDB | Read-model store (`MONGO_URI`, `MONGO_DATABASE`; read preference `secondary` by default) |
| AWS SQS + SNS | Event delivery; Floci emulates them locally (`floci/setup-ins-backend-pipeline.sh` creates the topic, queue and subscription) |
| CloudWatch | Metrics |

## How to run

The repo's `compose.yml` has three services, `floci`, `mongodb` and `trade-imports-ins-backend`, and no profiles:

```bash
docker compose up -d mongodb floci       # infrastructure only
mvn spring-boot:run                      # the profile comes from ENVIRONMENT, default local
mvn clean verify                         # unit and Testcontainers integration tests
```

`docker compose up --build -d` runs the service as well. Workspace stack: `tim docker up`, with `-e ins-backend` to run it natively.

Port: **8090** (`PORT`).
