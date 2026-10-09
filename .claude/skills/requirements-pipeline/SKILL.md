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
| BUILD | [`references/BUILD.md`](references/BUILD.md) | A backlog in the one shape exists and you want increments built, a stopped run resumed, or a run handed over. The repos come from the backlog envelope; the user gives only the epic, or, for a build onto an existing branch with no Jira and no merge, the branch (`lifecycle: 'branch'`). Every row keeps the Behaviour Spec (`openspec/`) current whatever its repos, and once a theme's last row lands the loop lints that theme's spec and stops on a scenario no test proves |

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
    sources.schema.json    DISTIL's sources.json: goal, repos, precedence, sources, and an optional themes rule
    partition.schema.json  one source's partition: its structure and the parts one agent each extracts
    extract.schema.json    one source's extract, and each of its part files: structure and claims
    verify.schema.json     one source's verification: a verdict per claim, and the claims it missed
    areas.schema.json      the reconcile areas: every source's claims about each area, by extract part or claim range
    reconcile-part.schema.json  one area's reconciled requirements and conflicts, before tim merges the areas
    requirements.schema.json  the reconciled requirements
    conflicts.schema.json  the reconciled conflicts: precedence or question, with a default
    challenge.schema.json  one question's challenge verdict: precedence, blocked or question
    DISTIL.md              phase 1: intake → launch distil.js → fold in new sources → save the report
    REPORT.md              the report's structure and writing rules
    TRACE_EXTRACTOR.md     how to extract a Playwright trace source
    BUILD.md               phase 2: build the args → launch the loop → check what landed → handover
  workflow/
    README.md              both workflows' config and stages; the loop's executors and what stops for a human
    distil.js              the DISTIL workflow: status → characterise → extract parts → verify → area plan → reconcile per area → cross-area → challenge → draft rows per area → combine → report
    distil/briefs/         the method each DISTIL agent follows: characterise, extract, one extract brief per source kind, verify, area-plan, reconcile, question-challenge, consolidate
    increment-build-loop.js
    codex/                 the implement, review and fix briefs for executor: 'codex'
      schemas/             the output schemas those briefs answer in
```

**DISTIL extracts every source in depth, every run.** One agent characterises each source and cuts it into parts
small enough to read in full; one agent per part reads its slice word for word and claims everything in it; tim
merges the parts. A small source is one part. There is no lighter path and no switch for one, and characterise,
extract and verify run on Opus by default (`models: {}`), because a thin extract caps everything downstream: a page,
field or rule nobody claimed never reaches a requirement. To extract a source again after the method changes, run
`tim distil reset` before the launch.

**Every later stage is as deep.** Reconcile is cut into areas (a journey page or page group, the dashboard, the
address book, templates and the rest), one Opus reconciler an area weighing every claim about it, today's sources
included, then one cross-area pass. Every question is challenged by its own agent against precedence and every
ruling: **questions are minimal by default**, a blocker outside the programme is never a question, and only the
questions nothing settles reach the owner. Every area's rows are drafted by their own agent before one combiner
draws themes at feature-folder granularity. The fan-outs run six at a time, so a deep run stays inside the session
limit and resumes cleanly. No light agent's relay is trusted blindly: every count the workflow acts on is checked
against another. To reconcile again from nothing after the reconcile or consolidate method changes, run
`tim distil reset --stage reconcile` before the launch.

The DISTIL workflow's agents are the default workflow agent. Their guard rails
tell them not to spawn subagents or forks, and to finish their own task if a
user message is relayed to them mid-run.

## Splitting a theme off early

When one theme is ready while the rest of a themed backlog is still being ruled on and re-distilled, split just
that theme off so a second machine builds it on its own branch. Repeat as more themes become ready.

```bash
tim backlog split <workarea> --theme <theme id> --json           # dry run: what moves, what now waits on what
tim backlog split <workarea> --theme <theme id> --write --json   # move it
```

The theme's backlog is written to `themes/<theme id>/backlog.json` as the full split would write it, and merged
into `themes/themes.json`. The theme and its rows then leave `backlog.json` altogether; there is no lock. The main
backlog keeps one pointer in `splitOff` (the theme, its branch and backlog, the rows that moved and the requirements
they covered), so a re-distil never drafts them again. The second machine pulls and runs the build loop on
`<workarea>/themes/<theme id>`, as for any split theme. A later ruling that touches the theme reaches it through
the report's "For the split branches" section, which names the branch. Detail:
[`references/DISTIL.md`](references/DISTIL.md#8-splitting-a-theme-off-early).

Launch either workflow by `scriptPath`, never by `name` (a name runs a stale snapshot):

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/distil.js", args })
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/increment-build-loop.js", args })
```

