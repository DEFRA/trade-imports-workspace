# EUDPA-333 — Delegate address creation to the INS address book service

Local snapshot of the Jira ticket, fetched from
<https://eaflood.atlassian.net/browse/EUDPA-333> on **2026-08-25** via
`tim jira ticket EUDPA-333`. Two rounds of description edits have been pushed
since and folded in here:

- **Round 1 (25 Aug)** — one config AC, two organisation-identity ACs, one config
  tech note.
- **Round 2 (26 Aug)** — settled the return redirect on one model: INS builds it
  from component parts, no relative path is sent or accepted. Renamed *journey
  key* to *journey type*, replaced the placeholder ids with real ones, and added
  notes on the single registry entry, the single return route, the obligation-id
  reverse map and the `obligationId` misnomer.
- **Round 3 (26 Aug)** — the journey type is `gbn-ag`, the notification-reference
  prefix denoting the live animals import from the EU, rather than a name taken
  from a service or repository. Added why, and that INS must not derive the
  journey type from the reference number even though the two now overlap.
- **Round 4 (26 Aug)** — editorial only. Tightened the prose from 15,538 to 13,914
  characters with no facts removed: the two config tech notes merged into *Three
  convict entries, not two*, the obligation reverse-map and `obligationId`
  misnomer notes became bullets under *One return route*, and the `gbn-ag`
  rationale went from three paragraphs to one. Verified by diffing the complete
  set of monospaced identifiers before and after — the only one absent is a
  repeated `GBN-AG` token whose fact survives in the surrounding sentence.

This file mirrors the Jira description; the summary below is written as markdown
rather than Jira wiki markup, so formatting differs but wording does not.

Verified byte-identical to Jira after each push.

| Field | Value |
|---|---|
| Status | To Do |
| Type | Story |
| Priority | Medium |
| Assignee | unassigned |

Jira is the source of truth. Re-run `tim jira ticket EUDPA-333 --json` to refresh
this file; do not edit it to record decisions — put those in
[`discussion.md`](discussion.md) or in the ticket itself.

---

## Story

**As** a Trader,
**I want** to add an address without leaving the notification I am working on,
**So that** I can use an address that is not in my address book yet, and only ever
learn one address form.

## Description

`trade-imports-ins-frontend` owns the address book — add, edit, delete, list and
view, a single Joi schema in `address-book/address-schema.js`, a country list
drawn from MDM, and writes through `addressBookClient` to the address book API.
It is the only writer.

EUDPA-294 pointed the live-animals journey at that same book. The journey's
pickers now search and select real records and resolve them by id, and the
journey's own address form was removed.

What is missing is the way back. The pickers are select-only — there is no way to
add an address from inside the journey. A Trader whose address is not already in
their book has nowhere to go.

Add that route. The journey sends the Trader to the INS address book form and
brings them back to where they were, with the record they just saved selected.
Keep the handshake journey-agnostic so other INS journeys can reuse it, and keep
the form itself in one place so functionality and validation stay in one place.

Changing an existing address stays where it is, in the address book itself. A
Trader manages their book in INS; the journey only needs to add what is missing
and pick from what is there.

## Acceptance criteria

### Adding an address

**Given** a Trader is choosing an address for any consignment party
**When** they choose to add a new address
**Then** they are taken to the INS address book form, which supplies the field
labels, validation and country list
**And** the journey and the party they came from are carried across so they can be
returned to.

**Given** a Trader has completed the INS address form
**When** they save it
**Then** the address is written to the address book API by the INS service, and
appears in their address book for any later notification
**And** they are returned to the page they started from, with the new address
selected for the party they were completing.

- The return carries the identifier of the saved address book record only, not the
  address fields. The originating journey reads the record back from the address
  book API.

### Leaving without saving

**Given** a Trader is on the INS address form having arrived from a journey
**When** they cancel
**Then** they are returned to the page they started from
**And** no address is created or changed, and their journey answers are unchanged.

### Contract and safety

- The service never redirects to a web address supplied on the request. A Trader
  is returned only to a registered journey, so a crafted link cannot send them to
  another site.
- An unrecognised journey type is refused rather than followed.
- INS knows where the live-animals journey lives, and animals knows where the INS
  address book lives. Both locations are set per environment, so the same build
  works locally and on each CDP environment.
- Each service fails to start when the location it needs is missing or malformed,
  rather than accepting the request and failing once a Trader is part-way through.
- The animals frontend's address book location is declared and validated the same
  way, so the rule above covers all three of its service locations. Today that one
  is read straight from the environment and would not fail fast.
- The local stack is configured so the handshake works end to end without anyone
  setting it up by hand.
- The Trader's sign-in should carry across both services — they won't be asked to
  sign in again mid-journey. We haven't actually implemented authentication
  properly yet, so if the user isn't signed in on both services don't handle that
  case or pass across a cookie as part of this ticket.
