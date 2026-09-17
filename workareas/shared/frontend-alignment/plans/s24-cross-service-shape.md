# s24 — the journeys take ins's cross-service shape: form-action and cookie name

Ruling (Sam, 16 September 2026, report question 28): the journeys need the same shape, done as part of
the address book work. Both halves are settled here. Nothing is deferred.

## Repos and their two path spellings

| Key | Bash (tilde) | Read/Write/Edit (absolute) |
|---|---|---|
| ins | `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` |
| animals | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` |
| plants | `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` |
| tests | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests` |
| workspace | `~/git/defra/trade-imports-workspace` | `/Users/samfarrington/git/defra/trade-imports-workspace` |

All four repos are already on `feat/NO_JIRA-frontend-alignment`. Do not create a branch.

## Baseline (captured before planning — all green, exit 0)

| Log under `workareas/shared/frontend-alignment/logs/` | Result |
|---|---|
| `s24-cross-service-shape-baseline-{ins,animals,plants}-test.log` | green (ins coverage: statements 94.02%, branches 91.35%) |
| `s24-cross-service-shape-baseline-{ins,animals,plants}-lint.log` | green |
| `s24-cross-service-shape-baseline-{ins,animals,plants}-format.log` | green |

`test:fit` (Playwright, per frontend) was not baselined — it builds the frontend bundle and boots a
server per repo. Run it as part of the ladder; if it is red, re-run once before treating it as caused
by this stage.

## The re-measurement the brief asked for (what actually differs now)

s22 has already landed, so this is the current state, not the state the report describes.

**`src/server/common/helpers/content-security-policy.js`** — animals and plants are byte-identical to
each other. ins differs by exactly two hunks:

```
3,9d2
< import { config } from '../../../config/config.js'
<
< const journeyFrontendOrigins = [
<   config.get('tradeImportsAnimalsFrontend.baseUrl'),
<   config.get('tradeImportsPlantsFrontend.baseUrl')
< ].map((baseUrl) => new URL(baseUrl).origin)
<
32,33c25
<     // Handshake save/cancel POSTs 302 to a journey frontend; browsers enforce form-action on that redirect.
<     formAction: ['self', ...journeyFrontendOrigins],
---
>     formAction: ['self'],
```

**`src/server/common/helpers/content-security-policy.test.js`** — animals and plants byte-identical.
ins differs by one hunk, and it is the reason the file cannot simply be copied: it pins per-service
literals.

```
28,33c28
<     const policy = resp.headers['content-security-policy']
<
<     expect(policy).toBeDefined()
<     expect(policy).toMatch(/form-action[^;]*'self'/)
<     expect(policy).toMatch(/form-action[^;]*http:\/\/localhost:3000/)
<     expect(policy).toMatch(/form-action[^;]*http:\/\/localhost:3003/)
---
>     expect(resp.headers['content-security-policy']).toBeDefined()
```

**`src/plugins/auth.js`** — animals and plants byte-identical. ins differs by one line:

```
102d101
<       name: config.get('auth.cookieName'),
```

**`src/plugins/auth.test.js`** — animals and plants byte-identical. ins differs by two hunks:

```
68d67
<         'auth.cookieName': 'ins-sid',
270,273d268
<     test('uses the configured auth cookie name', () => {
<       expect(getCookieOptions().cookie.name).toBe('ins-sid')
<     })
<
```

Everything else in those four files is already byte-equal across the three services. This stage closes
the four gaps above and nothing else.

---

## 0. Decisions

Every one of these is settled. The implementor makes no choice.

**D1 — how the byte-equal helper reads its siblings: a named export from `config.js`, not a new
convict key.** ins reads `tradeImportsAnimalsFrontend.baseUrl` + `tradeImportsPlantsFrontend.baseUrl`;
animals and plants read `tradeImportsInsFrontend.baseUrl`. Those key names differ per service, so a
helper that names them cannot be byte-equal. `config.js` is the file allowed to differ, so `config.js`
is where the per-service list is assembled. Each `config.js` gains, after `config.validate(...)`:

```js
export const siblingFrontendBaseUrls = [...]
```

