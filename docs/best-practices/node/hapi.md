# Hapi.js — Best Practices

Project baseline: `@hapi/hapi` 21.4.x, Node >= 24, ESM modules throughout. Used in `trade-imports-animals-frontend` and `trade-imports-animals-admin`.

---

## 1. Server creation and configuration

```js
// src/server/server.js
import Hapi from '@hapi/hapi'
import { config } from '../config/config.js'

export const createServer = async () => {
  const server = Hapi.server({
    host: '0.0.0.0',
    port: config.get('port'),
    router: {
      stripTrailingSlash: true
    },
    routes: {
      security: {
        hsts: true,
        xss: 'enabled',
        noOpen: true,
        noSniff: true,
        referrer: false
      },
      validate: {
        options: {
          abortEarly: false  // report all validation errors, not just first
        }
      }
    }
  })

  await registerPlugins(server)
  return server
}

// src/index.js — start script (separate from server factory)
import { createServer } from './server/server.js'
import { logger } from './server/common/helpers/logging/logger.js'

const server = await createServer()
await server.start()
logger.info({ port: server.info.port }, 'Server started')

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.stop({ timeout: 10000 })
  process.exit(0)
})
```

---

## 2. Route definition

```js
// Route config is exported from a module and spread into server.route()
// src/server/origin/index.js
import { originController } from './controller.js'

export const originRoutes = [
  {
    method: 'GET',
    path: '/origin',
    ...originController.get
  },
  {
    method: 'POST',
    path: '/origin',
    ...originController.post
  }
]
```

```js
// Register all routes
import { originRoutes } from './origin/index.js'
import { commodityRoutes } from './commodity/index.js'

server.route([
  ...originRoutes,
  ...commodityRoutes
])
```

Route object shape:

```js
{
  method: 'GET',                    // 'GET', 'POST', 'PUT', 'DELETE', '*'
  path: '/origin/{id?}',            // {param} required, {param?} optional, {path*} wildcard
  handler: async (request, h) => { ... },
  options: {
    auth: 'session',               // auth strategy name, or false to disable
    tags: ['api'],                 // for OpenAPI grouping
    description: 'Get origin',     // documentation
    validate: { ... },             // Joi validation (see section 3)
    payload: {
      maxBytes: 1048576,           // 1MB
      parse: true                  // parse JSON/form body
    },
    pre: [                         // route lifecycle prerequisites
      { method: loadNotification, assign: 'notification' }
    ]
  }
}
```

---

## 3. Validation with Joi

**Built-in route validation** — Hapi rejects the request if validation fails:

```js
import Joi from 'joi'

{
  method: 'GET',
  path: '/notifications/{referenceNumber}',
  options: {
    validate: {
      params: Joi.object({
        referenceNumber: Joi.string().pattern(/^DRAFT\.IMP\.\d{4}\.\d+$/).required()
      }),
      query: Joi.object({
        returnTo: Joi.string().valid('/check-answers', '/summary').optional()
      }),
      failAction: async (request, h, err) => {
        throw err  // re-throw so the error reaches onPreResponse
      }
    }
  },
  handler: async (request, h) => {
    const { referenceNumber } = request.params
    // ...
  }
}
```

**Every path parameter needs a format constraint.** A handler that does its own `if (!UPLOAD_ID_PATTERN.test(uploadId))` check is one accidental rename away from a 500. Push the format into `validate.params` on the route definition so Hapi rejects malformed input at the routing layer, before the handler runs.

```js
// Wrong — handler-level guard, easy to drop or get wrong
{
  method: 'GET',
  path: '/document-uploads/{uploadId}',
  handler: async (request, h) => {
    const { uploadId } = request.params
    if (!/^[a-zA-Z0-9-]+$/.test(uploadId)) throw Boom.badRequest()
    // ...
  }
}

// Correct — route-level validation
{
  method: 'GET',
  path: '/document-uploads/{uploadId}',
  options: {
    validate: {
      params: Joi.object({
        uploadId: Joi.string().pattern(/^[a-zA-Z0-9-]+$/).min(1).max(50).required()
      })
    }
  },
  handler: async (request, h) => { /* uploadId is guaranteed valid */ }
}
```

