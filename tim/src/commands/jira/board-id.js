import { z } from 'zod'
import { rosterOf } from '../../constants/repos.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { TimError } from '../../errors.js'

const boardIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Give --board as a number, such as 13780.')

/**
 * The agile board a command acts on: `--board` when given, else the
 * workspace's `jiraBoard` in `repos.json`.
 *
 * @param {{board?: string, workspace?: string}} opts - `workspace` is the global `--workspace`
 * @returns {string} The board id, digits only
 * @throws {TimError} USAGE when `--board` is not a number, or when it is left out and `repos.json` sets no `jiraBoard`
 */
export const resolveBoardId = ({ board, workspace }) => {
  if (board === undefined) return configuredBoardId(workspace)
  const result = boardIdSchema.safeParse(board)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const configuredBoardId = (workspace) => {
  const { jiraBoard } = rosterOf(resolveWorkspaceRoot({ explicit: workspace }))
  if (jiraBoard === null) {
    throw new TimError(
      'USAGE',
      'Give --board <id>, such as 13780, or set jiraBoard in repos.json.'
    )
  }
  return String(jiraBoard)
}
