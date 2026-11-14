import { execa } from 'execa'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { createRepo, hookInput } from '../__fixtures__/push-check.js'
import { isPushCheckHookCall } from './hook-call.js'

const probePath = fileURLToPath(
  new URL('../__fixtures__/module-load-probe.js', import.meta.url)
)

const inHome = async (act) => {
  const home = mkdtempSync(join(tmpdir(), 'tim-hook-call-'))
  try {
    return await act(home)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
}

const silentZshIn = (home) => {
  const bin = join(home, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'zsh'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
  return bin
}

const answerHook = (input, { home, args = [] }) =>
  execa(
    'node',
    [
      '--import',
      probePath,
      TIM_CLI_PATH,
      'sonar',
      'push-check',
      '--hook',
      ...args
    ],
    {
      input,
      reject: false,
      extendEnv: false,
      env: {
        HOME: home,
        PATH: `${silentZshIn(home)}:${process.env.PATH}`,
        TIM_NO_AUTO_PULL: '1',
        MODULE_LOAD_PROBE_FILE: join(home, 'loaded.json')
      }
    }
  )

const loadedIn = (home) =>
  JSON.parse(readFileSync(join(home, 'loaded.json'), 'utf8'))

describe('#isPushCheckHookCall', () => {
  test.each([
    [['sonar', 'push-check', '--hook'], true],
    [['sonar', 'push-check'], false],
    [['sonar', 'push-check', '--hook', '--verbose'], false],
    [['sonar', 'gate', '--hook'], false]
  ])('%j is the hook call: %s', (args, expected) => {
    expect(isPushCheckHookCall(args)).toBe(expected)
  })
})

describe('tim sonar push-check --hook', () => {
  test('lets a call that does not push through without loading the commands or Ink', () =>
    inHome(async (home) => {
      const result = await answerHook(hookInput('ls -la', home), { home })

      const loaded = loadedIn(home)
      expect({
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        loadedHookCall: loaded.some((url) => url.endsWith('/hook-call.js')),
        loadedProgram: loaded.some((url) => url.endsWith('/src/program.js')),
        loadedInk: loaded.some((url) => url.includes('/node_modules/ink/'))
      }).toEqual({
        exitCode: 0,
        stdout: '',
        stderr: '',
        loadedHookCall: true,
        loadedProgram: false,
        loadedInk: false
      })
    }))

  test('skips a push with no token anywhere, and says how to set one', () =>
    inHome(async (home) => {
      const repo = await createRepo(join(home, 'service'))

      const result = await answerHook(hookInput('git push', repo), { home })

      expect({
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr.split('\n')[0]
      }).toEqual({
        exitCode: 0,
        stdout: '',
        stderr:
          'SONAR_TOKEN not set — skipping local Sonar pre-push check (CI will still run it).'
      })
    }))

  test('exits 0 on an unknown option, so the hook cannot block by accident', () =>
    inHome(async (home) => {
      const result = await answerHook(hookInput('git push', home), {
        home,
        args: ['--no-such-option']
      })

      expect({
        exitCode: result.exitCode,
        stderr: result.stderr.split('\n')[0]
      }).toEqual({
        exitCode: 0,
        stderr: "error: unknown option '--no-such-option'"
      })
    }))
})
