# The increment build loop

The workflow the `requirements-pipeline` skill's BUILD phase drives. Point the `Workflow`
tool at the file by `scriptPath` with an `args` object — see the worked example below.
Launching by `name` runs a stale snapshot rather than what is on disk:

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/increment-build-loop.js", args })
```

**To run a backlog, follow the BUILD phase**
([`../references/BUILD.md`](../references/BUILD.md)). It builds the args once, launches this
loop by `scriptPath`, and reads the result — the loop derives its own next increment and
keeps going. This runs from the main session because **a subagent cannot invoke
`Workflow`**. That is why the former two-tier `batch-orchestrator/` prompts were removed:
their middle tier could never start the thing it existed to drive.

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
full quality pass per increment rather than a single implement-and-hope pass. It derives
its own next increment, so one invocation drains as much of the backlog as it can. The
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
| `branch` | Under `lifecycle: 'full'`, the base branch each increment's own branch is cut from and merged back into. Under `lifecycle: 'branch'`, the working branch itself, which already exists in every backlog repo; `main` and `master` are refused |
| `lifecycle` | `'full'` (ticket, own branch, PR, CI, merge, ticket done) or `'branch'` (build straight onto `branch` with no Jira and no merge). See [The branch lifecycle](#the-branch-lifecycle) |
| `scope` | Conventional-commit scope for the landing commit |
| `executor` | `claude` or `codex` — see below. The branch lifecycle takes `claude` only |
| `planOnly` | `true` writes each increment's plan and stops — no ticket, branch, baseline or build. `false` for a real run |
| `jiraProject` | Jira project key raised tickets land in. `null` under the branch lifecycle |
| `epic` | Parent epic every raised ticket hangs off. `null` under the branch lifecycle |
| `jiraInProgressStatus` | The board's working status, set when the build starts. `null` under the branch lifecycle |
| `jiraDoneStatus` | The board's finished status, set after the merge. `null` under the branch lifecycle |
| `jiraBoard` | Numeric id of the board raised tickets are moved onto — 13780 is EUDPA. `null` under the branch lifecycle |
| `ciFixAttempts` | How many times a red PR may be fixed and re-pushed before the run stops |
| `ciWatchMinutes` | How long one CI watch may block before it counts as RED |
| `requireApproval` | Whether *every* PR of an increment needs an approving review on GitHub before the merge stage may merge *any* of them. `null` under the branch lifecycle |
| `approvalWaitMinutes` | How long the merge stage may wait for those approvals before it stops and leaves every PR open. `null` under the branch lifecycle |
| `repos` | Where the repos live: a workspace-relative `path` and a GitHub `github` slug each. Under the full lifecycle the keys are `frontend`, `backend` and `tests`; under the branch lifecycle they are whatever the backlog envelope's `repos` names. Give it in full, copied from the envelope |
| `models` | Required — pass `{}` to inherit the session model for both tiers. Each tier is optional: `heavy` (plan, implement, reviewers, verifiers, judge, fix, CI fix) and `light` (ticket, branch, baseline, ladder, land, PR, CI watch, merge, done) |
| `increments` | `null` to drain the backlog — the loop derives each id itself. Or a list of ids, built serially in the order given, as an explicit override |
| `stopAfter` | How many increments may **land** before the run stops: a positive integer, or `'all'`. It counts landings, not attempts |

A preflight `jq` against the resolved `backlog.json` runs before anything else: a workarea
with no readable backlog throws, naming the path it tried, rather than proceeding against
nothing.

### What drains the backlog, and what stops it

With `increments: null` the loop runs `tim backlog next <workarea> --json` in a one-command
agent before each increment and builds the id it names, reading `result.next` from the JSON
envelope. It goes round again after each landing, so one launch builds many increments and
the run outlives the session that started it. Resuming is launching it again with the same
args: `backlog.json` carries the status, ticket, branch and PRs, and the ticket stage
resumes an increment part-way through its lifecycle.

The run returns `{increments, stopped}`, where `stopped` is `{reason, detail}`. It stops:

- at **`count-reached`**, when `stopAfter` increments have landed — the ordinary ending;
- at **`no-buildable`**, when `tim backlog next` names nothing, or an explicit list is
  built out;
- at **`agent-budget`**, before starting an increment that would take the run past the
  `Workflow` tool's cap of 1000 agents. An increment is up to 36 agents on Claude and 42 on
  Codex, so a run fits roughly 27 or 23 of them. Nothing is wrong: launch again;
- at **`gate`**, when an increment carries a designed HALT-FOR-REVIEW gate. It lands first;
- at **any stage failure** — `baseline-red`, `implement-failed`, `ladder-red`, `ci-red`,
  `main-red` and the rest, each named in `../references/BUILD.md`.

**A failure stops the whole run.** The loop never moves on to another increment after one
goes wrong: `tim backlog next` selects on status and `dependsOn` alone, so a failed attempt
is still the next buildable increment, and carrying on would rebuild it or build on top of
it. The `not-landed` stop is the backstop for that — an id that comes back twice ends the
run.

`planOnly` needs an explicit `increments` list and refuses `null`. A plan does not change
what `tim backlog next` returns, so a `planOnly` drain would plan the same increment for
ever.

### Worked example — the plant-products/CHED-PP programme

```js
{
  workarea: 'shared/plant-products-ched-pp',
  branch: 'main',
  lifecycle: 'full',
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
  increments: null,
  stopAfter: 'all'
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

### The branch lifecycle

`lifecycle: 'branch'` builds a backlog straight onto one long-lived branch that already carries an open PR in
each repo, with no Jira and no merge. When to use it, what it never does and the stop reasons it adds are in
[`../references/BUILD.md`](../references/BUILD.md#branch-lifecycle). The stages differ from the full lifecycle
like this:

| Stage | Under `lifecycle: 'branch'` |
|---|---|
| Ticket | Does not run. No Jira call of any kind, anywhere in the run |
| Branch | Creates nothing. Asserts every repo in the envelope's `repos` (not only the row's) is on `branch`, clean, not mid-merge and fast-forwarded to its origin (`fetch`, then `merge --ff-only`), and that the envelope names exactly the configured repos. Reads the row's `repos`, `merge`, `gatePhases` and `awaitCi`, which the script checks: a merge into a repo the row does not build stops the run as `row-invalid` |
| Baseline, Ladder | Run only the row's `gatePhases` (all three when it has none; none for `[]`). A ladder without `e2e` does not fail for want of an end-to-end proof: that proof is another row's |
| Merge start | Runs only for a row with `merge`, between plan and implement. Fetches and runs `git merge --no-ff --no-commit <ref>` per repo, and reports the conflicted paths. The planner previews the same merge with `git merge-tree` and plans every resolution, reading a resolutions file where the row's notes point at one |
| Implement to ladder | Every stage is told the merge is in progress on purpose. Reviewers read `git diff --staged` as the merge result against the pre-merge HEAD, and judge the resolutions rather than what the merged ref brought. The branch guard never aborts a merge |
| Land | Commits each repo, concluding a merge as a real two-parent merge commit (never a squash), records the commit, then pushes with `git push origin refs/heads/<branch>:refs/heads/<branch>`, never `--force` |
| Pull request | Finds the one open PR for `branch` in each repo the row names, and records it. Never creates, edits, retitles, un-drafts or merges one. A repo with none stops the run as `no-open-pr` |
| CI | Reads `mergeable` and `mergeStateStatus` first, retrying while UNKNOWN: GitHub runs no checks on a PR that conflicts with its base, so a conflicting PR is a red (`pr-conflicting`), not an API failure. Then waits with `tools/github-actions/wait-for-pr-checks.sh`. A CI fixer commits onto `branch` and pushes the same way. A row with `awaitCi: false` skips this stage |
| Merge | Does not run |
| Done | `tim backlog set <workarea> <id> --status done --commit <sha>`. No ticket to move |

A failure after implement never commits to the shared branch. The preserve step saves the staged and unstaged
diffs, the unresolved paths and the status to `<workarea>/logs/<id>-preserve-<repo>.*`, aborts any merge in
progress with `git merge --abort`, stashes whatever is left, and records all of it in the row's `notes`. The tree
is clean for the next run, and nothing half-resolved ever reaches a reviewer.

A row with `repos: []` changes no backlog repo: its whole output is in the workspace repo, usually under
`workareas/`. The workspace is not a backlog repo, so the loop leaves those edits unstaged and uncommitted, reviews
them against HEAD, and lists them in the result's `leftUncommitted` for the orchestrator to commit. Such a row
normally also sets `gatePhases: []`.

The worked example for the frontend alignment sync:

```js
{
  workarea: 'shared/frontend-alignment/sync',
  branch: 'feat/NO_JIRA-frontend-alignment',
  lifecycle: 'branch',
  scope: 'frontend-alignment-sync',
  executor: 'claude',
  planOnly: false,
  jiraProject: null,
  epic: null,
  jiraInProgressStatus: null,
  jiraDoneStatus: null,
  jiraBoard: null,
  ciFixAttempts: 3,
  ciWatchMinutes: 30,
  requireApproval: null,
  approvalWaitMinutes: null,
  repos: {
    ins: { path: 'repos/trade-imports-ins-frontend', github: 'DEFRA/trade-imports-ins-frontend' },
    animals: { path: 'repos/trade-imports-animals-frontend', github: 'DEFRA/trade-imports-animals-frontend' },
    plants: { path: 'repos/trade-imports-plants-frontend', github: 'DEFRA/trade-imports-plants-frontend' },
    tests: { path: 'repos/trade-imports-animals-tests', github: 'DEFRA/trade-imports-animals-tests' }
  },
  models: {},
  increments: null,
  stopAfter: 'all'
}
```

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
