# Best practices applicable to trade-imports-ins-backend

Concatenated from `docs/best-practices/` at prepare-review time.
Apply these standards when reviewing files in this repo.


---

## Source: `docs/best-practices/java/spring-boot.md`

# Spring Boot — Best Practices

Project baseline: Spring Boot 3.5, Java 25, Maven, Lombok. This doc covers the patterns used in `trade-imports-animals-backend`.

---

## 1. Application structure

Use **feature-based packages**, not layer-based. Each feature owns its controller, service, repository, model, and DTO.

```
src/main/java/uk/gov/defra/tradeimportsanimals/
├── TradeImportsAnimalsApplication.java
├── notification/
│   ├── NotificationController.java
│   ├── NotificationService.java
│   ├── NotificationRepository.java
│   ├── Notification.java           ← MongoDB document
│   └── dto/
│       ├── NotificationDto.java
│       └── NotificationRequest.java
├── audit/
│   ├── AuditRepository.java
│   └── Audit.java
├── config/
│   ├── SecurityConfig.java
│   ├── CacheConfig.java
│   ├── MongoConfig.java
│   └── MetricsConfig.java
├── common/
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   ├── NotFoundException.java
│   │   └── ConflictException.java
│   └── filter/
│       ├── RequestTracingFilter.java
│       └── AdminSecretFilter.java
└── metrics/
    └── EmfMetricsPublisher.java
```

---

## 2. Entry point

```java
@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({ AppConfig.class, MetricsConfigurationProperties.class })
public class TradeImportsAnimalsApplication {
    public static void main(String[] args) {
        SpringApplication.run(TradeImportsAnimalsApplication.class, args);
    }
}
```

---

## 3. REST controllers

```java
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/notifications")
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Timed("notification.find_all")
    public List<NotificationDto> findAll() {
        log.info("Finding all notifications");
        return notificationService.findAll();
    }

    @GetMapping("/{referenceNumber}")
    @Timed("notification.find_by_reference")
    public NotificationDto findByReferenceNumber(@PathVariable String referenceNumber) {
        return notificationService.findByReferenceNumber(referenceNumber);
    }

    @PostMapping
    @Timed("notification.save")
    public NotificationDto save(
            @Valid @RequestBody NotificationRequest request,
            @RequestHeader HttpHeaders headers) {
        return notificationService.save(request, headers);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteByReferenceNumbers(
            @Valid @RequestBody List<String> referenceNumbers,
            @RequestHeader HttpHeaders headers) {
        notificationService.deleteByReferenceNumbers(referenceNumbers, headers);
    }
}
```

Key points:
- `@RequiredArgsConstructor` (Lombok) — constructor injection, never `@Autowired` on fields
- `@Slf4j` (Lombok) — provides `log` field
- `@Timed` — Micrometer metric per endpoint
- `@RequestHeader HttpHeaders` — captures all headers for audit trail

### Security defaults for controllers

Controllers that accept user-controlled URLs, file streams, or take `{id}`-style path variables must apply these defaults. They are not optional — each one prevents a class of vulnerability.

**Validate `redirectUrl` against an allowlist (open-redirect)**

A controller that takes a `redirectUrl` from a request body or query parameter and returns it (directly or via `Location` header) is an open redirect unless the URL is checked against a known origin.

```java
// Wrong — caller controls where the user lands after the upload completes
@PostMapping("/document-uploads")
public ResponseEntity<DocumentUploadResponse> initiate(@RequestBody DocumentUploadRequest req) {
    return documentService.initiate(req.redirectUrl());  // attacker-controlled URL
}

// Correct — reject any URL that doesn't start with the known frontend origin
@PostMapping("/document-uploads")
public ResponseEntity<DocumentUploadResponse> initiate(@RequestBody DocumentUploadRequest req) {
    String allowed = cdpConfig.frontend().baseUrl();
    String redirectUrl = req.redirectUrl() != null ? req.redirectUrl() : allowed;
    if (!redirectUrl.startsWith(allowed)) {
        throw new IllegalArgumentException("redirectUrl must match " + allowed);
    }
    return documentService.initiate(redirectUrl);
}
```

**`Location` header on `201 Created` must be an absolute URI (RFC 9110)**

A relative URI in the `Location` header is non-conformant for `201 Created`. Build it from the current request so it survives reverse proxies and mounted context paths.

```java
// Wrong — relative URI
return ResponseEntity.created(URI.create("/document-uploads/" + uploadId)).body(response);

// Correct — absolute URI built from current request
URI location = ServletUriComponentsBuilder.fromCurrentRequest()
        .path("/{uploadId}")
        .buildAndExpand(uploadId)
        .toUri();
return ResponseEntity.created(location).body(response);
```

**Forwarded `Content-Type` is never trusted**

When streaming a file retrieved from a third-party (CDP Uploader, S3, any external store), allow-list the MIME types you'll forward and always set `X-Content-Type-Options: nosniff`. Default to `application/octet-stream` for unknown types.

```java
private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "application/pdf", "image/jpeg", "image/png",
        "application/vnd.ms-excel", "application/msword",
        "application/octet-stream"
);

@GetMapping("/document-uploads/{uploadId}/file")
public ResponseEntity<StreamingResponseBody> downloadFile(@PathVariable String uploadId) {
    var fileData = documentService.findFile(uploadId);

    String contentType;
    try {
        var parsed = MediaType.parseMediaType(fileData.contentType());
        contentType = ALLOWED_CONTENT_TYPES.contains(parsed.toString())
                ? parsed.toString()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
    } catch (InvalidMediaTypeException e) {
        log.warn("Bad content-type from upstream for uploadId={}: {}", uploadId, fileData.contentType());
        contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }

    return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, contentType)
            .header("X-Content-Type-Options", "nosniff")           // always
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment") // never inline
            .body(fileData.streamingBody());
}
```

**IDOR — verify ownership before returning a resource by ID**

If an endpoint accepts a resource ID from the request and the caller could plausibly have access to *some* resources but not others, the service must check ownership. "Authentication = authorisation" is only acceptable in skeleton/all-or-nothing phases and should be a recorded decision, not an implicit assumption. When in doubt, pass the parent reference (e.g. notification ref) into the lookup so the data layer enforces the join.

---

## 4. Request / response

```java
// Path variable — always constrain format on @PathVariable.
// Without @Pattern / @Size, any malformed value reaches the service layer
// (and database queries) before being rejected. Class needs @Validated.
@GetMapping("/{referenceNumber}")
public ResponseEntity<NotificationDto> getByReference(
        @PathVariable @Pattern(regexp = "^[A-Z0-9.\\-]{1,50}$") String referenceNumber) {
    return ResponseEntity.ok(service.findByReferenceNumber(referenceNumber));
}

// Query params
@GetMapping
public ResponseEntity<List<NotificationDto>> list(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
    return ResponseEntity.ok(service.findAll(page, size));
}

// Request headers
@PostMapping
public ResponseEntity<NotificationDto> create(
        @Valid @RequestBody NotificationRequest body,
        @RequestHeader HttpHeaders headers) {
    var result = service.create(body, headers);
    return ResponseEntity.status(HttpStatus.CREATED).body(result);
}

// No content response
@DeleteMapping("/{id}")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void delete(@PathVariable String id) {
    service.delete(id);
}
```

---

## 5. Bean validation

```java
public record NotificationRequest(
    @NotBlank(message = "Reference number is required")
    String referenceNumber,

    @NotNull(message = "Origin is required")
    @Valid
    Origin origin,

    @Size(max = 500)
    String notes
) {}
```

Constraint annotations:

| Annotation | Description |
|-----------|-------------|
| `@NotNull` | Value must not be null |
| `@NotBlank` | String must not be null, empty, or whitespace |
| `@NotEmpty` | Collection/String must not be null or empty |
| `@Size(min, max)` | Collection/String size bounds |
| `@Min` / `@Max` | Numeric bounds |
| `@Pattern(regexp)` | Regex match |
| `@Email` | Valid email format |
| `@Valid` | Cascade validation to nested objects |
| `@Positive` | Number > 0 |

Use `@Valid` on `@RequestBody` parameters to trigger validation. Failures throw `MethodArgumentNotValidException` — handled by `@ControllerAdvice`.

---

## 6. Exception handling

```java
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationException(
            MethodArgumentNotValidException ex) {
        var traceId = MDC.get("traceId");
        var errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> Objects.requireNonNullElse(fe.getDefaultMessage(), "Invalid"),
                        (a, b) -> a));

        var problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Validation failed");
        problem.setType(URI.create("/problems/validation-error"));
        problem.setProperty("errors", errors);
        problem.setProperty("traceId", traceId);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFoundException(NotFoundException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setType(URI.create("/problems/not-found"));
        problem.setProperty("traceId", MDC.get("traceId"));
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ProblemDetail> handleConflictException(ConflictException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setType(URI.create("/problems/conflict"));
        problem.setProperty("traceId", MDC.get("traceId"));
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleException(Exception ex) {
        log.error("Unexpected error", ex);
        var problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        problem.setType(URI.create("/problems/internal-error"));
        problem.setProperty("traceId", MDC.get("traceId"));
        return ResponseEntity.internalServerError().body(problem);
    }
}
```

Custom exceptions:

```java
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) { super(message); }
}

public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}
```

`ProblemDetail` produces RFC 7807 JSON:
```json
{
  "type": "/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Notification DRAFT.IMP.2026.123 not found",
  "traceId": "abc-123"
}
```

---

## 7. Dependency injection

Always use **constructor injection** via `@RequiredArgsConstructor`. Never use `@Autowired` on fields.

```java
// Correct — constructor injection via Lombok
@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final AuditRepository auditRepository;
}

// Wrong — field injection
@Service
public class NotificationService {
    @Autowired  // ← Never do this
    private NotificationRepository notificationRepository;
}
```

Stereotype annotations:

| Annotation | Use |
|-----------|-----|
| `@Component` | Generic Spring-managed bean |
| `@Service` | Business logic layer |
| `@Repository` | Data access layer (enables exception translation) |
| `@Controller` / `@RestController` | Web layer |
| `@Configuration` | Config class with `@Bean` methods |

```java
@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        var caffeine = Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(10, TimeUnit.MINUTES);
        var manager = new CaffeineCacheManager();
        manager.setCaffeine(caffeine);
        return manager;
    }
}
```

---

## 8. Configuration

```yaml
# application.yml
app:
  backend-url: ${BACKEND_URL:http://localhost:8085}
  admin-secret: ${ADMIN_SECRET:dev-secret}
  aws:
    region: ${AWS_REGION:eu-west-2}
    endpoint-override: ${AWS_ENDPOINT_OVERRIDE:}

spring:
  data:
    mongodb:
      uri: ${MONGO_URI:mongodb://localhost:27017/trade-imports}
  cache:
    type: caffeine

server:
  port: ${PORT:8085}
  forward-headers-strategy: framework
  shutdown: graceful
```

```yaml
# application-local.yml — overrides for local dev
app:
  aws:
    endpoint-override: http://localhost:4566
logging:
  level:
    root: DEBUG
```

`@ConfigurationProperties`:

```java
@ConfigurationProperties(prefix = "app")
@Validated   // ← required: without this, the @NotBlank etc. are silent decoration
public record AppConfig(
    @NotBlank String backendUrl,
    @NotBlank String adminSecret,
    AwsConfig aws
) {
    public record AwsConfig(
        @NotBlank String region,
        @Pattern(regexp = "^(https?://.*)?$")  // optional but format-checked
        String endpointOverride
    ) {}
}
```

Register: `@EnableConfigurationProperties(AppConfig.class)` on the application class.

**Why `@Validated` matters.** Without it, missing or malformed YAML produces NPEs at the first bean that calls `cdpConfig.uploader().maxFileSize()` — typically deep in a service method, with a stack trace that doesn't name the missing key. With `@Validated`, the application fails to start with a clear `ConfigurationPropertiesBindException` naming the offending field. Apply this to **every** `@ConfigurationProperties` record.

Constraint annotations to use on config records:

| Annotation | Use |
|-----------|-----|
| `@NotNull` | Required key — null is a configuration error, not a default |
| `@NotBlank` | Required string that must be non-empty |
| `@Pattern(regexp)` | URL formats, reference number formats, anything with structure |
| `@Positive` / `@PositiveOrZero` | Sizes, timeouts, counts |
| `@Min` / `@Max` | Bounded numeric ranges |
| `@Nullable` | Document optional fields explicitly (Jakarta annotation, not Spring) |

Match constraint annotation packages to your overall stack — this project uses Jakarta (`jakarta.validation.constraints.*`, `jakarta.annotation.Nullable`); don't mix in `org.springframework.lang.Nullable`.

---

## 9. Conditional beans

```java
@Service
@ConditionalOnProperty(name = "metrics.emf.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class EmfMetricsPublisher {

    private final MeterRegistry meterRegistry;

    @Scheduled(fixedRateString = "${metrics.publish-interval-ms:60000}")
    public void publishMetrics() {
        log.info("Publishing EMF metrics");
        // ...
    }
}
```

`@ConditionalOnProperty` disables the bean entirely — no stub, no `if` check needed. In `application-test.yml`, set `metrics.emf.enabled=false`.

---

## 10. Caching

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        var caffeine = Caffeine.newBuilder()
                .maximumSize(1000)
                .expireAfterWrite(Duration.ofMinutes(10))
                .recordStats();
        var manager = new CaffeineCacheManager("notifications", "commodities");
        manager.setCaffeine(caffeine);
        return manager;
    }
}
```

```java
@Service
@RequiredArgsConstructor
public class CommodityService {

    @Cacheable(value = "commodities", key = "#code")
    public Commodity findByCode(String code) {
        // Only called on cache miss
        return commodityRepository.findByCode(code)
                .orElseThrow(() -> new NotFoundException("Commodity not found: " + code));
    }

