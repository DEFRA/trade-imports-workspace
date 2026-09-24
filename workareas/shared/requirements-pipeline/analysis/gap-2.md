# Gap-fill 2: tim already has a tested, deterministic backlog writer

The synthesis treats "one deterministic, schema-validating writer" as something still to build (§7.5, §8.4 item 4, Q3). It credits identity only to `backlog-generate.sh`'s content key and the journey-builder shell scripts (§6.1 #18-19). It also says "`sNN-slug` (FA) is the only id that is both stable and readable" (§4.5, `00-synthesis.md:225`).

That is wrong. `tim parity ingest` plus `tim/src/parity/{set,io,schema}.js` is the writer. It is tested and already in production use. The 133-increment DR1 backlog (`workareas/journey-builder/EUDPA-328-DR1/backlog.json`) was born through it: all 133 increments carry `source`, and all are `todo`. The synthesis should take it as the base and name the work as *generalising* it, not *specifying* a new one.

All citations are to the working tree at the time of reading. `ingest.js` history: `e606d6ba` (bands as data), `08a98a4d` (relatedTo slug resolution), `ff528775` (the verify-before-ingest gate).

---

## 1. What exists, precisely

### 1.1 The input contract: one file per item, written by agents

- Agents write one JSON file per finding under `<workarea>/findings/` (`ingest.js:8`, `:50-51`). They never touch `backlog.json`. The contract is documented per corpus in `FINDING-CONTRACT.md` (`workareas/shared/dr1-parity/`, `dr1b-parity/`, `dr1c-parity/`).
- File names are readable, slice-prefixed slugs. Examples: `addresses--cph-three-parts.json`, `transport--port-of-entry-duplicate-options.json`. 133 of them exist in `workareas/shared/dr1-parity/findings/`.
- `validateFinding` (`ingest.js:136-227`) rejects a bad file and names both the file and the field. It never drops a file silently (see the rationale at `:122-126`). It checks:
  - required text: `slice`, `title`, `domain`;
  - closed vocabularies: `type` ∈ `FINDING_TYPES`, `band` ∈ the corpus's declared bands, `confidence` ∈ `CONFIDENCES`;
  - `screens`: non-empty, and each entry cross-checked against the capture manifests when any exist (`:153-166`, `manifestScreens` `:108-119`);
  - `controls`: must be a list; `evidence`: must be an object;
  - the four prose slots (`PROSE_SLOTS` `:33-38`);
  - `relatedTo` must be a list, and `verification`, `correction` and `carriedFrom` must be text.
- Order is deterministic: slice first, then file name (`readFindings` `:240-265`).

### 1.2 Stable ids keyed on source identity, never renumbered

- `assignIds` (`ingest.js:310-328`) builds a `source → id` map from the existing backlog (`:314-318`). A file that already has an id keeps it (`:322-323`). Only a file nobody has seen before gets `max(existing)+1` (`:319`, `:324-325`). The doc comment (`:294-309`) states the failure this prevents: renumbering would silently re-attach rulings to different findings.
- Identity lives in `source`, not in the id: "because the id has to be able to stay still while the sort order moves" (`:393-395`).
- Tested:
  - `ingest.test.js:125` gives the same ids on a second run;
  - `:138` leaves an existing id in place when a new finding sorts ahead of it.
- **Correction to §4.5:** the ingest *already* delivers "stable and readable". The id `inc-NNN` is stable but opaque, and the `source` slug (`slice--slug`) is stable and readable. Authors cross-refer by slug (§1.3). So FA's `sNN-slug` is not the only stable, readable key. What FA adds is that the readable key *is* the id. The ingest model separates a stable handle (id) from a readable identity (source). Arguably that is better: a slug can be corrected without moving the handle that rulings, commits and citations attach to.

### 1.3 Slug cross-references resolved to ids, failing on dangling or self references

- `resolveRelatedTo` (`ingest.js:361-388`), fed by the `slugs` map (`:542-544`, file name without `.json` → id):
  - an entry with no `id` fails (`:364-369`);
  - an id that is already `inc-NNN` passes through, so a re-ingest is idempotent (`:371-373`);
  - an unresolvable slug fails and names the file and the slug (`:374-379`);
  - a self reference fails rather than being dropped (`:380-385`; rationale `:349-353`).
