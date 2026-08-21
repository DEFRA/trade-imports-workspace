# DR1U — amalgamating the two DR1 parity runs

`~/git/defra/trade-imports-workspace/workareas/shared/dr1-parity-union/backlog.json`

Union of run A (`EUDPA-328-DR1`, corpus `dr1`, 133 findings) and run C
(`EUDPA-328-DR1C`, corpus `dr1c`, 125 findings as authored), assembled from the
eleven-area reconciliation in
`~/git/defra/trade-imports-workspace/workareas/shared/dr1a-vs-dr1c-result.json`
with the judge's verdict taken over the matcher's throughout.

## The count

**160 increments**, `inc-001` … `inc-160`, contiguous and in area order.

| Origin | Count |
|---|---|
| `both` — a matched pair collapsed to one increment | 113 |
| `a-only` — raised by run A alone | 25 |
| `c-only` — raised by run C alone | 22 |

Every one of run A's 133 findings and run C's 125 findings is accounted for.
131 run A ids and all 125 run C ids appear as a `provenance.sourceA` /
`sourceC`; the two remaining run A findings — `inc-008` and `inc-123` — have no
increment of their own because the judge folded each into an existing pair (see
the overturns below), and they are named in the `provenance.judged` slot of the
increment that absorbed them.

Statuses: 155 `todo`, 3 `blocked`, 2 `dropped`.

## Working order

Areas were processed one at a time, each written to
`workareas/shared/dr1u-parts/<area>.json` and assembled in this order:
service-wide-chrome (13), dashboard (18), notification-hub (13), addresses (22),
import-reason (10), origin (7), commodities (13), animal-identification (16),
transport (19), documents (13), check-answers (16).

`plan.tsv` and `idmap.txt` in that directory are the fixed assignment of union
ids to source ids, and the map used to rewrite every cross-reference. They are
kept because they are the audit trail for the renumbering.

## Judge overturns applied

All six overturns in the reconciliation were applied before anything was built.

1. **Run A `inc-056`** — matcher called it onlyA (the frontend hub carries an
   "Exit details" task Design release 1 has no equivalent of). The judge found
   run C's `inc-067` asks in terms for the deletion of "the conditional
   exit-details task row". Built as a matched pair at **union `inc-069`**
   (A `inc-056` / C `inc-067`); the divergence is slicing, not sight — run A
   books the hub knock-on as its own schedulable finding where run C swallows it.

2. **Run A `inc-093`** — matcher called it onlyA (the frontend explains
   destination country, port of exit and exit date with guidance Design release 1
   does not have). The judge found every string run A names quoted verbatim
   inside run C's `inc-067` and `inc-069`, and every deletion run A asks for
   asked for there too. Built as a matched pair at **union `inc-068`**
   (A `inc-093` / C `inc-067`); what run A adds is trackability — run C never
   gave the copy change an id of its own.

3. **Run A `inc-008`** — matcher called it onlyA (the frontend's CPH example
   teaches a 3/3/3 grouping no CPH number uses). The judge found the diff already
   inside run C's `inc-006`, which quotes the hint verbatim and asks for the
   replacement string; a granularity split, not a miss. Folded into **union
   `inc-051`** (A `inc-009` / C `inc-006`). What run A carries alone is the
   ARGUMENT, and it is now in the increment: that 3/3/3 is factually wrong
   (2/3/4 is the real shape), that the controller's slash-stripping at
   `controller.js:77` hides the error from testing, and that the one-string fix
   ships ahead of the three-box rebuild. Run A `inc-008` has no union id of its
   own.

