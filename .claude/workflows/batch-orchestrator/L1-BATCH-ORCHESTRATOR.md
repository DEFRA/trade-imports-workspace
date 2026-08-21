# L1 — batch orchestrator

> The brief every spawned batch orchestrator follows. L0 spawns one L1 per batch and binds the
> parameters. L1 dies at the end of the batch, taking the batch's context with it.

## PARAMETER BINDINGS

L0 gives you these. Everything below resolves against them.

```
<workspace-tilde>  the workspace root, tilde form — use in Bash
<workspace-abs>    the workspace root, absolute — use for Read/Write/Edit
<workarea-rel>     path under workareas/, e.g. shared/<programme>
<workarea>         <workspace-tilde>/workareas/<workarea-rel> — use in Bash
<workarea-abs>     <workspace-abs>/workareas/<workarea-rel> — use for Read/Write/Edit
<backlog>          <workarea>/backlog.json
<branch>           the branch every repo in this programme is cut onto
<scope>            conventional-commit scope for landing commits
<executor>         claude | codex
<batch-number>     this batch's number
<budget>           the MOST increments you may build before returning. Not a target
<report-path>      where your full batch report goes
```

**You are given a budget, not a list.** L0 does not know which increments this batch will build and
must not be told in advance. You derive each one from `backlog.json` after the previous one lands.

Repo paths: `frontend` = `repos/trade-imports-animals-frontend`, `backend` =
`repos/trade-imports-animals-backend`, `tests` = `repos/trade-imports-animals-tests`.

## YOUR JOB

You own **all** the noisy work for this batch. You choose each increment, drive the build, read the test
output, verify the landings, keep `backlog.json` honest, and write the batch report to disk. Then you
return **at most about 15 lines** to L0 and die. Everything else you read stays with you and goes away.

**You orchestrate. You never implement.** If you find yourself editing a source file in a repo, stop —
that belongs to the increment loop.

## THE SHAPE OF A BATCH

Repeat, at most `<budget>` times:

1. Derive the **next single** buildable increment from `backlog.json`.
2. Check its plan against the system.
3. Build it — **one** increment per Workflow invocation.
4. Verify it landed.
5. Go back to 1.

**Re-derive every time.** The increment that just landed may have satisfied a dependency, changed a
status, inserted a new increment or invalidated the next one's premise. Deriving the whole list up
front would throw all of that away — it is the reason the loop is serial in the first place.

**Return early the moment reality diverges.** Returning after two of a budget of five is a **success**,
and L0 treats it as one. Never build a further increment to make the number look better; a padded
batch is a worse outcome than a short one.

Stop and return when any of these is true:

| Reason | Meaning |
|---|---|
| `budget-spent` | You built `<budget>` increments. The only "full" ending |
| `no-buildable` | Nothing is buildable any more — dependencies unmet, or only unplanned stubs left |
| `premise-invalidated` | What just landed removed the next increment's basis, and it needs re-planning rather than a patch |
| `gate` | The increment carried a designed halt gate. The loop lands it, then stops |
| `increment-failed` | Baseline red, implement failed, or a red ladder rolled back |

## GUARD RAILS

- **NEVER use the Grep or Glob tools.** Use Bash `grep -rn` / `find` / `ls` / `jq`.
- **One command per Bash call.** No `&&`, no `;`, no shell `|`, no `cd`. Use `git -C`, `npm --prefix`,
  `mvn -f`. Redirection (`> file 2>&1`) is allowed. A `|` inside a quoted `jq` program is a jq operator
  and is fine.
- **Tilde paths in Bash.** A literal `/Users/...` in a Bash command is denied, including inside a prompt
  string you are writing. Absolute paths for the Read/Write/Edit tools.
- Never bare `node` / `node -e` — wrap it in an npm script. **Never run `sonar`**; it is a milestone
  gate the user runs.
- **Tests go to a file** under `<workarea>/logs/` and you read that file **once**. Never grep streaming
  output. Never re-run a suite to see it again.
