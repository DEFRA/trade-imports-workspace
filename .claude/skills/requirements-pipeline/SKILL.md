---
name: requirements-pipeline
description: Turn loose requirements into built, merged increments in two phases. DISTIL takes any mix of sources — Playwright trace sets, Confluence pages, documents (docx, PDF, text), images, another repo — extracts with provenance per source, verifies each extract with a different agent, reconciles across sources, records conflicts and open questions, and consolidates thin vertical slices into one backlog.json of full-stack increments in the one backlog shape, plus a decision-led report. BUILD drives that backlog through the increment build loop one increment at a time from the main session — derive the next buildable increment, run the loop, check it landed, repeat until a set number is done or something stops it, then print a copy-paste handover prompt — switching the executor between Claude and Codex per run or between increments. Use when the user wants requirements distilled into a backlog (triggers "distil requirements", "distil these sources", "turn these requirements into a backlog", "build a backlog from", "consolidate requirements", "re-distil") or wants a workarea backlog built, resumed or handed over (triggers "orchestrate the build", "run the increment build loop", "build increments from", "build N increments", "resume the build run", "hand over the build"). NOT for a comparison findings report between two built things — that is parity. NOT for one already-agreed change to a repo — that is frontend-change or ticket.
---

# requirements-pipeline

Sources in → **one backlog shape** → built increments out. One skill, two phases, one
file format between them.

```
sources ──DISTIL──▶ workareas/<workarea>/backlog.json ──BUILD──▶ merged increments
                    (references/backlog.schema.json)     (workflow/increment-build-loop.js)
```

## The two phases

| Phase | Read | Use it when |
|---|---|---|
| DISTIL | [`references/DISTIL.md`](references/DISTIL.md) | You have requirement sources and no backlog, or new sources to fold into an existing backlog (re-distil keeps every existing id). The skill works out the target repos and precedence from the goal; those repos and their rulings are always a source, so the backlog holds changes, not a rebuild |
| BUILD | [`references/BUILD.md`](references/BUILD.md) | A backlog in the one shape exists and you want increments built, a stopped run resumed, or a run handed over. The repos come from the backlog envelope; the user gives only the epic |

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
    DISTIL.md              phase 1: intake → extract → verify → reconcile → consolidate → report
    BUILD.md               phase 2: derive → run the loop → check it landed → handover
  workflow/
    README.md              the loop's config, stages, executors and what stops for a human
    increment-build-loop.js
    codex/                 the implement, review and fix briefs for executor: 'codex'
      schemas/             the output schemas those briefs answer in
```

Launch the loop by `scriptPath`, never by `name` (a name runs a stale snapshot):

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/increment-build-loop.js", args })
```

## The tim commands

Both phases and the loop share these. `<workarea>` is the path under `workareas/`.

```bash
tim backlog check <workarea> --json      # the shape, dependencies, cycles and recipe fields; exits 1 when out of shape
tim backlog next <workarea> --json       # the next buildable id, or NONE
tim backlog set <workarea> <id> --status done --commit abc1234   # the loop's only way to write back
tim backlog standards --files <repoKey>:<path> --json            # the standards the planner and implementor apply to a file
```

## What is coupled to what

The shape is the joint, and [`references/backlog.schema.json`](references/backlog.schema.json)
is its one definition. tim, DISTIL's consolidate step and the loop all read that file;
nothing else lists the fields. Change it and check the others in the same change:

| Piece | What it does with the shape |
|---|---|
| [`references/backlog.schema.json`](references/backlog.schema.json) | Defines it: every field, required or not, the statuses, the recipe fields refused |
| [`references/SHAPE.md`](references/SHAPE.md) | The judgement rules a schema cannot check |
| DISTIL's consolidate step ([`references/DISTIL.md`](references/DISTIL.md) §4) | Writes it to the schema, and runs `tim backlog check` until it passes |
| `tim/src/backlog/shape.js` | Validates it against the schema at runtime (`check`), plus what a schema cannot say: dependencies exist, no cycle, no duplicate id. Names the withheld statuses, held to the schema's enum by a test, and derives the next id (`next`) |
| The loop's `readIncrement` and plan stage ([`workflow/increment-build-loop.js`](workflow/increment-build-loop.js)) | Reads the row and envelope into every stage's prompt; the planner turns the row into `plans/<id>.md` |
| BUILD's derive and landed checks ([`references/BUILD.md`](references/BUILD.md)) | Relies on `next`'s status-and-dependencies rule and the `status`/`commit`/`prs` fields the loop writes |
| The Codex briefs ([`workflow/codex/`](workflow/codex/)) | Read the same plan and row under `executor: 'codex'` |

A new row field, a new status, or a renamed one starts in the schema and touches all of
them. The loop's args
contract is checked by `tim/src/backlog/workflow-contract.test.js`, which scans this
skill's `workflow/` as well as `.claude/workflows/`.
