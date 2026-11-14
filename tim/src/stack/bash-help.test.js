import { execa } from 'execa'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  fakeToolsEnv,
  installFakeStackTools,
  stageStackWorkspace
} from '../test-support/fake-docker.js'
import { workspaceScriptExists } from '../test-support/bash-golden-harness.js'

let workspace

beforeAll(() => {
  workspace = stageStackWorkspace()
})

afterAll(() => workspace.remove())

const runScript = async (script, args) => {
  const fake = installFakeStackTools()
  try {
    const result = await execa(
      '/bin/bash',
      [join(workspace.root, 'scripts', 'stack', script), ...args],
      { env: fakeToolsEnv(fake.binDir), extendEnv: false, reject: false }
    )
    return {
      exitCode: result.exitCode,
      output: `${result.stdout}\n${result.stderr}`,
      calls: fake.calls()
    }
  } finally {
    fake.remove()
  }
}

const HELP_CASES = ['-h', '--help'].flatMap((flag) => [
  ['run-stack.sh', [flag], 'Usage: run-stack.sh'],
  ['stop-stack.sh', [flag], 'Usage: stop-stack.sh'],
  ['bounce-backend.sh', [flag], 'Usage: bounce-backend.sh'],
  ['dev-service.sh', [flag], 'Usage: dev-service.sh'],
  ['restart-stack.sh', [flag], 'wipes'],
  ['restart-stack.sh', [flag], 'Usage: run-stack.sh']
])

const HELP_AFTER_OTHER_ARGS_CASES = [
  ['restart-stack.sh', ['-d', '--help'], 'Usage: restart-stack.sh'],
  ['run-stack.sh', ['-d', '--help'], 'Usage: run-stack.sh'],
  ['stop-stack.sh', ['--timeout', '1', '--help'], 'Usage: stop-stack.sh']
]

const scriptIsGone = (script) =>
  !workspaceScriptExists(`scripts/stack/${script}`)

describe('the stack scripts answer help before they touch Docker', () => {
  test.each([...HELP_CASES, ...HELP_AFTER_OTHER_ARGS_CASES])(
    'Should exit 0 from %s %j, print "%s" and call no Docker or git',
    async (script, args, expected) => {
      if (scriptIsGone(script)) return

      const { exitCode, output, calls } = await runScript(script, args)

      expect({
        exitCode,
        printsHelp: output.includes(expected),
        calls
      }).toEqual({ exitCode: 0, printsHelp: true, calls: [] })
    }
  )

  test.skipIf(scriptIsGone('bounce-backend.sh'))(
    'Should exit 2 from bounce-backend.sh --bogus and call no Docker or git',
    async () => {
      const { exitCode, calls } = await runScript('bounce-backend.sh', [
        '--bogus'
      ])

      expect({ exitCode, calls }).toEqual({ exitCode: 2, calls: [] })
    }
  )
})
