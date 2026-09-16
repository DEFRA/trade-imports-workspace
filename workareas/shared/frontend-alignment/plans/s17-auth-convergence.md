# s17-auth-convergence — one authentication shape across the three frontends

Ruling (Sam, 16 September 2026): consistent authentication across the three, not better authentication; do not
build real auth. Q2, Q3, Q4, Q6, Q7, Q8, Q9, Q10, Q11, Q24 and the stub sign-in shape are all settled and land
together, one commit per repo. Every choice below is made; the implementor chooses nothing.

| key | role | Bash path | Read/Edit path |
|---|---|---|---|
| ins | changes | `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` |
| plants | changes; the reference for every journey-side quote | `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` |
| animals | changes | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` |
| tests | changes (page objects only) | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests` |
| workspace | stages.json, this plan, logs | `~/git/defra/trade-imports-workspace` | `/Users/samfarrington/git/defra/trade-imports-workspace` |

Branch `feat/NO_JIRA-frontend-alignment` is checked out, clean and level with `origin` in all four repos (the
`repos/` checkouts are the programme's working checkouts again from this stage). HEADs when planned: ins
`da05f1fd`, plants `cf01b98a`, animals `9666f2df`, tests `a2b8d483`. Re-check `git -C <repo> status --short --branch`
before the first edit; if a checkout has moved, stop and report.

Ladders. Frontends: `format:check`, `lint`, `test`, `test:fit`. Tests repo: `typecheck`, `lint`, `format:check` —
never its `test` script. Run each to a file under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s17-auth-convergence-<repo>-<script>.log`
and read it once. Rollback is `git stash push -u` only.

## Baseline (planner, 16 September 2026, all green)

| repo | format:check | lint | test | test:fit |
|---|---|---|---|---|
| ins | clean | clean | 57 files, 521 passed | 50 passed |
| animals | clean | clean | 179 files (2 skipped), 2255 passed, 8 skipped | 445 passed |
| plants | clean | clean | 145 files (2 skipped), 1875 passed, 8 skipped | 231 passed |
| tests | typecheck clean, lint clean, format:check clean | | | |

Logs: `logs/s17-auth-convergence-baseline-<repo>-<script>.log` (script names with `:` written as `-`). A red after
this stage is this stage's.

## 0. Decisions

| # | Decision |
|---|---|
| D1 | **plants is the reference for every journey-side file.** `diff -rq plants/src/auth animals/src/auth` is empty; `src/plugins/{auth,auth.test}.js`, `src/server/auth/{index,controller,controller.test,stub-sign-in.test}.js`, `src/server/common/services/mode*.js`, `src/server/common/test-helpers/*` and `src/config/nunjucks/context/context.js` are byte-equal between animals and plants (checked by the planner). Only `stub-sign-in.js` differs between them (the secret literal) and `config.js` by its service-specific values. Every "the journeys' shape" below means plants' text. |
| D2 | **Copy verbatim, comments included.** Where a file is taken from the reference side it is copied byte-for-byte, doc comments and inline comments too — the end-state `diff -rq` is the proof and it values byte-equality over invariant 6. The one exception is text this plan rewrites explicitly (the `mode.js` and `mode.test.js` paragraphs, the `config.js` format comment). |
| D3 | **`router.js` byte-equality needs one shared export name for the service's routes plugin.** Today `routes.js` exports `importNotificationService` (ins), `highRiskPlants` (plants) and `liveAnimals` (animals), each imported only by its `router.js`. All three become `export const serviceRoutes = {…}`; the plugin `name:` strings (`'import-notification-service'`, `'high-risk-plants'`, `'live-animals'`) do not change, so `server.registrations` and plants' `routes.test.js` assertion on `'high-risk-plants'` are untouched. Nothing else imports the old names (planner grep over `src/`, docs and `.dependency-cruiser.cjs` in all three). |
| D4 | **`/signout` goes from all three, not only ins.** The journeys also carry `src/server/signout/` and register it from `router.js`; their layouts already link `/auth/sign-out`, so the route is dead there. Byte-equal `router.js` and "one sign-out URL" both need it gone. ins's public URL list loses `/signout` (declared as a behaviour change; the report refresh updates the invariant and `surfaces.json`). |
| D5 | **Stub-mode sign-out lives in `stub-sign-in.js`.** In stub mode `server.js` registers `stubSignInRoutes` instead of `authRoutes`, so `/auth/sign-out` is a 404 in the journeys today and ins reached the provider through `/signout`. The stub plugin gains a `GET /auth/sign-out` with `auth: { mode: 'try' }` that drops the cached session, clears the `sid` cookie and lands on `/`. The file name, the export name `stubSignInRoutes` and the plugin name stay as the brief names them; `server.js` is untouched in all three. |
| D6 | **The stub plugin's test registers the real `@hapi/cookie` strategy** instead of stubbing `request.cookieAuth`, because the sign-out route names a strategy (`mode: 'try'`) and Hapi refuses to register it without one. A `Map` still stands in for the session cache. The sign-in tests read the session from the Map and the cookie from `set-cookie`; the sign-out test sends the sign-in's cookie back and proves the drop and the cleared cookie. Full text in §3C. |
| D7 | **`context.js` shared part is plants' text verbatim**, including `displayName: authData.displayName \|\| authData.email \|\| 'User'`. ins reads `authData.name` today; no layout renders `userSession.displayName` or `email` (planner grep over every `.njk` in the three repos), so the visible behaviour does not change. Recorded in notes as a candidate for a later ruling (real sessions carry `name`, not `displayName`). |
| D8 | **`sessionAuth()` gets its own helper file**, `src/server/common/test-helpers/session-auth.js`, byte-equal in all three (ins's function verbatim). `mock-auth-config.js` is about config, `mock-oidc-config.js` about OIDC discovery; a `server.inject` auth builder is a third concern. ins's `real-mode.js` and `test-server.js` stay ins-only (deliberate, unchanged). |
| D9 | **Every env-backed boolean takes `'strict-boolean'`**: `log.enabled`, `isSecureContextEnabled`, `session.cookie.secure`, `defraId.signOutHostnameRewrite.enabled`, `defraId.refreshTokens`, `stubMode` (already), `auth.enabled`, `redis.useSingleInstanceCache`, `redis.useTLS`, `nunjucks.watch`, `nunjucks.noCache` — eleven keys, identical in all three. Booleans with no `env` (`isProduction`, `isDevelopment`, `isTest`, `csrf.enabled`, `csrf.cookie.secure`) keep `format: Boolean`. Every place that sets one of these today writes `true` or `false` (planner grep over `docker/stack/*`, `docker/stack/shared.env`, the four repos' `.github/`, `playwright.config.js`, `vitest.config.js`, and `cdp-app-config/services/trade-imports-{ins,plants,animals}-frontend/{dev,test}/*.env`, which set only `AUTH_ENABLED=true` and `DEFRA_ID_REFRESH_TOKENS=true`). |
| D10 | **`config.js` converges on plants' text.** ins takes plants' preamble (`const env = process.env.NODE_ENV`, the `isPlatform` comment, `csrfEnabled` after `authCookieSameSite`), `new TypeError`, plants' cookie-password `doc` and `default` (no test or compose file depends on ins's literal), and drops `env: 'LOG_REDACT'` (nothing sets it anywhere in the workspace, the compose files or `cdp-app-config`). The journeys drop `session.cache.segment` (no reader in any repo; `server.js` names its segment inline). The format comment is rewritten in all three (§2C). After the stage `diff plants/config.js ins/config.js` shows the service-specific hunks in §6 and nothing else. |
| D11 | **Q9 and Q10 land together, and the journeys gain `router.test.js`.** With `auth.enabled` off, `server.js` registers no auth plugin, so no `session` strategy exists and a route declaring `auth: 'session'` would fail to register; ins's gate is what makes the explicit strategy safe. The journeys take ins's `router.test.js` shape with two tests (`/` is 404, `/health` is 200 with auth off). Plants' `routes.test.js` keeps its other tests and swaps the "inherit the default strategy" test for ins's "name the session strategy" test; animals' `routes.test.js` becomes that one test. ins's own `routes.test.js` is unchanged. |
| D12 | **`auth/controller.test.js` is the union, in the journeys' shape**: plants' file (mockAuthConfig, `sharedEn` copy assertions, `vi.stubGlobal('fetch')`, `signInOidc` helper) plus ins's five route tests (`/auth/sign-in`, `/auth/sign-out` ×2, `/auth/sign-out-oidc` ×2) and their `expectSessionCookieCleared` helper, with `getSignOutUrl` mocked as ins does. The `fetch` stub is inert in ins and animals (neither primes at boot) and needed by plants (`countries.prime()`/`ports.prime()` in real mode); it stays for byte-equality — redesigning plants' priming is question 13. |
| D13 | **`plugins/auth.test.js` is plants' file verbatim in ins.** Its config values (`localhost:3000`, `service-123`, `policy-abc`) are mock values, not service configuration, so byte-equality costs nothing. |
| D14 | **Tests repo: the "Log out" link moves to `BasePage`, the admin's "Sign out" moves to `AdminDashboardPage`, `SignOutPage` gains `path`.** After this stage every frontend in the programme renders "Log out" at `/auth/sign-out`; the admin portal (outside the programme) still renders "Sign out" at `/signout`. So the base getter carries the majority and the admin page overrides it — the mirror image of today. `SignOutPage` keeps the provider landing (`expectedUrl`, `heading`) and now names the service path so `auth.spec.ts` pins the link's `href` before clicking. No spec typed `/signout`; nothing else changes. |
| D15 | **No new module mocks in ins; `nock` stays where it is.** The only mocks added to ins tests are the ones the journeys' byte-equal files already carry. |
| D16 | **Docs follow the code in ins only.** Four ins doc lines name `/signout` or `mock-auth.js` (§2N). The journeys' docs mention neither (planner grep). |
| D17 | **`surfaces.json` is not touched.** It still lists `src/server/signout/*` and `mock-auth.js`; the report-refresh step owns it (and s23 removes the file). |
| D18 | **Byte-equal tests use a local `HTTP_STATUS_FOUND = 302`, never `statusCodes.redirect`.** ins's `status-codes.js` names 302 `redirect`, the journeys name it `redirectFound`; s18 (Q25) settles the names. Until then the two byte-equal test files (`auth/controller.test.js`, `stub-sign-in.test.js`) carry the literal as plants' stub test already does. ins's non-shared tests keep `statusCodes.redirect`. |

## 1. Moves

| repo | from | to | note |
|---|---|---|---|
| ins | `src/server/common/test-helpers/mock-auth.js` | deleted | split into the three helpers in §3A |
| ins | `src/server/signout/index.js` | deleted | Q8 |
| ins | `src/server/signout/controller.js` | deleted | Q8 |
| ins | `src/server/signout/controller.test.js` | deleted | Q8; its stub-mode pin is replaced by `plugins/auth.test.js` ("keeps sending … to /auth/sign-in in stub mode") and the stub plugin's sign-out test |
| plants | `src/server/signout/index.js` | deleted | Q8 |
| plants | `src/server/signout/controller.js` | deleted | Q8 |
| plants | `src/server/signout/controller.test.js` | deleted | Q8 |
| animals | `src/server/signout/index.js` | deleted | Q8 |
| animals | `src/server/signout/controller.js` | deleted | Q8 |
| animals | `src/server/signout/controller.test.js` | deleted | Q8 |
| tests | — | — | none |

Use `git -C <repo> rm <file>` for every deletion (one file per call; `git rm -r <dir>` for the three `signout/`
directories is fine).

## 2. Edits

Read the reference file in full before each edit. "Copy X over Y" means: Read X, Write Y with exactly X's content.

### 2A. `src/auth/` — three files in the journeys, three in ins (Q2, Q3, Q6)

| target | action |
|---|---|
| plants `src/auth/verify-token.js`, animals same | copy ins's `src/auth/verify-token.js` over it (adds `issuer` from the OIDC document and `aud: config.get('defraId.clientId')`, `iss: issuer` to `Jwt.token.verify`; drops the two inline comments) |
| plants `src/auth/verify-token.test.js`, animals same | copy ins's over it (adds the `defraId.clientId` config line, `issuer` in the resolved OIDC config, `aud`/`iss` in the `verify` expectation) |
| ins `src/auth/get-sign-out-url.js` | copy plants' over it: the tail becomes `const signOutUrl = new URL(\`${oidcBaseUrl.origin}${basePath}/signout\`)` + `signOutUrl.searchParams.set('post_logout_redirect_uri', config.get('defraId.signOutRedirectUrl'))` + `return signOutUrl.toString()` |
| ins `src/auth/get-sign-out-url.test.js` | copy plants' over it (the `configWith` helper, `SIGN_OUT_REDIRECT_URL`, `REDIRECT_QUERY`) |
| ins `src/auth/get-safe-redirect.js` | lines 16–17: `'http://placeholder'` → `'https://placeholder'` in both the `new URL(redirect, …)` base and the `resolved.origin !==` check |

`diff -rq` over `src/auth` between any two repos must then be empty.

### 2B. `src/plugins/auth.js` and `auth.test.js` — ins takes plants' (stub sign-in shape, Q6 neighbour)

Copy plants' `src/plugins/auth.js` over ins's. The only hunk is `redirectTo`, which becomes

```js
    redirectTo: function (request) {
      const target = `${request.url.pathname}${request.url.search}`
      return `/auth/sign-in?redirect=${encodeURIComponent(target)}`
    },
```

with the stub-mode branch and its three-line comment gone. Copy plants' `src/plugins/auth.test.js` over ins's
(D13): ins loses "redirectTo sends unauthenticated requests to /auth/stub-sign-in in stub mode" and gains
"redirectTo keeps sending unauthenticated requests to /auth/sign-in in stub mode", and the register test gains
`expect(isStubModeMock).toHaveBeenCalled()`.

### 2C. `src/config/config.js` — all three (Q6, Q7, D9, D10)

Work order: first make ins's file plants' text with ins's service values, then apply the shared edits to all three.

**ins only.** Copy plants' `config.js` over ins's, then restore ins's service-specific values:

- `port.default` → `3002`
- `serviceName.default` → `'trade-imports-ins-frontend'`
- `defraId.serviceId.default` → `'trade-imports-ins-frontend'`
- `defraId.redirectUrl.default` → `'http://localhost:3002/auth/sign-in-oidc'`
- `defraId.signOutRedirectUrl.default` → `'http://localhost:3002/auth/sign-out-oidc'`
- `redis.keyPrefix.default` → `'trade-imports-ins-frontend:'`
- replace the `tradeImportsPlantsBackendApi` block with ins's `tradeImportsAddressBookApi` block (doc `'Trade Imports Address Book API base URL'`, default `'http://localhost:8089'`, env `'TRADE_IMPORTS_ADDRESS_BOOK_URL'`); keep `tradeImportsReferenceDataApi` (identical in all three); after it add ins's `tradeImportsInsBackendApi` and `tradeImportsAnimalsFrontend` blocks exactly as they are in ins today (read ins's current file for their text before overwriting it).

Do **not** restore `env: 'LOG_REDACT'`, ins's cookie-password `doc`/`default`, `new Error`, or the old preamble.

**All three.** Then:

1. Replace the five-line comment above `convict.addFormat({ name: 'strict-boolean' …` with exactly:

```js
// convict's built-in Boolean format coerces any string other than exactly
// 'false' to true (e.g. a typo like 'flase' silently enables the flag), so
// every env-backed boolean uses this stricter format instead - it only
// accepts an actual boolean, or the literal strings 'true'/'false' from an
// env var, and fails config.validate() on anything else.
```

2. Change `format: Boolean` to `format: 'strict-boolean'` on exactly these keys (each has an `env`): `log.enabled`
   (`LOG_ENABLED`), `isSecureContextEnabled` (`ENABLE_SECURE_CONTEXT`), `session.cookie.secure`
   (`SESSION_COOKIE_SECURE`), `defraId.signOutHostnameRewrite.enabled` (`DEFRA_ID_SIGN_OUT_HOSTNAME_REWRITE_ENABLED`),
   `defraId.refreshTokens` (`DEFRA_ID_REFRESH_TOKENS`), `auth.enabled` (`AUTH_ENABLED`),
   `redis.useSingleInstanceCache` (`USE_SINGLE_INSTANCE_CACHE`), `redis.useTLS` (`REDIS_TLS`), `nunjucks.watch`
   (`NUNJUCKS_WATCH`), `nunjucks.noCache` (`NUNJUCKS_NO_CACHE`). `stubMode` already has it. Leave `isProduction`,
   `isDevelopment`, `isTest`, `csrf.enabled` and `csrf.cookie.secure` on `Boolean`.

3. Remove the `session.cache.segment` key (the five lines `segment: { doc: 'The cache segment.', format: String,
   default: 'session' }` and the comma before them) — in plants and animals; ins never had it.

### 2D. `src/config/config.test.js` — all three (Q7)

Keep each file's existing tests (ins keeps its port/URL tests; the `stubMode` describe stays as it is in all
three). Append this block inside `describe('#config')`, after the `stubMode` describe, identical in all three:

```js
  describe('env-backed booleans', () => {
    const STRICT_BOOLEAN_ENV_VARS = [
      'LOG_ENABLED',
      'ENABLE_SECURE_CONTEXT',
      'SESSION_COOKIE_SECURE',
      'DEFRA_ID_SIGN_OUT_HOSTNAME_REWRITE_ENABLED',
      'DEFRA_ID_REFRESH_TOKENS',
      'STUB_MODE',
      'AUTH_ENABLED',
      'USE_SINGLE_INSTANCE_CACHE',
      'REDIS_TLS',
      'NUNJUCKS_WATCH',
      'NUNJUCKS_NO_CACHE'
    ]

    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    test.each(STRICT_BOOLEAN_ENV_VARS)(
      "refuses %s when it is not 'true' or 'false'",
      async (envVar) => {
        vi.stubEnv(envVar, 'flase')

        await expect(import('./config.js')).rejects.toThrow(
          "must be 'true' or 'false'"
        )
      }
    )

    test('reads AUTH_ENABLED=false as false', async () => {
      vi.stubEnv('AUTH_ENABLED', 'false')

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('auth.enabled')).toBe(false)
    })
  })
```

The `STUB_MODE` row duplicates the existing `stubMode` typo test on purpose: the table is the one place that lists
every flag. `vi.stubEnv`/`vi.unstubAllEnvs` are already the pattern in `get-sign-out-url.test.js`.

### 2E. `src/server/router.js` — all three, byte-equal (Q8, Q9, D3)

Write this exact content in all three:

```js
import inert from '@hapi/inert'

import { health } from './health/index.js'
import { serviceRoutes } from './app/routes.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      await server.register([health])

      if (config.get('auth.enabled')) {
        await server.register([serviceRoutes])
      }

      await server.register([serveStaticFiles])
    }
  }
}
```

In `src/server/app/routes.js`: ins `export const importNotificationService = {` → `export const serviceRoutes = {`;
plants `export const highRiskPlants = {` → `export const serviceRoutes = {`; animals `export const liveAnimals = {` →
`export const serviceRoutes = {`. Nothing else in those files changes.

### 2F. `src/server/app/shared/kit.js` — plants and animals (Q10)

Line 15 `export const routeOptions = {}` → `export const routeOptions = { auth: 'session' }`. Nothing else. ins
already has it.

### 2G. `src/server/app/routes.test.js` — plants and animals (Q10)

Plants: replace the test `'Should leave every promoted route to inherit the server default strategy'` (the `for`
loop asserting `not.toHaveProperty('auth')`) with

```js
  it('Should name the session strategy on every promoted route', () => {
    expect(allRoutes).not.toHaveLength(0)

    for (const route of allRoutes) {
      expect(route.options).toMatchObject({ auth: 'session' })
    }
  })
```

and leave every other test in the file alone. Animals: the whole file becomes

```js
import { describe, expect, it } from 'vitest'

import { allRoutes } from './sets/live-animals/journeys/linear/features/index.js'

describe('promoted live-animals route authentication', () => {
  it('Should name the session strategy on every promoted route', () => {
    expect(allRoutes).not.toHaveLength(0)

    for (const route of allRoutes) {
      expect(route.options).toMatchObject({ auth: 'session' })
    }
  })
})
```

Every promoted route in both journeys already carries `kit.routeOptions` (directly or spread — planner grep); no
controller changes.

### 2H. `src/config/nunjucks/context/context.js` — ins (Q11)

Rewrite so that the shared part is plants' text verbatim and ins keeps its own imports, `activeNavigationItem`,
`dashboardUrl`, `addressBookUrl` and `crumb`. The full target file:

```js
import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '../../config.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'
import {
  addressBookPath,
  dashboardPath,
  inAddressBookSection,
  inDashboardSection
} from '../../../server/app/shared/paths.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

let webpackManifest

/**
 * Which service-navigation item the current request sits under, so the layout
 * can mark it active. Section-wide, not page-wide: every address-book page is
 * inside the address book's section of the service, which is why the answer
 * for `/address-book/123/edit` is still `addressBook`.
 *
 * @param {string} [requestPath] - the request path.
 * @returns {string|null} the id of the active navigation item, or null when the
 * request is under none of them.
 */
export function activeNavigationItem(requestPath = '') {
  if (inDashboardSection(requestPath)) {
    return 'dashboard'
  }
  if (inAddressBookSection(requestPath)) {
    return 'addressBook'
  }
  return null
}

async function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    }
  }

  // If the user is authenticated, add the user's details to the view context
  // This allows the view to display the user's session details and the ability to conditionally render content
  const sessionId = request.auth?.credentials?.sessionId
  const authData = sessionId
    ? await request.server.app.cache.get(sessionId)
    : null

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    authEnabled: config.get('auth.enabled'),
    activeNavigationItem: activeNavigationItem(request.path),
    dashboardUrl: dashboardPath(),
    addressBookUrl: addressBookPath(),
    userSession: authData
      ? {
          isAuthenticated: true,
          displayName: authData.displayName || authData.email || 'User',
          email: authData.email
        }
      : {
          isAuthenticated: false
        },
    getAssetPath(asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
    },
    crumb: request.plugins?.crumb ?? request.state?.crumb ?? ''
  }
}

