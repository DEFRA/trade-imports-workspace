# Pino Logging — Best Practices

Project baseline: Pino with `@elastic/ecs-pino-format` for ECS output, `hapi-pino` plugin, `@defra/hapi-tracing` for trace ID propagation. Used in both `trade-imports-animals-frontend` and `trade-imports-animals-admin`.

---

## 1. Why Pino

Performance benchmarks (from Pino docs):

| Logger | Time (basic string log) |
|--------|------------------------|
| Pino | ~115ms |
| Winston | ~270ms |
| Bunyan | ~377ms |

Pino serialises directly to JSON and writes to a stream. It avoids the overhead of Winston's transport abstraction and Bunyan's circular-reference handling.

**Never use `console.log`** in a deployed service. It:
- Has no log levels
- Produces unstructured output that can't be parsed by log aggregators
- Has no redaction
- Has no context binding

---

## 2. Creating a logger

```js
import pino from 'pino'
import ecsFormat from '@elastic/ecs-pino-format'

// Production (ECS format, no transport)
const logger = pino({
  ...ecsFormat(),
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: 'trade-imports-animals-frontend'
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers'
    ],
    remove: true  // remove field entirely rather than replacing with [Redacted]
  }
})

// Local dev (human-readable)
const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  }
})
```

Switch format by environment:

```js
const isLocal = process.env.NODE_ENV === 'development'

export const createLogger = () => pino(
  isLocal
    ? {
        level: 'debug',
        transport: { target: 'pino-pretty', options: { colorize: true } }
      }
    : {
        ...ecsFormat(),
        level: process.env.LOG_LEVEL ?? 'info',
        base: { service: 'trade-imports-animals-frontend' },
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
          remove: true
        }
      }
)
```

---

## 3. Log levels

| Level | When to use |
|-------|-------------|
| `trace` | Very fine-grained detail — never in production |
| `debug` | Diagnostic detail for troubleshooting |
| `info` | Normal operations — default production level |
| `warn` | Unexpected but handled (e.g. fallback used, retry succeeded) |
| `error` | Operation failed, needs attention |
| `fatal` | Process-ending failure |

Set production level to `info`. Only enable `debug` behind an environment variable:

```js
level: process.env.LOG_LEVEL ?? 'info'
```

---

## 4. Structured logging — core pattern

Always log an **object first**, then a **static message**:

```js
// Correct — machine-parseable, searchable
logger.info({ userId, requestId, duration }, 'Notification saved')
logger.error({ err, referenceNumber }, 'Failed to save notification')
logger.warn({ retryCount, endpoint }, 'Backend request retried')

// Wrong — string concatenation
logger.info('Notification ' + referenceNumber + ' saved by ' + userId)
logger.info(`User ${userId} completed action`)  // also wrong
```

The message should be a **static string** — identifiers go in the object. This allows log aggregators to group by message type.

Full request lifecycle example:

```js
server.route({
  method: 'POST',
  path: '/notifications',
  handler: async (request, h) => {
    const { referenceNumber } = request.payload

    request.logger.info({ referenceNumber }, 'Saving notification')

    try {
      const result = await notificationClient.save(request, referenceNumber)
      request.logger.info({ referenceNumber, result: result.referenceNumber }, 'Notification saved')
      return h.redirect('/confirmation')
    } catch (err) {
      request.logger.error({ err, referenceNumber }, 'Failed to save notification')
      return h.redirect('/error')
    }
  }
})
```

---

## 4a. What to log

Logging fails here more often by silence than by noise. Support must be able to answer "what happened to this notification, and why?" from the logs alone.

**Every branch that changes an outcome logs once.** An outcome-changing branch is a refusal, a redirect away from the page asked for, a retry, a fallback, or a state switch. Log it at the branch that decides, once. Do not log the same decision again further up.

**Carry the ids support searches by.** At least one of these, whichever the code has:

| Id | Key |
|---|---|
| Notification reference | `referenceNumber` |
| Journey | `journeyId` |
| User or organisation | `userId`, `organisationId` |
| Request | `request.logger` binds it for you; outside a request, pass the trace id |
| The thing decided about | for example `portCode`, `uploadId`, `dataset` |

