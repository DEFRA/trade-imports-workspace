# Frontend alignment: proposal to merge

This proposes merging the four pull requests that bring the trade imports
frontends into one shape: ins
[#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27), animals
[#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339),
plants [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69)
and tests
[#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227), all on
`feat/NO_JIRA-frontend-alignment`, in one sitting: the three frontends
together, then the tests repo straight after, so the next `main` end-to-end
run sees four merged images rather than a mixed set (section 7). Sam ruled on
24 September 2026 that the branch is to merge. Each branch now has `main`
merged in (25 September 2026) and every check green: ins 7 of 7, animals 9 of
9, plants 9 of 9, tests 5 of 5 (section 6).

What merging changes for a trader: one sign-out URL across all three
services; the Address book navigation item works from animals and plants
instead of doing nothing; ins now shows a 503 page rather than an empty list
or a 500 error if reference data is unavailable; nothing else a trader sees
changes. For developers: the three frontends share one tree shape, one auth
chassis, byte-equal shared files, one tooling set, relative imports and
webpack — section 1 lists the rest. Section 4 lists what is still yours to
decide. The four pull requests' titles still read "Design proposal: align
the frontends (do not merge)"; their titles and bodies are rewritten
separately, and the drafts stay drafts until you lift them.

## 1. What merging changes

| Change | Services | Against main |
| --- | --- | --- |
| `/signout` is gone; `/auth/sign-out` is the one sign-out URL, in real and stub mode. It drops the local session before the provider round trip, and `/auth/sign-out-oidc` without a session lands on `/`. (The admin portal keeps its own `/signout`; not part of this change.) | ins, animals, plants | new |
| Development session cookies: plants mints `plants-sid`; ins keeps `ins-sid` (and `ins-session`) as it already did on main; animals keeps `sid`; every deployed environment keeps `sid`. The name is the shared `auth.cookieName` key, overridable with `AUTH_SESSION_COOKIE_NAME`. | plants, animals, ins | plants new; animals new key, same name; ins carried |
| `form-action` widens to named sibling origins: animals and plants from `'self'` alone to `'self'` plus the configured ins origin; ins from `'self'` plus animals to `'self'` plus animals and plants. Each list comes from that service's own `siblingFrontendBaseUrls`. | animals, plants, ins | new |
| Countries load once per process, on first read, and are kept until the service restarts, where on main ins fetched them on every request. A reference-data outage or an empty list now shows the 503 page on the dashboard, address book, add form and a stored address. (animals and plants already loaded on first read on main.) | ins | new |
| The Address book navigation item in animals and plants goes to ins's `/address-book` (default `http://localhost:3002/address-book`) where on main it went nowhere (`#`). Crossing services asks the trader to sign in again, because each service keeps its own session. Needs the `cdp-app-config` entries in section 5 (ruling 28) before it works in a deployed environment. | animals, plants | new |
| The dev-only address lookup spike moved from `src/server/address-lookup-spike/` to `src/server/app/features/address-lookup-spike/`. Still served at `/address-lookup-spike`, still only when `cdpEnvironment` is `dev` or `local`, its gate now living in the spike's own folder (section 4). Its English copy is unchanged and a machine-drafted Welsh copy sits beside it. No user-visible change. | ins | carried and moved |
| Each journey serves its set on its own prefix (`/live-animals`, `/high-risk-plants`), as main already does. New on the branch: the set's routes and the `/` redirect register only when `auth.enabled` is true, so with `AUTH_ENABLED=false` a journey answers 404 on `/` and on every set page, serving only `/health` and static assets. `auth.enabled` defaults to `true`, so an environment that does not set it sees no change. | animals, plants | prefixes carried from main (EUDPA-619); the sign-in gate over them is new |
| Every render of ins's add-address form, the first view and each re-render after an error, carries `Cache-Control: no-store`, so the form is never served from the browser cache. | ins | carried from main (EUDPA-333), moved into the aligned add controller |
| ins's public URL surface loses `/about`. | ins | new |
| The 400 and 401 pages read "There is a problem with your request" and "You need to sign in to view this page" in all three services. | ins, animals, plants | new |
| Journey request logs no longer carry health probes or static-asset requests. | animals, plants | new |
| `STUB_MODE` replaces ins's two flags, `INS_MODE` and `AUTH_STUB_MODE`; a production guard now covers both the stub data path and the stub sign-in path, where before only sign-in was guarded. | ins | new |
| Stub sign-in is one handler behind `/auth/sign-in` and `/auth/stub-sign-in`, with a per-process random secret and no committed key, in all three services. | ins, animals, plants | new |
| The eleven env-backed boolean settings refuse any value that is not exactly `true` or `false` at start-up, where a typo used to pass silently. | ins, animals, plants | new |
| ins and animals refuse to start against a malformed `TRADE_IMPORTS_ADDRESS_BOOK_URL` rather than failing later with a bare `TypeError`. | ins, animals | carried from main (EUDPA-333) |
| The journeys' sign-in error page now reads its copy from `sharedCopy`, the same deck ins uses. | animals, plants | new (EUDPA-619 merge) |
| ins's links into animals carry the `/live-animals` prefix. | ins | carried from main |
| A fresh clone of ins installs the pre-commit hook (`postinstall: npm run setup:husky`), and that hook no longer runs `npm audit` against a live advisory feed. | ins | new |
| The ten animals feature-group accessibility (axe) checks run plants' five WCAG tags, where they ran two before. | animals | new |
| Tests repo: a new cross-service sessions spec proves animals, ins and plants sessions survive together in one browser, each under its own cookie name (inc-011, `830e508`); the handshake and navigation specs now expect the trader to return under `/live-animals`. | tests | new |

**For developers.** All three frontends now share: one tree shape
(`page.controller.js` feature folders with a fit spec beside each
controller); relative imports, with no `#/` alias; webpack, not Vite; a
single `src/plugins/` and `src/server/router.js`; one tooling set (byte-equal
`eslint.config.js`, `.husky/pre-commit` and workflow files); `joi` and `sass`
declared as proper dependencies, not left implicit; and Playwright 1.63.0 in
all four repos, including the tests repo.

## 2. Differences we are keeping

Two are intended, from the 24 September rulings: animals keeps `sid` while
ins and plants take their own development cookie names, because animals'
`auth.cookieName` default carries no development branch and so needs no
entry in the tests fixture's cookie lookup (eudpa-333-handshake-qa finding
333-m1). Each service
names its own sibling origins in its own `siblingFrontendBaseUrls`, so the
CSP helper is one byte-equal file in all three and only the configured list
differs.

Three more stay by ruling: ins keeps its narrower countries reader, its full
MDM country list and its trace header rather than taking the journeys'
export-block filter (question 29, closed — see "Rulings applied"); each
service seeds its own stub data; and the auth controller and the shared
error helper each keep their own repo's EUDPA-619 shape (ins has no sets and
uses `base()` directly; animals and plants each resolve a set-free "chrome"
for `/auth/*` and unrouted paths) rather than being forced byte-equal.

### Decisions you may want to reverse

Each was taken by the direction rule (ins moves toward the journeys; plants
is the tidier fork) rather than on merit. The count says which two.

**Stub-mode collapse.** ins's two flags (`INS_MODE=stub` for the data
clients, `AUTH_STUB_MODE=true` for sign-in) became the journeys' single
`STUB_MODE`, two against one. Planner and implementor both recorded that two
flags was the better design: real Defra ID against stub data, or the real
address book behind a stub session, with the production guard on the risky
half. The one gain: `INS_MODE=stub` had no production guard and now does.
`cdp-app-config` sets none of the three variables for ins, so no environment
silently changed mode. To reverse: two flags in all three repos (`mode.js`,
`config.js`, the auth plugin, the Playwright env).

