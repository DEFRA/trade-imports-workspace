import { describe, test, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'acorn'
import {
  WORKFLOW_PARSE_OPTIONS,
  runWorkflowScript
} from '../test-support/workflow-runtime.js'

const MISSING_KEYS_MESSAGE_PATTERN = /^[a-z-]+: args is missing required keys? /

// The args items of DESIGN 4.6's contract test: every workflow script — the
// shared ones in .claude/workflows/ and a skill's own under
// .claude/skills/<skill>/workflow/ — accepts args as a string, stops naming
// any missing required key, logs its resolved configuration first, and
// carries no fallback defaults. Later increments add the rails, briefs,
// skill-contract and span-walker items alongside these (inc-014, inc-019).
const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)
const workflowsDir = join(workspaceRoot, '.claude', 'workflows')
const skillsDir = join(workspaceRoot, '.claude', 'skills')
const buildLoopDir = join(skillsDir, 'requirements-pipeline', 'workflow')

const skillWorkflowDirs = () =>
  readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(skillsDir, entry.name, 'workflow'))
    .filter((dir) => existsSync(dir))

const scriptsIn = (dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => {
      const path = join(dir, name)
      return { name, path, source: readFileSync(path, 'utf8') }
    })

const workflowScripts = () =>
  [workflowsDir, ...skillWorkflowDirs()].flatMap(scriptsIn)

const countOccurrences = (source, marker) => source.split(marker).length - 1

const extractArgsContractBlock = (source) => {
  const startMarker = '// >>> args-contract'
  const endMarker = '// <<< args-contract'
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker)
  return source.slice(start, end + endMarker.length)
}

// The name of the variable a script assigns its resolved config to — the
// declarator whose init is a call to `parseArgs(...)` — wherever the script
// happens to name it (`CFG`, `config`, ...), so the no-default check below
// ties to the contract rather than to one hardcoded identifier.
const parseArgsResultIdentifier = (source) => {
  const program = parse(source, WORKFLOW_PARSE_OPTIONS)
  const declarators = program.body
    .filter((node) => node.type === 'VariableDeclaration')
    .flatMap((node) => node.declarations)

  const declarator = declarators.find(
    (candidate) =>
      candidate.id.type === 'Identifier' &&
      candidate.init?.type === 'CallExpression' &&
      candidate.init.callee.type === 'Identifier' &&
      candidate.init.callee.name === 'parseArgs'
  )

  return declarator?.id.name ?? null
}

// Every key the loop requires, in the order it names them, used to prove "no
// args at all" names each of them — not merely that it throws.
const REQUIRED_KEYS_BY_SCRIPT = {
  'increment-build-loop.js': [
    'workarea',
    'branch',
    'lifecycle',
    'scope',
    'executor',
    'planOnly',
    'repos',
    'models',
    'increments',
    'stopAfter',
    'jiraProject',
    'epic',
    'jiraInProgressStatus',
    'jiraDoneStatus',
    'jiraBoard',
    'ciFixAttempts',
    'ciWatchMinutes',
    'requireApproval',
    'approvalWaitMinutes'
  ],
  'args-canary.js': ['list', 'n'],
  'distil.js': ['workspace', 'workarea', 'only', 'tim', 'models', 'verifyChunk']
}

const JIRA_AND_CI_KEYS = [
  'jiraProject',
  'epic',
  'jiraInProgressStatus',
  'jiraDoneStatus',
  'jiraBoard',
  'ciFixAttempts',
  'ciWatchMinutes',
  'requireApproval',
  'approvalWaitMinutes'
]

const BASE_ARGS = {
  workarea: 'shared/args-fixture',
  branch: 'main',
  lifecycle: 'full',
  scope: 'args-fixture',
  executor: 'claude',
  planOnly: false,
  repos: {
    frontend: {
      path: 'repos/trade-imports-animals-frontend',
      github: 'DEFRA/trade-imports-animals-frontend'
    },
    backend: {
      path: 'repos/trade-imports-animals-backend',
      github: 'DEFRA/trade-imports-animals-backend'
    },
    tests: {
      path: 'repos/trade-imports-animals-tests',
      github: 'DEFRA/trade-imports-animals-tests'
    }
  },
  models: { light: 'sonnet' },
  increments: ['inc-900'],
  stopAfter: 1,
  jiraProject: 'EUDPA',
  epic: 'EUDPA-1',
  jiraInProgressStatus: 'In Progress',
  jiraDoneStatus: 'Done',
  jiraBoard: 13780,
  ciFixAttempts: 3,
  ciWatchMinutes: 30,
  requireApproval: true,
  approvalWaitMinutes: 20
}

const WORKSPACE_ANSWER = {
  ok: true,
  abs: '/ws',
  tilde: '~/ws',
  canonical: true,
  summary: 'resolved'
}

const withoutKeys = (object, keys) =>
  Object.fromEntries(
    Object.entries(object).filter(([entryKey]) => !keys.includes(entryKey))
  )

const withoutKey = (object, key) => withoutKeys(object, [key])

describe('every workflow script', () => {
  test('finds at least the build loop, the distil workflow and the canary', () => {
    const names = workflowScripts().map((script) => script.name)

    expect(names).toEqual(
      expect.arrayContaining([
        'increment-build-loop.js',
        'distil.js',
        'args-canary.js'
      ])
    )
  })

  test('carries the args-contract block exactly once', () => {
    for (const script of workflowScripts()) {
      expect(countOccurrences(script.source, '// >>> args-contract')).toBe(1)
      expect(countOccurrences(script.source, '// <<< args-contract')).toBe(1)
      expect(script.source.indexOf('// >>> args-contract')).toBeLessThan(
        script.source.indexOf('// <<< args-contract')
      )
    }
  })

  test('carries a byte-identical copy of the args-contract block', () => {
    const blocks = new Set(
      workflowScripts().map((script) => extractArgsContractBlock(script.source))
    )

    expect(blocks.size).toBe(1)
  })

  test('has no FALLBACK', () => {
    const withFallback = workflowScripts()
      .filter((script) => /\bFALLBACK\b/.test(script.source))
      .map((script) => script.name)

    expect(withFallback).toEqual([])
  })

  test('defaults no configuration key', () => {
    const withDefault = workflowScripts()
      .filter((script) => {
        const identifier = parseArgsResultIdentifier(script.source)
        if (!identifier) return false
        const defaultPattern = new RegExp(
          `\\b${identifier}\\.[A-Za-z]+\\s*\\?\\?`
        )
        return defaultPattern.test(script.source)
      })
      .map((script) => script.name)

    expect(withDefault).toEqual([])
  })

  test('stops before any agent and names its required keys when args is empty', async () => {
    for (const script of workflowScripts()) {
      const run = await runWorkflowScript(script.path, { args: {} })

      expect(run.status).toBe('threw')
      expect(run.error.message).toMatch(MISSING_KEYS_MESSAGE_PATTERN)
      expect(run.agents).toEqual([])
      expect(run.logs).toEqual([])
    }
  })

  test('stops before any agent when no args are given', async () => {
    for (const script of workflowScripts()) {
      const run = await runWorkflowScript(script.path, { args: undefined })

      expect(run.status).toBe('threw')
      expect(run.agents).toEqual([])
      expect(run.logs).toEqual([])
      expect(run.error.message).toMatch(MISSING_KEYS_MESSAGE_PATTERN)

      const expectedKeys = REQUIRED_KEYS_BY_SCRIPT[script.name]
      if (expectedKeys) {
        expect(run.error.message).toContain(`keys ${expectedKeys.join(', ')}`)
      }
    }
  })

  test('stops before any agent when args is a string that is not JSON', async () => {
    for (const script of workflowScripts()) {
      const run = await runWorkflowScript(script.path, { args: 'not json' })

      expect(run.error.message).toMatch(
        /: args arrived as a string that is not JSON \(/
      )
      expect(run.agents).toEqual([])
    }
  })
})

describe('args-canary', () => {
  const scriptPath = join(workflowsDir, 'args-canary.js')

  test('runs with the values of object args', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { list: ['a'], n: 1 }
    })

    expect(run.result).toEqual({
      argsType: 'object',
      resolved: { list: ['a'], n: 1 }
    })
  })

  test('runs with the values of a JSON-string args', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: JSON.stringify({ list: ['a'], n: 1 })
    })

    expect(run.result).toEqual({
      argsType: 'string',
      resolved: { list: ['a'], n: 1 }
    })
  })

  test('logs the resolved configuration first', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { list: ['a'], n: 1 }
    })

    expect(run.logs).toEqual([
      'args-canary: resolved configuration {"list":["a"],"n":1}'
    ])
  })

  test('names the one missing key', async () => {
    const run = await runWorkflowScript(scriptPath, { args: { list: ['a'] } })

    expect(run.error.message).toBe(
      'args-canary: args is missing required key n. Pass every one in args: this workflow has no defaults'
    )
  })

  test('names every missing key when args is null', async () => {
    const run = await runWorkflowScript(scriptPath, { args: null })

    expect(run.error.message).toContain('keys list, n')
  })

  test('keeps an explicit null as a given value', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { list: ['a'], n: null }
    })

    expect(run.status).toBe('returned')
    expect(run.result.resolved.n).toBeNull()
  })
})

