# s14-lighthouse — give ins the journeys' Lighthouse harness

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit/Write tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (checked out, level with `origin`, clean tree, HEAD `b28a84b`).
Rollback is `git stash push -u` only. Nothing in this stage touches animals or plants.

Baseline captured by the planner on that HEAD (logs under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/`):

- `s14-baseline-format-check.log` — clean.
- `s14-baseline-lint.log` — clean (55 modules cruised, no violations).
- `s14-baseline-test.log` — **55 files, 494 tests; 493 passed, 1 failed** — the one failure is
  `src/server/common/helpers/serve-static-files.test.js` with `listen EADDRINUSE: address already in use 0.0.0.0:3002`,
  because the workspace stack is up and its `trade-imports-ins-frontend` container holds port 3002 (that test starts
  the real server on the configured port). The same suite was 494/494 in `s11-docs-ins-test.log` with the port free.
  **This is environmental, not a code failure, and it is not this stage's to fix** — see §8 step 9 for what to do
  when it recurs.

Reference files (Read tool paths under `/Users/samfarrington/git/defra/trade-imports-workspace/`; Bash paths under
`~/git/defra/trade-imports-workspace/`). The two journeys' Lighthouse files were diffed at planning time: **animals'
and plants' `lighthouserc.cjs`, `tests/lighthouse/auth-setup.cjs`, `scripts/lighthouse/flag-simple-findings.cjs` and
`scripts/lighthouse/journey-client.js` are byte-identical**, and their `.github/workflows/lighthouse.yml` differ only
in the `repository:` line. Plants is the reference wherever the two differ (its `audit-targets.js` exports
`auditableRoutePaths`; its `run-audit.js` and `seed-audit-targets.js` carry empty-route-table branches).

| reference | used for |
|---|---|
| `repos/trade-imports-plants-frontend/lighthouserc.cjs` | N1, copied with one message changed |
| `repos/trade-imports-plants-frontend/scripts/lighthouse/audit-targets.js` + `.test.js` | N2/N3 shape (the `{journeyId}` machinery becomes `{id}`; `FILLED_BY` goes) |
| `repos/trade-imports-plants-frontend/scripts/lighthouse/journey-client.js` | N4, renamed `page-client.js`, verbatim body |
| `repos/trade-imports-animals-frontend/scripts/lighthouse/seed-address-book.js` | the "find or create" idiom N5 follows, done through the app's pages instead of the API |
| `repos/trade-imports-plants-frontend/scripts/lighthouse/seed-notification.js` + `.test.js` | the shape N5/N6 replace: one seeded record, not five notification shapes |
| `repos/trade-imports-animals-frontend/scripts/lighthouse/seed-audit-targets.js` | N7 (animals' version: no empty-table branch, which ins cannot reach) |
| `repos/trade-imports-animals-frontend/scripts/lighthouse/run-audit.js` | N8 (animals' version, one comment adapted) |
| `repos/trade-imports-plants-frontend/scripts/lighthouse/flag-simple-findings.cjs` | N9, byte-for-byte |
| `repos/trade-imports-plants-frontend/tests/lighthouse/auth-setup.cjs` | N10, byte-for-byte |
| `repos/trade-imports-animals-frontend/.github/workflows/lighthouse.yml` | N11, one line changed |
| `repos/trade-imports-plants-frontend/package.json` | E1 (scripts, pins, overrides) |
| `repos/trade-imports-animals-frontend/.gitignore` | E2 (`.lighthouse/`) |
| `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/lighthouse.md` | N12's voice |
| `repos/trade-imports-plants-frontend/README.md` lines 233–241 and `src/server/app/docs/README.md` line 55 | E3, E4 |

Current ins files the stage reads (never edits, except where §2 says so):
`src/server/app/features/index.js` (`allRoutes`), `src/server/app/routes.test.js` (pins the nine routes, six of them
GET), `src/server/app/shared/paths.js`, `src/server/app/features/address-book/fields.js` (`FIELDS`, `FIELD_RULES`,
`addressRules`), `src/server/app/features/address-book/add/template.njk` (form posts `crumb` + the nine fields),
`src/server/app/features/address-book/list/controller.js` (`viewLink`: `<a class="govuk-link"
href="/address-book/{id}">View<span class="govuk-visually-hidden"> {name}</span></a>`; `?q=` searches by name),
`src/server/app/shared/layout.njk` (`<meta name="csrf-token" content="{{ crumb }}">`), `src/plugins/auth.js`
(`redirectTo` sends an unauthenticated request to `/auth/stub-sign-in` in stub mode, `/auth/sign-in` otherwise),
`src/server/common/test-helpers/real-mode.js` (`refuseOutboundHttp`), `playwright.config.js` (port 3002),
`.github/workflows/publish-branch.yml` (workflow name `Publish Branch Image`), `README.md`,
`src/server/app/docs/README.md`.

---

## 0. Decisions (settled here so the implementor never has to choose)

| # | Question | Decision |
|---|---|---|
| D1 | Which journey's scripts are the base. | **Plants' `audit-targets.js` shape** (it has `auditableRoutePaths`, which the doc and the tests lean on) and **animals' `seed-audit-targets.js` / `run-audit.js`** (no "no routes registered" branches — ins's route table is pinned non-empty by `routes.test.js`, so plants' empty-list branches would be dead, untestable code here). `lighthouserc.cjs`, `auth-setup.cjs`, `flag-simple-findings.cjs` and the client are identical in both journeys, so there is nothing to choose. |
| D2 | `{journeyId}` → `{id}`; `FILLED_BY` dropped. | ins has one parameter, `{id}`, on three of its six GET routes, and one seeded record answers all three. `FILLED_BY` (which seeded notification a route is audited on) is journey machinery with nothing to key on — gone. `SKIPPED` and `QUERY` stay as **empty** maps with the "still routed" guard, so a future ins route that must not be audited (a JSON endpoint, say) or that needs a query string has the same two levers the journeys' docs describe. The tests exercise both by registering entries for the length of a test (plants' `withEntries` idiom). |
| D3 | Report names. | Derived from the **route path**, not the URL: `{id}` becomes the literal segment `id`, so `/address-book/{id}` → `address_book_id`, `/address-book/{id}/edit` → `address_book_id_edit`, `/address-book` → `address_book`, `/` → `home`. The journeys derive names from the URL with the seeded ids stripped, which for ins would name both the list and the view page `address_book` and trip the collision guard. `reportNames(origin, addressId)` still returns `{ [url]: name }`, which is the contract `run-audit.js` reads, so that file stays animals' shape. |
| D4 | What the seeder does. | **Find or create, through the app's own pages, one address named `Lighthouse seed address`.** It searches `/address-book?q=Lighthouse%20seed%20address` and picks the row whose visually-hidden name matches (in stub mode the stub ignores `q` and returns every row, so the match is by name, not by trusting the filter). Absent, it GETs `/address-book/add` for the crumb, POSTs the nine fields plus `crumb`, expects a 302 to `/address-book`, and searches again. A long-lived stack or a stub process therefore reuses one record rather than growing the book by one per run; CI's fresh stack creates it. Every one of the nine fields is filled (the two optional ones too), so no optional-field rule can be the reason the API refuses it. |
| D5 | One signed-in cookie jar, not two. | The journeys sign in twice — once to seed, once to prove the URLs render in a session that has **not** walked the journey. ins has no journey state in the session (the success banner is read once by the list fetch the seeder itself makes), so one jar serves both the seed and the render check. One puppeteer launch instead of two. |
| D6 | Default origin. | `http://localhost:3002` — the port `config.js` defaults to, the port the stack maps the ins container to, and the port `npm run fit:start` serves on. Override with `LIGHTHOUSE_BASE_URL` as the journeys do. |
| D7 | Sign-in in both modes with one `auth-setup.cjs`. | Byte-for-byte the journeys' file. In the stack (real mode) the first URL bounces to the Defra ID stub at `localhost:3007`, whose form the script fills as crn `2100010101` (a single-org user — org `5900001`, the same org animals' seeder writes to). In stub mode the app's `redirectTo` sends the browser to `/auth/stub-sign-in`, which signs the session and redirects back; the script's "not on the identity provider → look for the form, find none" branch then does nothing, which is exactly right. No ins-specific branch is needed. |
| D8 | Dependencies and overrides. | **Plants' pins, exactly:** `@lhci/cli` 0.15.1, `puppeteer` 25.6.0 in `devDependencies`; **and** plants' two `overrides` entries `lighthouse: { ".": "13.4.1", "ws": "7.5.11" }` and `puppeteer-core: { "ws": "8.21.0" }`, verbatim. The overrides exist so `npm audit` stays clean under the pinned Lighthouse; ins runs `security-audit` in `check-pull-request.yml`, and both journeys prove the combination installs. `cheerio` (the client's HTML parser) is already an ins devDependency at 1.2.0. |
| D9 | `cleanup-e2e-reports.yml`. | **Not added.** The brief adds it only if the animals Lighthouse workflow depends on it, and it does not: `lighthouse.yml` publishes to `gh-pages` under `lighthouse/<branch-tag>/` and finishes; `cleanup-e2e-reports.yml` is a separate hygiene workflow (PR close + nightly) that prunes stale `e2e/` and `lighthouse/` directories. Consequence recorded in the stage notes: ins's `gh-pages` will keep one `lighthouse/<tag>/` directory per branch until that workflow is added. |
| D10 | Test idiom. | ins's: `describe` / `test` (not `it`), "Should …" descriptions, nock at the network boundary for the seeder (invariant 8) — `refuseOutboundHttp()` from `real-mode.js` and a `nock(ORIGIN)` scope standing in for the running app. Pure tests for the URL derivation. |
| D11 | Comments in copied files. | The journeys' files carry short "why" comments (why the run step renames reports, why sign-in is needed on the first URL only). Those come across as they are, adapted where they name a journey id; nothing is added and no migration or rename comment is written (invariant 6). |
| D12 | The unit suite's port collision. | Out of scope. `serve-static-files.test.js` binds the real port; making it bind port 0 would be a `src/server/common` change that drifts from the journeys' copy of that test. The stack must not hold 3002 while the ladder's `test` rung runs — the parent owns the stack (§8 step 9). |
| D13 | Where the doc lives and what else links it. | `src/server/app/docs/lighthouse.md` (ins has no set, so it sits beside the other app docs), linked from `src/server/app/docs/README.md`'s Guides list, and a `## Lighthouse` section in the root `README.md` between "Local stack" and "SonarCloud" with a TOC entry — plants' shape. `testing.md`, `add-a-page.md`, `architecture.md` are untouched: a new page joins the audit by being a registered GET route, and the plants recipe says nothing about Lighthouse either. |

---

## 1. Moves

None. No file moves, renames or deletions. Everything below is a new file or an edit to an existing one.

---

## 2. Edits

### E1 — `package.json`

Three insertions. Do not reorder anything else; do not touch `engines`, `packageManager`, `dependencies` or the
existing `overrides` entries.

**Scripts** — insert these three lines between `"test": …` and `"test:watch": …` (plants puts them in that position):

```json
    "lighthouse": "run-s lighthouse:targets lighthouse:run",
    "lighthouse:targets": "node scripts/lighthouse/seed-audit-targets.js",
    "lighthouse:run": "node scripts/lighthouse/run-audit.js",
```

**devDependencies** — insert, keeping the block alphabetical:

```json
    "@lhci/cli": "0.15.1",
```
between `"@defra/hapi-connect": "1.0.1",` and `"@playwright/test": "1.61.0",`; and

```json
    "puppeteer": "25.6.0",
```
between `"prettier": "3.8.2",` and `"sass-embedded": "1.100.0",`.

**overrides** — the block becomes (existing two entries untouched, two added after them):

```json
  "overrides": {
    "brace-expansion": "5.0.8",
    "minimatch": "10.2.4",
    "lighthouse": {
      ".": "13.4.1",
      "ws": "7.5.11"
    },
    "puppeteer-core": {
      "ws": "8.21.0"
    }
  }
```

Then regenerate the lockfile under the pinned npm (§8 step 2). `package-lock.json` is expected to gain the
`@lhci/cli`, `lighthouse`, `puppeteer`, `puppeteer-core` trees and nothing to be removed.

### E2 — `.gitignore`

Insert `.lighthouse/` directly after the existing `.lighthouseci/` line (animals' file has exactly this line there).
`lighthouse-report/` is already present — do not add it twice. The `.lighthouse/targets.json` the seeder writes must
never be committed; it names a live address id.

### E3 — `README.md`

Two edits.

1. In the table of contents (lines 30–37), insert `- [Lighthouse](#lighthouse)` between `- [Docker](#docker)` and
   `- [SonarCloud](#sonarcloud)`.
2. Insert this section between the end of `### Local stack` (the paragraph ending "…silently picks up someone
   else's image.") and `## SonarCloud`:

```markdown
## Lighthouse

`npm run lighthouse` seeds its audit targets from the app's own registered
routes, then runs Lighthouse CI against them.

Every GET route the service registers is audited — the dashboard, the
address book list, add, view, edit and delete — on one address the setup
step creates through the app's own pages. The
[Lighthouse guide](src/server/app/docs/lighthouse.md) covers how to run it
against a locally started app, the score floors and the CI workflow.
```

### E4 — `src/server/app/docs/README.md`

In the `## Guides` list, add `- [Lighthouse](lighthouse.md)` after `- [Testing](testing.md)`.

---

## 3. New files

Write each with the Write tool at the path given. Where a file is "byte-for-byte", copy the reference file's content
exactly — read it with the Read tool and write it unchanged.

### N1 — `lighthouserc.cjs` (repo root)

Plants' `lighthouserc.cjs` verbatim except one string: the thrown message's second line changes from
`'step can seed a notification and derive the URL list'` to `'step can seed an address and derive the URL list'`.
Everything else — the three assertions (performance 0.6, accessibility 0.7, best-practices 0.7, **no SEO**), the
desktop preset, `numberOfRuns: 1`, the puppeteer script path, the filesystem upload with
`%%PATHNAME%%.report.%%EXTENSION%%` — is identical.

### N2 — `scripts/lighthouse/audit-targets.js`

```js
import { allRoutes } from '../../src/server/app/features/index.js'

const ID_PARAM = '{id}'
const OTHER_PARAM = /\{(?!id})[^}]+}/
const ROUTE_PARAM_BRACES = /[{}]/g
const NOT_FILENAME_SAFE = /[^a-z0-9]+/gi
const ROOT_REPORT_NAME = 'home'

export const TARGETS_FILE = new URL(
  '../../.lighthouse/targets.json',
  import.meta.url
)

/** GET routes Lighthouse deliberately does not audit. Every entry is checked
 * against the live route table, so a stale reason fails the build rather than
 * quietly shrinking the audit. Empty today — every page the service registers
 * is audited. */
export const SKIPPED = new Map()

/** Query strings a route needs before it will render rather than redirect.
 * Empty today — every audited page renders on its path alone. */
export const QUERY = new Map()

const getPathsOf = (routes) =>
  routes.filter(({ method }) => method === 'GET').map(({ path }) => path)

const assertStillRouted = (paths, listed, label) => {
  for (const path of listed) {
    if (!paths.includes(path)) {
      throw new Error(
        `Lighthouse ${label} names ${path}, which the app no longer serves as a GET route`
      )
    }
  }
}

export const assertTargetsAreCurrent = (routes = allRoutes) => {
  const paths = getPathsOf(routes)
  assertStillRouted(paths, SKIPPED.keys(), 'skip list')
  assertStillRouted(paths, QUERY.keys(), 'query list')

  const unsatisfiable = paths.filter(
    (path) => !SKIPPED.has(path) && OTHER_PARAM.test(path)
  )
  if (unsatisfiable.length > 0) {
    throw new Error(
      `Lighthouse cannot build a URL for ${unsatisfiable.join(', ')} — satisfy the ` +
        'extra path parameter or add the route to SKIPPED with a reason'
    )
  }
}

/** The route paths this run will audit, still carrying `{id}` because the
 * address behind it is created by the setup step, not known here. */
export const auditableRoutePaths = (routes = allRoutes) => {
  assertTargetsAreCurrent(routes)
  return getPathsOf(routes).filter((path) => !SKIPPED.has(path))
}

const requireAddressId = (addressId, path) => {
  if (!addressId) {
    throw new Error(
      `Lighthouse audits ${path} on the seeded address, which the setup step did not create`
    )
  }
  return encodeURIComponent(addressId)
}

const resolvePath = (path, addressId) =>
  path.includes(ID_PARAM)
    ? path.replace(ID_PARAM, requireAddressId(addressId, path))
    : path

export const auditPaths = (addressId, routes = allRoutes) =>
  auditableRoutePaths(routes).map(
    (path) => `${resolvePath(path, addressId)}${QUERY.get(path) ?? ''}`
  )

export const auditUrls = (origin, addressId, routes = allRoutes) =>
  auditPaths(addressId, routes).map((path) => new URL(path, origin).toString())

/** The report filename a route earns, taken from the route path rather than
 * the URL so the seeded address id never reaches a filename. Reports then
 * overwrite their predecessor instead of piling up a fresh set on every run. */
export const reportName = (routePath) => {
  const name = routePath
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => segment.replace(ROUTE_PARAM_BRACES, ''))
    .join('_')
    .replace(NOT_FILENAME_SAFE, '_')
  return name === '' ? ROOT_REPORT_NAME : name
}

export const reportNames = (origin, addressId, routes = allRoutes) => {
  const paths = auditableRoutePaths(routes)
  const urls = auditUrls(origin, addressId, routes)
  const taken = new Map()
  const names = {}
  for (const [index, path] of paths.entries()) {
    const url = urls[index]
    const name = reportName(path)
    if (taken.has(name)) {
      throw new Error(
        `Lighthouse would write both ${taken.get(name)} and ${url} to ${name}.report.html — ` +
          'one of the two routes needs a path the other does not share'
      )
    }
    taken.set(name, url)
    names[url] = name
  }
  return names
}
```

What changed from plants and why: `JOURNEY_PARAM`/`journeyIds`/`FILLED_BY`/`DEFAULT_SHAPE` are gone (D2); the
`{id}` substitution is `encodeURIComponent`ed as `paths.js` does; `reportName` takes a route path (D3) and
`reportNames` takes `(origin, addressId, routes)` and zips paths with URLs. The two guard messages are the plants
wording so the doc's "how to add a page" reads the same in all three repos.

### N3 — `scripts/lighthouse/audit-targets.test.js`

```js
import { describe, expect, test } from 'vitest'

import { allRoutes } from '../../src/server/app/features/index.js'
import {
  assertTargetsAreCurrent,
  auditableRoutePaths,
  auditPaths,
  auditUrls,
  QUERY,
  reportName,
  reportNames,
  SKIPPED
} from './audit-targets.js'

const ORIGIN = 'http://localhost:3002'
const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'

const DASHBOARD_PATH = '/'
const LIST_PATH = '/address-book'
const ADD_PATH = '/address-book/add'
const VIEW_PATH = '/address-book/{id}'
const EDIT_PATH = '/address-book/{id}/edit'
const DELETE_PATH = '/address-book/{id}/delete'

const REGISTERED_PATHS = [
  DASHBOARD_PATH,
  LIST_PATH,
  ADD_PATH,
  VIEW_PATH,
  EDIT_PATH,
  DELETE_PATH
]

const STATUS_PATH = '/address-book/{id}/status'

const withRoute = (path) => [...allRoutes, { method: 'GET', path }]

/** The two maps are empty until a page needs them, so a test registers the
 * entries it needs for its own length and takes them back out again. */
const withEntries = (map, entries, run) => {
  for (const [key, value] of entries) {
    map.set(key, value)
  }
  try {
    return run()
  } finally {
    for (const [key] of entries) {
      map.delete(key)
    }
  }
}

describe('#auditableRoutePaths', () => {
  test('Should name every GET route the service registers today, id unsubstituted', () => {
    expect(auditableRoutePaths()).toEqual(REGISTERED_PATHS)
  })

  test('Should leave out a route the skip list names', () => {
    const paths = withEntries(
      SKIPPED,
      [[STATUS_PATH, 'polling endpoint — JSON, not a page']],
      () => auditableRoutePaths(withRoute(STATUS_PATH))
    )

    expect(paths).toEqual(REGISTERED_PATHS)
  })
})

describe('#auditPaths', () => {
  test('Should audit every page the service registers today on the seeded address', () => {
    expect(auditPaths(ADDRESS_ID)).toEqual([
      DASHBOARD_PATH,
      LIST_PATH,
      ADD_PATH,
      `/address-book/${ADDRESS_ID}`,
      `/address-book/${ADDRESS_ID}/edit`,
      `/address-book/${ADDRESS_ID}/delete`
    ])
  })

  test('Should audit a page the moment the app registers a GET route for it', () => {
    expect(auditPaths(ADDRESS_ID, withRoute('/brand-new'))).toContain(
      '/brand-new'
    )
  })

  test('Should carry the query string a route needs before it will render', () => {
    const paths = withEntries(QUERY, [[LIST_PATH, '?page=2']], () =>
      auditPaths(ADDRESS_ID)
    )

    expect(paths).toContain(`${LIST_PATH}?page=2`)
  })

  test('Should refuse to audit an address page when no address was seeded', () => {
    expect(() => auditPaths(undefined)).toThrow(
      /audits \/address-book\/\{id} on the seeded address, which the setup step did not create/
    )
  })
})

describe('#auditUrls', () => {
  test('Should resolve every path against the origin', () => {
    expect(auditUrls(ORIGIN, ADDRESS_ID)).toEqual(
      auditPaths(ADDRESS_ID).map((path) => `${ORIGIN}${path}`)
    )
  })
})

describe('#assertTargetsAreCurrent', () => {
  test('Should pass against the routes the app registers today', () => {
    expect(() => assertTargetsAreCurrent()).not.toThrow()
  })

  test('Should reject a skip list naming a route the app no longer serves', () => {
    expect(() =>
      withEntries(SKIPPED, [[STATUS_PATH, 'gone']], () =>
        assertTargetsAreCurrent()
      )
    ).toThrow(/skip list names .*, which the app no longer serves/)
  })

  test('Should reject a query entry naming a route the app no longer serves', () => {
    expect(() =>
      withEntries(QUERY, [[STATUS_PATH, '?page=2']], () =>
        assertTargetsAreCurrent()
      )
    ).toThrow(/query list names .*, which the app no longer serves/)
  })

  test('Should refuse a new route whose extra path parameter nothing can satisfy', () => {
    expect(() =>
      assertTargetsAreCurrent(withRoute('/address-book/{id}/lines/{lineId}'))
    ).toThrow(
      /cannot build a URL for \/address-book\/\{id}\/lines\/\{lineId}/
    )
  })
})

describe('#reportName', () => {
  test('Should name the report for the service start page', () => {
    expect(reportName(DASHBOARD_PATH)).toBe('home')
  })

  test('Should name a report after its route, with the id parameter as a plain segment', () => {
    expect(reportName(LIST_PATH)).toBe('address_book')
    expect(reportName(VIEW_PATH)).toBe('address_book_id')
    expect(reportName(EDIT_PATH)).toBe('address_book_id_edit')
  })
})

describe('#reportNames', () => {
  test('Should name every audited URL, and never with the seeded address id', () => {
    const urls = auditUrls(ORIGIN, ADDRESS_ID)
    const names = reportNames(ORIGIN, ADDRESS_ID)

    expect(Object.keys(names)).toEqual(urls)
    expect(Object.values(names)).toEqual([
      'home',
      'address_book',
      'address_book_add',
      'address_book_id',
      'address_book_id_edit',
      'address_book_id_delete'
    ])
    expect(
      Object.values(names).filter((name) => name.includes(ADDRESS_ID))
    ).toEqual([])
  })

  test('Should give a page the same report name whichever address is seeded', () => {
    const other = '000000000000000000000001'

    expect(Object.values(reportNames(ORIGIN, other))).toEqual(
      Object.values(reportNames(ORIGIN, ADDRESS_ID))
    )
  })

  test('Should refuse two routes that would overwrite each other', () => {
    expect(() =>
      reportNames(ORIGIN, ADDRESS_ID, withRoute('/address-book/id'))
    ).toThrow(/would write both .* to address_book_id\.report\.html/)
  })
})
```

Vitest picks this up on its default include (`scripts/` is not excluded in `vitest.config.js`); `coverage.include`
is `src/**` so it adds no coverage rows. `allRoutes` is importable under the suite's `STUB_MODE=true` — `routes.test.js`
imports it the same way.

### N4 — `scripts/lighthouse/page-client.js`

Plants' `scripts/lighthouse/journey-client.js` verbatim, with the one export renamed `createJourneyClient` →
`createPageClient`. ins has no journey; the client walks pages. Body unchanged: cookie jar seeded from puppeteer's
cookies, `redirect: 'manual'`, `document(path)` returning `{ status, location, $, crumb, heading }` with `crumb`
read from `meta[name="csrf-token"]` (which `shared/layout.njk` renders) and `heading` from the first `h1`;
`submit(path, fields, crumb)` posting `application/x-www-form-urlencoded` with `crumb` first.

### N5 — `scripts/lighthouse/seed-address.js`

```js
import {
  addressAddPath,
  addressBookPath
} from '../../src/server/app/shared/paths.js'

const HTTP_OK = 200
const HTTP_FOUND = 302

/** The one address the audit reads the `{id}` pages on, named so a run finds
 * the record an earlier run created rather than adding another. Every field
 * is filled, the optional two included, so no field rule can be why the
 * address book refuses it. */
export const SEED_ADDRESS = {
  name: 'Lighthouse seed address',
  addressLine1: '1 Audit Street',
  addressLine2: 'Unit 1',
  townOrCity: 'London',
  county: 'Greater London',
  postcode: 'SW1A 1AA',
  countryCode: 'GB',
  phone: '01632 960000',
  email: 'lighthouse@example.com'
}

const seedSearchPath = () =>
  `${addressBookPath()}?q=${encodeURIComponent(SEED_ADDRESS.name)}`

export const addressIdIn = (href) => decodeURIComponent(href.split('/').at(-1))

const isSeedLink = (link) =>
  link.find('.govuk-visually-hidden').text().trim() === SEED_ADDRESS.name

/** The stub ignores the search and lists every row, so the row is matched by
 * name here rather than trusted to be the only one. */
const seedLinkHref = ($) =>
  $('table a')
    .toArray()
    .map((anchor) => $(anchor))
    .find(isSeedLink)
    ?.attr('href')

export const findSeedAddressId = async (client) => {
  const list = await client.document(seedSearchPath())
  if (list.status !== HTTP_OK) {
    throw new Error(`The address book did not render (${list.status})`)
  }
  const href = seedLinkHref(list.$)
  return href ? addressIdIn(href) : null
}

export const createSeedAddress = async (client) => {
  const form = await client.document(addressAddPath())
  if (form.status !== HTTP_OK) {
    throw new Error(`The add address page did not render (${form.status})`)
  }
  const posted = await client.submit(addressAddPath(), SEED_ADDRESS, form.crumb)
  if (posted.status !== HTTP_FOUND || posted.location !== addressBookPath()) {
    throw new Error(
      `The add address page rejected the seed address (${posted.status}) — its ` +
        'fields have moved on from what this seed sends'
    )
  }
}

export const seedAddress = async (client) => {
  const existing = await findSeedAddressId(client)
  if (existing) {
    return existing
  }
  await createSeedAddress(client)
  const created = await findSeedAddressId(client)
  if (!created) {
    throw new Error(
      'The address book does not list the seed address it just accepted'
    )
  }
  return created
}
```

The paths come from `shared/paths.js` builders, never literals (the list page's own `?q=` search is the one query
string written here). This module replaces the journeys' `seed-notification.js` and animals' `seed-address-book.js`
together: one record, created through the add page so the audit exercises the same code path a trader does, in
whichever mode the app is running (D4).

### N6 — `scripts/lighthouse/seed-address.test.js`

```js
import nock from 'nock'
import { describe, expect, test } from 'vitest'

import {
  addressRules,
  FIELDS
} from '../../src/server/app/features/address-book/fields.js'
import { validate } from '../../src/server/app/lib/validate/index.js'
import { refuseOutboundHttp } from '../../src/server/common/test-helpers/real-mode.js'
import { createPageClient } from './page-client.js'
import {
  addressIdIn,
  findSeedAddressId,
  SEED_ADDRESS,
  seedAddress
} from './seed-address.js'

const ORIGIN = 'http://localhost:3002'
const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'
const STUB_ADDRESS_ID = '000000000000000000000001'
const CRUMB = 'crumb-token'
const CRUMB_COOKIE = 'crumb=cookie-crumb; Path=/'
const SEARCH = { q: SEED_ADDRESS.name }
const HTTP_OK = 200
const HTTP_FOUND = 302
const HTTP_BAD_REQUEST = 400

const page = (body) =>
  `<html><head><meta name="csrf-token" content="${CRUMB}"></head><body><h1>Page</h1>${body}</body></html>`

const viewLink = (id, name) =>
  `<a class="govuk-link" href="/address-book/${id}">View<span class="govuk-visually-hidden"> ${name}</span></a>`

const listPage = (...links) =>
  page(`<table class="govuk-table">${links.join('')}</table>`)

const app = () => nock(ORIGIN)

const listing = (...links) =>
  app().get('/address-book').query(SEARCH).reply(HTTP_OK, listPage(...links))

describe('#SEED_ADDRESS', () => {
  test('Should send exactly the fields the add form asks, in the order it asks them', () => {
    expect(Object.keys(SEED_ADDRESS)).toEqual(FIELDS)
  })

  test('Should fill every field, the optional ones included', () => {
    for (const field of FIELDS) {
      expect(SEED_ADDRESS[field], field).not.toBe('')
    }
  })

  test("Should pass the add form's own rules", () => {
    expect(
      validate(addressRules([SEED_ADDRESS.countryCode]), SEED_ADDRESS).errors
    ).toBeNull()
  })
})

describe('#addressIdIn', () => {
  test('Should read the id from the view link of a row', () => {
    expect(addressIdIn(`/address-book/${ADDRESS_ID}`)).toBe(ADDRESS_ID)
  })
})

describe('#seedAddress', () => {
  refuseOutboundHttp()

  test('Should reuse the seed address an earlier run created', async () => {
    const scope = listing(viewLink(ADDRESS_ID, SEED_ADDRESS.name))

    await expect(seedAddress(createPageClient(ORIGIN))).resolves.toBe(
      ADDRESS_ID
    )
    expect(scope.isDone()).toBe(true)
  })

  test('Should match the seed by name and not trust the search, as the stub lists every row', async () => {
    listing(
      viewLink(STUB_ADDRESS_ID, 'Stub Farm 1'),
      viewLink(ADDRESS_ID, SEED_ADDRESS.name)
    )

    await expect(findSeedAddressId(createPageClient(ORIGIN))).resolves.toBe(
      ADDRESS_ID
    )
  })

  test('Should create the seed address through the add page when the book lists none, posting the crumb the page issued', async () => {
    listing(viewLink(STUB_ADDRESS_ID, 'Stub Farm 1'))
    const created = app()
      .get('/address-book/add')
      .reply(HTTP_OK, page('<form></form>'), { 'set-cookie': [CRUMB_COOKIE] })
      .post('/address-book/add', { crumb: CRUMB, ...SEED_ADDRESS })
      .matchHeader('cookie', /crumb=cookie-crumb/)
      .reply(HTTP_FOUND, '', { location: '/address-book' })
    listing(
      viewLink(STUB_ADDRESS_ID, 'Stub Farm 1'),
      viewLink(ADDRESS_ID, SEED_ADDRESS.name)
    )

    await expect(seedAddress(createPageClient(ORIGIN))).resolves.toBe(
      ADDRESS_ID
    )
    expect(created.isDone()).toBe(true)
  })

  test('Should refuse when the add page rejects the seed', async () => {
    listing()
    app()
      .get('/address-book/add')
      .reply(HTTP_OK, page('<form></form>'))
      .post('/address-book/add')
      .reply(HTTP_BAD_REQUEST, page('<div role="alert">There is a problem</div>'))

    await expect(seedAddress(createPageClient(ORIGIN))).rejects.toThrow(
      /rejected the seed address \(400\)/
    )
  })

  test('Should refuse when the address book does not list the address it just accepted', async () => {
    listing()
    app()
      .get('/address-book/add')
      .reply(HTTP_OK, page('<form></form>'))
      .post('/address-book/add')
      .reply(HTTP_FOUND, '', { location: '/address-book' })
    listing()

    await expect(seedAddress(createPageClient(ORIGIN))).rejects.toThrow(
      /does not list the seed address it just accepted/
    )
  })
})
```

Notes for the implementor: nock 14.0.17 (installed) parses an `application/x-www-form-urlencoded` body into an
object before comparing it with an object spec (`node_modules/nock/lib/match_body.js` lines 28–37), which is why the
POST interceptor takes `{ crumb: CRUMB, ...SEED_ADDRESS }`. `refuseOutboundHttp()` disables net connect for the
describe and `nock.cleanAll()`s after each test, so an unanswered request fails the test rather than reaching a
running app on 3002. `page-client.js` is exercised end-to-end here — cookies remembered from `set-cookie`, the crumb
read from the meta tag, the form body — with the network as the only boundary (invariant 8).

### N7 — `scripts/lighthouse/seed-audit-targets.js`

```js
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'

import puppeteer from 'puppeteer'

import signIn from '../../tests/lighthouse/auth-setup.cjs'
import { auditUrls, reportNames, TARGETS_FILE } from './audit-targets.js'
import { createPageClient } from './page-client.js'
import { seedAddress } from './seed-address.js'

const HTTP_OK = 200

const origin = process.env.LIGHTHOUSE_BASE_URL ?? 'http://localhost:3002'

const signedInCookies = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-gpu']
  })
  try {
    await signIn(browser, { url: origin })
    const { hostname } = new URL(origin)
    return (await browser.cookies()).filter(({ domain }) =>
      hostname.endsWith(domain.replace(/^\./, ''))
    )
  } finally {
    await browser.close()
  }
}

/** Every URL is fetched once more before Lighthouse sees it, so a page that
 * redirects or 404s — a seeded address the book no longer holds, say — fails
 * here with its status rather than silently auditing whatever it landed on. */
const assertUrlsRenderTheirOwnPage = async (urls, client) => {
  const failures = []
  for (const url of urls) {
    const page = await client.document(url)
    if (page.status !== HTTP_OK) {
      failures.push(`${url} -> ${page.status} ${page.location ?? ''}`.trim())
    } else if (!page.heading) {
      failures.push(`${url} -> 200 but no heading`)
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Lighthouse targets do not render their own page:\n  ${failures.join('\n  ')}`
    )
  }
}

