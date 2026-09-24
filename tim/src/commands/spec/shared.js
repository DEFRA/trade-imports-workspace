import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

/**
 * The parse-options → resolve workspace → run → emit → exit sequence every
 * `tim spec` subcommand repeats, named once (mirrors `tim backlog`'s
 * `makeBacklogAction` in `commands/backlog/shared.js`).
 *
 * @param {object} args
 * @param {(opts: object) => object} args.parseOptions
 * @param {(context: {workspaceRoot: string}, parsedOptions: object) => Promise<any>} args.run
 * @param {(result: any) => string} args.renderText
 * @param {(result: any) => number} [args.exitCodeForResult] - Defaults to always OK
 * @param {string} args.timVersion
 * @returns {Function} A commander action
 */
export const makeSpecAction = ({
  parseOptions,
  run,
  renderText,
  exitCodeForResult = () => OK,
  timVersion
}) =>
  async function specAction(opts) {
    const globalOpts = this.optsWithGlobals()
    try {
      const parsed = parseOptions(opts)
      const workspaceRoot = resolveWorkspaceRoot({
        explicit: globalOpts.workspace
      })
      const result = await run({ workspaceRoot }, parsed)
      emit(
        globalOpts.json
          ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
          : renderText(result)
      )
      process.exit(exitCodeForResult(result))
    } catch (error) {
      if (globalOpts.json) {
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
