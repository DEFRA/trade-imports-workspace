import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createRepoOnBranchFromMain } from '../test-support/branched-repo.js'
import { gitLines, hasUncommittedChanges } from './git-files.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const repoWithCommittedFile = async () => {
  root = mkdtempSync(join(tmpdir(), 'tim-git-files-'))
  await createRepoOnBranchFromMain(root, { 'a.txt': 'a\n' })
}

describe('gitLines', () => {
  test('returns the lines git prints, without blank ones', async () => {
    await repoWithCommittedFile()

    expect(await gitLines(root, ['ls-files'])).toEqual(['a.txt'])
  })

  test('fails with git’s own reason when git exits non-zero', async () => {
    await repoWithCommittedFile()

    await expect(gitLines(root, ['rev-parse', 'no-such-ref'])).rejects.toThrow(
      `git rev-parse no-such-ref failed in ${root}:`
    )
  })
})

describe('hasUncommittedChanges', () => {
  test('is false for a file as git has it', async () => {
    await repoWithCommittedFile()

    expect(await hasUncommittedChanges(root, 'a.txt')).toBe(false)
  })

  test('is true for an edited file', async () => {
    await repoWithCommittedFile()
    writeFileSync(join(root, 'a.txt'), 'changed\n')

    expect(await hasUncommittedChanges(root, 'a.txt')).toBe(true)
  })
})
