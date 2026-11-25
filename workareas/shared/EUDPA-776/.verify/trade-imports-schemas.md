# EUDPA-776 — trade-imports-schemas PR #73 verification (refresh 2026-11-25)

Head checked: `7371fd2`. Commits in the window (`d4d2b80..7371fd2`):
- `c48f63a` fix(EUDPA-776): drop the issuer party claim from the contact email description
- `7895d52` fix(EUDPA-776): prove the document table holds exactly the kept properties
- `c7a20a6` fix(EUDPA-776): delete the unreachable false-schema guard in buildNode
- `7371fd2` fix(EUDPA-776): extract the allOf property merge and move its rationale to docs

Author replies: none on GitHub; no commit message in the window argues against a finding (all four are fixes with no body).

The window touches only `docs/jsonld-mapping-notes.md`, the core schema (line 195), `scripts/build-data-dictionary.test.js` and `scripts/data-dictionary/schema-walker.js`. The clone has no `node_modules`, so no tests or generators were run; the checks below are from the code. The walker change in the window is behaviour-preserving (`mergeBranchProperty` is the old inline loop body, and the removed `buildNode` guard was only reachable for a non-allOf `false` property, which no profile has), and the changed core description (emailURIUniversalCommunication) is not rendered in the GBN-AG dictionary, so the dictionary byte-identity verified at `d4d2b80` still holds.

| # | Severity | Status | Evidence |
|---|---|---|---|
| 1 | Major | FIXED | `gbn-ag-data-dictionary.md` has no `issuer` row or word (grep finds none); the `exchangedDocument` table (lines 25-42) lists exactly the 16 kept properties. Generator output unchanged by the window (see note above), so it stays byte-identical to what `npm run build-dictionary:gbn-ag` writes. The section intro still says "who issued it" (see New problems). |
| 2 | Critical | FIXED | `schemas/profiles/imports/gb/gbn-ag-v1.schema.json:24` `"issuer": false` under `exchangedDocument.properties`, so the allOf with core `CertificatePayload` forbids it. No GBN-AG v1 sample or event sample carries `issuer`; the only GB sample with it is the historic `pims/gbn-ag-pims-v0.3.0.json:19`. The walker drops it via `mergeBranchProperty` (`schema-walker.js:66-75`). |
| 3 | Major | FIXED | `pims-data-mapping.md:357-358` mirror the Person responsible entry (54-55): from v0.3.0 the gateway no longer maps `issuer` while the page is out of the journey; from v0.4.0 `exchangedDocument.issuer.postalAddress` is not in the schema and is not sent. Unchanged in the window. |
| 4 | Minor | FIXED | `pims/gbn-ag-pims-v0.4.0-changes.md` ends `…by PIMS.\n`, a single newline. |
| 5 | Major | FIXED | `samples/imports/gb/gbn-ag/json/pims/gbn-ag-pims-v0.4.0.json` has `$schema` `gbn-ag-pims-v0.4.0.schema.json` (line 2), `schemaVersion` `0.4.0` (line 213), no `issuer`. `validate-samples.js` walks every `.json` under `samples/` and CI runs it (`.github/workflows/check-pull-request.yml:42`). |
| 6 | Major | PARTLY FIXED | Not touched in the window. "New in vX", "previously", PR numbers, EUDPA keys and gap ids are gone, but `gbn-ag-pims-v0.4.0.schema.json:170` still says "Described in v0.3.0, and already true of the v0.2.0 stream" and "A single object, as in v0.2.0", and line 5 says "v0.4.0 is v0.3.0 without exchangedDocument.issuer, because…". |
| 7 | Major | FIXED | `schemas/core/defra-unvtd-canonical-core-v1.schema.json:856` "For TRACES CHED, this carries the responsible-person organisation… GBN-AG does not carry it." |
| 8 | Major | FIXED | `c48f63a`: `defra-unvtd-canonical-core-v1.schema.json:195` now ends "…consignor / consignee / delivery / carrier parties." with no TRACES CHED issuer claim, exactly the suggested wording. |
| 9 | Major | FIXED | `7895d52`: `scripts/build-data-dictionary.test.js:193-195` slices the `## Document (\`exchangedDocument\`)` section, collects every row's property name and `deepEqual`s it, sorted, against `exchangedDocumentProperties`. An `issuer` row would add an element and turn it red, so the title's "left out of … the dictionary" is now proven. |
| 10 | Major | FIXED | `c7a20a6`: the `if (propSchema === false) continue;` line is gone from `buildNode` (`schema-walker.js:259-268`). The only remaining false-schema handling is in `mergeBranchProperty` (66-75), reached by `gbn-ag-v1` `issuer: false` and covered by the item-9 test. |
| 11 | Major | PARTLY FIXED | `7371fd2` extracted `mergeBranchProperty` (66-75), rewrote the `flatten` header (76-78) to drop the untrue "later one wins"/"downstream callers" text, deleted the stale allOf comment, the "Last-wins on description" rationale and the "Recurse into properties/items" restatements, and moved the merge rules to `docs/jsonld-mapping-notes.md:39-46`. Still carrying rationale: `schema-walker.js:165-167` "take the more restrictive bound…, so a profile narrowing on top of a permissive core wins" (old 176-178, named in the item and now duplicated in the docs), `159-161` "must survive the merge, or the dictionary drops the slot's reference-data line", and `84-88` "it speaks to this slot specifically…". Restating: `193` "Merge properties…", `200` "If exactly one branch has a clear type, use it…", `264` "Lift sibling urlId const onto the parent". |

## Still open
- **#6:** `gbn-ag-pims-v0.4.0.schema.json:170` still narrates v0.2.0/v0.3.0 history, and line 5 describes v0.4.0 as a diff from v0.3.0; that belongs only in `gbn-ag-pims-v0.4.0-changes.md`.
- **#11:** `schema-walker.js:165-167` (named in the item) still carries the minItems/maxItems rationale now also in the docs; `159-161` and `84-88` carry rationale and `193`, `200`, `264` restate the code. The Must covers every comment in the file.

## New problems
- `scripts/data-dictionary/dictionary-main-template.js:51` → `schemas/profiles/imports/gb/gbn-ag-data-dictionary.md:23` [Minor] The `exchangedDocument` section intro still says the document "Identifies the pre-notification, who issued it", but GBN-AG no longer carries an issuer. Must: the GBN-AG dictionary's Document section intro does not say the payload identifies who issued it; change the template intro and regenerate.
- `docs/jsonld-mapping-notes.md:39-46` [Nit] The data-dictionary generator's allOf merge rules were added to the JSON-LD mapping notes, a doc about JSON-LD aliases, where a reader of the generator will not look. Must: the merge rules live in a doc about the data dictionary generator (for example a `docs/data-dictionary.md` or the generator's existing docs), linked from nothing that implies JSON-LD.
