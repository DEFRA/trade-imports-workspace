# Workspace docker stack — agent index

The wrapper-managed stack (this folder + `scripts/stack/`) is the **only**
compose stack in the workspace and its repos — the
`make docker-compose-*` targets delegate to these wrappers.

## Stand up / tear down

```bash
./scripts/stack/run-stack.sh                                # all services on :latest
./scripts/stack/run-stack.sh -b feat/EUDPA-123              # branch tag where published, latest elsewhere
./scripts/stack/run-stack.sh -d                             # build the repo-backed services from local source
./scripts/stack/run-stack.sh -e backend                     # run backend in IntelliJ / npm; rest in docker
./scripts/stack/run-stack.sh --profile frontend --profile infrastructure --profile database
                                                            # only those profiles; intended for "running other tiers natively"

./scripts/stack/stop-stack.sh         # down --volumes --remove-orphans
./scripts/stack/restart-stack.sh ...  # stop then run-stack (forwards -b / -e / -d / --profile)
./scripts/stack/bounce-backend.sh     # recreate backend container — picks up edited Java source in --dev mode
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
| `backend.compose.yml` | `trade-imports-animals-backend`, `trade-imports-dynamics-gateway`, `trade-imports-reference-data`, `trade-imports-address-book`, `trade-imports-ins-backend` | `backend` |
| `frontend.compose.yml` | `trade-imports-animals-frontend`, `trade-imports-animals-admin`, `trade-imports-ins-frontend`, plus one nginx per frontend owning its host port — `trade-imports-animals-frontend-lb` (`:3000`), `trade-imports-animals-admin-lb` (`:3001`), `trade-imports-ins-frontend-lb` (`:3002`); see below | `frontend` |
| `security.compose.yml` | `zap` (OWASP ZAP daemon for the tests repo's `security`/`security:active` Playwright profiles) | `security` (opt-in, see below) |
| `dev.compose.yml` (--dev only) | build/target/volumes overlay for the locally-built services — every repo-backed service except `trade-imports-defra-id-stub`, which always runs from its published image | — |

## Scaling the frontends (`*_REPLICAS`)

Each Node frontend is one process, and one process saturates a core from
about eight Playwright workers upward — past that point extra workers only
lengthen its request queue, the whole suite slows down and the long journeys
start crossing their 30s budget. Measured for the animals frontend in
`workareas/shared/e2e-stability/REPORT.md`; the admin and ins frontends are
the same shape, so they get the same treatment.

A service that publishes a host port cannot run more than one replica, so
none of the three frontends publishes one. Each host port belongs instead to
a small nginx that round-robins across however many replicas of its frontend
are running:

| Host port | nginx service | Round-robins across | Replica count (default 1) |
|---|---|---|---|
| `:3000` | `trade-imports-animals-frontend-lb` | `trade-imports-animals-frontend` | `TRADE_IMPORTS_ANIMALS_FRONTEND_REPLICAS` |
| `:3001` | `trade-imports-animals-admin-lb` | `trade-imports-animals-admin` | `TRADE_IMPORTS_ANIMALS_ADMIN_REPLICAS` |
| `:3002` | `trade-imports-ins-frontend-lb` | `trade-imports-ins-frontend` | `TRADE_IMPORTS_INS_FRONTEND_REPLICAS` |

```bash
TRADE_IMPORTS_ANIMALS_FRONTEND_REPLICAS=5 scripts/stack/run-stack.sh
TRADE_IMPORTS_ANIMALS_FRONTEND_REPLICAS=5 TRADE_IMPORTS_ANIMALS_ADMIN_REPLICAS=2 scripts/stack/run-stack.sh
```

Every count defaults to 1, so a plain `run-stack.sh` behaves as the
single-container stack did apart from one nginx hop per frontend, and CI's
four-vCPU runner carries three idle nginx processes and nothing else. The
knobs work under `--dev` too: the replicas share the one `src/` bind mount.

Reaching one replica directly means `docker compose port` or `docker exec`;
there is no per-replica host port to bind.

### One config, three containers

`frontend-lb/nginx.conf` holds three `server` blocks, one per host port, and
the same file is mounted into all three `-lb` containers. Each container
therefore listens on 3000, 3001 and 3002 inside the compose network and will
proxy for any of the three frontends there; only the one port it publishes
reaches the host. That is harmless and it keeps the config in one place, but
it is why `trade-imports-animals-admin-lb:3002` reaches the ins frontend if
you go looking.

Three containers rather than one keep the three failure domains apart. Each
LB `depends_on` only its own frontend, so an ins frontend that never becomes
healthy holds `:3002` and nothing else — `:3000` and `:3001` serve as before,
where a single LB fronting all three would have held every port until every
frontend was healthy. It is also what lets `-e` keep working: excluding
`frontend`, `admin` or `ins-frontend` drops its paired `-lb` service with it,
which is what frees the host port for the native process (see `--exclude`
below).

### How a request reaches a replica

nginx resolves the frontend's service name per request through Docker's
embedded DNS (`resolver 127.0.0.11 valid=5s`), which answers with every
running replica's address. Naming the upstream in a variable is what makes
nginx resolve per request rather than once at startup: that is how traffic
spreads across the replicas, how a replica that restarts is picked up
without restarting nginx, and why nginx can start before its upstreams are
up.

Round-robin is safe because no request state is held in process memory.
Sessions live in Redis (`SESSION_CACHE_ENGINE=redis` on all three), and Bell
keeps the OIDC handshake in a cookie encrypted with the session-cookie
password, which every replica of a frontend shares because the stack never
overrides `SESSION_COOKIE_PASSWORD` — they all run their image's config
default. `Host` is forwarded verbatim (`proxy_set_header Host $http_host`;
`$host` would strip the port), so the browser keeps talking to
`localhost:<port>`, the OIDC redirect URLs still match and nothing changes
for the hostname rules below.

### When a frontend is down

A request to a port whose frontend is gone gets `502 Bad Gateway` from nginx
straight away — the name no longer resolves, or the connect is refused —
rather than hanging. Each LB's healthcheck goes through nginx to its
frontend's `/health`, so a frontend that dies after boot flips its LB
unhealthy too and `docker compose ps` names the pair. Within the 5s DNS TTL
of the frontend being healthy again its port serves without anyone touching
nginx. If the frontend never becomes healthy at boot its LB never starts, so
the port refuses connections exactly as it did before any LB existed and
`run-stack.sh`'s `--wait` fails on the frontend's own healthcheck.

### Body size and timeouts

nginx caps request bodies at 1 MB by default, and that cap does not surface
as a proxy error: it surfaces as one unrelated-looking spec failing on every
run. The animals documents page posts a 10 MB file to the frontend itself
(`payload.maxBytes` of 10,001,024 bytes in the documents feature's
`upload-config.js`), and under the default cap nginx 413s it before the app
sees it. `client_max_body_size 12m` is set once at `http` level, so it covers
all three ports. That is behaviour-neutral for admin and ins — neither has a
multipart route, and hapi's own default `payload.maxBytes` is the same
1,048,576 bytes, so hapi keeps answering oversize bodies exactly as it does
with no proxy in front — and it means a multipart route added to either
later will not hit the 1 MB wall. CDP's own ingress caps at 10 MiB, so an
app limit raised above that would pass locally and fail deployed.

The 120s read/send timeouts on the `:3000` block were measured under
Playwright saturation: a big journey page can take a while when the replicas
are busy, and failing at nginx would report that as a proxy error rather
than the slow response it is. Admin and ins run on nginx's defaults.

## Choosing between `-d`, `-e`, and `--profile`

| Want to… | Use |
|---|---|
| Run the full stack from published Dockerhub images | `run-stack.sh` (no flags) |
| Pull a published branch tag for one or more repos | `run-stack.sh -b feat/X` |
| Edit source and see changes (Node + Java backend/stub/reference-data hot-reload) | `run-stack.sh -d` |
| Run one repo-backed service natively from your IDE, rest in docker | `run-stack.sh -e backend` |
| Run a whole tier natively (e.g. backend on the host, mongo + frontend in docker) | `run-stack.sh --profile frontend --profile infrastructure --profile database` |
| Pick up a Java `pom.xml`/dependency change under `--dev` (source edits hot-reload automatically) | `run-stack.sh -d` (rebuilds; `bounce-backend.sh` only recreates the container) |

`--branch` and `--dev` are mutually exclusive (hard error). The other flags
compose freely.

## `--exclude` (`-e`) labels

Repeatable. Valid: `frontend`, `backend`, `admin`, `ins-frontend`, `stub`, `defra-id-stub`, `reference-data`, `address-book`, `gateway`, `ins-backend`
— the labels in `run-stack.sh`'s `services` array.
Excluded services skip the Dockerhub probe and stay out of the stack — start
them yourself; the rest of the stack reaches them via
`host.docker.internal:<port>`. Excluding `frontend`, `admin` or
`ins-frontend` also drops its paired `-lb` service, so the host port is free
for the process you start.

Ports for host-side runs: frontend 3000, admin 3001, ins-frontend 3002, defra-id-stub 3007,
backend 8085, reference-data 8086, stub 8087, gateway 8088, address-book 8089, ins-backend 8090.

## `--profile` semantics (strict)

Repeatable. Valid: `database`, `infrastructure`, `servicebus`, `stubs`, `backend`, `frontend`,
`security`. Defaults to all six except `security` (the `servicebus` profile brings up mssql
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
cd repos/trade-imports-animals-tests
npm run test:docker-compose:security              # passive scan
npm run test:docker-compose:security:active       # passive + active scan
```

