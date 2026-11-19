import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createSonarClient } from '../../clients/sonar-client.js'
import {
  closeHttpMocks,
  installHttpMocks
} from '../../test-support/http-mock.js'
import { pullRequestList } from '../__fixtures__/push-check-runs.js'
import { analysisScope, scopeArguments, sonarPullRequestFor } from './scope.js'

const PROJECT = 'DEFRA_trade-imports-animals-frontend'

describe('#sonarPullRequestFor', () => {
  let mockPool

  beforeEach(() => {
    ;({ mockPool } = installHttpMocks())
  })

  afterEach(() => {
    closeHttpMocks()
  })

  const serve = (status, body) =>
    mockPool('https://sonarcloud.io')
      .get('/api/project_pull_requests/list')
      .query({ project: PROJECT })
      .reply(status, body)

  const find = async (branch) => {
    const errors = []
    const pullRequest = await sonarPullRequestFor({
      sonarClient: createSonarClient({ token: 'token' }),
      project: PROJECT,
      branch,
      writeError: (text) => errors.push(text)
    })
    return { pullRequest, errors }
  }

  test('finds the pull request SonarCloud lists for the branch', async () => {
    serve(200, pullRequestList({ withBranch: false }))

    const found = await find('chore/NO_JIRA-bash-to-tim')

    expect(found).toEqual({
      pullRequest: expect.objectContaining({ key: '485', base: 'main' }),
      errors: []
    })
  })

  test('takes the newest when SonarCloud lists several for the branch', async () => {
    const { pullRequests } = pullRequestList({ withBranch: false })
    serve(200, {
      pullRequests: [
        { ...pullRequests[0], key: '9', branch: 'feat/x' },
        { ...pullRequests[0], key: '12', branch: 'feat/x' },
        { ...pullRequests[0], key: '10', branch: 'feat/x' }
      ]
    })

    const found = await find('feat/x')

    expect(found.pullRequest.key).toBe('12')
  })

  test('is null when no pull request is on the branch', async () => {
    serve(200, pullRequestList({ withBranch: false }))

    const found = await find('feat/not-listed')

    expect(found).toEqual({ pullRequest: null, errors: [] })
  })

  test('is null for an empty list', async () => {
    serve(200, { pullRequests: [] })

    const found = await find('feat/x')

    expect(found).toEqual({ pullRequest: null, errors: [] })
  })

  test('is null and says why when SonarCloud refuses', async () => {
    serve(401, {})

    const found = await find('feat/x')

    expect(found).toEqual({
      pullRequest: null,
      errors: [
        `Can't ask SonarCloud for this branch's pull request (listPullRequests(${PROJECT}): SonarCloud refused the request. Set SONAR_TOKEN to a SonarCloud token that can read this project.). Checking the branch instead.\n`
      ]
    })
  })
})

describe('#analysisScope', () => {
  const finding = (found) => async () => found

  test('uses the pull request given without looking one up', async () => {
    const scope = await analysisScope({
      branch: 'feat/x',
      pullRequest: '7',
      base: 'develop',
      findPullRequest: () => {
        throw new Error('looked up')
      }
    })

    expect(scope).toEqual({
      pullRequest: { key: '7', base: 'develop', branch: 'feat/x' }
    })
  })

  test('uses the pull request found for the branch', async () => {
    const scope = await analysisScope({
      branch: 'feat/x',
      findPullRequest: finding({ key: '8', base: 'main' })
    })

    expect(scope).toEqual({
      pullRequest: { key: '8', base: 'main', branch: 'feat/x' }
    })
  })

  test('falls back to the branch', async () => {
    const scope = await analysisScope({
      branch: 'feat/x',
      findPullRequest: finding(null)
    })

    expect(scope).toEqual({ branch: 'feat/x' })
  })

  test('is null on a detached HEAD with no pull request given', async () => {
    const scope = await analysisScope({
      branch: '',
      findPullRequest: finding({ key: '8', base: 'main' })
    })

    expect(scope).toBe(null)
  })
})

describe('#scopeArguments', () => {
  test('names the pull request, its branch and its base', () => {
    expect(
      scopeArguments({
        pullRequest: { key: '8', base: 'main', branch: 'feat/x' }
      })
    ).toEqual([
      '-Dsonar.pullrequest.key=8',
      '-Dsonar.pullrequest.branch=feat/x',
      '-Dsonar.pullrequest.base=main'
    ])
  })

  test('names the branch', () => {
    expect(scopeArguments({ branch: 'feat/x' })).toEqual([
      '-Dsonar.branch.name=feat/x'
    ])
  })
})
