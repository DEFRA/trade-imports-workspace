# A1: e2e location and the lease that follows — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the increment build loop an `e2e: "local" | "ci"` argument that decides where a row's end-to-end proof comes from, derive the workspace stack lease from it instead of taking it unconditionally, scope the local e2e rung to what the built services' pull requests run, and move the row-level `repos` check into the preflight.

**Architecture:** Four independent changes behind one new required argument. The loop (`increment-build-loop.js`) gains the argument, stops asking its gate for an `e2e` phase under `"ci"`, and takes the stack lease only when some row still owes one. `tim` gains a reader for `config/e2e-tests-pr-scope.json` and uses it to resolve a new `scopeFrom: "pr-scope"` marker on a gates.json rung. The preflight agent gains two more `jq` calls and the script validates every todo row's `repos` against the configured keys before the first increment starts.

**Tech Stack:** Node.js ESM, vitest, zod (tim's schemas), the `Workflow` runtime's `agent()`/`log()` hooks, and the simulated workflow runtime in `tim/src/test-support/workflow-runtime.js` that the contract test drives.

**Design this implements:** `workareas/shared/build-loop-efficiency/DESIGN.md`, section A1.

**Read "Why Task 4 scopes from the services, not the tests repo" below before starting Task 4.** It explains a decision already taken, not one still open.

---

## Background an engineer needs before Task 1

**What the loop is.** `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js` (6,175 lines) is a `Workflow` script. It is launched by `scriptPath` with an `args` object and spawns subagents through `agent()`. It is never run directly; it is exercised by a simulated runtime in tests.

**How the loop is tested.** `tim/src/backlog/workflow-contract.test.js` (9,597 lines) is the loop's test suite. `runLoop(path, { args, answers })` at line 268 executes the script against a fake runtime and returns a run with `agents` (each entry carrying `prompt` and `options`), `logs`, `result` and `error`.

**`answers` is a positional array, not a map.** Each entry answers the next agent in order, skipping the stages `answeringRunLease` handles itself (the run lease, the plan lint and review, the theme check). The established opening is:

```javascript
answers: [WORKSPACE_ANSWER, PREFLIGHT_ANSWER, START_ANSWER, ...]
```

`WORKSPACE_ANSWER` is a file-level constant. `PREFLIGHT_ANSWER` (`{ ok: true, summary: '1' }`) and `START_ANSWER` are local to the describe block at `workflow-contract.test.js:897-905`, alongside the `runFrom(...)` and `baselinePrompt()` helpers that most baseline tests use. **Tasks 2, 3 and 5 add their tests to that same describe block**, so those constants are in scope.

Run the suite with:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

**The argument contract.** Every argument is required. `ALWAYS_REQUIRED` at `increment-build-loop.js:52` lists them; `requireKeys` at line 41 throws naming any that are missing, before any agent starts. The same list is mirrored in the test's required-keys map at `workflow-contract.test.js:95-123`, so the two must change together. `BASE_ARGS` at `workflow-contract.test.js:140` is the fixture every loop test starts from.

**The gate.** `tim build gate <workarea> --phase unit|fit|e2e|all` runs the rungs `.claude/skills/requirements-pipeline/references/gates.json` lists per repo. `tim/src/build/gates.js` parses that file; `planRungs({ gates, repos, phase })` plans which rungs run. A rung may carry `scope`, an array of arguments passed to its npm script after `--`. The tests repo's `e2e` rung has no `scope` today.

`baselineGateStep` at `increment-build-loop.js:3645` renders one `--phase all` command when a row owes every phase, and one command per phase otherwise. So a row owing only unit and fit produces `--phase unit` and `--phase fit`, never `--phase all`.

**The lease.** `increment-build-loop.js:4569` is `const runLease = PLAN_ONLY ? null : await acquireRunLease()`. It brings the whole 20-container workspace stack up for the entire run, whatever phases the rows ask for.

**House rules.** `.claude/rules/code-quality.md` governs comments, names and tests, and wins over anything in `docs/best-practices/`. Read it in full before writing code. In particular: no comment that restates the code, and a test name says the behaviour, not the mechanism.

**Branch.** All six tasks land on one branch:

```bash
git -C ~/git/defra/trade-imports-workspace checkout -b chore/NO_JIRA-build-loop-e2e-location
```

---

## File structure

| File | Responsibility | Tasks |
|---|---|---|
| `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js` | The `e2e` argument, the gate phases it offers, the derived lease, the preflight's row check | 1, 2, 3, 5 |
| `tim/src/backlog/workflow-contract.test.js` | The loop's contract tests | 1, 2, 3, 5 |
| `tim/src/build/pr-scope.js` | **New.** Reads `config/e2e-tests-pr-scope.json` and turns repo folders into Playwright arguments | 4 |
| `tim/src/build/pr-scope.test.js` | **New.** Its tests | 4 |
| `tim/src/build/gates.js` | Resolves a rung's `scopeFrom: "pr-scope"` against the built repos | 4 |
| `tim/src/build/gates.test.js` | Its tests | 4 |
| `.claude/skills/requirements-pipeline/references/gates.json` | The tests repo's e2e rung declares `scopeFrom` | 4 |
| `.claude/skills/requirements-pipeline/workflow/README.md` | The argument table and the stack-lease section | 6 |
| `.claude/skills/requirements-pipeline/SKILL.md` | The BUILD intake question | 6 |

---

## Task 1: The `e2e` argument

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:52-71` (`ALWAYS_REQUIRED`), and after line 101 (`const STOP_AFTER = CFG.stopAfter`)
- Test: `tim/src/backlog/workflow-contract.test.js:95-123` (required-keys map), `:140-173` (`BASE_ARGS`)

- [ ] **Step 1: Write the failing tests**

Add `'e2e'` to the `increment-build-loop.js` entry of the required-keys map, after `'approvalWaitMinutes'` at line 122. Add `e2e: 'local'` to `BASE_ARGS`, after `approvalWaitMinutes: 20` at line 172. Then add this block to the build loop's configuration describe:

```javascript
test('stops before any agent when e2e is missing', async () => {
  const run = await runLoop(scriptPath, { args: withoutKey(BASE_ARGS, 'e2e') })

  expect(run.error.message).toBe(
    'increment-build-loop: args is missing required key e2e. Pass every one in args: this workflow has no defaults'
  )
  expect(run.agents).toEqual([])
})

test.each([['both'], [null], ['Local']])(
  'refuses e2e %j before any agent',
  async (value) => {
    const run = await runLoop(scriptPath, { args: { ...BASE_ARGS, e2e: value } })

    expect(run.error.message).toContain(
      'config.e2e must be "local" (prove it with the local stack) or "ci" (let the pull requests prove it)'
    )
    expect(run.agents).toEqual([])
  }
)
```

Confirm `withoutKey` exists and use it as defined rather than writing another:

```bash
grep -n "const withoutKey" tim/src/backlog/workflow-contract.test.js
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: the missing-key test fails because `e2e` is not required yet, and all three refusal cases fail because no validation exists. The required-keys map test also fails, because the map now names a key `ALWAYS_REQUIRED` does not. All expected; Step 3 fixes it.

- [ ] **Step 3: Add the argument to the loop**

In `increment-build-loop.js`, add `'e2e'` to `ALWAYS_REQUIRED` after `'approvalWaitMinutes'` (line 70):

```javascript
  'requireApproval',
  'approvalWaitMinutes',
  'e2e'
]
```

Then after `const STOP_AFTER = CFG.stopAfter` (line 101), add:

```javascript
const E2E_LOCATIONS = ['local', 'ci']
const E2E = CFG.e2e
if (!E2E_LOCATIONS.includes(E2E)) {
  throw new Error(
    `${WORKFLOW_NAME}: config.e2e must be "local" (prove it with the local stack) or "ci" (let the pull requests prove it) — got ${JSON.stringify(E2E)}`
  )
}
const E2E_IS_LOCAL = E2E === 'local'
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS. The resolved-configuration log line now carries `"e2e":"local"`, which the existing config-log test picks up from `BASE_ARGS` on its own.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): take where a row's end-to-end proof comes from as an argument"
```

---

## Task 2: Derive the stack lease from `e2e`

The lease is taken when `e2e` is `"local"` **and** some increment the run will build still owes an `e2e` phase. A run whose every row carries `gatePhases: ["unit", "fit"]` needs no stack even under `"local"`.

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:3273-3291` (`PREFLIGHT_SCHEMA`), `:3300-3311` (the preflight prompt), `:4569` (the lease)
- Test: `tim/src/backlog/workflow-contract.test.js`, in the describe block at `:897`

- [ ] **Step 1: Add the shared test helper**

Tasks 2, 3 and 5 all need a preflight answer with extra fields. Add this beside `PREFLIGHT_ANSWER` at `workflow-contract.test.js:897`:

```javascript
const preflightAnswer = (fields = {}) => ({ ...PREFLIGHT_ANSWER, ...fields })
```

- [ ] **Step 2: Write the failing tests**

Add to the same describe block. `WORKSPACE_ANSWER` and `START_ANSWER` are already in scope there.

```javascript
test('takes the stack lease when e2e is local and a row owes an e2e phase', async () => {
  const run = await runLoop(scriptPath, {
    args: { ...BASE_ARGS, e2e: 'local' },
    answers: [
      WORKSPACE_ANSWER,
      preflightAnswer({ e2ePhasesOwed: true }),
      START_ANSWER
    ]
  })

  expect(run.agents.map((entry) => entry.options.label)).toContain(
    'run lease:acquire'
  )
})

test('takes no stack lease when e2e is ci', async () => {
  const run = await runLoop(scriptPath, {
    args: { ...BASE_ARGS, e2e: 'ci' },
    answers: [
      WORKSPACE_ANSWER,
      preflightAnswer({ e2ePhasesOwed: true }),
      START_ANSWER
    ]
  })

  expect(run.agents.map((entry) => entry.options.label)).not.toContain(
    'run lease:acquire'
  )
  expect(run.logs).toContain(
    'increment-build-loop: no stack lease — e2e is proved by the pull requests'
  )
})

test('takes no stack lease when no row of the run owes an e2e phase', async () => {
  const run = await runLoop(scriptPath, {
    args: { ...BASE_ARGS, e2e: 'local' },
    answers: [
      WORKSPACE_ANSWER,
      preflightAnswer({ e2ePhasesOwed: false }),
      START_ANSWER
    ]
  })

  expect(run.agents.map((entry) => entry.options.label)).not.toContain(
    'run lease:acquire'
  )
  expect(run.logs).toContain(
    'increment-build-loop: no stack lease — no increment of this run owes an e2e phase'
  )
})
```

Note these assert on `run.agents`, not the file's `stageLabels(run)` helper — that helper filters the lease stages out, which is exactly what these tests are about.

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: FAIL. `e2ePhasesOwed` is not in the preflight schema, so the answer is rejected, and the lease is taken regardless of `e2e`.

- [ ] **Step 4: Have the preflight report whether any row owes an e2e phase**

In `increment-build-loop.js`, add to `PREFLIGHT_SCHEMA` (line 3273), after the `branchWithoutPr` property:

```javascript
    e2ePhasesOwed: {
      type: 'boolean',
      description:
        "Whether any increment still to build owes the gate's e2e phase: true when a todo row's gatePhases names e2e, or is null or absent"
    }
```

and add `'e2ePhasesOwed'` to its `required` array.

Add a command to the preflight prompt (line 3300), after the `${BRANCH_PR_STEP}` interpolation. The branch step is numbered 3 and appears only under the branch lifecycle, so give this one `4` and let a full-lifecycle run simply have no `3`:

```javascript
4. \`jq -c '[.increments[] | select(.status=="todo") | (.gatePhases // ["e2e"])] | any(index("e2e") != null)' ${BACKLOG_TILDE}\`
```

and to the prompt's prose, before `Do nothing else.`:

```
Put the fourth command's output in e2ePhasesOwed: true when it printed true, false when it printed false.
```

- [ ] **Step 5: Derive the lease**

Replace line 4569:

```javascript
const runLease = PLAN_ONLY ? null : await acquireRunLease()
```

with:

```javascript
const E2E_PHASES_OWED = preflight.e2ePhasesOwed !== false
const noLeaseReason = !E2E_IS_LOCAL
  ? 'e2e is proved by the pull requests'
  : !E2E_PHASES_OWED
    ? 'no increment of this run owes an e2e phase'
    : null
if (noLeaseReason) log(`${WORKFLOW_NAME}: no stack lease — ${noLeaseReason}`)
const runLease = PLAN_ONLY || noLeaseReason ? null : await acquireRunLease()
```

`!== false` means a preflight that could not answer is treated as owing e2e, so a backlog the agent misread takes the lease rather than silently skipping the stack.

- [ ] **Step 6: Check the release site is already guarded**

```bash
grep -n "run lease:release" .claude/skills/requirements-pipeline/workflow/increment-build-loop.js
```

Expected: one site, reached only when `runLease` is truthy. If it is not guarded, wrap it so a leaseless run releases nothing.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): take the stack lease only when a row proves e2e locally"
```

---

## Task 3: Under `e2e: "ci"`, ask the gate for no e2e phase

The baseline, the ladder and the builders all derive their phases from `rowGatePhases` (`increment-build-loop.js:4680` and `:4703`). Under `"ci"` the loop must drop `e2e` from the set it offers, and the baseline must say where the e2e evidence comes from instead.

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js` — after `:915` (new rule constant), `:4680`, `:4703`, `:4813`, and `branchBaselinePrompt`
- Test: `tim/src/backlog/workflow-contract.test.js`, in the describe block at `:897`

