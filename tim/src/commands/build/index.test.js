import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  createBareRepo,
  createFatClone
} from '../../test-support/git-fixtures.js'
import { GATES_PATH } from '../../build/gates.js'
import { renderBranchText, renderGateText } from './index.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const WORKAREA = 'shared/programme'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const runTim = (args) =>
  execa('node', [cliPath, ...args, '--workspace', root], {
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1' }
  })

const envelopeOf = (run) => JSON.parse(run.stdout.trim())

const seedWorkspace = (repoFolders) => {
  root = mkdtempSync(join(tmpdir(), 'tim-build-cli-'))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  mkdirSync(join(root, 'repos'), { recursive: true })
  const workarea = join(root, 'workareas', 'shared', 'programme')
  mkdirSync(workarea, { recursive: true })
  writeFileSync(
    join(workarea, 'backlog.json'),
    JSON.stringify({
      repos: Object.fromEntries(
        repoFolders.map((folder) => [folder, { path: `repos/${folder}` }])
      )
    })
  )
}

const seedClonedRepo = async (folder) => {
  seedWorkspace([folder])
  const { barePath, shas } = await createBareRepo(join(root), folder, {
    withGhPages: false
  })
  await createFatClone(barePath, join(root, 'repos', folder))
  return shas
}

const seedGateRepo = (scripts) => {
  seedWorkspace(['frontend'])
  mkdirSync(dirname(join(root, GATES_PATH)), { recursive: true })
  writeFileSync(
    join(root, GATES_PATH),
    JSON.stringify({
      repos: {
        frontend: { rungs: [{ name: 'unit', phase: 'unit', run: 'test' }] }
      }
    })
  )
  mkdirSync(join(root, 'repos', 'frontend'))
  writeFileSync(
    join(root, 'repos', 'frontend', 'package.json'),
    JSON.stringify({ name: 'frontend', version: '0.0.0', scripts })
  )
}

describe('tim build branch', () => {
  test('cuts the branch in every backlog repo and reports each one', async () => {
    const shas = await seedClonedRepo('frontend')

    const run = await runTim([
      'build',
      'branch',
      WORKAREA,
      'feat/EUDPA-9',
      '--json'
    ])

    expect({ exitCode: run.exitCode, envelope: envelopeOf(run) }).toEqual({
      exitCode: 0,
      envelope: expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          branch: 'feat/EUDPA-9',
          repos: [
            expect.objectContaining({
              repo: 'frontend',
              head: shas.main,
              created: true
            })
          ]
        })
      })
    })
  })

  test('refuses a branch name git would not accept', async () => {
    seedWorkspace(['frontend'])

    const run = await runTim(['build', 'branch', WORKAREA, 'feat..bad'])

    expect({ exitCode: run.exitCode, stderr: run.stderr }).toEqual({
      exitCode: 2,
      stderr: expect.stringContaining('The branch name is not valid.')
    })
  })

  test('exits 1 with DIRTY_TREE when a repo has uncommitted work', async () => {
    await seedClonedRepo('frontend')
    writeFileSync(join(root, 'repos', 'frontend', 'scratch.txt'), 'x\n')

    const run = await runTim(['build', 'branch', WORKAREA, 'feat/x', '--json'])

    expect({
      exitCode: run.exitCode,
      code: envelopeOf(run).errors[0].code
    }).toEqual({ exitCode: 1, code: 'DIRTY_TREE' })
  })
})

