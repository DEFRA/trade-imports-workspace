import { describe, expect, test } from 'vitest'
import {
  recordedStackScenario,
  recordTimStackRun
} from '../test-support/fake-docker.js'
import { asksForHelp } from './down.js'

const outcomeOf = ({
  exitCode,
  stdout,
  stderr,
  sequence,
  concurrent,
  stagedInitFiles
}) => ({ exitCode, stdout, stderr, sequence, concurrent, stagedInitFiles })

const DOWN = 'down --volumes --remove-orphans'

describe('tim docker down', () => {
  test.each([
    [[], 'no args'],
    [['--timeout', '1'], 'compose down args']
  ])(
    'Should make the recorded stop-stack.sh %j calls and print its output',
    async (args, scenario) => {
      const run = await recordTimStackRun(['down', ...args])

      expect(outcomeOf(run)).toEqual(
        outcomeOf(recordedStackScenario('stop-stack', scenario))
      )
    }
  )

  test('Should take down the security and monitoring profiles too', async () => {
    const run = await recordTimStackRun(['down'])

    const [down] = run.sequence
    const profiles = down.args.filter(
      (_, index) => down.args[index - 1] === '--profile'
    )
    expect(profiles).toEqual(expect.arrayContaining(['security', 'monitoring']))
  })

  test.each([
    [1, 1],
    [3, 1]
  ])(
    'Should exit %i as 1 when docker compose down exits %i, and say so in --json',
    async (composeExit, timExit) => {
      const run = await recordTimStackRun(['down', '--json'], {
        fake: {
          composeFailures: [{ command: DOWN, times: 1, exitCode: composeExit }]
        }
      })
      const envelope = JSON.parse(run.stdout.split('\n').at(-2))

      expect({
        exitCode: run.exitCode,
        resultExitCode: envelope.result.exitCode,
        errors: envelope.errors.map(({ message }) => message)
      }).toEqual({
        exitCode: timExit,
        resultExitCode: composeExit,
        errors: [`docker compose exited ${composeExit}`]
      })
    }
  )

  test('Should exit 0 when docker compose down exits 0, and say so in --json', async () => {
    const run = await recordTimStackRun(['down', '--json'])
    const envelope = JSON.parse(run.stdout.split('\n').at(-2))

    expect({
      exitCode: run.exitCode,
      ok: envelope.ok,
      command: envelope.result.command
    }).toEqual({ exitCode: 0, ok: true, command: 'down' })
  })

  test.each([[['--help']], [['-h']], [['--timeout', '1', '--help']]])(
    'Should answer %j with its usage and call no Docker',
    async (args) => {
      const run = await recordTimStackRun(['down', ...args])

      expect({
        exitCode: run.exitCode,
        printsUsage: run.stdout.startsWith('Usage: tim docker down'),
        sequence: run.sequence
      }).toEqual({ exitCode: 0, printsUsage: true, sequence: [] })
    }
  )
})

describe('#asksForHelp', () => {
  test.each([
    [['--help'], true],
    [['-d', '-h'], true],
    [['-d'], false],
    [['-d', '--', '--help'], false]
  ])('Should say whether %j asks for help: %s', (args, expected) => {
    expect(asksForHelp(args)).toBe(expected)
  })
})
