# s01-chassis-moves — move the chassis into the animals layout

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (already checked out, level with `main` at `d26cd35`, clean tree).

Reference shape: `repos/trade-imports-plants-frontend` (the tidier fork — prefer it wherever animals and plants differ).

Baseline before this stage (logs in `workareas/shared/frontend-alignment/logs/s01-baseline-*.log`):
unit suite **49 files / 242 tests green**, `format:check` clean, `lint` clean.

This stage is a **pure relocation**. The only content that changes inside any file is an import or `vi.mock` specifier,
plus one path in one doc comment. No renames of identifiers, no comment tidying, no restructuring. The reviewer must be
able to read every hunk as "same file, new address".

---

## 0. Decisions (made here so the implementor never has to choose)

| # | Question the brief left open | Decision |
|---|---|---|
| D1 | Moved files carry `#/…` alias imports today. Rewrite them to the alias at the new depth, or to plants' relative form? | **Relative, exactly as plants writes the same file.** The file is being rewritten anyway, plants' shape is the target, and s02 (alias removal) then has nothing to do in these files. The alias itself stays in `package.json` and in every file this stage does not move. |
| D2 | Files that do **not** move but import a moved file (`server.js`, `logger.js`) — restyle their imports? | **No.** Change only the disturbed specifier, keep the existing spelling style (relative stays relative). `server.js` keeps `#/config/config.js` and `#/config/nunjucks/nunjucks.js` and keeps its current import order. |
| D3 | ins `pulse.js` names the timeout `tenSeconds`; plants names it `shutdownTimeoutMs`. Align now? | **No.** Content alignment of moved files is catalogued in §8 for a later stage; this stage's diff stays move-only. |
| D4 | ins `request-logger.js` has an `ignoreFunc` plants lacks; ins `serve-static-files.test.js` boots via `startServer()` where plants uses `createServer()+initialize()`; ins `content-security-policy.test.js` hits `/` with a session where plants hits `/health`. Backport or align? | **Leave every one of them as-is.** Recorded in §8. The programme purpose includes backporting ins hardening *to* the journeys; s01 is not where that happens. |
| D5 | `router.js` in plants registers app routes unconditionally and only gates `signout` on `auth.enabled`; ins gates every non-health route. Adopt plants' shape? | **No** — that is a behaviour change (`router.test.js` pins the gating). Only remove `about` and fix specifiers. s05 owns route shape. |
| D6 | `about` used `sessionAuthRouteOptions` from `common/constants/session-auth-route-options.js`. Delete the constant too? | **No** — `signout`, `address-book/add`, `address-book/list` and `routes/home` still import it. |
| D7 | Doc comment in `signout/index.js` says routes are "registered in src/server/plugins/router.js". | **Update the path** to `src/server/router.js` (plants has exactly that sentence). Not a migration comment — it is an existing comment made true again. The `stub-sign-in.js` comment "(see mode.js / plugins/auth.js)" stays: it is still accurate once `auth.js` lives in `src/plugins/`. |
| D8 | Use `git mv` or copy-and-delete? | **`git mv`**, one file per Bash call, so history follows each file and the commit renders as renames. |
| D9 | Playwright is not on this stage's ladder, but invariant 3 says the Playwright suite is green at the end of every stage. | **Run `npm run test:fit` once after the ladder** (§6, check C). It is the only check that boots the real app on a port and walks the address book, which is the strongest proof the moves did not break boot. |

---

## 1. Moves — every file that moves or is deleted

All paths are relative to the ins repo root. Tests move beside their source.