- [ ] **Step 1: Write the failing tests**

```javascript
const baselinePromptWithE2e = async (e2e) => {
  const run = await runLoop(scriptPath, {
    args: { ...BASE_ARGS, e2e },
    answers: [WORKSPACE_ANSWER, preflightAnswer(), START_ANSWER]
  })
  return run.agents.find(
    (entry) => entry.options.label === 'inc-900 baseline'
  ).prompt
}

const CI_EVIDENCE_HEADING =
  "THE E2E EVIDENCE IS THIS BRANCH'S LAST COMPLETED PULL REQUEST CHECK RUN"

test('asks the gate for unit and fit one at a time when e2e is ci', async () => {
  const prompt = await baselinePromptWithE2e('ci')

  expect(prompt).toContain('--phase unit')
  expect(prompt).toContain('--phase fit')
  expect(prompt).not.toContain('--phase e2e')
  expect(prompt).not.toContain('--phase all')
})

test('tells the baseline to read the branch pull request for its e2e evidence when e2e is ci', async () => {
  expect(await baselinePromptWithE2e('ci')).toContain(CI_EVIDENCE_HEADING)
})

test('asks the gate for the whole gate in one call when e2e is local', async () => {
  const prompt = await baselinePromptWithE2e('local')

  expect(prompt).toContain('--phase all')
  expect(prompt).not.toContain(CI_EVIDENCE_HEADING)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: FAIL — the baseline asks for `--phase all` under both values and says nothing about pull-request evidence.

- [ ] **Step 3: Narrow the phases the loop offers**

`E2E_IS_LOCAL` is defined around line 102, well before the increment loop, so it is in scope at both sites.

Change line 4680:

```javascript
  let rowGatePhases = GATE_PHASES