If the branch does not have the id in scope, pass it in. Do not log without it.

**Log the error as `{ err }`.** Never `err.message` alone, and never a template string. The `err` serialiser keeps the type, the stack and the `cause` chain.

**No bodies at INFO.** Never log a request or response body at `info`. Log the status, the size or the field names instead. A body may hold personal data, and it buries the line support needs. If a body is the only way to tell two failures apart, log a bounded excerpt at `warn` on the failure path only.

**Pick the level by who must act.** `warn` for a handled fallback or retry, and for another service refusing what this one accepted, such as the backend rejecting a form the frontend validated: the two sides' rules have drifted. `error` for a failure someone must look at. `info` for an expected refusal, such as a not-found, a dead link or a refused return address.

**Do not log a user's own input errors.** A field the user left blank or mistyped, shown back to them on the form, is the page doing its job. Logging it buries the lines support needs and risks writing personal data.

### Bad and good

**A silent retry.** A client that retries a backend connection that never opened, and says nothing, hides the cost. When the stack is slow, support cannot tell that every page is paying for a retry. `backendFetch` in both frontends logs the retry as below.

```js
// Bad
} catch (error) {
  if (!isConnectError(error)) {
    throw error
  }
  return fetchOnce(url, init)
}

// Good
} catch (error) {
  if (!isConnectError(error)) {
    throw error
  }
  logger.warn({ err: error, url: String(url), traceId: getTraceId() }, 'Backend connection did not open, retrying once')
  return fetchOnce(url, init)
}
```

**A failure with no cause.** The Java external-call metrics (`ExternalCallMetrics.java`) log "failure in 5 ms" and drop the error. Support sees that a call failed, but not whether it was a timeout, a refusal or a 500. The same mistake in pino:

```js
// Bad
logger.warn({ integration, durationMs }, 'External call failed')

// Good
logger.warn({ err, integration, status: err.status, durationMs }, 'External call failed')
```

**A warning without the thing it warns about.** A Java port-type fallback (`PortType`) warns inside the enum, where the port code is not in scope, so the line cannot say which port. Log where the code is in scope, or pass the code in. In pino:

```js
// Bad
logger.warn('Unknown port type, using default')

// Good
logger.warn({ portCode, referenceNumber }, 'Unknown port type, using default')
```

**A message that hides the error.**

```js
// Bad
request.logger.error(`Failed to save notification: ${err.message}`)

// Good
request.logger.error({ err, referenceNumber }, 'Failed to save notification')
```

When you add a `catch`, a retry or a fallback, answer two questions before you finish: which line logs it, and which ids does that line carry?

---

## 5. Child loggers

Child loggers **bind context** to every subsequent log call:

```js
// Bind service name for module-level logger
const log = logger.child({ module: 'notification-client' })
log.info({ referenceNumber }, 'Fetching notification')
// → { "module": "notification-client", "referenceNumber": "...", "message": "Fetching notification" }

// Bind request context — do this per request, not per module
const requestLog = logger.child({
  requestId: request.info.id,
  method: request.method.toUpperCase(),
  path: request.path
})
```

With `hapi-pino`, `request.logger` is **already a child logger** pre-bound with request ID, HTTP method, URL, and trace ID. Always use `request.logger` inside route handlers:

```js
handler: async (request, h) => {
  // Use request.logger — not the module-level logger
  request.logger.info({ referenceNumber }, 'Processing')
}
```

Use `server.logger` inside plugin registration code (outside request context).

---

## 6. Serialisers

Serialisers transform objects before logging — critical for `Error` objects:

```js
import pino from 'pino'

pino({
  serializers: {
    req: pino.stdSerializers.req,   // captures method, url, headers
    res: pino.stdSerializers.res,   // captures statusCode, headers
    err: pino.stdSerializers.err    // captures message, type, stack
  }
})
```

What `pino.stdSerializers.err` captures:

