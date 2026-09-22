# s22 — the Address book link works from every service

Question 28. Ruling (Sam, 16 September 2026): *"a backlog item to figure this out;
it is not implemented properly anywhere. It might hit auth issues, which is fine,
leave those if it does, but the links should work. Each repo has the address book
link and it does not work. Implement it and see whether auth just works between
the three, first in the compose stack, then in CDP. Work merged since the initial
alignment may already add linking between the frontends and the address book;
check that first."*

Branch: `feat/NO_JIRA-frontend-alignment` (already checked out in all four repos).

## Repos and their two path spellings

| Key | Bash path (tilde — use in every Bash call) | Tool path (absolute — use in Read/Write/Edit) |
|---|---|---|
| ins | `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` |
| animals | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` |
| plants | `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` |
| tests | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests` |
| workspace | `~/git/defra/trade-imports-workspace` | `/Users/samfarrington/git/defra/trade-imports-workspace` |

---

## What is already true (measured 16 September 2026, on the branch)

The brief says measure before you build. This is the measurement; do not re-derive it,
but do re-read any file before you edit it.

| Claim | Verdict | Evidence |
|---|---|---|
| animals has a browser-visible ins URL in convict | **True** | `animals/src/config/config.js:380-387` — `tradeImportsInsFrontend.baseUrl`, `format: String`, default `http://localhost:3002`, env `TRADE_IMPORTS_INS_FRONTEND_URL` |
| animals has the journey-to-ins address handshake | **True** | `animals/src/server/app/sets/live-animals/journeys/linear/features/addresses/ins-handshake.js:57` builds `{base}/address-book/add?…` from that key |
| plants has neither the key nor the handshake | **True** | `plants/src/config/config.js` ends at `tradeImportsReferenceDataApi` (line 371); no `sets/*/features/addresses` |
| all three layouts point Address book at a dead link | **Partly** | animals `layout.njk:18` and plants `layout.njk:18` both `{% set addressBookUrl = "#" %}`. **ins does not** — `ins/src/config/nunjucks/context/context.js:65` already supplies `addressBookUrl: addressBookPath()` = `/address-book`, and `ins/src/server/app/shared/layout.njk:45` uses it. ins's item already works. |
| ins holds the address-book and animals-frontend URLs | **True** | `ins/src/config/config.js:364-395` — `tradeImportsAddressBookApi`, `tradeImportsAnimalsFrontend` (`format: 'url'`, default `http://localhost:3000`) |
| ins already links back to a journey frontend | **True** | `ins/src/server/app/features/dashboard/view-model/list.js:106-116` — every dashboard row's `href` and the empty-state "Start a new notification" button point at the animals base URL |
| the compose stack already sets the animals→ins key | **True** | `docker/stack/frontend.compose.yml:66` `TRADE_IMPORTS_INS_FRONTEND_URL=http://localhost:3002` |
| the compose stack already sets the ins→animals key | **True** | `docker/stack/frontend.compose.yml:119` `TRADE_IMPORTS_ANIMALS_FRONTEND_URL=http://localhost:3000` |
| any repo documents these env vars in a README table | **False** | no `TRADE_IMPORTS_*` row in any of the three READMEs. ins documents them in `src/server/app/docs/services.md` (a `## Configuration` table); animals and plants document no env var anywhere. See decision **D6**. |
| plants is in the compose stack | **True**, port 3003 | `docker/stack/frontend.compose.yml:152,177` |
| the tests repo can already drive all four services | **True** | `tests/page-objects/base/base-page.ts:57-75` — `navigateToFrontend`, `navigateToInsFrontend`, `navigateToPlantsFrontend`, each reading a `TRADE_IMPORTS_*_BASE_URL` set by `utils/playwright/with-project-base-urls.ts` |

So the stage is small: **two layouts and one convict block to add, one key to mirror
into ins, compose + docs to keep honest, and one cross-service Playwright spec.**

## Baselines (captured before planning — a later red is unambiguous)

| Repo | Script | Result | Log |
|---|---|---|---|
| ins | `npm test` | green — 61 files, 595 tests | `workareas/shared/frontend-alignment/logs/s22-address-book-links-baseline-ins-test.log` |
| animals | `npm test` | green — 183 passed / 2 skipped, 2350 tests | `…-baseline-animals-test.log` |
| plants | `npm test` | green — 146 passed / 2 skipped, 1921 tests | `…-baseline-plants-test.log` |
| tests | `npm run typecheck` | green, no output | `…-baseline-tests-typecheck.log` |

