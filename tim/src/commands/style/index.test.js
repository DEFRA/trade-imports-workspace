import { describe, expect, test } from 'vitest'
import { ERROR } from '../../constants/exitCodes.js'
import { envelopeOf } from '../../test-support/tim-cli.js'
import { styleId } from '../../style/__fixtures__/style-tools.js'
import {
  expectStyleRunsAsRecorded,
  recordedStyleCasesFor,
  runStyleSteps,
  withStagedStyle
} from '../../style/__fixtures__/style-tools-runs.js'

const backend = 'trade-imports-animals-backend'

describe('tim style matches the Bash it replaces', () => {
  test.concurrent.each([
    ...recordedStyleCasesFor('items'),
    ...recordedStyleCasesFor('file'),
    ...recordedStyleCasesFor('aggregate'),
    ...recordedStyleCasesFor('reconcile')
  ])(
    'Should give the recorded output, exit code and files for $name',
    async ({ steps, recorded, usage }) => {
      const runs = await withStagedStyle((staged) =>
        runStyleSteps(staged, steps)
      )

      expectStyleRunsAsRecorded(runs, recorded, { usage })
    }
  )
})

const runOne = (command, args) =>
  withStagedStyle(async (staged) => {
    const [run] = await runStyleSteps(staged, [{ command, args }])
    return run
  })

describe('tim style items mark', () => {
  test('Should say the notes were set only when a note is given', async () => {
    const run = await runOne('items mark', [
      styleId,
      '--repo',
      backend,
      '--item',
      '1',
      '--disposition',
      'Fix'
    ])

    expect(run.stdout).toBe(
      `Marked #1 in ${backend}: Disposition=Fix, Status=Not Done\n`
    )
  })

  test('Should refuse an item id that is not a number and leave the items as they were', async () => {
    const run = await runOne('items mark', [
      styleId,
      '--repo',
      backend,
      '--item',
      'first',
      '--disposition',
      'Fix'
    ])

    expect(run).toEqual({
      exitCode: ERROR,
      stdout: '',
      stderr: 'Invalid --item: first (must be a number)\n',
      filesWritten: {}
    })
  })
})

describe('tim style items status', () => {
  test('Should say the notes were set only when a note is given', async () => {
    const run = await runOne('items status', [
      styleId,
      '--repo',
      backend,
      '--item',
      '2',
      '--status',
      'Done'
    ])

    expect(run.stdout).toBe(`Updated #2 in ${backend}: Status=Done\n`)
  })
})

describe('tim style --json', () => {
  test('Should give the counts with the review id and repo as the counts result', async () => {
    const run = await runOne('items counts', [
      styleId,
      '--repo',
      'trade-imports-animals-frontend',
      '--json'
    ])

    expect(envelopeOf(run).result).toEqual({
      reviewId: styleId,
      repo: 'trade-imports-animals-frontend',
      breakdown: [
        { disposition: '', status: '', count: 1 },
        { disposition: 'Auto-Resolved', status: '—', count: 1 }
      ],
      total: 2
    })
  })

  test('Should give the new id as the add result', async () => {
    const run = await runOne('items add', [
      styleId,
      '--repo',
      backend,
      '--file',
      'pom.xml',
      '--rule',
      '2',
      '--severity',
      'WARN',
      '--issue',
      'x',
      '--fix',
      'y',
      '--json'
    ])

    expect(envelopeOf(run).result.id).toBe(8)
  })

  test('Should print one error envelope and exit 1 for a missing style review', async () => {
    const run = await runOne('items list', ['EUDPA-404', '--json'])

    expect({ exitCode: run.exitCode, errors: envelopeOf(run).errors }).toEqual({
      exitCode: ERROR,
      errors: [
        {
          code: 'NOT_FOUND',
          message: expect.stringMatching(
            /^Style review workspace not found: .*\/workareas\/code-style-reviews\/EUDPA-404$/
          )
        }
      ]
    })
  })
})
