import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { execa } from 'execa'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createBareRepo, createFatClone } from '../test-support/git-fixtures.js'
import {
  assertGitRepo,
  fetchRefspecsOf,
  MAIN_REFSPEC,
  pinFetch,
  pinFetchToPullRequest,
  pullRequestRefspec
} from './git-pin-fetch.js'

let baseDir

beforeEach(() => {
  baseDir = mkdtempSync(join(tmpdir(), 'tim-git-pin-fetch-'))
})

afterEach(() => {
  rmSync(baseDir, { recursive: true, force: true })
})

const fullClone = async () => {
  const { barePath } = await createBareRepo(baseDir, 'product')
  const dir = join(baseDir, 'clone')
  await createFatClone(barePath, dir)
  return dir
}

const remoteRefs = async (dir) =>
  (
    await execa('git', [
      '-C',
      dir,
      'for-each-ref',
      '--format=%(refname)',
      'refs/remotes'
    ])
  ).stdout.split('\n')

describe('#pullRequestRefspec', () => {
  test('Should map the pull request head onto origin/pr-<number>', () => {
    expect(pullRequestRefspec('42')).toBe(
      '+refs/pull/42/head:refs/remotes/origin/pr-42'
    )
  })
})

describe('#assertGitRepo', () => {
  test('Should refuse a folder with no .git folder', () => {
    const dir = join(baseDir, 'plain')
    mkdirSync(dir)

    expect(() => assertGitRepo(dir)).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: `Not a git repo: ${dir}`
      })
    )
  })

  test('Should refuse a folder whose .git is a file', () => {
    const dir = join(baseDir, 'worktree-like')
    mkdirSync(dir)
    writeFileSync(join(dir, '.git'), 'gitdir: elsewhere\n')

    expect(() => assertGitRepo(dir)).toThrow(
      expect.objectContaining({ code: 'USAGE' })
    )
  })
})

describe('#pinFetchToPullRequest', () => {
  test('Should replace every refspec with the pull request one and main', async () => {
    const dir = await fullClone()

    await pinFetchToPullRequest(dir, '7', { includeMain: true })

    expect(await fetchRefspecsOf(dir)).toEqual([
      pullRequestRefspec('7'),
      MAIN_REFSPEC
    ])
  })

  test('Should delete the gh-pages remote-tracking ref', async () => {
    const dir = await fullClone()

    await pinFetchToPullRequest(dir, '7')

    expect(await remoteRefs(dir)).not.toContain('refs/remotes/origin/gh-pages')
  })

  test('Should refuse with UNKNOWN when git cannot write the config', async () => {
    const dir = join(baseDir, 'missing')

    await expect(pinFetchToPullRequest(dir, '7')).rejects.toMatchObject({
      code: 'UNKNOWN'
    })
  })
})

describe('#pinFetch', () => {
  test('Should report the refspecs the exclude mode leaves', async () => {
    const dir = await fullClone()

    const outcome = await pinFetch({ dir, mode: 'exclude' })

    expect(outcome).toEqual({
      dir,
      mode: 'exclude',
      refspecs: ['+refs/heads/*:refs/remotes/origin/*', '^refs/heads/gh-pages'],
      pruned: false
    })
  })
})
