# s06-address-book-feature — move the address book into `app/features` with the group anatomy

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit/Write tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (checked out, level with `origin`, clean tree, HEAD `d260ae5`).

Reference files (journey frontends):

- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/` —
  the multi-page group: a `fields.js` of names at the group root, group-level modules beside it (`links.js`,
  `line-form.js`, `entry-index.js`), one folder per page (`list/`, `details/`) each holding a controller, a
  `template.njk` and the controller's test, and one `fit/` folder holding every browser spec and the helper they
  share. A controller is: imports → `const view = …` → small named arrows → `buildView(request, h, model)` → `get` /
  `post` arrows → `export const routes = kit.pageRoutes(…)` at the foot. Templates take every href from the view
  model (`addAnotherHref`, `row.changeHref`, `backLink`) and never concatenate a URL.
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/index.js` —
  `import * as <feature> from './<feature>/<page>/…controller.js'` per page and `export const allRoutes = [...a.routes,
  ...b.routes]`.
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/features.md` — "`commodities/` is
  the shape a multi-page feature group takes"; the fit specs "run in the Playwright `features` project" whose
  `testDir` is the features folder (`playwright.config.js` lines 46–55).
- `repos/trade-imports-ins-frontend/src/server/app/features/dashboard/controller.js` (landed by s05) — the ins
  spelling of the same controller shape: `const view = 'dashboard/template'`, `...kit.base(PAGE_TITLE)`,
  `export const routes = kit.pageRoutes(dashboardPath(), { get: listGet })`.

Baseline (s05's landed ladder on `d260ae5`, `logs/s05-app-shell-ins-test.log` / `logs/s05-app-shell-ins-test-fit.log`):
unit suite **51 files / 273 tests green**, `format:check` clean, `lint` clean, Playwright **49/49** green.
Expected after this stage: **50 files / 285 tests** (§5 arithmetic), Playwright still **49/49**.

This stage moves `src/server/address-book/` to `src/server/app/features/address-book/`, gives it plants' group
anatomy, retires the five per-page Hapi plugins in favour of `routes` exports spread by `features/index.js`, folds
the address book's helpers out of `common/` into the feature, removes the temporary third Vision root s05 left for
it, and points Playwright at `src/server/app/features`. 23 files move (10 of them with edits), 6 are deleted, 4 are
created, 12 are edited in place. The public URL surface, every user-facing string, every `data-testid` and the
whole Playwright suite are unchanged.

---

## 0. Decisions (made here so the implementor never has to choose)

| # | Question the brief left open | Decision |
|---|---|---|
| D1 | Controller file name: the brief says `controller.js`; plants' commodities group uses `list.controller.js` / `details.controller.js`. | **`controller.js`** in every page folder, as the brief says and as ins's dashboard already does (`features/dashboard/controller.js`). Plants' `<page>.controller.js` spelling exists because a journey has many sibling groups open at once; ins has one. Named for the s13 report as a deliberate divergence from plants. |
| D2 | Handler names inside a controller. | Plants' bare **`get` / `post`** arrows (`const get = async (request, h) => …`). The dashboard's `listGet` is not renamed (s07 rewrites that controller; leave it detectable). |
| D3 | Page folders carry `{id}` and today validate it with `addressIdRouteOptions`; `kit.pageRoutes(path, { get, post })` applies `routeOptions` alone. | **`pageRoutes` gains a third parameter** `options = routeOptions`, applied to both routes. `address-id-params.js` builds `addressIdRouteOptions = { ...routeOptions, validate: { params: addressIdParams, failAction } }` from the kit and the three `{id}` controllers pass it. `kit.test.js` pins that the supplied options land on both routes; `app/routes.test.js` pins that every `{id}` route validates with `addressIdParams`. |
| D4 | `session-auth-route-options.js` — s05 said s06 inlines it. | **Inlined.** `kit.js` becomes `export const routeOptions = { auth: 'session' }`; `signout/index.js` imports `routeOptions` from `../app/shared/kit.js` (chassis reaching the kit is animals' precedent — `errors.js`); the constant file is deleted. `kit.test.js`'s "names the session strategy" test keeps pinning `{ auth: 'session' }`. |
| D5 | Where the success banner's session key and yar wrappers go (the brief moves `session-keys.js` into the feature; s05 §8 handed `session-helpers.js` to s06 too). | **One feature module, `features/address-book/success-banner.js`**, exporting `setSuccessBanner(request, message)` and `takeSuccessBanner(request)` (read-and-clear). The key `'addressBookSuccess'` is a private constant. `session-keys.js` and `session-helpers.js` are deleted (nothing else imported them — verified by grep). The defensive `request.yar` guard in `getSessionValue` goes: yar is registered unconditionally by `sessionCache` in `server.js`, so the guard was dead. |
| D6 | `validation-helpers.js` (`formatValidationErrors`, the joi → GOV.UK adapter) — s05 §8 handed it to s06. | **Folded into `fields.js`** beside the schema builder it adapts; its one test moves into `fields.test.js`. s08 replaces both together. `common/helpers/validation-helpers.js` and its test are deleted. |
| D7 | `pagination-helper.js` — s05 D8: "s06 folds it into the address-book feature and deletes it". | **Folded into `features/address-book/view-model/list.js`**, specialised to `pageSize` / `totalItems` / `addressBookPath()`, exactly as s05 E14 did for the dashboard — but written in a **different shape** (a curried `pageHrefFor`, `clampPage`, conditional spreads for `previous`/`next`) so it shares no 10-line token run with `notification-dashboard-helper.js`: SonarCloud's new-duplication gate is 3 % of new lines and the two features are meant to stay independent (invariant 4). The unused `results` key and the never-passed `baseUrl` option are dropped; `previous`/`next` stay **omitted** (not `undefined`) on the first/last page as today. |
| D8 | The view-model file's name. | **`view-model/list.js`** — every export serves the list page (query string, results label, pagination links, the address line, the row mapping). "address-book-helper" says nothing about what the file does and "helper" is the kind of name the workspace bans. The dashboard's `notification-dashboard-helper.js` is s07's to rename. |
| D9 | `buildFullAddress` in `address-book-helper.js`. | **Deleted with its test** — no caller anywhere in `src/` (verified by grep); the view page renders one row per field, never a joined line. |
| D10 | `address-schema.js` → `fields.js`: what "field names" means. | `export const FIELDS = Object.keys(FIELD_RULES)` — the nine names in the form's order — and `formValuesOf(source = {})`, which builds the form's values from a payload or a stored address (blank for anything missing). It replaces the three near-identical `emptyFormValues` / `payloadToFormValues` / `addressToFormValues` functions across add and edit. `FIELD_RULES` and `buildAddressSchema` are byte-for-byte what they were (the brief: they stay together until s08). |
| D11 | The three `{id}` pages repeat the same load-and-refuse-tombstone block and the same `isBoom → 404 → log + 500` catch. | **One feature module, `features/address-book/stored-address.js`**, exporting `loadStoredAddress(orgId, id)` (fetch, throw `Boom.notFound()` on a tombstone) and `boomFor(err, logUnexpected)` (the Boom to throw for a caught error: the error itself when it is already a Boom, `Boom.notFound()` for a client 404, otherwise call the logger and `Boom.internal()`). Edit's POST keeps its own catch because it re-renders rather than throws on an unexpected failure. |
| D12 | Where the "is this a 400 with field errors" predicate lives (add and edit both test `err.status === 400 && err.body?.errors`). | **`isValidationFailure(err)` in `app/services/address-book/index.js`** beside `mapApiErrorsToFormErrors` — it is the same contract (the client attaches `status: HTTP_STATUS_BAD_REQUEST` and `body: problem`). The service test's "public surface" pin gains the name and two tests pin the predicate. |
| D13 | Template hrefs: today the five templates carry `/address-book`, `/address-book/add`, `"/address-book/" + id + "/edit"` etc. | **Every href comes from the view model, built by `paths.js`** — plants' shape (`addAnotherHref`, `changeHref`, `backLink`). The list template gets `listHref` (form action and both "Clear search" links) and `addHref`; view gets `backLink`, `editHref`, `deleteHref`; edit and delete get `backLink`. The `id` key leaves the view models (it was only ever used to build those hrefs). Rendered output is identical: ids are 24-hex so `encodeURIComponent` is a no-op. Nothing outside `paths.js` names `/address-book` after this stage (§6C). The layout still does not render `backLink` (s09), so the three templates keep their own `govukBackLink` and read `backLink` from `kit.base()`. |
| D14 | Status constants. | Feature controllers use **`app/lib/http-status.js`** (`HTTP_STATUS_BAD_REQUEST`, `HTTP_STATUS_NOT_FOUND`, `HTTP_STATUS_INTERNAL_SERVER_ERROR`) — plants' shape, already used by the address-book client and stub. `common/constants/status-codes.js` stays for the chassis and the tests. The dashboard controller's `statusCodes` import is s07's. |
| D15 | `getTraceId` / `traceId` locals in the five controllers (s04 D13: tidy when they move). | **Dropped.** `logger-options.js`'s mixin stamps `trace.id` on every line. Log context keeps `orgId` and `id`. Named in §9. |
| D16 | Error summary rendering. s05 D5 left `kit.errorSummary()` and `shared/error-summary.njk` for "s06/s08 to switch over". | **Not switched.** The controllers' error model is `errorList` + `fieldErrors` from joi's `details`; `kit.errorSummary()` wants a `field → message` map, which is what s08's `app/lib/validate` produces. Switching now means rewriting `formatValidationErrors` and `mapApiErrorsToFormErrors` twice. The five templates keep their inline `govukErrorSummary` and the `'There is a problem'` literal until s07/s08. |
| D17 | `buildTableRows` (list) and `buildRows` (view) are exported from their controllers today. | `buildRows` **stays exported** — its two direct unit tests move with it. `buildTableRows` becomes the **private `tableRowsOf`** — nothing imports it and it has no direct test. |
| D18 | The edit POST's joi-error re-render fetched the countries a second time (`renderEditForm` → `getAddressFormCountries().catch(() => [])`) although the POST had just fetched them. | The joi-error branch renders with the **countries already in hand**, as add does. The API-400 and unexpected-failure branches still refetch with `.catch(() => [])` (the failure may be the reference-data service). Named in §9. |
| D19 | The list view model carried `addresses`, `paginationMeta` and `countryCode` keys the template never reads. | **Dropped.** The template reads `tableRows`, `resultsLabel`, `pagination`, `q`, `hasSearch`, `isEmpty`, `noSearchResults`, `successBanner`, `errorList` and now `listHref`, `addHref`. |
| D20 | The fit fixture: `address-form.js` holds `signIn`, the axe helper and the form tables, and the dashboard spec imports it across features. Plants keeps `signIn` at repo-root `fit/sign-in.js` and one `axe.js` per group. | **Kept as it is** (the brief: "Keep the shared-form fixture pattern the fit specs already use"); only the dashboard spec's import path changes. Splitting `signIn` and the axe helper into per-feature copies would duplicate ~25 lines of non-test source that SonarCloud's CPD counts (`sonar.cpd.exclusions` excludes only `*.test.js`). Recorded as an s11/s13 note: ins's fixture is shared across two features, plants' is per group plus one root `sign-in.js`. |
| D21 | Format. | Run `npm run format` once before the ladder — every new file below is written unwrapped and prettier decides the line breaks. Templates are not formatted (prettier globs are `.js`). |

---

## 1. Moves — every file that moves or is deleted

Paths relative to the ins repo root. "move" = `git mv` with content **unchanged**; "move + E<n>" = `git mv` then the
named edit; "rewrite" = `git mv` then the file is fully replaced from §2/§3 (git shows `D` + `A` if the content
drifts past 50 %, which is fine — chase the path set, not the letter); "delete" = `git rm`. Create the target
directories first, one `mkdir -p` per Bash call: `src/server/app/features/address-book/{list,add,edit,view,delete,view-model}`
(the `fit/` directory arrives with its `git mv`).

| From | To | How |
|---|---|---|
| `src/server/address-book/list/controller.js` | `src/server/app/features/address-book/list/controller.js` | rewrite (E1) |
| `src/server/address-book/list/controller.test.js` | `src/server/app/features/address-book/list/controller.test.js` | move + E6 |
| `src/server/address-book/list/index.njk` | `src/server/app/features/address-book/list/template.njk` | move + E11 |
| `src/server/address-book/list/index.js` | — | delete (the plugin is replaced by `routes`) |
| `src/server/address-book/add/controller.js` | `src/server/app/features/address-book/add/controller.js` | rewrite (E2) |
| `src/server/address-book/add/controller.test.js` | `src/server/app/features/address-book/add/controller.test.js` | move + E7 |
| `src/server/address-book/add/index.njk` | `src/server/app/features/address-book/add/template.njk` | move (byte-identical) |
| `src/server/address-book/add/index.js` | — | delete |
| `src/server/address-book/edit/controller.js` | `src/server/app/features/address-book/edit/controller.js` | rewrite (E3) |
| `src/server/address-book/edit/controller.test.js` | `src/server/app/features/address-book/edit/controller.test.js` | move + E8 |
| `src/server/address-book/edit/index.njk` | `src/server/app/features/address-book/edit/template.njk` | move + E12 |
| `src/server/address-book/edit/index.js` | — | delete |
| `src/server/address-book/view/controller.js` | `src/server/app/features/address-book/view/controller.js` | rewrite (E4) |
| `src/server/address-book/view/controller.test.js` | `src/server/app/features/address-book/view/controller.test.js` | move + E9 |
| `src/server/address-book/view/index.njk` | `src/server/app/features/address-book/view/template.njk` | move + E13 |
| `src/server/address-book/view/index.js` | — | delete |
| `src/server/address-book/delete/controller.js` | `src/server/app/features/address-book/delete/controller.js` | rewrite (E5) |
| `src/server/address-book/delete/controller.test.js` | `src/server/app/features/address-book/delete/controller.test.js` | move + E10 |
| `src/server/address-book/delete/index.njk` | `src/server/app/features/address-book/delete/template.njk` | move + E14 |
| `src/server/address-book/delete/index.js` | — | delete |
| `src/server/address-book/address-schema.js` | `src/server/app/features/address-book/fields.js` | rewrite (E15) |
| `src/server/address-book/address-schema.test.js` | `src/server/app/features/address-book/fields.test.js` | rewrite (E16) |
| `src/server/address-book/address-countries.js` | `src/server/app/features/address-book/address-countries.js` | move + E17 |
| `src/server/address-book/address-countries.test.js` | `src/server/app/features/address-book/address-countries.test.js` | move + E18 |
| `src/server/address-book/address-id-params.js` | `src/server/app/features/address-book/address-id-params.js` | move + E19 |
| `src/server/address-book/address-id-params.test.js` | `src/server/app/features/address-book/address-id-params.test.js` | move (byte-identical) |
| `src/server/address-book/fit/` (7 files) | `src/server/app/features/address-book/fit/` | move the directory; then E20 on `address-form.js` only |
| `src/server/common/helpers/address-book-helper.js` | `src/server/app/features/address-book/view-model/list.js` | rewrite (E21) |
| `src/server/common/helpers/address-book-helper.test.js` | `src/server/app/features/address-book/view-model/list.test.js` | rewrite (E22) |
| `src/server/common/helpers/validation-helpers.js` | — | delete (folded into `fields.js`, D6) |
| `src/server/common/helpers/validation-helpers.test.js` | — | delete (its test moves into `fields.test.js`, E16) |
| `src/server/common/helpers/pagination-helper.js` | — | delete (folded into `view-model/list.js`, D7) |
| `src/server/common/helpers/session-helpers.js` | — | delete (D5) |
| `src/server/common/constants/session-keys.js` | — | delete (D5) |
| `src/server/common/constants/session-auth-route-options.js` | — | delete (D4) |

After the table: `src/server/address-book/` must not exist (§6I) — `git mv` leaves empty directories behind on some
platforms, so `rmdir` each of `src/server/address-book/{list,add,edit,view,delete}` and `src/server/address-book`
(one per call; "No such file or directory" means git already removed it).

Nothing in `docker/`, `compose*`, `README.md`, `sonar-project.properties`, `Dockerfile`, `nodemon.json`,
`vite.config.js`, `test-helpers/component-helpers.js` or `.github/workflows/` names a moved path (verified by grep
at planning time; the workflow runs `npm run test:fit:ci`, which reads `playwright.config.js`). The tests repo
reaches the address book by URL only, and every URL is unchanged (§6C).

Who imported what (the complete list from `grep -rn` at HEAD — every one is rewritten below):

- the five plugins → `router.js` (E24)
- `sessionAuthRouteOptions` → `kit.js` (E23), `signout/index.js` (E25), `list/index.js` + `add/index.js` (deleted)
- `addressIdRouteOptions` → `view/index.js`, `edit/index.js`, `delete/index.js` (deleted); now the three controllers (E3–E5)
- `sessionKeys` + `setSessionValue`/`getSessionValue` → the four controllers that flash the banner (E1–E3, E5)
- `formatValidationErrors` → add + edit controllers (E2, E3) and its own test (deleted)
- `buildAddressSchema` → add + edit controllers (E2, E3) and its test (E16)
- `address-book-helper.js` → list controller (E1) and its test (E22); `pagination-helper.js` → `address-book-helper.js` only
- `requireOrganisationId` from `kit.js` → the five controllers (now `kit.requireOrganisationId`)
- `address-book/fit/address-form.js` → the dashboard fit spec (E28) and the five address-book specs (unchanged, relative)
- the `server` Vision root → `nunjucks.js` (E26); `testDir: './src/server'` → `playwright.config.js` (E27)
- the name `address-book-helper.js` in a comment → `dashboard/view-model/notification-dashboard-helper.test.js` (E29)

---

## 2. Edits — every file whose content changes, and exactly what changes

Do these with the Edit tool (or Write where the plan says "full replacement"). Nothing else in these files changes:
no import reordering, no comment tidy-up beyond what is listed, no restyle of untouched files.

### E1. `src/server/app/features/address-book/list/controller.js` — full replacement (Write; D2, D7, D13, D15, D17, D19)

```js
import { listAddresses } from '../../../services/address-book/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../lib/http-status.js'
import * as kit from '../../../shared/kit.js'
import {
  addressAddPath,
  addressBookPath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  getAddressFormCountries,
  resolveCountryCodeFromSearchTerm
} from '../address-countries.js'
import { takeSuccessBanner } from '../success-banner.js'
import {
  buildPaginationLinks,
  buildResultsLabel,
  mapAddressRows
} from '../view-model/list.js'