---

## 0. Decisions

Every fork the brief left open, settled here. **Do not re-open any of these.**

**D1 — The Address book item in animals and plants points at the ins address book, and
the URL comes from the view context, not from the template.**
A `.njk` cannot read convict. ins already takes `addressBookUrl` from the per-request
view context (`ins/src/config/nunjucks/context/context.js:65`), so animals and plants
converge on the same context key, with the same name, and the `{% set addressBookUrl = "#" %}`
line disappears from both layouts. The href becomes
`http://localhost:3002/address-book` by default, and whatever
`TRADE_IMPORTS_INS_FRONTEND_URL` says in a deployed environment.

**D2 — The helper that builds that URL lives in each journey's
`src/config/nunjucks/context/context.js`, not in `src/server/app/shared/paths.js`.**
ins builds its own value from `shared/paths.js`, so a naive alignment would put it there
too. It does not go there: `paths.js` in animals and plants is a pure, config-free module
imported by the journey engine, and the ins address book is *another service's* URL, not
one of this service's paths. `context.js` is the only consumer, already imports `config`,
and is byte-identical between animals and plants today — it stays byte-identical after
this stage. Record this divergence from ins in the commit message, not in a comment.

**D3 — The helper is a named module-scope arrow function called per request, not a
module-scope constant.** A constant freezes the value at import time and makes the key
untestable with `config.set(…)`; ins's own `content-security-policy.js` shows the cost of
that. One line, explicit name, no metaphor:

```js
const insAddressBookUrl = () =>
  `${config.get('tradeImportsInsFrontend.baseUrl').replace(/\/$/, '')}/address-book`
```

The `.replace(/\/$/, '')` is the shape animals already uses for this key
(`ins-handshake.js:57`) — a configured base URL with a trailing slash must not produce
`//address-book`.

**D4 — "ins links back to the journeys" is satisfied by the links ins already has; ins
gains no new UI in this stage.** ins's dashboard already builds every row `href` and the
"Start a new notification" button from `tradeImportsAnimalsFrontend.baseUrl`
(`features/dashboard/view-model/list.js:106-116`). That is the link back, it works, and
the brief forbids building a second mechanism. `buildNotificationLink` is explicitly
single-journey ("there is nothing on a notification yet that says which journey owns it")
and making it journey-aware is a different ticket.

**D5 — ins's new `tradeImportsPlantsFrontend.baseUrl` key gets exactly one consumer this
stage: the content-security-policy `form-action` allow-list.** The brief says ins keeps
its animals key and adds a plants one "in the same shape". A convict key nothing reads is
dead config, so it gets the one consumer in ins that must name *every* sibling journey
origin the browser may be redirected to after a form POST —
`src/server/common/helpers/content-security-policy.js:32`, today `['self', animalsFrontendOrigin]`.
Naming plants there is the literal "same shape" as animals and costs no UI. It is
deliberately forward-looking: plants has no handshake yet, so today the entry changes
nothing a user can see. Say so in the commit message. This is recorded as an open
question on the stage — see §7.

**D6 — "each repo's README environment table" means each repo's
`src/server/app/docs/services.md`.** No README in any of the three frontends has an
environment table, and inventing one in two repos would strand a half-list next to a
complete one. ins already carries the canonical table
(`ins/src/server/app/docs/services.md:64-75`, "## Configuration", columns *Convict key |
Env var | Default*, followed by the browser-visible-vs-`host.docker.internal` note).
animals and plants get the **same section, same columns, same trailing note**, listing
**every** `TRADE_IMPORTS_*` convict key that repo has — not just the new one. ins's table
gains the plants row.

**D7 — plants' block is byte-identical to animals'.** The brief says "byte-identical
except for values" — and for this key there are no differing values: same doc string,
same `format: String`, same default `http://localhost:3002`, same env var. Copy animals'
block verbatim, including the `format: String` (do **not** "improve" it to ins's
`format: 'url'` — animals is the reference for the journeys). ins's new plants key
mirrors ins's own animals key instead, `format: 'url'` included, because inside ins
consistency with its neighbour wins.

