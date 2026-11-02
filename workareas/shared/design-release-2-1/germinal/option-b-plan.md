# Option B: the germinal products set, and the URL sweep

## Summary

- **Germinal products becomes its own set**, `germinal-products` in the animals frontend at `/germinal-products`, built as one new theme in the last wave. Its pages are copies of the finished live-animals feature folders, plus the prototype's germinal differences.
- **7 rows move into the new theme, 11 rows lose a germinal half, 10 rows are new** (inc-173 to inc-182). No cross-service test-only row: the end-to-end proof sits in inc-177.
- **The animals backend stores the notification's category** (the critic's fix): the set passes it on create, the cross-set guard reads it, and INS takes it from the event.
- **The prototype decides look and feel only.** Of 127 URL and architecture findings, 12 are dropped, 52 keep their content without the prototype's URL or shape, 26 stand on a real constraint, and 37 were never architecture.
- **Two live rows change because of URLs:** inc-025 (rename to `arrival-details`) is dropped, and inc-031 loses its move to `upload-documents`.
- **4 open questions, each with a default:** germinal `typeCode` values, what goes to PIMS, a short window on `main`, and where germinal E2E specs live. The 3 decision-page questions (c-217, c-218, when an animal counts as identified) are still unanswered.
- **Next steps:** Sam approves `ruling-draft-2026-10-08.md`, it is saved to `sources/`, then the build tooling is prepared and DISTIL is relaunched as a re-distil.

## 1. How the critic's points were handled

| Critic point | Done | How |
|---|---|---|
| Split into foundation and journey themes | **Rejected** | Every copied page registers in the set's own `features/index.js`, `flow/` and `obligations/`. Two themes would touch the same paths, which SHAPE.md forbids. The gap on `main` between merges goes to Sam as question 3. |
| The skeleton has no hub | Accepted | inc-173 copies the hub, flow and task rows from their finished twins. inc-099 keeps only the germinal differences. |
| Theme `dependsOn` misses some themes | Accepted | `consignment-parties` and `address-book` are added. |
| Rows build in code another theme owns | Accepted | The backend template work stays in type-question rows. inc-181 is frontend only (the INS half stays in inc-150). INS `constants/` and `journey-registry.js` go to ins-dashboard (inc-130). inc-185 is dropped. |
| inc-130 relies on `typeCode`, which arrives later | Accepted | INS now reads the stored category. If the field is missing, the notification is live animals, so inc-130 needs nothing from the germinal theme. |
| The cross-set guard misfires without a category | Accepted | The backend stores the category (ruling claim 6). Live notifications keep "Germinal products" as a certified-for answer. The prototype offers it, so no question is needed. |
| Donor details take the prototype's data shape | Accepted | Where donor details live is the plan's choice, made from the real model (claim 8). |
| Temperature and donor fields have no place in GBN-AG | Accepted | Goes to Sam as question 2. |
| Requirements cited by two rows | Accepted | Claim 11 names the 18 requirements to split. |
| req-1092 still copies the prototype's routing | Accepted | Named in claim 18. |
| No rule for new-page URLs | Accepted | Claim 16: a new page takes the prototype's path when the real service has no path shape to follow. |
| inc-177 dependencies | Accepted | inc-174, inc-175 and inc-176 are added. |
| inc-173 dependency on the list | Accepted | inc-141 is added. |
| E2E runs where the change is made | Accepted | INS-side germinal work is in INS themes, proven in the `ins` project. |
| inc-185 is a test-only row | Accepted | Dropped. inc-177's E2E check proves submit → INS germinal list. |
| Questions need correcting | Accepted | GBN-AG and the list filter are already settled. The certified-for answer is settled by precedence. The schemas path is corrected. |

## 2. The germinal set

### Theme `germinal-products`

| Field | Value |
|---|---|
| title | The germinal products set: its pages copied from live animals, and the germinal notification's data |
| dependsOn | `type-question-and-templates`, `consignment-parties`, `address-book` (the other live themes come through these) |
| wave | 10, the last |

**Touches:**

- **frontend:**
  - `src/server/app/sets/germinal-products`
  - `src/server/app/routes-germinal-products.js`, `routes.js` and `router.js`
  - one new set-keyed seam file under `services/persistence/records/notification-mapper/`, plus `services/persistence/records/real/lifecycle/mutate.js` (not `mapper-a`)
  - `fit/germinal-products-journey.js`, `playwright.config.js`, `vitest.config.js`, `webpack.config.js` and `package.json`
