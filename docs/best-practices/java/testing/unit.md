# Unit Testing — trade-imports-animals-backend

## Overview

Unit tests run in isolation — no Spring context, no database, no HTTP server. External dependencies are replaced with Mockito mocks. Tests execute in the Maven `test` phase via Surefire.

**Run with:**
```bash
mvn test             # unit tests only
mvn verify           # unit + integration tests
```

`mvn test` runs no `*IT` class. Before calling a backend change done, run `mvn verify`, with Docker running for Testcontainers.

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

Mock only at the edge of the service: a repository (the database), an HTTP or SDK client (the network), the clock. Never mock a class of your own that holds logic, such as a mapper, a validator or a rule class: construct the real one, so the test covers it too. A collaborator service that itself only fronts an edge, such as a document service over S3, may be mocked where its calls are the side effect under test.

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

## Test titles and layout

### The title states what the assertions prove

Read the assertions, then write the title from them. A title that claims more than the assertions check is a defect in that test, not a naming preference.

Bad: titled `submit_shouldSetStatusToSubmitted`, while the only assertion is `isEqualTo(SUBMITTED_ACTION_REQUIRED)`. A reader trusts the title and believes a plain submit is covered.

Good: `submit_shouldRequireActionWhenAHealthCertificateIsOutstanding`, with a fixture that has an outstanding health certificate.

Do not copy an acceptance criterion into the title when the body tests a stand-in for it (a draft fixture standing in for a submitted one, say). Either test the real case or name the stand-in.

### The test fails without the change it covers

Before you call a test done, undo the production change it covers (or invert the condition it guards), run the test and see it fail. Restore the change and see it pass. A test that stays green against the old code proves nothing about the new code: fix the assertion, or delete the test and the code it was meant to cover.

### Layout: no Given / When / Then comments

Do not write `// Given`, `// When`, `// Then` or `// And` comments. Separate set-up, action and assertions with a blank line. When set-up is long enough to need a label, extract it into a named helper (`givenNotificationWithOutstandingCertificate()`) so the name does the labelling.

One behaviour per test. If you need a second `// Then`, you have a second test.

Bad: one test, two behaviours, and a title that names only the first:

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

Good: two tests, a shared helper for the set-up, blank lines for structure:

```java
@Test
void deleteByReferenceNumbers_shouldDeleteTheFoundNotifications() {
    Notification notification = givenStoredNotification("DRAFT.IMP.2026.111");

    notificationService.deleteByReferenceNumbers(List.of("DRAFT.IMP.2026.111"), headers);

    verify(notificationRepository).deleteAll(List.of(notification));
}

@Test
void deleteByReferenceNumbers_shouldAuditSuccess_whenAllFound() {
    givenStoredNotification("DRAFT.IMP.2026.111");

    notificationService.deleteByReferenceNumbers(List.of("DRAFT.IMP.2026.111"), headers);

    ArgumentCaptor<Audit> auditCaptor = ArgumentCaptor.forClass(Audit.class);
    verify(auditRepository).save(auditCaptor.capture());
    assertThat(auditCaptor.getValue().getResult()).isEqualTo(Result.SUCCESS);
}
```

A multi-step flow (create, then update, then delete) is one test per step, each setting up its own state through a helper. One long flow test fails at the first broken step and hides every later one.

### Comments beside assertions

When you change an assertion, re-read every comment near it. A comment that still names the old value is wrong the moment the assertion changes: delete it. Better still, do not write one; the assertion and the title already say it.

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

## Enum serialisation

Each enum gets two serialisation tests, however many constants it has:

- one round trip for one constant
- one unknown value, which must throw `InvalidFormatException` (a different Jackson code path)

Do not add a test per constant, and do not parameterise over `@EnumSource` to cover them all. Domain enums such as document types and scan statuses grow as values are confirmed; the test suite must not grow with them when the contract is the same. A reviewer must not raise a missing per-constant test as a gap. A missing unknown-value test is a gap.

Bad: one test per constant, as `AccompanyingDocumentTest.ScanStatusJsonSerialisation` does today:

```java
@Test
void scanStatus_pending_serialisesToUppercaseString() throws JsonProcessingException { ... }

@Test
void scanStatus_complete_serialisesToUppercaseString() throws JsonProcessingException { ... }

@Test
void scanStatus_rejected_serialisesToUppercaseString() throws JsonProcessingException { ... }
```

Good:

```java
@Test
void scanStatus_shouldRoundTripThroughJson() throws JsonProcessingException {
    String json = objectMapper.writeValueAsString(ScanStatus.PENDING);

    assertThat(json).isEqualTo("\"PENDING\"");
    assertThat(objectMapper.readValue(json, ScanStatus.class)).isEqualTo(ScanStatus.PENDING);
}

@Test
void scanStatus_unknownValue_throwsInvalidFormatException() {
    assertThatThrownBy(() -> objectMapper.readValue("\"UNKNOWN\"", ScanStatus.class))
        .isInstanceOf(InvalidFormatException.class);
}
```

Use one test per constant only when constants serialise differently, for example each has its own `@JsonProperty` or `@JsonValue`. A small closed enum (HTTP method, day of week) may use a parameterised round trip.

---

## Helper methods

Set-up used by two tests goes in a shared helper. When you promote a local helper to a shared one, delete every local copy in the same change.

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
