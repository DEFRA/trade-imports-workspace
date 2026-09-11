# Best practices applicable to trade-imports-animals-frontend

Concatenated from `docs/best-practices/` at prepare-review time.
Apply these standards when reviewing files in this repo.


---

## Source: `docs/best-practices/playwright/BEST_PRACTICES.md`

# Playwright Best Practices

**Golden Rule:** Design tests for simplicity. Tests should read like HTML, not logic puzzles.

## Test Design

### Do - AAA Pattern
```typescript
test('user sees welcome after login', async ({ page }) => {
  // Arrange
  await page.goto('/login')

  // Act
  await page.getByLabel('Email').fill('user@test.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Assert
  await expect(page.getByText('Welcome back')).toBeVisible()
})
```

### Name with What/When/Then
```typescript
// Good
test('checkout form: when shipping empty, shows validation error', ...)

// Bad
test('checkout test', ...)
```

### Keep Flat and Simple
```typescript
await page.fill('[data-testid="email"]', 'test@example.com')
await page.click('button[type="submit"]')
await expect(page.getByText('Submitted')).toBeVisible()
```

## Locators

### Use Role-Based/Semantic
```typescript
page.getByRole('button', { name: 'Submit' })
page.getByLabel('Email address')
page.getByPlaceholder('Search...')
page.getByText('Welcome back')
page.getByTestId('checkout-summary')  // when no accessible name
```

### Chain and Filter
```typescript
page.getByRole('listitem')
  .filter({ hasText: 'Product A' })
  .getByRole('button', { name: 'Add to cart' })
```

### Avoid
- CSS class selectors (`.btn-primary`)
- XPath (`//div[@class="container"]`)
- Dynamic IDs (`button-12345`)

## Assertions

### Use Web-First (auto-wait and retry)
```typescript
await expect(page.getByText('Success')).toBeVisible()
await expect(page.getByRole('alert')).toHaveText('Saved')
await expect(page).toHaveURL(/\/dashboard/)
```

### Use Soft Assertions
```typescript
await expect.soft(page.getByTestId('name')).toHaveText('John')
await expect.soft(page.getByTestId('email')).toHaveText('john@example.com')
```

### Avoid Manual Boolean Checks
```typescript
// Bad - no retry
expect(await page.getByText('Success').isVisible()).toBe(true)
```

## Waiting

### Rely on Auto-Waiting
Actions like `click()`, `fill()` wait automatically.

### Wait for Specific Conditions
```typescript
await page.waitForURL('**/dashboard')
await page.waitForResponse(resp => resp.url().includes('/api/user'))
await expect(page.getByTestId('spinner')).toBeHidden()
```

### Never Use Fixed Timeouts
```typescript
// Bad
await page.waitForTimeout(3000)
```

## Test Structure

### Keep Tests Isolated
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/login')
})
```

### Set Up Data via API
```typescript
test.beforeEach(async ({ request }) => {
  await request.post('/api/test/seed-user', { data: testUser })
})
```

### Each Test Creates Own Data
```typescript
test('can update site', async ({ page, request }) => {
  const site = await request.post('/api/sites', { data: { name: 'Test' } })
  await page.goto(`/sites/${site.id}`)
})
```

### Use Realistic Data (Faker)
```typescript
import { faker } from '@faker-js/faker'
const user = {
  name: faker.person.fullName(),
  email: faker.internet.email(),
}
```

### Reuse Authentication
```typescript
// global-setup.ts
await page.goto('/login')
await page.fill('#email', process.env.TEST_USER)
await page.fill('#password', process.env.TEST_PASS)
await page.click('button[type="submit"]')
await page.context().storageState({ path: 'auth.json' })

// playwright.config.ts
use: { storageState: 'auth.json' }
```

## Page Object Model

```typescript
export class LoginPage {
  constructor(private page: Page) {}

  readonly emailInput = () => this.page.getByLabel('Email')
  readonly passwordInput = () => this.page.getByLabel('Password')
  readonly submitButton = () => this.page.getByRole('button', { name: 'Sign in' })

  async login(email: string, password: string) {
    await this.emailInput().fill(email)
    await this.passwordInput().fill(password)
    await this.submitButton().click()
  }
}
```

Keep assertions in tests, not page objects.

## Configuration

```typescript
export default defineConfig({
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 2 : 0,
  use: { trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ]
})
```

## Common Review Flags

| Issue | Problem |
|-------|---------|
| `waitForTimeout()` | Slow, flaky |
| CSS class selectors | Break on styling |
| `isVisible()` in manual expect | No auto-retry |
| Test depends on other test | Isolation failure |
| No cross-browser testing | Misses browser bugs |
| Hardcoded test data in UI | Slow - use API seeding |
| Assertions in page objects | Obscures intent |
| Missing `await` | Silent failures |
| Vague test names | Doesn't explain scenario |
| Loops/conditionals in tests | Obscures intent |
| Placeholder data ('foo') | Misses edge cases |
| Login in every test | Slow - reuse auth state |

---

## Source: `docs/best-practices/node/hapi.md`

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

**`onPreResponse`** — catch-all error handler, runs for every response including errors:

```js
server.ext('onPreResponse', (request, h) => {
  const { response } = request

  // Pass through successful responses
  if (!response.isBoom) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  request.logger.error({ err: response, statusCode }, 'Request error')

  if (statusCode === 404) {
    return h.view('errors/404').code(404)
  }
  if (statusCode === 403) {
    return h.view('errors/403').code(403)
  }
  return h.view('errors/500').code(statusCode >= 500 ? statusCode : 500)
})
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

When a fetch client throws on a non-OK response, the log line must include the status code. A bare error message string is not enough to triage in production — `Failed to submit notification` could be a 4xx (client bug) or a 5xx (backend down), and the response decision differs.

```js
// Wrong — status invisible in the log line
} catch (error) {
  logger.error(`Failed to fetch document: ${error.message}`)
  throw error
}

// Correct — status surfaced
} catch (error) {
  logger.error(`Failed to fetch document: ${error.status} ${error.message}`)
  throw error
}
```

When constructing the error itself, attach `status` and `statusText` so callers and tests can match on them:

```js
if (!response.ok) {
  const error = new Error(`Failed to fetch document: ${response.status} ${response.statusText}`)
  error.status = response.status
  error.statusText = response.statusText
  logger.error(error.message)
  throw error
}
```

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

```js
// src/server/common/test-helpers/mock-auth-config.js
export const mockAuthConfig = async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    config: {
      ...original.config,
      get: (key) => mockValues[key] ?? original.config.get(key)
    }
  }
}
```

```js
// origin.test.js
import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer } from '../../server.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { statusCodes } from '../common/constants/status-codes.js'

// Mock OIDC and config — required for every controller test
vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } = await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

describe('#originController', () => {
  let server

  beforeAll(async () => {
    vi.spyOn(notificationClient, 'get').mockResolvedValue(null)
    vi.spyOn(notificationClient, 'submit').mockResolvedValue({ referenceNumber: 'TEST-REF' })

    server = await createServer()
    await server.initialize()  // initialize, not start (no port binding)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })  // timeout: 0 prevents hanging
    vi.restoreAllMocks()
  })

  test('GET /origin should render the page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/origin',
      auth: {
        strategy: 'session',
        credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Origin of the import'))
  })

  test('POST /origin should redirect on valid input', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/origin',
      auth: { strategy: 'session', credentials: { user: {}, sessionId: 'TEST_SESSION_ID' } },
      payload: { countryCode: 'DE', requiresRegionCode: 'no' }
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/commodities')
  })

  test('POST /origin should re-render with errors on invalid input', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/origin',
      auth: { strategy: 'session', credentials: { user: {} } },
      payload: {}  // empty — should fail validation
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Select a country'))
  })

  test('POST /origin should handle backend failure', async () => {
    notificationClient.submit.mockRejectedValueOnce(
      Object.assign(new Error('Backend error'), { status: 500 })
    )

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/origin',
      auth: { strategy: 'session', credentials: { user: {} } },
      payload: { countryCode: 'DE', requiresRegionCode: 'no' }
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/error')
  })
})
```

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

---

## Source: `docs/best-practices/node/pino-logging.md`

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
---

## Source: `docs/best-practices/node/nunjucks.md`

# Nunjucks — Best Practices

Project baseline: Nunjucks with `@hapi/vision`, `autoescape: true`, `trimBlocks: true`, `lstripBlocks: true`. Used in both `trade-imports-animals-frontend` and `trade-imports-animals-admin`.

---

## 1. How this project configures Nunjucks

Both repos share an identical config at `src/config/nunjucks/nunjucks.js`:

```js
import nunjucks from 'docs/best-practices/node/nunjucks'
import path from 'path'
import {formatDate} from '../filters/format-date.js'
import {formatCurrency} from '../filters/format-currency.js'
import {assign} from 'lodash'

export const configureNunjucks = (server) => {
    const env = nunjucks.configure(
        [
            // Search paths — order matters, first match wins
            path.join(process.cwd(), 'node_modules/govuk-frontend/dist/'),
            path.join(process.cwd(), 'src/server/common/templates'),
            path.join(process.cwd(), 'src/server/common/components')
        ],
        {
            autoescape: true,          // HTML-escape all output by default
            throwOnUndefined: false,   // undefined variables render as empty string (not an error)
            trimBlocks: true,          // remove newline after block tags
            lstripBlocks: true,        // strip leading whitespace before block tags
            watch: false,              // don't watch files for changes (nodemon handles this)
            noCache: process.env.NODE_ENV === 'development'
        }
    )

    // Custom filters
    env.addFilter('formatDate', formatDate)            // date-fns based
    env.addFilter('formatCurrency', formatCurrency)    // Intl.NumberFormat based
    env.addFilter('assign', (obj, ...args) => assign({}, obj, ...args))  // lodash merge

    return env
}
```

---

## 2. Template directory structure

```
src/server/
├── common/
│   ├── templates/
│   │   └── layouts/
│   │       └── page.njk        ← project base layout (extends govuk/template.njk)
│   └── components/
│       ├── heading/
│       │   ├── macro.njk       ← component macro (appHeading)
│       │   └── template.njk    ← component template (included by macro)
│       └── service-header/
│           ├── macro.njk       ← appServiceHeader
│           └── template.njk
├── origin/
│   ├── index.js                ← route config
│   ├── controller.js           ← Hapi route handler
│   └── origin.njk              ← page template (extends layouts/page.njk)
```

---

## 3. Template inheritance

Three-level chain:

1. `govuk/template.njk` — GOV.UK Frontend base (HTML skeleton, head, body)
2. `layouts/page.njk` — project layout (header, footer, navigation)
3. `origin.njk` — page-specific content

```nunjucks
{# layouts/page.njk — extends GOV.UK base, adds project chrome #}
{% extends "govuk/template.njk" %}

{% block pageTitle %}{{ pageTitle }} — {{ serviceName }}{% endblock %}

{% block head %}
  <link rel="stylesheet" href="{{ getAssetPath('application.css') }}">
{% endblock %}

{% block bodyStart %}
  {% include "govuk/components/cookie-banner/template.njk" %}
{% endblock %}

{% block header %}
  {{ appServiceHeader({ serviceName: serviceName }) }}
{% endblock %}

{% block content %}
  <div class="govuk-width-container">
    <main class="govuk-main-wrapper" id="main-content" role="main">
      {% block mainContent %}{% endblock %}
    </main>
  </div>
{% endblock %}

{% block footer %}
  {% from "govuk/components/footer/macro.njk" import govukFooter %}
  {{ govukFooter({}) }}
{% endblock %}

{% block bodyEnd %}
  <script src="{{ getAssetPath('application.js') }}"></script>
{% endblock %}
```

```nunjucks
{# origin.njk — page template #}
{% extends "layouts/page.njk" %}

{% set pageTitle = "Where are the goods coming from?" %}

{% block mainContent %}
  <h1 class="govuk-heading-l">{{ pageTitle }}</h1>
  {# page content here #}
{% endblock %}
```

Available blocks from `govuk/template.njk`:

| Block | Purpose |
|-------|---------|
| `pageTitle` | `<title>` content |
| `headIcons` | Favicon links |
| `head` | Additional `<head>` content |
| `bodyStart` | Before skip link (cookie banners) |
| `skipLink` | Skip to main content link |
| `header` | Page header |
| `main` | Entire `<main>` element |
| `content` | Width container + main wrapper |
| `footer` | Page footer |
| `bodyEnd` | Before closing `</body>` (scripts) |

---

## 4. `super()` — extending parent block content

```nunjucks
{# In a child template — append to parent block #}
{% block head %}
  {{ super() }}
  <meta name="description" content="{{ pageDescription }}">
{% endblock %}
```

---

## 5. `{% include %}` vs macros

| Use `{% include %}` | Use macros |
|--------------------|------------|
| Static content shared across templates | Reusable components that accept parameters |
| Partials that don't need parameters | Anything with variability |
| Layout chrome (header/footer) | Form fields, UI components |

```nunjucks
{# Include — no parameters #}
{% include "partials/breadcrumbs.njk" %}

{# Macro — accepts parameters #}
{% from "govuk/components/input/macro.njk" import govukInput %}
{{ govukInput({ id: "email", name: "email", label: { text: "Email address" } }) }}
```

---

## 6. Macros — defining and using

**Defining a macro:**

```nunjucks
{# common/components/heading/macro.njk #}
{% macro appHeading(params) %}
  {% include "common/components/heading/template.njk" %}
{% endmacro %}
```

