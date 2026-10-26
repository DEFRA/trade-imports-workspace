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
inDev         the board's working status. Read it from the board's
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
repos         the backlog envelope's `repos` map, whatever its keys, copied
              in full: a workspace-relative path and a GitHub owner/name slug
              per key. DISTIL wrote it:
                jq '.repos' workareas/<workarea>/backlog.json
              Its keys are the programme's own: frontend, backend and tests in
              one backlog; perftests, stub, idstub, insfrontend and gateway in
              another. Ask only when that prints null (a backlog older than the
              field). Never type it from memory and never default to the
              animals repos: the same key names different repos in different
              programmes, and a path typed from memory is how a plants
              increment ends up built in the animals frontend. The loop's
              preflight stops the run when the args and the envelope differ.
              Under the full lifecycle the key workspace is the workspace
              repo itself, at path "." — see "The workspace repo" below.
              No entry carries requireApproval, the workspace's included
models        {} for the recommended split, pass that unless the user asks
              for something else. Three tiers, each optional. think (default
              opus) plans and judges: plan, plan review, judge, the
              consistency reviewer, and a theme's engineering reviewers
              and judge.
              code (default sonnet) writes and repairs code: implement, the
              per-group style and code reviewers, the finding verifiers, fix,
              the style re-review of the fix, the ladder, CI fix, the style
              review of a CI fix and its style fix, and a theme's fixer and
              ladder. light (default haiku) runs a command and
              reports what it said: everything else, the start stage
              included. A tier left out takes
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
increment reaches the merge stage its plan has been reviewed before any code
existed, and its code has been through a style reviewer and a code reviewer per (repo, language) group, a
consistency reviewer across the whole change, a verifier that tries to refute
every functional finding and keeps every code-quality finding that code does
not prove wrong, a judge that rules every survivor fix-now, defer or reject,
a style re-review of the fixer's own hunks, and a style review of every commit a CI fixer
pushes, without a human in the loop. **That multi-agent
review, verification and judgement IS the review.** A GitHub approving
review on top of it is a second, *human* gate, and a run that has to stop
and wait for one cannot run 24/7 — which is the whole point of this loop.

Set `requireApproval: true` only when the user asks, in as many words, for a
human approval gate in front of every merge. Never set it because a programme
or a repo seems to need one, and never write "waits for approval" into a row,
a note or a handover. With it on, every PR of an increment needs an approving review on GitHub
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

### The workspace repo

A programme that changes the factory — tim, `gates.json`, the stack scripts,
docs — builds the workspace repo like any other, under the full lifecycle. Its
entry in the envelope's `repos`, and so in the args, is

```js
workspace: { path: '.', github: 'DEFRA/trade-imports-workspace' }
```

- **No approval gate, here or on any repo.** The workspace PR merges on green
  like every other. Its changes steer every later run, and the reviewers,
  the adversarial verifier and the judge are what guard them. Never add
  `requireApproval` to a repo's entry. The loop still honours one it finds:
  that repo's PR then needs an approving review before **any** PR of the
  increment merges, and the run stops at `awaiting-approval`. A backlog
  written with one on its workspace entry predates this rule: take it out of
  the envelope, run `tim backlog check`, and leave it out of the args.
- **What never rides in a workspace commit.** The files the workspace carried
  in when the increment started and anything under `workareas/` the row does
  not name — the loop's own `backlog.json` writes, plans and logs above all.
  `tim build start` writes every carried file to
  `workareas/<workarea>/logs/<id>-carried.txt`, names those outside
  `workareas/` (at most 50) as `preexistingDirty`, and counts the rest in
  `preexistingDirtySummary`, so its JSON line stays small however dirty the
  workspace is. The land stage commits there by explicit path; the loop then
  reads what the branch commits straight from git (`git log --name-only`),
  looks up in the carried-files list any committed path the result could not
  name, and stops at `land-leaked`, pushing nothing, if the commit holds either
  or a list cannot be read.
- **Merge order.** The workspace PR merges last, after every other PR,
  wherever the row lists it: the next increment runs on it, so it changes only
  once everything built alongside it has merged.
- **Back to main.** Once the increment has merged, the loop switches the
  workspace back to the base branch and fast-forwards it, carrying its
  uncommitted files, so the next increment runs on the merged factory. It
  stops at `workspace-not-on-base` if it cannot. An increment that stops
  before it merges leaves the workspace on the increment branch, and
  `stopped.detail` says so: put it back once the increment is settled.
- **Changing the factory mid-run.** On the increment branch, a change to tim,
  `gates.json` or the stack scripts takes effect at once for the rest of that
  increment, and the gate re-ups the stack when `docker/stack` or
  `scripts/stack` changed. A change to the loop script takes effect from the
  **next launch** only: a running loop never re-reads it.
- **An increment that leaves the workspace out** does not touch it. A plan
  that would write there, `openspec/` included, needs `workspace` among the
  row's repos.