const write = (payload) => {
  mkdirSync(dirname(TARGETS_FILE.pathname), { recursive: true })
  writeFileSync(TARGETS_FILE, `${JSON.stringify(payload, null, 2)}\n`)
}

const client = createPageClient(origin, await signedInCookies())
const addressId = await seedAddress(client)
const urls = auditUrls(origin, addressId)
await assertUrlsRenderTheirOwnPage(urls, client)
write({ origin, addressId, urls, reports: reportNames(origin, addressId) })

process.stdout.write(
  `Lighthouse will audit ${urls.length} URLs on ${origin} (address ${addressId})\n`
)
```

Animals' file with `seedNotifications` and `ensureAddressBookHasAnAddress` replaced by `seedAddress`, one cookie jar
(D5), the default origin on 3002 (D6) and the targets payload carrying `addressId` instead of `journeyIds`.

### N8 — `scripts/lighthouse/run-audit.js`

Animals' `scripts/lighthouse/run-audit.js` verbatim except the comment above `useStableReportNames`, whose first
sentence becomes: `LHCI names each report after the URL's pathname, which carries the seeded address id and so
changes every run.` — the rest of that comment and every line of code are unchanged. The `reports` map it reads from
`.lighthouse/targets.json` is keyed by URL, which is what `reportNames` writes (D3).

### N9 — `scripts/lighthouse/flag-simple-findings.cjs`

Plants' file byte-for-byte. `.github/workflows/lighthouse.yml` runs it after the audit; the workspace's
`report-lighthouse-status` action reads the `flagged-audits.json` it writes.

### N10 — `tests/lighthouse/auth-setup.cjs`

Plants' file byte-for-byte (D7). `tests/` does not exist in ins today; create the directory. Nothing else joins it —
the Playwright suites stay under `fit/` and `src/server/app/features/**/fit/`.

### N11 — `.github/workflows/lighthouse.yml`

Animals' file with exactly one line changed: `repository: DEFRA/trade-imports-animals-frontend` →
`repository: DEFRA/trade-imports-ins-frontend` (in the `Checkout frontend` step). Everything else stays: the
`workflow_run` trigger on `Publish Branch Image` (the name ins's `publish-branch.yml` already carries),
`workflow_dispatch` with a `branch` input, the pending check via `report-lighthouse-status@main`, the workspace
checkout at `main` and `./scripts/stack/run-stack.sh --branch …`, `frontend/.nvmrc` and `scripts/npm-version.js`
(both exist in ins), `npm run lighthouse`, the inline report index, `flag-simple-findings.cjs`, the artifact, the
`gh-pages` publish under `lighthouse/<tag>/`, and the final status report. The port is not in this file — it lives in
`seed-audit-targets.js`'s default origin.

### N12 — `src/server/app/docs/lighthouse.md`

```markdown
# Lighthouse

