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

Only use fields on CDP's allowed ECS list (the CDP logging how-to). A
field that is not on the list is dropped.

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
- **`error.*` may be dropped as well.** The failure line's reason
  travels only in its flat `error.type` and `error.message` fields, as
  does the ECS encoder's own `error.*` on any line with a throwable. If
  CDP keeps `error.*` only nested, as it does `event.*`, the failure
  line reaches OpenSearch with `event.outcome:failure` and no reason.
  `[UNPROVEN]` Check a failure line in dev OpenSearch before relying on
  the reason.
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
| Integration test (address-book's `ExternalCallRecorderIT`) capturing stdout with `testsupport/CapturedConsole` around a real request or command, then parsing the console line with the given `event.action` | A successful insert, sent with `x-cdp-request-id`, writes a line with `trace.id` and the nested `event` object with an integral duration. A failed find writes a line with `event.outcome` `failure`, `error.type` and `error.message`, and no `error.stack_trace` |

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