and the helper imports that one name. This was chosen over the two alternatives:

- *A new convict key with its own env var* (`SIBLING_FRONTEND_URLS`): rejected. The per-sibling env
  vars are already wired in `docker/stack/frontend.compose.yml` and in CDP platform config. A second
  env var for the same origin would need both wired in lockstep, and a missed one silently blocks the
  cross-service redirect in a deployed environment while passing locally. It also drags
  `cdp-app-config` into a stage whose repo list is ins/animals/plants/tests.
- *`config.set(...)` after `config.validate(...)`*: rejected as indirection that needs a comment to
  explain itself.

**D2 — `config.js` exports base URLs; the helper derives origins.** The config keys hold base URLs, so
that is what the export holds. The `new URL(baseUrl).origin` mapping stays in
`content-security-policy.js`, which keeps the interesting line inside the byte-equal file and makes
each `config.js` delta a plain list of `config.get` calls.

**D3 — keep one `why` comment on `formAction`, reworded to be service-neutral.** The existing wording
("302 to a journey frontend") is wrong in the journeys' direction — animals and plants redirect *to*
ins, not to a journey frontend. Node code-style rule 15 allows a comment for a non-obvious constraint,
and browser enforcement of `form-action` across a redirect is exactly that. The single line is
identical in all three files, so it does not break byte-equality.

**D4 — no env-var, compose or platform-config change.** `AUTH_SESSION_COOKIE_NAME` already exists as a
key name; animals and plants gain the same key with the same env var. In the stack all three frontend
containers run `NODE_ENV=development`, so plants picks up its distinct default with no compose edit
(ins's explicit `AUTH_SESSION_COOKIE_NAME=ins-sid` line in `frontend.compose.yml` is belt-and-braces
and stays as it is). In CDP all three run `NODE_ENV=production` and all three default to `sid`, which
is safe because each frontend has its own hostname there. The workspace repo is not in this stage's
repo list; do not touch `docker/stack/`.

**D5 — `tradeImportsInsFrontend.baseUrl` becomes `format: 'url'` in animals and plants.** It is
`format: String` today. Once the CSP helper feeds it to `new URL(...)`, a malformed value throws a
bare `TypeError: Invalid URL` at module import instead of failing at startup with a readable message.
`docs/best-practices/node/hapi.md` §14 makes this a convention, not a judgement call, and ins's two
sibling keys already use `format: 'url'`. `convict-format-with-validator` is already registered in both
repos, and its `url` format uses `require_tld: false`, so `http://localhost:3002` validates.

**D6 — cookie-name defaults.** ins keeps `isDevelopment ? 'ins-sid' : 'sid'` unchanged. Plants takes
`plants-sid` in development. Animals keeps `sid` and is written as a plain `default: 'sid'`, not a
ternary with two identical branches — that would be flagged as pointless by lint and by Sonar. Animals
is the incumbent every fixture and page object assumes, and it is the service the others are avoiding,
so renaming it buys nothing and breaks everything.

**D7 — the auth test becomes byte-equal via a named constant, not via reading real config.**
`auth.test.js` replaces the whole config module with a mock, so it cannot read a real default. Declare
one module-level constant, use it in the mock map *and* in the assertion. The test then pins the wiring
(`getCookieOptions()` reads `auth.cookieName`) without pinning any service's literal, and the file is
byte-equal. Code-style rule 13 covers the constant.

**D8 — the CSP test becomes byte-equal by deriving the expectation from the same export the helper
uses.** A second `test` is added to all three files; the existing bare "header is defined" test stays
as it is. The expectation is `["'self'", ...origins]` derived from `siblingFrontendBaseUrls`, so a
service with no siblings asserts `["'self'"]` and the empty case falls out of the same code.

**D9 — the literals the CSP test gives up are pinned in `config.test.js` instead.** The rewritten CSP
test no longer catches someone changing a sibling default. `config.test.js` is allowed to differ per
service and is the right home for a default's value. ins already pins the plants default; add the
missing animals one there, and add the ins default to animals' `config.test.js` (plants already has it).

