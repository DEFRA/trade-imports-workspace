# Batch orchestrator

Two tiers of orchestration above [`increment-build-loop.js`](../increment-build-loop.js), so a
programme of hundreds of increments runs without any one session's context filling up.

## The three tiers

| Tier | What it is | Lives for | Owns |
|---|---|---|---|
| **L0** | A Claude session, running [`L0-TOP-ORCHESTRATOR.md`](L0-TOP-ORCHESTRATOR.md) | The whole run | Budgets, the ledger, cheap verification, spawning L1 |
| **L1** | A fresh subagent per batch, running [`L1-BATCH-ORCHESTRATOR.md`](L1-BATCH-ORCHESTRATOR.md) | One batch | Choosing each increment, plan checks, baselines, driving L2, verifying landings, `backlog.json`, the batch report |
| **L2** | `increment-build-loop.js`, unchanged | One increment | Implement, review, refute, judge, fix, ladder, commit or roll back |

L1 invokes L2 once per increment, so **which** increment gets built next is decided after the previous
one has landed and been verified.

## The context argument

**The only context-refresh primitive available is agent death.** A subagent starts fresh and its
context is discarded when it returns; the parent absorbs only the final report. Nothing else resets —
in-session cron enqueues into the *same* session, so it cannot refresh anything.

So the design puts every expensive read below a death boundary. L1 reads the diffs, the test logs, the
review argument and the briefs. Then L1 dies. L0 absorbs about 15 lines.

L0's context growth per batch is a fixed small constant: the ledger tail, four counts, a buildable
count, L1's report, and a handful of `git log --oneline` lines. Call it under a thousand tokens. Twenty
batches later it is still under twenty thousand. The run length is bounded by the backlog, not by L0.

[`L0-TOP-ORCHESTRATOR.md`](L0-TOP-ORCHESTRATOR.md) carries an explicit **never read** list. It is the
load-bearing part of that prompt — L0 reading one diff to "just check something" is what the whole
structure exists to prevent.

## The batch is a budget, not a plan

L0 hands L1 a **count**: "build up to five increments". It does not choose which. L1 derives the next
buildable increment from `backlog.json`, builds it, verifies it landed, and **re-derives** — so a
dependency the last increment satisfied, a status it changed, an increment it inserted, or a premise it
invalidated all take effect immediately.

That is the point of building serially. A list chosen five increments deep would freeze the plan at the
moment of choosing and throw away everything increment one teaches. So no list is ever chosen.

**L1 returns early whenever reality diverges** — nothing buildable, a premise invalidated by what just
landed, a designed gate, or a failed increment. **A batch that lands two of a budget of five is a
success.** L0 is told this explicitly, so it does not read a short batch as a shortfall or ask for the
difference to be made up.

The consequence for the ledger is that a batch's ids are knowable only as they land. The `in-flight`
entry records the budget and the starting counts; `attempted`, `landed` and `notLanded` get filled in
at the end.

## Agent arithmetic

A Workflow run is capped at **1000 agents** for its lifetime, and nested `workflow()` children share
the counter. **L1 invokes the loop once per increment**, with a single-element `increments` list, so
each run's cost is one increment's cost.

`increment-build-loop.js` has 16 `agent()` call sites. Per increment on the happy path with the
`claude` executor, where **n** is the number of files the increment changes:

| Stage | Agents |
|---|---|
| Baseline, implement, consistency review, judge, fix, ladder, land, gate check | 8 |
| Style reviewers (one per file) | n |
| Code reviewers (one per file) | n |
| Adversarial verifiers (one per file with findings, plus a whole-change group) | n + 1 |
| **Per increment** | **9 + 3n** |

Plus one preflight per run. Failure paths add a single rollback agent and then stop, so they cost less
than a clean increment, not more.

| Files changed | Agents per run | Cap used |
|---|---|---|
| 4 | 22 | 2% |
| 8 | 34 | 3% |
| 12 | 46 | 5% |

The `codex` executor is roughly half: implement, review and fix each collapse to a shell plus a relay,
giving `12 + n` — 20 for an eight-file increment.

**Each run's cost is bounded by one increment's width, not by the batch's.** The cap therefore does not
constrain batch size at all: at 5% per run, a budget of five uses a twentieth of what one run is allowed,
and each run gets a fresh 1000 anyway. Batch size is set purely by **L1's context** — how much
verification, plan-checking and failure investigation one subagent can hold before it degrades.

**Default: 5.** Raise it while L1 is consistently finishing with headroom; drop it to 3 for large or
cross-repo increments. There is no cap-derived ceiling to respect any more, only L1's context.

Note that early returns make the budget a weak lever in practice: a batch that keeps hitting divergence
will be short whatever number you set.

