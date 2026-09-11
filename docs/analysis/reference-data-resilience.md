# Reference Data Resilience

Cross-repo audit of how the trade-imports estate consumes reference data.

This includes integration with Defra's Master Data Management (MDM) service.

Scope
— which services interactions and authentication;
- what happens when dependencies (e.g. MDM or the token endpoint) are unavailable;
- where the current design has weaknesses.

Written to inform EUDPA-507's mitigation options — this document is the
"state of play" reference; mitigation choices live on the ticket.

**Audited as of** 2026-09-11, against `main` on:

| Repo | Commit |
|---|---|
| `trade-imports-reference-data` | `84d5fbd` |
| `trade-imports-animals-frontend` | `78cef1a6` |
| `trade-imports-plants-frontend` | `07549b1` |
| `trade-imports-ins-frontend` | `d26cd35` |

## Design rationale

MDM is a tier-1 CDP service and which manages its own availability. That fact 
has two practical consequences for how the state-of-play below should be read:

- **INS don't build resilience layers that reimplement MDM.** Persistent
  last-good stores (Mongo, Redis, disk caches in reference-data),
  bundled or hard-coded fallback lists, and any other "we'll be more
  available than MDM" pattern are out of scope. Several of the
  weak-spots inventoried below (especially W4, "no circuit breaker,
  no fallback data") are therefore *not* things we intend to address 
  within INS services.
- **Resilience lives on the consumer side.** Frontends tolerate
  ref-data unavailability at startup, refresh on schedule with
  failure-not-overwrite semantics, and rely on operational visibility
  (loud logging, alerting) to surface issues. The follow-up ticket
  set under EUDPA-507 covers these.

The stance may evolve if operational experience justifies it. When it
does, this section should be refreshed alongside the rest of the audit.

## Dependency map

```
                  ┌──────────────────────────────────┐
                  │      MDM (external, Azure APIM)  │
                  │  /mdm/geo/countries              │
                  │  /mdm/trade/bcp/poes             │
                  └────────────────┬─────────────────┘
                                   │  Bearer token +
                                   │  Ocp-Apim-Subscription-Key
                                   │
                  ┌────────────────┴─────────────────┐
                  │  Trade Platform OAuth token API  │
                  │  (client_credentials grant)      │
                  └────────────────┬─────────────────┘
                                   │
       ─── only one service talks to MDM directly ───
                                   │
                  ┌────────────────▼─────────────────┐
                  │    trade-imports-reference-data  │
                  │  Feign clients:                  │
                  │   - MdmClient      → MDM         │
                  │   - TradeApiClient → token API   │
                  │  In-memory Caffeine caches:      │
                  │   - MDM_COUNTRIES_CACHE (60 min) │
                  │   - MDM_POE_CACHE       (60 min) │
                  │  HTTP surface:                   │
                  │   - GET /countries               │
                  │   - GET /ports-of-entry          │
                  └────────────────┬─────────────────┘
                                   │
          ┌───────────────────┬─────┴─────┬───────────────────┐
          │                   │           │                   │
┌─────────▼────────┐  ┌───────▼───────┐  ┌▼──────────────────┐
│ trade-imports-   │  │ trade-imports-│  │ trade-imports-    │
│ animals-frontend │  │ plants-       │  │ ins-frontend      │
│ services/        │  │ frontend      │  │ common/clients/   │
│  countries       │  │ services/     │  │  countries-       │
│ services/ports   │  │  countries    │  │  client.real      │
│ Startup prime    │  │ services/ports│  │ Per-request calls │
│ (routes.js:74-77)│  │ Startup prime │  │                   │
│                  │  │ (routes.js:   │  │                   │
│                  │  │  75-76)       │  │                   │
└──────────────────┘  └───────────────┘  └───────────────────┘
```

## `reference-data` → MDM

Naming note: three related things in this section share the "MDM" label
— `MdmClient.java` is the Feign interface (the HTTP call to the external
MDM), `MdmService.java` is the Spring `@Service` in 
`trade-imports-reference-data`that wraps the client and caches its results, 
and "MDM" alone refers to the **external** Defra service on Azure APIM. 

Where "MDM" appears unqualified below it means the external service; internal 
callers are named by their Java class.

**Endpoints called** (`MdmClient.java`, Feign):

| MDM endpoint | Method exposed by reference-data |
|---|---|
| `GET /mdm/geo/countries` | `MdmService.getCountries(String blocks)` |
| `GET /mdm/trade/bcp/poes` | `MdmService.getPortsOfEntry()` |

Both requests carry:

- **`Authorization: Bearer <token>`** — injected by `MdmClientInterceptor`.
- **`Ocp-Apim-Subscription-Key: <key>`** — from
  `MdmConfiguration.getOcpApimSubscriptionKey()`.
- `system=GBNAG` query param (constant).
- Optional `blocks` on countries (both animals-frontend and
  plants-frontend fetch `GBNAG_SPS_EX`).

### Request sequence

Three participants take part per downstream call: `reference-data`, the Trade
Platform OAuth token API, and external MDM. The frontend itself never sends
any token to `reference-data` — authentication is entirely reference-data's
concern.

**Cache-miss, token expired** — the cold-start pattern; this is what fires
when a fresh `reference-data` container serves its first request:

```
frontend                    ref-data                     token API      MDM
   │                           │                            │           │
   ├─── GET /countries ───────►│                            │           │
   │   (no auth from FE)       │ MdmService.getCountries()  │           │
   │                           │  @Cacheable miss           │           │
   │                           │  → mdmClient.getCountries()│           │
   │                           │   Feign runs               │           │
   │                           │   MdmClientInterceptor:    │           │
   │                           │   token expired            │           │
   │                           ├─ POST /oauth/token ───────►│           │
   │                           │   client_credentials        │           │
   │                           │◄── access_token, expiresOn ┤           │
   │                           │  cache token in-closure    │           │
   │                           │  set Bearer header         │           │
   │                           ├─ GET /mdm/geo/countries ───────────────►│
   │                           │   Bearer <token>            │           │
   │                           │   Ocp-Apim-Subscription-Key │           │
   │                           │◄─── 200 [countries...] ─────────────────┤
   │                           │  @Cacheable stores result  │           │
   │◄── 200 [countries...] ────┤                            │           │
```

**Cache miss, token still valid** — the `MdmClientInterceptor` reads the token
from its in-closure cache and skips the token API entirely. Two external
hops remain (ref-data → MDM only):

```
frontend  ────► ref-data ────► (cache miss, reuse token) ────► MDM ────► frontend
```

**Cache hit** — the steady state once results are cached. Neither the token
API nor MDM is touched. This is what carries the service through short
outages that begin *after* a successful population:

```
frontend ────► ref-data ────► (Caffeine cache hit) ────► frontend
```

Token cache and result cache are independent — token lives in the
interceptor's closure with an expiry from the OAuth response; result lives in
Caffeine with a `${cache.mdm.ttl-minutes:60}` TTL. Token refreshes are
per-token-lifetime, not per-request. Result cache misses are
per-`ttl-minutes` per cache key (`blocks` value for countries; single key for
ports).

**Cold-start pattern for animals-frontend startup.** The first request from a
newly-started animals-frontend container hits a `reference-data` cache miss
(if reference-data is also fresh) and triggers both external calls in order
— token first, then MDM. Any failure at any of the three transitive hops
propagates up and animals-frontend's `prime()` throws, taking startup down
(W1 in the weak-spots inventory).

### Token acquisition

> **Note — pending change.** The Trade Platform OAuth `client_credentials`
> flow described below is expected to be replaced with **Federated
> Identity Credentials (FIC)** — passwordless auth where the workload
> presents an OIDC token from a trusted federated issuer (e.g. the AWS
> IAM role `trade-imports-reference-data` assumes on CDP) and Azure Entra
> exchanges it for an access token. No stored `client_secret` any more;
> no shared secret to rotate on the OAuth path.
>
> **What changes when FIC lands:** the specific token-fetch code path,
> the env vars (`TRADE_PLATFORM_CLIENT_SECRET` gone; new config for FIC
> trust setup instead), and this section's description.
>
> **What stays the same:** the abstract shape — reference-data
> authenticates via a separate service with its own availability and
> failure modes — persists. W2 and W3 below (no retry/back-off on the
> token fetch; `expiresOn` handling) may or may not still apply
> verbatim depending on the FIC exchange response's payload shape.
> The `Ocp-Apim-Subscription-Key` (APIM subscription key on every MDM
> call) is untouched by FIC — that's a separate credential with its
> own rotation cycle.

`MdmClientInterceptor.mdmRequestInterceptor()` returns a Feign `RequestInterceptor`
that holds the access token in a closure alongside its `expiryTime`. Before each
request it checks `Instant.now().isAfter(expiryTime)`; if so, it calls
`TradeApiClient.getTradeAuthToken(...)` with a `client_credentials` grant against
`${trade-auth.api.url}` (env `TRADE_PLATFORM_AUTH_URL`, default
`http://localhost:8087/tenant/oauth2/v2.0/token`). Response is a `Token` with
`accessToken` and `expiresOn` (millis-since-epoch); if `expiresOn` is null the
interceptor sets `expiryTime` to 10 seconds in the past so the next call fetches
again.

**Observed shape:** token is per-instance, per-interceptor-bean. No shared cache
across reference-data replicas; every replica negotiates its own token.

### Caching

The `trade-imports-reference-data` `MdmService` class decorates both its methods 
with Spring's`@Cacheable(unless = "#result == null || #result.isEmpty()")` against 
a Caffeine-backed `CacheManager`. The cache lives in-process — one per reference-data
replica. Per-cache config:

| Cache | Max size | TTL | Written when |
|---|---|---|---|
| `MDM_COUNTRIES_CACHE` | 20 | `${cache.mdm.ttl-minutes:60}` min | non-null, non-empty result returned |
| `MDM_POE_CACHE` | 20 | `${cache.mdm.ttl-minutes:60}` min | non-null, non-empty result returned |

**Intent** (documented in `CacheConfig.java` as of EUDPA-507): the primary
purpose of these caches is to rate-limit our calls to MDM, not to defend
against MDM unavailability and not to improve performance. Under the
trust-MDM stance (see [Design rationale](#design-rationale)), a persistent
last-good store or long-TTL resilience layer would count as reimplementing
MDM's own availability and is out of scope.

The `unless` clause is deliberate — empty / null MDM responses are **not** cached,
so a bad response doesn't poison future calls. As a side effect an outage that
starts *after* a successful prime is absorbed silently for up to 60 minutes; that
smoothing is not what the cache is for and is not something the design leans on.

### `MdmService`'s own error handling

Only one branch of explicit handling: **null / empty response body from MDM**.
Both methods log a warning ("MDM returned a null body for …") and return
`List.of()`. Anything else — 4xx, 5xx, connect timeout, read timeout, DNS
failure, TLS failure — bubbles up as a Feign `RuntimeException`. `MdmService`
does not catch, does not retry, does not back off.

`GlobalExceptionHandler.handleException` catches the resulting `RuntimeException`
and returns a **500 Internal Server Error** with a `ProblemDetail`
(`type: internal-error`, generic "An unexpected error occurred" message, trace
id attached from MDC). Callers see a 500 with no diagnostic clue that the
underlying problem is MDM.

## `reference-data` HTTP surface

Two controllers:

- `CountriesController` (`GET /countries?blocks=...`) — delegates to
  `MdmService.getCountries(blocks)`.
- `PortsOfEntryController` (`GET /ports-of-entry`) — delegates to
  `MdmService.getPortsOfEntry()` and adapts the MDM `MdmPortOfEntry` shape into
  reference-data's own `PortOfEntry`.

Both are thin — no caching of their own beyond `MdmService`'s Caffeine. Any
MdmService throw ends up as a 500 at the reference-data boundary.

## `reference-data` → downstream

### `trade-imports-animals-frontend`

**Where it calls:**
- `src/server/app/services/countries/client.js:fetchCountries(blocks)` — GET
  `/countries?blocks=…` against `${TRADE_IMPORTS_REFERENCE_DATA_URL}`.
- `src/server/app/services/ports/client.js:fetchPortsOfEntry()` — GET
  `/ports-of-entry` against the same URL.

Both throw a plain `Error` with `.status` + `.statusText` when
`response.ok === false`.

**When it calls:** exactly once per process, at server startup, from
`src/server/app/routes.js:74-77`:

```js
if (!isStubMode()) {
  await countries.prime()
  await ports.prime()
}
```

`prime()` stores the response in module-scope state (`labels` and `ports` in the
respective `index.js` modules). `originLabel`, `originCountries`,
`addressCountries`, `countryCodeOf`, `list`, and `label` all read that state
synchronously — no re-fetch, no re-prime, no expiry.

**Startup coupling — the incident behaviour:** if either `prime()` throws, the
awaited `register` call fails, Hapi fails to start, the container exits. A new
container coming up during an MDM outage cannot become healthy.

**Runtime coupling — none:** once primed, animals-frontend never calls
reference-data again. An outage that begins after a successful prime is
invisible to the frontend for the lifetime of the process.

### `trade-imports-plants-frontend`

Same pattern as animals-frontend, verbatim — the plants frontend was built
against the same house pattern. `services/countries/index.js` and
`services/ports/index.js` are structurally identical; `routes.js:75-76`
awaits both primes at startup. Every observation and every weak-spot above
applies here identically. Called out as a distinct consumer because it
means the class-of-problem now hits two production frontends, not one, and
any future INS frontend will inherit the same shape unless the pattern is
changed.

### `trade-imports-ins-frontend`

**Where it calls:** `src/server/common/clients/countries-client.real.js` — GET
`/countries?blocks=…` per request. Throws a plain `Error` with `.status` and
`.statusText` when `!response.ok`, logs to Pino at error level with the trace
id.

**When it calls:** on demand (the client is invoked per address-book journey
lookup, not primed). Runtime coupling — an MDM outage in the middle of a
session surfaces as a live error to the user, not a startup failure.

INS ports-of-entry consumption was not traced in this audit — only the
countries client is visible in `common/clients/`. Add ports coverage here if
INS starts consuming them.

### Anyone else?

`grep -rln 'TRADE_IMPORTS_REFERENCE_DATA\|/countries\|/ports-of-entry' repos/*/src`
returns the three frontends above. No backend service consumes reference-data:
neither `trade-imports-animals-backend`, `trade-imports-ins-backend`, nor
`trade-imports-plants-backend` touches MDM or reference-data. `trade-imports-schemas`
is documentation and data-definitions only (no runtime code). Nothing else
talks to MDM directly.

## Failure modes matrix

Each row is what the caller sees for a given class of failure, given the
current code.

Animals-frontend and plants-frontend share the same startup-prime pattern
and behave identically on every row below; INS is a runtime consumer and
behaves differently.

| Failure | reference-data behaviour | animals / plants frontend impact | ins-frontend impact |
|---|---|---|---|
| MDM returns null body | Warning logged; empty list returned (not cached). Caller sees an empty result set. | Blank country list; blank ports-of-entry list. Users see empty dropdowns; no error. **Primed silently degraded** (empty stays for the process lifetime — no re-prime). | Blank country list on the address form for that request. Next request retries. |
| MDM returns 5xx | Feign throws; unhandled → 500 to caller. | If at startup: server crashes / refuses to start. If already primed: no effect. | Live 500 to the user request. |
| MDM connect refused / DNS / TLS | Feign throws (timeout after 3 s per `mdm-service.readTimeout` + `connectionTimeout`); unhandled → 500. | Same as 5xx. | Same as 5xx. |
| MDM returns 401 (subscription key wrong / expired) | Feign throws; 500. Interceptor keeps sending the same (valid) bearer plus a bad `Ocp-Apim-Subscription-Key`. No recovery until config change. | Same as 5xx. | Same as 5xx. |
| Token endpoint down / times out | `MdmClientInterceptor.getToken()` throws inside `apply()`. The bearer is not set. Feign fails before hitting MDM. Result: 500 to caller. Interceptor's `expiryTime` stays in the past, so every subsequent request retries the token endpoint — no back-off, no circuit break. | Same as 5xx. Every request storms the token endpoint. | Same as 5xx. |
| Token endpoint returns 401 (client credentials invalid) | `TradeApiClient` throws; same path as "token endpoint down". Every request continues to attempt token acquisition. | Same. | Same. |
| Token endpoint returns a token with no `expiresOn` | Interceptor sets `expiryTime` to `now - 10s`, so **every subsequent request re-fetches the token** — silent hammer on the token endpoint. Not a failure to the caller (token works), but pathological load. | Silent — no user-visible impact. | Silent. |
| Cache expiry during outage | After 60 min (`cache.mdm.ttl-minutes`), next call re-fetches from MDM. If MDM still down, becomes a 500. Empty responses aren't cached so this only bites populated caches. | Depends on whether frontend has since restarted. Long-running processes are shielded (they don't call again). | Live 500. |

## Weak spots inventory

Each entry names what's fragile, where it lives, what the current mitigation
is (if any), and its rough severity for an outage-driven incident. Mitigations
are named for the mitigation-options discussion, not proposed here.

### W1 — animals-frontend and plants-frontend startup blocks on the whole transitive chain

Both frontends follow the same pattern: `routes.js:74-77`
(animals) / `routes.js:75-76` (plants) awaits both primes; a failure aborts
server registration and the container exits. Because reference-data's
`MdmService` throw becomes a 500 that the frontend client treats as
failure, startup for either frontend depends on **three** transitive
services being reachable at the moment of startup:

- `trade-imports-reference-data` itself (connect, respond).
- External MDM (via reference-data's Feign call).
- Trade Platform OAuth token API (via `MdmClientInterceptor.getToken()`).

Any of those throwing propagates a 500 back to the frontend, which throws, and
Hapi never becomes ready. **This is what happened in the QA incident on
animals-frontend.**

- Current mitigation: none, on either frontend.
- Severity: **High** — takes down the whole frontend (animals or plants) on
  any degradation of any of the three coincident with a redeploy or pod
  restart. Any future INS frontend that follows the same house pattern
  inherits this coupling.
- Data at risk: countries and ports lists.

**W1 × W5 — silent-degraded startup.** If MDM returns a null / empty body,
`MdmService` returns `List.of()` (not an error), reference-data returns
`200 []`, and the frontend's `!response.ok` check doesn't fire. `prime()`
succeeds with empty state. **The container starts with empty country and
port lists for the whole process lifetime** — users see empty dropdowns, the
notification can't be completed on the mandatory answers, and nothing pages
ops except a warning log deep in reference-data. Arguably worse than the
crash in W1 — the crash fails loudly; this fails silently.

### W2 — No retry or back-off on the token endpoint

`MdmClientInterceptor.mdmRequestInterceptor()` re-tries synchronously on every
request when `expiryTime` is in the past. A flaky or slow token endpoint
becomes a self-inflicted DDoS from every reference-data replica.

- Current mitigation: none. Feign's default timeouts (3 s per config) limit
  per-call cost.
- Severity: **Medium** — user-invisible; operational load on the token API.

### W3 — Missing `expiresOn` forces per-request token refetch

`MdmClientInterceptor` treats a missing `expiresOn` as "already expired" (line
53). Any change in the token API's payload shape that omits `expiresOn`
silently turns every downstream request into an extra token round-trip.

- Current mitigation: none.
- Severity: **Low-Medium** — a hidden regression trigger; only a problem if
  the token API changes.

### W4 — No circuit breaker, no fallback data

reference-data has no Resilience4j / Hystrix wrapping. Once the cache is empty
and MDM is down, every request rides through to MDM and fails.

- Current mitigation: none intentional. The 60-minute Caffeine cache smooths
  short outages after a successful population as a *side effect*, but per
  the [Design rationale](#design-rationale) the cache exists to rate-limit
  MDM calls, not to defend against MDM unavailability. Nothing helps a cold
  start; nothing designed helps a mid-life outage either.
- Severity: **N/A — deliberately not mitigated.** Under trust-MDM this is a
  weakness we live with rather than address on the server side.

### W5 — Empty-body path degrades silently to empty list

`MdmService`'s null-body branch returns `List.of()` and logs a warning.
Downstream sees an "empty countries list" — indistinguishable from "MDM
legitimately has no countries" (which never happens in practice, but a caller
can't tell that from the response).

- Current mitigation: warning log lets ops spot the pattern, but there's no
  automated signal.
- Severity: **Medium** — bad UX during a partial MDM outage; ops-visibility gap.

### W6 — 500 is opaque

`GlobalExceptionHandler.handleException` returns "An unexpected error
occurred" for every MDM failure. The trace id is in the response but the
underlying "MDM is down" cause is invisible to the downstream caller.

- Current mitigation: trace id enables log correlation for someone who knows
  where to look.
- Severity: **Low** — mostly a diagnostics issue, not a functional one.

### W7 — animals-frontend and plants-frontend never re-prime

Once `prime()` succeeds at startup, either process holds those values
forever. Two consequences:

- Any MDM data change (a new port added, a country removed) is only picked
  up on the next redeploy of every replica.
- A silently-degraded prime (W5's empty list, or a partial response) locks
  the frontend into the degraded state until restart.

- Current mitigation: none, on either frontend.
- Severity: **Medium** — freshness lag + trapped-empty-state hazard.

### W8 — Per-instance token cache

Every reference-data replica negotiates its own token. Scaling reference-data
up in an outage means each new pod hits the token API independently. Fine at
today's scale (1-2 replicas); a consideration if replicas grow.

- Current mitigation: none.
- Severity: **Low** at current scale.

### W9 — Cache size cap of 20 per cache

Both caches are `maximumSize(20)`. `getCountries(blocks)` is keyed on the
`blocks` parameter — if callers use more than 20 distinct `blocks` values,
older entries are evicted. Not a bug today (animals-frontend, plants-frontend
and INS all use `GBNAG_SPS_EX` — one distinct value across three consumers),
but implicit for anyone adding a caller with a different `blocks`.

- Current mitigation: none.
- Severity: **Low** — cosmetic for today's callers.

## Related workarea and tickets

- Ticket: [EUDPA-507](https://eaflood.atlassian.net/browse/EUDPA-507)
  — spike for mitigation options; this document is the "state of play"
  companion.
- Historical: [EUDPA-190](https://eaflood.atlassian.net/browse/EUDPA-190)
  — introduced the MDM consumption pattern.
- Incident: QA MDM outage that prevented the animals service from starting
  (referenced on EUDPA-507's description, not a linked incident ticket).
