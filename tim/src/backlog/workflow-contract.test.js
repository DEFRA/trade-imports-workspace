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

const textBetween = (source, startMarker, endMarker) =>
  source.slice(
    source.indexOf(startMarker) + startMarker.length,
    source.indexOf(endMarker)
  )

const houseRulesInRulesFile = (rules) =>
  textBetween(
    rules,
    '<!-- house-rules:start -->\n',
    '\n<!-- house-rules:end -->'
  )

const houseRulesInLoop = (loop) => {
  const block = textBetween(loop, '// >>> house-rules', '// <<< house-rules')
  const literal = block.slice(block.indexOf('`') + 1, block.lastIndexOf('`'))
  return literal.replaceAll('\\`', '`').replaceAll('\\${', '${')
}

const wordsInJsArray = (source, name) => {
  const [, items] = source.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`))
  return [...items.matchAll(/'([^']+)'/g)].map(([, word]) => word)
}

const wordsInShellArray = (source, name) => {
  const [, items] = source.match(new RegExp(`^${name}=\\(([^)]*)\\)`, 'm'))
  return items.trim().split(/\s+/)
}

const findingCategoriesOf = (source, wordsInArray) => ({
  functional: wordsInArray(source, 'FUNCTIONAL_CATEGORIES'),
  codeQuality: wordsInArray(source, 'CODE_QUALITY_CATEGORIES'),
  design: wordsInArray(source, 'DESIGN_CATEGORIES')
})

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
    'jiraInDevStatus',
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
  'jiraInDevStatus',
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
      path: 'repos/trade-imports-ins-tests',
      github: 'DEFRA/trade-imports-ins-tests'
    }
  },
  models: { light: 'sonnet' },
  increments: ['inc-900'],
  stopAfter: 1,
  jiraProject: 'EUDPA',
  epic: 'EUDPA-1',
  jiraInDevStatus: 'In Dev',
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
  startedAt: '20261001T090000Z',
  machineConfig: null,
  workers: {},
  summary: 'resolved'
}

const RUN_ID = 'ibl-20261001T090000Z'

const LEASE_ACQUIRED = {
  acquired: true,
  refused: false,
  holder: null,
  summary: `Started the workspace stack in dev mode and leased it to "${RUN_ID}".`
}
const LEASE_RELEASED = { ok: true, summary: 'released' }
const ACQUIRE_LABEL = 'run lease:acquire'
const RELEASE_LABEL = 'run lease:release'
const isRunLease = (label) => /^run lease:/.test(label ?? '')

const NO_THEME = {
  exitCode: 0,
  stdout: '{"theme":null,"rows":0,"todo":0,"built":[],"otherRepos":[]}'
}
const isThemeCheck = (label) => / theme$|^spec check:/.test(label ?? '')
const themeAnswer = (themeAnswers, label) => {
  if (label in themeAnswers) return themeAnswers[label]
  return / theme$/.test(label) ? NO_THEME : null
}

const PLAN_LINT_CLEAN = { exitCode: 1, stdout: '' }
const PLAN_APPROVED = { approved: true, findings: [], summary: 'approved' }
const PLAN_REVIEW_RECORDED = { written: true, summary: 'written' }
const isPlanCheck = (label) =>
  / (plan|replan|revise plan) lint$| plan review( 2| record)?$/.test(
    label ?? ''
  )
const planCheckAnswer = (planAnswers, label) => {
  if (label in planAnswers) return planAnswers[label]
  if (/ lint$/.test(label)) return PLAN_LINT_CLEAN
  return / record$/.test(label) ? PLAN_REVIEW_RECORDED : PLAN_APPROVED
}

const answeringRunLease = (
  answers,
  leaseAnswers = {},
  themeAnswers = {},
  planAnswers = {}
) => {
  let acquires = 0
  const acquireAnswer = () => {
    acquires += 1
    const first = leaseAnswers.acquire ?? LEASE_ACQUIRED
    return acquires > 1 ? (leaseAnswers.reacquire ?? first) : first
  }
  const leaseAnswer = (label) =>
    label === ACQUIRE_LABEL
      ? acquireAnswer()
      : (leaseAnswers.release ?? LEASE_RELEASED)
  const answerOwnStage = (label) => {
    if (isRunLease(label)) return leaseAnswer(label)
    if (isPlanCheck(label)) return planCheckAnswer(planAnswers, label)
    return themeAnswer(themeAnswers, label)
  }
  const isOwnStage = (label) =>
    isRunLease(label) || isThemeCheck(label) || isPlanCheck(label)
  if (typeof answers === 'function') {
    return (prompt, options) =>
      isOwnStage(options.label)
        ? answerOwnStage(options.label)
        : answers(prompt, options)
  }
  let next = 0
  return (prompt, options) => {
    if (isOwnStage(options.label)) return answerOwnStage(options.label)
    const answer = next < answers.length ? answers[next] : null
    next += 1
    return answer
  }
}

const stageLabels = (run) =>
  run.agents
    .map((entry) => entry.options.label)
    .filter((label) => !isRunLease(label))

const runLoop = (
  path,
  { answers = [], lease, themes, plans, ...options } = {}
) =>
  runWorkflowScript(path, {
    ...options,
    answers: answeringRunLease(answers, lease, themes, plans)
  })

const startAnswer = (result) => ({
  exitCode: result.failedStep ? 1 : 0,
  stdout: JSON.stringify({
    ok: !result.failedStep,
    schema_version: 1,
    tim_version: '0.0.0',
    result,
    errors: result.failedStep
      ? [
          {
            code: `${result.failedStep.toUpperCase()}_FAILED`,
            message: result.reason
          }
        ]
      : []
  })
})

const startedResult = (fields = {}) => ({
  workarea: 'shared/args-fixture',
  id: 'inc-900',
  repeat: false,
  ticket: {
    key: 'EUDPA-900',
    created: false,
    status: 'In Dev',
    movedToBoard: true,
    warnings: []
  },
  branch: 'feat/EUDPA-900-fixture',
  repos: ['backend', 'tests', 'frontend'],
  resumeAt: 'build',
  branched: [],
  warnings: [],
  failedStep: null,
  reason: null,
  ...fields
})

const NOTHING_STARTED = {
  ticket: null,
  branch: null,
  repos: null,
  resumeAt: null
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

  test('the build loop carries the house rules exactly as .claude/rules/code-quality.md states them', () => {
    const loop = readFileSync(
      join(buildLoopDir, 'increment-build-loop.js'),
      'utf8'
    )
    const rules = readFileSync(
      join(workspaceRoot, '.claude', 'rules', 'code-quality.md'),
      'utf8'
    )

    expect(houseRulesInLoop(loop)).toBe(houseRulesInRulesFile(rules))
  })

  test('the review and code-style tools accept exactly the finding categories the build loop verifies by', () => {
    const loop = readFileSync(
      join(buildLoopDir, 'increment-build-loop.js'),
      'utf8'
    )
    const tools = readFileSync(
      join(workspaceRoot, 'tools', 'review', 'finding-categories.sh'),
      'utf8'
    )

    expect(findingCategoriesOf(tools, wordsInShellArray)).toEqual(
      findingCategoriesOf(loop, wordsInJsArray)
    )
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
    runLoop(scriptPath, {
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
    const run = await runLoop(scriptPath, {
      args: BASE_ARGS,
      answers: [WORKSPACE_ANSWER, null]
    })

    expect(run.logs[0]).toBe(
      `increment-build-loop: resolved configuration ${JSON.stringify(BASE_ARGS)}`
    )
  })

  test('stops before any agent when increments is missing, the reproduced failure', async () => {
    const run = await runLoop(scriptPath, {
      args: JSON.stringify(withoutKey(BASE_ARGS, 'increments'))
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key increments. Pass every one in args: this workflow has no defaults'
    )
    expect(run.agents).toEqual([])
  })

  test('names every Jira and CI key the loop needs', async () => {
    const run = await runLoop(scriptPath, {
      args: withoutKeys(BASE_ARGS, JIRA_AND_CI_KEYS)
    })

    expect(run.error.message).toContain(
      'keys jiraProject, epic, jiraInDevStatus, jiraDoneStatus, jiraBoard, ciFixAttempts, ciWatchMinutes, requireApproval, approvalWaitMinutes'
    )
    expect(run.agents).toEqual([])
  })

  test('refuses an empty increments list after logging the configuration', async () => {
    const run = await runLoop(scriptPath, {
      args: { ...BASE_ARGS, increments: [] }
    })

    expect(run.error.message).toContain(
      'config.increments must be null to drain the backlog, or a non-empty list of increment ids'
    )
    expect(run.logs.length).toBe(1)
    expect(run.agents).toEqual([])
  })

  test('stops before any agent when stopAfter is missing', async () => {
    const run = await runLoop(scriptPath, {
      args: withoutKey(BASE_ARGS, 'stopAfter')
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key stopAfter. Pass every one in args: this workflow has no defaults'
    )
    expect(run.agents).toEqual([])
  })

  test('refuses a stopAfter that would never stop the run', async () => {
    const run = await runLoop(scriptPath, {
      args: { ...BASE_ARGS, stopAfter: 0 }
    })

    expect(run.error.message).toBe(
      'increment-build-loop: config.stopAfter must be a positive integer or "all" — it counts increments that LANDED. Got 0'
    )
    expect(run.agents).toEqual([])
  })

  test('accepts stopAfter "all" and carries on to the backlog', async () => {
    const run = await runLoop(scriptPath, {
      args: { ...BASE_ARGS, stopAfter: 'all' },
      answers: [WORKSPACE_ANSWER, null]
    })

    expect(run.error.message).toContain('no readable backlog')
  })

  test('refuses planOnly without an explicit increments list', async () => {
    const run = await runLoop(scriptPath, {
      args: { ...BASE_ARGS, planOnly: true, increments: null }
    })

    expect(run.error.message).toContain(
      'config.planOnly needs an explicit config.increments list'
    )
    expect(run.agents).toEqual([])
  })

  test('refuses a models value that is not an object', async () => {
    const run = await runLoop(scriptPath, {
      args: { ...BASE_ARGS, models: null }
    })

    expect(run.error.message).toContain('config.models must be an object')
    expect(run.agents).toEqual([])
  })

  describe('the models config', () => {
    const runPlanOnlyWithModels = (models) =>
      runLoop(scriptPath, {
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
    const run = await runLoop(scriptPath, {
      args: withoutKey(BASE_ARGS, 'scope')
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key scope. Pass every one in args: this workflow has no defaults'
    )
  })

  test('refuses a planOnly that is not a boolean', async () => {
    const run = await runLoop(scriptPath, {
      args: { ...BASE_ARGS, planOnly: 'yes' }
    })

    expect(run.error.message).toBe(
      'increment-build-loop: config.planOnly must be a boolean — got "yes"'
    )
    expect(run.agents).toEqual([])
  })

  const runPlanOnly = () =>
    runLoop(scriptPath, {
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
          decisions: ['Filter in the backend query, not the frontend.'],
          followUps: []
        }
      ],
      reviewChecks: [],
      specChecks: [],
      refutedFindings: [],
      stopped: {
        reason: 'no-buildable',
        detail: 'the increments list is built out'
      }
    })
  })

  test('reports the follow-ups the plan and its review list, once each, when planOnly is true', async () => {
    const run = await runLoop(scriptPath, {
      args: { ...BASE_ARGS, planOnly: true },
      answers: [
        WORKSPACE_ANSWER,
        { ok: true, summary: '1' },
        {
          ok: true,
          summary: 'Planned in the frontend.',
          repos: ['frontend'],
          behaviourChanges: [],
          decisions: [],
          followUps: ['Delete the caller comments in origin/controller.js.']
        }
      ],
      plans: {
        'inc-900 plan review': {
          approved: true,
          findings: [],
          followUps: [
            'Delete the caller comments in origin/controller.js.',
            'Rename linesDroppedBy in commodity-type/controller.js.'
          ],
          summary: 'approved'
        }
      }
    })

    expect(run.result.increments[0].followUps).toEqual([
      'Delete the caller comments in origin/controller.js.',
      'Rename linesDroppedBy in commodity-type/controller.js.'
    ])
  })

  test('runs only the planner, its lint and its review when planOnly is true', async () => {
    const run = await runPlanOnly()

    expect(run.agents.map((entry) => entry.options.label)).toEqual([
      'workspace',
      'preflight',
      'inc-900 plan',
      'inc-900 plan lint',
      'inc-900 plan review'
    ])
  })

  test('tells the planner where to write the plan', async () => {
    const run = await runPlanOnly()

    expect(run.agents[2].prompt).toContain(
      'WRITE /ws/workareas/shared/args-fixture/plans/inc-900.md'
    )
  })

  test('refuses an executor it would once have defaulted', async () => {
    const run = await runLoop(scriptPath, {
      args: withoutKey(BASE_ARGS, 'executor')
    })

    expect(run.error.message).toBe(
      'increment-build-loop: args is missing required key executor. Pass every one in args: this workflow has no defaults'
    )
  })

  test('stops before any increment when the workspace agent reports no start time, which the run id needs', async () => {
    const run = await runLoop(scriptPath, {
      args: BASE_ARGS,
      answers: [{ ...WORKSPACE_ANSWER, startedAt: 'now' }]
    })

    expect(run.error.message).toContain(
      'the workspace agent reported no start time in the form 20261001T091500Z — got "now"'
    )
  })

  test('tells the workspace agent to report the time the run started', async () => {
    const run = await runJsonStringArgs()

    expect(run.agents[0].prompt).toContain(
      'Then run `date -u +%Y%m%dT%H%M%SZ` and report exactly what it printed as `startedAt`.'
    )
  })

  test('tells the workspace agent to copy this machine’s worker counts from tim', async () => {
    const run = await runJsonStringArgs()

    expect(run.agents[0].prompt).toContain(
      'Then run `tim build workers --workspace <the candidate path you used> --json` and copy its `result.config` as\n`machineConfig` and its `result.workers` as `workers`, every key and number exactly as printed.'
    )
  })

  test('stops before any increment when the workspace agent relays a worker count that is not a whole number', async () => {
    const run = await runLoop(scriptPath, {
      args: BASE_ARGS,
      answers: [
        {
          ...WORKSPACE_ANSWER,
          workers: { 'trade-imports-animals-frontend/fit': 'three' }
        }
      ]
    })

    expect(run.error.message).toContain(
      'the workspace agent relayed this machine\'s worker counts in the wrong shape — got {"trade-imports-animals-frontend/fit":"three"}'
    )
  })

  describe('the build stages', () => {
    const PREFLIGHT_ANSWER = { ok: true, summary: '1' }
    const WORK_BRANCH = 'feat/EUDPA-900-fixture'
    const START_ANSWER = startAnswer(startedResult())

    const runFrom = (...answers) =>
      runLoop(scriptPath, {
        args: BASE_ARGS,
        answers: [WORKSPACE_ANSWER, PREFLIGHT_ANSWER, START_ANSWER, ...answers]
      })

    const guardedPrompts = (run) =>
      run.agents
        .map(({ prompt }) => prompt)
        .filter((prompt) => prompt.includes('GUARD RAILS'))

    test('gives every guarded stage this machine’s worker count for each FIT and E2E rung it names', async () => {
      const run = await runLoop(scriptPath, {
        args: BASE_ARGS,
        answers: [
          {
            ...WORKSPACE_ANSWER,
            machineConfig: '/ws/config/machine.json',
            workers: {
              'trade-imports-animals-frontend/fit': 3,
              'trade-imports-ins-tests/e2e': 2
            }
          },
          PREFLIGHT_ANSWER,
          START_ANSWER,
          null
        ]
      })
      const prompts = guardedPrompts(run)

      expect({
        guarded: prompts.length > 0,
        everyNamesCounts: prompts.every(
          (prompt) =>
            prompt.includes(
              '    trade-imports-animals-frontend fit: `--workers=3`\n    trade-imports-ins-tests e2e: `--workers=2`'
            ) &&
            prompt.includes(
              "Run one FIT or E2E command at a time: never two repos' suites at once."
            )
        )
      }).toEqual({ guarded: true, everyNamesCounts: true })
    })

    test('names no worker counts when the machine has no settings file', async () => {
      const run = await runFrom(null)

      expect(
        guardedPrompts(run).some((prompt) =>
          prompt.includes("THIS MACHINE'S TEST WORKERS")
        )
      ).toBe(false)
    })

    const runFromWithArgs = (argsOverride, ...answers) =>
      runLoop(scriptPath, {
        args: { ...BASE_ARGS, ...argsOverride },
        answers: [WORKSPACE_ANSWER, PREFLIGHT_ANSWER, START_ANSWER, ...answers]
      })

    const runStartedWith = (result, ...answers) =>
      runLoop(scriptPath, {
        args: BASE_ARGS,
        answers: [
          WORKSPACE_ANSWER,
          PREFLIGHT_ANSWER,
          startAnswer(result),
          ...answers
        ]
      })

    const baselinePrompt = async () => {
      const run = await runFrom(null)
      return run.agents.find(
        (entry) => entry.options.label === 'inc-900 baseline'
      ).prompt
    }

    test('starts the increment with one tim build start call before the baseline', async () => {
      const run = await runFrom(null)

      expect(stageLabels(run)).toEqual([
        'workspace',
        'preflight',
        'inc-900 start',
        'inc-900 baseline'
      ])
    })

    test('runs tim build start with the run’s Jira config and the listed id', async () => {
      const run = await runFrom(null)

      expect(
        run.agents.find((entry) => entry.options.label === 'inc-900 start')
          .prompt
      ).toContain(
        '`tim build start shared/args-fixture --id inc-900 --base main --jira-project EUDPA --epic EUDPA-1 --in-dev-status "In Dev" --done-status "Done" --board 13780 --repos frontend,backend,tests --workspace ~/ws --json`'
      )
    })

    test('builds on the branch and repos tim build start reports', async () => {
      const run = await runFrom(null)

      expect(run.logs).toContain(
        'inc-900: EUDPA-900 (reused, In Dev) on board 13780, branch feat/EUDPA-900-fixture in backend, tests, frontend, resuming at build'
      )
    })

    test('stops with ticket-failed, naming tim’s reason, when the ticket step fails', async () => {
      const run = await runStartedWith({
        ...startedResult({ ticket: null, branch: null, repos: null }),
        failedStep: 'ticket',
        reason:
          'EUDPA-900 is To Do and offers no transition to "In Dev". The board offers (transition -> status): Start -> Doing.'
      })

      expect(run.result).toEqual({
        increments: [
          {
            id: 'inc-900',
            outcome: 'ticket-failed',
            detail:
              'EUDPA-900 is To Do and offers no transition to "In Dev". The board offers (transition -> status): Start -> Doing.'
          }
        ],
        reviewChecks: [],
        specChecks: [],
        refutedFindings: [],
        stopped: {
          reason: 'ticket-failed',
          detail:
            'inc-900: EUDPA-900 is To Do and offers no transition to "In Dev". The board offers (transition -> status): Start -> Doing.'
        }
      })
    })

    test('stops with ticket-failed when tim does not report the ticket on the board', async () => {
      const run = await runStartedWith(
        startedResult({
          ticket: { ...startedResult().ticket, movedToBoard: false }
        })
      )

      expect(run.result.stopped).toEqual({
        reason: 'ticket-failed',
        detail:
          'inc-900: EUDPA-900 is not on board 13780: tim build start did not report it moved there'
      })
    })

    test('stops with branch-failed, keeping the ticket, when the branch step fails', async () => {
      const run = await runStartedWith({
        ...startedResult(),
        failedStep: 'branch',
        reason: 'Nothing changed. frontend has uncommitted work: a.js.'
      })

      expect(run.result.increments).toEqual([
        {
          id: 'inc-900',
          ticket: 'EUDPA-900',
          outcome: 'branch-failed',
          detail: 'Nothing changed. frontend has uncommitted work: a.js.'
        }
      ])
    })

    test('stops with branch-failed when tim branched a repo the args do not configure', async () => {
      const run = await runStartedWith(
        startedResult({ repos: ['backend', 'gateway'] })
      )

      expect(run.result.stopped).toEqual({
        reason: 'branch-failed',
        detail:
          'inc-900: tim build start branched gateway, which the args do not configure'
      })
    })

    test('logs every warning tim build start gives', async () => {
      const run = await runStartedWith(
        startedResult({
          warnings: [
            'EUDPA-900 is already Done, but inc-900 is not done in the backlog. A human needs to look at that mismatch.'
          ]
        }),
        null
      )

      expect(run.logs).toContain(
        'inc-900: EUDPA-900 is already Done, but inc-900 is not done in the backlog. A human needs to look at that mismatch.'
      )
    })

    test('stops with derive-failed when the start agent copies no JSON', async () => {
      const run = await runLoop(scriptPath, {
        args: BASE_ARGS,
        answers: [
          WORKSPACE_ANSWER,
          PREFLIGHT_ANSWER,
          { exitCode: 127, stdout: 'zsh: command not found: tim' }
        ]
      })

      expect(run.result.stopped).toEqual({
        reason: 'derive-failed',
        detail:
          'tim build start printed no JSON (exit 127): zsh: command not found: tim'
      })
    })

    test('stops with derive-failed, quoting tim, when tim fails before any step', async () => {
      const run = await runLoop(scriptPath, {
        args: BASE_ARGS,
        answers: [
          WORKSPACE_ANSWER,
          PREFLIGHT_ANSWER,
          {
            exitCode: 2,
            stdout: JSON.stringify({
              ok: false,
              result: null,
              errors: [
                { code: 'USAGE', message: 'Give --epic, such as EUDPA-20628.' }
              ]
            })
          }
        ]
      })

      expect(run.result.stopped).toEqual({
        reason: 'derive-failed',
        detail: 'Give --epic, such as EUDPA-20628.'
      })
    })

    test('tells the baseline to refuse a repo on the base branch', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain(
        "if ANY of the increment's repos is on `main`, stop and report ok:false naming it"
      )
    })

    test('leaves branching to the branch stage, not the baseline', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).not.toContain('tim build branch')
    })

    test('tells the baseline to run the whole gate as one tim build gate call under the run’s lease, into its own logs', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain(
        `   1. \`tim build gate shared/args-fixture --phase all --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-baseline --holder "${RUN_ID}" --result ~/ws/workareas/shared/args-fixture/logs/inc-900-baseline/gate-result-all.json\``
      )
      expect(prompt).not.toContain('--phase e2e')
    })

    test('tells the baseline to wait on a gate that outlasts one Bash call rather than call it red', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain(
        '`tim build gate-wait <the --result file of that command> --workspace ~/ws --json`'
      )
      expect(prompt).not.toContain('or that hits the Bash timeout, is RED')
    })

    test('tells the baseline to hand back a stack somebody else holds rather than work round it', async () => {
      const prompt = await baselinePrompt()

      expect(prompt).toContain(
        "A gate command whose `result.stack.held` is not null found the workspace stack in somebody else's hands"
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
        category: 'correctness',
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
          .filter((label) => !isRunLease(label))

      const FIX_STAGE_ANSWERS = [
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
        },
        NO_FINDINGS
      ]

      const runThroughFixToLadder = () =>
        runFrom(
          BASELINE_ANSWER,
          PLAN_ANSWER,
          implementAnswer(['frontend:src/a.js']),
          ...FIX_STAGE_ANSWERS
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

      test('tells the ladder to run the whole gate as one tim build gate call under the run’s lease, into its own logs', async () => {
        const prompt = ladderPrompt(await runThroughFixToLadder())

        expect(prompt).toContain(
          `   1. \`tim build gate shared/args-fixture --phase all --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-ladder --holder "${RUN_ID}" --result ~/ws/workareas/shared/args-fixture/logs/inc-900-ladder/gate-result-all.json\``
        )
        expect(prompt).not.toContain('--phase e2e')
      })

      test('tells the ladder a rung green at baseline and red now is the increment’s to fix', async () => {
        const prompt = ladderPrompt(await runThroughFixToLadder())

        expect(prompt).toContain(
          "A rung green at baseline and red now is this\n   increment's to fix"
        )
      })

      test('tells the implementor and fixer to check themselves with the gate’s unit and FIT phases only, under the run’s lease', async () => {
        const run = await runThroughFixToLadder()

        expect(promptOf(run, 'inc-900 implement')).toContain(
          `\`tim build gate shared/args-fixture --phase unit --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-implement --holder "${RUN_ID}" --result ~/ws/workareas/shared/args-fixture/logs/inc-900-implement/gate-result-unit.json\``
        )
        expect(promptOf(run, 'inc-900 fix')).toContain(
          `\`tim build gate shared/args-fixture --phase fit --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-fix --holder "${RUN_ID}" --result ~/ws/workareas/shared/args-fixture/logs/inc-900-fix/gate-result-fit.json\``
        )
        expect(promptOf(run, 'inc-900 implement')).not.toContain('--phase e2e')
        expect(promptOf(run, 'inc-900 implement')).not.toContain('--phase all')
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

      test('tells every increment agent the workspace stack is the run’s, and never to start or stop it', async () => {
        const run = await runThroughFixToLadder()
        const unguarded = run.agents
          .filter(
            ({ options, prompt }) =>
              options.label.startsWith('inc-900 ') &&
              !prompt.includes(
                `THE WORKSPACE STACK IS LEASED TO THIS RUN, with \`tim docker lease\`, as \`${RUN_ID}\`.`
              )
          )
          .map(({ options }) => options.label)

        expect(unguarded).toEqual([])
      })

      test('tells every agent to take down any other compose project it starts', async () => {
        const run = await runThroughFixToLadder()

        expect(promptOf(run, 'inc-900 consistency')).toContain(
          "is followed, before you return, by that repo's own script that takes the\n  project down. Leave nothing running that you started."
        )
      })

      test('tells each stage that may use the stack that it is already up under the run’s lease', async () => {
        const run = await runThroughFixToLadder()

        expect(
          ['implement', 'consistency', 'fix', 'ladder'].map((stage) =>
            promptOf(run, `inc-900 ${stage}`).includes(
              `THE WORKSPACE STACK is already up, leased to this run as \`${RUN_ID}\` for every increment it builds.`
            )
          )
        ).toEqual([true, true, true, true])
      })

      test('tells no increment stage to take or give back a lease of its own', async () => {
        const run = await runThroughFixToLadder()
        const leasing = run.agents
          .filter(
            ({ options, prompt }) =>
              options.label.startsWith('inc-900 ') &&
              /tim docker lease (acquire|release) --holder/.test(prompt)
          )
          .map(({ options }) => options.label)

        expect(leasing).toEqual([])
      })

      test('runs no lease agent between stages of an increment', async () => {
        const run = await runThroughFixToLadder()
        const labels = run.agents.map((entry) => entry.options.label)

        expect(labels.filter((label) => /lease/.test(label))).toEqual([
          ACQUIRE_LABEL,
          RELEASE_LABEL
        ])
      })

      test('tells a stage to check the lease, not take it, when a check cannot reach the stack', async () => {
        const prompt = promptOf(
          await runThroughFixToLadder(),
          'inc-900 implement'
        )

        expect(prompt).toContain(
          'run `tim docker lease status --workspace ~/ws --json` once.'
        )
        expect(prompt).not.toContain('release before')
      })

      test('tells the consistency reviewer to run a stack check against the stack the run holds', async () => {
        const run = await runThroughFixToLadder()

        expect(promptOf(run, 'inc-900 consistency')).toContain(
          'A section 5 check that needs the workspace stack up runs against the\nstack the run already holds, as THE WORKSPACE STACK below says.'
        )
      })

      test('tells the planner a plan may name a stack check, and how to mark it', async () => {
        const run = await runThroughFixToLadder()

        expect(promptOf(run, 'inc-900 plan')).toContain(
          'Mark a check that needs\n      the workspace stack up "needs the workspace stack": the run holds the stack\'s lease and keeps it up for every\n      increment'
        )
      })

      test('keeps the integration proof on the gate’s E2E phase in the plan', async () => {
        const run = await runThroughFixToLadder()

        expect(promptOf(run, 'inc-900 plan')).toContain(
          "The integration proof is still the gate's E2E phase"
        )
      })

      describe('the house rules', () => {
        const RULES_POINTER =
          'The full rules and their detail: ~/ws/.claude/rules/code-quality.md — read it in full.'
        const A_RULE =
          '- No positional boolean flags. Bad: `saveActions(true, false)`. Good: `saveActions({ readOnly: true })`.'
        const CODE_STAGES = [
          'inc-900 plan',
          'inc-900 plan review',
          'inc-900 implement',
          'inc-900 style:frontend-javascript',
          'inc-900 review:frontend-javascript',
          'inc-900 consistency',
          'inc-900 verify:frontend-javascript',
          'inc-900 judge',
          'inc-900 fix',
          'inc-900 fix review',
          'inc-900 ladder'
        ]

        test('binds the rules and the pointer to the full file into every stage that plans, writes or judges code', async () => {
          const run = await runThroughFixToLadder()
          const unbound = CODE_STAGES.filter((label) => {
            const prompt = promptOf(run, label)
            return !prompt.includes(RULES_POINTER) || !prompt.includes(A_RULE)
          })

          expect(unbound).toEqual([])
        })

        test('names the 16 rules of the Node style guide to the style reviewer', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 style:frontend-javascript'
          )

          expect(prompt).toContain('Node → the\n16-rule style guide + JSDoc')
          expect(prompt).not.toContain('17-rule')
        })

        test('tells the verifier and the judge a house-rule breach is never taste', async () => {
          const run = await runThroughFixToLadder()

          expect(promptOf(run, 'inc-900 verify:frontend-javascript')).toContain(
            'A house-rule breach is never taste and never out of scope, whatever its kind.'
          )
          expect(promptOf(run, 'inc-900 judge')).toContain(
            'Code-quality findings are never weighed this way,\nand a house-rule breach is never taste.'
          )
        })

        test('tells the implementor to find and read in full the standards and repo docs a plan does not list', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 implement'
          ).replace(/\s+/g, ' ')

          expect(prompt).toContain(
            "Before you write to a file, read the rules, best-practice and repo docs the plan's section 16 lists for it. Where the plan lists none for a file you will touch, run `tim backlog standards --files <repoKey>:<path> --workspace ~/ws --json`"
          )
          expect(prompt).toContain(
            'read every rules, bestPractice and repoDocs file it lists. Read each one IN FULL with the Read tool: no offset or limit, and never `head`, `tail` or `sed` over it.'
          )
        })

        test('tells every stage that runs the gate to repair a red duplication rung in the shared test helper', async () => {
          const run = await runThroughFixToLadder()
          const REPAIR =
            'Repair it by moving that set-up into the shared test helper and deleting every copy, never by rewording a copy until it no longer matches.'
          const withoutRepair = [
            'inc-900 implement',
            'inc-900 fix',
            'inc-900 ladder'
          ].filter(
            (label) =>
              !promptOf(run, label).replace(/\s+/g, ' ').includes(REPAIR)
          )

          expect(withoutRepair).toEqual([])
        })
      })

      describe('what the reviewers look for', () => {
        const CHANGE_MAKES_FALSE =
          'A comment, doc comment or recipe line anywhere in a changed file that the\nchange makes false is a `comments` finding, whether or not the diff touches its line. Its fix is to delete it.'

        test('tells the code reviewer to predict what a name does and compare it with the body', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 review:frontend-javascript'
          )

          expect(prompt).toContain(
            'NAMING, predict then compare: for each function, method, parameter, variable and test the change adds or alters, read its\n  name, predict the value it returns and what it changes, then read its body. A value its value word does not cover (a\n  name that can return a code) or a change it hides is a `naming` finding. Nothing (null or undefined) and an expected\n  error such as not found are not mismatches, and a suffix that names them or a fallback (…OrNull, …OrNotFound) is\n  itself a `naming` finding. A name that predicts the value and the change is not a finding, even when another name\n  would read better.'
          )
        })

        test('tells the code reviewer support’s blind spot in an incident is a failure scenario', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 review:frontend-javascript'
          )

          expect(prompt).toContain(
            '"Support cannot tell\n  <what> during an incident" is a full failure scenario for a `logging` finding.'
          )
        })

        test('lets the code reviewer give the house rule a code-quality finding breaks as its reason, and skip only formatting', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 review:frontend-javascript'
          ).replace(/\s+/g, ' ')

          expect(prompt).toContain(
            'Report ONLY real findings, each with a concrete failure scenario or, for a code-quality finding, the house rule it breaks. Formatting nits belong to a different reviewer — skip them.'
          )
        })

        test('tells the code reviewer to hunt duplication and tests that cannot fail', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 review:frontend-javascript'
          )

          expect(prompt).toContain(
            'DUPLICATION: a second copy of a rule or of test set-up, and a second mechanism beside one the repo already has.'
          )
          expect(prompt).toContain(
            'TEST TRUTH: a test whose title claims more than its assertions check, and a test that cannot fail'
          )
        })

        test('puts what the change makes false in a changed file in every reviewer’s scope, fixed by deleting it', async () => {
          const run = await runThroughFixToLadder()
          const withoutRule = [
            'inc-900 style:frontend-javascript',
            'inc-900 review:frontend-javascript',
            'inc-900 consistency'
          ].filter(
            (label) => !promptOf(run, label).includes(CHANGE_MAKES_FALSE)
          )

          expect(withoutRule).toEqual([])
        })

        test('hands the consistency reviewer the implementor’s notes to judge against the code', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 consistency'
          ).replace(/\s+/g, ' ')

          expect(prompt).toContain(
            "THE IMPLEMENTOR'S NOTES — what it says it decided, changed from the plan, left alone or found wrong. Judge each claim against the code; a deviation from the plan with no sound reason, or a thing it left alone that this change makes untrue, is a finding: E2E left to the ladder."
          )
        })

        test('gives the consistency reviewer the repo’s docs and recipes from tim backlog standards', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 consistency'
          )

          expect(prompt).toContain(
            "THE REPO'S DOCS AND RECIPES. Run `tim backlog standards --files <repoKey>:<path> --workspace ~/ws --json` once,"
          )
          expect(prompt).toContain(
            "the repo's architecture docs and its add-a-* recipes."
          )
        })

        test('tells the consistency reviewer a doc outside the diff that still states the old rule is in scope', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 consistency'
          )

          expect(prompt).toContain(
            'LOOK FOR: a rule the change alters that a doc, recipe, JSDoc or test name OUTSIDE the diff still states the old way.'
          )
          expect(prompt).toContain(
            'report it at its file:line,\nand its fix is to update it or delete it;'
          )
        })
      })

      describe('verifying and judging findings by kind', () => {
        const NAMING_FINDING = {
          file: 'frontend:src/a.js',
          line: 7,
          severity: 'minor',
          category: 'naming',
          what: '`linesDroppedBy` returns the kept lines.',
          why: 'The name predicts the dropped lines.',
          fix: 'Rename it keepLinesAllowedBy.'
        }
        const RULED_RENAME = {
          decisions: [
            { what: 'rename', call: 'fix-now', reasoning: 'a house rule' }
          ],
          fixNow: ['Rename linesDroppedBy to keepLinesAllowedBy in src/a.js.'],
          summary: 'one fix'
        }
        const RENAMED = {
          ok: true,
          summary: 'Renamed it.',
          changedFiles: ['frontend:src/a.js'],
          notes: 'unit green',
          treesBeforeFix: [{ repo: 'frontend', tree: '4b825dc' }]
        }
        const REWORDED_COMMENT = {
          ...NAMING_FINDING,
          category: 'comments',
          what: 'The comment above it was reworded, not deleted.',
          fix: 'Delete the comment.'
        }
        const COMMENT_DELETED = { ok: true, summary: 'Deleted it.' }

        const runVerifying = (finding, verdict, ...after) =>
          runFrom(
            BASELINE_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js']),
            NO_FINDINGS,
            { findings: [finding] },
            NO_FINDINGS,
            { verdicts: [{ n: 1, ...verdict }] },
            ...after
          )

        const runThroughFixReview = (fixed, fixReview, ...after) =>
          runVerifying(
            NAMING_FINDING,
            { real: true, reasoning: 'src/a.js:7 returns kept' },
            RULED_RENAME,
            fixed,
            fixReview,
            ...after
          )

        const verifierPrompt = (run) =>
          promptOf(run, 'inc-900 verify:frontend-javascript')

        test('hands the verifier each finding with its category and kind', async () => {
          const run = await runVerifying(NAMING_FINDING, {
            real: true,
            reasoning: 'src/a.js:7'
          })

          expect(verifierPrompt(run)).toContain(
            '1. [minor] [naming, code quality] frontend:src/a.js line 7\n   WHAT: `linesDroppedBy` returns the kept lines.'
          )
        })

        test('tells the verifier a functional finding defaults to refuted', async () => {
          const prompt = verifierPrompt(await runThroughFixToLadder())

          expect(prompt).toContain('1. [major] [correctness, functional]')
          expect(prompt).toContain(
            'FUNCTIONAL (`correctness`, `security`, `error-handling`, `coverage-gap`): your job is to REFUTE it. Default to refuted unless the evidence is'
          )
        })

        test('tells the verifier a code-quality finding defaults to real, and what alone refutes one', async () => {
          const prompt = verifierPrompt(await runThroughFixToLadder())

          expect(prompt).toContain(
            'CODE QUALITY (`naming`, `comments`, `structure`, `duplication`, `logging`, `test-readability`, `history`): default to real.'
          )
          expect(prompt).toContain(
            'the copies differ, the name does predict what the code returns and what it changes, the comment is'
          )
          expect(prompt).toContain(
            '"a comparable file does it", "feature folders are independent" and the like are never'
          )
          expect(prompt).toContain(
            'A tool call that failed is not evidence: when you could not read the code, the finding is real.'
          )
        })

        test('keeps a code-quality finding refuted with no code quoted, and hands it to the judge', async () => {
          const run = await runVerifying(NAMING_FINDING, {
            real: false,
            reasoning: 'A rename is a matter of taste.'
          })

          expect(promptOf(run, 'inc-900 judge')).toContain(
            'SURVIVED VERIFICATION BECAUSE: REFUTED WITH NO CODE QUOTED, so this code-quality finding stands: A rename is a matter of taste.'
          )
          expect(run.result.refutedFindings).toEqual([])
        })

        test('hands a design finding to the judge as a question for the designer, never a fix', async () => {
          const run = await runVerifying(
            {
              file: 'frontend:src/delete.njk',
              line: 12,
              severity: 'minor',
              category: 'design',
              what: '"This action cannot be undone." is passive.',
              why: 'The prototype sets it; the GDS style guide asks for active voice.',
              fix: 'Ask the designer whether to say "You cannot undo this."'
            },
            {
              real: true,
              reasoning: 'The prototype delete page has the same words.'
            }
          )
          const judge = promptOf(run, 'inc-900 judge')

          expect(judge).toContain('[design, design] frontend:src/delete.njk:12')
          expect(judge).toContain(
            'Every design finding is defer-to-open-question, never fix-now: the code keeps what the design source sets. Start\n  its question with "For the designer:", ask it with the options it leaves, and carry the evidence into it: the design\n  source and the code at file:line (permalinks where the verifier gave them) and the guide rule\'s link.'
          )
        })

        test('tells the verifier to read the design source rather than refute a design finding unread', async () => {
          const run = await runVerifying(
            {
              file: 'frontend:src/edit.njk',
              line: 18,
              severity: 'minor',
              category: 'design',
              what: 'The edit page labels the name field differently from the add page.',
              why: 'The add page says "Name or organisation"; the edit page says "Name or organisation name".',
              fix: 'Ask the designer whether both pages should use one label.'
            },
            {
              real: true,
              reasoning: 'The prototype sets both labels, on two partials.'
            }
          )
          const verifier = promptOf(run, 'inc-900 verify:frontend-nunjucks')

          expect(verifier).toContain(
            'A source you did not read, or a finding that did\nnot read it, is never grounds to refute: read it.'
          )
        })

        test('returns a refuted functional finding with its reason, and judges nothing', async () => {
          const run = await runVerifying(FINDING, {
            real: false,
            reasoning: 'Saved in src/b.js:4.'
          })

          expect(run.result.refutedFindings).toEqual([
            {
              id: 'inc-900',
              file: 'frontend:src/a.js',
              category: 'correctness',
              severity: 'major',
              what: 'The origin is not saved.',
              reason: 'Saved in src/b.js:4.'
            }
          ])
          expect(stageLabels(run)).not.toContain('inc-900 judge')
        })

        test('returns a code-quality finding refuted by quoted code, with the quote', async () => {
          const run = await runVerifying(NAMING_FINDING, {
            real: false,
            reasoning: 'It returns the dropped lines.',
            quote: 'src/a.js:9 return removed'
          })

          expect(run.result.refutedFindings).toEqual([
            {
              id: 'inc-900',
              file: 'frontend:src/a.js',
              line: 7,
              category: 'naming',
              severity: 'minor',
              what: '`linesDroppedBy` returns the kept lines.',
              reason: 'It returns the dropped lines.',
              quote: 'src/a.js:9 return removed'
            }
          ])
        })

        test('tells the judge every code-quality finding is fixed now by delete, rename or extract', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 judge'
          )

          expect(prompt).toContain('code-quality finding is fix-now.')
          expect(prompt).toContain(
            'CODE-QUALITY FIXES are delete, rename or extract, never reword.'
          )
          expect(prompt).toContain('BIAS, for functional findings only:')
          expect(prompt).not.toContain('Reject freely')
        })

        test('tells the judge a code-quality fix reaches each twin, recording one outside the increment', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 judge'
          )

          expect(prompt).toContain(
            'TWINS. A code-quality fix reaches every twin of the file, not only the repo the finding names.'
          )
          expect(prompt).toContain(
            '(backend = repos/trade-imports-animals-backend, tests = repos/trade-imports-ins-tests, frontend = repos/trade-imports-animals-frontend)'
          )
          expect(prompt).toContain(
            "`tim backlog set shared/args-fixture inc-900 --open-question 'Twin fix: <twin repo and path> needs <the change>, as <the finding>' --workspace ~/ws --json`"
          )
        })

        test('tells the fixer to record what was staged before its first edit', async () => {
          const prompt = promptOf(await runThroughFixToLadder(), 'inc-900 fix')

          expect(prompt).toContain(
            'BEFORE YOUR FIRST EDIT in each repo, run `git -C <repoPath> write-tree` there once'
          )
        })

        test('re-reviews the fixer’s hunks before the ladder, read against the tree it recorded', async () => {
          const run = await runThroughFixReview(RENAMED, NO_FINDINGS)

          expect(labelsInPhase(run, 'Fix')).toEqual([
            'inc-900 fix',
            'inc-900 fix review'
          ])
          expect(promptOf(run, 'inc-900 fix review')).toContain(
            '- `git -C ~/ws/repos/trade-imports-animals-frontend diff-index --cached -p 4b825dc`'
          )
        })

        test('re-reviews every file the fixer changed when it recorded no tree', async () => {
          const run = await runThroughFixReview(
            withoutKey(RENAMED, 'treesBeforeFix'),
            NO_FINDINGS
          )

          expect(promptOf(run, 'inc-900 fix review')).toContain(
            "The fixer recorded no staged tree, so these diffs also hold the implementor's lines. Judge only the lines the\nruled fixes describe:\n- `git -C ~/ws/repos/trade-imports-animals-frontend diff --staged -- src/a.js`"
          )
        })

        test('sends a code-quality finding from the re-review back to the fixer once', async () => {
          const run = await runThroughFixReview(
            RENAMED,
            { findings: [REWORDED_COMMENT] },
            COMMENT_DELETED
          )

          expect(labelsInPhase(run, 'Fix')).toEqual([
            'inc-900 fix',
            'inc-900 fix review',
            'inc-900 fix 2'
          ])
          expect(promptOf(run, 'inc-900 fix 2')).toContain(
            '1. frontend:src/a.js:7 [comments] The comment above it was reworded, not deleted. Fix: Delete the comment.'
          )
        })

        test('hands the ladder what both fixes did', async () => {
          const run = await runThroughFixReview(
            RENAMED,
            { findings: [REWORDED_COMMENT] },
            COMMENT_DELETED
          )

          expect(ladderPrompt(run)).toContain(
            'FIXER — Renamed it. Then, after the style re-review of its hunks: Deleted it.'
          )
        })

        test('asks every reviewer for a category from the list the Codex findings schema offers', async () => {
          const schema = JSON.parse(
            readFileSync(
              join(buildLoopDir, 'codex', 'schemas', 'findings.json'),
              'utf8'
            )
          )
          const categories =
            schema.properties.findings.items.properties.category.enum
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 style:frontend-javascript'
          )

          expect(
            categories.filter((category) => !prompt.includes(`\`${category}\``))
          ).toEqual([])
        })
      })

      describe('the probes and docs lines', () => {
        const PROBES_NOTE = 'Probes: 2 full links, 2 red then green'
        const DOCS_NOTE =
          'Docs updated: none — searched origin in src/server/app/docs'

        const runWithImplementNotes = (notes) =>
          runFrom(
            BASELINE_ANSWER,
            PLAN_ANSWER,
            { ...implementAnswer(['frontend:src/a.js']), notes },
            ...FIX_STAGE_ANSWERS
          )

        test('tells the implementor to report a Probes line and a Docs updated line', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 implement'
          )

          expect(prompt).toContain(
            '`Probes: none — <reason>` when this row writes or upgrades no coverage link to "full".'
          )
          expect(prompt).toContain(
            '`Docs updated: <paths>`, or `Docs updated: none — searched <terms> in <dirs>`.'
          )
        })

        test('tells the implementor a probe runs a FIT test through test:fit:ci, clear of the leased stack', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 implement'
          ).replace(/\s+/g, ' ')

          expect(prompt).toContain(
            "a FIT test runs as `npm --prefix ~/ws/<repoPath> run test:fit:ci -- <spec file>`, never `test:fit`, with this machine's `--workers` count from GUARD RAILS after the spec file."
          )
        })

        test('hands the consistency reviewer both lines to judge, read from a bullet and a bold label', async () => {
          const run = await runWithImplementNotes(
            `Built it.\n- ${PROBES_NOTE}\n**Docs updated:** none — searched origin in src/server/app/docs`
          )

          expect(promptOf(run, 'inc-900 consistency')).toContain(
            `PROBES AND DOCS are part of the change. The implementor reported:\n   ${PROBES_NOTE}\n   ${DOCS_NOTE}\n`
          )
        })

        test('tells the ladder a row with neither line from either agent is red', async () => {
          const prompt = ladderPrompt(await runThroughFixToLadder())

          expect(prompt).toContain(
            "2b. PROBES AND DOCS. Every row reports a `Probes:` and a `Docs updated:` line. The implementor's:\n   Probes: (none reported)\n   Docs updated: (none reported)"
          )
          expect(prompt).toContain(
            'When NEITHER the implementor NOR the fixer reported one of these lines, that is a failure'
          )
        })

        test('hands the ladder the implementor’s lines and the fixer’s absence of them', async () => {
          const prompt = ladderPrompt(
            await runWithImplementNotes(
              `Built it.\n${PROBES_NOTE}\n${DOCS_NOTE}`
            )
          )

          expect(prompt).toContain(
            `The implementor's:\n   ${PROBES_NOTE}\n   ${DOCS_NOTE}\n   The fixer's: Probes: (none reported); Docs updated: (none reported)`
          )
        })
      })

      describe('keeping the Behaviour Spec current', () => {
        const SPEC_SYNC_NOTE =
          'Spec sync: live-animals/journey-pages/origin-of-import (2 scenarios) — validate green, lint clean'

        const runWithImplementNotes = (notes) =>
          runFrom(BASELINE_ANSWER, PLAN_ANSWER, {
            ...implementAnswer(['frontend:src/a.js']),
            notes
          })

        test('gives every plan a spec sync section, naming the prefix by repo and set', async () => {
          const prompt = promptOf(await runThroughFixToLadder(), 'inc-900 plan')

          expect({
            section: prompt.includes(
              '8. Spec sync — every row has one, whatever its repos.'
            ),
            germinal: prompt.includes(
              'under `sets/germinal-products`\n  → `germinal-products/`. They are sibling sets'
            ),
            insRepos: prompt.includes(
              '`trade-imports-ins-frontend`, `trade-imports-ins-backend` and `trade-imports-address-book` → `ins/`.'
            ),
            asksForPrefixes: prompt.includes(
              'specPrefixes (the prefixes section 8 writes under, [] for none)'
            )
          }).toEqual({
            section: true,
            germinal: true,
            insRepos: true,
            asksForPrefixes: true
          })
        })

        test('tells the planner which spec namespace each frontend-change set writes', async () => {
          const prompt = promptOf(await runThroughFixToLadder(), 'inc-900 plan')

          expect(prompt).toContain(
            '       - frontend (`repos/trade-imports-animals-frontend`): `sets/live-animals` → spec namespace `live-animals/`, `sets/germinal-products` → spec namespace `germinal-products/`'
          )
        })

        test('says precisely which wording, content and layout changes the spec records', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 implement'
          )

          expect(prompt).toContain(
            "So a WORDING change is spec'd wherever a title, a Purpose, a requirement or a scenario\nstates that wording"
          )
          expect(prompt).toContain(
            'and pure styling (spacing, colour, a class)\nthat changes none of those is not.'
          )
        })

        test('tells every implementor to keep the spec current and validate it, whatever its repos', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 implement'
          )

          expect(prompt).toContain(
            'THE BEHAVIOUR SPEC — EVERY ROW KEEPS IT CURRENT, whatever its repos.'
          )
          expect(prompt).toContain(
            '`~/ws/tools/frontend-change/openspec-validate.sh --root ~/ws <capability path> [<capability path> ...]`'
          )
          expect(prompt).toContain(
            'Either exiting non-zero means the row is NOT complete'
          )
        })

        test('tells the implementor to report a spec sync line, none with its reason included', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 implement'
          )

          expect(prompt).toContain('`Spec sync: none — <reason>`')
        })

        test('hands the consistency reviewer the implementor’s spec sync line to judge', async () => {
          const run = await runWithImplementNotes(
            `Built it.\n${SPEC_SYNC_NOTE}`
          )
          const prompt = promptOf(run, 'inc-900 consistency')

          expect(prompt).toContain(
            `The implementor reported:\n   ${SPEC_SYNC_NOTE}`
          )
          expect(prompt).toContain(
            "a `Spec sync: none` whose reason does not hold against the plan's\nbehaviour changes"
          )
        })

        test('reads a spec sync line written as a bullet', async () => {
          const run = await runWithImplementNotes(
            `Built it.\n- ${SPEC_SYNC_NOTE}`
          )

          expect(promptOf(run, 'inc-900 consistency')).toContain(
            `The implementor reported:\n   ${SPEC_SYNC_NOTE}\n`
          )
        })

        test('reads a spec sync line with a bold label, dropping the markers', async () => {
          const run = await runWithImplementNotes(
            'Built it.\n**Spec sync:** none — only spacing changed'
          )

          expect(promptOf(run, 'inc-900 consistency')).toContain(
            'The implementor reported:\n   Spec sync: none — only spacing changed\n'
          )
        })

        test('tells the ladder a row with no spec sync line from either agent is red', async () => {
          const prompt = ladderPrompt(await runThroughFixToLadder())

          expect(prompt).toContain(
            "2a. THE SPEC SYNC. Every row reports a `Spec sync:` line. The implementor's:\n   (none reported)"
          )
          expect(prompt).toContain(
            'When NEITHER the implementor NOR the fixer reported a `Spec sync:` line, that is a failure: put "no spec sync\n   reported" in failures[].'
          )
        })

        test('tells the ladder a fixer with no spec sync line is normal when the implementor reported one', async () => {
          const run = await runFrom(
            BASELINE_ANSWER,
            PLAN_ANSWER,
            {
              ...implementAnswer(['frontend:src/a.js']),
              notes: `Built it.\n${SPEC_SYNC_NOTE}`
            },
            ...FIX_STAGE_ANSWERS
          )
          const prompt = ladderPrompt(run)

          expect(prompt).toContain(
            `The implementor's:\n   ${SPEC_SYNC_NOTE}\n   The fixer's: (none reported)`
          )
          expect(prompt).toContain(
            'A fixer with no line is normal when the implementor reported one'
          )
        })

        test('tells the implementor to mark a deleted capability and confirm it is gone rather than validate it', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 implement'
          )

          expect(prompt).toContain(
            'each one removed as `deleted: <capability path>`'
          )
          expect(prompt).toContain(
            'A capability you deleted is not validated: confirm it is gone\n   with `ls ~/ws/openspec/specs/<capability path>`, which must fail.'
          )
        })

        test('tells the ladder to validate only the capabilities that still exist', async () => {
          const prompt = ladderPrompt(await runThroughFixToLadder())

          expect(prompt).toContain(
            'A path marked `deleted:` is not validated: confirm it is gone with `ls ~/ws/openspec/specs/<capability path>`,\n   which must fail'
          )
        })

        test('tells the ladder a timed-out spec is a failure to repair, even when its retry passed', async () => {
          const prompt = ladderPrompt(await runThroughFixToLadder())

          expect(prompt).toContain(
            'a green rung whose only retries are those IS a pass, but say so explicitly. That exception covers nothing else.'
          )
          expect(prompt).toContain(
            'spec that hit "Test timeout of …ms exceeded", even once and even if its retry passed, is a failure you repair'
          )
          expect(prompt).toContain(
            'never cut a step or an assertion to make it fit.'
          )
        })

        test('tells the ladder to validate the spec write again', async () => {
          const prompt = ladderPrompt(await runThroughFixToLadder())

          expect(prompt).toContain(
            '`~/ws/tools/frontend-change/openspec-validate.sh --root ~/ws <capability path> [...] > ~/ws/workareas/shared/args-fixture/logs/inc-900-ladder-spec-validate.log 2>&1`'
          )
        })

        test('tells the fixer to keep the spec in step with its fix', async () => {
          const prompt = promptOf(await runThroughFixToLadder(), 'inc-900 fix')

          expect(prompt).toContain(
            'THE BEHAVIOUR SPEC: a fix that changes observable behaviour keeps `~/ws/openspec/` in step'
          )
        })

        describe('a spec failure that predates the row, in a capability it writes', () => {
          const WHOLE_CAPABILITY =
            "a failure in a\n   capability this row writes is this row's to fix even where it predates the row"
          const NEVER_LEFT =
            'never report such a failure as pre-existing and leave it.'

          test('is the implementor’s to fix', async () => {
            const prompt = promptOf(
              await runThroughFixToLadder(),
              'inc-900 implement'
            )

            expect(prompt).toContain(WHOLE_CAPABILITY)
            expect(prompt).toContain(NEVER_LEFT)
          })

          test('is the fixer’s to fix', async () => {
            const prompt = promptOf(
              await runThroughFixToLadder(),
              'inc-900 fix'
            )

            expect(prompt).toContain(WHOLE_CAPABILITY)
            expect(prompt).toContain(NEVER_LEFT)
          })

          test('is the ladder’s to repair', async () => {
            const prompt = ladderPrompt(await runThroughFixToLadder())

            expect(prompt).toContain(WHOLE_CAPABILITY)
            expect(prompt).toContain(NEVER_LEFT)
          })
        })
      })

      describe('the command forms a plan check may take', () => {
        const CURL_CHECK = 'curl -s http://localhost:8087/latency-profiles'
        const PREFIX_CHECK =
          'STUB_PROFILE=fast npm --prefix ~/ws/repos/trade-imports-stub run start'
        const SCRIPT_CHECK = 'bash scripts/stack/run-stack.sh --help'
        const NPM_CHECK =
          'npm --prefix ~/ws/repos/trade-imports-animals-frontend test -- src/a.test.js'

        const planWithChecks = (...commands) => ({
          ...PLAN_ANSWER,
          checks: commands.map((command) => ({ section: 6, command }))
        })

        test('tells the planner the forms a check takes: npm scripts, tim and tests', async () => {
          const prompt = promptOf(await runThroughFixToLadder(), 'inc-900 plan')

          expect(prompt).toContain(
            "  - the repo's own npm script: `npm --prefix ~/ws/<repoPath> run <script>` or `npm --prefix ~/ws/<repoPath> test -- <file>`;"
          )
          expect(prompt).toContain('  - a `tim` command;')
          expect(prompt).toContain(
            "  - a k6 run through the repo's own npm script, which reads its endpoints itself;"
          )
        })

        test('tells the planner a check never uses curl, a variable prefix or bash <script>', async () => {
          const prompt = promptOf(await runThroughFixToLadder(), 'inc-900 plan')

          expect(prompt).toContain(
            'A check never takes a form GUARD RAILS lists as DENIED: no `curl` or `wget`, no `env` or `VAR=value` prefix, no\n`bash <script>`, `bash -n` or `sh <script>`, no bare `node` or `node -e`, no python.'
          )
          expect(prompt).toContain(
            'Where a check must read a live endpoint on the stack, name the npm script or test that already makes that read.'
          )
        })

        test('lists every program the workspace denies in every increment agent’s guard rails', async () => {
          const run = await runThroughFixToLadder()
          const unguarded = run.agents
            .filter(
              ({ options, prompt }) =>
                options.label.startsWith('inc-900 ') &&
                ![
                  '`curl`',
                  '`wget`',
                  '`bash`',
                  '`sh`',
                  '`node`',
                  '`env`',
                  '`python`'
                ].every(
                  (program) =>
                    prompt.includes(
                      '- DENIED, so never run them and never write them into a plan:'
                    ) && prompt.includes(program)
                )
            )
            .map(({ options }) => options.label)

          expect(unguarded).toEqual([])
        })

        test('tells the ladder to report a check in a denied form rather than rewrite it', async () => {
          const prompt = ladderPrompt(await runThroughFixToLadder())

          expect(prompt).toContain(
            'A check in a form GUARD RAILS lists as DENIED is a plan defect: never rewrite it into another form to get round\n   the deny list. Put "denied form: <command>" in failures[] and go on to the next check.'
          )
        })

        test('sends no plan back when every check takes an allowed form', async () => {
          const run = await runFrom(
            BASELINE_ANSWER,
            planWithChecks(NPM_CHECK),
            implementAnswer(['frontend:src/a.js'])
          )

          expect(stageLabels(run)).not.toContain('inc-900 replan')
        })

        test('sends the planner back once, naming each denied check and no allowed one', async () => {
          const run = await runFrom(
            BASELINE_ANSWER,
            planWithChecks(CURL_CHECK, PREFIX_CHECK, SCRIPT_CHECK, NPM_CHECK),
            planWithChecks(NPM_CHECK),
            implementAnswer(['frontend:src/a.js'])
          )
          const replan = promptOf(run, 'inc-900 replan')

          expect(
            stageLabels(run).filter((label) =>
              /^inc-900 (plan|replan|implement)$/.test(label)
            )
          ).toEqual(['inc-900 plan', 'inc-900 replan', 'inc-900 implement'])
          expect(replan).toContain(
            `YOUR LAST PLAN NAMED CHECKS THE WORKSPACE DENIES, so the ladder could not run them:\n  - \`${CURL_CHECK}\`\n  - \`${PREFIX_CHECK}\`\n  - \`${SCRIPT_CHECK}\`\n`
          )
          expect(replan).not.toContain(`  - \`${NPM_CHECK}\``)
        })

        test('sends back a FIT check that would serve on a port the leased stack already holds', async () => {
          const STACK_PORT_FIT =
            'npm --prefix ~/ws/repos/trade-imports-animals-frontend run test:fit -- src/a.fit.spec.js'
          const CLEAR_PORT_FIT =
            'npm --prefix ~/ws/repos/trade-imports-animals-frontend run test:fit:ci -- src/a.fit.spec.js'
          const run = await runFrom(
            BASELINE_ANSWER,
            planWithChecks(STACK_PORT_FIT, CLEAR_PORT_FIT),
            planWithChecks(CLEAR_PORT_FIT),
            implementAnswer(['frontend:src/a.js'])
          )
          const replan = promptOf(run, 'inc-900 replan')

          expect(replan).toContain(`  - \`${STACK_PORT_FIT}\`\n`)
          expect(replan).not.toContain(`  - \`${CLEAR_PORT_FIT}\``)
        })

        test('tells the planner a FIT check runs the gate’s test:fit:ci script', async () => {
          const prompt = promptOf(await runThroughFixToLadder(), 'inc-900 plan')

          expect(prompt).toContain(
            '`npm --prefix ~/ws/<repoPath> run test:fit:ci -- <spec file>`. Never `test:fit`.'
          )
        })

        test('stops with plan-refused, naming the check, when the second plan still names a denied form', async () => {
          const run = await runFrom(
            BASELINE_ANSWER,
            planWithChecks(CURL_CHECK),
            planWithChecks(CURL_CHECK)
          )

          expect(run.result.stopped.reason).toBe('plan-refused')
          expect(run.result.stopped.detail).toBe(
            `inc-900: the plan's checks still use command forms the workspace denies, so the ladder could not run them: ${CURL_CHECK}`
          )
          expect(stageLabels(run)).not.toContain('inc-900 implement')
        })
      })

      describe('the plan contract, its lint and its review', () => {
        const flat = (text) => text.replace(/\s+/g, ' ')

        const runPlannedWith = (plans, ...answers) =>
          runLoop(scriptPath, {
            args: BASE_ARGS,
            answers: [
              WORKSPACE_ANSWER,
              PREFLIGHT_ANSWER,
              START_ANSWER,
              ...answers
            ],
            plans
          })

        const lintFound = (...lines) => ({
          exitCode: 0,
          stdout: lines.join('\n')
        })

        const DICTATED_COMMENT =
          '12:   - Add a comment explaining why the hub exit is refused.'
        const DELETED_TITLE =
          '14:   - Delete the test titled "Should flip status to submitted" at store-contract.test.js:70.'
        const PRESCRIBED_TITLE =
          '20:   - A test titled "Should redirect to the hub" proves the refusal.'
        const QUOTED_LOG =
          '31:   - The refusal branch logs "Refused the hub exit" once.'
        const QUOTED_DESIGN =
          '40:   - Goes through decorateCard (card.js:40), whose comment says arguments are not threaded.'
        const DICTATED_JSDOC =
          '41:   - Update the JSDoc on `decorateCard` (card.js:10) to say it takes the anchor.'
        const LOG_IDS =
          '50:   - The refusal branch logs once with `journeyId` and `portCode`.'
        const LOG_BESIDE_POSSESSIVE =
          "55:   - The test reads the log from `driveHandler`'s result."
        const LOGGER_CALL =
          "57:   - The cap refusal calls `logger.info({ journeyId }, 'Capacity refused')`."
        const UI_COPY_TITLED =
          '383:  - REQ-OVERVIEW-011 (line 174): the requirement states only that the third task of "1. About the consignment" is titled "Main import reason".'
        const COMMENTS_NOT_COPIED =
          "145:- **Structure to follow:** `tests/animals/e2e/visual/origin-of-import.visual.spec.ts`, its structure only. The new file carries none of the exemplar's comments (lines 3 and 11-16 hold rationale, history and a description of another spec):"
        const QUOTED_HOUSE_RULE =
          '32:15. **The transit controller\'s refusal branches log, under bounded tidy-up.** Nothing upstream logs them: not `kit.js`, the engine, nor `server.js`\'s catch-all, which logs only 500 and above. House rule, Logging and errors: "Every branch that changes an outcome (refusal, redirect, retry, fallback, state switch) logs once, with the ids support searches by." `pino-logging.md` §4a: "`info` for an expected refusal, such as a validation error". So each of the three logs once, at info, at the branch that decides.'
        const QUOTED_REPO_DOC_AND_RULE =
          '35:14. **The capacity refusal logs, although it now re-renders as a field error with 400.** `architecture.md:169-170` exempts "a validation 400 that re-renders the page". That is a business refusal, the same kind as the declaration refusal the architecture doc logs as its canonical example. The house rule ("every branch that changes an outcome (refusal …) logs once") wins in any case.'
        const NAMES_CARRY_WHAT_COMMENTS_SAID =
          '108:The comments at `:35` and `:64` go. The constants below them are renamed where needed so their names carry what the comments said (decision 15).'
        const NAMES_STATE_WHAT_DOC_COMMENT_SAID =
          '109:- Change the constant names so they carry what the doc comment said, stating the unit.'
        const KEPT_COMMENT = '110:- Keep the comment above `decorateCard`.'
        const COPIED_DOC_COMMENT =
          '111:- Copy the doc comment from `decorateRow` onto the new export.'
        const GREP_CHECK =
          '61:- `grep -rn "it(\'should show the cap" fit/` finds no test the row renames.'
        const JQ_CHECK =
          '62:- `jq -r \'.tests[] | select(.title | test("should render the hint")) | .title\' report.json` prints one title.'
        const FENCED_CHECK =
          '63:npm run test:fit -- --grep "Should show the cap error"'
        const NAMED_CHECK_COMMAND =
          'npm --prefix ~/ws/repos/trade-imports-animals-frontend test -- src/a.test.js -t "Should refuse a sixteenth document"'
        const NAMED_CHECK = `64:- The capacity FIT, ${NAMED_CHECK_COMMAND}, passes.`
        const EXISTING_TITLES_QUOTED =
          '130:- SCN-CYA-002-A, unit "Should mark a blank plain answer missing" and "Should mark a blank date missing": `partial` (second Then only). "Should write an unanswered optional row out as Not applicable on a finished card": `partial` (first Then only).'
        const NEW_TEST_RETITLED =
          '133:   - Rename the cap test to "Should refuse a sixteenth document".'
        const CURRENT_AND_OLD_TITLES_DESCRIBED =
          '359:**Every link to the option-list FIT test** (test at 587, retitled in section 2) moves with the retitle. Three links point at it today, but none by the title this branch holds. They name "the transit type-ahead offers every captured country and territory, territories named with their country, in alphabetical order behind a search placeholder", a title only the arrival-and-transit branch has. On this branch the test is titled "the transit type-ahead offers every captured country behind a search placeholder". So each link dangles now, and setting it to the new title also fixes that:'
        const EXISTING_TEST_RETITLED =
          '159:- **Test at 587-607:** expect the first option to be the select text, and retitle it to "the no-JavaScript list opens with the select text".'
        const RENAMED_TEST_TITLE_DICTATED =
          '160:- The test at a.test.js:40 is currently titled "Should show the cap", and the renamed test is titled "Should refuse a sixteenth document".'

        const FINDING_ON_HOMES = {
          kind: 'structural',
          section: '9. Homes',
          what: 'The new anchor argument names no mechanism it goes through.',
          rule: 'card.js:12 "anchors come from the page, never from an argument"',
          mustBecomeTrue:
            'The anchor reaches decorateCard through the page anchors pass.'
        }
        const FINDING_ON_TEST_SUPPORT = {
          kind: 'detail',
          section: '11. Test support',
          what: 'origin.test.js:40 keeps a local copy of the cookie-recording toolkit.',
          rule: 'code-quality.md "Promoting a helper deletes the local copies."',
          mustBecomeTrue: 'The test reads the cookies stubH records.'
        }
        const SENT_BACK = {
          approved: false,
          findings: [FINDING_ON_HOMES],
          summary: 'one finding'
        }
        const DETAIL_LEFT_OPEN = {
          approved: false,
          findings: [FINDING_ON_TEST_SUPPORT],
          summary: 'one detail finding'
        }
        const DETAIL_LINE =
          '1. [detail] 11. Test support: origin.test.js:40 keeps a local copy of the cookie-recording toolkit. Rule: code-quality.md "Promoting a helper deletes the local copies." Must become true: The test reads the cookies stubH records.'

        const runWithDetailLeftOpen = (planAnswers = {}) =>
          runPlannedWith(
            {
              'inc-900 plan review': SENT_BACK,
              'inc-900 plan review 2': DETAIL_LEFT_OPEN,
              ...planAnswers
            },
            BASELINE_ANSWER,
            PLAN_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js']),
            ...FIX_STAGE_ANSWERS
          )

        test('tells the planner it records decisions, homes and owners and never writes code text', async () => {
          const prompt = flat(
            promptOf(await runThroughFixToLadder(), 'inc-900 plan')
          )

          expect(prompt).not.toContain('settle every choice')
          expect(prompt).not.toContain('decides nothing')
          expect(prompt).toContain(
            'You never write code text: no names for new things, no comment or doc comment text, no test titles or bodies, no log wording, no code bodies.'
          )
          expect(prompt).toContain(
            "Names and code shape are the implementor's to get right."
          )
        })

        test('asks the planner for every section the new contract adds', async () => {
          const prompt = flat(
            promptOf(await runThroughFixToLadder(), 'inc-900 plan')
          )
          const sections = [
            '9. Homes —',
            '10. Rule owners —',
            '11. Test support —',
            '12. Docs this makes untrue —',
            '13. Operability —',
            '14. Departures from written rules —',
            '15. Reachability —',
            '16. Standards —'
          ]

          expect(
            sections.filter((section) => !prompt.includes(section))
          ).toEqual([])
        })

        test('tells the planner to state each test as the behaviour it proves and the line whose removal turns it red', async () => {
          const prompt = flat(
            promptOf(await runThroughFixToLadder(), 'inc-900 plan')
          )

          expect(prompt).toContain(
            'stated as the behaviour it must prove and the production line (file:line, or the edit in section 2 or 3) whose removal turns it red. Never a title or a body.'
          )
        })

        test('tells the planner to turn row ids into behaviour and keep them out of code-facing sections', async () => {
          const prompt = flat(
            promptOf(await runThroughFixToLadder(), 'inc-900 plan')
          )

          expect(prompt).toContain(
            "Turn each one into the behaviour it names. Never copy an id into the plan's code-facing content: sections 2, 3, 4, 9, 10, 11 and 13."
          )
        })

        test('tells the planner to read every rules, bestPractice and repoDocs file tim lists', async () => {
          const prompt = flat(
            promptOf(await runThroughFixToLadder(), 'inc-900 plan')
          )

          expect(prompt).toContain(
            'read every rules, bestPractice and repoDocs file it lists;'
          )
        })

        test('reads the plan file for code text with one grep', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 plan lint'
          )

          expect(prompt).toContain(
            "`grep -n -i -E 'comment|jsdoc|javadoc|docblock|arrange|title|test name|should |log|warn|describe\\(|it\\(|test\\(' ~/ws/workareas/shared/args-fixture/plans/inc-900.md`"
          )
        })

        test('sends the planner back once, naming each line that writes code text and no other', async () => {
          const run = await runPlannedWith(
            {
              'inc-900 plan lint': lintFound(
                DICTATED_COMMENT,
                DELETED_TITLE,
                PRESCRIBED_TITLE,
                QUOTED_LOG,
                QUOTED_DESIGN,
                DICTATED_JSDOC,
                LOG_IDS,
                LOG_BESIDE_POSSESSIVE
              )
            },
            BASELINE_ANSWER,
            PLAN_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js'])
          )
          const replan = promptOf(run, 'inc-900 replan')
          const named = [
            DICTATED_COMMENT,
            DELETED_TITLE,
            PRESCRIBED_TITLE,
            QUOTED_LOG,
            QUOTED_DESIGN,
            DICTATED_JSDOC,
            LOG_IDS,
            LOG_BESIDE_POSSESSIVE
          ].filter((line) => replan.includes(line.replace(/^\d+:/, '').trim()))

          expect(replan).toContain(
            "YOUR LAST PLAN WRITES CODE TEXT, which is the implementor's to write:"
          )
          expect(named).toEqual([
            DICTATED_COMMENT,
            PRESCRIBED_TITLE,
            QUOTED_LOG,
            DICTATED_JSDOC
          ])
          expect(stageLabels(run)).toContain('inc-900 implement')
        })

        test('passes without a replan a plan that only quotes rules, existing titles or UI copy, says what not to copy, or runs checks', async () => {
          const run = await runPlannedWith(
            {
              'inc-900 plan lint': lintFound(
                UI_COPY_TITLED,
                COMMENTS_NOT_COPIED,
                QUOTED_HOUSE_RULE,
                QUOTED_REPO_DOC_AND_RULE,
                GREP_CHECK,
                JQ_CHECK,
                FENCED_CHECK,
                NAMED_CHECK,
                EXISTING_TITLES_QUOTED,
                CURRENT_AND_OLD_TITLES_DESCRIBED
              )
            },
            BASELINE_ANSWER,
            {
              ...PLAN_ANSWER,
              checks: [{ section: 6, command: NAMED_CHECK_COMMAND }]
            },
            implementAnswer(['frontend:src/a.js'])
          )

          expect(stageLabels(run)).not.toContain('inc-900 replan')
          expect(stageLabels(run)).toContain('inc-900 implement')
        })

        test('passes a plan whose names carry what a deleted comment said, and still sends back one that keeps or copies a comment', async () => {
          const run = await runPlannedWith(
            {
              'inc-900 plan lint': lintFound(
                NAMES_CARRY_WHAT_COMMENTS_SAID,
                NAMES_STATE_WHAT_DOC_COMMENT_SAID,
                KEPT_COMMENT,
                COPIED_DOC_COMMENT
              )
            },
            BASELINE_ANSWER,
            PLAN_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js'])
          )
          const replan = promptOf(run, 'inc-900 replan')

          expect(
            [
              NAMES_CARRY_WHAT_COMMENTS_SAID,
              NAMES_STATE_WHAT_DOC_COMMENT_SAID,
              KEPT_COMMENT,
              COPIED_DOC_COMMENT
            ].filter((line) =>
              replan.includes(line.replace(/^\d+:/, '').trim())
            )
          ).toEqual([KEPT_COMMENT, COPIED_DOC_COMMENT])
        })

        test('passes without a replan a plan whose only comment line has names carry what the comments said', async () => {
          const run = await runPlannedWith(
            {
              'inc-900 plan lint': lintFound(NAMES_CARRY_WHAT_COMMENTS_SAID)
            },
            BASELINE_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js'])
          )

          expect(stageLabels(run)).not.toContain('inc-900 replan')
          expect(stageLabels(run)).toContain('inc-900 implement')
        })

        test('still sends back a plan that dictates a log call or renames a test to a quoted title', async () => {
          const run = await runPlannedWith(
            {
              'inc-900 plan lint': lintFound(
                QUOTED_HOUSE_RULE,
                LOGGER_CALL,
                NEW_TEST_RETITLED,
                EXISTING_TEST_RETITLED,
                RENAMED_TEST_TITLE_DICTATED
              )
            },
            BASELINE_ANSWER,
            PLAN_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js'])
          )
          const replan = promptOf(run, 'inc-900 replan')

          expect(
            [
              QUOTED_HOUSE_RULE,
              LOGGER_CALL,
              NEW_TEST_RETITLED,
              EXISTING_TEST_RETITLED,
              RENAMED_TEST_TITLE_DICTATED
            ].filter((line) =>
              replan.includes(line.replace(/^\d+:/, '').trim())
            )
          ).toEqual([
            LOGGER_CALL,
            NEW_TEST_RETITLED,
            EXISTING_TEST_RETITLED,
            RENAMED_TEST_TITLE_DICTATED
          ])
        })

        test('stops with plan-refused, naming the line, when the replan still writes code text', async () => {
          const run = await runPlannedWith(
            {
              'inc-900 plan lint': lintFound(QUOTED_LOG),
              'inc-900 replan lint': lintFound(QUOTED_LOG)
            },
            BASELINE_ANSWER,
            PLAN_ANSWER,
            PLAN_ANSWER
          )

          expect(run.result.stopped).toEqual({
            reason: 'plan-refused',
            detail:
              'inc-900: the plan still writes code text the implementor owns: plan line 31 (a quoted log message): - The refusal branch logs "Refused the hub exit" once.'
          })
          expect(stageLabels(run)).not.toContain('inc-900 implement')
        })

        test('stops with plan-refused when the plan lint cannot read the plan', async () => {
          const run = await runPlannedWith(
            {
              'inc-900 plan lint': {
                exitCode: 2,
                stdout: 'grep: inc-900.md: No such file or directory'
              }
            },
            BASELINE_ANSWER,
            PLAN_ANSWER
          )

          expect(run.result.stopped).toEqual({
            reason: 'plan-refused',
            detail:
              'inc-900: the plan lint could not read /ws/workareas/shared/args-fixture/plans/inc-900.md, so the plan could not be checked for code text'
          })
        })

        test('reviews the plan on the think tier before the implementor starts', async () => {
          const run = await runThroughFixToLadder()

          expect(modelOf(run, 'inc-900 plan review')).toBe('opus')
          expect(
            stageLabels(run).filter((label) =>
              /^inc-900 (plan|plan lint|plan review|implement)$/.test(label)
            )
          ).toEqual([
            'inc-900 plan',
            'inc-900 plan lint',
            'inc-900 plan review',
            'inc-900 implement'
          ])
        })

        test('gives the plan reviewer the repo docs, the layer rules and the sibling code to read', async () => {
          const prompt = flat(
            promptOf(await runThroughFixToLadder(), 'inc-900 plan review')
          )

          expect(prompt).toContain(
            "each changed repo's own docs: `ls` its `docs/` and `src/server/app/docs/` where they exist"
          )
          expect(prompt).toContain('The layer rules above all')
          expect(prompt).toContain(
            "the sibling code: each file:line the plan's Homes and Rule owners name"
          )
        })

        test('tells the plan reviewer its approval narrows no later review', async () => {
          const prompt = flat(
            promptOf(await runThroughFixToLadder(), 'inc-900 plan review')
          )

          expect(prompt).toContain(
            'Your review narrows nothing later. Every reviewer after you judges the code in full, whatever you approved.'
          )
        })

        test('sends the plan back once with the review’s findings, then builds the revised plan once it is approved', async () => {
          const run = await runPlannedWith(
            { 'inc-900 plan review': SENT_BACK },
            BASELINE_ANSWER,
            PLAN_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js'])
          )
          const revise = flat(promptOf(run, 'inc-900 revise plan'))

          expect(
            stageLabels(run).filter((label) =>
              /^inc-900 (plan|plan lint|plan review|revise plan|revise plan lint|plan review 2|implement)$/.test(
                label
              )
            )
          ).toEqual([
            'inc-900 plan',
            'inc-900 plan lint',
            'inc-900 plan review',
            'inc-900 revise plan',
            'inc-900 revise plan lint',
            'inc-900 plan review 2',
            'inc-900 implement'
          ])
          expect(revise).toContain(
            'THE PLAN REVIEW SENT YOUR PLAN BACK. Rewrite /ws/workareas/shared/args-fixture/plans/inc-900.md so each of these is true'
          )
          expect(revise).toContain(
            '1. [structural] 9. Homes: The new anchor argument names no mechanism it goes through. Rule: card.js:12 "anchors come from the page, never from an argument" Must become true: The anchor reaches decorateCard through the page anchors pass.'
          )
        })

        test('tells the second plan review which findings it sent back', async () => {
          const run = await runPlannedWith(
            { 'inc-900 plan review': SENT_BACK },
            BASELINE_ANSWER,
            PLAN_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js'])
          )

          expect(flat(promptOf(run, 'inc-900 plan review 2'))).toContain(
            'YOU SENT THIS PLAN BACK ONCE, with these findings: 1. [structural] 9. Homes: The new anchor argument names no mechanism it goes through.'
          )
        })

        test('tells the plan reviewer that only a structural finding stops the increment', async () => {
          const prompt = flat(
            promptOf(await runThroughFixToLadder(), 'inc-900 plan review')
          )

          expect(prompt).toContain(
            'structural: the plan is built wrong. A piece in the wrong layer or with the wrong owner; a second mechanism beside one that exists;'
          )
          expect(prompt).toContain(
            'detail: a line-level gap the implementor can close without changing any decision, home or owner.'
          )
          expect(prompt).toContain(
            'A structural finding still open on the revised plan stops the increment. A detail finding still open then is not dropped'
          )
        })

        test('tells the planner and the plan reviewer the tidy-up is bounded to the row’s footprint', async () => {
          const run = await runThroughFixToLadder()
          const bounded =
            "It never widens the row's footprint for clean-up alone: no new file, no new call site, no signature change across callers, and no file edited only to clean it."

          expect(flat(promptOf(run, 'inc-900 plan'))).toContain(bounded)
          expect(flat(promptOf(run, 'inc-900 plan review'))).toContain(bounded)
        })

        test('stops with plan-refused, before any code, when a structural finding is still open after the revised plan', async () => {
          const run = await runPlannedWith(
            {
              'inc-900 plan review': SENT_BACK,
              'inc-900 plan review 2': {
                approved: false,
                findings: [FINDING_ON_TEST_SUPPORT, FINDING_ON_HOMES],
                summary: 'two findings'
              }
            },
            BASELINE_ANSWER,
            PLAN_ANSWER,
            PLAN_ANSWER
          )

          expect(run.result.stopped).toEqual({
            reason: 'plan-refused',
            detail:
              'inc-900: the plan review sent the plan back twice with structural findings still open: 9. Homes: The new anchor argument names no mechanism it goes through.'
          })
          expect(stageLabels(run)).not.toContain('inc-900 plan review record')
          expect(stageLabels(run)).not.toContain('inc-900 implement')
        })

        test('treats a finding with no kind as structural', async () => {
          const { section, what, rule, mustBecomeTrue } = FINDING_ON_HOMES
          const run = await runPlannedWith(
            {
              'inc-900 plan review': SENT_BACK,
              'inc-900 plan review 2': {
                approved: false,
                findings: [{ section, what, rule, mustBecomeTrue }],
                summary: 'one finding'
              }
            },
            BASELINE_ANSWER,
            PLAN_ANSWER,
            PLAN_ANSWER
          )

          expect(run.result.stopped.reason).toBe('plan-refused')
          expect(stageLabels(run)).not.toContain('inc-900 implement')
        })

        test('builds the revised plan when only detail findings are still open, recording them in the plan first', async () => {
          const run = await runWithDetailLeftOpen()
          const record = flat(promptOf(run, 'inc-900 plan review record'))

          expect(
            stageLabels(run).filter((label) =>
              /^inc-900 (plan review 2|plan review record|implement)$/.test(
                label
              )
            )
          ).toEqual([
            'inc-900 plan review 2',
            'inc-900 plan review record',
            'inc-900 implement'
          ])
          expect(modelOf(run, 'inc-900 plan review record')).toBe(
            modelOf(run, 'inc-900 plan lint')
          )
          expect(record).toContain(
            `## Plan review: must address The plan review left these findings open on the revised plan. Each is required work for the implementor, and the consistency reviewer reports any the change does not address. ${DETAIL_LINE}`
          )
        })

        test('gives the implementor each detail finding still open as required work', async () => {
          const prompt = flat(
            promptOf(await runWithDetailLeftOpen(), 'inc-900 implement')
          )

          expect(prompt).toContain(
            'PLAN REVIEW: MUST ADDRESS. The plan review left these findings open on the revised plan'
          )
          expect(prompt).toContain(
            "Each is required work in this increment, as binding as the plan's decisions."
          )
          expect(prompt).toContain(DETAIL_LINE)
        })

        test('has the consistency reviewer report, in a code-quality category, each detail finding the change leaves open', async () => {
          const prompt = flat(
            promptOf(await runWithDetailLeftOpen(), 'inc-900 consistency')
          )

          expect(prompt).toContain(
            `THE PLAN REVIEW LEFT THESE FINDINGS OPEN, and the implementor was given each as required work: ${DETAIL_LINE}`
          )
          expect(prompt).toContain(
            'Each one the change does not address is a finding: give it the code-quality category that fits it, `structure` when none fits better'
          )
        })

        test('still builds, with each finding in the prompts, when the recorder does not write the section', async () => {
          const run = await runWithDetailLeftOpen({
            'inc-900 plan review record': null
          })

          expect(flat(promptOf(run, 'inc-900 implement'))).toContain(
            DETAIL_LINE
          )
          expect(flat(promptOf(run, 'inc-900 consistency'))).toContain(
            DETAIL_LINE
          )
        })

        test('gives the implementor no must-address list when the plan review approves', async () => {
          const prompt = promptOf(
            await runThroughFixToLadder(),
            'inc-900 implement'
          )

          expect(prompt).not.toContain('PLAN REVIEW: MUST ADDRESS')
        })

        test('stops with plan-refused when the plan reviewer returns no result', async () => {
          const run = await runPlannedWith(
            { 'inc-900 plan review': null },
            BASELINE_ANSWER,
            PLAN_ANSWER
          )

          expect(run.result.stopped).toEqual({
            reason: 'plan-refused',
            detail:
              'inc-900: the plan reviewer returned no result, and an unreviewed plan is never built'
          })
        })

        test('tells the implementor to follow the plan’s decisions and to own names and code shape', async () => {
          const prompt = flat(
            promptOf(await runThroughFixToLadder(), 'inc-900 implement')
          )

          expect(prompt).not.toContain('Follow it verbatim')
          expect(prompt).not.toContain("Implement EXACTLY the plan's scope")
          expect(prompt).toContain(
            'Follow its decisions, homes and rule owners'
          )
          expect(prompt).toContain(
            'Rename anything whose name does not say what the code returns and what it changes.'
          )
          expect(prompt).toContain(
            'copy its structure, never its comments or names.'
          )
          expect(prompt).toContain(
            "Never write a local copy of a shared helper's body: give the helper an option instead."
          )
        })

        test('hands the implementor the standards the plan lists', async () => {
          const run = await runFrom(
            BASELINE_ANSWER,
            {
              ...PLAN_ANSWER,
              standards: [
                '~/ws/.claude/rules/node.md',
                '~/ws/repos/trade-imports-animals-frontend/src/server/app/docs/architecture.md'
              ]
            },
            implementAnswer(['frontend:src/a.js'])
          )

          expect(promptOf(run, 'inc-900 implement')).toContain(
            'THE STANDARDS THE PLAN LISTS. Read each one in full before you write: `~/ws/.claude/rules/node.md`, `~/ws/repos/trade-imports-animals-frontend/src/server/app/docs/architecture.md`.'
          )
        })

        test('tells the consistency reviewer the plan is not a defence, and hands it the plan’s departures and docs', async () => {
          const run = await runFrom(
            BASELINE_ANSWER,
            {
              ...PLAN_ANSWER,
              departures: [
                'code-style.md §10: one module per folder is kept for the twin layout.'
              ],
              docsMadeUntrue: ['add-a-page.md:113 — add the hub exit opt-in.']
            },
            implementAnswer(['frontend:src/a.js'])
          )
          const prompt = promptOf(run, 'inc-900 consistency')

          expect(prompt).not.toContain(
            'A better solution than the plan imagined is not a finding.'
          )
          expect(flat(prompt)).toContain(
            'A plan decision is a finding when the code it produced cannot be explained from the code alone, or when it departs from a written repo rule.'
          )
          expect(prompt).toContain(
            '   - code-style.md §10: one module per folder is kept for the twin layout.'
          )
          expect(prompt).toContain(
            '   - add-a-page.md:113 — add the hub exit opt-in.'
          )
        })
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

      describe('when a stage finds the workspace stack held', () => {
        const OTHER_RUN = {
          holder: 'ibl-20260930T170000Z',
          detail:
            'The workspace stack is leased to "ibl-20260930T170000Z" (dev mode, since 2026-09-30T17:00:00.000Z). Leave it alone: it is theirs to release.'
        }
        const UNLEASED = {
          holder: null,
          detail:
            'The workspace stack is up and nobody holds a lease on it, so somebody started it by hand (tim docker dev, say), outside any build. Leave it alone: ask whoever started it to take it down.'
        }
        const heldLadder = (stackHeld) => ({
          green: false,
          ran: [],
          summary: 'the stack is held',
          stackHeld
        })
        const KEPT = { ok: true, summary: 'wip commit pushed' }
        const leaseHeldBy = (holder) => ({
          ok: true,
          holder,
          summary: `lease held by ${holder}`
        })
        const LEASE_ELSEWHERE = leaseHeldBy('ibl-20260930T170000Z')
        const LEASE_GONE = leaseHeldBy(null)
        const LEASE_STILL_OURS = leaseHeldBy(RUN_ID)

        const runToLadderWith = (...answers) =>
          runFrom(
            BASELINE_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js']),
            NO_FINDINGS,
            NO_FINDINGS,
            NO_FINDINGS,
            ...answers
          )

        test('stops with stack-held, preserving the attempt, when another run holds the stack', async () => {
          const run = await runToLadderWith(
            heldLadder(OTHER_RUN),
            LEASE_ELSEWHERE,
            KEPT
          )

          expect({
            stopped: run.result.stopped,
            last: labels(run).at(-1)
          }).toEqual({
            stopped: {
              reason: 'stack-held',
              detail: `inc-900 ladder: the workspace stack is held by "ibl-20260930T170000Z". ${OTHER_RUN.detail}`
            },
            last: 'inc-900 preserve'
          })
        })

        test('still gives back the run’s own lease after a stage found the stack held', async () => {
          const run = await runToLadderWith(
            heldLadder(OTHER_RUN),
            LEASE_ELSEWHERE,
            KEPT
          )

          expect(run.agents.at(-1).options.label).toBe(RELEASE_LABEL)
        })

        test('names the holder in the increment’s result', async () => {
          const run = await runToLadderWith(
            heldLadder(OTHER_RUN),
            LEASE_ELSEWHERE,
            KEPT
          )

          expect(run.result.increments[0]).toMatchObject({
            id: 'inc-900',
            outcome: 'stack-held',
            holder: 'ibl-20260930T170000Z',
            preserved: 'wip commit pushed'
          })
        })

        const REACQUIRE_REFUSED = {
          acquired: false,
          refused: true,
          holder: null,
          summary: UNLEASED.detail
        }
        const runToLadderLeasing = (lease, ...answers) =>
          runLoop(scriptPath, {
            args: BASE_ARGS,
            lease,
            answers: [
              WORKSPACE_ANSWER,
              PREFLIGHT_ANSWER,
              START_ANSWER,
              BASELINE_ANSWER,
              PLAN_ANSWER,
              implementAnswer(['frontend:src/a.js']),
              NO_FINDINGS,
              NO_FINDINGS,
              NO_FINDINGS,
              ...answers
            ]
          })
        const allLabels = (run) =>
          run.agents.map((entry) => entry.options.label)

        test('stops with stack-held for a stack up with no lease, which the run cannot take again', async () => {
          const run = await runToLadderLeasing(
            { reacquire: REACQUIRE_REFUSED },
            heldLadder(UNLEASED),
            LEASE_GONE,
            KEPT
          )

          expect(run.result.stopped).toEqual({
            reason: 'stack-held',
            detail: `inc-900 ladder: the workspace stack is held by nobody: no lease names it, so somebody released this run's lease or started the stack by hand. ${UNLEASED.detail}`
          })
        })

        test('takes the run’s lease again and runs the stage once more when the lease has gone and nobody else holds it', async () => {
          const run = await runToLadderWith(
            heldLadder({ holder: null, detail: 'Nobody holds a lease.' }),
            LEASE_GONE
          )

          const firstLadder = allLabels(run).indexOf('inc-900 ladder')
          expect(allLabels(run).slice(firstLadder, firstLadder + 4)).toEqual([
            'inc-900 ladder',
            'inc-900 ladder lease check',
            ACQUIRE_LABEL,
            'inc-900 ladder'
          ])
        })

        test('does not stop with stack-held once the stage has run again under the lease it took back', async () => {
          const run = await runToLadderWith(
            heldLadder({ holder: null, detail: 'Nobody holds a lease.' }),
            LEASE_GONE,
            { green: false, ran: [], summary: 'e2e red' }
          )

          expect(run.result.stopped?.reason).not.toBe('stack-held')
        })

        test('never takes the lease from somebody else who holds it', async () => {
          const run = await runToLadderWith(
            heldLadder(OTHER_RUN),
            LEASE_ELSEWHERE,
            KEPT
          )

          expect(
            allLabels(run).filter((label) => label === ACQUIRE_LABEL)
          ).toEqual([ACQUIRE_LABEL])
        })

        test('stops at the baseline with stack-held and nothing to preserve', async () => {
          const run = await runFrom(
            {
              ok: true,
              green: false,
              rungs: [],
              summary: 'the stack is held',
              stackHeld: OTHER_RUN
            },
            LEASE_ELSEWHERE
          )

          expect({
            increments: run.result.increments,
            last: labels(run).at(-1)
          }).toEqual({
            increments: [
              {
                id: 'inc-900',
                ticket: 'EUDPA-900',
                outcome: 'stack-held',
                holder: 'ibl-20260930T170000Z',
                detail: `inc-900 baseline: the workspace stack is held by "ibl-20260930T170000Z". ${OTHER_RUN.detail}`
              }
            ],
            last: 'inc-900 baseline lease check'
          })
        })

        test('treats a red baseline as baseline-red when it reports the stack held but the lease is still the run’s', async () => {
          const run = await runFrom(
            {
              ok: true,
              green: false,
              rungs: [],
              summary: 'Baseline is RED: trade-imports-ins-tests e2e failed',
              stackHeld: { holder: null, detail: 'not held' }
            },
            LEASE_STILL_OURS
          )

          expect(run.result.stopped).toEqual({
            reason: 'baseline-red',
            detail:
              'inc-900: Baseline is RED: trade-imports-ins-tests e2e failed'
          })
        })

        test('stops after review when the consistency reviewer finds the stack held', async () => {
          const run = await runFrom(
            BASELINE_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js']),
            NO_FINDINGS,
            NO_FINDINGS,
            { findings: [], stackHeld: OTHER_RUN },
            LEASE_ELSEWHERE,
            KEPT
          )

          expect(run.result.stopped.detail).toMatch(
            /^inc-900 consistency: the workspace stack is held by "ibl-20260930T170000Z"\./
          )
        })
      })

      describe('when the workspace stack goes down under the run', () => {
        const DOWN = {
          detail:
            'E2E global setup: connect ECONNREFUSED ::1:8089. tim docker lease status: the lease is this run’s, and the stack is down.'
        }
        const downBaseline = {
          ok: true,
          green: false,
          rungs: [],
          summary: 'the stack went down',
          stackDown: DOWN
        }
        const allLabels = (run) =>
          run.agents.map((entry) => entry.options.label)
        const timesRan = (run, label) =>
          allLabels(run).filter((name) => name === label).length

        test('takes the run’s lease again, then runs the stage once more', async () => {
          const run = await runFrom(downBaseline, BASELINE_ANSWER)

          const firstBaseline = allLabels(run).indexOf('inc-900 baseline')
          expect(
            allLabels(run).slice(firstBaseline, firstBaseline + 3)
          ).toEqual(['inc-900 baseline', ACQUIRE_LABEL, 'inc-900 baseline'])
        })

        test('carries on with the increment once the stage has run again', async () => {
          const run = await runFrom(downBaseline, BASELINE_ANSWER, PLAN_ANSWER)

          expect(allLabels(run)).toContain('inc-900 plan')
        })

        test('runs a stage only once more, however often it finds the stack down', async () => {
          const run = await runFrom(downBaseline, downBaseline)

          expect({
            baselines: timesRan(run, 'inc-900 baseline'),
            stopped: run.result.stopped.reason
          }).toEqual({ baselines: 2, stopped: 'baseline-red' })
        })

        test('runs the ladder once more after the stack went down under it', async () => {
          const run = await runFrom(
            BASELINE_ANSWER,
            PLAN_ANSWER,
            implementAnswer(['frontend:src/a.js']),
            NO_FINDINGS,
            NO_FINDINGS,
            NO_FINDINGS,
            {
              green: false,
              ran: [],
              summary: 'the stack went down',
              stackDown: DOWN
            }
          )

          expect(timesRan(run, 'inc-900 ladder')).toBe(2)
        })

        test('tells every stack stage to report a stack gone from under the run, never to start it', async () => {
          const run = await runFrom(BASELINE_ANSWER, PLAN_ANSWER)

          expect(
            promptOf(run, 'inc-900 implement').replace(/\s+/g, ' ')
          ).toContain(
            'the stack went down under the run (Docker Desktop quit, say): run nothing more that needs it, and return `stackDown` with `detail` saying what could not reach it. Never start it yourself'
          )
        })
      })

      describe('the run’s lease on the workspace stack', () => {
        const runWithLease = (lease, ...answers) =>
          runLoop(scriptPath, {
            args: BASE_ARGS,
            lease,
            answers: [WORKSPACE_ANSWER, PREFLIGHT_ANSWER, ...answers]
          })

        test('takes the lease once, as the run, after preflight and before the first increment starts', async () => {
          const run = await runFrom(null)

          expect(
            run.agents.map((entry) => entry.options.label).slice(0, 4)
          ).toEqual(['workspace', 'preflight', ACQUIRE_LABEL, 'inc-900 start'])
        })

        test('tells the lease taker to start the stack from local source under the run’s holder', async () => {
          const run = await runFrom(null)

          expect(promptOf(run, ACQUIRE_LABEL)).toContain(
            `\`tim docker lease acquire --holder "${RUN_ID}" --mode dev --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/${RUN_ID}-lease\``
          )
        })

        test('lets only the lease taker and the releaser run a lease command', async () => {
          const forbidsLeaseCommands = (prompt) =>
            prompt.includes('no `tim docker lease acquire` or `release`')
          const run = await runFrom(null)

          expect({
            acquire: forbidsLeaseCommands(promptOf(run, ACQUIRE_LABEL)),
            release: forbidsLeaseCommands(promptOf(run, RELEASE_LABEL)),
            otherGuardedStages: run.agents
              .filter(
                ({ options, prompt }) =>
                  !isRunLease(options.label) && prompt.includes('GUARD RAILS')
              )
              .every(({ prompt }) => forbidsLeaseCommands(prompt))
          }).toEqual({
            acquire: false,
            release: false,
            otherGuardedStages: true
          })
        })

        test('tells the lease taker its lease command is the one stack command it runs', async () => {
          const run = await runFrom(null)

          expect(promptOf(run, ACQUIRE_LABEL)).toContain(
            `your task below is to take its lease for this run, as\n  \`${RUN_ID}\`, with \`tim docker lease acquire\`. Run that command exactly as given`
          )
        })

        test('tells every agent of the run to run its commands with Bash, never to report one it has not run', async () => {
          const run = await runFrom(null)

          expect(
            run.agents
              .filter(
                ({ prompt }) =>
                  !prompt.includes('The Bash tool is loaded in every stage')
              )
              .map(({ options }) => options.label)
          ).toEqual([])
        })

        test('gives the lease back once, as the run, after the run stops', async () => {
          const run = await runFrom(null)

          expect({
            last: run.agents.at(-1).options.label,
            prompt: promptOf(run, RELEASE_LABEL)
          }).toEqual({
            last: RELEASE_LABEL,
            prompt: expect.stringContaining(
              `\`tim docker lease release --holder "${RUN_ID}" --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/${RUN_ID}-lease\``
            )
          })
        })

        test('stops at stack-held before any increment when somebody else holds the stack, and gives nothing back', async () => {
          const run = await runWithLease({
            acquire: {
              acquired: false,
              refused: true,
              holder: 'ibl-20260930T170000Z',
              summary:
                'The workspace stack is leased to "ibl-20260930T170000Z". Leave it alone: it is theirs to release.'
            }
          })

          expect({
            result: run.result,
            labels: run.agents.map((entry) => entry.options.label)
          }).toEqual({
            result: {
              increments: [],
              reviewChecks: [],
              specChecks: [],
              refutedFindings: [],
              stopped: {
                reason: 'stack-held',
                detail:
                  'the workspace stack is held by "ibl-20260930T170000Z", so the run built nothing. The workspace stack is leased to "ibl-20260930T170000Z". Leave it alone: it is theirs to release.'
              }
            },
            labels: ['workspace', 'preflight', ACQUIRE_LABEL]
          })
        })

        test('stops at stack-failed before any increment when the stack will not start, and gives back whatever is left', async () => {
          const run = await runWithLease({
            acquire: {
              acquired: false,
              refused: false,
              holder: null,
              summary:
                'The workspace stack did not come up (run-stack.sh exited 1).'
            }
          })

          expect({
            stopped: run.result.stopped,
            labels: run.agents.map((entry) => entry.options.label)
          }).toEqual({
            stopped: {
              reason: 'stack-failed',
              detail:
                'the run could not take the workspace stack, so it built nothing. The workspace stack did not come up (run-stack.sh exited 1).'
            },
            labels: ['workspace', 'preflight', ACQUIRE_LABEL, RELEASE_LABEL]
          })
        })

        test('gives the lease back when the loop throws part-way through an increment', async () => {
          const run = await runWithLease(
            undefined,
            START_ANSWER,
            BASELINE_ANSWER,
            { ok: true, summary: 'a plan with no repos' }
          )

          expect({
            status: run.status,
            last: run.agents.at(-1).options.label
          }).toEqual({ status: 'threw', last: RELEASE_LABEL })
        })

        test('says how to give the lease back by hand when the release fails', async () => {
          const run = await runWithLease(
            {
              release: {
                ok: false,
                summary: 'The workspace stack did not come down.'
              }
            },
            START_ANSWER
          )

          expect(run.result.stopped.detail).toContain(
            `The run's workspace stack lease could not be given back — The workspace stack did not come down. Give it back with \`tim docker lease release --holder "${RUN_ID}"\``
          )
        })
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

      const labels = (run) => stageLabels(run)

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
        const LANDED = [
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

        const derived = (id, fields = {}) =>
          startAnswer(startedResult({ id, ...fields }))

        const runDraining = (stopAfter, ...answers) =>
          runLoop(scriptPath, {
            args: { ...BASE_ARGS, increments: null, stopAfter },
            answers: [WORKSPACE_ANSWER, PREFLIGHT_ANSWER, ...answers]
          })

        test('asks tim build start for the next increment and builds the id it names', async () => {
          const run = await runDraining(1, derived('inc-901'), null)

          expect(labels(run)).toEqual([
            'workspace',
            'preflight',
            'start next',
            'inc-901 baseline'
          ])
        })

        test('passes no id when draining, so tim derives the next one', async () => {
          const run = await runDraining(1, derived('inc-901'), null)
          const prompt = run.agents.find(
            (entry) => entry.options.label === 'start next'
          ).prompt

          expect(prompt).toContain(
            '`tim build start shared/args-fixture --base main --jira-project EUDPA'
          )
        })

        test('stops with no-buildable when tim build start finds nothing buildable', async () => {
          const run = await runDraining(1, derived(null, NOTHING_STARTED))

          expect(run.result).toEqual({
            increments: [],
            reviewChecks: [],
            specChecks: [],
            refutedFindings: [],
            stopped: {
              reason: 'no-buildable',
              detail: 'tim build start found nothing buildable in the backlog'
            }
          })
        })

        test('stops with derive-failed rather than calling a broken backlog a finished one', async () => {
          const run = await runDraining(
            1,
            startAnswer({
              ...startedResult({ id: null, ...NOTHING_STARTED }),
              failedStep: 'derive',
              reason:
                "Can't find /ws/workareas/shared/args-fixture/backlog.json."
            })
          )

          expect(run.result.stopped).toEqual({
            reason: 'derive-failed',
            detail: "Can't find /ws/workareas/shared/args-fixture/backlog.json."
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
            'start next',
            'inc-902 baseline'
          ])
        })

        test('tells tim build start which increment the last attempt built', async () => {
          const run = await runDraining(
            2,
            derived('inc-901'),
            ...LANDED,
            derived('inc-902'),
            null
          )
          const starts = run.agents.filter(
            (entry) => entry.options.label === 'start next'
          )

          expect(starts[1].prompt).toContain(
            '`tim build start shared/args-fixture --last inc-901 --base main'
          )
        })

        test('stops with not-landed when the same id comes back twice', async () => {
          const run = await runDraining(
            2,
            derived('inc-901'),
            ...LANDED,
            derived('inc-901', { repeat: true, ...NOTHING_STARTED })
          )

          expect(run.result.stopped.reason).toBe('not-landed')
          expect(run.result.stopped.detail).toContain(
            'inc-901 came back a second time'
          )
        })

        test('stops before the increment that would exhaust the agent budget', async () => {
          const run = await runDraining(
            'all',
            ...Array.from({ length: 30 }, (_, index) => index).flatMap(
              (index) => [derived(`inc-9${index}`), ...LANDED]
            )
          )

          expect(run.result.increments.length).toBe(17)
          expect(run.result.stopped.reason).toBe('agent-budget')
          expect(run.result.stopped.detail).toContain('17 increment(s) landed')
        })

        test('budgets four more agents for each CI fix attempt beyond three', async () => {
          const run = await runLoop(scriptPath, {
            args: {
              ...BASE_ARGS,
              increments: null,
              stopAfter: 'all',
              ciFixAttempts: 6
            },
            answers: [
              WORKSPACE_ANSWER,
              PREFLIGHT_ANSWER,
              ...Array.from({ length: 30 }, (_, index) => index).flatMap(
                (index) => [derived(`inc-9${index}`), ...LANDED]
              )
            ]
          })

          expect(run.result.increments.length).toBe(14)
          expect(run.result.stopped.detail).toContain(
            'at up to 68 agents per increment on claude'
          )
        })

        describe('checking a theme’s spec once its last row lands', () => {
          const THEME = 'origin-pages'
          const SPEC_CHECK_LABEL = `spec check:${THEME}`
          const IMPLEMENT_ANSWER_INDEX = 2

          const themeStatus = (summary) => ({
            exitCode: 0,
            stdout: JSON.stringify({
              theme: THEME,
              rows: 1,
              todo: 0,
              built: ['inc-901'],
              otherRepos: [],
              ...summary
            })
          })
          const BUILT = themeStatus({ rows: 2, otherRepos: ['frontend'] })
          const ONE_LEFT = themeStatus({
            rows: 2,
            todo: 1,
            otherRepos: ['frontend']
          })
          const REACHED = ['repo reach']

          const checkedPrefix = (prefix, fields = {}) => ({
            prefix,
            present: true,
            lintOk: true,
            lintFindings: 0,
            noneCount: 0,
            partialCount: 2,
            noneScenarios: [],
            lintLog: `~/ws/workareas/shared/args-fixture/logs/spec-check-${THEME}-${prefix}-lint.json`,
            gapsLog: `~/ws/workareas/shared/args-fixture/logs/spec-check-${THEME}-${prefix}-gaps.json`,
            ...fields
          })
          const NO_GERMINAL_SPEC = {
            prefix: 'germinal-products',
            present: false
          }
          const CLEAN = {
            prefixes: [checkedPrefix('live-animals'), NO_GERMINAL_SPEC],
            summary: 'checked'
          }

          const landedWithNotes = (notes) =>
            notes === undefined
              ? LANDED
              : LANDED.with(IMPLEMENT_ANSWER_INDEX, {
                  ...LANDED[IMPLEMENT_ANSWER_INDEX],
                  notes
                })

          const runThemed = ({ status, specCheck, notes }) =>
            runLoop(scriptPath, {
              args: { ...BASE_ARGS, increments: null, stopAfter: 1 },
              answers: [
                WORKSPACE_ANSWER,
                PREFLIGHT_ANSWER,
                derived('inc-901'),
                ...landedWithNotes(notes)
              ],
              themes: {
                'inc-901 theme': status,
                [SPEC_CHECK_LABEL]: specCheck
              }
            })

          test('reads the theme of the row that landed', async () => {
            const run = await runThemed({ status: BUILT, specCheck: CLEAN })

            expect(promptOf(run, 'inc-901 theme')).toContain(
              'select(.id=="inc-901") | (.theme // $split)'
            )
          })

          test('runs no engineering review of the theme under the full lifecycle, where each row merges on its own', async () => {
            const run = await runThemed({ status: BUILT, specCheck: CLEAN })

            expect(
              labels(run).filter((label) => label.includes(' theme review'))
            ).toEqual([])
          })

          test('asks jq for a summary of the theme, not its rows, naming the rows this run built', async () => {
            const prompt = promptOf(
              await runThemed({ status: BUILT, specCheck: CLEAN }),
              'inc-901 theme'
            )

            expect(prompt).toContain('["inc-901"] as $built')
            expect(prompt).toContain(
              'todo: ([$rows[] | select(.status == "todo")] | length)'
            )
            expect(prompt).not.toContain('{id, status, repos}')
          })

          test('waits for the theme’s last row before checking its spec', async () => {
            const run = await runThemed({ status: ONE_LEFT, specCheck: CLEAN })

            expect({
              checked: labels(run).includes(SPEC_CHECK_LABEL),
              specChecks: run.result.specChecks,
              stopped: run.result.stopped.reason
            }).toEqual({
              checked: false,
              specChecks: [],
              stopped: 'count-reached'
            })
          })

          test('checks every prefix a theme row the run did not build could reach once its last row lands', async () => {
            const prompt = promptOf(
              await runThemed({ status: BUILT, specCheck: CLEAN }),
              SPEC_CHECK_LABEL
            )

            expect(prompt).toContain(
              'in this order — `live-animals`, `germinal-products` — one Bash call per command'
            )
            expect(prompt).toContain(
              '`tim spec lint --capability <prefix> --workspace ~/ws --json > ~/ws/workareas/shared/args-fixture/logs/spec-check-origin-pages-<prefix>-lint.json 2>&1`'
            )
            expect(prompt).toContain(
              '`tim spec gaps --none --capability <prefix> --workspace ~/ws --json > ~/ws/workareas/shared/args-fixture/logs/spec-check-origin-pages-<prefix>-gaps.json 2>&1`'
            )
          })

          test('lists the findings refuted across a built theme’s rows in a review check', async () => {
            const landedWithRefutedFinding = LANDED.toSpliced(
              3,
              3,
              { findings: [FINDING] },
              NO_FINDINGS,
              NO_FINDINGS,
              {
                verdicts: [
                  { n: 1, real: false, reasoning: 'Saved in src/b.js:4.' }
                ]
              }
            )
            const run = await runLoop(scriptPath, {
              args: { ...BASE_ARGS, increments: null, stopAfter: 1 },
              answers: [
                WORKSPACE_ANSWER,
                PREFLIGHT_ANSWER,
                derived('inc-901'),
                ...landedWithRefutedFinding
              ],
              themes: {
                'inc-901 theme': BUILT,
                [SPEC_CHECK_LABEL]: CLEAN
              }
            })

            expect(run.result.reviewChecks).toEqual([
              {
                id: 'inc-901',
                check:
                  'Theme origin-pages is built. Review dropped 1 finding(s) as refuted across its rows: read each one and confirm none was real.',
                refuted: [
                  {
                    id: 'inc-901',
                    file: 'frontend:src/a.js',
                    category: 'correctness',
                    severity: 'major',
                    what: 'The origin is not saved.',
                    reason: 'Saved in src/b.js:4.'
                  }
                ]
              }
            ])
          })

          test('records a clean check and carries on', async () => {
            const run = await runThemed({ status: BUILT, specCheck: CLEAN })

            expect({
              specChecks: run.result.specChecks,
              stopped: run.result.stopped.reason
            }).toEqual({
              specChecks: [
                {
                  after: 'inc-901',
                  theme: THEME,
                  outcome: 'spec-checked',
                  prefixes: [
                    {
                      prefix: 'live-animals',
                      present: true,
                      lintOk: true,
                      noneCount: 0,
                      partialCount: 2
                    },
                    { prefix: 'germinal-products', present: false }
                  ],
                  sources: {
                    'live-animals': REACHED,
                    'germinal-products': REACHED
                  },
                  problems: []
                }
              ],
              stopped: 'count-reached'
            })
          })

          test('stops with spec-check-red, naming the catch-up and cover to run, when a scenario has no test', async () => {
            const run = await runThemed({
              status: BUILT,
              specCheck: {
                ...CLEAN,
                prefixes: [
                  checkedPrefix('live-animals', {
                    noneCount: 1,
                    noneScenarios: ['SCN-ORIGIN-009-A']
                  }),
                  NO_GERMINAL_SPEC
                ]
              }
            })

            expect(run.result.stopped).toEqual({
              reason: 'spec-check-red',
              detail: `theme origin-pages, after inc-901: 1 scenario(s) under live-animals/ that no test proves: SCN-ORIGIN-009-A (~/ws/workareas/shared/args-fixture/logs/spec-check-origin-pages-live-animals-gaps.json). Every row of the theme is built, so nothing re-runs this check: run "catch-up and cover animals" (spec-catchup, then spec-cover), then launch again`
            })
          })

          test('stops with spec-check-red when lint finds anything', async () => {
            const run = await runThemed({
              status: BUILT,
              specCheck: {
                ...CLEAN,
                prefixes: [
                  checkedPrefix('live-animals', {
                    lintOk: false,
                    lintFindings: 3
                  }),
                  NO_GERMINAL_SPEC
                ]
              }
            })

            expect(run.result.specChecks[0].problems).toEqual([
              'tim spec lint found 3 finding(s) under live-animals/ (~/ws/workareas/shared/args-fixture/logs/spec-check-origin-pages-live-animals-lint.json)'
            ])
          })

          test('stops when a row wrote the spec under a prefix that has no spec', async () => {
            const run = await runThemed({
              status: BUILT,
              specCheck: CLEAN,
              notes:
                'Built it.\nSpec sync: germinal-products/journey-pages/origin-of-import (2 scenarios) — validate green, lint clean'
            })

            expect(run.result.stopped.reason).toBe('spec-check-red')
            expect(run.result.stopped.detail).toContain(
              'a row reported writing the spec under germinal-products/, but openspec/specs/germinal-products does not exist'
            )
            expect(run.result.stopped.detail).toContain(
              'run "catch-up and cover germinal"'
            )
          })

          test('stops when the spec check agent dies, rather than calling the spec clean', async () => {
            const run = await runThemed({ status: BUILT, specCheck: null })

            expect(run.result.specChecks[0].problems).toEqual([
              'the spec check agent died, so nothing checked the spec'
            ])
          })

          test('checks only the prefixes a row this run built wrote under, not every prefix its repos reach', async () => {
            const run = await runThemed({
              status: themeStatus({}),
              specCheck: {
                prefixes: [checkedPrefix('live-animals')],
                summary: 'checked'
              },
              notes:
                'Built it.\n- Spec sync: live-animals/journey-pages/origin-of-import (2 scenarios) — validate green, lint clean'
            })

            expect({
              asked: promptOf(run, SPEC_CHECK_LABEL).includes(
                'in this order — `live-animals` — one Bash call per command'
              ),
              sources: run.result.specChecks[0].sources
            }).toEqual({
              asked: true,
              sources: { 'live-animals': ['written'] }
            })
          })

          test('stops when a row wrote under a prefix that has no spec, its line in bold', async () => {
            const run = await runThemed({
              status: themeStatus({}),
              specCheck: { prefixes: [NO_GERMINAL_SPEC], summary: 'checked' },
              notes:
                'Built it.\n**Spec sync:** germinal-products/journey-pages/origin-of-import (2 scenarios) — validate green'
            })

            expect(run.result.stopped.detail).toContain(
              'a row reported writing the spec under germinal-products/, but openspec/specs/germinal-products does not exist'
            )
          })

          test('checks nothing for a theme that touched no spec prefix', async () => {
            const run = await runThemed({
              status: themeStatus({ rows: 2, otherRepos: ['tests'] }),
              specCheck: CLEAN,
              notes:
                'Built it.\nSpec sync: none — only sets/high-risk-plants/ spacing changed'
            })

            expect({
              checked: labels(run).includes(SPEC_CHECK_LABEL),
              outcome: run.result.specChecks[0].outcome
            }).toEqual({ checked: false, outcome: 'no-spec-prefix' })
          })

          test('reads an unreadable theme a second time, then stops rather than lose the check', async () => {
            const run = await runThemed({
              status: { exitCode: 5, stdout: 'jq: error: Could not open file' },
              specCheck: CLEAN
            })

            expect({
              reads: labels(run).filter((label) => label === 'inc-901 theme')
                .length,
              outcome: run.result.specChecks[0].outcome,
              stopped: run.result.stopped.reason,
              unread: run.result.stopped.detail.includes('theme unread')
            }).toEqual({
              reads: 2,
              outcome: 'theme-unread',
              stopped: 'spec-check-red',
              unread: true
            })
          })

          test('carries on when the second read of the theme succeeds', async () => {
            const readings = [
              { exitCode: 0, stdout: '{"theme":"origin-pa' },
              BUILT
            ]
            const run = await runLoop(scriptPath, {
              args: { ...BASE_ARGS, increments: null, stopAfter: 1 },
              answers: [
                WORKSPACE_ANSWER,
                PREFLIGHT_ANSWER,
                derived('inc-901'),
                ...LANDED
              ],
              themes: {
                get 'inc-901 theme'() {
                  return readings.shift()
                },
                [SPEC_CHECK_LABEL]: CLEAN
              }
            })

            expect({
              outcome: run.result.specChecks[0].outcome,
              stopped: run.result.stopped.reason
            }).toEqual({ outcome: 'spec-checked', stopped: 'count-reached' })
          })

          test('checks nothing for a row in no theme', async () => {
            const run = await runThemed({ status: NO_THEME, specCheck: CLEAN })

            expect({
              checked: labels(run).includes(SPEC_CHECK_LABEL),
              specChecks: run.result.specChecks
            }).toEqual({ checked: false, specChecks: [] })
          })
        })
      })

      describe('an explicit increments list', () => {
        const runListed = (...answers) =>
          runLoop(scriptPath, {
            args: {
              ...BASE_ARGS,
              increments: ['inc-900', 'inc-901'],
              stopAfter: 'all'
            },
            answers: [
              WORKSPACE_ANSWER,
              PREFLIGHT_ANSWER,
              START_ANSWER,
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
            'inc-900 start',
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
          expect(labels(run)).not.toContain('inc-901 start')
        })
      })

      describe('with the codex executor', () => {
        const CODEX_RAN = { ok: true, summary: 'codex ran in one slice' }

        const runCodexToReview = () =>
          runLoop(scriptPath, {
            args: { ...BASE_ARGS, executor: 'codex' },
            answers: [
              WORKSPACE_ANSWER,
              PREFLIGHT_ANSWER,
              START_ANSWER,
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

        test('binds the house rules into the codex implement run and every codex review run', async () => {
          const run = await runCodexToReview()
          const unbound = [
            'implement',
            'review-frontend-javascript',
            'review-backend-java',
            'review-consistency'
          ].filter(
            (slug) =>
              !codexShellPrompt(run, slug).includes(
                'The full rules and their detail: ~/ws/.claude/rules/code-quality.md — read it in full.'
              )
          )

          expect(unbound).toEqual([])
        })

        test('tells the codex implementor to follow the plan’s decisions and to own names and code shape', async () => {
          const prompt = codexShellPrompt(
            await runCodexToReview(),
            'implement'
          ).replace(/\s+/g, ' ')

          expect(prompt).not.toContain('Execute the plan')
          expect(prompt).toContain(
            'Follow its decisions, homes and rule owners'
          )
          expect(prompt).toContain(
            'Rename anything whose name does not say what the code returns and what it changes.'
          )
        })

        test('tells the codex consistency review the plan is not a defence', async () => {
          const prompt = codexShellPrompt(
            await runCodexToReview(),
            'review-consistency'
          ).replace(/\s+/g, ' ')

          expect(prompt).toContain(
            'A plan decision is a finding when the code it produced cannot be explained from the code alone, or when it departs from a written repo rule.'
          )
        })

        test('hands the codex consistency review the implementor’s notes to judge against the code', async () => {
          const prompt = codexShellPrompt(
            await runCodexToReview(),
            'review-consistency'
          ).replace(/\s+/g, ' ')

          expect(prompt).toContain('is a finding: E2E left to the ladder.')
        })

        test('gives each codex group review the code reviewer’s naming, operability, duplication and test lens', async () => {
          const prompt = codexShellPrompt(
            await runCodexToReview(),
            'review-frontend-javascript'
          )

          expect(prompt).toContain('NAMING, predict then compare')
          expect(prompt).toContain(
            'OPERABILITY: a branch that changes an outcome'
          )
          expect(prompt).toContain('WHAT THE CHANGE MAKES FALSE is in scope.')
        })

        test('gives the codex consistency review the repo’s docs and the docs outside the diff', async () => {
          const prompt = codexShellPrompt(
            await runCodexToReview(),
            'review-consistency'
          )

          expect(prompt).toContain("THE REPO'S DOCS AND RECIPES.")
          expect(prompt).toContain(
            'Hunt for a rule the change alters that a doc, recipe, JSDoc or test name OUTSIDE the diff still states the old way.'
          )
        })

        test('tells the codex implementor to report a Probes line and a Docs updated line', async () => {
          const prompt = codexShellPrompt(await runCodexToReview(), 'implement')

          expect(prompt).toContain(
            "PROBES AND DOCS — two more lines in notes, each on a line of its own, whatever the row's repos:"
          )
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

        describe('fixing, then re-reviewing the fix', () => {
          const NAMING_FINDING = {
            file: 'frontend:src/a.js',
            severity: 'minor',
            category: 'naming',
            what: '`report()` also clears expired faults.',
            why: 'The name promises a read.',
            fix: 'Move the clearing into clearExpiredFaults().'
          }
          const RULED = {
            decisions: [
              { what: 'report', call: 'fix-now', reasoning: 'a house rule' }
            ],
            fixNow: ['Move the clearing out of report() in src/a.js.'],
            summary: 'one fix'
          }
          const FIXED = {
            ok: true,
            summary: 'Moved it.',
            changedFiles: ['frontend:src/a.js'],
            notes: 'unit green',
            treesBeforeFix: [{ repo: 'frontend', tree: '9f1c2ab' }]
          }
          const NEW_FINDING = {
            ...NAMING_FINDING,
            category: 'comments',
            what: 'A comment now explains clearExpiredFaults.',
            fix: 'Delete the comment.'
          }

          const runCodexThroughFixes = () =>
            runLoop(scriptPath, {
              args: { ...BASE_ARGS, executor: 'codex' },
              answers: [
                WORKSPACE_ANSWER,
                PREFLIGHT_ANSWER,
                START_ANSWER,
                BASELINE_ANSWER,
                PLAN_ANSWER,
                CODEX_RAN,
                implementAnswer(['frontend:src/a.js']),
                ON_BRANCH,
                CODEX_RAN,
                CODEX_RAN,
                { findings: [NAMING_FINDING] },
                NO_FINDINGS,
                ON_BRANCH,
                { verdicts: [{ n: 1, real: true, reasoning: 'src/a.js:12' }] },
                RULED,
                CODEX_RAN,
                FIXED,
                ON_BRANCH,
                { findings: [NEW_FINDING] },
                CODEX_RAN,
                { ok: true, summary: 'Deleted it.' },
                ON_BRANCH
              ]
            })

          test('runs the re-review on Claude and the second fix on Codex, checking the branch after each fix', async () => {
            const run = await runCodexThroughFixes()

            expect(labelsInPhase(run, 'Fix')).toEqual([
              'inc-900 codex:fix',
              'inc-900 relay:fix',
              'inc-900 branch-guard:fix',
              'inc-900 fix review',
              'inc-900 codex:fix-2',
              'inc-900 relay:fix-2',
              'inc-900 branch-guard:fix-2'
            ])
          })

          test('asks the first codex fix for the staged trees, through its own schema', async () => {
            const prompt = codexShellPrompt(await runCodexThroughFixes(), 'fix')

            expect(prompt).toContain(
              'BEFORE YOUR FIRST EDIT in each repo, run `git -C <repoPath> write-tree` there once'
            )
            expect(prompt).toContain('/schemas/fix.json')
          })

          test('hands the second codex fix only the re-review’s finding', async () => {
            const prompt = codexShellPrompt(
              await runCodexThroughFixes(),
              'fix-2'
            )

            expect(prompt).toContain(
              '1. frontend:src/a.js [comments] A comment now explains clearExpiredFaults. Fix: Delete the comment.'
            )
            expect(prompt).not.toContain('BEFORE YOUR FIRST EDIT')
          })
        })
      })
    })
  })

  test('refuses a lifecycle it does not know', async () => {
    const run = await runLoop(scriptPath, {
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
        tests: repo('ins-tests')
      },
      jiraProject: null,
      epic: null,
      jiraInDevStatus: null,
      jiraDoneStatus: null,
      jiraBoard: null,
      requireApproval: null,
      approvalWaitMinutes: null
    }

    const runBranch = (overrides, ...answers) =>
      runLoop(scriptPath, {
        args: { ...BRANCH_ARGS, ...overrides },
        answers: [WORKSPACE_ANSWER, { ok: true, summary: '1' }, ...answers]
      })

    const labelsOf = (run) => stageLabels(run)
    const promptOf = (run, label) =>
      run.agents.find((entry) => entry.options.label === label).prompt

    describe('its configuration', () => {
      test('takes null for every Jira and approval key, and whatever repo keys the envelope names', async () => {
        const run = await runLoop(scriptPath, {
          args: BRANCH_ARGS,
          answers: [WORKSPACE_ANSWER, null]
        })

        expect(run.error.message).toContain('no readable backlog')
      })

      test('stops before any increment when a repo on the branch has no open pull request to publish its branch image', async () => {
        const run = await runLoop(scriptPath, {
          args: BRANCH_ARGS,
          answers: [
            WORKSPACE_ANSWER,
            {
              ok: true,
              summary: '1',
              branchWithoutPr: [
                'trade-imports-stub',
                'trade-imports-reference-data'
              ]
            }
          ]
        })

        expect(run.error.message).toBe(
          `increment-build-loop: trade-imports-stub, trade-imports-reference-data are on ${WORKING_BRANCH} with no open pull request, so CI publishes no branch image there and its E2E runs that repo's :latest instead. Open a draft pull request for ${WORKING_BRANCH} in each, then launch again`
        )
      })

      test('asks the preflight which repos on the branch have no open pull request', async () => {
        const run = await runLoop(scriptPath, {
          args: BRANCH_ARGS,
          answers: [WORKSPACE_ANSWER, null]
        })

        expect(run.agents[1].prompt).toContain(
          `gh pr list --repo DEFRA/<repo> --head ${WORKING_BRANCH} --state open --json number`
        )
      })

      test('refuses a Jira or approval key that is given a value, naming it', async () => {
        const run = await runLoop(scriptPath, {
          args: { ...BRANCH_ARGS, epic: 'EUDPA-1', requireApproval: false }
        })

        expect(run.error.message).toBe(
          'increment-build-loop: lifecycle "branch" makes no Jira call and merges nothing, so epic, requireApproval must be null — got epic="EUDPA-1", requireApproval=false'
        )
        expect(run.agents).toEqual([])
      })

      test('still needs the Jira and approval keys passed, as null', async () => {
        const run = await runLoop(scriptPath, {
          args: withoutKey(BRANCH_ARGS, 'jiraBoard')
        })

        expect(run.error.message).toBe(
          'increment-build-loop: args is missing required key jiraBoard. Pass every one in args: this workflow has no defaults'
        )
      })

      test.each(['main', 'master'])(
        'refuses to build onto %s',
        async (branch) => {
          const run = await runLoop(scriptPath, {
            args: { ...BRANCH_ARGS, branch }
          })

          expect(run.error.message).toContain(
            'lifecycle "branch" commits and pushes straight onto config.branch, so it refuses main and master'
          )
          expect(run.agents).toEqual([])
        }
      )

      test('refuses a repo key that names the workspace itself', async () => {
        const run = await runLoop(scriptPath, {
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
            url: 'https://github.com/DEFRA/trade-imports-ins-tests/pull/227',
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
          'inc-900 plan lint',
          'inc-900 plan review',
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
          'inc-900 gate check',
          'inc-900 theme'
        ])
      })

      test('makes no Jira call in any stage', async () => {
        const run = await runMergeRow(FOUND, CI_GREEN, MARKED_DONE, NO_GATE)
        const jiraCallers = run.agents
          .filter(({ prompt }) =>
            /tools\/jira|move-to-board|transition-ticket|tim jira/.test(prompt)
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
          prs: ['https://github.com/DEFRA/trade-imports-ins-tests/pull/227'],
          ci: 'green'
        })
      })

      test('asserts every configured repo is on the branch and fast-forwards it, creating nothing', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 branch')

        expect(prompt).toContain(
          `git -C ~/ws/<repoPath> merge --ff-only origin/${WORKING_BRANCH}`
        )
        expect(prompt).toContain(
          'For EACH of ins `~/ws/repos/trade-imports-ins-frontend`, animals `~/ws/repos/trade-imports-animals-frontend`, plants `~/ws/repos/trade-imports-plants-frontend`, tests `~/ws/repos/trade-imports-ins-tests`'
        )
        expect(prompt).not.toContain('checkout -b')
      })

      test('runs only the gate phases the row owes, one call each under the run’s lease, stopping at the first red', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 baseline')

        expect(prompt).toContain(
          [
            `   1. \`tim build gate shared/args-fixture --phase unit --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-baseline --holder "${RUN_ID}" --result ~/ws/workareas/shared/args-fixture/logs/inc-900-baseline/gate-result-unit.json\``,
            `   2. \`tim build gate shared/args-fixture --phase fit --workspace ~/ws --json --logs ~/ws/workareas/shared/args-fixture/logs/inc-900-baseline --holder "${RUN_ID}" --result ~/ws/workareas/shared/args-fixture/logs/inc-900-baseline/gate-result-fit.json\``,
            '   Stop after the first one that comes back red'
          ].join('\n')
        )
        expect(prompt).not.toContain('--phase e2e')
        expect(prompt).not.toContain('--phase all')
      })

      test('runs every phase the row owes in the ladder, even after a red one', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 ladder')

        expect(prompt).toContain(
          'Run every one, even after a red one, so you have the whole picture before you repair anything.'
        )
        expect(prompt).not.toContain('--phase all')
      })

      test('starts the merge itself, without committing, before the implementor', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 merge start')

        expect(prompt).toContain(
          'git -C ~/ws/<repoPath> merge --no-ff --no-commit <ref>'
        )
        expect(prompt).toContain(
          '- tests (`~/ws/repos/trade-imports-ins-tests`): merge `origin/main`'
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

      test('pushes the tests repo first and waits for its branch image before pushing the rest', async () => {
        const prompt = promptOf(await runMergeRow(null), 'inc-900 land')

        expect({
          first: prompt.includes(
            'a. Push tests before every other repo, whatever order a list gives.'
          ),
          listsPublish: prompt.includes(
            'gh run list --repo DEFRA/trade-imports-ins-tests --workflow publish-branch.yml --commit <sha>'
          ),
          waits: prompt.includes(
            'gh run watch <run-id> --repo DEFRA/trade-imports-ins-tests --exit-status > ~/ws/workareas/shared/args-fixture/logs/inc-900-tests-image.log 2>&1'
          ),
          thenTheRest: prompt.includes('e. Only then push the other repos.')
        }).toEqual({
          first: true,
          listsPublish: true,
          waits: true,
          thenTheRest: true
        })
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

      test('binds the house rules into the branch CI fixer', async () => {
        const run = await runMergeRow(
          FOUND,
          { green: false, failures: ['lint'], summary: 'red' },
          null
        )

        expect(promptOf(run, 'inc-900 ci fix 1')).toContain(
          'The full rules and their detail: ~/ws/.claude/rules/code-quality.md — read it in full.'
        )
      })

      test('style-reviews the branch CI fixer’s commit and sends its findings to one style fix before the watcher looks again', async () => {
        const run = await runMergeRow(
          FOUND,
          { green: false, failures: ['lint'], summary: 'red' },
          {
            ok: true,
            summary: 'Fixed the lint.',
            commits: [{ repo: 'tests', sha: 'e1f2a3b' }]
          },
          {
            findings: [
              {
                file: 'tests:src/auth.spec.ts',
                severity: 'minor',
                category: 'test-readability',
                what: 'The fix waits with a sleep.',
                why: 'The spec can pass without the page settling.',
                fix: 'Wait for the heading instead.'
              }
            ]
          },
          { ok: true, summary: 'Waits for the heading.', commits: [] },
          CI_GREEN,
          MARKED_DONE,
          NO_GATE
        )

        const stageOrder = labelsOf(run)
        const firstWatch = stageOrder.indexOf('inc-900 ci watch')

        expect(stageOrder.slice(firstWatch, firstWatch + 5)).toEqual([
          'inc-900 ci watch',
          'inc-900 ci fix 1',
          'inc-900 ci fix 1 review',
          'inc-900 ci fix 1 style',
          'inc-900 ci watch'
        ])
        expect(promptOf(run, 'inc-900 ci fix 1 review')).toContain(
          '- `git -C ~/ws/repos/trade-imports-ins-tests show e1f2a3b`'
        )
      })

      describe('the engineering review of a theme once its last row lands', () => {
        const THEME = 'origin-pages'
        const THEME_BUILT = {
          exitCode: 0,
          stdout: JSON.stringify({
            theme: THEME,
            rows: 2,
            todo: 0,
            built: ['inc-900'],
            otherRepos: []
          })
        }
        const COPIED_SET_UP = {
          file: 'tests:src/auth.spec.ts',
          line: 4,
          severity: 'major',
          category: 'duplication',
          what: 'The sign-in steps are copied from the journey helper.',
          why: 'Two copies drift when the sign-in page changes.',
          fix: 'Call the journey helper and delete the copy.'
        }
        const RULED = {
          decisions: [
            { what: 'sign-in copy', call: 'fix-now', reasoning: 'a house rule' }
          ],
          fixNow: [
            'Replace the sign-in steps in src/auth.spec.ts with the journey helper.'
          ],
          summary: 'one fix'
        }
        const THEME_FIXED = {
          ok: true,
          summary: 'Called the helper.',
          changedFiles: ['tests:src/auth.spec.ts'],
          treesBeforeFix: [{ repo: 'tests', tree: '1a2b3c4' }]
        }
        const THEME_LANDED = {
          landed: true,
          pushed: true,
          commit: 'bbb2222',
          summary: 'committed and pushed'
        }
        const ROW_ANSWERS = {
          workspace: WORKSPACE_ANSWER,
          preflight: { ok: true, summary: '1' },
          'inc-900 branch': ROW,
          'inc-900 baseline': BASELINE,
          'inc-900 plan': PLAN,
          'inc-900 implement': IMPLEMENTED,
          'inc-900 ladder': GREEN_LADDER,
          'inc-900 branch-guard:land': ON_BRANCH,
          'inc-900 land': LANDED,
          'inc-900 pr': FOUND,
          'inc-900 ci watch': CI_GREEN,
          'inc-900 done': MARKED_DONE,
          'inc-900 gate check': NO_GATE,
          'inc-900 theme review:tests': { findings: [COPIED_SET_UP] },
          'inc-900 theme verify:tests': {
            verdicts: [{ n: 1, real: true, reasoning: 'src/auth.spec.ts:4' }]
          },
          'inc-900 theme judge': RULED,
          'inc-900 theme fix': THEME_FIXED,
          'inc-900 theme ladder': GREEN_LADDER,
          'inc-900 theme land': THEME_LANDED,
          'inc-900 theme pr': FOUND,
          'inc-900 theme ci watch': CI_GREEN
        }
        const isReviewer = (label) =>
          /^inc-900 (style:|review:|consistency$|theme review:|theme fix review$)/.test(
            label
          )

        const runTheme = (overrides = {}) =>
          runLoop(scriptPath, {
            args: BRANCH_ARGS,
            answers: (prompt, { label }) => {
              const answers = { ...ROW_ANSWERS, ...overrides }
              if (Object.hasOwn(answers, label)) return answers[label]
              return isReviewer(label) ? NO_FINDINGS : null
            },
            themes: { 'inc-900 theme': THEME_BUILT }
          })

        const themeLabels = (run) =>
          run.agents
            .filter((entry) => entry.options.phase === 'Theme review')
            .map((entry) => entry.options.label)

        test('reviews each repo’s theme change, then verifies, judges, fixes, re-reviews, gates, lands and watches it', async () => {
          const run = await runTheme()

          expect(themeLabels(run)).toEqual([
            'inc-900 theme review:ins',
            'inc-900 theme review:animals',
            'inc-900 theme review:plants',
            'inc-900 theme review:tests',
            'inc-900 theme verify:tests',
            'inc-900 theme judge',
            'inc-900 theme fix',
            'inc-900 theme fix review',
            'inc-900 theme ladder',
            'inc-900 theme land',
            'inc-900 theme pr',
            'inc-900 theme ci watch'
          ])
        })

        test('binds the house rules into every theme stage that judges or writes code', async () => {
          const run = await runTheme()
          const unbound = [
            'inc-900 theme review:tests',
            'inc-900 theme verify:tests',
            'inc-900 theme judge',
            'inc-900 theme fix',
            'inc-900 theme fix review',
            'inc-900 theme ladder'
          ].filter(
            (label) =>
              !promptOf(run, label).includes(
                'The full rules and their detail: ~/ws/.claude/rules/code-quality.md — read it in full.'
              )
          )

          expect(unbound).toEqual([])
        })

        test('reads the whole theme branch against main in each repo, as a safety net behind each row’s review', async () => {
          const prompt = promptOf(
            await runTheme(),
            'inc-900 theme review:tests'
          )

          expect(prompt).toContain(
            '`git -C ~/ws/repos/trade-imports-ins-tests diff origin/main...HEAD -- <path>`'
          )
          expect(prompt).toContain(
            'You are a\nsafety net behind that review, never a replacement for it: report every real finding.'
          )
        })

        test('gives the theme’s verifier the code-quality default and the theme’s criteria', async () => {
          const prompt = promptOf(
            await runTheme(),
            'inc-900 theme verify:tests'
          )

          expect(prompt).toContain(
            '1. [major] [duplication, code quality] tests:src/auth.spec.ts line 4'
          )
          expect(prompt).toContain(
            'CODE QUALITY (`naming`, `comments`, `structure`, `duplication`, `logging`, `test-readability`, `history`): default to real.'
          )
          expect(prompt).toContain("and against the theme's acceptanceCriteria")
        })

        test('lands the fixes on the working branch and names the commit for the theme’s reviewer', async () => {
          const run = await runTheme()

          expect(promptOf(run, 'inc-900 theme land')).toContain(
            `git -C ~/ws/<repoPath> push origin refs/heads/${WORKING_BRANCH}:refs/heads/${WORKING_BRANCH}`
          )
          expect(run.result.reviewChecks).toContainEqual({
            id: 'inc-900',
            check:
              "Theme origin-pages's engineering review fixed 1 finding(s) in bbb2222. Read that commit with the rest of the theme."
          })
          expect(run.result.stopped.reason).toBe('count-reached')
        })

        test('looks for the open pull request only in the repos the theme’s fixes changed', async () => {
          const prompt = promptOf(await runTheme(), 'inc-900 theme pr')

          expect(prompt).toContain(
            'REPOS: tests `~/ws/repos/trade-imports-ins-tests`. GitHub repos: tests='
          )
        })

        test('returns a finding the theme’s verifier refuted, and lists it for the theme’s reviewer', async () => {
          const run = await runTheme({
            'inc-900 theme review:tests': {
              findings: [{ ...COPIED_SET_UP, category: 'correctness' }]
            },
            'inc-900 theme verify:tests': {
              verdicts: [
                {
                  n: 1,
                  real: false,
                  reasoning: 'The helper signs in another way.'
                }
              ]
            }
          })

          expect(run.result.refutedFindings).toEqual([
            {
              id: 'inc-900',
              file: 'tests:src/auth.spec.ts',
              line: 4,
              category: 'correctness',
              severity: 'major',
              what: 'The sign-in steps are copied from the journey helper.',
              reason: 'The helper signs in another way.'
            }
          ])
          expect(run.result.reviewChecks.map(({ check }) => check)).toContain(
            'Theme origin-pages is built. Review dropped 1 finding(s) as refuted in its engineering review: read each one and confirm none was real.'
          )
          expect(themeLabels(run)).not.toContain('inc-900 theme judge')
        })

        test('preserves the fixes and stops at theme-review-red when its ladder goes red', async () => {
          const run = await runTheme({
            'inc-900 theme ladder': {
              green: false,
              ran: ['tests lint'],
              failures: ['tests lint: red'],
              summary: 'red'
            },
            'inc-900 preserve': { ok: true, summary: 'patches saved' }
          })

          expect(run.result.stopped.reason).toBe('theme-review-red')
          expect(run.result.stopped.detail).toContain(
            "inc-900: the theme's engineering review stopped: its ladder went red. tests lint: red. Preserved: patches saved"
          )
          expect(themeLabels(run)).toContain('inc-900 preserve')
        })

        test('lists a repo whose theme reviewer returned nothing for a review by hand', async () => {
          const run = await runTheme({ 'inc-900 theme review:ins': null })

          expect(run.result.reviewChecks).toContainEqual({
            id: 'inc-900',
            check:
              "Theme origin-pages's engineering review returned nothing for ins. Review the theme's change there by hand."
          })
        })

        test('keeps room for one theme’s engineering review when it budgets agents', async () => {
          const STAGE_ANSWERS = {
            branch: ROW,
            baseline: BASELINE,
            plan: PLAN,
            implement: IMPLEMENTED,
            ladder: GREEN_LADDER,
            'branch-guard:land': ON_BRANCH,
            land: LANDED,
            pr: FOUND,
            'ci watch': CI_GREEN,
            done: MARKED_DONE,
            'gate check': NO_GATE
          }
          const nextIds = Array.from(
            { length: 30 },
            (_, index) => `inc-${100 + index}`
          )
          const run = await runLoop(scriptPath, {
            args: { ...BRANCH_ARGS, increments: null, stopAfter: 'all' },
            answers: (prompt, { label }) => {
              if (label === 'workspace') return WORKSPACE_ANSWER
              if (label === 'preflight') return { ok: true, summary: '1' }
              if (label === 'derive next') {
                return { ok: true, next: nextIds.shift(), summary: 'next' }
              }
              const stage = label.replace(/^inc-\d+ /, '')
              if (Object.hasOwn(STAGE_ANSWERS, stage)) {
                return STAGE_ANSWERS[stage]
              }
              return isReviewer(`inc-900 ${stage}`) ? NO_FINDINGS : null
            }
          })

          expect(run.result.increments.length).toBe(17)
          expect(run.result.stopped.detail).toContain(
            "keeping 17 for a theme's engineering review"
          )
        })

        test('runs no engineering review while the theme has a row left to build', async () => {
          const run = await runLoop(scriptPath, {
            args: BRANCH_ARGS,
            answers: (prompt, { label }) =>
              Object.hasOwn(ROW_ANSWERS, label)
                ? ROW_ANSWERS[label]
                : isReviewer(label)
                  ? NO_FINDINGS
                  : null,
            themes: {
              'inc-900 theme': {
                ...THEME_BUILT,
                stdout: JSON.stringify({
                  ...JSON.parse(THEME_BUILT.stdout),
                  todo: 1
                })
              }
            }
          })

          expect(themeLabels(run)).toEqual([])
        })
      })

      test('marks the row done with its commit through tim', async () => {
        const run = await runMergeRow(FOUND, CI_GREEN, MARKED_DONE, NO_GATE)

        expect(promptOf(run, 'inc-900 done')).toContain(
          'tim backlog set shared/args-fixture inc-900 --status done --commit "aaa1111" --workspace ~/ws --json'
        )
      })

      describe('a row that carries a halt gate', () => {
        const GATE_TEXT =
          'Look at the opening run end to end on a new notification.'
        const GATED = { ok: false, summary: GATE_TEXT }

        const runGatedRow = (overrides = {}) =>
          runBranch(
            overrides,
            MERGE_ROW,
            BASELINE,
            PLAN,
            MERGE_STARTED,
            ...reviewedAndLanded,
            FOUND,
            CI_GREEN,
            MARKED_DONE,
            GATED
          )

        test('returns the gate as a review check for the finished branch', async () => {
          const run = await runGatedRow()

          expect(run.result.reviewChecks).toEqual([
            { id: 'inc-900', check: GATE_TEXT }
          ])
        })

        test('lands the row and does not stop at the gate', async () => {
          const run = await runGatedRow()

          expect({
            outcomes: run.result.increments.map(({ outcome }) => outcome),
            stopped: run.result.stopped.reason
          }).toEqual({ outcomes: ['landed'], stopped: 'count-reached' })
        })

        test('carries on to the next row', async () => {
          const run = await runGatedRow({
            increments: ['inc-900', 'inc-901'],
            stopAfter: 2
          })

          expect(labelsOf(run)).toContain('inc-901 branch')
        })
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
            '- tests (`~/ws/repos/trade-imports-ins-tests`): `origin/main` into `feat/NO_JIRA-frontend-alignment`, 1 conflicted path(s) when it started'
          )
        })

        test('binds the gate’s unit phase for a row that owes it', async () => {
          const prompt = promptOf(
            await runCodexMergeRow(MERGE_ROW),
            'inc-900 codex:implement'
          )

          expect(prompt).toContain(
            `<gateUnit> = tim build gate shared/args-fixture --phase unit --workspace /ws --json --logs /ws/workareas/shared/args-fixture/logs/inc-900-implement --holder "${RUN_ID}"`
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

        test('moves commits a stage made back off the shared branch, saved as a patch, before stashing them', async () => {
          const prompt = promptOf(await runToRedLadder(), 'inc-900 preserve')

          expect({
            counts: /rev-list --count origin\/\S+\.\.HEAD/.test(prompt),
            savesPatch:
              /format-patch --stdout --binary origin\/\S+\.\.HEAD > \S+inc-900-preserve-<repoKey>\.commits\.patch/.test(
                prompt
              ),
            movesBack:
              /reset --soft origin\/\S+`, which leaves those commits/.test(
                prompt
              ),
            neverHard: prompt.includes('Never `reset --hard`, and never push.')
          }).toEqual({
            counts: true,
            savesPatch: true,
            movesBack: true,
            neverHard: true
          })
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
        const REPORT_FILE =
          'workspace:workareas/shared/frontend-alignment/report.md'

        const runDocsRow = (changedFiles = [REPORT_FILE]) =>
          runBranch(
            {},
            { ...ROW, repos: [], gatePhases: [] },
            BASELINE,
            { ...PLAN, repos: [] },
            {
              ok: true,
              summary: 'Rewrote the report.',
              changedFiles
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
            'inc-900 plan lint',
            'inc-900 plan review',
            'inc-900 implement',
            'inc-900 review:workspace-docs',
            'inc-900 consistency',
            'inc-900 ladder',
            'inc-900 branch-guard:land',
            'inc-900 land',
            'inc-900 done',
            'inc-900 gate check',
            'inc-900 theme'
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

        test('leaves the spec files the land stage commits out of the edits it reports', async () => {
          const run = await runDocsRow([
            REPORT_FILE,
            'workspace:openspec/specs/live-animals/journey-pages/origin-of-import/spec.md'
          ])

          expect(run.result.increments[0].leftUncommitted).toEqual([
            REPORT_FILE
          ])
        })

        test('tells the implementor to leave the workspace edits unstaged', async () => {
          const prompt = promptOf(await runDocsRow(), 'inc-900 implement')

          expect(prompt).toContain(
            'never `git add`, commit or stash anything in the workspace'
          )
        })

        test('keeps the workspace out of the repo rules a full-lifecycle workspace increment gets', async () => {
          const run = await runDocsRow()

          expect(promptOf(run, 'inc-900 implement')).not.toContain(
            'THE WORKSPACE REPO is one of'
          )
          expect(labelsOf(run)).not.toContain('inc-900 workspace to base')
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
      'inc-014 start': startAnswer(
        startedResult({
          id: 'inc-014',
          ticket: {
            key: 'EUDPA-914',
            created: true,
            status: 'In Dev',
            movedToBoard: true,
            warnings: []
          },
          branch: WORK_BRANCH,
          repos: ROW_REPOS
        })
      ),
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
      runLoop(scriptPath, {
        args: { ...PERF_ARGS, ...argsOverride },
        answers: answerByLabel(answerOverrides)
      })

    const labelsOf = (run) => stageLabels(run)
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
      test('goes start, build, PR, CI, merge and done', async () => {
        const run = await runPerf()

        expect(labelsOf(run).filter((label) => !isReviewer(label))).toEqual([
          'workspace',
          'preflight',
          'inc-014 start',
          'inc-014 baseline',
          'inc-014 plan',
          'inc-014 plan lint',
          'inc-014 plan review',
          'inc-014 implement',
          'inc-014 ladder',
          'inc-014 branch-guard:land',
          'inc-014 land',
          'inc-014 pr',
          'inc-014 ci watch',
          'inc-014 merge',
          'inc-014 done',
          'inc-014 gate check',
          'inc-014 theme'
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

      test('stops at a halt gate once the increment has landed', async () => {
        const run = await runPerf(
          { increments: ['inc-014', 'inc-015'], stopAfter: 2 },
          {
            'inc-014 gate check': { ok: false, summary: 'Look at the report.' }
          }
        )

        expect({
          stopped: run.result.stopped,
          reviewChecks: run.result.reviewChecks,
          nextStarted: labelsOf(run).includes('inc-015 start')
        }).toEqual({
          stopped: { reason: 'gate', detail: 'inc-014: Look at the report.' },
          reviewChecks: [],
          nextStarted: false
        })
      })

      test('starts the listed increment through tim build start', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 start')

        expect(prompt).toContain(
          '`tim build start shared/args-fixture --id inc-014 --base main'
        )
      })

      test('closes the ticket through tim jira transition, in the form Bash(tim:*) allows', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 done')

        expect({
          move: prompt.includes(
            '`tim jira transition EUDPA-914 "Done" --workspace ~/ws --json`'
          ),
          list: prompt.includes(
            '`tim jira transition EUDPA-914 --list --workspace ~/ws --json`'
          ),
          confirm: prompt.includes(
            '`tim jira ticket EUDPA-914 --workspace ~/ws --json`'
          ),
          shellScript: prompt.includes('tools/jira')
        }).toEqual({
          move: true,
          list: true,
          confirm: true,
          shellScript: false
        })
      })

      test('builds in every repo tim build start branched, in the row’s order', async () => {
        const run = await runPerf()

        expect(run.logs).toContain(
          `inc-014: EUDPA-914 (raised, In Dev) on board 13780, branch ${WORK_BRANCH} in ${ROW_REPOS.join(', ')}, resuming at build`
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
        expect(prompt).not.toContain('idstub=DEFRA/trade-imports-defra-id-stub')
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

      test('pushes in the row’s order when the run builds no tests repo', async () => {
        const prompt = promptOf(await runPerf(), 'inc-014 pr')

        expect({
          rule: prompt.includes('TESTS REPO FIRST'),
          order: prompt.includes('For EACH of those repos, in that order:')
        }).toEqual({ rule: false, order: true })
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
            'inc-014 start': startAnswer(
              startedResult({
                id: 'inc-014',
                branch: WORK_BRANCH,
                repos: ['stub', 'gateway']
              })
            ),
            'inc-014 plan': {
              ...ANSWERS['inc-014 plan'],
              repos: ['stub', 'gateway']
            }
          }
        )

        expect(promptOf(run, 'inc-014 plan')).not.toContain(
          'frontend-change/SKILL.md'
        )
        expect(promptOf(run, 'inc-014 implement')).not.toContain(
          'frontend-change/SKILL.md'
        )
        expect(promptOf(run, 'inc-014 implement')).toContain(
          'THE BEHAVIOUR SPEC — EVERY ROW KEEPS IT CURRENT, whatever its repos.'
        )
      })

      test('gives the Codex implementor the same spec duty', async () => {
        const run = await runPerf(
          { executor: 'codex' },
          { 'inc-014 codex:implement': { ok: true, summary: 'ran' } }
        )
        const prompt = promptOf(run, 'inc-014 codex:implement')

        expect(prompt).toContain(
          'THE BEHAVIOUR SPEC — EVERY ROW KEEPS IT CURRENT, whatever its repos.'
        )
        expect(prompt).toContain(
          '**Paths under the WORKSPACE root `~/ws` are LITERAL'
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

    describe('building a one-repo increment in a nine-repo programme', () => {
      const NINE_REPOS = {
        ...PERF_REPOS,
        instests: repo('trade-imports-ins-tests')
      }
      const ONE_REPO = ['perftests']
      const OTHER_REPOS = Object.keys(NINE_REPOS).filter(
        (key) => !ONE_REPO.includes(key)
      )
      const PERFTESTS_PR = {
        repo: 'perftests',
        url: 'https://github.com/DEFRA/trade-imports-performance-tests/pull/2',
        raised: true
      }

      const runOneRepo = () =>
        runPerf(
          { repos: NINE_REPOS },
          {
            preflight: { ...PREFLIGHT, envelopeRepos: envelopeOf(NINE_REPOS) },
            'inc-014 start': startAnswer(
              startedResult({
                id: 'inc-014',
                branch: WORK_BRANCH,
                repos: ONE_REPO
              })
            ),
            'inc-014 plan': { ...ANSWERS['inc-014 plan'], repos: ONE_REPO },
            'inc-014 implement': {
              ...ANSWERS['inc-014 implement'],
              changedFiles: ['perftests:src/k6/journeys.js']
            },
            'inc-014 land': {
              landed: true,
              commit: 'dcd653e',
              summary: 'committed'
            },
            'inc-014 pr': { ok: true, prs: [PERFTESTS_PR], summary: 'one PR' },
            'inc-014 merge': {
              green: true,
              merged: [{ repo: 'perftests', sha: 'perftests-sha' }],
              summary: 'merged'
            }
          }
        )

      test('reaches the PR stage, CI, merge and done', async () => {
        const run = await runOneRepo()

        expect(run.result.increments[0]).toMatchObject({
          id: 'inc-014',
          outcome: 'landed',
          prs: [PERFTESTS_PR.url]
        })
      })

      test('asks the PR stage to check, push and raise only in the increment’s repo', async () => {
        const prompt = promptOf(await runOneRepo(), 'inc-014 pr')

        expect(prompt).toContain('REPOS, in order: perftests.')
        expect(prompt).toContain(
          'GitHub repos: perftests=DEFRA/trade-imports-performance-tests. Repo paths: perftests=repos/trade-imports-performance-tests.'
        )
        for (const key of OTHER_REPOS) {
          expect(prompt).not.toContain(NINE_REPOS[key].path)
        }
      })

      test('asks the baseline to hold only the increment’s repo off the base branch', async () => {
        const prompt = promptOf(await runOneRepo(), 'inc-014 baseline')

        expect(prompt).toContain(
          "Check the increment's repos only — perftests; another configured repo staying on\n   `main` is correct."
        )
      })

      test('lists only the repos outside the increment for the branch guard’s clean check', async () => {
        const prompt = promptOf(await runOneRepo(), 'inc-014 branch-guard:land')
        const outsideLine = prompt
          .split('\n')
          .find((line) => line.startsWith('- The repos outside the increment:'))

        expect(outsideLine).not.toContain(NINE_REPOS.perftests.path)
        for (const key of OTHER_REPOS) {
          expect(outsideLine).toContain(NINE_REPOS[key].path)
        }
      })

      test('tells the branch guard to leave a clean repo outside the increment on any branch before any branch check', async () => {
        const prompt = promptOf(await runOneRepo(), 'inc-014 branch-guard:land')

        expect(prompt).toContain(
          'a clean repo outside the increment is fine on ANY branch. Do not\n    check its branch'
        )
        expect(
          prompt.indexOf('FIRST, WORK OUT THE REPOS TO CHECK')
        ).toBeLessThan(prompt.indexOf('For EACH repo to check:'))
      })

      test('still sweeps all nine repos for a PR left open at merge', async () => {
        const prompt = promptOf(await runOneRepo(), 'inc-014 merge')

        expect(prompt).toContain(
          Object.values(NINE_REPOS)
            .map(({ github }) => github)
            .join(', ')
        )
      })
    })
  })

  describe('under the full lifecycle, building the workspace repo itself', () => {
    const WORKSPACE_REPO = {
      path: '.',
      github: 'DEFRA/trade-imports-workspace',
      requireApproval: true
    }
    const PERFTESTS_REPO = {
      path: 'repos/trade-imports-performance-tests',
      github: 'DEFRA/trade-imports-performance-tests'
    }
    const FACTORY_REPOS = {
      perftests: PERFTESTS_REPO,
      workspace: WORKSPACE_REPO
    }
    const FACTORY_ARGS = {
      ...BASE_ARGS,
      repos: FACTORY_REPOS,
      increments: ['inc-020'],
      requireApproval: false
    }
    const envelopeOf = (repos) =>
      Object.entries(repos).map(([key, entry]) => ({
        key,
        path: entry.path,
        github: entry.github,
        requireApproval: entry.requireApproval ?? false
      }))
    const WORK_BRANCH = 'feat/EUDPA-920-gate-layers'
    const CARRIED = [
      '.claude/settings.local.json',
      'docs/repos/trade-imports-performance-tests.md'
    ]
    const CARRIED_LIST =
      'workareas/shared/ins-performance-testing/logs/inc-020-carried.txt'
    const CARRIED_SUMMARY = {
      outsideWorkareas: CARRIED.length,
      underWorkareas: 412,
      listedIn: CARRIED_LIST
    }
    const ROW_REPOS = ['workspace', 'perftests']
    const WORKSPACE_PR = {
      repo: 'workspace',
      url: 'https://github.com/DEFRA/trade-imports-workspace/pull/90',
      raised: true
    }
    const PERFTESTS_PR = {
      repo: 'perftests',
      url: 'https://github.com/DEFRA/trade-imports-performance-tests/pull/12',
      raised: true
    }
    const CHANGED_FILES = [
      'workspace:tim/src/build/gate.js',
      'perftests:src/k6/journeys.js'
    ]

    const ANSWERS = {
      workspace: WORKSPACE_ANSWER,
      preflight: {
        ok: true,
        summary: '20',
        envelopeRepos: envelopeOf(FACTORY_REPOS)
      },
      'inc-020 start': startAnswer(
        startedResult({
          id: 'inc-020',
          ticket: {
            key: 'EUDPA-920',
            created: false,
            status: 'In Dev',
            movedToBoard: true,
            warnings: []
          },
          branch: WORK_BRANCH,
          repos: ROW_REPOS,
          preexistingDirty: CARRIED,
          preexistingDirtySummary: CARRIED_SUMMARY,
          requireApproval: ['workspace']
        })
      ),
      'inc-020 baseline': {
        ok: true,
        green: true,
        rungs: [],
        summary: 'green'
      },
      'inc-020 plan': {
        ok: true,
        summary: 'Ran the gate in three layers.',
        repos: ROW_REPOS,
        behaviourChanges: [],
        decisions: []
      },
      'inc-020 implement': {
        ok: true,
        summary: 'Built it.',
        changedFiles: CHANGED_FILES,
        notes: ''
      },
      'inc-020 ladder': { green: true, ran: [], summary: 'green' },
      'inc-020 branch-guard:land': { ok: true, summary: 'on the branch' },
      'inc-020 land': {
        landed: true,
        commit: 'p1 w1',
        summary: 'committed'
      },
      'inc-020 workspace commit': {
        exitCode: 0,
        stdout: 'tim/src/build/gate.js\n'
      },
      'inc-020 pr': {
        ok: true,
        prs: [WORKSPACE_PR, PERFTESTS_PR],
        summary: 'two PRs'
      },
      'inc-020 ci watch': { green: true, summary: 'every check green' },
      'inc-020 merge': {
        green: true,
        merged: [
          { repo: 'perftests', sha: 'perftests-sha' },
          { repo: 'workspace', sha: 'workspace-sha' }
        ],
        summary: 'merged'
      },
      'inc-020 done': { ok: true, summary: 'ticket moved to Done' },
      'inc-020 workspace to base': {
        ok: true,
        head: 'abc1234',
        summary: 'back on main'
      },
      'inc-020 gate check': { ok: true, summary: 'no gate' }
    }

    const isReviewer = (label) =>
      /^inc-020 (style|review):|consistency$/.test(label)

    const runFactory = (argsOverride = {}, answerOverrides = {}) =>
      runLoop(scriptPath, {
        args: { ...FACTORY_ARGS, ...argsOverride },
        answers: (prompt, { label }) => {
          const answers = { ...ANSWERS, ...answerOverrides }
          if (Object.hasOwn(answers, label)) return answers[label]
          return isReviewer(label) ? { findings: [] } : null
        }
      })

    const labelsOf = (run) => stageLabels(run)
    const promptOf = (run, label) =>
      run.agents.find((entry) => entry.options.label === label).prompt

    const AWAITING_WORKSPACE_APPROVAL = {
      green: false,
      stopReason: 'awaiting-approval',
      blocked: `workspace PR is green and awaiting approval: ${WORKSPACE_PR.url}`,
      summary: 'waiting on a reviewer'
    }

    describe('its configuration', () => {
      test('accepts the workspace key at path "."', async () => {
        const run = await runFactory({ planOnly: true })

        expect(run.result.increments[0]).toMatchObject({
          id: 'inc-020',
          outcome: 'planned'
        })
      })

      test('refuses the workspace key at any path but "."', async () => {
        const run = await runFactory({
          repos: {
            ...FACTORY_REPOS,
            workspace: {
              ...WORKSPACE_REPO,
              path: 'repos/trade-imports-workspace'
            }
          }
        })

        expect(run.error.message).toContain(
          'config.repos.workspace must give a workspace-relative "path" like "repos/trade-imports-animals-frontend" ("." for the "workspace" key alone)'
        )
        expect(run.agents).toEqual([])
      })

      test('refuses another key at path "."', async () => {
        const run = await runFactory({
          repos: {
            ...FACTORY_REPOS,
            perftests: { ...PERFTESTS_REPO, path: '.' }
          }
        })

        expect(run.error.message).toContain('config.repos.perftests must give')
      })

      test('refuses a requireApproval that is not a boolean', async () => {
        const run = await runFactory({
          repos: {
            ...FACTORY_REPOS,
            workspace: { ...WORKSPACE_REPO, requireApproval: 'yes' }
          }
        })

        expect(run.error.message).toBe(
          'increment-build-loop: config.repos.workspace.requireApproval must be true or false, or left out — got "yes"'
        )
      })

      test('stops before any increment when the envelope and the args disagree on a repo’s approval', async () => {
        const run = await runFactory({
          repos: {
            ...FACTORY_REPOS,
            workspace: { ...WORKSPACE_REPO, requireApproval: false }
          }
        })

        expect(run.error.message).toContain(
          '"workspace" needs approval in the envelope and does not need it in the args'
        )
        expect(labelsOf(run)).toEqual(['workspace', 'preflight'])
      })
    })

    describe('building an increment that changes the workspace repo', () => {
      test('goes start, build, PR, CI, merge, done, then back to the base branch', async () => {
        const run = await runFactory()

        expect(labelsOf(run).filter((label) => !isReviewer(label))).toEqual([
          'workspace',
          'preflight',
          'inc-020 start',
          'inc-020 baseline',
          'inc-020 plan',
          'inc-020 plan lint',
          'inc-020 plan review',
          'inc-020 implement',
          'inc-020 ladder',
          'inc-020 branch-guard:land',
          'inc-020 land',
          'inc-020 workspace commit',
          'inc-020 pr',
          'inc-020 ci watch',
          'inc-020 merge',
          'inc-020 done',
          'inc-020 workspace to base',
          'inc-020 gate check',
          'inc-020 theme'
        ])
        expect(run.result.increments[0]).toMatchObject({
          id: 'inc-020',
          outcome: 'landed',
          prs: [WORKSPACE_PR.url, PERFTESTS_PR.url]
        })
      })

      test('switches the workspace back to the base branch and fast-forwards it, carrying its files', async () => {
        const prompt = promptOf(await runFactory(), 'inc-020 workspace to base')

        expect(prompt).toContain('1. `git -C ~/ws switch main`')
        expect(prompt).toContain('2. `git -C ~/ws pull --ff-only origin main`')
        expect(prompt).toContain(
          'Never stash, reset, restore, clean, add or commit anything'
        )
      })

      test('stops the landed run when the workspace will not go back to the base branch', async () => {
        const run = await runFactory(
          {},
          {
            'inc-020 workspace to base': {
              ok: false,
              summary:
                'error: Your local changes to the following files would be overwritten by checkout'
            }
          }
        )

        expect(run.result.increments[0].outcome).toBe('landed')
        expect(run.result.stopped.reason).toBe('workspace-not-on-base')
        expect(run.result.stopped.detail).toContain(
          `The workspace repo stays on ${WORK_BRANCH}`
        )
      })

      test('tells the land stage exactly which carried files and state stay out of the workspace commit', async () => {
        const prompt = promptOf(await runFactory(), 'inc-020 land')

        for (const path of CARRIED) {
          expect(prompt).toContain(`  - ${path}`)
        }
        expect(prompt).toContain(
          'Never edit, stage, commit, stash, restore or delete anything under `workareas/`'
        )
        expect(prompt).toContain('     - tim/src/build/gate.js')
        expect(prompt).toContain(
          '`git -C ~/ws commit -m "<message>" -- <every path you staged>`'
        )
      })

      test('gives the CI fixer the workspace rule with the carried files', async () => {
        const run = await runFactory(
          {},
          {
            'inc-020 ci watch': {
              green: false,
              failures: ['unit: red'],
              summary: 'red'
            }
          }
        )
        const prompt = promptOf(run, 'inc-020 ci fix 1')

        expect(prompt).toContain(
          "THE WORKSPACE REPO is one of this increment's repos"
        )
        expect(prompt).toContain(`  - ${CARRIED[1]}`)
      })

      test('binds the house rules into the CI fixer', async () => {
        const run = await runFactory(
          {},
          {
            'inc-020 ci watch': {
              green: false,
              failures: ['unit: red'],
              summary: 'red'
            }
          }
        )

        expect(promptOf(run, 'inc-020 ci fix 1')).toContain(
          'The full rules and their detail: ~/ws/.claude/rules/code-quality.md — read it in full.'
        )
      })

      describe('reviewing what the CI fixer commits', () => {
        const RED = { green: false, failures: ['unit: red'], summary: 'red' }
        const CI_FIXED = {
          ok: true,
          summary: 'Fixed the unit test.',
          commits: [{ repo: 'perftests', sha: 'c1a2b3c' }]
        }
        const DEAD_CATCH = {
          file: 'perftests:src/client.js',
          line: 12,
          severity: 'major',
          category: 'structure',
          what: 'The fix swallows the error with an empty catch.',
          why: 'A failed call now reads as a pass.',
          fix: 'Delete the catch and fix the call.'
        }
        const TESTS_PR = {
          repo: 'tests',
          url: 'https://github.com/DEFRA/trade-imports-ins-tests/pull/31',
          number: 31
        }
        const STYLE_FIXED = {
          ok: true,
          summary: 'Deleted the catch.',
          commits: [{ repo: 'perftests', sha: 'd4e5f6a' }],
          newPrs: [TESTS_PR]
        }

        const runCiFix = (overrides = {}) =>
          runFactory(
            {},
            {
              'inc-020 ci watch': RED,
              'inc-020 ci fix 1': CI_FIXED,
              'inc-020 ci fix 1 review': { findings: [DEAD_CATCH] },
              'inc-020 ci fix 1 style': STYLE_FIXED,
              ...overrides
            }
          )

        const ciLabels = (run) =>
          run.agents
            .filter((entry) => entry.options.phase === 'CI')
            .map((entry) => entry.options.label)

        test('gives the CI fixer the standards to read and tells it to report its commits', async () => {
          const prompt = promptOf(await runCiFix(), 'inc-020 ci fix 1')

          expect(prompt).toContain(
            'THE STANDARDS. Before you edit a file, run `tim backlog standards --files <repoKey>:<path> --workspace ~/ws --json`'
          )
          expect(prompt).toContain(
            'every commit you make and push goes in commits[] as { repo: <repoKey>, sha }.'
          )
        })

        test('style-reviews the CI fixer’s commit, then sends its findings to one style fix before the watcher looks again', async () => {
          const run = await runCiFix()

          expect(ciLabels(run).slice(0, 5)).toEqual([
            'inc-020 ci watch',
            'inc-020 ci fix 1',
            'inc-020 ci fix 1 review',
            'inc-020 ci fix 1 style',
            'inc-020 ci watch'
          ])
        })

        test('binds the house rules into the style review and the style fix', async () => {
          const run = await runCiFix()
          const unbound = [
            'inc-020 ci fix 1 review',
            'inc-020 ci fix 1 style'
          ].filter(
            (label) =>
              !promptOf(run, label).includes(
                'The full rules and their detail: ~/ws/.claude/rules/code-quality.md — read it in full.'
              )
          )

          expect(unbound).toEqual([])
        })

        test('hands the style reviewer the CI fixer’s commit to read', async () => {
          const prompt = promptOf(await runCiFix(), 'inc-020 ci fix 1 review')

          expect(prompt).toContain(
            '- `git -C ~/ws/repos/trade-imports-performance-tests show c1a2b3c`'
          )
        })

        test('hands the style fix the review’s finding to delete, rename or extract', async () => {
          const prompt = promptOf(await runCiFix(), 'inc-020 ci fix 1 style')

          expect(prompt).toContain(
            '1. perftests:src/client.js:12 [structure] The fix swallows the error with an empty catch. Fix: Delete the catch and fix the call. Delete, rename or extract; never reword.'
          )
        })

        test('watches a pull request the style fix opened with the rest', async () => {
          const run = await runCiFix()

          expect(run.result.increments[0].prs).toContain(TESTS_PR.url)
        })

        test('sends a clean review to no style fix', async () => {
          const run = await runCiFix({
            'inc-020 ci fix 1 review': { findings: [] }
          })

          expect(ciLabels(run)).not.toContain('inc-020 ci fix 1 style')
        })

        test('reviews nothing when the CI fixer pushed no commit', async () => {
          const run = await runCiFix({
            'inc-020 ci fix 1': {
              ok: true,
              summary: 'Re-ran a flaky journey.',
              commits: []
            }
          })

          expect(ciLabels(run)).not.toContain('inc-020 ci fix 1 review')
        })
      })

      test('reads what the workspace branch commits from git, not from the land agent', async () => {
        const prompt = promptOf(await runFactory(), 'inc-020 workspace commit')

        expect(prompt).toContain(
          '`git -C ~/ws log --name-only --format= origin/main..HEAD`'
        )
      })

      test('stops at land-leaked, pushing nothing, when git shows a carried file the land agent did not mention', async () => {
        const run = await runFactory(
          {},
          {
            'inc-020 land': {
              landed: true,
              commit: 'p1 w1',
              summary: 'committed tim/src/build/gate.js only'
            },
            'inc-020 workspace commit': {
              exitCode: 0,
              stdout: `tim/src/build/gate.js\n${CARRIED[1]}\n`
            }
          }
        )

        expect(run.result.stopped.reason).toBe('land-leaked')
        expect(run.result.stopped.detail).toContain(
          `the workspace repo's commit holds ${CARRIED[1]}`
        )
        expect(labelsOf(run)).not.toContain('inc-020 pr')
      })

      test('stops at land-leaked when git shows run state nobody reported changing', async () => {
        const run = await runFactory(
          {},
          {
            'inc-020 workspace commit': {
              exitCode: 0,
              stdout:
                'tim/src/build/gate.js\nworkareas/shared/ins-performance-testing/logs/inc-020-ladder.log\n'
            }
          }
        )

        expect(run.result.stopped.reason).toBe('land-leaked')
      })

      test('tells every stage how many files under workareas/ it carried and where they are listed', async () => {
        const prompt = promptOf(await runFactory(), 'inc-020 implement')

        expect(prompt).toContain(
          '  - and 412 under `workareas/`, which the rule above already covers'
        )
        expect(prompt).toContain(
          `  \`~/ws/${CARRIED_LIST}\` lists every one of them.`
        )
      })

      describe('a reported change under workareas/, which the start result only counts', () => {
        const REPORTED_STATE =
          'workareas/shared/ins-performance-testing/gate-notes.md'
        const reportingState = (lookup) => ({
          'inc-020 implement': {
            ...ANSWERS['inc-020 implement'],
            changedFiles: [...CHANGED_FILES, `workspace:${REPORTED_STATE}`]
          },
          'inc-020 workspace commit': {
            exitCode: 0,
            stdout: `tim/src/build/gate.js\n${REPORTED_STATE}\n`
          },
          ...(lookup ? { 'inc-020 carried lookup': lookup } : {})
        })

        test('looks it up in the file that lists every carried file', async () => {
          const run = await runFactory(
            {},
            reportingState({ exitCode: 1, stdout: '' })
          )

          expect(promptOf(run, 'inc-020 carried lookup')).toContain(
            `\`grep -Fx -e '${REPORTED_STATE}' ~/ws/${CARRIED_LIST}\``
          )
        })

        test('lands it when the workspace did not carry it', async () => {
          const run = await runFactory(
            {},
            reportingState({ exitCode: 1, stdout: '' })
          )

          expect(run.result.increments[0].outcome).toBe('landed')
        })

        test('stops at land-leaked, pushing nothing, when the workspace carried it', async () => {
          const run = await runFactory(
            {},
            reportingState({ exitCode: 0, stdout: `${REPORTED_STATE}\n` })
          )

          expect({
            reason: run.result.stopped.reason,
            detail: run.result.stopped.detail,
            pushed: labelsOf(run).includes('inc-020 pr')
          }).toEqual({
            reason: 'land-leaked',
            detail: expect.stringContaining(
              `the workspace repo's commit holds ${REPORTED_STATE}`
            ),
            pushed: false
          })
        })

        test('stops at land-leaked, pushing nothing, when the list cannot be read', async () => {
          const run = await runFactory(
            {},
            reportingState({
              exitCode: 2,
              stdout: `grep: ~/ws/${CARRIED_LIST}: No such file or directory`
            })
          )

          expect({
            reason: run.result.stopped.reason,
            detail: run.result.stopped.detail,
            pushed: labelsOf(run).includes('inc-020 pr')
          }).toEqual({
            reason: 'land-leaked',
            detail: expect.stringContaining(
              `could not tell whether the workspace carried ${REPORTED_STATE}`
            ),
            pushed: false
          })
        })

        test('stops at land-leaked when the lookup agent dies', async () => {
          const run = await runFactory({}, reportingState(null))

          expect(run.result.stopped.reason).toBe('land-leaked')
        })
      })

      describe('more carried files outside workareas/ than the start result names', () => {
        const startNamingSome = {
          'inc-020 start': startAnswer(
            startedResult({
              id: 'inc-020',
              branch: WORK_BRANCH,
              repos: ROW_REPOS,
              preexistingDirty: CARRIED,
              preexistingDirtySummary: {
                ...CARRIED_SUMMARY,
                outsideWorkareas: 80
              },
              requireApproval: ['workspace']
            })
          )
        }

        test('tells every stage how many it did not name', async () => {
          const prompt = promptOf(
            await runFactory(
              {},
              {
                ...startNamingSome,
                'inc-020 carried lookup': { exitCode: 1, stdout: '' }
              }
            ),
            'inc-020 implement'
          )

          expect(prompt).toContain('  - and 78 more outside `workareas/`')
        })

        test('stops at land-leaked when the commit holds one it did not name', async () => {
          const run = await runFactory(
            {},
            {
              ...startNamingSome,
              'inc-020 carried lookup': {
                exitCode: 0,
                stdout: 'tim/src/build/gate.js\n'
              }
            }
          )

          expect(run.result.stopped.detail).toContain(
            "the workspace repo's commit holds tim/src/build/gate.js"
          )
        })
      })

      test('stops at land-leaked, pushing nothing, when what the commit holds cannot be read', async () => {
        const run = await runFactory(
          {},
          {
            'inc-020 workspace commit': {
              exitCode: 128,
              stdout: "fatal: bad revision 'origin/main..HEAD'"
            }
          }
        )

        expect(run.result.stopped.reason).toBe('land-leaked')
        expect(run.result.stopped.detail).toContain(
          "could not read what the workspace repo's commit holds"
        )
        expect(labelsOf(run)).not.toContain('inc-020 pr')
      })

      test.each([
        'inc-020 baseline',
        'inc-020 plan',
        'inc-020 plan review',
        'inc-020 implement',
        'inc-020 review:workspace-javascript',
        'inc-020 consistency',
        'inc-020 ladder',
        'inc-020 pr'
      ])(
        'tells %s the workspace repo is the root, what it carried, and to leave the loop script alone',
        async (label) => {
          const prompt = promptOf(await runFactory(), label)

          expect(prompt).toContain(
            "THE WORKSPACE REPO is one of this increment's repos, under the key `workspace`. Its repo path is the workspace\nroot itself, `~/ws`"
          )
          expect(prompt).toContain(`  - ${CARRIED[0]}`)
          expect(prompt).toContain(
            "Never edit this loop's own script, `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js`, unless the row names it. A running loop never re-reads it, so a\n  change there takes effect from the next launch only"
          )
        }
      )

      test('reviews the workspace repo’s changes from the workspace root', async () => {
        const prompt = promptOf(
          await runFactory(),
          'inc-020 review:workspace-javascript'
        )

        expect(prompt).toContain(
          '1 file(s) in the workspace repo (~/ws), language\njavascript'
        )
        expect(prompt).toContain('`git -C ~/ws diff --staged -- <path>`')
      })

      test('merges the workspace PR last, whatever order the row gives', async () => {
        const run = await runFactory()

        expect(run.logs).toContain('inc-020: merge order perftests → workspace')
      })
    })

    describe('a repo that needs approval of its own', () => {
      test('holds every PR back until the workspace PR is approved, gating only that one', async () => {
        const prompt = promptOf(await runFactory(), 'inc-020 merge')

        expect(prompt).toContain(
          [
            'NEEDS APPROVAL — a person must approve each of these before ANY pr above merges, the others included. The others need',
            'no approval of their own, but they wait for these:',
            `workspace: ${WORKSPACE_PR.url}`
          ].join('\n')
        )
        expect(prompt).toContain(
          'STEP A — THE APPROVAL SWEEP. Do this for EVERY pr under NEEDS APPROVAL BEFORE you merge a single pr.'
        )
      })

      test('stops at awaiting-approval with every PR open, leaving the workspace on the increment branch', async () => {
        const run = await runFactory(
          {},
          { 'inc-020 merge': AWAITING_WORKSPACE_APPROVAL }
        )

        expect(run.result.increments[0]).toMatchObject({
          outcome: 'awaiting-approval',
          merged: [],
          prs: [WORKSPACE_PR.url, PERFTESTS_PR.url]
        })
        expect(run.result.stopped.detail).toContain(
          `The workspace repo stays on ${WORK_BRANCH}, carrying this run's uncommitted programme files`
        )
        expect(labelsOf(run)).not.toContain('inc-020 workspace to base')
      })

      test('runs no approval sweep when no repo needs approval', async () => {
        const noApproval = {
          ...FACTORY_REPOS,
          workspace: { ...WORKSPACE_REPO, requireApproval: false }
        }
        const run = await runFactory(
          { repos: noApproval },
          {
            preflight: {
              ok: true,
              summary: '20',
              envelopeRepos: envelopeOf(noApproval)
            },
            'inc-020 start': startAnswer(
              startedResult({
                id: 'inc-020',
                branch: WORK_BRANCH,
                repos: ROW_REPOS,
                preexistingDirty: CARRIED,
                preexistingDirtySummary: CARRIED_SUMMARY,
                requireApproval: []
              })
            )
          }
        )

        expect(promptOf(run, 'inc-020 merge')).not.toContain('APPROVAL SWEEP')
      })

      test('still gates every PR under the run-level requireApproval', async () => {
        const prompt = promptOf(
          await runFactory({ requireApproval: true }),
          'inc-020 merge'
        )

        expect(prompt).toContain(
          'STEP A — THE APPROVAL SWEEP. Do this for EVERY pr above BEFORE you merge a single pr.'
        )
        expect(prompt).not.toContain('NEEDS APPROVAL')
      })
    })

    describe('an increment that leaves the workspace repo out', () => {
      const runPerftestsOnly = (overrides = {}) =>
        runFactory(
          {},
          {
            'inc-020 start': startAnswer(
              startedResult({
                id: 'inc-020',
                branch: WORK_BRANCH,
                repos: ['perftests'],
                preexistingDirty: null,
                requireApproval: []
              })
            ),
            'inc-020 plan': {
              ...ANSWERS['inc-020 plan'],
              repos: ['perftests']
            },
            'inc-020 implement': {
              ...ANSWERS['inc-020 implement'],
              changedFiles: ['perftests:src/k6/journeys.js']
            },
            'inc-020 land': {
              landed: true,
              commit: 'p1',
              summary: 'committed'
            },
            'inc-020 pr': { ok: true, prs: [PERFTESTS_PR], summary: 'one PR' },
            'inc-020 merge': {
              green: true,
              merged: [{ repo: 'perftests', sha: 'perftests-sha' }],
              summary: 'merged'
            },
            ...overrides
          }
        )

      test('tells the planner a workspace change needs the workspace among its repos', async () => {
        const prompt = promptOf(await runPerftestsOnly(), 'inc-020 plan')

        expect(prompt).toContain(
          'The workspace repo is not among them: a plan\nthat changes anything in it, `openspec/` included, needs it'
        )
      })

      test('lands without moving the workspace and without its rule', async () => {
        const run = await runPerftestsOnly()

        expect(run.result.increments[0].outcome).toBe('landed')
        expect(labelsOf(run)).not.toContain('inc-020 workspace to base')
        expect(promptOf(run, 'inc-020 implement')).not.toContain(
          'THE WORKSPACE REPO is one of'
        )
      })

      test('still tells the CI fixer the workspace carries files that are not the increment’s', async () => {
        const run = await runPerftestsOnly({
          'inc-020 ci watch': {
            green: false,
            failures: ['k6 smoke: red'],
            summary: 'red'
          }
        })
        const prompt = promptOf(run, 'inc-020 ci fix 1')

        expect(prompt).toContain(
          "THE WORKSPACE REPO (`~/ws`) always carries uncommitted files that are not this increment's"
        )
        expect(prompt).not.toContain('THE WORKSPACE REPO is one of')
      })

      test('refuses a spec change rather than committing it where the workspace stands', async () => {
        const prompt = promptOf(await runPerftestsOnly(), 'inc-020 land')

        expect(prompt).toContain(
          'If it has changes, report landed:false naming them, and commit nothing anywhere'
        )
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
        'inc-900 start': startAnswer(
          startedResult({
            repos: ['frontend', 'tests', 'backend'],
            resumeAt: 'ci'
          })
        ),
        'inc-900 pr': { ok: true, prs: LEGACY_PRS, summary: 'three PRs' },
        'inc-900 ci watch': { green: true, summary: 'green' }
      }
      return answers[label] ?? null
    }

    const runLegacyToMerge = () =>
      runLoop(scriptPath, {
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

    test('still raises a PR in each of the three repos the row names', async () => {
      const run = await runLegacyToMerge()
      const prompt = run.agents.find(
        (entry) => entry.options.label === 'inc-900 pr'
      ).prompt

      expect(prompt).toContain(
        'REPOS, in order: frontend, tests, backend. These are the increment'
      )
      expect(prompt).toContain(
        'GitHub repos: frontend=DEFRA/trade-imports-animals-frontend, tests=DEFRA/trade-imports-ins-tests, backend=DEFRA/trade-imports-animals-backend.'
      )
    })

    describe('pushing the tests repo', () => {
      const promptOfLabel = async (label) =>
        (await runLegacyToMerge()).agents.find(
          (entry) => entry.options.label === label
        ).prompt

      test('raises the tests PR and waits for its branch image before pushing any other repo', async () => {
        const prompt = await promptOfLabel('inc-900 pr')

        expect({
          testsFirst: prompt.includes(
            'For EACH of those repos, in that order — except that tests, when it has commits, goes through every step first and then waits for its image by TESTS REPO FIRST above:'
          ),
          waitsForPublish: prompt.includes(
            'gh run watch <run-id> --repo DEFRA/trade-imports-ins-tests --exit-status'
          ),
          onTheWorkBranch: prompt.includes(
            'pull request runs its E2E with the tests image tagged for `feat/EUDPA-900-'
          )
        }).toEqual({
          testsFirst: true,
          waitsForPublish: true,
          onTheWorkBranch: true
        })
      })
    })

    describe('watching the base branch after each merge', () => {
      const UNTRIGGERED_MERGE = {
        green: true,
        merged: LEGACY_PRS.map(({ repo }) => ({ repo, sha: `${repo}-sha` })),
        untriggered: [
          {
            repo: 'tests',
            sha: 'tests-sha',
            why: 'tim CI: no changed file matches its paths'
          }
        ],
        summary: 'merged'
      }

      const runToMergeAnswering = (merge) =>
        runLoop(scriptPath, {
          args: BASE_ARGS,
          answers: (prompt, { label }) =>
            ({
              'inc-900 merge': merge,
              'inc-900 done': { ok: true, summary: 'ticket moved to Done' },
              'inc-900 gate check': { ok: true, summary: 'no gate' }
            })[label] ?? answersFor(label)
        })

      test('asks tim which workflows each merge commit starts', async () => {
        const run = await runToMergeAnswering(UNTRIGGERED_MERGE)
        const prompt = run.agents.find(
          (entry) => entry.options.label === 'inc-900 merge'
        ).prompt

        expect(prompt).toContain(
          'tim build push-workflows ~/ws/<repoPath> --commit <sha> --branch main --workspace ~/ws --json > ~/ws/workareas/shared/args-fixture/logs/inc-900-push-workflows-<repo>.json 2>&1'
        )
      })

      test('counts an empty run list as green only when the merge starts no workflow', async () => {
        const run = await runToMergeAnswering(UNTRIGGERED_MERGE)
        const prompt = run.agents.find(
          (entry) => entry.options.label === 'inc-900 merge'
        ).prompt

        expect({
          missingRunStops: prompt.includes(
            '`stopReason: "base-branch-unverified"`, with "<repo> merge commit <sha> should start <workflow> on\n      main and no run of it exists"'
          ),
          onlyWayGreen: prompt.includes(
            'This is the ONLY way an empty run list counts as green.'
          )
        }).toEqual({ missingRunStops: true, onlyWayGreen: true })
      })

      test('lands the increment and logs each merge that started no workflow', async () => {
        const run = await runToMergeAnswering(UNTRIGGERED_MERGE)

        expect({
          outcome: run.result.increments[0].outcome,
          note: run.logs.includes(
            'inc-900: tests merge tests-sha started no workflow on main, so there was no run to watch — tim CI: no changed file matches its paths'
          )
        }).toEqual({ outcome: 'landed', note: true })
      })

      test('stops at main-red when a workflow the merge starts never ran', async () => {
        const run = await runToMergeAnswering({
          green: false,
          stopReason: 'base-branch-unverified',
          blocked:
            'tests merge commit tests-sha should start Publish on main and no run of it exists',
          summary: 'unverified'
        })

        expect(run.result.increments[0]).toMatchObject({
          outcome: 'main-red',
          stopReason: 'base-branch-unverified'
        })
      })
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
  const EXTRACT_DIR = '/ws/workareas/shared/demo/distil/extract'
  const CHARACTERISED = {
    ok: true,
    parts: 2,
    structure: 'Two spec folders.',
    decisions: ['Left the admin specs out of scope.'],
    summary: 'characterised'
  }
  const partitionedAs = (slug) => ({
    ok: true,
    problems: [],
    parts: [
      {
        part: 1,
        title: 'Specs',
        prefix: `${slug}-p1`,
        path: `${EXTRACT_DIR}/${slug}.part1.json`
      },
      {
        part: 2,
        title: 'Fixtures',
        prefix: `${slug}-p2`,
        path: `${EXTRACT_DIR}/${slug}.part2.json`
      }
    ],
    removedParts: [],
    summary: 'in shape'
  })
  const PARTITIONED = partitionedAs('repo-tests')
  const extractedPart = (part) => ({
    ok: true,
    part,
    claims: part === 1 ? 2 : 1,
    gaps: 0,
    structure: `Part ${part}, read in full.`,
    decisions: [`Claimed every test in part ${part}.`],
    summary: 'extracted'
  })
  const PART_RANGES = [
    {
      part: 1,
      title: 'Specs',
      claims: 2,
      from: 'repo-tests-p1-001',
      to: 'repo-tests-p1-002'
    },
    {
      part: 2,
      title: 'Fixtures',
      claims: 1,
      from: 'repo-tests-p2-001',
      to: 'repo-tests-p2-001'
    }
  ]
  const CHECKED = {
    ok: true,
    problems: [],
    claims: 3,
    ranges: 2,
    parts: PART_RANGES,
    removedParts: [],
    summary: 'in shape'
  }
  const MERGED_EXTRACT = { ...CHECKED, stage: 'done', summary: 'merged' }
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
    themes: 0,
    decisions: [],
    reconcileProblems: [],
    summary: 'two increments'
  }
  const AREA_PLANNED = {
    ok: true,
    areas: [
      { id: 'suite', title: 'The test suite' },
      { id: 'tiers', title: 'Test tiers' }
    ],
    everyArea: ['ruling:sam'],
    decisions: ['Gave the ruling to every area.'],
    summary: 'two areas'
  }
  const AREA_SETS = {
    ok: true,
    problems: [],
    areas: [
      { id: 'suite', claims: 4 },
      { id: 'tiers', claims: 3 }
    ],
    total: 7,
    removed: [],
    summary: 'written'
  }
  const AREA_RECONCILED = {
    ok: true,
    requirements: 2,
    conflicts: 1,
    questions: 1,
    decisions: ['Kept the smoke test apart from the tiers.'],
    goalConflicts: [],
    summary: 'reconciled'
  }
  const AREAS_MERGED = {
    ok: true,
    problems: [],
    areas: ['suite', 'tiers'],
    requirements: 4,
    conflicts: 1,
    summary: 'merged'
  }
  const CROSS_AREA = {
    ...RECONCILED,
    merged: ['req-002 kept; req-005 folded into it'],
    decisions: ['Merged two claims about the smoke test.']
  }
  const STANDS = {
    ok: true,
    conflict: 'c-001',
    verdict: 'question',
    rule: 'No ruling or precedence says where the suites live.',
    summary: 'stands'
  }
  const DRAFTED = {
    ok: true,
    rows: 1,
    requirements: 2,
    decisions: [],
    summary: 'drafted'
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
    'repo:tests characterise': CHARACTERISED,
    'repo:tests check partition': PARTITIONED,
    'repo:tests extract part 1/2': extractedPart(1),
    'repo:tests extract part 2/2': extractedPart(2),
    'repo:tests merge extract': MERGED_EXTRACT,
    'repo:tests check extract': CHECKED,
    'repo:tests verify 1/2': verifiedPart(1),
    'repo:tests verify 2/2': verifiedPart(2),
    'repo:tests merge': MERGED,
    'working set': workingSetWith({}),
    'area plan': AREA_PLANNED,
    'area working sets': AREA_SETS,
    'reconcile suite': AREA_RECONCILED,
    'reconcile tiers': AREA_RECONCILED,
    'merge areas': AREAS_MERGED,
    'reconcile across areas': CROSS_AREA,
    'coverage after reconcile across areas': COVERAGE_OK,
    'challenge c-001': STANDS,
    'draft rows suite': DRAFTED,
    'draft rows tiers': DRAFTED,
    'combine rows': CONSOLIDATED,
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
    test('runs characterise, every extract part and every verifier on opus when models is empty', async () => {
      const run = await runDistil()

      expect({
        characterise: optionsOf(run, 'repo:tests characterise').model,
        part: optionsOf(run, 'repo:tests extract part 2/2').model,
        verify: optionsOf(run, 'repo:tests verify 1/2').model,
        reconcile: optionsOf(run, 'reconcile across areas').model
      }).toEqual({
        characterise: 'opus',
        part: 'opus',
        verify: 'opus',
        reconcile: 'opus'
      })
    })

    test('runs status and the checks and merges on the light tier', async () => {
      const run = await runDistil()

      expect({
        status: optionsOf(run, 'status').model,
        partition: optionsOf(run, 'repo:tests check partition').model,
        mergeExtract: optionsOf(run, 'repo:tests merge extract').model,
        mergeVerify: optionsOf(run, 'repo:tests merge').model
      }).toEqual({
        status: 'haiku',
        partition: 'haiku',
        mergeExtract: 'haiku',
        mergeVerify: 'haiku'
      })
    })

    test('lets the code tier be lowered for the extract parts and verifiers', async () => {
      const run = await runDistil({ models: { code: 'sonnet' } })

      expect(optionsOf(run, 'repo:tests extract part 1/2').model).toBe('sonnet')
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
        'repo:tests characterise',
        'repo:tests check partition',
        'repo:tests extract part 1/2',
        'repo:tests extract part 2/2',
        'repo:tests merge extract',
        'repo:tests verify 1/2',
        'repo:tests verify 2/2',
        'repo:tests merge',
        'working set',
        'area plan',
        'area working sets',
        'reconcile suite',
        'reconcile tiers',
        'merge areas',
        'reconcile across areas',
        'coverage after reconcile across areas',
        'challenge c-001',
        'draft rows suite',
        'draft rows tiers',
        'combine rows',
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

    test('has the characterise agent follow its brief and write the partition', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests characterise')

      expect(prompt).toContain(
        '/ws/.claude/skills/requirements-pipeline/workflow/distil/briefs/characterise.md'
      )
      expect(prompt).toContain(
        'THE FILE YOU WRITE: /ws/workareas/shared/demo/distil/extract/repo-tests.partition.json'
      )
    })

    test('names each part its prefix', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests characterise')

      expect(prompt).toContain(
        'PREFIXES: part N\'s prefix is "repo-tests-p<N>": repo-tests-p1, repo-tests-p2 and on.'
      )
    })

    test('has tim clear old extract part files once the partition checks out', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests check partition')

      expect(prompt).toContain(
        '`tim distil check shared/demo --source repo:tests --stage partition --clear-parts --workspace ~/ws --json`'
      )
    })

    test('gives each part agent its kind brief, its slice of the partition and its own file', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests extract part 2/2')

      expect(prompt).toContain(
        '/ws/.claude/skills/requirements-pipeline/workflow/distil/briefs/extract-repo.md'
      )
      expect(prompt).toContain(
        "`jq '.parts[1]' ~/ws/workareas/shared/demo/distil/extract/repo-tests.partition.json`"
      )
      expect(prompt).toContain(
        `THE FILE YOU WRITE: ${EXTRACT_DIR}/repo-tests.part2.json`
      )
    })

    test('has each part agent check only its own part', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests extract part 2/2')

      expect(prompt).toContain(
        '`tim distil check shared/demo --source repo:tests --stage extract --part 2 --workspace ~/ws --json`'
      )
    })

    test('merges the extract parts, then asks for verify ranges of at most verifyChunk claims', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests merge extract')

      expect(
        prompt.indexOf(
          '`tim distil merge-extract shared/demo --source repo:tests --workspace ~/ws --json`'
        )
      ).toBeLessThan(
        prompt.indexOf(
          '`tim distil check shared/demo --source repo:tests --stage extract --chunk 2 --clear-parts --workspace ~/ws --json`'
        )
      )
    })

    test('tells each verifier which parts its range came from', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests verify 2/2')

      expect(prompt).toContain(
        "your claims come from part 2 of the partition.\nRead `jq '.parts[1]' ~/ws/workareas/shared/demo/distil/extract/repo-tests.partition.json`"
      )
    })

    test('returns every decision, from characterise and from each part', async () => {
      const run = await runDistil()

      expect(run.result.sources[0].decisions).toEqual([
        'Left the admin specs out of scope.',
        'part 1: Claimed every test in part 1.',
        'part 2: Claimed every test in part 2.'
      ])
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
      const prompt = promptOf(await runDistil(), 'repo:tests merge extract')

      expect(prompt).toContain('--clear-parts')
      expect(prompt).not.toMatch(/`rm /)
    })

    describe('a trace source', () => {
      const traceSource = {
        ...PENDING_SOURCE,
        id: 'trace:ched-p',
        kind: 'trace',
        slug: 'trace-ched-p'
      }
      const forTrace = (answer) =>
        JSON.parse(
          JSON.stringify(answer).replaceAll('repo-tests', 'trace-ched-p')
        )
      const runTrace = () =>
        runDistil(
          {},
          {
            status: statusWith([traceSource, VERIFIED_SOURCE]),
            'trace:ched-p characterise': CHARACTERISED,
            'trace:ched-p check partition': partitionedAs('trace-ched-p'),
            'trace:ched-p extract part 1/2': extractedPart(1),
            'trace:ched-p extract part 2/2': extractedPart(2),
            'trace:ched-p merge extract': forTrace(MERGED_EXTRACT),
            'trace:ched-p verify 1/2': verifiedPart(1),
            'trace:ched-p verify 2/2': verifiedPart(2),
            'trace:ched-p merge': MERGED
          }
        )
      const traceCommand = (folder) =>
        `\`tim distil trace shared/demo --source trace:ched-p${folder} [--out <file name>] --workspace ~/ws --json -- <subcommand and its arguments>\``

      test('has the characterise agent run the trace CLI through tim, in the source folder', async () => {
        const run = await runTrace()

        expect(promptOf(run, 'trace:ched-p characterise')).toContain(
          traceCommand('')
        )
      })

      test('gives each part agent and each verifier a trace folder of its own, so none opens over another', async () => {
        const run = await runTrace()

        expect({
          part: promptOf(run, 'trace:ched-p extract part 2/2').includes(
            traceCommand(' --folder part2')
          ),
          verify: promptOf(run, 'trace:ched-p verify 1/2').includes(
            traceCommand(' --folder verify1')
          )
        }).toEqual({ part: true, verify: true })
      })
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
        {
          'reconcile tiers': {
            ...AREA_RECONCILED,
            goalConflicts: [contradiction]
          }
        }
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

      expect(labelsOf(run)).not.toContain('repo:tests characterise')
      expect(labelsOf(run)).toContain('repo:tests verify 1/2')
    })

    test('has a stale source characterised again, sharing its old claim ids out among the parts', async () => {
      const run = await runDistil(
        {},
        {
          status: statusWith([
            {
              ...PENDING_SOURCE,
              state: 'stale',
              reason: 'The extract records no scope hash.'
            },
            VERIFIED_SOURCE
          ])
        }
      )

      expect(promptOf(run, 'repo:tests characterise')).toContain(
        "`jq -c '.claims[] | {id, ref}' ~/ws/workareas/shared/demo/distil/extract/repo-tests.json`"
      )
    })

    test('starts a pending source with no old claim ids to keep', async () => {
      const prompt = promptOf(await runDistil(), 'repo:tests characterise')

      expect(prompt).toContain(
        'KEEPS: This source has no extract yet, so no part has "keeps".'
      )
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
      expect(labelsOf(run)).not.toContain('reconcile across areas')
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
    const PARTITION_PROBLEMS = {
      ok: false,
      problems: [
        'distil/extract/repo-tests.partition.json parts[1].read needs at least 1 item.'
      ],
      parts: [],
      removedParts: [],
      summary: 'out of shape'
    }
    const PART_MISSING = {
      ok: false,
      stage: 'merge',
      problems: [
        'distil/extract/repo-tests.part2.json does not exist yet: part 2 (Fixtures) has no extract.'
      ],
      parts: [],
      claims: 0,
      ranges: 0,
      removedParts: [],
      summary: 'refused'
    }

    test('sends the characterise agent back once with the partition problems', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests check partition': PARTITION_PROBLEMS,
          'repo:tests characterise retry 1': CHARACTERISED,
          'repo:tests check partition 2': PARTITIONED
        }
      )

      expect(promptOf(run, 'repo:tests characterise retry 1')).toContain(
        '- distil/extract/repo-tests.partition.json parts[1].read needs at least 1 item.'
      )
      expect(run.result.stopped).toBeNull()
    })

    test('marks the source failed at characterise after one retry, and extracts no part', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests check partition': PARTITION_PROBLEMS,
          'repo:tests characterise retry 1': CHARACTERISED,
          'repo:tests check partition 2': PARTITION_PROBLEMS
        }
      )

      expect(run.result.sources[0]).toMatchObject({
        outcome: 'failed',
        failedAt: 'characterise'
      })
      expect(labelsOf(run)).not.toContain('repo:tests extract part 1/2')
    })

    test('sends back a partition whose prefixes are not the ones the workflow names', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests check partition': partitionedAs('tests'),
          'repo:tests characterise retry 1': CHARACTERISED,
          'repo:tests check partition 2': PARTITIONED
        }
      )

      expect(promptOf(run, 'repo:tests characterise retry 1')).toContain(
        '- part 1 has the prefix tests-p1. Give it repo-tests-p1, the prefix the workflow names'
      )
    })

    test('extracts again only the part a failed merge names', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests merge extract': PART_MISSING,
          'repo:tests extract part 2/2 retry 1': extractedPart(2),
          'repo:tests merge extract 2': MERGED_EXTRACT
        }
      )

      const retries = labelsOf(run).filter((label) => label.includes('retry'))
      expect(retries).toEqual(['repo:tests extract part 2/2 retry 1'])
      expect(run.result.stopped).toBeNull()
    })

    test('marks the source failed at extract when the merge fails twice, and stops before reconcile', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests merge extract': PART_MISSING,
          'repo:tests extract part 2/2 retry 1': extractedPart(2),
          'repo:tests merge extract 2': PART_MISSING
        }
      )

      expect(run.result.failed).toEqual(['repo:tests'])
      expect(run.result.sources[0]).toMatchObject({
        outcome: 'failed',
        failedAt: 'extract',
        problems: PART_MISSING.problems
      })
      expect(labelsOf(run)).not.toContain('working set')
    })

    test('characterises and extracts again an extracted source whose extract no longer checks out', async () => {
      const run = await runDistil(
        {},
        {
          status: statusWith([
            { ...PENDING_SOURCE, state: 'extracted', next: 'verify' },
            VERIFIED_SOURCE
          ]),
          'repo:tests check extract': {
            ...PART_MISSING,
            stage: undefined,
            problems: [
              'distil/extract/repo-tests.json is not its parts merged: a part changed after the merge, or the extract was written by hand.'
            ]
          }
        }
      )

      expect(labelsOf(run).slice(1, 4)).toEqual([
        'repo:tests check extract',
        'repo:tests characterise',
        'repo:tests check partition'
      ])
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
          'coverage after reconcile across areas': {
            ok: false,
            problems: [
              'req-002 cites repo-tests-009, which verification refuted. Cite a claim that held.'
            ],
            backlogProblems: [
              'req-003 is adopted as new but sits in no increment.'
            ],
            summary: 'two problems'
          },
          'reconcile across areas send-back 1': RECONCILED,
          'coverage after reconcile across areas 2': COVERAGE_OK
        }
      )

      const prompt = promptOf(run, 'reconcile across areas send-back 1')
      expect(prompt).toContain('- req-002 cites repo-tests-009')
      expect(prompt).not.toContain('- req-003 is adopted as new')
    })

    test('routes problems by the scope tim gives them, not their wording', async () => {
      const prompt = promptOf(
        await runDistil(),
        'coverage after reconcile across areas'
      )

      expect(prompt).toContain(
        'Copy the message\n   of each one whose scope is reconcile into problems, and of each one whose scope is backlog into backlogProblems'
      )
    })

    test('moves on to consolidate when coverage names only backlog problems', async () => {
      const run = await runDistil(
        {},
        {
          'coverage after reconcile across areas': {
            ...COVERAGE_OK,
            ok: false,
            backlogProblems: [
              'req-003 is adopted as new but sits in no increment.'
            ]
          }
        }
      )

      expect(labelsOf(run)).not.toContain('reconcile across areas send-back 1')
      expect(labelsOf(run)).toContain('combine rows')
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
          'coverage after reconcile across areas': refuted,
          'reconcile across areas send-back 1': RECONCILED,
          'coverage after reconcile across areas 2': refuted,
          'reconcile across areas send-back 2': RECONCILED,
          'coverage after reconcile across areas 3': refuted
        }
      )

      expect(run.result.stopped.reason).toBe('reconcile-failed')
      expect(labelsOf(run)).not.toContain('combine rows')
    })

    test('tells the reconciler a doubt about one part of the target is a question, never a plain reading', async () => {
      const prompt = promptOf(await runDistil(), 'reconcile across areas')

      expect(prompt).toContain(
        'WHERE A SOURCE OR RULING CANNOT BE MET AS WRITTEN in some part of the target (an environment, a repo, a journey or\na stage), or two readings of it would build different things, make it a question with a default that says what each\npart gets. Never adopt one plain reading for every part.'
      )
    })

    test('tells the consolidator to send back a criterion one environment cannot observe', async () => {
      const prompt = promptOf(await runDistil(), 'combine rows')

      expect(prompt).toContain(
        'EVERY ACCEPTANCE CRITERION CAN BE OBSERVED in every environment its row names. Never write one that cannot. Put the\nrequirement in reconcileProblems instead: the workflow sends it back to the reconciler.'
      )
    })

    describe('when the consolidator sends a requirement back', () => {
      const SENT_BACK =
        'req-007: the local stack has no real SQS, so "real, not stubbed" cannot be observed there.'
      const SENDS_BACK = { ...CONSOLIDATED, reconcileProblems: [SENT_BACK] }
      const ROUND_2 = {
        'combine rows': SENDS_BACK,
        'reconcile across areas, round 2': RECONCILED,
        'coverage after reconcile across areas, round 2': BACKLOG_OK,
        'combine rows, round 2': CONSOLIDATED,
        'check backlog, round 2': BACKLOG_OK
      }
      const runSentBack = (overrides = {}) =>
        runDistil({}, { ...ROUND_2, ...overrides })

      test('runs reconcile and consolidate again, then reports', async () => {
        const run = await runSentBack()

        expect(labelsOf(run).slice(-7)).toEqual([
          'combine rows',
          'check backlog',
          'reconcile across areas, round 2',
          'coverage after reconcile across areas, round 2',
          'combine rows, round 2',
          'check backlog, round 2',
          'report'
        ])
      })

      test('gives the reconciler the requirement as the consolidator worded it', async () => {
        const run = await runSentBack()

        expect(promptOf(run, 'reconcile across areas, round 2')).toContain(
          `THE CONSOLIDATOR SENT THESE BACK: it could not write an acceptance criterion that every environment its row names can\nobserve. Settle each one as a question with a default that says what each part gets, or reword the requirement:\n- ${SENT_BACK}`
        )
      })

      test('tells the second consolidator its first pass is there to rewrite', async () => {
        const run = await runSentBack()

        const prompt = promptOf(run, 'combine rows, round 2')
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
        const run = await runSentBack({ 'combine rows, round 2': SENDS_BACK })

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

      expect({
        plan: promptOf(run, 'area plan').includes(
          'Give every existing\nrequirement and conflict to exactly one area'
        ),
        area: promptOf(run, 'reconcile suite').includes(
          'keep every one of them, id unchanged.'
        ),
        across: promptOf(run, 'reconcile across areas').includes(
          'This is a re-distil: requirements and conflicts existed before this run. Keep every existing id.'
        )
      }).toEqual({ plan: true, area: true, across: true })
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
            'coverage after reconcile across areas': BEFORE,
            'check backlog': afterWith({}),
            ...answerOverrides
          }
        )

      test('has tim save the rows before the consolidator runs, and compare them after', async () => {
        const run = await runRedistil({})

        expect(
          promptOf(run, 'coverage after reconcile across areas')
        ).toContain(
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
          'combine rows send-back 1': CONSOLIDATED,
          'check backlog 2': afterWith({})
        })

        expect(promptOf(run, 'combine rows send-back 1')).toContain(
          '- inc-001: a row built or set aside (not todo or blocked) changed.'
        )
        expect(run.result.stopped).toBeNull()
      })

      test('stops with snapshot-failed when the rows could not be saved', async () => {
        const run = await runRedistil({
          'coverage after reconcile across areas': {
            ...BEFORE,
            snapshotOk: false,
            snapshotProblems: ['backlog.json is not valid JSON.']
          }
        })

        expect(run.result.stopped.reason).toBe('snapshot-failed')
        expect(labelsOf(run)).not.toContain('combine rows')
      })

      describe('with a theme split off early', () => {
        const SPLIT_OFF_BEFORE = {
          theme: 'smoke-gate',
          branch: 'feat/NO_JIRA-demo-smoke-gate',
          workarea: 'shared/demo/themes/smoke-gate',
          touches: ['tests:k6/smoke'],
          requirements: ['req-002'],
          pickUp: []
        }
        const STANDING = {
          theme: 'smoke-gate',
          branch: 'feat/NO_JIRA-demo-smoke-gate',
          workarea: 'shared/demo/themes/smoke-gate',
          backlog: 'themes/smoke-gate/backlog.json',
          requirements: ['req-002'],
          pickUp: ['req-007'],
          changed: ['req-002'],
          noLongerToBuild: [],
          nowInPlace: []
        }
        const runSplitOff = (answerOverrides = {}) =>
          runRedistil({
            'coverage after reconcile across areas': {
              ...BEFORE,
              splitOffBefore: [SPLIT_OFF_BEFORE]
            },
            'check backlog': afterWith({
              splitOffChanged: [],
              backlogCoveredBySplitOff: 2,
              splitOff: [STANDING]
            }),
            ...answerOverrides
          })

        test('has tim save the split-off pointers with the rows, and compare them after', async () => {
          const run = await runSplitOff()

          expect([
            promptOf(run, 'coverage after reconcile across areas'),
            promptOf(run, 'check backlog')
          ]).toEqual([
            expect.stringContaining(
              'every entry of result.splitOff into splitOffBefore, exactly'
            ),
            expect.stringContaining(
              'result.compared.splitOffChanged into removed, changed and splitOffChanged, exactly'
            )
          ])
        })

        test('tells every drafter to draft no row for what a split-off theme holds or touches', async () => {
          const run = await runSplitOff()

          expect(promptOf(run, 'draft rows suite')).toContain(
            'THEMES SPLIT OFF EARLY. These left backlog.json and build on their own branches:\n- smoke-gate, on feat/NO_JIRA-demo-smoke-gate: touches tests:k6/smoke; holds req-002\nDraft no row for a requirement one of them holds'
          )
        })

        test('tells the combiner to carry the pointers over and hand new work to pickUp', async () => {
          const run = await runSplitOff()

          expect(promptOf(run, 'combine rows')).toContain(
            'Carry backlog.json\'s "splitOff" over unchanged: never remove a pointer or change any of its fields but "pickUp".'
          )
        })

        test('sends the combiner back when a pointer changed', async () => {
          const run = await runSplitOff({
            'check backlog': afterWith({ splitOffChanged: ['smoke-gate'] }),
            'combine rows send-back 1': CONSOLIDATED,
            'check backlog 2': afterWith({ splitOffChanged: [] })
          })

          expect(promptOf(run, 'combine rows send-back 1')).toContain(
            '- smoke-gate: a theme split off early lost its pointer in "splitOff", or the pointer changed in a field other than "pickUp".'
          )
        })

        test('sends the combiner back when the check relays no pointer comparison', async () => {
          const run = await runSplitOff({
            'check backlog': afterWith({}),
            'combine rows send-back 1': CONSOLIDATED,
            'check backlog 2': afterWith({ splitOffChanged: [] })
          })

          expect(labelsOf(run)).toContain('combine rows send-back 1')
        })

        test('has the report hand each split branch what falls to it, naming the branch', async () => {
          const run = await runSplitOff()

          expect(promptOf(run, 'report')).toContain(
            'Write the "For the split branches" section, as REPORT.md says, with\none part per theme below, naming its branch, and say in the summary that a split branch has work to pick up:\n- smoke-gate, on feat/NO_JIRA-demo-smoke-gate (shared/demo/themes/smoke-gate):\n  to pick up, adopted since the split: req-007\n  changed since the split: req-002\n  no longer to build: none'
          )
        })

        test('returns what each split-off theme holds and has to pick up', async () => {
          const run = await runSplitOff()

          expect([
            run.result.splitOff,
            run.result.backlog.coveredBySplitOff
          ]).toEqual([[STANDING], 2])
        })

        test('says nothing of split-off themes when the backlog has none', async () => {
          const run = await runRedistil({})

          const mentions = run.agents
            .filter(({ prompt }) => prompt.includes('THEMES SPLIT OFF EARLY'))
            .map(({ options }) => options.label)
          expect([mentions, run.result.splitOff]).toEqual([[], []])
        })
      })

      test('stops with consolidate-failed when a row stays removed after two send-backs', async () => {
        const removed = afterWith({ removed: ['inc-001'] })
        const run = await runRedistil({
          'check backlog': removed,
          'combine rows send-back 1': CONSOLIDATED,
          'check backlog 2': removed,
          'combine rows send-back 2': CONSOLIDATED,
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
          'combine rows send-back 1': CONSOLIDATED,
          'check backlog 2': BACKLOG_OK
        }
      )

      expect(promptOf(run, 'combine rows send-back 1')).toContain(
        '- inc-002 depends on inc-009, which is not in the backlog.'
      )
    })
  })

  describe('relays the workflow builds on', () => {
    test('asks the extract check again when the merge relayed no verify ranges, then verifies every range', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests merge extract': { ...MERGED_EXTRACT, ranges: 0 },
          'repo:tests check extract again': CHECKED
        }
      )

      expect({
        asked: promptOf(run, 'repo:tests check extract again').includes(
          'the extract check relayed 0 verify ranges, but 3 claims in ranges of 2 make 2'
        ),
        verifiers: labelsOf(run).filter((label) =>
          label.startsWith('repo:tests verify ')
        )
      }).toEqual({
        asked: true,
        verifiers: ['repo:tests verify 1/2', 'repo:tests verify 2/2']
      })
    })

    test('fails the source at extract when the relay is wrong twice, and verifies nothing', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests merge extract': { ...MERGED_EXTRACT, ranges: 0 },
          'repo:tests check extract again': { ...CHECKED, ranges: 0 }
        }
      )

      expect({
        source: run.result.sources[0].failedAt,
        verified: labelsOf(run).some((label) => label.includes('verify'))
      }).toEqual({ source: 'extract', verified: false })
    })

    test('works out each verify range from the claim count, never from a relayed list', async () => {
      const run = await runDistil()

      expect(promptOf(run, 'repo:tests verify 2/2')).toContain(
        '1 claims, at indexes 2 to 2 of the extract.'
      )
    })

    test('asks the partition check again when it relayed fewer parts than characterise wrote', async () => {
      const run = await runDistil(
        {},
        {
          'repo:tests check partition': {
            ...PARTITIONED,
            parts: PARTITIONED.parts.slice(0, 1)
          },
          'repo:tests check partition again': PARTITIONED
        }
      )

      expect(labelsOf(run)).toContain('repo:tests extract part 2/2')
    })

    test('asks the coverage check again when it relayed fewer questions than it counted', async () => {
      const run = await runDistil(
        {},
        {
          'coverage after reconcile across areas': {
            ...COVERAGE_OK,
            questions: []
          },
          'coverage after reconcile across areas again': COVERAGE_OK
        }
      )

      expect(labelsOf(run)).toContain('challenge c-001')
    })
  })

  describe('reconcile by area', () => {
    test('gives each area reconciler its own working set, file and check', async () => {
      const prompt = promptOf(await runDistil(), 'reconcile tiers')

      expect({
        workingSet: prompt.includes(
          'YOUR WORKING SET, every claim of it (3 claims, in pages if you need to): /ws/workareas/shared/demo/distil/areas/tiers/working-set.json.'
        ),
        file: prompt.includes(
          'THE FILE YOU WRITE: /ws/workareas/shared/demo/distil/areas/tiers/reconciled.json'
        ),
        check: prompt.includes(
          '`tim distil merge-reconcile shared/demo --area tiers --workspace ~/ws --json`'
        )
      }).toEqual({ workingSet: true, file: true, check: true })
    })

    test('runs the area plan, every area reconciler, every challenger and every drafter on opus', async () => {
      const run = await runDistil()

      expect(
        [
          'area plan',
          'reconcile suite',
          'reconcile across areas',
          'challenge c-001',
          'draft rows tiers',
          'combine rows'
        ].map((label) => optionsOf(run, label).model)
      ).toEqual(['opus', 'opus', 'opus', 'opus', 'opus', 'opus'])
    })

    test('tells every reconciler to weigh today sources and keep questions minimal', async () => {
      const run = await runDistil()

      const missing = ['reconcile suite', 'reconcile across areas'].filter(
        (label) =>
          !promptOf(run, label).includes(
            'WEIGH EVERY CLAIM FROM A TODAY SOURCE'
          ) ||
          !promptOf(run, label).includes('QUESTIONS ARE MINIMAL BY DEFAULT')
      )
      expect(missing).toEqual([])
    })

    test('reconciles at most six areas at once, in plan order', async () => {
      const areas = Array.from({ length: 8 }, (_, index) => ({
        id: `area-${index + 1}`,
        title: `Area ${index + 1}`
      }))
      const answers = Object.fromEntries(
        areas.map((area) => [`reconcile ${area.id}`, AREA_RECONCILED])
      )
      const run = await runDistil(
        {},
        {
          'area plan': { ...AREA_PLANNED, areas },
          'area working sets': {
            ...AREA_SETS,
            areas: areas.map((area) => ({ id: area.id, claims: 1 })),
            total: 8
          },
          'merge areas': {
            ...AREAS_MERGED,
            areas: areas.map((area) => area.id)
          },
          ...answers
        }
      )

      expect(
        labelsOf(run).filter((label) => /^reconcile area-/.test(label))
      ).toEqual(areas.map((area) => `reconcile ${area.id}`))
    })

    test('reconciles again only the area a failed merge names', async () => {
      const run = await runDistil(
        {},
        {
          'merge areas': {
            ok: false,
            problems: [
              "distil/areas/tiers/reconciled.json req-tiers-001 cites dr5-404, which is not in this area's working set."
            ],
            areas: [],
            requirements: 0,
            conflicts: 0,
            summary: 'refused'
          },
          'reconcile tiers retry 1': AREA_RECONCILED,
          'merge areas 2': AREAS_MERGED
        }
      )

      expect(labelsOf(run).filter((label) => label.includes('retry'))).toEqual([
        'reconcile tiers retry 1'
      ])
    })

    test('stops with areas-failed when the area plan will not check out', async () => {
      const refused = {
        ok: false,
        problems: [
          'repo:tests has 4 claims in no area: tests-001, tests-002, tests-005, tests-001-m1. Give each to the area it speaks to, or name the source in everyArea.'
        ],
        areas: [],
        total: 0,
        removed: [],
        summary: 'refused'
      }
      const run = await runDistil(
        {},
        {
          'area working sets': refused,
          'area plan retry 1': AREA_PLANNED,
          'area working sets 2': refused
        }
      )

      expect({
        reason: run.result.stopped.reason,
        retried: promptOf(run, 'area plan retry 1').includes(
          '- repo:tests has 4 claims in no area'
        )
      }).toEqual({ reason: 'areas-failed', retried: true })
    })
  })

  describe('the question challenge', () => {
    const SETTLED = {
      ok: true,
      conflict: 'c-001',
      verdict: 'precedence',
      rule: 'ruling:sam claim 2 puts the suites in the tests repo.',
      summary: 'settled'
    }
    const AFTER_APPLY = {
      ...COVERAGE_OK,
      conflicts: { total: 1, precedence: 1, question: 0 },
      questions: []
    }

    test('gives each challenger its question, its verdict file and its check', async () => {
      const prompt = promptOf(await runDistil(), 'challenge c-001')

      expect({
        file: prompt.includes(
          'THE FILE YOU WRITE: /ws/workareas/shared/demo/distil/challenge/c-001.json'
        ),
        check: prompt.includes(
          '`tim distil challenge shared/demo --conflict c-001 --workspace ~/ws --json`'
        )
      }).toEqual({ file: true, check: true })
    })

    test('applies a settling verdict and reports only the questions that survive', async () => {
      const run = await runDistil(
        {},
        {
          'challenge c-001': SETTLED,
          'apply challenges': {
            ok: true,
            applied: ['c-001: precedence'],
            decisions: [],
            summary: 'applied'
          },
          'coverage after apply challenges': AFTER_APPLY,
          'check backlog': { ...BACKLOG_OK, ...AFTER_APPLY }
        }
      )

      expect({
        challenge: run.result.challenge,
        questions: run.result.questions
      }).toEqual({
        challenge: {
          challenged: 1,
          settled: ['c-001'],
          blocked: [],
          survived: []
        },
        questions: []
      })
    })

    test('runs no apply step when every question stands', async () => {
      const run = await runDistil()

      expect(labelsOf(run)).not.toContain('apply challenges')
    })

    test('stops with challenge-failed when the verdicts are still not applied after two send-backs', async () => {
      const unapplied = {
        ok: false,
        problems: [
          'distil/challenge/c-001.json settled it by precedence (rule), but distil/conflicts.json still has c-001 as a question.'
        ],
        backlogProblems: [],
        questions: [],
        summary: 'one problem'
      }
      const run = await runDistil(
        {},
        {
          'challenge c-001': SETTLED,
          'coverage after apply challenges': unapplied,
          'coverage after apply challenges 2': unapplied,
          'coverage after apply challenges 3': unapplied
        }
      )

      expect(run.result.stopped.reason).toBe('challenge-failed')
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