- Resolution runs in the same pass that hands out ids, so a forward reference to a file written later in the same batch works (`:339-342`; test `:467`).
- Tests: `:439`, `:467`, `:495`, `:515`, `:534`, `:551`.

### 1.4 Merge that keeps every field it does not own

- `refreshed` (`ingest.js:441-446`) spreads the old increment first, then overlays the authored fields (`authoredFields` `:390-406`) and merges `finding` (`authoredFinding` `:408-416`). The doc comment (`:430-440`) lists what survives: ruling, commit, citations, gate, visual frames, "a key some later tool added".
- `born` (`:418-428`) sets the initial run-state fields: `milestone:null`, `gate:null`, `dependsOn:[]`, `status:'todo'`, `commit:null`, `failure_reason:null`. `INITIAL_STATUS` is read from what the build loop keys on (`:10-17`).
- The whole header is preserved: `{...(existing ?? {}), run_id, target, corpus, increments}` (`:602-610`).
- Test: `:214` "keeps a ruling and the build state when the finding is re-ingested".

### 1.5 Refusals that protect rulings and started work

- `ruled()` (`:454-461`): an increment counts as ruled if `decision` is non-null **or** `status !== 'todo'`. That covers started and done work as well as adjudicated work.
- `--replace` refuses while any increment is ruled, and lists them (`:526-534`; test `:265`).
- Striking an item means deleting its file, which drops the increment (`:546-552`; test `:292`). The ingest refuses when a dropped increment is ruled (`:553-559`; test `:304`).
- `detail` is frozen at first ingest. A re-ingest that would change it refuses and points to `set-slot` (`:561-582`; test `:317`). `composeDetail` is at `:279-285`.
- Verify-before-ingest gate (`:589-600`), opt-in per corpus through `requireVerification` (`corpus-profile.js`; on for `dr1b` and `dr1c` in `tools/parity/corpora.json`). A first ingest of an unverified file refuses, and all unverified files are named, not just the first (tests `:569-640`).
- `--dry-run` reports counts and writes nothing (`:612`; test `:393`). The result envelope (`:617-636`) reports `new`, `refreshed`, `dropped`, `byBand`, `byDomain`, `byType` and the full `assignment` list, which is effectively the "print before and after" §7.5 asks for.

### 1.6 Field-level setters (`set.js`)

- `setSlot` (`set.js:47-77`): one slot on one increment, with text read from a file. It rejects unknown slot names (`SLOTS` `:7-15`) and unknown ids (`findIncrement` `:17-23`). It cannot touch `detail` or a second increment (`writeIncrement` `:25-30`). The rationale is at `:32-38`: "Fan-out workers never edit the JSON."
- `setSlots` (`:93-140`): batch form. It validates everything first, then does one read and one write.
- `setDecisionRequired` (`:151-171`): refuses on an ungated increment and stamps `audience` from `gate`.
- `setCitation` (`:201-260`): a human resolution with an audit trail. An amendment needs `--why`, and the prior state is pushed to `amendedFrom`.
- CLI: `set-slot` (`commands/parity/index.js:500`), `set-slots` (`:778`), `set-decision` (`:799`), `set-citation` (`:824`), `ingest` (`:712-735`, with `--replace`, `--dry-run` and `--target`).

### 1.7 Atomic write and schema

- `writeJsonAtomic` (`io.js:44-55`) writes a sibling temp file, then renames it over the target. It creates the directory and returns `{sha256, bytes}`. `readJsonFile` (`:19-28`) names the file on a parse failure.
- `schema.js`: zod, "additive-tolerant, subtractive-strict" (`:11-15`, `passthrough` = `catchall(z.unknown())`). `parseIncrement` (`:198-206`) names the id and field path. Every ingest output goes through `parseIncrement` before it is written (`ingest.js:607-609`), and every setter parses on read (`set.js:54`).

---

## 2. How it answers the panel's three hardest problems

### 2.1 §8.4 item 4 / §7.5: "one deterministic, schema-validating writer"

It exists and is allowlist-friendly (`tim parity …` is one command, with no jq composition). The panel's requirements, and how the writer meets each:

