# Testing — trade-imports-animals-frontend

## Overview

All tests use **Vitest** and run in a Node environment. There is no browser test runner — controllers are tested by spinning up the real Hapi server and calling `server.inject()`. End-to-end browser tests (Playwright) live in the separate `trade-imports-ins-tests` repo, one Playwright project per frontend.

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