**Manual validation in handler** — for GOV.UK-style form validation with field-level errors:

```js
// src/server/origin/schema.js
import Joi from 'joi'

export const originSchema = Joi.object({
  countryCode: Joi.string().min(2).max(3).required().messages({
    'any.required': 'Select a country',
    'string.empty': 'Select a country'
  }),
  requiresRegionCode: Joi.string().valid('yes', 'no').required().messages({
    'any.required': 'Select yes or no'
  })
})
```

```js
// src/server/common/helpers/format-validation-errors.js
export const formatValidationErrors = (joiError) => {
  return Object.fromEntries(
    joiError.details.map(detail => [
      detail.context.key,
      detail.message
    ])
  )
}
```

```js
// controller.js — manual validation
import { originSchema } from './schema.js'
import { formatValidationErrors } from '../common/helpers/format-validation-errors.js'

handler: async (request, h) => {
  const { error, value } = originSchema.validate(request.payload, { abortEarly: false })

  if (error) {
    const errors = formatValidationErrors(error)
    // Re-render the form with errors
    return h.view('origin/origin', {
      ...request.payload,
      errors,
      errorList: Object.entries(errors).map(([key, text]) => ({ text, href: `#${key}` }))
    })
  }

  // Valid — proceed
  await notificationClient.save(request, value)
  return h.redirect('/commodities')
}
```

---

## 4. Lifecycle hooks

**`onPreResponse`** — the catch-all error handler. It runs for every response, including errors.

The catch-all logs a server error once, as `{ err, statusCode }`, at `error`. It does not log a 4xx: hapi-pino's request-complete line already carries the status, and a refusal is logged with its ids where the handler decided it (see `pino-logging.md` §4a).

```js
server.ext('onPreResponse', (request, h) => {
  const { response } = request

  if (!response.isBoom) {
    return h.continue
  }

  const statusCode = response.output.statusCode

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error({ err: response, statusCode }, 'Request failed')
  }

  return h.view('shared/error', errorPageContext(request, statusCode)).code(statusCode)
})
```

Bad (`src/server/common/helpers/errors.js` in the animals frontend): two lines for one failure, the first a bare stack string with no status, the second a message built from the cause.

```js
request.logger.error(response?.stack)
const cause = response.data?.cause
if (cause) {
  request.logger.error({ err: cause }, `Caused by: ${cause.message}`)
}
```

Carry the cause on the error, not in `data`. Wrap the lower error with `{ cause }` before turning it into a Boom, and the `err` serialiser prints the whole chain in the one line:

```js
} catch (err) {
  throw Boom.boomify(new Error('Could not save notification', { cause: err }))
}
```

Other extension points:

```js
// Before authentication
server.ext('onPreAuth', (request, h) => {
  // e.g. whitelist health check routes
  return h.continue
})

// After credentials set but before route auth check
server.ext('onCredentials', (request, h) => {
  // e.g. enrich credentials with user profile
  return h.continue
})

// After auth succeeds
server.ext('onPostAuth', (request, h) => {
  return h.continue
})
```

Plugin-scoped extensions (only apply to routes registered by this plugin):

```js
register: (server, options) => {
  server.ext({
    type: 'onPreResponse',
    method: handler,
    options: { sandbox: 'plugin' }
  })
}
```

---

## 5. Plugin system

```js
// Plugin shape
const myPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  register: async (server, options) => {
    // Register routes, extensions, decorations
    server.route([...])
    server.ext('onPreResponse', ...)
    server.decorate('request', 'userId', () => null)  // per-request decorator

    server.app.mySharedState = {}  // shared state
  }
}

// Register
await server.register([
  myPlugin,
  { plugin: anotherPlugin, options: { key: 'value' } }
])
```

**Registration order matters** — auth plugins must be registered before routes that use them.

Typical registration order:
1. Inert (static files)
2. Vision (Nunjucks)
3. hapi-pino (logging)
4. Cookie auth + Bell (auth strategies)
5. Yar (sessions)
6. CSRF plugin
7. CSP plugin
8. Application routes

---

## 6. OIDC auth — Bell + Cookie

```js
import Bell from '@hapi/bell'
import Cookie from '@hapi/cookie'

