# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-349
**All repos in scope:** trade-imports-animals-frontend (meta), trade-imports-animals-backend (diff cached but off-ticket — see note)
**PR:** #213 | **Commit:** fa4a0b7

## Scope note — what actually shares this vocabulary

`.review-meta.json` lists one PR (frontend #213). A second diff is cached for
`trade-imports-animals-backend`, but it is PR **#50 / commit 6ec2139 —
`feat(EUDPA-171) Add notification amend feature`**, already merged to `main`.
It contains **zero** occurrences of "fulfil" and is unrelated to EUDPA-349. It was
swept into the workspace by `prepare-review.sh`, not by branch parity. No
`EUDPA-349` branch exists in the backend or the tests repo.

Repo-wide sweep for the `fulfilment` vocabulary across the whole workspace:

| Repo | Files mentioning `fulfilment` | Role in this contract |
|---|---|---|
| `trade-imports-animals-frontend` | many | **Owner** — defines and interprets the id/index shape |
| `trade-imports-animals-backend` | 13 | **Opaque store** — `Notification.fulfilments` is `List<Document>`, doc-commented *"Opaque obligation-fulfilment payload — persisted byte-faithfully; never interpreted by the backend"* |
| `trade-imports-animals-tests` | 5 | **Wire-shape consumer** — `domain/models/api/notification-fulfilments.ts` and `flows/api-journey.ts` hard-code `records: [{ fulfilmentId, value }]` |
| stub, dynamics-gateway, reference-data, ins-frontend, schemas, admin | 0 | Not consumers |

So the delimiter/vocabulary change is correctly frontend-only for *code*, but the
**persisted payload shape is a three-repo contract** (frontend writes, backend
stores, tests seeds). That is where the consistency risk sits.

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---|---|---|---|
| `/` → `.` index delimiter swap | backend n/a (opaque `List<Document>`); tests seeds depth-1 only (`line0`), never depth-2 | ✅ Applied everywhere — no `line0/unit0` remains in `src`, `test` or `tests`; no `split('/')`/`join('/')` left on any fulfilment path | CONSISTENT (code) / **INCONSISTENT (data)** — see Missing Changes #1 |
| Read-side migration or fallback for already-persisted `/` indexes | backend ❌ none (byte-faithful, no migrator); tests ❌ none | ❌ None | **INCONSISTENT** — no repo owns the migration |
| Wire field name `fulfilmentId` inside `records[]` | tests ✅ `{ fulfilmentId, value }` in `notification-fulfilments.ts` + `api-journey.ts`; backend ✅ opaque, unaffected | ✅ Retained (`fulfilment-codec/records/*.js`) | CONSISTENT — but undocumented; see Missing Changes #2 |
| `fulfilmentId` → `fulfilmentIndex` rename | n/a (no peer repo carries the vocabulary) | ⚠️ Partial — 8 comment sites + 2 filenames + several locals still say `fulfilmentId` for an index | INCONSISTENT (intra-repo) |
| `INDEX_DELIMITER = '.'` single source of truth | n/a | ❌ Declared 4× | INCONSISTENT (intra-repo) |
| `PATH_UNSAFE` → `FIELD_UNSAFE` rejecting `:` and `.` (AC2) | n/a | ✅ `bridge/fulfilment-registry.js` — `/[.:[\]/*]/`, and group tokens already constrained by `TOKEN = /^[A-Za-z][A-Za-z-]*$/` | CONSISTENT — AC2 met |
| Docs updated alongside code | n/a | ✅ `sets/live-animals/docs/add-a-collection.md` reworded to "fulfilment indexes (`line0`, `line0.unit1`)" | CONSISTENT |
| E2E cover for the changed shape | tests repo ❌ no branch, no depth-2 seed | n/a | **INCONSISTENT** — see Missing Changes #3 |

## Missing Changes

### 1. No read-side migration for persisted depth-2 indexes — hard failure, not silent drift

Confirmed by tracing the decode path in the PR snapshot:

- `services/persistence/records/fulfilment-codec/validate/fulfilment-id.js`
  calls `hasIndexedSegments` then compares `segmentsOf(id).length` against
  `depthOf(obligation)`.
- `bridge/fulfilment-id.js` — `segmentsOf = (id) => id.split(INDEX_DELIMITER)`
  where `INDEX_DELIMITER` is now `'.'`.

For an already-persisted depth-2 record `'line0/unit0'`:
`segmentsOf` returns `['line0/unit0']` (one segment); `hasIndexedSegments`
**passes** (last char is a digit); the depth check then sees `actualDepth = 1`
vs `expectedDepth = 2` and calls `fail()`, which
`fulfilment-codec/fail.js` implements as
`throw new TypeError('Invalid persisted fulfilment: …')`.

Net effect: **every notification already holding a depth-2 fulfilment record
becomes unloadable** after deploy. Depth-1 records (`line0`) are unaffected.

Nobody owns the fix:

- The backend cannot — `Notification.java:49` declares the payload opaque and
  never interprets it, so it has no delimiter awareness and no migrator.
- The tests repo cannot — it only seeds fixtures.
- Therefore it must be the frontend, in the codec read path.

The PR itself demonstrates the need: `sets/live-animals/journeys/linear/fixtures/characterisation-oracles.json`
had to be rewritten `line0/unit0` → `line0.unit0` (diff lines 2442–2455). The
same rewrite is required for live data and is absent.

Suggested shape: normalise on decode in
`fulfilment-codec/records/decode-records.js` — accept `/` as a legacy segment
separator, rewrite to `.` before validation, and let the next save persist the
new form. Cheap, self-healing, removable once environments are known clean.
Whichever way it is resolved, it should be an explicit decision recorded on the
ticket (including "pre-prod only, wipe the data") rather than an omission.

### 2. Wire field name `fulfilmentId` retained — correct, but the contract is undocumented

`records: [{ fulfilmentId, value }]` is the persisted JSON shape, stored
byte-faithfully by the backend and hard-coded in the tests repo
(`domain/models/api/notification-fulfilments.ts:14`,
`flows/api-journey.ts:29-31`). Keeping the field name is the right call —
renaming it would break stored documents and the E2E suite simultaneously.

But under the new vocabulary the field now unambiguously carries a **fulfilment
index** (`line0.unit0`), not a fulfilment id (`<uuid>:line0.unit0`), so the AC
"code consistently and correctly refers to fulfilment index … and fulfilmentIds"
is violated at exactly the boundary that is hardest to change. Nothing in
`fulfilment-codec/` says why. Add a comment at the codec boundary — e.g. on
`decode-records.js` or `validate/fulfilment-id.js` — recording that
`fulfilmentId` is a frozen wire name whose value is a fulfilment index, shared
with the backend's opaque store and the tests repo, and deliberately not
renamed.

### 3. No E2E cover in the tests repo for the changed shape

`trade-imports-animals-tests` seeds only depth-1 indexes (`record(COMMODITY_SELECTION, 'line0', …)`
and four siblings, `flows/api-journey.ts:54-58`); a repo-wide grep for
`unit[0-9]` finds nothing. Depth-1 indexes contain no delimiter at all, so the
E2E suite is structurally incapable of catching the regression in #1 — before or
after this change. No `EUDPA-349` branch exists there.

Given the ticket blocks EUDPA-333, a depth-2 seed (`'line0.unit0'`) in the tests
repo would be cheap insurance. Whether that belongs in this ticket is a
judgement call, but the gap should be named rather than assumed covered.

## Unique Changes

Everything else in this PR is frontend-only by design and correctly scoped:

- **`INDEX_DELIMITER = '.'` declared four times** — exported from
  `bridge/fulfilment-id.js:4`, then re-declared privately in
  `model/obligations/state-queries.js:12`,
  `model/obligations/evaluator/internal/group-instance-paths.js:5` and
  `model/obligations/helpers/projection/internals/filter-and-project.js:5`, each
  under the comment *"Kept in sync with bridge/fulfilment-id.js#INDEX_DELIMITER;
  model/ …"*.

  The stated justification is real: `.dependency-cruiser.cjs` rule
  `model-import-boundary` (severity `error`) forbids `model/` importing outside
  itself. But it is not the whole story — the rule permits
  `^src/server/app/services/[^/]+/index\.js$`, and separately `bridge/` is free
  to import from `model/` (`bridge-no-up` only blocks `engine|flow|analysis`);
  `bridge/fulfilment-id.js:1` already does exactly that. So a single declaration
  is reachable without weakening the boundary: **own the constant in `model/`
  and re-export it from `bridge/fulfilment-id.js`**. Three hand-synced copies of
  the load-bearing constant in a PR whose entire purpose is changing that
  constant is the wrong end-state; a comment is not a mechanism.

- **Partial `fulfilmentId` → `fulfilmentIndex` rename.** Confirmed residual
  sites, split by whether they are safe to change:

  *Comments describing an index as an id (safe, should be fixed):*
  `bridge/collection-complete.js:10`, `bridge/status/index.js:21`,
  `bridge/status/completeness/leaf.js:7`,
  `model/obligations/evaluator/enumeration/enumerate-group-fulfilment-indexes.js:6,7,11`,
  `model/obligations/evaluator/purge/purge-storage.js:4,55`.

  *Local identifiers (safe, should be fixed):*
  `bridge/fulfilment-bindings.js:61,67,79,81` — the parameter is literally
  assigned from `formatFulfilmentIndex(groups, indices)` at line 79, so the name
  contradicts its own initialiser;
  `model/obligations/evaluator/purge/purge-storage.js:15,16,17` — iterates
  `fulfilmentId` and tests it against a set named `fulfilmentIndexes`;
  `bridge/read-fulfilment.js:89` — `groupFulfilmentIndexes(group, descendants, parentId)`,
  parameter still `parentId`;
  `services/persistence/records/notification-mapper/shared/lines/from-fulfilment.js`
  — `lineId`/`unitId`/`valueAt(obligation, id)` and the comment *"identity comes
  only from exact composite ids"*, all now indexes.

  *Filenames (safe, and one is a direct asymmetry inside this PR):*
  `bridge/fulfilments/fulfilment-id-path.js` now exports only
  `validateFulfilmentIndex` and `fulfilmentIndexToPath` — the exports were
  renamed, the file was not.
  `services/persistence/records/fulfilment-codec/validate/fulfilment-id.js`
  exports `validateFulfilmentId` doing **the same depth-and-trailing-digit check
  as `validateFulfilmentIndex`** in the file above. One of the pair was renamed
  in this PR and the other was not, leaving two near-identical validators under
  two different vocabularies. Worth either renaming the codec one (its callers
  are internal) or, better, collapsing the duplication — but see #2: the *wire
  field* name must stay regardless.

- **`enumerate-group-fulfilment-ids.js` → `enumerate-group-fulfilment-indexes.js`**
  is a clean rename (old file gone from the tree) — correct.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 3 cross-repo/data-contract inconsistencies (missing read-side
migration; undocumented frozen wire name; no depth-2 E2E cover) + 2 intra-repo
consistency defects carried from the per-file reviews (4× duplicated
`INDEX_DELIMITER`; partial rename across ~14 sites and 2 filenames)
**Summary:** The delimiter swap and AC2 regex change are applied consistently
across every code and fixture site in the only repo that interprets the
vocabulary, but the change silently breaks already-persisted depth-2 records
with a thrown `TypeError` and no repo in the workspace owns a migration — the
backend stores the payload opaquely and the tests repo only ever seeds depth-1,
so neither the code nor the E2E suite can catch it.
