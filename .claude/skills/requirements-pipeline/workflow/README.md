# The increment build loop

The workflow the `requirements-pipeline` skill's BUILD phase drives. Point the `Workflow`
tool at the file by `scriptPath` with an `args` object — see the worked example below.
Launching by `name` runs a stale snapshot rather than what is on disk:

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/increment-build-loop.js", args })
```

**To run a backlog rather than a single increment, follow the BUILD phase**
([`../references/BUILD.md`](../references/BUILD.md)). It derives each increment and
launches this loop by `scriptPath` with that increment's configuration as `args`, checking
the landing and repeating. This runs from the main session because **a subagent cannot
invoke `Workflow`**. That is why the former two-tier `batch-orchestrator/` prompts were
removed: their middle tier could never start the thing it existed to drive.

The loop keeps the args contract every workflow script in the workspace keeps — see
[`.claude/workflows/README.md`](../../../workflows/README.md#the-args-contract) — and
`tim/src/backlog/workflow-contract.test.js` checks it here as well as there.

## `frontend-alignment.js`

Kept as a reference only, at
[`workareas/shared/frontend-alignment/frontend-alignment.reference.js`](../../../../workareas/shared/frontend-alignment/frontend-alignment.reference.js)
— not runnable, and deliberately outside every workflow folder so it does not trip the
workflow-contract test's `FALLBACK` check. It drove the design demonstration that brought
`trade-imports-ins-frontend` into shape against the two journey frontends, stage by stage;
its plan stage was lifted into `increment-build-loop.js` below.

## `increment-build-loop.js`

Builds increments from **any** `backlog.json` under `workareas/`, one at a time, with a
full quality pass per increment rather than a single implement-and-hope pass. The
programme is data: the loop knows nothing about which backlog it is running beyond the
config below.

The backlog is in the one shape defined by
[`../references/backlog.schema.json`](../references/backlog.schema.json), with the rules a
schema cannot check in [`../references/SHAPE.md`](../references/SHAPE.md): each row is a
requirement (what, why, acceptance) and a full-stack slice. The loop plans the how just in
time, against the live tree, into `<workarea>/plans/<id>.md`, and every later stage works
from that plan. Stages write back to the backlog only through `tim backlog set`.

**The config** — pass it as `args`, a JSON object, launching by `scriptPath`. Every key
below is required, and the (full) ones only under `lifecycle: 'full'`. A missing key stops
the run before any agent starts, naming each missing key. The first log line is the
resolved configuration.

| Field | What it is |
|---|---|
| `workarea` | Path under `workareas/` holding `backlog.json` — e.g. `shared/plant-products-ched-pp`, `trace-requirements/ched-pp` |
| `branch` | The branch every repo in the programme is cut onto. The baseline guard checks it |
| `scope` | Conventional-commit scope for the landing commit |
| `executor` | `claude` or `codex` — see below |
| `lifecycle` | `full` (ticket → branch → build → PR → CI → merge → ticket done) or `local` (build and commit on the current branch — no Jira, no push, no PR) |
| `planOnly` | `true` writes each increment's plan and stops — no ticket, branch, baseline or build. `false` for a real run |
| `jiraProject` (full) | Jira project key raised tickets land in |
| `epic` (full) | Parent epic every raised ticket hangs off |
| `jiraInProgressStatus` (full) | The board's working status, set when the build starts |
| `jiraDoneStatus` (full) | The board's finished status, set after the merge |
| `jiraBoard` (full) | Numeric id of the board raised tickets are moved onto — 13780 is EUDPA |
| `ciFixAttempts` (full) | How many times a red PR may be fixed and re-pushed before the run stops |
| `ciWatchMinutes` (full) | How long one CI watch may block before it counts as RED |
| `requireApproval` (full) | Whether *every* PR of an increment needs an approving review on GitHub before the merge stage may merge *any* of them |
| `approvalWaitMinutes` (full) | How long the merge stage may wait for those approvals before it stops and leaves every PR open |
| `repos` | Where `frontend`, `backend` and `tests` live: a workspace-relative `path` and a GitHub `github` slug each. Give it in full — a programme in the plants repos names its own table here |
| `models` | Required — pass `{}` to inherit the session model for both tiers. Each tier is optional: `heavy` (plan, implement, reviewers, verifiers, judge, fix, CI fix) and `light` (ticket, branch, baseline, ladder, land, PR, CI watch, merge, done) |
| `increments` | The increment ids to build, in order |

A list runs **serially**, and the run stops at the first failure so a broken increment is
never built on top of. A preflight `jq` against the resolved `backlog.json` runs before
anything else: a workarea with no readable backlog throws, naming the path it tried,
rather than proceeding against nothing.

### Worked example — the plant-products/CHED-PP programme

```js
{
  workarea: 'shared/plant-products-ched-pp',
  branch: 'spike/trace-to-requirements',
  scope: 'plant-products',
  executor: 'claude',
  lifecycle: 'local',
  planOnly: false,
  repos: {
    frontend: { path: 'repos/trade-imports-animals-frontend', github: 'DEFRA/trade-imports-animals-frontend' },
    backend: { path: 'repos/trade-imports-animals-backend', github: 'DEFRA/trade-imports-animals-backend' },
    tests: { path: 'repos/trade-imports-animals-tests', github: 'DEFRA/trade-imports-animals-tests' }
  },
  models: {},
  increments: ['pp-053']
}
```

That resolves to `workareas/shared/plant-products-ched-pp/backlog.json` and lands commits
as `feat(plant-products): <increment title>`. Any other workarea works the same way.

### The stages, per increment

| Stage | Agents | What it does |
|---|---|---|
| Baseline | 1 | Refuses to start on a dirty tree or a red suite, so any later red is unambiguously ours |
| Plan | 1 | Reads the row, the live tree, the nearest exemplar and the standards `tim backlog standards` resolves for the files, and follows a repo's recipe (`frontend-change` for a frontend journey change). Writes `plans/<id>.md`: decisions, moves, edits, new files, tests with the integration proof, checks per acceptance criterion, the ladder, out of scope. Lifted from `frontend-alignment.js` |
| Implement | 1 | Executes the plan, across every repo the slice needs. Stages, never commits |
| Review | 2n+1 | One style reviewer and one code reviewer **per changed file**, plus a consistency reviewer across the whole change |
| Verify findings | 1 per file | Adversarial refutation — each finding must survive an agent actively trying to kill it |
| Judge | 1 | Replaces the skills' interactive `WALKER`. Rules each surviving finding fix-now / defer / reject **without asking a human** |
| Fix | 1 | Applies only what the judge ruled fix-now |
| Ladder | 1 | Runs the plan's ladder, in order, to logs: each changed repo's own gate, the acceptance checks, the integration proof |
| Land | 1–2 | Commits on green and marks the increment done; `git stash push -u` on red |

The reviewers follow the personas the skills already ship —
`review/references/{FILE_REVIEWER,CONSISTENCY_REVIEWER,REVIEW_ITEM_FIXER}.md` and
`code-style/references/{STYLE_FILE_REVIEWER,STYLE_IMPLEMENTOR}.md` — so the loop and a
hand-run review apply the same standard.

### Executors

`executor: 'claude'` (the proven path) runs every stage as a Claude
subagent.

`executor: 'codex'` delegates the three token-heavy stages — **implement**, **review** and
**fix** — to Codex CLI, using the briefs in [`codex/`](codex/) and the output schemas in
[`codex/schemas/`](codex/schemas/). Baseline, plan, verify-findings, judge, ladder and land
stay on Claude in both modes. Both executors build from the same plan file.

A workflow script has no shell of its own, so each codex stage is **two** agents: a shell
that writes the resolved prompt to `<workarea>/logs/<id>-<stage>.prompt.md`, runs one
`codex exec` against it and reports only **whether it ran**, and a relay that reads
`<id>-<stage>.lastmsg.txt` and re-emits it as the stage's result. Keeping them apart is what
makes "the run died" distinguishable from "Codex looked and found nothing". The briefs are
written with `<workspace>` / `<workarea>` / `<backlog>` / `<logs>` / `<skills>` /
`<branch>` / `<INCREMENT_ID>` placeholders that the loop binds to real values in that prompt.

Three things to know about codex mode:

- Codex has a **normal shell**, so each brief opens by telling it to ignore the Claude-only
  `GUARD RAILS` block (no `&&`, tilde-only paths, `node`/`npx` denied).
- The review stage is **one** codex reviewer over the whole change applying all three
  personas, not the 2n+1 per-file fan-out. Codex's findings schema also carries a
  `confidence` per finding, which the relay folds into `why` because the Claude-side schema
  has no room for it.
- **A stage that cannot run halts the loop.** If the review or fix stage produces no result
  — non-zero exit, no last-message file, unparseable JSON, or a dead shell or relay agent —
  the loop throws rather than proceeding. A crashed reviewer must never read as approval.
  The implement stage instead routes the same failure into its existing rollback path, which
  stashes the tree first; it has no silent-success branch to protect.

### What still stops for a human

- **A `gate` on the increment.** Some increments are HALT-FOR-REVIEW by design — in the
  plant-products backlog, `pp-012` (depth-3 collection characterisation) and `pp-021` (the
  commodity model) are. The judge absorbs routine review triage; it does not absorb these.
  The loop lands the increment, then stops.
- **A red ladder.** Rolled back with `git stash push -u` (recoverable — never `reset --hard`),
  the failure recorded in the increment's `notes`, and the run stops.
- **Pushing.** The loop commits but never pushes.

### Deferred findings are never lost

When the judge defers a finding it writes it into that increment's `openQuestions` in
`backlog.json`. So "the judge decided instead of asking you" still leaves you a reviewable
trail — read it with:

```bash
jq -r '.increments[] | select((.openQuestions|length)>0) | .id + ": " + (.openQuestions|join(" | "))' \
  workareas/<workarea>/backlog.json
```
