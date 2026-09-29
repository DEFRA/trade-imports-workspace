# GOV.UK Prototype Kit: how a deployed prototype is password-protected

Research only — no CDP/prototype changes made. Evidence is all file:line
against the installed kit at
`~/git/defra/defra-design/GB-notification-service/node_modules/govuk-prototype-kit`
(v13.20.2, per its `lib/manage-prototype-handlers.js:50-51` version lookup)
and the old prototype checkout at
`~/git/defra/trade-imports-workspace/workareas/designer-prototyping/GB-notification-service`.

## Env vars that turn it on

- `PASSWORD` — a single password. Read directly and pushed into the allowed
  list: `lib/config.js:111-113`.
- `PASSWORD_KEYS` — a comma-separated list of **other env var names**; the
  value of each named var is added as an additional allowed password:
  `lib/config.js:100` (reads `PASSWORD_KEYS`), `lib/config.js:106-109`
  (splits on `,`, trims, validates each as a legal env-var name, looks up
  `process.env[thatName]`, keeps only the ones that resolve). This is the
  kit's built-in **multiple passwords** mechanism — see below.
- `USE_AUTH` — boolean gate, defaults to `true` when unset:
  `lib/config.js:88` (`overrideOrDefault('useAuth', 'USE_AUTH', asBoolean, true)`).
- `NODE_ENV` — drives `isProduction`: `lib/config.js:47-59` (`getNodeEnv()`,
  defaults to `development`) and `lib/config.js:76` (`config.isProduction =
  getNodeEnv() === 'production'`).

**On by default only in production.** The actual gate is
`shouldUseAuth()`, `lib/authentication.js:47-59`: returns `false` unless
`useAuth` is true, and even then only applies auth when `isProduction` is
true. So in dev/test, the password screen never appears regardless of
whether `PASSWORD`/`PASSWORD_KEYS` are set. `authentication.test.js:194-213`
and `:215-243` pin this behaviour (non-production always calls `next()`
even with `useAuth` true or false).

A `.env` file is loaded before anything else via `dotenv.config()`
(`server.js:9,16`) — that's the local-dev equivalent of what a platform env
var/secret does in a real deployment.

## The flow

**Wiring.** `authentication()` (a factory returning Express middleware) is
mounted globally, deliberately early — after cookie-parser but *before*
static assets and body-parsers:
```
server.js:80  app.use(sessionUtils.getSessionMiddleware())
server.js:83  app.use(cookieParser())
server.js:85-87  // Authentication middleware must be loaded before other
                 // middleware such as static assets to prevent
                 // unauthorised access
                 app.use(require('./lib/authentication.js')())
server.js:119-120  app.use('/public', express.static(...))   // comes after
```

