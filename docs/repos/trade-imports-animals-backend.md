# trade-imports-animals-backend

**Repo:** DEFRA/trade-imports-animals-backend

## Purpose

REST API microservice providing business logic and data persistence for the trade imports animals service. Handles notification management, audit trail recording, and integration with AWS services. Exposes an OpenAPI-documented HTTP API consumed by the frontend and admin services.

## Stack

- **Runtime:** Java (Amazon Corretto)
- **Framework:** Spring Boot
- **Build tool:** Maven
- **API style:** REST (SpringDoc / OpenAPI / Swagger)
- **Auth:** JWT
- **Database:** MongoDB (Spring Data)
- **Caching:** Caffeine (in-memory); Redis available
- **AWS integration:** STS, Cognito, CloudWatch metrics, S3, SQS, SNS (AWS SDK v2)
- **Logging:** Logback with Elastic ECS format; CloudWatch embedded metrics
- **Unit/integration tests:** JUnit 5 + Testcontainers (real MongoDB container, no mocks)
- **Coverage:** JaCoCo (65% minimum enforced)

## Infrastructure dependencies

| Dependency | Purpose |
|-----------|---------|
| MongoDB | Primary data store |
| Redis | Optional distributed cache |
| AWS (S3, SQS, SNS) | File storage and messaging; floci in dev |
| AWS (STS, Cognito) | Identity / credential handling |
| CloudWatch | Metrics and observability |

## How to run

```bash
mvn spring-boot:run          # requires MongoDB running locally
```

Docker (infrastructure only):
```bash
docker compose --profile infra up -d     # MongoDB, Redis, Floci
```

Docker (full stack):
```bash
docker compose --profile services up --build -d
```

Port: **8085**
