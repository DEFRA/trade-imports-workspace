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