- For Playwright failures read `test-results/*/error-context.md`, not the tail of the run.
- **Rollback is always `git stash push -u`.** Never `reset --hard`. Never `clean -fd`. The stash is
  recoverable and that is the whole point.
- **`jq` cannot edit in place.** Write to a temp file, `jq empty` the temp file, then `mv` it over the
  target. Three calls.
- **`sleep` is blocked.** Wait with a backgrounded `until` loop.
- **Headless.** Never ask a question. Decide, record the decision in the batch report, keep going.

## STEP 0 — validate the backlog, then derive the next increment

Steps 0 to 4 are the **per-increment loop** and repeat up to `<budget>` times. Steps 5 to 8 run **once**,
after the loop ends however it ends.

The four validation queries below run once at the start of the batch, and again after any edit you make
to `backlog.json`. Every one must be clean before you build anything.

```bash
jq empty <backlog>
```
```bash
jq -r '[.increments[].id] as $i | [.increments[].dependsOn[]] | unique | map(select(. as $d | ($i | index($d)) == null))' <backlog>
```
```bash
jq -r '[.increments[].id] as $i | [range(0; ($i | length)) as $n | .increments[$n] | .dependsOn[] as $d | select(($i | index($d)) >= $n) | .id]' <backlog>
```
```bash
jq -r '[.increments[].id] | length, (unique | length)' <backlog>
```

Expected: exit 0; `[]` (no dangling dependency); `[]` (no forward dependency); two equal numbers (no
duplicate ids). **Run these again after every edit to `backlog.json`.** A backlog that stops parsing
mid-batch loses the plan of record.

If the programme has a `<workarea>/PROGRAMME-NOTES.md`, read it now. It holds the standing rulings, the
do-not-build list, the stack incantation and the known flaky bands for this programme. It is where
programme facts live; this file holds only method.

### Deriving the next increment — run this before EVERY increment

Not once per batch. Once per increment, immediately after the previous one lands:

```bash
jq -r '[.increments[] | select(.status=="done") | .id] as $done | [.increments[] | select(.status!="done" and .status!="deferred") | select([.dependsOn[] | IN($done[])] | all) | select(.sizeGuess != null) | .id] | .[0] // "NONE"' <backlog>
```

`NONE` means stop and return with `no-buildable`.

**⚠ THAT QUERY LIES BY OMISSION.** The `sizeGuess != null` filter silently drops **unplanned stubs** —
increments that are a title and nothing else. Run its companion each time so you know what it withheld:

```bash
jq -r '[.increments[] | select(.status=="done") | .id] as $done | .increments[] | select(.status!="done" and .status!="deferred") | select([.dependsOn[] | IN($done[])] | all) | select(.sizeGuess == null) | "WITHHELD, UNPLANNED: \(.id)"' <backlog>
```

**Never build an unplanned stub.** Building one means inventing the plan on the spot, and an invented
plan is the most expensive thing that can enter this loop. Record any it withheld in your batch report
and on your `owed-to-human` line — they need planning, which is not your job.

Also check the programme's do-not-build list in `PROGRAMME-NOTES.md`. If the derived id is on it, skip
it and take the next one; if that empties the set, return `no-buildable`.

**Array order is not build order.** Taking `.[0]` gives you the first buildable increment in array
order, which is the right default, but the programme's notes may impose a different sequence. Where
they do, follow them and record why.

## STEP 1 — CHECK THE PLAN. THE FOUR WAYS IT LIES

Read the increment you just derived, in full, before it is built:

```bash
jq '.increments[] | select(.id=="<id>")' <backlog>
```

**On a long build, most defects worth catching come from the plan, not the code — and the suites stay
green throughout, so nothing red will tell you.** Check the plan against the system before you spend a
build on it. Four failure modes, all of them observed on real increments:

1. **A `create` path that already exists, or an `edit` path that does not.** `ls` every path in
   `filesToTouch`. This is the most common and the cheapest to catch.
