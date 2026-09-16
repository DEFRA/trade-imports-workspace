# Frontend alignment: what needs a ruling

Three Node frontends (ins, animals, plants) were brought into one shape on one
branch, `feat/NO_JIRA-frontend-alignment`, behind draft pull requests that are
never merged; merging the workspace PR approves nothing. This page leads with
what the team must decide, then the calls the team may reverse. Every fact was
re-checked against the code and the PRs on 16 September 2026.

## Open questions

Each names what is in play, the options with the count of repos on each side,
and what happens if nobody answers.

### Shape choices the direction rule made, now backport candidates

| # | Question | Count | If nobody answers |
| --- | --- | --- | --- |
| 14 | `controller.js` or `<page>.controller.js` in a multi-page group? | two against one for `controller.js` | plants' groups stay the odd one out |
| 15 | One shared fit fixture with an axe helper (ins `address-book/fit/address-form.js`) or an `AxeBuilder` call per spec? | one against two | the dashboard spec keeps importing across a feature boundary |
| 29 | Should ins take the journeys' full countries reader surface (`originLabel`, `originCountries`, `addressCountries`, `countryCodeOf`) and the `GBNAG_SPS_EX` block filter, so its countries service is byte-equal with plants'? Question 13 landed the lazy cache alone. It would narrow the address book from the full MDM list to the animal-products export block, stop the dashboard naming a `GB` origin, and drop the trace header from the reference-data call. | one against two | ins keeps the full MDM list, its own reader and its trace header, and the two countries services stay different files |
| 30 | `content-security-policy.js` stopped being byte-equal when ins took `main`'s EUDPA-333 handshake: ins reads the animals-frontend base URL and widens `form-action` from `['self']` to `['self', animalsFrontendOrigin]`, because the browser blocks the cross-origin 302 the address-add handshake depends on. Does ins keep a documented exception, or do the journeys take ins's shape, which they need themselves for question 28? | ins only | a chassis file differs with nothing to say why |

### Tooling and dependencies

| # | Question | Count | If nobody answers |
| --- | --- | --- | --- |
| 17 | Should ins take `postinstall: npm run setup:husky`, so the pre-commit hook (audit, format, lint, unit suite) runs on every clone? ins audits at `critical` where plants runs `high`; align that first. | two against one | the ins hook stays opt-in |
| 18 | Backport `install:pinned-npm` (regenerates the lockfile under the pinned npm) to the journeys? | one against two | the journeys keep the documented `npx` route only |
| 19 | Where does [`surfaces.json`](surfaces.json) live (`docs/reference/` or `tim/`), and is the proposed `tim workspace drift` command built to report every chassis file differing without a recorded reason? | workspace-only | the next cross-repo edit drifts by two lines, as the backport commit did before question 2 closed it, with nothing to say so |
| 21 | Add `cleanup-e2e-reports.yml` to ins (the twelve-line `gh-pages` pruner animals and plants run)? The Lighthouse port left it out because the audit does not depend on it. | two against one | ins's `gh-pages` gains one `lighthouse/<branch>/` directory per branch |
| 23 | Should ins take `eslint-plugin-sonarjs` and the journeys' fit-spec lint globals? | two against one | SonarCloud finds in CI what local lint finds first in the journeys |
| 26 | ins housekeeping: `Dockerfile` says `ARG PORT=3000` while the service listens on 3002; `publish.yml` has `group: $${{ github.workflow }}` (a doubled dollar) and `queue: max`. | ins only | harmless today, confusing later |

### Cross-repo consequences

28. **When plants links to the address book, where does the ins URL come
    from?** Plants' navigation points its Address book item at `#`; ins holds
    `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` for the reverse direction. Plants
    needs a browser-visible ins URL in `config.js`.

## Rulings applied