| §7.5 requirement | Status in tim |
|---|---|
| Schema-validated | Yes: zod on read and write |
| Refuses unknown ids | Yes: `findIncrement` |
| Never touches the header unless asked | Yes: header spread through, only `run_id`/`target`/`corpus` set |
| Prints before and after | Partly: dry-run envelope, `sha256` |
| Atomic | Yes |
| Protects rulings across regeneration | Yes, stronger than anything in the shell scripts |

Separately, the synthesis says to generalise "journey-builder's validated scripts off the `workareas/journey-builder/EUDPA-*` path lock" (`00-synthesis.md:506`). The tim code has the same lock, and it is the thing to generalise instead (see §3).

### 2.2 §7.8.2: "combining is data, re-derivable after every ruling"

Per-atom files plus an ingest keyed on source identity is the mechanism §7.8.2 describes:

- **Atoms:** `atoms/<slice>--<slug>.json`, one per requirement, ingested into stable ids keyed on `source`. They never renumber, even when an extractor adds atoms mid-run.
- **Combined items:** `combined/<slug>.json` with `members: [atom-slug, …]`. Members resolve through exactly the `resolveRelatedTo` mechanism (slug → id, fail on dangling or self). The combine pass rewrites these files, and re-ingest folds them onto existing ids without losing rulings (`refreshed`).
- **Built items:** a combined item that has started (`status !== 'todo'`) cannot be silently dissolved. `ruled()` plus the dropped-file refusal (`:553-559`) turns "the combine pass wants to regroup work already built" into a loud, named stop. Today that failure is silent. The EUDPA-409 `merged-into` with `mergedInto:null` defect (synthesis `:72`) could not occur: the write would fail validation or resolution.

### 2.3 Q3: generalise the parity schema, or write a new one?

The evidence favours generalising. The zod passthrough design was built so that "journey-builder can add fields freely" (`schema.js:11-14`). The ingest, id, merge, refuse and atomic-write machinery is domain-free. Only the validation vocabulary and profile loading are parity-specific (see §3).

---

## 3. What is parity-specific or recipe-shaped, and would have to change

These are the honest limits. The synthesis should list them as the generalisation work rather than assume a green field.

1. **The `type` vocabulary is recipe-shaped.** `FINDING_TYPES` (`ingest.js:20-28`) is `add-page | add-section | add-collection | add-field | obligation-change | flow-change | copy-change`. These are the `frontend-change` modes, the same implementation-route taxonomy the synthesis flags as P3 (`00-synthesis.md:260`). A requirements backlog needs requirement-level kinds, or `type` as corpus-declared data, just as `bands` already are (`e606d6ba` made bands data; `profile.bands`, `corpus-profile.js`).
2. **The prose slots are comparison-shaped.** `PROSE_SLOTS` (`ingest.js:33-38`) is `frontend | prototype | difference | falsifiedBy`, and `set.js` `SLOTS` (`:7-15`) adds `correction | verification | longBecause`. A requirement needs slots such as `need`, `acceptanceCriteria`, `sources[]` with quotes and `falsifiedBy`. The slot list should come from the profile, not a constant.
3. **`screens` is mandatory and manifest-checked** (`ingest.js:153-166`; `incrementSchema.screens` `schema.js:119`). A requirement from Confluence or Jira has no screen. The field should be optional, or the check made per-profile.
4. **`incrementSchema` requires parity/journey fields** (`schema.js:112-135`): `domain`, `screens`, `evidence`, `confidence`, `band`, `milestone`, `gate`, `detail`. Q3's "relax `domain/screens/band/confidence`" is the right list. `detail` as a frozen oracle is worth keeping: it maps well to "the requirement text as distilled, before any rewrite".
5. **Profile loading is path-locked to parity and journey-builder.**
   - `loadCorpusProfile` needs a `tools/parity/corpora.json` entry with `sides` and `repos` (`corpus-profile.js:126-139`, `Object.entries(raw.repos)`), plus `pathRoots`.
   - `resolveCorpusId` looks under `workareas/journey-builder/<runId>/backlog.json` (`:88-90`).
   - `resolveTarget` falls back to `tools/journey-builder/targets.json` (`ingest.js:477-487`).

   A generic "programme profile" (workarea, backlog path, bands, types, slots, requireVerification) is the seam to cut.