export { context }
```

`nunjucks.js` passes `context` to Vision unchanged; Vision awaits a promise-returning context, as the journeys
already rely on. Plants and animals `context.js` do not change.

### 2I. `src/config/nunjucks/context/context.test.js` — ins (Q11)

Rewrite in plants' shape (Read plants' file first). Concretely, plants' file with these substitutions and nothing
else: (a) declare `const expectedContext = { assetPath: '/public/assets', getAssetPath: expect.any(Function),
serviceName: 'trade-imports-ins-frontend', serviceUrl: '/', authEnabled: true, activeNavigationItem: 'dashboard',
dashboardUrl: '/', addressBookUrl: '/address-book', userSession: { isAuthenticated: false }, crumb: '' }` after the
two `vi.mock` calls and use it in both `'Should provide expected context'` tests (plants inlines the object twice;
ins names it once); (b) drop ins's current `vi.mock(import('../../config.js') …)` block — plants mocks no config;
(c) the `#activeNavigationItem` describe carries ins's six cases from the current file (`/` → `'dashboard'`,
`/address-book` → `'addressBook'`, `/address-book/abc-123/edit` → `'addressBook'`, `/address-bookkeeping` → null,
`/auth/sign-out` → null, `undefined` → null); (d) keep plants' `'Should mark no navigation item outside the dashboard
section'`, `'Should describe the signed-in user from their session'` (cache read with `session-1`, displayName from
email), `'Should not look up a session for a sign-in callback that has no session id yet'` and the closing
`'When auth.enabled is set to false'` describe. Every `context(...)` call is awaited, as in plants.

