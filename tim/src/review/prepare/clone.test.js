import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { checkOutPullRequestCommit, pinReviewCloneFetch } from './clone.js'

const folders = []

const FIXED_GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1'
}

const git = (dir, args) =>
  execFileSync('git', ['-C', dir, ...args], {
    env: FIXED_GIT_ENV,
    encoding: 'utf8'
  }).trim()

const cloneWithTwoCommits = () => {
  const dir = mkdtempSync(join(tmpdir(), 'tim-review-clone-'))
  folders.push(dir)
  git(dir, ['init', '--quiet', '-b', 'main'])
  writeFileSync(join(dir, 'a.txt'), 'one\n')
  git(dir, ['add', '-A'])
  git(dir, ['commit', '--quiet', '-m', 'One'])
  const first = git(dir, ['rev-parse', 'HEAD'])
  writeFileSync(join(dir, 'a.txt'), 'two\n')
  git(dir, ['commit', '--quiet', '-am', 'Two'])
  return { dir, first }
}

const recordingTranscript = () => {
  const chunks = []
  return {
    line: (text) => chunks.push(`${text}\n`),
    raw: (text) => chunks.push(text),
    text: () => chunks.join('')
  }
}

afterEach(() => {
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true }))
})

describe('#checkOutPullRequestCommit', () => {
  test('Should check out a commit a clone already holds, without fetching', async () => {
    const { dir, first } = cloneWithTwoCommits()
    const transcript = recordingTranscript()

    const checkedOut = await checkOutPullRequestCommit({
      dir,
      repo: 'repo',
      commit: first,
      commitKind: 'head',
      transcript
    })

    expect(checkedOut).toBe(true)
    expect(git(dir, ['rev-parse', 'HEAD'])).toBe(first)
    expect(transcript.text()).toBe(
      `  repo: repo already present, fetching ${first}...\n`
    )
  })

  test('Should say it failed when the clone lacks the commit and has no origin', async () => {
    const { dir } = cloneWithTwoCommits()
    const missing = 'dead0000000000000000000000000000000000ef'
    const transcript = recordingTranscript()

    const checkedOut = await checkOutPullRequestCommit({
      dir,
      repo: 'repo',
      commit: missing,
      commitKind: 'head',
      transcript
    })

    expect(checkedOut).toBe(false)
    expect(transcript.text().split('\n').at(-2)).toBe(
      `  Failed to checkout ${missing} in repo`
    )
  })

  test('Should remove the folder of a new clone that cannot fetch', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'tim-review-clone-'))
    folders.push(parent)
    const dir = join(parent, 'repos', 'repo')
    const transcript = recordingTranscript()
    const environment = { ...process.env }
    Object.assign(process.env, {
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'url.file:///no-such-remote/.insteadOf',
      GIT_CONFIG_VALUE_0: 'https://github.com/DEFRA/'
    })

    const checkedOut = await checkOutPullRequestCommit({
      dir,
      repo: 'repo',
      commit: 'dead0000000000000000000000000000000000ef',
      commitKind: 'merge',
      transcript
    }).finally(() => {
      process.env = environment
    })

    expect(checkedOut).toBe(false)
    expect(existsSync(dir)).toBe(false)
    expect(transcript.text().split('\n').at(-2)).toBe(
      '  Failed to shallow-clone repo at dead0000000000000000000000000000000000ef'
    )
  })
})

describe('#pinReviewCloneFetch', () => {
  test('Should pin a merged pull request to its ref and main', async () => {
    const { dir } = cloneWithTwoCommits()
    git(dir, ['remote', 'add', 'origin', 'https://example.invalid/repo.git'])

    await pinReviewCloneFetch({
      dir,
      pullRequest: 9,
      merged: true,
      transcript: recordingTranscript()
    })

    expect(git(dir, ['config', '--get-all', 'remote.origin.fetch'])).toBe(
      '+refs/pull/9/head:refs/remotes/origin/pr-9\n+refs/heads/main:refs/remotes/origin/main'
    )
  })

  test('Should note why a folder that is not a clone cannot be pinned', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tim-review-clone-'))
    folders.push(dir)
    const transcript = recordingTranscript()

    await pinReviewCloneFetch({
      dir,
      pullRequest: 9,
      merged: false,
      transcript
    })

    expect(transcript.text()).toBe(`Not a git repo: ${dir}\n`)
  })
})
