# Assessment: real service pattern (Sam's comment 3)

> "For work on something that isn't implemented yet and might need a new
> service, make sure the skills create the service in the correct place, using
> the index and stub pattern the real services use, so it all hangs together as
> the proper frontend does."

Prototype checkout: `repos/trade-imports-plants-prototype`, branch
`feat/NO_JIRA-designer-prototyping`, HEAD `abae120`. Every claim below comes
from reading the files, not the earlier handover.

## Verdict: not covered

The suite builds fakes in a parallel structure of its own
(`src/server/prototype-services/<name>/{index.js,data.json,index.test.js}`,
with a separate registry). It does not follow the real
`src/server/app/services/<name>/{index.js,client.js,stub.js}` pattern. A
developer cannot lift a fake: it has no client, no mode switch, uses different
function names from the real API it stands in for, and sits somewhere the real
frontend has no folder for.

What already works, and should be kept: the "needs a real service" honesty, a
store for each release and each organisation, saving across restarts, Reset,
and the hand-off flagging the fake.

## Evidence: the real pattern

Plants-frontend (read-only) and the prototype copy are the same:

| Service | Files | Mode switch |
|---|---|---|
| countries | `src/server/app/services/countries/{index,client,stub}.js` | `index.js` calls `isStubMode()` (prototype patch: `isStubDataMode()`) in `ensureLoaded` |
| ports | `src/server/app/services/ports/{index,client,stub}.js` | same |
| address-book | `src/server/app/services/address-book/{index,client}.js`, `stub/{index,from-row}.js`, `address-book.test.js` | `search`/`party` branch on `isStubDataMode()` |
| records | `services/persistence/records/{index.js, stub/, real/}` | `export const records = isStubDataMode() ? stubRecords : realRecords` |

- `client.js` reads its base URL from the environment with a localhost default
  (`countries/client.js:1-2` `TRADE_IMPORTS_REFERENCE_DATA_URL`,
  `address-book/client.js:8-9` `TRADE_IMPORTS_ADDRESS_BOOK_URL`). It sends the
  `Trade-Imports-Organisation-Id` and tracing headers, and maps the wire shape
  to the display shape in `toRecord`.
- Controllers import the barrel only:
  `import * as addressBook from '../../../../../../services/address-book/index.js'`
  (plants-frontend `features/address-book-picker/render.js:3`,
  `check-answers/controller.js:6`; `ports` in `arrival-details/controller.js:17`).
- Tests sit beside the service and cover both modes with a stubbed global
  `fetch` (`address-book/address-book.test.js`).
- The best template for a writeable service is the INS frontend's
  `repos/trade-imports-ins-frontend/src/server/app/services/address-book/`.
  `index.js` has `const addressBook = () => (isStubMode() ? stub : client)`,
  checked on each call. It exports `listAddresses`, `createAddress`,
  `getAddress`, `updateAddress` and `deleteAddress`. `stub.js` is an in-memory
  `Map` for each organisation with the same signatures as `client.js`.
  Validation is server-side: `isValidationFailure` and
  `mapApiErrorsToFormErrors` turn a 400 problem body into form errors.
- Plants-frontend has a second tier too. Set-owned services sit at
  `sets/<set>/services/<name>/index.js` (`sets/high-risk-plants/services/commodities/`),
  for vocabulary that belongs to one journey. Its `docs/services.md` says a
  set-owned service gets "stub and real clients behind a `configure*` seam in
  this set's gateway" when generic code needs one.
