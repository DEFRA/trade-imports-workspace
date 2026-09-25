# BUILD phase

The second phase of the `requirements-pipeline` skill. Runs
[`../workflow/increment-build-loop.js`](../workflow/increment-build-loop.js) over
a backlog the DISTIL phase ([`DISTIL.md`](DISTIL.md)) wrote, from **the session
you are in**. There is no orchestrator tier below you and no subagent between
you and the loop.

## Why there is only one tier

An earlier design put two orchestrators above the loop, so that a subagent could
absorb the diffs and test logs and then die with them. **It does not work: a
subagent cannot invoke the `Workflow` tool**, so the middle tier could never
start the thing it existed to drive.

It was also solving a problem that had already been solved. The loop's own
`agent()` calls are the death boundary — every one of them lives and dies inside
the workflow, and the session that invoked it absorbs only the return value.
Your context grows by one short result per run, however many increments the run
built.

**The loop derives its own next increment.** It asks `tim backlog next` after
each one lands and keeps going until `stopAfter` increments have landed or
something stops it, so a run outlives the session's attention rather than
needing a turn per increment. You build the args once, launch once, and read the
result.

## PARAMETERS

The user gives the workarea and the epic. Everything else is worked out or
defaulted. Never ask for a value the list below says how to derive.

```
workarea      path under workareas/ holding backlog.json, e.g. shared/my-programme
lifecycle     full (default) | branch. branch builds onto one existing
              long-lived branch with no Jira and no merge: see "Branch
              lifecycle" below. Use it only when the user names such a branch
branch        full: the BASE branch every increment cuts its own off and
              merges back into. Default main.
              branch: the WORKING branch itself, the one the user named.
              Never main or master
scope         conventional-commit scope for landing commits. Default the
              backlog envelope's `programme`
executor      claude (default) | codex
stopAfter     how many increments may LAND before the run stops. A positive
              number, or "all". Default 1, or the count the user names ("the
              next 3"). It counts landings, not attempts
increments    null to drain the backlog, which is the normal run. A list of ids
              only where the user named exactly what to build
jiraProject   default EUDPA
epic          parent epic every raised ticket hangs off. The one thing
              a run must be told
inProgress    the board's working status. Read it from the board's
              transitions (below) rather than asking
doneStatus    the board's finished status, the same way
board         numeric id of the board tickets are moved onto. 13780 is
              EUDPA. Default 13780
requireApproval      whether EVERY PR of an increment needs an approving review
              on GitHub before the loop merges ANY of them, on top of the
              multi-agent review, adversarial verification and judge every
              increment already goes through.
              Default false
approvalWaitMinutes  how long the merge stage waits for those approvals before
              stopping with every PR open. Default 20
repos         where frontend, backend and tests live: a workspace-relative path
              and a GitHub owner/name slug each. Take it from the backlog
              envelope's `repos`, which DISTIL wrote:
                jq '.repos' workareas/<workarea>/backlog.json
              Ask only when that prints null (a backlog older than the field).
              Never type it from memory and never default to the animals repos:
              the same three keys name different repos in different
              programmes, and a path typed from memory is how a plants
              increment ends up built in the animals frontend
models        {} for the recommended split, pass that unless the user asks
              for something else. Three tiers, each optional. think (default
              opus) plans and judges: plan, judge, the consistency reviewer.
              code (default sonnet) writes and repairs code: implement, the
              per-group style and code reviewers, the finding verifiers, fix,
              the ladder, CI fix. light (default haiku) runs a command and
              reports what it said: everything else. A tier left out takes
              its default; 'inherit' uses the session model instead. heavy is
              a deprecated alias for setting think and code together
```

