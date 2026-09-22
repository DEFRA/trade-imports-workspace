# s07-copy-and-welsh — move every string into `copy.en.js` and `copy.cy.js` pairs

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit/Write tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (checked out, level with `origin`, clean tree, HEAD `b62ae00`).

Reference files (journey frontends; Read tool paths under `/Users/samfarrington/git/defra/trade-imports-workspace/`):

- `repos/trade-imports-plants-frontend/src/server/app/shared/copy.js` — `copyFor(locales, locale = 'en')`, the
  locale seam. Byte-identical between animals and plants apart from the doc comment; plants' comment is the newer one
  (it names `copy-parity.test.js` and the machine-draft Welsh) and is the one ins takes.
- `repos/trade-imports-plants-frontend/src/server/app/shared/copy-leaves.js` — `leaves(node)` and `isCopyLeaf(value)`.
  Byte-identical in both journeys.
- `repos/trade-imports-plants-frontend/src/server/app/shared/copy.en.js` / `copy.cy.js` — the shared chrome copy:
  `layout`, `unauthorised`, `errorSummary`, … Plants' has the `unauthorised` namespace animals' lacks; ins needs it.
- `repos/trade-imports-plants-frontend/src/server/app/shared/copy.test.js` — `#copyFor` + per-namespace pins + the
  "non-empty string at every leaf" walk.
- `repos/trade-imports-plants-frontend/src/server/app/shared/kit.js` lines 10–23 and 84–97 — how `sharedCopy` is
  resolved once in the kit and how `errorSummary()` titles itself from it.