- If the INS service or the address book API cannot be reached, the Trader sees an
  error and their existing journey answers are preserved.
- A return carrying an address saved for a different organisation than the session
  coming back shows the Trader an error. It is never treated as no selection, which
  would leave the party silently empty. This is about two signed-in sessions
  disagreeing, not about the unsigned-in case ruled out above.
- A returned address that no longer resolves shows the Trader an error, rather than
  returning them to a party that looks untouched. A record the address book cannot
  find and a service it cannot reach are different cases, and both are handled.
- Back-link and browser-back behaviour returns the Trader to the originating page,
  not into a partly-completed form.

### Reuse

- All six entry points offer it — the five consignment parties and the consignment
  contact.
- The handshake takes the journey type and the notification and obligation ids
  identifying where in that journey the Trader was, and holds no
  live-animals-specific logic, so another journey can adopt it without changing
  the INS service.
- There is still only one address form, in INS. The journey gains a way to reach
  it, not a second copy of it.

---

## Tech notes

### Return destination — register journeys, never accept a URL

INS does not take a return URL, or any part of one, from the request. Animals
sends a journey type and the ids that identify the page the Trader came from:

```text
/trade-imports-ins-frontend.{env}.cdp-int.defra.cloud/address-book/add?journey-type=gbn-ag&notification-id=GBN-AG-26-4F7K2P&obligation-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d
```

Both ids are real shapes, not placeholders. `notification-id` is the
notification's reference number — the same value the journey already carries as
`journeyId` in its own routes, generated as `GBN-AG-{YY}-{XXXXXX}` with a
Crockford base32 body (`ReferenceNumberGenerator` in the backend).
`obligation-id` is the consignor obligation from `obligations/sections/parties.js`.
Obligation ids are UUIDs, so the value is opaque to INS by construction — there is
nothing in it for INS to parse, and nothing that leaks the journey's internals
into the registry.

INS looks the journey type up in its own registry of known journeys and builds the
whole return URL itself — origin and route shape from the registry entry,
`notification-id` and `obligation-id` substituted into it as opaque values.
Nothing path-like crosses the wire, so there is no open redirect to defend against
and no sanitiser to write: the class of bug is designed out rather than filtered.
An unrecognised journey type is refused.

**One registry entry per journey type, not one per obligation.** The entry is a
single URL template:

```text
gbn-ag → {animalsUrl}/notifications/{notification-id}/address-return?obligation-id={obligation-id}
```

INS substitutes two flat values and redirects. It never interprets either, and it
holds no map from an obligation to a page — that mapping is the journey's own
business and lives in the journey. Onboarding another journey is one line in the
registry.

**Why `gbn-ag` and not a service name.** `GBN-AG` is the prefix every live-animals
notification reference carries — `GBN-AG-{YY}-{XXXXXX}` — and it denotes the live
animals import from the EU. It is the term the domain already uses for this class
of notification, so it outlives any renaming of the frontend that happens to serve
it today. A journey type named after a repository or a service would not.

The journey type and the notification reference therefore carry the same
information, and that is fine — but **INS must not derive one from the other.** The
journey type is what INS looks up; the notification id stays opaque and is only
ever substituted into the registry template. Parsing the reference number inside
INS would couple it to a format the animals backend owns and can change.

`gbn-ag` is the only journey type to register for now.

### Where the registry lives — split it

- **The journey list is code.** Which journeys exist, their journey types and their
  route shapes are known ahead of time and change only when a journey is
  onboarded. No configuration.
- **Each journey's base URL is configuration.** The frontends are separate
  services on separate origins — animals on port 3000, INS on 3002 locally, and
  different hostnames per CDP environment.

**Both services need a new setting, and neither has one today.** INS has no
knowledge of where the animals frontend lives; animals has no knowledge of where
INS lives, and needs it to send the Trader out in the first place. Two convict
entries, one per repo, each following the `TRADE_IMPORTS_*_URL` pattern already in
those files, and each validated at boot by `config.validate()`.

**These are browser redirects, not service-to-service calls** — so both values must
be the address the Trader's browser can reach (`http://localhost:3000`,
`http://localhost:3002` locally), **not** a container-internal
`host.docker.internal` address. That differs from every other
`TRADE_IMPORTS_*_URL` in the stack, which are server-to-server and do use the
internal form. Getting this wrong produces a redirect that works in a container
health check and breaks in a browser.

**Files** — `src/config/config.js` in each frontend, plus the service environment
blocks in `docker/stack/frontend.compose.yml` in the workspace repo so the local
stack works without hand-configuration.

### Bring the animals address book URL into config while you are there

Animals reads the address book location straight from `process.env` with a
hardcoded fallback (`services/address-book/client.js`), so it is the one service
location convict never sees and `config.validate()` never checks. A typo in the
environment variable name starts the service cleanly, points it at
`localhost:8089`, and fails only when a Trader opens a picker — exactly the late
failure the AC above rules out.

