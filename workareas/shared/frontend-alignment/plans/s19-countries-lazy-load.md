# s19-countries-lazy-load — load reference data on first read in ins, as the journeys do

Ruling (Sam, 16 September 2026, question 13): yes. ins takes animals main's EUDPA-575 shape (commit `fb3615e3`:
load reference data on first read, not at startup). Plants no longer needs the port — its main merged the same
change as PR #71 (`77a5aa7`) and the alignment branch took it when main was merged in again.

**Every choice below is made. The implementor chooses nothing and adds nothing.** Where this plan says "whole
file", replace the file's contents exactly; where it says "edit", change only the lines named.

| key | role | Bash path (tilde) | Read/Edit path (absolute) |
|---|---|---|---|
| ins | the only repo that changes | `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` |
| plants | read-only reference for the lazy-cache shape | `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` |
| animals | read-only; measured against plants in step one, nothing changes | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` |
| tests | not touched this stage (see §7) | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests` |
| workspace | stages.json, this plan, logs | `~/git/defra/trade-imports-workspace` | `/Users/samfarrington/git/defra/trade-imports-workspace` |

All three frontends are on `feat/NO_JIRA-frontend-alignment`. ins HEAD when planned: `ed31dee869bcb6f9d390cf6ea734378d04e524de`.
Re-check `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend status --short --branch`
before the first edit; if the checkout has moved off that SHA, stop and report rather than editing on top of it.

Ladder (ins only): `format:check`, `lint`, `test`, `test:fit`. Run each to a file under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s19-countries-lazy-load-ins-<script>.log`
(write `:` in a script name as `-`) and read that file once with the Read tool. Formatting is fixed only by
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format`. Rollback is
`git stash push -u` only. Do not commit; the workflow commits after review.

## Baseline (planner, 16 September 2026 — all four green)

| script | result | log |
|---|---|---|
| `format:check` | clean — "All matched files use Prettier code style!" | `logs/s19-countries-lazy-load-baseline-ins-format-check.log` |
| `lint` | clean — eslint, stylelint, depcruise ("no dependency violations found (55 modules, 133 dependencies cruised)") | `logs/s19-countries-lazy-load-baseline-ins-lint.log` |
| `test` | 58 files, 553 tests passed | `logs/s19-countries-lazy-load-baseline-ins-test.log` |
| `test:fit` | 50 passed | `logs/s19-countries-lazy-load-baseline-ins-test-fit.log` |

Any red after this stage is this stage's. There are **no coverage thresholds** in `vitest.config.js`, so a coverage
shift is not a gate.

Expected end counts: **59 test files** (one deleted, two added), **563 tests**. Arithmetic:
553 − 4 (`countries/countries.test.js` deleted, 4 tests) + 11 (`services/run-mode.test.js`, §5A) − 1 (add's
reference-data banner test deleted, §5C) + 4 (`features/reference-data-outage.test.js`, §5B) = 563.
`address-countries.test.js` is rewritten but keeps its test count. `test:fit` stays **50 passed** — the FIT suite
runs `STUB_MODE=true`, which short-circuits the loader.

---

## Step one: plants measured against animals (done by the planner; nothing here to implement)

`diff -rq` of `src/server/app/services/countries` between plants and animals produces **no output**: `index.js`,
`client.js` and `stub.js` are byte-equal across the two journeys. The only differences are in the run-mode tests
and in the neighbouring ports service. `diff plants animals` for
`src/server/app/services/run-mode.test.js` — `<` is plants, `>` is animals:

| # | line | plants | animals | direction |
|---|---|---|---|---|
| 1 | 39, 41 | the client's block-filter test uses a made-up block, `BLOCK_ONE` | uses the real block, `GBNAG_SPS_EX` | **plants** is the reference: the client test proves the client forwards *any* block, and the real block is pinned separately in the service test |
| 2 | 99–100 | carries a two-line comment above the real-mode self-load test: `// The block code is the one 'countries/index.js' asks the reference-data` / `// service for, so it is pinned to that source rather than freely chosen.` | no comment | **plants** — it is a why-comment explaining why that one test may not choose freely |
| 3 | 189 | the ports fetch-once test also calls `await ports.portOptions()` | no such call | **plants** — plants' `ports/index.js` has an extra reader |

Related drift found while measuring, for the report's table (not fixed here):

- `services/ports/index.js` is **not** byte-equal between the journeys. Plants extracts
  `const displayName = (port) => \`${port.name} (${port.code})\`` and adds a third reader,
  `portOptions()`, returning `{ value, text }` pairs; animals has neither. Plants' shape is the tidier one.
- Both journeys' `countries/client.js` reads `process.env.TRADE_IMPORTS_REFERENCE_DATA_URL` directly and sends
  **no** trace header, while their own `address-book/client.js` sends one. The journeys are inconsistent with
  themselves; ins is consistent (convict + trace header everywhere). See D2.

