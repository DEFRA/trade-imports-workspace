import { text } from 'node:stream/consumers'
import { OK } from '../../constants/exitCodes.js'
import { hookPushOf } from './hook-input.js'

const HOOK_ARGS = ['sonar', 'push-check', '--hook']

/**
 * Whether tim was called as the pre-push hook and nothing else, so it can
 * answer without loading every command.
 *
 * @param {string[]} args - the arguments after the script path
 * @returns {boolean}
 */
export const isPushCheckHookCall = (args) =>
  args.length === HOOK_ARGS.length &&
  args.every((arg, index) => arg === HOOK_ARGS[index])

/**
 * Reads the hook's stdin and answers it. A call that does not push answers
 * 0 at once; only a push loads the check.
 *
 * @param {object} [args]
 * @param {NodeJS.ReadableStream} [args.stdin]
 * @returns {Promise<number>} the exit code
 */
export const answerPushCheckHook = async ({ stdin = process.stdin } = {}) => {
  const input = await text(stdin)
  if (!hookPushOf(input)) return OK
  const { runPushCheckHook } = await import('./hook.js')
  return runPushCheckHook({ input })
}