6. **`dependsOn` is not authored at ingest.** It is born `[]` (`ingest.js:423`) and never resolved from slugs. Only `relatedTo` is resolved. Extending `resolveRelatedTo` to `dependsOn` and `members` is small. Cycle detection does not exist yet and would be needed for `dependsOn`.
7. **There are no build-state setters.** Nothing in tim writes `status`, `commit`, `failure_reason`, PR or branch, or `decision` (the ruling). A grep for `ruling` in `tim/src` finds only readers and renderers. Rulings still go through `rule-decision.sh`, and build state through the loop's own jq. The implementor half of the writer (status transitions, a commit record, `newItems[]` from Q30) is genuinely unbuilt. That is where the "writer still to be built" framing is correct.
8. **There is no lost-update protection under concurrency.** Every setter does read → mutate → `writeJsonAtomic` of the whole file (`set.js:54-58`, `:25-30`). Atomic rename prevents a torn file, not a lost update: two parallel `set-slot` calls (the MIGRATE fan-out the parity skill describes at `SKILL.md:413-419`) can each overwrite the other's change. The temp name is also fixed (`io.js:48`, `.<name>.tmp`), so concurrent writers share it. For a Workflow-driven implementor, either serialise writes through the orchestrator (the synthesis's §7.5 posture) or add a lock or compare-and-swap on `sha256`. The returned `sha256` is already the natural CAS token.
9. **Striking by deletion is the only way to remove an item.** There is no explicit `superseded` or `merged-into` state, so combining must be modelled as data (a `members` list on the combined item, with atoms kept and marked) rather than by deleting atom files. Otherwise ingest will try to drop ruled atoms and refuse. That refusal is correct, and it forces the right design.

---

## 4. Recommended position for the design

- **Base the one writer on `tim parity ingest` + `set.js` + `io.js` + `schema.js`. Do not write a new one.** Lift the domain-free core (`assignIds`, `resolveRelatedTo`, `refreshed`/`born`, `ruled`, the replace/strike/freeze refusals, `writeJsonAtomic`, the `passthrough` schema idiom) into a generic `tim backlog …` module. Parity then becomes one profile of it.
- **Make vocabulary profile data:** `types`, `slots`, `bands`, whether `screens` is required, `requireVerification` (default **on** for new programmes).
- **Identity model:** keep `source` (readable slug file) as identity and `inc-NNN` as the stable handle. Resolve every cross-reference field (`relatedTo`, `dependsOn`, `members`) from slugs at ingest. Refuse dangling refs, self refs and cycles.
- **Two-pass distillation on this base:** `atoms/*.json` ingested first, then the combine pass writes `combined/*.json` with `members`. Both are ingested. Regeneration is safe because ids key on `source` and ruled or started items refuse to vanish.
- **Still to build:** build-state and ruling setters (replacing `rule-decision.sh` and the loop's jq, per Q34), a `dependsOn` and `members` resolver with cycle detection, and concurrency safety (CAS on `sha256`, or orchestrator-serialised writes).

## 5. Corrections to the synthesis

- §4.5 / `:225`: "`sNN-slug` (FA) is the only id that is both stable and readable" is false. `tim parity ingest` gives stable `inc-NNN` ids keyed on a readable `source` slug, never renumbers (`ingest.js:310-328`), and has done so in production (DR1: 133 of 133 increments carry `source`).
- §6.1 #18-19: the list of identity and ingestion best bits omits the tim ingest. It is stronger than `backlog-generate.sh`'s content key: tested, refusing rather than warning, and it resolves cross-references.
- §7.5 / §8.4 item 4: the writer is not greenfield. Say "generalise `tim parity ingest`/`set` into `tim backlog`". Generalising journey-builder's shell scripts contradicts the house direction of tim over bash and the memory rule `feedback_libraries_not_cli_wrappers`.
- §7.8.2: the "combining is data that survives regeneration" mechanism is already implemented for items and `relatedTo`. It needs extending to `members` and `dependsOn`, not inventing.
- Q3: the evidence answers it. Generalise. The schema was designed to be extended (`schema.js:11-14`).