None of the three run-mode differences reaches ins: ins has no `ports` service, and ins does not send a `blocks`
filter (D5). They are recorded in the stage notes for the drift table only.

---

## 0. Decisions

| # | Decision |
|---|---|
| **D1** | **The lazy-cache *mechanism* is ported verbatim; the *reader surface* stays ins's.** ins's `services/countries/index.js` gets plants' exact `ensureLoaded` body — module-scope cache, module-scope `loaded` flag, `isStubMode() \|\| loaded` short-circuit, `try`/`catch` that rethrows `Boom.serverUnavailable('Reference data unavailable', { dataset: 'countries', cause: err })`, flag set only on success. Its one reader keeps the name and return shape it has today: `getCountries()` → `[{ code, name }]`. Every clause of the brief's mechanism sentence is satisfied. |
| **D2** | **`services/countries/client.js` does not change.** EUDPA-575 (`fb3615e3`) touched `index.js`, not the client, and the ruling is about *when* reference data loads. ins's client resolves its base URL through convict and sends the `getTraceId()` trace header — chassis hardening this programme backports *to* the journeys, not away from ins. Copying plants' client would silently drop both. |
| **D3** | **`services/countries/stub.js` does not change.** It keeps `export const COUNTRIES = [...]` — the four canned rows the FIT specs and the smoke spec depend on. Plants' `COUNTRY_LABELS` map exists because plants' readers are label-shaped; ins's reader is list-shaped. The brief's own carve-out is "except for the stub data each seeds". |
| **D4** | **The brief's "byte-equal with plants' countries service" end state is NOT reached, deliberately.** Reaching it would force three behaviour changes the brief does not declare: (a) the address-book country list would narrow from the full MDM list to the `GBNAG_SPS_EX` animal-products export block; (b) the dashboard would stop resolving a `GB` origin to a name, because GB is not in that block; (c) ins would lose the trace header on its reference-data call (D2). The brief declares exactly two behaviour changes and this plan makes exactly those two plus the 503 propagation they imply. Recorded as a stage note and raised as an open question so Sam can rule on porting the full reader surface (`originLabel`, `originCountries`, `addressCountries`, `countryCodeOf`) as its own stage. **Do not reopen this in the implementation — build what is written.** |
| **D5** | **`getCountries` loses its `blocks` parameter; `fetchCountries` keeps its.** A module-scope cache holds one list, so a per-call filter has no meaning. Every ins caller already passes no blocks, so dropping it preserves today's behaviour (the full MDM country list). `client.js` keeps `fetchCountries(blocks)` untouched (D2) and `run-mode.test.js` keeps pinning that the client forwards a block when given one. |
| **D6** | **ins has exactly one reference-data reader: countries.** `services/address-book` reads `tradeImportsAddressBookApi` per organisation and `services/ins-backend` reads `tradeImportsInsBackendApi` per query — both are request-scoped business data, not reference data, and neither is cacheable at module scope. Nothing else is treated. (Planner grep for `tradeImportsReferenceDataApi` across `src/`: `config.js`, `countries/client.js`, `test-helpers/real-mode.js` only.) |
| **D7** | **A failed load is a 503 error page on every page that reads countries.** The service rejects with `Boom.serverUnavailable`; each controller lets a Boom through to `catchAll`, which already renders `shared/error` with the response's status code. The idiom is the one `edit/controller.js` POST already uses — `if (err.isBoom) { throw err }` as the **first** statement of the catch — added to dashboard GET, list GET, add GET and add POST. `edit` GET and `view` GET already pass Boom through `boomFor`, so they need no guard. |
| **D8** | **`getAddressFormCountries`'s empty-list guard becomes the same Boom.** Today it throws a bare `Error('Country reference data is unavailable')`, which under D7 would render a 500 while a reachable-but-broken reference data renders a 503 — two shapes for one failure. Making it `Boom.serverUnavailable('Reference data unavailable', { dataset: 'countries' })` collapses the controller rule to one line ("a Boom propagates") and gives an empty MDM list the same 503 page. Declared as a behaviour change. |
| **D9** | **The three `.catch(() => [])` swallows go.** `view/controller.js` GET, and `countryItemsOrNone()` in both `add` and `edit`. After the lazy cache, the second read inside one handler is a cache hit and cannot fail; before a successful load, the Boom must reach `catchAll` (D7). `countryItemsOrNone` is renamed `loadCountryItems` in both files, because "OrNone" no longer describes it. |
| **D10** | **Tests mock at the network boundary with nock — never `vi.stubGlobal('fetch')`.** Invariant 8, and ins's own `docs/testing.md` says it in terms: "never `vi.mock` a service barrel, and never mock `global.fetch`". The journeys stub `fetch` only because they have no nock. Every new and changed test here answers `/countries` with a nock interceptor from `referenceDataApi()`. |
| **D11** | **A cold cache is bought with `vi.resetModules()` + dynamic `import()`, and mode is flipped with `process.env.STUB_MODE`, not `config.set`.** The module-scope `loaded` flag is per test *file*; a test that needs an unloaded cache must re-import the service. A re-import also pulls a fresh `config.js`, which cannot see a `config.set` applied to the statically imported instance — so `runInRealMode()` is useless in a resetting file. `process.env.STUB_MODE` reaches the fresh convict instance (`stubMode` is `env: 'STUB_MODE'`, `STRICT_BOOLEAN` accepts the literal strings `'true'`/`'false'`), which is exactly what the journeys' `run-mode.test.js` does. Two files use this pattern: the new `services/run-mode.test.js` and the `#getAddressFormCountries` describe in `address-countries.test.js`. |
| **D12** | **`services/countries/countries.test.js` is replaced by `services/run-mode.test.js`**, at `src/server/app/services/run-mode.test.js` — the journeys' own location and name, and the file the brief names. It covers the client, the service in both modes, and mode resolution. This is a deliberate exception to ins's `services/<name>/<name>.test.js` convention, recorded in `docs/testing.md` (D15). |
| **D13** | **The end-to-end 503 proof gets its own file, `src/server/app/features/reference-data-outage.test.js`.** The page-level outage cannot be tested inside an existing controller test file: those files load the cache in their first test, so a later "reference data is down" test would never reach the network and would render 200. A separate file gets a fresh module registry, and because a failed load leaves `loaded` false every test in it stays cold. The existing add-page banner test (`add/controller.test.js:95`) is **deleted** and its intent re-homed here as a 503 assertion. |
| **D14** | **No changes to `dashboard`, `list`, `edit` or `view` controller tests.** Each serves one country list from a `beforeEach`, and every test in the file expects that same list, so a cache loaded by the first test serves the rest correctly. The unused persisted interceptors are cleared by `refuseOutboundHttp`'s `nock.cleanAll()`; nothing asserts pending mocks. |
| **D15** | **Docs follow the code**: `architecture.md` loses its "there is no `prime()` step: countries are fetched per request rather than primed at boot" bullet and gains the lazy-load sentence; `services.md`'s countries section is rewritten; `features.md`'s `address-countries.js` bullet drops "throws when reference data is empty"; `testing.md` records the `run-mode.test.js` exception. |
| **D16** | **`real-mode.js` is not changed.** `serveCountries(list)` still works: nock skips query matching when `.query()` is not called, and ins sends no `blocks` (D5) so the path is a bare `/countries` either way. No new helper is added — the outage file registers its own one-line interceptor. |

