# s12-hardening-backport — port the ins chassis hardening to animals AND plants

Repos (both get the **identical** change; do animals first, then plants, then prove the two are byte-equal):

| key | Bash path | Read/Edit path |
|---|---|---|
| animals | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` |
| plants | `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` |
| ins (reference only — **do not edit**) | `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` |

Branch: `feat/NO_JIRA-frontend-alignment` — already checked out in both animals and plants, level with `main`
(animals HEAD `f3ff89f7`, plants HEAD `b6ac0e3`), clean trees, **no upstream yet** (the branch has never been pushed
from these two repos; the first push creates it). Rollback is `git stash push -u` only.

Baseline (captured by the planner on those HEADs, all green):

- `logs/s12-baseline-animals-format-check.log` — clean. `logs/s12-baseline-animals-lint.log` — clean (499 modules
  cruised, 3 known violations ignored). `logs/s12-baseline-animals-test.log` — **177 files passed, 2 skipped; 2201
  tests passed, 8 skipped**.
- `logs/s12-baseline-plants-format-check.log` — clean. `logs/s12-baseline-plants-lint.log` — clean.
  `logs/s12-baseline-plants-test.log` — **144 files passed, 2 skipped; 1864 tests passed, 8 skipped**.

The stage's ladder is `format:check`, `lint`, `test` in each repo. There are no moves and no deletions in this stage.

Reference files in ins (read each IN FULL before touching its counterpart). The stage's `reference` list names
`src/server/plugins/auth.js`; the file actually lives at **`src/plugins/auth.js`** in all three repos — use that path.

| ins reference | animals / plants counterpart (same relative path in both) |
|---|---|
| `src/auth/get-safe-redirect.js` + `.test.js` | `src/auth/get-safe-redirect.js` + `.test.js` |
| `src/auth/refresh-tokens.js` + `.test.js` | `src/auth/refresh-tokens.js` + `.test.js` |
| `src/plugins/auth.js` + `.test.js` | `src/plugins/auth.js` + `.test.js` |
| `src/server/auth/controller.js` + `.test.js` | `src/server/auth/controller.js` + `.test.js` |
| `src/config/config.js` + `config.test.js` | `src/config/config.js` + **new** `config.test.js` |

Plants-only reference (for the animals copy move in §2.7): `src/server/app/shared/copy.en.js`, `copy.cy.js`,
`kit.js` lines 17–23, `src/server/app/auth/unauthorised.njk`, `src/server/app/auth/unauthorised.test.js`,
`src/server/app/copy-convention.test.js` line 75.

---

## 0. Decisions (settled here so the implementor never has to choose)

1. **`redirectTo` gets the encoding only, not ins's stub-mode branch.** ins sends unauthenticated requests to
   `/auth/stub-sign-in` in stub mode because ins registers no `/auth/sign-in` route in stub mode. Animals and plants
   already register `/auth/sign-in` as an alias in `src/server/auth/stub-sign-in.js` (`SIGN_IN_PATHS`), which the
   brief says to keep. The branch would therefore be dead code carrying a comment that is false in these repos. A new
   test pins that stub mode still redirects to `/auth/sign-in`.
2. **`strict-boolean` is applied to `stubMode` only** — exactly what ins does. Every other boolean with an env var
   in `config.js` fails *safe* under convict's built-in `Boolean` (a typo coerces to `true`, which for
   `auth.enabled`, `session.cookie.secure`, `redis.useTLS`, `isSecureContextEnabled` means "more secure", not less).
   `stubMode` is the one flag where a typo fails *open*, so it is the one that needs the strict format. Widening
   would also make the three `config.js` copies diverge, the opposite of the stage's purpose.
3. **Animals' unauthorised page moves into `sharedCopy` (plants' shape) as part of this stage.** Two things force it:
   (a) the new rejection branches take the controller to four `'Sorry, we are unable to sign you in'` literals, and
   `sonarjs/no-duplicate-string` (threshold 3, on `src/server/**/*.js`) fails lint at three; (b) programme
   invariant 5 — a string a stage touches lives in `copy.en.js`/`copy.cy.js`. Plants already did this move
   (`copy.unauthorised`, `unauthorised.njk` reading `sharedCopy`, `unauthorised.test.js`, `kit.js` exporting
   `sharedCopy`, the `copy-convention.test.js` namespace pin). Animals copies plants verbatim, after which
   `src/server/auth/controller.js` and its test are byte-equal across animals and plants.
4. **`UNAUTHORISED_VIEW` is hoisted in the controller** (ins did the same). Four `'auth/unauthorised'` literals would
   otherwise trip the same lint rule.
5. **The organisationId rejection logs `{ crn: profile.crn }`, not `{ profile }`.** ins logs the whole profile,
   which carries name, email and contactId. The crn is enough to trace the account. Recorded as an open question
   for ins to follow.
6. **The controller test hoists `MOCK_TOKEN` and uses a `signInOidc()` helper** — `'mock-token'` and
   `'/auth/sign-in-oidc'` would each appear three times otherwise and trip `sonarjs/no-duplicate-string` (the rule
   applies to test files under `src/server/**` too; `src/auth/**`, `src/plugins/**` and `src/config/**` are outside
   it).
7. **`config.test.js` in animals/plants carries only the `stubMode` block** from ins's file. ins's other tests pin
   ins-specific ports and URLs; porting them would make the two new files differ (animals port 3000, plants 3003).
8. **Existing comments in the touched files stay as they are.** Invariant 6 bans *new* explanatory, migration or
   rename comments; it does not ask for a comment sweep of the chassis, and the ins reference keeps them. The only
   comment this stage adds is ins's `strict-boolean` "why" block in `config.js`, verbatim, so the three configs match.

---

## 1. Moves

None. No file moves, renames or deletions in either repo.

---

## 2. Edits (apply to BOTH repos unless marked animals-only)

### 2.1 `src/auth/get-safe-redirect.js` — replace with ins verbatim

Current (both repos):

```js
function getSafeRedirect(redirect) {
  if (!redirect?.startsWith('/')) {
    return '/'
  }
  return redirect
}

export { getSafeRedirect }
```

Target — the whole file becomes byte-identical to ins:

```js
function getSafeRedirect(redirect) {
  if (typeof redirect !== 'string' || !redirect.startsWith('/')) {
    return '/'
  }

  if (
    redirect.startsWith('//') ||
    redirect.includes('://') ||
    redirect.includes('\\') ||
    /[\r\n]/.test(redirect)
  ) {
    return '/'
  }

  try {
    const resolved = new URL(redirect, 'http://placeholder')
    if (resolved.origin !== 'http://placeholder') {
      return '/'
    }
    return redirect
  } catch {
    return '/'
  }
}

export { getSafeRedirect }
```

Why: `//evil.com`, `/\evil.com` and a CRLF-split path all start with `/` and passed the old check; the cookie
strategy, both sign-in controllers and stub sign-in feed attacker-controlled `redirect` into it.

### 2.2 `src/auth/refresh-tokens.js` — form body instead of query string

Current (both repos) builds `query` by joining `key=value` strings and posts to `${url}?${query}` with no payload.
Target — byte-identical to ins:

```js
async function refreshTokens(refreshToken) {
  const { token_endpoint: url } = await getOidcConfig()

  const payload = new URLSearchParams({
    client_id: config.get('defraId.clientId'),
    client_secret: config.get('defraId.clientSecret'),
    grant_type: 'refresh_token',
    scope: `openid offline_access ${config.get('defraId.clientId')}`,
    refresh_token: refreshToken,
    redirect_uri: config.get('defraId.redirectUrl')
  })

  const { payload: responsePayload } = await Wreck.post(url, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      [config.get('tracing.header')]: getTraceId() ?? ''
    },
    payload: payload.toString(),
    json: true,
    timeout: TOKEN_ENDPOINT_TIMEOUT_MS
  })

  // Payload will include both a new access token and a new refresh token
  // Refresh tokens can only be used once, so the new refresh token should be stored in place of the old one
  return responsePayload
}
```

Imports, `TOKEN_ENDPOINT_TIMEOUT_MS` and the export line are unchanged. Why: the client secret and refresh token
were going into the URL (logged by proxies and the WAF); the header already claimed a form body that was never sent;
values were not URL-encoded.

### 2.3 `src/plugins/auth.js` — two edits inside `getCookieOptions()`

(a) `redirectTo` — encode the return target. Current:

```js
    redirectTo: function (request) {
      return `/auth/sign-in?redirect=${request.url.pathname}${request.url.search}`
    },
```

Target (decision 1 — no stub-mode branch, no comment):

```js
    redirectTo: function (request) {
      const target = `${request.url.pathname}${request.url.search}`
      return `/auth/sign-in?redirect=${encodeURIComponent(target)}`
    },
```

(b) `validate` — a refresh failure invalidates the session instead of throwing a 500. Current `catch` block:

```js
      } catch {
        if (!config.get('defraId.refreshTokens')) {
          return { isValid: false }
        }
        const { access_token: token, refresh_token: refreshToken } =
          await refreshTokens(userSession.refreshToken)
        userSession.token = token
        userSession.refreshToken = refreshToken
        await request.server.app.cache.set(session.sessionId, userSession)
      }
```

Target — copy ins:

```js
      } catch {
        if (!config.get('defraId.refreshTokens')) {
          return { isValid: false }
        }
        try {
          const { access_token: token, refresh_token: refreshToken } =
            await refreshTokens(userSession.refreshToken)
          userSession.token = token
          userSession.refreshToken = refreshToken
          await request.server.app.cache.set(session.sessionId, userSession)
        } catch {
          return { isValid: false }
        }
      }
```

Nothing else in the file changes (imports, `authPlugin`, `getBellOptions`, the cookie block all stay).

### 2.4 `src/server/auth/controller.js` — organisationId guard, permissions guard, hoisted view name

Target for the top of the file and the whole `signinOidc` handler. Everything from `signout` down is **unchanged**
(the sign-out session drop and the `signoutOidc` "already signed out → /" branch stay exactly as they are):

```js
import { getSignOutUrl } from '../../auth/get-sign-out-url.js'
import { validateState } from '../../auth/state.js'
import { verifyToken } from '../../auth/verify-token.js'
import { getPermissions } from '../../auth/get-permissions.js'
import { getSafeRedirect } from '../../auth/get-safe-redirect.js'
import { base, sharedCopy } from '../app/shared/kit.js'

const UNAUTHORISED_VIEW = 'auth/unauthorised'

export const authController = {
  signin: {
    handler: async function (_request, h) {
      return h.redirect('/')
    }
  },
  signinOidc: {
    handler: async function (request, h) {
      // If the user is not authenticated, redirect to the home page
      // This should only occur if the user tries to access the sign-in page directly and not part of the sign-in flow
      // eg if the user has bookmarked the Defra Identity sign-in page or they have signed out and tried to go back in the browser
      if (!request.auth.isAuthenticated) {
        // When Bell can't authenticate the callback, `mode: try` means we need to inspect `request.auth.error`
        // to understand whether it was a state/nonce mismatch, token exchange failure, or cookie decode issue.
        request.logger?.error(
          {
            bellError: request.auth.error,
            state: request.query?.state
          },
          'Bell auth failed for /auth/sign-in-oidc'
        )
        return h.view(UNAUTHORISED_VIEW, base(sharedCopy.unauthorised.title))
      }

      const { profile, token, refreshToken } = request.auth.credentials

      if (!profile.organisationId) {
        request.logger?.error(
          { crn: profile.crn },
          'Sign-in rejected: missing organisationId in Defra ID token'
        )
        return h.view(UNAUTHORISED_VIEW, base(sharedCopy.unauthorised.title))
      }

      // verify token returned from Defra Identity against public key
      try {
        await verifyToken(token)
      } catch (err) {
        request.logger?.error(
          { err },
          'Token verification failed for /auth/sign-in-oidc'
        )
        return h.view(UNAUTHORISED_VIEW, base(sharedCopy.unauthorised.title))
      }

      // Typically permissions for the selected organisation would be available in the `roles` property of the token
      // However, when signing in with RPA credentials, the roles only include the role name and not the permissions
      // Therefore, we need to make additional API calls to get the permissions from Siti Agri
      // These calls are authenticated using the token returned from Defra Identity
      let role
      let scope
      try {
        ;({ role, scope } = await getPermissions(
          profile.crn,
          profile.organisationId,
          token
        ))
      } catch (err) {
        request.logger?.error(
          { err },
          'Failed to load user permissions at sign-in'
        )
        return h.view(UNAUTHORISED_VIEW, base(sharedCopy.unauthorised.title))
      }

      // Store token and all useful data in the session cache
      await request.server.app.cache.set(profile.sessionId, {
        isAuthenticated: true,
        ...profile,
        role,
        scope,
        token,
        refreshToken
      })

      // Create a new session using cookie authentication strategy which is used for all subsequent requests
      request.cookieAuth.set({ sessionId: profile.sessionId })

      // Redirect user to the page they were trying to access before signing in or to the home page if no redirect was set
      const redirect = request.yar.get('redirect') ?? '/'
      request.yar.clear('redirect')
      // Ensure redirect is a relative path to prevent redirect attacks
      const safeRedirect = getSafeRedirect(redirect)
      return h.redirect(safeRedirect)
    }
  },
```

Notes for the implementor:

- Plants already imports `{ base, sharedCopy }` and already uses `sharedCopy.unauthorised.title`; its diff is the
  constant, the two new guards and the four `UNAUTHORISED_VIEW` substitutions.
- Animals imports `{ base }` only and inlines the literal title; it needs §2.7 first (so `sharedCopy` is exported
  from `kit.js` and `copy.unauthorised` exists). After both edits, `diff` of the two controllers must be empty.
- `;({ role, scope } = await ...)` is the ins shape; the leading `;` is how Prettier writes a destructuring
  assignment statement without semicolons. Run `npm run format` rather than hand-formatting.
- Why the guards: `organisationId` is `payload.currentRelationshipId`; a Defra ID token issued with no current
  relationship would otherwise mint a session with `organisationId: undefined` and every backend call would be
  unscoped. A thrown `getPermissions` currently surfaces as a 500 with no session cleared.

### 2.5 `src/config/config.js` — the `strict-boolean` format on `stubMode`

Insert immediately after the existing `convict.addFormats(convictFormatWithValidator)` line (ins lines 22–43,
verbatim including the comment):

```js
// convict's built-in Boolean format coerces any string other than exactly
// 'false' to true (e.g. a typo like 'flase' silently enables the flag), so
// security/environment-gating flags use this stricter format instead - it
// only accepts an actual boolean, or the literal strings 'true'/'false' from
// an env var, and fails config.validate() on anything else.
convict.addFormat({
  name: 'strict-boolean',
  validate(val) {
    if (typeof val !== 'boolean') {
      throw new Error("must be 'true' or 'false'")
    }
  },
  coerce(val) {
    if (val === 'true') {
      return true
    }
    if (val === 'false') {
      return false
    }
    return val
  }
})
```

Then in the `stubMode` entry change `format: Boolean,` to `format: 'strict-boolean',`. Nothing else in `config.js`
changes (decision 2). Every `STUB_MODE` producer in the workspace already uses the literal `'true'`/`'false'`
(vitest env, `playwright.config.js` webServer env, `run-mode.test.js`, `address-book.test.js`, the plants README and
CI workflow; nothing under `docker/` or `scripts/` sets it), so no caller breaks.

### 2.6 Tests that change content (both repos) — see §5 for what each pins

- `src/auth/get-safe-redirect.test.js` — replace with ins verbatim (adds three tests).
- `src/auth/refresh-tokens.test.js` — replace with ins verbatim (the first test's expectation moves from a
  `${tokenEndpoint}?${expectedQuery}` URL to `tokenEndpoint` + `payload: expectedBody`).
- `src/plugins/auth.test.js` — the `describe('getCookieOptions')` block is rewritten (§5.3). Everything above it
  (mocks, `beforeEach`, the register tests including animals'/plants' extra
  `expect(isStubModeMock).toHaveBeenCalled()`, the Bell tests) stays as it is.
- `src/server/auth/controller.test.js` — rewritten in full (§5.4).

### 2.7 Animals only — move the unauthorised page into `sharedCopy` (plants' shape, verbatim)

Do this **before** §2.4 in animals. Every target below is copied from plants; after the edits, `diff` of each file
against its plants twin must be empty except where the table says otherwise.

| animals file | change | plants source |
|---|---|---|
| `src/server/app/shared/copy.en.js` | Insert the `unauthorised` block between `layout` and `errorSummary`; change the header comment's line 4 from `back link, error title prefix), error-summary title, save-actions` to plants' wording (`...error title prefix), the unauthorised page, error-summary` / `title, save-actions buttons and journey-strip tags. Every view reaches` / `it as \`sharedCopy\` (via \`kit.base\`, or passed directly by the controllers` / `that build their view models without it).`). | plants `copy.en.js` lines 1–36. **Not** byte-equal afterwards: animals' `validatorDefaults` has no `time` key — leave that alone. |
| `src/server/app/shared/copy.cy.js` | Insert the Welsh `unauthorised` block between `layout` and `errorSummary`. | plants `copy.cy.js` lines 25–30 (`title: "Mae'n ddrwg gennym, ni allwn eich mewngofnodi"`, `heading: "...mewngofnodi."`, `bodyPrefix: 'Rhowch'`, `signInLinkText: 'gynnig arall arni'`). Same `time` caveat. |
| `src/server/app/shared/kit.js` | Replace line 17 `const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })` with plants' lines 17–23 (the JSDoc + `export const sharedCopy = ...`). | plants `kit.js` lines 17–23. Rest of `kit.js` untouched. |
| `src/server/app/auth/unauthorised.njk` | Replace whole file. | plants `unauthorised.njk` — byte-equal. |
| `src/server/app/copy-convention.test.js` | Add `'unauthorised',` after `'layout',` in the chrome-namespace `arrayContaining` (line ~72). | plants line 75. |
| `src/server/app/auth/unauthorised.test.js` | **New** — see §3. | plants `unauthorised.test.js` — byte-equal. |

The English strings are unchanged for the trader: `Sorry, we are unable to sign you in.` / `Please try again.` with
the link still going to `/auth/sign-in`. The Welsh strings are plants' machine-draft (its file header already
carries the "not reviewed by a translator" banner; animals' does too).

---

## 3. New files

### 3.1 `src/config/config.test.js` (both repos, byte-equal) — imitate ins `src/config/config.test.js`, `stubMode` block only

```js
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const originalStubMode = process.env.STUB_MODE

const restoreStubMode = () => {
  if (originalStubMode === undefined) {
    delete process.env.STUB_MODE
  } else {
    process.env.STUB_MODE = originalStubMode
  }
}

describe('#config', () => {
  describe('stubMode', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      restoreStubMode()
    })

    test('reads STUB_MODE=true as true', async () => {
      process.env.STUB_MODE = 'true'

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('stubMode')).toBe(true)
    })

    test('defaults to false when STUB_MODE is unset', async () => {
      delete process.env.STUB_MODE

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('stubMode')).toBe(false)
    })

    test("rejects a STUB_MODE value that is not 'true' or 'false'", async () => {
      process.env.STUB_MODE = 'flase'

      await expect(import('./config.js')).rejects.toThrow(
        "must be 'true' or 'false'"
      )
    })
  })
})
```

`vi.resetModules()` + dynamic import is the same shape `src/server/app/services/run-mode.test.js` already uses in
both repos, so the env round-trip is proven to work here. vitest's `env: { STUB_MODE: 'true' }` is restored by
`restoreStubMode` after each test.

### 3.2 `src/server/app/auth/unauthorised.test.js` (animals only) — copy plants' file verbatim

It renders `auth/unauthorised.njk` through `nunjucksConfig.options.compileOptions.environment` (animals exports
`nunjucksConfig` with the same shape; `cheerio` 1.2.0 is already a dev dependency) and pins heading, body, link text
and the `/auth/sign-in` href to `sharedCopy.unauthorised`.

---

## 4. Imports

Only one import changes in the whole stage: animals' `src/server/auth/controller.js` goes from
`import { base } from '../app/shared/kit.js'` to `import { base, sharedCopy } from '../app/shared/kit.js'`, and
animals' `src/server/auth/controller.test.js` gains `import { copy as sharedEn } from '../app/shared/copy.en.js'`
and `import { getPermissions } from '../../auth/get-permissions.js'` (plants' test gains the second only). All
paths stay relative; nothing crosses a repo boundary; `src/auth/*`, `src/plugins/*` and `src/config/*` keep the
imports they have. `lint:arch` (dependency-cruiser over `src/server/app`) sees no new edge — `kit.js` already
imports both copy modules.

---

## 5. Tests

### 5.1 `src/auth/get-safe-redirect.test.js` (both, ins verbatim)

Keeps the four existing tests and adds, each pinning one rejected shape → `'/'`:
`'//evil.com'` (protocol-relative), `String.raw\`/\\evil.com\`` (backslash bypass), `'/address-book\r\n/evil'` (CRLF).

### 5.2 `src/auth/refresh-tokens.test.js` (both, ins verbatim)

The first test now builds `expectedBody = new URLSearchParams({...}).toString()` and asserts
`wreckPostMock` was called with `(tokenEndpoint, { headers, payload: expectedBody, json: true, timeout: 3000 })`
— pins that credentials travel in the body and are URL-encoded. The other two tests are unchanged.

### 5.3 `src/plugins/auth.test.js` (both) — `describe('getCookieOptions')` becomes:

```js
  describe('getCookieOptions', () => {
    const buildRequestWithCachedSession = (userSession) => ({
      server: {
        app: {
          cache: {
            get: vi.fn().mockResolvedValue(userSession),
            set: vi.fn()
          }
        }
      }
    })

    test('redirectTo builds /auth/sign-in redirect including pathname and search', () => {
      const options = getCookieOptions()

      const redirect = options.redirectTo({
        url: {
          pathname: '/origin',
          search: '?a=1'
        }
      })

      expect(redirect).toBe('/auth/sign-in?redirect=%2Forigin%3Fa%3D1')
    })

    test('redirectTo encodes the return URL query string', () => {
      const options = getCookieOptions()

      const redirect = options.redirectTo({
        url: {
          pathname: '/address-book',
          search: '?q=France&page=2'
        }
      })

      expect(redirect).toBe(
        '/auth/sign-in?redirect=%2Faddress-book%3Fq%3DFrance%26page%3D2'
      )
    })

    test('redirectTo keeps sending unauthenticated requests to /auth/sign-in in stub mode', () => {
      isStubModeMock.mockReturnValue(true)
      const options = getCookieOptions()

      const redirect = options.redirectTo({
        url: {
          pathname: '/origin',
          search: '?a=1'
        }
      })

      expect(redirect).toBe('/auth/sign-in?redirect=%2Forigin%3Fa%3D1')
    })

    test('validate returns isValid:false when session does not exist in cache', ...)   // unchanged body
    test('validate returns isValid:true when token verification succeeds', ...)         // request = buildRequestWithCachedSession(userSession)
    test('validate refreshes tokens when verification fails and refreshTokens enabled', ...) // same, request via the helper
    test('validate returns isValid:false when verification fails and refreshTokens disabled', ...) // same, request via the helper

    test('validate returns isValid:false when refreshTokens rejects', async () => {
      const options = getCookieOptions()
      const userSession = {
        token: 'old-token',
        refreshToken: 'old-refresh'
      }

      const request = buildRequestWithCachedSession(userSession)

      jwtDecodeMock.mockReturnValue({ exp: 1 })
      jwtVerifyTimeMock.mockImplementation(() => {
        throw new Error('token expired')
      })
      refreshTokensMock.mockRejectedValue(new Error('refresh failed'))

      const res = await options.validate(request, { sessionId: 'session-1' })

      expect(res).toEqual({ isValid: false })
      expect(request.server.app.cache.set).not.toHaveBeenCalled()
    })
  })
```

The four `validate` tests marked "unchanged body" keep their assertions exactly; the only edit is replacing each
inline `request = { server: { app: { cache: {...} } } }` literal with `buildRequestWithCachedSession(userSession)`
(the "session does not exist" test keeps its own `get: vi.fn().mockResolvedValue(null)` literal, as in ins). The
stub-mode `redirectTo` test is the one test that is not in ins; it pins decision 1. The `'defraId.redirectUrl'`
values in the config map stay `http://localhost:3000/...` in **both** repos (they are mock values and the two files
are byte-equal today; keep them so).

### 5.4 `src/server/auth/controller.test.js` (both, byte-equal) — full target

```js
import { vi } from 'vitest'
import { createServer } from '../server.js'
import { config } from '../../config/config.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
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

vi.mock('../../auth/verify-token.js', () => ({
  verifyToken: vi.fn()
}))

vi.mock('../../auth/get-permissions.js', () => ({
  getPermissions: vi.fn()
}))

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

  test('GET /auth/sign-in-oidc renders unauthorised when organisationId is missing', async () => {
    const { statusCode, payload, headers } = await signInOidc({
      organisationId: undefined
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

What each pins: (1) a token with no current relationship never reaches token verification or the permissions
lookup and sets no session cookie; (2) the existing verification-failure behaviour, now asserting title and heading
through the copy module (plants' shape) and that permissions were not fetched; (3) a permissions failure renders the
unauthorised page with no cookie instead of a 500, after the token was verified with the real token value.
`vitest.config.js` has `clearMocks: true` in both repos, so no `beforeEach(vi.clearAllMocks)` is needed;
`mockRejectedValue`/`mockResolvedValue` are set per test. Both repos' `server.js` swaps `authRoutes` for
`stubSignInRoutes` in stub mode, which is why the `config.set('stubMode', false)` bracket stays.

### 5.5 `src/config/config.test.js` (both, new — §3.1)

Pins: `'true'` → `true`; unset → `false`; `'flase'` → config load rejects with `must be 'true' or 'false'`.

### 5.6 Animals only — `src/server/app/auth/unauthorised.test.js` (new, §3.2) and `copy-convention.test.js`

Pins that the view reads heading, body prefix and link text from `sharedCopy.unauthorised` and links to
`/auth/sign-in`; and that `unauthorised` is one of the shared chrome namespaces. `copy-parity.test.js` already
includes the shared pair, so it checks the new `cy` block structurally and that every string is translated — no
edit needed there.

---

## 6. Invariants to prove

| invariant | what this stage could break | proof |
|---|---|---|
| 1 — public URL surface | Nothing in ins changes. In animals/plants no route is added or renamed. | `grep -n "path: '/auth" <repo>/src/server/auth/index.js` lists the same five paths as before (`/auth/sign-in`, `/auth/sign-in-oidc`, `/auth/sign-out`, `/auth/sign-out-oidc`, `/auth/organisation`), and `grep -n "SIGN_IN_PATHS = \[" <repo>/src/server/auth/stub-sign-in.js` still prints the unchanged two-element alias array `['/auth/stub-sign-in', '/auth/sign-in']` — stub-sign-in.js declares its routes through `SIGN_IN_PATHS.map((path) => …)`, so a `path: '/auth` grep cannot see them. Seven routes total in both repos, none added or renamed. |
| 2 — behaviour preserved unless named | Five named changes (named in the stage's JUDGE note in stages.json and in the commit body); nothing else. | `git -C <repo> diff --stat` shows only the files in §2/§3; `git -C <repo> diff src/server/auth/controller.js` shows no change below the `signinOidc` handler. |
| 3 — ladder green | New tests, lint rules on `src/server/**`. | `npm --prefix <repo> run format:check`, `run lint`, `test` each `> logs/s12-hardening-backport-<repo>-<rung>.log 2>&1`, read once. Expect animals **2215 passed** (2201 + get-safe-redirect 3 + plugin 3 + controller 2 + config 3 + unauthorised 3), plants **1875 passed** (1864 + 3 + 3 + 2 + 3), zero failed, skipped counts unchanged (8 tests, 2 files). A lower count means a test was dropped; a higher one means something beyond this plan was added — both are findings. |
| 4 — no shared package, no cross-repo imports | Three files copied by hand. | `grep -rn "trade-imports-plants\|trade-imports-ins" <animals>/src` and `grep -rn "trade-imports-animals\|trade-imports-ins" <plants>/src` return nothing new versus baseline (the only pre-existing hits are the config defaults / service names). |
| 5 — strings live in copy pairs | The animals unauthorised title. | `grep -rn "unable to sign you in" <animals>/src` hits only `copy.en.js` (twice: title, heading). `copy-parity.test.js` passes. |
| 6 — no migration/rename comments | Comments written by the implementor. | `git -C <repo> diff` contains no added `//` line other than the `strict-boolean` block in `config.js` and the kit.js JSDoc copied from plants. |
| 7 — explicit names | New identifiers. | `UNAUTHORISED_VIEW`, `MOCK_TOKEN`, `signInOidc`, `buildRequestWithCachedSession`, `restoreStubMode` — all say what they are. |
| 8 — network-boundary mocks in ins | ins is untouched. | `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend status --short` is empty. |
| stage-specific — byte equality | The whole point of the stage. | For each of `src/auth/get-safe-redirect.js`, `src/auth/get-safe-redirect.test.js`, `src/auth/refresh-tokens.js`, `src/auth/refresh-tokens.test.js`, `src/plugins/auth.js`, `src/plugins/auth.test.js`, `src/server/auth/controller.js`, `src/server/auth/controller.test.js`, `src/config/config.test.js`, `src/server/app/auth/unauthorised.njk`, `src/server/app/auth/unauthorised.test.js`: `diff <animals>/<file> <plants>/<file>` prints nothing. For `src/config/config.js`: `diff` prints exactly the nine pre-existing service-specific hunks (port 3000/3003, serviceName, serviceId, redirect URLs, keyPrefix, backend API block) and nothing else. Against ins: `diff <ins>/src/auth/get-safe-redirect.js <animals>/src/auth/get-safe-redirect.js` and the same for `refresh-tokens.js` print nothing. |

---

## 7. Out of scope — leave alone even though it is tempting

- **ins.** No edit of any kind; it is the reference. The open questions below are for a later stage.
- **The stub-mode branch in `redirectTo`** (decision 1) and the `stub-sign-in.js` files — the alias stays, the
  per-repo `STUB_TOKEN_SECRET` literal stays (ins generates a random one; that is a separate hardening the brief
  does not name).
- **Other convict flags** — `auth.enabled`, `csrf.*`, `session.cookie.secure`, `redis.useTLS`,
  `isSecureContextEnabled`, `defraId.refreshTokens`, `signOutHostnameRewrite.enabled` keep `format: Boolean`
  (decision 2).
- **Comment sweeps** of `controller.js`, `plugins/auth.js`, `refresh-tokens.js`, `get-permissions.js` — the
  existing comments stay (decision 8).
- **`signout` / `signoutOidc`** — animals' and plants' session drop on sign-out initiation and the "already signed
  out → `/`" branch are kept exactly; ins's sign-out shape is not ported.
- **The `time` validator default** that plants has and animals lacks, and any other `copy.en.js` difference beyond
  the `unauthorised` block and the header comment.
- **`fit/` specs, `playwright.config.js`, READMEs, `docs/`, CI workflows** — nothing they pin changes (they sign in
  through `/auth/stub-sign-in?organisationId=…`, which is untouched).
- **`src/server/app/**` journey code** — model, bridge, engine, flow, sets — untouched.
- **Dependencies** — no `package.json` or lockfile change; `cheerio`, `convict`, `@hapi/wreck` are already present.

---

## 8. Order of work and the ladder

1. Animals: §2.7 (copy move) → §2.1 → §2.2 → §2.3 → §2.4 → §2.5 → §2.6/§3 tests. `npm --prefix <animals> run format`.
   Ladder to `logs/s12-hardening-backport-animals-{format-check,lint,test}.log`.
2. Plants: §2.1 → §2.2 → §2.3 → §2.4 → §2.5 → §2.6/§3 tests. `npm --prefix <plants> run format`. Ladder to
   `logs/s12-hardening-backport-plants-{format-check,lint,test}.log`.
3. The §6 byte-equality `diff`s. Any non-empty diff in the byte-equal list is a defect in one of the two repos —
   fix the repo that departs from this plan, never by editing the other to match.
4. Commit per repo on `feat/NO_JIRA-frontend-alignment`, one commit each, message
   `refactor(alignment): s12-hardening-backport — port the ins auth and config hardening` with the five behaviour
   changes listed in the body. Push creates the remote branch (`git push -u origin feat/NO_JIRA-frontend-alignment`);
   draft PRs against `main` in both repos via `tools/github/`; never merge.
