# OpenAPI / SpringDoc — Best Practices

Project baseline: `springdoc-openapi-starter-webmvc-ui` v2.6.0, Spring Boot 3.5, Spring MVC.

---

## 1. Maven dependency

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.6.0</version>
</dependency>
```

Use `springdoc-openapi-starter-webmvc-ui` for Spring MVC (not WebFlux). The `starter` variant includes the Swagger UI.

**Critical: `-parameters` compiler flag**

Add to Maven compiler plugin so parameter names are available for SpringDoc to pick up:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <parameters>true</parameters>
    </configuration>
</plugin>
```

Without this, `@RequestParam` names won't be inferred automatically.

---

## 2. What SpringDoc generates automatically

SpringDoc scans your `@RestController` classes and generates OpenAPI 3.0 spec automatically for:

| Auto-generated | From |
|---------------|------|
| Path and method | `@GetMapping`, `@PostMapping`, etc. |
| Path parameters | `@PathVariable` |
| Query parameters | `@RequestParam` |
| Request body schema | `@RequestBody` + DTO fields |
| Response body schema | Method return type |
| HTTP 200 response | Default when no `@ApiResponse` present |
| Bean validation constraints | `@NotNull`, `@Size`, `@Pattern` etc. on DTO fields |

You must **add annotations** for:
- Meaningful summaries and descriptions
- Non-200 response codes and their schemas
- Security requirements
- Hiding internal fields
- Enum documentation
- Example values

---

## 3. Swagger UI and API docs URLs

| URL | Content |
|-----|---------|
| `/swagger-ui.html` | Swagger UI (HTML) |
| `/swagger-ui/index.html` | Alternate Swagger UI path |
| `/v3/api-docs` | OpenAPI JSON |
| `/v3/api-docs.yaml` | OpenAPI YAML |

Configure in `application.yml`:

```yaml
springdoc:
  api-docs:
    path: /v3/api-docs
    enabled: true
  swagger-ui:
    path: /swagger-ui.html
    enabled: true
    operations-sorter: method
    tags-sorter: alpha
  packages-to-scan: uk.gov.defra.tradeimportsanimals
  paths-to-match: /notifications/**, /admin/**
```

Disable in production if internal API:
```yaml
springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

---

## 4. OpenAPI global info and security scheme

Define globally using `@OpenAPIDefinition` on a `@Configuration` class:

```java
@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "Trade Imports API",
        version = "1.0.0",
        description = "REST API for managing import notifications",
        contact = @Contact(
            name = "DEFRA Trade Imports Team",
            email = "trade-imports@defra.gov.uk"
        )
    ),
    security = @SecurityRequirement(name = "bearerAuth")
)
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .name("bearerAuth")
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("JWT token from Defra ID")));
    }
}
```

This makes every endpoint require bearer auth by default. Override per-endpoint with `@SecurityRequirement` (see section 8).

---

## 5. Controller annotations

### `@Tag`

Groups endpoints in Swagger UI:

```java
@Tag(name = "Notifications", description = "Create, retrieve and delete import notifications")
@RestController
@RequestMapping("/notifications")
public class NotificationController { ... }
```

### `@Operation`

Documents a single endpoint:

```java
@Operation(
    summary = "Get notification by reference number",
    description = "Returns the full notification for the given reference number. "
            + "Returns 404 if not found.",
    operationId = "getNotificationByReferenceNumber"
)
@GetMapping("/{referenceNumber}")
public NotificationDto getByReferenceNumber(@PathVariable String referenceNumber) { ... }
```

| Property | Purpose |
|---------|---------|
| `summary` | Short description (shown in collapsed view) |
| `description` | Full description (shown when expanded) |
| `operationId` | Unique ID used in generated clients |
| `deprecated` | Mark as deprecated |
| `hidden` | Exclude from spec entirely |

### `@ApiResponse` / `@ApiResponses`

```java
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "Notification found",
            content = @Content(schema = @Schema(implementation = NotificationDto.class))),
    @ApiResponse(responseCode = "404", description = "Notification not found",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
    @ApiResponse(responseCode = "401", description = "Unauthorised",
            content = @Content)
})
@GetMapping("/{referenceNumber}")
public NotificationDto getByReferenceNumber(@PathVariable String referenceNumber) { ... }
```

Use `content = @Content` (no schema) for responses with no body (e.g. 204, 401).

### `@Parameter`

```java
@GetMapping("/{referenceNumber}")
public NotificationDto getByReferenceNumber(
        @Parameter(description = "The notification reference number, e.g. DRAFT.IMP.2026.123",
                   required = true,
                   example = "DRAFT.IMP.2026.123")
        @PathVariable String referenceNumber) { ... }
