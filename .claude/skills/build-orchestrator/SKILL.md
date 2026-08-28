---
name: build-orchestrator
description: Drive an increment backlog through the increment-build-loop workflow, one increment at a time, from the main session. Derives the next buildable increment from backlog.json, runs the loop over it, checks it landed, and repeats until a set number of increments is done or something stops it — then prints a copy-paste handover prompt so a replacement agent resumes with no other context. Switches the executor between Claude and Codex, per run or between increments. Use when the user wants to build increments from a workarea backlog, resume a build run, or hand one over (triggers "orchestrate the build", "run the increment build loop", "build increments from", "build N increments", "resume the build run", "hand over the build"). NOT for authoring or ordering a backlog — that is parity or journey-builder. NOT for one already-agreed change to a repo — that is frontend-change or ticket.
---

# build-orchestrator

Runs `increment-build-loop.js` over a backlog, one increment per invocation,
from **the session you are in**. There is no orchestrator tier below you and no
subagent between you and the loop.

## Why there is only one tier

An earlier design put two orchestrators above the loop, so that a subagent could
absorb the diffs and test logs and then die with them. **It does not work: a
subagent cannot invoke the `Workflow` tool**, so the middle tier could never
start the thing it existed to drive.

It was also solving a problem that had already been solved. The loop's own
`agent()` calls are the death boundary — all `15 + 3n` of them live and die
inside the workflow, and the session that invoked it absorbs only the return
value. Your context grows by one short result per increment whether or not
anything sits in between.

So: you derive, you invoke, you check it landed, you go again.

## PARAMETERS

Ask for anything the user has not given, except where a default applies.

```
workarea      path under workareas/ holding backlog.json, e.g. shared/dr1-parity-union
branch        the BASE branch. Every increment cuts its own off this and merges back
scope         conventional-commit scope for landing commits
executor      claude (default) | codex
lifecycle     full (default) | local
stopAfter     how many increments to build before stopping. A number, or "all"
jiraProject   default EUDPA                        full only
epic          parent epic every raised ticket hangs off   full only
inProgress    the board's working status           full only
doneStatus    the board's finished status          full only
board         numeric id of the board tickets are moved onto. 13780 is
              EUDPA. Default 13780                 full only
requireApproval      whether EVERY PR of an increment needs an approving review
              on GitHub before the loop merges ANY of them.
              Default true                              full only
approvalWaitMinutes  how long the merge stage waits for those approvals before
              stopping with every PR open. Default 20   full only
```

`lifecycle: full` runs ticket → branch → build → PR → CI → merge → ticket done.
`local` builds and commits on the current branch: no Jira, no push, no PR, and
**no handover** — a stash does not travel. Use `full` for anything a colleague
may pick up.

**`requireApproval` defaults to true, and leaving it there is the point.** Green
CI proves the code runs; it does not prove anyone agreed to it. The default
exists because a run of this loop once put unreviewed commits onto a shared
`main`. Turning it off gives a programme unattended merges — ask for that
explicitly, and do not infer it from a user who simply wants the run to go
faster.

Because GitHub refuses to let an author approve their own PR, the approver is
always **somebody other than whoever the run is credentialed as**. A run under
this default is therefore not unattended: it will stop and wait for a colleague.
Say so when a user asks for a large `stopAfter`, rather than letting them find
out at the first increment.

**The gate covers the whole increment, not one PR at a time.** The merge stage
collects an approval for every PR before it merges any of them, so a reviewer who
approves the frontend and leaves the tests repo waiting no longer gets half an
increment on `main`. Tell a reviewer they owe the increment *all* of its PRs —
approving one of two is the same as approving neither.

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
   increment is 22–46 agents against a default guideline of 15. You cannot set
   this for the user and the run is throttled without it.
2. **Pull the workspace repo.** `backlog.json` is the state.
3. **Read `<workarea>/PROGRAMME-NOTES.md` if it exists.** It carries standing
   rulings, a do-not-build list and any ordering the programme imposes. Re-read
   it if the run is long; do not carry a stale copy in your head.

## THE LOOP

Repeat until a stop condition fires.

### 1. Derive the next increment

Once per increment, immediately after the previous one lands — never a list
chosen in advance. A list committed five deep throws away everything the first
increment teaches.

