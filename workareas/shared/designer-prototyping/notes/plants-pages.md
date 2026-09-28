# How common designer changes are made in the plants prototype

Repo: `repos/trade-imports-plants-prototype`, branch `feat/NO_JIRA-designer-prototyping`,
read 2026-09-27. All paths below are relative to the repo root unless marked.
`SET` = `src/server/app/sets/high-risk-plants`, `FEAT` = `SET/journeys/linear/features`.

Difficulty scale used throughout, for someone who knows HTML and Nunjucks but
not the JS architecture:

| Score | Meaning |
|---|---|
| 1 | Edit one or two files by pattern-matching; no JS concepts needed |
| 2 | Edit JS object literals (copy bundles) plus keep a test in step |
| 3 | Touch a controller or view-model, but only by copying a neighbour |
| 4 | Needs the obligation model, dispatch, scope or flow gates |
| 5 | Needs the engine/bridge contract; an engineer's job even with a recipe |

## 1. The shape a designer meets

- One folder per page under `FEAT/<name>/`: `page.js` (id + slug, imports
  nothing), `controller.js` (GET/POST, validation, commit), `template.njk`,
  `evaluation.js` (binds fields to obligations), `copy/copy.en.js`,
  `copy/copy.cy.js`, `copy/copy.test.js`, `controller.test.js`,
  `<name>.fit.spec.js` (Playwright). A multi-page feature (`commodities/`)
  nests `list/list.controller.js` + `list/list.njk`, `details/...`, and a
  shared `copy/` and `fit/`.
- 17 feature folders today: dashboard, hub, commodity-type, commodities
  (list + details), origin, arrival-status, arrival-details,
  place-of-destination, consignor-select, identification-numbers,
  consignment-contact-select, check-answers, declaration, confirmation,
  delete-notification, cancel-amend, address-book-picker (shared code, no page).
- Journey topology lives outside the features: `SET/journeys/linear/flow/flow.js`
  (sections = page order), `flow/task-rows.js` (hub rows), `flow/run.js`
  (opening run), `flow/section-captions/` (caption above the h1, with its own
  copy pair), `flow/entry-guard.js`.
- Data model lives in `SET/obligations/sections/*.js` (one file per section:
  commodity, origin, arrival, destination, parties, contact, review) and the
  barrel `SET/obligations/index.js`. Obligations carry a UUID, a `name`,
  `status`, optional `within` (collection member) and optional `applyTo`
  (scope gate). No copy is allowed here; `obligation-purity.js` refuses to
  boot the server if a `label`/`title`/`hint` key appears.
- Shared chrome: `src/server/app/shared/layout.njk`, `save-actions.njk`,
  `error-summary.njk`, `section-caption.njk`, `copy.en.js`/`copy.cy.js`
  (service name, phase banner, footer, save buttons, validator defaults).
  These are upstream-owned (not in `overrides.json` `ours`).
- The prototype-owned surface is small: `PROTOTYPE.md`, `overrides.json`,
  `scripts/new-set/**`, `scripts/sync-upstream/**`,
  `src/server/prototype-sets/**` (chooser mount + `descriptions.js`),
  `src/server/prototype-seed/**` (example data), `src/server/app/sets-index/**`,
  `src/server/app/sets/sample-journey/**`, `src/server/app/routes-sample-journey.js`,
  `fit/sets-chooser.fit.spec.js`, plus 4 workflows. Everything under
  `SET/` belongs to upstream and is overwritten or conflicts on the Monday sync.

## 2. Change-by-change map

### 2.1 Change copy (wording, hint, error text, button label)

- Files: `FEAT/<name>/copy/copy.en.js`, `FEAT/<name>/copy/copy.cy.js`
  (2 files), and almost always `FEAT/<name>/copy/copy.test.js` (3rd file).