- `repos/trade-imports-plants-frontend/src/server/app/copy-convention.test.js` and `copy-parity.test.js` — the two
  suite-wide guards (the brief names `src/server/…`; in both journeys the files actually live at `src/server/app/`).
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/origin/` — the
  feature shape: `copy/{copy.en.js, copy.cy.js, copy.test.js}`, a controller that does
  `const copy = copyFor({ en, cy })`, puts `copy` in the view model beside `...kit.base(copy.title, …)`, and a
  template that reads `copy.title`, `copy.country.label`, `sharedCopy.saveActions`.
- `repos/trade-imports-plants-frontend/src/server/auth/controller.js` line 6 and lines 29/41, and
  `repos/trade-imports-plants-frontend/src/server/app/auth/unauthorised.njk` — the unauthorised page read from
  `sharedCopy.unauthorised` with `base(sharedCopy.unauthorised.title)` as the view model.
- `repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/dashboard/copy/` —
  the closest journey analogue of ins's dashboard copy (search/sort/table/pagination/empty namespaces, function
  leaves for parameterised strings, and a `copy.test.js` that invokes every function leaf).
- `repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.cy.js`
  lines 156–238 — machine-draft Welsh for the Standard Address Block labels and errors that ins's address book shares
  word for word (`Llinell gyfeiriad 1`, `Tref neu ddinas`, `Sir (dewisol)`, `Rhaid i … fod yn N nod neu lai`, …).

Baseline (s06's landed ladder on `b62ae00`, `logs/s06-ci-fix-test.log`): unit suite **50 files / 285 tests green**,
`format:check` clean, `lint` clean, Playwright **49/49** green. Expected after this stage: **56 files / 324 tests**
(§5 arithmetic), Playwright still **49/49**.

This stage creates the copy seam (`copy.js`, `copy-leaves.js`, `copy.en.js`, `copy.cy.js` under `app/shared/`), the
two suite-wide guards, and one `copy/` folder per feature; then moves every user-facing string out of the six
templates, the seven controllers, `fields.js`, `address-countries.js`, the dashboard view-model, `errors.js` and the
unauthorised page into those modules. **Every English string renders byte-for-byte as it did**; the Welsh is
machine-draft and unreachable until a locale toggle is wired (every call site resolves `en`). 1 file is renamed (+ its
test) and both edited; 14 files are created (6 under `app/shared/`, 2 at `app/`, 3 per feature); 21 files are edited
in place. The public URL surface, every `data-testid`, the `id="address-book-success-banner"` hook and the whole
Playwright suite are unchanged.

---

## 0. Decisions (made here so the implementor never has to choose)

| # | Question the brief left open | Decision |
|---|---|---|
| D1 | Where `copy-convention.test.js` and `copy-parity.test.js` live. The brief and the programme's `targetTree` say `src/server/`; the reference paths in the stage point at `src/server/copy-*.test.js` **which do not exist** — both journeys keep them at `src/server/app/`. | **`src/server/app/`**, beside `routes.js`, as both journeys do. Their imports are then plants' verbatim minus the `sets/…` path (`./shared/copy-leaves.js`, `./features`). The stage note records that `targetTree`'s `src/server/copy-*.test.js` was a transcription of the brief, not of the journeys, and that ins follows the journeys. |
| D2 | What the shared `layout` namespace carries. Plants' has `serviceName`, `errorTitlePrefix`, `back`, `phaseBanner`, `serviceNavigation`, `footer`; ins's layout today renders only the three footer labels as literals, the three `{id}` templates render `"Back"`, and the service name comes from convict (`config.get('serviceName')` → `'trade-imports-ins-frontend'`, pinned by `errors.test.js`). | **Only what ins renders after this stage: `layout.back` and `layout.footer`.** No dead copy: `serviceName`, `errorTitlePrefix`, `phaseBanner` and `serviceNavigation` arrive with s09's DR1 layout, which is the stage that renders them. The `<title>` keeps reading the convict `serviceName` (config, not copy; s09 decides). `build-navigation.js`'s `'Dashboard'` / `'Address book'` labels are **not** moved: they feed `context.js`, which s09 replaces with plants' inline `sharedCopy.layout.serviceNavigation` — moving them now means an app → config import for one stage. Recorded as an s09 handoff together with s06's deferred hard-coded `/address-book` href in the same file. |
| D3 | The error page's messages (`errors.js` `statusCodeMessage`: `'Page not found'`, `'Forbidden'`, `'Unauthorized'`, `'Bad Request'`, `'Something went wrong'`). Neither journey has moved these into copy; the brief says shared copy holds "error page strings". | **Moved — `sharedCopy.errorPage.{notFound, forbidden, unauthorized, badRequest, unexpected}`**, looked up through a status-code → key map in `errors.js` (E4). The English stays byte-identical, including the non-GDS capitalisation of `'Bad Request'` and the American `'Unauthorized'` — this is a move, not a copy edit (invariant 2); flagged for the s13 report as copy the team may want to revisit, and for s12 as a divergence from animals' `errors.js` (ins is now ahead of both journeys here). |
| D4 | The unauthorised page's title. ins sets `pageTitle = "Unable to sign in"` in the template; plants' `sharedCopy.unauthorised.title` is `'Sorry, we are unable to sign you in'`. | **ins keeps `'Unable to sign in'`** (behaviour preserved) in `sharedCopy.unauthorised.title`; heading, `bodyPrefix` and `signInLinkText` are plants' words, which ins already renders. The four `h.view('auth/unauthorised')` calls in `src/server/auth/controller.js` become `h.view('auth/unauthorised', base(sharedCopy.unauthorised.title))` (plants line 29) — necessary, not optional: after E2 the layout's footer reads `sharedCopy`, and a view rendered with no view model would render three empty footer links. |
| D5 | Where each module resolves its copy. | **Plants' idiom, per module: `const copy = copyFor({ en, cy })`** at the top of every controller that renders, plus `fields.js` (its joi messages) — seven resolutions of the address-book pair, one of the dashboard pair. No `copy/index.js`, no feature-level singleton: that would be a shape neither journey has. The kit resolves `sharedCopy` once (plants lines 17–23) and `errors.js` and `auth/controller.js` import it from there. |
| D6 | The dashboard heading's caption `"trade-imports-ins-frontend"` (a CDP-template leftover, the repo name). It cannot be copy (no Welsh, and the parity test refuses an untranslated leaf) and deleting it is a visible change. | **`caption: serviceName`** — the convict service name the layout already renders in `<title>`, whose default is exactly `'trade-imports-ins-frontend'`. Rendered output is byte-identical; the string is config, not copy; s09 decides whether the caption survives. |
| D7 | Parameterised strings: `Showing ${from}-${to} of ${count}` (both features), `${name} added to your address book` (three banners), `Name must be ${max} characters or fewer` (eight joi messages), `No addresses match "${q}".`. | **Function leaves** (`copy-leaves.js`'s `isCopyLeaf` allows them; the parity test pins arity), called in JS: `copy.results(from, to, total)` inside `buildResultsLabel` via an injected formatter (D8), `copy.successBanner.added(name)` in the controllers, `copy.errors.name.maxLength(FIELD_RULES.name.maxLength)` in `fields.js`. The **one exception** is the no-match sentence: `{{ copy.list.noMatch(q) }}` would autoescape the quotes the sentence wraps `q` in (`&quot;zzznomatch&quot;`), changing the rendered HTML and failing `list/controller.test.js`'s `'No addresses match "zzznomatch"'` pin. So it is a string leaf `noMatchPrefix: 'No addresses match'` and the template renders `{{ copy.list.noMatchPrefix }} "{{ q }}".` — the same split plants uses for `unauthorised.bodyPrefix` + link text. |
| D8 | `buildResultsLabel(pagination)` in both view-models builds `Showing …` itself. A view-model importing its feature's copy would be a second resolution site and would hide the string in a helper. | **The formatter is passed in**: `buildResultsLabel(pagination, format)` returns `null` for no results, else `format(from, to, total)`; the controller passes `copy.results` (dashboard) / `copy.list.results` (address book). Animals does the same (`buildPageResultsRangeLabel(pagination, rows.length, copy.pagination.results)`). Tests pass `copy.results` from `copy.en.js`. |
| D9 | `buildCountrySelectItems(countries)` prepends `{ value: '', text: 'Select a country' }` inside `address-countries.js`. | **Placeholder text is passed in**: `buildCountrySelectItems(countries, placeholder)`. Add and edit wrap it once as `countryItemsOf(countries)` with `copy.form.countryPlaceholder`. The helper stays pure; its test passes `'Select a country'`. |
| D10 | Sort options: `SORT_OPTIONS` in the dashboard view-model carries `value` (data the backend receives) and `text` (copy) side by side. | **`SORT_OPTIONS` keeps the values and names the copy key**: `{ value: 'arrivalDate,desc', copyKey: 'arrivalNewest' }` …; the controller's `sortOptionsOf(sort)` maps `text: copy.sort.options[copyKey]`. `dashboard/copy/copy.test.js` pins that every `copyKey` has a leaf in both locales' `sort.options` and nothing else does (plants' origin test does this for constraint ids). |
| D11 | The dashboard view-model's name — s06 D8 left `notification-dashboard-helper.js` for s07. | **`git mv` to `view-model/list.js`** (+ `list.test.js`), mirroring the address book's `view-model/list.js` from s06 D8: every export serves the list page; "helper" is a banned name. The content edit is small (D8, D10) so git renders it as a rename. |
| D12 | The dashboard controller's `function` declarations, `statusCodes` import, `listGet` name and exported `buildTableRows` — s05 D13, s06 D2/D14/D17 all deferred them to s07. | **All tidied now** (E7): arrows throughout, `HTTP_STATUS_INTERNAL_SERVER_ERROR` from `app/lib/http-status.js`, bare `get`, `buildTableRows` becomes the private `tableRowsOf` (nothing imports it — verified by grep). The dashboard template's `action="/"` / `href="/"` literals also come from the view model as `listHref: dashboardPath()` (s06 D13's rule, three occurrences). |
| D13 | The `heading` view-model key (s05/s06 kept `heading: PAGE_TITLE` beside `pageTitle` because copy did not exist). | **Dropped where it duplicated the title**: dashboard, list, add, edit, delete templates render `appHeading({ text: copy.title })` (per-page `copy.add.title` etc. for the address book). The **view** page keeps `heading: address.name` — that is data, not copy. |
| D14 | The view page's summary-list labels equal the form labels except `County` (the form says `County (optional)`; `view.fit.spec.js` pins both). | `copy.form.fields.*` for eight rows and **`copy.view.countyRowLabel`** for the ninth. One explicit key, no `?? fallback` logic. |
| D15 | Address-book copy structure: one flat module or per-page namespaces? | **Per-page namespaces inside one module** — `list`, `successBanner`, `form` (shared by add and edit: headings, the nine labels, phone hint, country placeholder), `add`, `edit`, `view`, `delete`, `errors` (three "Something went wrong" messages plus per-field `required` / `maxLength` / `format` / `fromList`). Animals' `transport` copy takes the same per-page shape. The feature is one copy module because the convention test expects one `copy/copy.en.js` per feature folder. |
| D16 | Welsh spelling. | Machine-draft, marked with plants' first-line comment verbatim. Reuse the journeys' Welsh wherever the English is identical (`Dangosfwrdd`, `Llyfr cyfeiriadau`, `Chwilio`, `Trefnu yn ôl`, `Diweddaru’r drefn`, `Ni chanfuwyd unrhyw hysbysiadau`, `Dechrau hysbysiad newydd`, `Gweld`, `Statws`, `Nwydd`, `Yn ôl`, `Mae problem`, `Dileu`, `Cadw a pharhau`, `Preifatrwydd` / `Cwcis` / `Datganiad hygyrchedd`, `Mae'n ddrwg gennym, ni allwn eich mewngofnodi.` / `Rhowch` / `gynnig arall arni`, the address labels and `Rhaid i … fod yn ${max} nod neu lai`). Typographic apostrophe `’` (U+2019) inside single-quoted strings, as animals writes it, so prettier never has to flip quote style; the one straight-apostrophe string is plants' `"Mae'n ddrwg gennym…"` kept verbatim in double quotes. `IDENTICAL_ALLOWLIST` is empty — every string leaf differs between locales. |
| D17 | `address-id-params.js`'s joi messages (`'Enter a valid address id'`). | **Left alone.** The route's `failAction` throws `Boom.notFound()` before any message could render; they are not user-facing. Likewise `'Country reference data is unavailable'` (a thrown `Error`, logged) and every `logger.error` string. |
| D18 | `kit.errorSummary()` and `shared/error-summary.njk` — s06 D16 left the inline `govukErrorSummary` blocks for s08. | **Still inline** (the error model is s08's). Only the literal changes: `titleText: sharedCopy.errorSummary.title` in the four templates that render one. `kit.js`'s `ERROR_SUMMARY_TITLE` constant goes; `errorSummary()` reads `sharedCopy.errorSummary.title` (plants line 93). |
| D19 | Controller tests assert English literals (`'Add address details'`, `'Enter a name'`, …). Plants' origin test imports `copy.en.js` and asserts `copy.errors.countryRequired`. | **Literals stay.** A literal pin catches a copy regression that a `copy.x` pin would wave through; the feature `copy.test.js` files pin the copy modules themselves. No controller test changes except where a signature moved (§5). |
| D20 | Function-leaf coverage. `copy.cy.js`'s arrow bodies are executed by nothing unless a test calls them, and SonarCloud measures new-code coverage. | Each feature `copy.test.js` walks **both** locales and, for a function leaf, calls it with sample arguments (`value(1, 2, 3)` — spare arguments are ignored, a one-argument leaf gets `1`) before asserting a non-empty string, as animals' dashboard `copy.test.js` does with `value('sample')`. The shared module has no function leaves. |
| D21 | Format. | Run `npm run format` once before the ladder — every new file below is written unwrapped and prettier decides the breaks (`singleQuote: true`, no semicolons, no trailing commas). Templates are not formatted (prettier globs are `.js`). |

---

## 1. Moves — every file that moves or is deleted

Paths relative to the ins repo root. Create the target directories first, one `mkdir -p` per Bash call:
`src/server/app/features/dashboard/copy` and `src/server/app/features/address-book/copy`.

| From | To | How |
|---|---|---|
| `src/server/app/features/dashboard/view-model/notification-dashboard-helper.js` | `src/server/app/features/dashboard/view-model/list.js` | `git mv`, then E8 |
| `src/server/app/features/dashboard/view-model/notification-dashboard-helper.test.js` | `src/server/app/features/dashboard/view-model/list.test.js` | `git mv`, then T1 |

Nothing is deleted. Nothing in `docker/`, `compose.yml`, `README.md`, `sonar-project.properties`, `Dockerfile`,
`nodemon.json`, `vite.config.js`, `playwright.config.js` or `.github/workflows/` names either path (verified by grep at
planning time: the only references are the two import lines E7 and T1 rewrite).

---

## 2. Edits — every file whose content changes

Every edit below gives the finished content or the exact hunk. Import order inside a controller follows plants'
origin controller: services → `lib/http-status` → `kit` → `copy` (the seam) → `paths` → chassis logger →
feature-local modules → the feature's `copy.en.js` / `copy.cy.js` last.

### E1 — `src/server/app/shared/kit.js`

Replace lines 1–11 (the imports, `routeOptions`, `sharedCopy = {}`, `LAYOUT`, `ERROR_SUMMARY_TITLE`) with:

```js
import Boom from '@hapi/boom'

import { organisationIdOf } from '../../common/helpers/organisation-id.js'
import { copyFor } from './copy.js'
import { copy as sharedEn } from './copy.en.js'
import { copy as sharedCy } from './copy.cy.js'

export const routeOptions = { auth: 'session' }

/**
 * The one resolved instance of the shared chrome copy. `base` puts it in
 * every view model; `src/server/common/helpers/errors.js` imports it from
 * here for the error page's message rather than re-wiring `copyFor`.
 */
export const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const LAYOUT = 'shared/layout.njk'
```

and in `errorSummary()` replace `titleText: ERROR_SUMMARY_TITLE,` with `titleText: sharedCopy.errorSummary.title,`.
Nothing else in the file changes (`base`, `requireOrganisationId`, `pageRoutes`, `fieldError` are untouched).

### E2 — `src/server/app/shared/layout.njk`

Only the footer block changes — the three literals become copy reads:

```njk
{% block footer %}
  {{ govukFooter({
    meta: {
      items: [
        {
          href: "https://www.gov.uk/help/privacy-notice",
          text: sharedCopy.layout.footer.privacy
        },
        {
          href: "https://www.gov.uk/help/cookies",
          text: sharedCopy.layout.footer.cookies
        },
        {
          href: "https://www.gov.uk/help/accessibility-statement",
          text: sharedCopy.layout.footer.accessibility
        }
      ]
    }
  }) }}
{% endblock %}
```

Everything else (header, `pageTitle` block reading the convict `serviceName`, `appServiceHeader`, breadcrumbs,
`{% block content %}`) stays exactly as it is — s09's.

### E3 — `src/server/app/auth/unauthorised.njk` — full content (plants' file with ins's `content` block name)

```njk
{% extends "shared/layout.njk" %}

{% set mainClasses = "govuk-main-wrapper--l" %}

{# Destination for the retry link. A destination, not copy, so it lives here
   rather than in copy.en.js/copy.cy.js — it is identical in both locales. #}
{% set signInUrl = "/auth/sign-in" %}

{% block content %}
  <h1 class="govuk-heading-l">{{ sharedCopy.unauthorised.heading }}</h1>
  <p class="govuk-body">{{ sharedCopy.unauthorised.bodyPrefix }} <a class="govuk-link" href="{{ signInUrl }}">{{ sharedCopy.unauthorised.signInLinkText }}</a>.</p>
{% endblock %}
```

The `{% set pageTitle = "Unable to sign in" %}` line goes — `base()` now supplies `pageTitle` (E5).

### E4 — `src/server/common/helpers/errors.js` — full content

```js
import { statusCodes } from '../constants/status-codes.js'
import { base, sharedCopy } from '../../app/shared/kit.js'

const ERROR_PAGE_COPY_KEY = {
  [statusCodes.notFound]: 'notFound',
  [statusCodes.forbidden]: 'forbidden',
  [statusCodes.unauthorized]: 'unauthorized',
  [statusCodes.badRequest]: 'badRequest'
}

const errorMessageFor = (statusCode) =>
  sharedCopy.errorPage[ERROR_PAGE_COPY_KEY[statusCode] ?? 'unexpected']

export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const errorMessage = errorMessageFor(statusCode)

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

`errors.test.js` needs no change: every expectation is a literal that still renders (`'Page not found'`,
`'Something went wrong'`, `'Forbidden'`, `'Unauthorized'`, `'Bad Request'`, and the `imATeapot` default).

### E5 — `src/server/auth/controller.js`

Add after line 5 (`import { getSafeRedirect } …`):

```js
import { base, sharedCopy } from '../app/shared/kit.js'
```

and replace each of the four `return h.view('auth/unauthorised')` (lines 28, 38, 49, 69) with

```js
        return h.view('auth/unauthorised', base(sharedCopy.unauthorised.title))
```

Nothing else changes — the comments, the `organisationId` guard and the `getPermissions` try/catch are ins's and stay.
`auth/controller.test.js` needs no change: it asserts `'Sorry, we are unable to sign you in'`, which
`sharedCopy.unauthorised.heading` renders.

### E6 — `src/server/app/features/dashboard/template.njk` — full content

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/pagination/macro.njk" import govukPagination %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/select/macro.njk" import govukSelect %}

{% block content %}

  {{ appHeading({
    text: copy.title,
    caption: serviceName
  }) }}

  <div class="govuk-body" data-testid="app-page-body">

    {% if errorList %}
      {{ govukErrorSummary({
        titleText: sharedCopy.errorSummary.title,
        errorList: errorList
      }) }}
    {% endif %}

    <form method="get" action="{{ listHref }}" class="govuk-!-margin-bottom-6">
      <input type="hidden" name="sort" value="{{ sort }}" />
      {{ govukInput({
        label: {
          text: copy.search.label
        },
        id: "referenceNumber",
        name: "referenceNumber",
        type: "search",
        value: referenceNumber,
        classes: "govuk-!-width-two-thirds"
      }) }}
      {{ govukButton({
        text: copy.search.button,
        classes: "govuk-!-margin-left-2"
      }) }}
    </form>

    {% if tableRows.length %}
      <form method="get" action="{{ listHref }}" class="govuk-!-margin-bottom-6">
        <input type="hidden" name="referenceNumber" value="{{ referenceNumber }}" />
        {{ govukSelect({
          id: "sort",
          name: "sort",
          label: {
            text: copy.sort.label
          },
          items: sortOptions
        }) }}
        {{ govukButton({
          text: copy.sort.update,
          classes: "govuk-button--secondary"
        }) }}
      </form>
    {% endif %}

    {% if isEmpty %}
      <p class="govuk-body" data-testid="dashboard-empty">{{ copy.empty.text }}</p>
      {{ govukButton({
        text: copy.empty.startButton,
        href: startNewNotificationHref
      }) }}
    {% elif noSearchResults %}
      <p class="govuk-body" data-testid="dashboard-no-results">{{ copy.search.noResults }}</p>
      <p class="govuk-body">
        <a class="govuk-link" href="{{ listHref }}">{{ copy.search.clear }}</a>
      </p>
    {% elif tableRows.length %}
      {% if resultsLabel %}
        <p class="govuk-body govuk-!-margin-bottom-4" data-testid="dashboard-results-label">
          {{ resultsLabel }}
        </p>
      {% endif %}

      {% if hasSearch %}
        <p class="govuk-body govuk-!-margin-bottom-4">
          <a class="govuk-link" href="{{ listHref }}" data-testid="dashboard-clear-search">{{ copy.search.clear }}</a>
        </p>
      {% endif %}

      {{ govukTable({
        caption: copy.table.caption,
        captionClasses: "govuk-visually-hidden",
        head: [
          { text: copy.table.reference },
          { text: copy.table.status },
          { text: copy.table.origin },
          { text: copy.table.commodity },
          { text: copy.table.arrival },
          { html: '<span class="govuk-visually-hidden">' + copy.table.action + '</span>' }
        ],
        rows: tableRows
      }) }}

      {% if pagination %}
        {{ govukPagination(pagination) }}
      {% endif %}
    {% endif %}

  </div>

{% endblock %}
```

### E7 — `src/server/app/features/dashboard/controller.js` — full content

```js
import { getCountries } from '../../services/countries/index.js'
import { listNotifications } from '../../services/ins-backend/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../lib/http-status.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { dashboardPath } from '../../shared/paths.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import {
  SORT_OPTIONS,
  buildPaginationLinks,
  buildResultsLabel,
  buildStartNewNotificationLink,
  mapNotificationRows
} from './view-model/list.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const logger = createLogger()
const view = 'dashboard/template'
const copy = copyFor({ en, cy })
const DEFAULT_SORT = SORT_OPTIONS[0].value
const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))

const parsePage = (queryPage) => {
  const page = Number.parseInt(queryPage, 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

const parseSort = (querySort) =>
  SORT_VALUES.has(querySort) ? querySort : DEFAULT_SORT

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')

const countryNamesOf = (countries) =>
  Object.fromEntries(countries.map((country) => [country.code, country.name]))

const sortOptionsOf = (sort) =>
  SORT_OPTIONS.map(({ value, copyKey }) => ({
    value,
    text: copy.sort.options[copyKey],
    selected: value === sort
  }))

const viewLink = (notification) =>
  `<a class="govuk-link" href="${notification.href}">${copy.table.view}<span class="govuk-visually-hidden"> ${escapeHtml(notification.referenceNumber)}</span></a>`

const tableRowsOf = (notifications) =>
  notifications.map((notification) => [
    { text: notification.referenceNumber },
    { text: notification.status },
    { text: notification.originCountry },
    { text: notification.commodity },
    { text: notification.arrivalDate },
    { html: viewLink(notification) }
  ])

const paginationOf = (response) => ({
  page: response.page,
  size: response.size,
  totalElements: response.totalElements,
  totalPages: response.totalPages
})

const buildView = (h, { sort, referenceNumber, hasSearch }, model) =>
  h.view(view, {
    ...kit.base(copy.title),
    copy,
    listHref: dashboardPath(),
    sort,
    sortOptions: sortOptionsOf(sort),
    referenceNumber,
    hasSearch,
    startNewNotificationHref: buildStartNewNotificationLink(),
    ...model
  })

const get = async (request, h) => {
  const page = parsePage(request.query.page)
  const sort = parseSort(request.query.sort)
  const referenceNumber = request.query.referenceNumber?.trim() ?? ''
  const hasSearch = Boolean(referenceNumber)
  const query = { sort, referenceNumber, hasSearch }

  try {
    const countries = await getCountries()
    const response = await listNotifications({
      page,
      sort,
      referenceNumber: hasSearch ? referenceNumber : undefined
    })
    const pagination = paginationOf(response)
    const notifications = mapNotificationRows(
      response.content ?? [],
      countryNamesOf(countries ?? [])
    )

    return buildView(h, query, {
      tableRows: tableRowsOf(notifications),
      resultsLabel: buildResultsLabel(pagination, copy.results),
      pagination: buildPaginationLinks(pagination, { sort, referenceNumber }),
      isEmpty: response.totalElements === 0 && !hasSearch,
      noSearchResults: response.totalElements === 0 && hasSearch
    })
  } catch (err) {
    logger.error({ err }, 'Failed to load dashboard')
    return buildView(h, query, {
      tableRows: [],
      resultsLabel: null,
      pagination: null,
      isEmpty: false,
      noSearchResults: false,
      errorList: [{ text: copy.errors.load }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(dashboardPath(), { get })
```

What is behaviourally identical to today: the page/sort parsing, the backend query, the country-name map, the row
shape, the `View` link HTML (same text, same hidden span), the error path's 500 + error list. What changed and why:
`copy` in the view model, `listHref`, the `heading` key gone (D13), the view model assembled once by `buildView`
(s06's controller shape), arrows instead of `function` (D12), `HTTP_STATUS_INTERNAL_SERVER_ERROR` (D12).

### E8 — `src/server/app/features/dashboard/view-model/list.js` (renamed from `notification-dashboard-helper.js`)

Three hunks on the moved file:

(a) `SORT_OPTIONS` (lines 8–13) becomes:

```js
export const SORT_OPTIONS = [
  { value: 'arrivalDate,desc', copyKey: 'arrivalNewest' },
  { value: 'arrivalDate,asc', copyKey: 'arrivalOldest' },
  { value: 'lastUpdated,desc', copyKey: 'updatedNewest' },
  { value: 'lastUpdated,asc', copyKey: 'updatedOldest' }
]
```

(b) `buildResultsLabel` (lines 61–68) becomes:

```js
/** The results range for the current page, in the copy's words, or null with no results. */
export function buildResultsLabel(pagination, format) {
  if (pagination.totalElements < 1) {
    return null
  }
  const { from, to, count } = pageRange(pagination)
  return format(from, to, count)
}
```

(c) nothing else. `formatDisplayDate`, `buildDashboardQueryString`, `buildPaginationLinks`, `buildNotificationLink`,
`buildStartNewNotificationLink`, `mapNotificationRows` and the `config` import are untouched; the `function`
declarations in this file are **not** restyled (keep the rename detectable — the file is small and D12's tidy is the
controller's).

### E9 — `src/server/app/features/address-book/fields.js`

Add after `import Joi from 'joi'`:

```js
import { copyFor } from '../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
```

and after `export const formValuesOf = …`:

```js
const { errors } = copyFor({ en, cy })
```

then replace every `.messages({ … })` literal, builder by builder, with the copy reads (the `Joi` chains, `FIELD_RULES`
reads and `email({ tlds: { allow: false } })` are untouched):

```js
const nameSchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.name.maxLength)
    .messages({
      'string.empty': errors.name.required,
      'any.required': errors.name.required,
      'string.max': errors.name.maxLength(FIELD_RULES.name.maxLength)
    })

const addressLine1Schema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.addressLine1.maxLength)
    .messages({
      'string.empty': errors.addressLine1.required,
      'any.required': errors.addressLine1.required,
      'string.max': errors.addressLine1.maxLength(
        FIELD_RULES.addressLine1.maxLength
      )
    })

const addressLine2Schema = () =>
  Joi.string()
    .trim()
    .allow('')
    .max(FIELD_RULES.addressLine2.maxLength)
    .messages({
      'string.max': errors.addressLine2.maxLength(
        FIELD_RULES.addressLine2.maxLength
      )
    })

const townOrCitySchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.townOrCity.maxLength)
    .messages({
      'string.empty': errors.townOrCity.required,
      'any.required': errors.townOrCity.required,
      'string.max': errors.townOrCity.maxLength(FIELD_RULES.townOrCity.maxLength)
    })

const countySchema = () =>
  Joi.string()
    .trim()
    .allow('')
    .max(FIELD_RULES.county.maxLength)
    .messages({
      'string.max': errors.county.maxLength(FIELD_RULES.county.maxLength)
    })

const postcodeSchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.postcode.maxLength)
    .messages({
      'string.empty': errors.postcode.required,
      'any.required': errors.postcode.required,
      'string.max': errors.postcode.maxLength(FIELD_RULES.postcode.maxLength)
    })

const countryCodeSchema = (mdmCountryCodes) =>
  Joi.string()
    .trim()
    .required()
    .valid(...mdmCountryCodes)
    .messages({
      'string.empty': errors.countryCode.required,
      'any.required': errors.countryCode.required,
      'any.only': errors.countryCode.fromList
    })

const phoneSchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.phone.maxLength)
    .messages({
      'string.empty': errors.phone.required,
      'any.required': errors.phone.required,
      'string.max': errors.phone.maxLength(FIELD_RULES.phone.maxLength)
    })

const emailSchema = () =>
  Joi.string()
    .trim()
    .required()
    .email({ tlds: { allow: false } })
    .max(FIELD_RULES.email.maxLength)
    .messages({
      'string.empty': errors.email.required,
      'any.required': errors.email.required,
      'string.email': errors.email.format,
      'string.max': errors.email.maxLength(FIELD_RULES.email.maxLength)
    })
```

`crumbSchema`, `buildAddressSchema`, `fieldNameOf` and `formatValidationErrors` are untouched. The rendered messages
are byte-identical (`fit/address-form.js`'s `requiredValidations` and `maxLengthValidations` tables pin all fifteen
in the browser).

### E10 — `src/server/app/features/address-book/address-countries.js`

Replace `buildCountrySelectItems` (lines 24–29) with:

```js
export function buildCountrySelectItems(countries, placeholder) {
  return [{ value: '', text: placeholder }, ...buildCountryItems(countries)]
}
```

Nothing else changes (the `'Country reference data is unavailable'` throw is not user-facing, D17).

### E11 — `src/server/app/features/address-book/list/controller.js` — full content

```js
import { listAddresses } from '../../../services/address-book/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../lib/http-status.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
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
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/list/template'
const copy = copyFor({ en, cy })

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
  `<a class="govuk-link" href="${addressPath(address.id)}">${copy.list.table.view}<span class="govuk-visually-hidden"> ${escapeHtml(address.name)}</span></a>`

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
    ...kit.base(copy.list.title),
    copy,
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
      resultsLabel: buildResultsLabel(pagination, copy.list.results),
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
      errorList: [{ text: copy.errors.loadList }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressBookPath(), { get })
```

Diff against today: the three copy imports and `const copy`, `PAGE_TITLE` gone, `'View'` → `copy.list.table.view`,
`kit.base(copy.list.title)` + `copy` replacing `kit.base(PAGE_TITLE)` + `heading`, `buildResultsLabel(pagination,
copy.list.results)`, `copy.errors.loadList`. Everything else is the s06 file.

### E12 — `src/server/app/features/address-book/list/template.njk` — full content

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/pagination/macro.njk" import govukPagination %}
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/input/macro.njk" import govukInput %}

{% block content %}

  {{ appHeading({ text: copy.list.title }) }}

  <div class="govuk-body" data-testid="app-page-body">

    {% if successBanner %}
      {{ govukNotificationBanner({
        type: "success",
        titleText: copy.successBanner.title,
        text: successBanner,
        attributes: {
          id: "address-book-success-banner"
        }
      }) }}
    {% endif %}

    {% if errorList %}
      {{ govukErrorSummary({
        titleText: sharedCopy.errorSummary.title,
        errorList: errorList
      }) }}
    {% endif %}

    <p class="govuk-body">{{ copy.list.intro }}</p>

    <form method="get" action="{{ listHref }}" class="govuk-!-margin-bottom-6">
      {{ govukInput({
        label: {
          text: copy.list.search.label,
          hint: copy.list.search.hint
        },
        id: "q",
        name: "q",
        type: "search",
        value: q,
        classes: "govuk-!-width-two-thirds"
      }) }}
      {{ govukButton({
        text: copy.list.search.button,
        classes: "govuk-!-margin-left-2"
      }) }}
    </form>

    <div class="govuk-!-margin-bottom-6">
      {{ govukButton({
        text: copy.list.add,
        href: addHref
      }) }}
    </div>

    {% if isEmpty %}
      <p class="govuk-body">{{ copy.list.empty }}</p>
    {% elif noSearchResults %}
      <p class="govuk-body">{{ copy.list.noMatchPrefix }} "{{ q }}".</p>
      <p class="govuk-body">
        <a class="govuk-link" href="{{ listHref }}">{{ copy.list.search.clear }}</a>
      </p>
    {% elif tableRows.length %}
      {% if resultsLabel %}
        <p class="govuk-body govuk-!-margin-bottom-4" data-testid="address-book-results-label">
          {{ resultsLabel }}
        </p>
      {% endif %}

      {% if hasSearch %}
        <p class="govuk-body govuk-!-margin-bottom-4">
          <a class="govuk-link" href="{{ listHref }}" data-testid="address-book-clear-search">{{ copy.list.search.clear }}</a>
        </p>
      {% endif %}

      {{ govukTable({
        head: [
          { text: copy.list.table.name },
          { text: copy.list.table.address },
          { text: copy.list.table.country },
          { html: '<span class="govuk-visually-hidden">' + copy.list.table.action + '</span>' }
        ],
        rows: tableRows
      }) }}

      {% if pagination %}
        {{ govukPagination(pagination) }}
      {% endif %}
    {% endif %}

  </div>

{% endblock %}
```

(The `label.hint` key on `govukInput` is what the template passes today; it is kept as it is — whether govuk-frontend
honours a hint nested in `label` is s09's question, not a copy one.)

### E13 — `src/server/app/features/address-book/add/controller.js` — full content

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
import { copyFor } from '../../../shared/copy.js'
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
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/add/template'
const copy = copyFor({ en, cy })

const countryItemsOf = (countries) =>
  buildCountrySelectItems(countries, copy.form.countryPlaceholder)

const buildView = (h, { formValues, countryItems, errorList, fieldErrors }) =>
  h.view(view, {
    ...kit.base(copy.add.title),
    copy,
    formValues,
    countryItems,
    errorList,
    fieldErrors
  })

const countryItemsOrNone = async () =>
  countryItemsOf(await getAddressFormCountries().catch(() => []))

const get = async (_request, h) => {
  try {
    const countries = await getAddressFormCountries()
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: countryItemsOf(countries)
    })
  } catch (err) {
    logger.error({ err }, 'Failed to load address form countries')
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: [],
      errorList: [{ text: copy.errors.loadForm }]
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
        countryItems: countryItemsOf(countries),
        ...formatValidationErrors(error)
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const created = await createAddress(orgId, value)
    setSuccessBanner(request, copy.successBanner.added(created.name))
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
      errorList: [{ text: copy.errors.save }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
```

### E14 — `src/server/app/features/address-book/add/template.njk` — full content

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/select/macro.njk" import govukSelect %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block content %}

  {{ appHeading({ text: copy.add.title }) }}

  <div class="govuk-body" data-testid="app-page-body">

    {% if errorList %}
      {{ govukErrorSummary({
        titleText: sharedCopy.errorSummary.title,
        errorList: errorList
      }) }}
    {% endif %}

    <form method="post" novalidate>
      <input type="hidden" name="crumb" value="{{ crumb }}" />

      <h2 class="govuk-heading-m">{{ copy.form.addressHeading }}</h2>

      {{ govukInput({
        label: { text: copy.form.fields.name },
        id: "name",
        name: "name",
        value: formValues.name,
        errorMessage: fieldErrors.name if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.addressLine1 },
        id: "addressLine1",
        name: "addressLine1",
        value: formValues.addressLine1,
        errorMessage: fieldErrors.addressLine1 if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.addressLine2 },
        id: "addressLine2",
        name: "addressLine2",
        value: formValues.addressLine2,
        errorMessage: fieldErrors.addressLine2 if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.townOrCity },
        id: "townOrCity",
        name: "townOrCity",
        value: formValues.townOrCity,
        classes: "govuk-!-width-one-half",
        errorMessage: fieldErrors.townOrCity if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.county },
        id: "county",
        name: "county",
        value: formValues.county,
        classes: "govuk-!-width-one-half",
        errorMessage: fieldErrors.county if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.postcode },
        id: "postcode",
        name: "postcode",
        value: formValues.postcode,
        classes: "govuk-!-width-one-half",
        errorMessage: fieldErrors.postcode if fieldErrors
      }) }}

      {{ govukSelect({
        id: "countryCode",
        name: "countryCode",
        label: { text: copy.form.fields.countryCode },
        items: countryItems,
        value: formValues.countryCode,
        classes: "govuk-!-width-one-half",
        errorMessage: fieldErrors.countryCode if fieldErrors
      }) }}

      <h2 class="govuk-heading-m">{{ copy.form.contactHeading }}</h2>

      {{ govukInput({
        label: { text: copy.form.fields.email },
        id: "email",
        name: "email",
        value: formValues.email,
        autocomplete: "email",
        errorMessage: fieldErrors.email if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.phone },
        id: "phone",
        name: "phone",
        value: formValues.phone,
        classes: "govuk-!-width-one-half",
        hint: {
          text: copy.form.phoneHint
        },
        errorMessage: fieldErrors.phone if fieldErrors
      }) }}

      <div class="govuk-button-group">
        {{ govukButton({ text: copy.add.save }) }}
        {{ govukButton({
          text: copy.add.cancel,
          name: "cancel",
          value: "true",
          classes: "govuk-button--secondary"
        }) }}
      </div>

    </form>

  </div>