- **backend:**
  - `notification/Species.java`, `Commodity.java` and `CommodityComplement.java`
  - the notification category field on the record and on the published event. The plan confirms that no other theme touches `Notification.java`.
  - `outbox/gbnag`
- **gateway:** `outbox/gbnag/TradeLineItem.java`, `ProductUnitQuantity.java` and `pims/gbnagv2`
- **schemas:** `schemas/profiles/imports/gb/pims`
- **tests:**
  - `page-objects/shared/sets.ts`
  - `page-objects/germinal-products`
  - `tests/animals/{e2e,a11y,security}/germinal-products`

No `insfrontend` touch.

**Boundary changes:**

- commodities-and-reason loses its backend touches.
- consignment-parties loses `journey-registry.js` to ins-dashboard.
- ins-dashboard gains `insfrontend:src/server/common/constants`, `journey-registry.js` and `perftests:src/k6` (for inc-129).

**Wave order:**

1. journey-foundation and reference-lists
2. origin-page, commodities-and-reason, arrival-and-transit and documents
3. transporters and identification-and-permanent-address
4. address-book
5. consignment-parties
6. overview-and-review
7. manage-notifications
8. ins-dashboard
9. type-question-and-templates
10. germinal-products

### Rows moved into the theme

| Row | From | Change under option B | Depends on |
|---|---|---|---|
| inc-016 | commodities-and-reason | The germinal commodity search: 15-item catalogue in `sets/germinal-products/services/commodities` and the germinal hint (req-069, req-093). The backend fills `typeCode` and `unitCode` on every trade line. Drop the open question, the cross-category filter and the shared-catalogue dependency. | inc-173, inc-012 to inc-015 |
| inc-017 | commodities-and-reason | The Commodity details copy: gross weight in kg (decimal) and packages per species, Temperature always asked, one row per commodity. The backend stores weight and temperature. Decimal kg and per-line gross weight go through the gateway, then schemas v0.3.0, then the backend. | inc-016, inc-011, inc-018 |
| inc-024 | commodities-and-reason | The import-reason copy: 2 reasons and 4 purposes. No additional-details folder. Drop the mixed and "outside the list" criteria and the redirect. | inc-016, inc-020 to inc-022 |
| inc-052 | identification | The identification copy: donor fields, all optional (c-042), then on to Arrival details. Storage comes from the real model (claim 8). Drop the "Number of animals otherwise" half. | inc-017, inc-045 to inc-049 |
| inc-053 | identification | Unchanged: date validation and the date picker. | inc-052, inc-050 |
| inc-099 | overview-and-review | The germinal hub differences only: the Packages/boxes and Kilograms cards, no Additional details task, transit following req-800. | inc-173, inc-017 |
| inc-105 | overview-and-review | The germinal check-answers differences: certified-for with no Change link, "Enter the number of packages for <species>". | inc-052, inc-104, inc-106 to inc-109 |

### Rows that lose a germinal half

| Row | Change |
|---|---|
| inc-012 | Takes the live halves of req-114 and req-126. Removes the 12 germinal lines from the live catalogue (req-092, restated). |
| inc-045, inc-047, inc-048, inc-049 | Drop their germinal clauses (req-201, req-203, req-234, req-248 and req-249). |
| inc-091, inc-096 | Do not add 05111000 or 05119985 to the live CPH exemption (req-574 and req-699 split, c-091 overruled). inc-091 drops its dependency on inc-016. |
| inc-098, inc-100, inc-106 | Their germinal notes and examples move to inc-099 and inc-105. |
| inc-125 | The packages total moves to inc-182. |
| inc-160 | Its germinal seeding moves to inc-180. |

### Rows in other themes that change for germinal