await server.register([Bell, Cookie])

// Bell provider for OIDC
server.auth.strategy('oidc', 'bell', {
  provider: {
    name: 'defra-id',
    protocol: 'oauth2',
    useParamsAuth: true,
    auth: config.get('oidc.authorizationEndpoint'),
    token: config.get('oidc.tokenEndpoint'),
    profile: async function (credentials, params, get) {
      // Fetch user profile from OIDC userinfo endpoint
      const profile = await get(config.get('oidc.userInfoEndpoint'))
      credentials.profile = { id: profile.sub, email: profile.email }
    },
    scope: ['openid', 'email', 'profile']
  },
  password: config.get('cookiePassword'),
  clientId: config.get('oidc.clientId'),
  clientSecret: config.get('oidc.clientSecret'),
  cookie: 'bell-oidc',
  isSecure: config.get('isProduction')
})

// Cookie session strategy
server.auth.strategy('session', 'cookie', {
  cookie: {
    name: 'tia-session',
    password: config.get('cookiePassword'),
    isSecure: config.get('isProduction'),
    isSameSite: 'Lax',
    ttl: 3600 * 1000  // 1 hour
  },
  validate: async (request, session) => {
    // Called on every authenticated request — good place to refresh tokens
    if (isTokenExpired(session.token)) {
      const refreshed = await refreshToken(session.refreshToken)
      if (!refreshed) {
        return { valid: false }
      }
      return { valid: true, credentials: { ...session, token: refreshed.accessToken } }
    }
    return { valid: true, credentials: session }
  }
})

server.auth.default('session')  // apply to all routes unless overridden
```

Route with `mode: 'try'` (works for both authed and anonymous users):

```js
{
  method: 'GET',
  path: '/public-page',
  options: { auth: { mode: 'try' } },
  handler: async (request, h) => {
    const isAuthed = request.auth.isAuthenticated
    return h.view('public', { isAuthed })
  }
}
```

After auth, `request.auth.credentials` contains:
```js
{
  user: { id: '...', email: '...' },
  token: 'jwt-access-token',
  refreshToken: 'refresh-token',
  sessionId: 'session-uuid'
}
```

---

## 7. Sessions — Catbox + Yar

**Named cache with Redis:**

```js
import { CatboxRedis } from '@hapi/catbox-redis'

// Register cache engine
await server.cache.provision({
  name: 'session',
  provider: {
    constructor: CatboxRedis,
    options: {
      host: config.get('redis.host'),
      port: config.get('redis.port'),
      password: config.get('redis.password'),
      tls: config.get('isProduction') ? {} : undefined
    }
  }
})

// Create a cache policy
server.app.cache = server.cache({
  cache: 'session',
  expiresIn: 3600 * 1000,
  segment: 'sessions'
})
```

**Yar for per-request sessions:**

```js
import Yar from '@hapi/yar'

await server.register({
  plugin: Yar,
  options: {
    name: 'tia-session',
    maxCookieSize: 0,  // always use server-side storage
    storeBlank: false,
    cache: {
      cache: 'session',
      expiresIn: 3600 * 1000
    },
    cookieOptions: {
      password: config.get('cookiePassword'),
      isSecure: config.get('isProduction'),
      isSameSite: 'Lax'
    }
  }
})
```

Session helper pattern:

```js
// src/server/common/helpers/session.js
export const getNotification = (request) =>
  request.yar.get('notification') ?? {}

export const setNotification = (request, data) =>
  request.yar.set('notification', data)

export const clearNotification = (request) =>
  request.yar.clear('notification')
```

In-memory fallback (for local dev without Redis):

```js
const cacheProvider = config.get('redis.host')
  ? { constructor: CatboxRedis, options: redisOptions }
  : { constructor: CatboxMemory }
