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

- **Sign-in is plants-frontend's, unchanged.** `AUTH_ENABLED=true` and every
  `DEFRA_ID_*` setting mirror plants-frontend's dev entry, pointed at the same
  Defra ID stub. Only the two redirect URLs differ, naming the prototype's
  own host (`https://trade-imports-plants-prototype.dev.cdp-int.defra.cloud/auth/sign-in-oidc`
  and `/auth/sign-out-oidc`).
- **Nothing to register with the Defra ID stub.** The stub
  (`trade-imports-defra-id-stub`, `src/routes/open-id.js`) only checks that
  `client_id`, `serviceId` and `client_secret` are non-empty and that the
  redirect URLs are valid URLs; it keeps no list of registered clients or
  redirect URLs. The client id only chooses which set of stub users it offers
  (its S3 data is filed by client id, falling back to its built-in users), so
  the prototype reuses plants-frontend's `DEFRA_ID_CLIENT_ID` and
  `DEFRA_ID_SERVICE_ID` and gets the same users.
- **`SESSION_CACHE_ENGINE=memory`, set explicitly.** The prototype's own code
  already defaults to it (`src/prototype-defaults.js`), but only when the
  variable isn't already set, and plants-frontend's production default is
  Redis. The prototype runs one instance with no Redis.
- **No `STUB_MODE`.** Production ignores it for sign-in, exactly as in
  plants-frontend, and the prototype's data services serve stub data in
  production regardless (`isStubDataMode` in `mode.js`).
- **No backend, reference data or address book URLs.** The data is always
  stubbed, so the prototype never calls those services.
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

**`DEFRA_ID_CLIENT_SECRET`** — one per environment, via the CDP portal, as
plants-frontend has. Sign-in sends it on every token request. The Defra ID
stub only checks that it is present, so plants-frontend's value or any other
non-empty value works; without one the app falls back to `config.js`'s public
`test-secret` placeholder.

No other secret is needed: with no backend, reference data, address book or
Redis config, their secrets (such as `REDIS_PASSWORD`) are not needed either.

`cdp-app-config` itself has no secrets-list file to mirror: it explicitly
never stores secrets (its README says so) — they're entered directly into
the CDP portal instead.

## Open questions (from PLAN.md — Sam decides, not drafted here)

1. **Who can reach it?** Sign-in now goes through the Defra ID stub, as
   plants-frontend's does, but the stub lets anyone who reaches it pick a
   test user. Is CDP's internal-only frontend zone enough?
2. **Which environment, and does every merge deploy?** This draft targets
   `dev` — the lowest tier plants-frontend has real config for — but Sam
   hasn't chosen, and hasn't decided whether every `main` merge should
   trigger a deploy or whether it's deployed on demand.
