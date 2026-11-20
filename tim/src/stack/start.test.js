import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  recordedStackScenario,
  recordTimStackRun
} from '../test-support/fake-docker.js'
import { sanitiseBranch } from './start.js'

const RECORDED = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../test-support/fixtures/stack/run-stack.json', import.meta.url)
    ),
    'utf8'
  )
)

const outcomeOf = ({
  exitCode,
  stdout,
  stderr,
  sequence,
  concurrent,
  stagedInitFiles
}) => ({ exitCode, stdout, stderr, sequence, concurrent, stagedInitFiles })

const withMachineArchHidden = (outcome) =>
  JSON.parse(
    JSON.stringify(outcome).replace(
      /"DEV_BUILD_PLATFORM":"linux\/[^"]+"/g,
      '"DEV_BUILD_PLATFORM":"linux/<MACHINE>"'
    )
  )

const isComposeCall =
  (...words) =>
  ({ tool, args }) =>
    tool === 'docker' &&
    args[0] === 'compose' &&
    words.every((word) => args.includes(word))

/** The service names a `docker compose up` call ends with, sorted. */
const servicesOf = (upArgs) =>
  upArgs.filter((arg, index) => index > upArgs.lastIndexOf('always')).sort()

describe('tim docker up', () => {
  test.each(RECORDED.map(({ name }) => [name]))(
    'Should make the recorded run-stack.sh calls and print its output for "%s"',
    async (name) => {
      const recorded = recordedStackScenario('run-stack', name)

      const run = await recordTimStackRun(['up', ...recorded.args], {
        fake: recorded.fake,
        env: recorded.env
      })

      const outcome =
        recorded.fake.serverArch === null
          ? withMachineArchHidden(outcomeOf(run))
          : outcomeOf(run)
      expect(outcome).toEqual(outcomeOf(recorded))
    },
    60_000
  )

  test('Should give up on mongo after MONGO_UP_ATTEMPTS failed starts, start nothing else and exit 1', async () => {
    const run = await recordTimStackRun(['up'], {
      env: { MONGO_UP_ATTEMPTS: '2', MONGO_RETRY_BACKOFF_SECONDS: '0' },
      fake: {
        composeFailures: [
          { command: 'up --wait --detach --pull always mongodb', times: 5 }
        ]
      }
    })

    expect({
      exitCode: run.exitCode,
      mongoStarts: run.sequence.filter(isComposeCall('up', 'mongodb')).length,
      stderr: run.stderr
    }).toEqual({
      exitCode: 1,
      mongoStarts: 2,
      stderr: [
        'fake docker: compose failed',
        'mongo failed to start (attempt 1/2), retrying',
        'fake docker: compose failed',
        'mongo failed to start after 2 attempts',
        ''
      ].join('\n')
    })
  })

  test('Should exit 1, after the stack up, when docker compose up fails', async () => {
    const recorded = recordedStackScenario('run-stack', 'no flags')
    const stackUp = recorded.sequence.at(-1).args
    const upCommand = stackUp.slice(stackUp.indexOf('up')).join(' ')

    const run = await recordTimStackRun(['up'], {
      fake: {
        composeFailures: [{ command: upCommand, times: 1, exitCode: 7 }]
      }
    })

    expect(run.exitCode).toBe(1)
    expect(run.sequence.at(-1).args).toEqual(stackUp)
  })

  test('Should say in --json that docker compose up exited 7', async () => {
    const recorded = recordedStackScenario('run-stack', 'no flags')
    const stackUp = recorded.sequence.at(-1).args
    const upCommand = stackUp.slice(stackUp.indexOf('up')).join(' ')

    const run = await recordTimStackRun(['up', '--json'], {
      fake: {
        composeFailures: [{ command: upCommand, times: 1, exitCode: 7 }]
      }
    })
    const envelope = JSON.parse(run.stdout.split('\n').at(-2))

    expect({
      exitCode: run.exitCode,
      resultExitCode: envelope.result.exitCode,
      errors: envelope.errors.map(({ message }) => message)
    }).toEqual({
      exitCode: 1,
      resultExitCode: 7,
      errors: ['docker compose exited 7']
    })
  })

  test('Should start dev the way up -d does', async () => {
    const recorded = recordedStackScenario('run-stack', 'dev')

    const run = await recordTimStackRun(['dev'], { fake: recorded.fake })

    expect(outcomeOf(run)).toEqual(outcomeOf(recorded))
  })

  test('Should report every compose error and exit 1 when the compose files name no services', async () => {
    const run = await recordTimStackRun(['up'], {
      fake: { servicesByProfile: {} }
    })

    expect({
      exitCode: run.exitCode,
      stderr: run.stderr,
      calls: run.sequence.length
    }).toEqual({
      exitCode: 1,
      stderr:
        'error: no services resolved from compose config — the compose files may be invalid\n',
      calls: 1
    })
  })

  test.each([
    [
      'plants',
      [
        'floci',
        'floci-init',
        'mongodb',
        'redis',
        'trade-imports-address-book',
        'trade-imports-defra-id-stub',
        'trade-imports-plants-backend',
        'trade-imports-plants-frontend',
        'trade-imports-reference-data',
        'trade-imports-stub'
      ]
    ],
    [
      'animals-admin',
      [
        'floci',
        'floci-init',
        'mongodb',
        'mssql',
        'redis',
        'servicebus-emulator',
        'toxiproxy',
        'trade-imports-address-book',
        'trade-imports-animals-admin',
        'trade-imports-animals-backend',
        'trade-imports-defra-id-stub',
        'trade-imports-dynamics-gateway'
      ]
    ]
  ])(
    'Should start only the %s services with --domain',
    async (domain, expected) => {
      const run = await recordTimStackRun(['up', '--domain', domain])
      const stackUp = run.sequence.at(-1).args

      expect({
        exitCode: run.exitCode,
        started: servicesOf(stackUp)
      }).toEqual({ exitCode: 0, started: expected })
    }
  )

  test('Should say how many of the stack services a domain starts', async () => {
    const run = await recordTimStackRun(['up', '--domain', 'plants'])

    expect(run.stdout).toContain('Domain: plants (10 of 22 services)')
  })

  test('Should leave a domain service out when --exclude names it', async () => {
    const run = await recordTimStackRun([
      'up',
      '--domain',
      'plants',
      '-e',
      'plants-backend'
    ])
    const stackUp = run.sequence.at(-1).args

    expect(stackUp).not.toContain('trade-imports-plants-backend')
  })

  test('Should refuse a domain whose services no active profile defines, and exit 1', async () => {
    const run = await recordTimStackRun([
      'up',
      '--domain',
      'animals-admin',
      '--profile',
      'database'
    ])

    expect({ exitCode: run.exitCode, stderr: run.stderr }).toEqual({
      exitCode: 1,
      stderr:
        "error: no active profile defines floci, floci-init, mssql, redis, servicebus-emulator, toxiproxy, trade-imports-address-book, trade-imports-animals-admin, trade-imports-animals-backend, trade-imports-defra-id-stub, trade-imports-dynamics-gateway, which domain 'animals-admin' needs\n"
    })
  })

  test('Should refuse a branch with nothing left after sanitising it, and exit 1', async () => {
    const run = await recordTimStackRun(['up', '-b', '///'])

    expect({ exitCode: run.exitCode, stderr: run.stderr }).toEqual({
      exitCode: 1,
      stderr: "error: branch '///' is empty after sanitisation\n"
    })
  })

  test('Should say when an early download fails and still start the stack', async () => {
    const run = await recordTimStackRun(['up', '--profile', 'database'], {
      fake: {
        composeFailures: [
          { command: 'pull --quiet --ignore-buildable mongodb', times: 1 }
        ]
      }
    })

    expect({ exitCode: run.exitCode, stderr: run.stderr }).toEqual({
      exitCode: 0,
      stderr:
        'the early mongo image download failed; the stack up below downloads it again\nfake docker: compose failed\n'
    })
  })

  test.each([[['--help']], [['-h']], [['-d', '--help']]])(
    'Should answer %j with its usage and call no Docker',
    async (args) => {
      const run = await recordTimStackRun(['up', ...args])

      expect({
        exitCode: run.exitCode,
        printsUsage: run.stdout.startsWith('Usage: tim docker up'),
        sequence: run.sequence,
        stagedInitFiles: run.stagedInitFiles
      }).toEqual({
        exitCode: 0,
        printsUsage: true,
        sequence: [],
        stagedInitFiles: []
      })
    }
  )

  test('Should refuse an argument it does not take with its usage, exit 2 and call no Docker', async () => {
    const run = await recordTimStackRun(['up', '--bogus'])

    expect({
      exitCode: run.exitCode,
      firstLine: run.stderr.split('\n')[0],
      showsUsage: run.stderr.includes('Usage: tim docker up'),
      sequence: run.sequence
    }).toEqual({
      exitCode: 2,
      firstLine: 'error: unexpected argument: --bogus',
      showsUsage: true,
      sequence: []
    })
  })
})

describe('#sanitiseBranch', () => {
  test.each([
    ['feat/EUDPA-1-X', 'feat-eudpa-1-x'],
    ['-.leading/Dots', 'leading-dots'],
    ['fix/a b+c', 'fix-abc'],
    ['x'.repeat(200), 'x'.repeat(128)],
    ['///', '']
  ])('Should give %j the tag %j', (branch, tag) => {
    expect(sanitiseBranch(branch)).toBe(tag)
  })
})
