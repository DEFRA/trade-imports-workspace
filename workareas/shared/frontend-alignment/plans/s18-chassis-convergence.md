# s18-chassis-convergence — one chassis outside auth: logging, error copy, validators, names, dependencies

Ruling (Sam, 16 September 2026): Q5 yes, the journeys align with ins. Q12 all three consistent and
internationalisation handled one way. Q16 yes, validators consistent across all three. Q20 remove the dead code.
Q22 yes, declare joi as a proper dependency. Q25 yes, adopt the journey names. Every choice below is made; the
implementor chooses nothing.

| key | role | Bash path | Read/Edit path |
|---|---|---|---|
| ins | changes; the reference for `request-logger.js`, `errors.js`, `errors.test.js` frame, the whole `lib/validate/` | `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` |
| animals | changes; the reference for `status-codes.js` | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` |
| plants | changes; the reference for `pulse.js` and the four test-shape files (§2G) | `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` |
| workspace | stages.json, this plan, logs | `~/git/defra/trade-imports-workspace` | `/Users/samfarrington/git/defra/trade-imports-workspace` |

Branch `feat/NO_JIRA-frontend-alignment` is checked out, clean and level with `origin` in all three repos. HEADs when
planned: ins `5648dd3`, animals `f2f27246`, plants `3747bfe` (all "s17-auth-convergence — stop SonarCloud reading
the mock session-cookie value as a hard-coded password"). Re-check `git -C <repo> status --short --branch` before
the first edit; if a checkout has moved, stop and report. The tests repo is not touched: its specs never assert
`Bad Request` or `Unauthorized` (planner grep over `tests/`).

Ladder, every repo: `format:check`, `lint`, `test`. Run each to a file under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s18-chassis-convergence-<repo>-<script>.log`
(script names with `:` written as `-`) and read it once. Rollback is `git stash push -u` only. Do not commit; the
workflow commits one commit per repo after review.

## Baseline (planner, 16 September 2026, all green)

| repo | format:check | lint | test |
|---|---|---|---|
| ins | clean | clean (55 modules cruised) | 57 files, 542 passed |
| animals | clean | clean (499 modules, 3 known violations ignored) | 179 files (2 skipped), 2275 passed, 8 skipped |
| plants | clean | clean (358 modules) | 145 files (2 skipped), 1895 passed, 8 skipped |

Logs: `logs/s18-chassis-convergence-baseline-<repo>-<script>.log`. A red after this stage is this stage's. Expected
end counts: ins +2 files (request-logger test) with the 503 test and 4 request-logger tests added; animals and plants
each +1 file (request-logger test), plus the validate-lib additions (animals) and the new error-page copy tests.

## 0. Decisions

