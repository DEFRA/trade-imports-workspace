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
| `frontend.compose.yml` | `trade-imports-animals-frontend`, `trade-imports-animals-admin`, `trade-imports-ins-frontend` | `frontend` |
| `security.compose.yml` | `zap` (OWASP ZAP daemon for the tests repo's `security`/`security:active` Playwright profiles) | `security` (opt-in, see below) |
| `dev.compose.yml` (--dev only) | build/target/volumes overlay for the locally-built services — every repo-backed service except `trade-imports-defra-id-stub`, which always runs from its published image | — |

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
`host.docker.internal:<port>`.

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

See `repos/trade-imports-animals-tests/README.md#security-testing` for the
full local workflow. It's opt-in unlike `toxiproxy` because it's a heavy
scanner nobody wants brought up by a plain `run-stack.sh`, and it needs
`network_mode: host` because the app frontends' OIDC redirect URLs are
hardcoded to `localhost` — same constraint as the hostname rules below.

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
- `scripts/mongodb/` — workspace-owned mongo replica-set init (`10-database-setup.js`).
- `.staged/` — generated by `scripts/stack/lib/init-scripts.sh` on every
  stack start / mongo bounce; gitignored. Contains staged mongo seed fixtures,
  Floci provisioning script (staged from the backend repo), the servicebus
  emulator config, and the ZAP automation plans (staged from the tests repo).
