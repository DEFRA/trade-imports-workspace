import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { renderIssues } from './index.js'

const PROJECT = 'DEFRA_trade-imports-plants-frontend'

const runSonar = (args) =>
  execa('node', [TIM_CLI_PATH, 'sonar', ...args, '--json'], {
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1' }
  })

describe('renderIssues', () => {
  test('heads the list with the PR and count, then one entry per issue', () => {
    const text = renderIssues({
      project: PROJECT,
      pullRequest: '108',
      branch: null,
      total: 2,
      issues: [
        {
          key: 'AZ1',
          rule: 'javascript:S6544',
          severity: 'MAJOR',
          type: 'BUG',
          file: 'src/server/app/kit.js',
          line: 42,
          message: 'Promise returned where a void return was expected.',
          url: 'https://sonarcloud.io/AZ1'
        },
        {
          key: 'AZ2',
          rule: 'javascript:S1128',
          severity: 'MINOR',
          type: 'CODE_SMELL',
          file: 'README.md',
          line: null,
          message: 'Remove this unused import.',
          url: 'https://sonarcloud.io/AZ2'
        }
      ]
    })

    expect(text).toBe(
      [
        `${PROJECT} PR 108: 2 open issues`,
        '[MAJOR BUG] javascript:S6544  src/server/app/kit.js:42',
        '  Promise returned where a void return was expected.',
        '  https://sonarcloud.io/AZ1',
        '[MINOR CODE_SMELL] javascript:S1128  README.md',
        '  Remove this unused import.',
        '  https://sonarcloud.io/AZ2'
      ].join('\n')
    )
  })

  test('names the branch and uses the singular for one issue', () => {
    const text = renderIssues({
      project: PROJECT,
      pullRequest: null,
      branch: 'main',
      total: 1,
      issues: []
    })

    expect(text).toBe(`${PROJECT} main: 1 open issue`)
  })

  test('names the main branch when given no PR or branch', () => {
    const text = renderIssues({
      project: PROJECT,
      pullRequest: null,
      branch: null,
      total: 0,
      issues: []
    })

    expect(text).toBe(`${PROJECT} main branch: 0 open issues`)
  })
})

describe('tim sonar issues', () => {
  test('exits 2 with a USAGE error when given both a PR and a branch', async () => {
    const run = await runSonar([
      'issues',
      'trade-imports-plants-frontend',
      '--pull-request',
      '108',
      '--branch',
      'main'
    ])

    expect(run.exitCode).toBe(2)
    expect(JSON.parse(run.stdout).errors).toEqual([
      { code: 'USAGE', message: 'Give --pull-request or --branch, not both.' }
    ])
  })

  test('exits 2 with a USAGE error for a PR that is not a number', async () => {
    const run = await runSonar([
      'issues',
      'trade-imports-plants-frontend',
      '--pull-request',
      'abc'
    ])

    expect(run.exitCode).toBe(2)
    expect(JSON.parse(run.stdout).errors).toEqual([
      { code: 'USAGE', message: '--pull-request must be a PR number.' }
    ])
  })
})
