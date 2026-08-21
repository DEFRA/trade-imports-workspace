# DR1-U — the amalgamated Design release 1 parity backlog

One backlog holding the union of two independent parity runs over the same
comparison: the live-animals frontend against **Design release 1** of the
`GB-notification-service` prototype.

Both runs compared the same two applications at the same two commits. Run C
reused nothing from run A — its capture specs, pairing, slicing, finding
contract and every finding were derived from source with run A firewalled off.
That independence is what makes the overlap mean anything, and it is why the
union is worth building rather than either backlog on its own.

| | |
|---|---|
| **Backlog** | `workareas/journey-builder/EUDPA-328-DR1U/backlog.json` |
| **Run id** | `EUDPA-328-DR1U` |
| **Epic** | EUDPA-328 — *Catch up frontend with prototype* |
| **Target** | `live-animals-frontend` (`repos/trade-imports-animals-frontend`, scope `src/server/app/sets/live-animals`) |
| **Frontend pin** | `76a864ba93ac7c60d358c902bd68396731daacf3` |
| **Prototype pin** | `491b39263e4f3b613bc398851b701425b74438ee` |

## What is in it

**161 increments**, `inc-001`–`inc-161`.

| Origin | Count | Meaning |
|---|---|---|
| `both` | 113 | Found independently by both runs |
| `a-only` | 25 | Run A found it, run C did not |
| `c-only` | 23 | Run C found it, run A did not |

**Status: 154 todo, 2 blocked, 5 dropped.**

Every increment carries a `provenance` block recording where it came from:

```
sourceA / sourceC   the originating id in each run, null where absent
origin              "both" | "a-only" | "c-only"
note                how differently the two runs worded the same finding
better              which run put it better, where the reconciliation judged one
judged              what the adversarial judge found, where it overturned a call
```

Run A and run C both number their findings `inc-NNN`, and **the same number means
different findings in different runs**. Never quote a bare `inc-NNN` without
saying which backlog it is from. Union ids are their own third sequence.

## The order

The increments are in the order the report reads: page by page down the
journey, chrome first. The C-spined increments take their exact position from
`EUDPA-328-DR1C`, which `tim parity reorder` has put in report order. Each
`a-only` increment sits immediately after the last C-spined increment sharing
its domain, so it lands in the right section rather than stranded at the end.

**Ids are not sequential in that order, and must not be renumbered.** Ids are
bound to rulings and citations; renumbering orphans both and reads as "old
finding struck, new finding added". The build loop pops in array order, so the
order is the array, not the numbers.

## Rulings already applied

Five decisions are recorded in the backlog, each with a `decision` object
carrying the reason. They stand in the union — a finding a person has ruled on
does not come back to life because the other run also found it.

| Union | Run C | Ruling |
|---|---|---|
| `inc-062` | `inc-003` | **dropped** — address book descoped to its own epic |
| `inc-094` | `inc-018` | **rejected** — the frontend is right; DR1 orphans identifier records |
| `inc-030` | `inc-094` | **rejected** — keep the status-driven dashboard card links |
| `inc-031` | `inc-098` | **rejected** — keep the always-sorted dashboard |
| `inc-013` | `inc-106` | **rejected** — do not port DR1's page-by-page button list |
| `inc-161` | `inc-126` | **accepted under rule (b)** — see below |

`inc-161` replaces the rejected `inc-013`. It was authored after the
reconciliation ran, verified by a different agent than wrote it, and ruled:

> Only the pages the overview links to end with the three controls; a page
> reached from another page ends with the primary alone.

Seven pages lose their return controls (consignment details, import purpose,
port of exit, exit date, transporter selection, private transporter details,
CPH number) via a `showReturnControls` parameter on `save-actions.njk`.
**Knock-on:** the hub→overview rename in `inc-006` lands on 29 frontend screens
rather than 41. That is noted on `inc-006` itself.

## Known limits — read before quoting numbers

- **There is no `dr1u` corpus profile, so the report renderer will not run on
  this backlog.** `tim parity report EUDPA-328-DR1U` fails with *Unknown corpus
  "dr1u"*. The union spans two capture sets — `corpus` is `dr1` on 50
  increments and `dr1c` on the other 110, because `screens` only resolves
  against its own captures. A `dr1u` profile in `tools/parity/corpora.json`
  would need both registered. **The build loop does not need it**; it reads
  `status`, `gate` and `dependsOn` only. Read the findings in the per-run
  reports until someone builds the profile.
- **Both domain vocabularies survive** — 13 domains, including run A's `origin`
  and `contact` alongside run C's `import-reason`, `address-book` and
  `dashboard`. Translating them would have been adjudication, so it was not
  done.
