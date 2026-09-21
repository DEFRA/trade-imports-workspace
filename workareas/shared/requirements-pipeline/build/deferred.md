# Deferred findings from the bootstrap build

A finding the judge ruled "defer" is real, but belongs to a later increment. Each one names that
increment, so its planner picks the finding up.

## From inc-003 (landed `e0f53cfa`)

### D1 for inc-017 (backlog-build.js): DESIGN 7.3's first lines are superseded

`DESIGN.md:1917` prescribes `const A = typeof args === 'string' ? JSON.parse(args) : args` as the
first lines of `backlog-build.js`. inc-003 made the args contract a block that every
`.claude/workflows/*.js` must carry byte for byte, and the contract test enforces it. An inc-017
implementer following the design literally would write a script the contract test rejects. The
name `A` also escapes the default check, which only looks at `CFG.`.

**How to apply in inc-017:** carry the args-contract block exactly as the contract test requires,
and name the parsed configuration `CFG`. Record the deviation from DESIGN 7.3 in the plan's
Decisions.

The judge deferred this rather than fixing it because inc-003's plan named DESIGN.md untouched,
and an increment never edits what its plan does not name.

## Withdrawn 21 September 2026: D2, D3, D5, D8 and D9

Sam ruled: "Existing work is existing work. That's already in flight. This is a new thing. Don't
backport." Each of these deferrals would have reworked parity's existing tooling in inc-040:
- moving `corpora.json`
- the bash readers
- `resolveCorpusId`'s run-id probe
- `acceptRepoint`'s read
- the `profileKey` test

inc-040 no longer does that: req-112, "remove old paths", is dropped. Parity keeps running as it
does today, through the parity-v1 profile inc-004 built. **No later planner should act on these
five.** They stay below only as the record of what was found.

## For inc-022 (delivery): reusable partial work from the dropped inc-001

