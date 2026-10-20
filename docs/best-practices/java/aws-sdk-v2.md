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
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        storageService.upload(
                "key/file.json", "content".getBytes(StandardCharsets.UTF_8), "application/json");

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