Lighthouse CI audits the service's own pages. The source of truth is
[`lighthouserc.cjs`](../../../../lighthouserc.cjs) at the repository root,
plus the scripts under `scripts/lighthouse/`.

## What the run audits

Every GET route the service registers, derived from
[`features/index.js`](../features/index.js) at run time — the same list
[`routes.test.js`](../routes.test.js) pins:

- `/` — the dashboard
- `/address-book` — the list
- `/address-book/add`
- `/address-book/{id}` — view
- `/address-book/{id}/edit`
- `/address-book/{id}/delete`

The three `{id}` pages are audited on one address the setup step creates
through the app's own add page, named `Lighthouse seed address`. A run
that finds it already in the book reuses it rather than adding another.

`scripts/lighthouse/audit-targets.js` (with `audit-targets.test.js`) holds
the derivation and two maps, both empty today: `SKIPPED`, for a GET route
that must not be audited, with a reason; and `QUERY`, for a route that
needs a query string before it renders. Both are checked against the live
route table, so a stale entry fails the run rather than quietly shrinking
the audit. `scripts/lighthouse/seed-address.js` (with
`seed-address.test.js`) holds the seed address and the find-or-create walk
through the list and add pages.

## What the run does

`npm run lighthouse` is `run-s lighthouse:targets lighthouse:run`.

