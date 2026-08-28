# Repository Review: trade-imports-animals-frontend

**PR:** #213
**Commit:** fa4a0b779c33d102ce3da81abbfcc6fc2dc653b3
**Files Changed:** 53

## Summary

EUDPA-349 does two things at once. The mechanical half swaps the fulfilment-index
segment separator from `/` to `.` (`INDEX_DELIMITER`) and tightens the token-validation
regex so no token can contain either delimiter — that part is executed cleanly and
consistently, with fixtures migrated in lock-step across the evaluator, bridge, status
and characterisation suites. The second half — AC 3's "resolve the naming confusion"
between a `fulfilmentId` (`<obligationId>:line0.unit1`) and a `fulfilment index`
(`line0.unit1`) — is applied to roughly the top two-thirds of the call graph and then
stops. Function and property names were renamed; the locals, parameters, filenames and
doc comments they feed were largely not.

The one issue that blocks merge is not naming at all: the delimiter swap silently
reinterprets data that is already persisted, and does so as a hard throw rather than a
degradation.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/server/app/bridge/collection-complete.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/bridge/fulfilment-bindings.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/bridge/fulfilment-id.js` | NEEDS ATTENTION | 0 | 3 | 1 |
| `src/server/app/bridge/fulfilment-id.test.js` | NEEDS ATTENTION | 0 | 1 | 2 |
| `src/server/app/bridge/fulfilment-registry.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/bridge/fulfilment-registry.test.js` | NEEDS ATTENTION | 0 | 1 | 1 |
| `src/server/app/bridge/fulfilments.characterisation.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/bridge/fulfilments/fulfilment-id-path.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/bridge/fulfilments/fulfilments.test.js` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/server/app/bridge/fulfilments/index.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/bridge/fulfilments/project-answers/assemble.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/bridge/fulfilments/project-answers/dense-indices.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/bridge/fulfilments/project-answers/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/bridge/fulfilments/project-answers/projections.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/bridge/purge.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/bridge/read-fulfilment.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/bridge/scope.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/bridge/status/completeness/index.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/bridge/status/completeness/invariants.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/bridge/status/completeness/leaf.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/bridge/status/completeness/records.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/bridge/status/index.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/model/analysis/reachability/fidelity/confirm.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/model/analysis/reachability/fidelity/witness-fulfilments.js` | SAFE | 0 | 0 | 2 |
| `src/server/app/model/analysis/reachability/witness/synthesise.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/evaluator.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/evaluator.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/model/obligations/evaluator.units.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/evaluator/enumeration/enumerate-group-fulfilment-ids.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/model/obligations/evaluator/enumeration/enumerate-group-fulfilment-indexes.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/model/obligations/evaluator/enumeration/enumerate-group-paths-from-storage.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/evaluator/implications/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/evaluator/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/evaluator/internal/group-instance-paths.js` | NEEDS ATTENTION | 0 | 1 | 1 |
| `src/server/app/model/obligations/evaluator/purge/purge-storage.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/model/obligations/evaluator/scope/run-applicability-decisions.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/helpers/helpers.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/model/obligations/helpers/index.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/model/obligations/helpers/projection/allow-listed.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/helpers/projection/internals/filter-and-project.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/model/obligations/helpers/projection/not-in-union-of.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/helpers/scalar/branched-gate.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/helpers/scalar/equals-gate.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/model/obligations/path-prefix-depth.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/model/obligations/state-queries.js` | NEEDS ATTENTION | 0 | 2 | 1 |
| `src/server/app/model/obligations/state-queries.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/fulfilment-codec/fulfilment-codec.test.js` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/shared/lines/from-fulfilment.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/sets/live-animals/docs/add-a-collection.md` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/commodities/evaluation.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/fixtures/characterisation-oracles.json` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/obligations/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/obligations/whitelists.test.js` | SAFE | 0 | 0 | 1 |

## Positive Observations

- **The delimiter swap itself is complete and correct.** Every fixture that had to move
  moved: `evaluator.test.js`, `evaluator.units.test.js`, `state-queries.test.js`,
  `path-prefix-depth.test.js`, `helpers.test.js`, `fulfilments.test.js`,
  `commodities/evaluation.test.js` and `characterisation-oracles.json` all track the new
  separator, and grep finds no `/`-delimited index literal left in `src/`.
- **Producer/consumer pairs were renamed together, not one side at a time.** The
  `fulfilmentIndexesByObligationId` context key, the `records[].fulfilmentIndex` property
  and the `enumerateGroupFulfilmentIndexes` export each change on both sides in the same
  commit — a half-applied rename here would have surfaced as a silent `undefined`, and
  none did. Repo-wide greps for the old identifiers return zero hits.
- **AC 2 is properly delivered.** `FIELD_UNSAFE = /[.:[\]/*]/` in `fulfilment-registry.js`
  bans both delimiters inside a token, which is what makes the `startsWith(parent + '.')`
  prefix matching in `completeness/records.js` and `filter-and-project.js` sound rather
  than merely probable.
- **Tests assert literals, not constants.** Fixtures hardcode `'.'` instead of importing
  `INDEX_DELIMITER`, so a future separator change breaks the tests rather than silently
  following them. That is the right call and was made consistently.
- **The two new composite helpers are delimiter-symmetric** — `formatCompositeFulfilmentId`
  / `parseCompositeFulfilmentId` round-trip losslessly, and the outer `:` is kept distinct
  from the inner `.` exactly as the ticket's tech notes argue for.

## Test Coverage

- **Unit tests:** Good for the delimiter swap. Every touched behaviour has a test that
  would fail if the separator regressed, and the depth-2 cases genuinely exercise the
  split (`d1.c1.p1` must split on `.` to yield the expected prefix sets).
- **Integration / E2E:** A structural gap. The tests repo seeds only depth-1 indexes
  (`api-journey.ts:54-58` — no `unit[0-9]` anywhere), and depth-1 indexes contain no
  delimiter at all. The E2E suite therefore cannot catch a delimiter regression, and did
  not catch this one.
- **Back-compat:** Uncovered, and the coverage that existed was removed. The codec suite's
  `preserve unknown UUID entries` case was the only fixture standing in for historic
  persisted data; it was migrated in place from `historic0/record3` to `historic0.record3`
  rather than joined by a legacy sibling.
- **Missing negative cases:** `parseCompositeFulfilmentId` is only exercised on well-formed
  input, despite the ticket positioning it as the value that arrives from URL params and
  API path segments. A trailing `:`, a bare `:`, and a non-string argument are all
  unasserted, and the last throws on `.indexOf`.

## Risk Assessment

**Overall Risk:** Medium

**Rationale:** The change is behaviourally narrow and well tested where it is tested, but
it alters the encoding of a key that is already written to persistent storage, and the
failure mode on old data is an unloadable notification rather than a visible glitch.
Everything else is naming debt — real against AC 3, but not a merge risk.

## Cross-cutting themes

Three themes account for most of the 44 items; the walker will move faster reading them
as groups than one at a time.

**1. Back-compat on persisted indices (item 44, plus 4, 11, 40).** Traced end to end: a
stored `line0/unit0` is one segment under the new delimiter, `hasIndexedSegments` still
passes because the last character is a digit, the depth check then sees 1 vs 2 and calls
`fail()` — which is `throw new TypeError`. `marshal/document.js` runs that decode on every
notification load, so a saved depth-2 notification becomes unloadable. Depth-1 is
unaffected. `Notification.submittedFulfilmentsBaseline` holds a second copy of the same
payload for AMEND, so a one-shot write migration would still leave `cancelAmend` restoring
unreadable records — any fix has to be read-path normalisation. The backend stores the
payload opaquely (`Notification.java:49`), so the frontend codec is the only place this can
be fixed. This is the one item that should be settled before merge; if the answer is "no
depth-2 notifications exist anywhere that matters", that is a legitimate answer, but it
should be written down rather than assumed.

**2. `INDEX_DELIMITER` duplicated four ways (items 24, 31, 36, and `bridge/fulfilment-id.js`).**
`model/obligations/state-queries.js`, `evaluator/internal/group-instance-paths.js` and
`helpers/projection/internals/filter-and-project.js` each carry a private `const
INDEX_DELIMITER = '.'` with an identical "kept in sync with `bridge/fulfilment-id.js`"
comment. Nothing enforces the agreement, and divergence would mis-split indices silently
rather than fail. Worth noting: the stated justification is incomplete. The dep-cruiser
`model-import-boundary` rule is real, but `bridge/` may import from `model/`
(`bridge-no-up` blocks only `engine|flow|analysis`, and `bridge/fulfilment-id.js:1`
already imports downward). So a single declaration is reachable without weakening the
boundary — own the constant in `model/` and re-export it from `bridge/fulfilment-id.js`.

**3. The rename stops two-thirds of the way down (roughly 25 Minor/Major items).** The
pattern repeats: the exported function or property is renamed, the local that feeds it is
not. `fulfilment-bindings.js:79` computes `formatFulfilmentIndex(...)` into a local called
`fulfilmentId`; `purge-storage.js:15` compares a `fulfilmentIndexes` Set against a loop
variable named `fulfilmentId`; `read-fulfilment.js` renamed `instanceIds` to
`groupFulfilmentIndexes` but kept `parentId`/`id`/`ids`; `from-fulfilment.js` calls the
renamed method and binds the result to `lineId`/`unitIds`. Two filenames also lag their
contents — `fulfilments/fulfilment-id-path.js` now exports only index helpers, and
`enumerate-group-fulfilment-indexes.js` still opens with a doc comment about "composite
fulfilmentId". Individually trivial; collectively they are the AC the ticket exists for,
so the question for the walker is whether AC 3 is met, not whether each line matters.

**A deliberate exception worth documenting rather than fixing (item 41).** The persisted
wire key `records[].fulfilmentId` is a three-repo contract — hardcoded in the tests repo
(`notification-fulfilments.ts:14`, `api-journey.ts:29-31`) and stored byte-faithfully by
the backend. Renaming it would break stored documents and E2E together, so keeping it is
almost certainly correct. But it now carries an index while being named an id, at the least
changeable boundary in the system, with nothing in the codec saying why. That wants a
comment, not a rename.

## Repository Verdict

**Status:** NEEDS ATTENTION
| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/server/app/bridge/collection-complete.js | 9 | Major | naming | Module header still names the removed export `instanceFulfilmentId` and calls its result a 'composite fulfilmentId prefix'; the function is now `fulfilmentIndexInstance` and returns a fulfilment index (`line0.unit1`), not a composite fulfilmentId (`<obligationId>:line0.unit1`) — it is the only surviving reference to the old symbol anywhere under src/server, and AC 3 asks for exactly this naming consistency | Rewrite lines 9-11 (and the 'leaf composite prefixes' phrasing at line 24) to say `fulfilmentIndexInstance` maps a positional entry to its fulfilment index |  |  |  |
| 2 | src/server/app/bridge/fulfilment-bindings.js | 79 | Major | naming | The call was renamed to formatFulfilmentIndex but the local it feeds is still 'fulfilmentId' (line 79), and it flows into addGroupedValue's 'fulfilmentId' parameter (lines 61, 67) and becomes the record key — the value is a fulfilment index (e.g. 'line0.unit1'), not a fulfilmentId ('<obligationId>:line0.unit1'), which is exactly the ambiguity AC 3 asks to remove; sibling call sites (collection-complete.js:137) already use 'fulfilmentIndex'. | Rename the local at line 79 and the addGroupedValue parameter (lines 61, 67) to 'fulfilmentIndex' so the name matches what formatFulfilmentIndex returns. |  |  |  |
| 3 | src/server/app/bridge/fulfilment-id.js | 4 | Major | back-compat | Switching INDEX_DELIMITER from '/' to '.' changes the shape of a PERSISTED key, not just an in-memory one: fulfilment indices are the record-map keys encoded by services/persistence/records/fulfilment-codec/encode.js (recordsEntry(obligationId, stored)) and validated on read by unknown-stored.js. A draft saved before this deploy carries 'line0/unit1'; after it, hasIndexedSegments('line0/unit1') still returns true (no '.', last char is a digit) so the value is accepted but segmentsOf yields ONE segment instead of two, silently resolving a depth-2 fulfilment as depth-1 rather than failing loudly. No migration or legacy-delimiter handling exists anywhere in services/persistence. | Confirm no persisted notification drafts carry '/'-delimited record keys; if any can, add decode-time handling in the fulfilment-codec that either rewrites '/' to INDEX_DELIMITER or rejects legacy keys explicitly, so a stale key can never be misread as a shallower index. |  |  |  |
| 4 | src/server/app/bridge/fulfilment-id.js | 22 | Major | naming | AC 3 (resolve the fulfilmentId / fulfilment index naming confusion) is only half applied in this file. The PR renamed formatFulfilmentId -> formatFulfilmentIndex, instanceFulfilmentId -> fulfilmentIndexInstance and indicesOf's parameter, but segmentsOf still names its parameter 'fulfilmentId' on the very line the PR rewrote, and it now splits on INDEX_DELIMITER. Under the vocabulary this PR establishes a fulfilmentId is '<obligationId>:<index>', so passing one to segmentsOf returns ['<uuid>:line0','unit1'] - the name now actively invites the wrong argument. Every caller (read-fulfilment.js:47, fulfilments/fulfilment-id-path.js:13) correctly passes a fulfilmentIndex. hasIndexedSegments (line 34) has the same stale parameter name and the same callers. | Rename the segmentsOf parameter to fulfilmentIndex to match indicesOf, and do the same for hasIndexedSegments and its unknown-stored.js caller variable, so no identifier in the module calls an index an id. |  |  |  |
| 5 | src/server/app/bridge/fulfilment-id.js | 12 | Major | error-handling | parseCompositeFulfilmentId calls composite.indexOf with no type guard. The ticket positions the composite fulfilmentId as the value crossing untrusted boundaries (URL params, API path segments), so the first real caller will hand it request input: a missing or non-string param throws TypeError: Cannot read properties of undefined, surfacing as a 500 rather than a controlled 400/404. hasIndexedSegments on line 34 already sets the guarding precedent in this module (typeof === 'string' && length > 0), and the new function does not follow it. Neither is there any validation that the parsed obligationId is a UUID or that the index matches the token shape FIELD_UNSAFE/TOKEN enforce in fulfilment-registry.js, so a decoded pair is trusted purely on the presence of a ':'. | Guard the input the way hasIndexedSegments does - return null (or a documented empty result) for a non-string or empty composite - and either validate obligationId/index shape here or state in the module comment that the caller owns validation before lookup. |  |  |  |
| 6 | src/server/app/bridge/fulfilment-id.js | 7 | Minor | dead-code | formatCompositeFulfilmentId and parseCompositeFulfilmentId have no production caller anywhere in src - a grep across the repo finds only fulfilment-id.test.js. Nothing in the frontend yet emits or consumes a '<obligationId>:<index>' string, so the composite encoding is exercised only by its own unit tests and can drift out of step with the real boundary before EUDPA-333 arrives to use it. | Acceptable if deliberate groundwork for EUDPA-333 (the ticket names it as a blocker) - if so, say so in the module comment on line 1 so a later reader does not read the pair as dead code; otherwise wire it into the URL boundary in this PR. |  |  |  |
| 7 | src/server/app/bridge/fulfilment-id.test.js | 50 | Major | test-coverage | The parseCompositeFulfilmentId suite only exercises well-formed composites; the degenerate inputs a URL boundary actually receives are unasserted — a trailing delimiter '<uuid>:' parses to index '' and then does NOT round-trip (formatCompositeFulfilmentId(id, '') drops the ':'), and '' / undefined have no asserted contract (undefined throws TypeError at composite.indexOf). | Add cases for the trailing-delimiter composite ('<uuid>:'), the empty string, and a non-string input, asserting the intended contract (either normalise an empty index to null in parseCompositeFulfilmentId so the round-trip property holds, or assert the documented throw). |  |  |  |
| 8 | src/server/app/bridge/fulfilment-id.test.js | 62 | Minor | comment-accuracy | The comment justifies the 'index can never contain :' invariant with the FIELD_UNSAFE regex, but FIELD_UNSAFE (fulfilment-registry.js:6) validates store field names (binding.field / group.field), not index segments; index segments are built from group.token in formatFulfilmentIndex and are guarded by TOKEN = /^[A-Za-z][A-Za-z-]*$/ instead. | Point the comment at the TOKEN regex in fulfilment-registry.js (the guard that actually constrains index segments), or drop the justification and keep the behavioural assertion. |  |  |  |
| 9 | src/server/app/bridge/fulfilment-id.test.js | 13 | Minor | test-naming | The test name claims both delimiters are 'RFC 3986 unreserved characters'; ':' is a reserved gen-delim under RFC 3986 section 2.2 (unreserved is ALPHA / DIGIT / '-' / '.' / '_' / '~'), so the stated rationale for the chosen delimiter is wrong in the one place a reader looks for it. | Reword to what is actually true and what the ticket relies on — e.g. 'distinct RFC 3986 path characters that survive URL encoding unescaped' — keeping the two toBe assertions unchanged. |  |  |  |
| 10 | src/server/app/bridge/fulfilment-registry.js | 6 | Minor | maintainability | FIELD_UNSAFE hard-codes '.' and ':' as literals even though the sibling module ./fulfilment-id.js exports them as INDEX_DELIMITER and FULFILMENT_ID_DELIMITER, and the new comment justifies the ban in fulfilment-id terms although the regex only guards store field names (assertField -> 'invalid store field'), which never enter a fulfilment id (the index is built from group.token in formatFulfilmentIndex, and tokens are constrained separately by TOKEN) | Import { INDEX_DELIMITER, FULFILMENT_ID_DELIMITER } from './fulfilment-id.js' (same directory, no cycle - fulfilment-id.js has no imports) and build the character class from them, or at minimum add the repo's existing 'Kept in sync with bridge/fulfilment-id.js#INDEX_DELIMITER' note used by state-queries.js, group-instance-paths.js and filter-and-project.js; reword the comment to state the store-field reason ('.' is the store-path separator joined by groupedPathOf/pathOf, ':' is reserved so a field can never be mistaken for a composite fulfilment id) |  |  |  |
| 11 | src/server/app/bridge/fulfilment-registry.test.js | 72 | Major | naming | Test title calls `:` 'the fulfilment index delimiter', but fulfilment-id.js defines `:` as FULFILMENT_ID_DELIMITER (obligation/index boundary) and `.` as INDEX_DELIMITER (the fulfilment index delimiter) - the title swaps the two names, re-introducing the exact confusion AC 3 exists to remove | Rename to 'Should reject a field containing the fulfilment id delimiter `:`' (matching FULFILMENT_ID_DELIMITER), and consider re-titling the sibling `.` test at line 63 to name the fulfilment index delimiter explicitly |  |  |  |
| 12 | src/server/app/bridge/fulfilment-registry.test.js | 78 | Minor | assertion-specificity | The assertion /invalid store field/ is identical to the sibling '.' test at line 69, so it does not prove the ':' field was the one rejected - the message's offending-field fragment is not asserted | Tighten to .toThrow(/invalid store field "country:ofOrigin"/) so the assertion pins which field the guard rejected |  |  |  |
| 13 | src/server/app/bridge/fulfilments/fulfilment-id-path.js | 1 | Minor | naming | Every export and parameter in this module was renamed fulfilmentId -> fulfilmentIndex, but the module filename is still fulfilment-id-path.js, so the file now claims to be about fulfilment ids while exporting only fulfilment-index helpers — the exact confusion AC3 asks the PR to remove. | Rename the file to fulfilment-index-path.js and update the two importers (fulfilments/index.js, project-answers/assemble.js and projections.js) to match. |  |  |  |
| 14 | src/server/app/bridge/fulfilments/fulfilments.test.js | 154 | Major | naming | Test title still advertises the old slash shape — 'two-segment composite (line<i>/unit<j>)' — while the body it names now asserts 'line0.unit0'/'line0.unit1', so the one test that documents the depth-2 index shape contradicts the delimiter this ticket introduces (AC: use '.' as the segment separator throughout; resolve the naming confusion). | Rename to 'Should translate a depth-2 nested array to a two-segment composite (line<i>.unit<j>)'. |  |  |  |
| 15 | src/server/app/bridge/fulfilments/fulfilments.test.js | 209 | Major | coverage | The separator change silently reinterprets already-stored fulfilment indices: a persisted 'line0/unit0' key now parses as ONE segment (hasIndexedSegments passes, trailing '0' is a digit), so projectAnswers throws the misleading 'within chain requires depth 2' instead of flagging a legacy key — and nothing in this file's validation describe block pins that behaviour, so the back-compat question the delimiter swap raises is untested. | Add a case to the 'page projection validation and ordering' block that feeds a legacy slash-keyed index (e.g. { [earTag.id]: { 'line0/unit0': 'x' } }) and asserts the agreed outcome — either a clear legacy-key rejection message or a documented migration — so the decision is recorded rather than implicit. |  |  |  |
| 16 | src/server/app/bridge/fulfilments/index.js | 29 | Major | naming | The re-export was renamed to fulfilmentIndexToPath but the module it comes from is still './fulfilment-id-path.js', whose contents are now entirely fulfilment-index concerns (validateFulfilmentIndex, fulfilmentIndexToPath); it also near-collides with the genuinely id-shaped src/server/app/bridge/fulfilment-id.js, which is exactly the id-vs-index confusion AC3 asks to resolve | Rename the module to fulfilment-index-path.js and update the three import sites (this barrel, project-answers/assemble.js, project-answers/projections.js) |  |  |  |
| 17 | src/server/app/bridge/fulfilments/project-answers/assemble.js | 2 | Minor | naming | Import still points at 'fulfilment-id-path.js', but that module now exports only index-based helpers (fulfilmentIndexToPath, validateFulfilmentIndex) — the stale filename re-introduces the id/index confusion AC 3 sets out to remove. | Rename the module to fulfilment-index-path.js and update this import plus the other importers. |  |  |  |
| 18 | src/server/app/bridge/fulfilments/project-answers/projections.js | 3 | Minor | naming | Import still points at '../fulfilment-id-path.js', a module that after this PR exports only validateFulfilmentIndex/fulfilmentIndexToPath — the filename keeps the 'fulfilment-id' wording the ticket is trying to disambiguate, while the PR did rename the sibling enumerate-group-fulfilment-ids.js to ...-indexes.js | Rename the module to fulfilment-index-path.js and update this import (plus the other importers in bridge/) for consistency with AC3 |  |  |  |
| 19 | src/server/app/bridge/read-fulfilment.js | 89 | Major | naming | The rename stops at the function names: 'parentId' (lines 42, 89, 106), the 'id' locals (51, 64, 102) and the 'ids' set (98, 109, 113) all hold fulfilment *indexes* (e.g. 'line0'), not fulfilmentIds ('<obligationId>:line0'), so the file still carries the exact id-vs-index conflation AC 3 asks to remove; the retained comment on line 87 ('each exact composite-id prefix') now reads as the composite id defined in fulfilment-id.js, which is not what is being truncated. | Rename 'parentId' to 'parentIndex' (and the caller's argument in from-fulfilment.js), the 'id' locals to 'index'/'groupIndex', 'ids' to 'indexes', and reword the line 86-88 comment to say 'fulfilment index prefix' rather than 'composite-id prefix'. |  |  |  |
| 20 | src/server/app/bridge/status/completeness/index.js | 77 | Minor | naming | The rename stopped at the property: 'rec.fulfilmentIndex' (line 44) is still bound to parameters named 'recId'/'parentRecId' in collectionSatisfied, entrySatisfied and memberSatisfied, and compared against 'error.fulfilmentIndex' at line 82 — AC3's 'consistently refers to fulfilment index' is only half met in this file. | Rename the 'recId'/'parentRecId' parameters to 'fulfilmentIndex'/'parentFulfilmentIndex' here (and in the matching signatures in records.js, invariants.js and leaf.js) so the local name matches the value it carries. |  |  |  |
| 21 | src/server/app/bridge/status/completeness/invariants.js | 10 | Minor | naming | The renamed line now reads 'error.fulfilmentIndex === parentRecId', mixing the new domain term with the old 'recId' vocabulary; the parameter and the lines 5-7 comment ('keyed by the PARENT record id ... not this collection's own record ids') still use the pre-rename wording that AC 3 asks to retire. | Rename the parameter to parentFulfilmentIndex (and its call sites in ./index.js and ./records.js) and reword the comment to say parent fulfilment index. |  |  |  |
| 22 | src/server/app/bridge/status/completeness/leaf.js | 7 | Minor | naming | The doc comment above leafInScopeForRecord still says the record's 'fulfilmentId' is matched, but line 15 now matches r.fulfilmentIndex — under this ticket's vocabulary a fulfilmentId is <obligationId>:<index>, so the comment now names the wrong concept and works against AC3 (resolve the naming confusion). | Reword line 7 to 'A leaf is present for a record iff the record's fulfilmentIndex is in the leaf's in-scope implication (post-purge membership).' |  |  |  |
| 23 | src/server/app/bridge/status/index.js | 22 | Minor | naming | The same doc block renamed at line 32 still says the implication 'records[] carries that record's fulfilmentId' at line 22, but leaf.js matches on 'r.fulfilmentIndex === recId' — under this ticket's vocabulary that value is a fulfilment index, not a fulfilmentId (obligationId:index). | Change 'fulfilmentId' to 'fulfilmentIndex' on line 22 so the whole doc block uses the AC's vocabulary consistently. |  |  |  |
| 24 | src/server/app/model/analysis/reachability/fidelity/confirm.js | 6 | Minor | naming | The renamed binding 'fulfilmentIndexes' holds a Map of obligationId -> index strings, but elsewhere in the model 'fulfilmentIndexes' names a flat array of index strings (evaluator/implications/index.js); the canonical name for this Map in the applyTo contract is 'fulfilmentIndexesByObligationId' (evaluator/index.js JSDoc line 23) | Rename the destructured binding (and the corresponding key returned by witness-fulfilments.js) to 'fulfilmentIndexesByObligationId' so the applyTo second argument carries one consistent name across the model |  |  |  |
| 25 | src/server/app/model/analysis/reachability/fidelity/witness-fulfilments.js | 11 | Minor | magic-string | The new index delimiter is baked into the string literal 'line1.unit1' rather than derived from a named constant, so it is invisible to a grep for INDEX_DELIMITER; sibling model/ files (state-queries.js, evaluator/internal/group-instance-paths.js, helpers/projection/internals/filter-and-project.js) all declare a local 'const INDEX_DELIMITER = "."' with a 'Kept in sync with bridge/fulfilment-id.js#INDEX_DELIMITER' comment, and this witness path must match that delimiter or filterAndProject's prefix test fails and the fidelity check reports a misleading 'witness did not open the gate'. | Declare the same local 'const INDEX_DELIMITER = '.'' with the standard sync comment and build the path from it, e.g. fulfilmentIndexes.set(witness.projection, [['line1', 'unit1'].join(INDEX_DELIMITER)]). |  |  |  |
| 26 | src/server/app/model/analysis/reachability/fidelity/witness-fulfilments.js | 9 | Minor | naming | The rename lands on bare 'fulfilmentIndexes' for a Map keyed by obligationId, but that same bare name means a flat array of index strings elsewhere (evaluator/implications/index.js, evaluator/purge/purge-storage.js) while the closure boundary this value is passed into names the map 'fulfilmentIndexesByObligationId' (helpers/projection/allow-listed.js, not-in-union-of.js, filter-and-project.js) — one name for two shapes, which is the confusion EUDPA-349's third AC exists to remove. | Rename the local (and the destructure in fidelity/confirm.js plus the header comment) to 'fulfilmentIndexesByObligationId' to match the applyTo parameter name it feeds. |  |  |  |
| 27 | src/server/app/model/obligations/evaluator.test.js | 467 | Minor | naming | Test title 'unions fulfilmentIndexs across any descendant field record' has a malformed plural — a mechanical fulfilmentId->fulfilmentIndex rename artefact, and the ticket's AC3 is specifically about consistent, correct fulfilment naming. | Rename the test to 'unions fulfilment indexes across any descendant field record' (the codebase elsewhere pluralises as 'fulfilmentIndexes', e.g. fulfilmentIndexesByObligationId). |  |  |  |
| 28 | src/server/app/model/obligations/evaluator/enumeration/enumerate-group-fulfilment-ids.js | 3 | Major | naming | Doc comment (lines 3-11) still says 'fulfilmentId' where the renamed function now returns fulfilment indexes: 'A group's instance fulfilmentId is the first N segments of any descendant leaf's composite fulfilmentId' and 'Returns Map<group obligation id, Set<group fulfilmentId>>'. Under the ticket's vocabulary a fulfilmentId is <obligationId>:<index>, so the comment now contradicts both the code and AC 3, which is the exact confusion this PR exists to remove. | Rewrite the comment to say fulfilment index (e.g. 'the first N segments of any descendant leaf's composite fulfilment index'; 'Returns Map<group obligation id, Set<group fulfilment index>>'), and rename the local 'const ids' at line 26 to 'indexes' so the whole function reads in the new vocabulary. | Auto-Resolved | — | File deleted by this PR (renamed to enumerate-group-fulfilment-indexes.js); duplicate of the item filed on the new path. |
| 29 | src/server/app/model/obligations/evaluator/enumeration/enumerate-group-fulfilment-indexes.js | 6 | Major | naming | The doc comment (lines 3-11) still uses the old vocabulary the ticket exists to retire — 'instance fulfilmentId', 'composite fulfilmentId' and 'Returns Map<group obligation id, Set<group fulfilmentId>>' — even though the function it documents was renamed to enumerateGroupFulfilmentIndexes; the Set values are fulfilment indexes (e.g. 'd1.c1', per evaluator.units.test.js:557), not fulfilmentIds (which under AC would be '<obligationId>:d1.c1'), so the comment is now factually wrong and contradicts AC 3. | Rewrite the comment in the ticket's vocabulary: 'A group's instance fulfilment index is the first N segments of any descendant leaf's composite fulfilment index' and 'Returns Map<group obligation id, Set<group fulfilment index>>'; rename the local 'ids' (line 26) to 'indexes' to match. |  |  |  |
| 30 | src/server/app/model/obligations/evaluator/internal/group-instance-paths.js | 5 | Major | duplication | INDEX_DELIMITER is now a private copy that must silently agree with bridge/fulfilment-id.js#INDEX_DELIMITER, and the same copy-plus-comment appears in two other model files (obligations/state-queries.js:12, obligations/helpers/projection/internals/filter-and-project.js:5); nothing enforces the agreement, so a future delimiter change to the bridge constant leaves these three splitting on the wrong character and silently mis-parsing fulfilment indexes rather than failing | Hoist one model-local constant (e.g. src/server/app/model/obligations/index-delimiter.js) imported by all three model files - permitted by the dep-cruiser model-import-boundary rule, which only bans model -> bridge - and add a test importing both it and bridge's INDEX_DELIMITER asserting they are equal (test files are excluded from dep-cruiser) |  |  |  |
| 31 | src/server/app/model/obligations/evaluator/internal/group-instance-paths.js | 6 | Minor | naming | The rename stopped at the constant: PATH_DELIMITER became INDEX_DELIMITER but joinPath/splitPath (lines 6-7) and instancePathPrefixesFromRecord still speak the old 'path' vocabulary for values that are now fulfilment indexes (line0.unit1), leaving the file half-migrated against AC 3 (consistent 'fulfilment index' naming) | Rename the file-local helpers to joinIndex/splitIndex (and instancePathPrefixesFromRecord -> indexPrefixesFromRecord) so the vocabulary matches the constant and the callers' fulfilmentIndex naming |  |  |  |
| 32 | src/server/app/model/obligations/evaluator/purge/purge-storage.js | 15 | Major | naming | purgedDerivedLeaf renames the Set to fulfilmentIndexes but leaves the loop variable it is compared against still named fulfilmentId (lines 15-17), and the comment at line 4 still says 'whose fulfilmentId is in that set' — these keys are fulfilment indexes (applyTo's records array, mapped as fulfilmentIndex in evaluator/implications/index.js), so AC 3's naming confusion survives inside the very function the PR edited, with lines 3 and 4 now contradicting each other. | Rename the destructured loop key to fulfilmentIndex in lines 15-17 and reword the residual fulfilmentId mentions in the comments at line 4 and line 55 to fulfilment index. |  |  |  |
| 33 | src/server/app/model/obligations/helpers/helpers.test.js | 23 | Minor | test-coverage | Fixtures hardcode the '.' index delimiter (line1.unit1), so nothing pins the new model-local INDEX_DELIMITER duplicate in projection/internals/filter-and-project.js to the bridge's exported INDEX_DELIMITER; its 'Kept in sync with bridge/fulfilment-id.js' comment is unenforced and a future delimiter change on one side alone stays green here. | Import INDEX_DELIMITER from ../../../bridge/fulfilment-id.js (test files are excluded from the dep-cruiser model-import-boundary rule) and build the path fixtures from it, or export the model-local copy and assert the two are equal. |  |  |  |
| 34 | src/server/app/model/obligations/helpers/index.js | 12 | Minor | docs-accuracy | The renamed docstring line still declares the map as `Map<obligationId, string[]>`, but `enumerateGroupFulfilmentIndexes` returns `Map<obligationId, Set<string>>` and callers spread it as a Set | While touching the line, correct the type to `Map<obligationId, Set<string>>` to match enumerate-group-fulfilment-indexes.js |  |  |  |
| 35 | src/server/app/model/obligations/helpers/projection/internals/filter-and-project.js | 5 | Major | duplication | INDEX_DELIMITER is re-declared here as a local literal '.', the third hand-synced copy under model/ (also state-queries.js:12 and evaluator/internal/group-instance-paths.js:5) alongside the real source bridge/fulfilment-id.js:4, with only a 'Kept in sync' comment and no test enforcing it — a future delimiter change that misses one copy silently breaks pathMatchesPassingKey prefix matching, so gated fulfilments are dropped with no error | Move the constant to a single model-owned module (e.g. src/server/app/model/obligations/index-delimiter.js) and import it here; bridge/ is already permitted to depend on model/ (bridge-no-up only bans engine\|flow\|analysis and shared/kit.js, and bridge already imports model/obligations/*), so bridge/fulfilment-id.js can re-export it and all three model copies plus the sync comments disappear |  |  |  |
| 36 | src/server/app/model/obligations/path-prefix-depth.test.js | 12 | Minor | stale-comment | The header comment still documents the old '/' delimiter — line 7 says the projection path is 'sliced at its first slash' and line 12 quotes the fix as `path.startsWith(`${key}/`)`, but filter-and-project.js now uses `path.startsWith(`${key}${INDEX_DELIMITER}`)` with INDEX_DELIMITER = '.'; the PR updated the fixture comments at lines 19-23 in the same file but missed these two. | Update lines 7 and 12 to refer to the index delimiter '.' (e.g. 'sliced at its first delimiter' and `path.startsWith(`${key}.`)`), or reference INDEX_DELIMITER rather than hard-coding a separator. |  |  |  |
| 37 | src/server/app/model/obligations/state-queries.js | 12 | Major | duplication | INDEX_DELIMITER is re-declared here as a hand-synced copy of bridge/fulfilment-id.js:4 — the same literal now exists in four places (bridge/fulfilment-id.js, this file, model/obligations/evaluator/internal/group-instance-paths.js, model/obligations/helpers/projection/internals/filter-and-project.js) with only a comment holding them together and no test asserting they agree, so a future separator change silently breaks the parent/child prefix match at line 151. | Give the model layer sole ownership of the constant (e.g. a new src/server/app/model/obligations/index-delimiter.js exporting INDEX_DELIMITER) and have bridge/fulfilment-id.js import/re-export it — bridge -> model is permitted by the dep-cruiser rules, so one declaration satisfies both layers. |  |  |  |
| 38 | src/server/app/model/obligations/state-queries.js | 187 | Major | stale-doc | The groupInvariantErrors doc comment still documents recordCountEquals as counting 'records under parentId/' — the slash separator this PR removed; the code at line 151 now matches on parentId + INDEX_DELIMITER ('.'). The sibling doc comment at line 26 was updated in this PR but this one was missed, leaving the file documenting the wrong delimiter in the very ticket that changes it (AC: index strings use '.' throughout the frontend). | Update the recordCountEquals bullet to say 'under the parent index prefix (parentId + INDEX_DELIMITER, e.g. line0.unit1)' or simply 'parentId.' so the comment matches the code. |  |  |  |
| 39 | src/server/app/model/obligations/state-queries.js | 145 | Minor | naming | On a line this PR touched, the local is still called parentId while it now holds a fulfilment index (e.g. 'line0'), and it is then emitted as the renamed field 'fulfilmentIndex: parentId' at line 158 — exactly the id-vs-index confusion AC 3 asks the ticket to resolve. | Rename the local to parentIndex (or parentFulfilmentIndex) and update its three uses at lines 146, 151 and 158. |  |  |  |
| 40 | src/server/app/services/persistence/records/fulfilment-codec/fulfilment-codec.test.js | 237 | Major | back-compat-coverage | The 'preserve unknown UUID entries' case — the only fixture in the codec suite representing already-persisted historic data — was migrated in place from 'historic0/record3' to 'historic0.record3', so nothing now covers decoding documents written before the delimiter swap; a stored earTag key such as 'line0/unit0' is a single segment under INDEX_DELIMITER '.', so validateFulfilmentId throws 'requires depth 2' and marshal/document.js fails the whole notification load. | Add a case that decodes a legacy '/'-delimited persisted document and asserts the agreed behaviour (either a migration that rewrites '/' to '.' on read, or an explicit decision that no such documents exist), keeping the '.' case alongside it rather than replacing it. |  |  |  |
| 41 | src/server/app/services/persistence/records/fulfilment-codec/fulfilment-codec.test.js | 194 | Major | naming | AC 3 asks that the code distinguish a fulfilment index ('line0.unit0') from a fulfilmentId ('<obligationId>:line0.unit0'), and the PR renames records[].fulfilmentId to records[].fulfilmentIndex across the bridge and evaluator, but the persisted codec was left out: the touched fixtures here still key records as fulfilmentId with index values, so the persistence boundary keeps the old ambiguous vocabulary the ticket set out to remove. | Rename the persisted record key to fulfilmentIndex in decode-records.js, records-entry.js and validate/fulfilment-id.js and update these fixtures to match (with a read-side fallback for documents already written with fulfilmentId), or record in the PR why the persisted field name is deliberately frozen while the in-memory one changed. |  |  |  |
| 42 | src/server/app/services/persistence/records/notification-mapper/shared/lines/from-fulfilment.js | 67 | Minor | naming | The reader call sites were renamed instanceIds -> groupFulfilmentIndexes, but the values they return are still bound to lineId / unitIds / unitId (and the header comment on lines 7-9 still says 'exact composite ids'), so this file keeps calling fulfilment indexes 'ids' — the exact confusion AC3 asks the ticket to remove. | Rename lineId -> lineIndex, unitIds -> unitIndexes, unitFrom(unitId) -> unitFrom(unitIndex), and the valueAt(obligation, id) parameter to fulfilmentIndex; reword the lines 7-9 comment from 'exact composite ids' to 'exact fulfilment indexes'. |  |  |  |
| 43 | src/server/app/sets/live-animals/obligations/whitelists.test.js | 117 | Minor | stale-comment | The PR updated lines 121 and 123 of this comment block from 'line1/unit1' to 'line1.unit1' but left line 117 saying records are `lineId/unitId` paths, so the same block now documents both delimiters and contradicts AC 1 (segment separator is '.' throughout the frontend). | Change 'lineId/unitId' to 'lineId.unitId' on line 117. |  |  |  |
| 44 | src/server/app/services/persistence/records/fulfilment-codec/validate/fulfilment-id.js | 1 | Critical | back-compat | Traced hard failure on already-persisted data. Under INDEX_DELIMITER '.', a stored depth-2 index such as 'line0/unit0' is ONE segment; hasIndexedSegments still passes (last char is a digit), the depth check then sees 1 vs 2 and calls fail(), which fulfilment-codec/fail.js implements as 'throw new TypeError'. marshal/document.js decodes on every notification load, so any saved notification holding a depth-2 record becomes unloadable, not merely mis-rendered. Depth-1 ('line0') is unaffected. Notification.submittedFulfilmentsBaseline holds a second copy of the same payload for AMEND, so a one-shot write migration would still leave cancelAmend restoring unreadable records. Nobody else can own the fix: the backend stores the payload opaquely (Notification.java:49) and the tests repo seeds only depth-1 (api-journey.ts:54-58), so the E2E suite is structurally incapable of catching this. | Decide and record the position. Either (a) normalise on read - rewrite '/' to '.' inside the codec decode path (covering both fulfilments and submittedFulfilmentsBaseline) with a regression test decoding a legacy document, or (b) state explicitly in the PR that no depth-2 notifications exist in any environment that matters, and add the depth-2 legacy case to the tests repo so the gap is visible rather than assumed. |  |  |  |
