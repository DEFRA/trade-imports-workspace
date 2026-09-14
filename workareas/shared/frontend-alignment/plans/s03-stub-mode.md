# s03-stub-mode — collapse `INS_MODE` and `AUTH_STUB_MODE` into `STUB_MODE`

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (already checked out, level with `origin`, clean tree, HEAD `a62945d`).

Reference files (all in the journey frontends; animals and plants are byte-identical for the first two):

- `repos/trade-imports-animals-frontend/src/server/common/services/mode.js` — the target `mode.js`, **verbatim**.
- `repos/trade-imports-plants-frontend/src/server/common/services/mode.test.js` — the target `mode.test.js`, **verbatim**
  (identical to animals').
- `repos/trade-imports-animals-frontend/src/config/config.js` lines 236–241 — the `stubMode` convict entry.
- `repos/trade-imports-animals-frontend/playwright.config.js` — the `webServer.env` shape and the header comment.
- `repos/trade-imports-animals-frontend/vitest.config.js` — the `env: { STUB_MODE: 'true' }` line and its comment.
- `repos/trade-imports-plants-frontend/src/plugins/auth.js` — the comment wording at the two stub-mode call sites.
- `repos/trade-imports-plants-frontend/src/plugins/auth.test.js` — the `isStubMode` mock and the stub-mode register test.
- `repos/trade-imports-plants-frontend/src/server/auth/controller.test.js` — the `config.set('stubMode', false)` bracket.
- `repos/trade-imports-plants-frontend/src/server/app/services/run-mode.test.js` lines 136–151 — the env-var
  resolution test shape (`process.env` set + `vi.resetModules()` + dynamic import).
- `repos/trade-imports-plants-frontend/README.md` lines 174–178 and
  `repos/trade-imports-plants-frontend/.github/workflows/check-pull-request.yml` lines 89–94 — the prose.

Baseline (from s02's closing ladder on `a62945d`, `logs/s02-relative-imports-ins-test.log`): unit suite
**48 files / 241 tests green**, `format:check` clean, `lint` clean, Playwright 49/49 green.
Expected after this stage: **48 files / 245 tests** (see §5 for the arithmetic), Playwright still 49/49.

This stage is a **behaviour change, named by the brief**. ins today reads two independent flags — `INS_MODE=stub`
(`config.runMode`, selects the in-memory address-book / countries / INS-backend clients) and `AUTH_STUB_MODE=true`
(`config.auth.stubMode`, replaces the Defra ID OIDC round-trip with `stub-sign-in.js`). After this stage it reads one,
`STUB_MODE=true` (`config.stubMode`), through `isStubMode()` in `src/server/common/services/mode.js`, exactly as
animals and plants do. `isAuthStubMode()`, `isRealMode()` and `mode()` cease to exist. The strict-boolean convict
format that guarded `AUTH_STUB_MODE` now guards `STUB_MODE`. Nothing moves; no file is created or deleted; 16 files
change content (E1–E16, one edit block per file).

---

## 0. Decisions (made here so the implementor never has to choose)

| # | Question the brief left open | Decision |
|---|---|---|
| D1 | animals' `mode.js` carries a 10-line doc comment; invariant 6 says comments are removed aggressively. Keep it? | **Keep it — the brief says "verbatim", and it is a *why* comment (the production-refusal security rationale), which `code-style.md` §15 allows.** The word "journey" in it is slightly off for ins; verbatim wins over a one-word tweak that would make ins the odd fork out. |
| D2 | Where does `stubMode` sit in `config.js`, and which doc string? | **Between `defraId` and `auth`, where animals has it; animals' doc string verbatim.** It names "the address book, backend and reference data", which is exactly ins's three clients. `format: 'strict-boolean'` (ins's format, per the brief) replaces animals' `format: Boolean`. The `strict-boolean` `addFormat` block and its comment stay as they are — the comment ("security/environment-gating flags use this stricter format") is still true. |
| D3 | ins's cookie `redirectTo` sends unauthenticated requests to `/auth/stub-sign-in` in stub mode and to `/auth/sign-in` otherwise. Plants instead always redirects to `/auth/sign-in` and has `stub-sign-in.js` register **both** paths. Adopt plants' shape? | **No — replace the call (`isAuthStubMode()` → `isStubMode()`) and nothing else.** Plants' shape is a different stub-sign-in design (it also fixes the pre-existing dead "try again" link in `auth/unauthorised.njk`, which points at `/auth/sign-in` and 404s in ins stub mode). That is a behaviour change beyond this brief and no stage owns it; recorded in the stage's `openQuestions`. |
| D4 | `mode.test.js` mocks `config.get` and asserts `mode()`, `isRealMode()`, `isStubMode()` against `runMode`. Edit it or replace it? | **Replace it with plants' file verbatim.** Two of its three subjects are deleted, and the plants file pins the one thing that matters about the new helper — the production refusal — which the old file never tested. |
| D5 | `plugins/auth.test.js`: ins does not mock `mode.js` (its mocked `config.get('auth.stubMode')` returned `undefined`); plants mocks it with `isStubModeMock` and has a stub-mode register test. | **Adopt plants' mock and plants' stub-mode register test**, minus plants' bare `expect(isStubModeMock).toHaveBeenCalled()` line (the testing guide bans bare `toHaveBeenCalled`). **Add one ins-only test** for the `redirectTo` stub-mode branch (D3 keeps that branch, and it has never been pinned). |
| D6 | The brief keeps the strict-boolean format on the new flag but nothing tests the format today. Add a pin? | **Yes — three tests in `config.test.js`** (env `true` → `true`; env unset → `false`; env `flase` → `config.validate` throws `must be 'true' or 'false'`). They use plants' `run-mode.test.js` shape: `process.env` set, `vi.resetModules()`, dynamic `import('./config.js')`, restore in `afterEach`. Not padding: it is the one piece of ins hardening this stage explicitly carries forward, and the env-var → convict plumbing is what the rest of the stage rests on. |
| D7 | With `vitest.config.js` now setting `STUB_MODE=true`, `auth/controller.test.js` (which injects against the real OIDC routes `/auth/sign-in`, `/auth/sign-in-oidc`, …) would boot a stub-mode server that does not register `authRoutes` at all. | **Bracket it with `config.set('stubMode', false)` / restore, plants' shape.** No `fetch` stub (plants needs one because it primes countries at boot; ins primes nothing). Every other server-booting test either mocks `config.js` outright, never hits an auth route, or runs with `auth.enabled=false`, so it is indifferent to the mode. |
| D8 | `playwright.config.js`: animals carries a 3-line comment above `env`; the header comment says the same thing. | **Header comment reworded to animals' sentence; `env` collapsed to animals' one-liner `{ PORT: String(port), STUB_MODE: 'true' }` with no comment of its own.** One explanation, not two. |
| D9 | `vitest.config.js`: copy animals' comment with the `env` line? | **Yes, verbatim** — "Tests that exercise real mode set the flag themselves and restore it" is the rule D7 applies, and the next person to write a real-mode test needs it. |
| D10 | Brief says update `compose.yml` and "any .env example". | **Nothing to change.** `compose.yml` sets no mode variable (verified: its `environment` block is PORT / NODE_ENV / REDIS_* / LOG_FORMAT / SESSION_COOKIE_SECURE / USE_SINGLE_INSTANCE_CACHE). No `.env*` file exists in the repo (only `compose/aws.env`, which is AWS credentials). `grep -rln INS_MODE\|AUTH_STUB_MODE` across the whole workspace outside the ins repo hits only this programme's own workarea files, so the workspace stack, `docker/`, `scripts/` and the tests repo carry nothing to change either. |
| D11 | The stub clients' header comments say "selected by runMode=stub (see mode.js)"; `stub-sign-in.js` says "when auth.stubMode is on"; `fit/address-form.js` says "only reachable when AUTH_STUB_MODE=true"; `plugins/auth.js` says "In auth.stubMode". | **Make each existing comment true again with the smallest word swap** (s01 D7 precedent): `runMode=stub` → `STUB_MODE=true`; `auth.stubMode is on` → `stub mode is on` (plants' wording); `AUTH_STUB_MODE=true` → `STUB_MODE=true` (plants' `fit/sign-in.js` wording); `In auth.stubMode` → `In stub mode` (plants' wording). No new comments, no migration comments. |
| D12 | The three real-client tests (`address-book-client.test.js`, `countries-client.test.js`, `ins-backend-client.test.js`) import the selector module and rely on their mocked `config.get` returning `undefined` for the mode key so the real client is picked. | **Leave them untouched.** `undefined && …` is falsy, so `isStubMode()` is `false` and the real client is selected, exactly as `undefined === 'stub'` was `false` before. s04 rewrites these tests when the clients become `app/services/*/{index,client,stub}.js`. |
| D13 | `runMode` had **no** production guard — `INS_MODE=stub` in production would have served stub data. `isStubMode()` refuses the flag in production. | **Accepted as a behaviour change and named in §9.** It is the animals behaviour the brief orders, and it is safer. |
| D14 | Playwright is not on this stage's ladder… | …but it **is** on the ladder this time (`test:fit` is the fourth rung). It is the only check that boots the real app under plain `node .` with the new env and walks the stub sign-in, so it is the proof that `STUB_MODE=true` reaches both halves. |

---

## 1. Moves — every file that moves or is deleted

**None.** No file moves, no file is created, no file is deleted. `mode.js` and `mode.test.js` are rewritten in
place (their content is replaced, but `git` sees an edit to the same path).

---

## 2. Edits — every file whose content changes, and exactly what changes

Do these with the Edit tool. Paths are relative to the ins repo root. Where a block is marked **verbatim**, copy it
from the reference file with the Read tool — do not retype from this plan.

### E1. `src/server/common/services/mode.js` — replace the whole file

Today (9 lines: `mode`, `isRealMode`, `isStubMode`, `isAuthStubMode`). Becomes animals'
`src/server/common/services/mode.js` **verbatim** (D1) — the import line is already identical
(`import { config } from '../../../config/config.js'`), so the whole file is a straight copy:

```js
import { config } from '../../../config/config.js'

/** One switch for "run against stubs rather than the real thing", covering both
 * the data the journey reads and the way a trader signs in. There is no
 * configuration that wants one without the other: a stub run is self-contained
 * and needs neither the dependent services nor Defra ID, and a real run wants
 * both.
 *
 * Never honoured in production, whatever the environment says. Stub mode signs
 * its own sessions with a key committed to this repo, so obeying the flag in
 * production would let anyone able to set an environment variable mint an
 * authenticated session. */
export const isStubMode = () =>
  config.get('stubMode') && !config.get('isProduction')
```

Use Write for this file (full replacement), then diff it against the animals file:
`diff ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/common/services/mode.js ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/services/mode.js`
must print nothing.

### E2. `src/config/config.js` — one entry added, two removed

**Remove** the `stubMode` member of `auth` (today lines 272–277):

```js
    stubMode: {
      doc: 'Skip the real Defra ID OIDC exchange and locally sign a stub session instead. Auth is still enforced - only the external OIDC round-trip is bypassed. Ignored outside non-production (see isAuthStubMode).',
      format: 'strict-boolean',
      default: false,
      env: 'AUTH_STUB_MODE'
    }
```

so that `auth` becomes exactly animals' shape:

```js
  auth: {
    enabled: {
      doc: 'Enable authentication (Bell + session cookie)',
      format: Boolean,
      default: true,
      env: 'AUTH_ENABLED'
    }
  },
```

(note the trailing `,` after `enabled`'s closing brace must go — it was there to separate `enabled` from `stubMode`).

**Remove** the top-level `runMode` entry (today lines 279–284):

```js
  runMode: {
    doc: "real calls the Address Book and Reference Data APIs; stub returns canned in-memory data with no network calls, mirroring trade-imports-animals-frontend's LIVE_ANIMALS_MODE.",
    format: ['real', 'stub'],
    default: 'real',
    env: 'INS_MODE'
  },
```

**Add**, immediately after the `defraId` block's closing `},` and before `auth: {` (D2), animals' entry with ins's
format:

```js
  stubMode: {
    doc: 'Run against stubs rather than real dependencies: stub data in place of the address book, backend and reference data, and a locally signed session in place of the Defra ID OIDC exchange. Auth is still enforced - only the external OIDC round-trip is bypassed. Ignored in production (see isStubMode).',
    format: 'strict-boolean',
    default: false,
    env: 'STUB_MODE'
  },
```

The `doc` string is animals' line 237 verbatim. Everything else in `config.js` — the `strict-boolean` `addFormat`
block and its comment, every other key, `config.validate({ allowed: 'strict' })` — is untouched.

### E3. `src/plugins/auth.js` — import, two call sites, two comments

| Today | Becomes | Why |
|---|---|---|
| `import { isAuthStubMode } from '../server/common/services/mode.js'` | `import { isStubMode } from '../server/common/services/mode.js'` | plants line 7 verbatim |
| `      // In auth.stubMode, skip Bell/Defra ID entirely - stub-sign-in.js writes` | `      // In stub mode, skip Bell/Defra ID entirely - stub-sign-in.js writes` | plants line 22 verbatim (D11) |
| `      if (isAuthStubMode()) {` | `      if (isStubMode()) {` | plants line 24 verbatim |
| `      // In auth.stubMode, authRoutes (and its /auth/sign-in route) is never` | `      // In stub mode, authRoutes (and its /auth/sign-in route) is never` | D11 |
| `      const signInPath = isAuthStubMode()` | `      const signInPath = isStubMode()` | D3 — call replaced, branch kept |

The rest of the file — `getBellOptions`, the `encodeURIComponent` in `redirectTo`, the try/catch around
`refreshTokens`, every other comment — is untouched.

### E4. `src/server/server.js` — import and one call site

| Today | Becomes |
|---|---|
| `import { isAuthStubMode } from './common/services/mode.js'` | `import { isStubMode } from './common/services/mode.js'` |
| `      ? [authPlugin, isAuthStubMode() ? stubSignInRoutes : authRoutes]` | `      ? [authPlugin, isStubMode() ? stubSignInRoutes : authRoutes]` |

(Plants' `server.js` lines 13 and 79 verbatim.) Import order and everything else stay.

### E5. `src/server/auth/stub-sign-in.js` — one comment word swap (D11)

| Today | Becomes |
|---|---|
| ` * Replaces the real Defra ID OIDC round-trip when auth.stubMode is on` | ` * Replaces the real Defra ID OIDC round-trip when stub mode is on` |

(Plants' line 68 of the same doc comment reads exactly this.) Nothing else — the per-process random secret, the
single `/auth/stub-sign-in` route, `DEFAULT_STUB_USER` — changes (D3).

### E6. `src/server/common/clients/address-book-client.stub.js` — one comment word swap (D11)

| Today | Becomes |
|---|---|
| ` * In-memory stand-in for the real Address Book API, selected by runMode=stub` | ` * In-memory stand-in for the real Address Book API, selected by STUB_MODE=true` |

### E7. `src/server/common/clients/ins-backend-client.stub.js` — one comment word swap (D11)

| Today | Becomes |
|---|---|
| ` * In-memory stand-in for the real INS Backend API, selected by runMode=stub` | ` * In-memory stand-in for the real INS Backend API, selected by STUB_MODE=true` |

(`countries-client.stub.js` has no such comment — no edit.)

### E8. `src/server/address-book/fit/address-form.js` — one comment word swap (D11)

| Today | Becomes |
|---|---|
| ` * real Defra ID stub involved, only reachable when AUTH_STUB_MODE=true.` | ` * real Defra ID stub involved, only reachable when STUB_MODE=true.` |

(Plants' `fit/sign-in.js` line 3 verbatim.)

### E9. `playwright.config.js` — header comment and `webServer.env` (D8)

Replace the header comment (lines 3–9) with:

```js
/**
 * Playwright config for this app's feature coverage (address book, dashboard).
 * Fully self-contained - STUB_MODE=true is set for the webServer below, which
 * serves stub data and skips the Defra ID OIDC exchange, so no other service
 * needs to be running.
 */
```

(Animals' header, sentences 2–3 verbatim; sentence 1 keeps ins's own description of what the suite covers.)

Replace the `env` object (lines 32–36):

```js
      env: {
        PORT: String(port),
        INS_MODE: 'stub',
        AUTH_STUB_MODE: 'true'
      },
```

with animals' line 62 verbatim:

```js
      env: { PORT: String(port), STUB_MODE: 'true' },
```

`testDir`, `testMatch`, timeouts, `use`, `command`, `url`, `reuseExistingServer` all stay.

### E10. `vitest.config.js` — add the env (D9)

After `    clearMocks: true,` insert animals' lines 8–11 verbatim:

```js
    // The service default is real mode; the unit suite opts into stub, the same
    // way the Playwright suite does. Tests that exercise real mode set the flag
    // themselves and restore it.
    env: { STUB_MODE: 'true' },
```

Everything else (`exclude`, `coverage`) stays. Do **not** add animals' `setupFiles` — that is journey machinery.

### E11. `.github/workflows/check-pull-request.yml` — the comment above the `playwright` job

Replace lines 53–55:

```yaml
  # This Playwright suite boots the app itself with INS_MODE=stub and
  # AUTH_STUB_MODE=true, so it needs no workspace stack. Kept out of
  # pr-validator so a browser run does not sit in front of the other checks.
```

with:

```yaml
  # This Playwright suite boots the app itself with STUB_MODE=true - stub data
  # and a locally signed session in place of the Defra ID round-trip, auth still
  # enforced (see src/server/auth/stub-sign-in.js) - so it needs no workspace
  # stack. Kept out of pr-validator so a browser run does not sit in front of
  # the other checks.
```

(Plants' lines 89–94 wording, minus its "two Playwright projects" clause — ins has one.) No step, name, `run` or
`uses` changes.

### E12. `README.md` — one paragraph added

In the section `## AUTHENTICATION (trade-imports-defra-id-stub)`, after the closing fence of the env-file block
(`DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi` / ` ``` `) and before `### Git hooks`, insert plants' README
lines 174–178 verbatim, as its own paragraph with a blank line either side:

```md
Alternatively set `STUB_MODE=true`, which serves stub data and signs its own
session instead of doing the Defra ID OIDC exchange. Auth is still enforced —
only the external round-trip is bypassed — and the switch is refused in
production. The Playwright suite sets it for its own web server, so
`npm run test:fit` needs no other service running.
```

Nothing else in the README changes (its stale "Core delivery platform Node.js Frontend Template" heading and
`trade-imports-animals-workspace` link are s11's business).

### E13. `src/server/common/services/mode.test.js` — replace the whole file (D4)

Use Write. Content is plants' `src/server/common/services/mode.test.js` **verbatim** (identical to animals'):

```js
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { isStubMode } from './mode.js'

const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('../../../config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

const withConfig = ({ stubMode, isProduction }) => {
  configGetMock.mockImplementation((key) =>
    key === 'stubMode' ? stubMode : isProduction
  )
}

describe('#isStubMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should be on when the flag is set outside production', () => {
    withConfig({ stubMode: true, isProduction: false })

    expect(isStubMode()).toBe(true)
  })

  test('Should be off in production even when the flag is set', () => {
    // The reason this helper exists rather than reading the flag directly.
    // Stub mode signs its own sessions with a key committed to this repo, so
    // honouring the flag in production would mean anyone able to set an
    // environment variable could mint an authenticated session. It would also
    // serve stub data in place of the real address book and backend.
    withConfig({ stubMode: true, isProduction: true })

    expect(isStubMode()).toBe(false)
  })

  test('Should be off when the flag is not set', () => {
    withConfig({ stubMode: false, isProduction: false })

    expect(isStubMode()).toBe(false)
  })

  test('Should be off in production when the flag is not set', () => {
    withConfig({ stubMode: false, isProduction: true })

    expect(isStubMode()).toBe(false)
  })
})
```

Then `diff` it against the plants file the same way as E1; must print nothing.

### E14. `src/plugins/auth.test.js` — mock `mode.js`, add two tests (D5)

**a.** After `const getSafeRedirectMock = vi.hoisted(() => vi.fn())` add:

```js
const isStubModeMock = vi.hoisted(() => vi.fn())
```

**b.** After the `vi.mock('../auth/get-safe-redirect.js', …)` block add (plants lines 31–33 verbatim):

```js
vi.mock('../server/common/services/mode.js', () => ({
  isStubMode: isStubModeMock
}))
```

**c.** In the outer `beforeEach`, after `vi.clearAllMocks()` and before `getOidcConfigWithRetryMock.mockResolvedValue(oidcConfig)`, add:

```js
    isStubModeMock.mockReturnValue(false)
```

**d.** After the first test (`register registers Bell + cookie strategies and sets default auth to session`) and
before `register registers no Bell strategy when OIDC discovery fails`, add plants' test (lines 118–133) — the
comment included, the bare `toHaveBeenCalled` line in the first test **not** added:

```js
  test('register skips Bell and the OIDC fetch in stub mode, still enforcing session auth', async () => {
    // Stub mode replaces the Defra ID round-trip, not authentication itself:
    // stub-sign-in.js writes the session that the cookie strategy then checks,
    // so the strategy and the default must still be in place. Reaching for the
    // OIDC config would also fail outright — there is no identity provider
    // configured in the environments stub mode is meant for.
    isStubModeMock.mockReturnValue(true)
    const server = buildServer()

    await authPlugin.plugin.register(server)

    expect(server.auth.strategy).toHaveBeenCalledTimes(1)
    expect(server.auth.strategy.mock.calls[0][0]).toBe('session')
    expect(server.auth.default).toHaveBeenCalledWith('session')
    expect(getOidcConfigWithRetryMock).not.toHaveBeenCalled()
  })
```

**e.** Inside `describe('getCookieOptions', …)`, immediately after the existing
`redirectTo builds /auth/sign-in redirect including pathname and search` test, add the ins-only pin for the branch D3
keeps:

```js
    test('redirectTo sends unauthenticated requests to /auth/stub-sign-in in stub mode', () => {
      isStubModeMock.mockReturnValue(true)
      const options = getCookieOptions()

      const redirect = options.redirectTo({
        url: {
          pathname: '/origin',
          search: '?a=1'
        }
      })

      expect(redirect).toBe('/auth/stub-sign-in?redirect=%2Forigin%3Fa%3D1')
    })
```

Every existing test and assertion stays as it is (the outer `beforeEach` resets the mock to `false` before each one).

### E15. `src/server/auth/controller.test.js` — real-mode bracket (D7)

**a.** Add the import, after `import { createServer } from '../server.js'`:

```js
import { config } from '../../config/config.js'
```

**b.** Replace the `describe('#authController', …)` opening through `afterAll` (today):

```js
describe('#authController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })
```

with (plants lines 36–53, minus the `fetch` stub lines):

```js
describe('#authController', () => {
  const originalMode = config.get('stubMode')
  let server

  beforeAll(async () => {
    config.set('stubMode', false)
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    config.set('stubMode', originalMode)
  })
```

`beforeEach`, every test and every `vi.mock` stay as they are.

### E16. `src/config/config.test.js` — three `stubMode` tests (D6)

**a.** Add at the top, above `import { config } from './config.js'`:

```js
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
```

(the file relies on globals today; the new tests use `vi`, and importing all of them is what `mode.test.js` and
`plugins/auth.test.js` do).

**b.** After the import block, before `describe('#config', …)`, add the save/restore helper (plants
`run-mode.test.js` lines 3 and 21–27, renamed to say what it restores):

```js
const originalStubMode = process.env.STUB_MODE

const restoreStubMode = () => {
  if (originalStubMode === undefined) {
    delete process.env.STUB_MODE
  } else {
    process.env.STUB_MODE = originalStubMode
  }
}
```

**c.** Inside `describe('#config', …)`, after the last existing test (`Defra ID redirect URLs use port 3002`), add:

```js
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
```

`vi.resetModules()` clears the module registry so each dynamic `import('./config.js')` re-runs convict against the
current `process.env`; the static `config` import at the top of the file keeps its original binding, so the four
existing tests are unaffected. The third test relies on `config.validate({ allowed: 'strict' })` running at module
load — a bad value rejects the import itself; convict's message is
`stubMode: must be 'true' or 'false': value was "flase"`, so the substring match is exact to the format's own error.

### Files that mention the old names and must NOT be edited

None remain after E1–E16. The §6B grep is the proof.

### Files the brief names that need no edit (D10)

`compose.yml` (no mode variable), `Dockerfile` (no env), `.github/workflows/publish*.yml` (no env), `compose/aws.env`
(AWS credentials only). There is no `.env`, `.env.example` or `.env.sample` in the repo.

---

## 3. New files

None.

---

## 4. Imports — the rule

1. **No specifier changes.** Every import path this stage touches keeps its spelling; only the imported *name* changes,
   and only in two files: `src/plugins/auth.js` and `src/server/server.js`, both `isAuthStubMode` → `isStubMode`.
2. **One new `vi.mock` specifier** in `src/plugins/auth.test.js`: `'../server/common/services/mode.js'` — the same
   relative path `src/plugins/auth.js` already imports, so it resolves to the same module.
3. **One new import** in `src/server/auth/controller.test.js`: `'../../config/config.js'` (the path
   `src/server/auth/controller.js`'s neighbours already use for config).
4. `mode.js`'s own import (`'../../../config/config.js'`) is unchanged by the verbatim copy — it is the same line in
   animals.
5. The three selector modules (`address-book-client.js`, `countries-client.js`, `ins-backend-client.js`) already
   import `isStubMode` from `'../services/mode.js'` — **no edit**; the export they use survives.

---

## 5. Tests

### Tests that are replaced

| Test | Was | Becomes | Pins |
|---|---|---|---|
| `src/server/common/services/mode.test.js` | 5 tests over `mode()`, `isRealMode()`, `isStubMode()` against `runMode` | plants' 4 tests over `isStubMode()` (E13) | Flag on outside production → on; flag on **in production → off** (the security property); flag off → off in either environment. |

### Tests that change

| Test | Change | Pins |
|---|---|---|
| `src/plugins/auth.test.js` (E14) | `mode.js` mocked; +1 plants test; +1 ins test | (new) In stub mode `register` sets only the `session` strategy, still defaults to it, and never fetches OIDC config. (new) In stub mode the cookie strategy's `redirectTo` targets `/auth/stub-sign-in` with the encoded return URL. (kept) Everything the file pinned before, now with `isStubMode` explicitly `false`. |
| `src/server/auth/controller.test.js` (E15) | Boots the server with `stubMode=false`, restores after | The five real-OIDC route tests keep running against `authRoutes` although the suite default is now stub mode. Same assertions as today. |
| `src/config/config.test.js` (E16) | +3 tests | `STUB_MODE=true` → `stubMode` `true`; unset → `false`; a value that is neither `'true'` nor `'false'` fails `config.validate` with the strict-boolean message — the ins hardening the brief keeps. |

### Tests that are new

None as files; the new cases are listed above.

### Tests that are deleted

None as files.

### Arithmetic

Baseline 48 files / 241 tests. `mode.test.js` 5 → 4 (−1). `plugins/auth.test.js` +2. `config.test.js` +3.
`auth/controller.test.js` ±0. **Expected: 48 files / 245 tests.** If the count differs, a test was lost or gained —
find it before going on.

### Tests that are indifferent to the new default (do not touch them)

- Every `address-book/*/controller.test.js`, `routes/home/controller.test.js`: they `vi.mock` the client modules,
  so the selector's choice is never exercised.
- `signout/controller.test.js`, `health/controller.test.js`, `csrf.test.js`, `content-security-policy.test.js`,
  `errors.test.js`, `serve-static-files.test.js`, `start-server.test.js`: they boot the server in stub mode now
  (`stubSignInRoutes` in place of `authRoutes`, no Bell strategy) and never inject against an auth route or the
  `defra-id` strategy.
- `router.test.js`: runs with `auth.enabled=false`, so neither route set is registered.
- `common/clients/*.test.js`: D12.
- `__mocks__/address-book-client.js`: `vi.importActual('../address-book-client.js')` evaluates the selector in stub
  mode now, but only `mapApiErrorsToFormErrors` is re-exported, and that comes from the real module either way.

---

## 6. Invariants to prove

Every command is one Bash call; test output goes to a file under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/` that is read once with the Read tool.

**A. Ladder** (the stage's four rungs, in order). If `format:check` fails, run
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format` once and re-run the rung.

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format:check > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s03-format.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run lint > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s03-lint.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend test > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s03-test.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run test:fit > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s03-fit.log 2>&1
```

`s03-test.log` must show `Test Files  48 passed (48)` and `Tests  245 passed (245)`. `s03-fit.log` must show 49
passed. If the fit log says the Chromium browser is missing, run
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run playwright:install` once and
run the rung again. On a Playwright failure read `test-results/*/error-context.md` inside the repo, not the log tail.
The fit suite is the proof that one variable now reaches both halves: `webServer` boots `node .` with only
`STUB_MODE=true`, the specs sign in through `/auth/stub-sign-in` (sign-in half) and walk `/address-book` and `/`
against the in-memory clients (data half).

**B. Invariant 2 — no old name survives.** Must return nothing:

```
grep -rn -e INS_MODE -e AUTH_STUB_MODE -e isAuthStubMode -e isRealMode -e runMode -e "auth.stubMode" -e LIVE_ANIMALS_MODE ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.public --exclude-dir=coverage --exclude-dir=playwright-report --exclude-dir=test-results
```

**C. Invariant 1 — public URL surface unchanged.** Run s01's route grep:

```
grep -rn "path: '" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/plugins --include="*.js" --exclude="*.test.js" --exclude="*.spec.js"
```

(quote the globs — the shell is zsh). The set must be exactly s01's closing set: `/auth/stub-sign-in`,
`/auth/sign-in`, `/auth/sign-in-oidc`, `/auth/sign-out`, `/auth/sign-out-oidc`, `/auth/organisation`, `/favicon.ico`,
`${config.get('assetPath')}/{param*}`, `/signout`, `/address-book/{id}/delete` (x2), `/address-book/{id}/edit` (x2),
`/address-book/add` (x2), `/address-book`, `/address-book/{id}`, `/`, `/health` — plus the cookie `path: '/'` in
`src/plugins/auth.js`, which is not a route. Nothing added, nothing missing.

**D. The new flag reaches convict.** Must return exactly one hit, in `src/config/config.js`:

```
grep -rn "env: 'STUB_MODE'" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```

and this must return exactly two hits, `playwright.config.js` and `vitest.config.js`:

```
grep -rln "STUB_MODE: 'true'" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend --exclude-dir=node_modules --exclude-dir=.git
```

**E. Invariant 6/7 — comments and names.** `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --stat` must list exactly these 16 files and no other:

```
.github/workflows/check-pull-request.yml
README.md
playwright.config.js
vitest.config.js
src/config/config.js
src/config/config.test.js
src/plugins/auth.js
src/plugins/auth.test.js
src/server/server.js
src/server/auth/controller.test.js
src/server/auth/stub-sign-in.js
src/server/common/clients/address-book-client.stub.js
src/server/common/clients/ins-backend-client.stub.js
src/server/address-book/fit/address-form.js
src/server/common/services/mode.js
src/server/common/services/mode.test.js
```

(one per edit block E1–E16 — count them). Read the full diff once
(`git -C … diff > …/logs/s03-full-diff.log`) and check that no hunk outside E1–E16 exists: no import reordering,
no identifier rename other than `isAuthStubMode` → `isStubMode`, no comment other than the D11 word swaps and the
verbatim blocks, no "was previously" / "renamed from" wording anywhere.

**F. Invariant 4 — no cross-repo import.** Must return nothing:

```
grep -rn "from '.*trade-imports-\(animals\|plants\)" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```

**G. Invariant 5 — copy files.** Not applicable; s07 has not run and this stage creates no user-facing string
(`README.md` and the CI comment are developer prose, not copy).

**H. Invariant 8 — network-boundary mocks.** The one module-boundary mock this stage adds (`mode.js` in
`plugins/auth.test.js`) has no network behind it; the nock-based client tests are untouched (D12).

---

## 7. Commit

Stage everything (`git -C … add -A`), then commit on `feat/NO_JIRA-frontend-alignment`:

```
refactor(alignment): s03-stub-mode — collapse INS_MODE and AUTH_STUB_MODE into STUB_MODE

One flag, read through isStubMode(), now switches both the in-memory
clients and the stub sign-in together and is refused in production,
the way the journey frontends do it.
```

plus the required trailers. Do not push to `main`; do not merge.

---

## 8. Out of scope — leave alone even though it is tempting

- **Plants' dual-path `stub-sign-in.js`** (registers `/auth/sign-in` as well as `/auth/stub-sign-in`, unconditional
  `redirectTo`) and its committed signing key / `contactId` / `currentRelationshipId` session fields — D3. ins keeps
  its conditional `redirectTo`, its per-process random secret and its single route. The dead "try again" link in
  `src/server/auth/unauthorised.njk` (`/auth/sign-in` 404s in stub mode) is pre-existing and stays.
- **The three real-client tests** and their `undefined`-keyed mocked config — D12; s04.
- **`src/server/common/clients/*` layout** (`.real.js` / `.stub.js` / selector) — s04 reshapes it into
  `app/services/*/{index,client,stub}.js`. Do not rename, do not move.
- **`setupProxy`, `setupFiles`, priming at boot** — journey machinery; never comes to ins.
- **`README.md` beyond E12** — its template heading, the `trade-imports-animals-workspace` link, the missing
  `STUB_MODE` entry in any table: s11.
- **`src/server/common/test-helpers/mock-auth.js`** — the target tree splits it; not here.
- **The `strict-boolean` format** — keep it exactly as it is, including its comment. Do not widen it to other Boolean
  keys (`auth.enabled`, `isSecureContextEnabled`, …); that is a separate hardening the programme may backport in s12.
- **`docker/`, `scripts/`, the tests repo, `cdp-app-config`** — nothing there sets either old variable (D10). If
  a CDP environment ever set `INS_MODE` or `AUTH_STUB_MODE`, that config lives outside this workspace and outside AI
  hands; it is listed as a risk in the stage's structured output, not acted on.
- **The two journey repos** — this stage touches `ins` only.
- Any comment tidy-up, identifier rename, import reordering or blank-line change beyond E1–E16.

---

## 9. Behaviour changes (named, per invariant 2)

1. **`INS_MODE` and `AUTH_STUB_MODE` are no longer read.** `STUB_MODE` (`'true'` / `'false'` only — anything else
   fails startup with `stubMode: must be 'true' or 'false'`) switches both the in-memory address-book / countries /
   INS-backend clients and the locally-signed stub sign-in together. Running stub data behind real Defra ID, or the
   real address book behind a stub session, is no longer expressible.
2. **Stub data is now refused in production.** `runMode` had no environment guard — `INS_MODE=stub` on a
   `NODE_ENV=production` process served in-memory data. `isStubMode()` returns `false` in production whatever the
   flag says (D13). The stub sign-in already had this guard; it keeps it.
3. **The unit suite runs in stub mode by default** (`vitest.config.js` env), the way animals' and plants' do. Tests
   that need real mode set `config.set('stubMode', false)` and restore it (`auth/controller.test.js` is the one that
   does).
4. **The Playwright web server boots with one variable** (`STUB_MODE=true`) instead of two. Same routes, same stub
   data, same sign-in path.

Nothing user-visible changes for a signed-in trader in either mode: the route surface (§6C), the stub datasets, the
address-book flows and the dashboard render as before.
