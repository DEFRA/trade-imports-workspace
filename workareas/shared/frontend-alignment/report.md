# Frontend alignment: what needs a ruling

Three Node frontends (ins, animals, plants) were brought into one shape on one
branch, `feat/NO_JIRA-frontend-alignment`, behind draft pull requests that are
never merged; merging the workspace PR approves nothing. This page leads with
what the team must decide, then the calls the team may reverse. Every fact was
re-checked against the code and the PRs on 16 September 2026.

## Open questions

Each names what is in play, the options with the count of repos on each side,
and what happens if nobody answers.

### Security-sensitive chassis behaviour

5. **Should the journeys take ins's request-logger `ignoreFunc`?** In play:
   `src/server/common/helpers/logging/request-logger.js` in animals and
   plants; ins skips `/public`, `/health` and `/favicon.ico`. One against two.
   If nobody answers: health probes and static assets keep filling the
   journey logs.

### Shape choices the direction rule made, now backport candidates

| # | Question | Count | If nobody answers |
| --- | --- | --- | --- |
| 12 | Journeys move error-page messages into `sharedCopy.errorPage` (`helpers/errors.js`) and revisit `Bad Request` and `Unauthorized`? | one against two | non-GDS English stays hard-coded in two repos |
| 13 | Three shapes for countries and ports: animals `main` loads on first read (EUDPA-575, on the branch since the 16 September merge); plants primes at boot (`app/routes.js`); ins fetches per request. Which do plants and ins take? | three ways | a reference-data outage keeps stopping plants' start-up and ins keeps one fetch per request |
| 14 | `controller.js` or `<page>.controller.js` in a multi-page group? | two against one for `controller.js` | plants' groups stay the odd one out |
| 15 | One shared fit fixture with an axe helper (ins `address-book/fit/address-form.js`) or an `AxeBuilder` call per spec? | one against two | the dashboard spec keeps importing across a feature boundary |
| 16 | Backport `requiredEmail` (`lib/validate/validators.js`) to the journeys? | one against two | the validate lib differs by one primitive |

### Tooling and dependencies

