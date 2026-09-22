# s09-layout — adopt the Design release 1 layout

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit/Write tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (checked out, level with `origin`, clean tree, HEAD `e2337fe`).

Reference files (Read tool paths under `/Users/samfarrington/git/defra/trade-imports-workspace/`; Bash paths under
`~/git/defra/trade-imports-workspace/`):

- `repos/trade-imports-plants-frontend/src/server/app/shared/layout.njk` — **byte-identical to animals'** (`diff` is
  empty), so the direction rule's "prefer plants" costs nothing here. The ins layout in E1 is this file with five
  named differences (D2, D5, D6, D8).
- `repos/trade-imports-plants-frontend/src/config/nunjucks/context/context.js` — also byte-identical to animals'.
  `activeNavigationItem()` (lines 17–29) is ported; the manifest read, the session read and the `staleActionRejected`
  key are not (D2, D7, D8).
- `repos/trade-imports-plants-frontend/src/config/nunjucks/context/context.test.js` lines 136–163 — the
  `#activeNavigationItem` describe; E4 adapts it to ins's paths.
- `repos/trade-imports-plants-frontend/src/server/app/shared/kit.js` lines 25–37 (`SURFACES`, `surfaceClass`) and
  line 159 (`contentColumnClass: SURFACES.form` in `base`) — the layout reads `contentColumnClass`; animals' kit
  lacks it, plants' has it (D4).
- `repos/trade-imports-plants-frontend/src/server/app/shared/layout.test.js` — the shape of the rewritten
  `layout.test.js` (E2): service navigation, phase banner, no breadcrumbs, surfaces.
- `repos/trade-imports-plants-frontend/src/server/app/shared/copy.en.js` lines 10–33 and 46–49, `copy.cy.js` lines
  3–26 and 39–42 — the `layout` and `recoverableError` copy (E10, E11).
- `repos/trade-imports-plants-frontend/src/server/app/shared/error.njk` and `src/server/app/auth/unauthorised.njk` —
  copied verbatim (E14, E15).
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/dashboard/controller.js`
  line 71 — `contentColumnClass: kit.surfaceClass('display')` after `...kit.base(...)`, the shape the two ins list
  pages take (E19, E22).
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/identification-numbers/template.njk`
  lines 5–8 — `{% block journeyContent %}`, `{% include "shared/error-summary.njk" %}` **above** the `h1`, and
  `<h1 class="govuk-heading-l">` (D3, D11, D12).
- `repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/dashboard/template.njk`
  line 29 — `<h1 class="govuk-heading-xl">{{ copy.title }}</h1>` on the dashboard (D12).
- `repos/trade-imports-plants-frontend/src/client/javascripts/application.js` — `ServiceNavigation` in the
  `govuk-frontend` import and `createAll(ServiceNavigation)` (E33).
- `repos/trade-imports-plants-frontend/src/client/stylesheets/` — compared file by file in D14: only
  `components/_index.scss` changes in ins.
- `repos/trade-imports-plants-frontend/src/config/nunjucks/globals/globals.js` — copied verbatim (E5).

