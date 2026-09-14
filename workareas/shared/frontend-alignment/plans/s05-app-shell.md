# s05-app-shell — add `app/shared`, `app/routes.js` and the dashboard feature

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit/Write tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (checked out, level with `origin`, clean tree, HEAD `f6405bf`).

Reference files (journey frontends). Animals and plants are byte-identical for every file named here except `kit.js`
(plants exports `sharedCopy`; animals keeps it private — plants' spelling is used):

- `repos/trade-imports-animals-frontend/src/server/app/shared/kit.js` — `errorSummary` (lines 64–91), `fieldError`
  (93–94), `base` (122–155), `pageRoutes` (184–197). Everything else in that file is journey machinery and stays
  there.
- `repos/trade-imports-animals-frontend/src/server/app/shared/paths.js` — one exported arrow per path; a `*Path()`
  builder for links and a `*RoutePath()` builder for the Hapi route string where a parameter is involved.
- `repos/trade-imports-animals-frontend/src/server/app/routes.js` — one Hapi plugin named for the service that
  calls `server.route(allRoutes)` (line 78).
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/index.js` —
  `import * as dashboard from './dashboard/controller.js'` and `export const allRoutes = [...dashboard.routes]`.
- `repos/trade-imports-animals-frontend/src/server/router.js` — registers the app plugin (line 20).
- `repos/trade-imports-animals-frontend/src/config/nunjucks/nunjucks.js` — the `app` + `app/sets` root pair in
  both the environment (lines 15–17) and Vision's `path` (line 44).
- `repos/trade-imports-animals-frontend/src/server/common/helpers/organisation-id.js` — copied **verbatim**.
- `repos/trade-imports-animals-frontend/src/server/common/helpers/errors.js` — copied **verbatim** (it imports
  `base` from `../../app/shared/kit.js` and renders `shared/error`).
- `repos/trade-imports-animals-frontend/src/server/common/helpers/errors.test.js` — the `#catchAll` describe
  shape (`expectedContext` with `objectContaining`, the non-Boom test) and the programming-error route.
- `repos/trade-imports-animals-frontend/src/server/app/shared/error-summary.njk` — copied **verbatim**.
- `repos/trade-imports-animals-frontend/src/server/app/routes.test.js` — the "every promoted route" pin.
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/dashboard/controller.js`
  — a feature controller: named handler arrows, `const view = …`, `export const routes = …` at the foot, view model
  spread from `kit.base(...)`.

Baseline (s04's landed ladder on `f6405bf`, `logs/s04-ci-fix-test.log` / `logs/s04-fit.log`): unit suite
**48 files / 253 tests green**, `format:check` clean, `lint` clean, Playwright **49/49** green.
Expected after this stage: **51 files / 273 tests** (§5 arithmetic), Playwright still **49/49**.

This stage gives ins the journeys' level-1 shape: `src/server/app/{routes.js, shared/, features/, auth/}` with the
dashboard as the first feature, the shared layout and error page under `app/shared`, one Hapi plugin for the app
registered by `router.js`, and the Nunjucks roots pointed at `app` + `app/features`. No journey machinery comes
across (no engine, flow, model, bridge, sets, copy, section captions, surfaces, journey strip, date fields,
stale-action redirects). The address book stays at `src/server/address-book/` and keeps working through a third
Vision root that s06 removes. 9 files move, 2 are rewritten in place, 1 is deleted, 8 are created, 16 are edited
(plus the edits the moved files receive as they land).

---

## 0. Decisions (made here so the implementor never has to choose)

| # | Question the brief left open | Decision |
|---|---|---|
| D1 | `kit.routeOptions`: animals' `{}` (inherit the server default strategy) or ins's explicit `auth: 'session'`? | **Explicit.** `export const routeOptions = sessionAuthRouteOptions` (imported from `common/constants/session-auth-route-options.js`, so there is one truth until s06 deletes that constant and inlines the literal). Every ins route names its strategy today; keeping that is zero behaviour change and defence in depth. `app/routes.test.js` pins it ("names the session strategy" — the inverse of animals' pin, on purpose). |
| D2 | `pageRoutes` signature. | `pageRoutes(path, { get, post })` where `path` is the finished route **string** the feature gets from `paths.js` (`dashboardPath()`, later `addressEditRoutePath()`), not a page object. POST is emitted **only when `post` is supplied** — the dashboard has no form, and an unreachable POST route with an undefined handler would make Hapi refuse to start. Same `routeOptions` on both. |
| D3 | `paths.js` — which builders get a `*RoutePath()` twin? | Only the three that carry `{id}`: `addressRoutePath()`, `addressEditRoutePath()`, `addressDeleteRoutePath()`. For `dashboardPath()`, `addressBookPath()`, `addressAddPath()` the link string **is** the route string, exactly as plants uses `dashboardPath()` and `createPath()` as route paths. Ids are `encodeURIComponent`-ed in the link builders (the list template already does this by hand; the view/edit/delete templates do not, but their ids are route-validated 24-hex so nothing visible changes). No `BASE` constant — it is the journeys' `/notifications` mount point. |
| D4 | `base()` shape before s07/s09. | `{ layout: 'shared/layout.njk', pageTitle, backLink, sharedCopy, recoverableError }` — the five keys the brief names. `sharedCopy` is `export const sharedCopy = {}` (plants exports it; s07 fills it). `layout` is a module constant `LAYOUT = 'shared/layout.njk'` (plants' `LAYOUT` value, without the journey-flow indirection). No `caption`, `hubHref`, `journeyStrip`, `concurrencyToken`, `contentColumnClass` — journey/s09. |
| D5 | `errorSummary()` needs a title; the copy pair does not exist until s07. | A module constant `ERROR_SUMMARY_TITLE = 'There is a problem'` in `kit.js` — the exact string the five address-book templates and the dashboard template already pass to `govukErrorSummary`. This is the **only** user-facing string this stage puts into JS; it is named in §9 so s07 moves it into `copy.en.js`/`copy.cy.js` with the rest. Nothing calls `errorSummary()` in s05 (the templates keep rendering their own summaries); `kit.test.js` pins its shape so s06/s08 can switch over. |
| D6 | `recoverableSave()` — the brief lists it as journey-free. | **Deferred to s06.** Its `isRecoverableBackendError` predicate is a Symbol marker set by animals' persistence records client (`services/persistence/records/errors.js`) — service-layer machinery ins has no equivalent of — and its `STALE_CONCURRENCY_TOKEN` branch is journey-only. Porting it now means inventing a predicate that nothing calls; s06 moves the address-book save flows and can define it against ins's real client errors (`status` from `http-client.js`'s `throwOnError`). Recorded in the stage's notes. |
| D7 | "primes countries in real mode" — ins's countries service has no `prime()`. | **No priming.** ins fetches the country list per request (s04 kept that deliberately; its §8 names `prime()` as journey machinery). Adding a cache filled at boot is a behaviour change — a reference-data outage would stop the server starting (the workspace memory records exactly that failure mode), every real-mode controller test would need an interceptor before `createServer()`, and `getCountries()`'s per-call semantics would change. `app/routes.js` therefore only registers `allRoutes`; `register` is synchronous. Recorded in the stage's notes as a deviation from the brief's wording, and flagged for the s13 report as a chassis difference (journeys prime at boot, ins fetches per request). |
| D8 | `pagination-helper.js` — the brief moves it into `features/dashboard/view-model/`, but `common/helpers/address-book-helper.js` imports it too. | **It stays in `common/helpers/` for the address book; the dashboard's pagination is folded into its own `view-model/notification-dashboard-helper.js`** (E14) in plants' shape (plants' `notification-helper.js` owns `normalizePageNumber`/`buildPaginationLinks`/`buildPageResultsRange` inside the feature). Moving the file would force either a cross-feature import (`common/helpers` → `features/dashboard`, the layering inversion the workspace bans — feature folders are independent by design) or a copied file, and an 86-line copy trips SonarCloud's new-duplication gate (s01's lesson: >3% of new lines fails the PR). The fold-in is written functionally so it shares no 10-line token run with the generic helper; its 18 existing tests pin every href, label and item. `pagination-helper.js` loses only the sentence in its header that names the dashboard (E15); s06 folds it into the address-book feature and deletes it. |
| D9 | Vision `path` after the roots change: the address-book templates are still at `src/server/address-book/*/index.njk` with view names `address-book/<page>/index`. | Nunjucks environment roots become `[govuk, common/components, app, app/features]` (animals' pair; the `common/templates` root goes with the layout). Vision's `path` becomes `['server/app', 'server/app/features', 'server']` — the **third** entry exists only so `h.view('address-book/list/index')` still resolves, and **s06 removes it** when the address book moves. Order matters: `auth/unauthorised` must hit `server/app/auth/unauthorised.njk` first. |
| D10 | The app plugin's name. | `export const importNotificationService = { plugin: { name: 'import-notification-service', … } }` — the service is the Import Notification Service, and animals/plants name theirs `liveAnimals`/`'live-animals'`, `highRiskPlants`/`'high-risk-plants'`. |
| D11 | `router.js` shape: plants registers the app plugin unconditionally and gates only `signout`; s01 D5 kept ins's `auth.enabled` gate over everything but health. | **Keep the gate** (s01 D5 handed route shape to this stage; the gate is load-bearing for ins — with auth disabled there is no `session` strategy, so an explicitly-authed route would make Hapi throw at registration and an inherit-default route would be open). Under the gate register `importNotificationService`, `signout`, then the five address-book plugins in their current order. `router.test.js` gains one test pinning that `/` is 404 with auth disabled. |
| D12 | The dashboard's view name. | `const view = 'dashboard/template'` — resolved through the `app/features` root, mirroring plants' `${TEMPLATES}/features/dashboard/template` through its `app/sets` root. Plants' lowercase `view` replaces ins's `VIEW`. |
| D13 | What else changes in the dashboard controller as it moves. | Exactly: the imports (paths), `view`, the `homeController` object → `listGet` arrow + `export const routes = kit.pageRoutes(dashboardPath(), { get: listGet })`, `...kit.base(PAGE_TITLE)` spread into both view models (replacing the bare `pageTitle`), and `getTraceId`/`traceId` dropped (s04 D13: tidy the trace locals when a controller moves; `logger-options.js`'s mixin already stamps `trace.id` on every line). The `function` declarations (`parsePage`, `parseSort`, `escapeHtml`, `buildCountryNameMap`, `buildSortOptions`, `buildTableRows`) are **not** restyled — s07/s08 rewrite this controller anyway and the move should stay a detectable rename. |
| D14 | `errors.test.js`. | Adopts animals' file shape: the `#errors` describe gains the `/test/programming-error` route and test (pins that a thrown `TypeError` renders the shared error page with `>500</h1>` and the service name in the title), the `#catchAll` describe uses `expectedContext(pageTitle, heading)` with `objectContaining({ pageTitle, heading, message, recoverableError: false })` and gains the non-Boom passthrough test. `mockOidcConfig` keeps coming from ins's `mock-auth.js`. |
| D15 | `src/server/auth/controller.js` renders `auth/unauthorised` four times with no view model. | **Untouched.** The view name still resolves (the file moves under the `app` root), the template sets its own `pageTitle`, and plants' `base(sharedCopy.unauthorised.title)` argument needs the copy pair — s07. |
| D16 | The layout move. | `git mv` of `common/templates/layouts/page.njk` to `app/shared/layout.njk`, byte-identical (R100). `common/templates/partials/README.md` stays (vite's scss `loadPaths` names that folder — s10). `test-helpers/component-helpers.js` still lists the `common/templates` root; the folder still exists, the component tests only reach `common/components`, so it is untouched (s02 D2 parked that file). |
| D17 | `src/server/app/lib/http-status.js` — the brief says create it. | Already created by s04, plants-verbatim (`diff` prints nothing). No-op; §6J re-checks it. |
| D18 | `organisation-id.js`. | Animals' file **verbatim**, doc comment included (it is a "why" comment: the value must come from the verified session, never a payload). `organisation-id.test.js` pins the read and the `undefined` for an unauthenticated request. `requireOrganisationId` moves to `kit.js` (brief) with the same `Boom.forbidden('Organisation could not be identified')`, so the five address-book controllers change one import line each. |
| D19 | Test describe names for moved tests. | `#homeController` → `#dashboard` (the controller no longer exports a `homeController`); everything else keeps its name. |
| D20 | Format. | Run `npm run format` once before the ladder — every new file below is written unwrapped and prettier decides the line breaks. Templates are not formatted (prettier globs are `.js`). |

---

## 1. Moves — every file that moves or is deleted

Paths relative to the ins repo root. "move" = `git mv` with content **unchanged**; "move + E<n>" = `git mv` then the
named edit; "rewrite" = `git mv` then the file is fully replaced from §3 (git shows delete + add if the content
drifts past 50%, which is fine — s04 §6E precedent); "delete" = `git rm`. Create the target directories first
(`mkdir -p`), one per Bash call.

| From | To | How |
|---|---|---|
| `src/server/routes/home/controller.js` | `src/server/app/features/dashboard/controller.js` | move + E1 |
| `src/server/routes/home/controller.test.js` | `src/server/app/features/dashboard/controller.test.js` | move + E2 |
| `src/server/routes/home/index.njk` | `src/server/app/features/dashboard/template.njk` | move + E3 |
| `src/server/routes/home/fit/dashboard.fit.spec.js` | `src/server/app/features/dashboard/fit/dashboard.fit.spec.js` | move + E4 |
| `src/server/routes/home/index.js` | — | delete (the `home` plugin is replaced by `routes` + `app/routes.js`) |
| `src/server/routes/error/index.njk` | `src/server/app/shared/error.njk` | move + E5 |
| `src/server/auth/unauthorised.njk` | `src/server/app/auth/unauthorised.njk` | move + E6 |
| `src/server/common/templates/layouts/page.njk` | `src/server/app/shared/layout.njk` | move (D16 — byte-identical) |
| `src/server/common/helpers/notification-dashboard-helper.js` | `src/server/app/features/dashboard/view-model/notification-dashboard-helper.js` | move + E14 (D8) |
| `src/server/common/helpers/notification-dashboard-helper.test.js` | `src/server/app/features/dashboard/view-model/notification-dashboard-helper.test.js` | move + E16 |
| `src/server/common/helpers/require-organisation-id.js` | `src/server/common/helpers/organisation-id.js` | rewrite (N7) |
| `src/server/common/helpers/require-organisation-id.test.js` | `src/server/common/helpers/organisation-id.test.js` | rewrite (N8) |

After the table: `src/server/routes/` must not exist (§6I) — `git mv` leaves empty directories behind on some
platforms, so `rmdir` each of `src/server/routes/home/fit`, `src/server/routes/home`, `src/server/routes/error`,
`src/server/routes` and `src/server/common/templates/layouts` (one per call; "No such file or directory" means git
already removed it). `src/server/common/templates/partials/` stays (D16).

Nothing in `docker/`, `scripts/`, `README.md`, `sonar-project.properties`, `Dockerfile`, `nodemon.json`,
`compose.yml`, `vite.config.js` or the workflows names a moved path (verified by grep at planning time; the only
`common/templates` hit is vite's `partials` load path, which is not moving). The tests repo reaches the dashboard
through its own page object (`pages.insDashboard`: the `Dashboard` heading, the reference search, the `View` link)
and none of that markup changes.

Who imported what (the complete list from `grep -rn` at HEAD — every one is rewritten in §2/§3):

- `home` plugin → `router.js` (E8)
- `'layouts/page.njk'` → the 8 templates (E3, E5, E6, E9)
- `'routes/home/index'` → `routes/home/controller.js` (E1); `'routes/error/index'` → `errors.js` + test (E11, E12)
- `requireOrganisationId` → the five address-book controllers (E10) and its own test (N8)
- `notification-dashboard-helper.js` → `routes/home/controller.js` (E1) and its own test (E16);
  `pagination-helper.js` → `notification-dashboard-helper.js` (E14 removes that import) and
  `address-book-helper.js` (unchanged)
- `common/templates` root → `nunjucks.js` (E7)

---

## 2. Edits — every file whose content changes, and exactly what changes

Do these with the Edit tool. Nothing else in these files changes: no import reordering, no comment tidy-up, no
`function` → arrow restyle in files that are not rewritten.

### E1. `src/server/app/features/dashboard/controller.js` (the moved home controller)

Replace the whole file with this (Write). Everything from `function parsePage` to `export function buildTableRows`
is byte-identical to the old file; the diff is the imports, `view`, the handler wrapper, the two view-model spreads,
the dropped trace id and the `routes` export (D13).

```js
import { getCountries } from '../../services/countries/index.js'
import { listNotifications } from '../../services/ins-backend/index.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import * as kit from '../../shared/kit.js'
import { dashboardPath } from '../../shared/paths.js'
import {
  SORT_OPTIONS,
  buildPaginationLinks,
  buildResultsLabel,
  buildStartNewNotificationLink,
  mapNotificationRows
} from './view-model/notification-dashboard-helper.js'

const logger = createLogger()
const view = 'dashboard/template'
const PAGE_TITLE = 'Dashboard'
const DEFAULT_SORT = SORT_OPTIONS[0].value
const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))

function parsePage(queryPage) {
  const page = Number.parseInt(queryPage, 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

function parseSort(querySort) {
  return SORT_VALUES.has(querySort) ? querySort : DEFAULT_SORT
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')
}

function buildCountryNameMap(countries) {
  return Object.fromEntries(
    countries.map((country) => [country.code, country.name])
  )
}

function buildSortOptions(sort) {
  return SORT_OPTIONS.map((option) => ({
    value: option.value,
    text: option.text,
    selected: option.value === sort
  }))
}

export function buildTableRows(notifications) {
  return notifications.map((notification) => [
    { text: notification.referenceNumber },
    { text: notification.status },
    { text: notification.originCountry },
    { text: notification.commodity },
    { text: notification.arrivalDate },
    {
      html: `<a class="govuk-link" href="${notification.href}">View<span class="govuk-visually-hidden"> ${escapeHtml(notification.referenceNumber)}</span></a>`
    }
  ])
}

const listGet = async (request, h) => {
  const page = parsePage(request.query.page)
  const sort = parseSort(request.query.sort)
  const referenceNumber = request.query.referenceNumber?.trim() ?? ''
  const hasSearch = Boolean(referenceNumber)

  try {
    const countries = await getCountries()
    const response = await listNotifications({
      page,
      sort,
      referenceNumber: hasSearch ? referenceNumber : undefined
    })

    const pagination = {
      page: response.page,
      size: response.size,
      totalElements: response.totalElements,
      totalPages: response.totalPages
    }

    const countryNames = buildCountryNameMap(countries ?? [])
    const notifications = mapNotificationRows(
      response.content ?? [],
      countryNames
    )
    const isEmpty = response.totalElements === 0 && !hasSearch
    const noSearchResults = response.totalElements === 0 && hasSearch

    return h.view(view, {
      ...kit.base(PAGE_TITLE),
      heading: PAGE_TITLE,
      tableRows: buildTableRows(notifications),
      resultsLabel: buildResultsLabel(pagination),
      pagination: buildPaginationLinks(pagination, { sort, referenceNumber }),
      sort,
      sortOptions: buildSortOptions(sort),
      referenceNumber,
      hasSearch,
      isEmpty,
      noSearchResults,
      startNewNotificationHref: buildStartNewNotificationLink()
    })
  } catch (err) {
    logger.error({ err }, 'Failed to load dashboard')
    return h
      .view(view, {
        ...kit.base(PAGE_TITLE),
        heading: PAGE_TITLE,
        tableRows: [],
        resultsLabel: null,
        pagination: null,
        sort,
        sortOptions: buildSortOptions(sort),
        referenceNumber,
        hasSearch,
        isEmpty: false,
        noSearchResults: false,
        startNewNotificationHref: buildStartNewNotificationLink(),
        errorList: [{ text: 'Something went wrong loading the dashboard' }]
      })
      .code(statusCodes.internalServerError)
  }
}

export const routes = kit.pageRoutes(dashboardPath(), { get: listGet })
```

### E2. `src/server/app/features/dashboard/controller.test.js` (the moved test)

Six lines change; every test body is untouched.

| Today | Becomes |
|---|---|
| `import { createServer } from '../../server.js'` | `import { createServer } from '../../../server.js'` |
| `import { statusCodes } from '../../common/constants/status-codes.js'` | `import { statusCodes } from '../../../common/constants/status-codes.js'` |
| `} from '../../common/test-helpers/mock-auth.js'` | `} from '../../../common/test-helpers/mock-auth.js'` |
| `} from '../../common/test-helpers/real-mode.js'` | `} from '../../../common/test-helpers/real-mode.js'` |
| `vi.mock('../../../auth/get-oidc-config.js', () => ({` | `vi.mock('../../../../auth/get-oidc-config.js', () => ({` |
| `describe('#homeController', () => {` | `describe('#dashboard', () => {` |

(From `src/server/app/features/dashboard/`, three `..` reach `src/server`, four reach `src`.)

### E3. `src/server/app/features/dashboard/template.njk` (the moved dashboard template)

Line 1 only: `{% extends 'layouts/page.njk' %}` → `{% extends "shared/layout.njk" %}` (animals' double quotes).
Nothing else — the heading macro, the `data-testid`s, the literal strings and the `content` block all stay for
s07/s09.

### E4. `src/server/app/features/dashboard/fit/dashboard.fit.spec.js` (the moved Playwright spec)

One import path: `} from '../../../address-book/fit/address-form.js'` → `} from '../../../../address-book/fit/address-form.js'`
(from `src/server/app/features/dashboard/fit/`, four `..` reach `src/server`). Every test is untouched.

### E5. `src/server/app/shared/error.njk` (the moved error template)

Line 1 only: `{% extends 'layouts/page.njk' %}` → `{% extends "shared/layout.njk" %}`. The `appHeading` +
`{{ message }}` body stays (s09 restyles); `catchAll` still passes `heading` and `message`.

### E6. `src/server/app/auth/unauthorised.njk` (the moved unauthorised template)

Line 1 only: `{% extends 'layouts/page.njk' %}` → `{% extends "shared/layout.njk" %}`. The `pageTitle` set, the
`mainClasses` set and the body stay.

### E7. `src/config/nunjucks/nunjucks.js` — the roots (D9)

| Today | Becomes |
|---|---|
| `    'node_modules/govuk-frontend/dist/',`<br>`    path.resolve(dirname, '../../server/common/templates'),`<br>`    path.resolve(dirname, '../../server/common/components'),`<br>`    path.resolve(dirname, '../../server')` | `    'node_modules/govuk-frontend/dist/',`<br>`    path.resolve(dirname, '../../server/common/components'),`<br>`    path.resolve(dirname, '../../server/app'),`<br>`    path.resolve(dirname, '../../server/app/features')` |
| `    path: 'server',` | `    path: ['server/app', 'server/app/features', 'server'],` |

The filters block and everything else stay. The third Vision entry is the address book's until s06 (D9).

### E8. `src/server/router.js` — full replacement (Write; D10, D11)

```js
import inert from '@hapi/inert'

import { health } from './health/index.js'
import { importNotificationService } from './app/routes.js'
import { addressBookList } from './address-book/list/index.js'
import { addressBookAdd } from './address-book/add/index.js'
import { addressBookView } from './address-book/view/index.js'
import { addressBookEdit } from './address-book/edit/index.js'
import { addressBookDelete } from './address-book/delete/index.js'
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
        await server.register([
          importNotificationService,
          signout,
          addressBookList,
          addressBookAdd,
          addressBookView,
          addressBookEdit,
          addressBookDelete
        ])
      }

      await server.register([serveStaticFiles])
    }
  }
}
```

(The `home` import and registration go; `importNotificationService` takes their place at the head of the list.)

### E9. The five address-book templates — line 1 only

In each of `src/server/address-book/{list,add,edit,view,delete}/index.njk`:
`{% extends 'layouts/page.njk' %}` → `{% extends "shared/layout.njk" %}`. Nothing else.

### E10. The five address-book controllers — one import line each

In each of `src/server/address-book/{list,add,edit,view,delete}/controller.js`, in place (same position, no
reordering):

| Today | Becomes |
|---|---|
| `import { requireOrganisationId } from '../../common/helpers/require-organisation-id.js'` | `import { requireOrganisationId } from '../../app/shared/kit.js'` |

### E11. `src/server/common/helpers/errors.js` — animals' file verbatim (Write)

```js
import { statusCodes } from '../constants/status-codes.js'
import { base } from '../../app/shared/kit.js'

function statusCodeMessage(statusCode) {
  switch (statusCode) {
    case statusCodes.notFound:
      return 'Page not found'
    case statusCodes.forbidden:
      return 'Forbidden'
    case statusCodes.unauthorized:
      return 'Unauthorized'
    case statusCodes.badRequest:
      return 'Bad Request'
    default:
      return 'Something went wrong'
  }
}

export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const errorMessage = statusCodeMessage(statusCode)

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

`diff` against `repos/trade-imports-animals-frontend/src/server/common/helpers/errors.js` must print nothing
(§6J).

### E12. `src/server/common/helpers/errors.test.js` — full replacement (Write; D14)

```js
import { vi } from 'vitest'

import { catchAll } from './errors.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from '../test-helpers/mock-auth.js'

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
      expect.stringContaining('Page not found | trade-imports-ins-frontend')
    )
    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('Should render an unexpected programming error in the shared layout', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/test/programming-error'
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toEqual(
      expect.stringContaining('Something went wrong | trade-imports-ins-frontend')
    )
    expect(result).toEqual(expect.stringContaining('>500</h1>'))
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
      expectedContext('Unauthorized', statusCodes.unauthorized)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.unauthorized)
  })

  test('Should provide expected "Bad Request" page', () => {
    catchAll(mockRequest(statusCodes.badRequest), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Bad Request', statusCodes.badRequest)
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

Nine tests (was seven). `>500</h1>` matches the `appHeading` macro's `<h1 … data-testid="app-heading-title">500</h1>`.

### E13. `src/server/router.test.js` — one test added (D11)

After the `'address-book routes are not registered when auth is disabled'` test, add:

```js
  test('the dashboard is not registered when auth is disabled', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })
```

Three tests (was two). Nothing else changes.

### E14. `src/server/app/features/dashboard/view-model/notification-dashboard-helper.js` — full replacement (Write; D8)

Everything except the imports, `buildResultsLabel`, `buildPaginationLinks` and the dropped `DASHBOARD_PATH`
constant is byte-identical to the old file.

```js
import { format, isValid, parseISO } from 'date-fns'

import { config } from '../../../../../config/config.js'
import { dashboardPath } from '../../../shared/paths.js'

const LIST_DATE_FORMAT = 'd MMM yyyy'

export const SORT_OPTIONS = [
  { value: 'arrivalDate,desc', text: 'Arrival date (newest first)' },
  { value: 'arrivalDate,asc', text: 'Arrival date (oldest first)' },
  { value: 'lastUpdated,desc', text: 'Last updated (newest first)' },
  { value: 'lastUpdated,asc', text: 'Last updated (oldest first)' }
]

const DEFAULT_SORT = SORT_OPTIONS[0].value

export function formatDisplayDate(value) {
  if (!value) {
    return ''
  }
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? format(date, LIST_DATE_FORMAT) : ''
}

/**
 * Builds a query string carrying the dashboard's current state (sort,
 * referenceNumber, page) so search/sort/pagination round-trip each other's
 * state rather than clobbering it.
 */
export function buildDashboardQueryString({
  page,
  sort,
  referenceNumber
} = {}) {
  const params = new URLSearchParams()
  if (referenceNumber) {
    params.set('referenceNumber', referenceNumber)
  }
  if (sort && sort !== DEFAULT_SORT) {
    params.set('sort', sort)
  }
  if (page && page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

const normalizePageNumber = (page, totalPages) =>
  totalPages < 1 ? 1 : Math.min(Math.max(page, 1), totalPages)

const pageRange = ({ page, size, totalElements, totalPages }) => {
  const currentPage = normalizePageNumber(page, totalPages || 1)
  return {
    from: (currentPage - 1) * size + 1,
    to: Math.min(currentPage * size, totalElements),
    count: totalElements
  }
}

/** Builds a results range label for the current page, e.g. "Showing 1-25 of 40". */
export function buildResultsLabel(pagination) {
  if (pagination.totalElements < 1) {
    return null
  }
  const { from, to, count } = pageRange(pagination)
  return `Showing ${from}-${to} of ${count}`
}

/** Builds numbered govukPagination links from the backend's pagination metadata. */
export function buildPaginationLinks(
  pagination,
  { sort, referenceNumber } = {}
) {
  const { totalPages } = pagination
  if (totalPages <= 1) {
    return null
  }
  const page = normalizePageNumber(pagination.page, totalPages)
  const pageHref = (targetPage) =>
    `${dashboardPath()}${buildDashboardQueryString({ sort, referenceNumber, page: targetPage })}`

  return {
    results: pageRange(pagination),
    previous: page > 1 ? { href: pageHref(page - 1) } : undefined,
    next: page < totalPages ? { href: pageHref(page + 1) } : undefined,
    items: Array.from({ length: totalPages }, (_, index) => ({
      number: String(index + 1),
      href: pageHref(index + 1),
      current: index + 1 === page
    }))
  }
}

/**
 * The journey frontend that owns a notification is addressable by its
 * reference number — trade-imports-animals-frontend's `journeyId` route
 * param is, in practice, that same reference number, and the target routes
 * resolve a fresh request with no session state. SUBMITTED notifications
 * have a read-only view page; DRAFT and AMEND resume at the hub, matching
 * that app's own row-action logic.
 *
 * Single-journey only: there is nothing on a notification yet that says
 * which journey owns it (see EUDPA-306 plan, "Deferred to caller ticket").
 */
export function buildNotificationLink(status, referenceNumber) {
  const baseUrl = config.get('tradeImportsAnimalsFrontend.baseUrl')
  const encodedReference = encodeURIComponent(referenceNumber)
  return status === 'SUBMITTED'
    ? `${baseUrl}/notifications/${encodedReference}/notification-view`
    : `${baseUrl}/notifications/${encodedReference}`
}

export function buildStartNewNotificationLink() {
  return config.get('tradeImportsAnimalsFrontend.baseUrl')
}

export function mapNotificationRows(notifications, countryNames = {}) {
  return notifications.map((notification) => ({
    referenceNumber: notification.referenceNumber,
    status: notification.status,
    originCountry:
      countryNames[notification.originCountry] ??
      notification.originCountry ??
      '',
    commodity: notification.commodity ?? '',
    arrivalDate: formatDisplayDate(notification.arrivalDate),
    href: buildNotificationLink(
      notification.status,
      notification.referenceNumber
    )
  }))
}
```

Semantics are the generic helper's, specialised to `size`/`totalElements` and `dashboardPath()`: same clamp, same
`from`/`to`/`count`, same `previous`/`next` presence rule (present as `undefined` instead of absent — the
`govukPagination` macro and the 18 tests treat both the same), same numbered `items`, same hrefs through
`buildDashboardQueryString`. The results `count` key and the `results` object are kept because the old model
carried them.

### E15. `src/server/common/helpers/pagination-helper.js` — header comment only (D8)

Replace lines 1–9 (the file's leading block comment) with:

```js
/**
 * Pagination for a list page whose API names its page size and total
 * differently from the next one. The caller passes `sizeField`/`totalField`
 * to name those properties on its own `pagination` object, so the
 * range-calculation and link-building logic itself lives in one place.
 */
```

The functions are untouched; `address-book-helper.js` still imports them.

### E16. `src/server/app/features/dashboard/view-model/notification-dashboard-helper.test.js` (the moved test)

One line: `vi.mock('../../../config/config.js', () => ({` → `vi.mock('../../../../../config/config.js', () => ({`
(from `src/server/app/features/dashboard/view-model/`, five `..` reach `src`). The
`await import('./notification-dashboard-helper.js')` and all 18 tests are untouched. (The config mock stays: it
pins the assertions to `http://localhost:3000` regardless of a `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` in the shell.)

### E17. Nothing else

`src/server/auth/controller.js` (D15), `src/server/server.js`, `src/config/nunjucks/context/*`,
`src/server/common/constants/*`, `src/server/signout/*`, `src/server/health/*`, `src/plugins/*`,
`test-helpers/component-helpers.js`, `vite.config.js`, `playwright.config.js`, `vitest.config.js` — untouched.

---

## 3. New files — full content

### N1. `src/server/app/shared/kit.js`

```js
import Boom from '@hapi/boom'

import { sessionAuthRouteOptions } from '../../common/constants/session-auth-route-options.js'
import { organisationIdOf } from '../../common/helpers/organisation-id.js'

export const routeOptions = sessionAuthRouteOptions

export const sharedCopy = {}

const LAYOUT = 'shared/layout.njk'

const ERROR_SUMMARY_TITLE = 'There is a problem'

const anchorHref = (field) => `#${field}`

/**
 * The one error summary shape the service renders.
 *
 * @param {object} [fieldErrors] - map of key to message. Empty means no summary.
 * @param {object} [options]
 * @param {(key: string) => string} [options.href] - builds the link for a key.
 * Defaults to the in-page anchor `#key`; pass a builder when the entries link
 * somewhere else, such as another page.
 * @param {boolean} [options.disableAutoFocus] - keep the caret where it is
 * instead of moving it to the summary. Set it on a page that renders the
 * summary without the user having just been refused.
 * @returns {object|null} the summary view model, or null when there are no
 * errors.
 */
export const errorSummary = (
  fieldErrors,
  { href = anchorHref, disableAutoFocus } = {}
) => {
  const entries = Object.entries(fieldErrors ?? {})
  if (entries.length === 0) {
    return null
  }
  return {
    titleText: ERROR_SUMMARY_TITLE,
    disableAutoFocus,
    errorList: entries.map(([field, text]) => ({ text, href: href(field) }))
  }
}

export const fieldError = (fieldErrors, field) =>
  fieldErrors?.[field] ? { text: fieldErrors[field] } : undefined

/**
 * The chrome every page shares.
 *
 * @param {string} title - the page title.
 * @param {object} [options]
 * @param {string} [options.backLink] - where the back link goes; omit it on a
 * page with no way back.
 * @param {boolean} [options.recoverableError] - the save failed in a way the
 * user can retry.
 * @returns {object} the common view model.
 */
export const base = (title, { backLink, recoverableError = false } = {}) => ({
  layout: LAYOUT,
  pageTitle: title,
  backLink,
  sharedCopy,
  recoverableError
})

export const requireOrganisationId = (request) => {
  const organisationId = organisationIdOf(request)
  if (!organisationId) {
    throw Boom.forbidden('Organisation could not be identified')
  }
  return organisationId
}

/**
 * The routes for one page.
 *
 * @param {string} path - the route path, built by paths.js.
 * @param {object} handlers
 * @param {Function} handlers.get - renders the page.
 * @param {Function} [handlers.post] - handles the page's form; omit it on a
 * page with no form.
 * @returns {object[]} the Hapi routes.
 */
export const pageRoutes = (path, { get, post }) => [
  { method: 'GET', path, options: routeOptions, handler: get },
  ...(post
    ? [{ method: 'POST', path, options: routeOptions, handler: post }]
    : [])
]
```

The `errorSummary` and `base` doc comments are animals' (trimmed of the journey parameters). `readDate`,
`dateField`, `SURFACES`, `surfaceClass`, `journeyStrip`, `CYA_SLUG`, `hubExitTarget`, `changeContext`,
`withChangeContext`, `exitTarget`, `runTarget`, `nextTarget`, `redirectOnStaleAction`, `recoverableSave` (D6) do
**not** come across.

### N2. `src/server/app/shared/kit.test.js`

```js
import { describe, expect, it } from 'vitest'

import { statusCodes } from '../../common/constants/status-codes.js'
import {
  base,
  errorSummary,
  fieldError,
  pageRoutes,
  requireOrganisationId,
  routeOptions,
  sharedCopy
} from './kit.js'

const ORGANISATION_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'

const thrownBy = (callback) => {
  try {
    callback()
  } catch (error) {
    return error
  }
}

describe('#base — the chrome every page shares', () => {
  it('Should name the layout, carry the title and default the rest', () => {
    expect(base('Dashboard')).toEqual({
      layout: 'shared/layout.njk',
      pageTitle: 'Dashboard',
      backLink: undefined,
      sharedCopy,
      recoverableError: false
    })
  })

  it('Should carry a back link and a recoverable error through', () => {
    expect(
      base('Add address details', {
        backLink: '/address-book',
        recoverableError: true
      })
    ).toMatchObject({
      pageTitle: 'Add address details',
      backLink: '/address-book',
      recoverableError: true
    })
  })
})

describe('#errorSummary', () => {
  it('Should be null when there are no field errors', () => {
    expect(errorSummary()).toBeNull()
    expect(errorSummary({})).toBeNull()
  })

  it('Should list every field error under the one title, each linked to its in-page anchor', () => {
    expect(
      errorSummary({ name: 'Enter a name', email: 'Enter an email address' })
    ).toEqual({
      titleText: 'There is a problem',
      disableAutoFocus: undefined,
      errorList: [
        { text: 'Enter a name', href: '#name' },
        { text: 'Enter an email address', href: '#email' }
      ]
    })
  })

  it('Should link through a supplied href builder and keep the caret where it is when asked', () => {
    const summary = errorSummary(
      { name: 'Enter a name' },
      { href: (field) => `/address-book/add#${field}`, disableAutoFocus: true }
    )

    expect(summary.errorList).toEqual([
      { text: 'Enter a name', href: '/address-book/add#name' }
    ])
    expect(summary.disableAutoFocus).toBe(true)
  })
})

describe('#fieldError', () => {
  it('Should wrap the field message for the govuk macro', () => {
    expect(fieldError({ name: 'Enter a name' }, 'name')).toEqual({
      text: 'Enter a name'
    })
  })

  it('Should be undefined when the field has no error', () => {
    expect(fieldError({ name: 'Enter a name' }, 'email')).toBeUndefined()
    expect(fieldError(undefined, 'email')).toBeUndefined()
  })
})

describe('#pageRoutes', () => {
  const get = () => 'page'
  const post = () => 'saved'

  it('Should register a GET alone for a page with no form', () => {
    expect(pageRoutes('/', { get })).toEqual([
      { method: 'GET', path: '/', options: routeOptions, handler: get }
    ])
  })

  it('Should register the GET and POST pair on the same path for a page with a form', () => {
    expect(pageRoutes('/address-book/add', { get, post })).toEqual([
      {
        method: 'GET',
        path: '/address-book/add',
        options: routeOptions,
        handler: get
      },
      {
        method: 'POST',
        path: '/address-book/add',
        options: routeOptions,
        handler: post
      }
    ])
  })

  it('Should name the session strategy on every route', () => {
    expect(routeOptions).toEqual({ auth: 'session' })
  })
})

describe('#requireOrganisationId', () => {
  it('Should return the organisation from the verified session', () => {
    expect(
      requireOrganisationId({
        auth: { credentials: { organisationId: ORGANISATION_ID } }
      })
    ).toBe(ORGANISATION_ID)
  })

  it('Should refuse a session that carries no organisation with a 403', () => {
    const error = thrownBy(() =>
      requireOrganisationId({ auth: { credentials: {} } })
    )

    expect(error.isBoom).toBe(true)
    expect(error.output.statusCode).toBe(statusCodes.forbidden)
    expect(error.message).toBe('Organisation could not be identified')
  })
})
```

Twelve tests.

### N3. `src/server/app/shared/paths.js`

```js
export const dashboardPath = () => '/'
export const addressBookPath = () => '/address-book'
export const addressAddPath = () => '/address-book/add'
export const addressPath = (id) => `/address-book/${encodeURIComponent(id)}`
export const addressRoutePath = () => '/address-book/{id}'
export const addressEditPath = (id) => `${addressPath(id)}/edit`
export const addressEditRoutePath = () => `${addressRoutePath()}/edit`
export const addressDeletePath = (id) => `${addressPath(id)}/delete`
export const addressDeleteRoutePath = () => `${addressRoutePath()}/delete`
```

Only `dashboardPath` has a caller in s05 (the dashboard controller and its view-model helper); the address-book
builders are consumed by s06. They are all pinned now (N4) because together they **are** invariant 1.

### N4. `src/server/app/shared/paths.test.js`

```js
import { describe, expect, it } from 'vitest'

import {
  addressAddPath,
  addressBookPath,
  addressDeletePath,
  addressDeleteRoutePath,
  addressEditPath,
  addressEditRoutePath,
  addressPath,
  addressRoutePath,
  dashboardPath
} from './paths.js'

const ADDRESS_ID = '000000000000000000000001'

describe('public paths', () => {
  it('Should build every public URL the service exposes', () => {
    expect([
      dashboardPath(),
      addressBookPath(),
      addressAddPath(),
      addressPath(ADDRESS_ID),
      addressEditPath(ADDRESS_ID),
      addressDeletePath(ADDRESS_ID)
    ]).toEqual([
      '/',
      '/address-book',
      '/address-book/add',
      '/address-book/000000000000000000000001',
      '/address-book/000000000000000000000001/edit',
      '/address-book/000000000000000000000001/delete'
    ])
  })

  it('Should build the Hapi route form of every path that carries an address id', () => {
    expect([
      addressRoutePath(),
      addressEditRoutePath(),
      addressDeleteRoutePath()
    ]).toEqual([
      '/address-book/{id}',
      '/address-book/{id}/edit',
      '/address-book/{id}/delete'
    ])
  })

  it('Should encode an address id so it cannot rewrite the path', () => {
    expect(addressPath('a/b?c')).toBe('/address-book/a%2Fb%3Fc')
  })
})
```

Three tests.

### N5. `src/server/app/shared/error-summary.njk` — animals' file verbatim

```njk
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% if errorSummary %}
  {{ govukErrorSummary(errorSummary) }}
{% endif %}
```

`diff` against `repos/trade-imports-animals-frontend/src/server/app/shared/error-summary.njk` must print nothing
(§6J). No template includes it yet (s06/s08).

### N6. `src/server/app/routes.js` (D7, D10)

```js
import { allRoutes } from './features/index.js'

export const importNotificationService = {
  plugin: {
    name: 'import-notification-service',
    register: (server) => {
      server.route(allRoutes)
    }
  }
}
```

### N7. `src/server/common/helpers/organisation-id.js` — animals' file verbatim

```js
/** The organisation the signed-in user is acting for on this request.
 *
 * The one place this value is read. It is forwarded to services that scope on
 * the organisation — the address book directly, and the backend, which passes
 * it on to the address book in turn — and those services treat it as the
 * authenticated organisation rather than checking it themselves. So it must
 * always come from the verified session and never from a payload, a query
 * string or a stored field: forwarding a verified value is a pass-through,
 * anything else is asserting an identity.
 *
 * Returns undefined when the request is unauthenticated. Callers decide what
 * that means for them; none of them may substitute a guess.
 */
export const organisationIdOf = (request) =>
  request?.auth?.credentials?.organisationId
```

`diff` against `repos/trade-imports-animals-frontend/src/server/common/helpers/organisation-id.js` must print
nothing (§6J).

### N8. `src/server/common/helpers/organisation-id.test.js`

```js
import { describe, expect, test } from 'vitest'

import { organisationIdOf } from './organisation-id.js'

describe('#organisationIdOf', () => {
  test('Should read the organisation from the verified session credentials', () => {
    const request = {
      auth: {
        credentials: {
          organisationId: '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
        }
      }
    }

    expect(organisationIdOf(request)).toBe(
      '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
    )
  })

  test('Should be undefined for a request that carries no organisation', () => {
    expect(organisationIdOf({ auth: { credentials: {} } })).toBeUndefined()
    expect(organisationIdOf({})).toBeUndefined()
    expect(organisationIdOf(undefined)).toBeUndefined()
  })
})
```

Two tests (the old file's "throws forbidden" test moves to `kit.test.js`, N2).

### N9. `src/server/app/features/index.js` — plants' shape at its smallest

```js
import * as dashboard from './dashboard/controller.js'

export const allRoutes = [...dashboard.routes]
```

### N10. `src/server/app/routes.test.js` (D1)

```js
import { describe, expect, it } from 'vitest'

import { allRoutes } from './features/index.js'

describe('promoted route authentication', () => {
  it('Should name the session strategy on every promoted route', () => {
    expect(allRoutes).not.toHaveLength(0)

    for (const route of allRoutes) {
      expect(route.options).toMatchObject({ auth: 'session' })
    }
  })

  it('Should promote exactly the dashboard', () => {
    expect(allRoutes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'GET /'
    ])
  })
})
```

Two tests. The second is invariant 1's proof for the one route this stage takes out of a `path: '…'` literal (§6C).

---

## 4. Imports — the rule

1. **Relative, shortest path** (s02 D1). The prefixes this stage needs:
   - from `src/server/app/shared/`: `'../../common/…'`, `'../../../config/…'`
   - from `src/server/app/`: `'./features/index.js'`, `'./shared/…'`, `'../common/…'`
   - from `src/server/app/features/dashboard/`: `'../../shared/…'`, `'../../services/…'`,
     `'../../../common/…'`, `'../../../server.js'`, `'../../../../auth/…'`, `'./view-model/…'`
   - from `src/server/app/features/dashboard/view-model/`: `'../../../shared/…'`, `'../../../../../config/…'`
   - from `src/server/app/features/dashboard/fit/`: `'../../../../address-book/fit/…'`
   - from `src/server/address-book/<page>/`: `'../../app/shared/kit.js'`
   - from `src/server/common/helpers/`: `'../../app/shared/kit.js'` (animals' exact spelling in `errors.js`)
   - from `src/server/`: `'./app/routes.js'`
2. **Feature code imports the kit as a namespace** — `import * as kit from '../../shared/kit.js'` and
   `kit.base(...)`, `kit.pageRoutes(...)` — exactly as plants' controllers do. Chassis code (`errors.js`) and the
   address-book controllers (until s06) import the names they use.
3. **Templates**: every page template's first line is `{% extends "shared/layout.njk" %}` (double quotes); the
   layout itself extends `"govuk/template.njk"`. Nothing extends `layouts/page.njk` after this stage (§6B).
4. **View names**: `'shared/error'`, `'auth/unauthorised'` and `'dashboard/template'` resolve through the `app` /
   `app/features` Vision roots; `'address-book/<page>/index'` through the temporary `server` root (D9).
5. **No `vi.mock` of anything under `src/server/app/`** and no new module-boundary mock anywhere. The `vi.mock`
   calls in touched tests are `get-oidc-config.js` (server-booting tests, as today) and the config mock the
   dashboard helper test already carries (E16).
6. `sessionAuthRouteOptions` is imported by `kit.js` only to be re-exported as `routeOptions` (D1); no feature file
   imports the constant directly.

---

## 5. Tests

### Tests that move unchanged in substance

| File | Tests | Pins |
|---|---|---|
| `app/features/dashboard/controller.test.js` (E2) | 10 | The dashboard through the real server: rows, statuses, the two link shapes into the animals frontend, search forwarding, the no-results and empty states, sort forwarding and the unknown-sort fallback, the 500 page. Now also proves the `app/features` Vision root resolves `dashboard/template`, the app plugin registers `GET /`, and `kit.base()` keys in the view model break nothing. |
| `app/features/dashboard/view-model/notification-dashboard-helper.test.js` (E16) | 18 | Query-string round-tripping; the results label; **the folded-in pagination** (null for one page, `previous`/`next` hrefs with sort carried, 3 numbered items with the current one marked, no `previous` on page 1 and no `next` on the last); the notification link shapes and encoding; the start-new link; date formatting; row mapping. These 18 are what make D8's rewrite safe. |
| `app/features/dashboard/fit/dashboard.fit.spec.js` (E4) | 6 (Playwright) | The dashboard in a browser against the stub: the `Dashboard` heading, the three stub references with their statuses, the soft-deleted one absent, axe, the two `View` href shapes, search hit and search miss. |

### Tests that are rewritten

| File | Tests | Pins |
|---|---|---|
| `common/helpers/organisation-id.test.js` (N8) | 2 | `organisationIdOf` reads the verified session; `undefined` (never a guess) for an unauthenticated request. |
| `common/helpers/errors.test.js` (E12) | 9 (was 7) | The 404 page through the real server, the 500 page for a thrown `TypeError` (new), each status's title/heading/message through `catchAll` now spread over `base()` (`recoverableError: false` pinned), the internal-error stack log, and non-Boom passthrough (new). |
| `router.test.js` (E13) | 3 (was 2) | With auth disabled: address book 404, **dashboard 404** (new), health 200. |

### Tests that are new

| File | Tests | Pins |
|---|---|---|
| `app/shared/kit.test.js` (N2) | 12 | `base()`'s five keys and defaults; `errorSummary()` null on nothing, the title and anchor hrefs, a custom href builder and `disableAutoFocus`; `fieldError()`; `pageRoutes()` GET-only and GET+POST on one path with `routeOptions`; `routeOptions` is `{ auth: 'session' }`; `requireOrganisationId()` returns the id and refuses with a 403 Boom. |
| `app/shared/paths.test.js` (N4) | 3 | Every public URL the service exposes (invariant 1 as a test), the three `{id}` route forms, id encoding. |
| `app/routes.test.js` (N10) | 2 | Every promoted route names the session strategy; the promoted set is exactly `GET /`. |

### Arithmetic

Baseline 48 files / 253 tests. Moved files keep their counts (10 + 18). `organisation-id.test.js` keeps 2.
`errors.test.js` +2, `router.test.js` +1, `kit.test.js` +12, `paths.test.js` +3, `routes.test.js` +2 → **273**.
Files: 48 + 3 new (`kit.test.js`, `paths.test.js`, `routes.test.js`) = **51**. If `Tests  273 passed (273)` is
not what the log says, a test was lost or gained — find it before going on. Playwright: 49 (the 6 dashboard specs
move, none is added or dropped).

---

## 6. Invariants to prove

Every command is one Bash call; test output goes to a file under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/` that is read once with the Read tool.

**Order of work.** §1 (mkdir, moves, delete, rmdir), then §3 (new files), then §2 (edits), then `npm run format`,
then the ladder. There is no useful intermediate green — the suite cannot pass while `router.js` still imports the
deleted `home` plugin or a template still extends `layouts/page.njk`. The first `npm test` read is the canary: if it
is red, the log names the file. A `Template render error … template not found` names a view name or an `extends`
this plan missed; a `Cannot find module` names an import prefix from §4 — fix it and run once more.

**A. Ladder** (four rungs, in order). Run `format` first, then the rungs:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s05-format-fix.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format:check > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s05-format.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run lint > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s05-lint.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend test > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s05-test.log 2>&1
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run test:fit > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s05-fit.log 2>&1
```

`s05-test.log` must show `Test Files  51 passed (51)` and `Tests  273 passed (273)`. `s05-fit.log` must show
`49 passed`. On a Playwright failure read `test-results/*/error-context.md` inside the repo, not the log tail. The
fit suite is the only check that boots the app under plain `node .` and renders every moved template through the
new Nunjucks roots (invariant 3).

**B. Invariant 2/6 — no old name or path survives.** Must return nothing:

```
grep -rn -e "routes/home" -e "routes/error" -e "layouts/page" -e "common/templates/layouts" -e "require-organisation-id" -e "homeController" -e "common/helpers/notification-dashboard-helper" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/test-helpers --exclude-dir=node_modules
```

The dashboard feature must not reach the generic pagination helper (D8) — must return nothing:

```
grep -rn "pagination-helper" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app
```

(`address-book-helper.js` in `common/helpers` still imports `./pagination-helper.js`; that is expected and outside
the grep's scope.)

And no trace id in the moved dashboard code:

```
grep -rn "traceId\|getTraceId" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features
```

**C. Invariant 1 — public URL surface unchanged.** s04's route grep:

```
grep -rn "path: '" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/plugins --include="*.js" --exclude="*.test.js" --exclude="*.spec.js"
```

The set must be s04's closing set **minus the one `/` line that lived in `routes/home/index.js`**:
`/auth/stub-sign-in`, `/auth/sign-in`, `/auth/sign-in-oidc`, `/auth/sign-out`, `/auth/sign-out-oidc`,
`/auth/organisation`, `/health`, `/signout`, `/favicon.ico`, `'.'` (serve-static-files' directory path, not a
route), `/address-book/{id}/delete` (x2), `/address-book/{id}/edit` (x2), `/address-book/add` (x2),
`/address-book`, `/address-book/{id}`, plus the cookie `path: '/'` in `src/plugins/auth.js`. Nothing added. The
`/` route now comes from `kit.pageRoutes(dashboardPath(), …)` and is proved by `app/routes.test.js`'s
`['GET /']` (N10), `paths.test.js` (N4) and the dashboard controller test hitting `/` (E2). This grep pattern
changes for good from here — record that in the stage's notes so s06 does not chase the missing line.

**D. Every page template extends the shared layout.** Must list exactly nine lines — eight
`{% extends "shared/layout.njk" %}` (dashboard, error, unauthorised, list, add, edit, view, delete) and the layout's
own `{% extends "govuk/template.njk" %}`:

```
grep -rn "extends" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server --include="*.njk"
```

**E. Invariants 6/7 — the diff is exactly this stage.** `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend add -A` then
`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached -M --name-status` must
list only these paths (git decides which moves render as `R` and which as `D` + `A` — do not chase the letter,
chase the path set):

```
moved:    src/server/routes/home/controller.js            -> src/server/app/features/dashboard/controller.js
          src/server/routes/home/controller.test.js       -> src/server/app/features/dashboard/controller.test.js
          src/server/routes/home/index.njk                -> src/server/app/features/dashboard/template.njk
          src/server/routes/home/fit/dashboard.fit.spec.js -> src/server/app/features/dashboard/fit/dashboard.fit.spec.js
          src/server/routes/error/index.njk               -> src/server/app/shared/error.njk
          src/server/auth/unauthorised.njk                -> src/server/app/auth/unauthorised.njk
          src/server/common/templates/layouts/page.njk    -> src/server/app/shared/layout.njk   (must be R100)
          src/server/common/helpers/notification-dashboard-helper.js      -> src/server/app/features/dashboard/view-model/notification-dashboard-helper.js
          src/server/common/helpers/notification-dashboard-helper.test.js -> src/server/app/features/dashboard/view-model/notification-dashboard-helper.test.js
          src/server/common/helpers/require-organisation-id.js      -> src/server/common/helpers/organisation-id.js
          src/server/common/helpers/require-organisation-id.test.js -> src/server/common/helpers/organisation-id.test.js
deleted:  src/server/routes/home/index.js
added:    src/server/app/routes.js
          src/server/app/routes.test.js
          src/server/app/features/index.js
          src/server/app/shared/{kit,kit.test,paths,paths.test}.js
          src/server/app/shared/error-summary.njk
edited:   src/config/nunjucks/nunjucks.js
          src/server/router.js
          src/server/router.test.js
          src/server/common/helpers/errors.js
          src/server/common/helpers/errors.test.js
          src/server/common/helpers/pagination-helper.js
          src/server/address-book/{list,add,edit,view,delete}/controller.js
          src/server/address-book/{list,add,edit,view,delete}/index.njk
```

`layout.njk` must show as `R100`; if not, the move altered the file — restore it byte for byte (D16). Read the
full diff once (`git -C … diff --cached > …/logs/s05-full-diff.log`) and check no hunk outside §1–§3 exists: no
"was previously" / "renamed from" / "moved from" wording, no comment added that this plan does not show, no edit to
`server.js`, `auth/controller.js`, `context.js`, `vite.config.js` or `component-helpers.js`.

**F. Invariant 4 — no cross-repo import.** Must return nothing:

```
grep -rn "from '.*trade-imports-\(animals\|plants\)" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```

**G. Invariant 5 — copy files.** s07 has not run. The one user-facing string this stage moves into JS is
`ERROR_SUMMARY_TITLE = 'There is a problem'` in `kit.js` (D5), the same literal the six templates already carry;
§9 names it for s07. Nothing else: the moved templates keep every string where it was.

**H. Invariant 8 — the module boundary is not mocked.** Must return nothing:

```
grep -rn "vi.mock(.*app/" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```

**I. The old folders are gone and the new tree is the target's.** The first two must return nothing; the third
must list exactly `auth`, `features`, `lib`, `services`, `shared`:

```
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server -type d -name routes
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/templates -type d -name layouts
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app -mindepth 1 -maxdepth 1 -type d
```

**J. Verbatim copies are verbatim.** Each `diff` must print nothing:

```
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/common/helpers/errors.js ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/helpers/errors.js
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/common/helpers/organisation-id.js ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/helpers/organisation-id.js
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/shared/error-summary.njk ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/shared/error-summary.njk
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/lib/http-status.js ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/lib/http-status.js
```

**K. The address book still works through the temporary Vision root** — proved by the five address-book
controller tests (35 tests, untouched) in the unit run and the 43 address-book Playwright specs in the fit run
(§6A). No separate command.

---

## 7. Commit

Stage everything (`git -C … add -A`), then commit on `feat/NO_JIRA-frontend-alignment`:

```
refactor(alignment): s05-app-shell — add app/shared, app/routes.js and the dashboard feature

The dashboard becomes the first feature under src/server/app/features,
its controller exporting routes through kit.pageRoutes and its
pagination folded into its own view-model. app/shared gains kit.js
(base, errorSummary, fieldError, pageRoutes, requireOrganisationId),
paths.js (every public URL), the layout, the error page and the
error-summary partial; app/routes.js is the one Hapi plugin router.js
registers for the app. The Nunjucks roots move to app + app/features,
with a third Vision root keeping the address book served until s06.
require-organisation-id.js becomes organisation-id.js exporting
organisationIdOf, as the journeys spell it.
```

plus the required trailers. Do not push to `main`; do not merge.

---

## 8. Out of scope — leave alone even though it is tempting

- **The address-book folder** beyond E9/E10 — its plugins, `index.js` files, `sessionAuthRouteOptions` /
  `addressIdRouteOptions`, `address-countries.js`, `address-schema.js`, `address-id-params.js`, the fit helpers,
  `address-book-helper.js`, `session-helpers.js`, `validation-helpers.js`, the `traceId` locals — s06 (D8, D13).
- **`pagination-helper.js`'s functions** — only its header changes (E15); s06 folds it into the address book.
- **`recoverableSave()`** and any predicate for it — s06 (D6).
- **Countries priming at boot** — not ins's model (D7).
- **`src/server/auth/controller.js`** — no `base()`/`sharedCopy` argument until s07 (D15).
- **The layout's content** (`app-service-header`, `appHeading`, breadcrumbs, `serviceName` title, the `content`
  block name) — s09. Do not rename `content` to `journeyContent`, do not add the phase banner, back link or
  `contentColumnClass`.
- **The dashboard template's markup and strings**, `data-testid`s, the `govukTable` columns — s07/s09.
- **`function` → arrow restyles** in moved files; `VIEW` → `view` is the only rename (D13).
- **`common/templates/partials/README.md`**, `vite.config.js`'s scss load path, `test-helpers/component-helpers.js`
  and its `common/templates` root (D16) — s10/s11.
- **`src/server/common/README.md`**, `README.md` — s11.
- **`src/config/nunjucks/context/*`** (`breadcrumbs: []`, `navigation`, `serviceName`) — s09.
- **`src/server/common/constants/session-auth-route-options.js`** — still used by `signout/index.js`, the
  address-book plugins and, through `kit.routeOptions`, the dashboard; s06 inlines it.
- **`app/lib/http-status.js`** — already plants' (D17).
- **The two journey repos** — this stage touches `ins` only.
- Any comment tidy-up, identifier rename, import reordering or blank-line change beyond §1–§3.

---

## 9. Behaviour changes (named, per invariant 2)

1. **The dashboard's failure log line no longer carries an explicit `traceId` field** (`logger.error({ err },
   'Failed to load dashboard')` instead of `{ err, traceId }`). `logger-options.js`'s mixin stamps `trace.id` on
   every line already, so the trace is still in the log; only the duplicate field goes (D13).
2. **The `/` route is registered by the `import-notification-service` plugin** instead of the `home` plugin, with
   the same explicit `auth: 'session'`, under the same `auth.enabled` gate. Same URL, same handler behaviour, same
   response.
3. **The error page and the dashboard view models carry `layout`, `sharedCopy`, `recoverableError` and
   `backLink`** from `base()`. The unchanged layout renders none of them; nothing visible changes until s09.
4. **The dashboard's pagination model lists `previous`/`next` as `undefined` rather than omitting the keys** on
   the first/last page (E14). The `govukPagination` macro treats both alike; the rendered links are identical.

For s07: the string `'There is a problem'` now lives in `kit.js` as `ERROR_SUMMARY_TITLE` as well as in the six
templates (D5) — it goes into the copy pair once, and both places read it from there.

Deviations from the brief's wording, each with its reason in §0: no `recoverableSave()` (D6), no countries
priming (D7), `pagination-helper.js` not moved (D8). Nothing user-visible changes for a signed-in trader in either
mode: the route surface (§6C), the stub seeds, the address-book flows and the dashboard render as before, and the
fit suite (§6A) proves it.