## ⚠ Raise the workflow size limit before you start

The session guideline for workflow size is **medium — under 15 agents**. **A single increment already
exceeds that**, at 22 to 46 — and since L1 now invokes the loop once per increment, that is the size of
every run.

Raise it in `/config` under **Dynamic workflow size**, or the batch will be throttled. This is not
optional and it is not something the orchestrators can do for themselves.

## The run copy

`args` plumbing into the loop is unreliable, so what actually decides a run is the `FALLBACK` const
written into the script file. L1 therefore never invokes the tracked loop directly. **Before every
increment** it:

1. Copies `.claude/workflows/increment-build-loop.js` to `<workarea>/build-loop.run.js`, **fresh,
   overwriting any previous copy**.
2. Patches `FALLBACK` in that copy with the Edit tool, setting `increments` to the **single** id it has
   just derived.
3. Runs `Workflow({ scriptPath: "workareas/<workarea-rel>/build-loop.run.js", args: … })`, passing
   `args` too — if they arrive they agree with `FALLBACK`, and if they do not the patched copy is
   already correct.

**The tracked loop is never modified, so there is no restore step to miss.** That matters because the
design assumes L1 can die at any point: a restore step that only runs on the happy path is not a
restore step.

Re-copying before every increment does two jobs. It keeps the run copy from drifting from the tracked
loop, and it means the text L1 patches is always the pristine `FALLBACK` — so the Edit matches a known
string rather than whatever the previous increment left behind. A stale copy from a dead L1 is harmless
for the same reason: the next use overwrites it before reading it.

The loop resolves paths from absolute constants at the top of the file rather than from its own
location, so the copy behaves identically wherever it sits.

The ledger records `scriptPath` next to `driver`, so any batch can be traced to the script that
produced it.

⚠ **The run copy needs a `.gitignore` entry.** `workareas/*` is ignored but `!workareas/shared/`
re-includes the handoff namespace, and only `*.log` is excluded within it — so for any programme under
`workareas/shared/`, `build-loop.run.js` appears as untracked in the workspace's `git status`. The
workspace `.gitignore` wants:

```
workareas/*/*/build-loop.run.js
```

That line is not added here — it is a workspace change, outside this directory. Until it lands, L1
checks with `git check-ignore` each batch and raises it on its `owed-to-human` line.

## The ledger

`<workarea>/orchestrator-ledger.json`, contracted by
[`orchestrator-ledger.schema.json`](orchestrator-ledger.schema.json).

**A JSON Schema file rather than prose in this README**, because both L0's writes and any future
tooling need something pointable, and a shape described in prose drifts from the shape on disk. `jq
empty` must accept the ledger at all times; L0 writes it with a
`jq → temp → jq empty temp → mv` sequence so a failed `jq` can never destroy it.

```json
{
  "ledgerVersion": 1,
  "programme": { "workarea": "…", "branch": "…", "scope": "…", "executor": "claude", "batchSize": 5 },
  "batches": [
    {
      "batch": 3,
      "budget": 5,
      "startCounts": { "total": 103, "done": 44, "todo": 54, "deferred": 5 },
      "attempted": ["pp-053", "pp-054"],
      "status": "partial",
      "endedEarly": "increment-failed",
      "driver": "workflow",
      "scriptPath": "workareas/shared/plant-products-ched-pp/build-loop.run.js",
      "landed": [{ "id": "pp-053", "commit": "a1b2c3d", "repo": "frontend" }],
      "notLanded": [{ "id": "pp-054", "outcome": "ladder-red", "detail": "…", "stash": "stash@{0}" }],
      "report": "logs/batches/batch-003.md",
      "startedAt": "2026-08-21T09:00:00Z",
      "endedAt": "2026-08-21T10:12:00Z"
    }
  ]
}
```

**`attempted` is kept rather than dropped**, even though `landed` and `notLanded` list ids too. They do
not cover an increment L1 died partway through, and that is precisely the case reconciliation has to
handle — `attempted` tells a later L0 which ids to check against git. It is absent while a batch is in
flight, because at that point nobody knows.

`status` is about failure, never about the budget: a batch that attempted two, landed two and returned
early is `landed`. `endedEarly` carries the reason, and `budget-spent` is the only value that means the
full allowance was used.

**L0 is the only writer.** L1 never touches it. One writer is what keeps it parseable.

### Authority when sources disagree

**git, then `backlog.json`, then the ledger.**

A commit that exists is a fact. `backlog.json` stays the plan of record for increment truth — status,
commit, notes, open questions. The ledger records **batch history only**: which ids were attempted
together, what came out, where the report went. When the ledger contradicts the backlog, **the ledger
is wrong** and L0 corrects it. L0 runs a reconciliation query every batch to catch exactly that.

