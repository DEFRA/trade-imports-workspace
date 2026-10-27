# Testing Node services

Applies to the Node frontends (`trade-imports-animals-frontend`, `trade-imports-plants-frontend`, `trade-imports-animals-admin`, `trade-imports-ins-frontend`) and to `tim/`. The house rules in `.claude/rules/code-quality.md` come first. `tim/` adds its own rules in `tim/.claude/rules/test-patterns.md`.

Unit tests use **Vitest** in a Node environment. Feature integration tests (FIT) are Playwright specs that live in each frontend under `fit/` and in each feature's `fit/` folder. End-to-end tests live in `trade-imports-ins-tests`.

```bash
npm test            # unit tests, with coverage
npm run test:watch  # unit tests, watch mode
npm run test:fit    # Playwright feature integration tests
```

---

## 1. Test input and output

A test gives the code an input and checks what comes out. What comes out is something a user, a caller or support can see:

- a return value or a thrown error
- the rendered view and its context, a redirect or a status code
- the answers stored for a journey
- the HTTP request a client sent, and what it did with the response
- the log line or metric written

If a test still passes after you rewrite the code with a different internal structure but the same input and output, it tests behaviour. If it breaks, it tests implementation. Rewrite it.

**No spy assertions.** Do not use `toHaveBeenCalled`, `toHaveBeenCalledWith` or `toHaveBeenCalledTimes`. They pin which internal function ran with which arguments, so a refactor breaks them while the behaviour holds. Before reaching for one, ask: what observable thing should change? That is the assertion. If you cannot observe it, change the seam so you can.

The one exception is a call that is itself the external side effect, such as an outbound webhook or an analytics event. Capture the payload with a fake and assert on the captured payload, not on the spy's call record.

```js
// Bad: pins an internal call, and passes whatever ends up stored
expect(store.replaceFulfilment).toHaveBeenCalledWith(journeyId, expect.any(Object))

// Good (origin/controller.test.js): drive the handler, then read what was stored
const result = await driveHandler(post, {
  payload: { countryOfOrigin: 'ES-CN', regionOfOriginCodeRequirement: 'no', internalReferenceNumber: '' }
})

expect(result.view).toBeUndefined()
expect(result.after.countryOfOrigin).toBe('ES-CN')
expect(result.after.countryOfOriginSubdivisionCode).toBe('ES-CN')
```

---

## 2. Mock at the network boundary

Fake the outermost thing your code does not own: the network, the filesystem, the clock. Never fake a layer inside the service.

| Dependency | Fake it with | Never |
|---|---|---|
| A backend over HTTP (`fetch`) | `vitest-fetch-mock`: `createFetchMock(vi)`, then assert on `fetchMocker.requests()` | `vi.mock` of the client module, `vi.spyOn(client, …)`, `global.fetch = vi.fn()` |
| A backend over HTTP in `tim/` | `nock` through `src/test-support/http-mock.js` | `vi.mock` of `src/clients/*` |
| Records, session and reference data in a feature test | The stub adapters, wired with `configureRecords(SET_ID, recordsStub)` and `configureSession(SET_ID, sessionStub)`. These are the stubs the stack runs in stub mode. | `vi.mock` of `store`, `records` or a service module |
| Filesystem | A real temporary folder (`os.tmpdir()`) | `vi.mock('node:fs')` |
| Clock | Real time. `vi.useFakeTimers()` only when the assertion depends on time moving. `runInZone` for a timezone. | Mocking `Date` by hand |
| Config and OIDC discovery when a server starts | `vi.mock` of `config.js` through `mockAuthConfig`, and of `get-oidc-config.js` returning `mockOidcConfig` | A hand-written config or OIDC fake |

Do not `vi.mock()` your own modules. It leaves the mocked module untested and turns the feature test into a check of which module calls which.

**Bad** (a client test that pins the call record):

```js
global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => body })
await records.create()
expect(fetch).toHaveBeenCalledWith('http://localhost:8085/notifications', expect.any(Object))
```

**Good** (`services/persistence/records/real/real.requests.test.js`):

