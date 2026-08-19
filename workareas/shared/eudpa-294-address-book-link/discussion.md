# EUDPA-294 — address-book link: review discussion

Running record of the design discussion around EUDPA-294 (link notification
parties to address-book records). Facts carry file:line; opinions are marked.
Append as the discussion moves; keep it short.

Last updated 2026-08-17.

## PRs

| Repo | PR | State |
|---|---|---|
| trade-imports-animals-frontend | #194 | open, SonarCloud RED |
| trade-imports-animals-backend | #75 | open, checks green |
| trade-imports-animals-tests | #109 | open |
| cdp-app-config | #4184 | open (env var only) |
| trade-imports-animals-workspace | #46 | merged 11 Aug (local stack wiring) |

`origin/main` merged into the frontend and tests branches and pushed on 14 Aug
(the author had merged backend and frontend but not tests). Before that merge the
tests branch was 4 commits stale and 96 of 156 E2E tests failed on one line —
`flows/journey.ts:31` still waited for the deleted import-type page. After it:
**160 passed, 1 skipped, 0 failed (4m)**. None of those failures were about the
address-book work.

## What is built

- A party field holds either an `addressId` **reference** or an inline address.
- Frontend resolves references on read via a global hook —
  `configureAnswersForRead(withoutUnresolvedPartyRefs)` (`routes.js:52`), firing
  in `engine/read.js:34`. Up to 6 lookups (5 parties + contact), parallel,
  memoised per request only, no cross-request cache.
- **The dashboard DOES resolve per row** (corrected 17 Aug — an earlier note here
  said it did not). `listItemMarshaller` calls `party(organisationId, addressId)`
  for consignor and consignee on every row
  (`records/real/marshal/list-item.js:14-40`), deduped only by an `inFlight` map
  within one render (`:15-21`). 25 rows = up to 50 calls to draw a list. This is
  the case the ticket flagged: *"expect to need it on list views."*
- Resolved details are deliberately kept **out of `answers`** and passed to the
  view model as a second input (`check-answers/controller.js:90`).
- Backend resolves only for outbox events (`NotificationService:230`), into a
  copy, before the lock, deduped per `addressId`. Strict on submit/amend
  (`BadRequestException` on a miss), best-effort on draft edit. Replays reuse the
  stored event.
- Obligations were **not touched**. Presence is `value !== undefined`
  (`fulfilment-bindings.js:29`) against `{id, name, status}` obligations, so
  `{addressId}` satisfies them exactly as a full block did. Deletion works
  because `withoutUnresolvedPartyRefs` **deletes the key**
  (`resolve-parties.js:64`).