{% endblock %}
```

### E15 — `src/server/app/features/address-book/edit/controller.js` — full content

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
import { copyFor } from '../../../shared/copy.js'
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
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/edit/template'
const copy = copyFor({ en, cy })

const countryItemsOf = (countries) =>
  buildCountrySelectItems(countries, copy.form.countryPlaceholder)

const buildView = (
  h,
  { id, formValues, countryItems, errorList, fieldErrors }
) =>
  h.view(view, {
    ...kit.base(copy.edit.title, { backLink: addressPath(id) }),
    copy,
    formValues,
    countryItems,
    errorList,
    fieldErrors
  })

const countryItemsOrNone = async () =>
  countryItemsOf(await getAddressFormCountries().catch(() => []))

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
      countryItems: countryItemsOf(countries)
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
        countryItems: countryItemsOf(countries),
        ...formatValidationErrors(error)
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const updated = await updateAddress(orgId, id, value)
    setSuccessBanner(request, copy.successBanner.updated(updated.name))
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
        errorList: [{ text: copy.errors.save }]
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

### E16 — `src/server/app/features/address-book/edit/template.njk` — full content

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/select/macro.njk" import govukSelect %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}

{% block content %}

  {{ govukBackLink({
    text: sharedCopy.layout.back,
    href: backLink
  }) }}

  {{ appHeading({ text: copy.edit.title }) }}

  <div class="govuk-body" data-testid="app-page-body">

    {% if errorList %}
      {{ govukErrorSummary({
        titleText: sharedCopy.errorSummary.title,
        errorList: errorList
      }) }}
    {% endif %}

    <form method="post" novalidate>
      <input type="hidden" name="crumb" value="{{ crumb }}" />

      {{ govukInput({
        label: { text: copy.form.fields.name },
        id: "name",
        name: "name",
        value: formValues.name,
        classes: "govuk-!-width-two-thirds",
        errorMessage: fieldErrors.name if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.addressLine1 },
        id: "addressLine1",
        name: "addressLine1",
        value: formValues.addressLine1,
        classes: "govuk-!-width-two-thirds",
        errorMessage: fieldErrors.addressLine1 if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.addressLine2 },
        id: "addressLine2",
        name: "addressLine2",
        value: formValues.addressLine2,
        classes: "govuk-!-width-two-thirds",
        errorMessage: fieldErrors.addressLine2 if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.townOrCity },
        id: "townOrCity",
        name: "townOrCity",
        value: formValues.townOrCity,
        classes: "govuk-!-width-two-thirds",
        errorMessage: fieldErrors.townOrCity if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.county },
        id: "county",
        name: "county",
        value: formValues.county,
        classes: "govuk-!-width-two-thirds",
        errorMessage: fieldErrors.county if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.postcode },
        id: "postcode",
        name: "postcode",
        value: formValues.postcode,
        classes: "govuk-input--width-10",
        errorMessage: fieldErrors.postcode if fieldErrors
      }) }}

      {{ govukSelect({
        id: "countryCode",
        name: "countryCode",
        label: { text: copy.form.fields.countryCode },
        items: countryItems,
        value: formValues.countryCode,
        errorMessage: fieldErrors.countryCode if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.phone },
        id: "phone",
        name: "phone",
        value: formValues.phone,
        classes: "govuk-!-width-two-thirds",
        hint: {
          text: copy.form.phoneHint
        },
        errorMessage: fieldErrors.phone if fieldErrors
      }) }}

      {{ govukInput({
        label: { text: copy.form.fields.email },
        id: "email",
        name: "email",
        value: formValues.email,
        classes: "govuk-!-width-two-thirds",
        autocomplete: "email",
        errorMessage: fieldErrors.email if fieldErrors
      }) }}

      <div class="govuk-button-group">
        {{ govukButton({ text: copy.edit.save }) }}
        {{ govukButton({
          text: copy.edit.cancel,
          name: "cancel",
          value: "true",
          classes: "govuk-button--secondary"
        }) }}
      </div>

    </form>

  </div>

{% endblock %}
```

