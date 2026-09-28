import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

/**
 * The parse-options -> run -> emit -> exit sequence every `tim jira` write
 * subcommand repeats, named once (mirrors `tim backlog`'s
 * `makeBacklogAction` in `../backlog/shared.js`). Unlike `tim backlog` and
 * `tim spec`, jira commands never resolve a workspace root — they talk to
 * Jira and to files next to the manifest the caller names, nothing else.
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