    @CacheEvict(value = "commodities", key = "#commodity.code")
    public void update(Commodity commodity) {
        commodityRepository.save(commodity);
    }

    @CachePut(value = "commodities", key = "#result.code")
    public Commodity save(Commodity commodity) {
        return commodityRepository.save(commodity);
    }
}
```

**Self-invocation caveat**: `@Cacheable` is AOP-based — calling a cached method from within the same bean bypasses the cache. Extract to a separate bean if needed.

---

## 11. Scheduling

```java
@Configuration
@EnableScheduling
public class SchedulingConfig {}
```

```java
@Service
@ConditionalOnProperty(name = "scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class MetricsPublisher {

    // Fixed rate in milliseconds
    @Scheduled(fixedRate = 60_000)
    public void publishEveryMinute() { ... }

    // Cron expression
    @Scheduled(cron = "0 0 * * * *")  // top of every hour
    public void publishHourly() { ... }

    // From property — allows env-specific intervals
    @Scheduled(fixedRateString = "${metrics.publish-interval-ms:60000}")
    public void publishConfigurable() { ... }
}
```

Disable in tests via `application-integration-test.yml`:
```yaml
scheduling:
  enabled: false
```

---

## 12. Security — JWT resource server

```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
            JwtDecoder jwtDecoder,
            JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .decoder(jwtDecoder)
                                .jwtAuthenticationConverter(jwtAuthenticationConverter)))
                .sessionManagement(sm -> sm
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(AbstractHttpConfigurer::disable)
                .build();
    }

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri,
            @Value("${jwt.audience}") String audience) {
        var decoder = JwtDecoders.fromIssuerLocation(issuerUri);
        var audienceValidator = new JwtClaimValidator<List<String>>(
                JwtClaimNames.AUD, aud -> aud != null && aud.contains(audience));
        var validator = new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuerUri), audienceValidator);
        ((NimbusJwtDecoder) decoder).setJwtValidator(validator);
        return decoder;
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        var converter = new JwtGrantedAuthoritiesConverter();
        converter.setAuthoritiesClaimName("roles");
        converter.setAuthorityPrefix("ROLE_");
        var authConverter = new JwtAuthenticationConverter();
        authConverter.setJwtGrantedAuthoritiesConverter(converter);
        return authConverter;
    }
}
```

Admin secret filter (shared-secret auth for internal endpoints):

```java
@Component
@RequiredArgsConstructor
public class AdminSecretFilter extends OncePerRequestFilter {

    private final AppConfig appConfig;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request instanceof HttpServletRequest req
                && req.getRequestURI().startsWith("/admin")) {
            var secret = req.getHeader("Trade-Imports-Animals-Admin-Secret");
            if (!appConfig.adminSecret().equals(secret)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
```

---

## 13. Servlet filters

```java
@Component
@Order(1)
public class RequestTracingFilter extends OncePerRequestFilter {

    private static final String TRACE_HEADER = "x-cdp-request-id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var traceId = request.getHeader(TRACE_HEADER);
        if (traceId != null && !traceId.isBlank()) {
            MDC.put("traceId", traceId);
        }
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();  // always clear — prevents bleed between requests in thread pools
        }
    }
}
```

Outbound trace propagation via `RestClient` interceptor:

```java
@Component
public class TraceIdPropagationInterceptor implements ClientHttpRequestInterceptor {

    private static final String TRACE_HEADER = "x-cdp-request-id";

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
            ClientHttpRequestExecution execution) throws IOException {
        var traceId = MDC.get("traceId");
        if (traceId != null && !traceId.isBlank()) {
            request.getHeaders().add(TRACE_HEADER, traceId);
        }
        return execution.execute(request, body);
    }
}
```

---

## 14. Actuator

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
      show-components: when-authorized
  health:
    defaults:
      enabled: true
```

```yaml
# application-local.yml — expose everything locally
management:
  endpoints:
    web:
      exposure:
        include: "*"
```

Custom health indicator:

```java
@Component
public class BackendHealthIndicator implements HealthIndicator {

    private final NotificationRepository notificationRepository;

    @Override
    public Health health() {
        try {
            notificationRepository.count();
            return Health.up().build();
        } catch (Exception ex) {
            return Health.down(ex).build();
        }
    }
}
```

---

## 15. Logging

```java
@Slf4j  // Lombok — provides log field
@Service
public class NotificationService {

    public NotificationDto save(NotificationRequest request, HttpHeaders headers) {
        // Parameterised — correct
        log.info("Saving notification for reference: {}", request.referenceNumber());

        // Structured with context
        log.debug("Save request received: referenceNumber={}, userId={}",
                request.referenceNumber(), headers.getFirst("User-Id"));

        try {
            var result = doSave(request);
            log.info("Notification saved: referenceNumber={}", result.referenceNumber());
            return result;
        } catch (Exception ex) {
            // Always log with exception object — not ex.getMessage()
            log.error("Failed to save notification: referenceNumber={}",
                    request.referenceNumber(), ex);
            throw ex;
        }
    }
}
```

Log levels:
- `TRACE` — very fine-grained, never in production
- `DEBUG` — diagnostic detail for troubleshooting
- `INFO` — normal operations (default production level)
- `WARN` — unexpected but handled
- `ERROR` — operation failed, needs attention

`logback-spring.xml` — switch format by Spring profile:

```xml
<configuration>
  <springProfile name="!local">
    <!-- ECS format for deployed environments -->
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
      <encoder class="co.elastic.logging.logback.EcsEncoder">
        <serviceName>trade-imports-animals-backend</serviceName>
      </encoder>
    </appender>
  </springProfile>

  <springProfile name="local">
    <!-- Human-readable for local dev -->
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
      <encoder>
        <pattern>%d{HH:mm:ss} %-5level [%X{traceId}] %logger{36} - %msg%n</pattern>
      </encoder>
    </appender>
  </springProfile>

  <!-- Suppress health check noise -->
  <logger name="org.springframework.web.servlet.DispatcherServlet" level="WARN"/>

  <root level="${LOG_LEVEL:-INFO}">
    <appender-ref ref="STDOUT"/>
  </root>
</configuration>
```

---

## 16. Spring Data MongoDB (brief)

Full reference: `docs/java/spring-data-mongodb.md`.

```java
@Document(collection = "notifications")
@Builder
@Data
public class Notification {

    @Id
    private String id;

    @Indexed(sparse = true, unique = true)
    private String referenceNumber;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
```

```java
public interface NotificationRepository extends MongoRepository<Notification, String> {

    Optional<Notification> findByReferenceNumber(String referenceNumber);

    List<Notification> findAllByReferenceNumberIn(List<String> referenceNumbers);

    boolean existsByReferenceNumber(String referenceNumber);
}
```

---

## 17. HTTP clients (RestClient)

```java
@Configuration
@RequiredArgsConstructor
public class HttpClientConfig {

    private final TraceIdPropagationInterceptor traceInterceptor;

    @Bean
    public RestClient backendRestClient(
            @Value("${app.backend-url}") String baseUrl) {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestInterceptor(traceInterceptor)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
```

```java
@Service
@RequiredArgsConstructor
public class BackendClient {

    private final RestClient backendRestClient;

    public NotificationDto getNotification(String referenceNumber) {
        return backendRestClient.get()
                .uri("/notifications/{ref}", referenceNumber)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new NotFoundException("Notification not found: " + referenceNumber);
                })
                .body(NotificationDto.class);
    }

    public NotificationDto saveNotification(NotificationRequest request) {
        return backendRestClient.post()
                .uri("/notifications")
                .body(request)
                .retrieve()
                .body(NotificationDto.class);
    }
}
```

Prefer `RestClient` (Spring 6.1+). Do not use `RestTemplate` for new code.

---

## 18. OpenAPI (brief)

Full reference: `docs/java/openapi-springdoc.md`.

```java
@Tag(name = "Notifications", description = "Manage import notifications")
@RestController
public class NotificationController {

    @Operation(summary = "Get all notifications")
    @ApiResponse(responseCode = "200", description = "Notifications retrieved")
    @GetMapping("/notifications")
    public List<NotificationDto> findAll() { ... }
}
```

---

## 19. Micrometer metrics

```java
@Configuration
public class MetricsConfig {

    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }

    @Bean
    public CountedAspect countedAspect(MeterRegistry registry) {
        return new CountedAspect(registry);
    }
}
```

`@Timed` on controller/service methods:
```java
@Timed(value = "notification.save", percentiles = { 0.5, 0.95, 0.99 })
public NotificationDto save(NotificationRequest request, HttpHeaders headers) { ... }
```

Programmatic metrics:
```java
@Service
@RequiredArgsConstructor
public class EmfMetricsPublisher {

    private final MeterRegistry meterRegistry;

    @Scheduled(fixedRateString = "${metrics.publish-interval-ms:60000}")
    public void publishMetrics() {
        var notificationCount = meterRegistry.find("notification.save").timer();
        if (notificationCount != null) {
            // Emit CloudWatch EMF JSON
            log.info("{\"_aws\":{\"Timestamp\":{},\"CloudWatchMetrics\":[...]},\"Count\":{}}",
                    System.currentTimeMillis(), notificationCount.count());
        }
    }
}
```

---

## 20. Testing

Full reference: `docs/java/testing/unit.md` and `docs/java/testing/integration.md`.

Key pattern — Testcontainers `@DynamicPropertySource`:

```java
@SpringBootTest
@Testcontainers
class NotificationServiceIT {

    @Container
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
    }
}
```

---

## 21. Project conventions

| Convention | Value |
|-----------|-------|
| Base package | `uk.gov.defra.tradeimportsanimals` |
| Java version | Java 25 (Amazon Corretto) |
| Spring Boot | 3.5.x |
| Build tool | Maven |
| Coverage minimum | 65% (JaCoCo enforced in `verify`) |
| HTTP port | 8085 |
| Shutdown | Graceful (`server.shutdown=graceful`) |
| Proxy headers | `server.forward-headers-strategy=framework` |

**Lombok annotations to use:**

| Annotation | Purpose |
|-----------|---------|
| `@RequiredArgsConstructor` | Constructor injection |
| `@Slf4j` | Provides `log` field |
| `@Builder` | Builder pattern |
| `@Data` | Getters + setters + equals + hashCode (use on mutable entities) |
| `@Value` | Immutable value class (all fields final) |
| `@With` | Generates `withX()` copy methods |

**Error type URI convention:** `/problems/{problem-type}` (e.g. `/problems/not-found`, `/problems/validation-error`)

---

## 22. Maven — coordinated dependency versions via BOMs

Spring Boot's `spring-boot-starter-parent` already imports a curated BOM for Spring/Jackson/etc. For dependency families *outside* Spring (AWS SDK, Spring Cloud, Testcontainers), import their BOM in `dependencyManagement` rather than pinning each artifact's `<version>` separately. A BOM keeps every artifact in the family at a compatible version.

```xml
<dependencyManagement>
    <dependencies>
        <!-- AWS SDK v2 — one BOM, every aws-sdk dep stays consistent -->
        <dependency>
            <groupId>software.amazon.awssdk</groupId>
            <artifactId>bom</artifactId>
            <version>${aws.sdk.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>

        <!-- Spring Cloud — manages spring-cloud-starter-* artifacts -->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>${spring.cloud.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- No <version> — comes from the BOM -->
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>s3</artifactId>
    </dependency>
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>sts</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-openfeign</artifactId>
    </dependency>
</dependencies>
```

**Why it matters.** Manual per-artifact versions drift — one upgrade leaves siblings on incompatible versions, surfacing as `NoSuchMethodError`/`LinkageError` at runtime. A single BOM property bumps all family members atomically.
---

## Source: `docs/best-practices/java/modern-java.md`

# Modern Java — Best Practices

Project baseline: Java 25, Amazon Corretto, Spring Boot 3.5. This doc covers language features from Java 17–25 and the idiomatic patterns used in `trade-imports-animals-backend`. The goal is to stop agents defaulting to old Java idioms.

---

## 1. Java version baseline

| Version | Notable features |
|---------|----------------|
| Java 17 (LTS) | Sealed classes (final), records (final), pattern matching instanceof, text blocks |
| Java 21 (LTS) | Pattern matching switch (final), record patterns, virtual threads, sequenced collections |
| Java 25 (LTS) | Primitive types in patterns, module imports, flexible constructor bodies |

This project targets **Java 25**. Use all stable features below freely.

---

## 2. Records

Records are immutable data carriers. Use them for DTOs, value objects, and event types.

```java
// Declare
public record NotificationDto(
    String id,
    String referenceNumber,
    Origin origin,
    NotificationStatus status
) {}

// Use — getters are field-name(), not getX()
var dto = new NotificationDto("1", "DRAFT.IMP.2026.1", origin, DRAFT);
dto.referenceNumber();  // not dto.getReferenceNumber()
```

**Compact constructor** — for validation:

```java
public record NotificationRequest(String referenceNumber, @NotNull Origin origin) {
    public NotificationRequest {
        Objects.requireNonNull(referenceNumber, "referenceNumber must not be null");
        if (referenceNumber.isBlank()) throw new IllegalArgumentException("referenceNumber must not be blank");
    }
}
```

**Custom constructor** — coercion:

```java
public record Coordinates(double lat, double lon) {
    public Coordinates(String lat, String lon) {
        this(Double.parseDouble(lat), Double.parseDouble(lon));
    }
}
```

**When to use records:**
- DTOs (request/response bodies)
- Configuration value objects
- Return types from repository projections
- Keys in Maps

**When NOT to use records:**
- JPA/MongoDB `@Document` entities (need mutable fields, no-arg constructor)
- Classes that need to extend another class
- Classes requiring custom `equals`/`hashCode` that depend on mutable state

