# s04-services-shape — reshape the clients into `app/services`

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit/Write tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (already checked out, level with `origin`, clean tree, HEAD `794bd14`).

Reference files (journey frontends; animals and plants are byte-identical for every file named here except
`address-book/index.js`, where plants drops animals' `all()` — the shape is the same):

- `repos/trade-imports-animals-frontend/src/server/app/services/countries/index.js` — **the** shape the brief names:
  `stub.js` exports data, `client.js` exports the fetch, `index.js` is the public surface and asks `isStubMode()`
  **at call time**, never at module load.
- `repos/trade-imports-animals-frontend/src/server/app/services/countries/client.js` — a plain fetch that throws
  `Object.assign(new Error('Failed to get countries'), { status, statusText })`; no logger.
- `repos/trade-imports-animals-frontend/src/server/app/services/address-book/client.js` — `addressesUrl(orgId,
  addressId)` with the missing-organisation refusal (lines 19–33), `headers(orgId)` reading `getTraceId()` (lines
  35–43), `ORGANISATION_ID_HEADER`, `encodeURIComponent` on both path segments.
- `repos/trade-imports-animals-frontend/src/server/app/services/address-book/index.js` — `import * as client from
  './client.js'`, per-function `isStubMode()` branch (lines 94–99, 127–132).
- `repos/trade-imports-animals-frontend/src/server/app/services/address-book/address-book.test.js` — the "without an
  organisation" test (lines 227–247) and the public-surface test (lines 319–332).
- `repos/trade-imports-animals-frontend/src/server/app/services/ports/{index,client,stub}.js` — the same three-file
  shape at its smallest.
- `repos/trade-imports-plants-frontend/src/server/app/lib/http-status.js` — copied **verbatim** (3 lines).
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/consignor-select/controller.test.js`
  lines 368–379 — the precedent for a controller test that flips `config.set('stubMode', false)` and mocks the
  network rather than the service module.
- `repos/trade-imports-animals-frontend/src/server/app/services/document-uploads/stub.test.js` — precedent for a
  `stub.test.js` sitting inside a service folder.

Baseline (s03's closing ladder on `794bd14`, `logs/s03-stub-mode-ins-test.log` / `-test-fit.log`): unit suite
**48 files / 245 tests green**, `format:check` clean, `lint` clean, Playwright **49/49** green.
Expected after this stage: **48 files / 253 tests** (§5 arithmetic), Playwright still **49/49**.

This stage moves the three clients and the shared HTTP helper out of `src/server/common/clients/` into the journey
frontends' `src/server/app/{lib,services}` layout, changes their shape (object-of-methods → named exports; selector
evaluated once at import → `isStubMode()` asked on every call; trace id passed by every caller → read from the request
context inside the client; organisation id trusted → refused when missing), and rewrites every test that touched them
so that the mock sits at the network boundary (nock) instead of the module boundary (`vi.mock` + `__mocks__`). 3
files move, 14 are deleted, 14 are created, 16 are edited. Route surface, templates, schema, session, auth: untouched.

---

## 0. Decisions (made here so the implementor never has to choose)

| # | Question the brief left open | Decision |
|---|---|---|
| D1 | Object-of-methods (`addressBookClient.listAddresses(...)`) or named exports (`listAddresses(...)`) on the public surface? | **Named exports** — every reference `index.js` exports functions (`prime`, `search`, `party`, `list`). Every call site changes anyway because the trace parameter goes (brief), so this costs nothing extra. Same names in `stub.js`, `client.js` and `index.js` for the address book and INS backend (`listAddresses`, `createAddress`, `getAddress`, `updateAddress`, `deleteAddress`; `listNotifications`); the countries service follows animals' countries exactly — `stub.js` exports the data constant `COUNTRIES`, `client.js` exports `fetchCountries`, and the public surface keeps ins's consumer-facing name `getCountries` (it may serve stub data, so "fetch" would lie). |
| D2 | `__mocks__` folders moved, or nock at the network boundary? | **nock, everywhere.** Both `__mocks__` files are deleted and no new one is created. Every controller test that used to `vi.mock` a client module now boots the server in real mode (`config.set('stubMode', false)`, plants' consignor-select precedent) behind `nock.disableNetConnect()` and answers the HTTP calls with nock. Invariant 8 says exactly this, and the assertions get stronger: `toHaveBeenCalledWith(orgId, any(String), objectContaining({ q }))` becomes a nock `.query({ page: '1', q: 'France', countryCode: 'FR' })` that fails if the real query string is wrong. `csrf.test.js` needs no interceptor at all — it stays in stub mode and the countries stub renders the form. |
| D3 | Where does the mode flip and the nock boilerplate live? | **One test helper, `src/server/common/test-helpers/real-mode.js`** (§3 N15): `runInRealMode()` registers the `beforeAll`/`afterEach`/`afterAll` hooks for the enclosing `describe` (mode off, net connect refused, interceptors cleaned, mode restored); `refuseOutboundHttp()` is the net-connect half on its own for stub-mode describes; `addressBookApi()`, `referenceDataApi()`, `insBackendApi()` are nock scopes on the convict base URLs (so a developer with `TRADE_IMPORTS_*_URL` in their shell is not broken); `serveCountries(list)` is the persistent `/countries` interceptor every address-book page needs. s01's `test-server.js` is the precedent for a hook-free helper in this folder; this one registers hooks because seven files would otherwise repeat the same twelve lines. |
| D4 | The real clients read base URLs from convict (`config.get('tradeImportsAddressBookApi.baseUrl')`); animals' read `process.env` directly. Switch? | **Keep convict.** It is ins hardening (validated at boot, `strict` allowed-keys), s03 built on it, and the brief says nothing about config. Tests therefore need no `vi.resetModules()` dance: the mode is a `config.set` away and base URLs come from `config.get`. |
| D5 | The current `address-book-client.test.js` etc. `vi.mock('../../../config/config.js')` to fix base URLs, and mock the logger. Keep? | **No.** The convict defaults (`http://localhost:8089/8086/8090`) are what the tests nock; the helper reads them back from `config`. No config mock, no logger mock: neither has network behind it, but neither is needed either. |
| D6 | The countries real client logs `logger.error(...)` before throwing; animals' does not. | **Drop the client-level log** — plants' shape, and every caller already logs the failure with the error (which carries `status`) once. Named as behaviour change 2 in §9. The address-book and INS-backend clients never logged; unchanged. |
| D7 | Where does `mapApiErrorsToFormErrors` live? | **In `services/address-book/index.js`** — the brief says exported from the service, and it is the service's translation of the API's problem body into the shape the form renders, not an HTTP concern. `client.js` is HTTP only. |
| D8 | The old selector also re-exported `ORGANISATION_ID_HEADER` and `throwOnError`. Keep? | **No.** Nothing outside the old test imported them (grep in §1 proves it). The public surface is exactly six names — pinned by a test (§5). Tests that need the header name spell it out, as animals' do. |
| D9 | Missing-organisation refusal: in `client.js` (animals) or in `index.js` (covers the stub too)? | **`client.js`, animals verbatim** — "refuse to build a URL" is what the brief says, and the stub is a test double whose `orgId.endsWith(...)` already fails loudly on `undefined`. In ins the routes reach the service only after `requireOrganisationId` has thrown `Boom.forbidden`, so this is defence in depth (behaviour change 1, §9). |
| D10 | `HTTP_STATUS_*` constants: create `app/lib/http-status.js` now, or wait? | **Create it now, plants verbatim.** The target tree has it, this stage creates `app/lib/`, and its first two users are here: `address-book/client.js` (the two `response.status === 400` checks, today magic numbers) and `address-book/stub.js` (`status: 404`). `common/constants/status-codes.js` stays — both journeys keep both. |
| D11 | Stub CRUD semantics (`*-empty`, `*-paginated`, seed id `000000000000000000000001`, stateful per-org map) — align with animals' read-only `STUB_BOOK`? | **Keep ins's stub exactly** (brief: keep CRUD). The fit suite depends on those seeds (`fit/seed-address.js`, `list.fit.spec.js`). The file is rewritten to named exports and fat arrows, and its seed semantics get their first unit pins (§5), because the fit suite is the only thing that has ever exercised them. |
| D12 | `http-client.js` and its test: restyle to fat arrows while moving? | **No — pure `git mv`, byte-identical**, so git and GitHub see a rename (s01's Sonar lesson: rewritten moves count as new code). Same for `ins-backend/stub.test.js`, which changes only the import line and the dropped `'trace'` arguments. |
| D13 | The controllers keep `const traceId = getTraceId() ?? ''` for their `logger.error({ err, traceId, ... })` calls even though the clients no longer take it. Remove? | **Leave it.** `logger-options.js`'s mixin already stamps `trace.id` on every line, so the explicit field is redundant, but the controllers move to `app/features` in s06 and that is the stage to tidy them. The one forced change is `edit/controller.js`'s `renderEditForm`, whose `traceId` option becomes unused and goes. |
| D14 | `getAddressFormCountries(traceId)` in `address-countries.js` takes the trace only to hand it to the client. | **Drop the parameter** (`getAddressFormCountries()`), and the argument at all eight call sites. Otherwise the file is untouched — it stays at `src/server/address-book/` until s06. |
| D15 | Parameter name for the search/paging object the list functions take. | `search` — `listAddresses(orgId, search)` where `search = { page, q, countryCode }`; `listNotifications(search)` where `search = { page, sort, referenceNumber }`. Not `options`/`params`. |
| D16 | Trace-header assertions in the service tests: `getTraceId()` returns `undefined` outside a request, so the header is `''`. | **Hoisted mock of `@defra/hapi-tracing`** in the three service tests (ins precedent: `src/auth/verify-token.test.js`, `get-oidc-config.test.js`), so `.matchHeader('x-cdp-request-id', 'trace-123')` pins that the header comes from `getTraceId()`. Controller tests do **not** mock it — they boot the real tracing plugin. |
| D17 | `docs/analysis/reference-data-resilience.md` (workspace repo) names `src/server/common/clients/countries-client.real.js`. | **Leave it.** `CLAUDE.md` defines `docs/analysis/` as point-in-time snapshots that are re-run, not maintained. The one in-repo prose reference (`fit/seed-address.js`) is corrected (E9). |
| D18 | Playwright is the fourth rung, not an extra. | It is the only proof that the stub seeds still behave under plain `node .` with `STUB_MODE=true`, and that the per-call `isStubMode()` selection works outside vitest. |

---

## 1. Moves — every file that moves or is deleted

Paths relative to the ins repo root. "move" = `git mv` with content **unchanged**; "delete" = `git rm`; "rewrite" =
the old file is deleted and a new file at the new path is written from §3 (git will show delete + add).

| From | To | How |
|---|---|---|
| `src/server/common/clients/http-client.js` | `src/server/app/lib/http-client.js` | move (D12) |
| `src/server/common/clients/http-client.test.js` | `src/server/app/lib/http-client.test.js` | move (its `./http-client.js` import still resolves) |
| `src/server/common/clients/ins-backend-client.stub.test.js` | `src/server/app/services/ins-backend/stub.test.js` | move, then E17 (import line + dropped `'trace'` args) |
| `src/server/common/clients/address-book-client.js` | `src/server/app/services/address-book/index.js` | rewrite (N7) |
| `src/server/common/clients/address-book-client.real.js` | `src/server/app/services/address-book/client.js` | rewrite (N5) |
| `src/server/common/clients/address-book-client.stub.js` | `src/server/app/services/address-book/stub.js` | rewrite (N6) |
| `src/server/common/clients/address-book-client.test.js` | `src/server/app/services/address-book/address-book.test.js` | rewrite (N11) |
| `src/server/common/clients/countries-client.js` | `src/server/app/services/countries/index.js` | rewrite (N4) |
| `src/server/common/clients/countries-client.real.js` | `src/server/app/services/countries/client.js` | rewrite (N2) |
| `src/server/common/clients/countries-client.stub.js` | `src/server/app/services/countries/stub.js` | rewrite (N3) |
| `src/server/common/clients/countries-client.test.js` | `src/server/app/services/countries/countries.test.js` | rewrite (N12) |
| `src/server/common/clients/ins-backend-client.js` | `src/server/app/services/ins-backend/index.js` | rewrite (N10) |
| `src/server/common/clients/ins-backend-client.real.js` | `src/server/app/services/ins-backend/client.js` | rewrite (N8) |
| `src/server/common/clients/ins-backend-client.stub.js` | `src/server/app/services/ins-backend/stub.js` | rewrite (N9) |
| `src/server/common/clients/ins-backend-client.test.js` | `src/server/app/services/ins-backend/ins-backend.test.js` | rewrite (N13) |
| `src/server/common/clients/__mocks__/address-book-client.js` | — | delete (D2) |
| `src/server/common/clients/__mocks__/ins-backend-client.js` | — | delete (D2) |

After this table `src/server/common/clients/` must not exist (§6I). Nothing in `docker/`, `scripts/`, the tests repo,
`README.md`, `sonar-project.properties`, the workflows or `compose.yml` names any of these paths (verified by grep at
planning time; the only hit outside the repo is D17).

Who imported what (the complete list, from `grep -rn "clients/"` at HEAD — every one is rewritten in §2/§5):

- `addressBookClient` → `address-book/{list,add,edit,view,delete}/controller.js` + their tests
- `mapApiErrorsToFormErrors` → `address-book/{add,edit}/controller.js`
- `countriesClient` → `address-book/address-countries.js` (+ test), `routes/home/controller.js` (+ test),
  `address-book/{add,edit,view,list}/controller.test.js`, `plugins/csrf.test.js`
- `insBackendClient` → `routes/home/controller.js` (+ test)
- `ORGANISATION_ID_HEADER`, `throwOnError` re-exports → only `address-book-client.test.js` (D8)

---

## 2. Edits — every file whose content changes, and exactly what changes

Do these with the Edit tool. Nothing else in these files changes: no import reordering, no comment tidy-up, no
`function` → arrow restyle in files that are not rewritten (D12, D14).

### E1. `src/server/address-book/address-countries.js`

| Today | Becomes |
|---|---|
| `import { countriesClient } from '../common/clients/countries-client.js'` | `import { getCountries } from '../app/services/countries/index.js'` |
| `export async function getAddressFormCountries(traceId) {` | `export async function getAddressFormCountries() {` |
| `  const countries = await countriesClient.getCountries(traceId)` | `  const countries = await getCountries()` |

### E2. `src/server/address-book/list/controller.js`

| Today | Becomes |
|---|---|
| `import { addressBookClient } from '../../common/clients/address-book-client.js'` | `import { listAddresses } from '../../app/services/address-book/index.js'` |
| `      const countries = await getAddressFormCountries(traceId)` | `      const countries = await getAddressFormCountries()` |
| `      const response = await addressBookClient.listAddresses(orgId, traceId, {` | `      const response = await listAddresses(orgId, {` |

`traceId` stays (used by `logger.error`, D13).

### E3. `src/server/address-book/add/controller.js`

| Today | Becomes |
|---|---|
| `import {`<br>`  addressBookClient,`<br>`  mapApiErrorsToFormErrors`<br>`} from '../../common/clients/address-book-client.js'` | `import {`<br>`  createAddress,`<br>`  mapApiErrorsToFormErrors`<br>`} from '../../app/services/address-book/index.js'` |
| every `getAddressFormCountries(traceId)` (four: get handler, post happy path, post 400 branch, post 500 branch) | `getAddressFormCountries()` |
| `        const created = await addressBookClient.createAddress(`<br>`          orgId,`<br>`          traceId,`<br>`          value`<br>`        )` | `        const created = await createAddress(orgId, value)` |

### E4. `src/server/address-book/edit/controller.js`

| Today | Becomes |
|---|---|
| `import {`<br>`  addressBookClient,`<br>`  mapApiErrorsToFormErrors`<br>`} from '../../common/clients/address-book-client.js'` | `import {`<br>`  getAddress,`<br>`  mapApiErrorsToFormErrors,`<br>`  updateAddress`<br>`} from '../../app/services/address-book/index.js'` |
| `async function renderEditForm(`<br>`  h,`<br>`  { id, formValues, traceId, errorList, fieldErrors }`<br>`) {`<br>`  const countries = await getAddressFormCountries(traceId).catch(() => [])` | `async function renderEditForm(`<br>`  h,`<br>`  { id, formValues, errorList, fieldErrors }`<br>`) {`<br>`  const countries = await getAddressFormCountries().catch(() => [])` |
| `        const address = await addressBookClient.getAddress(orgId, traceId, id)` | `        const address = await getAddress(orgId, id)` |
| `        const countries = await getAddressFormCountries(traceId)` (get handler and post handler — two) | `        const countries = await getAddressFormCountries()` |
| `        const updated = await addressBookClient.updateAddress(`<br>`          orgId,`<br>`          traceId,`<br>`          id,`<br>`          value`<br>`        )` | `        const updated = await updateAddress(orgId, id, value)` |
| the three `renderEditForm(h, { id, formValues, traceId, ... })` calls | drop the `traceId,` line from each object literal |

Prettier will collapse `renderEditForm`'s parameter destructuring onto one line if it fits — let `npm run format`
decide. `traceId` is still declared and used by both handlers' `logger.error` calls (D13).

### E5. `src/server/address-book/view/controller.js`

| Today | Becomes |
|---|---|
| `import { addressBookClient } from '../../common/clients/address-book-client.js'` | `import { getAddress } from '../../app/services/address-book/index.js'` |
| `      const address = await addressBookClient.getAddress(orgId, traceId, id)` | `      const address = await getAddress(orgId, id)` |
| `      const countries = await getAddressFormCountries(traceId).catch(() => [])` | `      const countries = await getAddressFormCountries().catch(() => [])` |

### E6. `src/server/address-book/delete/controller.js`

| Today | Becomes |
|---|---|
| `import { addressBookClient } from '../../common/clients/address-book-client.js'` | `import {`<br>`  deleteAddress,`<br>`  getAddress`<br>`} from '../../app/services/address-book/index.js'` |
| `        const address = await addressBookClient.getAddress(orgId, traceId, id)` (get and post — two) | `        const address = await getAddress(orgId, id)` |
| `        await addressBookClient.deleteAddress(orgId, traceId, id)` | `        await deleteAddress(orgId, id)` |

### E7. `src/server/routes/home/controller.js`

| Today | Becomes |
|---|---|
| `import { countriesClient } from '../../common/clients/countries-client.js'`<br>`import { insBackendClient } from '../../common/clients/ins-backend-client.js'` | `import { getCountries } from '../../app/services/countries/index.js'`<br>`import { listNotifications } from '../../app/services/ins-backend/index.js'` |
| `      const countries = await countriesClient.getCountries(traceId)` | `      const countries = await getCountries()` |
| `      const response = await insBackendClient.listNotifications(traceId, {` | `      const response = await listNotifications({` |

### E8. `src/plugins/csrf.test.js` — three lines removed (D2)

Remove `import { countriesClient } from '../server/common/clients/countries-client.js'` (line 10),
`vi.mock('../server/common/clients/countries-client.js')` (line 15) and
`    vi.mocked(countriesClient.getCountries).mockResolvedValue(mockCountries)` (line 26). Then remove the now-unused
`mockCountries` constant (lines 17–20). The server boots in stub mode (vitest env) and the countries stub renders
the add form. `vi` is still used by the `get-oidc-config.js` mock; keep the import line as it is.

### E9. `src/server/address-book/fit/seed-address.js` — one comment word swap (s01 D7 precedent)

| Today | Becomes |
|---|---|
| ` * (address-book-client.stub.js), so a spec can address it directly rather` | ` * (app/services/address-book/stub.js), so a spec can address it directly rather` |

### E10. `src/server/address-book/address-countries.test.js` — nock instead of the module mock

Replace the file's imports and the first describe. The other three describes (`#buildCountrySelectItems`,
`#buildCountryItems`, `#resolveCountryCodeFromSearchTerm`) are untouched.

```js
import { describe, expect, test } from 'vitest'

import {
  buildCountryItems,
  buildCountrySelectItems,
  getAddressFormCountries,
  resolveCountryCodeFromSearchTerm,
  GB_COUNTRY
} from './address-countries.js'
import {
  referenceDataApi,
  runInRealMode
} from '../common/test-helpers/real-mode.js'

describe('#getAddressFormCountries', () => {
  runInRealMode()

  test('GB-prepends countries from reference data', async () => {
    referenceDataApi()
      .get('/countries')
      .reply(200, [
        { code: 'FR', name: 'France' },
        { code: 'GB', name: 'United Kingdom duplicate' }
      ])

    const countries = await getAddressFormCountries()

    expect(countries[0]).toEqual(GB_COUNTRY)
    expect(countries[1]).toEqual({ code: 'FR', name: 'France' })
    expect(countries.some((c) => c.code === 'GB')).toBe(true)
    expect(countries.filter((c) => c.code === 'GB')).toHaveLength(1)
  })

  test('throws when MDM list is empty', async () => {
    referenceDataApi().get('/countries').reply(200, [])

    await expect(getAddressFormCountries()).rejects.toThrow(
      'Country reference data is unavailable'
    )
  })
})
```

(`vi`, `beforeEach` and the `countriesClient` import go — lint fails on an unused import.)

### E11. `src/server/address-book/list/controller.test.js` — full replacement (Write)

```js
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '../../common/test-helpers/mock-auth.js'
import {
  addressBookApi,
  runInRealMode,
  serveCountries
} from '../../common/test-helpers/real-mode.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const ADDRESSES_PATH = `/organisation/${ORG_ID}/addresses`

const countries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

const highland = {
  id: '1',
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB'
}

const greenFarm = {
  id: '1',
  name: 'Green Farm',
  addressLine1: '1 Road',
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB'
}

const pageOf = (items, overrides = {}) => ({
  items,
  page: 1,
  pageSize: 25,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
  ...overrides
})

describe('#addressBookListController', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    serveCountries(countries)
  })

  test('renders address list with Name, Address and Country columns', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([highland]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('list-with-addresses')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Address book')
    expect(result).toContain('Showing 1-1 of 1')
    expect(result).toContain('Highland Livestock Ltd')
    expect(result).toContain(
      '<a class="govuk-link" href="/address-book/1">View<span class="govuk-visually-hidden"> Highland Livestock Ltd</span></a>'
    )
    expect(result).toContain('14 Drover&#39;s Way, Inverness, IV2 3JH')
    expect(result).toContain('United Kingdom')
    expect(result).not.toContain('>GB<')
    expect(result).toContain('Add a new address')
    expect(result).not.toContain('operator')
  })

  test('shows empty state when org has no addresses', async () => {
    addressBookApi().get(ADDRESSES_PATH).query({ page: '1' }).reply(200, pageOf([]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('list-empty')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('You have no addresses yet')
    expect(result).toContain('Add a new address')
    expect(result).not.toContain('No addresses match')
  })

  test('renders numbered pagination when more than one page', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '2' })
      .reply(
        200,
        pageOf(
          [{ id: '1', name: 'Farm', addressLine1: '1 Road', countryCode: 'GB' }],
          { page: 2, totalItems: 30, totalPages: 2 }
        )
      )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?page=2',
      auth: sessionAuth('list-page-2')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('govuk-pagination')
    expect(result).toContain('Showing 26-30 of 30')
    expect(result).toContain('?page=2')
  })

  test('does not show clear search on the unfiltered list', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([highland]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('list-no-clear-search')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).not.toContain('data-testid="address-book-clear-search"')
  })

  test('shows clear search when search results are returned', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1', q: 'green' })
      .reply(200, pageOf([greenFarm]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=green',
      auth: sessionAuth('list-search-with-results')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('data-testid="address-book-clear-search"')
    expect(result).toContain('Clear search</a>')
    expect(result).toContain('Green Farm')
    expect(result).toContain('Showing 1-1 of 1')
  })

  test('forwards search query and resolves country name to countryCode', async () => {
    const scope = addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1', q: 'France', countryCode: 'FR' })
      .reply(
        200,
        pageOf([
          {
            id: '1',
            name: 'Paris Depot',
            addressLine1: '1 Rue de Rivoli',
            townOrCity: 'Paris',
            postcode: '75001',
            countryCode: 'FR'
          }
        ])
      )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=France',
      auth: sessionAuth('list-search-country')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(result).toContain('Paris Depot')
    expect(result).toContain('France')
    expect(result).toContain('value="France"')
  })

  test('shows no-results state distinct from empty state when search has no matches', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1', q: 'zzznomatch' })
      .reply(200, pageOf([]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=zzznomatch',
      auth: sessionAuth('list-no-results')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('No addresses match "zzznomatch"')
    expect(result).toContain('Clear search')
    expect(result).not.toContain('You have no addresses yet')
    expect(result).toContain('value="zzznomatch"')
  })

  test('pagination preserves the active search term', async () => {
    const scope = addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '2', q: 'green', countryCode: 'GB' })
      .reply(
        200,
        pageOf([greenFarm], { page: 2, totalItems: 30, totalPages: 2 })
      )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=green&countryCode=GB&page=2',
      auth: sessionAuth('list-search-page-2')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(result).toContain('?q=green&amp;countryCode=GB')
  })

  test('returns 500 when the address book cannot be reached', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('list-500')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong loading your address book')
  })
})
```

Nine tests, same nine behaviours as today. (`beforeAll`/`afterAll` were already used as vitest globals in this file;
leave them so.)

### E12. `src/server/address-book/add/controller.test.js` — full replacement (Write)

```js
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '../../common/test-helpers/mock-auth.js'
import {
  addressBookApi,
  runInRealMode,
  serveCountries
} from '../../common/test-helpers/real-mode.js'
import { config } from '../../../config/config.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const ADDRESSES_PATH = `/organisation/${ORG_ID}/addresses`
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const mockCountries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

const validPayload = {
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com'
}

describe.sequential('#addressBookAddController', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    config.set('csrf.enabled', false)
    serveCountries(mockCountries)
  })

  test('GET renders the add address details form', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add',
      auth: sessionAuth('add-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Add address details')
    expect(result).toContain('Enter address details')
    expect(result).toContain('Enter contact details')
    expect(result).toContain('Name or organisation name')
    expect(result).toContain('Postcode or Zip code')
    expect(result).toContain('Phone number')
    expect(result).toContain(
      'For international numbers include the country code'
    )
    expect(result).toContain('Save and continue')
    expect(result).toContain('Cancel and return to address book')
    expect(result).not.toContain('operator')
    expect(result).not.toContain('Save changes')
  })

  test('GET renders country select options from reference data', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add',
      auth: sessionAuth('add-get-countries')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('value="GB"')
    expect(result).toContain('United Kingdom')
    expect(result).toContain('value="FR"')
    expect(result).toContain('France')
  })

  test('POST re-renders form when API returns 400 validation errors', async () => {
    const scope = addressBookApi()
      .post(ADDRESSES_PATH)
      .reply(400, {
        type: 'https://api.cdp.defra.cloud/problems/validation-error',
        errors: {
          email: ['Enter an email address in the correct format']
        }
      })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-api-400'),
      payload: validPayload
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('Enter an email address in the correct format')
    expect(scope.isDone()).toBe(true)
  })

  test('POST creates address and redirects with success banner', async () => {
    let posted
    const scope = addressBookApi()
      .post(ADDRESSES_PATH, (body) => {
        posted = body
        return true
      })
      .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
      .reply(201, {
        id: '665f1c2ab3e4d51a2c9d0e77',
        name: 'Highland Livestock Ltd'
      })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-success'),
      payload: validPayload
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
    expect(scope.isDone()).toBe(true)
    expect(posted).toMatchObject(validPayload)
  })

  test('POST with invalid data re-renders form with errors', async () => {
    // No address-book interceptor: a request would be refused by nock and
    // surface as a 500, not the 400 asserted here.
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-invalid'),
      payload: {
        name: '',
        addressLine1: '',
        townOrCity: '',
        postcode: '',
        countryCode: '',
        phone: '',
        email: 'bad'
      }
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('There is a problem')
  })

  test('Cancel returns to list without creating an address', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-cancel'),
      payload: { cancel: 'true' }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
  })
})
```

Six tests, as today. The "not called" assertions are carried by `nock.disableNetConnect()` (an attempted POST
rejects inside the controller and the response is a 500, which the status assertion catches); the comment in the
invalid-data test says so once for the file.

### E13. `src/server/address-book/edit/controller.test.js` — full replacement (Write)

```js
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '../../common/test-helpers/mock-auth.js'
import {
  addressBookApi,
  runInRealMode,
  serveCountries
} from '../../common/test-helpers/real-mode.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const addressId = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `/organisation/${ORG_ID}/addresses/${addressId}`

const mockCountries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

const mockAddress = {
  id: addressId,
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  addressLine2: 'Unit 2',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com',
  deleted: false
}

const validPayload = {
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  addressLine2: '',
  townOrCity: 'Inverness',
  county: '',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com'
}

describe('#addressBookEditController', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    serveCountries(mockCountries)
  })

  test('GET renders prefilled edit form', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Edit address details')
    expect(result).toContain('value="Highland Livestock Ltd"')
    expect(result).toContain('value="Unit 2"')
    expect(result).not.toContain('operator')
  })

  test('GET returns 404 when address is not found', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-get-404')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET returns 404 for soft-deleted tombstones', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-get-tombstone')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('POST returns 404 when the address book rejects the update with 404', async () => {
    addressBookApi().put(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-post-404'),
      payload: validPayload
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('POST updates address and redirects with success banner', async () => {
    let sent
    const scope = addressBookApi()
      .put(ADDRESS_PATH, (body) => {
        sent = body
        return true
      })
      .reply(200, { ...mockAddress, name: 'Updated Farm Ltd' })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-post-success'),
      payload: {
        ...validPayload,
        name: 'Updated Farm Ltd'
      }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
    expect(scope.isDone()).toBe(true)
    expect(sent).toMatchObject({
      name: 'Updated Farm Ltd',
      addressLine2: '',
      county: ''
    })
  })

  test('POST with invalid data re-renders form with errors', async () => {
    // No address-book interceptor: a request would be refused by nock and
    // surface as a 500, not the 400 asserted here.
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-post-invalid'),
      payload: {
        name: '',
        addressLine1: '',
        townOrCity: '',
        postcode: '',
        countryCode: '',
        phone: '',
        email: 'bad'
      }
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('There is a problem')
  })

  test('Cancel returns to list without updating', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-post-cancel'),
      payload: { cancel: 'true' }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
  })
})
```

Seven tests, as today.

### E14. `src/server/address-book/view/controller.test.js` — controller describe replaced

Keep the file's `#buildRows` describe and its `buildRows` import exactly as they are. Replace the imports of
`addressBookClient`/`countriesClient`, the two `vi.mock` blocks for the clients, and the `#addressBookViewController`
describe with:

```js
import {
  addressBookApi,
  runInRealMode,
  serveCountries
} from '../../common/test-helpers/real-mode.js'
```

(alongside the existing imports; the `get-oidc-config.js` mock stays) and

```js
const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const ADDRESS_PATH = `/organisation/${ORG_ID}/addresses/${addressId}`
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'
```

(after the existing `addressId` constant) and

```js
describe('#addressBookViewController', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    serveCountries([
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' }
    ])
  })

  test('GET renders read-only address details with Edit and Delete actions', async () => {
    const scope = addressBookApi()
      .get(ADDRESS_PATH)
      .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
      .reply(200, mockAddress)

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(result).toContain('Highland Livestock Ltd')
    expect(result).toContain('14 Drover&#39;s Way')
    expect(result).toContain('Inverness')
    expect(result).toContain('IV2 3JH')
    // Each field renders on its own row, not concatenated into a single address line.
    expect(result).not.toContain(
      '14 Drover&#39;s Way, Unit 2, Inverness, Highland, IV2 3JH'
    )
    expect(result).toContain('United Kingdom')
    expect(result).not.toContain('>GB<')
    expect(result).toContain('exports@example.com')
    expect(result).toContain(`/address-book/${addressId}/edit`)
    expect(result).toContain(`/address-book/${addressId}/delete`)
    expect(result).not.toContain('operator')
    expect(result).not.toContain('Type')
  })

  test('GET returns 404 when address is not found', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-not-found')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET returns 404 for malformed address id without reaching the address book', async () => {
    // No interceptor: the route's id validation must answer before the handler
    // runs, otherwise the refused request would surface as a 500.
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/not-a-valid-id',
      auth: sessionAuth('view-bad-id')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET returns 404 for soft-deleted tombstones', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-get-tombstone')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
```

Six tests in the file, as today (2 + 4).

### E15. `src/server/address-book/delete/controller.test.js` — full replacement (Write)

```js
import { describe, expect, test, vi } from 'vitest'

import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '../../common/test-helpers/mock-auth.js'
import {
  addressBookApi,
  runInRealMode
} from '../../common/test-helpers/real-mode.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const addressId = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `/organisation/${ORG_ID}/addresses/${addressId}`
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const mockAddress = {
  id: addressId,
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com',
  deleted: false
}

describe('#addressBookDeleteController', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET renders delete confirmation page', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Delete address')
    expect(result).toContain('Highland Livestock Ltd')
    expect(result).toContain('Yes, delete this address')
    expect(result).not.toContain('Delete operator')
  })

  test('GET returns 404 when address is not found', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-404')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET returns 404 for soft-deleted tombstones', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-tombstone')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('POST returns 404 when the address book rejects the delete with 404', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi().delete(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-404'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('POST returns 404 for soft-deleted tombstones without deleting', async () => {
    // No DELETE interceptor: a delete would be refused by nock and surface as a
    // 500, not the 404 asserted here.
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-tombstone'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('Cancel returns to address details without deleting', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-cancel'),
      payload: { cancel: 'true' }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe(`/address-book/${addressId}`)
  })

  test('Confirm soft-deletes address and redirects to list', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    const scope = addressBookApi()
      .delete(ADDRESS_PATH)
      .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
      .reply(204)

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-confirm'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
    expect(scope.isDone()).toBe(true)
  })
})
```

Seven tests, as today. (`beforeEach` is no longer needed — there is nothing to reset.)

### E16. `src/server/routes/home/controller.test.js` — full replacement (Write)

```js
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '../../common/test-helpers/mock-auth.js'
import {
  insBackendApi,
  runInRealMode,
  serveCountries
} from '../../common/test-helpers/real-mode.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const NOTIFICATIONS_PATH = '/notifications'
const DEFAULT_QUERY = { page: '1', sort: 'arrivalDate,desc' }

const pageOf = (content, overrides = {}) => ({
  content,
  page: 1,
  size: 25,
  numberOfElements: content.length,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  ...overrides
})

describe('#homeController', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    serveCountries([
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' }
    ])
  })

  test('renders notifications with reference, status, origin, commodity and arrival date', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf([
          {
            referenceNumber: 'GBN-AG-26-000001',
            status: 'SUBMITTED',
            originCountry: 'FR',
            commodity: null,
            arrivalDate: '2026-09-10T00:00:00Z'
          }
        ])
      )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-with-notifications')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Dashboard')
    expect(result).toContain('GBN-AG-26-000001')
    expect(result).toContain('SUBMITTED')
    expect(result).toContain('France')
    expect(result).not.toContain('>FR<')
    expect(result).toContain('10 Sep 2026')
    expect(result).toContain('Showing 1-1 of 1')
  })

  test('notifications from more than one status all appear in the same list (AC2)', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf(
          [
            {
              referenceNumber: 'GBN-AG-26-000001',
              status: 'SUBMITTED',
              originCountry: 'GB',
              arrivalDate: '2026-09-10T00:00:00Z'
            },
            {
              referenceNumber: 'GBN-AG-26-000002',
              status: 'DRAFT',
              originCountry: 'GB',
              arrivalDate: '2026-09-11T00:00:00Z'
            }
          ],
          { totalElements: 2, totalPages: 1 }
        )
      )

    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-two-statuses')
    })

    expect(result).toContain('GBN-AG-26-000001')
    expect(result).toContain('GBN-AG-26-000002')
  })

  test('selecting a submitted notification links into the notification-view page (AC3)', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf([
          {
            referenceNumber: 'GBN-AG-26-000001',
            status: 'SUBMITTED',
            originCountry: 'GB',
            arrivalDate: '2026-09-10T00:00:00Z'
          }
        ])
      )

    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-submitted-link')
    })

    expect(result).toContain(
      'href="http://localhost:3000/notifications/GBN-AG-26-000001/notification-view"'
    )
  })

  test('selecting a draft notification links back into the journey hub, not notification-view (AC3)', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf([
          {
            referenceNumber: 'GBN-AG-26-000002',
            status: 'DRAFT',
            originCountry: 'GB',
            arrivalDate: '2026-09-10T00:00:00Z'
          }
        ])
      )

    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-draft-link')
    })

    expect(result).toContain(
      'href="http://localhost:3000/notifications/GBN-AG-26-000002"'
    )
    expect(result).not.toContain('notification-view')
  })

  test('searching by complete reference returns only the matching notification (AC4)', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({ ...DEFAULT_QUERY, referenceNumber: 'GBN-AG-26-000001' })
      .reply(
        200,
        pageOf([
          {
            referenceNumber: 'GBN-AG-26-000001',
            status: 'SUBMITTED',
            originCountry: 'GB',
            arrivalDate: '2026-09-10T00:00:00Z'
          }
        ])
      )

    const { result } = await server.inject({
      method: 'GET',
      url: '/?referenceNumber=GBN-AG-26-000001',
      auth: sessionAuth('dashboard-search-match')
    })

    expect(scope.isDone()).toBe(true)
    expect(result).toContain('GBN-AG-26-000001')
  })

  test('no matching notification shows "No notifications found" (AC5)', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({ ...DEFAULT_QUERY, referenceNumber: 'GBN-AG-26-999999' })
      .reply(200, pageOf([]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/?referenceNumber=GBN-AG-26-999999',
      auth: sessionAuth('dashboard-search-no-match')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('No notifications found')
  })

  test('empty aggregated store shows an empty state with a way to start a new notification (AC6)', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(200, pageOf([]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-empty-store')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('There are no notifications yet.')
    expect(result).toContain('Start a new notification')
    expect(result).toContain('href="http://localhost:3000"')
    expect(result).not.toContain('No notifications found')
  })

  test('sort and referenceNumber are forwarded to the backend', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({
        page: '1',
        sort: 'lastUpdated,asc',
        referenceNumber: 'GBN-AG-26-000001'
      })
      .reply(200, pageOf([]))

    await server.inject({
      method: 'GET',
      url: '/?sort=lastUpdated,asc&referenceNumber=GBN-AG-26-000001',
      auth: sessionAuth('dashboard-sort-forward')
    })

    expect(scope.isDone()).toBe(true)
  })

  test('an unrecognised sort value falls back to the default rather than reaching the backend', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(200, pageOf([]))

    await server.inject({
      method: 'GET',
      url: '/?sort=not-a-real-option',
      auth: sessionAuth('dashboard-sort-invalid')
    })

    expect(scope.isDone()).toBe(true)
  })

  test('shows an error page when the backend call fails', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(500, { title: 'Internal Server Error' })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-error')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong loading the dashboard')
  })
})
```

Ten tests, as today. `.query(obj)` in nock is an exact match on the whole query string, so the two "forwarded"
tests now pin the real URL the backend receives.

### E17. `src/server/app/services/ins-backend/stub.test.js` (after the move)

| Today | Becomes |
|---|---|
| `import { insBackendClient } from './ins-backend-client.stub.js'` | `import { listNotifications } from './stub.js'` |
| `describe('#insBackendClient (stub)', () => {` | `describe('#listNotifications (stub)', () => {` |
| every `insBackendClient.listNotifications('trace', {` (five) | `listNotifications({` |

Nothing else in the file changes; eight tests, same assertions.

---

## 3. New files

Every file below is written with the Write tool at the path given, then formatted by `npm run format` (§6A) — do not
hand-wrap to match prettier. Where a block says **verbatim**, copy it with the Read tool from the reference file.

### N1. `src/server/app/lib/http-status.js` — plants **verbatim** (D10)

```js
export const HTTP_STATUS_BAD_REQUEST = 400
export const HTTP_STATUS_NOT_FOUND = 404
export const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500
```

`diff ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/lib/http-status.js ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/lib/http-status.js` must print nothing.

### N2. `src/server/app/services/countries/client.js` — imitates animals' `countries/client.js`

Animals' file with convict for the base URL (D4) and ins's trace header via `getTraceId()`; no logger (D6).

```js
import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'

const referenceDataUrl = config.get('tradeImportsReferenceDataApi.baseUrl')
const tracingHeader = config.get('tracing.header')

export const fetchCountries = async (blocks) => {
  const url = new URL(`${referenceDataUrl}/countries`)

  if (blocks?.length) {
    for (const block of blocks) {
      url.searchParams.append('blocks', block)
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      [tracingHeader]: getTraceId() ?? ''
    }
  })

  if (!response.ok) {
    throw Object.assign(new Error('Failed to get countries'), {
      status: response.status,
      statusText: response.statusText
    })
  }

  return response.json()
}
```

### N3. `src/server/app/services/countries/stub.js` — imitates animals' `countries/stub.js` (data, not functions)

```js
export const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IE', name: 'Ireland' }
]
```

(The same four rows as today's `STUB_COUNTRIES`; the fit suite's country select depends on them.)

### N4. `src/server/app/services/countries/index.js` — imitates animals' `countries/index.js` (D1)

```js
import { COUNTRIES } from './stub.js'
import { fetchCountries } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

export const getCountries = async (blocks) =>
  isStubMode() ? COUNTRIES : fetchCountries(blocks)
```

### N5. `src/server/app/services/address-book/client.js` — imitates animals' `address-book/client.js`

The two doc comments are animals' lines 19–24 and 35–38 **verbatim**; everything else is ins's CRUD with the
trace header from `getTraceId()`, the missing-organisation refusal, and the 400 handling factored once
(`createAddress` and `updateAddress` used to carry the same nine lines each).

```js
import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import { parseProblemBody, throwOnError } from '../../lib/http-client.js'

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const addressBookUrl = config.get('tradeImportsAddressBookApi.baseUrl')
const tracingHeader = config.get('tracing.header')

/** The organisation is part of the path, so a missing one does not fail — it
 * asks for an organisation literally named "undefined", which the address book
 * answers truthfully with an empty book. That reads as "this organisation has
 * saved no addresses", or on a resolve as "this address was deleted", when what
 * actually happened is that nobody was signed in. Refuse instead: a read with
 * no organisation is a bug in the caller, and it should say so. */
const addressesUrl = (orgId, addressId) => {
  if (!orgId) {
    throw new Error(
      'Cannot reach the address book without an organisation: the signed-in session carries none'
    )
  }
  const base = `${addressBookUrl}/organisation/${encodeURIComponent(orgId)}/addresses`
  return addressId ? `${base}/${encodeURIComponent(addressId)}` : base
}

/** The organisation is the authorisation — the address book runs no in-service
 * authentication and trusts this header (see its IdentityHeaderFilter). It must
 * always come from the authenticated session, never a payload or a stored
 * field, and it must match the orgId in the path (cv-010). */
const headers = (orgId) => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: orgId,
  [tracingHeader]: getTraceId() ?? ''
})

const validationFailure = async (response) => {
  const problem = await parseProblemBody(response)
  return Object.assign(new Error(problem.detail || 'Validation failed'), {
    status: HTTP_STATUS_BAD_REQUEST,
    statusText: response.statusText,
    body: problem
  })
}

const throwOnValidationFailure = async (response) => {
  if (response.status === HTTP_STATUS_BAD_REQUEST) {
    throw await validationFailure(response)
  }
  return throwOnError(response)
}

export const listAddresses = async (
  orgId,
  { page = 1, q, countryCode } = {}
) => {
  const url = new URL(addressesUrl(orgId))
  url.searchParams.set('page', String(page))
  if (q) {
    url.searchParams.set('q', q)
  }
  if (countryCode) {
    url.searchParams.set('countryCode', countryCode)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(orgId)
  })

  await throwOnError(response)
  return response.json()
}

export const createAddress = async (orgId, body) => {
  const response = await fetch(addressesUrl(orgId), {
    method: 'POST',
    headers: headers(orgId),
    body: JSON.stringify(body)
  })

  await throwOnValidationFailure(response)
  return response.json()
}

export const getAddress = async (orgId, id) => {
  const response = await fetch(addressesUrl(orgId, id), {
    method: 'GET',
    headers: headers(orgId)
  })

  await throwOnError(response)
  return response.json()
}

export const updateAddress = async (orgId, id, body) => {
  const response = await fetch(addressesUrl(orgId, id), {
    method: 'PUT',
    headers: headers(orgId),
    body: JSON.stringify(body)
  })

  await throwOnValidationFailure(response)
  return response.json()
}

export const deleteAddress = async (orgId, id) => {
  const response = await fetch(addressesUrl(orgId, id), {
    method: 'DELETE',
    headers: headers(orgId)
  })

  await throwOnError(response)
}
```

Note `problem.detail || 'Validation failed'` keeps `||` deliberately — an empty `detail` is not a message, the same
rule `http-client.js`'s `errorMessageFromBody` applies. `getAddress` keeps ins's semantics (a 404 **throws** with
`status: 404`; the controllers map that to `Boom.notFound`), not animals' `undefined`.

### N6. `src/server/app/services/address-book/stub.js` — ins's stub as named exports (D11)

```js
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'

/**
 * In-memory stand-in for the real Address Book API, selected by STUB_MODE=true
 * (see mode.js). No network call, no Mongo - deterministic per organisationId
 * so specs stay isolated from each other without any cross-process seeding.
 *
 * Org id convention (a spec picks which by signing in with ?organisationId=...):
 *   *-empty      -> starts with zero addresses
 *   *-paginated  -> starts with 30 addresses (two pages at the real page size)
 *   anything else -> starts with a single seed address
 */
const PAGE_SIZE = 25
const PAGINATED_SEED_COUNT = 30

// Every /address-book/{id} route validates its param as a Mongo ObjectId and
// 404s on a mismatch (address-id-params.js), so stub ids have to be 24 hex
// characters or the view, edit and delete pages are unreachable in stub mode.
const OBJECT_ID_LENGTH = 24

const store = new Map()

const newObjectId = () =>
  crypto.randomUUID().replaceAll('-', '').slice(0, OBJECT_ID_LENGTH)

const buildSeedAddress = (index) => ({
  id: String(index).padStart(OBJECT_ID_LENGTH, '0'),
  name: `Stub Farm ${index}`,
  addressLine1: `${index} Stub Way`,
  addressLine2: '',
  townOrCity: 'Stubton',
  county: '',
  postcode: 'ST1 1UB',
  countryCode: 'GB',
  email: `stub-farm-${index}@example.com`,
  phone: '01234567890',
  deleted: false
})

const seedAddressesFor = (orgId) => {
  if (orgId.endsWith('-empty')) {
    return []
  }
  if (orgId.endsWith('-paginated')) {
    return Array.from({ length: PAGINATED_SEED_COUNT }, (_, index) =>
      buildSeedAddress(index + 1)
    )
  }
  return [buildSeedAddress(1)]
}

const addressesOf = (orgId) => {
  if (!store.has(orgId)) {
    store.set(orgId, seedAddressesFor(orgId))
  }
  return store.get(orgId)
}

const notFound = () =>
  Object.assign(new Error('Not found'), { status: HTTP_STATUS_NOT_FOUND })

export const listAddresses = async (orgId, { page = 1 } = {}) => {
  const all = addressesOf(orgId)
  const totalItems = all.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const from = (page - 1) * PAGE_SIZE

  return {
    items: all.slice(from, from + PAGE_SIZE),
    page,
    pageSize: PAGE_SIZE,
    totalItems,
    totalPages
  }
}

export const createAddress = async (orgId, body) => {
  const created = { id: newObjectId(), ...body }
  addressesOf(orgId).push(created)
  return created
}

export const getAddress = async (orgId, id) => {
  const found = addressesOf(orgId).find((address) => address.id === id)
  if (!found) {
    throw notFound()
  }
  return found
}

export const updateAddress = async (orgId, id, body) => {
  const all = addressesOf(orgId)
  const index = all.findIndex((address) => address.id === id)
  if (index === -1) {
    throw notFound()
  }
  all[index] = { ...all[index], ...body }
  return all[index]
}

export const deleteAddress = async (orgId, id) => {
  const all = addressesOf(orgId)
  const index = all.findIndex((address) => address.id === id)
  if (index !== -1) {
    all.splice(index, 1)
  }
}
```

Same seeds, same ids, same page size, same 404 for an unknown id as today — only the shape changes.

### N7. `src/server/app/services/address-book/index.js` — imitates animals' `address-book/index.js` (D1, D7)

```js
import { isStubMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

const addressBook = () => (isStubMode() ? stub : client)

export const listAddresses = (orgId, search) =>
  addressBook().listAddresses(orgId, search)

export const createAddress = (orgId, body) =>
  addressBook().createAddress(orgId, body)

export const getAddress = (orgId, id) => addressBook().getAddress(orgId, id)

export const updateAddress = (orgId, id, body) =>
  addressBook().updateAddress(orgId, id, body)

export const deleteAddress = (orgId, id) =>
  addressBook().deleteAddress(orgId, id)

export const mapApiErrorsToFormErrors = (problemBody) => {
  const errors = problemBody?.errors ?? {}
  const errorList = Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((text) => ({ text, href: `#${field}` }))
  )
  const fieldErrors = Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      { text: messages[0] }
    ])
  )
  return { errorList, fieldErrors }
}
```

### N8. `src/server/app/services/ins-backend/client.js`

```js
import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'
import { throwOnError } from '../../lib/http-client.js'