**D10 — the `cookieName` doc string is identical in all three `config.js` files.** Only the `default`
differs, which keeps the drift table to one row per service with one value in it.

**D11 — the tests repo mirrors the ins entry's shape exactly**, including its
`process.env.AUTH_SESSION_COOKIE_NAME ?? '<literal>'` form, because the brief says so. See §7 for the
latent issue this shape carries and why it stays out of scope here.

**D12 — no new test for `siblingFrontendBaseUrls` itself.** The CSP test exercises it end to end. A
separate assertion over the export would be coverage padding.

---

## 1. Moves

None. No file moves, no file is deleted, no test file moves.

---

## 2. Edits

Twelve source files across four repos. Work repo by repo.

### 2.1 ins — `src/config/config.js`

The file currently ends at line 407:

```js
config.validate({ allowed: 'strict' })
```

Append a blank line and the export. Nothing else in this file changes; the `auth.cookieName` key and
the two sibling keys already exist and stay exactly as they are.

```js
config.validate({ allowed: 'strict' })

export const siblingFrontendBaseUrls = [
  config.get('tradeImportsAnimalsFrontend.baseUrl'),
  config.get('tradeImportsPlantsFrontend.baseUrl')
]
```

### 2.2 ins — `src/server/common/helpers/content-security-policy.js`

Change the import and the derived const to read the new export, and reword the comment. After the
edit this file must be byte-identical to the animals and plants copies.

Replace lines 3–8:

```js
import { config } from '../../../config/config.js'

const journeyFrontendOrigins = [
  config.get('tradeImportsAnimalsFrontend.baseUrl'),
  config.get('tradeImportsPlantsFrontend.baseUrl')
].map((baseUrl) => new URL(baseUrl).origin)
```

with:

```js
import { siblingFrontendBaseUrls } from '../../../config/config.js'

const siblingFrontendOrigins = siblingFrontendBaseUrls.map(
  (baseUrl) => new URL(baseUrl).origin
)
```

and replace the two `formAction` lines (32–33):

```js
    // Handshake save/cancel POSTs 302 to a journey frontend; browsers enforce form-action on that redirect.
    formAction: ['self', ...journeyFrontendOrigins],
```

with:

```js
    // A browser enforces form-action across the 302 that follows a cross-service POST.
    formAction: ['self', ...siblingFrontendOrigins],
```

The finished file, in full, is the target for all three services:

```js
import Blankie from 'blankie'

import { siblingFrontendBaseUrls } from '../../../config/config.js'

const siblingFrontendOrigins = siblingFrontendBaseUrls.map(
  (baseUrl) => new URL(baseUrl).origin
)

/**
 * Manage content security policies.
 * @satisfies {import('@hapi/hapi').Plugin}
 */
const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    // Hash 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' is to support a GOV.UK frontend script bundled within Nunjucks macros
    // https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy
    defaultSrc: ['self'],
    fontSrc: ['self', 'data:'],
    connectSrc: ['self', 'wss', 'data:'],
    mediaSrc: ['self'],
    styleSrc: ['self'],
    scriptSrc: [
      'self',
      "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"
    ],
    imgSrc: ['self', 'data:'],
    frameSrc: ['self', 'data:'],
    objectSrc: ['none'],
    frameAncestors: ['none'],
    // A browser enforces form-action across the 302 that follows a cross-service POST.
    formAction: ['self', ...siblingFrontendOrigins],
    manifestSrc: ['self'],
    generateNonces: false
  }
}

export { contentSecurityPolicy }
```

Do not run `prettier --write` by hand. If `format:check` objects to the wrapping of the `.map(...)`
call, fix it with `npm --prefix <repo> run format` and then copy the formatted result into the other
two repos verbatim so all three stay byte-equal.

### 2.3 ins — `src/server/common/helpers/content-security-policy.test.js`

Restore the bare first test and add a second, derived one. Target file, in full (identical in all
three repos):

