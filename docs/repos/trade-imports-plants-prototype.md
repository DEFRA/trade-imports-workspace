# trade-imports-plants-prototype

**Repo:** DEFRA/trade-imports-plants-prototype

## Purpose

A high-fidelity, designer-facing copy of `trade-imports-plants-frontend`, for making and trialling design changes to the high-risk plants journey before any of it is built for real. It runs the real journey engine and real GOV.UK components — work on one page and the next page is already there, because it is the real one — but needs no backend, no reference data, no address book and no Docker stack: every service is stubbed and the example notifications are made by replaying real pages.

Designers work on it from a Claude Code session opened at this workspace root (`~/git/defra/trade-imports-workspace`), never from a session rooted in the prototype's own folder. The agent layer is the workspace's `prototype` skill (`.claude/skills/prototype/`), which reads the real `trade-imports-plants-frontend`, its recipes, the owning backends' contracts, `openspec/` and `docs/best-practices/` so a designer's request comes out in house style without them having to ask. See the routing row in this file's [`CLAUDE.md`](../../CLAUDE.md).

## Responsibilities

Owns:
- Several **sets** under `src/server/app/sets/<id>/`: `high-risk-plants` is the real journey (synced weekly from upstream), `sample-journey` a placeholder journey the prototype keeps to prove it can show more than one journey, and every other set is a designer's own **design release** — a snapshot copy of `high-risk-plants` (or another release) that the designer changes freely. See `docs/designers/design-releases.md`.
- A **chooser** at `http://localhost:3103/`, listing every set with a tag (real journey, working release, research, frozen, placeholder), sitting behind sign-in like every other page.
- **Prototype-owned services** in `src/server/app/services/<name>/` (today `transporters`, `templates`, `ins-address-book`, `notification-search`), in the same `index.js`/`client.js`/`stub.js` shape as the real services, for something the real service cannot do yet. `npm run designer:service` makes, lists and retires them. See `docs/designers/services-and-dashboards.md`.
- `overrides.json`: says which files are the prototype's own (`ours`, e.g. `scripts/designer/**`, `docs/designers/**`, the prototype-owned service folders, `AGENTS.md`/`CLAUDE.md`/`PROTOTYPE.md`), which upstream files it drops entirely (`deleted`, e.g. `.mcp.json`, the sonar integration, upstream's own CI workflows), and which files are `patched` (kept in step with upstream but carrying a prototype-only change, e.g. `src/index.js` loading `prototype-defaults.js` first).

Does NOT own:
- Anything else under `src/server/app/`: the real journey's engine, flow, model and shared platform code belongs to `trade-imports-plants-frontend` and arrives unmodified by the weekly sync. It is not part of the Docker stack (`dockerStack: null` in `repos.json`), so no other stack service depends on it, and it is not a system of record for anything real — every notification, transporter, template and address it holds is prototype-only data.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-plants-frontend | `upstream` remote, declared by `"upstream": "trade-imports-plants-frontend"` in `repos.json` and set up by `tim workspace setup`, `scripts/setup.sh` and `tim prototype setup`: it fetches `main` only, carries no tags and cannot be pushed to (push URL `DISABLED`). `repos.json`'s `workspaceBranchSync: false` keeps `tim workspace reset\|branch\|update` from touching this repo unless named. Synced with `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run sync:upstream` | Weekly source sync: merges `upstream/main`, applies `overrides.json`'s rules (deleted paths stay deleted, `ours` paths always win, everything else merges normally), runs CI's checks, and opens a PR only with `--push` |
| None | trade-imports-defra-id-stub, Defra ID | — | Not used, locally or deployed: every run signs in with stub sign-in (`STUB_MODE`), a locally signed session with no identity provider behind it |
| None | trade-imports-ins-frontend | — | The header's "Address book" link is deliberately dead everywhere. The address book belongs to the Import Notification Service, which the prototype does not include; the link's base URL is fixed at `https://address-book.invalid` with no env binding, so `TRADE_IMPORTS_INS_FRONTEND_URL` is ignored and no setting, locally or on CDP, can point it at a real one |
| None | trade-imports-plants-backend, trade-imports-reference-data | — | Both are stubbed (`isStubDataMode()`); the prototype has no backend behind it at all, in dev or on CDP |

## Stack

- **Runtime:** Node.js >=24, npm pinned via `packageManager` (`npm@11.6.2`) — install only with `tim workspace install --repo trade-imports-plants-prototype`, never a bare `npm install`/`npm ci`.
- **Web framework:** Hapi (Nunjucks via Vision, Yar sessions, Crumb CSRF), govuk-frontend, the same build toolchain (webpack, Sass) as `trade-imports-plants-frontend`.
- **Port:** 3103 (`src/config/config.js`; `PORT` env var), its real twin's (`trade-imports-plants-frontend`, 3003) plus 100, so both can run side by side on one machine. `DEFRA_ID_REDIRECT_URL` and `DEFRA_ID_SIGN_OUT_REDIRECT_URL` default to `http://localhost:3103/auth/...`, not 3003; they only matter if someone sets `STUB_MODE=false`, which no supported run does.

