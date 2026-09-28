# Plants prototype: stub services and data a designer can lean on

Repo: `repos/trade-imports-plants-prototype`, branch `feat/NO_JIRA-designer-prototyping` (clean tree at time of survey).
Evidence: read every file named below; nothing here is inferred from docs alone. Paths are relative to the repo root.

## 1. The one switch: `isStubDataMode()`

`src/server/common/services/mode.js` (upstream file, **patched** — listed in `overrides.json.patched`) exports two functions:

| Function | Formula | Who reads it |
|---|---|---|
| `isStubMode()` | `STUB_MODE && !isProduction` | sign-in (`server.js`, `plugins/auth.js`), the **session** seam (`services/persistence/session/index.js`) |
| `isStubDataMode()` | `STUB_MODE \|\| isProduction` | the four **data** seams: records store, address book, countries, ports |

Consequences a designer needs to know:

- `npm run dev` (development): `src/prototype-defaults.js` (ours) sets `STUB_MODE=true` and `SESSION_CACHE_ENGINE=memory` unless already set. Sign-in is the dev stub (`/auth/stub-sign-in`, `/auth/sign-in` both mint a stub session), data is stubbed.
- `npm start` / deployed (production): sign-in goes through Defra ID (the Defra ID *stub* when deployed to CDP), data is **still** stubbed because `isProduction` forces `isStubDataMode()` true. There is no configuration in which the prototype talks to a real backend, address book or reference-data service.
- The session seam picks `stub` (cookie-backed) locally and `real` (yar/Redis-or-memory) when deployed. This matters for anything that lists notifications — see section 4.

Env knobs (all optional): `STUB_MODE`, `PROTOTYPE_SEED` (`false` disables seeding; the FIT web server sets it), `AUTH_ENABLED` (leave unset), `PORT` (default 3103), `TRADE_IMPORTS_INS_FRONTEND_URL` (the header "Address book" link, `http://localhost:3002` by default, goes nowhere in the prototype).

## 2. Inventory of stubbed services

| Service | Stub implementation | Data source | Mode gate | Owner |
|---|---|---|---|---|
| Records store (notifications) | `src/server/app/services/persistence/records/stub/**` — in-memory `Map` per set (`store/state.js`) | Written by walking the journey; nothing canned | `records/index.js` (patched: `isStubDataMode`) | **upstream** (stub code), `index.js` patched |
| Address book | `src/server/app/services/address-book/stub/index.js` — `STUB_BOOK`, 13 pipe-delimited rows via `from-row.js` | Inline literal rows | `address-book/index.js` (patched) | **upstream** |
| Countries (origin + address country lists) | `src/server/app/services/countries/stub.js` → `COUNTRY_LABELS` | `_capture/fixtures/countries-origin.json` (31 entries, ISO alpha-2 + name; the `GBNAG_SPS_EX` block: EU27 + IS, LI, NO, CH) | `countries/index.js` (patched) | **upstream** |
| Ports of entry | `src/server/app/services/ports/stub.js` → `PORTS` | `_capture/fixtures/ports-of-entry.json` (~78 entries, `{ code: "GB DVR", name }`) | `ports/index.js` (patched) | **upstream** |
| Commodity vocabulary | `src/server/app/sets/high-risk-plants/services/commodities/index.js` — frozen lists, no stub/real split | Inline literals: 3 commodity types, 9 categories, 15 genera, origin constraints, per-line field allow-lists | none (always these values) | **upstream** (set-owned) |
| Session (known journeys, opening run, flow-only answers) | `src/server/app/services/persistence/session/stub.js` — cookies | n/a | `session/index.js` (`isStubMode`) | **upstream** |
| Sign-in | `src/server/auth/stub-sign-in.js` — one fixed user `Stub User`, `organisationId` from `?organisationId=` query (default `stub-org-1`) | Inline | `isStubMode` | **upstream** |
| Reference-data capture script | `src/server/app/services/_capture/capture.js` (`npm run capture:high-risk-plants`) — refreshes the two JSON fixtures from a running reference-data service on `:8086` | Workspace stack | n/a | **upstream** |

Things that **do not exist** (confirmed by grep and by `docs/services.md` / `sets/high-risk-plants/docs/services.md`):

