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
`trade-imports-reference-data`. Until EUDPA-632 merges, it and the test
helper named below are only on that repo's
`feat/EUDPA-632-observability` branch, not `main`.

### What was learned on reference-data

- **The fields are set through MDC, so `event.duration` is a JSON
  string**, for example `"event.duration":"2882625"`. The repo's
  `logback-ecs-encoder` (1.6.0) does not write SLF4J key-value pairs,
  so a typed number was not possible. The time in milliseconds is in the
  message text as well.
- **`[UNPROVEN]` Whether CDP's log pipeline accepts this.** The encoder
  writes flat dotted keys (`"event.duration"`); the CDP logging doc
  describes these fields as nested, and says the two are not treated the
  same. Check in dev OpenSearch that the `event.*` fields arrive and
  that `event.duration` can be sorted as a number. A wrong field type
  can fail ingestion and raise CDP's own "Log Ingestion Errors" alert.
  If it does not work, fall back to searching the message text.
- **Clean the MDC up.** Use `MDC.putCloseable` in a try-with-resources
  block so the fields do not leak onto later lines from the same
  thread.
- **No failure reason is logged.** The timing hook is not given the HTTP
  status or the exception. Add `event.reason` if the team wants it.

### Tests

| Test | Proves |
|---|---|
| Unit test with a capturing log appender | One line per call, with the four `event.*` fields |
| Same, after the call | The MDC is empty again |
| Same, with metrics disabled | The line is still written |
| Integration test sending `x-cdp-request-id` | The line carries that value as `trace.id` |

`CapturingLogAppender` in the reference-data tests is the helper to
copy. It must call `event.prepareForDeferredProcessing()` or the MDC
values are gone by the time the test reads them.

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