---

## 1. Moves

| from | to | note |
|---|---|---|
| `src/server/app/services/countries/countries.test.js` | `src/server/app/services/run-mode.test.js` | **not** a move — delete the old file (`git -C … rm`) and write the new one from §5A. The contents are rewritten, not relocated. |

No source file moves. No file is renamed.

---

## 2. Edits

Apply in this order. Every path below is relative to
`/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`.

### 2A. `src/server/app/services/countries/index.js` — whole file

Current contents (6 lines) are replaced entirely. The shape below is plants'
`src/server/app/services/countries/index.js` lines 1–30 with the labels map swapped for ins's list and the
`blocks` argument dropped (D5). The doc comment is plants' text with its startup-priming clause removed — ins
never had a priming step, so that clause would be a migration comment (invariant 6):

```js
import Boom from '@hapi/boom'
import { COUNTRIES } from './stub.js'
import { fetchCountries } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let countries = [...COUNTRIES]
let loaded = false

/** Load the country list from the reference-data service, once. Every reader
 * calls this, so the list is fetched on the first read rather than on every
 * request. In stub mode the seeded COUNTRIES play the role of a loaded cache
 * and this is a no-op. A failed load leaves `loaded` false so the next reader
 * retries; a success flips the flag and later calls short-circuit. */
export const ensureLoaded = async () => {
  if (isStubMode() || loaded) {
    return
  }
  try {
    countries = await fetchCountries()
    loaded = true
  } catch (err) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'countries',
      cause: err
    })
  }
}

export const getCountries = async () => {
  await ensureLoaded()
  return countries
}
```

Both imports resolve in ins as they stand: `./stub.js` exports `COUNTRIES`, and
`../../../common/services/mode.js` is ins's `isStubMode`. `@hapi/boom` is already a dependency (used by
`stored-address.js` and `edit/controller.js`).

### 2B. `src/server/app/features/address-book/address-countries.js` — two edits

Add the Boom import at the top of the import block (it sorts first, as it does in `stored-address.js` and
`edit/controller.js` — a blank line after it):

```js
import Boom from '@hapi/boom'

import { getCountries } from '../../services/countries/index.js'
```

Replace the empty-list throw in `getAddressFormCountries` (D8). From:

```js
  if (!countries?.length) {
    throw new Error('Country reference data is unavailable')
  }
```

