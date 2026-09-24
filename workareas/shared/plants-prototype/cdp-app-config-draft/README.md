# CDP config draft — trade-imports-plants-prototype

Draft only. AI never writes to CDP platform repos — Sam commits and pushes
the real thing. This is increment 6 of `../PLAN.md`.

## What was found locally

Only `cdp-app-config` is cloned, at `~/git/defra/cdp-app-config`.
`cdp-app-deployments` and `cdp-tf-svc-infra` are not (checked
`~/git/defra/cdp-app-config`, `~/git/defra/cdp/*`, and a search for every
`cdp-*` folder two levels under `~/git/defra`). So the `cdp-app-config`
files below mirror a real entry (plants-frontend's own, read directly); the
`cdp-app-deployments` and `cdp-tf-svc-infra` files are specs of the values
needed, not copies of an existing file — see the caveat at the top of each.

## Files, and where each goes

| Draft file | Goes to (in the real repo) | What it is |
|---|---|---|
| `cdp-app-config/services/trade-imports-plants-prototype/defaults.env` | `cdp-app-config/services/trade-imports-plants-prototype/defaults.env` | Applies to every environment. Identical to plants-frontend's own `defaults.env` — the standard CDP proxy settings every service gets, unrelated to stub mode. |
| `cdp-app-config/services/trade-imports-plants-prototype/dev/trade-imports-plants-prototype.env` | `cdp-app-config/services/trade-imports-plants-prototype/dev/trade-imports-plants-prototype.env` | The dev-tier config. See "Which environment" below — rename the `dev/` folder if Sam picks a different one. |
| `cdp-app-deployments/trade-imports-plants-prototype/DEPLOYMENT-SPEC.md` | Wherever `cdp-app-deployments` records instance count and CPU/memory for this service (not verified locally) | Instance count and sizing this service needs. |
| `cdp-tf-svc-infra/trade-imports-plants-prototype/SERVICE-REGISTRATION-SPEC.md` | Wherever `cdp-tf-svc-infra` registers a tenant service (not verified locally) | Zone, ECR and tenant this service needs. |

## What differs from plants-frontend, and why

- **`STUB_MODE=true`, `SESSION_CACHE_ENGINE=memory`, set explicitly.** The
  prototype's own code already defaults to these (`src/prototype-defaults.js`,
  increment 1), but only when the variable isn't already set. CDP's own
  `NODE_ENV=production` would otherwise flip the session cache to `redis`
  (see `config.js`). Setting both here means staying in stub mode doesn't
  depend on that local fallback once it's deployed.
- **No backend, reference data, address book or Defra ID config.** Stub mode
  never calls the real services those variables point at, and `config.js`
  already has safe stub defaults for all of them — dropped entirely rather
  than pointed at anything.
- **No `PORT`.** Neither does plants-frontend. CDP fixes `PORT=8085` for
  every service (`cdp-app-config/global/global_protected_fixed.env`,
  which can't be overridden) — the prototype's own default of 3103 only
  matters for an un-configured local run.
- **Exactly one instance (min = max = desired = 1), in every environment.**
  Plants-frontend's real instance count isn't visible locally (lives in
  `cdp-app-deployments`), but the prototype must run one instance regardless
  of what that number is: stub data lives in each instance's memory, so a
  second instance would split a designer's journey between them.
- **Same frontend/public zone as plants-frontend.** Same kind of app — a
  browser-facing web application — so the same zone.

## Secrets Sam must create

**`SESSION_COOKIE_PASSWORD`** — one per environment, via the CDP portal's
secrets manager. Never write a value here or in `cdp-app-config` (secrets
aren't stored there by design — see its own README). `config.js` ships a
public placeholder default so the app boots without it, but that default is
checked into the prototype's git history, so a real deployment needs its own
value or anyone could forge a session cookie against it.

No other secret is needed: dropping Defra ID, backend, reference data,
address book and Redis config also drops their secrets
(`DEFRA_ID_CLIENT_SECRET`, `REDIS_PASSWORD`) — stub mode never uses them.

`cdp-app-config` itself has no secrets-list file to mirror: it explicitly
never stores secrets (its README says so) — they're entered directly into
the CDP portal instead.

## Open questions (from PLAN.md — Sam decides, not drafted here)

1. **Who can reach it?** Stub sign-in lets anyone who reaches the URL in — is
   CDP's internal-only frontend zone enough, or does the chooser need a
   shared password too?
2. **Which environment, and does every merge deploy?** This draft targets
   `dev` — the lowest tier plants-frontend has real config for — but Sam
   hasn't chosen, and hasn't decided whether every `main` merge should
   trigger a deploy or whether it's deployed on demand.
