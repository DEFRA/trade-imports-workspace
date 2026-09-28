# cdp-app-config draft: trade-imports-plants-prototype, dev

Draft only. No AI writes to `cdp-app-config` — Sam reviews this and commits
the real entry himself. Every value below is cross-checked against
`repos/trade-imports-plants-prototype/src/config/config.js` and
`src/plugins/auth.js` as read at workspace HEAD `27ec04a2`
(`feat/NO_JIRA-designer-prototyping`), plus `assess-runtime-and-fidelity.md`
section 1 for the reasoning already done on this.

The premise (from `plan.md` D9): the prototype runs standalone on `npm run
dev` with no CDP dependency, but it also deploys to CDP dev from its own
`Dockerfile`, and that deployed copy must actually work — stub data, sign-in
through the Defra ID stub, every set. `NODE_ENV=production` changes two
things at once in this codebase that matter here:

- `isStubDataMode()` (`src/server/common/services/mode.js`) is
  `stubMode || isProduction` — **always true in production**, regardless of
  `STUB_MODE`. So the records store, the address book, countries, ports and
  every stand-in service always serve stub data once deployed. This also
  means `TRADE_IMPORTS_PLANTS_BACKEND_URL` and `TRADE_IMPORTS_REFERENCE_DATA_URL`
  are never actually called in production — their `config.js` defaults
  (`localhost:8091`, `localhost:8086`) are harmless dead values and do not
  need setting in `cdp-app-config`.
- `isStubMode()` is `stubMode && !isProduction` — **always false in
  production**, regardless of `STUB_MODE`. So sign-in always goes through the
  real Defra ID OIDC exchange once deployed, never the prototype's own
  locally-signed session. This is the opposite of the data side, and it is
  why the `DEFRA_ID_*` variables below are load-bearing for a production
  boot, not optional.

## Env vars

