import { execa } from 'execa'
import { expect, test } from 'vitest'
import {
  goldenText,
  normaliseRecordedText,
  stageBashWorkspace,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  caseEnv,
  checkCases,
  checkScript,
  gateCases,
  gateScript,
  goldenPath,
  hookInput,
  recordAftermath,
  stageCase
} from './__fixtures__/push-check.js'

const recordBash = async (testCase, runScript) => {
  const staged = stageBashWorkspace({ scripts: [checkScript, gateScript] })
  try {
    const paths = await stageCase(staged.home, testCase)
    const result = await runScript(staged.root, paths)
    return {
      route: testCase.route,
      case: testCase.name,
      exitCode: result.exitCode,
      stdout: normaliseRecordedText(result.stdout, paths.home),
      stderr: normaliseRecordedText(result.stderr, paths.home),
      ...(await recordAftermath(paths))
    }
  } finally {
    staged.remove()
  }
}

const runBash = (script, { input, cwd, env }) =>
  execa('/bin/bash', [script], {
    input,
    cwd,
    env,
    extendEnv: false,
    reject: false,
    stripFinalNewline: false
  })

const recordCheck = (testCase) =>
  recordBash({ ...testCase, route: 'check' }, (root, paths) =>
    runBash(`${root}/${checkScript}`, {
      input: hookInput(testCase.command ?? 'git push', paths.repo),
      cwd: paths.repo,
      env: caseEnv(paths, testCase)
    })
  )

const recordGate = (testCase) =>
  recordBash({ ...testCase, route: 'gate' }, (root, paths) =>
    runBash(`${root}/${gateScript}`, {
      input: hookInput(
        testCase.command?.(paths) ?? 'git push',
        testCase.cwd(paths)
      ),
      cwd: paths.home,
      env: caseEnv(paths, testCase)
    })
  )

const recordInTurn = async (cases, record) => {
  const recordings = []
  for (const testCase of cases) recordings.push(await record(testCase))
  return recordings
}

test.skipIf(![checkScript, gateScript].every(workspaceScriptExists))(
  'the Bash push check and gate give the recorded exit code, output, tool calls and repo state for every case',
  async () => {
    const recordings = [
      ...(await recordInTurn(checkCases, recordCheck)),
      ...(await recordInTurn(gateCases, recordGate))
    ]

    await expect(goldenText(recordings)).toMatchFileSnapshot(goldenPath)
  },
  240_000
)
