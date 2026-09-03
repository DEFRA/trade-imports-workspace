# Clarity work — `model/obligations/`

Repo: `trade-imports-animals-frontend`
Scope: `src/server/app/model/obligations/` only. Bridge, engine, journey, and set code are not being restructured — but rename ripples through them are in scope where they follow.

## Goal

Make the obligations model easier to read cold. No behaviour changes, no new exports, no architecture moves. Four phases, in this order:

0. De-duplicate the manifest-graph helpers (own ticket, own PR — self-contained dedup, same character as EUDPA-360)
1. Vocabulary + naming friction
2. Simplify the densest hotspots
3. Documentation

Ordering rationale: phase 0 removes real duplication without depending on any vocabulary decision; phase 1 makes phase 2's decisions cheaper (no renaming twice); phase 3 benefits from settled vocabulary and simpler code.

**Overarching principle — terminology parity.** The words we use to talk about the model (this doc, code comments, PR descriptions, verbal conversation) should be the same words used in identifiers (function names, variable names, type names). A reader should build one mental model, not translate between prose and code. If a comment says "fulfilment" the code should not say "storage"; if this doc says "implication" the code should not say `impl`. The vocabulary table below is authoritative for both.

**Overarching principle — clean rename, no aliases.** Every rename in this plan updates its call sites atomically in the same commit. No temporary aliases, no deprecated-in-parallel forms. Aliases are worth the cruft only when consumers span repos we can't update atomically, or when the old name is a public API. Neither applies here: every rename is contained inside `trade-imports-animals-frontend`, callers are grep-able, and the test suite catches misses. Aliases would sit as vocabulary cruft ("which name is the real one?") and directly contradict the parity principle above. So: rename cleanly, update all callers, delete the old name in the same commit.

## Non-goals

- Not touching the evaluator algorithm.
- Not moving boundaries between `model/`, `bridge/`, `engine/`.
- Not adding exports or generalising for hypothetical future callers.
- Not rewriting `helpers/projection/*` beyond clarifying scalar/map duality.
- Not adding type checkers, JSDoc-based codegen, or `@type` imports beyond a few local shape hints.

## Phase 0 — de-duplication work

Lands before Phase 1. Two independent de-dups, each in the same character as EUDPA-360: self-contained, no dependency on vocabulary decisions, cheap to review and easy to verify green.

Each sub-phase is its own PR (independent scope, independent revertability). Whether they land as one ticket or two is captured in the ticket-structure open decision.

### 0.1 De-duplicate the manifest-graph helpers

Central home for pure walks over the obligation manifest — structural relationships (within chains, group membership, leaves under groups). Removes real duplication currently carried across bridge and model.

**New file** `model/obligations/manifest-graph.js`:

```js
import { obligations, groups } from './manifest.js'

export const ancestorChain = (obligation) => {
  const chain = []
  let cur = obligation.within
  while (cur) {
    chain.unshift(cur)
    cur = cur.within
  }
  return chain
}

export const isGroup = (obligation) => groups().includes(obligation)

export const leavesUnder = (group) =>
  obligations().filter(
    (obligation) =>
      !isGroup(obligation) && ancestorChain(obligation).includes(group)
  )

export const groupsFrom = (group) =>
  obligations().filter(
    (obligation) =>
      isGroup(obligation) &&
      (obligation === group || ancestorChain(obligation).includes(group))
  )
```

**Delete the duplicates:**