to:

```js
  if (!countries?.length) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'countries'
    })
  }
```

Nothing else in the file changes. `GB_COUNTRY`, the GB dedupe filter, `buildCountryItems`,
`buildCountrySelectItems` and `resolveCountryCodeFromSearchTerm` all stay exactly as they are.

### 2C. `src/server/app/features/dashboard/controller.js` — one edit

In `get`, make the Boom guard the first statement of the catch:

```js
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    logger.error({ err }, 'Failed to load dashboard')
```

The rest of the catch — the recoverable-error banner at 500 for an ins-backend failure — is unchanged.

### 2D. `src/server/app/features/address-book/list/controller.js` — one edit

Same guard, first in `get`'s catch, before `logger.error({ err, orgId }, 'Failed to load address book')`.

### 2E. `src/server/app/features/address-book/add/controller.js` — four edits

1. Rename `countryItemsOrNone` and drop its swallow (D9):

```js
const loadCountryItems = async () =>
  countryItemsOf(await getAddressFormCountries())
```

2. Update its two call sites in `post`'s catch (`countryItems: await countryItemsOrNone()` → `countryItems: await loadCountryItems()`), both of them.

3. In `get`'s catch, add the Boom guard first, before `logger.error({ err }, 'Failed to load address form countries')`. Keep the rest of the catch: a non-Boom failure still renders the recoverable banner at 500.

4. In `post`'s catch, add the Boom guard **first — above the `isValidationFailure(err)` branch**, matching the order `edit/controller.js` POST already uses:

```js
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    if (isValidationFailure(err)) {
```

### 2F. `src/server/app/features/address-book/edit/controller.js` — two edits

1. Rename `countryItemsOrNone` and drop its swallow:

```js
const loadCountryItems = async () =>
  countryItemsOf(await getAddressFormCountries())
```

2. Update the one call site inside `rejected`: `countryItems: await loadCountryItems()`.

`post`'s catch already opens with `if (err.isBoom) { throw err }` — leave it. `get`'s catch routes through
`boomFor`, which returns a Boom unchanged — leave it.

### 2G. `src/server/app/features/address-book/view/controller.js` — one edit

Drop the swallow in `get` (D9):

```js
    const countries = await getAddressFormCountries()
```

`get`'s catch already routes through `boomFor`, so the Boom reaches `catchAll` as a 503. `countryNameOf`'s
`?? countryCode` fallback stays — it still covers a code the list does not carry.

### 2H. Docs — four files under `src/server/app/docs/`

**`architecture.md`** — in the "how ins differs" list, replace

```
- there is no `prime()` step: countries are fetched per request rather
  than primed at boot.
```

with

```
- there is no `prime()` step: the countries service loads itself on the
  first read and caches the list for the life of the process.
```

**`services.md`** — replace the `### countries` body with:

```
[`index.js`](../services/countries/index.js) exports `getCountries()` and
`ensureLoaded()` — the reference-data `/countries` list, or the stub's
`COUNTRIES`. The list is fetched on the first read and cached at module
scope for the life of the process; a failed load leaves the cache unloaded
so the next read retries, and rejects with `Boom.serverUnavailable`, which
`catchAll` renders as the shared error page with a 503. In stub mode the
seed plays the role of a loaded cache and nothing is fetched.
Feature-side, [`address-countries.js`](../features/address-book/address-countries.js)
puts GB first and rejects the same way on an empty list.
```

**`features.md`** — in the `address-countries.js` bullet, replace
`puts GB first, throws when reference data is empty,` with
`puts GB first, rejects with a 503 Boom when reference data is empty,`.

**`testing.md`** — in the "Service tests" section, after the first sentence, add:

```
The exception is countries: its tests live in
[`services/run-mode.test.js`](../services/run-mode.test.js), beside the
journeys' file of the same name, because the module-scope cache has to be
imported cold (`vi.resetModules()` plus a dynamic import) and the mode
flipped through `process.env.STUB_MODE` rather than `config.set` — a
re-imported service reads a fresh convict instance.
```

---

## 3. New files

| path | intent | file to imitate |
|---|---|---|
| `src/server/app/services/run-mode.test.js` | the client pins, the lazy-cache pins in both modes, and the mode-resolution pins | plants' `src/server/app/services/run-mode.test.js` for the *test list*; ins's deleted `countries/countries.test.js` for the *nock idiom*. Full text in §5A. |
| `src/server/app/features/reference-data-outage.test.js` | the end-to-end proof that each page reading countries renders the shared error page as a 503 when reference data is down | ins's `features/address-book/view/controller.test.js` for the server/auth/nock scaffolding. Full text in §5B. |

No new source files. No new test helper.

---

## 4. Imports

This stage disturbs exactly one import surface: `services/countries/index.js` stops exporting the `blocks`
parameter and starts exporting `ensureLoaded`.