### Resuming from it

A fresh L0 reads the ledger tail and four counts, and knows where it is:

- Tail `in-flight` — a previous L1 or L0 died. Compare the backlog's `done` count against the entry's
  `startCounts.done` to learn how many landed, find those commits in git, close the entry as
  `abandoned`, carry on. Nothing needs rescheduling: the next L1 re-derives from `backlog.json`, so
  anything that did not land is still not `done` and gets picked up on its own.
- Tail `halted-at-gate` — an increment carried a designed human checkpoint. Stop; the user decides.
- Anything else, or no batches at all — open the next batch and go.

That is the whole resumption protocol. **No session state, no handover document, no memory of the
previous run is needed.** The backlog and the ledger are sufficient.

## Starting a run

1. Raise **Dynamic workflow size** in `/config`.
2. Confirm the programme has a `backlog.json` under `workareas/<workarea-rel>/` and that every repo is
   on `<branch>` and clean.
3. Open a fresh session. Paste [`L0-TOP-ORCHESTRATOR.md`](L0-TOP-ORCHESTRATOR.md) with its PARAMETERS
   block filled in.

L0 creates the ledger on its first action if there is not one.

## Resuming a run

Identical. Open a fresh session, paste the same filled-in L0 prompt. L0 reads the ledger tail and
picks up. There is nothing to tell it that the ledger does not already say.

If the previous run stopped at a gate, decide the gate first, mark the increment however you have
decided in `backlog.json`, then paste the prompt.

## The heartbeat, honestly

L0 arms a 30-minute `/loop` as its second action. What it does: catches L0 idling by accident after a
batch lands, and nudges it to spawn the next one.

What it does **not** do, and must not be relied on for:

- It **cannot refresh context**. It fires into the same session.
- It **cannot extend a run**. The session is still the session.
- It is **session-only and in memory**. It dies when the session exits and it auto-expires after seven
  days.
- It has **no authority over the user**. If the user has said hold, a quiet build is a deliberate stop.

`CronList` before arming; `CronDelete` anything left over, or you get two heartbeats.

## Honest limits

- **L1 driving L2 through the Workflow tool is the primary path, not a certainty.** Whether a subagent
  can invoke `Workflow` at runtime is not established. L1 carries a documented fallback: brief Codex
  per increment directly, using the generic briefs in [`../codex/`](../codex/). L1 records which path it
  used in `driver`, so the ledger says which one actually ran.
- **The run copy is untracked noise until `.gitignore` covers it.** See *The run copy* above. The
  workspace needs `workareas/*/*/build-loop.run.js` adding to `.gitignore`; until it does,
  `build-loop.run.js` shows up in `git status` for any programme under `workareas/shared/`. L1 checks
  with `git check-ignore` each batch and reports it as owed to a human. It is visible noise, not
  silent damage.
- **L0's verification is cheap, so it is shallow.** L0 confirms a SHA exists and that the backlog
  agrees. It cannot detect an increment that landed green and wrong. Catching that is L1's job, in
  Steps 4 to 6 of its brief, and there is no second line of defence above it.
- **L1 can still exhaust its own context** on a pathological batch — several large cross-repo increments
  with red ladders. Lowering the budget is the only dial, and a weak one: it caps the batch but cannot
  make any single increment cheaper to verify.
- **The ledger has one writer and no locking.** Two L0 sessions on the same programme will corrupt it.
  Run one.
- **None of this makes a bad plan good.** On a long build the defects come from plans far more often
  than from code, and green suites hide them. The four plan-lie checks in L1 Step 1 are the
  counterweight, and they cost a real slice of every batch.

## Worked example — the plant-products/CHED-PP programme

One programme among several. Nothing in the method is specific to it.

```
<workspace-tilde>  ~/git/defra/trade-imports-animals
<workspace-abs>    /Users/samfarrington/git/defra/trade-imports-animals
<workarea-rel>     shared/plant-products-ched-pp
<workarea>         ~/git/defra/trade-imports-animals/workareas/shared/plant-products-ched-pp
<backlog>          <workarea>/backlog.json
<ledger>           <workarea>/orchestrator-ledger.json
<branch>           spike/trace-to-requirements
<scope>            plant-products
<executor>         claude
<batch-size>       5
```

Landing commits read `feat(plant-products): <increment title>`. Batch reports land at
`<workarea>/logs/batches/batch-NNN.md`.

Programme facts — standing rulings, the do-not-build list, the stack incantation, the known flaky
bands — belong in `<workarea>/PROGRAMME-NOTES.md`, which L1 reads if it exists and L0 never reads. Keep
them out of the prompts in this directory: those hold method only.