Baseline (s08's landed ladder on `e2337fe`, `logs/s08-validation-ins-test.log` / `logs/s08-validation-ins-test-fit.log`):
unit suite **58 files / 467 tests green**, `format:check` clean, `lint` clean, Playwright **49/49** green. Expected
after this stage: **55 files / 492 tests** (§5 arithmetic), Playwright still **49/49**.

What this stage does: replaces `app/shared/layout.njk` with the Design release 1 layout the journeys share (service
navigation with Dashboard / Address book / Manage account / Log out, alpha phase banner, back link driven by
`kit.base`, no breadcrumbs, every string from `sharedCopy`); ports `activeNavigationItem()` into
`config/nunjucks/context/context.js` and deletes `build-navigation.js`; deletes the `heading` and `service-header`
components, their SCSS, their tests and the `test-helpers/component-helpers.js` that only they used; switches every
page template to the layout's `journeyContent` block with a plain `govuk-heading-*` `h1`; ports plants' page surfaces
(`SURFACES`, `surfaceClass`, `contentColumnClass`) into `kit.base`; and — the handoff s05 and s08 both left here —
turns the four page-level "Something went wrong …" error-summary entries into the layout's `recoverableError`
banner. **Every fit spec that asserts heading or navigation text still passes unchanged**: the h1 texts, the
`Dashboard` / `Address book` / `Back` link names and every button name render exactly as before. 11 files are
deleted, 36 are edited in place, nothing is created and nothing moves.

---

## 0. Decisions (made here so the implementor never has to choose)

| # | Question the brief left open | Decision |
|---|---|---|
| D1 | The brief says "the animals layout"; the direction rule says plants where they differ. | **They do not differ**: `layout.njk` and `context.js` are byte-identical in the two journeys (verified with `diff` at planning time). Plants' `kit.js` is the one place the layout's contract is richer (`contentColumnClass`, D4), so plants is the reference throughout. |
| D2 | ins builds its client with **Vite** (`vite.config.js`, `.public/.vite/manifest.json`, manifest keys are source paths such as `src/client/stylesheets/application.scss`); the journeys build with webpack (`.public/assets-manifest.json`, keys such as `application.js`). Plants' layout relies on the govuk template's default `headIcons` block, which links `{{ assetPath }}/images/favicon.ico` — a path ins does not serve (Vite emits `.public/assets/favicon-<hash>.ico` and only the manifest knows the hash). | **The Vite pipeline is untouched — it is s10's ("align the build and dev tooling").** The ins layout keeps four things from today's file: the `headIcons` block (five `getAssetPath("node_modules/govuk-frontend/…")` links), the `head` block's `getAssetPath('src/client/stylesheets/application.scss')`, the `bodyEnd` block's `getAssetPath('src/client/javascripts/application.js')`, and `context.js`'s Vite manifest read (`.public/.vite/manifest.json`, `viteManifest?.[asset]?.file`). `vite.config.js` is not edited (D20). These are the only lines of the layout that s10 will revisit; §6I lists them as the expected diff against plants. |
| D3 | The journeys' layout wraps page content in `govuk-grid-row` > column and exposes it as `{% block journeyContent %}`; ins pages override `{% block content %}` and lay themselves out. | **Every ins page template switches to `{% block journeyContent %}`** — the eight templates in §6B. The block name is the layout's own in both journeys and the brief allows the journey-strip block to stay; renaming it would make every future diff against the journeys noisy for no gain. The old `<div class="govuk-body" data-testid="app-page-body">` wrapper goes with the switch (nothing asserts on it — grep over `src/` and the fit specs at planning time hits only the six templates). |
| D4 | The layout reads `contentColumnClass | default("govuk-grid-column-two-thirds")`. Animals' `kit.base` never sets it (every animals page is two-thirds); plants' `base` sets `SURFACES.form` and its list pages override with `kit.surfaceClass('display')` (full width). ins's dashboard (six-column table) and address-book list (four-column table plus search) do not fit two-thirds of the container. | **Port plants' `SURFACES` / `surfaceClass` into `kit.js` verbatim and `contentColumnClass: SURFACES.form` into `base`** (E6). The dashboard and the address-book list controllers add `contentColumnClass: kit.surfaceClass('display')` after `...kit.base(...)` (plants' dashboard controller line 71). Add, edit, view, delete, the error page and the unauthorised page take the default reading measure. `kit.test.js`'s `base` pin gains the key; the four `kit surfaces` tests come with `layout.test.js` (E2), where plants keeps them. |
| D5 | "Point the address-book navigation item at `addressBookPath()` and the dashboard at `dashboardPath()`" — a Nunjucks template cannot call a JS function unless the context or a global supplies it. Plants hard-codes `{% set homeUrl = "/" %}` and `{% set addressBookUrl = "#" %}` in the template; s06's invariant §6C wants no literal `/address-book` outside `paths.js`. | **`context.js` supplies `dashboardUrl: dashboardPath()` and `addressBookUrl: addressBookPath()`** (E3) — the same dependency direction animals' context already has on `paths.js` (`inDashboardSection`). The layout reads `dashboardUrl` for the Dashboard item **and** for `govukServiceNavigation`'s `serviceUrl` (plants uses `homeUrl` for both; there is one home URL, not two spellings of it). `{% set homeUrl %}` and `{% set addressBookUrl = "#" %}` and their comment do not come across. The context's existing `serviceUrl: '/'` key stays untouched — it is in animals' context too, unused by the layout in all three repos; removing it is not this stage's business. The chassis destinations stay template `{% set %}`s as in plants: `feedbackUrl` (verbatim, `mailto:APHAServiceDesk@apha.gov.uk` — the same service desk plants names), `manageAccountUrl = "#"` (Design release 1's placeholder; ins has no account page either), and **`signOutUrl = "/signout"`** — ins's protected URL (invariant 1). Plants' `/auth/sign-out` is registered by `authRoutes` only in real mode; in stub mode it 404s, and `/signout` is what ins's old service header linked to. |
| D6 | Plants' `activeNavigationItem()` returns `'dashboard'` or `null` because its address-book item is a `#` placeholder. ins's old `buildNavigation` marked both items `current` (`path === '/'`, `path.startsWith('/address-book')`). | **`activeNavigationItem()` returns `'dashboard'`, `'addressBook'` or `null`**, over two section predicates added to `paths.js`: `inDashboardSection(path) = path === dashboardPath()` and `inAddressBookSection(path) = path === addressBookPath() \|\| path.startsWith(`${addressBookPath()}/`)` (plants' `inDashboardSection` shape, E7). The layout marks both items with `active:` (plants' idiom; govuk renders `aria-current="true"`, where the old `current:` rendered `aria-current="page"` — named in §8). The doc comment on `activeNavigationItem` is plants' with the notification example replaced by `/address-book/123/edit` → `addressBook`. |
| D7 | Animals' `context()` is `async` and re-reads the session from `request.server.app.cache` by `sessionId` on every render; ins's reads `request.auth.credentials` synchronously — the cookie strategy's `validate` (plugins/auth.js) already returned the cache record as the credentials, so the two are the same object one cache round-trip apart. | **ins keeps its synchronous read; `context` stays a plain function and `context.test.js` stays synchronous.** This is ins chassis hardening the programme wants to keep (and an s12 backport candidate, recorded in the stage note): one fewer Redis hit per page. The `userSession` shape (`isAuthenticated`, `displayName`, `email`) is unchanged — the new layout renders none of it (plants' test "Should not show the signed-in user anywhere" comes across), but the shape is animals' and the context test pins it. `authEnabled` stays in the context for the same parity reason (animals has it; nothing renders it now that the service header is gone). |
| D8 | Plants' layout renders two journey-only things: a `staleActionRejected` banner (the journeys' concurrency-token rejection, keyed off `?staleAction=1` in `context.js`) and a `journeyStrip` (status tag + reference). The brief says the journey-strip block "may stay since it renders nothing without a journey". | **`journeyStrip` block kept verbatim; `staleActionRejected` block dropped, and its context key with it.** The strip needs no copy and no context key and keeps the ins layout diffable against plants (§6I); the stale-action banner would need `sharedCopy.staleActionRejected` in both locales (dead copy, the thing s07 D2 refused) and a context key nothing sets. `govukTag` is imported for the strip, as in plants. |
| D9 | What the `<title>` says. s07 D2 left the convict `serviceName` (`'trade-imports-ins-frontend'`) in the title "until s09 decides"; s07 D5 made the dashboard caption read it too. Plants' copy names the service **`'Import notification service'`** — the same service ins is. | **`sharedCopy.layout.serviceName = 'Import notification service'`** (plants' string, en and cy) in the title, the service navigation and nowhere else. The dashboard's `caption: serviceName` goes — the service navigation now names the service on every page and neither journey captions its dashboard with it. The convict `serviceName` key stays (logger-options.js reads it) and stays in the context (animals has it there). `errors.test.js`'s two title literals and `layout.test.js`'s change to the new name; the title also gains plants' `Error: ` prefix whenever the view model carries an `errorSummary` (named in §8). |
| D10 | s08 D6 kept the four page-level failures — dashboard load, address-book load, add-form countries load, add/edit save — as an `errorList: [{ text }]` entry (no `href`) in an inline `govukErrorSummary`, and handed this stage the switch to the layout's `recoverableError` banner, which `kit.base` has accepted since s05 and which the new layout renders. Plants' banner body says "Your answers on this page have been saved" — true in a journey (answers persist before the backend save), false for every one of ins's four cases. | **Switch made.** The four call sites pass `recoverableError: true` through `kit.base` (E19, E22, E24, E26); the four inline `govukErrorSummary` blocks and the `errorList` view-model key go (E17, E21, E23, E25); `copy.errors.load` (dashboard) and `copy.errors.loadList` / `loadForm` / `save` (address book) leave both locales (E27–E30). The banner copy is ins's own: title `'There is a problem'` (plants'), body **`'Sorry, there is a problem with the service. Try again in a few minutes.'`** — plants' sentence without the "saved" claim. The HTTP status stays 500 on every path. The two page-specific messages the unit tests pinned are replaced by the banner text (T3, T4); add and edit gain the failure-path tests they never had (T5–T7). Named in §8. |
| D11 | Where the error summary and the success banner sit. Today both sit below the `h1`; s08 D15 left the position to this stage. | **Above the `h1`**, as plants' templates do (`{% include "shared/error-summary.njk" %}` is the first thing in `journeyContent` on identification-numbers; the success banner is the first thing on plants' dashboard). GDS puts both at the top of the main content. The `recoverableError` banner is rendered by the layout above `journeyContent`, so it is above the `h1` by construction. |
| D12 | Which `govuk-heading-*` class replaces `appHeading` (`govuk-heading-xl govuk-!-margin-bottom-2` plus an optional `govuk-caption-m`). | **`govuk-heading-xl` on the dashboard and the address-book list; `govuk-heading-l` on add, edit, view, delete, the error page and the unauthorised page.** That is the animals split: xl on the dashboard and the hub (a section's landing page), l on every other page. The address-book list is the address book's landing page. No caption anywhere (D9). |
| D13 | The edit, view and delete templates render their own `govukBackLink` in the page body from `backLink`. | **The three inline calls go; the layout renders the back link in `beforeContent` from the same `backLink`** (E21, E23, E25 drop the import and the call). Same text (`sharedCopy.layout.back`), same href, one place. The fit specs' `getByRole('link', { name: 'Back' })` assertions (view, edit, delete) still find exactly one link. |
| D14 | "Port the animals client stylesheet scaffold where ins differs (core/_header.scss, helpers)". Compared at planning time: `core/_header.scss`, `helpers/_index.scss`, `helpers/_links.scss`, `variables/_index.scss`, `variables/_colours.scss`, `core/_index.scss`, `partials/_index.scss` are **already byte-identical** to both journeys. `core/_main.scss` differs by the journeys' `.app-link-button` and `.app-form-inline` (styling for the journeys' post-action buttons — nothing in ins renders either class). `application.scss` and `_govuk-frontend.scss` differ by the MoJ date-picker import (journey-only) and by the Vite `pkg:` importer / `$govuk-assets-path` (s10). | **Only `components/_index.scss` changes: the two `@use` lines for the deleted components go, leaving plants' comment line** (E32). `.app-link-button` / `.app-form-inline` are not ported (dead CSS in ins); the two Vite/MoJ files are s10's. `.app-main-wrapper` stays in `core/_main.scss` exactly as both journeys keep it (unused there too since the DR1 layout stopped setting `mainClasses`). |
| D15 | `globals.js` exports `govukRebrand = true` and the old layout passes `useTudorCrown: true` to `govukHeader`. ins is on govuk-frontend 6.2.0; the rebrand is the only look in v6 and neither flag exists in the package (`grep -rl "govukRebrand\|useTudorCrown" node_modules/govuk-frontend/dist/govuk` returns nothing). | **Both go.** `globals.js` becomes plants' placeholder verbatim (E5); the new layout's `govukHeader` call is plants' (no `serviceName`, no `serviceUrl`, no `useTudorCrown`). The `nunjucks.js` loop that registers globals is untouched — it iterates an empty module. |
| D16 | `test-helpers/component-helpers.js` (repo root) — s02's open question. Its only importers are the two component tests this stage deletes. | **Deleted with them** (§1). s02's question is closed for ins; plants' dead copy is still plants' business. `lodash` stays in `package.json`: `src/config/nunjucks/filters/filters.js` imports `lodash/assign.js`. |
| D17 | The service navigation's mobile menu toggle needs govuk-frontend's `ServiceNavigation` component initialised. | **`application.js` gains `ServiceNavigation` in the `govuk-frontend` import and `createAll(ServiceNavigation)`** in plants' position (after `Radios`, before `SkipLink`); ins's `initAddressBookSuccessBanner()` stays (E33). Verified `ServiceNavigation` is exported by `node_modules/govuk-frontend/dist/govuk/all.mjs` in 6.2.0. |
| D18 | Test shape. | **`layout.test.js` is rewritten in plants' shape** (service navigation, phase banner, breadcrumbs, surfaces) plus ins-only blocks for the title, the back link, the recoverable-error banner and the footer (E2, 24 tests). **`context.test.js` keeps ins's shape** (synchronous, Vite manifest, the `isProduction` config mock) and gains plants' `#activeNavigationItem` describe adapted to ins paths (E4). Controller tests keep asserting English literals (s07 D19). |
| D19 | Welsh. | Plants' `layout` block verbatim for the keys ins now renders (`serviceName`, `errorTitlePrefix`, `phaseBanner.*`, `serviceNavigation.*` — machine draft, plants' header line already on the file). `recoverableError` is drafted here with ins's body. New strings use the typographic apostrophe (s07 D16); strings copied from plants keep plants' spelling. TRANSLATOR REVIEW REQUIRED stays true (s07's note). |
| D20 | `vite.config.js` lists `src/server/common/components` as a Sass load path; after §1 that directory does not exist (git tracks no empty directories). | **Not edited** — s10 owns the build config, and Dart Sass skips a load path that does not exist. `npm run test:fit` runs `vite build` first, so the ladder proves it. `nunjucks.js` keeps the same directory as a template root for the same reason (plants has it; a missing search path is inert). |
| D21 | Comments. | The layout's three why-comments are plants' and come with it; the account-placeholder comment is reworded because ins's address book is real (E1). `activeNavigationItem`'s doc block is plants' with ins's example (E3). `kit.base`'s `recoverableError` doc line is reworded to match D10's meaning (E6). The address-book `copy.en.js` header sentence about `errors` becomes exactly true once the three page-level keys go — no edit needed. No migration or rename wording anywhere (§6G). |
| D22 | Format. | Run `npm --prefix … run format` once after the edits and before the ladder. Templates and SCSS are not in prettier's globs; `lint:scss` covers the SCSS. |

---

## 1. Moves — every file that moves or is deleted

Nothing moves. Eleven files are deleted. Use `git rm` (single files) and `git rm -r` (directories) so the index is
right first time; never `rm -r`.

| From (`~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/`) | To | Why |
|---|---|---|
| `src/server/common/components/heading/_heading.scss` | deleted | D12 |
| `src/server/common/components/heading/macro.njk` | deleted | D12 |
| `src/server/common/components/heading/template.njk` | deleted | D12 |
| `src/server/common/components/heading/template.test.js` | deleted (3 tests) | D12 |
| `src/server/common/components/service-header/_service-header.scss` | deleted | brief |
| `src/server/common/components/service-header/macro.njk` | deleted | brief |
| `src/server/common/components/service-header/template.njk` | deleted | brief |
| `src/server/common/components/service-header/template.test.js` | deleted (4 tests) | brief |
| `src/config/nunjucks/context/build-navigation.js` | deleted | brief |
| `src/config/nunjucks/context/build-navigation.test.js` | deleted (3 tests) | brief |
| `test-helpers/component-helpers.js` | deleted | D16 |

Commands (one per Bash call):

```
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend rm -r src/server/common/components
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend rm src/config/nunjucks/context/build-navigation.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend rm src/config/nunjucks/context/build-navigation.test.js
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend rm -r test-helpers
```

After these, `src/server/common/` holds `README.md`, `constants/`, `helpers/`, `services/`, `templates/partials/README.md`
and `test-helpers/` — exactly the programme target tree for `common/`. Nothing in `docker/`, `compose.yml`,
`README.md`, `Dockerfile`, `nodemon.json`, `vitest.config.js`, `eslint.config.js`, `stylelint.config.js`,
`playwright.config.js`, `sonar-project.properties` or `.github/workflows/` names a deleted path (grep at planning
time; `vite.config.js`'s load-path entry is D20).

---

## 2. Edits — every file whose content changes

Every edit gives the finished content or the exact hunk. Do §1 first, then E1–E33 in order, then `npm run format`,
then §5's tests are already inside the E-list (they are edits to existing files), then the ladder.

### E1 — `src/server/app/shared/layout.njk` — full content

Plants' `layout.njk` with the D2 blocks kept from ins, the D5/D6 navigation, and the D8 `staleActionRejected` block
removed. Write it exactly:

```njk
{% extends "govuk/template.njk" %}

{% from "govuk/components/back-link/macro.njk" import govukBackLink %}
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}
{% from "govuk/components/phase-banner/macro.njk" import govukPhaseBanner %}
{% from "govuk/components/service-navigation/macro.njk" import govukServiceNavigation %}
{% from "govuk/components/tag/macro.njk" import govukTag %}

{# Destination for the alpha phase banner's feedback link. A destination, not
   copy, so it lives here beside the footer's meta links rather than in
   copy.en.js/copy.cy.js — it is identical in both locales. #}
{% set feedbackUrl = "mailto:APHAServiceDesk@apha.gov.uk" %}
{% set signOutUrl = "/signout" %}
{# The account page has no home in this service yet, so it points at a
   placeholder — as Design release 1 does. The dashboard and the address book
   are real pages; their URLs arrive in the view context from paths.js. #}
{% set manageAccountUrl = "#" %}

{% block headIcons %}
  <link rel="icon" sizes="48x48" href="{{ getAssetPath("node_modules/govuk-frontend/dist/govuk/assets/images/favicon.ico") }}">
  <link rel="icon" sizes="any" href="{{ getAssetPath("node_modules/govuk-frontend/dist/govuk/assets/images/favicon.svg") }}" type="image/svg+xml" >
  <link rel="mask-icon" href="{{ getAssetPath("node_modules/govuk-frontend/dist/govuk/assets/images/govuk-icon-mask.svg") }}" color="{{ themeColor }}">
  <link rel="apple-touch-icon" href="{{ getAssetPath("node_modules/govuk-frontend/dist/govuk/assets/images/govuk-icon-180.png") }}">
  <link rel="manifest" href="{{ getAssetPath("node_modules/govuk-frontend/dist/govuk/assets/manifest.json") }}">
{% endblock %}

{% block head %}
  <meta name="csrf-token" content="{{ crumb }}">
  <link href="{{ getAssetPath('src/client/stylesheets/application.scss') }}" rel="stylesheet">
{% endblock %}

{% block pageTitle %}{% if errorSummary %}{{ sharedCopy.layout.errorTitlePrefix }}{% endif %}{{ pageTitle }} | {{ sharedCopy.layout.serviceName }}{% endblock %}

{% block govukHeader %}
  {{ govukHeader({
    homepageUrl: "https://www.gov.uk/",
    classes: "app-header",
    containerClasses: "govuk-width-container"
  }) }}
{% endblock %}

{% block govukServiceNavigation %}
  {% set navigationItems = [] %}
  {% if userSession and userSession.isAuthenticated %}
    {% set navigationItems = [
      {
        text: sharedCopy.layout.serviceNavigation.dashboard,
        href: dashboardUrl,
        active: activeNavigationItem == "dashboard"
      },
      {
        text: sharedCopy.layout.serviceNavigation.addressBook,
        href: addressBookUrl,
        active: activeNavigationItem == "addressBook"
      },
      {
        text: sharedCopy.layout.serviceNavigation.manageAccount,
        href: manageAccountUrl
      },
      {
        text: sharedCopy.layout.serviceNavigation.logOut,
        href: signOutUrl
      }
    ] %}
  {% endif %}
  {{ govukServiceNavigation({
    serviceName: sharedCopy.layout.serviceName,
    serviceUrl: dashboardUrl,
    menuButtonText: sharedCopy.layout.serviceNavigation.menuButton,
    navigation: navigationItems
  }) }}
{% endblock %}

{% block beforeContent %}
  {% set phaseBannerHtml %}{{ sharedCopy.layout.phaseBanner.bodyPrefix }} <a class="govuk-link" href="{{ feedbackUrl }}">{{ sharedCopy.layout.phaseBanner.feedbackLinkText }}</a>.{% endset %}
  {# Grey tag to match Design release 1; the GDS phase-banner example leaves the tag blue. #}
  {{ govukPhaseBanner({
    tag: { text: sharedCopy.layout.phaseBanner.tag, classes: "govuk-tag--grey" },
    html: phaseBannerHtml
  }) }}
  {# No breadcrumbs: Design release 1 gives a page one route backwards — the
     back link — and one route up, the service navigation. #}
  {% if backLink %}
    {{ govukBackLink({ text: sharedCopy.layout.back, href: backLink }) }}
  {% endif %}
{% endblock %}

{% block content %}
  <div class="govuk-grid-row">
    <div class="{{ contentColumnClass | default("govuk-grid-column-two-thirds", true) }}">
      {% if recoverableError %}
        {{ govukNotificationBanner({
          titleText: sharedCopy.recoverableError.title,
          text: sharedCopy.recoverableError.body,
          role: "alert"
        }) }}
      {% endif %}
      {% if journeyStrip %}
        <div class="app-journey-strip govuk-!-margin-bottom-4">
          {{ govukTag({ text: journeyStrip.status.text, classes: journeyStrip.status.classes }) }}
          <span class="govuk-body govuk-!-font-weight-bold">{{ journeyStrip.reference }}</span>
        </div>
      {% endif %}
      {% block journeyContent %}{% endblock %}
    </div>
  </div>
{% endblock %}

{% block govukFooter %}
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

{% block bodyEnd %}
  <script type="module" src="{{ getAssetPath('src/client/javascripts/application.js') }}"></script>
{% endblock %}
```

Gone from today's file: the `govukBreadcrumbs`, `appHeading` and `appServiceHeader` imports; `mainClasses =
"app-main-wrapper"`; the `header` block (with `serviceName`, `serviceUrl`, `useTudorCrown` and the v6 deprecation
comment); the multi-line `pageTitle` block; the `appServiceHeader` call and the breadcrumbs `if`; the empty
`content` block; the `footer` block name (now `govukFooter`, the govuk template's inner block).

### E2 — `src/server/app/shared/layout.test.js` — full content

```js
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { base, SURFACES, surfaceClass } from './kit.js'
import { copy as sharedCopy } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const PHASE_BANNER = 'govuk-phase-banner'
const BREADCRUMBS = 'govuk-breadcrumbs'
const BACK_LINK = 'govuk-back-link'
const NAVIGATION_LIST = 'govuk-service-navigation__list'
const ACTIVE_ITEM = 'govuk-service-navigation__item--active'
const ACTIVE_FALLBACK = 'govuk-service-navigation__active-fallback'
const NOTIFICATION_BANNER = 'govuk-notification-banner'
const { serviceNavigation } = sharedCopy.layout

const signedIn = {
  isAuthenticated: true,
  displayName: 'Sam Example',
  email: 'sam@example.test'
}
const signedOut = { isAuthenticated: false }

const renderLayout = (userSession, context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Dashboard',
    sharedCopy,
    userSession,
    dashboardUrl: '/',
    addressBookUrl: '/address-book',
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

const pageTitleOf = (html) => load(html)('head > title').text()

describe('service navigation', () => {
  it('Should offer the four Design release 1 items on a signed-in page', () => {
    const $ = load(renderLayout(signedIn))
    const items = $('.govuk-service-navigation__item')
    const links = items.find('a')

    expect(items).toHaveLength(4)
    expect(links.map((_, anchor) => $(anchor).text().trim()).get()).toEqual([
      serviceNavigation.dashboard,
      serviceNavigation.addressBook,
      serviceNavigation.manageAccount,
      serviceNavigation.logOut
    ])
    expect(links.map((_, anchor) => $(anchor).attr('href')).get()).toEqual([
      '/',
      '/address-book',
      '#',
      '/signout'
    ])
  })

  it('Should mark the dashboard item active on the dashboard', () => {
    const $ = load(
      renderLayout(signedIn, { activeNavigationItem: 'dashboard' })
    )

    expect($(`.${ACTIVE_ITEM}`)).toHaveLength(1)
    expect($('[aria-current="true"]')).toHaveLength(1)
    expect($(`.${ACTIVE_FALLBACK}`).text()).toBe(serviceNavigation.dashboard)
  })

  it('Should mark the address book item active inside the address book section', () => {
    const $ = load(
      renderLayout(signedIn, { activeNavigationItem: 'addressBook' })
    )

    expect($(`.${ACTIVE_ITEM}`)).toHaveLength(1)
    expect($(`.${ACTIVE_FALLBACK}`).text()).toBe(serviceNavigation.addressBook)
  })

  it('Should mark nothing active outside any navigation section', () => {
    const html = renderLayout(signedIn, { activeNavigationItem: null })

    expect(html).toContain(NAVIGATION_LIST)
    expect(html).not.toContain(ACTIVE_ITEM)
    expect(html).not.toContain('aria-current')
  })

  it('Should not show the signed-in user anywhere, as Design release 1 does not', () => {
    const html = renderLayout(signedIn)

    expect(html).not.toContain('Sam Example')
    expect(html).not.toContain('sam@example.test')
    expect(html).not.toContain('app-service-header')
  })

  it('Should carry the service name and no items when there is no user', () => {
    const html = renderLayout(signedOut)

    expect(html).toContain(sharedCopy.layout.serviceName)
    expect(html).not.toContain(NAVIGATION_LIST)
    expect(html).not.toContain('href="/signout"')
    expect(html).not.toContain(serviceNavigation.logOut)
  })
})

describe('alpha phase banner', () => {
  const feedbackAnchor =
    '<a class="govuk-link" href="mailto:APHAServiceDesk@apha.gov.uk">give your feedback by email</a>'

  it('Should tag the service as alpha in grey and offer the feedback link', () => {
    const html = renderLayout(signedIn)

    expect(html).toContain(PHASE_BANNER)
    expect(html).toContain('govuk-tag--grey')
    expect(html).toContain('Alpha')
    expect(html).toContain(
      `This is a new service. Help us improve it and ${feedbackAnchor}.`
    )
  })

  it('Should render the banner on a signed-out page too', () => {
    expect(renderLayout(signedOut)).toContain(PHASE_BANNER)
  })

  it('Should place the banner above the back link', () => {
    const html = renderLayout(signedIn, { backLink: '/address-book' })

    expect(html.indexOf(PHASE_BANNER)).toBeLessThan(html.indexOf(BACK_LINK))
  })
})

describe('back link', () => {
  it('Should render the back link the view model names, labelled from the shared copy', () => {
    const $ = load(renderLayout(signedIn, { backLink: '/address-book' }))
    const link = $(`a.${BACK_LINK}`)

    expect(link).toHaveLength(1)
    expect(link.text().trim()).toBe(sharedCopy.layout.back)
    expect(link.attr('href')).toBe('/address-book')
  })

  it('Should render no back link on a page with no way back', () => {
    expect(renderLayout(signedIn)).not.toContain(BACK_LINK)
  })
})

describe('breadcrumbs', () => {
  it('Should render no breadcrumb trail, as Design release 1 has none', () => {
    const html = renderLayout(signedIn, { backLink: '/address-book' })

    expect(html).not.toContain(BREADCRUMBS)
  })

  it('Should ignore a breadcrumbs value a caller still passes', () => {
    const html = renderLayout(signedIn, {
      breadcrumbs: [{ text: 'Your addresses', href: '/address-book' }]
    })

    expect(html).not.toContain(BREADCRUMBS)
    expect(html).not.toContain('Your addresses')
  })
})

describe('recoverable error banner', () => {
  it('Should tell the user to try again when a service behind the page failed', () => {
    const $ = load(renderLayout(signedIn, { recoverableError: true }))
    const banner = $(`.${NOTIFICATION_BANNER}`)

    expect(banner).toHaveLength(1)
    expect(banner.attr('role')).toBe('alert')
    expect(banner.text()).toContain(sharedCopy.recoverableError.title)
    expect(banner.text()).toContain(sharedCopy.recoverableError.body)
  })

  it('Should render no banner otherwise', () => {
    expect(renderLayout(signedIn, { recoverableError: false })).not.toContain(
      NOTIFICATION_BANNER
    )
  })
})

describe('page title', () => {
  it('Should follow the page title with the service name', () => {
    expect(pageTitleOf(renderLayout(signedIn))).toBe(
      'Dashboard | Import notification service'
    )
  })

  it('Should prefix the title when the page carries an error summary', () => {
    expect(
      pageTitleOf(renderLayout(signedIn, { errorSummary: { errorList: [] } }))
    ).toBe('Error: Dashboard | Import notification service')
  })
})

describe('content column width by surface', () => {
  it('Should render a display surface at full container width', () => {
    const html = renderLayout(signedIn, {
      contentColumnClass: SURFACES.display
    })

    expect(html).toContain(SURFACES.display)
    expect(html).not.toContain(SURFACES.form)
  })

  it('Should fall back to the reading measure when no surface is declared', () => {
    const html = renderLayout(signedIn)

    expect(html).toContain(SURFACES.form)
    expect(html).not.toContain('class=""')
  })
})

describe('kit surfaces', () => {
  it('Should build page chrome at the reading measure', () => {
    expect(base('Any page').contentColumnClass).toBe(SURFACES.form)
  })

  it('Should give display pages the full container', () => {
    expect(surfaceClass('display')).toBe(SURFACES.display)
  })

  it('Should reject an unknown surface rather than render nothing', () => {
    expect(() => surfaceClass('widescreen')).toThrow(
      /Unknown surface 'widescreen'/
    )
  })

  it('Should reject an inherited Object property as a surface name', () => {
    expect(() => surfaceClass('constructor')).toThrow(
      /Unknown surface 'constructor'/
    )
  })
})

describe('footer', () => {
  it('Should label the three meta links from the shared copy', () => {
    const $ = load(renderLayout(signedIn))
    const links = $('.govuk-footer__inline-list-item a')

    expect(links.map((_, anchor) => $(anchor).text().trim()).get()).toEqual([
      sharedCopy.layout.footer.privacy,
      sharedCopy.layout.footer.cookies,
      sharedCopy.layout.footer.accessibility
    ])
  })
})
```

24 tests (was 2). `govuk-service-navigation__active-fallback` is rendered by govuk-frontend 6.2.0's
service-navigation template line 56 (verified). The `head > title` selector is s07's fix for the header SVG's own
`<title>`; keep it.

### E3 — `src/config/nunjucks/context/context.js` — full content

```js
import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '../../config.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'
import {
  addressBookPath,
  dashboardPath,
  inAddressBookSection,
  inDashboardSection
} from '../../../server/app/shared/paths.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/.vite/manifest.json'
)

let viteManifest

/**
 * Which service-navigation item the current request sits under, so the layout
 * can mark it active. Section-wide, not page-wide: every address-book page is
 * inside the address book's section of the service, which is why the answer
 * for `/address-book/123/edit` is still `addressBook`.
 *
 * @param {string} [requestPath] - the request path.
 * @returns {string|null} the id of the active navigation item, or null when the
 * request is under none of them.
 */
export function activeNavigationItem(requestPath = '') {
  if (inDashboardSection(requestPath)) {
    return 'dashboard'
  }
  if (inAddressBookSection(requestPath)) {
    return 'addressBook'
  }
  return null
}

export function context(request) {
  if (!viteManifest) {
    try {
      viteManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      logger.error(`Vite ${path.basename(manifestPath)} not found`)
    }
  }

  const authData = request.auth?.isAuthenticated
    ? request.auth.credentials
    : null

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    authEnabled: config.get('auth.enabled'),
    activeNavigationItem: activeNavigationItem(request.path),
    dashboardUrl: dashboardPath(),
    addressBookUrl: addressBookPath(),
    userSession: authData
      ? {
          isAuthenticated: true,
          displayName: authData.name || authData.email || 'User',
          email: authData.email
        }
      : {
          isAuthenticated: false
        },
    getAssetPath(asset) {
      const viteAssetPath = viteManifest?.[asset]?.file
      return `${assetPath}/${viteAssetPath ?? asset}`
    },
    crumb: request.plugins?.crumb ?? request.state?.crumb ?? ''
  }
}
```

Differences from today's file: the `build-navigation.js` import becomes the `paths.js` import; `breadcrumbs: []` and
`navigation: buildNavigation(request)` become `activeNavigationItem`, `dashboardUrl`, `addressBookUrl`; the
`activeNavigationItem` export is new. Everything else (manifest, `authData`, `userSession`, `getAssetPath`, `crumb`)
is byte-for-byte today's. Differences from animals' file are exactly D2, D5, D7, D8 (§6J).

### E4 — `src/config/nunjucks/context/context.test.js` — three hunks

**Hunk 1** — replace both `expect(contextResult).toEqual({ … })` literals (the one in `'Should provide expected
context'` under `#context`, and the one under `#context cache`) with a shared constant. Add after the `vi.mock(import(
'../../config.js') …)` block (before `describe('context and cache'`):

```js
const expectedContext = {
  assetPath: '/public/assets',
  getAssetPath: expect.any(Function),
  serviceName: 'trade-imports-ins-frontend',
  serviceUrl: '/',
  authEnabled: true,
  activeNavigationItem: 'dashboard',
  dashboardUrl: '/',
  addressBookUrl: '/address-book',
  userSession: {
    isAuthenticated: false
  },
  crumb: ''
}
```

and make both tests `expect(contextResult).toEqual(expectedContext)`. The `breadcrumbs: []` and `navigation: [ … ]`
keys are gone from both.

**Hunk 2** — the `'Should expose authenticated user details in userSession'` test is unchanged (its request has
`path: '/address-book'`; `userSession` is all it asserts).

**Hunk 3** — append at the very end of the file (after the closing `})` of `describe('context and cache'`):

```js
describe('#activeNavigationItem', () => {
  let activeNavigationItem

  beforeAll(async () => {
    ;({ activeNavigationItem } = await import('./context.js'))
  })

  test('Should mark the dashboard on the dashboard', () => {
    expect(activeNavigationItem('/')).toBe('dashboard')
  })

  test('Should mark the address book on the address book', () => {
    expect(activeNavigationItem('/address-book')).toBe('addressBook')
  })

  test('Should keep the address book marked inside an address', () => {
    expect(activeNavigationItem('/address-book/abc-123/edit')).toBe(
      'addressBook'
    )
  })

  test('Should mark nothing on a path that merely starts with the section name', () => {
    expect(activeNavigationItem('/address-bookkeeping')).toBeNull()
  })

  test('Should mark nothing on a page outside the navigation', () => {
    expect(activeNavigationItem('/auth/sign-out')).toBeNull()
  })

  test('Should mark nothing when there is no path', () => {
    expect(activeNavigationItem(undefined)).toBeNull()
  })
})
```

8 → 14 tests. Everything else in the file (the mocks, the `isProduction` config mock, the manifest-failure and cache
describes) is untouched.

### E5 — `src/config/nunjucks/globals/globals.js` — full content (plants verbatim, D15)

```js
// Placeholder for Nunjucks global functions and variables.
// Add exports here to make them available in all templates via nunjucksConfig.
export {}
```

### E6 — `src/server/app/shared/kit.js` — two hunks

**Hunk 1** — insert after the `export const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })` line and before
`const LAYOUT = 'shared/layout.njk'`, with one blank line either side (plants lines 25–37 verbatim):

```js
export const SURFACES = Object.freeze({
  form: 'govuk-grid-column-two-thirds',
  display: 'govuk-grid-column-full'
})