```js
import { createServer } from '../../server.js'
import { vi } from 'vitest'

import { siblingFrontendBaseUrls } from '../../../config/config.js'
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

  test('Should allow self and every sibling frontend origin in form-action', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/health'
    })

    const [, formAction] = /form-action ([^;]*)/.exec(
      resp.headers['content-security-policy']
    )

    expect(formAction.trim().split(' ')).toEqual([
      "'self'",
      ...siblingFrontendBaseUrls.map((baseUrl) => new URL(baseUrl).origin)
    ])
  })
})
```

If Blankie's rendering makes that assertion fail (extra quoting, a different separator), fix the
*extraction* — the regex or the split — so the assertion still derives everything from
`siblingFrontendBaseUrls`. Do not reintroduce a `localhost:3000` / `localhost:3003` literal, and do not
weaken the assertion to `toContain`; that would let a dropped origin pass.

### 2.4 ins — `src/plugins/auth.test.js`

Two edits, no behaviour change.

Insert a module-level constant between the last `vi.mock(...)` block (ends line 42) and
`describe('auth plugin', () => {` (line 44):

```js
const AUTH_COOKIE_NAME = 'test-auth-cookie'
```

Replace line 68 in the mock map:

```js
        'auth.cookieName': 'ins-sid',
```

with:

```js
        'auth.cookieName': AUTH_COOKIE_NAME,
```

Replace the assertion at lines 270–272:

```js
      expect(getCookieOptions().cookie.name).toBe('ins-sid')
```

with:

```js
      expect(getCookieOptions().cookie.name).toBe(AUTH_COOKIE_NAME)
```

`src/plugins/auth.js` in ins is **unchanged**.

### 2.5 ins — `src/config/config.test.js`

Add one test beside the existing plants-default test (lines 31–35), pinning the animals default that
the CSP test rewrite stops covering:

```js
  test('loads TRADE_IMPORTS_ANIMALS_FRONTEND_URL with the 3000 default', () => {
    expect(config.get('tradeImportsAnimalsFrontend.baseUrl')).toBe(
      'http://localhost:3000'
    )
  })
```

Add a new `describe` block for the cookie name, inside `describe('#config', ...)`, after the
`env-backed booleans` block:

```js
  describe('auth.cookieName', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    test('defaults to a service-distinct name in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('auth.cookieName')).toBe('ins-sid')
    })

    test('reads AUTH_SESSION_COOKIE_NAME as the cookie name', async () => {
      vi.stubEnv('AUTH_SESSION_COOKIE_NAME', 'custom-sid')

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('auth.cookieName')).toBe('custom-sid')
    })
  })
```

The same block goes in animals and plants with only the expected literal changed (`'sid'` and
`'plants-sid'`).

### 2.6 animals — `src/config/config.js`

**(a)** Insert `cookieName` as the first key of the `auth` block (currently lines 273–280), matching
ins's placement:

```js
  auth: {
    cookieName: {
      doc: 'Auth session cookie name. Each frontend uses a distinct name in development so signing in to one does not overwrite another frontend session on localhost.',
      format: String,
      default: 'sid',
      env: 'AUTH_SESSION_COOKIE_NAME'
    },
    enabled: {
```

Note this doc string replaces ins's current, INS-specific wording — apply the same text to ins's
existing key too (§2.1 said nothing else changes in ins's `config.js`; this doc string is the one
exception, so that D10 holds). Animals uses a plain `default: 'sid'`, per D6.

**(b)** Change `tradeImportsInsFrontend.baseUrl` (line 383) from `format: String,` to
`format: 'url',` (D5).

**(c)** Append the export after `config.validate({ allowed: 'strict' })` (line 390):

```js
config.validate({ allowed: 'strict' })

export const siblingFrontendBaseUrls = [
  config.get('tradeImportsInsFrontend.baseUrl')
]
```

### 2.7 animals — `src/plugins/auth.js`

Insert one line as the first property of the `cookie` object inside `getCookieOptions()` (currently
line 101–105), so the file matches ins byte for byte:

```js
    cookie: {
      name: config.get('auth.cookieName'),
      password: config.get('session.cookie.password'),
```

`@hapi/cookie` already defaults the name to `sid`, so with animals' `default: 'sid'` this is a
value-for-value no-op in every environment; it makes the name explicit and overridable.