(Edit's field order — phone before email, no headings — is what it renders today and stays; s09 reconciles the two
forms if Design release 1 says so.)

### E17 — `src/server/app/features/address-book/view/controller.js` — full content

```js
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
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
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/view/template'
const copy = copyFor({ en, cy })

export const buildRows = (address, countryName) => [
  { key: { text: copy.form.fields.name }, value: { text: address.name } },
  {
    key: { text: copy.form.fields.addressLine1 },
    value: { text: address.addressLine1 }
  },
  {
    key: { text: copy.form.fields.addressLine2 },
    value: { text: address.addressLine2 }
  },
  {
    key: { text: copy.form.fields.townOrCity },
    value: { text: address.townOrCity }
  },
  { key: { text: copy.view.countyRowLabel }, value: { text: address.county } },
  { key: { text: copy.form.fields.postcode }, value: { text: address.postcode } },
  {
    key: { text: copy.form.fields.countryCode },
    value: { text: countryName ?? address.countryCode }
  },
  { key: { text: copy.form.fields.email }, value: { text: address.email } },
  { key: { text: copy.form.fields.phone }, value: { text: address.phone } }
]

const countryNameOf = (countries, countryCode) =>
  countries.find((country) => country.code === countryCode)?.name ?? countryCode

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await loadStoredAddress(orgId, id)
    const countries = await getAddressFormCountries().catch(() => [])
    return h.view(view, {
      ...kit.base(address.name, { backLink: addressBookPath() }),
      copy,
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

### E18 — `src/server/app/features/address-book/view/template.njk` — full content

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}

{% block content %}

  {{ govukBackLink({
    text: sharedCopy.layout.back,
    href: backLink
  }) }}

  {{ appHeading({ text: heading }) }}

  <div class="govuk-body" data-testid="app-page-body">

    {{ govukSummaryList({
      rows: summaryRows
    }) }}

    <div class="govuk-button-group">
      {{ govukButton({
        text: copy.view.edit,
        href: editHref
      }) }}
      {{ govukButton({
        text: copy.view.delete,
        href: deleteHref,
        classes: "govuk-button--warning"
      }) }}
    </div>

  </div>

{% endblock %}
```

