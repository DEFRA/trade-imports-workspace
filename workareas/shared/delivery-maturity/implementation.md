# Page maturity banner: implementation design

Proof of concept for the idea in [`ideation.md`](ideation.md), ticket EUDPA-698. Written 12 October 2026, first on `feat/NO_JIRA-design-release-2-1-combined` in all three frontends, then moved onto its own branches cut from `main` on 13 October 2026.

## Branches

The work lives on `feat/EUDPA-698-page-maturity-banner` in each of these repos, cut from `main`. Pull requests (13 October 2026): DEFRA/trade-imports-animals-frontend#409, DEFRA/trade-imports-plants-frontend#103, DEFRA/trade-imports-ins-frontend#54 and DEFRA/trade-imports-ins-tests#30.

| Repo | Branch | What is on it |
|---|---|---|
| `trade-imports-animals-frontend` | `feat/EUDPA-698-page-maturity-banner` | the banner, plus an adaptation commit for `main` |
| `trade-imports-plants-frontend` | `feat/EUDPA-698-page-maturity-banner` | the banner, no changes needed for `main` |
| `trade-imports-ins-frontend` | `feat/EUDPA-698-page-maturity-banner` | the banner, plus an adaptation commit for `main` |
| `trade-imports-ins-tests` | `feat/EUDPA-698-page-maturity-banner` | the regenerated animals origin of import visual baselines (macOS and Linux) |
| `trade-imports-workspace` | `feat/EUDPA-698-page-maturity-banner` | these docs and the screenshots |

- **The levels are now real (Sam, 13 October 2026).** The proof of concept's example levels are gone. See section 7 for the levels and section 10 for the other decisions. The screenshots in `screens/` still show the proof of concept's example levels; they show what each level looks like, not which page has it.
- **The INS lint commit is not part of it.** `ad0d83e`, which splits the dashboard fit spec for the function-length lint rule, is a Design Release fix. It stays on the combined branch and is not on any `feat/EUDPA-698-page-maturity-banner` branch.
- **The commit shas quoted in the sections below** (for example `526361c8`) are from the combined branch and no longer match. Read the five maturity-banner commits on each branch instead.
- **Tests repo.** On `main` the INS notification type spec and its page object do not exist, so the `.first()` locator scoping described below does not apply and is not on the branch. The animals origin baselines are named `origin-of-import-chromium-darwin.png` and `...-linux.png` on `main`, and both were regenerated (diff checked: the coloured level row only).
- **Proved on `main`'s code.** Unit tests, lint and format pass in all three frontends. The full Playwright suite (`npm run test:docker-compose`) against a `-d` stack with these branches and everything else on `main` passed: 289 passed, 2 flaky that recovered on retry, 0 failed, 7 skipped, run at 6 workers. At the default 16 workers the long animals submit journeys timed out under load (a browser session closed), and the same specs pass on their own and at 6 workers.

## Summary

- **What it does.** A page listed in ideation.md section 9 shows its maturity level inside the GOV.UK phase banner it already has. The page gets a coloured tag and one short line. A page not in the list shows the banner as it is today.
- **The service phase stays.** The grey "Alpha" tag and the feedback sentence do not change. The page level goes in a second phase banner row of its own, straight under it.
- **Where it lives.** One folder per frontend, `src/server/app/page-maturity/`. It holds the levels, the page list, the lookup, the banner snippet, its copy and its tests.
- **What else it touches.** 4 small changes per frontend, outside the folder:
  - 1 config entry;
  - 1 import and 1 spread line in the Nunjucks view context;
  - 1 `{% include %}` line in `shared/layout.njk`, straight after the Alpha banner;
  - 1 `@use` line in `src/client/stylesheets/components/_index.scss`, which pulls in the folder's `_banner.scss` (the level row colours).
- **Switch.** `pageMaturityBanner.enabled`, env var `PAGE_MATURITY_BANNER_ENABLED`, default `true`. When it is off, the view context and the rendered HTML are exactly what they are today.
- **Which pages are found.** By `request.route.path`, the hapi route pattern, such as `/live-animals/notifications/{journeyId}/origin`. Template mode is one rule: everything under `/live-animals/templates` is Exploring.
- **Effect on E2E tests.** No existing text assertion breaks. One visual baseline changes: `origin-of-import` (darwin and linux PNGs).
- **To remove it.** Delete one folder per frontend and undo 4 small edits. The checklist is at the end.

## 1. Where it lives, and why

### Decision: one folder per frontend, beside `shared/`

| Repo | Folder |
|---|---|
| trade-imports-animals-frontend | `src/server/app/page-maturity/` |
| trade-imports-plants-frontend | `src/server/app/page-maturity/` |
| trade-imports-ins-frontend | `src/server/app/page-maturity/` |

