import { OK } from '../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from './envelope.js'
import { writeLine } from './_write-line.js'

const emit = (text) => writeLine(process.stdout, text)
const emitError = (text) => writeLine(process.stderr, text)

/**
 * A commander action that parses options, runs, prints the result as text
 * or a JSON envelope, and exits with the matching code.
 *
 * @param {object} args
 * @param {(opts: object) => object} [args.parseOptions] - Validate raw
 *   commander options before any side-effect runs. Defaults to passing
 *   options through unchanged.
 * @param {(context: {args: any[]}, parsedOptions: object) => Promise<any>} args.run
 * @param {(result: any) => string|null} args.renderText - null prints nothing, not even a newline
 * @param {(result: any) => string} [args.renderTextError] - Text mode only: what a result that partly failed prints to stderr after its output. Defaults to nothing
 * @param {(error: Error) => string} [args.renderErrorText] - Text mode only: what a thrown error prints to stderr. Defaults to its message
 * @param {(result: any, parsedOptions: object) => number} [args.exitCodeForResult] - Defaults to always OK
 * @param {(error: Error) => number} [args.exitCodeForError] - Defaults to `exitCodeFor`
 * @param {string} args.timVersion
 * @returns {Function} A commander action
 */
export const makeRunAction = ({
  parseOptions = (opts) => opts,
  run,
  renderText,
  renderTextError = () => '',
  renderErrorText = (error) => error.message ?? String(error),
  exitCodeForResult = () => OK,
  exitCodeForError = exitCodeFor,
  timVersion
}) =>
  async function runAction(...positional) {
    const args = positional.slice(0, -2)
    const opts = this.optsWithGlobals()
    try {
      const parsed = parseOptions(opts)
      const result = await run({ args }, parsed)
      if (opts.json) {
        await emit(
          JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
        )
      } else {
        const text = renderText(result)
        if (text !== null) await emit(text)
        const errorText = renderTextError(result)
        if (errorText) await emitError(errorText)
      }
      process.exit(exitCodeForResult(result, parsed))
    } catch (error) {
      if (opts.json) {
        await emit(
          JSON.stringify(
            jsonEnvelope({
              ok: false,
              error: errorPayloadFor(error),
              timVersion
            })
          )
        )
      } else {
        await emitError(renderErrorText(error))
      }
      process.exit(exitCodeForError(error))
    }
  }