### E19 — `src/server/app/features/address-book/delete/controller.js` — full content

```js
import { deleteAddress } from '../../../services/address-book/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressBookPath,
  addressDeleteRoutePath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { addressIdRouteOptions } from '../address-id-params.js'
import { boomFor, loadStoredAddress } from '../stored-address.js'
import { setSuccessBanner } from '../success-banner.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/delete/template'
const copy = copyFor({ en, cy })

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await loadStoredAddress(orgId, id)
    return h.view(view, {
      ...kit.base(copy.delete.title, { backLink: addressPath(id) }),
      copy,
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
    setSuccessBanner(request, copy.successBanner.deleted(address.name))
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

### E20 — `src/server/app/features/address-book/delete/template.njk` — full content

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}

{% block content %}

  {{ govukBackLink({
    text: sharedCopy.layout.back,
    href: backLink
  }) }}

  {{ appHeading({ text: copy.delete.title }) }}

  <div class="govuk-body" data-testid="app-page-body">

    <p class="govuk-body">
      {{ copy.delete.confirmPrefix }} <strong>{{ addressName }}</strong> {{ copy.delete.confirmSuffix }}
    </p>

    <form method="post" novalidate>
      <input type="hidden" name="crumb" value="{{ crumb }}" />
      <div class="govuk-button-group">
        {{ govukButton({
          text: copy.delete.confirm,
          classes: "govuk-button--warning"
        }) }}
        {{ govukButton({
          text: copy.delete.cancel,
          name: "cancel",
          value: "true",
          classes: "govuk-button--secondary"
        }) }}
      </div>
    </form>

  </div>

{% endblock %}
```

The rendered sentence is `Are you sure you want to delete <strong>X</strong> from your address book?` — the same
characters, the same whitespace either side of the `<strong>`; `delete.fit.spec.js`'s `getByText` normalises
whitespace and keeps passing.

### E21 — `src/server/app/features/address-book/view-model/list.js`

Replace `buildResultsLabel` (lines 21–34) with:

```js
export const buildResultsLabel = (
  { page, pageSize, totalItems, totalPages },
  format
) => {
  if (totalItems < 1) {
    return null
  }
  const currentPage = clampPage(page, totalPages)
  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)
  return format(from, to, totalItems)
}
```

Nothing else changes.

### E22 — `src/server/app/shared/kit.test.js` — no change

`base('Dashboard')` still equals `{ …, sharedCopy, … }` (the imported instance) and `errorSummary()` still titles
itself `'There is a problem'`. Listed so the implementor does not go looking.

---

## 3. New files — full content, with the reference file each imitates

### N1 — `src/server/app/shared/copy.js` (plants' file, verbatim)

```js
const DEFAULT_LOCALE = 'en'

/**
 * Resolve a feature's copy module for a locale, falling back to English.
 *
 * The i18n seam: each feature owns `copy.<locale>.js` modules beside its
 * controller and passes them here as `{ en, cy, ... }`. Both locale bundles
 * exist and `copy-parity.test.js` keeps them structure-identical; every
 * `copy.cy.js` is machine-draft Welsh awaiting translator sign-off. Every
 * call site resolves `en` because no locale toggle is wired yet — locale
 * selection (cookie, language toggle) plugs in via the `locale` argument.
 *
 * @param {Record<string, object>} locales - copy modules keyed by locale.
 * @param {string} [locale=en] - the locale to resolve.
 * @returns {object} the locale's copy module, or English when unknown.
 */
export const copyFor = (locales, locale = DEFAULT_LOCALE) =>
  locales[locale] ?? locales[DEFAULT_LOCALE]
```

### N2 — `src/server/app/shared/copy-leaves.js` (plants' file, verbatim)

```js
/**
 * Walk a copy module and return its leaves as `{ path, value }` entries.
 * A leaf is anything that is not a plain object/array node: a string, or
 * a string-returning function (the parameterised-copy convention).
 * @param {object} node - the copy-module node to walk.
 * @param {string[]} [path=[]] - internal recursion accumulator; omit when calling.
 * @returns {{ path: string, value: * }[]}
 */
export const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

/** True when a leaf value satisfies the copy convention. */
export const isCopyLeaf = (value) =>
  typeof value === 'function' ||
  (typeof value === 'string' && value.trim().length > 0)
```

### N3 — `src/server/app/shared/copy.en.js` (plants' shape, ins's namespaces — D2, D3, D4)

```js
/**
 * Shared chrome copy — the only copy that legitimately lives outside a
 * feature folder: the layout (back link, footer), the unauthorised page,
 * the error-summary title and the error page's messages. Every view reaches
 * it as `sharedCopy` via `kit.base`; `errors.js` imports it from the kit.
 */
export const copy = {
  layout: {
    back: 'Back',
    footer: {
      privacy: 'Privacy',
      cookies: 'Cookies',
      accessibility: 'Accessibility statement'
    }
  },
  unauthorised: {
    title: 'Unable to sign in',
    heading: 'Sorry, we are unable to sign you in.',
    bodyPrefix: 'Please',
    signInLinkText: 'try again'
  },
  errorSummary: {
    title: 'There is a problem'
  },
  errorPage: {
    notFound: 'Page not found',
    forbidden: 'Forbidden',
    unauthorized: 'Unauthorized',
    badRequest: 'Bad Request',
    unexpected: 'Something went wrong'
  }
}
```

### N4 — `src/server/app/shared/copy.cy.js`

```js
// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  layout: {
    back: 'Yn ôl',
    footer: {
      privacy: 'Preifatrwydd',
      cookies: 'Cwcis',
      accessibility: 'Datganiad hygyrchedd'
    }
  },
  unauthorised: {
    title: 'Methu mewngofnodi',
    heading: "Mae'n ddrwg gennym, ni allwn eich mewngofnodi.",
    bodyPrefix: 'Rhowch',
    signInLinkText: 'gynnig arall arni'
  },
  errorSummary: {
    title: 'Mae problem'
  },
  errorPage: {
    notFound: 'Heb ddod o hyd i’r dudalen',
    forbidden: 'Gwaharddedig',
    unauthorized: 'Heb awdurdod',
    badRequest: 'Cais annilys',
    unexpected: 'Aeth rhywbeth o’i le'
  }
}
```

### N5 — `src/server/app/shared/copy.test.js` (plants' `copy.test.js` shape, ins's namespaces)

```js
import { describe, expect, it } from 'vitest'

import { copyFor } from './copy.js'
import { copy as sharedEn } from './copy.en.js'
import { copy as sharedCy } from './copy.cy.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('#copyFor', () => {
  it('Should resolve the requested locale', () => {
    const en = { title: 'Hello' }
    expect(copyFor({ en }, 'en')).toBe(en)
  })

  it('Should default to English when no locale is given', () => {
    const en = { title: 'Hello' }
    expect(copyFor({ en })).toBe(en)
  })

  it('Should fall back to English for an unknown locale', () => {
    const en = { title: 'Hello' }
    expect(copyFor({ en }, 'cy')).toBe(en)
  })
})

describe('unauthorised-page copy', () => {
  it('Should carry the sign-in failure wording the auth controller renders', () => {
    expect(sharedEn.unauthorised).toEqual({
      title: 'Unable to sign in',
      heading: 'Sorry, we are unable to sign you in.',
      bodyPrefix: 'Please',
      signInLinkText: 'try again'
    })
  })

  it('Should carry the same keys in Welsh', () => {
    expect(Object.keys(sharedCy.unauthorised)).toEqual(
      Object.keys(sharedEn.unauthorised)
    )
  })
})

describe('error-page copy', () => {
  it('Should carry one message per status the catch-all names, and the fallback', () => {
    expect(sharedEn.errorPage).toEqual({
      notFound: 'Page not found',
      forbidden: 'Forbidden',
      unauthorized: 'Unauthorized',
      badRequest: 'Bad Request',
      unexpected: 'Something went wrong'
    })
  })
})

describe('shared copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(sharedEn)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })
})
```

(7 tests.)

### N6 — `src/server/app/shared/layout.test.js` (plants' `layout.test.js` shape, cut to what ins's layout renders)

```js
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const renderLayout = (context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Dashboard',
    serviceName: 'trade-imports-ins-frontend',
    sharedCopy,
    userSession: { isAuthenticated: false },
    breadcrumbs: [],
    navigation: [],
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

describe('footer', () => {
  it('Should label the three meta links from the shared copy', () => {
    const $ = load(renderLayout())
    const links = $('.govuk-footer__inline-list-item a')

    expect(links.map((_, anchor) => $(anchor).text().trim()).get()).toEqual([
      sharedCopy.layout.footer.privacy,
      sharedCopy.layout.footer.cookies,
      sharedCopy.layout.footer.accessibility
    ])
  })
})

describe('page title', () => {
  it('Should keep the convict service name after the page title', () => {
    const $ = load(renderLayout())

    expect($('title').text().trim()).toBe('Dashboard | trade-imports-ins-frontend')
  })
})
```

The footer test is why D4 is mandatory: a view rendered without `sharedCopy` would render three empty footer links
(Nunjucks resolves `sharedCopy.layout.footer.privacy` on an undefined root to nothing), so every `h.view()` in the
service must pass a `base()` view model — §6G greps for that. (2 tests.)

### N7 — `src/server/app/copy-convention.test.js` (plants' file with ins's feature root and namespaces)