describe('tim build gate', () => {
  test('passes and exits 0 when every rung passes', async () => {
    seedGateRepo({ test: 'echo tested' })

    const run = await runTim([
      'build',
      'gate',
      WORKAREA,
      '--phase',
      'unit',
      '--json'
    ])

    expect({ exitCode: run.exitCode, envelope: envelopeOf(run) }).toEqual({
      exitCode: 0,
      envelope: expect.objectContaining({
        ok: true,
        errors: [],
        result: expect.objectContaining({
          green: true,
          rungs: [
            expect.objectContaining({
              repo: 'frontend',
              name: 'unit',
              ok: true
            })
          ]
        })
      })
    })
  })

  test('exits 1 and keeps the rung results when a rung fails', async () => {
    seedGateRepo({ test: 'exit 2' })

    const run = await runTim([
      'build',
      'gate',
      WORKAREA,
      '--phase',
      'unit',
      '--json'
    ])

    expect({ exitCode: run.exitCode, envelope: envelopeOf(run) }).toEqual({
      exitCode: 1,
      envelope: expect.objectContaining({
        ok: false,
        errors: [
          { code: 'GATE_FAILED', message: 'The gate failed: frontend unit.' }
        ],
        result: expect.objectContaining({
          green: false,
          rungs: [expect.objectContaining({ ok: false, exitCode: 2 })]
        })
      })
    })
  })

  test('prints nothing from the rung itself', async () => {
    seedGateRepo({ test: 'echo SHOULD-ONLY-BE-IN-THE-LOG' })

    const run = await runTim(['build', 'gate', WORKAREA, '--phase', 'unit'])

    expect(run.stdout).not.toContain('SHOULD-ONLY-BE-IN-THE-LOG')
  })

  test('runs serially with --serial and says so, with how long it took', async () => {
    seedGateRepo({ test: 'echo tested' })

    const run = await runTim([
      'build',
      'gate',
      WORKAREA,
      '--phase',
      'unit',
      '--serial',
      '--json'
    ])

    expect(envelopeOf(run).result).toEqual(
      expect.objectContaining({
        serial: true,
        durationMs: expect.any(Number),
        phases: { unit: { durationMs: expect.any(Number) } }
      })
    )
  })

  test('runs repos at the same time by default', async () => {
    seedGateRepo({ test: 'echo tested' })

    const run = await runTim([
      'build',
      'gate',
      WORKAREA,
      '--phase',
      'unit',
      '--json'
    ])

    expect(envelopeOf(run).result.serial).toBe(false)
  })

  test('refuses an unknown phase', async () => {
    seedGateRepo({ test: 'echo tested' })

    const run = await runTim(['build', 'gate', WORKAREA, '--phase', 'smoke'])

    expect({ exitCode: run.exitCode, stderr: run.stderr.trim() }).toEqual({
      exitCode: 2,
      stderr: '--phase must be one of: unit, fit, e2e, all.'
    })
  })
})

describe('renderGateText for a held stack', () => {
  test('says the stack was not the gate’s to use, and who holds it', () => {
    expect(
      renderGateText({
        green: false,
        logs: '/logs',
        rungs: [
          {
            repo: 'tests',
            name: 'e2e-plants',
            phase: 'e2e',
            ok: false,
            reason: 'The workspace stack is leased to "x".'
          }
        ],
        stack: {
          wasUp: true,
          startedForE2e: false,
          stoppedAfter: false,
          held: {
            holder: 'x',
            detail: 'The workspace stack is leased to "x".'
          }
        }
      }).split('\n')[2]
    ).toBe(
      'The workspace stack was not the gate’s to use: The workspace stack is leased to "x".'
    )
  })
})

