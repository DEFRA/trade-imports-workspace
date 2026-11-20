import { describe, expect, test } from 'vitest'
import { checkTrailers, withTrailers } from './commit-message.js'

const COAUTHOR = 'Co-Authored-By: Claude <noreply@anthropic.com>'
const SESSION = 'Claude-Session: https://claude.ai/code/session_1'

describe('#withTrailers', () => {
  test('Should add each trailer after one blank line, in the order given', () => {
    const message = withTrailers('Upgrade lodash\n\nA body line.', [
      COAUTHOR,
      SESSION
    ])

    expect(message).toBe(
      `Upgrade lodash\n\nA body line.\n\n${COAUTHOR}\n${SESSION}`
    )
  })

  test('Should leave the message as it is with no trailers', () => {
    expect(withTrailers('Upgrade lodash')).toBe('Upgrade lodash')
  })
})

describe('#checkTrailers', () => {
  test('Should give back trailers that are each one Name: value line', () => {
    expect(checkTrailers([COAUTHOR, SESSION])).toEqual([COAUTHOR, SESSION])
  })

  test.each([
    ['a line with no name', 'Claude <noreply@anthropic.com>'],
    ['an empty line', ''],
    ['a name with no value', 'Co-Authored-By:'],
    ['two lines', `${COAUTHOR}\n${SESSION}`],
    ['a name with a space in it', 'Co Authored By: Claude']
  ])('Should refuse %s', (_name, line) => {
    expect(() => checkTrailers([COAUTHOR, line])).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: `--trailer must be one line in the form "Name: value", such as "Co-Authored-By: Claude <noreply@anthropic.com>". You gave: ${JSON.stringify(line)}`
      })
    )
  })
})