---

## 3. Sealed classes and interfaces

Model a **closed set of variants** — the compiler knows all possible subtypes.

```java
public sealed interface ImportResult<T>
        permits ImportResult.Success, ImportResult.Failure {

    record Success<T>(T value) implements ImportResult<T> {}

    record Failure<T>(String errorCode, String message) implements ImportResult<T> {}
}
```

Use in service methods instead of nullable returns or exception-for-flow-control:

```java
public ImportResult<NotificationDto> save(NotificationRequest request) {
    if (existsByReferenceNumber(request.referenceNumber())) {
        return new ImportResult.Failure<>("DUPLICATE", "Already exists");
    }
    return new ImportResult.Success<>(doSave(request));
}
```

Handle exhaustively with switch (no default needed):

```java
return switch (service.save(request)) {
    case ImportResult.Success<NotificationDto>(var dto) -> ResponseEntity.ok(dto);
    case ImportResult.Failure<NotificationDto> f -> ResponseEntity
            .badRequest().body(ProblemDetail.forStatusAndDetail(400, f.message()));
};
```

---

## 4. Pattern matching — `instanceof`

```java
// Old
if (obj instanceof String) {
    String s = (String) obj;
    process(s);
}

// Modern
if (obj instanceof String s) {
    process(s);
}

// Negation guard
if (!(request instanceof HttpServletRequest req)) {
    chain.doFilter(request, response);
    return;
}
// req is in scope here
```

Used in this project's filter chain:

```java
@Override
protected void doFilterInternal(HttpServletRequest request,
        HttpServletResponse response, FilterChain chain) throws IOException, ServletException {
    if (request instanceof HttpServletRequest req
            && req.getRequestURI().startsWith("/admin")) {
        // req already typed — no cast needed
        var secret = req.getHeader("Admin-Secret");
        // ...
    }
}
```

---

## 5. Pattern matching — switch expressions

**Arrow syntax** (no fall-through, exhaustive):

```java
String label = switch (status) {
    case DRAFT     -> "Draft";
    case SUBMITTED -> "Submitted";
    case APPROVED  -> "Approved";
    case REJECTED  -> "Rejected";
};
```

**With sealed types** (exhaustive — no `default` needed, compiler checks):

```java
ResponseEntity<?> response = switch (result) {
    case ImportResult.Success<NotificationDto>(var dto) -> ResponseEntity.ok(dto);
    case ImportResult.Failure<NotificationDto> f ->
            ResponseEntity.status(400).body(f.message());
};
```

**`yield` for block bodies:**

```java
int score = switch (grade) {
    case "A" -> 4;
    case "B" -> 3;
    case "C" -> {
        log.debug("Marginal pass");
        yield 2;
    }
    default -> 0;
};
```

**Guarded patterns:**

```java
String describe = switch (obj) {
    case Integer i when i < 0 -> "negative";
    case Integer i when i == 0 -> "zero";
    case Integer i -> "positive";
    case String s when s.isBlank() -> "blank string";
    case String s -> "string: " + s;
    default -> "other";
};
```

**Multiple labels:**

```java
boolean isTerminal = switch (status) {
    case APPROVED, REJECTED, CANCELLED -> true;
    case DRAFT, SUBMITTED, UNDER_REVIEW -> false;
};
```

---

## 6. Record patterns (destructuring)

```java
// Destructure a record in switch
return switch (result) {
    case ImportResult.Success<NotificationDto>(var dto) -> dto.referenceNumber();
    case ImportResult.Failure<NotificationDto>(var code, var msg) -> "ERROR: " + code;
};

// Nested destructuring
record Address(String city, String country) {}
record Person(String name, Address address) {}

if (person instanceof Person(var name, Address(var city, _))) {
    log.info("Person {} lives in {}", name, city);
}
```

---

## 7. Text blocks

```java
// Multiline JSON (e.g. in tests)
String json = """
        {
          "referenceNumber": "DRAFT.IMP.2026.1",
          "origin": {
            "countryCode": "DE"
          }
        }
        """;

// Indentation is determined by the closing """
// Use formatted() for substitution
String query = """
        {
          "referenceNumber": "%s"
        }
        """.formatted(referenceNumber);
```

Line continuation (no newline):
```java
String sql = """
        SELECT * FROM notifications \
        WHERE status = 'DRAFT'
        """;
```

Trailing space preservation with `\s`:
```java
String padded = """
        hello   \s
        world
        """;
```

---

## 8. `var` — local variable type inference

**Use when** the type is obvious from the right-hand side:

```java
var notifications = notificationRepository.findAll();  // List<Notification>
var dto = notificationService.save(request, headers);  // NotificationDto
var mapper = new ObjectMapper();
```

**Avoid when** it obscures the type:

```java
// Bad — what does process() return?
var result = process(data);

// Good
NotificationDto result = process(data);
```

`var` is not valid for method parameters, fields, or return types (compile error).

---

## 9. Stream API — modern idioms

```java
// Java 16+: Stream.toList() — immutable, preferred
List<String> refs = notifications.stream()
        .map(Notification::getReferenceNumber)
        .toList();  // not .collect(Collectors.toList())

// Filtering and mapping
List<NotificationDto> drafts = notifications.stream()
        .filter(n -> n.getStatus() == NotificationStatus.DRAFT)
        .map(notificationMapper::toDto)
        .toList();

// Optional.stream() for flat-mapping
List<NotificationDto> results = referenceNumbers.stream()
        .flatMap(ref -> notificationRepository.findByReferenceNumber(ref).stream())
        .map(notificationMapper::toDto)
        .toList();

// Grouping
Map<NotificationStatus, List<Notification>> byStatus = notifications.stream()
        .collect(Collectors.groupingBy(Notification::getStatus));

// Joining
String refs = notifications.stream()
        .map(Notification::getReferenceNumber)
        .collect(Collectors.joining(", "));

// Count
long draftCount = notifications.stream()
        .filter(n -> n.getStatus() == NotificationStatus.DRAFT)
        .count();
```

**When NOT to use streams:** simple iteration with side effects — a for-each loop is clearer:

```java
// Bad — stream for side effects
notifications.stream().forEach(n -> repository.save(n));

// Good
for (var notification : notifications) {
    repository.save(notification);
}
```

---

## 10. Optional — correct usage

`Optional<T>` is only for **return types**. Never use as method parameter or field.

```java
// Repository returns Optional
Optional<Notification> findByReferenceNumber(String ref);

// Service consumes it
public NotificationDto getByReferenceNumber(String ref) {
    return notificationRepository.findByReferenceNumber(ref)
            .map(notificationMapper::toDto)
            .orElseThrow(() -> new NotFoundException("Not found: " + ref));
}
```

Chaining:

```java
Optional<String> city = getUser()
        .map(User::getAddress)
        .filter(a -> !a.getCity().isBlank())
        .map(Address::getCity);

// With default
String city = getAddress().map(Address::getCity).orElse("Unknown");

// Execute only if present
getNotification(ref).ifPresent(n -> auditService.log(n));

// Execute with or-else action (Java 9)
getNotification(ref).ifPresentOrElse(
        n -> auditService.log(n),
        () -> log.warn("Notification not found: {}", ref));
```

**Anti-patterns:**

```java
// Bad — isPresent() + get()
if (optional.isPresent()) {
    var value = optional.get();  // use orElseThrow instead
}

// Bad — Optional.ofNullable just to check null
if (Optional.ofNullable(x).isPresent()) { ... }  // just use: if (x != null)

// Bad — Optional as parameter
public void process(Optional<String> name) { ... }  // use: process(String name) with null check

// Bad — Optional as field
private Optional<String> name;  // use: private String name; (nullable with @Nullable)
```

---

## 11. Collections — factory methods

```java
// Immutable (preferred for constants, test data)
List<String> codes = List.of("DE", "FR", "NL");
Set<String> allowed = Set.of("DRAFT", "SUBMITTED");
Map<String, String> labels = Map.of("DE", "Germany", "FR", "France");

// More than 10 map entries
Map<String, Integer> scores = Map.ofEntries(
        Map.entry("alice", 95),
        Map.entry("bob", 87),
        Map.entry("carol", 92)
);

// Defensive copy
public record Whitelist(List<String> codes) {
    public Whitelist { codes = List.copyOf(codes); }
}

// Mutable when needed
List<String> mutable = new ArrayList<>(List.of("a", "b"));
Map<String, String> mutableMap = new HashMap<>(Map.of("k", "v"));
```

**Useful Map methods:**

```java
map.getOrDefault("key", "fallback");
map.putIfAbsent("key", "value");
map.computeIfAbsent("key", k -> expensiveCompute(k));
map.merge("key", 1, Integer::sum);
```

---

## 12. String methods

```java
"  hello  ".isBlank()       // true (handles whitespace — prefer over isEmpty())
"  hello  ".strip()         // "hello" (Unicode-aware — prefer over trim())
"  hello  ".stripLeading()  // "hello  "
"  hello  ".stripTrailing() // "  hello"
"ha".repeat(3)              // "hahaha"
"Hello, %s!".formatted(name)  // preferred over String.format()
"line1\nline2".lines()      // Stream<String>
"  ".isBlank()              // true
"".isEmpty()                // true, but "  ".isEmpty() is false
```

---

## 13. Virtual threads (Java 21)

Virtual threads are lightweight, JVM-managed threads — not OS threads. Enable in Spring Boot:

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

Relevant for this service's blocking I/O (MongoDB, RestClient). With virtual threads, each request can have its own thread without exhausting OS thread pools.

No code changes needed — Spring Boot handles the rest.

---

## 14. Sequenced collections (Java 21)

All `List`, `LinkedHashSet`, `LinkedHashMap` now implement `SequencedCollection`/`SequencedMap`:

```java
List<String> list = List.of("a", "b", "c");
list.getFirst();   // "a" — prefer over list.get(0)
list.getLast();    // "c" — prefer over list.get(list.size()-1)
list.reversed();   // reversed view

LinkedHashMap<String, Integer> map = new LinkedHashMap<>();
map.firstEntry();  // Map.Entry for first key
map.lastEntry();
```

---

## 15. Immutability patterns

```java
// Records — naturally immutable
public record NotificationDto(String id, String referenceNumber) {}

// Lombok @Value — immutable class
@Value
public class CommodityCode {
    String code;
    String description;
}

// Defensive copy in constructors
public record Notification(List<String> tags) {
    public Notification { tags = List.copyOf(tags); }  // defensive copy
}

// Builder for complex construction
@Builder
@Data
public class Notification {
    private String id;
    private String referenceNumber;
    private NotificationStatus status;
}
Notification n = Notification.builder()
        .referenceNumber("DRAFT.IMP.2026.1")
        .status(NotificationStatus.DRAFT)
        .build();
```

---

## 16. Anti-patterns — old vs modern

| Old (avoid) | Modern |
|------------|--------|
| `for (int i=0; i<list.size(); i++)` | Enhanced for or stream |
| `.collect(Collectors.toList())` | `.toList()` |
| `(String) obj` without instanceof | Pattern matching `instanceof String s` |
| `new ArrayList<String>()` | `new ArrayList<>()` (diamond) |
| Raw type `List list` | `List<Notification>` |
| `"Hello " + name` in log | `log.info("Hello {}", name)` |
| `if (x == null)` everywhere | `Optional<T>` or `@NonNull` |
| `@Autowired` field injection | Constructor injection + `@RequiredArgsConstructor` |
| `RestTemplate` | `RestClient` |
| `Arrays.asList()` (mutable, fixed) | `List.of()` or `new ArrayList<>()` |
| `optional.get()` | `optional.orElseThrow()` |
| `Optional.ofNullable(x).isPresent()` | `x != null` |
| `Collections.emptyList()` | `List.of()` |
| `new HashMap<String, List<Notification>>()` | `new HashMap<>()` |
| `String.format("%s %s", a, b)` | `"%s %s".formatted(a, b)` |
| `list.get(0)` | `list.getFirst()` |
| `list.get(list.size()-1)` | `list.getLast()` |

---

## 17. I/O hygiene

### Always close `InputStream` / `OutputStream` with try-with-resources

Reading from an `InputStream` returned by an HTTP client or file API and not closing it leaks file descriptors and connections. The leak is invisible in development and shows up under load. Use try-with-resources whenever you obtain a stream.

```java
// Wrong — if readAllBytes() throws, the stream stays open
ResponseEntity<InputStream> resp = httpClient.exchange(/* ... */);
String body = new String(resp.getBody().readAllBytes(), StandardCharsets.UTF_8);

// Correct
ResponseEntity<InputStream> resp = httpClient.exchange(/* ... */);
String body;
try (InputStream is = resp.getBody()) {
    body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
}
```

### Always specify a charset

`String.getBytes()`, `new String(byte[])`, `Files.readString(Path)` overloads without a charset use the **platform default** — UTF-8 on Linux/macOS, often Cp1252 on Windows CI. Tests pass locally and fail in CI on the first non-ASCII character.

```java
// Wrong — platform-dependent
byte[] bytes = "test content".getBytes();
String text = new String(downloadedBytes);

// Correct
import java.nio.charset.StandardCharsets;
byte[] bytes = "test content".getBytes(StandardCharsets.UTF_8);
String text = new String(downloadedBytes, StandardCharsets.UTF_8);
```

The same rule applies to `Files.readString(path, StandardCharsets.UTF_8)`, `Files.writeString(...)`, and `Reader`/`Writer` constructors.

---

## 18. Code style quick-reference