| From | To | Kind |
|---|---|---|
| `src/server/plugins/router.js` | `src/server/router.js` | move |
| `src/server/plugins/router.test.js` | `src/server/router.test.js` | move |
| `src/server/plugins/auth.js` | `src/plugins/auth.js` | move (new dir `src/plugins/`) |
| `src/server/plugins/auth.test.js` | `src/plugins/auth.test.js` | move |
| `src/server/plugins/csrf.js` | `src/plugins/csrf.js` | move |
| `src/server/plugins/csrf.test.js` | `src/plugins/csrf.test.js` | move |
| `src/server/plugins/content-security-policy.js` | `src/server/common/helpers/content-security-policy.js` | move |
| `src/server/plugins/content-security-policy.test.js` | `src/server/common/helpers/content-security-policy.test.js` | move |
| `src/server/plugins/pulse.js` | `src/server/common/helpers/pulse.js` | move |
| `src/server/plugins/request-tracing.js` | `src/server/common/helpers/request-tracing.js` | move |
| `src/server/plugins/serve-static-files.js` | `src/server/common/helpers/serve-static-files.js` | move |
| `src/server/plugins/serve-static-files.test.js` | `src/server/common/helpers/serve-static-files.test.js` | move |
| `src/server/plugins/logger-options.js` | `src/server/common/helpers/logging/logger-options.js` | move (dir exists — `logger.js` is already there) |
| `src/server/plugins/request-logger.js` | `src/server/common/helpers/logging/request-logger.js` | move |
| `src/server/plugins/session-cache.js` | `src/server/common/helpers/session-cache/session-cache.js` | move (dir exists — `cache-engine.js` is already there) |
| `src/server/routes/health/index.js` | `src/server/health/index.js` | move (new dir `src/server/health/`) |
| `src/server/routes/health/controller.js` | `src/server/health/controller.js` | move |
| `src/server/routes/health/controller.test.js` | `src/server/health/controller.test.js` | move |
| `src/server/routes/about/index.js` | — | **delete** |
| `src/server/routes/about/controller.js` | — | **delete** |
| `src/server/routes/about/controller.test.js` | — | **delete** |
| `src/server/routes/about/index.njk` | — | **delete** |

After the moves these directories must not exist: `src/server/plugins/`, `src/server/routes/health/`,
`src/server/routes/about/`. `src/server/routes/` itself **stays** (it still holds `home/` and `error/`).

Nothing in `pulse.js`, `request-tracing.js`, `logger-options.js`, `request-logger.js`, `session-cache.js` or
`health/index.js` has a test today; none is added (see §5).

### 1a. Exact command script (one Bash call each, in this order)

```
mkdir -p ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/plugins
mkdir -p ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/health
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/router.js src/server/router.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/router.test.js src/server/router.test.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/auth.js src/plugins/auth.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/auth.test.js src/plugins/auth.test.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/csrf.js src/plugins/csrf.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/csrf.test.js src/plugins/csrf.test.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/content-security-policy.js src/server/common/helpers/content-security-policy.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/content-security-policy.test.js src/server/common/helpers/content-security-policy.test.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/pulse.js src/server/common/helpers/pulse.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/request-tracing.js src/server/common/helpers/request-tracing.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/serve-static-files.js src/server/common/helpers/serve-static-files.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/serve-static-files.test.js src/server/common/helpers/serve-static-files.test.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/logger-options.js src/server/common/helpers/logging/logger-options.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/request-logger.js src/server/common/helpers/logging/request-logger.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/plugins/session-cache.js src/server/common/helpers/session-cache/session-cache.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/routes/health/index.js src/server/health/index.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/routes/health/controller.js src/server/health/controller.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend mv src/server/routes/health/controller.test.js src/server/health/controller.test.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend rm -r src/server/routes/about
rmdir ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/plugins
rmdir ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/routes/health
```

`git mv` leaves the emptied directories on disk; the two `rmdir` calls remove them (they are empty, so plain `rmdir`
works — never `rm -r`). If `rmdir` says "No such file or directory" the directory is already gone; move on.

---

## 2. Edits — every file whose content changes, and exactly what changes

Every edit below is an import / `vi.mock` specifier rewrite unless it says otherwise. Do them with the Edit tool,
one specifier at a time, after all moves in §1a are done. Nothing else in these files changes: no identifier renames,
no comment edits (except E14), no reordering of imports, no blank-line changes. Prettier will not reflow a bare
specifier change; if `format:check` complains, run `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format`.

### E1. `src/server/server.js` (does not move — D2: only disturbed specifiers change)

