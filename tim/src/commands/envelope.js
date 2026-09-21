import { USAGE, ERROR } from '../constants/exitCodes.js'
import { LOST_UPDATE, LOCKED } from '../constants/writerExitCodes.js'
import { isTimError } from '../errors.js'

const SCHEMA_VERSION = 1

/**
 * The one JSON line every command's `--json` mode emits, success or
 * failure. Shared so a second command group does not reimplement the exit
 * mapping or the envelope shape by hand.
 *
 * @param {object} args
 * @param {boolean} args.ok
 * @param {any} [args.result=null] - Ignored on failure; the envelope's `result` is always `null` then
 * @param {{code: string, message: string}} [args.error] - Required when `ok` is false
 * @param {string} args.timVersion
 * @returns {object}
 */
export const jsonEnvelope = ({ ok, result = null, error, timVersion }) =>
  ok
    ? {
        ok: true,
        schema_version: SCHEMA_VERSION,
        tim_version: timVersion,
        result,
        errors: [],
        metadata: { ranAt: new Date().toISOString() }
      }
    : {
        ok: false,
        schema_version: SCHEMA_VERSION,
        tim_version: timVersion,
        result: null,
        errors: [error]
      }

const EXIT_BY_CODE = {
  USAGE,
  NOT_FOUND: USAGE,
  LOST_UPDATE,
  LOCKED
}

/**
 * The exit code an error maps to. `USAGE` and `NOT_FOUND` are a usage
 * mistake the caller can fix by changing the command line; `LOST_UPDATE`
 * and `LOCKED` are DESIGN 4.3's write-safety refusals, raised by the shared
 * writer core (`runIngest` and `commitWrite` — see
 * `constants/writerExitCodes.js`), so both `tim backlog *` and
 * `tim parity ingest` can exit 3 or 4; everything else is a run that
 * started and failed.
 *
 * @param {Error} error
 * @returns {number}
 */
export const exitCodeFor = (error) =>
  isTimError(error) ? (EXIT_BY_CODE[error.code] ?? ERROR) : ERROR

/**
 * The `{code, message}` pair for `--json` mode's error envelope, whatever
 * the error: a `TimError` keeps its own code, anything else maps to
 * `UNKNOWN` — so `--json` mode always emits exactly one envelope line,
 * never a raw stack trace on stderr with nothing on stdout
 * (`tim/.claude/rules/cli-patterns.md`).
 *
 * @param {Error} error
 * @returns {{code: string, message: string}}
 */
export const errorPayloadFor = (error) =>
  isTimError(error)
    ? { code: error.code, message: error.message }
    : { code: 'UNKNOWN', message: error.message ?? String(error) }