## Stub sign-in and stub data

`src/server/common/services/mode.js` exports two switches:

- `isStubMode()` — true when `STUB_MODE=true`, **production included**. Governs sign-in: a stub run hands any caller a locally signed session with no Defra ID round trip. Honouring `STUB_MODE` in production is a deliberate prototype-only decision, so the deployed prototype signs in exactly the way `npm run dev` does. Setting `STUB_MODE=false` would restore plants-frontend's own Defra ID sign-in, but no supported run does that.
- `isStubDataMode()` — true when `STUB_MODE=true` **or** the app is running in production. Governs data: the records store, address book, countries and ports all serve stub data. The production half is a backstop: the prototype has no backend, address book or reference data behind it anywhere, so its data stays stubbed even if `STUB_MODE` were turned off.

`src/prototype-defaults.js` sets `STUB_MODE=true` and `SESSION_CACHE_ENGINE=memory` before `config.js` reads `process.env`, unless either is already set — every way of starting the app (`npm start`, `npm run dev`, the Docker `CMD`, the FIT web server) imports it first. `PORT`, `STUB_MODE` and `SESSION_CACHE_ENGINE` still win when set.

## How to run

**Standalone, no Docker stack, ever** — the stack is never needed to see a change:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run dev
# or, for a clean-slate run that always starts from the seeded examples:
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:fresh
```

It runs on stubs alone, with no backend, Defra ID, Defra ID stub, Redis or reference data. Then open `http://localhost:3103/`. Sign-in is on by default (`AUTH_ENABLED` unset) and the chooser and every set sit behind it, exactly as the real service's pages do, but stub sign-in signs you in straight away with no password. `/auth/stub-sign-in?organisationId=<id>` signs in as another organisation.

A design release, once saved on its own `design/<set>-<slug>` branch, is data that lives locally at `.cache/designer/data/` (gitignored) — it survives a restart on the same machine and resets per-release via "Reset this prototype's data" on the chooser.

## Deploying (CDP dev)

The prototype has its own multi-stage `Dockerfile` (development / production_build / production targets, `defradigital/node[-development]` parent images, `curl` added for the platform healthcheck), separate from the real frontend's. A CDP dev deploy needs:

- The image built and run with `NODE_ENV=production`. `STUB_MODE` stays on (the `prototype-defaults.js` default), so the deployed prototype uses stub sign-in exactly like `npm run dev`: no `DEFRA_ID_*` settings, no Defra ID and no `trade-imports-defra-id-stub`. The same `/auth/stub-sign-in` and `/auth/sign-out` paths work on its address.
- `SESSION_CACHE_ENGINE=memory` and a single running instance — the prototype was built for one instance with no Redis behind it, unlike the real frontend's production default. `SESSION_COOKIE_PASSWORD` is the only secret.
- Nothing for the header's "Address book" link: it stays dead on CDP as everywhere else, and `TRADE_IMPORTS_INS_FRONTEND_URL` is ignored.

## Designer work vs. hand-off

Designer changes are made on a `design/<set>-<slug>` branch (exempt from the workspace's cross-repo branch-naming rule — see `CLAUDE.md` rule 2 — because this repo has no Docker stack image to match against). A maintainer's own change to this repo's contract (scripts, rules, docs) uses `chore/NO_JIRA-<slug>` or `chore/EUDPA-N-<slug>` instead, following the workspace's own branch-naming rule.

When a change is ready to become real, "hand this to the real team" raises a Jira story from the prototype (`tim jira create`, dry run first) and routes the actual build into `trade-imports-plants-frontend` on one real `feat/EUDPA-N-<slug>` branch — never inside this repo. See the `prototype` skill's `references/hand-off.md` and `references/build-it-for-real.md`.

## Designer docs

Start at `docs/designers/README.md` inside the repo (`PROTOTYPE.md` is the top-level pointer to it) — `your-first-hour.md`, `where-changes-go.md`, `design-releases.md`, `services-and-dashboards.md`, `example-data.md`, `research-sessions.md`, `sharing-and-handing-off.md`, `checks-and-errors.md`, `wording-and-welsh.md`, `porting-old-pages.md`, `working-through-notes.md`, `glossary.md`, plus `docs/designers/gov-uk/` and `docs/designers/recipes/`. The workspace's own `docs/best-practices/` (`gds/`, `node/`) is the source of truth where the two overlap; the prototype's copies keep only what's specific to it.
