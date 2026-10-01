import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  existsSync,
  rmSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

let workspace

const writeStackScript = (name, body) => {
  const path = join(workspace, 'scripts', 'stack', name)
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
  return path
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-docker-'))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
  mkdirSync(join(workspace, 'scripts', 'stack'), { recursive: true })
  process.env.TIM_STACK_LEASE = join(workspace, 'stack-lease.json')
})

afterEach(() => {
  delete process.env.TIM_STACK_LEASE
  rmSync(workspace, { recursive: true, force: true })
})

describe('tim docker subcommands', () => {
  test('up runs scripts/stack/run-stack.sh and exits 0 on success', async () => {
    writeStackScript('run-stack.sh', 'exit 0')
    const { exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'up', '--workspace', workspace],
      { reject: false }
    )
    expect(exitCode).toBe(0)
  })

  test('dev passes -d to run-stack.sh', async () => {
    // Script exits with non-zero unless it receives "-d" as the first arg
    writeStackScript('run-stack.sh', '[ "$1" = "-d" ] && exit 0 || exit 1')
    const { exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'dev', '--workspace', workspace],
      { reject: false }
    )
    expect(exitCode).toBe(0)
  })

  test('down runs scripts/stack/stop-stack.sh', async () => {
    writeStackScript('stop-stack.sh', 'exit 0')
    const { exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'down', '--workspace', workspace],
      { reject: false }
    )
    expect(exitCode).toBe(0)
  })

  test('bounce-backend runs scripts/stack/bounce-backend.sh', async () => {
    writeStackScript('bounce-backend.sh', 'exit 0')
    const { exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'bounce-backend', '--workspace', workspace],
      { reject: false }
    )
    expect(exitCode).toBe(0)
  })

  test('up forwards a branch flag and its value to run-stack.sh', async () => {
    writeStackScript(
      'run-stack.sh',
      '[ "$1" = "-b" ] && [ "$2" = "spike/my-branch" ] && exit 0 || exit 1'
    )
    const { exitCode } = await execa(
      'node',
      [
        cliPath,
        'docker',
        'up',
        '--workspace',
        workspace,
        '-b',
        'spike/my-branch'
      ],
      { reject: false }
    )
    expect(exitCode).toBe(0)
  })

  test('dev forwards extra flags after its own -d', async () => {
    writeStackScript(
      'run-stack.sh',
      '[ "$1" = "-d" ] && [ "$2" = "-e" ] && [ "$3" = "frontend" ] && exit 0 || exit 1'
    )
    const { exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'dev', '--workspace', workspace, '-e', 'frontend'],
      { reject: false }
    )
    expect(exitCode).toBe(0)
  })

  test('up forwards repeated flags in the order given', async () => {
    writeStackScript(
      'run-stack.sh',
      '[ "$*" = "--profile database --profile frontend" ] && exit 0 || exit 1'
    )
    const { exitCode } = await execa(
      'node',
      [
        cliPath,
        'docker',
        'up',
        '--workspace',
        workspace,
        '--profile',
        'database',
        '--profile',
        'frontend'
      ],
      { reject: false }
    )
    expect(exitCode).toBe(0)
  })

  test('reports the forwarded args in the --json envelope', async () => {
    writeStackScript('run-stack.sh', 'exit 0')
    const { stdout } = await execa(
      'node',
      [
        cliPath,
        'docker',
        'up',
        '--workspace',
        workspace,
        '--json',
        '-b',
        'spike/my-branch'
      ],
      { reject: false }
    )
    const payload = JSON.parse(stdout.trim())
    expect(payload.result.args).toEqual(['-b', 'spike/my-branch'])
  })

  test('propagates a non-zero exit code from the script', async () => {
    writeStackScript('run-stack.sh', 'exit 5')
    const { exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'up', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(1)
  })

  test('exits 2 with USAGE when scripts/stack/ is missing the script', async () => {
    // No script written
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'restart', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(2)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(false)
    expect(payload.errors[0].code).toBe('USAGE')
  })
})

describe('tim docker under a stack lease', () => {
  const writeLease = () =>
    writeFileSync(
      process.env.TIM_STACK_LEASE,
      JSON.stringify({
        holder: 'ibl-20261001T090000Z inc-003 ladder',
        mode: 'dev',
        acquiredAt: '2026-10-01T09:00:00.000Z',
        branches: {},
        state: 'up',
        containers: ['c1']
      })
    )

  test.each(['up', 'dev', 'down', 'restart', 'bounce-backend'])(
    '%s refuses while a build holds the lease, naming the holder',
    async (command) => {
      writeStackScript('run-stack.sh', `touch '${join(workspace, 'ran')}'`)
      writeStackScript('stop-stack.sh', `touch '${join(workspace, 'ran')}'`)
      writeStackScript('restart-stack.sh', `touch '${join(workspace, 'ran')}'`)
      writeStackScript('bounce-backend.sh', `touch '${join(workspace, 'ran')}'`)
      writeLease()

      const { stdout, exitCode } = await execa(
        'node',
        [cliPath, 'docker', command, '--workspace', workspace, '--json'],
        { reject: false }
      )

      expect({
        exitCode,
        error: JSON.parse(stdout.trim()).errors[0],
        ran: existsSync(join(workspace, 'ran'))
      }).toEqual({
        exitCode: 1,
        error: {
          code: 'STACK_HELD',
          message: expect.stringContaining(
            'The workspace stack is leased to "ibl-20261001T090000Z inc-003 ladder"'
          )
        },
        ran: false
      })
    }
  )

  test('runs under a lease with --force, and does not pass --force to the script', async () => {
    writeStackScript('run-stack.sh', '[ "$*" = "-d" ] && exit 0 || exit 1')
    writeLease()

    const { exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'dev', '--workspace', workspace, '--force'],
      { reject: false }
    )

    expect(exitCode).toBe(0)
  })
})
