# Local stack: which services each test domain needs

The workspace stack starts 22 containers whatever you are working on. One
domain's end-to-end suite needs between 10 and 17 of them. This page records
which, how that was established, and why a map derived from `depends_on` alone
is not trustworthy.

Written to inform `tim docker up --domain <name>`, which starts one domain's
subset instead of the whole stack.

**Measured as of** 2026-11-20, against `main` in every repo, on published
images (not `--dev`). Apple M3 Pro, 12 cores, 18 GiB, Docker Desktop 8 CPUs
and 6.77 GiB.

## The map

Six services are core: every domain needs them.

| Core | Why |
|---|---|
| `mongodb` | Every backend persists to it, and many specs assert on it directly through `MongoDbClient` |
| `redis` | Session cache for every frontend |
| `floci` + `floci-init` | AWS emulation (S3, SNS, SQS); specs reach SQS through `getSqsEndpoint` |
| `trade-imports-defra-id-stub` | OIDC sign-in for all four UIs |
| `trade-imports-address-book` | Used by all four domains (14 / 1 / 23 / 13 specs) |

Each domain then adds its own, **and whatever other domain's frontend its
specs drive**:

| Domain | Adds | Total | Proven |
|---|---|---|---|
| `plants` | `plants-frontend`, `plants-backend`, `reference-data`, `stub` | **10** | 151 passed, 2.8m |
| `animals` | the animals chain (`animals-frontend`, `animals-frontend-nginx`, `animals-backend`, `reference-data`, `stub`, `cdp-uploader`), plus `animals-admin`, `ins-frontend`, `ins-backend` | **15** | 461 passed, 11 skipped, 6.2m |
| `animals-admin` | `animals-admin`, `animals-backend`, `dynamics-gateway`, `toxiproxy`, `servicebus-emulator`, `mssql`, plus the animals frontend chain | **17** | 36 passed, 36s |
| `ins` | `ins-frontend`, `ins-backend`, `routing-proxy`, `reference-data`, `stub`, plus the animals frontend chain and `plants-frontend`, `plants-backend` | **17** | 174 passed, 39s |

Against 22 for the full stack. **Only `plants` is a large saving.** Its specs
stay within their own domain; the other three drive other domains' frontends,
so their subsets are close to the whole stack.

| Domain | Fixtures from other domains |
|---|---|
| `plants` | none |
| `animals` | `animalsAdminPages` (1 spec), `insPages` (3) |
| `animals-admin` | `animalsPages` (1), `animalsJourney` (6), `frontendSeedContext` |
| `ins` | `animalsPages` (3), `animalsJourney` (6), `plantsPages` (2), `plantsJourney` (1) |

## What the servicebus chain costs

`mssql`, `servicebus-emulator` and `toxiproxy` exist only to serve
`dynamics-gateway`, and only `animals-admin` uses the gateway. Measured with
`docker stats` on the full stack:

| Container | Memory |
|---|---|
| `mssql` | 1.078 GiB |
| `trade-imports-dynamics-gateway` | 283 MiB |
| `servicebus-emulator` | 222 MiB |
| `toxiproxy` | 19 MiB |
| **Total** | **~1.60 GiB** |

That is about a third of the whole stack's memory, droppable for three of the
four domains. `mssql` is also pinned to `linux/amd64` (SQL Server publishes no
arm64 image), so on Apple Silicon it runs translated, and
[`docker/stack/AGENTS.md`](../../docker/stack/AGENTS.md) already documents it
being OOM-killed (exit 137) as a routine event on a memory-tight machine.

`cdp-uploader` is likewise `linux/amd64`.

## Why `depends_on` is not enough

The obvious way to derive this map is to take each domain's frontend and walk
`depends_on`. That is wrong, and it is wrong in ways that pass review.

`depends_on` describes **boot order**. A test describes **behaviour**. Three
misses came out of that gap, every one found by running a suite, never by
reading the compose files:

1. **`address-book` for `animals-admin`.** Nothing in its `depends_on` or
   environment names it. The dependency is in the test layer: `addressBookApi`
   is used in an animals-admin spec, and `outbox-event-created.spec.ts`
   imports `consignorFixture` from `@flows/shared/address-book-seed`.

2. **`dynamics-gateway` for the admin DLQ page.** A runtime HTTP call with no
   `depends_on` edge — see the experiment below.

3. **The whole animals frontend chain for `animals-admin`, and cross-domain
   frontends for `animals` and `ins`.** A domain's specs drive another
   domain's UI. `createFrontendSeedContext` in `fixtures/seed-context.ts` uses
   `getAnimalsFrontendBaseUrl()`, so every admin spec that seeds a
   notification goes through the animals frontend. This one was missed by the
   gateway experiment too, because that experiment ran the whole stack minus
   the gateway, so the frontend was present throughout. It only surfaced on
   the first real `tim docker domain verify animals-admin`, which failed 21 of
   36 specs.