| Row | Change |
|---|---|
| inc-128 | The gate wording becomes three sections (req-971). |
| inc-130 | Reads the published category, otherwise live animals. Adds `SET_BASES.GERMINAL_PRODUCTS`, the `gbn-ag-germinal-products` address-book return entry, and card and action links chosen by category. Proven in the `ins` project. |
| inc-135 | The category filter. The live list excludes germinal (req-1093). |
| inc-141 | Takes back req-1736. Create new is a form POST to `/germinal-products/notifications`. Built with seeded read-model data. |
| inc-145 | blocked → todo. Depends on inc-134. |
| inc-172 | blocked → todo. Depends on inc-130 and inc-141. Packages = the sum of `itemQuantity`. The name is "Cattle, Semen". |
| inc-148 | Germinal is the second option and posts to `/germinal-products/notifications`. Proven by the form target. |
| inc-150 | Changing between live and germinal works as it does for plants. Nothing is cleared. |
| inc-154 | Template mode offers Live animals and Germinal products only, and germinal hands off to the germinal set. |
| inc-161 | The label comes from the template's stored type, and each card links to its own set. Drops the dependency on inc-016. |

### New rows

These ids are suggestions. The reconciler assigns the final ones. Each copied page cites one new requirement: "the germinal set has page X, matching its live twin as this programme builds it".

| Id | Title | Repos | Depends on |
|---|---|---|---|
| inc-173 | A germinal notification starts at `/germinal-products` and opens at its own origin page and hub | frontend, backend, tests | inc-001, inc-002, inc-010, inc-098, inc-100, inc-129, inc-141, inc-148 |
| inc-174 | Arrival details, transit countries and transporters are copied (the `port-of-entry` slug is kept) | frontend, tests | inc-030, inc-044, inc-074, inc-173 |
| inc-175 | Upload documents is copied (at `accompanying-documents`) | frontend, tests | inc-031, inc-036, inc-173 |
| inc-176 | Roles and addresses (no CPH, no permanent address), party pickers, address return and contact address are copied | frontend, tests | inc-080, inc-090, inc-095 to inc-097, inc-130, inc-173 |
| inc-177 | Declaration, submit, confirmation and the view header are copied. A germinal notification submits as GBN-AG and shows on the INS germinal list, never the live one | frontend, tests | inc-105, inc-110 to inc-117, inc-141, inc-145, inc-172, inc-174, inc-175, inc-176 |
| inc-178 | Amend, cancel amend, copy as new and notification actions are copied | frontend, tests | inc-120 to inc-124, inc-177 |
| inc-182 | Delete is copied. The Number row shows packages | frontend, tests | inc-125, inc-126, inc-178 |
| inc-179 | Germinal template mode on the germinal pages | frontend, tests | inc-154 to inc-159, inc-164, inc-165, inc-182 |
| inc-180 | Using a germinal template starts a germinal notification and seeds its temperature | frontend, tests | inc-160, inc-179 |
| inc-181 | Back from the germinal origin page returns to the type question. Another type goes to that service's start | frontend, tests | inc-150, inc-173 |

**inc-173 holds the shared set-up:**

- **The set itself:**
  - `set.js`, the gateway, and the `routes.js` barrel exporting both gateways
  - the `router.js` mount; `/` still goes to live animals
  - the 4 `germinalProducts*` cookies
  - config, the flow, and the obligations (origin, system, and misc with `animalsCertifiedFor` set by the system)
- **Pages:**
  - the hub, task rows and origin, copied from their finished twins
  - the dashboard folder, reduced to the set root (which redirects to the INS `/germinal-products` list) and create on POST
- **Data:**
  - the set-local records adapter creates the draft with category `germinal-products` and certified-for, without changing `create.js`
  - the backend category
  - the set-keyed mapper seam
  - the donor group under its own name
- **The cross-set guard.** The live half of the guard is a small new row in journey-foundation.
- **The test matrix:**
  - a Playwright path inside `animals`
  - a vitest exclude
  - `test:germinal-products`
  - a fit `BASE` seam
  - `sets.ts` gains `germinalProducts`
  - page objects take a base
  - the `openspec/specs/germinal-products/` prefix

**Not copied:** additional-details, cph-number and permanent-address.

### Before the germinal theme builds

These steps prepare the build tooling. None is a backlog row.

- Add a `germinal-products-frontend` target in `tools/journey-builder/targets.json`.
- Add a row to frontend-change's Targets table.
- Add the spec-catchup `SUITES.md` row.
- Add the `openspec/config.yaml` prefix.
- Add `GP-` codes in `AREAS.md`.
- Add a line in `e2e-domain-coverage.md`.

### Re-distil

1. Save the ruling and apply the `sources.json` edits (in the ruling draft).
2. Relaunch DISTIL with the same args. Every id is kept, todo and blocked rows are rewritten, and moved rows change theme.
3. Run `tim distil coverage`, `tim backlog check`, and then `tim backlog split` once every question is answered.

