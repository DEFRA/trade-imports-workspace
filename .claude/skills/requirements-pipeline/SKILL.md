---
name: requirements-pipeline
description: Turn loose requirements into built, merged increments in two phases. DISTIL is one workflow launched after intake: it takes any mix of sources — Playwright trace sets, Confluence pages, web pages, documents (docx, PDF, text), images, rulings, another repo — extracts with provenance per source, verifies each extract with a different agent, reconciles across sources, records conflicts and open questions, and consolidates thin vertical slices into one backlog.json of full-stack increments in the one backlog shape, plus a decision-led report. BUILD launches that backlog through the increment build loop from the main session — the loop derives each next buildable increment itself and keeps building until a set number have landed or something stops it, so one launch drains as much of the backlog as its agent budget allows — then the session checks what landed and prints a copy-paste handover prompt. The executor is Claude or Codex, chosen per run. Use when the user wants requirements distilled into a backlog (triggers "distil requirements", "distil these sources", "turn these requirements into a backlog", "build a backlog from", "consolidate requirements", "re-distil") or wants a workarea backlog built, resumed or handed over (triggers "orchestrate the build", "run the increment build loop", "build increments from", "build N increments", "resume the build run", "hand over the build"). Sources can be built things as readily as documents — the current state of a repo, a prototype, a design release — so comparing two built things is in scope: the sources are simply the current state and the other thing, and "what is different, and what must change" produces the same backlog of increments. NOT for one already-agreed change to a repo — that is frontend-change or ticket.
---

# requirements-pipeline

Sources in → **one backlog shape** → built increments out. One skill, two phases, one
file format between them.

```
sources.json ──DISTIL──▶ workareas/<workarea>/backlog.json ──BUILD──▶ merged increments
             (workflow/distil.js) (references/backlog.schema.json)   (workflow/increment-build-loop.js)
```

## The two phases

| Phase | Read | Use it when |
|---|---|---|
| DISTIL | [`references/DISTIL.md`](references/DISTIL.md) | You have requirement sources and no backlog, or new sources or rulings to fold into an existing backlog (re-distil keeps every existing id). The main session does intake: it writes `sources.json`, working out the target repos and precedence from the goal. Then it launches `workflow/distil.js`, which extracts, verifies, reconciles, consolidates and drafts the report. The main session saves the report and takes its questions to the user. A new source or an answer goes in by editing `sources.json` and launching again |
| BUILD | [`references/BUILD.md`](references/BUILD.md) | A backlog in the one shape exists and you want increments built, a stopped run resumed, or a run handed over. The repos come from the backlog envelope; the user gives only the epic, or, for a build onto an existing branch with no Jira and no merge, the branch (`lifecycle: 'branch'`) |

Read the phase file in full before you start it, and read
[`references/backlog.schema.json`](references/backlog.schema.json) and
[`references/SHAPE.md`](references/SHAPE.md) either way: the schema defines every field,
and SHAPE.md holds the judgement rules a schema cannot. Together they are the contract
both phases keep. A run can do DISTIL and stop for Sam's answers, then come back for BUILD in another
session — the backlog on disk is the only hand-off.

## What lives here

```
requirements-pipeline/
  SKILL.md                 this file
  references/
    backlog.schema.json    the one backlog.json shape: every envelope and row field, described
    SHAPE.md               what the schema cannot say: requirement not recipe, full-stack slice, what a criterion may name, provenance
    sources.schema.json    DISTIL's sources.json: goal, repos, precedence, sources
    extract.schema.json    one source's extract: its structure and claims
    verify.schema.json     one source's verification: a verdict per claim, and the claims it missed
    requirements.schema.json  the reconciled requirements
    conflicts.schema.json  the reconciled conflicts: precedence or question, with a default
    DISTIL.md              phase 1: intake → launch distil.js → fold in new sources → save the report
    REPORT.md              the report's structure and writing rules
    TRACE_EXTRACTOR.md     how to extract a Playwright trace source
    BUILD.md               phase 2: build the args → launch the loop → check what landed → handover
  workflow/
    README.md              both workflows' config and stages; the loop's executors and what stops for a human
    distil.js              the DISTIL workflow: status → extract → verify → reconcile → consolidate → report
    distil/briefs/         the method each DISTIL agent follows: one extract brief per source kind, verify, reconcile, consolidate
    increment-build-loop.js
    codex/                 the implement, review and fix briefs for executor: 'codex'
      schemas/             the output schemas those briefs answer in
```

The DISTIL workflow's agents are the default workflow agent. Their guard rails
tell them not to spawn subagents or forks, and to finish their own task if a
user message is relayed to them mid-run.

