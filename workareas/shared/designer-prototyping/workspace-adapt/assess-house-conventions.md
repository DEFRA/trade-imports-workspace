# Assessment: house conventions in what the designer suite produces

Lens: **house-conventions**. The question is whether the code a designer's request produces follows the workspace's house conventions without the designer asking. That code is stub services, clients, controllers, templates, `copy.en.js`/`copy.cy.js`, validation and tests. The follow-up question is how to make that automatic now that designers work from the workspace root.

Branch: `feat/NO_JIRA-designer-prototyping` in both the workspace and `repos/trade-imports-plants-prototype`. Every file was read at HEAD on 2026-09-28. Nothing was edited except this note.

## 1. What was compared

The prototype's output:

- `src/server/app/services/{transporters,templates,notification-search,ins-address-book}/`
- the scaffold templates `scripts/designer/service/templates/{index,client,stub,service.test}.js.tmpl` and `scripts/designer/service/templates.js`
- the worked-example feature the skills tell agents to copy: `src/server/app/sets/sample-journey/journeys/linear/features/saved-transporters/`
- the rules and skills that tell agents what to write: `.claude/rules/{copy,templates,designer-sets,ownership}.md`, `.claude/skills/fake-a-service/**`, `AGENTS.md`
- the checks: `scripts/designer/check/steps.js`, `src/server/prototype-checks/copy-shape.js`

The house conventions it was held against:

- `docs/best-practices/node/{code-style,hapi,nunjucks,govuk-frontend,pino-logging}.md` and `docs/best-practices/node/testing/frontend.md`
- `docs/best-practices/doc-comments/{BEST_PRACTICES,jsdoc}.md` and `docs/best-practices/gds/*`
- the workspace rules `.claude/rules/{node,gds,copy}.md`
- the plants-frontend platform and set docs: `repos/trade-imports-plants-frontend/src/server/app/docs/{services,validation,architecture}.md` and `.../sets/high-risk-plants/docs/{add-a-page,add-a-field,services,features}.md`
- the real exemplars, compared side by side:
  - plants-frontend: `services/{countries,ports,address-book}/`, `features/{consignor-select,origin,commodities}/`, `copy-parity.test.js`, `copy-convention.test.js`
  - INS frontend: `repos/trade-imports-ins-frontend/src/server/app/services/address-book/{index,client,stub}.js` and `features/address-book/{add,list,delete,…}/`, `address-id-params.js`

## 2. What already holds

Credit where it is due, so the design below builds on it rather than replacing it:

- **Service shape.** An `index.js` barrel picks `stub.js` or `client.js`, and `client.js` follows the real client idiom closely:
  - organisation id in the path and the `Trade-Imports-Organisation-Id` header
  - `encodeURIComponent` on every path segment (hapi.md §8)
  - refuses to call with no organisation (the same guard as plants `address-book/client.js`)
  - the `x-cdp-request-id` trace header from `getTraceId()`
  - `BackendRequestError` for non-OK responses, 404 mapped to `undefined`
- **Tests mirror plants-frontend's own style.** `it(...)` with "Should …" names, and `vi.stubGlobal('fetch')` at the network boundary. This is the same as `services/address-book/address-book.test.js`, which uses `test(` but the repo mixes both freely. `process.env` changes are restored in `afterEach`.
- **Templates follow the real plumbing.** They extend `shared/layout.njk`, include `shared/error-summary.njk` first, carry the crumb and `novalidate`, use GOV.UK macros only, and take every word from `copy`. `saved-transporters/add.njk` sits comfortably beside `origin/template.njk`.
- **i18n shape is enforced for design releases.** `prototype-checks/copy-shape.js` runs in `designer:check` and checks:
  - key parity
  - leaf kind and function arity
  - no empty leaves
  - Welsh identical to English (with a link-address exemption)
  - `[Welsh needed]` markers counted and never allowed in English

  That is stricter than upstream on the marker and equivalent on shape.
- **Mechanical rails run.** `designer:check` runs:
  - Prettier on changed files
  - ESLint on changed files
  - template compile
  - prototype checks
  - with `--full`: `npm run lint`, which includes `lint:arch` (dependency-cruiser `set-isolation`, `no-l2-to-sets`)
