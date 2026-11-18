Publish a Node (hapi) service's metrics and log each dependency call.
Parent-loaded: path and Bash rules come from `SKILL.md`.

The reference implementation is `trade-imports-animals-frontend`, on
its `main`. Read it before writing anything. Its tests check the EMF
documents and the ECS JSON written, not that a function was called.
`SKILL.md` → "What is proven" says how far it is proven.

The names are the ones in `METRICS.md` → "Work out the list", and the
log line is the one in `LOGGING.md` → "The line". What differs from Java
is how they are written.

## How Node differs from Java

| Java (`METRICS.md` → "Publish") | Node |
|---|---|
| Micrometer meters, published by `EmfMeterRegistry` once a step | One EMF document per event, written through `@defra/cdp-metrics` as it happens. CloudWatch computes `SampleCount`, `Average`, `p95` and `Maximum` from the values, as it does for the registry's |
| The allowlist decides what is published | No allowlist: a name is published once code writes it |
| `@Timed` on controllers and services | `http.server.requests`, recorded once per request in a `response` listener |
| `EcsEventEncoder` nests `event.*` | pino with `@elastic/ecs-pino-format` writes a nested object as it is given: pass `event` as an object |
| Flat `error.type`, `error.message` | Nested `error: { type, message }`, the shape ECS pino gives its own `err`. `[UNPROVEN]` which form CDP keeps (`LOGGING.md` → "What was learned on reference-data") |

## Where the code lives

Every path in this file is from the root of the animals-frontend repo.
These are the files a port writes or changes.

| File | What it does |
|---|---|
| `src/server/common/helpers/metrics/publish-metrics.js` | `publishMetricsInBackground(dimensions, metrics)` writes one EMF document: the metrics given, all with the same dimensions, in the namespace `metrics.namespace` (`AWS_EMF_NAMESPACE`, default the service name). It does not make the caller wait, and logs a failed write at warn with its dimensions and metric names. `countEvent(name, dimensions)` publishes a count of 1. It copies the dimensions before handing them over: the EMF library writes to the object it is given, so a frozen one fails every publish |
| `src/server/common/helpers/metrics/external-call-metrics.js` | The dependency layer. `measureExternalCall(externalCall, call)` and `measureExternalResponse(externalCall, send)`, where `externalCall` is the `{ dependency, operation }` descriptor and `call` or `send` the function that makes the call, time a call, judge its outcome ("Dependency layer" below) and pass it to `recordExternalCallInBackground`, which counts it against the request in progress, writes the log line and publishes `external.call.duration` and `external.call.failure` tagged `dependency` and `operation` |
| `src/server/common/helpers/metrics/request-metrics.js` | The endpoint layer. The `requestMetrics` hapi plugin, whose `response` listener (`publishFinishedPageRequestMetrics`) runs for every page request, with no handler changes: `recordRequestTimeInBackground` publishes `http.server.requests`, `countRefusedAnswerInBackground` counts `journey.validation.failure`, and when `callCounts.metrics.enabled` is on it publishes the request's counts through `page-request-metrics.js` |
| `src/server/common/helpers/metrics/page-request-metrics.js` | `recordPageRequestInBackground(counts)` publishes `page.request.backend.calls` and `page.request.session.resolutions`, tagged `request.kind` `page` |
| `src/server/common/helpers/call-counts/call-counts.js` | The `callCounts` hapi plugin: keeps each request's counts by dependency and operation (`countExternalCall`, called by `recordExternalCallInBackground`) and its session reads (`countSessionResolution`). `backendCallsOf(counts)` adds up its `animals-backend` calls. `call-count-totals.js` and `call-counts-routes.js` beside it serve the running totals at `/call-counts` |
| `src/server/server.js` | Registers `callCounts`, then `requestMetrics`, which depends on it |
| `src/config/config.js` | `metrics.namespace` and `callCounts.metrics.enabled` |
| `src/server/common/helpers/backend-client/backend-fetch.js` | The `animals-backend` choke point ("Dependency layer" below) |
| `src/server/common/helpers/redis-connection-events.js` | `reportRedisConnectionEvents(client)` reports the Redis client's events ("Redis" below) |
| `src/server/common/helpers/redis-dependency.js` | `REDIS_DEPENDENCY`, the `dependency` value `redis` |
| `src/server/common/helpers/redis-client.js` | `buildRedisClient` calls `reportRedisConnectionEvents` on the client it builds |
| `src/server/common/helpers/session-cache/measured-redis-engine.js` | `MeasuredRedisEngine`, the catbox Redis engine with each `get`, `set` and `drop` measured |
| `src/server/common/helpers/session-cache/cache-engine.js` | `getCacheEngine` returns a `MeasuredRedisEngine` when the session cache is Redis |
| `src/server/common/helpers/logging/logger-options.js` | `buildEcsPinoOptions({ level })`, the pino options a deployed line is written with, which the log-line tests use ("Tests" below) |
| `src/server/app/engine/persistence/records.js` | The journey counters ("Engine layer" below) |
| `src/server/app/sets/live-animals/journeys/linear/flow/entry-guard.js` | `journey.entry.redirect` ("Engine layer" below) |
| `src/server/common/test-helpers/emf-documents.js`, `src/server/common/test-helpers/ecs-log-lines.js` | The test helpers ("Tests" below) |

