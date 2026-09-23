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
    'scope',
    'executor',
    'planOnly',
    'repos',
    'models',
    'increments',
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
  models: { light: 'fixture-light' },
  increments: ['inc-900'],
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
      'config.increments must be a non-empty list'
    )
    expect(run.logs.length).toBe(1)
    expect(run.agents).toEqual([])
  })

  test('refuses a models value that is not an object', async () => {
    const run = await runWorkflowScript(scriptPath, {
      args: { ...BASE_ARGS, models: null }
    })

    expect(run.error.message).toContain('config.models must be an object')
    expect(run.agents).toEqual([])
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
})