- **Copy errors are mapped to page copy.** `saved-transporters/view-model.js` `formErrorsFor` prefers the page's own `copy.errors[field]` over the service's English message.

## 3. Deviations (concrete, with paths)

Severity:

- **H**: the code would not be accepted as-is by the real team, or a claim in the code is false.
- **M**: a convention that review would flag.
- **L**: style nits.

### H1. "Copy `index.js` and `client.js` into plants-frontend unchanged" is false

This claim is in every service's module doc, in the scaffold and in the `fake-a-service` skill. It is false in four ways:

- `index.js` imports `isStubDataMode` (`src/server/common/services/mode.js`, a prototype-only `patched` function). Plants-frontend has only `isStubMode` (`repos/trade-imports-plants-frontend/src/server/common/services/mode.js`, and `app/docs/services.md` "Run mode": "`isStubMode()` … Service barrels ask it directly").
- `index.js` exports `NEEDS_A_REAL_SERVICE` and a large `CONTRACT` object, for example `services/transporters/index.js:17-123` and `services/notification-search/index.js:18-116`. No real service carries prose or an API contract in its barrel. The hand-off also parses `CONTRACT` statically as source ("write plain values only: never a name imported from another file", `scripts/designer/service/templates/index.js.tmpl:14-18`). That is a fragile, data-in-code convention of its own.
- `ins-address-book/{index,client}.js` claim to be "a copy of trade-imports-ins-frontend's …" (`client.js:5-12`, `index.js:8-11`). They are not:
  - the real client reads `config.get('tradeImportsAddressBookApi.baseUrl')` and `config.get('tracing.header')`, and imports `parseProblemBody`/`throwOnError` from `lib/http-client.js` (`repos/trade-imports-ins-frontend/src/server/app/services/address-book/client.js:3-10`)
  - the prototype copy re-inlines both helpers and reads `process.env`
  - it adds a `toRecord` that the INS client does not have
  - the barrel's selector is renamed `impl` (INS: `addressBook`)
- This breaks doc-comment accuracy under "Description mismatch" in `docs/best-practices/doc-comments/BEST_PRACTICES.md`.

*Fix:*

- Move `CONTRACT` and `NEEDS_A_REAL_SERVICE` out of `index.js` into a sibling data file, `services/<name>/contract.json`, read by the hand-off as JSON.
- Make `index.js` choose on `isStubMode()` exactly as the real barrels do. The prototype's production-with-stub-data need can live in the one `patched` file (`mode.js`), not in every barrel.
- Regenerate `ins-address-book/` by literal copy from the workspace checkout of `repos/trade-imports-ins-frontend`, with a drift test that diffs it against that file. Or delete the doc claim.

### H2. Controllers do no validation of their own

`sets/sample-journey/journeys/linear/features/saved-transporters/controller.js:74-91` posts the raw form to the stub and treats the stub's 400 as the validation. Two exemplars disagree with this:

- plants `app/docs/validation.md` ("Controllers own field validation … `validate(schema, payload)` … render raw values with status 400 on error … commit the cleaned values")
- the INS exemplar the page copies (`features/address-book/add/add.controller.js:10,19,98`: `validate(addressRules…)` from `lib/validate`, then the API 400 as a backstop)

Nothing in `.claude/skills/fake-a-service/references/**` mentions `lib/validate` (grep for `validate`/`Joi` finds only `novalidate`). So every designer feature built this way ships:

- no local rules
- English error text from the stub (`services/transporters/stub.js:105-111`, `ins-address-book/stub.js:45-53`) whenever the page copy lacks a key

### H3. Path parameters are not validated

`saved-transporters/controller.js:128-129` routes `{transporterId}` with only `kit.routeOptions`. hapi.md §3 says "Every path parameter needs a format constraint". INS does exactly this for the same page (`features/address-book/address-id-params.js`: `Joi` params plus `failAction` → `Boom.notFound()`). The worked example the skills tell agents to copy omits it, so every copied page will too.

### H4. Feature layout does not match the real multi-page feature shape

`saved-transporters/` is:

- one `controller.js` with 5 routes built by a local `route()` helper
- flat `list.njk`/`add.njk`/`delete.njk`
- a flat `view-model.js`