The other choke points are in the "Dependency layer" table.

## Dependency layer

Measure at the one place each dependency is called, never at each call
site's caller:

| Dependency | Choke point | Operations |
|---|---|---|
| `animals-backend` | `createBackendFetch` (`src/server/common/helpers/backend-client/backend-fetch.js`): `backendFetch(operation, url, init)`, used by the records client (`src/server/app/services/persistence/records/real/http/send.js`, `get-fulfilment.js`) and the document uploads (`src/server/app/services/document-uploads/real.js`). A connection retried once is one call, timed from the first attempt | `create-notification`, `copy-notification`, `get-fulfilment`, `list-notifications`, `replace-notification`, `submit-notification`, `amend-notification`, `cancel-amend-notification`, `soft-delete-notification`, `register-document-upload`, `claim-document-upload`, `get-document-upload-session`, `list-document-uploads`, `get-document-upload-status`, `delete-document-upload`, `stream-document-file` |
| `address-book` | `addressBookFetch(operation, url, init)`, and `sendToAddressBook(operation, url, init)`, which also throws on a response that is not ok (`src/server/app/services/address-book-request.js`) | `list-addresses`, `get-address`, `list-transporters`, `create-transporter` |
| `reference-data` | `requestReferenceData(operation, url, init)` (`src/server/app/services/reference-data/request.js`) | `get-countries`, `get-ports-of-entry`, `search-commodities`, `check-species` |
| `cdp-uploader` | `measureExternalCall` in `src/server/app/services/cdp-uploader/real.js` | `initiate`, `status` |
| `defra-id` | `measureExternalCall` around each Wreck call (`src/auth/get-oidc-config.js`, `verify-token.js`, `refresh-tokens.js`), with the descriptors in `src/auth/defra-id-calls.js`; Bell's token exchange through `src/auth/token-exchange-timer.js`, started by the provider's `token` in `src/plugins/auth.js` and recorded by `src/server/auth/controller.js` | `openid-configuration`, `jwks`, `token-exchange`, `token-refresh` |
| `redis` | `MeasuredRedisEngine` (`src/server/common/helpers/session-cache/measured-redis-engine.js`) | `get`, `set`, `drop` |

A call that throws on a refusal names its operation in the error,
`Failed to <operation>: <status> <status text>`
(`failedResponse` in `src/server/app/services/http/trace-headers.js`,
`BackendRequestError` in
`src/server/app/services/persistence/records/errors.js`).

Rules that held:

- **The operation is a fixed name the call site passes**, never derived
  from the URL: a URL holds ids, and each value is a CloudWatch metric.
- **A 4xx is the dependency answering, so a success.** A 404 for a
  missing address, a 409 for a stale concurrency token, are outcomes the
  code handles. A call fails when it throws or the response is 5xx. The
  status is on the log line as `http.response.status_code`.
- **Count a call once.** The per-request counts (`/call-counts`,
  `page.request.backend.calls`) come from the same
  `recordExternalCallInBackground`, so the backend is counted where it
  is timed.