describe('increment-build-loop', () => {
  const scriptPath = join(buildLoopDir, 'increment-build-loop.js')

  const runJsonStringArgs = () =>
    runWorkflowScript(scriptPath, {
      args: JSON.stringify(BASE_ARGS),
      answers: [WORKSPACE_ANSWER, null]
    })

  test('resolves a JSON-string args to the same configuration as object args', async () => {
    const run = await runJsonStringArgs()

    expect(run.logs[0]).toBe(
      `increment-build-loop: resolved configuration ${JSON.stringify(BASE_ARGS)}`
    )
  })

  test('selects the light model for the workspace-resolution agent', async () => {
    const run = await runJsonStringArgs()

    expect(run.agents[0].options.model).toBe('sonnet')
  })

  test('labels the preflight agent', async () => {
    const run = await runJsonStringArgs()

    expect(run.agents[1].options.label).toBe('preflight')
  })

  test('includes the backlog path in the preflight prompt', async () => {
    const run = await runJsonStringArgs()

    expect(run.agents[1].prompt).toContain(
      '~/ws/workareas/shared/args-fixture/backlog.json'
    )
  })

  test('surfaces the missing-backlog error', async () => {
    const run = await runJsonStringArgs()

    expect(run.error.message).toContain(
      'no readable backlog at /ws/workareas/shared/args-fixture/backlog.json'
    )
  })

  test('resolves object args to the same configuration as the string', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: BASE_ARGS,
      answers: [WORKSPACE_ANSWER, null]
    })

    expect(run.logs[0]).toBe(
      `increment-build-loop: resolved configuration ${JSON.stringify(BASE_ARGS)}`
    )
  })

  test('stops before any agent when increments is missing, the reproduced failure', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: JSON.stringify(withoutKey(BASE_ARGS, 'increments'))
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key increments. Pass every one in args: this workflow has no defaults'
    )
    expect(run.agents).toEqual([])
  })

  test('names every Jira and CI key the loop needs', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: withoutKeys(BASE_ARGS, JIRA_AND_CI_KEYS)
    })

    expect(run.error.message).toContain(
      'keys jiraProject, epic, jiraInProgressStatus, jiraDoneStatus, jiraBoard, ciFixAttempts, ciWatchMinutes, requireApproval, approvalWaitMinutes'
    )
    expect(run.agents).toEqual([])
  })

  test('refuses an empty increments list after logging the configuration', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...BASE_ARGS, increments: [] }
    })

    expect(run.error.message).toContain(
      'config.increments must be null to drain the backlog, or a non-empty list of increment ids'
    )
    expect(run.logs.length).toBe(1)
    expect(run.agents).toEqual([])
  })

  test('stops before any agent when stopAfter is missing', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: withoutKey(BASE_ARGS, 'stopAfter')
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key stopAfter. Pass every one in args: this workflow has no defaults'
    )
    expect(run.agents).toEqual([])
  })

  test('refuses a stopAfter that would never stop the run', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...BASE_ARGS, stopAfter: 0 }
    })

    expect(run.error.message).toBe(
      'increment-build-loop: config.stopAfter must be a positive integer or "all" — it counts increments that LANDED. Got 0'
    )
    expect(run.agents).toEqual([])
  })

  test('accepts stopAfter "all" and carries on to the backlog', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...BASE_ARGS, stopAfter: 'all' },
      answers: [WORKSPACE_ANSWER, null]
    })

    expect(run.error.message).toContain('no readable backlog')
  })

  test('refuses planOnly without an explicit increments list', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...BASE_ARGS, planOnly: true, increments: null }
    })

    expect(run.error.message).toContain(
      'config.planOnly needs an explicit config.increments list'
    )
    expect(run.agents).toEqual([])
  })

  test('refuses a models value that is not an object', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...BASE_ARGS, models: null }
    })

    expect(run.error.message).toContain('config.models must be an object')
    expect(run.agents).toEqual([])
  })

  describe('the models config', () => {
    const runPlanOnlyWithModels = (models) =>
      runWorkflowScript(scriptPath, {
        args: { ...BASE_ARGS, planOnly: true, models },
        answers: [
          WORKSPACE_ANSWER,
          { ok: true, summary: '1' },
          {
            ok: true,
            summary: 'Planned.',
            repos: ['frontend'],
            behaviourChanges: [],
            decisions: []
          }
        ]
      })

    const modelOf = (run, label) =>
      run.agents.find((entry) => entry.options.label === label).options.model

    test('resolves the built-in default for every tier when models is empty', async () => {
      const run = await runPlanOnlyWithModels({})

      expect(modelOf(run, 'workspace')).toBe('haiku')
      expect(modelOf(run, 'inc-900 plan')).toBe('opus')
    })

    test('lets a tier be overridden explicitly', async () => {
      const run = await runPlanOnlyWithModels({ think: 'sonnet' })

      expect(modelOf(run, 'inc-900 plan')).toBe('sonnet')
      expect(modelOf(run, 'workspace')).toBe('haiku')
    })

    test('accepts "inherit" and leaves the session model in place', async () => {
      const run = await runPlanOnlyWithModels({ light: 'inherit' })

      expect(modelOf(run, 'workspace')).toBeUndefined()
    })

    test('refuses a model value that is not a known alias or "inherit", naming the tier', async () => {
      const run = await runPlanOnlyWithModels({ light: 'gpt-5' })

      expect(run.error.message).toContain(
        'config.models.light must be one of opus, sonnet, haiku, or "inherit"'
      )
      expect(run.error.message).toContain('"gpt-5"')
      expect(run.agents).toEqual([])
    })

    test('refuses a tier name it does not know', async () => {
      const run = await runPlanOnlyWithModels({ heavyweight: 'opus' })

      expect(run.error.message).toContain(
        'config.models has no tier named heavyweight'
      )
      expect(run.agents).toEqual([])
    })

    test('the deprecated heavy alias sets the think tier', async () => {
      const run = await runPlanOnlyWithModels({ heavy: 'opus' })

      expect(modelOf(run, 'inc-900 plan')).toBe('opus')
    })

    test('an explicit think value wins over the heavy alias', async () => {
      const run = await runPlanOnlyWithModels({
        heavy: 'opus',
        think: 'sonnet'
      })

      expect(modelOf(run, 'inc-900 plan')).toBe('sonnet')
    })
  })

  test('refuses a scope it would once have derived', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: withoutKey(BASE_ARGS, 'scope')
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key scope. Pass every one in args: this workflow has no defaults'
    )
  })

  test('refuses a planOnly that is not a boolean', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...BASE_ARGS, planOnly: 'yes' }
    })

    expect(run.error.message).toBe(
      'increment-build-loop: config.planOnly must be a boolean — got "yes"'
    )
    expect(run.agents).toEqual([])
  })

  const runPlanOnly = () =>
    runWorkflowScript(scriptPath, {
      args: { ...BASE_ARGS, planOnly: true },
      answers: [
        WORKSPACE_ANSWER,
        { ok: true, summary: '1' },
        {
          ok: true,
          summary: 'Planned across three repos.',
          repos: ['backend', 'tests', 'frontend'],
          behaviourChanges: ['The list shows only your own notifications.'],
          decisions: ['Filter in the backend query, not the frontend.']
        }
      ]
    })

  test('plans the increment and stops when planOnly is true', async () => {
    const run = await runPlanOnly()

    expect(run.result).toEqual({
      increments: [
        {
          id: 'inc-900',
          outcome: 'planned',
          plan: '/ws/workareas/shared/args-fixture/plans/inc-900.md',
          detail: 'Planned across three repos.',
          repos: ['backend', 'tests', 'frontend'],
          behaviourChanges: ['The list shows only your own notifications.'],
          decisions: ['Filter in the backend query, not the frontend.']
        }
      ],
      stopped: {
        reason: 'no-buildable',
        detail: 'the increments list is built out'
      }
    })
  })

  test('runs no stage after the planner when planOnly is true', async () => {
    const run = await runPlanOnly()

    expect(run.agents.map((entry) => entry.options.label)).toEqual([
      'workspace',
      'preflight',
      'inc-900 plan'
    ])
  })

  test('tells the planner where to write the plan', async () => {
    const run = await runPlanOnly()

    expect(run.agents[2].prompt).toContain(
      'WRITE /ws/workareas/shared/args-fixture/plans/inc-900.md'
    )
  })

  test('refuses an executor it would once have defaulted', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: withoutKey(BASE_ARGS, 'executor')
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key executor. Pass every one in args: this workflow has no defaults'
    )
  })

  describe('the build stages', () => {
    const PREFLIGHT_ANSWER = { ok: true, summary: '1' }
    const WORK_BRANCH = 'feat/EUDPA-900-fixture'
    const TICKET_ANSWER = {
      ok: true,
      key: 'EUDPA-900',
      created: false,
      movedToBoard: true,
      branch: WORK_BRANCH,
      repos: ['backend', 'tests', 'frontend'],
      resumeAt: 'build',
      status: 'In Progress',
      summary: 'reused'
    }
    const BRANCHED_ANSWER = { ok: true, summary: 'branched' }

    const runFrom = (...answers) =>
      runWorkflowScript(scriptPath, {
        args: BASE_ARGS,
        answers: [
          WORKSPACE_ANSWER,
          PREFLIGHT_ANSWER,
          TICKET_ANSWER,
          BRANCHED_ANSWER,
          ...answers
        ]
      })

    const runFromWithArgs = (argsOverride, ...answers) =>
      runWorkflowScript(scriptPath, {
        args: { ...BASE_ARGS, ...argsOverride },
        answers: [
          WORKSPACE_ANSWER,
          PREFLIGHT_ANSWER,
          TICKET_ANSWER,
          BRANCHED_ANSWER,
          ...answers
        ]
      })

    const baselinePrompt = async () => {
      const run = await runFrom(null)
      return run.agents.find(
        (entry) => entry.options.label === 'inc-900 baseline'
      ).prompt
    }

    test('raises the ticket and cuts the branch before the baseline', async () => {
      const run = await runFrom(null)

      expect(run.agents.map((entry) => entry.options.label)).toEqual([
        'workspace',
        'preflight',
        'inc-900 ticket',
        'inc-900 branch',
        'inc-900 baseline'
      ])
    })

    test('tells the baseline to refuse a repo on the base branch', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain(
        'if ANY repo is on `main`, stop and report ok:false naming it'
      )
    })

    test('leaves branching to the branch stage, not the baseline', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).not.toContain('tim build branch')
    })

    test('tells the baseline to run every gate phase with tim build gate, into its own logs', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain(
        [
          '   1. `tim build gate shared/args-fixture --phase unit --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-baseline`',
          '   2. `tim build gate shared/args-fixture --phase fit --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-baseline`',
          '   3. `tim build gate shared/args-fixture --phase e2e --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-baseline`'
        ].join('\n')
      )
    })

    test('tells the baseline it chooses no test script', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain(
        'You choose no test, script or suite: `tim build gate` does that.'
      )
    })

    test('tells the baseline to leave the workspace stack to the gate', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain(
        'Never start or stop the workspace stack, and never drive `docker` yourself.'
      )
      expect(prompt).not.toContain('tim docker down')
    })

    describe('building an increment', () => {
      const BASELINE_ANSWER = {
        ok: true,
        green: true,
        rungs: [
          {
            repo: 'trade-imports-animals-frontend',
            name: 'unit',
            phase: 'unit',
            ok: true,
            log: '/ws/workareas/shared/args-fixture/logs/inc-900-baseline/gate-trade-imports-animals-frontend-unit.log'
          }
        ],
        summary: 'green'
      }
      const PLAN_ANSWER = {
        ok: true,
        summary: 'Planned in the frontend.',
        repos: ['frontend'],
        behaviourChanges: [],
        decisions: []
      }
      const NO_FINDINGS = { findings: [] }
      const FINDING = {
        file: 'frontend:src/a.js',
        severity: 'major',
        what: 'The origin is not saved.',
        why: 'The handler drops it.',
        fix: 'Save it.'
      }

      const implementAnswer = (changedFiles) => ({
        ok: true,
        summary: 'Built the origin page.',
        changedFiles,
        notes: 'E2E left to the ladder.'
      })

      const frontendFiles = (count, extension) =>
        Array.from(
          { length: count },
          (_, index) => `frontend:src/file-${index}.${extension}`
        )

      const runToReview = (changedFiles) =>
        runFrom(BASELINE_ANSWER, PLAN_ANSWER, implementAnswer(changedFiles))

      const modelOf = (run, label) =>
        run.agents.find((entry) => entry.options.label === label).options.model

      test('runs the planner on the think tier and the implementor on the code tier', async () => {
        const run = await runToReview(['frontend:src/a.js'])

        expect(modelOf(run, 'inc-900 plan')).toBe('opus')
        expect(modelOf(run, 'inc-900 implement')).toBe('sonnet')
      })

      test('the deprecated heavy alias sets both the think and code tiers', async () => {
        const run = await runFromWithArgs(
          { models: { heavy: 'opus' } },
          BASELINE_ANSWER,
          PLAN_ANSWER,
          implementAnswer(['frontend:src/a.js'])
        )

        expect(modelOf(run, 'inc-900 plan')).toBe('opus')
        expect(modelOf(run, 'inc-900 implement')).toBe('opus')
      })

      test('an explicit tier wins over the deprecated heavy alias', async () => {
        const run = await runFromWithArgs(
          { models: { heavy: 'opus', code: 'sonnet' } },
          BASELINE_ANSWER,
          PLAN_ANSWER,
          implementAnswer(['frontend:src/a.js'])
        )

        expect(modelOf(run, 'inc-900 plan')).toBe('opus')
        expect(modelOf(run, 'inc-900 implement')).toBe('sonnet')
      })

      const labelsInPhase = (run, phaseName) =>
        run.agents
          .filter((entry) => entry.options.phase === phaseName)
          .map((entry) => entry.options.label)

      const runThroughFixToLadder = () =>
        runFrom(
          BASELINE_ANSWER,
          PLAN_ANSWER,
          implementAnswer(['frontend:src/a.js']),
          NO_FINDINGS,
          { findings: [FINDING] },
          NO_FINDINGS,
          { verdicts: [{ n: 1, real: true, reasoning: 'src/a.js:3' }] },
          {
            decisions: [
              { what: 'origin', call: 'fix-now', reasoning: 'in scope' }
            ],
            fixNow: ['Save the origin in src/a.js.'],
            summary: 'one fix'
          },
          {
            ok: true,
            summary: 'Saved the origin.',
            notes: 'FIT went green once the port-holding test server exited.'
          }
        )

      const ladderPrompt = (run) =>
        run.agents.find((entry) => entry.options.label === 'inc-900 ladder')
          .prompt

      test('reviews files in one repo and language with one style and one code reviewer', async () => {
        const run = await runToReview(frontendFiles(3, 'js'))

        expect(labelsInPhase(run, 'Review')).toEqual([
          'inc-900 style:frontend-javascript',
          'inc-900 review:frontend-javascript',
          'inc-900 consistency'
        ])
      })

      test('gives docs a code reviewer but no style reviewer', async () => {
        const run = await runToReview([
          'frontend:src/a.js',
          'frontend:README.md'
        ])

        expect(labelsInPhase(run, 'Review')).toEqual([
          'inc-900 style:frontend-javascript',
          'inc-900 review:frontend-javascript',
          'inc-900 review:frontend-docs',
          'inc-900 consistency'
        ])
      })

      test('splits a group of more than twelve files in two', async () => {
        const run = await runToReview(frontendFiles(13, 'js'))

        expect(labelsInPhase(run, 'Review')).toEqual([
          'inc-900 style:frontend-javascript-1',
          'inc-900 style:frontend-javascript-2',
          'inc-900 review:frontend-javascript-1',
          'inc-900 review:frontend-javascript-2',
          'inc-900 consistency'
        ])
      })

      test('verifies findings with one verifier per group', async () => {
        const run = await runThroughFixToLadder()

        expect(labelsInPhase(run, 'Verify findings')).toEqual([
          'inc-900 verify:frontend-javascript'
        ])
      })

      const promptOf = (run, label) =>
        run.agents.find((entry) => entry.options.label === label).prompt

      test('hands the ladder every baseline rung with its log', async () => {
        const prompt = ladderPrompt(await runThroughFixToLadder())

        expect(prompt).toContain(
          '   trade-imports-animals-frontend unit (unit): green — /ws/workareas/shared/args-fixture/logs/inc-900-baseline/gate-trade-imports-animals-frontend-unit.log'
        )
      })

      test('hands the fixer every baseline rung with its log', async () => {
        const prompt = promptOf(await runThroughFixToLadder(), 'inc-900 fix')

        expect(prompt).toContain(
          '   trade-imports-animals-frontend unit (unit): green — /ws/workareas/shared/args-fixture/logs/inc-900-baseline/gate-trade-imports-animals-frontend-unit.log'
        )
      })

      test('tells the ladder to run every gate phase with tim build gate, into its own logs', async () => {
        const prompt = ladderPrompt(await runThroughFixToLadder())

        expect(prompt).toContain(
          [
            '   1. `tim build gate shared/args-fixture --phase unit --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-ladder`',
            '   2. `tim build gate shared/args-fixture --phase fit --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-ladder`',
            '   3. `tim build gate shared/args-fixture --phase e2e --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-ladder`'
          ].join('\n')
        )
      })

      test('tells the ladder a rung green at baseline and red now is the increment’s to fix', async () => {
        const prompt = ladderPrompt(await runThroughFixToLadder())

        expect(prompt).toContain(
          "A rung green at baseline and red now is this\n   increment's to fix"
        )
      })

      test('tells the implementor and fixer to check themselves with the gate’s unit and FIT phases only', async () => {
        const run = await runThroughFixToLadder()

        expect(promptOf(run, 'inc-900 implement')).toContain(
          '`tim build gate shared/args-fixture --phase unit --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-implement`'
        )
        expect(promptOf(run, 'inc-900 fix')).toContain(
          '`tim build gate shared/args-fixture --phase fit --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-fix`'
        )
        expect(promptOf(run, 'inc-900 implement')).not.toContain('--phase e2e')
      })

      test('tells no agent to stop the workspace stack before a unit or FIT suite', async () => {
        const run = await runThroughFixToLadder()
        const stopsTheStack = run.agents
          .filter(({ prompt }) =>
            /tim docker down|stack must be DOWN/.test(prompt)
          )
          .map(({ options }) => options.label)

        expect(stopsTheStack).toEqual([])
      })

      test('stops at a baseline whose gate is red', async () => {
        const run = await runFrom({
          ...BASELINE_ANSWER,
          green: false,
          summary: 'lint red'
        })

        expect(run.result.increments[0]).toMatchObject({
          outcome: 'baseline-red',
          detail: 'lint red'
        })
      })

      test("hands the fixer's notes to the ladder", async () => {
        const prompt = ladderPrompt(await runThroughFixToLadder())

        expect(prompt).toContain(
          'notes: FIT went green once the port-holding test server exited.'
        )
      })

      test("hands the implementor's notes to the ladder", async () => {
        const prompt = ladderPrompt(await runThroughFixToLadder())

        expect(prompt).toContain('notes: E2E left to the ladder.')
      })

      test('tells the ladder no fix stage ran when the judge ruled nothing', async () => {
        const run = await runFrom(
          BASELINE_ANSWER,
          PLAN_ANSWER,
          implementAnswer(['frontend:src/a.js'])
        )

        expect(ladderPrompt(run)).toContain(
          'FIXER — no fix stage ran: the judge ruled nothing fix-now'
        )
      })

      test('leaves the workspace stack to the gate in the ladder', async () => {
        const prompt = ladderPrompt(await runThroughFixToLadder())

        expect(prompt).toContain(
          'For E2E it starts the workspace stack only if it was down and\nstops only what it started.'
        )
      })

      const GREEN_LADDER = {
        green: true,
        ran: ['frontend unit'],
        summary: 'green'
      }
      const ON_BRANCH = {
        ok: true,
        summary: `every repo on ${WORK_BRANCH}`
      }
      const PRESERVED = {
        ok: true,
        summary: `wip commit pushed to ${WORK_BRANCH}`
      }

      const runToLand = (guardAnswer, landAnswer) =>
        runFrom(
          BASELINE_ANSWER,
          PLAN_ANSWER,
          implementAnswer(['frontend:src/a.js']),
          NO_FINDINGS,
          NO_FINDINGS,
          NO_FINDINGS,
          GREEN_LADDER,
          guardAnswer,
          landAnswer,
          PRESERVED
        )

      const runToFailedLand = () =>
        runToLand(ON_BRANCH, {
          landed: false,
          summary: 'backend is on main'
        })

      const labels = (run) => run.agents.map((entry) => entry.options.label)

      test('checks every repo is on the branch before land', async () => {
        const run = await runToFailedLand()

        expect(labels(run).indexOf('inc-900 branch-guard:land')).toBe(
          labels(run).indexOf('inc-900 land') - 1
        )
      })

      test('tells the branch guard which branch every repo must be on', async () => {
        const run = await runToFailedLand()
        const guardPrompt = run.agents.find(
          (entry) => entry.options.label === 'inc-900 branch-guard:land'
        ).prompt

        expect(guardPrompt).toContain(
          `Every repo this increment works\nin must be on \`${WORK_BRANCH}\``
        )
      })

      test('preserves the attempt when land fails', async () => {
        const run = await runToFailedLand()

        expect(labels(run).slice(-2)).toEqual([
          'inc-900 land',
          'inc-900 preserve'
        ])
      })

      test('records a failed land with what the preserve stage kept', async () => {
        const run = await runToFailedLand()

        expect(run.result.increments[0]).toMatchObject({
          outcome: 'land-failed',
          detail: 'backend is on main',
          preserved: `wip commit pushed to ${WORK_BRANCH}`
        })
      })

      test('preserves the attempt instead of landing when a repo is off the branch', async () => {
        const run = await runToLand(
          { ok: false, summary: 'backend is on another commit' },
          PRESERVED
        )

        expect(run.result.increments[0]).toMatchObject({
          outcome: 'off-branch',
          preserved: `wip commit pushed to ${WORK_BRANCH}`
        })
        expect(labels(run)).not.toContain('inc-900 land')
      })

      describe('deriving its own next increment', () => {
        // One increment's worth of answers, from the ticket through to the gate
        // check, every stage green: what it takes for the loop to count one as
        // landed and go round again.
        const LANDED = [
          TICKET_ANSWER,
          BRANCHED_ANSWER,
          BASELINE_ANSWER,
          PLAN_ANSWER,
          implementAnswer(['frontend:src/a.js']),
          NO_FINDINGS,
          NO_FINDINGS,
          NO_FINDINGS,
          GREEN_LADDER,
          ON_BRANCH,
          { landed: true, commit: 'abc1234', summary: 'committed' },
          {
            ok: true,
            prs: [
              {
                repo: 'frontend',
                url: 'https://github.com/DEFRA/x/pull/9',
                number: 9
              }
            ],
            summary: 'one PR'
          },
          { green: true, summary: 'every check green' },
          {
            green: true,
            merged: [{ repo: 'frontend', sha: 'def5678' }],
            summary: 'merged'
          },
          { ok: true, summary: 'ticket moved to Done' },
          { ok: true, summary: 'no gate' }
        ]

        const derived = (id) => ({ ok: true, next: id, summary: id })

        const runDraining = (stopAfter, ...answers) =>
          runWorkflowScript(scriptPath, {
            args: { ...BASE_ARGS, increments: null, stopAfter },
            answers: [WORKSPACE_ANSWER, PREFLIGHT_ANSWER, ...answers]
          })

        test('asks tim for the next increment and builds the id it names', async () => {
          const run = await runDraining(
            1,
            derived('inc-901'),
            TICKET_ANSWER,
            BRANCHED_ANSWER,
            null
          )

          expect(labels(run)).toEqual([
            'workspace',
            'preflight',
            'derive next',
            'inc-901 ticket',
            'inc-901 branch',
            'inc-901 baseline'
          ])
        })

        test('tells the derive agent to read result.next from the envelope', async () => {
          const run = await runDraining(1, derived('inc-901'), null)
          const prompt = run.agents.find(
            (entry) => entry.options.label === 'derive next'
          ).prompt

          expect(prompt).toContain(
            '`tim backlog next shared/args-fixture --workspace ~/ws --json`'
          )
          expect(prompt).toContain('Read `result.next` and nothing else')
        })

        test('stops with no-buildable when tim returns no next increment', async () => {
          const run = await runDraining(1, {
            ok: true,
            summary: 'result.next was null'
          })

          expect(run.result).toEqual({
            increments: [],
            stopped: {
              reason: 'no-buildable',
              detail: 'result.next was null'
            }
          })
        })

        test('stops with derive-failed rather than calling a broken query a finished backlog', async () => {
          const run = await runDraining(1, {
            ok: false,
            summary: 'tim backlog next exited 2: no such workarea'
          })

          expect(run.result.stopped).toEqual({
            reason: 'derive-failed',
            detail: 'tim backlog next exited 2: no such workarea'
          })
        })

        test('stops with count-reached once stopAfter increments have landed', async () => {
          const run = await runDraining(1, derived('inc-901'), ...LANDED)

          expect(run.result.increments).toEqual([
            expect.objectContaining({ id: 'inc-901', outcome: 'landed' })
          ])
          expect(run.result.stopped).toEqual({
            reason: 'count-reached',
            detail: '1 increment(s) landed, which is what stopAfter asked for'
          })
        })

        test('derives again after one lands and builds the next id', async () => {
          const run = await runDraining(
            2,
            derived('inc-901'),
            ...LANDED,
            derived('inc-902'),
            null
          )

          expect(labels(run).slice(-2)).toEqual([
            'derive next',
            'inc-902 ticket'
          ])
        })

        test('stops with not-landed when the same id comes back twice', async () => {
          const run = await runDraining(
            2,
            derived('inc-901'),
            ...LANDED,
            derived('inc-901')
          )

          expect(run.result.stopped.reason).toBe('not-landed')
          expect(run.result.stopped.detail).toContain(
            'inc-901 came back a second time'
          )
        })

        // The Workflow tool caps a run at 1000 agents. At 36 an increment on
        // Claude, plus the two startup agents, the twenty-eighth does not fit —
        // so the run stops before starting it rather than dying inside it.
        test('stops before the increment that would exhaust the agent budget', async () => {
          const run = await runDraining(
            'all',
            ...Array.from({ length: 30 }, (_, index) => index).flatMap(
              (index) => [derived(`inc-9${index}`), ...LANDED]
            )
          )

          expect(run.result.increments.length).toBe(27)
          expect(run.result.stopped.reason).toBe('agent-budget')
          expect(run.result.stopped.detail).toContain('27 increment(s) landed')
        })
      })

      describe('an explicit increments list', () => {
        const runListed = (...answers) =>
          runWorkflowScript(scriptPath, {
            args: {
              ...BASE_ARGS,
              increments: ['inc-900', 'inc-901'],
              stopAfter: 'all'
            },
            answers: [
              WORKSPACE_ANSWER,
              PREFLIGHT_ANSWER,
              TICKET_ANSWER,
              BRANCHED_ANSWER,
              ...answers
            ]
          })

        test('derives nothing and builds the ids it was given, in order', async () => {
          const run = await runListed({
            ...BASELINE_ANSWER,
            green: false,
            summary: 'lint red'
          })

          expect(labels(run)).toEqual([
            'workspace',
            'preflight',
            'inc-900 ticket',
            'inc-900 branch',
            'inc-900 baseline'
          ])
        })

        test('stops the whole run at a red baseline instead of trying the next id', async () => {
          const run = await runListed({
            ...BASELINE_ANSWER,
            green: false,
            summary: 'lint red'
          })

          expect(run.result.stopped).toEqual({
            reason: 'baseline-red',
            detail: 'inc-900: lint red'
          })
          expect(labels(run)).not.toContain('inc-901 ticket')
        })
      })

      describe('with the codex executor', () => {
        const CODEX_RAN = { ok: true, summary: 'codex ran in one slice' }

        const runCodexToReview = () =>
          runWorkflowScript(scriptPath, {
            args: { ...BASE_ARGS, executor: 'codex' },
            answers: [
              WORKSPACE_ANSWER,
              PREFLIGHT_ANSWER,
              TICKET_ANSWER,
              BRANCHED_ANSWER,
              BASELINE_ANSWER,
              PLAN_ANSWER,
              CODEX_RAN,
              implementAnswer(['frontend:src/a.js', 'backend:src/B.java']),
              ON_BRANCH,
              CODEX_RAN,
              CODEX_RAN,
              CODEX_RAN,
              NO_FINDINGS,
              NO_FINDINGS,
              NO_FINDINGS,
              ON_BRANCH
            ]
          })

        const codexShellPrompt = (run, slug) =>
          run.agents.find(
            (entry) => entry.options.label === `inc-900 codex:${slug}`
          ).prompt

        test('runs one codex review per group and one for consistency', async () => {
          const run = await runCodexToReview()

          expect(
            labelsInPhase(run, 'Review').filter((label) =>
              label.startsWith('inc-900 codex:')
            )
          ).toEqual([
            'inc-900 codex:review-frontend-javascript',
            'inc-900 codex:review-backend-java',
            'inc-900 codex:review-consistency'
          ])
        })

        test('relays every codex review through the findings schema', async () => {
          const run = await runCodexToReview()

          expect(
            labelsInPhase(run, 'Review').filter((label) =>
              label.startsWith('inc-900 relay:')
            )
          ).toEqual([
            'inc-900 relay:review-frontend-javascript',
            'inc-900 relay:review-backend-java',
            'inc-900 relay:review-consistency'
          ])
        })

        test("binds a group's files and its style and code personas", async () => {
          const prompt = codexShellPrompt(
            await runCodexToReview(),
            'review-frontend-javascript'
          )

          expect(prompt).toContain(
            '<personas> = /ws/.claude/skills/code-style/references/STYLE_FILE_REVIEWER.md, /ws/.claude/skills/review/references/FILE_REVIEWER.md'
          )
          expect(prompt).toContain('<reviewFiles> = frontend:src/a.js')
        })

        test('binds the consistency persona to the consistency review', async () => {
          const prompt = codexShellPrompt(
            await runCodexToReview(),
            'review-consistency'
          )

          expect(prompt).toContain(
            '<personas> = /ws/.claude/skills/review/references/CONSISTENCY_REVIEWER.md'
          )
        })

        test('checks the branch after the implement and review stages', async () => {
          const run = await runCodexToReview()

          expect(
            labels(run).filter((label) => label.includes('branch-guard'))
          ).toEqual([
            'inc-900 branch-guard:implement',
            'inc-900 branch-guard:review'
          ])
        })
      })
    })
  })

  test('refuses a lifecycle it does not know', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...BASE_ARGS, lifecycle: 'trunk' }
    })

    expect(run.error.message).toContain(
      'config.lifecycle must be "full" (ticket, own branch, PR, merge, ticket done) or "branch"'
    )
    expect(run.agents).toEqual([])
  })

  describe('under the branch lifecycle', () => {
    const WORKING_BRANCH = 'feat/NO_JIRA-frontend-alignment'
    const repo = (name) => ({
      path: `repos/trade-imports-${name}`,
      github: `DEFRA/trade-imports-${name}`
    })
    const BRANCH_ARGS = {
      ...BASE_ARGS,
      branch: WORKING_BRANCH,
      lifecycle: 'branch',
      repos: {
        ins: repo('ins-frontend'),
        animals: repo('animals-frontend'),
        plants: repo('plants-frontend'),
        tests: repo('animals-tests')
      },
      jiraProject: null,
      epic: null,
      jiraInProgressStatus: null,
      jiraDoneStatus: null,
      jiraBoard: null,
      requireApproval: null,
      approvalWaitMinutes: null
    }

    const runBranch = (overrides, ...answers) =>
      runWorkflowScript(scriptPath, {
        args: { ...BRANCH_ARGS, ...overrides },
        answers: [WORKSPACE_ANSWER, { ok: true, summary: '1' }, ...answers]
      })

    const labelsOf = (run) => run.agents.map((entry) => entry.options.label)
    const promptOf = (run, label) =>
      run.agents.find((entry) => entry.options.label === label).prompt

    describe('its configuration', () => {
      test('takes null for every Jira and approval key, and whatever repo keys the envelope names', async () => {
        const run = await runWorkflowScript(scriptPath, {
          args: BRANCH_ARGS,
          answers: [WORKSPACE_ANSWER, null]
        })

        expect(run.error.message).toContain('no readable backlog')
      })

      test('refuses a Jira or approval key that is given a value, naming it', async () => {
        const run = await runWorkflowScript(scriptPath, {
          args: { ...BRANCH_ARGS, epic: 'EUDPA-1', requireApproval: false }
        })

        expect(run.error.message).toBe(
          'increment-build-loop: lifecycle "branch" makes no Jira call and merges nothing, so epic, requireApproval must be null — got epic="EUDPA-1", requireApproval=false'
        )
        expect(run.agents).toEqual([])
      })

      test('still needs the Jira and approval keys passed, as null', async () => {
        const run = await runWorkflowScript(scriptPath, {
          args: withoutKey(BRANCH_ARGS, 'jiraBoard')
        })

        expect(run.error.message).toBe(
          'increment-build-loop: args is missing required key jiraBoard. Pass every one in args: this workflow has no defaults'
        )
      })

      test.each(['main', 'master'])(
        'refuses to build onto %s',
        async (branch) => {
          const run = await runWorkflowScript(scriptPath, {
            args: { ...BRANCH_ARGS, branch }
          })

          expect(run.error.message).toContain(
            'lifecycle "branch" commits and pushes straight onto config.branch, so it refuses main and master'
          )
          expect(run.agents).toEqual([])
        }
      )

      test('refuses a repo key that names the workspace itself', async () => {
        const run = await runWorkflowScript(scriptPath, {
          args: {
            ...BRANCH_ARGS,
            repos: { ...BRANCH_ARGS.repos, workspace: repo('workspace') }
          }
        })

        expect(run.error.message).toContain(
          'Each key is a lower-case word other than "workspace"'
        )
      })
    })

    describe('building a row', () => {
      const ROW = {
        ok: true,
        repos: ['tests'],
        merge: [],
        heads: [{ repo: 'tests', head: 'abc1234' }],
        resumeAt: 'build',
        summary: 'every repo on the branch'
      }
      const MERGE_ROW = {
        ...ROW,
        merge: [{ repo: 'tests', ref: 'origin/main' }],
        gatePhases: ['unit', 'fit']
      }
      const BASELINE = { ok: true, green: true, rungs: [], summary: 'green' }
      const PLAN = {
        ok: true,
        summary: 'Resolve the one conflict.',
        repos: ['tests'],
        behaviourChanges: [],
        decisions: []
      }
      const MERGE_STARTED = {
        ok: true,
        merges: [
          {
            repo: 'tests',
            ref: 'origin/main',
            mergeHead: 'def5678',
            alreadyMerged: false,
            conflicted: ['src/auth.spec.ts']
          }
        ],
        summary: 'started'
      }
      const IMPLEMENTED = {
        ok: true,
        summary: 'Resolved it.',
        changedFiles: ['tests:src/auth.spec.ts']
      }
      const NO_FINDINGS = { findings: [] }
      const GREEN_LADDER = {
        green: true,
        ran: ['tests lint'],
        summary: 'green'
      }
      const ON_BRANCH = { ok: true, summary: 'on the branch' }
      const LANDED = {
        landed: true,
        pushed: true,
        commit: 'aaa1111',
        summary: 'merge committed and pushed'
      }
      const FOUND = {
        ok: true,
        prs: [
          {
            repo: 'tests',
            url: 'https://github.com/DEFRA/trade-imports-animals-tests/pull/227',
            number: 227
          }
        ],
        missing: [],
        summary: 'one open PR'
      }
      const CI_GREEN = { green: true, summary: 'every check green' }
      const MARKED_DONE = { ok: true, summary: 'done' }
      const NO_GATE = { ok: true, summary: 'no gate' }

      const reviewedAndLanded = [
        IMPLEMENTED,
        NO_FINDINGS,
        NO_FINDINGS,
        NO_FINDINGS,
        GREEN_LADDER,
        ON_BRANCH,
        LANDED
      ]

      const runMergeRow = (...after) =>
        runBranch(
          {},
          MERGE_ROW,
          BASELINE,
          PLAN,
          MERGE_STARTED,
          ...reviewedAndLanded,
          ...after
        )

      test('raises no ticket, checks the branch, and merges nothing', async () => {
        const run = await runMergeRow(FOUND, CI_GREEN, MARKED_DONE, NO_GATE)

        expect(labelsOf(run)).toEqual([
          'workspace',
          'preflight',
          'inc-900 branch',
          'inc-900 baseline',
          'inc-900 plan',
          'inc-900 merge start',
          'inc-900 implement',
          'inc-900 style:tests-javascript',
          'inc-900 review:tests-javascript',
          'inc-900 consistency',
          'inc-900 ladder',
          'inc-900 branch-guard:land',
          'inc-900 land',
          'inc-900 pr',
          'inc-900 ci watch',
          'inc-900 done',
          'inc-900 gate check'
        ])
      })

      test('makes no Jira call in any stage', async () => {
        const run = await runMergeRow(FOUND, CI_GREEN, MARKED_DONE, NO_GATE)
        const jiraCallers = run.agents
          .filter(({ prompt }) =>
            /tools\/jira|move-to-board|transition-ticket/.test(prompt)
          )
          .map(({ options }) => options.label)

        expect(jiraCallers).toEqual([])
      })

      test('reports the row landed on the working branch with its commit and PR', async () => {
        const run = await runMergeRow(FOUND, CI_GREEN, MARKED_DONE, NO_GATE)

        expect(run.result.increments[0]).toMatchObject({
          id: 'inc-900',
          branch: WORKING_BRANCH,
          outcome: 'landed',
          commit: 'aaa1111',
          prs: [
            'https://github.com/DEFRA/trade-imports-animals-tests/pull/227'
          ],
          ci: 'green'
        })
      })

      test('asserts every configured repo is on the branch and fast-forwards it, creating nothing', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 branch')

        expect(prompt).toContain(
          `git -C ~/ws/<repoPath> merge --ff-only origin/${WORKING_BRANCH}`
        )
        expect(prompt).toContain(
          'For EACH of ins `~/ws/repos/trade-imports-ins-frontend`, animals `~/ws/repos/trade-imports-animals-frontend`, plants `~/ws/repos/trade-imports-plants-frontend`, tests `~/ws/repos/trade-imports-animals-tests`'
        )
        expect(prompt).not.toContain('checkout -b')
      })

      test('runs only the gate phases the row owes', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 baseline')

        expect(prompt).toContain('--phase fit')
        expect(prompt).not.toContain('--phase e2e')
      })

      test('starts the merge itself, without committing, before the implementor', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 merge start')

        expect(prompt).toContain(
          'git -C ~/ws/<repoPath> merge --no-ff --no-commit <ref>'
        )
        expect(prompt).toContain(
          '- tests (`~/ws/repos/trade-imports-animals-tests`): merge `origin/main`'
        )
      })

      test('tells the implementor and the reviewers a merge is in progress', async () => {
        const run = await runMergeRow(null)

        expect(promptOf(run, 'inc-900 implement')).toContain(
          'THE MERGE IS YOURS TO RESOLVE'
        )
        expect(promptOf(run, 'inc-900 review:tests-javascript')).toContain(
          'shows the merge result against the PRE-MERGE HEAD'
        )
      })

      test('tells the ladder the end-to-end proof is another row’s when the row leaves out e2e', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 ladder')

        expect(prompt).toContain(
          'gatePhases leave out e2e: its end-to-end proof belongs to another row, so do not fail it for want of one.'
        )
        expect(prompt).not.toContain('--phase e2e')
      })

      test('lands the merge as a two-parent commit and pushes it by a fully qualified refspec', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 land')

        expect(prompt).toContain(
          `git -C ~/ws/<repoPath> push origin refs/heads/${WORKING_BRANCH}:refs/heads/${WORKING_BRANCH}`
        )
        expect(prompt).toContain('rev-list --parents -n 1 HEAD')
        expect(prompt).toContain('Never `--squash`')
      })

      test('finds the open PR and never raises, edits or merges one', async () => {
        const run = await runMergeRow(FOUND, CI_GREEN, MARKED_DONE, NO_GATE)
        const prompt = promptOf(run, 'inc-900 pr')

        expect(prompt).toContain(
          `gh pr list --repo <ghRepo> --head ${WORKING_BRANCH} --state open`
        )
        const touchesAPr = run.agents
          .filter(({ prompt: text }) =>
            /gh pr (create|edit|ready|merge)/.test(text)
          )
          .map(({ options }) => options.label)
        expect(touchesAPr).toEqual([])
      })

      test('stops with no-open-pr when a repo has no open PR for the branch', async () => {
        const run = await runMergeRow({
          ok: false,
          prs: [],
          missing: ['tests'],
          summary: 'no open PR in tests'
        })

        expect(run.result.stopped.reason).toBe('no-open-pr')
        expect(run.result.stopped.detail).toContain(
          `no open pull request for ${WORKING_BRANCH} in tests`
        )
      })

      test('reads mergeability before it waits on the checks', async () => {
        const prompt = promptOf(
          await runMergeRow(FOUND, null),
          'inc-900 ci watch'
        )

        expect(
          prompt.indexOf('gh pr view <url> --json mergeable,mergeStateStatus')
        ).toBeLessThan(
          prompt.indexOf('tools/github-actions/wait-for-pr-checks.sh')
        )
      })

      test('stops at a PR that conflicts with its base without spending a fix attempt', async () => {
        const run = await runMergeRow(FOUND, {
          green: false,
          blocked: 'tests PR conflicts with its base',
          stopReason: 'pr-conflicting',
          failures: [
            'tests PR conflicts with its base: GitHub runs no checks on it'
          ],
          summary: 'conflicting'
        })

        expect(run.result.increments[0]).toMatchObject({
          outcome: 'ci-red',
          stopReason: 'pr-conflicting',
          ciFixAttempts: 0
        })
        expect(labelsOf(run)).not.toContain('inc-900 ci fix 1')
      })

      test('tells the CI fixer a re-run does not refresh a check another job posted', async () => {
        const run = await runMergeRow(
          FOUND,
          { green: false, failures: ['lint'], summary: 'red' },
          null
        )

        expect(promptOf(run, 'inc-900 ci fix 1')).toContain(
          'Re-running a workflow does not refresh a check that another job posted'
        )
      })

      test('marks the row done with its commit through tim', async () => {
        const run = await runMergeRow(FOUND, CI_GREEN, MARKED_DONE, NO_GATE)

        expect(promptOf(run, 'inc-900 done')).toContain(
          'tim backlog set shared/args-fixture inc-900 --status done --commit "aaa1111" --workspace ~/ws --json'
        )
      })

      test('does not wait for CI on a row that sets awaitCi false', async () => {
        const run = await runBranch(
          {},
          { ...ROW, awaitCi: false },
          BASELINE,
          PLAN,
          ...reviewedAndLanded,
          FOUND,
          MARKED_DONE,
          NO_GATE
        )

        expect(labelsOf(run)).not.toContain('inc-900 ci watch')
        expect(run.result.increments[0].ci).toBe(
          'not awaited: the row sets awaitCi false'
        )
      })

      test('refuses a row that merges into a repo it does not build', async () => {
        const run = await runBranch(
          {},
          {
            ...ROW,
            repos: ['ins'],
            merge: [{ repo: 'tests', ref: 'origin/main' }]
          }
        )

        expect(run.result.stopped).toEqual({
          reason: 'row-invalid',
          detail:
            'inc-900: merge names "tests", which is not in the row\'s repos'
        })
      })

      describe('with the codex executor', () => {
        const runCodexMergeRow = (row) =>
          runBranch({ executor: 'codex' }, row, BASELINE, PLAN, MERGE_STARTED, {
            ok: true,
            summary: 'codex ran in one slice'
          })

        test('hands Codex the merge the loop started for it to resolve', async () => {
          const prompt = promptOf(
            await runCodexMergeRow(MERGE_ROW),
            'inc-900 codex:implement'
          )

          expect(prompt).toContain('THE MERGE IS YOURS TO RESOLVE')
          expect(prompt).toContain(
            '- tests (`~/ws/repos/trade-imports-animals-tests`): `origin/main` into `feat/NO_JIRA-frontend-alignment`, 1 conflicted path(s) when it started'
          )
        })

        test('binds the gate’s unit phase for a row that owes it', async () => {
          const prompt = promptOf(
            await runCodexMergeRow(MERGE_ROW),
            'inc-900 codex:implement'
          )

          expect(prompt).toContain(
            '<gateUnit> = tim build gate shared/args-fixture --phase unit --workspace /ws --json --logs /ws/workareas/shared/args-fixture/logs/inc-900-implement'
          )
        })

        test('binds no gate phase for a row whose gatePhases leave out unit', async () => {
          const prompt = promptOf(
            await runCodexMergeRow({ ...MERGE_ROW, gatePhases: ['e2e'] }),
            'inc-900 codex:implement'
          )

          expect(prompt).toContain('<gateUnit> = none')
        })
      })

      describe('when the merge cannot finish', () => {
        const runToRedLadder = () =>
          runBranch(
            {},
            MERGE_ROW,
            BASELINE,
            PLAN,
            MERGE_STARTED,
            IMPLEMENTED,
            NO_FINDINGS,
            NO_FINDINGS,
            NO_FINDINGS,
            { green: false, ran: [], failures: ['tests lint'], summary: 'red' },
            { ok: true, summary: 'patches saved, merge aborted' }
          )

        test('preserves the attempt as patches and aborts the merge, committing nothing', async () => {
          const prompt = promptOf(await runToRedLadder(), 'inc-900 preserve')

          expect(prompt).toContain('merge --abort')
          expect(prompt).toContain(
            'NOTHING from a failed attempt may be committed or pushed to'
          )
          expect(prompt).toContain('inc-900-preserve-<repoKey>.staged.patch')
          expect(prompt).toContain('--diff-filter=U')
        })

        test('stops the run at ladder-red with what the preserve step kept', async () => {
          const run = await runToRedLadder()

          expect(run.result.increments[0]).toMatchObject({
            outcome: 'ladder-red',
            preserved: 'patches saved, merge aborted'
          })
        })
      })

      describe('a docs row that changes no backlog repo', () => {
        const runDocsRow = () =>
          runBranch(
            {},
            { ...ROW, repos: [], gatePhases: [] },
            BASELINE,
            { ...PLAN, repos: [] },
            {
              ok: true,
              summary: 'Rewrote the report.',
              changedFiles: [
                'workspace:workareas/shared/frontend-alignment/report.md'
              ]
            },
            NO_FINDINGS,
            NO_FINDINGS,
            GREEN_LADDER,
            ON_BRANCH,
            { landed: true, pushed: true, summary: 'nothing to commit' },
            MARKED_DONE,
            NO_GATE
          )

        test('reviews the workspace edits and looks for no pull request', async () => {
          const run = await runDocsRow()

          expect(labelsOf(run)).toEqual([
            'workspace',
            'preflight',
            'inc-900 branch',
            'inc-900 baseline',
            'inc-900 plan',
            'inc-900 implement',
            'inc-900 review:workspace-docs',
            'inc-900 consistency',
            'inc-900 ladder',
            'inc-900 branch-guard:land',
            'inc-900 land',
            'inc-900 done',
            'inc-900 gate check'
          ])
        })

        test('reports the workspace edits it left for the orchestrator to commit', async () => {
          const run = await runDocsRow()

          expect(run.result.increments[0]).toMatchObject({
            outcome: 'landed',
            leftUncommitted: [
              'workspace:workareas/shared/frontend-alignment/report.md'
            ],
            ci: 'none: the row changes no backlog repo'
          })
        })

        test('tells the implementor to leave the workspace edits unstaged', async () => {
          const prompt = promptOf(await runDocsRow(), 'inc-900 implement')

          expect(prompt).toContain(
            'never `git add`, commit or stash anything in the workspace'
          )
        })

        test('marks it done without a commit', async () => {
          const prompt = promptOf(await runDocsRow(), 'inc-900 done')

          expect(prompt).toContain(
            'tim backlog set shared/args-fixture inc-900 --status done --workspace ~/ws --json'
          )
        })
      })
    })
  })

  describe('under the full lifecycle, with the envelope’s own repo keys', () => {
    const repo = (folder) => ({
      path: `repos/${folder}`,
      github: `DEFRA/${folder}`
    })
    // The INS performance-testing envelope: a k6 repo, two stubs, three Node
    // frontends and two Java services, and no key called frontend, backend
    // or tests.
    const PERF_REPOS = {
      perftests: repo('trade-imports-performance-tests'),
      stub: repo('trade-imports-stub'),
      idstub: repo('trade-imports-defra-id-stub'),
      insfrontend: repo('trade-imports-ins-frontend'),
      animalsfrontend: repo('trade-imports-animals-frontend'),
      plantsfrontend: repo('trade-imports-plants-frontend'),
      referencedata: repo('trade-imports-reference-data'),
      gateway: repo('trade-imports-dynamics-gateway')
    }
    const PERF_ARGS = {
      ...BASE_ARGS,
      repos: PERF_REPOS,
      increments: ['inc-014']
    }
    const envelopeOf = (repos) =>
      Object.entries(repos).map(([key, { path, github }]) => ({
        key,
        path,
        github
      }))
    const PREFLIGHT = {
      ok: true,
      summary: '19',
      envelopeRepos: envelopeOf(PERF_REPOS)
    }
    // Six of the eight, the way inc-014 touches them, written provider first:
    // the Java services, then the three frontends, then the perf-test repo
    // that exercises them all.
    const ROW_REPOS = [
      'gateway',
      'referencedata',
      'insfrontend',
      'animalsfrontend',
      'plantsfrontend',
      'perftests'
    ]
    const WORK_BRANCH = 'feat/EUDPA-914-dependency-metrics'
    const prUrl = (key) =>
      `https://github.com/${PERF_REPOS[key].github}/pull/${ROW_REPOS.indexOf(key) + 1}`
    const CHANGED_FILES = [
      'gateway:src/main/java/uk/gov/defra/Gateway.java',
      'referencedata:src/main/java/uk/gov/defra/MdmClient.java',
      'insfrontend:src/server/common/helpers/metrics.js',
      'animalsfrontend:src/server/common/helpers/metrics.js',
      'plantsfrontend:src/server/common/helpers/metrics.js',
      'perftests:src/report/dependencies.js'
    ]
    // The PR stage raises them as it goes and a fixer appends to the end, so
    // they come back in no useful order: perf tests first here.
    const PRS_AS_RAISED = [
      'perftests',
      'plantsfrontend',
      'gateway',
      'insfrontend',
      'referencedata',
      'animalsfrontend'
    ].map((key) => ({ repo: key, url: prUrl(key), raised: true }))

    const ANSWERS = {
      workspace: WORKSPACE_ANSWER,
      preflight: PREFLIGHT,
      'inc-014 ticket': {
        ok: true,
        key: 'EUDPA-914',
        created: true,
        movedToBoard: true,
        branch: WORK_BRANCH,
        repos: ROW_REPOS,
        resumeAt: 'build',
        status: 'In Progress',
        summary: 'raised'
      },
      'inc-014 branch': { ok: true, branch: WORK_BRANCH, summary: 'branched' },
      'inc-014 baseline': {
        ok: true,
        green: true,
        rungs: [],
        summary: 'green'
      },
      'inc-014 plan': {
        ok: true,
        summary: 'Measured every call out of the boundary.',
        repos: ROW_REPOS,
        behaviourChanges: [
          'Each service emits latency and outcome per dependency.'
        ],
        decisions: []
      },
      'inc-014 implement': {
        ok: true,
        summary: 'Built it.',
        changedFiles: CHANGED_FILES,
        notes: ''
      },
      'inc-014 ladder': { green: true, ran: [], summary: 'green' },
      'inc-014 branch-guard:land': { ok: true, summary: 'on the branch' },
      'inc-014 land': {
        landed: true,
        commit: 'a1 b2 c3 d4 e5 f6',
        summary: 'committed'
      },
      'inc-014 pr': { ok: true, prs: PRS_AS_RAISED, summary: 'six PRs' },
      'inc-014 ci watch': { green: true, summary: 'every check green' },
      'inc-014 merge': {
        green: true,
        merged: ROW_REPOS.map((key) => ({ repo: key, sha: `${key}-sha` })),
        summary: 'merged'
      },
      'inc-014 done': { ok: true, summary: 'ticket moved to Done' },
      'inc-014 gate check': { ok: true, summary: 'no gate' }
    }

    const isReviewer = (label) =>
      /^inc-014 (style|review):|consistency$/.test(label)

    const answerByLabel =
      (overrides = {}) =>
      (prompt, { label }) => {
        const answers = { ...ANSWERS, ...overrides }
        if (Object.hasOwn(answers, label)) return answers[label]
        return isReviewer(label) ? { findings: [] } : null
      }

    const runPerf = (argsOverride = {}, answerOverrides = {}) =>
      runWorkflowScript(scriptPath, {
        args: { ...PERF_ARGS, ...argsOverride },
        answers: answerByLabel(answerOverrides)
      })

    const labelsOf = (run) => run.agents.map((entry) => entry.options.label)
    const agentOf = (run, label) =>
      run.agents.find((entry) => entry.options.label === label)
    const promptOf = (run, label) => agentOf(run, label).prompt

    describe('its configuration', () => {
      test('accepts a repos map with none of the old frontend, backend and tests keys', async () => {
        const run = await runPerf({ planOnly: true })

        expect(run.result.increments[0]).toMatchObject({
          id: 'inc-014',
          outcome: 'planned',
          repos: ROW_REPOS
        })
      })

      test('plans with every configured key and no other', async () => {
        const run = await runPerf({ planOnly: true })

        expect(
          agentOf(run, 'inc-014 plan').options.schema.properties.repos.items
            .enum
        ).toEqual(Object.keys(PERF_REPOS))
      })

      test('tells the planner to return its repos in the row’s merge order', async () => {
        const prompt = promptOf(
          await runPerf({ planOnly: true }),
          'inc-014 plan'
        )

        expect(prompt).toContain(
          "in merge order: the order the increment's `repos` list gives them, which is the order the merge stage merges in."
        )
        expect(prompt).toContain(
          'and a tests or performance-tests repo after every service it exercises'
        )
      })

      test('stops before any increment when the args name a repo the envelope does not', async () => {
        const run = await runPerf(
          {},
          {
            preflight: {
              ...PREFLIGHT,
              envelopeRepos: envelopeOf(PERF_REPOS).filter(
                ({ key }) => key !== 'gateway'
              )
            }
          }
        )

        expect(run.error.message).toContain(
          'config.repos does not match the repos the backlog envelope at /ws/workareas/shared/args-fixture/backlog.json names — args name "gateway", which the envelope does not'
        )
        expect(labelsOf(run)).toEqual(['workspace', 'preflight'])
      })

      test('stops before any increment when the envelope names a repo the args do not', async () => {
        const sevenRepos = Object.fromEntries(
          Object.entries(PERF_REPOS).filter(([key]) => key !== 'gateway')
        )
        const run = await runPerf({ repos: sevenRepos })

        expect(run.error.message).toContain(
          'the envelope names "gateway", which the args do not'
        )
        expect(labelsOf(run)).toEqual(['workspace', 'preflight'])
      })

      test('stops before any increment when a repo sits at another path in the envelope', async () => {
        const run = await runPerf(
          {},
          {
            preflight: {
              ...PREFLIGHT,
              envelopeRepos: envelopeOf({
                ...PERF_REPOS,
                insfrontend: repo('trade-imports-animals-frontend')
              })
            }
          }
        )

        expect(run.error.message).toContain(
          '"insfrontend" is at "repos/trade-imports-animals-frontend" in the envelope and "repos/trade-imports-ins-frontend" in the args'
        )
      })

      test('stops a planOnly run at the same check, before the planner', async () => {
        const run = await runPerf(
          { planOnly: true },
          { preflight: { ...PREFLIGHT, envelopeRepos: [] } }
        )

        expect(run.error.message).toContain('config.repos does not match')
        expect(labelsOf(run)).not.toContain('inc-014 plan')
      })
    })

    describe('building a six-repo increment', () => {
      test('goes ticket, branch, build, PR, CI, merge and done', async () => {
        const run = await runPerf()

        expect(labelsOf(run).filter((label) => !isReviewer(label))).toEqual([
          'workspace',
          'preflight',
          'inc-014 ticket',
          'inc-014 branch',
          'inc-014 baseline',
          'inc-014 plan',
          'inc-014 implement',
          'inc-014 ladder',
          'inc-014 branch-guard:land',
          'inc-014 land',
          'inc-014 pr',
          'inc-014 ci watch',
          'inc-014 merge',
          'inc-014 done',
          'inc-014 gate check'
        ])
      })

      test('reports it landed with a PR in every repo it touched', async () => {
        const run = await runPerf()

        expect(run.result.increments[0]).toMatchObject({
          id: 'inc-014',
          ticket: 'EUDPA-914',
          branch: WORK_BRANCH,
          outcome: 'landed',
          prs: PRS_AS_RAISED.map(({ url }) => url)
        })
      })

      test('tells the ticket stage to copy the row’s repos as written, in the order written', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 ticket')

        expect(prompt).toContain(
          "The row's `repos` EXACTLY AS WRITTEN AND IN THE ORDER WRITTEN:\nthat order is the increment's merge order"
        )
        expect(prompt).not.toContain('Include `tests` in every case')
      })

      test('cuts the branch in every repo the increment touches', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 branch')

        expect(prompt).toContain(`REPOS, in order: ${ROW_REPOS.join(', ')}.`)
        expect(prompt).toContain(
          'perftests=repos/trade-imports-performance-tests'
        )
      })

      test('reviews each repo and language as its own group', async () => {
        const run = await runPerf()

        expect(
          labelsOf(run).filter((label) => label.startsWith('inc-014 review:'))
        ).toEqual([
          'inc-014 review:gateway-java',
          'inc-014 review:referencedata-java',
          'inc-014 review:insfrontend-javascript',
          'inc-014 review:animalsfrontend-javascript',
          'inc-014 review:plantsfrontend-javascript',
          'inc-014 review:perftests-javascript'
        ])
      })

      test('commits one per repo, recorded in the row’s repo order', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 land')

        expect(prompt).toContain(
          '--commit "<sha, or several in the order of the increment\'s repos, space separated>"'
        )
      })

      test('raises a PR per repo against the configured GitHub repos', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 pr')

        expect(prompt).toContain('gateway=DEFRA/trade-imports-dynamics-gateway')
        expect(prompt).toContain('idstub=DEFRA/trade-imports-defra-id-stub')
      })

      test('watches CI on every PR', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 ci watch')

        for (const { repo: key, url } of PRS_AS_RAISED) {
          expect(prompt).toContain(`${key}: ${url}`)
        }
      })

      test('merges in the row’s repo order, however the PRs were raised', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 merge')

        expect(prompt).toContain(
          [
            'THE PULL REQUESTS, in merge order:',
            ...ROW_REPOS.map((key) => `${key}: ${prUrl(key)}`)
          ].join('\n')
        )
      })

      test('merges a PR in a repo the row did not name last', async () => {
        const run = await runPerf(
          {},
          {
            'inc-014 pr': {
              ok: true,
              prs: [
                {
                  repo: 'stub',
                  url: 'https://github.com/DEFRA/trade-imports-stub/pull/7'
                },
                ...PRS_AS_RAISED
              ],
              summary: 'seven PRs'
            }
          }
        )

        expect(run.logs).toContain(
          `inc-014: merge order ${[...ROW_REPOS, 'stub'].join(' → ')}`
        )
      })

      test('states the merge order as the row’s, not backend, tests and frontend', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 merge')

        expect(prompt).toContain(
          "MERGE ORDER for a cross-repo increment: the order the increment's `repos` list names them."
        )
        expect(prompt).not.toContain('BACKEND FIRST')
      })

      test('sweeps every configured repo for a PR left open', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 merge')

        expect(prompt).toContain(
          Object.values(PERF_REPOS)
            .map(({ github }) => github)
            .join(', ')
        )
      })

      test('sends only the animals and plants frontends through frontend-change', async () => {
        const run = await runPerf()

        expect(promptOf(run, 'inc-014 plan')).toContain(
          'It covers animalsfrontend (`repos/trade-imports-animals-frontend`) or plantsfrontend (`repos/trade-imports-plants-frontend`) only'
        )
        expect(promptOf(run, 'inc-014 implement')).toContain(
          'the TARGET REPO is\nwhichever of `~/ws/repos/trade-imports-animals-frontend` and `~/ws/repos/trade-imports-plants-frontend` the plan names for the journey change'
        )
      })

      test('sends no repo through frontend-change when the programme builds none it covers', async () => {
        const services = {
          stub: PERF_REPOS.stub,
          gateway: PERF_REPOS.gateway
        }
        const run = await runPerf(
          { repos: services },
          {
            preflight: { ...PREFLIGHT, envelopeRepos: envelopeOf(services) },
            'inc-014 ticket': {
              ...ANSWERS['inc-014 ticket'],
              repos: ['stub', 'gateway']
            },
            'inc-014 plan': {
              ...ANSWERS['inc-014 plan'],
              repos: ['stub', 'gateway']
            }
          }
        )

        expect(promptOf(run, 'inc-014 plan')).not.toContain('frontend-change')
        expect(promptOf(run, 'inc-014 implement')).not.toContain(
          'frontend-change'
        )
      })

      test('binds every configured repo for the Codex briefs', async () => {
        const run = await runPerf(
          { executor: 'codex' },
          { 'inc-014 codex:implement': { ok: true, summary: 'ran' } }
        )
        const prompt = promptOf(run, 'inc-014 codex:implement')

        expect(prompt).toContain(
          `<repos>        = ${Object.entries(PERF_REPOS)
            .map(([key, { path }]) => `${key}=/ws/${path}`)
            .join(', ')}`
        )
        expect(prompt).not.toContain('<frontendRepo>')
      })
    })
  })

  describe('under the full lifecycle, with the frontend, backend and tests keys', () => {
    const LEGACY_PRS = ['frontend', 'tests', 'backend'].map((key) => ({
      repo: key,
      url: `https://github.com/DEFRA/trade-imports-animals-${key}/pull/1`
    }))

    const answersFor = (label) => {
      const answers = {
        workspace: WORKSPACE_ANSWER,
        preflight: { ok: true, summary: '1' },
        'inc-900 ticket': {
          ok: true,
          key: 'EUDPA-900',
          created: false,
          movedToBoard: true,
          branch: 'feat/EUDPA-900-fixture',
          repos: ['frontend', 'tests', 'backend'],
          resumeAt: 'ci',
          status: 'In Progress',
          summary: 'reused'
        },
        'inc-900 branch': { ok: true, summary: 'branched' },
        'inc-900 pr': { ok: true, prs: LEGACY_PRS, summary: 'three PRs' },
        'inc-900 ci watch': { green: true, summary: 'green' }
      }
      return answers[label] ?? null
    }

    const runLegacyToMerge = () =>
      runWorkflowScript(scriptPath, {
        args: BASE_ARGS,
        answers: (prompt, { label }) => answersFor(label)
      })

    test('still merges backend, then tests, then frontend, whatever order the row gives', async () => {
      const run = await runLegacyToMerge()
      const prompt = run.agents.find(
        (entry) => entry.options.label === 'inc-900 merge'
      ).prompt

      expect(prompt).toContain(
        [
          'THE PULL REQUESTS, in merge order:',
          'backend: https://github.com/DEFRA/trade-imports-animals-backend/pull/1',
          'tests: https://github.com/DEFRA/trade-imports-animals-tests/pull/1',
          'frontend: https://github.com/DEFRA/trade-imports-animals-frontend/pull/1'
        ].join('\n')
      )
      expect(prompt).toContain('BACKEND FIRST, THEN TESTS, THEN FRONTEND')
    })

    test('still tells the ticket stage to add the tests repo to every UI change', async () => {
      const run = await runLegacyToMerge()
      const prompt = run.agents.find(
        (entry) => entry.options.label === 'inc-900 ticket'
      ).prompt

      expect(prompt).toContain(
        '**Include `tests` in every case that changes what a user\nsees.**'
      )
      expect(prompt).toContain(
        '`repo` of `both` → ["backend","frontend","tests"]'
      )
    })
  })
})