2. **A cited line number that is exact while its value is wrong.** A citation ages badly: the line is
   still there, what is on it has moved on. **Read the line. Never trust the citation.**
3. **An acceptance criterion asserting behaviour the application does not have.** A criterion written
   from a plan is not evidence about the system. If an AC demands a redirect, a cookie or an empty
   state, go and find it in the source before the implementor wastes a pass discovering it does not
   exist.
4. **A claim you wrote yourself an hour ago is still a claim to check.** Your own notes from earlier in
   this batch carry no more authority than anyone else's.

**Check it against what just landed, not just against the backlog.** After the first increment of the
batch, the system has moved. The increment you are about to build was planned against an older tree,
so the previous landing is the most likely thing to have invalidated it.

Where a check fails you have two moves:

- **Correct and continue** when the fix is evidenced and mechanical — a path that moved, a stale line
  citation, a criterion that needs re-wording to match what the application does. Edit the increment in
  `backlog.json`, cite the path you listed or the line you read, revalidate, and build it.
- **Return early with `premise-invalidated`** when the increment's central premise is gone and what it
  needs is re-planning, not a patch. Write what you found into the increment's `notes` so the next
  attempt starts informed, add it to `notLanded` with outcome `premise-invalidated`, and stop.

Deciding between them is your call and you make it without asking. **Do not hand a plan you know is
wrong to the loop**, and do not rewrite an increment into a different piece of work to avoid stopping.

Rule the increment's `openQuestions` explicitly, **with evidence rather than preference**, and write
your ruling into the increment's `notes` so the implementor inherits it.

## STEP 2 — VERIFY YOUR BASELINES YOURSELF

**Never quote a baseline forward.** A test count from a previous batch, a report or this file is a
claim, not a measurement. Before the batch's **first** increment, run the suites for its repo to logs
under `<workarea>/logs/`, and read each log once. Record the real numbers in the batch report.

For each later increment you need a baseline for the repo **it** touches. Where that is a repo you have
not measured this batch, measure it. Where it is one you have, the previous increment's own ladder is
your fresh measurement — use it rather than re-running the suite, and say in the report that you did.

The loop's own baseline guard refuses to start on a dirty tree or a red suite, so this is not
redundant — it is what lets you tell "the loop refused" apart from "the loop found a real regression".

**Any test count that moves must be explained, especially downward.**

## STEP 3 — DRIVE THE INCREMENT LOOP, ONE INCREMENT AT A TIME

### Primary path — a fresh run copy of the loop

**One increment per Workflow invocation.** The `increments` list you pass has exactly one element. The
loop accepts a longer list and would run it serially, but a list is a plan committed in advance — and
committing a plan is the thing this design exists to avoid. Invoking once per increment is what makes
re-derivation possible at all.

**`args` plumbing is unreliable in this runtime.** When `args` does not arrive, the loop reads the
`FALLBACK` const at the top of the script instead — so the config that actually decides what gets built
is the one written into the file. You therefore run the loop from **your own copy**, with `FALLBACK`
patched to the single increment you are building.

**Never edit `.claude/workflows/increment-build-loop.js`.** It is tracked, it is shared by every
programme, and you may die before you could restore it.

**1. Copy it fresh — before EVERY increment**, overwriting whatever is there. One Bash call:

```bash
cp <workspace-tilde>/.claude/workflows/increment-build-loop.js <workarea>/build-loop.run.js
```

Re-copying before every increment does two jobs. It stops the run copy drifting from the tracked loop,
and it means the text you patch is always the **pristine** `FALLBACK` — so your Edit matches on the
same known string each time instead of on whatever the previous increment left behind. A stale copy
from a dead L1 is harmless for the same reason: you overwrite it before you read it.

Never skip the copy because one already exists, and never "fix up" the existing one.

**2. Patch `FALLBACK` in the copy with the Edit tool** — not `sed`, not a heredoc. Read
`<workarea-abs>/build-loop.run.js` first, then replace the whole const:

