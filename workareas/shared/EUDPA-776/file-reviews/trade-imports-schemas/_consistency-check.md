# Consistency Check: trade-imports-schemas

**Ticket:** EUDPA-776
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-schemas, trade-imports-workspace
**PR:** #73 | **Commit:** 8de0f3b

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `exchangedDocument.issuer` removed from the internal GBN-AG event | backend ✅ (no longer emitted), gateway ✅ (no longer read) | ⚠️ removed from `gbn-ag-v1.schema.json` `properties` and `required`, but still inherited from the core | PARTIAL |
| PIMS v0.4.0 without `issuer` | gateway ✅ (`PimsEventV4`, `pims/gbnagv4`) | ✅ `pims/gbn-ag-pims-v0.4.0.schema.json`, `-changes.md`, README row | CONSISTENT |
| Per-version PIMS sample | v0.1.0, v0.2.0, v0.3.0 each have `samples/imports/gb/gbn-ag/json/pims/gbn-ag-pims-v0.X.0.json` | ❌ no `gbn-ag-pims-v0.4.0.json` | INCONSISTENT |
| `pims-data-mapping.md` "From PIMS v0.4.0" notes | — | ✅ Responsible person section (`:55`); ❌ Contact Address section (`:353-358`) | INCONSISTENT |

### Lead verified: `issuer` still inherited

`gbn-ag-v1.schema.json:8-11` is `allOf: [{ "$ref": "defra-unvtd-canonical-core-v1.schema.json#/$defs/CertificatePayload" }, …]`. The core's `ExchangedDocument` (`defra-unvtd-canonical-core-v1.schema.json:806-857`) still defines `issuer` (optional; `required` is `["identifier"]`). With no `additionalProperties: false`, a GBN-AG event carrying `issuer` still validates, and the core still documents it as "the responsible-person organisation with a named contact". The AC ("`gbn-ag-v1.schema.json` … ha[s] no `exchangedDocument.issuer`") is met textually, not structurally. The core is shared with CHED and other profiles, so removing it there is wrong. **Must:** say in `gbn-ag-v1.schema.json`'s `exchangedDocument` description (and the data dictionary) that the profile does not use the core's `issuer`; optionally forbid it in the profile with `"issuer": false` under `exchangedDocument.properties`.

## Missing Changes

- No `samples/imports/gb/gbn-ag/json/pims/gbn-ag-pims-v0.4.0.json`. Every earlier PIMS version has one, and the v0.3.0 sample (`:19`) carries `issuer`, so v0.4.0 has nothing showing the shape without it.
- The internal GBN-AG samples still carry `exchangedDocument.issuer`: `samples/imports/gb/gbn-ag/json/gbn-ag-v1-example.json:9` (listed in `schemas/README.md:91` as the GBN-AG sample), `gbn-ag-v1-germplasm-example.json:9`, `gbn-ag-v1-multispecies-example.json:9`, and `events/gbn-ag-event-notification-{created,submitted,submission-amended,amendment-cancelled,amendment-requested,submission-deleted}-v1.json`. They still validate (inheritance above), so nothing fails, but they show a field the producer no longer sends.

## Unique Changes

*None identified.* All six files are in the ticket's scope.

## Naming and Reuse

*None identified.* v0.4.0 file names follow the v0.2.0 / v0.3.0 pattern (`gbn-ag-pims-v0.4.0.schema.json`, `gbn-ag-pims-v0.4.0-changes.md`).

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `schemas/profiles/imports/gb/pims-data-mapping.md:353-358` ("Contact Address") | Schema path `exchangedDocument.issuer.postalAddress`; "From PIMS v0.3.0: the address is that of the contact the notifier picks for the consignment from their organisation's address book." No v0.4.0 line. | Nothing is sent from v0.4.0; v0.3.0 is sent empty. | States the new behaviour, as the Responsible person section (`:54-55`) does | Add "**From PIMS v0.4.0:** not in the schema and not sent, while the contact address page is out of the journey." |
| `samples/imports/gb/gbn-ag/json/gbn-ag-v1-example.json:9` (and the 8 other GBN-AG samples above) | Example event with `exchangedDocument.issuer` | The live animals producer never sends it. | Sample shows the event as produced | Remove `issuer` from the GBN-AG samples |
| `schemas/core/defra-unvtd-canonical-core-v1.schema.json:856` | `issuer` "For TRACES CHED and Defra import pre-notifications, this carries the responsible-person organisation with a named contact." | GBN-AG (a Defra import pre-notification) carries none. | Says GBN-AG does not | "…For TRACES CHED, … GBN-AG does not carry it." |

*Searched: `issuer`, `consignment contact`, `contact address`, `Contact Address`, `BRANCH_ADDRESS` in `schemas/**/*.md`, `schemas/**/*.json`, `samples/`, `README.md`.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 5 inconsistencies found
**Summary:** v0.4.0 and the profile edit match the gateway and backend, but `gbn-ag-v1` still inherits `issuer` from the core, the GBN-AG samples still show it, v0.4.0 has no sample, and the mapping doc's Contact Address section has no v0.4.0 line.
