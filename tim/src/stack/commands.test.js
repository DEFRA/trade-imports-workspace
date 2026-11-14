import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  chmodSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runStackCommand, STACK_COMMAND_NAMES } from './commands.js'

let workspace

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-stack-commands-'))
})

afterEach(() => rmSync(workspace, { recursive: true, force: true }))

const writeStackScript = (name, exitCode) => {
  const path = join(workspace, 'scripts', 'stack', name)
  mkdirSync(join(workspace, 'scripts', 'stack'), { recursive: true })
  writeFileSync(path, `#!/usr/bin/env bash\nexit ${exitCode}\n`)
  chmodSync(path, 0o755)
}

describe('#runStackCommand', () => {
  test('Should offer the stack commands tim docker and its menu share', () => {
    expect(STACK_COMMAND_NAMES).toEqual([
      'up',
      'dev',
      'down',
      'restart',
      'bounce-backend'
    ])
  })

  test.each([
    ['up', 'run-stack.sh', 'run-stack.sh'],
    ['down', 'stop-stack.sh', 'stop-stack.sh']
  ])(
    'Should give the exit code of the script %s runs, naming it',
    async (command, script, ran) => {
      writeStackScript(script, 5)

      const result = await runStackCommand({
        workspaceRoot: workspace,
        command
      })

      expect(result).toEqual({
        exitCode: 5,
        durationMs: expect.any(Number),
        ran
      })
    }
  )

  test('Should give the start exit code from a restart whose stop failed', async () => {
    writeStackScript('stop-stack.sh', 4)
    writeStackScript('run-stack.sh', 0)

    const result = await runStackCommand({
      workspaceRoot: workspace,
      command: 'restart'
    })

    expect(result).toEqual({
      exitCode: 0,
      durationMs: expect.any(Number),
      ran: 'run-stack.sh'
    })
  })

  test('Should refuse with USAGE a restart in a workspace with no stop-stack.sh', async () => {
    writeStackScript('run-stack.sh', 0)

    await expect(
      runStackCommand({ workspaceRoot: workspace, command: 'restart' })
    ).rejects.toMatchObject({ name: 'TimError', code: 'USAGE' })
  })
})
