# Frontend alignment: the proposal as built

This is the document the team reads to decide whether the three Node
frontends should share one shape. Everything it describes has landed on
one branch, `feat/NO_JIRA-frontend-alignment`, behind three draft pull
requests that are never merged:

| Repo | Draft PR | Stages | Commits on the branch |
| --- | --- | --- | --- |
| `trade-imports-ins-frontend` | [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27) | s01 to s11 | 17 (11 stage commits, 6 CI fixes) |
| `trade-imports-animals-frontend` | [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339) | s12 | 2 (1 stage commit, 1 CI fix) |
| `trade-imports-plants-frontend` | [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69) | s12 | 2 (1 stage commit, 1 CI fix) |

Every PR is green: unit suite, lint, `format:check`, the Playwright
suite and the SonarCloud quality gate. The ins branch changes 238 files
(12,505 insertions, 7,058 deletions, most of it the lockfile). The two
journey branches change 16 and 10 files.

The programme's direction rule was: ins moves toward animals and
plants; where animals and plants differ, plants is the tidier fork;
journey-only layers (model, bridge, engine, flow, analysis, sets) are
never ported. No shared package was extracted and no repo imports from
another. Duplication is deliberate.

Sections:

1. [Why](#1-why)
2. [What changed in ins, stage by stage](#2-what-changed-in-ins-stage-by-stage)
3. [What was backported the other way](#3-what-was-backported-the-other-way)
4. [Decisions the team can reverse](#4-decisions-the-team-can-reverse)
5. [Residual drift after alignment](#5-residual-drift-after-alignment)
6. [The Welsh copy caveat](#6-the-welsh-copy-caveat)
7. [Open questions](#7-open-questions)
8. [Keeping the three aligned](#8-keeping-the-three-aligned)

---

## 1. Why

Three Node frontends serve the trade imports programme: the two journey
frontends (animals, plants) and the Import Notification Service front
door (ins). All three were cut from the same CDP template and all three
carry the same chassis: Defra ID sign-in through Bell, a Redis-backed
session cookie, token verification, refresh, safe redirects, CSRF, CSP,
logging, tracing, health and static files.

That chassis is the security-sensitive part of each service, and it had
drifted three ways:

- ins had hardened it and the journeys had not. ins rejected
  protocol-relative, absolute, backslash and CRLF redirect targets;
  the journeys only checked for a leading `/`. ins posted the refresh
  token and client secret as a form body; the journeys put them in the
  URL query string. ins encoded the return target in the cookie
  strategy's `redirectTo`; the journeys did not. ins refused a sign-in
  whose token carried no organisation and survived a permissions
  failure; the journeys minted an unscoped session or answered 500.
  ins refused `STUB_MODE=flase` at boot; the journeys coerced it to
  `true`.
- The journeys had hardened it and ins had not. The journeys drop the
  local session at sign-out initiation because the OIDC provider's
  round trip is not guaranteed; ins waits for the provider. The
  journeys pass `post_logout_redirect_uri` to the provider; ins does
  not. ins checks the token's audience and issuer; the journeys check
  only the signature.
- Beyond the chassis, the three layouts had nothing in common. ins
  kept the CDP template's `src/server/plugins/` and `src/server/routes/`
  folders, a `#/` import alias, two independent stub flags, a Vite
  client build, joi in the feature code and every user-facing string
  inline. The journeys had converged on `src/plugins/`,
  `src/server/common/helpers/`, relative imports, one `STUB_MODE`
  switch, webpack, a shared validation library and paired
  `copy.en.js` / `copy.cy.js` modules.

A fix to any one chassis file therefore had to be found, translated and
re-tested three times, and in practice it was not. The programme's
purpose was to demonstrate, on a branch nobody merges, what it takes to
bring ins into the journeys' shape and to carry the ins hardening back
the other way, so that the same file in the three repos is the same
file and a drift check can say when it stops being so.

---

## 2. What changed in ins, stage by stage

### The tree before and after

Before (`main`, commit `d26cd35`):

```
src/
  auth/                              token, refresh, redirect, permissions helpers
  client/                            Vite entry (assets.html), scripts, stylesheets
  config/{config.js, nunjucks/}      convict; Nunjucks env, context, filters, globals,
                                     build-navigation.js
  server/
    address-book/{list,add,edit,view,delete}/{index.js, controller.js, index.njk}
    address-book/{address-schema,address-countries,address-id-params}.js, fit/
    auth/{index.js, controller.js, stub-sign-in.js, unauthorised.njk}
    common/
      clients/{address-book,countries,ins-backend}-client{,.real,.stub}.js, __mocks__/
      components/{heading,service-header}/
      constants/{status-codes, session-keys, session-auth-route-options}.js
      helpers/{address-book-helper, pagination-helper, notification-dashboard-helper,
               require-organisation-id, session-helpers, validation-helpers, errors,
               redis-client, start-server, logging/logger, session-cache/cache-engine}.js
      services/mode.js               INS_MODE + AUTH_STUB_MODE
      templates/layouts/page.njk
      test-helpers/mock-auth.js
    plugins/{auth, csrf, router, content-security-policy, pulse, request-logger,
             request-tracing, serve-static-files, session-cache, logger-options}.js
    routes/{about, error, health, home}/
    signout/
    server.js
test-helpers/component-helpers.js
vite.config.js
```

After (`feat/NO_JIRA-frontend-alignment`, commit `b28a84b`):

```
src/
  auth/                              unchanged in content (s02 rewrote its imports)
  client/                            webpack entry; the components folder is gone
  config/{config.js, nunjucks/}      convict with stubMode; Nunjucks env, context, filters,
                                     globals (empty placeholder)
  plugins/{auth, csrf}.js
  server/
    app/
      routes.js                      one Hapi plugin: import-notification-service
      copy-convention.test.js, copy-parity.test.js
      auth/unauthorised.njk
      docs/{README, architecture, features, add-a-page, services, testing}.md
      lib/{http-client, http-status}.js, lib/validate/{index, run, validators, calendar}.js
      services/{address-book, countries, ins-backend}/{index, client, stub}.js
      shared/{kit, paths, copy, copy-leaves, copy.en, copy.cy}.js
      shared/{layout, error, error-summary}.njk
      features/index.js
      features/dashboard/{controller.js, template.njk, copy/, view-model/list.js, fit/}
      features/address-book/{list,add,edit,view,delete}/{controller.js, template.njk}
      features/address-book/{fields, address-countries, address-id-params,
                              stored-address, success-banner}.js
      features/address-book/{copy/, view-model/list.js, fit/}
    auth/{index.js, controller.js, stub-sign-in.js}
    common/
      constants/status-codes.js
      helpers/{content-security-policy, errors, organisation-id, pulse, redis-client,
               request-tracing, serve-static-files, start-server}.js
      helpers/logging/{logger, logger-options, request-logger}.js
      helpers/session-cache/{cache-engine, session-cache}.js
      services/mode.js               STUB_MODE
      test-helpers/{mock-auth, real-mode, test-server}.js
    health/, signout/, router.js, server.js
fit/{sign-in.js, smoke.fit.spec.js}
scripts/{npm-version, check-workspace-stack}.js
webpack.config.js, postcss.config.js, .dependency-cruiser.cjs
```

The public URL surface did not change: `/`, `/address-book`,
`/address-book/add`, `/address-book/{id}`, `/address-book/{id}/edit`,
`/address-book/{id}/delete`, `/auth/*`, `/signout` and `/health` are
pinned by `src/server/app/routes.test.js`, `shared/paths.test.js` and
50 Playwright specs. The one route removed is `/about`, the CDP
template's sample page (see the open questions for the ZAP spec that
still visits it).

The unit suite grew from 49 files and 242 tests to 55 files and 494
tests; the Playwright suite from 49 specs to 50. Every stage ended green
on `format:check`, `lint`, the unit suite and the Playwright suite, and
every stage's commit passed CI on the PR.

### s01: move the chassis into the animals layout

Commit `90ba82a`, CI fix `9411358`. Pure relocation: 22 files moved
with `git mv`, only import specifiers edited. `src/server/plugins/`
became `src/plugins/` (auth, csrf) and
`src/server/common/helpers/` (CSP, pulse, tracing, static files,
logging, session cache); `src/server/plugins/router.js` became
`src/server/router.js`; `routes/health` became `health/`; the
`about` page was deleted. Behaviour change: `GET /about` now 404s.

Decisions: moved files took plants' relative import form so that s02
had nothing to do in them (D1); unmoved files changed only the
disturbed specifiers (D2); no content alignment of any moved file
(D3/D4, catalogued in the plan for later); `router.js` kept ins's
`auth.enabled` gate over every non-health route (D5).

CI lesson: GitHub renders a moved-and-edited file as delete plus add,
so SonarCloud counted pre-existing duplication as new code and failed
the gate. The fix extracted `test-helpers/test-server.js` and a local
request builder in `plugins/auth.test.js`.

### s02: replace the `#/` import alias with relative paths

Commit `a62945d`. Mechanical: 158 specifiers in 57 files rewritten to
the shortest relative path, the `imports` field removed from
`package.json`. No behaviour change. `npm run test:fit` was the proof
that `node .` boots without the alias.

### s03: collapse `INS_MODE` and `AUTH_STUB_MODE` into `STUB_MODE`

Commit `794bd14`. `mode.js` and `mode.test.js` are the journeys' files
verbatim; `config.js` gains `stubMode` with ins's strict-boolean
format; the unit suite runs in stub mode by default, as the journeys'
do. Behaviour changes: the two flags are no longer read; stub data is
now refused in production (`runMode` had no environment guard); mixed
configurations (real Defra ID over stub data, or the reverse) are no
longer expressible.

The planner recorded, as the brief asked, that the two-flag split was
the better design and was given up for parity. Section 4 returns to
this.

### s04: reshape the clients into `app/services`

Commit `e1947de`, CI fix `f6405bf`. The three clients became
`services/{address-book,countries,ins-backend}/{index,client,stub}.js`
in animals' shape: `index.js` asks `isStubMode()` on every call,
`client.js` is HTTP only, `stub.js` is the canned data. The
`__mocks__` folders were deleted and every controller test rewritten
to boot the real server in real mode behind nock
(`test-helpers/real-mode.js`), which is invariant 8. Adopted from
animals' address-book client: a missing organisation id is refused
rather than requested as `/organisation/undefined`; the trace header is
read from `getTraceId()` inside the client. Kept from ins: the CRUD
methods, the stateful per-organisation stub with its `-empty` and
`-paginated` seeds, convict for the base URLs.

### s05: add `app/shared`, `app/routes.js` and the dashboard feature

Commit `d260ae5`. `kit.js` arrived with only the journey-free parts
(`base`, `errorSummary`, `fieldError`, `pageRoutes`,
`requireOrganisationId`); `paths.js` names every public URL;
`app/routes.js` is one Hapi plugin, `import-notification-service`,
that `router.js` registers in place of the per-page plugins. The home
route became `features/dashboard/`; the error page and the layout
moved under `app/shared/`; `require-organisation-id.js` became
animals' `organisation-id.js` verbatim; the Nunjucks roots became
`app` plus `app/features`.

Three deviations from the brief's wording, each reasoned: no
`recoverableSave()` (its predicate is journey persistence machinery);
no countries priming at boot (a reference-data outage would stop the
server starting); `pagination-helper.js` not moved (it would force a
cross-feature import or a copy that trips SonarCloud's duplication
gate).

### s06: move the address book into `app/features` with the group anatomy

Commit `2b523ec`, CI fixes `51f6399` and `b62ae00`. The address book
became `features/address-book/` in plants' multi-page group shape:
one folder per page holding `controller.js` and `template.njk`, every
controller exporting `routes` built by `kit.pageRoutes` from
`paths.js`, `features/index.js` spreading them into `allRoutes`. The
five per-page Hapi plugins went. The helpers s05 left in `common/`
folded into the feature: `success-banner.js`, `stored-address.js`,
`fields.js`, `view-model/list.js`. Every template href now comes from
the view model through `paths.js`; nothing outside `paths.js` writes
`/address-book`.

CI lessons: SonarCloud flagged an unused parameter, six magic numbers
and a function over 75 lines in the joi schema builder, all in the
feature's own new code.

### s07: move every string into `copy.en.js` and `copy.cy.js` pairs

Commit `8f9ea79`. Ported from plants: `copy.js` (`copyFor`),
`copy-leaves.js`, the shared chrome pair, and the two suite-wide
guards `copy-convention.test.js` and `copy-parity.test.js` (which live
at `src/server/app/` in both journeys; the programme's target tree
was corrected to say so). Each feature gained
`copy/{copy.en.js, copy.cy.js, copy.test.js}`. Every user-facing string
left the controllers, templates, `fields.js` and `errors.js`. The
English renders byte for byte as before; the Welsh is machine draft
(section 6). Decision D3 moved the error page's five messages into
`sharedCopy.errorPage`, which puts ins ahead of both journeys, whose
`errors.js` still hard-codes English.

### s08: replace joi with `app/lib/validate`

Commit `e2337fe`. Plants' fork of the lib copied verbatim (six files)
plus one primitive ins needed, `requiredEmail`, because the brief's
`pattern()` for the email would have let a blank address pass. The
address form is now one `addressRules(countryCodes)` composition;
errors flow as `{ field: message }` into `kit.errorSummary()` and
`shared/error-summary.njk`. `joi` is no longer a declared dependency
of ins, which is exactly the journeys' state: all three import it from
`lib/validate/validators.js` and resolve it hoisted through
`@hapi/bell` and `@hapi/catbox-redis`. Behaviour changes: an unlisted
country code is refused with `Enter a country` (the second message
`Select a country from the list` was deleted); the summary shows one
message per field.

### s09: adopt the Design release 1 layout

Commit `f97c721`. `layout.njk` is plants' file with five named
differences (section 5): service navigation with Dashboard, Address
book, Manage account and Log out; alpha phase banner; back link driven
by `kit.base`; no breadcrumbs; every string from `sharedCopy`. The
`heading` and `service-header` components, their SCSS, their tests,
`build-navigation.js` and `test-helpers/component-helpers.js` were
deleted. Plants' `SURFACES` / `surfaceClass` came into `kit.js`.
The four page-level "Something went wrong" error summaries became the
layout's `recoverableError` banner with ins's own wording, because
plants' "Your answers on this page have been saved" is false for every
ins case. The `<title>` now says `Import notification service`.

Eleven behaviour changes are named in the stage notes; nothing a fit
spec asserts changed. The implementor found one thing the plan missed:
the phase banner's "give your feedback by email" link matches a bare
`getByRole('link', { name: 'Back' })`, so three fit specs took
`exact: true`, which is what animals' specs already do.

### s10: align the build and dev tooling

Commit `9d1e58a`. Vite out, webpack in: `webpack.config.js`,
`postcss.config.js`, `scripts/npm-version.js`, `fit/sign-in.js` and
the Dockerfile's npm-align blocks are plants' files verbatim; the
`.dependency-cruiser.cjs` takes plants' rule shape with the brief's
four rules (`feature-isolation`, `routes-is-the-gateway`,
`shared-and-lib-are-leaves`, `no-circular`) and an empty committed
baseline. npm is pinned at 11.6.2 through `packageManager`, installed
by the Dockerfile and every workflow that runs `npm ci`, and the
lockfile was regenerated under it through one ins-only script,
`install:pinned-npm`. Playwright became two projects, `smoke` (a
whole-service pass through sign-in, dashboard, add, view, delete and
axe) and `features`, on port 3002 by default and 3052 in CI.
Lighthouse was skipped (open question).

### s11: write `app/docs` and the feature recipes for ins

Commit `f75ee9b`, CI fixes `158f393` and `b28a84b`. Six docs under
`src/server/app/docs/` in the voice of the plants set docs, describing
the layout as it is: no set, no journey, features one level down, the
page kit, the services shape, the copy pair rule, the fit conventions.
`README.md` was rewritten in plants' shape and the CDP boilerplate
(`compose.yml`, `compose/`, three placeholder READMEs) deleted. Every
comparison with the journeys sits in one section of `architecture.md`.

The second CI fix is worth knowing about: ins runs SonarCloud
Automatic Analysis, which reads `.sonarcloud.properties` and ignores
`sonar-project.properties`. ins had no `.sonarcloud.properties`, so
the six Playwright specs counted as uncovered new code and the
coverage gate failed at 78.5% against 90%. The file now mirrors
plants'.

---

## 3. What was backported the other way

Stage s12, commits `23311a0` (animals) and `e0900d7` (plants), with
one CI fix each (`11217d6`, `cf01b98`). The identical change landed in
both journeys so that the touched files are byte-equal between them,
and the planner proved it with `diff` before committing.

Ported from ins, with the tests ins had for each:

1. `src/auth/get-safe-redirect.js`: rejects protocol-relative
   (`//evil.com`), absolute, backslash and CRLF redirect targets and any
   non-string, not just a target without a leading `/`. Three tests
   added.
2. `src/auth/refresh-tokens.js`: posts a URL-encoded form body to the
   token endpoint instead of appending the client secret and refresh
   token to the query string (where proxies and the WAF log them).
3. `src/plugins/auth.js`: `redirectTo` encodes the return target with
   `encodeURIComponent`; the cookie strategy's `validate` returns
   `isValid: false` when the refresh call rejects instead of throwing a
   500.
4. `src/server/auth/controller.js`: sign-in renders the unauthorised
   page, before any session is cached or cookie set, when the Defra ID
   profile has no `organisationId` or when `getPermissions` throws. The
   organisation guard matters because a token with no current
   relationship would otherwise mint a session with
   `organisationId: undefined` and every backend call would be
   unscoped.
5. `src/config/config.js`: the strict-boolean convict format on
   `stubMode`, the one env-driven flag that fails open on a typo. The
   other booleans (`auth.enabled`, `session.cookie.secure`,
   `redis.useTLS`) fail safe under convict's `Boolean` and were left
   alone so the three configs do not diverge further.

Two decisions departed from ins on the way over, both recorded as open
questions for ins: the rejection logs `{ crn }` rather than the whole
profile (name, email and contactId are PII); `redirectTo` did not take
ins's stub-mode branch to `/auth/stub-sign-in`, because the journeys
already alias `/auth/sign-in` in stub mode and the branch would be
dead code with a false comment.

Animals also took plants' unauthorised page into `sharedCopy`
(`copy.unauthorised`, `unauthorised.njk`, `unauthorised.test.js`, the
`kit.js` export), forced by the sonarjs duplicate-string rule at four
title literals, and now `src/server/auth/controller.js` is byte-equal
across animals and plants.

The CI fix is the one thing in this section to read twice. SonarCloud
flagged `new URL(redirect, 'http://placeholder')` as an insecure
protocol (S5332) and `throw new Error(...)` in the strict-boolean
validator as the wrong error type (S7786). The fixer changed both
journeys to `https://placeholder` and `TypeError`, kept them byte-equal
to each other, and left ins on the old lines. So the last commit of the
programme reintroduced two lines of drift between ins and the journeys
in exactly the files the stage had just aligned. Section 5 lists them
and section 8 is the mechanism that would have caught it.

---

## 4. Decisions the team can reverse

Every stage plan opens with a decision table so that the implementor
never chose. The decisions below are the ones where the programme took
the journeys' shape over ins's, or plants' over animals', by the
direction rule rather than on merit. Each is a two-against-one call
the team can reverse; the count says which two.

### Stub-mode collapse (s03)

Journeys: one `STUB_MODE` flag read through `isStubMode()`, switching
stub data and stub sign-in together, refused in production. ins: two
flags, `INS_MODE=stub` for the data clients and `AUTH_STUB_MODE=true`
for the sign-in, with the production guard only on the sign-in half.

Two against one for the journeys. The planner's note, quoted: "the
two-flag split (INS_MODE for the data clients, AUTH_STUB_MODE for the
sign-in) was the better design. It let a developer run real Defra ID
against stub data, or the real address book behind a stub session, and
it kept the production guard on the one half that is a security risk
(the locally signed session). It is given up for parity with
animals/plants' single STUB_MODE." The implementor confirmed: "nothing
in this stage's work surfaced a reason beyond parity to prefer one flag
over two." The one gain of the collapse is real: `INS_MODE=stub` had no
production guard at all.

To reverse: give all three repos two flags. The `mode.js` doc comment
about a committed signing key would need rewriting in all three (see
the stub sign-in open question).

### Import style (s02)

Journeys: relative paths everywhere. ins: a `#/` alias backed by the
`package.json` `imports` field. Two against one for relative paths.
The alias is the more readable form in deep feature folders (the
address-book controller tests now reach `src/auth` as
`'../../../../../auth/...'`), but it is one more thing `vi.mock`,
`vi.importActual`, Playwright's `node .` boot and SonarCloud's rename
detection each have to understand. To reverse: add the `imports` field
to all three and run one mechanical rewrite per repo.

### Build tool (s10)

Journeys: webpack with `assets-manifest.json`, `CopyPlugin` for the
govuk assets, `.public/` served at `/public`. ins: Vite with
`assets.html`, a `.vite/manifest.json` keyed by source path and a
`headIcons` override for hashed icon copies. Two against one for
webpack. Vite was the simpler config (39 lines against 178) but the
journeys' pipeline is what the workspace stack, the Dockerfile and the
`fit:start` scripts are built around, and the port also removed
`vitest-fetch-mock`, whose `global.fetch` mock contradicted the
network-boundary invariant. To reverse: the s10 commit is one
self-contained revert plus a lockfile regeneration.

### Plugins location (s01)

Journeys: `src/plugins/{auth,csrf}.js` for the two Hapi plugins with
options, `src/server/common/helpers/` for the rest, `src/server/router.js`
for the route registry. ins: everything under `src/server/plugins/`,
which is the CDP template's layout. Two against one for the journeys.
Neither layout is more correct; the CDP template's is what a new
service starts with, and a future CDP template upgrade will be easier
to apply to a tree that still resembles it. To reverse: 22 `git mv`
calls per repo and an import rewrite.

### Client layout (s09, s10)

Journeys: the govuk template's default `headIcons` served from
`assetPath`, no custom components under `src/server/common/components/`
(plants has one, `accessible-autocomplete`, for its own use), `src/client`
holding only `javascripts/` and `stylesheets/`, and the page heading
written as a plain `<h1 class="govuk-heading-*">`. ins: two custom
Nunjucks components (`heading`, `service-header`) with their own SCSS
and tests, a `test-helpers/component-helpers.js` renderer for them, and
`useTudorCrown` / `govukRebrand` flags that do not exist in
govuk-frontend 6. Two against one for the journeys, and the deletion
was also forced by Design release 1, which has no service header or
breadcrumbs. To reverse: restore the s09 deletions; the layout would
then diverge from DR1, which the journeys already ship.

### Deliberate divergences that are not two-against-one

These are where ins kept, or was given, something the journeys do not
have. Each is a candidate for a later backport rather than a reversal.

| Decision | ins | Journeys | Stage |
| --- | --- | --- | --- |
| Route gate | `router.js` registers the app plugin and signout only when `auth.enabled` | app routes registered unconditionally; only signout gated | s01 D5, s05 D11 |
| Route auth | `routeOptions = { auth: 'session' }`, pinned by `routes.test.js` | `routeOptions = {}` (inherit the default) | s05 D1 |
| Countries at boot | fetched per request, never primed | `prime()` at boot in `app/routes.js` | s05 D7 |
| Nunjucks context | synchronous read of `request.auth.credentials` | `async`, re-reads the session from Redis on every render | s09 D7 |
| Controller file names | `controller.js` (as animals' dashboard) | plants' multi-page group uses `<page>.controller.js` | s06 D1 |
| Base URLs | convict, validated at boot | `process.env` read directly in `client.js` | s04 D4 |
| Email validation | `requiredEmail` primitive added to the lib | not present | s08 D3 |
| Error page copy | five messages in `sharedCopy.errorPage` | hard-coded English in `errors.js` | s07 D3 |
| Unauthorised title | `Unable to sign in` | `Sorry, we are unable to sign you in` | s07 D4 |
| Recoverable-error body | `Sorry, there is a problem with the service. Try again in a few minutes.` | `Your answers on this page have been saved. Try again in a few minutes.` | s09 D10 |
| Fit fixture | one shared `address-form.js` with the axe helper, imported by the dashboard spec | one `sign-in.js` at the root, an `AxeBuilder` call per spec | s06 D20, s10 D7 |
| npm pin install | `install:pinned-npm` script | documented `npx` route only | s10 D3 |

---

## 5. Residual drift after alignment

Method: `diff -rq` over `src/auth`, `src/plugins`, `src/server/common`
and `src/server/auth` between ins and animals, ins and plants, and
animals and plants, at the tips of the three branches; then a unified
diff of every file the recursive diff named, classified by hand. The
classes are:

- identical: byte-equal in all three
- import-path-only: same content at a different depth (none survive;
  s01 and s02 removed them all)
- deliberate: journey-only (a file or folder ins has no use for) or
  service-specific (a port, a name, a URL, a key prefix)
- unexplained drift: a difference no stage decided and no note records

### Animals against plants

The two journeys are byte-equal across `src/auth` (16 files) and
`src/plugins` (4 files). `src/server/auth` differs by one line: the
`STUB_TOKEN_SECRET` literal in `stub-sign-in.js` names the repo
(service-specific). `src/server/common` differs in four places:
`content-security-policy.test.js` hits `/` in animals and `/health` in
plants (deliberate, plants is the tidier fork); `redis-client.test.js`
asserts the repo's key prefix (service-specific);
`transport-routing.js` and its test exist only in animals
(journey-only). `src/config/config.js` differs by nine
service-specific hunks and `context.test.js` by the service name.

The s12 backport held: the ten auth and config files it touched are
byte-equal between the two journeys after the CI fix.

### ins against the journeys

`src/auth`: 11 of 16 files identical. The five that differ:

| File | Difference | Class |
| --- | --- | --- |
| `get-safe-redirect.js` | ins `http://placeholder`; journeys `https://placeholder` after the s12 Sonar fix | unexplained drift, two lines; apply the same fix to ins |
| `verify-token.js`, `.test.js` | ins verifies `aud` (client id) and `iss` (the discovery issuer) as well as the signature; journeys verify the signature only | unexplained drift, security-relevant, in ins's favour; not in the s12 brief |
| `get-sign-out-url.js`, `.test.js` | journeys append `post_logout_redirect_uri` from `defraId.signOutRedirectUrl`; ins sends the bare `/signout` endpoint | unexplained drift in the journeys' favour; not in any brief |

`src/plugins`: all 4 files differ.

| File | Difference | Class |
| --- | --- | --- |
| `auth.js` | ins's `redirectTo` branches to `/auth/stub-sign-in` in stub mode | deliberate (s03 D3), open question |
| `auth.test.js` | the branch's test; the mocked `redirectUrl` port and `serviceId` are ins's real values where the journeys use `service-123` / `policy-abc`; the journeys keep one bare `toHaveBeenCalled` that s03 D5 dropped | deliberate |
| `csrf.js` | plants carries a 12-line doc comment and two inline comments; ins a one-line comment | deliberate (s01 §8, invariant 6) |
| `csrf.test.js` | ins boots the real server and posts to `/address-book/add` without a crumb; plants unit-tests the options object with a mocked config | deliberate (s01 §8); ins's is the stronger test |

`src/server/auth`: `index.js` identical. The rest:

| File | Difference | Class |
| --- | --- | --- |
| `controller.js` | (a) journeys drop the local session and clear the cookie at sign-out initiation, ins only in the OIDC callback; (b) journeys' `signoutOidc` redirects an already-signed-out request to `/`, ins to the provider again; (c) ins logs `{ profile }` on a missing organisation, journeys `{ crn }`; (d) `_request` parameter name | (a) and (b): unexplained drift in the journeys' favour, security-relevant (a session that outlives the provider round trip); (c): open question; (d): lint |
| `controller.test.js` | ins keeps four sign-in and sign-out route tests the journeys' file dropped, uses `mock-auth.js` and asserts the heading literal; journeys use `mock-auth-config.js` plus `mock-oidc-config.js` and assert through the copy module | deliberate, test shape |
| `stub-sign-in.js` | ins: per-process random secret, one route, no `contactId` / `currentRelationshipId`; journeys: a committed literal key, `/auth/sign-in` aliased, both session fields | deliberate (s03 D3), open question |
| `stub-sign-in.test.js` | journeys only | deliberate |

`src/server/common`: 19 of the files ins and plants share are identical
(`content-security-policy.js`, `logger.js`, `logger-options.js`,
`request-tracing.js`, `serve-static-files.js`, `start-server.js`,
`session-cache.js`, `cache-engine.js` and its test, `redis-client.js`,
`organisation-id.js`, `mode.js` and its test, and the rest). The
differences:

| File | Difference | Class |
| --- | --- | --- |
| `constants/status-codes.js` | ins `redirect: 302`; journeys `redirectFound: 302` plus `payloadTooLarge: 413` | unexplained drift, naming only; adopt the journeys' names in ins |
| `helpers/logging/request-logger.js` | ins passes `ignoreFunc` so `/public`, `/health` and `/favicon.ico` are not logged; journeys log every request | unexplained drift in ins's favour; s01 §8 said "ins hardening the programme wants backported", s12 did not include it |
| `helpers/pulse.js` | `tenSeconds` against `shutdownTimeoutMs` | unexplained drift, a constant name; adopt the journeys' |
| `helpers/errors.js` | ins reads the message from `sharedCopy.errorPage`; journeys hard-code English | deliberate (s07 D3); ins is ahead |
| `helpers/errors.test.js` | ins imports `mock-auth.js`; journeys `mock-oidc-config.js`, plus a `journeyStrip: null` key and two journey-only assertions | deliberate |
| `helpers/content-security-policy.test.js` | ins hits `/` with a session; plants `/health`; animals `/` without a session | deliberate (s01 §8), three ways |
| `helpers/redis-client.test.js` | ins stubs `REDIS_HOST`, pins the exact options and its own key prefix; journeys use `objectContaining` | deliberate, test shape |
| `helpers/serve-static-files.test.js` | ins boots through `startServer()` and checks the favicon only; journeys use `createServer()` and also fetch a built asset | deliberate (s01 §8) |
| `helpers/start-server.test.js` | ins spies on `createServer` and `hapi.server` after stubbing `PORT`; journeys mock `server.js` so `start()` calls `initialize()` | deliberate, test shape; the journeys' avoids binding a port |
| `helpers/organisation-id.test.js` | ins only (s05 N8) | deliberate |
| `helpers/actor-helpers.js`, `helpers/proxy/`, `components/` | journeys only | journey-only |
| `test-helpers/mock-auth.js` | ins; the journeys split it as `mock-auth-config.js` (a cookie-password override) and `mock-oidc-config.js`; ins's `sessionAuth()` helper has no journey equivalent | unexplained drift; the programme's target tree names the journeys' pair and no stage did the split |
| `test-helpers/real-mode.js`, `test-server.js` | ins only (s04, s01) | deliberate |

Outside the four chassis surfaces, for completeness:

- `src/config/config.js`: service-specific hunks (port, service name,
  URLs, key prefix, backend API blocks); ins keeps a `LOG_REDACT` env
  hook and the journeys a `session.cache.segment` key; `new Error`
  against `new TypeError` in the strict-boolean validator is the second
  line of the s12 Sonar drift.
- `src/config/nunjucks/nunjucks.js`: ins registers two filters
  (`formatDate`, `formatCurrency`) the journeys do not have; the
  journeys add the MoJ frontend root and `app/sets` where ins has
  `app/features`.
- `src/config/nunjucks/context/context.js`: the synchronous session
  read (s09 D7), `dashboardUrl` / `addressBookUrl` / `crumb` (ins),
  `staleActionRejected` (journeys).
- `src/server/server.js`: `setupProxy()` and the `proxy/` helpers are
  journey-only; the `csrf` import sits at a different position; one
  trailing comment.
- `src/server/router.js`: the route gate (section 4).
- `src/server/health/index.js`: one comment. `signout/index.js`: ins
  reads `routeOptions` from the kit, plants spreads the controller.
- `src/server/app/shared/layout.njk`: five named hunks (s09 D2, D5, D6,
  D8): `signOutUrl` is `/signout` not `/auth/sign-out`; the address-book
  item is a real link where plants' is `#`; both items can be active;
  no `staleActionRejected` banner; no `homeUrl` set.
- `src/server/app/lib/validate/validators.js`: `requiredEmail` (ins
  only). `index.js` and `validate.test.js` differ by the same addition.
- `src/client`: journey-only components, the MoJ date picker and five
  journey stylesheets; `_govuk-frontend.scss` forwards `pkg:govuk-frontend`
  directly in ins and through the MoJ wrapper in the journeys.
- `.dependency-cruiser.cjs`: four rules in ins against thirteen in the
  journeys, by design.
- `Dockerfile`: `PARENT_VERSION` (ins is newer) and `ARG PORT`.
- `package.json`: the journeys have `postinstall: npm run setup:husky`,
  `eslint-plugin-sonarjs` and `@lhci/cli`; ins has `install:pinned-npm`.

Reading the tables as a whole: after twelve stages the four chassis
surfaces hold 6 files whose difference nobody decided and which the
team should settle, listed here in the order they matter:

1. `src/server/auth/controller.js` sign-out: port the journeys' session
   drop at initiation and the `/` redirect for an already-signed-out
   request into ins.
2. `src/auth/verify-token.js`: port ins's audience and issuer checks
   into the journeys.
3. `src/auth/get-sign-out-url.js`: port the journeys'
   `post_logout_redirect_uri` into ins.
4. `src/server/common/helpers/logging/request-logger.js`: port ins's
   `ignoreFunc` into the journeys.
5. `src/auth/get-safe-redirect.js` and `src/config/config.js`: apply
   the two-line Sonar fix to ins.
6. `status-codes.js`, `pulse.js`, `test-helpers/mock-auth.js`: rename
   and split to the journeys' spelling.

---

## 6. The Welsh copy caveat

Every `copy.cy.js` in ins (`app/shared/copy.cy.js`, 57 lines;
`features/dashboard/copy/copy.cy.js`, 35 lines;
`features/address-book/copy/copy.cy.js`, 106 lines) is machine-draft
Welsh written in s07 and s09. Each file carries the journeys' header
line: "MACHINE-DRAFT Welsh, not reviewed by a translator. Do not ship
user-facing without Welsh Language Standards sign-off." The animals
`copy.unauthorised` block that s12 copied from plants is the same
machine draft.

Where the English was identical to a journey string, the journeys'
Welsh was reused (`Dangosfwrdd`, `Llyfr cyfeiriadau`, `Yn ôl`,
`Mae problem`, the address labels). The rest is new and unreviewed.
`copy-parity.test.js` proves only that the Welsh has the same paths,
leaf kinds and function arities as the English and that every string
differs from its English; it says nothing about whether the Welsh is
right.

No locale toggle exists in any of the three services. Every
`copyFor({ en, cy })` call resolves `en`, so the Welsh is unreachable
in the running service. That is why the draft was safe to land: nobody
can see it. Before any real Welsh release the three services need a
translator's review of every `copy.cy.js` and a locale seam (a cookie
or a language toggle) wired through the `locale` argument of `copyFor`.

---

## 7. Open questions

Collected from every stage's `openQuestions` and the handoffs the plans
recorded for this report. Each is a question the team rules on. Where
the three repos disagree, the count says how many are on each side.

Security-sensitive chassis behaviour:

1. Should ins drop the local session and clear the cookie at sign-out
   initiation, as the journeys do, rather than only in the OIDC
   callback? Two (journeys) against one (ins). The journeys' comment
   says the provider round trip is not guaranteed because Entra and the
   CDP WAF reject an over-long `id_token_hint`.
2. Should the journeys verify the token's `aud` and `iss` as ins does,
   not just its signature? One (ins) against two.
3. Should ins send `post_logout_redirect_uri` to the provider as the
   journeys do? Two against one.
4. Should ins log `{ crn }` rather than the whole profile when a
   sign-in has no organisation? Two against one (s12).
5. Stub sign-in shape: ins keeps a per-process random signing secret
   and a single `/auth/stub-sign-in` route; the journeys commit a
   literal key, alias `/auth/sign-in` to the same handler (which also
   makes the "try again" link on the unauthorised page work in stub
   mode; in ins it 404s), and store `contactId` and
   `currentRelationshipId` in the session. Two against one for the
   journeys. Whichever way this goes, the `mode.js` doc comment that
   says "Stub mode signs its own sessions with a key committed to this
   repo" is false for ins today and must be made true in all three
   (s03). If ins adopts the alias, its `redirectTo` stub-mode branch
   goes and `src/plugins/auth.js` becomes byte-equal across the three
   (s12).
6. Should the journeys take ins's request-logger `ignoreFunc` so
   `/health` and static assets stop filling the logs? One against two.
7. Should the strict-boolean convict format be widened to the other
   security flags (`auth.enabled`, `session.cookie.secure`,
   `redis.useTLS`, `isSecureContextEnabled`)? s12 kept it on `stubMode`
   only because those fail safe; the team may prefer strictness
   everywhere. Three repos agree today.
8. `/signout` (ins) against `/auth/sign-out` (journeys) as the log-out
   URL in the service navigation: two against one, but `/signout` is
   in ins's protected URL list and the journeys' `/auth/sign-out` only
   exists in real mode.

Shape decisions the direction rule made:

9. Two stub flags or one (section 4)? Two against one for one flag;
   the planner and implementor both recorded that two was the better
   design.
10. `#/` alias or relative imports? Two against one for relative.
11. Vite or webpack? Two against one for webpack.
12. `src/server/plugins/` (CDP template) or `src/plugins/` plus
    `common/helpers/`? Two against one for the journeys.
13. Should ins keep its `auth.enabled` gate over every non-health
    route, or register app routes unconditionally as the journeys do?
    One against two; the gate is load-bearing for ins (with auth
    disabled there is no session strategy).
14. Explicit `auth: 'session'` on every route (ins) or inherit the
    server default (journeys)? One against two; ins's is defence in
    depth.
15. Should the journeys adopt ins's synchronous Nunjucks context read
    (one fewer Redis hit per page)? One against two (s09 D7).
16. Should the journeys move their error-page messages into
    `sharedCopy.errorPage` as ins now has? One against two (s07 D3).
    And should the English be revisited while doing so (`Bad Request`,
    `Unauthorized` are not GDS style)?
17. `controller.js` or `<page>.controller.js` in a multi-page group?
    ins and animals' dashboard use `controller.js`; plants' groups use
    `<page>.controller.js`. Two against one for `controller.js`.
18. Should the journeys prime countries at boot, or fetch per request
    as ins does (a reference-data outage does not stop the server
    starting)? Two against one for priming.
19. One shared fit fixture with an axe helper (ins) or an `AxeBuilder`
    call per spec (journeys)? One against two; the ins helper is the
    smaller diff per new spec, but the dashboard spec imports it across
    a feature boundary.

Tooling and dependencies:

20. Joi is imported by `lib/validate/validators.js` and
    `address-id-params.js` in all three repos and declared in none,
    resolving hoisted through `@hapi/bell` and `@hapi/catbox-redis`.
    Declare it in all three, or accept the hoist? Three repos agree on
    the hoist today; it is a phantom dependency.
21. Backport `install:pinned-npm` to the journeys, or keep the `npx`
    route as a documented command only? One against two.
22. Should ins take `postinstall: npm run setup:husky` so the
    pre-commit hook activates on every clone? Two against one for
    `postinstall`; ins's hook runs the audit at `critical` where plants
    runs `high`.
23. Should ins take the journeys' Lighthouse harness (`@lhci/cli`,
    `lighthouserc.cjs`, `scripts/lighthouse/`, the workflow), or a
    reduced audit over its six pages? Two against one; the seeders are
    journey-shaped so it is a port with adaptation.
24. Should ins take `eslint-plugin-sonarjs` and the fit-spec globals
    the journeys lint with? Two against one.
25. Should `test-helpers/mock-auth.js` be split into the journeys'
    `mock-auth-config.js` and `mock-oidc-config.js` (the programme's
    target tree says so, no stage did it), and should `sessionAuth()`
    be backported? Two against one for the split.
26. `status-codes.js` names (`redirectFound`, `payloadTooLarge`) and
    `pulse.js`'s `shutdownTimeoutMs`: two against one for the journeys'
    spelling.
27. `requiredEmail` is a backport candidate for the journeys (a
    consignment-contact email is the obvious first use). One against
    two.
28. The `Dockerfile`'s `ARG PORT=3000` against ins's service port
    3002, and the `$${{ github.workflow }}` typo and `queue: max` in
    `publish.yml`: ins housekeeping the programme did not touch.

Cross-repo consequences:

29. The tests repo's ins ZAP spec
    (`tests/security/ins/address-book.spec.ts:43-45`) still does
    `goto('/about')`, which 404s once this branch is deployed. The
    spec is inside the opt-in `@active` scan and `goto` tolerates a
    404, so it stays green with one less route scanned. Does
    `trade-imports-animals-tests` join the branch set with its own draft
    PR, or is the edit left for whoever lands the alignment for real?
30. If any CDP environment config (`cdp-app-config`, outside this
    workspace and outside AI hands) sets `INS_MODE` or `AUTH_STUB_MODE`
    for ins, convict silently ignores it after s03 and that environment
    runs in real mode. Sam to check before this branch is ever
    deployed.
31. Plants' service navigation points its Address book item at `#`;
    ins's address book is the real destination. When plants links
    across, it needs a browser-visible ins URL in its config (as ins
    holds `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` for the reverse
    direction).
32. The animals and plants PR bodies link to this report at
    `github.com/DEFRA/trade-imports-animals-frontend/blob/feat/...` and
    the plants equivalent; the ins PR body links to the workspace repo,
    which is where the report lives. The two journey PR bodies need the
    workspace URL.

---

## 8. Keeping the three aligned

Three repos, no shared package, byte-equal chassis files by intent: the
thing that keeps them equal has to be a check, not a habit. The s12 CI
fix is the demonstration: one Sonar-driven edit to two repos, proven
byte-equal between them, and the third repo drifted the same afternoon
with nobody noticing until this report diffed the trees.

### The surfaces manifest

A manifest that names every file the three repos are meant to share and
says how equal it must be. It lives in the workspace, not in a repo,
because it describes a relationship between repos. A first draft is at
[`surfaces.json`](surfaces.json) beside this report; the shape is:

```json
{
  "repos": {
    "ins": "repos/trade-imports-ins-frontend",
    "animals": "repos/trade-imports-animals-frontend",
    "plants": "repos/trade-imports-plants-frontend"
  },
  "surfaces": [
    {
      "path": "src/auth/get-safe-redirect.js",
      "rule": "identical"
    },
    {
      "path": "src/config/config.js",
      "rule": "identical-except",
      "allow": ["port", "serviceName", "serviceId", "redirectUrl",
                "signOutRedirectUrl", "keyPrefix", "tradeImports\\w+Api"]
    },
    {
      "path": "src/server/auth/stub-sign-in.js",
      "rule": "identical-except",
      "allow": ["STUB_TOKEN_SECRET"]
    },
    {
      "path": "src/server/common/helpers/transport-routing.js",
      "rule": "only-in",
      "repos": ["animals"]
    },
    {
      "path": "src/server/common/helpers/content-security-policy.test.js",
      "rule": "deliberate",
      "reason": "s01 §8: ins hits / with a session, plants /health"
    }
  ]
}
```

Four rules cover everything section 5 found:

- `identical`: byte-equal in every repo that has the file. The default
  for `src/auth/*`, `src/plugins/*`, `src/server/common/helpers/*`,
  `src/server/common/services/mode.js`, `src/server/auth/index.js`,
  `src/server/health/*`, `src/server/signout/controller.js`,
  `src/server/app/shared/{copy,copy-leaves}.js`,
  `src/server/app/lib/validate/{run,calendar}.js`, `webpack.config.js`,
  `postcss.config.js`, `babel.config.cjs`, `scripts/npm-version.js`,
  `fit/sign-in.js`.
- `identical-except`: byte-equal once lines matching the `allow`
  patterns are dropped from both sides. For `config.js`, `Dockerfile`,
  `stub-sign-in.js`, `redis-client.test.js`, `layout.njk`.
- `only-in`: the file exists in the named repos and nowhere else, so a
  journey-only helper cannot leak into ins by copy and paste.
- `deliberate`: the file differs and a named stage decision says why.
  Every entry carries the reason, so the next person can decide
  whether the reason still holds. A file that differs and is in no
  entry is the drift the check reports.

The manifest is also the list of surfaces a chassis change must touch.
A PR that edits `src/auth/refresh-tokens.js` in one repo and not the
other two is visible as such the moment the check runs.

### The drift check

A workspace command, `tim workspace drift` (proposed, alongside the
existing `tim workspace status`, `lint` and `test`), that:

1. Reads `surfaces.json` and, for each surface, the three files at the
   branch the caller names (`--branch feat/EUDPA-xxx`, defaulting to
   `main`, with the fall-back-to-main-per-repo rule the stack already
   uses for branch parity).
2. Applies the rule: `identical` is a byte compare; `identical-except`
   compares after dropping allowed lines; `only-in` is an existence
   check; `deliberate` is always green but listed.
3. Reports, in the `--json` envelope every `tim` command emits, every
   surface that fails, with the unified diff, and every file under the
   four chassis directories that exists in two or more repos and is in
   no manifest entry (unlisted drift).
4. Exits non-zero on any failure.

Where it runs:

- Locally, by anyone about to touch a chassis file, and by the
  alignment skill's stage ladder as a rung, so a CI fixer that changes
  two repos and not the third goes red before it pushes.
- On a schedule in the workspace repo (the workspace already runs
  scheduled checks against the repos), posting the failures as a
  workspace issue. The three repos' CI stays repo-local, which is what
  keeps them independent.

What it does not do: it does not copy files between repos. When a
chassis file changes, a person opens the same-named branch in all three
repos, applies the same change, and the check proves it. The same-name
rule the workspace already enforces for cross-repo branches is the
mechanism; the manifest tells the person which files that rule applies
to.

### Two smaller guards that already exist

`copy-parity.test.js` and `copy-convention.test.js` keep the Welsh and
English structurally equal inside one repo, and `.dependency-cruiser.cjs`
keeps features apart inside one repo. Neither reaches across repos; the
manifest is the cross-repo counterpart to both.