### 2J. `src/server/auth/controller.js` — ins (Q4)

Line 38: `{ profile },` → `{ crn: profile.crn },`. The file is then byte-equal with plants' (planner diff: this
was the only hunk).

### 2K. `src/server/auth/controller.test.js` — all three, byte-equal (Q24, D12)

Write this exact content in all three:

```js
import { vi } from 'vitest'
import { createServer } from '../server.js'
import { config } from '../../config/config.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../common/test-helpers/session-auth.js'
import { verifyToken } from '../../auth/verify-token.js'
import { getPermissions } from '../../auth/get-permissions.js'
import { copy as sharedEn } from '../app/shared/copy.en.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

vi.mock('../../auth/get-sign-out-url.js', () => ({
  getSignOutUrl: vi.fn().mockResolvedValue('/signed-out')
}))

vi.mock('../../auth/verify-token.js', () => ({
  verifyToken: vi.fn()
}))

vi.mock('../../auth/get-permissions.js', () => ({
  getPermissions: vi.fn()
}))

const HTTP_STATUS_FOUND = 302
const MOCK_TOKEN = 'mock-token'

const defraIdAuth = (profileOverrides = {}) => ({
  strategy: 'defra-id',
  credentials: {
    profile: {
      sessionId: 'signin-oidc-session',
      crn: 'CRN123',
      organisationId: 'org-1',
      ...profileOverrides
    },
    token: MOCK_TOKEN,
    refreshToken: 'mock-refresh-token'
  }
})

const expectSessionCookieCleared = (headers) => {
  const setCookie = headers['set-cookie'] ?? []
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  expect(cookies.join('\n')).toContain('sid=')
}

describe('#authController', () => {
  const originalMode = config.get('stubMode')
  let server

  const signInOidc = (profileOverrides) =>
    server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc',
      auth: defraIdAuth(profileOverrides)
    })

  beforeAll(async () => {
    config.set('stubMode', false)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [] }))
    )
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.unstubAllGlobals()
    config.set('stubMode', originalMode)
  })

  test('GET /auth/sign-in redirects to home', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-in',
      auth: {
        strategy: 'defra-id',
        credentials: {}
      }
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out redirects unauthenticated users to home', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out'
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out drops the session and redirects authenticated users to the sign-out URL', async () => {
    const sessionId = 'signout-authenticated'
    await server.app.cache.set(sessionId, { sessionId, token: MOCK_TOKEN })

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      auth: sessionAuth(sessionId)
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/signed-out')
    expect(await server.app.cache.get(sessionId)).toBeNull()
    expectSessionCookieCleared(headers)
  })

  test('GET /auth/sign-out-oidc redirects unauthenticated users to home', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out-oidc'
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out-oidc clears authenticated session and redirects', async () => {
    const sessionId = 'signout-oidc-authenticated'
    await server.app.cache.set(sessionId, { sessionId, token: MOCK_TOKEN })

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out-oidc',
      auth: sessionAuth(sessionId)
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/signed-out')
    expect(await server.app.cache.get(sessionId)).toBeNull()
    expectSessionCookieCleared(headers)
  })

  test('GET /auth/sign-in-oidc renders unauthorised when organisationId is missing', async () => {
    const { statusCode, payload, headers } = await signInOidc({
      organisationId: null
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(payload).toContain(sharedEn.unauthorised.heading)
    expect(headers['set-cookie'] ?? []).not.toContainEqual(
      expect.stringContaining('sid=')
    )
    expect(verifyToken).not.toHaveBeenCalled()
    expect(getPermissions).not.toHaveBeenCalled()
  })

  test('GET /auth/sign-in-oidc renders unauthorised when token verification fails', async () => {
    verifyToken.mockRejectedValue(new Error('Client request timeout'))

    const { statusCode, payload, headers } = await signInOidc()

    expect(statusCode).toBe(statusCodes.ok)
    expect(payload).toContain(sharedEn.unauthorised.heading)
    expect(payload).toContain(
      `${sharedEn.unauthorised.title} | ${sharedEn.layout.serviceName}`
    )
    expect(headers['set-cookie'] ?? []).not.toContainEqual(
      expect.stringContaining('sid=')
    )
    expect(getPermissions).not.toHaveBeenCalled()
  })

  test('GET /auth/sign-in-oidc renders unauthorised when getPermissions fails', async () => {
    verifyToken.mockResolvedValue(undefined)
    getPermissions.mockRejectedValue(new Error('Permissions API unavailable'))

    const { statusCode, payload, headers } = await signInOidc()

    expect(statusCode).toBe(statusCodes.ok)
    expect(payload).toContain(sharedEn.unauthorised.heading)
    expect(headers['set-cookie'] ?? []).not.toContainEqual(
      expect.stringContaining('sid=')
    )
    expect(verifyToken).toHaveBeenCalledWith(MOCK_TOKEN)
    expect(getPermissions).toHaveBeenCalledWith('CRN123', 'org-1', MOCK_TOKEN)
  })
})
```