```js
// Error object
new Error('Something failed')

// Serialised as:
{
  "type": "Error",
  "message": "Something failed",
  "stack": "Error: Something failed\n    at ..."
}
```

Custom serialiser example:

```js
serializers: {
  user: (user) => ({
    id: user.id,
    // omit name, email — PII
  })
}
```

---

## 7. Redaction

This project's production redact config:

```js
redact: {
  paths: [
    'req.headers.authorization',  // bearer tokens
    'req.headers.cookie',         // session cookies
    'res.headers'                 // response headers (may include Set-Cookie)
  ],
  remove: true  // delete the field entirely
}
```

Additional patterns:

```js
// Replace with [Redacted] (default behaviour without remove)
redact: ['req.headers.authorization', '*.password']

// Wildcard — redact password at any depth
redact: { paths: ['*.password', '*.token'], remove: true }

// Array items
redact: ['users[*].password']
```

Never log: JWT tokens, session IDs, passwords, National Insurance numbers, dates of birth, addresses.

---

## 8. ECS format (`@elastic/ecs-pino-format`)

ECS (Elastic Common Schema) is required by Defra CDP for log aggregation.

```js
import ecsFormat from '@elastic/ecs-pino-format'

const logger = pino(ecsFormat({
  convertReqRes: true  // automatically serialise req/res using ECS fields
}))
```

ECS field mapping:

| Pino field | ECS field |
|-----------|----------|
| `time` | `@timestamp` |
| `level` | `log.level` |
| `msg` | `message` |
| `err.message` | `error.message` |
| `err.stack` | `error.stack_trace` |
| `err.type` | `error.type` |
| `req.method` | `http.request.method` |
| `req.url` | `url.path` |
| `res.statusCode` | `http.response.status_code` |

Always use ECS format in deployed environments. Use `pino-pretty` only for local development — it's too slow for production and breaks log parsing.

---

## 9. hapi-pino integration

```js
import hapiPino from 'hapi-pino'

await server.register({
  plugin: hapiPino,
  options: {
    logPayload: false,           // don't log request bodies (PII risk)
    logRequestComplete: true,    // log when request completes (timing)
    ignoredPaths: ['/health', '/healthz'],  // suppress health check noise
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      remove: true
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res
    },
    // Bind additional fields to every request log
    getChildBindings: (request) => ({
      requestId: request.info.id,
      // traceId comes from @defra/hapi-tracing automatically
    })
  }
})
```

Inside route handlers:

```js
handler: async (request, h) => {
  // Pre-bound with request ID, method, URL, traceId
  request.logger.info({ referenceNumber }, 'Handler called')
  request.logger.error({ err, referenceNumber }, 'Handler failed')
}
```

`server.logger` for use in plugins (outside request lifecycle):

```js
register: async (server, options) => {
  server.logger.info({ pluginName: 'auth' }, 'Auth plugin registered')
}
```

---

## 10. Trace ID propagation via `@defra/hapi-tracing`

The `@defra/hapi-tracing` plugin reads the `x-cdp-request-id` request header and binds it to every log in that request's context:

```js
import { createTracing } from '@defra/hapi-tracing'

await server.register({
  plugin: createTracing,
  options: { tracingHeader: 'x-cdp-request-id' }
})
```

Every `request.logger` call will then include `traceId` automatically. Propagate the header to downstream services:

```js
const response = await fetch(backendUrl, {
  headers: {
    'x-cdp-request-id': request.info.id,
    'Content-Type': 'application/json'
  }
})
```

---

## 11. Error logging — correct pattern

```js
// Correct — pass Error as `err` key so the serialiser handles it
request.logger.error({ err, referenceNumber }, 'Failed to fetch notification')
// Logs: { "error": { "type": "Error", "message": "...", "stack_trace": "..." }, "referenceNumber": "...", "message": "Failed to fetch notification" }

// Wrong — loses stack trace and type
logger.error(err.message)                    // just a string — no stack trace
logger.error(`Failed: ${err.message}`)      // same problem
logger.error(err)                           // Pino passes as first arg without err serialiser key
logger.error({ message: err.message })      // doesn't trigger err serialiser
```