export const surfaceClass = (surface) => {
  if (!Object.hasOwn(SURFACES, surface)) {
    throw new Error(
      `Unknown surface '${surface}'. Expected one of: ${Object.keys(SURFACES).join(', ')}`
    )
  }
  return SURFACES[surface]
}
```

**Hunk 2** — replace the `base` doc block and function (from `/**\n * The chrome every page shares.` to the closing
`})`) with:

```js
/**
 * The chrome every page shares.
 *
 * @param {string} title - the page title.
 * @param {object} [options]
 * @param {string} [options.backLink] - where the back link goes; omit it on a
 * page with no way back.
 * @param {boolean} [options.recoverableError] - a service behind the page
 * failed, so it could not be built or its form could not be saved; the
 * layout tells the user to try again.
 * @returns {object} the common view model. `contentColumnClass` is the
 * reading measure; a page that lays out a table overrides it with
 * `surfaceClass('display')`.
 */
export const base = (title, { backLink, recoverableError = false } = {}) => ({
  layout: LAYOUT,
  pageTitle: title,
  backLink,
  sharedCopy,
  recoverableError,
  contentColumnClass: SURFACES.form
})
```

### E7 — `src/server/app/shared/paths.js` — append

After the last line (`addressDeleteRoutePath`), one blank line, then:

```js
export const inDashboardSection = (path) => path === dashboardPath()
export const inAddressBookSection = (path) =>
  path === addressBookPath() || path.startsWith(`${addressBookPath()}/`)
