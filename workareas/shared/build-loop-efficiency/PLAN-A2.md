# A2: resume from the stage a row reached — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a relaunch pick a row up at the stage its last attempt reached, rather than re-planning and re-implementing it from the top. The row records the stage, the loop restores the preserved work, proves it with the cheap gate phases, recovers the reviewed plan from the plan file, and enters the pipeline at that stage. A `resumeFrom` argument overrides the record.

**Architecture:** The resume point is already derived, by `resumePointFor` in `tim/src/build/start.js`, from the row's `commit` and `prs` — everything before the land stage collapses to one value, `"build"`. This plan subdivides `"build"`. A new row field `attempt` records the stage an attempt reached, what state its work is in and whether the plan was reviewed; `resumePointFor` reads it; the loop gains a restore stage, a plan reader, and labelled entry points into the `build:` block it already has. Three fallback rules keep a resume from ever building on work that is not there or not green.

**Tech Stack:** Node.js ESM, vitest, zod (tim's option schemas), JSON Schema (`backlog.schema.json`), the `Workflow` runtime's `agent()`/`log()`/`phase()` hooks, and the simulated workflow runtime in `tim/src/test-support/workflow-runtime.js` that the contract test drives.

**Design this implements:** `workareas/shared/build-loop-efficiency/DESIGN.md`, section A2.

**Read "What already resumes, and what does not" and "The resume points this plan adds" below before Task 1.** The first corrects an assumption the design makes; the second is the decision table every later task implements.

---

## Background an engineer needs before Task 1

**What the loop is.** `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js` (6,175 lines) is a `Workflow` script. It is launched by `scriptPath` with an `args` object and spawns subagents through `agent()`. It is never run directly; it is exercised by a simulated runtime in tests. **The script itself cannot run a command** — every read and write of the tree or the backlog is an agent running Bash and reporting structured output. That constraint decides several shapes below.

**How the loop is tested.** `tim/src/backlog/workflow-contract.test.js` (9,597 lines) is the loop's test suite. `runLoop(path, { args, answers })` at line 268 executes the script against a fake runtime and returns a run with `agents` (each entry carrying `prompt` and `options`), `logs`, `result` and `error`.

**`answers` takes two forms.** A positional array, each entry answering the next agent in order (skipping the stages `answeringRunLease` handles itself — the run lease, the plan lint and review, the theme check):

```javascript
answers: [WORKSPACE_ANSWER, PREFLIGHT_ANSWER, START_ANSWER, ...]
```

or a function of `(prompt, { label })` returning an answer per agent label, which is what the lifecycle describe blocks use (`workflow-contract.test.js:7898-7917` is the pattern to copy). The function form is the one to use for every test in this plan: a resume changes which agents run, so a positional array would have to be re-counted on every change.

`WORKSPACE_ANSWER` is a file-level constant; `PREFLIGHT_ANSWER` (`{ ok: true, summary: '1' }`), `START_ANSWER`, `runFrom(...)` and `baselinePrompt()` are local to the describe block at `workflow-contract.test.js:897-905`. `startedResult(fields)` at `:297` builds a `tim build start` result, and `startAnswer(result)` at `:279` wraps it in tim's JSON envelope. `promptOf(run, label)` and `stageLabels(run)` are the two readers most of these tests need.

Run the suite with:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

**The argument contract.** Every argument is required. `ALWAYS_REQUIRED` at `increment-build-loop.js:52-71` lists them; `requireKeys` at line 41 throws naming any that are missing, before any agent starts. The same list is mirrored in the test's required-keys map at `workflow-contract.test.js:95-123`, so the two must change together. `BASE_ARGS` at `workflow-contract.test.js:140` is the fixture every loop test starts from. `e2e` at line 71 is A1's key and the closest precedent for `resumeFrom`: a required key with a small vocabulary, validated just after the config block at `:103-111`.

**The row is the record.** Stages write to the backlog only through `tim backlog set <workarea> <id> <flags>`, rendered by `setRow` at `increment-build-loop.js:422`. The command is defined at `tim/src/commands/backlog/rows.js:228-258`, its options validated by `parseSetOpts` at `:108-140` against `setOptsSchemaFor` at `:35-57`, and applied by `setRowFields` at `tim/src/backlog/shape.js:417-451`: scalars replace, `note` and `openQuestion` append, `pr` upserts by url. The row's shape is `.claude/skills/requirements-pipeline/references/backlog.schema.json`; the fields the loop writes are described at lines 414-434 (`ticket`, `branch`, `commit`, `prs`). The `increment` definition sets no `additionalProperties: false` — "Other fields are allowed, because older backlogs carry more" — so a new field needs no migration and an older backlog without it stays valid.

**Preserving an attempt, which differs by lifecycle.** `preserveAttempt` at `increment-build-loop.js:1418-1432` takes a `phaseName` and runs one of two prompts:

- **Full lifecycle** — `preserveWork` at `:1348`. The attempt becomes a `wip(<scope>): <title> — <reason>` commit on the increment's own branch, pushed `refs/heads/X:refs/heads/X`, with the branch and SHA recorded in the row's `--note`. It deliberately records **no** commit, "because a recorded commit would make the next attempt skip the build". The next attempt branches from there and builds on top.
- **Branch lifecycle** — `preserveWorkOnBranch` at `:1375`. The branch is shared and has open pull requests, so nothing may be committed to it: the attempt is saved as `.staged.patch`, `.unstaged.patch`, `.unresolved.txt` and `.status.txt` files under `<workarea>/logs/`, any local commits are moved back with `reset --soft` and saved as `format-patch` output, any merge is aborted, and the trees end clean. The branch stage (`assertBranch`, `:3564`) then **requires** every configured repo to be clean and not mid-merge on the next launch — "a dirty tree or a merge left in progress belongs to an earlier attempt".

So under one lifecycle the work is a commit at HEAD, and under the other it is patch files on disk. Both are restored inside the `build:` block, after the branch stage has passed.

**The gate and the cheap phases.** `tim build gate <workarea> --phase unit|fit|e2e|all` runs the rungs `references/gates.json` lists per repo. `GATE_PHASES` is `['unit', 'fit', 'e2e']` (`:852`); `OFFERED_GATE_PHASES` (`:853`) drops `e2e` under `e2e: "ci"`; `BUILDER_PHASES` is `['unit', 'fit']` (`:921`) — already the design's "re-run unit and FIT". `baselineGateStep(phases, logs)` at `:3706` renders one `--phase all` command when a row owes every phase and one command per phase otherwise, and `gateLogs(id, stage)` at `:855` names the log directory.

**House rules.** `.claude/rules/code-quality.md` governs comments, names and tests, and wins over anything in `docs/best-practices/`. Read it in full before writing code. In particular: no comment that restates the code, and a test name says the behaviour, not the mechanism.

**Branch.** Every task lands on one branch:

```bash
git -C ~/git/defra/trade-imports-workspace checkout -b chore/NO_JIRA-build-loop-resume
```

---

## What already resumes, and what does not

The design says "There is no `stageReached` or `resumeFrom` anywhere in the loop today." The second half is right; the first understates what is there. **A resume mechanism already exists, and it is the thing to extend rather than to invent.**

`resumePointFor` at `tim/src/build/start.js:75-81`:

```javascript
export const resumePointFor = ({ commit, prs }) => {
  const list = Array.isArray(prs) ? prs : []
  if (list.length > 0) {
    return list.every((pr) => pr.merged === true) ? 'done' : 'ci'
  }
  return commit ? 'pr' : 'build'
}
```

Its doc comment states the principle this plan keeps: the point comes "from what the backlog already records and nothing else: never from the ticket's status, which people move for reasons the loop cannot see."

The loop acts on it in two places. `increment-build-loop.js:4871`:

```javascript
  build: {
    if (resumeAt !== 'build') {
      log(`${id}: already built on ${workBranch} — skipping to ${resumeAt}`)
      break build
    }
```

and `:5749`, which skips the finish block for a row already `done`. Under the branch lifecycle the same value comes from the branch stage, which reads `commit` and `prs` with `jq` and reports it (`BRANCH_ROW_SCHEMA.resumeAt` at `:3559`, the instruction at `:3596`).

So today:

| Row records | `resumeAt` | What a relaunch re-runs |
|---|---|---|
| every `prs` entry merged | `done` | nothing |
| `prs` non-empty | `ci` | CI watch, merge, done |
| `commit` set | `pr` | PR, CI, merge, done |
| neither | `build` | **baseline, plan, plan review, implement, review, verify, judge, fix, ladder, land** — all of it |

Every stop before the land stage lands in that last row. That is the five hours on inc-221 and the four rebuilds on documents: the work was preserved, the plan was on disk, and both were ignored because the only thing distinguishing "nothing happened" from "everything but the ladder happened" was a free-text `--note`.

Sam's fourth part — get a parked attempt somewhere another machine can resume it — is done, as the design says. What is missing is a machine-readable record of how far the attempt got, and the entry points to use it.

---

## The resume points this plan adds

**The vocabulary.** `resumeAt` gains three values between `build` and `pr`, in pipeline order:

```
build → implement → review → ladder → pr → ci → done
```

| Value | Means | A relaunch re-runs |
|---|---|---|
| `build` | nothing worth keeping | everything (today's behaviour) |
| `implement` | the plan at `plans/<id>.md` passed its lint and review | implement, review, verify, judge, fix, ladder, land |
| `review` | the code is written and staged | review, verify, judge, fix, ladder, land |
| `ladder` | the code is written, reviewed and fixed | ladder, land |

**Which stop records which stage.** `preserveAttempt` already receives the `phaseName` of the stage that failed, so the map needs no new information:

| `phaseName` at the preserve | Stop reasons | Recorded stage |
|---|---|---|
| `Implement` | `merge-failed`, `implement-failed`, `off-branch` after implement, `stack-held` at implement | `implement` |
| `Review` | `review-failed`, `stack-held` at the consistency reviewer | `review` |
| `Verify findings`, `Fix` | `fix-failed`, `stack-held` at a verifier or the fixer | `review` |
| `Land` | `ladder-red`, `land-failed`, `off-branch` before land, `stack-held` at the ladder | `ladder` |

A stop that does not preserve records nothing, which is correct: `baseline-red` found the tree red before the row touched it, and `plan-refused` has no plan to trust. `land-leaked` and `push-failed` already have a commit on the row, so `resumePointFor` gives them `pr` as it does today.

Note the asymmetry in the last row: the ladder runs under `phase('Ladder')` but its failure is preserved under `phaseName: 'Land'` (`:5523`), because `phase('Land')` is called before the ladder's result is read (`:5511`). The map is on `phaseName`, so `Land` means "the ladder ran" — which is exactly what `ladder` resumes to. Do not "fix" that by moving the `phase()` call; the stop reasons in `BUILD.md` are keyed to it.

**The three fallback rules.** A recorded stage is a claim about work on disk, and the loop proves it before trusting it. The restore stage (Task 5) reports `restored` and `green`:

| Restore reports | The row resumes at | Why |
|---|---|---|
| `restored: false` | `build` | the work is not here — another machine, a cleaned tree, a deleted patch |
| `restored: true`, `green: false` | `implement` | the work is here and red; the implementor's job is to make it green, with three self-repair attempts and a gate binding, and the reviewed plan still stands |
| `restored: true`, `green: true` | its recorded stage | the attempt stands |

The second rule is the one that earns its keep: a resume never discards a reviewed plan because the code under it went red, and it never carries a red tree into a review.

**`resumeFrom` is a ceiling, not a command.** The argument names the earliest stage the run may enter at for the first row it builds; the rules above can still drop it. Forcing `build` therefore means "ignore the record and rebuild", which is the whole point of having the override.

---

## File structure

| File | Responsibility | Tasks |
|---|---|---|
| `.claude/skills/requirements-pipeline/references/backlog.schema.json` | The `attempt` field's shape and description | 1 |
| `tim/src/backlog/shape.js` | `setRowFields` writes `attempt`, and `--commit` clears it | 1 |
| `tim/src/backlog/shape.test.js` | Its tests | 1 |
| `tim/src/commands/backlog/rows.js` | `tim backlog set --attempt` | 2 |
| `tim/src/commands/backlog/rows.test.js` | Its tests | 2 |
| `tim/src/build/start.js` | `resumePointFor` reads the attempt | 3 |
| `tim/src/build/start.test.js` | Its tests | 3 |
| `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js` | The stage vocabulary, `resumeFrom`, the branch stage's read, the restore stage, the plan reader, the entry points, the preserve record, the report | 4, 5, 6, 7, 8, 9, 10 |
| `tim/src/backlog/workflow-contract.test.js` | The loop's contract tests | 4, 5, 6, 7, 8, 9, 10 |
| `.claude/skills/requirements-pipeline/workflow/README.md` | The argument table, the start stage, a resume section | 11 |
| `.claude/skills/requirements-pipeline/references/BUILD.md` | The parameter, the stop-condition table, steps 3d and 3e | 11 |
| `tim/README.md` | `tim backlog set --attempt` | 11 |
| `workareas/shared/build-loop-efficiency/DESIGN.md` | A2's status and what already existed | 12 |

---

## Task 1: The `attempt` field on the row

**Files:**
- Modify: `.claude/skills/requirements-pipeline/references/backlog.schema.json` (the `increment` definition's `properties`, after `prs` at lines 426-433)
- Modify: `tim/src/backlog/shape.js:403-451` (`setRowFields` and its doc comment)
- Test: `tim/src/backlog/shape.test.js` (the `setRowFields` describe at `:545`, and the `checkBacklog` describe at `:39`)

The field, in full:

```json
"attempt": {
  "description": "Written by the build loop through `tim backlog set --attempt`: how far the last failed attempt at the increment got, so a relaunch picks it up there rather than re-planning and re-implementing it. Cleared when the increment lands, because a recorded commit and an attempt in flight cannot both be true. Set it to \"none\" to clear it by hand.",
  "type": "object",
  "required": ["stage", "reason", "at", "planReviewed", "work"],
  "properties": {
    "stage": {
      "description": "The stage the attempt reached, and the one a relaunch enters at: implement (the plan is reviewed, the code is not written), review (the code is written and staged), ladder (the code is written, reviewed and fixed).",
      "enum": ["implement", "review", "ladder"]
    },
    "reason": {
      "description": "The stop reason that ended the attempt, such as \"ladder-red\".",
      "$ref": "#/$defs/text"
    },
    "at": {
      "description": "When the attempt was preserved, as an ISO 8601 time.",
      "$ref": "#/$defs/text"
    },
    "planReviewed": {
      "description": "true when plans/<id>.md passed its lint and its plan review before the attempt ran. false means a relaunch plans again whatever `stage` says.",
      "type": "boolean"
    },
    "work": {
      "description": "Where the preserved work is. The full lifecycle commits it; the branch lifecycle cannot, so it writes patches.",
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": {
          "description": "wip: a pushed commit at the branch's head. patches: files under <workarea>/logs/. none: the stage left nothing to restore.",
          "enum": ["wip", "patches", "none"]
        },
        "branch": {
          "description": "kind wip: the branch the commit is on.",
          "$ref": "#/$defs/text"
        },
        "sha": {
          "description": "kind wip: the commit.",
          "$ref": "#/$defs/text"
        },
        "files": {
          "description": "kind patches: each saved file, relative to the workarea, such as [\"logs/inc-034-preserve-frontend.staged.patch\"].",
          "$ref": "#/$defs/textList"
        }
      }
    }
  }
}
```

`planReviewed` is separate from `stage` because the two fail independently: a plan can be reviewed and the implementor still die, and an attempt can reach the ladder on a plan whose second review left detail findings open. A relaunch reads both.

- [ ] **Step 1: Write the failing tests**

In `shape.test.js`, in the `setRowFields` describe:

```javascript
const attempt = {
  stage: 'ladder',
  reason: 'ladder-red',
  at: '2026-10-30T11:00:00.000Z',
  planReviewed: true,
  work: { kind: 'wip', branch: 'feat/EUDPA-900-x', sha: 'abc1234' }
}

test('records how far an attempt got', () => {
  const { backlog, changed } = setRowFields({
    backlog: backlogOf(row()),
    id: 'inc-001',
    changes: { attempt }
  })

  expect(backlog.increments[0].attempt).toEqual(attempt)
  expect(changed.attempt).toEqual({ before: undefined, after: attempt })
})

test('drops the attempt when the increment lands, so a landed row never claims one in flight', () => {
  const { backlog, changed } = setRowFields({
    backlog: backlogOf(row({ attempt })),
    id: 'inc-001',
    changes: { commit: 'def5678' }
  })

  expect(backlog.increments[0]).not.toHaveProperty('attempt')
  expect(changed.attempt).toEqual({ before: attempt, after: undefined })
})

test('clears the attempt on its own when asked for none', () => {
  const { backlog } = setRowFields({
    backlog: backlogOf(row({ attempt })),
    id: 'inc-001',
    changes: { attempt: 'none' }
  })

  expect(backlog.increments[0]).not.toHaveProperty('attempt')
})
```

And in the `checkBacklog` describe:

```javascript
test('passes a row carrying an attempt, and refuses one whose stage is not a stage', () => {
  expect(checkBacklog(backlogOf(row({ attempt }))).problems).toEqual([])
  expect(
    checkBacklog(backlogOf(row({ attempt: { ...attempt, stage: 'land' } })))
      .problems
  ).toEqual(['inc-001 "attempt" must be what backlog.schema.json says.'])
})
```

Hoist `attempt` to the file level if both describes need it, rather than writing it twice. Run the second expectation before settling its wording — `fieldProblem` at `shape.js:106-114` composes it from the schema, and the exact sentence depends on which keyword fails first. Assert what it actually says, not what reads best.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- shape
```

Expected: the three `setRowFields` tests fail because `attempt` is not a field it writes, and the `checkBacklog` test's second half fails because the schema lets any object through.

- [ ] **Step 3: Add the field to the schema**

Put the block above into `backlog.schema.json` after the `prs` property. Keep it inside the `increment` definition's `properties`, not in `$defs`: it is one field of one object and nothing else refers to it.

- [ ] **Step 4: Teach `setRowFields` to write and clear it**

In `shape.js`, after the `pr` line at `:434`:

```javascript
  if (changes.attempt !== undefined) {
    if (changes.attempt === 'none') delete after.attempt
    else after.attempt = changes.attempt
  }
  if (changes.commit !== undefined) delete after.attempt
```

Put it after the scalar loop so the `commit` clear wins over an `attempt` written in the same call, and extend the doc comment at `:403-416` to say so: scalars replace, `note` and `openQuestion` append, `pr` upserts, `attempt` replaces or clears, and `commit` clears it.

That ordering is the safe way round. The loop never passes both, and a landed row carrying a stale attempt would resume an increment that is already built.

`changed` needs no special handling: it is computed from `Object.keys(after)`, so a deleted key shows as `{ before: <the attempt>, after: undefined }` already. Confirm that against the test rather than assuming it.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- shape
```

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/requirements-pipeline/references/backlog.schema.json tim/src/backlog/shape.js tim/src/backlog/shape.test.js
git commit -m "feat(backlog): record how far a failed attempt at an increment got"
```

---

## Task 2: `tim backlog set --attempt`

**Files:**
- Modify: `tim/src/commands/backlog/rows.js:35-57` (`setOptsSchemaFor`), `:108-140` (`parseSetOpts`), `:228-258` (the command's options and help)
- Test: `tim/src/commands/backlog/rows.test.js`

- [ ] **Step 1: Write the failing tests**

Follow the file's existing pattern for a JSON-valued flag — `--pr` is the one to copy, including its "is not valid JSON" case. Add:

```javascript
test('records an attempt given as JSON', async () => { ... })
test('clears the attempt when given none', async () => { ... })
test('refuses an attempt that is not valid JSON', async () => { ... })
test('refuses an attempt whose stage is not a stage', async () => { ... })
```

Read the neighbouring `--pr` tests first and match how they invoke the command and read the result; do not invent a second harness.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- commands/backlog/rows
```

- [ ] **Step 3: Add the option**

A `parseAttempt` beside `parsePr` at `rows.js:60-71`:

```javascript
const attemptSchema = z.object({
  stage: z.enum(['implement', 'review', 'ladder']),
  reason: z.string().trim().min(1),
  at: z.string().trim().min(1),
  planReviewed: z.boolean(),
  work: z.object({ kind: z.enum(['wip', 'patches', 'none']) }).passthrough()
})

const parseAttempt = (raw) => {
  if (raw === 'none') return 'none'
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    throw new TimError('USAGE', `--attempt "${raw}" is not valid JSON.`)
  }
  const result = attemptSchema.safeParse(value)
  if (!result.success) {
    throw new TimError(
      'USAGE',
      '--attempt must be "none", or a JSON object with a "stage" of implement, review or ladder, a "reason", an "at", a "planReviewed" and a "work" with a "kind".'
    )
  }
  return result.data
}
```

Add `attempt: z.string().optional()` to `setOptsSchemaFor`, name it in the `.refine` message, thread it through `parseSetOpts` as `attempt: parsed.attempt === undefined ? undefined : parseAttempt(parsed.attempt)`, and register the option:

```javascript
    .option(
      '--attempt <json>',
      'How far the last failed attempt got, as JSON with a stage of implement, review or ladder, a reason, an at, a planReviewed and a work. "none" clears it. Recording a --commit clears it too'
    )
```

Add one line to the command's `addHelpText` examples, matching the `--pr` example's style.

The zod schema deliberately restates part of the JSON Schema. That is the pattern the file already follows for `--pr`: the CLI refuses a malformed value before the backlog is read, and `tim backlog check` stays the authority on the written shape.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- commands/backlog/rows
```

- [ ] **Step 5: Commit**

```bash
git add tim/src/commands/backlog/rows.js tim/src/commands/backlog/rows.test.js
git commit -m "feat(backlog): take an attempt record on tim backlog set"
```

---

## Task 3: `resumePointFor` reads the attempt

**Files:**
- Modify: `tim/src/build/start.js:67-81` (`resumePointFor` and its doc comment)
- Test: `tim/src/build/start.test.js:692-704` (the `resumePointFor` describe)

- [ ] **Step 1: Write the failing tests**

In that describe:

```javascript
test('is the stage the last attempt reached when nothing has landed', () => {
  expect(
    resumePointFor({ attempt: { stage: 'ladder', planReviewed: true } })
  ).toBe('ladder')
})

test('plans again when the attempt reached further on a plan that was never reviewed', () => {
  expect(
    resumePointFor({ attempt: { stage: 'ladder', planReviewed: false } })
  ).toBe('build')
})

test('prefers what landed over what an attempt claims', () => {
  expect(
    resumePointFor({
      commit: 'abc',
      attempt: { stage: 'ladder', planReviewed: true }
    })
  ).toBe('pr')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- build/start
```

- [ ] **Step 3: Read the attempt**

```javascript
export const resumePointFor = ({ commit, prs, attempt }) => {
  const list = Array.isArray(prs) ? prs : []
  if (list.length > 0) {
    return list.every((pr) => pr.merged === true) ? 'done' : 'ci'
  }
  if (commit) return 'pr'
  if (attempt?.planReviewed && ATTEMPT_STAGES.includes(attempt.stage)) {
    return attempt.stage
  }
  return 'build'
}
```

with `export const ATTEMPT_STAGES = ['implement', 'review', 'ladder']` above it, and the doc comment's `@returns` widened to the seven values. Keep its principle sentence as it stands — the attempt is another thing the backlog records, not a departure from it.

An unreviewed plan drops the row to `build` whatever the stage says, because every stage from `implement` on reads `plans/<id>.md` as decided.

Export `ATTEMPT_STAGES` rather than inlining the list: Task 4 needs the same vocabulary in the loop, and the two must not drift. The loop cannot import from `tim` — it is a `Workflow` script with no module resolution — so it carries its own copy, and the contract test holds the two to each other.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- build/start
```

- [ ] **Step 5: Commit**

```bash
git add tim/src/build/start.js tim/src/build/start.test.js
git commit -m "feat(build): resume an increment at the stage its last attempt reached"
```

---

## Task 4: The stage vocabulary and the `resumeFrom` argument

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:52-71` (`ALWAYS_REQUIRED`), after line 111 (the `e2e` validation block)
- Test: `tim/src/backlog/workflow-contract.test.js:95-123` (the required-keys map), `:140-173` (`BASE_ARGS`), and the build loop's configuration describe

- [ ] **Step 1: Write the failing tests**

Add `'resumeFrom'` to the `increment-build-loop.js` entry of the required-keys map after `'e2e'`, and `resumeFrom: null` to `BASE_ARGS`. Then, in the configuration describe:

```javascript
test('stops before any agent when resumeFrom is missing', async () => {
  const run = await runLoop(scriptPath, {
    args: withoutKey(BASE_ARGS, 'resumeFrom')
  })

  expect(run.error.message).toBe(
    'increment-build-loop: args is missing required key resumeFrom. Pass every one in args: this workflow has no defaults'
  )
  expect(run.agents).toEqual([])
})

test.each([['land'], ['Ladder'], [true]])(
  'refuses resumeFrom %j before any agent',
  async (value) => {
    const run = await runLoop(scriptPath, {
      args: { ...BASE_ARGS, resumeFrom: value }
    })

    expect(run.error.message).toContain(
      'config.resumeFrom must be null to take it from the row, or one of build, implement, review, ladder'
    )
    expect(run.agents).toEqual([])
  }
)

test('logs the stage a forced resume enters the first row at', async () => {
  const run = await runLoop(scriptPath, {
    args: { ...BASE_ARGS, resumeFrom: 'ladder' },
    answers: () => null
  })

  expect(run.logs).toContain(
    'increment-build-loop: resumeFrom ladder — the first row this run builds enters there at the earliest, and later rows take their own stage from the backlog'
  )
})
```

And the test that holds the loop's copy of the vocabulary to tim's:

```javascript
test('names the same resume stages the backlog records', async () => {
  const source = await readFile(scriptPath, 'utf8')

  expect(source).toContain(
    "const ATTEMPT_STAGES = ['implement', 'review', 'ladder']"
  )
  expect(ATTEMPT_STAGES).toEqual(['implement', 'review', 'ladder'])
})
```

importing `ATTEMPT_STAGES` from `../build/start.js`. Check first how the file already reads a script's source — `workflowScripts()` and the args-contract test near `:340` do this, and the existing helper is the one to use rather than a second `readFile`.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 3: Add the argument**

Add `'resumeFrom'` to `ALWAYS_REQUIRED` after `'e2e'`, and after the `E2E_IS_LOCAL` line at `:111`:

```javascript
const ATTEMPT_STAGES = ['implement', 'review', 'ladder']
const RESUME_FROM_VALUES = ['build', ...ATTEMPT_STAGES]
const RESUME_FROM = CFG.resumeFrom
if (RESUME_FROM !== null && !RESUME_FROM_VALUES.includes(RESUME_FROM)) {
  throw new Error(
    `${WORKFLOW_NAME}: config.resumeFrom must be null to take it from the row, or one of ${RESUME_FROM_VALUES.join(', ')} — got ${JSON.stringify(RESUME_FROM)}`
  )
}
```

and, after the run's opening log line at `:4624-4631`:

```javascript
if (RESUME_FROM !== null) {
  log(
    `${WORKFLOW_NAME}: resumeFrom ${RESUME_FROM} — the first row this run builds enters there at the earliest, and later rows take their own stage from the backlog`
  )
}
```

The log line says what the argument means, because its two limits are both easy to get wrong: it is a **ceiling**, so the restore rules can still drop the row further back, and it applies to the **first row only**. A run draining a backlog builds rows that never had an attempt, and forcing them all to `ladder` would skip the build.

`pr`, `ci` and `done` are deliberately not accepted. They come from a recorded commit or pull request, which is harder evidence than an argument, and an operator who wants a row re-landed clears its `commit` by hand.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): take the stage a resumed run may enter at as an argument"
```

---

## Task 5: The branch stage reports the attempt

**Files:**
- Modify: `increment-build-loop.js:3559` (`BRANCH_ROW_SCHEMA.resumeAt`), `:3577-3579` (the branch prompt's STEP 1 `jq`), `:3596` (its STEP 3 `resumeAt` instruction)
- Test: `tim/src/backlog/workflow-contract.test.js` (the branch-lifecycle describe)

Under the full lifecycle `tim build start` already reports the wider `resumeAt` after Task 3. Under the branch lifecycle the branch stage reads the row itself, so it needs the same rule — expressed for an agent rather than as code.

- [ ] **Step 1: Write the failing tests**

In the branch-lifecycle describe, two prompt tests and one behaviour test:

```javascript
test('asks the branch stage for the attempt alongside the commit and the pull requests', async () => {
  const prompt = promptOf(await runBranchRow(), 'inc-020 branch')

  expect(prompt).toContain(
    '{repos, merge, gatePhases, awaitCi, commit, prs, attempt}'
  )
})

test('tells the branch stage how an attempt becomes a resume point', async () => {
  const prompt = promptOf(await runBranchRow(), 'inc-020 branch')

  expect(prompt).toContain(
    'Otherwise `attempt` set, with `planReviewed` true and a `stage` of implement, review or ladder → that stage'
  )
})
```

Copy `runBranchRow` from whatever the describe block already uses to drive one row to the branch stage; do not add a second runner.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 3: Widen the schema and the prompt**

The enum at `:3559`:

```javascript
    resumeAt: { type: 'string', enum: ['build', ...ATTEMPT_STAGES, 'pr', 'ci'] },
```

The `jq` in STEP 1 gains `attempt`, and the STEP 3 line at `:3596` becomes:

```
- resumeAt, from `commit`, `prs` and `attempt` alone. `prs` non-empty → "ci". Otherwise `commit` set → "pr".
  Otherwise `attempt` set, with `planReviewed` true and a `stage` of implement, review or ladder → that stage.
  Otherwise "build". Never from anything else you can see in the repos: a dirty tree is an earlier attempt and STEP 2
  has already refused it.
```

The last sentence matters: the branch stage's STEP 2 refuses a dirty tree, so an agent that reasoned "there are changes here, so it must be part-built" would contradict the stage it is in. The row is the record.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): read a row's attempt in the branch stage"
```

---

## Task 6: The restore stage

**Files:**
- Modify: `increment-build-loop.js` — `meta.phases` at `:10-28`, a new `RESTORE_SCHEMA` and `restoreAttempt` beside the preserve helpers at `:1348-1432`
- Test: `tim/src/backlog/workflow-contract.test.js`

One agent, run only on a resumed row, that puts the preserved work back and proves it. It is the pivot every fallback rule turns on, so its structured output is the whole interface:

```javascript
const RESTORE_SCHEMA = {
  type: 'object',
  required: ['restored', 'green', 'rungs', 'changedFiles', 'summary'],
  properties: {
    restored: {
      type: 'boolean',
      description: 'The preserved work is in the trees: the wip commit is at HEAD, or every patch applied cleanly. false when it is not here at all'
    },
    green: {
      type: 'boolean',
      description: 'Every gate phase that had rungs came back green on the restored trees. false when restored is false'
    },
    rungs: { type: 'array', items: GATE_RUNG_SCHEMA, description: 'Every rung, copied from the JSON tim printed' },
    changedFiles: {
      type: 'array',
      items: { type: 'string' },
      description: 'Every file the restored work touches, each written `<repoKey>:<repo-relative path>`'
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}
```

- [ ] **Step 1: Write the failing tests**

```javascript
test('tells the restore stage to put a wip commit back and prove it', async () => { ... })
test('tells the restore stage which patches to apply on a shared branch', async () => { ... })
test('asks the restore stage only for the cheap phases the row owes', async () => { ... })
test('runs no restore stage for a row with nothing recorded', async () => { ... })
```

The third is the one with teeth: the command list must be `--phase unit` and `--phase fit` for a row owing all three, never `--phase all`. Assert the rendered commands, as the baseline tests at `:1270` and `:5260` do.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 3: Write the stage**

Add `{ title: 'Resume' }` to `meta.phases` between `Branch` and `Baseline`, then:

```javascript
const restoreAttempt = (id, branch, attempt, phases) =>
  agent(
    `You are the RESTORE STAGE for increment ${id}. Its last attempt reached the ${attempt.stage} stage and stopped at
${attempt.reason}. The work was preserved. Put it back, prove it, and report what it touches. You plan nothing, you
write no code, and you fix nothing.
${guardrails()}
${REPO_RULE}
${GATE_RULE}
${restoreWorkStep(id, branch, attempt.work)}
2. WHAT IT TOUCHES. For each of the increment's repos, \`git -C ${TILDE}/<repoPath> diff --staged --name-only\` and
   \`git -C ${TILDE}/<repoPath> diff --name-only\`. Report every path once in changedFiles, each written
   \`<repoKey>:<repo-relative path>\` with the repo keys ${REPO_KEYS.join(', ')}. This is what the review stages read,
   so a path left out is a file nobody looks at.
${baselineGateStep(phases, gateLogs(id, 'resume'))}
4. REPORT what tim printed, not your reading of it. restored:true only when step 1 put every piece back. green:true
   only when every phase that had rungs came back green — and false whenever restored is false, whatever else ran.
   Put each red rung's reason in your summary, word for word.
A RED RUNG IS NOT YOURS TO FIX. The loop reads green:false and sends the work to the implementor, which is the stage
that repairs code. Never edit a file, never weaken a test, and never run a repair.
Return the structured output only.`,
    light({ label: `${id} restore`, phase: 'Resume', schema: withStackHeld(RESTORE_SCHEMA) })
  )
```

`restoreWorkStep(id, branch, work)` renders step 1 per `work.kind`:

- **`wip`** — assert `git rev-parse HEAD` is the recorded sha in the repo the commit is on and that the tree is clean; the work is already in place, so nothing is applied. A HEAD that is not the sha but has it as an ancestor (`git merge-base --is-ancestor`) is also restored: a later commit is on top. A sha that is not in the branch at all is `restored: false`.
- **`patches`** — `git apply --index <the .staged.patch>` then `git apply <the .unstaged.patch>` per repo, in that order, skipping a file that does not exist and reporting `restored: false` when a patch is listed and missing or will not apply. Never `--3way`, never `--reject`: a partial apply is worse than no apply, because the gate would then measure a tree nobody wrote.
- **`none`** — nothing to restore, so `restored: false` at once, with no gate run.

Pass `BUILDER_PHASES.filter((name) => rowGatePhases.includes(name))` as `phases` — the same expression `builderPhases` already uses at `:4980`. The e2e phase is deliberately left out: it is the expensive one, the ladder runs it straight afterwards, and under `e2e: "ci"` there is no local e2e rung at all.

Reuse `baselineGateStep` rather than writing a third gate step. It already renders the `NO_GATE_STEP` case for a row owing nothing, which is a row the restore stage still has to report `changedFiles` for.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): restore a preserved attempt and prove it with the cheap gate phases"
```

---

## Task 7: The plan reader

**Files:**
- Modify: `increment-build-loop.js` — a `readReviewedPlan` beside `reviewedPlan` at `:3258`
- Test: `tim/src/backlog/workflow-contract.test.js`

Every stage from `implement` on reads the `plan` **object**, not just the plan file: `plan.behaviourChanges` writes the landing commit's body (`:5571`, and `:3796` under the branch lifecycle), `plan.repos` is checked against the branched repos (`:4940`), `plan.specPrefixes` fills `specPrefixesOfRow` (`:5623`), and `planStandardsLine`, `mustAddressForImplementor` and `planDecisionReviewRule` all read it. A resumed row needs those fields without paying for `reviewedPlan`, which is the ~211M line in the design's spend table.

They are all in `plans/<id>.md`, which the planner wrote and `recordMustAddress` (`:3249`) appended the still-open review findings to. So one agent reads the file and returns the same shape.

- [ ] **Step 1: Write the failing tests**

```javascript
test('reads the reviewed plan back rather than planning again on a resumed row', async () => {
  const labels = stageLabels(await runResumedAtLadder())

  expect(labels).toContain('inc-020 plan read')
  expect(labels).not.toContain('inc-020 plan')
  expect(labels).not.toContain('inc-020 plan review')
})

test('lands a resumed row with the behaviour changes its plan file states', async () => { ... })
```

The second proves the recovered fields reach the land stage, which is the only place a wrong answer would show up in a commit message rather than in a log.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 3: Write the reader**

```javascript
const readReviewedPlan = (id, branchedRepos) =>
  agent(
    `Increment ${id} was planned on an earlier attempt, and that plan was reviewed. READ IT BACK. You are not planning:
you change nothing in the plan, you judge nothing in it, and you add nothing to it.
${guardrails()}
${readPlan(id)}
Report the plan's own words, section by section, in the structured output:
- repos: section 1's repos, in merge order${branchedRepos ? `, each one of ${branchedRepos.join(', ')}` : ''}
- behaviourChanges, decisions, risks, checks (sections 5 and 6, one entry per command), specPrefixes, docsMadeUntrue,
  departures, standards and followUps, each as its section writes them, empty where the section says none
- planReviewMustAddress: every finding under "Plan review: must address", or [] when the plan has no such section
Report ok:false only when the file is missing or holds no plan. A section you cannot find is empty, not a failure.
Return the structured output only.`,
    code({ label: `${id} plan read`, phase: 'Resume', schema: PLAN_READ_SCHEMA })
  )
```

`PLAN_READ_SCHEMA` is `PLAN_SCHEMA` (`:2146-2210`) with `planReviewMustAddress` added as a string list. Build it from `PLAN_SCHEMA` rather than copying it:

```javascript
const PLAN_READ_SCHEMA = {
  ...PLAN_SCHEMA,
  properties: {
    ...PLAN_SCHEMA.properties,
    planReviewMustAddress: {
      type: 'array',
      items: { type: 'string' },
      description: 'Every finding under the plan\'s "Plan review: must address" section. [] when it has none'
    }
  }
}
```

so a field added to `PLAN_SCHEMA` later is read back too.

It runs on the `code` tier, not `light`: it is reading sixteen sections of prose and returning structured fields, which is not "run a command and report what it said".

A plan file that will not read stops the row rather than falling back to planning afresh. Falling back would mean a resume could quietly cost more than a fresh build — the plan reader, then the whole planning chain — and the failure is a missing or corrupt file in the workarea, which somebody should see.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): read a reviewed plan back instead of planning a resumed row again"
```

---

## Why Task 8 is a hoist and three conditionals, not a jump

The `build:` block at `increment-build-loop.js:4870-5627` is a straight line of stages with `const` declarations interleaved, and a labelled block in JavaScript can be left early but never entered part-way. So "enter at the ladder" is expressed as: run the stages before it under a condition, and give the stages after it the values those skipped stages would have produced.

Three things therefore have to happen, and the third is the one that breaks the suite if it is missed.

**One — hoist what the later stages close over.** These are declared inside the region but used after it, so wrapping a group in `if {}` puts them out of scope:

| Declared at | What it is | Where it goes |
|---|---|---|
| `:4878` `const baseline` / `:4924` `const baselineEvidence` | the rung list the ladder and the fixer quote | `let baselineEvidence = ''` before the first conditional |
| `:4982` `const impl` | the implementor's result | `let impl = null` before |
| `:4979` `const mergeNote`, `:4980` `const builderPhases` | the merge note and the builder's gate phases | `let` before |
| `:5042` `const attempt` | `{ id, ticket, workBranch }`, which every `preserveAttempt` spreads | a pure move above the Baseline: it closes over nothing the stages produce |
| `:5044` `const stopForHeldStack`, `:5080` `const offBranch` | the two shared stop helpers | move with it, for the same reason |
| `:5102` `const files` | the review groups' input | `let files = []` before |
| `:5313` `let fixResult` | the fixer's result | move above the Review conditional |

Moving `attempt`, `stopForHeldStack` and `offBranch` above the Baseline is worth doing even on its own: they read `id`, `ticket`, `workBranch` and `repos`, all settled in the `ticketAndBranch` block, and nothing from the stages between.

**Two — three conditionals.** `enterAt` is settled once, then:

```javascript
  if (enterAt === 'build') { /* Baseline */ }
  /* Plan: reviewedPlan when enterAt is 'build', readReviewedPlan otherwise */
  if (enterAt === 'build' || enterAt === 'implement') { /* merges, Implement */ }
  if (enterAt !== 'ladder') { /* Review, Verify findings, Judge, Fix */ }
  /* Ladder, Land: always */
```

**Three — the substitutes.** Three values a skipped stage would have produced, each needed by a stage that still runs:

| Value | Normally from | On a resume |
|---|---|---|
| `baselineEvidence` | the baseline's rungs (`:4924`) | the restore stage's rungs, with its own heading (below) |
| `impl` | the implementor | `{ ok: true, summary, notes, changedFiles }` built from the restore stage's `changedFiles` and the attempt record |
| `plan` | `reviewedPlan` | `readReviewedPlan` (Task 7) |

The `impl` substitute is the one to get right, because `impl.notes` is quoted to the fixer (`:5325`), the reviewers (`implementorNotesForReview`), the ladder (`earlierFindings` at `:5425`) and the spec and completion steps. The earlier implementor's notes are genuinely gone — they were a subagent's return value, not written anywhere. Say so rather than inventing them:

```javascript
const restoredImpl = (attempt, restored) => ({
  ok: true,
  summary: `Restored from the attempt that reached the ${attempt.stage} stage and stopped at ${attempt.reason}. ${restored.summary}`,
  notes: `This work was built on an earlier attempt and restored, so the implementor's own notes are not available. What ended that attempt: ${attempt.reason}. The row's notes in the backlog hold what the preserve stage recorded.`,
  changedFiles: restored.changedFiles
})
```

A reviewer told plainly that the notes are unavailable reads the diff. A reviewer handed `'(none)'` reads it as "the implementor had nothing to flag", which is a different and false claim.

---

## Task 8: Enter the pipeline at the recorded stage

**Files:**
- Modify: `increment-build-loop.js:4870-5627` (the `build:` block), `:4759-4792` (the branch stage's `resumeAt` handling)
- Test: `tim/src/backlog/workflow-contract.test.js`

- [ ] **Step 1: Write the failing tests**

The decision table from "The resume points this plan adds" is the test list. One test per row, each asserting the stage labels that ran and the ones that did not — `stageLabels(run)` is the reader:

```javascript
test('resumes at the ladder, running neither the planner nor the implementor', async () => {
  const labels = stageLabels(await runResumedAt('ladder'))

  expect(labels).toContain('inc-020 restore')
  expect(labels).toContain('inc-020 plan read')
  expect(labels).toContain('inc-020 ladder')
  expect(labels).not.toContain('inc-020 baseline')
  expect(labels).not.toContain('inc-020 plan')
  expect(labels).not.toContain('inc-020 implement')
  expect(labels).not.toContain('inc-020 consistency')
})

test('resumes at the review, keeping the restored code', async () => { ... })
test('resumes at the implementor, keeping the reviewed plan', async () => { ... })

test('builds from the top when the preserved work is not on this machine', async () => {
  const run = await runResumedAt('ladder', { restored: false })
  const labels = stageLabels(run)

  expect(labels).toContain('inc-020 baseline')
  expect(labels).toContain('inc-020 plan')
  expect(labels).toContain('inc-020 implement')
  expect(run.logs).toContain(
    'inc-020: the attempt that reached the ladder stage is not here — building it from the top'
  )
})

test('sends restored work that will not go green to the implementor, not to the reviewers', async () => {
  const run = await runResumedAt('ladder', { restored: true, green: false })
  const labels = stageLabels(run)

  expect(labels).toContain('inc-020 plan read')
  expect(labels).toContain('inc-020 implement')
  expect(labels).not.toContain('inc-020 plan')
  expect(run.logs).toContain(
    'inc-020: the restored attempt is red on the cheap gate phases — resuming at implement rather than ladder'
  )
})

test('gives the resumed ladder the restore stage rungs as its baseline', async () => {
  const prompt = promptOf(await runResumedAt('ladder'), 'inc-020 ladder')

  expect(prompt).toContain('THE RESTORE GATE, run on the restored work before this ladder')
})

test('tells the resumed row’s reviewers that the implementor’s notes are not available', async () => { ... })

test('lets resumeFrom force a row with a recorded attempt back to the top', async () => {
  const labels = stageLabels(await runResumedAt('ladder', { resumeFrom: 'build' }))

  expect(labels).toContain('inc-020 plan')
  expect(labels).not.toContain('inc-020 restore')
})

test('applies resumeFrom to the first row only', async () => { ... })

test('ignores resumeFrom on a row that has already landed', async () => {
  const run = await runResumedAt('ladder', { resumeFrom: 'build', commit: 'abc1234' })

  expect(run.logs).toContain(
    'inc-020: resumeFrom build is ignored — the row records a commit, so it resumes at pr'
  )
})
```

`runResumedAt(stage, options)` is one helper for the whole set: it answers the branch or start stage with a row carrying the attempt, and the restore stage with `{ restored, green, rungs: [], changedFiles: [...], summary }`. Write it beside the describe block's other runners and drive both lifecycles through it where the describe already distinguishes them.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 3: Settle `enterAt`, once**

At the top of the `build:` block, replacing the skip at `:4871-4874`:

```javascript
  build: {
    if (LANDED_POINTS.includes(resumeAt)) {
      log(`${id}: already built on ${workBranch} — skipping to ${resumeAt}`)
      break build
    }

    const forced = resumeFromAppliesTo(id) ? RESUME_FROM : null
    let enterAt = forced ?? resumeAt
    let restored = null

    if (enterAt !== 'build') {
      phase('Resume')
      restored = await restoreAttempt(id, workBranch, rowAttempt, resumePhases)
      ...
      enterAt = enteredAfterRestore(id, enterAt, restored)
    }
```

with `LANDED_POINTS = ['pr', 'ci', 'done']`, and `enteredAfterRestore` the decision table, each outcome logged in the words the tests pin:

```javascript
const enteredAfterRestore = (id, stage, restored) => {
  if (!restored?.restored) {
    log(`${id}: the attempt that reached the ${stage} stage is not here — building it from the top`)
    return 'build'
  }
  if (!restored.green) {
    if (stage === 'implement') return 'implement'
    log(`${id}: the restored attempt is red on the cheap gate phases — resuming at implement rather than ${stage}`)
    return 'implement'
  }
  log(`${id}: resuming ${id} at ${stage} — ${restored.changedFiles.length} file(s) restored`)
  return stage
}
```

`resumeFromAppliesTo(id)` returns true for the first row the run builds and false after, which is one module-level `let` set when the first row leaves the branch stage. Where the row records a commit, `resumeAt` is already one of `LANDED_POINTS` and the block has broken out above — so log the ignored override there, before the break, rather than silently dropping it.

The restore stage also needs `rowAttempt`: add `attempt` to `BRANCH_ROW_SCHEMA` so the branch stage reports the row's record verbatim, and read it from `started` under the full lifecycle. `tim build start` does not report it today — add it to `emptyResult` and set it from `readRow` beside `resumeAt` at `tim/src/build/start.js:367`, with a test in `start.test.js`. A resume needs the whole record, not just the derived point: `work.kind` decides what the restore stage does.

- [ ] **Step 4: Hoist, wrap and substitute**

Work through the three lists in the section above, in that order, running the suite after each. The existing tests are the safety net for the hoist: a mis-scoped variable shows up as a `ReferenceError` in a test that has nothing to do with resuming.

The ladder's baseline heading becomes conditional — the restored version:

```javascript
const restoreEvidence = (restored) => `THE RESTORE GATE, run on the restored work before this ladder — every rung below was green then. Its logs are in
${gateLogs(id, 'resume')}/, named \`gate-<repo>-<rung>.log\`:
${baselineRungList(restored)}
This row was built on an earlier attempt and restored, so there is no pre-change baseline from this launch. A rung
red now is still this increment's to fix: the restore gate proves the restored work was green minutes ago.`
```

That last sentence is the honest version of the ladder's "every one was green at baseline" rule. On a resumed row the restore gate is the comparison point, it covers the cheap phases only, and the e2e rung has no comparison point at all. Say that rather than letting the ladder claim a baseline it does not have — and do not drop the rule, or "pre-existing" becomes available again for a gate rung.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Then the whole suite, because the hoist touches the block every other loop test runs through:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test
```

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/build/start.js tim/src/build/start.test.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): enter a resumed row's pipeline at the stage its attempt reached"
```

---

## Task 9: The preserve stage records the stage it reached

**Files:**
- Modify: `increment-build-loop.js:1348-1373` (`preserveWork`), `:1375-1416` (`preserveWorkOnBranch`), `:1418-1432` (`preserveAttempt`), `:1531-1541` (`incrementSchema`)
- Test: `tim/src/backlog/workflow-contract.test.js`

Nothing before this task writes an `attempt`, so everything built so far is dead code until it lands. It comes last because it is the one piece that changes what a *failing* run does, and the readers should be in place and tested before the writer starts producing records.

- [ ] **Step 1: Write the failing tests**

```javascript
test.each([
  ['Implement', 'implement'],
  ['Review', 'review'],
  ['Fix', 'review'],
  ['Land', 'ladder']
])('records a %s-stage failure as an attempt at %s', async (phaseName, stage) => { ... })

test('tells the preserve stage to record the attempt with the stage and reason the loop names', async () => {
  const prompt = promptOf(await runToLadderRed(), 'inc-020 preserve')

  expect(prompt).toContain('--attempt \'{"stage":"ladder","reason":"ladder-red"')
})

test('records the plan as reviewed only when the plan stage reviewed it', async () => { ... })

test('asks the preserve stage for the patches it wrote, so a later run can apply them', async () => { ... })
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 3: Map the phase to a stage, and write the record**

```javascript
const RESUME_STAGE_OF_PHASE = {
  Implement: 'implement',
  Review: 'review',
  'Verify findings': 'review',
  Fix: 'review',
  Land: 'ladder'
}
```

`Land` maps to `ladder` because the ladder's own failure is preserved under `phaseName: 'Land'` — `phase('Land')` is called at `:5511`, before the ladder's result is read. Leave that as it is: the stop reasons in `BUILD.md` are keyed to those phase names, and the map is the right place to express the offset. A comment is warranted here, because the mismatch looks like a mistake.

`preserveAttempt` gains two arguments and one step:

```javascript
const preserveAttempt = async ({ id, ticket, workBranch, phaseName, reason, evidence, outcome, detail, planReviewed }) => {
  log(`${id}: ${outcome.toUpperCase()} — preserving the attempt. ${detail}`)
  const stage = RESUME_STAGE_OF_PHASE[phaseName] ?? null
  const kept = await agent(
    (IS_BRANCH ? preserveWorkOnBranch : preserveWork)(id, workBranch, reason, evidence, {
      stage,
      outcome,
      planReviewed
    }),
    light({ label: `${id} preserve`, phase: phaseName, schema: incrementSchema })
  )
  ...
}
```

Each prompt gains a record step after its existing `--note` step, with the script filling in everything it knows and the agent filling in only where the work is:

```javascript
const attemptRecordStep = (id, { stage, outcome, planReviewed }, work) =>
  stage === null
    ? ''
    : `
8. RECORD HOW FAR THIS ATTEMPT GOT, so the next run resumes here rather than rebuilding it:
   \`${setRow(id, `--attempt '{"stage":"${stage}","reason":"${outcome}","at":"<the time now, ISO 8601, from \\\`date -u +%Y-%m-%dT%H:%M:%SZ\\\`>","planReviewed":${planReviewed === true},"work":${work}}'`)}\`
   Write the JSON exactly as above, filling in only the bracketed parts. Do NOT change the stage or the reason: the
   loop settled those, and a stage you choose yourself would resume this increment in the wrong place.`
```

with `work` rendered per lifecycle — `{"kind":"wip","branch":"<branch>","sha":"<the wip sha>"}` for `preserveWork`, and `{"kind":"patches","files":[<each file you wrote, workarea-relative>]}` for `preserveWorkOnBranch`. A preserve that saved nothing writes `{"kind":"none"}`, which Task 3 reads as nothing to resume.

The time comes from `date -u`, not from the agent: a model-written timestamp is a guess, and the field is there for a person reading the row.

Extend `incrementSchema` (`:1531`) with a `wip` string and a `patches` string list so the preserve stage's own result carries what it wrote, and the run's `results` entry can name it. Keep `additionalProperties: false`.

`planReviewed` comes from the call site. Every `preserveAttempt` call inside the `build:` block after the plan stage can pass `planReviewed: Boolean(plan?.ok)`; the merge-failure call at `:4963` runs after the plan too. There is no call site before the plan stage, so no site passes `false` — but pass it explicitly from `plan?.ok` rather than defaulting to `true`, so a site added later cannot inherit a claim about a plan that does not exist.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): record the stage a preserved attempt reached"
```

---

## Task 10: Report the resume

**Files:**
- Modify: `increment-build-loop.js` — the `results.push` sites in the `build:` block and the landed entry
- Test: `tim/src/backlog/workflow-contract.test.js`

A resumed row that lands looks identical to a fresh one in the run's result, which makes the whole feature invisible in the report the BUILD phase writes and in anything `tim build runs report` shows.

- [ ] **Step 1: Write the failing tests**

```javascript
test('names the stage a landed row resumed from in the run result', async () => {
  const run = await runResumedAt('ladder')

  expect(run.result.increments[0]).toMatchObject({
    id: 'inc-020',
    outcome: 'landed',
    resumedFrom: 'ladder'
  })
})

test('leaves resumedFrom out of a row built from the top', async () => { ... })
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 3: Add the field**

One `resumedFrom` on the row's results entry, set from `enterAt` when it is not `build` and left out otherwise. Set it in the same place the entry is built rather than threading it through every `results.push`; the landed entry is the one that matters, because a row that stopped again already reports its outcome.

The agent-budget estimate at `:129-133` needs no change: a resumed row runs strictly fewer agents than a fresh one — it trades the planner, the plan reviewers and the implementor for a restore and a plan read — so `agentsPerIncrement()` stays a safe ceiling. Leave it alone, and say why in the README (Task 11) so nobody later "corrects" it.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): name the stage a landed row resumed from"
```

---

## Task 11: Document it

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/README.md:222-247` (the config table), `:746-790` (the start stage), `:281-300` (what drains the backlog), plus a new section
- Modify: `.claude/skills/requirements-pipeline/references/BUILD.md:28-101` (PARAMETERS), `:819-870` (STOP CONDITIONS), `:725-796` (steps 3d and 3e)
- Modify: `tim/README.md:170-192` (the backlog command block)

- [ ] **Step 1: The argument table and the resume section**

One row in the config table, after `e2e`:

| `resumeFrom` | The earliest stage the **first** row of this run may enter at: `null` to take it from the row, or `build`, `implement`, `review` or `ladder`. A ceiling, not a command — a row whose preserved work is missing or red still drops back. Later rows take their own stage from the backlog |

Then a new section after [The start stage](#the-start-stage), covering: the seven values of `resumeAt`; the `attempt` field and who writes it; the restore stage and the three fallback rules as the table from this plan; which substitutes a resumed row gets and that the earlier implementor's notes are gone; that the plan is read back rather than planned again; and the agent-budget note from Task 10.

Correct the paragraph at `:289-291` while you are there. It says today:

> Resuming is launching it again with the same args: `backlog.json` carries the status, ticket, branch and PRs, and the start stage resumes an increment part-way through its lifecycle.

It now carries the attempt too, and "part-way through its lifecycle" has become specific.

- [ ] **Step 2: The parameter and the stop conditions**

In `BUILD.md`'s PARAMETERS block:

```
resumeFrom    the earliest stage the FIRST row may enter at: null (default)
              to take it from the row's own attempt record, or build to
              ignore that record and rebuild. Set build when a row has
              stopped twice at the same stage and the preserved work is
              suspect; leave it null otherwise
```

Record it in `build-args.json` with the rest, as `e2e` is (`:123-127`). A relaunch defaults to `null` rather than to last time's value — unlike `e2e`, which is a property of the machine. A forced `resumeFrom` is an answer to one specific stop, and carrying it into the next launch would silently rebuild rows that had nothing wrong with them. Say that in as many words, so nobody makes it sticky for consistency's sake.

In the STOP CONDITIONS table, the rows for `implement-failed / review-failed / fix-failed` and `ladder-red` both say the attempt is preserved. Add what a relaunch now does with it, in one clause each, and a sentence under the table:

> **A stop that preserved its attempt resumes at the stage it reached.** The row records that stage; the next launch restores the work, proves it with the cheap gate phases, reads the reviewed plan back, and enters there. A relaunch therefore costs the ladder rather than the whole pipeline. Where the work is not on this machine, or will not go green, the row drops back on its own — to the top, or to the implementor. Nothing to do by hand; `resumeFrom: 'build'` is there for the case where you want the record ignored.

- [ ] **Step 3: Steps 3d and 3e**

Step 3d ends "Its ticket, branch and PRs stay recorded, so a later run resumes it." Add the attempt to that list, and note that parking a row with `--status deferred` leaves the attempt in place deliberately: the work is preserved, and resuming the row once the platform fix lands picks it up at its stage rather than rebuilding it.

Step 3e lists the stops to relaunch straight away. A preserved stop is still **not** one of them: `ladder-red` is a red test, which rule 6 of `CLAUDE.md` makes somebody's to fix, and resuming it unchanged would run the same ladder against the same code. Make that explicit, because "it can resume now" reads like "relaunch it now".

- [ ] **Step 4: `tim README.md`**

One line in the backlog block:

```bash
tim backlog set shared/my-programme inc-004 --attempt '{"stage":"ladder","reason":"ladder-red","at":"2026-10-30T11:00:00Z","planReviewed":true,"work":{"kind":"wip","branch":"feat/EUDPA-900-x","sha":"abc1234"}}' --json
tim backlog set shared/my-programme inc-004 --attempt none --json   # the next run builds it from the top
```

and a sentence after the block saying a recorded `--commit` clears it.

- [ ] **Step 5: Prove the docs are true**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim run format
```

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim run lint
```

Read each changed section back against the code as it now stands, not against this plan. A plan is a decision record; the code is what shipped, and this is the point where they are reconciled.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/README.md .claude/skills/requirements-pipeline/references/BUILD.md tim/README.md
git commit -m "docs(build-loop): say how a row resumes at the stage its attempt reached"
```

---

## Task 12: Correct the design document

**Files:**
- Modify: `workareas/shared/build-loop-efficiency/DESIGN.md` (the header, and section A2)

The design is a record of what was agreed, kept true as each piece lands — A1 and A4 both end with a task like this one.

- [ ] **Step 1: The header**

It says today that "A2 and A3 are neither planned nor built." Name `PLAN-A2.md` and the branch, as the A1 and A4 sentences do, and leave A3 as the one piece with neither.

- [ ] **Step 2: Section A2**

Two corrections and one addition.

The section opens "There is no `stageReached` or `resumeFrom` anywhere in the loop today." Half of that was wrong, and the half that was wrong is the load-bearing half: `resumePointFor` and the `build`/`pr`/`ci`/`done` vocabulary already existed, and this work extended them rather than inventing a mechanism. Rewrite the sentence to say what was there and what was missing — the four-value table from this plan's "What already resumes" section is the clearest form.

Part 3 justifies the launch argument by saying `Workflow`'s own resume "replays a changed stage's cached result and so cannot serve this". That is right but incomplete, and the fuller reason is worth recording: `resumeFromRunId` replays a run that died, keyed on the script and args being unchanged, whereas this resumes a *row* across launches, from state on disk, with the pipeline entered at a different point. They are different mechanisms for different failures, and nothing about one replaces the other.

Then add what the build settled that the design left open: the three fallback rules, that `resumeFrom` is a ceiling applying to the first row only, and that the earlier implementor's notes cannot be recovered. The last is the one honest loss in the feature and belongs in the record.

- [ ] **Step 3: Commit**

```bash
git add workareas/shared/build-loop-efficiency/DESIGN.md
git commit -m "docs(build-loop): correct A2's account of what already resumed"
```

---

## Verification before the pull request

- [ ] **Every test green**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test
```

- [ ] **A row that stopped records where it stopped**

Against a real workarea, read a row the documents theme left behind and confirm the shape of what a preserve writes:

```bash
tim backlog set shared/design-release-2-1/themes/documents inc-999 --attempt '{"stage":"ladder","reason":"ladder-red","at":"2026-10-30T11:00:00Z","planReviewed":true,"work":{"kind":"patches","files":["logs/inc-999-preserve-frontend.staged.patch"]}}' --json
```

Expected: a refusal naming `inc-999`, because the row is not in that backlog — which proves the flag parses and reaches the writer. Then run it against a row that is there, read the row back, and clear it with `--attempt none`.

```bash
tim backlog check shared/design-release-2-1/themes/documents --json
```

must stay green with the attempt written and after it is cleared.

- [ ] **A plan-only launch proves the argument end to end**

Launch the loop by `scriptPath` with the documents theme's `build-args.json`, plus `planOnly: true` and `resumeFrom: null`.

Expected: the first log line carries `"resumeFrom":null`; no `resumeFrom` line follows it; no restore stage appears in `/workflows`. Then the same launch with `resumeFrom: 'ladder'`: the `resumeFrom ladder` line appears, and because `planOnly` stops before the branch stage, still no restore stage.

- [ ] **One real resumed row, end to end**

This is the only verification that proves the feature rather than its parts, and it needs a row that actually stopped. Take the next `todo` row of a live theme, launch with `stopAfter: 1`, and let it reach the ladder. If it lands, write the attempt onto it by hand from the shape above with `work.kind` matching the lifecycle, set its `commit` back to absent, and launch again.

Expected, in the run log: a `restore` stage, a `plan read` stage, no `plan` and no `implement`, `resuming <id> at ladder`, and a landed row whose result carries `resumedFrom: 'ladder'`. Compare the launch's agent count and token spend with the archived run that first built it (`tim build runs report --all`) and put both numbers in the pull request: the design's claim is twenty minutes against five hours, and this is the first chance to measure it.

- [ ] **Push**

Nothing gates this push. The workspace is the orchestration repo, not a DEFRA product service: it has no SonarCloud project and no `sonar-project.properties`, so `tools/sonar/sonar-push-check.sh` exits 0 at line 62 whatever `SONAR_TOKEN` holds. Do not wait for a gate, and do not read a silent push as a verified one.

The quality bar for this branch is `tim`'s own scripts:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test
```

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim run format
```

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim run lint
```

All three must be green before the push.

---

## What this plan does not do

A2 only. These are in `DESIGN.md` and are **not** in scope here:

- **A3**, the `rigour` dial and the per-row proposal table. It is the only piece of the design with neither a plan nor a branch once this lands.

And within A2, four things are deliberately left out:

- **No resume point at `land`.** A row whose ladder went green and whose land stage then failed resumes at `ladder`, re-running the gate it just passed. The ladder is the cheap half of a row and `land-failed` is rare; a separate entry point would add a fourth substitute for a case that has happened once.
- **No recovery of the earlier implementor's notes.** They were a subagent's return value and were never written to disk. The substitute says so plainly rather than implying the implementor had nothing to flag. Writing every stage's result to the workarea would fix it and is a bigger change than this.
- **No resume across machines for the branch lifecycle.** Its preserved work is patch files under `<workarea>/logs/`, which `workareas/` does not commit, so a second machine reports `restored: false` and builds from the top. The full lifecycle's wip commit is pushed and does travel. Sam's fourth part is therefore done for one lifecycle and not the other; `work.kind` is in the record so a later change can tell which.
- **No change to what stops a run.** A preserved stop still stops the whole run and still waits for a person, as `BUILD.md` says. This plan makes the relaunch cheap; it does not make a red ladder self-clearing, and rule 6 of `CLAUDE.md` still applies to it.