const logger = createLogger()
const view = 'address-book/list/template'
const PAGE_TITLE = 'Address book'

const parsePage = (queryPage) => {
  const page = Number.parseInt(queryPage, 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')

const viewLink = (address) =>
  `<a class="govuk-link" href="${addressPath(address.id)}">View<span class="govuk-visually-hidden"> ${escapeHtml(address.name)}</span></a>`

const tableRowsOf = (addresses) =>
  addresses.map((address) => [
    { text: address.name },
    { text: address.addressLine },
    { text: address.countryName },
    { html: viewLink(address) }
  ])

const countryNamesOf = (countries) =>
  Object.fromEntries(countries.map((country) => [country.code, country.name]))

const paginationOf = (response) => ({
  page: response.page,
  pageSize: response.pageSize,
  totalItems: response.totalItems,
  totalPages: response.totalPages
})

const buildView = (h, model) =>
  h.view(view, {
    ...kit.base(PAGE_TITLE),
    heading: PAGE_TITLE,
    listHref: addressBookPath(),
    addHref: addressAddPath(),
    ...model
  })

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const page = parsePage(request.query.page)
  const q = request.query.q?.trim() ?? ''
  const hasSearch = Boolean(q)
  const successBanner = takeSuccessBanner(request)

  try {
    const countries = await getAddressFormCountries()
    const countryCode =
      request.query.countryCode?.trim() ||
      resolveCountryCodeFromSearchTerm(q, countries)
    const search = { q: hasSearch ? q : undefined, countryCode }
    const response = await listAddresses(orgId, { page, ...search })
    const pagination = paginationOf(response)
    const addresses = mapAddressRows(
      response.items ?? [],
      countryNamesOf(countries)
    )

    return buildView(h, {
      tableRows: tableRowsOf(addresses),
      resultsLabel: buildResultsLabel(pagination),
      pagination: buildPaginationLinks(pagination, search),
      q,
      hasSearch,
      isEmpty: response.totalItems === 0 && !hasSearch,
      noSearchResults: response.totalItems === 0 && hasSearch,
      successBanner
    })
  } catch (err) {
    logger.error({ err, orgId }, 'Failed to load address book')
    return buildView(h, {
      tableRows: [],
      resultsLabel: null,
      pagination: null,
      q,
      hasSearch,
      isEmpty: false,
      noSearchResults: false,
      successBanner,
      errorList: [{ text: 'Something went wrong loading your address book' }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressBookPath(), { get })
```

The `||` on `countryCode` is deliberate and unchanged from today: an empty `?countryCode=` must fall through to the
name lookup. Every string literal is the one the old file carried.

### E2. `src/server/app/features/address-book/add/controller.js` — full replacement (Write; D10, D12, D14, D15)

```js
import {
  createAddress,
  isValidationFailure,
  mapApiErrorsToFormErrors
} from '../../../services/address-book/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../lib/http-status.js'
import * as kit from '../../../shared/kit.js'
import { addressAddPath, addressBookPath } from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  buildCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import {
  buildAddressSchema,
  formValuesOf,
  formatValidationErrors
} from '../fields.js'
import { setSuccessBanner } from '../success-banner.js'

const logger = createLogger()
const view = 'address-book/add/template'
const PAGE_TITLE = 'Add address details'

const buildView = (h, { formValues, countryItems, errorList, fieldErrors }) =>
  h.view(view, {
    ...kit.base(PAGE_TITLE),
    heading: PAGE_TITLE,
    formValues,
    countryItems,
    errorList,
    fieldErrors
  })

const countryItemsOrNone = async () =>
  buildCountrySelectItems(await getAddressFormCountries().catch(() => []))

const get = async (request, h) => {
  try {
    const countries = await getAddressFormCountries()
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: buildCountrySelectItems(countries)
    })
  } catch (err) {
    logger.error({ err }, 'Failed to load address form countries')
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: [],
      errorList: [{ text: 'Something went wrong loading the form' }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

const post = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return h.redirect(addressBookPath())
  }
  const formValues = formValuesOf(payload)

  try {
    const countries = await getAddressFormCountries()
    const schema = buildAddressSchema(countries.map((country) => country.code))
    const { error, value } = schema.validate(formValues, { abortEarly: false })
    if (error) {
      return buildView(h, {
        formValues,
        countryItems: buildCountrySelectItems(countries),
        ...formatValidationErrors(error)
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const created = await createAddress(orgId, value)
    setSuccessBanner(request, `${created.name} added to your address book`)
    return h.redirect(addressBookPath())
  } catch (err) {
    if (isValidationFailure(err)) {
      return buildView(h, {
        formValues,
        countryItems: await countryItemsOrNone(),
        ...mapApiErrorsToFormErrors(err.body)
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, orgId }, 'Failed to create address')
    return buildView(h, {
      formValues,
      countryItems: await countryItemsOrNone(),
      errorList: [{ text: 'Something went wrong saving the address' }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
```

### E3. `src/server/app/features/address-book/edit/controller.js` — full replacement (Write; D3, D10–D13, D18)

```js
import Boom from '@hapi/boom'

import {
  isValidationFailure,
  mapApiErrorsToFormErrors,
  updateAddress
} from '../../../services/address-book/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_FOUND
} from '../../../lib/http-status.js'
import * as kit from '../../../shared/kit.js'
import {
  addressBookPath,
  addressEditRoutePath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  buildCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import { addressIdRouteOptions } from '../address-id-params.js'
import {
  buildAddressSchema,
  formValuesOf,
  formatValidationErrors
} from '../fields.js'
import { boomFor, loadStoredAddress } from '../stored-address.js'
import { setSuccessBanner } from '../success-banner.js'

const logger = createLogger()
const view = 'address-book/edit/template'
const PAGE_TITLE = 'Edit address details'

const buildView = (
  h,
  { id, formValues, countryItems, errorList, fieldErrors }
) =>
  h.view(view, {
    ...kit.base(PAGE_TITLE, { backLink: addressPath(id) }),
    heading: PAGE_TITLE,
    formValues,
    countryItems,
    errorList,
    fieldErrors
  })

const countryItemsOrNone = async () =>
  buildCountrySelectItems(await getAddressFormCountries().catch(() => []))

const rejected = async (h, model) =>
  buildView(h, { ...model, countryItems: await countryItemsOrNone() })

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await loadStoredAddress(orgId, id)
    const countries = await getAddressFormCountries()
    return buildView(h, {
      id,
      formValues: formValuesOf(address),
      countryItems: buildCountrySelectItems(countries)
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to load address for edit')
    )
  }
}

const post = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return h.redirect(addressBookPath())
  }
  const formValues = formValuesOf(payload)

  try {
    const countries = await getAddressFormCountries()
    const schema = buildAddressSchema(countries.map((country) => country.code))
    const { error, value } = schema.validate(formValues, { abortEarly: false })
    if (error) {
      return buildView(h, {
        id,
        formValues,
        countryItems: buildCountrySelectItems(countries),
        ...formatValidationErrors(error)
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const updated = await updateAddress(orgId, id, value)
    setSuccessBanner(request, `${updated.name} updated in your address book`)
    return h.redirect(addressBookPath())
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    if (err.status === HTTP_STATUS_NOT_FOUND) {
      throw Boom.notFound()
    }
    if (isValidationFailure(err)) {
      return (
        await rejected(h, {
          id,
          formValues,
          ...mapApiErrorsToFormErrors(err.body)
        })
      ).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, orgId, id }, 'Failed to update address')
    return (
      await rejected(h, {
        id,
        formValues,
        errorList: [{ text: 'Something went wrong saving the address' }]
      })
    ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(
  addressEditRoutePath(),
  { get, post },
  addressIdRouteOptions
)
```

### E4. `src/server/app/features/address-book/view/controller.js` — full replacement (Write; D3, D11, D13, D17)

```js
import * as kit from '../../../shared/kit.js'
import {
  addressBookPath,
  addressDeletePath,
  addressEditPath,
  addressRoutePath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { getAddressFormCountries } from '../address-countries.js'
import { addressIdRouteOptions } from '../address-id-params.js'
import { boomFor, loadStoredAddress } from '../stored-address.js'

const logger = createLogger()
const view = 'address-book/view/template'

export const buildRows = (address, countryName) => [
  {
    key: { text: 'Name or organisation name' },
    value: { text: address.name }
  },
  { key: { text: 'Address line 1' }, value: { text: address.addressLine1 } },
  {
    key: { text: 'Address line 2 (optional)' },
    value: { text: address.addressLine2 }
  },
  { key: { text: 'Town or city' }, value: { text: address.townOrCity } },
  { key: { text: 'County' }, value: { text: address.county } },
  {
    key: { text: 'Postcode or Zip code' },
    value: { text: address.postcode }
  },
  {
    key: { text: 'Country' },
    value: { text: countryName ?? address.countryCode }
  },
  { key: { text: 'Email address' }, value: { text: address.email } },
  { key: { text: 'Phone number' }, value: { text: address.phone } }
]

const countryNameOf = (countries, countryCode) =>
  countries.find((country) => country.code === countryCode)?.name ??
  countryCode

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await loadStoredAddress(orgId, id)
    const countries = await getAddressFormCountries().catch(() => [])
    return h.view(view, {
      ...kit.base(address.name, { backLink: addressBookPath() }),
      heading: address.name,
      editHref: addressEditPath(id),
      deleteHref: addressDeletePath(id),
      summaryRows: buildRows(
        address,
        countryNameOf(countries, address.countryCode)
      )
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to load address')
    )
  }
}

export const routes = kit.pageRoutes(
  addressRoutePath(),
  { get },
  addressIdRouteOptions
)
```

The `buildRows` doc comment (which named `edit/index.njk`) goes; its test's name carries the intent.

### E5. `src/server/app/features/address-book/delete/controller.js` — full replacement (Write; D3, D5, D11, D13)

```js
import { deleteAddress } from '../../../services/address-book/index.js'
import * as kit from '../../../shared/kit.js'
import {
  addressBookPath,
  addressDeleteRoutePath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { addressIdRouteOptions } from '../address-id-params.js'
import { boomFor, loadStoredAddress } from '../stored-address.js'
import { setSuccessBanner } from '../success-banner.js'

const logger = createLogger()
const view = 'address-book/delete/template'
const PAGE_TITLE = 'Delete address'

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await loadStoredAddress(orgId, id)
    return h.view(view, {
      ...kit.base(PAGE_TITLE, { backLink: addressPath(id) }),
      heading: PAGE_TITLE,
      addressName: address.name
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to load address for delete')
    )
  }
}

const post = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params
  if (request.payload?.cancel) {
    return h.redirect(addressPath(id))
  }

  try {
    const address = await loadStoredAddress(orgId, id)
    await deleteAddress(orgId, id)
    setSuccessBanner(request, `${address.name} deleted from your address book`)
    return h.redirect(addressBookPath())
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to delete address')
    )
  }
}

export const routes = kit.pageRoutes(
  addressDeleteRoutePath(),
  { get, post },
  addressIdRouteOptions
)
```

### E6–E10. The five moved controller tests — import paths only

From `src/server/app/features/address-book/<page>/`, four `..` reach `src/server`, five reach `src`. In each of
`list`, `add`, `edit`, `view`, `delete` `controller.test.js`, and only these lines:

| Today | Becomes |
|---|---|
| `import { createServer } from '../../server.js'` | `import { createServer } from '../../../../server.js'` |
| `import { statusCodes } from '../../common/constants/status-codes.js'` | `import { statusCodes } from '../../../../common/constants/status-codes.js'` |
| `} from '../../common/test-helpers/mock-auth.js'` | `} from '../../../../common/test-helpers/mock-auth.js'` |
| `} from '../../common/test-helpers/real-mode.js'` | `} from '../../../../common/test-helpers/real-mode.js'` |
| `vi.mock('../../../auth/get-oidc-config.js', () => ({` | `vi.mock('../../../../../auth/get-oidc-config.js', () => ({` |
| (add only) `import { config } from '../../../config/config.js'` | `import { config } from '../../../../../config/config.js'` |
| (view only) `import { buildRows } from './controller.js'` | unchanged |

Every `describe` name, every test and every assertion is untouched: they assert on rendered HTML, status codes and
redirect locations, which this stage does not change. The tests keep using `statusCodes` (a test-side constant set;
D14 is about the controllers).

### E11. `src/server/app/features/address-book/list/template.njk` (the moved list template; D13)

Four href edits, nothing else (the `{% extends "shared/layout.njk" %}`, macros, strings and `data-testid`s stay):

| Today | Becomes |
|---|---|
| `<form method="get" action="/address-book" class="govuk-!-margin-bottom-6">` | `<form method="get" action="{{ listHref }}" class="govuk-!-margin-bottom-6">` |
| `href: "/address-book/add"` (inside the "Add a new address" `govukButton`) | `href: addHref` |
| `<a class="govuk-link" href="/address-book">Clear search</a>` (the no-results branch) | `<a class="govuk-link" href="{{ listHref }}">Clear search</a>` |
| `<a class="govuk-link" href="/address-book" data-testid="address-book-clear-search">Clear search</a>` | `<a class="govuk-link" href="{{ listHref }}" data-testid="address-book-clear-search">Clear search</a>` |

### E12. `src/server/app/features/address-book/edit/template.njk` (D13)

One edit: in the `govukBackLink` call, `href: "/address-book/" + id` → `href: backLink`.

### E13. `src/server/app/features/address-book/view/template.njk` (D13)

Three edits: `govukBackLink`'s `href: "/address-book"` → `href: backLink`; the Edit `govukButton`'s
`href: "/address-book/" + id + "/edit"` → `href: editHref`; the Delete `govukButton`'s
`href: "/address-book/" + id + "/delete"` → `href: deleteHref`.

### E14. `src/server/app/features/address-book/delete/template.njk` (D13)

One edit: in the `govukBackLink` call, `href: "/address-book/" + id` → `href: backLink`.

### E15. `src/server/app/features/address-book/fields.js` — full replacement (Write; D6, D10)

`FIELD_RULES` and the body of `buildAddressSchema` are byte-identical to `address-schema.js`; the diff is the
`FIELDS` / `formValuesOf` exports, the arrow spelling and `formatValidationErrors` arriving from
`validation-helpers.js` (same `errorList` / `fieldErrors` output, `Object.fromEntries` instead of a `forEach`).

```js
import Joi from 'joi'

export const FIELD_RULES = {
  name: { maxLength: 255, required: true },
  addressLine1: { maxLength: 255, required: true },
  addressLine2: { maxLength: 255, required: false },
  townOrCity: { maxLength: 100, required: true },
  county: { maxLength: 100, required: false },
  postcode: { maxLength: 12, required: true },
  countryCode: { required: true },
  phone: { maxLength: 20, required: true },
  email: { maxLength: 254, required: true, email: true }
}

export const FIELDS = Object.keys(FIELD_RULES)

export const formValuesOf = (source = {}) =>
  Object.fromEntries(FIELDS.map((field) => [field, source[field] ?? '']))

export const buildAddressSchema = (mdmCountryCodes) =>
  Joi.object({
    crumb: Joi.string().optional().allow('', null),
    name: Joi.string().trim().required().max(255).messages({
      'string.empty': 'Enter a name',
      'any.required': 'Enter a name',
      'string.max': 'Name must be 255 characters or fewer'
    }),
    addressLine1: Joi.string().trim().required().max(255).messages({
      'string.empty': 'Enter address line 1',
      'any.required': 'Enter address line 1',
      'string.max': 'Address line 1 must be 255 characters or fewer'
    }),
    addressLine2: Joi.string().trim().allow('').max(255).messages({
      'string.max': 'Address line 2 must be 255 characters or fewer'
    }),
    townOrCity: Joi.string().trim().required().max(100).messages({
      'string.empty': 'Enter a town or city',
      'any.required': 'Enter a town or city',
      'string.max': 'Town or city must be 100 characters or fewer'
    }),
    county: Joi.string().trim().allow('').max(100).messages({
      'string.max': 'County must be 100 characters or fewer'
    }),
    postcode: Joi.string().trim().required().max(12).messages({
      'string.empty': 'Enter a postcode',
      'any.required': 'Enter a postcode',
      'string.max': 'Postcode must be 12 characters or fewer'
    }),
    countryCode: Joi.string()
      .trim()
      .required()
      .valid(...mdmCountryCodes)
      .messages({
        'string.empty': 'Enter a country',
        'any.required': 'Enter a country',
        'any.only': 'Select a country from the list'
      }),
    phone: Joi.string().trim().required().max(20).messages({
      'string.empty': 'Enter a telephone number',
      'any.required': 'Enter a telephone number',
      'string.max': 'Telephone number must be 20 characters or fewer'
    }),
    email: Joi.string()
      .trim()
      .required()
      .email({ tlds: { allow: false } })
      .max(254)
      .messages({
        'string.empty': 'Enter an email address',
        'any.required': 'Enter an email address',
        'string.email': 'Enter an email address in the correct format',
        'string.max': 'Email address must be 254 characters or fewer'
      })
  })

const fieldNameOf = (detail) => detail.path.join('-')

export const formatValidationErrors = (joiError) => ({
  errorList: joiError.details.map((detail) => ({
    text: detail.message,
    href: `#${fieldNameOf(detail)}`
  })),
  fieldErrors: Object.fromEntries(
    joiError.details.map((detail) => [
      fieldNameOf(detail),
      { text: detail.message }
    ])
  )
})
```

### E16. `src/server/app/features/address-book/fields.test.js` — full replacement (Write)

The seven `address-schema.test.js` tests verbatim (imports repointed), the one `validation-helpers.test.js` test
verbatim, and two new `formValuesOf` pins.

```js
import { describe, expect, test } from 'vitest'

import {
  FIELDS,
  FIELD_RULES,
  buildAddressSchema,
  formValuesOf,
  formatValidationErrors
} from './fields.js'

const MDM_CODES = ['GB', 'FR', 'DE']

function validAddress(overrides = {}) {
  return {
    name: 'Highland Livestock Ltd',
    addressLine1: "14 Drover's Way",
    addressLine2: 'Unit 3',
    townOrCity: 'Inverness',
    county: 'Highland',
    postcode: 'IV2 3JH',
    countryCode: 'GB',
    phone: '+44 1463 234567',
    email: 'exports@example.com',
    ...overrides
  }
}

describe('#buildAddressSchema', () => {
  const schema = buildAddressSchema(MDM_CODES)

  test('accepts a valid Standard Address Block', () => {
    const { error } = schema.validate(validAddress())
    expect(error).toBeUndefined()
  })

  test('rejects missing mandatory fields', () => {
    const { error } = schema.validate(validAddress({ name: '' }))
    expect(error?.details.map((d) => d.path[0])).toContain('name')
  })

  test('rejects over-max fields', () => {
    const { error } = schema.validate(
      validAddress({ postcode: 'a'.repeat(13) })
    )
    expect(error?.details[0].path[0]).toBe('postcode')
  })

  test('validates countryCode against MDM alpha-2 codes', () => {
    const { error: invalid } = schema.validate(
      validAddress({ countryCode: 'ZZ' })
    )
    expect(invalid).toBeDefined()

    const { error: blank } = schema.validate(validAddress({ countryCode: '' }))
    expect(blank).toBeDefined()
  })

  test('enforces email format and accepts free-string phone', () => {
    const emailError = schema.validate(
      validAddress({ email: 'not-an-email' })
    ).error
    expect(emailError?.details[0].path[0]).toBe('email')

    const phoneOk = schema.validate(validAddress({ phone: 'call the office' }))
    expect(phoneOk.error).toBeUndefined()
  })

  test('does not include operatorType or transporter fields', () => {
    const keys = Object.keys(schema.describe().keys)
    expect(keys).not.toContain('operatorType')
    expect(keys).not.toContain('approvalNumber')
    expect(keys).not.toContain('transporterCategory')
  })
})

describe('#FIELD_RULES parity with Java Bean Validation', () => {
  test('maxLengths and mandatory flags match AddressRequest', () => {
    expect(FIELD_RULES.name).toEqual({ maxLength: 255, required: true })
    expect(FIELD_RULES.addressLine1).toEqual({ maxLength: 255, required: true })
    expect(FIELD_RULES.addressLine2).toEqual({
      maxLength: 255,
      required: false
    })
    expect(FIELD_RULES.townOrCity).toEqual({ maxLength: 100, required: true })
    expect(FIELD_RULES.county).toEqual({ maxLength: 100, required: false })
    expect(FIELD_RULES.postcode).toEqual({ maxLength: 12, required: true })
    expect(FIELD_RULES.countryCode).toEqual({ required: true })
    expect(FIELD_RULES.phone).toEqual({ maxLength: 20, required: true })
    expect(FIELD_RULES.email).toEqual({
      maxLength: 254,
      required: true,
      email: true
    })
  })
})

describe('#formValuesOf', () => {
  test('builds a blank form in the order the fields are asked', () => {
    expect(formValuesOf()).toEqual({
      name: '',
      addressLine1: '',
      addressLine2: '',
      townOrCity: '',
      county: '',
      postcode: '',
      countryCode: '',
      phone: '',
      email: ''
    })
    expect(Object.keys(formValuesOf())).toEqual(FIELDS)
  })

  test('reads the form fields from a stored address and blanks what is missing', () => {
    const address = {
      id: '665f1c2ab3e4d51a2c9d0e77',
      name: 'Highland Livestock Ltd',
      addressLine1: "14 Drover's Way",
      townOrCity: 'Inverness',
      postcode: 'IV2 3JH',
      countryCode: 'GB',
      phone: '+44 1463 234567',
      email: 'exports@example.com',
      deleted: false
    }

    expect(formValuesOf(address)).toEqual({
      name: 'Highland Livestock Ltd',
      addressLine1: "14 Drover's Way",
      addressLine2: '',
      townOrCity: 'Inverness',
      county: '',
      postcode: 'IV2 3JH',
      countryCode: 'GB',
      phone: '+44 1463 234567',
      email: 'exports@example.com'
    })
  })
})

describe('#formatValidationErrors', () => {
  test('maps Joi details to GOV.UK errorList and fieldErrors', () => {
    const joiError = {
      details: [
        {
          message: 'Enter address line 1',
          path: ['addressLine1']
        },
        {
          message: 'Enter an email address in the correct format',
          path: ['email']
        }
      ]
    }

    const result = formatValidationErrors(joiError)

    expect(result.errorList).toEqual([
      { text: 'Enter address line 1', href: '#addressLine1' },
      {
        text: 'Enter an email address in the correct format',
        href: '#email'
      }
    ])
    expect(result.fieldErrors.addressLine1.text).toBe('Enter address line 1')
    expect(result.fieldErrors.email.text).toBe(
      'Enter an email address in the correct format'
    )
  })
})
```

Ten tests.

### E17. `src/server/app/features/address-book/address-countries.js` (the moved module)

One import line: `import { getCountries } from '../app/services/countries/index.js'` →
`import { getCountries } from '../../services/countries/index.js'`. Nothing else (the
`resolveCountryCodeFromSearchTerm` doc comment is a "why" comment naming cv-048 and stays).

### E18. `src/server/app/features/address-book/address-countries.test.js` (the moved test)

One import line: `} from '../common/test-helpers/real-mode.js'` → `} from '../../../common/test-helpers/real-mode.js'`.
All six tests untouched.

### E19. `src/server/app/features/address-book/address-id-params.js` — full replacement (Write; D3, D4)

```js
import Boom from '@hapi/boom'
import Joi from 'joi'

import { routeOptions } from '../../shared/kit.js'

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

export const addressIdParams = Joi.object({
  id: Joi.string().pattern(OBJECT_ID_PATTERN).required().messages({
    'string.pattern.base': 'Enter a valid address id',
    'any.required': 'Enter a valid address id'
  })
})

export const addressIdRouteOptions = {
  ...routeOptions,
  validate: {
    params: addressIdParams,
    failAction: () => {
      throw Boom.notFound()
    }
  }
}
```

(The old file wrote `auth: 'session'` by hand; the spread reads it from the one place it is now defined.)

### E20. `src/server/app/features/address-book/fit/address-form.js` (the moved fixture; D20)

Two comment lines name the old schema file. `Standard Address Block against the same schema (address-schema.js), so the`
→ `Standard Address Block against the same schema (fields.js), so the`; and
`// field with a stated max length, mandatory or not, matching address-schema.js.` →
`// field with a stated max length, mandatory or not, matching fields.js.`. Nothing else in the seven fit files
changes — their imports are relative to `fit/` and move with it.

### E21. `src/server/app/features/address-book/view-model/list.js` — full replacement (Write; D7–D9)

`buildAddressBookQueryString`, `buildAddressLine` and `mapAddressRows` are the old functions in arrow form;
`buildResultsLabel` and `buildPaginationLinks` absorb `pagination-helper.js` (same clamp, same range arithmetic,
same `previous`/`next` presence rule, same numbered items, same hrefs through `buildAddressBookQueryString`) with
the results `count` object and the never-used `baseUrl` option dropped. `buildFullAddress` goes (D9).

```js
import { addressBookPath } from '../../../shared/paths.js'

export const buildAddressBookQueryString = ({ page, q, countryCode } = {}) => {
  const params = new URLSearchParams()
  if (q) {
    params.set('q', q)
  }
  if (countryCode) {
    params.set('countryCode', countryCode)
  }
  if (page && page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

const clampPage = (page, totalPages) =>
  Math.min(Math.max(page, 1), Math.max(totalPages, 1))

export const buildResultsLabel = ({ page, pageSize, totalItems, totalPages }) => {
  if (totalItems < 1) {
    return null
  }
  const currentPage = clampPage(page, totalPages)
  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)
  return `Showing ${from}-${to} of ${totalItems}`
}

const pageHrefFor = (search) => (page) =>
  `${addressBookPath()}${buildAddressBookQueryString({ ...search, page })}`

export const buildPaginationLinks = (
  { page, totalPages },
  { q, countryCode } = {}
) => {
  if (totalPages <= 1) {
    return null
  }
  const currentPage = clampPage(page, totalPages)
  const hrefOf = pageHrefFor({ q, countryCode })
  return {
    ...(currentPage > 1 && { previous: { href: hrefOf(currentPage - 1) } }),
    ...(currentPage < totalPages && {
      next: { href: hrefOf(currentPage + 1) }
    }),
    items: Array.from({ length: totalPages }, (_, index) => ({
      number: String(index + 1),
      href: hrefOf(index + 1),
      current: index + 1 === currentPage
    }))
  }
}

export const buildAddressLine = (address) =>
  [address.addressLine1, address.townOrCity, address.postcode]
    .filter(Boolean)
    .join(', ')

export const mapAddressRows = (items, countryNames = {}) =>
  items.map((address) => ({
    id: address.id,
    name: address.name,
    addressLine: buildAddressLine(address),
    countryCode: address.countryCode,
    countryName: countryNames[address.countryCode] ?? address.countryCode
  }))
```

(`...(false)` in an object literal spreads nothing — that is what keeps `previous`/`next` absent rather than
`undefined`, as the old model had them and as the existing test `expect(pagination.next).toBeUndefined()` allows.)

### E22. `src/server/app/features/address-book/view-model/list.test.js` — full replacement (Write)

The old nine tests minus `buildFullAddress`, plus three pins for the folded pagination (single page → `null`; no
`previous` on the first page and no `next` on the last; a page past the end clamps to the last).

```js
import { describe, expect, test } from 'vitest'

import {
  buildAddressBookQueryString,
  buildAddressLine,
  buildPaginationLinks,
  buildResultsLabel,
  mapAddressRows
} from './list.js'

const twoPages = { page: 2, pageSize: 25, totalItems: 30, totalPages: 2 }

describe('#buildAddressLine', () => {
  test('composes addressLine1, townOrCity and postcode', () => {
    expect(
      buildAddressLine({
        addressLine1: "14 Drover's Way",
        townOrCity: 'Inverness',
        postcode: 'IV2 3JH'
      })
    ).toBe("14 Drover's Way, Inverness, IV2 3JH")
  })
})

describe('#buildResultsLabel', () => {
  test('formats the current page range', () => {
    expect(
      buildResultsLabel({ page: 1, pageSize: 8, totalItems: 24, totalPages: 3 })
    ).toBe('Showing 1-8 of 24')
    expect(buildResultsLabel(twoPages)).toBe('Showing 26-30 of 30')
  })

  test('returns null when there are no results', () => {
    expect(
      buildResultsLabel({ page: 1, pageSize: 25, totalItems: 0, totalPages: 0 })
    ).toBeNull()
  })
})

describe('#buildAddressBookQueryString', () => {
  test('omits page size param', () => {
    expect(buildAddressBookQueryString({ page: 2 })).toBe('?page=2')
    expect(buildAddressBookQueryString({ page: 1 })).toBe('')
  })

  test('preserves search terms', () => {
    expect(
      buildAddressBookQueryString({ q: 'green', countryCode: 'GB', page: 2 })
    ).toBe('?q=green&countryCode=GB&page=2')
  })
})

describe('#buildPaginationLinks', () => {
  test('returns numbered pages from API metadata', () => {
    const pagination = buildPaginationLinks(twoPages)

    expect(pagination.items).toHaveLength(2)
    expect(pagination.items[1].current).toBe(true)
    expect(pagination.previous.href).toBe('/address-book')
    expect(pagination.next).toBeUndefined()
  })

  test('preserves active search terms', () => {
    const pagination = buildPaginationLinks(twoPages, {
      q: 'green',
      countryCode: 'GB'
    })

    expect(pagination.previous.href).toBe(
      '/address-book?q=green&countryCode=GB'
    )
    expect(pagination.items[1].href).toBe(
      '/address-book?q=green&countryCode=GB&page=2'
    )
  })

  test('returns null for a single page', () => {
    expect(
      buildPaginationLinks({
        page: 1,
        pageSize: 25,
        totalItems: 3,
        totalPages: 1
      })
    ).toBeNull()
  })

  test('omits previous on the first page and next on the last page', () => {
    const first = buildPaginationLinks({ ...twoPages, page: 1 })

    expect(first.previous).toBeUndefined()
    expect(first.next.href).toBe('/address-book?page=2')
    expect(buildPaginationLinks(twoPages).next).toBeUndefined()
  })

  test('clamps a page past the end to the last page', () => {
    const pagination = buildPaginationLinks({ ...twoPages, page: 5 })

    expect(pagination.items[1].current).toBe(true)
    expect(pagination.previous.href).toBe('/address-book')
    expect(pagination.next).toBeUndefined()
  })
})

describe('#mapAddressRows', () => {
  test('maps list rows with country names', () => {
    expect(
      mapAddressRows(
        [
          {
            id: '1',
            name: 'Farm',
            addressLine1: '1 Road',
            townOrCity: 'Town',
            postcode: 'AB1 2CD',
            countryCode: 'GB'
          }
        ],
        { GB: 'United Kingdom' }
      )
    ).toEqual([
      {
        id: '1',
        name: 'Farm',
        addressLine: '1 Road, Town, AB1 2CD',
        countryCode: 'GB',
        countryName: 'United Kingdom'
      }
    ])
  })
})
```

Eleven tests.

### E23. `src/server/app/shared/kit.js` (D3, D4)

Three edits:

| Today | Becomes |
|---|---|
| `import { sessionAuthRouteOptions } from '../../common/constants/session-auth-route-options.js'` (line 3) | line removed (the blank line after `import Boom` stays, then the `organisation-id.js` import) |
| `export const routeOptions = sessionAuthRouteOptions` | `export const routeOptions = { auth: 'session' }` |
| the `pageRoutes` doc comment + function (from `/**` above it to the closing `]`) | the block below |

```js
/**
 * The routes for one page.
 *
 * @param {string} path - the route path, built by paths.js.
 * @param {object} handlers
 * @param {Function} handlers.get - renders the page.
 * @param {Function} [handlers.post] - handles the page's form; omit it on a
 * page with no form.
 * @param {object} [options] - the Hapi route options for both routes; a page
 * whose path carries a parameter passes its own so the parameter is
 * validated before the handler runs.
 * @returns {object[]} the Hapi routes.
 */
export const pageRoutes = (path, { get, post }, options = routeOptions) => [
  { method: 'GET', path, options, handler: get },
  ...(post ? [{ method: 'POST', path, options, handler: post }] : [])
]
```

### E24. `src/server/router.js` — full replacement (Write)

```js
import inert from '@hapi/inert'

import { health } from './health/index.js'
import { importNotificationService } from './app/routes.js'
import { signout } from './signout/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      await server.register([health])

      if (config.get('auth.enabled')) {
        await server.register([importNotificationService, signout])
      }

      await server.register([serveStaticFiles])
    }
  }
}
```

`router.test.js` is untouched: its "address-book routes are not registered when auth is disabled" test now proves
the gate over `allRoutes`.

### E25. `src/server/signout/index.js` — full replacement (Write; D4)

```js
import { signoutController } from './controller.js'
import { routeOptions } from '../app/shared/kit.js'

export const signout = {
  plugin: {
    name: 'signout',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/signout',
          handler: signoutController.handler,
          options: routeOptions
        }
      ])
    }
  }
}
```

(The "Sets up the routes used in the /signout page" comment goes — it described what the file visibly does.)

### E26. `src/config/nunjucks/nunjucks.js` — the temporary Vision root goes (s05 D9)

One line: `    path: ['server/app', 'server/app/features', 'server'],` → `    path: ['server/app', 'server/app/features'],`.
The environment roots are already `[govuk, common/components, app, app/features]` and stay. Every view name now
resolves through `app` (`shared/error`, `auth/unauthorised`) or `app/features` (`dashboard/template`,
`address-book/<page>/template`).

### E27. `playwright.config.js`

One line: `  testDir: './src/server',` → `  testDir: './src/server/app/features',`. `testMatch: '**/*.fit.spec.js'`
stays, so the dashboard's one spec and the address book's five are the whole suite, as today.

### E28. `src/server/app/features/dashboard/fit/dashboard.fit.spec.js`

One import path: `} from '../../../../address-book/fit/address-form.js'` → `} from '../../address-book/fit/address-form.js'`
(from `features/dashboard/fit/`, two `..` reach `features/`). Every test is untouched.

### E29. `src/server/app/features/dashboard/view-model/notification-dashboard-helper.test.js`

One comment line names the deleted file: `    // address-book-helper.js's buildAddressBookQueryString convention.`
→ `    // the address book's buildAddressBookQueryString convention.`. Nothing else.

### E30. `src/server/app/services/address-book/index.js` (D12)

Append after `mapApiErrorsToFormErrors`:

```js
export const isValidationFailure = (err) =>
  err?.status === HTTP_STATUS_BAD_REQUEST && Boolean(err.body?.errors)
```

and add `import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'` after the `mode.js` import (before the
`./client.js` import). The client attaches exactly this shape on a 400 (`validationFailure` in `client.js`).

### E31. `src/server/app/services/address-book/address-book.test.js` (D12)

Two edits. In `describe('the public surface')`, the expected key list becomes (sorted):

```js
    expect(Object.keys(addressBook).sort()).toEqual([
      'createAddress',
      'deleteAddress',
      'getAddress',
      'isValidationFailure',
      'listAddresses',
      'mapApiErrorsToFormErrors',
      'updateAddress'
    ])
```

and its test name becomes `'Should expose the five address operations, the error mapper and the validation-failure predicate, nothing else'`.
After the `#mapApiErrorsToFormErrors` describe, add:

```js
describe('#isValidationFailure', () => {
  test('Should recognise the 400 the client raises with field errors', () => {
    expect(
      addressBook.isValidationFailure({
        status: 400,
        body: { errors: { email: ['Enter an email address'] } }
      })
    ).toBe(true)
  })

  test('Should refuse any other failure, including a 400 without field errors', () => {
    expect(addressBook.isValidationFailure({ status: 400, body: {} })).toBe(
      false
    )
    expect(
      addressBook.isValidationFailure({ status: 500, body: { errors: {} } })
    ).toBe(false)
    expect(addressBook.isValidationFailure(undefined)).toBe(false)
  })
})
```

### E32. `src/server/app/shared/kit.test.js` (D3)

Inside `describe('#pageRoutes')`, after the "GET and POST pair" test and before "names the session strategy", add:

```js
  it('Should apply the route options a page supplies to both routes', () => {
    const options = { ...routeOptions, validate: { params: {} } }

    expect(
      pageRoutes('/address-book/{id}/edit', { get, post }, options)
    ).toEqual([
      {
        method: 'GET',
        path: '/address-book/{id}/edit',
        options,
        handler: get
      },
      {
        method: 'POST',
        path: '/address-book/{id}/edit',
        options,
        handler: post
      }
    ])
  })
```

Thirteen tests (was twelve).

### E33. `src/server/app/routes.test.js` — full replacement (Write; D3, invariant 1)

```js
import { describe, expect, it } from 'vitest'

import { allRoutes } from './features/index.js'
import { addressIdParams } from './features/address-book/address-id-params.js'

describe('promoted route authentication', () => {
  it('Should name the session strategy on every promoted route', () => {
    expect(allRoutes).not.toHaveLength(0)

    for (const route of allRoutes) {
      expect(route.options).toMatchObject({ auth: 'session' })
    }
  })

  it('Should promote every public page of the service, and nothing else', () => {
    expect(allRoutes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'GET /',
      'GET /address-book',
      'GET /address-book/add',
      'POST /address-book/add',
      'GET /address-book/{id}',
      'GET /address-book/{id}/edit',
      'POST /address-book/{id}/edit',
      'GET /address-book/{id}/delete',
      'POST /address-book/{id}/delete'
    ])
  })

  it('Should validate the address id on every route that carries one', () => {
    const routesWithId = allRoutes.filter((route) =>
      route.path.includes('{id}')
    )

    expect(routesWithId).toHaveLength(5)
    for (const route of routesWithId) {
      expect(route.options.validate.params).toBe(addressIdParams)
    }
  })
})
```

Three tests (was two).

### E34. Nothing else

`src/server/server.js`, `src/server/auth/*`, `src/server/health/*`, `src/config/nunjucks/context/*`,
`src/config/nunjucks/globals/*`, `src/plugins/*`, `src/server/common/helpers/{errors,organisation-id,logging/*,…}`,
`src/server/app/shared/{paths,paths.test,layout.njk,error.njk,error-summary.njk}`, `src/server/app/routes.js`,
`src/server/app/features/dashboard/{controller,controller.test,template.njk}`, `src/server/app/services/{countries,ins-backend}/*`,
`src/server/app/services/address-book/{client,stub}.js`, `src/client/*`, `test-helpers/component-helpers.js`,
`vite.config.js`, `vitest.config.js`, `eslint.config.js`, `sonar-project.properties`, `README.md` — untouched.

---

## 3. New files — full content

### N1. `src/server/app/features/index.js` — plants' barrel with one entry per page (Write)

```js
import * as dashboard from './dashboard/controller.js'
import * as addressBookList from './address-book/list/controller.js'
import * as addressBookAdd from './address-book/add/controller.js'
import * as addressBookView from './address-book/view/controller.js'
import * as addressBookEdit from './address-book/edit/controller.js'
import * as addressBookDelete from './address-book/delete/controller.js'

export const allRoutes = [
  ...dashboard.routes,
  ...addressBookList.routes,
  ...addressBookAdd.routes,
  ...addressBookView.routes,
  ...addressBookEdit.routes,
  ...addressBookDelete.routes
]
```

(This replaces the two-line s05 file; the order is today's plugin registration order and is what E33 pins. Hapi
routes by specificity, not order, so `/address-book/add` still beats `/address-book/{id}`.)

### N2. `src/server/app/features/address-book/success-banner.js` (D5)

```js
const SESSION_KEY = 'addressBookSuccess'

export const setSuccessBanner = (request, message) =>
  request.yar.set(SESSION_KEY, message)

export const takeSuccessBanner = (request) =>
  request.yar.get(SESSION_KEY, true)
```

No unit test of its own: the add, edit and delete Playwright specs each assert the banner text on the list page
after the redirect, and the list controller test boots the real server with yar registered.

### N3. `src/server/app/features/address-book/stored-address.js` (D11)

```js
import Boom from '@hapi/boom'

import { getAddress } from '../../services/address-book/index.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'

export const loadStoredAddress = async (orgId, id) => {
  const address = await getAddress(orgId, id)
  if (address.deleted) {
    throw Boom.notFound()
  }
  return address
}

export const boomFor = (err, logUnexpected) => {
  if (err.isBoom) {
    return err
  }
  if (err.status === HTTP_STATUS_NOT_FOUND) {
    return Boom.notFound()
  }
  logUnexpected()
  return Boom.internal()
}
```

No unit test of its own: every branch is pinned through the controllers — tombstone → 404 (edit, view, delete GET
and delete POST tests), client 404 → 404 (all four), malformed id → 404 before the handler (view), and the
unexpected path → 500 by a nock 503 on the address-book API in view GET, edit GET, delete GET and delete POST (the
same shape as list's "returns 500 when the address book cannot be reached"; `errors.test.js` pins only `catchAll`
and a synthetic `/test/programming-error` route and never reaches this module).

### N4. `src/server/app/features/address-book/view-model/` — directory only

Holds `list.js` and `list.test.js` from E21/E22 (the `git mv` of `address-book-helper.js` creates it).

---

## 4. Imports — the rule

1. **Relative, shortest path** (s02 D1). The prefixes this stage needs:
   - from `src/server/app/features/address-book/` (feature root): `'../../shared/…'`, `'../../services/…'`,
     `'../../lib/…'`, `'../../../common/…'`
   - from `src/server/app/features/address-book/<page>/`: `'../../../shared/…'`, `'../../../services/…'`,
     `'../../../lib/…'`, `'../../../../common/…'`, `'../../../../server.js'`, `'../../../../../config/…'`,
     `'../../../../../auth/…'`, and the group's own modules as `'../fields.js'`, `'../address-countries.js'`,
     `'../address-id-params.js'`, `'../stored-address.js'`, `'../success-banner.js'`, `'../view-model/list.js'`
   - from `src/server/app/features/address-book/view-model/`: `'../../../shared/paths.js'`
   - from `src/server/app/features/address-book/fit/`: only `'./…'` (nothing outside the folder)
   - from `src/server/app/features/dashboard/fit/`: `'../../address-book/fit/address-form.js'`
   - from `src/server/app/features/`: `'./address-book/<page>/controller.js'`
   - from `src/server/signout/`: `'../app/shared/kit.js'`
   - from `src/server/app/services/address-book/`: `'../../lib/http-status.js'`
2. **Feature code imports the kit as a namespace** — `import * as kit from '../../../shared/kit.js'` and
   `kit.base(…)`, `kit.pageRoutes(…)`, `kit.requireOrganisationId(…)` — exactly as plants' controllers do. Chassis
   code (`errors.js`, `signout/index.js`) and `address-id-params.js` import the names they use.
3. **Every href and every route path comes from `paths.js`.** No controller, template, view-model or fixture writes
   `/address-book` by hand; `viewLink` in the list controller uses `addressPath(address.id)`. §6C proves it.
4. **View names**: `'address-book/<page>/template'` resolve through the `app/features` Vision root, the same way
   `'dashboard/template'` does. The `server` root is gone (E26).
5. **No `vi.mock` of anything under `src/server/app/`** and no new module-boundary mock anywhere (invariant 8). The
   only `vi.mock` calls in touched tests are `get-oidc-config.js` (server-booting tests, as today) and the two the
   dashboard helper test and the address-book service test already carry.
6. **Nothing under `src/server/common/` imports from a feature**, and the dashboard feature does not import from the
   address-book feature except the fit fixture (D20).

---

## 5. Tests

### Tests that move unchanged in substance

| File | Tests | Pins |
|---|---|---|
| `features/address-book/list/controller.test.js` (E6) | 9 | The list through the real server behind nock: rows with the resolved country name and the `View <name>` link (now built by `addressPath`), the empty state, numbered pagination and the `?page=2` href, the clear-search link present only after a search, the country-name → `countryCode` resolution forwarded to the API, the no-results state, pagination carrying `q` and `countryCode`, the 500 page. Now also proves `kit.pageRoutes` registers `GET /address-book` under the app plugin, the `app/features` Vision root resolves the moved template, and the `listHref`/`addHref` view-model keys render the same URLs the template used to hard-code. |
| `features/address-book/add/controller.test.js` (E7) | 6 | The add form renders every field group and the country options; the API's 400 re-renders with its messages (now via `isValidationFailure`); a valid POST creates and redirects to `/address-book`; joi refusal re-renders at 400 with the summary; Cancel redirects without creating. |
| `features/address-book/edit/controller.test.js` (E8) | 7 | Prefill from the stored record (now `formValuesOf(address)`), 404 on a missing or soft-deleted address (now `loadStoredAddress`), the API's 404 on PUT, a valid PUT redirects with the banner, joi refusal at 400, Cancel. |
| `features/address-book/view/controller.test.js` (E9) | 6 | `buildRows` labels and values, the country-code fallback; the page through the server with Edit and Delete hrefs (now `editHref`/`deleteHref`), 404 for missing, malformed (route validation before the handler — proves D3's `addressIdRouteOptions` reached the route) and soft-deleted ids. |
| `features/address-book/delete/controller.test.js` (E10) | 7 | Confirmation page names the address; 404 for missing/soft-deleted on GET and POST; the API's 404 on DELETE; Cancel returns to the address; Confirm deletes with the organisation header and redirects with the banner. |
| `features/address-book/address-countries.test.js` (E18) | 6 | GB-first ordering, the empty-list refusal, select items, option binding, the search-term resolution. |
| `features/address-book/address-id-params.test.js` (move) | 2 | The 24-hex pattern and its message. |
| `features/address-book/fit/*.fit.spec.js` (move) | 43 (Playwright) | Every address-book browser journey, unchanged. |
| `features/dashboard/fit/dashboard.fit.spec.js` (E28) | 6 (Playwright) | Unchanged; proves the moved fixture import. |

### Tests that are rewritten

| File | Tests | Pins |
|---|---|---|
| `features/address-book/fields.test.js` (E16) | 10 (was 7 + 1 in two files) | The schema's acceptance and refusals verbatim; `FIELD_RULES` parity with the Java Bean Validation; **new**: `formValuesOf()` is the blank form in `FIELDS` order, `formValuesOf(address)` picks the nine fields and blanks the missing ones; `formatValidationErrors` verbatim from `validation-helpers.test.js`. |
| `features/address-book/view-model/list.test.js` (E22) | 11 (was 9) | The address line; the results label and its null; the query string; pagination items, current page and the `/address-book` previous href; search terms carried through hrefs; **new**: `null` for a single page, `previous` absent on the first page and `next` absent on the last, a page past the end clamps to the last page. `buildFullAddress`'s test goes with the function (D9). |
| `app/routes.test.js` (E33) | 3 (was 2) | Every promoted route names the session strategy; the promoted set is exactly the nine public routes in order (invariant 1 as a test); **new**: the five `{id}` routes validate with `addressIdParams`. |
| `services/address-book/address-book.test.js` (E31) | +2 | The public-surface pin gains `isValidationFailure`; the predicate accepts the client's 400-with-errors shape and refuses a 400 without errors, a 500 with errors, and `undefined`. |
| `app/shared/kit.test.js` (E32) | 13 (was 12) | **new**: supplied route options land on both the GET and the POST. |

### Tests that are deleted

`common/helpers/validation-helpers.test.js` (its one test lives in `fields.test.js`) and, by rewrite, the
`buildFullAddress` test in the old helper test.

### Arithmetic

Baseline 51 files / 273 tests. Moved files keep their counts (9 + 6 + 7 + 6 + 7 + 6 + 2 = 43). `fields.test.js`
replaces two files (7 + 1) with 10: +2 tests, −1 file. `list.test.js` replaces the helper test (9) with 11: +2.
`routes.test.js` +1, `kit.test.js` +1, `address-book.test.js` +2, `{id}`-page 503 → 500 tests +4 → **285**. Files: 51 − 1 = **50**. If
`Tests  285 passed (285)` / `Test Files  50 passed (50)` is not what the log says, a test was lost or gained — find
it before going on. Playwright: 49 (43 address-book + 6 dashboard; none added or dropped).

---

## 6. Invariants to prove

Every command is one Bash call; test output goes to a file under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/` that is read once with the Read tool.

**Order of work.** §1 (mkdir, moves, deletes, rmdir), then §3 (new files), then §2 (edits, E1–E33), then
`npm run format`, then the ladder. There is no useful intermediate green — the suite cannot pass while `router.js`
still imports the deleted plugins or `kit.js` the deleted constant. The first `npm test` read is the canary: a
`Cannot find module` names an import prefix from §4; a `Template render error … template not found` names a view
name or the Vision path (E26); a lint `no-unused-vars` names an import a rewritten controller no longer needs
(`Boom` is used only by `edit/controller.js` and `stored-address.js`; `statusCodes` by no controller). Fix it and
run once more.

**A. Ladder** (four rungs, in order). Run `format` first, then the rungs:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s06-format-fix.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format:check > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s06-format.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run lint > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s06-lint.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend test > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s06-test.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run test:fit > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s06-fit.log 2>&1
```

`s06-test.log` must show `Test Files  50 passed (50)` and `Tests  285 passed (285)`. `s06-fit.log` must show
`49 passed`. On a Playwright failure read `test-results/*/error-context.md` inside the repo, not the log tail. The
fit suite is the only check that boots the app under plain `node .`, renders every moved template through the
two-root Vision path, exercises the success banner end to end (add, edit, delete → list) and proves the new
`testDir` picks up both features' specs — `49 passed` is the proof that nothing was silently dropped.

**B. Invariants 2/6 — no old name or path survives.** Must return nothing:

```
grep -rn -e "server/address-book" -e "session-keys" -e "session-helpers" -e "validation-helpers" -e "pagination-helper" -e "address-book-helper" -e "address-schema" -e "session-auth-route-options" -e "sessionAuthRouteOptions" -e "sessionKeys" -e "getSessionValue" -e "setSessionValue" -e "buildFullAddress" -e "addressBookList\b.*plugin" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/test-helpers ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/playwright.config.js
```

No trace-id locals in any feature (D15) — must return nothing (the three `services/*/client.js` files call
`getTraceId()` legitimately and are outside this grep):

```
grep -rn "traceId\|getTraceId" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features
```

No `index.js` plugin and no `index.njk` left in the feature — must return nothing:

```
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features/address-book -name "index.*"
```

**C. Invariant 1 — public URL surface unchanged.** Three checks.

The route-literal grep (s05 §6C's pattern) loses its eight address-book lines for good — the set must be exactly:
`/auth/stub-sign-in`, `/auth/sign-in`, `/auth/sign-in-oidc`, `/auth/sign-out`, `/auth/sign-out-oidc`,
`/auth/organisation`, `/health`, `/signout`, `/favicon.ico`, `'.'` (serve-static-files' directory path, not a
route), plus the cookie `path: '/'` in `src/plugins/auth.js`. Nothing else:

```
grep -rn "path: '" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/plugins --include="*.js" --exclude="*.test.js" --exclude="*.spec.js"
```

The literal `/address-book` appears in **`src/server/app/shared/paths.js` only** (nine lines) among non-test
source — every other hit is a test or a fit spec asserting a URL, which is what they are for:

```
grep -rn "/address-book" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src --include="*.js" --exclude="*.test.js" --exclude="*.spec.js"
```

and no template writes it — must return nothing:

```
grep -rn "/address-book" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src --include="*.njk"
```

The surface itself is `app/routes.test.js`'s nine-route list (E33), `paths.test.js`'s URL list (unchanged from
s05) and the 43 address-book Playwright specs navigating to every one of those URLs (§6A). Record in the stage's
notes that from here the `path: '` grep covers the chassis only and `app/routes.test.js` is the app's surface.

**D. Every page template extends the shared layout.** Must list exactly nine lines — eight
`{% extends "shared/layout.njk" %}` (dashboard, error, unauthorised, and the five address-book `template.njk`s at
their new paths) and the layout's own `{% extends "govuk/template.njk" %}`:

```
grep -rn "extends" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server --include="*.njk"
```

**E. Invariants 6/7 — the diff is exactly this stage.** `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend add -A`
then `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached -M --name-status > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s06-name-status.log`
and read it once. It must list only these paths (git decides which moves render as `R` and which as `D` + `A` — chase
the path set, not the letter):

```
moved:    src/server/address-book/{list,add,edit,view,delete}/controller.js       -> src/server/app/features/address-book/<page>/controller.js
          src/server/address-book/{list,add,edit,view,delete}/controller.test.js  -> src/server/app/features/address-book/<page>/controller.test.js
          src/server/address-book/{list,add,edit,view,delete}/index.njk           -> src/server/app/features/address-book/<page>/template.njk   (add must be R100)
          src/server/address-book/address-schema.js                              -> src/server/app/features/address-book/fields.js
          src/server/address-book/address-schema.test.js                         -> src/server/app/features/address-book/fields.test.js
          src/server/address-book/address-countries.js                           -> src/server/app/features/address-book/address-countries.js
          src/server/address-book/address-countries.test.js                      -> src/server/app/features/address-book/address-countries.test.js
          src/server/address-book/address-id-params.js                           -> src/server/app/features/address-book/address-id-params.js
          src/server/address-book/address-id-params.test.js                      -> src/server/app/features/address-book/address-id-params.test.js  (must be R100)
          src/server/address-book/fit/{add,delete,edit,list,view}.fit.spec.js     -> src/server/app/features/address-book/fit/…                  (must be R100)
          src/server/address-book/fit/seed-address.js                            -> src/server/app/features/address-book/fit/seed-address.js    (must be R100)
          src/server/address-book/fit/address-form.js                            -> src/server/app/features/address-book/fit/address-form.js
          src/server/common/helpers/address-book-helper.js                       -> src/server/app/features/address-book/view-model/list.js
          src/server/common/helpers/address-book-helper.test.js                  -> src/server/app/features/address-book/view-model/list.test.js
deleted:  src/server/address-book/{list,add,edit,view,delete}/index.js
          src/server/common/helpers/{validation-helpers,validation-helpers.test,pagination-helper,session-helpers}.js
          src/server/common/constants/{session-keys,session-auth-route-options}.js
added:    src/server/app/features/address-book/{success-banner,stored-address}.js
edited:   src/server/app/features/index.js
          src/server/app/shared/{kit,kit.test}.js
          src/server/app/routes.test.js
          src/server/app/services/address-book/{index,address-book.test}.js
          src/server/app/features/dashboard/fit/dashboard.fit.spec.js
          src/server/app/features/dashboard/view-model/notification-dashboard-helper.test.js
          src/server/router.js
          src/server/signout/index.js
          src/config/nunjucks/nunjucks.js
          playwright.config.js
```

Read the full diff once (`git -C … diff --cached > …/logs/s06-full-diff.log`) and check no hunk outside §1–§3
exists: no "was previously" / "renamed from" / "moved from" wording, no comment added that this plan does not show,
no edit to `server.js`, `auth/controller.js`, `paths.js`, `layout.njk`, `errors.js`, the dashboard controller or
template, `vite.config.js` or `component-helpers.js`. Every string literal in the five controllers must be one the
old controller carried (compare against `git -C … show HEAD:src/server/address-book/<page>/controller.js` if in
doubt).

**F. Invariant 4 — no cross-repo import.** Must return nothing:

```
grep -rn "from '.*trade-imports-\(animals\|plants\)" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```

**G. Invariant 5 — copy files.** s07 has not run. This stage moves **no** user-facing string into JS and creates
none: the page titles, the three banner messages, the four "Something went wrong…" texts, the joi messages and the
`buildRows` labels are the literals the old files carried, in the same modules' successors; every template string
stays where it was. `'There is a problem'` is still in the five templates and in `kit.js` (s05 D5) for s07 to
collect.

**H. Invariant 8 — the module boundary is not mocked.** Must return nothing:

```
grep -rn "vi.mock(.*app/" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```

**I. The old folders are gone and the new tree is the target's.** The first must return nothing; the second must
list exactly `app`, `auth`, `common`, `health`, `signout`; the third must list exactly `address-book`, `dashboard`;
the fourth must list exactly `add`, `delete`, `edit`, `fit`, `list`, `view`, `view-model`; the fifth exactly
`status-codes.js`:

```
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server -maxdepth 1 -type d -name address-book
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server -mindepth 1 -maxdepth 1 -type d
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features -mindepth 1 -maxdepth 1 -type d
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features/address-book -mindepth 1 -maxdepth 1 -type d
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/constants -type f
```

**J. The Vision path and the Playwright testDir are the journeys'.** Each must print exactly one line:

```
grep -n "path: \[" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/config/nunjucks/nunjucks.js
grep -n "testDir" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/playwright.config.js
```

— `path: ['server/app', 'server/app/features'],` and `testDir: './src/server/app/features',`.

**K. Every controller ends with a `routes` export built by the kit.** Must print exactly six lines (dashboard + five):

```
grep -rn "^export const routes = kit.pageRoutes" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features
```

(prettier may wrap the three-argument calls across lines — the `export const routes = kit.pageRoutes(` prefix is
still on one line.)

---

## 7. Commit

Stage everything (`git -C … add -A`), then commit on `feat/NO_JIRA-frontend-alignment`:

```
refactor(alignment): s06-address-book-feature — move the address book into app/features with the group anatomy

The address book becomes src/server/app/features/address-book in
plants' multi-page group shape: list/, add/, edit/, view/ and delete/
each hold controller.js and template.njk, every controller exports
routes built by kit.pageRoutes from paths.js, and features/index.js
spreads them into allRoutes in place of the five Hapi plugins.
address-schema.js becomes fields.js (with FIELDS, formValuesOf and the
joi error adapter); the pagination, session-banner and validation
helpers fold into the feature (view-model/list.js, success-banner.js,
stored-address.js) and leave common/. kit.pageRoutes takes the route
options a parameterised page needs; routeOptions is inlined and the
session-auth constant deleted. The temporary third Vision root goes;
Playwright's testDir is src/server/app/features so both features'
specs run.
```

plus the required trailers. Do not push to `main`; do not merge.

---

## 8. Out of scope — leave alone even though it is tempting

- **Copy.** No string moves into a `copy.en.js`/`copy.cy.js`, no `copy/` folder, no `sharedCopy` argument, no
  `copy.title` — s07. The `'There is a problem'` literal stays in the five templates and in `kit.js`.
- **The error-summary switch** (`kit.errorSummary`, `shared/error-summary.njk`, `kit.fieldError`, a `field → message`
  error map) — s08 (D16). The templates keep `errorList` + `fieldErrors` and their inline `govukErrorSummary`.
- **joi.** `buildAddressSchema`, `addressIdParams` and `formatValidationErrors` are moved, not rewritten — s08
  replaces them with `app/lib/validate`. Do not derive the joi `.max()` values from `FIELD_RULES`.
- **`recoverableSave()`** and any predicate for it — s08 alongside the validation rewrite (s05 D6 pointed here; the
  error-model change it needs is D16's).
- **The layout** — it still does not render `backLink`, so the three templates keep their own `govukBackLink` — s09.
  Do not add `contentColumnClass`, the phase banner, or rename `content`.
- **Template markup and strings**, the `data-testid`s, the `govukTable` columns, the `appHeading` macro — s07/s09.
  Only the hrefs named in E11–E14 change.
- **The dashboard feature** beyond E28/E29: its `listGet` name, `statusCodes` import, `function` declarations and
  `notification-dashboard-helper.js` name — s07.
- **The fit fixture's shape** (`signIn` and the axe helper inside `address-form.js`, imported by the dashboard spec)
  — D20; note it for s11/s13, do not split it.
- **`src/server/auth/controller.js`**, `signout/controller.js`, `server.js`, `context.js` — untouched.
- **`common/constants/status-codes.js`** — stays for the chassis and the tests (D14).
- **`src/server/common/README.md`**, `common/templates/partials/README.md`, `test-helpers/component-helpers.js`,
  `vite.config.js` — s10/s11.
- **`app/docs/`** — s11 writes the ins feature anatomy doc; do not start it here.
- **The two journey repos** — this stage touches `ins` only.
- Any comment tidy-up, identifier rename, import reordering or blank-line change beyond §1–§3.

---

## 9. Behaviour changes (named, per invariant 2)

1. **The address-book log lines no longer carry an explicit `traceId` field** (`{ err, orgId }` / `{ err, orgId, id }`
   instead of `{ err, traceId, orgId, id }`). `logger-options.js`'s mixin stamps `trace.id` on every line, so the
   trace is still in the log; only the duplicate field goes (D15).
2. **The nine address-book routes are registered by the `import-notification-service` plugin** instead of five
   per-page plugins, with the same `auth: 'session'`, the same `{id}` validation and the same `auth.enabled` gate.
   Same URLs, same handlers, same responses.
3. **The edit POST's joi-error re-render no longer refetches the country list** — it renders with the list the POST
   already fetched (D18). One fewer reference-data call on a refused edit; the rendered options are the same.
4. **A view that fails to load an address logs and answers 500 through `boomFor`** exactly as the four old catch
   blocks did; the order of checks (Boom → 404 → log + 500) is unchanged.
5. **The list view model no longer carries `addresses`, `paginationMeta`, `countryCode` or (on the `{id}` pages)
   `id`** — keys no template read (D13, D19) — and gains `listHref`/`addHref`/`editHref`/`deleteHref`/`backLink`,
   which render the same URLs the templates hard-coded.
6. **The success banner reads `undefined` rather than `null` when there is none** (`request.yar.get` directly,
   without the dead `request.yar` guard). `{% if successBanner %}` treats both alike.
7. **The pagination model drops its `results` object** (`{ from, to, count }`), which `govukPagination` never read;
   `buildResultsLabel` still renders the range text (D7).

Deviations from the brief's wording, each with its reason in §0: `controller.js` rather than plants'
`<page>.controller.js` (D1); the session helpers, validation helper and pagination helper fold into the feature
rather than staying in `common/` (D5–D7, handed here by s05); `session-keys.js` becomes `success-banner.js` with the
yar calls beside the key (D5); `address-book-helper.js` becomes `view-model/list.js` (D8). Nothing user-visible
changes for a signed-in trader in either mode: the route surface (§6C), the stub seeds, the address-book flows and
the dashboard render as before, and the fit suite (§6A) proves it.