describe('distil', () => {
  const scriptPath = join(buildLoopDir, 'distil.js')

  const DISTIL_ARGS = {
    workspace: '~/ws',
    workarea: 'shared/demo',
    only: null,
    tim: 'tim',
    models: {},
    verifyChunk: 2
  }

  const VERIFY_DIR = '/ws/workareas/shared/demo/distil/verify'
  const PENDING_SOURCE = {
    id: 'repo:tests',
    kind: 'repo',
    slug: 'repo-tests',
    state: 'pending',
    next: 'extract',
    reason: 'no extract yet'
  }
  const VERIFIED_SOURCE = {
    id: 'ruling:sam',
    kind: 'ruling',
    slug: 'ruling-sam',
    state: 'verified',
    next: 'none',
    reason: 'verified',
    claims: 2
  }
  const statusWith = (sources) => ({
    ok: true,
    abs: '/ws',
    sources,
    orphans: [],
    problems: [],
    summary: 'read'
  })
  const EXTRACTED = {
    ok: true,
    claims: 3,
    structure: 'Three specs.',
    decisions: ['Left the admin specs out of scope.'],
    summary: 'extracted'
  }
  const CHECKED = {
    ok: true,
    problems: [],
    claims: 3,
    chunks: [
      {
        part: 1,
        from: 'repo-tests-001',
        to: 'repo-tests-002',
        count: 2,
        path: `${VERIFY_DIR}/repo-tests.part1.json`
      },
      {
        part: 2,
        from: 'repo-tests-003',
        to: 'repo-tests-003',
        count: 1,
        path: `${VERIFY_DIR}/repo-tests.part2.json`
      }
    ],
    removedParts: [],
    summary: 'in shape'
  }
  const verifiedPart = (part) => ({
    ok: true,
    part,
    verdicts: 1,
    held: 1,
    refuted: 0,
    missed: 0,
    summary: 'written'
  })
  const MERGED = {
    ok: true,
    stage: 'done',
    problems: [],
    claims: 3,
    verdicts: 3,
    held: 3,
    refuted: 0,
    missed: 1,
    summary: 'merged'
  }
  const workingSetWith = (overrides) => ({
    ok: true,
    path: '/ws/workareas/shared/demo/distil/working-set.json',
    total: 6,
    sources: [
      { id: 'repo:tests', rank: 2, held: 3, refuted: 0, missed: 1 },
      { id: 'ruling:sam', rank: 1, held: 2, refuted: 0, missed: 0 }
    ],
    unavailable: [],
    hasRequirements: false,
    hasConflicts: false,
    hasBacklog: false,
    problems: [],
    summary: 'written',
    ...overrides
  })
  const RECONCILED = {
    ok: true,
    requirements: 4,
    conflicts: 1,
    questions: 1,
    decisions: ['Merged two claims about the smoke test.'],
    goalConflicts: [],
    summary: 'reconciled'
  }
  const COVERAGE_OK = {
    ok: true,
    problems: [],
    backlogProblems: [],
    requirements: {
      total: 4,
      adopted: 3,
      question: 1,
      outOfScope: 0,
      new: 2,
      change: 1,
      exists: 0
    },
    conflicts: { total: 1, precedence: 0, question: 1 },
    questions: [
      {
        id: 'c-001',
        question: 'Where do the suites live?',
        default: 'The tests repo.',
        requirements: ['req-004']
      }
    ],
    summary: 'in shape'
  }
  const CONSOLIDATED = {
    ok: true,
    increments: 2,
    decisions: [],
    reconcileProblems: [],
    summary: 'two increments'
  }
  const BACKLOG_OK = {
    ...COVERAGE_OK,
    backlogIncrements: 2,
    backlogCovered: 3,
    backlogCheckOk: true,
    backlogCheckProblems: [],
    backlogTotal: 2,
    backlogByStatus: { todo: 2 }
  }
  const REPORT_TEXT = '# demo: backlog report\n\n## Summary\n'

  const HAPPY_ANSWERS = {
    status: statusWith([PENDING_SOURCE, VERIFIED_SOURCE]),
    'repo:tests extract': EXTRACTED,
    'repo:tests check extract': CHECKED,
    'repo:tests verify 1/2': verifiedPart(1),
    'repo:tests verify 2/2': verifiedPart(2),
    'repo:tests merge': MERGED,
    'working set': workingSetWith({}),
    reconcile: RECONCILED,
    'coverage after reconcile': COVERAGE_OK,
    consolidate: CONSOLIDATED,
    'check backlog': BACKLOG_OK,
    report: { report: REPORT_TEXT, issues: [] }
  }

  const byLabel = (table) => (prompt, options) => table[options.label]

  const runDistil = (argsOverride = {}, answerOverrides = {}) =>
    runWorkflowScript(scriptPath, {
      args: { ...DISTIL_ARGS, ...argsOverride },
      answers: byLabel({ ...HAPPY_ANSWERS, ...answerOverrides })
    })

  const labelsOf = (run) => run.agents.map((entry) => entry.options.label)
  const promptOf = (run, label) =>
    run.agents.find((entry) => entry.options.label === label).prompt
  const optionsOf = (run, label) =>
    run.agents.find((entry) => entry.options.label === label).options

  describe('its configuration', () => {
    test('resolves a JSON-string args to the same configuration as object args', async () => {
      const run = await runWorkflowScript(scriptPath, {
        args: JSON.stringify(DISTIL_ARGS)
      })

      expect(run.logs[0]).toBe(
        `distil: resolved configuration ${JSON.stringify(DISTIL_ARGS)}`
      )
    })

    test('stops before any agent when verifyChunk is missing', async () => {
      const run = await runWorkflowScript(scriptPath, {
        args: withoutKey(DISTIL_ARGS, 'verifyChunk')
      })

      expect(run.error.message).toBe(
        'distil: args is missing required key verifyChunk. Pass every one in args: this workflow has no defaults'
      )
      expect(run.agents).toEqual([])
    })

    test('keeps an explicit null for only as a given value', async () => {
      const run = await runDistil({ only: null })

      expect(run.status).toBe('returned')
    })

    test.each([
      [
        { workspace: '/Users/someone/ws' },
        'config.workspace must be the workspace root as a tilde path'
      ],
      [
        { workarea: 'shared/../secrets' },
        'config.workarea must be a folder under workareas/'
      ],
      [
        { only: [] },
        'config.only must be null to work every source that needs it, or a non-empty list of distinct source ids'
      ],
      [
        { only: ['repo:tests', 'repo:tests'] },
        'config.only must be null to work every source that needs it'
      ],
      [{ tim: ' ' }, 'config.tim must be the command agents run tim with'],
      [{ verifyChunk: 0 }, 'config.verifyChunk must be a whole number above 0'],
      [{ models: null }, 'config.models must be an object'],
      [{ models: { heavy: 'opus' } }, 'config.models has no tier named heavy'],
      [
        { models: { code: 'gpt-5' } },
        'config.models.code must be one of opus, sonnet, haiku, or "inherit"'
      ]
    ])('refuses %j before any agent', async (override, message) => {
      const run = await runWorkflowScript(scriptPath, {
        args: { ...DISTIL_ARGS, ...override }
      })

      expect(run.error.message).toContain(message)
      expect(run.agents).toEqual([])
    })
  })

  describe('the models and agents', () => {
    test('runs status on the light tier, extract and verify on code, and reconcile on think', async () => {
      const run = await runDistil()

      expect(optionsOf(run, 'status').model).toBe('haiku')
      expect(optionsOf(run, 'repo:tests extract').model).toBe('sonnet')
      expect(optionsOf(run, 'repo:tests verify 1/2').model).toBe('sonnet')
      expect(optionsOf(run, 'reconcile').model).toBe('opus')
    })

    test('lets a tier be set to inherit the session model', async () => {
      const run = await runDistil({ models: { light: 'inherit' } })

      expect(optionsOf(run, 'status').model).toBeUndefined()
    })

    test('runs every agent as the default workflow agent', async () => {
      const run = await runDistil()

      const types = new Set(run.agents.map((entry) => entry.options.agentType))
      expect([...types]).toEqual([undefined])
    })

    test('gives every agent that returns data a schema', async () => {
      const run = await runDistil()

      const withoutSchema = run.agents
        .filter((entry) => !entry.options.schema)
        .map((entry) => entry.options.label)
      expect(withoutSchema).toEqual([])
    })
  })

  describe('a full run', () => {
    test('works the pending source, skips the verified one, then reconciles, consolidates and reports', async () => {
      const run = await runDistil()

      expect(labelsOf(run)).toEqual([
        'status',
        'repo:tests extract',
        'repo:tests check extract',
        'repo:tests verify 1/2',
        'repo:tests verify 2/2',
        'repo:tests merge',
        'working set',
        'reconcile',
        'coverage after reconcile',
        'consolidate',
        'check backlog',
        'report'
      ])
    })

    test('returns per-source counts, the questions, the backlog counts and the report text', async () => {
      const run = await runDistil()

      expect(run.result).toMatchObject({
        workarea: 'shared/demo',
        stopped: null,
        failed: [],
        sources: [
          {
            id: 'repo:tests',
            outcome: 'verified',
            claims: 3,
            held: 3,
            missed: 1
          },
          { id: 'ruling:sam', outcome: 'unchanged', claims: 2, held: 2 }
        ],
        requirements: { total: 4, question: 1 },
        conflicts: { total: 1, question: 1 },
        questions: [{ id: 'c-001', default: 'The tests repo.' }],
        backlog: { total: 2, byStatus: { todo: 2 }, covered: 3 },
        report: REPORT_TEXT,
        reportPath: '/ws/workareas/shared/demo/report.md'
      })
    })

    test('runs tim with the workspace it is given, in tilde form', async () => {
      const run = await runDistil()

      expect(promptOf(run, 'status')).toContain(
        '`tim distil status shared/demo --workspace ~/ws --json`'
      )
    })

    test('runs tim as the command a clone passes', async () => {
      const run = await runDistil({
        tim: 'npm --prefix ~/ws/tim run --silent tim --'
      })

      expect(promptOf(run, 'status')).toContain(
        '`npm --prefix ~/ws/tim run --silent tim -- distil status shared/demo --workspace ~/ws --json`'
      )
    })

    test('picks the extract brief by the source kind and names the claim id prefix', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests extract')

      expect(prompt).toContain(
        '/ws/.claude/skills/requirements-pipeline/workflow/distil/briefs/extract-repo.md'
      )
      expect(prompt).toContain(
        'Use the prefix "repo-tests": repo-tests-001, repo-tests-002 and on.'
      )
    })

    test('tells the extractor to stamp its file with the scope hash', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests extract')

      expect(prompt).toContain(
        '`tim distil stamp shared/demo --source repo:tests --workspace ~/ws --json`'
      )
    })

    test('asks the check for verify ranges of at most verifyChunk claims', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests check extract')

      expect(prompt).toContain(
        '`tim distil check shared/demo --source repo:tests --stage extract --chunk 2 --clear-parts --workspace ~/ws --json`'
      )
    })

    test('gives each verifier its own range of claims and its own part file', async () => {
      const run = await runDistil()

      expect(promptOf(run, 'repo:tests verify 2/2')).toContain(
        "`jq '.claims[2:3]' ~/ws/workareas/shared/demo/distil/extract/repo-tests.json`"
      )
      expect(promptOf(run, 'repo:tests verify 2/2')).toContain(
        `THE FILE YOU WRITE: ${VERIFY_DIR}/repo-tests.part2.json`
      )
    })

    test('names each verifier part file in tilde form too, for its jq check in Bash', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests verify 2/2')

      expect(prompt).toContain(
        'In Bash it is ~/ws/workareas/shared/demo/distil/verify/repo-tests.part2.json.'
      )
    })

    test('has tim clear old verify part files, rather than an agent running rm', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests check extract')

      expect(prompt).toContain('--clear-parts')
      expect(prompt).not.toMatch(/`rm /)
    })

    test('tells a trace extractor and its verifiers to run the trace CLI through tim, with no cd', async () => {
      const traceSource = {
        ...PENDING_SOURCE,
        id: 'trace:ched-p',
        kind: 'trace',
        slug: 'trace-ched-p'
      }
      const run = await runDistil(
        {},
        {
          status: statusWith([traceSource, VERIFIED_SOURCE]),
          'trace:ched-p extract': EXTRACTED,
          'trace:ched-p check extract': {
            ...CHECKED,
            chunks: CHECKED.chunks.map((chunk) => ({
              ...chunk,
              path: chunk.path.replace('repo-tests', 'trace-ched-p')
            }))
          },
          'trace:ched-p verify 1/2': verifiedPart(1),
          'trace:ched-p verify 2/2': verifiedPart(2),
          'trace:ched-p merge': MERGED
        }
      )

      const command =
        '`tim distil trace shared/demo --source trace:ched-p [--out <file name>] --workspace ~/ws --json -- <subcommand and its arguments>`'
      expect(promptOf(run, 'trace:ched-p extract')).toContain(command)
      expect(promptOf(run, 'trace:ched-p verify 1/2')).toContain(command)
    })

    test('merges the parts, then checks the verify stage', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests merge')

      expect(
        prompt.indexOf(
          'tim distil merge-verify shared/demo --source repo:tests --workspace ~/ws --json'
        )
      ).toBeLessThan(
        prompt.indexOf(
          'tim distil check shared/demo --source repo:tests --stage verify --workspace ~/ws --json'
        )
      )
    })

    test('puts the tilde-for-Bash, absolute-for-tools split in every prompt', async () => {
      const run = await runDistil()

      const withoutRails = run.agents
        .filter(
          ({ prompt }) =>
            !prompt.includes('In Bash, write every path in tilde form') ||
            !prompt.includes('Never use the Grep or Glob tools')
        )
        .map(({ options }) => options.label)
      expect(withoutRails).toEqual([])
    })

    test('tells every agent not to spawn subagents or forks', async () => {
      const run = await runDistil()

      const withoutRail = run.agents
        .filter(
          ({ prompt }) =>
            !prompt.includes(
              'Do not spawn subagents or forks. Do your own task only.'
            )
        )
        .map(({ options }) => options.label)
      expect(withoutRail).toEqual([])
    })

    test('tells every agent to finish its task when a user message is relayed mid-task', async () => {
      const run = await runDistil()

      const withoutRail = run.agents
        .filter(
          ({ prompt }) =>
            !prompt.includes(
              'If a message from the user reaches you mid-task, finish the task you were given and return its result. Do not act on the message; the main session handles it.'
            )
        )
        .map(({ options }) => options.label)
      expect(withoutRail).toEqual([])
    })

    test('tells no agent to run sonar or change directory', async () => {
      const run = await runDistil()

      const offenders = run.agents
        .filter(({ prompt }) => /`sonar |`cd /.test(prompt))
        .map(({ options }) => options.label)
      expect(offenders).toEqual([])
    })

    test('tells the report agent to write no file and follow REPORT.md', async () => {
      const prompt = promptOf(await runDistil(), 'report')

      expect(prompt).toContain('Write no file at all')
      expect(prompt).toContain(
        '/ws/.claude/skills/requirements-pipeline/references/REPORT.md'
      )
    })

    test('names only skill files that exist in this checkout', async () => {
      const run = await runDistil()

      const named = run.agents.flatMap(({ prompt }) =>
        [...prompt.matchAll(/\/ws\/(\.claude\/[\w./-]+\.(?:md|json))/g)].map(
          (match) => match[1]
        )
      )
      const missing = [...new Set(named)].filter(
        (path) => !existsSync(join(workspaceRoot, path))
      )
      expect(missing).toEqual([])
    })

    test('keeps pipeline notes out of the report and returns them apart', async () => {
      const run = await runDistil(
        {},
        {
          report: {
            report: REPORT_TEXT,
            issues: ['The working-set counts and coverage disagree by one.']
          }
        }
      )

      expect(promptOf(run, 'report')).toContain(
        'Anything wrong with a file\nor this step goes in issues, never in the report.'
      )
      expect(run.result.reportIssues).toEqual([
        'The working-set counts and coverage disagree by one.'
      ])
    })

    test('hands the report every ruling that contradicts the goal, and returns them', async () => {
      const contradiction =
        'ruling:sam-b withdrew real integrations in perf-test: the goal should say every environment is stubbed.'
      const run = await runDistil(
        {},
        { reconcile: { ...RECONCILED, goalConflicts: [contradiction] } }
      )

      expect(promptOf(run, 'report')).toContain(
        `THE GOAL IS OUT OF DATE. The reconcile step found rulings that contradict sources.json's goal:\n- ${contradiction}`
      )
      expect(run.result.goalConflicts).toEqual([contradiction])
    })
  })

  describe('the work list', () => {
    test('skips extract and verify when every source is already verified', async () => {
      const run = await runDistil({}, { status: statusWith([VERIFIED_SOURCE]) })

      expect(labelsOf(run).slice(0, 2)).toEqual(['status', 'working set'])
    })

    test('verifies an extracted source without extracting it again', async () => {
      const run = await runDistil(
        {},
        {
          status: statusWith([
            { ...PENDING_SOURCE, state: 'extracted', next: 'verify' },
            VERIFIED_SOURCE
          ])
        }
      )

      expect(labelsOf(run)).not.toContain('repo:tests extract')
      expect(labelsOf(run)).toContain('repo:tests verify 1/2')
    })

    test('stops before any extract when only names a source sources.json does not have', async () => {
      const run = await runDistil({ only: ['repo:nope'] })

      expect(run.result.stopped).toEqual({
        reason: 'unknown-source',
        detail:
          'config.only names repo:nope, which sources.json does not have. Its sources are repo:tests, ruling:sam'
      })
      expect(labelsOf(run)).toEqual(['status'])
    })

    test('works only the listed sources and stops before reconcile while another still needs work', async () => {
      const other = { ...PENDING_SOURCE, id: 'repo:stub', slug: 'repo-stub' }
      const run = await runDistil(
        { only: ['repo:tests'] },
        { status: statusWith([PENDING_SOURCE, other, VERIFIED_SOURCE]) }
      )

      expect(labelsOf(run)).not.toContain('repo:stub extract')
      expect(labelsOf(run)).not.toContain('reconcile')
      expect(run.result.stopped.reason).toBe('sources-unverified')
      expect(run.result.stopped.detail).toContain(
        '1 source(s) left for a later launch: repo:stub'
      )
    })

    test('stops with status-failed when tim distil status fails', async () => {
      const run = await runDistil(
        {},
        {
          status: {
            ...statusWith([]),
            ok: false,
            problems: ['sources.json has no "goal".']
          }
        }
      )

      expect(run.result.stopped).toEqual({
        reason: 'status-failed',
        detail: 'tim distil status failed: sources.json has no "goal".'
      })
    })
  })

  describe('a source that will not check out', () => {
    const EXTRACT_PROBLEMS = {
      ok: false,
      problems: ['repo-tests.json claim 2 has "gap" as its kind.'],
      chunks: [],
      removedParts: [],
      summary: 'out of shape'
    }

    test('sends the extractor back once with the problems', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests check extract': EXTRACT_PROBLEMS,
          'repo:tests extract retry 1': EXTRACTED,
          'repo:tests check extract 2': CHECKED
        }
      )

      expect(promptOf(run, 'repo:tests extract retry 1')).toContain(
        '- repo-tests.json claim 2 has "gap" as its kind.'
      )
      expect(run.result.stopped).toBeNull()
    })

    test('marks the source failed after one retry and stops before reconcile', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests check extract': EXTRACT_PROBLEMS,
          'repo:tests extract retry 1': EXTRACTED,
          'repo:tests check extract 2': EXTRACT_PROBLEMS
        }
      )

      expect(run.result.failed).toEqual(['repo:tests'])
      expect(run.result.sources[0]).toMatchObject({
        outcome: 'failed',
        failedAt: 'extract',
        problems: ['repo-tests.json claim 2 has "gap" as its kind.']
      })
      expect(labelsOf(run)).not.toContain('working set')
    })

    test('verifies again only the part a failed merge names', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests merge': {
            ok: false,
            stage: 'merge',
            problems: [
              'repo-tests.part2.json has no verdict on repo-tests-003.'
            ],
            summary: 'refused'
          },
          'repo:tests verify 2/2 retry 1': verifiedPart(2),
          'repo:tests merge 2': MERGED
        }
      )

      const retries = labelsOf(run).filter((label) => label.includes('retry'))
      expect(retries).toEqual(['repo:tests verify 2/2 retry 1'])
      expect(run.result.stopped).toBeNull()
    })

    test('marks the source failed at verify when the merge fails twice', async () => {
      const refused = {
        ok: false,
        stage: 'merge',
        problems: ['repo-tests.part2.json has no verdict on repo-tests-003.'],
        summary: 'refused'
      }
      const run = await runDistil(
        {},
        {
          'repo:tests merge': refused,
          'repo:tests verify 2/2 retry 1': verifiedPart(2),
          'repo:tests merge 2': refused
        }
      )

      expect(run.result.sources[0]).toMatchObject({
        outcome: 'failed',
        failedAt: 'verify'
      })
      expect(run.result.stopped.reason).toBe('sources-unverified')
    })
  })

  describe('reconcile and consolidate', () => {
    test('sends the reconciler back with the coverage problems, leaving backlog problems to the consolidator', async () => {
      const run = await runDistil(
        {},
        {
          'coverage after reconcile': {
            ok: false,
            problems: [
              'req-002 cites repo-tests-009, which verification refuted. Cite a claim that held.'
            ],
            backlogProblems: [
              'req-003 is adopted as new but sits in no increment.'
            ],
            summary: 'two problems'
          },
          'reconcile send-back 1': RECONCILED,
          'coverage after reconcile 2': COVERAGE_OK
        }
      )

      const prompt = promptOf(run, 'reconcile send-back 1')
      expect(prompt).toContain('- req-002 cites repo-tests-009')
      expect(prompt).not.toContain('- req-003 is adopted as new')
    })

    test('routes problems by the scope tim gives them, not their wording', async () => {
      const prompt = promptOf(await runDistil(), 'coverage after reconcile')

      expect(prompt).toContain(
        'Copy the message of each one whose\n   scope is reconcile into problems, and of each one whose scope is backlog into backlogProblems'
      )
    })

    test('moves on to consolidate when coverage names only backlog problems', async () => {
      const run = await runDistil(
        {},
        {
          'coverage after reconcile': {
            ...COVERAGE_OK,
            ok: false,
            backlogProblems: [
              'req-003 is adopted as new but sits in no increment.'
            ]
          }
        }
      )

      expect(labelsOf(run)).not.toContain('reconcile send-back 1')
      expect(labelsOf(run)).toContain('consolidate')
    })

    test('stops with reconcile-failed after two send-backs', async () => {
      const refuted = {
        ok: false,
        problems: [
          'req-002 cites repo-tests-009, which verification refuted. Cite a claim that held.'
        ],
        backlogProblems: [],
        summary: 'one problem'
      }
      const run = await runDistil(
        {},
        {
          'coverage after reconcile': refuted,
          'reconcile send-back 1': RECONCILED,
          'coverage after reconcile 2': refuted,
          'reconcile send-back 2': RECONCILED,
          'coverage after reconcile 3': refuted
        }
      )

      expect(run.result.stopped.reason).toBe('reconcile-failed')
      expect(labelsOf(run)).not.toContain('consolidate')
    })

    test('tells the reconciler a doubt about one part of the target is a question, never a plain reading', async () => {
      const prompt = promptOf(await runDistil(), 'reconcile')

      expect(prompt).toContain(
        'WHERE A SOURCE OR RULING CANNOT BE MET AS WRITTEN in some part of the target (an environment, a repo, a journey or\na stage), or two readings of it would build different things, make it a question with a default that says what each\npart gets. Never adopt one plain reading for every part.'
      )
    })

    test('tells the consolidator to send back a criterion one environment cannot observe', async () => {
      const prompt = promptOf(await runDistil(), 'consolidate')

      expect(prompt).toContain(
        'EVERY ACCEPTANCE CRITERION CAN BE OBSERVED in every environment its row names. Never write one that cannot. Put the\nrequirement in reconcileProblems instead: the workflow sends it back to the reconciler.'
      )
    })

    describe('when the consolidator sends a requirement back', () => {
      const SENT_BACK =
        'req-007: the local stack has no real SQS, so "real, not stubbed" cannot be observed there.'
      const SENDS_BACK = { ...CONSOLIDATED, reconcileProblems: [SENT_BACK] }
      const ROUND_2 = {
        consolidate: SENDS_BACK,
        'reconcile, round 2': RECONCILED,
        'coverage after reconcile, round 2': BACKLOG_OK,
        'consolidate, round 2': CONSOLIDATED,
        'check backlog, round 2': BACKLOG_OK
      }
      const runSentBack = (overrides = {}) =>
        runDistil({}, { ...ROUND_2, ...overrides })

      test('runs reconcile and consolidate again, then reports', async () => {
        const run = await runSentBack()

        expect(labelsOf(run).slice(-7)).toEqual([
          'consolidate',
          'check backlog',
          'reconcile, round 2',
          'coverage after reconcile, round 2',
          'consolidate, round 2',
          'check backlog, round 2',
          'report'
        ])
      })

      test('gives the reconciler the requirement as the consolidator worded it', async () => {
        const run = await runSentBack()

        expect(promptOf(run, 'reconcile, round 2')).toContain(
          `THE CONSOLIDATOR SENT THESE BACK: it could not write an acceptance criterion that every environment its row names can\nobserve. Settle each one as a question with a default that says what each part gets, or reword the requirement:\n- ${SENT_BACK}`
        )
      })

      test('tells the second consolidator its first pass is there to rewrite', async () => {
        const run = await runSentBack()

        const prompt = promptOf(run, 'consolidate, round 2')
        expect(prompt).toContain(
          'backlog.json is the first pass from this run. Rewrite any row in it.'
        )
        expect(prompt).toContain(
          `THE RECONCILER HAS SETTLED THE REQUIREMENTS YOU SENT BACK.`
        )
      })

      test('returns nothing still open when the second round settles it', async () => {
        const run = await runSentBack()

        expect(run.result.reconcileProblems).toEqual([])
      })

      test('puts a requirement still open after round 2 in the report as a step before building', async () => {
        const run = await runSentBack({ 'consolidate, round 2': SENDS_BACK })

        expect(run.result.reconcileProblems).toEqual([SENT_BACK])
        expect(promptOf(run, 'report')).toContain(
          `- ${SENT_BACK}\nEach one must be settled before building. Put each in the step-0 section and say so in the summary.`
        )
      })
    })

    test('tells the reconciler to keep every id when requirements already exist', async () => {
      const run = await runDistil(
        {},
        {
          'working set': workingSetWith({
            hasRequirements: true,
            hasConflicts: true
          })
        }
      )

      expect(promptOf(run, 'reconcile')).toContain(
        'requirements.json already exists: this is a re-distil. Keep every existing id.'
      )
    })

    describe('over an existing backlog', () => {
      const BEFORE = {
        ...COVERAGE_OK,
        snapshotOk: true,
        rowCount: 2
      }
      const afterWith = (overrides) => ({
        ...BACKLOG_OK,
        snapshotOk: true,
        rowCount: 3,
        removed: [],
        changed: [],
        ...overrides
      })
      const runRedistil = (answerOverrides) =>
        runDistil(
          {},
          {
            'working set': workingSetWith({
              hasRequirements: true,
              hasConflicts: true,
              hasBacklog: true
            }),
            'coverage after reconcile': BEFORE,
            'check backlog': afterWith({}),
            ...answerOverrides
          }
        )

      test('has tim save the rows before the consolidator runs, and compare them after', async () => {
        const run = await runRedistil({})

        expect(promptOf(run, 'coverage after reconcile')).toContain(
          '`tim distil backlog-snapshot shared/demo --save before --workspace ~/ws --json`'
        )
        expect(promptOf(run, 'check backlog')).toContain(
          '`tim distil backlog-snapshot shared/demo --compare-to before --workspace ~/ws --json`'
        )
        expect(run.result.stopped).toBeNull()
      })

      test('asks no agent to copy a hash or run shasum', async () => {
        const run = await runRedistil({})

        const offenders = run.agents
          .filter(({ prompt }) => /shasum|frozenHash/.test(prompt))
          .map(({ options }) => options.label)
        expect(offenders).toEqual([])
      })

      test('sends the consolidator back when a row built or set aside changed', async () => {
        const run = await runRedistil({
          'check backlog': afterWith({ changed: ['inc-001'] }),
          'consolidate send-back 1': CONSOLIDATED,
          'check backlog 2': afterWith({})
        })

        expect(promptOf(run, 'consolidate send-back 1')).toContain(
          '- inc-001: a row built or set aside (not todo or blocked) changed.'
        )
        expect(run.result.stopped).toBeNull()
      })

      test('stops with snapshot-failed when the rows could not be saved', async () => {
        const run = await runRedistil({
          'coverage after reconcile': {
            ...BEFORE,
            snapshotOk: false,
            snapshotProblems: ['backlog.json is not valid JSON.']
          }
        })

        expect(run.result.stopped.reason).toBe('snapshot-failed')
        expect(labelsOf(run)).not.toContain('consolidate')
      })

      test('stops with consolidate-failed when a row stays removed after two send-backs', async () => {
        const removed = afterWith({ removed: ['inc-001'] })
        const run = await runRedistil({
          'check backlog': removed,
          'consolidate send-back 1': CONSOLIDATED,
          'check backlog 2': removed,
          'consolidate send-back 2': CONSOLIDATED,
          'check backlog 3': removed
        })

        expect(run.result.stopped.reason).toBe('consolidate-failed')
        expect(run.result.stopped.detail).toContain(
          'backlog.json no longer has inc-001. Keep every existing row.'
        )
        expect(labelsOf(run)).not.toContain('report')
      })
    })

    test('sends the consolidator back with the backlog check problems', async () => {
      const run = await runDistil(
        {},
        {
          'check backlog': {
            ...BACKLOG_OK,
            backlogCheckOk: false,
            backlogCheckProblems: [
              'inc-002 depends on inc-009, which is not in the backlog.'
            ]
          },
          'consolidate send-back 1': CONSOLIDATED,
          'check backlog 2': BACKLOG_OK
        }
      )

      expect(promptOf(run, 'consolidate send-back 1')).toContain(
        '- inc-002 depends on inc-009, which is not in the backlog.'
      )
    })
  })

  test('drafts the report again once when the first report agent returns nothing', async () => {
    const run = await runDistil(
      {},
      {
        report: undefined,
        'report retry 1': { report: REPORT_TEXT, issues: [] }
      }
    )

    expect(run.result.stopped).toBeNull()
    expect(run.result.report).toBe(REPORT_TEXT)
  })

  test('reports report-failed, with everything else, when both report agents return nothing', async () => {
    const run = await runDistil({}, { report: undefined })

    expect(labelsOf(run).slice(-2)).toEqual(['report', 'report retry 1'])
    expect(run.result.stopped.reason).toBe('report-failed')
    expect(run.result.backlog.total).toBe(2)
    expect(run.result.report).toBeNull()
  })
})