1. **`getCountries` keeps its name and module path.** No consumer import statement changes. The only call-site
   change is dropping arguments — and no ins caller passes any today, so there is nothing to drop.
2. **`ensureLoaded` is imported only by tests**, and only in `services/run-mode.test.js`, through the dynamic
   `import('./countries/index.js')`. No source file imports it.
3. **`Boom` is added to `address-countries.js`** as `import Boom from '@hapi/boom'`, first in the import block
   with a blank line after it — the order `stored-address.js` and `edit/controller.js` use.
4. New test files use relative paths from their own directory. Count the hops rather than copying a neighbour's:
   from `src/server/app/features/` the server is `../../server.js`, the status codes are
   `../../common/constants/status-codes.js`, the test helpers are `../../common/test-helpers/…` and the OIDC
   module to mock is `../../../auth/get-oidc-config.js`. From `src/server/app/services/` the config is
   `../../../config/config.js` and the helpers are `../../common/test-helpers/real-mode.js`.
5. Nothing crosses a repo boundary and no barrel is introduced (invariant 4).

---

## 5. Tests

### 5A. New — `src/server/app/services/run-mode.test.js`

Delete `src/server/app/services/countries/countries.test.js` first:

```bash
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend rm src/server/app/services/countries/countries.test.js
```

Then write the new file. Nine tests. Read the shape carefully — the `vi.resetModules()` + dynamic-import dance
is load-bearing (D11) and a statically imported service would make four of these tests pass for the wrong reason.

```js
import nock from 'nock'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../config/config.js'
import { refuseOutboundHttp } from '../../common/test-helpers/real-mode.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const REFERENCE_DATA_URL = config.get('tradeImportsReferenceDataApi.baseUrl')
const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-123'
const ZEDLAND = { code: 'ZZ', name: 'Zedland' }
const STUB_SEED = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IE', name: 'Ireland' }
]
const originalMode = process.env.STUB_MODE

const referenceData = () => nock(REFERENCE_DATA_URL)

const serveCountryList = (countries = [ZEDLAND]) =>
  referenceData().get('/countries').reply(200, countries)

const importCountriesIn = async (mode) => {
  process.env.STUB_MODE = mode
  vi.resetModules()
  return import('./countries/index.js')
}

describe('countries service', () => {
  refuseOutboundHttp()

  beforeEach(() => {
    getTraceIdMock.mockReturnValue(TRACE_ID)
  })

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.STUB_MODE
    } else {
      process.env.STUB_MODE = originalMode
    }
  })

  describe('#fetchCountries', () => {
    test('Should GET /countries with the trace header and parse the list', async () => {
      const scope = referenceData()
        .get('/countries')
        .matchHeader(TRACING_HEADER, TRACE_ID)
        .reply(200, [ZEDLAND])
      const { fetchCountries } = await import('./countries/client.js')

      await expect(fetchCountries()).resolves.toEqual([ZEDLAND])
      expect(scope.isDone()).toBe(true)
    })

    test('Should request countries filtered to the given blocks', async () => {
      const scope = referenceData()
        .get('/countries')
        .query({ blocks: 'BLOCK_ONE' })
        .reply(200, [ZEDLAND])
      const { fetchCountries } = await import('./countries/client.js')

      await expect(fetchCountries(['BLOCK_ONE'])).resolves.toEqual([ZEDLAND])
      expect(scope.isDone()).toBe(true)
    })

    test('Should throw with the status on a non-ok response', async () => {
      referenceData().get('/countries').reply(503)
      const { fetchCountries } = await import('./countries/client.js')

      await expect(fetchCountries()).rejects.toMatchObject({
        message: 'Failed to get countries',
        status: 503
      })
    })
  })

  describe('in stub mode', () => {
    test('Should serve the seeded stub list through getCountries', async () => {
      const countries = await importCountriesIn('true')

      await expect(countries.getCountries()).resolves.toEqual(STUB_SEED)
    })

    test('Should short-circuit ensureLoaded and never call reference data', async () => {
      const scope = serveCountryList()
      const countries = await importCountriesIn('true')

      await countries.ensureLoaded()

      await expect(countries.getCountries()).resolves.toEqual(STUB_SEED)
      expect(scope.isDone()).toBe(false)
    })
  })

  describe('in real mode', () => {
    test('Should load on the first read and serve the fetched list', async () => {
      const scope = serveCountryList()
      const countries = await importCountriesIn('false')

      await expect(countries.getCountries()).resolves.toEqual([ZEDLAND])
      expect(scope.isDone()).toBe(true)
    })

    test('Should fetch once across many reads once loaded', async () => {
      const scope = serveCountryList()
      const countries = await importCountriesIn('false')

      await countries.getCountries()
      await countries.getCountries()

      await expect(countries.getCountries()).resolves.toEqual([ZEDLAND])
      expect(scope.isDone()).toBe(true)
    })

    test('Should re-attempt on the next read after a failed load', async () => {
      referenceData().get('/countries').reply(503)
      const countries = await importCountriesIn('false')

      await expect(countries.getCountries()).rejects.toMatchObject({
        isBoom: true
      })

      const scope = serveCountryList()
      await expect(countries.getCountries()).resolves.toEqual([ZEDLAND])
      expect(scope.isDone()).toBe(true)
    })

    test('Should reject with a serverUnavailable Boom on load failure', async () => {
      referenceData().get('/countries').reply(503)
      const countries = await importCountriesIn('false')

      await expect(countries.getCountries()).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 503 },
        data: { dataset: 'countries' }
      })
    })
  })

  describe('mode resolution', () => {
    test('Should select real mode when the flag is false', async () => {
      process.env.STUB_MODE = 'false'
      vi.resetModules()
      const { isStubMode } = await import('../../common/services/mode.js')

      expect(isStubMode()).toBe(false)
    })

    test('Should select stub mode when the flag is true', async () => {
      process.env.STUB_MODE = 'true'
      vi.resetModules()
      const { isStubMode } = await import('../../common/services/mode.js')

      expect(isStubMode()).toBe(true)
    })
  })
})
```

