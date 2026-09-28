# cdp-app-config draft: trade-imports-plants-prototype, dev

Draft only. No AI writes to `cdp-app-config` — Sam reviews this and commits
the real entry himself. Every value below is cross-checked against
`repos/trade-imports-plants-prototype/src/config/config.js`,
`src/plugins/auth.js` and `src/server/common/services/mode.js`.

**Superseded decision.** An earlier version of this draft assumed the
deployed prototype had to sign in through a deployed `trade-imports-defra-id-stub`,
because `isStubMode()` used to hard-code sign-in to Defra ID in production
regardless of `STUB_MODE`. Sam has since decided the opposite: the deployed
prototype signs in exactly like it does locally with `npm run dev` — stub
sign-in, no identity provider — and `isStubMode()` (`src/server/common/services/mode.js`)
now honours `STUB_MODE` in production too. He accepts this leaves the
deployed prototype temporarily unprotected: anyone who reaches the URL is
signed in automatically, until CDP puts its own auth in front of the route,
or a later change sets `STUB_MODE=false` to restore plants-frontend's own
Defra ID sign-in. Do not add basic auth or any other stand-in protection —
that is a deliberate, accepted gap, not an oversight to patch around here.

`isStubDataMode()` (`src/server/common/services/mode.js`) is unaffected by
this change: it is `stubMode || isProduction`, so it was already always
true in production, and stays that way. The records store, the address
book, countries, ports and every stand-in service always serve stub data
once deployed, with no backend behind it.

## Env vars

| Var | Value | Reason |
|---|---|---|
| `PORT` (or the CDP service's own port field, not an env var, depending on the app-config shape) | `3103` | `config.js` defaults `PORT` to 3103 already, matching the `Dockerfile`'s `ARG PORT=3103` and its `EXPOSE`. Deliberately not plants-frontend's 3003, so the two never collide if ever run side by side. |
| `NODE_ENV` | `production` | Drives every `isProduction`-gated default. Without it the app would run as if `NODE_ENV` were unset, which is not a state this codebase is designed to run in on a real deployment. |
| `SESSION_CACHE_ENGINE` | `memory` | `prototype-defaults.js` already defaults this to `memory` unless something else sets it, overriding plants-frontend's own `isProduction`-driven default of `redis`. Every piece of state this app holds once deployed — the records store, every stand-in service's fake store, the example-data overlay — is per-process, in-memory, with no persistence layer at all, so a Redis add-on would only make *sessions* survive a restart; it would not fix the records themselves being per-instance. Set it explicitly anyway, rather than relying on the code default surviving a future change. |
| `STUB_MODE` | `true` (optional — this is already the default) | `prototype-defaults.js` sets `STUB_MODE=true` unless it is already set, so the deployed prototype signs in with stub sign-in and serves stub data with no further configuration. Setting it explicitly here is a documentation choice, not a functional requirement. Set it to `false` instead only when a later change restores plants-frontend's own Defra ID sign-in and the `DEFRA_ID_*` variables that go with it. |
| `TRADE_IMPORTS_INS_FRONTEND_URL` | Not set — the prototype ignores it | Sam's ruling: the header's "Address book" link must never go to a real Import Notification Service address book, in CDP or anywhere else. `config.js` no longer binds this variable to anything, so setting it here would have no effect; the link's target defaults to a dead `.invalid` address instead. Not load-bearing for sign-in or the journey itself. |
| Instance count | `1` (mandatory) | With more than one instance, a request can land on a different instance from the one that holds a designer's or researcher's in-memory records, and dashboards or a resumed journey would differ between requests. There is no configuration of this app today that supports more than one instance correctly. |

## Not needed

- **No `DEFRA_ID_*` variables.** Sign-in is stub sign-in by default in every
  environment, including production. These only become relevant again if
  `STUB_MODE=false` is chosen later to restore Defra ID sign-in.
- **No `TRADE_IMPORTS_PLANTS_BACKEND_URL`, `TRADE_IMPORTS_REFERENCE_DATA_URL`.**
  `isStubDataMode()` is always true in production, so these are never read
  from in a production boot of this repo.
- **No address-book service URL.** The stub address book serves everything;
  there is no real address-book dependency to point at.

## Secrets

- **`SESSION_COOKIE_PASSWORD`**, as a real secret in `cdp-app-config`'s
  secrets store. `config.js` defaults it to the literal string
  `replace-with-at-least-32-chars-long-string-1234567890`, `sensitive: true`.
  `src/plugins/auth.js` passes this straight to the `yar` session cookie —
  Hapi's cookie encryption key. Booting production with the placeholder
  string would mean every deployed instance (and anyone who has read this
  file) shares the same publicly-known cookie-signing secret. This is the
  one secret this deployment needs.