```

| Property | Purpose |
|---------|---------|
| `description` | Human-readable description |
| `required` | Defaults to false for query params |
| `example` | Example value shown in Swagger UI |
| `schema` | Override inferred schema |
| `hidden` | Exclude from spec |
| `in` | Override param location (PATH, QUERY, HEADER, COOKIE) |

### `@RequestBody` (OpenAPI annotation)

Note: there are two `@RequestBody` annotations — `org.springframework.web.bind.annotation.RequestBody` (Spring, required for binding) and `io.swagger.v3.oas.annotations.parameters.RequestBody` (OpenAPI, optional documentation). Both can be used together:

```java
@PostMapping
public NotificationDto save(
        @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Notification data to save",
                required = true,
                content = @Content(schema = @Schema(implementation = NotificationRequest.class)))
        @org.springframework.web.bind.annotation.RequestBody
        @Valid NotificationRequest request,
        @RequestHeader HttpHeaders headers) { ... }
```

Usually SpringDoc infers the request body schema from the Spring `@RequestBody` type — the OpenAPI annotation is only needed for extra description.

---

## 6. DTO / schema annotations

### Project rules — non-negotiable defaults

The OpenAPI document is part of the API contract. Apply these on every public DTO without exception.

1. **Every public class, record, and enum constant carries a `@Schema(description = "...")`.** Undocumented fields are a defect, not stylistic noise — generated client SDKs and consumer-facing docs both surface the description.
2. **`requiredMode = Schema.RequiredMode.REQUIRED` on every non-nullable field.** The default is auto-detected and varies across SpringDoc versions: a field that's "required" in one version becomes "optional" in another, breaking generated clients silently. Be explicit.
3. **`@Schema` on a field with a Bean Validation annotation (`@NotNull`, `@Pattern`, etc.) must agree with it.** If `@NotNull` says required, `@Schema` must say `requiredMode = REQUIRED`. Mismatch == lying contract.

```java
@Schema(description = "Response from initiating a document upload")
public record DocumentUploadResponse(

    @Schema(description = "Upload session identifier",
            requiredMode = Schema.RequiredMode.REQUIRED,
            example = "upload-abc-123")
    String uploadId,

    @Schema(description = "URL the client should POST the file to",
            requiredMode = Schema.RequiredMode.REQUIRED,
            example = "https://cdp-uploader.example/upload-and-scan/upload-abc-123")
    String uploadUrl
) {}
```

### Standard `@Schema` shape

`@Schema` on classes and fields:

```java
@Schema(description = "An import notification")
public record NotificationDto(

    @Schema(description = "Unique MongoDB document ID", example = "507f1f77bcf86cd799439011",
            accessMode = Schema.AccessMode.READ_ONLY)
    String id,

    @Schema(description = "System-assigned reference number", example = "DRAFT.IMP.2026.123",
            requiredMode = Schema.RequiredMode.REQUIRED,
            accessMode = Schema.AccessMode.READ_ONLY)
    String referenceNumber,

    @Schema(description = "Origin country details",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    Origin origin,

    @Schema(description = "Current status of the notification",
            requiredMode = Schema.RequiredMode.REQUIRED)
    NotificationStatus status,

    @Schema(hidden = true)  // Exclude from API docs
    String internalField
) {}
```

`@Schema` on fields:

| Property | Purpose |
|---------|---------|
| `description` | Human-readable description |
| `example` | Example value |
| `required` | Mark as required (use with `@NotNull`) |
| `hidden` | Exclude field from schema |
| `accessMode` | `READ_ONLY`, `WRITE_ONLY`, `READ_WRITE` |
| `format` | Override format (e.g. `date`, `uuid`) |
| `minimum` / `maximum` | Numeric bounds |
| `pattern` | Regex pattern |
| `deprecated` | Mark as deprecated |

Enum documentation — SpringDoc uses the enum's `toString()` by default. To add descriptions:

```java
@Schema(description = "Notification status")
public enum NotificationStatus {
    @Schema(description = "Draft — not yet submitted")
    DRAFT,
    @Schema(description = "Submitted — awaiting processing")
    SUBMITTED,
    @Schema(description = "Approved")
    APPROVED
}
```

---

## 7. Documenting ProblemDetail / RFC 7807 error responses

Use `application/problem+json` media type for error responses:

```java
@ApiResponse(
    responseCode = "400",
    description = "Validation failed",
    content = @Content(
        mediaType = "application/problem+json",
        schema = @Schema(implementation = ProblemDetail.class),
        examples = @ExampleObject(value = """
            {
              "type": "/problems/validation-error",
              "title": "Bad Request",
              "status": 400,
              "detail": "Validation failed",
              "errors": {
                "referenceNumber": "must not be blank"
              },
              "traceId": "abc-123"
            }
            """)
    )
)
```

---

## 8. Security — per-endpoint overrides

All endpoints inherit the global `@SecurityRequirement(name = "bearerAuth")`. Override for specific endpoints:

```java
// Remove security from public health endpoint
@Operation(security = {})
@GetMapping("/health")
public String health() { return "OK"; }

// Add additional security scheme
@Operation(security = {
    @SecurityRequirement(name = "bearerAuth"),
    @SecurityRequirement(name = "adminSecret")
})
@DeleteMapping
public void deleteAll(...) { ... }
```

---

## 9. Grouping with `GroupedOpenApi`

Split the API into multiple Swagger UI groups:

```java
@Configuration
public class OpenApiGroupConfig {

    @Bean
    public GroupedOpenApi notificationsApi() {
        return GroupedOpenApi.builder()
                .group("notifications")
                .displayName("Notifications API")
                .pathsToMatch("/notifications/**")
                .build();
    }

    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
                .group("admin")
                .displayName("Admin API")
                .pathsToMatch("/admin/**")
                .build();
    }
}
```

Groups appear in the Swagger UI "definition" dropdown.

---

## 10. Customisation

Add custom behaviour to every operation:

```java
@Component
public class TraceIdOperationCustomizer implements OperationCustomizer {