Launch either workflow by `scriptPath`, never by `name` (a name runs a stale snapshot):

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/distil.js", args })
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/increment-build-loop.js", args })
```

## The tim commands

Both phases and both workflows share these. `<workarea>` is the path under `workareas/`.

```bash
tim distil status <workarea> --json      # every source's state and next step: the distil workflow's work list
tim distil check <workarea> --source <id> --stage extract|verify|all [--chunk <n>] [--clear-parts] --json   # one source's files against the schemas and each other
tim distil stamp <workarea> --source <id> --json          # record the source's scope hash in its extract
tim distil merge-verify <workarea> --source <id> --json   # join a source's verify parts into one file, recording the extract's hash
tim distil adopt <workarea> --source <id> --json          # take on a source distilled by hand: record both hashes
tim distil working-set <workarea> [--write] --json        # every claim that held, plus every missed claim: the reconciler's input
tim distil coverage <workarea> --json    # requirements and conflicts against the working set, and every adopted requirement in one increment; problems scoped reconcile or backlog
tim distil backlog-snapshot <workarea> [--save <tag>] [--compare-to <tag>] --json   # rows removed, and rows built or set aside that changed, since a snapshot
tim distil trace <workarea> --source <id> [--out <file>] --json -- <subcommand>     # the playwright trace CLI, in the source's own folder
tim backlog check <workarea> --json      # the shape, dependencies, cycles and recipe fields; exits 1 when out of shape
tim backlog next <workarea> --json       # the next buildable id, or NONE
tim backlog set <workarea> <id> --status done --commit abc1234   # the loop's only way to write back
tim backlog standards --files <repoKey>:<path> --json            # the standards the planner and implementor apply to a file
```

## What is coupled to what

The shapes are the joint. [`references/backlog.schema.json`](references/backlog.schema.json)
is the one definition of the backlog, and the five DISTIL schemas beside it
(`sources`, `extract`, `verify`, `requirements`, `conflicts`) are the one definition of
each DISTIL file. tim, the distil workflow's agents and the loop all read those files;
nothing else lists the fields. Change one and check the others in the same change:

| Piece | What it does with the shape |
|---|---|
| [`references/backlog.schema.json`](references/backlog.schema.json) | Defines it: every field, required or not, the statuses, the recipe fields refused |
| [`references/SHAPE.md`](references/SHAPE.md) | The judgement rules a schema cannot check |
| The five DISTIL schemas (`references/*.schema.json`) | Define `sources.json`, each extract and verify file, `requirements.json` and `conflicts.json`, every field described |
| `tim/src/distil/` (`tim distil`) | Validates every DISTIL file against those schemas at runtime, plus what a schema cannot say: unique ids, verdicts matching claims, missed ids, scope hashes, extract hashes, cited claims and conflicts, and every adopted requirement in exactly one increment. Merges verify parts, builds the working set, snapshots the backlog's rows and runs the trace CLI |
| The distil workflow ([`workflow/distil.js`](workflow/distil.js)) and its briefs ([`workflow/distil/briefs/`](workflow/distil/briefs/)) | Runs `tim distil` for its work list and every check, and gives each agent the schema it writes to. Its consolidate step writes the backlog to its schema and runs `tim backlog check` and `tim distil coverage` until both pass |
| `tim/src/backlog/shape.js` | Validates it against the schema at runtime (`check`), plus what a schema cannot say: dependencies exist, no cycle, no duplicate id, and every `merge` key is in the row's `repos` and the envelope's. Names the withheld statuses, held to the schema's enum by a test, and derives the next id (`next`) |
| The loop's `readIncrement` and plan stage ([`workflow/increment-build-loop.js`](workflow/increment-build-loop.js)) | Reads the row and envelope into every stage's prompt; the planner turns the row into `plans/<id>.md` |
| The loop's branch stage, under `lifecycle: 'branch'` ([`workflow/increment-build-loop.js`](workflow/increment-build-loop.js)) | Reads the row's `repos`, `merge`, `gatePhases` and `awaitCi`, and the envelope's `repos` keys. The script checks what it copied (`rowFieldProblems`) and drives the merge, gate and CI stages from it. A new lifecycle field starts in the schema and lands here, in its check and in [`references/BUILD.md`](references/BUILD.md#branch-lifecycle) |
| BUILD's derive and landed checks ([`references/BUILD.md`](references/BUILD.md)) | Relies on `next`'s status-and-dependencies rule and the `status`/`commit`/`prs` fields the loop writes |
| The Codex briefs ([`workflow/codex/`](workflow/codex/)) | Read the same plan and row under `executor: 'codex'` |

A new row field, a new status, or a renamed one starts in the schema and touches all of
them. So does a new field in a DISTIL file: its schema first, then `tim distil`, then the
brief that writes it. Both workflows' args contracts are checked by
`tim/src/backlog/workflow-contract.test.js`, which scans this skill's `workflow/` as well as
`.claude/workflows/`.