```

### E8 — `src/server/app/shared/paths.test.js` — two hunks

**Hunk 1** — the import list gains `inAddressBookSection` and `inDashboardSection` in alphabetical position (after
`dashboardPath`):

```js
import {
  addressAddPath,
  addressBookPath,
  addressDeletePath,
  addressDeleteRoutePath,
  addressEditPath,
  addressEditRoutePath,
  addressPath,
  addressRoutePath,
  dashboardPath,
  inAddressBookSection,
  inDashboardSection
} from './paths.js'
```

**Hunk 2** — append at the end of the file:

```js
describe('navigation sections', () => {
  it('Should place only the dashboard itself in the dashboard section', () => {
    expect(inDashboardSection(dashboardPath())).toBe(true)
    expect(inDashboardSection(addressBookPath())).toBe(false)
  })

  it('Should place every address-book page in the address book section, and nothing that merely starts with its name', () => {
    expect(
      [
        addressBookPath(),
        addressAddPath(),
        addressEditPath(ADDRESS_ID),
        '/address-bookkeeping',
        dashboardPath()
      ].map(inAddressBookSection)
    ).toEqual([true, true, true, false, false])
  })
})
```

### E9 — `src/server/app/shared/kit.test.js` — two hunks

**Hunk 1** — the `./kit.js` import gains `SURFACES` (alphabetical, after `routeOptions`):

```js
import {
  base,
  errorSummary,
  fieldError,
  pageRoutes,
  requireOrganisationId,
  routeOptions,
  sharedCopy,
  SURFACES
} from './kit.js'
```

**Hunk 2** — the `'Should name the layout, carry the title and default the rest'` pin becomes:

```js
    expect(base('Dashboard')).toEqual({
      layout: 'shared/layout.njk',
      pageTitle: 'Dashboard',
      backLink: undefined,
      sharedCopy,
      recoverableError: false,
      contentColumnClass: SURFACES.form
    })
