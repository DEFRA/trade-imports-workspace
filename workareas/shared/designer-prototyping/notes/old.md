# GB-notification-service — commit batch "old" (2026-06-02 .. 2026-06-26)

Source clone: `workareas/designer-prototyping/GB-notification-service` (read-only).
Batch: 14 commits, 13 by the designer (MrMister-88, michael.doran@equalexperts.com), 1 GitHub-generated initial commit. All before the 3-month window (2026-06-27 onward), so these carry lower weight than the recent batches. Their value is in showing the *starting shape* of the prototype and the working habits that the later batches inherit.

Headline: in 24 days the designer built a full live-animals notification journey twice. A "v1" landed fully formed on 3 June (2,487-line `routes.js`, 26 views, 7 client-side JS modules, 1,974-line Sass), was iterated for a week, then on 25 June was largely torn down and rebuilt as a "New version" around a notification hub, with a second same-evening commit re-adding the review/declaration/documents/addresses tail. By 26 June `routes.js` is 4,384 lines with 43 routes and 175 helper functions, and `application.scss` is 4,318 lines.

## Commit-by-commit

### 2484ffc — 2026-06-02 10:46 — "Initial commit" (Matthew Solle / GitHub)
- `README.md` +1 (`# GB-notification-service`). Repo created empty by a different account. Nothing else.
- Size: tiny.

### f5171b4 — 2026-06-03 12:26 — "v1"
- 7,983 files, 1.1M insertions: the whole GOV.UK Prototype Kit app **plus vendored `node_modules/`** (govuk-frontend 6.1.0, govuk-prototype-kit 13.20.1, @govuk-prototype-kit/common-templates 3.0.0). Read `--stat` only for the vendored part — one line: node_modules committed wholesale, no `.gitignore` yet.
- The app itself arrived complete in one drop, not incrementally:
  - `app/routes.js` 2,487 lines: 32 `router.get/post` handlers, ~95 named helper functions (`hasXComplete`, `redirectIfNoX`, `getXViewModel`, `syncXSession`, `clearXSession`), a `router.use` middleware pushing summary rows into `res.locals`.
  - 26 views under `app/views/` (flat, no folders): `what-are-you-importing`, `origin-of-the-import`, `select-commodity`, `commodity-hub`, `animal-identification-details`, `additional-animal-details`, `county-parish-holding`, `reason-for-import`, `notification-tasklist`, `check-answers-and-submit`, `declaration`, `notification-submitted`, `consignment-addresses`, `consignment-address-entry`, `contact-address-for-consignment`, `arrival-details`, `transport-details`, `import-category-not-available`, `index`, `layouts/main.html` (just extends `govuk-prototype-kit/layouts/govuk-branded.njk`), 6 partials (`animal-identifiers-expanded`, `animal-packaging-details`, `commodity-details-summary`, `import-details-summary`, `region-of-origin-code-input`, `species-panel`).
  - 15 reference-data files under `app/data/` (commodities, countries, country-region-prefixes, uk-airports, import-reasons, import-categories, means-of-transport, transporters, five address lists, contact-addresses). `session-data-defaults.js` is `module.exports = {}` — never used for seeding here.
  - 7 custom JS modules under `app/assets/javascripts/`: `airport-search`, `animal-identification`, `commodity-search` (535 lines), `consignment-address-search`, `country-search`, `transporter-search`, `application.js` (init). All are hand-rolled autocomplete/filter widgets built on `window.GOVUKPrototypeKit.documentReady`.
  - `app/assets/sass/application.scss` 1,974 lines, organised as per-page BEM blocks (`.app-origin-page__…`, `.app-commodity-hub…`) each headed by a comment citing a **Figma node id** (`// Notification tasklist — Figma 8296-24876`, `// Declaration — Figma 8043-33787, checkbox Figma 15143-2839`). 30 Figma references across scss and JS at this commit.
  - `app/config.json`: `serviceName: "Service name goes here"`, `useServiceNavigation: true`, govuk-frontend `rebrand: true`.
  - `app/filters.js` is the kit's empty template.
- Designer intent: bring an already-designed (Figma) live-animals journey into a clickable prototype in one go, pixel-matching the design.
- Kit mechanics: `govukPrototypeKit.requests.setupRouter()`, `req.session.data` as the sole store, per-route redirect guards enforcing page order, `res.locals` middleware, `data.errors` / `data.errorList` convention for validation with `govukErrorSummary`, macros via kit auto-import, custom Sass + JS in `app/assets`.
- Size: large.

