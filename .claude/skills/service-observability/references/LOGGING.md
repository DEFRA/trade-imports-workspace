Log one searchable line per call to an external dependency, and follow
a request across services. Parent-loaded: path and Bash rules come from
`SKILL.md`.

## Why a log line as well as a metric

Metrics go to CloudWatch. They cannot be searched by request. The log
line goes to OpenSearch with the caller's `trace.id`, so one slow
request can be traced to the dependency call that made it slow.

## The line

Write it where the call is recorded, in `ExternalCallRecorder`, so every
measured call has one. It does not depend on `aws.emf.enabled`.

```
External call mdm/get-countries success in 2 ms
```

| Field | Value | Example |
|---|---|---|
| `event.category` | Always `external-call` | `external-call` |
| `event.action` | `<dependency>/<operation>` | `mdm/get-countries` |
| `event.outcome` | `success` or `failure` | `success` |
| `event.duration` | Nanoseconds | `2882625` |
| `error.type` | A failure only: the cause's class name | `com.mongodb.MongoCommandException` |
| `error.message` | A failure only: the cause's message | — |
| `trace.id` | Set by the request filter, not by this code | — |

Only use fields on CDP's allowed list: `include_keys` in
[`cdp-opensearch-core` `modules/opensearch_ingestion/vars.tf`](https://github.com/DEFRA/cdp-opensearch-core/blob/main/modules/opensearch_ingestion/vars.tf),
which the `cdp-logs` pipeline applies before it writes a service's
logs to OpenSearch. A field that is not on the list is dropped without
any error, though the raw line is kept in S3. A field of the service's
own, such as `mongodb.server_connection`, never reaches OpenSearch.

Never put a token, a subscription key, a request body or a full URL
with query parameters in the line.

The reference implementation is `ExternalCallRecorder.logCall` in
`trade-imports-address-book` (the line and fields are the ones first
proven on reference-data, below).

### How to write the fields (Java)

CDP keeps `event.*` fields only when they are **nested** in the JSON,
and needs `event.duration` to be a **number**:

```
dropped:  "event.category":"external-call", "event.duration":"2882625"
kept:     "event":{"category":"external-call","duration":2882625}
```

It drops the flat form without any error. Do not set these fields
through the MDC. `logback-ecs-encoder` (1.6.0) writes every MDC entry
as a flat key with a string value, so CDP drops them all.

Two pieces, both in address-book:

1. **Set the fields as SLF4J key-value pairs**, with the duration as a
   `long`. A successful call logs at INFO. A failed call logs at WARN,
   with the cause's class name and message as `error.type` and
   `error.message`, and no stack trace. The cause is not attached: the
   exception is rethrown, and the handler that receives it logs its
   stack trace once.

   ```java
   LoggingEventBuilder line =
       log.atLevel(level)
           .addKeyValue("event.category", "external-call")
           .addKeyValue("event.action", action)
           .addKeyValue("event.outcome", outcome)
           .addKeyValue("event.duration", elapsed.toNanos());
   if (cause != null) {
     line.addKeyValue("error.type", cause.getClass().getName())
         .addKeyValue("error.message", cause.getMessage());
   }
   line.log("External call {} {} in {} ms", action, outcome, elapsed.toMillis());
   ```

2. **Copy `EcsEventEncoder`** into the service's `logging` package and name it
   as the CONSOLE appender's encoder in `logback-spring.xml`, in place of
   `co.elastic.logging.logback.EcsEncoder`. It extends the ECS encoder
   and overrides its `addCustomFields` hook to write the line's `event.*`
   key-value pairs as one nested `event` object, with a `Number` written
   as a JSON number and a non-finite one as a string. It writes the
   line's `error.*` key-value pairs as flat top-level fields, with no
   stack trace. When the line carries a throwable, the throwable's own
   ECS `error.*` fields are written instead of those key-value pairs.
   The ECS encoder ignores key-value pairs, so none is written twice. A
   line with no `event.*` or `error.*` key-value pairs comes out exactly
   as the ECS encoder writes it.

`trace.id` stays in the MDC, where the request filter puts it. It
reaches OpenSearch flat.

### What was learned on reference-data

- **CDP dropped the MDC version without any error.** Seen in dev on
  2026-10-19 (reference-data 0.24.0): the line arrived with its
  `message`, `service.name` and `trace.id`, but none of the four
  `event.*` fields. The nested key-value-pair version above replaced it.
- **The nested version reaches OpenSearch.** Seen in dev on 2026-10-21
  (reference-data 0.27.0): `event.category:"external-call" AND
  service.name:"<service>"` finds the lines, and Grafana's "Slowest
  dependency calls" panel shows them sorted by `event.duration` as a
  number. `[UNPROVEN]` that CDP's "Log Ingestion Errors" alert stays
  quiet for the service.
- **One flat `event.*` key is left on every line.** The ECS encoder
  (1.6.0) always writes `"event.dataset":"<service>"` flat, so the call
  line holds that flat key and the nested `event` object side by side.
  CDP indexes the line with the mix (the nested fields arrive), but if
  "Log Ingestion Errors" fires, this is the first suspect.
- **The first tests passed while the fields were being dropped.** They
  read the MDC on the captured log event, not the JSON the encoder
  writes. Test the encoded JSON (see Tests).
- **`error.*` is kept flat.** The failure line's reason travels only in
  its flat `error.type` and `error.message` fields, as does the ECS
  encoder's own `error.*` on any line with a throwable. Unlike
  `event.*`, CDP's `include_keys` lists both forms: `error.type` and
  `error/type`, `error.message` and `error/message`. `[UNPROVEN]` that a
  failure line has been seen with its reason in dev OpenSearch.
- **The exception's type and message are logged, but not the HTTP
  status.** When a call throws, the line carries `error.type` and
  `error.message`. A call that returns a failure status with no
  exception has only `event.outcome:failure`. Add `event.reason` if the
  team wants more.

### Tests

| Test | Proves |
|---|---|
| Encoder unit test (address-book's `EcsEventEncoderTest`): log through a real logger, then `encoder.encode(event)` and parse the JSON | The `event.*` key-value pairs nested in an `event` object with the prefix stripped, and an integral duration a JSON integer; a throwable's ECS `error.type`, `error.message` and `error.stack_trace` still written after the `event` object; `error.*` key-value pairs written as top-level fields with no stack trace, and `event.*` pairs not flattened beside them; with a throwable, its `error.*` fields written instead of the `error.*` key-value pairs; a line with no `event.*` or `error.*` key-value pairs byte-for-byte the ECS encoder's; strings escaped; a null value as JSON `null`; a non-finite `Double` or `Float` as a string |
| Unit test with a capturing log appender, a successful call (address-book's `ExternalCallRecorderTest`) | One INFO line per call, with the four `event.*` key-value pairs, the duration a `Long`, and no throwable |
| Unit test with a capturing log appender, a failed call (address-book's `ExternalCallRecorderTest`) | One WARN line per call, with `event.outcome` `failure`, `error.type` and `error.message` from the cause, and no throwable |
| Integration test (address-book's `ExternalCallRecorderIT`) capturing stdout with `testsupport/CapturedConsole` around a real request or command, then finding the console line with the given `event.action` through `CapturedConsole.requiredFirstJsonLine` | A successful insert, sent with `x-cdp-request-id`, writes a line with `trace.id` and the nested `event` object with an integral duration. A failed find writes a line with `event.outcome` `failure`, `error.type` and `error.message`, and no `error.stack_trace` |

The integration test is the one that fails if `logback-spring.xml` is
left on the plain ECS encoder. The unit tests alone would still pass.

`CapturedLogs` in address-book's `testsupport` is the helper to copy,
or extend the service's own log-capturing helper the same way. Its
appender must call `event.prepareForDeferredProcessing()` or the MDC
values are gone by the time the test reads them. Its `keyValues(event)`
reads an event's key-value pairs.

## Follow a request by trace.id

CDP sends `x-cdp-request-id` on each request. A service copies it into
`trace.id` on every log line, and must send it on to the services it
calls.

`[UNPROVEN]` The check, in dev OpenSearch: find a request in a calling
service, filter on its `trace.id` alone, and confirm lines from both
services appear, including the dependency call line.

If the trail breaks, the usual cause is a caller that does not forward
the header. That is a fix in the caller, on the caller's own ticket.
Record it; do not fix it here.

Note for Java services: on reference-data the header is forwarded on
`RestClient` calls only. Calls made through Feign do not carry it. That
does not stop a request being followed *through* the service.

## Follow a request into MongoDB's own log

A service with a CDP MongoDB has a second saved search,
`<service>-mongo`, holding the database server's own log lines. It is
a separate index from the service's logs, written by CDP's Fluent Bit
and not filtered by `include_keys`. Its lines carry `ctx` (the
connection, `conn<n>`), `attr.command` and `attr.error`, but no
`trace.id`: the server never sees the request.

To join them, send the request's `trace.id` to MongoDB as each
command's `comment`. The server writes the comment into its log line
as `attr.command.comment`, so filtering `<service>-mongo` on
`attr.command.comment:"<trace.id>"` finds the request's commands.

- **Only slow and failed operations reach the server's log** (slower
  than `slowms`, 100 ms by default). A fast command leaves no line,
  with or without a comment. That is when you look, so it is enough.
- **Do not send the connection id instead.** A field such as
  `mongodb.server_connection` on the service's call line is dropped by
  `include_keys`, and a pooled connection serves many requests.
- **Set it once, in the `MongoTemplate`, not per query.** Spring Data's
  `@Meta(comment = ...)` takes only a fixed string. Repository finds
  reach the driver through a `MongoTemplate` method a subclass cannot
  override. The one hook every command passes is
  `MongoTemplate.prepareCollection`, so override it to return the
  collection wrapped so that each covered command carries the MDC's
  `trace.id` as its comment: `find` (`FindIterable.comment`),
  `countDocuments` (`CountOptions`), `insertOne` (`InsertOneOptions`)
  and `replaceOne` (`ReplaceOptions`), and re-wrap the collections its
  `with...` methods return. Register the subclass as the `MongoTemplate`
  bean; Spring Boot's own backs off. Cover more driver methods only when
  the service calls them.

The reference implementation is `TraceIdCommentingMongoTemplate` and
`TraceIdCommentedCollection` in `trade-imports-address-book`'s
`tracing` package.

`[UNPROVEN]` that `attr.command.comment` survives CDP's
`mongo_conversions.lua` into `<service>-mongo`. Check a slow or failed
command in dev OpenSearch.

### Tests

| Test | Proves |
|---|---|
| Unit test of the wrapped collection over a mocked driver `MongoCollection` (address-book's `TraceIdCommentedCollectionTest`) | With `trace.id` in the MDC: a find's iterable carries it as the comment; a count and a replace carry it on the options they were given, which keep their other settings; an insert with no options is sent with `InsertOneOptions` carrying it; a collection made by `withWriteConcern` carries it too. With no `trace.id`, each command runs unchanged. A driver failure reaches the caller as the driver threw it |
| Integration test against a real MongoDB with the profiler on (address-book's `MongoCommandCommentIT`): set `profile: 2`, run requests sent with `x-cdp-request-id`, then read `system.profile` for entries whose `command.comment` is that id | A create, a get by id, an update and a list (with `pageSize=1`, so the count runs) reach the server with the request's id as the comment: `insert`, `query`, `update` and `command` (the count). A command run outside a request reaches it with no comment. The profiler records the same command document the server's log does |