```nunjucks
{# common/components/heading/template.njk #}
<h1 class="govuk-heading-xl {{ params.classes }}">
  {{ params.text }}
  {% if params.caption %}
    <span class="govuk-caption-xl">{{ params.caption }}</span>
  {% endif %}
</h1>
```

**Importing and calling:**

```nunjucks
{# Always import at the TOP of the file, before any extends or blocks #}
{% from "common/components/heading/macro.njk" import appHeading %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% extends "layouts/page.njk" %}

{% block mainContent %}
  {{ appHeading({ text: "Page title", caption: "Section" }) }}
{% endblock %}
```

**Macro with defaults:**

```nunjucks
{% macro statusTag(params) %}
  {% set colour = params.colour if params.colour else "grey" %}
  {% set text = params.text if params.text else "Unknown" %}
  <strong class="govuk-tag govuk-tag--{{ colour }}">{{ text }}</strong>
{% endmacro %}
```

---

## 7. GOV.UK Frontend macros — import and usage

All GOV.UK components are at `govuk/components/{name}/macro.njk`. The macro name follows the pattern `govuk{ComponentName}`.

**Import syntax:**
```nunjucks
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}
{% from "govuk/components/select/macro.njk" import govukSelect %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/fieldset/macro.njk" import govukFieldset %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/pagination/macro.njk" import govukPagination %}
{% from "govuk/components/breadcrumbs/macro.njk" import govukBreadcrumbs %}
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}
{% from "govuk/components/phase-banner/macro.njk" import govukPhaseBanner %}
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}
{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/details/macro.njk" import govukDetails %}
{% from "govuk/components/tag/macro.njk" import govukTag %}
{% from "govuk/components/panel/macro.njk" import govukPanel %}
{% from "govuk/components/date-input/macro.njk" import govukDateInput %}
```

**Text input:**
```nunjucks
{{ govukInput({
  id: "referenceNumber",
  name: "referenceNumber",
  value: referenceNumber,
  label: {
    text: "Reference number",
    classes: "govuk-label--m",
    isPageHeading: true
  },
  hint: { text: "For example, DRAFT.IMP.2026.123" },
  errorMessage: errors.referenceNumber and { text: errors.referenceNumber },
  autocomplete: "off",
  classes: "govuk-input--width-20"
}) }}
```

**Radios:**
```nunjucks
{{ govukRadios({
  idPrefix: "requiresRegionCode",
  name: "requiresRegionCode",
  fieldset: {
    legend: {
      text: "Does the origin have a region code?",
      isPageHeading: true,
      classes: "govuk-fieldset__legend--l"
    }
  },
  hint: { text: "Select one option" },
  errorMessage: errors.requiresRegionCode and { text: errors.requiresRegionCode },
  value: requiresRegionCode,
  items: [
    { value: "yes", text: "Yes" },
    { value: "no", text: "No" }
  ]
}) }}
```

**Checkboxes:**
```nunjucks
{{ govukCheckboxes({
  idPrefix: "certifications",
  name: "certifications",
  fieldset: {
    legend: {
      text: "Which certifications apply?",
      classes: "govuk-fieldset__legend--m"
    }
  },
  errorMessage: errors.certifications and { text: errors.certifications },
  items: [
    { value: "health", text: "Health certificate", checked: "health" in certifications },
    { value: "origin", text: "Certificate of origin", checked: "origin" in certifications }
  ]
}) }}
```

**Select:**
```nunjucks
{{ govukSelect({
  id: "countryCode",
  name: "countryCode",
  label: { text: "Country of origin", classes: "govuk-label--m" },
  errorMessage: errors.countryCode and { text: errors.countryCode },
  value: countryCode,
  items: [{ value: "", text: "Select a country" }] + countryOptions
}) }}
```

**Button:**
```nunjucks
{{ govukButton({ text: "Continue" }) }}
{{ govukButton({ text: "Save as draft", classes: "govuk-button--secondary" }) }}
{{ govukButton({ text: "Delete", classes: "govuk-button--warning", preventDoubleClick: true }) }}
```

**Error summary** — always at top of form, before form element:
```nunjucks
{% if errors %}
  {{ govukErrorSummary({
    titleText: "There is a problem",
    errorList: errors | list | map(attribute="message") | list
  }) }}
{% endif %}
```

Better pattern — build errorList in controller and pass to template:
```nunjucks
{% if errorList %}
  {{ govukErrorSummary({
    titleText: "There is a problem",
    errorList: errorList
  }) }}
{% endif %}
```

**Summary list:**
```nunjucks
{{ govukSummaryList({
  rows: [
    {
      key: { text: "Country of origin" },
      value: { text: countryName },
      actions: {
        items: [{ href: "/origin?returnTo=check-answers", text: "Change", visuallyHiddenText: "country of origin" }]
      }
    },
    {
      key: { text: "Commodity" },
      value: { text: commodityName }
    }
  ]
}) }}
```

**Notification banner:**
```nunjucks
{{ govukNotificationBanner({
  type: "success",
  html: "<h3 class=\"govuk-notification-banner__heading\">Notification submitted</h3>"
}) }}
```

**Breadcrumbs:**
```nunjucks
{{ govukBreadcrumbs({
  items: [
    { text: "Home", href: "/" },
    { text: "Notifications", href: "/notifications" },
    { text: "New notification" }
  ]
}) }}
```

**Back link:**
```nunjucks
{{ govukBackLink({ text: "Back", href: backLink }) }}
```

**Phase banner:**
```nunjucks
{{ govukPhaseBanner({
  tag: { text: "Beta" },
  html: 'This is a new service – <a class="govuk-link" href="/feedback">give us your feedback</a>.'
}) }}
```

**Date input:**
```nunjucks
{{ govukDateInput({
  id: "arrivalDate",
  namePrefix: "arrivalDate",
  fieldset: {
    legend: { text: "What is the expected arrival date?", isPageHeading: true, classes: "govuk-fieldset__legend--l" }
  },
  hint: { text: "For example, 27 3 2026" },
  errorMessage: errors.arrivalDate and { text: errors.arrivalDate },
  items: [
    { name: "day",   classes: "govuk-input--width-2", value: arrivalDate.day },
    { name: "month", classes: "govuk-input--width-2", value: arrivalDate.month },
    { name: "year",  classes: "govuk-input--width-4", value: arrivalDate.year }
  ]
}) }}
```

---

## 8. Variables and context

All context passed from `h.view('template', context)` is available in the template. Global context from `configureNunjucks` is available in every template:

| Variable | Type | Purpose |
|---------|------|---------|
| `serviceName` | string | Service name for header |
| `userSession` | object | Current user's session data |
| `navigation` | array | Navigation items |
| `breadcrumbs` | array | Breadcrumb trail |
| `getAssetPath` | function | Returns versioned asset URL |
| `authEnabled` | boolean | Whether auth is active |

```nunjucks
{# Accessing context #}
<p>Welcome, {{ userSession.user.name }}</p>
<p>{{ serviceName }}</p>

{# With default fallback #}
{{ referenceNumber | default("Not yet assigned") }}

{# Conditional on presence #}
{% if errors %}...{% endif %}
```

---

## 9. Built-in filters

| Filter | Example | Output |
|--------|---------|--------|
| `upper` | `{{ "hello" \| upper }}` | `HELLO` |
| `lower` | `{{ "HELLO" \| lower }}` | `hello` |
| `title` | `{{ "hello world" \| title }}` | `Hello World` |
| `capitalize` | `{{ "hello" \| capitalize }}` | `Hello` |
| `trim` | `{{ "  hi  " \| trim }}` | `hi` |
| `truncate(n)` | `{{ "hello world" \| truncate(5) }}` | `hello...` |
| `replace(a,b)` | `{{ "hello" \| replace("l","r") }}` | `herro` |
| `join(sep)` | `{{ [1,2,3] \| join(", ") }}` | `1, 2, 3` |
| `sort` | `{{ items \| sort }}` | sorted array |
| `groupby(attr)` | `{{ items \| groupby("type") }}` | grouped object |
| `list` | `{{ obj \| list }}` | array of values |
| `dump` | `{{ obj \| dump }}` | JSON string (debug) |
| `safe` | `{{ html \| safe }}` | output without escaping |
| `escape` | `{{ text \| escape }}` | HTML-escaped string |
| `first` | `{{ items \| first }}` | first element |
| `last` | `{{ items \| last }}` | last element |
| `length` | `{{ items \| length }}` | count |
| `int` | `{{ "3" \| int }}` | `3` |
| `float` | `{{ "3.5" \| float }}` | `3.5` |
| `round(n)` | `{{ 3.567 \| round(2) }}` | `3.57` |
| `wordcount` | `{{ text \| wordcount }}` | word count |
| `batch(n)` | `{{ items \| batch(3) }}` | array of chunks |
| `reject(attr)` | `{{ items \| reject("checked") }}` | items without attr |
| `select(attr)` | `{{ items \| select("checked") }}` | items with attr |

**Custom filters (this project):**
```nunjucks
{{ createdAt | formatDate("d MMMM yyyy") }}       {# "10 April 2026" #}
{{ price | formatCurrency }}                       {# "£1,234.56" #}
{{ obj | assign({ extraKey: "value" }) }}          {# merged object #}
```

---

## 10. Adding custom filters

In `nunjucks.js`:

```js
env.addFilter('formatDate', (date, format = 'dd/MM/yyyy') => {
  if (!date) return ''
  return formatDate(new Date(date), format, { locale: enGB })
})

// Async filter
env.addFilter('fetchLabel', async (code, callback) => {
  const label = await labelService.getLabel(code)
  callback(null, label)
}, true)  // true = async
```

---

## 11. Control flow

```nunjucks
{# if / elif / else — use == / != in Nunjucks, NOT === / !== (see §17 #11) #}
{% if status == "APPROVED" %}
  <p class="govuk-body">Approved</p>
{% elif status == "REJECTED" %}
  <p class="govuk-body govuk-!-color-red">Rejected</p>
{% else %}
  <p class="govuk-body">Pending</p>
{% endif %}

{# for loop #}
{% for item in notifications %}
  <p>{{ item.referenceNumber }}</p>
{% else %}
  <p>No notifications found.</p>
{% endfor %}

{# Loop variables #}
{% for item in items %}
  {% if loop.first %}<ul>{% endif %}
  <li class="{% if loop.last %}last{% endif %}">
    {{ loop.index }}. {{ item.text }}
  </li>
  {% if loop.last %}</ul>{% endif %}
{% endfor %}

{# set #}
{% set pageTitle = "Origin of the import" %}
{% set errorCount = errors | length %}

{# set block (multiline) #}
{% set addressHtml %}
  <p>{{ address.line1 }}</p>
  <p>{{ address.city }}, {{ address.postcode }}</p>
{% endset %}
{{ govukSummaryList({ rows: [{ value: { html: addressHtml } }] }) }}
```

Loop variables:

| Variable | Value |
|---------|-------|
| `loop.index` | 1-based index |
| `loop.index0` | 0-based index |
| `loop.first` | `true` on first iteration |
| `loop.last` | `true` on last iteration |
| `loop.length` | Total count |
| `loop.revindex` | Reverse 1-based index |

---

## 12. Whitespace control

`trimBlocks: true` removes the newline after `%}`. `lstripBlocks: true` removes whitespace before `{%`. These are already set in this project's config — don't disable them.

Manual whitespace trimming with `-`:
```nunjucks
{%- if condition -%}
  content
{%- endif -%}
```

---

## 13. Safe HTML

`| safe` disables HTML escaping for a specific value. Only use for **server-generated HTML you control**. Never on user input.

```nunjucks
{# Correct — server-generated HTML passed from controller #}
{{ confirmationHtml | safe }}

{# Correct — summary list value containing links #}
{% set addressHtml %}<a href="/address/edit">{{ address }}</a>{% endset %}
{{ govukSummaryList({ rows: [{ value: { html: addressHtml } }] }) }}

{# WRONG — never on user input #}
{{ userInputFromForm | safe }}  {# XSS vulnerability #}
```

GOV.UK macro params: use `text` for plain text (auto-escaped), use `html` for HTML content (must be trusted):
```nunjucks
{# text — safe, auto-escaped #}
{{ govukInput({ label: { text: userProvidedName } }) }}

{# html — only for trusted server-generated content #}
{{ govukSummaryList({ rows: [{ value: { html: "<a href=...>...</a>" } }] }) }}
```

---

## 14. Globals and context functions

```js
// In nunjucks.js — available in every template
env.addGlobal('year', new Date().getFullYear())
env.addGlobal('getAssetPath', (file) => `/public/assets/${file}`)
env.addGlobal('appVersion', process.env.APP_VERSION ?? 'dev')
```

```nunjucks
{# Use globals in any template without passing in context #}
<p>&copy; {{ year }} Crown copyright</p>
<img src="{{ getAssetPath('images/logo.png') }}" alt="Logo">
```