const insBackendUrl = config.get('tradeImportsInsBackendApi.baseUrl')
const tracingHeader = config.get('tracing.header')

const headers = () => ({
  'Content-Type': 'application/json',
  [tracingHeader]: getTraceId() ?? ''
})

// Deliberately unscoped — no organisation header. The dashboard lists every
// notification in the aggregated store until a later ticket persists
// organisationId on a notification and can filter here.
export const listNotifications = async ({
  page = 1,
  sort,
  referenceNumber
} = {}) => {
  const url = new URL(`${insBackendUrl}/notifications`)
  url.searchParams.set('page', String(page))
  if (sort) {
    url.searchParams.set('sort', sort)
  }
  if (referenceNumber) {
    url.searchParams.set('referenceNumber', referenceNumber)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers()
  })

  await throwOnError(response)
  return response.json()
}
```

### N9. `src/server/app/services/ins-backend/stub.js`

Today's `ins-backend-client.stub.js` with: the header comment's "unlike address-book-client.stub.js" →
"unlike the address-book stub"; `function sortComparator(sort) {` → `const sortComparator = (sort) => {`; the
`insBackendClient` object replaced by one named export. `PAGE_SIZE`, `DELETED_STATUS` and the four `NOTIFICATIONS`
rows are copied unchanged.

```js
/**
 * In-memory stand-in for the real INS Backend API, selected by STUB_MODE=true
 * (see mode.js). The dashboard is deliberately unscoped to an organisation,
 * so — unlike the address-book stub — there is a single fixed dataset
 * rather than one keyed per organisation.
 */
const PAGE_SIZE = 25
const DELETED_STATUS = 'DELETED'

const NOTIFICATIONS = [
  ... the four rows, verbatim from today's file ...
]

const sortComparator = (sort) => {
  const [field, direction] = (sort ?? 'arrivalDate,desc').split(',')
  const sortField = field === 'lastUpdated' ? 'lastUpdated' : 'arrivalDate'
  const multiplier = direction === 'asc' ? 1 : -1
  return (a, b) =>
    multiplier * (new Date(a[sortField]) - new Date(b[sortField]))
}

export const listNotifications = async ({
  page = 1,
  sort,
  referenceNumber
} = {}) => {
  const visible = NOTIFICATIONS.filter((n) => n.status !== DELETED_STATUS)

  const matches = referenceNumber
    ? visible.filter((n) => n.referenceNumber === referenceNumber)
    : visible.slice().sort(sortComparator(sort))

  const totalElements = matches.length
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))
  const from = (page - 1) * PAGE_SIZE
  const content = matches.slice(from, from + PAGE_SIZE)

  return {
    content,
    page,
    size: PAGE_SIZE,
    numberOfElements: content.length,
    totalElements,
    totalPages
  }
}
```

### N10. `src/server/app/services/ins-backend/index.js`

```js
import { isStubMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

export const listNotifications = (search) =>
  isStubMode()
    ? stub.listNotifications(search)
    : client.listNotifications(search)
```

### N11. `src/server/app/services/address-book/address-book.test.js` — imitates animals' `address-book.test.js` with nock

```js
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  addressBookApi,
  refuseOutboundHttp,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import * as addressBook from './index.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const ADDRESSES_PATH = `/organisation/${ORG_ID}/addresses`
const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `${ADDRESSES_PATH}/${ADDRESS_ID}`
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'
const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-123'

const highland = {
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com'
}

const validationProblem = {
  type: 'https://api.cdp.defra.cloud/problems/validation-error',
  errors: {
    email: ['Enter an email address in the correct format']
  }
}

const pageOf = (items) => ({
  items,
  page: 1,
  pageSize: 25,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0
})

describe('against the real address book', () => {
  runInRealMode()

  beforeEach(() => {
    getTraceIdMock.mockReturnValue(TRACE_ID)
  })

  describe('#listAddresses', () => {
    test('Should GET the organisation path with the organisation and trace headers and parse the page', async () => {
      const scope = addressBookApi()
        .get(ADDRESSES_PATH)
        .query({ page: '1' })
        .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
        .matchHeader(TRACING_HEADER, TRACE_ID)
        .reply(
          200,
          pageOf([{ id: 'abc', name: 'Farm', addressLine1: '1 Road' }])
        )

      const result = await addressBook.listAddresses(ORG_ID, { page: 1 })

      expect(result.pageSize).toBe(25)
      expect(result.totalItems).toBe(1)
      expect(result.items[0].addressLine1).toBe('1 Road')
      expect(scope.isDone()).toBe(true)
    })

    test('Should forward q and countryCode as query parameters', async () => {
      const scope = addressBookApi()
        .get(ADDRESSES_PATH)
        .query({ page: '1', q: 'France', countryCode: 'FR' })
        .reply(200, pageOf([]))

      await addressBook.listAddresses(ORG_ID, {
        page: 1,
        q: 'France',
        countryCode: 'FR'
      })

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('#createAddress', () => {
    test('Should POST the address with the organisation header and return the created record', async () => {
      const scope = addressBookApi()
        .post(ADDRESSES_PATH, highland)
        .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
        .reply(201, { id: ADDRESS_ID, ...highland })

      const result = await addressBook.createAddress(ORG_ID, highland)

      expect(result.id).toBe(ADDRESS_ID)
      expect(scope.isDone()).toBe(true)
    })

    test('Should raise the validation problem with its status and field errors on a 400', async () => {
      addressBookApi().post(ADDRESSES_PATH).reply(400, validationProblem)

      await expect(
        addressBook.createAddress(ORG_ID, { ...highland, email: 'bad' })
      ).rejects.toMatchObject({
        status: 400,
        body: { errors: validationProblem.errors }
      })
    })
  })

  describe('#getAddress', () => {
    test('Should GET by id with the organisation and trace headers', async () => {
      const scope = addressBookApi()
        .get(ADDRESS_PATH)
        .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
        .matchHeader(TRACING_HEADER, TRACE_ID)
        .reply(200, { id: ADDRESS_ID, ...highland, deleted: false })

      const result = await addressBook.getAddress(ORG_ID, ADDRESS_ID)

      expect(result.name).toBe('Highland Livestock Ltd')
      expect(result.deleted).toBe(false)
      expect(scope.isDone()).toBe(true)
    })

    test('Should encode the organisation and address ids in the path', async () => {
      const orgWithSpecialChars = 'org/id'
      const scope = addressBookApi()
        .get(
          `/organisation/${encodeURIComponent(orgWithSpecialChars)}/addresses/${encodeURIComponent(ADDRESS_ID)}`
        )
        .matchHeader(ORGANISATION_ID_HEADER, orgWithSpecialChars)
        .reply(200, { id: ADDRESS_ID, name: 'Farm', deleted: false })

      await addressBook.getAddress(orgWithSpecialChars, ADDRESS_ID)

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('#updateAddress', () => {
    test('Should PUT the address with the organisation header and return the updated record', async () => {
      const scope = addressBookApi()
        .put(ADDRESS_PATH, highland)
        .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
        .reply(200, { id: ADDRESS_ID, ...highland })

      const result = await addressBook.updateAddress(
        ORG_ID,
        ADDRESS_ID,
        highland
      )

      expect(result.id).toBe(ADDRESS_ID)
      expect(scope.isDone()).toBe(true)
    })

    test('Should raise the validation problem with its status and field errors on a 400', async () => {
      addressBookApi().put(ADDRESS_PATH).reply(400, validationProblem)

      await expect(
        addressBook.updateAddress(ORG_ID, ADDRESS_ID, {
          ...highland,
          email: 'bad'
        })
      ).rejects.toMatchObject({
        status: 400,
        body: { errors: validationProblem.errors }
      })
    })
  })

  describe('#deleteAddress', () => {
    test('Should DELETE by id with the organisation header', async () => {
      const scope = addressBookApi()
        .delete(ADDRESS_PATH)
        .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
        .reply(204)

      await addressBook.deleteAddress(ORG_ID, ADDRESS_ID)

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('on a failure', () => {
    test('Should surface the API message and status when the body has no detail', async () => {
      addressBookApi()
        .get(ADDRESSES_PATH)
        .query({ page: '1' })
        .reply(404, {
          message: 'No static resource organisation/5900001/addresses.'
        })

      await expect(addressBook.listAddresses(ORG_ID)).rejects.toMatchObject({
        message: 'No static resource organisation/5900001/addresses.',
        status: 404
      })
    })
  })

  describe('without an organisation', () => {
    test('Should refuse to reach the address book rather than ask for an organisation named "undefined"', async () => {
      // No interceptor is defined and net connect is refused, so a request
      // would reject with nock's own error, not the message matched here.
      const refusal = /without an organisation/

      await expect(addressBook.listAddresses(undefined)).rejects.toThrow(
        refusal
      )
      await expect(
        addressBook.createAddress(undefined, highland)
      ).rejects.toThrow(refusal)
      await expect(
        addressBook.getAddress(undefined, ADDRESS_ID)
      ).rejects.toThrow(refusal)
      await expect(
        addressBook.updateAddress(undefined, ADDRESS_ID, highland)
      ).rejects.toThrow(refusal)
      await expect(
        addressBook.deleteAddress(undefined, ADDRESS_ID)
      ).rejects.toThrow(refusal)
    })
  })
})

describe('#mapApiErrorsToFormErrors', () => {
  test('Should map the problem errors to an error summary and per-field messages', () => {
    const result = addressBook.mapApiErrorsToFormErrors({
      errors: {
        addressLine1: ['Enter address line 1'],
        email: ['Enter an email address in the correct format']
      }
    })

    expect(result.errorList).toEqual([
      { text: 'Enter address line 1', href: '#addressLine1' },
      {
        text: 'Enter an email address in the correct format',
        href: '#email'
      }
    ])
    expect(result.fieldErrors.email.text).toBe(
      'Enter an email address in the correct format'
    )
  })
})

describe('the public surface', () => {
  test('Should expose the five address operations and the error mapper, nothing else', () => {
    expect(Object.keys(addressBook).sort()).toEqual([
      'createAddress',
      'deleteAddress',
      'getAddress',
      'listAddresses',
      'mapApiErrorsToFormErrors',
      'updateAddress'
    ])
  })
})

describe('in stub mode', () => {
  refuseOutboundHttp()

  test('Should seed one address for an ordinary organisation, at the id the fit specs address', async () => {
    const { items, totalItems } = await addressBook.listAddresses('stub-org-1')

    expect(totalItems).toBe(1)
    expect(items[0]).toMatchObject({
      id: '000000000000000000000001',
      name: 'Stub Farm 1',
      countryCode: 'GB'
    })
  })

  test('Should seed nothing for an organisation ending in -empty', async () => {
    const { items, totalItems } =
      await addressBook.listAddresses('stub-org-empty')

    expect(totalItems).toBe(0)
    expect(items).toEqual([])
  })

  test('Should seed thirty addresses over two pages for an organisation ending in -paginated', async () => {
    const first = await addressBook.listAddresses('stub-org-paginated', {
      page: 1
    })
    const second = await addressBook.listAddresses('stub-org-paginated', {
      page: 2
    })

    expect(first).toMatchObject({ totalItems: 30, totalPages: 2, page: 1 })
    expect(first.items).toHaveLength(25)
    expect(second.items).toHaveLength(5)
  })

  test('Should round-trip an address through create, update and delete', async () => {
    const org = 'stub-org-round-trip'

    const created = await addressBook.createAddress(org, highland)
    expect(created.id).toMatch(/^[0-9a-f]{24}$/)
    expect(await addressBook.getAddress(org, created.id)).toMatchObject(
      highland
    )

    const updated = await addressBook.updateAddress(org, created.id, {
      name: 'Updated Farm Ltd'
    })
    expect(updated).toMatchObject({
      id: created.id,
      name: 'Updated Farm Ltd',
      postcode: 'IV2 3JH'
    })

    await addressBook.deleteAddress(org, created.id)
    await expect(
      addressBook.getAddress(org, created.id)
    ).rejects.toMatchObject({ status: 404 })
  })
})
```

Seventeen tests. The stub-mode describe relies on the suite default (`vitest.config.js` sets `STUB_MODE=true`;
`runInRealMode` restores it in its `afterAll`).

### N12. `src/server/app/services/countries/countries.test.js`

```js
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  referenceDataApi,
  refuseOutboundHttp,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import { getCountries } from './index.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-123'

describe('against the real reference data', () => {
  runInRealMode()

  beforeEach(() => {
    getTraceIdMock.mockReturnValue(TRACE_ID)
  })

  test('Should GET /countries with the trace header and parse the list', async () => {
    const scope = referenceDataApi()
      .get('/countries')
      .matchHeader(TRACING_HEADER, TRACE_ID)
      .reply(200, [{ code: 'GB', name: 'United Kingdom' }])

    await expect(getCountries()).resolves.toEqual([
      { code: 'GB', name: 'United Kingdom' }
    ])
    expect(scope.isDone()).toBe(true)
  })

  test('Should request the given blocks', async () => {
    const scope = referenceDataApi()
      .get('/countries')
      .query({ blocks: 'country' })
      .reply(200, [])

    await getCountries(['country'])

    expect(scope.isDone()).toBe(true)
  })

  test('Should throw with the status when reference data fails', async () => {
    referenceDataApi().get('/countries').reply(503)

    await expect(getCountries()).rejects.toMatchObject({
      message: 'Failed to get countries',
      status: 503
    })
  })
})

describe('in stub mode', () => {
  refuseOutboundHttp()

  test('Should serve the canned countries without a request', async () => {
    await expect(getCountries()).resolves.toEqual([
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' },
      { code: 'DE', name: 'Germany' },
      { code: 'IE', name: 'Ireland' }
    ])
  })
})
```

Four tests.

### N13. `src/server/app/services/ins-backend/ins-backend.test.js`

```js
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  insBackendApi,
  refuseOutboundHttp,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import { listNotifications } from './index.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-123'

const emptyPage = (page) => ({
  content: [],
  page,
  size: 25,
  numberOfElements: 0,
  totalElements: 0,
  totalPages: 0
})

describe('against the real INS backend', () => {
  runInRealMode()

  beforeEach(() => {
    getTraceIdMock.mockReturnValue(TRACE_ID)
  })

  test('Should GET /notifications with the page and the trace header', async () => {
    const scope = insBackendApi()
      .get('/notifications')
      .query({ page: '1' })
      .matchHeader(TRACING_HEADER, TRACE_ID)
      .reply(200, {
        content: [{ referenceNumber: 'GBN-AG-26-000001' }],
        page: 1,
        size: 25,
        numberOfElements: 1,
        totalElements: 1,
        totalPages: 1
      })

    const result = await listNotifications({ page: 1 })

    expect(result.totalElements).toBe(1)
    expect(result.content[0].referenceNumber).toBe('GBN-AG-26-000001')
    expect(scope.isDone()).toBe(true)
  })

  test('Should forward sort and referenceNumber as query parameters', async () => {
    const scope = insBackendApi()
      .get('/notifications')
      .query({
        page: '2',
        sort: 'arrivalDate,asc',
        referenceNumber: 'GBN-AG-26-000002'
      })
      .reply(200, emptyPage(2))

    await listNotifications({
      page: 2,
      sort: 'arrivalDate,asc',
      referenceNumber: 'GBN-AG-26-000002'
    })

    expect(scope.isDone()).toBe(true)
  })

  test('Should not send an organisation header — the dashboard is deliberately unscoped', async () => {
    const scope = insBackendApi()
      .get('/notifications')
      .query({ page: '1' })
      .reply(function replyFn() {
        expect(
          this.req.headers['trade-imports-organisation-id']
        ).toBeUndefined()
        return [200, emptyPage(1)]
      })

    await listNotifications({ page: 1 })

    expect(scope.isDone()).toBe(true)
  })

  test('Should throw with the status and message on a non-2xx response', async () => {
    insBackendApi()
      .get('/notifications')
      .query({ page: '1' })
      .reply(500, { title: 'Internal Server Error' })

    await expect(listNotifications({ page: 1 })).rejects.toMatchObject({
      status: 500,
      message: 'Internal Server Error'
    })
  })
})

describe('in stub mode', () => {
  refuseOutboundHttp()

  test('Should serve the canned notifications without a request', async () => {
    const { content, totalElements } = await listNotifications({ page: 1 })

    expect(totalElements).toBe(3)
    expect(content.map((n) => n.referenceNumber)).toEqual([
      'GBN-AG-26-000002',
      'GBN-AG-26-000001',
      'GBN-AG-26-000003'
    ])
  })
})
```

Five tests. (The stub's own sorting/visibility/pagination pins live in `stub.test.js`, E17.)

### N14. `src/server/app/lib/http-client.test.js` — the moved file, byte-identical (D12). No new content.

### N15. `src/server/common/test-helpers/real-mode.js` (D3)

```js
import nock from 'nock'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { config } from '../../../config/config.js'

/** Refuses every outbound HTTP request that no nock interceptor answers, so a
 * test can never reach a service that happens to be running locally. */
export const refuseOutboundHttp = () => {
  beforeAll(() => {
    nock.disableNetConnect()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  afterAll(() => {
    nock.enableNetConnect()
  })
}

/** Runs the enclosing describe against the real HTTP clients — the suite
 * default is stub mode (vitest.config.js) — with every request intercepted. */
export const runInRealMode = () => {
  const originalStubMode = config.get('stubMode')

  refuseOutboundHttp()

  beforeAll(() => {
    config.set('stubMode', false)
  })

  afterAll(() => {
    config.set('stubMode', originalStubMode)
  })
}

export const addressBookApi = () =>
  nock(config.get('tradeImportsAddressBookApi.baseUrl'))

export const referenceDataApi = () =>
  nock(config.get('tradeImportsReferenceDataApi.baseUrl'))

export const insBackendApi = () =>
  nock(config.get('tradeImportsInsBackendApi.baseUrl'))

/** Every request for the country list, for as long as the test runs. */
export const serveCountries = (countries) =>
  referenceDataApi().persist().get('/countries').reply(200, countries)
```

Not a test file (no `.test.js`), so it is inside `sonar.sources`; it has no logic worth a test of its own — the
seven files that call it are its test.

---

## 4. Imports — the rule

1. **Relative, shortest path** (s02 D1): from `src/server/address-book/<page>/controller.js` the services are
   `'../../app/services/<name>/index.js'`; from `src/server/address-book/address-countries.js`
   `'../app/services/countries/index.js'`; from `src/server/routes/home/controller.js`
   `'../../app/services/<name>/index.js'`. Always `index.js` — never import `client.js` or `stub.js` from outside the
   service folder (§6H greps for it).
2. **Inside a service folder**: `'./client.js'`, `'./stub.js'`, `'../../lib/http-client.js'`,
   `'../../lib/http-status.js'`, `'../../../common/services/mode.js'` (animals' exact spelling),
   `'../../../../config/config.js'`.
3. **Test helper**: from `src/server/address-book/<page>/*.test.js` and `src/server/routes/home/*.test.js` it is
   `'../../common/test-helpers/real-mode.js'`; from `src/server/address-book/address-countries.test.js`
   `'../common/test-helpers/real-mode.js'`; from `src/server/app/services/<name>/*.test.js`
   `'../../../common/test-helpers/real-mode.js'`.
4. **No `vi.mock` of anything under `src/server/app/`** — the module boundary is not mocked in this stage (D2). The
   only `vi.mock` calls that remain in the touched tests are `get-oidc-config.js` (controller tests, as today) and
   `@defra/hapi-tracing` (the three service tests, D16).
5. `import * as addressBook from './index.js'` in N11 is deliberate — the public-surface test enumerates the
   namespace. Everywhere else, import the names you use.
6. Nothing under `src/plugins/`, `src/server/server.js`, `src/server/router.js`, `src/config/` imports a client, so
   no edit there.

---

## 5. Tests

### Tests that move unchanged

| File | Tests | Pins |
|---|---|---|
| `src/server/app/lib/http-client.test.js` | 5 | `errorMessageFromBody`'s fallback order: detail → message → title → statusText → `HTTP <status>`. |

### Tests that move with a signature edit (E17)

| File | Tests | Pins |
|---|---|---|
| `src/server/app/services/ins-backend/stub.test.js` | 8 | Stub sorting by `arrivalDate`/`lastUpdated` both ways and the default; `DELETED` rows excluded from content and totals; pagination past the last page keeps the totals. |

### Tests that are rewritten (nock in place of module mocks; same behaviours, same counts)

| File | Tests | What each now pins that it did not before |
|---|---|---|
| `address-book/address-countries.test.js` (E10) | 7 | `getAddressFormCountries` really GETs `/countries` on the reference-data base URL. |
| `address-book/list/controller.test.js` (E11) | 9 | The exact query string the address book receives (`page`, `q`, `countryCode`), resolved from the session organisation's path. |
| `address-book/add/controller.test.js` (E12) | 6 | The POST body and the `Trade-Imports-Organisation-Id` header the API receives; a 400 problem body re-renders the form; a stray request on validation failure/cancel would surface as a 500. |
| `address-book/edit/controller.test.js` (E13) | 7 | The PUT body (blank `addressLine2`/`county` sent as `''`); 404 and tombstone paths from real responses. |
| `address-book/view/controller.test.js` (E14) | 6 | GET by id carries the organisation header; the malformed-id 404 comes from route validation, not from the API. |
| `address-book/delete/controller.test.js` (E15) | 7 | The DELETE carries the organisation header; a tombstone is never deleted (no DELETE interceptor). |
| `routes/home/controller.test.js` (E16) | 10 | The exact `/notifications` query string (`page`, `sort`, `referenceNumber`), including the default sort and the fallback for an unknown sort. |
| `plugins/csrf.test.js` (E8) | 2 | Unchanged assertions; the form now renders from the countries **stub**, proving the stub path needs no mock. |

### Tests that are new

| File | Tests | Pins |
|---|---|---|
| `app/services/address-book/address-book.test.js` (N11) | 17 | Real mode: path + organisation header + trace header on every verb; `q`/`countryCode` forwarding; `encodeURIComponent` on both ids; 400 → `{ status: 400, body.errors }` on create and update; 204 delete; API message on a bodied 404; **missing organisation refused on all five operations with no request made**; `mapApiErrorsToFormErrors`; the public surface is exactly six names. Stub mode: the `stub-org-1` seed at `000000000000000000000001`, `-empty`, `-paginated` (30 over 25+5), and a create→get→update→delete→404 round trip — the semantics the fit suite (`seed-address.js`, `list.fit.spec.js`) rests on, pinned at unit level for the first time. |
| `app/services/countries/countries.test.js` (N12) | 4 | Real: trace header, `blocks` query, `{ message: 'Failed to get countries', status }` on failure. Stub: the four canned rows, no request. |
| `app/services/ins-backend/ins-backend.test.js` (N13) | 5 | Real: `page` + trace header, `sort`/`referenceNumber` forwarding, **no** organisation header, `{ status, message }` from `throwOnError`. Stub: three visible rows in default order, no request. |

### Tests that are deleted (their subjects are replaced)

`address-book-client.test.js` (11), `countries-client.test.js` (3), `ins-backend-client.test.js` (4),
`ins-backend-client.stub.test.js` (8, moved), `http-client.test.js` (5, moved).

### Arithmetic

Baseline 48 files / 245 tests. Deleted: 11 + 3 + 4 + 8 + 5 = 31 → 214. Added: 5 (moved http-client) + 8 (moved stub)
+ 17 + 4 + 5 = 39 → **253**. Files: 48 − 5 + 5 = **48**. Rewritten files keep their counts (7 + 9 + 6 + 7 + 6 + 7 +
10 + 2). If `Tests  253 passed (253)` is not what the log says, a test was lost or gained — find it before going on.

---

## 6. Invariants to prove

Every command is one Bash call; test output goes to a file under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/` that is read once with the Read tool.

**Order of work.** Do §1 (moves and deletes), §3 (new files), §2 (edits) in that order, then format, then the ladder.
There is no useful intermediate green — the suite cannot pass while any consumer still imports
`common/clients/`. The first `npm test` read is the canary: if it is red, the log names the file; fix it and run
once more. If a controller test fails at boot with `Nock: Disallowed net connect`, read the URL in the message — it
is a boot-time request this plan did not foresee — and record it in the stage's notes before doing anything else.

**A. Ladder** (four rungs, in order). If `format:check` fails, run
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format` once and re-run the
rung (run it before the ladder anyway — every new file above is written unwrapped).

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format:check > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s04-format.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run lint > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s04-lint.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend test > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s04-test.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run test:fit > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s04-fit.log 2>&1
```

`s04-test.log` must show `Test Files  48 passed (48)` and `Tests  253 passed (253)`. `s04-fit.log` must show
`49 passed`. On a Playwright failure read `test-results/*/error-context.md` inside the repo, not the log tail. The
fit suite is the proof that the stub seeds (`stub-org-1`, `-empty`, `-paginated`) and the per-call `isStubMode()`
selection work under plain `node .` with `STUB_MODE=true` (D18).

**B. Invariant 2 — no old name or path survives.** Must return nothing:

```
grep -rn -e "common/clients" -e "client.real" -e "client.stub" -e "__mocks__" -e addressBookClient -e countriesClient -e insBackendClient -e "getAddressFormCountries(traceId)" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.public --exclude-dir=coverage --exclude-dir=playwright-report --exclude-dir=test-results
```

**C. Invariant 1 — public URL surface unchanged.** s01's route grep:

```
grep -rn "path: '" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/plugins --include="*.js" --exclude="*.test.js" --exclude="*.spec.js"
```

(quote the globs — the shell is zsh). The set must be exactly s03's closing set: `/auth/stub-sign-in`,
`/auth/sign-in`, `/auth/sign-in-oidc`, `/auth/sign-out`, `/auth/sign-out-oidc`, `/auth/organisation`,
`/favicon.ico`, `${config.get('assetPath')}/{param*}`, `/signout`, `/address-book/{id}/delete` (x2),
`/address-book/{id}/edit` (x2), `/address-book/add` (x2), `/address-book`, `/address-book/{id}`, `/`, `/health` —
plus the cookie `path: '/'` in `src/plugins/auth.js`, which is not a route. Nothing added, nothing missing.

**D. The trace header comes from the request context, never a parameter.** Must return exactly three hits, the one
`getTraceId()` call site in each `client.js` (the unrestricted grep also matches each file's import line and the
hoisted `vi.mock('@defra/hapi-tracing')` in the three D16 service tests, which is expected):

```
grep -rn "getTraceId()" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app --include=client.js
```

and this must return nothing (no service takes or forwards a trace id):

```
grep -rn "traceId" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app
```

**E. Invariants 6/7 — the diff is exactly this stage.** `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend add -A` then
`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached -M --stat` must list
exactly these paths and no other (47 entries: 2 renames, 1 rename-with-edit, 14 deletions, 14 additions, 16 edits —
the moved `stub.test.js` appears once, as a rename with changes):

```
renames:   src/server/common/clients/http-client.js -> src/server/app/lib/http-client.js
           src/server/common/clients/http-client.test.js -> src/server/app/lib/http-client.test.js
           src/server/common/clients/ins-backend-client.stub.test.js -> src/server/app/services/ins-backend/stub.test.js
deleted:   src/server/common/clients/{address-book-client,address-book-client.real,address-book-client.stub,address-book-client.test,countries-client,countries-client.real,countries-client.stub,countries-client.test,ins-backend-client,ins-backend-client.real,ins-backend-client.stub,ins-backend-client.test}.js
           src/server/common/clients/__mocks__/{address-book-client,ins-backend-client}.js
added:     src/server/app/lib/http-status.js
           src/server/app/services/address-book/{index,client,stub,address-book.test}.js
           src/server/app/services/countries/{index,client,stub,countries.test}.js
           src/server/app/services/ins-backend/{index,client,stub,ins-backend.test}.js
           src/server/common/test-helpers/real-mode.js
edited:    src/plugins/csrf.test.js
           src/server/address-book/address-countries.js
           src/server/address-book/address-countries.test.js
           src/server/address-book/{list,add,edit,view,delete}/controller.js
           src/server/address-book/{list,add,edit,view,delete}/controller.test.js
           src/server/address-book/fit/seed-address.js
           src/server/routes/home/controller.js
           src/server/routes/home/controller.test.js
```

The two `http-client` entries must show as `R100` (`git diff --cached -M --name-status`); if not, the move restyled
the file — restore it byte for byte (D12). Read the full diff once
(`git -C … diff --cached > …/logs/s04-full-diff.log`) and check no hunk outside §1–§3 exists: no "was previously" /
"renamed from" / "moved from" wording, no comment added that this plan does not show, no edit to a `.njk`, the
schema, the router or `server.js`.

**F. Invariant 4 — no cross-repo import.** Must return nothing:

```
grep -rn "from '.*trade-imports-\(animals\|plants\)" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```

**G. Invariant 5 — copy files.** Not applicable; s07 has not run and this stage creates no user-facing string (the
one new error message, the missing-organisation refusal, is a developer-facing `Error` that no template renders).

**H. Invariant 8 — the module boundary is not mocked, and services are reached through `index.js`.** Both must
return nothing:

```
grep -rn "vi.mock(.*app/services" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
grep -rn "services/\(address-book\|countries\|ins-backend\)/\(client\|stub\).js" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src --include="*.js" --exclude-dir=services
```

and this must list exactly the 10 test files that mock the network (7 controller/helper tests + 3 service tests):

```
grep -rl "real-mode.js" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```

**I. The old folder and the mock folders are gone.** Both must return nothing:

```
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src -type d -name clients
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src -type d -name __mocks__
```

**J. `http-status.js` is plants' file.** The `diff` in N1 must print nothing.

---

## 7. Commit

Stage everything (`git -C … add -A`), then commit on `feat/NO_JIRA-frontend-alignment`:

```
refactor(alignment): s04-services-shape — reshape the clients into app/services

Each client becomes a service folder of index.js (the public surface,
choosing stub or real on every call through isStubMode()), client.js
(the HTTP client, trace header read from the request context, refusing
a missing organisation) and stub.js (the canned data) under
src/server/app/services, with http-client.js and http-status.js in
src/server/app/lib. Controller and service tests mock at the network
boundary with nock instead of at the module boundary; the __mocks__
folders go.
```

plus the required trailers. Do not push to `main`; do not merge.

---

## 8. Out of scope — leave alone even though it is tempting

- **`const traceId = getTraceId() ?? ''` in the six controllers** and the `traceId` field in their `logger.error`
  objects — redundant with the logger mixin, but s06 moves those controllers; tidy them there (D13).
- **`err.status === 400`** in `edit/controller.js` and every other controller literal — s06/s08.
- **`address-countries.js` beyond E1** — its `function` declarations, `GB_COUNTRY`, `buildCountry*`; it moves
  to `app/features/address-book/` in s06.
- **Animals' `toRecord` display-shape mapping and `to-wire-address.js`** — ins renders the wire shape directly
  (`address.postcode`, `address.countryCode`); the journeys carry a different display shape for their own reasons.
  Not ported.
- **Priming at boot (`prime()`), `_capture/fixtures`, `setupFiles`** — journey machinery; ins fetches countries per
  request and keeps four canned rows.
- **`common/constants/status-codes.js`** — stays; do not migrate its users to `app/lib/http-status.js` (D10).
- **`common/helpers/address-book-helper.js`, `notification-dashboard-helper.js`, `require-organisation-id.js`** —
  untouched; they move in s05/s06.
- **`README.md`**, `src/server/common/README.md` — s11.
- **`docs/analysis/reference-data-resilience.md`** in the workspace repo — D17.
- **`src/server/common/test-helpers/mock-auth.js` and `test-server.js`** — untouched; the target tree's split of
  `mock-auth.js` is a later stage. Do not wire `test-server.js` into the rewritten controller tests: they keep the
  inline `createServer`/`initialize`/`stop` they have today, so the diff shows only the mock-to-nock change.
- **`sonar-project.properties`, `vitest.config.js`, `playwright.config.js`, `.github/workflows/*`** — nothing in
  them names a moved path.
- **The two journey repos** — this stage touches `ins` only.
- Any comment tidy-up, identifier rename, import reordering or blank-line change beyond §1–§3.

---

## 9. Behaviour changes (named, per invariant 2)

1. **A missing organisation id is refused by the address-book client** with `Cannot reach the address book without
   an organisation: the signed-in session carries none`, instead of a request to `/organisation/undefined/addresses`.
   Unreachable through the routes today — `requireOrganisationId` answers 403 first — so nothing a trader sees
   changes; the stub still fails loudly (`TypeError`) on `undefined`, which is a test-double concern.
2. **A reference-data failure is logged once, not twice.** The countries client no longer calls `logger.error`
   before throwing (D6); every caller already logs the failure with the error, which carries `status` and
   `statusText`.
3. **Stub-or-real is decided on every call**, not once at import. In a running process the answer never changes
   (the flag is environment-driven and refused in production either way), so no user-visible change; it is what lets
   a test flip modes with `config.set` and no `vi.resetModules()`.
4. **The outbound trace header is read from the request context inside the client** (`getTraceId()`), not
   threaded through every controller. Same header, same value.

Nothing user-visible changes for a signed-in trader in either mode: the route surface (§6C), the stub seeds, the
address-book flows and the dashboard render as before, and the fit suite (§6A) proves it.