See `repos/trade-imports-animals-tests/docs/security.md` for the full local
workflow, what is scanned and how the run is gated. It's opt-in unlike
`toxiproxy` because it's a heavy scanner nobody wants brought up by a plain
`run-stack.sh`, and it needs `network_mode: host` because the app frontends'
OIDC redirect URLs are hardcoded to `localhost` — same constraint as the
hostname rules below.

## Running E2E tests against this stack

```bash
./scripts/stack/run-stack.sh
cd repos/trade-imports-animals-tests
npm run test:docker-compose
```

## Lifecycle scripts live in `scripts/stack/`

- `run-stack.sh` — flag parsing in `lib/flags.sh`; colour output in
  `lib/colour.sh`; compose `-f` list in `lib/compose.sh`; init-script
  staging in `lib/init-scripts.sh`.
- `stop-stack.sh`, `restart-stack.sh`, `bounce-backend.sh` — siblings, share
  `lib/` helpers.

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

- Node services (frontend, admin, ins-frontend): hot-reload via nodemon on the bind mount
  of `src/`. Just save and refresh.
- Java backend, stub, reference-data, address-book and ins-backend: hot-reload via Spring Boot DevTools.
  Each `dev-run` image runs `docker/dev-run.sh`, an mtime-poll loop that
  recompiles `src/ → target/classes` on save, then touches a trigger file so
  DevTools restarts the Spring context in ~1-2s. (We poll mtimes rather than
  use inotify because inotify events don't cross the macOS Docker bind mount,
  but mtimes do.) Just save — no `bounce-backend.sh` for routine `.java` edits.
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