**D8 — The new Playwright spec lives in the `e2e` project and is tagged
`['@compose', '@integration']`.** It starts on animals, so it belongs to the `e2e`
project (baseURL = animals) and must **not** go under `tests/e2e/features/ins/` — that
directory is claimed by the `ins` project, whose baseURL is ins.
`@compose` is not a speed choice: the CDP environments have no
`TRADE_IMPORTS_INS_FRONTEND_URL` for animals or plants yet (Sam applies those
`cdp-app-config` entries by hand — §7), so on CDP the link would resolve to
`http://localhost:3002` and the spec would fail for a configuration reason, not a code
one. **Drop the `@compose` tag in a follow-up once the CDP entries are applied.** Record
that in the stage notes; precedent for the tag is
`tests/e2e/features/promoted-lifecycle.spec.ts:5`.

**D9 — The spec absorbs a second sign-in rather than asserting there is none.** The
`e2e` project's worker auth state keeps only the animals `sid` cookie
(`fixtures/auth-state.ts:127-133`), so crossing to `localhost:3002` lands on the
defra-id stub's sign-in form. That is the answer to "see whether auth just works": in the
compose stack it does not — each service signs the trader in separately. The spec signs
in again through the existing `signInWhenRequested` path and asserts the link works. Do
**not** change any session or cookie configuration to make the sign-in disappear; sharing
a session between services is out of scope by the brief.

**D10 — The return hop goes ins address book → ins Dashboard → the first animals link on
the ins dashboard.** ins's address book page has no link to a journey, so the round trip
uses the two real links that exist. The animals link is matched by
`a[href^="<animals base URL>"]`, which resolves in both dashboard branches — the
empty-state `govukButton` (rendered as an `<a>`) and the populated table's row links.
The assertion is *"the browser is back on the animals origin"*, not a specific animals
page, because which of those two links renders depends on what the shared stack has in
ins-backend.

**D11 — `requireBaseUrl` in `tests/page-objects/base/base-page.ts` becomes an export.**
It is already the single guarded reader of the four `TRADE_IMPORTS_*_BASE_URL` vars; the
new spec needs two of them and must not read `process.env` itself. Export the existing
function; change nothing else about it.

---

## 1. Moves

**None.** No file moves, no deletions, in any repo.

---

## 2. Edits

### animals (`repos/trade-imports-animals-frontend`)

**`src/server/app/shared/layout.njk`**
Delete line 18 (`{% set addressBookUrl = "#" %}`) and rewrite the comment above it so it
describes only what is left. Lines 15-19 today:

```njk
{# The address book and the account page have no home in this service yet, so
   both point at a placeholder — as Design release 1 does for the account page.
   Where the address book lives is settled separately. #}
{% set addressBookUrl = "#" %}
{% set manageAccountUrl = "#" %}
```

become, following the shape ins's own layout already uses (`ins/.../layout.njk:14-17`):

```njk
{# The account page has no home in this service yet, so it points at a
   placeholder — as Design release 1 does. The address book is a page in
   trade-imports-ins-frontend; its URL arrives in the view context. #}
{% set manageAccountUrl = "#" %}
```

Nothing else in the file changes — the navigation item at lines 45-48 already reads
`href: addressBookUrl`, which now resolves from the context. Do **not** add
`active: activeNavigationItem == "addressBook"` to that item: the address book is never a
section of this service.

**`src/config/nunjucks/context/context.js`**
Add the named helper from D3 at module scope, below `manifestPath` and above
`let webpackManifest`, and add one key to the returned object next to
`activeNavigationItem`:

```js
const insAddressBookUrl = () =>
  `${config.get('tradeImportsInsFrontend.baseUrl').replace(/\/$/, '')}/address-book`
```

```js
    activeNavigationItem: activeNavigationItem(request.path),
    addressBookUrl: insAddressBookUrl(),
```

The key order matters only for readability; put `addressBookUrl` straight after
`activeNavigationItem`, as ins does.

**`src/server/app/docs/services.md`**
Append a `## Configuration` section imitating ins's
(`ins/src/server/app/docs/services.md:64-75`) — same heading, same three columns, same
alignment, same closing note adapted to this repo's browser-visible key. Rows, in
`config.js` order:

| Convict key | Env var | Default |
| `tradeImportsAnimalsBackendApi.baseUrl` | `TRADE_IMPORTS_ANIMALS_BACKEND_URL` | `http://localhost:8085` |
| `tradeImportsReferenceDataApi.baseUrl` | `TRADE_IMPORTS_REFERENCE_DATA_URL` | `http://localhost:8086` |
| `tradeImportsAddressBookApi.baseUrl` | `TRADE_IMPORTS_ADDRESS_BOOK_URL` | `http://localhost:8089` |
| `tradeImportsInsFrontend.baseUrl` | `TRADE_IMPORTS_INS_FRONTEND_URL` | `http://localhost:3002` |

Closing note, in ins's words adapted: *"The last one is browser-visible (the service
navigation's Address book link and the address handshake), so under the workspace stack
it stays `localhost` while the three API URLs use `host.docker.internal`."*

`src/config/config.js` is **unchanged** — the key is already there.

### plants (`repos/trade-imports-plants-frontend`)

**`src/config/config.js`**
Add the block from D7 after `tradeImportsReferenceDataApi` (which closes at line 371),
as the last entry before the closing `})`. Copy this verbatim from
`animals/src/config/config.js:380-387`:

```js
  tradeImportsInsFrontend: {
    baseUrl: {
      doc: "Trade Imports INS Frontend base URL. Browser-visible — used to build deep links the trader's own browser navigates to, so it must resolve outside the Docker network (unlike the server-side API base URLs above).",
      format: String,
      default: 'http://localhost:3002',
      env: 'TRADE_IMPORTS_INS_FRONTEND_URL'
    }
  }
```

Remember the comma after the preceding block.

**`src/server/app/shared/layout.njk`** — identical edit to animals'. The two files are
byte-identical at lines 9-19 today and must stay byte-identical after.

**`src/config/nunjucks/context/context.js`** — identical edit to animals'. These two
files are byte-identical today; prove they still are (§6).

**`src/server/app/docs/services.md`**
This file has no `## Configuration` section at all. Append one, same shape as animals'
(D6), with plants' keys:

| Convict key | Env var | Default |
| `tradeImportsPlantsBackendApi.baseUrl` | `TRADE_IMPORTS_PLANTS_BACKEND_URL` | `http://localhost:8091` |
| `tradeImportsReferenceDataApi.baseUrl` | `TRADE_IMPORTS_REFERENCE_DATA_URL` | `http://localhost:8086` |
| `tradeImportsInsFrontend.baseUrl` | `TRADE_IMPORTS_INS_FRONTEND_URL` | `http://localhost:3002` |

Note there is deliberately **no** `tradeImportsAddressBookApi` row: plants reads
`process.env.TRADE_IMPORTS_ADDRESS_BOOK_URL` directly in
`src/server/app/services/address-book/client.js:8-9` rather than through convict. Leave
that alone (§7) and leave it out of the table, which is a table of convict keys.

### ins (`repos/trade-imports-ins-frontend`)

**`src/config/config.js`**
Add, immediately after the `tradeImportsAnimalsFrontend` block (lines 388-395) and before
the closing `})`, mirroring that block's shape exactly — `format: 'url'` included:

```js
  tradeImportsPlantsFrontend: {
    baseUrl: {
      doc: "Trade Imports Plants Frontend base URL. Browser-visible — used to build deep links the trader's own browser navigates to, so it must resolve outside the Docker network (unlike the server-side API base URLs above).",
      format: 'url',
      default: 'http://localhost:3003',
      env: 'TRADE_IMPORTS_PLANTS_FRONTEND_URL'
    }
  }
```

Remember to add a comma after the `tradeImportsAnimalsFrontend` block.

**`src/server/common/helpers/content-security-policy.js`**
Replace the single-origin constant at lines 5-7 with a named list of both journey
origins, and widen `formAction`:

```js
const journeyFrontendOrigins = [
  config.get('tradeImportsAnimalsFrontend.baseUrl'),
  config.get('tradeImportsPlantsFrontend.baseUrl')
].map((baseUrl) => new URL(baseUrl).origin)
```

```js
    // Handshake save/cancel POSTs 302 to a journey frontend; browsers enforce form-action on that redirect.
    formAction: ['self', ...journeyFrontendOrigins],
```