- **Seven banding disagreements are stated, not resolved**, each in
  `finding.difference`: union `inc-018`, `inc-023`, `inc-053`, `inc-054`,
  `inc-091`, `inc-101`, `inc-103`. `inc-091` is the one with money attached —
  run A bands the per-species commodity rows behind a reference-data API, run C
  proves the store already holds one line per species, making it a template
  change today.
- **The matching is judgement, not arithmetic.** Two agents describing one
  change in different words share no screen id, no control name and no
  vocabulary, so no mechanical comparison finds them. Treat the `both` count as
  approximate. The two one-sided lists are the useful output.
- **Two findings still sit on `defer`** and carry through here as `blocked`:
  union `inc-023` and `inc-024` (run C `inc-101` and `inc-100`), the remaining
  dashboard sort work. Deferred because the dashboard is temporary.

## The files

| Path | What it is |
|---|---|
| `workareas/journey-builder/EUDPA-328-DR1U/backlog.json` | The backlog. The deliverable. |
| `workareas/shared/dr1u-notes.md` | Assembly notes — every judge overturn applied, every pair that could not be collapsed, the banding disagreements |
| `workareas/shared/dr1a-vs-dr1c-result.json` | The raw reconciliation: 11 subject areas × (match + adversarial judge) |
| `workareas/shared/dr1a-vs-dr1c-workflow.js` | The workflow that produced it, re-runnable |
| `workareas/shared/dr1a-digest.txt` · `dr1c-digest.txt` | One line per finding per run, `id\|domain\|band\|title` |

The two source backlogs stay frozen and are the citation ground truth:
`workareas/journey-builder/EUDPA-328-DR1/backlog.json` and
`.../EUDPA-328-DR1C/backlog.json`.

## Starting the build loop

The orchestrator is `.claude/workflows/increment-build-loop.js`. One invocation
builds one increment — or a serial list — through a full ticket-to-merge
lifecycle: raise the ticket, cut the branch, implement, style review + code
review, adversarially verify the findings, judge, fix, run the verification
ladder, commit, PR, watch CI, merge, close the ticket.

Paste this to Claude Code, standing in `~/git/defra/trade-imports-workspace`:

---

> Run the increment build loop over the amalgamated Design release 1 parity
> backlog at `workareas/journey-builder/EUDPA-328-DR1U/backlog.json`. Read
> `workareas/shared/dr1u-handover/README.md` first.
>
> Launch `.claude/workflows/increment-build-loop.js` **by `scriptPath`, not by
> name** — a named launch runs a stale snapshot. Edit the script's `FALLBACK`
> block to this config rather than relying on `args`, which the runtime does
> not plumb reliably:
>
> ```js
> const FALLBACK = {
>   workarea: 'journey-builder/EUDPA-328-DR1U',
>   branch: 'main',
>   scope: 'parity-dr1',
>   executor: 'claude',
>   lifecycle: 'full',
>   jiraProject: 'EUDPA',
>   epic: 'EUDPA-328',
>   jiraInProgressStatus: 'In Progress',
>   jiraDoneStatus: 'Done',
>   ciFixAttempts: 3,
>   ciWatchMinutes: 30,
>   increments: ['inc-003']
> }
> ```
>
> Start with `inc-003`, the phase banner, and stop after it so we can look at
> the first increment before committing to a run. Do not renumber any increment
> id. Do not touch the two frozen source backlogs, `EUDPA-328-DR1` and
> `EUDPA-328-DR1C`.

---

Then check what the loop will pop and how far it has to go:

```bash
tools/journey-builder/backlog-counts.sh EUDPA-328-DR1U
tools/journey-builder/next-increment.sh EUDPA-328-DR1U
```

### Before the first run

- **Confirm the board's status names.** `jiraInProgressStatus` and
  `jiraDoneStatus` are board configuration, not constants, and the workflow
  fails late if they are wrong:
  `tools/jira/transition-ticket.sh EUDPA-328 --list`.
- **`lifecycle: 'local'` skips Jira, the push and the PR entirely** and builds
  on the current branch. Use it to try an increment without raising a ticket;
  `epic` is then not required.
- **The verification ladder runs in the target repo** — `test:live-animals`,
  `format:check`, `lint`, then `test:fit:features`. The frontend pins its npm
  version through `packageManager`, so an ambient npm will reject the lockfile.
- **`inc-161` is ruled but not built.** Its ruling names the exact mechanism and
  the seven templates that pass `showReturnControls: false`. It changes no
  string — `inc-006` and the primary-button rename own the wording, and order
  does not matter between them.
