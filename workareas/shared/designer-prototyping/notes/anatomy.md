# GB-notification-service — anatomy at HEAD (fcf7d7f, 2026-09-24)

Read-only clone: `workareas/designer-prototyping/GB-notification-service` (origin = `~/git/defra/defra-design/GB-notification-service`). 72 commits since the 2026-06-02 initial commit; all but 8 are by one designer (MrMister-88). The 8 others (samfarrington, 15–16 July) added `journey-demo/` and its CI. Supporting logs (diffs, outlines, stats) sit beside these notes in `../logs/`.

## 1. What it is

A GOV.UK Prototype Kit 13.20.2 app (`govuk-frontend` 6.3.0 with `rebrand: true`, `@ministryofjustice/frontend` ^9 for the date picker, `@govuk-prototype-kit/common-templates` 3.0.0, `moment`). No Procfile / app.json / README — Heroku runs the kit's own `npm start` (`govuk-prototype-kit start`). `usage-data-config.json` is gitignored; `journey-demo/serve-prototype.js` writes one (`collectUsageData: false`) so non-interactive runs never hang on the kit's prompt.

`app/config.json`: `serviceName: "Import notification service"`, `serviceUrl: "/index"`, `useServiceNavigation: true`.

Repo tree:

```
app/
  routes.js            13,001 lines — ONE router for every version (see §3)
  config.json, filters.js (empty stub)
  data/                34 files, 6.9k lines — reference data + fixture stores
  lib/                 version-mount.js + 3 thin per-version configs (see §4)
  utils/               notification-reference.js, commodity-search-data.js
  assets/
    sass/application.scss   9,666 lines, single file
    javascripts/            23 files, 3.6k lines (application.js imports 21)
    images/dashboard/       6 SVG icons
  views/               170 templates, 17.8k lines (see §5)
journey-demo/          Playwright walk-through recorder (see §8)
.github/workflows/journey-demo.yml
```

## 2. Data (`app/data/`)

`session-data-defaults.js` is the untouched kit stub (`module.exports = {}`) — nothing is pre-seeded; every journey starts from an empty `req.session.data` and `/create-notification` calls `resetNotificationJourneySession`.

Everything else is plain CommonJS arrays/objects, sometimes with helper functions attached. Three flavours:

| Flavour | Files | Notes |
|---|---|---|
| Option lists (radios/selects/autocomplete) | countries (79 lines, `labels` + regions), country-region-prefixes, uk-airports (207), exit-border-control-posts, means-of-transport (`['Air','Rail','Road','Sea']`), import-reasons, internal-market-purposes, certification-purposes, package-types, transporter-types, address-book-*-uses/-types/-categories | Hand-written; `countries.js` exposes both values and labels |
| Commodity model | commodities.js (295), commodities-0101/0102/01061900-species.js, commodities-germinal-products.js (151), commodity-identifiers.js | One object per commodity: `id, name, code, identifiers, certificationPurposeOptions, unweanedOptions, packagingFields, species[]`; germinal products concatenated in routes.js (`allCommodities`) |
| Fixture stores ("fake backend") | address-book.js (420) + address-book-lookup-addresses.js (476, a fake postcode lookup), consignment-addresses.js (341), contact-addresses.js, transporters.js, dashboard-notifications.js (294, 20-ish seeded notifications with status/tag/variant), dashboard-notification-snapshots.js (226, builds a review snapshot from a dashboard row), dashboard-templates.js (255) | Seeded records; user-added records live in session (`addressBookAddedAddresses`, `submittedNotifications`) and are merged in at render time |

Notification references: design releases use `GBN-AG-26-7K8M2P`-style; the testing version uses IPAFFS-style `GB.2026.7963913 - CHEDA` (`utils/notification-reference.js`).

## 3. `routes.js` — the single 13k-line router