Keep the comment as a *why* comment (it explains a non-obvious browser rule); just widen
"animals-frontend" to "a journey frontend".

**`src/server/app/docs/services.md`**
Add one row to the existing table (after the `tradeImportsAnimalsFrontend` row at line 71):

| `tradeImportsPlantsFrontend.baseUrl` | `TRADE_IMPORTS_PLANTS_FRONTEND_URL` | `http://localhost:3003` |

and change the closing note (lines 73-75) from *"The last one is browser-visible (the
dashboard's row links)"* to *"The last two are browser-visible (the dashboard's row links,
and the journey origins the content-security-policy trusts for the handshake's
form-action)"* — keep the rest of the sentence, including the
`host.docker.internal` contrast, as it stands.

`src/server/app/shared/layout.njk` and `src/config/nunjucks/context/context.js` are
**unchanged** in ins. Its Address book item already works.

### tests (`repos/trade-imports-animals-tests`)

**`page-objects/base/base-page.ts`**

1. Line 9 — change `function requireBaseUrl(` to `export function requireBaseUrl(`. No
   other change to that function (D11).
2. Add two service-navigation link getters to `BasePage`, beside the existing
   `linkSignOut` (lines 38-43), with a docstring in the same register:

```ts
  /** The three frontends carry the same service navigation. "Address book" leaves
   * a journey frontend for trade-imports-ins-frontend and stays in-service on ins;
   * `exact` keeps the match off "Add a new address" and any heading of the same name. */
  get linkAddressBook(): Locator {
    return this.page.getByRole('link', { name: 'Address book', exact: true });
  }

  get linkDashboard(): Locator {
    return this.page.getByRole('link', { name: 'Dashboard', exact: true });
  }
```

3. Add a public wrapper over the protected `signInWhenRequested`, placed directly above
   it, so a cross-service spec can absorb the target service's sign-in after following a
   link rather than after its own `goto`:

```ts
  /** A link into another service lands on that service's sign-in when this browser
   * context has no session for it — the compose stack gives each service its own
   * session cookie. Call after clicking a cross-service link. */
  async completeSignInIfRequested(options?: { userId?: string; organisationSbi?: string }): Promise<void> {
    await this.signInWhenRequested(true, options);
  }
```

No other tests-repo file changes.

### workspace (`.`)

**`docker/stack/frontend.compose.yml`** — two additions, both browser-visible localhost
origins, both carrying the same one-line comment style the file already uses at lines
64-65 and 116-118. **Never touch `docker/stack/.staged/`.**

1. `trade-imports-ins-frontend`, after `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` (line 119):

```yaml
      - TRADE_IMPORTS_PLANTS_FRONTEND_URL=http://localhost:3003
```

(the browser-visible comment above line 119 already covers both; extend its wording to
"deep-link bases" rather than repeating it.)

2. `trade-imports-plants-frontend`, after `TRADE_IMPORTS_REFERENCE_DATA_URL` (line 161):

```yaml
      # Browser-visible deep-link base — must stay localhost, not
      # host.docker.internal (see trade-imports-ins-frontend below).
      - TRADE_IMPORTS_INS_FRONTEND_URL=http://localhost:3002
```

Note the animals service at line 66 already has its key — **do not duplicate it**.

**`docker/stack/AGENTS.md`** — add two rows to the hostname table at lines 225-231, so
the localhost-vs-`host.docker.internal` rule covers the cross-service frontend URLs:

| animals / plants frontend | `TRADE_IMPORTS_INS_FRONTEND_URL` | `http://localhost:3002` (browser follows the Address book link) |
| ins frontend | `TRADE_IMPORTS_{ANIMALS,PLANTS}_FRONTEND_URL` | `http://localhost:{3000,3003}` (browser follows the dashboard's journey links) |

---

## 3. New files

One, in the tests repo.

**`tests/e2e/features/address-book-navigation.spec.ts`**

Imitate `tests/e2e/features/ins/notification-dashboard-navigation.spec.ts` — the repo's
existing cross-service spec: one `test.describe` with a tag array, one test, `test.slow()`,
Given/When/Then comments, no helper indirection. Write it as:

```ts
import { test, expect } from '@fixtures';
import { requireBaseUrl } from '@page-objects/base/base-page';

test.describe('Address book navigation between services', { tag: ['@compose', '@integration'] }, () => {
  test('follows the Address book item from the animals journey to the INS address book and back', async ({ pages }) => {
    test.slow();

    const animalsBaseUrl = requireBaseUrl('TRADE_IMPORTS_ANIMALS_FRONTEND_BASE_URL');
    const animalsOrigin = new URL(animalsBaseUrl).origin;
    const insOrigin = new URL(requireBaseUrl('TRADE_IMPORTS_INS_FRONTEND_BASE_URL')).origin;

    // Given — a signed-in trader on the animals notification dashboard
    await pages.notificationDashboard.open();

    // When — they follow the Address book item in the service navigation
    await Promise.all([
      pages.page.waitForURL((url) => url.origin !== animalsOrigin),
      pages.notificationDashboard.linkAddressBook.click(),
    ]);
    // Each service signs a trader in separately, so the link lands on INS's sign-in first.
    await pages.insAddressBookList.completeSignInIfRequested();

    // Then — they are on the INS address book, in the INS service
    await expect(pages.page).toHaveURL((url) => url.origin === insOrigin && url.pathname === '/address-book');
    await expect(pages.insAddressBookList.heading).toBeVisible();

    // And — the way back to the journey frontend works, via the INS dashboard
    await pages.insAddressBookList.linkDashboard.click();
    await expect(pages.insDashboard.heading).toBeVisible();
    await pages.page.locator(`a[href^="${animalsBaseUrl}"]`).first().click();

    await expect(pages.page).toHaveURL((url) => url.origin === animalsOrigin);
  });
});
```

Notes for the implementor, so you do not "fix" these into something worse:

- The spec must **not** live under `tests/e2e/features/ins/` — that path is the `ins`
  project's, whose baseURL is ins, and this test starts on animals (D8).
- `a[href^="${animalsBaseUrl}"]` is deliberately loose (D10): on an empty ins dashboard
  the only animals link is the "Start a new notification" button; on a populated one they
  are the row links. `.first()` picks whichever exists.
- No `storageState` override. The worker's animals session is what makes the first
  `open()` free; the ins sign-in is expected (D9).
- If the round trip fails for an authentication reason, **leave the links in place**,
  record exactly what happened in the stage notes, and report it. The ruling says auth
  problems are acceptable; broken links are not.

---

## 4. Imports

Only three import edges are disturbed; there is no module moved, so no path rewriting.

1. `animals/src/config/nunjucks/context/context.js` and its plants twin already
   `import { config } from '../../config.js'` (line 4). The new helper uses that import —
   **add no import**.
2. `ins/src/server/common/helpers/content-security-policy.js` already
   `import { config } from '../../../config/config.js'` (line 3) — **add no import**.
3. `tests/.../address-book-navigation.spec.ts` imports `requireBaseUrl` from
   `@page-objects/base/base-page` (the alias the repo already uses everywhere) — that is
   the only new import edge, and it is what D11's `export` is for. Do not import
   `process.env` readers, and do not add a new `utils/` module for this.

No cross-repo imports, ever (programme invariant).

---

## 5. Tests

### Tests that change

| File | Change | What it pins after |
|---|---|---|
| `animals/src/server/app/shared/layout.test.js` | `renderLayout` (lines 13-20) gains `addressBookUrl: ADDRESS_BOOK_URL` in its default context, with `const ADDRESS_BOOK_URL = 'http://ins.test/address-book'` declared beside `PHASE_BANNER`. The href assertion at lines 45-50 becomes `['/', ADDRESS_BOOK_URL, '#', '/auth/sign-out']`. | The Address book item renders the URL the context gives it, and only the account item is still a placeholder. |
| `plants/src/server/app/shared/layout.test.js` | Identical change — the two files are byte-identical up to the extra `page title` describe at the end of animals'. | Same. |
| `animals/src/config/nunjucks/context/context.test.js` | Both whole-object `toEqual` assertions (the one at line 47 and the second at line ~172) gain `addressBookUrl: 'http://localhost:3002/address-book'`. | The context carries the ins address-book URL built from the configured default. |
| `plants/src/config/nunjucks/context/context.test.js` | Identical change at both sites (`serviceName: 'Plants'`, lines 50 and 172). | Same. |
| `ins/src/server/common/helpers/content-security-policy.test.js` | Add one assertion beside line 32: `expect(policy).toMatch(/form-action[^;]*http:\/\/localhost:3003/)`. | `form-action` names both journey origins, not just animals'. |

### New tests

| File | Test | What it pins |
|---|---|---|
| `animals/src/config/nunjucks/context/context.test.js` | Add, in the same `describe('#context')` block: *"Should strip a trailing slash from the configured INS base URL"* — `vi.doMock` the config so `tradeImportsInsFrontend.baseUrl` is `'http://ins.test/'` (the same `doMock`-then-re-import shape the file's last describe already uses for `auth.enabled`), then assert `addressBookUrl` is `'http://ins.test/address-book'`. | The `.replace(/\/$/, '')` in D3 — without it a configured trailing slash yields `//address-book`. |
| `plants/src/config/nunjucks/context/context.test.js` | The same test, same wording. | Same. |
| `ins/src/config/config.test.js` | Add beside the existing default tests (lines 19-29): *"loads TRADE_IMPORTS_PLANTS_FRONTEND_URL with the 3003 default"* — `expect(config.get('tradeImportsPlantsFrontend.baseUrl')).toBe('http://localhost:3003')`. | The new key exists and defaults, so ins still starts without the env var. |
| `plants/src/config/config.test.js` (create if absent — check first) | *"loads TRADE_IMPORTS_INS_FRONTEND_URL with the 3002 default"*. If plants has no `config.test.js`, add the assertion to whichever existing test file already asserts a convict default; do **not** create a one-assertion file if a home exists. | Same, for plants. |
| `tests/tests/e2e/features/address-book-navigation.spec.ts` | The new spec in §3. | The Address book item in animals reaches ins's list page across an origin boundary, and a link back reaches animals again. |

### Tests that move

None.

### Tests you must not write

No test that asserts the *number* of sign-ins, no per-environment URL round-trip test, no
test that re-asserts an unchanged layout item. No coverage-padding.

---

## 6. Invariants to prove

Run each of these and paste the result into the stage record.

**I1 — ins's public URL surface is unchanged.** This stage adds no ins route.
```
grep -rn "pageRoutes(\|routes = " ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features
```
The set must be exactly `/`, `/address-book`, `/address-book/add`, `/address-book/{id}`,
`/address-book/{id}/edit`, `/address-book/{id}/delete` — unchanged from the baseline.
`git -C … diff --stat` on ins must show only `config.js`, `config.test.js`,
`content-security-policy.js`, `content-security-policy.test.js` and `docs/services.md`.

**I2 — no dead `#` address-book link survives.**
```
grep -rn "addressBookUrl = \"#\"" ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src
```
must return nothing.

**I3 — animals and plants stay byte-identical where they were byte-identical.**
```
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/config/nunjucks/context/context.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/config/nunjucks/context/context.js
```
must return nothing. And on the layouts:
```
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/shared/layout.njk ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/shared/layout.njk
```
must show only the two differences that existed before this stage — the page-title line
(26) and the `staleActionRejected` banner — and no new one.

**I4 — every new key has a default, so a service still starts without it.**
```
grep -rn "tradeImportsInsFrontend" -A 6 ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/config/config.js
grep -rn "tradeImportsPlantsFrontend" -A 6 ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/config/config.js
```
Each must show a `default:`. The `config.validate({ allowed: 'strict' })` call at the foot
of each file is the enforcement; the unit suites boot config, so a malformed block turns
the whole suite red.

**I5 — no new shared package, no cross-repo import.**
```
grep -rn "trade-imports-ins-frontend/src\|trade-imports-animals-frontend/src\|trade-imports-plants-frontend/src" ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src
```
must return nothing.

**I6 — the copy invariant is untouched.** This stage creates no user-facing string: the
Address book label already lives in `shared/copy.en.js`/`copy.cy.js` in all three repos,
and a URL is a destination, not copy (the layouts say so in their own comments). Prove it:
```
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend diff --name-only
```
must list no `copy.*.js`. Same for plants and ins.

**I7 — `.staged/` was never edited.**
```
git -C ~/git/defra/trade-imports-workspace status --porcelain docker/stack/.staged
```
must return nothing.

**I8 — the ladder.** Per repo, to a file under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/`, read once:

| Repo | Commands (one Bash call each, output redirected) |
|---|---|
| ins | `npm --prefix …/repos/trade-imports-ins-frontend run format:check`, `run lint`, `test` |
| animals | same three |
| plants | same three |
| tests | `npm --prefix …/repos/trade-imports-animals-tests run typecheck`, `run lint`, `run format:check` |

Test counts must be **at or above** the baselines in the table at the top (595 / 2350 /
1921) — new tests raise them; nothing may disappear. Formatting is fixed **only** by
`npm --prefix <repo> run format`, run from the repo via `--prefix`.

**I9 — the round trip in the compose stack.** Bring the stack up with `tim docker dev`,
then run the tests repo's compose suite and read the log once. The workspace PR's own run
is the gate. If the new spec is red for an authentication reason, keep the links and
record the exact failure; if it is red because a link 404s or points at `#`, that is a
code failure and must be fixed.

---

## 7. Out of scope

Leave every one of these alone, even though the diff will tempt you.

- **Sharing a session between the services.** The brief forbids it. Do not change
  `SESSION_CACHE_NAME`, `AUTH_SESSION_COOKIE_NAME`, cookie domains, or anything in
  `src/auth/`. A second sign-in when crossing services is the finding, not a bug to fix.
- **Any change to the address-book API** (`trade-imports-address-book`) or to any
  frontend's `services/address-book/client.js`. That includes plants reading
  `process.env.TRADE_IMPORTS_ADDRESS_BOOK_URL` directly instead of through convict
  (`plants/src/server/app/services/address-book/client.js:8-9`) — a real inconsistency,
  and not this stage's.
- **Any change to the handshake.** `animals/.../addresses/ins-handshake.js`,
  `ins/.../address-book/journey-registry.js`, `handshake-context.js`, the party-picker and
  contact controllers, `address-return/`, and their copy all stay exactly as they are. The
  navigation link is a plain link; it is not a second handshake, and it must not gain a
  `journey-type`, a `notification-id` or a token.
- **Making ins's dashboard links journey-aware.** `buildNotificationLink` stays
  single-journey (D4). Do not route rows to plants, do not add a second start button, do
  not touch `features/dashboard/`.
- **Giving plants the handshake.** The brief gives plants the convict block and the
  navigation link, nothing else.
- **cdp-app-config.** No agent writes that repository. Do not open it, do not draft a
  commit into it. The entries Sam must apply by hand are recorded in the stage notes and
  belong in the report:
  - `trade-imports-animals-frontend` → `TRADE_IMPORTS_INS_FRONTEND_URL` =
    `https://trade-imports-ins-frontend.<env>.cdp-int.defra.cloud`
  - `trade-imports-plants-frontend` → `TRADE_IMPORTS_INS_FRONTEND_URL` =
    `https://trade-imports-ins-frontend.<env>.cdp-int.defra.cloud`
  - `trade-imports-ins-frontend` → `TRADE_IMPORTS_PLANTS_FRONTEND_URL` =
    `https://trade-imports-plants-frontend.<env>.cdp-int.defra.cloud`
  - `trade-imports-ins-frontend` → `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` =
    `https://trade-imports-animals-frontend.<env>.cdp-int.defra.cloud` — **confirm before
    adding**; ins's dashboard links already need it, so it may exist.

  These are browser-visible public hostnames (the trader's browser follows them), so the
  `cdp-int.defra.cloud` names, not internal service names. One set per deployed
  environment.
- **Plants' journey spec JSON.** `plants/src/server/app/sets/high-risk-plants/spec/`
  records the Address book link as parked at `#` under the Sam-gated extra
  `chrome-placeholders-and-service-name` (`journey-spec.json:168`, `backlog-extras.json:513`,
  `decisions.json`, `conflicts.json`). Nothing asserts that text against the layout, and
  those files belong to the journey-builder programme. Do not edit them; the drift is
  recorded as an open question on this stage.
- **The neighbouring open questions the brief names.** Where the dashboard lives, whether
  "Manage account" gets a home, whether ins or a journey owns the front door — all
  separate questions. `manageAccountUrl` stays `"#"` in all three services.
- **Dropping the `@compose` tag.** It comes off only after the CDP entries above are
  applied — a follow-up, not this stage (D8).
