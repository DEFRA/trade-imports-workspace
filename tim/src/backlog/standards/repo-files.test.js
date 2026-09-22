import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { listRepoFiles, fileMatchesLine } from './repo-files.js'

let repoDir

beforeEach(() => {
  repoDir = mkdtempSync(join(tmpdir(), 'tim-repo-files-'))
})

afterEach(() => {
  rmSync(repoDir, { recursive: true, force: true })
})

describe('#listRepoFiles', () => {
  test('F-1 lists nested files, including dot-folders', () => {
    mkdirSync(join(repoDir, 'src', 'nested'), { recursive: true })
    writeFileSync(join(repoDir, 'a.js'), 'a')
    writeFileSync(join(repoDir, 'src', 'nested', 'b.js'), 'b')
    mkdirSync(join(repoDir, '.claude'), { recursive: true })
    writeFileSync(join(repoDir, '.claude', 'c.js'), 'c')

    const files = listRepoFiles({ repoDir }).sort()

    expect(files).toEqual(['.claude/c.js', 'a.js', 'src/nested/b.js'])
  })

  test('F-2 does not follow a symlinked folder', () => {
    mkdirSync(join(repoDir, 'real'), { recursive: true })
    writeFileSync(join(repoDir, 'real', 'x.js'), 'x')
    symlinkSync(join(repoDir, 'real'), join(repoDir, 'link'))

    const files = listRepoFiles({ repoDir }).sort()

    expect(files).toEqual(['real/x.js'])
  })

  test('F-3 honours skip', () => {
    mkdirSync(join(repoDir, 'keep'), { recursive: true })
    mkdirSync(join(repoDir, 'drop'), { recursive: true })
    writeFileSync(join(repoDir, 'keep', 'a.js'), 'a')
    writeFileSync(join(repoDir, 'drop', 'b.js'), 'b')

    const files = listRepoFiles({
      repoDir,
      skip: [join(repoDir, 'drop')]
    }).sort()

    expect(files).toEqual(['keep/a.js'])
  })
})

describe('#fileMatchesLine', () => {
  test('matches per line, not across a newline', () => {
    writeFileSync(join(repoDir, 'x.txt'), 'foo\nbar\n')

    expect(fileMatchesLine(join(repoDir, 'x.txt'), /foo.bar/s)).toBe(false)
    expect(fileMatchesLine(join(repoDir, 'x.txt'), /^foo$/)).toBe(true)
  })

  test('F-4 returns false for a missing file', () => {
    expect(fileMatchesLine(join(repoDir, 'nope.txt'), /x/)).toBe(false)
  })
})
