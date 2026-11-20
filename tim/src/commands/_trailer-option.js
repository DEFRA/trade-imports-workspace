import { checkTrailers } from '../git/commit-message.js'

const appendLine = (line, lines) => [...lines, line]

/**
 * Adds `--trailer <line>` to a command that commits for the user. Each
 * line given goes at the end of the commit message, in the order given.
 *
 * @param {import('commander').Command} command
 * @returns {import('commander').Command} The same command
 */
export const addTrailerOption = (command) =>
  command.option(
    '--trailer <line>',
    'Add this line to the end of each commit message, after a blank line, such as "Co-Authored-By: Claude <noreply@anthropic.com>". Give it again to add more lines, in the order you give them',
    appendLine,
    []
  )

/**
 * @param {{trailer?: string[]}} opts - The command's options
 * @returns {string[]} The `--trailer` lines given, in order
 * @throws {TimError} USAGE for a line that is not in the form `Name: value`
 */
export const trailersOf = (opts) => checkTrailers(opts.trailer ?? [])