```bash
jq -r '["done","deferred","dropped","blocked","rejected"] as $withheld | [.increments[] | select(.status=="done") | .id] as $done | [.increments[] | select(.status | IN($withheld[]) | not) | select([(.dependsOn // [])[] | IN($done[])] | all) | .id] | .[0] // "NONE"' workareas/<workarea>/backlog.json
```

`NONE` → stop with `no-buildable`.

**Buildability is status and dependencies. Nothing else.** The five withheld
statuses are named explicitly and everything else counts as buildable, so an
unknown status fails **loudly** — it gets picked up and you see it — rather than
silently vanishing from the count. That direction matters: a query that reports
zero buildable work reads exactly like a finished backlog, which is the
expensive way to be wrong.

`dropped` is a settled human rejection and `blocked` is a deferred decision.
Neither becomes buildable because a dependency landed. "Never build this" lives
in the status, not in prose — if a programme's do-not-build list in
`PROGRAMME-NOTES.md` is long, that is a smell worth raising, because those
increments should carry a withheld status instead.

**Do not gate on how planned an increment looks.** A backlog says what is wrong,
what it cites as evidence and whether anyone has ruled on it. Working out what
to change is the implementor skill's job. So:

- Do not infer or require a planning field.
- Do not return `no-buildable` because an increment reads thin.
- Do not write a plan into the backlog to make one look ready.

A thin increment is buildable and gets built. **Thin is fine; wrong is not** —
what a thin increment still owes you is a claim that holds up.

Then check `PROGRAMME-NOTES.md` for a do-not-build list and for an imposed
order. Array order is the right default, not a rule.

### 2. Run the loop over it

**Never edit `.claude/workflows/increment-build-loop.js`.** It is tracked and
shared by every programme.

`args` plumbing is unreliable, so what decides a run is the `FALLBACK` const
written into the script file. Work from a fresh copy:

```bash
cp .claude/workflows/increment-build-loop.js workareas/<workarea>/build-loop.run.js
```

**Copy it fresh before every increment**, overwriting whatever is there. That
keeps the copy from drifting, and means the text you patch is always the
pristine `FALLBACK` rather than whatever the last increment left behind.

Patch `FALLBACK` in the copy **with the Edit tool** — read the file first, then
replace the whole const:

```js
const FALLBACK = {
  workarea: '<workarea>',
  branch: '<branch>',
  scope: '<scope>',
  executor: '<executor>',
  lifecycle: '<lifecycle>',
  jiraProject: '<jiraProject>',
  epic: '<epic>',
  jiraInProgressStatus: '<inProgress>',
  jiraDoneStatus: '<doneStatus>',
  jiraBoard: 13780, // the EUDPA board. Another programme's board is another id
  ciFixAttempts: 3,
  ciWatchMinutes: 30,
  requireApproval: true,
  approvalWaitMinutes: 20,
  increments: ['<the one id you derived>']
}
```

**One id. Never more.** Change nothing else in the copy.

Write `requireApproval` in explicitly, even though `true` is the loop's default.
The patched `FALLBACK` is what a person reads to see what governs a run, and a
merge gate that only exists as an unstated default is one a later reader will
not know to look for. Set it to `false` only where the user has asked for
unattended merges in as many words.

Then invoke it, passing `args` too — if they arrive they agree with `FALLBACK`,
and if they do not the patched copy is already right:

```
Workflow({ scriptPath: "workareas/<workarea>/build-loop.run.js", args: { ...the same shape... } })
```

The run copy is gitignored. Never commit it.

### 3. Check it landed

Do not trust the workflow's report on its own. One query:

```bash
jq -r '.increments[] | select(.id=="<id>") | .status + " " + (.commit // "-") + " " + ((.prs // []) | tostring)' workareas/<workarea>/backlog.json
```

- `done` → it landed. Continue.
- anything else → **stop.** Report the id, what the workflow said, and what the
  backlog says. Do not retry it and do not move to the next increment: an
  increment built on a broken one is worse than a stopped run.

Under `lifecycle: full`, landed means merged. The loop writes `ticket`, `branch`
and `prs` as soon as each exists, so a retry later resumes rather than raising a
second ticket.

