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
below is required. A missing key stops the run before any agent starts, naming each
missing key. The first log line is the resolved configuration.

| Field | What it is |
|---|---|
| `workarea` | Path under `workareas/` holding `backlog.json` — e.g. `shared/plant-products-ched-pp`, `trace-requirements/ched-pp` |
| `branch` | The base branch each increment's own branch is cut from and merged back into |
| `scope` | Conventional-commit scope for the landing commit |
| `executor` | `claude` or `codex` — see below |
| `planOnly` | `true` writes each increment's plan and stops — no ticket, branch, baseline or build. `false` for a real run |
| `jiraProject` | Jira project key raised tickets land in |
| `epic` | Parent epic every raised ticket hangs off |
| `jiraInProgressStatus` | The board's working status, set when the build starts |
| `jiraDoneStatus` | The board's finished status, set after the merge |
| `jiraBoard` | Numeric id of the board raised tickets are moved onto — 13780 is EUDPA |
| `ciFixAttempts` | How many times a red PR may be fixed and re-pushed before the run stops |
| `ciWatchMinutes` | How long one CI watch may block before it counts as RED |
| `requireApproval` | Whether *every* PR of an increment needs an approving review on GitHub before the merge stage may merge *any* of them |
| `approvalWaitMinutes` | How long the merge stage may wait for those approvals before it stops and leaves every PR open |
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
  branch: 'main',
  scope: 'plant-products',
  executor: 'claude',
  planOnly: false,
  jiraProject: 'EUDPA',
  epic: 'EUDPA-12345',
  jiraInProgressStatus: 'In Progress',
  jiraDoneStatus: 'Done',
  jiraBoard: 13780,
  ciFixAttempts: 3,
  ciWatchMinutes: 30,
  requireApproval: false,
  approvalWaitMinutes: 20,
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
| Baseline | 1 | Refuses a dirty tree, then runs `tim build gate` one phase at a time (unit, FIT, E2E) into `logs/<id>-baseline/` and reports each rung as tim printed it. Baseline green is gate green, so any later red is unambiguously ours |
| Plan | 1 | Reads the row, the live tree, the nearest exemplar and the standards `tim backlog standards` resolves for the files, and follows a repo's recipe (`frontend-change` for a frontend journey change). Writes `plans/<id>.md`: decisions, moves, edits, new files, tests with the integration proof, checks per acceptance criterion, the increment-specific checks beyond the gate, out of scope. Lifted from `frontend-alignment.js` |
| Implement | 1 | Executes the plan, across every repo the slice needs. Stages, never commits. Checks itself with `tim build gate --phase unit` and `--phase fit` (Codex: unit only); never starts or stops the workspace stack |
| Review | 2g+1 at most (Claude) | Codex runs `g + 1` reviews at the same granularity — see Executors. Under Claude: one style reviewer and one code reviewer **per (repo, language) group** of changed files — `g` groups, typically 2–6 — plus a consistency reviewer across the whole change. Docs (`.md`, `.json`, `.yaml`) get a code reviewer but no style reviewer. A group over 12 files splits into near-equal parts |
| Verify findings | 1 per group with findings | Adversarial refutation, grouped the same way — each finding must survive an agent actively trying to kill it |
| Judge | 1 | Replaces the skills' interactive `WALKER`. Rules each surviving finding fix-now / defer / reject **without asking a human** |
| Fix | 1 | Applies only what the judge ruled fix-now. Checks itself with the gate's unit and FIT phases, like the implementor |
| Ladder | 1 | Runs `tim build gate` one phase at a time into `logs/<id>-ladder/`, then the plan's sections 5 and 6 checks. Given the implementor's and fixer's notes and every baseline rung with its log |

**The gate owns the repos' own rungs and the workspace stack.** `tim build gate` runs the
rungs `references/gates.json` lists for each backlog repo — format check, lint, typecheck,
unit, `mvn verify`, FIT after a free-port check, and the tests repo's local-stack E2E — and
for E2E starts the stack only if it was down and stops only what it started. No agent picks
those scripts or starts or stops the stack; a stack that is up is left alone. The ladder
compares every red rung with the baseline rung of the same repo and name: every one was green
at baseline, so a red one is this increment's to repair or diagnose. After a repair it re-runs
the red phase, and the unit phase too, then the plan's checks.
| Land | 2–3 | A branch guard first: every repo must be on the run's branch, and one on another branch at the same commit is moved back. Then commits on green and records the commit. The increment is not done until its PRs are merged, so the merge stage is what marks it. A red ladder, a failed land, a repo that cannot be moved back, or any other stop after implement goes through the same preserve step — a pushed wip commit — so the tree is left clean and the attempt recoverable |

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

Four things to know about codex mode:

- Codex has a **normal shell**, so each brief opens by telling it to ignore the Claude-only
  `GUARD RAILS` block (no `&&`, tilde-only paths, `node`/`npx` denied).
- **Review runs at the same granularity as Claude's.** One codex review per (repo, language)
  group, in parallel, applying that group's personas (style and code; code alone for docs),
  plus one codex consistency review across the whole change — `g + 1` codex runs, each with
  its own shell and relay. The brief takes the group's files as `<reviewFiles>` and its
  personas as `<personas>`. Findings merge and go through the same verify and judge path as
  Claude's. Codex's findings schema also carries a `confidence` per finding, which the relay
  folds into `why` because the Claude-side schema has no room for it.
- **Every repo stays on the run's branch.** Each brief says so, and a light branch guard runs
  after every codex stage and again before land. A repo on another branch at the same commit
  is moved back, carrying its staged work; anything else stops the run through the preserve
  step.
- **A stage that cannot run stops the loop.** If a review or fix run produces no result —
  non-zero exit, no last-message file, unparseable JSON, or a dead shell or relay agent — the
  loop preserves the attempt and stops rather than proceeding. A crashed reviewer must never
  read as approval.

Per increment, codex mode is at most `23 + 3g` agents against Claude's `17 + 3g`.

### What still stops for a human

- **A `gate` on the increment.** Some increments are HALT-FOR-REVIEW by design — in the
  plant-products backlog, `pp-012` (depth-3 collection characterisation) and `pp-021` (the
  commodity model) are. The judge absorbs routine review triage; it does not absorb these.
  The loop lands the increment, then stops. This is a row's own field, honoured regardless of
  `requireApproval` — a checkpoint somebody set deliberately on that increment, not a setting
  on the run.
- **A red ladder.** Preserved as a pushed wip commit (recoverable — never `reset --hard`),
  the failure recorded in the increment's `notes`, and the run stops.
- **`requireApproval: true`, if a programme opted into it.** Off by default — the multi-agent
  review, adversarial verification and judge already are the review — but when a programme sets
  it, every PR of an increment needs an approving review on GitHub before the merge stage may
  merge any of them, and the run stops at `awaiting-approval` (green, unapproved) or
  `changes-requested` until a human acts. See `../references/BUILD.md` for the whole-increment
  approval sweep this turns on.

### Deferred findings are never lost

When the judge defers a finding it writes it into that increment's `openQuestions` in
`backlog.json`. So "the judge decided instead of asking you" still leaves you a reviewable
trail — read it with:

```bash
jq -r '.increments[] | select((.openQuestions|length)>0) | .id + ": " + (.openQuestions|join(" | "))' \
  workareas/<workarea>/backlog.json
```
