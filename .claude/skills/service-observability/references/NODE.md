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

On animals-frontend, under `src/server/common/helpers/`:

| File | What it does |
|---|---|
| `metrics/publish-metrics.js` | `publishMetricsInBackground(dimensions, metrics)` writes one EMF document: the metrics given, all with the same dimensions, in the namespace `metrics.namespace` (`AWS_EMF_NAMESPACE`, default the service name). It does not make the caller wait, and logs a failed write at warn with the metric names. `countEvent(name, dimensions)` publishes a count of 1. It copies the dimensions before handing them over: the EMF library writes to the object it is given, so a frozen one fails every publish |
| `metrics/external-call-metrics.js` | The dependency layer. `measureExternalCall(externalCall, call)` (a call fails when it throws) and `measureExternalResponse(externalCall, send)` (an HTTP call also fails on a 5xx status), where `externalCall` is the `{ dependency, operation }` descriptor and `call` or `send` the function that makes the call, time a call and pass it to `recordExternalCallInBackground`, which counts it against the request in progress, writes the log line and publishes `external.call.duration` and `external.call.failure` tagged `dependency` and `operation` |
| `metrics/request-metrics.js` | The endpoint layer. `recordRequestInBackground(request)` publishes `http.server.requests` and counts `journey.validation.failure` |
| `call-counts/call-counts.js` | The hapi plugin whose `response` listener calls `recordRequestInBackground` for every page request: no handler changes |
| `redis-availability.js` | Follows the Redis client's events ("Redis" below) |
| `session-cache/measured-redis-engine.js` | The catbox Redis engine with each `get`, `set` and `drop` measured |

The engine layer is recorded in `src/server/app/engine/persistence/records.js`
and the journey entry guard ("Engine layer" below).

## Dependency layer

Measure at the one place each dependency is called, never at each call
site's caller:

| Dependency | Choke point | Operations |
|---|---|---|
| `animals-backend` | `createBackendFetch` (`call-counts/backend-fetch.js`): `backendFetch(operation, url, init)`. A connection retried once is one call, timed from the first attempt | `create-notification`, `copy-notification`, `get-fulfilment`, `list-notifications`, `replace-notification`, `submit-notification`, `amend-notification`, `cancel-amend-notification`, `soft-delete-notification`, `register-document-upload`, `claim-document-upload`, `get-document-upload-session`, `list-document-uploads`, `get-document-upload-status`, `delete-document-upload`, `stream-document-file` |
| `address-book` | `addressBookFetch(operation, url, init)` (`services/address-book-request.js`) | `list-addresses`, `get-address`, `list-transporters`, `create-transporter` |
| `reference-data` | `requestReferenceData(operation, url, init, failureMessage)` (`services/reference-data/request.js`) | `get-countries`, `get-ports-of-entry`, `search-commodities`, `check-species` |
| `cdp-uploader` | `measureExternalCall` in `services/cdp-uploader/real.js` | `initiate`, `status` |
| `defra-id` | `measureExternalCall` around each Wreck call in `src/auth/`; Bell's token exchange through `token-exchange-timer.js` | `openid-configuration`, `jwks`, `token-exchange`, `token-refresh` |
| `redis` | `MeasuredRedisEngine` | `get`, `set`, `drop` |

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
  `trackRedisAvailability(client)` publishes `external.dependency.available`
  `{dependency=redis}` as 1 on `ready` and 0 on `close` or `end`, on each
  change and every minute after (nothing before the first event). It
  logs each change once: `Redis is available` at info, `Redis is
  unavailable` at warn.
- **Lost connections and errors**: each change from ready to closed
  counts `external.dependency.connection.lost`, and each client `error`
  event counts `external.dependency.error`, both `{dependency=redis}`.
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
| `journey.started`, `journey.submitted`, `journey.amended`, `journey.copied`, `journey.deleted` | `engine/persistence/records.js`: after `create`, `finalise`, `amend`, `copy` and `softDelete` succeed. Every write goes through this facade, stub or real |
| `journey.concurrency.conflict` | The same facade: when `replaceFulfilment`, `finalise` or `copy` is refused with `STALE_CONCURRENCY_TOKEN` |
| `journey.entry.redirect` | `entryGuardTarget` (the live-animals entry guard), where it decides to redirect and logs it |

## Tests

Each test reads what is written. A console spy with
`AWS_EMF_ENVIRONMENT=Local` (set by the repo's `npm test`) captures the
EMF documents; `test-helpers/emf-documents.js` parses them.
`test-helpers/ecs-log-lines.js` sends the module logger's lines through
a pino logger with the deployed ECS options (`ecsFormatOptions` and
`traceMixin`, exported from `logging/logger-options.js`) and keeps the
JSON it writes.

| Test | Proves |
|---|---|
| `metrics/publish-metrics.test.js` | Namespace, exactly the dimensions given, the empty dimension set for a count with none, frozen dimensions still published, a failed write logged at warn with the metric names |
| `metrics/external-call-metrics.test.js` | The two metrics, their units and dimensions; a thrown error, a 5xx and a 4xx; the log line's nested `event` with an integral duration, no flat `event.category`, `error` with no stack trace, `http.response.status_code`, and `trace.id` from a request sent with the tracing header |
| `call-counts/backend-fetch.test.js` | One `animals-backend` call per use, timed from the first attempt when the connection is retried; 502 a failure, 409 a success |
| `metrics/request-metrics.test.js` | `routeSection` and `routePage` for every route shape; `http.server.requests` dimensions and unit; not-found as `unmatched` `4xx`; health not published; a refused answer counted for its page, an accepted one not |
| `call-counts/call-counts.test.js` | The page-request counts' names and dimension, and nothing published when `callCounts.metrics.enabled` is off |
| `redis-availability.test.js` | Nothing before the first event; 1 then 1 a minute later; ready then closed gives 1, 0, one lost connection and one log line per change; errors counted |
| `session-cache/measured-redis-engine.test.js` | Hit and miss by segment, each operation recorded with its log line, a failed `get` rethrown and recorded |
| `app/engine/persistence/records.test.js` | Each journey counter after its write, a stale save and a stale submit counted as a conflict and not as a submission |
| `entry-guard.test.js` | A redirect counted once, a journey with an answer not counted |
| The Defra ID tests in `src/auth/` and `src/server/auth/controller.test.js` | The Defra ID calls under the dot-case names |

Each was checked to go red without the change it covers. Run the repo's
`npm run format:check`, `npm run lint` and `npm test` before pushing.

## Not done on animals-frontend

- `external.dependency.available` for the HTTP dependencies: alerts use
  `external.call.failure` (`METRICS.md` → "Availability: passive or
  active").
- The other Node services still publish the old names: `METRICS.md` →
  "A service built the old way".
