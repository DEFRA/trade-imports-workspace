# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-333
**All repos in scope:** trade-imports-animals-frontend, trade-imports-animals-tests, trade-imports-ins-frontend, trade-imports-workspace
**PR:** #42 | **Commit:** fd4ebd3c

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Cross-frontend browser-visible URL env var (`TRADE_IMPORTS_{peer}_FRONTEND_URL`) | animals-frontend declares `tradeImportsInsFrontend.baseUrl` bound to `TRADE_IMPORTS_INS_FRONTEND_URL`; ins-frontend declares `tradeImportsAnimalsFrontend.baseUrl` bound to `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` | Compose sets both — `TRADE_IMPORTS_INS_FRONTEND_URL=http://localhost:3002` on `animals-frontend` and `TRADE_IMPORTS_ANIMALS_FRONTEND_URL=http://localhost:3000` on `ins-frontend`, each with an inline comment flagging the "browser-visible, not host.docker.internal" rule | CONSISTENT — both symmetric env vars present, both use `localhost` per the ticket's browser-vs-container rule |
| INS localhost cookie/session name split | ins-frontend convict defaults `auth.cookieName='ins-sid'` and `session.cache.name='ins-session'` in dev; animals-tests fixture picks `ins-sid` for INS on `localhost:3002` | Compose sets `SESSION_CACHE_NAME=ins-session` and `AUTH_SESSION_COOKIE_NAME=ins-sid` on the `ins-frontend` service with the comment "localhost cookies are host-scoped (not port-scoped)" | CONSISTENT — all three sides (INS default, workspace compose override, tests fixture) agree |
| Local-stack works end-to-end without hand-configuration (AC: "The local stack is configured so the handshake works end to end without anyone setting it up by hand") | The three convict entries would otherwise default to hardcoded fallbacks | Compose overrides make the handshake self-contained: animals reads INS's origin from the env, INS reads animals' origin from the env, both point at `localhost:3000/3002` respectively | CONSISTENT with the AC |

## Missing Changes

*None identified.*

## Unique Changes

- **`.github/workflows/e2e-tests.yml` — workspace-ref fallback** (28 lines added). Uses `gh api repos/.../git/ref/heads/<branch>` to detect whether the caller's branch exists in the workspace repo, falls back to `main` if not. This replaces the previous single-line ternary that keyed off `inputs.branch` presence. Not directly ticket-related, but a workflow-quality improvement that reduces cross-repo branch-name friction when a caller PR branch happens not to exist in `trade-imports-workspace`. Worth calling out in review as scope-adjacent; it does not violate the workspace's "same branch name across every affected repo" rule because the fallback is only taken when no matching branch exists in the workspace (i.e. the caller is not making workspace changes).
- **Comment lines in `frontend.compose.yml`** explaining the localhost-vs-host.docker.internal split — these are documentation only, referencing `docker/stack/AGENTS.md`. No code impact.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Compose overrides mirror the convict defaults on both frontends and honour the browser-visible-URL rule (`localhost`, not `host.docker.internal`); the workspace-ref fallback in the workflow is unrelated to EUDPA-333 but is a legitimate hardening.