The real multi-page shape is:

- plants `features/commodities/{list/list.controller.js,list/list.njk,details/details.controller.js,details/details.njk,page.js,fields.js,copy/}`
- INS `features/address-book/{add,edit,list,view,delete}/<page>.controller.js`
- single-page features: `page.js`, `fields.js`, `view-model/index.js` and `kit.pageRoutes(page, {get, post})` (`consignor-select/controller.js:128`)

A hand-off of this feature is therefore a restructure, not a lift.

### H5. Design releases carry no tests, and the upstream convention tests do not look at them

`.claude/rules/designer-sets.md` rule 7 and `fake-a-service/SKILL.md` "No test files in a release" forbid `*.test.js` and `*.fit.spec.js` in a release. Meanwhile:

- the upstream `copy-convention.test.js` and `copy-parity.test.js` (present in the prototype too) hard-code `sets/high-risk-plants/journeys/linear/features`
- so nothing checks that a release feature with a template owns `copy/copy.test.js`, or that a controller has any test

Keeping design releases test-free is a defensible speed call for designers, and the copy-shape check covers parity. The gap is the hand-off:

- it produces a patch without the tests the real recipes demand (`add-a-page.md` and `add-a-field.md` each carry controller, copy and fit/axe sections)
- the brief tells a developer to "write the tests the brief lists" (`hand-off/SKILL.md:293-296`)

### M1. Config: services bypass the documented convict seam

Clients read `process.env.TRADE_IMPORTS_PLANTS_BACKEND_URL` directly: `templates/client.js:16-17`, `notification-search/client.js:17-18`, and `client.js.tmpl:16`. Plants `app/docs/services.md` "Configuration" lists `tradeImportsPlantsBackendApi.baseUrl` as the convict key, and says only the address book is the `process.env` exception. hapi.md §14 says every URL key uses convict `format: 'url'`.

The real plants code itself reads `process.env` in `services/persistence/records/real/config.js:1-3`, so the real repo's docs and code disagree (see §4). The prototype followed the code, which is the right tie-break. What is missing is the decision being recorded and flagged.

### M2. Duplicated service plumbing

The same pieces are re-declared in 4 clients plus the scaffold:

- `ORGANISATION_ID_HEADER`, `tracingHeader`, `headers()`
- `problemOf`/`parseProblemBody`
- `validationError`

`mapApiErrorsToFormErrors` and `isValidationFailure` are copied into 3 barrels plus the scaffold. INS factors the HTTP half into `lib/http-client.js`. This is not wrong by the "feature folders are independent" rule. But services are L2, and the real INS exemplar shares. Pick one and write it down.

### M3. Wrong layer for set-specific vocabulary

`transporters` is placed as a platform (L2) service in `src/server/app/services/`. Plants `app/docs/services.md` "Set-owned services" and `sets/high-risk-plants/docs/services.md` say vocabulary that belongs to one journey lives in `sets/<set>/services/`. Plants removed the transporter service on purpose, citing behaviour `customs-no-sps-hold-or-matching`.

Org-scoped registers (templates, an address book) are fine at L2. But `TRANSPORTER_TYPES` and any journey-only list belongs in the release. `fake-a-service.md` "Journey words a release owns" gestures at this. The scaffold never asks the question.

### M4. Address fields break the house address pattern

The transporter add form (`saved-transporters/add.njk:57-75`, `services/transporters/stub.js`) takes `country` as free text and has no `addressLine2` or `county`. That departs from both:

- the house address pattern in INS `features/address-book/fields.js` and `address-countries.js` (country select, ISO code)
- plants `services/countries/index.js` `countryCodeOf`/`addressCountries` ("writes stay ISO 3166-1 alpha-2 (D1)")

`docs/best-practices/gds/patterns.md` (addresses) applies as well.

### M5. Owner vocabulary is hard-coded

`scripts/designer/service/templates.js:11-15` lists `OWNERS = ['plants-backend','new-api','ins']`, with ports 8091 and 8099. With the workspace present, the owner should come from the repo map in the workspace `CLAUDE.md` (address book, reference data, ins-backend, dynamics-gateway…), and the contract should be checked against that backend's controllers under `repos/`. The `contract` lens owns the checking, but the scaffold should stop inventing an owner list.

