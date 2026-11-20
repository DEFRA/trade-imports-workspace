# Local stack: which services each test domain needs

The workspace stack starts 22 containers whatever you are working on. Most of
them are not needed for any one domain's end-to-end suite. This page records
which services each domain does need, how that was established, and why a map
derived from `depends_on` alone is not trustworthy.

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

Each domain then adds its own:

| Domain | Adds | Total |
|---|---|---|
| `plants` | `plants-frontend`, `plants-backend`, `reference-data`, `stub` | **10** |
| `ins` | `ins-frontend`, `ins-backend`, `routing-proxy`, `reference-data`, `stub` | **11** |
| `animals` | `animals-frontend`, `animals-frontend-nginx`, `animals-backend`, `reference-data`, `stub`, `cdp-uploader` | **12** |
| `animals-admin` | `animals-admin`, `animals-backend`, `dynamics-gateway`, `toxiproxy`, `servicebus-emulator`, `mssql` | **12** |

Against 22 for the full stack, so 10 to 12 containers come out.

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

`cdp-uploader` is likewise `linux/amd64` and needed by `animals` alone.

## Why `depends_on` is not enough

The obvious way to derive this map is to take each domain's frontend and walk
`depends_on`. That is wrong, and it is wrong in a way that passes review.

`depends_on` describes **boot order**. A test describes **behaviour**. A
service that one service calls over HTTP at request time, having booted
independently, appears in neither `depends_on` nor the health wait.

Two misses were found this way, both only by running something:

1. **`address-book` for `animals-admin`.** Nothing in `animals-admin`'s
   `depends_on` or environment names it. The dependency is in the test layer:
   `addressBookApi` is used in an animals-admin spec, and
   `outbox-event-created.spec.ts` imports `consignorFixture` from
   `@flows/shared/address-book-seed`.

2. **`dynamics-gateway` for `animals-admin`'s DLQ page.** Found by the
   experiment below.

## The gateway experiment

**Question.** Does `animals-admin` need `dynamics-gateway` and the servicebus
chain on the compose stack?

The reason to doubt it: the seven `outbox-event-*.spec.ts` specs are
`skipUnlessComposeEnvironment` and assert on Mongo outbox documents directly,
not on Azure Service Bus. Their only mention of Dynamics is the field value
`source: 'dynamics-contact'`. And the three animals specs under
`tests/animals/e2e/journeys/dynamics/` are `skipIfComposeEnvironment` — they
target real PIMS Dynamics and skip locally, so they need nothing of it.

**Method.** Start the stack with every profile except `servicebus`, and with
`-e gateway`, then run the animals-admin suite. Then restore both and re-run
the failing spec as a control.

```bash
tim docker up --profile database --profile infrastructure --profile stubs \
              --profile backend --profile frontend -e gateway
npm --prefix repos/trade-imports-ins-tests run test:docker-compose -- \
    tests/animals-admin/ --workers=2
```

**Result.**

| Run | Containers | Outcome |
|---|---|---|
| Without gateway and servicebus | 17 | 34 passed, **1 failed**, 1 did not run |
| With them (control) | 21 | Both DLQ specs pass, 3.5s and 3.7s, no retries |

All seven `outbox-event-*` specs passed without the gateway, so the outbox
reasoning held. What failed was
`tests/animals-admin/e2e/features/dlq-events.spec.ts` — "starts a replay of all
DLQ messages from the admin UI". The cause is a runtime HTTP call:

```js
// repos/trade-imports-animals-admin/src/server/common/clients/dlq-client.js
const dynamicsGatewayUrl = config.get('dynamicsGatewayApi.baseUrl')
… `${dynamicsGatewayUrl}${DLQ_PATH}`            // list
… `${dynamicsGatewayUrl}${DLQ_PATH}/replay-all`
… `${dynamicsGatewayUrl}${DLQ_PATH}/delete-all`
```

The admin UI's DLQ page is served by the gateway. Without it the table is
empty and the spec fails. The control run proves the failure is caused by the
absence rather than flakiness: the same specs pass in under four seconds with
the chain back.

**Conclusion.** `animals-admin` needs `dynamics-gateway`, and so the whole
chain behind it. No other domain does — `DLQ` appears in no spec under
`animals`, `ins` or `plants`.

Logs: `workareas/gateway-experiment/` (not committed).

## The plants subset, proven

`tim docker up --domain plants` then the plants suite, on the machine above:

| | Full stack | `--domain plants` |
|---|---|---|
| Containers running | 21 | **9** (plus `floci-init`, which exits) |
| Memory | ~4.8 GiB | **1.77 GiB** |
| `test:docker-compose:plants` | — | **151 passed, 0 failed, 2.8m** |

## Keeping the map honest

The map above is a claim about behaviour, and behaviour changes when specs are
added. A spec that reaches a service the map drops fails confusingly, long
after the change that caused it.

So the map is paired with `tim docker domain verify <name>`. It runs the
domain's suite against that domain's services alone and names every spec that
did not pass, exiting 1 when any did. A clean run is the evidence the subset is
sufficient.

A failure is evidence the map is missing a service, but not proof — the spec
may be broken on any stack. `--against-full` adds the control run on the whole
stack and separates the two: a spec that fails on the subset and passes on the
full stack is the map's fault, and the command says so and names the file to
edit. One that fails on both is not.

The control is opt-in because it doubles the runtime, and most of the time the
subset run alone answers the question.

Run it when a domain's specs change, and treat a failure as the map being out
of date rather than the test being wrong.

`tim docker domain list` prints each domain and the services it starts.

## What this page does not cover

- **Memory limits per service.** Every Java service carries a flat
  `mem_limit: 1g` and no Node service carries one. Right-sizing those is
  separate work.
- **The `servicebus` profile's place in `ALL_PROFILES`.** It starts by default
  for every domain today. Whether the default should change, rather than being
  narrowed per domain, is a decision for the team.
- **CI.** Nothing here changes what GitHub Actions runs; that follows
  [`config/e2e-tests-pr-scope.json`](../../config/e2e-tests-pr-scope.json).
