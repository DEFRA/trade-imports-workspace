import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  commitAll,
  createRepoOnBranchFromMain,
  writeFiles
} from '../../test-support/branched-repo.js'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import { renderCoverageText } from './coverage.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const THREE_LINES = ['one', 'two', 'three']
  .map((word) => `export const ${word} = () => '${word}'`)
  .join('\n')

const lcov = (file, hitsByLine) =>
  [
    'TN:',
    `SF:${file}`,
    ...hitsByLine.map((hits, index) => `DA:${index + 1},${hits}`),
    'end_of_record',
    ''
  ].join('\n')

const workspaceWithRepo = async () => {
  root = createCliWorkspace('tim-build-coverage-cli-')
  const repoPath = join(root, 'repos', 'frontend')
  await createRepoOnBranchFromMain(repoPath, { 'README.md': 'x' })
  return repoPath
}

const runTim = (args) => runTimInWorkspace(root, args)

describe('tim build coverage', () => {
  test('exits 1 with COVERAGE_UNDER_FLOOR when the branch leaves added lines untested', async () => {
    const repoPath = await workspaceWithRepo()
    writeFiles(repoPath, {
      'src/added.js': THREE_LINES,
      'coverage/lcov.info': lcov('src/added.js', [1, 0, 0])
    })
    await commitAll(repoPath, 'add three lines, one covered')

    const run = await runTim(['build', 'coverage', 'frontend', '--json'])

    expect({
      exitCode: run.exitCode,
      errors: envelopeOf(run).errors
    }).toEqual({
      exitCode: 1,
      errors: [
        {
          code: 'COVERAGE_UNDER_FLOOR',
          message:
            '33.3% of the 3 added lines and conditions are covered (1), under the floor of 90%.'
        }
      ]
    })
  })

  test('exits 0 when every added line is covered', async () => {
    const repoPath = await workspaceWithRepo()
    writeFiles(repoPath, {
      'src/added.js': THREE_LINES,
      'coverage/lcov.info': lcov('src/added.js', [1, 2, 1])
    })
    await commitAll(repoPath, 'add three covered lines')

    const run = await runTim(['build', 'coverage', 'frontend', '--json'])

    expect({ exitCode: run.exitCode, ok: envelopeOf(run).ok }).toEqual({
      exitCode: 0,
      ok: true
    })
  })

  test('takes a floor the rung gives it', async () => {
    const repoPath = await workspaceWithRepo()
    writeFiles(repoPath, {
      'src/added.js': THREE_LINES,
      'coverage/lcov.info': lcov('src/added.js', [1, 1, 0])
    })
    await commitAll(repoPath, 'add three lines, two covered')

    const run = await runTim([
      'build',
      'coverage',
      'frontend',
      '--floor',
      '60',
      '--json'
    ])

    expect({ exitCode: run.exitCode, ok: envelopeOf(run).ok }).toEqual({
      exitCode: 0,
      ok: true
    })
  })

  test('exits 2 when the suite has written no coverage report', async () => {
    const repoPath = await workspaceWithRepo()
    writeFiles(repoPath, { 'src/added.js': THREE_LINES })
    await commitAll(repoPath, 'add three lines')

    const run = await runTim(['build', 'coverage', 'frontend'])

    expect(run.exitCode).toBe(2)
  })
})

describe('renderCoverageText', () => {
  const READ_LINE =
    'Read coverage/lcov.info, written 2026-11-07T18:00:00.000Z. A narrow test run overwrites it, so this is the whole repo only when the whole suite wrote it.'

  test('names each uncovered line and what to do about it', () => {
    expect(
      renderCoverageText({
        base: 'origin/main',
        floor: 90,
        reports: ['coverage/lcov.info'],
        measuredAt: '2026-11-07T18:00:00.000Z',
        percent: 60,
        floorMet: false,
        toCover: 5,
        met: 3,
        files: [
          {
            file: 'src/added.js',
            lines: 5,
            covered: 3,
            conditions: 0,
            coveredConditions: 0,
            uncovered: [2, 3]
          }
        ]
      })
    ).toBe(
      [
        '60% of the 5 added lines and conditions are covered (3), under the floor of 90%:',
        '  src/added.js: 3 of 5 added lines covered, uncovered at 2, 3',
        'Test the behaviour those lines carry. A test written only to raise the number is worse than the gap.',
        READ_LINE
      ].join('\n')
    )
  })

  test('says the branch adds nothing measurable when it adds no measured line', () => {
    expect(
      renderCoverageText({
        base: 'origin/main',
        floor: 90,
        reports: ['coverage/lcov.info'],
        measuredAt: '2026-11-07T18:00:00.000Z',
        percent: null,
        floorMet: true,
        toCover: 0,
        met: 0,
        files: []
      })
    ).toBe(
      `The branch adds no line the coverage report measures, since origin/main.\n${READ_LINE}`
    )
  })

  test('reports the number it met when the floor is met', () => {
    expect(
      renderCoverageText({
        base: 'origin/main',
        floor: 90,
        reports: ['coverage/lcov.info'],
        measuredAt: '2026-11-07T18:00:00.000Z',
        percent: 97.5,
        floorMet: true,
        toCover: 40,
        met: 39,
        files: []
      })
    ).toBe(
      `97.5% of the 40 added lines and conditions are covered, at or above the floor of 90%, since origin/main.\n${READ_LINE}`
    )
  })
})