describe('renderGateText for a stack its holder already leased', () => {
  test('says which services it rebuilt, restarted and left, and how long each phase took', () => {
    expect(
      renderGateText({
        green: true,
        logs: '/logs',
        rungs: [],
        durationMs: 251_400,
        phases: { unit: { durationMs: 105_000 }, e2e: { durationMs: 250_600 } },
        serial: false,
        stack: {
          wasUp: true,
          startedForE2e: false,
          stoppedAfter: false,
          held: null,
          refresh: {
            ok: true,
            rebuilt: ['trade-imports-plants-frontend'],
            restarted: [],
            left: ['trade-imports-stub', 'trade-imports-ins-backend']
          }
        }
      })
        .split('\n')
        .slice(1, 3)
    ).toEqual([
      'The workspace stack was already up under this holder’s lease. The gate brought each service up to date with local source and left the stack up. Rebuilt: trade-imports-plants-frontend. Restarted: none. Left as they were: trade-imports-stub, trade-imports-ins-backend.',
      'Took 251s (unit 105s, e2e 251s), unit and FIT first, repos at the same time, then performance, then E2E.'
    ])
  })

  test('says it cannot tell whether the stack files changed in a workspace that is not a git checkout', () => {
    expect(
      renderGateText({
        green: true,
        logs: '/logs',
        rungs: [],
        durationMs: 1000,
        phases: {},
        serial: false,
        stack: {
          wasUp: true,
          startedForE2e: false,
          stoppedAfter: false,
          held: null,
          refresh: {
            ok: true,
            restacked: false,
            stackFilesKnown: false,
            rebuilt: [],
            restarted: [],
            left: ['trade-imports-stub']
          }
        }
      }).split('\n')[1]
    ).toBe(
      'The workspace stack was already up under this holder’s lease. The gate brought each service up to date with local source and left the stack up. Rebuilt: none. Restarted: none. Left as they were: trade-imports-stub. The workspace is not a git checkout, so the gate cannot tell whether its stack files (docker/stack, scripts/stack) changed, and did not start the whole stack again.'
    )
  })

  test('says it started the whole stack again when the workspace’s stack files had changed', () => {
    expect(
      renderGateText({
        green: true,
        logs: '/logs',
        rungs: [],
        durationMs: 1000,
        phases: {},
        serial: false,
        stack: {
          wasUp: true,
          startedForE2e: false,
          stoppedAfter: false,
          held: null,
          refresh: {
            ok: true,
            restacked: true,
            restackLog: '/logs/gate-stack-restack.log',
            rebuilt: [],
            restarted: [],
            left: []
          }
        }
      }).split('\n')[1]
    ).toBe(
      'The workspace stack was already up under this holder’s lease. The gate brought each service up to date with local source and left the stack up. The workspace’s stack files had changed, so the gate started the whole stack again with them. Read /logs/gate-stack-restack.log.'
    )
  })
})

describe('renderBranchText', () => {
  test('says what happened in each repo', () => {
    expect(
      renderBranchText({
        branch: 'feat/x',
        repos: [
          {
            repo: 'frontend',
            branch: 'feat/x',
            head: 'abcdef0123456789',
            created: true,
            createdFrom: 'origin/main',
            ok: true
          },
          {
            repo: 'backend',
            branch: 'feat/x',
            head: '0123456789abcdef',
            created: false,
            switched: false,
            ok: true
          }
        ]
      })
    ).toBe(
      [
        'Every repo on feat/x:',
        '  frontend  cut feat/x from origin/main at abcdef012345',
        '  backend  already on feat/x at 0123456789ab'
      ].join('\n')
    )
  })
})

describe('renderGateText', () => {
  test('lists each rung and says what happened to the stack', () => {
    expect(
      renderGateText({
        green: false,
        logs: '/logs',
        rungs: [
          {
            repo: 'frontend',
            name: 'unit',
            phase: 'unit',
            ok: true,
            durationMs: 2000
          },
          {
            repo: 'tests',
            name: 'e2e-plants',
            phase: 'e2e',
            ok: false,
            reason: 'npm exited 1. Read /logs/gate-tests-e2e-plants.log.'
          }
        ],
        stack: { wasUp: false, startedForE2e: true, stoppedAfter: true }
      })
    ).toBe(
      [
        'Gate failed: 1 of 2 rungs failed.',
        '  pass  unit  frontend unit (2s)',
        '  FAIL  e2e  tests e2e-plants — npm exited 1. Read /logs/gate-tests-e2e-plants.log.',
        'The gate started the workspace stack from local source and stopped it afterwards.',
        'Logs are in /logs.'
      ].join('\n')
    )
  })
})