inc-022 now owns req-001 (draft PR and CI wait as tim commands) and req-004 (the session's commit
trailer). The dropped inc-001 had part-built the tim side of req-001 before it was stopped, and
that work is saved as the git stash "inc-001 partial (dropped 2026-09-21)". The files are
`tim/src/commands/github/pr.js`, `tim/src/github/`, the `github-client` additions,
`tim/src/constants/prExitCodes.js` and `tim/src/test-support/fake-github.js`, each with its tests.
inc-022's implementer may read it for reference with `git -C ~/git/defra/trade-imports-workspace
show 'stash@{0}^3:<path>'`, or `stash@{0}:<path>` for a tracked file.

It is unreviewed. It was never planned against req-001's current wording. Its edits to the old
build loop, the build-orchestrator skill and `tools/npm/npm-in-repo.sh` are backports, and must not
be reapplied.

## From inc-004 (writer core)

### D2 for inc-040 (`retire-old-paths`, req-112): `git mv tools/parity/corpora.json tools/backlog/registry.json`, the three bash readers, and `scaffold-corpus.sh:98`

DESIGN 4.1 has the parity corpora file move wholesale into `tools/backlog/registry.json`. inc-004
keeps it in place instead (plan D7, D9): `corpus-profile.test.js:125,210` writes and reads the real
`tools/parity/corpora.json` path and asserts on the literal source strings `corpora.json default` and
`runId in corpora.json`, so moving the file forces an edit to that test — req-008 ac-1's falsifier,
word for word. `tim/src/backlog/registry.js` reads both files today and is the seam the move lands on
without breaking parity. `start-comparison.sh`, `phase.sh` and `scaffold-corpus.sh` (its `:98`
directory-scaffolding write in particular) still read `tools/parity/corpora.json` directly and need
retiring or repointing at the same time as the move.

**How to apply in inc-040:** `git mv tools/parity/corpora.json tools/backlog/registry.json`
(history kept), fold the four frozen corpora's entries into the merged registry shape
`tim/src/backlog/registry.js` already reads, update or retire the three bash readers, and rewrite
`corpus-profile.test.js`'s fixture and path assertions for the new location — which is fine once the
readers themselves are being retired in the same increment (req-112's own words: "every script, mode
and workflow the new pipeline replaces MUST be removed or clearly frozen").

### D3 for inc-040 (`retire-old-paths`, req-112): `resolveCorpusId`'s run-id probe still builds a path from a run id

`corpus-profile.js`'s `resolveCorpusId` still resolves a corpus id by reading
`workareas/journey-builder/<runId>/{backlog.json,.corpus-meta.json}` — a path built from the run id,
which is the literal thing req-009's statement forbids ("never by building a path from a run id").
inc-004 left it exactly as it is (plan D8): two tests
(`corpus-profile.test.js` — "reads the corpus field off the backlog", "falls through to
.corpus-meta.json when the backlog is silent") pin it, and removing it fails those tests inside the
same increment that req-008 ac-1 forbids editing them in. req-009 is met everywhere else on the
`tim backlog` route: every path a command reads or writes comes from the registry entry via
`loadProgramme`, and the probe only resolves an identifier for parity's own `<runId>`-shaped command
line — it opens no programme's files itself.

**How to apply in inc-040:** this residual goes with the `EUDPA-*` run-id rule and the bash readers —
once `start-comparison.sh` and friends (the only reason `resolveCorpusId`'s run-id shape exists at
all, per `DESIGN.md`'s own note that the rule exists "only because of the bash readers") are retired,
`resolveCorpusId` can drop the run-id probe and resolve purely through the registry, and the two tests
above can be rewritten to pin the registry-only behaviour instead.

### D5 for inc-040 (`retire-old-paths`, req-112): DESIGN 4.1's profiles-folder claim and its migration table row both need correcting

`DESIGN.md:937` reads `**Profiles as data** (`tim/src/backlog/profiles/`):`, which reads as though
every profile — parity's included — lives under that folder. It does not: `tim/src/backlog/profiles/`
holds only `index.js` and `requirements-v2.js`; `parity-v1` lives at `tim/src/parity/profile-v1.js`,
a deliberate deviation recorded on merit in plan inc-004.md's D3 — the generic folder carries no
findings, screens or band vocabulary. `DESIGN.md:2940`'s migration-table row (`tools/parity/corpora.json`
becomes `tools/backlog/registry.json`, inc-004) is already covered by D2 above; inc-004 kept the file
in place.

**How to apply in inc-040:** when `tools/parity/corpora.json` actually moves, correct `DESIGN.md:937` to
name both folders (`tim/src/backlog/profiles/` for `requirements-v2`, `tim/src/parity/profile-v1.js`
for `parity-v1`) and confirm `DESIGN.md:2940`'s row is either updated to inc-040 or removed once D2 is
applied.

## From inc-004, for inc-005 (`v2-assembly`)

### D4 for inc-005: three prose-slot lists, not two — reconcile when `set.js` moves

The survey for inc-004 named two prose-slot lists (`set.js:7-15`'s `SLOTS`, seven names; the writer's
own four-name `PROSE_SLOTS`, now on `tim/src/parity/profile-v1.js`). There is a third:
`tim/src/parity/check.js:260` holds a module-local
`const PROSE_SLOTS = ['frontend','prototype','difference','falsifiedBy']`, read at `check.js:488`,
copied from the writer's own list rather than importing it. inc-004 left it exactly as it is —
`check.js` is untouched by the writer-core move, and the copy it holds is the same four names the
writer's list still has, so nothing breaks — but whichever increment moves `set.js` into
`tim/src/backlog/` (DESIGN 4.2's `tim backlog set`, out of scope for inc-004 per its own §5) is the one
that should reconcile all three into one list rather than adding a fourth copy.

**How to apply in inc-005:** when `set.js` moves and generalises its own slot whitelist per profile,
have `check.js` import the parity-v1 slot list from `tim/src/parity/profile-v1.js` (`PROSE_SLOTS`)
rather than holding its own copy, so there are two lists after the move (one per profile,
`set.js`-owned) instead of three.

## From inc-004: the judge's deferrals

### D6 for inc-006 (write-safety): split `runIngest`'s guards into named helpers (F3, minor)

`tim/src/backlog/ingest.js:205`: `runIngest` inlines four guard blocks, at about lines 221-296: the
replace-block, dropped-ruling, frozen-change and verification checks. The frozen-change `.map()`
also pushes to a list as a side effect.

**Apply in inc-006**, which adds locks, `--op-id` and `--expect-sha` to this same function. Extract
`assertReplaceAllowed`, `findDropped`, `assertNoDroppedRulings` and `assertVerified`, and keep the
row-building `.map()` pure.

### D7 for inc-006 (write-safety): `--json` must emit the envelope for every error (F33, major)

`tim/src/commands/backlog/index.js:58` emits the JSON envelope only for a `TimError`. An unexpected
error in `--json` mode writes plain text to stderr and nothing to stdout, which breaks the `--json`
contract in `tim/.claude/rules/cli-patterns.md`. `makeParityAction` (`commands/parity/index.js:72-87`)
has the same gap.

**Applied in inc-006, backlog half only.** `envelope.js` gained `errorPayloadFor(error)`, mapping any
non-`TimError` to `UNKNOWN`, and `makeBacklogAction`'s catch now uses it whenever `opts.json` is set.
**The parity half is withdrawn under Sam's ruling** ("Existing work is existing work. That's already
in flight. This is a new thing. Don't backport."), the same ruling that withdrew D2, D3, D5, D8 and
D9 above: `makeParityAction`'s catch in `commands/parity/index.js` is unchanged, and no later planner
acts on it either. The gap this finding named is real and stays recorded here as found.

### D-inc-009 for inc-009 (rulings ledger): a ruling must itself replay under `commitWrite`

req-016 ac-1 reads "a ruling written with an operation id … the ledger holds one entry". inc-006
proves the criterion on `state note`/`build/journal.jsonl` and the shared ops log (D10 of
`plans/inc-006.md`), because the `rule` command and the decisions ledger belong to inc-009
(req-028 to req-031), which does not include req-016 among its members. Without this entry,
inc-009's planner — which reads this file, not `plans/inc-006.md` — would have no reason to look at
req-016 again, and the literal "ruling" wording would go unproven.

**Apply in inc-009.** `rule` commits its decision through the same `commitWrite` inc-006 built
(`tim/src/backlog/write.js`), passed an `--op-id`. Re-prove req-016 ac-1 on an actual ruling: replay
the same op id and assert the ledger still holds one entry and the command prints the original
result verbatim.

### D8 for inc-040 (retire-old-paths): test `loadCorpusProfile`'s `profileKey` (F47, major)

`tim/src/parity/corpus-profile.js:182` sets `profileKey` to `raw.profile ?? 'parity-v1'`, and no test
asserts it. inc-004 could not add one, because its invariant protected `corpus-profile.test.js` from
any edit.

**Apply in inc-040**, when `corpora.json` moves. Add one case for the default and one for an explicit
`profile`.

### D9 for inc-040 (retire-old-paths): `acceptRepoint` still hand-builds the corpora path (F54, major)

`tim/src/parity/repoint.js:229-230` builds the `corpora.json` path itself and reads it with
`readJsonFile`, rather than calling `readCorporaFile` from `tim/src/backlog/registry.js`. That leaves
two different NOT_FOUND messages for the same missing file, and it is the one place where req-009
("through the registry") is not met.

**Apply in inc-040**, alongside D2: route the read through the registry reader.
