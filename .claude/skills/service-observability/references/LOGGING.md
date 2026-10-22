Log one searchable line per call to an external dependency, and follow
a request across services. Parent-loaded: path and Bash rules come from
`SKILL.md`.

## Why a log line as well as a metric

Metrics go to CloudWatch. They cannot be searched by request. The log
line goes to OpenSearch with the caller's `trace.id`, so one slow
request can be traced to the dependency call that made it slow.

## The line

Write it where the call is already timed, and before any "metrics
disabled" check, so logging does not depend on `aws.emf.enabled`.

```
External call mdm/get-countries success in 2 ms
```

| Field | Value | Example |
|---|---|---|
| `event.category` | Always `external-call` | `external-call` |
| `event.action` | `<dependency>/<operation>` | `mdm/get-countries` |
| `event.outcome` | `success` or `failure` | `success` |
| `event.duration` | Nanoseconds | `2882625` |
| `trace.id` | Set by the request filter, not by this code | — |

Only use fields on CDP's allowed ECS list (the CDP logging how-to). A
field that is not on the list is dropped.

Never put a token, a subscription key, a request body or a full URL
with query parameters in the line.

The reference implementation is `ExternalCallMetrics.logCall` in
`trade-imports-reference-data`.

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

Two pieces, both copied from reference-data:

1. **Set the fields as SLF4J key-value pairs**, with the duration as a
   `long`:

   ```java
   log.atInfo()
       .addKeyValue("event.category", "external-call")
       .addKeyValue("event.action", action)
       .addKeyValue("event.outcome", outcome)
       .addKeyValue("event.duration", elapsed.toNanos())
       .setCause(cause)
       .log("External call {} {} in {} ms", action, outcome, elapsed.toMillis());
   ```

2. **Copy `EcsEventEncoder`** (package `...imports.logging`) and name it
   as the CONSOLE appender's encoder in `logback-spring.xml`, in place of
   `co.elastic.logging.logback.EcsEncoder`. It extends the ECS encoder
   and overrides its `addCustomFields` hook to write the line's `event.*`
   key-value pairs as one nested `event` object, with a `Number` written
   as a JSON number. The ECS encoder ignores key-value pairs, so they
   are not also written flat. A line with no `event.*` key-value pairs
   comes out exactly as the ECS encoder writes it.

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
- **`error.*` may be dropped as well.** The ECS encoder writes
  `error.type`, `error.message` and `error.stack_trace` flat, and CDP
  keeps `error.*` only nested. `[UNPROVEN]` Check an error line in dev
  OpenSearch before relying on those fields.
- **The exception is logged, but not the HTTP status.** When a call
  throws, the line carries the exception. A call that returns a failure
  status has only `event.outcome:failure`. Add `event.reason` if the
  team wants more.

### Tests

| Test | Proves |
|---|---|
| Encoder unit test: log through a real logger, then `encoder.encode(event)` and parse the JSON | A nested `event` object; `duration` is an integral number; no flat `event.category`, `event.action`, `event.outcome` or `event.duration` keys (the ECS encoder's own flat `event.dataset` stays); `trace.id` and `error.*` kept; a null value written as JSON `null` and a non-finite number as a string; a line with no `event.*` pairs is byte-for-byte the ECS encoder's |
| Unit test with a capturing log appender | One line per call, with the four `event.*` key-value pairs, and the duration a `Long` |
| Same, with metrics disabled | The line is still written |
| Integration test sending `x-cdp-request-id`, encoding the line with the root logger's `CONSOLE` encoder | `logback-spring.xml` names the new encoder, and the line carries `trace.id` and the nested `event` object |

The integration test is the one that fails if `logback-spring.xml` is
left on the plain ECS encoder. The unit tests alone would still pass.

`CapturingLogAppender` in the reference-data tests is the helper to
copy. It must call `event.prepareForDeferredProcessing()` or the MDC
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