`sharedEn.unauthorised.{heading,title}`, `sharedEn.layout.serviceName`, `statusCodes.ok` and
`statusCodes.notFound` exist in all three (planner checked). The 302 is a local constant because `status-codes.js`
names it `redirect` in ins and `redirectFound` in the journeys until s18 (D18). `vitest.config.js` sets
`clearMocks: true` in all three, so no `beforeEach` is needed.

### 2L. `src/server/auth/stub-sign-in.js` — all three, byte-equal (stub sign-in shape, D5)

Write this exact content in all three (plants' text plus ins's secret and comment, plus the sign-out route):

```js
import crypto from 'node:crypto'

import Jwt from '@hapi/jwt'

import { getSafeRedirect } from '../../auth/get-safe-redirect.js'

// Generated once per process rather than hardcoded - this token is only ever
// decoded (never verified against a known key) by the session validator, so
// the secret has no real security value, but a random one avoids committing
// a static credential-shaped string to source.
const STUB_TOKEN_SECRET = crypto.randomBytes(32).toString('hex')
const HOURS_IN_STUB_SESSION = 4
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const STUB_SESSION_TTL_SECONDS =
  HOURS_IN_STUB_SESSION * MINUTES_PER_HOUR * SECONDS_PER_MINUTE
const MS_PER_SECOND = 1000

const DEFAULT_STUB_USER = {
  crn: 'STUB0001',
  contactId: 2100010101,
  name: 'Stub User',
  email: 'stub.user@example.com',
  organisationId: 'stub-org-1'
}

function buildStubToken(sessionId) {
  const nowSeconds = Math.floor(Date.now() / MS_PER_SECOND)
  return Jwt.token.generate(
    { sessionId, exp: nowSeconds + STUB_SESSION_TTL_SECONDS },
    STUB_TOKEN_SECRET
  )
}

const signIn = async (request, h) => {
  const sessionId = crypto.randomUUID()
  const token = buildStubToken(sessionId)
  const organisationId =
    request.query.organisationId ?? DEFAULT_STUB_USER.organisationId

  await request.server.app.cache.set(sessionId, {
    isAuthenticated: true,
    sessionId,
    crn: DEFAULT_STUB_USER.crn,
    contactId: DEFAULT_STUB_USER.contactId,
    name: DEFAULT_STUB_USER.name,
    email: DEFAULT_STUB_USER.email,
    // Real Defra ID maps organisationId from currentRelationshipId; both
    // are read downstream (organisationIdOf / buildActor).
    organisationId,
    currentRelationshipId: organisationId,
    role: 'Farmer',
    scope: ['user'],
    token,
    refreshToken: 'stub-refresh-token'
  })

  request.cookieAuth.set({ sessionId })

  // Sanitised for the same reason the real handlers sanitise it: this route is
  // unauthenticated and `redirect` comes off the query string, so an absolute
  // URL would make sign-in a redirector to anywhere. The cookie strategy sends
  // people here with a relative path, which survives unchanged.
  return h.redirect(getSafeRedirect(request.query.redirect))
}

/** The stub counterpart of the real sign-out: there is no identity provider
 * to send the browser to, so the session is dropped here and the caller lands
 * on the root. `mode: 'try'` so a caller with no session lands there too. */
const signOut = async (request, h) => {
  if (request.auth.credentials?.sessionId) {
    await request.server.app.cache.drop(request.auth.credentials.sessionId)
  }
  request.cookieAuth.clear()
  return h.redirect('/')
}

/** Both paths mint the same stub session.
 *
 * `/auth/sign-in` is registered as well as the explicit stub path because it is
 * what the rest of the service already points at — the session cookie's
 * `redirectTo` (plugins/auth.js) and the "try again" link on unauthorised.njk —
 * and in stub mode the real route that would serve it is not registered at all
 * (server.js swaps authRoutes for this plugin), so an unauthenticated request
 * would otherwise be redirected to a 404 instead of being signed in. */
const SIGN_IN_PATHS = ['/auth/stub-sign-in', '/auth/sign-in']
const SIGN_OUT_PATH = '/auth/sign-out'

/**
 * Replaces the real Defra ID OIDC round-trip when stub mode is on
 * (see mode.js / plugins/auth.js). Auth is still enforced everywhere else -
 * this only produces the same end state the real sign-in-oidc handler does
 * (cached session + session cookie), signed locally rather than verified
 * against a real identity provider, and ends it at the same sign-out path the
 * layout links.
 */
export const stubSignInRoutes = {
  plugin: {
    name: 'stub-sign-in-routes',
    register(server) {
      server.route([
        ...SIGN_IN_PATHS.map((path) => ({
          method: 'GET',
          path,
          options: { auth: false },
          handler: signIn
        })),
        {
          method: 'GET',
          path: SIGN_OUT_PATH,
          options: { auth: { mode: 'try' } },
          handler: signOut
        }
      ])
    }
  }
}
```

