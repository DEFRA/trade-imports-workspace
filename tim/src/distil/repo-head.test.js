import { describe, test, expect, afterEach } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { extractedRepoHead, repoHeadOf } from './repo-head.js'

const SHA = '0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c'
const OTHER_SHA = 'abcdef0123456789abcdef0123456789abcdef01'

let dirs = []

const makeDir = () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'tim-repo-head-')))
  dirs.push(dir)
  return dir
}

const write = (dir, relative, text) => {
  const path = join(dir, relative)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, text)
}

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
  dirs = []
})

describe('repoHeadOf', () => {
  test('reads the commit a checkout on a branch is pointing at', () => {
    const dir = makeDir()
    write(dir, '.git/HEAD', 'ref: refs/heads/main\n')
    write(dir, '.git/refs/heads/main', `${SHA}\n`)

    expect(repoHeadOf(dir)).toBe(SHA)
  })

  test('reads a detached HEAD, where the commit is in HEAD itself', () => {
    const dir = makeDir()
    write(dir, '.git/HEAD', `${SHA}\n`)

    expect(repoHeadOf(dir)).toBe(SHA)
  })

  test('reads a packed ref when the branch has no loose ref file', () => {
    const dir = makeDir()
    write(dir, '.git/HEAD', 'ref: refs/heads/main\n')
    write(
      dir,
      '.git/packed-refs',
      `# pack-refs with: peeled fully-peeled sorted\n${OTHER_SHA} refs/remotes/origin/main\n${SHA} refs/heads/main\n`
    )

    expect(repoHeadOf(dir)).toBe(SHA)
  })

  test('prefers the loose ref over a packed one, as git does', () => {
    const dir = makeDir()
    write(dir, '.git/HEAD', 'ref: refs/heads/main\n')
    write(dir, '.git/refs/heads/main', `${SHA}\n`)
    write(dir, '.git/packed-refs', `${OTHER_SHA} refs/heads/main\n`)

    expect(repoHeadOf(dir)).toBe(SHA)
  })

  test('tells a branch from one whose name it is a prefix of', () => {
    const dir = makeDir()
    write(dir, '.git/HEAD', 'ref: refs/heads/main\n')
    write(
      dir,
      '.git/packed-refs',
      `${OTHER_SHA} refs/heads/maintenance\n${SHA} refs/heads/main\n`
    )

    expect(repoHeadOf(dir)).toBe(SHA)
  })

  test('is null for a directory that is not a git checkout', () => {
    expect(repoHeadOf(makeDir())).toBeNull()
  })

  test('is null for a directory that does not exist', () => {
    expect(repoHeadOf(join(makeDir(), 'nowhere'))).toBeNull()
  })

  test('is null when HEAD names a branch nothing resolves, so a repo it cannot read is never called stale', () => {
    const dir = makeDir()
    write(dir, '.git/HEAD', 'ref: refs/heads/main\n')

    expect(repoHeadOf(dir)).toBeNull()
  })

  test('is null when .git is a file, as it is in a worktree', () => {
    const dir = makeDir()
    write(dir, '.git', 'gitdir: /somewhere/else/.git/worktrees/one\n')

    expect(repoHeadOf(dir)).toBeNull()
  })
})

describe('extractedRepoHead', () => {
  const repoSource = { kind: 'repo', locator: 'repos/one' }

  test('is the commit the source’s checkout is on', () => {
    const root = makeDir()
    write(root, 'repos/one/.git/HEAD', `${SHA}\n`)

    expect(extractedRepoHead({ source: repoSource, workspaceRoot: root })).toBe(
      SHA
    )
  })

  test('is null for a source that is not a repo, which cannot move under its extract', () => {
    const root = makeDir()
    write(root, 'repos/one/.git/HEAD', `${SHA}\n`)

    expect(
      extractedRepoHead({
        source: { kind: 'confluence', locator: 'repos/one' },
        workspaceRoot: root
      })
    ).toBeNull()
  })

  test('is null with no workspace root to resolve the locator against', () => {
    expect(extractedRepoHead({ source: repoSource })).toBeNull()
  })
})