### 2.8 animals — `src/server/common/helpers/content-security-policy.js`

Replace the whole file with the target shown in §2.2. This is the behaviour change on the animals side:
`form-action` gains the ins origin.

### 2.9 animals — `src/server/common/helpers/content-security-policy.test.js`

Replace the whole file with the target shown in §2.3.

### 2.10 animals — `src/plugins/auth.test.js`

Same three edits as §2.4: add the `AUTH_COOKIE_NAME` constant after the last `vi.mock` block, add
`'auth.cookieName': AUTH_COOKIE_NAME,` to the mock map at the same position ins has it (after
`'session.cookie.password'`, before `isProduction`), and add the `uses the configured auth cookie name`
test as the first test inside `describe('getCookieOptions', ...)`, before the `redirectTo` test.

### 2.11 animals — `src/config/config.test.js`

Add the `auth.cookieName` describe block from §2.5 with `'sid'` as the development expectation. Add a
sibling-default test at the top of `describe('#config', ...)` — animals has none today:

```js
  test('loads TRADE_IMPORTS_INS_FRONTEND_URL with the 3002 default', () => {
    expect(config.get('tradeImportsInsFrontend.baseUrl')).toBe(
      'http://localhost:3002'
    )
  })
```

This needs `import { config } from './config.js'` adding to line 2 — animals' `config.test.js` does not
currently import it.

### 2.12 plants — `src/config/config.js`, `src/plugins/auth.js`, both helpers, both tests

Identical to §2.6–§2.11 with these substitutions:

- `auth.cookieName` default is `isDevelopment ? 'plants-sid' : 'sid'` (D6) — plants keeps the ternary,
  animals does not, because plants' development name genuinely differs from its production name.
- `tradeImportsInsFrontend.baseUrl` is at line 375, not 383.
- `config.validate({ allowed: 'strict' })` is at line 382.
- `config.test.js` already has the ins-default test; do not duplicate it. It already imports `config`.
- The development cookie-name expectation is `'plants-sid'`.

### 2.13 tests — `fixtures/auth-state.ts`

Give the `plants` target a `cookieName` in exactly the shape the `ins` entry uses (lines 45–49).
Replace line 50:

```ts
  plants: { landingPath: '/', landingHeading: (page) => new PlantsDashboardPage(page).heading },
```

with:

```ts
  plants: {
    landingPath: '/',
    landingHeading: (page) => new PlantsDashboardPage(page).heading,
    cookieName: process.env.AUTH_SESSION_COOKIE_NAME ?? 'plants-sid',
  },
```

Nothing else in the file changes. `authCookieNameFor` and `stripToAuthCookie` already route this
through to the mint and the saved storage state.

---

## 3. New files

None.

---

## 4. Imports

One import rule is disturbed, in one file per repo.

`src/server/common/helpers/content-security-policy.js` stops importing `{ config }` and starts
importing `{ siblingFrontendBaseUrls }` from the same path `'../../../config/config.js'`. In animals
and plants that import is new; in ins it replaces the existing one. The path is identical in all three
repos, which is what lets the file stay byte-equal.

`src/server/common/helpers/content-security-policy.test.js` gains the same named import, again from
`'../../../config/config.js'`, placed with the other value imports and above the
`mock-oidc-config.js` import.

`src/config/config.test.js` in animals gains `import { config } from './config.js'`.

No other import moves. Two things that look like they need attention and do not:

- **Whole-module config mocks.** Nine test files across the three repos do
  `vi.mock('.../config/config.js', () => ({ config: { get: ... } }))`, which would not supply the new
  named export. None of them loads `content-security-policy.js` — they are unit tests of `src/auth/*`,
  `src/plugins/{auth,csrf}.js`, `services/mode.js` and one view-model. The only config mock in a
  server-building test is `src/server/auth/controller.test.js`, and it uses the `importOriginal`
  partial-mock helper (`mock-auth-config.js` returns the real module object), so the new export
  survives. Do not "fix" any of these mocks.
