# Workspace workflows

Deterministic multi-agent orchestration scripts. Run one with the `Workflow` tool:
`Workflow({ name: "increment-build-loop" })`, or point at the file directly with
`Workflow({ scriptPath: ".claude/workflows/increment-build-loop.js" })`.

## `increment-build-loop.js`

Builds increments from **any** `backlog.json` under `workareas/`, one at a time, with a
full quality pass per increment rather than a single implement-and-hope pass. The
programme is data: the loop knows nothing about which backlog it is running beyond the
config below.

**The config** — edit the `FALLBACK` const at the top, or pass the same shape as `args`.
It defaults to the fallback because `args` plumbing has proved unreliable in this runtime.

| Field | What it is |
|---|---|
| `workarea` | Path under `workareas/` holding `backlog.json` — e.g. `shared/plant-products-ched-pp`, `trace-requirements/ched-pp` |
| `branch` | The branch every repo in the programme is cut onto. The baseline guard checks it |
| `scope` | Conventional-commit scope for the landing commit. Defaults to the workarea's basename |
| `executor` | `claude` (default) or `codex` — see below |
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
  increments: ['pp-053']
}
```

That resolves to `workareas/shared/plant-products-ched-pp/backlog.json` and lands commits
as `feat(plant-products): <increment title>`. It is one programme among several, not the
loop's default reality — any other workarea works the same way.

### The stages, per increment

| Stage | Agents | What it does |
|---|---|---|
| Baseline | 1 | Refuses to start on a dirty tree or a red suite, so any later red is unambiguously ours |
| Implement | 1 | Follows the `frontend-change` skill (frontend), Java best-practices (backend) or Playwright best-practices (tests). Stages, never commits |
| Review | 2n+1 | One style reviewer and one code reviewer **per changed file**, plus a consistency reviewer across the whole change |
| Verify findings | 1 per file | Adversarial refutation — each finding must survive an agent actively trying to kill it |
| Judge | 1 | Replaces the skills' interactive `WALKER`. Rules each surviving finding fix-now / defer / reject **without asking a human** |
| Fix | 1 | Applies only what the judge ruled fix-now |
| Ladder | 1 | Runs the increment's own `verification` array, in order, to logs |
| Land | 1–2 | Commits on green and marks the increment done; `git stash push -u` on red |

The reviewers follow the personas the skills already ship —
`review/references/{FILE_REVIEWER,CONSISTENCY_REVIEWER,REVIEW_ITEM_FIXER}.md` and
`code-style/references/{STYLE_FILE_REVIEWER,STYLE_IMPLEMENTOR}.md` — so the loop and a
hand-run review apply the same standard.

### Executors

`executor: 'claude'` (the default, and the proven path) runs every stage as a Claude
subagent.

`executor: 'codex'` delegates the three token-heavy stages — **implement**, **review** and
**fix** — to Codex CLI, using the briefs in [`codex/`](codex/) and the output schemas in
[`codex/schemas/`](codex/schemas/). Baseline, verify-findings, judge, ladder and land stay
on Claude in both modes: they are orchestration and adjudication.

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
