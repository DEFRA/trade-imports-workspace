import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'
import { writeStackInitSources } from '../../test-support/fake-docker.js'
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

const stackWorkingDirsPath = () => join(workspace, 'stack-working-dirs')

const ranPath = () => join(workspace, 'ran')

const upFailsPath = () => join(workspace, 'up-fails')

const GUARDED_COMMANDS = [
  'up',
  'dev',
  'down',
  'restart',
  'bounce-backend',
  'service restart trade-imports-stub'
]

const writeFakeTool = (name, lines) => {
  const path = join(workspace, 'fake-bin', name)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, ['#!/usr/bin/env bash', ...lines].join('\n'))
  chmodSync(path, 0o755)
}

// A docker that records every compose call, names two services, fails the
// stack up when up-fails exists, and lists the clones the running stack was
// started from; and a git that finds no branch on GitHub.
const writeFakeTools = () => {
  writeFakeTool('docker', [
    'if [ "$1" = info ]; then echo 29.1.0; exit 0; fi',
    `if [ "$1" = compose ]; then echo "$*" >> '${ranPath()}'; fi`,
    `case " $* " in *" config --services "*) printf 'mongodb\\ntrade-imports-stub\\n'; exit 0 ;; esac`,
    `case " $* " in *" up "*" trade-imports-stub ") [ -f '${upFailsPath()}' ] && exit 5 ;; esac`,
    `if [ "$1" = ps ] && [ -f '${stackWorkingDirsPath()}' ]; then cat '${stackWorkingDirsPath()}'; fi`
  ])
  writeFakeTool('git', ['exit 2'])
}

const composeCalls = () =>
  existsSync(ranPath())
    ? readFileSync(ranPath(), 'utf8').trim().split('\n')
    : []

const stackStartedFrom = (clone) =>
  writeFileSync(stackWorkingDirsPath(), `${join(clone, 'docker', 'stack')}\n`)

const runDocker = (args) =>
  execa('node', [cliPath, 'docker', ...args, '--workspace', workspace], {
    reject: false
  })

const originalPath = process.env.PATH

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-docker-'))
  markWorkspaceRoot(workspace)
  writeStackInitSources(workspace)
  writeFakeTools()
  process.env.TIM_STACK_LEASE = join(workspace, 'stack-lease.json')
  process.env.PATH = `${join(workspace, 'fake-bin')}:${originalPath}`
})

afterEach(() => {
  delete process.env.TIM_STACK_LEASE
  process.env.PATH = originalPath
  rmSync(workspace, { recursive: true, force: true })
})