- Journey can still **create** an address (`create-address.controller.js:222` →
  `addParty`), now writing to the real book. The page pre-dates the ticket
  (EUDPA-288 retrofit, #181).
- Auth: `organisationIdOf` (`common/helpers/organisation-id.js`) reads the org
  from the verified session and forwards it; the address book runs no auth of its
  own and trusts the `Trade-Imports-Organisation-Id` header. New stub sign-in
  (`server.js:79`), gated `auth.stubMode && !isProduction`, default false.

## Working position (Sam, 17 Aug)

- **One way to select an address, the same everywhere.**
- **Creation is a link through to the address book** — not a form in this journey.

This answers open questions 1-3. It commits us to: every reusable org-level
address goes through the one picker (so D24 becomes the exception needing a
reason, and the transporter split-out needs a reason or a reversal); the
cats/dogs permanent address stays out (an animal's home, not an org address);
and the cross-app link becomes load-bearing, so Q5 (org id) must be answered
**before** create-address can be retired, not after. Sequence: settle D24 →
answer cross-app link + org id → retire create-address.

## D-number provenance — unresolved

D13/D24/D26 are cited by both EUDPA-294 and EUDPA-295 with no link. The register
is not in any repo, and Confluence/Jira search is not reachable from this
machine's auth (`tim jira` fetches by id only). **Someone needs to say where
D-numbers live.**

## EUDPA-295 is already invalidated by the D24 deviation

295's tech notes: *"Two role fields are never referenced, so they are already
frozen and need nothing here: `placeOfOrigin` (D24) — entered inline in the
journey."* The build made it a reference, so if both ship as written, place of
origin is the **one field never frozen at submit** — the leak 295 exists to close
stays open for it alone. This is the item with a deadline.

## Open questions

1. **Which inputs use the book, and why those?** Four sources now: five party
   spokes + contact (book), commercial transporters (**split out** by this PR into
   `services/commercial-transporters/`, still stubbed), cats/dogs permanent
   address (free text, not an address block). No stated rule.
2. **Place of origin is a reference, against the ticket.** Tech note: *"placeOfOrigin
   (D24) and consignment (D26) are never references — they stay inline"*, and AC5
   names place of origin as *the* inline example. Built: `PARTIES[0]`, slug
   `place-of-origin/select`, no special-casing, resolved on both sides
   (`ConsignmentPartyResolver:82-83`). Cause: the picker was created by the #181
   rewrite (5 Aug), so it looked like the other four when the stubs were swept.
   **Decide which rule stands before EUDPA-295 inherits it.**
3. **Should create-address survive at all?** The book now exists and we own both
   surfaces. Retiring it needs a cross-app link to the INS address book and a
   return path to the right spoke — unspecified, which is why it survived.
4. **No link to the INS frontend** anywhere; no navigation between the two apps.
5. ~~Org id derived twice.~~ **Corrected 17 Aug:** both apps derive it
   *identically* — `organisationId: payload.currentRelationshipId` in the Bell
   profile function (INS `src/server/plugins/auth.js:56`, animals
   `src/plugins/auth.js:56`). The difference is **strictness**: INS refuses
   sign-in without the claim (`auth/controller.js:33-39`) and throws
   `Boom.forbidden` per request (`require-organisation-id.js:7-15`); animals has
   no sign-in guard and `organisationIdOf` returns `undefined`, leaving each
   caller to decide. Multi-org selection exists (tests added an
   `organisation-picker-page`) and is unspecified.
6. **Why did D24 say place of origin stays inline?** Unanswered.
7. **Two `mode.js` files** — `app/services/mode.js` (`LIVE_ANIMALS_MODE`, bare
   env, string, no prod guard) and the new `common/services/mode.js`
   (`auth.stubMode`, convict, boolean, prod-guarded). One consumer sets both
   together (`playwright.config.js:66-67`); nothing wants real data with stub
   auth. Fold, or rename the new one for what it gates.
8. **SonarCloud red on #194** — not investigated.

## Cost of the reference model

Known and accepted in the ticket: *"Resolve-on-read is one call per referenced
field… Measure before caching, but expect to need it on list views."*

Consequences, confirmed:

- Address-book outage **takes the journey down**, not just submits — the client
  throws on any non-404 (`client.js:120`) by deliberate choice, and the frontend
  `fetch` has **no timeout** (backend has 2s/2s). No retry, no breaker.
- Deleting a linked address between draft and submit **hard-fails the submit** (400).
- Until EUDPA-295, a submitted notification **resolves live** — a deletion makes a
  submitted legal record render parties as "not provided".
- Display needs a second input beside the obligation model, so any future consumer
  reading `answers` alone sees `{addressId}` and renders nothing.

## Authorisation audit (17 Aug, three read-only agents)

**Org-based restriction is genuinely new with the address book. It is the only
scoping anywhere in the stack, and it rests on an unverified header.**

- Authentication is real: `server.auth.default('session')`
  (`frontend src/plugins/auth.js:20`); only health, static assets and the stub
  routes opt out. **Authorisation does not exist.**
- The frontend sends **no identity to the backend** — content-type and tracing
  headers only (`records/real/http/headers.js:4-7`). Its own comment:
  *"`organisationId` is not sent to the backend"* (`real/lifecycle/read.js:23`).
- Backend `Notification` has **no `organisationId`, `userId` or `createdBy`**
  (`NotificationBase.java:21-51`). Reads are by reference or status only
  (`NotificationRepository.java:15-34`). `GET /notifications` returns **every**
  DRAFT/SUBMITTED/AMEND notification; `GET /reference-numbers` enumerates them.
- No authentication in the backend beyond one shared-secret filter on two admin
  paths (`AdminSecretFilter.java:52-57`), default secret committed
  (`application.yml:128`).
- `currentJourney` **claims any reference into the caller's own cookie** rather
  than rejecting it (`engine/journey.js:62-68`), and that is a codified test. So
  the `isKnownJourney` gates on amend/copy/soft-delete are not ownership checks.
- `Actor` (incl. `organisationId`) arrives in the **JSON request body**,
  unvalidated and optional (`NotificationController.java:50,85,104`;
  `ActorRequest.java:11-29`), and is forwarded verbatim as
  `Trade-Imports-Organisation-Id` — the header the address book treats as the
  authenticated org. The backend client's own javadoc states the precondition
  ("must originate from the submitting actor's authenticated session"); nothing
  in that repo enforces it. **INS is a compliant BFF; the animals backend is not.**
- `role`/`scope` are computed at sign-in in both frontends from **mocked** data
  (`src/auth/get-permissions.js`) and never read — no route declares `scope:`.
- Address book authenticates nobody: *"does not implement Spring Security or
  validate JWTs"* (`IdentityHeaderFilter.java:31-37`); its README assigns the
  defence to CDP ingress or the calling BFF (`README.md:88-93,105-109`). What it
  does enforce internally is tight — header present, well-formed, equal to the
  path org, else 400/404, with cross-org reads byte-identical to unknown-id reads
  (`AddressScopingIT.java:208-234`).
- Non-production stub sign-in lets the caller choose `?organisationId=` on an
  `auth: false` route (`stub-sign-in.js:32,86`).

**Conclusion:** signed-in users can already read, amend, copy and delete each
other's notifications. A proper sweep needs an owner field on the notification,
an authenticated identity at the backend boundary, and org-scoped queries — none
of which is in this ticket's gift.

## Sam's position, 17 Aug (later message)

1. **Rip the org-scope concept out of this ticket** — it is not implemented
   properly anywhere yet.
2. **Reconsider the address pages.** Gut feel: no create from the animals
   frontend, select-only — but open to a good argument for keeping it.
3. **The two stub flags may dissolve** as a consequence of 1 and 2.

## Constraints and consequences not yet weighed

- **The org id cannot simply be removed.** The address book 400s on a missing or
  malformed header (`IdentityHeaderFilter.java:92-105`) and 404s on a path
  mismatch, so any address-book integration must send one. "Rip out org scope"
  can only mean *stop treating it as security* — keep sending it, build nothing
  on it, and do not add a second enforcement point. Full removal = do not
  integrate the address book at all.
- **Select-only still needs the org id** for the picker reads, so dropping create
  does not remove the coupling or the flag.
- **A placeholder org is a decision, not a default.** If the value is not trusted
  identity, what ships to real environments? A single shared org id means one
  address book for every trader (`stub-org-1` is exactly that today).
- **Internal callers bypass the delegated defence.** The address book's defence is
  CDP ingress stripping client-supplied headers; backend→address-book is an
  internal call, so anything inside the network can read any org's addresses.
  cdp-app-config #4184 ships that URL to real environments. Platform question,
  not a code one.
- **The perf gate is structurally blind to the fan-out.** Lighthouse seeds
  exactly ONE address (`scripts/lighthouse/seed-address-book.js:35-50`), so it
  renders a one-row list and a one-option picker. It cannot see the 2-calls-per-row
  dashboard cost.
- **The two-flag problem is a symptom of two E2E suites.** The tests-repo specs
  are tagged `@duplicated-in-frontend`; the frontend's own Playwright suite needs
  stub data *and* stub auth (`playwright.config.js:66-67`) while the tests repo
  uses real data plus the defra-id-stub container. Retire the duplication and the
  flags follow; keep both suites and they do not.
- **Two positives worth keeping.** (a) No backfill needed: old drafts hold copied
  operator blocks with no `addressId`, and inline parties pass through untouched
  (`ConsignmentPartyResolver.java:92-94`). (b) A failed resolve on submit aborts
  **before** any status mutation — resolution runs before
  `executeWithOutboxLock` (`NotificationService.java:230`) — so there is no
  half-transitioned notification.
- **The counter-argument to select-only, for fairness.** Sending a trader to
  another app mid-notification to create an address is task interruption, and it
  makes a new trader's first notification a two-app exercise. The alternative
  mitigation is to keep the form but share one validation module with INS so the
  two cannot drift. Decide on the UCD merits, not the plumbing.

## Alternative discussed (opinion)

Store the block **and** the reference. Three properties, pick two: (a) no extra
call per read, (b) display always current, (c) survives the book being down.

| Design | a | b | c |
|---|---|---|---|
| Reference only, resolve on read — **as built** | ✗ | ✓ | ✗ |
| Copy + reference, refresh on read, fall back to copy on failure | ✗ | ✓ | ✓ |
| Copy + reference, refresh at boundaries (open, submit, amend-start) | ✓ | stale window | ✓ |

### Measured costs and what a copy would actually change (agent, 17 Aug)

- **Refresh-on-read changes call volume by zero — the check *is* the lookup.**
- Today: **6** GET-by-id per journey page, GET *and* POST alike (the sanitiser is
  global, `routes.js:52` → `engine/read.js:34`; `commit` calls `get` first, so a
  save is no cheaper than a render). **One "Save and continue" = 11 reads**
  (6 frontend + 5 backend). Dashboard at 20 rows = **≤40**.
- Backend resolves its 5 **sequentially** at 2s connect + 2s read
  (`application.yml:52-53`) — **~20s worst-case write latency**. Removing that is
  the single biggest win available and the one place a copy needs no new write
  channel.
- What a copy buys: outage fallback (today the throw propagates by design and
  500s every journey page), and the collapse of the dual-shape display plumbing.
- **The deletion rule is the binding constraint.** No address-book → notification
  deletion signal exists (no event, webhook or consumer found). A stored copy has
  no route to learn it holds a tombstone, so it cannot serve "deleted behaves as
  never entered" without the lookup. Either the rule relaxes, or a signal gets
  built, or the call stays.
- **Storing the copy in `answers` is hazardous.** Every commit anywhere rebuilds
  the fulfilment from `{...current.answers, ...patch}` (`canonical.js:42-58`), so
  freshness gets pegged to "last save anywhere". `assertRecognisedAnswerKeys`
  will **not** catch it — scalar values are opaque to the sweep
  (`obligation-source.js:128-129`). The current protection is a comment.
- Backend already strips details beside a reference — `ConsignmentParty.forStorage`
  (`ConsignmentParty.java:48-53`) — so a copy is a **policy** change, not a schema
  change; the slots already exist.
- **EUDPA-295 entanglement is worse than assumed.** `submittedBaseline` is created
  at **amend start, not submit** (`NotificationService.java:185`) and freezes the
  *pointer*, not the content (`NotificationContentSnapshotTest.java:156-166`). The
  moment `forStorage` stops stripping, the baseline silently becomes a content
  snapshot with no edit to snapshot code, and cancel-amend's `applyTo` would
  restore stale details over fresh ones. A genuinely frozen copy already exists —
  in the immutable `outbox.data` (`TradeParty.java:24-32`, replayed verbatim).

### Two further defects found while measuring

- **D26 is violated as well as D24.** The frontend commits
  `contactAddress: { addressId }` (`contact/controller.js:100`), which maps to the
  backend `consignment` field (`direct-fields.js:23`). The backend resolver covers
  only 5 roles — **not** `consignment` (`ConsignmentPartyResolver.java:74-83`) —
  and the GBNAG mapper has no `consignment` mapping at all. So the contact address
  is stored as a reference **no backend code can resolve**, readable only by the
  live-animals frontend. Both fields the ticket said must stay inline were made
  references.
- **AC5's email and phone never reach the transmitted document.** They are
  resolved but not mapped, with an in-code `// TODO(EUDPA-294 gap)`
  (`TradeParty.java:21-23`), against AC5's "full Standard Address Block — name,
  contact details, and address including postcode, county, email and phone".

Notes:

- The tech note's ban on copies argues against **push** ("any fan-out on edit is a
  bug"). Storing a copy refreshed on read has no fan-out; the note rules out both
  and only one deserved it.
- **The deletion rule, not AC4, forces the per-read call.** Edits tolerate a stale
  window; "a deleted address behaves as if never entered" does not. Ask UCD
  whether next-open is soon enough — the caching design falls out of the answer.
- A cached copy must stay visibly distinct from the frozen snapshot EUDPA-295 adds
  at submit, or someone will eventually refresh the snapshot. 295 already requires
  the two to coexist, so settle the shape while it is unbuilt.

## Round 2 — author's changes (19 Aug, two read-only agents)

Branches re-read at PR heads. Workspace PR #48 also open (drops the now-dead
`LIVE_ANIMALS_MODE=real` from the stack frontend).

**Fixed**

- **D24 + D26 honoured.** `ConsignmentParty.inlineOnly()` stores place of origin
  and the consignment contact as copies, stripping any stray `addressId`
  (`NotificationService.java:477-485`). Frontend decides at one point —
  `party-picker/selection.js:29-36`, driven by `inline: true` in `parties.js`.
  Referencable roles are now consignor, consignee, importer, destination.
- **Email/phone reach GBNAG** via `definedContactFrom` (`TradeParty.java:28,44-49`);
  the `TODO(EUDPA-294 gap)` is gone.
- **~20s sequential resolve gone** — virtual-thread fan-out over distinct ids
  (`ConsignmentPartyResolver.java:96-110`). Timeouts still 2s/2s.
- **Create-address removed** from the frontend: controller, template, tests, route
  and `createAddressHref` all deleted; the client has no POST
  (`address-book/index.js:17-19` — "reads and never writes").
- **One flag.** `app/services/mode.js` deleted; single `STUB_MODE`
  (`config.js:247-252`, default false) read via `isStubMode()`.
- PUT now carries `{notification, actor}`, so draft saves no longer resolve with a
  null organisation.

**Still open**

- `Actor.organisationId` remains unvalidated request-body input forwarded as the
  address book's identity header (`ActorRequest.java:11-29`).
- The consignment contact has **no GBNAG slot at all**
  (`SpecifiedConsignment.java:31-37`) — confirm whether the document should carry it.
- `submittedBaseline` still freezes the reference for the four referencable roles
  (295's job).
- **No link out to INS.** Create is gone but nothing replaces it — a trader needing
  a new address has no route from the journey. The cross-app link was supposed to
  land *before* the page was retired.
- Cost: still up to **4** lookups per journey page (down from 6) via the global
  hook, and the dashboard still resolves per row — up to **40** on a 20-row page.

**Sign-in scaffolding — question settled**

Cause is as suspected: the FIT suite previously ran `AUTH_ENABLED=false`
(`package.json:18`); the branch removed it because the address-book client throws
without an org (`client.js:22-27`). But nothing became removable — every org-id
line in the diff is an addition, and copies did not remove the need (pickers read
live, four refs resolve per read, dashboard resolves per row).

The specs are **not** sign-in tests: 26 files gained a one-line `beforeEach`
calling a 5-line navigation helper (`fit/sign-in.js:5-9`); only
`stub-sign-in.test.js` asserts new behaviour, for the route this branch adds; and
**nothing asserts that real Defra ID sign-in works**. Real sign-in behaviour is
unchanged apart from strategy registration order (`plugins/auth.js:16-20`).

Reviewable point is the shape, not the specs: the branch ships an unauthenticated
session-minting route guarded by stub-mode-and-not-production, with
`NODE_ENV=production` hardcoded in the Dockerfile — three layers, and they hold.
The author's own commit message notes the stack already has a Defra ID stub, so
the open question is why the self-contained suite needs an in-app route.

**Test gaps (new)**

- Copy assertions pin only `name` and absent `addressId` — not the address block,
  email or phone. A copy that dropped the postcode would pass.
- No E2E exercises an address book that is **down**, and no spec deletes an address
  then **submits** — the two paths most dependent on the new failure semantics rest
  on backend unit tests alone.

**Minor residuals**

- `scripts/lighthouse/seed-address-book.js` still POSTs — "never writes" is true of
  `src/` only.
- Stale comment `direct-fields.js:11-12` cites the deleted `toRequest`.

## RULING (Sam, meeting) — rip out the org scoping

There is no authorisation in this service. The org-scoping introduced by this PR
is a half-implementation of it and must come out: **everyone has access to
everything, exactly as notifications already behave today.** This is not an open
question — it was decided in the meeting.

Consequence to implement, not to relitigate: the address book requires an
organisation in the path and the `Trade-Imports-Organisation-Id` header (400
without it), so removal means a single fixed value, not an absent one. The animals
frontend (picker reads), the animals backend (submit-time resolve via
`actor.organisationId`) and the INS frontend (writes) must all use the SAME fixed
value, or the pickers, the outbox and the address-book UI read different books.

Reverts with it (all added by this PR): `common/helpers/organisation-id.js` and
its threading through `resolve-parties.js`, `party-picker.controller.js`,
`contact/controller.js`, `marshal/list-item.js`, `real/lifecycle/read.js`,
`engine/journey.js`; the dashboard no-org guard (`journey.js:109-111`);
`organisationId` in `test-support.js` credentials; and the whole sign-in chain —
`fit/sign-in.js`, 26 `beforeEach` hooks, `stub-sign-in.js` + test, the `auth.js`
stub branch + test, and `fit:start` back to `AUTH_ENABLED=false`.

Real org scoping returns as its own sweep: owner field on the notification,
authenticated identity at the backend boundary, org-scoped queries.

### ACCEPTED (Sam, 19 Aug) — no link to the INS address book

The missing signpost from the animals journey to the INS address book is
**accepted as a temporary measure**. Traders needing a new address hop over
manually. Closed — supersedes the "no link out to INS" item under Round 2 /
Still open, and the sequencing note that said the cross-app link had to land
before create-address was retired.