| Convention | Rule |
|-----------|------|
| Package structure | Feature-based (`notification/`, `audit/`, `config/`) |
| DI style | Constructor via `@RequiredArgsConstructor` |
| Logging | `@Slf4j` (Lombok), parameterised `{}` syntax |
| DTOs | Records |
| Mutable entities | `@Data` + `@Builder` (Lombok) |
| Immutable value objects | Records or `@Value` (Lombok) |
| Exception messages | Include the offending identifier |
| Method names | camelCase, verb-noun (`findByReferenceNumber`, `deleteAll`) |
| Constants | `UPPER_SNAKE_CASE` |
| Test method names | `subject_shouldDoWhat` or `subject_shouldDoWhat_whenContext` |
---

## Source: `docs/best-practices/java/testing/unit.md`

# Unit Testing — trade-imports-animals-backend

## Overview

Unit tests run in isolation — no Spring context, no database, no HTTP server. External dependencies are replaced with Mockito mocks. Tests execute in the Maven `test` phase via Surefire.

**Run with:**
```bash
mvn test             # unit tests only
mvn verify           # unit + integration tests
```

---

## File naming convention

| Pattern | Runner | Phase |
|---------|--------|-------|
| `*Test.java` | Maven Surefire | `test` |
| `*IT.java` | Maven Failsafe | `integration-test` / `verify` |

No `@Tag` or `@Category` annotations are used. The `Test` suffix is the only distinction.

---

## Test types

There are three distinct flavours of unit test in this codebase:

| Approach | When to use |
|----------|-------------|
| Pure unit — direct instantiation | Services, exception handlers, interceptors, config classes with no Spring dependencies |
| `@WebMvcTest` slice | Controllers — exercises the full Spring MVC dispatch chain without a real server |
| Annotation-contract tests | Verifying that production classes carry required annotations (`@ConditionalOnProperty`, `@Scheduled`, etc.) |

---

## Pure unit tests

### Setup pattern

Construct the class under test in `@BeforeEach` using its real constructor. Never use `@InjectMocks` — explicit construction makes dependencies visible and avoids silent injection failures.

```java
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private AuditRepository auditRepository;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository, auditRepository);
    }
}
```

Use `@ExtendWith(MockitoExtension.class)` whenever the class under test has collaborators that need mocking. For classes with no dependencies (e.g. a simple exception handler), omit the extension and instantiate directly:

```java
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
    }
}
```

### Mocks

Declare mocks as fields with `@Mock`. Use inline `mock()` only for objects that are local to a single test (e.g. a `BindingResult` created by a test helper):

```java
// Field mock — used across multiple tests
@Mock
private NotificationRepository notificationRepository;

// Inline mock — local to one test or helper
BindingResult bindingResult = mock(BindingResult.class);
when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldErrors));
```

Use `lenient()` stubs in `@BeforeEach` for stubs that not every test exercises — this avoids `UnnecessaryStubbingException` without suppressing the extension:

```java
@BeforeEach
void setUp() throws IOException {
    interceptor = new TraceIdPropagationInterceptor("x-cdp-request-id");
    headers = new HttpHeaders();
    lenient().when(request.getHeaders()).thenReturn(headers);
    lenient().when(execution.execute(any(), any())).thenReturn(response);
}
```

### What to assert — behaviour, not mock interactions

Tests must assert **observable behaviour**: the return value of the method under test, or the state it produces. Do not write tests whose primary assertion is that a mock was called.

**Bad — testing that the mock works as configured:**
```java
// This test would pass even if the production code did nothing useful.
// It just proves that when(repo.save(...)).thenReturn(x) works.
when(repository.save(any())).thenReturn(savedDoc);
service.initiate(ref, request);
ArgumentCaptor<MyDocument> captor = ArgumentCaptor.forClass(MyDocument.class);
verify(repository).save(captor.capture());
assertThat(captor.getValue().getStatus()).isEqualTo(Status.PENDING); // ← mock input, not behaviour
```

**Good — asserting on what the caller receives:**
```java
DocumentUploadResponse response = service.initiate(ref, request);
assertThat(response.uploadId()).isEqualTo("expected-id");
assertThat(response.uploadUrl()).isEqualTo("https://expected-url");
```

**The rule:** if deleting the production code (or making it return a hardcoded wrong value) would still let the test pass, the test is not testing behaviour.

**When `verify()` is acceptable:**

- As a *secondary* check after a meaningful result assertion: fine
- To assert something was *never* called (guards against unwanted side effects): fine
- As the *sole* assertion — only if the method is `void` **and** the side-effect genuinely cannot be observed any other way. In practice this is rare: prefer integration tests with a real database over unit tests that capture mock inputs.

```java
// Fine — secondary verify after a meaningful assertion
assertThat(response.uploadId()).isEqualTo("existing-upload-id");
verify(cdpUploaderClient, never()).initiate(any()); // idempotency guard

// Fine — void method, guarding against unwanted save
verify(repository, never()).save(any());
```

**`void` methods that persist to a database**: if the only way to verify correctness is to inspect what was passed to `repository.save()`, that is a signal to write an integration test instead — not to add an ArgumentCaptor. The IT tests in this project use a real MongoDB container precisely for this reason.

### ArgumentCaptor

Use `ArgumentCaptor` when you need to make assertions on a complex object passed to a collaborator, **and** you have already established that the method produces a correct observable result. Never use it as a substitute for a result assertion.

Prefer `ArgumentCaptor.forClass()` declared inline for one-off captures. For tests that capture repeatedly, declare `@Captor` fields:

```java
// Inline — for a single capture assertion
ArgumentCaptor<Audit> auditCaptor = ArgumentCaptor.forClass(Audit.class);
verify(auditRepository).save(auditCaptor.capture());
Audit saved = auditCaptor.getValue();
assertThat(saved.getResult()).isEqualTo(Result.SUCCESS);

// Field — when capture is needed across multiple tests
@Captor private ArgumentCaptor<HttpRequest> requestCaptor;
@Captor private ArgumentCaptor<byte[]> bodyCaptor;
```

### State cleanup

If a test modifies global state (e.g. SLF4J MDC), clean it up in `@AfterEach`:

```java
@AfterEach
void tearDown() {
    MDC.clear();
}
```

---

## Controller tests — `@WebMvcTest`

Use `@WebMvcTest` (not `@SpringBootTest`) for controller unit tests. It starts the Spring MVC layer only — no database, no full context. MockMvc is auto-configured.

Wire the admin secret via `@TestPropertySource` so the security filter has a value to compare:

```java
@WebMvcTest(NotificationController.class)
@TestPropertySource(properties = "admin.secret=test-secret")
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private NotificationService notificationService;
}
```

Use `@MockitoBean` (not `@Mock`) for service dependencies — Spring needs to inject these into the controller bean.

### HTTP assertions

```java
// GET list
mockMvc.perform(get("/notifications")
        .contentType(MediaType.APPLICATION_JSON))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$").isArray())
    .andExpect(jsonPath("$.length()").value(2))
    .andExpect(jsonPath("$[0].id").value("507f1f77bcf86cd799439011"));

// POST with body
mockMvc.perform(post("/notifications")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(dto)))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.referenceNumber").value(expectedRef));

// DELETE with header
mockMvc.perform(delete("/notifications")
        .contentType(MediaType.APPLICATION_JSON)
        .header("Trade-Imports-Animals-Admin-Secret", "test-secret")
        .content(objectMapper.writeValueAsString(referenceNumbers)))
    .andExpect(status().isNoContent());
```

`@WebMvcTest` also exercises `@ControllerAdvice` handlers. Use it to verify that exceptions thrown by mocked services map to the correct HTTP status codes — this is cheaper than an integration test for basic exception-to-status mapping:

```java
// Validates that NotFoundException → 404 through GlobalExceptionHandler
doThrow(new NotFoundException("not found"))
    .when(notificationService).deleteByReferenceNumbers(any(), any());

mockMvc.perform(delete("/notifications")...)
    .andExpect(status().isNotFound())
    .andExpect(jsonPath("$.detail").value("not found"));
```

---

## Annotation-contract tests

When a production class must carry specific annotations for the application to work correctly (e.g. `@Scheduled`, `@ConditionalOnProperty`), verify this with reflection. Prefer this over integration tests for annotation presence — it runs faster and fails with a clear message.

```java
@Test
void metricsPublisher_shouldHaveScheduledAnnotation() {
    Method publishMethod = EmfMetricsPublisher.class.getMethod("publishMetrics");
    Scheduled scheduled = publishMethod.getAnnotation(Scheduled.class);
    assertThat(scheduled).isNotNull();
    assertThat(scheduled.fixedRate()).isEqualTo(60000L);
}
```

---

## Test method naming

```
{subject}_{shouldDoWhat}
{subject}_{shouldDoWhat}_{whenContext}
```

Use the method name or operation as the subject prefix. Examples:

```
saveOriginOfImport_shouldSaveNewNotificationAndGenerateReferenceNumber
saveOriginOfImport_shouldUpdateExistingNotification
findAll_shouldReturnEmptyList
deleteByReferenceNumbers_shouldThrowNotFoundException_whenOneIsMissing
handleValidationException_shouldReturnBadRequestWithFieldErrors
handleValidationException_shouldHandleNullTraceId
intercept_shouldAddTraceIdHeader_whenMdcContainsTraceId
intercept_shouldNotAddHeader_whenMdcTraceIdIsBlank
post_shouldCreateNotificationAndReturnReferenceNumber
delete_shouldReturn401_whenAdminSecretHeaderIsMissing
```

Do not use `testXxx()` naming — this is an older JUnit 3 convention found in some tests but it is not the standard going forward.

---

## Given / When / Then

All tests use explicit `// Given`, `// When`, `// Then` comment blocks. For short tests `// When & Then` can be combined. Inline comments can supplement the blocks for non-obvious steps:

```java
@Test
void deleteByReferenceNumbers_shouldDeleteAll_whenAllFound() {
    // Given
    String ref1 = "DRAFT.IMP.2026.111";
    Notification n1 = Notification.builder().id("111").referenceNumber(ref1).build();
    when(notificationRepository.findAllByReferenceNumberIn(List.of(ref1))).thenReturn(List.of(n1));
    when(auditRepository.save(any(Audit.class))).thenReturn(new Audit());

    // When
    notificationService.deleteByReferenceNumbers(List.of(ref1), headers);

    // Then — deleteAll is called with the found notifications
    verify(notificationRepository).deleteAll(List.of(n1));

    // And an audit record is saved with SUCCESS
    ArgumentCaptor<Audit> auditCaptor = ArgumentCaptor.forClass(Audit.class);
    verify(auditRepository).save(auditCaptor.capture());
    assertThat(auditCaptor.getValue().getResult()).isEqualTo(Result.SUCCESS);
}
```

---

## Assertions

### AssertJ — primary

AssertJ is the standard assertion library. Do not use JUnit's `assertEquals` / `assertNotNull` — these exist in some older tests but are not the standard going forward.

```java
// Object assertions
assertThat(result).isNotNull();
assertThat(result.getReferenceNumber()).startsWith("DRAFT.IMP." + currentYear + ".");
assertThat(result.getReferenceNumber()).endsWith(generatedId);

// Exception assertions
assertThatThrownBy(() -> service.doSomething(arg))
    .isInstanceOf(NotFoundException.class)
    .hasMessageContaining("DRAFT.IMP.2026.MISSING");

// Collection assertions
assertThat(result).hasSize(3);
assertThat(result).extracting(Notification::getCommodity)
    .containsExactly("Live cattle", "Live sheep", "Live pigs");

// Map assertions
assertThat(errors).hasSize(2);
assertThat(errors.get("origin")).isEqualTo("must not be null");
```

### Mockito verification

```java
// Verify exact call count
verify(notificationRepository, times(2)).save(any(Notification.class));
verify(notificationRepository, times(1)).findAll();

// Verify never called
verify(notificationRepository, never()).deleteAll(anyList());

// Verify call with specific argument
verify(notificationRepository).deleteAll(List.of(n1, n2));
```

### `InOrder` — when call order matters

For cascade operations where the *order* of collaborator calls is part of the contract (delete children before parent, persist before publish, etc.), bare `verify` calls pass even when the order is swapped. Use `InOrder` so a swap fails the test.

```java
// Wrong — both verifies pass even if production swapped the calls
@Test
void deleteByReferenceNumbers_shouldCascade() {
    notificationService.deleteByReferenceNumbers(List.of("REF-1"));

    verify(notificationRepository).deleteAllByReferenceNumberIn(List.of("REF-1"));
    verify(documentService).deleteForNotificationRefs(List.of("REF-1"));
}

// Correct — fails if children are deleted after parent (orphan-window bug)
@Test
void deleteByReferenceNumbers_shouldDeleteDocumentsBeforeNotifications() {
    notificationService.deleteByReferenceNumbers(List.of("REF-1"));

    InOrder inOrder = inOrder(documentService, notificationRepository);
    inOrder.verify(documentService).deleteForNotificationRefs(List.of("REF-1"));
    inOrder.verify(notificationRepository).deleteAllByReferenceNumberIn(List.of("REF-1"));
}
```

Use this whenever a service composes two or more collaborator calls whose ordering is load-bearing. Without `InOrder`, the test green-lights any permutation.

---

## Helper methods

Extract repeated setup into private helpers — do not inline complex construction in every test:

```java
// Private helper for audit-relevant headers
private HttpHeaders headersWithAuditFields() {
    HttpHeaders headers = new HttpHeaders();
    headers.add("x-cdp-request-id", "test-trace-id");
    headers.add("User-Id", "test-user-id");
    return headers;
}

// Private helper for constructing hard-to-create exceptions
private MethodArgumentNotValidException createValidationException(FieldError... fieldErrors) {
    // ...
}
```

---

## What the existing unit tests cover