```js
const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

it('Should create a notification via POST /notifications with an empty fulfilments payload', async () => {
  fetchMocker.mockResponse(JSON.stringify(canonical()), { status: 200 })

  const created = await records.create()

  const requests = fetchMocker.requests()
  expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
    { method: 'POST', url: notificationsUrl }
  ])
  expect(await jsonOf(requests[0])).toEqual({ notification: { fulfilments: [] } })
})
```

The real client code runs. The test reads the request that reached the network and the value the client returned.

---

## 3. Test support: reuse it, never copy it

Set-up used by two tests goes in a shared helper. Extend the helper with an option rather than writing a local copy of its body. When you promote a local helper into shared support, delete every local copy in the same commit.

Feature folders stay independent in production code only. Test support is shared: importing a shared helper, or a sibling feature's helper, is fine.

**Bad:** the same submit-then-amend set-up pasted into five controller test files. **Good:** `driveHandler(post, { seed, amend: true })`.

### Handler tests: `src/server/app/engine/test-support.js`

Both frontends have this file. The rows below are in both unless a row says otherwise.

| Export | What it does |
|---|---|
| `driveHandler(handler, { payload, seed, params, query, state, amend, pathOf })` | Creates a journey, seeds its answers, optionally submits and opens an amendment, runs one handler, and returns `{ journeyId, before, after, response, view }`. Both also take `openingRun` and `saveFailure` and return `logger`; only animals returns `cookies` |
| `useStubbedJourney(setId, dispatchPages)` | Configures the stub stores, builds the dispatch and clears the store before each test (plants: also restores the stub records) |
| `getHandlerOf(featureModule)` (animals only) | The GET handler from a feature's `routes` |
| `postHandlerOf(featureModule)` | The POST handler from a feature's `routes` |
| `postHandlerEndingWith(featureModule, pathSuffix)` | The POST handler whose path ends with `pathSuffix`, for features with several POST routes |
| `stubH(request, { writesStateToRequest })` (the option is plants only) | A response toolkit that records the view, redirect and cookies a handler produced. With `writesStateToRequest`, each cookie is also written onto `request.state`, so a later read in the same request sees it |
| `requestAsSessionHoldingNoJourney(journeyId, { get, post })` (plants only) | Runs a GET and a POST handler as a session that holds no journey and returns both requests and both responses |
| `recordingH()` | A toolkit that records `state` and `unstate` cookie calls |
| `journeyRequest(journeyId, overrides)` | A signed-in request for a known journey |
| `registerTestSessionAuth(server)` | Signs every request in as `authenticatedCredentials` on a real server |
| `authenticatedCredentials`, `authenticatedActor` | The signed-in user's credentials and the actor the backend sees |
| `registerTestRequestLogger(server)` | Gives every request on a real server a `recordingLogger` |
| `recordingLogger()` | A request logger that keeps every line it is given in `entries` |
| `expectOneLogged(logger, { level, fields, message })` | Asserts the logger holds exactly one line |
| `expectOneRefusalLogged(logger, refusal)` | Asserts the logger holds exactly the one refusal line `kit.logRefusal` writes |
| `saveFallbackEntry({ journeyId, err, ...ids })` | The log line a save fallback writes, for comparing against |
| `expectOneSaveFallbackLogged(logger, fallback)` | Asserts the logger holds exactly the one save-fallback line |
| `unavailableBackendError(operation)` | The marked error a failed backend call throws, for seeding a failing store |
| `backendJourneyId`, `backendNotification(options)` | A backend journey id and a backend notification to answer a read with |
| `expectBackLinkIsPage(result, slug)` | Asserts the view's back link is the journey page at `slug` |
| `sampleText(value, sampleArguments)` (animals only) | The text a copy leaf gives: the string itself, or what the copy function returns for the sample arguments |
| `crumbProtectedServerMounting(routes, prefix)` (animals only) | A real server with the crumb plugin and test session auth, mounting the routes under the prefix |
| `expectNoRefusalLogged(logger)` | Asserts the logger holds no refusal line |
| `referenceDataServing()` | Returns a function that serves given rows as the reference-data response; the caller registers `resetMocksAndConfigAfterTests()` |
| `useBackendRecords(setId)` | Registers the real records and the stub session for a describe, enables the shared `fetchMock` and clears its calls before each test, and resets the mocks and config after each test |
| `resetMocksAndConfigAfterTests(...configKeys)` | Registers an `afterEach` that resets fetch mocks and restores `stubMode` and the named config keys |
| `addressBookAnswering(addressResponse)`, `addressBookRefusingAddresses()`, `addressBookRequestUrls()` | Stub the address book's answers and report the URLs it was asked for |
| `expectRemovalRefusedLogged({ logger, journeyId }, { message, ...ids })` (animals only) | Asserts the logger holds exactly the one info line a refused removal writes |
| `expectBackLinkIsPath(result, path)` (plants only) | Asserts the view's back link is the given path |
| `itHoldsCopyAtEveryLeaf(en, cy)` and `expectEveryLeafToBeCopy(locale, bundle)` (plants only) | Register or run the check that every leaf of a copy bundle is a non-empty string or copy function |

