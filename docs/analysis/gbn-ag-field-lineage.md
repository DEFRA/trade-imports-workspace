# GBN-AG field lineage: frontend → NotificationAggregate → GBN-AG → PIMS GBN-AG

Field-by-field audit of every hop a live-animals notification passes through, from
the user-facing frontend journey to the PIMS-specific event payload, looking for
fields that are silently dropped along the way and for gaps in the
`trade-imports-schemas` models that document the pipeline.

**Audited as of** 2026-09-02, against `main` on:

| Repo | Commit (2026-09-02 original) | Commit (2026-09-28 §5 re-check) | Commit (2026-10-19 §6 PIMS v0.2.0 review) |
|---|---|---|---|
| `trade-imports-animals-frontend` | `1b53dbde` | `9b45dc9e` | `97663584` (`main`) |
| `trade-imports-animals-backend` | `0ba6596` | `ca0a4b8` | `9c852a9` (EUDPA-614 branch = `main` `49f4168` + EUDPA-614) |
| `trade-imports-dynamics-gateway` | `4860117` | `c3ec805` | `f391259` (EUDPA-614 branch = `main` `9c02cbd` + EUDPA-614) |
| `trade-imports-schemas` | `7a0e269` | `cd8d5b0` | `73747f3` (`main`) |

The 2026-09-28 column is the state §5's findings and the corrections marked with that date
were verified against — not a full re-audit of §§1–4, which remain as-of 2026-09-02 plus
the dated amendments folded in since. The same goes for the 2026-10-19 column and §6: it
re-checks the seven fields PIMS raised, plus the two already planned for PIMS v0.3.0, and
nothing else.

Cross-checked against the Confluence page
[INS Portal → PIMS data mapping](https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6525093960)
(v18, updated 2026-08-25), which independently confirms several of the gaps below
from the PIMS side.

**Living document.** This audit fed three follow-up tickets, one per hop — EUDPA-368
(§1), EUDPA-369 (§2) and EUDPA-370 (§3). As each ticket lands, its PR decisions, any
findings that weren't in the original pass, and any corrections get folded back into
the relevant section below (marked with the date and source), so the tables track
current status rather than staying frozen at the 2026-09-02 snapshot. Only re-run the
full audit from scratch (ask an agent to repeat it) if the codebases have moved on in
ways these three tickets don't cover — e.g. ahead of a v3 pass.

