# s15-q01-signout-session-drop — drop the ins session at sign-out initiation, as the journeys do

Ruling (Sam, 16 September 2026): **yes**. ins takes the journeys' sign-out shape. The ruling is settled; this plan
implements it and nothing else.

| key | role | Bash path | Read/Edit path |
|---|---|---|---|
| ins | **the one repo that changes** | `~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-ins-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-ins-frontend` |
| plants | reference only — **do not edit** | `~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-plants-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-plants-frontend` |
| animals | reference only — **do not edit** | `~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-animals-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-animals-frontend` |
| workspace | stages.json, this plan, logs | `~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace` | `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace` |

Branch: `feat/NO_JIRA-frontend-alignment`, checked out and level with `origin` in every clone. ins clone HEAD
`c33fd701a747c892301221c1def3be4ed7108d27` (merge of `origin/main`, 2026-09-15). plants clone HEAD `cf01b98a`.
Never touch anything under `~/git/defra/trade-imports-workspace/repos/` — those are Sam's live checkouts.

Ladder (ins): `format:check`, `lint`, `test`, `test:fit`. Rollback is `git stash push -u` only.

Three files change. Nothing moves, nothing is deleted, nothing is created.

## Baseline — read this before step 0

The planner could not run the ladder in the ins clone: it has **no `node_modules/` and no `.public/`** (this is the
first stage to run on the clones; the s01–s14 checkouts under `repos/` carried their own installs). Installing is
outside what an agent in this workflow may do:

- `npm --prefix <clone> ci` is refused by the workspace guard hook (`.claude/hooks/guard-bash.sh` line 168: any
  `npm --prefix <path-containing-trade-imports-workspace> install|ci|…`).
- the sanctioned wrapper `tools/npm/npm-in-repo.sh --repo <name> …` resolves `repos/<name>` only, never
  `workareas/clones/`.
- `cd <clone> && …`, bare `npx` and `node` are all banned for the agents.