| Line today | Becomes |
|---|---|
| `import { router } from './plugins/router.js'` | `import { router } from './router.js'` |
| `import { authPlugin } from './plugins/auth.js'` | `import { authPlugin } from '../plugins/auth.js'` |
| `import { pulse } from './plugins/pulse.js'` | `import { pulse } from './common/helpers/pulse.js'` |
| `import { requestTracing } from './plugins/request-tracing.js'` | `import { requestTracing } from './common/helpers/request-tracing.js'` |
| `import { requestLogger } from './plugins/request-logger.js'` | `import { requestLogger } from './common/helpers/logging/request-logger.js'` |
| `import { sessionCache } from './plugins/session-cache.js'` | `import { sessionCache } from './common/helpers/session-cache/session-cache.js'` |
| `import { contentSecurityPolicy } from './plugins/content-security-policy.js'` | `import { contentSecurityPolicy } from './common/helpers/content-security-policy.js'` |
| `import { csrf } from './plugins/csrf.js'` | `import { csrf } from '../plugins/csrf.js'` |

Everything else in `server.js` is untouched — including `#/config/config.js`, `#/config/nunjucks/nunjucks.js`,
`isAuthStubMode`, and the `server.register([...])` order. (Plants' `server.js` is byte-identical to this apart from
`setupProxy`, `isStubMode`, the alias imports and a trailing comment — that is the intended end state for s01.)

### E2. `src/server/router.js` (moved — D1: plants' relative form)

Reference: `repos/trade-imports-plants-frontend/src/server/router.js`:

```js
import inert from '@hapi/inert'

import { health } from './health/index.js'
import { signout } from './signout/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'
```

Rewrite the ins import block to:

```js
import inert from '@hapi/inert'

import { home } from './routes/home/index.js'
import { health } from './health/index.js'
import { addressBookList } from './address-book/list/index.js'
import { addressBookAdd } from './address-book/add/index.js'
import { addressBookView } from './address-book/view/index.js'
import { addressBookEdit } from './address-book/edit/index.js'
import { addressBookDelete } from './address-book/delete/index.js'
import { signout } from './signout/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'
```

That is: drop the `about` import line entirely; every `'../x'` becomes `'./x'`; `'./serve-static-files.js'` becomes
`'./common/helpers/serve-static-files.js'`; `'#/config/config.js'` becomes `'../config/config.js'`.

In the `register` body, delete the single line `about,` from the auth-gated `server.register([...])` array. Everything
else in the body — `await server.register([inert])`, `await server.register([health])`, the `if (config.get('auth.enabled'))`
gate, `await server.register([serveStaticFiles])` — stays exactly as it is (D5).

### E3. `src/server/router.test.js` (moved)

| Today | Becomes |
|---|---|
| `import { createServer } from '#/server/server.js'` | `import { createServer } from './server.js'` |
| `import { config } from '#/config/config.js'` | `import { config } from '../config/config.js'` |
| `import { statusCodes } from '#/server/common/constants/status-codes.js'` | `import { statusCodes } from './common/constants/status-codes.js'` |

### E4. `src/plugins/auth.js` (moved)

Reference: `repos/trade-imports-plants-frontend/src/plugins/auth.js` — its import block is the target verbatim, except
ins keeps `isAuthStubMode`:

| Today | Becomes |
|---|---|
| `import { getOidcConfigWithRetry } from '#/auth/get-oidc-config-with-retry.js'` | `import { getOidcConfigWithRetry } from '../auth/get-oidc-config-with-retry.js'` |
| `import { refreshTokens } from '#/auth/refresh-tokens.js'` | `import { refreshTokens } from '../auth/refresh-tokens.js'` |
| `import { getSafeRedirect } from '#/auth/get-safe-redirect.js'` | `import { getSafeRedirect } from '../auth/get-safe-redirect.js'` |
| `import { config } from '#/config/config.js'` | `import { config } from '../config/config.js'` |
| `import { isAuthStubMode } from '#/server/common/services/mode.js'` | `import { isAuthStubMode } from '../server/common/services/mode.js'` |

The `@hapi/jwt` import and the whole body (comments included) are untouched.

### E5. `src/plugins/auth.test.js` (moved)

Reference: `repos/trade-imports-plants-frontend/src/plugins/auth.test.js` uses the same relative specifiers.

| Today | Becomes |
|---|---|
| `vi.mock('#/auth/get-oidc-config-with-retry.js', …` | `vi.mock('../auth/get-oidc-config-with-retry.js', …` |
| `vi.mock('#/config/config.js', …` | `vi.mock('../config/config.js', …` |
| `vi.mock('#/auth/refresh-tokens.js', …` | `vi.mock('../auth/refresh-tokens.js', …` |
| `vi.mock('#/auth/get-safe-redirect.js', …` | `vi.mock('../auth/get-safe-redirect.js', …` |