- **`lint:arch`.** `depcruise` runs over `src/server/app` only. Neither `config.js` nor
  `content-security-policy.js` is in that tree, so no dependency-cruiser rule or baseline changes.

---

## 5. Tests

| File | Change | What it pins |
|---|---|---|
| ins `content-security-policy.test.js` | rewritten (§2.3) | form-action is exactly `'self'` plus every configured sibling origin, derived — no service literal |
| animals `content-security-policy.test.js` | rewritten (§2.3) | same; new coverage for animals, whose form-action now names ins |
| plants `content-security-policy.test.js` | rewritten (§2.3) | same |
| ins `auth.test.js` | constant substituted (§2.4) | `getCookieOptions().cookie.name` comes from `auth.cookieName`, not a literal |
| animals `auth.test.js` | new constant + map entry + test (§2.10) | same wiring, newly covered |
| plants `auth.test.js` | new constant + map entry + test (§2.12) | same |
| ins `config.test.js` | two new tests + one new describe (§2.5) | animals sibling default `http://localhost:3000`; `ins-sid` in development; `AUTH_SESSION_COOKIE_NAME` override |
| animals `config.test.js` | new import + one new test + one new describe (§2.11) | ins sibling default `http://localhost:3002`; `sid` in development; env override |
| plants `config.test.js` | one new describe (§2.12) | `plants-sid` in development; env override |

No test moves. No test is deleted.

The `NODE_ENV=development` tests use the `vi.resetModules()` + `vi.stubEnv(...)` +
`await import('./config.js')` pattern already established in all three `config.test.js` files; do not
invent a new one. `vi.unstubAllEnvs()` in `afterEach` is mandatory or the stubbed `NODE_ENV` leaks into
the next file.

No Playwright spec in any frontend's `tests/` directory references a session cookie by name, so
`test:fit` needs no change in any repo.

---

## 6. Invariants to prove

Run these after the edits and before the ladder. Each is one unpiped command.

**I1 — the four files are byte-equal across the three services.** Six diffs, all must print nothing:

```
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/helpers/content-security-policy.js ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/common/helpers/content-security-policy.js
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/helpers/content-security-policy.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/common/helpers/content-security-policy.js
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/helpers/content-security-policy.test.js ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/common/helpers/content-security-policy.test.js
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/helpers/content-security-policy.test.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/common/helpers/content-security-policy.test.js
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/plugins/auth.js ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/plugins/auth.js
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/plugins/auth.test.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/plugins/auth.test.js
```

Also diff `auth.js` ins↔plants and `auth.test.js` ins↔animals — eight clean diffs in total. Quote the
clean result in the stage notes; the brief requires it.

**I2 — every remaining difference is a value in `config.js`.** After I1 passes, the drift table rows
for the report are exactly these, and nothing else:

| Key | ins | animals | plants |
|---|---|---|---|
| `auth.cookieName` default | `isDevelopment ? 'ins-sid' : 'sid'` | `'sid'` | `isDevelopment ? 'plants-sid' : 'sid'` |
| `siblingFrontendBaseUrls` | animals + plants base URLs | ins base URL | ins base URL |

Prove there is no third row by grepping each repo for the new export and the cookie key:

```
grep -rn "siblingFrontendBaseUrls\|auth.cookieName" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src
```

Expect, per repo: one `config.js` definition site, one helper import, one helper test import, one
`auth.js` read, two `auth.test.js` references, and the `config.test.js` assertions. Any other hit is a
stray and must be removed.

**I3 — no service literal survives in the byte-equal test files.** Must print nothing:

```
grep -rn "localhost:300\|ins-sid\|plants-sid" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/helpers/content-security-policy.test.js ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/plugins/auth.test.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/plugins/auth.test.js
```

**I4 — ins's public URL surface is unchanged.** This stage touches no route, no `routes.js`, no
`paths.js` and no `.njk`. Prove it from the diff rather than by grepping:

```
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend status --short
```

The only ins paths listed may be `src/config/config.js`, `src/config/config.test.js`,
`src/plugins/auth.test.js` and the two `content-security-policy` files. Anything else is out of scope
and must be reverted.

