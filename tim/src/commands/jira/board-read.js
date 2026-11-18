import { TimError, isTimError } from '../../errors.js'
import { ERROR, USAGE } from '../../constants/exitCodes.js'
import { exitCodeFor } from '../envelope.js'

export class BoardReadError extends TimError {
  constructor(code, message, cause) {
    super(code, message, cause)
    this.name = 'BoardReadError'
  }
}

/**
 * Read a board, turning a failure into what the user reads: Jira's own
 * error messages, one per line, when it gave any, else the client's
 * message.
 *
 * @template T
 * @param {() => Promise<T>} read
 * @returns {Promise<T>}
 * @throws {BoardReadError}
 */
export const readBoard = async (read) => {
  try {
    return await read()
  } catch (error) {
    const message = error.jiraMessages?.length
      ? error.jiraMessages.join('\n')
      : error.message
    throw new BoardReadError(
      isTimError(error) ? error.code : 'UNKNOWN',
      message,
      error
    )
  }
}

/**
 * A board Jira would not read, such as one that does not exist, exits 1,
 * as the board scripts did. Rejected credentials still exit 2, like every
 * other tim Jira command.
 *
 * @param {Error} error
 * @returns {number}
 */
export const exitCodeForBoardError = (error) => {
  if (!(error instanceof BoardReadError)) return exitCodeFor(error)
  return error.code === 'AUTH' ? USAGE : ERROR
}
