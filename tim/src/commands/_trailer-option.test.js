import { Command } from 'commander'
import { describe, expect, test } from 'vitest'
import { addTrailerOption, trailersOf } from './_trailer-option.js'

const COAUTHOR = 'Co-Authored-By: Claude <noreply@anthropic.com>'
const SESSION = 'Claude-Session: https://claude.ai/code/session_1'

const parsedOptions = (args) =>
  addTrailerOption(new Command('commit-something'))
    .exitOverride()
    .parse(args, { from: 'user' })
    .opts()

describe('#addTrailerOption', () => {
  test('Should collect every --trailer in the order given', () => {
    const opts = parsedOptions(['--trailer', COAUTHOR, '--trailer', SESSION])

    expect(trailersOf(opts)).toEqual([COAUTHOR, SESSION])
  })

  test('Should give no trailers when none is given', () => {
    expect(trailersOf(parsedOptions([]))).toEqual([])
  })

  test('Should say in the help what the option adds and where', () => {
    const help = addTrailerOption(
      new Command('commit-something')
    ).helpInformation()

    expect(help.replaceAll(/\s+/g, ' ')).toContain(
      '--trailer <line> Add this line to the end of each commit message, after a blank line, such as "Co-Authored-By: Claude <noreply@anthropic.com>". Give it again to add more lines, in the order you give them'
    )
  })
})

describe('#trailersOf', () => {
  test('Should refuse a --trailer that is not a Name: value line', () => {
    const opts = parsedOptions(['--trailer', 'Claude'])

    expect(() => trailersOf(opts)).toThrow(
      expect.objectContaining({ code: 'USAGE' })
    )
  })
})
