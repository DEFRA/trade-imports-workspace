import { USAGE, ERROR } from '../constants/exitCodes.js'
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

/**
 * The exit code an error maps to. `USAGE` and `NOT_FOUND` are a usage
 * mistake the caller can fix by changing the command line; everything else
 * is a run that started and failed.
 *
 * @param {Error} error
 * @returns {number}
 */
export const exitCodeFor = (error) =>
  isTimError(error) && ['USAGE', 'NOT_FOUND'].includes(error.code)
    ? USAGE
    : ERROR