### M6. Doc comments that are not doc comments

Every service `index.js`/`client.js`/`stub.js` opens with a floating `/** … */` block attached to no symbol. Examples: `transporters/index.js:6-13`, `templates/index.js:6-17` (which points at a `.claude/skills/...` path from production code), `ins-address-book/stub.js:14-24`. jsdoc.md says "Default to no comment", and the doc-comment accuracy rules apply. A module-level header is not a house idiom (the plants services have none). The rationale belongs in the service's `contract.json` or in `docs/`, per the memory rule "Remove explanatory comments aggressively".

### L1. `code-style.md` rule nits in generated code

- `problem.detail || 'Validation failed'` breaks rule 12 (`??`). Seen in `transporters/client.js:58`, `templates/client.js:51`, `ins-address-book/client.js:55`, `client.js.tmpl:50`. INS does the same, so this is inherited.
- Mutating `errors[field] = …` in a `for` loop breaks rule 4: `transporters/stub.js:130-146`, `ins-address-book/stub.js:67-80`, `notification-search/query.js:56-66` (`readDate` mutates its `errors` argument).
- A `for…of` with `searchParams.append` in `notification-search/client.js:54-69` breaks rule 4 (acceptable at a `URL` API boundary).
- Rule 15 (comment explains what, not why): `transporters/client.js:40-41`.

### L2. The style guide miscounts its own rules

`docs/best-practices/node/code-style.md` has **16** numbered rules. The workspace `CLAUDE.md` skill table ("17-rule guide") and `.claude/skills/code-style/references/STYLE_FILE_REVIEWER.md:14,54` ("17-rule style guide") say 17. Fix the count or add the missing rule before any automated pass cites rule numbers to designers.

### L3. The prototype's rule files break `tim backlog standards`

`tim backlog standards --files trade-imports-plants-prototype:<any path>` currently **fails**:

> `repos/trade-imports-plants-prototype/.claude/rules/copy.md` points to `repos/trade-imports-plants-prototype/design-gaps.md`, which does not exist.

The same happens for `templates.md`. The tim pointer grammar (`tim/src/backlog/standards/rules.js:8-24`) reads any backticked `*.md` in a list item as a pointer. So the workspace's deterministic "which standards apply to this file" resolver refuses every prototype file. The fix is one line each: move `design-gaps.md` out of the list item or name it without backticks.

## 4. Where the house conventions disagree with each other

An agent needs a tie-break it can apply without asking. The sources conflict today:

| Topic | Best-practices doc | Real code / repo doc | Proposed ruling |
|---|---|---|---|
| Service URL config | hapi.md §14: convict, `format: 'url'` | plants `docs/services.md` says convict for the backend; plants code reads `process.env` | Follow the **nearest real exemplar's code**; log the conflict in the release's `design-gaps.md` / hand-off brief |
| `it` vs `test` | testing/frontend.md shows `test` | plants uses both | Match the sibling file |
| Validation | hapi.md §3 (Joi schema per feature) | plants `lib/validate` + `docs/validation.md` | `lib/validate` (repo doc beats generic doc) |
| Route params | hapi.md §3 (validate params) | INS `address-id-params.js` does; plants has few param routes | Validate, INS shape |

Proposed ladder, written once and cited everywhere:

1. the target repo's own docs and recipes, when they agree with its code
2. the nearest real exemplar's code (plants-frontend, else INS frontend)
3. `docs/best-practices/**`
4. flag every skip of a higher rung in one line.

The testing/frontend.md and hapi.md docs are written from `trade-imports-animals-frontend`. They say so ("Used in `trade-imports-animals-frontend`"), which is why rung 3 sits below the plants repo.

## 5. Design: making conformance automatic

Principles:

- Sam's "the designer never has to ask"
- "Deterministic steps go in tim, run by a cheap agent"
- the load-bearing skill routing index
- never duplicate a workspace skill.

### 5.1 Let the workspace rails reach prototype files (mostly free)