A `lifecycle: 'full'` run goes ticket → branch → build → PR → CI → merge → ticket
done. A `lifecycle: 'branch'` run goes branch check → build → push → find the
open PR → CI → done, and passes every Jira key, `requireApproval` and
`approvalWaitMinutes` as `null` ([Branch lifecycle](#branch-lifecycle)).

**This skill passes `requireApproval: false` unless the user asks otherwise,
and that is the point.** The workflow itself has no default for this key —
a run without it stops before any agent — so this default is something the
skill supplies, not something the loop falls back to. By the time an
increment reaches the merge stage it has already been
through a style reviewer and a code reviewer per (repo, language) group, a
consistency reviewer across the whole change, an adversarial verifier that
tries to refute every finding, and a judge that rules every survivor
fix-now, defer or reject, without a human in the loop. **That multi-agent
review, verification and judgement IS the review.** A GitHub approving
review on top of it is a second, *human* gate, and a run that has to stop
and wait for one cannot run 24/7 — which is the whole point of this loop.

Set `requireApproval: true` when a programme genuinely wants that second,
human gate in front of every merge — a run built for a colleague to review
before anything lands, say, or a programme still earning trust in the loop.
With it on, every PR of an increment needs an approving review on GitHub
before the merge stage may merge any of them, and the loop's whole-increment
approval sweep, `awaiting-approval` and `changes-requested` stops (below)
apply exactly as they always have. Because GitHub refuses to let an author
approve their own PR, the approver is always **somebody other than whoever
the run is credentialed as**, so a run under `requireApproval: true` is not
unattended: it will stop and wait for a colleague, and a large `stopAfter`
will likely hit that wait at the very first increment — say so when a user
asks for one. **To get the old (human-gated) behaviour back, pass
`requireApproval: true` explicitly.**

**The gate, when it is on, covers the whole increment, not one PR at a
time.** The merge stage collects an approval for every PR before it merges
any of them, so a reviewer who approves the frontend and leaves the tests
repo waiting no longer gets half an increment on `main`. Tell a reviewer
they owe the increment *all* of its PRs — approving one of two is the same
as approving neither.

**Confirm the two status names against the board before the first increment.**
They are board configuration, not constants, and a wrong one stops every
increment at the ticket stage:

```bash
tools/jira/transition-ticket.sh <ANY-EXISTING-KEY> --list
```

Do not take a status name from a script's `--help` text — that is generic
placeholder wording, not this board's workflow.

**A raised ticket lands in the board's backlog, and no status gets it out.**
Board membership is not a field on the issue and is not implied by status — two
tickets identical in every field sit one on the board and one in the backlog.
So the ticket stage moves it with `tools/jira/move-to-board.sh <board> <KEY>`
after it sets the working status, and reports `movedToBoard`. The loop treats a
false there as `ticket-failed`, because a ticket the team cannot see on a run
that otherwise looks clean is the failure worth catching loudly. The call is
idempotent, so it runs on reused tickets too.

## Before the first increment

1. **Raise the workflow size limit** — `/config` → *Dynamic workflow size*. One
   increment is 23–35 agents on Claude and 29–41 on Codex, against a default guideline of 15. You cannot set
   this for the user and the run is throttled without it. The tool's own hard
   cap of 1000 agents per run is what `agent-budget` below stops at, around 27
   increments on Claude and 23 on Codex.
2. **Pull the workspace repo.** `backlog.json` is the state.
3. **Check the backlog's shape:** `tim backlog check <workarea> --json`. It checks the
   one shape defined in [`backlog.schema.json`](backlog.schema.json), with the rules
   in [`SHAPE.md`](SHAPE.md): each row a requirement (what,
   why, acceptance), never a recipe. The loop plans the how itself, just in time,
   into `<workarea>/plans/<id>.md`. A backlog written before that shape existed may
   fail on recipe fields; the loop still reads it, treating those fields as hints,
   so report the failures and carry on. Do not rewrite another programme's backlog.
4. **Check the gate covers every repo the programme builds.** Branching needs
   nothing from you — the loop's Branch stage cuts each increment's branch off a
   freshly fetched base, in the increment's repos only.

   The loop's gate is `tim build gate <workarea> [--phase unit|fit|e2e|all]`: the
   rungs in [`gates.json`](gates.json), per repo, in order — unit, then FIT with
   a free-port check, then E2E against the workspace stack built from local
   source. It starts the stack for E2E only if it was down and stops only what it
   started. Every rung writes to its own log, a rung that cannot run fails with
   its reason, and the command exits 1 unless every rung passed. The baseline and
   the ladder each run it one phase per call (each phase fits a ten-minute Bash
   window) into `<workarea>/logs/<id>-baseline/` and `<workarea>/logs/<id>-ladder/`;
   the implementor and fixer run its unit and FIT phases to check themselves. No
   agent picks a repo's test scripts or starts or stops the stack. It reads the
   repos from the backlog envelope's `repos` map, so a backlog without one goes
   baseline-red until it has one. Add a repo's rungs to `gates.json`
   before the first increment that builds it; the gate fails a repo it has no
   rungs for.
5. **Read `<workarea>/PROGRAMME-NOTES.md` if it exists.** It carries standing
   rulings, a do-not-build list and any ordering the programme imposes. Re-read
   it if the run is long; do not carry a stale copy in your head.

## THE RUN

Build the args, launch once, read the result. The loop does the repeating.

### 1. What the loop derives for itself

You do not pick the increments. With `increments: null` the loop runs

```bash
tim backlog next <workarea>
```

itself, after each increment lands, and builds whatever id comes back. That is
what lets one launch build many: a list chosen in advance throws away everything
the first increment teaches, and a run that needed a turn from you per increment
died whenever the session did.

**Buildability is status and dependencies. Nothing else.** The six withheld
statuses (`done`, `deferred`, `dropped`, `blocked`, `rejected`, `merged-into`)
are named explicitly and everything else counts as buildable, so an
unknown status fails **loudly** — it gets picked up and you see it — rather than
silently vanishing from the count. That direction matters: a query that reports
zero buildable work reads exactly like a finished backlog, which is the
expensive way to be wrong.

`dropped` is a settled human rejection and `blocked` is a deferred decision.
Neither becomes buildable because a dependency landed. "Never build this" lives
in the status, not in prose — if a programme's do-not-build list in
`PROGRAMME-NOTES.md` is long, that is a smell worth raising, because those
increments should carry a withheld status instead.

**Nothing gates on how planned an increment looks.** A backlog says what is
wrong, what it cites as evidence and whether anyone has ruled on it. Working out
what to change is the loop's plan stage. So:

- Do not add a planning field for the query to read.
- Do not withhold an increment because it reads thin.
- Do not write a plan into the backlog to make one look ready.

A thin increment is buildable and gets built. **Thin is fine; wrong is not** —
what a thin increment still owes you is a claim that holds up.

Read `PROGRAMME-NOTES.md` before you launch, for a do-not-build list and any
imposed order. The loop cannot see it: anything it must not build needs a
withheld status on the row, and anything that must come first needs a
`dependsOn`. Array order is the right default, not a rule.

### 2. Launch it

**Never edit `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js`
during a run.** It is tracked and
shared by every programme.

Configuration goes only in `args`, as a JSON object. The loop parses a JSON
string too, but it has no defaults of its own: a missing key stops the run
before any agent starts, naming every key that is missing. Every value below
— including the ones PARAMETERS calls a default — is something **this skill**
writes into `args` for you; the workflow itself carries none of them.

Build the args object with every key below:

```js
{
  workarea: '<workarea>',
  branch: '<branch>',
  lifecycle: 'full', // 'branch' only for a run onto an existing branch: see "Branch lifecycle"
  scope: '<scope>',
  executor: '<executor>',
  planOnly: false, // true writes <workarea>/plans/<id>.md and stops: a dry run to see how it would be built
  jiraProject: '<jiraProject>',
  epic: '<epic>',
  jiraInProgressStatus: '<inProgress>',
  jiraDoneStatus: '<doneStatus>',
  jiraBoard: 13780, // the EUDPA board. Another programme's board is another id
  ciFixAttempts: 3,
  ciWatchMinutes: 30,
  requireApproval: false,
  approvalWaitMinutes: 20,
  repos: {
    frontend: { path: 'repos/<frontend repo>', github: 'DEFRA/<frontend repo>' },
    backend: { path: 'repos/<backend repo>', github: 'DEFRA/<backend repo>' },
    tests: { path: 'repos/<tests repo>', github: 'DEFRA/<tests repo>' }
  },
  models: {}, // {} for the recommended split (think opus, code sonnet, light haiku); pass that unless the user asks for something else
  increments: null, // null drains the backlog. A list only where the user named the ids
  stopAfter: '<a positive number, or "all">'
}
```

Then wrap that object as `args`, launching by `scriptPath`:

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/increment-build-loop.js", args: <the object above> })
```

**One launch. Never one per increment.** Change nothing else in `args`. Write
`repos` out in full every time, copied from the backlog envelope's `repos`: the
loop has no repos table of its own any more, so a missing `repos` stops the run
before any agent starts.

`stopAfter` is what ends an ordinary run, so write it in explicitly too. Pass
`"all"` only when the user asked for the whole backlog; the loop still stops at
`agent-budget` before it runs out of agents, and relaunching with the same args
carries on.

Write `requireApproval` in explicitly. The loop has no default for it: a run
without it stops before any agent. The args are what a person reads to see
what governs a run, so the merge gate is always written out. Set it to
`true` only where the user has asked for a human approval gate
in as many words — the default is `false`, because the review, adversarial
verification and judge stages already are the review.

### 3. Check what it landed

The run returns `{increments, stopped}`: one entry per increment it attempted,
each with its `outcome`, and one `stopped` saying which condition ended the run.
Do not trust that report on its own.

- The `Workflow` tool's result carries a `transcriptDir`. Read
  `<transcriptDir>/journal.jsonl` and find the run's first `log()` line —
  `increment-build-loop: resolved configuration {…}`. Check it matches the
  `args` you passed. If it does not — or it is missing — stop, quoting both the
  log line (or its absence) and the args you sent.

Then one query for every id the run reported:

```bash
jq -r '.increments[] | select(.id=="<id>") | .status + " " + (.commit // "-") + " " + ((.prs // []) | tostring)' workareas/<workarea>/backlog.json
```

- `done` → it landed.
- anything else, for an increment the run called `landed` → the backlog and the
  workflow disagree. Report both and stop; do not relaunch until someone has
  looked.

Landed means merged. The loop writes `ticket`, `branch` and `prs` as soon as
each exists, so a later run resumes the increment rather than raising a second
ticket.

### 3b. Catch anything the increments deferred

The workflow's return value carries what its stages left undone. Stages are told to
finish their own work and to mark anything they genuinely left out as
`DEFERRED: <what>` on its own line. **Sweep every increment in the returned list
for those, and for a CI fixer's "out of scope" or "not done" wording** — a CI
fixer works after every reviewer has finished, so what it defers is the
least-seen work in the whole pipeline. This runs once, after the run stops,
because the loop no longer hands you control between increments.

For each one, check it against `backlog.json`:

```bash
jq -r '.increments[] | select(.status != "done") | .id + "  " + (.title // .key // "-") + "  " + (.detail // "")' workareas/<workarea>/backlog.json | grep -i '<keyword>'
```

- **Already covered** by a `todo` increment → nothing to do. Say which one in your
  per-increment line. Do NOT raise a second increment for it: two increments doing the
  same work collide when the second finds the first has done it.
- **Not covered** → add an increment for it. Append it with a fresh id (never renumber),
  in the one shape: a `title`, a `detail` saying what and why, at least one observable
  `acceptanceCriteria` entry, `dependsOn` the increment that surfaced it, `status: "todo"`,
  and a `notes` line saying which increment and stage it came from. Never a file list or
  commands — the loop plans those. Then run `tim backlog check <workarea>`.

Work that exists only in a stage's prose is work that will be lost. This step is what
stops that, and it costs one query.

### 4. Report one line per increment

To the user, from the returned list:

```
inc-NNN  landed   <title>            PR #123 · EUDPA-4567
```

Then the stop reason, then the handover prompt. Do not read the diffs and do not
open the test logs. Everything worth reading already ran inside the workflow.

## STOP CONDITIONS

The run returns `stopped: {reason, detail}`. Report the reason and print the
handover prompt.

| Reason | What it means |
|---|---|
| `count-reached` | `stopAfter` increments have landed. The ordinary ending |
| `no-buildable` | `tim backlog next` found nothing buildable, or an explicit `increments` list is built out |
| `agent-budget` | Another increment would take the run past the `Workflow` tool's 1000-agent cap. Nothing is wrong: launch again with the same args |
| `derive-failed` | `tim backlog next` itself failed. **Not** a finished backlog — fix the query or the workarea and launch again |
| `gate` | The increment carried a designed HALT-FOR-REVIEW gate. The loop lands it, then stops |
| `not-landed` | The same id came back twice, so the previous attempt at it did not land |
| `ticket-failed` / `branch-failed` | The increment never got a ticket on the board, or its repos never got the branch |
| `baseline-red` | The tree was already red before the increment touched it. Nothing built on it would prove anything |
| `plan-refused` / `plan-outside-branched-repos` | The planner would not plan it, or planned work in a repo the increment did not branch |
| `implement-failed` / `review-failed` / `fix-failed` | A stage died. The attempt is preserved as a pushed wip commit |
| `off-branch` | A repo left the run's branch and could not be moved back |
| `ladder-red` | The verification ladder went red. Preserved, not discarded |
| `land-failed` | The commit could not be made |
| `pr-failed` | The branch pushed but the PRs could not be raised |
| `ci-red` | A PR did not go green inside `ciFixAttempts`. The PR stays open, the ticket stays in progress. Under the branch lifecycle a PR that conflicts with its base is `ci-red` at once, with `stopReason: "pr-conflicting"` and no fix attempt spent |
| `main-red` | `main` went red after a merge. **Nothing auto-reverts** — that is a human's call |
| `awaiting-approval` | Every PR is green but at least one has no approving review inside `approvalWaitMinutes`. **Nothing merged** — all of them stay open, untouched |
| `changes-requested` | A reviewer asked for changes. Nothing merged; every PR stays open and the run stops |
| `pr-left-open` | The merge stage's final sweep found an open PR still on the increment's branch in some repo — usually one a CI fixer raised elsewhere. Part of the increment merged; the rest did not |
| `done-failed` | The merge is real but the ticket would not move to the finished status. Under the branch lifecycle: the push is real but `tim backlog set --status done` failed |
| `row-invalid` | Branch lifecycle only. The row's `repos`, `merge` or `gatePhases` do not fit the run: a repo it does not configure, a merge into a repo the row does not build, a gate phase that does not exist |
| `merge-failed` | Branch lifecycle only. A merge the row asks for would not start. The attempt is preserved as patches and the merge aborted |
| `push-failed` | Branch lifecycle only. The land stage committed and recorded the commit, but the push was rejected: somebody else pushed to the branch. Nothing is lost; a human reconciles the branch |
| `no-open-pr` | Branch lifecycle only. A repo the row builds has no open PR for the branch, and this lifecycle never raises one |

**Every failure stops the whole run, not just that increment.** The loop never
skips to the next id after one goes wrong: `tim backlog next` selects on status
and `dependsOn` alone, so a failed attempt is still the next buildable
increment, and carrying on would either rebuild it or build on top of a failure.

`ci-red` and `main-red` are not yours to repair. Report the URL and what was
failing.

**`gate` is honoured regardless of `requireApproval`.** A row's own `gate`
field is a checkpoint somebody set deliberately on that specific increment —
data on the backlog, not a setting on the run — and it is unaffected by
whether the human approval gate is on or off. `awaiting-approval` and
`changes-requested`, by contrast, fire only when `requireApproval: true`.

**`pr-left-open` means the increment is half-landed, and the half that landed
does not auto-revert.** The merge stage sweeps every repo for an open PR on the
branch before it reports green, precisely because the list of PRs it was handed
is not proof of what the increment actually became — a CI fixer can raise one in
a repo the increment did not start with. Report which repo and which URL. Do not
merge the straggler yourself: it has not been through the watcher or the
approval gate, and merging it to clear the warning is worse than the warning.

**`awaiting-approval` is not a failure and must never be reported as one.** It
can only fire when `requireApproval: true` — off by default, so this is
something a programme opted into rather than something this skill supplies
for free. With it on, the loop merges only PRs carrying an approving review,
and it merges none of an increment until all of them have one, so a run that
ends here did everything right, merged nothing, and is waiting on a person.
Report **every** unapproved PR URL and say plainly that they need a reviewer.
Then stop:

- **Never approve a PR** — not through `gh`, not by any other route. GitHub
  refuses a self-approval from the author, and the account this runs as is the
  author. A gate you can satisfy yourself is not a gate.
- **Never merge past it** with `--admin`, by disabling the check, or by
  reconfiguring the branch.
- **Never merge the approved ones and leave the rest.** That is precisely the
  half-merged increment the whole-increment gate exists to stop.
- **Never re-run the increment to get a different answer.** The PRs are already
  green; a second set only adds noise for the reviewer.

Resuming is free once somebody approves: `prs` stays populated, so STEP 5 puts
the increment back at `"ci"`, which re-checks the PRs and reaches the merge stage
again — this time finding the approvals.

`changes-requested` is likewise a human's, not yours. A reviewer asked a
question; answering it is the author's job. Do not push a fix, do not dismiss
the review, and do not argue with it in the handover — name the PR and what was
asked.

A run that stops short of `stopAfter` is not a failure — it is the loop telling
you reality diverged from the plan.

## Branch lifecycle

`lifecycle: 'branch'` builds a backlog straight onto one long-lived branch that already exists in every backlog
repo, each with its pull request already open, and leaves the merging to a human.

### When to use it

When the user names an existing branch and says the work goes onto it: a programme that syncs a feature branch
with `main`, or that finishes a branch somebody else will merge. The first user is
`workareas/shared/frontend-alignment/sync`, which brings `feat/NO_JIRA-frontend-alignment` up to date with `main`
across ins, animals, plants and tests. Everything else uses `lifecycle: 'full'`.

### What it never does

- It makes no Jira call of any kind. There is no ticket and no board, so `jiraProject`, `epic`,
  `jiraInProgressStatus`, `jiraDoneStatus`, `jiraBoard`, `requireApproval` and `approvalWaitMinutes` are passed as
  `null`. The loop refuses a value in any of them, because a value would suggest it governs the run.
- It never creates a branch, and refuses `main` and `master` as `branch`.
- It never creates, edits, retitles, un-drafts, closes or merges a pull request. Titles, bodies and draft state are
  a human's. A row whose acceptance is PR text (rewriting a PR body, lifting a draft) is not one this loop can
  build: give it a withheld status, or do it by hand.
- It never force-pushes. Every push is `git push origin refs/heads/<branch>:refs/heads/<branch>`.
- It never commits a failed attempt to the branch. The preserve step saves patches under `logs/`, aborts any merge
  in progress and stashes the rest.
- It runs on `executor: 'claude'` only. The Codex briefs name the frontend, backend and tests repos.

### The row fields it reads

Three optional row fields, defined in [`backlog.schema.json`](backlog.schema.json). The full lifecycle ignores all
three.

- `merge`, such as `{ "tests": "origin/main" }`: a ref to merge into each named repo. Every key must be in the row's
  `repos`. The loop fetches and runs `git merge --no-ff --no-commit <ref>` after the plan and before the implementor,
  who resolves it by the plan; the land stage commits it as a two-parent merge commit. The planner previews the
  merge with `git merge-tree` and plans every resolution. Where the row's `notes` point at a resolutions file, it
  plans exactly what that file records.
- `gatePhases`, such as `["unit", "fit"]`: the phases of `tim build gate` the baseline and the ladder run. Use it
  where the end-to-end proof belongs to one cross-repo row that runs after several merge rows. `[]` runs none.
  Absent: all three.
- `awaitCi: false`: push and record the PRs without waiting for CI. GitHub runs no checks on a PR that conflicts
  with its base, so a row that lands before the merge that clears the conflict needs this, or it stops at
  `ci-red` with `pr-conflicting`.

A row with `repos: []` changes no backlog repo: its output is in the workspace repo itself, usually under
`workareas/`. The workspace is not a backlog repo, so the loop does not commit it: the edits are left unstaged, the
reviewers read them against HEAD, and the result lists them in `leftUncommitted`. **Commit them yourself after the
run**, then push the workspace. Give such a row `gatePhases: []`, because nothing in the backlog repos changes.

### Building the args

The same keys as above, with `lifecycle: 'branch'`, `branch` set to the working branch, and `null` for every Jira
key, `requireApproval` and `approvalWaitMinutes`. `repos` is the envelope's `repos` copied in full, whatever its
keys are: the branch stage stops the run if the envelope and the args name different repos. The worked example in
[`../workflow/README.md`](../workflow/README.md#the-branch-lifecycle) is the one for the frontend alignment sync.

### Checking what landed

A landed row is `done` in the backlog with its `commit` and `prs`, and is pushed to the branch. Nothing is merged,
so there is no `main-red` to watch for. Each landed entry in the result carries `ci`: `green`, `not awaited` (the
row set `awaitCi: false`) or `none` (the row changes no backlog repo). Report a row whose CI was not awaited as
exactly that, never as green.

### The stop reasons it adds

`row-invalid`, `merge-failed`, `push-failed` and `no-open-pr`, in the table above. `ci-red` gains the
`pr-conflicting` case. The ticket and merge stops (`ticket-failed`, `main-red`, `awaiting-approval`,
`changes-requested`, `pr-left-open`) cannot fire.

## THE HANDOVER PROMPT

Print this at every stop, in a fenced block, filled in. It is the whole
resumption mechanism: there is no ledger and no session state, because
`backlog.json` and git already hold everything.

**Push first** — `backlog.json` and any batch logs — or the handover names a
state the next machine cannot see.

````
Resume the <programme> build with the requirements-pipeline skill's BUILD phase.

workarea     <workarea>
branch       <branch>
lifecycle    <full or branch>
scope        <scope>
executor     <executor>
jiraProject  <jiraProject>
epic         <epic>
inProgress   <inProgress>
doneStatus   <doneStatus>
board        <board>
repos        <the repos table, one JSON object>
models       {}, the recommended split (think opus, code sonnet, light haiku)
stopAfter    <a number, or all>

Stopped: <reason>. Last landed <inc-NNN> (<PR url>, <ticket>).
<N> todo remain, <M> blocked, <K> dropped.
Owed to a human: <none, or the one thing>

Read workareas/<workarea>/PROGRAMME-NOTES.md before the first increment.
Raise Dynamic workflow size in /config first.
````

Counts from:

```bash
jq -r '[.increments[].status] | group_by(.) | map({(.[0]): length}) | add' workareas/<workarea>/backlog.json
```

Handover is **sequential**. Two sessions on one programme will fight over
`backlog.json`. Attribution follows credentials, so a programme picked up
mid-run shows two names in its tickets and commits — that is accurate, not a
defect.

## SWITCHING EXECUTOR

`claude` runs every stage as a Claude subagent — the proven path.

`codex` delegates the three token-heavy stages, **implement, review and fix**,
to Codex CLI via the briefs in [`../workflow/codex/`](../workflow/codex/). Baseline, plan, verify
findings, judge, ladder and land stay on Claude either way. Both executors build
from the same plan file, so the same backlog builds under either with no edit.
Codex mode is at most `23 + 3g` agents against `17 + 3g`, where `g` is the number of
(repo, language) groups the changed files fall into — typically 2–6, however many
files there are, because review and verification fan out per group, not per file.
Both executors review at the same granularity: Codex runs one review per group plus
one consistency review, each a shell and a relay, and a branch guard after every
codex stage keeps each repo on the run's branch.

Switch by changing `executor` and launching again. **One run builds every
increment with one executor**, so a programme moves to Codex when the increments
get wide by ending the run and starting the next one there. Say which executor
built each increment in your per-increment line.

Codex mode needs a Codex login. If a codex stage produces no result — non-zero
exit, no last-message file, unparseable JSON — the loop preserves the attempt and
stops rather than proceeding, because a crashed reviewer must never read as
approval. So does a failed land or a repo the branch guard cannot move back. Each
leaves the tree clean and stops the run with its own reason above.

## GUARD RAILS

- **You orchestrate. You do not implement.** Do not edit repo source, do not fix
  a failing test, do not apply a review finding. If an increment needs work you
  are tempted to do by hand, that is a stop condition, not an invitation.
- **Do not read diffs, test logs or review argument.** They ran below a death
  boundary for a reason. Reading one to "just check something" is what fills the
  session and ends the run early.
- **Never edit the tracked loop.** Everything a run needs goes in its args.
- **One Workflow invocation per run.** The loop derives its own increments; do
  not launch it once per increment and do not pass a list of ids unless the user
  named them.
- **Never narrow the derive query to a planning field.** Status and
  dependencies decide buildability; a thin increment is still buildable.
- **Do not renumber increment ids.** They are bound to rulings and citations.
