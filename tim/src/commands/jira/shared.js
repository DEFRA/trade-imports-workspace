import { z } from 'zod'
import { OK } from '../../constants/exitCodes.js'
import { TimError } from '../../errors.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'

const ISSUE_KEY = /^[A-Z][A-Z0-9_]*-\d+$/
const ISSUE_KEY_MESSAGE = 'Give a Jira ticket key, for example EUDPA-200.'

export const issueKeySchema = z
  .string({ error: ISSUE_KEY_MESSAGE })
  .trim()
  .regex(ISSUE_KEY, ISSUE_KEY_MESSAGE)

/**
 * @param {unknown} value
 * @returns {string} The trimmed key
 * @throws {TimError} USAGE when `value` is not a Jira ticket key
 */
export const parseIssueKey = (value) => {
  const result = issueKeySchema.safeParse(value)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

/**
 * A commander action that parses options, runs, prints the result as text
 * or a JSON envelope, and exits with the matching code.
 *
 * @param {object} args
 * @param {(opts: object) => object} [args.parseOptions] - Validate raw
 *   commander options before any side-effect runs. Defaults to passing
 *   options through unchanged.
 * @param {(context: {args: any[]}, parsedOptions: object) => Promise<any>} args.run
 * @param {(result: any) => string} args.renderText
 * @param {(result: any) => number} [args.exitCodeForResult] - Defaults to always OK
 * @param {string} args.timVersion
 * @returns {Function} A commander action
 */
export const makeJiraAction = ({
  parseOptions = (opts) => opts,
  run,
  renderText,
  exitCodeForResult = () => OK,
  timVersion
}) =>
  async function jiraAction(...positional) {
    const args = positional.slice(0, -2)
    const opts = this.optsWithGlobals()
    try {
      const parsed = parseOptions(opts)
      const result = await run({ args }, parsed)
      emit(
        opts.json
          ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
          : renderText(result)
      )
      process.exit(exitCodeForResult(result))
    } catch (error) {
      if (opts.json) {
        emit(
          JSON.stringify(
            jsonEnvelope({
              ok: false,
              error: errorPayloadFor(error),
              timVersion
            })
          )
        )
      } else {
        emitError(error.message ?? String(error))
      }
      process.exit(exitCodeFor(error))
    }
  }
