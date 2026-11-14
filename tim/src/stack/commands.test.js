import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  fakeComposeStartLines,
  writeStackInitSources
} from '../test-support/fake-docker.js'
import { runStackCommand, STACK_COMMAND_NAMES } from './commands.js'

let workspace
const originalPath = process.env.PATH

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-stack-commands-'))
})

afterEach(() => {
  process.env.PATH = originalPath
  rmSync(workspace, { recursive: true, force: true })
})

const dockerWhoseStackUpFails = () => {
  writeStackInitSources(workspace)
  const bin = join(workspace, 'fake-bin')
  mkdirSync(bin)
  writeFileSync(
    join(bin, 'docker'),
    `#!/usr/bin/env bash\n${fakeComposeStartLines({ callsPath: join(workspace, 'calls'), fails: true })}\n`
  )
  chmodSync(join(bin, 'docker'), 0o755)
  process.env.PATH = `${bin}:${originalPath}`
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

  test("Should give docker compose up's exit code when up fails, naming docker compose", async () => {
    dockerWhoseStackUpFails()

    const result = await runStackCommand({
      workspaceRoot: workspace,
      command: 'up'
    })

    expect(result).toEqual({
      exitCode: 9,
      durationMs: expect.any(Number),
      ran: 'docker compose'
    })
  })
})
