# Workspace docker stack — agent index

The wrapper-managed stack (this folder + `scripts/stack/`) is the **only**
compose stack in the workspace and its repos. `tim docker` sits on top of
the wrappers and is the surface to use.

## Rules for agents

- **Run the stack through `tim`.** `tim docker dev` (built from local
  source), `tim docker up` (published images), `tim docker down`,
  `tim docker restart`, `tim workspace status`. `tim` passes any other flag
  (`-b`, `-e`, `--profile`) to the wrapper. Below `tim`, use the
  `scripts/stack/` wrappers listed next.
- **Never hand-assemble `docker compose -f … -f …`.** The file list, the
  profiles and the init-script staging live in `scripts/stack/lib/`. A
  hand-built chain silently drops some of them.
- **Never `docker start` one container to revive it.** Its dependencies may
  be dead too, and its health wait then never passes. Check the whole stack
  with `tim workspace status`, then recover it with `tim docker dev` or
  `tim docker up`, which start services in dependency order.
- **A broken stack blocks all work.** If bring-up exits non-zero, or any
  container is unhealthy or exited, fix it before doing anything that uses
  the stack. That holds for a container you think the change does not need,
  such as `mssql` killed for memory (exit 137) while everything else is
  green. Find the cause with `docker logs <container>`,
  `docker inspect --format '{{.State.OOMKilled}}' <container>` and
  `docker info` (MemTotal against what the stack needs). A Docker memory
  ceiling is a real blocker: report it rather than work round it.
- **Verify local changes on a dev-mode stack, and prove the mode first.** A
  stack from published images ignores everything under `repos/`, so tests
  against it pass for the wrong reason. `docker ps` cannot tell the two
  apart: both list the same names, all healthy. Before verifying, inspect a
  service you changed:

  ```bash
  docker inspect trade-imports-trade-imports-plants-frontend-1 --format '{{.Config.Image}} | {{range .Mounts}}{{.Source}} -> {{.Destination}}; {{end}}'
  ```

  Dev mode shows a locally built image (`trade-imports-trade-imports-plants-frontend`,
  no `defradigital/` prefix) and a bind mount from `repos/<repo>/src`.
  `defradigital/…:latest` with no mounts means published images: run
  `tim docker dev`. A plan whose verification needs only published images
  (a change to the stack itself, not to service code) says so.