```js
const FALLBACK = {
  workarea: '<workarea-rel>',
  branch: '<branch>',
  scope: '<scope>',
  executor: '<executor>',
  increments: ['<the one id you derived>']
}
```

**One id. Never more.** Change nothing else in the copy. If you find yourself editing any other line,
stop — a divergence between the run copy and the tracked loop is a defect, and the next copy will
silently erase your evidence of it.

**3. Invoke the copy:**

```
Workflow({
  scriptPath: "workareas/<workarea-rel>/build-loop.run.js",
  args: {
    workarea: "<workarea-rel>",
    branch: "<branch>",
    scope: "<scope>",
    executor: "<executor>",
    increments: ["<the one id you derived>"]
  }
})
```

Pass `args` as well. If they arrive the loop uses them; if they do not, the patched `FALLBACK` says the
same thing. Either way the run is correct, and there is no failure to detect and recover from.

The loop resolves every path from absolute constants at the top of the file, not from its own location,
so a copy in the workarea behaves identically to the tracked original.

The loop still runs its own preflight, baseline guard and stop-at-first-failure logic inside this single
increment. Do not try to work around any of it.

**4. Confirm you left the tracked loop alone**, once per batch, before you return:

```bash
git -C <workspace-tilde> status --short .claude/workflows/increment-build-loop.js
```

Empty output is the pass. Anything else means something edited the shared loop — report it on your
`blocked` line, because L0 is forbidden from reading that file and cannot see it for itself.

**5. Report the path you ran** as `scriptPath` in your report, so the ledger records which script
produced the batch.

⚠ Under `workareas/shared/`, the workspace tracks files by default, so `build-loop.run.js` will appear
as untracked in `git status` unless the workspace `.gitignore` excludes it. Check once per batch:

```bash
git -C <workspace-tilde> check-ignore -q <workarea>/build-loop.run.js
```

Exit 0 means it is ignored and there is nothing to do. A non-zero exit means it is not — put
`workareas/*/*/build-loop.run.js needs a .gitignore line` on your `owed-to-human` line. **Do not add the
line yourself** and do not commit the run copy; a `.gitignore` edit is a workspace change, not
programme work.

### Fallback path — brief Codex per increment

**It is not certain that a subagent can invoke the Workflow tool at runtime.** If the tool is not in
your toolset, or the invocation errors, fall back to driving Codex directly, one increment at a time,
and set `driver: codex-direct` in your report.

The briefs are generic and already written: `<workspace-abs>/.claude/workflows/codex/` with output
schemas under `codex/schemas/`. Per increment, per stage (`implement`, then `review`, then `fix`):

1. Write `<workarea>/briefs/<id>-<stage>.md` with the Write tool. It **overrides** the generic brief.
   Lead with the three or four things most likely to go wrong, each with the evidence you gathered in
   Step 1. Name the decisive mutation you expect to work.
2. Run one `codex exec` against it, in the background, redirected to a log:
   ```bash
   codex exec -C <workarea> --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true --output-schema <workspace-tilde>/.claude/workflows/codex/schemas/<schema>.json -o <workarea>/logs/codex/<id>-<stage>.lastmsg.txt "Read <workarea>/briefs/<id>-<stage>.md and follow it in full." < /dev/null > <workarea>/logs/codex/<id>-<stage>.log 2>&1
   ```
   **`< /dev/null` is load-bearing.** Without it Codex blocks forever on stdin, writes 39 bytes and
   never returns.
3. **After launching, `wc -c` the log.** A few KB means alive. **39 bytes means hung.**
4. Check it produced a result: `jq empty <workarea>/logs/codex/<id>-<stage>.lastmsg.txt`.
5. Schemas are `increment.json` and `findings.json`. There is no `review.json`.

**The review stage is mandatory. `<workarea>/logs/codex/<id>-review.lastmsg.txt` must exist and must
pass `jq empty` before you commit.** Tell the reviewer what you have already checked and which axes
have had no attention at all.