| Class | Tests | What it covers |
|-------|-------|----------------|
| `NotificationControllerTest` | 8 | MVC dispatch, request/response serialisation, admin secret enforcement, NotFoundException → 404, empty-list validation |
| `NotificationServiceTest` | 10 | Save new (two-phase: ID then reference), save existing (upsert), findAll, delete all-found, delete with missing (NotFoundException + FAILURE audit), delete empty list (no-op) |
| `GlobalExceptionHandlerTest` | 9 | Validation → 400, NotFoundException → 404, ConflictException → 409, generic Exception → 500, traceId from MDC, null traceId handling |
| `TraceIdPropagationInterceptorTest` | 6 | Header set when MDC populated, not set when null/blank/empty, overwrites existing header, body passed through unchanged |
| `EmfMetricsPublisherTest` | ~4 | Metrics publish scheduling, meter registry interactions |
| `MetricsConfigTest` | ~3 | MeterRegistry bean creation, publisher registration |
| `MetricsConfigurationPropertiesTest` | ~3 | Annotation contracts: `@ConditionalOnProperty`, `@Service`, `@Scheduled(fixedRate=60000)` |
| `CertificateLoaderTest` | ~5 | null/empty/valid/invalid certificate paths |
| `CacheConfigTest` | ~3 | Caffeine spec construction, CacheManager bean |
| `ApplicationTest` | 0 | Placeholder only — no assertions |

---

## Source: `docs/best-practices/java/testing/integration.md`

# Integration Testing — trade-imports-animals-backend

## Overview

Integration tests use a real Spring Boot context with Testcontainers for all external dependencies. There are no mocks of infrastructure — MongoDB, OAuth2, and external HTTP services all run as real containers.

**Run with:**
```bash
mvn verify          # unit + integration tests
mvn test            # unit tests only
mvn verify -DskipTests=true  # skip all tests
```

---

## File naming convention

| Pattern | Runner | Phase |
|---------|--------|-------|
| `*Test.java` | Maven Surefire | `test` |
| `*IT.java` | Maven Failsafe | `integration-test` / `verify` |

No `@Tag` or `@Category` annotations are used. The `IT` suffix is the only distinction.

---

## Architecture

### `IntegrationBase` — the only base class

All IT classes extend `IntegrationBase`. Never instantiate containers or configure Spring properties in an IT class itself.

```
IntegrationBase (abstract)
├── @SpringBootTest(webEnvironment = RANDOM_PORT)
├── @ActiveProfiles("integration-test")
├── 3 static Testcontainers (shared across all subclasses)
├── @DynamicPropertySource (wires container URLs into Spring)
└── Helper methods: webClient(), getToken(), usingStub(), getJsonFromFile()

NotificationIT extends IntegrationBase
MongoConfigIT extends IntegrationBase
HealthCheckConfigIT extends IntegrationBase
EcsLoggingIT extends IntegrationBase
ProxyConfigIT extends IntegrationBase
TrustStoreConfigurationIT extends IntegrationBase
DocumentIT extends IntegrationBase  (also owns its own Floci container)
```

### Containers

Three containers start once in `IntegrationBase`, shared across all IT classes via static fields and `Startables.deepStart()`:

| Container | Image | Purpose |
|-----------|-------|---------|
| `MONGO_CONTAINER` | `mongo:7.0` | Primary data store |
| `OAUTH_CONTAINER` | `ghcr.io/navikt/mock-oauth2-server:2.1.10` | JWT token generation |
| `MOCK_SERVER_CONTAINER` | `mockserver/mockserver` | Stub external HTTP services (cdp-uploader etc.) |

IT classes that need additional infrastructure start their own containers as static fields and register their URLs via a second `@DynamicPropertySource` on the subclass. Example: `DocumentIT` adds a Floci S3 container:

| Container | Image | Purpose | Owner |
|-----------|-------|---------|-------|
| `FLOCI_CONTAINER` | `floci/floci:latest` | Real S3 for file upload/download | `DocumentIT` |

Containers are started in parallel:
```java
static {
    Startables.deepStart(OAUTH_CONTAINER, MONGO_CONTAINER, MOCK_SERVER_CONTAINER).join();
}
```

Their URLs are wired into the Spring context via `@DynamicPropertySource` before the context starts — this is how Testcontainers integrates with Spring Boot's property system.

**Docker API version:** Docker Desktop 4.52+ requires API v1.44. The `maven-failsafe-plugin` is configured with `<api.version>1.44</api.version>` as a system property to match. If you see `IllegalStateException: Could not find a valid Docker environment`, check your `~/.testcontainers.properties` has `docker.host=unix:///var/run/docker.sock`.

### Spring profile

`@ActiveProfiles("integration-test")` activates `application-integration-test.yml` in `src/test/resources/`. Key settings in that file:

- MongoDB SSL disabled
- `admin.secret` set to `test-admin-secret`
- Actuator: only `/health` exposed, no component details
- MongoDB health check disabled
- AWS EMF metrics disabled

---

## Writing an IT class

### Minimal structure

```java
class MyFeatureIT extends IntegrationBase {

    @Autowired
    private MyRepository myRepository;

    @BeforeEach
    void setUp() {
        myRepository.deleteAll();
    }

    @Test
    void post_shouldCreateRecord() {
        // Given
        MyDto dto = new MyDto("value");

        // When / Then
        webClient("NoAuth")
            .post()
            .uri("/my-endpoint")
            .bodyValue(dto)
            .exchange()
            .expectStatus().isOk()
            .expectBody(MyEntity.class)
            .returnResult();
    }
}
```

### Test method naming

```
{subject}_{shouldDoWhat}
{subject}_{shouldDoWhat}_{whenContext}
```

Examples:
```
post_shouldCreateNewNotification
delete_shouldReturn401_whenAdminSecretHeaderIsMissing
findAll_shouldReturnEmptyList_whenNoNotifications
fullCrudFlow_shouldWorkEndToEnd
```

Use the HTTP method or operation as the subject prefix (`post_`, `delete_`, `findAll_`). For multi-step scenarios use a descriptive name (`fullCrudFlow_`).

### Given / When / Then

All tests use explicit `// Given`, `// When`, `// Then` comments. For short tests the When and Then can be combined via the fluent chain, but the comment blocks must still be present.

---

## HTTP testing

### Primary client — `WebTestClient`

Use `webClient(clientType)` from `IntegrationBase` for all HTTP calls. It binds to the Spring Boot server on the random port and injects a Bearer token automatically.

```java
// GET — list
List<Notification> result = webClient("NoAuth")
    .get()
    .uri("/notifications")
    .exchange()
    .expectStatus().isOk()
    .expectBodyList(Notification.class)
    .returnResult().getResponseBody();

// POST — create
EntityExchangeResult<Notification> result = webClient("NoAuth")
    .post()
    .uri("/notifications")
    .bodyValue(dto)
    .exchange()
    .expectStatus().isOk()
    .expectBody(Notification.class)
    .returnResult();

// DELETE — with headers
webClient("NoAuth")
    .method(HttpMethod.DELETE).uri("/notifications")
    .header("Trade-Imports-Animals-Admin-Secret", "test-admin-secret")
    .header("x-cdp-request-id", "trace-001")
    .header("User-Id", "user-001")
    .bodyValue(List.of(ref1, ref2))
    .exchange()
    .expectStatus().isNoContent();
```

### When to use `TestRestTemplate` instead

Use `TestRestTemplate` (not `WebTestClient`) when testing actuator endpoints. MockMvc only exercises the Spring MVC layer and misses actuator's separate servlet context. See `HealthCheckConfigIT` for the pattern.

### When to use `MockMvc` instead

Use `MockMvc` (with `@AutoConfigureMockMvc` on the class) when you need to verify behaviour that requires capturing side effects like log output. See `EcsLoggingIT` for the pattern.

---

## Database

### Clean state per test

`@BeforeEach` must delete all relevant repositories. Never rely on test execution order.

```java
@BeforeEach
void setUp() {
    notificationRepository.deleteAll();
    auditRepository.deleteAll();
}
```

### Direct repository assertions

Inject Spring Data repositories to assert persistence directly — don't infer DB state from HTTP responses alone for critical business logic:

```java
@Autowired
private NotificationRepository notificationRepository;

// After the HTTP call:
Notification persisted = notificationRepository.findById(id).orElse(null);
assertThat(persisted).isNotNull();
assertThat(persisted.getOrigin().getCountryCode()).isEqualTo("BE");
```

---

## Authentication

### JWT tokens

`webClient("NoAuth")` calls `getToken("NoAuth")` internally, which POSTs to the OAuth mock container and returns a JWT. The token is set as `Authorization: Bearer {token}` on every request.

The `clientType` string maps to mock OAuth client configurations. `"NoAuth"` is the standard test client.

### Admin secret

Endpoints protected by the admin secret header require:
```java
.header("Trade-Imports-Animals-Admin-Secret", "test-admin-secret")
```

`test-admin-secret` matches the value configured in `application-integration-test.yml`. Always use the constant rather than hardcoding the string in each test:

```java
private static final String ADMIN_SECRET_HEADER = "Trade-Imports-Animals-Admin-Secret";
private static final String VALID_ADMIN_SECRET = "test-admin-secret";
```

---

## Stubbing external services

Use `usingStub()` to get a `MockServerClient` for any external HTTP dependency declared in `SERVICES_TO_MOCK`:

```java
usingStub()
    .when(request().withMethod("GET").withPath("/some/external/path"))
    .respond(response().withStatusCode(200).withBody(getJsonFromFile("response.json")));
```

Put stub JSON fixtures in `src/test/resources/`. Use `getJsonFromFile("filename.json")` to load them.

The base class `@AfterEach tearDown()` resets all stubs after each test — you do not need to clean up stubs manually.

---

## Assertions

### AssertJ — primary

```java
assertThat(created).isNotNull();
assertThat(created.getReferenceNumber()).startsWith("DRAFT.IMP.");
assertThat(created.getReferenceNumber()).matches("DRAFT\\.IMP\\.\\d{4}\\..+");

// Collections
assertThat(notifications).hasSize(3);
assertThat(notifications)
    .extracting(n -> n.getOrigin().getCountryCode())
    .containsExactlyInAnyOrder("GB", "IE", "FR");

// With context label (use on non-obvious assertions)
assertThat(duration)
    .as("Health check should respond quickly without database connectivity checks")
    .isLessThan(1000L);
```

### WebTestClient — HTTP response assertions

```java
.expectStatus().isOk()
.expectStatus().isNoContent()
.expectStatus().isNotFound()
.expectStatus().isBadRequest()
.expectStatus().isUnauthorized()

// JSON path assertions on error responses
.expectBody()
.jsonPath("$.status").isEqualTo(404)
.jsonPath("$.detail").value(Matchers.containsString("DRAFT.IMP.2026.DOESNOTEXIST"))
```

---

## Coverage

JaCoCo enforces **65% line coverage** at the `verify` phase. Build fails if coverage drops below this threshold. No exclusions are configured — all production code counts.

---

## What the existing ITs cover

| Class | Tests | What it covers |
|-------|-------|---------------|
| `NotificationIT` | 18 | Full CRUD, upsert semantics, reference number generation, audit trail, admin auth, atomic delete, input validation |
| `DocumentIT` | 15 | Initiate → PENDING record, scan callback (complete/rejected/mixed/null numberOfRejectedFiles), list, get, file download from real S3, 404 paths, S3 error path, rejected file guard, dateOfIssue persistence |
| `MongoConfigIT` | 5 | MongoDB connection, read preference, write concern, basic document operations |
| `HealthCheckConfigIT` | 8 | Actuator endpoint exposure, security (no details, no env/metrics/info), CDP path requirements, response time |
| `EcsLoggingIT` | 3 | ECS JSON log format, required CDP fields, trace ID propagation, health endpoint log filtering |
| `ProxyConfigIT` | 3 | HTTP proxy env var handling, system property propagation, graceful handling when proxy absent |
| `TrustStoreConfigurationIT` | 3 | SSLContext creation, X509 certificate loading, null certificate handling |

---

## Source: `docs/best-practices/java/spring-data-mongodb.md`

# Spring Data MongoDB — Best Practices

Project baseline: Spring Data MongoDB (Spring Boot 3.5), Java 25, real MongoDB in integration tests via Testcontainers. No mocks of the database layer.

---

## 1. Document mapping

```java
@Document(collection = "notifications")
@Builder
@Data
public class Notification {

    @Id
    private String id;  // MongoDB ObjectId stored as String

    @Indexed(sparse = true, unique = true)
    private String referenceNumber;

    @Field("origin_country")  // override field name in MongoDB
    private String originCountry;

    @Indexed
    private NotificationStatus status;

    @Transient  // not persisted to MongoDB
    private String computedField;

    @Version  // optimistic locking — auto-incremented on each save
    private Long version;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
```

Enable auditing in config:

```java
@Configuration
@EnableMongoAuditing
@EnableMongoRepositories
public class MongoConfig extends AbstractMongoClientConfiguration {

    @Value("${spring.data.mongodb.uri}")
    private String mongoUri;

    @Override
    protected String getDatabaseName() {
        return "trade-imports";
    }

    @Override
    public MongoClient mongoClient() {
        var settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(mongoUri))
                .applyToSslSettings(ssl -> ssl.enabled(useSsl()))
                .applyToConnectionPoolSettings(pool -> pool
                        .maxSize(50)
                        .minSize(5)
                        .maxWaitTime(5, TimeUnit.SECONDS))
                .build();
        return MongoClients.create(settings);
    }
}
```

Annotation reference:

| Annotation | Purpose |
|-----------|---------|
| `@Document(collection)` | Maps class to a MongoDB collection |
| `@Id` | Marks the document ID field |
| `@Field("name")` | Overrides the field name in MongoDB |
| `@Indexed` | Creates a single-field index |
| `@Indexed(unique = true)` | Unique index |
| `@Indexed(sparse = true)` | Sparse index (excludes null values) |
| `@CompoundIndex` | Multi-field index (at class level) |
| `@TextIndexed` | Full-text search index |
| `@Transient` | Exclude field from persistence |
| `@Version` | Optimistic locking version field |
| `@CreatedDate` | Auto-set on insert (requires `@EnableMongoAuditing`) |
| `@LastModifiedDate` | Auto-set on save |
| `@DBRef` | Reference to another document (avoid — use `@DocumentReference`) |
| `@DocumentReference` | Lazy reference with lookup (prefer over `@DBRef`) |

---

## 2. Repository pattern

```java
// Standard — extend MongoRepository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    // Derived query methods — Spring Data generates the query from the method name
    Optional<Notification> findByReferenceNumber(String referenceNumber);
    List<Notification> findAllByStatus(NotificationStatus status);
    List<Notification> findAllByReferenceNumberIn(List<String> referenceNumbers);
    boolean existsByReferenceNumber(String referenceNumber);
    long countByStatus(NotificationStatus status);
    void deleteByReferenceNumber(String referenceNumber);

    // Sorting and limiting
    List<Notification> findTop10ByStatusOrderByCreatedAtDesc(NotificationStatus status);

    // Custom query with MongoDB JSON
    @Query("{ 'status': ?0, 'origin.countryCode': ?1 }")
    List<Notification> findByStatusAndCountry(NotificationStatus status, String countryCode);

    // Exists check with query
    @Query(value = "{ 'referenceNumber': ?0 }", exists = true)
    boolean existsByRef(String referenceNumber);

    // Count only
    @Query(value = "{ 'status': ?0 }", count = true)
    long countByStatusQuery(String status);

    // Aggregation pipeline
    @Aggregation(pipeline = {
        "{ $match: { 'status': ?0 } }",
        "{ $group: { _id: '$origin.countryCode', count: { $sum: 1 } } }",
        "{ $sort: { count: -1 } }"
    })
    List<CountByCountry> countGroupedByCountry(NotificationStatus status);
}
```

**Derived query keyword table:**

| Keyword | MongoDB operator | Example |
|---------|-----------------|---------|
| `findBy` | `$eq` | `findByReferenceNumber` |
| `findAllBy` | multiple docs | `findAllByStatus` |
| `findByAnd` | `$and` | `findByStatusAndCountryCode` |
| `findByOr` | `$or` | `findByStatusOrCountryCode` |
| `findByIn` | `$in` | `findByStatusIn(List)` |
| `findByNot` | `$ne` | `findByStatusNot` |
| `findByNull` | `$exists: false` | `findByApprovedAtNull` |
| `findByNotNull` | `$exists: true` | `findByApprovedAtNotNull` |
| `findByGreaterThan` | `$gt` | `findByCreatedAtGreaterThan` |
| `findByLessThan` | `$lt` | `findByCreatedAtLessThan` |
| `findByLike` | regex | `findByReferenceNumberLike` |
| `findByContaining` | regex | `findByNotesContaining` |
| `OrderBy...Asc/Desc` | `$sort` | `findAllByStatusOrderByCreatedAtDesc` |
| `findTop/First N` | `$limit` | `findTop5ByStatus` |

---

## 3. MongoTemplate

Use `MongoTemplate` for complex queries that can't be expressed via derived methods:

```java
@Service
@RequiredArgsConstructor
public class NotificationQueryService {

    private final MongoTemplate mongoTemplate;

    // Find with Criteria
    public List<Notification> findByStatusAndDateRange(
            NotificationStatus status, Instant from, Instant to) {
        var criteria = Criteria.where("status").is(status)
                .and("createdAt").gte(from).lte(to);
        return mongoTemplate.find(new Query(criteria), Notification.class);
    }

    // Upsert
    public void upsertByReferenceNumber(Notification notification) {
        var query = Query.query(Criteria.where("referenceNumber")
                .is(notification.getReferenceNumber()));
        var update = new Update()
                .set("status", notification.getStatus())
                .set("updatedAt", Instant.now())
                .setOnInsert("createdAt", Instant.now());
        mongoTemplate.upsert(query, update, Notification.class);
    }

    // Update only specific fields (avoid full document replacement)
    public void updateStatus(String referenceNumber, NotificationStatus newStatus) {
        var query = Query.query(Criteria.where("referenceNumber").is(referenceNumber));
        var update = Update.update("status", newStatus)
                .set("updatedAt", Instant.now());
        mongoTemplate.updateFirst(query, update, Notification.class);
    }

    // Find and modify (atomic)
    public Notification claimForProcessing(String referenceNumber) {
        var query = Query.query(Criteria.where("referenceNumber").is(referenceNumber)
                .and("status").is(NotificationStatus.SUBMITTED));
        var update = Update.update("status", NotificationStatus.PROCESSING)
                .set("processingStartedAt", Instant.now());
        return mongoTemplate.findAndModify(query, update,
                FindAndModifyOptions.options().returnNew(true),
                Notification.class);
    }

    // Bulk delete
    public void deleteByReferenceNumbers(List<String> referenceNumbers) {
        var query = Query.query(Criteria.where("referenceNumber").in(referenceNumbers));
        mongoTemplate.remove(query, Notification.class);
    }
}
```

---

## 4. Aggregation pipeline

```java
@Service
@RequiredArgsConstructor
public class NotificationAggregationService {

    private final MongoTemplate mongoTemplate;

    public List<StatusSummary> getStatusSummary() {
        var aggregation = Aggregation.newAggregation(
                // $match
                Aggregation.match(Criteria.where("status").ne(NotificationStatus.CANCELLED)),
                // $group
                Aggregation.group("status")
                        .count().as("total")
                        .first("createdAt").as("oldestCreatedAt"),
                // $project
                Aggregation.project("total", "oldestCreatedAt")
                        .and("_id").as("status"),
                // $sort
                Aggregation.sort(Sort.Direction.DESC, "total")
        );

        return mongoTemplate.aggregate(aggregation, "notifications", StatusSummary.class)
                .getMappedResults();
    }

    // $lookup (join)
    public List<NotificationWithAudit> getWithAuditHistory(String referenceNumber) {
        var aggregation = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("referenceNumber").is(referenceNumber)),
                Aggregation.lookup("audit_records", "referenceNumber",
                        "referenceNumber", "auditHistory"),
                Aggregation.unwind("auditHistory", true)  // preserveNullAndEmpty=true
        );

        return mongoTemplate.aggregate(aggregation, "notifications",
                NotificationWithAudit.class).getMappedResults();
    }
}
```

---

## 5. Projections

Fetch only the fields you need — reduces network and memory overhead:

```java
// Interface projection
public interface NotificationSummary {
    String getReferenceNumber();
    NotificationStatus getStatus();
    Instant getCreatedAt();
}

// Use in repository
List<NotificationSummary> findSummariesByStatus(NotificationStatus status);

// DTO projection with record
public record NotificationRef(String referenceNumber, NotificationStatus status) {}

// Use with @Query
@Query(value = "{ 'status': ?0 }", fields = "{ 'referenceNumber': 1, 'status': 1 }")
List<NotificationRef> findRefsByStatus(NotificationStatus status);

// Dynamic projection
<T> List<T> findByStatus(NotificationStatus status, Class<T> type);
// Call as: repository.findByStatus(DRAFT, NotificationSummary.class)
```

---

## 6. Indexes

**Match indexes to your query patterns.** A repository method that filters on two fields needs a compound index on those fields, otherwise Mongo loads matching documents into memory and filters there. The cost is invisible until production data volumes catch up — review the actual derived queries when the entity is added, not later.

```java
public interface AccompanyingDocumentRepository extends MongoRepository<AccompanyingDocument, String> {
    // Filters on (notificationReferenceNumber, scanStatus) — needs a compound index
    Optional<AccompanyingDocument> findFirstByNotificationReferenceNumberAndScanStatus(
            String notificationReferenceNumber, ScanStatus scanStatus);
}
```

```java
@Document
@CompoundIndex(name = "ref_status",
               def = "{'notificationReferenceNumber': 1, 'scanStatus': 1}")
public class AccompanyingDocument { /* ... */ }
```

**Partial unique indexes for stateful invariants.** When the unique constraint applies only to a subset of documents (e.g. "at most one PENDING document per notification ref"), use `partialFilter` so completed/rejected documents don't compete for the unique slot.

```java
@Document
@CompoundIndex(
    name = "one_pending_per_ref",
    def = "{'notificationReferenceNumber': 1, 'scanStatus': 1}",
    unique = true,
    partialFilter = "{ 'scanStatus': 'PENDING' }"
)
public class AccompanyingDocument { /* ... */ }
```

**Annotation-based** (auto-created on startup — disable in production):

```java
@Document
@CompoundIndex(name = "status_created", def = "{'status': 1, 'createdAt': -1}")
public class Notification {
    @Id private String id;
    @Indexed(unique = true, sparse = true) private String referenceNumber;
    @Indexed private NotificationStatus status;
    @Indexed(expireAfterSeconds = 86400) private Instant expiresAt;  // TTL index
}
```

**Disable auto-creation in production** (index creation locks collections):

```yaml
spring:
  data:
    mongodb:
      auto-index-creation: false  # manage indexes via migration scripts
```

**Programmatic index creation** (for migration scripts / integration tests):

```java
@Component
@RequiredArgsConstructor
public class MongoIndexCreator {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    public void createIndexes() {
        var indexOps = mongoTemplate.indexOps(Notification.class);

        indexOps.ensureIndex(new Index()
                .on("referenceNumber", Sort.Direction.ASC)
                .unique()
                .sparse()
                .named("unique_reference_number"));

        indexOps.ensureIndex(new Index()
                .on("status", Sort.Direction.ASC)
                .on("createdAt", Sort.Direction.DESC)
                .named("status_created_at"));
    }
}
```

---

## 7. Pagination and sorting

```java
public interface NotificationRepository extends MongoRepository<Notification, String> {

    // Pageable — returns full count (extra query)
    Page<Notification> findByStatus(NotificationStatus status, Pageable pageable);

    // Slice — no count query, just hasNext()
    Slice<Notification> findByStatusOrderByCreatedAtDesc(NotificationStatus status, Pageable pageable);
}

// Usage
var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
var page = repository.findByStatus(NotificationStatus.DRAFT, pageable);

page.getContent();      // List<Notification>
page.getTotalElements(); // long
page.getTotalPages();    // int
page.hasNext();          // boolean
page.getNumber();        // current page (0-based)
```

---

## 8. Custom converters

```java
// Writing converter — Java type → MongoDB type
@WritingConverter
public class NotificationStatusToStringConverter
        implements Converter<NotificationStatus, String> {
    @Override
    public String convert(NotificationStatus source) {
        return source.name().toLowerCase();
    }
}

// Reading converter — MongoDB type → Java type
@ReadingConverter
public class StringToNotificationStatusConverter
        implements Converter<String, NotificationStatus> {
    @Override
    public NotificationStatus convert(String source) {
        return NotificationStatus.valueOf(source.toUpperCase());
    }
}

// Register in MongoConfig
@Override
public MongoCustomConversions customConversions() {
    return new MongoCustomConversions(List.of(
            new NotificationStatusToStringConverter(),
            new StringToNotificationStatusConverter()));
}
```

---

## 9. Transactions

Requires a MongoDB replica set (or `mongo:7` with `--replSet`). Integration tests use `MongoDBContainer` which starts with replica set support.

```java
@Service
@Transactional  // applies to all methods
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AuditRepository auditRepository;

    @Transactional  // explicit — redundant here but documents intent
    public NotificationDto save(NotificationRequest request, HttpHeaders headers) {
        var notification = notificationMapper.toEntity(request);
        var saved = notificationRepository.save(notification);

        // Both saves are in the same transaction — either both succeed or both roll back
        var audit = Audit.builder()
                .referenceNumber(saved.getReferenceNumber())
                .result(Result.SUCCESS)
                .userId(headers.getFirst("User-Id"))
                .build();
        auditRepository.save(audit);

        return notificationMapper.toDto(saved);
    }
}
```

Transaction manager bean:

```java
@Bean
public MongoTransactionManager transactionManager(MongoDatabaseFactory factory) {
    return new MongoTransactionManager(factory);
}
```

**Cascade deletes across collections must be `@Transactional`.** A common shape is "delete a notification *and* all its child documents". Without a transaction, a failure between the two deletes leaves orphaned children. Wrap the cascade in a single `@Transactional` method.

```java
// Wrong — non-atomic, leaves orphans on partial failure
public void deleteByReferenceNumbers(List<String> refs) {
    notificationRepository.deleteAllByReferenceNumberIn(refs);
    documentService.deleteForNotificationRefs(refs);  // crash here = orphans
}

// Correct
@Transactional
public void deleteByReferenceNumbers(List<String> refs) {
    notificationRepository.deleteAllByReferenceNumberIn(refs);
    documentService.deleteForNotificationRefs(refs);
}
```

---

## 9a. Lombok hygiene on entities

`@Data` and `@Builder` are convenient but combine in ways that bite at runtime. The defaults below prevent the most common gotchas on entities with mutable fields (lists, maps).

**Keep `@AllArgsConstructor` private when using `@Builder`.**

The all-args constructor bypasses `@Builder.Default`, so calling it directly silently produces an entity in an invalid state (e.g. `files` is `null` instead of an empty list). Make it private so the only public construction path is the builder.

```java
// Wrong — public AllArgsConstructor lets callers skip @Builder.Default
@Document @Data @Builder
@AllArgsConstructor
public class AccompanyingDocument {
    @Builder.Default private List<UploadedFile> files = new ArrayList<>();
}
new AccompanyingDocument(/*…*/, null);   // compiles, files is null

// Correct — only builder() constructs valid instances
@Document @Data @Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AccompanyingDocument {
    @Builder.Default private List<UploadedFile> files = new ArrayList<>();
}
```

