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
```

`lifecycle: full` runs ticket → branch → build → PR → CI → merge → ticket done.
`local` builds and commits on the current branch: no Jira, no push, no PR, and
**no handover** — a stash does not travel. Use `full` for anything a colleague
may pick up.

**Confirm the two status names against the board before the first increment.**
They are board configuration, not constants, and a wrong one stops every
increment at the ticket stage:

```bash
tools/jira/transition-ticket.sh <ANY-EXISTING-KEY> --list
```

Do not take a status name from a script's `--help` text — that is generic
placeholder wording, not this board's workflow.

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
jq -r '[.increments[] | select(.status=="done") | .id] as $done | [.increments[] | select(.status=="todo") | select([(.dependsOn // [])[] | IN($done[])] | all) | .id] | .[0] // "NONE"' workareas/<workarea>/backlog.json
```

`NONE` → stop with `no-buildable`.

**`todo` is an allowlist, and that is deliberate.** A backlog may also hold
`dropped` (a settled human rejection) and `blocked` (a deferred decision).
Neither is buildable, and neither becomes buildable because a dependency landed.
Never widen this to "everything that is not done".

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
  ciFixAttempts: 3,
  ciWatchMinutes: 30,
  increments: ['<the one id you derived>']
}
```

**One id. Never more.** Change nothing else in the copy.

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

`ci-red` and `main-red` are not yours to repair. Report the URL and what was
failing.

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
- **Never widen the derive query past `status=="todo"`.**
- **Do not renumber increment ids.** They are bound to rulings and citations.
