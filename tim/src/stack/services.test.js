import { describe, expect, test } from 'vitest'
import {
  recordedStackScenario,
  recordTimStackRun
} from '../test-support/fake-docker.js'

const STUB_AND_REFERENCE_DATA = [
  'trade-imports-stub',
  'trade-imports-reference-data'
]

const outcomeOf = ({
  exitCode,
  stdout,
  stderr,
  sequence,
  concurrent,
  stagedInitFiles
}) => ({ exitCode, stdout, stderr, sequence, concurrent, stagedInitFiles })

const withBuildAfterUp = (call) =>
  call.args.includes('up')
    ? {
        ...call,
        args: call.args.flatMap((arg) =>
          arg === 'up' ? ['up', '--build'] : [arg]
        )
      }
    : call

const composeSubcommands = (sequence) =>
  sequence
    .filter(({ args }) => args[0] === 'compose')
    .map(({ args }) => args.slice(args.lastIndexOf('frontend') + 1))

describe('tim docker bounce-backend', () => {
  test('Should make the recorded bounce-backend.sh calls, with the backend image built first', async () => {
    const recorded = recordedStackScenario('bounce-backend', 'no args')

    const run = await recordTimStackRun(['bounce-backend'])

    expect(outcomeOf(run)).toEqual(
      outcomeOf({
        ...recorded,
        sequence: recorded.sequence.map(withBuildAfterUp)
      })
    )
  })

  test('Should exit 2 for an argument it does not take, and call no Docker', async () => {
    const run = await recordTimStackRun(['bounce-backend', '--bogus'])

    expect({
      exitCode: run.exitCode,
      sequence: run.sequence,
      stderr: run.stderr
    }).toEqual({
      exitCode: 2,
      sequence: [],
      stderr: expect.stringContaining("unknown option '--bogus'")
    })
  })
})

describe('tim docker service', () => {
  test.each([
    ['rebuild', 'rebuild two services'],
    ['restart', 'restart two services']
  ])(
    'Should make the recorded dev-service.sh %s calls and print its heading',
    async (action, scenario) => {
      const run = await recordTimStackRun([
        'service',
        action,
        ...STUB_AND_REFERENCE_DATA
      ])

      expect(outcomeOf(run)).toEqual(
        outcomeOf(recordedStackScenario('dev-service', scenario))
      )
    }
  )

  test('Should stop a restart at the restart that fails, without waiting on the services', async () => {
    const run = await recordTimStackRun(
      ['service', 'restart', ...STUB_AND_REFERENCE_DATA],
      {
        fake: {
          composeFailures: [
            {
              command: `restart ${STUB_AND_REFERENCE_DATA.join(' ')}`,
              times: 1,
              exitCode: 3
            }
          ]
        }
      }
    )

    expect({
      exitCode: run.exitCode,
      compose: composeSubcommands(run.sequence)
    }).toEqual({
      exitCode: 1,
      compose: [['restart', ...STUB_AND_REFERENCE_DATA]]
    })
  })

  test.each([[['restart']], [['bogus', 'trade-imports-stub']]])(
    'Should exit 2 for service %j and call no Docker',
    async (args) => {
      const run = await recordTimStackRun(['service', ...args])

      expect({ exitCode: run.exitCode, sequence: run.sequence }).toEqual({
        exitCode: 2,
        sequence: []
      })
    }
  )
})

describe('tim docker bounce-backend and service --help', () => {
  test.each([
    [['bounce-backend', '--help'], 'Usage: tim docker bounce-backend'],
    [['service', '--help'], 'Usage: tim docker service']
  ])(
    'Should exit 0 from %j, print its usage and call no Docker',
    async (args, usage) => {
      const run = await recordTimStackRun(args)

      expect({
        exitCode: run.exitCode,
        printsUsage: run.stdout.includes(usage),
        sequence: run.sequence
      }).toEqual({ exitCode: 0, printsUsage: true, sequence: [] })
    }
  )
})