- `model/obligations/instance-complete.js` — delete local `ancestorChain`, `isGroup`, `leavesUnder`, `groupsFrom`. Import from `manifest-graph.js`. The file becomes purely the completeness rules (leaf-blocks and invariant-blocks predicates); the graph-walking noise is gone.
- `bridge/fulfilments/obligation-graph.js` — the bridge's `ancestorChain` (identical to the model's) and `groupObligations` (wraps `groups()` from manifest) both retire. Callers in bridge update their imports to point at `model/obligations/manifest-graph.js`. Per the clean-rename principle, no aliases — dissolve the file (or shrink it to whatever isn't a manifest walk) and update every caller in the same commit.

**Sweep callers.** Grep for `ancestorChain`, `groupObligations`, `leavesUnder`, `groupsFrom` across the frontend repo and repoint imports. Test suite catches misses.

**Blast radius.** Small. New file + edits to `instance-complete.js` + edits to bridge's obligation-graph + import updates in bridge callers. All within `trade-imports-animals-frontend`. Behaviour-neutral.

**Deliverables.** One PR, ~2 commits: (1) add `manifest-graph.js` with the four helpers + tests; (2) delete duplicates and repoint bridge callers.

### 0.2 Extract the projection-gate factory

`helpers/projection/allow-listed.js` and `helpers/projection/not-in-union-of.js` share ~15 lines of outer-wrapper machinery (metadata construction, `reasons` check, `Object.defineProperty` for `.values`). The two files differ only in three specifics: the predicate direction, the values-getter, and the metadata `type` string.

**New file** `helpers/projection/internals/build-projection-gate.js`:

```js
import { filterAndProject } from './filter-and-project.js'

/**
 * Build a projection-gate applyTo function. Callers supply the three
 * specifics that vary between gate flavours; this factory handles the
 * shared machinery (filter+project, reasons wrap, metadata + values
 * getter).
 */
export const buildProjectionGate = ({
  type,
  gateObligation,
  currentValues,
  admits,
  projectionGroup,
  reasons
}) => {
  const fn = (fulfilments, fulfilmentIndexesByObligationId) => {
    const decision = filterAndProject(
      fulfilments[gateObligation.id],
      admits,
      projectionGroup,
      fulfilmentIndexesByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  fn.metadata = {
    type,
    obligation: gateObligation.id,
    projection: projectionGroup?.id ?? null,
    reasons: reasons ?? null
  }
  Object.defineProperty(fn.metadata, 'values', {
    enumerable: true,
    get: currentValues
  })
  return fn
}
```

**Rewrite both files as thin specialisations.** Each becomes ~15 lines, keeping the meaningful logic (predicate direction + values source + type string) visible:

```js
// allow-listed.js
export const allowListed = (gateObligation, values, projectionGroup, reasons) => {
  const currentValues = () =>
    typeof values === 'function' ? values() : values
  return buildProjectionGate({
    type: 'allowListed',
    gateObligation,
    currentValues,
    admits: (value) => currentValues().includes(value),
    projectionGroup,
    reasons
  })
}

// not-in-union-of.js
export const notInUnionOf = (gateObligation, unionOfAllowlists, projectionGroup, reasons) => {
  const currentValues = () => deriveUnion(
    typeof unionOfAllowlists === 'function' ? unionOfAllowlists() : unionOfAllowlists
  )
  return buildProjectionGate({
    type: 'notInUnionOf',
    gateObligation,
    currentValues,
    admits: (value) => !currentValues().includes(value),
    projectionGroup,
    reasons
  })
}
```

**Blast radius.** Small. New factory file + rewrite of two files. No caller changes — the exported `allowListed` and `notInUnionOf` signatures are unchanged, so the live-animals obligation set and every other consumer is untouched. Existing tests unchanged; behaviour-neutral.

**Deliverables.** One PR, ~2 commits: (1) add `build-projection-gate.js` + tests; (2) rewrite `allow-listed.js` and `not-in-union-of.js` to delegate.

### Why Phase 0 lands first

- Both sub-phases are self-contained. No dependency on any Phase 1 vocabulary decision.
- Both remove real duplication we're already carrying (unlike Phase 2 hotspots, which simplify existing but non-duplicated code).
- Same character as EUDPA-360 — small dedups that are cheap to review and easy to verify green.
- Any Phase 1 renames that later touch these files are automatic; identifiers introduced here are already clean.

## Phase 1 — vocabulary + naming

### 1.1 Resolve term overloads — canonical vocabulary

This is the authoritative vocabulary. Prose (docs, comments, PR descriptions) and code (identifiers, function names) both use these terms. Words not on this list are avoided.

| Concept | Was called | Canonical | Codified as |
|---|---|---|---|
| The user's entered value for an obligation — atomic, whether the obligation is scalar (one value directly) or group-scoped (one value at each instance) | fulfilment, storage, value | **fulfilment** | `fulfilment` in identifiers and prose. |
| The whole `state.fulfilments` object across all obligations | fulfilments, storage, state.fulfilments | **fulfilments** (or `state.fulfilments` when scope needs to be explicit) | `state.fulfilments`; drop "storage" entirely. |
| The map keyed by fulfilmentIndex when the obligation is indexed — one obligation's fulfilments across all its instances | record map, storage, keyed record, fulfilmentsMap | **indexedFulfilments** | `indexedFulfilments` in identifiers and prose; `isIndexedFulfilments(stored)` for the shape check (was `isRecordMap`). |
| The composite path key that addresses one instance | fulfilmentIndex | **fulfilmentIndex** | Unchanged. |
| One instance of a group at a specific fulfilmentIndex | instance | **instance** | Unchanged; already consistent. |
| The evaluator's per-obligation output — `{ inScope, fulfilmentIndexes?, reasons? }` (status stays on the manifest, not on the implication — see Phase 2.1) | impl, implication | **implication** | `implication` in identifiers everywhere — no more `impl`. |
| The applyTo helper's return value | own, applicabilityDecision | **applicabilityDecision** | `applicabilityDecision` in identifiers; the collection is `applicabilityDecisions`. |
| Non-group obligation (any kind) | field, leaf, user-leaf, derived-leaf | **leaf** in prose | Prose uses "leaf". Classify tags are renamed by provenance (see 1.4 below), not kept as `'field'`/`'user-leaf'`/`'derived-leaf'`. |
| A group obligation (collection) | group | **group** | Unchanged. |
| The evaluator's iterative purge loop | converge, purge, converge-purge | **convergence** (noun), **converge-purge** (compound for the algorithm) | Unchanged; already used consistently. |
| The `{ fulfilmentIndex, status? }` descriptor in the current `impl.records` | record | **record** — transitional only | Phase 2.1 removes this shape entirely (records → fulfilmentIndexes). After 2.1 lands, "record" is not a term in this vocabulary. Do not build new naming around it. |

**Consequence:** after phases 1 + 2.1 land, the domain vocabulary of the obligations model reduces to a short, self-consistent set: `obligation`, `fulfilment`, `fulfilments`, `indexedFulfilments`, `fulfilmentIndex`, `instance`, `implication`, `applicabilityDecision`, `leaf`, `group`, `unindexed`, `indexed`, `scope`, `converge-purge`, `requires`, `applyTo`, `within`, `status`. Every code identifier and every prose reference draws from this set.

**Central contrast pair:** `unindexed` ↔ `indexed`. An **unindexed obligation** is a top-level scalar whose fulfilment sits directly at `state.fulfilments[obligation.id]`. An **indexed obligation** is a leaf whose fulfilments live in `indexedFulfilments` (a map keyed by fulfilmentIndex) at the same address. This pair carries most of the domain semantics on its own; the three provenance tags (`'parent-derived'`, `'user-storage-derived'`, `'apply-to-derived'`) refine "how is an indexed obligation's fulfilmentIndex set populated?".

### 1.2 Rename functions to disambiguate enumeration passes

- `enumerateGroupPathsFromStorage` (in convergence loop) — keep, name is accurate.
- `enumerateGroupFulfilmentIndexes` (post-purge) — rename to say what disambiguates it from the sibling above. Candidates: `enumerateGroupFulfilmentIndexesPostPurge` (long, honest) or `enumerateGroupFulfilmentIndexesForImplications` (says why). Callers: `evaluator.js` barrel + `evaluator/index.js` + `evaluator.units.test.js` (one `describe` block, ~8 test cases). All within the model layer.
- `groupInstancePaths` (internal helper) — rename to say what it derives from (store-key origin). Only used inside `evaluator/enumeration/*.js` and never exported.

Per the clean-rename principle, all call sites update atomically in the same commit; no aliases. Blast: 3-4 files per rename, no ripple outside the model.

### 1.3 Abbreviation and naming audit

**Operating rule:** prefer longer, clearer, consistent names within reason. Rename when a fresh reader would guess wrong or hesitate. Keep only when the local context (parameter type, adjacent code) makes the short form unambiguous. Prefer domain terms from the vocabulary section (record, implication, fulfilment) over generic ones (data, value, item). No hard length ceiling, but treat >25 chars as a smell — try to compose two shorter names first.

**Starting list** (will grow as we spot more). Entries flow from the vocabulary in 1.1 — this is where those canonical names land in identifiers.

| Current | Canonical | Where | Rationale |
|---|---|---|---|
| `impl` | `implication` | `evaluator/implications/*`, `state-queries.js`, `instance-complete.js`, tests | Elsewhere in JS `impl` means "implementation" (DI, interfaces). Ambiguous every time. Biggest lift by occurrence count. Flows from the vocabulary — no more `impl` anywhere. |
| `own` | `applicabilityDecision` | `evaluator/implications/index.js`, `scope/*` | Reads as "possession"; hides that it's an applyTo output. Flows from the vocabulary. |
| `obligationApplicabilityDecisions` | `applicabilityDecisions` | `evaluator/scope/*`, `converge-purge.js` | 27 chars → 22 chars, no loss of meaning in context. Flows from the vocabulary. |
| `stored` (as noun) | `fulfilment` | `helper-internals.js`, projection internals | The domain term. `const stored = state.fulfilments[id]` becomes `const fulfilment = state.fulfilments[id]`. Keep `stored` only as an adjective when needed. |
| `isRecordMap` | `isIndexedFulfilments` | `helper-internals.js` | Flows from the vocabulary. Contrasts naturally with the `'unindexed'` classify tag. |
| `belonging` | `fulfilmentIndexesUnderInstance` (or similar) | `instance-complete.js` (my code) | Answers "belonging to what?" in the name. Long, but explicit; may need iterating. |
| `nested` (as noun) | `nestedGroup` | `instance-complete.js` | Fine as adjective; underspecified as `for (const nested of ...)`. |
| `fulfilmentIndexesByObligationId` | keep, add JSDoc `@typedef` | `evaluator/*` | 30 chars but load-bearing and shape-descriptive; add a `Map<ObligationId, Set<FulfilmentIndex>>` shape hint. |
| `st` | keep | test files only | Tests read fine with the short form and the surrounding builder. |

Candidates to consider (surface during the audit):

- Callback parameters in `.map` / `.filter` / `.some` chains — check for one-char names where the domain term would help.
- Destructured params in helper functions (`{ n, v }` style — see `code-style.md`).
- Anything landing in the next hotspot pass (2.1-2.5) that we notice while reading.

**Note.** Phase 1 deliberately leaves the `record` term untouched (`impl.records`, `implication.records`) — Phase 2.1 removes the concept entirely, so renaming it in phase 1 would be wasted work.

### 1.4 Classify-tag renames — provenance-based taxonomy

The classify tags emitted by `classifyObligations` today are `'single'`, `'group'`, `'field'`, `'user-leaf'`, `'derived-leaf'` — three are indexed leaves (produce records) but their names don't consistently signal *how* their fulfilmentIndexes are populated, and `'single'`/`'field'` don't sit in the "indexed vs unindexed" axis at all. Rename by provenance + indexing status for terminology parity.

The taxonomy splits along two axes:
- **Structural shape** — `'unindexed'` (one value, no fulfilmentIndex) vs `'group'` (has children).
- **Enumeration provenance** — for the three indexed leaf categories, name says where the fulfilmentIndexes come from.

| Current tag | Canonical tag | What it is |
|---|---|---|
| `'single'` | `'unindexed'` | Top-level obligation stored directly at `state.fulfilments[obligation.id]`. No fulfilmentIndex. Contrasts with the three `-derived` categories, whose fulfilments live in `indexedFulfilments`. |
| `'group'` | `'group'` | Has children; records enumerated from descendants. |
| `'field'` (with `within`) | `'parent-derived'` | Indexed leaf whose fulfilmentIndexes come from the parent group's enumeration. One entry at every parent instance. |
| `'field'` (no `within`) | `'unindexed'` | Folded in — see Option A resolution below. |
| `'user-leaf'` | `'user-storage-derived'` | Indexed leaf whose fulfilmentIndexes come from the user's own storage keys. |
| `'derived-leaf'` | `'apply-to-derived'` | Indexed leaf whose fulfilmentIndexes come from the applyTo gate's output. |

**Naming rationale — `'unindexed'` over `'scalar'`.** The two-word contrast pair `unindexed` ↔ `indexed` (where `indexed` is embedded in `indexedFulfilments`) does most of the domain semantics on its own. `'scalar'` was a candidate for team-parity reasons, but "unindexed" ties directly into the vocabulary axis and is a natural word the team can pick up in conversation. Team speech follows code.

Docstring:

```js
// 'unindexed' — top-level obligation whose fulfilment sits directly at
//              `state.fulfilments[obligation.id]`. No fulfilmentIndex.
//              Contrast with indexed leaves (`parent-derived`,
//              `user-storage-derived`, `apply-to-derived`), whose fulfilments
//              are stored as `indexedFulfilments`.
```

**Option A resolved — fold `'field'`'s no-`within` case into `'unindexed'`.** The current `'field'` tag double-duties: for obligations with `within` it produces the parent-derived leaf shape; for those without (e.g. `poApprovedReferenceNumber`) it returns `{ inScope: true, status }` with no records. Under the new taxonomy that non-`within` case is an `'unindexed'`. And per Phase 2.1's resolved decision (status stays on the manifest, not on the implication), `unindexedImplication` no longer needs to carry `status` at all — consumers read `obligation.status` via `effectiveStatus` when they need it.

- Classifier gains one branch: `return obligation.within ? 'parent-derived' : 'unindexed'` inside the intrinsic-status check.
- `parentDerivedImplication` simplifies — the `if (!obligation.within)` branch disappears; it unconditionally builds the parent-derived shape.
- `unindexedImplication` **stays as `(own) => own ?? { inScope: true }`** (identical to today's `singleImplication`). No signature widening, no status attachment. `effectiveStatus` reads `obligation.status` directly.

Constructor functions rename to match:
- `singleImplication` → `unindexedImplication` (no signature change; just renamed)
- `fieldImplication` → `parentDerivedImplication` (simplified — one shape only)
- `userLeafImplication` → `userStorageDerivedImplication`
- `derivedLeafImplication` → `applyToDerivedImplication`

Prose parity restored: "the unindexed obligation `poApprovedReferenceNumber`", "the parent-derived leaf `commodityCode`", "the apply-to-derived leaf `earTag`". Reader sees the same word in the docs, the tag string, and the constructor name.

**Blast radius:** `classify-obligations.js` (classifier + comments), `implications/index.js` (switch statement + five constructor names), and any tests that construct a category by string. Small-to-medium — 4-6 files. Behaviour-neutral: `poApprovedReferenceNumber` today produces `{ inScope: true, status: 'mandatory' }` via `fieldImplication`; after the rename+2.1 it produces `{ inScope: true }` via `unindexedImplication`, and `effectiveStatus(poApprovedReferenceNumber, null, state)` still returns `'mandatory'` (read from `obligation.status`). Same value at every consumer path.

### Deliverables (Phase 1 as a whole)

Single PR, commits grouped by rename:

- Commit 1: `impl → implication` (largest diff — many files, mechanical). Includes prose alignment where the surrounding comment used `impl`.
- Commit 2: applyTo output naming — `own → applicabilityDecision`, `obligationApplicabilityDecisions → applicabilityDecisions`.
- Commit 3: `stored → fulfilment` as noun; `isRecordMap → isIndexedFulfilments`; retire "record map", "fulfilmentsMap", and "storage" from prose.
- Commit 4: classify-tag renames (1.4) — tags + constructor function names + comments.
- Commit 5: remaining table entries (`belonging`, `nested`, tests) + anything else the audit surfaces.
- Commit 6: JSDoc `@typedef`s for load-bearing shapes (`IndexedFulfilments`, `Implication`, `ApplicabilityDecision`) so IDEs surface the canonical vocabulary at call sites.

**Blast radius (updated):** Phase 1 is now medium-to-large. `impl → implication` alone touches ~10 files under `model/obligations/` plus tests; `stored → fulfilment` ripples through projection internals and helpers; classify-tag renames touch dispatch and tests. Still no behaviour change; test suite catches missed callsites.

---

## Phase 2 — simplify the hotspots

Ordered by highest read-cost win. Item 2.1 lands first because it changes the shape everything else consumes; the other items are cleaner after.

### 2.1 Replace `impl.records` descriptor with plain `impl.fulfilmentIndexes`

**What changes.** The per-record descriptor wrapper `{ fulfilmentIndex, status? }` carries no per-record data — every constructor stamps the same `obligation.status` on every record, and callers only ever pull `fulfilmentIndex` back out. Collapse the shape:

```js
// Before
{ inScope: true, records: [{ fulfilmentIndex: 'line1' }, { fulfilmentIndex: 'line2' }] }
{ inScope: true, records: [{ fulfilmentIndex: 'line1', status: 'mandatory' }] }
{ inScope: true, status: 'mandatory' }  // unindexed with intrinsic status

// After
{ inScope: true, fulfilmentIndexes: ['line1', 'line2'] }
{ inScope: true, fulfilmentIndexes: ['line1'] }
{ inScope: true }  // unindexed; status stays on the manifest
```

**Status stays on the manifest, not on the implication** (see the resolved status-hoist decision below). Consumers who need status read `obligation.status` via `effectiveStatus`, which they already do. Implications become purely runtime state: `inScope`, optional `fulfilmentIndexes`, optional `reasons`.

**Also fix the applyTo-output overload while we're here.** `own.records` (returned from applyTo helpers) today is a plain `string[]` of fulfilmentIndexes — a *third* meaning of "record". Rename to `own.fulfilmentIndexes` for symmetry so the name means one thing everywhere.

**`effectiveStatus` rewrites to:**

```js
export function effectiveStatus(obligation, path, state) {
  const implication = state.obligations?.[obligation.id]
  if (!implication?.inScope) return undefined
  if (path === null || implication.fulfilmentIndexes?.includes(path)) {
    return obligation.status ?? 'mandatory'
  }
  return undefined
}
```

Reads `obligation.status` directly from the manifest. Behaviour-neutral: today `checkAnyOfIds` etc. read the same value indirectly via `record.status ?? 'mandatory'`, which is always sourced from `obligation.status`.

**Files touched:**
- `evaluator/implications/index.js` — all four constructors (`groupImplication`, `fieldImplication`, `derivedLeafImplication`, `userLeafImplication`).
- `state-queries.js` — `effectiveStatus`, `checkAnyOfIds`, `checkRecordCountEquals`, `groupInvariantErrors` (all iterate `impl.records`).
- `model/obligations/instance-complete.js` — reads `implication.records` in `leafBlocksInstance` and `groupInvariantBlocksInstance`.
- `bridge/status/completeness/records.js:childRecords` — reads `records`.
- `bridge/status/completeness/leaf.js:leafInScopeForRecord` — reads `impl.records`.
- `helpers/projection/*` — every projection helper that returns `{ records: [...] }` from applyTo. Rename to `fulfilmentIndexes`.
- `helpers/scalar/*` — same treatment where applyTo output carries records.
- `sets/live-animals/obligations/*` — any `applyTo` function that constructs its own return shape; check for explicit `records:` returns.
- Tests everywhere — every synthetic implication or applyTo return with `records:` needs updating.

**Strategy: one atomic commit.** Two-step migration (introduce new field, migrate callers, remove old) means writing bridging code that gets deleted immediately. Test suite catches missed callsites; do it in one pass.

**Status-hoist decision resolved: don't hoist.** Analysis showed every consumer that reads status already has an `obligation` reference (they must, to know which obligation to query). `effectiveStatus(obligation, path, state)` reads `obligation.status` in one line — no consumer ergonomic hit. Advantages: manifest stays single source of truth for status; implications become smaller and more focused on runtime facts; `unindexedImplication` (formerly `singleImplication`) doesn't need signature widening.

**Blast radius:** the biggest single change in the plan. Estimated 20+ files, 100+ mechanical edits. Behaviour-neutral.

### 2.2 `instance-complete.js` — remaining polish

The bulk of the read-cost pain in `instance-complete.js` was the graph-walking predicate stack, which Phase 0 removes by extracting to `manifest-graph.js`. What's left after Phase 0:

- Split the two-branch `leafBlocksInstance` (belonging-records vs empty-entry) into two named predicates so the branch reads as prose. Currently the ternary in `leafBlocksInstance` compresses two distinct cases into one line.
- Add a JSDoc `@typedef` for the `state` shape near the top so callers don't have to reconstruct it. Ties into Phase 1's typedef commit.
- Small-scale prose-and-name pass in the same file per Phase 1's audit (`belonging` → `fulfilmentIndexesUnderInstance`, `nested` → `nestedGroup`, etc.).

### 2.3 `state-queries.js` — unify checker cardinality + reorder by scope

Two changes to `groupInvariantErrors` and its five private checker helpers:

**Unify return types to always-return-list.** Today three checkers (`checkMinEntries`, `checkMaxEntries`, `checkAllOrNothingOfIds`) return `error | null`; two (`checkAnyOfIds`, `checkRecordCountEquals`) return `error[]`. `groupInvariantErrors` composes with mixed spread + `.filter(Boolean)`. After: every checker returns `error[]` (empty or non-empty), and composition becomes uniform spread:

```js
// After
return [
  ...checkMinEntries(group, records),
  ...checkMaxEntries(group, records),
  ...checkAllOrNothingOfIds(group, state),
  ...checkAnyOfIds(group, records, state),
  ...checkRecordCountEquals(group, records, state)
]
```

The "fires at most once per group" property stays visible via the checker names and `groupInvariantErrors`'s docstring block; the return type stops carrying second-source information. `.filter(Boolean)` disappears — no more ambiguous null-filter that the reader has to decode.

**Reorder the composition by scope.** Group collection-level rules first, then per-record rules:

- Collection-level (fires once for the whole group): `minEntries`, `maxEntries`, `allOrNothingOfIds`
- Per-record (fires per instance): `anyOfIds`, `recordCountEquals`

Currently the order is arbitrary. Reordering makes the shape of the output list predictable — a caller scanning errors can tell at a glance which are collection-wide and which are per-instance without checking `error.fulfilmentIndex`.

**Blast radius:** small. All five checker helpers are `const` declarations in `state-queries.js`; none are exported. Only `groupInvariantErrors` calls them. So:

- 3 function bodies change return shape (`return error` → `return [error]`; `return null` → `return []`).
- `groupInvariantErrors` composition rewrites: uniform spread, drop `.filter(Boolean)`, reorder.
- Tests unchanged — they assert on `groupInvariantErrors`'s output, which is behaviour-neutral.
- No bridge / engine / set ripple.

**Not doing (deferred):** extracting each checker to its own file. The file is ~227 lines; the checker block is coherent as a unit; splitting adds files without much gain. Revisit only if the file grows past ~300 lines.

### 2.4 `helpers/projection/internals/filter-and-project.js` — scalar/map duality

- Split into two named functions (`filterScalarByPassingKey`, `filterMapByPassingKey`) and a two-line dispatch. Removes the hidden shape branch.
- Move `pathMatchesPassingKey` next to its use site.

### 2.5 `evaluator/converge-purge.js` — "view" terminology

- Rename local variable `view` to `applicabilityState` (or similar) so the code matches the comment's phrasing.
- Add a one-line comment on the loop condition explaining what "views equal" means for termination.

### 2.6 (removed) — projection-gate factory landed in Phase 0.2

The shared-factory extraction was originally scoped here as a hotspot; it's now Phase 0.2 (same character as the manifest-graph dedup). No Phase 2 work remains for `not-in-union-of.js` / `allow-listed.js`.

### Deliverables (Phase 2 as a whole)

- Phase 2.1 is its own PR (the reshape — biggest single change in the plan; ~20 files).
- Phases 2.2, 2.3, 2.4, 2.5 can land as one PR (small mechanical polish across four files) or split further per review appetite.
- Tests unchanged except where a signature moves.

---

## Phase 3 — documentation

### 3.1 Directory README (absorbs 3.2's shape examples)

Write `src/server/app/model/obligations/README.md` with the following sections:

- **Orientation.** One paragraph: what this module does, what it doesn't. Boundary with bridge/engine/journey.
- **Vocabulary glossary.** The full canonical vocabulary from Phase 1.1's table. Every term reads exactly as the identifiers in the code.
- **Taxonomy.** Small ASCII table for the five classify tags (`unindexed`, `group`, `parent-derived`, `user-storage-derived`, `apply-to-derived`) with the two-axis framing: structural shape vs enumeration provenance. Names the constructor per tag.
- **Storage shapes.** Concrete `state.fulfilments` and `state.obligations` examples for each category — what a scalar obligation's stored value looks like, what an indexed leaf's `indexedFulfilments` looks like, what a group's implication `fulfilmentIndexes` array looks like. This is the content the dangling `FULFILMENT_SHAPES.md` reference was pointing at.
- **File map.** Layered: top-level primitives (`manifest.js`, `is-blank-value.js`, `index-delimiter.js`, `manifest-graph.js`, `state-queries.js`, `instance-complete.js`), then `evaluator/`, then `helpers/`.
- **Where to look for the algorithm.** Point at `evaluator/index.js`'s existing docstring.

### 3.2 Update the dangling reference in `evaluator/index.js:16`

Change:
```js
* See obligations.md for the model and FULFILMENT_SHAPES.md for storage
* examples.
```
to:
```js
* See ./README.md (in the parent obligations directory) for the model
* overview and storage-shape examples; the algorithm is described below.
```

Single-file, two-line edit. Old references retire.

### 3.3 Terminology-parity checkpoint

Before Phase 3's PR lands, sweep the new README against the code and confirm the vocabulary matches:

- Every term in the glossary appears as an identifier somewhere in the code.
- Every identifier used in the code (in `model/obligations/`) that names a domain concept is either in the glossary or an obvious composition of glossary terms.
- Every example in the "Storage shapes" section uses only glossary terms in prose.
- The taxonomy names match `classifyObligations`'s outputs and the constructor function names exactly.
- No stale term from an earlier phase leaks into the docs — grep for `record` (retired by 2.1), `impl` (retired by 1.3), `field-as-tag` (retired by 1.4), `single-as-tag` (retired by 1.4), `scalar` (rejected in favour of `unindexed` — check no prose slipped it in), `storage` (retired by 1.3).

Runs as the final step of Phase 3's PR. Any mismatch is either a code fix (identifier drift from Phase 1) or a doc fix (prose using the wrong term). If a mismatch turns out to be a code drift missed by Phases 1-2, land the code fix in the same PR.

### Deliverables

- One PR, mostly docs plus the two-line pointer edit and the parity sweep.

---

## Ticket structure

Two tickets under EUDPA-79. Ticket A extends the existing EUDPA-360 (rescoped from "add leafSatisfied and instanceComplete" to a wider duplication-reduction ticket). Ticket B is new and bundles the vocabulary + shape + docs work as one large but coherent unit.

### Ticket A — extend EUDPA-360, retitle to "reduce duplication and clean helpers in the obligations model"

Continues on the current `feature/EUDPA-360-enrich-obligations-model` branch. Three additions on top of the EUDPA-360 completeness work already committed:

| Sub-phase | What lands | Blast |
|---|---|---|
| 0.1 | Manifest-graph dedup — new `model/obligations/manifest-graph.js`; delete duplicates in `instance-complete.js` and `bridge/fulfilments/obligation-graph.js`; repoint bridge callers | Small |
| 0.2 | Projection-gate factory — new `helpers/projection/internals/build-projection-gate.js`; rewrite `allow-listed.js` and `not-in-union-of.js` as thin specialisations | Small |
| 2.4 | Scalar/map split in `helpers/projection/internals/filter-and-project.js` — split the dual-shape function into two named functions with a dispatch | Small |

Ordering within the ticket is flexible — all three are self-contained and behaviour-neutral. Suggest 0.1 first (touches the file I just created in EUDPA-360), then 0.2, then 2.4.

**Jira action:** update EUDPA-360's summary and description to reflect the wider scope. Suggested summary: "Reduce duplication and clean helpers in the obligations model". Keep `technicalImprovement` label, priority `Lowest`.

**PR consequence:** the current PR #223 is already open and green for EUDPA-360's original scope. Continuing on the same branch means adding commits to that PR, growing its scope. Reviewer will see the combined diff. Alternative: merge #223 as-is, open a new PR on a new branch for the extra scope — decision for the moment of push, not for the plan.

### Ticket B — new — "Vocabulary, shape, and documentation sweep of the obligations model"

Big ticket, coherent theme: everything that depends on settling the vocabulary or reshaping `impl.records`.

| Sub-phase | What lands |
|---|---|
| 1 | Vocabulary + naming (all sub-phases 1.1-1.4) — canonical vocabulary, function renames, abbreviation audit, classify-tag renames |
| 2.1 | Replace `impl.records` descriptor with `impl.fulfilmentIndexes` — the shape reshape (20+ files) |
| 2.2 | `instance-complete.js` polish — branch split, JSDoc typedef |
| 2.3 | `state-queries.js` — unify checker cardinality + reorder by scope |
| 2.5 | `converge-purge.js` terminology (this is Phase 1 vocabulary in disguise — same commit as the audit) |
| 3 | README + pointer + terminology-parity checkpoint (parity sweep verifies everything, including Ticket A's contributions) |

**Size:** large. ~30+ files touched. Multiple commits. Coherent commit narrative (vocab, then shape, then hotspot polish, then docs).

**Review approach:** noisy but the tasks all hang together and reviewers have AI assistance. One PR, sequenced commits.

**Depends on:** Ticket A landed first (Phase 1 vocabulary rename ripples don't have to touch old duplicates; Phase 2.1 reshape doesn't have to touch code that Ticket A is refactoring).

**Jira action:** create a new EUDPA ticket under EUDPA-79 with `technicalImprovement` label and priority `Lowest`.

### Why two tickets, not more or fewer

- **Why not one:** would bundle "small self-contained dedup" work (safe to land quickly, easy to review) with "wide-blast vocabulary and shape reshape" work (needs careful staged review). Different review shapes.
- **Why not six:** as originally planned. Jira overhead outweighs the benefit when the two-ticket split preserves coherent themes and lets each merge decisively.
- **Why 2.4 in Ticket A:** it's structural cleanup independent of vocabulary and shape, fits the "clean helpers" theme, and touches the projection helper family that Ticket A's 0.2 already lives in.
- **Why not 2.2/2.3/2.5 in Ticket A:** 2.2 depends on both vocabulary and shape; 2.3's checker rewrite duplicates 2.1's work if done separately; 2.5 IS a vocabulary rename. Each would need the file touched again in Ticket B.

## Risks

- **Phase 2.1 blast radius**: the `impl.records → impl.fulfilmentIndexes` reshape touches 20+ files across model, bridge, sets, and tests. Behaviour-neutral, but big diff — reviewer needs to trust the test suite. Suggested mitigation: run the full test suite locally before push; the shape change fails loud if a callsite is missed.
- **Rename ripples**: renaming exported functions (Phase 1.2) touches `bridge/evaluation.js` and possibly `analysis/*`. Small blast, but real.
- **Cardinality unification in `state-queries.js`** (Phase 2.3): behaviour-neutral only if we're careful with the `.filter(Boolean)` callers. Add tests before rewriting if we go this route.
- **File count creep**: Phase 2 adds one or two files if we go the "extract" route. Not a big deal, but worth being deliberate.

## Open decisions summary (for the iteration turn)

_No open design decisions remain. All prior items are captured in the Resolved list below._

**Resolved:**
- Phase 0 exists as a standalone dedup ticket landing before Phase 1: `model/obligations/manifest-graph.js` becomes the single home for `ancestorChain`, `isGroup`, `leavesUnder`, `groupsFrom`. Bridge's `obligation-graph.js` dissolves; `instance-complete.js` drops its local copies.
- Phase 1.1 inner-map name → `indexedFulfilments` (not `fulfilmentsMap`). Shape check → `isIndexedFulfilments`.
- Phase 1.1 outer-property name → keep `state.fulfilments` as-is. No shape suffix.
- Phase 1.2 alias question → no aliases anywhere in the plan (clean-rename principle added to the plan header). Every rename lands atomically with all callers updated in the same commit.
- Phase 1.4 classify tags → `'unindexed'` (was `'single'`, plus the `'field'` edge case folded in per Option A), `'group'`, `'parent-derived'`, `'user-storage-derived'`, `'apply-to-derived'`. Constructor names match. Central contrast pair `unindexed` ↔ `indexed` carries the domain semantics.
- Phase 2.1 status-hoist → don't hoist. Manifest is single source of truth for status; `effectiveStatus` reads `obligation.status`. Implications become smaller (`{ inScope, fulfilmentIndexes?, reasons? }`); `unindexedImplication` stays as `(own) => own ?? { inScope: true }`.
- Phase 2.2 helper extraction → moved to Phase 0. `instance-complete.js`'s remaining Phase 2 polish is the `leafBlocksInstance` branch split and JSDoc typedef work.
- Phase 2.3 checker cardinality → unify to always-return-list; reorder composition by scope (collection-level first, then per-record). Small internal-only change; `.filter(Boolean)` disappears.
- Phase 2.6 projection-gate factory → extract, and move to Phase 0.2 (same character as manifest-graph dedup). Each file shrinks to ~15 lines with the plumbing centralised. Public signatures unchanged.
- Phase 3.2 docs → Option B: extend Phase 3.1's README to cover both the model overview and the storage-shape examples (absorbs the stretch taxonomy diagram as an ASCII table). Update `evaluator/index.js:16` to point at the README. Add a terminology-parity checkpoint (3.3) as the final step of Phase 3's PR to sweep the docs against the code and confirm the vocabulary matches everywhere.
- Ticket structure → two tickets. **Ticket A** = extend EUDPA-360 with Phase 0.1 + 0.2 + 2.4 (rescope to "reduce duplication and clean helpers"). **Ticket B** = new, bundles Phase 1 + 2.1 + 2.2 + 2.3 + 2.5 + 3. Ticket A lands first; Ticket B is large but coherent, one PR, reviewed with AI assistance. 2.4 pulled into Ticket A because it's structural cleanup independent of vocabulary/shape; 2.2/2.3/2.5 stay with Ticket B because they entangle with Phase 1 or 2.1.
