import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import {
  GITHUB_REPO,
  GITHUB_REPO_PATH,
  mockGithubForEachTest
} from '../../test-support/github-mock.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { exitCodeForMerge, renderMerge, runMerge } from './merge.js'

const github = mockGithubForEachTest()

const HEAD_SHA = 'abc1234def5678'
const MERGE_SHA = 'feed5678beef1234'
const BRANCH = 'chore/NO_JIRA-tidy'
const PR_URL = `https://github.com/DEFRA/${GITHUB_REPO}/pull/51`
const NO_WAIT = { mergeablePollMs: 0 }

const READY_PR = {
  number: 51,
  html_url: PR_URL,
  state: 'open',
  merged: false,
  merge_commit_sha: null,
  mergeable: true,
  mergeable_state: 'clean',
  draft: false,
  head: { ref: BRANCH, sha: HEAD_SHA },
  base: { ref: 'main' }
}

const checkRun = (id, name, status, conclusion) => ({
  id,
  name,
  status,
  conclusion,
  details_url: `https://github.com/x/runs/${id}`
})

const BUILD_PASSED = checkRun(1, 'Build', 'completed', 'success')
const SONAR_FAILED = checkRun(
  2,
  'SonarCloud Code Analysis',
  'completed',
  'failure'
)
const E2E_RUNNING = checkRun(3, 'E2E', 'in_progress', null)

const prIs = (overrides = {}) =>
  github()
    .get(`${GITHUB_REPO_PATH}/pulls/51`)
    .reply(200, { ...READY_PR, ...overrides })

const behindBaseBy = (behindBy) =>
  github()
    .get(`${GITHUB_REPO_PATH}/compare/main...${HEAD_SHA}`)
    .query(true)
    .reply(200, { behind_by: behindBy, ahead_by: 1 })

const headChecksAre = (checkRuns) => {
  github()
    .get(`${GITHUB_REPO_PATH}/commits/${HEAD_SHA}/status`)
    .query(true)
    .reply(200, { sha: HEAD_SHA, statuses: [] })
  github()
    .get(`${GITHUB_REPO_PATH}/commits/${HEAD_SHA}/check-runs`)
    .query(true)
    .reply(200, { total_count: checkRuns.length, check_runs: checkRuns })
}

const repoAllows = ({ squash = true, merge = true, rebase = true } = {}) =>
  github().get(GITHUB_REPO_PATH).reply(200, {
    allow_squash_merge: squash,
    allow_merge_commit: merge,
    allow_rebase_merge: rebase
  })

const acceptsMerge = () => {
  const sent = { body: null }
  github()
    .put(`${GITHUB_REPO_PATH}/pulls/51/merge`, (body) => {
      sent.body = body
      return true
    })
    .reply(200, { sha: MERGE_SHA, merged: true })
  return sent
}

const isBranchRef = (path) =>
  decodeURIComponent(path) === `${GITHUB_REPO_PATH}/git/refs/heads/${BRANCH}`

const acceptsBranchDelete = () => {
  const sent = { deleted: false }
  github()
    .delete((path) => {
      sent.deleted = isBranchRef(path)
      return sent.deleted
    })
    .reply(204)
  return sent
}

const readyToMerge = (allowed) => {
  prIs()
  behindBaseBy(0)
  headChecksAre([BUILD_PASSED])
  repoAllows(allowed)
}