```js
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from './shared/copy-leaves.js'
import { copy as sharedCopy } from './shared/copy.en.js'

const FEATURES_DIR = fileURLToPath(new URL('./features', import.meta.url))

const featureDirs = readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const filesOf = (feature, ...segments) =>
  readdirSync(path.join(FEATURES_DIR, feature, ...segments))

const featuresWithTemplates = featureDirs.filter((feature) =>
  readdirSync(path.join(FEATURES_DIR, feature), { recursive: true }).some(
    (file) => String(file).endsWith('.njk')
  )
)

describe('copy convention — every feature owns its copy', () => {
  it('Should find the feature folders', () => {
    expect(featuresWithTemplates.length).toBeGreaterThan(0)
  })

  it.each(featuresWithTemplates)(
    'Should give %s a copy/ folder with copy.en.js, copy.cy.js and copy.test.js',
    (feature) => {
      const files = filesOf(feature, 'copy')
      expect(files, `${feature} must own its copy`).toContain('copy.en.js')
      expect(files, `${feature} must carry its Welsh copy`).toContain(
        'copy.cy.js'
      )
      expect(files, `${feature} must test its copy`).toContain('copy.test.js')
    }
  )

  it.each(featureDirs)(
    'Should keep %s free of copy files at the feature root',
    (feature) => {
      expect(
        filesOf(feature).filter((file) =>
          /^copy\.(en|cy|test)\.js$/.test(file)
        ),
        `${feature} must keep its copy files in copy/`
      ).toEqual([])
    }
  )

  it.each(featuresWithTemplates)(
    'Should keep every %s copy leaf a non-empty string or copy function',
    async (feature) => {
      const { copy } = await import(`./features/${feature}/copy/copy.en.js`)
      for (const { path: leafPath, value } of leaves(copy)) {
        expect(isCopyLeaf(value), `${feature}: ${leafPath} must be copy`).toBe(
          true
        )
      }
    }
  )
})

describe('copy convention — shared chrome', () => {
  it('Should carry the chrome namespaces in the shared module', () => {
    expect(Object.keys(sharedCopy)).toEqual(
      expect.arrayContaining([
        'layout',
        'unauthorised',
        'errorSummary',
        'errorPage'
      ])
    )
  })

  it('Should carry the footer meta-link labels the layout renders', () => {
    expect(sharedCopy.layout.footer).toEqual({
      privacy: 'Privacy',
      cookies: 'Cookies',
      accessibility: 'Accessibility statement'
    })
  })

  it('Should keep every shared leaf valid copy', () => {
    for (const { path: leafPath, value } of leaves(sharedCopy)) {
      expect(isCopyLeaf(value), `${leafPath} must be copy`).toBe(true)
    }
  })
})
```

