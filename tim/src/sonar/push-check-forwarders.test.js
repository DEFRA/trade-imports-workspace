import { execa } from 'execa'
import { existsSync, writeFileSync } from 'node:fs'
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
  pullRequestList,
  recordTimCase
} from './__fixtures__/push-check-runs.js'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))

const sonarCloudStandIn = new URL(
  './__fixtures__/sonarcloud-stand-in.js',
  import.meta.url
).href

const folderHolding = (tool) =>
  (process.env.PATH ?? '')
    .split(delimiter)
    .find((folder) => folder && existsSync(join(folder, tool)))

const servedPullRequestsIn = (home, testCase) => {
  const servedPath = join(home, 'sonarcloud-pull-requests.json')
  writeFileSync(
    servedPath,
    JSON.stringify(
      pullRequestList({ withBranch: Boolean(testCase.pullRequest) })
    )
  )
  return servedPath
}

const forwardingEnv = (paths, testCase) => {
  const env = caseEnv(paths, testCase)
  const nodeAndJq = [dirname(process.execPath), folderHolding('jq')].filter(
    Boolean
  )
  return {
    ...env,
    PATH: [paths.bin, ...nodeAndJq, env.PATH].join(delimiter),
    NODE_OPTIONS: `--import=${sonarCloudStandIn}`,
    SONARCLOUD_STAND_IN_PULL_REQUESTS: servedPullRequestsIn(
      paths.home,
      testCase
    )
  }
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

const recordRun = (testCase, run, { inputOf, cwdOf }) =>
  recordTimCase(testCase, (paths) =>
    run({
      input: inputOf(paths),
      cwd: cwdOf(paths),
      env: forwardingEnv(paths, testCase)
    })
  )

const recordForwardedAndDirect = async (script, testCase, how) => ({
  forwarded: await recordRun(testCase, (run) => runForwarder(script, run), how),
  direct: await recordRun(testCase, runTimHook, how)
})

const namedCases = (cases) => cases.map((testCase) => [testCase.name, testCase])

const fromTheRepo = ({ repo }) => repo

const checkRun = (testCase) => ({
  inputOf: (paths) => hookInput(testCase.command ?? 'git push', paths.repo),
  cwdOf: fromTheRepo
})

const gateRun = (testCase) => ({
  inputOf: (paths) =>
    hookInput(testCase.command?.(paths) ?? 'git push', testCase.cwd(paths)),
  cwdOf: ({ home }) => home
})

const bothMatch = (recording) => ({
  forwarded: comparable(recording),
  direct: comparable(recording)
})

const FORWARDED_RUN_TIMEOUT_MS = 30_000

describe.skipIf(!workspaceScriptExists(checkScript))(
  'tools/sonar/sonar-push-check.sh forwards to tim sonar push-check --hook',
  () => {
    test.each(namedCases(checkCases))(
      'Should answer "%s" as tim and the Bash check did',
      async (name, testCase) => {
        const recordings = await recordForwardedAndDirect(
          checkScript,
          testCase,
          checkRun(testCase)
        )

        expect(recordings).toEqual(bothMatch(bashRecordingOf('check', name)))
      },
      FORWARDED_RUN_TIMEOUT_MS
    )

    test(
      'Should check the folder it runs in when the hook input has no cwd',
      async () => {
        const testCase = checkCases.find(({ name }) => name === 'no token')

        const forwarded = await recordRun(
          testCase,
          (run) => runForwarder(checkScript, run),
          {
            inputOf: () =>
              JSON.stringify({ tool_input: { command: 'git push' } }),
            cwdOf: fromTheRepo
          }
        )

        expect(forwarded).toEqual(
          comparable(bashRecordingOf('check', 'no token'))
        )
      },
      FORWARDED_RUN_TIMEOUT_MS
    )
  }
)

describe.skipIf(!workspaceScriptExists(gateScript))(
  'scripts/sonar/sonar-push-gate.sh forwards to tim sonar push-check --hook',
  () => {
    test.each(namedCases(gateCases))(
      'Should answer "%s" as tim and the Bash gate did',
      async (name, testCase) => {
        const recordings = await recordForwardedAndDirect(
          gateScript,
          testCase,
          gateRun(testCase)
        )

        expect(recordings).toEqual(bothMatch(bashRecordingOf('gate', name)))
      },
      FORWARDED_RUN_TIMEOUT_MS
    )

    test(
      'Should block a push from a repo whose format check fails, as the Bash check did',
      async () => {
        const testCase = {
          ...checkCases.find(({ name }) => name === 'format check fails'),
          cwd: fromTheRepo
        }

        const recordings = await recordForwardedAndDirect(
          gateScript,
          testCase,
          gateRun(testCase)
        )

        expect(recordings).toEqual(
          bothMatch(bashRecordingOf('check', 'format check fails'))
        )
      },
      FORWARDED_RUN_TIMEOUT_MS
    )
  }
)