describe('runMerge', () => {
  test('squash-merges a ready PR, pinned to the head commit it checked, and returns the merge commit', async () => {
    readyToMerge()
    const sent = acceptsMerge()

    const result = await runMerge({
      repo: GITHUB_REPO,
      number: '51',
      ...NO_WAIT
    })

    expect(sent.body).toEqual({ merge_method: 'squash', sha: HEAD_SHA })
    expect(result).toEqual({
      repo: GITHUB_REPO,
      number: 51,
      url: PR_URL,
      branch: BRANCH,
      status: 'merged',
      method: 'squash',
      sha: MERGE_SHA,
      branchDeleted: false,
      reasons: []
    })
  })

  test('uses a merge commit when the repo does not allow squash merges', async () => {
    readyToMerge({ squash: false })
    const sent = acceptsMerge()

    const result = await runMerge({ repo: GITHUB_REPO, number: 51, ...NO_WAIT })

    expect(sent.body.merge_method).toBe('merge')
    expect(result.method).toBe('merge')
  })

  test('deletes the head branch after a successful merge when asked to', async () => {
    readyToMerge()
    acceptsMerge()
    const sent = acceptsBranchDelete()

    const result = await runMerge({
      repo: GITHUB_REPO,
      number: 51,
      deleteBranch: true,
      ...NO_WAIT
    })

    expect(sent.deleted).toBe(true)
    expect(result).toEqual(
      expect.objectContaining({ status: 'merged', branchDeleted: true })
    )
  })

  test('refuses with every reason when the PR is behind its base, blocked and has a failed and a pending check', async () => {
    prIs({ mergeable_state: 'blocked' })
    behindBaseBy(2)
    headChecksAre([BUILD_PASSED, SONAR_FAILED, E2E_RUNNING])
    repoAllows()

    const result = await runMerge({
      repo: GITHUB_REPO,
      number: 51,
      deleteBranch: true,
      ...NO_WAIT
    })

    expect(result.status).toBe('refused')
    expect(result.sha).toBeNull()
    expect(result.branchDeleted).toBe(false)
    expect(result.reasons).toEqual([
      'Branch protection blocks the merge, for example a review is still needed. tim does not bypass branch protection.',
      'The PR is 2 commits behind main. Update the branch and wait for its checks.',
      'Not every check has passed on abc1234: 1 passed, 1 failed, 1 pending. Failed: SonarCloud Code Analysis. Pending: E2E.'
    ])
  })

  test('refuses a PR whose head has no checks yet', async () => {
    prIs()
    behindBaseBy(0)
    headChecksAre([])
    repoAllows()

    const result = await runMerge({ repo: GITHUB_REPO, number: 51, ...NO_WAIT })

    expect(result.reasons).toEqual([
      'Not every check has passed on abc1234: 0 passed, 0 failed, 0 pending.'
    ])
  })

  test('refuses a draft PR with merge conflicts', async () => {
    prIs({ draft: true, mergeable: false, mergeable_state: 'dirty' })
    behindBaseBy(0)
    headChecksAre([BUILD_PASSED])
    repoAllows()

    const result = await runMerge({ repo: GITHUB_REPO, number: 51, ...NO_WAIT })

    expect(result.reasons).toEqual([
      'The PR is a draft.',
      'The PR has merge conflicts with main.'
    ])
  })

  test('refuses a method the repo does not allow', async () => {
    readyToMerge({ rebase: false })

    const result = await runMerge({
      repo: GITHUB_REPO,
      number: 51,
      method: 'rebase',
      ...NO_WAIT
    })

    expect(result.reasons).toEqual([
      'The repo does not allow rebase merges. It allows: squash, merge.'
    ])
  })

  test('asks GitHub again while it is still working out whether the PR can merge', async () => {
    prIs({ mergeable: null, mergeable_state: 'unknown' })
    readyToMerge()
    acceptsMerge()

    const result = await runMerge({ repo: GITHUB_REPO, number: 51, ...NO_WAIT })

    expect(result.status).toBe('merged')
  })

  test("refuses with GitHub's message when GitHub turns the merge down", async () => {
    readyToMerge()
    github()
      .put(`${GITHUB_REPO_PATH}/pulls/51/merge`)
      .reply(405, { message: 'At least 1 approving review is required.' })

    const result = await runMerge({ repo: GITHUB_REPO, number: 51, ...NO_WAIT })

    expect(result.status).toBe('refused')
    expect(result.reasons).toEqual([
      'GitHub refused the merge: At least 1 approving review is required.'
    ])
  })

  test('returns the merge commit of a PR that is already merged, as already-merged', async () => {
    prIs({ state: 'closed', merged: true, merge_commit_sha: MERGE_SHA })

    const result = await runMerge({ repo: GITHUB_REPO, number: 51, ...NO_WAIT })

    expect(result).toEqual(
      expect.objectContaining({ status: 'already-merged', sha: MERGE_SHA })
    )
  })

  test('deletes the branch of an already-merged PR when asked to', async () => {
    prIs({ state: 'closed', merged: true, merge_commit_sha: MERGE_SHA })
    const sent = acceptsBranchDelete()

    const result = await runMerge({
      repo: GITHUB_REPO,
      number: 51,
      deleteBranch: true,
      ...NO_WAIT
    })

    expect(sent.deleted).toBe(true)
    expect(result.branchDeleted).toBe(true)
  })

  test('reports the branch as not deleted when it is already gone', async () => {
    prIs({ state: 'closed', merged: true, merge_commit_sha: MERGE_SHA })
    github()
      .delete((path) => isBranchRef(path))
      .reply(422, { message: 'Reference does not exist' })

    const result = await runMerge({
      repo: GITHUB_REPO,
      number: 51,
      deleteBranch: true,
      ...NO_WAIT
    })

    expect(result).toEqual(
      expect.objectContaining({
        status: 'already-merged',
        branchDeleted: false
      })
    )
  })

  test('refuses a PR that was closed without being merged', async () => {
    prIs({ state: 'closed' })

    const result = await runMerge({ repo: GITHUB_REPO, number: 51, ...NO_WAIT })

    expect(result.reasons).toEqual(['The PR is closed and was not merged.'])
  })

  test('refuses a PR number that is not a whole number', async () => {
    await expect(
      runMerge({ repo: GITHUB_REPO, number: 'abc' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give the PR number, for example 51.'
    })
  })
})

describe('exitCodeForMerge', () => {
  test('exits 1 for a refusal and 0 for a merge or an earlier merge', () => {
    const codes = ['refused', 'merged', 'already-merged'].map((status) =>
      exitCodeForMerge({ status })
    )

    expect(codes).toEqual([1, 0, 0])
  })
})

describe('renderMerge', () => {
  const result = {
    repo: GITHUB_REPO,
    number: 51,
    url: PR_URL,
    branch: BRANCH,
    method: 'squash',
    sha: MERGE_SHA,
    branchDeleted: true,
    reasons: []
  }

  test('prints the method, the merge commit and the deleted branch', () => {
    expect(renderMerge({ ...result, status: 'merged' })).toBe(
      [
        `Merged ${GITHUB_REPO} #51 by squash as ${MERGE_SHA}.`,
        `Deleted branch ${BRANCH}.`
      ].join('\n')
    )
  })

  test('prints the merge commit of an already-merged PR', () => {
    expect(
      renderMerge({ ...result, status: 'already-merged', branchDeleted: false })
    ).toBe(`${GITHUB_REPO} #51 was already merged as ${MERGE_SHA}.`)
  })

  test('prints one line per reason for a refusal', () => {
    expect(
      renderMerge({
        ...result,
        status: 'refused',
        reasons: ['The PR is a draft.', 'The PR has merge conflicts with main.']
      })
    ).toBe(
      [
        `Did not merge ${GITHUB_REPO} #51:`,
        '  - The PR is a draft.',
        '  - The PR has merge conflicts with main.'
      ].join('\n')
    )
  })
})

describe('tim github merge', () => {
  test('exits 2 with a JSON USAGE error for an unknown method', async () => {
    const run = await execa(
      'node',
      [
        TIM_CLI_PATH,
        'github',
        'merge',
        GITHUB_REPO,
        '51',
        '--method',
        'fast-forward',
        '--json'
      ],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect(run.exitCode).toBe(2)
    expect(JSON.parse(run.stdout).errors).toEqual([
      { code: 'USAGE', message: 'Give --method as squash, merge or rebase.' }
    ])
  })
})
