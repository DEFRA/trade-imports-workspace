# A3: the rigour dial — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the increment build loop a `rigour` argument with three presets — `full` (today's pipeline), `standard` and `fast` — and a per-row override in `backlog.json`, so a row that is a spec sentence and a test is not planned, reviewed and verified as heavily as one that extends a shared module. The gate, the plan lint and the theme engineering review run at every preset, so lowering rigour lowers how much the change is *read*, never whether its tests pass.

**Architecture:** One table, `RIGOUR_RULES`, maps each preset to six questions the pipeline already asks in six places: which model tier plans, how many plan reviews run, whether style reviewers run, whether code review is split per (repo, language) group or runs once across the whole change, whether a consistency reviewer runs, and whether findings are verified before the judge or by it. The row's own `rigour` comes in by the same two paths `gatePhases` and `attempt` already use — `tim build start` under the full lifecycle, the branch stage's `jq` under the branch lifecycle — and resolves to `RIGOUR` when the row sets none. A new `tim build rigour <workarea>` proposes a preset per todo row from the row's shape, which the BUILD intake shows as a table before the launch; the operator changes any row with `tim backlog set --rigour`.

**Tech Stack:** Node.js ESM, vitest, zod (tim's option schemas), JSON Schema (`backlog.schema.json`, validated through ajv in `tim/src/backlog/validate-json.js`), the `Workflow` runtime's `agent()`/`log()`/`phase()` hooks, and the simulated workflow runtime in `tim/src/test-support/workflow-runtime.js` that the contract test drives.

**Design this implements:** `workareas/shared/build-loop-efficiency/DESIGN.md`, section A3. A1, A2 and A4 are built and merged (`02a067fb`, `132b73f5`, `8556fa7d`), so this plan starts from a loop that already has a required `e2e` key, a required `resumeFrom` key, and a row-level `attempt` record.

**Read "What each preset runs" and "Three things the design left open, and what was settled" below before Task 1.** The first is the decision table every task from 8 on implements; the second records three calls taken with Ian that the design's preset table does not pin down.

---

## Background an engineer needs before Task 1

**What the loop is.** `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js` (6,531 lines) is a `Workflow` script. It is launched by `scriptPath` with an `args` object and spawns subagents through `agent()`. It is never run directly; it is exercised by a simulated runtime in tests. **The script itself cannot run a command** — every read and write of the tree or the backlog is an agent running Bash and reporting structured output, and the script cannot read a file either. That last constraint decides Task 3's parity test: the loop carries its preset list as a literal, and a test holds that literal to the schema's enum.

**How the loop is tested.** `tim/src/backlog/workflow-contract.test.js` is the loop's test suite. `runLoop(path, { args, answers })` at line 273 executes the script against a fake runtime and returns a run with `agents` (each entry carrying `prompt` and `options`), `logs`, `result` and `error`. `answers` takes two forms: a positional array, each entry answering the next agent in order, or a function of `(prompt, options)` returning an answer per `options.label`. The function form is the one to use for every test in this plan — rigour changes *which* agents run, so a positional array would have to be re-counted on every change. `answeringRunLease` wraps either form and answers the run lease, the plan lint, the plan review, the plan review recorder and the theme check itself, so those stages never consume a positional answer.

The readers these tests need: `stageLabels(run)` (line 268) and the `labelsOf`/`promptOf` pairs each describe block defines (`:5138`, `:6609`, `:7235`). `promptOf(run, label)` returns one agent's prompt.

**The four run helpers these tasks use, and which one to reach for.** Every test in this plan belongs in one of four existing describe blocks, and uses that block's own helper:

| Describe | Helper | Increment | Answers |
|---|---|---|---|
| `the build stages` (`:999`) | `runFrom(...)` (`:1009`), `runFromWithArgs(argsOverride, ...)` (`:1131`), `runStartedWith(startResult, ...)` (`:1138`), `runWithRowRepos(rowRepos)` (`:1165`) | `inc-900` | positional |
| `the models config` (`:754`) | `runPlanOnlyWithModels(models)` (`:755`) | `inc-900` | positional, `planOnly` |
| `under the branch lifecycle` (`:5107`) | `runBranch(argsOverride, ...answers)` (`:5132`), `runMergeRow(...after)` (`:5313`) | `inc-900` | positional |
| `under the full lifecycle, with the envelope's own repo keys` (`:6477`) | `runPerf(argsOverride, answerOverrides)` (`:6603`) | `inc-014` | **by label**, with `isReviewer` (`:6592`) answering any reviewer `{findings: []}` |

Rigour changes how many reviewers run, so **every test that drives a row past the implementor goes in the `runPerf` block**: its answers are keyed by label, so an agent more or fewer costs nothing. The branch block's lists are positional — `reviewedAndLanded` (`:5305`) holds exactly three reviewer answers, one style, one code, one consistency — so a test there either keeps the row at `full` or stops before the Review phase.

Run the suite with:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

**The argument contract.** Every argument is required. `ALWAYS_REQUIRED` at `increment-build-loop.js:53-75` lists them; `requireKeys` at line 41 throws naming any that are missing, before any agent starts. The same list is mirrored in `REQUIRED_KEYS_BY_SCRIPT` at `workflow-contract.test.js:103-128`, so the two must change together, and `BASE_ARGS` at `:143-178` is the fixture every loop test starts from. A test at `:406` ("defaults no configuration key") forbids `CFG.<key> ??` anywhere in a workflow script, so `rigour` is read plainly and validated, never defaulted. `e2e` (`:106-114`) and `resumeFrom` (`:115-128`) are the two closest precedents: a required key with a small vocabulary, validated just after the config block, with a log line saying what the value means.

**The model tiers.** `MODEL_DEFAULTS` at `:306` is `{ think: 'opus', code: 'sonnet', light: 'haiku' }`. `withTier` at `:342` turns a tier into a function that adds `model` to an agent's options, and `think`, `code` and `light` at `:343-345` are the three it makes. Every `agent()` call in the loop wraps its options in one of them. `fast` plans on the `code` tier, which is what the design means by "Sonnet plan": the preset names the tier, not the model, so a run that overrode `models.code` still gets its own choice.

**A row's own fields reach the loop by two different paths.** This is the single most important thing to know before Tasks 4 and 5:

- **Full lifecycle** — `tim build start` reads the row and returns its fields in the JSON envelope the START stage copies back (`tim/src/build/start.js:377-378` sets `resumeAt` and `attempt`). The loop reads them at `increment-build-loop.js:5046-5047`.
- **Branch lifecycle** — the loop has no tim call there, so the BRANCH stage agent runs a `jq` over the backlog and reports the fields (`assertBranch`, `:3764-3808`; `BRANCH_ROW_SCHEMA`, `:3718-3764`). The loop reads them at `:4998-5005`, and `rowFieldProblems` at `:3810` checks them.

`gatePhases` goes down both paths and is the exact precedent to copy. `rigour` must too, or a full-lifecycle row's override would be silently ignored.

**The review fan-out.** `groupFilesForReview` (`:1053`) groups the implementor's changed files by `(repo, language)`, capped at 12 files a group (`REVIEW_GROUP_CAP`, `:984`). For each group the loop runs a style reviewer (`:5379-5398`) and a code reviewer (`:5400-5426`), plus one consistency reviewer across the whole change (`:5428-5457`); the Codex executor runs the same shape through `codexReview` (`:5461-5500`). They are assembled and run in parallel at `:5506-5509`, their findings flattened at `:5541`, verified per group at `:5545-5563`, and judged at `:5566-5574`.

**What the gate and the ladder prove, whatever the rigour.** `tim build gate <workarea> --phase unit|fit|e2e|all` runs the rungs `references/gates.json` lists per repo, at the baseline and again at the ladder. The ladder also runs the plan's section 5 ("Invariants to prove") and section 6 ("Increment-specific checks beyond the gate") checks itself (`:5708-5718`). That matters for `fast`: dropping the consistency reviewer does not drop the plan's own checks, because the ladder runs them too.

**House rules.** `.claude/rules/code-quality.md` governs comments, names and tests, and wins over anything in `docs/best-practices/`. Read it in full before writing code. In particular: no comment that restates the code, a comment says *why*, and a test name states the behaviour rather than the mechanism.

**Branch.** Every task lands on one branch:

```bash
git -C ~/git/defra/trade-imports-workspace checkout -b chore/NO_JIRA-build-loop-rigour
```

---

## What each preset runs

This table is the whole feature. Everything from Task 8 on implements one of its columns.

| What | `full` | `standard` | `fast` |
|---|---|---|---|
| Plan | `think` tier | `think` tier | `code` tier |
| Plan lint (code text, denied checks) | yes | yes | yes |
| Plan review | review, revise, re-review | review, revise; re-review when a finding is structural or the review names none | none |
| Implement | yes | yes | yes |
| Style reviewer per (repo, language) group | yes | no | no |
| Code reviewer | per group | per group | one, across the whole change |
| Consistency reviewer | yes | yes | no |
| Verify findings | a verifier per finding group | a verifier per finding group | the judge verifies them itself |
| Judge | yes | yes | yes |
| Fix, and the style re-review of the fixer's hunks | yes | yes | yes |
| Ladder (gate + the plan's checks) | yes | yes | yes |
| CI fix, and the style review of its commits | yes | yes | yes |
| Theme engineering review | yes | yes | yes |

Three things hold at every preset, and no task in this plan may make them configurable:

1. **The plan lint always runs.** `fast` drops the plan *review*, not the check that the plan obeys its contract.
2. **The gate always runs**, at whatever phases the row owes through `gatePhases` and `e2e`. `rigour` governs how much the change is planned and read, never whether its tests pass.
3. **The theme engineering review is not governed by `rigour`.** It runs once per theme, after the last row lands, over `git diff origin/main...HEAD` in every repo. It is the backstop for whatever a `fast` row's single reviewer missed, so making it configurable would remove the thing that makes `fast` safe to choose.

---

## Three things the design left open, and what was settled

**1. A structural finding under `standard`.** The design says `standard` runs "one plan reviewer rather than two, and it keeps its single send-back". Today a structural finding still open on the *revised* plan is what stops the increment — and that check needs a second read. Settled: `standard` reviews once and sends back once as the design says, and re-reads the revised plan **only when the first review's findings include a structural one**. Detail-only findings cost nothing extra: revise, record them under "Plan review: must address", build. A plan the reviewer called structurally wrong is re-read exactly as `full` would, and a structural finding still open stops the row. So the saving lands on the common case and the correctness guard stays.

**2. A verifier under `fast`.** The design's `fast` row lists "one code reviewer across the whole change, judge, fix, ladder" — no verify stage. Settled: no separate verifier, and the judge does the verifier's work first and its own second. Its prompt gains the verifier's `VERIFY_BY_KIND` defaults and a duty to test each finding against the code at file:line before ruling. The alternative — findings arriving at a judge whose prompt says "each survived verification" — would be a lie in a prompt, which is worse than either stage missing.

**3. "No style reviewers".** Settled: that means the per-(repo, language) style reviewers in the Review phase, and nothing else. The **style re-review of the fixer's hunks** (`:5651`) and the **style review of each CI fixer commit** (`:2256`) stay at every preset, because the fixer and the CI fixer work after every other reviewer: those two agents are the only readers of their lines, and the CI fixer pushes straight to an open pull request.

---

## File structure

| File | Change |
|---|---|
| `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js` | Modify: the `rigour` arg and its preset rules, the per-row resolution, the plan/review/verify/judge gating, the report |
| `tim/src/backlog/workflow-contract.test.js` | Modify: required keys, `BASE_ARGS`, and every test in this plan that drives the loop |
| `.claude/skills/requirements-pipeline/references/backlog.schema.json` | Modify: a row's optional `rigour` |
| `tim/src/backlog/backlog-schema.js` | Modify: `rigoursOf(schema)`, the one reader of that enum |
| `tim/src/backlog/backlog-schema.test.js` | Modify: a test for `rigoursOf` |
| `tim/src/backlog/shape.js` | Modify: `setRowFields` honours `rigour`, with `'none'` to clear |
| `tim/src/backlog/shape.test.js` | Modify: the schema's refusal message for a bad preset |
| `tim/src/commands/backlog/rows.js` | Modify: `tim backlog set --rigour` |
| `tim/src/commands/backlog/rows.test.js` | Modify: CLI tests for `--rigour` |
| `tim/src/build/start.js` | Modify: the start result carries the row's `rigour` |
| `tim/src/build/start.test.js` | Modify: tests for it |
| `tim/src/build/rigour.js` | **Create**: the pure derivation — a preset per todo row, with the reason |
| `tim/src/build/rigour.test.js` | **Create**: its tests |
| `tim/src/commands/build/rigour.js` | **Create**: `tim build rigour <workarea>`, JSON and text |
| `tim/src/commands/build/rigour.test.js` | **Create**: its CLI tests |
| `tim/src/commands/build/index.js` | Modify: register it |
| `.claude/skills/requirements-pipeline/references/BUILD.md` | Modify: the parameter, "Choosing rigour", the args block, the handover prompt |
| `.claude/skills/requirements-pipeline/workflow/README.md` | Modify: the args table, the worked example, a section on the dial |
| `workareas/shared/build-loop-efficiency/DESIGN.md` | Modify: A3's status and what the build settled |

---

## Task 1: The `rigour` argument

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:74` (the required-key list) and `:128` (after the `resumeFrom` block)
- Test: `tim/src/backlog/workflow-contract.test.js:103-128` (required keys), `:143-178` (`BASE_ARGS`), and the configuration describe at `:689-730`

**`BASE_ARGS` takes `rigour: 'full'`.** `full` is today's pipeline, so every existing test in the suite keeps asserting exactly what it asserts now. A test that wants another preset passes `{ ...BASE_ARGS, rigour: 'standard' }`.

- [ ] **Step 1: Write the failing tests**

In `tim/src/backlog/workflow-contract.test.js`, add `'rigour'` to `REQUIRED_KEYS_BY_SCRIPT['increment-build-loop.js']` after `'resumeFrom'` (line 125), and `rigour: 'full'` to `BASE_ARGS` after `resumeFrom: null` (line 177). Then add these tests to the configuration describe, after the `resumeFrom` tests that end at line 723:

```javascript
  test('stops before any agent when rigour is missing', async () => {
    const run = await runLoop(scriptPath, {
      args: withoutKey(BASE_ARGS, 'rigour')
    })

    expect(run.status).toBe('threw')
    expect(run.error.message).toContain(
      'increment-build-loop: args is missing required key rigour. Pass every one in args: this workflow has no defaults'
    )
    expect(run.agents).toEqual([])
  })

  test.each([['quick'], [null], [''], [{}], [['full']]])(
    'refuses rigour %j before any agent',
    async (value) => {
      const run = await runLoop(scriptPath, {
        args: { ...BASE_ARGS, rigour: value }
      })

      expect(run.error.message).toContain(
        'config.rigour must be one of full, standard, fast'
      )
      expect(run.agents).toEqual([])
    }
  )
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t rigour
```

Expected: FAIL. The missing-key test fails because `rigour` is not in `ALWAYS_REQUIRED` yet, so the loop runs on without it; the refusal tests fail because nothing validates the value.

- [ ] **Step 3: Add the key and its validation**

In `increment-build-loop.js`, add `'rigour'` to `ALWAYS_REQUIRED` after `'resumeFrom'` (line 74), keeping the list's one-key-per-line shape:

```javascript
  'e2e',
  'resumeFrom',
  'rigour'
]
```

Then, after the `resumeFrom` block that ends at line 128 and before `const CI_WATCH_WINDOWS`, add:

```javascript
const RIGOUR_PRESETS = ['full', 'standard', 'fast']
const RIGOUR = CFG.rigour
if (!RIGOUR_PRESETS.includes(RIGOUR)) {
  throw new Error(
    `${WORKFLOW_NAME}: config.rigour must be one of ${RIGOUR_PRESETS.join(', ')} — how much of the pipeline every row of this run gets, which a row's own \`rigour\` may change. Got ${JSON.stringify(RIGOUR)}`
  )
}
```

- [ ] **Step 4: Run the tests to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS, the whole file. `BASE_ARGS` carries `rigour: 'full'`, so no existing assertion moves.

- [ ] **Step 5: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build-loop): require a rigour preset in the args"
```

---

## Task 2: What each preset runs

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:345` (after the tier helpers)
- Test: `tim/src/backlog/workflow-contract.test.js`

The rules table goes after `think`, `code` and `light` are defined (line 345), beside the tier helpers whose names its `planTier` field holds. There is no helper to map a name to one of them: `withTier` already does that, for any tier, and Task 8 calls it directly.

- [ ] **Step 1: Write the failing tests**

Add to the configuration describe, after Task 1's tests:

```javascript
  test('says what the run’s rigour runs', async () => {
    const run = await runLoop(scriptPath, {
      args: { ...BASE_ARGS, rigour: 'standard' },
      answers: [WORKSPACE_ANSWER, null]
    })

    expect(run.logs).toContain(
      'increment-build-loop: rigour standard — a think-tier plan, reviewed once, and re-reviewed when a finding is structural or the review names none, no style reviewers, a code reviewer per (repo, language) group, a consistency review, and findings verified before the judge'
    )
  })

  test('says what fast gives up', async () => {
    const run = await runLoop(scriptPath, {
      args: { ...BASE_ARGS, rigour: 'fast' },
      answers: [WORKSPACE_ANSWER, null]
    })

    expect(run.logs).toContain(
      'increment-build-loop: rigour fast — a code-tier plan, no plan review, no style reviewers, one code reviewer across the whole change, no consistency review, and findings verified by the judge itself'
    )
  })
```

The test that keeps this literal and the backlog schema's enum in step belongs to Task 3, which adds the schema field: written here it could only be red, and no task commits a red suite.

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t rigour
```

Expected: FAIL — neither log line exists yet.

- [ ] **Step 3: Add the rules table and the summary**

After `const light = withTier('light')` at line 345, add:

```javascript
// `planReview: 'structural'` reviews the plan once and re-reads the revised plan only when the
// first review found the plan built wrong, so a lower rigour never lets a structural finding
// through unchecked.
const RIGOUR_RULES = {
  full: {
    planTier: 'think',
    planReview: 'twice',
    styleReviewers: true,
    reviewScope: 'group',
    consistencyReview: true,
    verifyFindings: true
  },
  standard: {
    planTier: 'think',
    planReview: 'structural',
    styleReviewers: false,
    reviewScope: 'group',
    consistencyReview: true,
    verifyFindings: true
  },
  fast: {
    planTier: 'code',
    planReview: 'none',
    styleReviewers: false,
    reviewScope: 'whole',
    consistencyReview: false,
    verifyFindings: false
  }
}

const rulesOf = (rigour) => RIGOUR_RULES[rigour]

const rigourSummary = (rigour) => {
  const planReviewPhrases = {
    twice: 'reviewed, revised and re-reviewed',
    structural: 'reviewed once, and re-reviewed when a finding is structural or the review names none',
    none: 'no plan review'
  }
  const rules = rulesOf(rigour)
  return [
    `a ${rules.planTier}-tier plan, ${planReviewPhrases[rules.planReview]}`,
    rules.styleReviewers ? 'style reviewers' : 'no style reviewers',
    rules.reviewScope === 'whole' ? 'one code reviewer across the whole change' : 'a code reviewer per (repo, language) group',
    rules.consistencyReview ? 'a consistency review' : 'no consistency review',
    rules.verifyFindings ? 'and findings verified before the judge' : 'and findings verified by the judge itself'
  ].join(', ')
}

log(`${WORKFLOW_NAME}: rigour ${RIGOUR} — ${rigourSummary(RIGOUR)}`)
```

- [ ] **Step 4: Run the tests**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS, the whole file. A test that asserts an exact `run.logs` array for a successful run gains this line; update any that does.

- [ ] **Step 5: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build-loop): name what each rigour preset runs"
```

---

## Task 3: A row's own `rigour`

**Files:**
- Modify: `.claude/skills/requirements-pipeline/references/backlog.schema.json:411-414` (after `awaitCi`)
- Modify: `tim/src/backlog/backlog-schema.js` (after `statusesOf`)
- Modify: `tim/src/backlog/shape.js:420-460` (`setRowFields`)
- Modify: `tim/src/commands/backlog/rows.js:37-60`, `:138-170`, `:260-305`
- Test: `tim/src/backlog/backlog-schema.test.js`, `tim/src/backlog/shape.test.js:290-345`, `tim/src/commands/backlog/rows.test.js`

**Why the message reads the way it does.** `validateJson` (`tim/src/backlog/validate-json.js:60-65`) drops the branch errors nested under a failed `anyOf`, so a bad `rigour` under `anyOf: [{enum}, {type: null}]` arrives as one `anyOf` error at the field's path. `fieldProblem` (`tim/src/backlog/shape.js:103-115`) then finds no enum error and falls through to `expectationOf`, which renders the branches and joins them with " or ". The message is therefore `inc-001 "rigour" must be one of: full, standard, fast or null.` — the same shape `gatePhases` produces, for the same reason.

- [ ] **Step 1: Write the failing tests**

In `tim/src/backlog/shape.test.js`, add to the describe that holds the `gatePhases` tests (after the one ending at line 344):

```javascript
    test('passes a row that sets a rigour preset, and one that leaves it null', () => {
      const rows = [row({ rigour: 'fast' }), row({ id: 'inc-002', rigour: null })]

      expect(checkBacklog(backlogOf(...rows)).problems).toEqual([])
    })

    test('refuses a rigour preset the loop does not have', () => {
      expect(checkBacklog(backlogOf(row({ rigour: 'quick' }))).problems).toEqual(
        ['inc-001 "rigour" must be one of: full, standard, fast or null.']
      )
    })