## Hostname rules — no `/etc/hosts` edits required

Two hostnames, used for different audiences:

- **Browser-visible URLs** use `localhost`. Playwright base URLs,
  `DEFRA_ID_REDIRECT_URL`, `DEFRA_ID_SIGN_OUT_REDIRECT_URL`, and the
  stub's `WELL_KNOWN_HOST_OVERRIDE`. The dev machine resolves these
  natively.
- **Inter-container URLs** use `host.docker.internal` (auto-injected
  inside containers by Docker Desktop). Mongo, redis, floci, the
  cdp-uploader, the frontend's server-side `DEFRA_ID_OIDC_CONFIGURATION_URL`
  fetch.

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

## Files in this folder

- `compose.yml` — base, just `name: trade-imports`.
- `<role>.compose.yml` — per-role service definitions (see layout table above).
- `dev.compose.yml` — build/target/volumes overlay for `--dev`.
- `shared.env` — env vars loaded by multiple services (mongo URIs, AWS test
  creds, floci endpoints, the truststore cert blob).
- `frontend-lb/nginx.conf` — the one config mounted into all three `-lb`
  containers: a `server` block per host port (`:3000`, `:3001`, `:3002`), each
  round-robining across its frontend's replicas (see `*_REPLICAS` above).
- `scripts/mongodb/` — workspace-owned mongo replica-set init (`10-database-setup.js`).
- `.staged/` — generated by `scripts/stack/lib/init-scripts.sh` on every
  stack start / mongo bounce; gitignored. Contains staged mongo seed fixtures,
  Floci provisioning script (staged from the backend repo), the servicebus
  emulator config, and the ZAP automation plans (staged from the tests repo).
