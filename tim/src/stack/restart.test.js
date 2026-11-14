import { describe, expect, test } from 'vitest'
import {
  recordedStackScenario,
  recordTimStackRun
} from '../test-support/fake-docker.js'
import { asksForRestartHelp } from './restart.js'

const outcomeOf = ({
  exitCode,
  stdout,
  stderr,
  sequence,
  concurrent,
  stagedInitFiles
}) => ({ exitCode, stdout, stderr, sequence, concurrent, stagedInitFiles })

const isComposeDown = ({ args }) =>
  args[0] === 'compose' && args.includes('down')

describe('tim docker restart', () => {
  test('Should make the recorded restart-stack.sh -d calls and print its output', async () => {
    const run = await recordTimStackRun(['restart', '-d'])

    expect(outcomeOf(run)).toEqual(
      outcomeOf(recordedStackScenario('restart-stack', 'dev'))
    )
  })

  test('Should start the stack again when stopping it fails', async () => {
    const recorded = recordedStackScenario('restart-stack', 'dev')
    const down = recorded.sequence.find(isComposeDown)

    const run = await recordTimStackRun(['restart', '-d'], {
      fake: {
        composeFailures: [
          {
            command: down.args.slice(down.args.indexOf('down')).join(' '),
            times: 1
          }
        ]
      }
    })

    expect({ exitCode: run.exitCode, sequence: run.sequence }).toEqual({
      exitCode: 0,
      sequence: recorded.sequence
    })
  })

  test.each([[['--help']], [['-h']], [['-d', '--help']]])(
    'Should answer %j with its usage and the start flags, and call no Docker',
    async (args) => {
      const run = await recordTimStackRun(['restart', ...args])

      expect({
        exitCode: run.exitCode,
        printsRestartUsage: run.stdout.includes(
          'Usage: tim docker restart [tim docker up flags]'
        ),
        printsStartUsage: run.stdout.includes('Usage: run-stack.sh'),
        sequence: run.sequence
      }).toEqual({
        exitCode: 0,
        printsRestartUsage: true,
        printsStartUsage: true,
        sequence: []
      })
    }
  )
})

describe('#asksForRestartHelp', () => {
  test.each([
    [['--help'], true],
    [['-d', '-h'], true],
    [['-d'], false],
    [['-d', '--', '--help'], false]
  ])('Should say whether %j asks for help: %s', (args, expected) => {
    expect(asksForRestartHelp(args)).toBe(expected)
  })
})
