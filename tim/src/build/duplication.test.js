import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  commitAll,
  createRepoOnBranchFromMain,
  writeFiles
} from '../test-support/branched-repo.js'
import {
  SET_UP_FIRST_LINE,
  testFileWithSetUp
} from '../test-support/copied-set-up.js'
import { findNewTestClones } from './duplication.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const branchedRepoWith = async (files) => {
  root = mkdtempSync(join(tmpdir(), 'tim-duplication-'))
  await createRepoOnBranchFromMain(root, files)
}

const clonePairs = ({ clones }) =>
  clones.map(({ first, second }) =>
    [
      `${first.file}:${first.startLine}`,
      `${second.file}:${second.startLine}`
    ].sort()
  )

const copiedPair = (folder = 'src') => [
  [
    `${folder}/a.test.js:${SET_UP_FIRST_LINE}`,
    `${folder}/b.test.js:${SET_UP_FIRST_LINE}`
  ]
]

describe('findNewTestClones', () => {
  test('reports a set-up block a new test file copies from an existing one, with both file:line places', async () => {
    await branchedRepoWith({ 'src/a.test.js': testFileWithSetUp('first', 'a') })
    writeFiles(root, { 'src/b.test.js': testFileWithSetUp('second', 'b') })
    await commitAll(root, 'copy the set-up')

    const outcome = await findNewTestClones({ repoPath: root })

    expect(clonePairs(outcome)).toEqual(copiedPair())
  })

  test('names files from the folder it runs in when that folder is inside the checkout', async () => {
    await branchedRepoWith({
      'tim/src/a.test.js': testFileWithSetUp('first', 'a')
    })
    writeFiles(root, {
      'tim/src/b.test.js': testFileWithSetUp('second', 'b')
    })
    await commitAll(root, 'copy the set-up')

    const outcome = await findNewTestClones({ repoPath: join(root, 'tim') })

    expect(clonePairs(outcome)).toEqual(copiedPair())
  })

  test('reports a copy that is not yet committed', async () => {
    await branchedRepoWith({ 'src/a.test.js': testFileWithSetUp('first', 'a') })
    writeFiles(root, { 'src/b.test.js': testFileWithSetUp('second', 'b') })

    const outcome = await findNewTestClones({ repoPath: root })

    expect({
      changedTestFiles: outcome.changedTestFiles,
      clones: clonePairs(outcome)
    }).toEqual({ changedTestFiles: ['src/b.test.js'], clones: copiedPair() })
  })

  test('does not count a clone the base already has, when a branch edits one of its files', async () => {
    await branchedRepoWith({
      'src/a.test.js': testFileWithSetUp('first', 'a'),
      'src/old.test.js': testFileWithSetUp('second', 'old')
    })
    writeFiles(root, {
      'src/a.test.js': `${testFileWithSetUp('first', 'a')}test('more', () => expect(2).toBe(2))\n`
    })
    await commitAll(root, 'add a test')

    const outcome = await findNewTestClones({ repoPath: root })

    expect({
      changedTestFiles: outcome.changedTestFiles,
      clones: outcome.clones
    }).toEqual({ changedTestFiles: ['src/a.test.js'], clones: [] })
  })

  test('ignores duplication in files that are not tests', async () => {
    await branchedRepoWith({ 'src/a.js': testFileWithSetUp('first', 'a') })
    writeFiles(root, { 'src/b.js': testFileWithSetUp('second', 'b') })
    await commitAll(root, 'copy production code')

    const outcome = await findNewTestClones({ repoPath: root })

    expect(outcome).toEqual(
      expect.objectContaining({ changedTestFiles: [], clones: [] })
    )
  })

  test('refuses a base the repo does not have', async () => {
    await branchedRepoWith({ 'README.md': '# repo\n' })

    await expect(
      findNewTestClones({ repoPath: root, base: 'origin/trunk' })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Can't find origin/trunk in ${root}. Fetch it, or name another base with --base.`
    })
  })
})