**A stage that could not run is not a clean stage.** A non-zero exit, a missing last-message file or
unparseable JSON halts the increment. A crashed reviewer must never read as approval.

Then triage the findings yourself against the source, apply what is real via a `<id>-fix.md` brief
(tell the fixer to `git status` first and **not start over**), run the ladder, and commit. Findings on
**staged** work get fixed now. Findings on **already landed** work become new increments — never a
quiet amend.

## STEP 4 — VERIFY WHAT BOTH OF THEM CLAIM

The loop reports. Codex reports. **Verify both yourself.** Per increment:

- The commit exists and its subject names the increment: `git -C <repo> log --oneline -n 3`.
- The backlog says `done` with a `commit` field:
  ```bash
  jq -r --arg id "<id>" '.increments[] | select(.id==$id) | "\(.status) \(.commit // "NO COMMIT FIELD")"' <backlog>
  ```
- The tree is clean: `git -C <repo> status --short`.
- Everything the increment's `filesToTouch` listed is in the commit, and nothing is in the commit that
  was not listed: `git -C <repo> show --stat <sha>`.

**Verify a failure claim before acting on it.** A subagent reporting a 500, a red suite or a broken
container may be reporting its own environment. Reproduce it yourself. Where you cannot reproduce it,
raise the **evidenced** gap rather than a speculative bug.

**An `ok:false` is often the most valuable outcome.** An implementor that refuses an instruction
because the system does not support it has usually found a real defect in the plan. Treat a refusal as
a finding, not a failure.

**Never invent data.** Not a fixture, not an org, not an address, not a test count. If a value is
needed and not available, that is a finding.

**Then go back to Step 0 and derive the next increment**, unless your budget is spent or one of the
early-return reasons has fired. The verified landing you have just confirmed is the input to that
derivation — that is the whole point of doing it one at a time.

## STEP 5 — ONE DECISIVE MUTATION PER BATCH

Once, after the increment loop has ended. If the batch landed nothing, skip it and say so.

Pick the batch's highest-risk landing — usually the one with the widest blast radius or the thinnest
test — and break it deliberately on **an axis the increment's own tests did not choose**. The suite must
go red.

Then discard the mutation with `git stash push -u -m "mutation-<id>"` and confirm the tree is clean
with `git -C <repo> status --short`. The stash keeps it recoverable. **Never `reset --hard`, never
`clean -fd`** — a mutation is easy to re-derive, but the habit is not one you want to break for.

**A green mutation is not proof. Five ways a mutation lies:**

1. **Inert, falsely confirming** — a deeper layer masked the change, so the test never saw it.
2. **Inert, falsely refuting** — the change never reached the running code at all (a CSP blocking an
   injected style, a cached build).
3. **Malformed, falsely refuting** — a half-applied edit failed for the wrong reason.
4. **Intercepted by a shallower layer** — a pre-existing unit test caught the mutation and failed the
   build before it ever reached the layer under test. Run the deeper goal directly.
5. **The guarantee is not observable** — removing a sort tiebreak can leave an integration test green
   because the database is not obliged to vary, only permitted to. The defect is the **absence of a
   guarantee**, not an observed failure. When a mutation goes green, ask whether the property is even
   observable before concluding the pin is missing.

Record which mutation you ran, on which axis, and what it proved.

## STEP 6 — THE CHECKS THAT ACTUALLY CATCH THINGS

- **Real defects are not found by tests failing.** They come from reading source a plan asserted was
  fine, from an implementor refusing an instruction, and from a reviewer reading a citation.
- **The blindness is often in the query.** A locator that also matches the page footer. A wait on a
  results label whose regex also matches "0 results", so a "populated" scan passes on an empty page. A
  `grep` for tests that also matches a test-only configuration class. Before you believe a green scan,
  check what else your own query matches.
- **Hand-authored fixtures standing in for what the system produces.** Ask what every fixture is a copy
  of. A stale value corrected in two places is usually still alive in a third.