Why each assertion is the one it is:

- **`expect(scope.isDone()).toBe(false)`** in the stub short-circuit test is the "no network call" proof at the
  network boundary — stronger than "it didn't throw", and it does not need a `fetch` spy (D10).
- **fetch-once** is proved by a *single, non-persisted* interceptor plus `refuseOutboundHttp`'s
  `nock.disableNetConnect()`: a second fetch would find no interceptor, be refused, and reject. No call counter
  is needed, and none may be added.
- **retry-after-failure** registers the success interceptor only *after* the first read has rejected, so it also
  proves the failed load did not poison the cache.
- **`data: { dataset: 'countries' }`** pins the Boom payload the service attaches, so a future rename of the
  dataset key fails here rather than silently.
- The **mode-resolution** pair runs the real convict schema, so it is what proves `STUB_MODE` actually reaches
  the freshly imported service in the tests above. (`common/services/mode.test.js` mocks config and stays as it
  is — it tests the production guard, not the wiring.)

Count: 3 client + 2 stub-mode + 4 real-mode + 2 mode-resolution = **11 tests in one file**.

### 5B. New — `src/server/app/features/reference-data-outage.test.js`

Four tests, one per page that reads countries and can be reached without first satisfying another upstream.
Every test starts with a cold cache because a failed load never sets `loaded`.

```js
import { describe, expect, test, vi } from 'vitest'

import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../common/test-helpers/session-auth.js'
import {
  addressBookApi,
  referenceDataApi,
  runInRealMode
} from '../../common/test-helpers/real-mode.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'
const ERROR_PAGE_TITLE = 'Something went wrong | Import notification service'

const refuseCountries = () =>
  referenceDataApi()
    .get('/countries')
    .reply(statusCodes.serviceUnavailable, { title: 'Service Unavailable' })

describe('#referenceDataOutage', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const expectServiceUnavailablePage = ({ result, statusCode }) => {
    expect(statusCode).toBe(statusCodes.serviceUnavailable)
    expect(result).toContain(ERROR_PAGE_TITLE)
    expect(result).toContain('>503</h1>')
    expect(result).not.toContain('govuk-notification-banner')
  }

  test('Should serve the dashboard as a 503 error page', async () => {
    refuseCountries()

    expectServiceUnavailablePage(
      await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('outage-dashboard')
      })
    )
  })

  test('Should serve the address book as a 503 error page', async () => {
    refuseCountries()

    expectServiceUnavailablePage(
      await server.inject({
        method: 'GET',
        url: '/address-book',
        auth: sessionAuth('outage-list')
      })
    )
  })

  test('Should serve the add address form as a 503 error page', async () => {
    refuseCountries()

    expectServiceUnavailablePage(
      await server.inject({
        method: 'GET',
        url: '/address-book/add',
        auth: sessionAuth('outage-add')
      })
    )
  })

  test('Should serve a stored address as a 503 error page', async () => {
    addressBookApi()
      .get(`/organisation/${ORG_ID}/addresses/${ADDRESS_ID}`)
      .reply(statusCodes.ok, {
        id: ADDRESS_ID,
        name: 'Highland Livestock Ltd',
        addressLine1: "14 Drover's Way",
        townOrCity: 'Inverness',
        postcode: 'IV2 3JH',
        countryCode: 'GB',
        deleted: false
      })
    refuseCountries()

    expectServiceUnavailablePage(
      await server.inject({
        method: 'GET',
        url: `/address-book/${ADDRESS_ID}`,
        auth: sessionAuth('outage-view')
      })
    )
  })
})
```

Notes for the implementor:

- **The dashboard, list and add tests need no other interceptor**, because each controller awaits countries
  before it calls the address-book or ins-backend client. The view test does need the address-book interceptor,
  because `loadStoredAddress` runs first.
