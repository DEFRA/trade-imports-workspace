import { execa } from 'execa'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import {
  BRANCH,
  PROJECT_KEY,
  caseEnv,
  createRepo,
  stageFakeTools
} from '../../sonar/__fixtures__/push-check.js'

const inStagedRepo = async (act) => {
  const home = mkdtempSync(join(tmpdir(), 'tim-push-check-command-'))
  try {
    const repo = await createRepo(join(home, 'service'))
    const bin = stageFakeTools(home)
    return await act({ home, repo, bin })
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
}

const pushCheck = (args, { cwd, env }) =>
  execa(process.execPath, [TIM_CLI_PATH, 'sonar', 'push-check', ...args], {
    cwd,
    reject: false,
    extendEnv: false,
    env: { ...env, TIM_NO_AUTO_PULL: '1' }
  })

describe('tim sonar push-check', () => {
  test('reports a passing check on the pull request given as one JSON line', () =>
    inStagedRepo(async (paths) => {
      const result = await pushCheck(
        ['--pull-request', '5', '--base', 'main', '--json'],
        { cwd: paths.repo, env: caseEnv(paths, {}) }
      )

      expect({
        exitCode: result.exitCode,
        envelope: JSON.parse(result.stdout)
      }).toEqual({
        exitCode: 0,
        envelope: expect.objectContaining({
          ok: true,
          result: {
            outcome: 'passed',
            exitCode: 0,
            project: PROJECT_KEY,
            pullRequest: '5',
            branch: BRANCH
          }
        })
      })
    }))

  test('exits 2 with the failing step named when the check blocks the push', () =>
    inStagedRepo(async (paths) => {
      const result = await pushCheck(
        [paths.repo, '--pull-request', '5', '--base', 'main'],
        {
          cwd: paths.home,
          env: { ...caseEnv(paths, {}), FAKE_FAIL: 'npm test' }
        }
      )

      expect({
        exitCode: result.exitCode,
        stdout: result.stdout,
        lastLine: result.stderr.trim().split('\n').at(-1)
      }).toEqual({
        exitCode: 2,
        stdout: '',
        lastLine: 'npm test failed — push blocked'
      })
    }))

  test('skips with exit 0 and says how to set the token when SONAR_TOKEN is not set', () =>
    inStagedRepo(async (paths) => {
      const result = await pushCheck([], {
        cwd: paths.repo,
        env: caseEnv(paths, { token: null })
      })

      expect({
        exitCode: result.exitCode,
        firstLine: result.stderr.split('\n')[0]
      }).toEqual({
        exitCode: 0,
        firstLine:
          'SONAR_TOKEN not set — skipping local Sonar pre-push check (CI will still run it).'
      })
    }))

  test.each([
    [
      ['--pull-request', 'abc', '--base', 'main'],
      '--pull-request must be a PR number.'
    ],
    [['--pull-request', '5'], 'Give --pull-request and --base together.'],
    [['--base', 'main'], 'Give --pull-request and --base together.']
  ])('refuses %j before running anything', (args, message) =>
    inStagedRepo(async (paths) => {
      const result = await pushCheck(args, {
        cwd: paths.repo,
        env: caseEnv(paths, {})
      })

      expect({ exitCode: result.exitCode, stderr: result.stderr }).toEqual({
        exitCode: 2,
        stderr: message
      })
    })
  )

  test('refuses a folder that does not exist', () =>
    inStagedRepo(async (paths) => {
      const missing = join(paths.home, 'missing')

      const result = await pushCheck([missing], {
        cwd: paths.home,
        env: caseEnv(paths, {})
      })

      expect({ exitCode: result.exitCode, stderr: result.stderr }).toEqual({
        exitCode: 2,
        stderr: `Can't find the folder ${missing}.`
      })
    }))
})
