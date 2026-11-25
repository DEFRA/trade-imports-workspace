# EUDPA-776 verification: trade-imports-schemas PR #73

Head `d4d2b80e`, reviewed at `8de0f3b3`. The PR's own fixes are in `11fa9b1` and `d4d2b80`. The rest of the diff since the review (`.nvmrc`, dependabot, reference-data node-detail) came in from main. No author replies on the PR, inline or top-level.

Checks run on a scratch copy of the head: `npm run build-dictionary:gbn-ag` left `git status` clean, so the committed dictionary is byte-identical to the generator's output. `npm run validate-coherence` gave 0 errors and no `issuer` warning. `npm run validate-samples` passed all 36 samples, `gbn-ag-pims-v0.4.0.json` included. `npm test` gave 23 passes and 2 skips.

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | Major | FIXED | The regenerated `schemas/profiles/imports/gb/gbn-ag-data-dictionary.md` is byte-identical to the committed file, and `grep -i issuer` finds nothing in it. Fixed by `11fa9b1`: the profile now has its own `exchangedDocument.description` (`gbn-ag-v1.schema.json:21`), and `scripts/data-dictionary/schema-walker.js:139-149,273` drops false-schema properties. A new test, `build-data-dictionary.test.js` "a property the profile forbids with a false schema…", checks this. |
| 2 | Critical | FIXED | `gbn-ag-v1.schema.json:24` has `"issuer": false` under `exchangedDocument.properties`, so the allOf now rejects issuer. The coherence check no longer reports `[C2] … "issuer"`. `11fa9b1` removed issuer from `gbn-ag-v1-example.json`, the germplasm and multispecies examples, and all six event samples. The only GB sample with `"issuer"` is `pims/gbn-ag-pims-v0.3.0.json`, a historic version, which is correct. |
| 3 | Major | FIXED | `pims-data-mapping.md:357-358` now matches the Person responsible entry (54-55): from v0.3.0 the gateway no longer maps `issuer` while the page is out of the journey, and from v0.4.0 `exchangedDocument.issuer.postalAddress` is not in the schema and is not sent. |
| 4 | Minor | FIXED | `pims/gbn-ag-pims-v0.4.0-changes.md` ends `PIMS.\n`, a single trailing newline (`11fa9b1`). |
| 5 | Major | FIXED | `samples/imports/gb/gbn-ag/json/pims/gbn-ag-pims-v0.4.0.json` exists, with `$schema` `gbn-ag-pims-v0.4.0.schema.json` (line 2), `schemaVersion` `0.4.0` (line 213) and no `issuer`. `validate-samples`, which CI runs, reports it `ok`. |
| 6 | Major | PARTLY FIXED | `11fa9b1` removed every "New in vX", "previously", "PR #52", EUDPA key and "gap G18" from `gbn-ag-pims-v0.4.0.schema.json`, and a grep for those patterns now finds nothing. Version narration is still left in two places. Line 170 (`tradeCountrySubDivision`): "Described in v0.3.0, and already true of the v0.2.0 stream … A single object, as in v0.2.0." Line 5 (top-level): "v0.4.0 is v0.3.0 without exchangedDocument.issuer, because …". The Must says version history lives only in the `*-changes.md` files. |
| 7 | Major | FIXED | `schemas/core/defra-unvtd-canonical-core-v1.schema.json:856` now says the issuer is carried "For TRACES CHED … GBN-AG does not carry it." (`11fa9b1`). `d4d2b80` also changed the sibling email description at line 195, which no longer names the issuer party for pre-notifications. |

## Still open

- #6 (PARTLY FIXED): remove the version-history wording from `gbn-ag-pims-v0.4.0.schema.json:170` ("Described in v0.3.0, and already true of the v0.2.0 stream", "as in v0.2.0"). Also rephrase the top-level description at line 5 so it says what the schema is, not how it differs from v0.3.0, because the changes file already holds that.
