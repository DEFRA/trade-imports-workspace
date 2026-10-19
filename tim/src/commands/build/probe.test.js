import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { createRepoOnMain } from '../../test-support/branched-repo.js'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import { renderProbeText } from './probe.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const workspaceWithRepo = async () => {
  root = createCliWorkspace('tim-build-probe-cli-')
  await createRepoOnMain(join(root, 'repos', 'prices'), {
    'package.json': '{ "type": "module" }\n',
    'src/prices.js': 'export const basePrice = 10\nexport const spare = 1\n',
    'prices.check.js':
      "import { basePrice } from './src/prices.js'\nif (basePrice !== 10) process.exit(1)\n"
  })
}

const runTim = (args) => runTimInWorkspace(root, args)

const probeArgs = (inversion) => [
  'build',
  'probe',
  'prices',
  'src/prices.js',
  ...inversion,
  '--logs',
  join(root, 'logs'),
  '--json',
  '--',
  process.execPath,
  'prices.check.js'
]

describe('tim build probe', () => {
  test('reports redOnBase for a line the test witnesses, and exits 0', async () => {
    await workspaceWithRepo()

    const run = await runTim(probeArgs(['--line', '1']))

    expect({ exitCode: run.exitCode, result: envelopeOf(run).result }).toEqual({
      exitCode: 0,
      result: expect.objectContaining({
        file: 'src/prices.js',
        redOnBase: true,
        greenAfterRestore: true,
        restored: true
      })
    })
  })

  test('reports a line the test does not witness as green on base', async () => {
    await workspaceWithRepo()

    const run = await runTim(probeArgs(['--line', '2']))

    expect(envelopeOf(run).result.redOnBase).toBe(false)
  })

  test('refuses both --line and --search', async () => {
    await workspaceWithRepo()

    const run = await runTim([
      'build',
      'probe',
      'prices',
      'src/prices.js',
      '--line',
      '1',
      '--search',
      '10',
      '--replace',
      '11',
      '--',
      'true'
    ])

    expect({ exitCode: run.exitCode, stderr: run.stderr.trim() }).toEqual({
      exitCode: 2,
      stderr: 'Give either --line or --search, not both.'
    })
  })

  test('refuses a run with no test to run', async () => {
    await workspaceWithRepo()

    const run = await runTim([
      'build',
      'probe',
      'prices',
      'src/prices.js',
      '--line',
      '1'
    ])

    expect({ exitCode: run.exitCode, stderr: run.stderr.trim() }).toEqual({
      exitCode: 2,
      stderr: 'Give either --test-file or a test command after --, not both.'
    })
  })
})

describe('renderProbeText', () => {
  const outcome = {
    file: 'src/prices.js',
    inversion: { line: 4 },
    restored: true,
    greenAfterRestore: true,
    logs: { inverted: '/logs/inverted.log', restored: '/logs/restored.log' }
  }

  test('says a red probe witnesses the line', () => {
    expect(renderProbeText({ ...outcome, redOnBase: true })).toBe(
      [
        'The test failed with line 4 of src/prices.js blanked out, so it witnesses that change.',
        'It passed again once the file was back.',
        'Logs: /logs/inverted.log and /logs/restored.log.'
      ].join('\n')
    )
  })

  test('says a green probe does not witness the change, and when the test was already failing', () => {
    expect(
      renderProbeText({
        ...outcome,
        inversion: { search: 'a', replace: 'b' },
        redOnBase: false,
        greenAfterRestore: false
      }).split('\n')
    ).toEqual([
      'The test still passed with the search text in src/prices.js replaced, so it does not witness that change.',
      'It still failed once the file was back, so it was failing before the probe. Read /logs/restored.log.',
      'Logs: /logs/inverted.log and /logs/restored.log.'
    ])
  })

  test('says when the file could not be put back', () => {
    expect(
      renderProbeText({ ...outcome, redOnBase: true, restored: false })
    ).toBe(
      'The probe could not put src/prices.js back exactly as git has it. Check it with git diff before you do anything else.'
    )
  })
})
