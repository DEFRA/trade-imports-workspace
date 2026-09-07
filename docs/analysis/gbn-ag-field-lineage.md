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

### Fields the backend already has a home for — pure mapper omissions

The backend `Transport.java` model already has these fields; `transportFromFulfilment`
just never reads them. Cheapest gaps to close.

| Field | Evidence |
|---|---|
| `meansOfTransport` | `transport.js:21` destructures only `{ arrivalDateAtPort, portOfEntry }`; obligation gated at `evaluation.js:24` |
| `transportIdentification` | Same; `evaluation.js:26-28` |
| `transportDocumentReference` | Same; `evaluation.js:29-32` |
| `transitedCountries` | Same; `evaluation.js:33` |

### Cardinality loss (not a missing field)

`species-entry.js:10,16-17` reads `line.animalIdentifiers?.[0]` only — **ear tag and
passport are mapped from the first animal-identifier unit on a species line only.**
A second individually-tagged animal on the same line silently loses its identifiers.
Confirmed intentional-but-lossy by
`notification-mapper.test.js:301-329` ("Should intentionally keep ear tag and
passport from only the first unit").

### Not gaps, on inspection

- `documents` (accompanying-document metadata) — reaches the backend via a separate
  `DocumentController`/aggregate, correctly out of scope for the `notification`
  subnode (`NotificationService.java:48`).
- `declaration` — a submission consent checkbox, no domain data.

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
| `exchangedDocument.issuer` | Hardcoded null — **Confluence confirms this should carry "Person Responsible for Load"** | gap G1; `ExchangedDocument.java:33` |
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
   model or frontend work can carry them.**
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
