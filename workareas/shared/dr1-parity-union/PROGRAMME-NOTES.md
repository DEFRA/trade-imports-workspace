# Programme notes — DR1 parity union

Read by L1 at the start of every batch. L0 never reads this. Method lives in
`.claude/workflows/batch-orchestrator/`; this file holds facts about *this*
programme only.

## What the backlog is

The union of two independent parity runs comparing the live-animals frontend
against **Design release 1** of the `GB-notification-service` prototype.
Run C reused nothing from run A. 161 increments: 113 found by both runs, 25
only by A, 23 only by C.

Full background: `workareas/shared/dr1u-handover/README.md`.

## Standing rulings — do not re-raise these

Five decisions are already recorded, each with a `decision` object carrying the
reason. **A `dropped` increment is a settled decision, not an oversight.** If a
finding you are building appears to overlap one of these, stop and put it on the
`owed-to-human` line rather than reopening it.

| Increment | Ruling |
|---|---|
| `inc-062` | **dropped** — the address book is descoped to its own epic |
| `inc-094` | **rejected** — the frontend is right to refuse a lowered animal count while identifier records exist; DR1 orphans them silently |
| `inc-030` | **rejected** — keep the dashboard card's status-driven links; do not flatten to Copy as new + View |
| `inc-031` | **rejected** — keep the always-sorted dashboard; do not add an unsorted state |
| `inc-013` | **rejected** — do not port DR1's page-by-page button list; superseded by `inc-161` |

Two are **deferred**, not rejected — `inc-023` and `inc-024`, the remaining
dashboard sort work. The dashboard is temporary. They are `blocked` and must not
be built without a fresh ruling.

## `inc-161` carries its own design decision

`inc-161` replaces the rejected `inc-013`. It was ruled to **rule (b)**:

> Only the pages the overview links to end with the three controls; a page
> reached from another page ends with the primary alone.

The ruling in its `decision` note names the mechanism and every file. Build it
as ruled — do not re-derive the rule from the design, which answers the question
both ways on adjacent pages.

Seven templates pass `showReturnControls: false` to `save-actions.njk`:
consignment details, import purpose, port of exit, exit date, transporter
selection, private transporter details, CPH number. The party pickers adopt the
macro passing false. `inc-161` changes **no string**.

**Ordering constraint:** `inc-006` renames the same two controls' text. Order
does not matter between them — `inc-006` touches copy keys, `inc-161` touches
the macro's parameters and its callers — but whichever lands second must not
undo the first. Under rule (b), `inc-006`'s rename lands on **29** frontend
screens rather than 41.

## Seven increments disagree about banding

The two runs banded these differently, and the disagreement is stated in
`finding.difference` rather than resolved: `inc-018`, `inc-023`, `inc-053`,
`inc-054`, `inc-091`, `inc-101`, `inc-103`.

**`inc-091` is the one with money attached.** Run A bands the per-species
commodity rows behind a reference-data API; run C proves the store already holds
one line per species, making it a template-and-Remove change today. If you build
it, build run C's reading and say so — but check the store first.

Treat a banding disagreement as a plan lie worth checking in Step 1, not as a
detail. A `needs-backend` band that is really `frontend-work` blocks work that
could ship.

## Provenance, and why ids look odd

Every increment carries a `provenance` block: `sourceA`, `sourceC`, `origin`,
`note`, `better`, `judged`.

- **Ids are not in sequence with the array order and must never be renumbered.**
  They are bound to rulings and citations. The order is the array.
- **Run A and run C both number findings `inc-NNN`, and the same number means
  different findings in different runs.** Never quote a bare `inc-NNN` without
  saying which backlog. Union ids are a third sequence again.
- `origin: "a-only"` means run C never found it. That is not a reason to doubt
  it — the two runs looked at different things. Run A read the obligation model
  harder; run C photographed five times as many states.

## Evidence lives in the per-run reports

There is **no `dr1u` corpus profile**, so nothing renders this backlog as a
page. `tim parity report EUDPA-328-DR1U` fails with *Unknown corpus "dr1u"*.
The union spans two capture sets — `corpus` is `dr1` on 50 increments and `dr1c`
on the other 110, because `screens` only resolves against its own captures.

To see a finding's pictures and citations, open the run it came from:

```
workareas/journey-builder/EUDPA-328-DR1/report/index.html    (run A, sourceA ids)
workareas/journey-builder/EUDPA-328-DR1C/report/index.html   (run C, sourceC ids)
```

Both source backlogs are **frozen**. Read them for citation ground truth; never
write to them. One of them carries rulings.

## Pins

Findings were authored against these commits. A citation that has drifted is a
premise worth re-checking before building on it.

```
frontend    76a864ba93ac7c60d358c902bd68396731daacf3
prototype   491b39263e4f3b613bc398851b701425b74438ee
```

## Target

`live-animals-frontend` — `repos/trade-imports-animals-frontend`, scope
`src/server/app/sets/live-animals`. The implementor skill is `frontend-change`.

Verification ladder: `test:live-animals`, `format:check`, `lint`,
`test:fit:features`. The frontend pins npm through `packageManager`, so an
ambient npm rejects the lockfile.
