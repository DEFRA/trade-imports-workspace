import { describe, test, expect } from 'vitest'
import { TimError } from '../../errors.js'
import {
  AmbiguousFilenameError,
  couldNotReadError,
  deleteEach,
  exitCodeForDeletionError,
  numericIdSchema
} from './deletion.js'

const refusing = (refusedItem) => async (item) => {
  if (item === refusedItem) throw new TimError('AUTH', `Not permitted: ${item}`)
}

describe('deleteEach', () => {
  test('returns every item when each delete succeeds', async () => {
    expect(await deleteEach(['a', 'b'], refusing(null))).toEqual({
      deleted: ['a', 'b'],
      failure: null
    })
  })

  test('throws the first failure as it is when nothing has been deleted', async () => {
    await expect(deleteEach(['a', 'b'], refusing('a'))).rejects.toMatchObject({
      code: 'AUTH',
      message: 'Not permitted: a'
    })
  })

  test('stops at a later failure and returns it beside what was deleted', async () => {
    expect(await deleteEach(['a', 'b', 'c'], refusing('b'))).toEqual({
      deleted: ['a'],
      failure: { item: 'b', code: 'AUTH', message: 'Not permitted: b' }
    })
  })
})

describe('exitCodeForDeletionError', () => {
  test('exits 2 for an ambiguous filename', () => {
    expect(exitCodeForDeletionError(new AmbiguousFilenameError('Two.'))).toBe(2)
  })

  test.each(['USAGE', 'NOT_FOUND', 'AUTH'])(
    'exits 1 for a %s error',
    (code) => {
      expect(exitCodeForDeletionError(new TimError(code, 'No.'))).toBe(1)
    }
  )
})

describe('couldNotReadError', () => {
  test("names what could not be read, then Jira's reasons, as a sentence", () => {
    const error = new TimError(
      'NOT_FOUND',
      'listAttachments(EUDPA-9): not found.'
    )
    error.jiraMessages = ['Issue does not exist']

    expect(
      couldNotReadError({ what: 'attachments', key: 'EUDPA-9', error })
    ).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Could not read attachments for EUDPA-9\nIssue does not exist.'
    })
  })

  test("gives the client's message when Jira gave no reason", () => {
    const error = new TimError(
      'NETWORK',
      'getIssueLinks(EUDPA-9): Jira returned 502.'
    )

    expect(
      couldNotReadError({ what: 'issue links', key: 'EUDPA-9', error })
    ).toMatchObject({
      code: 'NETWORK',
      message:
        'Could not read issue links for EUDPA-9\ngetIssueLinks(EUDPA-9): Jira returned 502.'
    })
  })
})

describe('numericIdSchema', () => {
  test('accepts a numeric id with surrounding spaces trimmed', () => {
    expect(numericIdSchema('attachment').parse(' 479899 ')).toBe('479899')
  })

  test('refuses anything but digits, naming the thing in the message', () => {
    expect(
      numericIdSchema('issue link').safeParse('12a').error.issues[0].message
    ).toBe("Give the issue link's numeric id, for example 479899.")
  })
})