## The gateway experiment

**Question.** Does `animals-admin` need `dynamics-gateway` and the servicebus
chain on the compose stack?

The reason to doubt it: the seven `outbox-event-*.spec.ts` specs are
`skipUnlessComposeEnvironment` and assert on Mongo outbox documents directly,
not on Azure Service Bus. Their only mention of Dynamics is the field value
`source: 'dynamics-contact'`. And the three animals specs under
`tests/animals/e2e/journeys/dynamics/` are `skipIfComposeEnvironment` — they
target real PIMS Dynamics and skip locally.

**Method.** Start the stack with every profile except `servicebus`, and with
`-e gateway`, then run the animals-admin suite. Then restore both and re-run
the failing spec as a control.

**Result.**

| Run | Containers | Outcome |
|---|---|---|
| Without gateway and servicebus | 17 | 34 passed, **1 failed**, 1 did not run |
| With them (control) | 21 | Both DLQ specs pass, 3.5s and 3.7s, no retries |

All seven `outbox-event-*` specs passed without the gateway. What failed was
`tests/animals-dlq/e2e/features/dlq-events.spec.ts`. The cause is a runtime
HTTP call:

```js
// repos/trade-imports-animals-admin/src/server/common/clients/dlq-client.js
const dynamicsGatewayUrl = config.get('dynamicsGatewayApi.baseUrl')
… `${dynamicsGatewayUrl}${DLQ_PATH}`            // list
… `${dynamicsGatewayUrl}${DLQ_PATH}/replay-all`
… `${dynamicsGatewayUrl}${DLQ_PATH}/delete-all`
```

The admin UI's DLQ page is served by the gateway. The control run proves the
failure is caused by the absence rather than flakiness.

**Conclusion.** `animals-admin` needs `dynamics-gateway` and the chain behind
it. No other domain does — `DLQ` appears in no spec under `animals`, `ins` or
`plants`.

## Keeping the map honest

The map is a claim about behaviour, and behaviour changes when specs are
added. A spec that reaches a dropped service fails confusingly, long after the
change that caused it.

So the map is paired with `tim docker domain verify <name>`. It runs the
domain's suite against that domain's services alone and names every spec that
failed, exiting 1 when any did. A clean run is the evidence the subset is
sufficient.

A skipped spec is not a failure. A suite skips the cases its environment does
not offer — the animals suite skips 11 specs that need the frontend in stub
mode — and those say nothing about which services were up.

A failure is evidence the map is missing a service, but not proof: the spec
may be broken on any stack. `--against-full` adds the control run on the whole
stack and separates the two, naming the file to edit when the map is at fault.
It is opt-in because it doubles the runtime.

`tim docker domain list` prints each domain and the services it starts.

## In the build loop

The loop holds one stack for a whole run, not one per row, so the choice is
made once at launch rather than per increment.

```bash
tim build stack-plan <workarea>
```

reads every row the run has left and says what they need between them, and
why, row by row. A row's domain comes from its own service repos: the
workspace repo and the tests repo appear in nearly every row and say nothing
about which domain it is for, so they are left out. The run then takes its
lease with a `--domain` per chosen domain:

```bash
tim docker lease acquire --holder "<run id>" --mode dev --domain plants
```

Three cases fall out of the rule:

| Row builds | Stack |
|---|---|
| only `openspec/` or other workspace files | **none** — it proves nothing against a running stack, and CI checks the pull request |
| plants repos (plus the workspace and tests) | the plants services |
| the performance suite, or a repo with no scope entry | the whole stack |

A stack already up for fewer domains than a later increment needs is restarted
for the wider set, so a run that derives a row outside its launch-time domains
keeps working, at the cost of one restart.

Only a run whose gate takes its end-to-end proof locally asks. An `e2e: "ci"`
run starts no stack whatever the plan says.

This changes nothing about CI. The GitHub Actions workflow resolves its scope
through `tim ci scope` and `tim/src/ci/e2e-scope.js`, a separate module from
the local gate's `tim/src/build/pr-scope.js`; they read the same JSON and share
no code.

## What this page does not cover

- **Memory limits per service.** Every Java service carries a flat
  `mem_limit: 1g` and no Node service carries one. Right-sizing those is
  separate work.
- **The `servicebus` profile's place in `ALL_PROFILES`.** It starts by default
  for every domain today. Whether the default should change, rather than being
  narrowed per domain, is a decision for the team.
- **Whether the cross-domain specs belong where they are.** `ins` driving the
  animals and plants journeys is what makes its subset nearly the whole stack.
  Moving those specs, or tagging them, would shrink three of the four domains.
  That is a test-suite decision, not a stack one.
- **CI.** Nothing here changes what GitHub Actions runs; that follows
  [`config/e2e-tests-pr-scope.json`](../../config/e2e-tests-pr-scope.json).
