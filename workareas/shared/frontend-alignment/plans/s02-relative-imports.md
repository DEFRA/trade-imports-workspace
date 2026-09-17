# s02-relative-imports — replace the `#/` import alias with relative paths

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (already checked out, level with `origin`, clean tree, HEAD `9411358`).

Reference shape: `repos/trade-imports-animals-frontend/src/server/auth/controller.js` (lines 1–5 are the exact
target for ins's `src/server/auth/controller.js`) and `repos/trade-imports-animals-frontend/package.json` (no
`imports` field). Neither animals nor plants has a single `#/` specifier anywhere under `src/`; ins has 158 of them
in 57 files, plus the `imports` field in `package.json` that makes them resolve.

Baseline (from s01's closing ladder on `9411358`): unit suite **48 files / 241 tests green**, `format:check` clean,
`lint` clean. Expected after this stage: **48 / 241** — identical. No test is added, moved, or removed.

This stage is a **pure specifier rewrite**. The only thing that changes inside any file is the string inside an
`import … from '…'`, a `vi.mock('…')`, a `vi.mock(import('…'))`, a `vi.importActual('…')` or a `() => import('…')`
factory. No file moves. No identifier renames. No comment edits. No import reordering. Plus one deletion in
`package.json`. A reviewer must be able to read every hunk as "same line, alias replaced by the shortest relative path".

---

## 0. Decisions (made here so the implementor never has to choose)

| # | Question the brief left open | Decision |
|---|---|---|
| D1 | Which relative form: the *shortest* path (`../../common/x.js`) or "up to `src/` then down" (`../../../server/common/x.js`)? Both resolve. | **Shortest path — what `path.relative(dirname(file), target)` gives.** That is what animals writes (`'../../auth/get-sign-out-url.js'` from `src/server/auth/`), what plants writes, and what s01 already wrote into the moved files. §2 gives every line so there is nothing to compute. |
| D2 | `test-helpers/component-helpers.js` lives *outside* `src/` and was reached via the second alias entry `#/test-helpers/*`. Animals has no such file; plants' copy is dead (nothing in plants imports it, and it still carries a dangling `#/` import with no `imports` field to back it). Move it now? | **No — it stays where it is.** Its own two imports become `'../src/config/…'`; the two component tests that use it reach it as `'../../../../../test-helpers/component-helpers.js'`. The programme's `targetTree` does not list `test-helpers/` at all, so its fate belongs to a later stage (recorded in the stage's `openQuestions`). Moving it here would be a file move in a stage whose brief says "Nothing else changes". |
| D3 | `src/server/common/clients/__mocks__/address-book-client.js` calls `vi.importActual('#/server/common/clients/address-book-client.js')`. Does a relative path resolve against the `__mocks__` file or against the test that loaded it? | **Against the `__mocks__` file — use `'../address-book-client.js'`.** Verified in ins's own `node_modules/vitest/dist/chunks/test.*.js`: `importActual(path)` calls `getImporter("importActual")`, which reads the call stack to find the calling module, so the path is resolved exactly like an `import` written in that file. |
| D4 | `src/config/nunjucks/context/context.test.js` uses the `vi.mock(import('#/config/config.js'), …)` form. Switch it to the string form while touching it? | **No.** Keep the `import()` form; only the specifier inside it changes (`'../../config.js'`). Same rule for the `() => import('…__mocks__/…')` factories in the address-book and home controller tests. |
| D5 | Prettier may re-wrap an import whose specifier got shorter (a three-line `import {\n a,\n b\n} from '#/…'` that now fits on one line, or vice versa). Is that reflow in scope? | **Yes, but only inside the rewritten statement.** Run `npm run format` once after all edits (§6 step 0), then `format:check`. Any reflow that is not part of an import/`vi.mock` statement this plan lists is out of scope — it should not happen, and if it does, revert it. |
| D6 | Does removing `imports` from `package.json` need `npm install` / a lockfile change? | **No.** `grep '"#/'` over the repo (excluding `node_modules`) hits only `package.json`: the lockfile does not mirror the field. Do not run `npm install`; `package-lock.json` must not appear in the diff. |
| D7 | Playwright is not on this stage's ladder, but invariant 3 says the Playwright suite is green at the end of every stage, and this stage changes how `src/index.js` resolves its two imports under plain Node (`node .`), which the unit suite never exercises (`index.test.js` mocks `start-server.js`). | **Run `npm run test:fit` once after the ladder** (§6 check C), exactly as s01 did (its D9). It is the only check that boots the app with `node` rather than vitest's module runner. |
| D8 | How to make 158 edits without `sed`/`node` (both banned by the guard rails)? | **The Edit tool with `replace_all: true`, one call per (file, old-prefix → new-prefix) pair from §4's table — at most four calls per file.** §2 lists every resulting line so the implementor can check each file after editing with a single `grep -n "from '\|vi.mock\|import(" <file>`. |
| D9 | s01's D2 deliberately left `src/server/server.js`'s two `#/config/…` imports alone. | **This stage finishes them** (E15 below). They become byte-identical to plants' `server.js` lines 12 and 16. |

---

## 1. Moves — every file that moves or is deleted

**None.** No file moves, no file is deleted, no directory is created or removed. The only structural change is one
field removed from `package.json` (E58).

| From | To | Kind |
|---|---|---|
| — | — | no moves in this stage |

---

## 2. Edits — every file whose content changes, and exactly what changes

Paths are relative to the ins repo root. "Line" numbers are as of HEAD `9411358`; use them to find the statement,
not as gospel after prettier runs. Every edit is the specifier string only. The right-hand column is the **whole
specifier as it must read afterwards**, single quotes included.

### 2a. `src/` root (2 files, 3 specifiers)

**E1. `src/index.js`**

| Line | Today | Becomes |
|---|---|---|
| 3 | `'#/server/common/helpers/start-server.js'` | `'./server/common/helpers/start-server.js'` |
| 4 | `'#/server/common/helpers/logging/logger.js'` | `'./server/common/helpers/logging/logger.js'` |

(Plants' `src/index.js` lines 3–4 are exactly these two lines.)

**E2. `src/index.test.js`**

| Line | Today | Becomes |
|---|---|---|
| 5 | `vi.mock('#/server/common/helpers/start-server.js', …` | `vi.mock('./server/common/helpers/start-server.js', …` |

### 2b. `src/auth/` (7 files, 7 specifiers — all `config`)

| File | Line | Today | Becomes |
|---|---|---|---|
| **E3.** `src/auth/refresh-tokens.js` | 4 | `'#/config/config.js'` | `'../config/config.js'` |
| **E4.** `src/auth/get-sign-out-url.js` | 1 | `'#/config/config.js'` | `'../config/config.js'` |
| **E5.** `src/auth/verify-token.js` | 6 | `'#/config/config.js'` | `'../config/config.js'` |
| **E6.** `src/auth/get-oidc-config.js` | 3 | `'#/config/config.js'` | `'../config/config.js'` |
| **E7.** `src/auth/get-oidc-config-with-retry.js` | 2 | `'#/config/config.js'` | `'../config/config.js'` |
| **E8.** `src/auth/get-oidc-config-with-retry.test.js` | 12 | `vi.mock('#/config/config.js', …` | `vi.mock('../config/config.js', …` |
| **E9.** `src/auth/get-oidc-config.test.js` | 13 | `vi.mock('#/config/config.js', …` | `vi.mock('../config/config.js', …` |

### 2c. `src/config/nunjucks/context/` (2 files, 3 specifiers)

**E10. `src/config/nunjucks/context/context.js`**

| Line | Today | Becomes |
|---|---|---|
| 4 | `'#/config/config.js'` | `'../../config.js'` |
| 6 | `'#/server/common/helpers/logging/logger.js'` | `'../../../server/common/helpers/logging/logger.js'` |

**E11. `src/config/nunjucks/context/context.test.js`** (D4 — keep the `import()` form)

| Line | Today | Becomes |
|---|---|---|
| 17 | `vi.mock(import('#/config/config.js'), async (importOriginal) => {` | `vi.mock(import('../../config.js'), async (importOriginal) => {` |

Line 14's `vi.mock('../../../server/common/helpers/logging/logger.js', …)` is already relative — untouched. It now
spells the logger the same way `context.js` line 6 does, which is a nice side effect, not a goal.

### 2d. `src/server/` root (1 file, 2 specifiers — D9)

**E15. `src/server/server.js`**

| Line | Today | Becomes |
|---|---|---|
| 11 | `'#/config/config.js'` | `'../config/config.js'` |
| 15 | `'#/config/nunjucks/nunjucks.js'` | `'../config/nunjucks/nunjucks.js'` |

(Plants' `server.js` lines 12 and 16, verbatim. Nothing else in `server.js` changes — import order stays.)

### 2e. `src/server/auth/` (3 files, 15 specifiers)

**E12. `src/server/auth/stub-sign-in.js`**

| Line | Today | Becomes |
|---|---|---|
| 5 | `'#/auth/get-safe-redirect.js'` | `'../../auth/get-safe-redirect.js'` |

**E13. `src/server/auth/controller.js`** — the stage's reference file. After this edit lines 1–5 are byte-identical to
`repos/trade-imports-animals-frontend/src/server/auth/controller.js` lines 1–5:

```js
import { getSignOutUrl } from '../../auth/get-sign-out-url.js'
import { validateState } from '../../auth/state.js'
import { verifyToken } from '../../auth/verify-token.js'
import { getPermissions } from '../../auth/get-permissions.js'
import { getSafeRedirect } from '../../auth/get-safe-redirect.js'
```

(Animals' line 6 `import { base } from '../app/shared/kit.js'` is journey app-shell machinery — do **not** add it.)

**E14. `src/server/auth/controller.test.js`**

| Line | Today | Becomes |
|---|---|---|
| 11 | `'#/server/server.js'` | `'../server.js'` |
| 12 | `'#/server/common/constants/status-codes.js'` | `'../common/constants/status-codes.js'` |
| 16 | `} from '#/server/common/test-helpers/mock-auth.js'` | `} from '../common/test-helpers/mock-auth.js'` |
| 17 | `'#/auth/verify-token.js'` | `'../../auth/verify-token.js'` |
| 18 | `'#/auth/get-permissions.js'` | `'../../auth/get-permissions.js'` |
| 20 | `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../auth/get-oidc-config.js', …` |
| 23 | `vi.mock('#/auth/get-sign-out-url.js', …` | `vi.mock('../../auth/get-sign-out-url.js', …` |
| 26 | `vi.mock('#/auth/verify-token.js', …` | `vi.mock('../../auth/verify-token.js', …` |
| 29 | `vi.mock('#/auth/get-permissions.js', …` | `vi.mock('../../auth/get-permissions.js', …` |

(Animals' `controller.test.js` lines 2–20 use the same depths: `'../server.js'`, `'../../auth/verify-token.js'`,
`vi.mock('../../auth/get-oidc-config.js', …)`.)

### 2f. `src/server/signout/` (2 files, 6 specifiers)

**E16. `src/server/signout/index.js`**

| Line | Today | Becomes |
|---|---|---|
| 2 | `'#/server/common/constants/session-auth-route-options.js'` | `'../common/constants/session-auth-route-options.js'` |

**E17. `src/server/signout/controller.test.js`**

| Line | Today | Becomes |
|---|---|---|
| 3 | `'#/server/server.js'` | `'../server.js'` |
| 4 | `'#/server/common/constants/status-codes.js'` | `'../common/constants/status-codes.js'` |
| 8 | `} from '#/server/common/test-helpers/mock-auth.js'` | `} from '../common/test-helpers/mock-auth.js'` |
| 10 | `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../auth/get-oidc-config.js', …` |
| 14 | `vi.mock('#/auth/get-sign-out-url.js', …` | `vi.mock('../../auth/get-sign-out-url.js', …` |

### 2g. `src/server/common/clients/` (10 files, 14 specifiers)

| File | Line | Today | Becomes |
|---|---|---|---|
| **E18.** `ins-backend-client.js` | 1 | `'#/server/common/services/mode.js'` | `'../services/mode.js'` |
| **E19.** `address-book-client.js` | 1 | `'#/server/common/services/mode.js'` | `'../services/mode.js'` |
| **E20.** `countries-client.js` | 1 | `'#/server/common/services/mode.js'` | `'../services/mode.js'` |
| **E21.** `address-book-client.real.js` | 3 | `'#/config/config.js'` | `'../../../config/config.js'` |
| **E22.** `ins-backend-client.real.js` | 1 | `'#/config/config.js'` | `'../../../config/config.js'` |
| **E23.** `countries-client.real.js` | 1 | `'#/config/config.js'` | `'../../../config/config.js'` |
| **E23.** `countries-client.real.js` | 2 | `'#/server/common/helpers/logging/logger.js'` | `'../helpers/logging/logger.js'` |
| **E24.** `countries-client.test.js` | 6 | `vi.mock('#/config/config.js', …` | `vi.mock('../../../config/config.js', …` |
| **E24.** `countries-client.test.js` | 20 | `vi.mock('#/server/common/helpers/logging/logger.js', …` | `vi.mock('../helpers/logging/logger.js', …` |
| **E25.** `ins-backend-client.test.js` | 6 | `vi.mock('#/config/config.js', …` | `vi.mock('../../../config/config.js', …` |
| **E26.** `address-book-client.test.js` | 10 | `vi.mock('#/config/config.js', …` | `vi.mock('../../../config/config.js', …` |
| **E26.** `address-book-client.test.js` | 24 | `vi.mock('#/server/common/helpers/logging/logger.js', …` | `vi.mock('../helpers/logging/logger.js', …` |

**E27. `src/server/common/clients/__mocks__/address-book-client.js`** (D3)

| Line | Today | Becomes |
|---|---|---|
| 4 | `  '#/server/common/clients/address-book-client.js'` | `  '../address-book-client.js'` |

The statement is `const { mapApiErrorsToFormErrors } = await vi.importActual(\n  '…'\n)`. Prettier decides whether it
stays on three lines (it will — the one-line form is 87 characters). Nothing else in the file changes.
`__mocks__/ins-backend-client.js` has no `#/` import and is untouched.

### 2h. `src/server/common/components/` (2 files, 2 specifiers — D2)

| File | Line | Today | Becomes |
|---|---|---|---|
| **E28.** `heading/template.test.js` | 1 | `'#/test-helpers/component-helpers.js'` | `'../../../../../test-helpers/component-helpers.js'` |
| **E29.** `service-header/template.test.js` | 1 | `'#/test-helpers/component-helpers.js'` | `'../../../../../test-helpers/component-helpers.js'` |

Five `../`: `heading/` → `components/` → `common/` → `server/` → `src/` → repo root, then `test-helpers/`. Prettier
keeps a single-specifier import on one line regardless of width, so this 84-character line will not wrap.

### 2i. `src/server/common/helpers/` and `services/` (10 files, 11 specifiers)

| File | Line | Today | Becomes |
|---|---|---|---|
| **E30.** `helpers/notification-dashboard-helper.js` | 3 | `'#/config/config.js'` | `'../../../config/config.js'` |
| **E31.** `helpers/notification-dashboard-helper.test.js` | 3 | `vi.mock('#/config/config.js', …` | `vi.mock('../../../config/config.js', …` |
| **E32.** `helpers/start-server.js` | 2 | `'#/config/config.js'` | `'../../../config/config.js'` |
| **E33.** `helpers/start-server.test.js` | 7 | `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../../auth/get-oidc-config.js', …` |
| **E34.** `helpers/redis-client.test.js` | 5 | `'#/config/config.js'` | `'../../../config/config.js'` |
| **E35.** `helpers/errors.test.js` | 6 | `'#/server/common/test-helpers/mock-auth.js'` | `'../test-helpers/mock-auth.js'` |
| **E35.** `helpers/errors.test.js` | 8 | `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../../auth/get-oidc-config.js', …` |
| **E36.** `helpers/session-cache/cache-engine.js` | 6 | `'#/config/config.js'` | `'../../../../config/config.js'` |
| **E37.** `helpers/session-cache/cache-engine.test.js` | 7 | `'#/config/config.js'` | `'../../../../config/config.js'` |
| **E38.** `services/mode.js` | 1 | `'#/config/config.js'` | `'../../../config/config.js'` |
| **E39.** `services/mode.test.js` | 14 | `vi.mock('#/config/config.js', …` | `vi.mock('../../../config/config.js', …` |

(Plants: `helpers/start-server.js` line 2 and `services/mode.js` line 1 are `'../../../config/config.js'`;
`session-cache/cache-engine.js` is `'../../../../config/config.js'`; `errors.test.js` mocks
`'../../../auth/get-oidc-config.js'` — same depths.)

### 2j. `src/server/address-book/` (13 files, 88 specifiers)

Depth reminder for this directory: from `address-book/<page>/`, `src/server/common/…` is `'../../common/…'`,
`src/server/server.js` is `'../../server.js'`, `src/auth/…` is `'../../../auth/…'`, `src/config/…` is
`'../../../config/…'`, and the sibling `address-book/address-countries.js` is `'../address-countries.js'`. From
`address-book/` itself, `src/server/common/…` is `'../common/…'`.

**E40. `address-countries.js`**

| Line | Today | Becomes |
|---|---|---|
| 1 | `'#/server/common/clients/countries-client.js'` | `'../common/clients/countries-client.js'` |

**E41. `address-countries.test.js`**

| Line | Today | Becomes |
|---|---|---|
| 11 | `vi.mock('#/server/common/clients/countries-client.js', …` | `vi.mock('../common/clients/countries-client.js', …` |
| 17 | `'#/server/common/clients/countries-client.js'` | `'../common/clients/countries-client.js'` |

**E42. `add/index.js`** · **E43. `list/index.js`**

| Line | Today | Becomes |
|---|---|---|
| 2 | `'#/server/common/constants/session-auth-route-options.js'` | `'../../common/constants/session-auth-route-options.js'` |

**E44. `add/controller.js`**

| Line | Today | Becomes |
|---|---|---|
| 6 | `} from '#/server/common/clients/address-book-client.js'` | `} from '../../common/clients/address-book-client.js'` |
| 12 | `'#/server/common/helpers/logging/logger.js'` | `'../../common/helpers/logging/logger.js'` |
| 13 | `'#/server/common/helpers/validation-helpers.js'` | `'../../common/helpers/validation-helpers.js'` |
| 14 | `'#/server/common/helpers/session-helpers.js'` | `'../../common/helpers/session-helpers.js'` |
| 15 | `'#/server/common/constants/session-keys.js'` | `'../../common/constants/session-keys.js'` |
| 16 | `'#/server/common/helpers/require-organisation-id.js'` | `'../../common/helpers/require-organisation-id.js'` |
| 17 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |

**E45. `add/controller.test.js`** (the representative controller test — all four prefixes appear)

| Line | Today | Becomes |
|---|---|---|
| 3 | `'#/server/server.js'` | `'../../server.js'` |
| 4 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |
| 8 | `} from '#/server/common/test-helpers/mock-auth.js'` | `} from '../../common/test-helpers/mock-auth.js'` |
| 9 | `'#/server/common/clients/address-book-client.js'` | `'../../common/clients/address-book-client.js'` |
| 10 | `'#/server/common/clients/countries-client.js'` | `'../../common/clients/countries-client.js'` |
| 11 | `'#/config/config.js'` | `'../../../config/config.js'` |
| 13 | `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../../auth/get-oidc-config.js', …` |
| 18 | `  '#/server/common/clients/address-book-client.js',` | `  '../../common/clients/address-book-client.js',` |
| 19 | `  () => import('#/server/common/clients/__mocks__/address-book-client.js')` | `  () => import('../../common/clients/__mocks__/address-book-client.js')` |
| 21 | `vi.mock('#/server/common/clients/countries-client.js')` | `vi.mock('../../common/clients/countries-client.js')` |

Line 21 is a factory-less automock (there is no `__mocks__/countries-client.js`); vitest keys automocks on the
resolved file, so the spelling change is safe.

**E46. `edit/controller.js`**

| Line | Today | Becomes |
|---|---|---|
| 7 | `} from '#/server/common/clients/address-book-client.js'` | `} from '../../common/clients/address-book-client.js'` |
| 13 | `'#/server/common/helpers/logging/logger.js'` | `'../../common/helpers/logging/logger.js'` |
| 14 | `'#/server/common/helpers/validation-helpers.js'` | `'../../common/helpers/validation-helpers.js'` |
| 15 | `'#/server/common/helpers/session-helpers.js'` | `'../../common/helpers/session-helpers.js'` |
| 16 | `'#/server/common/constants/session-keys.js'` | `'../../common/constants/session-keys.js'` |
| 17 | `'#/server/common/helpers/require-organisation-id.js'` | `'../../common/helpers/require-organisation-id.js'` |
| 18 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |

**E47. `edit/controller.test.js`**

| Line | Today | Becomes |
|---|---|---|
| 3 | `'#/server/server.js'` | `'../../server.js'` |
| 4 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |
| 8 | `} from '#/server/common/test-helpers/mock-auth.js'` | `} from '../../common/test-helpers/mock-auth.js'` |
| 9 | `'#/server/common/clients/address-book-client.js'` | `'../../common/clients/address-book-client.js'` |
| 10 | `'#/server/common/clients/countries-client.js'` | `'../../common/clients/countries-client.js'` |
| 12 | `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../../auth/get-oidc-config.js', …` |
| 17 | `  '#/server/common/clients/address-book-client.js',` | `  '../../common/clients/address-book-client.js',` |
| 18 | `  () => import('#/server/common/clients/__mocks__/address-book-client.js')` | `  () => import('../../common/clients/__mocks__/address-book-client.js')` |
| 20 | `vi.mock('#/server/common/clients/countries-client.js')` | `vi.mock('../../common/clients/countries-client.js')` |

**E48. `view/controller.js`**

| Line | Today | Becomes |
|---|---|---|
| 4 | `'#/server/common/clients/address-book-client.js'` | `'../../common/clients/address-book-client.js'` |
| 5 | `'#/server/common/helpers/logging/logger.js'` | `'../../common/helpers/logging/logger.js'` |
| 6 | `'#/server/common/helpers/require-organisation-id.js'` | `'../../common/helpers/require-organisation-id.js'` |
| 7 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |

**E49. `view/controller.test.js`**

| Line | Today | Becomes |
|---|---|---|
| 3 | `'#/server/server.js'` | `'../../server.js'` |
| 4 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |
| 8 | `} from '#/server/common/test-helpers/mock-auth.js'` | `} from '../../common/test-helpers/mock-auth.js'` |
| 9 | `'#/server/common/clients/address-book-client.js'` | `'../../common/clients/address-book-client.js'` |
| 10 | `'#/server/common/clients/countries-client.js'` | `'../../common/clients/countries-client.js'` |
| 13 | `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../../auth/get-oidc-config.js', …` |
| 18 | `  '#/server/common/clients/address-book-client.js',` | `  '../../common/clients/address-book-client.js',` |
| 19 | `  () => import('#/server/common/clients/__mocks__/address-book-client.js')` | `  () => import('../../common/clients/__mocks__/address-book-client.js')` |
| 21 | `vi.mock('#/server/common/clients/countries-client.js')` | `vi.mock('../../common/clients/countries-client.js')` |

**E50. `delete/controller.js`**

| Line | Today | Becomes |
|---|---|---|
| 4 | `'#/server/common/clients/address-book-client.js'` | `'../../common/clients/address-book-client.js'` |
| 5 | `'#/server/common/helpers/logging/logger.js'` | `'../../common/helpers/logging/logger.js'` |
| 6 | `'#/server/common/helpers/session-helpers.js'` | `'../../common/helpers/session-helpers.js'` |
| 7 | `'#/server/common/constants/session-keys.js'` | `'../../common/constants/session-keys.js'` |
| 8 | `'#/server/common/helpers/require-organisation-id.js'` | `'../../common/helpers/require-organisation-id.js'` |
| 9 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |

**E51. `delete/controller.test.js`**

| Line | Today | Becomes |
|---|---|---|
| 3 | `'#/server/server.js'` | `'../../server.js'` |
| 4 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |
| 8 | `} from '#/server/common/test-helpers/mock-auth.js'` | `} from '../../common/test-helpers/mock-auth.js'` |
| 9 | `'#/server/common/clients/address-book-client.js'` | `'../../common/clients/address-book-client.js'` |
| 11 | `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../../auth/get-oidc-config.js', …` |
| 16 | `  '#/server/common/clients/address-book-client.js',` | `  '../../common/clients/address-book-client.js',` |
| 17 | `  () => import('#/server/common/clients/__mocks__/address-book-client.js')` | `  () => import('../../common/clients/__mocks__/address-book-client.js')` |

**E52. `list/controller.js`** (the one sibling-import case)

| Line | Today | Becomes |
|---|---|---|
| 3 | `'#/server/common/clients/address-book-client.js'` | `'../../common/clients/address-book-client.js'` |
| 8 | `} from '#/server/common/helpers/address-book-helper.js'` | `} from '../../common/helpers/address-book-helper.js'` |
| 9 | `'#/server/common/helpers/logging/logger.js'` | `'../../common/helpers/logging/logger.js'` |
| 10 | `'#/server/common/helpers/session-helpers.js'` | `'../../common/helpers/session-helpers.js'` |
| 11 | `'#/server/common/constants/session-keys.js'` | `'../../common/constants/session-keys.js'` |
| 12 | `'#/server/common/helpers/require-organisation-id.js'` | `'../../common/helpers/require-organisation-id.js'` |
| 13 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |
| 17 | `} from '#/server/address-book/address-countries.js'` | `} from '../address-countries.js'` |

Lines 4–8 and 14–17 are multi-specifier imports; prettier may collapse them onto one line now that the specifier is
shorter (D5). Let it.

**E53. `list/controller.test.js`**

| Line | Today | Becomes |
|---|---|---|
| 3 | `'#/server/server.js'` | `'../../server.js'` |
| 4 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |
| 8 | `} from '#/server/common/test-helpers/mock-auth.js'` | `} from '../../common/test-helpers/mock-auth.js'` |
| 9 | `'#/server/common/clients/address-book-client.js'` | `'../../common/clients/address-book-client.js'` |
| 11 | `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../../auth/get-oidc-config.js', …` |
| 16 | `  '#/server/common/clients/address-book-client.js',` | `  '../../common/clients/address-book-client.js',` |
| 17 | `  () => import('#/server/common/clients/__mocks__/address-book-client.js')` | `  () => import('../../common/clients/__mocks__/address-book-client.js')` |
| 20 | `vi.mock('#/server/common/clients/countries-client.js', …` | `vi.mock('../../common/clients/countries-client.js', …` |

### 2k. `src/server/routes/home/` (3 files, 14 specifiers)

**E54. `routes/home/index.js`**

| Line | Today | Becomes |
|---|---|---|
| 2 | `'#/server/common/constants/session-auth-route-options.js'` | `'../../common/constants/session-auth-route-options.js'` |

**E55. `routes/home/controller.js`**

| Line | Today | Becomes |
|---|---|---|
| 3 | `'#/server/common/clients/countries-client.js'` | `'../../common/clients/countries-client.js'` |
| 4 | `'#/server/common/clients/ins-backend-client.js'` | `'../../common/clients/ins-backend-client.js'` |
| 5 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |
| 6 | `'#/server/common/helpers/logging/logger.js'` | `'../../common/helpers/logging/logger.js'` |
| 13 | `} from '#/server/common/helpers/notification-dashboard-helper.js'` | `} from '../../common/helpers/notification-dashboard-helper.js'` |

**E56. `routes/home/controller.test.js`**

| Line | Today | Becomes |
|---|---|---|
| 3 | `'#/server/server.js'` | `'../../server.js'` |
| 4 | `'#/server/common/constants/status-codes.js'` | `'../../common/constants/status-codes.js'` |
| 8 | `} from '#/server/common/test-helpers/mock-auth.js'` | `} from '../../common/test-helpers/mock-auth.js'` |
| 9 | `'#/server/common/clients/ins-backend-client.js'` | `'../../common/clients/ins-backend-client.js'` |
| 11 | `vi.mock('#/auth/get-oidc-config.js', …` | `vi.mock('../../../auth/get-oidc-config.js', …` |
| 16 | `  '#/server/common/clients/ins-backend-client.js',` | `  '../../common/clients/ins-backend-client.js',` |
| 17 | `  () => import('#/server/common/clients/__mocks__/ins-backend-client.js')` | `  () => import('../../common/clients/__mocks__/ins-backend-client.js')` |
| 20 | `vi.mock('#/server/common/clients/countries-client.js', …` | `vi.mock('../../common/clients/countries-client.js', …` |

### 2l. `test-helpers/` (1 file, 2 specifiers — D2)

**E57. `test-helpers/component-helpers.js`**

| Line | Today | Becomes |
|---|---|---|
| 7 | `'#/config/nunjucks/filters/filters.js'` | `'../src/config/nunjucks/filters/filters.js'` |
| 8 | `'#/config/nunjucks/globals/globals.js'` | `'../src/config/nunjucks/globals/globals.js'` |

Nothing else in the file changes — including its `renderComponent` signature, which differs from plants' dead copy
(ins takes a fourth `context` argument; plants does not). Not this stage.

### 2m. `package.json` (D6)

**E58. `package.json`** — delete the whole `imports` field, lines 36–39:

```json
  "imports": {
    "#/*": "./src/*",
    "#/test-helpers/*": "./test-helpers/*"
  },
```

so that line 35 `  },` (closing `scripts`) is immediately followed by `  "author": "Defra DDTS",`. Use one Edit call
whose `old_string` is the four lines above plus the following `  "author": "Defra DDTS",` line, and whose
`new_string` is just `  "author": "Defra DDTS",`. Nothing else in `package.json` changes: no version bumps, no
`engines.npm`/`packageManager` fields copied from animals, no script changes. `npm run format` will re-check the
JSON; it must not produce a diff beyond the four deleted lines.

### Files that contain `#/` in a non-import sense and must NOT be edited

None. Every `#/` in `src/` and `test-helpers/` is inside a quoted specifier (the 158 `'#/` matches and the 158 total
`#/` matches are the same set). No `.njk`, `.md`, `.scss`, config file, workflow, `Dockerfile` or `README.md`
mentions the alias. `package-lock.json` does not carry the field.

### Tally

57 source files, 158 specifiers, 1 `package.json` field. `git diff --stat` at the end must list **58 files** and
nothing else.

---

## 3. New files

None.

---

## 4. Imports — the rule

1. **Every `#/…` specifier becomes the shortest relative path from the importing file to the target** — what
   `path.relative(dirname(importer), target)` returns, with `./` prefixed when the target is at or below the importer's
   own directory. `#/x` means `src/x`; `#/test-helpers/x` means `<repo root>/test-helpers/x`.
2. **The rule applies to every specifier form** — `import … from`, `vi.mock('…')`, `vi.mock(import('…'))`,
   `vi.importActual('…')`, and `() => import('…')` factories. Vitest resolves all of them against the file the call is
   written in (D3, D4).
3. **Nothing else about the statement changes** — not the imported names, not the form (`import()` vs string), not
   the order, not the surrounding blank lines. Prettier may re-wrap the statement (D5).
4. **The alias disappears entirely** — from `package.json` and from every file. After this stage a `grep` for `'#/`
   or `"#/` over the repo (minus `node_modules`) returns nothing (§6 check B).

### 4a. Prefix table — for the Edit tool with `replace_all: true` (D8)

One row = one Edit call on every file in that directory that contains the old prefix. Apply rows top to bottom
within a file; the prefixes are distinct literals, so order does not actually matter, but the longest ones are listed
first so nothing can be mistaken for a partial match.

| Importer directory | Old prefix (literal, quote included) | New prefix |
|---|---|---|
| `src/` | `'#/server/` | `'./server/` |
| `src/auth/` | `'#/config/` | `'../config/` |
| `src/config/nunjucks/context/` | `'#/config/config.js'` | `'../../config.js'` |
| `src/config/nunjucks/context/` | `'#/server/` | `'../../../server/` |
| `src/server/` | `'#/config/` | `'../config/` |
| `src/server/auth/`, `src/server/signout/` | `'#/server/server.js'` | `'../server.js'` |
| `src/server/auth/`, `src/server/signout/` | `'#/server/common/` | `'../common/` |
| `src/server/auth/`, `src/server/signout/` | `'#/auth/` | `'../../auth/` |
| `src/server/common/clients/` | `'#/server/common/` | `'../` |
| `src/server/common/clients/` | `'#/config/` | `'../../../config/` |
| `src/server/common/clients/__mocks__/` | `'#/server/common/clients/` | `'../` |
| `src/server/common/components/heading/`, `…/service-header/` | `'#/test-helpers/` | `'../../../../../test-helpers/` |
| `src/server/common/helpers/`, `src/server/common/services/` | `'#/server/common/` | `'../` |
| `src/server/common/helpers/`, `src/server/common/services/` | `'#/config/` | `'../../../config/` |
| `src/server/common/helpers/`, `src/server/common/services/` | `'#/auth/` | `'../../../auth/` |
| `src/server/common/helpers/session-cache/` | `'#/config/` | `'../../../../config/` |
| `src/server/address-book/` (the two `address-countries*` files) | `'#/server/common/` | `'../common/` |
| `src/server/address-book/{add,edit,view,delete,list}/`, `src/server/routes/home/` | `'#/server/address-book/` | `'../` |
| `src/server/address-book/{add,edit,view,delete,list}/`, `src/server/routes/home/` | `'#/server/server.js'` | `'../../server.js'` |
| `src/server/address-book/{add,edit,view,delete,list}/`, `src/server/routes/home/` | `'#/server/common/` | `'../../common/` |
| `src/server/address-book/{add,edit,view,delete,list}/`, `src/server/routes/home/` | `'#/auth/` | `'../../../auth/` |
| `src/server/address-book/{add,edit,view,delete,list}/`, `src/server/routes/home/` | `'#/config/` | `'../../../config/` |
| `test-helpers/` | `'#/config/` | `'../src/config/` |

After editing a file, `grep -n "#/" <that file>` (one Bash call, tilde path) must print nothing, and
`grep -n "from '\|vi.mock\|import(" <that file>` must match the file's §2 table line for line.

### 4b. The 57 files, as a checklist

```
src/index.js                                                   E1   (2)
src/index.test.js                                              E2   (1)
src/auth/refresh-tokens.js                                     E3   (1)
src/auth/get-sign-out-url.js                                   E4   (1)
src/auth/verify-token.js                                       E5   (1)
src/auth/get-oidc-config.js                                    E6   (1)
src/auth/get-oidc-config-with-retry.js                         E7   (1)
src/auth/get-oidc-config-with-retry.test.js                    E8   (1)
src/auth/get-oidc-config.test.js                               E9   (1)
src/config/nunjucks/context/context.js                         E10  (2)
src/config/nunjucks/context/context.test.js                    E11  (1)
src/server/auth/stub-sign-in.js                                E12  (1)
src/server/auth/controller.js                                  E13  (5)
src/server/auth/controller.test.js                             E14  (9)
src/server/server.js                                           E15  (2)
src/server/signout/index.js                                    E16  (1)
src/server/signout/controller.test.js                          E17  (5)
src/server/common/clients/ins-backend-client.js                E18  (1)
src/server/common/clients/address-book-client.js               E19  (1)
src/server/common/clients/countries-client.js                  E20  (1)
src/server/common/clients/address-book-client.real.js          E21  (1)
src/server/common/clients/ins-backend-client.real.js           E22  (1)
src/server/common/clients/countries-client.real.js             E23  (2)
src/server/common/clients/countries-client.test.js             E24  (2)
src/server/common/clients/ins-backend-client.test.js           E25  (1)
src/server/common/clients/address-book-client.test.js          E26  (2)
src/server/common/clients/__mocks__/address-book-client.js     E27  (1)
src/server/common/components/heading/template.test.js          E28  (1)
src/server/common/components/service-header/template.test.js   E29  (1)
src/server/common/helpers/notification-dashboard-helper.js     E30  (1)
src/server/common/helpers/notification-dashboard-helper.test.js E31 (1)
src/server/common/helpers/start-server.js                      E32  (1)
src/server/common/helpers/start-server.test.js                 E33  (1)
src/server/common/helpers/redis-client.test.js                 E34  (1)
src/server/common/helpers/errors.test.js                       E35  (2)
src/server/common/helpers/session-cache/cache-engine.js        E36  (1)
src/server/common/helpers/session-cache/cache-engine.test.js   E37  (1)
src/server/common/services/mode.js                             E38  (1)
src/server/common/services/mode.test.js                        E39  (1)
src/server/address-book/address-countries.js                   E40  (1)
src/server/address-book/address-countries.test.js              E41  (2)
src/server/address-book/add/index.js                           E42  (1)
src/server/address-book/list/index.js                          E43  (1)
src/server/address-book/add/controller.js                      E44  (7)
src/server/address-book/add/controller.test.js                 E45  (10)
src/server/address-book/edit/controller.js                     E46  (7)
src/server/address-book/edit/controller.test.js                E47  (9)
src/server/address-book/view/controller.js                     E48  (4)
src/server/address-book/view/controller.test.js                E49  (9)
src/server/address-book/delete/controller.js                   E50  (6)
src/server/address-book/delete/controller.test.js              E51  (7)
src/server/address-book/list/controller.js                     E52  (8)
src/server/address-book/list/controller.test.js                E53  (8)
src/server/routes/home/index.js                                E54  (1)
src/server/routes/home/controller.js                           E55  (5)
src/server/routes/home/controller.test.js                      E56  (8)
test-helpers/component-helpers.js                              E57  (2)
package.json                                                   E58  (field)
```

The bracketed number is how many specifiers the file holds; they sum to 158. Files not on this list contain no `#/`
and must not be touched — in particular everything s01 already rewrote (`src/plugins/*`, `src/server/router*.js`,
`src/server/health/*`, and the helpers s01 moved) is already in the target form.

---

## 5. Tests

### Tests that move

None.

### Tests that change (specifier only — the assertions and mocks are untouched)

Every `*.test.js` in §4b (27 files). What each pins is unchanged by this stage; the point of running them is that
the rewritten `vi.mock` specifiers still intercept the same modules. The three shapes worth naming:

| Shape | Files | What a green run proves |
|---|---|---|
| Factory mock of a module the server imports (`vi.mock('../../../auth/get-oidc-config.js', () => ({…}))`) | every controller test, `errors.test.js`, `start-server.test.js` | The relative specifier resolves to the same file as the alias did — otherwise `createServer()` would try to fetch real OIDC discovery and the suite would hang or fail. |
| Redirected mock (`vi.mock('../../common/clients/address-book-client.js', () => import('../../common/clients/__mocks__/address-book-client.js'))`) plus the `__mocks__` file's own `vi.importActual('../address-book-client.js')` | the five address-book controller tests, `routes/home/controller.test.js`, `__mocks__/address-book-client.js` | D3 holds: `importActual` resolves against the `__mocks__` file, so `mapApiErrorsToFormErrors` is still the real implementation while the client methods are `vi.fn()`s. |
| `vi.mock(import('../../config.js'), async (importOriginal) => …)` | `context.test.js` | The `import()` form accepts a relative specifier (D4). |

### Tests that are new

None. Adding tests would violate the brief ("Nothing else changes").

### Expected result

**48 test files / 241 tests**, exactly the baseline. If the count differs, a specifier was mistyped and vitest
silently picked up a different module (or none); find the file before going on.

### Test-helper touch points

`test-helpers/component-helpers.js` (E57) and `src/server/common/test-helpers/mock-auth.js` (no `#/`, untouched).
`vitest.config.js` (`include: ['src/**/*.js']`, excludes `*.fit.spec.js`) carries no alias config — vitest resolved
`#/` through Node's `imports` field, which is why removing the field and rewriting the specifiers is the whole job.
Do not edit `vitest.config.js`, `eslint.config.js`, `vite.config.js`, `playwright.config.js` or `nodemon.json`.

---

## 6. Invariants to prove

Run these after all §2 edits, before committing. Every command is one Bash call with tilde paths; test output goes to
a file that is read once with the Read tool.

**0. Format first (D5).** Prettier is the only thing allowed to reflow a statement:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s02-format.log 2>&1
```

**A. Ladder** (the stage's declared rungs, in order):

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format:check > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s02-format-check.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run lint > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s02-lint.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend test > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s02-test.log 2>&1
```

Read each log once. `s02-test.log` must show `Test Files  48 passed (48)` and `Tests  241 passed (241)`.

**B. The alias is gone — every one of these must return nothing:**

```
grep -rn "'#/" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/test-helpers
grep -rn '"#/' ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.public --exclude-dir=coverage
grep -n '"imports"' ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/package.json
```

and this must print `null`:

```
jq '.imports' ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/package.json
```

**C. Invariant 3 — Playwright green, and `node .` boots without the alias (D7).** The fit suite builds the frontend,
boots the real app with `INS_MODE=stub` and `AUTH_STUB_MODE=true` via `fit:start` (`node .`), waits on `/health`,
then walks `/`, `/address-book`, add/edit/view/delete:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run test:fit > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s02-fit.log 2>&1
```

If the log says the Chromium browser is missing, run
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run playwright:install` once and
run the suite again. On a failure read `test-results/*/error-context.md` inside the repo, not the log tail. An
`ERR_MODULE_NOT_FOUND` or `ERR_PACKAGE_IMPORT_NOT_DEFINED` in the web-server output means a specifier in a file on
the `node .` boot path (`src/index.js` → `start-server.js` → `server.js` → everything) is wrong.

**D. Invariant 1 — public URL surface unchanged.** No route file changes a `path:`; prove it the same way s01 did:

```
grep -rn "path: '" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/plugins --include="*.js" --exclude="*.test.js" --exclude="*.spec.js"
```

The set must be exactly s01's closing set (the `path: '/'` inside `src/plugins/auth.js` is a cookie path, ignore it):
`/auth/stub-sign-in`, `/auth/sign-in`, `/auth/sign-in-oidc`, `/auth/sign-out`, `/auth/sign-out-oidc`,
`/auth/organisation`, `/favicon.ico`, `${config.get('assetPath')}/{param*}`, `/signout`,
`/address-book/{id}/delete` (x2), `/address-book/{id}/edit` (x2), `/address-book/add` (x2), `/address-book`,
`/address-book/{id}`, `/`, `/health`.

**E. Invariant 2 — behaviour preserved.** Proven by A (same 241 assertions) and C. This stage has no behaviour change.

**F. Invariants 6/7 and the "nothing else changes" clause — the diff is specifiers only.**

```
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --stat
```

must list exactly the 58 files of §4b — no `package-lock.json`, no config file, no `.njk`. Then

```
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff
```

read once: every `-`/`+` pair must be an import, `vi.mock`, `vi.importActual` or `import()` statement (possibly
re-wrapped by prettier), or the four deleted `package.json` lines. Any other hunk is out of scope — revert it with
the Edit tool. In particular the diff must contain **no** added `packageManager`, `engines.npm`, `lint:arch`,
`depcruise:*` or `test:fit:*` entries borrowed from animals' `package.json`.

**G. Invariant 4 — no shared package, no cross-repo import.** Trivially true: every new specifier begins with `./` or
`../` and stays inside the ins repo. Prove it with the import-only grep, which must return nothing (it does today):

```
grep -rn "from '.*trade-imports-\(animals\|plants\)" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```

The broader `grep -rn "trade-imports-animals\|trade-imports-plants"` over `ins/src` returns exactly two pre-existing
prose mentions that are not specifiers and are out of this stage's scope — `src/config/config.js:280` (a convict `doc`
string) and `src/server/common/helpers/notification-dashboard-helper.js:77` (a JSDoc comment). That two-line output is
the accepted baseline; do not edit those comments in this stage.

---

## 7. Commit

Stage `src`, `test-helpers` and `package.json` (`git -C … add src test-helpers package.json`), check
`git -C … status --short` shows nothing unstaged, then commit on `feat/NO_JIRA-frontend-alignment`:

```
refactor(alignment): s02-relative-imports — replace the #/ import alias with relative paths

Rewrite every #/ specifier in src/ and test-helpers/ to the shortest
relative path, as the journey frontends write them, and drop the
package.json imports field that backed the alias.
```

plus the required trailers. Do not push to `main`; do not merge.

---

## 8. Out of scope — leave alone even though it is tempting

- **Moving `test-helpers/component-helpers.js`** under `src/server/common/test-helpers/` (where the testing guide
  and hapi guide place it) or deleting it to match animals. D2: not this stage; recorded as an open question on the
  stage because the `targetTree` is silent about it.
- **Fixing plants' dead `test-helpers/component-helpers.js`** (dangling `#/` import, nothing imports it). Plants is
  not in this stage's `repos`.
- **`src/server/server.js` beyond E15** — `setupProxy`, `isStubMode` vs `isAuthStubMode`, the trailing comment
  plants carries: all s01 §8 / later stages.
- **`package.json` beyond E58** — animals' `engines.npm` / `packageManager` pin, `lint:arch`, `depcruise:*`,
  `test:fit:journeys`/`features`, dependency versions, the `overrides` block. s10-build-tooling owns tooling.
- **Any `vi.mock` → nock migration** (invariant 8 says mock at the network boundary). The module mocks this stage
  touches already exist; changing *how* something is mocked is s03/s04 territory, not a specifier rewrite.
- **`src/server/routes/home/` and `src/server/routes/error/`** — s05 moves them into `src/server/app/`. Their
  specifiers are rewritten here at their *current* depth; s05 will rewrite them again when they move. That is fine
  and expected.
- **`src/server/address-book/*`** — s06 restructures it into `src/server/app/features/address-book/`. Same story.
- **`src/server/common/clients/*`** — s04 reshapes them into `services/{address-book,countries,ins-backend}/`.
  Same story.
- **Comment tidy-up, identifier renames, import reordering, blank-line changes** in any touched file.
- **Adding the missing `isStubMode` mock, extra tests, or coverage** anywhere.
- **`README.md`, `src/server/common/README.md`, `sonar-project.properties`, `vitest.config.js`, `nodemon.json`,
  `vite.config.js`, `eslint.config.js`, `playwright.config.js`, `.github/workflows/*`, `Dockerfile`,
  `package-lock.json`** — none carries the alias; none changes.
- **The two journey repos** — this stage touches `ins` only.

---

## 9. Behaviour changes

None. Node resolves `'./server/common/helpers/start-server.js'` to the same file it resolved
`'#/server/common/helpers/start-server.js'` to; vitest does the same for every mock. Every route, every template,
every response is byte-identical.