- **`expect(result).not.toContain('govuk-notification-banner')`** is what separates the new behaviour from the
  old: the old add-page failure rendered the form with a recoverable banner, the new one renders the shared
  error page.
- `sessionAuth` supplies the organisation id, so `requireOrganisationId` passes.
- Do **not** add `serveCountries` to this file, and do not add a `beforeEach` that serves countries — the point
  of the file is that the cache never loads.

### 5C. Changed — `src/server/app/features/address-book/add/controller.test.js`

**Delete** the test at lines 95–113, `'GET shows the recoverable-error banner when reference data cannot be reached'`,
in full. Its intent now lives in §5B as a 503 assertion (D13). After deleting it, the `nock` default import
(line 1) and the `referenceDataApi` named import (line 10) become unused — remove both, or `lint:js` will fail
on `no-unused-vars`. Check first with
`grep -n "nock\|referenceDataApi" src/server/app/features/address-book/add/controller.test.js`; if either is
still used elsewhere in the file, keep it.

No other test in that file changes: the first test loads the cache from `mockCountries`, and every later test
expects that same list.

### 5D. Changed — `src/server/app/features/address-book/address-countries.test.js`

Only the `#getAddressFormCountries` describe changes. It currently uses `runInRealMode()` with two tests that
serve different country lists — under a module-scope cache the second would be served the first's list and would
never reject. Rewrite that describe (and only that describe) to the cold-import pattern (D11). The three pure
describes — `#buildCountrySelectItems`, `#buildCountryItems`, `#resolveCountryCodeFromSearchTerm` — are unchanged
and must be left exactly as they are.

Replace the imports at the head of the file with:

```js
import nock from 'nock'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import { refuseOutboundHttp } from '../../../common/test-helpers/real-mode.js'
import {
  buildCountryItems,
  buildCountrySelectItems,
  resolveCountryCodeFromSearchTerm,
  GB_COUNTRY
} from './address-countries.js'
```

(`getAddressFormCountries` leaves the static import list — it is now imported dynamically.)

And replace the `#getAddressFormCountries` describe with:

```js
const REFERENCE_DATA_URL = config.get('tradeImportsReferenceDataApi.baseUrl')
const originalMode = process.env.STUB_MODE

const serveCountryList = (countries) =>
  nock(REFERENCE_DATA_URL).get('/countries').reply(200, countries)

const importAddressCountries = async () => {
  process.env.STUB_MODE = 'false'
  vi.resetModules()
  return import('./address-countries.js')
}

describe('#getAddressFormCountries', () => {
  refuseOutboundHttp()

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.STUB_MODE
    } else {
      process.env.STUB_MODE = originalMode
    }
  })

  test('Should put GB first and keep it once', async () => {
    serveCountryList([
      { code: 'FR', name: 'France' },
      { code: 'GB', name: 'United Kingdom duplicate' }
    ])
    const { getAddressFormCountries } = await importAddressCountries()

    const countries = await getAddressFormCountries()

    expect(countries[0]).toEqual(GB_COUNTRY)
    expect(countries[1]).toEqual({ code: 'FR', name: 'France' })
    expect(countries.filter((country) => country.code === 'GB')).toHaveLength(1)
  })

  test('Should reject with a serverUnavailable Boom when the list is empty', async () => {
    serveCountryList([])
    const { getAddressFormCountries } = await importAddressCountries()

    await expect(getAddressFormCountries()).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 503 },
      data: { dataset: 'countries' }
    })
  })
})
```

`GB_COUNTRY` is compared against the statically imported constant and the dynamically imported function's
result; they are structurally equal, and `toEqual` compares structurally, so the split import is safe.

### 5E. Unchanged tests — do not touch

`dashboard/controller.test.js`, `address-book/list/controller.test.js`, `address-book/edit/controller.test.js`,
`address-book/view/controller.test.js`, `common/helpers/errors.test.js`, `common/services/mode.test.js`, every
`*.fit.spec.js`, and the tests repo.

**`errors.test.js` already carries the end-to-end 503 proof** (its `/test/service-unavailable` route and the
`'Should serve the shared error page as a 503 when a service behind the page is unavailable'` test, lines 26–33
and 71–84). Verify it is there and leave it alone — do not add a second one.

---

## 6. Invariants to prove

Run each of these after the edits and before the ladder. They are cheap and each one catches a specific way this
stage can go wrong.