`import { authPlugin, getBellOptions, getCookieOptions } from './auth.js'` and `vi.mock('@hapi/jwt', …)` are
already correct. Do **not** add the `isStubMode` mock plants has — ins's test does not mock `mode.js` today and passes
because the mocked `config.get('auth.stubMode')` returns `undefined`; adding coverage is not this stage (§8).

### E6. `src/plugins/csrf.js` (moved)

| Today | Becomes |
|---|---|
| `import { config } from '#/config/config.js'` | `import { config } from '../config/config.js'` |

(Plants: `import { config } from '../config/config.js'`.)

### E7. `src/plugins/csrf.test.js` (moved)

| Today | Becomes |
|---|---|
| `import { createServer } from '#/server/server.js'` | `import { createServer } from '../server/server.js'` |
| `import { statusCodes } from '#/server/common/constants/status-codes.js'` | `import { statusCodes } from '../server/common/constants/status-codes.js'` |
| `} from '#/server/common/test-helpers/mock-auth.js'` | `} from '../server/common/test-helpers/mock-auth.js'` |
| `import { config } from '#/config/config.js'` | `import { config } from '../config/config.js'` |
| `import { countriesClient } from '#/server/common/clients/countries-client.js'` | `import { countriesClient } from '../server/common/clients/countries-client.js'` |
| `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../auth/get-oidc-config.js', …` |
| `vi.mock('#/server/common/clients/countries-client.js')` | `vi.mock('../server/common/clients/countries-client.js')` |

The factory-less `vi.mock` of `countries-client.js` is an automock (there is no `__mocks__/countries-client.js`); an
automock is keyed on the resolved file, so the spelling change is safe. The test body stays as it is — including the
full-server boot. Do not replace it with plants' unit-style csrf test (§8).

### E8. `src/server/common/helpers/content-security-policy.test.js` (moved; `content-security-policy.js` has no imports and needs no edit)

| Today | Becomes |
|---|---|
| `import { createServer } from '#/server/server.js'` | `import { createServer } from '../../server.js'` |
| `} from '#/server/common/test-helpers/mock-auth.js'` | `} from '../test-helpers/mock-auth.js'` |
| `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../../auth/get-oidc-config.js', …` |

(Plants: `'../../server.js'`, `'../test-helpers/mock-oidc-config.js'`, `'../../../auth/get-oidc-config.js'` — same
depths; ins keeps its own helper file name `mock-auth.js`.)

### E9. `src/server/common/helpers/pulse.js` (moved)

| Today | Becomes |
|---|---|
| `import { createLogger } from '../common/helpers/logging/logger.js'` | `import { createLogger } from './logging/logger.js'` |

(Plants: identical line.) `tenSeconds` stays `tenSeconds` (D3).

### E10. `src/server/common/helpers/request-tracing.js` (moved)

| Today | Becomes |
|---|---|
| `import { config } from '#/config/config.js'` | `import { config } from '../../../config/config.js'` |

(Plants: identical line.)

### E11. `src/server/common/helpers/serve-static-files.js` (moved)

| Today | Becomes |
|---|---|
| `import { config } from '#/config/config.js'` | `import { config } from '../../../config/config.js'` |
| `import { statusCodes } from '../common/constants/status-codes.js'` | `import { statusCodes } from '../constants/status-codes.js'` |

(Plants: identical two lines.)

### E12. `src/server/common/helpers/serve-static-files.test.js` (moved)

| Today | Becomes |
|---|---|
| `import { startServer } from '#/server/common/helpers/start-server.js'` | `import { startServer } from './start-server.js'` |
| `import { statusCodes } from '#/server/common/constants/status-codes.js'` | `import { statusCodes } from '../constants/status-codes.js'` |
| `import { mockOidcConfig } from '#/server/common/test-helpers/mock-auth.js'` | `import { mockOidcConfig } from '../test-helpers/mock-auth.js'` |
| `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../../auth/get-oidc-config.js', …` |

Keep `startServer()` (D4).

### E13. `src/server/common/helpers/logging/logger-options.js` (moved)