- No document/file-upload service (no cdp-uploader wiring anywhere under `src/server`).
- No transporter, transport-reference, reason-for-import or purpose service — removed deliberately upstream; the docs say do not restore without a behaviour that needs them.
- No consignee on the plants dashboard (the set carries no consignee obligation); `marshalListItem` still computes `consigneeName` but the row view-model ignores it.
- No outbox, events, PIMS routing, notification-mapper use in stub mode.

## 3. The prototype seed (ours): how example notifications are made

All under `src/server/prototype-seed/**` — **prototype-owned** (`overrides.json.ours`), safe to edit.

| File | Role |
|---|---|
| `scenarios.js` | `HIGH_RISK_PLANTS_SCENARIOS`: four entries, each `{ label, steps, submit?, amend? }`. `steps` are sliced out of the upstream happy-path fixture with `stepsThrough(name, throughSlug)` |
| `seed-high-risk-plants.js` | Drives each scenario through the **real routes** with `server.inject` (POST `/high-risk-plants/notifications`, then POST each step's slug, then `notification-view` + `declaration` to submit, then `amend`). Signs in as `EXAMPLE_DATA_AUTHOR` (`organisationId: 'prototype-example-data'`) via hapi's inject `auth` option, so it works under stub sign-in and Defra ID alike |
| `resolve-fields.js` | Turns `arrivalDate: { daysFromToday: n }` into `d/m/yyyy` relative to today (twin of `fit/seed-fields.js`) |
| `http-client.js` | Cookie-jar client over `server.inject`; replays `Set-Cookie`, attaches the `crumb` CSRF token to every POST |
| `registry.js` | In-memory `Map<setId, journeyIds[]>` of what was seeded |
| `index.js` | `SEEDERS = { 'high-risk-plants': seedHighRiskPlants }`, `ensureSeeded` (lazy, first signed-in request, one in-flight promise per set), `resetSet` (clear + reseed), `isSeedingEnabled` (`PROTOTYPE_SEED !== 'false'`) |
| `adopt-known-journeys.js` | `onPreHandler` plugin: on every authenticated request under a seeded set, `ensureSeeded`, then add any seeded ids the session does not yet know to its known-journeys list. Skips the seed author's own requests |

**Data the seed reads** — `src/server/app/sets/high-risk-plants/journeys/linear/flow/fixtures/happy-path.json`. This file is **upstream-owned** (nothing under `sets/high-risk-plants/**` is in `ours`). It holds five named scenarios: `warePotatoes`, `warePotatoesLate` (arrival `daysFromToday: -1`, so it submits **late**), `seedPotatoes`, `plantsForPlanting`, `woodWithoutBark`. Every one uses address-book id `tech-imports-ltd` for destination, consignor and contact, and port `GB DVR`.

**States the four seeded examples end in** (from `scenarios.js`):

| Label | Fixture | Stops after | Status |
|---|---|---|---|
| draft, just started | `warePotatoes` | `commodity-type` | `draft` |
| draft, midway through | `plantsForPlanting` | `arrival-details` | `draft` |
| submitted | `seedPotatoes` | all steps + declaration | `submitted` |
| submitted, then amended | `woodWithoutBark` | all steps + declaration + `amend` | `amend` |

Not seeded today: a **late** submission (the `warePotatoesLate` fixture exists but is unused), a **deleted** notification, a **copy**, a **cancelled amendment**, and any notification for a second organisation.

**Lifecycle statuses** the stub store knows (`engine/persistence/records.js`): `draft`, `submitted`, `amend`, `deleted`. Transitions in `records/stub/lifecycle/transition.js`: `finalise` (draft/amend → submitted, stamps `submittedAt`), `amend` (submitted → amend, snapshots fulfilment), `cancelAmend` (amend → submitted, restores snapshot), `softDelete` (→ deleted). `create.js` also has `copy(journeyId, idempotencyKey)`.

**Reference numbers**: `records/stub/reference-number.js` mints `GBN-HRP-{YY}-{6 Crockford base32}` — matches the backend generator, so seeded references look real.

**Persistence**: the store is a process-level `Map`. A restart empties it and the next signed-in request reseeds. Nothing is on disk.

## 4. What the dashboard lists (and why seeded rows appear)

`sets/high-risk-plants/journeys/linear/features/dashboard/controller.js` (upstream) calls `listKnownJourneys(request, { page, sort, referenceNumber })`. The stub `list` (`records/stub/lifecycle/read.js`) filters to the ids passed in, drops `deleted`, optionally matches an exact `referenceNumber`, sorts by `createdAt` (asc/desc — note the default sort key is `arrivalDate,desc` but the stub only honours direction, sorting by `createdAt`), pages by 20.

So the dashboard shows **what the session knows**, not what the store holds. That is why `adopt-known-journeys.js` exists: it pushes the seeded ids into each new session's known list. A designer who writes straight into the store (bypassing the seed) would see nothing until the ids are adopted.

Row fields (`records/stub/marshal/list-item.js` → `dashboard/view-model/row/index.js`): reference, status tag, Late tag (`lateNotificationIndicator === 'late'`, set by the declaration page from `features/timing-windows.js`: potatoes need 2 days' notice before arrival, plants/wood 4 days after), commodity (first line's category), origin (country label via countries stub), arrival date, consignor name (resolved from the address-book stub by `addressId`), created, submitted, row actions.

Dashboard controls that exist upstream: sort select (4 options: arrival newest/oldest, created newest/oldest), reference-number search box, pagination, "deleted" success banner. **No status filter, no commodity filter, no date range.**

## 5. Reset from the chooser (ours)

- `src/server/sets-index/reset-controller.js`: `POST /reset/{setId}` → 404 for an unmounted set, redirect to `/` when signed out, otherwise `resetSet(server, setId)` then redirect to `/?reset=<setId>`.
- `resetSet`: `records.clear()` inside `withSetContext(setId)`, `clearSeeded`, then reseed if the set has a seeder and seeding is enabled.
- `src/server/app/sets-index/template.njk`: one secondary button per set inside a CSRF-crumbed form; success banner "The data in <Set> has been reset."
- Reset is for everyone: the store is shared across all signed-in users. Sessions that already knew the old ids simply stop seeing them (the ids no longer exist in the store) and adopt the new ones on their next request.

## 6. Where a designer would make each kind of change

### 6a. Add a new example notification state
**Prototype-owned; edit freely.**

- To add a new example built from an existing fixture: add an entry to `HIGH_RISK_PLANTS_SCENARIOS` in `src/server/prototype-seed/scenarios.js`. A late submission is one line: `{ label: 'submitted late', steps: happyPaths.warePotatoesLate.steps, submit: true }`.
- To add a **deleted**, **copied** or **cancelled-amend** example: `seed-high-risk-plants.js`'s `runScenario` only understands `submit` and `amend`. Extend it with e.g. `softDelete`, `copy`, `cancelAmend` flags that POST the matching feature routes (`delete-notification`, `cancel-amend` features exist under the set; look at their `controller.js` for the slug/payload). Keep driving the real routes; never write to `journeys()` directly, or the seed can produce shapes the journey would refuse.
- To add a new **consignment shape** (different commodity, country, port, party): the fixture lives upstream in `flow/fixtures/happy-path.json`, and `fit/journey-smoke.fit.spec.js` (upstream) drives it, so adding a scenario there is a change to send back to `trade-imports-plants-frontend`. For a prototype-only shape, put a prototype-owned fixture beside `scenarios.js` (e.g. `src/server/prototype-seed/fixtures/<name>.json`) and read it the same way `scenarios.js` reads `happy-path.json`. Field names per slug are documented by the existing fixture; the values must satisfy the set's obligations (see `sets/high-risk-plants/docs/obligation-model.md`) or the seed throws at that step with the non-302 status.
- Seeded data for a second set: add `SEEDERS['<set-id>']` and `SEED_AUTHOR_IDS['<set-id>']` in `prototype-seed/index.js`. `sample-journey` has no seeder because its one page never calls `records.create()`.

### 6b. Add a new reference-data option (country, port)
**Upstream-owned data files; two honest routes.**

- The stubs read `src/server/app/services/_capture/fixtures/{countries-origin,ports-of-entry}.json`, which are snapshots of the real reference-data service. Editing them locally works instantly (the stubs load the JSON at boot) but the next weekly sync merges upstream changes into them — a hand-added row survives only until upstream re-captures. Options:
  1. Add the row in the real reference-data service (`trade-imports-reference-data`), run the workspace stack, `npm run capture:high-risk-plants` upstream, PR to plants-frontend, wait for the sync. Right for "this port really exists".
  2. Prototype-only: a tiny prototype-owned overlay. `countries/stub.js` and `ports/stub.js` are one-liners re-exporting from `_capture/fixtures.js`. The cleanest seam that does not fight the sync is a new `ours` file (e.g. `src/server/prototype-data/ports-extra.json`) merged in by a **patched** `ports/stub.js` (add it to `overrides.json.patched` with a `why`). Today no such overlay exists; this is a candidate skill/recipe.
- The origin page narrows countries per commodity category through `commodities/index.js` `ORIGIN_CONSTRAINTS` (ware potatoes: PL, PT, RO, ES; conifer wood without bark: IT, FR, PT, ES; other plants/wood: EU27; seed potatoes: unrestricted). A new country will be *offered* but *rejected* for a constrained category unless the constraint is widened too — same file, upstream-owned.
- Address-form country list = "United Kingdom" + every `countries-origin.json` name (`addressCountries()`).

### 6c. Add a new address-book entry
**Upstream-owned literal list.**

- `src/server/app/services/address-book/stub/index.js` `STUB_BOOK`: one pipe-delimited row `id|name|line1|town|postcode|country`; `from-row.js` fills telephone `01632 960000` and email `<id>@example.com`. Ids are the radio values the picker stores (`{ addressId }`), so pick a stable kebab-case id. Row order is page order (page size 5, `PAGE_SIZE` in `address-book/index.js`); rows 1–5 are the "happy path" parties. Search is a case-insensitive substring over name + address values.
- The book is org-agnostic in stub mode: `search(orgId, …)` and `party(orgId, id)` ignore `orgId`, so every signed-in user sees the same 13 parties. There is no per-organisation stub book today.
- Read paths that resolve an id back to a record: picker `render.js`, `parties/index.js` (`withoutUnresolvedPartyRefs`), `check-answers/controller.js`, and the dashboard list-item marshal. A deleted-looking record would need `deleted: true` in the row shape — `from-row.js` hardcodes `false`; extending the row grammar is upstream work.
- Because this file is upstream, a prototype-only extra party has the same choice as 6b: send it upstream, or add a prototype-owned overlay via a patched `stub/index.js` (`STUB_BOOK = [...UPSTREAM_ROWS, ...PROTOTYPE_ROWS].map(fromRow)`).

### 6d. Fake a service that does not exist yet
E.g. a dashboard status filter, a transporter lookup, a document upload.

- **Where the fake data lives**: follow the countries/ports shape — a JSON fixture + a barrel that returns it — but as a prototype-owned module (`src/server/prototype-services/<name>/index.js`, add the glob to `overrides.json.ours`). Do not add it under `src/server/app/services/` (upstream will not know it, and `lint:arch` dependency-cruiser rules apply there).
- **Where the page that uses it lives**: inside a set. The realistic pattern is `npm run new:set -- <id> --from high-risk-plants` so the new pages are `ours` (the scaffold appends `src/server/app/sets/<id>/**` and `src/server/app/routes-<id>.js` to `ours`), then follow the set's own recipe docs (`add-a-field.md`, `add-a-page.md`, `add-a-section.md`, `add-a-collection.md`, `journey-flow-and-gates.md`). Editing `sets/high-risk-plants/**` directly is editing upstream. Caveat from `PROTOTYPE.md` and observed in `scaffold`: copying `high-risk-plants` produces a large tree with cookie names, `SET_ID`, templates root and plugin name to rename; `copy-set.js`'s `transform.js` does the id substitution but expect residue.
- **Dashboard filter specifically**: the stub `list` in `records/stub/lifecycle/read.js` takes `{ journeyIds, page, sort, referenceNumber }` and the controller passes exactly those. A status or commodity filter needs (a) a query param read in the set's `dashboard/controller.js`, (b) an extra filter in `list` — the stub is upstream, so in a copied set you would give the copied set its own records adapter (the set's gateway `routes-<id>.js` calls `configureRecords(SET_ID, records)`; point it at a prototype-owned adapter that wraps the upstream stub and adds the filter). That keeps the upstream stub untouched.
- **Transporter lookup**: the upstream removed `commercial-transporters` deliberately (commit `a810e68`, 2026-09-07). A fake belongs in `prototype-services/`, read by a page in a copied set, following the address-book picker's search/paginate/select shape (`address-book-picker/render.js` is a good template: `search(orgId, { query, page })` → `{ results, total, page, totalPages, pageSize }`).
- **Upload**: nothing to build on in this repo; the workspace memory notes a no-JS cdp-uploader exemplar elsewhere (`reference_nojs_cdp_uploader_pattern.md`). A faked upload page in a copied set could store a filename as an ordinary answer and never touch a file — a prototype-owned decision to document.