- Tests that break:
  - `copy/copy.test.js` in 14 of 16 features pins literal English strings
    (`expect(copy.hint).toBe('Select the type of goods...')`). Counts of
    literal asserts per feature: arrival-details 12, consignor-select 12,
    commodities 9, place-of-destination 9, consignment-contact-select 8,
    origin 5, arrival-status 4, dashboard 4, hub 4, commodity-type 3,
    check-answers 2, confirmation 2, cancel-amend 1, delete-notification 1,
    identification-numbers 1, declaration 0. Many also pin the Welsh.
  - `controller.test.js` pins copy in 13 of 16 features (for example
    commodity-type pins `'What are you importing?'`, `'Potatoes (seed or ware)'`
    and the full hint sentence through the view context).
  - `flow/section-captions/section-captions.test.js` pins caption strings
    (`'About the consignment'`, `'Arrival'`, `'Destination'`, `'Dashboard'`).
  - `src/server/app/copy-parity.test.js` fails if en and cy key trees differ,
    or if a cy string equals its en string (unless allowlisted in
    `IDENTICAL_ALLOWLIST`, currently empty).
  - `src/server/app/copy-convention.test.js` fails if a leaf is an empty
    string or a non-string/non-function.
  - Playwright `*.fit.spec.js` do NOT break: every spec imports the copy
    bundle and locates by `copy.legend`, `hubCopy.rows.commodities.title`,
    `sharedCopy.saveActions.saveAndContinue` etc. Only 15 hardcoded
    capitalised locator names exist across all specs (check-answers 6,
    cancel-amend 3, confirmation 3, declaration 3); everything else follows
    the copy module.
  - `journey-smoke.fit.spec.js` and the seed post field values, not copy, so
    they are unaffected.
- Recipe coverage: `PROTOTYPE.md` "Where to edit pages" (two paragraphs).
  No recipe explains the copy.test.js convention or the parity rule; the
  workspace rule `.claude/rules/copy.md` does, but the prototype repo has no
  rules folder of its own.
- Difficulty: 2. The edit is trivial; the trip is that the test suite
  treats the current English as a contract. A designer changing one hint
  edits 3 files and must know the Welsh must change too (parity fails on an
  identical string). Several bundles carry `// AWAITING THE COPY PASS`
  headers, so copy is expected to change, yet the tests pin it.
- Trip points: copy values may be functions (`typeHints.potatoes: (days) =>
  ...`) whose arity must match across en/cy; template-side interpolation
  like `copy.late.warning(lateRule)` breaks if the function is replaced by a
  string. Cross-feature copy imports exist (check-answers view-model imports
  arrival-details and place-of-destination copy for labels), so renaming a
  key in one bundle can break another feature's view-model.

### 2.2 Change a template (layout, component swap, add static content)

- Files: `FEAT/<name>/template.njk` (or `list/list.njk`, `details/details.njk`).
  1 file when no new text is added; 3 files (template + both copy bundles)
  when any new visible text appears, because the copy convention forbids
  hardcoded strings in the template (not machine-enforced for templates,
  but the fit specs locate via copy imports, and reviewers expect it).
- Templates are short and macro-driven: commodity-type 38 lines, origin 34,
  arrival-details 48, hub 22, confirmation 21, declaration 37, check-answers
  57, dashboard 126, commodities list 72. They extend `shared/layout.njk`,
  include `shared/error-summary.njk`, call `sectionCaption(caption)` then an
  `h1`, wrap fields in `<form method="post" novalidate>` with the `crumb` and
  `concurrencyToken` hidden inputs, and end with `saveActions(hubHref, ...)`.
- Tests that break: none directly for pure markup changes. Fit specs use
  role/label locators, so swapping `govukRadios` for `govukSelect` breaks
  `getByRole('radio', ...)`; changing the heading level breaks
  `getByRole('heading', { level: 1 })`; removing `sectionCaption` breaks the
  caption assertions in `section-caption.fit.spec.js` and each feature's
  first test. Axe assertions (initial + error state, WCAG 2.2 AA) run on
  every feature page, so an inaccessible change fails there.
- Recipe coverage: add-a-page.md step 4 (three paragraphs: extend the
  layout, GOV.UK/MoJ macros only, keep `name`/`id`/error key identical, call
  `sectionCaption` directly above the heading). features.md "Copy and
  templates". No recipe for "change an existing template" as such.
- Difficulty: 1 for layout/markup inside `journeyContent`; 2 when a macro
  needs new data from the controller (a new `items` list, a computed flag
  like `showPotatoFields`), because the value has to be added to the
  `h.view(view, {...})` object in `controller.js`.
- Trip points: the govuk-frontend rule (no custom CSS, no hand-rolled
  components) is a review convention, not a lint. `contentColumnClass`
  and `kit.surfaceClass('display')` control column width (dashboard uses
  full width). Anything shared (layout, save-actions, error-summary) is
  upstream-owned and reverts on Monday.

### 2.3 Add a field to an existing page