```

Test count unchanged (the surface tests live in E2, as in plants).

### E10 — `src/server/app/shared/copy.en.js` — the `copy` export (D9, D10, D19)

Replace everything from the header comment down to the closing `}` of `export const copy` (leave the
`validatorDefaults` doc block and export untouched):

```js
/**
 * Shared chrome copy — the only copy that legitimately lives outside a
 * feature folder: the layout (service name, service navigation, phase
 * banner, back link, error title prefix, footer), the unauthorised page,
 * the error-summary title, the recoverable-error banner and the error
 * page's messages. Every view reaches it as `sharedCopy` via `kit.base`.
 */
export const copy = {
  layout: {
    serviceName: 'Import notification service',
    errorTitlePrefix: 'Error: ',
    back: 'Back',
    phaseBanner: {
      tag: 'Alpha',
      bodyPrefix: 'This is a new service. Help us improve it and',
      feedbackLinkText: 'give your feedback by email'
    },
    serviceNavigation: {
      menuButton: 'Menu',
      dashboard: 'Dashboard',
      addressBook: 'Address book',
      manageAccount: 'Manage account',
      logOut: 'Log out'
    },
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
  recoverableError: {
    title: 'There is a problem',
    body: 'Sorry, there is a problem with the service. Try again in a few minutes.'
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

### E11 — `src/server/app/shared/copy.cy.js` — the `copy` export

Replace from `export const copy = {` to its closing `}` (keep the MACHINE-DRAFT header line and `validatorDefaults`):

```js
export const copy = {
  layout: {
    serviceName: 'Gwasanaeth hysbysu mewnforio',
    errorTitlePrefix: 'Gwall: ',
    back: 'Yn ôl',
    phaseBanner: {
      tag: 'Alffa',
      bodyPrefix: "Gwasanaeth newydd yw hwn. Helpwch ni i'w wella —",
      feedbackLinkText: 'rhowch eich adborth drwy e-bost'
    },
    serviceNavigation: {
      menuButton: 'Dewislen',
      dashboard: 'Dangosfwrdd',
      addressBook: 'Llyfr cyfeiriadau',
      manageAccount: 'Rheoli cyfrif',
      logOut: 'Allgofnodi'
    },
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
  recoverableError: {
    title: 'Mae problem',
    body: 'Mae’n ddrwg gennym, mae problem gyda’r gwasanaeth. Rhowch gynnig arall arni ymhen ychydig funudau.'
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

### E12 — `src/server/app/shared/copy.test.js` — append one describe (T2)

Insert after the `describe('error-page copy', …)` block and before `describe('shared copy module', …)`:

```js
describe('layout copy', () => {
  it('Should name the service and the four navigation items the fit specs click', () => {
    expect(sharedEn.layout.serviceName).toBe('Import notification service')
    expect(sharedEn.layout.serviceNavigation).toEqual({
      menuButton: 'Menu',
      dashboard: 'Dashboard',
      addressBook: 'Address book',
      manageAccount: 'Manage account',
      logOut: 'Log out'
    })
  })

  it('Should tell the user to try again when a service behind a page fails', () => {
    expect(sharedEn.recoverableError).toEqual({
      title: 'There is a problem',
      body: 'Sorry, there is a problem with the service. Try again in a few minutes.'
    })
  })
})
```

### E13 — `src/server/app/copy-convention.test.js` — one line

In `'Should carry the chrome namespaces in the shared module'`, the `arrayContaining` list becomes
`['layout', 'unauthorised', 'errorSummary', 'recoverableError', 'errorPage']`.

### E14 — `src/server/app/shared/error.njk` — full content (plants verbatim)

```njk
{% extends "shared/layout.njk" %}

{% block journeyContent %}
  <h1 class="govuk-heading-l">{{ heading }}</h1>

  <p class="govuk-body">{{ message }}</p>
{% endblock %}
```

(`errors.test.js`'s `'>500</h1>'` pin still matches.)

### E15 — `src/server/app/auth/unauthorised.njk` — full content (plants verbatim)

```njk
{% extends 'shared/layout.njk' %}

{% set mainClasses = "govuk-main-wrapper--l" %}

{# Destination for the retry link. A destination, not copy, so it lives here
   rather than in copy.en.js/copy.cy.js — it is identical in both locales. #}
{% set signInUrl = "/auth/sign-in" %}

{% block journeyContent %}
  <h1 class="govuk-heading-l">{{ sharedCopy.unauthorised.heading }}</h1>
  <p class="govuk-body">{{ sharedCopy.unauthorised.bodyPrefix }} <a class="govuk-link" href="{{ signInUrl }}">{{ sharedCopy.unauthorised.signInLinkText }}</a>.</p>
{% endblock %}
```

(Two changes from today: the block name and the `extends` quote style — after this the file equals plants'
byte-for-byte.)

### E16 — `src/server/app/features/dashboard/template.njk` — full content

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/pagination/macro.njk" import govukPagination %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/select/macro.njk" import govukSelect %}

{% block journeyContent %}
  <h1 class="govuk-heading-xl">{{ copy.title }}</h1>

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
{% endblock %}
```

Gone: the `govukErrorSummary` import and block, `appHeading` with its `serviceName` caption, the
`govuk-body`/`app-page-body` wrapper (and its indentation level). The `data-testid`s on the empty/no-results/results
paragraphs stay.

### E17 — `src/server/app/features/address-book/list/template.njk` — full content

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/pagination/macro.njk" import govukPagination %}
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}
{% from "govuk/components/input/macro.njk" import govukInput %}

{% block journeyContent %}
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

  <h1 class="govuk-heading-xl">{{ copy.list.title }}</h1>

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
{% endblock %}
```

Gone: `govukErrorSummary` import and block, `appHeading`, the wrapper div. Moved: the success banner now precedes
the `h1` (D11). `address-book-success-banner` keeps its id (the client script reads it).

### E18 — `src/server/app/features/address-book/add/template.njk` — head of file

Replace lines 1–20 (everything up to and including the `{% endif %}` that closes the `errorList` block) with:

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/select/macro.njk" import govukSelect %}

{% block journeyContent %}
  {% include "shared/error-summary.njk" %}

  <h1 class="govuk-heading-l">{{ copy.add.title }}</h1>

```

Then delete the `</div>` line that closed the wrapper (the line before the final blank line and `{% endblock %}`),
and dedent the whole `<form … </form>` by two spaces so it sits at the block's indentation. The form's content is
otherwise unchanged (both `h2.govuk-heading-m` section headings stay).

### E19 — `src/server/app/features/address-book/edit/template.njk` — head of file

Replace lines 1–26 (through the `{% endif %}` closing the `errorList` block) with:

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/select/macro.njk" import govukSelect %}

{% block journeyContent %}
  {% include "shared/error-summary.njk" %}

  <h1 class="govuk-heading-l">{{ copy.edit.title }}</h1>

```

Gone: the `govukErrorSummary` and `govukBackLink` imports, the inline back link (D13), `appHeading`, the wrapper
`div` and its `errorList` block. As in E18, remove the closing `</div>` and dedent the form by two spaces.

### E20 — `src/server/app/features/address-book/view/template.njk` — full content

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}

{% block journeyContent %}
  <h1 class="govuk-heading-l">{{ heading }}</h1>

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
{% endblock %}
```

### E21 — `src/server/app/features/address-book/delete/template.njk` — full content

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block journeyContent %}
  <h1 class="govuk-heading-l">{{ copy.delete.title }}</h1>

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
{% endblock %}
```

### E22 — `src/server/app/features/dashboard/controller.js` — two hunks (D4, D10)

**Hunk 1** — `buildView` becomes:

```js
const buildView = (
  h,
  { sort, referenceNumber, hasSearch },
  { recoverableError = false, ...model }
) =>
  h.view(view, {
    ...kit.base(copy.title, { recoverableError }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    listHref: dashboardPath(),
    sort,
    sortOptions: sortOptionsOf(sort),
    referenceNumber,
    hasSearch,
    startNewNotificationHref: buildStartNewNotificationLink(),
    ...model
  })
```

**Hunk 2** — in `get`'s `catch`, the line `errorList: [{ text: copy.errors.load }]` becomes `recoverableError: true`.

### E23 — `src/server/app/features/address-book/list/controller.js` — two hunks

**Hunk 1** — `buildView` becomes:

```js
const buildView = (h, { recoverableError = false, ...model }) =>
  h.view(view, {
    ...kit.base(copy.list.title, { recoverableError }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    listHref: addressBookPath(),
    addHref: addressAddPath(),
    ...model
  })
```

**Hunk 2** — in `get`'s `catch`, `errorList: [{ text: copy.errors.loadList }]` becomes `recoverableError: true`.

### E24 — `src/server/app/features/address-book/add/controller.js` — three hunks

**Hunk 1** — `buildView` becomes:

```js
const buildView = (
  h,
  { formValues, countryItems, errors = {}, recoverableError = false }
) =>
  h.view(view, {
    ...kit.base(copy.add.title, { recoverableError }),
    copy,
    formValues,
    countryItems,
    errors,
    errorSummary: kit.errorSummary(errors)
  })
```

**Hunk 2** — in `get`'s `catch`, `errorList: [{ text: copy.errors.loadForm }]` becomes `recoverableError: true`.

**Hunk 3** — in `post`'s final `catch` branch, `errorList: [{ text: copy.errors.save }]` becomes
`recoverableError: true`.

### E25 — `src/server/app/features/address-book/edit/controller.js` — two hunks

**Hunk 1** — `buildView` becomes:

```js
const buildView = (
  h,
  { id, formValues, countryItems, errors = {}, recoverableError = false }
) =>
  h.view(view, {
    ...kit.base(copy.edit.title, { backLink: addressPath(id), recoverableError }),
    copy,
    formValues,
    countryItems,
    errors,
    errorSummary: kit.errorSummary(errors)
  })
```

(prettier may wrap the `kit.base(...)` call — let `npm run format` decide.)

**Hunk 2** — in `post`'s final `catch` branch, `errorList: [{ text: copy.errors.save }]` becomes
`recoverableError: true`.

### E26 — `src/server/app/features/dashboard/copy/copy.en.js` — delete the `errors` namespace

Remove the trailing `,` after the `empty` object's `}` and delete the four lines:

```js
  errors: {
    load: 'Something went wrong loading the dashboard'
  }
```

### E27 — `src/server/app/features/dashboard/copy/copy.cy.js` — the same four lines

Delete `errors: { load: 'Aeth rhywbeth o’i le wrth lwytho’r dangosfwrdd' }` and the comma before it.

### E28 — `src/server/app/features/address-book/copy/copy.en.js` — three lines

In `errors`, delete the three leading keys `loadList`, `loadForm`, `save` (lines 75–77). `errors` now begins with
`name: {`. The header comment's description of `errors` is already exactly right.

### E29 — `src/server/app/features/address-book/copy/copy.cy.js` — three lines

Delete the `loadList`, `loadForm`, `save` keys from `errors`.

### E30 — `src/server/common/helpers/errors.test.js` — two literals (D9)

`'Page not found | trade-imports-ins-frontend'` → `'Page not found | Import notification service'`;
`'Something went wrong | trade-imports-ins-frontend'` → `'Something went wrong | Import notification service'`.

### E31 — `src/server/app/features/dashboard/controller.test.js` and the address-book controller tests (T1, T3–T7)

Given in §5.

### E32 — `src/client/stylesheets/components/_index.scss` — full content

```scss
// import custom component styles
```

### E33 — `src/client/javascripts/application.js` — full content (D17)

```js
import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  ServiceNavigation,
  SkipLink
} from 'govuk-frontend'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(ServiceNavigation)
createAll(SkipLink)

import { initAddressBookSuccessBanner } from './address-book-success-banner.js'

initAddressBookSuccessBanner()
```

---

## 3. New files — full intent, and the reference file to imitate

None. Every new test lands inside an existing test file (E2, E4, E8, E12, §5).

---

## 4. Imports — the rule for rewriting the imports this stage disturbs

Nothing moves, so no specifier changes spelling. The disturbed imports are:

- `context.js`: `./build-navigation.js` is removed; `../../../server/app/shared/paths.js` is added (E3) — the same
  relative form animals' context uses, shortest path (s02 D1).
- `paths.test.js` and `kit.test.js`: named imports added to existing statements (E8, E9); alphabetical within the
  braces as the files already are.
- `application.js`: `ServiceNavigation` added to the `govuk-frontend` named import (E33), in govuk's alphabetical
  order.
- Templates: `{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}` leaves the dashboard,
  list, add and edit templates; `{% from "govuk/components/back-link/macro.njk" import govukBackLink %}` leaves edit,
  view and delete; the layout's `appHeading`, `appServiceHeader` and `govukBreadcrumbs` imports go; the layout gains
  plants' five imports. No template imports a macro it does not call afterwards (§6B greps for it).
- Tests: `add/controller.test.js` gains `import nock from 'nock'` (T5).

---

## 5. Tests — which move, which change, which are new, and what each pins

### Moved (0)

### Deleted (3 files, 10 tests)

`heading/template.test.js` (3), `service-header/template.test.js` (4), `build-navigation.test.js` (3) — their
subjects are gone (§1). Their intent survives: the heading text is pinned by every controller test's title literal
and every fit spec's `getByRole('heading')`; the navigation is pinned by E2 and E4.

### Changed in place

| File | Change | Pins |
|---|---|---|
| `shared/layout.test.js` (E2) | rewritten, 2 → 24 tests | the four items and their hrefs incl. `/signout`; active marking for both sections; no user shown; no items signed out; phase banner and its order above the back link; back link from `backLink`; no breadcrumbs even when passed; recoverable-error banner with `role="alert"`; title with and without the `Error: ` prefix; surfaces; footer labels |
| `context/context.test.js` (E4) | 8 → 14 tests | the context shape without `breadcrumbs`/`navigation`, with `activeNavigationItem`, `dashboardUrl`, `addressBookUrl`; `activeNavigationItem` over six paths |
| `shared/paths.test.js` (E8) | +2 | the two section predicates, including the `/address-bookkeeping` non-match |
| `shared/kit.test.js` (E9) | 0 | `base` carries `contentColumnClass: SURFACES.form` |
| `shared/copy.test.js` (E12) | +2 | the service name, the navigation labels and the banner wording as literals |
| `copy-convention.test.js` (E13) | 0 | `recoverableError` is a chrome namespace |
| `common/helpers/errors.test.js` (E30) | 0 | the two titles with the new service name |
| `dashboard/controller.test.js` (T1, T3) | 0 | full-width surface; banner on backend failure |
| `address-book/list/controller.test.js` (T1, T4) | 0 | full-width surface; banner on backend failure |
| `address-book/add/controller.test.js` (T5, T6) | +2 | banner when reference data is down; banner when the save fails; `Error: ` title on a refused form |
| `address-book/edit/controller.test.js` (T7) | +1 | banner when the update fails |

### Unchanged but load-bearing (listed so nobody "fixes" them)

- Every `*.fit.spec.js` and `fit/address-form.js`, `fit/seed-address.js` — the brief's acceptance test. §6E proves
  the directory has no diff.
- `common/helpers/errors.test.js`'s `'>500</h1>'` pin — E14 still renders it.
- `auth/controller.test.js`'s three `'Sorry, we are unable to sign you in'` pins — E15 still renders it.
- `plugins/csrf.test.js` — renders the add form in stub mode and reads the crumb input, which E18 keeps.
- `app/routes.test.js` — the nine-route list is untouched.

### T1 — surface pins in the two list tests

In `dashboard/controller.test.js`'s first test (`'renders notifications with reference, status, origin, commodity
and arrival date'`) add, after its `expect(statusCode).toBe(statusCodes.ok)` line:

```js
    expect(result).toContain('govuk-grid-column-full')
```

Same line in `list/controller.test.js`'s `'renders address list with Name, Address and Country columns'` after its
status assertion.

### T3 — `dashboard/controller.test.js`, the backend-failure test

Rename `'shows an error page when the backend call fails'` to `'shows the recoverable-error banner when the backend
call fails'` and replace its last assertion with:

```js
    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('govuk-notification-banner')
    expect(result).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expect(result).not.toContain('govuk-error-summary')
```

### T4 — `list/controller.test.js`, `'returns 500 when the address book cannot be reached'`

Same replacement as T3 for its last assertion (the `'Something went wrong loading your address book'` line).

### T5 — `add/controller.test.js`, two new tests

Add `import nock from 'nock'` as the first import (before the `vitest` import). Insert after `'GET renders country
select options from reference data'`:

```js
  test('GET shows the recoverable-error banner when reference data cannot be reached', async () => {
    nock.cleanAll()
    referenceDataApi()
      .get('/countries')
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add',
      auth: sessionAuth('add-get-countries-500')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('govuk-notification-banner')
    expect(result).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expect(result).toContain('Add address details')
  })
```

(`serveCountries` in `beforeEach` registers a persisted 200 interceptor; `nock.cleanAll()` clears it so the 503
answers. `runInRealMode`'s `afterEach` cleans again and the next `beforeEach` re-serves.) Add `referenceDataApi` to
the `real-mode.js` import (alphabetical: `addressBookApi, referenceDataApi, runInRealMode, serveCountries`).

Insert after `'POST creates address and redirects with success banner'`:

```js
  test('POST shows the recoverable-error banner when the address book rejects the save with a server error', async () => {
    addressBookApi()
      .post(ADDRESSES_PATH)
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-500'),
      payload: validPayload
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('govuk-notification-banner')
    expect(result).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expect(result).toContain('value="Highland Livestock Ltd"')
  })
```

### T6 — `add/controller.test.js`, `'POST with invalid data re-renders form with errors'`

Add one assertion after `expect(result).toContain('There is a problem')`:

```js
    expect(result).toContain(
      'Error: Add address details | Import notification service'
    )
```

### T7 — `edit/controller.test.js`, one new test

Insert after `'POST returns 404 when the address book rejects the update with 404'`:

```js
  test('POST shows the recoverable-error banner when the address book rejects the update with a server error', async () => {
    addressBookApi()
      .put(ADDRESS_PATH)
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-post-500'),
      payload: validPayload
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('govuk-notification-banner')
    expect(result).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expect(result).toContain('value="Highland Livestock Ltd"')
  })
```

### Arithmetic

| | Files | Tests |
|---|---|---|
| Baseline (s08) | 58 | 467 |
| Deleted (§1) | −3 | −10 |
| `layout.test.js` 2 → 24 | | +22 |
| `context.test.js` 8 → 14 | | +6 |
| `paths.test.js` | | +2 |
| `shared/copy.test.js` | | +2 |
| `add/controller.test.js` | | +2 |
| `edit/controller.test.js` | | +1 |
| **Expected** | **55** | **492** |

Playwright: 49/49, unchanged.

---

## 6. Invariants to prove — and the check that proves each held

Run every command from the workspace root in one Bash call each; write any long output to
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s09-<name>.log` and read it once.

**A. Public URL surface unchanged (invariant 1).** `app/routes.test.js` and `paths.test.js` are untouched apart from
E8's additions and green in the ladder. The chassis routes: 
`grep -rn "path: '" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src --include=*.js --exclude=*.test.js`
returns the same set as s06's close (auth, health, signout, favicon, static, the cookie path) — this stage edits no
route file.

**B. No stale names.**
`grep -rn "appHeading\|appServiceHeader\|breadcrumbs\|buildNavigation\|build-navigation\|app-heading\|app-service-header\|app-page-body\|renderComponent\|component-helpers\|govukRebrand\|useTudorCrown\|staleActionRejected\|errorList\|block content" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src`
must return exactly: `errorList` in `shared/kit.js` (the `errorSummary` builder, lines ~45), `shared/kit.test.js`
(its tests) and `shared/layout.test.js` (the `errorSummary: { errorList: [] }` fixture in the title test); `block
content` in `shared/layout.njk` only (the layout's own block); `breadcrumbs` in `shared/layout.test.js` (the
`BREADCRUMBS` constant, the `describe('breadcrumbs')` block and the "ignores a breadcrumbs value" test) and in
`shared/layout.njk` (E1's `{# No breadcrumbs: Design release 1 … #}` comment, verbatim from plants); `app-service-header`
in `shared/layout.test.js` only (E2's `expect(html).not.toContain('app-service-header')`). Anything else is a miss.
Then `grep -rn "govukErrorSummary\|govukBackLink" …/src --include=*.njk` must return only `shared/error-summary.njk`
(import + call) and `shared/layout.njk` (import + call).

**C. `/address-book` is written only by `paths.js` (s06 §6C, now fully true).**
`grep -rn "'/address-book\|\"/address-book" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src --include=*.js --include=*.njk --exclude=*.test.js`
→ only `src/server/app/shared/paths.js`. (`build-navigation.js`, the pre-existing miss s06 deferred, is gone.)

**D. Every user-facing string in copy (invariant 5).**
`grep -n "text: \"" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/shared/layout.njk`
→ nothing (every `text:` reads `sharedCopy.…`). `copy-parity.test.js` and `copy-convention.test.js` are green in
the ladder — they walk the new keys in both locales. `jq` is not needed: the copy files are ES modules and the two
guards are the check.

**E. The fit specs are untouched.**
`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached --stat -- src/server/app/features/address-book/fit src/server/app/features/dashboard/fit`
→ empty. Then `npm run test:fit` (ladder) → 49 passed.

**F. No cross-repo import (invariant 4).**
`grep -rn "from '.*trade-imports-\(animals\|plants\)" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src`
→ nothing.

**G. No migration comments (invariant 6).**
`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s09-full-diff.log`
then `grep -n "^+.*\(renamed\|moved from\|migrat\|previously\|formerly\|no longer\|used to\)" …/logs/s09-full-diff.log`
→ nothing.

**H. The deleted paths are gone.**
`ls ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/common/components` → "No such
file or directory"; same for `…/test-helpers` and `…/src/config/nunjucks/context/build-navigation.js`.

**I. The layout is plants' apart from the named differences (D2, D5, D6, D8).**
`diff ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/shared/layout.njk ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/shared/layout.njk > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s09-layout-vs-plants.diff`
(exit 1 is expected). Read it once. The only hunks: (1) the `{% set %}` block — `homeUrl` line gone, `signOutUrl`
value, the placeholder comment and the `addressBookUrl` line; (2) the added `headIcons` block; (3) the `head` and
`bodyEnd` asset keys (`src/client/…`); (4) the two navigation `href`s, the address-book `active:` line and
`serviceUrl: dashboardUrl`; (5) the removed `staleActionRejected` block. Any other hunk is a miss.

**J. `context.js` is animals' apart from the named differences.** Compared by eye against
`repos/trade-imports-animals-frontend/src/config/nunjucks/context/context.js`: Vite manifest path and
`?.file` (D2); `activeNavigationItem` body and doc example (D6); synchronous `request.auth.credentials` read and
`authData.name` (D7); no `staleActionRejected` (D8); `dashboardUrl`, `addressBookUrl`, `crumb` (D5, ins). Nothing
else.

**K. The diff-stat is exactly this stage.**
`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --cached --name-status > …/logs/s09-name-status.log`
→ 11 `D` (§1) and 36 `M`: `src/server/app/shared/{layout.njk, layout.test.js, kit.js, kit.test.js, paths.js,
paths.test.js, copy.en.js, copy.cy.js, copy.test.js, error.njk}`, `src/server/app/{copy-convention.test.js,
auth/unauthorised.njk}`, `src/config/nunjucks/{context/context.js, context/context.test.js, globals/globals.js}`,
`src/server/app/features/dashboard/{template.njk, controller.js, controller.test.js, copy/copy.en.js, copy/copy.cy.js}`,
`src/server/app/features/address-book/{list,add,edit,view,delete}/template.njk`,
`src/server/app/features/address-book/{list,add,edit}/{controller.js, controller.test.js}`,
`src/server/app/features/address-book/copy/{copy.en.js, copy.cy.js}`, `src/server/common/helpers/errors.test.js`,
`src/client/stylesheets/components/_index.scss`, `src/client/javascripts/application.js`. No `A`, no `R`.

**Ladder** (each to a log, read once): `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format:check > …/logs/s09-layout-format-check.log 2>&1`,
then `run lint`, `run test` (expect `Test Files  55 passed (55)` / `Tests  492 passed (492)`), `run test:fit`
(expect `49 passed`). If `format:check` is red, run `run format` once and re-check — never hand-format.

---

## 7. Out of scope — leave alone even though it is tempting

- **`vite.config.js`, `_govuk-frontend.scss`, `application.scss`, the `headIcons` block, `context.js`'s manifest
  read** — the Vite pipeline is s10's. Do not "align" the asset keys to `application.js` / `stylesheets/application.scss`;
  the page would load no CSS. The stale `src/server/common/components` Sass load path stays (D20).
- **`core/_main.scss`** — do not port `.app-link-button` / `.app-form-inline` (D14).
- **`nunjucks.js`** — its search paths and Vision `path` are s05's and correct; the `common/components` root stays.
- **The convict `serviceName`** and its context key — stay (D9).
- **`userSession` shape, `authEnabled`, `serviceUrl`, `crumb` in the context** — stay (D5, D7).
- **The stub sign-in shape, `/auth/sign-out` vs `/signout`** — s03's open question; the layout links `/signout` and
  that is all.
- **The address-book templates' input width classes** (add has `govuk-!-width-one-half` on some fields, edit
  `govuk-!-width-two-thirds`) — untouched; they render inside the two-thirds column now, as plants' forms do.
- **`README.md`, `src/server/common/README.md`, `src/client/common/README.md`,
  `src/server/common/templates/partials/README.md`** — none names a deleted thing; s11 writes the docs.
- **`package.json`** — `lodash` stays (D16); no dependency changes at all.
- **The tests repo** — its ins specs reach ins by URL and assert nothing this stage changes (grep at planning time:
  headings and table cells only, no service-name or navigation text).
- **Plants' `#` address-book link and its comment** — plants' business (s12/s13); this stage records that ins's
  address book is where that link should one day point.

---

## 8. Behaviour changes (named, per invariant 2)

1. **Service navigation replaces the header service name and the user strip.** Signed in: four items — Dashboard
   (`/`), Address book (`/address-book`), Manage account (`#`, Design release 1's placeholder), Log out (`/signout`).
   The signed-in user's display name and the signed-out "Sign in" link are no longer rendered anywhere; a signed-out
   page (unauthorised, error) shows the service name only.
2. **Alpha phase banner** on every page with the APHA service-desk feedback link.
3. **The `<title>` reads `… | Import notification service`** instead of `… | trade-imports-ins-frontend`, and gains
   an `Error: ` prefix when the page carries a field-error summary.
4. **Headings**: the dashboard's service-name caption is gone; the dashboard and address-book list `h1` are
   `govuk-heading-xl`, every other page's is `govuk-heading-l` (was `govuk-heading-xl govuk-!-margin-bottom-2` on all).
5. **Back link** renders above the content (with the phase banner) rather than inside it — same text, same href, on
   the same three pages.
6. **Content sits in a govuk grid column**: two-thirds on add, edit, view, delete, error and unauthorised; full width
   on the dashboard and the address-book list.
7. **Page-level service failures** (dashboard load, address-book load, add-form country load, add/edit save) render a
   `role="alert"` notification banner — "There is a problem / Sorry, there is a problem with the service. Try again in
   a few minutes." — instead of an error summary carrying the page-specific "Something went wrong …" line. Still HTTP
   500. The four page-specific messages leave both locales.
8. **The field-error summary and the success banner sit above the `h1`** (were below it).
9. **Active navigation** is marked with `aria-current="true"` (was `"page"`), on the dashboard for `/` and on the
   address book for every `/address-book…` page.
10. **`main` no longer carries `app-main-wrapper`** (its padding), and the header no longer passes `useTudorCrown`
    (a no-op in govuk-frontend 6).
11. **The mobile menu toggle works** (`ServiceNavigation` initialised).

Nothing a fit spec asserts changes: every `h1` text, every `Dashboard` / `Address book` / `Back` link name and every
button name is the same string in the same role.

---

## 9. Commit

Stage everything (`git -C … add -A`) and stop; the reviewer/orchestrator commits. Suggested message, for the
orchestrator: `refactor(alignment): s09-layout — adopt the Design release 1 layout`.
