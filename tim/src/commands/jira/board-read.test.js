import { describe, test, expect } from 'vitest'
import { TimError } from '../../errors.js'
import { exitCodeForBoardError, readBoard } from './board-read.js'

const failingWith = (error) => () => Promise.reject(error)

const jiraError = (code, jiraMessages) =>
  Object.assign(new TimError(code, 'listBoardEpics(99): not found.'), {
    jiraMessages
  })

describe('readBoard', () => {
  test('returns what the read gives', async () => {
    const epics = await readBoard(() => Promise.resolve(['EUDPA-1']))

    expect(epics).toEqual(['EUDPA-1'])
  })

  test("rethrows with Jira's messages, one per line, keeping the code", async () => {
    const read = failingWith(jiraError('NOT_FOUND', ['First.', 'Second.']))

    await expect(readBoard(read)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'First.\nSecond.'
    })
  })

  test("keeps the client's message when Jira gave none", async () => {
    const read = failingWith(jiraError('NOT_FOUND', []))

    await expect(readBoard(read)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'listBoardEpics(99): not found.'
    })
  })

  test('reports an error that is not a TimError as UNKNOWN', async () => {
    const read = failingWith(new Error('socket hang up'))

    await expect(readBoard(read)).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: 'socket hang up'
    })
  })
})

describe('exitCodeForBoardError', () => {
  const boardErrorWith = async (code) =>
    readBoard(failingWith(jiraError(code, []))).catch((error) => error)

  test('exits 1 for a board Jira will not show', async () => {
    expect(exitCodeForBoardError(await boardErrorWith('NOT_FOUND'))).toBe(1)
  })

  test('exits 1 for a request Jira rejects', async () => {
    expect(exitCodeForBoardError(await boardErrorWith('USAGE'))).toBe(1)
  })

  test('exits 2 when Jira rejects the credentials', async () => {
    expect(exitCodeForBoardError(await boardErrorWith('AUTH'))).toBe(2)
  })

  test('exits 2 for a usage error raised before the board is read', () => {
    expect(
      exitCodeForBoardError(new TimError('USAGE', 'Give --board <id>.'))
    ).toBe(2)
  })
})