1. **Dropped the ins session at sign-out initiation, as the journeys do.**
   Ruled 16 September 2026: yes. ins drops the local session at sign-out
   initiation, as the journeys do. Landed as `da05f1f` on
   [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27).
   `src/server/auth/controller.js` in ins took plants' three hunks verbatim:
   `signout` drops the cached session and clears the `sid` cookie before the
   redirect to the provider, `signoutOidc` sends an already-signed-out request
   to `/` instead of the provider, and `signin`'s unused parameter is
   `_request`. The file now differs from plants and animals by the one
   `{ profile }` log line that question 4 owns. Behaviour: an authenticated
   `GET /auth/sign-out` no longer leaves a session behind when Entra or the CDP
   WAF reject the provider round-trip, and an unauthenticated
   `GET /auth/sign-out-oidc` lands on `/`; `GET /signout` is unchanged in both
   states, because its required-mode session strategy redirects an
   unauthenticated request to sign-in before the handler runs. Tests in
   `src/server/auth/controller.test.js` and
   `src/server/signout/controller.test.js` prove the drop by a cache
   round-trip and the cookie by `set-cookie`, with no new module mock.

2. **Converged authentication on one shape across the three frontends.**
   Ruled 16 September 2026: one auth run: consistent authentication across
   the three, not better authentication; do not build real auth. Line things
   up so that when real auth is built there is one implementation to apply
   three times. Q2 yes, the journeys verify the token as ins does. Q3 yes,
   ins sends post_logout_redirect_uri as the journeys do. Q4 yes, ins logs
   the CRN as the journeys do. Q6 yes, apply the two-line fix. Q7 yes, the
   strict format for every flag across all three. Q8 no preference, make it
   consistent. Q9 auth.enabled everywhere; a miss on the journeys. Q10 add
   the explicit session option to the journeys. Q11 the journeys are right to
   re-read the session from Redis; ins follows. Q24 a consistent, consolidated
   approach. The stub sign-in shape converges now, reversing the 15 September
   wait-for-real-auth ruling. Landed as `9e1ff60` on
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
   test, `src/server/auth/` (`index.js`, `controller.js`, `stub-sign-in.js`
   and both tests), `src/server/router.js`, `src/server/common/services/mode.js`
   and its test, and the test helpers `mock-auth-config.js`,
   `mock-oidc-config.js` and `session-auth.js` are byte-equal across ins,
   animals and plants, proven with `diff -rq`; `config.js` differs only by
   service-specific values and `context.js` only by the lines each service
   owns. The journeys took ins's `aud` and `iss` checks, its `auth.enabled`
   gate over every non-health route (with a new `router.test.js`) and
   `auth: 'session'` on `kit.routeOptions` (six animals controller tests that
   build a bare Hapi server gained `registerTestSessionAuth` in
   `src/server/app/engine/test-support.js` so the strategy registers); ins
   took the journeys' `post_logout_redirect_uri`, `{ crn }` log line,
   `https://placeholder`, `new TypeError`, awaited session read in
   `context.js` and split test helpers; all three took the strict-boolean
   convict format on eleven env-backed booleans (a typo is refused, pinned in
   `config.test.js`), one stub sign-in handler behind `/auth/sign-in` and
   `/auth/stub-sign-in` with a per-process random secret and no committed
   key, a stub-mode `GET /auth/sign-out`, and `routes.js` exporting
   `serviceRoutes`. Behaviour: ins's public URL surface loses `/signout`,
   `src/server/signout/` is deleted from all three, and `/auth/sign-out` is
   the one sign-out URL in every layout in both modes (real mode through
   `src/server/auth/controller.js`, stub mode through `stub-sign-in.js`,
   which drops the session and lands on `/`); in the tests repo
   `BasePage.linkSignOut` is the frontends' "Log out" link,
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
   journey PR then took a second `main` merge (`8f5630b0`, `b5b6577`) before
   its checks could run. Questions 5, 12, 16, 20, 22 and 25 closed together:
   the journeys took ins's `ignoreFunc` in
   `src/server/common/helpers/logging/request-logger.js`, narrowed in all
   three to `/public`, `/public/*`, `/health` and `/favicon.ico` (ins's raw
   prefix also matched `/publications`) and pinned by a new byte-equal
   `request-logger.test.js`; ins's `helpers/errors.js` went to both journeys,
   reading every message from `sharedCopy.errorPage` in `copy.en.js` and
   `copy.cy.js` under the machine-draft Welsh header, and `errors.test.js`
   became one text that renders the EUDPA-575 503 page from a Boom route;
   `src/server/app/lib/validate/` took ins's text in both journeys
   (`requiredEmail`, and for animals also `requiredTime`,
   `requiredDateTextInRange`, the empty-allow-list guard in `requiredOneOf`,
   the four-digit-year guard in `parseDateText` and the `dateWithinBounds`
   name); ins took animals' `constants/status-codes.js` (`redirectFound`,
   `payloadTooLarge`, `serviceUnavailable`, with `statusCodes.redirect`
   renamed at seven test sites) and plants' `helpers/pulse.js`
   (`shutdownTimeoutMs`); `joi` is declared in all three `package.json` files
   at the version each lockfile already resolved (`17.13.8` in ins, `17.13.7`
   in the journeys); and plants' dead `test-helpers/component-helpers.js` is
   gone. The four test-shape files (`content-security-policy`,
   `redis-client`, `serve-static-files` and `start-server` tests) converged on
   plants' text, so `src/server/common/` is byte-equal across the three
   except the service key prefix in `redis-client.test.js` and the two `main`
   hunks in `errors.test.js` named under Residual drift, and `lib/validate/`
   is byte-equal except the journey-only `persists-cleaned-value.test.js`,
   proven with `diff -rq`. Behaviour: journey request logs no longer carry
   health probes or static-asset requests; the 400 and 401 pages read "There
   is a problem with your request" and "You need to sign in to view this
   page" in all three, with Welsh drafted alongside; animals' validate lib
   gains the primitives above, none yet used by a feature; ins's lockfile,
   regenerated under the pinned npm, also lost about 26 unused
   `@esbuild/<platform>` optional entries and its Docker builds were green
   on the result. Left as the brief drew it and now candidates for a later
   ruling: `errorPage.forbidden` still reads "Forbidden", `@hapi/boom` is
   imported and undeclared in all three, and page titles are composed two
   ways (animals `main` joins with hyphens and a GOV.UK suffix, ins and
   plants with a pipe).

