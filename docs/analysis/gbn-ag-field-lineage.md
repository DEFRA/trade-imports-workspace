# GBN-AG field lineage: frontend → NotificationAggregate → GBN-AG → PIMS GBN-AG

Field-by-field audit of every hop a live-animals notification passes through, from
the user-facing frontend journey to the PIMS-specific event payload, looking for
fields that are silently dropped along the way and for gaps in the
`trade-imports-schemas` models that document the pipeline.

**Audited as of** 2026-09-02, against `main` on:

| Repo | Commit |
|---|---|
| `trade-imports-animals-frontend` | `1b53dbde` |
| `trade-imports-animals-backend` | `0ba6596` |
| `trade-imports-dynamics-gateway` | `4860117` |
| `trade-imports-schemas` | `7a0e269` |

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

| Ticket | Hop | Status | PRs |
|---|---|---|---|
| [EUDPA-368](https://eaflood.atlassian.net/browse/EUDPA-368) | §1 frontend → aggregate | IN QA | frontend#300, backend#94, tests#187 (closed) |
| [EUDPA-369](https://eaflood.atlassian.net/browse/EUDPA-369) | §2 aggregate → generic GBN-AG | Deskcheck | backend#96, dynamics-gateway#20, tests#212 (open) |
| [EUDPA-370](https://eaflood.atlassian.net/browse/EUDPA-370) | §3 generic → PIMS | Ready for Dev | not started |

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
`schemas/profiles/imports/gb/gbn-ag-v1.schema.json` (generic) and
`schemas/profiles/imports/gb/pims/gbn-ag-pims-v0.1.0.schema.json` (PIMS).

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
  subnode (`NotificationService.java:48`).
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
| `exchangedDocument.referenceDocument` | Hardcoded null | gap G3; `ExchangedDocument.java:34` |
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

**Status:** this hop's ticket, EUDPA-370, is **Ready for Dev** — not started. Its plan
(mint `gbn-ag-pims-v0.2.0.schema.json` describing the target shape first, get it
confirmed by the PIMS team, only then fix the 21 fields above in the mappers) matches
recommendation 4 in §4 below.

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