- There is prior art for the transporter name. Plants-frontend removed
  `services/commercial-transporters/{index,records}.js` in `a810e68` (#30), and
  the animals frontend still has `services/transporters/{index,records,register}.js`.
  Upstream could bring a transporter service back, so a name clash is a real
  risk and not only a theory.
- Guard rails: `.dependency-cruiser.cjs` treats `services/` as L2. `no-l2-to-sets`
  means a service may not import a set. A service may import `shared/set-context.js`,
  which is how `prototype-data` scopes rows by set today. `no-orphans` only
  warns.

## Evidence: what the suite built

- `src/server/prototype-services/transporters/index.js`: a single file, with no
  client and no mode switch. It exports `search`, `transporter`,
  `validateTransporter`, `addTransporter`, `removeTransporter`, `clear`, and
  `SERVICE.needsARealService`. Validation runs in the service and returns error
  codes. The starter rows are in `data.json`.
- `templates/index.js` has the same shape. `templates/journey.js` imports
  `app/engine/journey.js` and `app/engine/persistence/records.js`. That is
  feature glue, not a service.
- `address-book/index.js` imports the real stub (`app/services/address-book/stub/index.js`)
  and re-implements `search`/`party`, adding `addAddress`/`removeAddress`.
  Its names do not match the real write API (INS `createAddress`/`deleteAddress`).
  To use it, a release swaps the import in every picker
  (`fake-a-service/references/address-book-pages.md:36`, "Three files in the
  release read the real address book. Swap one import"). A lifted page would
  then carry a path that does not exist upstream.
- `lib/registry.js` is its own registry (`registerFake`, `clearFakesFor`,
  `describeFakes`), populated by `lib/fake-store.js:136`.
- `fake-a-service/references/fake-a-service.md:512-535` ("Making a new fake")
  tells the agent to create `src/server/prototype-services/<name>/` with
  `data.json`, `index.js` and `index.test.js`. It never mentions `client.js`,
  `stub.js`, a mode switch or a config URL.
- Pages import it with seven `../`
  (`'../../../../../../../prototype-services/transporters/index.js'`,
  `fake-a-service.md:91,135`).
- The hand-off detects fakes by the path segment `prototype-services/`
  (`scripts/designer/handoff/impact.js:83-96`). The brief then says "uses
  "transporters" (prototype-services), which only exists in the prototype: it
  needs a real service" (`brief.test.js:131`). There is no contract or code the
  real team can take.
- No design release exists yet (`src/server/app/sets/` holds only
  `high-risk-plants` and `sample-journey`). Nothing in `src/` imports a fake
  except its own tests, so migrating now costs nothing downstream.

The rules also push away from the real place:

- `CLAUDE.md` rule 10 and `fake-a-service/SKILL.md` "Never edit shared code"
  both forbid `src/server/app/services/**` outright.
- `.claude/rules/ownership.md` fires on `src/server/app/services/**` with the
  heading "Stop: this file belongs to the real plants service".
- `.claude/rules/designer-sets.md:19` lists `services` as shared platform.

## Target design

### Two homes, chosen by who would own the real thing

| The fake stands in for | Home | Example |
|---|---|---|
| A platform or remote service: data behind an API, any journey could read it | `src/server/app/services/<name>/` | transporters, templates, address-book writes |
| Vocabulary for one journey: options, allow-lists | `src/server/app/sets/<release>/services/<name>/index.js` (already the release's own, already `ours`) | a new category list for a design |

The rest of this note is about the first row. The second is already safe. It
only needs a line in the skill saying "journey vocabulary goes in the release's
own `services/`, like `high-risk-plants/services/commodities`".

### Files for a new platform-shaped service (`transporters` as the example)

```
src/server/app/services/transporters/
  index.js               barrel; the only thing pages import
  client.js              the proposed real API: fetch against an env URL
  stub.js                in-memory store, same signatures as client.js
  transporters.test.js   both modes, beside the service
```

- **`index.js`** copies the INS barrel exactly:

  ```js
  import { isStubDataMode } from '../../../common/services/mode.js'
  import * as client from './client.js'
  import * as stub from './stub.js'

  /** Needs a real service: <one sentence>. Proposed owner: <plants-backend | a new API | INS>. */
  export const NEEDS_A_REAL_SERVICE = '…'

  const transporters = () => (isStubDataMode() ? stub : client)
  export const listTransporters = (orgId, search) => transporters().listTransporters(orgId, search)
  export const getTransporter = (orgId, id) => transporters().getTransporter(orgId, id)
  export const createTransporter = (orgId, body) => transporters().createTransporter(orgId, body)
  export const deleteTransporter = (orgId, id) => transporters().deleteTransporter(orgId, id)
  export { isValidationFailure, mapApiErrorsToFormErrors } from './errors.js' // or inline, as INS does
  ```

  Page-shaping (5 to a page, the picker's `{results,total,page,totalPages,pageSize}`)
  stays in the barrel, as `address-book/index.js` does with `PAGE_SIZE` and
  `sliceAt`. That way the picker contract matches the real address book.

- **`client.js`** is the proposed contract, written as real code:
  `const transportersUrl = process.env.TRADE_IMPORTS_TRANSPORTERS_URL ?? 'http://localhost:8092'`.
  Use a new variable when no backend owns it yet. When the plants backend
  would own it (templates), use the existing base URL `TRADE_IMPORTS_PLANTS_BACKEND_URL`
  with a new path. It also has the organisation and tracing headers, a
  `toRecord` wire-to-display mapping, and `BackendRequestError` on failure. It
  never runs in the prototype, because `isStubDataMode()` is true locally and
  in production (`common/services/mode.js:19-20`). Its job is to be the API
  proposal the real team reviews and lifts. Its test runs it against a stubbed
  `fetch`, so it cannot rot.

- **`stub.js`** mirrors INS `stub.js`: starter rows as a JS array in the file
  (like `STUB_BOOK`, not `data.json`), and the same function signatures as the
  client. Validation fails the way the API would: it throws
  `{ status: 400, body: { errors: { field: ['…'] } } }`, so pages use
  `isValidationFailure`/`mapApiErrorsToFormErrors` exactly as INS pages do. Its
  store is `createFakeStore` from `../../../prototype-services/lib/fake-store.js`.
  That is the **one** prototype-only import, and it gives:
  - one store for each release (`activeSetId()` through `shared/set-context.js`,
    which L2 may import), so one release never sees another's rows
  - one store for each organisation, as the real API scopes by
    `Trade-Imports-Organisation-Id`
  - saving to `.cache/designer/data/<release>.<name>.json` across restarts
  - Reset, through `registerFake` → `clearFakesFor`

  A starter row with `setId` shows only in that release, as today. When the
  real team lifts it, they swap `createFakeStore` for a `new Map()`, which is
  one line, and the hand-off brief says so.

- **`transporters.test.js`** is written like `address-book/address-book.test.js`:
  stub mode through `withSetContext`, real mode with `vi.stubGlobal('fetch', …)`
  proving the URL, headers and mapping. It also checks that Reset clears it
  (`clearFakesFor`).

Pages import `'../../../../../../services/transporters/index.js'`: the same
depth and form as every real page, so the patch the hand-off lifts needs no
import rewrite.

### Staying safe through the weekly update

1. **One `ours` entry for each service**, added by a tool and never by hand:
   `src/server/app/services/<name>/**`. `scripts/new-set/update-overrides.js`
   `addOwnedPaths` already does this for sets, so reuse it. CLAUDE.md warns
   "never add a file to `ours` just to make it editable". That warning is still
   right for upstream files. A brand-new folder upstream does not have is
   exactly what `ours` is for, and the scaffold should say so in the entry's
   commit message.
2. **Refuse a name upstream already uses.** When the service is created, run
   `git ls-tree upstream/main src/server/app/services/<name>` (and check the
   removed-history names such as `commercial-transporters`). If the folder
   exists upstream, stop and tell the designer the real service has one and
   they should use or extend it.
3. **Upstream later adds the same name.** This is the case Sam asked about.
   Today `scripts/sync-upstream/sync.js:57-68` sends every touched `ours` path
   to `restoreOurs` (`git.js:101-104`):
   - A file both sides added (`AA`) keeps ours without a word. The prototype
     would hide the real service.
   - A file only upstream added under an `ours` glob (status `A`) runs
     `git checkout HEAD -- <path>`. That path is not in HEAD, so `execFileSync`
     throws and the sync stops. This is **latent today** for every `ours` glob.
     It is plausible from reading the code and has not been reproduced.

   Change needed: in `applyOverrideRules`, when an `ours` path is new from
   upstream or both sides added it, and it falls under
   `src/server/app/services/<name>/`, do not restore it. Record a
   `service-arrived` item, add the `needs-person` label, and write a summary
   line: "plants-frontend now has `services/<name>`. The prototype's fake of
   the same name is still in `ours`: retire it (drop the `ours` entry, keep
   upstream's, move the stub rows into `prototype-data` if designers still
   need them)." A general fix is also needed for a new-from-upstream path
   under any other `ours` glob: remove it instead of checking it out from
   HEAD. Add unit tests beside `rules.js`/`git.js`.
4. **Retiring a fake** uses `removeOwnedPaths` (already in
   `update-overrides.js`), called from a new `designer:service -- retire <name>`.

### Tooling: the steps that always run the same, in a script

Add `npm run designer:service -- new <name> --owner <plants-backend|new-api|ins> --describe "<needs a real service sentence>"`
(`scripts/designer/service/`). It:

- refuses when upstream already has the name (point 2), or the name is not
  lower-case with hyphens
- writes `index.js`, `client.js`, `stub.js` and `<name>.test.js` from a
  template, with the env var, headers and error mapping already in place
- adds the `ours` glob (`addOwnedPaths`)
- prints the import line a page uses

It also has `retire <name>` and `list`, which prints each prototype-owned
service with its "needs a real service" sentence, read from `overrides.json`
`ours` globs matching `src/server/app/services/*/**`. The skill then only
fills in the fields and rows. That follows the workspace rule "deterministic
steps in a tool, agent runs it".

### The hand-off, and the prototype-to-ticket link (comment 4)

- `impact.js` `PROTOTYPE_IMPORT` must recognise
  `services/<name>/index.js` imports whose folder is a prototype-owned `ours`
  glob, as kind `prototype-service`. Keep `prototype-services/` and
  `prototype-data/` too.
- The brief should **include** `index.js` and `client.js` in the patch, marked
  "proposed". It should list `stub.js` with its one prototype-only import named,
  and quote `NEEDS_A_REAL_SERVICE` and the proposed endpoint table (method, path,
  body) from `client.js`. That turns "needs a real service" into a ticket the
  real team can size.
- `prepare-handoff.js:294` (`needs-real-service: depends on prototype-services
  or prototype-data`) must also match the new location.

### Address book: a special case

The real plants address book is **read-only by decision**. INS is the only
writer (`address-book/index.js:19-21`). So:

- Pages that **read** (pickers, check answers) keep importing the real
  `services/address-book/index.js`, unchanged, in a release too. Rows a
  designer adds reach them through the seam that is already patched: extend
  `prototype-data`'s `withExtraParties` overlay to include the rows the write
  fake added and leave out the ones it hid, for the active set. The
  `address-book` seam stays one line, which is the rule in
  `.claude/rules/prototype-seed.md` point 6. This removes the "swap the import
  in three files" step completely.
- Pages that **write** (add, delete, categories) are mock INS pages. Their
  service is `src/server/app/services/ins-address-book/{index,client,stub}.js`,
  a copy of the INS frontend's `services/address-book` API (`listAddresses`,
  `createAddress`, `getAddress`, `updateAddress`, `deleteAddress`, with its
  wire shape: `postcode`, `countryCode`, `phone`, `email`). Its client points
  at `TRADE_IMPORTS_ADDRESS_BOOK_URL`, the real address-book API. It is not
  called `address-book`, because that folder is upstream's. The hand-off
  names the INS frontend as the owner, not plants-frontend.

### Migration of what exists

| Now | Becomes |
|---|---|
| `prototype-services/transporters/{index.js,data.json,index.test.js}` | `app/services/transporters/{index,client,stub}.js` + `transporters.test.js`. Rows go from `data.json` into `stub.js`. Rename to `listTransporters`/`getTransporter`/`createTransporter`/`deleteTransporter`. Validation becomes a 400 problem body. |
| `prototype-services/templates/{index.js,data.json,index.test.js}` | `app/services/templates/{index,client,stub}.js` + `templates.test.js`. The client points at `TRADE_IMPORTS_PLANTS_BACKEND_URL` + `/templates` (templates would live beside notifications in the plants backend). |
| `prototype-services/templates/journey.js` (imports the engine) | Out of the services layer. The reference tells the agent to write `saveJourneyAsTemplate`/`startFromTemplate` in the release's own feature (`sets/<release>/journeys/linear/features/templates/from-template.js`), the way real features call the engine and a service. It is about 30 lines, so it can be copied into each release. |
| `prototype-services/address-book/index.js` | Split. The write side becomes `app/services/ins-address-book/`. The read side joins the `withExtraParties` overlay in `prototype-data`. |
| `prototype-services/lib/{fake-store,persist,active-set,registry,search-page}.js` | Stay. This is prototype infrastructure, not a stand-in, and `stub.js` imports `fake-store` from here. `search-page.js`'s paging moves into each barrel, to match `address-book/index.js`. |
| `prototype-services/records/**` | Stays. It decorates the records port (filters, counts, saving, Reset) and does not stand in for a service. |
| `overrides.json` `ours` | Add `src/server/app/services/transporters/**`, `src/server/app/services/templates/**`, `src/server/app/services/ins-address-book/**`. Keep `src/server/prototype-services/**`. |

Docs and rules to update in the same change:

- `CLAUDE.md` rule 10 and `fake-a-service/SKILL.md` "Never edit shared code":
  add the exception "except a prototype-owned service folder that
  `designer:where` calls yours".
- `.claude/rules/ownership.md`: soften the heading. The rule already says to
  follow `designer:where`, so a prototype-owned service passes.
- `.claude/rules/designer-sets.md:19`: add that a new service goes in
  `services/<name>/` through `designer:service`.
- `fake-a-service/references/fake-a-service.md`: the "What is there already"
  table, the imports table (six `../` to `services/`, not seven to
  `prototype-services`), worked examples 1 and 2, and "Making a new fake".
  Rewrite the last one as "run `designer:service -- new`, then fill in stub
  rows, client endpoints and the test".
- `address-book-pages.md`: drop the swap-three-imports step.
- `docs/designers/services-and-dashboards.md` "For whoever maintains the
  prototype".
- `port-a-kit-page/SKILL.md:51`.
- `design-session.js:132` allowed paths.
- `prepare-handoff.js:294`.
- `impact.js` and its tests.
- `suite.test.js:40`.

Verification: `npm test` (the service tests in both modes, overrides tests,
sync rules tests), `npm run lint` (depcruise must stay clean, since `services/`
must not import sets), and one `design-session` trial on a scratch release
using the transporter picker. That trial proves the page imports
`services/transporters/index.js`, Reset clears it, and the hand-off patch
carries `index.js`/`client.js` as "proposed".

## Size and risk

- This is a medium change, all prototype-owned apart from the three `ours`
  lines. No design release exists yet, so no designer work has to be
  migrated.
- The main risk is the sync: point 3 is needed before the first service lands
  in `services/`. Without it, a later upstream transporter service is either
  hidden or crashes the weekly sync.
- The rule wording has to change in four places (CLAUDE.md, the skill,
  ownership.md, designer-sets.md). If one is missed, an agent will refuse to
  create the service where Sam wants it.