describe('tim docker subcommands', () => {
  test('up starts every service compose names and exits 0 on success', async () => {
    const { exitCode } = await runDocker(['up'])

    expect({
      exitCode,
      stackUp: composeCalls().at(-1).split(' ').slice(-7)
    }).toEqual({
      exitCode: 0,
      stackUp: [
        'up',
        '--wait',
        '--detach',
        '--pull',
        'always',
        'mongodb',
        'trade-imports-stub'
      ]
    })
  })

  test('dev builds the repo-backed services from local source', async () => {
    const { exitCode, stdout } = await runDocker(['dev'])

    expect({
      exitCode,
      builds: composeCalls().at(-1).includes(' --build '),
      summary: stdout.includes('stub:            built (source)')
    }).toEqual({ exitCode: 0, builds: true, summary: true })
  })

  test('down runs docker compose down, wiping volumes, and exits 0 on success', async () => {
    const { exitCode } = await runDocker(['down'])

    expect({
      exitCode,
      composeCall: composeCalls().at(-1).split(' ').slice(-3)
    }).toEqual({
      exitCode: 0,
      composeCall: ['down', '--volumes', '--remove-orphans']
    })
  })

  test('Should report a bounce-backend that docker compose finished in the --json envelope', async () => {
    const { stdout, exitCode } = await runDocker(['bounce-backend', '--json'])

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
    writeFakeTool('docker', ['if [ "$1" = compose ]; then exit 6; fi'])

    const { stdout, exitCode } = await runDocker([
      'service',
      'restart',
      'trade-imports-stub',
      '--json'
    ])

    const payload = JSON.parse(stdout.trim().split('\n').at(-1))
    expect({ exitCode, errors: payload.errors }).toEqual({
      exitCode: 1,
      errors: [{ code: 'ERROR', message: 'docker compose exited 6' }]
    })
  })

  test.each([
    ['bounce-backend', '--bogus'],
    ['service', 'restart'],
    ['service', 'bogus', 'trade-imports-stub'],
    ['up', '--bogus'],
    ['up', '-e', 'nope'],
    ['dev', '-b', 'feat/x']
  ])(
    'Should exit 2 from %s %s without calling docker compose',
    async (...args) => {
      const { exitCode } = await runDocker(args)

      expect({ exitCode, ran: existsSync(ranPath()) }).toEqual({
        exitCode: 2,
        ran: false
      })
    }
  )

  test('up looks for the branch given, as Dockerhub tags it', async () => {
    const { exitCode, stdout } = await runDocker([
      'up',
      '-b',
      'spike/My-Branch'
    ])

    expect({
      exitCode,
      probes: stdout.includes(
        'Probing Dockerhub for branch tag: spike-my-branch'
      )
    }).toEqual({ exitCode: 0, probes: true })
  })

  test('dev takes extra flags after its own -d', async () => {
    const { exitCode, stdout } = await runDocker(['dev', '-e', 'stub'])

    expect({
      exitCode,
      excluded: stdout.includes('stub:            excluded'),
      stackUpEnd: composeCalls().at(-1).split(' ').at(-1)
    }).toEqual({ exitCode: 0, excluded: true, stackUpEnd: 'mongodb' })
  })

  test('up takes repeated flags in the order given', async () => {
    await runDocker(['up', '--profile', 'frontend', '--profile', 'database'])

    expect(
      composeCalls()[0].endsWith(
        '--profile frontend --profile database config --services'
      )
    ).toBe(true)
  })

  test('up passes everything after -- to docker compose up', async () => {
    await execa(
      'node',
      [
        cliPath,
        '--workspace',
        workspace,
        'docker',
        'up',
        '--',
        '--timeout',
        '5'
      ],
      { reject: false }
    )

    expect(composeCalls().at(-1).includes('always --timeout 5 mongodb')).toBe(
      true
    )
  })

  test('reports the flags given in the --json envelope', async () => {
    const { stdout } = await runDocker([
      'up',
      '--json',
      '-b',
      'spike/my-branch'
    ])

    const payload = JSON.parse(stdout.trim().split('\n').at(-1))
    expect(payload.result.args).toEqual(['-b', 'spike/my-branch'])
  })

  test('exits 1 when the stack does not come up', async () => {
    writeFileSync(upFailsPath(), '')

    const { exitCode } = await runDocker(['up', '--json'])

    expect(exitCode).toBe(1)
  })

  test('up refuses an unknown exclude label with USAGE in --json', async () => {
    const { stdout, exitCode } = await runDocker(['up', '-e', 'nope', '--json'])

    const payload = JSON.parse(stdout.trim())
    expect({ exitCode, ok: payload.ok, code: payload.errors[0].code }).toEqual({
      exitCode: 2,
      ok: false,
      code: 'USAGE'
    })
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
      writeLease()

      const { stdout, exitCode } = await runDocker([
        ...command.split(' '),
        '--json'
      ])

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

  test('runs under a lease with --force, and does not pass --force to docker compose', async () => {
    writeLease()

    const { exitCode } = await runDocker(['dev', '--force'])

    expect({
      exitCode,
      forcePassedOn: composeCalls().some((call) => call.includes('--force'))
    }).toEqual({ exitCode: 0, forcePassedOn: false })
  })
})

describe('tim docker with a stack another clone started', () => {
  const otherClone = '/clones/trade-imports-workspace-a'

  test.each(GUARDED_COMMANDS)(
    '%s refuses with STACK_OTHER_CLONE, naming that clone',
    async (command) => {
      stackStartedFrom(otherClone)

      const { stdout, exitCode } = await runDocker([
        ...command.split(' '),
        '--json'
      ])

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
    stackStartedFrom(otherClone)

    const { stderr, exitCode } = await runDocker(['down'])

    expect({ exitCode, stderr: stderr.trim() }).toEqual({
      exitCode: 1,
      stderr: expect.stringContaining(
        `was started from another clone, ${otherClone}`
      )
    })
  })

  test('goes ahead with --force, and does not pass --force to docker compose', async () => {
    stackStartedFrom(otherClone)

    const { exitCode } = await runDocker(['down', '--force'])

    expect({
      exitCode,
      composeCallEnd: composeCalls().at(-1).split(' ').at(-1)
    }).toEqual({
      exitCode: 0,
      composeCallEnd: '--remove-orphans'
    })
  })

  test.each(GUARDED_COMMANDS)(
    '%s goes ahead on a stack this clone started',
    async (command) => {
      stackStartedFrom(workspace)

      const { exitCode } = await runDocker(command.split(' '))

      expect({ exitCode, ran: existsSync(ranPath()) }).toEqual({
        exitCode: 0,
        ran: true
      })
    }
  )
})