Differences from plants: `FEATURES_DIR` is `./features`; the dynamic import path; no `validatorDefaults` (that arrives
with s08's `lib/validate`); the namespace list is ins's. (1 + 2 + 2 + 2 + 3 = 10 tests with two feature folders.)

### N8 — `src/server/app/copy-parity.test.js` (plants' file with ins's feature root; no journey chrome)

```js
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from './shared/copy-leaves.js'
import { copyFor } from './shared/copy.js'
import { copy as sharedEn } from './shared/copy.en.js'
import { copy as sharedCy } from './shared/copy.cy.js'
import { copy as addressBookEn } from './features/address-book/copy/copy.en.js'
import { copy as addressBookCy } from './features/address-book/copy/copy.cy.js'

const FEATURES_DIR = fileURLToPath(new URL('./features', import.meta.url))

const featuresWithCopy = readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((feature) =>
    readdirSync(path.join(FEATURES_DIR, feature)).includes('copy')
  )
  .filter((feature) =>
    readdirSync(path.join(FEATURES_DIR, feature, 'copy')).includes('copy.en.js')
  )

// String leaves that may legitimately be byte-identical across en and cy
// (proper nouns, codes, reference formats). Keyed `${module}:${path}` —
// every addition must be justified here.
const IDENTICAL_ALLOWLIST = new Set([])

const kindOf = (value) => (typeof value === 'function' ? 'function' : 'string')

const modulePairs = async () => {
  const pairs = await Promise.all(
    featuresWithCopy.map(async (feature) => {
      const { copy: en } = await import(`./features/${feature}/copy/copy.en.js`)
      const { copy: cy } = await import(`./features/${feature}/copy/copy.cy.js`)
      return { name: feature, en, cy }
    })
  )
  return [...pairs, { name: 'shared', en: sharedEn, cy: sharedCy }]
}

describe('copy parity — cy mirrors en structurally', () => {
  it('Should find the copy module pairs', () => {
    expect(featuresWithCopy.length).toBeGreaterThan(0)
  })

  it('Should give cy the same paths, leaf kinds and function arities as en', async () => {
    for (const { name, en, cy } of await modulePairs()) {
      const enLeaves = new Map(
        leaves(en).map((leaf) => [leaf.path, leaf.value])
      )
      const cyLeaves = new Map(
        leaves(cy).map((leaf) => [leaf.path, leaf.value])
      )
      expect(
        [...cyLeaves.keys()].sort(),
        `${name}: cy paths must equal en paths`
      ).toEqual([...enLeaves.keys()].sort())
      for (const [leafPath, enValue] of enLeaves) {
        const cyValue = cyLeaves.get(leafPath)
        expect(
          kindOf(cyValue),
          `${name}: ${leafPath} leaf kind must match`
        ).toBe(kindOf(enValue))
        if (typeof enValue === 'function') {
          expect(
            cyValue.length,
            `${name}: ${leafPath} function arity must match`
          ).toBe(enValue.length)
        }
      }
    }
  })

  it('Should keep every cy leaf valid copy', async () => {
    for (const { name, cy } of await modulePairs()) {
      for (const { path: leafPath, value } of leaves(cy)) {
        expect(isCopyLeaf(value), `${name}: ${leafPath} must be copy`).toBe(
          true
        )
      }
    }
  })

  it('Should translate every string leaf unless allowlisted as identical', async () => {
    for (const { name, en, cy } of await modulePairs()) {
      const cyLeaves = new Map(
        leaves(cy).map((leaf) => [leaf.path, leaf.value])
      )
      for (const { path: leafPath, value: enValue } of leaves(en)) {
        if (
          typeof enValue !== 'string' ||
          IDENTICAL_ALLOWLIST.has(`${name}:${leafPath}`)
        ) {
          continue
        }
        expect(
          cyLeaves.get(leafPath),
          `${name}: ${leafPath} must be translated (or allowlisted)`
        ).not.toBe(enValue)
      }
    }
  })
})

describe('copy parity — the locale seam resolves cy', () => {
  it('Should resolve the cy module and interpolate through it', () => {
    const copy = copyFor({ en: addressBookEn, cy: addressBookCy }, 'cy')
    expect(copy).toBe(addressBookCy)
    expect(copy.successBanner.added('Green Farm')).toBe(
      addressBookCy.successBanner.added('Green Farm')
    )
    expect(copy.successBanner.added('Green Farm')).not.toBe(
      addressBookEn.successBanner.added('Green Farm')
    )
  })

  it('Should fall back to en for an unknown locale', () => {
    expect(copyFor({ en: addressBookEn, cy: addressBookCy }, 'fr')).toBe(
      addressBookEn
    )
  })
})
```

(6 tests.)

### N9 — `src/server/app/features/dashboard/copy/copy.en.js`

```js
/**
 * The dashboard — the notifications an organisation has made, searchable by
 * reference and sortable by arrival or last update. `sort.options` is keyed
 * by the `copyKey` of each `SORT_OPTIONS` entry in `view-model/list.js`, so a
 * new sort arrives as one more leaf rather than a branch in the controller.
 */
export const copy = {
  title: 'Dashboard',
  search: {
    label: 'Search by notification reference',
    button: 'Search',
    clear: 'Clear search',
    noResults: 'No notifications found'
  },
  sort: {
    label: 'Sort by',
    update: 'Update sort',
    options: {
      arrivalNewest: 'Arrival date (newest first)',
      arrivalOldest: 'Arrival date (oldest first)',
      updatedNewest: 'Last updated (newest first)',
      updatedOldest: 'Last updated (oldest first)'
    }
  },
  results: (from, to, total) => `Showing ${from}-${to} of ${total}`,
  table: {
    caption: 'Notifications',
    reference: 'Reference number',
    status: 'Status',
    origin: 'Origin country',
    commodity: 'Commodity',
    arrival: 'Arrival date',
    action: 'Action',
    view: 'View'
  },
  empty: {
    text: 'There are no notifications yet.',
    startButton: 'Start a new notification'
  },
  errors: {
    load: 'Something went wrong loading the dashboard'
  }
}
```

### N10 — `src/server/app/features/dashboard/copy/copy.cy.js`

```js
// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Dangosfwrdd',
  search: {
    label: 'Chwilio yn ôl cyfeirnod yr hysbysiad',
    button: 'Chwilio',
    clear: 'Clirio’r chwiliad',
    noResults: 'Ni chanfuwyd unrhyw hysbysiadau'
  },
  sort: {
    label: 'Trefnu yn ôl',
    update: 'Diweddaru’r drefn',
    options: {
      arrivalNewest: 'Dyddiad cyrraedd (mwyaf newydd yn gyntaf)',
      arrivalOldest: 'Dyddiad cyrraedd (hynaf yn gyntaf)',
      updatedNewest: 'Diweddarwyd ddiwethaf (mwyaf newydd yn gyntaf)',
      updatedOldest: 'Diweddarwyd ddiwethaf (hynaf yn gyntaf)'
    }
  },
  results: (from, to, total) => `Yn dangos ${from}-${to} o ${total}`,
  table: {
    caption: 'Hysbysiadau',
    reference: 'Cyfeirnod',
    status: 'Statws',
    origin: 'Gwlad tarddiad',
    commodity: 'Nwydd',
    arrival: 'Dyddiad cyrraedd',
    action: 'Cam gweithredu',
    view: 'Gweld'
  },
  empty: {
    text: 'Nid oes unrhyw hysbysiadau eto.',
    startButton: 'Dechrau hysbysiad newydd'
  },
  errors: {
    load: 'Aeth rhywbeth o’i le wrth lwytho’r dangosfwrdd'
  }
}
```

### N11 — `src/server/app/features/dashboard/copy/copy.test.js` (plants' origin `copy.test.js` shape + animals' function-leaf call)

```js
import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../shared/copy-leaves.js'
import { SORT_OPTIONS } from '../view-model/list.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const SAMPLE_ARGUMENTS = [1, 2, 3]

const textOf = (value) =>
  typeof value === 'function' ? value(...SAMPLE_ARGUMENTS) : value

describe('#copy', () => {
  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should hold a non-empty string or copy function at every %s leaf',
    (locale, bundle) => {
      for (const { path, value } of leaves(bundle)) {
        expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
        expect(
          textOf(value).trim().length,
          `${locale}: ${path} must render text`
        ).toBeGreaterThan(0)
      }
    }
  )

  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should carry a %s label for every sort option, and no other',
    (_locale, bundle) => {
      expect(Object.keys(bundle.sort.options).toSorted()).toEqual(
        SORT_OPTIONS.map((option) => option.copyKey).toSorted()
      )
    }
  )

  it('Should describe the results range the way the page always has', () => {
    expect(copy.results(26, 40, 40)).toBe('Showing 26-40 of 40')
  })

  it('Should carry the search and empty-state wording the fit specs pin', () => {
    expect(copy.title).toBe('Dashboard')
    expect(copy.search.label).toBe('Search by notification reference')
    expect(copy.search.noResults).toBe('No notifications found')
    expect(copy.empty).toEqual({
      text: 'There are no notifications yet.',
      startButton: 'Start a new notification'
    })
  })
})
```

`view-model/list.js` imports `config` at module level; importing `SORT_OPTIONS` here loads the real convict config,
which every controller test already does — no mock needed. (6 tests.)

### N12 — `src/server/app/features/address-book/copy/copy.en.js`

```js
/**
 * The address book — one copy module for the five pages. `form` is shared by
 * add and edit (the same Standard Address Block); `errors` carries the
 * validation messages `fields.js` hands to joi, one namespace per field so a
 * message and its rule sit together.
 */
export const copy = {
  list: {
    title: 'Address book',
    intro: 'Manage addresses used across import and export services.',
    search: {
      label: 'Search addresses',
      hint: 'Search by name, town or city, postcode or country',
      button: 'Search',
      clear: 'Clear search'
    },
    add: 'Add a new address',
    empty: 'You have no addresses yet.',
    noMatchPrefix: 'No addresses match',
    results: (from, to, total) => `Showing ${from}-${to} of ${total}`,
    table: {
      name: 'Name',
      address: 'Address',
      country: 'Country',
      action: 'Action',
      view: 'View'
    }
  },
  successBanner: {
    title: 'Success',
    added: (name) => `${name} added to your address book`,
    updated: (name) => `${name} updated in your address book`,
    deleted: (name) => `${name} deleted from your address book`
  },
  form: {
    addressHeading: 'Enter address details',
    contactHeading: 'Enter contact details',
    fields: {
      name: 'Name or organisation name',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2 (optional)',
      townOrCity: 'Town or city',
      county: 'County (optional)',
      postcode: 'Postcode or Zip code',
      countryCode: 'Country',
      phone: 'Phone number',
      email: 'Email address'
    },
    phoneHint: 'For international numbers include the country code',
    countryPlaceholder: 'Select a country'
  },
  add: {
    title: 'Add address details',
    save: 'Save and continue',
    cancel: 'Cancel and return to address book'
  },
  edit: {
    title: 'Edit address details',
    save: 'Save changes',
    cancel: 'Cancel'
  },
  view: {
    edit: 'Edit',
    delete: 'Delete',
    countyRowLabel: 'County'
  },
  delete: {
    title: 'Delete address',
    confirmPrefix: 'Are you sure you want to delete',
    confirmSuffix: 'from your address book?',
    confirm: 'Yes, delete this address',
    cancel: 'Cancel'
  },
  errors: {
    loadList: 'Something went wrong loading your address book',
    loadForm: 'Something went wrong loading the form',
    save: 'Something went wrong saving the address',
    name: {
      required: 'Enter a name',
      maxLength: (max) => `Name must be ${max} characters or fewer`
    },
    addressLine1: {
      required: 'Enter address line 1',
      maxLength: (max) => `Address line 1 must be ${max} characters or fewer`
    },
    addressLine2: {
      maxLength: (max) => `Address line 2 must be ${max} characters or fewer`
    },
    townOrCity: {
      required: 'Enter a town or city',
      maxLength: (max) => `Town or city must be ${max} characters or fewer`
    },
    county: {
      maxLength: (max) => `County must be ${max} characters or fewer`
    },
    postcode: {
      required: 'Enter a postcode',
      maxLength: (max) => `Postcode must be ${max} characters or fewer`
    },
    countryCode: {
      required: 'Enter a country',
      fromList: 'Select a country from the list'
    },
    phone: {
      required: 'Enter a telephone number',
      maxLength: (max) => `Telephone number must be ${max} characters or fewer`
    },
    email: {
      required: 'Enter an email address',
      format: 'Enter an email address in the correct format',
      maxLength: (max) => `Email address must be ${max} characters or fewer`
    }
  }
}
```

### N13 — `src/server/app/features/address-book/copy/copy.cy.js`

```js
// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  list: {
    title: 'Llyfr cyfeiriadau',
    intro: 'Rheoli cyfeiriadau a ddefnyddir ar draws gwasanaethau mewnforio ac allforio.',
    search: {
      label: 'Chwilio cyfeiriadau',
      hint: 'Chwilio yn ôl enw, tref neu ddinas, cod post neu wlad',
      button: 'Chwilio',
      clear: 'Clirio’r chwiliad'
    },
    add: 'Ychwanegu cyfeiriad newydd',
    empty: 'Nid oes gennych unrhyw gyfeiriadau eto.',
    noMatchPrefix: 'Nid oes unrhyw gyfeiriadau yn cyfateb i',
    results: (from, to, total) => `Yn dangos ${from}-${to} o ${total}`,
    table: {
      name: 'Enw',
      address: 'Cyfeiriad',
      country: 'Gwlad',
      action: 'Cam gweithredu',
      view: 'Gweld'
    }
  },
  successBanner: {
    title: 'Llwyddiant',
    added: (name) => `${name} wedi’i ychwanegu at eich llyfr cyfeiriadau`,
    updated: (name) => `${name} wedi’i ddiweddaru yn eich llyfr cyfeiriadau`,
    deleted: (name) => `${name} wedi’i ddileu o’ch llyfr cyfeiriadau`
  },
  form: {
    addressHeading: 'Rhowch fanylion y cyfeiriad',
    contactHeading: 'Rhowch fanylion cyswllt',
    fields: {
      name: 'Enw neu enw’r sefydliad',
      addressLine1: 'Llinell gyfeiriad 1',
      addressLine2: 'Llinell gyfeiriad 2 (dewisol)',
      townOrCity: 'Tref neu ddinas',
      county: 'Sir (dewisol)',
      postcode: 'Cod post neu god zip',
      countryCode: 'Gwlad',
      phone: 'Rhif ffôn',
      email: 'Cyfeiriad e-bost'
    },
    phoneHint: 'Ar gyfer rhifau rhyngwladol, cynhwyswch god y wlad',
    countryPlaceholder: 'Dewiswch wlad'
  },
  add: {
    title: 'Ychwanegu manylion cyfeiriad',
    save: 'Cadw a pharhau',
    cancel: 'Canslo a dychwelyd i’r llyfr cyfeiriadau'
  },
  edit: {
    title: 'Golygu manylion cyfeiriad',
    save: 'Cadw’r newidiadau',
    cancel: 'Canslo'
  },
  view: {
    edit: 'Golygu',
    delete: 'Dileu',
    countyRowLabel: 'Sir'
  },
  delete: {
    title: 'Dileu cyfeiriad',
    confirmPrefix: 'Ydych chi’n siŵr eich bod am ddileu',
    confirmSuffix: 'o’ch llyfr cyfeiriadau?',
    confirm: 'Ie, dileu’r cyfeiriad hwn',
    cancel: 'Canslo'
  },
  errors: {
    loadList: 'Aeth rhywbeth o’i le wrth lwytho eich llyfr cyfeiriadau',
    loadForm: 'Aeth rhywbeth o’i le wrth lwytho’r ffurflen',
    save: 'Aeth rhywbeth o’i le wrth gadw’r cyfeiriad',
    name: {
      required: 'Rhowch enw',
      maxLength: (max) => `Rhaid i’r enw fod yn ${max} nod neu lai`
    },
    addressLine1: {
      required: 'Rhowch linell gyfeiriad 1',
      maxLength: (max) => `Rhaid i linell gyfeiriad 1 fod yn ${max} nod neu lai`
    },
    addressLine2: {
      maxLength: (max) => `Rhaid i linell gyfeiriad 2 fod yn ${max} nod neu lai`
    },
    townOrCity: {
      required: 'Rhowch dref neu ddinas',
      maxLength: (max) => `Rhaid i’r dref neu ddinas fod yn ${max} nod neu lai`
    },
    county: {
      maxLength: (max) => `Rhaid i’r sir fod yn ${max} nod neu lai`
    },
    postcode: {
      required: 'Rhowch god post',
      maxLength: (max) => `Rhaid i’r cod post fod yn ${max} nod neu lai`
    },
    countryCode: {
      required: 'Rhowch wlad',
      fromList: 'Dewiswch wlad o’r rhestr'
    },
    phone: {
      required: 'Rhowch rif ffôn',
      maxLength: (max) => `Rhaid i’r rhif ffôn fod yn ${max} nod neu lai`
    },
    email: {
      required: 'Rhowch gyfeiriad e-bost',
      format: 'Rhowch gyfeiriad e-bost yn y fformat cywir',
      maxLength: (max) => `Rhaid i’r cyfeiriad e-bost fod yn ${max} nod neu lai`
    }
  }
}
```

### N14 — `src/server/app/features/address-book/copy/copy.test.js`

```js
import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../shared/copy-leaves.js'
import { FIELDS, FIELD_RULES } from '../fields.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const SAMPLE_ARGUMENTS = [1, 2, 3]

const textOf = (value) =>
  typeof value === 'function' ? value(...SAMPLE_ARGUMENTS) : value

const LOCALES = [
  ['en', copy],
  ['cy', cy]
]

describe('#copy', () => {
  it.each(LOCALES)(
    'Should hold a non-empty string or copy function at every %s leaf',
    (locale, bundle) => {
      for (const { path, value } of leaves(bundle)) {
        expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
        expect(
          textOf(value).trim().length,
          `${locale}: ${path} must render text`
        ).toBeGreaterThan(0)
      }
    }
  )

  it.each(LOCALES)('Should label every %s form field, and no other', (_locale, bundle) => {
    expect(Object.keys(bundle.form.fields)).toEqual(FIELDS)
  })

  it.each(LOCALES)(
    'Should carry a %s required message for every mandatory field and a maxLength message for every bounded one',
    (locale, bundle) => {
      for (const field of FIELDS) {
        const rule = FIELD_RULES[field]
        if (rule.required) {
          expect(
            typeof bundle.errors[field].required,
            `${locale}: errors.${field}.required`
          ).toBe('string')
        }
        if (rule.maxLength) {
          expect(
            typeof bundle.errors[field].maxLength,
            `${locale}: errors.${field}.maxLength`
          ).toBe('function')
        }
      }
    }
  )

  it('Should name the address in each success banner', () => {
    expect(copy.successBanner.added('Green Farm')).toBe(
      'Green Farm added to your address book'
    )
    expect(copy.successBanner.updated('Green Farm')).toBe(
      'Green Farm updated in your address book'
    )
    expect(copy.successBanner.deleted('Green Farm')).toBe(
      'Green Farm deleted from your address book'
    )
  })

  it('Should carry the labels the form and summary specs pin, including the bare County row', () => {
    expect(copy.form.fields.county).toBe('County (optional)')
    expect(copy.view.countyRowLabel).toBe('County')
    expect(copy.form.fields.postcode).toBe('Postcode or Zip code')
    expect(copy.errors.name.maxLength(FIELD_RULES.name.maxLength)).toBe(
      'Name must be 255 characters or fewer'
    )
  })
})
```

`fields.js` imports the copy module and this test imports `fields.js` — no cycle: `copy.en.js` imports nothing. (8
tests.)

---

## 4. Imports — the rule for rewriting the imports this stage disturbs

- Every import is relative and the shortest path (s02 D1). The new modules sit at `src/server/app/shared/` (so a
  feature page folder reaches them as `../../../shared/copy.js`, the dashboard root and `address-book/fields.js` as
  `../../shared/copy.js`, `app/copy-*.test.js` as `./shared/…`, `common/helpers/errors.js` and
  `src/server/auth/controller.js` through `kit.js` only — they never import `copy.en.js` directly).
- A feature's own copy is always imported as `import { copy as en } from '…/copy/copy.en.js'` and
  `import { copy as cy } from '…/copy/copy.cy.js'`, **last** in the import list (plants' origin controller lines
  20–21), and resolved as `const copy = copyFor({ en, cy })` right after `const view = …`.
- `kit.js` is the only importer of `copy.en.js` / `copy.cy.js` under `app/shared/` at runtime; tests may import them
  directly (`copy.test.js`, `layout.test.js`, the two guards).
- The one rename (`notification-dashboard-helper.js` → `list.js`) has two importers: `dashboard/controller.js` (E7
  rewrites it) and its own test (T1). `grep -rn "notification-dashboard-helper"` over `src/` must return nothing
  afterwards (§6B).
- No `#/` alias, no cross-repo import, no `vi.mock` of a copy module anywhere.

---

## 5. Tests — which move, which change, which are new, and what each pins

### Moved (1)

| Test | Change | Pins |
|---|---|---|
| T1 `dashboard/view-model/list.test.js` (was `notification-dashboard-helper.test.js`) | the dynamic import becomes `await import('./list.js')`; add `import { copy } from '../copy/copy.en.js'` after the `vi.mock` (a static import of a module with no mocked dependency is fine beside the `await import`); both `buildResultsLabel(…)` calls become `buildResultsLabel({…}, copy.results)`; delete the two-line comment `// page 1 is the default … convention.` above `expect(model.previous.href)` (a cross-feature "matching" comment — invariant 6). Test count unchanged (18). | the results label still reads `Showing 26-40 of 40` through the copy formatter; everything else as before. |

### Changed in place (2)

| Test | Change | Pins |
|---|---|---|
| T2 `address-book/view-model/list.test.js` | add `import { copy } from '../copy/copy.en.js'`; the three `buildResultsLabel(…)` calls gain `, copy.list.results` as the second argument. Count unchanged (10). | `Showing 1-8 of 24` / `Showing 26-30 of 30` / `null` through the injected formatter. |
| T3 `address-book/address-countries.test.js` | `buildCountrySelectItems([...])` → `buildCountrySelectItems([...], 'Select a country')`. Count unchanged (7). | the placeholder is whatever the caller passes; expectation unchanged. |

### Unchanged but load-bearing (listed so nobody "fixes" them)

`dashboard/controller.test.js` (10), the five address-book `controller.test.js` files (9 + 6 + 8 + 5 + 9), `fields.test.js`
(10), `kit.test.js` (13), `errors.test.js` (9), `auth/controller.test.js` (7), `router.test.js`, `app/routes.test.js`,
`paths.test.js`, `csrf.test.js`, `context.test.js`, `build-navigation.test.js` — every one asserts English literals
that this stage must keep rendering. **If any of them goes red, the copy has drifted from the string it replaced; fix
the copy, never the test** (D19).

### New (6 files, 39 tests)

| Test | Count | Pins |
|---|---|---|
| N5 `shared/copy.test.js` | 7 | `copyFor` resolution and fallback; the unauthorised page's four strings and their Welsh keys; the five error-page messages; every shared leaf a non-empty string. |
| N6 `shared/layout.test.js` | 2 | the footer's three labels come from `sharedCopy`; the `<title>` still ends in the convict service name. |
| N7 `app/copy-convention.test.js` | 10 | both features own `copy/{copy.en.js, copy.cy.js, copy.test.js}`; no copy file at a feature root; every en leaf is copy; the shared module carries `layout`/`unauthorised`/`errorSummary`/`errorPage` and the footer labels. |
| N8 `app/copy-parity.test.js` | 6 | cy mirrors en path-for-path with matching leaf kinds and arities, for both features and the shared module; every cy leaf is copy; every string leaf is translated (empty allowlist); `copyFor(…, 'cy')` resolves the Welsh bundle and its functions. |
| N11 `dashboard/copy/copy.test.js` | 6 | every leaf renders text in both locales (functions invoked); `sort.options` keys equal `SORT_OPTIONS` copy keys in both locales; the results formatter; the title/search/empty-state literals the fit spec drives. |
| N14 `address-book/copy/copy.test.js` | 8 | every leaf renders text in both locales; `form.fields` keys equal `FIELDS` in order; every `required`/`maxLength` rule in `FIELD_RULES` has its message in both locales; the three success banners interpolate the name; the County/postcode/maxLength literals the fit specs pin. |

### Arithmetic

Files: 50 + 6 new (N5, N6, N7, N8, N11, N14) = **56**. Tests: 285 + 7 + 2 + 10 + 6 + 6 + 8 = **324**. (The
`it.each` cases count individually: N7's two `it.each(featuresWithTemplates)` and one `it.each(featureDirs)` each
produce 2 tests with two feature folders; N11's two `it.each` produce 2 each; N14's three `it.each` produce 2 each.)
Expected ladder line: `Test Files 56 passed (56)` / `Tests 324 passed (324)`. If the count differs by a small number,
count the `it.each` expansions before assuming a test is missing; if a test is red, read the log once and fix the
source (D19).

Playwright: **49/49**, no spec changes. The fit specs are the browser-level proof that every English string still
renders: `address-form.js` pins all nine labels, fifteen validation messages and the phone hint; the five specs pin
titles, buttons, banners, the empty state, `Back`; `dashboard.fit.spec.js` pins the heading, search label/button,
`No notifications found` and the `View …` link names.

---

## 6. Invariants to prove — and the check that proves each held

Run each check as one Bash call; redirect anything long to
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s07-<name>.log` and Read it once.

**A. Ladder (invariant 3).** In order, each to a log file:
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format` (once, D21), then
`run format:check`, `run lint`, `run test` (expect 56 files / 324 tests), `run test:fit` (expect 49 passed). For a
Playwright red, read `test-results/*/error-context.md` in the repo.

**B. No stale name (invariant 7).**
`grep -rn "notification-dashboard-helper\|buildTableRows\|ERROR_SUMMARY_TITLE\|PAGE_TITLE\|statusCodeMessage" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src`
→ nothing.

**C. Route surface (invariant 1).** `app/routes.test.js` (unchanged) still lists the nine routes; `paths.test.js`
unchanged; and
`grep -rn "path: '" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src --include=*.js`
returns the same chassis-only set as s06's closing note (auth, health, signout, favicon, the cookie path). Nothing in
this stage touches a route.

**D. Every user-facing string lives in copy (invariant 5).** Three greps over the features and the shared chrome:

1. `grep -rn "text: \"\|titleText: \"\|caption: \"" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/shared ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/auth`
   → nothing (every govuk macro `text`/`titleText`/`caption` param reads copy).
2. `grep -rn "Enter a\|Something went wrong\|characters or fewer\|Select a country\|your address book\|Showing " ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app`
   → hits only under `*/copy/copy.en.js`, `*.test.js` and `fit/*.js`. Any hit in a controller, template, `fields.js`,
   `address-countries.js` or a view-model is a string left behind.
3. `grep -rn "There is a problem\|Accessibility statement\|Page not found\|unable to sign you in" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src`
   → hits only in `app/shared/copy.en.js` and `*.test.js`.

The two guard suites (N7, N8) are the executable form of this invariant and run in A.

**E. Behaviour preserved (invariant 2).** The unchanged controller/fit tests listed in §5 are the proof; plus
`git diff --cached --stat` lists exactly the paths in §1–§3 (2 renames, 14 new files, 21 edits in place) and nothing under
`src/config/`, `src/plugins/`, `src/server/common/` except `helpers/errors.js`, or `src/server/auth/` except
`controller.js`.

**F. No cross-repo import, no `#/` alias (invariant 4 / s02).**
`grep -rn "from '.*trade-imports-\(animals\|plants\)\|from '#/" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src`
→ nothing.

**G. Every view carries `sharedCopy` (D4).**
`grep -rn "h.view(" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src`
→ eleven hits; each is followed by a view model that spreads `kit.base(…)` or passes `base(…)` (the six feature
controllers, `errors.js`, and the four in `auth/controller.js`). N6's note says why.

**H. Renames detected.** `git -C … diff --cached -M --name-status` shows `R` for the two `view-model` files (the
content change is two small hunks); the templates and controllers show `M`. If the dashboard controller shows as
`M` with a large diff, that is expected (E7 is a rewrite of an edited-in-place file, not a move).

**I. Comments (invariant 6).** The only comments added are: the doc block on `sharedCopy` in `kit.js` (E1, adapted
from plants), the doc blocks at the top of the three `copy.en.js` files and `copy.js`/`copy-leaves.js` (plants'),
the machine-draft header line on each `copy.cy.js` (plants'), the `signInUrl` why-comment in `unauthorised.njk`
(plants'), the allowlist comment in `copy-parity.test.js` (plants'), and the one-line doc on `buildResultsLabel`
(E8). One comment is removed (T1). No "moved from" / "renamed" / "was" wording anywhere:
`grep -rn "renamed\|moved from\|previously\|used to be" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app`
→ nothing.

---

## 7. Out of scope — leave alone even though it is tempting

- **The layout beyond the footer block** (E2): no phase banner, no `govukServiceNavigation` from `sharedCopy`, no
  `errorTitlePrefix`, no `serviceName` in copy, no `backLink` rendering, no `journeyContent` block rename — s09.
- **`src/config/nunjucks/context/build-navigation.js`** and `context.js`: the `'Dashboard'` / `'Address book'` labels
  and the hard-coded `/address-book` href stay (D2); s09 replaces the mechanism. Their tests stay.
- **`src/server/common/components/`** (`heading`, `service-header` with its `Sign in` / `Sign out` literals and their
  scss): chassis components the DR1 layout retires — s09.
- **The error-summary switch** (`kit.errorSummary`, `shared/error-summary.njk`, `kit.fieldError`, a `field → message`
  map) — s08 (s06 D16). Only the `titleText` literal changed (D18).
- **joi.** `buildAddressSchema` keeps its ten builders and `formatValidationErrors` its shape; only the message
  literals moved (E9). No `validatorDefaults` in shared copy — that arrives with `lib/validate` in s08, and the guard
  suites will grow it then.
- **`address-id-params.js`** messages (D17), `'Country reference data is unavailable'`, every `logger.error` string,
  the stub data in `app/services/*/stub.js`, `SORT_OPTIONS` values, `data-testid`s, the success banner's `id`.
- **The `<title>` format** `pageTitle | serviceName` and `errors.test.js`'s `'… | trade-imports-ins-frontend'` pins.
- **The unauthorised title text** (D4) and the error page's English (D3) — moves, not edits.
- **Edit vs add form order/headings** (E16's note) — s09 if Design release 1 says so.
- **`recoverableSave()`**, `statusCodes` in the chassis, `src/server/common/README.md`, `app/docs/` (s11), the two
  journey repos, the tests repo.
- Any comment tidy-up, identifier rename, import reordering or blank-line change beyond §1–§3.

---

## 8. Behaviour changes (named, per invariant 2)

None that a trader can see. For the record, the observable differences on the wire are:

1. **The dashboard heading's caption reads the convict `serviceName`** instead of the literal
   `"trade-imports-ins-frontend"` — identical text under the default config; a deployment that sets `SERVICE_NAME`
   now sees it in the caption as well as the `<title>` (D6).
2. **The unauthorised page is rendered with `base()`'s view model** (`layout`, `pageTitle`, `backLink: undefined`,
   `sharedCopy`, `recoverableError: false`) instead of an empty one; the template no longer sets `pageTitle` itself.
   Same `<title>`, same body (D4).
3. **The dashboard view model** gains `copy` and `listHref` and loses `heading`; the address-book list/add/edit/delete
   view models gain `copy` and lose `heading`; the view page gains `copy`. The rendered HTML is identical.
4. **`buildResultsLabel` and `buildCountrySelectItems` take the copy they render as a parameter** (D8, D9) — internal
   signatures, same output.

The Welsh is machine-draft and unreachable: `copyFor` is always called with the default locale. **A translator must
review every `copy.cy.js` before any real release** — recorded in the stage note as the brief requires.

---

## 9. Commit

Stage the work (`git -C … add -A`); do not commit — the reviewer/orchestrator commits with the programme's message
shape (`refactor(alignment): s07-copy-and-welsh — move every string into copy.en.js and copy.cy.js pairs`) plus the
required trailers. Do not push to `main`; do not merge.
