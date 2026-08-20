# Workspace workflows

Deterministic multi-agent orchestration scripts. Run one with the `Workflow` tool:
`Workflow({ name: "increment-build-loop" })`, or point at the file directly with
`Workflow({ scriptPath: ".claude/workflows/increment-build-loop.js" })`.

## `increment-build-loop.js`

Builds plant-products/CHED-PP increments from
`workareas/shared/plant-products-ched-pp/backlog.json`, one at a time, with a full
quality pass per increment rather than a single implement-and-hope pass.

**Which increments** — edit the `FALLBACK` const at the top (`{ increments: ['pp-053'] }`),
or pass `args`. It defaults to the fallback because `args` plumbing has proved unreliable
in this runtime. A list runs **serially**, and the run stops at the first failure so a
broken increment is never built on top of.

### The stages, per increment

| Stage | Agents | What it does |
|---|---|---|
| Baseline | 1 | Refuses to start on a dirty tree or a red suite, so any later red is unambiguously ours |
| Implement | 1 | Follows the `frontend-change` skill (frontend), Java best-practices (backend) or Playwright best-practices (tests). Stages, never commits |
| Review | 2n+1 | One style reviewer and one code reviewer **per changed file**, plus a consistency reviewer across the whole change |
| Verify findings | 1 per finding | Adversarial refutation — each finding must survive an agent actively trying to kill it |
| Judge | 1 | Replaces the skills' interactive `WALKER`. Rules each surviving finding fix-now / defer / reject **without asking a human** |
| Fix | 1 | Applies only what the judge ruled fix-now |
| Ladder | 1 | Runs the increment's own `verification` array, in order, to logs |
| Land | 1–2 | Commits on green and marks the increment done; `git stash push -u` on red |

The reviewers follow the personas the skills already ship —
`review/references/{FILE_REVIEWER,CONSISTENCY_REVIEWER,REVIEW_ITEM_FIXER}.md` and
`code-style/references/{STYLE_FILE_REVIEWER,STYLE_IMPLEMENTOR}.md` — so the loop and a
hand-run review apply the same standard.

### What still stops for a human

- **A `gate` on the increment.** `pp-012` (depth-3 collection characterisation) and `pp-021`
  (the commodity model) are HALT-FOR-REVIEW by design. The judge absorbs routine review
  triage; it does not absorb these. The loop lands the increment, then stops.
- **A red ladder.** Rolled back with `git stash push -u` (recoverable — never `reset --hard`),
  the failure recorded in the increment's `notes`, and the run stops.
- **Pushing.** The loop commits but never pushes.

### Deferred findings are never lost

When the judge defers a finding it writes it into that increment's `openQuestions` in
`backlog.json`. So "the judge decided instead of asking you" still leaves you a reviewable
trail — read it with:

```bash
jq -r '.increments[] | select((.openQuestions|length)>0) | .id + ": " + (.openQuestions|join(" | "))' \
  workareas/shared/plant-products-ched-pp/backlog.json
```
