# Password-protecting the deployed plants prototype: design

Branch: `feat/NO_JIRA-prototype-password` in
`repos/trade-imports-plants-prototype` and in the workspace. Research this
builds on: [`kit-auth.md`](kit-auth.md) (how the GOV.UK Prototype Kit does it).

## The problem

The plants prototype runs in CDP dev with stub sign-in (by design: no Defra ID),
so anyone who reaches its address can use it. CDP puts no basic auth in front
of a service. The Prototype Kit's answer for a deployed prototype is a shared
password held in a platform environment variable, a GOV.UK-styled password
page, and a cookie that remembers a correct password. We do the same, in the
prototype's own hapi server, with a few things the Kit gets wrong fixed.

## Decisions, each with its reason

1. **Off unless a password is configured. Env var: `PROTOTYPE_PASSWORD`, not
   the Kit's `PASSWORD`.**
   - Unset (or empty), the prototype behaves exactly as today, and logs one line
     at start-up: the prototype is open to anyone who reaches it. Every local
     run, every test and every existing CI step stays unchanged.
   - Set, the gate is on everywhere: CDP, `npm start`, `npm run dev`,
     `designer:fresh`. Unlike the Kit (on only in production), so a maintainer
     can try it locally with `PROTOTYPE_PASSWORD=... npm run dev` before
     touching CDP.
   - `PASSWORD` is too generic a name in a CDP service's environment (it could
     be read as the Redis password, a database password, anything). The
     `PROTOTYPE_` prefix says what it guards, and matches the prototype's other
     own variables (`PROTOTYPE_SEED`, `PROTOTYPE_PERSIST`).
   - It is a **CDP secret**, not a plain app-config variable: it is a
     credential, and a secret can be changed in the CDP portal without a commit
     to `cdp-app-config` (see [`cdp.md`](cdp.md)).

2. **Its own config, in a prototype-owned file.** `PROTOTYPE_PASSWORD` is read
   by a small convict schema in
   `src/server/prototype-password/config.js` (`sensitive: true`, so it is
   never logged), not added to the real service's `src/config/config.js`. That
   keeps `config.js`'s patch exactly as it is, and the weekly sync from
   plants-frontend never meets it.

3. **One upstream touch: two lines in `src/server/router.js`.** It is already
   `patched` (it mounts `prototype-sets`), so registering the gate there adds
   no new patched file; `server.js` stays untouched. The gate is registered
   before, and independently of, the `auth.enabled` branch, so it guards the
   prototype whether or not sign-in is on.

4. **An `onRequest` extension, server-wide.** It runs before routing and
   authentication, so the password page comes before stub sign-in (which
   would otherwise sign a stranger straight in), before every set, the
   chooser at `/`, the example links, `/reset/{setId}`, and any 404 (a
   stranger learns nothing about which paths exist). A route registered
   anywhere, in any order, is covered; there is no allow-list of routes to
   keep in step. `onPreAuth` was tried first and does not run for a path
   that matches no route (hapi's not-found route skips the route lifecycle),
   so a 404 leaked through; `onRequest` runs before cookies are parsed, so the
   gate reads its one plain-text cookie straight off the `Cookie` header.

5. **What stays open, and why.**
   - `/health`: CDP's health check must keep passing.
   - `/prototype-password` (the page and its form post) and
     `/prototype-password/sign-out`.
   - The built static assets under the asset path (`/public/...`) and
     `/favicon.ico`: the password page is the full GOV.UK page and needs the
     stylesheet and script. These are the compiled bundle every visitor gets
     anyway: no data, no prototype content. The Kit exempts a separate
     unbranded stylesheet for the same reason; ours needs no separate one.
   - In-process requests the server makes to itself **with injected
     credentials** (`request.auth.isInjected`): boot-time seeding and the
     release-render check replay real pages through `server.inject` with
     `auth`. A browser cannot produce such a request. Without this the gate
     would redirect the seeder to the password page and every set would
     start empty.

6. **The page.** `GET /prototype-password` renders a GOV.UK page on the
   prototype's own layout: `govukInput` (type password,
   `autocomplete="current-password"`), `govukButton`, and on an error
   `govukErrorSummary` plus the inline field error, with "Error: " in the
   title. Copy is plain English, close to the Kit's: "This is a prototype
   used for research. Only continue if you have been sent the password."
   Two error messages, not the Kit's one: "Enter the password" (empty) and
   "The password is not correct" (wrong). An error re-renders the page (400),
   the GOV.UK pattern, rather than the Kit's redirect with `?error=`.
   The form carries the CSRF crumb like every other form here; the route has
   Joi validation on its query and payload.

7. **Back to the page first asked for, safely.** The gate redirects a GET to
   `/prototype-password?returnUrl=<path and query>`. The return address is
   sanitised with the service's own `getSafeRedirect` (relative paths only:
   no `//`, no scheme, no backslash, no CR/LF, same origin), and anything
   under `/prototype-password` falls back to `/`. A gated POST (a form
   posted after the cookie expired) is sent to the page with no return
   address, because redirecting back would turn the POST into a GET on a
   form-handling URL.