**Stub sign-in shape.** Ruled on 15 September to wait for real
authentication; reversed on 16 September and built with question 2: the
journeys' behaviour (one handler behind `/auth/sign-in` and
`/auth/stub-sign-in`, an unconditional encoded `redirectTo`, `contactId` and
`currentRelationshipId` on the session) with ins's per-process random secret
in all three, a stub-mode `GET /auth/sign-out`, and the `mode.js`
production-refusal comment rewritten in all three to say stub mode hands a
session to any caller with no identity provider involved. To reverse:
restore the stub-mode `redirectTo` branch in `plugins/auth.js` and one
`/auth/sign-in` route per service, in all three.

**Relative imports** replaced the `#/` alias (`package.json` `imports`), two
against one. The alias reads better in deep feature folders (controller
tests reach `src/auth` as `'../../../../../auth/...'`) but is one more thing
`vi.mock`, `vi.importActual`, Playwright's `node .` boot and SonarCloud's
rename detection must understand. To reverse: add the `imports` field to all
three and run one mechanical rewrite per repo.

**webpack, not Vite**, two against one. Vite's config was 39 lines against
178, but the stack, the Dockerfile and the `fit:start` scripts are built
around the journeys' pipeline, and the port removed `vitest-fetch-mock`,
whose `global.fetch` mock contradicted the network-boundary invariant. To
reverse: revert the one build-tooling commit on PR 27 and regenerate the
lockfile.

