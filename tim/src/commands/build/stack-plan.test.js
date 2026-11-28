import { execa } from 'execa'
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'

const cliPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'cli.js'
)

const SCOPE = {
  default: { suites: ['all'] },
  'trade-imports-plants-frontend': { suites: ['tests/plants/'] },
  'trade-imports-animals-frontend': { suites: ['tests/animals/'] }
}

let workspace

const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2))
}

const givenBacklog = (backlog) =>
  writeJson(
    join(workspace, 'workareas', 'shared', 'theme', 'backlog.json'),
    backlog
  )

const runPlan = (args = []) =>
  execa(
    'node',
    [
      cliPath,
      'build',
      'stack-plan',
      'shared/theme',
      '--workspace',
      workspace,
      ...args
    ],
    {
      reject: false,
      all: true
    }
  )

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(join(tmpdir(), 'tim-stack-plan-')))
  markWorkspaceRoot(workspace)
  writeJson(join(workspace, 'config', 'e2e-tests-pr-scope.json'), SCOPE)
  mkdirSync(
    join(
      workspace,
      'repos',
      'trade-imports-ins-tests',
      'tests',
      'animals-admin'
    ),
    { recursive: true }
  )
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('tim build stack-plan', () => {
  const REPOS = {
    plantsfrontend: {
      path: 'repos/trade-imports-plants-frontend',
      github: 'DEFRA/trade-imports-plants-frontend'
    },
    workspace: { path: '.', github: 'DEFRA/trade-imports-workspace' }
  }

  test('Should narrow a plants theme to the plants services', async () => {
    givenBacklog({
      repos: REPOS,
      increments: [
        {
          id: 'inc-001',
          repos: ['plantsfrontend', 'workspace'],
          status: 'todo'
        }
      ]
    })

    const run = await runPlan()

    expect(run.stdout.split('\n')[0]).toBe(
      'Narrowed: 10 of 22 services, for plants.'
    )
  })

  test('Should say a workspace-only theme needs no stack, and why', async () => {
    givenBacklog({
      repos: REPOS,
      increments: [{ id: 'inc-001', repos: ['workspace'], status: 'todo' }]
    })

    const run = await runPlan()

    expect(run.stdout.split('\n').slice(0, 3)).toEqual([
      'No row changes a service repo, so no row runs an end-to-end suite.',
      'This run needs no stack at all, against 22 services for the whole stack.',
      '  inc-001: it changes no service repo'
    ])
  })

  test('Should leave out rows already built, unless asked for every row', async () => {
    givenBacklog({
      repos: REPOS,
      increments: [
        { id: 'inc-001', repos: ['plantsfrontend'], status: 'done' },
        { id: 'inc-002', repos: ['workspace'], status: 'todo' }
      ]
    })

    const [left, every] = await Promise.all([
      runPlan(),
      runPlan(['--every-row'])
    ])

    expect({
      left: left.stdout.includes('needs no stack at all'),
      every: every.stdout.includes('Narrowed: 10 of 22')
    }).toEqual({ left: true, every: true })
  })

  test('Should leave a repo’s tagged domains to the pull request under --e2e targeted', async () => {
    writeJson(join(workspace, 'config', 'e2e-tests-pr-scope.json'), {
      ...SCOPE,
      'trade-imports-animals-frontend': {
        suites: ['tests/animals/'],
        tags: ['@animals-frontend']
      }
    })
    writeFileSync(
      join(
        workspace,
        'repos',
        'trade-imports-ins-tests',
        'tests',
        'animals-admin',
        'seed.spec.ts'
      ),
      "test('seeds through the animals frontend', { tag: '@animals-frontend' })",
      { flag: 'w' }
    )
    givenBacklog({
      repos: {
        frontend: {
          path: 'repos/trade-imports-animals-frontend',
          github: 'DEFRA/trade-imports-animals-frontend'
        }
      },
      increments: [{ id: 'inc-001', repos: ['frontend'], status: 'todo' }]
    })

    const [whole, targeted] = await Promise.all([
      runPlan(['--json']),
      runPlan(['--e2e', 'targeted', '--json'])
    ])

    expect({
      whole: JSON.parse(whole.stdout.split('\n').at(-1)).result.domains,
      targeted: JSON.parse(targeted.stdout.split('\n').at(-1)).result.domains
    }).toEqual({
      whole: ['animals', 'animals-admin'],
      targeted: ['animals']
    })
  })

  test('Should give the plan in --json, with the services it would start', async () => {
    givenBacklog({
      repos: REPOS,
      increments: [{ id: 'inc-001', repos: ['plantsfrontend'], status: 'todo' }]
    })

    const run = await runPlan(['--json'])
    const { ok, result } = JSON.parse(run.stdout.split('\n').at(-1))

    expect({
      ok,
      needsStack: result.needsStack,
      domains: result.domains,
      services: result.services.length
    }).toEqual({
      ok: true,
      needsStack: true,
      domains: ['plants'],
      services: 10
    })
  })
})
