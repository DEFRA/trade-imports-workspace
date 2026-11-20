import { TimError } from '../errors.js'

const isTrailerLine = (line) => /^[A-Za-z0-9-]+: \S[^\n\r]*$/.test(line)

/**
 * @param {string[]} trailers - Lines such as `Co-Authored-By: Name <email>`
 * @returns {string[]} The same lines, once each one is a single `Name: value` line
 * @throws {TimError} USAGE for a line that is not in the form `Name: value`
 */
export const checkTrailers = (trailers) => {
  const refused = trailers.find((line) => !isTrailerLine(line))
  if (refused !== undefined) {
    throw new TimError(
      'USAGE',
      `--trailer must be one line in the form "Name: value", such as "Co-Authored-By: Claude <noreply@anthropic.com>". You gave: ${JSON.stringify(refused)}`
    )
  }
  return trailers
}

/**
 * @param {string} message
 * @param {string[]} [trailers]
 * @returns {string} The message, then a blank line and each trailer on its own line in the order given; the message alone when there are none
 */
export const withTrailers = (message, trailers = []) =>
  trailers.length === 0 ? message : `${message}\n\n${trailers.join('\n')}`