Always use `{ err }` as the property name — this is what `pino.stdSerializers.err` keyed on `err` will pick up.

---

## 12. Defra CDP conventions

1. **ECS format in all deployed environments** — parse errors in the log aggregator break alerting
2. **Suppress health check endpoints** — `ignoredPaths: ['/health', '/healthz']` in hapi-pino options
3. **Include trace ID** — via `@defra/hapi-tracing`, propagate to all downstream calls
4. **Production level: `info`** — never deploy with `debug` or `trace`
5. **No `console.log`** — configure ESLint `no-console` rule
6. **Service name in base** — `base: { service: 'trade-imports-animals-frontend' }` for log source identification
7. **Structured objects over strings** — every log should be greppable by field value

---

## 13. Transports

**Local development:**
```js
transport: {
  target: 'pino-pretty',
  options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
}
```

**Production:** no transport — raw JSON output, fastest path:
```js
// No transport option — writes JSON directly to stdout
const logger = pino(ecsFormat())
```

**Multiple targets** (e.g. different levels to different destinations):
```js
transport: {
  targets: [
    { target: 'pino-pretty', level: 'debug', options: { colorize: true } },
    { target: '@elastic/ecs-pino-transport', level: 'warn', options: { ... } }
  ]
}
```

---

## 14. Async destinations

```js
import pino from 'pino'

// Async stdout — faster for high-throughput services
const dest = pino.destination({ dest: 1, sync: false })
const logger = pino({ level: 'info' }, dest)

// Must flush on graceful shutdown
process.on('SIGTERM', () => {
  logger.flush()
  process.exit(0)
})

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception')
  logger.flush()
  process.exit(1)
})
```

Do **not** use async destinations in Lambda or short-lived processes — the process may exit before the buffer flushes.

---

## 15. Common mistakes

**1. String concatenation instead of structured object**
```js
// Wrong
logger.info('Saving notification ' + referenceNumber + ' for user ' + userId)
// Correct
logger.info({ referenceNumber, userId }, 'Saving notification')
```

**2. Logging errors without `err` key**
```js
// Wrong — loses stack trace
logger.error('Failed: ' + err.message)
logger.error({ message: err.message })
// Correct
logger.error({ err, referenceNumber }, 'Failed to save notification')
```

**3. Using `console.log`**
```js
// Wrong
console.log('Server started on port', port)
// Correct
logger.info({ port }, 'Server started')
```

**4. Logging sensitive fields without redaction**
```js
// Wrong — logs bearer token
logger.info({ headers: request.headers }, 'Request received')
// Correct — use redact config, or select safe fields
logger.info({ method: request.method, path: request.path }, 'Request received')
```

**5. Creating a new logger per request**
```js
// Wrong — expensive, loses bindings
handler: async (request, h) => {
  const logger = pino()  // new logger per request
}
// Correct — use request.logger (pre-bound by hapi-pino)
handler: async (request, h) => {
  request.logger.info({ ... }, 'Handler called')
}
```

**6. Using `error` level for expected/handled cases**
```js
// Wrong — 404s are expected, not errors
logger.error({ referenceNumber }, 'Notification not found')
// Correct
logger.info({ referenceNumber }, 'Notification not found — returning 404')
```

**7. Not setting a `base` for service identification**
```js
// Wrong — can't tell which service this log came from
const logger = pino()
// Correct
const logger = pino({ base: { service: 'trade-imports-animals-frontend' } })
```

**8. Using `pino-pretty` in production**
```js
// Wrong — slow, breaks ECS parsing
transport: { target: 'pino-pretty' }
// Correct — no transport in production
```

**9. Not flushing async destination on shutdown**
```js
// Wrong — last logs may be lost
process.on('SIGTERM', () => process.exit(0))
// Correct
process.on('SIGTERM', () => { logger.flush(); process.exit(0) })
```

**10. Dynamic message strings**
```js
// Wrong — can't group logs by message type
logger.info(`User ${userId} performed ${action} on ${entity}`)
// Correct — static message, context in object
logger.info({ userId, action, entity }, 'User performed action')
```