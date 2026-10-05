# The requirements-pipeline workflows

Two workflows, one per phase of the `requirements-pipeline` skill:

| Script | Phase | What it does |
|---|---|---|
| [`distil.js`](#distiljs) | DISTIL | Sources in, `backlog.json` and a report out |
| [`increment-build-loop.js`](#increment-build-loopjs) | BUILD | Builds the backlog, one increment at a time |

Point the `Workflow` tool at a file by `scriptPath` with an `args` object. Launching by
`name` runs a stale snapshot rather than what is on disk:

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/distil.js", args })
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/increment-build-loop.js", args })
```

## `distil.js`

The whole DISTIL phase, from the work list to the report. The main session keeps only
intake (writing `sources.json`, fetching Confluence pages, writing up rulings), answering the
report's questions with the user and saving the report. See
[`../references/DISTIL.md`](../references/DISTIL.md) for those, and for how to fold in a new
source or a ruling: edit `sources.json` and launch again.

The method each agent follows lives in brief files beside the script, in
[`distil/briefs/`](distil/briefs/): `extract.md` for every source, one
`extract-<kind>.md` per source kind (repo, confluence, web, document, trace, ruling, image),
`verify.md`, `reconcile.md` and `consolidate.md`. The report agent follows
[`../references/REPORT.md`](../references/REPORT.md). Every count, check, merge, file
clean-up and backlog comparison is a `tim distil` command, so no agent ever writes `jq` to
check another's file, runs `rm`, or copies a hash. A trace source's extractor and verifiers
run the trace CLI through `tim distil trace`, which works in the source's own folder, so no
prompt carries a `cd`.

**A workarea distilled by hand before this workflow** reads as stale on every source, because
its files carry no hashes. Adopt the sources that are still good with `tim distil adopt`
before the first launch: see
[`../references/DISTIL.md`](../references/DISTIL.md#adopting-a-programme-distilled-by-hand).

**The config.** Every key is required. A missing key stops the run before any agent starts,
and the first log line is the resolved configuration.

| Field | What it is |
|---|---|
| `workspace` | The workspace root as a tilde path, such as `~/git/defra/trade-imports-workspace`. A clone passes its own. Agents run every Bash command against it, and the status agent resolves its absolute form for the Read, Write and Edit tools |
| `workarea` | The programme's folder as a path under `workareas/`, holding `sources.json`, such as `shared/ins-performance-testing`. Never starts with `workareas/` |
| `only` | `null` to work every source that needs it. Or a list of source ids: only those are extracted and verified this launch. A listed source already verified is skipped, and the run stops before reconcile while any other source still needs work |
| `tim` | The command agents run tim with, normally `tim`. A clone passes its own, such as `npm --prefix ~/<clone>/tim run --silent tim --` |
| `models` | `{}` for the default on every tier. `think` (default opus): reconcile, consolidate, report. `code` (default sonnet): extract, verify. `light` (default haiku): status, the checks, merge, working set, coverage. `"inherit"` uses the session model |
| `verifyChunk` | The most claims one verify agent takes, such as 150. A 330-claim extract at 150 is verified by 3 agents in parallel, each writing its own part file |

The worked example for the INS performance testing programme:

```js
{
  workspace: '~/git/defra/trade-imports-workspace',
  workarea: 'shared/ins-performance-testing',
  only: null,
  tim: 'tim',
  models: {},
  verifyChunk: 150
}
```

### The stages

| Stage | Agents | What it does |
|---|---|---|
| Status | 1 light | Resolves the workspace root's absolute form and runs `tim distil status`: the work list. A source verified with an unchanged scope hash and an unchanged extract is skipped |
| Extract | 1 code, then 1 light check, per source | Only for a source whose next step is extract. The extractor follows `extract.md` and its kind's brief, writes `distil/extract/<slug>.json`, and stamps it with `tim distil stamp`. The check runs `tim distil check --stage extract --chunk <verifyChunk> --clear-parts`, which gives the verify ranges and removes old part files. A failed check sends the extractor back once with the problems, then the source fails |
| Verify | 1 code per range, then 1 light merge, per source | One verifier per range writes `distil/verify/<slug>.part<N>.json`. The merge runs `tim distil merge-verify`, which records the extract's hash, then `tim distil check --stage verify`. A failed merge re-runs the parts that failed or that a problem names (every part, if the check failed after the merge), once, then the source fails |
| Reconcile | 1 light, then 1 think and 1 light, up to 3 times | `tim distil working-set --write`, then the reconciler writes `requirements.json` and `conflicts.json`, and `tim distil coverage` checks them. Coverage scopes each problem `reconcile` or `backlog`; backlog problems are left for the consolidator. Up to 2 send-backs |
| Consolidate | 1 think and 1 light, up to 3 times | The consolidator writes `backlog.json`. The check runs `tim backlog check` and `tim distil coverage`, and on a re-distil `tim distil backlog-snapshot --compare-to before`. Up to 2 send-backs |
| Report | 1 think, twice at most | Drafts the report to `REPORT.md` and returns it as text for the main session to save. An empty answer is retried once |

Extract and verify run as one `pipeline()` over the work list: a source moves on to verify as
soon as its own extract checks out, and never waits for the others.

**A failed source stops the run before reconcile**, and so does one that `only` left for
later. Reconcile reads every source, so reconciling without one would leave its claims out
without anyone seeing. The result names each failed source with its problems. Launching again
retries it, and skips every source already verified.

**On a re-distil, rows built or set aside are held fixed by tim, not by trust.** The consolidator may rewrite `todo` and `blocked` rows: a blocked row has no code behind it, so a later ruling changes it. When
`backlog.json` exists, the coverage check after reconcile runs
`tim distil backlog-snapshot --save before`, which keeps every row id and every row that is
`done`, `deferred`, `dropped`, `rejected` or `merged-into` in `distil/backlog-snapshot.before.json`. The check after each consolidate runs
`--compare-to before`, which names every row removed and every such row changed. Each is sent
back to the consolidator as a problem.

### What it returns

```js
{
  workarea, stopped,     // stopped: null, or { reason, detail }
  sources,               // every source: outcome (verified, unchanged, failed, not-run) and its counts
  failed,                // the ids of the sources that failed
  requirements, conflicts, questions,   // from tim distil coverage; each question with its default
  backlog,               // { path, total, byStatus, covered }
  decisions,             // the reconciler's and consolidator's
  goalConflicts,         // rulings that contradict sources.json's goal: the main session corrects the goal
  report, reportPath,    // the report text, and where the main session saves it
  reportIssues           // what the report step found wrong with its inputs, kept out of the report
}
```

`stopped.reason` is one of `status-failed`, `unknown-source`, `sources-unverified`,
`working-set-failed`, `reconcile-failed`, `snapshot-failed`, `consolidate-failed` or
`report-failed`. Each carries whatever the run had worked out by then. What the main session
does for each is in [`../references/DISTIL.md`](../references/DISTIL.md#4-when-the-run-stops-early).

The script keeps the args contract every workflow keeps, and
`tim/src/backlog/workflow-contract.test.js` checks its config, its stages and its stops.

## The increment build loop

The workflow the `requirements-pipeline` skill's BUILD phase drives. Point the `Workflow`
tool at the file by `scriptPath` with an `args` object — see the worked example below.

**To run a backlog, follow the BUILD phase**
([`../references/BUILD.md`](../references/BUILD.md)). It builds the args once, launches this
loop by `scriptPath`, and reads the result — the loop derives its own next increment and
keeps going. This runs from the main session because **a subagent cannot invoke
`Workflow`**. That is why the former two-tier `batch-orchestrator/` prompts were removed:
their middle tier could never start the thing it existed to drive.

Both scripts keep the args contract every workflow script in the workspace keeps — see
[`.claude/workflows/README.md`](../../../workflows/README.md#the-args-contract) — and
`tim/src/backlog/workflow-contract.test.js` checks it here as well as there.

### `frontend-alignment.js`

Kept as a reference only, at
[`workareas/shared/frontend-alignment/frontend-alignment.reference.js`](../../../../workareas/shared/frontend-alignment/frontend-alignment.reference.js)
— not runnable, and deliberately outside every workflow folder so it does not trip the
workflow-contract test's `FALLBACK` check. It drove the design demonstration that brought
`trade-imports-ins-frontend` into shape against the two journey frontends, stage by stage;
its plan stage was lifted into `increment-build-loop.js` below.

### `increment-build-loop.js`

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
| `executor` | `claude` or `codex`, under either lifecycle — see below |
| `planOnly` | `true` writes each increment's plan and stops — no ticket, branch, baseline or build. `false` for a real run |
| `jiraProject` | Jira project key raised tickets land in. `null` under the branch lifecycle |
| `epic` | Parent epic every raised ticket hangs off. `null` under the branch lifecycle |
| `jiraInDevStatus` | The board's working status, set when the build starts. `null` under the branch lifecycle |
| `jiraDoneStatus` | The board's finished status, set after the merge. `null` under the branch lifecycle |
| `jiraBoard` | Numeric id of the board raised tickets are moved onto — 13780 is EUDPA. `null` under the branch lifecycle |
| `ciFixAttempts` | How many times a red PR may be fixed and re-pushed before the run stops |
| `ciWatchMinutes` | How long one CI watch may block before it counts as RED |
| `requireApproval` | Whether *every* PR of an increment needs an approving review on GitHub before the merge stage may merge *any* of them. `null` under the branch lifecycle. A single repo can need approval on its own instead — see [The workspace repo as one of the repos](#the-workspace-repo-as-one-of-the-repos) |
| `approvalWaitMinutes` | How long the merge stage may wait for those approvals before it stops and leaves every PR open. `null` under the branch lifecycle |
| `repos` | The backlog envelope's `repos` map, whatever its keys, under either lifecycle: a workspace-relative `path` and a GitHub `github` slug per key, each key a lower-case word, and an optional `requireApproval: true` for a repo whose PR a person must approve. Under the full lifecycle the key `workspace` at path `.` is the workspace repo itself; under the branch lifecycle `workspace` is refused. Give it in full, copied from the envelope. The preflight stops the run before the first increment when a key, path, slug or `requireApproval` differs from the envelope's |
| `models` | Required. Pass `{}` for the recommended default on every tier (it does not inherit the session model). Three tiers, each optional. `think` (default opus) plans and judges: plan, judge, the consistency reviewer. `code` (default sonnet) writes and repairs code: implement, the per-group style and code reviewers, the finding verifiers, fix, the ladder, CI fix. `light` (default haiku) runs a command and reports what it said: everything else (start, branch, branch guard, merge start, baseline, land, preserve, the run's stack lease take and give-back, PR, CI watch, merge, done, and the Codex shell and relay). A tier left out takes its default; set it to `'inherit'` to use the session model instead. `heavy` is a deprecated alias that sets both `think` and `code` together, unless the programme also gives one of those its own value |
| `increments` | `null` to drain the backlog — the loop derives each id itself. Or a list of ids, built serially in the order given, as an explicit override |
| `stopAfter` | How many increments may **land** before the run stops: a positive integer, or `'all'`. It counts landings, not attempts |

A preflight `jq` against the resolved `backlog.json` runs before anything else: a workarea
with no readable backlog throws, naming the path it tried, rather than proceeding against
nothing. The same preflight reads the envelope's `repos`, and the script throws when the args
name a repo the envelope does not, the envelope names one the args do not, or a key sits at
another path or slug. It runs for `planOnly` too, so a dry run proves the args before the
planner starts. A backlog whose envelope has no `repos` is logged and let through; its gate
goes red at the baseline instead.

### Merge order

The script sorts an increment's PRs before the merge stage sees them, because the order the PR
stage raised them in is an accident:

- **Keys exactly `frontend`, `backend` and `tests`:** backend, then tests, then frontend,
  whatever the row lists — the rule every programme built before other keys existed.
- **Any other keys:** the order of the row's `repos` list, which the backlog writes provider
  before consumer — a service before the frontend that calls it, a stub before the service that
  calls it, and a tests or performance-tests repo after every service it exercises. The ticket
  stage copies it as written; the planner returns its `repos` in the same order and says under
  `risks` where the row's order puts a consumer first. A PR in a repo the row does not name
  merges last.
- **The workspace repo** merges after every other PR, wherever the row lists it, even after a
  CI fixer's PR in a repo the row does not name. It is never deployed and nothing on the base
  branch consumes it, but the next increment runs on it, so the factory changes only once
  everything built alongside it has merged, and a stop part-way leaves it as it was.

`frontend-change` is routed by what a repo is, not by its key: the planner and implementor are
sent to it only for a configured repo at `repos/trade-imports-animals-frontend` or
`repos/trade-imports-plants-frontend`, and a programme with neither never hears of it.

### What drains the backlog, and what stops it

Under the full lifecycle each increment starts with one `tim build start` call (see
[The start stage](#the-start-stage)), which with `increments: null` derives the next
buildable increment itself. Under the branch lifecycle a one-command agent runs
`tim backlog next <workarea> --json` instead. Either way the loop builds the id that comes
back and goes round again after each landing, so one launch builds many increments and the
run outlives the session that started it. Resuming is launching it again with the same
args: `backlog.json` carries the status, ticket, branch and PRs, and the start stage
resumes an increment part-way through its lifecycle.

The run returns `{increments, stopped}`, where `stopped` is `{reason, detail}`. It stops:

- at **`count-reached`**, when `stopAfter` increments have landed — the ordinary ending;
- at **`no-buildable`**, when `tim backlog next` names nothing, or an explicit list is
  built out;
- at **`agent-budget`**, before starting an increment that would take the run past the
  `Workflow` tool's cap of 1000 agents. An increment is up to 38 agents on Claude and 44 on
  Codex, so a run fits roughly 26 or 22 of them. Nothing is wrong: launch again;
- at **`gate`**, when an increment carries a designed HALT-FOR-REVIEW gate. It lands first;
- at **`stack-held`**, when somebody else holds the workspace stack: before any increment,
  when the run cannot take its lease, or part-way through one, when a stage finds the stack
  is no longer the run's (see [The workspace stack lease](#the-workspace-stack-lease)). A
  human rules on the holder;
- at **`stack-failed`**, before any increment, when the run cannot start the workspace stack;
- at **`land-leaked`**, when the land stage's workspace commit holds a file the workspace
  carried in, or run state under `workareas/` no stage reported changing. Nothing is pushed;
- at **`workspace-not-on-base`**, after an increment that built in the workspace repo has
  landed, when the workspace will not go back onto the base branch;
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
  jiraInDevStatus: 'In Dev',
  jiraDoneStatus: 'Done',
  jiraBoard: 13780,
  ciFixAttempts: 3,
  ciWatchMinutes: 30,
  requireApproval: false,
  approvalWaitMinutes: 20,
  repos: {
    frontend: { path: 'repos/trade-imports-animals-frontend', github: 'DEFRA/trade-imports-animals-frontend' },
    backend: { path: 'repos/trade-imports-animals-backend', github: 'DEFRA/trade-imports-animals-backend' },
    tests: { path: 'repos/trade-imports-ins-tests', github: 'DEFRA/trade-imports-ins-tests' }
  },
  models: {},
  increments: null,
  stopAfter: 'all'
}
```

That resolves to `workareas/shared/plant-products-ched-pp/backlog.json` and lands commits
as `feat(plant-products): <increment title>`. Any other workarea works the same way, with its
envelope's own keys: the INS performance-testing backlog passes

```js
repos: {
  perftests: { path: 'repos/trade-imports-performance-tests', github: 'DEFRA/trade-imports-performance-tests' },
  stub: { path: 'repos/trade-imports-stub', github: 'DEFRA/trade-imports-stub' },
  idstub: { path: 'repos/trade-imports-defra-id-stub', github: 'DEFRA/trade-imports-defra-id-stub' },
  insfrontend: { path: 'repos/trade-imports-ins-frontend', github: 'DEFRA/trade-imports-ins-frontend' },
  animalsfrontend: { path: 'repos/trade-imports-animals-frontend', github: 'DEFRA/trade-imports-animals-frontend' },
  plantsfrontend: { path: 'repos/trade-imports-plants-frontend', github: 'DEFRA/trade-imports-plants-frontend' },
  referencedata: { path: 'repos/trade-imports-reference-data', github: 'DEFRA/trade-imports-reference-data' },
  gateway: { path: 'repos/trade-imports-dynamics-gateway', github: 'DEFRA/trade-imports-dynamics-gateway' }
}
```

and an increment that touches six of them gets a branch, a commit, a PR and a CI watch in each
of the six, merged in its row's order.

### The workspace repo as one of the repos

Under the full lifecycle a programme can change the workspace repo itself — tim, `gates.json`,
the stack scripts, docs — and the loop builds it like any other repo: ticket, branch, review,
gate, PR, CI and merge. Its `repos` entry is

```js
workspace: { path: '.', github: 'DEFRA/trade-imports-workspace', requireApproval: true }
```

`workspace` is the only key allowed at `.`, and `.` the only path allowed for it. gates.json
knows the repo as `trade-imports-workspace`: its rungs run tim's format check, lint and unit
tests, and both E2E suites list it, because the workspace owns the stack they run against.

**`requireApproval` on a repo.** A repo whose entry sets `requireApproval: true` needs an
approving review on its PR before the merge stage merges **any** PR of the increment. The merge
stage lists those PRs under NEEDS APPROVAL and runs the same whole-increment approval sweep as
the run-level gate, on them alone: still unapproved after `approvalWaitMinutes`, it stops at
`awaiting-approval` with every PR left open. A repo without it merges on green. The run-level
`requireApproval: true` still gates every PR. `tim build start` lists the repos that need
approval in its result. The script matches each PR to its repo key by the PR's url against the
configured `github` slugs, never by the name a stage reports, and a PR it cannot match counts as
needing approval: the run stops at `pr-repo-unknown` before anything merges.

**What never rides in a workspace commit.** The workspace is never clean: it carries the run's
backlog, plans and logs under `workareas/`, and often somebody's work in progress. `tim build
start` carries those files across the switch to the increment branch and writes every one of
them to `workareas/<workarea>/logs/<id>-carried.txt`. Its one JSON line stays small however
dirty the workspace is: `preexistingDirty` names the carried files outside `workareas/` (at most
50), and `preexistingDirtySummary` counts those and the ones under `workareas/` and gives the
file as `listedIn`. Hundreds of other programmes' files under `workareas/`, once listed in
full, ran that line past what the start agent can copy back, and the run stopped at
`derive-failed` with the ticket and branch already made. Every stage is told the carried files
are not the increment's, by name or by count and file, and so is everything under `workareas/`
the row does not name. The land stage stages and commits in the workspace by explicit path
only, with a pathspec on the commit so nothing somebody else staged goes in. Then a light agent
copies, word for word, what `git log --name-only --format= origin/<base>..HEAD` prints in the
workspace, and the script checks that list itself, never the land agent's account: a carried
file, or run state no stage reported changing, stops the run at `land-leaked` before anything
is pushed, and so does a list it cannot read. A committed path the start result could not name
— run state a stage did report changing, or, when more than 50 were carried outside
`workareas/`, any other path — is looked up in the carried-files list by a second light agent
(`grep -Fx`), and leaks if it is there; a lookup that fails stops at `land-leaked` too. A CI fixer is given the same rules for
the workspace whenever it may touch it, whether or not the increment builds there.

**Changing the factory mid-run.** While the workspace is on the increment branch, a change to
tim, `gates.json` or the stack scripts takes effect at once: every later tim call and gate run
in that increment uses the branch's copy, and the gate re-ups the stack when `docker/stack` or
`scripts/stack` changed. A change to this loop script takes effect from the **next launch**
only, because a running loop never re-reads it. Stages are told never to edit the loop script
unless the row names it, and a planner says so under `risks` when it does.

**Back to the base branch.** Once the increment has merged and its ticket has been closed
(or failed to close), a light agent switches the workspace to the base branch and fast-forwards
it with `git pull --ff-only`, carrying its uncommitted files, so the next increment runs on the
merged factory. It never stashes, resets or commits. If it cannot, the run stops at
`workspace-not-on-base`. An increment that stops before it merges — `awaiting-approval`,
`ci-red`, `ladder-red` and the rest — leaves the workspace on the increment branch, because the
programme files travel with it, and `stopped.detail` says so and gives the command to put it back.

**An increment that leaves the workspace out.** The workspace stays where it is and no stage
treats its uncommitted files as changes. A plan that would write in it, `openspec/` included,
needs `workspace` among the row's repos: the planner refuses without it, and the land stage
refuses to commit a spec change rather than put it on the base branch with no review.

### The stages, per increment

| Stage | Agents | What it does |
|---|---|---|
| Start | 1 light | Full lifecycle only. Runs `tim build start` once and copies the JSON line it prints, which the script reads: derive, ticket and branch in one deterministic call. See [The start stage](#the-start-stage) |
| Baseline | 1 | Refuses a dirty tree, then runs `tim build gate --phase all` once — unit, FIT and E2E side by side — into `logs/<id>-baseline/` and reports each rung as tim printed it. A branch-lifecycle row that owes only some phases runs those one at a time and stops at the first red. Baseline green is gate green, so any later red is unambiguously ours |
| Plan | 1 | Reads the row, the live tree, the nearest exemplar and the standards `tim backlog standards` resolves for the files, and follows a repo's recipe (`frontend-change` for a frontend journey change). Writes `plans/<id>.md`: decisions, moves, edits, new files, tests with the integration proof, checks per acceptance criterion, the increment-specific checks beyond the gate, out of scope. Lifted from `frontend-alignment.js` |
| Implement | 1 | Executes the plan, across every repo the slice needs. Stages, never commits. Checks itself with `tim build gate --phase unit` and `--phase fit` (Codex: unit only); uses the workspace stack as the run's lease left it, and never starts or stops it |
| Review | 2g+1 at most (Claude) | Codex runs `g + 1` reviews at the same granularity — see Executors. Under Claude: one style reviewer and one code reviewer **per (repo, language) group** of changed files — `g` groups, typically 2–6 — plus a consistency reviewer across the whole change. Docs (`.md`, `.json`, `.yaml`) get a code reviewer but no style reviewer. A group over 12 files splits into near-equal parts |
| Verify findings | 1 per group with findings | Adversarial refutation, grouped the same way — each finding must survive an agent actively trying to kill it |
| Judge | 1 | Replaces the skills' interactive `WALKER`. Rules each surviving finding fix-now / defer / reject **without asking a human** |
| Fix | 1 | Applies only what the judge ruled fix-now. Checks itself with the gate's unit and FIT phases, like the implementor |
| Ladder | 1 | Runs `tim build gate --phase all` once into `logs/<id>-ladder/` (a row that owes only some phases: each of those, every one even after a red), then the plan's sections 5 and 6 checks. Given the implementor's and fixer's notes and every baseline rung with its log |

**The gate owns the repos' own rungs.** `tim build gate` runs the
rungs `references/gates.json` lists for each backlog repo — format check, lint, typecheck,
unit, `mvn verify`, FIT after a free-port check, and the tests repo's local-stack E2E. Every
gate command passes the run's holder with `--holder`, so its E2E phase reuses the stack the
run already holds, rebuilding only what changed, and refuses a stack anybody else holds. No
agent picks those scripts. The ladder
compares every red rung with the baseline rung of the same repo and name: every one was green
at baseline, so a red one is this increment's to repair or diagnose. After a repair it re-runs
the red phase, and the unit phase too, then the plan's checks.
| Land | 2–3 | A branch guard first: every repo must be on the run's branch, and one on another branch at the same commit is moved back. Then commits on green and records the commit. The increment is not done until its PRs are merged, so the merge stage is what marks it. A red ladder, a failed land, a repo that cannot be moved back, or any other stop after implement goes through the same preserve step — a pushed wip commit — so the tree is left clean and the attempt recoverable |

### The start stage

Under the full lifecycle one light agent runs

```
tim build start <workarea> [--id <id>] [--last <id>] --base <branch> --jira-project <key> --epic <key> \
  --in-dev-status "<status>" --done-status "<status>" --board <id> --repos <the args' repo keys> \
  --workspace <root> --json
```

and copies the one JSON line it prints, word for word. The script reads it, so no agent
retells a failure: it replaced the separate derive, ticket and branch agents, whose
summaries had reported a config mismatch as "a Jira synchronisation issue". `--id` is the
listed id under an explicit `increments` list; draining passes none and tim derives the next
buildable row. `--last` is the id the previous attempt built: met again, tim stops before the
ticket and the loop stops at `not-landed`. In order, tim:

1. **derives** the increment;
2. **tickets** it: reuses the key on the row, or an open ticket under the epic with this
   increment's exact summary (one a create that timed out raised without the key being
   recorded), or raises a Task under the epic, its description
   templated in Jira wiki markup from the row's title, detail, acceptance criteria and sources,
   and records the key on the row at once so a retry never raises a second; moves a status
   other than `jiraInDevStatus` there by exact name (one already at `jiraDoneStatus` is left
   alone, with a warning the loop logs); and moves it onto `jiraBoard`, every time;
3. **branches** it: the row's branch, or `<type>/<KEY>-<slug>` recorded on the row, in each of
   the increment's repos (a row that names none takes every repo, in the args' order),
   checked out and fast-forwarded where it exists, tracked where only
   origin has it, or cut `--no-track` from a freshly fetched `origin/<base>`. A branch that
   exists locally with no commits of its own, pushed or not, is also fast-forwarded to
   `origin/<base>` when the base has moved on, so the increment never builds on a stale base;
   its entry in `branched` says `caughtUpToBase: true`. A branch with commits of its own is
   left as it is: never rebased, never merged into. A repo with uncommitted work stops it
   before any repo changes, except the workspace repo, whose uncommitted files travel across
   the switch and the fast-forward; one that either would overwrite stops it, naming the
   files. An upstream on another branch is removed.

It reports `resumeAt` from the row's `commit` and `prs`, never from the ticket's status. The
script maps a failed step to the stop reasons it always had: `derive-failed`, `no-buildable`,
`ticket-failed` (also when tim does not report the ticket on the board) and `branch-failed`.
The workspace resolve and the preflight's envelope-against-args check stay in the script.

### The workspace stack lease

The workspace stack is one compose project per machine, and the run holds it for its whole
length under one lease. The holder is the run id, `ibl-<the time the workspace agent read>`,
so a resumed run keeps it.

1. **At the start**, after the preflight and before the first increment, a light agent runs
   `tim docker lease acquire --holder "<run id>" --mode dev`, which starts the stack from
   local source. A `planOnly` run builds nothing and takes no lease.
2. **Every increment reuses it.** The stack stays up across every increment. Every gate
   command — baseline, implementor, fixer, ladder and the Codex unit phase — passes
   `--holder "<run id>"`, so the gate's E2E phase uses the stack the run holds and rebuilds
   only what changed. A plan check that needs the stack runs against it as it is. No stage
   takes or gives back a lease, or starts, stops or rebuilds the stack. A check that cannot
   reach it runs `tim docker lease status` once to see whether the lease is still the run's.
3. **At the end**, whatever stopped the run — a thrown error included — a light agent runs
   `tim docker lease release --holder "<run id>"`, which takes the stack down and clears the
   lease. If that fails, the run's `stopped.detail` says so and gives the command.

`acquire` starts a stack that is down and records its container ids in the lease. It reuses a
stack the same holder leases only when that start finished and the containers are still the
ones it recorded; a start of its own that died part-way is taken down and started again. It
refuses a stack leased to anybody else, up with no lease at all (one somebody started by
hand), or restarted by hand under the lease (other container ids), naming the holder, its
mode and its branches, and never takes such a stack down. A stale lease is taken over under
a lock, so two processes never both start the stack. While a lease is held,
`tim docker up|dev|down|restart|bounce-backend` refuse unless given `--force`, which the loop
never passes.

The script rules on anybody else holding the stack:

- **At the start**, a refused acquire stops the run at `stack-held` before any increment,
  naming the holder, and gives nothing back. A start that fails stops it at `stack-failed`,
  and the end-of-run release clears whatever the failed start left.
- **Part-way through**, a stage whose gate reports `result.stack.held`, or whose lease check
  finds the lease gone or someone else's, returns `stackHeld` and runs nothing more that
  needs the stack. The run stops at `stack-held`, naming the holder, for a human ruling. A
  stop after implement goes through the preserve step like any other.

**A run that dies leaves its lease behind.** The release runs on every way out of the
script, but not when the `Workflow` run itself is killed, the session ends or the machine
restarts mid-run. The stack is then still up, leased to the dead run, and the next run
stops at `stack-held` naming it. Check with `tim docker lease status`, then give it back
yourself:

```
tim docker lease release --holder "<run id>"
```

Plans may name a check that needs the stack, marked "needs the workspace stack"; the stage
that runs it uses the run's stack. The integration proof is still the gate's E2E rung.

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
`<branch>` / `<INCREMENT_ID>` / `<repos>` placeholders that the loop binds to real values in that prompt.
`<repos>` is every configured repo as `<key>=<absolute path>`, so the briefs name no repo of their
own and run under either lifecycle, whatever the keys. Under the branch lifecycle a Codex stage
is also told about a merge in progress and a row that changes no backlog repo, and `<gateUnit>`
is bound to `none` for a row whose `gatePhases` leave out unit.

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
| Start | Does not run. No Jira call of any kind, anywhere in the run. A drain derives each id with `tim backlog next` in a one-command agent |
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
  jiraInDevStatus: null,
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
    tests: { path: 'repos/trade-imports-ins-tests', github: 'DEFRA/trade-imports-ins-tests' }
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

### Run telemetry

After a run stops, the session archives and reports it with `tim build runs archive <runId>`
then `tim build runs report <runId>` (see `../references/BUILD.md`, step 3c). The report
reads what Claude Code already writes: one transcript per agent, `journal.jsonl` (a
`started` line with each agent's `label` and `phase`, then a `result` or `failed` line) and
the run's record (args, `log()` lines, result and per-agent progress), which is written only
when the run ends.

What the loop should change, in a run that is not in flight, to make that data richer:

- **One label shape for every agent: `<id> <stage>[:<group>][ <attempt>]`.** The report
  recovers increment and stage from the label alone. `codex:<slug>` and `relay:<slug>` hide
  which stage they did the work for — label them `<id> <stage> codex:<slug>`. `preserve` and
  `branch-guard:<stage>` sit in whichever phase called them; give them their own phase.
- **An increment on every agent that serves one.** `derive next` runs once per increment
  but carries no id, so its cost lands on the run, not the increment it chose.
- **Log lines with times and a fixed shape.** `log()` lines reach only the run's record,
  never `journal.jsonl`, and the record is written at the end — a killed or still-running run
  has none. Log `<id>: START` and `<id>: <OUTCOME>` with an ISO time, as one JSON object per
  line, so an increment's wall time includes the script's own time between agents.
- **Codex's own usage.** Under `executor: codex` the relay agent's transcript shows only
  Claude's tokens. Have the Codex brief return its token counts and duration in the stage's
  schema so the report can add them.
- **The model tier per agent.** Record whether an agent ran as `think`, `code` or `light` in
  its label or phase, so cost per tier can be compared when the model map changes.
- **Archive as the last step.** Once the run can name its own run id, finish with
  `tim build runs archive <runId>` so no run is lost to `cleanupPeriodDays`.