13. **Loaded reference data on first read in ins, as the journeys do.** Ruled
    16 September 2026: yes. ins takes animals `main`'s EUDPA-575 shape (commit
    `fb3615e3`, load reference data on first read, not at startup); proposed
    from the merge evidence and confirmed by Sam. Plants no longer needs the
    port: its `main` merged the same change as PR #71 (`77a5aa7`) on 16
    September and the alignment branch took it when `main` was merged in
    again. Landed as `c44e554` on
    [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27).
    `src/server/app/services/countries/index.js` took plants' `ensureLoaded`
    body: a module-scope list and `loaded` flag, a stub-mode short-circuit, a
    failed load that leaves the flag false so the next read retries, and a
    rejection with `Boom.serverUnavailable` carrying `dataset: 'countries'`,
    which `catchAll` renders as the shared error page at 503. The reader stays
    ins's own `getCountries()`, and `client.js` and `stub.js` are untouched, so
    ins keeps its convict base URL, its trace header and the full MDM country
    list; the full journey reader surface is question 29. The dashboard, list
    and add controllers let a Boom through to `catchAll` as `edit` already did,
    the three `.catch(() => [])` swallows went with `countryItemsOrNone`
    renamed `loadCountryItems`, and `address-countries.js` rejects the same way
    on an empty list. Tests mock at the network boundary with nock:
    `services/run-mode.test.js` replaces `countries/countries.test.js` and pins
    self-load on first read, fetch-once across readers, the retry after a
    failed load, the Boom payload and the stub short-circuit, and a new
    `features/reference-data-outage.test.js` proves the 503 page on the
    dashboard, the address book, the add form and a stored address. Behaviour:
    ins reads reference data once per process instead of once per request, so
    an upstream change to the list is picked up only on a restart; a
    reference-data outage now fails every page that reads countries as a 503
    page, where before those pages rendered an empty country list or, on the
    add page, a recoverable-error banner at 500; and an empty MDM list rejects
    the same way, which the brief did not itself declare. While the stage was
    in CI, ins `main` gained EUDPA-333 (the address-add handshake) and the
    conflict stopped GitHub running any checks, so `main` was merged in and the
    feature ported to the aligned tree (`1446fcc`, `ea2bfe6`, `a3dcb6d`); one
    of `main`'s tests was dropped, an add-page inline error for countries that
    fail to load, because that page now shows the 503 page and the failure
    stays covered by `address-countries.test.js` and
    `services/run-mode.test.js`. The tests repo took the same `main` merge
    (`29e9901`) for the ins session-cookie name the handshake work introduced.