§5 records a **2026-09-28** consumer-side query from the PIMS team and what checking it
turned up: two corrections to earlier sections (§1's Microchip finding, §1's
accompanying-documents "not a gap"), one new gap not previously recorded at any hop
(§2's accompanying documents), and a reusable answer to "is there a schema / a data
dictionary". Read §5 first if you are answering a similar question — including the
"check which `schemaVersion` the consumer read" step, which now precedes any
investigation of a reported missing field.

§6 records PIMS's **2026-10-19** review of the v0.2.0 schema: seven fields they still need,
traced through every hop, plus the two fields already planned for v0.3.0. It is the
evidence base for EUDPA-615 (PIMS v0.3.0). It found two defects as well as missing value
lists: the internal market purpose never reaches the event, and the generic event breaks
its own schema in two places.

| Ticket | Hop | Status | PRs |
|---|---|---|---|
| [EUDPA-368](https://eaflood.atlassian.net/browse/EUDPA-368) | §1 frontend → aggregate | IN QA | frontend#300, backend#94, tests#187 (closed) |
| [EUDPA-369](https://eaflood.atlassian.net/browse/EUDPA-369) | §2 aggregate → generic GBN-AG | Merged (all 3 PRs) | backend#96, dynamics-gateway#20, tests#212 (merged) |
| [EUDPA-370](https://eaflood.atlassian.net/browse/EUDPA-370) | §3 generic → PIMS | Merged (all PRs) — dual-emitting v0.1.0 and v0.2.0 | schemas#56, schemas#57, schemas#58; dynamics-gateway#21, dynamics-gateway#23 (all merged) |
| [EUDPA-614](https://eaflood.atlassian.net/browse/EUDPA-614) | §2 country subdivision + region of origin code on the event | schemas merged; backend, gateway, ins-backend, tests PRs open | schemas#65, schemas#66 (merged); backend#111, dynamics-gateway#29, ins-backend#24, ins-tests#36 (open) |
| [EUDPA-615](https://eaflood.atlassian.net/browse/EUDPA-615) | §3 / §6 generic → PIMS v0.3.0 | Being rewritten from §6 | — |

A fuller, table-formatted version of this analysis (colour-coded mapped/gap/derived
pills, collapsible full field inventories per hop) was published as a Claude
Artifact during the original investigation: *GBN-AG Field Lineage*. That artifact
is not durable/version-controlled — this document is the reference copy. Re-run the
analysis (ask an agent to repeat this field-lineage audit) if the codebases have
moved on significantly since the commits above.

The pipeline has four representations of a notification:

```
frontend journey (trade-imports-animals-frontend)
  → NotificationAggregate.notification (trade-imports-animals-backend)
    → generic GBN-AG event (outbox/gbnag/*, sent to dynamics-gateway + ins-backend)
      → PIMS-specific GBN-AG event (trade-imports-dynamics-gateway, sent to PIMS)
```

The two GBN-AG shapes are documented (not code-dependent) in `trade-imports-schemas`:
`schemas/profiles/imports/gb/gbn-ag-v1.schema.json` (generic) and, for PIMS,
`schemas/profiles/imports/gb/pims/gbn-ag-pims-v0.2.0.schema.json` — **the current
contract**, confirmed by PIMS on 2026-09-22. `gbn-ag-pims-v0.1.0.schema.json` is still
published and still emitted alongside it (see §5), but describes the pre-EUDPA-370 shape;
cite v0.2.0 to consumers unless you specifically mean the legacy stream.

---

## 1. Frontend → `NotificationAggregate.notification`

**Backend side of this hop is complete.** `NotificationService.setNotificationDetails`
(`NotificationService.java:527-548`) copies every `NotificationBase` field 1:1 from
the inbound DTO to `Notification`. Every gap below originates entirely on the
**frontend** side — in `notification-mapper/mapper-a/` — before the outbound JSON
payload is even built. The frontend's own `notification-mapper.test.js` documents
most of these gaps in an `answersWithGaps()` fixture, which this audit's findings
match exactly (independent confirmation).

### Fields with no backend model field to receive them at all

These aren't missed mapping lines — the backend `Notification`/`Species`/
`AdditionalDetails`/`Origin` models have no slot for the value, so the field can't
cross even if someone wired the frontend mapper up.

| Field | Notes | Evidence |
|---|---|---|
| `regionOfOriginCode` | The actual region code value. Only the boolean `requiresRegionCode` flag crosses; the code itself never does. Mandatory whenever a region code is required. | `notification-mapper/mapper-a/sections/origin.js:5`; absence confirmed `notification-mapper.test.js:270`; `Origin.java` has no field |
| `purposeInInternalMarket` | Mandatory when `reasonForImport === 'internalMarket'`. | `sets/live-animals/obligations/sections/import-reason.js:43-56`; absence confirmed test line 267 |
| `destinationCountry` | Mandatory for transit/transhipment reasons. **Live, wired page — but not caught by the repo's own gap-test.** | `import-reason.js:66-79` |
| `portOfExit` | Mandatory for transit/temporary-admission-horses. **Not test-covered.** | `import-reason.js:86-99` |
| `exitDate` | Mandatory for temporary-admission-horses. **Not test-covered.** | `import-reason.js:103-116` |
| `animalIdentifierTattoo` (per-unit) | Part of a mandatory "any-of-six" identifier group. | `obligations/sections/commodities/identifiers.js:127-135` |
| `horseName` (per-unit) | Same any-of-six group. | `identifiers.js:147-155` |
| `animalIdentifierIdentificationDetails` (per-unit) | Same group. | `identifiers.js:174-185` |
| `animalIdentifierDescription` (per-unit) | Same group. | `identifiers.js:187-198` |
| `permanentAddress` (per-unit, mandatory for some commodities) | No mapper reference; no backend field anywhere in `Species.java`/`CommodityComplement.java`. This is the field an owner's post-import address lives on. | `identifiers.js:200-208` |

**Status (EUDPA-368, IN QA):** eight of the ten rows above are now wired — new
`Origin`/`NotificationBase` scalars for the top five, and a new
`Species.animalIdentifiers` list (tattoo, horse name, permanent address) for the
per-unit fields — landed in frontend PR #300 and backend PR #94 (both closed, pending
QA sign-off). The remaining two, `animalIdentifierIdentificationDetails` and
`animalIdentifierDescription`, weren't fixed — they were removed from scope entirely:
EUDPA-500 dropped both fields from the any-of-six identifier group, so there's nothing
left to map.

### Fields the backend already has a home for — pure mapper omissions

The backend `Transport.java` model already has these fields; `transportFromFulfilment`
just never reads them. Cheapest gaps to close.

| Field | Evidence |
|---|---|
| `meansOfTransport` | `transport.js:21` destructures only `{ arrivalDateAtPort, portOfEntry }`; obligation gated at `evaluation.js:24` |
| `transportIdentification` | Same; `evaluation.js:26-28` |
| `transportDocumentReference` | Same; `evaluation.js:29-32` |
| `transitedCountries` | Same; `evaluation.js:33` |

**Status (EUDPA-368, IN QA):** all four fixed, same PRs as above (frontend #300,
backend #94).

### Cardinality loss (not a missing field)

`species-entry.js:10,16-17` reads `line.animalIdentifiers?.[0]` only — **ear tag and
passport are mapped from the first animal-identifier unit on a species line only.**
A second individually-tagged animal on the same line silently loses its identifiers.
Confirmed intentional-but-lossy by
`notification-mapper.test.js:301-329` ("Should intentionally keep ear tag and
passport from only the first unit").

**Status (EUDPA-368, IN QA):** fixed — `species-entry.js` now maps every
animal-identifier unit on a line via the new `animalIdentifiers` list, not just the
first (frontend PR #300).

### Not gaps, on inspection

- `documents` (accompanying-document metadata) — reaches the backend via a separate
  `DocumentController`/aggregate, correctly out of scope for the `notification`
  subnode (`NotificationService.java:48`). **Correction (2026-09-28): out of scope for
  this hop, but a real gap one hop later** — the data reaches the backend and then stops.
  See §2's "Accompanying documents never reach the event at all".
- `declaration` — a submission consent checkbox, no domain data.

### New findings from EUDPA-368 planning (2026-09-02, Ian Griffiths — not in the original audit)

Checked against the frontend code and the Confluence
[Live Animals Data Fields – V4](https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6497338582)
page, including its own "Out of Scope Data Elements" table, while scoping EUDPA-368:

- **Weight (KG) and Transporter Status** — confirmed genuinely missing from *both* the
  frontend and the V4 page, not just unmapped downstream. See §4 point 3, which already
  flags these as needing a new schema slot; this confirms there's no frontend
  collection to build against yet either. New scope — not yet raised with Monica/Judith.
- **Species Family Name / Species Class Name / Species Type Name** (domestic vs game) —
  absent from both the frontend and the V4 page. The PIMS mapping page itself marks
  these tentative ("TBC"/"may also be required"), not confirmed. "Domestic"/"game"
  wording does appear on the V4 page, but only inside commodity-code list entries (e.g.
  "Pig (Domestic)", "Game Birds") — may already be derivable from the commodity code the
  trader picks, the same way scientific/common name are resolved from the CN code
  rather than typed in.
- **Microchip and Leg Ring** identifier types — PIMS lists 7 animal-identifier types;
  the frontend implements 6 (Passport, Tattoo, Ear Tag, Horse Name, plus free-text
  Identification Details/Description as a fallback — now removed by EUDPA-500, see
  above). Not silent gaps: Microchip never appears on the V4 page at all, and Leg
  Ring's close cousin "Animal Identifier – Wing Ring" was explicitly considered and
  de-scoped by Monica Rivera on 2026-05-29 (V4 page's own "Out of Scope" table) — PIMS
  may be expecting something design already deliberately cut.

  **Correction (2026-09-28): the Microchip half of this is now stale.** EUDPA-398
  (frontend commit `bcad371`) added a microchip field for horses, cats, dogs and ferrets
  — the `animalIdentifierMicrochip` obligation — and the backend emits it as a `MICROCHIP`
  typeCode (`TradeProductInstance.java`, `identifiersOf`). Microchip is fully wired
  frontend → aggregate → generic GBN-AG → PIMS. **`LEG_RING` remains unimplemented**, and
  is now a documentation mismatch as well as an absent field: `pims-data-mapping.md`'s
  Animal Identifier row lists `LEG_RING` among the "established typeCodes" alongside the
  four that are actually emitted (`EAR_TAG`, `PASSPORT`, `MICROCHIP`, `TATTOO`). Either
  implement it or strike it from that row — today a PIMS reader of the mapping doc would
  reasonably expect it.
- **`exchangedDocument.issuer` / "Person Responsible for Load"** — refines the §2
  correction below: this field *is* on the V4 page, explicitly marked "Consumed on
  authentication" / sourced from "gov identity." By design it should come from the
  notifier's authenticated Defra ID/organisation record, not a journey page — so "no
  frontend source field" (as originally written in §2) is only true in the narrow
  sense of no journey page collecting it. The real gap may be that this identity data
  isn't yet threaded from sign-in into the outbound notification payload, not that no
  source exists. Worth confirming before scoping the Responsible-Person-for-Load
  follow-up ticket.

---

## 2. `NotificationAggregate.notification` → generic GBN-AG

Mapped by `GbnAgEventDataMapper` → `GbnAgEventData.from` (`outbox/gbnag/` in
`trade-imports-animals-backend`). The backend's own test suite
(`GbnAgMapperTest.java`) already tags most of these as `gap G1`–`G20` / `candidate
anomaly A3/B1/B4` — this audit's independent trace matches those tags exactly.

### Not mapped

| `notification` field | Why | Evidence |
|---|---|---|
| `origin.requiresRegionCode` | Hardcoded null regardless of source value | `TradeCountry.java:10-15`; gap G10 |
| `commodity.name` | `TradeLineItem.description` hardcoded null instead | anomaly A3; `GbnAgMapperTest.java:163-165` |
| `commodity.commodityComplement[].species[].value` | Never read; only complement-level totals used | `TradeProductInstance.java:30-38`; gap G20 |
| `...species[].text` | Same | gap G20 |
| `...species[].noOfAnimals` | Per-species counts never read, only the aggregate total | — |
| `...species[].noOfPackages` | Same | — |
| **`consignment`** (whole party object) | No GBN-AG party slot exists for this role at all | `SpecifiedConsignment.from` never calls it; `GbnAgMapperTest.java:218-220` |
| **`cphNumber`** | No slot to map into — `SpecifiedConsignment.java` has no `finalDestinationLocation` field at all (see §4 recommendation 1) | `GbnAgMapperTest.java:214-216` |
| `transport.transportDocumentReference` | `transportContractRelatedReferencedDocument` hardcoded null | candidate anomaly B1; `LogisticsTransportMovement.java:33` |
| `transport.transitedCountries` | Hardcoded null | `SpecifiedConsignment.java:41` |

**Status (EUDPA-369, Deskcheck — PRs open, not yet merged):**
`origin.requiresRegionCode`, `commodity.name`, all four per-species fields, the
`consignment` party slot, and both `transport.*` fields above are addressed in backend
PR #96 (+ gateway PR #20, tests PR #212). `cphNumber` is only partially addressed: it
now reaches `finalDestinationLocation.identifier`, but the schema-mandated address
alongside it is deliberately not sent — no agreed source for which address to use (see
open question below; not blocking EUDPA-369).

Two further gaps surfaced during EUDPA-369 planning (Amir Naveed, 2026-09-11), not
present in the original pass:

- **Species id** — each species line has an id (e.g. `1148346` for Bos taurus) that has
  no GBN-AG schema slot at all and isn't sent. Whether one is needed is an open
  question, not scheduled against any ticket yet.
- **CPH number's address** — as above: `finalDestinationLocation.identifier` is sent,
  the schema-mandated accompanying address is not. Flagged as an open question for
  whoever owns the schema/Confluence mapping to resolve; not scoped into any ticket yet.
- **`TradeLineItem.commonName`** — still sends the commodity name (e.g. "Cow") rather
  than the species' everyday name (e.g. "Cattle") that the schema and PIMS mapping doc
  call for; `ins-backend` already displays the commodity-name value on notification
  cards. A proper fix spans frontend, backend and ins-backend — flagged as needing a
  follow-up ticket, not yet raised.

### Disputed / likely intentional

- **`*.addressId`** (all party roles) — the address-book reference id is resolved
  into inline name/address details upstream by `ConsignmentPartyResolver` before
  this mapping runs, so the raw id arguably isn't meant to travel further
  (`TradeParty.java:21-29`; role documented in `ConsignmentParty.java:36-53`). One
  research pass flagged this as a gap; the more detailed pass argues it's by
  design. Worth a quick confirm with whoever owns `ConsignmentPartyResolver`
  before raising a ticket on it.

### Secondary: GBN-AG fields sourced from defaults/hardcoded/computed logic (not a 1:1 copy)

| Field | Kind | Evidence |
|---|---|---|
| `exchangedDocument.issuer` | Hardcoded null. Two distinct sub-mappings target this one slot — see correction below | gap G1; `ExchangedDocument.java:33` |
| `exchangedDocument.referenceDocument` | Hardcoded null — **and the source data exists and is PIMS-confirmed; see the 2026-09-28 finding below.** Closed by EUDPA-310 (2026-09-30): filled from the notification's scanned accompanying documents | gap G3 (closed); `ExchangedDocument.java:34` |
| `exchangedDocument.notificationStatusCode` | From `NotificationAggregate.status`, not the `notification` subnode | — |
| `exchangedDocument.issueDateTime` | Computed from `NotificationAggregate.updated` | — |
| `firstSignatoryAuthentication.includedClause[INTERNAL_MARKET_PURPOSE].content` | Always null | gap G2 |
| `TradeParty.partyRoleCode` (every party) | Hardcoded null despite schema naming specific role codes (`PW`, `CA`, etc.) | gap G6; `TradeParty.java:27` |
| `carrier.partyTypeCode` | Raw passthrough of `transporter.type`, no codelist validation | gap G9; `TradeParty.java:55-58` |
| `applicableClassification[].urlId`, `classCode.urlId` | Always null | gap G15 |
| `specifiedLineTradeDelivery[].productUnitQuantity.unitCode` | Always null, though schema requires it (`H87`/`KGM`) | — |
| `TradeLineItem.description/scientificName/commonName/typeCode/urlId` | Always null — schema intends these resolved from CN-code reference data downstream, not sourced from the notification | gap G18 |
| `individualTradeProductInstance` | One instance per species **line**, not per individual animal; `name`/`permanentLocation` always null | gap G19/G20 |

**Correction (2026-09-14), `exchangedDocument.issuer`:** the original pass above only
considered the "Person Responsible for Load" framing (Confluence-confirmed; organisation
name/address/contact — no frontend source field, correctly deferred to a follow-up
ticket). It missed a second, separate sub-mapping documented at
`trade-imports-schemas/schemas/profiles/imports/gb/pims-data-mapping.md:344`
("Contact Address"): the signed-in user's own preferred postal address, sourced from
their gov.uk identity (the user picks one when their profile carries more than one).
That address *does* have a real frontend source, and the mapping doc is explicit it
lands on `issuer.postalAddress` — "the schema does not carry a separate contact-address
slot distinct from the responsible-person slot." Found by Amir Naveed while planning
EUDPA-369 (see the ticket's comment thread), not by this audit.

Decision (EUDPA-369, 2026-09-14): **defer** wiring the contact-address postal address
into `issuer.postalAddress` for now, rather than populate it ahead of the
Responsible-Person-for-Load follow-up ticket. Both target the same `issuer` object;
sending the postal address alone would leave `issuer` populated with an address but no
name/company/contact, which only makes sense to ship as one coherent object once the
Responsible-Person-for-Load frontend field exists. Revisit both together in that
follow-up ticket.

Related refinement (from EUDPA-368 planning, 2026-09-02 — see §1's "New findings"): the
Responsible-Person-for-Load half of `issuer` may not be a pure "no frontend source"
gap either. The V4 Data Fields page marks it "Consumed on authentication" / sourced
from "gov identity," so by design it should come from the notifier's authenticated
Defra ID/organisation record rather than a journey page. Worth checking whether that
identity data is already captured at sign-in — and just not yet threaded into the
outbound payload — before scoping the follow-up ticket as a data-entry problem.

### New finding (2026-09-28, prompted by a PIMS query): accompanying documents never reach the event at all

> **Closed by EUDPA-310 (2026-09-30).** Every GBN-AG event now carries
> `exchangedDocument.referenceDocument[]`: one entry per accompanying document that passed its
> virus scan, with `typeCode` from `schemas/codelists/gbn-ag-document-types.json`, a `urlId`
> naming that codelist, `identifier` and a date-only `issueDateTime`. The key
> is omitted when there are none. The gateway forwards `typeCode`, `identifier` and
> `issueDateTime` on the PIMS v0.2.0 stream; `urlId` for PIMS is a separate v0.3.0 story. The
> finding below is kept as it was written.

Surfaced while answering a PIMS question about fields missing from what they'd received
(see §5). This is a **new gap, not previously recorded at any hop** — the original pass
ruled accompanying documents out of scope at §1 (correctly, for that hop) and then only
noted `exchangedDocument.referenceDocument` as "hardcoded null, gap G3" here, without
checking whether source data existed to populate it. It does.

The full chain is collected, persisted, PIMS-confirmed and schema-modelled — and then
dropped on the floor:

| Stage | State | Evidence |
|---|---|---|
| Frontend collects | ✅ three obligations | `accompanyingDocumentType`, `accompanyingDocumentReference`, `accompanyingDocumentDateOfIssue` (`obligations/sections/documents.js`) |
| Backend persists | ✅ all three fields | `AccompanyingDocument.java` — `documentType`, `documentReference`, `dateOfIssue`, in the `accompanying_documents` collection |
| PIMS confirmed the need | ✅ all three | `pims-data-mapping.md` — "Accompanying Document: Type / Reference / Date of Issue", **Confirmed** PIMS Document Fields rows 1–3 |
| PIMS v0.2.0 models the slot | ✅ | `gbn-ag-pims-v0.2.0.schema.json` → `exchangedDocument.referenceDocument[]` (`typeCode`, `identifier`, `issueDateTime`) |
| **Generic GBN-AG event emits it** | ❌ **hardcoded `null`** | `ExchangedDocument.from(...)` passes `null` for `referenceDocument` (`ExchangedDocument.java:33`) |
| **Any event carries the document data** | ❌ **no event type exists** | `OutboxEventType` declares eight notification-lifecycle types; none for documents |

Note the near-miss that makes this easy to overlook: `ReferencedDocument.java` *is* used —
but only by `LogisticsTransportMovement.transportDocument(...)`, for the transport
document on a movement leg. Nothing constructs a `ReferencedDocument` for
`exchangedDocument.referenceDocument`. So a grep for the type finds live code and the
gap hides behind it.

**Consequence:** `exchangedDocument.referenceDocument[]` serialises empty on the v0.2.0
PIMS stream even though the schema models it and PIMS confirmed it. Of everything in this
document, this is the most likely explanation for a PIMS report of "fields we expected are
missing" *if* they were reading the v0.2.0 payload. Closing it needs a backend change
(populate from the `accompanying_documents` collection when building the event), not a
gateway one — the gateway mapper added in EUDPA-370 already carries the field through.

**Open question for whoever scopes this:** accompanying documents live on their own
aggregate with their own lifecycle (upload, virus scan, `ScanStatus`), so "which documents
are attached" can change *after* a notification is submitted. Populating
`referenceDocument[]` at submit time snapshots it; emitting a document-level event instead
keeps PIMS current but adds an event type. That choice belongs in the ticket, not here.

#### Ticket landscape — four tickets touch this slot, none populates it

Checked 2026-09-28. There is an active body of work on accompanying-document *type codes*,
and it is easy to mistake it for coverage of this gap. It is not:

| Ticket | Status | Scope | Closes this gap? |
|---|---|---|---|
| [EUDPA-310](https://eaflood.atlassian.net/browse/EUDPA-310) | To Do | Defra-managed document-type codelist; `urlId` on `referenceDocument[]`; frontend selection list | No — codes and vocabulary, not population |
| [EUDPA-380](https://eaflood.atlassian.net/browse/EUDPA-380) | **CLOSED** — duplicate of EUDPA-310 (Rhys Sharrem, 2026-09-22) | Same ground, more detailed: core `ReferencedDocument.urlId`, `accompanying_document_type.json`, samples, dictionary | No. Its own "Out of scope" says *"The PIMS consumer schema carries no `referenceDocument`; that gap is separate work"* |
| [EUDPA-429](https://eaflood.atlassian.net/browse/EUDPA-429) | To Do | Spike — source/owner of frontend-fixture codelists | No |
| [EUDPA-430](https://eaflood.atlassian.net/browse/EUDPA-430) | To Do | Frontend serves document types from the codelist, not its fixture | No |
| [EUDPA-370](https://eaflood.atlassian.net/browse/EUDPA-370) | Merged | Added `referenceDocument[]` to PIMS v0.2.0 + the gateway mapper | Supplies the **destination**, not the source |

So the destination now exists at both downstream hops and the vocabulary work is queued —
but nothing populates `exchangedDocument.referenceDocument[]` on the generic event.

**Both live tickets rest on a false premise, which is why the gap stayed invisible.**
EUDPA-310 states *"Today the `referenceDocument` entries carry `typeCode` with no `urlId`"*
and EUDPA-380 states *"The schema sends the type as
`exchangedDocument.referenceDocument[].typeCode`"*. Neither is true — there are no entries.
Implementing EUDPA-310 as written would pin a `urlId` `const` onto a slot that is never
populated, and the sample/schema validation would all pass while the live payload stayed
empty. **Flag this to EUDPA-310's owner before it is picked up**, and either extend it to
cover backend population or raise a sibling ticket under the same epic. EUDPA-310's ACs are
already PIMS-aware ("A new version of the schema for PIMS is published and used if
needed"), so it is the natural home.

Also worth noting for whoever picks EUDPA-310 up: it was resolved as the surviving ticket,
but EUDPA-380 is the more thoroughly specified of the two (full 14-row code mapping with
provenance, the never-reuse-a-code rules, the `916`-only-for-"Other" rule, the
transport-document/accompanying-document two-slot split). Nothing from either has landed —
`schemas/codelists/` still holds only `gbn-ag-notification-status.json`. Read EUDPA-380
alongside EUDPA-310 rather than treating the closure as meaning its content was superseded.

---

## 3. Generic GBN-AG → PIMS-specific GBN-AG

Mapped by `PimsGbnAgDataMapper` + `PimsConsignmentMapper`/`PimsTransportMapper`/
`PimsLineItemMapper` in `trade-imports-dynamics-gateway`. Unusually well
self-documented: every PIMS record class carries an inline comment citing PR #52
for what was intentionally omitted. **21 leaf fields have no PIMS destination.**

| Generic GBN-AG field | Note | Evidence |
|---|---|---|
| `exchangedDocument.issuer` | Whole `TradeParty` dropped (moot — already null by hop 2) | `PimsGbnAgDataMapper.java:34` |
| `exchangedDocument.referenceDocument` | Dropped entirely | `PimsGbnAgDataMapper.java:34` |
| `specifiedConsignment.transitTradeCountry` | Dropped (also already null by hop 2) | `PimsConsignmentMapper.java:29` |
| `TradeParty.partyRoleCode`, `definedContact` (every party) | Both dropped for every party role | `PimsConsignmentMapper.java:47` |
| `TradeAddress.postcodeCode`, `countryName`, `countrySubDivisionName` | Dropped from every address | `PimsConsignmentMapper.java:59` |
| `TradeCountry.subordinateTradeCountrySubDivision` | Whole region-subdivision type unused | `PimsConsignmentMapper.java:71` |
| `CodedValue.name` | Dropped everywhere a coded value appears | `PimsConsignmentMapper.java:65` |
| `LogisticsLocation.urlId`/`name`/`typeCode`/`postalAddress` | Only `identifier` (port code) survives | `PimsConsignmentMapper.java:77` |
| `LogisticsTransportMovement.identifier`/`urlId`/`transportContractRelatedReferencedDocument` | Dropped (incl. field already null by hop 2) | `PimsTransportMapper.java:18` |
| `TransportEvent.actualOccurrenceDateTime`/`occurrenceLogisticsLocation` | Only scheduled time survives | `PimsTransportMapper.java:33` |
| `TradeLineItem.description`/`scientificName`/`commonName`/`typeCode`/`urlId` | Dropped (moot — already null by hop 2) | `PimsLineItemMapper.java:39` |
| `applicableClassification` beyond the first | List narrowed to a single value | `PimsLineItemMapper.java:34` |
| `systemName`, `className` | Dropped from classification | `PimsLineItemMapper.java:50` |
| `ProductUnitQuantity.unitCode` | Dropped — only the count survives | `PimsLineItemMapper.java:63` |
| `LogisticsPackage.levelCode`/`typeCode` | Dropped — only item quantity survives | `PimsLineItemMapper.java:69` |
| `TradeProductInstance.name`/`permanentLocation` | **Permanent address dropped a second time**, independently of the hop-1 frontend drop | `PimsLineItemMapper.java:75` |
| `AnimalIdentifier.urlId` | Dropped from every identifier | `PimsLineItemMapper.java:81` |

**Schema vs Java model:** none found — `gbn-ag-pims-v0.1.0.schema.json` is
generated to mirror this Java model exactly (states so in its own description), so
every field dropped here is also absent from that schema by construction.

**Status:** this hop's ticket, EUDPA-370, is **In Dev**. The schema-minting phase merged as
[schemas#56](https://github.com/DEFRA/trade-imports-schemas/pull/56) (2026-09-17) and has
been confirmed by the PIMS team (2026-09-18). Decision: publish `v0.1.0` and `v0.2.0`
simultaneously rather than deprecate `v0.1.0` immediately, giving PIMS time to transition;
any issues PIMS finds during that transition get pulled into a `v0.3.0`, not patched into
either published version in place. One issue was found and fixed directly in `v0.2.0`
before the mapper-code phase started, rather than deferred to `v0.3.0`: `originCountry.
subordinateTradeCountrySubDivision` had been merged as an array (misreading
`pims-data-mapping.md`'s `[0]` notation) when the generic schema, core schema, and
`trade-imports-animals-backend`'s own `TradeCountry` record all carry it as a single
object — see
[schemas#57](https://github.com/DEFRA/trade-imports-schemas/pull/57) and the "Correction"
section at the foot of `gbn-ag-pims-v0.2.0-changes.md`. The mapper-code phase in
`trade-imports-dynamics-gateway` **merged** as
[dynamics-gateway#21](https://github.com/DEFRA/trade-imports-dynamics-gateway/pull/21),
followed by [dynamics-gateway#23](https://github.com/DEFRA/trade-imports-dynamics-gateway/pull/23)
(integration-testing the dual-emit pair against a real Service Bus) —
see its own plan at `workareas/ticket-planning/EUDPA-370/plan.md` §Part 2. It dual-emits
both the v0.1.0 and v0.2.0 wire shapes to the same ASB queue rather than cutting straight
over, per the "publish both simultaneously" rollout decision: v0.1.0 is produced by the
existing, completely untouched mapper classes; a full parallel v0.2.0 stack
(`notification.pims.gbnagv2` + `*MapperV2` classes) was required rather than a shared
path, because `applicableClassification`'s object-to-array change can't share one Java
type between the two shapes.

### New findings from EUDPA-370 planning (2026-09-16, Ian Griffiths — not in the original audit)

Two of the 21 dropped fields need a shape decision beyond "just add it back," since the
generic schema's own definition is either more general than GBN-AG ever populates, or
richer than what the generic-side Java code actually sends. Both were resolved by reading
the generic-side `trade-imports-animals-backend` mapper code directly, not by guesswork:

- **`TradeCountry.subordinateTradeCountrySubDivision`** — the generic core schema's
  `TradeCountrySubDivision` def is deliberately general (it covers both a region-of-origin
  case, `functionTypeCode` `106`, and a competent-authority/customs-office attachment case,
  `44`/`42`/`41`, the latter carrying a nested `activityAuthorizedParty[]` array of full
  `TradeParty` objects). `trade-imports-animals-backend`'s own
  `TradeCountrySubDivision.java` (`outbox/gbnag/`) only ever constructs the region-of-origin
  case: its `regionOfOrigin(String regionCode)` factory hardcodes
  `functionTypeCode.content = "106"` and the record has no `activityAuthorizedParty` field
  at all. Decision for the v0.2.0 PIMS schema: `{ identifier, urlId, functionTypeCode:
  { content } }`, `functionTypeCode` required, **no** `activityAuthorizedParty` — matching
  what's actually constructed, not the generic schema's full generality. `functionTypeCode`
  is kept (not hardcoded away entirely) because GBN-AG is animals-only today but this
  PIMS schema/mapper path is shared plumbing other, non-animal journeys may reuse later.
  The field is a **single** object, not an array — matching `TradeCountry.
  subordinateTradeCountrySubDivision`'s own singular type
  (`outbox/gbnag/TradeCountry.java`). That part of the shape decision was recorded
  correctly in substance here but implemented as an array in the merged schema; see the
  2026-09-18 correction noted in the status paragraph above.
  `content` is what would distinguish a region-of-origin entry from a different
  `TradeCountrySubDivision` use once one exists.
- **`specifiedConsignment.finalDestinationLocation`** (the CPH number's PIMS destination,
  needed once EUDPA-369 lands) — the generic schema's `finalDestinationLocation` def
  (§4 recommendation 1) requires `identifier`, `urlId`, **and** `postalAddress`. But
  `trade-imports-animals-backend`'s `LogisticsLocation.java` (`outbox/gbnag/`) uses one
  record type for both `unloadingBaseportLocation` (`.from(identifier)`) and
  `finalDestinationLocation` (`.cph(cphNumber)`) — same shape — and `.cph()` carries its
  own doc comment: *"The schema also requires a postal address here, but nothing collected
  says which address belongs to the holding, so it is left unset rather than guessed."*
  **New finding, not previously recorded:** the generic side is already knowingly sending
  `identifier`+`urlId` only, in violation of its own schema's `required` array on this
  field — a pre-existing schema/code mismatch upstream of this ticket, not something
  EUDPA-370 introduces or needs to fix. Decision for the v0.2.0 PIMS schema: point
  `finalDestinationLocation` at the same (already-being-extended) `$defs/logisticsLocation`
  used for `unloadingBaseportLocation`, with no new def and no `required` array — matching
  what's actually sent today rather than reproducing the generic schema's aspirational
  requirement one hop further downstream.

---

## 4. Does the `trade-imports-schemas` modelling make sense?

Mostly yes on the generic side — `gbn-ag-v1.schema.json` already anticipates more
of what PIMS needs than either Java service currently delivers. The gaps above are
overwhelmingly **implementation** gaps, not missing schema concepts. Four things
are worth raising as tickets:

1. **`SpecifiedConsignment.java` is missing three fields the schema already
   defines**: `finalDestinationLocation` (the CPH carrier), `exportCountry`,
   `importCountry`. This is *why* `cphNumber` has nowhere to go in §2 — there's no
   field to map into, not a missed mapping line. Confluence confirms CPH is needed
   and assumes exactly one per notification. **Recommend adding these three fields
   to `SpecifiedConsignment.java`.**
2. **`TradeLineItem`'s schema-required fields don't match what the backend
   actually sends.** The schema marks `description`, `scientificName`,
   `commonName`, `specifiedLineTradeDelivery` as `required`, but the Java model
   always emits null for the first three. Since §1/§2 show this data *does* exist
   in the aggregate (`commodity.name`, `species[].value/text`) and simply isn't
   threaded through, **the fix is populating them, not relaxing the schema.**
3. **Weight and Transporter Status have no schema field at all** — not just
   unmapped, genuinely absent from `gbn-ag-v1.schema.json`. Both are
   Confluence-confirmed PIMS needs (Weight: needed for germinals, open question on
   net/gross/aggregation; Transporter Status: alongside Transporter Approval
   Number, which *does* flow correctly). **Need a new schema slot before any Java
   model or frontend work can carry them.** Confirmed absent from the frontend and the
   V4 Data Fields page too while scoping EUDPA-368 (2026-09-02) — genuinely new scope,
   not yet raised with Monica/Judith. Two more items surfaced in the same pass, also
   absent from both frontend and the V4 page: **Species Family Name / Species Class
   Name / Species Type Name** (domestic vs game — PIMS marks these tentative/TBC, may
   be derivable from the commodity code rather than needing a new field), and
   **Microchip** / **Leg Ring** animal-identifier types (PIMS lists 7 identifier types,
   the frontend implements 6; Leg Ring's close cousin "Wing Ring" was explicitly
   de-scoped by Monica Rivera on 2026-05-29, so this one may already be a deliberate
   cut rather than a gap — Microchip has no such precedent and still needs a decision).
4. **The PIMS schema is a mirror, not a contract — which hides its own gaps.**
   `gbn-ag-pims-v0.1.0.schema.json`'s own description says it's "a point-in-time
   description of what the backend currently serialises," not derived from the
   generic schema. That makes it trivially self-consistent, but means a reader of
   only this schema has no way to see that `permanentLocation`, `issuer`, region
   sub-division and transit countries are *missing* rather than *not yet needed*.
   **Recommend minting v0.2.0 once the Confluence-confirmed gaps are threaded
   through**, rather than quietly regenerating v0.1.0 in place — and adding a
   short per-field-group comment (mirroring the `// … omitted` comments already in
   the Java mappers) so the schema reads as a living gap list, not just a
   snapshot.

### Open design questions carried over from Confluence (not code bugs)

The Confluence mapping page flags a few unresolved product questions worth
carrying into ticket scoping rather than treating as pure engineering gaps:

- Whether all expected consignee/consignor fields are complete (flagged
  "ASSUMPTION" on the page).
- Whether Weight should be aggregated at notification level, and whether both net
  and gross weight are needed.
- Whether Permanent Address should be captured at notification level or per
  animal (the page raises this as an open question about the current design).

---

## 5. PIMS query: "some fields we're expecting are missing" (2026-09-28)

PIMS compared "the example ITAHC payload" against what had landed in PIMS, reported that
some expected fields looked absent — naming **central competent authority** as the example
— and asked three questions: is the example payload the whole field set, is there a schema
with all fields, and is there a data dictionary.

Recorded here because answering it produced two corrections and one new gap above, and
because the same question will recur.

### Central competent authority is out of scope by design, not a dropped field

Zero occurrences of a competent-authority slot in the frontend (47 collected obligations),
the backend notification model, the generic GBN-AG event, or the gateway. The concept lives
in exactly one place in `trade-imports-schemas`, and GBN-AG never reaches it:

- `defra-unvtd-canonical-core-v1.schema.json` (lines 345, 362, 368) —
  `TradeCountrySubDivision.activityAuthorizedParty[]`, keyed by `functionTypeCode` `'44'`
  ("place of authentication of document (competent authority)"), with `partyRoleCode`
  `'RA'` = central competent authority, `'VG'` local, `'CM'` customs/BCP. The schema's own
  description calls this "the shape TRACES uses to attach competent authorities and border
  control posts".
- `trade-imports-animals-backend`'s `TradeCountrySubDivision` has a single factory,
  `regionOfOrigin(String)`, which hardcodes `functionTypeCode = "106"`, and the record has
  **no `activityAuthorizedParty` field at all**. Hence `gbn-ag-pims-v0.2.0.schema.json`
  deliberately models only the region-of-origin case (its `$def` says so).
- The other carrier of an authority on an EU certificate is
  `thirdSignatoryAuthentication.providerParty` — populated in the INTRA sample as
  "Netherlands Food and Consumer Product Safety Authority", `partyRoleCode: AM`. GBN-AG
  requires only `firstSignatoryAuthentication`, and uses it purely for declaration clauses.

**Why:** GBN-AG is a trader-submitted GB pre-notification, not an authenticated
certificate. No competent authority is in the loop to record. The CCA is an ITAHC/TRACES
field, and the ITAHC comes from TRACES, not from this stack. Naming both documents loosely
("the example ITAHC payload" for a GBN-AG sample) is probably what invited the comparison.

It is also **not a lost agreement**: `pims-data-mapping.md` is a completed row-by-row
reconciliation against PIMS's own draft, with a Confirmed / Modified / Deferred verdict per
V4 field plus explicit "PIMS fields believed not required" rows and a scope-decisions
section for descopes. Central competent authority appears in none of those categories. If
PIMS needs it on the GB pre-notification it is new scope — no source field, no generic
schema slot, then the mapping — and the prior question is whether the pre-notification is
the right carrier at all.

### Check the stream version before treating any absence as a gap

Since dynamics-gateway#21, `NotificationSqsListener.java:108-126` publishes **two payloads
per notification to the same ASB queue, unconditionally — no feature flag**:

| Stream | `metadata.schemaVersion` | ASB messageId |
|---|---|---|
| v0.1.0 (thin, legacy) | `0.1.0` | `<eventId>` |
| v0.2.0 (full) | `0.2.0` | `<eventId>-v2` |

v0.2.0 restores the 21 leaf fields §3 lists, plus CPH and per-animal permanent address. A
consumer reading the v0.1.0 message sees the thin shape and will correctly report missing
fields. **Establish which `schemaVersion` a complaint refers to before investigating it.**

### Answers to the three questions

- **Is the example payload the whole field set?** No — the samples are minimal illustrative
  instances with optional fields omitted. `gbn-ag-pims-v0.1.0.json` is 153 lines,
  `gbn-ag-pims-v0.2.0.json` 234, generic `gbn-ag-v1-example.json` 262.
- **Is there a schema with all fields?** Three layers: the PIMS contract
  (`gbn-ag-pims-v0.2.0.schema.json`, confirmed by PIMS 2026-09-22 in its post-correction
  single-object form); the generic event (`gbn-ag-v1.schema.json`, a superset of the PIMS
  view); and the canonical core (`defra-unvtd-canonical-core-v1.schema.json`). Worth
  flagging the layering to consumers explicitly — the core is where a reader can mistake
  "the model defines it" for "GBN-AG sends it", which is exactly the CCA trap.
- **Is there a data dictionary?** Yes — `gbn-ag-data-dictionary.md`, every property with
  type, required flag and plain-English description. Two caveats: it documents the
  **generic** GBN-AG, not the PIMS subset (no PIMS-specific dictionary exists), and for a
  PIMS reader `pims-data-mapping.md` is usually the more useful document, since it is keyed
  by the V4 business field names they already use.

### What still needs raising after this pass

- **Backend population of `exchangedDocument.referenceDocument[]`** — the new §2 gap. Not
  covered by EUDPA-310 / 380 / 429 / 430, all of which assume the array is already
  populated. See §2's ticket-landscape table for who to talk to and why it stayed hidden.
- **`LEG_RING`** — either implement it or strike it from `pims-data-mapping.md`'s
  "established typeCodes" list (§1 correction).
- **Responsible Person for Load + Contact Address** (`exchangedDocument.issuer`) — still
  null; both **Confirmed** by PIMS (rows 14 and 30); knowingly deferred by the EUDPA-369
  decision of 2026-09-14 pending a follow-up ticket that **still has not been raised**.
  Note the generic schema marks `issuer` **required**, so the generic event violates its
  own schema — the same class of defect as the `finalDestinationLocation.postalAddress`
  mismatch already recorded in §3.

### Confirmed unchanged by this pass

- No schema slot anywhere for Weight, Transporter Status, Species id, or Species
  Family/Class/Type Name (§4 point 3 — unchanged).

---

## 6. PIMS v0.2.0 review: "the absolute bare minimum we don't have" (2026-10-19)

PIMS reviewed `gbn-ag-pims-v0.2.0.schema.json` (with Monica Rivera) and listed seven things
still missing. Five ask for a list of expected values, one is a missing party, and one is a
link caseworkers can follow to a document. They also flagged "a couple of other fields that
might require further discussion", not named yet.

Each item below was traced through all four hops at the commits in the 2026-10-19 column
above. Two more fields were already planned for v0.3.0 before this review: the country
subdivision and region of origin code (EUDPA-614), and the document-type `urlId` (EUDPA-310
decision D8). They are included so §6 covers everything v0.3.0 needs to carry.

### Summary

| # | PIMS item | What PIMS gets on v0.2.0 today | Why | What's needed | Where |
|---|---|---|---|---|---|
| 1 | Animals certified as | `GOODS_CERTIFIED_AS` clause, `content` = one of 16 frontend kebab-case keys | No published list; schema implies TRACES `ched_consignment_clause` codes, which we don't use | A Defra codelist of the 16 values, `urlId` on the clause | schemas, backend, gateway, PIMS schema |
| 2 | Internal market purpose | **Nothing** | **Defect:** the backend only emits the clause when the reason is `INTERNAL_MARKET`, but the frontend stores `internalMarket`; and the clause's `content` is hardcoded `null` | Fix the condition, map `purposeInInternalMarket`, plus a codelist of the 11 values | backend, schemas, gateway, PIMS schema |
| 3 | Purpose (reason for import) | `PURPOSE` clause, `content` = one of 5 camelCase keys | No published list; docs and samples spell it `INTERNAL_MARKET`, the code sends `internalMarket` | Agree one spelling, a codelist, `urlId` on the clause | schemas, backend, gateway, PIMS schema |
| 4 | Person responsible | **Nothing** | `exchangedDocument.issuer` is hardcoded `null` on the generic event (breaking its own schema, which requires it), and is not in the PIMS v0.2.0 schema at all | Map the consignment contact the journey already collects into `issuer`; add `issuer` to PIMS v0.3.0 | backend, gateway, PIMS schema |
| 5 | Document type | `referenceDocument[].typeCode` from the 14-code Defra list, **without** `urlId` | The codelist exists in schemas but isn't published anywhere PIMS can read; v0.2.0 drops `urlId` (EUDPA-310 D8) | Share or host the codelist; carry `urlId` in v0.3.0 | schemas, gateway, PIMS schema |
| 6 | Animal identifier | `identifier[]` entries with `typeCode` (`EAR_TAG`, `PASSPORT`, `MICROCHIP`, `TATTOO`) and `content`, **no** `urlId` | No codelist file; backend sends `urlId: null` against a `const` in the generic schema; docs list `LEG_RING`, `IDENTIFICATION_DETAILS`, `DESCRIPTION`, which are never sent | A codelist of the 4 values, `urlId` populated, stale codes struck from the docs | schemas, backend, gateway, PIMS schema |
| 7 | Document URL | **Nothing** | No event carries a storage id or a link, and there is no caseworker-facing document view anywhere | A decision (static link vs PIMS builds it), a caseworker-accessible download route, and a slot in v0.3.0 | backend (+ a viewer), schemas, gateway, PIMS schema |
| — | Country subdivision | `subordinateTradeCountrySubDivision` (single object, `106`) — on the EUDPA-614 branch, now the MDM subdivision code, not the region of origin code | EUDPA-614 changed what the `106` entry means | v0.3.0 must say so, and decide whether it stays one object or becomes the generic event's array | schemas, gateway |
| — | Region of origin code | **Nothing** | New generic field from EUDPA-614; v0.2.0 has no slot | Add `originCountry.regionOfOriginCode` | schemas, gateway |
| — | Document type `urlId` | **Nothing** (see item 5) | EUDPA-310 D8 deferred it to v0.3.0 | Add `referenceDocument[].urlId` | schemas, gateway |

None of the five value lists PIMS asked for is published anywhere a consumer can read
today. Only the document-type list exists as a file
(`schemas/codelists/gbn-ag-document-types.json`), and its `refdata.tbc.defra.gov.uk` host is
a placeholder; the schemas repo is private and has no publish step. `trade-imports-reference-data`
serves only countries and ports of entry.

### 1–3. The three clauses: animals certified as, internal market purpose, purpose

All three travel on `exchangedDocument.firstSignatoryAuthentication.includedClause[]` as
`{ identifier, content, urlId }`. They are separate questions, stored in separate fields:

| PIMS item | Frontend obligation (page) | Backend field | Clause `identifier` |
|---|---|---|---|
| Animals certified as | `animalsCertifiedFor` (Additional details) | `AdditionalDetails.certifiedFor` | `GOODS_CERTIFIED_AS` |
| Purpose | `reasonForImport` (Main reason for import) | `NotificationBase.reasonForImport` | `PURPOSE` |
| Internal market purpose | `purposeInInternalMarket` (same page, only when reason = internal market) | `NotificationBase.purposeInInternalMarket` | `INTERNAL_MARKET_PURPOSE` |

Every value list is hardcoded in a frontend `stub.js`; nothing reads reference data. The
backend stores each as a plain `String` with no enum or validation, and the event carries
the frontend's own key unchanged, with `urlId` always `null` (`Clause.java`).

**Animals certified as** — `services/certification-purposes/stub.js` (16 values). The
obligation (`obligations/sections/misc.js`) says the list "come[s] from MDM in production",
but no MDM call exists.

| Value sent | Label |
|---|---|
| `further-keeping` | Further keeping |
| `slaughter` | Slaughter |
| `confined-establishment` | Confined establishment |
| `germinal-products` | Germinal products |
| `registered-equine-animal` | Registered equine animal |
| `travelling-circus-animal-act` | Travelling circus/animal act |
| `exhibition` | Exhibition |
| `event-or-activity-near-borders` | Event or activity near borders |
| `release-into-the-wild` | Release into the wild |
| `dispatch-centre` | Dispatch centre |
| `relaying-area-purification-centre` | Relaying area / purification centre |
| `ornamental-aquaculture-establishment` | Ornamental aquaculture establishment |
| `technical-use` | Technical use |
| `quarantine-or-similar-establishment` | Quarantine or similar establishment |
| `live-aquatic-animals-for-human-consumption` | Live aquatic animals for human consumption |
| `other` | Other |

**Purpose** — `services/import-reason-purpose/stub.js` (5 values). Each reason asks its own
follow-up questions (`import-reason.js`):

| Value sent | Label | Follow-up |
|---|---|---|
| `internalMarket` | Internal market | Purpose in the internal market |
| `transhipmentOrOnwardTravel` | Transhipment or onward travel | Destination country |
| `transit` | Transit | Port of exit, destination country |
| `reEntry` | Re-entry | — |
| `temporaryAdmissionHorses` | Temporary admission horses | Exit date, port of exit |

**Internal market purpose** — same stub file (11 values). `validate.js` calls it "the
service's own words rather than reference data", and several (rescue, research, companion
animal, racing, approved premises, restocking) are UK-specific, with no obvious TRACES
equivalent.

| Value sent | Label |
|---|---|
| `transfer-of-ownership-sale-gift` | Transfer of ownership - Sale/gift |
| `transfer-of-ownership-rescue` | Transfer of ownership - Rescue |
| `breeding` | Breeding |
| `research` | Research |
| `racing-competition-show-or-training` | Racing, competition, show or training |
| `approved-premises-or-body` | Approved premises or body |
| `companion-animal-not-for-resale-or-rehoming` | Companion animal not for resale or rehoming |
| `production` | Production |
| `slaughter` | Slaughter |
| `fattening` | Fattening |
| `restocking` | Restocking |

**Defect: the internal market purpose never reaches the event.** `Authentication.from`
adds the `INTERNAL_MARKET_PURPOSE` clause only when
`Clause.INTERNAL_MARKET.equals(reasonForImport)`, where `INTERNAL_MARKET = "INTERNAL_MARKET"`.
The frontend stores `internalMarket`, so the condition never matches a real notification.
Even when it does, `Clause.internalMarketPurpose()` builds the clause with `content` hardcoded
`null`; `purposeInInternalMarket` is never read. `GbnAgMapperTest`'s comment "sub-purpose not
in domain (gap G2)" is out of date: EUDPA-368 added the field.

**Why the tests didn't catch it.** The backend and gateway test fixtures use TRACES-style
values the frontend never sends: `INTERNAL_MARKET` for the reason, `BREEDING_AND_PRODUCTION`
for certified-as (`GbnAgMapperTest.java`), and the gateway's hand-written
`notification-submitted-from-backend.json` contains an `INTERNAL_MARKET_PURPOSE` clause the
backend can't produce. The generic samples do the same (`gbn-ag-v1-example.json`). So the
event's real vocabulary appears nowhere in tests or docs. `pims-data-mapping.md` adds a third
spelling (`content = Transit`).

**Schemas.** `gbn-ag-v1.schema.json` requires the `PURPOSE` and `GOODS_CERTIFIED_AS` clauses
and says their `urlId` points at TRACES `ched_consignment_clause`
(`schemas/profiles/imports/README.md` says that list "supplies the values for purpose and
animal certification category"). That list is in no repo, and our values don't match it. The
schema's description says `INTERNAL_MARKET_PURPOSE` is required when the purpose is internal
market, but the `allOf` doesn't enforce it. `pims-data-mapping.md` confirms all three rows
(PIMS rows 3, 16 and modified row 10) without listing any values.

**Decision needed:** publish our own Defra codelists of the values the journey actually
offers (as `gbn-ag-document-types.json` does for documents), or map our keys onto TRACES
`ched_consignment_clause` codes. The first is quicker and honest about the UK-specific
values; the second only helps if PIMS already holds the TRACES list. Either way, agree one
spelling per value, and decide whether the event sends the frontend key or a code.

### 4. Person responsible

The journey **already collects it.** The mandatory "Contact address for consignment" page
(`features/contact/`, obligation `contactAddress`) is the design's "person responsible for the
consignment from when it enters Great Britain until authorities complete their checks"
(DR1 prototype intro). The trader picks an organisation address-book entry. The frontend sends it
as `consignment` (`{ name, email, phone, address }`) and the backend stores it as
`NotificationBase.consignment` (`ConsignmentParty`).

**It stops there.** Nothing in `outbox/gbnag/` reads `getConsignment()`, and
`ExchangedDocument.from` passes a literal `null` for `issuer`, pinned by `GbnAgMapperTest`
("where it belongs on the event is still an open question… gap G1"). Because `issuer` is
**required** by `gbn-ag-v1.schema.json`, every generic event breaks its own schema. The
gateway reads `issuer` and deliberately drops it (`PimsExchangedDocument`,
`PimsGbnAgDataMapperV2`: "deferred to its own follow-up ticket"), and the PIMS v0.2.0 schema
has no `issuer` at all (`-changes.md`: "Explicitly not added"). That follow-up ticket was
never raised.

`TradeParty.from(ConsignmentParty)` already exists, so the backend change is small. Two
gaps remain:

- **No named person.** Address-book entries have no contact person, so `TradeParty`
  deliberately never sets `definedContact[].personName`. `pims-data-mapping.md` (row 14)
  puts the organisation in `name`/`postalAddress` and the person, phone and email in
  `definedContact[]`. Email and phone can go in `definedContact[]` without a name.
- **Two sources described, one built.** `pims-data-mapping.md` describes the organisation
  half as the Defra ID organisation record, and "Contact Address" (row 30) as the signed-in
  user's preferred gov.uk address, both landing in `issuer`. What's built is a
  trader-picked address-book contact. Defra ID claims carry no address, and the only
  identity that reaches PIMS is the event envelope's `actor` (`displayName`,
  `organisationId`; no email, phone, organisation name or address).

**Recommendation:** map the consignment contact into `issuer`, since that's what the
design calls the person responsible and the data exists. Update rows 14 and 30 of
`pims-data-mapping.md` to describe what's sent, rather than build the Defra ID route.

### 5. Document type

The list PIMS asked for exists: `schemas/codelists/gbn-ag-document-types.json`
(`$id` `https://refdata.tbc.defra.gov.uk/gbn-ag-document-types`), 14 codes. The backend
maps its `DocumentType` enum onto them (`ReferencedDocument.java`), and only documents
whose virus scan is complete go on the event.

| Code | Document | Code basis |
|---|---|---|
| `4` | Laboratory sampling results for aflatoxin | UNTDID 1001 (test report) |
| `380` | Commercial invoice | UNTDID 1001 |
| `636` | Health certificate | UNTDID 1001 |
| `705` | Bill of lading | UNTDID 1001 |
| `710` | Sea waybill | UNTDID 1001 |
| `720` | Rail waybill | UNTDID 1001 (rail consignment note) |
| `740` | Air waybill | UNTDID 1001 |
| `853` | Veterinary health certificate | UNTDID 1001 |
| `856` | ITAHC | UNTDID 1001 (inspection certificate, as TRACES uses it) |
| `911` | Import permit | UNTDID 1001 (import licence) |
| `916` | Other | UNTDID 1001 (related document) — only when the trader picks "Other" |
| `GBN1` | Letter of authority | Defra |
| `GBN2` | Catch certificate | Defra |
| `GBN3` | Journey log | Defra |

What's missing is a way for PIMS to read it. The host is a placeholder, the schemas repo
is private, and `pims-data-mapping.md` lists the codes only in prose. PIMS v0.2.0 also drops
`urlId` (EUDPA-310 D8), so the payload doesn't even name the list. Two smaller points: the
generic schema doesn't restrict `typeCode` to these codes, and the frontend still uses its
own hardcoded list (EUDPA-430 not done), which matches today but isn't tied to the file.

### 6. Animal identifier

**What's sent.** `TradeProductInstance` emits one instance per animal, with
`identifier[]` entries of `typeCode` + `content`. There are exactly four typeCodes, all
Defra-invented strings with no TRACES or UN/CEFACT basis: `EAR_TAG`, `PASSPORT`,
`MICROCHIP`, `TATTOO`. Horse name goes in the instance's `name`, not as an identifier, and
permanent address goes in `permanentLocation`. `content` is free text, trimmed, up to 58
characters, with no format check for any type.

| Commodity (CN) | Identifiers asked |
|---|---|
| Cattle (`0102`) | Ear tag, passport |
| Horse (`0101`) | Microchip, passport, horse name |
| Cat, dog (`01061900`) | Microchip, passport, tattoo, plus permanent address (mandatory) |
| Fish (`0301`) | None |

**What's documented but never sent.** `gbn-ag-v1.schema.json`, the data dictionary and
`pims-data-mapping.md` list `LEG_RING`, which has no frontend field or backend constant.
`pims-data-mapping.md` also still lists `IDENTIFICATION_DETAILS` and `DESCRIPTION` (removed
by EUDPA-500), with an outstanding action to add them to a codelist. The mapping doc says
permanent address applies to ferrets as well; the commodity catalogue has no ferret.

**`urlId`.** The generic schema pins `urlId` to a `const`
(`https://codelists.tbc.defra.gov.uk/animal_identifier_types`), but the backend always sends
`null`, and the record has no `@JsonInclude(NON_NULL)`. The gateway drops the null, so PIMS
gets no pointer to any list. No `animal_identifier_types` codelist file exists, and the docs
use two different placeholder hosts (`codelists.tbc…` and `refdata.tbc…`).

**A competing model.** The generic schema also describes identifiers as trade-line
`additionalInformationNote` entries with TRACES subject code
`INDIVIDUAL_IDENTIFICATION_NUMBER` (and the event samples use it). Nothing emits it, and it
loses the identifier type. It should be removed or reconciled, so PIMS isn't shown two
shapes.

### 7. Document URL

PIMS asks whether they build the link or receive one. Neither is possible today:

- **Nothing on any event identifies the stored file.** `referenceDocument[].identifier` is
  the trader's reference printed on the document, which isn't unique and isn't a storage
  handle. The storage handles (`uploadId`, `correlationId`, Mongo `id`, `s3Key`) stay in
  `accompanying_documents`. EUDPA-310 decision D10 left the file off the event.
- **There is no caseworker-facing document view.** The backend's
  `GET /document-uploads/{upload-id}/file` streams from S3. Like every animals-backend route,
  it has no application-level authentication (the only filter, `AdminSecretFilter`, guards
  delete and replay) and relies on CDP's internal network, so it can't be handed to PIMS
  users. The animals frontend's `…/accompanying-documents/{uploadId}/file` needs a Defra ID
  trader session. INS frontend and animals-admin have no document page. No presigned URLs
  are generated anywhere.
- **The schema already has a slot.** The core `ReferencedDocument.attachmentBinaryObject`
  (`uri`, `filename`, `mimeCode`) is described as "a link to the stored file", and the generic
  samples use `uri:documentid:<uuid>`. Nothing populates it, the gateway's inbound
  `ReferencedDocument` would reject it (`ignoreUnknown = false`) until it's modelled there,
  and PIMS v0.2.0 leaves it out.

The two options:

| | PIMS builds the link | We send a link |
|---|---|---|
| Needs on the event | A stable per-document id (e.g. `uploadId`) | `attachmentBinaryObject.uri` (+ `filename`, `mimeCode`) |
| Needs from us | A caseworker-accessible download route and its base URL | The same route, plus a decision on its URL shape |
| Pros | Event stays free of environment-specific URLs; PIMS controls the link | Simpler for PIMS; one source of truth for the link |
| Cons | PIMS hardcodes our route; changing it breaks them | URL baked into every event, so environments and moves break old events |

Either way, **the hard part is the route, not the event**: something caseworkers can open,
authenticated for them rather than for a trader. That's a design decision (INS, animals-admin
or a new service) and probably its own ticket. `pims-data-mapping.md` still says "Document URL
stays a consumer-side concern; not added to the schema", which this request reverses.

### Already planned for v0.3.0

- **Country subdivision.** EUDPA-614 changed the `106` entry from the region of origin code to
  the MDM subdivision code (e.g. `ES-CN`) and made the generic field an **array**. The gateway on
  the EUDPA-614 branch picks the `106` entry and still sends v0.2.0's **single object**, with a
  new meaning. v0.3.0 must document the meaning, and decide whether to keep one object or match
  the generic array. PIMS should be told the meaning changed on the v0.2.0 stream too.
- **Region of origin code.** New field `originCountry.regionOfOriginCode` (the disease zone from
  the health certificate). Not sent to PIMS until v0.3.0 has a slot for it.
- **Document type `urlId`.** EUDPA-310 decision D8: v0.3.0 is a copy of v0.2.0 plus
  `referenceDocument[].urlId`, with a `-changes.md` sidecar and a sample.

### Defects found, separate from the value lists

1. **Internal market purpose never emitted** — the `INTERNAL_MARKET` / `internalMarket` mismatch
   plus hardcoded `null` content (items 1–3).
2. **Generic event breaks its own schema twice** — required `issuer` always absent (item 4), and
   identifier `urlId` sent as `null` against a `const` (item 6). The same class as the
   `finalDestinationLocation.postalAddress` mismatch in §3.
3. **Test fixtures and samples use values the frontend never sends**, which hid defect 1.

### Decisions needed before v0.3.0 can be minted

1. Codelists for the three clauses: our own Defra lists, or a mapping onto TRACES
   `ched_consignment_clause` (items 1–3).
2. One spelling per value, and whether the event sends the frontend key or a code (items 1–3, 6).
3. Where the codelists are published so PIMS can read them: share the files, or host them (the
   EUDPA-429 ownership question) (items 1–3, 5, 6).
4. Person responsible: confirm the consignment contact is the right source, and that no named
   person is acceptable (item 4).
5. `LEG_RING`: implement it or strike it (item 6).
6. Document URL: who builds it, and where caseworkers open documents (item 7). The route is
   probably separate work, so v0.3.0 may need to carry only the id or `uri` slot.
7. Subdivision: one object or an array in v0.3.0.
8. What PIMS's "couple of other fields" are, so v0.3.0 is cut once.