- **A failing assertion hides the one after it.** When you fix a wrong criterion, expect a second
  failure behind it and go looking.
- **Prefer a structural pin that kills the class — then check the pin's own exemption.** A pin matching
  raw source text is bypassed by an aliased import.
- **Demand a middle.** A two-element collection has no middle. If a test needs first, middle and last,
  three elements is the minimum and "substituted first for middle" is a failure.
- **Any test count that moves must be explained.**

## STEP 7 — WRITE THE BATCH REPORT

Write the full report to `<report-path>` with the Write tool. Create `logs/batches/` if it does not
exist. This is the only durable record of what happened in this batch — L0 stores its path and never
opens it, so anything you leave out is lost.

Cover:

- The batch number, its budget, the ids you derived **and why each one came next**, and the real
  baselines you measured.
- Why you stopped, and — if you returned early — what diverged. This is the most useful thing in the
  report: it is the record of reality contradicting the plan.
- Which script ran the batch, and confirmation that the tracked
  `increment-build-loop.js` was left untouched.
- Per increment: outcome, commit SHA, findings raised / confirmed / fixed, and anything the loop or
  Codex claimed that you could not confirm.
- Every plan correction you made, with the evidence.
- Every `openQuestions` ruling, with the evidence.
- The decisive mutation: what you broke, on what axis, what happened.
- Deviations and under-delivery, stated plainly. Under-delivery means an increment that landed but did
  less than its acceptance criteria claimed — say so rather than letting the commit imply otherwise. A
  short batch is **not** under-delivery and needs no defending; it needs its reason recorded.
- Anything owed to a human: `sonar analyze --staged`, tickets to raise, a gate that fired.

## STEP 8 — WHAT YOU RETURN TO L0

**At most about 15 lines. No prose paragraphs. No diffs, no logs, no findings text.** L0's context
depends on this being short.

```
batch: <batch-number>
budget: <budget>
driver: workflow | codex-direct
script: workareas/<workarea-rel>/build-loop.run.js | n/a
attempted: <id> <id> <id>
landed: <id>=<sha> <id>=<sha>
not-landed: <id>=<outcome>
ended-early: budget-spent | no-buildable | premise-invalidated | gate | increment-failed
stashes: <ref> (only if something was rolled back)
backlog: <done> of <total> done, <todo> todo, <deferred> deferred
trees-clean: frontend=yes backend=yes tests=yes
gate: none | <increment id>: <one line of the gate text>
blocked: none | <one line>
owed-to-human: none | <one line>
report: <report-path>
```

`attempted` is every id you started, landed or not, in the order you derived them. L0 needs it to
reconcile if a later batch dies.

`ended-early` is required. `budget-spent` is the only value meaning you used the full allowance;
every other value is a deliberate early return. **Do not apologise for one and do not pad the batch to
avoid one** — L0 reads a short batch as a success.

If a designed `gate` fired, say so on the `gate` line as well. **L0 will stop the whole run**, which is
correct — a gate is a human checkpoint by design, not a review finding.

## LANDING RULES

- The loop commits; **it never pushes.** Pushing is the user's call.
- Commit subject is `<type>(<scope>): <increment title>`. The body is where a future reader learns
  **why** — record deviations, what was deliberately not fixed, and **what you did not verify
  yourself**. Trailer:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```
- Nothing under `logs/`, no coverage output, no `test-results/` and no Playwright artefacts go into a
  commit.
- **Test failures on this branch are yours.** "Pre-existing" and "separate issue" are not available. Red
  on your branch means you fix it now, whatever its provenance.
- A red ladder rolls back with `git stash push -u`, records the failure and the stash ref in the
  increment's `notes`, and **stops the batch** — return with `increment-failed`. Do not build the next
  increment on top of a failure, and do not derive a different one to fill the budget.
- **Never end a turn idle** while the batch is running. Order per increment: verify → review → commit →
  update the backlog → revalidate → start the next increment → then write anything.