    @Override
    public Operation customize(Operation operation, HandlerMethod handlerMethod) {
        // Add x-cdp-request-id header to all operations
        operation.addParametersItem(new Parameter()
                .name("x-cdp-request-id")
                .in("header")
                .description("Request trace ID for CDP observability")
                .required(false)
                .schema(new StringSchema()));
        return operation;
    }
}
```

Modify the global OpenAPI object:

```java
@Component
public class ServerOpenApiCustomizer implements OpenApiCustomizer {

    @Override
    public void customise(OpenAPI openApi) {
        openApi.addServersItem(new Server()
                .url("https://api.trade-imports.defra.gov.uk")
                .description("Production"));
        openApi.addServersItem(new Server()
                .url("http://localhost:8085")
                .description("Local development"));
    }
}
```

---

## 11. Common mistakes

**1. Spring vs OpenAPI `@RequestBody` confusion**

```java
// Wrong — using OpenAPI annotation instead of Spring for binding
@PostMapping
public Dto save(@io.swagger.v3.oas.annotations.parameters.RequestBody NotificationRequest req) {
    // req is null — Spring never bound it
}

// Correct — always use Spring annotation for binding, OpenAPI annotation is optional
@PostMapping
public Dto save(@org.springframework.web.bind.annotation.RequestBody @Valid NotificationRequest req) { }
```

**2. `@ApiResponse` content type mismatch for errors**

```java
// Wrong — uses application/json for error responses (should be problem+json)
@ApiResponse(responseCode = "404", content = @Content(
    schema = @Schema(implementation = ErrorDto.class)))

// Correct
@ApiResponse(responseCode = "404", content = @Content(
    mediaType = "application/problem+json",
    schema = @Schema(implementation = ProblemDetail.class)))
```

**3. Over-annotating what SpringDoc already infers**

```java
// Wrong — redundant, SpringDoc infers this
@Parameter(name = "referenceNumber", in = ParameterIn.PATH, required = true)
@PathVariable String referenceNumber

// Correct — only add what adds value (description, example)
@Parameter(description = "Notification reference number", example = "DRAFT.IMP.2026.123")
@PathVariable String referenceNumber
```

**4. Forgetting `content = @Content` on no-body responses**

```java
// Wrong — generates a spurious empty schema
@ApiResponse(responseCode = "204", description = "Deleted")

// Correct
@ApiResponse(responseCode = "204", description = "Deleted", content = @Content)
```

**5. Not disabling Swagger UI in production**

Set `springdoc.swagger-ui.enabled=false` and `springdoc.api-docs.enabled=false` in `application-prod.yml` if the API is internal.

**6. Describing behaviour that doesn't match the code**

`@ApiResponse(responseCode = "200")` when the method returns `ResponseEntity.status(201)`. Keep annotations in sync with actual responses.

---

## 12. How this project uses SpringDoc

Current state in `trade-imports-animals-backend`:
- `springdoc-openapi-starter-webmvc-ui` v2.6.0 in `pom.xml`
- `@Tag` on `NotificationController`
- `@Operation` on individual endpoints
- `@Schema` on `NotificationDto`, `Notification`, `Origin`
- No `@ApiResponse` annotations — SpringDoc generates only the 200 response
- No global `@OpenAPIDefinition` — info block is default

Gaps to address:
- Add `@ApiResponse` for 404, 400, 401 on all endpoints
- Add `@OpenAPIDefinition` with project info and JWT `SecurityScheme`
- Add `@SecurityRequirement` globally
- Document `ProblemDetail` error schema
- Add `example` values to `@Schema` on key DTO fields
- Disable Swagger UI in deployed environments via profile