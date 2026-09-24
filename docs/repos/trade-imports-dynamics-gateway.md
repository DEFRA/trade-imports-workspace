# trade-imports-dynamics-gateway

**Repo:** DEFRA/trade-imports-dynamics-gateway

## Purpose

Centralised gateway that forwards notification events to Azure Service Bus (ASB) for downstream Dynamics/PIMS processing. The primary path consumes events from an SQS FIFO queue, maps them to the PIMS event shape and publishes them to an ASB session queue. A secondary `POST /events` endpoint and a DLQ operator API sit alongside it.

## Responsibilities

**Owns:**
- The SQS-to-ASB hop: consuming the notification SQS FIFO queue and publishing to ASB (queue taken from the `EntityPath` in the connection string).
- Filtering: only `uk.gov.defra.imports.notification.NotificationSubmitted` and `NotificationSubmissionAmended` are forwarded; all other event types are logged and dropped.
- Mapping the backend's outbox event (GBN-AG data) to `PimsEventV1` (`PimsPayloadMapper`, `PimsEventMapper` and related mappers).
- ASB message identity: `sessionId` is the SQS `MessageGroupId` (the aggregate id); `messageId` is the body `eventId`, else the SQS deduplication id, else a new UUID.
- Error classification: transient ASB failures are left in SQS for native redelivery and DLQ routing; non-transient failures, invalid JSON, and a missing `MessageGroupId` are deleted from SQS. No in-process retry.
- The DLQ API over the notification dead-letter queue (list, replay-all, delete-all).

**Does NOT own:**
- Notification data, persistence or the outbox itself (the animals backend writes and publishes the events; this service holds no database).
- The event and PIMS schemas (defined in `trade-imports-schemas`; here they are mirrored as Java classes).
- The SNS-to-SQS subscription and queue provisioning (platform/Floci setup); the queue's `maxReceiveCount` and visibility timeout are CDP platform defaults.
- The consumer of the ASB queue. PIMS consumes it; PIMS is outside this workspace and its team, so no repo here shows it.
- End-user authentication. Only replay-all/delete-all are guarded, by a shared secret header.

## Integrations

| Direction | System | Mechanism | Purpose |
|---|---|---|---|
| Inbound | AWS SNS FIFO to SQS FIFO queue (`*_notifications_gateway.fifo`); produced by trade-imports-animals-backend | SQS listener (Spring Cloud AWS) | Primary pipeline: receive outbox notification events |
| Outbound | Azure Service Bus (session queue) | Azure SDK `azure-messaging-servicebus`, SAS send-only connection string | Deliver PIMS-mapped events downstream |
| Inbound | Any caller (diagnostic) | REST `POST /events` (needs `aggregateId`) | Secondary path: forward a JSON body to ASB |
| Inbound | trade-imports-animals-admin (`TRADE_IMPORTS_DYNAMICS_GATEWAY_URL`) | REST `/dlq/notifications` | List, replay-all and delete-all DLQ messages |
| Outbound | AWS SQS dead-letter queue | SQS `ReceiveMessage`, `StartMessageMoveTask`, `PurgeQueue` | Implement the DLQ API |
| Outbound | AWS CloudWatch | Embedded metrics (EMF) | Metrics |
| Outbound | trade-imports-schemas | Documentation links only (Javadoc URLs); no build-time or runtime dependency | Reference for `OutboxEvent` and `PimsEventV1` shapes |

The backend also carries a `TRADE_IMPORTS_DYNAMICS_GATEWAY_BASE_URL` setting in the workspace stack, but `trade-imports-animals-backend/src` contains no reference to the gateway and no client for it. Events reach the gateway only through SNS and SQS.

## Stack

- **Runtime:** Java 25
- **Framework:** Spring Boot 3.5 (web, actuator, validation, AOP), virtual threads enabled
- **Build tool:** Maven
- **Messaging:** Spring Cloud AWS SQS starter (in); Azure Service Bus SDK (out)
- **API style:** REST, OpenAPI via springdoc (`/v3/api-docs`; Swagger UI in the `local` profile only)
- **Auth:** `Trade-Imports-Animals-Admin-Secret` header on DLQ replay-all/delete-all (`AdminSecretFilter`)
- **Logging/metrics:** Logback with Elastic ECS format; AWS embedded metrics; Micrometer
- **Tests:** JUnit 5 with Testcontainers (ASB emulator on SQL Server, Floci for SQS); `mvn verify` runs them

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| Azure Service Bus | Outbound event delivery (emulator locally, config in `servicebus/servicebus-config.json`) |
| AWS SQS FIFO queue and DLQ (Floci locally) | Inbound events and dead-letter handling |
| CDP platform (TLS truststore, `x-cdp-request-id` tracing, optional HTTP proxy) | Runtime environment |

## How to run

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local   # local profile: Floci + ASB emulator defaults
mvn test                                                # unit tests
mvn verify                                              # plus integration tests (Docker required)
```

Required outside `local`: `AZURE_SERVICE_BUS_CONNECTION_STRING`, `NOTIFICATION_SQS_QUEUE_URL`, `NOTIFICATION_SQS_ARN`, `TRADE_IMPORTS_ANIMALS_ADMIN_SECRET`. The service refuses to start without the ASB connection string.

Workspace stack: `scripts/stack/run-stack.sh` (the `servicebus` profile provides the emulator); `-e gateway` excludes it to run natively.

Port: **8088**