**`@Data` + mutable list = unsafe `equals` / `hashCode`.**

`@Data` generates `equals`/`hashCode` over every field, including mutable lists. An entity placed in a `Set` or used as a `Map` key changes its hash code when the list mutates — collection lookups silently break. Restrict equality to the `@Id` field on entities you store in collections.

```java
@Document @Data @Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class AccompanyingDocument {
    @Id
    @EqualsAndHashCode.Include
    private String id;

    private List<UploadedFile> files;  // not part of equality
}
```

This is project policy for any `@Document` class with mutable collection fields. For pure value records with all-immutable fields, the default `@Data` equality is fine.

**Constraints:**
- Transactions require MongoDB 4.0+ replica set
- No collection creation inside a transaction
- `count()` in transactions uses `countDocuments()` (not `count()`)
- Standalone MongoDB (single node, no replica set) does not support transactions

---

## 10. Connection configuration

```yaml
spring:
  data:
    mongodb:
      uri: ${MONGO_URI:mongodb://localhost:27017/trade-imports}
      auto-index-creation: false
```

Connection pool tuning (via programmatic config):

| Setting | Purpose | Recommended |
|---------|---------|------------|
| `maxSize` | Max connections in pool | 50–100 (depends on pod count) |
| `minSize` | Min connections to keep open | 5 |
| `maxWaitTime` | Max time to wait for connection | 5s |
| `maxConnectionLifeTime` | Force reconnect after this time | 30m |
| `maxConnectionIdleTime` | Close idle connections after | 10m |
| `connectTimeout` | Initial connection timeout | 10s |
| `socketTimeout` | Socket read timeout | 30s |

TLS (production):

```java
applyToSslSettings(ssl -> ssl
    .enabled(true)
    .invalidHostNameAllowed(false))
```

Read preference and write concern:

```java
.readPreference(ReadPreference.secondaryPreferred())  // reads from secondaries
.writeConcern(WriteConcern.MAJORITY)  // wait for majority acknowledgment
```

---

## 11. Testing with Testcontainers

This project uses an `IntegrationBase` pattern with `Startables.deepStart()`:

```java
@SpringBootTest
@Testcontainers
public abstract class IntegrationBase {

    @Container
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        // getReplicaSetUrl() — not getConnectionString() — required for transactions
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
    }

    @BeforeEach
    void cleanDatabase(@Autowired MongoTemplate mongoTemplate) {
        mongoTemplate.getDb().listCollectionNames().forEach(name ->
                mongoTemplate.dropCollection(name));
    }
}
```

**`getReplicaSetUrl()` vs `getConnectionString()`**: always use `getReplicaSetUrl()` — it includes the `replicaSet=docker-rs` parameter which enables transactions.

Test lifecycle:

```java
@SpringBootTest
class NotificationServiceIT extends IntegrationBase {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    void save_shouldPersistAndReturnDto() {
        // Given
        var request = new NotificationRequest("DRAFT.IMP.2026.1", origin);

        // When
        var result = notificationService.save(request, new HttpHeaders());

        // Then
        assertThat(result.referenceNumber()).isEqualTo("DRAFT.IMP.2026.1");
        var saved = notificationRepository.findByReferenceNumber("DRAFT.IMP.2026.1");
        assertThat(saved).isPresent();
        assertThat(saved.get().getStatus()).isEqualTo(NotificationStatus.DRAFT);
    }
}
```

---

## 12. Common mistakes

**1. N+1 via `@DBRef`**
```java
// Wrong — @DBRef triggers a separate DB query per document
@DBRef
private Commodity commodity;

// Correct — embed the data you always need, or use @DocumentReference with lazy loading
@DocumentReference(lazy = true)
private Commodity commodity;

// Best — embed a summary record if you always need basic fields
private CommoditySummary commodity;  // embedded subdocument
```

**2. Missing indexes on query fields**
```java
// Wrong — full collection scan
List<Notification> findByStatus(NotificationStatus status);  // no index on status

// Correct — add @Indexed
@Indexed
private NotificationStatus status;
```

**3. ObjectId vs String type mismatch**
```java
// Wrong — storing ObjectId but querying as String
Criteria.where("_id").is("507f1f77bcf86cd799439011")  // String won't match ObjectId

// Correct — convert to ObjectId
Criteria.where("_id").is(new ObjectId("507f1f77bcf86cd799439011"))

// Easiest — declare @Id as String (Spring Data converts automatically)
@Id
private String id;  // Spring Data handles ObjectId ↔ String conversion
```

**4. `LocalDateTime` timezone drift**
```java
// Wrong — LocalDateTime has no timezone, stored as local time
private LocalDateTime createdAt;

// Correct — always use Instant (UTC)
private Instant createdAt;
```

**5. Unbounded `findAll()` in production**
```java
// Wrong — could return millions of documents
List<Notification> all = repository.findAll();

// Correct — always paginate or filter
Page<Notification> page = repository.findByStatus(DRAFT, PageRequest.of(0, 100));
```

**6. Double-save anti-pattern**
```java
// Wrong — save() + save() causes two writes and unnecessary version conflicts
var saved = repository.save(notification);
saved.setReferenceNumber(generateRef(saved.getId()));
repository.save(saved);  // second save

// Correct — compute everything before saving
notification.setReferenceNumber(generateRef());
repository.save(notification);
```

**7. `DuplicateKeyException` not caught**
```java
// Always handle duplicate key on unique indexes
try {
    repository.save(notification);
} catch (DuplicateKeyException e) {
    throw new ConflictException("Notification already exists: " + notification.getReferenceNumber());
}
```

**8. Transactions on standalone MongoDB**
`@Transactional` will silently succeed on standalone MongoDB but without atomicity. Integration tests must use `MongoDBContainer` (which has a replica set) to catch transaction-related bugs.

**9. Auto-index creation in production**
`spring.data.mongodb.auto-index-creation=true` causes index creation on every startup, which acquires a lock and can cause timeouts under load. Set to `false` in production; manage indexes via migration scripts.

**10. Using `count()` in a transaction**
`mongoTemplate.count(query, class)` uses the deprecated `count` command which doesn't support transactions. Use `mongoTemplate.exactCount(query, class)` or `repository.countBy...()` instead.

---

## Source: `docs/best-practices/java/openapi-springdoc.md`

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
---

## Source: `docs/best-practices/java/aws-sdk-v2.md`

# AWS SDK for Java v2 — Best Practices

Project baseline: AWS SDK v2 `2.40.2`, Spring Boot 3.5, Java 25. Current usage: `sts` and `cognitoidentity` for credential/token handling. S3, SQS, SNS are not yet added but are planned.

---

## 1. SDK v2 vs v1 key differences

| Aspect | SDK v1 (`com.amazonaws.*`) | SDK v2 (`software.amazon.awssdk.*`) |
|--------|--------------------------|-------------------------------------|
| Package | `com.amazonaws` | `software.amazon.awssdk` |
| Client naming | `AmazonS3`, `AmazonSQS` | `S3Client`, `SqsClient` |
| Request objects | Mutable beans | Immutable builders |
| Response objects | Mutable beans | Immutable, typed |
| Async | `AmazonS3Async` | `S3AsyncClient` (separate) |
| HTTP client | Apache HttpClient (bundled) | Pluggable (`url-connection-client`, `apache-client`) |
| Credentials | `AWSCredentialsProvider` | `AwsCredentialsProvider` |
| Region | `Regions.EU_WEST_2` | `Region.EU_WEST_2` |
| Config | Mutable setters | Fluent builders |

**Never mix v1 and v2** in the same service. All new code uses v2.

---

## 2. Maven BOM and dependencies

Import the BOM in `<dependencyManagement>` — this manages all SDK module versions:

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>software.amazon.awssdk</groupId>
      <artifactId>bom</artifactId>
      <version>${amazon.awssdk.version}</version>  <!-- 2.40.2 in this project -->
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

Then declare individual service dependencies without versions:

```xml
<!-- Current dependencies in this project -->
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>sts</artifactId>
</dependency>
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>cognitoidentityprovider</artifactId>
</dependency>

<!-- Add these when S3/SQS/SNS are needed -->
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
</dependency>
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>sqs</artifactId>
</dependency>
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>sns</artifactId>
</dependency>

<!-- HTTP client — choose one -->
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>url-connection-client</artifactId>  <!-- lightweight, no extra deps -->
</dependency>
<!-- OR -->
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>apache-client</artifactId>  <!-- full Apache HttpClient, connection pooling -->
</dependency>
```

---

## 3. Client beans as Spring beans

Create SDK clients as `@Bean` singletons — they are thread-safe and expensive to create:

```java
@Configuration
@RequiredArgsConstructor
public class AwsConfig {

    private final AppConfig appConfig;

    @Bean
    public StsClient stsClient() {
        var builder = StsClient.builder()
                .region(Region.of(appConfig.aws().region()))
                .credentialsProvider(DefaultCredentialsProvider.create());

        // Floci override for local dev
        if (appConfig.aws().endpointOverride() != null
                && !appConfig.aws().endpointOverride().isBlank()) {
            builder.endpointOverride(URI.create(appConfig.aws().endpointOverride()));
        }

        return builder.build();
    }

    @Bean
    public S3Client s3Client() {
        var builder = S3Client.builder()
                .region(Region.of(appConfig.aws().region()))
                .credentialsProvider(DefaultCredentialsProvider.create());

        if (appConfig.aws().endpointOverride() != null
                && !appConfig.aws().endpointOverride().isBlank()) {
            builder.endpointOverride(URI.create(appConfig.aws().endpointOverride()))
                   .forcePathStyle(true);  // required for Floci S3 (path-style URLs)
        }

        return builder.build();
    }

    @Bean
    public SqsClient sqsClient() {
        return SqsClient.builder()
                .region(Region.of(appConfig.aws().region()))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .applyMutation(b -> {
                    if (appConfig.aws().endpointOverride() != null
                            && !appConfig.aws().endpointOverride().isBlank()) {
                        b.endpointOverride(URI.create(appConfig.aws().endpointOverride()));
                    }
                })
                .build();
    }
}
```

Disable AWS clients when running tests without Floci:

```java
@Bean
@ConditionalOnProperty(name = "aws.enabled", havingValue = "true", matchIfMissing = true)
public S3Client s3Client() { ... }
```

---

## 4. Credential chain

**`DefaultCredentialsProvider`** — tries in order:

1. Java system properties (`aws.accessKeyId`, `aws.secretAccessKey`)
2. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
3. AWS credentials file (`~/.aws/credentials`)
4. ECS container credentials
5. EC2 instance profile / EKS pod identity
6. Web Identity Token (IRSA on EKS)

**Web Identity Token (IRSA — EKS)** — for Kubernetes pod identity:

```java
var provider = WebIdentityTokenFileCredentialsProvider.builder()
        .roleArn(System.getenv("AWS_ROLE_ARN"))
        .webIdentityTokenFile(Path.of(System.getenv("AWS_WEB_IDENTITY_TOKEN_FILE")))
        .build();
```

This is handled automatically by `DefaultCredentialsProvider` when the env vars are set by the EKS service account.

**Assume role with STS:**

```java
@Bean
public AwsCredentialsProvider assumedRoleProvider(StsClient stsClient,
        @Value("${aws.role-arn}") String roleArn) {
    return StsAssumeRoleCredentialsProvider.builder()
            .stsClient(stsClient)
            .refreshRequest(AssumeRoleRequest.builder()
                    .roleArn(roleArn)
                    .roleSessionName("trade-imports-animals-backend")
                    .durationSeconds(3600)
                    .build())
            .build();
}
```

**How this project uses STS** (from `AwsConfig.java`):

The project creates a `StsClient` inline (try-with-resources) to call `GetCallerIdentity` / `GetWebIdentityToken` and obtain a JWT for passing to downstream IPAFFS APIs. This is not a Spring bean because it's used once at startup/request-time rather than long-lived.

---

## 5. Floci configuration

Floci runs AWS services locally (LocalStack-compatible). Override the endpoint in `application-local.yml`:

```yaml
# application-local.yml
app:
  aws:
    endpoint-override: http://localhost:4566
    region: eu-west-2
```

**Note:** Floci config is not yet in this project's `application-local.yml` — add it when S3/SQS/SNS are wired up.

Profile-based endpoint override (from config class):

```java
@ConfigurationProperties(prefix = "app")
public record AppConfig(AwsConfig aws) {
    public record AwsConfig(String region, String endpointOverride) {
        public boolean hasEndpointOverride() {
            return endpointOverride != null && !endpointOverride.isBlank();
        }
    }
}
```

S3 with Floci requires `forcePathStyle(true)` — Floci doesn't support virtual-hosted-style bucket URLs.

---

## 6. S3 operations

```java
@Service
@RequiredArgsConstructor
public class S3StorageService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucket;

    // Upload
    public void upload(String key, byte[] content, String contentType) {
        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(contentType)
                        .contentLength((long) content.length)
                        .build(),
                RequestBody.fromBytes(content));
    }

    // Download
    public byte[] download(String key) {
        try (var response = s3Client.getObject(
                GetObjectRequest.builder().bucket(bucket).key(key).build())) {
            return response.readAllBytes();
        } catch (S3Exception | IOException e) {
            throw new StorageException("Failed to download: " + key, e);
        }
    }

    // Check existence
    public boolean exists(String key) {
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }

    // Delete
    public void delete(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    // List with pagination
    public List<String> listKeys(String prefix) {
        var keys = new ArrayList<String>();
        var request = ListObjectsV2Request.builder().bucket(bucket).prefix(prefix).build();
        var paginator = s3Client.listObjectsV2Paginator(request);
        paginator.stream()
                .flatMap(page -> page.contents().stream())
                .map(S3Object::key)
                .forEach(keys::add);
        return keys;
    }

    // Presigned URL
    public URL presignedDownloadUrl(String key, Duration expiry) {
        try (var presigner = S3Presigner.builder()
                .region(s3Client.serviceClientConfiguration().region())
                .build()) {
            var presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(expiry)
                    .getObjectRequest(r -> r.bucket(bucket).key(key))
                    .build();
            return presigner.presignGetObject(presignRequest).url();
        }
    }
}
```