```

---

## 8. Request / response

```js
handler: async (request, h) => {
  // Accessing request data
  const { id } = request.params          // path parameters
  const { page = 1 } = request.query    // query string
  const data = request.payload           // request body (POST)
  const token = request.headers['authorization']
  const { user } = request.auth.credentials

  // Rendering a view
  return h.view('path/to/template', { data, user })

  // Redirect
  return h.redirect('/next-page')
  return h.redirect('/external').permanent()  // 301

  // JSON response
  return h.response({ id: 1 }).code(201)

  // No content
  return h.response().code(204)

  // Set cookie
  return h.response(data).state('my-cookie', 'value', { isSecure: true })

  // Continue (in lifecycle hooks)
  return h.continue
}
```

Cookie auth management:

```js
// Set session credentials (after successful login)
request.cookieAuth.set({ userId: user.id, token: accessToken })

// Clear session (logout)
request.cookieAuth.clear()
```

### Encoding values into outbound URLs

When an HTTP client interpolates user-supplied data (a reference number, an upload ID) into a URL path, always wrap the value with `encodeURIComponent`. Without it, a value containing `/`, `?`, `#`, or whitespace silently rewrites the request URL — at best you get a 404 from the wrong endpoint, at worst you have a request-smuggling vector.

```js
// Wrong — referenceNumber containing "/" or "?" rewrites the path
const response = await fetch(`${baseUrl}/notifications/${referenceNumber}/documents`)

// Correct
const response = await fetch(
  `${baseUrl}/notifications/${encodeURIComponent(referenceNumber)}/documents`
)
```

The same rule applies to query string values (`?ref=${encodeURIComponent(ref)}`). Schema validation on inbound params is not a substitute — clients calling other services need their own encoding layer.

### Error logging shape for fetch clients

When a fetch client throws on a non-OK response, the error must carry the status code. `Failed to submit notification` could be a 4xx (our bug) or a 5xx (backend down), and the response differs.

Attach `status` and `statusText` to the error, so callers, the catch-all and tests can match on them:

```js
if (!response.ok) {
  const error = new Error(`Failed to fetch document: ${response.status} ${response.statusText}`)
  error.status = response.status
  error.statusText = response.statusText
  throw error
}
```

Log the error once, where the outcome is decided, as `{ err }` with the ids. Do not log it in the client and again in the caller.

```js
// Bad: a string, so the stack, type and cause are lost, and no id
} catch (error) {
  logger.error(`Failed to fetch document: ${error.status} ${error.message}`)
  throw error
}

// Good
} catch (err) {
  request.logger.error({ err, status: err.status, referenceNumber, uploadId }, 'Failed to fetch document')
  return h.redirect(documentsPath(referenceNumber))
}
```

### File uploads to cdp-uploader without JavaScript

A page that uploads a file must work with JavaScript turned off. The exemplar CDP points to is `DEFRA/fcp-sfd-portal-stub`.

- **Same-origin upload.** A reverse proxy on the frontend's own domain routes `/upload-and-scan/` to cdp-uploader. The browser posts the form straight to it, and cdp-uploader's relative `302` comes back to the frontend. No `fetch` or `redirect: 'manual'` is needed. In the exemplar: `nginx/nginx.conf` (`proxy_pass` for `/upload-and-scan/`, `client_max_body_size 100M`).
- **Initiate on the server.** The route calls cdp-uploader's initiate endpoint and sets the form's `uploadUrl` to the frontend's own domain. In the exemplar: `src/routes/document-upload.js`.
- **Poll status without JavaScript.** A processing page refreshes itself with `<meta http-equiv="refresh">` and a check-status route until the scan finishes. In the exemplar: `src/views/document-upload/processing.njk`.
- **Size limit.** CDP's managed nginx adds a `location /upload-and-scan` to every service, with `client_max_body_size 2304M` (about 2.25 GB), proxied straight to cdp-uploader. So `browser → your-service/upload-and-scan` is not held to the roughly 10 MB limit on normal routes, and needs no platform request. Source: `DEFRA/cdp-nginx-upstreams`, `src/templates/server.conf.tpl`.
- **The stack reproduces it locally.** `docker/stack/config/nginx/animals-frontend.conf`
  is the workspace's own copy of that sidecar, mounted by the
  `animals-frontend-nginx` service, so the cap and the bypass behave locally as
  they do on CDP. See `docker/stack/AGENTS.md`.