`crypto.randomUUID()` now resolves through the import rather than the global; same API.

### 2M. `src/server/common/services/mode.js` and `mode.test.js` — all three (stub sign-in shape)

`mode.js`: replace the second paragraph of the doc comment (the four lines from `* Never honoured in production`
to `* authenticated session. */`) with exactly:

```js
 * Never honoured in production, whatever the environment says. Stub mode hands
 * a session to any unauthenticated caller with no identity provider involved,
 * so obeying the flag in production would let anyone able to set an
 * environment variable sign in as the stub user. */
```

`mode.test.js`: replace the five comment lines inside `'Should be off in production even when the flag is set'`
(from `// The reason this helper exists` to `// serve stub data in place of the real address book and backend.`)
with exactly:

```js
    // The reason this helper exists rather than reading the flag directly.
    // Stub mode hands a session to any unauthenticated caller with no identity
    // provider involved, so honouring the flag in production would mean anyone
    // able to set an environment variable could sign in as the stub user. It
    // would also serve stub data in place of the real address book and backend.
```

Nothing else in either file changes; both must be byte-equal across the three afterwards.

### 2N. Q8 — the sign-out URL in ins

- `src/server/app/shared/layout.njk` line 13: `{% set signOutUrl = "/signout" %}` → `{% set signOutUrl = "/auth/sign-out" %}`.
- `src/server/app/shared/layout.test.js`: the two `'/signout'` literals (the href list in the first service-navigation test and `expect(html).not.toContain('href="/signout"')`) → `'/auth/sign-out'` and `'href="/auth/sign-out"'`.
- `README.md` line 22: `plus `/auth/*`, `/signout` and `/health`` → `plus `/auth/*` and `/health``.
- `src/server/app/docs/README.md` lines 25–26: replace the sentence `The chassis adds routes of its own outside this list: `/health`, `/auth/*` (or `/auth/stub-sign-in` in stub mode), `/signout` and `/public/*`.` with `The chassis adds routes of its own outside this list: `/health`, `/auth/*` and `/public/*`. In stub mode `/auth/*` is `/auth/sign-in`, `/auth/stub-sign-in` and `/auth/sign-out`, served by the stub plugin without an identity provider.` Re-flow the paragraph to the file's line width.
- `src/server/app/docs/architecture.md`: lines 13–19 become `Bell. Then — only when `auth.enabled` — it registers the auth plugin and, beside it, one routes plugin: the Defra ID `/auth/*` routes in [`src/server/auth/index.js`](../../auth/index.js), or the stub routes in [`stub-sign-in.js`](../../auth/stub-sign-in.js) when `isStubMode()` — the same `/auth/sign-in` and `/auth/sign-out` paths, with no identity provider involved. Last comes [`router.js`](../../router.js), which registers `health`, then — only when `auth.enabled` — the application plugin, then static files.` (re-flowed); line 34 becomes `- `src/server/auth/` and `src/server/health/` — the routes those helpers serve.`
- `src/server/app/docs/testing.md` lines 30–33: the helper list becomes `[`common/test-helpers/`](../../common/test-helpers/): `real-mode.js` (`runInRealMode()`, `refuseOutboundHttp()`, `addressBookApi()`, `referenceDataApi()`, `insBackendApi()`, `serveCountries(list)`), `session-auth.js` (`sessionAuth(sessionId, overrides)`), `mock-oidc-config.js` (`mockOidcConfig`), `mock-auth-config.js` (`mockAuthConfig(importOriginal)`), `test-server.js`.` (re-flowed).

The journeys' layouts, layout tests and docs already say `/auth/sign-out` and never mention `/signout`.

### 2O. Q24 — ins test imports

After §3A exists, rewrite every import of `../…/test-helpers/mock-auth.js` in ins. `sessionAuth` comes from
`session-auth.js`, `mockOidcConfig` from `mock-oidc-config.js`; a file importing both gets two import lines. The
fourteen files (all under `src/`): `plugins/csrf.test.js` (both), `server/app/features/dashboard/controller.test.js`
(both), `server/app/features/address-book/{add,edit,list,view,delete}/controller.test.js` (both, five files),
`server/auth/controller.test.js` (rewritten in §2K), `server/health/controller.test.js` (`mockOidcConfig`),
`server/common/helpers/serve-static-files.test.js` (`mockOidcConfig`),
`server/common/helpers/content-security-policy.test.js` (both), `server/common/helpers/errors.test.js`
(`mockOidcConfig`), `server/common/helpers/start-server.test.js` (`mockOidcConfig`);
`server/signout/controller.test.js` is deleted. Relative depth stays what it is per file. Import order within a
file: keep the `mock-oidc-config.js` line where the `mock-auth.js` line was and add `session-auth.js` directly
after it.

### 2P. Tests repo (Q8, D14)

- `page-objects/base/base-page.ts`: `linkSignOut` becomes the frontends' link — `return this.page.getByRole('link', { name: 'Log out', exact: true });` — with this doc comment above it: `/** The three frontends sign out from their service navigation, where the item reads "Log out" and points at /auth/sign-out. `exact` keeps the match off any other link whose name merely contains "log out". */` (re-flowed as the file's other comments are).
- `page-objects/notification/notification-dashboard-page.ts`: delete the `linkSignOut` override and its doc comment (lines 14–21).
- `page-objects/admin/admin-dashboard-page.ts`: add, after `heading`, `get linkSignOut(): Locator { return this.page.getByRole('link', { name: 'Sign out' }); }` with the comment `/** The admin portal still renders "Sign out" in its own header, outside the frontends' shared shape. */`.
- `page-objects/auth/sign-out-page.ts`: add `readonly path = '/auth/sign-out';` above `expectedUrl`, and a class doc comment: `/** Signing out of a frontend. The service drops its session at `path` and sends the browser to the identity provider, whose signed-out page is where `expectedUrl` and `heading` land. */`.
- `page-objects/factory.ts`: no change (`signOut: new SignOutPage(page)` stays).
- `tests/e2e/features/auth.spec.ts`: in `'allows signing out after signing in'`, before the click, add `await expect(pages.notificationDashboard.linkSignOut).toHaveAttribute('href', pages.signOut.path);`. No other spec changes; `admin-auth.spec.ts` keeps `pages.adminDashboard.linkSignOut` and now resolves it on `AdminDashboardPage`.

Format with `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run format` before
`format:check`.

## 3. New files

### 3A. Test helpers in ins (Q24)

- `src/server/common/test-helpers/mock-auth-config.js` — copy plants' file verbatim.
- `src/server/common/test-helpers/mock-oidc-config.js` — copy plants' file verbatim.

### 3B. `src/server/common/test-helpers/session-auth.js` — all three, byte-equal (D8)

```js
/**
 * @returns {import('@hapi/hapi').ServerInjectOptions['auth']}
 */