### 6e. Add a whole new set
`npm run new:set -- <id> [--from high-risk-plants]` (`scripts/new-set/**`, ours). It copies the set tree and `routes-<from>.js`, registers the mount in `src/server/prototype-sets/index.js` (anchors on the `setsIndex` import and `server.register([setsIndex, adoptKnownJourneys])` lines), and appends the two globs to `overrides.json.ours`. Then: `npm run format`, `npm test`, `npm run test:fit`, replace the welcome feature, add a line to `src/server/prototype-sets/descriptions.js`. Not automated by the scaffold: a `SEEDERS` entry (6a), a `playwright.config.js` project and a `vitest.config.js` exclude for the new set's `.fit.spec.js` files (`docs/add-a-set.md` step 8 — and `playwright.config.js` is a **patched** upstream file).

## 7. Ownership summary (from `overrides.json`)

**Ours (edit freely, sync never touches):** `overrides.json`, `scripts/sync-upstream/**`, `scripts/new-set/**`, `src/prototype-defaults*.js`, `src/server/prototype-sets/**`, `src/server/prototype-seed/**`, `src/server/sets-index/**`, `src/server/app/sets-index/**`, `src/server/app/sets/sample-journey/**`, `src/server/app/routes-sample-journey.js`, `fit/sets-chooser.fit.spec.js`, the four `.github/workflows/*.yml`, `PROTOTYPE.md`, plus whatever `new:set` appends.