Per-request context (from Vision's `context` function in server config) — adds to every view:

```js
context: async (request) => ({
  serviceName: config.get('serviceName'),
  userSession: request.auth?.credentials,
  navigation: buildNavigation(request),
  breadcrumbs: request.app.breadcrumbs ?? []
})
```

---

## 15. Hapi controller → template data flow

```js
// controller.js
export const originController = {
  handler: async (request, h) => {
    const { countryCode, errors } = request.app

    // Fetch data
    const countries = await referenceDataClient.getCountries(request)

    // Build error list for error summary
    const errorList = errors
      ? Object.entries(errors).map(([field, message]) => ({
          text: message,
          href: `#${field}`
        }))
      : null

    // Pass context to template
    return h.view('origin/origin', {
      pageTitle: 'Where are the goods coming from?',
      countryCode,
      countryOptions: countries.map(c => ({ value: c.code, text: c.name })),
      errors,      // field-level errors: { countryCode: 'Select a country' }
      errorList    // for error summary component
    })
  }
}
```

```nunjucks
{# origin.njk #}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/select/macro.njk" import govukSelect %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% extends "layouts/page.njk" %}

{% set pageTitle = "Where are the goods coming from?" %}

{% block mainContent %}
  <h1 class="govuk-heading-l">{{ pageTitle }}</h1>

  {% if errorList %}
    {{ govukErrorSummary({ titleText: "There is a problem", errorList: errorList }) }}
  {% endif %}

  <form method="POST" action="/origin">
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">

    {{ govukSelect({
      id: "countryCode",
      name: "countryCode",
      label: { text: "Country of origin", classes: "govuk-label--m" },
      errorMessage: errors.countryCode and { text: errors.countryCode },
      value: countryCode,
      items: [{ value: "", text: "Select a country" }] + countryOptions
    }) }}

    {{ govukButton({ text: "Continue" }) }}
  </form>
{% endblock %}
```

---

## 16. Error patterns and debugging

Common Nunjucks errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `Template Not Found` | Wrong path in `extends` or `from` | Check search path order; `govuk/components/` not `govuk-frontend/` |
| `Error: 'X' is not defined` | `throwOnUndefined: true` | Set to `false` or pass all required vars |
| `Error: expected block end` | Unclosed `{% block %}` | Check every block has `{% endblock %}` |
| Output contains literal `{%...%}` | Used inside a string with quotes | Ensure tag is outside string context |
| Empty output where content expected | `undefined` variable with `autoescape` | Check controller passes all required context |

Debug with `dump` filter:
```nunjucks
<pre>{{ someObject | dump(2) }}</pre>
```

Set `noCache: true` in development to see template changes without restart.

---

## 17. Common agent mistakes

**1. Importing macros inside a block instead of at file top**
```nunjucks
{# Wrong #}
{% extends "layouts/page.njk" %}
{% block mainContent %}
  {% from "govuk/components/input/macro.njk" import govukInput %}  {# ← wrong position #}
{% endblock %}

{# Correct — import before extends #}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% extends "layouts/page.njk" %}
{% block mainContent %}
  {{ govukInput(...) }}
{% endblock %}
```

**2. Wrong import path for GOV.UK components**
```nunjucks
{# Wrong #}
{% from "govuk-frontend/components/input/macro.njk" import govukInput %}
{% from "node_modules/govuk-frontend/components/input/macro.njk" import govukInput %}

{# Correct #}
{% from "govuk/components/input/macro.njk" import govukInput %}
```

**3. Using `{{ }}` for control flow**
```nunjucks
{# Wrong #}
{{ if condition }}...{{ endif }}

{# Correct #}
{% if condition %}...{% endif %}
```

**4. Passing string instead of object to `errorMessage`**
```nunjucks
{# Wrong #}
{{ govukInput({ errorMessage: errors.field }) }}

{# Correct #}
{{ govukInput({ errorMessage: errors.field and { text: errors.field } }) }}
```

**5. Not including CSRF token in forms**
```nunjucks
{# Wrong — form without CSRF #}
<form method="POST" action="/submit">
  ...
</form>

{# Correct #}
<form method="POST" action="/submit">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  ...
</form>
```

**6. Using `| safe` on user input (XSS)**
```nunjucks
{# WRONG — security vulnerability #}
{{ request.query.searchTerm | safe }}

{# Correct — autoescape handles it #}
{{ request.query.searchTerm }}
```

**7. Forgetting `isPageHeading: true` on question pages**
```nunjucks
{# Wrong — loses h1 for screen readers #}
{{ govukRadios({ fieldset: { legend: { text: "Question?" } }, ... }) }}

{# Correct #}
{{ govukRadios({ fieldset: { legend: { text: "Question?", isPageHeading: true, classes: "govuk-fieldset__legend--l" } }, ... }) }}
```

**8. Variable scoping in for loops**
```nunjucks
{# Wrong — 'found' set inside loop may not behave as expected in all Nunjucks versions #}
{% for item in items %}
  {% if item.active %}{% set found = true %}{% endif %}
{% endfor %}
{{ found }}  {# may be undefined #}

{# Correct — set before loop, use namespace for mutation #}
{% set ns = namespace(found=false) %}
{% for item in items %}
  {% if item.active %}{% set ns.found = true %}{% endif %}
{% endfor %}
{{ ns.found }}
```

**9. Error summary items not linked to field IDs**
```nunjucks
{# Wrong — href doesn't match field id #}
{ text: "Enter a country", href: "#country" }  {# but input id is "countryCode" #}

{# Correct #}
{ text: "Enter a country", href: "#countryCode" }  {# matches id in govukSelect #}
```

**10. Using raw HTML instead of GOV.UK macros**
```nunjucks
{# Wrong — bypasses accessible markup, focus management, error state handling #}
<input type="text" id="name" name="name" class="govuk-input">

{# Correct #}
{{ govukInput({ id: "name", name: "name", label: { text: "Full name" } }) }}
```

**11. Using `===` / `!==` in `{% if %}` — undefined behaviour**

Nunjucks operators are `==` / `!=` (and `eq` / `ne`). `===` / `!==` are not part of the Nunjucks expression grammar — they are silently parsed as something else and produce results that look right in some cases and fail in others. Never use them in templates.

```nunjucks
{# Wrong — silent undefined behaviour #}
{% if status === "APPROVED" %}...{% endif %}
{% if doc.scanStatus !== "PENDING" %}...{% endif %}

{# Correct #}
{% if status == "APPROVED" %}...{% endif %}
{% if doc.scanStatus != "PENDING" %}...{% endif %}
```

**12. Chained property access without null guards**

Nunjucks's `throwOnUndefined: false` only protects the *final* missing key. Accessing `notification.commodity.commodityComplement.length` still throws if `notification.commodity` is null, because each intermediate hop is evaluated. Guard each hop you need.

```nunjucks
{# Wrong — throws if notification.commodity is null #}
{% if notification.commodity.commodityComplement.length %}...{% endif %}

{# Correct — guard each hop #}
{% if notification.commodity
   and notification.commodity.commodityComplement
   and notification.commodity.commodityComplement.length %}
  ...
{% endif %}
```

**13. Rendering raw enum / camelCase API values directly**

Backend constants like `VETERINARY_HEALTH_CERTIFICATE`, `placeOfDestination`, `certifiedFor` are not user-facing strings. Render via a `label` filter with an explicit override map and a generic camelCase-to-Sentence-case fallback.

```js
// nunjucks.js — register filter
const overrides = {
  VETERINARY_HEALTH_CERTIFICATE: 'Veterinary health certificate',
  ITAHC: 'ITAHC',
  placeOfDestination: 'Place of destination'
}
env.addFilter('label', (value) =>
  overrides[value] ?? value.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim()
)
```

```nunjucks
{# In templates — never render the raw value #}
{{ document.documentType | label }}        {# "Veterinary health certificate" #}
{{ notification.reasonForImport | label }} {# "Internal market" #}
```

**14. Silent `else` branches in status mappings**

A bare `else` after known status branches will quietly mis-render any status the team adds later. Make the known branches explicit and surface unexpected values rather than swallowing them.

```nunjucks
{# Wrong — every unknown status renders as "Checking" #}
{% if doc.scanStatus == "COMPLETE" %}<strong class="govuk-tag govuk-tag--green">Clean</strong>
{% elif doc.scanStatus == "REJECTED" %}<strong class="govuk-tag govuk-tag--red">Rejected</strong>
{% else %}<strong class="govuk-tag govuk-tag--blue">Checking</strong>
{% endif %}

{# Correct — PENDING is explicit; truly unknown values are visible, not silent #}
{% if doc.scanStatus == "COMPLETE" %}<strong class="govuk-tag govuk-tag--green">Clean</strong>
{% elif doc.scanStatus == "REJECTED" %}<strong class="govuk-tag govuk-tag--red">Rejected</strong>
{% elif doc.scanStatus == "PENDING" %}<strong class="govuk-tag govuk-tag--blue">Checking</strong>
{% else %}<strong class="govuk-tag govuk-tag--grey">Unknown ({{ doc.scanStatus }})</strong>
{% endif %}
```

---

## Source: `docs/best-practices/rest-api/rest-api.md`

# REST API Design

Based on [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/).

## Core Principles

**API First:** Define APIs before implementation using OpenAPI
**API as Product:** Treat APIs as products with ownership
**Robustness (Postel's Law):** Liberal in acceptance, conservative in sending

## URL Design

### Path Structure
Use kebab-case: `^[a-z][a-z\-0-9]*$`

```
GET /sales-orders
GET /sales-orders/{order-id}
GET /sales-orders/{order-id}/items
```

### Resource Naming
| Do | Don't |
|----|-------|
| /customers | /customer |
| /sales-orders | /salesOrders |
| /order-items | /order_items |

- Plural nouns for collections
- Meaningful business names
- Verb-free URLs (use HTTP methods)
- Max 3 sub-resource levels

### Query Parameters
Use snake_case: `?sort=-created_at&limit=20&fields=id,name`

| Parameter | Purpose |
|-----------|---------|
| q | Default search |
| sort | Sort with +/- prefix |
| fields | Partial response |
| embed | Sub-entity expansion |
| offset/limit | Pagination |
| cursor | Cursor pagination |

## HTTP Methods

| Method | Purpose | Safe | Idempotent | Body |
|--------|---------|------|------------|------|
| GET | Read | Yes | Yes | Forbidden |
| POST | Create | No | Consider | Required |
| PUT | Replace | No | Yes | Required |
| PATCH | Partial update | No | Consider | Required |
| DELETE | Remove | No | Yes | Rare |

### Idempotency Patterns
1. **ETag + If-Match:** Prevents concurrent updates
2. **Secondary Key:** Resource-specific unique key
3. **Idempotency-Key Header:** Client-provided retry key

## Status Codes

### Success (2xx)
| Code | Usage |
|------|-------|
| 200 OK | General success |
| 201 Created | Resource created (+ Location) |
| 202 Accepted | Async started |
| 204 No Content | Success, no body |

### Client Errors (4xx)
| Code | Usage |
|------|-------|
| 400 Bad Request | Invalid input |
| 401 Unauthorized | Missing/invalid credentials |
| 403 Forbidden | Insufficient permissions |
| 404 Not Found | Resource missing |
| 409 Conflict | State conflict |
| 429 Too Many Requests | Rate limited |

### Server Errors (5xx)
| Code | Usage |
|------|-------|
| 500 Internal Error | Unexpected error |
| 503 Unavailable | Temporary down |

### Error Response (RFC 9457)
```json
{
  "type": "/problems/out-of-stock",
  "title": "Product out of stock",
  "detail": "Product 123 unavailable",
  "instance": "/orders/456"
}
```
Never expose stack traces.

## JSON Payload

### Property Naming
Use snake_case:
```json
{
  "order_id": "abc123",
  "created_at": "2024-01-15T10:30:00Z",
  "line_items": []
}
```

### Null Handling
- Treat null and absent identically
- Never null for booleans (use enums)
- Empty array `[]` instead of null

### Common Fields
| Field | Purpose |
|-------|---------|
| id | Opaque string identifier |
| xyz_id | Reference to another resource |
| etag | Version for optimistic locking |
| created_at | Creation timestamp |
| modified_at | Last modification |

### Response Structure
Always use objects as top-level, never bare arrays:
```json
{ "items": [...], "cursor": "abc" }
```

### Enumerations
Use UPPER_SNAKE_CASE: `"status": "IN_PROGRESS"`

## Data Formats

### Numbers
| Type | Format | Usage |
|------|--------|-------|
| integer | int32/int64 | Standard integers |
| number | decimal | Money (never float/double) |

### Dates (RFC 3339 / ISO 8601)
| Format | Example |
|--------|---------|
| date | 2024-01-15 |
| date-time | 2024-01-15T10:30:00Z |

Use uppercase T and Z. Prefer UTC.

### Standard Codes
| Data | Format | Example |
|------|--------|---------|
| Country | ISO 3166-1 alpha-2 | GB |
| Language | ISO 639-1 | en |
| Currency | ISO 4217 | GBP |

### Money
```json
{ "amount": "99.99", "currency": "GBP" }
```

## Pagination

### Cursor-Based (Recommended)
```json
{
  "items": [...],
  "self": "...?cursor=abc",
  "next": "...?cursor=def"
}
```
Efficient, stable with concurrent modifications.

### Offset-Based
`GET /orders?offset=20&limit=10`
Simpler but less robust for large datasets.

## Backward Compatibility

### Non-Breaking (Allowed)
- Adding optional properties
- Making mandatory fields optional
- Extending extensible enums

### Breaking (Avoid)
- Removing required fields
- Changing field types
- Adding required fields
- Changing defaults

### Versioning
**Preferred:** Evolve without versioning
**If required:** Media type: `Accept: application/vnd.example+json;version=2`
**Forbidden:** URL versioning `/v1/resources`

## Quick Reference

### Do
- Define APIs before implementation
- kebab-case for paths
- snake_case for properties/params
- UPPER_SNAKE_CASE for enums
- Problem JSON for errors
- Make POST/PATCH idempotent
- Cursor pagination for large datasets

### Don't
- Request body in GET
- camelCase in JSON
- Bare arrays as top-level
- null for empty collections
- float/double for money
- Version numbers in URLs
- Break existing consumers
- Expose stack traces

---

## Source: `docs/best-practices/gds/language.md`

# GDS Language

Based on [UK Government Style Guide](https://www.gov.uk/guidance/style-guide).

## Plain English

### Words to Avoid
| Avoid | Use |
|-------|-----|
| deliver | create, provide |
| leverage | use |
| empower | allow, let |
| facilitate | help, allow |
| utilise | use |
| portal | website, service |

## Voice and Tone

### Active Voice
| Passive (avoid) | Active (preferred) |
|-----------------|-------------------|
| The form was submitted by the user | The user submitted the form |
| Errors were found | We found errors |

### Address Users Directly
Use "you". Avoid gendered pronouns - use "they".

## Sentences
- Under 25 words
- Front-load important information

### Avoid Negative Contractions
| Avoid | Use |
|-------|-----|
| can't | cannot |
| don't | do not |
| won't | will not |

## Capitalisation

Sentence case for all text except:

**Capitalise:** Department titles, job titles with names, benefits (Universal Credit), "The Civil Service"

**Don't capitalise:** "government", "civil servants", general job titles

## Numbers

| Format | Example |
|--------|---------|
| Write out "one" | one item |
| Numerals 2-9 | 5 notifications |
| Commas >999 | 9,000 |
| Percentages | 50% |
| Money (whole) | £75 |
| Money (pence) | £75.50 |

## Dates and Times

- Format: 4 June 2017 (no comma)
- Range: 10 November to 21 December (use "to")
- Time: 5:30pm, 10am to 11am
- Use "midnight" and "midday"

## Abbreviations

**No explanation needed:** BBC, NHS, UK, VAT, PDF, URL
**All others:** Explain on first mention
**Format:** No full stops (BBC not B.B.C.)

## Punctuation
- One space after full stops
- Use "to" in ranges, not hyphens
- No commas at end of address lines

## Technical Content

### Code Formatting
Use backticks for: classes, methods, functions, commands, filenames, paths, HTML elements, HTTP codes

### Preferred Terms
| Preferred | Avoid |
|-----------|-------|
| backend | back-end |
| frontend | front-end |
| filename | file name |
| folder | directory |
| run (a test) | execute, perform |
| set up | instantiate |
| turn on/off | enable/disable |

### Requirement Language
| Phrase | Meaning |
|--------|---------|
| You must | Mandatory |
| You should | Recommendation |
| You can | Option |

### Interface References
- Use "select" not "click"
- Use "page" for web and app

### Words to Minimise
Avoid "quick", "easy", "simple" - demoralising for users who struggle.

## Inclusive Language

- "disabled people" (not "the disabled")
- "women" and "men" (not "males/females")
- "they/them/their" for gender-neutral

---

## Source: `docs/best-practices/gds/styles.md`

# GDS Styles

Based on [GOV.UK Design System](https://design-system.service.gov.uk/styles/).

## Typeface

**Primary:** GDS Transport (service.gov.uk)
**Alternative:** Helvetica or Arial (other subdomains)

## Colours

### Text
| Colour | Hex | Usage |
|--------|-----|-------|
| Primary | `#0b0c0c` | Main body |
| Secondary | `#505a5f` | Supporting |

### Links
| State | Hex |
|-------|-----|
| Default | `#1d70b8` |
| Hover | `#003078` |
| Visited | `#4c2c92` |
| Active | `#0b0c0c` |

### Functional
| Colour | Hex | Usage |
|--------|-----|-------|
| Focus | `#ffdd00` | Focus indicator only |
| Error | `#d4351c` | Error messages |
| Success | `#00703c` | Success messages |
| Border | `#b1b4b6` | Standard borders |

Use Sass variables (e.g., `$govuk-brand-colour`) not hex values.

## Headings

### Standard Pages
| Element | Class |
|---------|-------|
| h1 | `govuk-heading-l` |
| h2 | `govuk-heading-m` |
| h3 | `govuk-heading-s` |

### Content-Heavy Pages
| Element | Class |
|---------|-------|
| h1 | `govuk-heading-xl` |
| h2 | `govuk-heading-l` |
| h3 | `govuk-heading-m` |

Use sentence case for all headings.

## Paragraphs

| Class | Size | Usage |
|-------|------|-------|
| `govuk-body-l` | 24px | Lead paragraphs (max one/page) |
| `govuk-body` | 19px | Standard (default) |
| `govuk-body-s` | 16px | Secondary |

Keep most text at 19px.

## Layout

- Mobile-first
- Single-column default
- Max width: 1020px
- ~75 characters per line

### Grid
| Class | Width |
|-------|-------|
| `govuk-grid-column-full` | 100% |
| `govuk-grid-column-two-thirds` | ~67% |
| `govuk-grid-column-one-half` | 50% |
| `govuk-grid-column-one-third` | ~33% |
| `govuk-grid-column-one-quarter` | 25% |

```html
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">Main</div>
  <div class="govuk-grid-column-one-third">Sidebar</div>
</div>
```

## Spacing

Responsive scale (adapts at 640px):

| Unit | Small | Large |
|------|-------|-------|
| 0-3 | Same | Same |
| 4 | 15px | 20px |
| 5 | 15px | 25px |
| 6 | 20px | 30px |
| 7 | 25px | 40px |
| 8 | 30px | 50px |
| 9 | 40px | 60px |

### Override Classes
```html
<p class="govuk-body govuk-!-margin-bottom-6">Text</p>
<p class="govuk-body govuk-!-static-margin-bottom-6">Consistent 30px</p>
```

## Utility Classes

### Display
| Class | Effect |
|-------|--------|
| `govuk-!-display-block` | Block |
| `govuk-!-display-none` | Hide |
| `govuk-visually-hidden` | Hidden but accessible |

## Do

- Use GOV.UK colour palette
- Use Sass variables
- Design mobile-first
- Sentence case headings
- 19px body text
- Responsive spacing

## Don't

- Reassign colour meanings
- Modify button styles
- Change form input borders
- Use colours outside palette
- Create custom heading styles

---

## Source: `docs/best-practices/gds/components.md`

# GDS Components

Based on [GOV.UK Design System](https://design-system.service.gov.uk/components/).

## Navigation
| Component | Description |
|-----------|-------------|
| Back link | Return to previous page |
| Breadcrumbs | Hierarchical navigation |
| Pagination | Navigate between pages |
| Service navigation | Primary menu |
| Skip link | Skip to main content |
| Exit this page | Emergency exit |

## Form Inputs
| Component | Description |
|-----------|-------------|
| Button | Clickable action |
| Checkboxes | Multiple selection |
| Date input | Date entry |
| File upload | Document submission |
| Password input | Secure entry with show/hide |
| Radios | Single selection |
| Select | Dropdown |
| Text input | Single-line text |
| Textarea | Multi-line text |
| Character count | Text with limit tracking |

## Form Structure
| Component | Description |
|-----------|-------------|
| Fieldset | Group related fields |
| Error message | Field validation feedback |
| Error summary | All errors at page top |

## Content Display
| Component | Description |
|-----------|-------------|
| Accordion | Expandable sections |
| Details | Show/hide content |
| Inset text | Important information box |
| Panel | Confirmation container |
| Summary list | Key-value display |
| Table | Data rows/columns |
| Tabs | Tabbed content |
| Tag | Category label |
| Warning text | Alert message |

## Page Structure
| Component | Description |
|-----------|-------------|
| GOV.UK header | Crown branding |
| GOV.UK footer | Standard links |
| Phase banner | Alpha/beta/live |
| Cookie banner | Consent notification |
| Notification banner | Announcements |

## Progress
| Component | Description |
|-----------|-------------|
| Task list | Progress checklist |

## Usage Guidelines

- Always use GOV.UK components as starting point
- Tested with users, meet accessibility standards
- Adapt only when research shows need
- Contribute improvements back

## Examples

### Button
```html
<button class="govuk-button" data-module="govuk-button">
  Save and continue
</button>
```

### Text Input
```html
<div class="govuk-form-group">
  <label class="govuk-label" for="event-name">Event name</label>
  <input class="govuk-input" id="event-name" name="eventName" type="text">
</div>
```

### Error Message
```html
<div class="govuk-form-group govuk-form-group--error">
  <label class="govuk-label" for="event-name">Event name</label>
  <p class="govuk-error-message">
    <span class="govuk-visually-hidden">Error:</span> Enter an event name
  </p>
  <input class="govuk-input govuk-input--error" id="event-name" name="eventName" type="text">
</div>
```

## Accessibility

All components:
- Work with assistive technologies
- Meet WCAG 2.2 AA
- Support keyboard navigation
- Provide ARIA attributes

---

## Source: `docs/best-practices/gds/patterns.md`

# GDS Patterns

Based on [GOV.UK Design System](https://design-system.service.gov.uk/patterns/).

## Ask Users For...

| Pattern | Description |
|---------|-------------|
| Addresses | Postal addresses with appropriate fields |
| Bank details | Secure account collection |
| Dates | Separate day, month, year fields |
| Email addresses | Collection and validation |
| Equality information | Diversity monitoring |
| Names | Context-appropriate collection |
| National Insurance numbers | Collection and validation |
| Passwords | Secure entry with requirements |
| Payment card details | Card information |
| Phone numbers | Accessible format |

## Help Users To...

| Pattern | Description |
|---------|-------------|
| Check a service is suitable | Eligibility before starting |
| Check answers | Review before submitting |
| Complete multiple tasks | Multi-step guidance |
| Confirm a phone number | SMS verification |
| Confirm an email address | Email verification |
| Contact a department | Clear contact info |
| Create a username | Valid username creation |
| Create accounts | Registration flow |
| Exit a page quickly | Safe sensitive page exit |
| Navigate a service | Wayfinding |
| Start using a service | Start pages |
| Recover from validation errors | Error fixing |

## Page Types

| Pattern | Description |
|---------|-------------|
| Confirmation pages | Transaction success |
| Cookies page | Cookie preferences |
| Page not found pages | 404 handling |
| There is a problem pages | 500/error handling |
| Question pages | Question layout |
| Service unavailable pages | Downtime info |
| Step by step navigation | Linear process guide |

## Key Principles

**One thing per page:** Ask for one piece of information at a time
**Minimal friction:** Only ask for what you genuinely need
**Clear guidance:** Help users understand what's asked and why
**Error prevention:** Design to prevent, not just handle

## Common Pattern Examples

### Check Answers Page
- Show all answers in summary list
- Provide "Change" links
- Clear submit button
- Warn this is last chance to check

### Confirmation Page
- Green panel with reference number
- Explain what happens next
- Provide contact details
- Link to related services
- Include feedback link

### Start Page
- Explain what service does
- List what users need
- State eligibility requirements
- Estimate duration
- Clear "Start now" button

### Error Recovery
- Error summary at page top
- Link from summary to each error
- Inline error messages
- Explain how to fix
- Don't clear valid answers

## Usage

- Start with standard pattern
- Adapt only when research shows need
- Test adaptations with users
- Contribute improvements back

---

## Source: `docs/best-practices/gds/accessibility.md`

# GDS Accessibility

Based on [GOV.UK Design System](https://design-system.service.gov.uk/accessibility/).

## WCAG Principles (POUR)

| Principle | Meaning |
|-----------|---------|
| **Perceivable** | Information presentable to users |
| **Operable** | Navigation and components function |
| **Understandable** | Information and operations comprehensible |
| **Robust** | Works with various user agents and AT |

## Universal Design Principles

| Principle | Description |
|-----------|-------------|
| Equitable use | Design for diverse abilities |
| Flexibility | Accommodate preferences |
| Simple and intuitive | Easy to understand |
| Perceptible information | Accessible to all senses |
| Tolerance for error | Minimal mistake consequences |
| Low effort | Minimal physical/cognitive load |
| Appropriate sizing | Adequate interaction space |

## Progressive Enhancement

1. Start with semantic HTML
2. Ensure content accessible without CSS
3. JavaScript enhancements with accessible fallbacks

## Compliance

**Target:** WCAG 2.2 Level AA for all styles, components, patterns, content

**Beyond baseline (AAA):** Pursue when capacity exists and doesn't impact priorities

## Testing

### Automated (~30% of issues)
- WAVE browser plugin
- Axe browser plugin
- jest-axe, @axe-core/puppeteer
- Browser accessibility reports
- Developer tools inspection

### Manual
- Screen readers (NVDA, JAWS, VoiceOver)
- Screen magnifiers
- High contrast modes
- Speech recognition
- Keyboard-only navigation

### Checklist
- [ ] All interactive elements keyboard accessible
- [ ] Focus order logical
- [ ] Focus indicators visible
- [ ] Images have alt text
- [ ] Form fields have labels
- [ ] Errors announced to screen readers
- [ ] Colour contrast 4.5:1 for text
- [ ] Content understandable without colour
- [ ] Works at 400% zoom
- [ ] Content reflows on small screens

## Assistive Technologies

| Technology | Examples |
|------------|----------|
| Screen readers | NVDA, JAWS, VoiceOver, TalkBack |
| Screen magnifiers | ZoomText, Windows Magnifier |
| Speech recognition | Dragon, Voice Control |
| Alternative input | Switch devices, eye tracking |

## Common Issues

### Forms
- Missing/incorrect labels
- Errors not associated with fields
- Required fields not indicated
- Missing autocomplete attributes

### Navigation
- Skip links missing/broken
- Focus not managed after updates
- Keyboard traps
- Inconsistent navigation

### Content
- Missing heading structure
- Images without alt text
- Links unclear out of context
- Complex language

### Visual
- Insufficient colour contrast
- Information by colour alone
- Text cannot be resized
- Content doesn't reflow

## Implementation Checklist

- [ ] Semantic HTML used correctly
- [ ] ARIA only when necessary
- [ ] All functionality works with keyboard
- [ ] Focus management correct
- [ ] Screen reader testing completed
- [ ] Colour contrast meets requirements
- [ ] Works at 400% zoom
- [ ] Error handling accessible
- [ ] Loading states announced
- [ ] Timeouts give adequate warning

## Legal Requirements

- Public Sector Bodies Accessibility Regulations 2018
- Equality Act 2010
- WCAG 2.2 Level AA

---

## Source: `docs/best-practices/node/govuk-frontend.md`

# GOV.UK Frontend — Best Practices

Project baseline: `govuk-frontend ^6.1.0`, Nunjucks templating, Hapi.js + Vision. Used in `trade-imports-animals-frontend` and `trade-imports-animals-admin`.

---

## 1. Project setup

**Package version:** `govuk-frontend ^6.1.0`

**JavaScript initialisation** (in `public/application.js` or equivalent):

```js
import {
    createAll,
    Button,
    Checkboxes,
    ErrorSummary,
    Radios,
    SkipLink
} from 'docs/best-practices/node/govuk-frontend'

// Initialise all required components
createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)  // auto-focuses on page load when present
createAll(Radios)
createAll(SkipLink)
```

**Nunjucks template search path** must include `node_modules/govuk-frontend/dist/` first:

```js
nunjucks.configure([
  'node_modules/govuk-frontend/dist/',    // GOV.UK templates
  'src/server/common/templates',          // project layouts
  'src/server/common/components'          // project components
], { autoescape: true, trimBlocks: true, lstripBlocks: true })
```

**Global context** (available in every template):

| Variable | Type | Purpose |
|---------|------|---------|
| `serviceName` | string | Service name for header/title |
| `userSession` | object | Authenticated user's session |
| `navigation` | array | Nav items (active state, href, text) |
| `breadcrumbs` | array | Breadcrumb trail |
| `getAssetPath` | function | Returns `/public/{file}` |
| `authEnabled` | boolean | Whether auth is active |
| `csrfToken` | string | CSRF token for forms |

---

## 2. Template inheritance — three-level chain

```
govuk/template.njk          ← GOV.UK HTML skeleton
  └── layouts/page.njk      ← project layout (header, footer, nav)
        └── {feature}.njk   ← page-specific content
```

`layouts/page.njk`:

```nunjucks
{% extends "govuk/template.njk" %}

{% block pageTitle %}{{ pageTitle }} — {{ serviceName }}{% endblock %}

{% block head %}
  <link rel="stylesheet" href="{{ getAssetPath('application.css') }}">
{% endblock %}

{% block header %}
  {% from "common/components/service-header/macro.njk" import appServiceHeader %}
  {{ appServiceHeader({ serviceName: serviceName, navigation: navigation }) }}
{% endblock %}

{% block content %}
  <div class="govuk-width-container">
    {% from "govuk/components/phase-banner/macro.njk" import govukPhaseBanner %}
    {{ govukPhaseBanner({
      tag: { text: "Beta" },
      html: 'This is a new service — <a class="govuk-link" href="/feedback">give us your feedback</a>.'
    }) }}

    <main class="govuk-main-wrapper" id="main-content" role="main">
      {% block mainContent %}{% endblock %}
    </main>
  </div>
{% endblock %}

{% block footer %}
  {% from "govuk/components/footer/macro.njk" import govukFooter %}
  {{ govukFooter({}) }}
{% endblock %}

{% block bodyEnd %}
  <script src="{{ getAssetPath('application.js') }}" type="module"></script>
{% endblock %}
```

Page template:

```nunjucks
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% extends "layouts/page.njk" %}

{% set pageTitle = "Reference number" %}

{% block mainContent %}
  {% if errorList %}
    {{ govukErrorSummary({ titleText: "There is a problem", errorList: errorList }) }}
  {% endif %}

  <form method="POST" action="/reference">
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">
    {{ govukInput({ ... }) }}
    {{ govukButton({ text: "Continue" }) }}
  </form>
{% endblock %}
```

Available blocks from `govuk/template.njk`:

| Block | Purpose |
|-------|---------|
| `pageTitle` | `<title>` |
| `head` | Additional `<head>` content |
| `bodyStart` | Before skip link (cookie banners) |
| `skipLink` | Skip to main content link |
| `header` | Page header |
| `main` / `content` | Main content wrapper |
| `footer` | Page footer |
| `bodyEnd` | Before `</body>` (scripts) |

---

## 3. Macro import syntax

**Always import at the top of the file, before `{% extends %}`:**

```nunjucks
{# Correct — imports at top #}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% extends "layouts/page.njk" %}
```

Import multiple from one file is not supported — one `{% from %}` per component.

---

## 4. Component reference

### Text input

```nunjucks
{% from "govuk/components/input/macro.njk" import govukInput %}

{{ govukInput({
  id: "referenceNumber",
  name: "referenceNumber",
  value: referenceNumber,
  label: {
    text: "Reference number",
    classes: "govuk-label--l",
    isPageHeading: true
  },
  hint: { text: "For example, DRAFT.IMP.2026.123" },
  errorMessage: errors.referenceNumber and { text: errors.referenceNumber },
  autocomplete: "off",
  classes: "govuk-input--width-20",
  type: "text",
  spellcheck: false,
  inputmode: "text"
}) }}
```

### Radios

```nunjucks
{% from "govuk/components/radios/macro.njk" import govukRadios %}

{{ govukRadios({
  idPrefix: "requiresRegionCode",
  name: "requiresRegionCode",
  value: requiresRegionCode,
  fieldset: {
    legend: {
      text: "Does the origin have a region code?",
      isPageHeading: true,
      classes: "govuk-fieldset__legend--l"
    }
  },
  hint: { text: "Select one option" },
  errorMessage: errors.requiresRegionCode and { text: errors.requiresRegionCode },
  items: [
    { value: "yes", text: "Yes" },
    { value: "no", text: "No" },
    { value: "unsure", text: "I'm not sure",
      hint: { text: "You can find this on the import certificate" } }
  ]
}) }}
```

### Checkboxes

```nunjucks
{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}

{{ govukCheckboxes({
  idPrefix: "certifications",
  name: "certifications",
  fieldset: {
    legend: { text: "Which certifications apply?", classes: "govuk-fieldset__legend--m" }
  },
  hint: { text: "Select all that apply" },
  errorMessage: errors.certifications and { text: errors.certifications },
  items: [
    {
      value: "health",
      text: "Health certificate",
      checked: "health" in (certifications if certifications else [])
    },
    {
      value: "origin",
      text: "Certificate of origin",
      checked: "origin" in (certifications if certifications else []),
      conditional: { html: "<p>Upload the certificate below</p>" }
    }
  ]
}) }}
```

### Select

```nunjucks
{% from "govuk/components/select/macro.njk" import govukSelect %}

{{ govukSelect({
  id: "countryCode",
  name: "countryCode",
  label: { text: "Country of origin", classes: "govuk-label--m" },
  hint: { text: "Select the country the goods are coming from" },
  errorMessage: errors.countryCode and { text: errors.countryCode },
  value: countryCode,
  items: [{ value: "", text: "Select a country" }] + countryOptions
}) }}
```

### Button

```nunjucks
{% from "govuk/components/button/macro.njk" import govukButton %}

{{ govukButton({ text: "Continue" }) }}
{{ govukButton({ text: "Save as draft", classes: "govuk-button--secondary" }) }}
{{ govukButton({ text: "Delete", classes: "govuk-button--warning", preventDoubleClick: true }) }}
{{ govukButton({ text: "Start now", href: "/start", isStartButton: true }) }}
```

### Error summary — place before form, after h1

```nunjucks
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% if errorList %}
  {{ govukErrorSummary({
    titleText: "There is a problem",
    errorList: errorList,
    disableAutoFocus: false
  }) }}
{% endif %}
```

`errorList` items must link to field IDs:
```js
// In controller
const errorList = Object.entries(errors).map(([field, message]) => ({
  text: message,
  href: `#${field}`   // must match the id in the corresponding govuk macro
}))
```

### Notification banner

```nunjucks
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}

{# Success #}
{{ govukNotificationBanner({
  type: "success",
  titleText: "Success",
  html: "<h3 class=\"govuk-notification-banner__heading\">Notification submitted</h3>
         <p class=\"govuk-body\">Your reference number is <strong>DRAFT.IMP.2026.1</strong></p>"
}) }}

{# Important information #}
{{ govukNotificationBanner({
  titleText: "Important",
  text: "The service will be unavailable on Saturday from 8am to 10am."
}) }}
```

### Summary list

```nunjucks
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}

{{ govukSummaryList({
  rows: [
    {
      key: { text: "Country of origin" },
      value: { text: countryName },
      actions: {
        items: [{
          href: "/origin?returnTo=check-answers",
          text: "Change",
          visuallyHiddenText: "country of origin"
        }]
      }
    },
    {
      key: { text: "Commodity type" },
      value: { html: "<ul class=\"govuk-list\"><li>Live cattle</li><li>Live sheep</li></ul>" }
    }
  ]
}) }}
```

### Table

```nunjucks
{% from "govuk/components/table/macro.njk" import govukTable %}

{{ govukTable({
  caption: "Import notifications",
  captionClasses: "govuk-table__caption--m",
  firstCellIsHeader: true,
  head: [
    { text: "Reference" },
    { text: "Status" },
    { text: "Created", format: "numeric" }
  ],
  rows: notifications | map(n => [
    { html: "<a href=\"/notifications/" + n.referenceNumber + "\">" + n.referenceNumber + "</a>" },
    { text: n.status },
    { text: n.createdAt | formatDate("d MMM yyyy"), format: "numeric" }
  ])
}) }}
```

### Pagination

```nunjucks
{% from "govuk/components/pagination/macro.njk" import govukPagination %}

{{ govukPagination({
  previous: { href: "/notifications?page=" + (currentPage - 1) } if currentPage > 1,
  next: { href: "/notifications?page=" + (currentPage + 1) } if hasNextPage,
  items: paginationItems
}) }}
```

### Breadcrumbs

```nunjucks
{% from "govuk/components/breadcrumbs/macro.njk" import govukBreadcrumbs %}

{{ govukBreadcrumbs({
  items: [
    { text: "Home", href: "/" },
    { text: "Notifications", href: "/notifications" },
    { text: "New notification" }
  ],
  collapseOnMobile: true
}) }}
```

### Back link

```nunjucks
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}
{{ govukBackLink({ text: "Back", href: backLink }) }}
```

### Tag

```nunjucks
{% from "govuk/components/tag/macro.njk" import govukTag %}

{{ govukTag({ text: "Draft", classes: "govuk-tag--grey" }) }}
{{ govukTag({ text: "Approved", classes: "govuk-tag--green" }) }}
{{ govukTag({ text: "Rejected", classes: "govuk-tag--red" }) }}
```

Tag colour modifiers: `govuk-tag--grey`, `govuk-tag--green`, `govuk-tag--turquoise`, `govuk-tag--blue`, `govuk-tag--purple`, `govuk-tag--pink`, `govuk-tag--red`, `govuk-tag--orange`, `govuk-tag--yellow`

### Details (expandable)

```nunjucks
{% from "govuk/components/details/macro.njk" import govukDetails %}

{{ govukDetails({
  summaryText: "Help with region codes",
  text: "A region code is a two-letter code identifying the region within the country of origin."
}) }}
```

### Inset text

```nunjucks
{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}

{{ govukInsetText({
  text: "You can only import goods from approved countries."
}) }}
```

### Warning text

```nunjucks
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}

{{ govukWarningText({
  text: "You can be fined up to £5,000 if you provide false information.",
  iconFallbackText: "Warning"
}) }}
```

### Panel (confirmation)

```nunjucks
{% from "govuk/components/panel/macro.njk" import govukPanel %}

{{ govukPanel({
  titleText: "Application submitted",
  html: "Your reference number<br><strong>DRAFT.IMP.2026.123</strong>"
}) }}
```

### Date input

```nunjucks
{% from "govuk/components/date-input/macro.njk" import govukDateInput %}

{{ govukDateInput({
  id: "arrivalDate",
  namePrefix: "arrivalDate",
  fieldset: {
    legend: {
      text: "What is the expected arrival date?",
      isPageHeading: true,
      classes: "govuk-fieldset__legend--l"
    }
  },
  hint: { text: "For example, 27 3 2026" },
  errorMessage: errors.arrivalDate and { text: errors.arrivalDate },
  items: [
    { name: "day",   label: { text: "Day" },   classes: "govuk-input--width-2", value: arrivalDate.day },
    { name: "month", label: { text: "Month" }, classes: "govuk-input--width-2", value: arrivalDate.month },
    { name: "year",  label: { text: "Year" },  classes: "govuk-input--width-4", value: arrivalDate.year }
  ]
}) }}
```

---

## 5. Form patterns

### Complete form with error handling

```nunjucks
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/select/macro.njk" import govukSelect %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% extends "layouts/page.njk" %}

{% set pageTitle = "Where are the goods coming from?" %}

{% block mainContent %}
  {# Error summary — always before the form, always present in DOM when errors exist #}
  {% if errorList %}
    {{ govukErrorSummary({
      titleText: "There is a problem",
      errorList: errorList
    }) }}
  {% endif %}

  <form method="POST" action="/origin" novalidate>
    {# CSRF token — always include #}
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">

    {{ govukSelect({
      id: "countryCode",
      name: "countryCode",
      label: { text: "Country of origin", classes: "govuk-label--m" },
      hint: { text: "Select the country the goods are coming from" },
      errorMessage: errors.countryCode and { text: errors.countryCode },
      value: countryCode,
      items: [{ value: "", text: "Select a country" }] + countryOptions
    }) }}

    {{ govukRadios({
      idPrefix: "requiresRegionCode",
      name: "requiresRegionCode",
      value: requiresRegionCode,
      fieldset: {
        legend: { text: "Does the origin have a region code?", classes: "govuk-fieldset__legend--m" }
      },
      errorMessage: errors.requiresRegionCode and { text: errors.requiresRegionCode },
      items: [
        { value: "yes", text: "Yes" },
        { value: "no", text: "No" }
      ]
    }) }}

    {{ govukButton({ text: "Continue" }) }}
  </form>
{% endblock %}
```

### Controller — build errorList for error summary

```js
// controller.js
const { error, value } = originSchema.validate(request.payload, { abortEarly: false })

if (error) {
  const errors = Object.fromEntries(
    error.details.map(d => [d.context.key, d.message])
  )
  const errorList = Object.entries(errors).map(([field, message]) => ({
    text: message,
    href: `#${field}`   // must match the `id` in the govuk macro
  }))
  return h.view('origin/origin', {
    ...request.payload,  // re-populate form with submitted values
    errors,
    errorList
  })
}

// Valid — POST-Redirect-GET
await notificationClient.save(request, value)
return h.redirect('/commodities')
```

---

## 6. Page layout patterns

### Question page (one question per page — GDS pattern)

```nunjucks
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}

{% extends "layouts/page.njk" %}
{% set pageTitle = "Does the consignment require a health certificate?" %}

{% block mainContent %}
  {{ govukBackLink({ text: "Back", href: "/origin" }) }}

  <form method="POST" novalidate>
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">

    {# Single question — fieldset legend IS the page heading #}
    {{ govukRadios({
      idPrefix: "requiresHealthCertificate",
      name: "requiresHealthCertificate",
      value: requiresHealthCertificate,
      fieldset: {
        legend: {
          text: pageTitle,
          isPageHeading: true,
          classes: "govuk-fieldset__legend--l"
        }
      },
      errorMessage: errors.requiresHealthCertificate and { text: errors.requiresHealthCertificate },
      items: [{ value: "yes", text: "Yes" }, { value: "no", text: "No" }]
    }) }}

    {{ govukButton({ text: "Continue" }) }}
  </form>
{% endblock %}
```

### Check your answers

```nunjucks
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% extends "layouts/page.njk" %}
{% set pageTitle = "Check your answers before submitting" %}

{% block mainContent %}
  <h1 class="govuk-heading-l">{{ pageTitle }}</h1>

  {{ govukSummaryList({
    rows: [
      {
        key: { text: "Country of origin" },
        value: { text: countryName },
        actions: { items: [{ href: "/origin?returnTo=check-answers", text: "Change", visuallyHiddenText: "country of origin" }] }
      },
      {
        key: { text: "Commodity" },
        value: { text: commodityName },
        actions: { items: [{ href: "/commodities?returnTo=check-answers", text: "Change", visuallyHiddenText: "commodity" }] }
      }
    ]
  }) }}

  <form method="POST" action="/check-answers">
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">
    {{ govukButton({ text: "Accept and submit", preventDoubleClick: true }) }}
  </form>
{% endblock %}
```

### Confirmation page

```nunjucks
{% from "govuk/components/panel/macro.njk" import govukPanel %}

{% extends "layouts/page.njk" %}
{% set pageTitle = "Application submitted" %}

{% block mainContent %}
  {{ govukPanel({
    titleText: "Application submitted",
    html: "Your reference number<br><strong>" + referenceNumber + "</strong>"
  }) }}

  <p class="govuk-body">We have sent a confirmation to <strong>{{ userEmail }}</strong>.</p>

  <h2 class="govuk-heading-m">What happens next</h2>
  <p class="govuk-body">...</p>

  <p class="govuk-body">
    <a class="govuk-link" href="/notifications">View all notifications</a>
  </p>
{% endblock %}
```

---

## 7. Typography, spacing, and layout

**Typography:**

```html
<h1 class="govuk-heading-xl">Extra large heading</h1>
<h2 class="govuk-heading-l">Large heading</h2>
<h3 class="govuk-heading-m">Medium heading</h3>
<h4 class="govuk-heading-s">Small heading</h4>
<p class="govuk-body-l">Large body text</p>
<p class="govuk-body">Standard body text (default)</p>
<p class="govuk-body-s">Small body text</p>
<p class="govuk-body-lead">Lead paragraph (introductory)</p>
<a class="govuk-link" href="/path">Link text</a>
<a class="govuk-link govuk-link--no-visited-state" href="/path">Link (no purple visited)</a>
```

**Spacing overrides:**

```html
<p class="govuk-!-margin-top-6">6 units margin top</p>
<p class="govuk-!-margin-bottom-0">No bottom margin</p>
<div class="govuk-!-padding-4">4 units padding all sides</div>
```

Scale: 0, 1 (5px), 2 (10px), 3 (15px), 4 (20px), 5 (25px), 6 (30px), 7 (40px), 8 (50px), 9 (60px)

**Grid:**

```html
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">
    <!-- Main content (forms, questions) -->
  </div>
  <div class="govuk-grid-column-one-third">
    <!-- Sidebar -->
  </div>
</div>

<!-- Full width -->
<div class="govuk-grid-row">
  <div class="govuk-grid-column-full">
    <!-- Tables, wide content -->
  </div>
</div>
```

Grid column options: `full`, `one-half`, `one-third`, `two-thirds`, `one-quarter`, `three-quarters`

---

## 8. Accessibility

**What GOV.UK Frontend handles automatically:**
- ARIA `role="alert"` on error summary (triggers screen reader announcement)
- `aria-describedby` linking inputs to hint/error text
- `aria-expanded` on details component
- Keyboard navigation for all interactive components
- Focus management via `ErrorSummary.init()` (auto-focus on page load)
- High contrast mode compatibility
- Reduced motion support

**What you must do:**
- One `<h1>` per page — use `isPageHeading: true` on the main legend/label
- Meaningful `<title>` — `{% block pageTitle %}{{ pageTitle }} — {{ serviceName }}{% endblock %}`
- Include `<main id="main-content">` with skip link targeting it
- Error summary `errorList` items must `href` to the correct field ID
- `visuallyHiddenText` on "Change" links in summary lists (for screen readers)
- `autocomplete` on personal data fields — WCAG 1.3.5 requirement:

```nunjucks
{{ govukInput({
  id: "firstName",
  name: "firstName",
  autocomplete: "given-name",  // WCAG 1.3.5
  label: { text: "First name" }
}) }}
```

Common `autocomplete` values: `given-name`, `family-name`, `email`, `tel`, `bday`, `street-address`, `postal-code`

---

## 9. Custom project components

Components follow the `macro.njk` + `template.njk` pattern under `src/server/common/components/`:

```nunjucks
{# appHeading — page heading with optional caption #}
{% from "common/components/heading/macro.njk" import appHeading %}

{{ appHeading({
  text: "Where are the goods coming from?",
  caption: "New import notification",
  classes: "govuk-heading-xl"
}) }}
```

```nunjucks
{# appServiceHeader — project service header #}
{% from "common/components/service-header/macro.njk" import appServiceHeader %}

{{ appServiceHeader({
  serviceName: serviceName,
  navigation: navigation,
  signOutHref: "/auth/sign-out"
}) }}
```

---

## 10. Common mistakes

**1. Wrong import path**
```nunjucks
{# Wrong #}
{% from "govuk-frontend/components/input/macro.njk" import govukInput %}
{% from "node_modules/govuk-frontend/components/input/macro.njk" import govukInput %}

{# Correct #}
{% from "govuk/components/input/macro.njk" import govukInput %}
```

**2. Importing macros inside blocks**
```nunjucks
{# Wrong #}
{% extends "layouts/page.njk" %}
{% block mainContent %}
  {% from "govuk/components/input/macro.njk" import govukInput %}  {# too late #}

{# Correct #}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% extends "layouts/page.njk" %}
```

**3. Forgetting `isPageHeading: true` on question pages**
```nunjucks
{# Wrong — no visible h1 for screen readers #}
{{ govukRadios({ fieldset: { legend: { text: "Question?" } } }) }}

{# Correct #}
{{ govukRadios({ fieldset: { legend: { text: "Question?", isPageHeading: true, classes: "govuk-fieldset__legend--l" } } }) }}
```

**4. Error summary items not linking to field IDs**
```js
// Wrong — href doesn't match the id in the govukSelect macro
{ text: "Select a country", href: "#country" }

// Correct — matches id: "countryCode" in govukSelect
{ text: "Select a country", href: "#countryCode" }
```

**5. Omitting CSRF token**
```nunjucks
{# Wrong #}
<form method="POST" action="/submit">

{# Correct #}
<form method="POST" action="/submit">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
```

**6. Passing string instead of error object**
```nunjucks
{# Wrong — errorMessage expects an object {text: '...'} #}
{{ govukInput({ errorMessage: errors.field }) }}

{# Correct #}
{{ govukInput({ errorMessage: errors.field and { text: errors.field } }) }}
```

**7. Placing error summary inside the form**
```nunjucks
{# Wrong #}
<form>
  {{ govukErrorSummary({ ... }) }}

{# Correct — error summary is before the form element #}
{{ govukErrorSummary({ ... }) }}
<form>
```

**8. Not re-populating form values after validation failure**
```js
// Wrong — user loses their input
return h.view('origin/origin', { errors, errorList })

// Correct — spread payload to re-populate fields
return h.view('origin/origin', {
  ...request.payload,
  errors,
  errorList
})
```

**9. Using `<button>` markup directly**
```nunjucks
{# Wrong — bypasses double-click prevention, GOV.UK styling, accessible type attribute #}
<button class="govuk-button">Continue</button>

{# Correct #}
{{ govukButton({ text: "Continue" }) }}
```

**10. Using `href="#"` on back links**
```nunjucks
{# Wrong #}
{{ govukBackLink({ text: "Back", href: "#" }) }}

{# Correct — real URL or JavaScript history.back() #}
{{ govukBackLink({ text: "Back", href: backLink }) }}
```

**11. Missing `visuallyHiddenText` on "Change" links**
```nunjucks
{# Wrong — screen reader says "Change Change Change" #}
actions: { items: [{ href: "/edit", text: "Change" }] }

{# Correct — screen reader says "Change country of origin" #}
actions: { items: [{ href: "/edit", text: "Change", visuallyHiddenText: "country of origin" }] }
```

**12. Using `html` param with user input (XSS)**
```nunjucks
{# Wrong — XSS if userText contains HTML #}
{{ govukSummaryList({ rows: [{ value: { html: userText } }] }) }}

{# Correct — use text for user-provided values #}
{{ govukSummaryList({ rows: [{ value: { text: userText } }] }) }}
```

**13. Breaking heading hierarchy**
```nunjucks
{# Wrong — skips from h1 to h3 #}
<h1 class="govuk-heading-l">Page title</h1>
<h3 class="govuk-heading-m">Section</h3>

{# Correct — sequential hierarchy #}
<h1 class="govuk-heading-l">Page title</h1>
<h2 class="govuk-heading-m">Section</h2>
```

**14. Not adding `autocomplete` to personal data fields**
```nunjucks
{# Wrong — fails WCAG 1.3.5 for personal data fields #}
{{ govukInput({ id: "email", name: "email", label: { text: "Email" } }) }}

{# Correct #}
{{ govukInput({ id: "email", name: "email", autocomplete: "email", label: { text: "Email" } }) }}
```

**15. Duplicate `<h1>` from `appHeading` + `isPageHeading: true`**

A page either uses the project `appHeading` macro **or** sets `isPageHeading: true` on the main form macro — never both. Both produce an `<h1>`, and two h1s on a page is a WCAG 1.3.1 violation.

```nunjucks
{# Wrong — two h1s on the page #}
{{ appHeading({ text: "Choose commodity" }) }}
{{ govukSelect({
  label: { text: "Choose commodity", isPageHeading: true, classes: "govuk-label--l" },
  ...
}) }}

{# Correct — pick one. For form-led pages, the macro's label is the page heading. #}
{{ govukSelect({
  label: { text: "Choose commodity", isPageHeading: true, classes: "govuk-label--l" },
  ...
}) }}
```

**16. Tables without a `<caption>`**

A `<table>` rendered next to a heading is not programmatically associated with it. Screen readers announce the table cold, with no context. Add a `<caption>` — visually hidden if the table sits under a visible heading.

```nunjucks
{# Wrong — no association between heading and table #}
<h2 class="govuk-heading-m">Documents added</h2>
<table class="govuk-table">
  <thead>...</thead>
</table>

{# Correct — caption is the table's accessible name #}
<table class="govuk-table">
  <caption class="govuk-visually-hidden">Documents added</caption>
  <thead>...</thead>
</table>

{# Or visible caption (use govuk-table__caption--m, not govuk-body) #}
<table class="govuk-table">
  <caption class="govuk-table__caption govuk-table__caption--m">Documents added</caption>
  <thead>...</thead>
</table>
```

**17. Inputs inside table rows without per-row labels**

The column header alone is not sufficient for a per-row input. A screen reader user navigating the inputs hears "5" without knowing which item or row it belongs to. Give each input an `aria-label` that includes the row context.

```nunjucks
{# Wrong — input has no row context for screen readers #}
<td class="govuk-table__cell">
  <input class="govuk-input govuk-input--width-3" name="count-{{ item.id }}" type="number">
</td>

{# Correct — aria-label binds the input to its row #}
<td class="govuk-table__cell">
  <input class="govuk-input govuk-input--width-3"
         name="count-{{ item.id }}"
         type="number"
         aria-label="Quantity for {{ item.name }}">
</td>
```

**18. `disabled` on non-form buttons that should remain perceivable**

The HTML `disabled` attribute removes a button from the keyboard tab order and the accessibility tree. For a "Continue" button that's blocked because some upstream condition isn't met (documents still scanning, no items added), use `aria-disabled="true"` paired with `aria-describedby` so screen reader users can still find the button and hear *why* it's blocked.

```nunjucks
{# Wrong — button vanishes from keyboard navigation, no explanation #}
{{ govukButton({ text: "Continue", disabled: true, href: "/next" }) }}

{# Correct — button stays focusable; screen reader hears the reason #}
<p id="cannot-continue-reason" class="govuk-visually-hidden">
  You cannot continue until all documents have been scanned.
</p>
{{ govukButton({
  text: "Continue",
  href: "/next",
  attributes: {
    'aria-disabled': 'true',
    'aria-describedby': 'cannot-continue-reason'
  }
}) }}
```

The handler / client-side code is responsible for actually preventing the action — `aria-disabled` is purely for assistive tech.

---

## Source: `docs/best-practices/node/code-style.md`

# JavaScript / TypeScript — Code Style

Project baseline: Node >= 24, ESM modules throughout. These conventions apply across all Node.js repos in this workspace.

---

## 1. Do one thing

Every function should have a single, clear responsibility. If you find yourself writing "and" when describing what a function does, split it.

```js
// bad — fetches AND transforms AND validates
const processUserData = async (id) => {
  const response = await fetch(`/users/${id}`)
  const data = await response.json()
  if (!data.name) throw new Error('missing name')
  return { ...data, name: data.name.trim().toLowerCase() }
}

// good — each step is its own concern
const fetchUser = (id) => fetch(`/users/${id}`).then((res) => res.json())
const normaliseUser = (user) => ({ ...user, name: user.name.trim().toLowerCase() })
const validateUser = (user) => {
  if (!user.name) throw new Error('missing name')
  return user
}

const processUser = async (id) => fetchUser(id).then(validateUser).then(normaliseUser)
```

---

## 2. Prefer fat-arrow functions

Use fat arrows for all functions that are not class methods or top-level named exports requiring hoisting.

```js
// bad
function double(value) {
  return value * 2
}

// good
const double = (value) => value * 2
```

Single-expression bodies should drop the braces and `return`:

```js
// bad
const isActive = (user) => {
  return user.status === 'active'
}

// good
const isActive = (user) => user.status === 'active'
```

---

## 3. Drop unnecessary braces and returns

Braces and explicit `return` add noise. Remove them when the body is a single expression.

```js
// array methods — no braces needed
const names = users.map((user) => user.name)
const admins = users.filter((user) => user.role === 'admin')
const total = orders.reduce((sum, order) => sum + order.amount, 0)

// chained pipelines read left-to-right without clutter
const adminNames = users
  .filter((user) => user.role === 'admin')
  .map((user) => user.name)
  .sort()
```

Exception: multi-step logic that would be unreadable on one line should stay in a block — clarity beats brevity.

---

## 4. Prefer functional style

Reach for `map`, `filter`, `reduce`, `find`, and `flatMap` over imperative loops. Avoid mutating arrays or objects in place.

```js
// bad — mutation, imperative loop
const result = []
for (const item of items) {
  if (item.active) {
    result.push(item.id)
  }
}

// good
const result = items.filter((item) => item.active).map((item) => item.id)
```

Use spread and object rest to produce new values rather than mutating:

```js
// bad
user.name = 'Alice'

// good
const updatedUser = { ...user, name: 'Alice' }
```

---

## 5. Small, composed functions over large blocks

Break logic into small named functions and compose them. Named functions act as inline documentation — a well-named helper removes the need for a comment.

```js
// bad — one large function doing everything
const buildEmailPayload = (order) => {
  const items = order.lines
    .filter((line) => line.quantity > 0)
    .map((line) => `${line.name} x${line.quantity}`)
  const total = order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const greeting = order.customer.preferredName ?? order.customer.firstName
  return {
    to: order.customer.email,
    subject: `Order ${order.ref} confirmed`,
    body: `Hi ${greeting},\n\n${items.join('\n')}\n\nTotal: £${total.toFixed(2)}`
  }
}

// good — each helper tells a story
const activeLines = (lines) => lines.filter((line) => line.quantity > 0)
const formatLine = (line) => `${line.name} x${line.quantity}`
const orderTotal = (lines) => lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
const displayName = (customer) => customer.preferredName ?? customer.firstName

const buildEmailPayload = (order) => ({
  to: order.customer.email,
  subject: `Order ${order.ref} confirmed`,
  body: [
    `Hi ${displayName(order.customer)},`,
    '',
    ...activeLines(order.lines).map(formatLine),
    '',
    `Total: £${orderTotal(order.lines).toFixed(2)}`
  ].join('\n')
})
```

---

## 6. Naming

Names should reveal intent. Never use single-character variable names. Avoid abbreviations and generic names like `data`, `info`, `obj`, `temp`.

```js
// bad
const d = await getData(id)
const fn = (user) => user.active
const users = items.filter((u) => u.active)

// good
const user = await fetchUser(id)
const isActive = (user) => user.active
const activeUsers = users.filter((user) => user.active)
```

This applies everywhere — including inline callbacks and destructured parameters:

```js
// bad
orders.reduce((a, b) => a + b.total, 0)
items.map(({ n, v }) => `${n}: ${v}`)

// good
orders.reduce((total, order) => total + order.total, 0)
items.map(({ name, value }) => `${name}: ${value}`)
```

Boolean variables and functions should read as predicates:

```js
const isValid = (value) => value !== null && value !== undefined
const hasPermission = (user, action) => user.roles.includes(action)
```

---

## 7. Destructuring and defaults

Destructure early to reduce repeated property access:

```js
// bad
const greet = (user) => `Hello ${user.profile.firstName} ${user.profile.lastName}`

// good
const greet = ({ profile: { firstName, lastName } }) => `Hello ${firstName} ${lastName}`
```

Use default parameter values rather than guard clauses where possible:

```js
// bad
const paginate = (items, page, size) => {
  const currentPage = page ?? 1
  const pageSize = size ?? 20
  return items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
}

// good
const paginate = (items, page = 1, size = 20) => items.slice((page - 1) * size, page * size)
```

---

## 8. Early returns over nested conditionals

Return early to eliminate nesting. The happy path should be the last thing in the function.

```js
// bad
const processPayment = (payment) => {
  if (payment) {
    if (payment.amount > 0) {
      if (payment.currency === 'GBP') {
        return charge(payment)
      }
    }
  }
}

// good
const processPayment = (payment) => {
  if (!payment) return null
  if (payment.amount <= 0) return null
  if (payment.currency !== 'GBP') return null
  return charge(payment)
}
```

---

## 9. Avoid clever one-liners at the expense of clarity

Functional and terse is good. Clever and unreadable is not. When a pipeline becomes hard to follow, name the intermediate steps.

```js
// too clever
const result = data.reduce((acc, { key, val }) => ({ ...acc, [key]: (acc[key] ?? []).concat(val) }), {})

// better — name what you're building
const groupByKey = (items) =>
  items.reduce((groups, { key, value }) => {
    const existing = groups[key] ?? []
    return { ...groups, [key]: [...existing, value] }
  }, {})

const result = groupByKey(data)
```

---

## 10. Module exports

Prefer named exports. Default exports make refactoring harder and IDE support weaker.

```js
// bad
export default function formatDate(date) { ... }

// good
export const formatDate = (date) => ...
```

Group related utilities in a single module rather than scattering single-function files:

```js
// src/utils/date.js
export const formatDate = (date) => ...
export const parseDate = (str) => ...
export const isExpired = (date) => ...
```

---

## 11. `const` over `let`, never `var`

Default to `const`. Only reach for `let` when you genuinely need to reassign. Never use `var`.

```js
// bad
var count = 0
let name = 'Alice'  // never reassigned

// good
const name = 'Alice'

// let is justified here
let retries = 0
while (retries < 3) {
  retries++
}
```

If you find yourself needing `let` for a value built up over time, that is usually a sign to use `map`, `filter`, or `reduce` instead.

---

## 12. Optional chaining and nullish coalescing

Use `?.` and `??` to handle absent values without verbose null checks.

```js
// bad
const city = user && user.address && user.address.city
const label = value !== null && value !== undefined ? value : 'unknown'

// good
const city = user?.address?.city
const label = value ?? 'unknown'
```

Prefer `??` over `||` for defaults — `||` triggers on any falsy value (`0`, `''`, `false`), which is rarely what you want:

```js
// bad — treats 0 and '' as missing
const count = total || 0
const title = input || 'Untitled'

// good — only falls back when null or undefined
const count = total ?? 0
const title = input ?? 'Untitled'
```

---

## 13. No magic numbers or strings

Extract bare literals that carry meaning into named constants. The name documents the intent; the constant makes it easy to change.

```js
// bad
if (user.role === 3) { ... }
setTimeout(sync, 86400000)
if (password.length < 8) { ... }

// good
const ROLE_ADMIN = 3
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MIN_PASSWORD_LENGTH = 8

if (user.role === ROLE_ADMIN) { ... }
setTimeout(sync, ONE_DAY_MS)
if (password.length < MIN_PASSWORD_LENGTH) { ... }
```

---

## 14. Prefer `async`/`await`

Use `async`/`await` over `.then()` chains. It reads sequentially, handles errors uniformly with `try`/`catch`, and is easier to debug.

```js
// bad
const loadDashboard = (userId) =>
  fetchUser(userId)
    .then((user) => fetchPermissions(user.role))
    .then((permissions) => fetchWidgets(permissions))
    .catch((err) => logger.error(err))

// good
const loadDashboard = async (userId) => {
  const user = await fetchUser(userId)
  const permissions = await fetchPermissions(user.role)
  return fetchWidgets(permissions)
}
```

Exception: short single-expression pipelines where `.then()` reads cleanly as a transformation are fine:

```js
const fetchUser = (id) => fetch(`/users/${id}`).then((res) => res.json())
```

---

## 15. Self-documenting code — prefer no comments

Write code that explains itself through naming and structure. Comments drift out of sync with code; names do not.

When you feel the urge to write a comment, try renaming or extracting a function first:

```js
// bad — comment compensating for a poor name
// multiply by 1.2 to add VAT
const total = subtotal * 1.2

// bad — comment describing what the code does
// filter out inactive users and get their IDs
const result = users.filter((user) => user.active).map((user) => user.id)

// good — the code reads as its own explanation
const VAT_MULTIPLIER = 1.2
const totalWithVat = subtotal * VAT_MULTIPLIER

const activeUserIds = users.filter((user) => user.active).map((user) => user.id)
```

Comments are appropriate for **why**, not **what** — when there is a non-obvious constraint, a known gotcha, or a deliberate workaround:

```js
// Hapi validates the full payload before route handlers run,
// so by the time we reach here the token is guaranteed present.
const { token } = request.payload
```

---

## 16. Modern array and object methods

Prefer built-in methods over manual implementations. They are more readable and signal intent clearly.

```js
// last element — no need to compute length
const last = items.at(-1)

// searching from the end
const lastError = events.findLast((event) => event.type === 'error')

// check a condition holds for every item
const allApproved = items.every((item) => item.approved)

// check at least one item matches
const hasErrors = items.some((item) => item.type === 'error')

// flatten one level and map in one pass
const tags = posts.flatMap((post) => post.tags)

// group into an object by a key (Node 22+)
const byStatus = Object.groupBy(orders, (order) => order.status)

// build an object from entries
const index = Object.fromEntries(users.map((user) => [user.id, user]))
```
---

## Source: `docs/best-practices/node/testing/frontend.md`

# Testing — trade-imports-animals-frontend

## Overview

All tests use **Vitest** and run in a Node environment. There is no browser test runner — controllers are tested by spinning up the real Hapi server and calling `server.inject()`. End-to-end browser tests (Playwright) live in the separate `trade-imports-animals-tests` repo.

**Run with:**
```bash
npm test            # run once with coverage
npm run test:watch  # watch mode for development
```

`npm test` excludes the `./tests/` directory (Playwright specs) so only unit tests run.

---

## File naming and location

| Convention | Detail |
|------------|--------|
| Pattern | `*.test.js` (no `.spec.js`) |
| Location | Colocated — same directory as the source file |
| Scope | All test files under `src/` |

---

## Test types

Three distinct flavours are used, each with its own setup pattern:

| Type | When to use |
|------|-------------|
| **Pure unit** | Pure functions — filters, utilities, auth helpers, schema validation |
| **Controller** | Hapi route handlers — spins up a real server, uses `server.inject()` |
| **API client** | HTTP client modules — mocks `global.fetch` |

---

## Pure unit tests

For functions with no side effects, import and call directly. No server, no mocks unless the function has dependencies:

```js
import { formatCurrency } from './format-currency.js'

describe('#formatCurrency', () => {
  describe('With defaults', () => {
    test('Currency should be in expected format', () => {
      expect(formatCurrency('20000000')).toBe('£20,000,000.00')
    })
  })
})
```

---

## Controller tests

Controllers are tested via a full Hapi server instance. This exercises routing, auth strategy, session handling, Nunjucks rendering, and error handling in one pass.

### Setup pattern

Create the server once in `beforeAll`, stop it in `afterAll`. Spy on any backend client methods the controller calls before the server starts:

```js
import { notificationClient } from '../common/clients/notification-client.js'
import { createServer } from '../server.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } = await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

describe('#originController', () => {
  let server

  beforeAll(async () => {
    vi.spyOn(notificationClient, 'get').mockResolvedValue(null)
    vi.spyOn(notificationClient, 'submit').mockResolvedValue({ referenceNumber: 'TEST-REF-123' })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })
})
```

Always pass `{ timeout: 0 }` to `server.stop()` — without it the test can hang waiting for connections to drain.

Always mock `get-oidc-config.js` and `config.js` using the shared helpers — every controller test requires these two mocks or the server will fail to start.

### Making requests

Use `server.inject()` for all HTTP simulation. Always provide `auth` with a session strategy:

```js
// GET — check rendered HTML
const { result, statusCode } = await server.inject({
  method: 'GET',
  url: '/origin',
  auth: {
    strategy: 'session',
    credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
  }
})

expect(statusCode).toBe(statusCodes.ok)
expect(result).toEqual(expect.stringContaining('Origin of the import'))

// POST — check redirect
const { statusCode, headers } = await server.inject({
  method: 'POST',
  url: '/origin',
  auth: {
    strategy: 'session',
    credentials: { user: {} }
  },
  payload: {
    countryCode: 'DE',
    requiresRegionCode: 'no'
  }
})

expect(statusCode).toBe(302)
expect(headers.location).toBe('/commodities')
```

Use the `statusCodes` constants (`statusCodes.ok`, etc.) rather than magic numbers for GET assertions. For redirects, `302` inline is fine.

### DOM assertions with Cheerio

When you need to assert on specific HTML elements rather than string content, parse the response with Cheerio:

```js
import { load } from 'cheerio'

const $ = load(result)

// Element count
const selectOptions = $('#countryCode option')
expect(selectOptions.length).toBeGreaterThan(25)

// Form inputs
const regionRadios = $('input[name="requiresRegionCode"]')
expect(regionRadios.length).toBeGreaterThan(0)
```

Use `expect.stringContaining()` for simple content checks; reach for Cheerio only when you need to query by element, attribute, or structure.

### Testing error paths in controllers

Override a spy's return value for a single test with `mockRejectedValueOnce`:

```js
test('Should handle when backend submit fails', async () => {
  notificationClient.submit.mockRejectedValueOnce(
    Object.assign(new Error('Backend error'), { status: 500, statusText: 'Internal Server Error' })
  )

  const { statusCode, headers } = await server.inject({ ... })

  expect(statusCode).toBe(302)
  expect(headers.location).toBe('/commodities')
})
```

`mockRejectedValueOnce` applies only to the next call — subsequent tests get the original `beforeAll` mock value back.

---

## API client tests

HTTP clients that call `global.fetch` directly should mock fetch on `global` and restore it after each test:

```js
beforeEach(() => {
  originalFetch = global.fetch
  global.fetch = vi.fn()
})

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})
```

Mock `fetch` responses by providing the `ok`, `status`, `statusText`, and `json` shape:

```js
// Success
fetch.mockResolvedValueOnce({
  ok: true,
  json: vi.fn().mockResolvedValue({ referenceNumber: 'REF-123' })
})

// Error
fetch.mockResolvedValueOnce({
  ok: false,
  status: 404,
  statusText: 'Not Found',
  json: vi.fn().mockResolvedValue({ message: 'Not found' })
})
```

Assert on what was sent to `fetch` and what came back:

```js
expect(fetch).toHaveBeenCalledWith(
  'http://mock-backend/notifications',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-trace-id': traceId },
    body: JSON.stringify(expectedPayload)
  }
)
expect(result).toEqual(responseBody)
```

For error cases, assert that the client throws and logs:

```js
await expect(
  notificationClient.submit(mockRequest, traceId)
).rejects.toMatchObject({
  message: 'Failed to submit notification',
  status: 500,
  statusText: 'Internal Server Error'
})

expect(mockLoggerError).toHaveBeenCalledTimes(1)
```

---

## Mocking

### Module mocks

Place all `vi.mock()` calls at the top of the file, before any imports of the code under test. Vitest hoists them automatically, but keeping them visually at the top makes dependencies obvious.

```js
vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))
```

For partial mocks (keep real implementation, override one export), use `importOriginal`:

```js
vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } = await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})
```

### Hoisted mocks

When a mock function needs to be referenced both inside `vi.mock()` and in test assertions, declare it with `vi.hoisted()` before the mock call:

```js
const wreckGetMock = vi.hoisted(() => vi.fn())
const jwtVerifyMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/wreck', () => ({
  default: { get: wreckGetMock }
}))

vi.mock('@hapi/jwt', () => ({
  default: { token: { verify: jwtVerifyMock } }
}))
```

This pattern is needed because `vi.mock()` factory functions run before module imports, so variables declared with `const` would be in the temporal dead zone.

### Spies

Use `vi.spyOn()` for mocking methods on imported objects where you want to preserve the original module otherwise:

```js
vi.spyOn(notificationClient, 'get').mockResolvedValue(null)
vi.spyOn(notificationClient, 'submit').mockResolvedValue({ referenceNumber: 'TEST-REF-123' })
```

Always call `vi.restoreAllMocks()` in `afterAll` to undo spies.

### Shared test helpers

Reuse the shared helpers in `src/server/common/test-helpers/` rather than duplicating mock config in every test file:

| Helper | Purpose |
|--------|---------|
| `mock-oidc-config.js` | Static OIDC discovery config object for auth mocks |
| `mock-auth-config.js` | Factory that wraps `importOriginal` for the config module |
| `component-helpers.js` | `renderComponent(name, params)` — renders a Nunjucks macro and returns a Cheerio `$` |

---

## Assertion specificity & mock lifecycle

Tests that pass for the wrong reason are worse than no tests — they paint a green tick on broken behaviour. The patterns below close the most common gaps.

### Assert call shape, not just call count

`toHaveBeenCalled()` only proves the function ran. It tolerates renamed arguments, swapped positional arguments, dropped fields, and arguments going to the wrong place. Always assert the shape of the call.

```js
// Wrong — passes even if the wrong notificationRef is passed,
// or if dateOfIssue / documentType are silently dropped.
expect(documentClient.initiate).toHaveBeenCalled()

// Correct — failures here pinpoint the broken field.
expect(documentClient.initiate).toHaveBeenCalledWith(
  notificationRef,
  expect.objectContaining({
    documentType: 'ITAHC',
    documentReference: 'REF-123',
    dateOfIssue: '2026-04-01'
  }),
  traceId
)
```

### `expect.objectContaining` over `expect.any(Object)`

`expect.any(Object)` matches `{}`, `[]`, `Date`, even a `Map`. It's a placeholder, not an assertion. Use `objectContaining` to pin down the fields that matter.

```js
// Wrong — passes when logger receives any object whatsoever
expect(logger.error).toHaveBeenCalledWith('Save failed', expect.any(Object))

// Correct — proves the error object had the fields the controller needs
expect(logger.error).toHaveBeenCalledWith(
  'Save failed',
  expect.objectContaining({ status: 500, message: expect.stringContaining('Backend') })
)
```

The same applies to logger argument shape: assert `expect.objectContaining({ info: expect.any(Function), error: expect.any(Function) })` rather than `expect.any(Object)`.

### `vi.spyOn(obj, 'method')` over reassigning `obj.method = vi.fn()`

Direct reassignment is not undone by `vi.restoreAllMocks()` — the replacement leaks into other tests in the same file (and into other files via the shared module instance). Use `vi.spyOn` so the original implementation is restored.

```js
// Wrong — leaks across tests; vi.restoreAllMocks() is a no-op for this
notificationClient.submit = vi.fn().mockRejectedValue(new Error('Backend error'))

// Correct — restorable
vi.spyOn(notificationClient, 'submit')
  .mockRejectedValue(Object.assign(new Error('Backend error'), { status: 500 }))
```

### Centralise mock reset

Scattered `mockClear()` calls inside individual tests drift out of sync as tests are added. Use `beforeEach` for state clearing and `afterEach` (or `afterAll`) for spy restoration:

```js
// Outer describe — applies to every test in the block
beforeEach(() => {
  vi.clearAllMocks()       // resets call history and ".mockResolvedValueOnce" queues
})

afterEach(() => {
  vi.restoreAllMocks()     // restores spies to their original implementations
})
```

`clearAllMocks()` resets call history. `restoreAllMocks()` restores `vi.spyOn` originals. `resetAllMocks()` does both plus clears implementations. Pick based on what you need; don't sprinkle them.

### Restore mutated globals in `afterEach`

Tests that mutate `window.location`, `process.env`, `global.fetch`, or any other shared object must restore them or the next test inherits the mutation. The leak often shows up as a flaky test in unrelated suites.

```js
let originalLocation

beforeEach(() => {
  originalLocation = window.location
})

afterEach(() => {
  Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
})
```

### Assert error path content, not just that it errored

`expect(...).rejects.toThrow()` proves the promise rejected. It does not prove *why*. For schema validation, error messages, and HTTP error shapes, assert the message and path/status so wording regressions are caught.

```js
// Wrong — passes for any rejection
await expect(submitNotification(payload)).rejects.toThrow()

// Correct — pins the error contract
await expect(submitNotification(payload)).rejects.toMatchObject({
  message: 'Failed to submit notification',
  status: 500,
  statusText: 'Internal Server Error'
})

// For Joi multi-error results, assert each detail
expect(error.details[0].message).toBe('"issueDate-day" must be a number')
expect(error.details[0].path).toContain('issueDate-day')
expect(error.details[1].message).toContain('issueDate-month')
```

### Test categorisation matches behaviour

Failure assertions belong inside `describe('invalid …')` blocks; success assertions in `describe('valid …')`. A "should fail when X" test in a `describe('valid payloads')` block reads as a passing positive test at a glance and gets missed in coverage reviews.

---

## Component template tests

Test Nunjucks macros via `renderComponent` from `component-helpers.js`:

```js
import { renderComponent } from '../common/test-helpers/component-helpers.js'

describe('heading component', () => {
  test('renders heading text', () => {
    const $ = renderComponent('heading', { text: 'Page title' })
    expect($('h1').text()).toContain('Page title')
  })
})
```

---

## Describe / test structure

Group related tests with `describe`, one `test` per assertion. Nest describes for method/HTTP verb separation:

```
describe('#controllerName', () => {
  describe('GET /path', () => {
    test('Should render the page', ...)
    test('Should display expected content', ...)
  })
  describe('POST /path', () => {
    test('Should redirect on success', ...)
    test('Should handle backend errors', ...)
  })
})
```

Test descriptions use "Should" + present tense action. Describe blocks use `#functionName` for functions/modules or `METHOD /path` for HTTP handlers.

---

## Test philosophy

**Test behaviour, not implementation.** Assert on observable outputs — HTTP status codes, response body content, session writes, thrown errors — rather than on which internal functions were called.

Avoid bare `toHaveBeenCalled()` and `toHaveBeenCalledTimes(N)` on their own. If a spy call matters, assert *what* it was called with using `toHaveBeenCalledWith(...)`. If only the side-effect matters, assert the side-effect directly (e.g. check the session value was set, not that `setSessionValue` was called).

```js
// ✗ tests implementation — doesn't catch wrong arguments
expect(documentClient.initiate).toHaveBeenCalled()

// ✓ tests behaviour — catches wrong notificationRef, wrong payload shape
expect(documentClient.initiate).toHaveBeenCalledWith(
  'TEST-REF-123',
  expect.objectContaining({ documentType: 'ITAHC', dateOfIssue: '2024-03-10' }),
  expect.any(String)
)

// ✓ also fine — assert the observable effect instead
expect(setSessionValue).toHaveBeenCalledWith(
  expect.anything(),
  'documents',
  expect.arrayContaining([expect.objectContaining({ uploadId: 'TEST-UPLOAD-ID' })])
)
```

---

## Assertions

Vitest's built-in `expect` is used throughout — no additional assertion library.

```js
// Equality
expect(statusCode).toBe(200)
expect(result).toEqual(responseBody)

// String containment
expect(result).toEqual(expect.stringContaining('Origin of the import'))

// Object shape
expect(error).toMatchObject({ message: 'Failed', status: 404 })

// Collections
expect(selectOptions.length).toBeGreaterThan(25)

// Spy calls
expect(fetch).toHaveBeenCalledTimes(1)
expect(fetch).toHaveBeenCalledWith(url, options)
expect(mockFn).not.toHaveBeenCalled()

// Async — resolve/reject
await expect(fn()).resolves.toBeUndefined()
await expect(fn()).rejects.toThrow('message')
await expect(fn()).rejects.toMatchObject({ status: 500 })
```

Prefer `.rejects.toMatchObject()` over `.rejects.toThrow()` when you need to assert on error properties beyond the message.

---

## What the existing tests cover

| Area | Files | What it covers |
|------|-------|---------------|
| Controllers | 7 | Route rendering, form POST handling, redirects, backend error paths |
| Auth | 7 | Token verification, permission extraction, redirect safety, sign-out URL, OIDC config, session state, token refresh |
| API client | 1 | Fetch call shape, session read/write, error propagation and logging |
| Nunjucks filters | 2 | Currency and date formatting |
| Nunjucks context | 2 | Navigation building, global context |
| Plugins | 2 | Auth plugin registration, CSRF protection |
| Helpers | 6 | Redis client, CSP headers, proxy setup, static file serving, error helpers, server startup |
| Session / cache | 1 | Cache engine (ioredis wrapper) |
| Schema validation | 1 | Origin form schema |
| Component templates | 1 | Heading macro rendering |