---

## 9. Boom errors

```js
import Boom from '@hapi/boom'

// Common constructors
Boom.badRequest('Invalid reference number')   // 400
Boom.unauthorized('Not logged in')            // 401
Boom.forbidden('Insufficient permissions')    // 403
Boom.notFound('Notification not found')       // 404
Boom.conflict('Already exists')               // 409
Boom.tooManyRequests()                        // 429
Boom.badImplementation('Unexpected error')    // 500

// Detect in lifecycle
server.ext('onPreResponse', (request, h) => {
  const { response } = request
  if (response.isBoom) {
    const code = response.output.statusCode
    const message = response.message
    // handle...
  }
  return h.continue
})

// failAction for validation failures
options: {
  validate: {
    payload: schema,
    failAction: async (request, h, err) => {
      // err is a Joi ValidationError wrapped in Boom.badRequest
      throw err
    }
  }
}
```

---

## 10. `server.inject()` for testing

Use `server.inject()` for plugins, auth, routing and error pages. Call `server.initialize()`, not `server.start()`, so no port is bound, and stop with `server.stop({ timeout: 0 })` so the test does not hang.

Feature handlers are tested with `driveHandler` against the stub adapters, and backend clients with a fetch mock at the network boundary. Do not spy on a client from a controller test. See `testing/frontend.md` §2, §3 and §6.

---

## 11. Nunjucks + Vision

```js
import Vision from '@hapi/vision'
import nunjucks from 'docs/best-practices/node/nunjucks'
import path from 'path'

await server.register(Vision)

await server.views({
    engines: {
        njk: {
            compile: (src, options) => {
                const template = nunjucks.compile(src, options.environment)
                return (context) => template.render(context)
            },
            prepare: (options, next) => {
                options.compileOptions.environment = nunjucks.configure(
                    options.path,
                    {autoescape: true, trimBlocks: true, lstripBlocks: true}
                )
                return next()
            }
        }
    },
    // Template search paths
    relativeTo: process.cwd(),
    path: [
        'node_modules/govuk-frontend/dist/',
        'src/server/common/templates',
        'src/server/common/components'
    ],
    // Global context — merged with every h.view() call
    context: async (request) => ({
        serviceName: config.get('serviceName'),
        userSession: request.auth?.credentials,
        navigation: buildNavigation(request),
        csrfToken: request.app.csrfToken,
        assetPath: '/public',
        getAssetPath: (file) => `/public/${file}`
    })
})
```

In handlers:

```js
// Local context merges with global context
return h.view('origin/origin', {
  pageTitle: 'Origin',
  countryCode: 'DE',
  errors: { countryCode: 'Select a country' }
})
```

**Inert** for static files:

```js
import Inert from '@hapi/inert'
await server.register(Inert)

server.route({
  method: 'GET',
  path: '/public/{param*}',
  options: { auth: false },
  handler: {
    directory: {
      path: path.join(process.cwd(), 'public')
    }
  }
})
```

---

## 12. Pino + hapi-pino

```js
import hapiPino from 'hapi-pino'
import ecsFormat from '@elastic/ecs-pino-format'

await server.register({
  plugin: hapiPino,
  options: {
    logPayload: false,
    logRequestComplete: true,
    ignoredPaths: ['/health', '/healthz'],
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
      remove: true
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res
    },
    // Bind trace ID to every request log
    getChildBindings: (request) => ({
      requestId: request.info.id
    }),
    // ECS format in production, pino-pretty locally
    ...(isLocal ? {
      transport: { target: 'pino-pretty', options: { colorize: true } }
    } : {
      ...ecsFormat()
    })
  }
})
```

Usage inside handlers:

```js
handler: async (request, h) => {
  // request.logger is pre-bound with requestId, method, url, traceId
  request.logger.info({ referenceNumber }, 'Saving notification')
  request.logger.error({ err, referenceNumber }, 'Save failed')
}
```

Outside request context (plugin registration):

```js
server.logger.info({ plugin: 'auth' }, 'Auth plugin registered')
```

---

## 13. Project structure

```
src/
├── index.js                    ← start script (creates server, calls server.start())
└── server/
    ├── server.js               ← server factory (createServer() — no start())
    ├── router.js               ← collects all routes from feature folders
    ├── common/
    │   ├── clients/
    │   │   └── notification-client.js
    │   ├── helpers/
    │   │   ├── logging/
    │   │   │   └── logger.js
    │   │   ├── session.js
    │   │   ├── format-validation-errors.js
    │   │   └── errors.js
    │   ├── templates/
    │   │   └── layouts/
    │   │       └── page.njk
    │   ├── components/
    │   │   ├── heading/
    │   │   │   ├── macro.njk
    │   │   │   └── template.njk
    │   └── test-helpers/
    │       ├── mock-oidc-config.js
    │       ├── mock-auth-config.js
    │       └── component-helpers.js
    ├── plugins/
    │   ├── auth.js             ← Bell + Cookie setup
    │   ├── session.js          ← Yar + Catbox
    │   ├── csrf.js
    │   ├── csp.js
    │   ├── nunjucks.js         ← Vision setup
    │   └── static-files.js     ← Inert
    └── origin/                 ← feature folder
        ├── index.js            ← route config (exports routes array)
        ├── controller.js       ← Hapi handlers (get, post)
        ├── schema.js           ← Joi validation schema
        └── origin.njk          ← Nunjucks template
```

**Checklist for adding a new feature route:**

1. Create `src/server/{feature}/` folder
2. `index.js` — export routes array
3. `controller.js` — export handler object with `get` and/or `post`
4. `schema.js` — export Joi schema for POST validation
5. `{feature}.njk` — Nunjucks template extending `layouts/page.njk`
6. `{feature}.test.js` — Vitest test with `beforeAll`/`afterAll` server setup
7. Add routes to `router.js`

---

## 14. Configuration with convict

Config keys validate at `config.get()` time. Catch malformed values at startup, not on first use.

### Validate URL-typed keys with `format: 'url'`

A URL stored as a plain string fails late: `new URL(value)` throws `TypeError: Invalid URL` deep inside whichever helper happens to construct it first. With `format: 'url'`, convict rejects the value when the config is loaded and produces a readable error.

```js
// Wrong — value validated lazily, errors cryptically
backendApiUrl: {
  doc: 'Trade Imports Animals Backend base URL',
  format: String,
  default: 'http://localhost:8085',
  env: 'TRADE_IMPORTS_ANIMALS_BACKEND_URL'
}

// Correct — fails fast at startup with a clear message
backendApiUrl: {
  doc: 'Trade Imports Animals Backend base URL',
  format: 'url',
  default: 'http://localhost:8085',
  env: 'TRADE_IMPORTS_ANIMALS_BACKEND_URL'
}
```

Apply this to every URL-typed key — backend/reference-data API URLs, OIDC endpoints, etc.

### Module-level `readFileSync` / `JSON.parse` must be wrapped

Loading a file at module top-level crashes the server on import if the file is missing or the JSON is malformed. The stack trace points at Node internals, not at the offending file. Wrap and rethrow with a message that names the file.

```js
// Wrong — server fails to start with a cryptic ENOENT or SyntaxError
import { readFileSync } from 'node:fs'
const mockData = JSON.parse(readFileSync(new URL('./mock-data.json', import.meta.url), 'utf8'))

// Correct — readable startup failure
const dataPath = new URL('./mock-data.json', import.meta.url)
let mockData
try {
  mockData = JSON.parse(readFileSync(dataPath, 'utf8'))
} catch (error) {
  throw new Error(`Failed to load ${dataPath.pathname}: ${error.message}`, { cause: error })
}
```

Better still: load lazily inside the handler so a corrupt file affects only the request that needs it, not service startup.