So the baseline is the branch head's CI, which ran on exactly this commit:
`logs/s15-q01-signout-session-drop-baseline-ins-ci-check-pull-request.log` — run 34968720470 on PR #27,
2026-09-15 12:25Z: **FIT Tests green (50 passed), Run Pull Request Checks green** (format, lint, unit with coverage).
`logs/s15-q01-signout-session-drop-baseline-ins-ci-runs.log` lists the run history. The last locally-run ladder on
this branch (s14's CI fixer, commit `4f9a8d6`) was format:check clean, lint clean, **519/519 unit tests**.

**Step 0 for the implementor:** run `ls ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-ins-frontend/node_modules/.bin/vitest`.
If it is missing, do the code edits in §2 and §5 anyway (they need no tooling), stage them, then STOP at the ladder
and report: "ins clone has no node_modules; the parent must install (see plan §Baseline)". Do **not** try to install
by any route — the deny is deliberate. If it is present, run the ladder as §8 says. The parent's routes to an install
are recorded in the stage notes.

## 0. Decisions

| # | Decision |
|---|---|
| D1 | **plants is the reference.** `diff plants/src/server/auth/controller.js animals/src/server/auth/controller.js` is empty (confirmed by the planner), so the brief's "animals is byte-equal to plants" holds; every quote below is plants'. |
| D2 | **Copy verbatim, comments included.** The brief says so and the drift check (`surfaces.json` rule `identical-except` for this file) values byte-equality over invariant 6's comment policy. Do not tidy, rename or re-flow anything in the copied lines. |
| D3 | **The `{ profile }` log line stays.** It is question 4 and its own stage. After this stage `diff plants ins` on the controller must show exactly one hunk (quoted in §6A). |
| D4 | **Unauthenticated `GET /signout` does not change behaviour, and the brief's declared change for it is withdrawn.** `/signout` is registered with `routeOptions = { auth: 'session' }` (required mode, `src/server/signout/index.js` → `src/server/app/shared/kit.js`). `@hapi/cookie` 12.0.1 redirects an unauthenticated *required*-mode request to `redirectTo(request)` before any handler runs (`lib/index.js` line 205: `if (!uri \|\| request.auth.mode !== 'required') return h.unauthenticated(err)` — otherwise redirect). ins's `redirectTo` builds `/auth/stub-sign-in?redirect=<path>` in stub mode and `/auth/sign-in?redirect=<path>` otherwise (`src/plugins/auth.js`). So an unauthenticated `GET /signout` lands on the sign-in page today and after this stage; the new `'/'` branch in `signoutOidc` is reachable only through `GET /auth/sign-out-oidc`, which is `mode: 'try'`. The brief's "add an unauthenticated GET /signout expecting a redirect to '/'" would be red; the test is added but pins the true redirect (§5C). The unit suite runs in stub mode (`vitest.config.js` sets `STUB_MODE=true`; the signout test does not flip it), so the exact location is `/auth/stub-sign-in?redirect=%2Fsignout`. |
| D5 | **The session drop is proved by a cache round-trip, not a spy.** Seed `server.app.cache.set(sessionId, …)` before the request and assert `await server.app.cache.get(sessionId)` is `null` after it. `server.app.cache` is a real Catbox policy over Catbox Memory in tests (`server.js`, `cache-engine.js`); `Policy.get` resolves `null` on a miss. This is what `docs/best-practices/node/testing/frontend.md` asks for ("if only the side-effect matters, assert the side-effect directly") and it is stronger than the brief's `vi.spyOn(server.app.cache, 'drop')`: it proves the drop reached the cache with the right key. It also adds no spy to restore. |
| D6 | **Cookie assertion shape** follows `src/server/signout/controller.test.js` line 38–43 (join `set-cookie`, expect `'sid='`). `request.cookieAuth.clear()` is `h.unstate('sid')` — `sid` is `@hapi/cookie`'s default cookie name and ins sets none. In `auth/controller.test.js` it is used twice, so it becomes one named helper, `expectSessionCookieCleared(headers)`, declared beside `defraIdAuth`. The signout test keeps its inline block untouched. |
| D7 | **Test names keep each file's existing register** (`GET /path does X` in the auth test; a bare verb phrase under `describe('GET /signout')` in the signout test) rather than the workspace's "Should …" style — consistency within the file wins for a three-test change. |
| D8 | **No doc changes.** The planner grepped `src/server/app/docs/` and the root `README.md` for sign-out: `README.md` line 26 and `architecture.md` lines 19 and 34 only list `/signout` as a chassis route; no sentence describes what sign-out does. Nothing to correct; say so in notes. |
| D9 | **No new module mocks, no `vi.spyOn`, no `vi.restoreAllMocks`.** Both test files keep exactly the `vi.mock` calls they have (four in the auth test, two in the signout test). |
| D10 | **`_request` matters for SonarCloud even though local eslint is silent.** ins's `eslint.config.js` is bare neostandard (unused args are not flagged); the journeys add `sonarjs/no-unused-function-argument`. SonarCloud Automatic Analysis runs on PR #27 with a 90% new-code coverage gate, so the rename removes an S1172 finding before it is raised, and the new tests must cover every new handler line (they do: both new branches are exercised). |

## 1. Moves

None.

## 2. Edits

### 2A. `src/server/auth/controller.js` (ins) — three hunks, all copied from plants

Read plants' file in full first: `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-plants-frontend/src/server/auth/controller.js`.

**Hunk 1 — `signin` (ins line 12).** Replace

```js
  signin: {
    handler: async function (request, h) {
      return h.redirect('/')
    }
  },
```

with plants' exact text

```js
  signin: {
    handler: async function (_request, h) {
      return h.redirect('/')
    }
  },
```

**Hunk 2 — `signout` (ins lines 96–107).** Replace the whole handler

```js
  signout: {
    handler: async function (request, h) {
      if (!request.auth.isAuthenticated) {
        return h.redirect('/')
      }
      const signOutUrl = await getSignOutUrl(
        request,
        request.auth.credentials.token
      )
      return h.redirect(signOutUrl)
    }
  },
```

with plants' exact text, comment included

```js
  signout: {
    handler: async function (request, h) {
      if (!request.auth.isAuthenticated) {
        return h.redirect('/')
      }
      // Drop the session locally at sign-out initiation rather than relying on
      // the OIDC provider redirecting back to /auth/sign-out-oidc. The provider
      // round-trip is not guaranteed (Entra/CDP-WAF reject an id_token_hint that
      // exceeds the querystring limit), so the local session must be cleared here.
      if (request.auth.credentials?.sessionId) {
        await request.server.app.cache.drop(request.auth.credentials.sessionId)
      }
      request.cookieAuth.clear()
      const signOutUrl = await getSignOutUrl(
        request,
        request.auth.credentials.token
      )
      return h.redirect(signOutUrl)
    }
  },
```

**Hunk 3 — `signoutOidc` tail (ins line 129).** Replace

```js
      return h.redirect(await getSignOutUrl(request, null))
    }
  },
```

with plants' exact text, comment included

```js
      // Already signed out: land back in the app rather than bouncing to the
      // provider again, which would loop when the provider honours
      // post_logout_redirect_uri without an id_token_hint.
      return h.redirect('/')
    }
  },
```

Nothing else in the file changes: not the imports, not `UNAUTHORISED_VIEW`, not `signinOidc` (its `{ profile }` log
line is question 4), not `organisation`. Prove the result with §6A before moving on.

### 2B. `src/server/auth/controller.test.js` (ins) — one helper, one changed test, one new test, one extended test

Current file: `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-ins-frontend/src/server/auth/controller.test.js`.
Keep the imports, the four `vi.mock` calls, `defraIdAuth`, the `describe` scaffolding (`config.set('stubMode', false)`
in `beforeAll` is what registers `/auth/sign-out` and `/auth/sign-out-oidc` — the suite otherwise runs in stub mode
and those routes do not exist) and every sign-in test exactly as they are.

**(i) Add the cookie helper** directly after the `defraIdAuth` declaration (before `describe('#authController'`):

```js
const expectSessionCookieCleared = (headers) => {
  const setCookie = headers['set-cookie'] ?? []
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  expect(cookies.join('\n')).toContain('sid=')
}
```

**(ii) Change** the test `'GET /auth/sign-out-oidc redirects unauthenticated users to sign-out URL'` — new name and
new expectation, same request:

```js
  test('GET /auth/sign-out-oidc redirects unauthenticated users to home', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out-oidc'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/')
  })
```

**(iii) Add** a new test directly after `'GET /auth/sign-out redirects unauthenticated users to home'`:

```js
  test('GET /auth/sign-out drops the session and redirects authenticated users to the sign-out URL', async () => {
    const sessionId = 'signout-authenticated'
    await server.app.cache.set(sessionId, { sessionId, token: 'mock-token' })

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      auth: sessionAuth(sessionId)
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/signed-out')
    expect(await server.app.cache.get(sessionId)).toBeNull()
    expectSessionCookieCleared(headers)
  })
```

**(iv) Extend** `'GET /auth/sign-out-oidc clears authenticated session and redirects'` with the same seed and the
same two assertions; its session id is already unique:

```js
  test('GET /auth/sign-out-oidc clears authenticated session and redirects', async () => {
    const sessionId = 'signout-oidc-authenticated'
    await server.app.cache.set(sessionId, { sessionId, token: 'mock-token' })

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out-oidc',
      auth: sessionAuth(sessionId)
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/signed-out')
    expect(await server.app.cache.get(sessionId)).toBeNull()
    expectSessionCookieCleared(headers)
  })
```

Why the seed works: `server.initialize()` starts the cache; `server.app.cache` is the `auth-sessions` policy
(`server.js`), `set(key, value)` uses the policy's `expiresIn`; `server.inject({ auth })` bypasses the strategy and
hands the handler `credentials.sessionId`, so `cache.drop(sessionId)` removes the seeded entry and `get` resolves
`null`. Prettier will decide the line breaks of the long test names — run `format` (§8), never hand-wrap.

### 2C. `src/server/signout/controller.test.js` (ins) — one new test

Current file: `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/clones/trade-imports-ins-frontend/src/server/signout/controller.test.js`.
Keep everything, including the authenticated test unchanged. Add, after it and inside `describe('GET /signout')`:

```js
  test('redirects unauthenticated users to the sign-in page', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/signout'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/auth/stub-sign-in?redirect=%2Fsignout')
  })
```

The location is exact and deterministic: `getCookieOptions().redirectTo` in `src/plugins/auth.js` returns
`${signInPath}?redirect=${encodeURIComponent('/signout')}` with `signInPath = '/auth/stub-sign-in'` because the suite
runs with `STUB_MODE=true` and this file never sets `stubMode` false. `appendNext` is not configured, so nothing is
appended. If this test ever reports `/auth/sign-in?redirect=%2Fsignout`, some earlier test leaked `stubMode`; fix
the leak, not the expectation.

## 3. New files

None.

## 4. Imports

No import changes anywhere. The auth test already imports `sessionAuth`, `statusCodes` and `mockOidcConfig`; the
signout test already imports what it needs. Do not import `vi.spyOn` helpers or `mock-oidc-config.js`.

## 5. Tests

| File | Test | Change | Pins |
|---|---|---|---|
| `src/server/auth/controller.test.js` | `GET /auth/sign-in redirects to home` | none | `signin` still redirects (covers the `_request` rename) |
| same | `GET /auth/sign-out redirects unauthenticated users to home` | none | the unauthenticated guard in `signout` still runs first |
| same | `GET /auth/sign-out drops the session and redirects authenticated users to the sign-out URL` | **new** (§2B iii) | the ruling: cached session gone, `sid` cleared, then the provider URL |
| same | `GET /auth/sign-out-oidc redirects unauthenticated users to home` | **changed** from `…to sign-out URL` (§2B ii) | already-signed-out callback lands on `/`, not the provider |
| same | `GET /auth/sign-out-oidc clears authenticated session and redirects` | **extended** (§2B iv) | the callback path also drops the cache entry and clears `sid` |
| same | three `sign-in-oidc` tests | none | untouched (question 4 territory) |
| `src/server/signout/controller.test.js` | `clears auth cookies before redirecting to the IdP sign-out URL` | none | `/signout` delegates to `signoutOidc`; behaviour unchanged |
| same | `redirects unauthenticated users to the sign-in page` | **new** (§2C) | `/signout` stays behind the session strategy; the `/` branch is not reachable from it (D4) |

Expected unit count after the stage: **521 tests** (519 + 1 new in the auth file + 1 new in the signout file), all
passing. Playwright is unaffected — no fit spec touches sign-out (`grep -rn -i signout fit/ src/server/app/features`
returns nothing); expect 50/50 as at baseline.

## 6. Invariants to prove

Run each from the ins clone paths; each must produce exactly the stated result.

**6A. The controller converges on plants to the one ruled-out line (the brief's required proof — quote the output
in the stage notes).**
`diff ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-plants-frontend/src/server/auth/controller.js ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-ins-frontend/src/server/auth/controller.js`
must print exactly:

```
38c38
<           { crn: profile.crn },
---
>           { profile },
```

Any other hunk means a copied line drifted (a comment re-flowed, a blank line, prettier re-wrapping). The same
`diff` against the animals clone must print the same four lines, because animals equals plants here. This also
satisfies `surfaces.json`'s `identical-except` rule for the file (allow list: `crn: profile\.crn`, `\{ profile \}`).

**6B. Public URL surface unchanged (invariant 1).** `git -C <ins clone> status --short` lists exactly three modified
files: `src/server/auth/controller.js`, `src/server/auth/controller.test.js`, `src/server/signout/controller.test.js`.
`src/server/auth/index.js`, `src/server/signout/index.js`, `src/server/router.js`, `src/server/app/routes.test.js`
and `src/server/app/shared/layout.njk` are untouched (`git -C <ins clone> diff --stat -- src/server/auth/index.js src/server/signout/index.js src/server/router.js src/server/app` is empty).

**6C. No new module mocks (invariant 8, D9).** `grep -c "vi.mock(" <ins clone>/src/server/auth/controller.test.js`
prints `4`; the same over `src/server/signout/controller.test.js` prints `2`.
`grep -n "spyOn\|restoreAllMocks" <both test files>` prints nothing.

**6D. Comments (invariant 6, read with D2).** The only comment lines added anywhere are the two plants blocks in §2A;
`git -C <ins clone> diff -- src/server/auth/controller.test.js src/server/signout/controller.test.js` contains no `//`
lines.

**6E. Behaviour named (invariant 2).** The stage notes carry the behaviour list from §"Behaviour changes" below,
including the D4 correction.

**6F. Ladder green (invariant 3)** — §8. Unit count 521, fit 50/50.

**6G. Journey-only machinery stays out (direction rule).** `git -C <ins clone> diff` adds no import and no file; the
controller's import block is byte-identical to plants' (covered by 6A).

## 7. Out of scope — leave alone even though it is close

- **Question 4** — the `{ profile }` versus `{ crn: profile.crn }` log line in `signinOidc` (ins line 38). It is the
  one hunk 6A must still show.
- **Question 3** — `post_logout_redirect_uri` in `src/auth/get-sign-out-url.js` and its test.
- **Question 8** — `/signout` versus `/auth/sign-out` in the layout's service navigation, `layout.njk`,
  `layout.test.js`, the tests repo's protected URL list and its two sign-out page objects.
- **Question 6** — `get-safe-redirect.js`'s `http://placeholder` lines and `config.js`'s `new Error`.
- `src/server/auth/index.js`, `src/server/signout/index.js`, `src/server/signout/controller.js`, `src/server/router.js`,
  `src/plugins/auth.js`, `src/server/common/test-helpers/mock-auth.js` — read them, do not edit them.
- `src/server/app/docs/*` and `README.md` — nothing there describes sign-out behaviour (D8).
- animals and plants clones — reference only. The tests repo — untouched.
- The `sessionAuth` helper's shape, the stub sign-in route, the `eslint.config.js` sonarjs block the journeys carry
  (a backport candidate for another stage, not this one).
- The unit suite's port-3002 `serve-static-files.test.js` collision with a running workspace stack (s14 notes): if it
  appears, it is environmental; the parent frees the port. Do not edit that test.

## 8. Ladder and landing

All commands from the workspace root form; one per Bash call; output to a log, read once.

1. `ls ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-ins-frontend/node_modules/.bin/vitest` — if
   missing, do steps 2–3, stage, then stop and report (see §Baseline).
2. Make the edits in §2A, §2B, §2C with the Edit tool.
3. Run 6A immediately and fix any drift before anything else.
4. `npm --prefix ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-ins-frontend run format > ~/git/defra/trade-imports-workspace/workareas/clones/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s15-q01-signout-session-drop-ins-format.log 2>&1`
   then re-run 6A (prettier must not have touched the controller; if it did, the copied text was not verbatim).
5. `… run format:check > …/logs/s15-q01-signout-session-drop-ins-format-check.log 2>&1`
6. `… run lint > …/logs/s15-q01-signout-session-drop-ins-lint.log 2>&1`
7. `… run test > …/logs/s15-q01-signout-session-drop-ins-test.log 2>&1` — expect 521 passed, 0 failed.
8. `… run test:fit > …/logs/s15-q01-signout-session-drop-ins-test-fit.log 2>&1` — expect 50 passed. If Playwright
   reports a missing browser, `… run playwright:install` once and re-run. If port 3002 is busy, stop and report (the
   workspace stack holds it; the parent frees it).
9. Run 6B–6D and 6G.
10. `git -C <ins clone> add src/server/auth/controller.js src/server/auth/controller.test.js src/server/signout/controller.test.js`
    and stop — the orchestrator commits.

## Behaviour changes (for the stage notes and the report)

1. Authenticated `GET /auth/sign-out` (real mode only — the route exists only when Defra ID is configured): the cached
   session is dropped and the `sid` cookie cleared **before** the redirect to the provider's sign-out URL, so a session
   no longer outlives a sign-out that Entra or the CDP WAF reject. Previously ins waited for the provider to call back
   to `/auth/sign-out-oidc`.
2. Unauthenticated `GET /auth/sign-out-oidc`: redirects to `/` instead of to the provider's sign-out URL
   (`getSignOutUrl(request, null)`), so an already-signed-out callback no longer bounces to the provider.
3. Authenticated `GET /auth/sign-out-oidc` and authenticated `GET /signout`: unchanged — they already dropped the
   session and cleared the cookie.
4. Unauthenticated `GET /signout`: **unchanged**, correcting the brief — the route is `auth: 'session'` in required
   mode, so `@hapi/cookie` redirects to the sign-in page (`/auth/sign-in?redirect=%2Fsignout`, or
   `/auth/stub-sign-in?redirect=%2Fsignout` in stub mode) before the handler runs; the new `/` branch is not reachable
   from `/signout`.
5. `signin`'s unused parameter is named `_request` — no runtime change; removes a SonarCloud S1172 finding.
