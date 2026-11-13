# Local Setup

The workspace aggregates several services; the diagram below is the animals
service plus the shared front door. The full repo map is in the root
[`CLAUDE.md`](../CLAUDE.md).

## How the services connect

```
Browser
  │
  ├──▶ Animals frontend (3000)  ──▶ Backend API (8085)  ──▶ MongoDB (27017)
  │                                                      ──▶ Floci / AWS (4566)
  │
  ├──▶ Admin (3001)             ──▶ Backend API (8085)
  │
  └──▶ INS frontend (3002)      ──▶ Address book API (8089)
                                ──▶ Reference data (8086)

Every Node service ──▶ Redis (6379) for sessions
Every Node service ──▶ Defra ID stub (3007) for OIDC auth

Playwright tests (no port) ──▶ Animals frontend + Admin
```

### Key wiring

| Env var | Set to (in the stack) | Purpose |
|---------|-----------------------|---------|
| `TRADE_IMPORTS_ANIMALS_BACKEND_URL` | `http://host.docker.internal:8085` | Animals frontend → Backend |
| `TRADE_IMPORTS_ANIMALS_BACKEND_URL` | `http://host.docker.internal:8085` | Admin → Backend |
| `TRADE_IMPORTS_ADDRESS_BOOK_URL` | `http://host.docker.internal:8089` | INS frontend → Address book |
| `TRADE_IMPORTS_REFERENCE_DATA_URL` | `http://host.docker.internal:8086` | INS frontend → Reference data |
| `DEFRA_ID_OIDC_CONFIGURATION_URL` | `http://host.docker.internal:3007/...` | OIDC discovery |
| `REDIS_HOST` | `host.docker.internal` | Session cache |
| `MONGO_URI` | `mongodb://host.docker.internal:27017` | Backend → MongoDB |

All compose definitions live in the workspace stack (`docker/stack/`), driven
by the wrappers in `scripts/stack/`. Run them through `tim docker`, which
takes the same flags. See `docker/stack/AGENTS.md` for the full flag
reference and file layout.

---

## Option 1 — Full stack from Docker Hub images (quickest)

```bash
tim docker up
```

Services started:

| Service | Port | Image |
|---------|------|-------|
| Animals frontend | 3000 | `defradigital/trade-imports-animals-frontend:latest` |
| Animals backend | 8085 | `defradigital/trade-imports-animals-backend:latest` |
| Admin | 3001 | `defradigital/trade-imports-animals-admin:latest` |
| INS frontend | 3002 | `defradigital/trade-imports-ins-frontend:latest` |
| Routing proxy | 3004 | `defradigital/trade-imports-routing-proxy:latest` |
| INS backend | 8090 | `defradigital/trade-imports-ins-backend:latest` |
| Plants frontend | 3003 | `defradigital/trade-imports-plants-frontend:latest` |
| Plants prototype | 3103 | Not part of this stack — runs standalone with `npm start` |
| Plants backend | 8091 | `defradigital/trade-imports-plants-backend:latest` |
| Address book | 8089 | `defradigital/trade-imports-address-book:latest` |
| Dynamics gateway | 8088 | `defradigital/trade-imports-dynamics-gateway:latest` |
| Defra ID stub | 3007 | `defradigital/trade-imports-defra-id-stub` |
| Trade imports stub | 8087 | `defradigital/trade-imports-stub` |
| Reference data | 8086 | `defradigital/trade-imports-reference-data` |
| cdp-uploader | 7337 | `defradigital/cdp-uploader` |
| MongoDB | 27017 | `mongo:7.0` |
| Redis | 6379 | `redis:7` |
| Floci | 4566 | `floci/floci:latest` |

To run images published from a feature branch (falls back to `:latest` per
service when no branch-tagged image exists):

```bash
tim docker up --branch feature/EUDPA-123-my-change
```

Tear down and wipe volumes (mongo data, floci state):

```bash
tim docker down
```

---

## Option 2 — Full stack from source (recommended for cross-service development)

Builds the repo-backed services from their local source under `repos/` and
starts the full stack with volume mounts. Node services get hot-reload on
`src/` changes; the backend runs `mvn spring-boot:run`.

```bash
tim docker dev    # build and start the stack from local source
tim docker logs   # tail frontend + admin + backend logs (Ctrl-C to stop)
```

After the stack is up, run the E2E tests against it:

```bash
cd repos/trade-imports-ins-tests
npm run test:docker-compose             # every domain
npm run test:docker-compose:animals     # one domain: animals, animals-admin, ins or plants
```

### Frontend / admin changes

Node source changes are picked up automatically via webpack `--watch`. No action needed.

### Backend changes (Java)

The backend does **not** hot-reload — recreate the container after changing Java source:

```bash
tim docker bounce-backend
```

### Switching between source and image builds

`tim docker dev` builds from source and `tim docker up` runs published
images. To go back to published images, run `tim docker up`.

---

## Option 3 — One service natively, the rest in the stack

Exclude the service you're developing from the stack and run it from source.
Valid exclude labels: `frontend`, `backend`, `admin`, `ins-frontend`,
`routing-proxy`, `ins-backend`, `plants-frontend`, `plants-backend`, `stub`, `defra-id-stub`,
`reference-data`, `address-book`, `gateway` (the authoritative list is the
`services` array at the top of `scripts/stack/run-stack.sh`).

```bash
# Terminal 1 — everything except the backend
tim docker up -e backend

# Terminal 2 — backend from source, with the local Spring profile
tim start backend
```

The same pattern works for the Node services, for example:

```bash
tim docker up -e frontend
TRADE_IMPORTS_ANIMALS_BACKEND_URL=http://localhost:8085 tim start frontend
```

`tim start` also takes `admin`, `gateway`, `address-book`, `ins-backend`,
`plants-frontend` and `plants-backend`. Run `tim start --help` to see the
port each one uses.

For infrastructure only (MongoDB, Redis, Floci, cdp-uploader, stubs),
limit the stack to the relevant profiles:

```bash
tim docker up --profile database --profile infrastructure --profile stubs
```

---

## The database

The mongo init scripts are staged by `run-stack.sh` from their owning repos:
the workspace owns the replica-set init and the backend owns the Floci
provisioning (`compose/start-floci.sh`).

Nothing wipes the database between test runs. Every E2E spec creates the
state it asserts on through the backend API, scoped to that run, so the suite
passes against a database still holding earlier runs' records. To start from
empty, take the stack down (`tim docker down` removes the volumes) and
bring it back up. Wiping the volume under a running stack drops
the indexes each service builds once at startup, and nothing rebuilds them.

---

## Auth (Defra ID stub)

All environments use `defradigital/trade-imports-defra-id-stub` as a local OIDC provider. It runs on port 3007 and accepts any username with a configurable password (set via `AUTH_PASSWORD` — see the stub image docs for the default).

The OIDC discovery URL is:

```
http://localhost:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
```

---

## Ports summary

| Service | Port |
|---------|------|
| Animals frontend | 3000 |
| Admin | 3001 |
| INS frontend | 3002 |
| Plants frontend | 3003 |
| Routing proxy | 3004 |
| Defra ID stub | 3007 |
| Plants prototype | 3103 |
| Animals backend | 8085 |
| Reference data | 8086 |
| Trade imports stub | 8087 |
| Dynamics gateway | 8088 |
| Address book | 8089 |
| INS backend | 8090 |
| Plants backend | 8091 |
| Trade imports stub — STS simulator (EUDPA-390, dev/local only) | 8098 |
| cdp-uploader | 7337 |
| Floci | 4566 |
| MongoDB | 27017 |
| Redis | 6379 |
