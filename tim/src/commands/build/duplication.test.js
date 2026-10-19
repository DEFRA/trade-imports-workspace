import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  commitAll,
  createRepoOnMain,
  writeFiles
} from '../../test-support/branched-repo.js'
import { testFileWithSetUp } from '../../test-support/copied-set-up.js'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import { renderDuplicationText } from './duplication.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const workspaceWithRepo = async () => {
  root = createCliWorkspace('tim-build-duplication-cli-')
  const repoPath = join(root, 'repos', 'frontend')
  await createRepoOnMain(repoPath, {
    'src/a.test.js': testFileWithSetUp('first', 'a')
  })
  return repoPath
}

const runTim = (args) => runTimInWorkspace(root, args)

describe('tim build duplication', () => {
  test('exits 1 with DUPLICATION_FOUND when the branch copies a set-up block', async () => {
    const repoPath = await workspaceWithRepo()
    writeFiles(repoPath, { 'src/b.test.js': testFileWithSetUp('second', 'b') })
    await commitAll(repoPath, 'copy the set-up')

    const run = await runTim(['build', 'duplication', 'frontend', '--json'])

    expect({
      exitCode: run.exitCode,
      errors: envelopeOf(run).errors
    }).toEqual({
      exitCode: 1,
      errors: [
        {
          code: 'DUPLICATION_FOUND',
          message:
            '1 duplicated block in changed test files that origin/main does not have.'
        }
      ]
    })
  })

  test('exits 0 when the branch copies nothing', async () => {
    await workspaceWithRepo()

    const run = await runTim(['build', 'duplication', 'frontend', '--json'])

    expect({ exitCode: run.exitCode, ok: envelopeOf(run).ok }).toEqual({
      exitCode: 0,
      ok: true
    })
  })

  test('exits 2 when the base does not exist', async () => {
    await workspaceWithRepo()

    const run = await runTim([
      'build',
      'duplication',
      'frontend',
      '--base',
      'origin/trunk'
    ])

    expect(run.exitCode).toBe(2)
  })
})

describe('renderDuplicationText', () => {
  test('lists each copied block with both places', () => {
    expect(
      renderDuplicationText({
        base: 'origin/main',
        changedTestFiles: ['src/b.test.js'],
        clones: [
          {
            lines: 13,
            tokens: 154,
            first: { file: 'src/a.test.js', startLine: 3, endLine: 15 },
            second: { file: 'src/b.test.js', startLine: 3, endLine: 15 }
          }
        ]
      })
    ).toBe(
      [
        '1 duplicated block in changed test files that origin/main does not have:',
        '  13 lines: src/a.test.js:3-15 and src/b.test.js:3-15',
        'Move each block into the shared test helper, and delete the copies.'
      ].join('\n')
    )
  })

  test('says how many changed test files it checked when it finds nothing', () => {
    expect(
      renderDuplicationText({
        base: 'origin/main',
        changedTestFiles: ['a.test.js', 'b.test.js'],
        clones: []
      })
    ).toBe(
      'No new duplicated blocks in the 2 changed test files since origin/main.'
    )
  })
})
