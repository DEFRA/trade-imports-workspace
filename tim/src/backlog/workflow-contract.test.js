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
  'args-canary.js': ['list', 'n']
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
  test('finds at least the build loop and the canary', () => {
    const names = workflowScripts().map((script) => script.name)

    expect(names).toEqual(
      expect.arrayContaining(['increment-build-loop.js', 'args-canary.js'])
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

      test('runs on the claude executor only', async () => {
        const run = await runWorkflowScript(scriptPath, {
          args: { ...BRANCH_ARGS, executor: 'codex' }
        })

        expect(run.error.message).toContain(
          'lifecycle "branch" runs on executor "claude" only'
        )
      })

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
})
