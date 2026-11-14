import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  closeHttpMocks,
  installHttpMocks
} from '../../test-support/http-mock.js'
import {
  caseEnv,
  checkCases,
  createRepo,
  gateCases,
  hookInput
} from '../__fixtures__/push-check.js'
import {
  bashRecordingOf,
  collectedText,
  comparable,
  recordTimCase,
  serveSonarPullRequests
} from '../__fixtures__/push-check-runs.js'
import { pushedRepoOf, runPushCheckHook } from './hook.js'

let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

const answerHook = (testCase, inputOf) =>
  recordTimCase(testCase, async (paths) => {
    const stderr = collectedText()
    const exitCode = await runPushCheckHook({
      input: inputOf(paths),
      env: caseEnv(paths, testCase),
      writeError: stderr.write
    })
    return { exitCode, stderr: stderr.text() }
  })

describe('#runPushCheckHook matches the Bash gate', () => {
  test.each(gateCases.map((testCase) => [testCase.name, testCase]))(
    '%s',
    async (name, testCase) => {
      serveSonarPullRequests(mockPool, testCase)

      const recording = await answerHook(testCase, (paths) =>
        hookInput(testCase.command?.(paths) ?? 'git push', testCase.cwd(paths))
      )

      expect(recording).toEqual(comparable(bashRecordingOf('gate', name)))
    }
  )
})

describe('#runPushCheckHook matches the Bash check run from inside the repo', () => {
  test.each(checkCases.map((testCase) => [testCase.name, testCase]))(
    '%s',
    async (name, testCase) => {
      serveSonarPullRequests(mockPool, testCase)

      const recording = await answerHook(testCase, (paths) =>
        hookInput(testCase.command ?? 'git push', paths.repo)
      )

      expect(recording).toEqual(comparable(bashRecordingOf('check', name)))
    }
  )
})

describe('#runPushCheckHook', () => {
  const zshSlowerThanFiveSeconds = '6'

  test('waits for an interactive zsh slower than five seconds, as the Bash gate does', async () => {
    const testCase = gateCases.find(({ name }) => name === 'token from zsh')
    const slowCase = {
      ...testCase,
      env: { ...testCase.env, FAKE_ZSH_DELAY: zshSlowerThanFiveSeconds }
    }
    serveSonarPullRequests(mockPool, slowCase)

    const recording = await answerHook(slowCase, (paths) =>
      hookInput('git push', slowCase.cwd(paths))
    )

    expect(recording).toEqual(
      comparable(bashRecordingOf('gate', 'token from zsh'))
    )
  }, 20_000)

  test.each([
    ['input that is not JSON', 'git push'],
    ['JSON with no command', '{"cwd":"/"}'],
    ['a command that is not text', '{"tool_input":{"command":7},"cwd":"/"}']
  ])('lets %s through with nothing written', async (_title, input) => {
    const stderr = collectedText()

    const exitCode = await runPushCheckHook({
      input,
      env: {},
      writeError: stderr.write
    })

    expect({ exitCode, stderr: stderr.text() }).toEqual({
      exitCode: 0,
      stderr: ''
    })
  })
})

describe('#pushedRepoOf', () => {
  test('narrows a folder inside a repo to the repo', async () => {
    const home = mkdtempSync(join(tmpdir(), 'tim-pushed-repo-'))
    const repo = realpathSync(await createRepo(join(home, 'service')))

    const pushed = await pushedRepoOf(
      { command: 'git -C service/src push', cwd: home },
      { PATH: process.env.PATH, HOME: home }
    )
    rmSync(home, { recursive: true, force: true })

    expect(pushed).toBe(repo)
  })

  test('is null when the named folder does not exist', async () => {
    const home = mkdtempSync(join(tmpdir(), 'tim-pushed-repo-'))

    const pushed = await pushedRepoOf(
      { command: 'git -C nowhere push', cwd: home },
      { PATH: process.env.PATH, HOME: home }
    )
    rmSync(home, { recursive: true, force: true })

    expect(pushed).toBeNull()
  })
})