`lighthouse:targets` (`seed-audit-targets.js`) signs in through
`tests/lighthouse/auth-setup.cjs`, seeds the address, derives the audit
URLs from the app's registered routes and writes them to
`.lighthouse/targets.json`. It then re-fetches every URL and fails when one
does not return 200 for its own page — a redirected URL would silently
audit whatever it landed on.

`lighthouse:run` (`run-audit.js`) clears the previous run's reports, runs
`lhci autorun`, then renames each report from the LHCI filename pattern to
the page's own stable name from the targets file: `home`, `address_book`,
`address_book_add`, `address_book_id`, `address_book_id_edit`,
`address_book_id_delete`.

The config:

- collects the URLs from `.lighthouse/targets.json`, defaulting to
  `http://localhost:3002` (override with `LIGHTHOUSE_BASE_URL`)
- runs each URL once
- uses the desktop preset
- starts Chromium with `--no-sandbox` and `--disable-gpu`
- runs `tests/lighthouse/auth-setup.cjs` before each audit
- writes HTML and JSON output to `lighthouse-report/`

Never run `lhci autorun` on its own. The LHCI filename pattern only has to
be unique per URL; the stable per-page names are applied afterwards by
`lighthouse:run`.

## Run it against a locally started app

Two shells. In the first, start the app in stub mode — stub data and a
locally signed session, no other service needed:

```bash
STUB_MODE=true npm run fit:start
```

In the second:

```bash
npm run lighthouse
```

To audit the app the way CI does, start the workspace stack instead
(`./scripts/stack/run-stack.sh` from the workspace root), which serves
this frontend on 3002 against the real address book and the Defra ID stub,
and run `npm run lighthouse` from this repository. The sign-in script
fills the Defra ID stub's form as a single-organisation user; in stub mode
there is no form and it has nothing to do.

## Passing scores

The run fails below these category scores:

| Category       | Minimum |
| -------------- | ------- |
| Performance    | 0.60    |
| Accessibility  | 0.70    |
| Best practices | 0.70    |

There is no SEO assertion, and none should be added.

Treat the limits as a floor, not a target. A score above the floor can still
contain a simple finding that should be fixed.

## Add or change a page

The URL list is derived, not hand-maintained, so a new page joins the audit
by being a registered GET route. For a page that should be audited:

1. Check its stable report name. `reportName` derives it from the route
   path; `reportNames` refuses two routes that would claim the same name.
   A page that should not be audited needs a `SKIPPED` entry with a
   reason; a page that renders only with a query string needs a `QUERY`
   entry. A page with a path parameter other than `{id}` cannot be
   audited until the setup step can supply it — add it to `SKIPPED` with a
   reason, or extend the seed.