**No password configured but auth switched on** → every request gets a
raw HTML error page and a `console.error`, not a graceful fallback:
`lib/authentication.js:25-30` (`if (!config.getConfig().passwords.length)`)
and `:61-64` (`showNoPasswordError`, links to the kit's own docs).

**Exempt paths** (checked before the authenticated-cookie check),
`lib/authentication.js:9-15` and `:32-37`:
- `/manage-prototype/password` — the password page itself
- `/public/stylesheets/unbranded.css` — a stripped-down stylesheet just for
  that page (see below)
- one unbranded favicon path (plus a deprecated `/extension-assets` alias
  kept "for backwards compatibility")
- anything starting `/manage-prototype/dependencies`
- anything starting `/plugin-assets/govuk-prototype-kit`
- exactly `/public/stylesheets/manage-prototype.css`

No health-check route is special-cased — there isn't one to exempt in the
kit.

**Password page.** `GET /manage-prototype/password` is registered at
`lib/manage-prototype-routes.js:44` → `getPasswordHandler`,
`lib/manage-prototype-handlers.js:107-111`: renders `password.njk` with
`returnURL` (from the query string) and `error` passed straight through.
The template
(`lib/nunjucks/views/manage-prototype/password.njk`) is GOV.UK-styled
(govuk error-summary, input, button macros, `:3-5`) but deliberately
stripped down — it blanks the header/footer/before-content blocks and
force-loads sans-serif inline (`:18-34`), because it has to render standalone
before/without full GOV.UK Frontend branding. Copy: *"This is a prototype
used for research… You should only continue if you have been invited to
test this prototype."* (`:54-59`). Error state: when
`?error=wrong-password`, the page title changes to "Error:" (`:11-13`) and
shows a `govukErrorSummary` plus an inline field error under the password
input (`:42-52`, `:67-69`) — no other error states exist (there's nothing
for e.g. "too many attempts").

**Checking the password.** `POST /manage-prototype/password` →
`postPasswordHandler`, `lib/manage-prototype-handlers.js:114-138`:
- sanitises `returnURL` against open-redirect abuse — must start with `/`,
  must not start with `//`, must not be the password page itself
  (`:118-124`)
- compares the submitted password with plain `===` against every
  configured password (`:126`, `passwords.some(password =>
  submittedPassword === password)`)
- on match: sets a cookie (see below) and `res.redirect(returnURL)`
  (`:128-134`)
- on mismatch: redirects back to the password page with
  `?error=wrong-password&returnURL=...` (`:136`)

**The cookie.** Name: `authentication`. Value: not the plaintext password —
`encryptPassword(submittedPassword)`, which is a plain unsalted SHA-256 hex
digest of the password string (`lib/utils/index.js:206-210`):
```js
function encryptPassword (password) {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  return hash.digest('hex')
}
```
Because it's unsalted and keyed only by the password text, it's really a
fixed token derived from the password, not a per-session random token — two
different logins with the same password produce the same cookie value.
Cookie options (`lib/manage-prototype-handlers.js:129-133`):
`maxAge: 30 days`, `sameSite: 'None'`, `httpOnly: true`, `secure: true`.

**Re-checking on every request.**
`lib/authentication.js:78-85` (`isAuthenticated`):
```js
return passwords.some(password => req.cookies.authentication === encryptPassword(password))
```
i.e. it re-hashes every *currently configured* password on each request and
compares to the cookie. The comment above it explains the intent
(`:79-81`): *"we store the password to compare in case it is changed
server-side — changing the password should require users to re-authenticate."*
So rotating `PASSWORD`/`PASSWORD_KEYS` (e.g. a CDP secret update) instantly
invalidates every existing cookie without any extra revocation logic — this
is the natural mechanism for "we changed the password, kick everyone out."

**Sign-out.** There is no sign-out route or handler anywhere in the kit —
grepped the whole `lib/` tree for `sign-out`/`signout`/`clearCookie`, found
nothing. The only way to end a session is to let the 30-day cookie expire
or clear it client-side (not exposed as a kit feature).

## Multiple passwords

Supported natively via `PASSWORD_KEYS` (see above) — it's not "one password
plus a special multi-password mode", it's literally an array:
`config.passwords` is built by combining every `PASSWORD_KEYS`-named env var
that resolves, plus `PASSWORD` if set (`lib/config.js:106-113`). Any
password in that array authenticates equally — `isAuthenticated`
(`lib/authentication.js:78-85`) and the check on submit
(`lib/manage-prototype-handlers.js:126`) both use `.some(...)` and never
record *which* password matched. So:
- going from 1 password to N distinct passwords is free (just add more env
  vars and list their names in `PASSWORD_KEYS`)
- there is no concept of per-password access level/role anywhere in this
  code — all configured passwords are interchangeable and the request
  object never carries "which password was used." Differentiated access
  (Sam's "could be cool, but not first pass") would need new state beyond
  what the kit tracks — e.g. the cookie would need to encode/identify which
  password (or a role) was used, not just a hash equality check.

## Timing-safe comparison, rate limiting, logging

- **Timing-safe comparison: no.** The submit-time check is plain `===`
  string comparison in a `.some()` loop (`lib/manage-prototype-handlers.js:126`).
  No `crypto.timingSafeEqual` or equivalent anywhere in `lib/authentication.js`
  or `lib/manage-prototype-handlers.js`.
- **Rate limiting / lockout: no.** No attempt counter, no delay, no lockout
  logic in either file — confirmed by reading both in full.
- **CSRF: no**, specifically on this route. The kit does have CSRF
  middleware (`csrfProtection` exported from
  `lib/manage-prototype-handlers.js:760` and used elsewhere in
  `lib/manage-prototype-routes.js`), but it is not applied to
  `GET`/`POST /manage-prototype/password`
  (`lib/manage-prototype-routes.js:43-47` — no `csrfProtection` in that
  router chain).
- **Logging: minimal.** The only log line is `console.error('Password is
  not set.')` when auth is switched on but no password is configured
  (`lib/authentication.js:62`). There is no logging of successful or failed
  login attempts anywhere.

## What the old prototype actually did

`~/git/defra/trade-imports-workspace/workareas/designer-prototyping/GB-notification-service`:
- `package.json` — no password-related scripts or dependencies beyond the
  kit itself (`govuk-prototype-kit@13.20.2`).
- `app/config.json` — only `serviceName`, `serviceUrl`,
  `useServiceNavigation`, `plugins`; nothing about auth/passwords.
- No `.env`, `app.json`, `Procfile` or `usage-data-config.json` exist in the
  checkout — and its `.gitignore` (`:5-8`) explicitly excludes `.env` and
  `usage-data-config.json` (a separate, unrelated kit file for
  telemetry-opt-in state) from version control.

So the old prototype never committed a password/env config to the repo at
all — consistent with the kit's own model: `PASSWORD`/`PASSWORD_KEYS` are
meant to be set at the hosting platform's environment-variable/secret layer
(Heroku config vars, historically), never in the codebase. That maps
directly onto "a CDP secret" for the plants prototype: no code change is
needed to turn the gate on/off or rotate the password, only supplying
`PASSWORD` (and later `PASSWORD_KEYS` if/when multiple credentials are
wanted) as a CDP environment variable, with `NODE_ENV=production` (which
CDP already sets) making `shouldUseAuth()` active by default.