export function sessionAuth(sessionId, overrides = {}) {
  return {
    strategy: 'session',
    credentials: {
      sessionId,
      organisationId: '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88',
      name: 'Test User',
      email: 'test@example.com',
      token: 'mock-token',
      ...overrides
    }
  }
}
```

### 3C. `src/server/auth/stub-sign-in.test.js` — all three, byte-equal (D6; new in ins, rewritten in the journeys)

```js
import { describe, expect, test } from 'vitest'
import Cookie from '@hapi/cookie'
import Hapi from '@hapi/hapi'
import { stubSignInRoutes } from './stub-sign-in.js'

const HTTP_STATUS_FOUND = 302
const COOKIE_PASSWORD = 'stub-sign-in-test-cookie-password-32-chars-long'

/** The plugin needs two things the real server provides: a session cache to
 * write into and drop from, and the cookie strategy that decorates
 * `request.cookieAuth` and reads a session back from the cookie. A Map stands
 * in for the cache; the strategy is the real one, validating against that Map,
 * so a sign-in's cookie signs the next request in and a sign-out clears it. */
const buildServer = async () => {
  const server = Hapi.server()
  const cached = new Map()

  server.app.cache = {
    set: async (key, value) => cached.set(key, value),
    get: async (key) => cached.get(key) ?? null,
    drop: async (key) => cached.delete(key)
  }
  await server.register(Cookie)
  server.auth.strategy('session', 'cookie', {
    cookie: { password: COOKIE_PASSWORD, isSecure: false },
    validate: async (_request, session) => {
      const userSession = cached.get(session.sessionId)
      return userSession
        ? { isValid: true, credentials: userSession }
        : { isValid: false }
    }
  })
  server.auth.default('session')
  await server.register(stubSignInRoutes)
  return { server, cached }
}

