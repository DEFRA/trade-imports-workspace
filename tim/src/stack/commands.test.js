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

  test('Should give the exit code of the script up runs, naming it', async () => {
    writeStackScript('run-stack.sh', 5)

    const result = await runStackCommand({
      workspaceRoot: workspace,
      command: 'up'
    })

    expect(result).toEqual({
      exitCode: 5,
      durationMs: expect.any(Number),
      ran: 'run-stack.sh'
    })
  })

  test('Should refuse with USAGE a restart in a workspace with no run-stack.sh', async () => {
    await expect(
      runStackCommand({ workspaceRoot: workspace, command: 'restart' })
    ).rejects.toMatchObject({ name: 'TimError', code: 'USAGE' })
  })
})
