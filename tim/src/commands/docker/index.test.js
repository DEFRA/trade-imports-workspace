import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  existsSync,
  readFileSync,
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

const stackWorkingDirsPath = () => join(workspace, 'stack-working-dirs')

const ranPath = () => join(workspace, 'ran')

const GUARDED_COMMANDS = [
  'up',
  'dev',
  'down',
  'restart',
  'bounce-backend',
  'service restart trade-imports-stub'
]

const writeDockerListingStackWorkingDirs = () => {
  const path = join(workspace, 'fake-bin', 'docker')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(
    path,
    [
      '#!/usr/bin/env bash',
      'if [ "$1" = info ]; then echo 29.1.0; exit 0; fi',
      `if [ "$1" = compose ]; then echo "$*" >> '${ranPath()}'; fi`,
      `if [ "$1" = ps ] && [ -f '${stackWorkingDirsPath()}' ]; then cat '${stackWorkingDirsPath()}'; fi`
    ].join('\n')
  )
  chmodSync(path, 0o755)
}

const stackStartedFrom = (clone) =>
  writeFileSync(stackWorkingDirsPath(), `${join(clone, 'docker', 'stack')}\n`)

const originalPath = process.env.PATH

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-docker-'))
  markWorkspaceRoot(workspace)
  mkdirSync(join(workspace, 'repos'))
  mkdirSync(join(workspace, 'scripts', 'stack'), { recursive: true })
  writeDockerListingStackWorkingDirs()
  process.env.TIM_STACK_LEASE = join(workspace, 'stack-lease.json')
  process.env.PATH = `${join(workspace, 'fake-bin')}:${originalPath}`
})

afterEach(() => {
  delete process.env.TIM_STACK_LEASE
  process.env.PATH = originalPath
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

  test('down runs docker compose down, wiping volumes, and exits 0 on success', async () => {
    const { exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'down', '--workspace', workspace],
      { reject: false }
    )

    expect({
      exitCode,
      composeCall: readFileSync(ranPath(), 'utf8').trim().split(' ').slice(-3)
    }).toEqual({
      exitCode: 0,
      composeCall: ['down', '--volumes', '--remove-orphans']
    })
  })

  test('Should report a bounce-backend that docker compose finished in the --json envelope', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'bounce-backend', '--workspace', workspace, '--json'],
      { reject: false }
    )

    const payload = JSON.parse(stdout.trim().split('\n').at(-1))
    expect({ exitCode, ok: payload.ok, result: payload.result }).toEqual({
      exitCode: 0,
      ok: true,
      result: {
        command: 'bounce-backend',
        args: [],
        exitCode: 0,
        durationMs: expect.any(Number)
      }
    })
  })

  test('Should exit 1 with docker compose named when a service restart fails', async () => {
    writeFileSync(
      join(workspace, 'fake-bin', 'docker'),
      '#!/usr/bin/env bash\nif [ "$1" = compose ]; then exit 6; fi\n'
    )

    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'docker',
        'service',
        'restart',
        'trade-imports-stub',
        '--workspace',
        workspace,
        '--json'
      ],
      { reject: false }
    )

    const payload = JSON.parse(stdout.trim().split('\n').at(-1))
    expect({ exitCode, errors: payload.errors }).toEqual({
      exitCode: 1,
      errors: [{ code: 'ERROR', message: 'docker compose exited 6' }]
    })
  })

  test.each([
    ['bounce-backend', '--bogus'],
    ['service', 'restart'],
    ['service', 'bogus', 'trade-imports-stub']
  ])(
    'Should exit 2 from %s %s without calling docker compose',
    async (...args) => {
      const { exitCode } = await execa(
        'node',
        [cliPath, 'docker', ...args, '--workspace', workspace],
        { reject: false }
      )

      expect({ exitCode, ran: existsSync(ranPath()) }).toEqual({
        exitCode: 2,
        ran: false
      })
    }
  )

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

  test.each(GUARDED_COMMANDS)(
    '%s refuses while a build holds the lease, naming the holder',
    async (command) => {
      writeStackScript('run-stack.sh', `touch '${ranPath()}'`)
      writeLease()

      const { stdout, exitCode } = await execa(
        'node',
        [
          cliPath,
          'docker',
          ...command.split(' '),
          '--workspace',
          workspace,
          '--json'
        ],
        { reject: false }
      )

      expect({
        exitCode,
        error: JSON.parse(stdout.trim()).errors[0],
        ran: existsSync(ranPath())
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

describe('tim docker with a stack another clone started', () => {
  const otherClone = '/clones/trade-imports-workspace-a'

  const writeMarkingScripts = () =>
    writeStackScript('run-stack.sh', `touch '${ranPath()}'`)

  test.each(GUARDED_COMMANDS)(
    '%s refuses with STACK_OTHER_CLONE, naming that clone',
    async (command) => {
      writeMarkingScripts()
      stackStartedFrom(otherClone)

      const { stdout, exitCode } = await execa(
        'node',
        [
          cliPath,
          'docker',
          ...command.split(' '),
          '--workspace',
          workspace,
          '--json'
        ],
        { reject: false }
      )

      const payload = JSON.parse(stdout.trim())
      expect({
        exitCode,
        result: payload.result,
        error: payload.errors[0],
        ran: existsSync(ranPath())
      }).toEqual({
        exitCode: 1,
        result: { workspace: otherClone },
        error: {
          code: 'STACK_OTHER_CLONE',
          message: `The workspace stack running now was started from another clone, ${otherClone}, so tim docker leaves it alone. This clone is ${workspace}. Run tim docker from that clone, or take the stack down there first. To go ahead anyway, add --force.`
        },
        ran: false
      })
    }
  )

  test('says why on stderr without --json', async () => {
    writeMarkingScripts()
    stackStartedFrom(otherClone)

    const { stderr, exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'down', '--workspace', workspace],
      { reject: false }
    )

    expect({ exitCode, stderr: stderr.trim() }).toEqual({
      exitCode: 1,
      stderr: expect.stringContaining(
        `was started from another clone, ${otherClone}`
      )
    })
  })

  test('goes ahead with --force, and does not pass --force to docker compose', async () => {
    stackStartedFrom(otherClone)

    const { exitCode } = await execa(
      'node',
      [cliPath, 'docker', 'down', '--workspace', workspace, '--force'],
      { reject: false }
    )

    expect({
      exitCode,
      composeCallEnd: readFileSync(ranPath(), 'utf8').trim().split(' ').at(-1)
    }).toEqual({
      exitCode: 0,
      composeCallEnd: '--remove-orphans'
    })
  })

  test.each(GUARDED_COMMANDS)(
    '%s goes ahead on a stack this clone started',
    async (command) => {
      writeMarkingScripts()
      stackStartedFrom(workspace)

      const { exitCode } = await execa(
        'node',
        [cliPath, 'docker', ...command.split(' '), '--workspace', workspace],
        { reject: false }
      )

      expect({ exitCode, ran: existsSync(ranPath()) }).toEqual({
        exitCode: 0,
        ran: true
      })
    }
  )
})
