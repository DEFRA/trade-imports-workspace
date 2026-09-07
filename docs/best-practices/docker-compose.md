# Docker Compose — Best Practices

All compose definitions live in the workspace stack — `docker/stack/` at the
workspace root, driven by the `scripts/stack/` wrappers (`run-stack.sh`,
`run-stack.sh -d`, `stop-stack.sh`, `bounce-backend.sh`) or the
`make docker-compose-*` targets that delegate to them. No repo carries its own
`compose.yml`.

Init scripts are owned by the service that needs them and staged into the
stack by `scripts/stack/lib/init-scripts.sh`: the backend owns the Floci
provisioning (`compose/start-floci.sh`) and the workspace owns the mongo
replica-set init.

The patterns below apply to the stack's overlay files — they're not language-specific.

---

## 1. Env vars must support overrides via `${VAR:-default}`

Hardcoded URLs and hosts in `compose.yml` mean a developer can't point one service at a different cluster member or a remote endpoint without editing the file. Use `${VAR:-default}` so the default works out of the box and an env var (or a sibling `.env` file) overrides it.

```yaml
# Wrong — single-host hardcoded
environment:
  CDP_UPLOADER_URL: http://cdp-uploader:7337
  TRADE_IMPORTS_ANIMALS_BACKEND_BASE_URL: http://host.docker.internal:8085

# Correct — defaults plus override hook
environment:
  CDP_UPLOADER_URL: ${CDP_UPLOADER_URL:-http://cdp-uploader:7337}
  TRADE_IMPORTS_ANIMALS_BACKEND_BASE_URL: ${TRADE_IMPORTS_ANIMALS_BACKEND_BASE_URL:-http://host.docker.internal:8085}
```

Apply this to **every** URL and host. Apply it to credentials too, with empty defaults rather than baked-in test values: `AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:-}` (empty string disables, real value enables).

---

## 2. Healthchecks for slow-starting dependencies

A `depends_on: cdp-uploader` only waits for the container to *exist*, not for the service inside to be ready. Services that take more than ~5 seconds to start (Mongo, Floci, cdp-uploader, OAuth mocks) need a `healthcheck` so dependents can wait on `condition: service_healthy`.

```yaml
services:
  cdp-uploader:
    image: defradigital/cdp-uploader:latest
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:7337/health"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 30s    # grace period before failures count

  backend:
    depends_on:
      cdp-uploader:
        condition: service_healthy   # wait for the healthcheck to pass
      mongo:
        condition: service_healthy
```

`start_period` is critical for slow images — it suppresses failures during the first N seconds so a slow start doesn't tip the container into `unhealthy` before it's had a chance.

If the image doesn't ship `wget`/`curl`, fall back to a TCP check: `nc -z localhost 7337`. If neither is available, file a ticket for the upstream image rather than skipping the healthcheck.

---

## 3. Provisioning scripts must be idempotent

Bucket creation, queue creation, and similar one-shot setup commands fail on second run if they're not idempotent. The whole compose stack then refuses to start cleanly after `make docker-compose-up` was already run once.

```bash
# Wrong — fails on second run because the bucket already exists
aws --endpoint-url=http://localhost:4566 s3 mb s3://my-bucket

# Correct — succeeds on first run, no-ops on subsequent runs
aws --endpoint-url=http://localhost:4566 s3 mb s3://my-bucket || true
```

For SQS FIFO queues with attribute changes, `|| true` masks legitimate attribute mismatches. Document the assumption in a comment near the line:

```bash
# `|| true` because the FIFO queue may already exist from a previous run.
# If you change attributes, run `make docker-compose-down` first to recreate.
aws --endpoint-url=http://localhost:4566 sqs create-queue \
    --queue-name scan-results.fifo \
    --attributes FifoQueue=true,ContentBasedDeduplication=true || true
```

Also add an upfront `command -v` check for any non-standard binary (`awslocal`, `mongosh`) so a missing tool fails with a clear message rather than silently:

```bash
#!/bin/bash
set -euo pipefail
command -v awslocal >/dev/null 2>&1 || {
    echo "awslocal not found — install with: pip install awscli-local"
    exit 1
}
```

---

## 4. Image pinning — pin where it matters, document where it doesn't

`:latest` is convenient and unsafe — upstream breaking changes pull silently. Pinning every image is also overhead: in development, `mongo:7` (a major-version float) is a reasonable middle ground; in production, exact digests are the right answer.

| Stack tier | Pinning |
|------------|---------|
| Production deploy manifests | Exact digest — `mongo@sha256:abc...` |
| Local dev compose | Major-version float — `mongo:7` |
| Third-party / no stable releases (e.g. `cdp-uploader:latest`, `floci/floci:latest`) | Document the trade-off in a `# tracked: …` comment so reviewers don't churn on it |

```yaml
services:
  cdp-uploader:
    # tracked-by: EUDPA-XX — pin via digest once cdp-uploader publishes one
    image: defradigital/cdp-uploader:latest
```

If the team has decided `:latest` is acceptable for a service, the comment makes the decision visible. Without the comment, every code review re-litigates the same point.

---

## 5. Network port surface — narrow what you publish

Publish only the ports the host needs to talk to; let services-talking-to-services use the compose network directly.

```yaml
# Wide — LocalStack legacy: each AWS service had its own port (S3=4572, SQS=4576, …)
# so teams exposed the whole range. Floci multiplexes everything through 4566 — avoid this.
ports:
  - "4510-4559:4510-4559"

# Narrow — only the ports the dev tooling needs are exposed
ports:
  - "4566:4566"   # Floci edge (also the LocalStack-compat port)
```

Backend services in the same compose network can still reach Floci on `http://floci:4566` regardless of which ports are published to the host.

---

## 6. Logs and graceful shutdown

`make docker-logs` tails frontend + backend + admin logs together. Two compose patterns help keep that experience usable:

- **Pin a single log driver across services** (`logging: driver: json-file`) so log rotation behaves predictably.
- **Set `stop_grace_period: 30s`** on services that flush buffers on shutdown (Pino in Node, logback in Java) — `Ctrl-C` otherwise truncates the last few seconds of logs.

```yaml
services:
  backend:
    stop_grace_period: 30s
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: "3"
```

---

## 7. Common mistakes

**1. `depends_on` without a condition**
```yaml
# Service starts the moment cdp-uploader's container exists — too early
depends_on:
  - cdp-uploader

# Service waits for the healthcheck to pass
depends_on:
  cdp-uploader:
    condition: service_healthy
```

**2. Bypassing the wrappers with hand-assembled `-f` chains**
The stack is split across overlay files under `docker/stack/` and the wrappers
compose them (plus profile flags and the staged init scripts) in one place.
A hand-built `docker compose -f docker/stack/compose.yml ...` chain silently
drops overlays or staging. Always go through `scripts/stack/` (or the
`make docker-compose-*` targets).

**3. Using `latest` and `:1.2` versions side-by-side**
A mix produces unpredictable startup ordering on first pull. Pick one strategy per stack tier (see §4).

**4. Hard-coding credentials with non-empty defaults**
```yaml
# Wrong — leaks fake credentials into images and logs
AWS_SECRET_ACCESS_KEY: test

# Correct — empty default, real env var when needed
AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:-}
```

**5. Mounting source as a volume without rebuilding when dependencies change**
`make docker-compose-dev` mounts source for hot-reload, but adding an `npm install` dependency requires `--build`. Document this in the repo's CLAUDE.md so agents don't chase phantom errors.