| Today | Becomes |
|---|---|
| `import { config } from '#/config/config.js'` | `import { config } from '../../../../config/config.js'` |

(Plants: identical line.) `request-logger.js` imports `./logger-options.js` — it moved alongside, so **no edit**.

### E14. `src/server/common/helpers/logging/logger.js` (does not move — the module it imports did)

| Today | Becomes |
|---|---|
| `import { loggerOptions } from '../../../plugins/logger-options.js'` | `import { loggerOptions } from './logger-options.js'` |

(Plants: identical line.)

### E15. `src/server/common/helpers/session-cache/session-cache.js` (moved)

| Today | Becomes |
|---|---|
| `import { config } from '#/config/config.js'` | `import { config } from '../../../../config/config.js'` |

(Plants: identical line.)

### E16. `src/server/health/controller.js` (moved; `health/index.js` imports `./controller.js` — no edit)

| Today | Becomes |
|---|---|
| `import { statusCodes } from '#/server/common/constants/status-codes.js'` | `import { statusCodes } from '../common/constants/status-codes.js'` |

(Plants: identical line.)

### E17. `src/server/health/controller.test.js` (moved)

| Today | Becomes |
|---|---|
| `import { createServer } from '#/server/server.js'` | `import { createServer } from '../server.js'` |
| `import { statusCodes } from '#/server/common/constants/status-codes.js'` | `import { statusCodes } from '../common/constants/status-codes.js'` |
| `import { mockOidcConfig } from '#/server/common/test-helpers/mock-auth.js'` | `import { mockOidcConfig } from '../common/test-helpers/mock-auth.js'` |
| `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../auth/get-oidc-config.js', …` |

(Plants: same four specifiers, with `mock-oidc-config.js` in place of `mock-auth.js`.)

### E18. `src/server/signout/index.js` (does not move — one doc-comment path, D7)

| Today | Becomes |
|---|---|
| ` * These routes are registered in src/server/plugins/router.js.` | ` * These routes are registered in src/server/router.js.` |

Nothing else in the file changes.

### Files that mention the old paths and must NOT be edited

- `src/server/auth/stub-sign-in.js:31` — "(see mode.js / plugins/auth.js)" is still true after the move.
- `src/server/common/helpers/errors.js` / `errors.test.js` — `routes/error/index` is the error view; s05 moves it.
- `src/server/routes/home/controller.js` — `routes/home/index` view; s05 moves it.
- `src/config/nunjucks/context/build-navigation.test.js` — asserts there is no "About" nav entry; still true, still a
  useful pin.

---

## 3. New files

None. Every destination directory that does not exist yet (`src/plugins/`, `src/server/health/`) is created by the
`mkdir -p` calls in §1a and populated only by moved files.

---

## 4. Imports — the rule

1. **A file that moves gets its imports written the way plants writes the same file: relative paths from the new
   location.** That includes `vi.mock(...)` specifiers in moved tests. §2 gives every line; there is no other import
   in any moved file.
2. **A file that does not move changes only the specifiers that pointed at a moved file, keeping its existing style.**
   Today that is `server.js` (8 lines, all relative) and `logging/logger.js` (1 line). Their `#/…` imports stay.
3. **The `#/*` alias stays in `package.json`** and in every file not listed in §2. s02 removes it.
4. Resolution sanity: `src/plugins/x.js` reaches `src/config/` as `../config/`, `src/auth/` as `../auth/`,
   `src/server/` as `../server/`. `src/server/common/helpers/x.js` reaches `src/config/` as `../../../config/`,
   `src/auth/` as `../../../auth/`, `src/server/server.js` as `../../server.js`. One level deeper
   (`logging/`, `session-cache/`) adds one more `../`. `src/server/health/x.js` reaches `src/server/` as `../`,
   `src/auth/` as `../../auth/`.

---

## 5. Tests

### Tests that move (content changes only per §2)

