import { execa } from 'execa'
import { existsSync } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { workspaceScriptExists } from '../test-support/bash-golden-harness.js'
import { TIM_CLI_PATH } from '../test-support/tim-cli.js'
import {
  caseEnv,
  checkCases,
  checkScript,
  gateCases,
  gateScript,
  hookInput
} from './__fixtures__/push-check.js'
import {
  bashRecordingOf,
  comparable,
  recordTimCase
} from './__fixtures__/push-check-runs.js'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))

const folderHolding = (tool) =>
  (process.env.PATH ?? '')
    .split(delimiter)
    .find((folder) => folder && existsSync(join(folder, tool)))

const forwardingEnv = (paths, testCase) => {
  const env = caseEnv(paths, testCase)
  const nodeAndJq = [dirname(process.execPath), folderHolding('jq')].filter(
    Boolean
  )
  return { ...env, PATH: [paths.bin, ...nodeAndJq, env.PATH].join(delimiter) }
}

const runForwarder = (script, { input, cwd, env }) =>
  execa('/bin/bash', [join(workspaceRoot, script)], {
    input,
    cwd,
    env,
    extendEnv: false,
    reject: false,
    stripFinalNewline: false
  })

const runTimHook = ({ input, cwd, env }) =>
  execa(process.execPath, [TIM_CLI_PATH, 'sonar', 'push-check', '--hook'], {
    input,
    cwd,
    env,
    extendEnv: false,
    reject: false,
    stripFinalNewline: false
  })

const recordRun = (testCase, run, inputOf) =>
  recordTimCase(testCase, (paths) =>
    run({
      input: inputOf(paths),
      cwd: paths.repo,
      env: forwardingEnv(paths, testCase)
    })
  )

const casesNamed = (cases, names) =>
  cases
    .filter(({ name }) => names.includes(name))
    .map((testCase) => [testCase.name, testCase])

const checkCasesSonarCloudIsNotAskedFor = casesNamed(checkCases, [
  'not a push',
  'no token',
  'no sonar-project.properties',
  'no project key',
  'detached HEAD with no pull request'
])

const gateCasesSonarCloudIsNotAskedFor = casesNamed(gateCases, [
  'not a push',
  'gitpush is not a push',
  'no cwd',
  'cwd that does not exist',
  'no token anywhere'
])

describe.skipIf(!workspaceScriptExists(checkScript))(
  'tools/sonar/sonar-push-check.sh forwards to tim sonar push-check --hook',
  () => {
    const checkInput = (testCase) => (paths) =>
      hookInput(testCase.command ?? 'git push', paths.repo)

    test.each(checkCasesSonarCloudIsNotAskedFor)(
      'Should answer "%s" as tim and the Bash check did',
      async (name, testCase) => {
        const forwarded = await recordRun(
          testCase,
          (run) => runForwarder(checkScript, run),
          checkInput(testCase)
        )
        const direct = await recordRun(
          testCase,
          runTimHook,
          checkInput(testCase)
        )

        expect({ forwarded, direct }).toEqual({
          forwarded: comparable(bashRecordingOf('check', name)),
          direct: comparable(bashRecordingOf('check', name))
        })
      },
      30_000
    )

    test('Should check the folder it runs in when the hook input has no cwd', async () => {
      const [, testCase] = casesNamed(checkCases, ['no token'])[0]

      const forwarded = await recordRun(
        testCase,
        (run) => runForwarder(checkScript, run),
        () => JSON.stringify({ tool_input: { command: 'git push' } })
      )

      expect(forwarded).toEqual(
        comparable(bashRecordingOf('check', 'no token'))
      )
    }, 30_000)
  }
)

describe.skipIf(!workspaceScriptExists(gateScript))(
  'scripts/sonar/sonar-push-gate.sh forwards to tim sonar push-check --hook',
  () => {
    const gateInput = (testCase) => (paths) =>
      hookInput(testCase.command?.(paths) ?? 'git push', testCase.cwd(paths))

    test.each(gateCasesSonarCloudIsNotAskedFor)(
      'Should answer "%s" as tim and the Bash gate did',
      async (name, testCase) => {
        const forwarded = await recordRun(
          testCase,
          (run) => runForwarder(gateScript, run),
          gateInput(testCase)
        )
        const direct = await recordRun(
          testCase,
          runTimHook,
          gateInput(testCase)
        )

        expect({ forwarded, direct }).toEqual({
          forwarded: comparable(bashRecordingOf('gate', name)),
          direct: comparable(bashRecordingOf('gate', name))
        })
      },
      30_000
    )
  }
)
