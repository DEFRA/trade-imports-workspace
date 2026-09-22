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

// Every key the loop requires under `lifecycle: 'local'` (the always-required
// ones), used to prove "no args at all" names each of them — not merely that
// it throws.
const REQUIRED_KEYS_BY_SCRIPT = {
  'increment-build-loop.js': [
    'workarea',
    'branch',
    'scope',
    'executor',
    'lifecycle',
    'planOnly',
    'repos',
    'models',
    'increments'
  ],
  'args-canary.js': ['list', 'n']
}

const LOCAL_ARGS = {
  workarea: 'shared/args-fixture',
  branch: 'spike/args-fixture',
  scope: 'args-fixture',
  executor: 'claude',
  lifecycle: 'local',
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
  models: { light: 'fixture-light' },
  increments: ['inc-900']
}

const WORKSPACE_ANSWER = {
  ok: true,
  abs: '/ws',
  tilde: '~/ws',
  canonical: true,
  summary: 'resolved'
}

const withoutKey = (object, key) =>
  Object.fromEntries(
    Object.entries(object).filter(([entryKey]) => entryKey !== key)
  )

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
      args: JSON.stringify(LOCAL_ARGS),
      answers: [WORKSPACE_ANSWER, null]
    })

  test('resolves a JSON-string args to the same configuration as object args', async () => {
    const run = await runJsonStringArgs()

    expect(run.logs[0]).toBe(
      `increment-build-loop: resolved configuration ${JSON.stringify(LOCAL_ARGS)}`
    )
  })

  test('selects the light model for the workspace-resolution agent', async () => {
    const run = await runJsonStringArgs()

    expect(run.agents[0].options.model).toBe('fixture-light')
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
      args: LOCAL_ARGS,
      answers: [WORKSPACE_ANSWER, null]
    })

    expect(run.logs[0]).toBe(
      `increment-build-loop: resolved configuration ${JSON.stringify(LOCAL_ARGS)}`
    )
  })

  test('stops before any agent when increments is missing, the reproduced failure', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: JSON.stringify(withoutKey(LOCAL_ARGS, 'increments'))
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key increments. Pass every one in args: this workflow has no defaults'
    )
    expect(run.agents).toEqual([])
  })

  test('names every Jira and CI key a full lifecycle needs', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...LOCAL_ARGS, lifecycle: 'full' }
    })

    expect(run.error.message).toContain(
      'keys jiraProject, epic, jiraInProgressStatus, jiraDoneStatus, jiraBoard, ciFixAttempts, ciWatchMinutes, requireApproval, approvalWaitMinutes'
    )
    expect(run.agents).toEqual([])
  })

  test('does not require Jira keys for a local lifecycle', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: LOCAL_ARGS,
      answers: [WORKSPACE_ANSWER, null]
    })

    expect(run.logs[0]).toMatch(/^increment-build-loop: resolved configuration/)
    expect(run.agents.length).toBe(2)
  })

  test('refuses an empty increments list after logging the configuration', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...LOCAL_ARGS, increments: [] }
    })

    expect(run.error.message).toContain(
      'config.increments must be a non-empty list'
    )
    expect(run.logs.length).toBe(1)
    expect(run.agents).toEqual([])
  })

  test('refuses a models value that is not an object', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...LOCAL_ARGS, models: null }
    })

    expect(run.error.message).toContain('config.models must be an object')
    expect(run.agents).toEqual([])
  })

  test('refuses a scope it would once have derived', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: withoutKey(LOCAL_ARGS, 'scope')
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key scope. Pass every one in args: this workflow has no defaults'
    )
  })

  test('refuses a planOnly that is not a boolean', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...LOCAL_ARGS, planOnly: 'yes' }
    })

    expect(run.error.message).toBe(
      'increment-build-loop: config.planOnly must be a boolean — got "yes"'
    )
    expect(run.agents).toEqual([])
  })

  const runPlanOnly = () =>
    runWorkflowScript(scriptPath, {
      args: { ...LOCAL_ARGS, planOnly: true },
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
      ]
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
      args: withoutKey(LOCAL_ARGS, 'executor')
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key executor. Pass every one in args: this workflow has no defaults'
    )
  })

  describe('under a local lifecycle', () => {
    const PREFLIGHT_ANSWER = { ok: true, summary: '1' }

    const runToBaseline = () =>
      runWorkflowScript(scriptPath, {
        args: LOCAL_ARGS,
        answers: [WORKSPACE_ANSWER, PREFLIGHT_ANSWER, null]
      })

    const baselinePrompt = async () => {
      const run = await runToBaseline()
      return run.agents.find(
        (entry) => entry.options.label === 'inc-900 baseline'
      ).prompt
    }

    test('goes from preflight straight to the baseline, with no ticket or branch stage', async () => {
      const run = await runToBaseline()

      expect(run.agents.map((entry) => entry.options.label)).toEqual([
        'workspace',
        'preflight',
        'inc-900 baseline'
      ])
    })

    test('does not tell the baseline to refuse a repo on the branch the run was given', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).not.toContain(
        'if ANY repo is on `spike/args-fixture`, stop and report ok:false'
      )
    })

    test('tells the baseline every repo must be on the branch the run was given', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain(
        'EVERY repo must be on `spike/args-fixture`, the branch this run was given'
      )
    })

    test('tells the baseline to refuse a repo on main or master', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain('NO repo may be on\n   `main` or `master`')
    })

    test('refuses main as the branch to build on before any agent', async () => {
      const run = await runWorkflowScript(scriptPath, {
        args: { ...LOCAL_ARGS, branch: 'main' }
      })

      expect(run.error.message).toContain(
        'lifecycle "local" commits every increment straight onto config.branch, so it must be a scratch branch, not "main"'
      )
      expect(run.agents).toEqual([])
    })

    test('refuses master as the branch to build on before any agent', async () => {
      const run = await runWorkflowScript(scriptPath, {
        args: { ...LOCAL_ARGS, branch: 'master' }
      })

      expect(run.error.message).toContain('not "master"')
      expect(run.agents).toEqual([])
    })

    test('still plans against main when planOnly is true', async () => {
      const run = await runWorkflowScript(scriptPath, {
        args: { ...LOCAL_ARGS, branch: 'main', planOnly: true },
        answers: [WORKSPACE_ANSWER, PREFLIGHT_ANSWER, null]
      })

      expect(run.result.increments[0].outcome).toBe('plan-refused')
    })
  })

  describe('under a full lifecycle', () => {
    const FULL_ARGS = {
      ...LOCAL_ARGS,
      branch: 'main',
      lifecycle: 'full',
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

    const TICKET_ANSWER = {
      ok: true,
      key: 'EUDPA-900',
      created: false,
      movedToBoard: true,
      branch: 'feat/EUDPA-900-fixture',
      repos: ['backend', 'tests', 'frontend'],
      resumeAt: 'build',
      status: 'In Progress',
      summary: 'reused'
    }

    const baselinePrompt = async () => {
      const run = await runWorkflowScript(scriptPath, {
        args: FULL_ARGS,
        answers: [
          WORKSPACE_ANSWER,
          { ok: true, summary: '1' },
          TICKET_ANSWER,
          { ok: true, summary: 'branched' },
          null
        ]
      })
      return run.agents.find(
        (entry) => entry.options.label === 'inc-900 baseline'
      ).prompt
    }

    test('still tells the baseline to refuse a repo on the base branch', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain(
        'if ANY repo is on `main`, stop and report ok:false naming it'
      )
    })
  })
})