From the workspace root, the workspace `.claude/rules/node.md` (`**/*.js`), `gds.md` (`**/*.njk`) and `copy.md` (`**/copy.{en,cy}.js`) already match `repos/trade-imports-plants-prototype/**`. Their pointers name `docs/best-practices/**`, so an agent editing a prototype file from the workspace gets the house docs loaded natively. Keep it that way:

- **Do not restate best-practice content** in the prototype's own rules. Point at the workspace rules instead. The prototype rules keep only what is prototype-specific: ownership, releases, `[Welsh needed]`, the GOV.UK-toolbox limits of this build.
- **Fix L3** so `tim backlog standards` resolves prototype files, then use it as the one deterministic "what applies to this file" answer: `tim backlog standards --files trade-imports-plants-prototype:<path> --json`.
- **Extend the code-style routing** (`.claude/skills/code-style/assets/routing.json`) so the resolver and the code-style skill pick up the docs that matter for designer output. Today `copy.cy.js` resolves to only the `node` topic, and `controller.js` never reaches hapi.md. Add:
  - `*copy.en.js`, `*copy.cy.js` → a new `copy` topic: `gds/language.md`, `gds/accessibility.md`, `gds/components.md`
  - `*controller.js`, `*routes*.js` → a `hapi` topic: `node/hapi.md`, plus the target repo's `docs/validation.md`
  - `*.test.js` → a `testing` topic: `node/testing/frontend.md`
  - `*.njk` → add `node/nunjucks.md`, `node/govuk-frontend.md` beside the gds files

  tim's `code-style-routing.js` validates the schema, so these are data edits with a test.