8. **The cookie** (`prototype-password`): `httpOnly`, `sameSite=Lax`, `path=/`,
   `secure` from `session.cookie.secure` (on in production; the CI boot check
   turns it off over plain HTTP, as it already does for the session cookie),
   30 days, like the Kit.
   - Its value is `<credential id>.<expiry>.<signature>`. Never the
     password, and not the Kit's unsalted SHA-256 of it (which is an offline
     brute-force target if a cookie leaks).
   - The signature is HMAC-SHA256 over `<credential id>.<expiry>`, keyed by a
     key derived as HMAC-SHA256(`SESSION_COOKIE_PASSWORD`,
     `prototype-password:` + the password). So:
     - it cannot be forged without both the password and the server's
       session secret;
     - **changing `PROTOTYPE_PASSWORD` invalidates every cookie at once**
       (the Kit's own property, kept), and so does changing
       `SESSION_COOKIE_PASSWORD`;
     - the expiry is inside the signed part, so the server enforces the 30
       days, not only the browser.
   - The check is timing-safe: submitted passwords are compared as SHA-256
     digests with `crypto.timingSafeEqual`, against every configured password
     without stopping at the first match; cookie signatures likewise.

9. **A way to forget it: `GET /prototype-password/sign-out`.** It clears the
   cookie and returns to the password page. Deliberately **not** tied to the
   service's own "Log out" (`/auth/sign-out`): a designer demoing sign-out
   would otherwise be thrown back to the password page mid-demo. GET, like the
   stub sign-out, because it only drops a cookie and there is nothing to
   protect with CSRF.

10. **Shaped for many credentials, one now.** Internally the gate holds a list
    of accepted passwords, each `{ id, password }`, and the cookie names the
    one that was used. Today the list is built from `PROTOTYPE_PASSWORD`
    alone, as one entry with the id `shared`. Adding more later is a change
    to one function (`acceptedPasswordsFrom` in `password-token.js`), not to
    the gate. (The module is `password-token.js`, not `credentials.js`: the
    session's file-protection rules refuse any file named `credentials*`.)

11. **No rate limiting.** The Kit has none either. It is a research prototype
    with no real data; a long shared password is the defence. Recorded as a
    follow-up. A wrong password is logged at info (never the password), so a
    burst of attempts is visible in CDP's logs.

## Files

- `src/server/prototype-password/` (new, `ours`): `config.js` (convict,
  `PROTOTYPE_PASSWORD`), `password-token.js` (accepted passwords, timing-safe
  match, signed token), `paths.js`, `controller.js` (page, post, sign-out),
  `index.js` (the plugin and the `onRequest` gate), `index.test.js`.
- `src/server/app/prototype-password/template.njk` (new, `ours`): lives under
  `server/app` because that is Vision's view root, as `sets-index` does.
- `src/server/router.js` (already `patched`): one import, one register line.
- `overrides.json`: the two `ours` lines; `router.js`, `README.md` and
  `mode.js` whys updated.

## Tests (behavioural, `server.inject` against the real `createServer`)

`src/server/prototype-password/index.test.js`:

- unset: every page open, as today; the start-up line says it is open;
- set: `/`, a set, stub sign-in, an example link and an unknown path redirect
  to the password page with a return address;
- the page renders with GOV.UK markup; empty and wrong passwords re-render
  with the error summary and inline error;
- the right password sets the cookie and redirects back; the cookie is then
  accepted;
- a tampered cookie, an expired one and one made under the old password are
  rejected (the last after the secret changes);
- `/health`, the stylesheet and `/favicon.ico` stay open;
- an open-redirect attempt (`//evil.example`, `https://evil.example`,
  `/\evil.example`) lands on `/`;
- a gated POST goes to the page with no return address;
- with CSRF on (as deployed), the form as rendered, crumb and all, is
  accepted, and a post without the crumb is refused;
- sign-out clears the cookie;
- boot-time seeding still reaches every set with the password on (proved red
  with the injected-credentials bypass removed);
- the start-up line, open or on, never contains the password.

The production-run and chooser tests keep running with no password set.

## CI

The production boot check keeps its no-password boot, and gains a second
container booted with `PROTOTYPE_PASSWORD` set: `/health` is 200, `/`
redirects to `/prototype-password`, and a real sign-in through the form
(crumb and all) lands back on the chooser.

## Follow-ups (not built)

- **Several people, different access** (Sam: "could be cool, but probably
  not a first-pass priority"). The shape is ready: credentials are a list and
  the cookie names which one was used. What it would take:
  - a way to supply them: for example `PROTOTYPE_CREDENTIALS` as a CDP secret
    holding JSON, `[{ "id": "research", "password": "...", "sets": ["plants-working"] }]`,
    or the Kit's `PASSWORD_KEYS` (a list of env var names, one secret each);
  - an access rule per credential, most likely a list of sets it may open,
    checked in the same `onPreAuth` extension against `setIdForPath`;
  - the chooser listing only the sets a credential may open;
  - a username field on the page, once passwords alone stop being enough to
    tell people apart.
- **Rate limiting** the form post, if the prototype ever holds anything that
  matters.
- **A "Forget the password" link** in the footer, if designers want one
  (today the address is shared by hand).