```

to:

```javascript
  const offeredPhases = E2E_IS_LOCAL
    ? GATE_PHASES
    : GATE_PHASES.filter((name) => name !== 'e2e')
  let rowGatePhases = offeredPhases
```

and line 4703:

```javascript
      rowGatePhases = row.gatePhases === undefined ? GATE_PHASES : GATE_PHASES.filter((name) => row.gatePhases.includes(name))
```

to:

```javascript
      rowGatePhases = row.gatePhases === undefined ? offeredPhases : offeredPhases.filter((name) => row.gatePhases.includes(name))
```

- [ ] **Step 4: Fix the full-lifecycle baseline's phases**

Line 4813 passes `GATE_PHASES` directly rather than the row's, so the full lifecycle would ignore `e2e`:

```javascript
${baselineGateStep(GATE_PHASES, gateLogs(id, 'baseline'))}
```

Change it to:

```javascript
${baselineGateStep(rowGatePhases, gateLogs(id, 'baseline'))}
```

- [ ] **Step 5: Tell the baseline where the e2e evidence comes from**

Add this constant after `RUN_STACK_RULE` ends (around line 915), beside the other rule strings:

```javascript
const CI_E2E_EVIDENCE_RULE = `THE E2E EVIDENCE IS THIS BRANCH'S LAST COMPLETED PULL REQUEST CHECK RUN, not a local gate.
For every repo of this row, run \`gh pr checks <number> --repo <github> --json name,state,workflow\` once, for the open
pull request on \`${BASE_BRANCH}\`, and report the e2e job's state per repo. A branch whose pull request has completed no
e2e run yet is not red: report it as awaited and say so. Never run the gate's E2E phase, never start or stop the
workspace stack, and never drive \`docker\` yourself — this run holds no stack lease.`
```

Then interpolate it into the baseline prompt (line 4793 onwards), on the line after `baselineGateStep(...)`:

```javascript
${E2E_IS_LOCAL ? '' : CI_E2E_EVIDENCE_RULE}
```

The branch-lifecycle baseline is built by `branchBaselinePrompt(id, rowGatePhases)` on the same line, so add the same interpolation inside that function's template too:

```bash
grep -n "const branchBaselinePrompt" .claude/skills/requirements-pipeline/workflow/increment-build-loop.js
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS. An existing test asserts the `--phase all` baseline contains no `--phase e2e`; it still holds, because `BASE_ARGS` carries `e2e: 'local'`.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): read a ci-proved row's e2e evidence from its pull request"
```

---

## Why Task 4 scopes from the services, not the tests repo

**Decided, 29 October. Read it before Task 4 so the filter in Step 10 is not mistaken for a bug.**

`config/e2e-tests-pr-scope.json` keys a repo folder to the suites and tags its pull request runs.
`trade-imports-ins-tests` has **no entry**, so it falls to `"default": { "suites": ["all"] }`. A pull request on the
tests repo runs every domain, which is right: a change there can break any of them.

A naive union rule would therefore make `scopeFrom` a no-op in the common case. Almost every theme builds the tests
repo alongside a service, and the tests repo's `all` would win every time. The documents theme is the example: its
built repos were the animals frontend and the tests repo, so the union was every suite — meaning the local rung was
**not** running more than those two pull requests ran between them. `DESIGN.md` overstates that; Task 7 corrects it.

**So the rung scopes from the built repos other than its own.** The reason is the one Ian gave: the e2e specs a theme
changes in the tests repo are the specs for the service it is building. A documents theme edits
`tests/animals/documents-*.spec.ts`; it does not touch plants. Scoping to `tests/animals/` with
`--grep @animals-frontend` therefore runs everything the theme could have broken, and a theme that builds only the
tests repo has nothing to scope from and runs every spec.

The one case it does not cover is a theme that changes a shared helper under `flows/` that specs in another domain
also use — and the documents theme's own follow-ups in `deferred.md` show that kind of churn really happens. That is
caught anyway: the tests repo's own pull request runs every suite, and CDP runs each service's whole family after
deployment. It is the same trade `e2e: "ci"` makes, applied to the local path for consistency.

---

## Task 4: Scope the local e2e rung to what the built services' pull requests run

Playwright takes suites as positional path filters and tags as `--grep`, so one repo's entry becomes `['tests/animals/', '--grep', '@animals-frontend']`. Several repos union their suites and alternate their tags. An empty result means no filter — run every spec.

**Files:**
- Create: `tim/src/build/pr-scope.js`, `tim/src/build/pr-scope.test.js`
- Modify: `tim/src/build/gates.js:60-80` (rung schema), `:88-100` (`rungProblems`), `:185-194` (`planned`), `:209-215` (`repoPlan`)
- Modify: `.claude/skills/requirements-pipeline/references/gates.json` (the tests repo's e2e rung, and the `$comment`)
- Test: `tim/src/build/gates.test.js`

- [ ] **Step 1: Write the failing test for the reader**

Create `tim/src/build/pr-scope.test.js`:

```javascript
import { describe, test, expect } from 'vitest'
import { prScopeArgs } from './pr-scope.js'