**Plugins location.** `src/server/plugins/` (the CDP template's layout)
became `src/plugins/{auth,csrf}.js`, `src/server/common/helpers/` and
`src/server/router.js`, two against one. Neither is more correct; a CDP
template upgrade applies more easily to a tree that still resembles it. To
reverse: 22 `git mv` calls per repo and an import rewrite.

**Client layout.** ins's custom `heading` and `service-header` components,
their SCSS, tests and renderer, and the `useTudorCrown` / `govukRebrand`
flags (absent from govuk-frontend 6) went, for plain `govuk-heading-*` and
the govuk template's default `headIcons`. Two against one, and also forced
by Design release 1, which has no service header or breadcrumbs. To
reverse: restore the deletions and diverge from DR1, which the journeys
already ship.

**Lighthouse.** Ruled in on 15 September and built as the fourteenth stage.

### Residual drift, re-measured 25 September

Re-measured with `diff -rq` over the checkouts under `repos/` at the HEADs
in the table in section 6, after `main` was merged into every branch.
Classes: identical; deliberate (a recorded decision says why); unexplained
(no question covers it yet, or the row says which one will).

**Animals against plants.** Byte-equal across `src/auth` (16 files),
`src/plugins` (4 files), `src/server/router.js` and its test,
`src/server/common/constants`, `src/server/common/helpers/logging`,
`src/server/common/services`, `src/server/common/test-helpers`,
`src/server/app/services/countries` and `src/server/app/lib/validate` except
the two files named below.

| File | Difference | Class |
| --- | --- | --- |
| `src/server/auth/controller.js`, `.test.js` | each repo resolves the sign-in error page's "chrome" its own way: animals through a named `unauthorisedChrome()` helper, plants inline as `serverWideBase()`; the test files differ only by page-title composition (animals `"… - Import notification service - GOV.UK"`, plants `"… \| Import notification service"`) | deliberate: EUDPA-619 as main has it in each repo; the title composition is parked (section 4) |
| `src/server/common/helpers/errors.js` | same split as the auth controller: animals resolves an `errorChrome()` from the request path through `setIdForPath`/`withSetContext`, plants calls `chromeFor(errorMessage, request.path)` directly | deliberate: EUDPA-619 as main has it in each repo |
| `src/server/common/helpers/errors.test.js` | only the page-title composition now differs (the reference-data 503 test that used to be plants-only is in both) | unexplained, no question yet: the title composition is parked (section 4) |
| `src/server/common/helpers/redis-client.test.js` | key prefix names the repo | deliberate, service-specific |
| `src/server/common/helpers/transport-routing.js`, `.test.js` | animals only | deliberate, journey-only |
| `src/server/app/lib/validate/calendar.js` | a comment's wording only | deliberate, comment wording |
| `src/server/app/lib/validate/validate.test.js` | animals carries an extra case for an empty commodity domain, exercising a rule plants' fixtures do not need | deliberate, journey-only test coverage |
| `src/server/app/lib/validate/persists-cleaned-value.test.js` | animals' field is `transportDocumentReference`, plants' `textFieldTwo`; animals' vitest setup installs the live-animals obligation manifest, where a neutral name is not a recognised answer key | deliberate, test fixture |
| `src/config/nunjucks/context/context.js` | a comment's wording only | deliberate, comment wording |
| `src/config/nunjucks/context/context.test.js` | service name | deliberate, service-specific |
| `src/config/config.js` | eleven hunks, all service-specific: port, service name, `defraId.serviceId`, the two redirect URLs, the `auth.cookieName` default (`'sid'` in animals, `isDevelopment ? 'plants-sid' : 'sid'` in plants), key prefix, the backend API block and animals' `tradeImportsAddressBookApi` | deliberate, service-specific |

**ins against the journeys.** Byte-equal across `src/auth/` except one file,
`src/plugins/auth.js` and its test, `src/server/auth/` (`index.js`,
`stub-sign-in.js` and both tests), `src/server/router.js`,
`src/server/common/constants/status-codes.js`,
`src/server/common/helpers/logging/`, `pulse.js`, `content-security-policy.js`
and its test, and `src/server/app/lib/validate/` except the journey-only
`persists-cleaned-value.test.js`.

| File | Difference | Class |
| --- | --- | --- |
| `src/auth/get-safe-redirect.js` | ins names the parse-only sentinel `parseBase`, with a four-line comment explaining why it exists; the journeys inline the literal | deliberate, comment policy (from ins main's EUDPA-618 Sonar fix) |
| `src/plugins/csrf.js`, `.test.js` | a comment's length; ins boots the real server and posts without a crumb, plants unit-tests the options | deliberate, test shape |
| `src/server/auth/controller.js` | ins calls `base()` directly, having no sets; animals calls its own `unauthorisedChrome()` helper, plants calls `serverWideBase()` inline | deliberate: ins has no sets, EUDPA-619 as main has it |
| `src/server/common/helpers/errors.js` | ins imports `base`; animals resolves an `errorChrome()` through `setIdForPath`/`withSetContext`, plants calls `chromeFor` directly | deliberate: ins has no sets |
| `src/server/common/helpers/errors.test.js` | byte-equal with plants; against animals only the page-title composition differs (`"… \| Import notification service"` against `"… - Import notification service - GOV.UK"`) | unexplained, no question yet: the title composition is parked (section 4) |
| `src/server/common/helpers/redis-client.test.js` | key prefix, two lines | deliberate, service-specific |
| `src/server/common/helpers/serve-static-files.test.js` | a four-line comment in ins | unexplained, no question yet |
| `src/server/common/constants/journey-set-bases.js`, `.test.js`, `src/server/common/helpers/set-base-url.js`, `.test.js` | ins only | deliberate, ins-only (main's EUDPA-619 link fix) |
| `src/server/common/test-helpers/{real-mode,test-server}.js`, `helpers/organisation-id.test.js` | ins only | deliberate |
| `src/server/common/{components/, helpers/actor-helpers.js, helpers/proxy/}` | journeys only | deliberate, journey-only |
| `src/server/common/helpers/transport-routing.js`, `.test.js` | animals only | deliberate, journey-only |
| `src/server/app/services/countries/` (`index.js`, `client.js`, `stub.js`) | the `ensureLoaded` mechanism is shared, but the reader differs: ins keeps `getCountries()` over the full MDM list with its own trace header; the journeys hold a label map filtered to the export block | deliberate: question 29, ruled 24 September (section 5) |
| `src/config/config.js` | service-specific values, including the development cookie-name defaults, which now share one key and one doc string and differ only in the default | deliberate, service-specific |
| `src/config/config.test.js` | each service's own ports, URLs and expected development cookie name | deliberate, test shape |
| `src/config/nunjucks/nunjucks.js` | ins registers `formatDate`/`formatCurrency` filters; the journeys add the MoJ root and `app/sets` where ins has `app/features` | deliberate |
| `src/config/nunjucks/context/context.js` | ins builds `addressBookUrl` from its own `addressBookPath()` and adds `dashboardUrl`/`crumb`; the journeys build it from `insAddressBookUrl()` over `tradeImportsInsFrontend.baseUrl` and add `staleActionRejected` | deliberate, service-specific |

## 3. How main came in

`origin/main` was merged into the branch in each repo — one `--no-ff`,
two-parent merge commit per repo — never replayed as individual commits onto
current `main`.

| Repo | Merge commit | Conflicts | Replay would have cost |
| --- | --- | --- | --- |
| tests | `7ac19fe` | 1 file / 1 hunk | 1 file / 1 hunk |
| plants | `a551000` | 6 files / 9 hunks | 7 files / 11 hunks across 4 of 12 commits |
| animals | `8bafd5ee` | 12 files / 21 hunks | 14 files / 22 hunks across 4 of 15 commits |
| ins | `3fd3aeb` | 31 files / 36 hunks (13 content conflicts, 18 files the branch moved and main edited) | conflicted on each of the first 3 commits (12 files); stopped there |

**Why merge, not replay:**
- The pull request's "Files changed" tab is the same either way, because
  GitHub diffs against the merge base, and after a merge that base is
  `main`'s tip: animals shows 100 files against current `main` whether merged
  or replayed, and plants shows 54. A replay only tidies the commit list.
- A replay cannot land on `feat/NO_JIRA-frontend-alignment` without a
  force-push, which is forbidden, so it needs a new branch name — and the
  cross-repo branch-parity rule means that new name in all four repos, with
  four new pull requests.
- A replay rewrites every commit SHA the sync ledger and this report cite
  (15 in animals, 12 in plants, 5 in tests) and loses the green CI already
  proven on each stage commit.
- A replay throws away merge work already done by hand, including ins's
  port of the EUDPA-333 address-add handshake into the aligned tree
  (`1446fcc`).

**Order.** Main was merged into each branch in this order: tests, plants,
animals, ins — plants first among the two journeys, as the smaller trial of
the EUDPA-619 pattern before animals took it.

**Follow-ups landed after the merges:** ins's spike wire-in (`f8c3454`),
ins's add-form controller (`eeb8fad`), plants' error-page tests (`1c8d665`),
the cross-repo end-to-end proof (`830e508`).

**Pre-aligns landed before the merges:** Playwright 1.63 in ins (`1268634`),
ins's SonarCloud config treating the Playwright suite as tests (`62e6a5b`),
animals' date-guard wording (`b830512c`).

## 4. Still yours to decide

Question 29 (should ins take the journeys' full countries reader and their
export-block filter) is closed: you ruled on 24 September 2026 that ins
keeps its own narrower reader; see "Rulings applied" below.

**Blocked on you:**
- May the four pull requests leave draft and be requested for review?
  Default: they stay drafts until you say so.

**Built as the default, reversible:**
- Is SonarCloud Automatic Analysis switched off for `trade-imports-ins-frontend`
  (Administration, Analysis Method)? Default, assumed and built: it is off;
  ins's `.sonarcloud.properties` was updated to match plants' for parity
  only, not as a live gate fix. Confirmed built: the file's header now
  explains when it is read, matching plants', rather than claiming a live
  gap.
- Should the address lookup spike's dev/local gate live in the spike's own
  folder, or on the shared run-mode service (at the cost of that file no
  longer matching animals and plants)? Default, built: in the spike's own
  folder — confirmed at `is-dev-or-local.js` inside
  `src/server/app/features/address-lookup-spike/`; the run-mode service
  stays identical across the three frontends.
- Is this the moment to reinstate ins's `#/` import alias, or do main's new
  files follow the branch's relative imports? Default, built: relative
  imports — confirmed, no `from '#/` import remains anywhere in ins's `src`.
- Should the dev-only spike page gain a Playwright fit spec? Default, built:
  no — confirmed, no fit spec sits beside the spike's controller.
- Should the tests fixture read each service's development cookie name from
  that service's own config, rather than a lookup in the fixture? Default,
  built: a small lookup in the fixture (`COMPOSE_AUTH_COOKIE_NAMES`),
  consulted for ins and plants; animals keeps the plain `sid` default —
  confirmed in `fixtures/auth-state.ts`.

**Parked, no question raised — left as they are:**
- `errorPage.forbidden` still reads "Forbidden".
- `@hapi/boom` is imported and undeclared in all three `package.json` files.
- Page titles are composed two ways: animals joins with hyphens and a
  GOV.UK suffix, ins and plants with a pipe.
- ins's `userSession.displayName` derives from `displayName || email`
  rather than `name`; no layout renders it, so nothing visible changes.
- The `run-mode.test.js` and `services/ports/index.js` hunks that differ
  between the two journeys (a made-up block-filter constant vs the real one;
  an extra `portOptions()` reader in plants).
- plants' date-guard comment wording (req-036).
- plants' pre-push SonarCloud quality gate (req-004).
- The `cdp-app-config` entries Sam applies by hand (the table under ruling
  28) and the `@compose` tag on the address-book navigation spec, which
  comes off once they land.

## 5. Rulings applied

**24 September 2026.** The branch is to merge. Adopt EUDPA-619 as it stands
in each repo and conform to it, never the reverse. The machine-drafted Welsh
stays, and any new Welsh copy file carries the same machine-drafted header.
These five repos are the only consumers of their own URLs, so no redirect or
deprecation is owed for a URL any of them drops. Question 29 is closed: ins
keeps its own countries reader, its full MDM list and its trace header, and
the two countries services stay different files.

1. **Dropped the ins session at sign-out initiation, as the journeys do.**
   Ruled 16 September 2026: yes. ins drops the local session at sign-out
   initiation, as the journeys do. Landed as `da05f1f` on
   [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27).
   `src/server/auth/controller.js` in ins took plants' three hunks verbatim:
   `signout` drops the cached session and clears the `sid` cookie before the
   redirect to the provider, `signoutOidc` sends an already-signed-out
   request to `/` instead of the provider, and `signin`'s unused parameter
   is `_request`. The file now differs from plants and animals by the one
   `{ profile }` log line that question 4 owns. Behaviour: an authenticated
   `GET /auth/sign-out` no longer leaves a session behind when Entra or the
   CDP WAF reject the provider round-trip, and an unauthenticated
   `GET /auth/sign-out-oidc` lands on `/`; `GET /signout` is unchanged in
   both states, because its required-mode session strategy redirects an
   unauthenticated request to sign-in before the handler runs. Tests in
   `src/server/auth/controller.test.js` and
   `src/server/signout/controller.test.js` prove the drop by a cache
   round-trip and the cookie by `set-cookie`, with no new module mock.

2. **Converged authentication on one shape across the three frontends.**
   Ruled 16 September 2026: one auth run: consistent authentication across
   the three, not better authentication; do not build real auth. Line
   things up so that when real auth is built there is one implementation to
   apply three times. Q2 yes, the journeys verify the token as ins does. Q3
   yes, ins sends `post_logout_redirect_uri` as the journeys do. Q4 yes, ins
   logs the CRN as the journeys do. Q6 yes, apply the two-line fix. Q7 yes,
   the strict format for every flag across all three. Q8 no preference,
   make it consistent. Q9 `auth.enabled` everywhere; a miss on the
   journeys. Q10 add the explicit session option to the journeys. Q11 the
   journeys are right to re-read the session from Redis; ins follows. Q24 a
   consistent, consolidated approach. The stub sign-in shape converges now,
   reversing the 15 September wait-for-real-auth ruling. Landed as
   `9e1ff60` on
   [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27),
   `828d7a55` on
   [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339),
   `791cfc0` on
   [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69) and
   `849558a` on
   [#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227),
   with two SonarCloud follow-ups per frontend (`5648dd3`, `f2f27246` and
   `3747bfe` the last of each) that kept every shared file byte-equal.
   Questions 2, 3, 4, 6, 7, 8, 9, 10, 11 and 24 and the stub sign-in shape
   closed together: `src/auth/` (16 files), `src/plugins/auth.js` and its
   test, `src/server/auth/` (`index.js`, `controller.js`,
   `stub-sign-in.js` and both tests), `src/server/router.js`,
   `src/server/common/services/mode.js` and its test, and the test helpers
   `mock-auth-config.js`, `mock-oidc-config.js` and `session-auth.js` were
   byte-equal across ins, animals and plants, proven with `diff -rq`; the
   EUDPA-619 merge later gave the journeys' `controller.js` and
   `errors.js` each repo's own set-free "chrome" helper (see Residual
   drift), so those two files now differ again for a recorded reason.
   `config.js` differs only by service-specific values and `context.js`
   only by the lines each service owns. The journeys took ins's `aud` and
   `iss` checks, its `auth.enabled` gate over every non-health route (with
   a new `router.test.js`) and `auth: 'session'` on `kit.routeOptions` (six
   animals controller tests that build a bare Hapi server gained
   `registerTestSessionAuth` in `src/server/app/engine/test-support.js` so
   the strategy registers); ins took the journeys' `post_logout_redirect_uri`,
   `{ crn }` log line, `https://placeholder`, `new TypeError`, awaited
   session read in `context.js` and split test helpers; all three took the
   strict-boolean convict format on eleven env-backed booleans (a typo is
   refused, pinned in `config.test.js`), one stub sign-in handler behind
   `/auth/sign-in` and `/auth/stub-sign-in` with a per-process random secret
   and no committed key, a stub-mode `GET /auth/sign-out`, and `routes.js`
   exporting `serviceRoutes`. Behaviour: ins's public URL surface loses
   `/signout`, `src/server/signout/` is deleted from all three, and
   `/auth/sign-out` is the one sign-out URL in every layout in both modes
   (real mode through `src/server/auth/controller.js`, stub mode through
   `stub-sign-in.js`, which drops the session and lands on `/`); in the
   tests repo `BasePage.linkSignOut` is the frontends' "Log out" link,
   `AdminDashboardPage` keeps the admin portal's "Sign out" at `/signout`
   and `SignOutPage.path` is `/auth/sign-out`, pinned by `auth.spec.ts`.
   ins's `userSession.displayName` now derives from `displayName || email`
   rather than `name` (plants' text verbatim); no layout renders it, so
   nothing visible changes, but real sessions carry `name`, not
   `displayName`, which is a candidate for a later ruling.

5. **Converged the chassis outside authentication: request logging,
   error-page copy, validators, names and the `joi` dependency.** Ruled 16
   September 2026: Q5 yes, the journeys align with ins. Q12 all three
   consistent and internationalisation handled one way. Q16 yes, validators
   consistent across all three. Q20 remove the dead code. Q22 yes, declare
   joi as a proper dependency. Q25 yes, adopt the journey names. Landed as
   `ed31dee` on
   [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27),
   `d6f15c56` on
   [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339)
   and `8c9e9f3` on
   [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69);
   both journey `main` branches moved while the stage was in CI, so each
   journey PR then took a second `main` merge (`8f5630b0`, `b5b6577`)
   before its checks could run. Questions 5, 12, 16, 20, 22 and 25 closed
   together: the journeys took ins's `ignoreFunc` in
   `src/server/common/helpers/logging/request-logger.js`, narrowed in all
   three to `/public`, `/public/*`, `/health` and `/favicon.ico` (ins's raw
   prefix also matched `/publications`) and pinned by a new byte-equal
   `request-logger.test.js`; ins's `helpers/errors.js` went to both
   journeys, reading every message from `sharedCopy.errorPage` in
   `copy.en.js` and `copy.cy.js` under the machine-draft Welsh header, and
   `errors.test.js` became one text that renders the EUDPA-575 503 page
   from a Boom route; `src/server/app/lib/validate/` took ins's text in
   both journeys (`requiredEmail`, and for animals also `requiredTime`,
   `requiredDateTextInRange`, the empty-allow-list guard in
   `requiredOneOf`, the four-digit-year guard in `parseDateText` and the
   `dateWithinBounds` name); ins took animals' `constants/status-codes.js`
   (`redirectFound`, `payloadTooLarge`, `serviceUnavailable`, with
   `statusCodes.redirect` renamed at seven test sites) and plants'
   `helpers/pulse.js` (`shutdownTimeoutMs`); `joi` is declared in all three
   `package.json` files at the version each lockfile already resolved
   (`17.13.8` in ins, `17.13.7` in the journeys); and plants' dead
   `test-helpers/component-helpers.js` is gone. The four test-shape files
   (`content-security-policy`, `redis-client`, `serve-static-files` and
   `start-server` tests) converged on plants' text, so
   `src/server/common/` is byte-equal across the three except the service
   key prefix in `redis-client.test.js`, and `lib/validate/` is byte-equal
   except the journey-only `persists-cleaned-value.test.js`, proven with
   `diff -rq`. Behaviour: journey request logs no longer carry health
   probes or static-asset requests; the 400 and 401 pages read "There is a
   problem with your request" and "You need to sign in to view this page"
   in all three, with Welsh drafted alongside; animals' validate lib gains
   the primitives above, none yet used by a feature; ins's lockfile,
   regenerated under the pinned npm, also lost about 26 unused
   `@esbuild/<platform>` optional entries and its Docker builds were green
   on the result. Left as the brief drew it and now candidates for a later
   ruling: `errorPage.forbidden` still reads "Forbidden", `@hapi/boom` is
   imported and undeclared in all three, and page titles are composed two
   ways (animals `main` joins with hyphens and a GOV.UK suffix, ins and
   plants with a pipe).

13. **Loaded reference data on first read in ins, as the journeys do.**
    Ruled 16 September 2026: yes. ins takes animals `main`'s EUDPA-575
    shape (commit `fb3615e3`, load reference data on first read, not at
    startup); proposed from the merge evidence and confirmed by Sam.
    Plants no longer needs the port: its `main` merged the same change as
    PR #71 (`77a5aa7`) on 16 September and the alignment branch took it
    when `main` was merged in again. Landed as `c44e554` on
    [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27).
    `src/server/app/services/countries/index.js` took plants' `ensureLoaded`
    body: a module-scope list and `loaded` flag, a stub-mode short-circuit,
    a failed load that leaves the flag false so the next read retries, and
    a rejection with `Boom.serverUnavailable` carrying `dataset: 'countries'`,
    which `catchAll` renders as the shared error page at 503. The reader
    stays ins's own `getCountries()`, and `client.js` and `stub.js` are
    untouched, so ins keeps its convict base URL, its trace header and the
    full MDM country list; the full journey reader surface is question 29,
    closed by the 24 September ruling above. The dashboard, list and add
    controllers let a Boom through to `catchAll` as `edit` already did, the
    three `.catch(() => [])` swallows went with `countryItemsOrNone`
    renamed `loadCountryItems`, and `address-countries.js` rejects the same
    way on an empty list. Tests mock at the network boundary with nock:
    `services/run-mode.test.js` replaces `countries/countries.test.js` and
    pins self-load on first read, fetch-once across readers, the retry
    after a failed load, the Boom payload and the stub short-circuit, and a
    new `features/reference-data-outage.test.js` proves the 503 page on the
    dashboard, the address book, the add form and a stored address.
    Behaviour: ins reads reference data once per process instead of once
    per request, so an upstream change to the list is picked up only on a
    restart; a reference-data outage now fails every page that reads
    countries as a 503 page, where before those pages rendered an empty
    country list or, on the add page, a recoverable-error banner at 500;
    and an empty MDM list rejects the same way, which the brief did not
    itself declare. While the stage was in CI, ins `main` gained EUDPA-333
    (the address-add handshake) and the conflict stopped GitHub running any
    checks, so `main` was merged in and the feature ported to the aligned
    tree (`1446fcc`, `ea2bfe6`, `a3dcb6d`); one of `main`'s tests was
    dropped, an add-page inline error for countries that fail to load,
    because that page now shows the 503 page and the failure stays covered
    by `address-countries.test.js` and `services/run-mode.test.js`. The
    tests repo took the same `main` merge (`29e9901`) for the ins
    session-cookie name the handshake work introduced. This report says ins
    only, correcting an earlier brief that said ins and plants both changed
    (animals and plants already loaded on first read on `main` before the
    fork).

14. **Took the journeys' feature-folder convention into ins, and made
    every feature folder self-contained with its own fit specs.** Ruled 16
    September 2026: Q14 go with the journey convention, `page.controller.js`;
    the journeys have a better approach to tests, especially the fit
    tests. Q15 the feature folder should be self-contained with its
    associated fit tests. The two journeys already agree on the
    convention, so the two-against-one count this page carried for
    `controller.js` was wrong: ins was the odd one out. Landed as
    `0a8b39a` on
    [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27) and
    `773a0975` on
    [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339),
    with one SonarCloud follow-up in animals (`c2680603`); plants changed
    nothing, because it is the reference. Questions 14 and 15 closed
    together: ins's five address-book page folders now hold
    `<page>.controller.js` and `<page>.controller.test.js` with
    `features/index.js` repointed and the five `template.njk` files
    untouched, and the dashboard, a single-page feature, keeps its spec
    beside its controller as `features/dashboard/dashboard.fit.spec.js`,
    no longer reaching across the feature boundary into
    `address-book/fit/address-form.js` but defining its own axe helper
    inline, as plants' single-page specs do. The group's axe helper left
    `address-form.js` for a new `address-book/fit/axe.js`, a
    byte-identical copy of plants' `commodities/fit/axe.js`, and animals
    took four more copies into `transport/`, `commodities/`, `addresses/`
    and `documents/` so every group spec calls its own group's helper;
    animals also renamed its eleven group page templates to `template.njk`,
    with the one `const view` line in each controller following, and the
    recipe docs in both repos (ins `architecture.md`, `features.md`,
    `testing.md`, `add-a-page.md`; animals `add-a-section.md`) now
    describe the new shape. Behaviour: the ten animals group axe
    assertions run plants' five WCAG tags where they ran two, and lose the
    private exemption four of them carried for `aria-allowed-attr` on
    govuk radios and checkboxes, which the suite is green without;
    `documents/fit/scan-status.fit.spec.js` gains the axe test it never
    had, so animals' fit count goes from 447 to 448, while ins keeps its
    50 specs and both unit suites are unchanged and ins's public URLs are
    untouched. Animals' SonarCloud gate then failed on new-code coverage
    and duplication over the four identical `axe.js` copies, which the
    ruling requires to stay duplicated rather than extracted, so
    `src/**/fit/axe.js` joined `sonar.coverage.exclusions` and
    `sonar.cpd.exclusions` alongside the copy bundles already listed
    there.

17. **Converged the tooling: the npm pin, the pre-commit hook, the audit
    level, the lint plugin, the workflows and the ins housekeeping.**
    Ruled 16 September 2026: Q17 and Q18 together. A non-Node developer
    did these; not convinced the solution was required, so step back,
    implement a nice succinct minimal solution and make it consistent
    across them all. Watch the ins pipeline and make sure it all works.
    Q21 yes, add the cleanup workflow. Q23 yes, take the plugin. Q26 yes,
    do the housekeeping. Landed as `1d3869c` on
    [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27),
    `1f619ab0` on
    [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339)
    and `e87afcc` on
    [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69),
    each with follow-ups described below. Questions 17, 18, 21, 23 and 26
    closed together. The npm pin was a workaround for one unstable
    lockfile: `sass` is an optional peer of `sass-loader`, a newer npm
    resolves it into the tree, and a lockfile written without a
    `node_modules/sass` entry is rejected with `Missing: sass@1.100.0 …
    from lock file`, so `sass` is now a declared devDependency in animals
    and plants as it already was in ins, both lockfiles were regenerated
    (`ec3e1dee`, `8a043ea`, under the npm 11.6.2 their `.nvmrc` Node
    bundles), and every step that installed a pinned npm globally is gone
    from `check-pull-request.yml`, `publish.yml`, `publish-hotfix.yml`,
    `lighthouse.yml` and both `Dockerfile` install stages in all three
    repos, leaving `engines` as the single statement about tool versions.
    `scripts/npm-version.js` and `package.json`'s `packageManager` field
    came back in a follow-up per repo (`f9c9bce`, `780ec235`, `bcc7166`)
    because `lighthouse.yml` is `workflow_run`-triggered, so GitHub runs
    `main`'s copy of it against this branch and `main`'s copy still calls
    the script: a branch cannot delete a file a `workflow_run` workflow on
    the default branch invokes, and the script's header says both go once
    this change reaches `main`. ins's `git:pre-commit-hook` dropped the
    audit and reads the journeys' `format:check && lint && test`, ins
    gained `postinstall: npm run setup:husky`, and `security-audit` runs
    at `high` in all three, ins reaching it with non-breaking `overrides`
    (`brace-expansion` `^5.0.9`, `tmp` `0.2.7`, `uuid` `11.1.1`, `minimatch`
    dropped) rather than an exclusion; ins also took animals'
    `cleanup-e2e-reports.yml` byte-for-byte and the journeys'
    `eslint.config.js` verbatim with `eslint-plugin-sonarjs`, whose 62
    findings were fixed in 22 files under `src/server/app/` by extracting
    named constants, splitting two oversized `describe` blocks and reading
    field lengths from `FIELD_RULES`, with no `eslint-disable` added and
    no rule dropped. The tooling files are now one shape, proven with
    `diff`: `publish-hotfix.yml`, `cleanup-e2e-reports.yml`,
    `eslint.config.js` and `.husky/pre-commit` are byte-equal,
    `publish.yml` differs only by `image-name`, `check-pull-request.yml`
    only by the `docker build` tag and the two Playwright project names in
    one comment, and the `Dockerfile` only by `PARENT_VERSION` and
    `ARG PORT`. Behaviour: a clone of ins now installs the pre-commit hook
    and that hook no longer runs `npm audit` against a live advisory feed;
    ins's `Dockerfile` declares `ARG PORT=3002`, the port the service
    listens on; ins's `gh-pages` gains the branch pruner; the Playwright
    artefact is `frontend-playwright-report` in all three; and animals' PR
    smoke build tags `trade-imports-animals-frontend` instead of the CDP
    template name it inherited.

19. **Withdrew the drift manifest and the `tim workspace drift` proposal.**
    Ruled 16 September 2026: no to the proposed tim workspace drift
    command and the surfaces manifest; that was scope creep by the initial
    agent. This is a one-shot get-the-frontends-in-sync piece of work;
    keeping things in line in future is not what we are working on now.
    Landed as `8a79e5da` on the workspace repo's own pull request, #47,
    since closed unmerged; the reference copy of that change reached
    workspace `main` as `0a601a77` (see "Where everything is").
    `workareas/shared/frontend-alignment/surfaces.json`, the draft manifest
    that named every shared chassis file and the rule it had to satisfy, is
    deleted; the command was never built, so there was no code to remove.
    This report lost question 19, the `### Tooling and dependencies`
    subsection it was the only row of, the closing sentence of Residual
    drift that proposed the command, and the manifest from the "Where
    everything is" bullet; `HANDOVER.md` lost the manifest bullet and two
    sentences that stated the drift check as the programme's goal and as
    the lesson of the s12 CI-fix drift; and the bullet in
    [`docs/analysis/frontend-alignment-workflow-run.md`](../../../docs/analysis/frontend-alignment-workflow-run.md)
    now records that lesson without naming a remedy. Behaviour: none,
    because no repo source changed and the only repository touched was the
    workspace. The Residual drift tables have since moved under section 2
    and been re-measured on 25 September, because main was merged into
    every branch after this ruling landed and drift is a live measurement,
    not a fixed record.

27. **Pulled `main` into the alignment branch and analysed what moved.**
    Ruled 16 September 2026: main has moved under these repos since the
    alignment was built; analyse the changes that have gone into the
    three frontends on main since the initial work and pull them in, as a
    dedicated item at the front of the queue. Question 27 (the workspace
    branch behind main) closes with it; question 13's countries evidence
    comes out of it. Landed as `9666f2d` on
    [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339)
    and `a2b8d48` on
    [#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227).
    Two `--no-ff` merges with no conflict: animals took ten `main` commits
    (62 files, the DR1 hub rework and EUDPA-575), tests took five (18
    files, the DR1 hub specs and the EUDPA-369 GBN-AG event assertions);
    ins and plants `main` had not moved, so nothing was merged there. The
    only chassis files `main` touched are animals'
    `src/server/common/constants/status-codes.js` (`serviceUnavailable: 503`)
    and `src/server/common/helpers/errors.test.js` (the 503 page); none of
    the sixteen alignment files in animals or the one in tests was among
    them. Behaviour, all from `main` by merge: animals loads countries and
    ports on first read instead of at boot, a failed load is a 503 page
    instead of a stopped pod, address country is stored as the ISO code,
    and the hub follows DR1 (sections, six relabelled rows, a locked
    review row, two-state status), with the E2E suite following it. The
    workspace branch was already level with its `main` and carried the
    Floci healthcheck fix, so nothing was merged in the workspace repo;
    PR 47's E2E was green from that point until the PR was later closed
    unmerged (see ruling 19).

28. **Made the Address book navigation item work in every service.**
    Ruled 16 September 2026: a backlog item to figure this out; it is not
    implemented properly anywhere. It might hit auth issues, which is
    fine, leave those if it does, but the links should work. Each repo has
    the address book link and it does not work. Implement it and see
    whether auth just works between the three, first in the compose
    stack, then in CDP. Work merged since the initial alignment may
    already add linking between the frontends and the address book; check
    that first. Landed as `affdce2d` on
    [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339),
    `acd27ad` on
    [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69),
    `c9c4fbf` on
    [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27),
    `2a2326f` on
    [#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227)
    and `5722cae2` on the workspace repo's own pull request, #47 (since
    closed unmerged — see ruling 19).
    Measuring first cut the stage down: ins's own item already worked,
    because `src/config/nunjucks/context/context.js` gave it
    `/address-book`, and animals already held
    `tradeImportsInsFrontend.baseUrl` from `main`'s EUDPA-333 handshake, so
    only animals and plants had a dead `#`. Both journeys now build
    `addressBookUrl` in `src/config/nunjucks/context/context.js` from a
    named `insAddressBookUrl()` that strips a trailing slash off that base
    URL, the `{% set addressBookUrl = "#" %}` line is gone from both
    `src/server/app/shared/layout.njk` files with only `manageAccountUrl`
    still a placeholder, and plants gained the `tradeImportsInsFrontend`
    convict block byte-equal with animals'; ins gained
    `tradeImportsPlantsFrontend.baseUrl`, whose one consumer is
    `src/server/common/helpers/content-security-policy.js`, where
    `form-action` now names both journey origins instead of animals' alone.
    All three `src/server/app/docs/services.md` files carry the same
    `## Configuration` table of convict key, env var and default, because
    no README in any of the three has an environment table, and
    `docker/stack/frontend.compose.yml` and `docker/stack/AGENTS.md` set
    and explain the browser-visible origins the stack needs. Behaviour:
    the Address book item in animals and plants leaves for
    `http://localhost:3002/address-book` by default where it did nothing
    before; ins gained no new link, because its dashboard rows and its
    "Start a new notification" button already reach animals, and the brief
    forbids a second mechanism; ins's new plants key changes nothing a
    user can see yet, because plants has no handshake. The answer to "does
    auth just work" is no: the compose stack gives each service its own
    session cookie, so crossing services signs the trader in again, and
    the new `tests/e2e/features/address-book-navigation.spec.ts` absorbs
    that second sign-in rather than hiding it, proving animals to the ins
    address book, on to the ins dashboard and back to animals. It is
    tagged `@compose` for a configuration reason, not a speed one: the
    deployed environments have no cross-service frontend URLs until Sam
    applies these `cdp-app-config` entries by hand, one set per
    environment, and the tag comes off in a follow-up once they land.

    | Service | Key | Value |
    | --- | --- | --- |
    | `trade-imports-animals-frontend` | `TRADE_IMPORTS_INS_FRONTEND_URL` | `https://trade-imports-ins-frontend.<env>.cdp-int.defra.cloud` |
    | `trade-imports-plants-frontend` | `TRADE_IMPORTS_INS_FRONTEND_URL` | `https://trade-imports-ins-frontend.<env>.cdp-int.defra.cloud` |
    | `trade-imports-ins-frontend` | `TRADE_IMPORTS_PLANTS_FRONTEND_URL` | `https://trade-imports-plants-frontend.<env>.cdp-int.defra.cloud` |
    | `trade-imports-ins-frontend` | `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` | `https://trade-imports-animals-frontend.<env>.cdp-int.defra.cloud`, but confirm before adding: ins's dashboard links already need it, so it may be set |

    These are the trader's browser following a link, so they are the
    public `cdp-int.defra.cloud` hostnames, not internal service names.

30. **Gave the journeys ins's cross-service shape: `form-action` and the
    session cookie name.** Ruled 16 September 2026: the journeys need the
    same shape, and do it as part of the address book work. Raised as open
    questions on the countries stage (`content-security-policy`
    `form-action`) and the tooling stage (the auth plugin test and its
    cookie-name config); the ruling landed after question 28 had built, so
    it completes that work rather than deferring to a later question.
    Landed as `831a64e` on
    [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27),
    `76a4f556` on
    [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339),
    `5c1ea18` on
    [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69)
    and `b4f43be` on
    [#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227).
    Each `src/config/config.js` now exports `siblingFrontendBaseUrls`, the
    list of sibling frontends that service can redirect to, and
    `src/server/common/helpers/content-security-policy.js` maps it to
    origins and spreads it into `form-action`, so the helper and its test
    are byte-equal across the three and a service with no sibling falls
    out of the same code as `['self']` alone; all three `config.js` files
    also gained the shared `auth.cookieName` key with the
    `AUTH_SESSION_COOKIE_NAME` env override and an identical doc string,
    `src/plugins/auth.js` reads it in all three, and
    `src/plugins/auth.test.js` asserts the configured value through a
    named constant instead of the `ins-sid` literal, which makes both
    plugin files byte-equal too. The service literals the rewritten CSP
    test gave up moved into each `src/config/config.test.js`, which is
    allowed to differ, and `fixtures/auth-state.ts` in the tests repo
    gained a `cookieName` for the plants target in the shape the ins entry
    already used. Behaviour: animals and plants now accept a form
    submission that redirects to the configured ins origin, where
    `form-action` was `['self']` alone and the browser blocked that 302;
    plants mints `plants-sid` in development so signing in to plants no
    longer overwrites an animals session on localhost, while animals keeps
    `sid` as the incumbent every fixture and page object assumes; and
    `tradeImportsInsFrontend.baseUrl` became `format: 'url'` in both
    journeys, so a malformed value is refused at startup with a readable
    message rather than a bare `TypeError` at import. One finding came out
    of the cross-repo E2E and is the plants confirmation feature's, not
    this programme's: a run at 23:50 UTC rendered the previous day's date
    on the plants confirmation page where the test expected the London
    day, which is worth an hour with the report artefact to say whether
    `submittedAt` is a full instant or a date-only value.

## 6. What was built

| Repo | PR | Head | Files changed | Checks |
| --- | --- | --- | --- | --- |
| `trade-imports-ins-frontend` | [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27) | draft, `eeb8fad` | 298 files (+22,743/−11,722) | 7 of 7 green: PR checks, security audit, FIT tests, SonarCloud, three publish jobs |
| `trade-imports-animals-frontend` | [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339) | draft, `8bafd5ee` | 103 files (+1,715/−733) | 9 of 9 green: PR checks, E2E, FIT tests, Lighthouse CI, security audit, SonarCloud, three publish jobs |
| `trade-imports-plants-frontend` | [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69) | draft, `1c8d665` | 59 files (+1,086/−452) | 9 of 9 green: PR checks, E2E, FIT tests, Lighthouse CI, security audit, SonarCloud, three publish jobs |
| `trade-imports-animals-tests` | [#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227) | draft, `830e508` | 10 files (+139/−31) | 5 of 5 green: PR checks, E2E, three publish jobs |

No shared package, no cross-repo import.

### ins, before and after

Before (`main`): the CDP template's tree. `src/server/plugins/` held every
Hapi plugin, `src/server/routes/{about,error,health,home}/` the pages,
`src/server/address-book/<page>/{index.js, controller.js, index.njk}` one
plugin per page, `common/clients/` the three clients with `__mocks__`, and
the client was built by Vite from `src/client/assets.html`.

After (`feat/NO_JIRA-frontend-alignment`):

```
src/auth/ (content unchanged)  src/client/ (webpack)  src/plugins/{auth, csrf}.js
src/config/{config.js, nunjucks/}
src/server/
  app/
    routes.js  copy-convention.test.js  copy-parity.test.js  auth/unauthorised.njk
    docs/{README, architecture, features, add-a-page, services, testing, lighthouse}.md
    lib/{http-client, http-status}.js  lib/validate/{index, run, validators, calendar}.js
    services/{address-book, countries, ins-backend}/{index, client, stub}.js
    shared/{kit, paths, copy, copy-leaves, copy.en, copy.cy}.js  {layout, error, error-summary}.njk
    features/index.js
    features/dashboard/{controller.js, template.njk, dashboard.fit.spec.js, copy/, view-model/}
    features/address-book/{list,add,edit,view,delete}/{<page>.controller.js, template.njk}
    features/address-book/{fields, address-countries, address-id-params, stored-address,
                            success-banner, handshake-context, journey-registry}.js
                           {copy/, view-model/, fit/}
    features/address-lookup-spike/{controller.js, template.njk, is-dev-or-local.js,
                                    detect-search-mode.js, map-to-address-fields.js, copy/}
  auth/  common/{constants/{status-codes.js, journey-set-bases.js}, helpers/{errors.js, set-base-url.js},
                 services/mode.js, test-helpers/}
  health/  router.js  server.js
fit/{sign-in.js, smoke.fit.spec.js}  scripts/{npm-version, check-workspace-stack}.js
scripts/lighthouse/  tests/lighthouse/  lighthouserc.cjs  .sonarcloud.properties
webpack.config.js  postcss.config.js  .dependency-cruiser.cjs
```

Unit suite: 49 files and 242 tests before, 61 files and 596 tests after.
Playwright: 49 specs before, 50 after (a smoke project plus the features).

### Backported to animals and plants

One identical commit in each journey, proven byte-equal with `diff`:
`get-safe-redirect.js` rejects protocol-relative, absolute, backslash and
CRLF targets and any non-string; `refresh-tokens.js` posts the client
secret and refresh token as a form body instead of a query string;
`plugins/auth.js` encodes the return target in `redirectTo` and returns
`isValid: false` when the refresh call rejects, instead of a 500;
`server/auth/controller.js` refuses a sign-in whose profile has no
`organisationId` and survives a `getPermissions` failure, before any
session is cached or cookie set; `config.js` applies the strict-boolean
convict format to `stubMode`. Animals also took plants' unauthorised page
into `sharedCopy`, so `server/auth/controller.js` was byte-equal across
animals and plants at that stage (the EUDPA-619 merge has since given each
its own set-free chrome helper — see Residual drift, section 2).

### Tests repository

Three changes: the ins security scan no longer visits `/about`; sign-out
follows the frontends' one URL (question 2): `BasePage.linkSignOut` is the
"Log out" link, `AdminDashboardPage` keeps the admin portal's "Sign out" at
`/signout`, and `SignOutPage.path` is `/auth/sign-out`, which `auth.spec.ts`
pins on the link before clicking it; and question 28 added
`tests/e2e/features/address-book-navigation.spec.ts`, with `requireBaseUrl`
exported and `linkAddressBook`, `linkDashboard` and
`completeSignInIfRequested` added to `BasePage`. Every other ins spec and
page object was audited against the aligned templates, copy and paths and
needed no change. Since then, inc-011 added a cross-service sessions spec
proving animals, ins and plants sessions survive together under their own
cookie names, and the handshake and navigation specs were tightened to
expect the return under `/live-animals`.

### Lighthouse harness for ins

The journeys' harness adapted to a service with no journey: the URL list
comes from the six registered routes, the seeder finds or creates one
address through the app's own pages, report names come from route paths.
Proven locally in stub mode on 15 September:

| Page | Performance | Accessibility | Best practices |
| --- | --- | --- | --- |
| `/` | 100 | 100 | 100 |
| `/address-book` | 100 | 100 | 100 |
| `/address-book/add` | 100 | 100 | 100 |
| `/address-book/{id}` | 100 | 100 | 100 |
| `/address-book/{id}/edit` | 100 | 100 | 100 |
| `/address-book/{id}/delete` | 100 | 100 | 100 |

## 7. Known caveats

- **The Welsh is machine-drafted.** Every `copy.cy.js` in ins and the
  `copy.unauthorised` block animals took from plants carry the header
  "MACHINE-DRAFT Welsh, not reviewed by a translator". `copy-parity.test.js`
  proves structure, not meaning. No locale toggle exists in any of the
  three services, so every `copyFor({ en, cy })` call resolves `en` and the
  Welsh is unreachable. A translator's review and a locale seam come before
  any Welsh release.
- **The Lighthouse CI job cannot fire on this branch.** `workflow_run`
  triggers read the default branch's workflow files; `lighthouse.yml`
  exists on the branch only. Before its report URL resolves, a repository
  admin must enable GitHub Pages from `gh-pages` on
  `DEFRA/trade-imports-ins-frontend` and accept that the job starts the
  whole stack, as the journeys' jobs do. The same mechanism cuts the other
  way in animals and plants: because `main`'s copy runs, a branch cannot
  delete a file a `workflow_run` workflow calls, which is why
  `scripts/npm-version.js` and `packageManager` stay in all three until
  this branch reaches `main`.
- **`sass` is a declared devDependency in all three.** npm installs it as
  an optional peer of `sass-loader` but leaves it out of the lockfile, so
  `npm ci --omit=dev` in the Docker build failed with
  `Missing: sass@1.100.0`. ins declared it during the Lighthouse stage;
  question 17's stage declared it in animals and plants too and
  regenerated both lockfiles, which is what let the npm pin go. A macOS
  `npm install` cannot see the failure and the local ladder cannot catch
  it; only `npm ci` and the Docker build in CI can.
- **SonarCloud is invisible to the local ladder.** ins runs Automatic
  Analysis, which reads `.sonarcloud.properties` (added on the branch,
  mirroring plants) and ignores `sonar-project.properties`. Nine ins CI
  fixes were Sonar findings the local ladder had passed.
- **The ins Playwright port collides with the running stack.** The fit
  suite and `serve-static-files.test.js` bind 3002, which the stack's ins
  container holds. Stop the stack or run it with `-e ins-frontend` first.
- **`main` E2E can briefly see a mixed set of images.** In the window
  between merging the three frontends and merging the tests repo, a `main`
  E2E run on one of the four repos can pick up three merged `:latest`
  images and one still-branch one. Re-run rather than investigate a run
  that starts in that window.

## 8. Where everything is

- Branch: `feat/NO_JIRA-frontend-alignment` in every repo below, the same
  name everywhere as the workspace's branch-parity rule requires.
- Pull requests: ins
  [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27),
  animals [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339),
  plants [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69),
  tests [#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227).
  The workspace repo's own
  [#47](https://github.com/DEFRA/trade-imports-workspace/pull/47) was closed
  unmerged; the reference copy of its one change reached workspace `main` as
  `0a601a77`.
- This report: `workareas/shared/frontend-alignment/report.md` in the
  workspace repo, on `main`.
- Stage state: [`stages.json`](stages.json) (twenty-four stages with
  status, commit, PRs, notes and open questions, all done); the
  twenty-three plans under [`plans/`](plans/); every agent's return value
  in `run-wf_a52aa0bf-91f.journal.jsonl`.
- The sync ledger that carried this branch to merge-ready:
  [`sync/backlog.json`](sync/backlog.json) (the fifteen sync rows and
  their status), [`sync/resolutions.json`](sync/resolutions.json),
  [`sync/plans/`](sync/plans/), [`sync/report.md`](sync/report.md) (the
  survey report) and [`sync/distil/direction.json`](sync/distil/direction.json).
- The run record, for reuse of the workflow:
  [`docs/analysis/frontend-alignment-workflow-run.md`](../../../docs/analysis/frontend-alignment-workflow-run.md).
- Working checkouts, all on the branch, under `repos/`: ins, animals,
  plants and tests, the programme's working checkouts again from question
  2's stage. The clones under `workareas/clones/` are retired.
- A plants stash still waits on `main` in
  `repos/trade-imports-plants-frontend`:
  `stash@{2}: On main: pre-alignment: uncommitted obligation-graph script +
  package.json script`. Pop it before working on plants `main` there.