```

In `tim/src/backlog/backlog-schema.test.js`, add:

```javascript
  test('names the rigour presets a row may set, in the schema’s order', () => {
    expect(rigoursOf(loadBacklogSchema(workspaceRoot))).toEqual([
      'full',
      'standard',
      'fast'
    ])
  })
```

matching that file's existing import and workspace-root idiom for `statusesOf`.

In `tim/src/backlog/workflow-contract.test.js`, in the `describe('every workflow script')` block after the house-rules parity test at `:367-380`, add the test that keeps the loop's literal and the schema's enum in step. The loop cannot read a file, so its `RIGOUR_PRESETS` is a literal, and this is what stops the two drifting:

```javascript
  test('offers exactly the rigour presets a row may set', () => {
    const loop = readFileSync(
      join(buildLoopDir, 'increment-build-loop.js'),
      'utf8'
    )
    const schema = loadBacklogSchema(workspaceRoot)

    expect(wordsInJsArray(loop, 'RIGOUR_PRESETS')).toEqual(rigoursOf(schema))
  })
```

It calls `rigoursOf` rather than re-deriving the enum's path: Step 4 adds that reader for this read, and a second copy of the expression is a second mechanism beside it.

Import what it needs at the top of that file, beside its existing imports:

```javascript
import { loadBacklogSchema, rigoursOf } from './backlog-schema.js'
```

`wordsInJsArray` (`:70`), `buildLoopDir` and `workspaceRoot` are already there.

In `tim/src/commands/backlog/rows.test.js`, add to the `tim backlog set` describe:

```javascript
  test('sets a row’s rigour', async () => {
    writeBacklog([row()])

    const run = await runTim(['set', WORKAREA, 'inc-001', '--rigour', 'fast'])

    expect(run.exitCode).toBe(0)
    expect(readRows()[0].rigour).toBe('fast')
  })

  test('clears a row’s rigour with "none"', async () => {
    writeBacklog([row({ rigour: 'fast' })])

    const run = await runTim(['set', WORKAREA, 'inc-001', '--rigour', 'none'])

    expect(run.exitCode).toBe(0)
    expect(Object.hasOwn(readRows()[0], 'rigour')).toBe(false)
  })

  test('refuses a rigour that is not a preset', async () => {
    writeBacklog([row()])

    const run = await runTim(['set', WORKAREA, 'inc-001', '--rigour', 'quick'])

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      '--rigour must be "none" to clear it, or one of full, standard, fast.'
    )
  })
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- shape backlog-schema rows
```

Expected: FAIL — the schema allows anything in `rigour`, `rigoursOf` is not exported, and `--rigour` is an unknown option.

- [ ] **Step 3: Declare the field**

In `backlog.schema.json`, after the `awaitCi` property (which ends at line 414) and before `"ticket"`:

```json
        "rigour": {
          "description": "How much of the pipeline this row gets, overriding the run's `rigour`: `full` (every stage, the plan reviewed twice), `standard` (one plan review, no style reviewers) or `fast` (one code reviewer across the whole change, whose findings the judge verifies itself). The plan lint, the gate and the theme's engineering review run at every preset. null or absent: the run's value. `tim build rigour <workarea>` proposes one per row; BUILD.md's \"Choosing rigour\" says what each preset runs in full.",
          "anyOf": [
            { "enum": ["full", "standard", "fast"] },
            { "type": "null" }
          ]
        },
```

- [ ] **Step 4: Export the one reader of that enum**

In `tim/src/backlog/backlog-schema.js`, after `statusesOf`:

```javascript
/**
 * The rigour presets a row may set, in the order the schema lists them.
 *
 * @param {object} schema - The backlog schema
 * @returns {string[]}
 */
export const rigoursOf = (schema) =>
  rowSchemaOf(schema).properties.rigour.anyOf.find((branch) => branch.enum).enum
```

It finds the branch that has an enum rather than taking `anyOf[0]`: `expectationOf` in `shape.js` reads these branches order-independently too, and a reordered schema should not quietly change what the CLI validates against.

- [ ] **Step 5: Apply it in `setRowFields`**

In `tim/src/backlog/shape.js`, inside `setRowFields`, after the `attempt` block (lines 444-447) and before `if (changes.commit !== undefined) delete after.attempt`:

```javascript
  if (changes.rigour !== undefined) {
    if (changes.rigour === 'none') delete after.rigour
    else after.rigour = changes.rigour
  }
```

- [ ] **Step 6: Add the option**

In `tim/src/commands/backlog/rows.js`:

Add `rigour: z.string().optional()` to `setOptsSchemaFor`'s object, after `attempt` (line 52), and extend its refine message to end `..., --depends-on, --attempt or --rigour.`

After `parseAttempt` (which ends at line 100), add:

```javascript
const parseRigour = (raw, rigours) => {
  if (raw === 'none') return 'none'
  if (!rigours.includes(raw)) {
    throw new TimError(
      'USAGE',
      `--rigour must be "none" to clear it, or one of ${rigours.join(', ')}.`
    )
  }
  return raw
}
```

Change `parseSetOpts`'s signature to take the presets alongside the statuses, pass `rigour: opts.rigour` into `parseOptions`, and add the conversion:

```javascript
export const parseSetOpts = (opts, statuses, rigours) => {
  const parsed = parseOptions(setOptsSchemaFor(statuses), {
    status: opts.status,
    commit: opts.commit,
    ticket: opts.ticket,
    branch: opts.branch,
    note: opts.note,
    openQuestion: opts.openQuestion,
    pr: opts.pr,
    merge: opts.merge,
    dependsOn: opts.dependsOn,
    attempt: opts.attempt,
    rigour: opts.rigour
  })
  return Object.fromEntries(
    Object.entries({
      ...parsed,
      pr: parsed.pr === undefined ? undefined : parsePr(parsed.pr),
      merge: parsed.merge === undefined ? undefined : parseMerge(parsed.merge),
      dependsOn:
        parsed.dependsOn === undefined
          ? undefined
          : parseDependsOn(parsed.dependsOn),
      attempt:
        parsed.attempt === undefined ? undefined : parseAttempt(parsed.attempt),
      rigour:
        parsed.rigour === undefined
          ? undefined
          : parseRigour(parsed.rigour, rigours)
    }).filter(([, value]) => value !== undefined)
  )
}
```

Update its JSDoc `@param` list to name `rigours - The rigour presets backlog.schema.json allows`, add the option to the command, and extend its description and examples. The `set` command is registered at `:260-305`; add after the `--attempt` option:

```javascript
    .option(
      '--rigour <preset>',
      'How much of the pipeline this row gets, overriding the run\'s rigour: full, standard or fast. "none" clears it, and `tim build rigour <workarea>` proposes one'
    )
```

and in its `addHelpText`:

```javascript
        '  tim backlog set shared/my-programme inc-004 --rigour fast --json\n' +
```

Then pass the presets at the call site, which already loads the schema for `statusesOf`: find the `set` action's `parseSetOpts(opts, statusesOf(schema))` call and make it `parseSetOpts(opts, statusesOf(schema), rigoursOf(schema))`, importing `rigoursOf` beside `statusesOf`.

- [ ] **Step 7: Run the tests**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- shape backlog-schema rows workflow-contract
```

Expected: PASS, the parity test included — the loop's `RIGOUR_PRESETS` and the schema's enum now agree.

- [ ] **Step 8: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/references/backlog.schema.json tim/src/backlog/backlog-schema.js tim/src/backlog/backlog-schema.test.js tim/src/backlog/shape.js tim/src/backlog/shape.test.js tim/src/commands/backlog/rows.js tim/src/commands/backlog/rows.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(backlog): let a row set its own rigour"
```

---

## Task 4: `tim build start` reports the row's rigour

**Files:**
- Modify: `tim/src/build/start.js:288-303` (`emptyResult`), `:377-378`, `:419` (the JSDoc)
- Test: `tim/src/build/start.test.js`

- [ ] **Step 1: Write the failing tests**

In `tim/src/build/start.test.js`, after the attempt tests that end at line 395:

```javascript
  test('reports the rigour a row sets', async () => {
    await workspaceWith([row({ ticket: 'EUDPA-77', rigour: 'fast' })])
    jiraKnows('EUDPA-77', 'In Dev')

    const outcome = await start()

    expect(outcome.rigour).toBe('fast')
  })

  test('reports no rigour for a row that sets none', async () => {
    await workspaceWith([row({ ticket: 'EUDPA-77' })])
    jiraKnows('EUDPA-77', 'In Dev')

    const outcome = await start()

    expect(outcome.rigour).toBeNull()
  })
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- build/start
```

Expected: FAIL with `undefined` where `'fast'` and `null` are expected.

- [ ] **Step 3: Carry the field**

In `tim/src/build/start.js`, add `rigour: null` to `emptyResult` after `attempt: null` (line 296):

```javascript
  resumeAt: null,
  attempt: null,
  rigour: null,
```

and in `runSteps`, after `result.attempt = row.attempt ?? null` (line 378):

```javascript
  result.rigour = row.rigour ?? null
```

Extend the `@returns` line of `runBuildStart`'s JSDoc (line 419) so it names the new field after `attempt`: `..., rigour (the row's own rigour preset, or null when it sets none), branched, ...`.

- [ ] **Step 4: Run the tests to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- build/start
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add tim/src/build/start.js tim/src/build/start.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build): report a row's rigour from tim build start"
```

---

## Task 5: The branch stage reports the row's rigour

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:3718-3764` (`BRANCH_ROW_SCHEMA`), `:3774` (the `jq`), `:3796-3802` (STEP 3), `:3810-3822` (`rowFieldProblems`)
- Test: `tim/src/backlog/workflow-contract.test.js`, in the branch-lifecycle describe at `:5132`

- [ ] **Step 1: Write the failing tests**

In the branch-lifecycle describe (the one that defines `runBranch`, `labelsOf` and `promptOf` at `:5132-5141`), add:

```javascript
      test('asks the branch stage for the row’s rigour alongside its gate phases', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 branch')

        expect(prompt).toContain(
          '{repos, merge, gatePhases, awaitCi, rigour, commit, prs, attempt}'
        )
        expect(prompt).toContain(
          '- rigour: verbatim when it is full, standard or fast. Leave it out when it is null or absent.'
        )
      })

      test('stops a row whose rigour is not a preset, naming it', async () => {
        const run = await runBranch({}, { ...ROW, rigour: 'quick' })

        expect(run.result.increments[0]).toMatchObject({
          id: 'inc-900',
          outcome: 'row-invalid'
        })
        expect(run.result.stopped.detail).toContain(
          'rigour is "quick"; use full, standard, fast'
        )
      })
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t "branch stage"
```

Expected: FAIL — the `jq` names no `rigour`, and a bad preset passes `rowFieldProblems` untouched.

- [ ] **Step 3: Add it to the schema, the command and the report**

In `BRANCH_ROW_SCHEMA`, after the `awaitCi` property (line 3746):

```javascript
    rigour: {
      type: 'string',
      description: "The row's rigour verbatim. Leave it out when the row's is null or absent"
    },
```

In `assertBranch`'s STEP 1, change the `jq` at line 3774 to:

```javascript
\`jq -c '.increments[] | select(.id=="${id}") | {repos, merge, gatePhases, awaitCi, rigour, commit, prs, attempt}' ${BACKLOG_TILDE}\`
```

and in STEP 3, after the `awaitCi` bullet (line 3797):

```
- rigour: verbatim when it is full, standard or fast. Leave it out when it is null or absent.
```

- [ ] **Step 4: Check it**

Replace `rowFieldProblems` (line 3810) with a version that destructures `rigour` and spreads one more check:

```javascript
const rowFieldProblems = ({ repos: rowRepos, merge = [], gatePhases, rigour }) => {
  const mergeRepos = merge.map((entry) => entry.repo)
  return [
    ...rowRepos.filter((key) => !REPO_KEYS.includes(key)).map((key) => `repos names "${key}", which is not a configured repo`),
    ...duplicatesIn(rowRepos).map((key) => `repos names "${key}" twice`),
    ...mergeRepos.filter((key) => !rowRepos.includes(key)).map((key) => `merge names "${key}", which is not in the row's repos`),
    ...merge.filter((entry) => !entry.ref?.trim()).map((entry) => `merge gives "${entry.repo}" no ref`),
    ...(gatePhases ?? []).filter((name) => !GATE_PHASES.includes(name)).map((name) => `gatePhases names "${name}"; use unit, fit and e2e`),
    ...duplicatesIn(gatePhases ?? []).map((name) => `gatePhases names "${name}" twice`),
    ...(rigour === undefined || rigour === null || RIGOUR_PRESETS.includes(rigour)
      ? []
      : [`rigour is "${rigour}"; use ${RIGOUR_PRESETS.join(', ')}`])
  ]
}
```

**It is an inline spread, like every other check in that function, and it treats `null` as absent.** The BRANCH stage is an agent reading `jq` output: the schema and STEP 3 both tell it to leave the field out when the row sets none, but prose does not bind a model, and a reported `null` must not halt a run. Both fields this one imitates already guard the same way — `gatePhases ?? []`, `awaitCi !== false`. A test must cover it, and must be shown to go red against a `=== undefined`-only check.

- [ ] **Step 5: Run the tests to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build-loop): read a row's rigour in the branch stage"
```

---

## Task 6: The preflight refuses a bad preset before the run starts

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:3490-3525` (`PREFLIGHT_SCHEMA`), `:3537-3540` (the row step), `:3543-3556` (the prompt), `:3604-3616` (the checks)
- Test: `tim/src/backlog/workflow-contract.test.js`

A1 moved the row-level `repos` check into the preflight so a backlog full of bad rows fails in seconds rather than one row at a time after the lease. The same holds for `rigour`: a preset typo in row 7 should not be found after six rows have been built. The preflight's `rowRepos` field now carries two things, so it is renamed `todoRows` in the same change — a field called `rowRepos` that also carries rigour would be a name that lies.

- [ ] **Step 1: Write the failing tests**

In `describe('the build stages')`, rename the helper at `:1165` and its fixture key, which is the one edit that also touches its three existing call sites at `:1170`, `:1187` and `:1197`:

```javascript
    const runWithTodoRows = (todoRows) =>
      runLoop(scriptPath, {
        args: BASE_ARGS,
        answers: [WORKSPACE_ANSWER, preflightAnswer({ todoRows }), START_ANSWER]
      })
```

Each existing call keeps its rows and gains nothing: `runWithTodoRows([{ id: 'inc-900', repos: ['frontend'] }, ...])` — a row with no `rigour` key is a row that sets none, which is the case those tests are about. Then add:

```javascript
    test('stops at the preflight when a todo row’s rigour is not a preset', async () => {
      const run = await runWithTodoRows([
        { id: 'inc-900', repos: ['frontend'], rigour: null },
        { id: 'inc-901', repos: ['frontend'], rigour: 'quick' }
      ])

      expect(run.error.message).toContain(
        'inc-901 sets rigour "quick", which is not one of full, standard, fast'
      )
      expect(run.error.message).not.toContain('inc-900')
      expect(run.agents.map((entry) => entry.options.label)).toEqual([
        'workspace',
        'preflight'
      ])
    })

    test('lets a row that sets a preset through the preflight', async () => {
      const run = await runWithTodoRows([
        { id: 'inc-900', repos: ['frontend'], rigour: 'fast' }
      ])

      expect(run.agents.map((entry) => entry.options.label)).toContain(
        'inc-900 start'
      )
    })

    test('asks the preflight for every todo row’s repos and rigour', async () => {
      const run = await runFrom(null)
      const prompt = run.agents.find(
        (entry) => entry.options.label === 'preflight'
      ).prompt

      expect(prompt).toContain('{id, repos: (.repos // []), rigour}')
      expect(prompt).toContain("Copy the last command's output into todoRows")
    })
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t preflight
```

Expected: FAIL — the schema has no `todoRows`, and nothing reads a row's rigour there.

- [ ] **Step 3: Ask for it**

In `PREFLIGHT_SCHEMA`, replace the `rowRepos` property (lines 3511-3524) with:

```javascript
    todoRows: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'repos'],
        properties: {
          id: { type: 'string' },
          repos: { type: 'array', items: { type: 'string' } },
          rigour: { type: ['string', 'null'] }
        },
        additionalProperties: false
      },
      description:
        "Every todo increment's id, its repos list ([] where it names none) and its rigour (null where it sets none)"
    }
```

Replace `ROW_REPOS_STEP` (line 3537) with:

```javascript
const TODO_ROWS_STEP = `
${IS_BRANCH ? 5 : 4}. \`jq -c '[.increments[] | select(.status=="todo") | {id, repos: (.repos // []), rigour}]' ${BACKLOG_TILDE}\``
```

and in the preflight prompt, use `${TODO_ROWS_STEP}` in place of `${ROW_REPOS_STEP}`, change the opening sentence's tail from `and which repos those increments name` to `which repos those increments name and what each asks of the pipeline`, and change the last instruction from `Copy the last command's output into rowRepos exactly as printed, every id and repos list as it is.` to:

```
Copy the last command's output into todoRows exactly as printed, every id, repos list and rigour as it is.
```

- [ ] **Step 4: Check it**

Replace the `rowRepoProblems`/`unconfiguredRowRepos` block (lines 3604-3616) with:

```javascript
const rowRepoProblems = (rows) =>
  rows.flatMap(({ id, repos: rowRepos }) =>
    rowRepos
      .filter((key) => !REPO_KEYS.includes(key))
      .map((key) => `${id} names repo ${JSON.stringify(key)}, which config.repos does not configure`)
  )

const rowRigourProblems = (rows) =>
  rows
    .filter(({ rigour }) => rigour !== null && rigour !== undefined && !RIGOUR_PRESETS.includes(rigour))
    .map(({ id, rigour }) => `${id} sets rigour ${JSON.stringify(rigour)}, which is not one of ${RIGOUR_PRESETS.join(', ')}`)

const todoRows = preflight.todoRows ?? []
const repoProblems = rowRepoProblems(todoRows)
const rowProblems = [...repoProblems, ...rowRigourProblems(todoRows)]
if (rowProblems.length > 0) {
  const fix =
    repoProblems.length > 0
      ? 'Fix the rows, or add the repo to config.repos and the backlog envelope, then launch again'
      : 'Fix the rows, then launch again'
  throw new Error(`${WORKFLOW_NAME}: ${rowProblems.join('; ')}. ${fix}`)
}
```

**The remedy is conditional because the two problems have different remedies.** "Add the repo to `config.repos`" is no use to somebody who typed `quick` instead of `fast`, and an error that sends the reader to the wrong file costs more than a longer one. Each branch is pinned by the test that drives it: the rigour test also asserts the message does NOT mention `config.repos`.

**One trap in this step.** The instruction sentence to replace spans a line break in the source (`Copy the last` / `command's output into rowRepos`), while the test asserts it with a space. Reflow the template literal so the sentence is contiguous, or the prescribed test fails on a hidden newline — and the tempting fix is to weaken the assertion to a fragment, which would leave the preflight's instruction unpinned while looking green.

- [ ] **Step 5: Run the tests to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS. Any neighbouring test that answered the preflight with `rowRepos` fails until its fixture is renamed to `todoRows` — rename each, which is the only churn this task causes.

- [ ] **Step 6: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build-loop): refuse a bad rigour preset at the preflight"
```

---

## Task 7: Resolve the row's rigour and log what it runs

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:4971-4978` (the row vars), `:5005-5008` (the branch path), `:5046-5058` (the full path), `:5084` (beside `builderPhases`)
- Test: `tim/src/backlog/workflow-contract.test.js`

- [ ] **Step 1: Write the failing tests**

The per-increment log line is written before the baseline, so a run that stops at the next stage still carries it: each of these tests gives the stages it needs and nothing after.

In the branch-lifecycle describe (`:5107`), where `ROW` is the row fixture its neighbours pass to `runBranch`:

```javascript
      test('takes a row’s own rigour over the run’s, and says so', async () => {
        const run = await runBranch({ rigour: 'full' }, { ...ROW, rigour: 'fast' })

        expect(run.logs).toContain(
          "inc-900: rigour fast (the row's own, over the run's full) — a code-tier plan, no plan review, no style reviewers, one code reviewer across the whole change, no consistency review, and findings verified by the judge itself"
        )
      })

      test('gives a row that sets none the run’s rigour', async () => {
        const run = await runBranch({ rigour: 'standard' }, ROW)

        expect(run.logs).toContain(
          'inc-900: rigour standard — a think-tier plan, reviewed once, and re-reviewed when a finding is structural or the review names none, no style reviewers, a code reviewer per (repo, language) group, a consistency review, and findings verified before the judge'
        )
      })
```

In `describe('the build stages')` (`:999`), through `runStartedWith` (`:1138`), which is the helper that takes a `tim build start` result:

```javascript
    test('takes a row’s rigour from tim build start', async () => {
      const run = await runStartedWith(startedResult({ rigour: 'fast' }), null)

      expect(run.logs).toContain(
        "inc-900: rigour fast (the row's own, over the run's full) — a code-tier plan, no plan review, no style reviewers, one code reviewer across the whole change, no consistency review, and findings verified by the judge itself"
      )
    })
```

`BASE_ARGS` is `full`, so that run's own rigour is `full` and the row's `fast` is the override.

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t "rigour"
```

Expected: FAIL — no per-row log line exists.

- [ ] **Step 3: Resolve it on both paths**

Add the variable beside the other row fields, after `let rowAwaitsCi = true` (line 4978):

```javascript
  let rowRigour = RIGOUR
```

In the branch path, after `rowAwaitsCi = row.awaitCi !== false` (line 5005):

```javascript
      rowRigour = row.rigour ?? RIGOUR
```

In the full path, after `rowAttempt = started.attempt ?? null` (line 5047):

```javascript
    rowRigour = started.rigour ?? RIGOUR
```

Then, beside `const builderPhases` (line 5084), which is the first point both paths have joined:

```javascript
  log(
    `${id}: rigour ${rowRigour}${rowRigour === RIGOUR ? '' : ` (the row's own, over the run's ${RIGOUR})`} — ${rigourSummary(rowRigour)}`
  )
```

**This task declares no `rules` const.** An earlier draft put `const rules = rulesOf(rowRigour)` here, which nothing in this task reads — and the house rule is to build only what a change makes reachable. (No linter would have caught it: nothing lints `.claude/skills/**/*.js`.) Task 9 declares it, in the Review phase where it is first read; Task 8 needs only `rulesOf(rigour)` inside `reviewedPlan`, and `rowRigour` itself at the call site.

- [ ] **Step 4: Run the tests to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build-loop): resolve each row's rigour and log what it runs"
```

---

## Task 8: The plan stage — the tier, and how many reviews

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:3007` (`planIncrement`), `:3103` (its agent options), `:3278-3290` (`planPassingLint`), `:3380-3395` (`withMustAddress`), `:3437-3463` (`reviewedPlan`), `:5211` (the call site)
- Test: `tim/src/backlog/workflow-contract.test.js`

- [ ] **Step 1: Write the failing tests**

The `planOnly` run is the cheapest way to drive the plan stage: it needs three answers and never touches a repo. Add a describe beside the existing `the models config` one at `:753`:

```javascript
  describe('the plan stage at each rigour', () => {
    const PLANNED = {
      ok: true,
      summary: 'Planned.',
      repos: ['frontend'],
      behaviourChanges: [],
      decisions: []
    }

    const runPlanOnlyAt = (rigour, plans = {}) =>
      runLoop(scriptPath, {
        args: { ...BASE_ARGS, planOnly: true, rigour },
        plans,
        answers: [WORKSPACE_ANSWER, { ok: true, summary: '1' }, PLANNED, PLANNED]
      })

    const modelOf = (run, label) =>
      run.agents.find((entry) => entry.options.label === label).options.model

    test('plans on the think tier at full and standard', async () => {
      expect(modelOf(await runPlanOnlyAt('full'), 'inc-900 plan')).toBe('opus')
      expect(modelOf(await runPlanOnlyAt('standard'), 'inc-900 plan')).toBe('opus')
    })

    test('plans on the code tier at fast', async () => {
      expect(modelOf(await runPlanOnlyAt('fast'), 'inc-900 plan')).toBe('sonnet')
    })

    test('runs no plan review at fast', async () => {
      const labels = stageLabels(await runPlanOnlyAt('fast'))

      expect(labels).toContain('inc-900 plan')
      expect(labels).toContain('inc-900 plan lint')
      expect(labels).not.toContain('inc-900 plan review')
    })

    test('re-reviews a revised plan at full', async () => {
      const labels = stageLabels(
        await runPlanOnlyAt('full', {
          'inc-900 plan review': {
            approved: false,
            summary: 'one detail',
            findings: [
              { kind: 'detail', section: '9', what: 'a comment to delete', rule: 'house rules', mustBecomeTrue: 'it is gone' }
            ]
          }
        })
      )

      expect(labels).toContain('inc-900 revise plan')
      expect(labels).toContain('inc-900 plan review 2')
    })

    test('does not re-review a revised plan at standard when every finding is a detail', async () => {
      const run = await runPlanOnlyAt('standard', {
        'inc-900 plan review': {
          approved: false,
          summary: 'one detail',
          findings: [
            { kind: 'detail', section: '9', what: 'a comment to delete', rule: 'house rules', mustBecomeTrue: 'it is gone' }
          ]
        }
      })

      expect(stageLabels(run)).toContain('inc-900 revise plan')
      expect(stageLabels(run)).not.toContain('inc-900 plan review 2')
      expect(run.logs).toContain(
        "inc-900: one plan review runs at this row's rigour, so the revised plan is not re-read. Its 1 finding(s) stand. Building it, with each as required work."
      )
    })

    test('re-reviews a revised plan at standard when the first review found it built wrong', async () => {
      const labels = stageLabels(
        await runPlanOnlyAt('standard', {
          'inc-900 plan review': {
            approved: false,
            summary: 'wrong layer',
            findings: [
              { kind: 'structural', section: '3', what: 'the rule lives in the model', rule: 'architecture doc', mustBecomeTrue: 'it lives in obligations' }
            ]
          }
        })
      )

      expect(labels).toContain('inc-900 plan review 2')
    })
  })
```

The `plans` option on `runLoop` is the per-label override `answeringRunLease` reads for plan-check stages (`planCheckAnswer`, `:226`), so these tests set the review's verdict without disturbing the positional answers. Match each finding object to `PLAN_REVIEW_SCHEMA`'s required fields; read the schema before writing the fixtures and copy its field names exactly.

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t "the plan stage at each rigour"
```

Expected: FAIL — the plan always takes `think`, and the review always runs twice when it sends the plan back.

- [ ] **Step 3: Thread the rigour through the planner**

Change `planIncrement`'s signature (line 3007) to take the rigour, and its agent options (line 3103) to take the tier from it:

```javascript
const planIncrement = (id, branchedRepos = null, { label = `${id} plan`, deniedChecks = [], codeText = [], reviewFindings = [], rigour } = {}) =>
```

```javascript
    withTier(rulesOf(rigour).planTier)({ label, phase: 'Plan', schema: PLAN_SCHEMA })
```

`withTier` (`:349`) is the existing helper `think`, `code` and `light` are each made from, and it takes any tier name — so the preset's `planTier` goes straight to it, with no second mapping helper in between.

Change `planPassingLint` (line 3278) to take and pass it:

```javascript
const planPassingLint = async (id, branchedRepos = null, rigour) => {
  const plan = await planIncrement(id, branchedRepos, { label: `${id} plan`, rigour })
  if (!plan?.ok) return plan
  const problems = await planProblemsOf(id, plan, `${id} plan lint`)
  if (problems.codeText === null) return unreadablePlan(id, plan)
  if (!hasPlanProblems(problems)) return plan
  log(`${id}: ${planProblemList(problems, false)}. Sending the planner back once.`)
  const replan = await planIncrement(id, branchedRepos, { label: `${id} replan`, rigour, ...problems })
  return refusedUnlessClean(id, replan, `${id} replan lint`)
}
```

- [ ] **Step 4: Make the second review conditional**

Give `withMustAddress` the reason for its log line, so each caller says what is true rather than one wording covering both:

```javascript
const withMustAddress = async (id, plan, findings, why) => {
  log(`${id}: ${why} Building it, with each as required work.`)
  const record = await recordMustAddress(id, findings)
  ...
}
```

Then replace `reviewedPlan` (lines 3437-3463) with:

```javascript
const reviewsRevisedPlan = (rules, findings) =>
  rules.planReview === 'twice' || findings.length === 0 || findings.some(isStructural)

const reviewedPlan = async (id, branchedRepos = null, rigour) => {
  const rules = rulesOf(rigour)
  const plan = await planPassingLint(id, branchedRepos, rigour)
  if (!plan?.ok) return plan
  if (rules.planReview === 'none') return plan
  const review = await reviewPlan(id, { label: `${id} plan review` })
  if (!review) return noPlanReview(plan)
  if (!sendsPlanBack(review)) return withFollowUps(plan, [review])
  const findings = review.findings ?? []
  log(`${id}: the plan review sent the plan back with ${findings.length} finding(s). Sending the planner back once.`)
  const revised = await refusedUnlessClean(
    id,
    await planIncrement(id, branchedRepos, { label: `${id} revise plan`, reviewFindings: findings, rigour }),
    `${id} revise plan lint`
  )
  if (!revised?.ok) return revised
  if (!reviewsRevisedPlan(rules, findings)) {
    return withMustAddress(
      id,
      withFollowUps(revised, [review]),
      findings,
      `one plan review runs at this row's rigour, so the revised plan is not re-read. Its ${findings.length} finding(s) stand.`
    )
  }
  const second = await reviewPlan(id, { label: `${id} plan review 2`, earlierFindings: findings })
  if (!second) return noPlanReview(revised)
  const reviewed = withFollowUps(revised, [review, second])
  if (!sendsPlanBack(second)) return reviewed
  const stillOpen = second.findings ?? []
  if (stillOpen.length === 0 || stillOpen.some(isStructural)) return refusedAfterSecondReview(reviewed, second)
  return withMustAddress(
    id,
    reviewed,
    stillOpen,
    `the revised plan has ${stillOpen.length} detail finding(s) still open.`
  )
}
```

- [ ] **Step 5: Pass the rigour at BOTH call sites**

`reviewedPlan` is called twice. The row loop's call takes the row's rigour:

```javascript
  plan = enterAt === 'build' ? await reviewedPlan(id, repos, rowRigour) : await readReviewedPlan(id, repos)
```

and the `PLAN_ONLY` branch's call takes the run's, branching nothing:

```javascript
    const plan = await reviewedPlan(id, null, RIGOUR)