### Server and helper tests: `src/server/common/test-helpers/`

| Helper | What it does |
|---|---|
| `mockAuthConfig(importOriginal)` | Wraps the real config with test auth settings |
| `mockOidcConfig` | A static OIDC discovery document |
| `sessionAuth(sessionId, overrides)` | The `auth` option for `server.inject` |
| `readEmfDocuments(logSpy)` | Parses the EMF metric documents written to stdout |
| `runInZone(zone, assertions)` | Runs assertions with `TZ` moved off UTC, then restores it |
| `documentOf(html)`, `trimmedTextOf(element)` (`document-of.js`) | Parse rendered HTML into a document to query, and read an element's trimmed text |

Shared fixtures live in `test/fixtures/`.

### Feature integration tests: `fit/`

| Repo | Helper | What it gives you |
|---|---|---|
| animals | `fit/live-animals-journey.js` | `signIn`, `startNotification`, one `answer…` function per section, `completeAnswerSections`, `openReviewFromHub`, `chooseTypeAheadOption`, `chooseCountryOfOrigin`, `choosePortOfEntry`, `visitOverviewThenOpen`, `openNotificationView`, `expectThreeSaveControls`, `PHONE_VIEWPORT`, `journeyUrl`, `journeyIdFromPage` |
| plants | `fit/high-risk-plants-journey.js` | `startNotification`, `chooseCommodityType`, `addCommodityLine`, `saveOrigin`, `chooseCountryOfOrigin`, `startPotatoNotification`, `completePotatoNotification`, `openDeclaration`, `saveAndContinue`, `chooseTypeAheadOption`, `visitOverviewThenOpen`, `expectThreeSaveControls`, `expectNoSeriousOrCriticalViolations` |
| plants | `fit/set-base.js` | `BASE`, `setUrl`, `setPath`, `journeyIdFromPage` |
| plants | `fit/seed-fields.js` | `seedFields(step)` |
| both | `fit/sign-in.js` | `signIn(page, { organisationId })` |

A sequence of page steps used by two specs becomes a function in the set's journey helper.

---

## 4. What a test proves

**A test title states what its assertions prove.** Write the assertion first, then derive the title from it. Never copy the title from an acceptance criterion.

- Bad: titled "Should flip status to submitted and stamp submittedAt on submit" while asserting `SUBMITTED_ACTION_REQUIRED`.
- Bad: titled "…chosen again after No" in a test that never chooses Yes.
- Good: the title names the status, page or value the assertions check, and nothing more.

A title that claims more than its assertions check is a defect in that test, not a matter of naming.

**A test must fail without its change.** Prove it before you finish: break or remove the production line the test covers, run the test and see it fail, then restore the line. A test that stays green is dead or tests the wrong thing.

**State the end state.** No ticket keys, acceptance-criteria ids or session words in titles. No `REMOVED_*` constants. Prove a removal with an exact positive assertion of what the page shows now.

**One concern per test.** Arrange, act, assert, with a blank line between each.

---

## 5. No coverage-padding tests

