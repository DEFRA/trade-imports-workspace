# trade-imports-ins-backend

**Repo:** DEFRA/trade-imports-ins-backend

## Purpose

Aggregates notification events into a cross-journey read model for the Import Notification Service (INS). It consumes notification events from an SQS FIFO queue, upserts a flattened summary per notification into MongoDB, and serves a read-only REST query API used by the INS dashboard. The README is still the CDP Java backend template text; this description is drawn from `src/` and `floci/`.

## Responsibilities

**Owns**

- The `notifications` collection in the `trade-imports-ins-backend` MongoDB database: one `AggregatedNotification` per aggregate id (`aggregateVersion`, `referenceNumber`, `status`, `originCountry`, `commodity`, `arrivalDate`, `lastUpdated`).
- Event ingestion: an SQS listener validates the message (FIFO message group id is the aggregate id, JSON body, known `eventType`) and upserts. The upsert is a single atomic operation that applies only when the incoming `aggregateVersion` is higher than the stored one, so out-of-order or redelivered events converge.
- Read API `GET /notifications` with `page` (1-based), `sort` (`arrivalDate` or `lastUpdated`, asc/desc; default `arrivalDate,desc`) and exact `referenceNumber` match. Notifications with status `DELETED` are excluded.
- Retry versus dead-letter classification of bad messages (`SqsRetryableException`, `SqsNonRetryableException`).

**Does not own**

- The notification source of truth or its event publication. Events originate elsewhere (see Integrations); this service only reads them, and its data is derived and read-only.
- Any write API. The only controller is `AggregatedNotificationController` (GET).
- Organisation scoping: the stored model has no organisation id and the list is unscoped (ins-frontend notes this is deferred to a later ticket).
- Authentication: no Spring Security dependency was found in the pom; no auth filter in `src/main` (Unclear from code whether it relies on network policy).
- Address data (address-book) and reference data.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | SQS FIFO queue `trade_imports_animals_eu_notifications_ins_backend.fifo` (`NOTIFICATION_SQS_QUEUE_URL`) | AWS SQS via Spring Cloud AWS `@SqsListener` | Receive notification lifecycle events (Created, Edited, Submitted, SubmissionAmended, AmendmentRequested, AmendmentCancelled, Deleted, SubmissionDeleted) |
| Inbound (upstream of the queue) | SNS FIFO topic `trade_imports_animals_eu_notifications.fifo`, subscribed to the queue with raw message delivery | SNS to SQS | Fan-out. The animals-backend compose script creates this topic for its outbox relay; the publisher is most likely trade-imports-animals-backend (Unclear from this repo alone) |
| Inbound | trade-imports-ins-frontend | REST `GET /notifications` | Dashboard notification list |
| Outbound | MongoDB | Spring Data MongoDB / `MongoTemplate` | Upsert and query aggregated notifications |
| Outbound | CloudWatch | AWS Embedded Metrics (EMF) | Metrics, including the `notification.ins.sqs.messages` counter |

The pom includes Spring Cloud OpenFeign and a `RestClient` with trace-id propagation, but no `@FeignClient` or outbound service call was found in `src/main`. The message body uses an `exchangedDocument` / `specifiedConsignment` structure (fields such as `notificationStatusCode`, `issueDateTime`, `originCountry`); the schema itself is not defined in this repo.

## Stack

- **Runtime:** Java 25
- **Framework:** Spring Boot (web, data-mongodb, actuator, validation, AOP), virtual threads enabled
- **Messaging:** Spring Cloud AWS SQS starter
- **Build tool:** Maven
- **API style:** REST, SpringDoc OpenAPI
- **Database:** MongoDB (compound index `status_sort_fields`)
- **Logging/metrics:** Logback with Elastic ECS format; Micrometer and `aws-embedded-metrics`
- **Tests:** JUnit 5 + Testcontainers (MongoDB, Floci, MockServer)
- **Coverage:** JaCoCo (65% minimum)

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| MongoDB | Read-model store (`MONGO_URI`, `MONGO_DATABASE`; read preference `secondary` by default) |
| AWS SQS + SNS | Event delivery; Floci emulates them locally (`floci/setup-ins-backend-pipeline.sh` creates the topic, queue and subscription) |
| CloudWatch | Metrics |
| Redis | In the template `compose.yml`; no use in this service's code was found |

## How to run

```bash
docker compose --profile infra up -d     # MongoDB, Floci, Redis
mvn spring-boot:run
mvn clean verify                         # unit and Testcontainers integration tests
```

Full repo stack: `docker compose --profile services up --build -d`. Workspace stack: `./scripts/stack/run-stack.sh`.

Port: **8090** (`PORT`).
