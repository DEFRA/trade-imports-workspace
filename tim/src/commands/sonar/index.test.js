import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { renderIssues, renderGate } from './index.js'

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

describe('renderGate', () => {
  const failing = {
    project: PROJECT,
    pullRequest: '435',
    branch: null,
    status: 'ERROR',
    url: `https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=435`,
    conditions: [
      {
        metric: 'new_blocker_violations',
        status: 'ERROR',
        comparator: 'GT',
        threshold: '0',
        actual: '3'
      },
      {
        metric: 'new_coverage',
        status: 'ERROR',
        comparator: 'LT',
        threshold: '90',
        actual: '84.2'
      },
      {
        metric: 'new_security_rating',
        status: 'OK',
        comparator: 'GT',
        threshold: '1',
        actual: '1'
      }
    ]
  }

  test('names each failed condition with its threshold and what the code measured', () => {
    expect(renderGate(failing)).toBe(
      [
        `${PROJECT} PR 435: quality gate FAILED on 2 of 3 conditions`,
        '[FAILED] new_blocker_violations  0 allowed, 3 measured',
        '[FAILED] new_coverage  90 required, 84.2 measured',
        `https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=435`,
        `The issues behind those conditions: \`tim sonar issues ${PROJECT} --pull-request 435\`.`
      ].join('\n')
    )
  })

  test('leaves out the issue command when no failed condition counts issues', () => {
    const text = renderGate({
      ...failing,
      conditions: [
        {
          metric: 'new_coverage',
          status: 'ERROR',
          comparator: 'LT',
          threshold: '90',
          actual: '84.2'
        }
      ]
    })

    expect(text).toBe(
      [
        `${PROJECT} PR 435: quality gate FAILED on 1 of 1 conditions`,
        '[FAILED] new_coverage  90 required, 84.2 measured',
        `https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=435`
      ].join('\n')
    )
  })

  test('says a passing gate passed, and how many conditions it weighed', () => {
    const text = renderGate({
      ...failing,
      status: 'OK',
      conditions: failing.conditions.map((condition) => ({
        ...condition,
        status: 'OK'
      }))
    })

    expect(text).toBe(
      [
        `${PROJECT} PR 435: quality gate passed on 3 conditions`,
        `https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=435`
      ].join('\n')
    )
  })

  test('says so when SonarCloud has analysed nothing', () => {
    const text = renderGate({ ...failing, status: 'NONE', conditions: [] })

    expect(text).toBe(
      [
        `${PROJECT} PR 435: no quality gate result — SonarCloud has not analysed it`,
        `https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=435`
      ].join('\n')
    )
  })

  test('names the branch it was asked about, and the branch issue command', () => {
    const text = renderGate({
      ...failing,
      pullRequest: null,
      branch: 'main',
      url: `https://sonarcloud.io/summary/new_code?id=${PROJECT}&branch=main`,
      conditions: [failing.conditions[0]]
    })

    expect(text).toContain(`${PROJECT} main: quality gate FAILED`)
    expect(text).toContain(`\`tim sonar issues ${PROJECT} --branch main\`.`)
  })
})

describe('tim sonar gate', () => {
  test('exits 2 with a USAGE error when given both a PR and a branch', async () => {
    const run = await runSonar([
      'gate',
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
      'gate',
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