Every assertion pins the behaviour the title names. Before you keep a test, ask: if someone broke the thing in the title (the truncation, the fallback, the refusal), would an assertion fail? If not, strengthen the assertion or delete the test.

- Bad: `shouldTruncateLongErrorBodyInLog` that only checks the exception type, which other tests already check.
- Good: the same test asserts the logged body's length.

A defensive line with no realistic route to it can stay uncovered. Coverage gates measure tests; they do not design them.

When a coverage gate fails, check the build config before writing tests. A tier left out of the report (JaCoCo `report` bound to `test` instead of `verify`, or a Vitest `coverage.exclude` that is too wide) looks like a coverage gap.

Do not write tests that pin diagnostic or temporary log lines.

---

## 6. Kinds of test

| Kind | Use for | How |
|---|---|---|
| Pure unit | Functions with no side effects: formatters, validators, view models | Call it, assert the return value or thrown error |
| Handler | A feature's GET or POST handler | `driveHandler` against the stub adapters |
| Server | Plugins, auth, routing, error pages, anything that needs the hapi lifecycle | `createServer()`, `server.initialize()`, `server.inject()` |
| Real adapter | A client that calls a backend | `vitest-fetch-mock`; assert on `fetchMocker.requests()` and the returned value |
| Template | A layout or macro | Render with the Nunjucks environment and query the HTML with Cheerio |
| FIT | A page or a short journey in a real browser against the stub stack | Playwright, using the `fit/` helpers |

### Server tests

Create the server once in `beforeAll` and stop it in `afterAll` with `{ timeout: 0 }`, or the test can hang while connections drain.

```js
vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#healthController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should answer GET /health with 200 and a success message', async () => {
    const { result, statusCode } = await server.inject({ method: 'GET', url: '/health' })

    expect(result).toEqual({ message: 'success' })
    expect(statusCode).toBe(statusCodes.ok)
  })
})
```

OIDC discovery (`mockOidcConfig`) and auth config (`mockAuthConfig`) are the only module mocks a server test may use. For a route behind sign-in, pass `auth: sessionAuth('TEST_SESSION_ID')` to `server.inject`. Use the `statusCodes` constants for status checks other than a `302` redirect.

### DOM assertions with Cheerio

Use Cheerio when you need to query by element, attribute or structure. Assert the full list, not a filtered part of it.

```js
const $ = load(result)
expect($('input[name="requiresRegionCode"]').map((_, el) => $(el).val()).get()).toEqual(['yes', 'no'])
```

---

## 7. Assertion specificity

Tests that pass for the wrong reason paint a green tick on broken behaviour.

**`expect.objectContaining` over `expect.any(Object)`.** `expect.any(Object)` matches `{}`, `[]`, a `Date` or a `Map`. Pin the fields that matter.

```js
// Bad
expect(result).toEqual(expect.any(Object))

// Good
expect(result).toEqual(expect.objectContaining({ status: SUBMITTED, referenceNumber: journeyId }))
```

**Assert the error contract, not just that something threw.**

```js
// Bad: passes for any rejection
await expect(records.submit(journeyId)).rejects.toThrow()

// Good
await expect(records.submit(journeyId)).rejects.toMatchObject({
  message: 'Failed to submit notification: 500 Internal Server Error',
  status: 500
})

// Joi: assert each detail
expect(error.details[0].message).toBe('"issueDate-day" must be a number')
expect(error.details[0].path).toContain('issueDate-day')
```

**Restore what you change.** A test that changes `process.env`, `process.env.TZ`, `window.location` or a module-level fake must put it back in `afterEach`, or the next test inherits it. Use `runInZone` for timezones.

**Group by outcome.** Failure cases go in `describe('… invalid …')`, success cases in `describe('… valid …')`.

---

## 8. Files and names

| Convention | Detail |
|---|---|
| Unit test file | `*.test.js`, next to the source file |
| FIT spec | `*.fit.spec.js`, in the repo's `fit/` or the feature's `fit/` folder |
| `describe` | `#functionName` for a function or module, `METHOD /path` for a handler |
| Test title | "Should" plus what the assertions prove |