- **Interface ids** (`SYN-11`, `SYN-12`, `SYN-13` on the Defra ID calls)
  are in the log line's message, `External call defra-id/jwks (SYN-12)
  success in 3 ms`, not a dimension or a field: a field outside CDP's
  ECS list is dropped.
- **A streamed response is timed to its headers.** The body is read
  after the call is recorded.

### Redis

The session store is a database by `METRICS.md` → "A database", reached
through `@hapi/yar` and `@hapi/catbox-redis` on an ioredis client.

- **Availability from the client's events**, not a probe:
  `reportRedisConnectionEvents(client)` publishes
  `external.dependency.available` `{dependency=redis}` as 1 on `ready`
  and 0 on `close` or `end`, on each change and every minute after
  (nothing before the first event). It logs each change once: `Redis is
  available` at info, `Redis is unavailable` at warn, and `Redis client
  stopped reconnecting` at error on `end`. Every line is tagged
  `dependency` `redis`.
- **Lost connections and errors**: each change from ready to closed
  counts `external.dependency.connection.lost`. Each client `error`
  event, and each `node error` a Cluster client reports, is logged at
  error with `err` (`Redis connection error`) and counts
  `external.dependency.error`, both `{dependency=redis}`.
- **Per-operation latency**: `MeasuredRedisEngine` extends the catbox
  engine and wraps `get`, `set` and `drop` in `measureExternalCall`, so
  each is a `redis` call with a log line. Small: three methods.
- **Cache hits and misses**: each `get` counts `cache.hit` or
  `cache.miss` tagged `cache` with the catbox segment it read (the
  session segment and `auth-sessions` on animals-frontend).
- Locally the memory engine is used and none of this is published.

## The log line

`LOGGING.md` → "The line" gives the fields. In Node, pass them to the
module logger as nested objects; ECS pino writes them as given:

```js
logger.info(
  {
    event: {
      category: 'external-call',
      action: `${dependency}/${operation}`,
      outcome: 'success',
      duration: Math.round(durationMs * 1_000_000)
    },
    http: { response: { status_code: 200 } }
  },
  'External call address-book/list-addresses success in 12 ms'
)
```

A failure logs at warn with `error: { type, message, code }` (the
error's `name`, its message, and its `cause.code` when it has one, such
as `ECONNREFUSED`), and no stack trace. Do not pass `err`: ECS pino
writes its stack trace, and the caller logs that once where it handles
the error. `trace.id` comes from the logger's `mixin`
(`@defra/hapi-tracing`), not from this code. ECS pino also writes the
flat `event.dataset` on every line, as the Java encoder does.

## Endpoint layer

`http.server.requests`, unit milliseconds, one value per page request
(received to completed), tagged:

| Dimension | Value |
|---|---|
| `method` | `GET`, `POST`, `DELETE` |
| `section` | The route template's first literal segment after its first path parameter, else its last literal segment, `root` for `/`, `unmatched` for hapi's not-found route |
| `status.class` | `2xx`, `3xx`, `4xx`, `5xx` |

Health, favicon, static assets and `/call-counts` are not page requests
and are not published.

**The cardinality decision.** Count the routes before choosing the tag:
boot the server in a throwaway test and write `server.table()` to a
file. animals-frontend has 84 routes (47 GET, 36 POST, 1 DELETE), 72 of
them under `/live-animals/notifications/{journeyId}/`. Tagged by route
template that is up to 84 method and route pairs times the status
classes each returns, about 170 metrics in each environment. The team
chose to tag by section (2026-11-17): 37 sections, 56 method and section
pairs, about 115 metrics. Recorded on EUDPA-674.

`journey.validation.failure`, a count tagged `page` (the route's literal
segments after its first path parameter, such as
`consignment/contact/edit`): counted in the same listener when a POST is
answered with a view whose context has an `errorSummary`. It relies on
every page passing its errors to the shared layout as `errorSummary`.

## Engine layer

Business counters, each a count with no dimensions, so each is one
CloudWatch metric:

| Metric | Where |
|---|---|
| `journey.started`, `journey.submitted`, `journey.amended`, `journey.copied`, `journey.deleted` | `src/server/app/engine/persistence/records.js`: after `create`, `finalise`, `amend`, `copy` and `softDelete` succeed. Every write goes through this facade, stub or real |
| `journey.concurrency.conflict` | The same facade: when `create`, `replaceFulfilment`, `finalise`, `amend`, `copy` or `softDelete` is refused with `STALE_CONCURRENCY_TOKEN`. The refusal is rethrown, and the write's own counter is not counted |
| `journey.entry.redirect` | `entryGuardTarget` in `src/server/app/sets/live-animals/journeys/linear/flow/entry-guard.js`, where it decides to redirect and logs it |

## Tests

Each test reads what is written. With `AWS_EMF_ENVIRONMENT=Local` (set
by the repo's `npm test`) the EMF library writes each document to
`console.log`. Two helpers, each called inside a `describe` and
registering its own hooks:

- `recordEmfDocuments()` (`src/server/common/test-helpers/emf-documents.js`)
  captures the documents under the namespace `EMF_TEST_NAMESPACE` and
  reads them back: `documents()`, `documentsWith(name)`,
  `valuesOf(name)`, `publishesOf(name)` (each publish's `value`, `unit`
  and `dimensions`), `onlyDocument()`, `externalCalls()`,
  `onlyExternalCall()` (`dependency`, `operation`, `failure`) and
  `earlierPublishesFlushed()`.
- `recordEcsLogLines()` (`src/server/common/test-helpers/ecs-log-lines.js`)
  sends the module logger's lines through a pino logger built with
  `buildEcsPinoOptions` and keeps the JSON it writes: `lines()`,
  `externalCallLines()` and `onlyExternalCallLine()`.

Test paths are from the repo root.

| Test | Proves |
|---|---|
| `src/server/common/helpers/metrics/publish-metrics.test.js` | The namespace; a count of 1 with exactly the dimensions given; frozen dimensions still published; the empty dimension set for a count with none; a document that cannot be written logged at warn with the error, its dimensions and the metric names |
| `src/server/common/helpers/metrics/external-call-metrics.test.js` | The two metrics, their units and dimensions; a thrown error, a 5xx and a 4xx; the log line's nested `event` with an integral duration, no flat `event.category`, `error` with no stack trace, `http.response.status_code`, and `trace.id` from a request sent with the tracing header |
| `src/server/common/helpers/backend-client/backend-fetch.test.js` | One `animals-backend` call per use, under the operation named, timed from the first attempt when the connection is retried and counted once; a 5xx a failure, a 409 a success |
| `src/server/app/services/dependency-operations.test.js` | Every HTTP call site (the backend records and document uploads, address-book, reference-data and cdp-uploader) recorded under its dependency and the operation in "Dependency layer" above, as a success on a 2xx and a failure on a 5xx |
| `src/server/common/helpers/metrics/request-metrics.test.js` | `routeSection` and `routePage` for every route shape; a page request's time from received to completed tagged `method`, `section` and `status.class`; a request no route matches as `unmatched` `4xx`; a request the client aborts as `4xx`; health not published; a posted answer shown again with an error summary counted for its page, an accepted one and a page view not; the page-request counts tagged `request.kind` `page` when `callCounts.metrics.enabled` is on, and none when it is off |
| `src/server/common/helpers/call-counts/call-counts.test.js` | A route's calls added up per page request; health and `/call-counts` never counted; `DELETE` clearing the totals |
| `src/server/common/helpers/redis-connection-events.test.js` | Nothing before the first event, even after a minute; 1 once ready and again every minute; ready then closed gives 0, one lost connection and one log line per change; ready again gives 1, 0, 1; a client that stops reconnecting logged once at error; a client that never connected counts no lost connection; each client error and Cluster node error logged and counted |
| `src/server/common/helpers/redis-client.test.js` | A client that connects is published as available and logged once |
| `src/server/common/helpers/session-cache/measured-redis-engine.test.js` | A hit and a miss for the segment; a `set`, `get` and `drop` each one `redis` call with an external-call line naming the segment; a failed `get` rethrown, recorded as a failed `redis` `get` and counted as neither hit nor miss |
| `src/server/app/engine/persistence/records.test.js` | Each journey counter after its write; a stale save counted as a conflict and rethrown; a stale submit counted as a conflict and not as a submission |
| `src/server/app/sets/live-animals/journeys/linear/flow/entry-guard.test.js` | A redirect counted once, a journey with an answer not counted |
| The Defra ID tests: `src/auth/get-oidc-config.test.js`, `get-oidc-config-with-retry.test.js`, `verify-token.test.js`, `refresh-tokens.test.js`, `token-exchange-timer.test.js`, `src/plugins/auth.test.js` and `src/server/auth/controller.test.js` | Each Defra ID call, through `nock` and the real logger, recorded under its dot-case operation with its interface id in the line's message; a 5xx answer and a call not answered in time each a failure, a 400 refusal a success logged with its status; the token exchange timed from Bell's token lookup, a sign-in that did not authenticate a failed exchange, and nothing recorded when Bell never reached the token call |

Each was checked to go red without the change it covers. Run the repo's
`npm run format:check`, `npm run lint` and `npm test` before pushing.

## Not done on animals-frontend

- `external.dependency.available` for the HTTP dependencies: alerts use
  `external.call.failure` (`METRICS.md` → "Availability: passive or
  active").
- The other Node services still publish the old names: `METRICS.md` →
  "A service built the old way".