- **Keep `host.docker.internal` routing.** Containers reach each other
  through `host.docker.internal` on purpose (see
  [Hostname rules](#hostname-rules--no-etchosts-edits-required)). It is what
  lets `-e` run one service natively, and CI runs the same way. Never change
  it or propose changing it. Docker Desktop's port forwarder now and then
  stalls a connection, seen as
  `ConnectTimeoutError … 192.168.65.254:8091, timeout 10000ms`. When the
  evidence names the call, fix it in the calling service's client: a short
  connect timeout and one retry, on connect errors only, with a log line for
  the retry. Never weaken a test assertion to hide it.
- **A shell export does not reach a container.** Compose passes a variable
  only when a service names it under `environment:` or interpolates it
  (`${NAME:-default}`). To change a setting for an experiment, add it to the
  service's `environment:` block, then check it arrived with
  `docker exec <container> printenv NAME` before trusting the result.

## Stand up / tear down

```bash
./scripts/stack/run-stack.sh                                # all services on :latest
./scripts/stack/run-stack.sh -b feat/EUDPA-123              # branch tag where published, latest elsewhere
./scripts/stack/run-stack.sh -d                             # build the repo-backed services from local source
./scripts/stack/run-stack.sh --perf                         # published images, both stubs on STUB_PROFILE (default sla)
./scripts/stack/run-stack.sh -e backend                     # run backend in IntelliJ / npm; rest in docker
./scripts/stack/run-stack.sh --profile frontend --profile infrastructure --profile database
                                                            # only those profiles; intended for "running other tiers natively"

./scripts/stack/stop-stack.sh         # down --volumes --remove-orphans
./scripts/stack/restart-stack.sh ...  # stop then run-stack (forwards -b / -e / -d / --profile)
./scripts/stack/bounce-backend.sh     # recreate backend container — picks up edited Java source in --dev mode
./scripts/stack/dev-service.sh rebuild <service>...  # --dev stack: rebuild these images from local source, recreate them, wait for healthy
./scripts/stack/dev-service.sh restart <service>...  # --dev stack: restart these containers (same ids), wait for healthy
```

Images are pulled fresh on every run (`--pull always`).

## Compose file layout

Services live in overlay files; `compose.yml` is just the project
name anchor. `run-stack.sh` `-f`-stacks all of them automatically.

| File | Services | Profile |
|---|---|---|
| `compose.yml` | (`name:` only) | — |
| `database.compose.yml` | `mongodb` | `database` |
| `infrastructure.compose.yml` | `floci`, `floci-init`, `redis`, `cdp-uploader` | `infrastructure` |
| `infrastructure.compose.yml` | `mssql`, `servicebus-emulator` (Azure Service Bus emulator the dynamics-gateway talks to), `toxiproxy` (sits in front of servicebus-emulator; lets you sever/restore the gateway's ASB connection for DLQ testing) | `servicebus` |
| `stubs.compose.yml` | `trade-imports-defra-id-stub`, `trade-imports-stub` | `stubs` |
| `backend.compose.yml` | `trade-imports-animals-backend`, `trade-imports-dynamics-gateway`, `trade-imports-reference-data`, `trade-imports-address-book`, `trade-imports-ins-backend`, `trade-imports-plants-backend` | `backend` |
| `frontend.compose.yml` | `trade-imports-animals-frontend`, `trade-imports-animals-admin`, `trade-imports-ins-frontend`, `trade-imports-plants-frontend`, `animals-frontend-nginx` | `frontend` |
| `security.compose.yml` | `zap` (OWASP ZAP daemon for the tests repo's `security`/`security:active` Playwright profiles) | `security` (opt-in, see below) |
| `monitoring.compose.yml` | `prometheus` (:9090), `grafana` (:3030) — local view of Micrometer meters | `monitoring` (opt-in, see below) |
| `dev.compose.yml` (--dev only) | build/target/volumes overlay for the locally-built services — every repo-backed service except `trade-imports-defra-id-stub`, which always runs from its published image | — |
| `perf.compose.yml` (--perf only) | sets `STUB_LATENCY_PROFILE=${STUB_PROFILE:-sla}` on `trade-imports-stub` and `trade-imports-defra-id-stub` | — |

## The nginx sidecar in front of the animals frontend

`animals-frontend-nginx` holds host port 3000, so the browser reaches
`trade-imports-animals-frontend` through it rather than directly. It reproduces
the CDP `nginx-upstreams` sidecar that every deployed service gets, which is two
body-size caps:

- **10M on every path except `/upload-and-scan`.** An oversized POST to an
  ordinary route comes back as a bare nginx 413 before the app sees it, so a
  local 413 with nothing in the frontend's log is this cap, not hapi's
  `payload.maxBytes`.
- **2304M on `/upload-and-scan`**, proxied straight to `cdp-uploader:7337`. That
  is how the browser's file POST gets past both the 10M cap and the frontend
  itself.

Config is `config/nginx/animals-frontend.conf`; the full upload sequence is in
[`workareas/shared/document-upload-flow.md`](../../workareas/shared/document-upload-flow.md).

Excluding the frontend takes the sidecar with it, leaving neither the cap nor
the bypass — see [`--exclude` (`-e`) labels](#--exclude--e-labels).

## Choosing between `-d`, `-e`, and `--profile`

| Want to… | Use |
|---|---|
| Run the full stack from published Dockerhub images | `run-stack.sh` (no flags) |
| Pull a published branch tag for one or more repos | `run-stack.sh -b feat/X` |
| Edit source and see changes (Node + Java backend/stub/reference-data hot-reload) | `run-stack.sh -d` |
| Run the stack as a performance target (stubs at their SLA latency) | `run-stack.sh --perf`, or `tim docker perf` to also take the lease |
| Run one repo-backed service natively from your IDE, rest in docker | `run-stack.sh -e backend` |
| Run a whole tier natively (e.g. backend on the host, mongo + frontend in docker) | `run-stack.sh --profile frontend --profile infrastructure --profile database` |
| Pick up a Java `pom.xml`/dependency change under `--dev` (source edits hot-reload automatically) | `run-stack.sh -d` (rebuilds; `bounce-backend.sh` only recreates the container), or `dev-service.sh rebuild <service>` for just that service |

`--branch` and `--dev` are mutually exclusive (hard error). The other flags
compose freely, and `--perf` composes with every other flag.

## `--exclude` (`-e`) labels

Repeatable. Valid: `frontend`, `backend`, `admin`, `ins-frontend`, `stub`, `defra-id-stub`, `reference-data`, `address-book`, `gateway`, `ins-backend`, `plants-frontend`, `plants-backend`
— the labels in `run-stack.sh`'s `services` array.
Excluded services skip the Dockerhub probe and stay out of the stack — start
them yourself; the rest of the stack reaches them via
`host.docker.internal:<port>`.

**Excluding a service also removes its sidecar**, so one label can take two
services out. `run-stack.sh`'s `sidecars` array holds the pairings and the run
prints each removal in its startup summary.

| Service label | Sidecar removed with it | What a host-side run loses |
|---|---|---|
| `frontend` | `animals-frontend-nginx` | host port 3000 is the natively-run frontend's, and `/upload-and-scan` is no longer proxied to `cdp-uploader` (so neither the 10M cap nor the 2304M bypass applies) |

So `-e frontend` cannot upload a document in real mode: the page hands the
browser the same-origin path `/upload-and-scan/{uploadId}` and hapi has no
route for it, so the POST 404s. Run the native frontend with `STUB_MODE=true`,
which serves `/stub-upload-and-scan/{uploadId}` from the app itself, or leave
the frontend in the stack whenever the journey under test uploads a document.

Ports for host-side runs: frontend 3000, admin 3001, ins-frontend 3002,
plants-frontend 3003, defra-id-stub 3007, backend 8085, reference-data 8086,
stub 8087, gateway 8088, address-book 8089, ins-backend 8090, plants-backend 8091.

EUDPA-390 (address lookup spike, dev/local only): the STS simulator in `trade-imports-stub`
gets its own dedicated port, 8098 — the AWS SDK's `GetWebIdentityToken` always POSTs to the
root path of its endpoint override, so it can't share a sub-path on 8087 with the other
simulators. Published in `stubs.compose.yml` alongside 8087.

## `--profile` semantics (strict)

Repeatable. Valid: `database`, `infrastructure`, `servicebus`, `stubs`, `backend`, `frontend`, `monitoring`,
`security`. Defaults to all six except the opt-in `security` and `monitoring` (the `servicebus` profile brings up mssql
+ the ASB emulator that the dynamics-gateway connects to). Strict — if you pass only
`--profile frontend`, compose won't auto-include `database` even though frontend depends_on
redis (which in turn depends on `infrastructure` services). Spell out the dependency
chain you need.

`security` is opt-in only — deliberately excluded from the default six, unlike every
other profile. Nothing in the default stack depends on ZAP, so a plain `run-stack.sh`
never starts it; request it explicitly with `--profile security`. Bring-up is additive:
`run-stack.sh` always calls `up` with an explicit, resolved service list and never runs
`down`, so running `--profile security` against an already-running default stack starts
only the `zap` container and leaves everything else untouched.

Intended use: running a tier natively. Example — backend in IntelliJ, rest
in docker:

```bash
./scripts/stack/run-stack.sh --profile frontend --profile infrastructure --profile database --profile stubs
# ... then in IntelliJ: run trade-imports-animals-backend with SPRING_PROFILES_ACTIVE=local
```

## Simulating an ASB outage (notification DLQ testing)

`trade-imports-dynamics-gateway`'s `AZURE_SERVICE_BUS_CONNECTION_STRING` points at
`toxiproxy`, not `servicebus-emulator`, directly — a thin AMQP proxy
(`docker/stack/toxiproxy/toxiproxy.json` defines the single `servicebus` proxy,
`5672 → servicebus-emulator:5672`). Disabling the proxy severs the gateway's live
connection instantly (no emulator restart, no reconnect delay) and is the
recommended way to drive a message into the notification DLQ locally:

```bash
# sever — existing connections drop, new ones refuse
curl -X POST http://localhost:8474/proxies/servicebus -H 'Content-Type: application/json' -d '{"enabled": false}'

# restore
curl -X POST http://localhost:8474/proxies/servicebus -H 'Content-Type: application/json' -d '{"enabled": true}'
```

With the proxy disabled, `QueueMessageSender` sees connection failures classed as
transient, so the SQS message is redelivered up to the queue's `maxReceiveCount`
(3, set in `repos/trade-imports-dynamics-gateway/servicebus/setup-notification-pipeline.sh`)
before SQS itself moves it to the DLQ (`GET /dlq/notifications` on the gateway to
check depth). Restoring the proxy does not auto-redeliver already-DLQ'd
messages — call `POST /dlq/notifications/replay-all` (guarded by the
`Trade-Imports-Animals-Admin-Secret` header) to move them back onto the source
queue once ASB is reachable again.

## Running the local ZAP security profile

```bash
./scripts/stack/run-stack.sh                     # default stack first, as normal
./scripts/stack/run-stack.sh --profile security   # additive: brings up just zap
cd repos/trade-imports-ins-tests
npm run test:docker-compose:security              # passive scan
npm run test:docker-compose:ins:security          # passive scan, one domain
npm run test:docker-compose:security:active       # passive + active scan, every domain
```

See `repos/trade-imports-ins-tests/docs/security.md` for the full local
workflow, what is scanned and how the run is gated. It's opt-in unlike
`toxiproxy` because it's a heavy scanner nobody wants brought up by a plain
`run-stack.sh`, and it needs `network_mode: host` because the app frontends'
OIDC redirect URLs are hardcoded to `localhost` — same constraint as the
hostname rules below.

## Looking at service meters locally (monitoring profile)

```bash
./scripts/stack/run-stack.sh -d                    # ins-backend built from source (it carries the Prometheus endpoint)
./scripts/stack/run-stack.sh --profile monitoring  # additive: brings up prometheus + grafana
open http://localhost:3030                         # anonymous admin; opens on the address lookup dashboard
```

Prometheus scrapes `host.docker.internal:8090/prometheus` every 5s, so it works
whether ins-backend runs in docker or natively. That endpoint exists only under
ins-backend's `local` profile; every other environment keeps the plain registry.

Deployed environments use CDP's Grafana over **CloudWatch**, fed by
`EmfMetricsPublisher`. This local pair reads **Prometheus** instead: the meter
names match dev, but the queries don't, so a dashboard here is for checking
meters, not for promoting. Config lives in `docker/stack/monitoring/`.

## Performance mode

`run-stack.sh --perf` starts the stack as a performance target: both stubs
(`trade-imports-stub` and `trade-imports-defra-id-stub`) answer with a latency
profile instead of none. `perf.compose.yml` sets `STUB_LATENCY_PROFILE` from
`STUB_PROFILE`, which defaults to `sla`. The other allowed value is
`zero-delay`; anything else exits 2 before anything starts.

```bash
./scripts/stack/run-stack.sh --perf                       # published images, stubs on sla
STUB_PROFILE=zero-delay ./scripts/stack/run-stack.sh --perf
tim docker perf                                           # the same, and takes the stack lease as "perf"
tim docker lease status                                   # ... leased to "perf" (perf mode, stubs on sla, ...)
tim docker lease release --holder perf                    # take it down
curl -s http://localhost:8087/latency-profiles            # trade-imports-stub
curl -s http://localhost:3007/latency-profiles            # defra-id-stub
```

`--perf` uses the published images unless you also pass `-d`. `tim docker perf`
takes the lease in mode `perf`, so a stack leased to a build, or up with no
lease, is refused and left alone. The gate's stack, and any stack started
without `--perf`, keeps both stubs on `zero-delay`. Never use perf mode for E2E
runs.

## Running E2E tests against this stack

```bash
tim docker dev                          # local changes under repos/; tim docker up for published images only
cd repos/trade-imports-ins-tests
npm run test:docker-compose             # every domain
npm run test:docker-compose:plants      # one domain: animals, animals-admin, ins or plants
```
Which domain(s) a service's own PR runs in GitHub Actions: [`docs/testing/e2e-tests-gh-actions.md`](../../docs/testing/e2e-tests-gh-actions.md).

## Lifecycle scripts live in `scripts/stack/`

- `run-stack.sh` — flag parsing in `lib/flags.sh`; colour output in
  `lib/colour.sh`; compose `-f` list in `lib/compose.sh`; init-script
  staging in `lib/init-scripts.sh`.
- `stop-stack.sh`, `restart-stack.sh`, `bounce-backend.sh`, `dev-service.sh`
  — siblings, share `lib/` helpers.
- `dev-service.sh rebuild|restart <service>...` touches only the named
  services of a running `--dev` stack (`--no-deps`), with the same compose
  files and profiles `run-stack.sh -d` uses, and blocks until they report
  healthy. It does not re-stage init scripts.

### How `tim build gate` uses the stack

The gate always leases the stack in dev mode and never passes `--perf`, so
both stubs stay on `zero-delay`.

The gate runs in three layers, each after the one before has finished.
Layer one is every unit and FIT rung (repos at the same time). Layer two is
every rung gates.json marks `exclusive` — the k6 performance suite — alone,
so a performance test never shares the machine with another test. Layer
three is the Playwright E2E rungs, one after another. Neither E2E layer
competes with unit tests, FIT suites or `mvn verify` for CPU. Taking the
lease and starting or refreshing the stack overlaps layer one, so the stack
is usually ready by the time layer two starts.

When the gate's holder already leases the stack, the gate does not rerun
`run-stack.sh -d`. The lease (`tim docker lease`) records two fingerprints
for each service in `dev.compose.yml` that has a `build.context`:

- **build** — every file git tracks or sees as untracked in the service's
  repo, outside the bind-mounted `src/`, as it is on disk (so `package.json`,
  `package-lock.json`, `pom.xml`, `Dockerfile`, `docker/dev-run.sh`, webpack
  config, tests outside `src/` and so on);
- **source** — the same, inside the bind-mounted `src/`.

On reuse it compares them with the working tree now. Build changed (or the
lease has no fingerprints, as a lease from before this has none) →
`dev-service.sh rebuild`, then the lease records the new container ids.
Only source changed → `dev-service.sh restart`, so E2E never runs against a
service still part-way through a hot reload. Nothing changed → left alone.
The gate result's `stack.refresh` lists what was rebuilt, restarted and
left, with the logs. Changes to staged init scripts (Floci, Mongo seeds,
the ASB config) are not picked up on reuse: they only run on a fresh stack.

## Init-script ownership and staging

AWS resource creation belongs to the service that needs the resources; the
stack invokes the repo-owned script rather than keeping its own copy:

| Script | Owner | Path in owning repo |
|---|---|---|
| Mongo replica-set init (`10-database-setup.js`) | workspace | `docker/stack/scripts/mongodb/` |
| Floci provisioning (`start-floci.sh`) | backend | `compose/start-floci.sh` |
| ASB emulator entity config (`servicebus-config.json`) | dynamics-gateway | `servicebus/servicebus-config.json` |
| ZAP Automation Framework plans (`automation-*.yaml`) | tests repo | `zap/automation-*.yaml` |

`run-stack.sh` calls `stage_init_scripts`
(`lib/init-scripts.sh`), which refreshes `docker/stack/.staged/` — generated,
gitignored, never edit it — from `repos/<repo>/` when present, sparse-fetching
the paths from GitHub when not (CI checks out only the workspace repo; the
fetch tries the `--branch` ref first, then the default branch). One
concurrent job per owning repo, and the ZAP plans are staged only when
`--profile security` is requested — nothing else mounts them. It clears
each staged subdirectory's *contents*, not the subdirectories
themselves — the `zap` one is bind-mounted whole into a long-running
container designed to be left up across repeated calls, and deleting +
recreating the directory node (rather than just what's inside it) would
orphan that mount. The compose files mount `./.staged/mongodb` (flat — the
mongo image only executes top-level init files), `./.staged/floci`,
`./.staged/servicebus`, and `./.staged/zap` (this last one as a whole
directory, for the same reason).

## `--dev` caveats

- Node services (frontend, admin, ins-frontend, plants-frontend): hot-reload via nodemon on the bind mount
  of `src/`. Just save and refresh.
- Java backend, stub, reference-data, address-book, ins-backend and plants-backend: hot-reload via Spring Boot DevTools.
  Each `dev-run` image runs `docker/dev-run.sh`, an mtime-poll loop that
  recompiles `src/ → target/classes` on save, then touches a trigger file so
  DevTools restarts the Spring context in ~1-2s. Just save — no
  `bounce-backend.sh` for routine `.java` edits.
  - `bounce-backend.sh` recreates the container but does **not** rebuild, so a
    `pom.xml`/dependency change still needs `run-stack.sh -d` (the
    `dependency:go-offline` layer is baked at image-build time). Edits outside
    the watched source tree are likewise not picked up in place.
  - DevTools is scoped `optional` in each pom and excluded from the repackaged
    jar, so the published `development`/`production` images never carry it.
- Java gateway: has a `dev-run` stage with a source mount but no recompile
  loop, so source edits are only picked up on a container restart. Wiring it to
  the same `docker/dev-run.sh` pattern is a follow-up (out of scope for the
  three services above).

### Template caching in `--dev`

The Node frontends cache Nunjucks templates in two layers: nunjucks' own
cache, which covers every `extends`, `include` and `import`, and
`@hapi/vision`'s cache of the top-level view named in `h.view()`. Both follow
`NUNJUCKS_NO_CACHE`. `frontend.compose.yml` defaults it to `false`, so
published images cache, which saves about a third of E2E time.
`dev.compose.yml` sets `NUNJUCKS_NO_CACHE=true` and `NUNJUCKS_WATCH=false`.
The two files disagree on purpose.

- **Dev mode turns the cache off rather than watching it.** The nunjucks
  watcher clears only nunjucks' cache. vision reads the top-level view itself,
  so with cache on and watch on, partials refresh while `h.view()` templates
  go stale, and a stale page looks like a broken edit. With the cache off a
  watcher has nothing to clear, so it stays off as well.
- **Never set `NODE_ENV=production` to get the cache.** It also turns on
  secure cookies, Redis TLS and the secure context, which break a stack on
  `http://localhost`.
- **Keep `noCache` as it is.** `nunjucks.noCache` with
  `default: isDevelopment` is CDP template code. Do not turn it into a
  positive flag. Local `npm run dev` needs no env var: the default already
  turns the cache off.
- **A nodemon restart fakes a passing cache experiment.** The animals and
  plants frontends run nodemon with `--ext js,json,njk`, so a template save
  restarts the app and rebuilds both caches. An experiment that reads only
  the rendered page then passes for the wrong reason. Compare the app
  process's age with its parents' (`ps`) before believing a live-reload
  result. admin and ins-frontend use `--ext js,json`: they never restart on a
  template save, so they are the clean test bed, and they get no live
  template reload.
- **This is not a bind-mount problem.** A save on the host does reach a file
  watcher inside the container on macOS. Do not reopen it as one.

## Hostname rules — no `/etc/hosts` edits required

Three hostnames, used for different audiences:

- **Browser-visible URLs** use `localhost`. Playwright base URLs,
  `DEFRA_ID_REDIRECT_URL`, `DEFRA_ID_SIGN_OUT_REDIRECT_URL`, and the
  stub's `WELL_KNOWN_HOST_OVERRIDE`. The dev machine resolves these
  natively.
- **Inter-container URLs** use `host.docker.internal` (auto-injected
  inside containers by Docker Desktop). Mongo, redis, floci, the
  cdp-uploader, the frontend's server-side `DEFRA_ID_OIDC_CONFIGURATION_URL`
  fetch. This is the default, because it resolves whether the service at the
  other end runs in docker or natively under `-e`.
- **Hops that never leave the compose network** use the compose service name:
  the animals frontend's `CDP_UPLOADER_BASE_URL`, and both upstreams in
  `config/nginx/animals-frontend.conf`. Reach for this only where neither end
  can be run on the host — `cdp-uploader` has no `-e` label, and the nginx
  sidecar is removed when the frontend is excluded. Wherever `-e` could put one
  end natively, use `host.docker.internal` instead.

The OIDC token endpoint sits across both audiences. The
`trade-imports-defra-id-stub` handles this itself: when
`WELL_KNOWN_HOST_OVERRIDE=http://localhost:3007`, the discovery doc it
returns has `authorization_endpoint`/`end_session_endpoint` on `localhost`
(browser-friendly) AND `token_endpoint`/`jwks_uri`/`issuer` automatically
rewritten to `host.docker.internal` (server-friendly). See
`repos/trade-imports-defra-id-stub/src/open-id/host.js`.

The frontend's `signOutHostnameRewrite` is `enabled: true` so the
sign-out URL (built from `DEFRA_ID_OIDC_CONFIGURATION_URL`, which uses
`host.docker.internal` for the server-side fetch) gets flipped back to
`localhost` before being handed to the browser.

| Service | Env | Value |
|---|---|---|
| frontend / admin | `DEFRA_ID_OIDC_CONFIGURATION_URL` | `http://host.docker.internal:3007/…` (server-side) |
| frontend / admin | `DEFRA_ID_REDIRECT_URL` | `http://localhost:{3000,3001}/auth/sign-in-oidc` (browser) |
| frontend / admin | `DEFRA_ID_SIGN_OUT_REDIRECT_URL` | `…/auth/sign-out-oidc` (browser) |
| frontend / admin | `DEFRA_ID_SIGN_OUT_HOSTNAME_REWRITE_ENABLED` | `true` (flips h.d.i. → localhost for browser-visible sign-out URL) |
| defra-id-stub | `WELL_KNOWN_HOST_OVERRIDE` | `http://localhost:3007` (browser endpoints; token endpoint auto-rewrites to h.d.i.) |
| animals / plants frontend | `TRADE_IMPORTS_INS_FRONTEND_URL` | `http://localhost:3002` (browser follows the Address book link) |
| ins frontend | `TRADE_IMPORTS_{ANIMALS,PLANTS}_FRONTEND_URL` | `http://localhost:{3000,3003}` (browser follows the dashboard's journey links) |
| animals frontend | `CDP_UPLOADER_BASE_URL` | `http://cdp-uploader:7337` (compose DNS — the initiate and status calls never leave the network, and cdp-uploader has no `-e` label) |
| animals frontend | `CDP_UPLOADER_CALLBACK_URL` | `http://host.docker.internal:8085/document-uploads/pending/scan-results` (cdp-uploader resolves it from inside its own container, so it needs the backend's published port) |

## Files in this folder

- `compose.yml` — base, just `name: trade-imports`.
- `<role>.compose.yml` — per-role service definitions (see layout table above).
- `dev.compose.yml` — build/target/volumes overlay for `--dev`.
- `perf.compose.yml` — stub latency overlay for `--perf`.
- `shared.env` — env vars loaded by multiple services (mongo URIs, AWS test
  creds, floci endpoints, the truststore cert blob).
- `config/nginx/` — nginx config mounted by the frontend sidecar
  (`animals-frontend.conf`).
- `monitoring/` — Prometheus scrape config and the Grafana dashboards and
  provisioning the `monitoring` profile mounts.
- `toxiproxy/` — the proxy definition that sits in front of the ASB emulator
  (`toxiproxy.json`).
- `scripts/mongodb/` — workspace-owned mongo replica-set init (`10-database-setup.js`).
- `.staged/` — generated by `scripts/stack/lib/init-scripts.sh` on every
  stack start / mongo bounce; gitignored. Contains staged mongo seed fixtures,
  Floci provisioning script (staged from the backend repo), the servicebus
  emulator config, and the ZAP automation plans (staged from the tests repo).