| # | Decision |
|---|---|
| D1 | **Reference side per file.** ins is the reference for `helpers/logging/request-logger.js`, `helpers/errors.js`, the frame of `helpers/errors.test.js`, and the whole of `app/lib/validate/` (`validators.js`, `index.js`, `validate.test.js`, `calendar.js`, `calendar.test.js` — ins already equals plants on `calendar.*` and differs from plants only by `requiredEmail`). animals is the reference for `constants/status-codes.js` (it alone carries `serviceUnavailable: 503`, EUDPA-575). plants is the reference for `helpers/pulse.js`, the four test-shape files `content-security-policy.test.js`, `redis-client.test.js`, `serve-static-files.test.js`, `start-server.test.js`, and `lib/validate/persists-cleaned-value.test.js`. "Copy X over Y" means Read X, Write Y with exactly X's text. |
| D2 | **The end state is byte-equality of every file present in all three**, under `src/server/common/` (except the two service-specific test values in §6) and `src/server/app/lib/validate/`. The brief's end-state sentence covers the four "test shape" files the report classed deliberate, so they converge too (D9). "Only in" entries are not files and stay: journey-only `common/components/`, `helpers/actor-helpers.*`, `helpers/proxy/`, `helpers/transport-routing.*` (animals), ins-only `helpers/organisation-id.test.js`, `test-helpers/real-mode.js`, `test-helpers/test-server.js`, and plants/animals-only `lib/validate/persists-cleaned-value.test.js` (it drives the engine). |
| D3 | **Copy verbatim, comments included**, except text this plan rewrites explicitly: the stale two-line comment in `serve-static-files.test.js` ("npm run build is ran in the postinstall hook…" — false in all three, the build runs in `pretest`) goes from all three; the countries comments in animals' `errors.test.js` go with the test they explain. |
| D4 | **Q12 words.** `errorPage.badRequest` becomes `There is a problem with your request` (cy `Mae problem gyda’ch cais`); `errorPage.unauthorized` becomes `You need to sign in to view this page` (cy `Mae angen i chi fewngofnodi i weld y dudalen hon`). `notFound`, `forbidden` and `unexpected` do not change (the brief names 400 and 401 only; `Forbidden` is recorded as an open question, not widened). 503 has no message of its own: `errors.js` maps it to `unexpected`, which is what animals main's EUDPA-575 test already expects (`Something went wrong` with `>503</h1>`). The Welsh block uses the curly apostrophe `’` the existing `errorPage` entries use. |
| D5 | **`errorPage` sits directly after `recoverableError`** in the journeys' `copy.en.js` and `copy.cy.js`, so the five keys ins and the journeys share (`layout`, `unauthorised`, `errorSummary`, `recoverableError`, `errorPage`) come in the same order in all three, followed by the journey-only keys. `copy-parity.test.js` proves cy mirrors en; nothing else pins the position. |
| D6 | **Q5 has no test to carry — ins has no `request-logger.test.js`** (planner `find` over the three repos; the brief's "with ins's test" names a file that does not exist). One new `request-logger.test.js` is written from this plan (§3A), byte-equal in all three, pinning the `ignoreFunc` contract hapi-pino consumes: prefix match on `/public`, exact match on `/health` and `/favicon.ico`, everything else logged. Recorded in the stage notes. |
| D7 | **`errors.test.js` is one text in all three (§2C).** Frame is ins's. The 503 test is carried in a form that does not depend on countries loading (question 13, out of scope): a `/test/service-unavailable` route whose handler throws `Boom.serverUnavailable()`. animals loses nothing — `app/services/run-mode.test.js` already pins "Should reject with a serverUnavailable Boom error on load failure" for the countries and ports readers, and the errors helper only needs a Boom 503 to render. `journeyStrip: null` leaves `expectedContext` (ins's `base()` has no such key; the journeys' hub, dashboard and confirmation controller tests pin the strip). The `not.toContain('Prototype')` assertion is dropped: no template in any of the three renders the word (planner grep over `src/**/*.njk`), so it asserts nothing. The no-recoverable-banner assertion stays, on the sentence all three copies share (`Try again in a few minutes.`) rather than the journeys' longer body. `@hapi/boom` is imported in the test as `kit.js` already imports it in `src`; it is not declared in any `package.json` (Q22 named joi only — recorded as an open question, not widened). |
| D8 | **`status-codes.js` is animals' text in all three** (order `ok, noContent, redirectFound, badRequest, unauthorized, forbidden, notFound, imATeapot, payloadTooLarge, internalServerError, serviceUnavailable`). ins's only importer of the old name is `statusCodes.redirect` at seven sites in three address-book controller tests; they become `statusCodes.redirectFound`. The `HTTP_STATUS_FOUND = 302` locals s17 put in `src/server/auth/controller.test.js` and `stub-sign-in.test.js` stay: auth is out of scope for this stage, and they are already byte-equal. Recorded in notes as the follow-up s17's D18 anticipated. |
| D9 | **The four test-shape files converge on plants' text**, direction ins → journeys. `content-security-policy.test.js` hits `/health` (drops ins's `sessionAuth` import and the `/` request). `redis-client.test.js` takes plants' `objectContaining` shape with `keyPrefix: 'trade-imports-ins-frontend:'` as the one service-specific value. `serve-static-files.test.js` boots with `createServer()` + `initialize()` and gains the crest-asset test. `start-server.test.js` takes plants' `vi.mock('../../server.js', …)` wrapper so `startServer()` never binds a port — that mock avoids port binding, it is not a module mock standing in for a network boundary, so invariant 8 is not offended; ins's `vi.stubEnv('PORT', '3097')` and `hapi.server` spy go. |
| D10 | **`lib/validate/` converges on ins's text.** `validators.js`, `index.js`, `validate.test.js`, `calendar.js`, `calendar.test.js` are copied from ins over animals and plants. `validate.test.js` keeps ins's four local constants (`CATEGORY_ONE` …) rather than plants' `test/fixtures/index.js` import: that fixture is the synthetic obligation set (journey-only, and animals has no `test/fixtures/` at all). animals therefore also gains, from plants via ins: `requiredTime`, `requiredDateTextInRange`, the empty-allow-list guard in `requiredOneOf`, the four-digit-year guard in `parseDateText`, and the `dateWithinBounds` name. Each is a behaviour change for animals and is listed in the notes; none of animals' features import the new names or pass a two-digit year (planner grep). `persists-cleaned-value.test.js`: animals takes plants' neutral field name `textFieldTwo`. |
| D11 | **Q22 pin is exact, at the version each lockfile resolves**: ins `"joi": "17.13.8"`, animals and plants `"joi": "17.13.7"`, inserted between `"ioredis"` and `"lodash"` in `dependencies`. joi reaches all three today through `@hapi/bell` and `@hapi/catbox-redis` (`^17.7.1`); `@hapi/jwt` and `hapi-pulse` carry their own nested joi 18 and are unaffected. |
| D12 | **Lockfile route.** ins: `npm --prefix <ins> run install:pinned-npm` (the repo's documented route; a full install under npm 11.6.2, no `postinstall` in ins). animals and plants have no such script and their READMEs document bare `npm install`, which under the ambient npm 11.17.0 writes a lockfile the pinned 11.6.2 rejects in CI; tooling is out of scope so no script is added. The route is the workspace helper with the pinned npm and `--package-lock-only` (§2H), followed by `ci --dry-run` under the pin as the proof. The bash guard denies any `npm --prefix …trade-imports-workspace… install`, which is why the helper is used and not `npm --prefix` directly. Expected lockfile diff: one added line under `packages[""].dependencies` and nothing else; anything more is recorded in the stage notes as the brief asks. |
| D13 | **Q20 is one `git rm`.** `test-helpers/component-helpers.js` has no importer, a dangling `#/` import (no `imports` map in plants' `package.json`) and no mention in any config (planner grep over `*.js`, `*.cjs`, `*.json`, `*.md`, `*.yml`; `nodemon.json`'s `test-helpers` entry is `src/server/common/test-helpers`, a different directory). `cheerio` stays: five other plants tests import it. The directory disappears with its only file. |
| D14 | **The new words are pinned in all three `shared/copy.test.js`**: ins's existing `error-page copy` block is updated; the journeys' identical `copy.test.js` (animals and plants are byte-equal today) gains the same block. The journeys' `copy-convention.test.js` `arrayContaining` list gains `'recoverableError', 'errorPage'` after `'errorSummary'`. |
| D15 | **`pulse.js` is plants' text in ins** (`const shutdownTimeoutMs = 10000`). Nothing else imports the name. |
| D16 | **The journeys' `copy.en.js` header comment gains the error page.** It lists what the shared module holds; after this stage it holds the error page's messages too. Exact text in §2B. |
| D17 | **Docs are untouched.** ins's `architecture.md` and `features.md` already describe `sharedCopy.errorPage`; the journeys' docs never mention `errors.js`, `status-codes`, `request-logger` or `pulse` (planner grep). `surfaces.json` is the report-refresh step's. |

## 1. Moves

| repo | from | to | note |
|---|---|---|---|
| plants | `test-helpers/component-helpers.js` | deleted | Q20; `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend rm test-helpers/component-helpers.js` |
| ins | — | — | none |
| animals | — | — | none |

## 2. Edits

Read the reference file in full before each edit.

### 2A. Q5 — `src/server/common/helpers/logging/request-logger.js` in animals and plants

Copy ins's file over both. The whole file:

```js
import hapiPino from 'hapi-pino'

import { loggerOptions } from './logger-options.js'

const pathToIgnore = (_, request) =>
  request.path.startsWith('/public') ||
  request.path === '/health' ||
  request.path === '/favicon.ico'

const requestLogger = {
  plugin: hapiPino,
  options: {
    ignoreFunc: pathToIgnore,
    ...loggerOptions
  }
}

export { requestLogger }
```

The journeys' `server.js` already imports `{ requestLogger }` from this path (named export in both shapes), so no
importer changes.

### 2B. Q12 — copy modules in animals and plants

**`src/server/app/shared/copy.en.js`**, both journeys. Insert after the `recoverableError` block (after its
closing `},`) and before `staleActionRejected`:

```js
  errorPage: {
    notFound: 'Page not found',
    forbidden: 'Forbidden',
    unauthorized: 'You need to sign in to view this page',
    badRequest: 'There is a problem with your request',
    unexpected: 'Something went wrong'
  },
```

Replace the header comment's second sentence fragment so the whole comment reads:

```js
/**
 * Shared chrome copy — the only copy that legitimately lives outside a
 * feature folder: the layout (service name, service navigation,
 * back link, error title prefix), the unauthorised page, error-summary
 * title, the recoverable-error banner, the error page's messages,
 * save-actions buttons and journey-strip tags. Every view reaches
 * it as `sharedCopy` (via `kit.base`, or passed directly by the controllers
 * that build their view models without it).
 */
```

**`src/server/app/shared/copy.cy.js`**, both journeys. Same position (after `recoverableError`, before
`staleActionRejected`); the file already opens with the `// MACHINE-DRAFT Welsh —` header line, which is the
convention — do not add another:

```js
  errorPage: {
    notFound: 'Heb ddod o hyd i’r dudalen',
    forbidden: 'Gwaharddedig',
    unauthorized: 'Mae angen i chi fewngofnodi i weld y dudalen hon',
    badRequest: 'Mae problem gyda’ch cais',
    unexpected: 'Aeth rhywbeth o’i le'
  },
```

**ins `src/server/app/shared/copy.en.js`** — in the existing `errorPage` block change two values:
`unauthorized: 'Unauthorized'` → `unauthorized: 'You need to sign in to view this page'`,
`badRequest: 'Bad Request'` → `badRequest: 'There is a problem with your request'`.

**ins `src/server/app/shared/copy.cy.js`** — same two keys: `unauthorized: 'Heb awdurdod'` →
`unauthorized: 'Mae angen i chi fewngofnodi i weld y dudalen hon'`, `badRequest: 'Cais annilys'` →
`badRequest: 'Mae problem gyda’ch cais'`.

After the edits, `errorPage` is byte-equal across the three `copy.en.js` files and across the three `copy.cy.js`
files (prove with `grep -n -A 6 "errorPage" <file>` on each).

### 2C. Q12 — `src/server/common/helpers/errors.js` and `errors.test.js`, all three

**`errors.js`**: copy ins's file over animals' and plants'. The whole file:

```js
import { statusCodes } from '../constants/status-codes.js'
import { base, sharedCopy } from '../../app/shared/kit.js'

const ERROR_PAGE_COPY_KEY = {
  [statusCodes.notFound]: 'notFound',
  [statusCodes.forbidden]: 'forbidden',
  [statusCodes.unauthorized]: 'unauthorized',
  [statusCodes.badRequest]: 'badRequest'
}

const errorMessageFor = (statusCode) =>
  sharedCopy.errorPage[ERROR_PAGE_COPY_KEY[statusCode] ?? 'unexpected']

export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const errorMessage = errorMessageFor(statusCode)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  }

  return h
    .view('shared/error', {
      ...base(errorMessage),
      heading: statusCode,
      message: errorMessage
    })
    .code(statusCode)
}
```

The journeys' `kit.js` exports `sharedCopy` and a `base(title, options)` with the same first argument, so the file
works unchanged. `errors.js` already imported `base` from `kit.js` in the journeys; no new dependency-cruiser edge.

**`errors.test.js`**: Write this exact text into all three (D7). Then `npm run format` in each repo and confirm
`diff` between any two is empty.

```js
import Boom from '@hapi/boom'
import { vi } from 'vitest'

import { catchAll } from './errors.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from '../test-helpers/mock-oidc-config.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#errors', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    server.route({
      method: 'GET',
      path: '/test/programming-error',
      options: { auth: false },
      handler: () => {
        throw new TypeError('programming failure')
      }
    })
    server.route({
      method: 'GET',
      path: '/test/service-unavailable',
      options: { auth: false },
      handler: () => {
        throw Boom.serverUnavailable()
      }
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected Not Found page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/non-existent-path'
    })

    expect(result).toEqual(
      expect.stringContaining('Page not found | Import notification service')
    )
    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('Should render an unexpected programming error in the shared layout without the recoverable banner', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/test/programming-error'
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toEqual(
      expect.stringContaining(
        'Something went wrong | Import notification service'
      )
    )
    expect(result).toEqual(expect.stringContaining('>500</h1>'))
    expect(result).not.toEqual(
      expect.stringContaining('Try again in a few minutes.')
    )
  })

  test('Should serve the shared error page as a 503 when a service behind the page is unavailable', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/test/service-unavailable'
    })

    expect(statusCode).toBe(statusCodes.serviceUnavailable)
    expect(result).toEqual(
      expect.stringContaining(
        'Something went wrong | Import notification service'
      )
    )
    expect(result).toEqual(expect.stringContaining('>503</h1>'))
  })
})

describe('#catchAll', () => {
  const mockErrorLogger = vi.fn()
  const mockStack = 'Mock error stack'
  const errorPage = 'shared/error'
  const mockRequest = (statusCode) => ({
    response: {
      isBoom: true,
      stack: mockStack,
      output: {
        statusCode
      }
    },
    logger: { error: mockErrorLogger }
  })
  const mockToolkitView = vi.fn()
  const mockToolkitCode = vi.fn()
  const mockToolkit = {
    view: mockToolkitView.mockReturnThis(),
    code: mockToolkitCode.mockReturnThis(),
    continue: Symbol('continue')
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const expectedContext = (pageTitle, heading) =>
    expect.objectContaining({
      pageTitle,
      heading,
      message: pageTitle,
      recoverableError: false
    })

  test('Should provide expected "Not Found" page', () => {
    catchAll(mockRequest(statusCodes.notFound), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Page not found', statusCodes.notFound)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('Should provide expected "Forbidden" page', () => {
    catchAll(mockRequest(statusCodes.forbidden), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Forbidden', statusCodes.forbidden)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.forbidden)
  })

  test('Should provide expected "Unauthorized" page', () => {
    catchAll(mockRequest(statusCodes.unauthorized), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext(
        'You need to sign in to view this page',
        statusCodes.unauthorized
      )
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.unauthorized)
  })

  test('Should provide expected "Bad Request" page', () => {
    catchAll(mockRequest(statusCodes.badRequest), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext(
        'There is a problem with your request',
        statusCodes.badRequest
      )
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.badRequest)
  })

  test('Should provide expected default page', () => {
    catchAll(mockRequest(statusCodes.imATeapot), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Something went wrong', statusCodes.imATeapot)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.imATeapot)
  })

  test('Should provide expected "Something went wrong" page and log error for internalServerError', () => {
    catchAll(mockRequest(statusCodes.internalServerError), mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Something went wrong', statusCodes.internalServerError)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(
      statusCodes.internalServerError
    )
  })

  test('Should leave non-Boom responses untouched', () => {
    const result = catchAll(
      { response: { statusCode: 302 }, logger: { error: mockErrorLogger } },
      mockToolkit
    )

    expect(result).toBe(mockToolkit.continue)
    expect(mockToolkitView).not.toHaveBeenCalled()
    expect(mockToolkitCode).not.toHaveBeenCalled()
  })
})
```

The page-title assertions read `Import notification service` in all three because all three `copy.en.js` name
the service that way today — there is no service-specific value in this file. Prettier may re-wrap the two
`expectedContext(` calls above; whatever it produces is the same in all three because the three Prettier configs
are identical, and the post-format `diff` is the check.

### 2D. Q12 — `shared/copy.test.js` and `copy-convention.test.js`

**ins `src/server/app/shared/copy.test.js`**, the `error-page copy` block: change the two expected values to
`unauthorized: 'You need to sign in to view this page'` and `badRequest: 'There is a problem with your request'`.

**animals and plants `src/server/app/shared/copy.test.js`** (byte-equal today): insert, between the
`service-navigation copy` describe and the `save-actions copy` describe, exactly ins's block as it reads after the
edit above:

```js
describe('error-page copy', () => {
  it('Should carry one message per status the catch-all names, and the fallback', () => {
    expect(sharedEn.errorPage).toEqual({
      notFound: 'Page not found',
      forbidden: 'Forbidden',
      unauthorized: 'You need to sign in to view this page',
      badRequest: 'There is a problem with your request',
      unexpected: 'Something went wrong'
    })
  })
})
```

**animals and plants `src/server/app/copy-convention.test.js`**, the `arrayContaining` list in
"Should carry the chrome namespaces in the shared module": becomes

```js
      expect.arrayContaining([
        'layout',
        'unauthorised',
        'errorSummary',
        'recoverableError',
        'errorPage',
        'saveActions',
        'journeyStrip'
      ])
```

### 2E. Q25 — `src/server/common/constants/status-codes.js`, ins and plants; ins importers

Copy animals' file over ins's and plants'. The whole file:

```js
export const statusCodes = {
  ok: 200,
  noContent: 204,
  redirectFound: 302,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  imATeapot: 418,
  payloadTooLarge: 413,
  internalServerError: 500,
  serviceUnavailable: 503
}
```

ins importers of the old name — replace `statusCodes.redirect` with `statusCodes.redirectFound` at:

| file | lines |
|---|---|
| `src/server/app/features/address-book/add/controller.test.js` | 157, 206, 253 |
| `src/server/app/features/address-book/edit/controller.test.js` | 179, 224 |
| `src/server/app/features/address-book/delete/controller.test.js` | 160, 178 |

Then `grep -rn "statusCodes\.redirect\b" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src`
must print nothing. No other member name changes (ins uses no member the journeys lack; planner grep).

### 2F. Q25 — `src/server/common/helpers/pulse.js`, ins

Copy plants' file over ins's. The whole file:

```js
import hapiPulse from 'hapi-pulse'

import { createLogger } from './logging/logger.js'

const shutdownTimeoutMs = 10000

const pulse = {
  plugin: hapiPulse,
  options: {
    logger: createLogger(),
    timeout: shutdownTimeoutMs
  }
}

export { pulse }
```

### 2G. The four test-shape files under `src/server/common/helpers/` — ins takes plants' text (D9)

| file | action |
|---|---|
| `content-security-policy.test.js` | copy plants' over ins's (also over animals', which hits `/` where plants hits `/health`) |
| `redis-client.test.js` | copy plants' over ins's, then change both `keyPrefix: 'trade-imports-plants-frontend:'` to `keyPrefix: 'trade-imports-ins-frontend:'` (lines 33 and 56). animals already carries plants' shape with its own prefix — leave it |
| `serve-static-files.test.js` | copy plants' over ins's and animals', then in all three delete the two comment lines inside "Should serve assets as expected" (`// Note npm run build is ran in the postinstall hook …` and `// available for this test. Remove as you see fit`) so the test body starts at `const { statusCode } = await server.inject({` |
| `start-server.test.js` | copy plants' over ins's (animals already equals plants) |

plants' `content-security-policy.test.js` for reference:

```js
import { createServer } from '../../server.js'
import { vi } from 'vitest'

import { mockOidcConfig } from '../test-helpers/mock-oidc-config.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should set the CSP policy header', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })
})
```

plants' `start-server.test.js` for reference (keep its two-line why-comment; it explains the mock):

```js
import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from '../test-helpers/mock-oidc-config.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

// Wrap createServer so server.start() calls initialize() instead of binding
// to a port — inject() works after initialize(), no available port needed.
vi.mock('../../server.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    createServer: vi.fn(async () => {
      const server = await actual.createServer()
      server.start = () => server.initialize()
      return server
    })
  }
})

import { startServer } from './start-server.js'
import { createServer } from '../../server.js'

describe('#startServer', () => {
  describe('When server starts', () => {
    let server

    beforeAll(async () => {
      server = await startServer()
    })

    afterAll(async () => {
      await server?.stop({ timeout: 0 })
    })

    test('Should start up server as expected', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/health'
      })

      expect(result).toEqual({ message: 'success' })
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('When server start fails', () => {
    test('Should propagate createServer errors', async () => {
      vi.mocked(createServer).mockRejectedValueOnce(
        new Error('Server failed to start')
      )

      await expect(startServer()).rejects.toThrow('Server failed to start')
    })
  })
})
```

The `serve-static-files.test.js` target (plants' text minus the stale comment), all three:

```js
import { createServer } from '../../server.js'
import { statusCodes } from '../constants/status-codes.js'
import { vi } from 'vitest'

import { mockOidcConfig } from '../test-helpers/mock-oidc-config.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#serveStaticFiles', () => {
  let server

  describe('When secure context is disabled', () => {
    beforeEach(async () => {
      server = await createServer()
      await server.initialize()
    })

    afterEach(async () => {
      await server.stop({ timeout: 0 })
    })

    test('Should serve favicon as expected', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/favicon.ico'
      })

      expect(statusCode).toBe(statusCodes.noContent)
    })

    test('Should serve assets as expected', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/public/assets/images/govuk-crest.svg'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
```

`/public/assets/images/govuk-crest.svg` exists in ins after `pretest` runs `build:frontend` (the same webpack
copy of govuk-frontend assets the journeys rely on); if the ins run reports 404 here, read
`~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/.public/assets/images/` with `ls` and report
— do not change the path.

### 2H. Q22 — `package.json` and `package-lock.json`, all three

`package.json`, `dependencies`, between `"ioredis": …,` and `"lodash": "4.18.1",`:

| repo | line to add |
|---|---|
| ins (after line 80) | `    "joi": "17.13.8",` |
| animals (after line 85) | `    "joi": "17.13.7",` |
| plants (after line 86) | `    "joi": "17.13.7",` |

Then regenerate each lockfile through its route, one Bash call each:

ins:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run install:pinned-npm > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s18-chassis-convergence-ins-install.log 2>&1
```

animals:

```
~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo trade-imports-animals-frontend exec --yes -- npm@11.6.2 --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend install --package-lock-only > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s18-chassis-convergence-animals-install.log 2>&1
```

plants:

```
~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo trade-imports-plants-frontend exec --yes -- npm@11.6.2 --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend install --package-lock-only > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s18-chassis-convergence-plants-install.log 2>&1
```

Then the proof, animals and plants (ins's route already installed under the pin):

```
~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo trade-imports-plants-frontend exec --yes -- npm@11.6.2 --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend ci --dry-run > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s18-chassis-convergence-plants-ci-dry-run.log 2>&1
```

(and the same with `animals`). Then read `git -C <repo> diff package-lock.json` once per repo. The expected diff
is exactly one hunk adding `"joi": "17.13.8"` (ins) or `"joi": "17.13.7"` (journeys) to `packages[""].dependencies`
in alphabetical position. Any other hunk: leave it in place (the brief accepts it) and quote it in the stage notes.
If the route is denied by the permission system, stop and report the exact command; the orchestrator runs it from
the main session.

### 2I. Q16 — `src/server/app/lib/validate/`, animals and plants take ins's text (D10)

| file | animals | plants |
|---|---|---|
| `validators.js` | copy ins's over it (325 → 401 lines) | copy ins's over it (adds the `requiredEmail` block after `requiredMaxText`) |
| `index.js` | copy ins's over it | copy ins's over it |
| `validate.test.js` | copy ins's over it | copy ins's over it (local constants replace the `test/fixtures` import; `requiredEmail` tests added) |
| `calendar.js` | copy ins's over it (adds `DATE_TEXT_SHAPE` and the four-digit-year guard) | already equal |
| `calendar.test.js` | copy ins's over it (adds `['27/3/26']`, `['5/8/26']` reject rows) | already equal |
| `persists-cleaned-value.test.js` | copy plants' over it (`transportDocumentReference` → `textFieldTwo`; the engine imports are already identical) | reference |

ins's `requiredEmail`, for the reviewer:

```js
export const requiredEmail = (name, max, messages) =>
  single(
    name,
    Joi.string()
      .trim()
      .required()
      .max(max)
      .email({ tlds: { allow: false } })
      .messages({
        'string.empty': messages.required,
        'any.required': messages.required,
        'string.max': messages.maxLength ?? defaults.maxLength(max),
        'string.email': messages.format
      })
  )
```

After the copies, `diff -rq` between ins and plants over `lib/validate/` reports only
`Only in …plants…/validate: persists-cleaned-value.test.js`; between animals and plants it is empty.

## 3. New files

### 3A. `src/server/common/helpers/logging/request-logger.test.js`, all three, byte-equal

Imitates the explicit-import style of plants' `start-server.test.js`. Full text:

```js
import { describe, expect, test } from 'vitest'

import { requestLogger } from './request-logger.js'

const isLeftOutOfTheRequestLog = (path) =>
  requestLogger.options.ignoreFunc(undefined, { path })

describe('#requestLogger', () => {
  test.each([
    '/public/stylesheets/application.css',
    '/public/javascripts/application.js',
    '/health',
    '/favicon.ico'
  ])('Should leave %s out of the request log', (path) => {
    expect(isLeftOutOfTheRequestLog(path)).toBe(true)
  })

  test.each(['/', '/auth/sign-in', '/healthcheck', '/publications'])(
    'Should log %s',
    (path) => {
      expect(isLeftOutOfTheRequestLog(path)).toBe(false)
    }
  )
})
```

`/healthcheck` and `/publications` prove exact match on `/health` and prefix match on `/public`; `/auth/sign-in`
is a route all three serve. Run `npm run format` and confirm the three files still `diff` empty.

## 4. Imports

Nothing moves, so no relative path changes. Two names change:

- `statusCodes.redirect` → `statusCodes.redirectFound` — ins only, the seven test sites in §2E. Grep proof in §6.
- `tenSeconds` → `shutdownTimeoutMs` — local to `pulse.js`, no importer.

`errors.js` in the journeys now imports `sharedCopy` alongside `base` from `'../../app/shared/kit.js'` — the same
module it already imported. `errors.test.js` and `validators.js` import `@hapi/boom` and `joi` the way `kit.js`
and the address-book code already do.

## 5. Tests

| test | ins | animals | plants | pins |
|---|---|---|---|---|
| `helpers/logging/request-logger.test.js` | new | new | new | the ignore contract: `/public/*`, `/health`, `/favicon.ico` skipped; near misses logged |
| `helpers/errors.test.js` | changes: 503 route + test, banner assertion, new 400/401 words | changes: countries route replaced by the Boom route; `journeyStrip`, `Prototype` dropped; new words | changes: 503 test gained; `journeyStrip`, `Prototype` dropped; new words | the catch-all renders the shared page with the status as heading, the copy message as title, logs only ≥500, passes non-Boom through; 503 is rendered from a Boom |
| `shared/copy.test.js` | two values change | gains `error-page copy` | gains `error-page copy` | the five error-page messages |
| `copy-convention.test.js` | — | list gains two keys | list gains two keys | `errorPage` is a shared-chrome namespace |
| `copy-parity.test.js` | — | unchanged, now covers `errorPage` | same | cy mirrors en; every string translated |
| `helpers/content-security-policy.test.js` | takes plants' | takes plants' | — | CSP header on `/health` |
| `helpers/redis-client.test.js` | takes plants' shape, ins prefix | — | — | single and cluster clients built with the service prefix |
| `helpers/serve-static-files.test.js` | takes plants' (+ asset test) | takes plants' | comment removed | favicon 204, crest 200 |
| `helpers/start-server.test.js` | takes plants' | — | — | `startServer` serves `/health`; createServer errors propagate |
| `lib/validate/validate.test.js` | — | takes ins's | takes ins's | every primitive, `requiredEmail` included |
| `lib/validate/calendar.test.js` | — | takes ins's | — | two-digit years are not real dates |
| `lib/validate/persists-cleaned-value.test.js` | absent | takes plants' | — | cleaned value persisted, raw echoed on error |
| `address-book/{add,edit,delete}/controller.test.js` | rename only | — | — | unchanged behaviour |

`test/fixtures/` in plants is untouched; the stub-sign-in and auth controller tests are untouched (D8).

## 6. Invariants to prove

1. **Public URL surface of ins.** Nothing routes; `grep -rn "path: '" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/shared/paths.js` and `src/server/router.js` unchanged (`git -C <ins> diff --stat` lists neither).
2. **Byte-equality, `src/server/common/`.** Run, to a log, `diff -rq <ins>/src/server/common <plants>/src/server/common`, then ins vs animals, then animals vs plants. Read once. The only permitted lines: `Only in` for the paths in D2, plus `Files … redis-client.test.js … differ` for every pair (key prefix). Quote the three outputs in the stage notes. Then `diff <a>/…/redis-client.test.js <b>/…/redis-client.test.js` must show only the two `keyPrefix` lines.
3. **Byte-equality, `src/server/app/lib/validate/`.** `diff -rq` over the three pairs: ins vs each journey reports only `Only in …/validate: persists-cleaned-value.test.js`; animals vs plants is empty. Quote in notes.
4. **`status-codes.js` and `pulse.js` byte-equal in all three** — covered by 2; also `grep -rn "statusCodes\.redirect\b\|tenSeconds" <ins>/src` prints nothing.
5. **Copy invariant.** `grep -n -A 6 "errorPage" <repo>/src/server/app/shared/copy.en.js` shows the same six lines in all three; same for `copy.cy.js`. `copy-parity.test.js` green in all three.
6. **No new shared package, no cross-repo import.** `git -C <repo> diff --stat` shows no path outside the repo; no `../../../..` beyond the repo root in any changed file.
7. **Lockfile hygiene.** Per repo, `git -C <repo> diff package-lock.json` is the one-line joi hunk (D12); `ci --dry-run` under the pin exits 0 for animals and plants.
8. **Q20.** `git -C <plants> ls-files test-helpers` prints nothing; `grep -rn "component-helpers" <plants> --include="*.js" --include="*.cjs" --include="*.json" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=coverage` prints nothing.
9. **Ladder green** in all three (`format:check`, `lint`, `test`), each to its log, each read once.
10. **Comment policy.** The stale `serve-static-files` comment is gone from all three (`grep -rn "postinstall hook" <repo>/src` prints nothing).

## 7. Out of scope — leave alone

- **Auth** (`src/auth/`, `src/plugins/auth*.js`, `src/server/auth/`, the `HTTP_STATUS_FOUND` locals in the two auth tests).
- **Countries loading** (question 13): the countries and ports readers, `app/routes.js` priming in plants, `run-mode.test.js`; animals' 503 test loses its countries coupling only because the errors test must be one text.
- **Tooling and workflows**: no `install:pinned-npm` script for the journeys (question 18), no `postinstall` for ins (question 17), no `@hapi/boom` declaration (it is a phantom dependency of the same class as joi — recorded as an open question, not fixed here), no `cheerio` removal, no `.github/`, `Dockerfile`, `README.md` edits.
- **Feature naming** (question 14), fit fixtures (question 15), `surfaces.json` (the report-refresh step's).
- **`errorPage.forbidden`**: the ruling names 400 and 401; `Forbidden` stays and is listed as an open question.
- **The journeys' copy beyond `errorPage`** and the journeys' `test/fixtures/`.
- **Docs**: none describe the old words or names (D17).

## 8. Work order

1. Check the three checkouts (HEADs above).
2. plants: `git rm test-helpers/component-helpers.js`.
3. Q25: ins `status-codes.js` and the seven renames; plants `status-codes.js`; ins `pulse.js`.
4. Q12: copy modules in the journeys and ins (§2B); `errors.js` in the journeys (§2C); `errors.test.js` in all three (§2C); copy tests (§2D).
5. Q5: `request-logger.js` in the journeys (§2A); `request-logger.test.js` in all three (§3A).
6. Test-shape files (§2G).
7. Q16: the validate lib (§2I).
8. Q22: `package.json` edits, then the three install commands and the two dry runs (§2H); read the lockfile diffs.
9. `npm --prefix <repo> run format` in each repo, then the `diff -rq` proofs (§6 items 2, 3, 5, 8), quoting each in the stage notes.
10. Ladder per repo, to logs, read once.
11. Append to the stage's `notes` in `stages.json`: the three `diff -rq` outputs, the lockfile diffs, and the behaviour changes from the header of the structured output; keep the JSON valid (`jq empty`).