```

**Miss the second and nothing works.** `rulesOf(undefined).planTier` is a `TypeError`, and `planOnly` is the path every test in this task drives — so the whole task fails at its first test run. Grep for `reviewedPlan(`, `planIncrement(` and `withMustAddress(` and check every call before you run anything.

Drop the `branchedRepos = null` defaults from `planPassingLint` and `reviewedPlan` while you are in their signatures: an optional parameter before a required one is wrong, and every caller passes it.

`readReviewedPlan` (`:3466`) is unchanged: a resumed row reads a plan that was already written and reviewed, on the `code` tier at every preset.

- [ ] **Step 6: Run the tests to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS, including every existing plan test — `BASE_ARGS` is `full`, which is today's behaviour.

- [ ] **Step 7: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build-loop): plan and review a row by its rigour"
```

---

## Why Task 9 extracts the code reviewer's prompt

`fast` runs "one code reviewer across the whole change". The code reviewer's prompt is thirty lines of persona, context, scope and lens built inline inside `reviewGroups.map` (`:5400-5426`), and the only parts that differ for a whole-change reviewer are the two lines that say *what* is being reviewed and *which diff command* shows it. Copying those thirty lines would leave two prompts to keep in step, and the house rules forbid a second copy of something that exists.

So Task 9 lifts the body into `codeReviewerPrompt({ reviewing, diffCommand })` with the group case passing exactly what it passes today — `groupHeader(group)` and `groupDiffCommand(group)` — so the prompt for a group is byte-identical and every existing review test keeps passing. The whole-change case passes its own header and a diff instruction that names the repo per file. The existing tests are the guard on the extraction: write the new test first, extract second, and the suite proves nothing else moved.

---

## Task 9: The review phase — style reviewers, one reviewer, the consistency review

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:5367-5371` (the groups and the log), `:5400-5426` (the code reviewers), `:5459` (`personasOf`), `:5471-5500` (the Codex runs), `:5506-5509` (the assembly)
- Test: `tim/src/backlog/workflow-contract.test.js`

- [ ] **Step 1: Write the failing tests**

These go in the review describe nested inside `describe('the build stages')`, the one whose tests assert exact per-phase label lists (`:1574-1600`). It already has every fixture these tests need: `BASELINE_ANSWER` (`:1456`), `PLAN_ANSWER` (`:1470`), `NO_FINDINGS` (`:1477`), `FINDING` (`:1478`), `implementAnswer(changedFiles)` (`:1487`), `runToReview(changedFiles)` (`:1500`), `frontendFiles(n, ext)` and `labelsInPhase(run, phaseName)` (`:1537`). Add one helper beside `runToReview`, built from `runFromWithArgs` (`:1131`):

```javascript
      const runToReviewAt = (rigour, changedFiles) =>
        runFromWithArgs(
          { rigour },
          BASELINE_ANSWER,
          PLAN_ANSWER,
          implementAnswer(changedFiles)
        )
```

Then the three presets, each asserting the whole Review phase rather than one label — the list *is* the behaviour:

```javascript
      test('reviews each group with a style and a code reviewer at full, and looks across the change', async () => {
        const run = await runToReviewAt('full', frontendFiles(3, 'js'))

        expect(labelsInPhase(run, 'Review')).toEqual([
          'inc-900 style:frontend-javascript',
          'inc-900 review:frontend-javascript',
          'inc-900 consistency'
        ])
      })

      test('drops the style reviewer at standard, keeping the group code reviewer and the consistency review', async () => {
        const run = await runToReviewAt('standard', frontendFiles(3, 'js'))

        expect(labelsInPhase(run, 'Review')).toEqual([
          'inc-900 review:frontend-javascript',
          'inc-900 consistency'
        ])
      })

      test('reviews the whole change with one code reviewer at fast', async () => {
        const run = await runToReviewAt('fast', [
          'frontend:src/a.js',
          'frontend:README.md',
          'backend:src/main/java/uk/gov/defra/A.java'
        ])

        expect(labelsInPhase(run, 'Review')).toEqual(['inc-900 review:whole'])
      })

      test('names every changed file, with its repo, to the whole-change reviewer', async () => {
        const files = [
          'frontend:src/a.js',
          'backend:src/main/java/uk/gov/defra/A.java'
        ]
        const run = await runToReviewAt('fast', files)
        const prompt = run.agents.find(
          (entry) => entry.options.label === 'inc-900 review:whole'
        ).prompt

        expect(prompt).toContain('the WHOLE change')
        for (const file of files) expect(prompt).toContain(`- ${file}`)
        expect(prompt).toContain('You are the only reviewer of this change')
        expect(prompt).toContain('review/references/FILE_REVIEWER.md')
        expect(prompt).toContain('diff --staged -- <path>')
      })
```

`labelsInPhase` is defined after `runToReview` in that file; put `runToReviewAt` beside it so both are in scope wherever the existing tests use them.

For Codex, add to the executor describe that already drives `executor: 'codex'` through review — copy its answer plumbing and assert the personas and the slugs:

```javascript
      test('gives a Codex group review only the code persona at standard', async () => {
        const run = await runCodexToReview({ rigour: 'standard' })
        const prompts = run.agents
          .filter((entry) => /^inc-900 codex:review-/.test(entry.options.label))
          .map((entry) => entry.prompt)

        expect(prompts.length).toBeGreaterThan(0)
        for (const prompt of prompts) {
          expect(prompt).not.toContain('code-style/references/STYLE_FILE_REVIEWER.md')
          expect(prompt).toContain('review/references/FILE_REVIEWER.md')
        }
      })

      test('gives Codex one whole-change review at fast', async () => {
        const labels = stageLabels(await runCodexToReview({ rigour: 'fast' }))

        expect(labels).toContain('inc-900 codex:review-whole')
        expect(labels).not.toContain('inc-900 codex:review-consistency')
      })
```

`runCodexToReview(argsOverride)` is that describe's own codex run helper with the override threaded through; if it takes no args object yet, give it one the same way `runFromWithArgs` extends `runFrom`.

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t "review"
```

Expected: FAIL — every preset runs the same fan-out today.

- [ ] **Step 3: Extract the code reviewer's prompt**

**First, declare the row's rules.** This is the task that first reads them, so the binding lives here, at the top of the Review phase beside `reviewGroups`:

```javascript
  const rules = rulesOf(rowRigour)
```

Every `rules.` reference in this task and in Task 10 reads that one binding. (Task 7 resolves `rowRigour` itself and logs what it means; it declares no `rules`, because nothing there reads one and the house rule is to build only what a change makes reachable.)

**Check the scope reaches Task 10's reads before you place it.** The Review phase sits inside the row loop's `if (enterAt !== 'ladder')` block, and Task 10 reads `rules.verifyFindings` in the verify and judge sections. If those sections are inside that same block, a binding at the top of the Review phase serves them; if they are not, put it where the row's `builderPhases` is computed instead, which both reach. Read the braces, do not assume.

Then replace the `codeReviews` block (lines 5400-5426) with the extraction, keeping every line of the body exactly as it is now:

```javascript
  const codeReviewerPrompt = ({ reviewing, diffCommand }) => `You are a CODE REVIEWER for increment ${id}, reviewing ${reviewing}
${guardrails()}
${HOUSE_RULES_TO_JUDGE}YOUR PERSONA — read ${SKILLS}/review/references/FILE_REVIEWER.md IN FULL and follow it. Also read
${SKILLS}/review/SKILL.md for the review dimensions. The persona is written per file: apply it to each file in the
list in turn.
CONTEXT: the increment is at \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\` — its
acceptanceCriteria are what this code is supposed to do, and the header's invariants
(\`jq 'del(.increments)' ${BACKLOG_TILDE}\`) are what it must not break. The plan is at ${PLANS}/${id}.md. See the
change with ${diffCommand} for each file.${mergeNote}
SCOPE: correctness, security, error handling, performance, naming, operability, duplication and TEST QUALITY.
Specifically hunt for:
- behaviour that does not match the increment's acceptanceCriteria, or a behaviour change the plan did not declare
- tests that assert implementation rather than behaviour (toHaveBeenCalledWith on a collaborator is the tell);
  mocks at the module boundary rather than the network boundary
- missing negative/edge cases the acceptance criteria imply
${CODE_REVIEW_LENS}- the traps the plan's risks name, and the programme-specific ones — for example, in a multi-set frontend:
  route-shape vs link-builder confusion (route tables must use the PREFIX-FREE builders; rendered links, redirects
  and form actions must use the PREFIX-BEARING ones), display logic leaking into obligations or the model, and any
  platform-layer file that has learned a set's vocabulary.
${CHANGE_MAKES_FALSE_RULE}${CATEGORY_RULE}Report ONLY real findings, each with a concrete failure scenario or, for a code-quality finding, the house rule
it breaks. Formatting nits belong to a different reviewer — skip them.
Return the structured output only.`

  const codeReviews = reviewGroups.map((group) => () =>
    agent(
      codeReviewerPrompt({ reviewing: groupHeader(group), diffCommand: groupDiffCommand(group) }),
      code({ label: `${id} review:${group.name}`, phase: 'Review', schema: FINDINGS_SCHEMA })
    )
  )
```

- [ ] **Step 4: Add the whole-change reviewer**

Straight after that block:

```javascript
  const WHOLE_CHANGE_GROUP = 'whole'

  const wholeChangeHeader = `the WHOLE change: ${reviewTargets.length} file(s) across every repo it touches. Review EVERY one of them —
each file on its own merits, read in full:
${reviewTargets.map((file) => `- ${file}`).join('\n')}
The \`<repoKey>:\` prefix names the repo; the rest is the path inside it (${repoPathList(FILE_REPO_KEYS)}). Report each
finding's \`file\` exactly as it is written in that list.
You are the only reviewer of this change, so read it ACROSS files as well as file by file: the same concept named two
ways, a pattern the repo already has reimplemented rather than reused, registration in one place but not its twin, and
the contract between repos are yours too.`

  const WHOLE_CHANGE_DIFF = `\`git -C ${TILDE}/<repoPath> diff --staged -- <path>\` in the repo the \`<repoKey>:\` prefix names`

  const wholeChangeReview = () =>
    agent(
      codeReviewerPrompt({ reviewing: wholeChangeHeader, diffCommand: WHOLE_CHANGE_DIFF }),
      code({ label: `${id} review:${WHOLE_CHANGE_GROUP}`, phase: 'Review', schema: FINDINGS_SCHEMA })
    )
```

- [ ] **Step 5: Drop the style persona from a Codex group review, and give Codex a whole-change run**

Change `personasOf` (line 5459) to:

```javascript
  const personasOf = (group) =>
    group.language === DOCS_LANGUAGE || !rules.styleReviewers ? [CODE_PERSONA] : [STYLE_PERSONA, CODE_PERSONA]
```

and after `codexConsistencyReview` (which ends at line 5500) add:

```javascript
  const codexWholeChangeReview = codexReview(
    `review-${WHOLE_CHANGE_GROUP}`,
    [CODE_PERSONA],
    reviewTargets.join(', '),
    `Review the WHOLE staged, uncommitted change for increment ${id}, every file bound to <reviewFiles>, across files and
repos. Apply the persona bound to <personas>, and no other: you are the only review run for this increment.
${HOUSE_RULES_TO_JUDGE}${CHANGE_MAKES_FALSE_RULE}${CATEGORY_RULE}Beside what the persona names, hunt for:
${CODE_REVIEW_LENS}- the same concept named two ways, a pattern the repo already has reimplemented, registration in one place but not its
  twin, and the contract between repos.${mergeNote}${workspaceRepoRule()}`
  )
```

- [ ] **Step 6: Assemble by the rules**

Replace the assembly (lines 5506-5509) with:

```javascript
  const claudeReviewStages = rules.reviewScope === 'whole'
    ? [wholeChangeReview]
    : [
        ...(rules.styleReviewers ? styleReviews : []),
        ...codeReviews,
        ...(rules.consistencyReview ? [consistencyReview] : [])
      ]

  const codexReviewStages = rules.reviewScope === 'whole'
    ? [codexWholeChangeReview]
    : [...codexGroupReviews, ...(rules.consistencyReview ? [codexConsistencyReview] : [])]

  const codexReviewResults = async () => {
    const runs = await parallel(codexReviewStages)
    const failed = runs.filter((run) => !run.result).map((run) => run.slug)
    return { results: runs.map((run) => run.result), failed }
  }

  const reviewed = EXECUTOR === 'codex'
    ? await codexReviewResults()
    : { results: await parallel(claudeReviewStages), failed: [] }
```

and change the group log line (line 5371) to say what actually runs:

```javascript
  log(
    `${id}: ${rules.reviewScope === 'whole' ? `one code reviewer across ${reviewTargets.length} file(s)` : `${reviewGroups.length} review group(s) — ${reviewGroups.map((group) => `${group.name} (${group.files.length})`).join(', ')}`}`
  )
```

- [ ] **Step 7: Run the tests to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS. The extraction is byte-identical for a group, so every existing review-prompt assertion holds.

- [ ] **Step 8: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build-loop): fan review out by the row's rigour"
```

---

## Task 10: Findings reach the judge verified, or the judge verifies them

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:2119-2130` (the finding lines and the judge's preamble), `:5543-5564` (the verify block)
- Test: `tim/src/backlog/workflow-contract.test.js`

- [ ] **Step 1: Write the failing tests**

In the same review describe, whose `FIX_STAGE_ANSWERS` (`:1541`) is today's seven positional answers for one finding going all the way to a fix: style clean, code reviewer finds one, consistency clean, verifier confirms it, judge rules one fix-now, fixer applies it, style re-review clean. Spell out the list that each preset asks for — the answer list *is* the pipeline, so a wrong list fails loudly rather than drifting:

```javascript
      const VERDICT_REAL = { verdicts: [{ n: 1, real: true, reasoning: 'src/a.js:3' }] }
      const RULED_ONE_FIX = {
        decisions: [{ what: 'origin', call: 'fix-now', reasoning: 'in scope' }],
        fixNow: ['Save the origin in src/a.js.'],
        summary: 'one fix'
      }
      const FIXED = { ok: true, summary: 'Saved the origin.', notes: '' }

      const runToJudgeAt = (rigour, ...afterImplement) =>
        runFromWithArgs(
          { rigour },
          BASELINE_ANSWER,
          PLAN_ANSWER,
          implementAnswer(['frontend:src/a.js']),
          ...afterImplement
        )

      test('verifies a finding before the judge at standard', async () => {
        const run = await runToJudgeAt(
          'standard',
          { findings: [FINDING] },
          NO_FINDINGS,
          VERDICT_REAL,
          RULED_ONE_FIX,
          FIXED,
          NO_FINDINGS
        )

        expect(labelsInPhase(run, 'Verify findings')).toEqual([
          'inc-900 verify:frontend-javascript'
        ])
        expect(stageLabels(run)).toContain('inc-900 fix review')
      })

      test('runs no verifier at fast, and tells the judge the findings are its own to verify', async () => {
        const run = await runToJudgeAt(
          'fast',
          { findings: [FINDING] },
          RULED_ONE_FIX,
          FIXED,
          NO_FINDINGS
        )
        const prompt = run.agents.find(
          (entry) => entry.options.label === 'inc-900 judge'
        ).prompt

        expect(labelsInPhase(run, 'Verify findings')).toEqual([])
        expect(prompt).toContain('NO VERIFIER RAN for these findings')
        expect(prompt).toContain('THE FINDINGS, NOT YET VERIFIED')
        expect(prompt).toContain('your job is to REFUTE it')
        expect(prompt).not.toContain('each survived verification')
        expect(run.logs).toContain(
          "inc-900: 1 finding(s) go to the judge unverified — no verifier runs at this row's rigour"
        )
        expect(stageLabels(run)).toContain('inc-900 fix review')
      })

      test('tells a judge at full that its findings already survived verification', async () => {
        const run = await runToJudgeAt(
          'full',
          ...FIX_STAGE_ANSWERS
        )
        const prompt = run.agents.find(
          (entry) => entry.options.label === 'inc-900 judge'
        ).prompt

        expect(prompt).toContain('CONFIRMED FINDINGS (each survived verification')
        expect(prompt).not.toContain('NO VERIFIER RAN')
      })
```

The `fast` list is four answers to `full`'s seven: no style reviewer, no consistency reviewer, no verifier. Both still end with the fixer's `NO_FINDINGS` style re-review, which is the third thing settled above, asserted here rather than taken on trust. `VERDICT_REAL`, `RULED_ONE_FIX` and `FIXED` are the entries `FIX_STAGE_ANSWERS` already holds inline; lift them into named constants in the same edit and rebuild `FIX_STAGE_ANSWERS` from them, so one fixture is not written twice:

```javascript
      const FIX_STAGE_ANSWERS = [
        NO_FINDINGS,
        { findings: [FINDING] },
        NO_FINDINGS,
        VERDICT_REAL,
        RULED_ONE_FIX,
        { ...FIXED, notes: 'FIT went green once the port-holding test server exited.' },
        NO_FINDINGS
      ]
```

Keep that `notes` text: a neighbouring test asserts the ladder is given the fixer's notes.

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t "verif"
```

Expected: FAIL — the verifier always runs and the judge's preamble is fixed.

- [ ] **Step 3: Split the finding line, and give the judge the unverified case**

Replace `confirmedFindingLine` (lines 2119-2120) with a shared line and the two forms built from it:

```javascript
const findingLine = (finding, index) =>
  `${index + 1}. [${finding.severity}] ${describeFindingKind(finding)} ${finding.file}${finding.line ? ':' + finding.line : ''} — ${finding.what}\n   WHY: ${finding.why}\n   PROPOSED FIX: ${finding.fix}`

const confirmedFindingLine = (finding, index) =>
  `${findingLine(finding, index)}\n   SURVIVED VERIFICATION BECAUSE: ${finding.verdict}`

const UNVERIFIED_FINDINGS_DUTY = `NO VERIFIER RAN for these findings: this row's rigour sends them straight to you, so you do the verifier's work
first and the judge's second. Before you rule on a finding, test it against the ACTUAL code — read each file it
names in full, not the diff alone — and say what you found, with file:line, in its reasoning.
${VERIFY_BY_KIND}
A finding you cannot stand up by the default its kind sets is a reject, with the code quoted.

`

const findingsPreamble = (verified) =>
  verified
    ? `CONFIRMED FINDINGS (each survived verification by the default its kind sets: a functional finding was tried for
refutation, a code-quality finding stood unless code showed it factually wrong):`
    : `${UNVERIFIED_FINDINGS_DUTY}THE FINDINGS, NOT YET VERIFIED:`
```

Then change `judgePrompt` (line 2122) to take `verified = true` and use them, replacing lines 2128-2130:

```javascript
const judgePrompt = ({ id, subject, scope = 'increment', context, confirmed, repoKeys, verified = true }) => `You are the JUDGE for ${subject}. You replace the interactive triage step a human would normally do —
```

```javascript
${findingsPreamble(verified)}
${confirmed.map(verified ? confirmedFindingLine : findingLine).join('\n')}
```

The theme judge (`:4806`) passes no `verified`, so it keeps the verified wording: a theme's findings are verified by their own verifier stage, which `rigour` does not govern.

- [ ] **Step 4: Skip the verifier where the rules say so**

Replace the verify block (lines 5543-5564) with:

```javascript
  if (rawFindings.length > 0) {
    const numbered = rawFindings.map((finding, index) => ({ ...finding, n: index + 1 }))
    if (rules.verifyFindings) {
      phase('Verify findings')
      const verified = await verifyFindingGroups(id, groupFindingsForVerification(numbered), {
        phaseName: 'Verify findings',
        labelOf: (group) => `${id} verify:${group.name}`,
        promptOf: (group) =>
          verifierPrompt({
            subject: `increment ${id}`,
            group,
            diffCommand: groupDiffCommand(group),
            criteria: `the increment's acceptanceCriteria\n(\`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`)`,
            mergeNote
          })
      })
      confirmed = verified.confirmed
      refuted = verified.refuted
      refutedFindings.push(...refuted)
      log(`${id}: ${confirmed.length}/${rawFindings.length} findings survived verification`)
      for (const record of refuted) log(`${id}: REFUTED ${describeRefuted(record)}`)
    } else {
      confirmed = numbered
      log(`${id}: ${confirmed.length} finding(s) go to the judge unverified — no verifier runs at this row's rigour`)
    }
  }
```

and pass the flag to the judge (line 5571 area):

```javascript
      judgePrompt({ id, subject: `increment ${id}`, context: readIncrement(id), confirmed, repoKeys: repos ?? [], verified: rules.verifyFindings }),
```

- [ ] **Step 5: Run the tests to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build-loop): let the judge verify its own findings at fast"
```

---

## Task 11: Report a row that did not take the run's rigour

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:6005` and `:6452` (the landed entries)
- Test: `tim/src/backlog/workflow-contract.test.js`

The run's own rigour is already in the first log line and in `resolved configuration`, so the result names a row's only when it differs — the same rule `resumedFrom` follows, and the reason no existing `toEqual` on a landed entry has to change.

- [ ] **Step 1: Write the failing tests**

Both landed entries need covering, and both tests must keep the row at `full` so the branch describe's positional answer lists still line up — a run at `standard` with a row at `full` gives exactly the difference to assert and exactly the agents `reviewedAndLanded` (`:5305`) answers.

In the branch-lifecycle describe, beside the `runMergeRow` tests:

```javascript
      test('names the rigour of a row that did not take the run’s', async () => {
        const run = await runBranch(
          { rigour: 'standard' },
          { ...MERGE_ROW, rigour: 'full' },
          BASELINE,
          PLAN,
          MERGE_STARTED,
          ...reviewedAndLanded,
          FOUND,
          CI_GREEN,
          MARKED_DONE,
          NO_GATE
        )

        expect(run.result.increments[0]).toMatchObject({
          id: 'inc-900',
          outcome: 'landed',
          rigour: 'full'
        })
      })

      test('leaves rigour out of a row that took the run’s', async () => {
        const run = await runMergeRow(FOUND, CI_GREEN, MARKED_DONE, NO_GATE)

        expect(run.result.increments[0]).not.toHaveProperty('rigour')
      })
```

In the full-lifecycle `runPerf` describe (`:6477`), where the start answer is the row's voice, add a helper beside `ANSWERS` and one test:

```javascript
    const startedAtRigour = (rigour) =>
      startAnswer({
        ...JSON.parse(ANSWERS['inc-014 start'].stdout).result,
        rigour
      })

    test('names the rigour of a landed row that did not take the run’s', async () => {
      const run = await runPerf(
        { rigour: 'standard' },
        { 'inc-014 start': startedAtRigour('full') }
      )

      expect(run.result.increments[0]).toMatchObject({
        id: 'inc-014',
        outcome: 'landed',
        rigour: 'full'
      })
    })
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t "rigour of a row"
```

Expected: FAIL — no landed entry carries `rigour`.

- [ ] **Step 3: Add the field to both landed entries**

In the branch-lifecycle entry (line 6005) and the full-lifecycle entry (line 6452), beside the `resumedFrom` spread:

```javascript
        ...(resumedFrom ? { resumedFrom } : {}),
        ...(rowRigour === RIGOUR ? {} : { rigour: rowRigour }),
```

- [ ] **Step 4: Run the tests to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS, with no existing landed-entry assertion touched.

- [ ] **Step 5: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build-loop): report a row that did not take the run's rigour"
```

---

## Task 12: `tim build rigour` — the proposal the intake shows

**Files:**
- Create: `tim/src/build/rigour.js`, `tim/src/build/rigour.test.js`
- Create: `tim/src/commands/build/rigour.js`, `tim/src/commands/build/rigour.test.js`
- Modify: `tim/src/commands/build/index.js:17-25` (the imports), `:507-526` (the registration and the `build` description)

**What it may key on, and what it may not.** The derivation reads the row and nothing else — no code, no git history — so it keys on the fields a backlog actually carries. The design's example proposal gives inc-031 `fast` for "behaviour already on main" and inc-034 `full` for "extends shared/kit.js": neither is in the row, both come from reading the tree. That is why this command **proposes** and the operator decides, and why every row it reports carries the reason it keyed on. The rules, in order, with the first that matches winning:

1. The row sets `rigour` → that, `source: "row"`, reason `set on the row`.
2. `repos` is `[]` → `fast`, because a row that changes no backlog repo has no production behaviour to read.
   **Not `gatePhases: []`.** An earlier draft keyed on that too, and it was wrong six times out of nine on the one
   real backlog this was checked against: `gatePhases: []` says *where* a row is verified, not how much scrutiny
   it deserves. The documents theme set it on six rows because the local e2e rung timed out at 90s on that
   machine and the proof moved to the pull requests — their own notes say "This is not a preference for less
   testing." Reading it as a rigour signal makes a row get *less* review because a machine could not run its
   tests locally, which is backwards.
3. `kind` is `docs` or `test` → `fast`.
4. The row names more than one repo once the test suites are set aside → `full`, because a slice across two services is a contract between them. A repo whose path ends `-tests` is a test suite, not a service: under the legacy `frontend`/`backend`/`tests` keys the tests repo joins every frontend change, so counting it would make almost every row `full`.
5. Otherwise → `standard`.

Checked against the Design Release 2.1 documents theme, that gives `standard` for seven rows, `full` for the one that spans backend and frontend, and `fast` for the docs row — which is the shape the design wants, and visibly not a substitute for the operator's own judgement on the two rows it cannot see into.

- [ ] **Step 1: Write the failing tests for the derivation**

Create `tim/src/build/rigour.test.js`:

```javascript
import { describe, test, expect } from 'vitest'
import { proposeRigour } from './rigour.js'

const ENVELOPE = {
  backend: { path: 'repos/trade-imports-animals-backend' },
  frontend: { path: 'repos/trade-imports-animals-frontend' },
  tests: { path: 'repos/trade-imports-ins-tests' }
}

const row = (overrides = {}) => ({
  id: 'inc-001',
  title: 'Show the notification list',
  kind: 'feat',
  repos: ['frontend', 'tests'],
  status: 'todo',
  ...overrides
})

const backlogOf = (...increments) => ({ repos: ENVELOPE, increments })

const proposalsFor = (...increments) => proposeRigour(backlogOf(...increments))

describe('proposeRigour', () => {
  test('proposes standard for a one-service row', () => {
    expect(proposalsFor(row())).toEqual([
      {
        id: 'inc-001',
        title: 'Show the notification list',
        rigour: 'standard',
        source: 'derived',
        reason: 'one service repo, frontend'
      }
    ])
  })

  test('proposes full for a row across two services, naming them', () => {
    expect(proposalsFor(row({ repos: ['backend', 'frontend', 'tests'] }))[0]).toMatchObject({
      rigour: 'full',
      reason: 'backend and frontend: a contract between repos'
    })
  })

  test('proposes fast for a row that changes no backlog repo', () => {
    expect(proposalsFor(row({ repos: [] }))[0]).toMatchObject({
      rigour: 'fast',
      reason: 'no backlog repo: the change is in the workspace repo'
    })
  })

  test('proposes fast for a row the gate runs nothing for', () => {
    expect(proposalsFor(row({ gatePhases: [] }))[0]).toMatchObject({
      rigour: 'fast',
      reason: 'the gate runs no phase for it'
    })
  })

  test('proposes fast for a docs row', () => {
    expect(proposalsFor(row({ kind: 'docs' }))[0]).toMatchObject({
      rigour: 'fast',
      reason: 'a docs row changes no production behaviour'
    })
  })

  test('takes the row’s own rigour over anything it would derive', () => {
    expect(proposalsFor(row({ repos: ['backend', 'frontend'], rigour: 'fast' }))[0]).toMatchObject({
      rigour: 'fast',
      source: 'row',
      reason: 'set on the row'
    })
  })

  test('proposes nothing for a row that is not todo', () => {
    expect(proposalsFor(row({ status: 'done' }), row({ id: 'inc-002' }))).toHaveLength(1)
  })

  test('treats a row with no repos field as every configured repo', () => {
    expect(proposalsFor(row({ repos: undefined }))[0]).toMatchObject({
      rigour: 'full',
      reason: 'backend and frontend: a contract between repos'
    })
  })
})
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- build/rigour
```

Expected: FAIL — `./rigour.js` does not exist.

- [ ] **Step 3: Write the derivation**

Create `tim/src/build/rigour.js`:

```javascript
const FAST_KINDS = new Set(['docs', 'test'])
const TEST_SUITE_PATH = /-tests$/

const serviceRepos = (row, envelope) => {
  const keys = Array.isArray(row.repos) ? row.repos : Object.keys(envelope ?? {})
  return keys.filter((key) => !TEST_SUITE_PATH.test(envelope?.[key]?.path ?? key))
}

const andList = (names) =>
  names.length < 2
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

const derive = (row, envelope) => {
  if (Array.isArray(row.repos) && row.repos.length === 0) {
    return { rigour: 'fast', reason: 'no backlog repo: the change is in the workspace repo' }
  }
  if (Array.isArray(row.gatePhases) && row.gatePhases.length === 0) {
    return { rigour: 'fast', reason: 'the gate runs no phase for it' }
  }
  if (FAST_KINDS.has(row.kind)) {
    return { rigour: 'fast', reason: `a ${row.kind} row changes no production behaviour` }
  }
  const services = serviceRepos(row, envelope)
  if (services.length > 1) {
    return { rigour: 'full', reason: `${andList(services)}: a contract between repos` }
  }
  return { rigour: 'standard', reason: `one service repo, ${services[0] ?? 'none'}` }
}

/**
 * A rigour preset for every increment still to build, from the row and nothing
 * else. It proposes: what a row is really worth is in the code the row changes,
 * which this cannot read, so the launch shows these and the operator decides.
 *
 * @param {object} backlog - The parsed backlog.json
 * @returns {{id: string, title: string, rigour: string, source: 'row'|'derived', reason: string}[]}
 */
export const proposeRigour = (backlog) =>
  (backlog.increments ?? [])
    .filter((row) => row.status === 'todo')
    .map((row) => ({
      id: row.id,
      title: row.title,
      ...(row.rigour
        ? { rigour: row.rigour, source: 'row', reason: 'set on the row' }
        : { ...derive(row, backlog.repos), source: 'derived' })
    }))
```

- [ ] **Step 4: Run them to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- build/rigour
```

Expected: PASS.

- [ ] **Step 5: Write the failing CLI tests**

Create `tim/src/commands/build/rigour.test.js`, following `tim/src/commands/backlog/rows.test.js:1-70` for the workspace fixture (it needs the schema copy, because the command refuses a preset the schema does not allow):

```javascript
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  realpathSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { BACKLOG_SCHEMA_PATH } from '../../backlog/backlog-schema.js'
import { renderRigourText } from './rigour.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const realSchemaPath = join(here, '..', '..', '..', '..', BACKLOG_SCHEMA_PATH)
const WORKAREA = 'shared/demo'

let workspace

const backlogPath = () => join(workspace, 'workareas', WORKAREA, 'backlog.json')

const writeBacklog = (increments) => {
  mkdirSync(dirname(backlogPath()), { recursive: true })
  writeFileSync(
    backlogPath(),
    JSON.stringify({
      programme: 'demo',
      repos: {
        frontend: { path: 'repos/trade-imports-animals-frontend' },
        tests: { path: 'repos/trade-imports-ins-tests' }
      },
      increments
    })
  )
}

const runTim = (args) =>
  execa('node', [cliPath, 'build', ...args, '--workspace', workspace], {
    reject: false
  })

const envelopeOf = (run) => JSON.parse(run.stdout.trim())

const row = (overrides = {}) => ({
  id: 'inc-001',
  title: 'Show the notification list',
  detail: 'An importer sees their own notifications.',
  acceptanceCriteria: ['The list shows only their own.'],
  dependsOn: [],
  kind: 'feat',
  repos: ['frontend', 'tests'],
  status: 'todo',
  ...overrides
})

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(join(tmpdir(), 'tim-build-rigour-')))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
  const schemaCopy = join(workspace, BACKLOG_SCHEMA_PATH)
  mkdirSync(dirname(schemaCopy), { recursive: true })
  cpSync(realSchemaPath, schemaCopy)
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('tim build rigour', () => {
  test('proposes a preset per todo row, with the reason it keyed on', async () => {
    writeBacklog([row(), row({ id: 'inc-002', kind: 'docs' })])

    const run = await runTim(['rigour', WORKAREA, '--json'])

    expect(run.exitCode).toBe(0)
    expect(envelopeOf(run).result).toEqual({
      path: backlogPath(),
      rows: [
        {
          id: 'inc-001',
          title: 'Show the notification list',
          rigour: 'standard',
          source: 'derived',
          reason: 'one service repo, frontend'
        },
        {
          id: 'inc-002',
          title: 'Show the notification list',
          rigour: 'fast',
          source: 'derived',
          reason: 'a docs row changes no production behaviour'
        }
      ]
    })
  })

  test('refuses a row whose rigour is not a preset the schema allows', async () => {
    writeBacklog([row({ rigour: 'quick' })])

    const run = await runTim(['rigour', WORKAREA, '--json'])

    expect(run.exitCode).toBe(1)
    expect(envelopeOf(run).errors[0].message).toBe(
      'inc-001 sets rigour "quick". Use one of: full, standard, fast.'
    )
  })

  test('names a missing backlog', async () => {
    const run = await runTim(['rigour', WORKAREA, '--json'])

    expect(envelopeOf(run).errors[0].message).toBe(`Can't find ${backlogPath()}.`)
  })
})

describe('renderRigourText', () => {
  test('lines up the id, the preset and the reason', () => {
    expect(
      renderRigourText({
        path: '/ws/workareas/shared/demo/backlog.json',
        rows: [
          { id: 'inc-001', title: 'A', rigour: 'standard', source: 'derived', reason: 'one service repo, frontend' },
          { id: 'inc-002', title: 'B', rigour: 'fast', source: 'row', reason: 'set on the row' }
        ]
      })
    ).toBe(
      'inc-001  standard  one service repo, frontend\ninc-002  fast      set on the row'
    )
  })

  test('says so when nothing is left to build', () => {
    expect(renderRigourText({ path: '/ws/b.json', rows: [] })).toBe(
      'Every increment is built out: there is nothing to propose a rigour for.'
    )
  })
})
```

- [ ] **Step 6: Run them to see them fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- commands/build/rigour
```

Expected: FAIL — `./rigour.js` does not exist and `tim build rigour` is not a command.

- [ ] **Step 7: Write the command**

Create `tim/src/commands/build/rigour.js`, following `tim/src/commands/build/workers.js` exactly for its emit, error and registration shape:

```javascript
import { OK } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { loadBacklogSchema, rigoursOf } from '../../backlog/backlog-schema.js'
import { readJsonFile } from '../../backlog/io.js'
import { backlogPathFor } from '../backlog/rows.js'
import { proposeRigour } from '../../build/rigour.js'
import { TimError } from '../../errors.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const PRESET_WIDTH = 8
const NOTHING_TO_PROPOSE =
  'Every increment is built out: there is nothing to propose a rigour for.'

const refuseUnknownPresets = (rows, rigours) => {
  const unknown = rows.filter((entry) => !rigours.includes(entry.rigour))
  if (unknown.length === 0) return
  throw new TimError(
    'LINT',
    unknown
      .map(
        (entry) =>
          `${entry.id} sets rigour "${entry.rigour}". Use one of: ${rigours.join(', ')}.`
      )
      .join('\n')
  )
}

/**
 * A rigour preset for every increment still to build, for the launch to show.
 *
 * @param {string} workspaceRoot
 * @param {string} workarea - A path under workareas/
 * @returns {{path: string, rows: object[]}}
 * @throws {TimError} NOT_FOUND, PARSE or INVALID
 */
export const rigourProposal = (workspaceRoot, workarea) => {
  const path = backlogPathFor(workspaceRoot, workarea)
  const rows = proposeRigour(readJsonFile(path))
  refuseUnknownPresets(rows, rigoursOf(loadBacklogSchema(workspaceRoot)))
  return { path, rows }
}

/**
 * The plain-text report of `tim build rigour`, one row a line.
 *
 * @param {{path: string, rows: object[]}} result
 * @returns {string}
 */
export const renderRigourText = ({ rows }) =>
  rows.length === 0
    ? NOTHING_TO_PROPOSE
    : rows
        .map(
          (entry) =>
            `${entry.id}  ${entry.rigour.padEnd(PRESET_WIDTH)}  ${entry.reason}`
        )
        .join('\n')

const reportError = (error, json, timVersion) => {
  if (json) {
    emit(
      JSON.stringify(
        jsonEnvelope({ ok: false, error: errorPayloadFor(error), timVersion })
      )
    )
  } else {
    emitError(error.message ?? String(error))
  }
  process.exit(exitCodeFor(error))
}

/**
 * `tim build rigour`: propose how much of the pipeline each increment still to
 * build should get, for the BUILD intake to show before a launch.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerRigour = (build, timVersion) =>
  build
    .command('rigour <workarea>')
    .description(
      "Propose a rigour preset for every increment still to build — full, standard or fast — from the row and nothing else: the repos it names and its kind. A row that sets its own rigour keeps it. The reason beside each row says what the proposal keyed on; what a row is really worth is in the code it changes, which this cannot read, so the launch shows these and the operator decides. Change one with `tim backlog set <workarea> <id> --rigour <preset>`."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build rigour shared/my-programme\n  tim build rigour shared/my-programme --json'
    )
    .action(function rigourAction(workarea) {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const result = rigourProposal(workspaceRoot, workarea)
        emit(
          globalOpts.json
            ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
            : renderRigourText(result)
        )
        process.exit(OK)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
```

`LINT` is the code `tim backlog check` already throws for a backlog whose data is wrong (`tim/src/commands/backlog/rows.js:220`), and `exitCodeFor` maps it to 1. `tim/src/errors.js` holds the allowed set, and `TimError` throws on a code outside it, so do not invent one.

Register it in `tim/src/commands/build/index.js`: import `registerRigour` beside `registerWorkers` (line 22), call `registerRigour(build, timVersion)` after `registerWorkers(build, timVersion)` (line 517), and add to the `build` command's description (line 510) `, propose a rigour preset per increment` after `tune this machine's worker counts and print them`.

- [ ] **Step 8: Run the tests to see them pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- rigour
```

Expected: PASS, all four files.

- [ ] **Step 9: Prove it against a real backlog**

```bash
tim build rigour shared/design-release-2-1/themes/documents --workspace ~/git/defra/trade-imports-workspace
```

Expected today: `Every increment is built out: there is nothing to propose a rigour for.` — that theme has since been built, so every one of its rows is `done`, `merged-into` or `dropped`, and only a `todo` row is proposed for. An earlier draft of this step expected nine lines, which was the plan going stale about live data.

So prove the derivation against the rows themselves rather than their status: copy that backlog to a scratch workarea with every `status` forced to `todo`, run the command there, and expect **seven `standard`, one `full`** (inc-033, which spans backend and frontend) **and one `fast`** (inc-039, the docs row). If it says anything else, the rules are wrong, not the backlog — that check is what caught the `gatePhases` rule above, which proposed `fast` for six of the nine.

- [ ] **Step 10: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add tim/src/build/rigour.js tim/src/build/rigour.test.js tim/src/commands/build/rigour.js tim/src/commands/build/rigour.test.js tim/src/commands/build/index.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(build): propose a rigour preset per increment"
```

---

## Task 13: Document it

**Files:**
- Modify: `.claude/skills/requirements-pipeline/references/BUILD.md:94-120` (PARAMETERS), `:125-155` (beside "Choosing e2e"), `:175-180` (the review paragraph), `:465-497` (the args block), `:1128-1145` (the handover prompt)
- Modify: `.claude/skills/requirements-pipeline/workflow/README.md:223-247` (the args table), `:346-380` (the worked example), and a new section

**Two gaps to close in the same pass.** BUILD.md's args block (`:467-496`) still lacks `e2e` and `resumeFrom`: A1 and A2 each documented their key in the PARAMETERS table and left the copy-paste object alone, so a session that builds the args from that block gets a run that stops before its first agent naming a missing key. The handover prompt at `:1131-1146` lacks both too. Add all three keys to both.

- [ ] **Step 1: The parameter**

In BUILD.md's PARAMETERS block, after the `resumeFrom` entry (which ends at line 119):

```
rigour        how much of the pipeline every row of this run gets: full
              (today's whole pipeline), standard (one plan review, no style
              reviewers) or fast (a code-tier plan, no plan review, one code
              reviewer). Default standard. One value governs the whole theme;
              a row may optionally carry its own, which wins for that row.
              Nothing has to be set per row — see "Choosing rigour" below
```

- [ ] **Step 2: "Choosing rigour"**

Add after the "Choosing e2e" section (which ends at line 155):

````
### Choosing rigour

`rigour` says how much a change is planned and read. It never says whether its
tests pass: the plan lint, the gate at whatever phases the row owes, the
ladder, the style re-review of the fixer's hunks, the style review of every CI
fixer commit and the theme's engineering review all run at every preset.

| preset | what runs |
|---|---|
| `full` | The plan reviewed, revised and re-reviewed; a style and a code reviewer per (repo, language) group; a consistency reviewer; a verifier per finding group; judge, fix, ladder |
| `standard` | One plan review, and the revised plan re-reviewed when the first review found something structural — or objected while naming nothing; no style reviewers; the group code reviewers, the consistency reviewer and the verifiers as before |
| `fast` | A code-tier plan, no plan review, one code reviewer across the whole change, and the judge verifying its own findings before it rules |

**One value governs the whole theme, and that is the only answer a launch owes.**
Pass `standard` unless the user asks otherwise. Every row of the run takes it,
and a theme can be built start to finish without a single row setting anything.

**A row may optionally carry its own, which wins for that row.** It lives in
`backlog.json`, not in the args, so it persists across launches and machines:

```
tim backlog set <workarea> inc-034 --rigour full
```

So the question at the launch is "what does this theme get?", and the per-row
override is there for the one row in ten that argues for something else.

To see where a row might:

```
tim build rigour <workarea>
```

It writes nothing. It keys on the row alone — its repos, its kind, and what the
gate runs for it — and prints the reason beside each row. Show its output as a
table with the other answers, say in as many words that the proposal cannot see
the code, and treat "press on" as a complete answer to the whole table:

```
e2e: ci   (Docker 8.2/19.3GB, no machine.json — local e2e not viable)
rigour: standard

inc-031  standard  one service repo, frontend
inc-033  full      backend and frontend: a contract between repos
inc-039  fast      a docs row changes no production behaviour
```

Raise a row to `full` when the change extends something other rows build on, or
when it is the one a reviewer would want to read twice. Drop one to `fast` when
the behaviour is already on `main` and the row is a test and a spec sentence.

Record `rigour` in the theme's `build-args.json` with the rest, so a relaunch
defaults to it. A relaunch is the moment to raise a row that has stopped twice:
`tim backlog set <workarea> <id> --rigour full`.
````

- [ ] **Step 3: Correct the review paragraph**

In the `requireApproval` passage at `:175-180`, the sentence beginning "By the time an increment reaches the merge stage" lists "a style reviewer and a code reviewer per (repo, language) group". Add after that list's close, before "**That multi-agent review, verification and judgement IS the review.**":

```
What a given increment got depends on its `rigour`: `standard` drops the style
reviewers, and `fast` reads the whole change with one reviewer whose findings the
judge verifies itself. The gate, the ladder, the style re-review of the fixer's
hunks and the theme's engineering review run whatever it is.
```

- [ ] **Step 4: The args block and the handover**

In the args object at `:467-496`, after `stopAfter: '<a positive number, or "all">'`:

```js
  e2e: '<local or ci>', // where a row's end-to-end proof comes from — see "Choosing e2e"
  resumeFrom: null, // null takes each row's own attempt record; 'build' ignores it
  rigour: 'standard' // full, standard or fast — see "Choosing rigour". A row's own wins
```

and in the handover prompt at `:1131-1146`, after the `stopAfter` line:

```
e2e          <local or ci>
resumeFrom   null
rigour       <full, standard or fast>, and any row that sets its own
```

- [ ] **Step 5: The workflow README**

**The args table already has a `rigour` row.** Task 1 had to add a one-line stub, because `workflow-contract.test.js:471-483` asserts that table lists exactly `REQUIRED_KEYS_BY_SCRIPT` and the key's arrival turned it red. **Replace that row** — do not add a second:

```
| `rigour` | How much of the pipeline every row of this run gets: `'full'` (the plan reviewed, revised and re-reviewed, a style and a code reviewer per (repo, language) group, a consistency reviewer, a verifier per finding group), `'standard'` (one plan review, re-reviewed when a finding is structural or the review names none, and no style reviewers) or `'fast'` (a `code`-tier plan, no plan review, one code reviewer across the whole change, and the judge verifying its own findings). A row's own `rigour` wins. The plan lint, the gate, the ladder, the style re-review of the fixer's hunks, the style review of a CI fixer's commits and the theme's engineering review run at every preset — see [The rigour dial](#the-rigour-dial) |
```

Add `rigour: 'standard',` to the worked example after `resumeFrom: null` (line 374). In the `models` row of that table, change "the per-group style and code reviewers" to "the per-group style and code reviewers (`rigour` decides which of them run)", and add to the `think` list that a `fast` row's plan goes to `code` instead.

Then add a section beside "Resuming a row part-way through":

````
### The rigour dial

`rigour` governs six things, and nothing else: which tier plans, how many plan
reviews run, whether style reviewers run, whether code review is split per
(repo, language) group or runs once across the whole change, whether a
consistency reviewer runs, and whether findings are verified by their own
verifier or by the judge. Three things it never governs, so that a lower rigour
never lowers correctness:

- **the plan lint** — `fast` drops the plan review, not the check that the plan
  writes no code text and names no denied check;
- **the gate** — at whatever phases the row owes through `gatePhases` and `e2e`,
  at the baseline and again at the ladder, which also runs the plan's own
  section 5 and 6 checks;
- **the theme engineering review** — it runs once per theme over
  `git diff origin/main...HEAD` in every repo, and is the backstop for whatever a
  `fast` row's single reviewer missed.

A row sets its own with `tim backlog set <workarea> <id> --rigour <preset>`, and
it reaches the loop by the two paths every row field takes: `tim build start`
under the full lifecycle, the branch stage's `jq` under the branch lifecycle. The
preflight refuses a preset the schema does not allow before the first increment
starts. The run log names the preset and what it runs, once for the run and once
per increment, and a landed row whose rigour was not the run's carries it in the
result.
````

- [ ] **Step 6: Check the docs are true**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim run lint
grep -n "rigour" ~/git/defra/trade-imports-workspace/.claude/skills/requirements-pipeline/references/BUILD.md
grep -n "e2e:\|resumeFrom:\|rigour:" ~/git/defra/trade-imports-workspace/.claude/skills/requirements-pipeline/references/BUILD.md
```

Expected: the args block now names all three keys, and every preset BUILD.md describes matches `RIGOUR_RULES`. Read the table in "What each preset runs" above against both documents, line by line: a document that describes a preset the loop does not run is worse than no document.

- [ ] **Step 7: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/references/BUILD.md .claude/skills/requirements-pipeline/workflow/README.md
git -C ~/git/defra/trade-imports-workspace commit -m "docs(build-loop): document the rigour dial, and the two keys the args block was missing"
```

---

## Task 14: Correct the design document

**Files:**
- Modify: `workareas/shared/build-loop-efficiency/DESIGN.md:7-9` (the header's status) and the A3 section

- [ ] **Step 1: Record that A3 is built, and what the build settled**

In the opening paragraph, replace `A3 is\nneither planned nor built.` with:

```
A3 is planned in
[`PLAN-A3.md`](PLAN-A3.md) and built on `chore/NO_JIRA-build-loop-rigour`, where the planning settled three
things the preset table left open — see A3 below.
```

At the end of the A3 section, after "**Recovers:** most of the ~211M planning spend and the 52.79M consistency spend.", add:

```
### What the build settled

1. **`standard` re-reads a revised plan when, and only when, the first review found it built wrong.**
   The design asks for one reviewer rather than two, but a structural finding still open on the revised plan is
   what stops an increment, and that check needs a second read. So a detail-only review costs one revise and no
   more, and a structural one costs exactly what `full` costs. The saving lands on the common case and the
   correctness guard stays.
2. **Under `fast` the judge verifies its own findings.** The design's `fast` row lists no verify stage, and
   findings arriving at a judge whose prompt says "each survived verification" would be a lie in a prompt. Its
   prompt now carries the verifier's own defaults by kind and a duty to test each finding at file:line before
   ruling.
3. **"No style reviewers" means the Review phase's, and nothing else.** The style re-review of the fixer's hunks
   and the style review of each CI fixer commit run at every preset: both of those agents work after every other
   reviewer, so they are the only readers of their lines, and the CI fixer pushes straight to an open pull request.
4. **The proposal keys on the row, because it cannot read the code.** `tim build rigour` keys on the repos a row
   names and its kind — **not** on what the gate runs for it, and not on whether a gate runs at all; see entries
   41 and 46. The design's own example gives a row `fast` for "behaviour already on main" and another `full` for
   "extends shared/kit.js" — neither is in the row. So every proposed row carries the reason it keyed on, and the
   intake says in as many words that the operator is deciding, not confirming.
5. **A1 and A2 each left their key out of BUILD.md's copy-paste args block.** Found while adding `rigour` to it,
   and fixed in the same pass: a session building its args from that block got a run that stopped before its
   first agent naming a missing key. The reason the same two keys *did* reach the workflow README's argument
   table is that a test holds that table to `REQUIRED_KEYS_BY_SCRIPT`
   (`tim/src/backlog/workflow-contract.test.js:471-483`) and no test holds BUILD.md to anything. A document
   nothing checks drifts; one a test checks does not. Worth a test over BUILD.md's args block if it drifts
   again — not written here, because the block is prose with a JS fence rather than a table a test can read.
```

- [ ] **Step 2: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add workareas/shared/build-loop-efficiency/DESIGN.md
git -C ~/git/defra/trade-imports-workspace commit -m "docs(build-loop): record what A3's build settled"
```

---

## Verification before the pull request

- [ ] **The whole tim suite, not one file**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test
```

Expected: green. `src/distil/trace.test.js` red means a stale `tim/node_modules`, not this change — `cd ~/git/defra/trade-imports-workspace/tim && npm ci`.

- [ ] **Lint and format**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim run lint
npm --prefix ~/git/defra/trade-imports-workspace/tim run format
```

- [ ] **The loop still parses, and defaults nothing**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t "defaults no configuration key"
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract -t "args-contract"
```

Expected: PASS. The first proves no `CFG.rigour ??` crept in; the second proves the shared args block is untouched.

- [ ] **A real backlog still checks out**

```bash
tim backlog check shared/design-release-2-1/themes/documents --workspace ~/git/defra/trade-imports-workspace
tim build rigour shared/design-release-2-1/themes/documents --workspace ~/git/defra/trade-imports-workspace
```

Expected: in shape, and a proposal per todo row. The schema change adds an optional field, so an existing backlog without it stays valid.

- [ ] **A `planOnly` dry run at each preset**

Launch the loop three times with `planOnly: true`, `increments: ['<a todo id>']` and `rigour` set to each preset in turn, against a workarea you do not mind writing a plan into. Read the run log: the first line names the resolved configuration, the second what the run's rigour runs, and the per-increment line what that row got. `fast` must show no `plan review` stage and a `sonnet` plan; `full` must show the pipeline it shows today.

- [ ] **One real `fast` row, end to end**

Canary before any theme runs on this (rule 7). Pick one landed-safe row — a docs or test row, which is what the derivation proposes `fast` for — set `tim backlog set <workarea> <id> --rigour fast`, and run it with `stopAfter: 1`. Check in the log that one `review:whole` ran, no verifier ran, the judge's prompt carried the unverified duty (read it in `/workflows`), the ladder ran the gate, and the row landed. Then read the diff yourself: this is the preset's first outing, and the point of a canary is that a person looks.

- [ ] **Raise the pull request**

```bash
git -C ~/git/defra/trade-imports-workspace push -u origin chore/NO_JIRA-build-loop-rigour
gh pr create --repo DEFRA/trade-imports-workspace --base main --title "Build loop: a rigour dial per run and per row (A3 of the efficiency design)" --body "<the design's A3 section, what each preset runs, and the five things the build settled>"
```

Post the link and the evidence when it is green, and stop: a pull request raised by hand is never merged without the user's go in that conversation.

---

## What this plan does not do

- **It does not delete a stage.** `full` is today's pipeline, and the run default the skill passes is `standard`, so a programme that wants today's behaviour passes `full` and gets it exactly.
- **It does not govern the theme engineering review, the gate, the plan lint, the ladder, the style re-review of the fixer's hunks or the style review of a CI fixer's commits.** Those run at every preset, by design.
- **It does not add a required field to `backlog.json`.** A row's `rigour` is optional and theme planning gains no work it must do.
- **It does not read the code to propose a preset.** `tim build rigour` keys on the row. A row whose real cost is visible only in the tree — behaviour already on `main`, a shared module extended — is the operator's call at the intake, which is why every proposal carries its reason.
- **It does not tune the agent budget per preset.** `agentsPerIncrement` (`:138`) still assumes a `full` row, so a `fast` run reaches `agent-budget` later than it needs to. Harmless (it stops too early, never too late) and better measured than guessed: revisit it once a theme has run at `standard`.
- **It does not change `models`.** `fast` names the `code` tier, so a run that set `models.code` keeps its own choice.
- **It does not touch distil, theme planning or the backlog's own shape beyond the one optional field.**

---

## What the build changed in this plan

Kept as the build walks the tasks, so the plan and what landed do not diverge.

1. **The schema-parity test moved from Task 2 to Task 3.** Written in Task 2 it could only be red, because the
   schema field it reads arrives in Task 3, and Task 2 would have committed a red suite. No task now ends on one.
2. **Task 1 had to touch a third file, `workflow/README.md`.** `tim/src/backlog/workflow-contract.test.js:471-483`
   asserts the README's argument table lists exactly `REQUIRED_KEYS_BY_SCRIPT`, so the new key turned it red and
   a one-line stub row was the minimal fix. Task 13 therefore **replaces** that row rather than adding one.
   This also explains the gap Task 13 closes in BUILD.md: a test holds the README's table honest and nothing
   holds BUILD.md to anything.
3. **Task 1's missing-key test asserts the message exactly.** The snippet in Task 1 used `toContain` and an extra
   `expect(run.status).toBe('threw')`, where the `e2e` and `resumeFrom` missing-key tests it imitates both use an
   exact `toBe` and no status line. Tightened to match them; the `test.each` refusal block keeps `toContain`,
   because its message tail varies per value.
4. **Considered and declined: glossing each preset in the refusal message.** The `e2e` and `resumeFrom` refusals
   gloss their vocabularies inline, and `rigour`'s names the legal set and the dial's purpose without saying what
   `full`, `standard` and `fast` each run — and Task 2's log line cannot cover it, because that line fires only on
   the success path. Left as it is: three glosses would make a throw string unreadable, and the preset table is a
   `grep` away in the schema, the workflow README and BUILD.md. Revisit if anyone actually mistypes it.
5. **Task 2's prescribed block carried three house-rule breaches, found by its quality review and fixed in the
   build.** All three were the plan's, not the implementer's, and none changed what the code printed — the three
   log-line tests passed unchanged through the fix, which is what proved it behaviour-preserving:
   - a `planReview === 'none'` ternary hardcoded `'no plan review'` while the phrases map already held that exact
     string under `none`, so the entry was unreachable and the string lived twice. Collapsed to one lookup.
   - `tierFor = (tier) => tier === 'think' ? think : code` was a second mechanism beside `withTier`, which already
     maps any tier name to that helper, and it silently resolved anything but `'think'` to the code tier. Deleted
     — Task 8 calls `withTier(rules.planTier)`. Two rules applied: "Extend the mechanism that exists" and "Build
     only what this change makes reachable", the latter because nothing called it in that commit.
   - the comment above `RIGOUR_RULES` restated what the phrases map says in code and then gave design rationale,
     against "Rationale goes in the repo's `docs/` or the behaviour spec, never in code". Deleted; the reasoning
     is in DESIGN.md and in this plan.
   The phrases map also moved inside `rigourSummary`, its only reader ("A literal value used by one function lives
   in that function").
6. **Declined: the summary sentence's mixed grammatical forms.** "style reviewers" sits as a bare noun phrase
   beside "a consistency review" and "and findings verified before the judge". It reads acceptably, three tests now
   pin the strings, and the clause list is a log line rather than prose a user reads often. Left alone.
7. **Task 2 gained a third test, pinning `full`.** The plan specified `standard` and `fast` only, which left the
   preset the whole dial rests on — `full` means today's pipeline, unchanged — unasserted, while every other test
   in the suite runs under it through `BASE_ARGS`. Added.
8. **Task 3's shipped text points at a command Task 12 builds.** The schema's `rigour` description and
   `tim backlog set --rigour`'s help both name `tim build rigour <workarea>`. Both are documentation, nothing
   validates that the command exists, and every task lands on one branch before one pull request, so it exists by
   merge. Recorded because it is a real dependency: **if this branch is ever split or abandoned before Task 12,
   those two strings become dangling references** and must be cut in the same change.
9. **Task 3's prescribed text carried three more plan-level defects, fixed in the build.**
   - the parity test re-derived `rowSchemaOf(schema).properties.rigour.anyOf[0].enum` by hand when Step 4 defines
     `rigoursOf` for exactly that read, one step earlier in the same task. It calls it now.
   - `rigoursOf` indexed the `anyOf` branch by position. `expectationOf` in `shape.js` reads the same branches
     order-independently, so `rigoursOf` now finds the branch that has an enum. A reordered schema would have been
     caught — both tests would have gone red rather than silently validating against the wrong branch — but the
     safer idiom was already in the file.
   - the schema's `rigour` description ran to ~100 words and documented all three presets' full behaviour,
     duplicating `RIGOUR_RULES` with nothing holding the two in step: a later change to what `standard` does would
     leave the prose stale and no test would say so. Shortened to what the FIELD does, with a clause of gist per
     preset, pointing at BUILD.md's "Choosing rigour" for the matrix — the shape `gatePhases` and `awaitCi` use.
   Plus two cosmetic ones: the `--rigour` help text was missing the noun it overrides ("the run's rigour"), and the
   `setRowFields` JSDoc welded two fields' behaviour into one ambiguous sentence.
10. **Declined: reshaping `parseSetOpts(opts, statuses, rigours)` to a named-object parameter.** Two adjacent
    `string[]` parameters could be transposed, but there is one call site directly beside the signature, no later
    task in this programme touches `rows.js` again, and a transposed call fails loudly today because status values
    and rigour presets are disjoint strings.
11. **A test now pins that landing a row keeps its rigour.** `setRowFields` clears `attempt` when a `commit` is
    recorded and the rewritten JSDoc says so; nothing stopped someone tidying the two fields into one block and
    wiping a row's preset the moment it landed. The test passed first time, which is the point of it.
12. **A test name in Task 4 claimed a consumer that did not exist yet.** The plan titled it "hands the row's rigour
    on, so the loop can lower what one row gets", copied from the `attempt` test beside it — but that sibling's
    rationale clause is true today, because the loop really does read the attempt and feed a restore stage, where
    nothing reads the row's rigour out of the start result until Task 7. Retitled "reports the rigour a row sets",
    which pairs with "reports no rigour for a row that sets none" and claims only what it proves.
    `docs/best-practices/node/testing/frontend.md` §4: a title that claims more than its assertions check is a
    defect in the test.
13. **Rejected a review finding that was itself wrong.** Task 4's reviewer called the implementer's "47/47 passed"
    inflated, having counted 39 tests in one file. The command the implementer ran matches two test files whose
    counts sum to 47, so the figure was right and the reviewer's narrower run caused the difference it reported.
    Recorded because a reviewer's claim is evidence, not a verdict: this one was checked, corrected, and fed back
    to the implementer rather than passed on as a criticism.
14. **Task 5's row check treated only `undefined` as absent, and a reported `null` would have halted a run.**
    The most useful finding of the build so far, because the codebase already knew the answer. In the branch
    lifecycle every row field reaches the loop through an agent reading `jq` output and reporting it under a
    schema; the schema says `type: 'string'` and the prose says "leave it out when it is null or absent", but
    neither binds a model. The two fields this check imitates are both defensive about it — `(gatePhases ?? [])`
    and `row.awaitCi !== false` — which is archaeology: those guards exist because this path has produced
    non-omitted nulls before. The plan reintroduced a gap the code had already learned to close. Fixed to
    `rigour === undefined || rigour === null || …` (the explicit form `tim/src/backlog/move-rows-back.js:13`
    uses; there is no loose `== null` anywhere in `tim`), with a test proved red against the old check first.
    **Carry this forward:** any later task reading a row field out of the BRANCH stage's report treats null and
    absent alike.
15. **Declined two Minor findings on Task 5.** The `RIGOUR_PRESETS.join(', ')` phrasing stays: both rigour
    messages use it consistently, and `gatePhases` says "unit, fit and e2e" because it is a list you may name
    several from, where rigour is pick-one — copying its conjunction would be wrong. The stop test's
    `toMatchObject` + `toContain` stays too; it is idiomatic in that file and loses nothing here.
16. **Task 6's prescribed edit would have failed its own prescribed test, and the obvious fix was the wrong one.**
    The preflight instruction to replace spans a line break in the source (`Copy the last` /
    `command's output into rowRepos`), while the test asserts that sentence with a space in it. The implementer
    reflowed the template literal and said so. Three ways that could have gone badly instead: weaken the assertion
    to a fragment, delete the test, or drop the assertion as not worth it — each leaving the preflight's
    instruction unpinned while the suite stayed green. It went well only because the brief said a failing
    prescribed test means *report it*, never *make it pass*. **Carry this forward:** an assertion against prompt
    text must be checked against the source's actual line breaks.
17. **The preflight's remedy is now conditional, and both branches are pinned.** One fixed tail served two checks,
    so a rigour typo was answered with "add the repo to `config.repos`" — a remedy that sends the reader to the
    wrong file. The implementer made it conditional and flagged it for a decision rather than quietly diverging.
    Accepted, with an assertion added to each of the two tests that drive it, including that the rigour message
    does NOT mention `config.repos`.
18. **Task 7's prescribed code declared a binding nothing in Task 7 reads** (which the plan wrongly said would
    fail lint — see entry 36; the real reason is "build only what this change makes reachable"). Caught by reading
    the plan before dispatch rather than by a reviewer. The first correction was wrong too — it said Task 8 would
    declare `rules`, when Task 8 needs only a function-local `rulesOf(rigour)` inside `reviewedPlan`, so removing
    it from Task 7 left Tasks 9 and 10 reading a binding that existed nowhere. Task 9 now declares it, with an
    instruction to check the binding's scope actually reaches Task 10's verify and judge reads rather than assume.
19. **Queued, not done: move Task 7's log below the row's declaration block.** The brief placed it at the boundary
    between the row's `let` and `const` blocks, so a side-effecting statement interrupts what reads as one
    "declare this row's state" run. Task 7's reviewer traced every statement between the end of `ticketAndBranch`
    and the `build:` label, found none of them conditional, and so proved that moving it below `builderPhases`
    changes which rows reach it not at all. Deferred because Task 8 is editing the same file; fold it into Task 9.
20. **Queued, not done: `rowGatePhases` does not fold null and absent together, and will throw if it ever gets a
    null.** A pre-existing bug, found by applying entry 14's standing rule to the code beside the one A3 changed.
    It resolves on `row.gatePhases === undefined` alone, so an agent reporting `gatePhases: null` instead of
    omitting the key reaches `null.includes(...)` and throws — while the schema's own description for that field
    says "null or absent: all three". Every neighbour folds both (`rowAttempt ?? null`, `rowMerges ?? []`,
    `rowRigour ?? RIGOUR`, `gatePhases ?? []` in `rowFieldProblems`). The fix makes the code match its own
    documented contract:

    ```javascript
          rowGatePhases =
            row.gatePhases === undefined || row.gatePhases === null
              ? OFFERED_GATE_PHASES
              : OFFERED_GATE_PHASES.filter((name) => row.gatePhases.includes(name))
    ```

    Outside A3's scope, but the house rules say a file you touch meets them in full, and this is a one-line fix to
    a line adjacent to one A3 edits. Do it with entry 19, with a test that reports `gatePhases: null` and proves
    the row still gets every offered phase.
21. **Task 8's prescribed Step 5 missed a call site, and would have failed every test in its own task.**
    `reviewedPlan` is called twice — the row loop and the `PLAN_ONLY` branch — and the plan only changed the first.
    The second would have reached `rulesOf(undefined).planTier`, a `TypeError`, on the one path every test in
    Task 8 drives through `planOnly: true`. The implementer found it by grepping call sites as the brief told it
    to, and fixed it. **This is the worst defect the plan has carried**: not a style breach or a stale string, but
    a change that could not run at all, in the first task where the dial decides what the pipeline does.
22. **Two more Task 8 defects, both fixed in the build.** The prescribed signatures put an optional parameter
    before a required one (`planPassingLint(id, branchedRepos = null, rigour)`) with defaults no caller could
    reach; dropped, so the signature says what the callers do. And the implementer deliberately did NOT write
    `rulesOf(rigour)?.planTier`, because an undefined tier would reach `withTier` and silently fall through to the
    session model — the exact silent mis-tiering this task exists to prevent. A `TypeError` is the right failure
    for an impossible state. Recorded because that is a judgement worth keeping.
23. **Task 8 promoted a duplicated test helper, and added a test the plan did not ask for.** `modelOf` existed as
    two byte-identical local copies and a third was about to be written, so it moved to module scope and the copies
    went ("Set-up used by two tests goes in the shared test helper"). The extra test proves the thing the brief
    asked to be verified rather than assumed: at `standard` with detail findings only, those findings are still
    recorded as must-address and still reported, because the saving is one review, not the findings.
24. **Accepted, not fixed: at `fast` a plan's `followUps` can be absent where other presets report `[]`.**
    `reviewedPlan` returns the planner's result unchanged when no review runs, so it never passes through
    `withFollowUps`. Every consumer reads it as `plan?.followUps` or `?? []`, so nothing misbehaves — the key is
    simply missing rather than empty in one run report. Adding a `withFollowUps(plan, [])` whose only effect is
    normalising an optional field would be ceremony.
25. **A review that sends the plan back naming nothing wrote an empty "must address" section.** The one real
    defect in Task 8, created by the plan. `approved: false` with `findings: []` is schema-legal — the prompt
    forbids it, the schema does not, and `sendsPlanBack` fires on `!approved` alone. At `standard` that reached
    the new one-review branch, which logged "Its 0 finding(s) stand", ran an agent to append a
    `## Plan review: must address` section listing nothing into the plan the implementor reads, and reported the
    row planned. The `full` path has guarded exactly this one branch down since before A3, which is proof the
    decision was already made. Fixed by one clause — `reviewsRevisedPlan` also escalates when `findings` is
    empty — rather than by a new refusal, because `refusedAfterSecondReview`'s text says "sent the plan back
    twice" and that would be a lie from the one-review path. With the clause, a second read answers "the reviewer
    objected but named nothing", and if that review also names nothing the existing guard refuses with a message
    that is by then true. It is a no-op at `full`, which already escalated unconditionally.
26. **The `fast` plan-lint invariant was true but untested, and is the whole justification for dropping the
    review.** Task 8's reviewer traced it — at `fast` a plan with a denied check really does go plan → lint →
    replan → replan lint and refuse if still dirty — but every send-back test in the suite runs at `full`, and
    the only `fast` test asserted the lint *stage was present*. A stage being present is not the same claim as a
    dirty plan being sent back. Now tested.
27. **The honesty fix stopped at the log line, and four other texts still described the world before the dial.**
    The theme of Task 8's quality review, and the most useful thing it said. Entry 25 made `withMustAddress`'s log
    truthful about `standard` and left: the implementor's must-address preamble, the consistency reviewer's, the
    section the recorder writes *into the plan file*, `rigourSummary`'s operator-facing sentence, and
    `readReviewedPlan`'s "that plan passed its lint and its review" — which at `fast` is simply false, and is
    reachable, because `preserveAttempt` records `planReviewed: Boolean(plan?.ok)` for a plan no reviewer saw.
    All five fixed. **Carry this forward into Tasks 9 to 11:** each adds another claim about what ran — the review
    fan-out, the verifier, the judge — and settled decision 2 already says a prompt that claims verification that
    did not happen is worse than the stage being missing. When a preset drops a stage, every text that mentions
    that stage is part of the change.
28. **`planReviewed` now means "a plan exists and passed its lint", not "a reviewer read it".** At `fast` no
    reviewer runs, so the field records `true` for an unreviewed plan and `resumePointFor` resumes the row on it.
    The name mispredicts, and the house rules would have it renamed — but it is a `backlog.json` schema field that
    live backlogs already carry, so renaming it is a data migration rather than a tidy. Decision: keep the name,
    document the meaning here and in the schema, and treat the field as "there is a plan worth resuming onto".
    If it is ever renamed, `tim/src/build/start.js` and `tim/src/commands/backlog/rows.js` are the other readers.
29. **One rule had two owners in `reviewedPlan`, and naming it answered a question the plan could not.** The same
    two-term test — "is this a plain list of detail findings?" — was spelled twice, thirty lines apart, with
    opposite consequences: escalate to a second read, or refuse the increment. Named once as
    `detailFindingsOnly(findings)`, both call sites read from it. That also settles whether the empty-findings
    disjunct needed a comment: with this shape nobody reasons about an empty list, because "only details → carry
    on, anything else → escalate" reads directly and an empty list is visibly not "only details".
30. **Three sibling functions, two parameter conventions — the plan's own doing.** Entry 22 dropped the dead
    `branchedRepos = null` defaults from `planPassingLint` and `reviewedPlan` and left `planIncrement` hiding its
    now-mandatory `rigour` inside an options bag, so `planIncrement(id)` still looked valid and died on
    `rulesOf(undefined).planTier`. Made positional to match its siblings.
31. **`withMustAddress`'s `why` parameter went.** A caller-composed middle clause did not read as one sentence at
    the new call site — "its" had to reach back over two sentences — and the contract was unenforceable, since
    `why` had to end in a full stop and nothing said so. Each caller now logs its own line, and the function keeps
    only the log it owns.
32. **Declined: making `planReview: 'structural'` explicit rather than a fall-through.** The review noted that no
    behaviour branch reads that value — `standard` is simply what matches neither `'none'` nor `'twice'` — and
    that the convention is a poor one to hand to Tasks 9 to 11. Left as it is: `'twice'` is the only special
    case, a typo in it degrades loudly rather than silently (a test catches it), and the fields Tasks 9 to 11
    read are booleans and an explicitly-compared enum, so the fall-through does not generalise.
34. **Dropping the consistency reviewer at `fast` orphaned four judgements, and the plan did not know it.** Four
    other prompts delegate work to "the consistency reviewer" — the plan's decisions and docs-made-untrue lists,
    the implementor's notes, the spec-sync reason, and the Probes and Docs lines — and the ladder is explicitly
    told to stop short of them ("Run nothing more here: the consistency reviewer has judged what the lines
    claim"). The plan gave `fast`'s whole-change reviewer only the cross-file *lens*, so at `fast` nobody would
    have read any of the four. Closed by extracting the four rule builders and handing them to both whole-change
    reviewers, which also removed an existing duplicate of the same four-call sequence. The reviewer verified the
    selection by enumerating every delegation site independently: the four map one-to-one.
35. **But that hand-over overloads one agent, and the fix is its own task.** Task 9's reviewer enumerated what
    `fast`'s single reviewer is then asked to do: read two persona files (~57 KB) in full; review every changed
    file in every repo on its own merits across eight dimensions; read the change across files for four classes of
    inconsistency; judge the plan's departures; judge every claim in the implementor's notes; **run two git
    commands against `openspec/` and judge the spec write against the plan's section 8 and `openspec/config.yaml`
    across seven failure modes**; and **search `docs/`, the recipes, every changed function's doc comment, comments
    within ten lines of every hunk, and convention test names** to judge one `Docs updated:` line. The last two are
    not judgements over material already in front of it — they are separate investigations with their own evidence.
    And it runs on the `code` tier, where the consistency reviewer it absorbs runs on `think`: the table has a
    `planTier` but no review tier, so that demotion was implicit and nobody chose it. **Queued as its own task:**
    (a) give the ladder those two judgements at `fast` — it already reads the same notes at every preset and
    already runs the spec validate and lint, so flipping one sentence by preset moves the work to the agent already
    in those files; and (b) add `reviewTier` to `RIGOUR_RULES`, `think` at `fast`, since one `think` reviewer still
    costs far less than three on `code` and it is the only reader. Without this, `fast` is cheap rather than safe,
    and the design's claim that lowering rigour never lowers correctness does not hold.
36. **A mechanism the plan cited does not exist: nothing lints the loop script.** Entries 18 and Task 7's note
    justify where a binding lives by "an unused binding fails lint". There is no root `package.json` or eslint
    config, and `tim`'s `npm run lint` runs `eslint .` inside `tim/`, so `.claude/skills/**/*.js` is unlinted —
    `tim-ci.yml` triggers on changes to it and runs `tim`'s own suite, which exercises the loop through the test
    harness, but no linter reads it. The decisions were right for a different reason, the house rule "Build only
    what this change makes reachable", and that is the reason to give. Recorded because a false mechanism in a
    plan is worse than no reason: the next person to rely on it will be surprised.
37. **At `fast`, a rejected finding fell out of the theme review's backstop — and that backstop is the design's
    stated reason `fast` is safe.** At `full` and `standard` a refuted finding is pushed to `refutedFindings` and
    reaches the theme engineering review as `themeRefutedCheck`: "read each one and confirm none was real". At
    `fast` nothing is pushed, so a finding the judge rejects survives only as `reject: <what>` in the judgement
    calls — no reason, no quote, no theme-level re-read. Dropping the verifier removed the one class of finding
    that backstop exists to catch. Fixed by recording the judge's rejections at `fast` into `refutedFindings`, so
    the theme review re-reads them whatever the preset. This is implementing the design rather than changing it:
    DESIGN.md's A3 says the theme review "is the backstop for whatever a `fast` row's single reviewer missed, so
    making it configurable would remove the thing that makes `fast` safe to choose".
38. **Task 10 fixed the human-readable claim and left the machine-readable twin.** `findingTally()` learned to say
    "none verified" in the LANDED log; `findingCounts()`, which goes into the run's returned result for every
    outcome and is what an orchestrator and the handover prompt parse, still reported `confirmed: N, refuted: 0`
    for a row where nothing was verified. Same defect, same commit, two audiences — and the one that was missed is
    the one read by a machine. **Carry this forward:** when a preset changes what a stage did, fix the log *and*
    the structured result, and check which of the two a reader actually parses.
39. **The `fast` judge was given the verifier's duty without the verifier's equipment.** `UNVERIFIED_FINDINGS_DUTY`
    tells it to test each finding against the code, but the verifier's prompt also hands over three things the
    judge was not given: the literal diff command for each file (including the workspace variant's warning that an
    untracked file shows in no diff), the instruction that a finding's `<repoKey>:` prefix is dropped to get the
    path, and — most importantly — "Judge each finding INDEPENDENTLY and on its own evidence. They do not stand or
    fall together, and the number of them tells you nothing about whether any one is real." That last line exists
    to stop a batch rejection, and it matters *more* at `fast`, where one agent both produces the list and rules on
    it. A duty moved between agents moves with its equipment, or it is not the same duty.
40. **A mutation probe can be the wrong probe.** Task 10 reported that flipping all three `verifyFindings` to
    `false` reddened all three new tests. It reddens 53 tests but not `runs no verifier at fast` — correctly, since
    `fast` was already `false`. The right probe for that one is flipping `fast.verifyFindings` to `true`, which
    reddens exactly five including it. All three tests do have teeth; the evidence offered was not the evidence
    that proves it. Recorded because "I mutated it and tests failed" is only evidence when the mutation is the one
    the test is supposed to catch.
41. **The derivation read `gatePhases: []` as a rigour signal, and was wrong six times in nine on real data.**
    The most consequential defect the build found, and it was found only because Task 12's brief demanded a check
    against a real backlog rather than against tests. Six of the Design Release 2.1 documents rows carry
    `gatePhases: []`, so the rule proposed `fast` for all six. But those rows set it because the local e2e rung
    timed out at 90s on that machine and the proof moved to the pull requests — their own notes say "This is not a
    preference for less testing." **`gatePhases: []` says where a row is verified, not how much scrutiny it
    deserves**, and keying a preset off it makes a row get *less* review precisely because a machine could not run
    its tests locally. Clause deleted; the nine rows then come out exactly as the design intended. **Carry this
    forward:** a field that records an operational constraint is not a proxy for the value of a change, and the
    way to find out is to run the derivation over a real backlog and read every line of the answer.
42. **A plan can go stale about live data, not just about code.** Task 12's step 9 told the implementer to expect
    nine proposal lines from the documents theme. That theme has been built since the plan was written, so every
    row is `done`, `merged-into` or `dropped` and the honest answer is "there is nothing to propose a rigour for".
    The verification step now checks the derivation against the rows with their statuses forced to `todo` in a
    scratch copy, which is what the step was actually trying to test.
43. **The theme engineering review runs under the branch lifecycle only, and the design's safety argument
    rested on it.** Found by Task 13 while checking a sentence it had been told to write: the plan and DESIGN.md
    both say that review "runs once per theme", unqualified, and DESIGN.md names it as the reason `fast` is safe
    to choose. `builtTheme` is `null` under the full lifecycle — there is no theme to review when each row cuts
    its own branch and merges on its own. So a `fast` row under the full lifecycle has no second reading of the
    change at all: one whole-change reviewer, a judge verifying its own findings, the gate, the ladder and a
    per-row pull request with CI. That may well be enough, but it is not what the design claimed, and the claim
    was load-bearing. Recorded in DESIGN.md with the three options — require approval for `fast` rows, refuse
    `fast` under `lifecycle: 'full'`, or give the full lifecycle an end-of-run review — **none of them built, and
    not a decision to take from a document.** Both documents now say which lifecycle that review belongs to.
44. **Task 13 found six more places the plan's prose had gone stale**, every one followed to the code instead:
    "default standard" where the key is required with no fallback; the proposal keyed on "what the gate runs for
    it", deleted by entry 41; a sample output in the old single-line format; a `requireApproval` paragraph that
    omitted the plan lint and the ladder's two new judgements; "the plan reviewed, revised and re-reviewed" read
    as unconditional when `reviewedPlan` returns early on an approving review; and a README row that named
    neither the `fast` reviewer's `think` tier nor the `{unverified, rejected}` result shape. It also corrected
    the `models` entry's tier lists in BUILD.md — the same drift the plan had already fixed in the README, in the
    file that has no test behind it.
46. **The same inversion survived one rule over, and only a second review caught it.** Entry 41 deleted the
    `gatePhases: []` clause for reading *where* a row is verified as *how much it deserves*. The surviving
    `repos: []` rule did the same thing: a row that changes no **backlog** repo was proposed `fast` whatever its
    kind — but the workspace repo holds `tim`, the skills and the build loop itself, under 3,615 tests, so a
    `feat` or `refactor` row rewriting the loop got `fast` because no service gate reads it. The plan's rationale
    for that rule, "a row that changes no backlog repo has no production behaviour to read", is the part that was
    wrong: the workspace repo *is* production code for this pipeline. Now `repos: []` proposes `fast` only for a
    `docs` or `test` row and `standard` otherwise. **The lesson is not the rule, it is that fixing one instance of
    a reasoning error does not fix the reasoning** — after entry 41 I believed the inversion was dealt with, and
    it was sitting in the next clause down.
47. **The plan prescribed the stale "what the gate runs for it" sentence twice more**, in Task 12's command
    description and in Task 13's docs text, and Task 13 was already running when the review found it. Task 13
    caught it itself and wrote the truth instead. Both plan sites corrected. A deleted rule has to be deleted from
    every place that advertises it, and a plan that prescribes prose is one of those places.
48. **Declined: an own-property guard in `rulesOf`.** Task 8's reviewer noted that `RIGOUR_RULES['constructor']`
    walks the prototype chain and yields an object whose `planTier` is undefined, which `withTier` would accept
    and silently resolve to the session model — the exact silent mis-tiering this task exists to prevent. Checked
    the reachability myself rather than taking it: `RIGOUR_PRESETS.includes('constructor')` is false, so the
    branch path stops it in `rowFieldProblems`, the full path stops it in the preflight's `rowRigourProblems`,
    and a run-level value is validated at startup. All three inputs are covered, so a fourth guard would be
    building what nothing reaches. **If a fourth input path for rigour is ever added, add the guard with it** —
    the failure mode on that path is silent, which is the kind worth paying for.