| # | Question | Count | If nobody answers |
| --- | --- | --- | --- |
| 17 | Should ins take `postinstall: npm run setup:husky`, so the pre-commit hook (audit, format, lint, unit suite) runs on every clone? ins audits at `critical` where plants runs `high`; align that first. | two against one | the ins hook stays opt-in |
| 18 | Backport `install:pinned-npm` (regenerates the lockfile under the pinned npm) to the journeys? | one against two | the journeys keep the documented `npx` route only |
| 19 | Where does [`surfaces.json`](surfaces.json) live (`docs/reference/` or `tim/`), and is the proposed `tim workspace drift` command built to report every chassis file differing without a recorded reason? | workspace-only | the next cross-repo edit drifts by two lines, as the backport commit did before question 2 closed it, with nothing to say so |
| 20 | Delete plants' dead `test-helpers/component-helpers.js`? ins deleted its copy with the two components it served; animals never had one; plants' has no importer and a dangling `#/` import. | plants only | dead code stays |
| 21 | Add `cleanup-e2e-reports.yml` to ins (the twelve-line `gh-pages` pruner animals and plants run)? The Lighthouse port left it out because the audit does not depend on it. | two against one | ins's `gh-pages` gains one `lighthouse/<branch>/` directory per branch |
| 22 | Declare `joi` (imported by `lib/validate/validators.js` and `address-id-params.js`, resolved through `@hapi/bell` and `@hapi/catbox-redis`) or accept the hoist? | three agree on the hoist | a phantom dependency until a hapi upgrade drops it |
| 23 | Should ins take `eslint-plugin-sonarjs` and the journeys' fit-spec lint globals? | two against one | SonarCloud finds in CI what local lint finds first in the journeys |
| 25 | Adopt the journeys' names in `status-codes.js` (`redirectFound`, `payloadTooLarge`) and `pulse.js` (`shutdownTimeoutMs`)? | two against one | naming drift only |
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
| `trade-imports-ins-frontend` | [#27](https://github.com/DEFRA/trade-imports-ins-frontend/pull/27) | draft, open; all six checks green (PR checks, FIT tests, SonarCloud, three publish jobs) at `5648dd3`, 16 September 12:23 |
| `trade-imports-animals-frontend` | [#339](https://github.com/DEFRA/trade-imports-animals-frontend/pull/339) | draft, open; all checks green, including E2E, Lighthouse CI and SonarCloud, at `f2f27246`, 16 September 12:24 |
| `trade-imports-plants-frontend` | [#69](https://github.com/DEFRA/trade-imports-plants-frontend/pull/69) | draft, open; all ten checks green at `3747bfe`, 16 September 12:25; plants `main` has not moved since |
| `trade-imports-animals-tests` | [#227](https://github.com/DEFRA/trade-imports-animals-tests/pull/227) | draft, open; all checks green, including E2E, at `849558a`, 16 September 11:33 |
| `trade-imports-workspace` | [#47](https://github.com/DEFRA/trade-imports-workspace/pull/47) | **not a draft**, open; E2E green on every run since the Floci fix reached the branch, latest completed [run 35073631134](https://github.com/DEFRA/trade-imports-workspace/actions/runs/35073631134), 16 September 09:24; the run against the merged branch images, [35076469742](https://github.com/DEFRA/trade-imports-workspace/actions/runs/35076469742), had two of three shards green and one still running when this was written |

The ins branch changes 258 files (23,213 insertions, 11,954 deletions, mostly
the lockfile); animals 35; plants 26; tests 6. No shared package, no cross-repo
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
                            success-banner}.js  {copy/, view-model/, fit/}
  auth/  common/{constants/, helpers/, services/mode.js, test-helpers/}
  health/  router.js  server.js
fit/{sign-in.js, smoke.fit.spec.js}  scripts/{npm-version, check-workspace-stack}.js
scripts/lighthouse/  tests/lighthouse/  lighthouserc.cjs  .sonarcloud.properties
webpack.config.js  postcss.config.js  .dependency-cruiser.cjs
```

Unit suite: 49 files and 242 tests before, 57 files and 542 tests after.
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
  request; merging it approves nothing. Its E2E has been green since the
  Floci healthcheck fix reached the branch (question 27, closed).
- **The ins Playwright port collides with the running stack.** The fit suite
  and `serve-static-files.test.js` bind 3002, which the stack's ins container
  holds. Stop the stack or run it with `-e ins-frontend` first.
- **`npm audit` on ins reports 27 non-critical findings** (17 high, 5
  moderate, 5 low), pre-existing plus what `@lhci/cli` adds; `security-audit`
  passes at `critical`. None fixes without `--force`.
- **`joi` is imported and undeclared in all three repos** (question 22).

## Residual drift

Re-measured on 16 September with `diff -rq` over the checkouts under `repos/`
(the programme's working checkouts again from question 2's stage), after the
authentication convergence landed. Classes: identical;
import-path-only (none survive); deliberate (a
recorded decision says why); unexplained (the question number says where it
is settled).

### Animals against plants

Byte-equal across `src/auth` (16 files), `src/plugins` (4 files),
`src/server/auth` (5 files), `src/server/router.js` and its test,
`src/server/common/services` and `src/server/common/test-helpers`.

| File | Difference | Class |
| --- | --- | --- |
| `src/server/auth/stub-sign-in.js` | none; the secret is generated per process | identical |
| `src/server/common/constants/status-codes.js` | animals has `serviceUnavailable: 503` from `main` (EUDPA-575) | unexplained, question 13 |
| `src/server/common/helpers/content-security-policy.test.js` | animals hits `/`, plants `/health` | deliberate, plants is the tidier fork |
| `src/server/common/helpers/errors.test.js` | animals proves the 503 page for a reference-data read that will not load | unexplained, question 13 |
| `src/server/common/helpers/redis-client.test.js` | key prefix names the repo | deliberate, service-specific |
| `src/server/common/helpers/transport-routing.js`, `.test.js` | animals only | deliberate, journey-only |
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
| `src/server/common/constants/status-codes.js` | `redirect` against `redirectFound` plus `payloadTooLarge`; animals also has `serviceUnavailable` | unexplained, questions 25 and 13 |
| `src/server/common/helpers/logging/request-logger.js` | ins passes `ignoreFunc` | unexplained, ins ahead, question 5 |
| `src/server/common/helpers/pulse.js` | `tenSeconds` against `shutdownTimeoutMs` | unexplained, question 25 |
| `src/server/common/helpers/errors.js` | ins reads messages from `sharedCopy.errorPage`; journeys hard-code English | deliberate, ins ahead, question 12 |
| `src/server/common/helpers/{errors,content-security-policy,redis-client,serve-static-files,start-server}.test.js` | test shape | deliberate |
| `src/server/common/test-helpers/{mock-auth-config,mock-oidc-config,session-auth}.js` | none; `mock-auth.js` is gone from ins | identical |
| `src/server/common/test-helpers/{real-mode,test-server}.js`, `helpers/organisation-id.test.js` | ins only | deliberate |
| `src/server/common/{components/, helpers/actor-helpers.js, helpers/proxy/, helpers/transport-routing.js}` | journeys only | deliberate, journey-only |
| `src/server/common/` other 13 shared files | none | identical |
| `src/config/config.js` | service-specific hunks only: port, service name, `defraId.serviceId`, the two redirect URLs, key prefix, the backend API block, and ins's `tradeImportsInsBackendApi` and `tradeImportsAnimalsFrontend` blocks | deliberate, service-specific |
| `src/config/config.test.js` | ins pins its own ports and URLs; the `stubMode` and env-backed boolean blocks are shared | deliberate, test shape |
| `src/config/nunjucks/nunjucks.js` | ins registers `formatDate` and `formatCurrency` filters (`filters/` is ins only); journeys add the MoJ root and `app/sets` where ins has `app/features` | deliberate |
| `src/config/nunjucks/context/context.js` | the session read is byte-equal; ins imports and marks the address-book navigation item and adds `dashboardUrl`, `addressBookUrl` and `crumb`; the journeys add `staleActionRejected` | deliberate, service-specific |

Four files differ for no recorded reason, all settled by questions 5, 13 and
25. [`surfaces.json`](surfaces.json) names every shared chassis file
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
  commit, PRs, notes and open questions: seventeen done, six ruling stages
  waiting); the sixteen plans under
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