4. **Run A `inc-123`** — matcher called it onlyA (only run A raises Design
   release 1's Northern Ireland contradiction as an open question). The judge
   found run A's own correction slot falsifies its own inference, and that both
   surviving halves are in run C — `inc-113`'s locked country and `inc-125`'s
   chooser hint — with run C's verification slot recording the identical check
   and the identical answer. An adjudication-packaging difference, not a gap.
   Folded into **union `inc-115`** (A `inc-122` / C `inc-113`), with run A's
   citations brought across. Run A `inc-123` has no union id of its own.

5. **Run C `inc-016`** — matcher called it onlyC (Design release 1 lists the
   01061900 "Other live mammals" commodity per species). The judge found run A
   saw it, sourced it to the same `app/routes.js:623-644` branch, and
   deliberately declined to raise it separately because no captured screen shows
   it — its correction slot records the decision and its verifier upheld it.
   Built as a matched pair at **union `inc-091`** (A `inc-017` / C `inc-016`)
   with a banding disagreement recorded (below).

6. **Run C `inc-125`** — matcher called it onlyC (the transporter-type chooser's
   copy). The judge found roughly two thirds of the diff already in run A's
   `inc-133`: two edits in its difference slot and the option order and the
   "Private transporter" label in its correction slot; two of the matcher's four
   claims are false. A PARTIAL match. Built as a matched pair at **union
   `inc-124`** (A `inc-133` / C `inc-125`), spined from run C because run C makes
   the work independently schedulable where run A only ever asks for it as a
   rider on the flow rewrite. The increment states what run A's parent already
   covers so nothing is built twice, and cross-references that parent (union
   `inc-123`).

Two further increments carry a `provenance.judged` note that is not an overturn:

- **`inc-142`** (A `inc-050` / C `inc-038`) — the judge's `matchesDisputed` entry
  says the matcher's stated reason is inaccurate: run A does carry the visually
  hidden "Virus check status for {reference}" ask, demoted to its correction
  slot rather than absent. The match and the `better: C` call are confirmed.
- **`inc-144`** — see the pair I made myself, below.

## Pairs I judged rather than transcribed

**One pair the reconciliation missed entirely, which I paired: union `inc-144`
(A `inc-052` / C `inc-040`).** Neither id appears anywhere in the reconciliation
file — not in `matched`, not in `onlyA`, not in `onlyC` for the Supporting
documents area or any other. Both are the ZIP-file warning: run A's "DR1 warns
the user that ZIP files are not allowed for security reasons; the frontend never
mentions ZIP and simply refuses the file when it is chosen", run C's "Design
release 1 tells a trader that ZIP files are not allowed and why; the frontend
refuses them silently and gives a message that never mentions ZIP". Both cite
`app/views/upload-documents.html:169`, both quote "ZIP files are not allowed for
security reasons", both cite `upload-config.js:3-18` as the reason the behaviour
is already correct, and both ask for a copy-only bullet. Same subject beyond
doubt, so they were collapsed. Spine is run C; `provenance.better` is `null`
because no matcher ruled on it; `provenance.note` and `provenance.judged` both
record that the pairing is the assembler's own and that no judge saw it. This is
the one call in the backlog made by the assembler rather than transcribed.

**Every other pair collapsed confidently.** No matched row was left uncollapsed.

## Where the two runs split one finding

The matched relation is not one-to-one. Where one run merged what the other
split, the finer split wins and each matched ROW becomes its own increment, with
each taking the slice of the shared source's prose that belongs to it:

- Run A `inc-043` → union `inc-134` + `inc-135` (documents: stating the limit,
  and the cap value). The matcher argued run C's split is the better shape.
- Run A `inc-061` → union `inc-037` + `inc-038` (hub sections, hub row order).
- Run A `inc-012` → union `inc-057` + `inc-058` + `inc-059` (addresses).
- Run A `inc-039` → union `inc-023` + `inc-024` (dashboard sort).
- Run A `inc-001` → union `inc-009` + `inc-117` (service-wide, transport).
- Run A `inc-133` → union `inc-123` + `inc-124` (transport flow, type chooser).
- Run C `inc-096` → union `inc-017`, `inc-018`, `inc-019`, `inc-020` (dashboard
  filters — run A split it four ways).
- Run C `inc-067` → union `inc-067`, `inc-068`, `inc-069` (the reveals, the hint
  copy, the hub row).
- Run C `inc-095`, `inc-097`, `inc-107`, `inc-014`, `inc-070` → two union ids each.

Where a source id fans out like this, every `relatedTo` edge pointing at it was
emitted once per union target rather than dropped.

## Banding disagreements

Seven matched pairs had different `band` values in the two runs. Each says so in
`finding.difference` in plain terms — which run banded it which way and what
turns on the answer — rather than silently taking one. The band carried is the
one from the run the matcher marked `better`.

| Union | Sources | Run A | Run C | Carried |
|---|---|---|---|---|
| `inc-018` | A `inc-034` / C `inc-096` | frontend-work | needs-backend | **frontend-work** (better A) |
| `inc-023` | A `inc-039` / C `inc-101` | disputed | frontend-work | **frontend-work** (better C) |
| `inc-053` | A `inc-011` / C `inc-001` | needs-backend | frontend-work | **frontend-work** (better C) |
| `inc-054` | A `inc-016` / C `inc-002` | needs-backend | frontend-work | **frontend-work** (better C) |
| `inc-091` | A `inc-017` / C `inc-016` | needs-backend | frontend-work | **frontend-work** (better C) |
| `inc-101` | A `inc-070` / C `inc-057` | frontend-work | needs-backend | **needs-backend** (better C) |
| `inc-103` | A `inc-074` / C `inc-055` | frontend-work | disputed | **disputed** (better C) |

`inc-091` is the one with money attached: run A bands the per-species commodity
rows behind a reference-data API, run C shows the store already holds one line
per species so only the page collapses them. Run C's evidence carried the band;
the increment records that run A would have banded it higher.

Note that `inc-023`'s carried band is `frontend-work` but its status is
`blocked`, so the band is never acted on. Same shape for `inc-024`
(disputed/blocked) and `inc-031` (frontend-work/blocked).

## Rulings carried forward

A finding a person has already ruled on does not come back to life because the
other run also found it. All five of run C's rulings stand in the union, each
with its `decision` object copied verbatim:

| Union | Source | Status | Ruling |
|---|---|---|---|
| `inc-062` | C `inc-003` | `dropped` | reject — descoped by Sam 2026-08-21; a separate epic folds the address book in |
| `inc-094` | C `inc-018` | `dropped` | reject — ruled by Sam 2026-08-21; the frontend implementation is right compared to the design |
| `inc-023` | A `inc-039` / C `inc-101` | `blocked` | defer — the dashboard is temporary, so no sort work for now |
| `inc-024` | A `inc-039` / C `inc-100` | `blocked` | defer — same |
| `inc-031` | C `inc-098` | `blocked` | defer — same |

`inc-023` and `inc-024` are the two that matter for the union rule: run A found
the same sort work and left it open, and the deferral still stands. Both record
that in `provenance.note`.

`inc-094` arrived as a ruling change mid-assembly — run C `inc-018` was rejected
on 2026-08-21 on the grounds that Design release 1 accepts the lower count and
simply stops rendering the surplus identifier record, leaving entered data
orphaned in the session with neither a warning nor a deletion, where the
frontend holds the user until they remove the records or restore the count. The
part file was amended and the backlog reassembled, so the shipped file carries
it.

## Schema

Mirrors run C's backlog exactly. Top level is `corpus`, `increments`, `run_id`,
`target`; `run_id` is `EUDPA-328-DR1U`. Per increment, run C's key order:

```
id, type, milestone, domain, title, detail, screens, evidence, confidence,
band, gate, dependsOn, status, [decision], commit, failure_reason, finding,
citations, corpus, slice, source, controls, provenance
```

`decision` appears on the five ruled increments only, immediately after
`status`, as run C has it. `finding` carries `frontend`, `prototype`,
`difference`, `correction`, `falsifiedBy`, `verification`, `relatedTo` — the
last three optional, exactly as run C's are, and `verification` absent where the
prose comes from run A, which has no such slot. `gate` is `null` and `dependsOn`
is `[]` throughout, as in both source runs. Run A's `carriedFrom` key, which run
C does not have, is dropped — it pointed at ids in an earlier corpus and the
provenance block replaces it.

`provenance` is the one addition, and it goes last:

```json
{"sourceA": …, "sourceC": …, "origin": "both|a-only|c-only",
 "note": …, "better": "A|C|neither|null", "judged": … }
```

`note` is the matcher's note on a matched pair, or its `why` on a one-sided
finding, verbatim. `judged` is non-null on eight increments: the six overturns
plus `inc-142` and `inc-144`.

### Two schema decisions worth knowing about

- **`corpus` is per-run, not uniform.** Run C's backlog has `"dr1c"` on every
  increment. Here it is `"dr1"` on the 50 increments whose prose came from run A
  and `"dr1c"` on the other 110, because the two runs captured their own screen
  sets and the `screens` array only resolves against its own corpus. Top-level
  `corpus` is `"dr1u"`. If the report renderer resolves screenshots from a single
  capture directory, a `dr1u` corpus profile will need both capture sets, or the
  50 run A increments will not find their shots.
- **`domain` is per-run too**, so both vocabularies are present: run A's `origin`
  and `contact` alongside run C's `import-reason`, `address-book` and
  `dashboard`. Translating between them would have meant re-deciding what each
  finding is about, which is adjudication rather than assembly. Thirteen domains
  in all.

## Cross-references

Both runs' prose refers to sibling findings by `inc-NNN` and, in places, by
source filename. Every `relatedTo[].id` and every inline id reference in the
increment prose was rewritten to the union id through `idmap.txt`. All 160
increments' `relatedTo` targets resolve to real union ids, none is a
self-reference, and no `finding` slot contains a bare source-run `inc-NNN`.

**One residual inconsistency worth a sweep.** `provenance.note` quotes the
matcher verbatim, and the matcher wrote in source-run ids. Most are
run-qualified in their own sentence ("A's inc-072", "C inc-016"), but a minority
are bare, and the eleven area workers handled them differently: some left them
verbatim, some annotated the union id in place ("its inc-022, union inc-087"),
one qualified a single bare id. So a reader of a `provenance.note` may meet an
`inc-NNN` that is a run A or run C id, not a union id. The finding prose itself
is clean — this is confined to the quoted matcher notes. Normalising it is a
mechanical pass over the ~60 notes that contain an id, if it is wanted.

A second, smaller residue: both runs cite sibling findings by slice source
filename (`hub--row-labels`, `commodities--01061900-not-listed-per-species`).
Those were rewritten to union ids where they appeared in `detail` and
`finding.difference`, and left as written inside `correction` and `verification`,
which are notes about the originating run's own authoring process.

## Other things the area workers flagged

- **`inc-016`** (dashboard) took run A as its spine despite `better: "neither"`,
  against the default rule, because run C's contribution to that row is a single
  clause inside a different finding — taking run C would have meant inventing an
  increment.
- **`inc-072`** (import reason) is the one place where the union increment is
  less confident than one of its sources: run A cites a captured Design release 1
  error screen that run C's corpus lacks, which is why run A banded it high and
  run C medium. Run A's description of the error rendering is folded in as
  substance, but the screen id was not imported into a `dr1c`-corpus increment,
  and `confidence` stays run C's `medium`.
- **Screens never crossed runs.** Where run A evidence was folded into a
  `dr1c`-corpus increment (or the reverse), the captured state is described in
  words and the `screens` array left as the spine had it, so no increment names a
  screen its own corpus cannot resolve.
- **Run A `inc-124`** carries one verified point run C lacks — that the
  Railway/Road Vehicle transit gating is shared, so nothing downstream moves —
  which lives only in run A's correction slot with no citation object. It was
  left out of union `inc-114` rather than fabricate citations. Worth a look if
  that increment gets built.