Give it a `tradeImportsAddressBookApi.baseUrl` entry beside
`tradeImportsAnimalsBackendApi` and `tradeImportsReferenceDataApi`, and read it
through `config.get`. INS already declares the same setting this way, so this
brings animals in line rather than inventing a pattern, and it makes the new
INS-location entry a copy of a local example instead of the first of its kind.

### Most of the animals side already exists — reuse it, do not rebuild it

EUDPA-294 left the journey ready for an identifier coming back:

- `services/address-book/index.js` → `party(orgId, id)` resolves one record by id
  against the API. That is the whole of "read the record back".
- `party-picker/selection.js` → `answerFor(party, chosen)` already builds the
  answer to commit from a chosen record, and `committedId` reads the committed
  `addressId` back to pre-tick the row.
- `resolve-parties.js` → `resolveParties` resolves references on read and
  `withoutUnresolvedPartyRefs` clears ones that no longer resolve.

The return handler should land on the same path a normal pick takes: resolve the
returned id, then commit through `answerFor`. Anything that writes a party answer
by hand will diverge from the picker.

**One return route, not six.** Animals gains a single `address-return` route that
resolves the `obligation-id` to the party it belongs to, then does the work. The
six entry points do not share a route shape — five parties sit at
`consignors/select`, `destinations/select` and so on while the consignment contact
sits at `consignment/contact/select`. One route absorbs that; six return handlers
would repeat the resolve, the organisation check and the commit six times, and
would push the obligation-to-page mapping into INS where it does not belong.

**Resolving the obligation id back to a party.** The bindings that already exist
are the mapping, read backwards. `features/addresses/evaluation.js` binds each
party's answers key to its obligation (`scalar({ field: 'consignor', obligation:
consignor })`), and `features/contact/evaluation.js` does the same for the
contact. A reverse lookup from obligation id to that field gives the party, and
`partyOf` in `parties.js` turns the field into the party record the picker already
uses. Build the reverse map from the bindings rather than hand-listing six UUIDs,
so a seventh party cannot be added without it appearing here.

**Beware an existing misnomer.** The parameter named `obligationId` in
`check-answers/view-model/rows/party-row.js` and `rows/change-link.js` does not
hold an obligation id — callers pass the obligation's `name` (`'consignor'`), and
the lookup is by name-path. Do not follow that spelling when writing the return
route, and do not assume a variable called `obligationId` elsewhere in the repo
holds a UUID.

**Referenced and inline parties behave differently** — `placeOfOrigin` and the
consignment contact carry `inline: true`, so the notification keeps a copy of the
details and a later edit in the book does not reach it. The other four hold the
`addressId` alone and resolve on read. `answerFor` already handles both, which is
the main reason to route through it.

**Organisation identity** — `client.js` sends `Trade-Imports-Organisation-Id` from
the signed-in session and throws outright if there is none; INS has its own
`requireOrganisationId`. Both sides must be acting for the *same* organisation, or
the Trader is returned an id their own book cannot resolve. Worth an explicit
check on return rather than trusting it.

**Stub mode** — `isStubMode()` runs the journey against `STUB_BOOK` with no
dependent services and no Defra ID, so INS is not running either. The add link
must be hidden or inert in that mode rather than sending a Trader to a service
that is not there.

### Out of scope

**Changing an address from the journey.** Only creation is delegated. A Trader
edits an existing record in the address book itself. The handshake is built so the
same pattern could later point at the INS edit route, but no entry point into it
is added here — and note the consequence for the four referenced parties: a Trader
who picked the wrong address changes their selection by picking again, not by
editing the record.

**Welsh copy in INS.** The animals journey has a `copyFor` layer carrying English
and Welsh for every field and error. The INS address book has no copy layer at all
— `add/index.njk` and its siblings hardcode English, and the repo has no locale
handling beyond `lang="en"` in `assets.html`. Sending a Trader to the INS form
therefore takes them to an English-only page. Accepted here, but note where the
gap ends up: once every journey's address form is the INS one, INS is the single
thing standing between the service and Welsh Language Standards compliance, for
every journey rather than just this one. Giving INS a copy layer needs its own
ticket before any Welsh launch.

**Field-name alignment.** The journey and the API use different names for the same
fields (`postalOrZipCode` / `postcode`, `country` / `countryCode`,
`telephoneNumber` / `phone`, `emailAddress` / `email`). EUDPA-294 chose
deliberately to keep the journey's names and map at the boundary in
`client.toRecord()`, on the grounds that only the `addressId` crosses to the
backend. That decision stands for this ticket. Whether to standardise the journey
on the API's names is a separate question and needs its own ticket.

**Not required by this ticket** — `transport/private-transporter-details/` and
`commodities/animal-identification/address/fields.js` use `telephoneNumber` and
`emailAddress` too, but they are not address book records.
