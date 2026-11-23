# Repository Review: trade-imports-schemas

**PR:** #73
**Commit reviewed:** 8de0f3b310656024062b696f0c9f6e2b55ef95fd
**Files Changed:** 6

## Summary
Releases PIMS v0.4.0 as v0.3.0 without `issuer`, and tries to remove `issuer` from GBN-AG. The v0.4.0 schema is correct. But GBN-AG v1 still inherits `issuer` from the core `CertificatePayload` through `allOf`, so the AC is not met (#2). The data dictionary was edited by hand, and its generator puts `issuer` back. There is no v0.4.0 sample for CI to validate.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `schemas/README.md` | SAFE | 0 | 0 | 0 |
| `schemas/profiles/imports/gb/gbn-ag-data-dictionary.md` | NEEDS ATTENTION | 0 | 1 | 0 |
| `schemas/profiles/imports/gb/gbn-ag-v1.schema.json` | RISKY | 1 | 0 | 0 |
| `schemas/profiles/imports/gb/pims-data-mapping.md` | NEEDS ATTENTION | 0 | 1 | 0 |
| `schemas/profiles/imports/gb/pims/gbn-ag-pims-v0.4.0-changes.md` | SAFE | 0 | 0 | 1 |
| `schemas/profiles/imports/gb/pims/gbn-ag-pims-v0.4.0.schema.json` | NEEDS ATTENTION | 0 | 2 | 0 |

## Positive Observations
- `gbn-ag-pims-v0.4.0.schema.json` is exactly v0.3.0 minus `issuer`, apart from its header.
- The new changes document follows the v0.2.0 and v0.3.0 pattern.

## Test Coverage
- Unit tests: n/a.
- Validation: `validate-coherence` and `build-dictionary:gbn-ag` both still produce `issuer` for GBN-AG, and no v0.4.0 sample is checked (#5).

## Risk Assessment
**Overall Risk:** High
**Rationale:** The shared contract still defines the field the ticket removes, and regeneration undoes the hand edit.

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | schemas/profiles/imports/gb/gbn-ag-data-dictionary.md | 37 | Major | correctness | The dictionary is generated output ('npm run build-dictionary:gbn-ag', scripts/build-data-dictionary.js walks the profile into the core schema), but this PR edits it by hand: it deletes the issuer row (old line 37) and the 'the issuer' phrase in the exchangedDocument row (line 17). Regenerating from the PR's own schemas puts both back, with issuer as 'TradeParty \| no', because the core ExchangedDocument still defines issuer. The committed dictionary no longer matches what its generator produces from the schema it documents, and the next regeneration silently reverts this AC. | the committed dictionary is byte-identical to the output of 'npm run build-dictionary:gbn-ag' and has no exchangedDocument.issuer row or mention. | remove issuer from the GBN-AG profile's effective shape (see the gbn-ag-v1.schema.json finding), reword the core ExchangedDocument description if it should not mention the issuer for GBN-AG, then regenerate rather than hand-edit. |  |  |  |
| 2 | schemas/profiles/imports/gb/gbn-ag-v1.schema.json | 21 | Critical | correctness | The AC says gbn-ag-v1.schema.json has no exchangedDocument.issuer, but only 'issuer' was dropped from exchangedDocument.required (line 21). The profile's allOf (line 10) still pulls in defra-unvtd-canonical-core-v1.schema.json#/$defs/CertificatePayload, whose ExchangedDocument defines issuer as a TradeParty (core line 854). So the GBN-AG schema still defines and accepts issuer as an optional property. Evidence: 'npm run validate-coherence' still reports '[C2] gbn-ag :: schema property "issuer"', 'npm run build-dictionary:gbn-ag' writes an issuer row (required: no) back into the dictionary, and the GBN-AG samples (samples/imports/gb/gbn-ag/json/gbn-ag-v1-example.json:9, events/gbn-ag-event-notification-*-v1.json) still carry issuer and still validate. | the GBN-AG v1 profile does not define exchangedDocument.issuer, so the generated dictionary and the coherence check no longer list it, and no GBN-AG sample carries it. | add "issuer": false under exchangedDocument.properties in the profile (and teach build-data-dictionary.js to skip false-schema properties if it does not already), remove issuer from the gbn-ag-v1 samples and event samples, then regenerate the dictionary. |  |  |  |
| 3 | schemas/profiles/imports/gb/pims-data-mapping.md | 357 | Major | correctness | The 'Contact Address' section (lines 353-357) is untouched and now untrue: its schema path is exchangedDocument.issuer.postalAddress and line 357 says 'From PIMS v0.3.0: the address is that of the contact the notifier picks for the consignment from their organisation's address book.' This PR removes that page and stops sending issuer on every stream (line 54-55), so no PIMS version carries a contact address any more. The 'Person responsible' entry was updated, its sibling was not. | the Contact Address section says, as the Person responsible entry does, that no PIMS stream sends exchangedDocument.issuer.postalAddress while the contact address page is out of the journey, and v0.4.0 has no such path. | replace line 357 with the same two lines as 54-55, scoped to postalAddress. |  |  |  |
| 4 | schemas/profiles/imports/gb/pims/gbn-ag-pims-v0.4.0-changes.md | 20 | Minor | correctness | The file ends with no trailing newline ('\ No newline at end of file' in the diff, line 20), unlike its sibling gbn-ag-pims-v0.3.0-changes.md, which ends with one. | the file ends with a single newline. | add one after 'Not yet confirmed by PIMS.' |  |  |  |
| 5 | schemas/profiles/imports/gb/pims/gbn-ag-pims-v0.4.0.schema.json | 1 | Major | coverage-gap | Every earlier PIMS schema has a worked sample that 'npm run validate-samples' (CI: check-pull-request.yml:42) validates against it: samples/imports/gb/gbn-ag/json/pims/gbn-ag-pims-v0.1.0.json, v0.2.0.json and v0.3.0.json. The PR adds no gbn-ag-pims-v0.4.0.json, so CI only compiles the new schema and nothing shows a v0.4.0 payload without issuer, the shape the gateway now publishes. | a v0.4.0 PIMS sample with no exchangedDocument.issuer exists beside the earlier ones and is validated against gbn-ag-pims-v0.4.0.schema.json in CI. | copy gbn-ag-pims-v0.3.0.json to gbn-ag-pims-v0.4.0.json, drop issuer, set $schema and metadata.schemaVersion to v0.4.0. |  |  |  |
| 6 | schemas/profiles/imports/gb/pims/gbn-ag-pims-v0.4.0.schema.json | 55 | Major | history | The newly minted v0.4.0 schema copies v0.3.0's version-history and ticket narration into its published descriptions: 'New in v0.2.0 ... Previously dropped entirely (PR #52)' (lines 41, 55, 63), 'the EUDPA-370 planning notes' (line 55), 'until EUDPA-369 wired ...' (line 63), 'previously hardcoded null (moot until EUDPA-369 ...)' and 'gap G18' (tradeLineItem, ~line 304), and 'New in v0.2.0/v0.3.0 ... previously omitted, PR #52' on most $defs. A consumer reading v0.4.0 is told what changed two and three versions ago, with internal ticket and PR ids; the version-to-version diff already lives in the gbn-ag-pims-v0.N.0-changes.md files. | descriptions in gbn-ag-pims-v0.4.0.schema.json state what each field holds now, with no 'New in vX', 'previously', PR numbers, Jira keys or gap ids; version history lives only in the *-changes.md files. | strip those clauses from each description, keeping the sentences that define the field. |  |  |  |
| 7 | schemas/core/defra-unvtd-canonical-core-v1.schema.json | 856 | Major | comments | Core ExchangedDocument.issuer description says Defra import pre-notifications carry the responsible-person organisation with a named contact; GBN-AG (a Defra import pre-notification) no longer carries issuer | the core description does not claim GBN-AG carries issuer. | 'For TRACES CHED … GBN-AG does not carry it.' |  |  |  |

## Repository Verdict
**Status:** RISKY