const sessionCookieOf = (response) => {
  const setCookie = response.headers['set-cookie'] ?? []
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  return cookies.find((cookie) => cookie.startsWith('sid=')).split(';')[0]
}

const onlySession = (cached) => [...cached.values()][0]

describe('stub sign-in', () => {
  test.each(['/auth/stub-sign-in', '/auth/sign-in'])(
    'Should mint a session at %s',
    async (path) => {
      // Both paths sign the caller in. /auth/sign-in matters because it is where
      // the session cookie and the unauthorised page already send people, and in
      // stub mode the real route that would serve it is not registered.
      const { server, cached } = await buildServer()

      const response = await server.inject({ method: 'GET', url: path })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(sessionCookieOf(response)).not.toBe('sid=')
      expect(cached.size).toBe(1)
      const session = onlySession(cached)
      expect(session.isAuthenticated).toBe(true)
      expect(session.contactId).toBe(2100010101)
      expect(session.organisationId).toBe('stub-org-1')
      // Real Defra ID carries both keys and different readers use each.
      expect(session.currentRelationshipId).toBe('stub-org-1')
    }
  )

  test('Should take the organisation from the query when one is given', async () => {
    const { server, cached } = await buildServer()

    await server.inject({
      method: 'GET',
      url: '/auth/stub-sign-in?organisationId=5900002'
    })

    const session = onlySession(cached)
    expect(session.organisationId).toBe('5900002')
    expect(session.currentRelationshipId).toBe('5900002')
  })

  /** Where sign-in sends the caller afterwards. The route is unauthenticated and
   * `redirect` is attacker-supplied, so only a relative path is honoured — the
   * shape the session cookie's own redirectTo produces. An absolute URL would
   * turn sign-in into an open redirector, so it falls back to the root, as does
   * a request that names no destination at all. */
  test.each([
    {
      case: 'returns to the page the caller was sent here from',
      url: '/auth/sign-in?redirect=%2Fdashboard%3Fpage%3D2',
      location: '/dashboard?page=2'
    },
    {
      case: 'refuses to redirect off-site',
      url: '/auth/stub-sign-in?redirect=https%3A%2F%2Fevil.example.com%2Fharvest',
      location: '/'
    },
    {
      case: 'redirects to the root when no destination is given',
      url: '/auth/stub-sign-in',
      location: '/'
    }
  ])('Should $case', async ({ url, location }) => {
    const { server } = await buildServer()

    const response = await server.inject({ method: 'GET', url })

    expect(response.headers.location).toBe(location)
  })
})

describe('stub sign-out', () => {
  test('Should drop the session, clear the cookie and land on the root', async () => {
    const { server, cached } = await buildServer()
    const signedIn = await server.inject({ method: 'GET', url: '/auth/sign-in' })

    const response = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      headers: { cookie: sessionCookieOf(signedIn) }
    })

    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
    expect(response.headers.location).toBe('/')
    expect(cached.size).toBe(0)
    expect(sessionCookieOf(response)).toBe('sid=')
  })

  test('Should land a caller with no session on the root', async () => {
    const { server, cached } = await buildServer()

    const response = await server.inject({ method: 'GET', url: '/auth/sign-out' })

    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
    expect(response.headers.location).toBe('/')
    expect(cached.size).toBe(0)
  })
})
```

`@hapi/cookie` is a dependency in all three. The cleared cookie is `sid=; Max-Age=0; …`, so `sessionCookieOf`
returns `'sid='` for it and a sealed value for a fresh one. Run `format` after writing — Prettier will re-wrap the
two long `server.inject` lines.

### 3D. `src/server/router.test.js` — plants and animals (D11)

```js
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { createServer } from './server.js'
import { config } from '../config/config.js'
import { statusCodes } from './common/constants/status-codes.js'