### 3e1ee45 — 2026-06-03 12:26 — "Create .DS_Store"
- Committed a stray root `.DS_Store` via the GitHub UI (commit message is GitHub's default). Tiny; housekeeping noise.

### b438bbd — 2026-06-03 13:49 — "Change"
- `app/routes.js` +292/-243, `check-answers-and-submit.html` restructured, 10 views one-line edits.
- What changed:
  - New back-link mechanism: `syncTasklistBackNavigation(req)` / `getBackLink(req, defaultHref)` / `withFromTasklist(href)` — appends `?from=tasklist` to tasklist links, stores `backToTasklist` in session, and every view's hard-coded `govukBackLink href` becomes `href: backLink` passed from the route.
  - Tasklist regrouped from numbered "1. The consignment / 2. Movement / 3. Addresses" to named sections "About the consignment / Description of the goods / Documents / Addresses / Transport"; CPH row dropped from tasklist; two placeholder Documents rows (`href: '#'`).
  - Review page view-model flattened from three separate lists (`consignmentLists`/`movementLists`/`addressLists`) into one `sections[].lists[]` shape mirroring the tasklist; `check-answers-and-submit.html` loop rewritten to match; CPH row now conditional on `commodityRequiresCph`.
  - Consignment addresses POST now redirects on to contact address instead of back to the tasklist; contact-address guard relaxed.
- Intent: make the tasklist the navigation spine (return-to-tasklist from any page) and align the review page's grouping with the tasklist's.
- Mechanics: query-string flag + session flag for back navigation; view-model refactor in routes.js; template loop restructure.
- Size: medium.

### 73f51a0 — 2026-06-03 14:04 — "new changes"
- `config.json` serviceName -> "GB notification service". `index.html` drops the kit's homepage includes for a bare "start prototype" link to `/what-are-you-importing`.
- `routes.js` +90/-60: CPH moves *into* the consignment-addresses hub — `getCphSection()` appended to the address sections when `commodityRequiresCph`; `hasConsignmentAddresses` now requires CPH too; addresses POST validates both and builds a combined `errorList`; `/county-parish-holding` guards simplified and its back link fixed to `/consignment-addresses`; review page splices the CPH row after "Place of destination" using an IIFE inside the row array.
- `consignment-addresses.html` link href now data-driven (`section.href`); CPH intro copy reworded.
- Intent: relocate CPH from a standalone tasklist step to a sub-item of addresses (design decision made in the same afternoon as b438bbd).
- Mechanics: routes.js branching on commodity config; error aggregation in session; copy edits.
- Size: small.

### 96c79cc — 2026-06-03 14:16 — "Update declaration.html"
- Removes one duplicate confirmation paragraph, button text "Continue" -> "Submit". Copy-only, via GitHub web editor (default message). Tiny.

### 33f5e6e — 2026-06-03 14:51 — "Update routes.js"
- +4 lines: defaults `unweanedAnimals` to `'No'` on GET of additional-animal-details when the question is shown, so the tasklist status flips to Complete without the user touching that radio. Tiny; a same-afternoon fix to a completion-status bug.

### bec3acc — 2026-06-04 09:47 — "Dashboard changes"
- 25 files, +1,288/-56. First "common capability" outside the create journey.
- New `app/views/dashboard.html` (181 lines) + `app/views/layouts/dashboard.html` (own header/service-nav block, full-width main) + `app/data/dashboard-notifications.js` (3 hard-coded notifications, comment `// Sample notifications for the dashboard — Figma 7503-33121`) + 322 lines of Sass. GET-form filters (keyword, commodity, country, party, destination, status select, start/end date text inputs with hard-coded default dates), sort select, result cards with "Copy as new" (`href="#"`) and "View" links. Filtering/sorting implemented in `routes.js` (`getDashboardFilters`, `notificationMatchesDashboardFilters`, `sortDashboardNotifications`, `getDashboardViewModel`).
- New `app/utils/notification-reference.js` (89 lines): `GBN.GB.2026.1000608` draft reference format, normalisation of legacy `IMP.` and `GBN-XX-26-…` formats, random submitted-reference generator moved out of routes.js. `router.use` middleware now sets `res.locals.notificationReference` once an import category exists.
- New `partials/notification-caption.html` (reference or "Create an import notification") swapped into 13 views in place of the literal caption span — first use of a partial to de-duplicate a repeated heading fragment.
- New `accompanying-documents.html` (171 lines) + `app/data/document-types.js`: add-another documents form (`documentCount` hidden field, indexed field names `reference-0`, `documentType-0`, `issueDate-0-day`, a `<button name="addDocument" value="yes">` add-another submit), full parse/validate/complete logic in routes.js (~170 lines), wired into tasklist "Documents" and review page.
- `serviceName` -> "Import notification service"; index and confirmation/tasklist links repointed to `/dashboard`.
- Intent: give the journey a home (dashboard) and a reference-number identity; build the documents step that had been a `#` placeholder the day before.
- Mechanics: second layout file; GET-form query-string state (not session) for filters; utils module; partial include; indexed add-another pattern in a POST body; static data file as fake backend.
- Size: large.

### 1fe0fb5 — 2026-06-08 12:15 — "Update to search functionality"
- `commodity-search.js` +224/-79, Sass +123, `select-commodity.html` +13, plus `.cursor/settings.json` (Figma plugin enabled) accidentally committed.
- Commodity search redesigned: commodities become non-selectable group headers, only species rows have checkboxes; a "N selected" panel with removable chips and "Clear all" renders below the input (`// Figma 8806-28979 / 8806-29354 — selected options below search`); event delegation replaces per-checkbox listeners; outside-click via `pointerdown` replaces `blur` timeout; details summary copy "Help with commodities".
- Intent: iterate one custom component against a new Figma frame.
- Mechanics: vanilla JS widget with hidden inputs (`commodityId`, `commodityCode`, JSON `selections`) carrying state to the POST; JSON blob in a `<script type="application/json">` for initial state.
- Size: medium. First evidence the designer is using Cursor with the Figma MCP plugin.

### 1080512 — 2026-06-24 13:17 — "changes"
- 7,934 files, -1.1M lines: **removes the vendored `node_modules/`** and `usage-data-config.json`, adds `.gitignore` (node_modules, .tmp, .env, .DS_Store, .idea, .vscode, .cursor), `.gitattributes` (LF), a real README (setup, run, project structure, version-control note), deletes both `.DS_Store`s and `.cursor/settings.json`. `index.html` +2: blanks the `govukServiceNavigation` block on the home page. One line for the vendored part: node_modules purge + hygiene files.
- Size: large by line count, small in substance. Housekeeping, 16 days after the previous commit.

### 5db9e05 — 2026-06-25 09:42 — "New version"
- 70 files, +4,790/-6,885. A rebuild, not an edit. `routes.js` shrinks from ~2,900 to 2,037 lines because most of the tail of the journey is deleted rather than ported.
- Deleted views: `accompanying-documents`, `check-answers-and-submit`, `commodity-hub`, `consignment-address-entry`, `consignment-addresses`, `county-parish-holding`, `dashboard`, `declaration`, `import-category-not-available`, `layouts/dashboard`, `notification-submitted`, `notification-tasklist`, `select-commodity`, `transport-details`, partials `animal-identifiers-expanded`, `animal-packaging-details`, `commodity-details-summary`, `import-details-summary`, `notification-caption`, `species-panel`. Deleted data: dashboard-notifications, document-types, import-categories, transporters, the five address lists. Deleted JS: consignment-address-search, transporter-search. Deleted README (re-added content lives nowhere).
- New views: `notification-hub.html` (replaces tasklist: summary cards for animal/package counts plus a sectioned tasklist; "Review and submit" button `disabled: true`), `consignment-details.html`, `transit-countries.html`, `layouts/journey.html` (two-thirds column wrapper with `journeyPageClass`), partials `arrival-date-picker` (uses `mojDatePicker` from `@ministryofjustice/frontend`, new dependency alongside `moment`), `internal-market-purpose-radios`, `notification-status` (Draft tag + reference, replaces notification-caption). New data: `certification-purposes.js` (comment "aligned with EU notification service design"), `internal-market-purposes.js`. New JS: `arrival-date-picker-focus.js`, `reason-for-import.js`, `transit-country-search.js` (364 lines). New util `commodity-search-data.js`.
- Rewritten views: `what-are-you-importing` (now hosts the commodity search itself; `select-commodity` gone), `origin-of-the-import`, `reason-for-import`, `arrival-details`, `animal-identification-details`, `additional-animal-details`, `contact-address-for-consignment`, `index.html` (becomes a "Prototypes" landing page with a "Design release 1 — In design" card, `govukDetails` "What the journey contains" with placeholder bullets, "Start prototype" -> `/origin-of-the-import`).
- routes.js: helper naming shifts to `renderXPage(req, res, locals)` functions per page; `ensurePrototypeNotificationReference` replaces the reference utility (hard-coded constant); journey order changes to origin -> what-are-you-importing -> consignment-details -> additional-animal-details -> reason-for-import -> hub, with arrival/transit/contact-address routes live and the rest gone.
- `package.json`: govuk-frontend 6.1.0 -> 6.3.0, kit 13.20.1 -> 13.20.2, adds `@ministryofjustice/frontend ^9.0.0`, `moment`. `config.json` registers the MoJ plugin. `session-data-defaults.js` gets the kit's `// Insert values here` placeholder (still unused).
- **All Figma node-id comments disappear** (0 matches in `app/` from here on) — the Sass is regenerated without them.
- Intent: restart the journey against a new design release (the index page literally labels it "Design release 1"), swapping the tasklist page for a hub with summary cards, and adopting the EU-notification-service field set (certification purposes, internal market purposes, transit countries).
- Mechanics: delete-and-recreate in place (no versioned folder yet — that pattern appears later in the repo's history); third-party plugin via `config.json`; per-page `renderXPage` helpers; partial for shared status header; `layouts/journey.html` as a second layout tier.
- Size: large.

### 1f84c10 — 2026-06-25 23:05 — "more additions"
- 43 files, +7,428/-412, committed 13 hours after the morning rebuild. Re-adds the back half of the journey under new names, rather than restoring the deleted v1 files.
- New views: `review-notification` (replaces check-answers-and-submit; card-based with per-card error state via partials `review-summary-card` / `review-summary-row`), `declaration`, `notification-submitted`, `upload-documents` (266 lines; table of uploaded docs with a virus-check status tag), `roles-and-addresses` (replaces consignment-addresses hub), `consignment-address-select` (search + table + radios, replaces consignment-address-entry), `permanent-address`, `permanent-address-animals` (per-animal radios with conditional new-address fields via partial `permanent-address-new-address-fields`), `cph-number` (replaces county-parish-holding), `transporter` (replaces transport-details). `internal-market-purpose-radios` partial swapped for `internal-market-purpose-select`.
- New data: `commodities-0101-species.js`, `commodities-0102-species.js`, `commodities-01061900-species.js` (species lists split out per commodity code), `commodity-identifiers.js`, `consignment-address-sections.js` (153 lines, drives which address roles are active), `consignment-addresses.js` (137 lines, replaces the five lists), `transporters.js` (restored), `place-of-origin-addresses.js` (1 line).
- New JS: `file-upload.js`, `permanent-address-animals.js`, `roles-and-addresses.js` (preserves scroll position across the add/remove POST round trip via sessionStorage), `upload-documents-virus-check.js` (setTimeout 2.5s then `fetch` POST to `/upload-documents/virus-check/:documentId`, which flips a tag from "Uploading" blue to "Check completed" green — a simulated async backend inside the kit), `consignment-address-search.js` and `transporter-search.js` restored.
- routes.js +2,684: ~90 new helpers and 20 new routes including `/review-notification`, `/declaration`, `/notification-submitted`, `/upload-documents` (+ `/virus-check/:documentId` JSON endpoint), `/roles-and-addresses`, `/transporter`, `/cph-number`, `/permanent-address`, `/permanent-address/select`, `/permanent-address/enter-address`, and **`/prototype/reason-for-import`** — a seeding shortcut that calls `seedPrototypeSessionForReasonForImport(sessionData)` (France, cattle 0102, one bison species, 5 animals, Slaughter, unweaned No) then redirects. `index.html` gains a "Open reason for import page (prototype shortcut)" link to it. `notification-hub.html` "Review and submit" button enabled and pointed at `/review-notification`. `numberOfPackages` handling added alongside `numberOfAnimals`.
- Sass +2,408 lines.
- Intent: finish the rebuilt journey end-to-end in one sitting so it is demonstrable, and make deep-linking into a mid-journey page possible for review.
- Mechanics: route-level session seeding (not `session-data-defaults.js`); JSON endpoint + client fetch to fake async state; sessionStorage for scroll restore; data-driven address sections; review page computes per-card completeness and an error list for the POST.
- Size: large.

### 0c01b7d — 2026-06-25 23:10 — "Update index.html"
- Removes the "prototype shortcut" link from the landing page five minutes after adding it (the route stays). Tiny; hides the dev affordance before sharing.

### 3bf1a9b — 2026-06-26 12:36 — "update to tasklist page and captions"
- 15 files, +86/-47. Hub tasklist regrouped and renumbered: "1. About the consignment" (origin, "What are you importing?", reason) / "2. Commodity details" (consignment details, animal identification details, "Additional commodity details") / "3. Transport and arrival" / "4. Consignment parties". Sections wrapped in a flex `__tasklist-sections` container with 45px gap; Sass tweaks to row heights and widths.
- The `__caption` line above each page H1 is updated on 12 views to match the new section names ("Commodity details", "Transport and arrival", "Consignment parties"), and added to two pages that lacked one (`contact-address-for-consignment`, `roles-and-addresses`) with matching `&__caption` Sass blocks.
- Intent: information-architecture tidy — section names on the hub and the caption on every page must agree.
- Mechanics: routes.js view-model edit + one-line copy edits per view + per-page BEM Sass additions.
- Size: small.

## Cross-commit patterns

1. **Big-bang drops, then same-day fix-ups.** Both 3 June (v1 12:26, then Change 13:49, new changes 14:04, declaration 14:16, routes 14:51) and 25 June (New version 09:42, more additions 23:05, index 23:10) follow "land a huge generated-looking commit, then a run of small corrections within hours". The small commits are copy edits, a defaulted radio, a hidden dev link, a renamed section.
2. **Rebuild rather than version.** In this batch the designer restarts the journey by deleting views and recreating them under new names in the same flat `app/views/` folder (tasklist -> notification-hub, check-answers-and-submit -> review-notification, county-parish-holding -> cph-number, consignment-addresses -> roles-and-addresses, transport-details -> transporter). The "copy the folder into design-release-N" pattern is not yet present here; the index page's "Design release 1" card is where that idea first shows up.
3. **routes.js is the application.** Every view model, validation, redirect guard, session mutation and fake-backend filter lives in one file: 2,487 -> 2,037 -> 4,384 lines across the batch, 175 top-level functions by 26 June. Data files under `app/data/` and one `app/utils/` module are the only extraction. Views are thin and receive fully computed view models.
4. **Session is the database; seeding is by route, not by defaults.** `session-data-defaults.js` stays empty throughout. When the designer needs to jump mid-journey they add a `/prototype/<page>` GET that writes a canned session and redirects (1f84c10), then hide the link (0c01b7d).
5. **Static data files as fake services.** Dashboard notifications, transporters, address books, commodity/species lists, document types are all `module.exports = [...]` under `app/data/`, filtered in routes.js or in client JS. Where real behaviour is async (virus scan) it is simulated with `setTimeout` + a JSON POST endpoint.
6. **Hand-rolled JS components per page.** Nine custom `app/assets/javascripts/*.js` modules by the end of the batch, all vanilla, all initialised via `window.GOVUKPrototypeKit.documentReady` and guarded by a page-root class check. They carry state to the POST through hidden inputs and inline JSON script blocks.
7. **Figma-driven, then not.** v1 and the 8 June search change cite Figma node ids in Sass/JS/data comments (30 refs); a Cursor Figma-plugin settings file was committed and later gitignored. From the 25 June rebuild onward the comments are gone, though the per-page BEM-block Sass structure (`.app-<page>-page__caption/__heading/__header`) persists and grows to 4,318 lines with duplicated `__caption` rules per page.
8. **Repeated fragments get promoted to partials only after the third copy.** `notification-caption.html` (bec3acc) replaced 13 literal spans; `notification-status.html`, `review-summary-card/row`, `permanent-address-new-address-fields` follow in the rebuild.
9. **Information architecture churns via section names and captions.** The tasklist grouping changes in b438bbd (3 Jun), again in 5db9e05 (25 Jun), again in 3bf1a9b (26 Jun); each time the per-page caption strings need a sweep across 10+ views. A cheap, frequent, error-prone edit type.
10. **Housekeeping happens late and in one go.** `.gitignore`/README/node_modules purge only on 24 June; README deleted again the next day in the rebuild and not restored in this batch.
11. **Commit messages are uninformative** ("Change", "changes", "new changes", "more additions", "v1", "New version"); the small ones are GitHub web-editor defaults ("Update routes.js"). Diff content is the only record of intent.
12. **Plugin use is pragmatic.** `@ministryofjustice/frontend` is added purely for `mojDatePicker` (plus `moment`), registered via `config.json` plugins — the kit's plugin mechanism is the one extension point the designer uses beyond govuk-frontend.

## Implications for the plants-prototype designer tooling (notes only, for the synthesis step)

- A "jump to page N with a realistic session" affordance is clearly wanted (pattern 4) — the equivalent on the plants prototype would be a seeded-state entry point backed by the stub services rather than a hand-written session blob.
- Caption/section-name consistency (pattern 9) is a mechanical sweep that a skill could do reliably.
- Reference data is repeatedly hand-authored as JS arrays (pattern 5); the plants prototype's stub/reference-data services would remove that work if there is a simple way to point a page at them.
- The designer iterates on Figma frames one component at a time (pattern 7); a per-page "match this Figma frame" loop is the unit of work to optimise for.
- Same-day fix-up commits (pattern 1) suggest that quick preview + tiny copy edits are the dominant loop after a big drop.