| Test | Pins |
|---|---|
| `src/server/router.test.js` | With `auth.enabled=false`, `/address-book` is 404 and `/health` is 200 — the auth gate in `router.js` survived the move and `about`'s removal. |
| `src/plugins/auth.test.js` | Bell + cookie strategy registration, `redirectTo` encoding, `validate` refresh paths — `auth.js` still resolves `config`, `mode`, `auth/*` from its new home. |
| `src/plugins/csrf.test.js` | Full-server boot; POST `/address-book/add` without a crumb is 403 when csrf is on; the add form renders `name="crumb"`. |
| `src/server/common/helpers/content-security-policy.test.js` | `GET /` with a session sets `content-security-policy`. |
| `src/server/common/helpers/serve-static-files.test.js` | `startServer()` boots; `/favicon.ico` is 204. |
| `src/server/health/controller.test.js` | `GET /health` → `{ message: 'success' }`, 200. |

### Tests that are deleted

| Test | Why |
|---|---|
| `src/server/routes/about/controller.test.js` | Its subject is deleted. It was the only test asserting on `/about`. |

### Tests that change behaviour or are new

None. Expected result after the stage: **48 test files / 241 tests** (baseline 49 / 242 minus the `about` file's
single test). If the count differs, a test was lost or gained — find it before going on.

### Test-helper touch points

`src/server/common/test-helpers/mock-auth.js` and `test-helpers/component-helpers.js` are unaffected. `vitest.config.js`
(`include: ['src/**/*.js']`, excludes `*.fit.spec.js`), `sonar-project.properties` and `nodemon.json` carry no path
this stage disturbs — do not edit them.

---

## 6. Invariants to prove

Run these after the moves and edits, before committing. Every command is one Bash call; test output goes to a file that
is read once.