27. **Pulled `main` into the alignment branch and analysed what moved.**
    Ruled 16 September 2026: main has moved under these repos since the
    alignment was built; analyse the changes that have gone into the three
    frontends on main since the initial work and pull them in, as a dedicated
    item at the front of the queue. Question 27 (the workspace branch behind
    main) closes with it; question 13's countries evidence comes out of it.
    Landed as `9666f2d` on
    [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339)
    and `a2b8d48` on
    [#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227).
    Two `--no-ff` merges with no conflict: animals took ten `main` commits
    (62 files, the DR1 hub rework and EUDPA-575), tests took five (18 files,
    the DR1 hub specs and the EUDPA-369 GBN-AG event assertions); ins and
    plants `main` had not moved, so nothing was merged there. The only
    chassis files `main` touched are animals'
    `src/server/common/constants/status-codes.js` (`serviceUnavailable: 503`)
    and `src/server/common/helpers/errors.test.js` (the 503 page); none of
    the sixteen alignment files in animals or the one in tests was among
    them. Behaviour, all from `main` by merge: animals loads countries and
    ports on first read instead of at boot, a failed load is a 503 page
    instead of a stopped pod, address country is stored as the ISO code, and
    the hub follows DR1 (sections, six relabelled rows, a locked review row,
    two-state status), with the E2E suite following it. The workspace branch
    was already level with its `main` and carried the Floci healthcheck fix,
    so nothing was merged in the workspace repo; PR 47's E2E has been green
    since that fix reached the branch.

## Decisions you may want to reverse

Each was taken by the direction rule (ins moves toward the journeys; plants
is the tidier fork) rather than on merit. The count says which two.

**Stub-mode collapse.** ins's two flags (`INS_MODE=stub` for the data clients,
`AUTH_STUB_MODE=true` for sign-in) became the journeys' single `STUB_MODE`,
two against one. Planner and implementor both recorded that two flags was the
better design: real Defra ID against stub data, or the real address book
behind a stub session, with the production guard on the risky half. The one
gain: `INS_MODE=stub` had no production guard and now does. `cdp-app-config`
sets none of the three variables for ins, so no environment silently changed
mode. To reverse: two flags in all three repos (`mode.js`, `config.js`, the
auth plugin, the Playwright env).

**Stub sign-in shape.** Ruled on 15 September to wait for real
authentication; reversed on 16 September and built with question 2 (see
Rulings applied): the journeys' behaviour (one handler behind `/auth/sign-in`
and `/auth/stub-sign-in`, an unconditional encoded `redirectTo`, `contactId`
and `currentRelationshipId` on the session) with ins's per-process random
secret in all three, a stub-mode `GET /auth/sign-out`, and the `mode.js`
production-refusal comment rewritten in all three to say stub mode hands a
session to any caller with no identity provider involved. To reverse: restore
the stub-mode `redirectTo` branch in `plugins/auth.js` and one `/auth/sign-in`
route per service, in all three.

**Relative imports** replaced the `#/` alias (`package.json` `imports`), two
against one. The alias reads better in deep feature folders (controller tests
reach `src/auth` as `'../../../../../auth/...'`) but is one more thing
`vi.mock`, `vi.importActual`, Playwright's `node .` boot and SonarCloud's
rename detection must understand. To reverse: add the `imports` field to all
three and run one mechanical rewrite per repo.

**webpack, not Vite**, two against one. Vite's config was 39 lines against
178, but the stack, the Dockerfile and the `fit:start` scripts are built
around the journeys' pipeline, and the port removed `vitest-fetch-mock`, whose
`global.fetch` mock contradicted the network-boundary invariant. To reverse:
revert the one build-tooling commit on PR 27 and regenerate the lockfile.