describe('#router auth gating', () => {
  let server

  beforeAll(async () => {
    config.set('auth.enabled', false)
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    config.set('auth.enabled', true)
    await server.stop({ timeout: 0 })
  })

  test('the dashboard is not registered when auth is disabled', async () => {
    const { statusCode } = await server.inject({ method: 'GET', url: '/' })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('health remains available when auth is disabled', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(statusCode).toBe(statusCodes.ok)
  })
})
```

ins keeps its existing `router.test.js` (it also proves `/address-book`).

## 4. Imports

- `mock-auth.js` → `mock-oidc-config.js` / `session-auth.js` in ins as §2O lists; no other import path moves.
- `router.js` imports `{ serviceRoutes } from './app/routes.js'` in all three; nothing else imports the routes plugin.
- `stub-sign-in.js` adds `import crypto from 'node:crypto'` in the journeys (ins already has it).
- The stub plugin's test adds `import Cookie from '@hapi/cookie'` and `import Hapi from '@hapi/hapi'`.
- Deleting `signout/` removes its import from `router.js`; nothing else imported it (planner grep).
- Relative-import rule unchanged: no `#/` alias, paths relative to the importing file.

## 5. Tests

| test | repos | moves / changes / new | what it pins |
|---|---|---|---|
| `src/auth/verify-token.test.js` | animals, plants | changes (ins's copy) | `aud` and `iss` are checked with the signature |
| `src/auth/get-sign-out-url.test.js` | ins | changes (plants' copy) | `post_logout_redirect_uri` on every sign-out URL |
| `src/plugins/auth.test.js` | ins | changes (plants' copy) | `redirectTo` is `/auth/sign-in?redirect=…` in both modes |
| `src/config/config.test.js` | all three | changes (§2D block) | a typo in any of the eleven env-backed booleans fails boot; `'false'` from the environment is read as `false` |
| `src/server/app/routes.test.js` | plants (one test), animals (file) | changes | every promoted route names `auth: 'session'` |
| `src/server/router.test.js` | plants, animals | new | with auth off, `/` is 404 and `/health` 200 |
| `src/config/nunjucks/context/context.test.js` | ins | rewritten in plants' shape | the session is read from `server.app.cache` per render; no lookup on the sign-in callback; ins's navigation items; `auth.enabled=false` |
| `src/server/auth/controller.test.js` | all three | rewritten, byte-equal | sign-in redirect; sign-out drops the session and clears the cookie in real mode; the three unauthorised sign-in-oidc cases through the copy module |
| `src/server/auth/stub-sign-in.test.js` | ins (new), plants, animals (rewritten) | byte-equal | both sign-in paths mint a session with `contactId`/`currentRelationshipId`; organisation from the query; safe redirect; stub sign-out drops the session, clears the cookie, lands on `/` |
| `src/server/common/services/mode.test.js` | all three | comment only | unchanged behaviour |
| `src/server/app/shared/layout.test.js` | ins | two literals | the Log out item links `/auth/sign-out` |
| `src/server/signout/controller.test.js` | all three | deleted | — |
| fourteen ins tests | ins | import lines only | — |
| `tests/e2e/features/auth.spec.ts` | tests | one assertion added | the Log out link's `href` is `/auth/sign-out` |

## 6. Invariants to prove

Run each check; quote the outputs in the stage notes.

1. **Byte-equality** (the brief's end state) — each must print nothing:
   - `diff -rq ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/auth ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/auth`
   - the same with animals in place of ins
   - `diff ~/…/plants/src/plugins/auth.js ~/…/ins/src/plugins/auth.js`, and `auth.test.js`, for both ins and animals
   - `diff -rq ~/…/plants/src/server/auth ~/…/ins/src/server/auth` and the same for animals (`index.js`, `controller.js`, `controller.test.js`, `stub-sign-in.js`, `stub-sign-in.test.js`)
   - `diff ~/…/plants/src/server/router.js ~/…/ins/src/server/router.js`, and for animals
   - `diff -rq ~/…/plants/src/server/common/services ~/…/ins/src/server/common/services`, and for animals
   - `diff ~/…/plants/src/server/common/test-helpers/mock-auth-config.js ~/…/ins/src/server/common/test-helpers/mock-auth-config.js`, likewise `mock-oidc-config.js` and `session-auth.js`, for both ins and animals (a `diff -rq` of the directories will also list ins-only `real-mode.js` and `test-server.js` — expected, deliberate)
2. **`config.js` residual** — `diff ~/…/plants/src/config/config.js ~/…/ins/src/config/config.js` shows exactly these hunks and nothing else: `default: 3003,`→`3002`; `default: 'Plants'`→`'trade-imports-ins-frontend'`; `default: 'trade-imports-plants-frontend',`→`'trade-imports-ins-frontend',`; the two `localhost:3003`→`3002` redirect URLs; `'trade-imports-plants-frontend:'`→`'trade-imports-ins-frontend:'`; the `tradeImportsPlantsBackendApi` block→`tradeImportsAddressBookApi` block; the added `tradeImportsInsBackendApi` and `tradeImportsAnimalsFrontend` blocks. `diff plants animals` shows the nine value hunks it shows today (port, name, serviceId, two URLs, prefix, backend block) and nothing else. List every residual line in the notes.
3. **`context.js` shared part** — `diff ~/…/plants/src/config/nunjucks/context/context.js ~/…/ins/src/config/nunjucks/context/context.js` shows only: the `paths.js` import list, the `activeNavigationItem` doc and body, the two `dashboardUrl`/`addressBookUrl` lines, the `crumb` line, and plants' `staleActionRejected` line.
4. **No `/signout` anywhere** — `grep -rn "signout" <repo>/src` in each frontend must match only `get-sign-out-url.js`, `get-sign-out-url.test.js`, `server/auth/index.js` (`signout`/`signoutOidc` handler keys) and `server/auth/controller.js`; `grep -rn "/signout" <repo>/src <repo>/README.md` must print nothing. In the tests repo `grep -rn "/signout" page-objects tests` prints nothing.
5. **Public URL surface of ins** — `npm --prefix …ins run test` green includes `src/server/app/routes.test.js`'s exact route list (unchanged) and `router.test.js`; the loss of `/signout` is the declared change.
6. **Strict booleans do not break the stack** — `grep -rn "=1\b\|=0\b\|=TRUE\|=FALSE\|=yes\|=no" ~/git/defra/trade-imports-workspace/docker/stack` for the eleven env names prints nothing (the planner's grep found only `true`/`false`).
7. **Ladders** — every frontend: `format:check`, `lint`, `test`, `test:fit` green, to files, read once. Tests repo: `typecheck`, `lint`, `format:check`. Unit counts to expect against the baseline: ins loses 2 tests (`signout/controller.test.js`) and 1 (stub-mode `redirectTo`), gains 12 (`config` table + `AUTH_ENABLED`), 7 (stub plugin), 1 (context "no lookup on the callback"), 1 (`auth.enabled=false` context) and 1 (`plugins/auth` stub-mode keep); the journeys each lose 1 (`signout`), gain 12 (`config`), 2 (`router`), 5 (`auth/controller`) and 2 (stub sign-out). Read the totals from the log, do not chase an exact number.
8. **Playwright fit** — animals' `service-navigation.fit.spec.js` already pins `href="/auth/sign-out"`; the ins smoke spec signs in through `/auth/stub-sign-in`, which still exists. All three suites must be green as before.

## 7. Out of scope

Leave these alone even though they are adjacent:

- Real Defra ID integration; anything that makes stub mode "better" than a session with no provider.
- Countries and ports loading (question 13): plants' `prime()` at boot and the `fetch` stub in the auth controller test stay as they are.
- Error-page copy (question 12), request logging `ignoreFunc` (question 5), the address-book links and `tradeImportsAnimalsFrontend`, feature-folder naming (question 14), `status-codes.js`/`pulse.js` names (question 25).
- `server.js` in all three (unchanged; the stub plugin's export name is unchanged so it needs no edit), `csrf.js`/`csrf.test.js`, `health/`, `real-mode.js`, `test-server.js`, ins's `router.test.js`, ins's `routes.test.js`, `kit.js` in ins.
- The journeys' `context.js`, `layout.njk`, `layout.test.js` and docs (they already say `/auth/sign-out`).
- The admin portal (`trade-imports-animals-admin`): it keeps `/signout` and "Sign out"; the tests repo's admin page object absorbs the difference (§2P).
- `surfaces.json`, `report.md`, the stages.json invariant text — the report refresh owns them.
- `session.cookie.password` values in compose/CDP config; `LOG_REDACT` anywhere outside `config.js`.
- `userSession.displayName` semantics (D7) — recorded, not fixed.
- Do not rename `stubSignInRoutes` or `stub-sign-in.js`, do not add a `stub-sign-out.js`, do not register `authRoutes` in stub mode.

## 8. Order of work and commits

1. ins: §2A (three files), §2B, §2C, §2D, §3A, §3B, §2O, §2J, §2K, §2L, §3C, §2M, §2E, §1 deletions, §2H, §2I, §2N. Run `format`, then the ladder.
2. plants: §2A (two files), §2C, §2D, §3B, §2K, §2L, §3C, §2M, §2E, §2F, §2G, §3D, §1 deletions. `format`, ladder.
3. animals: same list as plants. `format`, ladder.
4. tests: §2P. `format`, then `typecheck`, `lint`, `format:check`.
5. §6 checks; write the residual lists and the `diff -rq` outputs into the stage notes.

One commit per repo, message `chore(NO_JIRA): one authentication shape across the three frontends (s17)` with a
body naming the questions landed (2, 3, 4, 6, 7, 8, 9, 10, 11, 24, stub sign-in) and, for ins, the removed
`/signout`.