- **13,001 lines, 398 KB**, up from 4,384 lines at 26 June (the last commit before the 3-month window). 12,221 lines of the 3-month diff are in this one file.
- **92 route registrations, all between lines 10,990 and 12,960** (~15% of the file). The first 10,989 lines are **508 top-level helper functions**: `render<Page>Page`, `validate<Thing>`, `parse<Thing>Body`, `sync<Thing>Session`, dashboard builders, template/amend logic, address-book CRUD.
- No section comments at all (2 kit-boilerplate lines + 1 mount-order note). Navigation is by function name only. Grep `^function ` → `../logs/routes-function-outline.txt`.
- **Branching**: `getJourneySteps(sessionData)` (line 1495) builds the linear step list per session — animal-identification, additional-animal-details, transit-countries, upload-documents and declaration are pushed conditionally from session state. `getNextJourneyPath(currentPath, sessionData)` walks it. Address sub-sections are gated by `isConsignmentAddressSectionActive(sessionData, 'cph')` etc. and redirect back to `/roles-and-addresses` when inactive.
- **Validation is real, server-side and hand-rolled**: 27 `validate*` functions returning `{ errorList, errors, value }`; the POST handler stores `errorList`/`errors` on `req.session.data`, re-renders on failure, clears them on success. Views render `govukErrorSummary` from `data.errorList` and field errors from `data.errors.<field>`. (The journey-demo README's "validation is almost entirely stubbed" is out of date — it was true on 15 July; the 16 Sep "validation" commit and others since have added it widely.)
- **Form actions**: buttons post `action=continue|hub|review`; `isJourneySoftSaveAction` + `getJourneySaveRedirect` route to `/notification-hub` (task list) or `/review-notification`, with `persistDraftNotification` writing into `submittedNotifications` so the dashboard shows the draft. Query flags `?from=hub|review|template-review` change the continue target.
- **Version conditionals inside shared handlers**: 172 references to `_isDesignRelease21Version` / `isDesignRelease2Version` / `isTestingVersion` and helpers like `isDesignRelease21SessionData()`. E.g. `GET /` renders the overall dashboard for 2.1 but the single-list dashboard otherwise; `/create-notification` redirects to `/notification-type` only in 2.1; `/notification-type` bounces non-2.1 sessions away. So behaviour diverges per version **inside** one codebase, not by copying handlers.
- 46 `res.render` calls, 507 `res.redirect` calls.

## 4. Version routing (`app/lib/`)

Versions are **not** separate route files. `version-mount.js` (363 lines, written 22 Jul when the 335-line standalone `testing-version.js` was generalised) exports `createVersionMount({ basePath, sessionKey, versionFlag, viewFolder, otherVersionBases, setupSession, setupLocals })`. At the foot of routes.js:

```js
mountTestingVersion(govukPrototypeKit, router)
// Mount 2.1 before 2 so Express does not treat /design-release-2.1 as /design-release-2
mountDesignRelease21Version(govukPrototypeKit, router)
mountDesignRelease2Version(govukPrototypeKit, router)
```

`mountVersion` creates a second kit router at `basePath`, installs the middleware, then **`copyRouterStack` clones every route + handler from the root router onto it**. The middleware:

1. **Namespaces session**: swaps `req.session.data` for `data._designRelease21` (etc.) for the request, so each version has its own draft/dashboard state, and re-attaches on `res.end`. `addressBookAddedAddresses` and `submittedNotifications` are `SHARED_SESSION_KEYS` proxied to the root — hence "shared address book" on the index page.
2. Sets `nest._isDesignRelease21Version = true` (the flag the shared handlers branch on) and `res.locals` such as `journeyBasePath`, `isDesignRelease2Version`, `serviceNavTemplatesHref`.
3. **Wraps `res.redirect`** to prefix any path matching `JOURNEY_PATH_PREFIXES` (34 prefixes) with the base — except `/address-book*`, `/public/*`, `/plugin-assets/*`, `/manage-prototype*`, `/index`, which stay shared.
4. **Wraps `res.render`**: if `views/<viewFolder>/<name>.html` exists, render that instead of the root view; otherwise fall through to the root template. Render options are deep-walked to prefix any string that looks like a journey path.

The three per-version files are 41–49 lines each and differ only in base path, session key, flag, view folder, and locals (testing: different `serviceName`, forces the CHEDA reference; 2/2.1: nav hrefs for Templates/Address book).

**Consequence for a designer**: a new version = copy a views folder + add a 40-line lib file + one `mount` line + an index card. No route code is copied. But any *behavioural* difference must be threaded through the 13k-line shared routes.js with a new `is<Version>SessionData()` flag, which is exactly what has accreted (172 flag checks).

Root routes double as "Design release 1"; there is no `/design-release-1` prefix.

## 5. Views (`app/views/`, 170 files, 17,793 lines)

| Folder | Pages | Lines | Role |
|---|---|---|---|
| root `views/*.html` | 33 (incl. `index.html`) | 4,363 | Design release 1 journey + dashboard + the **only** copy of the 5 address-book pages |
| `design-release-2/` | 32 | 3,858 | DR1 duplicate + templates (create/view), delete-notification, dashboard-actions/-changes/-inspection/-templates |
| `design-release-2.1/` | 36 | 4,229 | DR2 duplicate + `notification-type`, `dashboard-home` (overall dashboard), `consignment-add-address`, `delete-template` |
| `testing/` | 26 | 3,470 | DR1 duplicate with IPAFFS/CHEDA styling; no address-book/template pages |
| `layouts/` | 2 | 174 | `main.html` (header + service nav, three-way branched on version flags — 156 of its lines are the header block); `journey.html` (two-thirds column, includes DR2 cancel-amend modal) |
| `partials/` | 17 shared | 1,046 | field groups reused across versions (cph-number-input, transporter-add-*-fields, arrival-date-picker, review-summary-*, notification-status) |
| `partials/design-release-2/` | 9 | 471 | dashboard cards, journey-form-actions, modals, review header/card |
| `partials/design-release-2.1/` | 15 | 1,002 | DR2 set + consignment address field partials, review-sections, delete-confirmation |

Every page is `{% extends "layouts/main.html" %}` (not `journey.html` — that layout is barely used), imports govuk macros, sets `pageName`, puts a phase banner + back link in `beforeContent`, and hard-codes its **form action with the version prefix** (`action="/design-release-2.1/cph-number"`). Partials are chosen per version by literal path (`{% include "partials/design-release-2.1/journey-form-actions.html" %}`), never via a variable. Status header comes from the shared `partials/notification-status.html`, which itself branches on `isDesignRelease2Version`.

MOJ frontend is used only for the date picker (dashboard filter + arrival details) and a horses select partial.

### How much is duplicated

`diff -q` says **every common file differs** between any two version folders, but the diffs are shallow:

| Pair | Common pages | Changed lines (`<`/`>`) | Total lines in pair | Notes |
|---|---|---|---|---|
| root vs design-release-2 | 26 | 1,038 | ~5,800 | mostly `/design-release-2/` prefixes + `journey-form-actions` include swapped for the DR1 single button |
| design-release-2 vs 2.1 | 32 | 1,028 | ~7,000 | prefixes, partial path `design-release-2` → `design-release-2.1`, plus real 2.1 changes (consignment address, review sections) |
| design-release-2 vs testing | 26 | 1,212 | ~6,500 | prefixes + CHEDA header/reference styling |

Sample (`cph-number.html`, DR2 → DR2.1): 4 hunks, 2 of them purely the prefix/partial-path rename. Roughly **85% of each page is byte-identical to its sibling** once the version prefix is normalised; the remaining ~15% is genuine per-release design change concentrated in a handful of pages (dashboard, review-notification, consignment-details, consignment-address-select, roles-and-addresses).

Because form actions and partial includes are hard-coded per version, a content fix to a shared field has to be applied 3–4 times by hand (the 3 Sep "content" commit touched 25 files, 10 Sep "content changes" 8 files — the same edit fanned out).

## 6. Assets

- **`application.scss` — 9,666 lines, one file, 3 top-level comment lines** (`// Design release 2 dashboard` at line 8,389 is the only section marker). 178 top-level selectors, 176 of them `.app-*` (no `.govuk-*`/`.moj-*` overrides at the top level; MOJ date-picker overrides are nested inside a mixin). 31 `.app-dr2-*` / `.app-dr21-*` blocks — the DR2/2.1 dashboards have their own class namespace and the DR2.1 dashboard view uses 57 `app-dr2-` classes. 6,068 of these lines were added in the last 3 months. Page-scoped BEM-ish naming (`.app-cph-number-page__heading`) means most pages carry bespoke layout CSS rather than govuk utility classes — the kit's "no custom CSS" ideal is not followed.
- **JS**: 21 progressive-enhancement modules imported by `application.js` (kit ESM). Biggest are autocomplete/typeahead wrappers over the data lists: `commodity-search.js` (694), `address-book-lookup-search.js` (482), `transit-country-search.js` (377), `country-search.js` (319), `airport-search.js` (216), `address-book.js` (249, filter/sort of the address book). The rest are small: modal open/close, auto-dismiss banner, copy button, CPH input formatting, dashboard tab scroll, file-upload virus-check simulation.
- **Images**: 6 dashboard SVG icons, all added in the window.

## 7. `index.html` — the version index / "start page"

Rendered by `GET /index` (shared, unprefixed) and linked from the header logo. 161 lines: a caption "Prototypes", H1 "Import notification service", then four `prototype-release-card` blocks, each with a `govukTag` ("In design" purple ×3, "Testing" yellow), H2 release name, H3 "Create a notification", one-paragraph description, a `govukDetails` "What the journey contains" bullet list, and a `govukButton` start link:

| Card | Start href | Description as written |
|---|---|---|
| Design release 1 | `/create-notification` | "The current design release journey at the root URLs. Use this for stable reference work." |
| Design release 2 | `/design-release-2` | "A duplicate of Design release 1 for making changes without affecting the original version." — Separate dashboard and session data, shared address book |
| Design release 2.1 | `/design-release-2.1` | "A duplicate of Design release 2 for making changes without affecting the original version." |
| Testing version | `/testing` | "A separate testing journey with CHEDA references and IPAFFS-style dashboard patterns." |

Note the DR1 link starts the journey directly; the other three land on that version's dashboard (`GET /` under the prefix). This page is the presentation surface: stakeholders are sent the Heroku URL, pick a card, and walk the journey.

## 8. `journey-demo/` (Playwright, added 15–16 July by samfarrington)

- `playwright.config.js`: `testDir ./e2e`, `fullyParallel`, 4 workers, 10-minute test timeout, 1280×1200 viewport, `video: on`, `trace: on`, HTML reporter to `journey-demo/playwright-report`, `webServer` = `node serve-prototype.js` (spawns `npm run dev` from the repo root, waits on port 3000, not `serve` because production mode forces https + secure cookies).
- `e2e/journey.js` (367 lines): page-object helpers (`fillOrigin`, `fillCommodity`, `pickFromAutocomplete`, …) with deliberate human pacing (80 ms/char typing, 500 ms field pauses — "pacing IS the point"), and a data-driven `JOURNEYS` array of 3 variants (cattle+air with all address sections and CPH; poultry+rail with transit countries; pet cat with permanent address).
- `e2e/walk.spec.js` (124 lines): one `test.describe` per JOURNEYS entry asserting only that conditional pages appear/skip and the confirmation heading is visible, plus a task-list walk (save to hub, submit from review).
- **Covers Design release 1 only** (`resetSession` → `page.goto('/create-notification')`, root paths throughout). Nothing walks `/design-release-2*` or `/testing`, and nothing has been updated since 16 July while the prototype gained 2.1, templates, amend, address book, germinal products.
- CI `journey-demo.yml`: on push to `main` (and still, per a "TEMPORARY" comment, `feat/playwright-demo-flow`), Node 24, `npm ci`, install chromium, `npm run test:prototype`, upload `journey-demo-report` artefact (30 days), then delete older artefacts via `gh api`. The README (102 lines) sells the deliverable as "the video and shareable report" and includes a paste-ready prompt for a coding agent to update the walks after prototype changes.

## 9. How a designer creates a new version (as evidenced by the four creations)

1. **"New version" 25 Jun (5db9e05)** — before versioning existed: rewrote DR1 in place (70 files, +4,790/−6,885; routes.js 3,508 lines churned) deleting the older page set.
2. **"testing version" 15 Jul (2191e30)** — first prefix: copied 24 root pages to `views/testing/`, wrote a 335-line bespoke `lib/testing-version.js`, 32 lines in routes.js, a new index card, header branch in `main.html`.
3. **"dashboard changes to design release 2" 22 Jul (6d3dd1e)** — extracted the mechanism into `version-mount.js`, copied 29 pages to `views/design-release-2/`, added 6 DR2 partials, +1,137 routes.js lines, +1,215 sass lines, index card.
4. **"germinals" 4 Aug (c442009)** — copied 32 DR2 pages to `views/design-release-2.1/` + 9 partials, 52-line lib file, +929 routes.js lines, index card, and in the same commit added germinal products (data + commodity identifiers + package types).

Recipe as practised: `cp -r views/<previous> views/<new>`; search-replace the base path in `action=`/`href=`/include paths; `cp lib/<previous>-version.js lib/<new>-version.js` and edit five fields; add `mount<New>Version(govukPrototypeKit, router)` (ordering matters for shared prefixes); add a card to `index.html`; then thread any behaviour change through routes.js with a new session flag. Nothing automates or documents this; there is no README in the repo.

**Presentation**: push to `main` → Heroku auto-deploy → send the `/index` URL; stakeholders pick a card. The Playwright report/video is a second, developer-initiated artefact (GitHub Actions artefact download) and only shows DR1.

## 10. Working pattern in the 3-month window (27 Jun → 24 Sep, 49 designer non-merge commits — critic correction from 55; 58 non-merge in total, 9 of them samfarrington's, per `logs/critic-log.txt`)

- Commit messages are terse ("updates", "fixes", "content", "text", "6786"); 1 merge commit; no branches except the Playwright PR. Everything lands straight on `main`.
- Cadence: bursts of several commits a day, then gaps of 1–2 weeks. Sizes range from 1-line text tweaks to +6,930-line version creations.
- Theme of the window: **common capabilities and dashboard** rather than the core journey — address book (23 Jul, 17 Aug ×2, 26 Aug: ~+3,700 lines), templates + amend flow (23 Jul), dashboard redesigns (6 Jul, 17 Jul, 22 Jul, 4 Aug, 22 Sep "new dashboard" +892), germinal products (4 Aug, 16 Sep), validation (16 Sep), plus repeated small "content changes" fanned across the duplicated version folders.
- Net: 228 files, +36,771/−2,978 across `app/`, `journey-demo/`, CI and `package.json` (`../logs/diff-stat-last-3-months.txt`; per-commit sizes in `../logs/recent-commit-shortstat.txt`).