| Var | Value | Reason |
|---|---|---|
| `PORT` (or the CDP service's own port field, not an env var, depending on the app-config shape) | `3103` | `config.js:58-63` defaults `PORT` to 3103 already, matching the `Dockerfile`'s `ARG PORT=3103` and its `EXPOSE`. Deliberately not plants-frontend's 3003, so the two never collide if ever run side by side. Confirm in the CDP portal that the service is registered to route to 3103, not 3003 (`assess-runtime-and-fidelity.md` §1 point 3a). |
| `NODE_ENV` | `production` | Drives every `isProduction`-gated default above. Without it the app would run as if `NODE_ENV` were unset (falls through every `is*` check to `false`), which is not a state this codebase is designed to run in on a real deployment. |
| `DEFRA_ID_OIDC_CONFIGURATION_URL` | The deployed `trade-imports-defra-id-stub`'s well-known URL for the same policy, at that stub's own CDP dev hostname — e.g. `https://<the deployed stub's dev host>/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration` | `config.js:191-196` defaults this to `http://localhost:3007/...`, which does not resolve from CDP. `docs/repos/trade-imports-defra-id-stub.md` confirms every other trade-imports frontend (animals, animals-admin, ins) already points its own `DEFRA_ID_*` config at this same stub in exactly this way — **copy the exact value from one of those frontends' own `cdp-app-config` entries for the dev environment** rather than guessing the hostname; they all share one deployed stub instance. |
| `DEFRA_ID_CLIENT_ID` | Same value the other trade-imports frontends use against this stub in dev | `config.js:198-204`, default `test-client-id`. The stub's README (`docs/repos/trade-imports-defra-id-stub.md`) describes CRN/password login against mock data with no real Azure app-registration check, and the prototype's own `README.md` "AUTHENTICATION" section shows one shared example value already used for local runs. There is no evidence this needs a prototype-specific registration; reuse what the other CDP-deployed frontends already have rather than asking the identity team for a new one, unless Sam knows otherwise. |
| `DEFRA_ID_CLIENT_SECRET` | Same source as `DEFRA_ID_CLIENT_ID`, as a real secret in `cdp-app-config`'s secrets store | `config.js:205-211`, `sensitive: true`. Never the `test-secret` default in a deployed environment. |
| `DEFRA_ID_SERVICE_ID` | `trade-imports-plants-prototype` (the `config.js` default, no override needed) | `config.js:212-217` already defaults this to the prototype's own name, distinct from the real plants-frontend's service id. Recommend keeping it distinct rather than copying plants-frontend's — it is what lets prototype sign-ins be told apart in the stub's own data/logs if that ever matters, and nothing in the stub's contract (per its docs page) says the service id must match a specific registered value. Set explicitly in `cdp-app-config` anyway, for parity with how the other frontends set theirs, rather than relying on the convict default surviving future code changes. |
| `DEFRA_ID_POLICY` | `b2c_1a_cui_cpdev_signupsigninsfi` | `config.js:218-223` already defaults to this — it is the "`signupsigninsfi`" policy the whole `trade-imports-defra-id-stub` exists to support (`docs/repos/trade-imports-defra-id-stub.md` "Purpose"). Set it explicitly in `cdp-app-config` for the same parity reason as the service id, and as a guard if a future environment ever uses a differently-suffixed B2C policy name. |
| `DEFRA_ID_REDIRECT_URL` | `https://<the prototype's own deployed dev host>/auth/sign-in-oidc` | `config.js:224-229` defaults to `http://localhost:3103/auth/sign-in-oidc` — the doc comment there says in terms this is "this prototype's own port (3103), not plants-frontend's 3003, so a local prototype signs back in to itself." That is correct for a laptop, but on CDP dev "itself" is the deployed host, not localhost, so this **must** be overridden or sign-in loops back to nothing. |
| `DEFRA_ID_SIGN_OUT_REDIRECT_URL` | `https://<the prototype's own deployed dev host>/auth/sign-out-oidc` | Same reasoning as the row above (`config.js:230-235`). |
| `TRADE_IMPORTS_INS_FRONTEND_URL` | Decide deliberately; see reason | `config.js:373-380` — doc comment: "Browser-visible — used to build deep links the trader's own browser navigates to." Defaults to `http://localhost:3002`, which is dead on CDP dev (`assess-runtime-and-fidelity.md` §1 point 6 flags this as the same "Address book" link that is dead when the prototype runs standalone). Two real choices, not a default to leave unexamined: (a) point it at the deployed `trade-imports-ins-frontend`'s dev URL, so the link is live and shows real (different) INS data — matches the real service's behaviour; or (b) leave it unset/default so the link is visibly dead rather than confusingly pointing at unrelated real data. This assessment does not rule between them; it is a decision for whoever owns the deploy, flagged here so it is not made by accident. |
| `SESSION_CACHE_ENGINE` | `memory` (recommended over the `isProduction`-driven default of `redis`) | `config.js:141-148`. Every piece of state this app holds once deployed — the records store, every stand-in service's fake store, the example-data overlay — is **per-process, in-memory, with no persistence layer at all** (`src/server/prototype-support/persist.js` only turns persistence on for `NODE_ENV=development`). Setting the session cache to `redis` would only make *sessions* survive a restart or spread across instances; it would not fix the records themselves being per-instance, so it buys real infrastructure (a Redis add-on, `REDIS_HOST`/`REDIS_USERNAME`/`REDIS_PASSWORD`/`REDIS_TLS` per `config.js:282-318`) for a problem it only half-solves. `memory` needs no such add-on and is honest about what the app actually is: a single-process demo server. If the CDP app-config template insists on the production default staying `redis` for house consistency, that is a legitimate override to make instead — just do it with eyes open to the point below, because it does not remove the need for one instance. |
| Instance count | `1` (mandatory, whichever `SESSION_CACHE_ENGINE` is chosen) | Same reasoning as the row above: with more than one instance, a request can land on a different instance from the one that holds a designer's or researcher's in-memory records, and dashboards or a resumed journey would differ between requests (`assess-runtime-and-fidelity.md` §1 point 2, "Single instance only"). `SESSION_CACHE_ENGINE=redis` would only stop *sign-ins* dropping across instances; it does nothing for the records themselves. There is no configuration of this app today that supports more than one instance correctly. |

## Also found while cross-checking (not in the original list, but load-bearing)

- **`SESSION_COOKIE_PASSWORD`**, as a real secret in `cdp-app-config`'s
  secrets store. `config.js:169-175` defaults it to the literal string
  `replace-with-at-least-32-chars-long-string-1234567890`, `sensitive: true`.
  `src/plugins/auth.js` passes this straight to both the Bell OAuth cookie
  and the `yar` session cookie (`password: config.get('session.cookie.password')`,
  lines 62 and 103) — Hapi's cookie encryption key. Booting production with
  the placeholder string would mean every deployed instance (and anyone who
  has read this file) shares the same publicly-known cookie-signing secret.
  Not in the brief's own list, but it is exactly the kind of thing "the
  patched config.js and auth plugin need for a production boot" — flagging it
  rather than leaving it to be found later.

## Confirmed not needed

- `TRADE_IMPORTS_PLANTS_BACKEND_URL`, `TRADE_IMPORTS_REFERENCE_DATA_URL` — see
  the `isStubDataMode()` reasoning above; these are never read from in a
  production boot of this repo.
- `DEFRA_ID_REFRESH_TOKENS` — defaults to `true` (`config.js:255-260`),
  already what a real deployment wants.
- `DEFRA_ID_SIGN_OUT_HOSTNAME_REWRITE_ENABLED` — defaults to `!isProduction`,
  i.e. already off in production (`config.js:236-242`), which is correct:
  the hostname rewrite exists for local/Docker-network hostnames
  (`host.docker.internal`, `trade-imports-defra-id-stub`) that do not apply
  once deployed.
- `STUB_MODE` — irrelevant in production either way, since
  `isStubDataMode()`/`isStubMode()` both hard-code the production case
  regardless of this flag (see the two bullets at the top of this file).
  Leaving it unset is fine; setting it to `true` changes nothing in
  production.