**Patched (one deliberate change each; merge normally, conflicts possible):** `src/index.js`, `mode.js`, the four data-seam `index.js` files (records, address-book, countries, ports), `config.js`, `router.js`, `routes.test.js`, `co-residency.test.js`, `README.md`, `Dockerfile`, `package.json`, `package-lock.json`, `NOTICE`, `.gitignore`, `scripts/npm-version.js`, `playwright.config.js`.

**Upstream (everything else) — includes every data file a designer is most tempted to edit:** `STUB_BOOK`, the two reference-data JSON fixtures, `commodities/index.js`, `happy-path.json`, the stub records store, the whole `sets/high-risk-plants/**` tree and its recipe docs. The sync classifies paths with `scripts/sync-upstream/rules.js` (`deleted` → `ours` → everything else merges). Post-merge checks: `npm ci`, `lint`, `npm test`, `npm run test:fit` (the "every set boots" check).

## 8. Recent history on these seams (last 3 months, prototype repo)

2026-09-24/25 landed the whole designer layer in four commits: `feat: sync from plants-frontend weekly, by rule`, `feat: a chooser, seeded data and a scaffold for designers`, `refactor: sign in the way plants-frontend does; keep only the data stubbed` (the `isStubMode`/`isStubDataMode` split), `fix: seed example data on first visit, not at start-up` (the `adopt-known-journeys` plugin). Earlier September commits are all upstream plants-frontend work merged in (address-book picker, reference number prefix, lazy reference-data load, unused-service removal).

## 9. Gaps worth a skill, recipe or small tool

1. **No prototype-owned overlay for reference data or address book** — every extra party/port/country is either upstream work or an unrecorded edit the sync may clobber. A patched `stub.js` + `ours` JSON overlay is the minimal seam.
2. **Seeder only knows submit/amend** — `softDelete`, `copy`, `cancelAmend`, late, and multi-org examples are all reachable through real routes but not scripted.
3. **Seed fixtures are upstream** — a prototype-owned `prototype-seed/fixtures/` would let designers describe consignments without touching `happy-path.json`.
4. **`new:set` leaves the test matrix, seeder and description by hand** — three follow-ups a skill could do deterministically.
5. **Dashboard filters need a set-local records adapter** — a documented wrapper pattern over the upstream stub would make "add a filter" a recipe rather than a rewrite.
6. **Stub sign-in has one user** — `?organisationId=` is the only lever; the stub book ignores it. Per-org example data is not possible today without touching upstream `STUB_BOOK`.