### 4. Report one line, then go again

Per increment, to the user:

```
inc-NNN  landed   <title>            PR #123 · EUDPA-4567
```

Then derive the next one **before** writing any prose. Do not summarise the run
between increments; do not read the diff; do not open the test logs. Everything
worth reading already ran inside the workflow.

## STOP CONDITIONS

Stop and print the handover prompt when any of these fire:

| Reason | What it means |
|---|---|
| `count-reached` | `stopAfter` increments have landed. The ordinary ending |
| `no-buildable` | The derive query returned `NONE` |
| `gate` | The increment carried a designed HALT-FOR-REVIEW gate. The loop lands it, then stops |
| `not-landed` | Step 3 found a status other than `done` |
| `ci-red` | A PR did not go green inside `ciFixAttempts`. The PR stays open, the ticket stays in progress |
| `main-red` | `main` went red after a merge. **Nothing auto-reverts** — that is a human's call |
| `awaiting-approval` | Every PR is green but at least one has no approving review inside `approvalWaitMinutes`. **Nothing merged** — all of them stay open, untouched |
| `changes-requested` | A reviewer asked for changes. Nothing merged; every PR stays open and the run stops |
| `pr-left-open` | The merge stage's final sweep found an open PR still on the increment's branch in some repo — usually one a CI fixer raised elsewhere. Part of the increment merged; the rest did not |

`ci-red` and `main-red` are not yours to repair. Report the URL and what was
failing.

**`pr-left-open` means the increment is half-landed, and the half that landed
does not auto-revert.** The merge stage sweeps every repo for an open PR on the
branch before it reports green, precisely because the list of PRs it was handed
is not proof of what the increment actually became — a CI fixer can raise one in
a repo the increment did not start with. Report which repo and which URL. Do not
merge the straggler yourself: it has not been through the watcher or the
approval gate, and merging it to clear the warning is worse than the warning.

**`awaiting-approval` is not a failure and must never be reported as one.** The
loop merges only PRs carrying an approving review — `requireApproval` defaults
to true — and it merges none of an increment until all of them have one, so a run
that ends here did everything right, merged nothing, and is waiting on a person.
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

## THE HANDOVER PROMPT

Print this at every stop, in a fenced block, filled in. It is the whole
resumption mechanism: there is no ledger and no session state, because
`backlog.json` and git already hold everything.

**Push first** — `backlog.json` and any batch logs — or the handover names a
state the next machine cannot see.

````
Resume the <programme> build with the build-orchestrator skill.

workarea     <workarea>
branch       <branch>
scope        <scope>
executor     <executor>
lifecycle    <lifecycle>
jiraProject  <jiraProject>
epic         <epic>
inProgress   <inProgress>
doneStatus   <doneStatus>
board        <board>
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
to Codex CLI via the briefs in `.claude/workflows/codex/`. Baseline, verify
findings, judge, ladder and land stay on Claude either way: they are
orchestration and adjudication. Codex mode is `18 + n` agents against `15 + 3n`,
so it is markedly cheaper on a wide increment.

Switch by changing `executor` in the next increment's `FALLBACK` patch. **It
takes effect at the next increment and never mid-increment**, so a run can start
on Claude, move to Codex when the increments get wide, and move back. Say which
executor built each increment in your per-increment line.

Codex mode needs a Codex login. If a codex stage produces no result — non-zero
exit, no last-message file, unparseable JSON — the loop throws rather than
proceeding, because a crashed reviewer must never read as approval. That surfaces
to you as `not-landed`.

## GUARD RAILS

- **You orchestrate. You do not implement.** Do not edit repo source, do not fix
  a failing test, do not apply a review finding. If an increment needs work you
  are tempted to do by hand, that is a stop condition, not an invitation.
- **Do not read diffs, test logs or review argument.** They ran below a death
  boundary for a reason. Reading one to "just check something" is what fills the
  session and ends the run early.
- **Never edit the tracked loop.** Only ever the run copy.
- **One increment per Workflow invocation.** The loop accepts a longer list; do
  not give it one.
- **Never narrow the derive query to a planning field.** Status and
  dependencies decide buildability; a thin increment is still buildable.
- **Do not renumber increment ids.** They are bound to rulings and citations.