See [`../workflow/README.md`](../workflow/README.md#the-workspace-repo-as-one-of-the-repos).

**Confirm the two status names against the board before the first increment.**
They are board configuration, not constants, and a wrong one stops every
increment at the start stage:

```bash
tim jira transition <ANY-EXISTING-KEY> --list --workspace ~/git/defra/trade-imports-workspace
```

On EUDPA the working status is `In Dev` and the finished status is `Done`; the
args use those names. The done stage closes each ticket with
`tim jira transition <KEY> "<jiraDoneStatus>" --workspace ~/git/defra/trade-imports-workspace --json`,
which `Bash(tim:*)` allows; `tools/jira/transition-ticket.sh` still works by hand
but the loop no longer calls it.

Do not take a status name from a command's `--help` text — that is example
wording, not this board's workflow.

**A raised ticket lands in the board's backlog, and no status gets it out.**
Board membership is not a field on the issue and is not implied by status — two
tickets identical in every field sit one on the board and one in the backlog.
So the start stage (`tim build start`) moves it onto the board after it sets the
working status, and reports `movedToBoard`. The loop treats anything but true
there as `ticket-failed`, because a ticket the team cannot see on a run that
otherwise looks clean is the failure worth catching loudly. The call is
idempotent, so it runs on reused tickets too.

**Each increment starts with one deterministic call.** Under the full lifecycle
a light agent runs `tim build start` and copies its JSON line, which the script
reads: it derives the increment, reuses or raises its ticket (templating the
description in Jira wiki markup from the row, and recording the key before
anything else so a retry never raises a second), sets the working status by
exact name, moves it onto the board, and puts the increment's repos on its
branch. A branch an earlier attempt left behind is reused; if it has no
commits of its own and the base has moved on, it is fast-forwarded to
`origin/<base>` first, so the baseline never runs on a stale base. A branch
with commits of its own is left as it is. A failure names its step and its exact reason, and the loop maps it to
`derive-failed`, `no-buildable`, `ticket-failed` or `branch-failed`. See
[`../workflow/README.md`](../workflow/README.md#the-start-stage).

## Before the first increment

1. **Raise the workflow size limit** — `/config` → *Dynamic workflow size*. One
   increment is up to 56 agents on Claude and 64 on Codex with `ciFixAttempts: 3`, and 4 more for each attempt
   beyond three, against a default guideline of 15. You cannot set
   this for the user and the run is throttled without it. The tool's own hard
   cap of 1000 agents per run is what `agent-budget` below stops at, around 17
   increments on Claude and 15 on Codex. Under the branch lifecycle the run also
   keeps room for one theme's engineering review: twice the number of repos, plus 9.
2. **Pull the workspace repo.** `backlog.json` is the state.
3. **Check the backlog's shape:** `tim backlog check <workarea> --json`. It checks the
   one shape defined in [`backlog.schema.json`](backlog.schema.json), with the rules
   in [`SHAPE.md`](SHAPE.md): each row a requirement (what,
   why, acceptance), never a recipe. The loop plans the how itself, just in time,
   into `<workarea>/plans/<id>.md`, and reviews that plan before any code exists
   ([The plan and its review](#the-plan-and-its-review)). A backlog written before that shape existed may
   fail on recipe fields; the loop still reads it, treating those fields as hints,
   so report the failures and carry on. Do not rewrite another programme's backlog.
4. **Check the gate covers every repo the programme builds.** Branching needs
   nothing from you — the loop's start stage cuts each increment's branch off a
   freshly fetched base, in the increment's repos only.

   The loop's gate is `tim build gate <workarea> [--phase unit|fit|e2e|all]`: the
   rungs in [`gates.json`](gates.json), per repo, in order — unit, then FIT with
   a free-port check, then E2E against the workspace stack built from local
   source, under the run's stack lease. It refuses a stack anybody else holds.
   Every rung writes to its own log, a rung that cannot run fails with its
   reason, and the command exits 1 unless every rung passed. The baseline and the
   ladder each run it once with `--phase all`, which runs the phases side by side,
   into `<workarea>/logs/<id>-baseline/` and `<workarea>/logs/<id>-ladder/`. A
   branch-lifecycle row that owes only some phases runs those one per call. The
   implementor and fixer run its unit and FIT phases to check themselves. No
   agent picks a repo's test scripts. How hard the gate drives this machine
   (FIT and E2E worker counts, `parallelRepos`, `stackAfterLocal`) comes from
   the machine's own gitignored `config/machine.json`, never from `gates.json`;
   `tim build tune` writes it once per machine: see
   [`machine-tuning.md`](machine-tuning.md). The loop reads the same counts
   once at launch (`tim build workers`) and gives them to every stage, so a probe,
   plan check or reviewer's FIT or E2E run outside the gate passes the same
   `--workers`. A change to the file reaches the gate at its next run and the
   stages at the next launch.

   Every repo's unit phase has a `duplication` rung, `tim build duplication`. It
   fails when a changed test file holds a block of 10 lines or more that also
   appears elsewhere in the repo's tests, where `origin/main` has no such copy. A stage repairs it by
   moving the set-up into the shared test helper. A branch-lifecycle branch whose
   earlier rows copied set-up goes `baseline-red` on that rung: a person moves
   the set-up into the helper on the branch, then launches again.

   **The run holds the workspace stack.** Before its first increment the loop
   takes one lease, `tim docker lease acquire --holder "<run id>" --mode dev`,
   which starts the stack from local source. The stack stays up across every
   increment, and every gate call passes `--holder "<run id>"`, so the gate
   reuses it and rebuilds only what changed. A service that caches another
   service's answers names it under `x-refresh-with` in
   `docker/stack/dev.compose.yml`, and the gate restarts it whenever that
   service is rebuilt or restarted. Reference-data names the stub, because it
   keeps the stub's MDM countries and ports for an hour, and without the restart
   a stub fixture change would not reach the E2E rung. Add the key to any
   service that caches another one's answers. No stage takes or gives back a
   lease, or starts or stops the stack. A plan may name a check that needs the
   stack, marked "needs the workspace stack"; the stage that runs it uses the
   stack as it is. The integration proof is still the gate's E2E rung. After the
   run stops, whatever the reason, the loop gives the lease back, which takes the
   stack down. A refused acquire stops the run at `stack-held` before any
   increment; a stack that will not start stops it at `stack-failed`. A stage
   that finds the stack in somebody else's hands returns `stackHeld`, and the
   run stops at `stack-held` for you to rule on. When Docker Desktop has quit,
   tim starts it again (`open -a Docker`, up to five minutes) wherever it reads
   or starts the stack, and a stage that finds the stack gone from under the
   run's own lease returns `stackDown`: the loop takes the lease again, which
   brings the stack back, and runs that stage once more. A stack somebody brought up by
   hand, with no lease, counts as somebody else's: it is never reused and never
   taken down, and so does a stack restarted by hand under a lease (its container
   ids no longer match the lease's). The lease file is per machine
   (`tim docker lease status` shows it), and while it is held `tim docker up`,
   `dev`, `down`, `restart` and `bounce-backend` refuse unless given `--force`,
   which the loop never passes.

   **A run that dies leaves its lease behind.** A killed `Workflow` run, an ended
   session or a restarted machine never reaches the give-back, so the stack
   stays up, leased to the dead run's id. Check with `tim docker lease status`,
   then give it back with `tim docker lease release --holder "<run id>"` before
   you launch again.

   **Running the gate by hand.** `tim build gate --phase e2e` refuses a stack you
   brought up yourself with `tim docker dev`, because it has no lease. Either take
   it down first (`tim docker down`) and let the gate start and stop its own, or
   run the gate under a lease of your own:
   `tim docker lease acquire --holder "<you> manual"`, then
   `tim build gate <workarea> --phase e2e --holder "<you> manual"`, then
   `tim docker lease release --holder "<you> manual"`. While a build run holds
   the stack, a gate run under any other holder is refused. A check that
   starts any other compose project (`docker compose run` starts its
   `depends_on`) is followed by that repo's down script.
   The gate reads the
   repos from the backlog envelope's `repos` map, so a backlog without one goes
   baseline-red until it has one. Add a repo's rungs to `gates.json`
   before the first increment that builds it; the gate fails a repo it has no
   rungs for.
5. **Read `<workarea>/PROGRAMME-NOTES.md` if it exists.** It carries standing
   rulings, a do-not-build list and any ordering the programme imposes. Re-read
   it if the run is long; do not carry a stale copy in your head. Read
   `<workarea>/deferred.md` too, if it exists: the register of work the
   programme has pushed out of its backlog ([step 3b](#3b-catch-anything-the-increments-deferred)).

## THE RUN

Build the args, launch once, read the result. The loop does the repeating.

### 1. What the loop derives for itself

You do not pick the increments. With `increments: null` the loop's start stage
runs `tim build start <workarea>` with no `--id`, which derives the next one the
same way as

```bash
tim backlog next <workarea>
```

after each increment lands, and builds whatever id comes back. That is
what lets one launch build many: a list chosen in advance throws away everything
the first increment teaches, and a run that needed a turn from you per increment
died whenever the session did.

**Buildability is status and dependencies. Nothing else.** A dependency is a
`dependsOn` id in the same backlog, or an `externalDependsOn` row in another
workarea's backlog, which must be `done` there ([Building one theme](#building-one-theme)).
The six withheld
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
  jiraInDevStatus: '<inDev>',
  jiraDoneStatus: '<doneStatus>',
  jiraBoard: 13780, // the EUDPA board. Another programme's board is another id
  ciFixAttempts: 3,
  ciWatchMinutes: 30,
  requireApproval: false,
  approvalWaitMinutes: 20,
  repos: {
    // the envelope's repos, every key exactly as `jq '.repos'` prints it. For the INS performance-testing backlog:
    perftests: { path: 'repos/trade-imports-performance-tests', github: 'DEFRA/trade-imports-performance-tests' },
    stub: { path: 'repos/trade-imports-stub', github: 'DEFRA/trade-imports-stub' },
    idstub: { path: 'repos/trade-imports-defra-id-stub', github: 'DEFRA/trade-imports-defra-id-stub' },
    insfrontend: { path: 'repos/trade-imports-ins-frontend', github: 'DEFRA/trade-imports-ins-frontend' },
    animalsfrontend: { path: 'repos/trade-imports-animals-frontend', github: 'DEFRA/trade-imports-animals-frontend' },
    plantsfrontend: { path: 'repos/trade-imports-plants-frontend', github: 'DEFRA/trade-imports-plants-frontend' },
    referencedata: { path: 'repos/trade-imports-reference-data', github: 'DEFRA/trade-imports-reference-data' },
    gateway: { path: 'repos/trade-imports-dynamics-gateway', github: 'DEFRA/trade-imports-dynamics-gateway' }
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
before any agent starts, and the preflight stops it before the first increment
when a key, a path or a GitHub slug differs from the envelope's.

**Merge order.** An increment across several repos merges one PR at a time, and
the order is the script's, not an agent's:

- **The keys are exactly `frontend`, `backend` and `tests`:** backend first, then
  tests, then frontend, whatever order the row lists them in. The backend is the
  provider and the frontend the consumer, and CDP runs the tests repo's suite
  against the deployed frontend, so a frontend merged ahead of its test fixes
  goes red.
- **Any other keys:** the order of the row's own `repos` list. Write it provider
  before consumer — a service before the frontend that calls it, a stub before
  the service that calls it, and a tests or performance-tests repo after every
  service it exercises. The start stage copies it as written and the planner
  returns its `repos` in the same order, saying under `risks` where the row's
  order puts a consumer first. A PR in a repo the row does not name, such as one
  a CI fixer raised, merges last.
- **The workspace repo** merges after all of them, wherever the row lists it.

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

The run returns `{increments, specChecks, reviewChecks, refutedFindings, stopped}`: one entry per
increment it attempted, each with its `outcome`, one entry per theme whose spec it checked, the
checks left for whoever reviews a finished theme, every review finding verification refuted, and
one `stopped` saying which condition ended the run. Do not trust that report on its own.

**The Behaviour Spec.** Every row keeps `openspec/` current, whatever its repos: its plan's
section 8 names the edits, the implementor makes and validates them (through `frontend-change`'s
Step 5 where the row is routed there), and the land stage commits them with the rest. A row that
changes nothing the spec records reports `Spec sync: none — <reason>`, which the consistency
reviewer checks. A row owns every capability it writes, whole: a validate or lint failure
already there before the row is the row's to fix, not to report as pre-existing. Once a theme's last row lands, the run lints the spec and lists unproven
scenarios under every prefix the theme touched. Report each `specChecks` entry in one line:
its theme, outcome and any problems. A `theme-unread` entry stops the run too: read the theme
by hand and, if its last row has landed, run "catch-up and cover" for its prefixes. See
[`../workflow/README.md`](../workflow/README.md#the-behaviour-spec).

<a id="the-plan-and-its-review"></a>**The plan and its review.** A plan records decisions, homes and owners, and never writes code
text: no names for new things, no comment or doc comment text, no test titles or bodies, no log wording and no code
bodies. Beside its decisions, moves, edits, tests, checks, out of scope and spec sync, it names a home for each new
constant, entry, argument or helper (the existing mechanism it goes through, by file:line), one owner per rule in
each twin, the shared test helper to extend, the docs the change makes untrue (or "None" with the grep run), a log
for every branch that changes an outcome, its departures from written rules, what is reachable once the row lands,
and the standards to read. Each test is stated as the behaviour it proves and the production line whose removal
turns it red. Ids in the row become the behaviour they name. The tidy-up is bounded: a plan fixes house-rule
breaches in the files it edits for the row and in the lines and functions it touches, never widens the row's
footprint for clean-up alone, and lists wider clean-up in section 7 as follow-ups. A light agent greps the plan for
code text, and a flagged plan goes back once through the same replan as a denied check. Then a plan reviewer on the
think tier checks the plan against the repo's docs and recipes, the layer rules, the house rules and the sibling
code, and marks each finding structural (layer, owner, a second mechanism, an unstated departure, scope, test
strategy) or detail (a line-level gap the implementor can close without changing a decision). It can send the plan
back once. A structural finding still open on the revised plan stops the run at `plan-refused`, before any code
exists, with those findings in the detail: read the plan and the detail, then rule on the row, rewriting it if the
requirement is wrong, or launch again. Detail findings still open do not stop the run: a light agent writes them
into the plan under "Plan review: must address", the implementor gets them as required work, and the consistency
reviewer reports any left open as code-quality findings, fixed by default. The review narrows nothing later. The
implementor follows the plan's decisions, homes and owners, owns the names and code shape, and may extend a shared
test helper. The consistency reviewer treats a plan decision as a finding when its code cannot be explained from
the code alone or departs from a written repo rule. Each increment's result carries `followUps`, from the plan and
its reviewer: sweep them in step 3b like `DEFERRED:` lines. See
[`../workflow/README.md`](../workflow/README.md#the-plan-contract).

**The house rules and the probes and docs lines.** Every stage that plans, writes or judges code
gets the house rules from `.claude/rules/code-quality.md` inline and is told to read the file in
full. Each row also reports a `Probes:` line and a `Docs updated:` line beside its `Spec sync:`
line, and the ladder is red when neither the implementor nor the fixer reported one. A row that
stopped at the ladder for want of one of these lines is fixed by building it again, not by
editing the backlog. See
[`../workflow/README.md`](../workflow/README.md#the-house-rules).

**Findings by kind, and what was refuted.** Each review finding carries a category. A functional
finding (correctness, security, error handling, a coverage gap) is refuted by default; a
code-quality finding (naming, comments, structure, duplication, logging, test readability,
history) is real by default, refuted only by quoted code, and always fixed now, in each twin. A
twin outside the row's repos becomes an open question on the row. A style re-review then reads the
fixer's own hunks and sends any new code-quality finding back once. Nothing refuted is dropped
silently: report the count of `refutedFindings` per increment, and when a theme finishes, its
`reviewChecks` entry lists the findings refuted across its rows. Put those in front of the
theme's reviewer with the other review checks. See
[`../workflow/README.md`](../workflow/README.md#findings-by-kind).

**What the reviewers look for.** The code reviewer also predicts what each name returns and changes and compares it
with the body, looks for an outcome-changing branch support could not trace in an incident, a second copy of a rule
or of test set-up, and a test that claims more than it proves or cannot fail. Every reviewer treats a comment, doc
comment or recipe line in a changed file that the change makes false as in scope, fixed by deleting it. The
consistency reviewer reads the repo's docs and `add-a-*` recipes from `tim backlog standards`, and a doc, recipe,
JSDoc or test name outside the diff that still states the old rule is a finding, fixed by updating or deleting it. It
also judges the implementor's notes against the code. See
[`../workflow/README.md`](../workflow/README.md#what-the-reviewers-look-for).

**The CI fixer is reviewed too.** It gets the house rules and the standards for each file it edits, and reports each
commit it pushes. A style reviewer reads those commits and sends any code-quality finding to one style fix before the
watcher looks again. Sweep its words in step 3b as before.

**A theme's engineering review (branch lifecycle).** Once a theme's last row lands, one reviewer per repo reads the
whole theme branch against `origin/main` for patterns and tests. Its findings go through the same verifier, judge,
fix, re-review and ladder, and the fixes land on the branch as one commit per repo, with CI watched. It is a safety
net behind each row's own review, never a replacement. Report each of its `reviewChecks` entries (the commit it
landed, its refuted findings, any repo it could not review) with the theme's other review checks. The full lifecycle
has no theme branch, so it runs no theme review. See
[`../workflow/README.md`](../workflow/README.md#the-ci-fixer-and-a-whole-theme-are-reviewed-too).

- Archive the run first (step 3c), then read its first `log()` line —
  `increment-build-loop: resolved configuration {…}`:

  ```bash
  jq -r '.logs[0]' workareas/build-telemetry/runs/<runId>/run.json
  ```

  Check it matches the `args` you passed. If it does not — or it is missing —
  stop, quoting both the log line (or its absence) and the args you sent. The
  `log()` lines are only in the run's record (`<session>/workflows/<runId>.json`,
  copied to `run.json`); `journal.jsonl` holds one `started` and one `result`
  or `failed` line per agent and never a `log()` line.

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
least-seen work in the whole pipeline. Sweep each increment's `followUps` too: the
wider clean-up its plan and plan reviewer kept out of the row's footprint. This runs once,
after the run stops, because the loop no longer hands you control between increments.

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

- **Outside the programme** — a follow-up Jira ticket, a chore in a repo the backlog
  does not build, an action only a person can take → no row. Record it in the register
  below instead.

Work that exists only in a stage's prose is work that will be lost. This step is what
stops that, and it costs one query.

**Keep a register of what the programme pushes out.** `workareas/<workarea>/deferred.md`,
beside `backlog.json`, lists everything the programme defers out of its backlog: tickets
raised, tickets still to raise, a person's actions, and every row parked at a platform or
access stop ([step 3d](#3d-platform-or-access-stop-park-the-row-and-relaunch)). Write the
entry when the item is deferred, not at the end of the run. Create the file the first
time:

```markdown
# <programme>: deferred work

| What | Why | Where it lives | State |
|---|---|---|---|
| Give the plants backend repo a SONAR_TOKEN secret | inc-005's SonarCloud scan cannot run without it | Not raised. Owed by the repo admin | Open: inc-005 parked |
| Update the GBN-AG schema for germinal products | Needs the other team's schema repo | EUDPA-686 | Raised |
```

Commit it with `backlog.json`, and name it in the handover. A re-distil or a theme split
never carries this list, so without the file these items vanish.

### 3c. Archive the run and report what it cost

Every run, however it stopped — landed, red, killed or out of budget. The run id
is the `wf_…` folder name at the end of the `Workflow` result's `transcriptDir`.

```bash
tim build runs archive <runId>
tim build runs report <runId>
```

`archive` copies every agent's full transcript, the journal and the run's own
record (args, `log()` lines, result) into `workareas/build-telemetry/runs/<runId>/`,
which git ignores — transcripts carry prompts and code, and this repo is public.
Do it straight away: Claude Code deletes session folders after
`cleanupPeriodDays` (30 days unless set), and that deletes the transcripts with
them. Never copy a transcript, or anything derived from one, into
`workareas/shared/` or any other tracked path.

`report` prints the run by increment, then stage, then agent — model, input,
output and cache tokens, tool calls, time and outcome — and the five most
expensive and five slowest stages. Put those two top-five lists in your report to
the user, one line each. `--json` gives the same for mining; `report --all`
compares every archived build-loop run stage by stage.

**Look for savings in the overhead, never in the plan stage.** The plan stage, its review
included, is the most expensive stage by design: planning against the live tree is where the
quality comes from. Never slim it, move it to a cheaper model or investigate its cost. When the
report is used to find time or token wins, look at the work around the real work:
start-up stages, light agents retelling output, preserve and land overhead, gate runs
repeated for no change, and stack restarts.

If the run was relaunched after a stop, archive the earlier run ids too —
`tim build runs archive --all` sweeps every run Claude Code still holds and
copies only what changed.

**Not yet in the loop.** The loop does not archive itself; the session does it
after the run stops. What the loop should change to make this data richer is
listed under "Run telemetry" in `../workflow/README.md`.

### 3d. Platform or access stop: park the row and relaunch

Some stops are not a code defect but a person's fix that nothing else in the backlog
needs. One such row must not hold up the rest of the run. Park it and keep building.

The loop does not tell these apart: it stops at `ci-red` or `ladder-red` as it would for
any red. Parking the row is yours, and relaunching is what carries the run on.

**It is a platform or access stop when** the run stopped at `ci-red`, `ladder-red` or a
stage failure, and the failure it quotes is one of:

- a platform setting: an empty or missing repo secret (`SONAR_TOKEN`), an organisation
  setting, a CDP role, GitHub Pages not enabled
- access only a person can grant: CDP credentials, a `DEVELOPER_API_KEY`, a login needed
  to reach CDP from this machine

Read the quoted failure, not your guess. A red test, a lint finding or a Sonar issue in
the code is a code defect: that stop is reported and waits, as below.

**Then, for that row:**

1. Set it aside with the access or fix it needs:

   ```bash
   tim backlog set <workarea> <id> --status deferred --note "Parked at <reason>: needs <the fix> from <who>" --json
   ```

   Its ticket, branch and PRs stay recorded, so a later run resumes it.
2. Re-chain its dependants in `backlog.json`. A row that needs the parked row's output
   keeps it in `dependsOn`, so it waits too. A row that names it only for ordering, which
   is most of them, gets the parked row's own `dependsOn` in its place, so it becomes
   buildable. Under a full theme split, make the same edit in the parent backlog, or the
   next re-split puts the old order back.
3. Run `tim backlog check <workarea> --json` until it passes.
4. Add the row to `deferred.md` ([step 3b](#3b-catch-anything-the-increments-deferred)).
5. Commit `backlog.json` and `deferred.md`, then relaunch with the same args
   ([step 3e](#3e-relaunch-before-you-report)).

The PR stays open and the ticket stays In Dev. Do not repair the platform yourself.

**Stop the run only when** the next buildable row needs the parked one's output: the same
file or the same feature. `tim backlog next` then prints NONE, and the run ends at
`no-buildable` with the parked row named in the handover.

**To resume a parked row** once the fix is in place, set it back to `todo`
(`tim backlog set <workarea> <id> --status todo --json`), restore any `dependsOn` you
moved, mark its `deferred.md` entry done, and launch. The start stage finds its PRs and
puts it back at CI.

Every other stop still gets the normal ending: archive, report, handover, wait.

### 3e. Relaunch before you report

A run that can carry on is relaunched **before** you write any summary, in the same
turn. Ending a turn with nothing running is dead time: in an unattended run nobody
reads the messages as they arrive, and the backlog and logs on disk are the report.

Relaunch with the same args, straight after archiving, when the run stopped at:

- `agent-budget`
- a platform or access stop you have parked (step 3d)
- `gate`, under the full lifecycle. A branch run never stops there ([STOP CONDITIONS](#stop-conditions))

Then report what the stopped run did while the new one builds.

**Never stop or hand over because of a count or a guess.** Do not budget increments,
pick a smaller `stopAfter` than the user asked for, or wrap up because the session
feels long. Keep `backlog.json`, `deferred.md` and `PROGRAMME-NOTES.md` current after
every run, so a handover, if one is ever needed, costs nothing. The only reasons to end
idle are: nothing buildable is left, everything left is truly blocked, or the user must
decide something no default can stand in for.

### 4. Report one line per increment

To the user, from the returned list:

```
inc-NNN  landed   <title>            PR #123 · EUDPA-4567
```

Then list, under "For the designer", every open question starting "For the designer:" on
the rows the run built. These are `design` findings: copy, layout or a component where a guide
disagrees with the design source, the design source sets two different things for one element,
or it does not show the case the code handles. The code keeps the design; the designer decides.
Each question carries its evidence (the design source and the code at file:line, the guide
rule's link): list it with that evidence, ready to share with the designer.

```bash
jq -r '.increments[] | select(.id == "inc-NNN") | .openQuestions[]? | select(startswith("For the designer:"))' <backlog>
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
| `derive-failed` | `tim build start` (or, under the branch lifecycle, `tim backlog next`) could not derive the increment: the backlog would not read, a listed id is not in it, or the command failed before any step. **Not** a finished backlog — fix the args or the workarea and launch again |
| `gate` | Full lifecycle only. The increment carried a designed HALT-FOR-REVIEW gate. The loop lands it, then stops |
| `spec-check-red` | The increment landed and was its theme's last row to build, and the spec under a prefix the theme touched is red: a `tim spec lint` finding, a scenario no test proves, or a prefix a row reported writing that does not exist. The detail names each problem, its log and the `catch-up and cover <set>` to run. Nothing re-runs this check, so run those skills (spec-catchup, then spec-cover), then launch again |
| `not-landed` | The same id came back twice, so the previous attempt at it did not land |
| `ticket-failed` / `branch-failed` | The increment never got a ticket on the board, or its repos never got the branch. The detail is `tim build start`'s own reason, word for word: a status the board offers no transition to lists the transitions it does offer |
| `stack-held` | Somebody else holds the workspace stack: another run (a dead one included), another session, or a stack somebody started by hand with no lease. Before any increment, the run could not take its lease; part-way through, a stage found the stack was no longer the run's. The loop reads the lease itself before it believes a stage: a stage that reports the stack held while the lease is still the run's is ignored, and its other result stands. The detail names the holder, its mode and its branches. **Nothing took it down.** Find out whose it is, have them release it (`tim docker lease release --holder "<holder>"`) — a dead run's you release yourself — or take down a hand-started stack yourself, then launch again |
| `stack-failed` | The run could not start the workspace stack before its first increment, so it built nothing. The detail quotes tim; the start's log is under `<workarea>/logs/<run id>-lease/`. Fix the stack, then launch again. A detail that quotes no tim output, such as "Bash is not loaded", means the lease taker never ran its command: read its transcript, and fix its prompt rather than relaunching in hope (see the workflow README's stack lease section) |
| `baseline-red` | The tree was already red before the increment touched it. Nothing built on it would prove anything |
| `plan-refused` / `plan-outside-branched-repos` | The planner would not plan it, or planned work in a repo the increment did not branch. Also a plan whose checks still use a command form the workspace denies (`curl`, a `VAR=value` prefix, `bash <script>`) after one send-back, or that still writes code text (a comment to add, a test title, a quoted log message), or that the plan lint could not read: the detail names each one. Also a plan with a structural plan review finding still open after one send-back, named in the detail, or a plan reviewer that returned nothing. Detail findings still open never stop a row: they are built as required work. Nothing was built. A check is a repo's own npm script, `mvn -f`, `tim`, or a test — see the workflow README's Plan checks and The plan contract |
| `implement-failed` / `review-failed` / `fix-failed` | A stage died. The attempt is preserved as a pushed wip commit |
| `off-branch` | A repo left the run's branch and could not be moved back |
| `ladder-red` | The verification ladder went red. Preserved, not discarded. A failure that reads "denied form: <command>" is a plan check the workspace will not run, not broken code. A plan check that disagrees only with a stated departure by the implementor or fixer is a note in the ladder's summary, never a `ladder-red` on a green gate. An E2E spec that hit its test timeout is red even when its retry passed: only a transient 500 in `beforeEach` that recovers counts as a pass, so a journey that outgrows a spec's budget is repaired in the row that lengthened it, not by a later baseline. An e2e rung that went red or retried leaves each stack container's log beside it, as `gate-stack-after-<repo>-<rung>-<container>.log`, written before the stack goes: a 500 page, a dropped socket or a timeout is explained there, and is named, not called transient |
| `land-failed` | The commit could not be made. Also a theme's engineering review whose fixes could not be committed: they are saved as patches |
| `theme-review-red` | Branch lifecycle only. Every row of a theme landed, but its engineering review could not finish its fixes: the fixer died or its ladder went red. The fixes are saved as patches under `logs/` and nothing reached the branch. The detail quotes the failure. Rows already landed stand. Read the patches and the review checks, then launch again |
| `land-leaked` | The workspace repo's commit holds a file the workspace carried in, or run state under `workareas/` no stage reported changing. Nothing is pushed: take it out of the commit on the increment branch by hand, then launch again |
| `workspace-not-on-base` | The increment landed, but the workspace repo would not go back onto the base branch — usually a carried file the merged change also touches. The detail quotes git. Settle that file, switch back, then launch again |
| `pr-failed` | The branch pushed but the PRs could not be raised |
| `ci-red` | A PR did not go green inside `ciFixAttempts`. The PR stays open, the ticket stays In Dev. Under the branch lifecycle a PR that conflicts with its base is `ci-red` at once, with `stopReason: "pr-conflicting"` and no fix attempt spent. Also CI red after a theme's engineering review pushed its commit, with no fix attempt: the detail says so |
| `main-red` | `main` went red after a merge. **Nothing auto-reverts** — that is a human's call. With `stopReason: "base-branch-unverified"`, a workflow that `tim build push-workflows` says the merge commit starts has no run on `main`: check the repo's Actions page. A merge that starts no workflow at all (its files miss every push trigger's paths) is not a stop: it counts as green, and the run log names each workflow's reason |
| `awaiting-approval` | Every PR is green but at least one that needs approval — every PR under `requireApproval: true`, otherwise a repo whose entry sets it — has no approving review inside `approvalWaitMinutes`. **Nothing merged** — all of them stay open, untouched. When the increment builds the workspace repo, the workspace stays on the increment branch |
| `changes-requested` | A reviewer asked for changes. Nothing merged; every PR stays open and the run stops |
| `pr-left-open` | The merge stage's final sweep found an open PR still on the increment's branch in some repo — usually one a CI fixer raised elsewhere. Part of the increment merged; the rest did not |
| `done-failed` | The merge is real but the ticket would not move to the finished status. Under the branch lifecycle: the push is real but `tim backlog set --status done` failed |
| `row-invalid` | Branch lifecycle only. The row's `repos`, `merge` or `gatePhases` do not fit the run: a repo it does not configure, a merge into a repo the row does not build, a gate phase that does not exist |
| `merge-failed` | Branch lifecycle only. A merge the row asks for would not start. The attempt is preserved as patches and the merge aborted |
| `push-failed` | Branch lifecycle only. The land stage committed and recorded the commit, but the push was rejected: somebody else pushed to the branch. Nothing is lost; a human reconciles the branch. A theme's engineering review whose commit would not push stops here too |
| `no-open-pr` | Branch lifecycle only. A repo the row builds has no open PR for the branch, and this lifecycle never raises one. Before any increment, the run also refuses to start when any repo checked out on the branch, built by the rows or not, has no open PR: CI publishes a branch image only from a PR, so without one a stacked branch's E2E runs that repo's `:latest` |

**Every failure stops the whole run, not just that increment.** The loop never
skips to the next id after one goes wrong: `tim backlog next` selects on status
and `dependsOn` alone, so a failed attempt is still the next buildable
increment, and carrying on would either rebuild it or build on top of a failure.

The loop stops; what you do next depends on the reason. A platform or access
stop you park and relaunch ([step 3d](#3d-platform-or-access-stop-park-the-row-and-relaunch)).
`agent-budget` and `gate` you relaunch ([step 3e](#3e-relaunch-before-you-report)).
Every other stop you report, with the handover, and wait.

`ci-red` and `main-red` are not yours to repair. Report the URL and what was
failing. A `ci-red` caused by a platform setting is still not yours to repair:
park the row instead of stopping.

**`gate` is honoured regardless of `requireApproval`.** A row's own `gate`
field is a checkpoint somebody set deliberately on that specific increment —
data on the backlog, not a setting on the run — and it is unaffected by
whether the human approval gate is on or off. **Under the branch lifecycle a
gate never stops the run**: the run is unattended and merges nothing, so the
whole theme branch already waits for a person. The loop logs the gate's text
and returns it in `reviewChecks` (`{ id, check }`), and carries on; put those
checks in front of the reviewer when the theme finishes.

**A run is unattended end to end: no gate waits for a person mid-run.** Under the
full lifecycle the loop lands a gated row and stops. Add the gate's check to the
handover's review checks, then relaunch with the same args. The only hold on a
person is the finished work: under the branch lifecycle, the theme branch waiting
to be merged. Never launch a run that expects somebody to look part-way through.
`awaiting-approval` and
`changes-requested`, by contrast, fire only when `requireApproval: true`, or
when a repo of the increment sets it on its own entry.

**`pr-left-open` means the increment is half-landed, and the half that landed
does not auto-revert.** The merge stage sweeps every repo for an open PR on the
branch before it reports green, precisely because the list of PRs it was handed
is not proof of what the increment actually became — a CI fixer can raise one in
a repo the increment did not start with. Report which repo and which URL. Do not
merge the straggler yourself: it has not been through the watcher or the
approval gate, and merging it to clear the warning is worse than the warning.

**`awaiting-approval` is not a failure and must never be reported as one.** It
can only fire when `requireApproval: true`, on the run or on a repo's entry —
off by default, so this is something a programme opted into rather than
something this skill supplies for free. With it on, the loop merges only PRs carrying an approving review,
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

Resuming is free once somebody approves: `prs` stays populated, so the start stage puts
the increment back at `"ci"`, which re-checks the PRs and reaches the merge stage
again — this time finding the approvals.

`changes-requested` is likewise a human's, not yours. A reviewer asked a
question; answering it is the author's job. Do not push a fix, do not dismiss
the review, and do not argue with it in the handover — name the PR and what was
asked.

A run that stops short of `stopAfter` is not a failure — it is the loop telling
you reality diverged from the plan.

## Building one theme

A themed backlog is split by `tim backlog split` ([`DISTIL.md`](DISTIL.md#7-split-into-themes)) into one backlog per
theme, each at `workareas/<workarea>/themes/<theme id>/`. Each theme builds on its own machine, at the same time as
the others. Its themes never touch the same code ([`SHAPE.md`](SHAPE.md#themes)), so their pull requests do not
conflict.

- **Build the theme's workarea, never the parent's.** The `workarea` arg is `<workarea>/themes/<theme id>`, and
  `repos` is that split backlog's envelope `repos`, which holds only the repos the theme builds in. The parent
  stays the source for re-distilling.
- **Start in landing order.** `workareas/<workarea>/themes/themes.json` gives each theme's wave. Themes in wave 1
  start at once; a later theme can start once the rows it waits for are `done`. `tim backlog next` on its workarea
  prints NONE until then.
- **`externalDependsOn` is a wait on another workarea.** A row with one is buildable only when each row it names is
  `done` in that workarea's own `backlog.json`. `tim backlog next` and `tim build start` both read it there, so the
  other theme's landed state must be on this machine: pull the workspace repo before you launch. The loop never
  commits its `backlog.json` writes, so after a theme lands rows another theme waits for, commit and push that
  theme's `backlog.json`.
- **Which branch.** Under the full lifecycle each increment still cuts its own branch off `main` and merges there,
  and the split's `branch` is not used. To build a theme onto one branch instead, create the split's `branch` in
  every repo of its `repos`, open each pull request, and run `lifecycle: 'branch'` with `branch` set to it (see
  [Branch lifecycle](#branch-lifecycle)). The branch name is the same in every repo, as the workspace's branch rule
  needs.
- **Keep the plan inside the theme.** The split envelope's `touches` names the code the theme owns. A plan that
  must change code outside it would conflict with another theme: stop and re-distil instead.
- **Re-distil the parent, then split again.** Never edit a split backlog's rows by hand. A re-split keeps every row
  the loop has built or set aside, and the ticket, branch, commit and pull requests it wrote on the rest. A theme
  split off early is the exception: see below.

### Splitting a theme off early

When one theme is ready while the rest of the backlog is still being ruled on, split just that theme off and build
it on a second machine. Run a dry run, then the same with `--write`, in the parent workarea:

```bash
tim backlog split <workarea> --theme <theme id> --json
tim backlog split <workarea> --theme <theme id> --write --json
```

The theme's backlog lands at `<workarea>/themes/<theme id>/backlog.json`, as the full split writes it, and its rows
leave the parent `backlog.json` altogether. The parent keeps a pointer in `splitOff`, so re-distils do not draft
them again. The command lists each dependency it rewired: a parent row that waited on a moved row now waits on it in
the split backlog, a moved row that waited on a parent row waits on it in the parent, and a theme split off before
that waited on a row this split moved now waits on it in its new workarea. When `tim backlog check` on the parent
says a theme split off early waits on a row the parent no longer has, run
`tim backlog split <workarea> --relink --write --json`, then commit and push the split backlogs it changed.

- **Build it like any split theme.** Commit and push the workspace changes, pull them on the second machine, and
  launch the loop with `workarea` set to `<workarea>/themes/<theme id>` and `repos` from that backlog's envelope. To
  build onto one branch, use the split backlog's `branch`, as above.
- **Its backlog is the only copy.** A re-distil of the parent never rewrites it, and a later full split skips it.
- **Later rulings reach it through the report.** The report's "For the split branches" section names the branch and
  every requirement it must pick up, every one that changed and every one no longer to build. Add or rewrite rows
  in the split backlog for them, then update the parent's pointer as
  [`DISTIL.md`](DISTIL.md#8-splitting-a-theme-off-early) says.

### Moving rows to a second machine

To build some rows of a theme already building on one machine in parallel on another, move them into a new theme
backlog with `tim backlog split <workarea>/themes/<theme id> --rows <ids> --to <new theme id> --write --json`
([`DISTIL.md`](DISTIL.md#9-moving-rows-out-of-a-split-theme-to-a-second-machine)). It is safe while the loop runs
on the old backlog: `tim backlog next` there no longer offers the moved rows, and the old backlog keeps a `movedOut`
pointer to them.

- **Cut the new branch from the old one's tip,** once the row in flight has landed, and open its draft pull requests.
  The second machine runs the loop on `<workarea>/themes/<new theme id>` with that backlog's `repos` and `branch`.
- **Bring it back with a merge row.** Add a `chore` row to the old backlog that waits for every moved row through
  `externalDependsOn`, sets `merge` to `origin/<new branch>` for each repo, and says in its acceptance criteria
  that both sets of behaviour survive the merge and the full gate is green. Make the old theme's final row depend
  on it.

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
  `jiraInDevStatus`, `jiraDoneStatus`, `jiraBoard`, `requireApproval` and `approvalWaitMinutes` are passed as
  `null`. The loop refuses a value in any of them, because a value would suggest it governs the run.

  A theme built this way still gets its Jira tickets, from outside the loop: the orchestrating session runs the
  `theme-ticket` skill before it ("the build loop is starting on `<theme>`" — statuses to In Dev) and after it
  ("write the business tickets for `<theme>`" — one Story per service domain, acceptance criteria copied from
  `openspec/`). Keeping it outside is what preserves this guarantee.
- It never creates a branch, and refuses `main` and `master` as `branch`.
- It never creates, edits, retitles, un-drafts, closes or merges a pull request. Titles, bodies and draft state are
  a human's. A row whose acceptance is PR text (rewriting a PR body, lifting a draft) is not one this loop can
  build: give it a withheld status, or do it by hand.
- It never force-pushes. Every push is `git push origin refs/heads/<branch>:refs/heads/<branch>`.
- It never commits a failed attempt to the branch. The preserve step saves patches under `logs/`, aborts any merge
  in progress and stashes the rest. A local commit a stage made against the rules (overview and review inc-107 left
  one in the tests repo) is saved as `<id>-preserve-<repoKey>.commits.patch`, moved back off the branch with
  `reset --soft`, and stashed with the rest, so the next run's baseline does not build on it.

It runs on either executor. The Codex briefs take the configured repos, whatever their keys, and a Codex stage is
told about a merge in progress, a row that changes no backlog repo and a row whose `gatePhases` leave out unit,
exactly as a Claude stage is.

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
run**, then push the workspace. `openspec/` edits are not in that list: the land stage has already committed them. Give such a row `gatePhases: []`, because nothing in the backlog repos changes.

### Building the args

The same keys as above, with `lifecycle: 'branch'`, `branch` set to the working branch, and `null` for every Jira
key, `requireApproval` and `approvalWaitMinutes`. `repos` is the envelope's `repos` copied in full, whatever its
keys are, exactly as for the full lifecycle: the preflight and the branch stage both stop the run if the envelope
and the args name different repos. The worked example in
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
inDev         <inDev>
doneStatus   <doneStatus>
board        <board>
repos        <the repos table, one JSON object>
models       {}, the recommended split (think opus, code sonnet, light haiku)
stopAfter    <a number, or all>

Stopped: <reason>. Last landed <inc-NNN> (<PR url>, <ticket>).
<N> todo remain, <M> blocked, <K> dropped.
Parked: <none, or each id and the fix or access it needs>
Owed to a human: <none, or each thing and who owes it>
Review checks for the end of the theme: <none, or each gate's check, each theme's refuted findings, and each theme engineering review's commit and unreviewed repos>
Refuted findings not yet reviewed: <none, or each id, file and reason from refutedFindings>

Read workareas/<workarea>/PROGRAMME-NOTES.md and deferred.md before the first increment.
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
to Codex CLI via the briefs in [`../workflow/codex/`](../workflow/codex/). Baseline, plan, plan review, verify
findings, judge, the style re-review of the fix, ladder, land, the CI fixer and its style review, and a theme's
engineering review stay on Claude either way. Both executors build
from the same reviewed plan file, so the same backlog builds under either with no edit.
Codex mode is at most `40 + 3g` agents against `32 + 3g`, where `g` is the number of
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
- **Fix the factory; never work around it.** When the loop cannot build a kind
  of row (workspace-only changes, say), change the loop and tim so it can, as a
  factory change on its own branch with a PR, tests and docs. Once that has
  merged, add the row and let the loop build it. Never build a row outside the
  loop and never mark one "built by the orchestrator".
- **Never merge a PR yourself.** The loop merges its own green increments. A PR
  you raised by hand, a factory change or a straggler from `pr-left-open` merges
  only on the user's explicit go in this conversation, whatever a brief says.
- **Never end a turn idle while the run can carry on.** Relaunch first, then
  report ([step 3e](#3e-relaunch-before-you-report)).
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