2. Make sure the page renders for the seeded address, signed in.
3. Run Lighthouse and open that page's HTML report.
4. Check all three asserted categories.

Do not lower a score to make a change pass without agreement. Record why a
URL is excluded. An excluded URL no longer has a Lighthouse check.

## Read the output

Each report is renamed to the page's stable name:

```text
lighthouse-report/<name>.report.<extension>
```

`scripts/lighthouse/flag-simple-findings.cjs` reads the manifest and the
representative JSON reports. It records weighted numeric or binary audits
with a score below 1 for the three asserted categories. The output is:

```text
lighthouse-report/flagged-audits.json
```

SEO findings are not included in that file.

## CI ownership

This repository has its own `.github/workflows/lighthouse.yml`. It runs
after a successful branch image publish, or by manual dispatch: it checks
out the workspace, starts the stack for the chosen branch, installs the
frontend, runs `npm run lighthouse`, always tears the stack down, uploads
the report for 14 days, publishes it to GitHub Pages and passes the result,
report URL and flagged findings to the workspace status action.

The workflow fires only once `lighthouse.yml` is on `main`: a
`workflow_run` trigger is read from the default branch, so a pull request
that adds the file does not get the check on itself. Run the audit locally
for that pull request, and expect the check on the next one.

A red result is a real failure to investigate from the uploaded report. It
is not a reason to lower a floor, stub a URL list or gate the workflow
behind manual dispatch. Reproduce it against the same route and stack
before changing code or limits.
```

The relative link `../../../../lighthouserc.cjs` resolves from `src/server/app/docs/` to the repo root (four
levels: docs → app → server → src → root). Prettier formats Markdown — run `npm run format` after writing it.

---

## 4. Imports

No existing import is disturbed. The new files import ins by relative path only — `../../src/server/app/...` from
`scripts/lighthouse/` — exactly as the journeys' scripts import their `src/`. `seed-audit-targets.js` imports the
CommonJS `tests/lighthouse/auth-setup.cjs` as a default import, which is how animals and plants do it. No import from
`src/server/app` to `scripts/` or `tests/` may be added (Dependency Cruiser scans `src/server/app` only, so it would
not catch one — do not create one).

---

## 5. Tests

| test | status | what it pins |
|---|---|---|
| `scripts/lighthouse/audit-targets.test.js` | new (N3) | the six GET routes are the audit list, in registration order; the `{id}` substitution; the seeded-address guard; a new GET route is audited automatically; `SKIPPED`/`QUERY` entries take effect and stale ones are refused; an unsatisfiable extra parameter is refused; report names come from route paths and never carry the address id; two routes that would share a name are refused |
| `scripts/lighthouse/seed-address.test.js` | new (N6) | `SEED_ADDRESS` keys equal `FIELDS` in order, every field filled, the seed passes `addressRules`; `addressIdIn`; through nock: an existing seed is reused, the seed is matched by name among other rows, creation GETs the crumb then POSTs `crumb` + the nine fields with the crumb cookie and searches again, a 400 from the add page and a missing row after creation both fail loudly |
| `src/server/app/routes.test.js` | unchanged | still the guard that the route surface is the nine routes — N3's expectations are the GET half of that list |
| the rest of the unit suite, `fit/**` | unchanged | — |

Expected totals after the stage: **57 files, 494 + 25 = 519 tests**, all passing with port 3002 free (N3 adds 16,
N6 adds 9 — count them in the log rather than trusting this arithmetic; what matters is zero failures).

---

## 6. Invariants to prove

1. **Public URL surface unchanged.** No file under `src/` changes except the three docs edits (E4, N12) — prove
   with `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend status --short` (§8 step 11):
   the only `src/` entries are `src/server/app/docs/README.md` and `src/server/app/docs/lighthouse.md`.
   `routes.test.js` is untouched and still passes.
2. **Behaviour preserved.** Nothing in `src/server/app/{features,services,shared,lib}`, `src/plugins`, `src/auth`,
   `src/config` changes. The service serves the same pages; the stage adds a developer-run audit and a CI workflow.
3. **Ladder green.** `format:check`, `lint`, `test` to logs, read once each (§8 steps 7–9). Also run
   `security-audit` (E1 adds packages and `check-pull-request.yml` runs it) and `test:fit` once (dependencies changed;
   the Playwright web server boots the app on 3002, so the same port rule as step 9 applies).
4. **No shared package, no cross-repo import.** `grep -rn "animals-frontend\|plants-frontend" scripts tests
   lighthouserc.cjs` in the ins repo returns nothing.
5. **Copy files.** No user-facing string is created: the scripts' messages are developer-facing and `SEED_ADDRESS`
   is test data. `copy.en.js` / `copy.cy.js` are untouched — `git status` shows no `copy/` path.
6. **Comments.** The only comments in the new JS are the "why" comments the journeys' files carry, adapted
   (D11). `grep -rn "TODO\|renamed\|moved\|migrat" scripts/lighthouse tests/lighthouse lighthouserc.cjs` returns
   nothing.
7. **Explicit names.** `createPageClient`, `seedAddress`, `findSeedAddressId`, `createSeedAddress`,
   `auditableRoutePaths`, `assertUrlsRenderTheirOwnPage` — no `journey` in an ins identifier:
   `grep -rn "journey" scripts/lighthouse tests/lighthouse lighthouserc.cjs src/server/app/docs/lighthouse.md`
   returns nothing.
8. **nock at the network boundary.** `seed-address.test.js` uses `refuseOutboundHttp()` and `nock(ORIGIN)`; no
   `vi.mock` of `page-client.js` or `global.fetch`: `grep -n "vi.mock\|global.fetch" scripts/lighthouse/*.test.js`
   returns nothing.
9. **Derived, not hard-coded, URL list.** `grep -n "'/address-book\|'/'" scripts/lighthouse/*.js` (excluding
   `*.test.js`) returns nothing — the scripts reach paths through `allRoutes` and `paths.js` builders.
10. **No SEO.** `grep -n "seo" lighthouserc.cjs` returns nothing.
11. **Nothing generated is staged.** `git status --short` shows no `.lighthouse/`, `lighthouse-report/` or
    `.lighthouseci/` entry (the browser audit is not run in this stage; if a `.lighthouse/` directory exists anyway,
    it is ignored by E2).

---

## 7. Out of scope — leave alone

- `npm run lighthouse`, `lighthouse:targets`, `lighthouse:run` — **do not run the browser audit.** The parent proves
  it after the stage lands. Running it would also write `.lighthouse/targets.json` and download nothing new (puppeteer
  fetches its Chrome at install time), but the brief is explicit.
- `.github/workflows/cleanup-e2e-reports.yml` — not added (D9).
- `serve-static-files.test.js`'s port binding (D12) and anything else under `src/server/common`.
- `src/server/app/docs/testing.md`, `add-a-page.md`, `architecture.md`, `features.md`, `services.md` — no
  Lighthouse paragraph (D13).
- `playwright.config.js`, `vitest.config.js`, `eslint.config.js`, `.dependency-cruiser.cjs`, `sonar-project.properties`,
  `.sonarcloud.properties`, `Dockerfile`, `.dockerignore` — none needs a change: `scripts/` and `tests/` are already
  linted by `eslint .`, formatted by the `**/*.{js,cjs,md,json,…}` glob, outside Sonar's `src/` sources, outside
  coverage's `src/**` include, and outside Dependency Cruiser's `src/server/app` root.
- `check-pull-request.yml`, `publish.yml`, `publish-hotfix.yml`, `publish-branch.yml` — untouched.
- The workspace repo (`.github/actions/report-lighthouse-status`, `scripts/stack/run-stack.sh`,
  `docker/stack/*`) — read only; nothing there needs an ins-specific change (see the stage notes).
- animals and plants — not touched by this stage.
- The `.husky/pre-commit` hook and `postinstall` — not this stage's (s10 open question stands).
- The stack — do not start, stop or exclude services. If port 3002 is held, record it and hand it to the parent
  (§8 step 9).

---

## 8. Order of work (Bash: one command per call, tilde paths, output to a log under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/`, read each log once with the Read tool)

1. **E1** — edit `package.json` (scripts, two devDependencies, two overrides) with the Edit tool.
2. **Install under the pinned npm** (the ambient npm is newer than the 11.6.2 pin and would write a lockfile `npm ci`
   rejects — the s10 route):
   `~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo trade-imports-ins-frontend run install:pinned-npm > ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s14-lighthouse-install.log 2>&1`
   Expected: `npx` resolves `npm@11.6.2`, puppeteer downloads its Chrome build into `~/.cache/puppeteer` (a few
   minutes, ~150 MB — give the call a 600000 ms timeout), then `added N packages`. Then
   `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --stat -- package.json package-lock.json`
   should show only those two files. If the log ends in `npm error` with a `ws` or `lighthouse` override conflict,
   read the message, fix the override value to what it names, re-run once — but the two journeys install this exact
   combination, so expect none.
3. **N1–N10** — write the new files with the Write tool (`mkdir` is not needed — the Write tool creates
   `scripts/lighthouse/` and `tests/lighthouse/`). For the byte-for-byte ones (N9, N10) and the near-verbatim ones
   (N1, N4, N8), Read the plants/animals file first and write it with only the change §3 names.
4. **N11** — write `.github/workflows/lighthouse.yml` from animals' file with the one line changed.
5. **E2, E3, E4, N12** — `.gitignore`, `README.md`, `src/server/app/docs/README.md`, `src/server/app/docs/lighthouse.md`.
6. **Format:** `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format > …/logs/s14-lighthouse-format.log 2>&1`.
   Prettier rewrites the new files and the Markdown to house style; that is the only permitted formatter.
7. `npm --prefix … run format:check > …/logs/s14-lighthouse-format-check.log 2>&1` — expected "All matched files use
   Prettier code style!".
8. `npm --prefix … run lint > …/logs/s14-lighthouse-lint.log 2>&1` — expected: eslint silent, stylelint silent,
   `no dependency violations found (55 modules …)`. A `no-unused-vars` on a `.cjs` file would mean it was not copied
   byte-for-byte — re-copy it rather than editing around it.
9. `npm --prefix … run test > …/logs/s14-lighthouse-test.log 2>&1` (600000 ms timeout; `pretest` builds the client
   first). Read the summary lines. Expected: every file passed, 0 failed. **If the only failure is
   `serve-static-files.test.js` with `EADDRINUSE … 3002`**, that is the running stack holding the port (the planner
   hit the same on the untouched baseline): do not touch the test, do not touch the stack — append a note to the
   stage saying the suite is green but for the port collision, quoting the totals, and carry on; the parent frees
   the port and re-runs this rung. Any other failure is yours: read the log's failure block once, fix, re-run.
10. `npm --prefix … run security-audit > …/logs/s14-lighthouse-security-audit.log 2>&1` — expected `found 0
    vulnerabilities` at the `critical` level. A `high` finding does not fail this script; note it if one appears.
11. `npm --prefix … run test:fit > …/logs/s14-lighthouse-test-fit.log 2>&1` (600000 ms). Same port rule as step 9:
    Playwright's web server binds 3002 and reports `Error: http://localhost:3002/health is already used` when the
    stack holds it — note and carry on; otherwise expect every spec passed.
12. **Prove §6:** run each grep in §6 (one per call) and
    `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend status --short > …/logs/s14-lighthouse-status.log`.
    Expected entries, and no others:
    ```
     M .gitignore
     M README.md
     M package-lock.json
     M package.json
     M src/server/app/docs/README.md
    ?? .github/workflows/lighthouse.yml
    ?? lighthouserc.cjs
    ?? scripts/lighthouse/
    ?? src/server/app/docs/lighthouse.md
    ?? tests/
    ```
    and `git -C … ls-files --others --exclude-standard scripts tests` lists exactly `scripts/lighthouse/audit-targets.js`,
    `audit-targets.test.js`, `flag-simple-findings.cjs`, `page-client.js`, `run-audit.js`, `seed-address.js`,
    `seed-address.test.js`, `seed-audit-targets.js` and `tests/lighthouse/auth-setup.cjs`.
13. **Stage, do not commit:** `git -C … add .gitignore README.md package.json package-lock.json src/server/app/docs .github/workflows/lighthouse.yml lighthouserc.cjs scripts/lighthouse tests/lighthouse`
    (one call). The orchestrator commits and pushes.
14. Append your IMPLEMENTOR notes to the stage in `stages.json` (what landed, the ladder totals, any deviation from
    this plan and why), re-check with `jq empty …/stages.json`, and return.
