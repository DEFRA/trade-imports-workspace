# trade-imports-animals-backend

**Repo:** DEFRA/trade-imports-animals-backend

## Purpose

REST API microservice providing business logic and data persistence for the trade imports animals service. Handles notification management, audit trail recording, accompanying document uploads and publishing notification events. Exposes an OpenAPI-documented HTTP API consumed by the frontend and admin services.

## Stack

- **Runtime:** Java (Amazon Corretto)
- **Framework:** Spring Boot
- **Build tool:** Maven
- **API style:** REST (SpringDoc / OpenAPI / Swagger)
- **Auth:** there is no JWT code in `src/main` (jjwt and nimbus are in `pom.xml` only). Trader notification routes trust the caller's `Trade-Imports-Organisation-Id` header for tenant scoping (400 when missing or blank). `AdminSecretFilter` guards `DELETE /notifications*` and `POST /notifications/{ref}/replay` with the shared-secret header `Trade-Imports-Animals-Admin-Secret` (`admin.secret`, from `TRADE_IMPORTS_ANIMALS_ADMIN_SECRET`). `GET /notifications/reference-numbers` and `GET /notifications/{ref}/outbox-events` need no organisation header and are not behind the secret.
- **Database:** MongoDB (Spring Data), written in transactions
- **Caching:** Caffeine (in-memory)
- **AWS integration:** S3 (`S3DocumentService`), SNS (`OutboxPublishService`) and CloudWatch metrics, through the AWS SDK v2 clients in `AwsConfig`. The STS and Cognito SDKs are in `pom.xml` but unused, and there is no SQS client in `src/main`.
- **Logging:** Logback with Elastic ECS format; CloudWatch embedded metrics
- **Tests:** JUnit 5. `mvn test` runs the `*Test` unit tests, several of which use Mockito. `mvn verify` also runs the `*IT` integration tests under Failsafe, with Testcontainers (MongoDB, Floci and MockServer).
- **Coverage:** JaCoCo (65% minimum enforced)

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| MongoDB | Primary data store. Must be a replica set (`--replSet rs0`), because the service writes in transactions |
| S3 | Downloads accompanying documents from cdp-uploader's documents bucket; Floci locally |
| SNS | Outbox events go to an SNS FIFO topic; Floci locally |
| CloudWatch | Metrics and observability |

The service does not use Redis. The workspace stack's infrastructure profile runs Redis for cdp-uploader.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-animals-frontend | REST, port 8085, `/notifications` (trader routes require `Trade-Imports-Organisation-Id`) and the document upload routes | Notification CRUD, lifecycle and accompanying documents |
| Inbound | trade-imports-animals-admin | REST, with `Trade-Imports-Animals-Admin-Secret` on delete and replay | List reference numbers and outbox events, delete notifications, replay outbox events |
| Inbound | cdp-uploader | `POST /document-uploads/{pathSegment}/scan-results`, unauthenticated | Virus scan result callback |
| Inbound | trade-imports-ins-tests | HTTP via workspace stack | End-to-end tests (the `animals` domain) |
| Outbound | cdp-uploader's S3 documents bucket | AWS SDK S3 client | Download a clean accompanying document |
| Outbound | SNS FIFO topic `trade_imports_animals_eu_notifications.fifo` (`OUTBOX_SNS_TOPIC_ARN`) | Outbox poller and `OutboxPublishService` | Publish notification events. trade-imports-dynamics-gateway consumes them |

## How to run

From the workspace root, the repo has no compose file of its own:

```bash
tim docker up                                              # the whole stack, published images
tim docker dev                                             # the whole stack, built from local source
tim docker up --profile database --profile infrastructure  # only the database and infrastructure profiles
```

To run the service on its own against that infrastructure:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Without the `local` profile it fails at start-up: `TRADE_IMPORTS_ANIMALS_BACKEND_BASE_URL` is blank, and `CdpConfig` requires it.

Port: **8085**
