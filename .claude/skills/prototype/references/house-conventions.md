# House conventions

Every stub service, client, controller, template, copy file, validation
rule and test a designer's request produces must read as though the real
team wrote it. The designer never asks for this — every code-producing
reference (`fake-a-service`, `change-the-journey`, `change-the-words`,
`match-the-design`, `port-a-kit-page`, `example-data`) opens with a "Read
first" block that points here.

## The ladder

For every artefact you are about to write, read in this order and follow
the first rung that actually says something:

1. **The target repo's own docs and recipes**, where they agree with its
   code (`references/change-the-journey/routes.md`, "Where the real-service
   recipes are out of date", lists where the docs have fallen behind — trust
   the code over the recipe when they disagree).
2. **The nearest real exemplar's code**: `trade-imports-plants-frontend`
   first, then `trade-imports-ins-frontend` (the address book, and any
   feature the plants journey does not have an equivalent of).
3. **`~/git/defra/trade-imports-workspace/docs/best-practices/**`.**
4. **Flag every skip of a higher rung** in one line, in the release's
   `design-gaps.md` (`references/match-the-design/design-gaps.md` has the
   row format) or in the hand-off brief when there is no release file yet
   for it to live in.

The workspace's own `~/git/defra/trade-imports-workspace/docs/best-practices/gds/`
is the source of truth for GDS wording and style. The prototype's own
`docs/designers/gov-uk/*` pages (in
`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/`)
keep only prototype-specific pages (what is installed, what a script is not
started for) — where the two differ, the workspace `gds/` wins.

## Reading list, by artefact

Read the rows that apply to what you are about to write. Every path below
is real; if a reference cites a path not listed here, check it exists
before trusting it.

### Services (stub, client, index)

- `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/docs/services.md`
- `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/services.md`
  — read this one in full for the platform-vs-set-owned split and the
  removed-for-want-of-behaviour rule (services the real team took out on
  purpose, such as commercial transporters): never rebuild one of those
  without saying so in the design-gaps row.
- `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/services/address-book/`
  (`index.js`, `client.js`, `stub.js`) — the pattern `ins-address-book`
  copies.
- `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/services/transporters/`
  and
  `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/services/document-uploads/`
  as prior art for a service the plants journey does not have yet — search
  siblings before inventing a shape.
- `~/git/defra/trade-imports-workspace/docs/best-practices/rest-api/rest-api.md`
- The owning backend's controller or OpenAPI file (for `ins-address-book`:
  `~/git/defra/trade-imports-workspace/repos/trade-imports-address-book/docs/openapi/api-contract.locked.yaml`).
- `~/git/defra/trade-imports-workspace/openspec/specs/plants/` and
  `~/git/defra/trade-imports-workspace/openspec/specs/ins/` — the Behaviour
  Spec for what the real journeys already promise.

### Controllers

- `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/docs/validation.md`
- `~/git/defra/trade-imports-workspace/docs/best-practices/node/hapi.md` §3
- `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features/address-book/add/add.controller.js`
  and
  `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features/address-book/address-id-params.js`
  — the `{id}` route's Joi params object and `failAction`.
- The plants recipes:
  `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-page.md`
  and
  `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-field.md`,
  with their exemplars:
  `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/consignor-select/`,
  `.../features/origin/`,
  `.../features/commodities/list/` and `.../features/commodities/details/`.

### Templates