**I5 — no new shared package and no cross-repo import.** The three `siblingFrontendBaseUrls`
definitions are independent duplicates by design. Must print nothing:

```
grep -rn "trade-imports-ins-frontend/src\|trade-imports-animals-frontend/src\|trade-imports-plants-frontend/src" ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```

**I6 — the ladder is green in all three frontends.** For each repo, in this order, each to its own log
under `~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/` read once:

```
npm --prefix <repo> run format:check > <log>-format.log 2>&1
npm --prefix <repo> run lint        > <log>-lint.log 2>&1
npm --prefix <repo> run test        > <log>-test.log 2>&1
npm --prefix <repo> run test:fit    > <log>-fit.log 2>&1
```

Baselines for the first three are green, so any red is this stage's. For a `test:fit` failure read
`<repo>/test-results/*/error-context.md`, not the tail of the run. Fix formatting only with
`npm --prefix <repo> run format`, then re-run I1 — a `format` run in one repo can break byte-equality
with the other two.

**I7 — the tests repo still typechecks and lints.**

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run typecheck > <log>-tests-typecheck.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run lint      > <log>-tests-lint.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run format:check > <log>-tests-format.log 2>&1
```

Do not run the Playwright suite from here — it needs the stack, and the cross-repo E2E gate runs it
later against branch-tagged images.

**I8 — cross-repo branch parity.** The plants `config.js` change and the tests-repo fixture change are
a pair: the fixture expects `plants-sid`, which only exists once the plants image carries the config
change. Both must be committed on `feat/NO_JIRA-frontend-alignment` in their own repos before the
cross-repo E2E runs. Confirm with:

```
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests rev-parse --abbrev-ref HEAD
```

and the same for plants; both must print `feat/NO_JIRA-frontend-alignment`.

---

## 7. Out of scope

Leave all of this alone, however tempting.

- **The handshake itself.** No change to `ins-handshake.js`, `journey-registry.js`, `party-picker`, or
  any save/cancel redirect. This stage only widens the CSP directive that a redirect crosses.
- **Any new cross-service link.** `context.js` builds the Address book link in animals and plants and
  `dashboard/view-model/list.js` builds the journey links in ins. None of them changes.
- **The address-book API**, its client, stub or view models.
- **Renaming the animals cookie.** Ruled out explicitly: `sid` stays.
- **`docker/stack/frontend.compose.yml`.** The workspace repo is not in this stage's repo list, and
  plants picks up `plants-sid` from the `NODE_ENV=development` default with no compose edit. Do not add
  an `AUTH_SESSION_COOKIE_NAME=plants-sid` line, and do not remove ins's existing one.
- **`cdp-app-config` or any CDP platform repo.** Nothing here needs a platform change: production
  defaults to `sid` for all three, exactly as today.
- **`src/server/app/docs/services.md` in any repo.** Those tables cover service base URLs. ins has had
  `AUTH_SESSION_COOKIE_NAME` undocumented since it was added, and no test enforces the table, so adding
  rows now would create drift between the three docs for no gain.
- **`bin/cdp-session-probe.ts` in the tests repo.** Its `stripToAuthCookie(...)` call skips
  `authCookieNameFor` and always uses the default `'sid'`. That is a real latent inconsistency, and it
  is not this stage's.
- **The single `AUTH_SESSION_COOKIE_NAME` env var shared by the `ins` and `plants` entries in
  `fixtures/auth-state.ts`.** If that variable is ever set in the Playwright runner's own environment
  it would override *both* targets to the same name. It is not set there today (only inside the ins
  container), and D11 says mirror the ins shape. Record it as an open question on the stage; do not
  redesign the fixture.
- **The other URL-typed convict keys** (`tradeImports*Api.baseUrl`) still on `format: String`. Only the
  sibling-frontend key is converted, because only it is fed to `new URL(...)` by this stage's code.
- **The neighbouring open questions the brief names**: the countries stage's wider
  content-security-policy question and the tooling stage's wider auth-plugin-test question. This stage
  closes exactly the two gaps in §"re-measurement" and does not widen into either.