**Plugins location.** `src/server/plugins/` (the CDP template's layout) became
`src/plugins/{auth,csrf}.js`, `src/server/common/helpers/` and
`src/server/router.js`, two against one. Neither is more correct; a CDP
template upgrade applies more easily to a tree that still resembles it. To
reverse: 22 `git mv` calls per repo and an import rewrite.

**Client layout.** ins's custom `heading` and `service-header` components,
their SCSS, tests and renderer, and the `useTudorCrown` / `govukRebrand`
flags (absent from govuk-frontend 6) went, for plain `govuk-heading-*` and the
govuk template's default `headIcons`. Two against one, and also forced by
Design release 1, which has no service header or breadcrumbs. To reverse:
restore the deletions and diverge from DR1, which the journeys already ship.

**Lighthouse.** Ruled in on 15 September and built as the fourteenth stage.

## What was built

| Repo | PR | Checks as of 16 September |
| --- | --- | --- |
| `trade-imports-ins-frontend` | [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27) | draft, open; all six checks green (PR checks, FIT tests, SonarCloud, three publish jobs) at `a3dcb6d` (the countries lazy load `c44e554` plus the `main` merge that brought EUDPA-333), 16 September 16:52 |
| `trade-imports-animals-frontend` | [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339) | draft, open; all nine checks green, including E2E, Lighthouse CI and SonarCloud, at `7b0ce48f` (a `main` merge for EUDPA-333, on top of the chassis convergence `d6f15c56`), 16 September 17:39 |
| `trade-imports-plants-frontend` | [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69) | draft, open; all nine checks green, including E2E, Lighthouse CI and SonarCloud, at `b5b6577` (the chassis convergence `8c9e9f3` plus a `main` re-merge), 16 September 15:02; plants `main` moved on 16 September (EUDPA-575, PR 71) and is merged in |
| `trade-imports-animals-tests` | [#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227) | draft, open; four of five checks green at `29e9901` (the `main` merge that brought the ins session-cookie name), 16 September 17:32; E2E red, because the run started three minutes before the animals branch published the image carrying `main`'s handshake link the new specs look for |
| `trade-imports-workspace` | [#47](https://github.com/DEFRA/trade-imports-workspace/pull/47) | **not a draft**, open; E2E red on four runs while the branch images were mid-republish on 16 September, then green on [run 35123715596](https://github.com/DEFRA/trade-imports-workspace/actions/runs/35123715596), the first to start after all four had published, 16 September 17:43 |

The ins branch changes 265 files (21,114 insertions, 10,561 deletions, mostly
the lockfile); animals 49; plants 41; tests 6. No shared package, no cross-repo
import. ins's public URLs are unchanged except that `/about` and `/signout`
are gone; sign-out is `/auth/sign-out`, as in the journeys.

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
    features/dashboard/{controller.js, template.njk, copy/, view-model/, fit/}
    features/address-book/{list,add,edit,view,delete}/{controller.js, template.njk}
    features/address-book/{fields, address-countries, address-id-params, stored-address,
                            success-banner, handshake-context, journey-registry}.js
                           {copy/, view-model/, fit/}
  auth/  common/{constants/, helpers/, services/mode.js, test-helpers/}
  health/  router.js  server.js
fit/{sign-in.js, smoke.fit.spec.js}  scripts/{npm-version, check-workspace-stack}.js
scripts/lighthouse/  tests/lighthouse/  lighthouserc.cjs  .sonarcloud.properties
webpack.config.js  postcss.config.js  .dependency-cruiser.cjs
```

Unit suite: 49 files and 242 tests before, 61 files and 595 tests after.
Playwright: 49 specs before, 50 after (a smoke project plus the features).

### Backported to animals and plants

One identical commit in each journey, proven byte-equal with `diff`:
`get-safe-redirect.js` rejects protocol-relative, absolute, backslash and CRLF
targets and any non-string; `refresh-tokens.js` posts the client secret and
refresh token as a form body instead of a query string; `plugins/auth.js`
encodes the return target in `redirectTo` and returns `isValid: false` when
the refresh call rejects, instead of a 500; `server/auth/controller.js`
refuses a sign-in whose profile has no `organisationId` and survives a
`getPermissions` failure, before any session is cached or cookie set;
`config.js` applies the strict-boolean convict format to `stubMode`. Animals
also took plants' unauthorised page into `sharedCopy`, so
`server/auth/controller.js` is byte-equal across animals and plants.

### Tests repository

Two changes: the ins security scan no longer visits `/about`, and sign-out
follows the frontends' one URL (question 2): `BasePage.linkSignOut` is the
"Log out" link, `AdminDashboardPage` keeps the admin portal's "Sign out" at
`/signout`, and `SignOutPage.path` is `/auth/sign-out`, which `auth.spec.ts`
pins on the link before clicking it. Every other ins spec and page object was
audited against the aligned templates, copy and paths and needed no change.

### Lighthouse harness for ins

The journeys' harness adapted to a service with no journey: the URL list comes
from the six registered routes, the seeder finds or creates one address through
the app's own pages, report names come from route paths. Proven locally in
stub mode on 15 September:

| Page | Performance | Accessibility | Best practices |
| --- | --- | --- | --- |
| `/` | 100 | 100 | 100 |
| `/address-book` | 100 | 100 | 100 |
| `/address-book/add` | 100 | 100 | 100 |
| `/address-book/{id}` | 100 | 100 | 100 |
| `/address-book/{id}/edit` | 100 | 100 | 100 |
| `/address-book/{id}/delete` | 100 | 100 | 100 |

## Known caveats

- **The Welsh is machine-drafted.** Every `copy.cy.js` in ins and the
  `copy.unauthorised` block animals took from plants carry the header
  "MACHINE-DRAFT Welsh, not reviewed by a translator". `copy-parity.test.js`
  proves structure, not meaning. No locale toggle exists in any of the three
  services, so every `copyFor({ en, cy })` call resolves `en` and the Welsh is
  unreachable. A translator's review and a locale seam come before any Welsh
  release.
- **The Lighthouse CI job cannot fire on this branch.** `workflow_run`
  triggers read the default branch's workflow files; `lighthouse.yml` exists
  on the branch only. Before its report URL resolves, a repository admin must
  enable GitHub Pages from `gh-pages` on `DEFRA/trade-imports-ins-frontend`
  and accept that the job starts the whole stack, as the journeys' jobs do.
- **`sass` is pinned as a real devDependency in ins.** On Linux, npm installs
  it as an optional peer of `sass-loader` but leaves it out of the lockfile,
  so `npm ci --omit=dev` in the Docker build failed with `Missing:
  sass@1.100.0`. A macOS `npm install` cannot see this and the local ladder
  cannot catch it; only the Docker build in CI can. Neither journey needs it.
- **SonarCloud is invisible to the local ladder.** ins runs Automatic
  Analysis, which reads `.sonarcloud.properties` (added on the branch,
  mirroring plants) and ignores `sonar-project.properties`. Nine ins CI fixes
  were Sonar findings the local ladder had passed.
- **The workspace PR is not a draft.** PR 47 was raised as a normal pull
  request; merging it approves nothing. Its E2E runs against the branch-tagged
  images, so it goes red while a repo's image is mid-republish: four runs
  failed that way on 16 September and the first run to start after all four
  images had published was green.
- **The ins Playwright port collides with the running stack.** The fit suite
  and `serve-static-files.test.js` bind 3002, which the stack's ins container
  holds. Stop the stack or run it with `-e ins-frontend` first.
- **`npm audit` on ins reports 27 non-critical findings** (17 high, 5
  moderate, 5 low), pre-existing plus what `@lhci/cli` adds; `security-audit`
  passes at `critical`. None fixes without `--force`.

## Residual drift

Re-measured on 16 September with `diff -rq` over the checkouts under `repos/`
(the programme's working checkouts again from question 2's stage), after the
countries lazy load landed and ins, animals and the tests repo each took
`main`'s EUDPA-333 address-add handshake. Classes: identical;
import-path-only (none survive); deliberate (a
recorded decision says why); unexplained (the question number says where it
is settled, or the row says no question covers it yet).

### Animals against plants

Byte-equal across `src/auth` (16 files), `src/plugins` (4 files),
`src/server/auth` (5 files), `src/server/router.js` and its test,
`src/server/common/constants`, `src/server/common/helpers/logging`,
`src/server/common/services`, `src/server/common/test-helpers` and
`src/server/app/lib/validate` except the one test named below.

| File | Difference | Class |
| --- | --- | --- |
| `src/server/auth/stub-sign-in.js` | none; the secret is generated per process | identical |
| `src/server/common/constants/status-codes.js` | none; `serviceUnavailable: 503` is in all three | identical |
| `src/server/common/helpers/content-security-policy.test.js` | none; both hit `/health` | identical |
| `src/server/common/helpers/errors.test.js` | animals' page titles read `Page not found - Import notification service - GOV.UK` (animals `main`, `fb9cb317`, DR1 parity); plants adds a 503 test for a reference-data read that will not load, through `/test/refdata-missing` (plants `main`, EUDPA-575); the Boom 503 test is in both | unexplained, no question yet: animals proves the same rejection in `services/run-mode.test.js`, so only plants proves it at page level; the title composition came from `main` |
| `src/server/common/helpers/redis-client.test.js` | key prefix names the repo | deliberate, service-specific |
| `src/server/common/helpers/transport-routing.js`, `.test.js` | animals only | deliberate, journey-only |
| `src/server/app/lib/validate/persists-cleaned-value.test.js` | animals' field is `transportDocumentReference`, plants' `textFieldTwo`; animals' vitest setup installs the live-animals obligation manifest, where a neutral name is not a recognised answer key | deliberate, test fixture |
| `src/server/app/services/countries/` (`index.js`, `client.js`, `stub.js`) | none; both journeys carry EUDPA-575 | identical |
| `src/server/app/services/run-mode.test.js` | three hunks: plants' client block-filter test uses a made-up `BLOCK_ONE` where animals uses the real `GBNAG_SPS_EX`; plants carries a two-line why-comment above the real-mode self-load test; plants' ports fetch-once test also calls `portOptions()` | unexplained, no question yet: plants is the tidier text in all three |
| `src/server/app/services/ports/index.js` | plants extracts a `displayName` helper and adds a third reader, `portOptions()`, returning `{ value, text }` pairs; animals has neither | unexplained, no question yet: plants is the tidier fork; ins has no ports service |
| `src/config/config.js` | nine hunks: port, service name, redirect URLs, key prefix, backend API block | deliberate, service-specific |
| `src/config/nunjucks/context/context.test.js` | service name | deliberate, service-specific |

### ins against the journeys

| File | Difference | Class |
| --- | --- | --- |
| `src/auth/` (16 files) | none | identical |
| `src/plugins/auth.js`, `.test.js` | none | identical |
| `src/plugins/csrf.js` | plants carries a 12-line doc comment, ins one line | deliberate, comment policy |
| `src/plugins/csrf.test.js` | ins boots the real server and posts without a crumb; plants unit-tests the options | deliberate, test shape |
| `src/server/auth/` (`index.js`, `controller.js`, `stub-sign-in.js` and both tests) | none | identical |
| `src/server/router.js` | none; `routes.js` exports `serviceRoutes` in all three | identical |
| `src/server/common/constants/status-codes.js` | none; animals' text in all three | identical |
| `src/server/common/helpers/logging/request-logger.js`, `.test.js` | none; ins's `ignoreFunc` in all three | identical |
| `src/server/common/helpers/pulse.js` | none; `shutdownTimeoutMs` in all three | identical |
| `src/server/common/helpers/errors.js` | none; every message comes from `sharedCopy.errorPage` in all three | identical |
| `src/server/common/helpers/{serve-static-files,start-server}.test.js` | none; plants' shape in all three | identical |
| `src/server/common/helpers/content-security-policy.js`, `.test.js` | ins reads `tradeImportsAnimalsFrontend.baseUrl` and widens `form-action` to `['self', animalsFrontendOrigin]`, and its test asserts both entries; the journeys keep `['self']` and assert only that the header is set. The two journeys are still byte-equal with each other | unexplained: question 30 |
| `src/server/common/helpers/redis-client.test.js` | key prefix names the repo, two lines | deliberate, service-specific |
| `src/server/common/helpers/errors.test.js` | against plants: plants adds the EUDPA-575 reference-data 503 test, which drives a reader ins does not have; against animals: animals' page titles carry `main`'s hyphen-and-GOV.UK composition. ins proves the same 503 page in `features/reference-data-outage.test.js` and a Boom 503 in the test all three share | unexplained: the reader the plants test drives is question 29; the title composition is a candidate for a later ruling |
| `src/server/common/test-helpers/{mock-auth-config,mock-oidc-config,session-auth}.js` | none; `mock-auth.js` is gone from ins | identical |
| `src/server/common/test-helpers/{real-mode,test-server}.js`, `helpers/organisation-id.test.js` | ins only | deliberate |
| `src/server/common/{components/, helpers/actor-helpers.js, helpers/proxy/, helpers/transport-routing.js}` | journeys only | deliberate, journey-only |
| `src/server/common/` other 12 shared files | none | identical |
| `src/server/app/lib/validate/` | none; `persists-cleaned-value.test.js` is journey-only because it drives the engine | identical |
| `src/server/app/services/countries/index.js` | the `ensureLoaded` mechanism is plants' text: module-scope cache, `loaded` flag, stub short-circuit, `Boom.serverUnavailable` with `dataset: 'countries'`. The readers differ: ins keeps `getCountries()` over the full MDM list; plants holds a label map filtered to `GBNAG_SPS_EX` and exports `originLabel`, `originCountries`, `addressCountries` and `countryCodeOf` | deliberate for now: question 29 |
| `src/server/app/services/countries/{client.js,stub.js}` | ins resolves the base URL through convict and sends the `getTraceId()` trace header; the journeys read `process.env.TRADE_IMPORTS_REFERENCE_DATA_URL` and send no header, though their own `address-book/client.js` does. ins seeds a `COUNTRIES` list, plants a `COUNTRY_LABELS` map | deliberate: chassis hardening this programme backports the other way, and the stub seeds are each service's own |
| `src/config/config.js` | service-specific hunks only: port, service name, `defraId.serviceId`, the two redirect URLs, key prefix, the backend API block, and ins's `tradeImportsInsBackendApi` and `tradeImportsAnimalsFrontend` blocks | deliberate, service-specific |
| `src/config/config.test.js` | ins pins its own ports and URLs; the `stubMode` and env-backed boolean blocks are shared | deliberate, test shape |
| `src/config/nunjucks/nunjucks.js` | ins registers `formatDate` and `formatCurrency` filters (`filters/` is ins only); journeys add the MoJ root and `app/sets` where ins has `app/features` | deliberate |
| `src/config/nunjucks/context/context.js` | the session read is byte-equal; ins imports and marks the address-book navigation item and adds `dashboardUrl`, `addressBookUrl` and `crumb`; the journeys add `staleActionRejected` | deliberate, service-specific |

Two chassis files differ for no recorded reason.
`src/server/common/helpers/content-security-policy.js` and its test are
question 30, raised when ins took `main`'s handshake.
`src/server/common/helpers/errors.test.js` holds two differences: plants'
reference-data 503 test drives a reader question 29 owns, and animals'
page-title composition arrived from `main` and has no question yet.
[`surfaces.json`](surfaces.json) names every shared chassis file
with the rule it must satisfy (`identical`, `identical-except`, `only-in`,
`deliberate` with a reason); a `tim workspace drift` command that applies it
per branch and reports unlisted differences is proposed in question 19 and
not built.

## Where everything is

- Branch: `feat/NO_JIRA-frontend-alignment` in every repo below, the same
  name everywhere as the workspace's branch-parity rule requires.
- Pull requests: ins
  [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27), animals
  [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339),
  plants [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69),
  tests [#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227),
  workspace [#47](https://github.com/DEFRA/trade-imports-workspace/pull/47).
- This report: `workareas/shared/frontend-alignment/report.md` in the
  workspace repo, on the branch.
- Stage state: [`stages.json`](stages.json) (twenty-three stages with status,
  commit, PRs, notes and open questions: nineteen done, four ruling stages
  waiting); the eighteen plans under
  [`plans/`](plans/); every agent's return value in
  `run-wf_a52aa0bf-91f.journal.jsonl`; the manifest in `surfaces.json`.
- The run record, for reuse of the workflow:
  [`docs/analysis/frontend-alignment-workflow-run.md`](../../../docs/analysis/frontend-alignment-workflow-run.md).
- Working checkouts, all on the branch, under `repos/`: ins, animals, plants
  and tests, the programme's working checkouts again from question 2's stage.
  The clones under `workareas/clones/` are retired.
- A plants stash still waits on `main` in `repos/trade-imports-plants-frontend`:
  `stash@{0}: On main: pre-alignment: uncommitted obligation-graph script +
  package.json script`. Pop it before working on plants `main` there.