- **Check the nested rule and skill loading with a canary.** Do not assume that nested `.claude/rules/` and `.claude/skills/` inside `repos/trade-imports-plants-prototype/` load when the session root is the workspace. The skill listing in a workspace-root session shows **no** prototype skills, and `repos/` is gitignored. (Placement is the placement lens's call; see `assess-placement-and-routing.md`.)

### 5.2 Generate code from real exemplars, not from hand-kept templates

- **`designer:service` becomes an exemplar copier.** Replace the hand-kept `*.tmpl` bodies with a generator that reads a named real exemplar at run time and renames symbols:
  - `repos/trade-imports-ins-frontend/src/server/app/services/address-book/{index,client,stub}.js` for an org-scoped CRUD register
  - `repos/trade-imports-plants-frontend/src/server/app/services/ports/` for a read-only reference list
  - `…/address-book/` for an org-scoped read-only search

  Then the scaffold follows the house shape by construction and follows it again after every upstream change. The deterministic part (read exemplar, rename, write, add the `ours` line) belongs in tim if it is to serve other frontends: `tim scaffold service --from ins-address-book --name <n> --into <repo> --json`, library-first, behaviourally tested. It can stay in `scripts/designer/service/` if it is prototype-only. Either way, `contract.json` (H1) is the one extra file.
- **Add a page and feature scaffold.** Today the agent hand-writes controllers by copying `saved-transporters`, which carries H2 to H4. Instead, generate from the real recipe exemplars:
  - single page: `consignor-select`/`origin` (`page.js`, `fields.js`, `controller.js` with `kit.pageRoutes`, `template.njk`, `copy/`, `view-model/index.js`)
  - multi-page: `commodities/{list,details}` or INS `address-book/{add,list,delete}`

  The recipes already name their exemplars ("the exemplars are the idiom — match them, don't invent", `frontend-change/SKILL.md` step 1.3), so the scaffold's source list is the recipe's list. Rebuild `saved-transporters` in that shape so the worked example stops teaching the deviations. Or retire it in favour of the INS feature as the example.
- **Put the validation idiom in the scaffold.** Every scaffolded collecting controller calls `validate(rules, payload)` from `lib/validate` with messages from `copy.errors`, and every `{id}` route gets an `…IdParams` Joi object with `failAction → Boom.notFound()`. The stub's 400 stays as the API backstop, as INS does. Add a paragraph to `fake-a-service/references/fake-a-service.md` citing plants `docs/validation.md` and INS `add.controller.js`.

### 5.3 A conventions pass on every designer change, before save

Designers never ask for it. `designer:save`, and the `design-session` workflow's per-part check, run it after the mechanical checks. It has two layers.

**Layer 1: deterministic (tim or `designer:check`, a cheap runner).** Cheap and binary:

- **Service conformance check.** For each `ours` service folder, the check requires:
  - `index.js` imports only `mode.js#isStubMode`, `./client.js`, `./stub.js` and `lib/*`
  - `index.js` and `client.js` never import `prototype-support/**` (today prose only, `fake-a-service/SKILL.md:66-69`)
  - `contract.json` exists and validates against a zod schema
  - no module-level floating doc block
- **Controller conformance check.** Every route with a `{param}` has `options.validate.params`. Every POST handler in a release feature calls `validate(`. Every multi-route feature follows the per-page folder shape. Implement it as an AST walk (acorn is already in `node_modules` via ESLint), or as custom ESLint rules in the prototype's `patched` `eslint.config.js`. ESLint is better, because `code-rules` in `designer:check` already runs it on changed files and the messages can be plain English.
- **Copy conventions for every set, not just high-risk-plants** (see 5.4).
- **Doc-comment accuracy** (params match, no phantom `@returns`). A rule-by-rule JSDoc lint via `eslint-plugin-jsdoc` in the same config.

**Layer 2: judgement (agents).** Invoke the existing personas; do not write new ones:

- `code-style`'s `references/STYLE_FILE_REVIEWER.md` per changed `.js`/`.njk` file, with the bundle from `tim backlog standards`. In fix mode, `references/STYLE_IMPLEMENTOR.md`.
- `review`'s `references/FILE_REVIEWER.md` for correctness, security and tests on service and controller files.

Both skills are ticket-keyed today (`start-style.sh EUDPA-XXXXX`, `workareas/code-style-reviews/EUDPA-XXX/`). Add a **branch-keyed local mode**, as the build loop's `local` lifecycle does for no-Jira snagging. The key is `<repo>:<branch>` and the state lives under `workareas/code-style-reviews/local/<repo>/<branch>/`. `design-session` and `designer:save` then call "style review this branch" with no ticket. That is one change in the workspace skill, reused by the designer suite, the build loop and any NO_JIRA branch.

Findings a designer never sees:

- The agent applies FIX items silently, re-checks, and reports only "tidied to house style (N changes)".
- It surfaces only items that change what the designer sees.
- It parks anything the persona rates NEEDS_WORK as a design-gap line, never as a question.

### 5.4 i18n enforced by a check, not by memory

- **One parity implementation.** The prototype has its own `prototype-checks/copy-shape.js`, while upstream has `copy-parity.test.js` plus `shared/copy-leaves.js`. Both are fine, but they must agree on rules:
  - Upstream's "translate every string leaf unless allowlisted" equals the prototype's "same-as-english" rule.
  - The prototype adds the link-address exemption and the marker.

  Propose upstreaming the link-address exemption to plants-frontend, as a hand-off, so the two stop diverging.
- **Run copy-convention over every set.** Parameterise the set root with the existing `CHECK_SET_ENV` seam (`prototype-checks/sets-on-disk.js`). For a design release, require that a feature with a template owns `copy/copy.en.js` and `copy/copy.cy.js`; keep `copy.test.js` required only on the hand-off branch (5.5). Add the missing check: **every `copy.<key>` a template or controller reads exists in `copy.en.js`**. Walk the `.njk` for `copy.<path>` and the controller for `copy.<path>`, and resolve each against `leaves(en)`. This catches the most common designer-change bug, a renamed key.
- **GDS copy lint.** A small deterministic pass over new or changed English leaves. It checks for:
  - "please"
  - "click"
  - `!`
  - `&` in a sentence
  - Title Case in headings
  - the error message verbs ("Enter …", "Select …")
  - "valid"/"invalid"

  `.claude/rules/copy.md` in the prototype lists these as suggestions. The rule stays: suggest once, never override the designer's words. So this pass writes advisory lines only, never fails.

### 5.5 The hand-off builds it properly with workspace skills

Sam's "here's the prototype, here's the implementation we want, go build it properly" maps onto skills that already exist:

- **`frontend-change`** implements the hand-off in `repos/trade-imports-plants-frontend` as recipe-verbatim increments:
  - add-a-page / add-a-field / add-a-collection
  - verification ladder (units, lint, lint:arch, fit features, fit)
  - openspec sync (`plants/` namespace)

  Its SKILL.md already says the target is an input ("read the target from the caller"). The prototype's `prepare-handoff` workflow should call it rather than generate its own patch-plus-test-list, run on a same-named branch in plants-frontend (workspace branch-parity rule 2). Or, if the hand-off must stay a ticket, the brief names the recipe per part so the implementing agent runs `frontend-change` directly. The tests the prototype refused to write (H5) are written there, by the recipe, and are correct by construction.
- **`ticket-creator`** raises the story. Creating uses `tools/jira/create-ticket.sh` + `attach-file.sh`, with a dry-run. The ticketing lens owns the details.
- **`review`** and **`code-style`** run on the resulting plants-frontend branch as usual.
- **`spec-cover`** / **`spec-catchup`** apply if the hand-off changes plants behaviour. `frontend-change` step 5 already does the sync.
- **`understanding-check`** is optional, for the developer who picks it up.

None of these should be copied into the prototype's `.claude/skills/`. The prototype skills route to them by the workspace trigger phrases in the workspace `CLAUDE.md` routing index.

### 5.6 What not to build

- A second style guide, a second review persona, or a prototype-local copy of `docs/best-practices/**`.
- A prototype-local Jira creator (use `ticket-creator`).
- Test files in design releases (keep rule 7; the hand-off writes them).
- Blocking GDS wording rules (advisory only; the designer's words win).

## 6. Proposed change list

| # | Change | Where | Kind |
|---|---|---|---|
| 1 | Fix L3: un-backtick `design-gaps.md` in list items | prototype `.claude/rules/{copy,templates}.md` | 2-line edit |
| 2 | Extend code-style routing: `copy`, `hapi`, `testing` topics, nunjucks/govuk-frontend on `*.njk` | workspace `.claude/skills/code-style/assets/routing.json` (+ tim routing test) | data + test |
| 3 | Branch-keyed local mode for `code-style` and `review` | workspace skills + `tools/style`, `tools/review` (or tim) | skill change |
| 4 | Fix the 16-vs-17 rule count | `docs/best-practices/node/code-style.md` or `CLAUDE.md` + `STYLE_FILE_REVIEWER.md` | doc |
| 5 | Move `CONTRACT` / `NEEDS_A_REAL_SERVICE` to `contract.json`; barrels on `isStubMode`; drop floating module docs | prototype `services/*`, scaffold, hand-off reader | code |
| 6 | Re-copy `ins-address-book` from `repos/trade-imports-ins-frontend` with a drift test | prototype | code + test |
| 7 | Service scaffold generated from named real exemplars (tim `scaffold service` if cross-repo) | tim or `scripts/designer/service` | code + tests |
| 8 | Page and feature scaffold from recipe exemplars (single page, multi-page per-page folders, `kit.pageRoutes`, `lib/validate`, params Joi) | same | code + tests |
| 9 | Rebuild or retire `saved-transporters` as the worked example | prototype `sets/sample-journey` | code |
| 10 | ESLint custom rules: params validated, POST calls `validate`, no `prototype-support` import from `index.js`/`client.js` | prototype `eslint.config.js` (`patched`) | lint |
| 11 | Copy checks over every set: owned copy folders and copy keys read exist in `copy.en.js` | prototype `prototype-checks/` | check + test |
| 12 | GDS wording advisory pass on changed English leaves | prototype `designer:check` (advisory) | check |
| 13 | Record the convention ladder (§4) once; cite it from `fake-a-service`, `change-the-journey` and `AGENTS.md` | prototype docs | doc |
| 14 | `prepare-handoff` drives `frontend-change` on plants-frontend on a parity-named branch | prototype workflow + hand-off skill | workflow |
| 15 | Upstream the link-address exemption to plants `copy-parity.test.js` | hand-off to plants team | hand-off |
| 16 | Record the plants `docs/services.md` config-vs-code conflict (M1) for the plants team | hand-off note | doc |

Order: 1 and 4 first (trivial, and they unblock the tim resolver). Then 5, 6 and 9, which stop the suite teaching the deviations. Then 10 and 11 (deterministic checks), then 2 and 3 (judgement pass), then 7 and 8 (scaffolds), then 14.