**A. Ladder** (the stage's declared rungs, in order):

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format:check > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s01-format.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run lint > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s01-lint.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend test > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s01-test.log 2>&1
```

Read each log once with the Read tool. `s01-test.log` must show `Test Files  48 passed (48)` and `Tests  241 passed (241)`.

**B. Invariant 1 — public URL surface unchanged.** Run:

```
grep -rn "path: '" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/plugins --include="*.js" --exclude="*.test.js" --exclude="*.spec.js"
```

The route paths listed must be exactly this set (the `path: '/'` inside `src/plugins/auth.js` is a cookie path, not a
route — ignore it): `/auth/stub-sign-in`, `/auth/sign-in`, `/auth/sign-in-oidc`, `/auth/sign-out`,
`/auth/sign-out-oidc`, `/auth/organisation`, `/favicon.ico`, `${config.get('assetPath')}/{param*}`, `/signout`,
`/address-book/{id}/delete` (x2), `/address-book/{id}/edit` (x2), `/address-book/add` (x2), `/address-book`,
`/address-book/{id}`, `/`, `/health`. `/about` must be gone; nothing else may be missing.

**C. Invariant 3 — Playwright green (D9).** The fit suite boots the real app with `INS_MODE=stub` and
`AUTH_STUB_MODE=true` and waits on `/health`, then walks `/`, `/address-book`, add/edit/view/delete:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run test:fit > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s01-fit.log 2>&1
```

If the log says the Chromium browser is missing, run
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run playwright:install` once and
run the suite again. On a failure read `test-results/*/error-context.md` inside the repo, not the log tail.

**D. No stale path survives.** Each of these must return nothing:

```
grep -rn "server/plugins\|routes/health\|routes/about" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
grep -rn "'\./plugins/" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/plugins ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/routes/about ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/routes/health
```

(the `find` must print only "No such file or directory" errors). `src/server/server.js` importing `'../plugins/auth.js'` and `'../plugins/csrf.js'` is the new `src/plugins/` location (E1) and is deliberately outside the second grep's pattern; the stale spelling it catches is the old `'./plugins/router.js'` form.

**E. Invariant 2 — behaviour preserved.** Proven by A (same tests, same assertions, one deleted with its subject) and C.
The only behaviour change is the one the brief orders: `GET /about` now 404s (§9).

**F. Invariant 6/7 — comments and names.** `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached --stat` should show the 22 files of §1 plus `server.js`, `logging/logger.js` and `signout/index.js`, and
`git -C … diff --cached -M` should render every moved file as a rename with a handful of changed lines. Any hunk that
is not an import/`vi.mock` specifier, the removed `about` lines in `router.js`, or the E18 comment path is out of scope —
revert it.

**G. Target tree check.** After the stage the chassis half of the programme's `targetTree` exists:
`src/plugins/{auth,csrf}.js`, `src/server/{server.js, router.js, auth/, health/, signout/}`,
`src/server/common/helpers/{content-security-policy, pulse, request-tracing, serve-static-files, start-server,
logging/{logger,logger-options,request-logger}, session-cache/{cache-engine,session-cache}}`. Confirm with
`find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/plugins ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/health ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/helpers -type f`.

---

## 7. Commit

Stage everything (`git -C … add -A src`), then commit on `feat/NO_JIRA-frontend-alignment`:

```
chore: move the chassis into the animals layout

Relocate the hapi plugins, health route and router to the paths the
journey frontends use, and drop the CDP template's sample about page.
```

plus the required trailers. Do not push to `main`; do not merge.

---

## 8. Out of scope — leave alone even though it is tempting

- `src/server/routes/home/` and `src/server/routes/error/` — s05 moves them into `src/server/app/`.
- The `#/*` alias in `package.json` and every `#/` import in a file §2 does not list — s02.
- Content alignment of moved files with plants (catalogued so a later stage can pick them up deliberately):
  - `pulse.js`: `tenSeconds` vs plants' `shutdownTimeoutMs`.
  - `request-logger.js`: ins has `ignoreFunc: pathToIgnore` (skips `/public`, `/health`, `/favicon.ico`); plants
    passes `loggerOptions` bare. This is ins hardening the programme wants backported *to* the journeys, not removed.
  - `csrf.js`: plants carries a long doc comment; ins's one-liner is closer to invariant 6. Keep ins's.
  - `auth.js`: identical to plants apart from `isAuthStubMode`/`isStubMode` and ins's `redirectTo` encoding the target
    with `encodeURIComponent` and routing to `/auth/stub-sign-in` in stub mode, plus a try/catch around `refreshTokens`.
    All three are ins hardening; none moves in s01.
  - `auth.test.js`: plants also covers stub mode via an `isStubMode` mock; ins does not. Not added here.
  - `csrf.test.js`: ins boots the full server and reaches through to the address-book add form; plants unit-tests the
    options object with a mocked config. Keep ins's.
  - `serve-static-files.test.js`: ins uses `startServer()` (binds a port) and only checks the favicon; plants uses
    `createServer()+initialize()` and also asserts a built asset is served. Keep ins's.
  - `content-security-policy.test.js`: ins hits `/` with a session; plants hits `/health`. Keep ins's.
  - `health/index.js`: plants has a "Platform health checks must not require an authenticated session" comment;
    ins has none. Do not add it.
- `src/server/common/test-helpers/mock-auth.js` — the target tree splits it into `mock-auth-config.js` and
  `mock-oidc-config.js`; not this stage.
- `src/server/common/constants/session-auth-route-options.js` — still used by four route modules (D6).
- `setupProxy` — the journeys call it in `server.js`; ins has no proxy helper and the target tree lists none. Do not add.
- `README.md`, `src/server/common/README.md`, `sonar-project.properties`, `vitest.config.js`, `nodemon.json`,
  `vite.config.js`, `eslint.config.js`, `playwright.config.js`, `.github/workflows/*`, `Dockerfile` — no path they
  carry is disturbed.
- Any comment tidy-up, identifier rename, import reordering or blank-line change in a file this stage touches.
- The two journey repos — this stage touches `ins` only.

---

## 9. Behaviour changes

Exactly one, ordered by the brief: **`GET /about` is no longer served (404).** It was the CDP template's sample page;
nothing in ins links to it (ins's own navigation never listed it and `build-navigation.test.js` pins that), nothing under
the workspace's `docker/` or `scripts/` references it, and it is not in the programme's protected URL list. One consumer
does reach it: `trade-imports-animals-tests/tests/security/ins/address-book.spec.ts:45` does `pages.page.goto('/about')`
inside the `@active` ZAP scan (opt-in `test:security:active` only; every default CI script grep-inverts `@active`, and
`page.goto` tolerates a 404 with nothing asserted, so the spec stays green with one less real route scanned). The tests
repo is outside this programme's repos map, so that spec edit is recorded in the stage's `openQuestions` rather than done
here. The admin spec's `/about` (`tests/security/admin/admin-actions.spec.ts:49`) is admin's own page and is unaffected.