- Files touched (minimum, following add-a-field.md): `SET/obligations/sections/<section>.js`
  (new obligation object with fresh UUID), `SET/obligations/index.js`
  (import, export, add to array), `FEAT/<name>/evaluation.js`
  (`scalar({ field, obligation })`), `FEAT/<name>/controller.js`
  (`meta.collects`, validation rule, values, commit), `FEAT/<name>/template.njk`,
  `copy.en.js`, `copy.cy.js`, `copy.test.js`, `controller.test.js`,
  `src/server/app/contract.test.js` (add the field to that page's payload),
  `FEAT/check-answers/view-model/index.js` + both check-answers copy bundles
  (+ its copy.test.js), `FEAT/<name>/<name>.fit.spec.js`,
  `FEAT/check-answers/check-answers.fit.spec.js`. That is 13 to 15 files.
- Boot guards that fire, in order, until every piece is present:
  `assertFulfilmentBindingCoverage` ("obligations owned by no feature"),
  `buildDispatch` ("Obligations collected by no page"), the registry identity
  check ("must import its obligation object from the manifest"). Each stops
  the server starting, and `npm run test:high-risk-plants` fails in the
  vitest setup before any test runs.
- Tests that break: everything in 2.1 plus `SET/obligations/coverage.test.js`
  (duplicate UUID/name, `within` chain), `contract.test.js` (a listed page
  must commit exactly `meta.collects`), the feature `controller.test.js`,
  `check-answers/controller.test.js` and its fit spec, and, if the field is
  mandatory, `flow/task-rows.test.js` and `hub.fit.spec.js` (row status
  changes from Completed to In progress in fixtures), and the seed
  (`src/server/prototype-seed/scenarios.js` posts `flow/fixtures/happy-path.json`
  payloads through the real routes; a new required field makes that POST
  return 400 and `seedHighRiskPlants` throws at start-up, so the deployed
  prototype's example data disappears). `fit/journey-smoke.fit.spec.js`
  drives the same fixture and fails the same way.
- Recipe coverage: add-a-field.md (289 lines, 9 steps, exemplar
  arrival-details). It is complete and accurate but written for an
  engineer: UUIDs, `scalar`/`grouped`, `scope.has()`, `kit.recoverableSave`,
  the manual contract table.
- Difficulty: 4. A designer can do the template and copy parts (steps 4 and
  the markup half of 5) but steps 1 to 3 and 6 to 9 need the model. A
  purely presentational "field" (a static inset, a hint, extra guidance)
  needs none of this and is difficulty 1 to 2, but the recipe does not say
  so; a designer following it would build an obligation for a paragraph.
- Trip points: the obligation `name` must be path-safe and identical to the
  input `name`, `id` and error-map key; `status: 'optional'` still requires
  the binding and dispatch coverage; conditional fields need `applyTo` with a
  helper (`equalsGate`, `includesGate`, `allowListed`) from
  `src/server/app/model/obligations/helpers/index.js`, and the controller
  must not render, validate or commit an out-of-scope value.

### 2.4 Add a page

- Files: the 9-file feature folder from add-a-page.md step 1, plus
  `SET/obligations/sections/*.js`, `obligations/index.js`,
  `FEAT/evaluation.js` (barrel), `FEAT/index.js` (dispatchPages + allRoutes),
  `flow/flow.js`, `flow/task-rows.js`, `flow/section-captions/index.js` or
  its test's `BARE` list, `hub/controller.js` `GROUPS` + hub copy pair + hub
  copy.test.js + hub.fit.spec.js + `flow/task-rows.test.js` (if a new row),
  `flow/run.js` (if in the opening run), `contract.test.js`, check-answers
  view-model + copy + spec. Realistically 20 to 25 files.
- Recent history confirms the count: the origin page landed as PR #44 with
  7 copy/template files alone; arrival-status (#45) and place-of-destination
  (#48) the same; each PR also touched the model, flow, hub and contract.
- Tests that break: all of 2.3, plus `section-captions.test.js` ("a new
  journey page must be given a caption or added to the bare list"),
  `hub/copy/copy.test.js` ("Should hold only the rows the journey has
  landed" pins the ordered row-key list), `flow.test.js`, `run.test.js`,
  `entry-guard.test.js` (if the entry page moves),
  `src/server/app/routes.test.js` and `co-residency.test.js` (route surface
  lists), `indexed.test.js`.
- Recipe coverage: add-a-page.md (364 lines, 10 steps, exemplar
  commodity-type). Accurate, but it has drifted in places: it says the hub
  "now renders four rows" and `FLOW_ONLY_KEYS` "is empty" while the code has
  seven rows and `['declaration']`; the README still says "The set currently
  owns no test files" and "the high-risk-plants set above it is empty".
- Difficulty: 4 to 5. A page with no data (an interstitial, a guidance page,
  a "before you start") is easier: `collects: []`, no obligation, no binding,
  but it still needs `page.js`, a controller with `kit.base()`, registration
  in `FEAT/index.js`, a `flow.js` section slot (else `nextInSection` never
  reaches it) and a caption decision. The dashboard and hub show the
  no-`meta` route pattern (plain Hapi route objects, not in `dispatchPages`),
  and `sample-journey/features/welcome/controller.js` is the smallest example
  (28 lines) of a static page, but no recipe points a designer at it.
- Trip points: a page not in `flow.js` is unreachable by Continue; a page in
  a section with another page becomes that page's Continue target, which is
  why `commodityDetails` sits in a section of its own; the entry guard
  redirects any deep link with no committed answers to `commodity-type`, so a
  new "first" page needs `entry-guard.js` changed.

### 2.5 Reorder or branch the flow

- Reorder within a section: edit the `pages` array in `flow/flow.js` (1
  file) and, if the page is in the opening run, `RUN_STEPS` in `flow/run.js`
  (2nd file). Tests: `flow.test.js`, `run.test.js`, and every fit spec that
  asserts the next URL after Save and continue (commodity-type expects
  `commodities/details`, etc.), plus `journey-smoke.fit.spec.js` if the
  fixture's step order no longer matches. Difficulty 2 for the edit, 3 to fix
  the specs. Caveat: "strictly-earlier continue prerequisites" mean a page
  moved before `origin` no longer requires a country, and a page moved after
  it does; that is invisible in the diff.
- Move a page between sections or between task rows: `flow.js` +
  `task-rows.js` + `hub/controller.js` `GROUPS` + hub copy + hub copy.test +
  `flow/task-rows.test.js` + `hub.fit.spec.js` + `section-captions/index.js`
  (captions are per page, not per row). Difficulty 3.
- Branch on an answer (show page X only for potatoes): this is not a flow
  edit. The page gate is derived from `meta.collects` and the obligations'
  `applyTo` scope: arrival-status is skipped for potatoes because
  `arrivalStatus` carries `includesGate(commodityType, ['plants-for-planting',
  'wood-and-cut-trees'], ...)` in `SET/obligations/sections/arrival.js`, and
  `flowPageTarget` in `run.js` returns null when `pageGatePasses` fails. So a
  branch means editing the obligation model (difficulty 4) with a helper, and
  the engine then purges the answer when the branch closes. An authored
  `gate: (scope) => ...` on a section exists only for `review`
  (`scope.readyForCheckYourAnswers`).
- Recipe coverage: journey-flow-and-gates.md and
  `src/server/app/docs/flow-and-gates.md` explain the machinery well but
  neither is a recipe; there is no "move a page" or "add a branch" how-to.
- Trip points: `taskRows` and `sections` are not one-to-one; the hub links a
  row to the first page whose gate passes; `conditional: true` hides a row
  when Not applicable; `FLOW_ONLY_KEYS` widens the accepted answer keys.

### 2.6 Validation and error messages

- Error message text only: copy change (2.1), 2 to 3 files. The message
  lives in `copy.errors.<field>` and is passed into the validator in the
  controller (`requiredOneOf('commodityType', commodities.commodityTypes(),
  copy.errors.commodityType)`), so no controller change.
- Change a rule (make optional, add a max length, add a range): edit the
  `fields()` builder in `controller.js`, picking from the 22 exported
  factories in `src/server/app/lib/validate/index.js` (`requiredText`,
  `requiredMaxText`, `requiredOneOf`, `requiredEmail`, `postcode`, `ukPhone`,
  `requiredIntegerInRange`, `requiredDateTextInRange`, `requiredTime`, ...).
  `compose(...)` joins them; `validate(schema, payload)` returns
  `{ value, errors }`. 1 file plus `controller.test.js` ("every validation
  branch") and the fit spec ("each validation rule in its own test"), plus
  copy if a new message. Difficulty 3.
- Make a mandatory field optional at submit time is a different change:
  obligation `status: 'optional'` in the model (difficulty 4). validation.md
  explains "save rules and completion rules" are separate; a designer will
  not expect two places.
- Shared defaults: `src/server/app/shared/copy.en.js` `validatorDefaults`
  (`'Enter a valid postcode'`, `maxLength: (max) => ...`) are upstream-owned.
- Recipe coverage: `src/server/app/docs/validation.md` (102 lines) is a
  reference, not a recipe; add-a-field.md step 3 lists the controller order.
- Trip points: date fields need bounds in two shapes (`Date` for the
  validator, `d/m/yyyy` text for the picker) from a helper like
  `arrival-bounds.js`; `dateText` lets blank pass, `requiredDateText` is a
  separate primitive; service-backed option lists must be built inside POST.

### 2.7 Check-your-answers rows

- Files: `FEAT/check-answers/view-model/index.js` (section builders:
  `consignmentSection`, `arrivalSection`, `partiesSection`, each returning
  `{ heading, cards: [{ title, rows, actions }] }`), `FEAT/check-answers/copy/copy.en.js`
  + `copy.cy.js` (`labels.<field>`, `cards.*`, `sections.*`), `copy.test.js`,
  `check-answers/controller.test.js`, `check-answers.fit.spec.js`. 5 to 6
  files. Template needs no change: it loops `sections` and `cards` into
  `govukSummaryList({ card, rows })`.
- Row helpers: `answerRow(field, value?)` (label from `copy.labels[field]`,
  Change link resolved through dispatch by obligation name), `scopedRows([...])`
  (drops out-of-scope fields), `row()`/`readOnlyRow()` in
  `view-model/rows/summary-row.js`, `changeAction()` in `rows/change-link.js`,
  `dateText()` in `rows/value-text.js`.
- Tests that break: `check-answers/copy/copy.test.js`, `controller.test.js`,
  the fit spec (41 locator calls; 6 hardcoded names), and any seed/smoke
  case that reads the CYA page (`journey-smoke` checks reference and late
  banner only).
- Recipe coverage: add-a-field.md step 5 and add-a-section.md step 7 are
  accurate.
- Difficulty: 3. Adding a row for an existing answer is copying one line
  and two copy leaves. Reordering cards or rows is array order. Adding a
  new heading is a new `sections.<id>` copy leaf plus a builder. The trap is
  labels for coded values (`countries.originLabel`, `ports.label`) being
  async and pre-resolved in `sectionContext`.

### 2.8 Task list (hub) groups and rows

- Files: `FEAT/hub/controller.js` `GROUPS` (order and membership of rows
  under the four numbered headings), `hub/copy/copy.en.js` + `copy.cy.js`
  (`groups.<id>`, `rows.<id>.title` and optional `hint`, `statuses.*`),
  `hub/copy/copy.test.js` (pins group captions in both locales, the ordered
  row-key list, and each row title), `hub/controller.test.js`,
  `hub.fit.spec.js`, and for a genuinely new row `flow/task-rows.js` +
  `flow/task-rows.test.js`. 5 to 8 files.
- Rename a group heading or a row title: copy change, 3 files (en, cy,
  copy.test). Difficulty 2.
- Move a row to another group or reorder: `GROUPS` + hub copy.test.js
  (`Object.keys(copy.groups)` must equal `GROUPS.map(g => g.id)`) + hub
  controller.test + hub.fit.spec. Difficulty 2 to 3.
- Add or remove a group: `GROUPS` + both copy bundles + copy.test's
  four-string assertions. Empty groups are not rendered, which helps.
- Status tags (`govuk-tag--green` etc.) are in `STATUS_TAG` in the hub
  controller, so a colour change is a controller edit (difficulty 2).
- Recipe coverage: add-a-page.md step 6 and add-a-section.md step 6 describe
  this accurately and in detail.
- Trip points: a row's status is computed from its pages' `collects`; a
  mandatory row blocks Check and submit; `hub/template.njk` renders each
  group as an `h2` + `govukTaskList` and needs no change.

### 2.9 Dashboard / listing page

- Files: `FEAT/dashboard/template.njk` (126 lines: start button, search
  form, sort form, one `govukSummaryList` card per notification with
  `detailRows`, pagination), `dashboard/copy/copy.en.js` + `.cy.js`
  (`title`, `body`, `startButton`, `search.*`, `sort.*`, `table.*`,
  `statusLate`, `pagination.*`, `emptyText`), `dashboard/copy/copy.test.js`,
  `dashboard/controller.js` (`renderDashboard`, create POST, amend POST),
  `dashboard/view-model/row/index.js` (`toRow`: reference, commodity,
  origin, arrival, consignor, status tag, created, submitted, actions),
  `view-model/row/actions.js`, `view-model/sort-options.js`,
  `dashboard/notification-helper.js` (pagination and sort parsing).
- Change the columns shown per card: `template.njk` `detailRows` array +
  `copy.table.*` (3 files, difficulty 1 to 2). Show a new value: `toRow` in
  `view-model/row/index.js` + its `index.test.js` (difficulty 3).
- Change sort options: `sort-options.js` + `notification-helper.js` +
  `notification-helper.test.js` (difficulty 3).
- Tests that break: `dashboard/copy/copy.test.js`, `controller.test.js`,
  `view-model/row/index.test.js`, `late-tag.test.js`, `dashboard.fit.spec.js`
  (46 locator calls), `fit/sets-chooser.fit.spec.js` (boots each set's
  dashboard).
- Recipe coverage: none. The dashboard is described in the README's
  "served surface" paragraph only.
- Trip points: the dashboard is the `start` flow section and the caption
  map's `dashboard` entry; `createPost` begins the opening run and redirects
  to `commodityTypePage.slug`, so changing the first page means editing the
  dashboard controller too.

### 2.10 Confirmation page

- Files: `FEAT/confirmation/template.njk` (21 lines: `govukPanel`, body,
  date line, optional late `govukNotificationBanner`, two links),
  `confirmation/copy/copy.en.js` + `.cy.js` (`title`, `reference`, `body`,
  `dateOfNotification`, `late.*` with two functions taking a day count,
  `viewNotification`, `returnToDashboard`), `copy.test.js`,
  `controller.test.js`, `confirmation.fit.spec.js` (34 locators, 3 hardcoded).
- Copy or layout changes: 3 to 4 files, difficulty 1 to 2. Adding a new
  dynamic value (for example "what happens next" that depends on commodity
  type): `controller.js` `h.view` object, difficulty 3.
- The page is read-only, has no obligation, `collects: []`, GET only, and
  redirects to CYA unless `journey.status === SUBMITTED`. It sits in the
  `review` section and is listed `BARE` in the caption test.
- Recipe coverage: none (it was copied from animals as PR #57/#58).

### 2.11 A new set (a fresh prototype next to high-risk-plants)

- `npm run new:set -- <id>` copies `sample-journey` (one static welcome
  page, no obligations, empty `taskRows`), rewrites ids (kebab, camelCase,
  Sentence case) and UUIDs, mounts it in `src/server/prototype-sets/index.js`
  and appends it to `overrides.json` `ours`. It appears on the chooser at `/`.
  The designer then owns `src/server/app/sets/<id>/**` and
  `src/server/app/routes-<id>.js` and the sync never touches them.
- `--from high-risk-plants` copies the full journey (about 220 files);
  `transformContent` renames `high-risk-plants` / `highRiskPlants` /
  `High risk plants` everywhere and regenerates every UUID, but
  `copy-convention.test.js`, `copy-parity.test.js`, `contract.test.js`,
  `vitest.config.js` exclude list, `playwright.config.js` `features` project,
  `fit/set-base.js` and `src/server/prototype-seed/*` all name
  `high-risk-plants` literally, so the copied set gets no convention checks,
  no Playwright discovery (vitest would then try to run its `.fit.spec.js`
  as unit tests), and no seed. add-a-set.md step 8 says so for the two
  config files. This is the route a designer most wants (start from the
  real journey, then diverge) and it is the least finished.
- `descriptions.js` needs a hand edit for the chooser blurb.
- Difficulty: 1 to run the command; 4 to make a `--from high-risk-plants`
  copy fully first-class.

### 2.12 Example data (the seed)

- `src/server/prototype-seed/scenarios.js` builds four notifications by
  posting `SET/journeys/linear/flow/fixtures/happy-path.json` steps through
  the real routes (`seed-high-risk-plants.js`) as author
  `prototype-example-data`; `PROTOTYPE_SEED=false` turns it off (Playwright
  does). Changing a field name, slug, required rule or option value in the
  journey breaks the seed at boot with "Seeding the high-risk-plants set
  failed at <slug>: 400". The fixture is also `journey-smoke`'s input and
  the Lighthouse seed, so it is edited in three roles at once.
- Adding a scenario (a fifth example) is a one-object edit in `scenarios.js`
  (difficulty 2); changing what an example contains means editing the JSON
  fixture (difficulty 2, but the smoke test asserts against the same data).

## 3. Where the architecture trips a designer

1. Boot guards, not red tests. `assertObligationPurity`,
   `assertFulfilmentBindingCoverage`, `buildDispatch` and
   `assertSetConfigured` throw during plugin registration, so `npm run dev`
   simply refuses to start and the vitest setup fails before any test. The
   messages are good ("Obligations collected by no page") but they name
   concepts (page owner, leaf, binding, manifest identity) not files.
2. Copy is a test contract. 14 of 16 `copy.test.js` files and 13 of 16
   `controller.test.js` files pin exact English sentences. Every wording
   change is a three-file change and a Welsh change. The `AWAITING THE COPY
   PASS` headers show the team expects rewording, yet nothing tells a
   designer which tests will object or offers a way to update them.
3. Welsh parity is mandatory and machine-checked. A designer cannot add an
   English string alone; `copy-parity.test.js` fails on a missing or
   identical cy leaf. Nothing in PROTOTYPE.md says so.
4. `lint:arch` (dependency-cruiser, 14 rules, `severity: error`, known
   violations file is empty). The rules that bite a designer editing a set:
   `set-isolation` (a set may not import another set, so a new set cannot
   reuse a high-risk-plants view-model or copy bundle), `journey-isolation`,
   `obligations-never-journeys` (an obligation file cannot import copy or a
   page), `sets-not-l1`, `no-circular` (which is why `page.js` imports
   nothing and why controller must not import `flow.js` directly; the hub
   does import `flow.js`, which is allowed because flow does not import the
   hub). `.njk` files are excluded from the graph, so template `{% from %}`
   paths are never checked. `npm run lint` runs `lint:js`, `lint:scss`,
   `lint:arch` in sequence and CI runs all three plus `format:check`.
5. The manual contract table. `contract.test.js` does not notice a new
   controller; the recipes say so three times. A designer adding a field to
   a listed page gets a red test; one adding a page gets silence.
6. Section captions are a separate decision per page with its own test
   (`CAPTIONED` and `BARE` lists), copy pair and parity entry.
7. Flow is three overlapping lists (`sections`, `taskRows`, `captionSections`)
   plus `GROUPS` in the hub controller plus `RUN_STEPS`. The same page id is
   registered in up to five places, each with a test.
8. Scope, not flow, decides branching. "Skip this page for potatoes" is an
   `applyTo` gate on an obligation in `obligations/sections/*.js`, then
   `scope.has()` in the controller, then `scopedRows` in check-answers. The
   engine then wipes out-of-scope answers, which surprises anyone testing by
   hand.
9. Save-time rules and submit-time rules are different systems (Joi in the
   controller vs `status`/`requires` in the model).
10. Path builders come in two families (`pageRoutePath` for routes,
    `pagePath` for links) and swapping them fails at first request.
11. The Nunjucks view name is `${TEMPLATES}/features/<name>/template` with
    `TEMPLATES = 'high-risk-plants/journeys/linear'` while the layout is
    `shared/layout.njk` from a different root. A renamed template file needs
    the controller's `view` string changed.
12. New client JS needs a webpack entry or 404s silently (documented in
    every recipe).
13. The sync boundary. Every file under `SET/` is upstream's. A designer
    who tweaks high-risk-plants copy in the prototype gets it reverted or
    conflicted on Monday; `PROTOTYPE.md` says so but offers no safe
    alternative other than "make the change upstream" or "make a new set",
    and the new-set route is unfinished (2.11).
14. Local tooling friction: `npm run dev` runs webpack watch + nodemon
    (`--ext js,json,njk`), so `.njk` and copy `.js` edits hot-reload; copy
    changes still need `npm run test:high-risk-plants` (which does NOT run
    parity, convention or contract; only `npm test` does, and `npm test`
    runs `pretest` = full webpack build then vitest with coverage over
    the whole repo). Playwright needs `npm run build:frontend` and boots its
    own server on 3003 (`PORT=3053` when the stack is up).
15. The prototype's `.claude/settings.json` references
    `.claude/hooks/sonar-secrets/build-scripts/pretool-secrets.sh`,
    `prompt-secrets.sh` and `.claude/sonar-analyze.sh`, all of which
    `overrides.json` lists under `deleted` and which do not exist on disk.
    Anyone opening Claude Code inside the prototype repo gets a failing hook
    on every prompt and every Read. Proposed fix written to
    `workareas/shared/designer-prototyping/settings-proposal.json`.
16. Documentation drift: docs say the set is empty, has no tests, four hub
    rows, empty `FLOW_ONLY_KEYS`, empty `RUN_STEPS`; the code has 17
    features, 7 rows, `['declaration']`, 9 run steps. A designer following
    the docs literally will look for files that have moved on.

## 4. What the last three months of history says

56 non-merge commits touched `SET/` since 2026-06-27, all of them between
2026-09-05 and 2026-09-25 (the set did not exist before EUDPA-408 on
2026-09-05). Pattern:

- 2026-09-07 to 09-10: one page per PR (#32 dashboard, #36 hub, #39
  commodity-type, #42 commodities, #44 origin, #45 arrival-status, #47
  arrival-details, #48 place-of-destination, #51 consignor, #52
  identification numbers, #53 contact, #54 check answers, #56 declaration,
  #57 confirmation, #58 cancel-amend, #38 delete-notification). Each PR is
  the add-a-page recipe run once: 4 copy/template files plus model, flow,
  hub, contract, tests. The recipes were being closed ("Close the EXEMPLAR
  PLACEHOLDER") in the same run (#37, #41, #43, #55, #61).
- 2026-09-11: three pure design fixes, which are the best evidence of what a
  designer change looks like here: #65 "Call the destination page Place of
  destination, as the task list does" (copy.en 17 lines, copy.cy 19 lines,
  copy.test 36 lines: a rename needed a test rewrite twice the size of the
  copy change); #66 swap the contact page to the searchable paged
  address-book table (template +119, copy +29 each, copy.test +95); #67
  give the type-ahead the GOV.UK font and a dropdown arrow (SCSS).
- 2026-09-15 to 09-22: engineering (EUDPA-575 lazy reference data,
  EUDPA-573 stale reference data on GET), each adding one or two copy leaves
  to origin and arrival-details in both locales.
- 2026-09-23 to 09-25: platform (EUDPA-619 multi-set, #69 alignment that
  renamed `commodities/list/template.njk` to `list.njk`).
- Zero commits in the window are copy-only tweaks by a non-engineer; every
  copy change rode inside an engineering PR and updated `copy.test.js`.

## 5. Test-break matrix (which suites a change type reaches)

| Change | copy.test | controller.test | parity/convention | contract | flow/run/task-rows tests | hub tests | captions test | fit spec (page) | check-answers spec | seed / smoke | lint:arch |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Copy wording | yes | often | yes (cy) | no | no | if hub copy | if caption | no (imports copy) | no | no | no |
| Template markup | no | no | no | no | no | no | if caption removed | if roles change | no | no | no |
| Error message text | yes | often | yes | no | no | no | no | no | no | no | no |
| Validation rule | no | yes | no | no | no | no | no | yes | no | if seed payload now invalid | no |
| Add field | yes | yes | yes | yes | if mandatory | if status shifts | no | yes | yes | yes | if import crosses a layer |
| Add page | yes | yes | yes | add case | yes | yes | yes | new | yes | if fixture order | yes if mis-imported |
| Reorder flow | no | no | no | no | yes | maybe | no | next-URL asserts | no | yes | no |
| Branch on answer | no | yes | no | seed needed | yes | yes | no | yes | yes | maybe | no |
| CYA rows | CYA copy.test | CYA controller.test | yes | no | no | no | no | no | yes | no | no |
| Hub groups/rows | hub copy.test | hub controller.test | yes | no | task-rows.test | yes | no | hub spec | no | no | no |
| Dashboard columns | dashboard copy.test | row/index.test | yes | no | no | no | no | dashboard spec | no | no | no |
| Confirmation | conf copy.test | conf controller.test | yes | no | no | no | no | conf spec | no | smoke (banner) | no |

## 6. Commands a designer actually needs (from package.json)

- `npm run dev` (port 3103, hot reload on js/json/njk)
- `npm run test:high-risk-plants` (set-local vitest, no coverage, no
  parity/convention/contract)
- `npm test` (everything, with a webpack build first)
- `npm run test:fit:features` / `npm run test:fit:journeys` (Playwright,
  self-booting on 3003; `PORT=3053` when the stack is up)
- `npm run lint` (`lint:js`, `lint:scss`, `lint:arch`), `npm run format`
- `npm run new:set -- <id> [--from high-risk-plants]`
- `npm run sync:upstream`
- `npm run capture:high-risk-plants` is NOT a designer command and NOT a
  screenshot tool (critic correction): it re-fetches the countries and ports
  reference-data fixtures from a running reference-data service on :8086 and
  fails with no stack. See `plants-verify.md` §2g.

## 7. Implications for the designer skill suite (input to planning)

- The cheapest, highest-value wins are around copy: a skill that edits en +
  cy + copy.test.js together, runs parity/convention, and rewrites pinned
  literals. Today one hint change is three files and two suites.
- Template edits are already designer-friendly (1 file, macros, hot
  reload); the missing piece is a guard that says "this string belongs in
  copy" and a checklist for role-based locators in the fit spec.
- "Add a static/guidance page" and "add a presentational element" deserve
  their own light recipe, separate from add-a-field/add-a-page, because the
  existing recipes assume every page collects data.
- Flow reorder and hub regroup are two-to-eight-file changes with clear
  tests; a skill can do them deterministically. Branching is a model change
  and should be routed to the frontend-change skill's obligation mode.
- `new:set --from high-risk-plants` needs finishing (config literals in six
  places) before "fork the real journey and diverge" is a safe designer
  path; until then the designer either edits upstream-owned files (reverted
  Monday) or starts from an empty set.
- The seed and smoke fixture (`happy-path.json`) must be regenerated or
  updated whenever a field, slug or option changes, or the deployed
  prototype loses its example data at boot.
- Docs drift (README/add-a-page counts, "set is empty") should be fixed
  upstream so the weekly sync carries it, not in the prototype.
- Fix the dangling hooks in the prototype's `.claude/settings.json` (see
  `settings-proposal.json`) before pointing any designer at Claude Code in
  that repo.
