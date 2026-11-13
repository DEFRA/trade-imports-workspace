import { OK, USAGE, ERROR } from '../constants/exitCodes.js'
import { isTimError } from '../errors.js'

const SCHEMA_VERSION = 1

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

/**
 * Build a commander action handler that calls a client method, then
 * renders the result as text or JSON depending on global --json.
 *
 * @param {object} args
 * @param {() => object} args.client - Factory that returns the client (called
 *   per invocation so credentials read at run-time, not at module import)
 * @param {(client: object, positional: any[], options: object) => Promise<any>} args.call - Function
 *   that invokes the appropriate method on the client with positional args
 *   and the command's own options
 * @param {(result: any, options: object) => string} args.renderText
 * @param {string} args.timVersion
 * @returns {Function} commander action function (call with `this` bound)
 */
export const makeClientAction = ({ client, call, renderText, timVersion }) =>
  async function clientAction(...positional) {
    // commander passes parsed positional args, then options, then command — drop the last two
    const args = positional.slice(0, -2)
    const options = positional.at(-2)
    const globalOpts = this.optsWithGlobals()
    try {
      const c = client()
      const result = await call(c, args, options)
      if (globalOpts.json) {
        emit(
          JSON.stringify({
            ok: true,
            schema_version: SCHEMA_VERSION,
            tim_version: timVersion,
            result,
            errors: [],
            metadata: { ranAt: new Date().toISOString() }
          })
        )
      } else {
        emit(renderText(result, options))
      }
      process.exit(OK)
    } catch (error) {
      if (isTimError(error) && globalOpts.json) {
        emit(
          JSON.stringify({
            ok: false,
            schema_version: SCHEMA_VERSION,
            tim_version: timVersion,
            result: null,
            errors: [{ code: error.code, message: error.message }]
          })
        )
      } else {
        emitError(error.message ?? String(error))
      }
      const exit =
        isTimError(error) && (error.code === 'USAGE' || error.code === 'AUTH')
          ? USAGE
          : ERROR
      process.exit(exit)
    }
  }
