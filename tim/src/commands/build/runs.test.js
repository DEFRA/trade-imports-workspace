import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const PROJECTS = join(
  here,
  '..',
  '..',
  'build',
  'runs',
  '__fixtures__',
  'projects'
)
const FINISHED = 'wf_aaaa0001-001'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const seedWorkspace = () => {
  root = mkdtempSync(join(tmpdir(), 'tim-build-runs-cli-'))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  mkdirSync(join(root, 'repos'))
}

const runTim = (args) =>
  execa('node', [cliPath, ...args, '--workspace', root], {
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1' }
  })

const envelopeOf = (run) => JSON.parse(run.stdout.trim())

describe('tim build runs archive', () => {
  test('archives every run into workareas/build-telemetry and lists each one', async () => {
    seedWorkspace()

    const run = await runTim([
      'build',
      'runs',
      'archive',
      '--all',
      '--projects',
      PROJECTS,
      '--json'
    ])

    expect({
      exitCode: run.exitCode,
      ok: envelopeOf(run).ok,
      archiveRoot: envelopeOf(run).result.archiveRoot,
      runs: envelopeOf(run).result.runs.map(({ runId, status, copied }) => ({
        runId,
        status,
        copied
      })),
      index: existsSync(
        join(root, 'workareas', 'build-telemetry', 'index.json')
      )
    }).toEqual({
      exitCode: 0,
      ok: true,
      archiveRoot: join(root, 'workareas', 'build-telemetry'),
      runs: [
        { runId: FINISHED, status: 'completed', copied: 12 },
        { runId: 'wf_aaaa0002-002', status: 'unfinished', copied: 3 }
      ],
      index: true
    })
  })

  test('refuses a run id and --all together', async () => {
    seedWorkspace()

    const run = await runTim([
      'build',
      'runs',
      'archive',
      FINISHED,
      '--all',
      '--projects',
      PROJECTS,
      '--json'
    ])

    expect({ exitCode: run.exitCode, errors: envelopeOf(run).errors }).toEqual({
      exitCode: 2,
      errors: [
        {
          code: 'USAGE',
          message: 'Name one run, or pass --all — not both, and not neither.'
        }
      ]
    })
  })

  test('says it cannot find a run that does not exist', async () => {
    seedWorkspace()

    const run = await runTim([
      'build',
      'runs',
      'archive',
      'wf_nothing-here',
      '--projects',
      PROJECTS
    ])

    expect({ exitCode: run.exitCode, stderr: run.stderr }).toEqual({
      exitCode: 2,
      stderr: `Cannot find run wf_nothing-here under ${PROJECTS}.`
    })
  })
})

describe('tim build runs report', () => {
  test('reports an archived run as one JSON envelope', async () => {
    seedWorkspace()
    await runTim(['build', 'runs', 'archive', FINISHED, '--projects', PROJECTS])

    const run = await runTim(['build', 'runs', 'report', FINISHED, '--json'])

    expect({
      exitCode: run.exitCode,
      runId: envelopeOf(run).result.run.runId,
      totalTokens: envelopeOf(run).result.totals.totalTokens,
      increments: envelopeOf(run).result.increments.map(
        ({ increment }) => increment
      )
    }).toEqual({
      exitCode: 0,
      runId: FINISHED,
      totalTokens: 25375,
      increments: ['(run)', 'inc-001']
    })
  })

  test('prints a plain-text table by default', async () => {
    seedWorkspace()
    await runTim(['build', 'runs', 'archive', FINISHED, '--projects', PROJECTS])

    const run = await runTim(['build', 'runs', 'report', 'aaaa0001-001'])

    expect(run.stdout.split('\n')[0]).toBe(
      'Run wf_aaaa0001-001 — increment-build-loop, completed'
    )
  })

  test('tells you to archive a run before reporting on it', async () => {
    seedWorkspace()

    const run = await runTim(['build', 'runs', 'report', FINISHED, '--json'])

    expect({ exitCode: run.exitCode, errors: envelopeOf(run).errors }).toEqual({
      exitCode: 2,
      errors: [
        {
          code: 'NOT_FOUND',
          message: `Run ${FINISHED} is not in the archive. Archive it first: tim build runs archive ${FINISHED}`
        }
      ]
    })
  })

  test('reports every archived run of every workflow', async () => {
    seedWorkspace()
    await runTim(['build', 'runs', 'archive', '--all', '--projects', PROJECTS])

    const run = await runTim([
      'build',
      'runs',
      'report',
      '--all',
      '--workflow',
      'all',
      '--json'
    ])

    expect(
      envelopeOf(run).result.runs.map(({ run: summary }) => summary.runId)
    ).toEqual([FINISHED, 'wf_aaaa0002-002'])
  })
})