| # | invariant at risk | check | expected |
|---|---|---|---|
| 1 | **Public URL surface of ins does not change** | `grep -rn "server.route\|pageRoutes(" src/server/app/features src/server/app/routes.js` in ins | the same route list as before: `/`, `/address-book`, `/address-book/add`, `/address-book/{id}`, `/address-book/{id}/edit`, `/address-book/{id}/delete`. No path literal is added or removed by this stage. |
| 2 | **No `fetch` is mocked and no service barrel is `vi.mock`ed** (invariant 8, D10) | `grep -rn "stubGlobal\|global.fetch\|vi.mock('\./" src/server/app` | no hits in any file this stage writes. The only `vi.mock` calls in new files are `@defra/hapi-tracing` and `../../../auth/get-oidc-config.js`. |
| 3 | **Reference data is read once per process, not per request** | `grep -rn "fetchCountries" src/server/app` | exactly two hits: the export in `countries/client.js` and the single call inside `ensureLoaded`. If `fetchCountries` appears in any controller, the port is wrong. |
| 4 | **Every reader goes through `ensureLoaded`** | read `src/server/app/services/countries/index.js` | `getCountries` is the only export other than `ensureLoaded`, and its first statement is `await ensureLoaded()`. |
| 5 | **A Boom reaches `catchAll` from every page that reads countries** | `grep -rn "isBoom" src/server/app/features` | six hits: `add/controller.js` (get + post), `list/controller.js`, `dashboard/controller.js`, `edit/controller.js` (post), `stored-address.js` (`boomFor`). |
| 6 | **No swallow is left** | `grep -rn "catch(() =>" src/server/app` | no hits. |
| 7 | **No new shared package, no cross-repo import** (invariant 4) | `grep -rn "trade-imports-plants\|trade-imports-animals\|\.\./\.\./\.\./\.\./\.\./" src/server/app` | no hits. |
| 8 | **No migration or rename comments** (invariant 6) | `grep -rn "EUDPA-575\|was primed\|previously\|used to " src/server/app` | no hits. The one comment this stage adds is the `ensureLoaded` why-comment in §2A. |
| 9 | **Copy invariant untouched** (invariant 5) | `git -C … diff --name-only` | no `copy.en.js`, `copy.cy.js` or `.njk` file appears. This stage creates no user-facing string; the 503 page's text is `sharedCopy.errorPage.unexpected`, which already exists. |
| 10 | **The declared behaviour changes are the only behaviour changes** | read the diff of the five controllers | each catch keeps its existing non-Boom handling verbatim; only the Boom guard and the `loadCountryItems` rename are added. |
| 11 | **`lint:arch`** (dependency-cruiser over `src/server/app`) | part of `npm run lint` | still "no dependency violations found". The new test files add no module edge that was not already there. |

Then the ladder, in order, each to its own log, each read once:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format:check > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s19-countries-lazy-load-ins-format-check.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run lint > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s19-countries-lazy-load-ins-lint.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend test > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s19-countries-lazy-load-ins-test.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run test:fit > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s19-countries-lazy-load-ins-test-fit.log 2>&1
```

If `format:check` is red, fix it only with
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format`, then re-run the
check. For a Playwright failure read `test-results/*/error-context.md` inside the ins repo, not the tail of the
run.

---

## 7. Out of scope

Leave all of these alone, however tempting:

1. **The address-book service, ins-backend, and auth.** Named out of scope by the brief. They are request-scoped
   readers, not reference data (D6), and must not be given a module-scope cache.
2. **Any change to animals or plants.** The journeys already carry EUDPA-575. The three run-mode differences and
   the `ports/index.js` divergence found in step one are recorded in the stage notes for the report's drift
   table and are **not** fixed here.
3. **The full journey reader surface.** Do not add `originLabel`, `originCountries`, `addressCountries` or
   `countryCodeOf` to ins, and do not convert the address book to a name-keyed country binding. D4 settles this;
   it is raised as an open question for Sam and belongs to a later stage if he rules for it.
4. **The `GBNAG_SPS_EX` block filter.** ins keeps reading the full MDM country list (D5). Narrowing it would
   change which countries the address book offers and which origins the dashboard can name — neither is a
   behaviour change this brief declares.
5. **`services/countries/client.js` and `services/countries/stub.js`.** D2 and D3. In particular, do not remove
   the trace header and do not swap `COUNTRIES` for a `COUNTRY_LABELS` map.
6. **`common/test-helpers/real-mode.js`.** D16 — no new helper, no change to `serveCountries`.
7. **The tests repo.** Its ins specs pick "United Kingdom" in the select and assert it back
   (`tests/e2e/features/ins/address-book-edit.spec.ts`, `address-book-persistence.spec.ts`); the stack runs ins
   in real mode against real reference data, and this stage does not change which countries that list holds.
   Nothing there needs to move.
8. **An in-flight-request dedupe for `ensureLoaded`.** Two concurrent cold reads will each fetch. The journeys
   have the same gap and the brief does not ask for it. Do not add a promise latch.
9. **A cache TTL or a refresh endpoint.** The cache lives for the life of the process, exactly as the journeys'
   does.
10. **Nunjucks templates.** No template changes: the 503 page is the existing `shared/error` view, reached
    through the existing `catchAll`.
11. **`sonar`.** Never run it.
