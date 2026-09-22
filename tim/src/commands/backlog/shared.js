import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { OK } from '../../constants/exitCodes.js'
import { TimError } from '../../errors.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

export const programmeKeySchema = z
  .string()
  .trim()
  .min(1, 'Name a programme key.')

const MAX_OP_ID_LENGTH = 200

// DESIGN 4.3's op id shape: a person must be able to pass a plain id, so the
// six-part `<runLabel>:<inc>:<attempt>:<stage>:<task>:<verb>` form is not
// enforced — no caller composes it yet (`advance` is inc-017).
export const opIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_OP_ID_LENGTH)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*(:[A-Za-z0-9._-]+)*$/,
    'is not a valid --op-id (letters, digits, ".", "_", "-" and ":" only, starting with a letter or digit).'
  )

export const expectShaSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, '--expect-sha must be a 64-character hex sha256.')

/**
 * Validate a positional argument before any side-effect runs, refusing with
 * exit 2 rather than a raw zod error (`.claude/rules/cli-patterns.md`).
 *
 * @param {unknown} value
 * @param {string} label
 * @returns {string}
 * @throws {TimError} USAGE — when `value` fails `programmeKeySchema`.
 */
export const parseProgrammeKey = (value, label) => {
  const result = programmeKeySchema.safeParse(value)
  if (!result.success) {
    throw new TimError('USAGE', `${label}: ${result.error.issues[0].message}`)
  }
  return result.data
}

/**
 * The "safeParse, else `TimError('USAGE', first issue)`" step every
 * command's option parser repeats, named once.
 *
 * @param {import('zod').ZodType} schema
 * @param {object} opts
 * @returns {object}
 * @throws {TimError} USAGE — when `opts` fails `schema`.
 */
export const parseOptions = (schema, opts) => {
  const result = schema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * Every `tim backlog` subcommand resolves the workspace, runs one function
 * (a write, or a read-only inspection) over a registered programme, then
 * prints the result as text or as one JSON line — the wrapper `tim parity`'s
 * commands use (`commands/parity/index.js`'s `makeParityAction`), over a
 * programme key resolved through the registry instead of a corpus resolved
 * from a run id.
 *
 * @param {object} args
 * @param {(context: object, opts: object) => any} args.run
 * @param {(result: any) => string} args.renderText
 * @param {string} args.timVersion
 * @returns {Function} A commander action
 */
export const makeBacklogAction = ({ run, renderText, timVersion }) =>
  async function backlogAction(...positional) {
    const args = positional.slice(0, -2)
    const opts = this.optsWithGlobals()
    try {
      const workspaceRoot = resolveWorkspaceRoot({ explicit: opts.workspace })
      const result = await run({ workspaceRoot, args }, opts)
      if (opts.json) {
        emit(JSON.stringify(jsonEnvelope({ ok: true, result, timVersion })))
      } else {
        emit(renderText(result))
      }
      process.exit(OK)
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