const SCOPE = {
  default: { suites: ['all'] },
  'trade-imports-animals-frontend': {
    suites: ['tests/animals/'],
    tags: ['@animals-frontend']
  },
  'trade-imports-ins-backend': { suites: ['tests/ins/'] },
  'trade-imports-address-book': {
    suites: ['tests/ins/'],
    tags: ['@address-book']
  }
}

describe('prScopeArgs', () => {
  test('turns one repo into its suites and its tag as a grep', () => {
    expect(prScopeArgs(SCOPE, ['trade-imports-animals-frontend'])).toEqual([
      'tests/animals/',
      '--grep',
      '@animals-frontend'
    ])
  })

  test('omits the grep for a repo the scope gives no tags', () => {
    expect(prScopeArgs(SCOPE, ['trade-imports-ins-backend'])).toEqual([
      'tests/ins/'
    ])
  })

  test('unions the suites and alternates the tags across several repos', () => {
    expect(
      prScopeArgs(SCOPE, [
        'trade-imports-animals-frontend',
        'trade-imports-address-book'
      ])
    ).toEqual([
      'tests/animals/',
      'tests/ins/',
      '--grep',
      '@animals-frontend|@address-book'
    ])
  })

  test('keeps one copy of a suite two repos share', () => {
    expect(
      prScopeArgs(SCOPE, [
        'trade-imports-ins-backend',
        'trade-imports-address-book'
      ])
    ).toEqual(['tests/ins/', '--grep', '@address-book'])
  })

  test('runs every spec for a repo the scope does not name', () => {
    expect(prScopeArgs(SCOPE, ['trade-imports-plants-frontend'])).toEqual([])
  })

  test('runs every spec when any repo of a set runs every suite', () => {
    expect(
      prScopeArgs(SCOPE, [
        'trade-imports-animals-frontend',
        'trade-imports-plants-frontend'
      ])
    ).toEqual([])
  })

  test('runs every spec when there is nothing to scope from', () => {
    expect(prScopeArgs(SCOPE, [])).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- pr-scope
```

Expected: FAIL — `Cannot find module './pr-scope.js'`.

- [ ] **Step 3: Check the JSON reader's signature**

```bash
grep -n -A12 "export const readJsonFile" tim/src/backlog/io.js
```

Note whether it takes one argument or two, and match it in Step 4.

- [ ] **Step 4: Write the reader**

Create `tim/src/build/pr-scope.js`:

```javascript
import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'

export const PR_SCOPE_PATH = join('config', 'e2e-tests-pr-scope.json')

const EVERY_SUITE = 'all'
const DEFAULT_KEY = 'default'

/**
 * The Playwright arguments that run what the pull requests of these repos run:
 * every repo's suites as path filters, and their tags as one alternated
 * `--grep`. An empty list runs every spec, which is what a repo the scope does
 * not name asks for through its `default` entry.
 *
 * @param {object} scope The parsed e2e-tests-pr-scope.json
 * @param {string[]} folders Repo folder names to scope from
 * @returns {string[]} Arguments to pass after `--`, possibly empty
 */
export const prScopeArgs = (scope, folders) => {
  if (folders.length === 0) return []
  const entries = folders.map((folder) => scope[folder] ?? scope[DEFAULT_KEY])
  const runsEverySuite = entries.some((entry) =>
    (entry?.suites ?? [EVERY_SUITE]).includes(EVERY_SUITE)
  )
  if (runsEverySuite) return []
  const suites = [...new Set(entries.flatMap((entry) => entry.suites))]
  const tags = [...new Set(entries.flatMap((entry) => entry.tags ?? []))]
  return tags.length === 0 ? suites : [...suites, '--grep', tags.join('|')]
}

/**
 * Reads the workspace's pull-request e2e scope file.
 *
 * @param {string} workspaceRoot
 * @returns {object} The parsed scope map
 * @throws {TimError} NOT_FOUND or PARSE
 */
export const loadPrScope = (workspaceRoot) =>
  readJsonFile(join(workspaceRoot, PR_SCOPE_PATH))
```

- [ ] **Step 5: Run it to verify it passes**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- pr-scope
```

Expected: PASS, seven tests.

- [ ] **Step 6: Commit the reader**

```bash
git add tim/src/build/pr-scope.js tim/src/build/pr-scope.test.js
git commit -m "feat(tim): read which e2e suites and tags a repo's pull request runs"
```

- [ ] **Step 7: Write the failing tests for the rung resolution**

`gates.test.js` already has `gatesWith(repos)`, `parseGates(value)`, `problemsOf(value)`, `repo(folder)` and `planRungs({ gates, repos, phase })` — use those. Add to the `describe('planRungs', ...)` block at line 371 and the `describe('parseGates', ...)` block at line 193 respectively.

In `describe('planRungs', ...)`:

```javascript
test('scopes a scopeFrom rung to the suites the built services run, not the tests repo', () => {
  const gates = parseGates(
    gatesWith({
      'trade-imports-ins-tests': {
        rungs: [
          {
            name: 'e2e',
            phase: 'e2e',
            run: 'test:docker-compose',
            scopeFrom: 'pr-scope',
            forRepos: ['trade-imports-animals-frontend']
          }
        ]
      }
    })
  )

  const plan = planRungs({
    gates,
    repos: [
      repo('trade-imports-ins-tests'),
      repo('trade-imports-animals-frontend')
    ],
    phase: 'e2e',
    workspaceRoot
  })

  expect(plan.find(({ name }) => name === 'e2e').scope).toEqual([
    'tests/animals/',
    '--grep',
    '@animals-frontend'
  ])
})

test('runs every spec for a scopeFrom rung when only its own repo is built', () => {
  const gates = parseGates(
    gatesWith({
      'trade-imports-ins-tests': {
        rungs: [
          {
            name: 'e2e',
            phase: 'e2e',
            run: 'test:docker-compose',
            scopeFrom: 'pr-scope',
            forRepos: ['trade-imports-ins-tests']
          }
        ]
      }
    })
  )

  const plan = planRungs({
    gates,
    repos: [repo('trade-imports-ins-tests')],
    phase: 'e2e',
    workspaceRoot
  })

  expect(plan.find(({ name }) => name === 'e2e').scope).toEqual([])
})
```

`workspaceRoot` is already defined at `gates.test.js:15`, so these read the real `config/e2e-tests-pr-scope.json`. That is deliberate: it keeps the two files honest about each other. If `planRungs` turns out not to take `workspaceRoot`, add it as a named option in Step 10 and pass it here.

In `describe('parseGates', ...)`:

```javascript
test('refuses a rung that names both scope and scopeFrom', () => {
  expect(
    problemsOf(
      gatesWith({
        'trade-imports-ins-tests': {
          rungs: [
            {
              name: 'e2e',
              phase: 'e2e',
              run: 'test:docker-compose',
              scope: ['tests/ins/'],
              scopeFrom: 'pr-scope',
              forRepos: ['trade-imports-ins-tests']
            }
          ]
        }
      })
    ).message
  ).toContain('names both scope and scopeFrom')
})

test('refuses scopeFrom on a rung that is not an e2e rung', () => {
  expect(
    problemsOf(
      gatesWith({
        'trade-imports-ins-tests': {
          rungs: [{ ...unitRung('unit', 'test'), scopeFrom: 'pr-scope' }]
        }
      })
    ).message
  ).toContain('only an e2e rung takes')
})
```

- [ ] **Step 8: Run them to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- gates
```

Expected: FAIL — `scopeFrom` is rejected outright by the strict rung schema, so even the refusal tests fail with the wrong message.

- [ ] **Step 9: Accept `scopeFrom` in the schema**

In `tim/src/build/gates.js`, add to `rungSchema`, after the `scope` property at line 75:

```javascript
    scopeFrom: z.literal('pr-scope').optional(),
```

Add two entries to the array `rungProblems` returns. It destructures `const { name, phase, run, ports, forRepos, exclusive } = rung` at the top, so read the two new fields off `rung` directly:

```javascript
    rung.scope && rung.scopeFrom
      ? `"${name}" names both scope and scopeFrom; pick one.`
      : null,
    rung.scopeFrom && phase !== 'e2e'
      ? `"${name}" names scopeFrom, which only an e2e rung takes.`
      : null,
```

- [ ] **Step 10: Resolve `scopeFrom` when planning**

Import the reader at the top of `gates.js`:

```javascript
import { loadPrScope, prScopeArgs } from './pr-scope.js'
```

Change `planned` (line 185) to take the built folders and the workspace root, excluding the rung's own repo from what it scopes from:

```javascript
const planned = (repo, rung, folders, workspaceRoot) => ({
  repo: repo.folder,
  path: rung.cwd ? join(repo.path, rung.cwd) : repo.path,
  name: rung.name,
  phase: rung.phase,
  run: rung.run,
  scope: rung.scopeFrom
    ? prScopeArgs(
        loadPrScope(workspaceRoot),
        folders.filter((folder) => folder !== repo.folder)
      )
    : (rung.scope ?? []),
  ports: rung.ports ?? [],
  exclusive: rung.exclusive ?? false,
  refusal: null
})
```

Then thread `folders` and `workspaceRoot` down to every call site:

```bash
grep -n "planned(\|repoPlan(\|planRungs" tim/src/build/gates.js
```

`repoPlan` already receives `folders`; it needs `workspaceRoot` adding to its parameters, and `planRungs` needs to accept and pass it. `runGate` in the same package already knows the workspace root, so pass it from there.

- [ ] **Step 11: Run them to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- gates
```

Expected: PASS.

- [ ] **Step 12: Declare the marker on the tests repo's e2e rung**

In `.claude/skills/requirements-pipeline/references/gates.json`, add `"scopeFrom": "pr-scope"` to the `trade-imports-ins-tests` `e2e` rung — the one at line 217 with the ten-entry `forRepos`:

```json
        {
          "name": "e2e",
          "phase": "e2e",
          "run": "test:docker-compose",
          "scopeFrom": "pr-scope",
          "forRepos": [
```

Leave the rung at line 180 alone: it is the `exclusive` performance test and runs k6, not Playwright.

In the same file's `$comment`, after the words `scoped with \`scope\` (Playwright args after \`--\`)`, add:

```
, or with `scopeFrom: "pr-scope"`, which takes those args from config/e2e-tests-pr-scope.json for the other repos the backlog builds, so a local run proves the services the pull requests prove
```

- [ ] **Step 13: Prove it resolves against the real files**

```bash
tim build gate shared/design-release-2-1/themes/documents --phase e2e --workspace ~/git/defra/trade-imports-workspace --json --logs /tmp/claude-501/scope-probe
```

Expected: the planned e2e rung carries `scope` `["tests/animals/","--grep","@animals-frontend"]`, and the gate then refuses because no lease is held. The refusal is fine — the resolved scope is the point. If it errors reading the scope file instead, fix the reader before going on.

- [ ] **Step 14: Commit**

```bash
git add tim/src/build/gates.js tim/src/build/gates.test.js .claude/skills/requirements-pipeline/references/gates.json
git commit -m "feat(tim): scope the local e2e rung to the services the built repos' pull requests prove"
```

---

## Task 5: Validate every todo row's `repos` at the preflight

Today the args are checked against the backlog envelope at the preflight, but a row's own `repos` are checked per row in the Branch stage and fail as `row-invalid` (`increment-build-loop.js:4696`) — after the launch, after the lease, one row at a time. On the documents theme all five rows named a `workspace` key the branch lifecycle forbids, and each would have failed separately.

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:3273-3291` (schema), `:3300-3311` (prompt), and after `:3360` (the envelope check)
- Test: `tim/src/backlog/workflow-contract.test.js`, in the describe block at `:897`

- [ ] **Step 1: Write the failing tests**

```javascript
const runWithRowRepos = (rowRepos) =>
  runLoop(scriptPath, {
    args: BASE_ARGS,
    answers: [WORKSPACE_ANSWER, preflightAnswer({ rowRepos }), START_ANSWER]
  })

test('stops at the preflight when a todo row names a repo the args do not configure', async () => {
  const run = await runWithRowRepos([
    { id: 'inc-900', repos: ['frontend'] },
    { id: 'inc-901', repos: ['frontend', 'workspace'] }
  ])

  expect(run.error.message).toContain(
    'inc-901 names repo "workspace", which config.repos does not configure'
  )
  expect(run.agents.map((entry) => entry.options.label)).not.toContain(
    'inc-900 start'
  )
})

test('lets a row naming no repo through the preflight', async () => {
  const run = await runWithRowRepos([{ id: 'inc-900', repos: [] }])

  expect(run.error).toBeUndefined()
})

test('names every offending row, not just the first', async () => {
  const run = await runWithRowRepos([
    { id: 'inc-900', repos: ['workspace'] },
    { id: 'inc-901', repos: ['admin'] }
  ])

  expect(run.error.message).toContain('inc-900 names repo "workspace"')
  expect(run.error.message).toContain('inc-901 names repo "admin"')
})
```

The first test asserts on `inc-900 start` rather than `inc-900 branch`, because `BASE_ARGS` uses `lifecycle: 'full'`, whose first per-increment stage is the start stage.

- [ ] **Step 2: Run them to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: FAIL — `rowRepos` is not in the preflight schema and nothing checks it.

- [ ] **Step 3: Have the preflight report each todo row's repos**

Add to `PREFLIGHT_SCHEMA`'s properties:

```javascript
    rowRepos: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'repos'],
        properties: {
          id: { type: 'string' },
          repos: { type: 'array', items: { type: 'string' } }
        },
        additionalProperties: false
      },
      description:
        "Every todo increment's id and its repos list, [] where it names none"
    }
```

and `'rowRepos'` to its `required` array.

Add a fifth command to the preflight prompt:

```javascript
5. \`jq -c '[.increments[] | select(.status=="todo") | {id, repos: (.repos // [])}]' ${BACKLOG_TILDE}\`
```

and to its prose:

```
Copy the fifth command's output into rowRepos exactly as printed.
```

- [ ] **Step 4: Check it before the first increment**

After the envelope-repos check — the `if (ENVELOPE_REPOS === null) { ... } else { ... }` block ending near line 3360 — add:

```javascript
const rowRepoProblems = (rows) =>
  rows.flatMap(({ id, repos: rowRepos }) =>
    rowRepos
      .filter((key) => !REPO_KEYS.includes(key))
      .map(
        (key) =>
          `${id} names repo ${JSON.stringify(key)}, which config.repos does not configure`
      )
  )

const rowProblems = rowRepoProblems(preflight.rowRepos ?? [])
if (rowProblems.length > 0) {
  throw new Error(
    `${WORKFLOW_NAME}: ${rowProblems.join('; ')}. Fix the rows, or add the repo to config.repos and the backlog envelope, then launch again`
  )
}
```

- [ ] **Step 5: Run them to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git commit -m "feat(build-loop): refuse a row naming an unconfigured repo before the first increment"
```

---

## Task 6: Document the argument and the intake question

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/README.md` — the argument table at `:224-252`, and "The workspace stack lease" at `:790`
- Modify: `.claude/skills/requirements-pipeline/SKILL.md` — the BUILD phase

- [ ] **Step 1: Add the argument to the table**

In `README.md`'s argument table, after the `stopAfter` row, add:

```markdown
| `e2e` | Where a row's end-to-end proof comes from. `'local'` runs the gate's e2e phase against the workspace stack, scoped to the suites and tags the built services' pull requests run. `'ci'` runs no local e2e, takes no stack lease and builds no images: the baseline reads the branch's last completed pull request check run instead, and the run still stops at `ci-red`. Settle it at the launch from what the machine can actually do |
```

- [ ] **Step 2: Rewrite the stack-lease section's opening**

In the "The workspace stack lease" section (line 790), replace the sentence saying the run takes the lease before its first increment with:

```markdown
The run takes the stack's lease before its first increment **only when it needs it**: when `e2e` is `'local'` and
some todo row still owes the gate's e2e phase. A `'ci'` run, or a `'local'` run whose every row carries
`gatePhases: ["unit", "fit"]`, takes no lease, starts no containers and builds no images, and logs which of the two
reasons applied.
```

- [ ] **Step 3: Add the intake question to the skill**

In `SKILL.md`'s BUILD phase, where the launch arguments are assembled, add:

```markdown
Before the launch, settle `e2e`, and give the recommendation its evidence rather than asking cold. Run each of these,
one call per command:

- `docker info --format '{{.NCPU}} CPUs, {{.MemTotal}} bytes'`
- `ls config/machine.json` — absent means `tim build tune --write` has never run here
- `tim docker lease status --json`

Recommend `ci` when Docker holds under half the machine's memory, or when `config/machine.json` is absent, and say
which it was. Recommend `local` otherwise. Record the answer in `build-args.json`, so a relaunch after a stop defaults
to it and needs a confirm rather than the question again.
```

- [ ] **Step 4: Check the docs against the code**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: PASS. The contract test compares the README's argument table against `ALWAYS_REQUIRED`, so a missing row fails here rather than in review.

- [ ] **Step 5: Run the whole suite**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test
```

- [ ] **Step 6: Format, then lint**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim run format
```

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim run lint
```

Expected: both green. `format` rewrites files, so it runs first.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/requirements-pipeline/workflow/README.md .claude/skills/requirements-pipeline/SKILL.md
git commit -m "docs(build-loop): say where a row's end-to-end proof comes from"
```

---

## Task 7: Correct the design document

The design document's A1 section claims the local e2e rung runs more than the pull requests do. That is true only when the theme does not build the tests repo, as "Why Task 4 scopes from the services, not the tests repo" explains. Leaving it uncorrected would mislead the next reader.

**Files:**
- Modify: `workareas/shared/build-loop-efficiency/DESIGN.md`, the "Scope the local e2e rung" paragraph of A1

- [ ] **Step 1: Replace the paragraph**

```markdown
**Scope the local e2e rung.** The tests repo's `e2e` rung in `references/gates.json` runs
`test:docker-compose` with no `scope`, and no Playwright args means no filter: every domain's specs run. Where the
theme builds no tests-repo change that is more than its services' pull requests run. Where it does build one — most
themes, documents included — the tests repo's own pull request runs every suite too, so the local rung matched them
between them. Either way it duplicates what CDP runs after deployment and costs the most on the machine least able to
afford it.

The rung therefore takes `scopeFrom: "pr-scope"`, resolved from `config/e2e-tests-pr-scope.json` for the built repos
**other than the rung's own**: the services the run is proving. A theme building the animals frontend and the tests
repo scopes to `tests/animals/` with `--grep @animals-frontend`. A tests-repo-only theme has nothing to scope from and
runs every spec. This is the same trade `e2e: "ci"` makes — trust the per-service scope, and let the tests repo's own
pull request and CDP's family runs catch the rest.
```

- [ ] **Step 2: Commit**

```bash
git add workareas/shared/build-loop-efficiency/DESIGN.md
git commit -m "docs(build-loop): correct what the local e2e rung runs over its pull requests"
```

---

## Verification before the pull request

- [ ] **Every test green**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test
```

- [ ] **A plan-only launch proves the argument end to end**

Launch the loop by `scriptPath` with the documents theme's `build-args.json`, plus `planOnly: true` and `e2e: "ci"`.

Expected: the first log line carries `"e2e":"ci"`; a `no stack lease — e2e is proved by the pull requests` line follows; no `run lease:acquire` agent appears in `/workflows`.

- [ ] **The same launch with `e2e: "local"` takes the lease**

Expected: `run lease:acquire` appears. Then check the stack is back as you found it:

```bash
tim docker lease status --json
```

- [ ] **Push**

A `PreToolUse` hook runs the real SonarCloud quality gate on `git push` — for this branch that is `npm ci`, format, lint, the full `tim` suite and the scanner. Let it run; never work round it.

---

## What this plan does not do

A1 only. These are in `DESIGN.md` and are **not** in scope here:

- **A2**, resume from the stage a row reached.
- **A3**, the `rigour` dial and the per-row proposal table.
- **A4**, `tim build tune --write`, the Docker allocation, the `main`-merge cadence in `HOW-TO-BUILD.md`, and `tim sonar gate`.

One A4 item is worth raising as soon as this lands: with `e2e: "ci"`, CI carries the end-to-end proof, and the CI fixer still cannot see why a SonarCloud quality gate failed. That gap is recorded in `workareas/shared/design-release-2-1/deferred.md` and matters more after this change than before it.