- `~/git/defra/trade-imports-workspace/docs/best-practices/node/nunjucks.md`
- `~/git/defra/trade-imports-workspace/docs/best-practices/node/govuk-frontend.md`
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/*` (language,
  writing, components, patterns, styles, accessibility, service-design)

### Copy

- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/language.md`
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/writing.md`
- `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/copy-parity.test.js`
  — proves English and Welsh keep the same keys; the same shape a design
  release's copy files must keep, even though a release carries no test of
  its own.

### Tests

- `~/git/defra/trade-imports-workspace/docs/best-practices/node/testing/frontend.md`

### Doc comments

- `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/BEST_PRACTICES.md`
  (read first)
- `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/jsdoc.md`

### Logging

- `~/git/defra/trade-imports-workspace/docs/best-practices/node/pino-logging.md`
  — a prototype-owned service's `client.js` proposes the real logging shape
  even though the stub itself rarely logs.

### Backend (owner repo)

For a hand-off or story whose service needs a backend the real team builds
or extends (`contract.json`'s `owner`: `plants-backend`, `ins`, `new-api`).
The prototype builds none of this; the story's Tech Notes cite it so the
developer or build loop does.

- `~/git/defra/trade-imports-workspace/docs/best-practices/java/modern-java.md`
  and `.../java/spring-boot.md` — records, and the null guards every record
  constructor carries.
- `~/git/defra/trade-imports-workspace/docs/best-practices/java/spring-data-mongodb.md`
  when it stores anything.
- `~/git/defra/trade-imports-workspace/docs/best-practices/java/testing/` —
  integration tests run under `mvn verify` (Failsafe); `mvn test` skips them.
- `~/git/defra/trade-imports-workspace/docs/best-practices/rest-api/rest-api.md`
  — noun endpoints, never an action path.
- `~/git/defra/trade-imports-workspace/docs/best-practices/java/openapi-springdoc.md`
  for the contract.
- The exemplar:
  `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-backend/src/main/java/uk/gov/defra/trade/imports/plants/notification/`
  (controller, service, repository, records and their tests). For an INS
  owner, `trade-imports-address-book`'s own controller and
  `docs/openapi/api-contract.locked.yaml`.

### Platform config

- A new backend, or a new backend URL a frontend client reads, needs an
  entry in cdp-app-config for each environment. No agent writes to
  cdp-app-config or any CDP platform repo: draft the entry locally (in the
  hand-off folder or the story's Tech Notes) for the product owner to
  commit. `~/git/defra/trade-imports-workspace/workareas/shared/designer-prototyping/workspace-adapt/cdp-app-config-draft.md`
  is the worked example.

`designer:handoff` writes a "Backend house conventions" and a "Platform"
line into the story's Tech Notes whenever a service names an owner backend,
and names the branch for every repo the story reaches. Never edit those
lines into `brief.md` by hand: a re-run overwrites them.

## Kept deliberately (recorded decisions)

These look like deviations from house style. They are not: each was decided
against the ladder, and the reason travels with the hand-off rather than
being "fixed" on sight.

- **`isStubDataMode()` stays in prototype-owned barrels.** On CDP dev a
  prototype-owned service has no backend and must serve stub data. The
  hand-off's rewrite (route C1) changes the shape to `isStubMode()` — the
  real service's own name — when it lands in `trade-imports-plants-frontend`.
  Say "copy unchanged" is wrong for this file; say instead that the
  hand-off corrects the shape.
- **Clients read `process.env` for the backend URL directly**, rather than
  through a config module, because the real plants persistence client does
  (`services/persistence/records/real/config.js` reads
  `TRADE_IMPORTS_PLANTS_BACKEND_URL`). The real docs say otherwise:
  plants-frontend's `src/server/app/docs/services.md` lists the convict key
  `tradeImportsPlantsBackendApi.baseUrl` and names only the address book as
  the `process.env` exception. So code and docs disagree, and neither is
  "the house shape" yet. A prototype-owned client follows the code; every
  hand-off names both (the convict key exists, the persistence client reads
  the env var) and leaves the choice to the real team. Never state in a
  brief or story that `process.env` is the house convention.
- **Per-client HTTP helpers stay inlined**, not pulled into a shared
  helper. The real plants address-book client inlines its own fetch calls
  too, so each service folder is free to lift into
  `trade-imports-plants-frontend` on its own, with nothing shared to bring
  along.
- **Design releases stay test-free.** `new:set` deliberately leaves out the
  real journey's tests, and no reference in this skill ever writes a
  `*.test.js` or `*.fit.spec.js` inside `src/server/app/sets/<release>/`.
  The hand-off's C1 route writes the tests, through the real recipes, once
  the change lands in `trade-imports-plants-frontend`.

## When the ladder has nothing to say

Some choices are the designer's alone — a made-up name, a colour a
`govukTag` cannot show, a copy decision the designer has already made. The
ladder governs conventions, never the design itself: never let "the real
service does it differently" talk a designer out of their own decision.
Log the gap and build what they asked for.