Why this place, judged on how easy it is to remove:

| Option | Removal cost | Verdict |
|---|---|---|
| A `level` on each feature's `page.js` | Edits in about 30 files, across sets, plus template-mode and INS pages that have no `page.js` | No. Scatters the idea. Sam ruled it out |
| Inside a feature folder | The idea is not a feature. Feature folders must follow the copy-convention tests, which expect `copy/` beside a `.njk` | No |
| Inside `shared/` as loose files | Mixed in with load-bearing chrome. Hard to see what belongs to the idea | No |
| **`src/server/app/page-maturity/`** | Delete the folder. Undo 4 small edits | **Yes** |

Why `src/server/app/` and not `src/server/common/`:

- Nunjucks already searches `src/server/app` in all three repos (`src/config/nunjucks/nunjucks.js`). So `{% include "page-maturity/banner.njk" %}` resolves with no config change.
- The copy-convention and copy-parity tests scan only feature folders (`sets/.../features` in animals and plants, `features/` in INS). They will not pick up this folder. So the folder tests its own Welsh parity (section 6).

### Why the Nunjucks view context, not `kit.base()` or `onPreResponse`

| Hook | Reaches every rendered page? | Edits | Verdict |
|---|---|---|---|
| `kit.base()` / `setlessBase()` | No. The dashboard, Manage templates, errors and other views build their own models | Several | No |
| An `onPreResponse` extension | Yes, but it would need its own plugin registration, and it would have to rewrite `response.source.context` | Plugin plus registration | No |
| **Vision's global `context(request)` in `src/config/nunjucks/context/context.js`** | Yes. Every `h.view` gets it, and it already has the request (it reads `request.path` for `homeUrl`) | 2 lines | **Yes** |

The context function spreads in `{ pageMaturity }` only when the switch is on and the route is listed. Otherwise it adds nothing. So the context tests that compare the whole object (`toEqual`) still pass. In those tests the mock request has no `route`.

## 2. How it works

```
request.route.path ──► pageLevelFor(routePath) ──► level id or undefined
                                                │
config pageMaturityBanner.enabled ──────────────┤
                                                ▼
           context.js: ...pageMaturityContext(request)
                                                ▼
     layout.njk, after the Alpha banner: {% include "page-maturity/banner.njk" %}
```

- `pageLevelFor(routePath)` looks for an exact match in `PAGE_LEVELS`. Then it looks for a section match in `SECTION_LEVELS`: the path equals the section, or starts with `section + '/'`. It returns a level id, or `undefined`.
- `pageMaturityContext(request)`:
  - returns `{}` when the switch is off;
  - returns `{}` when the response is the error page (`request.response.source.template` is `shared/error`);
  - returns `{}` when `request.route?.path` has no level;
  - otherwise returns `{ pageMaturity: { tag: { text, classes }, text, hiddenPrefix } }`.
- The GET and POST routes of a page share one `route.path`. So a page shown again after a validation error keeps its tag.
- An error page (404 or 500) keeps today's banner, even on a listed route. `errors.js` renders `shared/error` from `onPreResponse`, so `request.route.path` is still the listed route, for example a 404 for an unknown `{journeyId}` on Origin. The context therefore checks the template being rendered as well as the route.

## 3. Files to create (the same set in each frontend)

| File | Contents |
|---|---|
| `src/server/app/page-maturity/levels.js` | `LEVELS` (frozen ids: `exploring`, `detailing`, `agreed`, `readyForLive`) and `TAG_CLASSES` (level id to `govuk-tag--*` class) |
| `src/server/app/page-maturity/levels.test.js` | Checks every `TAG_CLASSES` value is a class the installed `govuk-frontend.min.css` styles |
| `src/server/app/page-maturity/page-levels.js` | `PAGE_LEVELS` (frozen map from route path to level id) and `SECTION_LEVELS` (frozen list of `{ section, level }`). This is the only file that differs between the repos |
| `src/server/app/page-maturity/page-maturity.js` | `pageLevelFor(routePath)` and `pageMaturityContext(request)`. JSDoc on both, following `docs/best-practices/doc-comments/jsdoc.md` |
| `src/server/app/page-maturity/banner.njk` | The banner line (section 5). It imports `govukTag` itself, because an included template does not inherit the layout's imports |
| `src/server/app/page-maturity/copy/copy.en.js` | `copy.hiddenPrefix`, `copy.levels.<id>.tag`, `copy.levels.<id>.text` |
| `src/server/app/page-maturity/copy/copy.cy.js` | The same shape. First line is the repos' existing marker: `// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.` |
| `src/server/app/page-maturity/copy/copy.test.js` | The Welsh parity checks (section 6) |
| `src/server/app/page-maturity/page-maturity.test.js` | Unit tests for the lookup and the context (section 6) |
| `src/server/app/page-maturity/banner.test.js` | Renders `shared/layout.njk` with the banner on and off (section 6) |
| `src/server/app/page-maturity/page-levels.test.js` | Checks that every listed route path is a real registered route (section 6) |