---

## 7. SQS operations

```java
@Service
@RequiredArgsConstructor
public class SqsMessageService {

    private final SqsClient sqsClient;

    @Value("${aws.sqs.queue-url}")
    private String queueUrl;

    // Send
    public String sendMessage(String body) {
        var response = sqsClient.sendMessage(SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody(body)
                .messageAttributes(Map.of(
                        "sourceService", MessageAttributeValue.builder()
                                .dataType("String")
                                .stringValue("trade-imports-animals-backend")
                                .build()))
                .build());
        return response.messageId();
    }

    // FIFO queue — requires MessageGroupId and deduplication
    public String sendFifoMessage(String body, String groupId, String deduplicationId) {
        var response = sqsClient.sendMessage(SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody(body)
                .messageGroupId(groupId)
                .messageDeduplicationId(deduplicationId)
                .build());
        return response.messageId();
    }

    // Receive (long polling)
    public List<Message> receiveMessages() {
        var response = sqsClient.receiveMessage(ReceiveMessageRequest.builder()
                .queueUrl(queueUrl)
                .maxNumberOfMessages(10)    // max is 10
                .waitTimeSeconds(20)        // long polling — reduces empty responses
                .visibilityTimeout(30)      // seconds before message reappears
                .messageAttributeNames("All")
                .build());
        return response.messages();
    }

    // Delete after processing
    public void deleteMessage(String receiptHandle) {
        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                .queueUrl(queueUrl)
                .receiptHandle(receiptHandle)
                .build());
    }

    // Extend visibility timeout if processing takes long
    public void extendVisibility(String receiptHandle, int seconds) {
        sqsClient.changeMessageVisibility(ChangeMessageVisibilityRequest.builder()
                .queueUrl(queueUrl)
                .receiptHandle(receiptHandle)
                .visibilityTimeout(seconds)
                .build());
    }

    // Batch send (up to 10)
    public void sendBatch(List<String> bodies) {
        var entries = IntStream.range(0, bodies.size())
                .mapToObj(i -> SendMessageBatchRequestEntry.builder()
                        .id(String.valueOf(i))
                        .messageBody(bodies.get(i))
                        .build())
                .toList();
        sqsClient.sendMessageBatch(SendMessageBatchRequest.builder()
                .queueUrl(queueUrl)
                .entries(entries)
                .build());
    }
}
```

---

## 8. SNS operations

```java
@Service
@RequiredArgsConstructor
public class SnsNotificationService {

    private final SnsClient snsClient;

    @Value("${aws.sns.topic-arn}")
    private String topicArn;

    // Publish
    public String publish(String message, String subject) {
        var response = snsClient.publish(PublishRequest.builder()
                .topicArn(topicArn)
                .message(message)
                .subject(subject)
                .messageAttributes(Map.of(
                        "eventType", MessageAttributeValue.builder()
                                .dataType("String")
                                .stringValue("NOTIFICATION_CREATED")
                                .build()))
                .build());
        return response.messageId();
    }

    // FIFO topic
    public String publishFifo(String message, String groupId, String deduplicationId) {
        var response = snsClient.publish(PublishRequest.builder()
                .topicArn(topicArn)
                .message(message)
                .messageGroupId(groupId)
                .messageDeduplicationId(deduplicationId)
                .build());
        return response.messageId();
    }
}
```

---

## 9. STS — assume role

```java
@Service
@RequiredArgsConstructor
public class StsService {

    private final StsClient stsClient;

    public AwsCredentials assumeRole(String roleArn, String sessionName) {
        var response = stsClient.assumeRole(AssumeRoleRequest.builder()
                .roleArn(roleArn)
                .roleSessionName(sessionName)
                .durationSeconds(3600)
                .build());

        var creds = response.credentials();
        return AwsSessionCredentials.create(
                creds.accessKeyId(),
                creds.secretAccessKey(),
                creds.sessionToken());
    }

    // Use assumed credentials to create another client
    public S3Client clientWithAssumedRole(String roleArn) {
        var credentials = assumeRole(roleArn, "session-" + System.currentTimeMillis());
        return S3Client.builder()
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.EU_WEST_2)
                .build();
    }
}
```

---

## 10. Error handling

```java
try {
    s3Client.putObject(request, body);
} catch (S3Exception e) {
    // Service returned an error response
    log.error("S3 error: statusCode={}, code={}, message={}",
            e.statusCode(), e.awsErrorDetails().errorCode(),
            e.awsErrorDetails().errorMessage(), e);
    throw new StorageException("Upload failed", e);
} catch (SdkClientException e) {
    // Network, config, or serialisation error (no response from AWS)
    log.error("SDK client error — could not reach S3", e);
    throw new StorageException("Could not connect to storage", e);
}

// Common S3 exceptions
NoSuchKeyException  // 404 — object not found (subclass of S3Exception)
NoSuchBucketException  // 404 — bucket not found

// Common SQS exceptions
QueueDoesNotExistException
InvalidMessageContentsException
```

Retry configuration:

```java
S3Client.builder()
    .overrideConfiguration(ClientOverrideConfiguration.builder()
            .retryPolicy(RetryPolicy.builder()
                    .numRetries(3)
                    .retryMode(RetryMode.ADAPTIVE)
                    .build())
            .apiCallTimeout(Duration.ofSeconds(30))
            .apiCallAttemptTimeout(Duration.ofSeconds(10))
            .build())
    .build();
```

---

## 11. Testing

**Mockito mock of SDK clients:**

```java
@ExtendWith(MockitoExtension.class)
class S3StorageServiceTest {

    @Mock
    private S3Client s3Client;

    private S3StorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new S3StorageService(s3Client);
        ReflectionTestUtils.setField(storageService, "bucket", "test-bucket");
    }

    @Test
    void upload_shouldCallPutObject() {
        // Given
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        // When
        storageService.upload("key/file.json", "content".getBytes(), "application/json");

        // Then
        var captor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(captor.capture(), any(RequestBody.class));
        assertThat(captor.getValue().key()).isEqualTo("key/file.json");
    }

    @Test
    void download_shouldThrow_whenKeyNotFound() {
        when(s3Client.getObject(any(GetObjectRequest.class)))
                .thenThrow(NoSuchKeyException.builder().message("Not found").build());

        assertThatThrownBy(() -> storageService.download("missing/key"))
                .isInstanceOf(StorageException.class);
    }
}
```

**Floci with Testcontainers** — extend the project's `IntegrationBase` pattern:

```java
@SpringBootTest
@Testcontainers
class S3StorageServiceIT extends IntegrationBase {

    @Container
    static FlociContainer floci = new FlociContainer(
            DockerImageName.parse("floci/floci:latest"));

    @DynamicPropertySource
    static void flociProperties(DynamicPropertyRegistry registry) {
        registry.add("app.aws.endpoint-override", floci::getEndpoint);
        registry.add("app.aws.region", floci::getRegion);
    }

    @BeforeEach
    void createBucket(@Autowired S3Client s3Client) {
        s3Client.createBucket(CreateBucketRequest.builder().bucket("test-bucket").build());
    }
}
```

---

## 12. How this project currently uses AWS

From `AwsConfig.java`:

- `StsClient` is created inline (not as a Spring bean) when obtaining web identity tokens
- The project uses STS to get a JWT for passing downstream to IPAFFS APIs (not for assuming an S3 role)
- `cognitoidentityprovider` dependency is declared but usage is evolving
- No Floci config yet in `application-local.yml` — add the `endpoint-override` property when S3/SQS are integrated

Pattern for adding a new AWS service:
1. Add the Maven dependency (no version — managed by BOM)
2. Add a `@Bean` in `AwsConfig.java` with endpoint override support
3. Add `aws.{service}.{config}` properties to `application.yml` and `application-local.yml`
4. Add `@ConditionalOnProperty(name = "aws.enabled", ...)` if the service is optional
5. Add Testcontainers Floci setup in `IntegrationBase`

---

## Source: `docs/best-practices/rest-api/rest-api.md`

# REST API Design

Based on [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/).

## Core Principles

**API First:** Define APIs before implementation using OpenAPI
**API as Product:** Treat APIs as products with ownership
**Robustness (Postel's Law):** Liberal in acceptance, conservative in sending

## URL Design

### Path Structure
Use kebab-case: `^[a-z][a-z\-0-9]*$`

```
GET /sales-orders
GET /sales-orders/{order-id}
GET /sales-orders/{order-id}/items
```

### Resource Naming
| Do | Don't |
|----|-------|
| /customers | /customer |
| /sales-orders | /salesOrders |
| /order-items | /order_items |

- Plural nouns for collections
- Meaningful business names
- Verb-free URLs (use HTTP methods)
- Max 3 sub-resource levels

### Query Parameters
Use snake_case: `?sort=-created_at&limit=20&fields=id,name`

| Parameter | Purpose |
|-----------|---------|
| q | Default search |
| sort | Sort with +/- prefix |
| fields | Partial response |
| embed | Sub-entity expansion |
| offset/limit | Pagination |
| cursor | Cursor pagination |

## HTTP Methods

| Method | Purpose | Safe | Idempotent | Body |
|--------|---------|------|------------|------|
| GET | Read | Yes | Yes | Forbidden |
| POST | Create | No | Consider | Required |
| PUT | Replace | No | Yes | Required |
| PATCH | Partial update | No | Consider | Required |
| DELETE | Remove | No | Yes | Rare |

### Idempotency Patterns
1. **ETag + If-Match:** Prevents concurrent updates
2. **Secondary Key:** Resource-specific unique key
3. **Idempotency-Key Header:** Client-provided retry key

## Status Codes

### Success (2xx)
| Code | Usage |
|------|-------|
| 200 OK | General success |
| 201 Created | Resource created (+ Location) |
| 202 Accepted | Async started |
| 204 No Content | Success, no body |

### Client Errors (4xx)
| Code | Usage |
|------|-------|
| 400 Bad Request | Invalid input |
| 401 Unauthorized | Missing/invalid credentials |
| 403 Forbidden | Insufficient permissions |
| 404 Not Found | Resource missing |
| 409 Conflict | State conflict |
| 429 Too Many Requests | Rate limited |

### Server Errors (5xx)
| Code | Usage |
|------|-------|
| 500 Internal Error | Unexpected error |
| 503 Unavailable | Temporary down |

### Error Response (RFC 9457)
```json
{
  "type": "/problems/out-of-stock",
  "title": "Product out of stock",
  "detail": "Product 123 unavailable",
  "instance": "/orders/456"
}
```
Never expose stack traces.

## JSON Payload

### Property Naming
Use snake_case:
```json
{
  "order_id": "abc123",
  "created_at": "2024-01-15T10:30:00Z",
  "line_items": []
}
```

### Null Handling
- Treat null and absent identically
- Never null for booleans (use enums)
- Empty array `[]` instead of null

### Common Fields
| Field | Purpose |
|-------|---------|
| id | Opaque string identifier |
| xyz_id | Reference to another resource |
| etag | Version for optimistic locking |
| created_at | Creation timestamp |
| modified_at | Last modification |

### Response Structure
Always use objects as top-level, never bare arrays:
```json
{ "items": [...], "cursor": "abc" }
```

### Enumerations
Use UPPER_SNAKE_CASE: `"status": "IN_PROGRESS"`

## Data Formats

### Numbers
| Type | Format | Usage |
|------|--------|-------|
| integer | int32/int64 | Standard integers |
| number | decimal | Money (never float/double) |

### Dates (RFC 3339 / ISO 8601)
| Format | Example |
|--------|---------|
| date | 2024-01-15 |
| date-time | 2024-01-15T10:30:00Z |

Use uppercase T and Z. Prefer UTC.

### Standard Codes
| Data | Format | Example |
|------|--------|---------|
| Country | ISO 3166-1 alpha-2 | GB |
| Language | ISO 639-1 | en |
| Currency | ISO 4217 | GBP |

### Money
```json
{ "amount": "99.99", "currency": "GBP" }
```

## Pagination

### Cursor-Based (Recommended)
```json
{
  "items": [...],
  "self": "...?cursor=abc",
  "next": "...?cursor=def"
}
```
Efficient, stable with concurrent modifications.

### Offset-Based
`GET /orders?offset=20&limit=10`
Simpler but less robust for large datasets.

## Backward Compatibility

### Non-Breaking (Allowed)
- Adding optional properties
- Making mandatory fields optional
- Extending extensible enums

### Breaking (Avoid)
- Removing required fields
- Changing field types
- Adding required fields
- Changing defaults

### Versioning
**Preferred:** Evolve without versioning
**If required:** Media type: `Accept: application/vnd.example+json;version=2`
**Forbidden:** URL versioning `/v1/resources`

## Quick Reference

### Do
- Define APIs before implementation
- kebab-case for paths
- snake_case for properties/params
- UPPER_SNAKE_CASE for enums
- Problem JSON for errors
- Make POST/PATCH idempotent
- Cursor pagination for large datasets

### Don't
- Request body in GET
- camelCase in JSON
- Bare arrays as top-level
- null for empty collections
- float/double for money
- Version numbers in URLs
- Break existing consumers
- Expose stack traces