**Check after the re-distil:**

- `goalConflicts` is empty.
- c-007 (its germinal clause), c-059 and c-091 are overruled.
- c-159 covers the germinal set root, and its "as the prototype shows" and "/dashboard with a query" clauses are gone.
- inc-025 is dropped.
- No two themes' touches overlap.

## 3. URL and architecture findings

**Outcomes:**

- **Drop:** the requirement or row is out of scope.
- **Content:** the look and feel stays, without the prototype's URL or shape.
- **Constraint:** kept because of a real constraint or a DR1 judgement.
- **Not arch:** this was never architecture, so nothing changes.

| Id | Theme | Change | Content kept | Outcome | Reason |
|---|---|---|---|---|---|
| inc-004 / req-1403 | journey-foundation | Prototype's `action=review\|continue\|hub` field; dropping `?change=1` | Amend's Save and return / Save and continue / link; no cancel link | Content | The field values are the prototype's; the real `exit=hub` and `?change=1` stay. Remove the clause; reword the spec note. |
| inc-002 / req-1615 | journey-foundation | Sources cite `?from=hub` | Overview-opened pages return to overview | Not arch | Navigation order. Do not add `?from=hub`; change only the live flow's fallback. Remove AC 10 (contradicts AC 4). |
| inc-001 | journey-foundation | Reorders `RUN_STEPS`, drops CPH from the run | The DR2.1 opening-run order | Not arch | Question order. Keep `cph-number?return=addresses`. |
| req-149 | reference-lists | Needs an approved-for-animals attribute | One exit list for both selects | Constraint | A regulatory fact, settled by c-027 (DR1). |
| req-304 | reference-lists | Needs a port-type attribute | Airports first, then seaports A to Z | Not arch | List order; blocked on MDM. |
| inc-006 | reference-lists | None | Destination and exit list content | Not arch | List content only. |
| inc-007 | reference-lists | None | The DR2.1 port and transit lists | Not arch | List content, c-048. |
| inc-008 | reference-lists | None | The private transporter's country list | Not arch | List content; slug unchanged. |
| req-147 | reference-lists | None | The destination country list | Not arch | Existing `/countries`. |
| c-011 | origin-page | None; the route stays `origin` | The hint wording; Back follows where the user came from | Not arch | Copy and Back target only. |
| req-046 | origin-page | Clears the region code on No | "Not applicable" on review | Not arch | Behaviour on an existing field. |
| req-040 | origin-page | Live prefix, progressive enhancement | FR / NL with no submit | Not arch | Interaction. |
| req-034 | origin-page | A tighter completeness rule | "Complete" rule | Not arch | Inside the existing obligation. |
| req-058 | origin-page | Refreshes the existing baseline | The baseline image | Not arch | The real test name, not the prototype path. |
| inc-009 | origin-page | Type-ahead over a native select | All country-control criteria | Not arch | Component behaviour. |
| inc-016 | commodities-and-reason | Germinal inside live-animals, category entry | Hint, 15 commodities, page order | Content | Built in the germinal set. The backend category stays. |
| req-092 | commodities-and-reason | A shared filtered catalogue | Live offers no germinal; germinal only its own | Content | Restated per set. A clean-up of existing drafts is a possible one-off. |
| req-127 | commodities-and-reason | Entry "from its category" in live | Origin → commodities → reason; Back to the germinal list | Content | Built on the germinal set's own start. |
| inc-017 | commodities-and-reason | Germinal branch on the live page | Weight, packages, temperature, error order | Content | Germinal copy. The backend stores gross weight (c-022). |
| inc-024 | commodities-and-reason | Germinal branching on the live pages; redirect | 2 reasons, 4 purposes, no Additional details | Content | The germinal flow simply leaves the page out. |
| req-181 | commodities-and-reason | Redirect on the live route | No Additional details in germinal | Content | No live redirect is needed. |
| inc-014 | commodities-and-reason | A new fetch route | As-you-type results, announcements | Constraint | c-012: the catalogue is too big for the page. The germinal copy needs its own route. |
| inc-015 | commodities-and-reason | Flow reorder | Back and next targets | Not arch | Question order. |
| inc-021 | commodities-and-reason | Flow section membership | Page order, Back links | Not arch | Order; the regrouping is an implementation choice. |
| inc-018 | commodities-and-reason | None | Hard-stop errors | Not arch | Validation. |
| req-169 | commodities-and-reason | A mixed clause | The germinal reason list | Content | Remove the mixed clause (and req-170's). |
| req-124 | commodities-and-reason | Shared-page temperature logic | The Temperature radio | Content | Always asked in germinal. |
| req-114 | commodities-and-reason | A joint error order | Each set's own order | Content | Split per set. |
| req-126 | commodities-and-reason | A shared task branches | Each set's Complete rule | Content | Split per set. |
| inc-025 | arrival-and-transit | Renames `port-of-entry` to `arrival-details` | None | **Drop** | URL only. inc-026 to inc-029 drop the dependency. |
| req-271 | arrival-and-transit | Slug `arrival-details` | None | **Drop** | Adopted only for the address bar. |
| inc-031 | documents | Moves to `upload-documents` | Upload documents unlocks once origin is answered | Content | Keep req-544 at `accompanying-documents`; retitle. |
| req-477 | documents | Path segment `upload-documents` | None | **Drop** | URL only. |
| c-059 | documents | "Prototype wins" on the slug | None | **Drop** | Overruled; record the answer as `accompanying-documents`. |
| inc-044 | transporters | Removes `transporters/select` and its tests | None | Constraint | The page is dead and writes inconsistently. Reword the reason; list every reference. |
| inc-043 | transporters | None | Transporter list → documents | Not arch | Page order; may already be met on main. |
| inc-042 | transporters | A new address-lookup client, stubs, setting | The search widget | Constraint | c-178: real addresses. The setting defaults off; no cdp-app-config writes. |
| inc-039 | transporters | Redirect targets | Success banner, buttons, kept values | Not arch | Existing real pages. |
| inc-038 | transporters | Entry guard to `transporters/add` | Warning, legend, error | Not arch | Existing slug. |
| inc-037 | transporters | Fixture records, search haystack | The 8 DR2.1 transporters | Not arch | Content. Do not widen `privateTransporter` to save approval numbers. |
| inc-045 | identification | Back and next targets | Identification page order | Not arch | Order. The germinal exit is germinal-set work. |
| inc-046 | identification | View-model grouping | Species column, panels | Not arch | The model already holds a list of species. |
| inc-052 | identification | Germinal on the live page and record | Donor form, fields, heading | Content | Germinal copy; storage from the real model. |
| inc-053 | identification | Inherits inc-052's placement | Date picker, errors | Content | On the germinal copy. |
| inc-054 / req-727 | identification | A new permanent address page | Page content and gating | Content | Real slug in the `addresses` section, linked like CPH. |
| inc-054 / req-746 | identification | Copies the prototype's session shape | Choice reopens; POD address shown | Constraint | Persistence is real; copy or reference is the plan's. |
| inc-057 | identification | Removes the address block | The removals | Not arch | Moving a question is layout. |
| inc-057 AC4 | identification | Could imply a separate keyed map | Addresses survive identification edits | Constraint | No clobbering (p1-010); the shape is the plan's. |
| c-119 / c-044 | identification | Permanent address as its own page | As inc-054 and inc-057 | Not arch | Page choice only. |
| inc-058 | identification | E2E walk | Cats-by-air walk | Not arch | Real hub row title. |
| inc-061 | address-book | Form to `/add/lookup`; type step on `/add` | The type step and its content | Content | Keep the form at `/address-book/add` (the handshake lands there). |
| inc-067 | address-book | `?category=` slugs | Four tabs, defaults, columns | Content | The INS service names its parameter. |
| inc-067 to inc-069 API | address-book | Category and type filters in the API | Filters across the whole category | Constraint | The book is paged on the server (c-169). |
| req-1121 / inc-068, inc-069 | address-book | Renames `q` to `search` | Live filtering, pagination | Content | `q` stays. |
| inc-070 | address-book | Literal `?category=origin-and-consignor` redirect | Lands on the type's tab | Content | As inc-067. |
| inc-071 | address-book | Literal landing URLs | Search, manual entry, landing tab | Content | As inc-067. |
| inc-059 / c-176 | address-book | A `uses` field on the record | Uses question, tabs, Type column | Constraint | A kept answer persists; the service designs the field. |
| inc-079 / req-659 | address-book | Saves the role and uses | The uses question | Constraint | As inc-059; no prototype value names. |
| inc-074, inc-075 | address-book | Transporters in the address book; cross-service hop | Type option, transporter pages, Transporter tab | Content | Record ownership follows the real services. |
| inc-076 / req-394 | address-book | View details into INS | View details link and round trip | Content | The destination follows record ownership. |
| inc-066 / inc-073 / c-170 | address-book | A `return` parameter | Back and Cancel return to the origin page | Content | The allow-list stays; the parameter name is the service's. |
| inc-080 / c-106 | address-book | None | Button copy and destinations | Not arch | Already decided against the prototype. |
| req-775 | consignment-parties | Retires `consignment/contact/edit` | No edit link on the contact page | Content | The route stays; it is also used from review. Cut the clause in inc-094 AC 4. |
| req-574 | consignment-parties | Germinal codes in the live CPH exemption | Germinal never asked CPH; wider live list | Content | The germinal set has no CPH page. |
| inc-087 | consignment-parties | Roles on address records | Role-filtered pickers | Constraint | DR1 asked for it (c-121); designed as a backend decision that reverses cv-044. |
| inc-095 | consignment-parties | Branch-only contact; type on the handshake | The add-branch sentence, banner | Constraint | DR1 agrees (c-121); extends the real handshake. |
| inc-090 | consignment-parties | View link into INS | View link | Not arch | Component choice; return via the registry. |
| inc-091 | consignment-parties | CPH out of the run | Addresses → contact → review | Not arch | Flow; slugs unchanged. |
| req-564 | consignment-parties | Label only | "Consignor" | Not arch | Route protected. |
| c-112 | consignment-parties | None | 12/345/6789 display | Not arch | Nine digits stored. |
| req-580 | consignment-parties | List moved inside the form | Same-as buttons | Not arch | Markup for no-JS. |
| inc-111 / req-899 | overview-and-review | View Back to the INS dashboard | Back link for every status | Constraint | DR1 (c-143). The config always has a default, so the fallback is dead; apply only to the view. |
| inc-115 / req-934 | overview-and-review | Return link to the INS dashboard | Link text and wording | Constraint | As above. |
| inc-115 / req-935 | overview-and-review | A GET "create start page" | "Create a new notification" as a link | Content | Keep the POST create or a real GET target. |
| inc-111 header | overview-and-review | Keyed on "opened from the dashboard" | The whole header | Content | Key on the real route and status; no new route. |
| inc-111 AC5 / req-900 | overview-and-review | Draft rows to the view | The editable review content | Content | Drafts keep going to the hub. |
| inc-111 / req-911 | overview-and-review | Reference-keyed redirect | Unknown → overall dashboard | Content | On the real `journeyId` route. |
| inc-113 / req-909 | overview-and-review | The prototype's snapshot model | Action-required tag, warnings | Content | How it is stored is the real team's. |
| inc-116 / req-910 | overview-and-review | A completed status | The tag wording | Content | Blocked on a real source of completion. |
| inc-099, inc-105, inc-100, inc-106 | overview-and-review | Germinal branches in live | All the germinal hub and review content | Content | In the germinal set's copies. |
| c-189 | overview-and-review | GET links | Button looks | Constraint | POST with crumb. inc-112 uses a form. |
| inc-113 / c-144 | overview-and-review | None | Continue → hub | Constraint | Change via amendment. |
| inc-126 / c-198 | manage-notifications | Redirects to the INS dashboard | Front page, no banner | Constraint | The service split (DR1 p1-014), not "prototype outranks"; needs a fit-run rule. |
| inc-126 / req-1455 | manage-notifications | "No deleted marker" | The deleted message | Content | Drop the URL criterion. |
| inc-121 / req-1416 | manage-notifications | "No cancelled marker" | No banner | Content | Drop the URL clause. |
| inc-120 / c-190 | manage-notifications | A GET confirmation on the amend path | The dialog | Constraint | No-JS and POST with crumb. |
| inc-124 / req-1439 | manage-notifications | Fixes the stale-copy 404 | The banner | Constraint | A real bug. |
| inc-125 / req-1444 | manage-notifications | Germinal branch on the live delete page | Animals vs packages | Content | Packages go to inc-182. |
| inc-128 / req-1016 | ins-dashboard | A `/dashboard` redirect | None | **Drop** | Prototype URL; remove from inc-128 and c-159. |
| inc-129, inc-141 / req-1037, req-1092 | ins-dashboard | `create-notification?category=` | Button order, wording, category hand-off | Content | Link to the create start with the category. |
| inc-129 / c-159 | ins-dashboard | The list moves to INS | The list frame | Constraint | Rhys's DR1 judgement; strike "as the prototype shows". Perf-tests joins. |
| inc-141 / req-1092 | ins-dashboard | A `/germinal-products` INS list | The germinal list | Constraint | c-159. Takes back req-1736; set root redirect in inc-173. |
| inc-140 / req-1087 | ins-dashboard | Flash instead of query flag | The success banner | Content | Drop req-1087; carry `?deleted=1` on the redirect. |
| req-1342 / inc-157 | type-question | Template ids from titles | None | **Drop** | Id shape. |
| req-1366 / inc-160 | type-question | Template id on the notification | None | **Drop** | Prototype session variable. |
| req-1291 / inc-151, inc-153 | type-question | `/templates` path | The Manage templates page | Content | Path is the service's. |
| req-010 and creation reqs | type-question | `/templates/create` paths | Wording and Back destinations | Content | Name by page. |
| req-1303 and saved-template reqs | type-question | `/templates/<id>/...` scheme | View, delete, discard, change pages | Content | Name by page and section. |
| req-1338 / inc-156 | type-question | Prototype journey paths | Change opens the question pages | Content | Remove example paths. |
| req-1331, req-1356 | type-question | `?from=` markers | Task and Change links | Content | Real `?change=1`. |
| req-1323 and session reqs | type-question | Single session draft | Template mode looks | Content | The real service decides how it is held. |
| inc-150 / req-008 | type-question | Clearing the abandoned draft | Back to the type question, kept answers | Content | No cross-service write. |
| inc-163 / req-1341, req-1362 | type-question | An unlinked edit mode | None (moves to inc-159) | **Drop** | No link reaches it. |
| inc-158 AC8 / req-1355 | type-question | POST on the view page | None | **Drop** | Kit artefact. |
| inc-159 AC5 / req-1354 | type-question | Section allow-list | None | **Drop** | Follows the dropped URL scheme. |
| inc-158, 159, 160, 165 not-found | type-question | Lists prototype addresses | Missing templates go to Manage templates | Content | Reword by action. |
| inc-155, inc-164, inc-169 | type-question | URL guards in template mode | No documents or declaration | Content | Restate as a rule. |
| inc-161, inc-160 | type-question | Category from content; cross-type seeding | Card labels, seeding | Content | A template belongs to one set. |
| inc-148 AC6 / req-1314 | type-question | `#notificationType` | Error linked to the first radio | Content | The field name is the service's. |
| c-183, c-186 | type-question | Backend storage; separate parties | Every page design | Constraint | Persistence; cross-service. |
| inc-154 AC1 | type-question | All 5 types in template mode | Question copy | Constraint | Live and germinal only (claim 20). |
| c-007 | type-question | The type question in INS | Question copy | Not arch | Real split. Germinal is now offered. |
| inc-151 notes | type-question | Templates under live-animals | None | Not arch | Real architecture; germinal templates handled in inc-179. |
| req-119 / c-021 | type-question | `?change=1` | Return destinations | Not arch | Real mechanism. |
| req-963 / inc-149 | type-question | Create-notification route | Create new → type question | Not arch | No path asserted. |
| perf-tests | critic | Route moves break k6 | None | Constraint | perftests joins inc-129. |
| inc-145 / req-979 | critic | Stale blocker | The germinal home section | Content | Unblocked. |
| inc-172 / req-1736 to req-1738 | critic | Stale blocker | Germinal cards | Content | Unblocked. |
| req-1668 | critic | Germinal "not built here" | Plants etc. stay out | **Drop** | The germinal half is dropped. |
| Option-B wiring | critic | SET_BASES, registry, links, category | None | Constraint | Now inc-130 and inc-173. |
| req-972 / req-987 | critic | List address fixed at INS | View dashboard and Back links | Content | Point at wherever the list lives. |
| req-1479 | critic | Stops asserting markers | New copy and dialogs | Content | Keep the `?deleted=1` and `?cancelled=1` assertions. |
| sources.json goal | critic | "Changes to match" unqualified | The rest of the 7 Oct ruling | **Drop** | Replaced by the 8 Oct ruling. |
| c-214 | critic | Service name targets | Logo and service-name links | Constraint | Real targets. The germinal set links to `/germinal-products`. |
| c-213, c-039, c-022, c-047, c-066 | critic | None | DR2.1 labels and layout | Constraint | Precedents for the ruling. |
| inc-132 to inc-146 | critic | New INS drill-down paths | Drill-downs, cards, tabs | Not arch | New pages; claim 16. |
| c-125, inc-028, inc-034, inc-171, req-1394 | critic | Destinations and the removed card | All of it | Not arch | Navigation. The contact edit route is kept (see req-775). |

## 4. Refuted as architecture

| Id | Why it is not architecture |
|---|---|
| inc-029 / req-344 | Behaviour on the existing `transit-countries` slug. Drop the inc-025 dependency. |
| inc-028 / req-327, req-328 | Return to where the user came from, using the existing routes. Drop the inc-025 dependency. |
| c-047 | Already shows the prototype's labels and stores the real codes. |
| inc-026, inc-027, inc-030 | Copy, rendering and in-place add only. |
| req-544 / c-083 | When the task unlocks is journey flow. This is what is left of inc-031. |
| inc-034 | Destinations, using the existing change context. |
| inc-033, inc-032, inc-035, inc-036 | Validation, copy and a platform cap. |
| inc-064 / req-1164 | The edit route already exists. Only the button style changes. |
| inc-069 / req-1141 | Page size is a server setting. |
| inc-060 | Validation message wording. |
| inc-115 / req-927 | Redirects to the existing declaration page. |
| inc-108, inc-102 / req-867, req-855 | The real return-to-review mechanism. |
| inc-108 anchors / c-134, c-135 | Fragment links on the real page. |
| inc-120 / req-1394 | Amend lands on the existing review page. |
| inc-121 / req-1414 | GET and POST already exist. Only the component changes. |
| inc-125 Back and No targets | Existing pages. |
| inc-123 / c-196, c-197 | Copy-mapper behaviour. |
| inc-122 | Tag copy and an existing confirmation page. |
| inc-132, inc-143, inc-144, inc-146 | New INS pages. No real route is renamed. |
| inc-128 / c-145 / req-951 | The route stays `/`. Content only. |
| inc-130, inc-131, inc-132, inc-135 read model | Fields needed to show kept content and meet real constraints. |
| inc-163 criterion 2 rewording | Superseded: the whole of inc-163 is dropped. |

## 5. Open questions for Sam

1. **Which GBN-AG `typeCode` does each germinal item send?** The catalogue has one "Embryos/Ova" item, but GBN-AG lists EMBRYO and OVA separately. Only LIVE_ANIMAL and EMBRYO appear in the schema samples.
   - *Default:* Semen sends SEMEN, and every Embryos/Ova item sends EMBRYO. inc-016 notes this as a contract to confirm with the schemas and PIMS owners.
2. **What does the germinal notification send to PIMS?** Temperature, donor name or ID, the collection and production dates, and the identification mark have no GBN-AG field. The gateway dead-letters unknown fields. A new profile, v0.3.0, also needs PIMS and Dynamics to accept it.
   - *Default:* v0.3.0 carries only the decimal kilogram quantity and each line's gross weight. The other fields are stored and shown in the service but not published, until the GBN-AG data dictionary has fields for them. Accepting v0.3.0 is confirmed with the PIMS owners before inc-017 merges.
3. **Is a short window on `main` acceptable, where the INS germinal list's Create new, the INS home's germinal section and the type question's Germinal option point at a set that is not built yet?** These land in waves 8 and 9, and the set lands in wave 10.
   - *Default:* yes. Nothing is released to traders until every theme has landed. The alternative, a separate foundation theme, would put two themes in the same files.
4. **Should the germinal E2E specs live in the existing `animals` Playwright project?**
   - *Default:* yes, under `tests/animals/{e2e,a11y,security}/germinal-products/`. A new project would need CDP Portal test-run changes (yours to make), four service workflows and both configs. INS-side germinal checks stay in the `ins` project.

**Still unanswered on the decision page** (placeholders in the ruling draft):

- **c-217: address search in each environment.** Default: the stub locally, the real lookup in CDP dev, and switched off elsewhere.
- **c-218: Northern Ireland transporter search.** Default: the same lookup filtered to BT postcodes, with stub data added.
- **When an animal counts as identified.** Default: one identifier is enough to submit, every identifier is needed for Complete, and missing ones are flagged.