Copy is resolved with the repo's own `copyFor({ en, cy })` from `shared/copy.js`, the same way `kit.js` resolves `sharedCopy`. It defaults to English, because no repo picks a locale yet.

## 4. Hook points to edit (the same in each frontend)

| # | File | Change |
|---|---|---|
| 1 | `src/config/config.js` | Add a top-level key after `callCounts`: `pageMaturityBanner: { enabled: { doc: 'Show each page’s maturity level (Exploring, Detailing, Agreed, Ready for live) in the phase banner', format: STRICT_BOOLEAN, default: true, env: 'PAGE_MATURITY_BANNER_ENABLED' } }`. `STRICT_BOOLEAN` already exists in all three files (line 24 or 25) |
| 2 | `src/config/nunjucks/context/context.js` | Add `import { pageMaturityContext } from '../../../server/app/page-maturity/page-maturity.js'`. Add `...pageMaturityContext(request),` as the last entry of the returned object, in all three repos |
| 3 | `src/server/app/shared/layout.njk` | In `{% block beforeContent %}`, add `{% include "page-maturity/banner.njk" %}` on its own line straight after the existing `govukPhaseBanner` call and before the back link. The `phaseBannerHtml` line and the Alpha banner call do not change |
| 4 | `src/client/stylesheets/components/_index.scss` | Add `@use "../../../server/app/page-maturity/banner";` as the last line (after `@use "task-list";` in animals and plants, after the comment in INS). `application.scss` already does `@use "components"`, so the folder's `_banner.scss` is built into the one stylesheet entry, `application.scss`, with no webpack change |

The include is written `{% include %}`, not `{%- include %}`: with the `-` the newline after the Alpha banner call is stripped, and the layout output loses one blank line compared with before the banner work. `banner.njk` is written with trim markers throughout and wrapped in `{%- if pageMaturity -%}`, so with no `pageMaturity` it adds nothing. The result: when the banner is off, or the page is unlisted, the layout output is byte for byte what it was before the banner work. Checked in all three repos on 13 October 2026: the layout rendered in 3 contexts (signed in, signed out, signed in with a back link) at the commit before the banner work (animals `526361c8^`, plants `c6371aa^`, INS `eb4f095^`) and on the current branch gave identical output (`cmp`, no difference). `trimBlocks` and `lstripBlocks` are on in all three repos. The first attempt with `{%- include %}` was not identical: it lost one blank line per render.

No change to `copy.en.js` or `copy.cy.js` in `shared/`, to `kit.js`, to routes or to any feature.

## 5. Rendered design

### Layout

Today:

> **[Alpha]** This is a new service. Help us improve it and [give your feedback by email](#).

On a listed page:

> **[Alpha]** This is a new service. Help us improve it and [give your feedback by email](#).
> **[Exploring]** This page is an early idea. It may change a lot or be removed.

`banner.njk`:

```njk
{%- from "govuk/components/phase-banner/macro.njk" import govukPhaseBanner -%}
{%- if pageMaturity -%}
  {%- set pageMaturityTagHtml -%}
    <span class="govuk-visually-hidden">{{ pageMaturity.hiddenPrefix }} </span>{{ pageMaturity.tag.text }}<span class="govuk-visually-hidden">.</span>
  {%- endset -%}
  {{ govukPhaseBanner({
    classes: pageMaturity.classes,
    tag: { html: pageMaturityTagHtml, classes: pageMaturity.tag.classes },
    text: pageMaturity.text
  }) }}
{%- endif -%}
```

Why this design:

- **Keeps the service phase.** ideation.md section 5 says to keep the GOV.UK phase banner as it is, because it is service-level and assessed. The page level is added beside it, not instead of it.
- **Its own row, not inside the Alpha one.** The level is a second `govukPhaseBanner` straight after the Alpha one. Review of the first version (a `<br>` and a full-size tag inside the Alpha banner) found the level tag indented under the text, in the larger tag font, and sharing Alpha's rule. A banner of its own gives the level tag the same left edge and phase-banner tag size as Alpha, and its own bottom rule. The cost: a page with a level has 2 `.govuk-phase-banner` elements, so any locator for `.govuk-phase-banner` must be scoped (for example `.first()`).
- **GOV.UK Frontend plus one small SCSS file.** `govukPhaseBanner` and `govuk-visually-hidden` do the markup. The only custom CSS is `_banner.scss` in the folder (see "Level row colours" below). One modifier class per level goes on the banner through the macro's `classes` param. There are no inline styles and no spacing utilities.
- **Text, not colour alone.** The level name is in the tag, and a sentence says what it means. The hidden "This page’s status:" prefix sits inside the tag, before the level name, with a hidden full stop after it. A screen reader hears "This page’s status: Exploring. This page is an early idea…". The full stop is hidden because it would look odd on the tag.
- **No link and no "Back"** in the new copy. This keeps `base-page.ts`'s `linkBack` and the single feedback link (`banner.getByRole('link')`) working.

### Levels, tag colours and copy

Tag colours run from caution to settled. All three frontends install govuk-frontend 6.5.1. It has no `govuk-tag--light-blue` and marks `govuk-tag--turquoise` as deprecated (it renders teal), so Detailing is purple and Agreed is teal. `levels.test.js` fails if a class is not in the installed CSS.

| Level id | Tag (en) | Tag class | Line (en) |
|---|---|---|---|
| `exploring` | Exploring | `govuk-tag--orange` | This page is an early idea. It may change a lot or be removed. |
| `detailing` | Detailing | `govuk-tag--purple` | We’re keeping this page. We’re still working out the detail. |
| `agreed` | Agreed | `govuk-tag--teal` | Users and the business have agreed this page. Changes need a reason. |
| `readyForLive` | Ready for live | `govuk-tag--green` | This page is ready for live. |
| (hidden prefix) | | | This page’s status: |

Welsh (machine draft, needs a translator):

| Level id | Tag (cy) | Line (cy) |
|---|---|---|
| `exploring` | Archwilio | Syniad cynnar yw’r dudalen hon. Gall newid llawer neu gael ei dileu. |
| `detailing` | Manylu | Rydym yn cadw’r dudalen hon. Rydym yn dal i weithio ar y manylion. |
| `agreed` | Cytunwyd | Mae defnyddwyr a’r busnes wedi cytuno ar y dudalen hon. Mae angen rheswm dros newid. |
| `readyForLive` | Yn barod i fynd yn fyw | Mae’r dudalen hon yn barod i fynd yn fyw. |
| (hidden prefix) | | Statws y dudalen hon: |

How the Welsh is marked: all three repos put the line `// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.` at the top of every `copy.cy.js`. The new `copy.cy.js` starts with the same line. Pages are rendered in English today, through `copyFor`'s default, so the Welsh is not shown yet.

Every level is shown by at least one page in each frontend (section 7). The Agreed and Ready for live assignments are examples, not judgements: they are there so every state can be seen and tested, and they say nothing about how ready those pages really are. Change one line of `page-levels.js` to move a page.

### Level row colours

`src/server/app/page-maturity/_banner.scss` (the same file in all three repos). One modifier class per level, set on the level banner by `BANNER_CLASSES` in `levels.js`:

| Level id | Banner class | Row background (50% tint) | Tag (GOV.UK, 80% tint, text 50% shade) | Text on the row |
|---|---|---|---|---|
| `exploring` | `app-page-maturity--exploring` | orange `#fabb9c` | `govuk-tag--orange` | GOV.UK black `#0b0c0c` |
| `detailing` | `app-page-maturity--detailing` | purple `#aa98cf` | `govuk-tag--purple` | GOV.UK black `#0b0c0c` |
| `agreed` | `app-page-maturity--agreed` | teal `#8ac0c3` | `govuk-tag--teal` | GOV.UK black `#0b0c0c` |
| `readyForLive` | `app-page-maturity--ready-for-live` | green `#87bca8` | `govuk-tag--green` | GOV.UK black `#0b0c0c` |

- The colours come from `govuk-colour(<colour>, $variant: "tint-50")`. The tag keeps GOV.UK's own 80% tint, so it is lighter than the row and still stands out.
- Contrast is tested, not assumed: `levels.test.js` compiles `_banner.scss` and fails if the text colour against the row background is under 4.5:1 (WCAG AA, normal text). The tag's own colours are GOV.UK's.
- The row spans the width container plus 10px each side (full-bleed was not needed). A negative margin and matching padding of 10px (`govuk-spacing(2)`) do this, so the tag's left edge stays level with the Alpha tag above it. Measured in the browser: both tags start at x 160 and are 25px tall.
- The selector is `.govuk-width-container .govuk-phase-banner.app-page-maturity--<level>`. GOV.UK Frontend zeroes the margins of a `.govuk-phase-banner.govuk-width-container` inside a width container with that same selector, so a single class would lose.
- Built into the one stylesheet entry (`application.scss`) through `components/_index.scss`. Checked in the built CSS of all three repos (`npm run build:frontend`).

## 6. Tests

All tests use Vitest, sit in the folder, and follow `docs/best-practices/node/testing/frontend.md`: they assert on observable output, with cheerio for the DOM.

| File | Test (one `it` each) |
|---|---|
| `page-maturity.test.js` | `pageLevelFor`: an exact listed path returns its level (one per level used in the repo) |
| | `pageLevelFor`: an unlisted path returns `undefined` |
| | `pageLevelFor`: a path that only shares a prefix with a listed path (for example `/address-book/{id}`, or `.../origin-x`) returns `undefined` |
| | `pageLevelFor`: `undefined` or an empty path returns `undefined` |
| | Animals only: `/live-animals/templates`, `/live-animals/templates/new`, `/live-animals/templates/{journeyId}` and `/live-animals/templates/{journeyId}/transit-countries` all return `exploring` (the section rule wins over the page's own Detailing) |
| | `pageMaturityContext`: switch on and a listed route returns the tag text, the tag class, the line and the hidden prefix from `copy.en.js` |
| | `pageMaturityContext`: switch on and an unlisted route returns `{}` |
| | `pageMaturityContext`: switch off and a listed route returns `{}`. Set it with `config.set('pageMaturityBanner.enabled', false)` and restore it in `afterEach` |
| | `pageMaturityContext`: a request with no `route` returns `{}` |
| `banner.test.js` | Renders `shared/layout.njk` the way `shared/layout.test.js` does: same `nunjucksConfig` environment and `renderLayout` helper shape |
| | Off (no `pageMaturity`): the phase banner holds exactly one `.govuk-tag`, its text is exactly `Alpha This is a new service. Help us improve it and give your feedback by email.` (whitespace normalised), and `banner.njk` renders to an empty string. A one-off check during review also confirmed the whole layout renders byte for byte the same as the layout without the include, in all three repos |
| | Error page: animals and plants `server.inject` a 404 (unknown `{journeyId}` on Origin) and assert only the Alpha tag. All three unit-test `pageMaturityContext` with a `shared/error` response on a listed route |
| | On: there are two `.govuk-phase-banner` elements. The first is the unchanged Alpha row. The second holds one tag with the level's class and `govuk-phase-banner__content__tag`, then the hidden prefix and the line. The level row has no `<br>` and no `govuk-!-margin` classes |
| | On: the banners still have exactly one link between them, the feedback mailto |
| | On: the hidden prefix is inside the level tag, before the level name, and the level row has the level's modifier class (checked for every level); the Alpha row has none |
| `levels.test.js` | Every level has a tag colour, a banner modifier class and English copy; `_banner.scss` is compiled and each level row text colour has at least 4.5:1 contrast on its background |
| | On: the text `This is a new service. Help us improve it and give your feedback by email.` is still present, so the existing assertions keep passing |
| | End to end in process: build the real server, sign in, and `server.inject` one listed page. Copy the set-up from that page's existing controller test. Assert the level tag is in `.govuk-phase-banner`, then repeat with the switch off and assert it is gone. Pages: animals `GET /live-animals/templates` (`features/templates/controller.test.js`), plants `GET /high-risk-plants` (`features/dashboard/controller.test.js`), INS `GET /notification-type` (`features/notification-type/controller.test.js`) |
| `page-levels.test.js` | Every key of `PAGE_LEVELS`, and every `SECTION_LEVELS.section`, is a GET route in `server.table()` after `createServer()` and `initialize()`. This catches a typo or a renamed slug |
| | Every value is one of `LEVELS` |
| `copy/copy.test.js` | `cy` has the same leaf paths as `en` |
| | Every `cy` string leaf is non-empty and differs from its `en` leaf. This is the same rule as the repos' `copy-parity.test.js` |
| | There is one `levels` entry per `LEVELS` id |
| | The first line of `copy.cy.js` is the MACHINE-DRAFT marker |

Existing unit and fit tests checked against this design. None needs to change:

| File | Why it still passes |
|---|---|
| `shared/layout.test.js` (all 3 repos) | Renders with no `pageMaturity`. Asserts `govuk-tag--grey`, `Alpha` and the feedback sentence, which are all unchanged |
| `config/nunjucks/context/context.test.js` (all 3 repos) | The mock request has no `route`, so the spread adds nothing. The whole-object `toEqual` in animals and plants is unaffected |
| animals `features/dashboard/dashboard.fit.spec.js:418-449` | `getByText('Alpha', { exact: true })` still matches only the Alpha tag. `getByText(BODY)` is a substring match. The feedback link is unchanged. `/live-animals` is now Exploring |
| animals `features/templates/manage-templates.fit.spec.js:48-57` | The same reasons. `/live-animals/templates` is now Exploring |
| INS `features/notification-type/notification-type.fit.spec.js:82-95` | `toContainText('Alpha')` and the sentence are still present. There is still exactly one link in the banner |

Run each repo's full `npm test` and its fit suite. Any controller test that counts tags across the whole page would now see one more on a listed page. A grep found none, but only a full run proves it.

## 7. Route-to-level map

**Decided by Sam, 13 October 2026.** These are the real levels. They replace the proof of concept's examples, which put at least one page at every level.

| Frontend | Rule | Level |
|---|---|---|
| Animals | Notification list, `/live-animals` (exact page) | Exploring |
| Animals | Every page in the notification journey: section `/live-animals/notifications`. Covers the overview, every question page, the review (and the submitted view and amend review it serves), the declaration and the confirmation | Detailing |
| Plants | Every page: section `/` | Exploring |
| INS | Every page: section `/`. Covers the dashboard, What are you importing? and the address book pages | Exploring |

How a level is found (`pageLevelFor` in `page-maturity.js`, the same file in all three frontends):

- An exact entry in `PAGE_LEVELS` wins.
- Otherwise the first entry in `SECTION_LEVELS` that holds the route applies. A section holds its own path and every path beneath it (`section + '/'`). The section `/` holds every route.
- A route in no section, and not listed, has no level and shows only the Alpha banner. Today that is only animals routes outside `/live-animals` (sign-in and sign-out, for example).

Why sections, not a list of pages: a new page in a journey picks up its level without anyone remembering to add it. Moving one page up means adding it to `PAGE_LEVELS`, which wins over its section.

`page-levels.test.js` checks every `PAGE_LEVELS` key is a registered GET route, and every section holds at least one registered GET route. So a typo or a renamed slug fails the build.

Animals template mode (`/live-animals/templates/...`) is not on `main`. When Design Release 2.1 brings it, it sits outside `/live-animals/notifications` and so has no level until a rule is added for it.

Who sets a level: levels live in code (`page-levels.js`) and change through a reviewed pull request. ideation.md section 4 says who decides each move and on what evidence. The pull request records the decision.

### The proof of concept's example map (superseded)

Kept for the route verification it records. The levels in these tables are the old examples, not the real ones above.

How the paths were verified:

- **Set mount prefix.** `src/server/router.js` registers each set plugin with `routes: { prefix: LIVE_ANIMALS_BASE }` or `HIGH_RISK_PLANTS_BASE`. So `route.path` carries the prefix. A set's `/` becomes the bare prefix.
- **Route shapes.** `shared/paths.js` in each repo: `pageRoutePath(slug)` gives `/notifications/{journeyId}/<slug>`, and `hubRoutePath()` gives `/notifications/{journeyId}`.
- **Slugs.** From each feature's `page.js`.
- **Template mode.** `shared/template-mode.js` registers a twin of every journey route at `/templates/{journeyId}/<slug>`, and the overview twin at `/templates/{journeyId}`. Registered in `routes-live-animals.js:133-141`.
- **INS routes.** From `shared/paths.js` and the `kit.pageRoutes(...)` calls in each controller.

`page-levels.test.js` (section 6) re-checks every path against the live route table.

### Animals (`trade-imports-animals-frontend`)

`J` = `/live-animals/notifications/{journeyId}`

| Page | `route.path` key | Level |
|---|---|---|
| Notification list | `/live-animals` | exploring |
| Overview | `J` | exploring |
| Origin of the import | `J/origin` | exploring |
| What are you importing? | `J/commodities` | exploring |
| Main import reason | `J/import-reason` | exploring |
| Commodity details | `J/consignment-details` | exploring |
| Identification details | `J/commodities/identification` | exploring |
| Additional details | `J/additional-details` | exploring |
| Roles and addresses | `J/addresses` | exploring |
| CPH number | `J/cph-number` | exploring |
| Contact address | `J/consignment/contact/select` | exploring |
| Arrival details | `J/port-of-entry` | exploring |
| Transit countries | `J/transit-countries` | detailing |
| Transporters | `J/transporters` | exploring |
| Upload documents | `J/accompanying-documents` | exploring |
| Review your notification (also the submitted view and the amend review) | `J/notification-view` | exploring |
| Declaration | `J/declaration` | agreed |
| Import notification submitted | `J/confirmation` | readyForLive |

Section rule (`SECTION_LEVELS`):

| Section | Level | Covers |
|---|---|---|
| `/live-animals/templates` | exploring | Manage templates (`/live-animals/templates`), new template (`/templates/new`), Enter template name (`/templates/{journeyId}/name`), Template page (`/templates/{journeyId}`), Review your template (`/templates/{journeyId}/notification-view`, confirmed in the code), and every other template-mode twin |

Use template (`/templates/{journeyId}/use`) is a POST that redirects. It renders no page, so it shows no banner.

There are no template twins for these routes, because `TEMPLATE_MODE_EXCLUDED_SLUGS` (`sets/live-animals/journeys/linear/flow/template-mode.js`) leaves them out:

- `accompanying-documents`
- `declaration`
- `confirmation`
- `amend`, `cancel-amend`, `copy` and `delete`

The review (`notification-view`) does have a twin. The section rule covers whatever twins exist.

22 rows in ideation.md, as 18 exact paths and 1 section. Exploring 19, Detailing 1, Agreed 1, Ready for live 1.

### Plants (`trade-imports-plants-frontend`)

`J` = `/high-risk-plants/notifications/{journeyId}`

| Page | `route.path` key | Level |
|---|---|---|
| Notification list | `/high-risk-plants` | exploring |
| What are you importing? | `J/commodity-type` | exploring |
| Origin | `J/origin` | detailing |
| Arrival details | `J/arrival-details` | detailing |
| Consignment contact | `J/consignment/contact/select` | exploring |
| Check your answers (also the submitted view) | `J/notification-view` | exploring |
| Overview | `J` | detailing |
| Consignor picker | `J/consignors/select` | detailing |
| Declaration | `J/declaration` | agreed |
| Submitted page | `J/confirmation` | readyForLive |

No section rule. Plants has no template mode: its Templates link goes to the animals Manage templates page. Exploring 4, Detailing 4, Agreed 1, Ready for live 1.

ideation.md gives the plants Overview as `/live-animals/notifications/{id}`. That is a typo. The real route is `/high-risk-plants/notifications/{journeyId}`.

### INS (`trade-imports-ins-frontend`)

| Page | `route.path` key | Level |
|---|---|---|
| INS home | `/` | exploring |
| What are you importing? | `/notification-type` | exploring |
| What are you importing? (template mode) | `/notification-type/template` | readyForLive |
| Address book | `/address-book` | detailing |
| Add address | `/address-book/add` | agreed |

`/notification-type/template` is not in ideation.md. It is the same question asked while making a template, so it takes the templates' Exploring level. Remove the row if Sam disagrees.

The view, edit and delete address pages (`/address-book/{id}`, `/edit`, `/delete`) are not listed, so they keep today's banner.

INS: Exploring 2, Detailing 1, Agreed 1, Ready for live 1.

Total: 36 table rows covered, plus 1 extra INS row.

## 8. Tests-repo impact (`trade-imports-ins-tests`)

Searched for `phase-banner`, `phaseBanner`, `Alpha`, `Alffa`, `toHaveScreenshot` and `toMatchSnapshot`, and for short non-exact `getByText(...)` calls the new copy could collide with.

### Will change

| File | What changes | Action |
|---|---|---|
| `tests/animals/e2e/visual/origin-of-import.visual.spec.ts` | Origin is Detailing (it is in the animals notification journey), so the full-page screenshot gains the purple level row | Regenerated `origin-of-import-chromium-darwin.png` (host) and `origin-of-import-chromium-linux.png` (`bin/update-visual-baselines-linux.sh`) on 13 October 2026 against a stack started with `--branch feat/EUDPA-698-page-maturity-banner`. The diff is the level row only. DEFRA/trade-imports-ins-tests#30 |

### Checked and unchanged

| File:line | Assertion | Why it still passes |
|---|---|---|
| `tests/ins/e2e/features/notification-type/notification-type.spec.ts:110` | `type.phaseBanner` `toContainText('Alpha')` | The Alpha tag stays, in the same single banner |
| `.../notification-type.spec.ts:111` | `toContainText('This is a new service. Help us improve it and give your feedback by email.')` | The sentence is unchanged. The level line comes after it |
| `.../notification-type.spec.ts:112-114` | `phaseBanner.getByRole('link')` href is `mailto:` | Still exactly one link |
| `.../notification-type.spec.ts:143` | `.govuk-phase-banner` `toContainText('Alpha')` on animals Origin | Still one banner element, still contains Alpha |
| `tests/animals/e2e/features/templates/manage-templates.spec.ts:24` | `phaseBannerFeedbackLink` href | The link is unchanged |
| `page-objects/shared/base-page.ts:67` (`linkBack` with `exact: true`) | Back link resolves to one element | The new copy has no link and no "Back" |
| `page-objects/animals/dashboard-page.ts:151` | Draft cards filtered by `.govuk-tag` `Draft` | Scoped to the cards. The new tag is in the banner and is never "Draft" |
| Short `getByText('…')` calls (31 found) | Substring, ignoring case | None of the 31 strings appears in the new copy |

`getByText` calls that take a variable or a regex were not checked one by one. Run the full Playwright suite (`npm run test:docker-compose`, all four projects) against a stack built with `-d` from the three branches before merging.

## 9. How to rip it out

Do this in each of the three frontends.

1. Delete the folder: `git rm -r src/server/app/page-maturity`. This removes:
   - `levels.js`, `levels.test.js`
   - `page-levels.js`, `page-levels.test.js`
   - `page-maturity.js`, `page-maturity.test.js`
   - `banner.njk`, `banner.test.js`, `_banner.scss`
   - `copy/copy.en.js`, `copy/copy.cy.js`, `copy/copy.test.js`
2. `src/config/config.js`: delete the `pageMaturityBanner` block (8 lines). In INS it is the last key, so also put back the closing `}` of `tradeImportsPlantsFrontendUrl` with no trailing comma.
3. `src/config/nunjucks/context/context.js`: delete the `pageMaturityContext` import (in INS, also the blank line above it) and the `...pageMaturityContext(request)` line, then drop the trailing comma it added to the entry before it (`getAssetPath` in animals and plants, `crumb` in INS).
4. `src/server/app/shared/layout.njk`: delete the `{% include "page-maturity/banner.njk" %}` line, which sits on its own line straight after the `govukPhaseBanner` call and before the back link.
4a. `src/client/stylesheets/components/_index.scss`: delete the `@use "../../../server/app/page-maturity/banner";` line, the last line of the file. Until it is deleted the stylesheet build fails, because the file it points at is gone (so do this together with step 1). In INS the file is then just its first comment line again.
5. In `trade-imports-ins-tests`, regenerate the two `origin-of-import-chromium-*.png` baselines (darwin and linux) against a stack without the banner. They were regenerated for the banner in `fceb462` (DEFRA/trade-imports-ins-tests#30); reverting that commit only works if nothing else has changed them since.
6. If `PAGE_MATURITY_BANNER_ENABLED` was set in `cdp-app-config` or the workspace stack, remove it. That is Sam's change.
7. Check that nothing else refers to it: `git grep -n -i "page-maturity\|pageMaturity\|PAGE_MATURITY"` returns nothing.

Simplest route: `git revert` the merge (or squash) commit of each EUDPA-698 pull request listed under Branches.

Every file the proof of concept touches, per frontend:

- `src/server/app/page-maturity/**` (new)
- `src/config/config.js` (edited)
- `src/config/nunjucks/context/context.js` (edited)
- `src/server/app/shared/layout.njk` (edited)
- `src/client/stylesheets/components/_index.scss` (edited, one `@use` line)

In the tests repo, only the two Origin baseline PNGs change, once regenerated.

## 10. Decisions (Sam, 13 October 2026)

The open questions in EUDPA-698, settled:

| Question | Decision |
|---|---|
| Copy per level | Keep the proof of concept's copy (section 5) |
| Welsh | Keep the Welsh copy as it is, with the repos' usual MACHINE-DRAFT marker. No further work in this ticket |
| Code or config, and who sets a level | Code: `page-levels.js` in each frontend, changed through a reviewed pull request (section 7) |
| Production or non-production only | On everywhere, including prod: `default: true`. `PAGE_MATURITY_BANNER_ENABLED=false` turns it off in any environment. CDP sets `NODE_ENV=production` in every environment, so `!isProduction` would turn it off in dev and test too. If this changes, gate on CDP's `ENVIRONMENT` instead |
| Page levels | Section 7 |

Calls made earlier that still stand:

| Point | Call made | To change it |
|---|---|---|
| Show the level beside the service phase, or instead of it | Beside it, on a second line in the same banner | Pass `pageMaturity.tag` as the banner's `tag` instead. The Alpha assertions above would then fail |
| Tag colours | Orange, purple, teal, green (light blue does not exist in govuk-frontend 6; turquoise is deprecated) | One line each in `levels.js` |
| The Templates navigation item on every page | Not counted. It follows ideation.md: counting it would make every page Exploring | Add sections to `page-levels.js` |
| Copy wording | First draft, written to the GDS style guide | `copy/copy.en.js` and `copy/copy.cy.js` |