## The tim commands

Both phases and both workflows share these. `<workarea>` is the path under `workareas/`.

```bash
tim distil status <workarea> --json      # every source's state and next step: the distil workflow's work list
tim distil check <workarea> --source <id> --stage partition|extract|verify|all [--part <n>] [--chunk <n>] [--clear-parts] --json   # one source's files against the schemas and each other
tim distil merge-extract <workarea> --source <id> --json  # join a source's extract parts into its one extract, stamping the scope hash
tim distil reset <workarea> --source <id> [--source <id>] | --all --json   # move sources' extract and verify files to distil/superseded/<time>/, so the next launch extracts them again
tim distil reset <workarea> --stage reconcile --json      # keep every verified extract; move requirements, conflicts, areas, challenge verdicts, backlog and report aside, so the next launch reconciles from nothing
tim distil stamp <workarea> --source <id> --json          # record the source's scope hash in its extract
tim distil merge-verify <workarea> --source <id> --json   # join a source's verify parts into one file, recording the extract's hash
tim distil adopt <workarea> --source <id> --json          # take on a source distilled by hand: record both hashes
tim distil working-set <workarea> [--write] --json        # every claim that held, plus every missed claim
tim distil areas <workarea> [--write | --area <id> | --requirements] --json   # check distil/areas.json (no claim in no area); --write each area's working set; --area one area's reconciled and to-build requirements
tim distil merge-reconcile <workarea> [--area <id>] --json   # join every area's reconciled.json into requirements.json and conflicts.json, numbering new ids; --area checks one area and writes nothing
tim distil challenge <workarea> [--conflict <id> | --clear] --json   # the question conflicts to challenge; --conflict checks one verdict; --clear removes them
tim distil coverage <workarea> --json    # requirements and conflicts against the working set, every source backing something, every challenge verdict applied, and every adopted requirement in one increment or a theme split off early (a blocked one never in a todo row); problems scoped reconcile or backlog
tim distil backlog-snapshot <workarea> [--save <tag>] [--compare-to <tag>] --json   # rows removed, rows built or set aside that changed, and split-off pointers changed, since a snapshot
tim distil trace <workarea> --source <id> [--folder <name>] [--out <file>] --json -- <subcommand>     # the playwright trace CLI, in the source's own folder or a sub-folder of it, with a Playwright at least as new as the one that recorded the trace
tim backlog check <workarea> --json      # the shape, dependencies, cycles, recipe fields, themes and externalDependsOn; exits 1 when out of shape
tim backlog next <workarea> --json       # the next buildable id, or NONE; an externalDependsOn row must be done in its own workarea
tim backlog split <workarea> [--write] [--branch-prefix <prefix>] --json   # a themed backlog into one backlog per theme, plus themes/themes.json with the landing order; skips themes split off early
tim backlog split <workarea> --theme <id> [--theme <id>] [--write] --json  # split one ready theme off early: its rows leave backlog.json, which keeps a pointer in splitOff
tim backlog set <workarea> <id> --status done --commit abc1234   # the loop's only way to write back
tim backlog standards --files <repoKey>:<path> --json            # the standards the planner and implementor apply to a file
```

## What is coupled to what

The shapes are the joint. [`references/backlog.schema.json`](references/backlog.schema.json)
is the one definition of the backlog, and the nine DISTIL schemas beside it
(`sources`, `partition`, `extract`, `verify`, `areas`, `reconcile-part`, `requirements`, `conflicts`, `challenge`) are the one definition of
each DISTIL file. tim, the distil workflow's agents and the loop all read those files;
nothing else lists the fields. Change one and check the others in the same change:

| Piece | What it does with the shape |
|---|---|
| [`references/backlog.schema.json`](references/backlog.schema.json) | Defines it: every field, required or not, the statuses, the recipe fields refused |
| [`references/SHAPE.md`](references/SHAPE.md) | The judgement rules a schema cannot check |
| The nine DISTIL schemas (`references/*.schema.json`) | Define `sources.json`, each partition, extract, extract part and verify file, `areas.json`, each area's reconciled file, `requirements.json`, `conflicts.json` and each challenge verdict, every field described |
| `tim/src/distil/` (`tim distil`) | Validates every DISTIL file against those schemas at runtime, plus what a schema cannot say: unique ids, partitions and their part prefixes, every part present and the extract its parts merged, verdicts matching claims, missed ids, scope hashes, extract hashes, cited claims and conflicts, every claim in an area, every source backing a requirement, every challenge verdict applied, and every adopted requirement in exactly one increment (a blocked one never in a todo row). Merges extract parts, verify parts and the areas' reconciled files, resets sources for a fresh extract or the later stages for a fresh reconcile, builds the working set and each area's, snapshots the backlog's rows and runs the trace CLI with a new enough Playwright |
| The distil workflow ([`workflow/distil.js`](workflow/distil.js)) and its briefs ([`workflow/distil/briefs/`](workflow/distil/briefs/)) | Runs `tim distil` for its work list and every check, and gives each agent the schema it writes to. Checks every relayed count against another before it acts on it. Its combine step writes the backlog to its schema and runs `tim backlog check` and `tim distil coverage` until both pass |
| `tim/src/backlog/shape.js` | Validates it against the schema at runtime (`check`), plus what a schema cannot say: dependencies exist, no cycle, no duplicate id, and every `merge` key is in the row's `repos` and the envelope's. Names the withheld statuses, held to the schema's enum by a test, and derives the next id (`next`), following `externalDependsOn` into other workareas |
| `tim/src/backlog/themes.js` and `split.js` (`tim backlog split`) | The theme rules in SHAPE.md: unique ids, no theme cycle, no two themes touching the same code, every todo or blocked row in one theme, cross-theme dependencies matched by theme dependencies, and a split backlog's own envelope. `split.js` writes one backlog per theme, turning a cross-theme `dependsOn` into `externalDependsOn`, and the landing order; with `--theme` it splits one theme off early and leaves a `splitOff` pointer |
| `tim/src/backlog/split-off.js` | Reads the `splitOff` pointers and holds the rules a schema cannot check: a theme split off is never in `themes`, no row is in it or reuses a moved row's id, and no requirement is held twice. `tim distil coverage`, `tim distil areas` and `tim distil backlog-snapshot` read the pointers through it |
| The loop's `readIncrement` and plan stage ([`workflow/increment-build-loop.js`](workflow/increment-build-loop.js)) | Reads the row and envelope into every stage's prompt; the planner turns the row into `plans/<id>.md` |
| The loop's branch stage, under `lifecycle: 'branch'` ([`workflow/increment-build-loop.js`](workflow/increment-build-loop.js)) | Reads the row's `repos`, `merge`, `gatePhases` and `awaitCi`, and the envelope's `repos` keys. The script checks what it copied (`rowFieldProblems`) and drives the merge, gate and CI stages from it. A new lifecycle field starts in the schema and lands here, in its check and in [`references/BUILD.md`](references/BUILD.md#branch-lifecycle) |
| The loop's theme spec check ([`workflow/increment-build-loop.js`](workflow/increment-build-loop.js)) | After each landing, reads the row's `theme` (or a split backlog's envelope `theme`) as a jq summary of its rows' `status`, `id` and `repos`. Once none is `todo`, it runs `tim spec lint` and `tim spec gaps --none` for the prefixes the theme touched; see [`workflow/README.md`](workflow/README.md#the-behaviour-spec). A renamed theme or status field lands here too |
| BUILD's derive and landed checks ([`references/BUILD.md`](references/BUILD.md)) | Relies on `next`'s status-and-dependencies rule and the `status`/`commit`/`prs` fields the loop writes |
| The Codex briefs ([`workflow/codex/`](workflow/codex/)) | Read the same plan and row under `executor: 'codex'` |

A new row field, a new status, or a renamed one starts in the schema and touches all of
them. So does a new field in a DISTIL file: its schema first, then `tim distil`, then the
brief that writes it. Both workflows' args contracts are checked by
`tim/src/backlog/workflow-contract.test.js`, which scans this skill's `workflow/` as well as
`.claude/workflows/`.
